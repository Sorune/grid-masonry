import type { CSSProperties, ReactNode } from "react";
import type {
  GridItemLayoutHint,
  MasonryCell,
  MasonryLayoutOptions,
  MasonryLayoutResult,
  ResolvedItemFootprint,
  HorizontalGridItemLayoutHint,
  HorizontalMasonryCell,
  HorizontalMasonryLayoutOptions,
  HorizontalMasonryLayoutResult,
  ResolvedHorizontalItemFootprint,
  FlowRange,
  VirtualizedCells,
} from "grid-masonry-core";
import type { OrderId } from "grid-masonry-core";

export type ReactMasonryLayoutOptions = Omit<
  MasonryLayoutOptions,
  "containerWidth"
>;

export type GridItemIdResolver<Item> = (
  item: Item,
  index: number,
) => string;

export type GridItemAspectRatioResolver<Item> = (
  item: Item,
  index: number,
) => number;

export type GridItemLayoutHintResolver<Item> = (
  item: Item,
  index: number,
) => GridItemLayoutHint | undefined;

export type GridItemResolvedFootprintResolver<Item> = (
  item: Item,
  index: number,
) => ResolvedItemFootprint | undefined;

export interface UseContainerWidthOptions {
  /** Width used before the first DOM measurement. Useful for SSR or tests. */
  readonly initialWidth?: number;
}

export type ReactHorizontalMasonryLayoutOptions = Omit<
  HorizontalMasonryLayoutOptions,
  "containerHeight"
>;

export type HorizontalGridItemLayoutHintResolver<Item> = (
  item: Item,
  index: number,
) => HorizontalGridItemLayoutHint | undefined;

export type HorizontalGridItemResolvedFootprintResolver<Item> = (
  item: Item,
  index: number,
) => ResolvedHorizontalItemFootprint | undefined;

export interface UseContainerHeightOptions {
  /** Height used before the first DOM measurement. Useful for SSR or tests. */
  readonly initialHeight?: number;
}

export interface UseOrderListOptions<Item> {
  readonly items: readonly Item[];
  readonly getId: GridItemIdResolver<Item>;
  /** Controlled canonical ID order. */
  readonly order?: readonly OrderId[];
  /** Initial order for uncontrolled mode. */
  readonly initialOrder?: readonly OrderId[];
  readonly onOrderChange?: (order: readonly OrderId[]) => void;
}

export interface UseOrderListResult<Item> {
  readonly order: readonly OrderId[];
  readonly orderedItems: readonly Item[];
  readonly move: (id: OrderId, toIndex: number) => void;
  readonly moveBefore: (id: OrderId, targetId: OrderId) => void;
  readonly moveAfter: (id: OrderId, targetId: OrderId) => void;
  readonly setOrder: (order: readonly OrderId[]) => void;
  readonly reset: () => void;
  readonly reconcile: () => void;
}

export interface UseVirtualizedMasonryCellsOptions {
  readonly layout: MasonryLayoutResult | HorizontalMasonryLayoutResult;
  readonly flowRange: FlowRange;
  readonly overscan?: number;
}

export type UseVirtualizedMasonryCellsResult = VirtualizedCells<
  MasonryLayoutResult["cells"][number] | HorizontalMasonryLayoutResult["cells"][number]
>;

export interface ContainerHeightState<Element extends HTMLElement> {
  /** Callback ref that must be attached to the layout container. */
  readonly ref: (element: Element | null) => void;
  /** Current content layout height in CSS logical pixels. */
  readonly height: number;
  /** True after a real DOM element height has been read at least once. */
  readonly measured: boolean;
}

export interface ContainerWidthState<Element extends HTMLElement> {
  /** Callback ref that must be attached to the layout container. */
  readonly ref: (element: Element | null) => void;
  /** Current content layout width in CSS logical pixels. */
  readonly width: number;
  /** True after a real DOM element width has been read at least once. */
  readonly measured: boolean;
}

/** Enables adapter-owned measurement of the natural whole-item surface. */
export interface MasonryItemMeasurementOptions {
  readonly enabled: true;
}

