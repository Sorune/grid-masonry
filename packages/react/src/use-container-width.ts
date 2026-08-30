import { useCallback, useEffect, useState } from "react";
import type {
  ContainerWidthState,
  UseContainerWidthOptions,
} from "./types.js";

function normalizeInitialWidth(value: number | undefined): number {
  if (value === undefined) {
    return 0;
  }

  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(
      `initialWidth must be a non-negative finite number. Received: ${String(value)}`,
    );
  }

  return value;
}

function readElementWidth(element: HTMLElement): number {
  return element.clientWidth;
}

/**
 * Measures a DOM container without leaking DOM concerns into grid-masonry-core.
 * ResizeObserver is preferred; window.resize is used only as a compatibility
 * fallback when ResizeObserver is unavailable.
 */
export function useContainerWidth<Element extends HTMLElement = HTMLDivElement>(
  options: UseContainerWidthOptions = {},
): ContainerWidthState<Element> {
  const [element, setElement] = useState<Element | null>(null);
  const [width, setWidth] = useState(() =>
    normalizeInitialWidth(options.initialWidth),
  );
  const [measured, setMeasured] = useState(false);

  const ref = useCallback((nextElement: Element | null) => {
    setElement(nextElement);

    if (nextElement !== null) {
      setWidth(readElementWidth(nextElement));
      setMeasured(true);
    }
  }, []);

  useEffect(() => {
    if (element === null) {
      return;
    }

    const measure = (): void => {
      const nextWidth = readElementWidth(element);
      setWidth((currentWidth) =>
        currentWidth === nextWidth ? currentWidth : nextWidth,
      );
      setMeasured(true);
    };

    measure();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        measure();
      });

      observer.observe(element);
      return () => observer.disconnect();
    }

    if (typeof window !== "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    return;
  }, [element]);

  return { ref, width, measured };
}
