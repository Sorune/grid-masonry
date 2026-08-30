import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateHorizontalMasonryLayout,
  calculateMasonryLayout,
  createFlowRangeIndex,
  queryVirtualizedCells,
  queryVirtualizedReference,
} from "../dist/index.js";

function items(prefix, count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index}`,
    aspectRatio: 0.75 + (index % 4) / 2,
  }));
}

test("virtualized vertical results expose overscan and stable IDs/indexes", () => {
  const layout = calculateMasonryLayout(items("v", 30), {
    containerWidth: 800,
    minColumnWidth: 180,
    minColumns: 3,
    maxColumns: 4,
    gap: 8,
  });
  const range = { start: 200, end: 500 };
  const result = queryVirtualizedCells(layout, range, { overscan: 100 });
  assert.deepEqual(result.visibleRange, range);
  assert.deepEqual(result.overscanRange, { start: 100, end: 600 });
  assert.deepEqual(result.ids, result.cells.map((cell) => cell.id));
  assert.deepEqual(result.indexes, result.cells.map((cell) => cell.index));
  assert.deepEqual(result, queryVirtualizedReference(layout, range, { overscan: 100 }));
});

test("indexed virtualization matches the linear reference for horizontal flow", () => {
  const layout = calculateHorizontalMasonryLayout(items("h", 30), {
    containerHeight: 700,
    minRowHeight: 160,
    minRows: 2,
    maxRows: 4,
    gap: 8,
  });
  const index = createFlowRangeIndex(layout);
  for (let start = 0; start < 2000; start += 113) {
    const range = { start, end: start + 280 };
    assert.deepEqual(
      queryVirtualizedCells(layout, range, { overscan: 90 }, index),
      queryVirtualizedReference(layout, range, { overscan: 90 }),
    );
  }
});

test("overscan clamps at the flow origin and invalid values are rejected", () => {
  const layout = calculateMasonryLayout(items("v", 4), {
    containerWidth: 400,
    minColumnWidth: 180,
    gap: 8,
  });
  assert.equal(queryVirtualizedCells(layout, { start: 0, end: 10 }, { overscan: 50 }).overscanRange.start, 0);
  assert.throws(() => queryVirtualizedCells(layout, { start: 0, end: 1 }, { overscan: -1 }));
});