export interface UseMasonryLayoutOptions<Item>
  extends ReactMasonryLayoutOptions {
  readonly items: readonly Item[];
  readonly containerWidth: number;
  readonly getId: GridItemIdResolver<Item>;
  readonly getAspectRatio: GridItemAspectRatioResolver<Item>;
  readonly getLayoutHint?: GridItemLayoutHintResolver<Item>;
  readonly getResolvedFootprint?: GridItemResolvedFootprintResolver<Item>;
}

export interface MasonryItemRenderContext<Item> {
  readonly item: Item;
  readonly id: string;
  readonly index: number;
  readonly cell: MasonryCell;
}

export type MasonryItemClassName<Item> =
  | string
  | ((context: MasonryItemRenderContext<Item>) => string | undefined);

export type MasonryItemStyle<Item> =
  | CSSProperties
  | ((context: MasonryItemRenderContext<Item>) => CSSProperties | undefined);

export interface MasonryGridProps<Item> extends ReactMasonryLayoutOptions {
  readonly items: readonly Item[];
  readonly getId: GridItemIdResolver<Item>;
  readonly getAspectRatio: GridItemAspectRatioResolver<Item>;
  readonly getLayoutHint?: GridItemLayoutHintResolver<Item>;
  readonly getResolvedFootprint?: GridItemResolvedFootprintResolver<Item>;
  readonly itemMeasurement?: MasonryItemMeasurementOptions;
  readonly renderItem: (context: MasonryItemRenderContext<Item>) => ReactNode;

  /** Optional width used until ResizeObserver/clientWidth measures the container. */
  readonly initialWidth?: number;

  readonly className?: string;
  readonly style?: CSSProperties;
  readonly itemClassName?: MasonryItemClassName<Item>;
  readonly itemStyle?: MasonryItemStyle<Item>;

  /** Called whenever a new non-null layout result is produced. */
  readonly onLayoutChange?: (layout: MasonryLayoutResult) => void;

  /** Called whenever the measured container width changes. */
  readonly onWidthChange?: (width: number) => void;
}

export interface UseHorizontalMasonryLayoutOptions<Item>
  extends ReactHorizontalMasonryLayoutOptions {
  readonly items: readonly Item[];
  readonly containerHeight: number;
  readonly getId: GridItemIdResolver<Item>;
  readonly getAspectRatio: GridItemAspectRatioResolver<Item>;
  readonly getLayoutHint?: HorizontalGridItemLayoutHintResolver<Item>;
  readonly getResolvedFootprint?: HorizontalGridItemResolvedFootprintResolver<Item>;
}

export interface HorizontalMasonryItemRenderContext<Item> {
  readonly item: Item;
  readonly id: string;
  readonly index: number;
  readonly cell: HorizontalMasonryCell;
}

export type HorizontalMasonryItemClassName<Item> =
  | string
  | ((context: HorizontalMasonryItemRenderContext<Item>) => string | undefined);

export type HorizontalMasonryItemStyle<Item> =
  | CSSProperties
  | ((context: HorizontalMasonryItemRenderContext<Item>) => CSSProperties | undefined);

export interface HorizontalMasonryGridProps<Item>
  extends ReactHorizontalMasonryLayoutOptions {
  readonly items: readonly Item[];
  readonly getId: GridItemIdResolver<Item>;
  readonly getAspectRatio: GridItemAspectRatioResolver<Item>;
  readonly getLayoutHint?: HorizontalGridItemLayoutHintResolver<Item>;
  readonly getResolvedFootprint?: HorizontalGridItemResolvedFootprintResolver<Item>;
  readonly itemMeasurement?: MasonryItemMeasurementOptions;
  readonly renderItem: (
    context: HorizontalMasonryItemRenderContext<Item>,
  ) => ReactNode;

  /** Optional height used until ResizeObserver/clientHeight measures the container. */
  readonly initialHeight?: number;

  readonly className?: string;
  readonly style?: CSSProperties;
  readonly itemClassName?: HorizontalMasonryItemClassName<Item>;
  readonly itemStyle?: HorizontalMasonryItemStyle<Item>;
  readonly onLayoutChange?: (
    layout: HorizontalMasonryLayoutResult,
  ) => void;
  readonly onHeightChange?: (height: number) => void;
}
