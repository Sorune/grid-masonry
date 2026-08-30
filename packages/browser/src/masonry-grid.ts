import {
  calculateMasonryLayout,
  type GridItem,
  type MasonryCell,
  type MasonryLayoutResult,
} from "grid-masonry-core";
import { applyMasonryCellStyle, applyMasonryContainerStyle } from "./styles.js";
import {
  areMeasuredHeightsEquivalent,
  readBorderBoxHeight,
} from "./measured-footprints.js";
import type {
  BrowserMasonryGridController,
  BrowserMasonryGridOptions,
  BrowserMasonryItemLifecycleOptions,
} from "./types.js";

function readContainerWidth(container: HTMLElement): number {
  return container.clientWidth;
}

function normalizeItems<Item>(
  items: readonly Item[],
  getId: BrowserMasonryGridOptions<Item>["getId"],
  getAspectRatio: BrowserMasonryGridOptions<Item>["getAspectRatio"],
  getLayoutHint: BrowserMasonryGridOptions<Item>["getLayoutHint"],
  getResolvedFootprint: BrowserMasonryGridOptions<Item>["getResolvedFootprint"],
): readonly GridItem[] {
  return items.map((item, index) => {
    const layoutHint = getLayoutHint?.(item, index);
    const resolvedFootprint = getResolvedFootprint?.(item, index);

    return {
      id: getId(item, index),
      aspectRatio: getAspectRatio(item, index),
      ...(layoutHint === undefined ? {} : { layoutHint }),
      ...(resolvedFootprint === undefined ? {} : { resolvedFootprint }),
    };
  });
}

function applyCellProjection(
  element: HTMLElement,
  cell: MasonryCell,
): void {
  applyMasonryCellStyle(element, cell);
  element.dataset.gridMasonryId = cell.id;
  element.dataset.gridMasonryColumn = String(cell.column);
}

function resolveNaturalSurface<Item>(
  element: HTMLElement,
  item: Item,
  index: number,
  lifecycle: BrowserMasonryItemLifecycleOptions<Item>,
  id: string,
): HTMLElement {
  const surface = lifecycle.getNaturalContentSurface(element, item, index);
  if (surface === null || surface === undefined || surface === element) {
    throw new Error(
      `getNaturalContentSurface must return a surface distinct from the positioning element for item ${id}.`,
    );
  }
  return surface;
}

function reconcileStableElements<Item>(
  container: HTMLElement,
  layout: MasonryLayoutResult,
  items: readonly Item[],
  createItem: BrowserMasonryGridOptions<Item>["createItem"],
  lifecycle: BrowserMasonryItemLifecycleOptions<Item>,
  elementsById: Map<string, HTMLElement>,
  surfacesById: Map<string, HTMLElement>,
  hostContentChanged: boolean,
  stableContainerInitialized: { value: boolean },
): void {
  const nextIds = new Set<string>();
  const nextElements: HTMLElement[] = [];

  for (const cell of layout.cells) {
    const item = items[cell.index];
    if (item === undefined) {
      throw new Error(`Masonry layout referenced missing item at index ${cell.index}.`);
    }

    const element = elementsById.get(cell.id);
    let stableElement = element;

    if (stableElement === undefined) {
      stableElement = createItem(item, cell.index);
      const surface = resolveNaturalSurface(
        stableElement,
        item,
        cell.index,
        lifecycle,
        cell.id,
      );
      elementsById.set(cell.id, stableElement);
      surfacesById.set(cell.id, surface);
    } else if (hostContentChanged) {
      lifecycle.updateItem(stableElement, item, cell.index);
      const surface = resolveNaturalSurface(
        stableElement,
        item,
        cell.index,
        lifecycle,
        cell.id,
      );
      surfacesById.set(cell.id, surface);
    }

    applyCellProjection(stableElement, cell);
    nextIds.add(cell.id);
    nextElements.push(stableElement);
  }

  for (const [id, element] of elementsById) {
    if (nextIds.has(id)) {
      continue;
    }

    if (element.parentNode === container) {
      container.removeChild(element);
    }
    elementsById.delete(id);
    surfacesById.delete(id);
  }

  if (!stableContainerInitialized.value) {
    container.replaceChildren();
    stableContainerInitialized.value = true;
  }

  for (const element of nextElements) {
    container.appendChild(element);
  }
}

