import type { GridItem } from "grid-masonry-core";
import type {
  GridItemAspectRatioResolver,
  GridItemIdResolver,
  GridItemLayoutHintResolver,
  GridItemResolvedFootprintResolver,
} from "./types.js";

/**
 * Converts arbitrary host-domain items into the minimal core contract.
 * No host object is copied into core state.
 */
export function normalizeGridItems<Item>(
  items: readonly Item[],
  getId: GridItemIdResolver<Item>,
  getAspectRatio: GridItemAspectRatioResolver<Item>,
  getLayoutHint?: GridItemLayoutHintResolver<Item>,
  getResolvedFootprint?: GridItemResolvedFootprintResolver<Item>,
): readonly GridItem[] {
  return items.map((item, index) => {
    const id = getId(item, index);
    const aspectRatio = getAspectRatio(item, index);
    const layoutHint = getLayoutHint?.(item, index);
    const resolvedFootprint = getResolvedFootprint?.(item, index);

    return {
      id,
      aspectRatio,
      ...(layoutHint === undefined ? {} : { layoutHint }),
      ...(resolvedFootprint === undefined ? {} : { resolvedFootprint }),
    };
  });
}
