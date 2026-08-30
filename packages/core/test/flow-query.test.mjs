import assert from "node:assert/strict";
import test from "node:test";

import {
  GridMasonryError,
  calculateHorizontalMasonryLayout,
  calculateMasonryLayout,
  queryVisibleFlowCells,
} from "../dist/index.js";

test("flow query uses y/height for vertical and x/width for horizontal", () => {
  const vertical = calculateMasonryLayout(
    Array.from({ length: 6 }, (_, index) => ({ id: `v-${index}`, aspectRatio: 1 })),
    { containerWidth: 420, minColumnWidth: 190, minColumns: 2, maxColumns: 2, gap: 10 },
  );
  const horizontal = calculateHorizontalMasonryLayout(
    Array.from({ length: 6 }, (_, index) => ({ id: `h-${index}`, aspectRatio: 1 })),
    { containerHeight: 420, minRowHeight: 190, minRows: 2, maxRows: 2, gap: 10 },
  );
  assert.ok(queryVisibleFlowCells(vertical, { start: 0, end: 100 }).length > 0);
  assert.ok(queryVisibleFlowCells(horizontal, { start: 0, end: 100 }).length > 0);
  assert.deepEqual(
    queryVisibleFlowCells(vertical, { start: 0, end: 10000 }),
    vertical.cells,
  );
});

test("flow query preserves source layout order and validates ranges", () => {
  const layout = calculateMasonryLayout([], { containerWidth: 100, minColumnWidth: 100 });
  assert.deepEqual(queryVisibleFlowCells(layout, { start: 0, end: 0 }), []);
  assert.throws(
    () => queryVisibleFlowCells(layout, { start: 4, end: 3 }),
    (error) => error instanceof GridMasonryError && error.code === "INVALID_RANGE",
  );
});
