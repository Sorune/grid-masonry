import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateHorizontalMasonryLayout,
  calculateMasonryLayout,
} from "../dist/index.js";

function item(id, columnSpan, height, forWidth) {
  return {
    id,
    aspectRatio: 4 / 3,
    layoutHint: { columnSpan },
    resolvedFootprint: { height, forWidth },
  };
}

const options = {
  containerWidth: 208,
  columnGap: 8,
  rowGap: 8,
  minColumnWidth: 100,
  minColumns: 2,
  maxColumns: 2,
  flowDistribution: "space-between",
};

const horizontalOptions = {
  containerHeight: 208,
  rowGap: 8,
  columnGap: 8,
  minRowHeight: 100,
  minRows: 2,
  maxRows: 2,
  flowDistribution: "space-between",
};

function horizontalItem(id, rowSpan, width, forHeight) {
  return {
    id,
    aspectRatio: 4 / 3,
    layoutHint: { rowSpan },
    resolvedFootprint: { width, forHeight },
  };
}

test("space-between keeps synchronization boundary gaps at rowGap", () => {
  const result = calculateMasonryLayout([
    item("top", 2, 20, 208),
    item("a", 1, 20, 100),
    item("blocker", 1, 100, 100),
    item("b", 1, 20, 100),
    item("c", 1, 20, 100),
    item("bottom", 2, 20, 208),
  ], options);
  const top = result.cells[0];
  const first = result.cells[1];
  const lastInterior = result.cells[4];
  const bottom = result.cells[5];

  assert.ok(top && first && lastInterior && bottom);
  assert.equal(first.y - (top.y + top.height + options.rowGap), 0);
  assert.equal(
    bottom.y - (lastInterior.y + lastInterior.height + options.rowGap),
    0,
  );

  const evenly = calculateMasonryLayout([
    item("top", 2, 20, 208),
    item("a", 1, 20, 100),
    item("blocker", 1, 100, 100),
    item("b", 1, 20, 100),
    item("c", 1, 20, 100),
    item("bottom", 2, 20, 208),
  ], { ...options, flowDistribution: "space-evenly" });
  assert.ok((evenly.cells[1]?.y ?? 0) > first.y);
  assert.ok(
    (evenly.cells[5]?.y ?? 0) -
      ((evenly.cells[4]?.y ?? 0) + (evenly.cells[4]?.height ?? 0) + options.rowGap) >
      0,
  );
});

test("horizontal space-between applies the same graph boundary rule", () => {
  const between = calculateHorizontalMasonryLayout([
    horizontalItem("top", 2, 20, 208),
    horizontalItem("a", 1, 20, 100),
    horizontalItem("blocker", 1, 100, 100),
    horizontalItem("b", 1, 20, 100),
    horizontalItem("c", 1, 20, 100),
    horizontalItem("bottom", 2, 20, 208),
  ], horizontalOptions);
  const top = between.cells[0];
  const first = between.cells[1];
  const lastInterior = between.cells[4];
  const bottom = between.cells[5];

  assert.ok(top && first && lastInterior && bottom);
  assert.equal(first.x - (top.x + top.width + horizontalOptions.columnGap), 0);
  assert.equal(
    bottom.x - (lastInterior.x + lastInterior.width + horizontalOptions.columnGap),
    0,
  );

  const evenly = calculateHorizontalMasonryLayout(
    [
      horizontalItem("top", 2, 20, 208),
      horizontalItem("a", 1, 20, 100),
      horizontalItem("blocker", 1, 100, 100),
      horizontalItem("b", 1, 20, 100),
      horizontalItem("c", 1, 20, 100),
      horizontalItem("bottom", 2, 20, 208),
    ],
    { ...horizontalOptions, flowDistribution: "space-evenly" },
  );
  assert.ok((evenly.cells[1]?.x ?? 0) > first.x);
  assert.ok((evenly.cells[5]?.x ?? 0) - ((evenly.cells[4]?.x ?? 0) + (evenly.cells[4]?.width ?? 0) + 8) > 0);
});
