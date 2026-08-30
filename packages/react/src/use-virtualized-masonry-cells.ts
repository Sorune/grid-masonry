import { useMemo } from "react";
import {
  queryVirtualizedReference,
  type FlowRange,
  type HorizontalMasonryLayoutResult,
  type MasonryLayoutResult,
  type VirtualizationOptions,
  type VirtualizedCells,
} from "grid-masonry-core";

export interface UseVirtualizedMasonryCellsOptions
  extends VirtualizationOptions {
  readonly layout: MasonryLayoutResult | HorizontalMasonryLayoutResult;
  readonly flowRange: FlowRange;
}

/**
 * Opt-in React projection of Core virtualization primitives. The host owns
 * scroll state and supplies the current flow range; this hook only selects
 * stable cells for rendering.
 */
export function useVirtualizedMasonryCells(
  options: UseVirtualizedMasonryCellsOptions,
): VirtualizedCells<
  MasonryLayoutResult["cells"][number] | HorizontalMasonryLayoutResult["cells"][number]
> {
  const { layout, flowRange, overscan } = options;
  return useMemo(
    () =>
      queryVirtualizedReference(
        layout,
        flowRange,
        overscan === undefined ? undefined : { overscan },
      ),
    [layout, flowRange.start, flowRange.end, overscan],
  );
}
