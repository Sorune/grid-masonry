import assert from "node:assert/strict";
import test from "node:test";
import { applyMasonryCellStyle } from "../dist/styles.js";
import { createMasonryGrid } from "../dist/masonry-grid.js";
import { applyHorizontalMasonryCellStyle } from "../dist/horizontal-styles.js";
import {
  areMeasuredWidthsEquivalent,
  readBorderBoxWidth,
} from "../dist/horizontal-measured-footprints.js";
import { createHorizontalMasonryGrid } from "../dist/horizontal-masonry-grid.js";

function createStableContainer(width = 600) {
  const container = {
    clientWidth: width,
    style: {},
    children: [],
    replaceChildrenCalls: 0,
    replaceChildren(...elements) {
      this.replaceChildrenCalls += 1;
      for (const element of this.children) {
        element.parentNode = null;
      }
      this.children = [];
      for (const element of elements) {
        this.appendChild(element);
      }
    },
    appendChild(element) {
      if (element.parentNode !== null) {
        const previousIndex = element.parentNode.children.indexOf(element);
        if (previousIndex >= 0) {
          element.parentNode.children.splice(previousIndex, 1);
        }
      }
      this.children.push(element);
      element.parentNode = this;
      return element;
    },
    removeChild(element) {
      const index = this.children.indexOf(element);
      if (index >= 0) {
        this.children.splice(index, 1);
        element.parentNode = null;
      }
      return element;
    },
  };
  Object.defineProperty(container, "elements", {
    get() {
      return this.children;
    },
  });
  return container;
}

function createStableShell(item, version = "initial") {
  return {
    id: item.id,
    version,
    style: {},
    dataset: {},
    parentNode: null,
    surface: { itemId: item.id, version },
  };
}

function createMeasuredSurface(itemId, height = 0) {
  const surface = {
    itemId,
    height,
    getBoundingClientRect() {
      return { height: this.height };
    },
  };
  return surface;
}

function createResizeObserverHarness() {
  const observers = [];
  class FakeResizeObserver {
    constructor(callback) {
      this.callback = callback;
      this.targets = new Set();
      this.disconnected = false;
      observers.push(this);
    }

    observe(target) {
      this.targets.add(target);
    }

    unobserve(target) {
      this.targets.delete(target);
    }

    disconnect() {
      this.disconnected = true;
      this.targets.clear();
    }

    emit(target, blockSize) {
      if (this.targets.has(target)) {
        this.callback([{ target, borderBoxSize: [{ blockSize }] }]);
      }
    }
  }

  return {
    ResizeObserver: FakeResizeObserver,
    observers,
  };
}

test("DOM projection uses core cell geometry", () => {
  const element = { style: {} };
  applyMasonryCellStyle(element, {
    id: "photo-1",
    index: 0,
    column: 1,
    columnSpan: 1,
    x: 120.5,
    y: 80.25,
    width: 240,
    height: 160,
    aspectRatio: 1.5,
  });

  assert.deepEqual(element.style, {
    position: "absolute",
    boxSizing: "border-box",
    left: "120.5px",
    top: "80.25px",
    width: "240px",
    height: "160px",
  });
});

test("horizontal DOM projection uses x/y and row metadata", () => {
  const element = { style: {} };
  applyHorizontalMasonryCellStyle(element, {
    id: "h-1", index: 0, row: 1, rowSpan: 2,
    x: 120.5, y: 8.25, width: 180.25, height: 96.5, aspectRatio: 2,
  });
  assert.deepEqual(element.style, {
    position: "absolute", boxSizing: "border-box",
    left: "120.5px", top: "8.25px", width: "180.25px", height: "96.5px",
  });
});

test("horizontal browser adapter forwards rowSpan and owns produced flow width", () => {
  const previousGetComputedStyle = global.getComputedStyle;
  global.getComputedStyle = () => ({ position: "static" });
  const container = createStableContainer();
  container.clientHeight = 208;
  const controller = createHorizontalMasonryGrid({
    container,
    items: [
      { id: "a", ratio: 2 },
      { id: "b", ratio: 1, hint: { rowSpan: 2 }, footprint: { width: 180, forHeight: 208 } },
    ],
    getId: (item) => item.id,
    getAspectRatio: (item) => item.ratio,
    getLayoutHint: (item) => item.hint,
    getResolvedFootprint: (item) => item.footprint,
    minRowHeight: 100,
    minRows: 2,
    maxRows: 2,
    gap: 8,
    createItem: (item) => ({ id: item.id, style: {}, dataset: {}, parentNode: null }),
  });
  assert.equal(container.elements.length, 2);
  assert.equal(container.elements[1].dataset.gridMasonryRowSpan, "2");
  assert.equal(container.style.height, "208px");
  assert.equal(container.style.width, "388px");
  assert.equal(container.elements[1].style.width, "180px");
  controller.destroy();
  global.getComputedStyle = previousGetComputedStyle;
});

