import assert from "node:assert/strict";
import test from "node:test";

import { calculateMasonryLayout } from "../dist/index.js";

const options = {
  containerWidth: 316,
  columnGap: 8,
  rowGap: 8,
  minColumnWidth: 100,
  minColumns: 3,
  maxColumns: 3,
};

const measuredItems = [
  ["A", 1, 180, 100],
  ["B", 2, 120, 208],
  ["C", 1, 80, 100],
  ["D", 3, 100, 316],
  ["E", 1, 160, 100],
  ["F", 2, 120, 208],
  ["G", 1, 70, 100],
].map(([id, columnSpan, height, forWidth]) => ({
  id,
  aspectRatio: 4 / 3,
  layoutHint: { columnSpan },
  resolvedFootprint: { height, forWidth },
}));

function windowMetrics(columnHeights, span) {
  return Array.from(
    { length: columnHeights.length - span + 1 },
    (_, start) => {
      const values = columnHeights.slice(start, start + span);
      const windowTop = Math.max(...values);
      return {
        start,
        windowTop,
        windowVoid: values.reduce(
          (sum, value) => sum + windowTop - value,
          0,
        ),
        windowSpread: windowTop - Math.min(...values),
      };
    },
  );
}

test("M5 A-G fixture records the ordered skyline and full-span barrier void", () => {
  const result = calculateMasonryLayout(measuredItems, options);

  assert.deepEqual(
    result.cells.map(({ id, column, columnSpan, x, y, width, height }) => ({
      id,
      column,
      columnSpan,
      x,
      y,
      width,
      height,
    })),
    [
      { id: "A", column: 0, columnSpan: 1, x: 0, y: 0, width: 100, height: 180 },
      { id: "B", column: 1, columnSpan: 2, x: 108, y: 0, width: 208, height: 120 },
      { id: "C", column: 1, columnSpan: 1, x: 108, y: 128, width: 100, height: 80 },
      { id: "D", column: 0, columnSpan: 3, x: 0, y: 216, width: 316, height: 100 },
      { id: "E", column: 0, columnSpan: 1, x: 0, y: 324, width: 100, height: 160 },
      { id: "F", column: 1, columnSpan: 2, x: 108, y: 324, width: 208, height: 120 },
      { id: "G", column: 1, columnSpan: 1, x: 108, y: 452, width: 100, height: 70 },
    ],
  );
  assert.equal(result.containerHeight, 522);

  const beforeD = [188, 216, 128];
  const dWindows = windowMetrics(beforeD, 3);
  assert.deepEqual(dWindows, [
    { start: 0, windowTop: 216, windowVoid: 116, windowSpread: 88 },
  ]);
  assert.equal(dWindows.length, 1);
  assert.equal(result.cells[3]?.y, Math.max(...beforeD));
});

test("M5 full-span placement has no alternate window to balance", () => {
  const windows = windowMetrics([188, 216, 128], 3);

  assert.equal(windows.length, 1);
  assert.equal(windows[0]?.start, 0);
  assert.equal(windows[0]?.windowTop, 216);
});
