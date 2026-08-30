import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateHorizontalMasonryLayout,
  calculateHorizontalMasonryLayoutWithDiagnostics,
  calculateMasonryLayout,
  calculateMasonryLayoutWithDiagnostics,
  measureLayoutDisplacement,
} from "../dist/index.js";

const modes = ["start", "end", "center", "space-between", "space-evenly"];

const verticalItems = [
  { id: "plain", aspectRatio: 2 },
  {
    id: "span",
    aspectRatio: 1.5,
    layoutHint: { columnSpan: 2, preferredColumn: 0 },
  },
  {
    id: "locked",
    aspectRatio: 1,
    layoutHint: { lockedColumn: 1 },
    resolvedFootprint: { height: 100, forWidth: 205 },
  },
];

const horizontalItems = [
  { id: "plain", aspectRatio: 2 },
  {
    id: "span",
    aspectRatio: 1.5,
    layoutHint: { rowSpan: 2, preferredRow: 0 },
  },
  {
    id: "locked",
    aspectRatio: 1,
    layoutHint: { lockedRow: 1 },
    resolvedFootprint: { width: 100, forHeight: 205 },
  },
];

const verticalOptions = {
  containerWidth: 420,
  minColumnWidth: 190,
  minColumns: 2,
  maxColumns: 2,
  rowGap: 10,
  columnGap: 10,
  reservedRegions: [
    { laneStart: 0, laneSpan: 1, flowStart: 110, flowSize: 70 },
    { laneStart: 1, laneSpan: 2, flowStart: 260, flowSize: 55 },
  ],
};

const horizontalOptions = {
  containerHeight: 420,
  minRowHeight: 190,
  minRows: 2,
  maxRows: 2,
  rowGap: 10,
  columnGap: 10,
  reservedRegions: verticalOptions.reservedRegions,
};

function clone(value) {
  return structuredClone(value);
}

test("diagnostic layouts are exactly equivalent and expose factual vertical decisions", () => {
  const inputItems = clone(verticalItems);
  const inputOptions = clone(verticalOptions);
  const ordinary = calculateMasonryLayout(inputItems, inputOptions);
  const diagnosed = calculateMasonryLayoutWithDiagnostics(inputItems, inputOptions);

  assert.deepEqual(diagnosed.layout, ordinary);
  assert.deepEqual(inputItems, verticalItems);
  assert.deepEqual(inputOptions, verticalOptions);
  assert.equal(diagnosed.diagnostics.axis, "vertical");
  assert.equal(diagnosed.diagnostics.itemCount, verticalItems.length);
  assert.equal(diagnosed.diagnostics.laneCount, ordinary.columnCount);
  assert.equal(diagnosed.diagnostics.reservedRegionCount, 2);
  assert.equal(diagnosed.diagnostics.logicalFlowExtent, ordinary.containerHeight);
  assert.deepEqual(
    diagnosed.diagnostics.items.map(({ id, index }) => ({ id, index })),
    verticalItems.map(({ id }, index) => ({ id, index })),
  );

  const span = diagnosed.diagnostics.items[1];
  assert.equal(span.requestedLaneSpan, 2);
  assert.equal(span.resolvedLaneSpan, 2);
  assert.equal(span.requestedPreferredLane, 0);
  assert.equal(span.normalizedPreferredLane, 0);
  assert.equal(typeof span.preferredLaneHonored, "boolean");

  const locked = diagnosed.diagnostics.items[2];
  assert.equal(locked.requestedLockedLane, 1);
  assert.equal(locked.normalizedLockedLane, 1);
  assert.equal(locked.resolvedLaneStart, 1);
  assert.equal(locked.footprintStatus, "used");
  assert.equal(locked.reservedFlowShift >= 0, true);
  assert.equal(locked.distributedFlowOffset - locked.reservedAdjustedFlowOffset, locked.distributionFlowShift);
  for (const item of diagnosed.diagnostics.items) {
    for (const value of [
      item.crossSize,
      item.flowSize,
      item.frontierFlowOffset,
      item.reservedAdjustedFlowOffset,
      item.reservedFlowShift,
      item.distributedFlowOffset,
      item.distributionFlowShift,
    ]) {
      assert.equal(Number.isFinite(value), true);
    }
  }
});

