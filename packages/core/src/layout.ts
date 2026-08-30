import type {
  GridItem,
  MasonryCell,
  MasonryLayoutOptions,
  MasonryLayoutResult,
  ResolvedMasonryLayoutOptions,
} from "./types.js";
import { GridMasonryError } from "./errors.js";
import { resolveOptions, validateItems } from "./validate.js";
import {
  calculateVerticalLogicalLayout,
  calculateVerticalStartLayout,
  createLogicalLaneState,
  createVerticalLayoutContext,
  projectVerticalCell,
  type LogicalLaneState,
  type LogicalItem,
} from "./logical-layout.js";
import { distributeFlowSlack } from "./vertical-distribution.js";
import { reverseFlowOffset } from "./flow-direction.js";
import { reverseCrossOffset } from "./cross-direction.js";
import {
  createLayoutDiagnosticCollector,
  type LayoutDiagnosticCollector,
} from "./layout-diagnostics.js";
import type { LayoutWithDiagnostics } from "./types.js";

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function filledColumnWidthFor(
  containerWidth: number,
  columnGap: number,
  columnCount: number,
): number {
  return (
    containerWidth - columnGap * (columnCount - 1)
  ) / columnCount;
}

export function calculateColumnCount(
  options: ResolvedMasonryLayoutOptions,
): number {
  const rawCount = Math.max(
    1,
    Math.floor(
      (options.containerWidth + options.columnGap) /
        (options.minColumnWidth + options.columnGap),
    ),
  );

  let columnCount = clamp(rawCount, options.minColumns, options.maxColumns);

  if (
    options.columnSizing === "fill" &&
    options.maxColumnWidth !== undefined
  ) {
    while (
      columnCount < options.maxColumns &&
      filledColumnWidthFor(
        options.containerWidth,
        options.columnGap,
        columnCount,
      ) > options.maxColumnWidth
    ) {
      columnCount += 1;
    }
  }

  return columnCount;
}

export interface ColumnGeometry {
  readonly columnCount: number;
  readonly columnWidth: number;
  readonly contentWidth: number;
  readonly contentOffsetX: number;
}

export function calculateColumnGeometry(
  options: ResolvedMasonryLayoutOptions,
): ColumnGeometry {
  const columnCount = calculateColumnCount(options);
  const filledColumnWidth = filledColumnWidthFor(
    options.containerWidth,
    options.columnGap,
    columnCount,
  );

  const columnWidth =
    options.columnSizing === "cap" && options.maxColumnWidth !== undefined
      ? Math.min(filledColumnWidth, options.maxColumnWidth)
      : filledColumnWidth;

  const contentWidth =
    columnWidth * columnCount + options.columnGap * (columnCount - 1);
  const slack = Math.max(0, options.containerWidth - contentWidth);

  const contentOffsetX =
    options.columnSizing !== "cap" || options.columnAlignment === "start"
      ? 0
      : options.columnAlignment === "center"
        ? slack / 2
        : slack;

  return {
    columnCount,
    columnWidth,
    contentWidth,
    contentOffsetX,
  };
}

export function calculateMasonryLayout(
  items: readonly GridItem[],
  options: MasonryLayoutOptions,
): MasonryLayoutResult {
  return calculateMasonryLayoutInternal(items, options);
}

function calculateMasonryLayoutInternal(
  items: readonly GridItem[],
  options: MasonryLayoutOptions,
  diagnosticCollector?: LayoutDiagnosticCollector,
): MasonryLayoutResult {
  validateItems(items);
  const resolved = resolveOptions(options);

  const {
    columnCount,
    columnWidth,
    contentWidth,
    contentOffsetX,
  } = calculateColumnGeometry(resolved);

  const logicalContext = createVerticalLayoutContext(resolved, {
    columnCount,
    columnWidth,
    contentOffsetX,
  }, diagnosticCollector);
  let containerHeight: number;
  let cells: readonly MasonryCell[];
  if (resolved.flowDistribution === "start") {
    const logicalLayout = calculateVerticalStartLayout(
      items,
      logicalContext,
    );
    containerHeight = logicalLayout.containerFlowSize;
    cells = logicalLayout.cells;
    for (const cell of logicalLayout.cells) {
      diagnosticCollector?.recordDistribution(cell.index, cell.y);
    }
  } else {
    const logicalLayout = calculateVerticalLogicalLayout(
      items,
      logicalContext,
    );
    containerHeight = logicalLayout.containerFlowSize;
    const distributedCells = distributeFlowSlack(
      logicalLayout.cells,
      logicalContext.laneCount,
      logicalContext.flowGap,
      resolved.flowDistribution,
      logicalContext.reservedRegions,
    );
    for (const cell of distributedCells) {
      diagnosticCollector?.recordDistribution(cell.sourceIndex, cell.flowOffset);
    }
    cells = distributedCells.map(projectVerticalCell);
  }

  const projectedCells = cells.map((cell) => ({
    ...cell,
    ...(resolved.flowDirection === "forward"
      ? {}
      : { y: reverseFlowOffset(cell.y, cell.height, containerHeight) }),
    ...(resolved.crossDirection === "forward"
      ? {}
      : { x: reverseCrossOffset(cell.x, cell.width, resolved.containerWidth) }),
  }));

  const projectedContentOffsetX = resolved.crossDirection === "forward"
    ? contentOffsetX
    : reverseCrossOffset(contentOffsetX, contentWidth, resolved.containerWidth);

  return {
    coordinateSpace: "container-relative-logical",
    containerWidth: resolved.containerWidth,
    containerHeight,
    contentWidth,
    contentOffsetX: projectedContentOffsetX,
    columnCount,
    columnWidth,
    columnGap: resolved.columnGap,
    rowGap: resolved.rowGap,
    columnSizing: resolved.columnSizing,
    columnAlignment: resolved.columnAlignment,
    cells: projectedCells,
  };
}

