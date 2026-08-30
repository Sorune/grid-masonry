import type {
  GridItem,
  MasonryCell,
  FootprintDiagnosticStatus,
  ReservedRegion,
  ResolvedMasonryLayoutOptions,
} from "./types.js";
import type { LayoutDiagnosticCollector } from "./layout-diagnostics.js";

/**
 * Internal logical coordinates used by the lane placement kernel.
 *
 * F1B/F1C keep the placement kernel in terms of lanes and flow values. The
 * supported vertical and horizontal normalizers provide physical meanings at
 * the boundary without making the kernel depend on an axis.
 */
export interface LogicalLayoutContext {
  readonly laneCount: number;
  readonly laneCrossSize: number;
  readonly crossGap: number;
  readonly flowGap: number;
  readonly containerCrossSize: number;
  readonly crossOffset: number;
  readonly flowSizeFromCrossSize: (
    aspectRatio: number,
    crossSize: number,
  ) => number;
  readonly reservedRegions: readonly LogicalReservedRegion[];
  readonly reservedFlowExtent: number;
  readonly flowTolerance: number;
  readonly diagnosticCollector?: LayoutDiagnosticCollector;
}

export interface LogicalReservedRegion {
  readonly laneStart: number;
  readonly laneSpan: number;
  readonly flowStart: number;
  readonly flowSize: number;
}

export interface LogicalResolvedFootprint {
  readonly flowSize: number;
  readonly forCrossSize: number;
}

export interface LogicalItem {
  readonly id: string;
  readonly sourceIndex: number;
  readonly aspectRatio: number;
  readonly laneSpan: number;
  readonly requestedLaneSpan?: number;
  readonly preferredLane?: number;
  readonly lockedLane?: number;
  readonly footprint?: LogicalResolvedFootprint;
}

export interface LogicalCell {
  readonly id: string;
  readonly sourceIndex: number;
  readonly laneStart: number;
  readonly laneSpan: number;
  readonly crossOffset: number;
  readonly flowOffset: number;
  readonly crossSize: number;
  readonly flowSize: number;
  readonly aspectRatio: number;
}

export interface LogicalLayoutResult {
  readonly cells: readonly LogicalCell[];
  readonly containerFlowSize: number;
}

export interface LogicalLaneState {
  readonly cells: readonly LogicalCell[];
  readonly containerFlowSize: number;
  append(item: LogicalItem): LogicalCell;
}

interface VerticalLayoutResult<Cell> {
  readonly cells: readonly Cell[];
  readonly containerFlowSize: number;
}

interface VerticalLaneGeometry {
  readonly columnCount: number;
  readonly columnWidth: number;
  readonly contentOffsetX: number;
}

export function createVerticalLayoutContext(
  options: ResolvedMasonryLayoutOptions,
  geometry: VerticalLaneGeometry,
  diagnosticCollector?: LayoutDiagnosticCollector,
): LogicalLayoutContext {
  return createLogicalLayoutContext({
    laneCount: geometry.columnCount,
    laneCrossSize: geometry.columnWidth,
    crossGap: options.columnGap,
    flowGap: options.rowGap,
    containerCrossSize: options.containerWidth,
    crossOffset: geometry.contentOffsetX,
    flowSizeFromCrossSize: (aspectRatio, crossSize) =>
      crossSize / aspectRatio,
    reservedRegions: normalizeReservedRegions(options.reservedRegions, geometry.columnCount),
    reservedFlowExtent: 0,
    flowTolerance: options.flowTolerance,
    ...(diagnosticCollector === undefined ? {} : { diagnosticCollector }),
  });
}

export function normalizeReservedRegions(
  regions: readonly ReservedRegion[],
  laneCount: number,
): readonly LogicalReservedRegion[] {
  return regions
    .map((region) => {
      const laneSpan = Math.min(region.laneSpan, laneCount);
      const laneStart = Math.min(Math.max(region.laneStart, 0), laneCount - laneSpan);
      return { laneStart, laneSpan, flowStart: region.flowStart, flowSize: region.flowSize };
    })
    .sort((left, right) =>
      left.laneStart - right.laneStart ||
      left.laneSpan - right.laneSpan ||
      left.flowStart - right.flowStart ||
      left.flowSize - right.flowSize);
}

