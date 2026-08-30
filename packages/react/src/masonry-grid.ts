import { createElement, useEffect } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import type { MasonryLayoutResult } from "grid-masonry-core";
import {
  createMasonryCellStyle,
  createMasonryContainerStyle,
} from "./styles.js";
import { useContainerWidth } from "./use-container-width.js";
import { useMeasuredFootprints } from "./use-measured-footprints.js";
import { useMasonryLayout } from "./use-masonry-layout.js";
import type {
  MasonryGridProps,
  MasonryItemClassName,
  MasonryItemRenderContext,
  MasonryItemStyle,
} from "./types.js";

function resolveItemClassName<Item>(
  value: MasonryItemClassName<Item> | undefined,
  context: MasonryItemRenderContext<Item>,
): string | undefined {
  if (typeof value === "function") {
    return value(context);
  }

  return value;
}

function resolveItemStyle<Item>(
  value: MasonryItemStyle<Item> | undefined,
  context: MasonryItemRenderContext<Item>,
): CSSProperties | undefined {
  if (typeof value === "function") {
    return value(context);
  }

  return value;
}

function createLayoutOptions<Item>(
  props: MasonryGridProps<Item>,
  containerWidth: number,
  getResolvedFootprint = props.getResolvedFootprint,
) {
  return {
    items: props.items,
    containerWidth,
    getId: props.getId,
    getAspectRatio: props.getAspectRatio,
    minColumnWidth: props.minColumnWidth,
    ...(props.getLayoutHint === undefined
      ? {}
      : { getLayoutHint: props.getLayoutHint }),
    ...(getResolvedFootprint === undefined ? {} : { getResolvedFootprint }),
    ...(props.gap === undefined ? {} : { gap: props.gap }),
    ...(props.columnGap === undefined ? {} : { columnGap: props.columnGap }),
    ...(props.rowGap === undefined ? {} : { rowGap: props.rowGap }),
    ...(props.minColumns === undefined
      ? {}
      : { minColumns: props.minColumns }),
    ...(props.maxColumns === undefined
      ? {}
      : { maxColumns: props.maxColumns }),
    ...(props.maxColumnWidth === undefined
      ? {}
      : { maxColumnWidth: props.maxColumnWidth }),
    ...(props.columnSizing === undefined
      ? {}
      : { columnSizing: props.columnSizing }),
    ...(props.columnAlignment === undefined
      ? {}
      : { columnAlignment: props.columnAlignment }),
    ...(props.flowDistribution === undefined
      ? {}
      : { flowDistribution: props.flowDistribution }),
  };
}

interface RenderCellsOptions<Item> {
  readonly layout: MasonryLayoutResult | null;
  readonly items: readonly Item[];
  readonly renderItem: MasonryGridProps<Item>["renderItem"];
  readonly itemClassName: MasonryGridProps<Item>["itemClassName"];
  readonly itemStyle: MasonryGridProps<Item>["itemStyle"];
  readonly getNaturalContentRef?: (
    id: string,
  ) => (element: HTMLElement | null) => void;
}

const naturalContentStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
};

function renderCells<Item>(options: RenderCellsOptions<Item>): ReactNode[] {
  const {
    layout,
    items,
    renderItem,
    itemClassName,
    itemStyle,
    getNaturalContentRef,
  } = options;

  if (layout === null) {
    return [];
  }

  return layout.cells.map((cell) => {
    const item = items[cell.index];

    if (item === undefined) {
      throw new Error(
        `Masonry layout referenced missing item at index ${cell.index}.`,
      );
    }

    const context: MasonryItemRenderContext<Item> = {
      item,
      id: cell.id,
      index: cell.index,
      cell,
    };
    const content = renderItem(context);
    const renderedContent =
      getNaturalContentRef === undefined
        ? content
        : createElement(
            "div",
            {
              ref: getNaturalContentRef(cell.id),
              style: naturalContentStyle,
              "data-grid-masonry-natural-content": "",
            },
            content,
          );

    return createElement(
      "div",
      {
        key: cell.id,
        className: resolveItemClassName(itemClassName, context),
        style: createMasonryCellStyle(
          cell,
          resolveItemStyle(itemStyle, context),
        ),
        "data-grid-masonry-item": "",
        "data-grid-masonry-id": cell.id,
        "data-grid-masonry-column": String(cell.column),
      },
      renderedContent,
    );
  });
}

