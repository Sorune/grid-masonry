import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateHorizontalMasonryLayout,
  calculateHorizontalMasonryLayoutWithDiagnostics,
  calculateMasonryLayout,
  calculateMasonryLayoutWithDiagnostics,
  calculateFlowAnchorDelta,
  createMasonryState,
  GridMasonryError,
  queryVisibleFlowCells,
  createFlowRangeIndex,
  queryVirtualizedCells,
} from "../dist/index.js";
import { createHorizontalAppendLayoutState } from "../dist/horizontal-layout.js";
import { createVerticalAppendLayoutState } from "../dist/layout.js";

const verticalBase = {
  containerWidth: 200,
  minColumnWidth: 100,
  minColumns: 2,
  maxColumns: 2,
  gap: 0,
};

const horizontalBase = {
  containerHeight: 200,
  minRowHeight: 100,
  minRows: 2,
  maxRows: 2,
  gap: 0,
};

const verticalNearTie = [
  {
    id: "a",
    aspectRatio: 1,
    resolvedFootprint: { height: 100.5, forWidth: 100 },
    layoutHint: { lockedColumn: 0 },
  },
  {
    id: "b",
    aspectRatio: 1,
    resolvedFootprint: { height: 100, forWidth: 100 },
    layoutHint: { lockedColumn: 1 },
  },
  { id: "c", aspectRatio: 1 },
];

const horizontalNearTie = [
  {
    id: "a",
    aspectRatio: 1,
    resolvedFootprint: { width: 100.5, forHeight: 100 },
    layoutHint: { lockedRow: 0 },
  },
  {
    id: "b",
    aspectRatio: 1,
    resolvedFootprint: { width: 100, forHeight: 100 },
    layoutHint: { lockedRow: 1 },
  },
  { id: "c", aspectRatio: 1 },
];

function referenceSelect(candidates, tolerance, preferredLane) {
  const minimum = Math.min(...candidates.map((candidate) => candidate.flowOffset));
  const eligible = candidates.filter(
    (candidate) => candidate.flowOffset <= minimum + tolerance,
  );
  return eligible.find((candidate) => candidate.laneStart === preferredLane) ?? eligible[0];
}

function assertNoOverlap(cells) {
  const epsilon = 1e-9;
  for (let left = 0; left < cells.length; left += 1) {
    for (let right = left + 1; right < cells.length; right += 1) {
      const a = cells[left];
      const b = cells[right];
      assert.equal(
        a.x + a.width > b.x + epsilon && b.x + b.width > a.x + epsilon &&
        a.y + a.height > b.y + epsilon && b.y + b.height > a.y + epsilon,
        false,
      );
    }
  }
}

function assertRegionSafe(cells, region, horizontal = false, gap = 0) {
  for (const cell of cells) {
    const laneStart = horizontal ? cell.row : cell.column;
    const laneSpan = horizontal ? cell.rowSpan : cell.columnSpan;
    if (
      laneStart >= region.laneStart + region.laneSpan ||
      region.laneStart >= laneStart + laneSpan
    ) continue;
    const flowStart = horizontal ? cell.x : cell.y;
    const flowSize = horizontal ? cell.width : cell.height;
    assert.equal(
      flowStart < region.flowStart + region.flowSize + gap &&
      flowStart + flowSize > region.flowStart - gap,
      false,
    );
  }
}

test("omitted flow tolerance is exactly the explicit zero default", () => {
  assert.deepEqual(
    calculateMasonryLayout(verticalNearTie, verticalBase),
    calculateMasonryLayout(verticalNearTie, { ...verticalBase, flowTolerance: 0 }),
  );
  assert.deepEqual(
    calculateHorizontalMasonryLayout(horizontalNearTie, horizontalBase),
    calculateHorizontalMasonryLayout(horizontalNearTie, { ...horizontalBase, flowTolerance: 0 }),
  );
});

test("tolerance selects the eligible lowest logical lane and preserves its exact offset", () => {
  const exact = calculateMasonryLayout(verticalNearTie, { ...verticalBase, flowTolerance: 0 });
  const tolerant = calculateMasonryLayout(verticalNearTie, { ...verticalBase, flowTolerance: 0.5 });
  assert.equal(exact.cells[2].column, 1);
  assert.equal(tolerant.cells[2].column, 0);
  assert.equal(tolerant.cells[2].y, 100.5);

  const preferred = calculateMasonryLayout(
    [...verticalNearTie.slice(0, 2), { id: "c", aspectRatio: 1, layoutHint: { preferredColumn: 1 } }],
    { ...verticalBase, flowTolerance: 0.5 },
  );
  assert.equal(preferred.cells[2].column, 1);
  assert.equal(preferred.cells[2].y, 100);
});

