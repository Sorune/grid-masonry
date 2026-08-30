import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import {
  calculateHorizontalMasonryLayout,
  calculateMasonryLayout,
  queryVirtualizedReference,
} from "grid-masonry-core";
import { useVirtualizedMasonryCells } from "../dist/use-virtualized-masonry-cells.js";

function Harness(props) {
  Harness.result = useVirtualizedMasonryCells(props);
  return null;
}

test("React virtualization hook returns Core-selected cells and updates with host range", () => {
  const layout = calculateMasonryLayout(
    Array.from({ length: 20 }, (_, index) => ({ id: `item-${index}`, aspectRatio: 1 })),
    { containerWidth: 600, minColumnWidth: 180, minColumns: 3, maxColumns: 3, gap: 8 },
  );
  let renderer;
  const props = { layout, flowRange: { start: 0, end: 300 }, overscan: 40 };
  act(() => {
    renderer = TestRenderer.create(React.createElement(Harness, props));
  });
  assert.deepEqual(Harness.result, queryVirtualizedReference(layout, props.flowRange, { overscan: 40 }));
  const before = Harness.result.ids;
  act(() => {
    renderer.update(React.createElement(Harness, { ...props, flowRange: { start: 500, end: 800 } }));
  });
  assert.notDeepEqual(Harness.result.ids, before);
  renderer.unmount();
});

test("React virtualization handles horizontal layouts, overscan changes, and layout replacement", () => {
  const items = Array.from({ length: 18 }, (_, index) => ({
    id: `horizontal-${index}`,
    aspectRatio: 0.75 + (index % 4) / 2,
  }));
  const layout = calculateHorizontalMasonryLayout(items, {
    containerHeight: 600,
    minRowHeight: 180,
    minRows: 3,
    maxRows: 3,
    gap: 8,
  });
  const replacement = calculateHorizontalMasonryLayout(
    items.map((item) => ({ ...item, aspectRatio: item.aspectRatio + 0.1 })),
    {
      containerHeight: 600,
      minRowHeight: 180,
      minRows: 3,
      maxRows: 3,
      gap: 8,
    },
  );
  let renderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(Harness, {
      layout,
      flowRange: { start: 200, end: 700 },
      overscan: 20,
    }));
  });
  assert.deepEqual(Harness.result, queryVirtualizedReference(layout, { start: 200, end: 700 }, { overscan: 20 }));
  act(() => {
    renderer.update(React.createElement(Harness, {
      layout,
      flowRange: { start: 200, end: 700 },
      overscan: 160,
    }));
  });
  assert.deepEqual(Harness.result, queryVirtualizedReference(layout, { start: 200, end: 700 }, { overscan: 160 }));
  act(() => {
    renderer.update(React.createElement(Harness, {
      layout: replacement,
      flowRange: { start: 0, end: 120 },
      overscan: 0,
    }));
  });
  assert.deepEqual(Harness.result, queryVirtualizedReference(replacement, { start: 0, end: 120 }));
  assert.deepEqual(Harness.result.ids, [...Harness.result.ids].sort((left, right) =>
    replacement.cells.findIndex((cell) => cell.id === left)
    - replacement.cells.findIndex((cell) => cell.id === right)));
  renderer.unmount();
});

test("React virtualization transitions empty and populated layouts without inventing geometry", () => {
  const empty = calculateMasonryLayout([], {
    containerWidth: 600,
    minColumnWidth: 180,
    minColumns: 3,
    maxColumns: 3,
    gap: 8,
  });
  const items = [
    { id: "one", aspectRatio: 1 },
    { id: "two", aspectRatio: 2 },
  ];
  const populated = calculateMasonryLayout(items, {
    containerWidth: 600,
    minColumnWidth: 180,
    minColumns: 3,
    maxColumns: 3,
    gap: 8,
  });
  let renderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(Harness, {
      layout: empty,
      flowRange: { start: 0, end: 1000 },
    }));
  });
  assert.deepEqual(Harness.result.ids, []);
  act(() => {
    renderer.update(React.createElement(Harness, {
      layout: populated,
      flowRange: { start: 0, end: 1000 },
    }));
  });
  assert.deepEqual(Harness.result, queryVirtualizedReference(populated, { start: 0, end: 1000 }));
  act(() => {
    renderer.update(React.createElement(Harness, {
      layout: empty,
      flowRange: { start: 0, end: 1000 },
    }));
  });
  assert.deepEqual(Harness.result.ids, []);
  renderer.unmount();
});
