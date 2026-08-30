import { GridMasonryError } from "./errors.js";
import { validateAspectRatio } from "./aspect-ratio.js";
import type {
  ColumnAlignment,
  ColumnSizingMode,
  GridItem,
  HorizontalGridItem,
  HorizontalMasonryLayoutOptions,
  ResolvedHorizontalMasonryLayoutOptions,
  MasonryLayoutOptions,
  ResolvedMasonryLayoutOptions,
  RowAlignment,
  RowSizingMode,
  FlowDistribution,
  FlowDirection,
  CrossDirection,
  ReservedRegion,
} from "./types.js";

function assertPositiveFinite(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new GridMasonryError(
      "INVALID_OPTION",
      `${name} must be a positive finite number. Received: ${String(value)}`,
    );
  }
}

function assertNonNegativeFinite(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new GridMasonryError(
      "INVALID_OPTION",
      `${name} must be a non-negative finite number. Received: ${String(value)}`,
    );
  }
}

function resolveFlowTolerance(value: number | undefined): number {
  const resolved = value ?? 0;
  assertNonNegativeFinite("flowTolerance", resolved);
  return resolved;
}

function resolveIntegerOption(
  name: string,
  value: number | undefined,
  fallback: number,
): number {
  const resolved = value ?? fallback;

  if (!Number.isInteger(resolved) || resolved < 1) {
    throw new GridMasonryError(
      "INVALID_OPTION",
      `${name} must be an integer >= 1. Received: ${String(resolved)}`,
    );
  }

  return resolved;
}

function resolveColumnSizing(value: ColumnSizingMode | undefined): ColumnSizingMode {
  const resolved = value ?? "fill";
  if (resolved !== "fill" && resolved !== "cap") {
    throw new GridMasonryError(
      "INVALID_OPTION",
      `columnSizing must be "fill" or "cap". Received: ${String(resolved)}`,
    );
  }
  return resolved;
}

function resolveColumnAlignment(
  value: ColumnAlignment | undefined,
): ColumnAlignment {
  const resolved = value ?? "start";
  if (resolved !== "start" && resolved !== "center" && resolved !== "end") {
    throw new GridMasonryError(
      "INVALID_OPTION",
      `columnAlignment must be "start", "center", or "end". Received: ${String(resolved)}`,
    );
  }
  return resolved;
}

function resolveRowSizing(value: RowSizingMode | undefined): RowSizingMode {
  const resolved = value ?? "fill";
  if (resolved !== "fill" && resolved !== "cap") {
    throw new GridMasonryError(
      "INVALID_OPTION",
      `rowSizing must be "fill" or "cap". Received: ${String(resolved)}`,
    );
  }
  return resolved;
}

function resolveRowAlignment(
  value: RowAlignment | undefined,
): RowAlignment {
  const resolved = value ?? "start";
  if (resolved !== "start" && resolved !== "center" && resolved !== "end") {
    throw new GridMasonryError(
      "INVALID_OPTION",
      `rowAlignment must be "start", "center", or "end". Received: ${String(resolved)}`,
    );
  }
  return resolved;
}

function resolveFlowDistribution(
  value: FlowDistribution | undefined,
): FlowDistribution {
  const resolved = value ?? "start";
  if (
    resolved !== "start" &&
    resolved !== "end" &&
    resolved !== "center" &&
    resolved !== "space-between" &&
    resolved !== "space-evenly"
  ) {
    throw new GridMasonryError(
      "INVALID_OPTION",
      `flowDistribution must be "start", "end", "center", "space-between", or "space-evenly". Received: ${String(resolved)}`,
    );
  }
  return resolved;
}

function resolveFlowDirection(
  value: FlowDirection | undefined,
): FlowDirection {
  const resolved = value ?? "forward";
  if (resolved !== "forward" && resolved !== "reverse") {
    throw new GridMasonryError(
      "INVALID_OPTION",
      `flowDirection must be "forward" or "reverse". Received: ${String(resolved)}`,
    );
  }
  return resolved;
}

function resolveCrossDirection(
  value: CrossDirection | undefined,
): CrossDirection {
  const resolved = value ?? "forward";
  if (resolved !== "forward" && resolved !== "reverse") {
    throw new GridMasonryError(
      "INVALID_OPTION",
      `crossDirection must be "forward" or "reverse". Received: ${String(resolved)}`,
    );
  }
  return resolved;
}