test("horizontal browser reads natural width, binds it to cell height, and reflows without shell recreation", () => {
  const previousGetComputedStyle = global.getComputedStyle;
  const previousResizeObserver = global.ResizeObserver;
  global.getComputedStyle = () => ({ position: "static" });
  const observers = [];
  global.ResizeObserver = class {
    constructor(callback) { this.callback = callback; this.targets = new Set(); observers.push(this); }
    observe(target) { this.targets.add(target); }
    unobserve(target) { this.targets.delete(target); }
    disconnect() { this.targets.clear(); }
    emit(target, inlineSize) {
      if (this.targets.has(target)) this.callback([{ target, borderBoxSize: [{ inlineSize }] }]);
    }
  };
  const container = createStableContainer();
  container.clientHeight = 100;
  const surface = {
    getBoundingClientRect: () => ({ width: 180 }),
  };
  const created = [];
  const layouts = [];
  const controller = createHorizontalMasonryGrid({
    container,
    items: [{ id: "a", ratio: 1.2 }],
    getId: (item) => item.id,
    getAspectRatio: (item) => item.ratio,
    minRowHeight: 100,
    minRows: 1,
    maxRows: 1,
    itemMeasurement: { enabled: true },
    itemLifecycle: {
      updateItem: () => {},
      getNaturalContentSurface: (element) => element.surface,
    },
    createItem: (item) => {
      const element = { id: item.id, style: {}, dataset: {}, parentNode: null, surface };
      created.push(element);
      return element;
    },
    onLayoutChange: (layout) => layouts.push(layout),
  });
  assert.equal(created.length, 1);
  assert.equal(layouts.at(-1).cells[0].width, 180);
  const shell = created[0];
  observers[1].emit(surface, 180.00001);
  assert.equal(created[0], shell);
  assert.equal(layouts.at(-1).cells[0].width, 180);
  controller.destroy();
  global.getComputedStyle = previousGetComputedStyle;
  global.ResizeObserver = previousResizeObserver;
});

test("horizontal width reader keeps fractional values and equivalent updates stable", () => {
  const target = { getBoundingClientRect: () => ({ width: 72.5 }) };
  assert.equal(readBorderBoxWidth({ borderBoxSize: [{ inlineSize: 180.25 }] }, target), 180.25);
  assert.equal(readBorderBoxWidth({ borderBoxSize: undefined }, target), 72.5);
  assert.equal(areMeasuredWidthsEquivalent(180, 180.00009), true);
  assert.equal(areMeasuredWidthsEquivalent(180, 180.0002), false);
});

test("browser controller preserves host order across update and supports empty items", () => {
  const previousGetComputedStyle = global.getComputedStyle;
  const previousResizeObserver = global.ResizeObserver;
  global.getComputedStyle = () => ({ position: "static" });
  global.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };

  const container = {
    clientWidth: 600,
    style: {},
    elements: [],
    replaceChildren(...elements) {
      this.elements = elements;
    },
  };
  const createItem = (item) => ({ id: item.id, style: {}, dataset: {} });
  const options = {
    container,
    items: [
      { id: "a", width: 4, height: 3 },
      { id: "b", width: 1, height: 2 },
      { id: "c", width: 1, height: 1 },
    ],
    getId: (item) => item.id,
    getAspectRatio: (item) => item.width / item.height,
    minColumnWidth: 180,
    gap: 12,
    maxColumns: 3,
    createItem,
  };

  const controller = createMasonryGrid(options);
  assert.deepEqual(container.elements.map((element) => element.id), ["a", "b", "c"]);
  controller.update([options.items[1], options.items[0]]);
  assert.deepEqual(container.elements.map((element) => element.id), ["b", "a"]);
  controller.update([]);
  assert.deepEqual(container.elements, []);
  assert.equal(container.style.height, "0px");
  controller.destroy();

  global.getComputedStyle = previousGetComputedStyle;
  global.ResizeObserver = previousResizeObserver;
});

test("invalid host metadata is rejected before DOM projection", () => {
  const previousGetComputedStyle = global.getComputedStyle;
  global.getComputedStyle = () => ({ position: "static" });
  const container = {
    clientWidth: 600,
    style: {},
    replaceChildren() {},
  };

  assert.throws(() => createMasonryGrid({
    container,
    items: [{ id: "bad", width: 0, height: 100 }],
    getId: (item) => item.id,
    getAspectRatio: (item) => item.width / item.height,
    minColumnWidth: 180,
    createItem: () => ({ style: {}, dataset: {} }),
  }), /GridItem\.aspectRatio/);

  global.getComputedStyle = previousGetComputedStyle;
});

