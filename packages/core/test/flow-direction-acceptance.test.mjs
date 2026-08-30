import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateFlowAnchorDelta,
  calculateHorizontalMasonryLayout,
  calculateMasonryLayout,
  createFlowRangeIndex,
  createMasonryState,
  queryVirtualizedCells,
  queryVirtualizedReference,
  queryVisibleFlowCells,
} from "../dist/index.js";
import { createHorizontalAppendLayoutState } from "../dist/horizontal-layout.js";
import { createVerticalAppendLayoutState } from "../dist/layout.js";

const distributions = ["start", "end", "center", "space-between", "space-evenly"];
const NUMERIC_EPSILON = 1e-9;

function assertClose(actual, expected) {
  assert.ok(Math.abs(actual - expected) <= NUMERIC_EPSILON, `${actual} is not close to ${expected}`);
}

function assertNoOverlap(cells) {
  for (let left = 0; left < cells.length; left += 1) {
    for (let right = left + 1; right < cells.length; right += 1) {
      const a = cells[left];
      const b = cells[right];
      assert.equal(
        a.x < b.x + b.width && b.x < a.x + a.width
          && a.y < b.y + b.height && b.y < a.y + a.height,
        false,
      );
    }
  }
}

function assertFiniteGeometry(cells) {
  for (const cell of cells) {
    for (const value of [cell.x, cell.y, cell.width, cell.height]) {
      assert.equal(Number.isFinite(value), true);
      assert.equal(value >= 0, true);
    }
  }
}

function assertMirror(forward, reverse, axis) {
  const reverseById = new Map(reverse.cells.map((cell) => [cell.id, cell]));
  assert.deepEqual(reverse.cells.map((cell) => cell.id), forward.cells.map((cell) => cell.id));
  assert.deepEqual(reverse.cells.map((cell) => cell.index), forward.cells.map((cell) => cell.index));
  for (const cell of forward.cells) {
    const mirrored = reverseById.get(cell.id);
    assert.ok(mirrored);
    assert.equal(mirrored.index, cell.index);
    assert.equal(axis === "vertical" ? mirrored.column : mirrored.row, axis === "vertical" ? cell.column : cell.row);
    assert.equal(axis === "vertical" ? mirrored.columnSpan : mirrored.rowSpan, axis === "vertical" ? cell.columnSpan : cell.rowSpan);
    assertClose(mirrored.width, cell.width);
    assertClose(mirrored.height, cell.height);
    if (axis === "vertical") {
      assertClose(mirrored.x, cell.x);
      assertClose(mirrored.y, forward.containerHeight - cell.y - cell.height);
    } else {
      assertClose(mirrored.y, cell.y);
      assertClose(mirrored.x, forward.containerWidth - cell.x - cell.width);
    }
  }
  assertNoOverlap(reverse.cells);
  assertFiniteGeometry(reverse.cells);
}

function verticalPlacementItems() {
  const items = [
    { id: "locked", aspectRatio: 1, layoutHint: { lockedColumn: 2 } },
    { id: "preferred", aspectRatio: 2, layoutHint: { preferredColumn: 0 } },
    { id: "span", aspectRatio: 0.8, layoutHint: { columnSpan: 2 } },
    { id: "full", aspectRatio: 1, layoutHint: { columnSpan: 99 } },
  ];
  const options = {
    containerWidth: 640,
    minColumnWidth: 140,
    minColumns: 3,
    maxColumns: 3,
    gap: 10,
  };
  const seed = calculateMasonryLayout(items, options);
  const spanCell = seed.cells.find((cell) => cell.id === "span");
  return {
    items: items.map((item) => item.id === "span"
      ? {
        ...item,
        resolvedFootprint: { height: spanCell.height, forWidth: spanCell.width },
      }
      : item),
    options,
  };
}

