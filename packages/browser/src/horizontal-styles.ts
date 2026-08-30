import type {
  HorizontalMasonryCell,
  HorizontalMasonryLayoutResult,
} from "grid-masonry-core";

export function applyHorizontalMasonryCellStyle(
  element: HTMLElement,
  cell: HorizontalMasonryCell,
): void {
  element.style.position = "absolute";
  element.style.boxSizing = "border-box";
  element.style.left = `${cell.x}px`;
  element.style.top = `${cell.y}px`;
  element.style.width = `${cell.width}px`;
  element.style.height = `${cell.height}px`;
}

export function applyHorizontalMasonryContainerStyle(
  container: HTMLElement,
  layout: HorizontalMasonryLayoutResult | null,
): void {
  if (getComputedStyle(container).position === "static") {
    container.style.position = "relative";
  }
  container.style.boxSizing = "border-box";
  container.style.width = `${layout?.containerWidth ?? 0}px`;
  // The host owns the cross-axis size; do not derive it from content height.
  if (layout !== null) container.style.height = `${layout.containerHeight}px`;
}
