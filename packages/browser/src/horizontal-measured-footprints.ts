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