test("resize observer re-renders and destroy disconnects it", () => {
  const previousGetComputedStyle = global.getComputedStyle;
  const previousResizeObserver = global.ResizeObserver;
  let observer;
  global.getComputedStyle = () => ({ position: "static" });
  global.ResizeObserver = class {
    constructor(callback) {
      this.callback = callback;
      this.disconnected = false;
      observer = this;
    }

    observe() {}

    disconnect() {
      this.disconnected = true;
    }
  };

  const container = {
    clientWidth: 600,
    style: {},
    replaceChildren(...elements) {
      this.elements = elements;
    },
  };
  const layouts = [];
  const controller = createMasonryGrid({
    container,
    items: [{ id: "a", width: 4, height: 3 }],
    getId: (item) => item.id,
    getAspectRatio: (item) => item.width / item.height,
    minColumnWidth: 180,
    createItem: (item) => ({ id: item.id, style: {}, dataset: {} }),
    onLayoutChange: (layout) => layouts.push(layout),
  });

  assert.equal(layouts.length, 1);
  container.clientWidth = 800;
  observer.callback();
  assert.equal(layouts.length, 2);
  assert.equal(layouts[1].containerWidth, 800);

  controller.destroy();
  assert.equal(observer.disconnected, true);
  observer.callback();
  assert.equal(layouts.length, 2);

  global.getComputedStyle = previousGetComputedStyle;
  global.ResizeObserver = previousResizeObserver;
});

test("browser forwards explicit layout hints and declared footprints to core", () => {
  const previousGetComputedStyle = global.getComputedStyle;
  const previousResizeObserver = global.ResizeObserver;
  global.getComputedStyle = () => ({ position: "static" });
  global.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };

  const layouts = [];
  const container = {
    clientWidth: 316,
    style: {},
    replaceChildren(...elements) {
      this.elements = elements;
    },
  };
  const item = {
    id: "wide",
    aspectRatio: 2,
    layoutHint: { columnSpan: 2 },
    footprint: { height: 180, forWidth: 208 },
  };
  const controller = createMasonryGrid({
    container,
    items: [item],
    getId: (value) => value.id,
    getAspectRatio: (value) => value.aspectRatio,
    getLayoutHint: (value) => value.layoutHint,
    getResolvedFootprint: (value) => value.footprint,
    minColumnWidth: 100,
    minColumns: 3,
    maxColumns: 3,
    gap: 8,
    createItem: (value) => ({ id: value.id, style: {}, dataset: {} }),
    onLayoutChange: (layout) => layouts.push(layout),
  });

  const cell = layouts[0]?.cells[0];
  assert.ok(cell);
  assert.equal(cell.columnSpan, 2);
  assert.equal(cell.width, 208);
  assert.equal(cell.height, 180);
  assert.equal(container.elements[0]?.style.width, "208px");
  assert.equal(container.elements[0]?.style.height, "180px");

  controller.destroy();
  global.getComputedStyle = previousGetComputedStyle;
  global.ResizeObserver = previousResizeObserver;
});

test("browser forwards stale footprints and lets core apply ratio fallback", () => {
  const previousGetComputedStyle = global.getComputedStyle;
  const previousResizeObserver = global.ResizeObserver;
  global.getComputedStyle = () => ({ position: "static" });
  global.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };

  const layouts = [];
  const container = {
    clientWidth: 316,
    style: {},
    replaceChildren(...elements) {
      this.elements = elements;
    },
  };
  const controller = createMasonryGrid({
    container,
    items: [
      {
        id: "wide",
        aspectRatio: 2,
        layoutHint: { columnSpan: 2 },
        footprint: { height: 180, forWidth: 100 },
      },
    ],
    getId: (item) => item.id,
    getAspectRatio: (item) => item.aspectRatio,
    getLayoutHint: (item) => item.layoutHint,
    getResolvedFootprint: (item) => item.footprint,
    minColumnWidth: 100,
    minColumns: 3,
    maxColumns: 3,
    gap: 8,
    createItem: (item) => ({ id: item.id, style: {}, dataset: {} }),
    onLayoutChange: (layout) => layouts.push(layout),
  });

  const cell = layouts[0]?.cells[0];
  assert.ok(cell);
  assert.equal(cell.width, 208);
  assert.equal(cell.height, 104);

  controller.destroy();
  global.getComputedStyle = previousGetComputedStyle;
  global.ResizeObserver = previousResizeObserver;
});

test("browser responsive reflow clamps span and invalidates an old width-bound footprint", () => {
  const previousGetComputedStyle = global.getComputedStyle;
  const previousResizeObserver = global.ResizeObserver;
  let observer;
  global.getComputedStyle = () => ({ position: "static" });
  global.ResizeObserver = class {
    constructor(callback) {
      this.callback = callback;
      observer = this;
    }

    observe() {}
    disconnect() {}
  };

  const layouts = [];
  const container = {
    clientWidth: 316,
    style: {},
    replaceChildren(...elements) {
      this.elements = elements;
    },
  };
  const item = {
    id: "responsive",
    aspectRatio: 2,
    layoutHint: { columnSpan: 2 },
    footprint: { height: 180, forWidth: 208 },
  };
  const controller = createMasonryGrid({
    container,
    items: [item],
    getId: (value) => value.id,
    getAspectRatio: (value) => value.aspectRatio,
    getLayoutHint: (value) => value.layoutHint,
    getResolvedFootprint: (value) => value.footprint,
    minColumnWidth: 100,
    minColumns: 1,
    maxColumns: 3,
    gap: 8,
    createItem: (value) => ({ id: value.id, style: {}, dataset: {} }),
    onLayoutChange: (layout) => layouts.push(layout),
  });

  const desktopCell = layouts[0]?.cells[0];
  assert.ok(desktopCell);
  assert.equal(desktopCell.columnSpan, 2);
  assert.equal(desktopCell.width, 208);
  assert.equal(desktopCell.height, 180);

  container.clientWidth = 100;
  observer.callback();

  const mobileCell = layouts[1]?.cells[0];
  assert.ok(mobileCell);
  assert.equal(mobileCell.columnSpan, 1);
  assert.equal(mobileCell.width, 100);
  assert.equal(mobileCell.height, 50);

  controller.destroy();
  global.getComputedStyle = previousGetComputedStyle;
  global.ResizeObserver = previousResizeObserver;
});

