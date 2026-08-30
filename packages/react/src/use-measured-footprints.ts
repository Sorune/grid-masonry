import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  GridItemResolvedFootprintResolver,
  GridItemIdResolver,
} from "./types.js";
import type {
  MasonryLayoutResult,
  ResolvedItemFootprint,
} from "grid-masonry-core";

export const MEASURED_HEIGHT_EPSILON = 1e-4;

type MeasurementStore = Map<string, Map<number, number>>;

interface ResizeObserverEntryLike {
  readonly borderBoxSize?: unknown;
}

function isPositiveFinite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** Returns whether two measured heights are equivalent for adapter updates. */
export function areMeasuredHeightsEquivalent(
  previousHeight: number,
  nextHeight: number,
): boolean {
  return Math.abs(previousHeight - nextHeight) <= MEASURED_HEIGHT_EPSILON;
}

/**
 * Reads a natural target's border-box height, supporting both ResizeObserver
 * borderBoxSize shapes and the target-only DOM fallback.
 */
export function readBorderBoxHeight(
  entry: ResizeObserverEntryLike,
  target: Element,
): number | undefined {
  const borderBoxSize = entry.borderBoxSize;
  let measuredHeight: unknown;
  let hasBorderBoxMeasurement = false;

  if (Array.isArray(borderBoxSize)) {
    const first = borderBoxSize[0];
    hasBorderBoxMeasurement = first !== undefined;
    measuredHeight = first?.blockSize;
  } else if (
    borderBoxSize !== null &&
    typeof borderBoxSize === "object" &&
    "blockSize" in borderBoxSize
  ) {
    hasBorderBoxMeasurement = true;
    measuredHeight = (borderBoxSize as { readonly blockSize?: unknown })
      .blockSize;
  } else if (
    borderBoxSize !== null &&
    typeof borderBoxSize === "object"
  ) {
    const first = (
      borderBoxSize as {
        readonly 0?: { readonly blockSize?: unknown };
      }
    )[0];
    hasBorderBoxMeasurement = first !== undefined;
    measuredHeight = (
      borderBoxSize as {
        readonly 0?: { readonly blockSize?: unknown };
      }
    )[0]?.blockSize;
  }

  if (hasBorderBoxMeasurement) {
    return isPositiveFinite(measuredHeight) ? measuredHeight : undefined;
  }

  const fallbackHeight = target.getBoundingClientRect().height;
  return isPositiveFinite(fallbackHeight) ? fallbackHeight : undefined;
}

function cloneMeasurementStore(store: MeasurementStore): MeasurementStore {
  return new Map(
    [...store.entries()].map(([id, widths]) => [id, new Map(widths)]),
  );
}

interface UseMeasuredFootprintsOptions<Item> {
  readonly items: readonly Item[];
  readonly getId: GridItemIdResolver<Item>;
  readonly getResolvedFootprint?: GridItemResolvedFootprintResolver<Item>;
  readonly layout: MasonryLayoutResult | null;
}

export interface UseMeasuredFootprintsResult<Item> {
  readonly getResolvedFootprint: GridItemResolvedFootprintResolver<Item>;
  readonly getNaturalContentRef: (
    id: string,
  ) => (element: HTMLElement | null) => void;
}

/**
 * Owns the React adapter's optional natural-content measurement lifecycle.
 * Core remains responsible for resolving widths and placing the result.
 */
export function useMeasuredFootprints<Item>(
  options: UseMeasuredFootprintsOptions<Item>,
): UseMeasuredFootprintsResult<Item> {
  const { items, getId, getResolvedFootprint, layout } = options;
  const [measurements, setMeasurements] = useState<MeasurementStore>(
    () => new Map(),
  );
  const [registrationVersion, setRegistrationVersion] = useState(0);
  const elementsRef = useRef(new Map<string, HTMLElement>());
  const idsByElementRef = useRef(new WeakMap<Element, string>());
  const callbacksRef = useRef(
    new Map<string, (element: HTMLElement | null) => void>(),
  );
  const observerRef = useRef<ResizeObserver | null>(null);

  const widthsById = useMemo(() => {
    const widths = new Map<string, number>();

    for (const cell of layout?.cells ?? []) {
      widths.set(cell.id, cell.width);
    }

    return widths;
  }, [layout]);

  const activeIds = useMemo(() => {
    const ids = new Set<string>();

    items.forEach((item, index) => {
      ids.add(getId(item, index));
    });

    return ids;
  }, [items, getId]);

  const recordMeasurement = useCallback(
    (id: string, height: number): void => {
      if (!isPositiveFinite(height)) {
        return;
      }

      const width = widthsById.get(id);
      if (width === undefined) {
        return;
      }

      setMeasurements((current) => {
        const currentHeight = current.get(id)?.get(width);
        if (
          currentHeight !== undefined &&
          areMeasuredHeightsEquivalent(currentHeight, height)
        ) {
          return current;
        }

        const next = cloneMeasurementStore(current);
        const widths = next.get(id) ?? new Map<number, number>();
        widths.set(width, height);
        next.set(id, widths);
        return next;
      });
    },
    [widthsById],
  );

  const registerNaturalContent = useCallback(
    (id: string, element: HTMLElement | null): void => {
      const previous = elementsRef.current.get(id);
      if (previous === element) {
        return;
      }

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
      if (existing !== undefined) {
        return existing;
      }

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
        if (activeIds.has(id)) {
          next.set(id, widths);
        } else {
          changed = true;
        }
      }

      return changed ? next : current;
    });

    for (const id of elementsRef.current.keys()) {
      if (!activeIds.has(id)) {
        const element = elementsRef.current.get(id);
        if (element !== undefined) {
          observerRef.current?.unobserve(element);
          idsByElementRef.current.delete(element);
        }
        elementsRef.current.delete(id);
        callbacksRef.current.delete(id);
      }
    }
  }, [activeIds]);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const id = idsByElementRef.current.get(entry.target);
        if (id === undefined) {
          continue;
        }

        const height = readBorderBoxHeight(entry, entry.target);
        if (height !== undefined) {
          recordMeasurement(id, height);
        }
      }
    });
    observerRef.current = observer;

    for (const [id, element] of elementsRef.current) {
      if (!activeIds.has(id)) {
        continue;
      }

      observer.observe(element);
      const height = readBorderBoxHeight({ borderBoxSize: undefined }, element);
      if (height !== undefined) {
        recordMeasurement(id, height);
      }
    }

    return () => {
      observer.disconnect();
      if (observerRef.current === observer) {
        observerRef.current = null;
      }
    };
  }, [activeIds, layout, recordMeasurement, registrationVersion]);

  const resolveMeasuredFootprint = useCallback(
    (item: Item, index: number): ResolvedItemFootprint | undefined => {
      const id = getId(item, index);
      const width = widthsById.get(id);
      const height = width === undefined ? undefined : measurements.get(id)?.get(width);

      if (width !== undefined && height !== undefined) {
        return { height, forWidth: width };
      }

      return getResolvedFootprint?.(item, index);
    },
    [getId, getResolvedFootprint, measurements, widthsById],
  );

  return {
    getResolvedFootprint: resolveMeasuredFootprint,
    getNaturalContentRef,
  };
}