test("horizontal tolerance is the transpose of vertical candidate selection", () => {
  const exact = calculateHorizontalMasonryLayout(horizontalNearTie, { ...horizontalBase, flowTolerance: 0 });
  const tolerant = calculateHorizontalMasonryLayout(horizontalNearTie, { ...horizontalBase, flowTolerance: 0.5 });
  assert.equal(exact.cells[2].row, 1);
  assert.equal(tolerant.cells[2].row, 0);
  assert.equal(tolerant.cells[2].x, 100.5);
});

test("preferred-lane threshold follows the exact tolerance boundary", () => {
  const items = [
    { id: "a", aspectRatio: 1, layoutHint: { lockedColumn: 0 }, resolvedFootprint: { height: 100.5, forWidth: 100 } },
    { id: "b", aspectRatio: 1, layoutHint: { lockedColumn: 1 }, resolvedFootprint: { height: 100, forWidth: 100 } },
    { id: "c", aspectRatio: 1, layoutHint: { preferredColumn: 0 } },
  ];
  assert.equal(calculateMasonryLayout(items, { ...verticalBase, flowTolerance: 0.499999 }).cells[2].column, 1);
  assert.equal(calculateMasonryLayout(items, { ...verticalBase, flowTolerance: 0.5 }).cells[2].column, 0);

  assert.equal(referenceSelect([
    { laneStart: 0, flowOffset: 100.5 },
    { laneStart: 1, flowOffset: 100 },
  ], 0.5, 0).laneStart, 0);
  assert.equal(referenceSelect([
    { laneStart: 0, flowOffset: 100.5 },
    { laneStart: 1, flowOffset: 100 },
  ], 0.499999, 0).laneStart, 1);
});

test("locks bypass tolerance, spans remain contiguous, and regions still enforce gaps", () => {
  const items = [
    { id: "a", aspectRatio: 1, layoutHint: { lockedColumn: 0, columnSpan: 2 } },
    { id: "b", aspectRatio: 1, layoutHint: { lockedColumn: 1 } },
  ];
  const region = { laneStart: 1, laneSpan: 1, flowStart: 0, flowSize: 120 };
  const layout = calculateMasonryLayout(items, {
    ...verticalBase,
    rowGap: 8,
    flowTolerance: 10,
    reservedRegions: [region],
  });
  assert.equal(layout.cells[0].column, 0);
  assert.equal(layout.cells[0].columnSpan, 2);
  assert.equal(layout.cells[1].column, 1);
  assert.ok(layout.cells[1].y >= 128);
  assertRegionSafe(layout.cells, region, false, 8);
  assertNoOverlap(layout.cells);
});

test("tolerance compares candidates after reserved-region avoidance", () => {
  const items = [
    { id: "seed", aspectRatio: 1, layoutHint: { lockedColumn: 0 } },
    { id: "next", aspectRatio: 1, layoutHint: { preferredColumn: 1 } },
  ];
  const layout = calculateMasonryLayout(items, {
    ...verticalBase,
    rowGap: 8,
    flowTolerance: 20,
    reservedRegions: [{ laneStart: 1, laneSpan: 1, flowStart: 0, flowSize: 110 }],
  });
  assert.equal(layout.cells[1].column, 1);
  assert.equal(layout.cells[1].y, 118);
  assertRegionSafe(layout.cells, { laneStart: 1, laneSpan: 1, flowStart: 0, flowSize: 110 }, false, 8);
});

test("validation rejects invalid flow tolerance in both axes", () => {
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -0.1]) {
    assert.throws(
      () => calculateMasonryLayout([], { ...verticalBase, flowTolerance: value }),
      (error) => error instanceof GridMasonryError && error.code === "INVALID_OPTION",
    );
    assert.throws(
      () => calculateHorizontalMasonryLayout([], { ...horizontalBase, flowTolerance: value }),
      (error) => error instanceof GridMasonryError && error.code === "INVALID_OPTION",
    );
  }
});