test("stable lifecycle creates once and pure resize reuses elements without host updates", () => {
  const previousGetComputedStyle = global.getComputedStyle;
  const previousResizeObserver = global.ResizeObserver;
  let observer;
  const created = [];
  const updated = [];
  global.getComputedStyle = () => ({ position: "static" });
  global.ResizeObserver = class {
    constructor(callback) {
      this.callback = callback;
      observer = this;
    }

    observe() {}
    disconnect() {}
  };

  const container = createStableContainer();
  container.appendChild({ id: "pre-existing", parentNode: null });
  const items = [
    { id: "a", width: 4, height: 3 },
    { id: "b", width: 1, height: 1 },
    { id: "c", width: 3, height: 4 },
  ];
  const controller = createMasonryGrid({
    container,
    items,
    getId: (item) => item.id,
    getAspectRatio: (item) => item.width / item.height,
    minColumnWidth: 180,
    maxColumns: 3,
    itemLifecycle: {
      updateItem: (element, item) => {
        updated.push([element, item.id]);
      },
      getNaturalContentSurface: (element) => element.surface,
    },
    createItem: (item) => {
      const element = createStableShell(item);
      created.push(element);
      return element;
    },
  });

  const initialElements = [...container.elements];
  assert.equal(created.length, 3);
  assert.equal(updated.length, 0);
  assert.deepEqual(initialElements, created);
  assert.equal(container.elements.some((element) => element.id === "pre-existing"), false);

  container.clientWidth = 800;
  observer.callback();
  assert.equal(created.length, 3);
  assert.equal(updated.length, 0);
  assert.deepEqual(
    container.elements.map((element) => element.id),
    initialElements.map((element) => element.id),
  );
  assert.notEqual(initialElements[0].style.width, undefined);

  controller.destroy();
  global.getComputedStyle = previousGetComputedStyle;
  global.ResizeObserver = previousResizeObserver;
});

test("stable lifecycle updates reused content, preserves reorder identity, and handles add/remove", () => {
  const previousGetComputedStyle = global.getComputedStyle;
  const previousResizeObserver = global.ResizeObserver;
  global.getComputedStyle = () => ({ position: "static" });
  global.ResizeObserver = class {
    constructor() {}
    observe() {}
    disconnect() {}
  };

  const container = createStableContainer();
  const a1 = { id: "a", width: 1, height: 1, version: 1 };
  const b1 = { id: "b", width: 1, height: 1, version: 1 };
  const c1 = { id: "c", width: 1, height: 1, version: 1 };
  const created = [];
  const updated = [];
  const controller = createMasonryGrid({
    container,
    items: [a1, b1, c1],
    getId: (item) => item.id,
    getAspectRatio: (item) => item.width / item.height,
    minColumnWidth: 180,
    maxColumns: 3,
    itemLifecycle: {
      updateItem: (element, item, index) => {
        updated.push({ element, id: item.id, index, version: item.version });
        element.version = item.version;
      },
      getNaturalContentSurface: (element) => element.surface,
    },
    createItem: (item) => {
      const element = createStableShell(item);
      created.push(element);
      return element;
    },
  });
  const oldElements = new Map(container.elements.map((element) => [element.id, element]));

  const a2 = { ...a1, version: 2 };
  const b2 = { ...b1, version: 2 };
  const c2 = { ...c1, version: 2 };
  controller.update([c2, a2, b2]);
  assert.equal(created.length, 3);
  assert.deepEqual(container.elements, [oldElements.get("c"), oldElements.get("a"), oldElements.get("b")]);
  assert.deepEqual(updated.map((entry) => [entry.id, entry.version]), [
    ["c", 2],
    ["a", 2],
    ["b", 2],
  ]);

  const d = { id: "d", width: 1, height: 1, version: 1 };
  controller.update([a2, b2, d]);
  assert.equal(created.length, 4);
  assert.equal(created[3].id, "d");
  const oldD = created[3];
  assert.equal(updated.at(-1)?.id, "b");
  assert.equal(oldElements.get("c").parentNode, null);

  controller.update([]);
  assert.deepEqual(container.elements, []);
  assert.equal(container.style.height, "0px");
  controller.update([d]);
  assert.equal(created.length, 5);
  assert.notEqual(created[4], oldD);

  controller.destroy();
  global.getComputedStyle = previousGetComputedStyle;
  global.ResizeObserver = previousResizeObserver;
});

