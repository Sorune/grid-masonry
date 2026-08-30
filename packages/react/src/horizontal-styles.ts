import type { CSSProperties } from "react";
import type {
  HorizontalMasonryCell,
  HorizontalMasonryLayoutResult,
} from "grid-masonry-core";

export function createHorizontalMasonryCellStyle(
  cell: HorizontalMasonryCell,
  hostStyle?: CSSProperties,
): CSSProperties {
  return {
    ...hostStyle,
    position: "absolute",
    boxSizing: "border-box",
    left: cell.x,
    top: cell.y,
    width: cell.width,
    height: cell.height,
  };
}

export function createHorizontalMasonryContainerStyle(
  layout: HorizontalMasonryLayoutResult | null,
  hostStyle?: CSSProperties,
): CSSProperties {
  return {
    ...hostStyle,
    position: hostStyle?.position ?? "relative",
    boxSizing: "border-box",
    width: layout?.containerWidth ?? 0,
    height: hostStyle?.height ?? layout?.containerHeight ?? 0,
  };
}

/**
 * The surface is fixed to the Core-assigned cross size but remains max-content
 * in the flow direction, so a host can report natural width rather than the
 * provisional ratio shell width.
 */
export const horizontalNaturalContentStyle: CSSProperties = {
  display: "inline-block",
  width: "max-content",
  minWidth: "max-content",
  height: "100%",
  boxSizing: "border-box",
};
