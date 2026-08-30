import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateHorizontalMasonryLayout,
  calculateMasonryLayout,
  createFlowRangeIndex,
  queryVisibleFlowCells,
} from "../dist/index.js";

function randomItems(prefix, count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index}`,
    aspectRatio: 0.5 + ((index * 31) % 170) / 100,
  }));
}

test("indexed vertical and horizontal queries match the linear oracle", () => {
  const vertical = calculateMasonryLayout(randomItems("v", 300), {
    containerWidth: 1200,
    minColumnWidth: 180,
    minColumns: 2,
    maxColumns: 6,
    gap: 10,
  });
  const horizontal = calculateHorizontalMasonryLayout(randomItems("h", 300), {
    containerHeight: 900,
    minRowHeight: 180,
    minRows: 2,
    maxRows: 5,
    gap: 10,
  });
  const verticalIndex = createFlowRangeIndex(vertical);
  const horizontalIndex = createFlowRangeIndex(horizontal);

  for (let start = 0; start < 3000; start += 137) {
    const range = { start, end: start + 420 };
    assert.deepEqual(verticalIndex.query(range), queryVisibleFlowCells(vertical, range));
    assert.deepEqual(horizontalIndex.query(range), queryVisibleFlowCells(horizontal, range));
  }
});

test("empty indexes and boundary-touching cells remain deterministic", () => {
  const layout = calculateMasonryLayout([], { containerWidth: 100, minColumnWidth: 100 });
  const index = createFlowRangeIndex(layout);
  assert.deepEqual(index.query({ start: 0, end: 0 }), []);
  assert.deepEqual(index.query({ start: 10, end: 20 }), []);
});

test("repeated indexed queries return the same source order", () => {
  const layout = calculateMasonryLayout(randomItems("item", 80), {
    containerWidth: 700,
    minColumnWidth: 160,
    gap: 8,
  });
  const index = createFlowRangeIndex(layout);
  const range = { start: 20, end: 1000 };
  assert.deepEqual(index.query(range), index.query(range));
  assert.deepEqual(index.query(range), queryVisibleFlowCells(layout, range));
});