test("stable lifecycle reapplies Core styles after host update", () => {
  const previousGetComputedStyle = global.getComputedStyle;
  global.getComputedStyle = () => ({ position: "static" });
  const container = createStableContainer(316);
  const controller = createMasonryGrid({
    container,
    items: [{ id: "a", width: 2, height: 1, version: 1 }],
    getId: (item) => item.id,
    getAspectRatio: (item) => item.width / item.height,
    minColumnWidth: 100,
    minColumns: 3,
    maxColumns: 3,
    gap: 8,
    itemLifecycle: {
      updateItem: (element) => {
        element.style.position = "fixed";
        element.style.left = "999px";
        element.style.width = "1px";
        element.style.height = "1px";
      },
      getNaturalContentSurface: (element) => element.surface,
    },
    createItem: (item) => createStableShell(item),
  });

  controller.update([{ id: "a", width: 2, height: 1, version: 2 }]);
  const element = container.elements[0];
  assert.equal(element.style.position, "absolute");
  assert.equal(element.style.left, "0px");
  assert.equal(element.style.width, "100px");
  assert.equal(element.style.height, "50px");

  controller.destroy();
  global.getComputedStyle = previousGetComputedStyle;
});

test("stable lifecycle rejects a positioning shell as the natural surface", () => {
  const previousGetComputedStyle = global.getComputedStyle;
  global.getComputedStyle = () => ({ position: "static" });
  const container = createStableContainer();

  assert.throws(
    () => createMasonryGrid({
      container,
      items: [{ id: "a", width: 1, height: 1 }],
      getId: (item) => item.id,
      getAspectRatio: (item) => item.width / item.height,
      minColumnWidth: 180,
      itemLifecycle: {
        updateItem: () => {},
        getNaturalContentSurface: (element) => element,
      },
      createItem: (item) => createStableShell(item),
    }),
    /distinct from the positioning element/,
  );

  global.getComputedStyle = previousGetComputedStyle;
});

test("stable lifecycle updates the stored natural surface without recreating the shell", () => {
  const previousGetComputedStyle = global.getComputedStyle;
  global.getComputedStyle = () => ({ position: "static" });
  const container = createStableContainer();
  const surfaces = [];
  const controller = createMasonryGrid({
    container,
    items: [{ id: "a", width: 1, height: 1, version: 1 }],
    getId: (item) => item.id,
    getAspectRatio: (item) => item.width / item.height,
    minColumnWidth: 180,
    itemLifecycle: {
      updateItem: (element) => {
        element.surface = { version: 2 };
      },
      getNaturalContentSurface: (element) => {
        surfaces.push(element.surface);
        return element.surface;
      },
    },
    createItem: (item) => createStableShell(item),
  });
  const shell = container.elements[0];
  const firstSurface = surfaces[0];

  controller.update([{ id: "a", width: 1, height: 1, version: 2 }]);
  assert.equal(container.elements[0], shell);
  assert.notEqual(surfaces[1], firstSurface);
  assert.equal(surfaces[1], shell.surface);

  controller.destroy();
  global.getComputedStyle = previousGetComputedStyle;
});

test("stable lifecycle validates Core input before reconciling a host update", () => {
  const previousGetComputedStyle = global.getComputedStyle;
  global.getComputedStyle = () => ({ position: "static" });
  const container = createStableContainer();
  let createCount = 0;
  let updateCount = 0;
  const controller = createMasonryGrid({
    container,
    items: [{ id: "a", width: 1, height: 1 }],
    getId: (item) => item.id,
    getAspectRatio: (item) => item.width / item.height,
    minColumnWidth: 180,
    itemLifecycle: {
      updateItem: () => {
        updateCount += 1;
      },
      getNaturalContentSurface: (element) => element.surface,
    },
    createItem: (item) => {
      createCount += 1;
      return createStableShell(item);
    },
  });
  const original = container.elements[0];

  assert.throws(
    () => controller.update([{ id: "a", width: 0, height: 1 }]),
    /GridItem\.aspectRatio/,
  );
  assert.equal(createCount, 1);
  assert.equal(updateCount, 0);
  assert.equal(container.elements[0], original);

  controller.destroy();
  global.getComputedStyle = previousGetComputedStyle;
});

test("stable lifecycle preserves M3A span and footprint forwarding", () => {
  const previousGetComputedStyle = global.getComputedStyle;
  global.getComputedStyle = () => ({ position: "static" });
  const layouts = [];
  const container = createStableContainer(316);
  const controller = createMasonryGrid({
    container,
    items: [{ id: "wide", aspectRatio: 2, footprint: { height: 180, forWidth: 208 } }],
    getId: (item) => item.id,
    getAspectRatio: (item) => item.aspectRatio,
    getLayoutHint: () => ({ columnSpan: 2 }),
    getResolvedFootprint: (item) => item.footprint,
    minColumnWidth: 100,
    minColumns: 3,
    maxColumns: 3,
    gap: 8,
    itemLifecycle: {
      updateItem: () => {},
      getNaturalContentSurface: (element) => element.surface,
    },
    createItem: (item) => createStableShell(item),
    onLayoutChange: (layout) => layouts.push(layout),
  });

  assert.equal(layouts[0].cells[0].columnSpan, 2);
  assert.equal(layouts[0].cells[0].width, 208);
  assert.equal(layouts[0].cells[0].height, 180);

  controller.destroy();
  global.getComputedStyle = previousGetComputedStyle;
});

