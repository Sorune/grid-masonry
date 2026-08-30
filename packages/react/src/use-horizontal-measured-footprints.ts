import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  HorizontalGridItemResolvedFootprintResolver,
  GridItemIdResolver,
} from "./types.js";
import type {
  HorizontalMasonryLayoutResult,
  ResolvedHorizontalItemFootprint,
} from "grid-masonry-core";

export const MEASURED_WIDTH_EPSILON = 1e-4;

interface ResizeObserverEntryLike {
  readonly borderBoxSize?: unknown;
}

function isPositiveFinite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function areMeasuredWidthsEquivalent(
  previousWidth: number,
  nextWidth: number,
): boolean {
  return Math.abs(previousWidth - nextWidth) <= MEASURED_WIDTH_EPSILON;
}

export function readBorderBoxWidth(
  entry: ResizeObserverEntryLike,
  target: Element,
): number | undefined {
  const borderBoxSize = entry.borderBoxSize;
  let measuredWidth: unknown;
  let hasBorderBoxMeasurement = false;

  if (Array.isArray(borderBoxSize)) {
    const first = borderBoxSize[0];
    hasBorderBoxMeasurement = first !== undefined;
    measuredWidth = first?.inlineSize;
  } else if (
    borderBoxSize !== null &&
    typeof borderBoxSize === "object" &&
    "inlineSize" in borderBoxSize
  ) {
    hasBorderBoxMeasurement = true;
    measuredWidth = (borderBoxSize as { readonly inlineSize?: unknown }).inlineSize;
  } else if (borderBoxSize !== null && typeof borderBoxSize === "object") {
    const first = (borderBoxSize as {
      readonly 0?: { readonly inlineSize?: unknown };
    })[0];
    hasBorderBoxMeasurement = first !== undefined;
    measuredWidth = first?.inlineSize;
  }

  if (hasBorderBoxMeasurement) {
    return isPositiveFinite(measuredWidth) ? measuredWidth : undefined;
  }

  const fallbackWidth = target.getBoundingClientRect().width;
  return isPositiveFinite(fallbackWidth) ? fallbackWidth : undefined;
}

type MeasurementStore = Map<string, Map<number, number>>;

interface UseHorizontalMeasuredFootprintsOptions<Item> {
  readonly items: readonly Item[];
  readonly getId: GridItemIdResolver<Item>;
  readonly getResolvedFootprint?: HorizontalGridItemResolvedFootprintResolver<Item>;
  readonly layout: HorizontalMasonryLayoutResult | null;
}

export interface UseHorizontalMeasuredFootprintsResult<Item> {
  readonly getResolvedFootprint: HorizontalGridItemResolvedFootprintResolver<Item>;
  readonly getNaturalContentRef: (
    id: string,
  ) => (element: HTMLElement | null) => void;
}

function cloneStore(store: MeasurementStore): MeasurementStore {
  return new Map(
    [...store.entries()].map(([id, widths]) => [id, new Map(widths)]),
  );
}

export function useHorizontalMeasuredFootprints<Item>(
  options: UseHorizontalMeasuredFootprintsOptions<Item>,
): UseHorizontalMeasuredFootprintsResult<Item> {
  const { items, getId, getResolvedFootprint, layout } = options;
  const [measurements, setMeasurements] = useState<MeasurementStore>(() => new Map());
  const [registrationVersion, setRegistrationVersion] = useState(0);
  const elementsRef = useRef(new Map<string, HTMLElement>());
  const idsByElementRef = useRef(new WeakMap<Element, string>());
  const callbacksRef = useRef(new Map<string, (element: HTMLElement | null) => void>());
  const observerRef = useRef<ResizeObserver | null>(null);

  const heightsById = useMemo(() => {
    const heights = new Map<string, number>();
    for (const cell of layout?.cells ?? []) heights.set(cell.id, cell.height);
    return heights;
  }, [layout]);

  const activeIds = useMemo(() => {
    const ids = new Set<string>();
    items.forEach((item, index) => ids.add(getId(item, index)));
    return ids;
  }, [items, getId]);

  const recordMeasurement = useCallback((id: string, width: number): void => {
    if (!isPositiveFinite(width)) return;
    const height = heightsById.get(id);
    if (height === undefined) return;
    setMeasurements((current) => {
      const currentWidth = current.get(id)?.get(height);
      if (
        currentWidth !== undefined &&
        areMeasuredWidthsEquivalent(currentWidth, width)
      ) return current;
      const next = cloneStore(current);
      const widths = next.get(id) ?? new Map<number, number>();
      widths.set(height, width);
      next.set(id, widths);
      return next;
    });
  }, [heightsById]);

  const registerNaturalContent = useCallback(
    (id: string, element: HTMLElement | null): void => {
      const previous = elementsRef.current.get(id);
      if (previous === element) return;
      if (previous !== undefined) {
        observerRef.current?.unobserve(previous);
        idsByElementRef.current.delete(previous);
      }
      if (element === null) {
        elementsRef.current.delete(id);
      } else {
        elementsRef.current.set(id, element);
        idsByElementRef.current.set(element, id);
      }
      setRegistrationVersion((version) => version + 1);
    },
    [],
  );

  const getNaturalContentRef = useCallback(
    (id: string): ((element: HTMLElement | null) => void) => {
      const existing = callbacksRef.current.get(id);
      if (existing !== undefined) return existing;
      const callback = (element: HTMLElement | null): void => {
        registerNaturalContent(id, element);
      };
      callbacksRef.current.set(id, callback);
      return callback;
    },
    [registerNaturalContent],
  );

  useEffect(() => {
    setMeasurements((current) => {
      let changed = false;
      const next = new Map<string, Map<number, number>>();
      for (const [id, widths] of current) {
        if (activeIds.has(id)) next.set(id, widths);
        else changed = true;
      }
      return changed ? next : current;
    });
    for (const id of elementsRef.current.keys()) {
      if (activeIds.has(id)) continue;
      const element = elementsRef.current.get(id);
      if (element !== undefined) {
        observerRef.current?.unobserve(element);
        idsByElementRef.current.delete(element);
      }
      elementsRef.current.delete(id);
      callbacksRef.current.delete(id);
    }
  }, [activeIds]);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const id = idsByElementRef.current.get(entry.target);
        if (id === undefined) continue;
        const width = readBorderBoxWidth(entry, entry.target);
        if (width !== undefined) recordMeasurement(id, width);
      }
    });
    observerRef.current = observer;
    for (const [id, element] of elementsRef.current) {
      if (!activeIds.has(id)) continue;
      observer.observe(element);
      const width = readBorderBoxWidth({ borderBoxSize: undefined }, element);
      if (width !== undefined) recordMeasurement(id, width);
    }
    return () => {
      observer.disconnect();
      if (observerRef.current === observer) observerRef.current = null;
    };
  }, [activeIds, layout, recordMeasurement, registrationVersion]);

  const resolveMeasuredFootprint = useCallback(
    (item: Item, index: number): ResolvedHorizontalItemFootprint | undefined => {
      const id = getId(item, index);
      const height = heightsById.get(id);
      const width = height === undefined ? undefined : measurements.get(id)?.get(height);
      if (height !== undefined && width !== undefined) return { width, forHeight: height };
      return getResolvedFootprint?.(item, index);
    },
    [getId, getResolvedFootprint, heightsById, measurements],
  );

  return { getResolvedFootprint: resolveMeasuredFootprint, getNaturalContentRef };
}
