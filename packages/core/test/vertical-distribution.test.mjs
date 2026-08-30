import assert from "node:assert/strict";
import test from "node:test";

import {
  GridMasonryError,
  calculateMasonryLayout,
} from "../dist/index.js";

const chainOptions = {
  containerWidth: 208,
  columnGap: 8,
  rowGap: 8,
  minColumnWidth: 100,
  minColumns: 2,
  maxColumns: 2,
};

function item(id, columnSpan, height, forWidth) {
  return {
    id,
    aspectRatio: 4 / 3,
    layoutHint: { columnSpan },
    ...(forWidth === undefined
      ? {}
      : { resolvedFootprint: { height, forWidth } }),
  };
}

const chain = [
  item("top", 2, 20, 208),
  item("a", 1, 20, 100),
  item("blocker", 1, 100, 100),
  item("b", 1, 20, 100),
  item("c", 1, 20, 100),
  item("bottom", 2, 20, 208),
];

function layout(mode, items = chain, options = chainOptions) {
  return calculateMasonryLayout(items, {
    ...options,
    ...(mode === undefined ? {} : { flowDistribution: mode }),
  });
}

function assertNoOverlap(result) {
  for (let i = 0; i < result.cells.length; i += 1) {
    const a = result.cells[i];
    assert.ok(a);
    for (let j = i + 1; j < result.cells.length; j += 1) {
      const b = result.cells[j];
      assert.ok(b);
      const horizontalOverlap =
        a.x < b.x + b.width && b.x < a.x + a.width;
      if (!horizontalOverlap) continue;

      const verticalGap =
        a.y <= b.y
          ? b.y - (a.y + a.height)
          : a.y - (b.y + b.height);
      assert.ok(
        verticalGap >= result.rowGap - 1e-6,
        `${a.id} and ${b.id} violate rowGap: ${verticalGap}`,
      );
    }
  }
}

function byId(result, id) {
  const cell = result.cells.find((candidate) => candidate.id === id);
  assert.ok(cell, `missing cell ${id}`);
  return cell;
}

test("start and the omitted option preserve the M4A geometry", () => {
  const implicit = layout();
  const explicit = layout("start");

  assert.deepEqual(explicit, implicit);
  assert.deepEqual(
    implicit.cells.map(({ id, column, y, width, height }) => ({
      id,
      column,
      y,
      width,
      height,
    })),
    [
      { id: "top", column: 0, y: 0, width: 208, height: 20 },
      { id: "a", column: 0, y: 28, width: 100, height: 20 },
      { id: "blocker", column: 1, y: 28, width: 100, height: 100 },
      { id: "b", column: 0, y: 56, width: 100, height: 20 },
      { id: "c", column: 0, y: 84, width: 100, height: 20 },
      { id: "bottom", column: 0, y: 136, width: 208, height: 20 },
    ],
  );
});

test("end and center move only bounded movable items", () => {
  const end = layout("end");
  const center = layout("center");

  assert.equal(byId(end, "top").y, 0);
  assert.equal(byId(end, "bottom").y, 136);
  assert.equal(byId(end, "a").y, 52);
  assert.equal(byId(end, "b").y, 80);
  assert.equal(byId(end, "c").y, 108);
  assert.equal(byId(center, "b").y, 68);
  assert.equal(byId(center, "c").y, 96);
  assertNoOverlap(end);
  assertNoOverlap(center);
});

test("space-between and space-evenly balance a shared cross-span chain", () => {
  const between = layout("space-between");
  const evenly = layout("space-evenly");
  const betweenGaps = [
    byId(between, "a").y - (byId(between, "top").y + 20),
    byId(between, "b").y - (byId(between, "a").y + 20),
    byId(between, "c").y - (byId(between, "b").y + 20),
    byId(between, "bottom").y - (byId(between, "c").y + 20),
  ];

  assert.ok(betweenGaps.every((gap) => gap >= 8 - 1e-6));
  assert.equal(betweenGaps[0], 8);
  assert.equal(betweenGaps[3], 8);
  assert.ok(Math.abs(betweenGaps[1] - betweenGaps[2]) < 1e-5);
  assert.deepEqual(
    evenly.cells.map((cell) => cell.id),
    chain.map((entry) => entry.id),
  );
  assert.deepEqual(
    evenly.cells.map((cell) => cell.columnSpan),
    chain.map((entry) => entry.layoutHint.columnSpan),
  );
  assert.ok(Math.abs(byId(evenly, "b").y - byId(between, "b").y) < 1e-5);
  assert.equal(evenly.containerHeight, between.containerHeight);
  assertNoOverlap(between);
  assertNoOverlap(evenly);
});

test("tight bands and one-item bands have no artificial slack", () => {
  const tightItems = [item("top", 2, 20, 208), item("middle", 2, 20, 208)];
  for (const mode of ["start", "end", "center", "space-between", "space-evenly"]) {
    assert.deepEqual(layout(mode, tightItems), layout("start", tightItems));
  }

  const oneItem = [item("top", 2, 20, 208), item("only", 1, 20, 100), item("bottom", 2, 20, 208)];
  for (const mode of ["end", "center", "space-between", "space-evenly"]) {
    const result = layout(mode, oneItem);
    assert.equal(byId(result, "only").y, 28);
    assertNoOverlap(result);
  }
});

test("unbounded tail remains start-packed", () => {
  const items = [...chain, item("tail", 1, 20, 100)];
  const start = layout("start", items);
  for (const mode of ["end", "center", "space-between", "space-evenly"]) {
    const result = layout(mode, items);
    assert.equal(byId(result, "tail").y, byId(start, "tail").y);
    assertNoOverlap(result);
  }
});