test("item measurement requires the stable lifecycle", () => {
  const previousGetComputedStyle = global.getComputedStyle;
  global.getComputedStyle = () => ({ position: "static" });
  const container = createStableContainer();

  assert.throws(
    () => createMasonryGrid({
      container,
      items: [{ id: "a", width: 1, height: 1 }],
      getId: (item) => item.id,
      getAspectRatio: (item) => item.width / item.height,
      minColumnWidth: 180,
      itemMeasurement: { enabled: true },
      createItem: (item) => createStableShell(item),
    }),
    /itemMeasurement requires itemLifecycle/,
  );

  global.getComputedStyle = previousGetComputedStyle;
});

test("measured mode uses provisional ratio geometry then natural height", () => {
  const previousGetComputedStyle = global.getComputedStyle;
  const previousResizeObserver = global.ResizeObserver;
  global.getComputedStyle = () => ({ position: "static" });
  const harness = createResizeObserverHarness();
  global.ResizeObserver = harness.ResizeObserver;
  const surface = createMeasuredSurface("a", 180);
  const created = [];
  const updates = [];
  const layouts = [];
  const container = createStableContainer(316);
  const controller = createMasonryGrid({
    container,
    items: [{ id: "a", aspectRatio: 2 }],
    getId: (item) => item.id,
    getAspectRatio: (item) => item.aspectRatio,
    getLayoutHint: () => ({ columnSpan: 2 }),
    minColumnWidth: 100,
    minColumns: 3,
    maxColumns: 3,
    gap: 8,
    itemLifecycle: {
      updateItem: (element, item) => updates.push([element, item.id]),
      getNaturalContentSurface: (element) => element.surface,
    },
    itemMeasurement: { enabled: true },
    createItem: (item) => {
      const element = createStableShell(item);
      element.surface = surface;
      created.push(element);
      return element;
    },
    onLayoutChange: (layout) => layouts.push(layout),
  });

  assert.equal(layouts[0]?.cells[0]?.height, 104);
  assert.equal(layouts.at(-1)?.cells[0]?.width, 208);
  assert.equal(layouts.at(-1)?.cells[0]?.height, 180);
  assert.equal(created.length, 1);
  assert.equal(updates.length, 0);
  assert.equal(container.replaceChildrenCalls, 1);
  assert.equal(harness.observers.length, 2);

  controller.destroy();
  global.getComputedStyle = previousGetComputedStyle;
  global.ResizeObserver = previousResizeObserver;
});

test("measured height expansion and shrink relayout through Core without host updates", () => {
  const previousGetComputedStyle = global.getComputedStyle;
  const previousResizeObserver = global.ResizeObserver;
  global.getComputedStyle = () => ({ position: "static" });
  const harness = createResizeObserverHarness();
  global.ResizeObserver = harness.ResizeObserver;
  const surface = createMeasuredSurface("a", 0);
  const created = [];
  let updateCount = 0;
  const layouts = [];
  const container = createStableContainer(240);
  const controller = createMasonryGrid({
    container,
    items: [{ id: "a", aspectRatio: 1 }],
    getId: (item) => item.id,
    getAspectRatio: (item) => item.aspectRatio,
    minColumnWidth: 180,
    itemLifecycle: {
      updateItem: () => {
        updateCount += 1;
      },
      getNaturalContentSurface: (element) => element.surface,
    },
    itemMeasurement: { enabled: true },
    createItem: (item) => {
      const element = createStableShell(item);
      element.surface = surface;
      created.push(element);
      return element;
    },
    onLayoutChange: (layout) => layouts.push(layout),
  });
  const itemObserver = harness.observers.find((observer) => observer.targets.has(surface));
  assert.ok(itemObserver);
  const shell = container.elements[0];

  surface.height = 236;
  itemObserver.emit(surface, 236);
  assert.equal(layouts.at(-1)?.cells[0]?.height, 236);
  assert.equal(container.style.height, "236px");
  assert.equal(container.replaceChildrenCalls, 1);

  const afterExpansionLayouts = layouts.length;
  itemObserver.emit(surface, 236.00000001);
  assert.equal(layouts.length, afterExpansionLayouts);
  surface.height = 180;
  itemObserver.emit(surface, 180);
  assert.equal(layouts.at(-1)?.cells[0]?.height, 180);
  assert.equal(created.length, 1);
  assert.equal(updateCount, 0);
  assert.equal(container.elements[0], shell);

  controller.destroy();
  global.getComputedStyle = previousGetComputedStyle;
  global.ResizeObserver = previousResizeObserver;
});