function horizontalPlacementItems() {
  const items = [
    { id: "locked", aspectRatio: 1, layoutHint: { lockedRow: 2 } },
    { id: "preferred", aspectRatio: 2, layoutHint: { preferredRow: 0 } },
    { id: "span", aspectRatio: 0.8, layoutHint: { rowSpan: 2 } },
    { id: "full", aspectRatio: 1, layoutHint: { rowSpan: 99 } },
  ];
  const options = {
    containerHeight: 640,
    minRowHeight: 140,
    minRows: 3,
    maxRows: 3,
    gap: 10,
  };
  const seed = calculateHorizontalMasonryLayout(items, options);
  const spanCell = seed.cells.find((cell) => cell.id === "span");
  return {
    items: items.map((item) => item.id === "span"
      ? {
        ...item,
        resolvedFootprint: { width: spanCell.width, forHeight: spanCell.height },
      }
      : item),
    options,
  };
}

test("reverse preserves preferred/locked lanes, spans, full spans, and fresh footprints", () => {
  const vertical = verticalPlacementItems();
  const horizontal = horizontalPlacementItems();
  for (const flowDistribution of distributions) {
    assertMirror(
      calculateMasonryLayout(vertical.items, { ...vertical.options, flowDistribution, flowDirection: "forward" }),
      calculateMasonryLayout(vertical.items, { ...vertical.options, flowDistribution, flowDirection: "reverse" }),
      "vertical",
    );
    assertMirror(
      calculateHorizontalMasonryLayout(horizontal.items, { ...horizontal.options, flowDistribution, flowDirection: "forward" }),
      calculateHorizontalMasonryLayout(horizontal.items, { ...horizontal.options, flowDistribution, flowDirection: "reverse" }),
      "horizontal",
    );
  }
});

test("reverse normalizes locked and spanned lanes after responsive lane-count changes", () => {
  const verticalItems = [
    { id: "locked", aspectRatio: 1, layoutHint: { lockedColumn: 4, columnSpan: 3 } },
    { id: "span", aspectRatio: 1, layoutHint: { columnSpan: 4 } },
  ];
  const verticalOptions = { containerWidth: 320, minColumnWidth: 140, minColumns: 1, maxColumns: 1, gap: 8 };
  const verticalForward = calculateMasonryLayout(verticalItems, { ...verticalOptions, flowDirection: "forward" });
  const verticalReverse = calculateMasonryLayout(verticalItems, { ...verticalOptions, flowDirection: "reverse" });
  assertMirror(verticalForward, verticalReverse, "vertical");
  assert.deepEqual(verticalReverse.cells.map((cell) => [cell.column, cell.columnSpan]), [[0, 1], [0, 1]]);

  const horizontalItems = [
    { id: "locked", aspectRatio: 1, layoutHint: { lockedRow: 4, rowSpan: 3 } },
    { id: "span", aspectRatio: 1, layoutHint: { rowSpan: 4 } },
  ];
  const horizontalOptions = { containerHeight: 320, minRowHeight: 140, minRows: 1, maxRows: 1, gap: 8 };
  const horizontalForward = calculateHorizontalMasonryLayout(horizontalItems, { ...horizontalOptions, flowDirection: "forward" });
  const horizontalReverse = calculateHorizontalMasonryLayout(horizontalItems, { ...horizontalOptions, flowDirection: "reverse" });
  assertMirror(horizontalForward, horizontalReverse, "horizontal");
  assert.deepEqual(horizontalReverse.cells.map((cell) => [cell.row, cell.rowSpan]), [[0, 1], [0, 1]]);
});

