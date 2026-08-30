/** Platform-independent intrinsic media dimensions. */
export interface IntrinsicSize {
  readonly width: number;
  readonly height: number;
}

export type AspectOrientation = "portrait" | "square" | "landscape";

export interface ReducedAspectRatio {
  readonly width: number;
  readonly height: number;
}

export interface AspectRatioCalculationOptions {
  /** Absolute ratio distance from 1 that is still classified as square. Defaults to 0. */
  readonly squareTolerance?: number;
}

/**
 * Normalized ratio metadata derived from intrinsic width/height.
 * `value` is always width / height.
 */
export interface AspectRatioDescriptor {
  readonly value: number;
  readonly intrinsicWidth: number;
  readonly intrinsicHeight: number;
  readonly orientation: AspectOrientation;
  readonly reducedWidth?: number;
  readonly reducedHeight?: number;
}

export type AspectRatioQuery =
  | {
      readonly kind: "target";
      readonly target: number;
      /** Absolute ratio tolerance. Example: 4/3 ± 0.02. */
      readonly tolerance: number;
    }
  | {
      readonly kind: "range";
      readonly min: number;
      readonly max: number;
    }
  | {
      readonly kind: "orientation";
      readonly orientation: AspectOrientation;
      /** Absolute ratio distance from 1 classified as square. Defaults to 0. */
      readonly squareTolerance?: number;
    };

export interface AspectRatioMatch {
  readonly matches: boolean;
  readonly ratio: number;
  /** Absolute distance from a target query, when applicable. */
  readonly delta?: number;
  /** `delta / target`, when applicable. */
  readonly relativeDelta?: number;
}

export interface AspectRatioSearchResult<Item> {
  readonly item: Item;
  readonly index: number;
  readonly ratio: number;
  readonly match: AspectRatioMatch;
}

export interface AspectRatioPreset {
  readonly id: string;
  readonly ratio: number;
  /** Optional absolute tolerance used only to annotate nearest-preset results. */
  readonly tolerance?: number;
}

export interface AspectRatioPresetMatch {
  readonly preset: AspectRatioPreset;
  readonly ratio: number;
  readonly delta: number;
  readonly relativeDelta: number;
  readonly matchesTolerance?: boolean;
}

/**
 * Platform-independent item consumed by the masonry layout kernel.
 * aspectRatio is width / height.
 */
export interface ResolvedItemFootprint {
  /** Full placement height supplied for the corresponding item width. */
  readonly height: number;

  /** Item width at which height was declared or measured. */
  readonly forWidth: number;
}

/** Whole-item horizontal footprint measured at a specific physical height. */
export interface ResolvedHorizontalItemFootprint {
  /** Full placement width supplied for the corresponding item height. */
  readonly width: number;

  /** Item height at which width was declared or measured. */
  readonly forHeight: number;
}

export interface GridItemLayoutHint {
  /** Requested number of contiguous columns before responsive normalization. */
  readonly columnSpan?: number;
  /** Preferred starting column when otherwise equivalent windows are available. */
  readonly preferredColumn?: number;
  /** Hard starting column; normalized to the current column count. */
  readonly lockedColumn?: number;
}

export interface GridItem {
  readonly id: string;
  readonly aspectRatio: number;
  /** Optional width-bound whole-item footprint. */
  readonly resolvedFootprint?: ResolvedItemFootprint;
  /** Optional generic requested layout intent. */
  readonly layoutHint?: GridItemLayoutHint;
}

export interface HorizontalGridItemLayoutHint {
  /** Requested number of contiguous rows before horizontal normalization. */
  readonly rowSpan?: number;
  /** Preferred starting row when otherwise equivalent windows are available. */
  readonly preferredRow?: number;
  /** Hard starting row; normalized to the current row count. */
  readonly lockedRow?: number;
}

/** Platform-independent item consumed by the horizontal masonry kernel. */
export interface HorizontalGridItem {
  readonly id: string;
  readonly aspectRatio: number;
  /** Optional height-bound whole-item footprint. */
  readonly resolvedFootprint?: ResolvedHorizontalItemFootprint;
  /** Optional generic requested horizontal layout intent. */
  readonly layoutHint?: HorizontalGridItemLayoutHint;
}

/** Axis-neutral logical region occupied before normal item placement. */
export interface ReservedRegion {
  readonly laneStart: number;
  readonly laneSpan: number;
  readonly flowStart: number;
  readonly flowSize: number;
}

