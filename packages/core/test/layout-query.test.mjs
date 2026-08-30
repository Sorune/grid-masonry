import assert from "node:assert/strict";
import test from "node:test";

import {
  GridMasonryError,
  calculateMasonryLayout,
  queryVisibleCells,
} from "../dist/index.js";

const layout = calculateMasonryLayout(
  Array.from({ length: 12 }, (_, index) => ({
    id: `item-${index}`,
    aspectRatio: 1,
  })),
  {
    containerWidth: 600,
    minColumnWidth: 180,
    gap: 10,
    minColumns: 3,
    maxColumns: 3,
  },
);

test("queryVisibleCells returns cells intersecting the vertical range", () => {
  const visible = queryVisibleCells(layout, { top: 205, bottom: 390 });

  assert.ok(visible.length > 0);
  for (const cell of visible) {
    assert.ok(cell.y + cell.height >= 205);
    assert.ok(cell.y <= 390);
  }
});

test("visible-range query preserves layout order", () => {
  const visible = queryVisibleCells(layout, { top: 0, bottom: 10000 });
  assert.deepEqual(
    visible.map((cell) => cell.id),
    layout.cells.map((cell) => cell.id),
  );
});

test("invalid visible range fails explicitly", () => {
  assert.throws(
    () => queryVisibleCells(layout, { top: 100, bottom: 99 }),
    (error) =>
      error instanceof GridMasonryError && error.code === "INVALID_RANGE",
  );
});
