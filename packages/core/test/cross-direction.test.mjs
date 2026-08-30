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
const EPSILON = 1e-9;

function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) <= EPSILON, `${actual} is not close to ${expected}`);
}

function noOverlap(cells) {
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

function assertCrossMirror(forward, reverse, axis) {
  assert.deepEqual(reverse.cells.map((cell) => cell.id), forward.cells.map((cell) => cell.id));
  assert.deepEqual(reverse.cells.map((cell) => cell.index), forward.cells.map((cell) => cell.index));
  const reverseById = new Map(reverse.cells.map((cell) => [cell.id, cell]));
  for (const cell of forward.cells) {
    const mirrored = reverseById.get(cell.id);
    assert.ok(mirrored);
    close(mirrored.width, cell.width);
    close(mirrored.height, cell.height);
    if (axis === "vertical") {
      close(mirrored.x, forward.containerWidth - cell.x - cell.width);
      close(mirrored.y, cell.y);
      assert.equal(mirrored.column, cell.column);
      assert.equal(mirrored.columnSpan, cell.columnSpan);
    } else {
      close(mirrored.y, forward.containerHeight - cell.y - cell.height);
      close(mirrored.x, cell.x);
      assert.equal(mirrored.row, cell.row);
      assert.equal(mirrored.rowSpan, cell.rowSpan);
    }
  }
  noOverlap(reverse.cells);
}

const verticalItems = [
  { id: "locked", aspectRatio: 1, layoutHint: { lockedColumn: 2 } },
  { id: "preferred", aspectRatio: 2, layoutHint: { preferredColumn: 0 } },
  { id: "span", aspectRatio: 0.8, layoutHint: { columnSpan: 2 } },
  { id: "full", aspectRatio: 1, layoutHint: { columnSpan: 99 } },
];
const verticalOptions = {
  containerWidth: 640,
  minColumnWidth: 140,
  minColumns: 3,
  maxColumns: 3,
  gap: 10,
};
const horizontalItems = verticalItems.map((item) => ({
  id: item.id,
  aspectRatio: item.aspectRatio,
  layoutHint: {
    ...(item.layoutHint.columnSpan === undefined ? {} : { rowSpan: item.layoutHint.columnSpan }),
    ...(item.layoutHint.preferredColumn === undefined ? {} : { preferredRow: item.layoutHint.preferredColumn }),
    ...(item.layoutHint.lockedColumn === undefined ? {} : { lockedRow: item.layoutHint.lockedColumn }),
  },
}));
const horizontalOptions = {
  containerHeight: 640,
  minRowHeight: 140,
  minRows: 3,
  maxRows: 3,
  gap: 10,
};

test("omitted cross direction equals explicit forward in both axes", () => {
  assert.deepEqual(
    calculateMasonryLayout(verticalItems, verticalOptions),
    calculateMasonryLayout(verticalItems, { ...verticalOptions, crossDirection: "forward" }),
  );
  assert.deepEqual(
    calculateHorizontalMasonryLayout(horizontalItems, horizontalOptions),
    calculateHorizontalMasonryLayout(horizontalItems, { ...horizontalOptions, crossDirection: "forward" }),
  );
});

test("cross reverse mirrors only physical cross coordinates for every distribution", () => {
  for (const flowDistribution of distributions) {
    assertCrossMirror(
      calculateMasonryLayout(verticalItems, { ...verticalOptions, flowDistribution }),
      calculateMasonryLayout(verticalItems, { ...verticalOptions, flowDistribution, crossDirection: "reverse" }),
      "vertical",
    );
    assertCrossMirror(
      calculateHorizontalMasonryLayout(horizontalItems, { ...horizontalOptions, flowDistribution }),
      calculateHorizontalMasonryLayout(horizontalItems, { ...horizontalOptions, flowDistribution, crossDirection: "reverse" }),
      "horizontal",
    );
  }
});

test("flow and cross directions compose independently without changing logical metadata", () => {
  for (const axis of ["vertical", "horizontal"]) {
    const calculate = axis === "vertical" ? calculateMasonryLayout : calculateHorizontalMasonryLayout;
    const items = axis === "vertical" ? verticalItems : horizontalItems;
    const options = axis === "vertical" ? verticalOptions : horizontalOptions;
    const forward = calculate(items, { ...options, flowDirection: "forward", crossDirection: "forward" });
    const reverseFlow = calculate(items, { ...options, flowDirection: "reverse", crossDirection: "forward" });
    const reverseCross = calculate(items, { ...options, flowDirection: "forward", crossDirection: "reverse" });
    const bothReverse = calculate(items, { ...options, flowDirection: "reverse", crossDirection: "reverse" });
    const forwardById = new Map(forward.cells.map((cell) => [cell.id, cell]));
    for (const cell of forward.cells) {
      const flow = reverseFlow.cells.find((candidate) => candidate.id === cell.id);
      const cross = reverseCross.cells.find((candidate) => candidate.id === cell.id);
      const both = bothReverse.cells.find((candidate) => candidate.id === cell.id);
      assert.equal(flow.index, cell.index);
      assert.equal(cross.index, cell.index);
      assert.equal(both.index, cell.index);
      if (axis === "vertical") {
        close(flow.x, cell.x);
        close(cross.y, cell.y);
        close(both.x, cross.x);
        close(both.y, reverseFlow.cells.find((candidate) => candidate.id === cell.id).y);
      } else {
        close(flow.y, cell.y);
        close(cross.x, cell.x);
        close(both.y, cross.y);
        close(both.x, reverseFlow.cells.find((candidate) => candidate.id === cell.id).x);
      }
      assert.equal(forwardById.get(cell.id).aspectRatio, cell.aspectRatio);
    }
  }
});

test("cross reversal mirrors cap alignment metadata and cells", () => {
  for (const alignment of ["start", "center", "end"]) {
    const verticalForward = calculateMasonryLayout([{ id: "v", aspectRatio: 1 }], {
      containerWidth: 500,
      minColumnWidth: 100,
      minColumns: 2,
      maxColumns: 2,
      maxColumnWidth: 150,
      columnSizing: "cap",
      columnAlignment: alignment,
    });
    const verticalReverse = calculateMasonryLayout([{ id: "v", aspectRatio: 1 }], {
      containerWidth: 500,
      minColumnWidth: 100,
      minColumns: 2,
      maxColumns: 2,
      maxColumnWidth: 150,
      columnSizing: "cap",
      columnAlignment: alignment,
      crossDirection: "reverse",
    });
    close(verticalReverse.contentOffsetX, verticalForward.containerWidth - verticalForward.contentOffsetX - verticalForward.contentWidth);
    close(verticalReverse.cells[0].x, verticalForward.containerWidth - verticalForward.cells[0].x - verticalForward.cells[0].width);

    const horizontalForward = calculateHorizontalMasonryLayout([{ id: "h", aspectRatio: 1 }], {
      containerHeight: 500,
      minRowHeight: 100,
      minRows: 2,
      maxRows: 2,
      maxRowHeight: 150,
      rowSizing: "cap",
      rowAlignment: alignment,
    });
    const horizontalReverse = calculateHorizontalMasonryLayout([{ id: "h", aspectRatio: 1 }], {
      containerHeight: 500,
      minRowHeight: 100,
      minRows: 2,
      maxRows: 2,
      maxRowHeight: 150,
      rowSizing: "cap",
      rowAlignment: alignment,
      crossDirection: "reverse",
    });
    close(horizontalReverse.contentOffsetY, horizontalForward.containerHeight - horizontalForward.contentOffsetY - horizontalForward.contentHeight);
    close(horizontalReverse.cells[0].y, horizontalForward.containerHeight - horizontalForward.cells[0].y - horizontalForward.cells[0].height);
  }
});

test("invalid cross direction is rejected by both calculators", () => {
  assert.throws(
    () => calculateMasonryLayout([], { containerWidth: 320, minColumnWidth: 140, crossDirection: "sideways" }),
    (error) => error.code === "INVALID_OPTION",
  );
  assert.throws(
    () => calculateHorizontalMasonryLayout([], { containerHeight: 320, minRowHeight: 140, crossDirection: "sideways" }),
    (error) => error.code === "INVALID_OPTION",
  );
});

test("cross-reversed state uses a full fallback and preserves snapshot semantics", () => {
  assert.equal(createVerticalAppendLayoutState([], { containerWidth: 320, minColumnWidth: 140, crossDirection: "reverse" }), undefined);
  assert.equal(createHorizontalAppendLayoutState([], { containerHeight: 320, minRowHeight: 140, crossDirection: "reverse" }), undefined);

  const vertical = createMasonryState({ axis: "vertical", items: verticalItems.slice(0, 2), options: { ...verticalOptions, crossDirection: "reverse" } });
  const verticalSnapshot = vertical.snapshot();
  assert.deepEqual(vertical.restore(verticalSnapshot), verticalSnapshot.layout);
  const before = vertical.inspect();
  vertical.resize({ ...verticalOptions, crossDirection: "forward" });
  assert.throws(() => vertical.restore(verticalSnapshot), (error) => error.code === "INVALID_OPTION");
  assert.notDeepEqual(vertical.inspect().layout, before.layout);

  const horizontal = createMasonryState({ axis: "horizontal", items: horizontalItems.slice(0, 2), options: { ...horizontalOptions, crossDirection: "reverse" } });
  const horizontalSnapshot = horizontal.snapshot();
  assert.deepEqual(horizontal.restore(horizontalSnapshot), horizontalSnapshot.layout);
});

test("cross-only changes do not contribute to flow anchor delta", () => {
  const verticalForward = calculateMasonryLayout(verticalItems, verticalOptions);
  const verticalCross = calculateMasonryLayout(verticalItems, { ...verticalOptions, crossDirection: "reverse" });
  close(calculateFlowAnchorDelta(verticalForward, verticalCross, "span").delta, 0);

  const horizontalForward = calculateHorizontalMasonryLayout(horizontalItems, horizontalOptions);
  const horizontalCross = calculateHorizontalMasonryLayout(horizontalItems, { ...horizontalOptions, crossDirection: "reverse" });
  close(calculateFlowAnchorDelta(horizontalForward, horizontalCross, "span").delta, 0);
});

test("cross direction leaves flow query, index, and virtualization unchanged", () => {
  const layouts = [
    [calculateMasonryLayout(verticalItems, verticalOptions), calculateMasonryLayout(verticalItems, { ...verticalOptions, crossDirection: "reverse" })],
    [calculateHorizontalMasonryLayout(horizontalItems, horizontalOptions), calculateHorizontalMasonryLayout(horizontalItems, { ...horizontalOptions, crossDirection: "reverse" })],
  ];
  for (const [forward, reverse] of layouts) {
    const extent = "columnCount" in forward ? forward.containerHeight : forward.containerWidth;
    const ranges = [{ start: 0, end: 0 }, { start: 1, end: extent / 2 }, { start: extent / 2, end: extent }, { start: 0, end: extent }];
    const forwardIndex = createFlowRangeIndex(forward);
    const reverseIndex = createFlowRangeIndex(reverse);
    for (const range of ranges) {
      assert.deepEqual(queryVisibleFlowCells(reverse, range).map((cell) => cell.id), queryVisibleFlowCells(forward, range).map((cell) => cell.id));
      assert.deepEqual(
        reverseIndex.query(range).map((cell) => [cell.id, cell.index]),
        forwardIndex.query(range).map((cell) => [cell.id, cell.index]),
      );
      const reverseVirtualized = queryVirtualizedCells(reverse, range, { overscan: 12 }, reverseIndex);
      const forwardVirtualized = queryVirtualizedReference(forward, range, { overscan: 12 });
      assert.deepEqual(reverseVirtualized.visibleRange, forwardVirtualized.visibleRange);
      assert.deepEqual(reverseVirtualized.overscanRange, forwardVirtualized.overscanRange);
      assert.deepEqual(reverseVirtualized.ids, forwardVirtualized.ids);
      assert.deepEqual(reverseVirtualized.indexes, forwardVirtualized.indexes);
    }
  }
});

test("stable reflow accepts cross-reversed vertical and horizontal geometry", () => {
  const vertical = createMasonryState({
    axis: "vertical",
    items: verticalItems,
    options: { ...verticalOptions, flowDirection: "reverse", crossDirection: "reverse" },
    reflowStrategy: "stable",
  });
  vertical.remove("preferred");
  assert.equal(vertical.layout.cells.find((cell) => cell.id === "locked")?.column, 2);
  noOverlap(vertical.layout.cells);
  assert.deepEqual(vertical.restore(vertical.snapshot()), vertical.layout);
  const verticalRepeat = createMasonryState({
    axis: "vertical",
    items: verticalItems,
    options: { ...verticalOptions, flowDirection: "reverse", crossDirection: "reverse" },
    reflowStrategy: "stable",
  });
  verticalRepeat.remove("preferred");
  assert.deepEqual(vertical.layout, verticalRepeat.layout);

  const horizontal = createMasonryState({
    axis: "horizontal",
    items: horizontalItems,
    options: { ...horizontalOptions, flowDirection: "reverse", crossDirection: "reverse" },
    reflowStrategy: "stable",
  });
  horizontal.update({ ...horizontalItems[2], aspectRatio: 1.25 });
  assert.equal(horizontal.layout.cells.find((cell) => cell.id === "locked")?.row, 2);
  noOverlap(horizontal.layout.cells);
  assert.deepEqual(horizontal.restore(horizontal.snapshot()), horizontal.layout);
  const horizontalRepeat = createMasonryState({
    axis: "horizontal",
    items: horizontalItems,
    options: { ...horizontalOptions, flowDirection: "reverse", crossDirection: "reverse" },
    reflowStrategy: "stable",
  });
  horizontalRepeat.update({ ...horizontalItems[2], aspectRatio: 1.25 });
  assert.deepEqual(horizontal.layout, horizontalRepeat.layout);
});

function nextRandom(seed) {
  return (seed * 1664525 + 1013904223) >>> 0;
}

test("seeded cross-direction differential property preserves logical geometry", () => {
  for (const axis of ["vertical", "horizontal"]) {
    for (let fixture = 0; fixture < 8; fixture += 1) {
      let seed = 0x2468ace0 + fixture * 31;
      const items = [];
      for (let index = 0; index < 8; index += 1) {
        seed = nextRandom(seed);
        const ratio = 0.55 + (seed % 180) / 100;
        seed = nextRandom(seed);
        const span = 1 + (seed % 3);
        const hint = axis === "vertical"
          ? { columnSpan: span, ...(index === 0 ? { lockedColumn: 3 } : index === 1 ? { preferredColumn: 0 } : {}) }
          : { rowSpan: span, ...(index === 0 ? { lockedRow: 3 } : index === 1 ? { preferredRow: 0 } : {}) };
        items.push({ id: `${axis}-${fixture}-${index}`, aspectRatio: ratio, layoutHint: hint });
      }
      const calculate = axis === "vertical" ? calculateMasonryLayout : calculateHorizontalMasonryLayout;
      const options = axis === "vertical"
        ? { containerWidth: 820, minColumnWidth: 160, minColumns: 4, maxColumns: 4, gap: 9 }
        : { containerHeight: 820, minRowHeight: 160, minRows: 4, maxRows: 4, gap: 9 };
      for (const flowDistribution of distributions) {
        const forward = calculate(items, { ...options, flowDistribution, flowDirection: "forward", crossDirection: "forward" });
        const cross = calculate(items, { ...options, flowDistribution, flowDirection: "forward", crossDirection: "reverse" });
        const both = calculate(items, { ...options, flowDistribution, flowDirection: "reverse", crossDirection: "reverse" });
        assertCrossMirror(forward, cross, axis);
        noOverlap(both.cells);
        assert.deepEqual(both, calculate(items, { ...options, flowDistribution, flowDirection: "reverse", crossDirection: "reverse" }));
      }
    }
  }
});