test("reverse snapshot interaction is stale-safe and atomic in both axes", () => {
  const cases = [
    {
      axis: "vertical",
      items: [{ id: "a", aspectRatio: 1 }, { id: "b", aspectRatio: 2 }],
      options: { containerWidth: 320, minColumnWidth: 140, minColumns: 2, maxColumns: 2, flowDirection: "forward" },
      reverse: { containerWidth: 320, minColumnWidth: 140, minColumns: 2, maxColumns: 2, flowDirection: "reverse" },
    },
    {
      axis: "horizontal",
      items: [{ id: "a", aspectRatio: 1 }, { id: "b", aspectRatio: 2 }],
      options: { containerHeight: 320, minRowHeight: 140, minRows: 2, maxRows: 2, flowDirection: "forward" },
      reverse: { containerHeight: 320, minRowHeight: 140, minRows: 2, maxRows: 2, flowDirection: "reverse" },
    },
  ];
  for (const input of cases) {
    const state = createMasonryState({ axis: input.axis, items: input.items, options: input.options });
    const checkpoint = state.snapshot();
    state.resize(input.reverse);
    const before = state.inspect();
    assert.throws(() => state.restore(checkpoint), (error) => error.code === "INVALID_OPTION");
    assert.deepEqual(state.inspect(), before);

    const reverseState = createMasonryState({ axis: input.axis, items: input.items, options: input.reverse });
    const reverseCheckpoint = reverseState.snapshot();
    assert.deepEqual(reverseState.restore(reverseCheckpoint), reverseCheckpoint.layout);
    reverseState.resize(input.options);
    reverseState.resize(input.reverse);
    assert.deepEqual(reverseState.restore(reverseCheckpoint), reverseCheckpoint.layout);
    const tampered = reverseState.snapshot();
    const flowKey = input.axis === "vertical" ? "y" : "x";
    tampered.layout.cells[0][flowKey] += 1;
    const stableBefore = reverseState.inspect();
    assert.throws(() => reverseState.restore(tampered), (error) => error.code === "INVALID_OPTION");
    assert.deepEqual(reverseState.inspect(), stableBefore);
  }
});

test("stable reverse reflow composes with locks, mutation, and both axes", () => {
  const verticalInput = {
    axis: "vertical",
    items: [
      { id: "a", aspectRatio: 1 },
      { id: "locked", aspectRatio: 1, layoutHint: { lockedColumn: 2 } },
      { id: "c", aspectRatio: 1 },
      { id: "d", aspectRatio: 0.8 },
    ],
    options: { containerWidth: 620, minColumnWidth: 180, minColumns: 3, maxColumns: 3, gap: 8, flowDirection: "reverse" },
    reflowStrategy: "stable",
  };
  const vertical = createMasonryState(verticalInput);
  vertical.remove("a");
  vertical.update({ id: "d", aspectRatio: 1.2 });
  assert.equal(vertical.layout.cells.find((cell) => cell.id === "locked")?.column, 2);
  assertNoOverlap(vertical.layout.cells);
  const verticalRepeat = createMasonryState(verticalInput);
  verticalRepeat.remove("a");
  verticalRepeat.update({ id: "d", aspectRatio: 1.2 });
  assert.deepEqual(vertical.layout, verticalRepeat.layout);

  const horizontalInput = {
    axis: "horizontal",
    items: [
      { id: "a", aspectRatio: 1 },
      { id: "locked", aspectRatio: 1, layoutHint: { lockedRow: 2 } },
      { id: "c", aspectRatio: 1 },
      { id: "d", aspectRatio: 0.8 },
    ],
    options: { containerHeight: 620, minRowHeight: 180, minRows: 3, maxRows: 3, gap: 8, flowDirection: "reverse" },
    reflowStrategy: "stable",
  };
  const horizontal = createMasonryState(horizontalInput);
  horizontal.remove("a");
  horizontal.reorder(["d", "locked", "c"]);
  assert.equal(horizontal.layout.cells.find((cell) => cell.id === "locked")?.row, 2);
  assertNoOverlap(horizontal.layout.cells);
  const horizontalRepeat = createMasonryState(horizontalInput);
  horizontalRepeat.remove("a");
  horizontalRepeat.reorder(["d", "locked", "c"]);
  assert.deepEqual(horizontal.layout, horizontalRepeat.layout);
});