export function createLogicalLayoutContext(
  context: LogicalLayoutContext,
): LogicalLayoutContext {
  return {
    ...context,
    reservedFlowExtent: context.reservedRegions.reduce(
      (extent, region) => Math.max(extent, region.flowStart + region.flowSize),
      0,
    ),
  };
}

function isCurrentFootprintWidth(
  footprintWidth: number,
  crossSize: number,
): boolean {
  const difference = Math.abs(footprintWidth - crossSize);
  const scale = Math.max(Math.abs(footprintWidth), Math.abs(crossSize));
  const tolerance = Math.max(1e-7, 1e-7 * scale);
  return difference <= tolerance;
}

function resolveFlowSizeFromValues(
  aspectRatio: number,
  footprint: LogicalResolvedFootprint | undefined,
  crossSize: number,
  flowSizeFromCrossSize: LogicalLayoutContext["flowSizeFromCrossSize"],
): number {
  if (
    footprint !== undefined &&
    isCurrentFootprintWidth(footprint.forCrossSize, crossSize)
  ) {
    return footprint.flowSize;
  }

  return flowSizeFromCrossSize(aspectRatio, crossSize);
}

interface LaneWindowPosition {
  readonly laneStart: number;
  readonly flowOffset: number;
}

function findLowestContiguousWindow(
  laneFrontier: readonly number[],
  laneSpan: number,
  preferredLane: number | undefined,
  lockedLane: number | undefined,
  context: LogicalLayoutContext,
  flowSize: number,
): LaneWindowPosition {
  const maxStart = laneFrontier.length - laneSpan;
  if (lockedLane !== undefined) {
    const laneStart = Math.min(Math.max(lockedLane, 0), maxStart);
    let flowOffset = 0;
    for (let offset = 0; offset < laneSpan; offset += 1) {
      flowOffset = Math.max(flowOffset, laneFrontier[laneStart + offset] ?? 0);
    }
    flowOffset = resolveReservedFlowOffset(
      flowOffset,
      flowSize,
      laneStart,
      laneSpan,
      context,
    );
    return { laneStart, flowOffset };
  }
  const normalizedPreferredLane =
    preferredLane === undefined
      ? undefined
      : Math.min(Math.max(preferredLane, 0), maxStart);

  if (context.flowTolerance === 0) {
    let targetLaneStart = 0;
    let targetFlowOffset = Number.POSITIVE_INFINITY;
    for (
      let laneStart = 0;
      laneStart <= laneFrontier.length - laneSpan;
      laneStart += 1
    ) {
      let candidateFlowOffset = 0;
      for (let offset = 0; offset < laneSpan; offset += 1) {
        const frontier = laneFrontier[laneStart + offset];
        if (frontier !== undefined) {
          candidateFlowOffset = Math.max(candidateFlowOffset, frontier);
        }
      }
      candidateFlowOffset = resolveReservedFlowOffset(
        candidateFlowOffset,
        flowSize,
        laneStart,
        laneSpan,
        context,
      );
      if (
        candidateFlowOffset < targetFlowOffset ||
        (candidateFlowOffset === targetFlowOffset &&
          laneStart === normalizedPreferredLane)
      ) {
        targetLaneStart = laneStart;
        targetFlowOffset = candidateFlowOffset;
      }
    }
    return { laneStart: targetLaneStart, flowOffset: targetFlowOffset };
  }

  const candidates: LaneWindowPosition[] = [];

  for (
    let laneStart = 0;
    laneStart <= laneFrontier.length - laneSpan;
    laneStart += 1
  ) {
    let candidateFlowOffset = 0;
    for (let offset = 0; offset < laneSpan; offset += 1) {
      const frontier = laneFrontier[laneStart + offset];
      if (frontier !== undefined) {
        candidateFlowOffset = Math.max(candidateFlowOffset, frontier);
      }
    }
    candidateFlowOffset = resolveReservedFlowOffset(
      candidateFlowOffset,
      flowSize,
      laneStart,
      laneSpan,
      context,
    );

    candidates.push({ laneStart, flowOffset: candidateFlowOffset });
  }

  const minimumFlowOffset = Math.min(...candidates.map((candidate) => candidate.flowOffset));
  const eligibleCandidates = candidates.filter(
    (candidate) => candidate.flowOffset <= minimumFlowOffset + context.flowTolerance,
  );
  const preferredCandidate = eligibleCandidates.find(
    (candidate) => candidate.laneStart === normalizedPreferredLane,
  );
  const selectedCandidate = preferredCandidate ?? eligibleCandidates[0];

  if (selectedCandidate === undefined) {
    throw new Error("No legal lane window was available.");
  }

  return selectedCandidate;
}