test("diagnostics, directions, distributions, and queries consume the selected geometry", () => {
  for (const flowDistribution of ["start", "end", "center", "space-between", "space-evenly"]) {
    const options = {
      ...verticalBase,
      flowDistribution,
      flowTolerance: 0.5,
      reservedRegions: [{ laneStart: 1, laneSpan: 1, flowStart: 0, flowSize: 60 }],
    };
    const ordinary = calculateMasonryLayout(verticalNearTie, options);
    const diagnosed = calculateMasonryLayoutWithDiagnostics(verticalNearTie, options);
    assert.deepEqual(diagnosed.layout, ordinary);
    assert.equal(diagnosed.diagnostics.items[2].resolvedLaneStart, ordinary.cells[2].column);
    assertNoOverlap(ordinary.cells);

    const reverse = calculateMasonryLayout(verticalNearTie, { ...options, flowDirection: "reverse", crossDirection: "reverse" });
    assert.deepEqual(reverse.cells.map((cell) => cell.column), ordinary.cells.map((cell) => cell.column));
    assert.deepEqual(
      queryVisibleFlowCells(reverse, { start: 0, end: reverse.containerHeight }).map((cell) => cell.id),
      reverse.cells.map((cell) => cell.id),
    );
    assert.deepEqual(
      createFlowRangeIndex(reverse).query({ start: 0, end: reverse.containerHeight }).map((cell) => cell.id),
      reverse.cells.map((cell) => cell.id),
    );
    assert.deepEqual(
      queryVirtualizedCells(reverse, { start: 0, end: reverse.containerHeight, overscan: 0 }).cells.map((cell) => cell.id),
      reverse.cells.map((cell) => cell.id),
    );
  }
});

test("horizontal diagnostics and indexed/virtualized queries preserve tolerance geometry", () => {
  for (const flowDistribution of ["start", "end", "center", "space-between", "space-evenly"]) {
    const options = {
      ...horizontalBase,
      flowDistribution,
      flowTolerance: 0.5,
      reservedRegions: [{ laneStart: 1, laneSpan: 1, flowStart: 0, flowSize: 60 }],
    };
    const ordinary = calculateHorizontalMasonryLayout(horizontalNearTie, options);
    const diagnosed = calculateHorizontalMasonryLayoutWithDiagnostics(horizontalNearTie, options);
    assert.deepEqual(diagnosed.layout, ordinary);
    assert.equal(diagnosed.diagnostics.items[2].resolvedLaneStart, ordinary.cells[2].row);
    assertNoOverlap(ordinary.cells);
    assert.deepEqual(
      createFlowRangeIndex(ordinary).query({ start: 0, end: ordinary.containerWidth }).map((cell) => cell.id),
      ordinary.cells.map((cell) => cell.id),
    );
    assert.deepEqual(
      queryVirtualizedCells(ordinary, { start: 0, end: ordinary.containerWidth }, { overscan: 0 }).ids,
      ordinary.cells.map((cell) => cell.id),
    );
  }
});

test("state, snapshots, and append fallback treat tolerance as semantic input", () => {
  const options = { ...verticalBase, flowTolerance: 0 };
  const state = createMasonryState({ axis: "vertical", items: verticalNearTie, options });
  const snapshot = state.snapshot();
  state.resize({ ...options, flowTolerance: 0.5 });
  assert.throws(() => state.restore(snapshot), (error) => error instanceof GridMasonryError);
  assert.equal(state.inspect().options.flowTolerance, 0.5);
  state.resize(options);
  assert.doesNotThrow(() => state.restore(snapshot));
  assert.equal(createVerticalAppendLayoutState(verticalNearTie, { ...options, flowTolerance: 0.5 }), undefined);
  assert.equal(createHorizontalAppendLayoutState(horizontalNearTie, { ...horizontalBase, flowTolerance: 0.5 }), undefined);
});

test("tolerant state append remains equivalent to the pure calculator through fallback", () => {
  const verticalOptions = { ...verticalBase, flowTolerance: 0.5 };
  const verticalState = createMasonryState({ axis: "vertical", items: verticalNearTie.slice(0, 2), options: verticalOptions });
  const verticalAdded = { id: "c", aspectRatio: 1, layoutHint: { preferredColumn: 0 } };
  assert.deepEqual(
    verticalState.append(verticalAdded),
    calculateMasonryLayout([...verticalNearTie.slice(0, 2), verticalAdded], verticalOptions),
  );

  const horizontalOptions = { ...horizontalBase, flowTolerance: 0.5 };
  const horizontalState = createMasonryState({ axis: "horizontal", items: horizontalNearTie.slice(0, 2), options: horizontalOptions });
  const horizontalAdded = { id: "c", aspectRatio: 1, layoutHint: { preferredRow: 0 } };
  assert.deepEqual(
    horizontalState.append(horizontalAdded),
    calculateHorizontalMasonryLayout([...horizontalNearTie.slice(0, 2), horizontalAdded], horizontalOptions),
  );
});

