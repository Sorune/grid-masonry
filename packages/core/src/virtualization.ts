import { GridMasonryError } from "./errors.js";
import type { FlowRangeIndex } from "./layout-query.js";
import type {
  FlowRange,
  HorizontalMasonryCell,
  HorizontalMasonryLayoutResult,
  MasonryCell,
  MasonryLayoutResult,
} from "./types.js";

export interface VirtualizationOptions {
  /** Extra flow-axis distance requested on both sides of the visible range. */
  readonly overscan?: number;
}

export interface VirtualizedCells<Cell> {
  readonly visibleRange: FlowRange;
  readonly overscanRange: FlowRange;
  readonly cells: readonly Cell[];
  readonly ids: readonly string[];
  readonly indexes: readonly number[];
}

function validateRange(range: FlowRange): void {
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

function resolveOverscan(value: number | undefined): number {
  const overscan = value ?? 0;
  if (!Number.isFinite(overscan) || overscan < 0) {
    throw new GridMasonryError(
      "INVALID_RANGE",
      `overscan must be a non-negative finite number. Received: ${String(overscan)}`,
    );
  }
  return overscan;
}

function queryVirtualized<Cell extends { readonly id: string; readonly index: number }>(
  cells: readonly Cell[],
  range: FlowRange,
  options: VirtualizationOptions | undefined,
  index: FlowRangeIndex<Cell> | undefined,
  getFlowOffset: (cell: Cell) => number,
  getFlowSize: (cell: Cell) => number,
): VirtualizedCells<Cell> {
  validateRange(range);
  const overscan = resolveOverscan(options?.overscan);
  const overscanRange = {
    start: Math.max(0, range.start - overscan),
    end: range.end + overscan,
  };
  const visibleCells = index === undefined
    ? cells.filter((cell) => {
        const start = getFlowOffset(cell);
        const end = start + getFlowSize(cell);
        return end >= overscanRange.start && start <= overscanRange.end;
      })
    : index.query(overscanRange);
  return {
    visibleRange: { ...range },
    overscanRange,
    cells: visibleCells,
    ids: visibleCells.map((cell) => cell.id),
    indexes: visibleCells.map((cell) => cell.index),
  };
}

export function queryVirtualizedCells(
  layout: MasonryLayoutResult,
  range: FlowRange,
  options?: VirtualizationOptions,
  index?: FlowRangeIndex<MasonryCell>,
): VirtualizedCells<MasonryCell>;
export function queryVirtualizedCells(
  layout: HorizontalMasonryLayoutResult,
  range: FlowRange,
  options?: VirtualizationOptions,
  index?: FlowRangeIndex<HorizontalMasonryCell>,
): VirtualizedCells<HorizontalMasonryCell>;
export function queryVirtualizedCells(
  layout: MasonryLayoutResult | HorizontalMasonryLayoutResult,
  range: FlowRange,
  options?: VirtualizationOptions,
  index?: FlowRangeIndex<MasonryCell> | FlowRangeIndex<HorizontalMasonryCell>,
): VirtualizedCells<MasonryCell | HorizontalMasonryCell> {
  if ("column" in (layout.cells[0] ?? {})) {
    return queryVirtualized(
      layout.cells as readonly MasonryCell[],
      range,
      options,
      index as FlowRangeIndex<MasonryCell> | undefined,
      (cell) => cell.y,
      (cell) => cell.height,
    );
  }
  return queryVirtualized(
    layout.cells as readonly HorizontalMasonryCell[],
    range,
    options,
    index as FlowRangeIndex<HorizontalMasonryCell> | undefined,
    (cell) => cell.x,
    (cell) => cell.width,
  );
}

/** Reference helper used by tests and callers that do not need overscan. */
export function queryVirtualizedReference(
  layout: MasonryLayoutResult | HorizontalMasonryLayoutResult,
  range: FlowRange,
  options?: VirtualizationOptions,
): VirtualizedCells<MasonryCell | HorizontalMasonryCell> {
  return queryVirtualizedCells(layout as MasonryLayoutResult, range, options);
}