type LaneCellFactory<Cell> = (
  id: string,
  sourceIndex: number,
  laneStart: number,
  laneSpan: number,
  crossOffset: number,
  flowOffset: number,
  crossSize: number,
  flowSize: number,
  aspectRatio: number,
) => Cell;

function calculateContainerFlowSize(
  laneFrontier: readonly number[],
  flowGap: number,
  hasCells: boolean,
  reservedFlowExtent: number,
): number {
  const itemFlowExtent = hasCells ? Math.max(...laneFrontier) - flowGap : 0;
  return Math.max(itemFlowExtent, reservedFlowExtent);
}

function overlapsLaneRange(
  cell: Pick<LogicalCell, "laneStart" | "laneSpan">,
  region: LogicalReservedRegion,
): boolean {
  return cell.laneStart < region.laneStart + region.laneSpan &&
    region.laneStart < cell.laneStart + cell.laneSpan;
}

function conflictsReservedRegion(
  flowOffset: number,
  flowSize: number,
  region: LogicalReservedRegion,
  flowGap: number,
): boolean {
  const expandedStart = Math.max(0, region.flowStart - flowGap);
  const expandedEnd = region.flowStart + region.flowSize + flowGap;
  return flowOffset < expandedEnd && flowOffset + flowSize > expandedStart;
}

function resolveReservedFlowOffset(
  initialFlowOffset: number,
  flowSize: number,
  laneStart: number,
  laneSpan: number,
  context: LogicalLayoutContext,
): number {
  const laneRange = { laneStart, laneSpan };
  let flowOffset = initialFlowOffset;
  for (;;) {
    let nextFlowOffset = flowOffset;
    for (const region of context.reservedRegions) {
      if (
        overlapsLaneRange(laneRange, region) &&
        conflictsReservedRegion(flowOffset, flowSize, region, context.flowGap)
      ) {
        nextFlowOffset = Math.max(
          nextFlowOffset,
          region.flowStart + region.flowSize + context.flowGap,
        );
      }
    }
    if (nextFlowOffset === flowOffset) return flowOffset;
    flowOffset = nextFlowOffset;
  }
}

export function getReservedFlowBounds(
  cell: Pick<LogicalCell, "laneStart" | "laneSpan" | "flowOffset" | "flowSize">,
  regions: readonly LogicalReservedRegion[],
  flowGap: number,
): { readonly minimum: number; readonly maximum: number } {
  let minimum = cell.flowOffset;
  let maximum = Number.POSITIVE_INFINITY;
  for (const region of regions) {
    if (!overlapsLaneRange(cell, region)) continue;
    const before = cell.flowOffset + cell.flowSize + flowGap <= region.flowStart;
    const after = cell.flowOffset >= region.flowStart + region.flowSize + flowGap;
    if (before) {
      maximum = Math.min(maximum, region.flowStart - flowGap - cell.flowSize);
    } else if (after) {
      minimum = Math.max(minimum, region.flowStart + region.flowSize + flowGap);
    }
  }
  return { minimum, maximum };
}

