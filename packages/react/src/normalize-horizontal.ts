import type { HorizontalGridItem } from "grid-masonry-core";
import type {
  GridItemAspectRatioResolver,
  GridItemIdResolver,
  HorizontalGridItemLayoutHintResolver,
  HorizontalGridItemResolvedFootprintResolver,
} from "./types.js";

export function normalizeHorizontalGridItems<Item>(
  items: readonly Item[],
  getId: GridItemIdResolver<Item>,
  getAspectRatio: GridItemAspectRatioResolver<Item>,
  getLayoutHint?: HorizontalGridItemLayoutHintResolver<Item>,
  getResolvedFootprint?: HorizontalGridItemResolvedFootprintResolver<Item>,
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