test("reverse anchor deltas use final physical flow coordinates and preserve sign", () => {
  const verticalItems = [{ id: "anchor", aspectRatio: 1 }, { id: "other", aspectRatio: 2 }];
  const verticalForward = calculateMasonryLayout(verticalItems, { containerWidth: 320, minColumnWidth: 140, minColumns: 2, maxColumns: 2, flowDirection: "forward" });
  const verticalReverse = calculateMasonryLayout(verticalItems, { containerWidth: 320, minColumnWidth: 140, minColumns: 2, maxColumns: 2, flowDirection: "reverse" });
  const vForwardToReverse = calculateFlowAnchorDelta(verticalForward, verticalReverse, "anchor");
  const vReverseToForward = calculateFlowAnchorDelta(verticalReverse, verticalForward, "anchor");
  assertClose(vForwardToReverse.delta, -vReverseToForward.delta);
  assertClose(vForwardToReverse.delta, verticalReverse.cells[0].y - verticalForward.cells[0].y);

  const horizontalItems = [{ id: "anchor", aspectRatio: 1 }, { id: "other", aspectRatio: 2 }];
  const horizontalForward = calculateHorizontalMasonryLayout(horizontalItems, { containerHeight: 320, minRowHeight: 140, minRows: 2, maxRows: 2, flowDirection: "forward" });
  const horizontalReverse = calculateHorizontalMasonryLayout(horizontalItems, { containerHeight: 320, minRowHeight: 140, minRows: 2, maxRows: 2, flowDirection: "reverse" });
  const hForwardToReverse = calculateFlowAnchorDelta(horizontalForward, horizontalReverse, "anchor");
  const hReverseToForward = calculateFlowAnchorDelta(horizontalReverse, horizontalForward, "anchor");
  assertClose(hForwardToReverse.delta, -hReverseToForward.delta);
  assertClose(hForwardToReverse.delta, horizontalReverse.cells[0].x - horizontalForward.cells[0].x);
});

function expectedFlowCells(layout, range) {
  return layout.cells.filter((cell) => {
    const start = "column" in cell ? cell.y : cell.x;
    const end = start + ("column" in cell ? cell.height : cell.width);
    return end >= range.start && start <= range.end;
  });
}

test("linear and indexed reverse flow queries use final coordinates and source order", () => {
  const layouts = [
    calculateMasonryLayout(Array.from({ length: 24 }, (_, index) => ({ id: `v-${index}`, aspectRatio: 0.6 + (index % 5) / 3 })), {
      containerWidth: 720, minColumnWidth: 150, minColumns: 3, maxColumns: 4, gap: 8, flowDirection: "reverse",
    }),
    calculateHorizontalMasonryLayout(Array.from({ length: 24 }, (_, index) => ({ id: `h-${index}`, aspectRatio: 0.6 + (index % 5) / 3 })), {
      containerHeight: 720, minRowHeight: 150, minRows: 3, maxRows: 4, gap: 8, flowDirection: "reverse",
    }),
  ];
  for (const layout of layouts) {
    const extent = "columnCount" in layout ? layout.containerHeight : layout.containerWidth;
    const ranges = [
      { start: 0, end: 0 },
      { start: 1, end: Math.min(160, extent) },
      { start: Math.max(0, extent - 160), end: extent },
      { start: extent + 1, end: extent + 2 },
      { start: 0, end: extent },
    ];
    const index = createFlowRangeIndex(layout);
    for (const range of ranges) {
      const expected = expectedFlowCells(layout, range);
      assert.deepEqual(queryVisibleFlowCells(layout, range), expected);
      assert.deepEqual(index.query(range), expected);
      assert.deepEqual(index.query(range).map((cell) => cell.index), expected.map((cell) => cell.index));
    }
  }
});

test("reverse indexed virtualization matches the linear reference in both axes", () => {
  const layouts = [
    calculateMasonryLayout(Array.from({ length: 40 }, (_, index) => ({ id: `v-${index}`, aspectRatio: 0.7 + (index % 4) / 4 })), {
      containerWidth: 720, minColumnWidth: 150, minColumns: 3, maxColumns: 4, gap: 8, flowDirection: "reverse",
    }),
    calculateHorizontalMasonryLayout(Array.from({ length: 40 }, (_, index) => ({ id: `h-${index}`, aspectRatio: 0.7 + (index % 4) / 4 })), {
      containerHeight: 720, minRowHeight: 150, minRows: 3, maxRows: 4, gap: 8, flowDirection: "reverse",
    }),
  ];
  for (const layout of layouts) {
    const extent = "columnCount" in layout ? layout.containerHeight : layout.containerWidth;
    const index = createFlowRangeIndex(layout);
    for (const start of [0, 40, Math.max(0, extent - 240), extent + 1]) {
      const range = { start, end: Math.min(extent + 20, start + 180) };
      const indexed = queryVirtualizedCells(layout, range, { overscan: 35 }, index);
      const reference = queryVirtualizedReference(layout, range, { overscan: 35 });
      assert.deepEqual(indexed, reference);
      assert.deepEqual(indexed.indexes, [...indexed.indexes].sort((a, b) => a - b));
    }
  }
});