interface GridContentProps<Item> {
  readonly props: MasonryGridProps<Item>;
  readonly containerRef: (element: HTMLDivElement | null) => void;
  readonly width: number;
}

function reportLayout(
  layout: MasonryLayoutResult | null,
  onLayoutChange: MasonryGridProps<unknown>["onLayoutChange"],
): void {
  if (layout !== null) {
    onLayoutChange?.(layout);
  }
}

function createGridRoot<Item>(
  props: MasonryGridProps<Item>,
  layout: MasonryLayoutResult | null,
  containerRef: (element: HTMLDivElement | null) => void,
  children: readonly ReactNode[],
): ReactElement {
  return createElement(
    "div",
    {
      ref: containerRef,
      className: props.className,
      style: createMasonryContainerStyle(layout, props.style),
      "data-grid-masonry-root": "",
      "data-grid-masonry-columns": String(layout?.columnCount ?? 0),
    },
    ...children,
  );
}

function SimpleMasonryGridContent<Item>(
  options: GridContentProps<Item>,
): ReactElement {
  const { props, containerRef, width } = options;
  const layout = useMasonryLayout(createLayoutOptions(props, width));

  useEffect(() => {
    reportLayout(layout, props.onLayoutChange);
  }, [layout, props.onLayoutChange]);

  return createGridRoot(
    props,
    layout,
    containerRef,
    renderCells({
      layout,
      items: props.items,
      renderItem: props.renderItem,
      itemClassName: props.itemClassName,
      itemStyle: props.itemStyle,
    }),
  );
}

function MeasuredMasonryGridContent<Item>(
  options: GridContentProps<Item>,
): ReactElement {
  const { props, containerRef, width } = options;
  const provisionalLayout = useMasonryLayout(
    createLayoutOptions(props, width),
  );
  const measurement = useMeasuredFootprints(
    props.getResolvedFootprint === undefined
      ? {
          items: props.items,
          getId: props.getId,
          layout: provisionalLayout,
        }
      : {
          items: props.items,
          getId: props.getId,
          getResolvedFootprint: props.getResolvedFootprint,
          layout: provisionalLayout,
        },
  );
  const layout = useMasonryLayout(
    createLayoutOptions(props, width, measurement.getResolvedFootprint),
  );

  useEffect(() => {
    reportLayout(layout, props.onLayoutChange);
  }, [layout, props.onLayoutChange]);

  return createGridRoot(
    props,
    layout,
    containerRef,
    renderCells({
      layout,
      items: props.items,
      renderItem: props.renderItem,
      itemClassName: props.itemClassName,
      itemStyle: props.itemStyle,
      getNaturalContentRef: measurement.getNaturalContentRef,
    }),
  );
}

/**
 * Thin React DOM renderer over grid-masonry-core.
 *
 * The component never inspects images or host DTO fields. Host applications
 * explicitly provide id/aspect-ratio/layout-input resolvers, keeping their
 * domain model outside the library boundary.
 */
export function MasonryGrid<Item>(props: MasonryGridProps<Item>): ReactElement {
  const { ref, width } = useContainerWidth<HTMLDivElement>({
    ...(props.initialWidth === undefined
      ? {}
      : { initialWidth: props.initialWidth }),
  });

  useEffect(() => {
    props.onWidthChange?.(width);
  }, [width, props.onWidthChange]);

  const contentProps = { props, containerRef: ref, width };
  return props.itemMeasurement?.enabled === true
    ? createElement(MeasuredMasonryGridContent, contentProps)
    : createElement(SimpleMasonryGridContent, contentProps);
}
