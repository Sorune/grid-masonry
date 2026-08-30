import type {
  HorizontalGridItem,
  HorizontalMasonryCell,
  HorizontalMasonryLayoutOptions,
  HorizontalMasonryLayoutResult,
  ResolvedHorizontalMasonryLayoutOptions,
} from "./types.js";
import { GridMasonryError } from "./errors.js";
import {
  calculateLogicalLaneLayout,
  createLogicalLayoutContext,
  createLogicalLaneState,
  normalizeReservedRegions,
  type LogicalCell,
  type LogicalItem,
  type LogicalLaneState,
} from "./logical-layout.js";
import {
  resolveHorizontalOptions,
  validateHorizontalItems,
} from "./validate.js";
import { distributeFlowSlack } from "./vertical-distribution.js";
import { reverseFlowOffset } from "./flow-direction.js";
import { reverseCrossOffset } from "./cross-direction.js";
import {
  createLayoutDiagnosticCollector,
  type LayoutDiagnosticCollector,
} from "./layout-diagnostics.js";
import type { LayoutWithDiagnostics } from "./types.js";

interface RowGeometry {
  readonly rowCount: number;
  readonly rowHeight: number;
  readonly contentHeight: number;
  readonly contentOffsetY: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function filledRowHeightFor(
  containerHeight: number,
  rowGap: number,
  rowCount: number,
): number {
  return (
    containerHeight - rowGap * (rowCount - 1)
  ) / rowCount;
}

function calculateRowCount(
  options: ResolvedHorizontalMasonryLayoutOptions,
): number {
  const rawCount = Math.max(
    1,
    Math.floor(
      (options.containerHeight + options.rowGap) /
        (options.minRowHeight + options.rowGap),
    ),
  );

  let rowCount = clamp(rawCount, options.minRows, options.maxRows);

  if (
    options.rowSizing === "fill" &&
    options.maxRowHeight !== undefined
  ) {
    while (
      rowCount < options.maxRows &&
      filledRowHeightFor(
        options.containerHeight,
        options.rowGap,
        rowCount,
      ) > options.maxRowHeight
    ) {
      rowCount += 1;
    }
  }

  return rowCount;
}

function calculateRowGeometry(
  options: ResolvedHorizontalMasonryLayoutOptions,
): RowGeometry {
  const rowCount = calculateRowCount(options);
  const filledRowHeight = filledRowHeightFor(
    options.containerHeight,
    options.rowGap,
    rowCount,
  );

  const rowHeight =
    options.rowSizing === "cap" && options.maxRowHeight !== undefined
      ? Math.min(filledRowHeight, options.maxRowHeight)
      : filledRowHeight;

  const contentHeight =
    rowHeight * rowCount + options.rowGap * (rowCount - 1);
  const slack = Math.max(0, options.containerHeight - contentHeight);
  const contentOffsetY =
    options.rowSizing !== "cap" || options.rowAlignment === "start"
      ? 0
      : options.rowAlignment === "center"
        ? slack / 2
        : slack;

  return { rowCount, rowHeight, contentHeight, contentOffsetY };
}

function normalizeHorizontalItems(
  items: readonly HorizontalGridItem[],
  laneCount: number,
  diagnosticCollector?: LayoutDiagnosticCollector,
): readonly LogicalItem[] {
  return items.map((item, sourceIndex) => {
    const requestedSpan = item.layoutHint?.rowSpan ?? 1;
    const preferredLane = item.layoutHint?.preferredRow;
    const lockedLane = item.layoutHint?.lockedRow;
    const footprint = item.resolvedFootprint;

    return {
      id: item.id,
      sourceIndex,
      aspectRatio: item.aspectRatio,
      laneSpan: Math.min(requestedSpan, laneCount),
      ...(diagnosticCollector === undefined
        ? {}
        : { requestedLaneSpan: requestedSpan }),
      ...(preferredLane === undefined ? {} : { preferredLane }),
      ...(lockedLane === undefined ? {} : { lockedLane }),
      ...(footprint === undefined
        ? {}
        : {
            footprint: {
              flowSize: footprint.width,
              forCrossSize: footprint.forHeight,
            },
          }),
    };
  });
}

function projectHorizontalCell(cell: LogicalCell): HorizontalMasonryCell {
  return {
    id: cell.id,
    index: cell.sourceIndex,
    row: cell.laneStart,
    rowSpan: cell.laneSpan,
    x: cell.flowOffset,
    y: cell.crossOffset,
    width: cell.flowSize,
    height: cell.crossSize,
    aspectRatio: cell.aspectRatio,
  };
}

export function calculateHorizontalMasonryLayout(
  items: readonly HorizontalGridItem[],
  options: HorizontalMasonryLayoutOptions,
): HorizontalMasonryLayoutResult {
  return calculateHorizontalMasonryLayoutInternal(items, options);
}

function calculateHorizontalMasonryLayoutInternal(
  items: readonly HorizontalGridItem[],
  options: HorizontalMasonryLayoutOptions,
  diagnosticCollector?: LayoutDiagnosticCollector,
): HorizontalMasonryLayoutResult {
  validateHorizontalItems(items);
  const resolved = resolveHorizontalOptions(options);
  const geometry = calculateRowGeometry(resolved);
  const context = createLogicalLayoutContext({
    laneCount: geometry.rowCount,
    laneCrossSize: geometry.rowHeight,
    crossGap: resolved.rowGap,
    flowGap: resolved.columnGap,
    containerCrossSize: resolved.containerHeight,
    crossOffset: geometry.contentOffsetY,
    flowSizeFromCrossSize: (aspectRatio, crossSize) =>
      crossSize * aspectRatio,
    reservedRegions: normalizeReservedRegions(resolved.reservedRegions, geometry.rowCount),
    reservedFlowExtent: 0,
    flowTolerance: resolved.flowTolerance,
    ...(diagnosticCollector === undefined ? {} : { diagnosticCollector }),
  });
  const logicalLayout = calculateLogicalLaneLayout(
    normalizeHorizontalItems(items, geometry.rowCount, diagnosticCollector),
    context,
  );
  const distributedCells = distributeFlowSlack(
    logicalLayout.cells,
    context.laneCount,
    context.flowGap,
    resolved.flowDistribution,
    context.reservedRegions,
  );
  for (const cell of distributedCells) {
    diagnosticCollector?.recordDistribution(cell.sourceIndex, cell.flowOffset);
  }
  const projectedLogicalCells = distributedCells.map(projectHorizontalCell);
  const projectedCells = projectedLogicalCells.map((cell) => ({
    ...cell,
    ...(resolved.flowDirection === "forward"
      ? {}
      : { x: reverseFlowOffset(cell.x, cell.width, logicalLayout.containerFlowSize) }),
    ...(resolved.crossDirection === "forward"
      ? {}
      : { y: reverseCrossOffset(cell.y, cell.height, resolved.containerHeight) }),
  }));

  const projectedContentOffsetY = resolved.crossDirection === "forward"
    ? geometry.contentOffsetY
    : reverseCrossOffset(geometry.contentOffsetY, geometry.contentHeight, resolved.containerHeight);

  return {
    coordinateSpace: "container-relative-logical",
    containerWidth: logicalLayout.containerFlowSize,
    containerHeight: resolved.containerHeight,
    contentWidth: logicalLayout.containerFlowSize,
    contentHeight: geometry.contentHeight,
    contentOffsetY: projectedContentOffsetY,
    rowCount: geometry.rowCount,
    rowHeight: geometry.rowHeight,
    rowGap: resolved.rowGap,
    columnGap: resolved.columnGap,
    rowSizing: resolved.rowSizing,
    rowAlignment: resolved.rowAlignment,
    cells: projectedCells,
  };
}

export function calculateHorizontalMasonryLayoutWithDiagnostics(
  items: readonly HorizontalGridItem[],
  options: HorizontalMasonryLayoutOptions,
): LayoutWithDiagnostics<HorizontalMasonryLayoutResult> {
  const diagnosticCollector = createLayoutDiagnosticCollector(
    "horizontal",
    items.length,
  );
  const layout = calculateHorizontalMasonryLayoutInternal(
    items,
    options,
    diagnosticCollector,
  );
  return {
    layout,
    diagnostics: diagnosticCollector.finish(
      layout.containerWidth,
      layout.rowCount,
      options.reservedRegions?.length ?? 0,
    ),
  };
}

export interface HorizontalAppendLayoutState {
  readonly append: (item: HorizontalGridItem) => HorizontalMasonryLayoutResult;
}

function horizontalResultFromLaneState(
  state: LogicalLaneState,
  resolved: ResolvedHorizontalMasonryLayoutOptions,
  geometry: RowGeometry,
): HorizontalMasonryLayoutResult {
  return {
    coordinateSpace: "container-relative-logical",
    containerWidth: state.containerFlowSize,
    containerHeight: resolved.containerHeight,
    contentWidth: state.containerFlowSize,
    contentHeight: geometry.contentHeight,
    contentOffsetY: geometry.contentOffsetY,
    rowCount: geometry.rowCount,
    rowHeight: geometry.rowHeight,
    rowGap: resolved.rowGap,
    columnGap: resolved.columnGap,
    rowSizing: resolved.rowSizing,
    rowAlignment: resolved.rowAlignment,
    cells: state.cells.map(projectHorizontalCell),
  };
}

/** Creates the compact/start horizontal append path using the shared kernel. */
export function createHorizontalAppendLayoutState(
  items: readonly HorizontalGridItem[],
  options: HorizontalMasonryLayoutOptions,
): HorizontalAppendLayoutState | undefined {
  validateHorizontalItems(items);
  const resolved = resolveHorizontalOptions(options);
  if (
    resolved.flowDistribution !== "start" ||
    resolved.flowDirection !== "forward" ||
    resolved.crossDirection !== "forward" ||
    resolved.flowTolerance !== 0 ||
    resolved.reservedRegions.length > 0
  ) return undefined;
  const geometry = calculateRowGeometry(resolved);
  const context = createLogicalLayoutContext({
    laneCount: geometry.rowCount,
    laneCrossSize: geometry.rowHeight,
    crossGap: resolved.rowGap,
    flowGap: resolved.columnGap,
    containerCrossSize: resolved.containerHeight,
    crossOffset: geometry.contentOffsetY,
    flowSizeFromCrossSize: (aspectRatio, crossSize) => crossSize * aspectRatio,
    reservedRegions: normalizeReservedRegions(resolved.reservedRegions, geometry.rowCount),
    reservedFlowExtent: 0,
    flowTolerance: resolved.flowTolerance,
  });
  const laneState = createLogicalLaneState(context);
  const knownIds = new Set<string>();
  const normalize = (item: HorizontalGridItem, sourceIndex: number): LogicalItem => {
    const requestedSpan = item.layoutHint?.rowSpan ?? 1;
    const footprint = item.resolvedFootprint;
    return {
      id: item.id,
      sourceIndex,
      aspectRatio: item.aspectRatio,
      laneSpan: Math.min(requestedSpan, geometry.rowCount),
      ...(item.layoutHint?.preferredRow === undefined ? {} : { preferredLane: item.layoutHint.preferredRow }),
      ...(item.layoutHint?.lockedRow === undefined ? {} : { lockedLane: item.layoutHint.lockedRow }),
      ...(footprint === undefined ? {} : { footprint: { flowSize: footprint.width, forCrossSize: footprint.forHeight } }),
    };
  };
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item === undefined) continue;
    knownIds.add(item.id);
    laneState.append(normalize(item, index));
  }
  let nextIndex = items.length;
  return {
    append(item: HorizontalGridItem): HorizontalMasonryLayoutResult {
      validateHorizontalItems([item]);
      if (knownIds.has(item.id)) {
        throw new GridMasonryError("DUPLICATE_ITEM_ID", `Duplicate HorizontalGridItem id: ${item.id}`);
      }
      laneState.append(normalize(item, nextIndex));
      knownIds.add(item.id);
      nextIndex += 1;
      return horizontalResultFromLaneState(laneState, resolved, geometry);
    },
  };
}