export type ColumnSizingMode = "fill" | "cap";
export type ColumnAlignment = "start" | "center" | "end";
export type RowSizingMode = "fill" | "cap";
export type RowAlignment = "start" | "center" | "end";
export type FlowDistribution =
  | "start"
  | "end"
  | "center"
  | "space-between"
  | "space-evenly";

export type FlowDirection = "forward" | "reverse";
export type CrossDirection = "forward" | "reverse";

export interface MasonryLayoutOptions {
  /** Container width in host-defined logical layout units. */
  readonly containerWidth: number;

  /** Shorthand used for both rowGap and columnGap when either is omitted. */
  readonly gap?: number;

  /** Horizontal gutter between columns. Overrides gap when supplied. */
  readonly columnGap?: number;

  /** Vertical gutter between cells within a column. Overrides gap when supplied. */
  readonly rowGap?: number;

  /** Minimum preferred width used to derive the baseline column count. */
  readonly minColumnWidth: number;

  /** Minimum number of columns. Defaults to 1. */
  readonly minColumns?: number;

  /** Maximum number of columns. Defaults to Number.MAX_SAFE_INTEGER. */
  readonly maxColumns?: number;

  /** Optional preferred/capped maximum width for a column. */
  readonly maxColumnWidth?: number;

  /**
   * `fill` fills the container and may add columns to approach maxColumnWidth.
   * `cap` keeps the baseline column count, caps column width, and permits slack.
   * Defaults to `fill` for compatibility with the V1 algorithm.
   */
  readonly columnSizing?: ColumnSizingMode;

  /** Alignment used for horizontal slack in `cap` mode. Defaults to `start`. */
  readonly columnAlignment?: ColumnAlignment;

  /** Distribution of bounded slack along the layout flow axis. Defaults to `start`. */
  readonly flowDistribution?: FlowDistribution;

  /** Physical flow direction. Defaults to `forward`. */
  readonly flowDirection?: FlowDirection;

  /** Logical cross-axis projection direction. Defaults to `forward`. */
  readonly crossDirection?: CrossDirection;

  /** Logical occupied regions reserved before item placement. */
  readonly reservedRegions?: readonly ReservedRegion[];

  /** Optional absolute tolerance for near-equal logical flow candidates. Defaults to 0. */
  readonly flowTolerance?: number;
}

export interface MasonryCell {
  readonly id: string;
  readonly index: number;
  readonly column: number;
  /** Effective number of contiguous columns occupied by the cell. */
  readonly columnSpan: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly aspectRatio: number;
}

export interface MasonryLayoutResult {
  readonly coordinateSpace: "container-relative-logical";
  readonly containerWidth: number;
  readonly containerHeight: number;
  readonly contentWidth: number;
  readonly contentOffsetX: number;
  readonly columnCount: number;
  readonly columnWidth: number;
  readonly columnGap: number;
  readonly rowGap: number;
  readonly columnSizing: ColumnSizingMode;
  readonly columnAlignment: ColumnAlignment;
  readonly cells: readonly MasonryCell[];
}

export interface HorizontalMasonryCell {
  readonly id: string;
  readonly index: number;
  readonly row: number;
  /** Effective number of contiguous rows occupied by the cell. */
  readonly rowSpan: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly aspectRatio: number;
}

export interface HorizontalMasonryLayoutOptions {
  /** Fixed physical height used to derive the baseline row count. */
  readonly containerHeight: number;

  /** Shorthand used for both physical rowGap and columnGap. */
  readonly gap?: number;

  /** Vertical gutter between rows. */
  readonly rowGap?: number;

  /** Horizontal gutter between cells along the flow axis. */
  readonly columnGap?: number;

  /** Minimum preferred height used to derive the baseline row count. */
  readonly minRowHeight: number;

  /** Minimum number of rows. Defaults to 1. */
  readonly minRows?: number;

  /** Maximum number of rows. Defaults to Number.MAX_SAFE_INTEGER. */
  readonly maxRows?: number;

  /** Optional preferred/capped maximum height for a row. */
  readonly maxRowHeight?: number;

  /** Row sizing mode. Defaults to `fill`. */
  readonly rowSizing?: RowSizingMode;

  /** Alignment used for cross-axis slack in `cap` mode. Defaults to `start`. */
  readonly rowAlignment?: RowAlignment;

