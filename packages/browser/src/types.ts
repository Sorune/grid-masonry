import type {
  GridItemLayoutHint,
  HorizontalGridItemLayoutHint,
  HorizontalMasonryCell,
  HorizontalMasonryLayoutResult,
  HorizontalMasonryLayoutOptions,
  MasonryLayoutOptions,
  MasonryLayoutResult,
  ResolvedItemFootprint,
  ResolvedHorizontalItemFootprint,
  FlowRange,
  MasonryCell,
  VirtualizationOptions,
  VirtualizedCells,
} from "grid-masonry-core";

export type BrowserMasonryLayoutOptions = Omit<MasonryLayoutOptions, "containerWidth">;

export type BrowserMasonryItemUpdater<Item> = (
  element: HTMLElement,
  item: Item,
  index: number,
) => void;

export type BrowserMasonryNaturalContentSurfaceResolver<Item> = (
  element: HTMLElement,
  item: Item,
  index: number,
) => HTMLElement;

export interface BrowserMasonryItemLifecycleOptions<Item> {
  readonly updateItem: BrowserMasonryItemUpdater<Item>;
  readonly getNaturalContentSurface: BrowserMasonryNaturalContentSurfaceResolver<Item>;
}

export interface BrowserMasonryItemMeasurementOptions {
  readonly enabled: true;
}

export interface BrowserMasonryGridOptions<Item> extends BrowserMasonryLayoutOptions {
  readonly container: HTMLElement;
  readonly items: readonly Item[];
  readonly getId: (item: Item, index: number) => string;
  readonly getAspectRatio: (item: Item, index: number) => number;
  readonly getLayoutHint?: (
    item: Item,
    index: number,
  ) => GridItemLayoutHint | undefined;
  readonly getResolvedFootprint?: (
    item: Item,
    index: number,
  ) => ResolvedItemFootprint | undefined;
  readonly createItem: (item: Item, index: number) => HTMLElement;
  readonly itemLifecycle?: BrowserMasonryItemLifecycleOptions<Item>;
  readonly itemMeasurement?: BrowserMasonryItemMeasurementOptions;
  readonly onLayoutChange?: (layout: MasonryLayoutResult) => void;
}

export interface BrowserMasonryGridController<Item> {
  readonly update: (items: readonly Item[]) => void;
  readonly destroy: () => void;
}

export type BrowserHorizontalMasonryLayoutOptions = Omit<
  HorizontalMasonryLayoutOptions,
  "containerHeight"
>;

export type BrowserHorizontalItemUpdater<Item> = (
  element: HTMLElement,
  item: Item,
  index: number,
) => void;

export type BrowserHorizontalNaturalContentSurfaceResolver<Item> = (
  element: HTMLElement,
  item: Item,
  index: number,
) => HTMLElement;

export interface BrowserHorizontalItemLifecycleOptions<Item> {
  readonly updateItem: BrowserHorizontalItemUpdater<Item>;
  readonly getNaturalContentSurface: BrowserHorizontalNaturalContentSurfaceResolver<Item>;
}

export interface BrowserHorizontalItemMeasurementOptions {
  readonly enabled: true;
}

export interface BrowserHorizontalMasonryGridOptions<Item>
  extends BrowserHorizontalMasonryLayoutOptions {
  readonly container: HTMLElement;
  readonly items: readonly Item[];
  readonly getId: (item: Item, index: number) => string;
  readonly getAspectRatio: (item: Item, index: number) => number;
  readonly getLayoutHint?: (
    item: Item,
    index: number,
  ) => HorizontalGridItemLayoutHint | undefined;
  readonly getResolvedFootprint?: (
    item: Item,
    index: number,
  ) => ResolvedHorizontalItemFootprint | undefined;
  readonly createItem: (item: Item, index: number) => HTMLElement;
  readonly itemLifecycle?: BrowserHorizontalItemLifecycleOptions<Item>;
  readonly itemMeasurement?: BrowserHorizontalItemMeasurementOptions;
  readonly onLayoutChange?: (layout: HorizontalMasonryLayoutResult) => void;
}

export interface BrowserHorizontalMasonryGridController<Item> {
  readonly update: (items: readonly Item[]) => void;
  readonly destroy: () => void;
}

export type BrowserVirtualizedCell = MasonryCell | HorizontalMasonryCell;
export type BrowserVirtualizedLayout =
  | MasonryLayoutResult
  | HorizontalMasonryLayoutResult;

export interface BrowserVirtualizedMasonryGridOptions<Item>
  extends VirtualizationOptions {
  readonly container: HTMLElement;
  readonly items: readonly Item[];
  readonly layout: BrowserVirtualizedLayout;
  readonly flowRange: FlowRange;
  readonly createItem: (item: Item, index: number) => HTMLElement;
  readonly updateItem?: (element: HTMLElement, item: Item, index: number) => void;
  readonly destroyItem?: (element: HTMLElement, item: Item) => void;
  readonly applyCellStyle: (element: HTMLElement, cell: BrowserVirtualizedCell) => void;
}

export interface BrowserVirtualizedMasonryGridUpdate<Item> {
  readonly items: readonly Item[];
  readonly layout: BrowserVirtualizedLayout;
  readonly flowRange: FlowRange;
  readonly overscan?: number;
  /** False for layout-only reflow; true for host content updates. */
  readonly contentChanged?: boolean;
}

export interface BrowserVirtualizedMasonryGridController<Item> {
  readonly update: (update: BrowserVirtualizedMasonryGridUpdate<Item>) => void;
  readonly inspect: () => VirtualizedCells<BrowserVirtualizedCell>;
  readonly destroy: () => void;
}
