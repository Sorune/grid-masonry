import { GridMasonryError } from "./errors.js";
import type {
  FlowRange,
  HorizontalMasonryCell,
  HorizontalMasonryLayoutResult,
  MasonryCell,
  MasonryLayoutResult,
  VerticalRange,
} from "./types.js";

function validateFlowRange(range: FlowRange): void {
  if (!Number.isFinite(range.start) || range.start < 0) {
    throw new GridMasonryError(
      "INVALID_RANGE",
      `range.start must be a non-negative finite number. Received: ${String(range.start)}`,
    );
  }
  if (!Number.isFinite(range.end) || range.end < range.start) {
    throw new GridMasonryError(
      "INVALID_RANGE",
      `range.end must be finite and >= range.start. Received: ${String(range.end)}`,
    );
  }
}

function validateVerticalRange(range: VerticalRange): void {
  if (!Number.isFinite(range.top) || range.top < 0) {
    throw new GridMasonryError(
      "INVALID_RANGE",
      `range.top must be a non-negative finite number. Received: ${String(range.top)}`,
    );
  }

  if (!Number.isFinite(range.bottom) || range.bottom < range.top) {
    throw new GridMasonryError(
      "INVALID_RANGE",
      `range.bottom must be finite and >= range.top. Received: ${String(range.bottom)}`,
    );
  }
}

export function cellIntersectsVerticalRange(
  cell: MasonryCell,
  range: VerticalRange,
): boolean {
  validateVerticalRange(range);
  return cell.y + cell.height >= range.top && cell.y <= range.bottom;
}

/**
 * Returns cells that intersect a vertical logical-coordinate range.
 *
 * V1 intentionally uses an O(N) scan. The public query contract can later be
 * backed by an interval/range index without changing adapter-facing semantics.
 */
export function queryVisibleCells(
  layout: MasonryLayoutResult,
  range: VerticalRange,
): readonly MasonryCell[] {
  validateVerticalRange(range);
  return layout.cells.filter(
    (cell) => cell.y + cell.height >= range.top && cell.y <= range.bottom,
  );
}

function intersectsFlow(
  flowOffset: number,
  flowSize: number,
  range: FlowRange,
): boolean {
  return (
    flowOffset + flowSize >= range.start && flowOffset <= range.end
  );
}

interface FlowIndexEntry<Cell> {
  readonly cell: Cell;
  readonly index: number;
  readonly start: number;
  readonly end: number;
}

export interface FlowRangeIndex<Cell> {
  readonly query: (range: FlowRange) => readonly Cell[];
}

function lowerBound<Cell>(
  entries: readonly FlowIndexEntry<Cell>[],
  value: number,
): number {
  let low = 0;
  let high = entries.length;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    const entry = entries[middle];
    if (entry !== undefined && entry.start <= value) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
}

function createIndex<Cell>(
  cells: readonly Cell[],
  getFlowOffset: (cell: Cell) => number,
  getFlowSize: (cell: Cell) => number,
  getIndex: (cell: Cell, position: number) => number,
): FlowRangeIndex<Cell> {
  const entries = cells
    .map((cell, position) => ({
      cell,
      index: getIndex(cell, position),
      start: getFlowOffset(cell),
      end: getFlowOffset(cell) + getFlowSize(cell),
    }))
    .sort((left, right) => left.start - right.start || left.index - right.index);

  return {
    query(range: FlowRange): readonly Cell[] {
      validateFlowRange(range);
      const candidates = entries.slice(0, lowerBound(entries, range.end + Number.EPSILON));
      return candidates
        .filter((entry) => entry.end >= range.start)
        .sort((left, right) => left.index - right.index)
        .map((entry) => entry.cell);
    },
  };
}

/** Builds an optional flow interval index without retaining DOM objects. */
export function createFlowRangeIndex(
  layout: MasonryLayoutResult,
): FlowRangeIndex<MasonryCell>;
export function createFlowRangeIndex(
  layout: HorizontalMasonryLayoutResult,
): FlowRangeIndex<HorizontalMasonryCell>;
export function createFlowRangeIndex(
  layout: MasonryLayoutResult | HorizontalMasonryLayoutResult,
): FlowRangeIndex<MasonryCell | HorizontalMasonryCell> {
  return "column" in (layout.cells[0] ?? {})
    ? createIndex(
        layout.cells as readonly MasonryCell[],
        (cell) => cell.y,
        (cell) => cell.height,
        (cell) => cell.index,
      )
    : createIndex(
        layout.cells as readonly HorizontalMasonryCell[],
        (cell) => cell.x,
        (cell) => cell.width,
        (cell) => cell.index,
      );
}

/**
 * Axis-neutral visible-flow query. The layout-specific overload keeps the
 * returned physical cell type while the implementation uses only flow-axis
 * offsets and sizes.
 */
export function queryVisibleFlowCells(
  layout: MasonryLayoutResult,
  range: FlowRange,
): readonly MasonryCell[];
export function queryVisibleFlowCells(
  layout: HorizontalMasonryLayoutResult,
  range: FlowRange,
): readonly HorizontalMasonryCell[];
export function queryVisibleFlowCells(
  layout: MasonryLayoutResult | HorizontalMasonryLayoutResult,
  range: FlowRange,
): readonly (MasonryCell | HorizontalMasonryCell)[] {
  validateFlowRange(range);
  return layout.cells.filter((cell) =>
    "column" in cell
      ? intersectsFlow(cell.y, cell.height, range)
      : intersectsFlow(cell.x, cell.width, range),
  );
}