test("reverse append creators explicitly fall back while state remains equivalent", () => {
  assert.equal(createVerticalAppendLayoutState([], { containerWidth: 320, minColumnWidth: 140, flowDirection: "reverse" }), undefined);
  assert.equal(createHorizontalAppendLayoutState([], { containerHeight: 320, minRowHeight: 140, flowDirection: "reverse" }), undefined);
  const vertical = createMasonryState({ axis: "vertical", items: [{ id: "a", aspectRatio: 1 }], options: { containerWidth: 320, minColumnWidth: 140, flowDirection: "reverse" } });
  const horizontal = createMasonryState({ axis: "horizontal", items: [{ id: "a", aspectRatio: 1 }], options: { containerHeight: 320, minRowHeight: 140, flowDirection: "reverse" } });
  assert.deepEqual(vertical.append({ id: "b", aspectRatio: 2 }), calculateMasonryLayout([{ id: "a", aspectRatio: 1 }, { id: "b", aspectRatio: 2 }], vertical.inspect().options));
  assert.deepEqual(horizontal.append({ id: "b", aspectRatio: 2 }), calculateHorizontalMasonryLayout([{ id: "a", aspectRatio: 1 }, { id: "b", aspectRatio: 2 }], horizontal.inspect().options));
});

function nextRandom(seed) {
  return (seed * 1664525 + 1013904223) >>> 0;
}

test("seeded reverse differential property preserves logical geometry in both axes", () => {
  for (const axis of ["vertical", "horizontal"]) {
    for (let fixture = 0; fixture < 10; fixture += 1) {
      let seed = 0x13579bdf + fixture * 97;
      const items = [];
      for (let index = 0; index < 9; index += 1) {
        seed = nextRandom(seed);
        const ratio = 0.55 + (seed % 190) / 100;
        seed = nextRandom(seed);
        const span = 1 + (seed % 3);
        const layoutHint = axis === "vertical"
          ? { columnSpan: span, ...(index === 0 ? { lockedColumn: 3 } : index === 1 ? { preferredColumn: 0 } : {}) }
          : { rowSpan: span, ...(index === 0 ? { lockedRow: 3 } : index === 1 ? { preferredRow: 0 } : {}) };
        items.push({ id: `${axis}-${fixture}-${index}`, aspectRatio: ratio, layoutHint });
      }
      for (const flowDistribution of distributions) {
        const options = axis === "vertical"
          ? { containerWidth: 820, minColumnWidth: 160, minColumns: 4, maxColumns: 4, gap: 9, flowDistribution }
          : { containerHeight: 820, minRowHeight: 160, minRows: 4, maxRows: 4, gap: 9, flowDistribution };
        const calculate = axis === "vertical" ? calculateMasonryLayout : calculateHorizontalMasonryLayout;
        const seedLayout = calculate(items, { ...options, flowDirection: "forward" });
        const footprintCell = seedLayout.cells[2];
        const itemsWithFootprint = items.map((item, itemIndex) => itemIndex !== 2
          ? item
          : {
            ...item,
            resolvedFootprint: axis === "vertical"
              ? { height: footprintCell.height, forWidth: footprintCell.width }
              : { width: footprintCell.width, forHeight: footprintCell.height },
          });
        const forward = calculate(itemsWithFootprint, { ...options, flowDirection: "forward" });
        const reverse = calculate(itemsWithFootprint, { ...options, flowDirection: "reverse" });
        assertMirror(forward, reverse, axis);
        assert.deepEqual(reverse, calculate(itemsWithFootprint, { ...options, flowDirection: "reverse" }));
      }
    }
  }
});
