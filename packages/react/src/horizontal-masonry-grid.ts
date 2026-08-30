import { createElement, useEffect } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import type { HorizontalMasonryLayoutResult } from "grid-masonry-core";
import {
  createHorizontalMasonryCellStyle,
  createHorizontalMasonryContainerStyle,
  horizontalNaturalContentStyle,
} from "./horizontal-styles.js";
import { useContainerHeight } from "./use-container-height.js";
import { useHorizontalMasonryLayout } from "./use-horizontal-masonry-layout.js";
import { useHorizontalMeasuredFootprints } from "./use-horizontal-measured-footprints.js";
import type {
  HorizontalMasonryGridProps,
  HorizontalMasonryItemClassName,
  HorizontalMasonryItemRenderContext,
  HorizontalMasonryItemStyle,
} from "./types.js";

function resolveClassName<Item>(
  value: HorizontalMasonryItemClassName<Item> | undefined,
  context: HorizontalMasonryItemRenderContext<Item>,
): string | undefined {
  return typeof value === "function" ? value(context) : value;
}

function resolveStyle<Item>(
  value: HorizontalMasonryItemStyle<Item> | undefined,
  context: HorizontalMasonryItemRenderContext<Item>,
): CSSProperties | undefined {
  return typeof value === "function" ? value(context) : value;
}

function createLayoutOptions<Item>(
  props: HorizontalMasonryGridProps<Item>,
  containerHeight: number,
  getResolvedFootprint = props.getResolvedFootprint,
) {
  return {
    items: props.items,
    containerHeight,
    minRowHeight: props.minRowHeight,
    getId: props.getId,
    getAspectRatio: props.getAspectRatio,
    ...(props.getLayoutHint === undefined ? {} : { getLayoutHint: props.getLayoutHint }),
    ...(getResolvedFootprint === undefined ? {} : { getResolvedFootprint }),
    ...(props.gap === undefined ? {} : { gap: props.gap }),
    ...(props.rowGap === undefined ? {} : { rowGap: props.rowGap }),
    ...(props.columnGap === undefined ? {} : { columnGap: props.columnGap }),
    ...(props.minRows === undefined ? {} : { minRows: props.minRows }),
    ...(props.maxRows === undefined ? {} : { maxRows: props.maxRows }),
    ...(props.maxRowHeight === undefined ? {} : { maxRowHeight: props.maxRowHeight }),
    ...(props.rowSizing === undefined ? {} : { rowSizing: props.rowSizing }),
    ...(props.rowAlignment === undefined ? {} : { rowAlignment: props.rowAlignment }),
    ...(props.flowDistribution === undefined ? {} : { flowDistribution: props.flowDistribution }),
  };
}

function renderCells<Item>(
  layout: HorizontalMasonryLayoutResult | null,
  props: HorizontalMasonryGridProps<Item>,
  getNaturalContentRef?: (id: string) => (element: HTMLElement | null) => void,
): ReactNode[] {
  if (layout === null) return [];
  return layout.cells.map((cell) => {
    const item = props.items[cell.index];
    if (item === undefined) {
      throw new Error(`Horizontal masonry layout referenced missing item at index ${cell.index}.`);
    }
    const context: HorizontalMasonryItemRenderContext<Item> = {
      item,
      id: cell.id,
      index: cell.index,
      cell,
    };
    const content = props.renderItem(context);
    const renderedContent = getNaturalContentRef === undefined
      ? content
      : createElement(
          "div",
          {
            ref: getNaturalContentRef(cell.id),
            style: horizontalNaturalContentStyle,
            "data-grid-masonry-natural-content": "",
          },
          content,
        );

    return createElement(
      "div",
      {
        key: cell.id,
        className: resolveClassName(props.itemClassName, context),
        style: createHorizontalMasonryCellStyle(
          cell,
          resolveStyle(props.itemStyle, context),
        ),
        "data-grid-masonry-item": "",
        "data-grid-masonry-id": cell.id,
        "data-grid-masonry-row": String(cell.row),
        "data-grid-masonry-row-span": String(cell.rowSpan),
      },
      renderedContent,
    );
  });
}

function createRoot<Item>(
  props: HorizontalMasonryGridProps<Item>,
  layout: HorizontalMasonryLayoutResult | null,
  containerRef: (element: HTMLDivElement | null) => void,
  children: readonly ReactNode[],
): ReactElement {
  return createElement(
    "div",
    {
      ref: containerRef,
      className: props.className,
      style: createHorizontalMasonryContainerStyle(layout, props.style),
      "data-grid-masonry-root": "",
      "data-grid-masonry-rows": String(layout?.rowCount ?? 0),
      "data-grid-masonry-content-width": String(layout?.contentWidth ?? 0),
    },
    ...children,
  );
}

function reportLayout(
  layout: HorizontalMasonryLayoutResult | null,
  callback: HorizontalMasonryGridProps<unknown>["onLayoutChange"],
): void {
  if (layout !== null) callback?.(layout);
}

function SimpleHorizontalContent<Item>(options: {
  readonly props: HorizontalMasonryGridProps<Item>;
  readonly containerRef: (element: HTMLDivElement | null) => void;
  readonly height: number;
}): ReactElement {
  const { props, containerRef, height } = options;
  const layout = useHorizontalMasonryLayout(createLayoutOptions(props, height));
  useEffect(() => reportLayout(layout, props.onLayoutChange), [layout, props.onLayoutChange]);
  return createRoot(props, layout, containerRef, renderCells(layout, props));
}

function MeasuredHorizontalContent<Item>(options: {
  readonly props: HorizontalMasonryGridProps<Item>;
  readonly containerRef: (element: HTMLDivElement | null) => void;
  readonly height: number;
}): ReactElement {
  const { props, containerRef, height } = options;
  const provisionalLayout = useHorizontalMasonryLayout(createLayoutOptions(props, height));
  const measurement = useHorizontalMeasuredFootprints(
    props.getResolvedFootprint === undefined
      ? { items: props.items, getId: props.getId, layout: provisionalLayout }
      : {
          items: props.items,
          getId: props.getId,
          getResolvedFootprint: props.getResolvedFootprint,
          layout: provisionalLayout,
        },
  );
  const layout = useHorizontalMasonryLayout(
    createLayoutOptions(props, height, measurement.getResolvedFootprint),
  );
  useEffect(() => reportLayout(layout, props.onLayoutChange), [layout, props.onLayoutChange]);
  return createRoot(
    props,
    layout,
    containerRef,
    renderCells(layout, props, measurement.getNaturalContentRef),
  );
}

/** Additive React DOM adapter for Core's left-to-right horizontal layout. */
export function HorizontalMasonryGrid<Item>(
  props: HorizontalMasonryGridProps<Item>,
): ReactElement {
  const { ref, height } = useContainerHeight<HTMLDivElement>({
    ...(props.initialHeight === undefined ? {} : { initialHeight: props.initialHeight }),
  });

  useEffect(() => {
    props.onHeightChange?.(height);
  }, [height, props.onHeightChange]);

  const contentProps = { props, containerRef: ref, height };
  return props.itemMeasurement?.enabled === true
    ? createElement(MeasuredHorizontalContent, contentProps)
    : createElement(SimpleHorizontalContent, contentProps);
}