test("horizontal diagnostics use logical rows and height-bound footprint status", () => {
  const ordinary = calculateHorizontalMasonryLayout(horizontalItems, horizontalOptions);
  const diagnosed = calculateHorizontalMasonryLayoutWithDiagnostics(horizontalItems, horizontalOptions);

  assert.deepEqual(diagnosed.layout, ordinary);
  assert.equal(diagnosed.diagnostics.axis, "horizontal");
  assert.equal(diagnosed.diagnostics.laneCount, ordinary.rowCount);
  assert.equal(diagnosed.diagnostics.logicalFlowExtent, ordinary.containerWidth);
  assert.equal(diagnosed.diagnostics.items[1].requestedLaneSpan, 2);
  assert.equal(diagnosed.diagnostics.items[1].resolvedLaneSpan, 2);
  assert.equal(diagnosed.diagnostics.items[2].requestedLockedLane, 1);
  assert.equal(diagnosed.diagnostics.items[2].footprintStatus, "used");
});

test("diagnostics distinguish none, used, and stale footprints", () => {
  const items = [
    { id: "none", aspectRatio: 2 },
    { id: "used", aspectRatio: 2, resolvedFootprint: { height: 80, forWidth: 210 } },
    { id: "stale", aspectRatio: 2, resolvedFootprint: { height: 80, forWidth: 209 } },
  ];
  const diagnostics = calculateMasonryLayoutWithDiagnostics(items, {
    containerWidth: 420,
    minColumnWidth: 190,
    minColumns: 2,
    maxColumns: 2,
  }).diagnostics.items;
  assert.deepEqual(diagnostics.map((item) => item.footprintStatus), ["none", "used", "stale"]);
});

test("logical diagnostics stay unchanged across flow and cross direction projections", () => {
  for (const axis of ["vertical", "horizontal"]) {
    const calculate = axis === "vertical"
      ? calculateMasonryLayoutWithDiagnostics
      : calculateHorizontalMasonryLayoutWithDiagnostics;
    const items = axis === "vertical" ? verticalItems : horizontalItems;
    const options = axis === "vertical" ? verticalOptions : horizontalOptions;
    const forward = calculate(items, options);
    const reversed = calculate(items, {
      ...options,
      flowDirection: "reverse",
      crossDirection: "reverse",
    });
    assert.deepEqual(reversed.diagnostics, forward.diagnostics);
    assert.notDeepEqual(reversed.layout.cells, forward.layout.cells);
  }
});

test("region permutations produce identical diagnostics and region-only layouts are factual", () => {
  const permuted = [...verticalOptions.reservedRegions].reverse();
  const first = calculateMasonryLayoutWithDiagnostics(verticalItems, verticalOptions);
  const second = calculateMasonryLayoutWithDiagnostics(verticalItems, {
    ...verticalOptions,
    reservedRegions: permuted,
  });
  assert.deepEqual(second.layout, first.layout);
  assert.deepEqual(second.diagnostics, first.diagnostics);

  const empty = calculateHorizontalMasonryLayoutWithDiagnostics([], {
    containerHeight: 320,
    minRowHeight: 320,
    reservedRegions: [{ laneStart: 0, laneSpan: 1, flowStart: 100, flowSize: 200 }],
  });
  assert.deepEqual(empty.diagnostics.items, []);
  assert.equal(empty.diagnostics.itemCount, 0);
  assert.equal(empty.diagnostics.reservedRegionCount, 1);
  assert.equal(empty.diagnostics.logicalFlowExtent, 300);
});

test("distribution shifts are observed without changing distribution semantics", () => {
  for (const flowDistribution of modes) {
    const diagnosed = calculateMasonryLayoutWithDiagnostics(verticalItems, {
      ...verticalOptions,
      flowDistribution,
    });
    assert.deepEqual(
      diagnosed.layout,
      calculateMasonryLayout(verticalItems, { ...verticalOptions, flowDistribution }),
    );
    for (const item of diagnosed.diagnostics.items) {
      assert.equal(
        item.distributionFlowShift,
        item.distributedFlowOffset - item.reservedAdjustedFlowOffset,
      );
    }
  }
});

