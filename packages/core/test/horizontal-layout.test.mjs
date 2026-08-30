import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateHorizontalMasonryLayout,
  calculateMasonryLayout,
} from "../dist/index.js";

const chainOptions = {
  containerHeight: 208,
  rowGap: 8,
  columnGap: 8,
  minRowHeight: 100,
  minRows: 2,
  maxRows: 2,
};

function horizontalItem(id, rowSpan, width, forHeight, aspectRatio = 4 / 3) {
  return {
    id,
    aspectRatio,
    layoutHint: { rowSpan },
    resolvedFootprint: { width, forHeight },
  };
}

const horizontalChain = [
  horizontalItem("top", 2, 20, 208),
  horizontalItem("a", 1, 20, 100),
  horizontalItem("blocker", 1, 100, 100),
  horizontalItem("b", 1, 20, 100),
  horizontalItem("c", 1, 20, 100),
  horizontalItem("bottom", 2, 20, 208),
];

function physicalCells(result) {
  return result.cells.map(({ id, index, row, rowSpan, x, y, width, height }) => ({
    id,
    index,
    row,
    rowSpan,
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

test("horizontal single-lane layout preserves physical aspect ratio", () => {
  const result = calculateHorizontalMasonryLayout(
    [{ id: "item", aspectRatio: 2 }],
    {
      containerHeight: 100,
      minRowHeight: 100,
      minRows: 1,
      maxRows: 1,
    },
  );

  assert.equal(result.rowCount, 1);
  assert.equal(result.rowHeight, 100);
  assert.equal(result.containerHeight, 100);
  assert.equal(result.containerWidth, 200);
  assert.deepEqual(physicalCells(result), [
    { id: "item", index: 0, row: 0, rowSpan: 1, x: 0, y: 0, width: 200, height: 100 },
  ]);
});

test("horizontal flow distributions transpose the vertical golden chain", () => {
  const expectedWidths = [20, 20, 100, 20, 20, 20];
  const expectedX = {
    start: [0, 28, 28, 56, 84, 136],
    end: [0, 52, 28, 80, 108, 136],
    center: [0, 40, 28, 68, 96, 136],
    "space-between": [0, 28, 28, 68, 108, 136],
    "space-evenly": [0, 34, 28, 68, 102, 136],
  };

  for (const flowDistribution of [
    "start",
    "end",
    "center",
    "space-between",
    "space-evenly",
  ]) {
    const result = calculateHorizontalMasonryLayout(horizontalChain, {
      ...chainOptions,
      flowDistribution,
    });

    assert.equal(result.rowCount, 2);
    assert.equal(result.rowHeight, 100);
    assert.equal(result.containerHeight, 208);
    assert.equal(result.containerWidth, 156);
    assert.deepEqual(result.cells.map((cell) => cell.id), horizontalChain.map((item) => item.id));
    result.cells.forEach((cell, index) => {
      assertApproxEqual(cell.x, expectedX[flowDistribution][index]);
    });
    assert.deepEqual(result.cells.map((cell) => cell.y), [0, 0, 108, 0, 0, 0]);
    assert.deepEqual(result.cells.map((cell) => cell.width), expectedWidths);
    assert.deepEqual(result.cells.map((cell) => cell.height), [208, 100, 100, 100, 100, 208]);
  }
});

test("horizontal row spans clamp and full-row spans synchronize all lanes", () => {
  const mobile = calculateHorizontalMasonryLayout(
    [horizontalItem("mobile", 3, 50, 100)],
    {
      containerHeight: 100,
      minRowHeight: 100,
      minRows: 1,
      maxRows: 1,
    },
  );
  assert.equal(mobile.cells[0]?.row, 0);
  assert.equal(mobile.cells[0]?.rowSpan, 1);
  assert.equal(mobile.cells[0]?.height, 100);

  const desktop = calculateHorizontalMasonryLayout(
    [
      horizontalItem("a", 1, 40, 100),
      horizontalItem("full", 3, 60, 316),
      horizontalItem("b", 1, 30, 100),
    ],
    {
      containerHeight: 316,
      rowGap: 8,
      columnGap: 10,
      minRowHeight: 100,
      minRows: 3,
      maxRows: 3,
    },
  );
  assert.equal(desktop.cells[1]?.row, 0);
  assert.equal(desktop.cells[1]?.rowSpan, 3);
  assert.equal(desktop.cells[1]?.height, 316);
  assert.equal(desktop.cells[2]?.x, 120);
});

test("preferred row wins only an otherwise equivalent lane tie", () => {
  const result = calculateHorizontalMasonryLayout(
    [{ id: "a", aspectRatio: 1, layoutHint: { preferredRow: 1 } }],
    { containerHeight: 200, minRowHeight: 90, minRows: 2, maxRows: 2 },
  );
  assert.equal(result.cells[0]?.row, 1);
});

test("locked row is normalized and prevents alternate-row placement", () => {
  const result = calculateHorizontalMasonryLayout(
    [{ id: "a", aspectRatio: 1, layoutHint: { lockedRow: 99 } }],
    { containerHeight: 200, minRowHeight: 90, minRows: 2, maxRows: 2 },
  );
  assert.equal(result.cells[0]?.row, 1);
});

test("horizontal footprint uses forHeight and falls back when stale", () => {
  const fresh = calculateHorizontalMasonryLayout(
    [horizontalItem("fresh", 1, 260, 100, 2)],
    {
      containerHeight: 100,
      minRowHeight: 100,
      minRows: 1,
      maxRows: 1,
    },
  );
  const stale = calculateHorizontalMasonryLayout(
    [horizontalItem("stale", 1, 260, 101, 2)],
    {
      containerHeight: 100,
      minRowHeight: 100,
      minRows: 1,
      maxRows: 1,
    },
  );

  assert.equal(fresh.cells[0]?.width, 260);
  assert.equal(fresh.cells[0]?.height, 100);
  assert.equal(stale.cells[0]?.width, 200);
  assert.equal(stale.cells[0]?.height, 100);
});

test("horizontal cap sizing aligns the fixed cross axis", () => {
  const result = calculateHorizontalMasonryLayout(
    [{ id: "item", aspectRatio: 1 }],
    {
      containerHeight: 400,
      rowGap: 10,
      minRowHeight: 100,
      minRows: 3,
      maxRows: 3,
      maxRowHeight: 100,
      rowSizing: "cap",
      rowAlignment: "center",
    },
  );

  assert.equal(result.rowCount, 3);
  assert.equal(result.rowHeight, 100);
  assert.equal(result.contentHeight, 320);
  assert.equal(result.contentOffsetY, 40);
  assert.equal(result.cells[0]?.y, 40);
});

test("horizontal empty layout has no flow extent", () => {
  const result = calculateHorizontalMasonryLayout([], {
    containerHeight: 200,
    minRowHeight: 100,
  });

  assert.equal(result.containerWidth, 0);
  assert.equal(result.contentWidth, 0);
  assert.deepEqual(result.cells, []);
});

test("horizontal physical geometry is the transpose of vertical geometry", () => {
  const verticalItems = [
    {
      id: "top",
      aspectRatio: 4 / 3,
      layoutHint: { columnSpan: 2 },
      resolvedFootprint: { height: 20, forWidth: 208 },
    },
    {
      id: "a",
      aspectRatio: 4 / 3,
      layoutHint: { columnSpan: 1 },
      resolvedFootprint: { height: 20, forWidth: 100 },
    },
    {
      id: "blocker",
      aspectRatio: 4 / 3,
      layoutHint: { columnSpan: 1 },
      resolvedFootprint: { height: 100, forWidth: 100 },
    },
    {
      id: "b",
      aspectRatio: 4 / 3,
      layoutHint: { columnSpan: 1 },
      resolvedFootprint: { height: 20, forWidth: 100 },
    },
    {
      id: "c",
      aspectRatio: 4 / 3,
      layoutHint: { columnSpan: 1 },
      resolvedFootprint: { height: 20, forWidth: 100 },
    },
    {
      id: "bottom",
      aspectRatio: 4 / 3,
      layoutHint: { columnSpan: 2 },
      resolvedFootprint: { height: 20, forWidth: 208 },
    },
  ];
  const verticalOptions = {
    containerWidth: 208,
    columnGap: 8,
    rowGap: 8,
    minColumnWidth: 100,
    minColumns: 2,
    maxColumns: 2,
  };

  for (const flowDistribution of [
    "start",
    "end",
    "center",
    "space-between",
    "space-evenly",
  ]) {
    const vertical = calculateMasonryLayout(verticalItems, {
      ...verticalOptions,
      flowDistribution,
    });
    const horizontal = calculateHorizontalMasonryLayout(
      horizontalChain,
      { ...chainOptions, flowDistribution },
    );

    assert.equal(horizontal.containerWidth, vertical.containerHeight);
    assert.equal(horizontal.containerHeight, vertical.containerWidth);
    horizontal.cells.forEach((cell, index) => {
      const verticalCell = vertical.cells[index];
      assert.ok(verticalCell);
      assert.equal(cell.id, verticalCell.id);
      assert.equal(cell.row, verticalCell.column);
      assert.equal(cell.rowSpan, verticalCell.columnSpan);
      assert.equal(cell.x, verticalCell.y);
      assert.equal(cell.y, verticalCell.x);
      assert.equal(cell.width, verticalCell.height);
      assert.equal(cell.height, verticalCell.width);
    });
  }
});

test("horizontal mixed spans are deterministic and do not overlap", () => {
  let seed = 0xF1C;
  const nextRandom = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };

  for (let caseIndex = 0; caseIndex < 100; caseIndex += 1) {
    const rowCount = 2 + Math.floor(nextRandom() * 4);
    const rowGap = 3 + Math.floor(nextRandom() * 8);
    const columnGap = 4 + Math.floor(nextRandom() * 8);
    const items = Array.from({ length: 16 }, (_, index) => {
      const rowSpan = 1 + Math.floor(nextRandom() * Math.min(4, rowCount));
      return {
        id: `horizontal-${caseIndex}-${index}`,
        aspectRatio: 0.6 + nextRandom() * 1.8,
        layoutHint: { rowSpan },
      };
    });
    const options = {
      containerHeight: rowCount * 100 + rowGap * (rowCount - 1),
      rowGap,
      columnGap,
      minRowHeight: 100,
      minRows: rowCount,
      maxRows: rowCount,
    };

    for (const flowDistribution of [
      "start",
      "end",
      "center",
      "space-between",
      "space-evenly",
    ]) {
      const result = calculateHorizontalMasonryLayout(items, {
        ...options,
        flowDistribution,
      });
      const replay = calculateHorizontalMasonryLayout(items, {
        ...options,
        flowDistribution,
      });
      assert.deepEqual(result, replay, `case ${caseIndex} ${flowDistribution}`);
      assert.equal(result.cells.length, items.length);

      for (const cell of result.cells) {
        assert.ok(Number.isFinite(cell.x));
        assert.ok(Number.isFinite(cell.y));
        assert.ok(cell.row >= 0 && cell.row + cell.rowSpan <= result.rowCount);
        assert.ok(cell.width > 0 && cell.height > 0);
      }

      for (let left = 0; left < result.cells.length; left += 1) {
        const first = result.cells[left];
        for (let right = left + 1; right < result.cells.length; right += 1) {
          const second = result.cells[right];
          const rowsOverlap =
            first.y < second.y + second.height &&
            second.y < first.y + first.height;
          const flowsOverlap =
            first.x < second.x + second.width &&
            second.x < first.x + first.width;
          assert.ok(!(rowsOverlap && flowsOverlap), `overlap in case ${caseIndex}`);
        }
      }
    }
  }
});

test("horizontal input validation names horizontal properties", () => {
  assert.throws(
    () => calculateHorizontalMasonryLayout([], {
      containerHeight: 0,
      minRowHeight: 100,
    }),
    /containerHeight/,
  );
  assert.throws(
    () => calculateHorizontalMasonryLayout([
      { id: "bad", aspectRatio: 1, layoutHint: { rowSpan: 0 } },
    ], {
      containerHeight: 100,
      minRowHeight: 100,
    }),
    /rowSpan/,
  );
  assert.throws(
    () => calculateHorizontalMasonryLayout([
      {
        id: "bad-footprint",
        aspectRatio: 1,
        resolvedFootprint: { width: 0, forHeight: 100 },
      },
    ], {
      containerHeight: 100,
      minRowHeight: 100,
    }),
    /resolvedFootprint\.width/,
  );
});
