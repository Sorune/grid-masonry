import { useMemo } from "react";
import {
  calculateMasonryLayout,
  type MasonryLayoutResult,
} from "grid-masonry-core";
import { normalizeGridItems } from "./normalize.js";
import type { UseMasonryLayoutOptions } from "./types.js";

/**
 * React memoization boundary around the pure core layout function.
 * A non-positive container width means the DOM has not been measured yet, so
 * no core layout is requested and null is returned.
 */
export function useMasonryLayout<Item>(
  options: UseMasonryLayoutOptions<Item>,
): MasonryLayoutResult | null {
  const {
    items,
    containerWidth,
    getId,
    getAspectRatio,
    getLayoutHint,
    getResolvedFootprint,
    gap,
    columnGap,
    rowGap,
    minColumnWidth,
    minColumns,
    maxColumns,
    maxColumnWidth,
    columnSizing,
    columnAlignment,
    flowDistribution,
  } = options;

  const normalizedItems = useMemo(
    () =>
      normalizeGridItems(
        items,
        getId,
        getAspectRatio,
        getLayoutHint,
        getResolvedFootprint,
      ),
    [
      items,
      getId,
      getAspectRatio,
      getLayoutHint,
      getResolvedFootprint,
    ],
  );

  return useMemo(() => {
    if (containerWidth <= 0) {
      return null;
    }

    return calculateMasonryLayout(normalizedItems, {
      containerWidth,
      minColumnWidth,
      ...(gap === undefined ? {} : { gap }),
      ...(columnGap === undefined ? {} : { columnGap }),
      ...(rowGap === undefined ? {} : { rowGap }),
      ...(minColumns === undefined ? {} : { minColumns }),
      ...(maxColumns === undefined ? {} : { maxColumns }),
      ...(maxColumnWidth === undefined ? {} : { maxColumnWidth }),
      ...(columnSizing === undefined ? {} : { columnSizing }),
      ...(columnAlignment === undefined ? {} : { columnAlignment }),
      ...(flowDistribution === undefined ? {} : { flowDistribution }),
    });
  }, [
    normalizedItems,
    containerWidth,
    gap,
    columnGap,
    rowGap,
    minColumnWidth,
    minColumns,
    maxColumns,
    maxColumnWidth,
    columnSizing,
    columnAlignment,
    flowDistribution,
  ]);
}