test("the M5A full-span barrier remains fixed while earlier slack is redistributed", () => {
  const items = [
    item("A", 1, 180, 100),
    item("B", 2, 120, 208),
    item("C", 1, 80, 100),
    item("D", 3, 100, 316),
    item("E", 1, 160, 100),
    item("F", 2, 120, 208),
    item("G", 1, 70, 100),
  ];
  const start = calculateMasonryLayout(items, {
    containerWidth: 316,
    columnGap: 8,
    rowGap: 8,
    minColumnWidth: 100,
    minColumns: 3,
    maxColumns: 3,
  });
  const evenly = calculateMasonryLayout(items, {
    containerWidth: 316,
    columnGap: 8,
    rowGap: 8,
    minColumnWidth: 100,
    minColumns: 3,
    maxColumns: 3,
    flowDistribution: "space-evenly",
  });

  assert.equal(byId(start, "D").y, 216);
  assert.equal(byId(evenly, "D").y, 216);
  assert.equal(evenly.containerHeight, start.containerHeight);
  assert.ok(byId(evenly, "A").y > byId(start, "A").y);
  assertNoOverlap(evenly);
});

test("D/E/G/I synchronization distributes slack without per-column y values", () => {
  const items = [
    item("D", 2, 20, 208),
    item("E", 1, 100, 100),
    item("G", 1, 20, 100),
    item("I", 2, 20, 208),
  ];
  const start = layout("start", items);
  const evenly = layout("space-evenly", items);

  assert.equal(byId(start, "D").y, 0);
  assert.equal(byId(start, "I").y, 136);
  assert.equal(byId(evenly, "D").y, 0);
  assert.equal(byId(evenly, "I").y, 136);
  assert.equal(byId(evenly, "E").y, 28);
  assert.ok(byId(evenly, "G").y > byId(start, "G").y);
  assert.ok(byId(evenly, "G").y < byId(evenly, "I").y);
  assertNoOverlap(evenly);
});

test("crossing spans use one global y per item and preserve minimum gaps", () => {
  const items = [
    item("A", 1, 40, 100),
    item("B", 2, 70, 208),
    item("C", 1, 30, 100),
    item("D", 3, 45, 316),
    item("E", 1, 55, 100),
    item("F", 2, 60, 208),
    item("G", 1, 25, 100),
    item("H", 1, 35, 100),
    item("J", 1, 20, 100),
    item("I", 2, 50, 208),
    item("K", 1, 25, 100),
  ];
  const first = calculateMasonryLayout(items, {
    containerWidth: 316,
    columnGap: 8,
    rowGap: 8,
    minColumnWidth: 100,
    minColumns: 3,
    maxColumns: 3,
    flowDistribution: "space-evenly",
  });
  const second = calculateMasonryLayout(items, {
    containerWidth: 316,
    columnGap: 8,
    rowGap: 8,
    minColumnWidth: 100,
    minColumns: 3,
    maxColumns: 3,
    flowDistribution: "space-evenly",
  });

  assert.deepEqual(first, second);
  assert.deepEqual(first.cells.map((cell) => cell.id), items.map((entry) => entry.id));
  assertNoOverlap(first);
});

test("arbitrary column counts and spans remain in bounds", () => {
  for (const columnCount of [2, 3, 4, 6]) {
    const items = Array.from({ length: 24 }, (_, index) => {
      const span = (index % Math.min(4, columnCount)) + 1;
      return item(`item-${index}`, span, 30 + (index % 5) * 11, span === 1 ? 100 : undefined);
    });
    const result = calculateMasonryLayout(items, {
      containerWidth: columnCount * 100 + (columnCount - 1) * 8,
      columnGap: 8,
      rowGap: 8,
      minColumnWidth: 100,
      minColumns: columnCount,
      maxColumns: columnCount,
    flowDistribution: "center",
    });

    assert.equal(result.columnCount, columnCount);
    for (const cell of result.cells) {
      assert.ok(cell.column >= 0);
      assert.ok(cell.column + cell.columnSpan <= columnCount);
      assert.ok(cell.x >= 0);
      assert.ok(cell.x + cell.width <= result.containerWidth + 1e-7);
    }
    assertNoOverlap(result);
  }
});

test("measured whole-item heights and responsive span clamping remain Core-owned", () => {
  const desktop = calculateMasonryLayout(
    [item("wide", 2, 236, 208)],
    { ...chainOptions, flowDistribution: "space-evenly" },
  );
  const mobile = calculateMasonryLayout(
    [item("wide", 2, 236, 208)],
    {
      ...chainOptions,
      containerWidth: 100,
      minColumns: 1,
      maxColumns: 1,
      minColumnWidth: 100,
      flowDistribution: "space-evenly",
    },
  );

  assert.equal(byId(desktop, "wide").height, 236);
  assert.equal(byId(desktop, "wide").columnSpan, 2);
  assert.equal(byId(desktop, "wide").aspectRatio, 4 / 3);
  assert.equal(byId(mobile, "wide").columnSpan, 1);
  assert.ok(byId(mobile, "wide").height > 0);
  assertNoOverlap(desktop);
  assertNoOverlap(mobile);
});

test("invalid distribution values fail through Core option validation", () => {
  assert.throws(
    () => layout("space-around"),
    (error) => error instanceof GridMasonryError && error.code === "INVALID_OPTION",
  );
});
