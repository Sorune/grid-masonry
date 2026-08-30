import type { FlowDistribution } from "./types.js";
import {
  getReservedFlowBounds,
  type LogicalCell,
  type LogicalReservedRegion,
} from "./logical-layout.js";

interface ConstraintEdge {
  readonly from: number;
  readonly to: number;
  readonly distance: number;
}

interface ConstraintGraph {
  readonly edges: readonly ConstraintEdge[];
  readonly incoming: readonly (readonly ConstraintEdge[])[];
  readonly outgoing: readonly (readonly ConstraintEdge[])[];
}

interface ActiveGap {
  readonly from: number | undefined;
  readonly to: number;
  readonly distance: number;
}

type BoundaryPositions = readonly (number | undefined)[];

const EPSILON = 1e-7;
const RELAXATION_FACTOR = 0.35;
const MAX_RELAXATION_ITERATIONS = 128;

function isSynchronizationAnchor(cell: LogicalCell): boolean {
  return cell.laneSpan > 1;
}

function buildConstraintGraph(
  cells: readonly LogicalCell[],
  laneCount: number,
  flowGap: number,
): ConstraintGraph {
  const lastByLane: Array<number | undefined> = Array(laneCount).fill(
    undefined,
  );
  const edges: ConstraintEdge[] = [];
  const incoming: ConstraintEdge[][] = cells.map(() => []);
  const outgoing: ConstraintEdge[][] = cells.map(() => []);

  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index];
    if (cell === undefined) continue;

    const predecessors = new Set<number>();
    for (
      let lane = cell.laneStart;
      lane < cell.laneStart + cell.laneSpan;
      lane += 1
    ) {
      const predecessor = lastByLane[lane];
      if (predecessor !== undefined) predecessors.add(predecessor);
    }

    for (const predecessor of predecessors) {
      const predecessorCell = cells[predecessor];
      if (predecessorCell === undefined) continue;
      const edge: ConstraintEdge = {
        from: predecessor,
        to: index,
        distance: predecessorCell.flowSize + flowGap,
      };
      edges.push(edge);
      incoming[index]?.push(edge);
      outgoing[predecessor]?.push(edge);
    }

    for (
      let lane = cell.laneStart;
      lane < cell.laneStart + cell.laneSpan;
      lane += 1
    ) {
      lastByLane[lane] = index;
    }
  }

  return { edges, incoming, outgoing };
}

function hasMovement(
  index: number,
  cells: readonly LogicalCell[],
  latest: readonly number[],
): boolean {
  const cell = cells[index];
  const latestY = latest[index];
  return (
    cell !== undefined &&
    !isSynchronizationAnchor(cell) &&
    latestY !== undefined &&
    Number.isFinite(latestY) &&
    latestY > cell.flowOffset + EPSILON
  );
}

function findLatestPositions(
  cells: readonly LogicalCell[],
  graph: ConstraintGraph,
): readonly number[] {
  const latest = cells.map((cell) =>
    isSynchronizationAnchor(cell) ? cell.flowOffset : Number.POSITIVE_INFINITY,
  );

  for (let index = cells.length - 1; index >= 0; index -= 1) {
    const cell = cells[index];
    if (cell === undefined || isSynchronizationAnchor(cell)) continue;

    let upperBound = Number.POSITIVE_INFINITY;
    for (const edge of graph.outgoing[index] ?? []) {
      const successorLatest = latest[edge.to];
      if (successorLatest !== undefined && Number.isFinite(successorLatest)) {
        upperBound = Math.min(upperBound, successorLatest - edge.distance);
      }
    }
    latest[index] = upperBound;
  }

  return latest;
}

