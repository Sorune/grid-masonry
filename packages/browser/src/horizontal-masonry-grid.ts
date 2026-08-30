import {
  calculateHorizontalMasonryLayout,
  type HorizontalGridItem,
  type HorizontalMasonryCell,
  type HorizontalMasonryLayoutResult,
} from "grid-masonry-core";
import {
  applyHorizontalMasonryCellStyle,
  applyHorizontalMasonryContainerStyle,
} from "./horizontal-styles.js";
import {
  areMeasuredWidthsEquivalent,
  readBorderBoxWidth,
} from "./horizontal-measured-footprints.js";
import type {
  BrowserHorizontalItemLifecycleOptions,
  BrowserHorizontalMasonryGridController,
  BrowserHorizontalMasonryGridOptions,
} from "./types.js";

function readContainerHeight(container: HTMLElement): number {
  return container.clientHeight;
}

function normalizeItems<Item>(
  items: readonly Item[],
  getId: BrowserHorizontalMasonryGridOptions<Item>["getId"],
  getAspectRatio: BrowserHorizontalMasonryGridOptions<Item>["getAspectRatio"],
  getLayoutHint: BrowserHorizontalMasonryGridOptions<Item>["getLayoutHint"],
  getResolvedFootprint: BrowserHorizontalMasonryGridOptions<Item>["getResolvedFootprint"],
): readonly HorizontalGridItem[] {
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

function applyCellProjection(element: HTMLElement, cell: HorizontalMasonryCell): void {
  applyHorizontalMasonryCellStyle(element, cell);
  element.dataset.gridMasonryId = cell.id;
  element.dataset.gridMasonryRow = String(cell.row);
  element.dataset.gridMasonryRowSpan = String(cell.rowSpan);
}

function resolveNaturalSurface<Item>(
  element: HTMLElement,
  item: Item,
  index: number,
  lifecycle: BrowserHorizontalItemLifecycleOptions<Item>,
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
  layout: HorizontalMasonryLayoutResult,
  items: readonly Item[],
  createItem: BrowserHorizontalMasonryGridOptions<Item>["createItem"],
  lifecycle: BrowserHorizontalItemLifecycleOptions<Item>,
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
      throw new Error(`Horizontal masonry layout referenced missing item at index ${cell.index}.`);
    }
    let element = elementsById.get(cell.id);
    if (element === undefined) {
      element = createItem(item, cell.index);
      elementsById.set(cell.id, element);
      surfacesById.set(
        cell.id,
        resolveNaturalSurface(element, item, cell.index, lifecycle, cell.id),
      );
    } else if (hostContentChanged) {
      lifecycle.updateItem(element, item, cell.index);
      surfacesById.set(
        cell.id,
        resolveNaturalSurface(element, item, cell.index, lifecycle, cell.id),
      );
    }
    applyCellProjection(element, cell);
    nextIds.add(cell.id);
    nextElements.push(element);
  }

  for (const [id, element] of elementsById) {
    if (nextIds.has(id)) continue;
    if (element.parentNode === container) container.removeChild(element);
    elementsById.delete(id);
    surfacesById.delete(id);
  }

  if (!stableContainerInitialized.value) {
    container.replaceChildren();
    stableContainerInitialized.value = true;
  }
  for (const element of nextElements) container.appendChild(element);
}

