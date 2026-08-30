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

const modes = ["start", "end", "center", "space-between", "space-evenly"];
const EPSILON = 1e-8;

function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) <= EPSILON, `${actual} is not close to ${expected}`);
}

function noItemOverlap(cells) {
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

function normalizeRegion(region, laneCount) {
  const laneSpan = Math.min(region.laneSpan, laneCount);
  const laneStart = Math.min(Math.max(region.laneStart, 0), laneCount - laneSpan);
  return { ...region, laneStart, laneSpan };
}

function projectRegions(regions, forwardLayout, options, axis) {
  const laneCount = axis === "vertical" ? forwardLayout.columnCount : forwardLayout.rowCount;
  const flowExtent = axis === "vertical" ? forwardLayout.containerHeight : forwardLayout.containerWidth;
  const crossExtent = axis === "vertical" ? forwardLayout.containerWidth : forwardLayout.containerHeight;
  return regions.map((region) => {
    const normalized = normalizeRegion(region, laneCount);
    const crossSize = axis === "vertical"
      ? forwardLayout.columnWidth * normalized.laneSpan + forwardLayout.columnGap * (normalized.laneSpan - 1)
      : forwardLayout.rowHeight * normalized.laneSpan + forwardLayout.rowGap * (normalized.laneSpan - 1);
    const logicalCrossOffset = axis === "vertical"
      ? forwardLayout.contentOffsetX + normalized.laneStart * (forwardLayout.columnWidth + forwardLayout.columnGap)
      : forwardLayout.contentOffsetY + normalized.laneStart * (forwardLayout.rowHeight + forwardLayout.rowGap);
    const crossOffset = options.crossDirection === "reverse"
      ? crossExtent - logicalCrossOffset - crossSize
      : logicalCrossOffset;
    const flowOffset = options.flowDirection === "reverse"
      ? flowExtent - normalized.flowStart - normalized.flowSize
      : normalized.flowStart;
    return axis === "vertical"
      ? { x: crossOffset, y: flowOffset, width: crossSize, height: normalized.flowSize }
      : { x: flowOffset, y: crossOffset, width: normalized.flowSize, height: crossSize };
  });
}

function assertNoRegionOverlap(layout, regions, options, axis, originalItems) {
  noItemOverlap(layout.cells);
  const forwardOptions = { ...options, flowDirection: "forward", crossDirection: "forward" };
  const forwardLayout = axis === "vertical"
    ? calculateMasonryLayout(originalItems, forwardOptions)
    : calculateHorizontalMasonryLayout(originalItems, forwardOptions);
  const physicalRegions = projectRegions(regions, forwardLayout, options, axis);
  const flowGap = axis === "vertical"
    ? options.rowGap ?? options.gap ?? 0
    : options.columnGap ?? options.gap ?? 0;
  for (const cell of layout.cells) {
    for (const region of physicalRegions) {
      const intersects = cell.x < region.x + region.width && region.x < cell.x + cell.width
        && cell.y < region.y + region.height && region.y < cell.y + cell.height;
      assert.equal(intersects, false, `${cell.id} intersects reserved region`);
      const sharesCrossAxis = axis === "vertical"
        ? cell.x < region.x + region.width && region.x < cell.x + cell.width
        : cell.y < region.y + region.height && region.y < cell.y + cell.height;
      if (sharesCrossAxis) {
        const separatedByGap = axis === "vertical"
          ? cell.y + cell.height + flowGap <= region.y + EPSILON
            || region.y + region.height + flowGap <= cell.y + EPSILON
          : cell.x + cell.width + flowGap <= region.x + EPSILON
            || region.x + region.width + flowGap <= cell.x + EPSILON;
        assert.equal(separatedByGap, true, `${cell.id} is too close to reserved region`);
      }
    }
  }
}

const verticalItems = [
  { id: "locked", aspectRatio: 4, layoutHint: { lockedColumn: 0 } },
  { id: "preferred", aspectRatio: 3, layoutHint: { preferredColumn: 0 } },
  { id: "span", aspectRatio: 2, layoutHint: { columnSpan: 2 } },
  { id: "full", aspectRatio: 1, layoutHint: { columnSpan: 99 } },
];
const verticalOptions = {
  containerWidth: 420,
  minColumnWidth: 190,
  minColumns: 2,
  maxColumns: 2,
  rowGap: 10,
  columnGap: 10,
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
  containerHeight: 420,
  minRowHeight: 190,
  minRows: 2,
  maxRows: 2,
  rowGap: 10,
  columnGap: 10,
};

test("reserved regions validate and normalize without changing default geometry", () => {
  const noRegion = calculateMasonryLayout(verticalItems, verticalOptions);
  const explicitEmpty = calculateMasonryLayout(verticalItems, { ...verticalOptions, reservedRegions: [] });
  assert.deepEqual(noRegion, explicitEmpty);
  assert.throws(
    () => calculateMasonryLayout([], { ...verticalOptions, reservedRegions: [{ laneStart: 0.5, laneSpan: 1, flowStart: 0, flowSize: 10 }] }),
    (error) => error.code === "INVALID_OPTION",
  );
  assert.throws(
    () => calculateHorizontalMasonryLayout([], { ...horizontalOptions, reservedRegions: [{ laneStart: 0, laneSpan: 0, flowStart: 0, flowSize: 10 }] }),
    (error) => error.code === "INVALID_OPTION",
  );
  assert.throws(
    () => calculateMasonryLayout([], { ...verticalOptions, reservedRegions: [{ laneStart: 0, laneSpan: 1, flowStart: -1, flowSize: 10 }] }),
    (error) => error.code === "INVALID_OPTION",
  );
  assert.throws(
    () => calculateMasonryLayout([], { ...verticalOptions, reservedRegions: [{ laneStart: 0, laneSpan: 1, flowStart: 0, flowSize: 0 }] }),
    (error) => error.code === "INVALID_OPTION",
  );
});

test("reserved regions block shared lanes with the physical flow gap", () => {
  const regions = [{ laneStart: 0, laneSpan: 1, flowStart: 100, flowSize: 50 }];
  const vertical = calculateMasonryLayout(
    [{ id: "a", aspectRatio: 4 }, { id: "b", aspectRatio: 4 }],
    { containerWidth: 200, minColumnWidth: 200, minColumns: 1, maxColumns: 1, rowGap: 10, reservedRegions: regions },
  );
  assert.equal(vertical.cells[0].y, 0);
  assert.equal(vertical.cells[1].y, 160);
  assert.equal(vertical.containerHeight, 210);
  assertNoRegionOverlap(vertical, regions, { containerWidth: 200, minColumnWidth: 200, minColumns: 1, maxColumns: 1, rowGap: 10, reservedRegions: regions }, "vertical", [{ id: "a", aspectRatio: 4 }, { id: "b", aspectRatio: 4 }]);

  const horizontal = calculateHorizontalMasonryLayout(
    [{ id: "a", aspectRatio: 4 }, { id: "b", aspectRatio: 4 }],
    { containerHeight: 200, minRowHeight: 200, minRows: 1, maxRows: 1, columnGap: 10, reservedRegions: regions },
  );
  assert.equal(horizontal.cells[0].x, 160);
  assert.equal(horizontal.cells[1].x, 970);
  assert.equal(horizontal.containerWidth, 1770);
  assertNoRegionOverlap(horizontal, regions, { containerHeight: 200, minRowHeight: 200, minRows: 1, maxRows: 1, columnGap: 10, reservedRegions: regions }, "horizontal", [{ id: "a", aspectRatio: 4 }, { id: "b", aspectRatio: 4 }]);
});

test("obstacle avoidance advances the lane frontier and never backfills earlier holes", () => {
  const regions = [{ laneStart: 0, laneSpan: 1, flowStart: 100, flowSize: 50 }];
  const items = [
    { id: "first", aspectRatio: 4, layoutHint: { lockedColumn: 0 } },
    { id: "after-region", aspectRatio: 4, layoutHint: { lockedColumn: 0 } },
    { id: "later", aspectRatio: 4, layoutHint: { lockedColumn: 0 } },
  ];
  const layout = calculateMasonryLayout(items, {
    containerWidth: 200,
    minColumnWidth: 200,
    minColumns: 1,
    maxColumns: 1,
    rowGap: 10,
    reservedRegions: regions,
  });
  assert.equal(layout.cells[0].y, 0);
  assert.equal(layout.cells[1].y, 160);
  assert.equal(layout.cells[2].y, 220);
  assertNoRegionOverlap(layout, regions, {
    containerWidth: 200,
    minColumnWidth: 200,
    minColumns: 1,
    maxColumns: 1,
    rowGap: 10,
    reservedRegions: regions,
  }, "vertical", items);
});

test("regions on unrelated lanes do not constrain items and hard locks stay on lane", () => {
  const regions = [{ laneStart: 0, laneSpan: 1, flowStart: 0, flowSize: 200 }];
  const items = [
    { id: "unrelated", aspectRatio: 2, layoutHint: { lockedColumn: 1 } },
    { id: "blocked", aspectRatio: 2, layoutHint: { lockedColumn: 0 } },
  ];
  const options = { containerWidth: 420, minColumnWidth: 190, minColumns: 2, maxColumns: 2, gap: 10, reservedRegions: regions };
  const layout = calculateMasonryLayout(items, options);
  assert.equal(layout.cells[0].column, 1);
  assert.equal(layout.cells[0].y, 0);
  assert.equal(layout.cells[1].column, 0);
  assert.equal(layout.cells[1].y, 210);
  assertNoRegionOverlap(layout, regions, options, "vertical", items);

  const preferred = calculateMasonryLayout(
    [{ id: "preferred", aspectRatio: 2, layoutHint: { preferredColumn: 0 } }, { id: "other", aspectRatio: 2 }],
    { ...options, reservedRegions: [{ laneStart: 0, laneSpan: 1, flowStart: 0, flowSize: 200 }] },
  );
  assert.equal(preferred.cells[0].column, 1);
});

test("reserved placement uses bound footprints and falls back from stale footprints", () => {
  const regions = [{ laneStart: 0, laneSpan: 2, flowStart: 100, flowSize: 50 }];
  const verticalItems = [
    { id: "fresh", aspectRatio: 1, resolvedFootprint: { height: 50, forWidth: 210 } },
    { id: "stale", aspectRatio: 1, resolvedFootprint: { height: 50, forWidth: 209 } },
  ];
  const vertical = calculateMasonryLayout(verticalItems, {
    containerWidth: 420,
    minColumnWidth: 190,
    minColumns: 2,
    maxColumns: 2,
    rowGap: 10,
    reservedRegions: regions,
  });
  assert.equal(vertical.cells[0].height, 50);
  assert.equal(vertical.cells[0].y, 0);
  assert.equal(vertical.cells[1].height, 210);
  assert.equal(vertical.cells[1].y, 160);
  assertNoRegionOverlap(vertical, regions, {
    containerWidth: 420,
    minColumnWidth: 190,
    minColumns: 2,
    maxColumns: 2,
    rowGap: 10,
    reservedRegions: regions,
  }, "vertical", verticalItems);

  const horizontalItems = [
    { id: "fresh", aspectRatio: 1, resolvedFootprint: { width: 50, forHeight: 210 } },
    { id: "stale", aspectRatio: 1, resolvedFootprint: { width: 50, forHeight: 209 } },
  ];
  const horizontal = calculateHorizontalMasonryLayout(horizontalItems, {
    containerHeight: 420,
    minRowHeight: 190,
    minRows: 2,
    maxRows: 2,
    columnGap: 10,
    reservedRegions: regions,
  });
  assert.equal(horizontal.cells[0].width, 50);
  assert.equal(horizontal.cells[0].x, 0);
  assert.equal(horizontal.cells[1].width, 210);
  assert.equal(horizontal.cells[1].x, 160);
  assertNoRegionOverlap(horizontal, regions, {
    containerHeight: 420,
    minRowHeight: 190,
    minRows: 2,
    maxRows: 2,
    columnGap: 10,
    reservedRegions: regions,
  }, "horizontal", horizontalItems);
});

test("region order is irrelevant, overlaps form one effective obstacle field, and extent includes regions", () => {
  const regions = [
    { laneStart: 0, laneSpan: 2, flowStart: 100, flowSize: 80 },
    { laneStart: 1, laneSpan: 1, flowStart: 150, flowSize: 120 },
    { laneStart: 0, laneSpan: 1, flowStart: 100, flowSize: 80 },
  ];
  const options = { ...verticalOptions, reservedRegions: regions };
  const first = calculateMasonryLayout(verticalItems, options);
  const permuted = calculateMasonryLayout(verticalItems, { ...options, reservedRegions: [regions[2], regions[0], regions[1]] });
  assert.deepEqual(first, permuted);
  assertNoRegionOverlap(first, regions, options, "vertical", verticalItems);

  const onlyRegion = calculateMasonryLayout([], { containerWidth: 320, minColumnWidth: 320, reservedRegions: [{ laneStart: 99, laneSpan: 4, flowStart: 100, flowSize: 200 }] });
  assert.equal(onlyRegion.containerHeight, 300);
  assert.deepEqual(onlyRegion.cells, []);
  const onlyHorizontalRegion = calculateHorizontalMasonryLayout([], { containerHeight: 320, minRowHeight: 320, reservedRegions: [{ laneStart: 99, laneSpan: 4, flowStart: 100, flowSize: 200 }] });
  assert.equal(onlyHorizontalRegion.containerWidth, 300);
  assert.deepEqual(onlyHorizontalRegion.cells, []);
});

test("reserved regions preserve every distribution and direction projection", () => {
  const regions = [
    { laneStart: 0, laneSpan: 1, flowStart: 80, flowSize: 90 },
    { laneStart: 1, laneSpan: 2, flowStart: 240, flowSize: 70 },
  ];
  for (const flowDistribution of modes) {
    const forward = calculateMasonryLayout(verticalItems, { ...verticalOptions, reservedRegions: regions, flowDistribution });
    const reverseFlow = calculateMasonryLayout(verticalItems, { ...verticalOptions, reservedRegions: regions, flowDistribution, flowDirection: "reverse" });
    const reverseCross = calculateMasonryLayout(verticalItems, { ...verticalOptions, reservedRegions: regions, flowDistribution, crossDirection: "reverse" });
    const both = calculateMasonryLayout(verticalItems, { ...verticalOptions, reservedRegions: regions, flowDistribution, flowDirection: "reverse", crossDirection: "reverse" });
    const forwardOptions = { ...verticalOptions, reservedRegions: regions, flowDistribution };
    assertNoRegionOverlap(forward, regions, forwardOptions, "vertical", verticalItems);
    assertNoRegionOverlap(reverseFlow, regions, { ...forwardOptions, flowDirection: "reverse" }, "vertical", verticalItems);
    assertNoRegionOverlap(reverseCross, regions, { ...forwardOptions, crossDirection: "reverse" }, "vertical", verticalItems);
    assertNoRegionOverlap(both, regions, { ...forwardOptions, flowDirection: "reverse", crossDirection: "reverse" }, "vertical", verticalItems);
    for (const cell of forward.cells) {
      const flow = reverseFlow.cells.find((candidate) => candidate.id === cell.id);
      const cross = reverseCross.cells.find((candidate) => candidate.id === cell.id);
      const mirrored = both.cells.find((candidate) => candidate.id === cell.id);
      assert.equal(flow.column, cell.column);
      assert.equal(cross.column, cell.column);
      close(flow.x, cell.x);
      close(cross.y, cell.y);
      close(mirrored.x, cross.x);
      close(mirrored.y, flow.y);
    }
  }
});

test("reserved regions compose with horizontal spans and all direction projections", () => {
  const regions = [
    { laneStart: 0, laneSpan: 1, flowStart: 70, flowSize: 100 },
    { laneStart: 1, laneSpan: 2, flowStart: 230, flowSize: 90 },
  ];
  for (const flowDistribution of modes) {
    const forward = calculateHorizontalMasonryLayout(horizontalItems, { ...horizontalOptions, reservedRegions: regions, flowDistribution });
    const both = calculateHorizontalMasonryLayout(horizontalItems, { ...horizontalOptions, reservedRegions: regions, flowDistribution, flowDirection: "reverse", crossDirection: "reverse" });
    assertNoRegionOverlap(forward, regions, { ...horizontalOptions, reservedRegions: regions, flowDistribution }, "horizontal", horizontalItems);
    assertNoRegionOverlap(both, regions, { ...horizontalOptions, reservedRegions: regions, flowDistribution, flowDirection: "reverse", crossDirection: "reverse" }, "horizontal", horizontalItems);
    for (const cell of forward.cells) {
      const mirrored = both.cells.find((candidate) => candidate.id === cell.id);
      assert.equal(mirrored.row, cell.row);
      assert.equal(mirrored.rowSpan, cell.rowSpan);
      close(mirrored.y, horizontalOptions.containerHeight - cell.y - cell.height);
      close(mirrored.x, forward.containerWidth - cell.x - cell.width);
    }
  }
});

test("reserved-region state falls back safely and snapshot/stable semantics remain atomic", () => {
  const regions = [{ laneStart: 0, laneSpan: 1, flowStart: 20, flowSize: 100 }];
  const verticalOptionsWithRegions = { ...verticalOptions, reservedRegions: regions };
  const horizontalOptionsWithRegions = { ...horizontalOptions, reservedRegions: regions };
  assert.equal(createVerticalAppendLayoutState(verticalItems, verticalOptionsWithRegions), undefined);
  assert.equal(createHorizontalAppendLayoutState(horizontalItems, horizontalOptionsWithRegions), undefined);

  const state = createMasonryState({ axis: "vertical", items: verticalItems.slice(0, 2), options: verticalOptions });
  const before = state.inspect();
  state.resize(verticalOptionsWithRegions);
  assert.notDeepEqual(state.layout, before.layout);
  const withRegions = state.inspect();
  state.resize({ ...verticalOptions, reservedRegions: [] });
  assert.throws(() => state.restore({ ...state.snapshot(), options: verticalOptionsWithRegions, layout: withRegions.layout }), (error) => error.code === "INVALID_OPTION");
  assert.deepEqual(state.inspect().items, before.items);

  const stable = createMasonryState({ axis: "vertical", items: verticalItems, options: { ...verticalOptions, flowDirection: "reverse", crossDirection: "reverse" }, reflowStrategy: "stable" });
  stable.resize({ ...verticalOptions, flowDirection: "reverse", crossDirection: "reverse", reservedRegions: regions });
  noItemOverlap(stable.layout.cells);
  assert.equal(stable.layout.cells.find((cell) => cell.id === "locked")?.column, 0);
  assert.deepEqual(stable.restore(stable.snapshot()), stable.layout);
});

test("reserved regions move anchors through the geometry-only delta utility", () => {
  const items = [{ id: "first", aspectRatio: 4 }, { id: "anchor", aspectRatio: 4 }];
  const oldVertical = calculateMasonryLayout(items, { containerWidth: 200, minColumnWidth: 200, minColumns: 1, maxColumns: 1, rowGap: 10 });
  const newVertical = calculateMasonryLayout(items, { containerWidth: 200, minColumnWidth: 200, minColumns: 1, maxColumns: 1, rowGap: 10, reservedRegions: [{ laneStart: 0, laneSpan: 1, flowStart: 60, flowSize: 50 }] });
  assert.equal(calculateFlowAnchorDelta(oldVertical, newVertical, "anchor").delta, newVertical.cells[1].y - oldVertical.cells[1].y);
  const oldHorizontal = calculateHorizontalMasonryLayout(items, { containerHeight: 200, minRowHeight: 200, minRows: 1, maxRows: 1, columnGap: 10 });
  const newHorizontal = calculateHorizontalMasonryLayout(items, { containerHeight: 200, minRowHeight: 200, minRows: 1, maxRows: 1, columnGap: 10, reservedRegions: [{ laneStart: 0, laneSpan: 1, flowStart: 60, flowSize: 50 }] });
  assert.equal(calculateFlowAnchorDelta(oldHorizontal, newHorizontal, "anchor").delta, newHorizontal.cells[1].x - oldHorizontal.cells[1].x);
});

test("reserved regions remain item-free in flow queries and virtualization", () => {
  const layout = calculateMasonryLayout(verticalItems, { ...verticalOptions, reservedRegions: [{ laneStart: 0, laneSpan: 2, flowStart: 100, flowSize: 300 }] });
  const index = createFlowRangeIndex(layout);
  for (const range of [{ start: 0, end: 50 }, { start: 100, end: 400 }, { start: 0, end: layout.containerHeight }]) {
    const linear = queryVisibleFlowCells(layout, range);
    assert.deepEqual(index.query(range).map((cell) => cell.id), linear.map((cell) => cell.id));
    const virtualized = queryVirtualizedCells(layout, range, { overscan: 20 }, index);
    const reference = queryVirtualizedReference(layout, range, { overscan: 20 });
    assert.deepEqual(virtualized.ids, reference.ids);
    assert.deepEqual(virtualized.indexes, reference.indexes);
  }
});

function nextRandom(seed) {
  return (seed * 1664525 + 1013904223) >>> 0;
}

test("seeded reserved-region property is deterministic, bounded, and permutation invariant", () => {
  for (const axis of ["vertical", "horizontal"]) {
    for (let fixture = 0; fixture < 8; fixture += 1) {
      let seed = 0x51f15e + fixture * 101;
      const items = [];
      for (let index = 0; index < 10; index += 1) {
        seed = nextRandom(seed);
        const ratio = 0.7 + (seed % 200) / 100;
        seed = nextRandom(seed);
        const span = 1 + (seed % 3);
        const hint = axis === "vertical"
          ? { columnSpan: span, ...(index === 0 ? { lockedColumn: 2 } : index === 1 ? { preferredColumn: 1 } : {}) }
          : { rowSpan: span, ...(index === 0 ? { lockedRow: 2 } : index === 1 ? { preferredRow: 1 } : {}) };
        items.push({ id: `${axis}-${fixture}-${index}`, aspectRatio: ratio, layoutHint: hint });
      }
      const regions = [
        { laneStart: 0, laneSpan: 1, flowStart: 80, flowSize: 60 },
        { laneStart: 1, laneSpan: 2, flowStart: 180, flowSize: 90 },
        { laneStart: 0, laneSpan: 3, flowStart: 300, flowSize: 40 },
      ];
      const calculate = axis === "vertical" ? calculateMasonryLayout : calculateHorizontalMasonryLayout;
      const baseOptions = axis === "vertical"
        ? { containerWidth: 760, minColumnWidth: 170, minColumns: 3, maxColumns: 3, gap: 9 }
        : { containerHeight: 760, minRowHeight: 170, minRows: 3, maxRows: 3, gap: 9 };
      for (const flowDistribution of modes) {
        for (const direction of [
          { flowDirection: "forward", crossDirection: "forward" },
          { flowDirection: "reverse", crossDirection: "forward" },
          { flowDirection: "forward", crossDirection: "reverse" },
          { flowDirection: "reverse", crossDirection: "reverse" },
        ]) {
          const options = { ...baseOptions, reservedRegions: regions, flowDistribution, ...direction };
          const result = calculate(items, options);
          const permuted = calculate(items, { ...options, reservedRegions: [regions[2], regions[0], regions[1]] });
          assert.deepEqual(result, permuted);
          assertNoRegionOverlap(result, regions, options, axis, items);
          assert.deepEqual(result, calculate(items, options));
        }
      }
    }
  }
});