function resolveReservedRegions(
  value: readonly ReservedRegion[] | undefined,
): readonly ReservedRegion[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new GridMasonryError(
      "INVALID_OPTION",
      "reservedRegions must be an array of logical reserved regions.",
    );
  }
  const regions = value.map((region, index) => {
    if (region === null || typeof region !== "object") {
      throw new GridMasonryError(
        "INVALID_OPTION",
        `reservedRegions[${index}] must be an object.`,
      );
    }
    const candidate = region as Record<string, unknown>;
    const { laneStart, laneSpan, flowStart, flowSize } = candidate;
    if (typeof laneStart !== "number" || !Number.isFinite(laneStart) || !Number.isInteger(laneStart) || laneStart < 0) {
      throw new GridMasonryError(
        "INVALID_OPTION",
        `reservedRegions[${index}].laneStart must be a finite integer >= 0. Received: ${String(laneStart)}`,
      );
    }
    if (typeof laneSpan !== "number" || !Number.isFinite(laneSpan) || !Number.isInteger(laneSpan) || laneSpan < 1) {
      throw new GridMasonryError(
        "INVALID_OPTION",
        `reservedRegions[${index}].laneSpan must be a finite integer >= 1. Received: ${String(laneSpan)}`,
      );
    }
    if (typeof flowStart !== "number" || !Number.isFinite(flowStart) || flowStart < 0) {
      throw new GridMasonryError(
        "INVALID_OPTION",
        `reservedRegions[${index}].flowStart must be a finite number >= 0. Received: ${String(flowStart)}`,
      );
    }
    if (typeof flowSize !== "number" || !Number.isFinite(flowSize) || flowSize <= 0) {
      throw new GridMasonryError(
        "INVALID_OPTION",
        `reservedRegions[${index}].flowSize must be a finite number > 0. Received: ${String(flowSize)}`,
      );
    }
    return { laneStart, laneSpan, flowStart, flowSize };
  });
  return regions.sort((left, right) =>
    left.laneStart - right.laneStart ||
    left.laneSpan - right.laneSpan ||
    left.flowStart - right.flowStart ||
    left.flowSize - right.flowSize);
}

export function resolveOptions(
  options: MasonryLayoutOptions,
): ResolvedMasonryLayoutOptions {
  assertPositiveFinite("containerWidth", options.containerWidth);
  assertPositiveFinite("minColumnWidth", options.minColumnWidth);

  const gap = options.gap ?? 0;
  assertNonNegativeFinite("gap", gap);

  const columnGap = options.columnGap ?? gap;
  const rowGap = options.rowGap ?? gap;

  assertNonNegativeFinite("columnGap", columnGap);
  assertNonNegativeFinite("rowGap", rowGap);

  const minColumns = resolveIntegerOption("minColumns", options.minColumns, 1);
  const maxColumns = resolveIntegerOption(
    "maxColumns",
    options.maxColumns,
    Number.MAX_SAFE_INTEGER,
  );

  if (maxColumns < minColumns) {
    throw new GridMasonryError(
      "INVALID_OPTION",
      `maxColumns (${maxColumns}) must be >= minColumns (${minColumns}).`,
    );
  }

  if (options.maxColumnWidth !== undefined) {
    assertPositiveFinite("maxColumnWidth", options.maxColumnWidth);

    if (options.maxColumnWidth < options.minColumnWidth) {
      throw new GridMasonryError(
        "INVALID_OPTION",
        `maxColumnWidth (${options.maxColumnWidth}) must be >= minColumnWidth (${options.minColumnWidth}).`,
      );
    }
  }

  return {
    containerWidth: options.containerWidth,
    columnGap,
    rowGap,
    minColumnWidth: options.minColumnWidth,
    minColumns,
    maxColumns,
    columnSizing: resolveColumnSizing(options.columnSizing),
    columnAlignment: resolveColumnAlignment(options.columnAlignment),
    flowDistribution: resolveFlowDistribution(
      options.flowDistribution,
    ),
    flowDirection: resolveFlowDirection(options.flowDirection),
    crossDirection: resolveCrossDirection(options.crossDirection),
    reservedRegions: resolveReservedRegions(options.reservedRegions),
    flowTolerance: resolveFlowTolerance(options.flowTolerance),
    ...(options.maxColumnWidth === undefined
      ? {}
      : { maxColumnWidth: options.maxColumnWidth }),
  };
}

