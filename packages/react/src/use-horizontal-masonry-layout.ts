import { useMemo } from "react";
import {
  calculateHorizontalMasonryLayout,
  type HorizontalMasonryLayoutResult,
} from "grid-masonry-core";
import { normalizeHorizontalGridItems } from "./normalize-horizontal.js";
import type { UseHorizontalMasonryLayoutOptions } from "./types.js";

export function useHorizontalMasonryLayout<Item>(
  options: UseHorizontalMasonryLayoutOptions<Item>,
): HorizontalMasonryLayoutResult | null {
  const {
    items,
    containerHeight,
    getId,
    getAspectRatio,
    getLayoutHint,
    getResolvedFootprint,
    gap,
    rowGap,
    columnGap,
    minRowHeight,
    minRows,
    maxRows,
    maxRowHeight,
    rowSizing,
    rowAlignment,
    flowDistribution,
  } = options;

  const normalizedItems = useMemo(
    () => normalizeHorizontalGridItems(
      items,
      getId,
      getAspectRatio,
      getLayoutHint,
      getResolvedFootprint,
    ),
    [items, getId, getAspectRatio, getLayoutHint, getResolvedFootprint],
  );

  return useMemo(() => {
    if (containerHeight <= 0) return null;
    return calculateHorizontalMasonryLayout(normalizedItems, {
      containerHeight,
      minRowHeight,
      ...(gap === undefined ? {} : { gap }),
      ...(rowGap === undefined ? {} : { rowGap }),
      ...(columnGap === undefined ? {} : { columnGap }),
      ...(minRows === undefined ? {} : { minRows }),
      ...(maxRows === undefined ? {} : { maxRows }),
      ...(maxRowHeight === undefined ? {} : { maxRowHeight }),
      ...(rowSizing === undefined ? {} : { rowSizing }),
      ...(rowAlignment === undefined ? {} : { rowAlignment }),
      ...(flowDistribution === undefined ? {} : { flowDistribution }),
    });
  }, [
    normalizedItems,
    containerHeight,
    gap,
    rowGap,
    columnGap,
    minRowHeight,
    minRows,
    maxRows,
    maxRowHeight,
    rowSizing,
    rowAlignment,
    flowDistribution,
  ]);
}