  /** Distribution of bounded slack along horizontal flow. Defaults to `start`. */
  readonly flowDistribution?: FlowDistribution;

  /** Physical horizontal flow direction. Defaults to `forward` (left-to-right). */
  readonly flowDirection?: FlowDirection;

  /** Logical cross-axis projection direction. Defaults to `forward`. */
  readonly crossDirection?: CrossDirection;

  /** Logical occupied regions reserved before item placement. */
  readonly reservedRegions?: readonly ReservedRegion[];

  /** Optional absolute tolerance for near-equal logical flow candidates. Defaults to 0. */
  readonly flowTolerance?: number;
}

export interface HorizontalMasonryLayoutResult {
  readonly coordinateSpace: "container-relative-logical";
  /** Horizontal flow extent produced by the layout. */
  readonly containerWidth: number;
  /** Fixed cross-axis constraint supplied by the caller. */
  readonly containerHeight: number;
  /** Horizontal content extent produced by the layout. */
  readonly contentWidth: number;
  readonly contentHeight: number;
  readonly contentOffsetY: number;
  readonly rowCount: number;
  readonly rowHeight: number;
  readonly rowGap: number;
  readonly columnGap: number;
  readonly rowSizing: RowSizingMode;
  readonly rowAlignment: RowAlignment;
  readonly cells: readonly HorizontalMasonryCell[];
}

export type LayoutDiagnosticAxis = "vertical" | "horizontal";

export type FootprintDiagnosticStatus = "none" | "used" | "stale";

export interface LayoutItemDiagnostics {
  readonly id: string;
  readonly index: number;
  readonly requestedLaneSpan: number;
  readonly resolvedLaneSpan: number;
  readonly requestedPreferredLane?: number;
  readonly normalizedPreferredLane?: number;
  readonly preferredLaneHonored?: boolean;
  readonly requestedLockedLane?: number;
  readonly normalizedLockedLane?: number;
  readonly resolvedLaneStart: number;
  readonly footprintStatus: FootprintDiagnosticStatus;
  readonly crossSize: number;
  readonly flowSize: number;
  readonly frontierFlowOffset: number;
  readonly reservedAdjustedFlowOffset: number;
  readonly reservedFlowShift: number;
  readonly distributedFlowOffset: number;
  readonly distributionFlowShift: number;
}

export interface LayoutDiagnostics {
  readonly axis: LayoutDiagnosticAxis;
  readonly itemCount: number;
  readonly laneCount: number;
  readonly reservedRegionCount: number;
  readonly logicalFlowExtent: number;
  readonly items: readonly LayoutItemDiagnostics[];
}

export interface LayoutWithDiagnostics<Layout> {
  readonly layout: Layout;
  readonly diagnostics: LayoutDiagnostics;
}

export interface LayoutDisplacementMetrics {
  readonly totalDisplacement: number;
  readonly maximumDisplacement: number;
  readonly movedCount: number;
}

export interface ResolvedMasonryLayoutOptions {
  readonly containerWidth: number;
  readonly columnGap: number;
  readonly rowGap: number;
  readonly minColumnWidth: number;
  readonly minColumns: number;
  readonly maxColumns: number;
  readonly maxColumnWidth?: number;
  readonly columnSizing: ColumnSizingMode;
  readonly columnAlignment: ColumnAlignment;
  readonly flowDistribution: FlowDistribution;
  readonly flowDirection: FlowDirection;
  readonly crossDirection: CrossDirection;
  readonly reservedRegions: readonly ReservedRegion[];
  readonly flowTolerance: number;
}

export interface ResolvedHorizontalMasonryLayoutOptions {
  readonly containerHeight: number;
  readonly rowGap: number;
  readonly columnGap: number;
  readonly minRowHeight: number;
  readonly minRows: number;
  readonly maxRows: number;
  readonly maxRowHeight?: number;
  readonly rowSizing: RowSizingMode;
  readonly rowAlignment: RowAlignment;
  readonly flowDistribution: FlowDistribution;
  readonly flowDirection: FlowDirection;
  readonly crossDirection: CrossDirection;
  readonly reservedRegions: readonly ReservedRegion[];
  readonly flowTolerance: number;
}

export interface VerticalRange {
  readonly top: number;
  readonly bottom: number;
}

/** Axis-neutral range along the layout flow coordinate. */
export interface FlowRange {
  readonly start: number;
  readonly end: number;
}
