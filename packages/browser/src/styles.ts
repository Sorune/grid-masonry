import type { MasonryCell, MasonryLayoutResult } from "grid-masonry-core";

export function applyMasonryCellStyle(element: HTMLElement, cell: MasonryCell): void {
  element.style.position = "absolute";
  element.style.boxSizing = "border-box";
  element.style.left = `${cell.x}px`;
  element.style.top = `${cell.y}px`;
  element.style.width = `${cell.width}px`;
  element.style.height = `${cell.height}px`;
}

export function applyMasonryContainerStyle(
  container: HTMLElement,
  layout: MasonryLayoutResult | null,
): void {
  if (getComputedStyle(container).position === "static") {
    container.style.position = "relative";
  }
  container.style.boxSizing = "border-box";
  container.style.height = `${layout?.containerHeight ?? 0}px`;
}
