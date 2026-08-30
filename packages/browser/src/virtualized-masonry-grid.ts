import {
  queryVirtualizedReference,
  type FlowRange,
  type HorizontalMasonryCell,
  type HorizontalMasonryLayoutResult,
  type MasonryCell,
  type MasonryLayoutResult,
  type VirtualizationOptions,
  type VirtualizedCells,
} from "grid-masonry-core";
import type {
  BrowserVirtualizedMasonryGridController,
  BrowserVirtualizedMasonryGridOptions,
  BrowserVirtualizedMasonryGridUpdate,
} from "./types.js";

type PhysicalCell = MasonryCell | HorizontalMasonryCell;
type PhysicalLayout = MasonryLayoutResult | HorizontalMasonryLayoutResult;

/**
 * Browser virtualization lifecycle over Core-selected cells. The host owns
 * scroll/range observation and physical style projection.
 */
export function createVirtualizedMasonryGrid<Item>(
  options: BrowserVirtualizedMasonryGridOptions<Item>,
): BrowserVirtualizedMasonryGridController<Item> {
  let items = options.items;
  let layout: PhysicalLayout = options.layout;
  let flowRange = options.flowRange;
  let overscan = options.overscan;
  let destroyed = false;
  const elementsById = new Map<string, HTMLElement>();
  const itemsById = new Map<string, Item>();
  let currentSelection: VirtualizedCells<PhysicalCell> = queryVirtualizedReference(
    layout,
    flowRange,
    overscan === undefined ? undefined : { overscan },
  );

  const destroyElement = (id: string): void => {
    const element = elementsById.get(id);
    if (element === undefined) return;
    if (element.parentNode === options.container) {
      options.container.removeChild(element);
    }
    const item = itemsById.get(id);
    if (item !== undefined) options.destroyItem?.(element, item);
    elementsById.delete(id);
    itemsById.delete(id);
  };

  const render = (contentChanged: boolean): void => {
    if (destroyed) return;
    currentSelection = queryVirtualizedReference(
      layout,
      flowRange,
      overscan === undefined ? undefined : { overscan },
    );
    const nextIds = new Set(currentSelection.ids);

    for (const cell of currentSelection.cells) {
      const item = items[cell.index];
      if (item === undefined) {
        throw new Error(`Virtualized layout referenced missing item at index ${cell.index}.`);
      }
      let element = elementsById.get(cell.id);
      if (element === undefined) {
        element = options.createItem(item, cell.index);
        elementsById.set(cell.id, element);
      } else if (contentChanged) {
        options.updateItem?.(element, item, cell.index);
      }
      itemsById.set(cell.id, item);
      options.applyCellStyle(element, cell);
      options.container.appendChild(element);
    }

    for (const id of [...elementsById.keys()]) {
      if (!nextIds.has(id)) destroyElement(id);
    }
  };

  render(true);

  return {
    update(next: BrowserVirtualizedMasonryGridUpdate<Item>): void {
      items = next.items;
      layout = next.layout;
      flowRange = next.flowRange;
      overscan = next.overscan;
      render(next.contentChanged ?? true);
    },
    inspect(): VirtualizedCells<PhysicalCell> {
      return currentSelection;
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      for (const id of [...elementsById.keys()]) destroyElement(id);
    },
  };
}