export function resolveHorizontalOptions(
  options: HorizontalMasonryLayoutOptions,
): ResolvedHorizontalMasonryLayoutOptions {
  assertPositiveFinite("containerHeight", options.containerHeight);
  assertPositiveFinite("minRowHeight", options.minRowHeight);

  const gap = options.gap ?? 0;
  assertNonNegativeFinite("gap", gap);

  const rowGap = options.rowGap ?? gap;
  const columnGap = options.columnGap ?? gap;

  assertNonNegativeFinite("rowGap", rowGap);
  assertNonNegativeFinite("columnGap", columnGap);

  const minRows = resolveIntegerOption("minRows", options.minRows, 1);
  const maxRows = resolveIntegerOption(
    "maxRows",
    options.maxRows,
    Number.MAX_SAFE_INTEGER,
  );

  if (maxRows < minRows) {
    throw new GridMasonryError(
      "INVALID_OPTION",
      `maxRows (${maxRows}) must be >= minRows (${minRows}).`,
    );
  }

  if (options.maxRowHeight !== undefined) {
    assertPositiveFinite("maxRowHeight", options.maxRowHeight);

    if (options.maxRowHeight < options.minRowHeight) {
      throw new GridMasonryError(
        "INVALID_OPTION",
        `maxRowHeight (${options.maxRowHeight}) must be >= minRowHeight (${options.minRowHeight}).`,
      );
    }
  }

  return {
    containerHeight: options.containerHeight,
    rowGap,
    columnGap,
    minRowHeight: options.minRowHeight,
    minRows,
    maxRows,
    rowSizing: resolveRowSizing(options.rowSizing),
    rowAlignment: resolveRowAlignment(options.rowAlignment),
    flowDistribution: resolveFlowDistribution(options.flowDistribution),
    flowDirection: resolveFlowDirection(options.flowDirection),
    crossDirection: resolveCrossDirection(options.crossDirection),
    reservedRegions: resolveReservedRegions(options.reservedRegions),
    flowTolerance: resolveFlowTolerance(options.flowTolerance),
    ...(options.maxRowHeight === undefined
      ? {}
      : { maxRowHeight: options.maxRowHeight }),
  };
}

export function validateItems(items: readonly GridItem[]): void {
  const seenIds = new Set<string>();

  for (const item of items) {
    if (typeof item.id !== "string" || item.id.trim().length === 0) {
      throw new GridMasonryError(
        "INVALID_ITEM",
        "GridItem.id must be a non-empty string.",
      );
    }

    if (seenIds.has(item.id)) {
      throw new GridMasonryError(
        "DUPLICATE_ITEM_ID",
        `Duplicate GridItem id: ${item.id}`,
      );
    }

    seenIds.add(item.id);

    try {
      validateAspectRatio(item.aspectRatio);
    } catch {
      throw new GridMasonryError(
        "INVALID_ITEM",
        `GridItem.aspectRatio must be a positive finite number for item: ${item.id}`,
      );
    }

    validateLayoutHint(item);
    validateResolvedFootprint(item);
  }
}

export function validateHorizontalItems(
  items: readonly HorizontalGridItem[],
): void {
  const seenIds = new Set<string>();

  for (const item of items) {
    if (typeof item.id !== "string" || item.id.trim().length === 0) {
      throw new GridMasonryError(
        "INVALID_ITEM",
        "HorizontalGridItem.id must be a non-empty string.",
      );
    }

    if (seenIds.has(item.id)) {
      throw new GridMasonryError(
        "DUPLICATE_ITEM_ID",
        `Duplicate HorizontalGridItem id: ${item.id}`,
      );
    }
    seenIds.add(item.id);

    try {
      validateAspectRatio(item.aspectRatio);
    } catch {
      throw new GridMasonryError(
        "INVALID_ITEM",
        `HorizontalGridItem.aspectRatio must be a positive finite number for item: ${item.id}`,
      );
    }

    validateHorizontalLayoutHint(item);
    validateHorizontalResolvedFootprint(item);
  }
}

function validateLayoutHint(item: GridItem): void {
  const layoutHint: unknown = item.layoutHint;

  if (layoutHint === undefined) {
    return;
  }

  if (typeof layoutHint !== "object" || layoutHint === null) {
    throw new GridMasonryError(
      "INVALID_ITEM",
      `GridItem.layoutHint must be an object for item: ${item.id}. Received: ${String(layoutHint)}`,
    );
  }

  const { columnSpan, preferredColumn, lockedColumn } = layoutHint as {
    readonly columnSpan?: unknown;
    readonly preferredColumn?: unknown;
    readonly lockedColumn?: unknown;
  };

  if (columnSpan !== undefined &&
    (typeof columnSpan !== "number" ||
      !Number.isInteger(columnSpan) ||
      columnSpan < 1)) {
    throw new GridMasonryError(
      "INVALID_ITEM",
      `GridItem.layoutHint.columnSpan must be an integer >= 1 for item: ${item.id}. Received: ${String(columnSpan)}`,
    );
  }

  if (preferredColumn !== undefined &&
    (typeof preferredColumn !== "number" ||
      !Number.isInteger(preferredColumn) ||
      preferredColumn < 0)) {
    throw new GridMasonryError(
      "INVALID_ITEM",
      `GridItem.layoutHint.preferredColumn must be an integer >= 0 for item: ${item.id}. Received: ${String(preferredColumn)}`,
    );
  }

  if (lockedColumn !== undefined &&
    (typeof lockedColumn !== "number" ||
      !Number.isInteger(lockedColumn) ||
      lockedColumn < 0)) {
    throw new GridMasonryError(
      "INVALID_ITEM",
      `GridItem.layoutHint.lockedColumn must be an integer >= 0 for item: ${item.id}. Received: ${String(lockedColumn)}`,
    );
  }
}