test("displacement metrics match P13 retained-ID semantics and reject mixed axes", () => {
  const previous = calculateMasonryLayout(
    [{ id: "a", aspectRatio: 1 }, { id: "b", aspectRatio: 1 }],
    { containerWidth: 200, minColumnWidth: 200 },
  );
  const same = calculateMasonryLayout(
    [{ id: "a", aspectRatio: 1 }, { id: "b", aspectRatio: 1 }],
    { containerWidth: 200, minColumnWidth: 200 },
  );
  assert.deepEqual(measureLayoutDisplacement(previous, same), {
    totalDisplacement: 0,
    maximumDisplacement: 0,
    movedCount: 0,
  });

  const translated = {
    ...same,
    cells: same.cells.map((cell) => ({ ...cell, y: cell.y + 10 })),
  };
  assert.deepEqual(measureLayoutDisplacement(previous, translated), {
    totalDisplacement: 20,
    maximumDisplacement: 10,
    movedCount: 2,
  });

  const added = { ...same, cells: [...same.cells, { ...same.cells[0], id: "new", index: 2 }] };
  assert.deepEqual(measureLayoutDisplacement(previous, added), {
    totalDisplacement: 0,
    maximumDisplacement: 0,
    movedCount: 0,
  });

  const horizontal = calculateHorizontalMasonryLayout(
    [{ id: "a", aspectRatio: 1 }],
    { containerHeight: 200, minRowHeight: 200 },
  );
  assert.throws(
    () => measureLayoutDisplacement(previous, horizontal),
    (error) => error.code === "INVALID_OPTION",
  );
});

test("diagnostic calculators share ordinary validation and tolerate deterministic generated fixtures", () => {
  assert.throws(
    () => calculateMasonryLayoutWithDiagnostics(
      [{ id: "bad", aspectRatio: 0 }],
      { containerWidth: 200, minColumnWidth: 200 },
    ),
    (error) => error.code === "INVALID_ITEM",
  );

  let seed = 0x18d1;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed;
  };
  for (const axis of ["vertical", "horizontal"]) {
    for (let fixture = 0; fixture < 6; fixture += 1) {
      const items = Array.from({ length: 8 }, (_, index) => {
        const span = 1 + (next() % 3);
        const ratio = 0.7 + (next() % 180) / 100;
        return axis === "vertical"
          ? {
              id: `${axis}-${fixture}-${index}`,
              aspectRatio: ratio,
              layoutHint: {
                columnSpan: span,
                ...(index === 0 ? { lockedColumn: 2 } : {}),
                ...(index === 1 ? { preferredColumn: 1 } : {}),
              },
            }
          : {
              id: `${axis}-${fixture}-${index}`,
              aspectRatio: ratio,
              layoutHint: {
                rowSpan: span,
                ...(index === 0 ? { lockedRow: 2 } : {}),
                ...(index === 1 ? { preferredRow: 1 } : {}),
              },
            };
      });
      const options = axis === "vertical"
        ? { containerWidth: 760, minColumnWidth: 170, minColumns: 3, maxColumns: 3, gap: 9, reservedRegions: [{ laneStart: 0, laneSpan: 2, flowStart: 100, flowSize: 80 }] }
        : { containerHeight: 760, minRowHeight: 170, minRows: 3, maxRows: 3, gap: 9, reservedRegions: [{ laneStart: 0, laneSpan: 2, flowStart: 100, flowSize: 80 }] };
      for (const flowDistribution of modes) {
        const input = { ...options, flowDistribution, flowDirection: fixture % 2 ? "reverse" : "forward", crossDirection: fixture % 3 ? "forward" : "reverse" };
        const ordinary = axis === "vertical"
          ? calculateMasonryLayout(items, input)
          : calculateHorizontalMasonryLayout(items, input);
        const diagnosed = axis === "vertical"
          ? calculateMasonryLayoutWithDiagnostics(items, input)
          : calculateHorizontalMasonryLayoutWithDiagnostics(items, input);
        assert.deepEqual(diagnosed.layout, ordinary);
        assert.equal(diagnosed.diagnostics.items.length, items.length);
        assert.deepEqual(
          diagnosed.diagnostics.items.map((item) => [item.id, item.index]),
          items.map((item, index) => [item.id, index]),
        );
        assert.deepEqual(diagnosed.diagnostics, (axis === "vertical"
          ? calculateMasonryLayoutWithDiagnostics(items, input)
          : calculateHorizontalMasonryLayoutWithDiagnostics(items, input)).diagnostics);
      }
    }
  }
});