function gapValue(gap: ActiveGap, positions: readonly number[]): number {
  const to = positions[gap.to] ?? 0;
  const from = gap.from === undefined ? 0 : positions[gap.from] ?? 0;
  return to - from - gap.distance;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function buildActiveGaps(
  cells: readonly LogicalCell[],
  graph: ConstraintGraph,
  movable: readonly boolean[],
  includeTopBoundary: boolean,
  excludeSynchronizationBoundaries: boolean,
): readonly ActiveGap[] {
  const gaps: ActiveGap[] = [];
  for (const edge of graph.edges) {
    const from = cells[edge.from];
    const to = cells[edge.to];
    if (
      (movable[edge.from] || movable[edge.to]) &&
      (!excludeSynchronizationBoundaries ||
        (from !== undefined &&
          to !== undefined &&
          !isSynchronizationAnchor(from) &&
          !isSynchronizationAnchor(to)))
    ) {
      gaps.push(edge);
    }
  }

  if (includeTopBoundary) {
    for (let index = 0; index < cells.length; index += 1) {
      if (
        movable[index] &&
        (graph.incoming[index]?.length ?? 0) === 0
      ) {
        gaps.push({ from: undefined, to: index, distance: 0 });
      }
    }
  }
  return gaps;
}

/**
 * Returns exact positions for feasible anchor/interior boundary edges. A
 * boundary edge is not distributable in space-between: its extra slack must
 * be zero. If one interior node is constrained to incompatible positions by
 * multiple synchronization anchors, no exact pin is installed for that node;
 * the ordinary difference constraints remain authoritative instead.
 */
function buildBoundaryPositions(
  cells: readonly LogicalCell[],
  graph: ConstraintGraph,
): BoundaryPositions {
  const positions: Array<number | undefined> = Array(cells.length).fill(
    undefined,
  );
  const conflicts = new Set<number>();

  for (const edge of graph.edges) {
    const from = cells[edge.from];
    const to = cells[edge.to];
    if (from === undefined || to === undefined) continue;

    let index: number | undefined;
    let requiredPosition: number | undefined;
    if (isSynchronizationAnchor(from) && !isSynchronizationAnchor(to)) {
      index = edge.to;
      requiredPosition = from.flowOffset + edge.distance;
    } else if (!isSynchronizationAnchor(from) && isSynchronizationAnchor(to)) {
      index = edge.from;
      requiredPosition = to.flowOffset - edge.distance;
    }
    if (index === undefined || requiredPosition === undefined) continue;

    const previous = positions[index];
    if (
      previous !== undefined &&
      Math.abs(previous - requiredPosition) > EPSILON
    ) {
      conflicts.add(index);
      positions[index] = undefined;
    } else if (!conflicts.has(index)) {
      positions[index] = requiredPosition;
    }
  }

  return positions;
}

function relaxDistribution(
  cells: readonly LogicalCell[],
  graph: ConstraintGraph,
  latest: readonly number[],
  distribution: "space-between" | "space-evenly",
  reservedRegions: readonly LogicalReservedRegion[],
  flowGap: number,
): readonly number[] {
  const positions = cells.map((cell) => cell.flowOffset);
  const movable = cells.map((_, index) =>
    hasMovement(index, cells, latest) &&
    (distribution !== "space-between" ||
      (graph.incoming[index]?.length ?? 0) > 0),
  );
  const gaps = buildActiveGaps(
    cells,
    graph,
    movable,
    distribution === "space-evenly",
    distribution === "space-between",
  );
  const boundaryPositions =
    distribution === "space-between"
      ? buildBoundaryPositions(cells, graph)
      : [];
  if (distribution === "space-between") {
    for (let index = 0; index < positions.length; index += 1) {
      if (!movable[index]) continue;
      const boundaryPosition = boundaryPositions[index];
      if (boundaryPosition !== undefined) {
        const boundaryCell = cells[index];
        if (boundaryCell === undefined) continue;
        const bounds = getReservedFlowBounds(boundaryCell, reservedRegions, flowGap);
        positions[index] = clamp(boundaryPosition, bounds.minimum, bounds.maximum);
      }
    }
  }
  if (gaps.length < 2 || !movable.some(Boolean)) return positions;

  const incidentGaps: Array<number[]> = cells.map(() => []);
  for (let gapIndex = 0; gapIndex < gaps.length; gapIndex += 1) {
    const gap = gaps[gapIndex];
    if (gap === undefined) continue;
    incidentGaps[gap.to]?.push(gapIndex);
    if (gap.from !== undefined) incidentGaps[gap.from]?.push(gapIndex);
  }

  for (
    let iteration = 0;
    iteration < MAX_RELAXATION_ITERATIONS;
    iteration += 1
  ) {
    const values = gaps.map((gap) => gapValue(gap, positions));
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    let maximumDelta = 0;

    for (let index = 0; index < cells.length; index += 1) {
      if (!movable[index]) continue;
      let gradient = 0;
      for (const gapIndex of incidentGaps[index] ?? []) {
        const gap = gaps[gapIndex];
        const value = values[gapIndex];
        if (gap === undefined || value === undefined) continue;
        gradient += (gap.to === index ? 1 : -1) * (value - mean);
      }

      const cell = cells[index];
      const currentPosition = positions[index];
      if (cell === undefined) continue;
      if (currentPosition === undefined) continue;
      let minimum = cell.flowOffset;
      let maximum = latest[index] ?? cell.flowOffset;
      const reservedBounds = getReservedFlowBounds(cell, reservedRegions, flowGap);
      minimum = Math.max(minimum, reservedBounds.minimum);
      maximum = Math.min(maximum, reservedBounds.maximum);
      const boundaryPosition = boundaryPositions[index];
      if (boundaryPosition !== undefined) {
        minimum = Math.max(minimum, boundaryPosition);
        maximum = Math.min(maximum, boundaryPosition);
      }
      for (const edge of graph.incoming[index] ?? []) {
        minimum = Math.max(
          minimum,
          (positions[edge.from] ?? 0) + edge.distance,
        );
      }
      for (const edge of graph.outgoing[index] ?? []) {
        maximum = Math.min(
          maximum,
          (positions[edge.to] ?? 0) - edge.distance,
        );
      }

      const next = clamp(
        currentPosition - RELAXATION_FACTOR * gradient,
        minimum,
        maximum,
      );
      maximumDelta = Math.max(maximumDelta, Math.abs(next - currentPosition));
      positions[index] = next;
    }
    if (maximumDelta <= EPSILON) break;
  }
  return positions;
}

export function distributeFlowSlack(
  cells: readonly LogicalCell[],
  laneCount: number,
  flowGap: number,
  distribution: FlowDistribution,
  reservedRegions: readonly LogicalReservedRegion[] = [],
): readonly LogicalCell[] {
  if (distribution === "start" || cells.length === 0) return cells;

  const graph = buildConstraintGraph(cells, laneCount, flowGap);
  const latest = findLatestPositions(cells, graph);
  const positions = cells.map((cell, index) => {
    const latestY = latest[index] ?? cell.flowOffset;
    const bounds = getReservedFlowBounds(cell, reservedRegions, flowGap);
    if (!hasMovement(index, cells, latest)) return clamp(cell.flowOffset, bounds.minimum, bounds.maximum);
    if (distribution === "end") return clamp(latestY, bounds.minimum, bounds.maximum);
    if (distribution === "center") {
      return clamp(cell.flowOffset + (latestY - cell.flowOffset) / 2, bounds.minimum, bounds.maximum);
    }
    return clamp(cell.flowOffset, bounds.minimum, bounds.maximum);
  });
  const resolvedPositions =
    distribution === "space-between" || distribution === "space-evenly"
      ? relaxDistribution(cells, graph, latest, distribution, reservedRegions, flowGap)
      : positions;

  return cells.map((cell, index) => ({
    ...cell,
    flowOffset: resolvedPositions[index] ?? cell.flowOffset,
  }));
}