function validateHorizontalLayoutHint(item: HorizontalGridItem): void {
  const layoutHint: unknown = item.layoutHint;

  if (layoutHint === undefined) return;

  if (typeof layoutHint !== "object" || layoutHint === null) {
    throw new GridMasonryError(
      "INVALID_ITEM",
      `HorizontalGridItem.layoutHint must be an object for item: ${item.id}. Received: ${String(layoutHint)}`,
    );
  }

  const { rowSpan, preferredRow, lockedRow } = layoutHint as {
    readonly rowSpan?: unknown;
    readonly preferredRow?: unknown;
    readonly lockedRow?: unknown;
  };
  if (rowSpan !== undefined &&
    (typeof rowSpan !== "number" ||
      !Number.isInteger(rowSpan) ||
      rowSpan < 1)) {
    throw new GridMasonryError(
      "INVALID_ITEM",
      `HorizontalGridItem.layoutHint.rowSpan must be an integer >= 1 for item: ${item.id}. Received: ${String(rowSpan)}`,
    );
  }

  if (preferredRow !== undefined &&
    (typeof preferredRow !== "number" ||
      !Number.isInteger(preferredRow) ||
      preferredRow < 0)) {
    throw new GridMasonryError(
      "INVALID_ITEM",
      `HorizontalGridItem.layoutHint.preferredRow must be an integer >= 0 for item: ${item.id}. Received: ${String(preferredRow)}`,
    );
  }

  if (lockedRow !== undefined &&
    (typeof lockedRow !== "number" ||
      !Number.isInteger(lockedRow) ||
      lockedRow < 0)) {
    throw new GridMasonryError(
      "INVALID_ITEM",
      `HorizontalGridItem.layoutHint.lockedRow must be an integer >= 0 for item: ${item.id}. Received: ${String(lockedRow)}`,
    );
  }
}

function validateResolvedFootprint(item: GridItem): void {
  const footprint: unknown = item.resolvedFootprint;

  if (footprint === undefined) {
    return;
  }

  if (typeof footprint !== "object" || footprint === null) {
    throw new GridMasonryError(
      "INVALID_ITEM",
      `GridItem.resolvedFootprint must be an object for item: ${item.id}. Received: ${String(footprint)}`,
    );
  }

  const { height, forWidth } = footprint as {
    readonly height?: unknown;
    readonly forWidth?: unknown;
  };

  if (typeof height !== "number" || !Number.isFinite(height) || height <= 0) {
    throw new GridMasonryError(
      "INVALID_ITEM",
      `GridItem.resolvedFootprint.height must be a positive finite number for item: ${item.id}. Received: ${String(height)}`,
    );
  }

  if (
    typeof forWidth !== "number" ||
    !Number.isFinite(forWidth) ||
    forWidth <= 0
  ) {
    throw new GridMasonryError(
      "INVALID_ITEM",
      `GridItem.resolvedFootprint.forWidth must be a positive finite number for item: ${item.id}. Received: ${String(forWidth)}`,
    );
  }
}

function validateHorizontalResolvedFootprint(
  item: HorizontalGridItem,
): void {
  const footprint: unknown = item.resolvedFootprint;

  if (footprint === undefined) return;

  if (typeof footprint !== "object" || footprint === null) {
    throw new GridMasonryError(
      "INVALID_ITEM",
      `HorizontalGridItem.resolvedFootprint must be an object for item: ${item.id}. Received: ${String(footprint)}`,
    );
  }

  const { width, forHeight } = footprint as {
    readonly width?: unknown;
    readonly forHeight?: unknown;
  };

  if (typeof width !== "number" || !Number.isFinite(width) || width <= 0) {
    throw new GridMasonryError(
      "INVALID_ITEM",
      `HorizontalGridItem.resolvedFootprint.width must be a positive finite number for item: ${item.id}. Received: ${String(width)}`,
    );
  }

  if (
    typeof forHeight !== "number" ||
    !Number.isFinite(forHeight) ||
    forHeight <= 0
  ) {
    throw new GridMasonryError(
      "INVALID_ITEM",
      `HorizontalGridItem.resolvedFootprint.forHeight must be a positive finite number for item: ${item.id}. Received: ${String(forHeight)}`,
    );
  }
}