export function createHorizontalMasonryGrid<Item>(
  options: BrowserHorizontalMasonryGridOptions<Item>,
): BrowserHorizontalMasonryGridController<Item> {
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
  let currentLayout: HorizontalMasonryLayoutResult | null = null;
  const elementsById = new Map<string, HTMLElement>();
  const surfacesById = new Map<string, HTMLElement>();
  const measuredWidthsById = new Map<string, Map<number, number>>();
  const observedSurfacesById = new Map<string, HTMLElement>();
  const idsBySurface = new Map<HTMLElement, string>();
  const currentHeightsById = new Map<string, number>();
  const stableContainerInitialized = { value: false };

  const calculateLayout = (
    nextItems: readonly Item[],
    containerHeight: number,
  ): HorizontalMasonryLayoutResult => {
    const normalized = normalizeItems(
      nextItems,
      getId,
      getAspectRatio,
      getLayoutHint,
      getResolvedFootprint,
    );
    const provisionalLayout = calculateHorizontalMasonryLayout(normalized, {
      ...layoutOptions,
      containerHeight,
    });
    if (itemMeasurement?.enabled !== true) return provisionalLayout;

    let hasCurrentMeasurement = false;
    for (const cell of provisionalLayout.cells) {
      if (measuredWidthsById.get(cell.id)?.has(cell.height) === true) {
        hasCurrentMeasurement = true;
      }
    }
    if (!hasCurrentMeasurement) return provisionalLayout;

    const measuredNormalized = normalizeItems(
      nextItems,
      getId,
      getAspectRatio,
      getLayoutHint,
      (item, index) => {
        const id = getId(item, index);
        const cell = provisionalLayout.cells.find((candidate) => candidate.id === id);
        const height = cell?.height;
        const width = height === undefined ? undefined : measuredWidthsById.get(id)?.get(height);
        if (height !== undefined && width !== undefined) return { width, forHeight: height };
        return getResolvedFootprint?.(item, index);
      },
    );
    return calculateHorizontalMasonryLayout(measuredNormalized, {
      ...layoutOptions,
      containerHeight,
    });
  };

  const requestMeasurementRender = (): void => {
    if (destroyed) return;
    if (isRendering) {
      renderPending = true;
      return;
    }
    render();
  };

  const recordMeasurement = (id: string, height: number, width: number | undefined): void => {
    if (width === undefined || !Number.isFinite(width) || width <= 0) return;
    const widths = measuredWidthsById.get(id);
    const previousWidth = widths?.get(height);
    if (previousWidth !== undefined && areMeasuredWidthsEquivalent(previousWidth, width)) return;
    const nextWidths = widths ?? new Map<number, number>();
    nextWidths.set(height, width);
    measuredWidthsById.set(id, nextWidths);
    requestMeasurementRender();
  };

  const syncMeasurementTargets = (): void => {
    if (itemMeasurement?.enabled !== true || itemLifecycle === undefined) return;
    const activeIds = new Set(currentLayout?.cells.map((cell) => cell.id) ?? []);
    for (const [id, surface] of observedSurfacesById) {
      if (activeIds.has(id) && surfacesById.get(id) === surface) continue;
      itemResizeObserver?.unobserve(surface);
      idsBySurface.delete(surface);
      observedSurfacesById.delete(id);
    }
    for (const cell of currentLayout?.cells ?? []) {
      const surface = surfacesById.get(cell.id);
      if (surface === undefined) continue;
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
      recordMeasurement(
        cell.id,
        cell.height,
        readBorderBoxWidth({ borderBoxSize: undefined }, surface),
      );
    }
  };

  const pruneMeasurementState = (layout: HorizontalMasonryLayoutResult): void => {
    const activeIds = new Set(layout.cells.map((cell) => cell.id));
    for (const id of measuredWidthsById.keys()) if (!activeIds.has(id)) measuredWidthsById.delete(id);
  };

  const invalidateHostMeasurements = (nextItems: readonly Item[]): void => {
    if (itemMeasurement?.enabled !== true) return;
    const nextIds = new Set(nextItems.map((item, index) => getId(item, index)));
    for (const id of elementsById.keys()) if (nextIds.has(id)) measuredWidthsById.delete(id);
  };

  let itemResizeObserver: ResizeObserver | null = null;

  const performRender = (
    nextItems: readonly Item[] = items,
    hostContentChanged = false,
  ): HorizontalMasonryLayoutResult | null => {
    if (destroyed) return null;
    const containerHeight = readContainerHeight(container);
    if (containerHeight <= 0) {
      applyHorizontalMasonryContainerStyle(container, null);
      items = nextItems;
      return null;
    }
    const layout = calculateLayout(nextItems, containerHeight);
    if (itemLifecycle === undefined) {
      const elements = layout.cells.map((cell) => {
        const item = nextItems[cell.index];
        if (item === undefined) throw new Error(`Missing item at index ${cell.index}.`);
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
    currentHeightsById.clear();
    for (const cell of layout.cells) currentHeightsById.set(cell.id, cell.height);
    applyHorizontalMasonryContainerStyle(container, layout);
    onLayoutChange?.(layout);
    pruneMeasurementState(layout);
    syncMeasurementTargets();
    return layout;
  };

  const render = (
    nextItems: readonly Item[] = items,
    hostContentChanged = false,
  ): HorizontalMasonryLayoutResult | null => {
    if (destroyed) return null;
    if (isRendering) {
      renderPending = true;
      return currentLayout;
    }
    isRendering = true;
    let layout: HorizontalMasonryLayoutResult | null = null;
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

  if (itemMeasurement?.enabled === true && typeof ResizeObserver !== "undefined") {
    itemResizeObserver = new ResizeObserver((entries) => {
      if (destroyed) return;
      for (const entry of entries) {
        const id = idsBySurface.get(entry.target as HTMLElement);
        if (id === undefined) continue;
        const height = currentHeightsById.get(id);
        if (height === undefined) continue;
        recordMeasurement(id, height, readBorderBoxWidth(entry, entry.target));
      }
    });
  }

  const resizeObserver = typeof ResizeObserver === "undefined"
    ? null
    : new ResizeObserver(() => render());
  resizeObserver?.observe(container);
  if (resizeObserver === null && typeof window !== "undefined") {
    window.addEventListener("resize", requestMeasurementRender);
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
        window.removeEventListener("resize", requestMeasurementRender);
      }
      itemResizeObserver?.disconnect();
      elementsById.clear();
      surfacesById.clear();
      measuredWidthsById.clear();
      observedSurfacesById.clear();
      idsBySurface.clear();
      currentHeightsById.clear();
      currentLayout = null;
    },
  };
}
