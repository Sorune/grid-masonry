import assert from "node:assert/strict";
import test from "node:test";

import {
  GridMasonryError,
  applyOrder,
  calculateHorizontalMasonryLayout,
  calculateMasonryLayout,
} from "../dist/index.js";

const verticalOptions = {
  containerWidth: 308,
  minColumnWidth: 100,
  minColumns: 3,
  maxColumns: 3,
  gap: 8,
};

const horizontalOptions = {
  containerHeight: 308,
  minRowHeight: 100,
  minRows: 3,
  maxRows: 3,
  gap: 8,
};

function assertNoOverlap(cells) {
  for (let left = 0; left < cells.length; left += 1) {
    for (let right = left + 1; right < cells.length; right += 1) {
      const a = cells[left];
      const b = cells[right];
      assert.ok(a && b);
      const overlap = !(
        a.x + a.width <= b.x ||
        b.x + b.width <= a.x ||
        a.y + a.height <= b.y ||
        b.y + b.height <= a.y
      );
      assert.equal(overlap, false, `${a.id} overlaps ${b.id}`);
    }
  }
}

test("preferred lane does not override a strictly lower candidate", () => {
  const result = calculateMasonryLayout(
    [
      { id: "a", aspectRatio: 1 },
      { id: "b", aspectRatio: 1, layoutHint: { preferredColumn: 0 } },
      { id: "c", aspectRatio: 1, layoutHint: { preferredColumn: 0 } },
    ],
    verticalOptions,
  );
  assert.equal(result.cells[2]?.column, 2);
});

test("preferred and locked spans normalize at first, last, and responsive lanes", () => {
  const result = calculateMasonryLayout(
    [
      { id: "first", aspectRatio: 1, layoutHint: { preferredColumn: 0 } },
      { id: "last", aspectRatio: 1, layoutHint: { lockedColumn: 2 } },
      {
        id: "wide",
        aspectRatio: 1,
        layoutHint: { columnSpan: 2, lockedColumn: 99 },
      },
    ],
    verticalOptions,
  );
  assert.equal(result.cells[0]?.column, 0);
  assert.equal(result.cells[1]?.column, 2);
  assert.equal(result.cells[2]?.column, 1);
  assert.equal(result.cells[2]?.columnSpan, 2);
  assertNoOverlap(result.cells);
});

test("full-span locks have one normalized lane and preserve the synchronization property", () => {
  const result = calculateMasonryLayout(
    [{ id: "full", aspectRatio: 2, layoutHint: { columnSpan: 99, lockedColumn: 2 } }],
    verticalOptions,
  );
  assert.equal(result.cells[0]?.column, 0);
  assert.equal(result.cells[0]?.columnSpan, 3);
  assert.equal(result.cells[0]?.width, result.contentWidth);
});

test("locked placement consumes the whole resolved footprint before distribution", () => {
  const result = calculateMasonryLayout(
    [
      {
        id: "locked",
        aspectRatio: 2,
        resolvedFootprint: { height: 180, forWidth: 202.66666666666666 },
        layoutHint: { lockedColumn: 1, columnSpan: 2 },
      },
      { id: "next", aspectRatio: 1, layoutHint: { lockedColumn: 1 } },
    ],
    { ...verticalOptions, flowDistribution: "space-evenly" },
  );
  assert.equal(result.cells[0]?.height, 180);
  assert.equal(result.cells[0]?.column, 1);
  assert.equal(result.cells[1]?.column, 1);
  assert.ok((result.cells[1]?.y ?? 0) >= (result.cells[0]?.y ?? 0) + 180 + 8);
  assertNoOverlap(result.cells);
});

test("horizontal hints are the transpose-equivalent of vertical hints", () => {
  const vertical = calculateMasonryLayout(
    [
      { id: "a", aspectRatio: 1 },
      { id: "b", aspectRatio: 1, layoutHint: { lockedColumn: 2 } },
      { id: "c", aspectRatio: 1, layoutHint: { columnSpan: 2, preferredColumn: 1 } },
    ],
    verticalOptions,
  );
  const horizontal = calculateHorizontalMasonryLayout(
    [
      { id: "a", aspectRatio: 1 },
      { id: "b", aspectRatio: 1, layoutHint: { lockedRow: 2 } },
      { id: "c", aspectRatio: 1, layoutHint: { rowSpan: 2, preferredRow: 1 } },
    ],
    horizontalOptions,
  );
  assert.deepEqual(
    vertical.cells.map((cell) => [cell.column, cell.columnSpan]),
    horizontal.cells.map((cell) => [cell.row, cell.rowSpan]),
  );
  assertNoOverlap(vertical.cells);
  assertNoOverlap(horizontal.cells);
});

test("order primitives compose with lane hints without changing item identity", () => {
  const items = [
    { id: "a", aspectRatio: 1, layoutHint: { preferredColumn: 0 } },
    { id: "b", aspectRatio: 1, layoutHint: { lockedColumn: 2 } },
  ];
  const reordered = applyOrder(items, ["b", "a"]);
  const layout = calculateMasonryLayout(reordered, verticalOptions);
  assert.deepEqual(layout.cells.map((cell) => cell.id), ["b", "a"]);
  assert.equal(layout.cells[0]?.column, 2);
  assert.equal(layout.cells[1]?.column, 0);
});

test("flow distribution remains valid with preferred and locked lanes", () => {
  const modes = ["start", "end", "center", "space-between", "space-evenly"];
  for (const flowDistribution of modes) {
    const result = calculateMasonryLayout(
      [
        { id: "anchor", aspectRatio: 1, layoutHint: { columnSpan: 3, lockedColumn: 0 } },
        { id: "left", aspectRatio: 2, layoutHint: { lockedColumn: 0 } },
        { id: "right", aspectRatio: 0.5, layoutHint: { preferredColumn: 2 } },
      ],
      { ...verticalOptions, flowDistribution },
    );
    assertNoOverlap(result.cells);
    assert.deepEqual(result.cells.map((cell) => cell.id), ["anchor", "left", "right"]);
  }
});

test("invalid hint values fail through the public item contract", () => {
  for (const hint of [
    { preferredColumn: -1 },
    { lockedColumn: -1 },
    { preferredColumn: 0.5 },
  ]) {
    assert.throws(
      () => calculateMasonryLayout([{ id: "bad", aspectRatio: 1, layoutHint: hint }], verticalOptions),
      (error) => error instanceof GridMasonryError && error.code === "INVALID_ITEM",
    );
  }
  assert.throws(
    () => calculateHorizontalMasonryLayout(
      [{ id: "bad", aspectRatio: 1, layoutHint: { lockedRow: -1 } }],
      horizontalOptions,
    ),
    (error) => error instanceof GridMasonryError && error.code === "INVALID_ITEM",
  );
});

test("hinted layouts are deterministic across repeated runs", () => {
  const items = Array.from({ length: 18 }, (_, index) => ({
    id: `item-${index}`,
    aspectRatio: 0.6 + (index % 5) * 0.4,
    layoutHint:
      index % 4 === 0
        ? { lockedColumn: index % 3 }
        : index % 3 === 0
          ? { preferredColumn: 2 }
          : index % 5 === 0
            ? { columnSpan: 2 }
            : undefined,
  }));
  const first = calculateMasonryLayout(items, verticalOptions);
  const second = calculateMasonryLayout(items, verticalOptions);
  assert.deepEqual(first, second);
  assertNoOverlap(first.cells);
});
