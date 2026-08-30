import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateColumnGeometry,
  calculateMasonryLayout,
  resolveOptions,
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
    resolvedFootprint: { height, forWidth },
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

function physicalCells(result) {
  return result.cells.map(({ id, index, column, columnSpan, x, y, width, height }) => ({
    id,
    index,
    column,
    columnSpan,
    x,
    y,
    width,
    height,
  }));
}

function assertApproxEqual(actual, expected, epsilon = 1e-6) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  );
}

test("logical vertical projection preserves every M5 distribution golden", () => {
  const expected = {
    start: [0, 28, 28, 56, 84, 136],
    end: [0, 52, 28, 80, 108, 136],
    center: [0, 40, 28, 68, 96, 136],
    "space-between": [0, 28, 28, 68, 108, 136],
    "space-evenly": [0, 34, 28, 68, 102, 136],
  };

  for (const [distribution, yValues] of Object.entries(expected)) {
    const result = calculateMasonryLayout(chain, {
      ...chainOptions,
      flowDistribution: distribution,
    });

    assert.deepEqual(
      result.cells.map((cell) => cell.id),
      chain.map((entry) => entry.id),
    );
    result.cells.forEach((cell, index) => {
      assertApproxEqual(cell.y, yValues[index]);
    });
    assert.equal(result.columnCount, 2);
    assert.equal(result.columnWidth, 100);
    assert.equal(result.containerHeight, 156);
  }
});

test("logical projection preserves the M5A full-span barrier golden", () => {
  const items = [
    item("A", 1, 180, 100),
    item("B", 2, 120, 208),
    item("C", 1, 80, 100),
    item("D", 3, 100, 316),
    item("E", 1, 160, 100),
    item("F", 2, 120, 208),
    item("G", 1, 70, 100),
  ];
  const options = {
    containerWidth: 316,
    columnGap: 8,
    rowGap: 8,
    minColumnWidth: 100,
    minColumns: 3,
    maxColumns: 3,
  };
  const start = calculateMasonryLayout(items, options);
  const evenly = calculateMasonryLayout(items, {
    ...options,
    flowDistribution: "space-evenly",
  });

  assert.deepEqual(physicalCells(start), [
    { id: "A", index: 0, column: 0, columnSpan: 1, x: 0, y: 0, width: 100, height: 180 },
    { id: "B", index: 1, column: 1, columnSpan: 2, x: 108, y: 0, width: 208, height: 120 },
    { id: "C", index: 2, column: 1, columnSpan: 1, x: 108, y: 128, width: 100, height: 80 },
    { id: "D", index: 3, column: 0, columnSpan: 3, x: 0, y: 216, width: 316, height: 100 },
    { id: "E", index: 4, column: 0, columnSpan: 1, x: 0, y: 324, width: 100, height: 160 },
    { id: "F", index: 5, column: 1, columnSpan: 2, x: 108, y: 324, width: 208, height: 120 },
    { id: "G", index: 6, column: 1, columnSpan: 1, x: 108, y: 452, width: 100, height: 70 },
  ]);
  assert.equal(start.containerHeight, 522);
  assert.equal(evenly.containerHeight, start.containerHeight);
  assert.equal(evenly.cells[3]?.y, 216);
});

test("logical projection preserves crossing spans and responsive footprint behavior", () => {
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
  const desktopOptions = {
    containerWidth: 316,
    columnGap: 8,
    rowGap: 8,
    minColumnWidth: 100,
    minColumns: 3,
    maxColumns: 3,
    flowDistribution: "space-evenly",
  };
  const first = calculateMasonryLayout(items, desktopOptions);
  const second = calculateMasonryLayout(items, desktopOptions);
  assert.deepEqual(first, second);
  assert.deepEqual(first.cells.map((cell) => cell.id), items.map((entry) => entry.id));

  const mobile = calculateMasonryLayout(items, {
    ...desktopOptions,
    containerWidth: 100,
    minColumns: 1,
    maxColumns: 1,
  });
  assert.equal(mobile.columnCount, 1);
  assert.ok(mobile.cells.every((cell) => cell.column === 0 && cell.columnSpan === 1));
  assert.equal(mobile.cells[1]?.height, 75);
});

function legacyStartLayout(items, options) {
  const resolved = resolveOptions(options);
  const geometry = calculateColumnGeometry(resolved);
  const columnHeights = Array(geometry.columnCount).fill(0);
  const cells = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const requestedSpan = item.layoutHint?.columnSpan ?? 1;
    const span = Math.min(requestedSpan, geometry.columnCount);
    let column = 0;
    let y = Number.POSITIVE_INFINITY;

    for (let start = 0; start <= geometry.columnCount - span; start += 1) {
      let candidateY = 0;
      for (let offset = 0; offset < span; offset += 1) {
        candidateY = Math.max(candidateY, columnHeights[start + offset]);
      }
      if (candidateY < y) {
        column = start;
        y = candidateY;
      }
    }

    const width = geometry.columnWidth * span + resolved.columnGap * (span - 1);
    const footprint = item.resolvedFootprint;
    const difference = footprint === undefined ? Infinity : Math.abs(footprint.forWidth - width);
    const scale = footprint === undefined ? 0 : Math.max(Math.abs(footprint.forWidth), Math.abs(width));
    const current = footprint !== undefined && difference <= Math.max(1e-7, 1e-7 * scale);
    const height = current ? footprint.height : width / item.aspectRatio;
    const x = geometry.contentOffsetX + column * (geometry.columnWidth + resolved.columnGap);

    cells.push({ id: item.id, index, column, columnSpan: span, x, y, width, height, aspectRatio: item.aspectRatio });
    const nextBottom = y + height + resolved.rowGap;
    for (let offset = 0; offset < span; offset += 1) {
      columnHeights[column + offset] = nextBottom;
    }
  }

  return { cells };
}

test("randomized vertical start output equals the pre-F1B reference", () => {
  let seed = 0x1f1b;
  const nextRandom = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };

  for (let caseIndex = 0; caseIndex < 120; caseIndex += 1) {
    const columnCount = 2 + Math.floor(nextRandom() * 5);
    const columnGap = 4 + Math.floor(nextRandom() * 9);
    const rowGap = 3 + Math.floor(nextRandom() * 10);
    const items = Array.from({ length: 18 }, (_, index) => {
      const span = 1 + Math.floor(nextRandom() * Math.min(4, columnCount));
      const aspectRatio = 0.6 + nextRandom() * 1.8;
      const itemValue = {
        id: `random-${caseIndex}-${index}`,
        aspectRatio,
        layoutHint: { columnSpan: span },
      };
      if (nextRandom() < 0.45) {
        const width = 100 * span + columnGap * (span - 1);
        itemValue.resolvedFootprint = {
          height: 30 + nextRandom() * 180,
          forWidth: width,
        };
      }
      return itemValue;
    });
    const options = {
      containerWidth: columnCount * 100 + columnGap * (columnCount - 1),
      columnGap,
      rowGap,
      minColumnWidth: 100,
      minColumns: columnCount,
      maxColumns: columnCount,
    };

    const actual = calculateMasonryLayout(items, options);
    const expected = legacyStartLayout(items, options);
    assert.deepEqual(actual.cells, expected.cells, `random case ${caseIndex}`);
  }
});
