export const MEASURED_HEIGHT_EPSILON = 1e-4;

interface ResizeObserverEntryLike {
  readonly borderBoxSize?: unknown;
}

function isPositiveFinite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** Returns whether two platform measurements are equivalent for adapter updates. */
export function areMeasuredHeightsEquivalent(
  previousHeight: number,
  nextHeight: number,
): boolean {
  return Math.abs(previousHeight - nextHeight) <= MEASURED_HEIGHT_EPSILON;
}

/**
 * Reads the natural target's fractional border-box height. Browsers expose
 * borderBoxSize as either an array-like value or a single size object, so the
 * compatibility fallback is used only when no border-box value is exposed.
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
  } else if (borderBoxSize !== null && typeof borderBoxSize === "object") {
    const first = (
      borderBoxSize as {
        readonly 0?: { readonly blockSize?: unknown };
      }
    )[0];
    hasBorderBoxMeasurement = first !== undefined;
    measuredHeight = first?.blockSize;
  }

  if (hasBorderBoxMeasurement) {
    return isPositiveFinite(measuredHeight) ? measuredHeight : undefined;
  }

  const fallbackHeight = target.getBoundingClientRect().height;
  return isPositiveFinite(fallbackHeight) ? fallbackHeight : undefined;
}
