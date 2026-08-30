import { useCallback, useEffect, useState } from "react";
import type {
  ContainerHeightState,
  UseContainerHeightOptions,
} from "./types.js";

function normalizeInitialHeight(value: number | undefined): number {
  if (value === undefined) return 0;
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(
      `initialHeight must be a non-negative finite number. Received: ${String(value)}`,
    );
  }
  return value;
}

function readElementHeight(element: HTMLElement): number {
  return element.clientHeight;
}

/** Measures the host cross-axis height without coupling Core to the DOM. */
export function useContainerHeight<Element extends HTMLElement = HTMLDivElement>(
  options: UseContainerHeightOptions = {},
): ContainerHeightState<Element> {
  const [element, setElement] = useState<Element | null>(null);
  const [height, setHeight] = useState(() =>
    normalizeInitialHeight(options.initialHeight),
  );
  const [measured, setMeasured] = useState(false);

  const ref = useCallback((nextElement: Element | null) => {
    setElement(nextElement);
    if (nextElement !== null) {
      const nextHeight = readElementHeight(nextElement);
      setHeight((current) => (current === nextHeight ? current : nextHeight));
      setMeasured(true);
    }
  }, []);

  useEffect(() => {
    if (element === null) return;

    const measure = (): void => {
      const nextHeight = readElementHeight(element);
      setHeight((current) => (current === nextHeight ? current : nextHeight));
      setMeasured(true);
    };

    measure();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(measure);
      observer.observe(element);
      return () => observer.disconnect();
    }

    if (typeof window !== "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
  }, [element]);

  return { ref, height, measured };
}