function placeLaneItem<Cell>(
  id: string,
  sourceIndex: number,
  aspectRatio: number,
  laneSpan: number,
  requestedLaneSpan: number,
  preferredLane: number | undefined,
  lockedLane: number | undefined,
  footprint: LogicalResolvedFootprint | undefined,
  context: LogicalLayoutContext,
  laneFrontier: number[],
  createCell: LaneCellFactory<Cell>,
): Cell {
  const crossSize =
    context.laneCrossSize * laneSpan + context.crossGap * (laneSpan - 1);
  const flowSize = resolveFlowSizeFromValues(
    aspectRatio,
    footprint,
    crossSize,
    context.flowSizeFromCrossSize,
  );
  const { laneStart, flowOffset } = findLowestContiguousWindow(
    laneFrontier,
    laneSpan,
    preferredLane,
    lockedLane,
    context,
    flowSize,
  );
  const crossOffset =
    context.crossOffset +
    laneStart * (context.laneCrossSize + context.crossGap);

  const cell = createCell(
    id,
    sourceIndex,
    laneStart,
    laneSpan,
    crossOffset,
    flowOffset,
    crossSize,
    flowSize,
    aspectRatio,
  );

  if (context.diagnosticCollector !== undefined) {
    let frontierFlowOffset = 0;
    for (let offset = 0; offset < laneSpan; offset += 1) {
      frontierFlowOffset = Math.max(
        frontierFlowOffset,
        laneFrontier[laneStart + offset] ?? 0,
      );
    }
    context.diagnosticCollector.recordPlacement({
      id,
      index: sourceIndex,
      requestedLaneSpan,
      resolvedLaneSpan: laneSpan,
      ...(preferredLane === undefined
        ? {}
        : { requestedPreferredLane: preferredLane }),
      ...(preferredLane === undefined
        ? {}
        : {
            normalizedPreferredLane: Math.min(
              Math.max(preferredLane, 0),
              laneFrontier.length - laneSpan,
            ),
            preferredLaneHonored:
              laneStart === Math.min(
                Math.max(preferredLane, 0),
                laneFrontier.length - laneSpan,
              ),
          }),
      ...(lockedLane === undefined
        ? {}
        : { requestedLockedLane: lockedLane }),
      ...(lockedLane === undefined
        ? {}
        : {
            normalizedLockedLane: Math.min(
              Math.max(lockedLane, 0),
              laneFrontier.length - laneSpan,
            ),
          }),
      resolvedLaneStart: laneStart,
      footprintStatus:
        footprint === undefined
          ? "none"
          : isCurrentFootprintWidth(footprint.forCrossSize, crossSize)
            ? "used"
            : "stale",
      crossSize,
      flowSize,
      frontierFlowOffset,
      reservedAdjustedFlowOffset: flowOffset,
    });
  }

  const nextFrontier = flowOffset + flowSize + context.flowGap;
  for (let offset = 0; offset < laneSpan; offset += 1) {
    laneFrontier[laneStart + offset] = nextFrontier;
  }

  return cell;
}

/**
 * Stateful form of the same lane-frontier kernel. It is intentionally
 * internal: adapters and callers continue to use pure layout results.
 */
export function createLogicalLaneState(
  context: LogicalLayoutContext,
): LogicalLaneState {
  const laneFrontier = Array<number>(context.laneCount).fill(0);
  const cells: LogicalCell[] = [];
  return {
    get cells(): readonly LogicalCell[] {
      return cells.slice();
    },
    get containerFlowSize(): number {
      return calculateContainerFlowSize(
        laneFrontier,
        context.flowGap,
        cells.length > 0,
        context.reservedFlowExtent,
      );
    },
    append(item: LogicalItem): LogicalCell {
      const cell = placeLaneItem(
        item.id,
        item.sourceIndex,
        item.aspectRatio,
        item.laneSpan,
        item.laneSpan,
        item.preferredLane,
        item.lockedLane,
        item.footprint,
        context,
        laneFrontier,
        (id, sourceIndex, laneStart, laneSpan, crossOffset, flowOffset,
          crossSize, flowSize, aspectRatio) => ({
            id,
            sourceIndex,
            laneStart,
            laneSpan,
            crossOffset,
            flowOffset,
            crossSize,
            flowSize,
            aspectRatio,
          }),
      );
      cells.push(cell);
      return cell;
    },
  };
}

/** Places normalized logical items using the shared lane-frontier kernel. */
export function calculateLogicalLaneLayout(
  items: readonly LogicalItem[],
  context: LogicalLayoutContext,
): LogicalLayoutResult {
  const laneFrontier = Array<number>(context.laneCount).fill(0);
  const cells: LogicalCell[] = [];

  for (const item of items) {
    cells.push(placeLaneItem(
      item.id,
      item.sourceIndex,
      item.aspectRatio,
      item.laneSpan,
      item.requestedLaneSpan ?? item.laneSpan,
      item.preferredLane,
      item.lockedLane,
      item.footprint,
      context,
      laneFrontier,
      (id, sourceIndex, laneStart, laneSpan, crossOffset, flowOffset,
        crossSize, flowSize, aspectRatio) => ({
          id,
          sourceIndex,
          laneStart,
          laneSpan,
          crossOffset,
          flowOffset,
          crossSize,
          flowSize,
          aspectRatio,
        }),
    ));
  }

  return {
    cells,
    containerFlowSize: calculateContainerFlowSize(
      laneFrontier,
      context.flowGap,
      cells.length > 0,
      context.reservedFlowExtent,
    ),
  };
}

