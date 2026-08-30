import type { CSSProperties } from "react";
import type { MasonryCell, MasonryLayoutResult } from "grid-masonry-core";

/**
 * Projects core logical geometry to React DOM CSS pixels.
 * Geometry properties are authoritative and intentionally override host styles.
 */
export function createMasonryCellStyle(
  cell: MasonryCell,
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

/**
 * Creates the layout container style. Host padding should be applied on an outer
 * wrapper; the layout container itself owns its height and relative positioning.
 */
export function createMasonryContainerStyle(
  layout: MasonryLayoutResult | null,
  hostStyle?: CSSProperties,
): CSSProperties {
  return {
    ...hostStyle,
    position: hostStyle?.position ?? "relative",
    boxSizing: "border-box",
    width: hostStyle?.width ?? "100%",
    height: layout?.containerHeight ?? 0,
  };
}
