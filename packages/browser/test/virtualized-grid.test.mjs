import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateHorizontalMasonryLayout,
  calculateMasonryLayout,
} from "grid-masonry-core";
import { createVirtualizedMasonryGrid } from "../dist/virtualized-masonry-grid.js";

function createContainer() {
  return {
    children: [],
    appendChild(element) {
      if (element.parentNode !== null) {
        const index = element.parentNode.children.indexOf(element);
        if (index >= 0) element.parentNode.children.splice(index, 1);
      }
      this.children.push(element);
      element.parentNode = this;
      return element;
    },
    removeChild(element) {
      const index = this.children.indexOf(element);
      if (index >= 0) this.children.splice(index, 1);
      element.parentNode = null;
      return element;
    },
  };
}

function createItems(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `item-${index}`,
    aspectRatio: 1 + (index % 3) / 2,
  }));
}

function createLayout(items) {
  return calculateHorizontalMasonryLayout(items, {
    containerHeight: 240,
    minRowHeight: 100,
    minRows: 2,
    maxRows: 2,
    gap: 8,
  });
}

test("browser virtualization creates only selected horizontal cells and applies physical geometry", () => {
  const items = createItems(12);
  const layout = createLayout(items);
  const container = createContainer();
  const created = [];
  const styled = [];
  const controller = createVirtualizedMasonryGrid({
    container,
    items,
    layout,
    flowRange: { start: 0, end: 210 },
    overscan: 0,
    createItem: (item) => {
      const element = { itemId: item.id, parentNode: null };
      created.push(element);
      return element;
    },
    applyCellStyle: (element, cell) => {
      element.geometry = { x: cell.x, y: cell.y, width: cell.width, height: cell.height };
      styled.push({ element, cell });
    },
  });

  const selected = controller.inspect();
  assert.ok(selected.cells.length > 0);
  assert.ok(selected.cells.length < layout.cells.length);
  assert.deepEqual(selected.ids, selected.cells.map((cell) => cell.id));
  assert.deepEqual(container.children, created);
  assert.deepEqual(created[0].geometry, {
    x: selected.cells[0].x,
    y: selected.cells[0].y,
    width: selected.cells[0].width,
    height: selected.cells[0].height,
  });
  controller.destroy();
  assert.equal(container.children.length, 0);
});

test("layout-only reflow reuses selected elements without updateItem, content update invokes it, and destroy cleans up", () => {
  const items = createItems(12);
  const layout = createLayout(items);
  const container = createContainer();
  const created = new Map();
  const updated = [];
  const destroyed = [];
  const controller = createVirtualizedMasonryGrid({
    container,
    items,
    layout,
    flowRange: { start: 0, end: 260 },
    createItem: (item) => {
      const element = { itemId: item.id, parentNode: null };
      created.set(item.id, element);
      return element;
    },
    updateItem: (element, item, index) => updated.push({ element, id: item.id, index }),
    destroyItem: (element, item) => destroyed.push({ element, id: item?.id }),
    applyCellStyle: () => {},
  });

  const retainedId = controller.inspect().ids[0];
  const retainedElement = created.get(retainedId);
  updated.length = 0;
  controller.update({
    items,
    layout,
    flowRange: { start: 20, end: 280 },
    contentChanged: false,
  });
  assert.equal(created.get(retainedId), retainedElement);
  assert.equal(updated.length, 0);

  controller.update({
    items,
    layout,
    flowRange: { start: 20, end: 280 },
    contentChanged: true,
  });
  assert.ok(updated.length > 0);
  assert.equal(updated.every(({ element }) => created.get(element.itemId) === element), true);

  controller.destroy();
  assert.equal(container.children.length, 0);
  assert.equal(destroyed.length, created.size);
  controller.destroy();
  assert.equal(destroyed.length, created.size);
});

test("virtualized browser lifecycle supports empty selection and horizontal row geometry", () => {
  const items = createItems(4);
  const layout = createLayout(items);
  const container = createContainer();
  let styleCount = 0;
  const controller = createVirtualizedMasonryGrid({
    container,
    items,
    layout,
    flowRange: { start: 100000, end: 100001 },
    createItem: (item) => ({ itemId: item.id, parentNode: null }),
    applyCellStyle: (element, cell) => {
      element.row = cell.row;
      element.rowSpan = cell.rowSpan;
      styleCount += 1;
    },
  });
  assert.deepEqual(controller.inspect().ids, []);
  assert.equal(styleCount, 0);
  controller.update({ items, layout, flowRange: { start: 0, end: 100 }, overscan: 0 });
  assert.ok(controller.inspect().cells.every((cell) => Number.isInteger(cell.row)));
  assert.equal(container.children.length, controller.inspect().cells.length);
  controller.destroy();
});

test("virtualized browser lifecycle supports vertical range movement, additions, and layout replacement", () => {
  const initialItems = Array.from({ length: 16 }, (_, index) => ({
    id: `vertical-${index}`,
    aspectRatio: 0.8 + (index % 3) / 2,
  }));
  const initialLayout = calculateMasonryLayout(initialItems, {
    containerWidth: 640,
    minColumnWidth: 180,
    minColumns: 3,
    maxColumns: 3,
    gap: 8,
  });
  const updatedItems = [...initialItems, { id: "vertical-new", aspectRatio: 1.2 }];
  const updatedLayout = calculateMasonryLayout(updatedItems, {
    containerWidth: 640,
    minColumnWidth: 180,
    minColumns: 3,
    maxColumns: 3,
    gap: 8,
  });
  const container = createContainer();
  let scrollWrites = 0;
  let scrollPosition = 42;
  Object.defineProperty(container, "scrollLeft", {
    get: () => scrollPosition,
    set: (value) => {
      scrollWrites += 1;
      scrollPosition = value;
    },
  });
  const created = new Map();
  const destroyed = [];
  const controller = createVirtualizedMasonryGrid({
    container,
    items: initialItems,
    layout: initialLayout,
    flowRange: { start: 0, end: 300 },
    overscan: 20,
    createItem: (item) => {
      const element = { itemId: item.id, parentNode: null };
      created.set(item.id, element);
      return element;
    },
    destroyItem: (element) => destroyed.push(element.itemId),
    applyCellStyle: (element, cell) => { element.geometry = cell; },
  });
  controller.update({
    items: initialItems,
    layout: initialLayout,
    flowRange: { start: 500, end: 900 },
    overscan: 100,
    contentChanged: false,
  });
  assert.deepEqual(controller.inspect().visibleRange, { start: 500, end: 900 });
  assert.deepEqual(controller.inspect().overscanRange, { start: 400, end: 1000 });
  const retainedId = controller.inspect().ids[0];
  const retainedElement = created.get(retainedId);
  controller.update({
    items: updatedItems,
    layout: updatedLayout,
    flowRange: { start: 500, end: 900 },
    overscan: 100,
    contentChanged: true,
  });
  assert.ok(controller.inspect().ids.includes(retainedId));
  assert.equal(created.get(retainedId), retainedElement);
  assert.equal(scrollWrites, 0);
  assert.equal(container.scrollLeft, 42);
  controller.destroy();
  assert.equal(container.children.length, 0);
  assert.equal(new Set(destroyed).size, destroyed.length);
});