test("measured mode uses exact Core span width and preserves declared seed precedence", () => {
  const previousGetComputedStyle = global.getComputedStyle;
  const previousResizeObserver = global.ResizeObserver;
  global.getComputedStyle = () => ({ position: "static" });
  const harness = createResizeObserverHarness();
  global.ResizeObserver = harness.ResizeObserver;
  const surface = createMeasuredSurface("wide", 180);
  const layouts = [];
  const container = createStableContainer(316);
  const controller = createMasonryGrid({
    container,
    items: [{ id: "wide", aspectRatio: 2, footprint: { height: 160, forWidth: 208 } }],
    getId: (item) => item.id,
    getAspectRatio: (item) => item.aspectRatio,
    getLayoutHint: () => ({ columnSpan: 2 }),
    getResolvedFootprint: (item) => item.footprint,
    minColumnWidth: 100,
    minColumns: 3,
    maxColumns: 3,
    gap: 8,
    itemLifecycle: {
      updateItem: () => {},
      getNaturalContentSurface: (element) => element.surface,
    },
    itemMeasurement: { enabled: true },
    createItem: (item) => {
      const element = createStableShell(item);
      element.surface = surface;
      return element;
    },
    onLayoutChange: (layout) => layouts.push(layout),
  });

  assert.equal(layouts[0]?.cells[0]?.width, 208);
  assert.equal(layouts[0]?.cells[0]?.height, 160);
  assert.equal(layouts.at(-1)?.cells[0]?.height, 180);
  assert.equal(layouts.at(-1)?.cells[0]?.columnSpan, 2);
  assert.equal(layouts.at(-1)?.cells[0]?.aspectRatio, 2);

  controller.destroy();
  global.getComputedStyle = previousGetComputedStyle;
  global.ResizeObserver = previousResizeObserver;
});

test("stale measured width does not hide a current declared footprint after responsive collapse", () => {
  const previousGetComputedStyle = global.getComputedStyle;
  const previousResizeObserver = global.ResizeObserver;
  global.getComputedStyle = () => ({ position: "static" });
  const harness = createResizeObserverHarness();
  global.ResizeObserver = harness.ResizeObserver;
  const surface = createMeasuredSurface("responsive", 180);
  const layouts = [];
  const container = createStableContainer(316);
  const item = {
    id: "responsive",
    aspectRatio: 2,
    footprint: { height: 72, forWidth: 100 },
  };
  const controller = createMasonryGrid({
    container,
    items: [item],
    getId: (value) => value.id,
    getAspectRatio: (value) => value.aspectRatio,
    getLayoutHint: () => ({ columnSpan: 2 }),
    getResolvedFootprint: (value) => value.footprint,
    minColumnWidth: 100,
    minColumns: 1,
    maxColumns: 3,
    gap: 8,
    itemLifecycle: {
      updateItem: () => {},
      getNaturalContentSurface: (element) => element.surface,
    },
    itemMeasurement: { enabled: true },
    createItem: (value) => {
      const element = createStableShell(value);
      element.surface = surface;
      return element;
    },
    onLayoutChange: (layout) => layouts.push(layout),
  });
  const containerObserver = harness.observers.find((observer) => observer.targets.has(container));
  assert.ok(containerObserver);
  assert.equal(layouts.at(-1)?.cells[0]?.height, 180);

  surface.height = 0;
  container.clientWidth = 100;
  containerObserver.callback();
  assert.equal(layouts.at(-1)?.cells[0]?.columnSpan, 1);
  assert.equal(layouts.at(-1)?.cells[0]?.width, 100);
  assert.equal(layouts.at(-1)?.cells[0]?.height, 72);

  surface.height = 120;
  const itemObserver = harness.observers.find((observer) => observer.targets.has(surface));
  assert.ok(itemObserver);
  itemObserver.emit(surface, 120);
  assert.equal(layouts.at(-1)?.cells[0]?.height, 120);

  controller.destroy();
  global.getComputedStyle = previousGetComputedStyle;
  global.ResizeObserver = previousResizeObserver;
});

test("host updates invalidate same-width measured content and transfer observation to a replacement surface", () => {
  const previousGetComputedStyle = global.getComputedStyle;
  const previousResizeObserver = global.ResizeObserver;
  global.getComputedStyle = () => ({ position: "static" });
  const harness = createResizeObserverHarness();
  global.ResizeObserver = harness.ResizeObserver;
  const surfaceOne = createMeasuredSurface("a", 180);
  const surfaceTwo = createMeasuredSurface("a", 236);
  const updates = [];
  const created = [];
  const layouts = [];
  const container = createStableContainer(240);
  const controller = createMasonryGrid({
    container,
    items: [{ id: "a", aspectRatio: 1, version: 1 }],
    getId: (item) => item.id,
    getAspectRatio: (item) => item.aspectRatio,
    itemLifecycle: {
      updateItem: (element, item) => {
        updates.push(item.version);
        element.surface = surfaceTwo;
      },
      getNaturalContentSurface: (element) => element.surface,
    },
    itemMeasurement: { enabled: true },
    createItem: (item) => {
      const element = createStableShell(item);
      element.surface = surfaceOne;
      created.push(element);
      return element;
    },
    minColumnWidth: 180,
    onLayoutChange: (layout) => layouts.push(layout),
  });
  const shell = container.elements[0];
  const itemObserver = harness.observers.find((observer) => observer.targets.has(surfaceOne));
  assert.ok(itemObserver);
  assert.equal(layouts.at(-1)?.cells[0]?.height, 180);

  controller.update([{ id: "a", aspectRatio: 1, version: 2 }]);
  assert.deepEqual(updates, [2]);
  assert.equal(created.length, 1);
  assert.equal(container.elements[0], shell);
  assert.equal(layouts.at(-1)?.cells[0]?.height, 236);
  assert.equal(itemObserver.targets.has(surfaceOne), false);
  assert.equal(itemObserver.targets.has(surfaceTwo), true);

  controller.destroy();
  global.getComputedStyle = previousGetComputedStyle;
  global.ResizeObserver = previousResizeObserver;
});