test("tolerance changes produce exact geometry-only anchor deltas in both axes", () => {
  const verticalBefore = calculateMasonryLayout(verticalNearTie, { ...verticalBase, flowTolerance: 0 });
  const verticalAfter = calculateMasonryLayout(verticalNearTie, { ...verticalBase, flowTolerance: 0.5 });
  assert.equal(
    calculateFlowAnchorDelta(verticalBefore, verticalAfter, "c").delta,
    verticalAfter.cells[2].y - verticalBefore.cells[2].y,
  );
  const horizontalBefore = calculateHorizontalMasonryLayout(horizontalNearTie, { ...horizontalBase, flowTolerance: 0 });
  const horizontalAfter = calculateHorizontalMasonryLayout(horizontalNearTie, { ...horizontalBase, flowTolerance: 0.5 });
  assert.equal(
    calculateFlowAnchorDelta(horizontalBefore, horizontalAfter, "c").delta,
    horizontalAfter.cells[2].x - horizontalBefore.cells[2].x,
  );
});

test("stable reflow composes with tolerance without changing its displacement objective", () => {
  const options = { ...verticalBase, flowTolerance: 0.5 };
  const state = createMasonryState({ axis: "vertical", items: verticalNearTie, options, reflowStrategy: "stable" });
  const updated = { ...verticalNearTie[2], aspectRatio: 0.8 };
  const result = state.update(updated);
  assertNoOverlap(result.cells);
  assert.deepEqual(result, state.layout);
  assert.deepEqual(result, state.inspect().layout);
  assert.deepEqual(result, createMasonryState({ axis: "vertical", items: [verticalNearTie[0], verticalNearTie[1], updated], options, reflowStrategy: "stable" }).layout);
});

test("seeded tolerant layouts are deterministic across both axes and representative directions", () => {
  let seed = 19;
  for (let iteration = 0; iteration < 24; iteration += 1) {
    seed = (seed * 1103515245 + 12345) % 2147483647;
    const tolerance = (seed % 1000) / 1000;
    const items = Array.from({ length: 8 }, (_, index) => ({
      id: `v${iteration}-${index}`,
      aspectRatio: 0.5 + ((seed + index * 17) % 250) / 100,
      layoutHint: index % 4 === 0
        ? { columnSpan: index % 2 === 0 ? 2 : 1, preferredColumn: index % 3 }
        : undefined,
    }));
    const verticalOptions = { ...verticalBase, flowTolerance: tolerance, flowDirection: iteration % 2 ? "reverse" : "forward", crossDirection: iteration % 3 ? "forward" : "reverse" };
    const vertical = calculateMasonryLayout(items, verticalOptions);
    const verticalAgain = calculateMasonryLayout(items, verticalOptions);
    assert.deepEqual(vertical, verticalAgain);
    assertNoOverlap(vertical.cells);
    const horizontalItems = items.map(({ id, aspectRatio, layoutHint }) => ({
      id,
      aspectRatio,
      ...(layoutHint === undefined ? {} : { layoutHint: { rowSpan: layoutHint.columnSpan, preferredRow: layoutHint.preferredColumn } }),
    }));
    const horizontalOptions = { ...horizontalBase, flowTolerance: tolerance, flowDirection: iteration % 2 ? "reverse" : "forward", crossDirection: iteration % 3 ? "forward" : "reverse" };
    const horizontal = calculateHorizontalMasonryLayout(horizontalItems, horizontalOptions);
    assert.deepEqual(horizontal, calculateHorizontalMasonryLayout(horizontalItems, horizontalOptions));
    assertNoOverlap(horizontal.cells);
  }
});

test("all tolerance paths remain deterministic, direction-independent, and gap-safe", () => {
  for (const tolerance of [0, 0.0001, 0.5, 10]) {
    for (const flowDirection of ["forward", "reverse"]) {
      for (const crossDirection of ["forward", "reverse"]) {
        const options = { ...verticalBase, flowTolerance: tolerance, flowDirection, crossDirection };
        const first = calculateMasonryLayout(verticalNearTie, options);
        const second = calculateMasonryLayout(verticalNearTie, options);
        assert.deepEqual(first, second);
        assertNoOverlap(first.cells);
        assert.ok(first.cells.every((cell) => Number.isFinite(cell.x) && Number.isFinite(cell.y)));
      }
    }
  }
  const candidate = { laneStart: 1, flowOffset: 100.2 };
  const tolerances = [0, 0.1, 0.2, 0.5, 1];
  for (let index = 0; index < tolerances.length; index += 1) {
    const current = tolerances[index];
    const currentEligibility = candidate.flowOffset <= 100 + current;
    for (let later = index + 1; later < tolerances.length; later += 1) {
      const laterEligibility = candidate.flowOffset <= 100 + tolerances[later];
      assert.equal(currentEligibility && !laterEligibility, false);
    }
  }
});