/**
 * Vertical normalization at the logical-kernel boundary for distribution
 * modes. It avoids retaining a second normalized item array while still
 * feeding the shared lane placement kernel logical span/footprint values.
 */
export function calculateVerticalLogicalLayout(
  items: readonly GridItem[],
  context: LogicalLayoutContext,
): LogicalLayoutResult {
  const laneFrontier = Array<number>(context.laneCount).fill(0);
  const cells: LogicalCell[] = [];

  for (let sourceIndex = 0; sourceIndex < items.length; sourceIndex += 1) {
    const item = items[sourceIndex];
    if (item === undefined) continue;
    const requestedSpan = item.layoutHint?.columnSpan ?? 1;
    const laneSpan = Math.min(requestedSpan, context.laneCount);
    const preferredLane = item.layoutHint?.preferredColumn;
    const lockedLane = item.layoutHint?.lockedColumn;
    const footprint = item.resolvedFootprint;

    cells.push(placeLaneItem(
      item.id,
      sourceIndex,
      item.aspectRatio,
      laneSpan,
      requestedSpan,
      preferredLane,
      lockedLane,
      footprint === undefined
        ? undefined
        : { flowSize: footprint.height, forCrossSize: footprint.forWidth },
      context,
      laneFrontier,
      (id, index, start, span, x, y, crossSize, flowSize, ratio) => ({
        id,
        sourceIndex: index,
        laneStart: start,
        laneSpan: span,
        crossOffset: x,
        flowOffset: y,
        crossSize,
        flowSize,
        aspectRatio: ratio,
      }),
    ));
  }

  return {
    cells,
    containerFlowSize: calculateContainerFlowSize(
      laneFrontier,
      context.flowGap,
      cells.length > 0,
      context.reservedFlowExtent,
    ),
  };
}

/**
 * Uses the same logical lane kernel as the distribution path while projecting
 * directly to the stable vertical public cell for the default/start fast path.
 * This avoids allocating an intermediate logical cell and a second mapped
 * array when no flow distribution is requested.
 */
export function calculateVerticalStartLayout(
  items: readonly GridItem[],
  context: LogicalLayoutContext,
): VerticalLayoutResult<MasonryCell> {
  const laneFrontier = Array<number>(context.laneCount).fill(0);
  const cells: MasonryCell[] = [];

  for (let sourceIndex = 0; sourceIndex < items.length; sourceIndex += 1) {
    const item = items[sourceIndex];
    if (item === undefined) continue;
    const requestedSpan = item.layoutHint?.columnSpan ?? 1;
    const laneSpan = Math.min(requestedSpan, context.laneCount);
    const preferredLane = item.layoutHint?.preferredColumn;
    const lockedLane = item.layoutHint?.lockedColumn;
    const footprint = item.resolvedFootprint;

    cells.push(placeLaneItem(
      item.id,
      sourceIndex,
      item.aspectRatio,
      laneSpan,
      requestedSpan,
      preferredLane,
      lockedLane,
      footprint === undefined
        ? undefined
        : {
            flowSize: footprint.height,
            forCrossSize: footprint.forWidth,
          },
      context,
      laneFrontier,
      (id, index, start, span, x, y, width, height, ratio) => ({
        id,
        index,
        column: start,
        columnSpan: span,
        x,
        y,
        width,
        height,
        aspectRatio: ratio,
      }),
    ));
  }

  return {
    cells,
    containerFlowSize: calculateContainerFlowSize(
      laneFrontier,
      context.flowGap,
      cells.length > 0,
      context.reservedFlowExtent,
    ),
  };
}

export function projectVerticalCell(cell: LogicalCell): MasonryCell {
  return {
    id: cell.id,
    index: cell.sourceIndex,
    column: cell.laneStart,
    columnSpan: cell.laneSpan,
    x: cell.crossOffset,
    y: cell.flowOffset,
    width: cell.crossSize,
    height: cell.flowSize,
    aspectRatio: cell.aspectRatio,
  };
}