test("invalid automatic measurements are ignored and ResizeObserver absence is safe", () => {
  const previousGetComputedStyle = global.getComputedStyle;
  const previousResizeObserver = global.ResizeObserver;
  global.getComputedStyle = () => ({ position: "static" });
  const harness = createResizeObserverHarness();
  global.ResizeObserver = harness.ResizeObserver;
  const surface = createMeasuredSurface("a", 0);
  const layouts = [];
  const container = createStableContainer(240);
  const controller = createMasonryGrid({
    container,
    items: [{ id: "a", aspectRatio: 2 }],
    getId: (item) => item.id,
    getAspectRatio: (item) => item.aspectRatio,
    minColumnWidth: 180,
    itemLifecycle: {
      updateItem: () => {},
      getNaturalContentSurface: (element) => element.surface,
    },
    itemMeasurement: { enabled: true },
    createItem: (item) => {
      const element = createStableShell(item);
      element.surface = surface;
      return element;
    },
    onLayoutChange: (layout) => layouts.push(layout),
  });
  const itemObserver = harness.observers.find((observer) => observer.targets.has(surface));
  assert.ok(itemObserver);
  const initialLayoutCount = layouts.length;
  for (const invalidHeight of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    itemObserver.emit(surface, invalidHeight);
  }
  assert.equal(layouts.length, initialLayoutCount);
  assert.equal(layouts.at(-1)?.cells[0]?.height, 120);
  controller.destroy();

  global.ResizeObserver = undefined;
  const fallbackSurface = createMeasuredSurface("fallback", 160);
  const fallbackLayouts = [];
  const fallbackContainer = createStableContainer(240);
  const fallbackController = createMasonryGrid({
    container: fallbackContainer,
    items: [{ id: "fallback", aspectRatio: 1 }],
    getId: (item) => item.id,
    getAspectRatio: (item) => item.aspectRatio,
    minColumnWidth: 180,
    itemLifecycle: {
      updateItem: () => {},
      getNaturalContentSurface: (element) => element.surface,
    },
    itemMeasurement: { enabled: true },
    createItem: (item) => {
      const element = createStableShell(item);
      element.surface = fallbackSurface;
      return element;
    },
    onLayoutChange: (layout) => fallbackLayouts.push(layout),
  });
  assert.equal(fallbackLayouts.at(-1)?.cells[0]?.height, 160);
  fallbackController.destroy();

  global.getComputedStyle = previousGetComputedStyle;
  global.ResizeObserver = previousResizeObserver;
});

test("measured item removal cleans observation and re-addition starts a new lifecycle", () => {
  const previousGetComputedStyle = global.getComputedStyle;
  const previousResizeObserver = global.ResizeObserver;
  global.getComputedStyle = () => ({ position: "static" });
  const harness = createResizeObserverHarness();
  global.ResizeObserver = harness.ResizeObserver;
  const surfaces = new Map();
  const created = [];
  const container = createStableContainer(240);
  const controller = createMasonryGrid({
    container,
    items: [{ id: "a", aspectRatio: 1 }, { id: "b", aspectRatio: 1 }],
    getId: (item) => item.id,
    getAspectRatio: (item) => item.aspectRatio,
    minColumnWidth: 180,
    itemLifecycle: {
      updateItem: () => {},
      getNaturalContentSurface: (element) => element.surface,
    },
    itemMeasurement: { enabled: true },
    createItem: (item) => {
      const element = createStableShell(item);
      const surface = createMeasuredSurface(item.id, item.id === "a" ? 120 : 140);
      element.surface = surface;
      surfaces.set(item.id, surface);
      created.push(element);
      return element;
    },
  });
  const itemObserver = harness.observers.find((observer) => observer.targets.has(surfaces.get("b")));
  assert.ok(itemObserver);
  const oldB = created[1];

  controller.update([{ id: "a", aspectRatio: 1 }]);
  assert.equal(itemObserver.targets.has(surfaces.get("b")), false);
  assert.equal(container.elements.includes(oldB), false);

  controller.update([{ id: "a", aspectRatio: 1 }, { id: "b", aspectRatio: 1 }]);
  assert.equal(created.length, 3);
  assert.notEqual(created[2], oldB);
  assert.equal(itemObserver.targets.has(surfaces.get("b")), true);

  controller.update([]);
  assert.equal(itemObserver.targets.size, 0);
  assert.deepEqual(container.elements, []);
  controller.destroy();
  global.getComputedStyle = previousGetComputedStyle;
  global.ResizeObserver = previousResizeObserver;
});