export function createMasonryGrid<Item>(
  options: BrowserMasonryGridOptions<Item>,
): BrowserMasonryGridController<Item> {
  const {
    container,
    items: initialItems,
    getId,
    getAspectRatio,
    getLayoutHint,
    getResolvedFootprint,
    createItem,
    itemLifecycle,
    itemMeasurement,
    onLayoutChange,
    ...layoutOptions
  } = options;

  if (itemMeasurement?.enabled === true && itemLifecycle === undefined) {
    throw new Error(
      "itemMeasurement requires itemLifecycle so natural content can remain stable across relayouts.",
    );
  }

  let items = initialItems;
  let destroyed = false;
  let isRendering = false;
  let renderPending = false;
  let currentLayout: MasonryLayoutResult | null = null;
  const elementsById = new Map<string, HTMLElement>();
  const surfacesById = new Map<string, HTMLElement>();
  const measuredHeightsById = new Map<string, Map<number, number>>();
  const observedSurfacesById = new Map<string, HTMLElement>();
  const idsBySurface = new Map<HTMLElement, string>();
  const currentWidthsById = new Map<string, number>();
  const stableContainerInitialized = { value: false };

  const calculateLayout = (
    nextItems: readonly Item[],
    containerWidth: number,
  ): MasonryLayoutResult => {
    const normalized = normalizeItems(
      nextItems,
      getId,
      getAspectRatio,
      getLayoutHint,
      getResolvedFootprint,
    );
    const provisionalLayout = calculateMasonryLayout(normalized, {
      ...layoutOptions,
      containerWidth,
    });

    if (itemMeasurement?.enabled !== true) {
      return provisionalLayout;
    }

    const widthsById = new Map<string, number>();
    let hasCurrentMeasurement = false;
    for (const cell of provisionalLayout.cells) {
      widthsById.set(cell.id, cell.width);
      if (measuredHeightsById.get(cell.id)?.has(cell.width) === true) {
        hasCurrentMeasurement = true;
      }
    }

    if (!hasCurrentMeasurement) {
      return provisionalLayout;
    }

    const measuredNormalized = normalizeItems(
      nextItems,
      getId,
      getAspectRatio,
      getLayoutHint,
      (item, index) => {
        const id = getId(item, index);
        const width = widthsById.get(id);
        const height =
          width === undefined
            ? undefined
            : measuredHeightsById.get(id)?.get(width);

        if (width !== undefined && height !== undefined) {
          return { height, forWidth: width };
        }

        return getResolvedFootprint?.(item, index);
      },
    );

    return calculateMasonryLayout(measuredNormalized, {
      ...layoutOptions,
      containerWidth,
    });
  };

  const requestMeasurementRender = (): void => {
    if (destroyed) {
      return;
    }

    if (isRendering) {
      renderPending = true;
      return;
    }

    render();
  };

  const recordMeasurement = (
    id: string,
    width: number,
    height: number | undefined,
  ): void => {
    if (
      height === undefined ||
      !Number.isFinite(height) ||
      height <= 0
    ) {
      return;
    }

    const widths = measuredHeightsById.get(id);
    const previousHeight = widths?.get(width);
    if (
      previousHeight !== undefined &&
      areMeasuredHeightsEquivalent(previousHeight, height)
    ) {
      return;
    }

    const nextWidths = widths ?? new Map<number, number>();
    nextWidths.set(width, height);
    measuredHeightsById.set(id, nextWidths);
    requestMeasurementRender();
  };

  const syncMeasurementTargets = (): void => {
    if (itemMeasurement?.enabled !== true || itemLifecycle === undefined) {
      return;
    }

    const activeIds = new Set(currentLayout?.cells.map((cell) => cell.id) ?? []);
    for (const [id, surface] of observedSurfacesById) {
      if (activeIds.has(id) && surfacesById.get(id) === surface) {
        continue;
      }

      itemResizeObserver?.unobserve(surface);
      idsBySurface.delete(surface);
      observedSurfacesById.delete(id);
    }

    for (const cell of currentLayout?.cells ?? []) {
      const surface = surfacesById.get(cell.id);
      if (surface === undefined) {
        continue;
      }

      const previousSurface = observedSurfacesById.get(cell.id);
      if (previousSurface !== surface) {
        if (previousSurface !== undefined) {
          itemResizeObserver?.unobserve(previousSurface);
          idsBySurface.delete(previousSurface);
        }
        observedSurfacesById.set(cell.id, surface);
        idsBySurface.set(surface, cell.id);
        itemResizeObserver?.observe(surface);
      }

      const height = readBorderBoxHeight(
        { borderBoxSize: undefined },
        surface,
      );
      recordMeasurement(cell.id, cell.width, height);
    }
  };

  const pruneMeasurementState = (layout: MasonryLayoutResult): void => {
    const activeIds = new Set(layout.cells.map((cell) => cell.id));
    for (const id of measuredHeightsById.keys()) {
      if (!activeIds.has(id)) {
        measuredHeightsById.delete(id);
      }
    }
  };

  const invalidateHostMeasurements = (nextItems: readonly Item[]): void => {
    if (itemMeasurement?.enabled !== true) {
      return;
    }

    const nextIds = new Set(nextItems.map((item, index) => getId(item, index)));
    for (const id of elementsById.keys()) {
      if (nextIds.has(id)) {
        measuredHeightsById.delete(id);
      }
    }
  };

  let itemResizeObserver: ResizeObserver | null = null;

  const performRender = (
    nextItems: readonly Item[] = items,
    hostContentChanged = false,
  ): MasonryLayoutResult | null => {
    if (destroyed) return null;
    const containerWidth = readContainerWidth(container);
    if (containerWidth <= 0) {
      applyMasonryContainerStyle(container, null);
      items = nextItems;
      return null;
    }

    const layout = calculateLayout(nextItems, containerWidth);

    if (itemLifecycle === undefined) {
      const elements = layout.cells.map((cell) => {
        const item = nextItems[cell.index];
        if (item === undefined) {
          throw new Error(
            `Masonry layout referenced missing item at index ${cell.index}.`,
          );
        }
        const element = createItem(item, cell.index);
        applyCellProjection(element, cell);
        return element;
      });

      container.replaceChildren(...elements);
    } else {
      reconcileStableElements(
        container,
        layout,
        nextItems,
        createItem,
        itemLifecycle,
        elementsById,
        surfacesById,
        hostContentChanged,
        stableContainerInitialized,
      );
    }

    items = nextItems;
    currentLayout = layout;
    currentWidthsById.clear();
    for (const cell of layout.cells) {
      currentWidthsById.set(cell.id, cell.width);
    }
    applyMasonryContainerStyle(container, layout);
    onLayoutChange?.(layout);
    pruneMeasurementState(layout);
    syncMeasurementTargets();
    return layout;
  };

  const render = (
    nextItems: readonly Item[] = items,
    hostContentChanged = false,
  ): MasonryLayoutResult | null => {
    if (destroyed) {
      return null;
    }

    if (isRendering) {
      renderPending = true;
      return currentLayout;
    }

    isRendering = true;
    let layout: MasonryLayoutResult | null = null;
    let nextHostContentChanged = hostContentChanged;
    try {
      do {
        renderPending = false;
        layout = performRender(nextItems, nextHostContentChanged);
        nextHostContentChanged = false;
      } while (renderPending && !destroyed);
    } finally {
      isRendering = false;
    }

    return layout;
  };

  const measureAndRender = (): void => {
    render();
  };

  if (itemMeasurement?.enabled === true && typeof ResizeObserver !== "undefined") {
    itemResizeObserver = new ResizeObserver((entries) => {
      if (destroyed) {
        return;
      }

      for (const entry of entries) {
        const id = idsBySurface.get(entry.target as HTMLElement);
        if (id === undefined) {
          continue;
        }

        const width = currentWidthsById.get(id);
        if (width === undefined) {
          continue;
        }

        recordMeasurement(
          id,
          width,
          readBorderBoxHeight(entry, entry.target),
        );
      }
    });
  }

  const resizeObserver = typeof ResizeObserver === "undefined"
    ? null
    : new ResizeObserver(measureAndRender);
  resizeObserver?.observe(container);
  if (resizeObserver === null && typeof window !== "undefined") {
    window.addEventListener("resize", measureAndRender);
  }

  render();

  return {
    update(nextItems) {
      invalidateHostMeasurements(nextItems);
      render(nextItems, true);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      resizeObserver?.disconnect();
      if (resizeObserver === null && typeof window !== "undefined") {
        window.removeEventListener("resize", measureAndRender);
      }
      itemResizeObserver?.disconnect();
      elementsById.clear();
      surfacesById.clear();
      measuredHeightsById.clear();
      observedSurfacesById.clear();
      idsBySurface.clear();
      currentWidthsById.clear();
      currentLayout = null;
    },
  };
}