export function calculateMasonryLayoutWithDiagnostics(
  items: readonly GridItem[],
  options: MasonryLayoutOptions,
): LayoutWithDiagnostics<MasonryLayoutResult> {
  const diagnosticCollector = createLayoutDiagnosticCollector(
    "vertical",
    items.length,
  );
  const layout = calculateMasonryLayoutInternal(items, options, diagnosticCollector);
  return {
    layout,
    diagnostics: diagnosticCollector.finish(
      layout.containerHeight,
      layout.columnCount,
      options.reservedRegions?.length ?? 0,
    ),
  };
}

export interface VerticalAppendLayoutState {
  readonly append: (item: GridItem) => MasonryLayoutResult;
}

function normalizeVerticalAppendItem(
  item: GridItem,
  sourceIndex: number,
  laneCount: number,
): LogicalItem {
  const requestedSpan = item.layoutHint?.columnSpan ?? 1;
  const footprint = item.resolvedFootprint;
  return {
    id: item.id,
    sourceIndex,
    aspectRatio: item.aspectRatio,
    laneSpan: Math.min(requestedSpan, laneCount),
    ...(item.layoutHint?.preferredColumn === undefined
      ? {}
      : { preferredLane: item.layoutHint.preferredColumn }),
    ...(item.layoutHint?.lockedColumn === undefined
      ? {}
      : { lockedLane: item.layoutHint.lockedColumn }),
    ...(footprint === undefined
      ? {}
      : { footprint: { flowSize: footprint.height, forCrossSize: footprint.forWidth } }),
  };
}

function verticalResultFromLaneState(
  state: LogicalLaneState,
  resolved: ResolvedMasonryLayoutOptions,
  geometry: ColumnGeometry,
): MasonryLayoutResult {
  return {
    coordinateSpace: "container-relative-logical",
    containerWidth: resolved.containerWidth,
    containerHeight: state.containerFlowSize,
    contentWidth: geometry.contentWidth,
    contentOffsetX: geometry.contentOffsetX,
    columnCount: geometry.columnCount,
    columnWidth: geometry.columnWidth,
    columnGap: resolved.columnGap,
    rowGap: resolved.rowGap,
    columnSizing: resolved.columnSizing,
    columnAlignment: resolved.columnAlignment,
    cells: state.cells.map(projectVerticalCell),
  };
}

/**
 * Creates the compact/start append path. Distribution modes remain on the
 * pure path because appending can change their global slack solution.
 */
export function createVerticalAppendLayoutState(
  items: readonly GridItem[],
  options: MasonryLayoutOptions,
): VerticalAppendLayoutState | undefined {
  validateItems(items);
  const resolved = resolveOptions(options);
  if (
    resolved.flowDistribution !== "start" ||
    resolved.flowDirection !== "forward" ||
    resolved.crossDirection !== "forward" ||
    resolved.flowTolerance !== 0 ||
    resolved.reservedRegions.length > 0
  ) return undefined;
  const geometry = calculateColumnGeometry(resolved);
  const context = createVerticalLayoutContext(resolved, geometry);
  const laneState = createLogicalLaneState(context);
  const knownIds = new Set<string>();
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item === undefined) continue;
    knownIds.add(item.id);
    laneState.append(normalizeVerticalAppendItem(item, index, geometry.columnCount));
  }
  let nextIndex = items.length;
  return {
    append(item: GridItem): MasonryLayoutResult {
      validateItems([item]);
      if (knownIds.has(item.id)) {
        throw new GridMasonryError("DUPLICATE_ITEM_ID", `Duplicate GridItem id: ${item.id}`);
      }
      laneState.append(normalizeVerticalAppendItem(item, nextIndex, geometry.columnCount));
      knownIds.add(item.id);
      nextIndex += 1;
      return verticalResultFromLaneState(laneState, resolved, geometry);
    },
  };
}
