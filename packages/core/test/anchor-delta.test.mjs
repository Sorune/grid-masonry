import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateFlowAnchorDelta,
  calculateHorizontalMasonryLayout,
  calculateMasonryLayout,
} from "../dist/index.js";

test("anchor delta computes a vertical flow-only geometry delta", () => {
  const items = [
    { id: "anchor", aspectRatio: 1 },
    { id: "other", aspectRatio: 1 },
  ];
  const previous = calculateMasonryLayout(items, {
    containerWidth: 420,
    minColumnWidth: 200,
    minColumns: 2,
    maxColumns: 2,
    gap: 8,
  });
  const next = calculateMasonryLayout(items, {
    containerWidth: 420,
    minColumnWidth: 200,
    minColumns: 2,
    maxColumns: 2,
    gap: 8,
    flowDistribution: "end",
  });
  const delta = calculateFlowAnchorDelta(previous, next, "anchor");
  assert.deepEqual(delta, {
    anchorId: "anchor",
    previousFlowOffset: 0,
    nextFlowOffset: 0,
    delta: 0,
  });
});

test("anchor delta reports positive, negative, and zero changes", () => {
  const layout = calculateMasonryLayout([{ id: "anchor", aspectRatio: 1 }], {
    containerWidth: 320,
    minColumnWidth: 320,
  });
  const shifted = {
    ...layout,
    cells: layout.cells.map((cell) => ({ ...cell, y: cell.y + 12.5 })),
  };
  const reversed = {
    ...layout,
    cells: layout.cells.map((cell) => ({ ...cell, y: cell.y - 4.25 })),
  };
  assert.equal(calculateFlowAnchorDelta(layout, shifted, "anchor")?.delta, 12.5);
  assert.equal(calculateFlowAnchorDelta(layout, reversed, "anchor")?.delta, -4.25);
  assert.equal(calculateFlowAnchorDelta(layout, layout, "anchor")?.delta, 0);
});

test("anchor delta transposes to horizontal flow and is deterministic", () => {
  const items = [
    { id: "first", aspectRatio: 1 },
    { id: "anchor", aspectRatio: 1 },
    { id: "third", aspectRatio: 1 },
  ];
  const previous = calculateHorizontalMasonryLayout(items, {
    containerHeight: 420,
    minRowHeight: 200,
    minRows: 2,
    maxRows: 2,
    gap: 8,
  });
  const next = calculateHorizontalMasonryLayout(items, {
    containerHeight: 420,
    minRowHeight: 200,
    minRows: 2,
    maxRows: 2,
    gap: 8,
    flowDistribution: "end",
  });
  const first = calculateFlowAnchorDelta(previous, next, "anchor");
  assert.deepEqual(first, calculateFlowAnchorDelta(previous, next, "anchor"));
  assert.equal(first?.previousFlowOffset, previous.cells[1]?.x);
  assert.equal(first?.nextFlowOffset, next.cells[1]?.x);
  assert.equal(first?.delta, (next.cells[1]?.x ?? 0) - (previous.cells[1]?.x ?? 0));
});

test("missing anchors produce no scroll instruction", () => {
  const layout = calculateMasonryLayout([], {
    containerWidth: 320,
    minColumnWidth: 160,
  });
  assert.equal(calculateFlowAnchorDelta(layout, layout, "missing"), undefined);
});

test("cross-axis anchor deltas are rejected instead of mixing coordinates", () => {
  const vertical = calculateMasonryLayout([{ id: "anchor", aspectRatio: 1 }], {
    containerWidth: 320,
    minColumnWidth: 320,
  });
  const horizontal = calculateHorizontalMasonryLayout([{ id: "anchor", aspectRatio: 1 }], {
    containerHeight: 320,
    minRowHeight: 320,
  });
  assert.throws(
    () => calculateFlowAnchorDelta(vertical, horizontal, "anchor"),
    (error) => error.code === "INVALID_OPTION",
  );
});
