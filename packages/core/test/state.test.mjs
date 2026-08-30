import assert from "node:assert/strict";
import test from "node:test";

import {
  GridMasonryError,
  createMasonryState,
  calculateMasonryLayout,
  calculateHorizontalMasonryLayout,
} from "../dist/index.js";
import { createVerticalAppendLayoutState } from "../dist/layout.js";
import { createHorizontalAppendLayoutState } from "../dist/horizontal-layout.js";

const verticalOptions = {
  containerWidth: 320,
  minColumnWidth: 150,
  minColumns: 2,
  maxColumns: 2,
  gap: 8,
};

const horizontalOptions = {
  containerHeight: 320,
  minRowHeight: 150,
  minRows: 2,
  maxRows: 2,
  gap: 8,
};

const verticalItems = [
  { id: "a", aspectRatio: 1 },
  { id: "b", aspectRatio: 2 },
];

test("vertical state append matches pure recomputation and keeps input immutable", () => {
  const state = createMasonryState({
    axis: "vertical",
    items: verticalItems,
    options: verticalOptions,
  });
  const added = { id: "c", aspectRatio: 0.75 };
  const result = state.append(added);
  assert.deepEqual(
    result,
    calculateMasonryLayout([...verticalItems, added], verticalOptions),
  );
  assert.deepEqual(state.inspect().items, [...verticalItems, added]);
  assert.deepEqual(verticalItems, [
    { id: "a", aspectRatio: 1 },
    { id: "b", aspectRatio: 2 },
  ]);
});

test("state update, remove, reorder, and resize are deterministic operations", () => {
  const state = createMasonryState({
    axis: "vertical",
    items: verticalItems,
    options: verticalOptions,
  });
  state.append({ id: "c", aspectRatio: 0.75 });
  state.update({ id: "b", aspectRatio: 0.5 });
  assert.deepEqual(state.inspect().items.map((item) => item.id), ["a", "b", "c"]);
  state.reorder(["c", "a", "b"]);
  assert.deepEqual(state.inspect().items.map((item) => item.id), ["c", "a", "b"]);
  state.remove("a");
  assert.deepEqual(state.inspect().items.map((item) => item.id), ["c", "b"]);
  const resized = state.resize({ ...verticalOptions, containerWidth: 500 });
  assert.deepEqual(resized, calculateMasonryLayout(state.inspect().items, { ...verticalOptions, containerWidth: 500 }));
  assert.equal(state.snapshot().axis, "vertical");
  assert.deepEqual(state.snapshot().items, state.inspect().items);
  assert.deepEqual(state.snapshot().layout, state.inspect().layout);
});

test("state rejects missing updates/removals and duplicate append through Core validation", () => {
  const state = createMasonryState({ axis: "vertical", items: verticalItems, options: verticalOptions });
  assert.throws(() => state.update({ id: "missing", aspectRatio: 1 }), GridMasonryError);
  assert.throws(() => state.remove("missing"), GridMasonryError);
  assert.throws(() => state.append({ id: "a", aspectRatio: 1 }), (error) => error.code === "DUPLICATE_ITEM_ID");
});

test("horizontal state uses the same state contract and horizontal calculator", () => {
  const items = [
    { id: "a", aspectRatio: 2, layoutHint: { rowSpan: 2 } },
    { id: "b", aspectRatio: 1 },
  ];
  const state = createMasonryState({ axis: "horizontal", items, options: horizontalOptions });
  const added = { id: "c", aspectRatio: 0.5 };
  const result = state.append(added);
  assert.deepEqual(result, calculateHorizontalMasonryLayout([...items, added], horizontalOptions));
  state.reorder(["c", "a", "b"]);
  assert.deepEqual(state.inspect().items.map((item) => item.id), ["c", "a", "b"]);
});

test("snapshot restores only an unchanged coherent vertical checkpoint", () => {
  const state = createMasonryState({ axis: "vertical", items: verticalItems, options: verticalOptions });
  const saved = state.snapshot();
  const before = state.inspect();
  assert.deepEqual(state.restore(saved), before.layout);
  saved.items[0].id = "mutated-outside-state";
  saved.options.containerWidth = 999;
  saved.layout.cells[0].x += 1;
  assert.equal(state.inspect().items[0].id, "a");
  assert.equal(state.inspect().options.containerWidth, verticalOptions.containerWidth);
  assert.deepEqual(state.inspect().layout, before.layout);
});

test("stale vertical snapshots reject every semantic input mutation atomically", () => {
  const cases = [
    ["order", (state) => state.reorder(["b", "a"])],
    ["added id", (state) => state.append({ id: "c", aspectRatio: 1 })],
    ["removed id", (state) => state.remove("b")],
    ["aspect ratio", (state) => state.update({ id: "b", aspectRatio: 0.5 })],
    ["span", (state) => state.update({ id: "b", aspectRatio: 2, layoutHint: { columnSpan: 2 } })],
    ["preferred lane", (state) => state.update({ id: "b", aspectRatio: 2, layoutHint: { preferredColumn: 1 } })],
    ["explicit lock", (state) => state.update({ id: "b", aspectRatio: 2, layoutHint: { lockedColumn: 1 } })],
    ["footprint", (state) => state.update({ id: "b", aspectRatio: 2, resolvedFootprint: { height: 100, forWidth: 156 } })],
    ["footprint binding", (state) => state.update({ id: "b", aspectRatio: 2, resolvedFootprint: { height: 100, forWidth: 157 } })],
    ["cross size", (state) => state.resize({ ...verticalOptions, containerWidth: 500 })],
    ["distribution", (state) => state.resize({ ...verticalOptions, flowDistribution: "space-evenly" })],
    ["other layout option", (state) => state.resize({ ...verticalOptions, gap: 12 })],
  ];
  for (const [label, mutate] of cases) {
    const state = createMasonryState({ axis: "vertical", items: verticalItems, options: verticalOptions });
    const snapshot = state.snapshot();
    mutate(state);
    const before = state.inspect();
    assert.throws(
      () => state.restore(snapshot),
      (error) => error.code === "INVALID_OPTION",
      label,
    );
    assert.deepEqual(state.inspect(), before, label);
  }
});

test("snapshot corruption, cross-axis, and reflow-strategy mismatches reject atomically", () => {
  const state = createMasonryState({ axis: "vertical", items: verticalItems, options: verticalOptions });
  state.append({ id: "c", aspectRatio: 0.5 });
  const before = state.inspect();
  const inconsistent = state.snapshot();
  inconsistent.layout.cells[0].x += 1;
  assert.throws(() => state.restore(inconsistent), (error) => error.code === "INVALID_OPTION");
  assert.deepEqual(state.inspect(), before);

  const horizontal = createMasonryState({
    axis: "horizontal",
    items: [{ id: "h", aspectRatio: 1 }],
    options: { containerHeight: 200, minRowHeight: 200, minRows: 1, maxRows: 1 },
  });
  const crossAxis = horizontal.snapshot();
  assert.throws(() => state.restore(crossAxis), (error) => error.code === "INVALID_OPTION");
  assert.deepEqual(state.inspect(), before);

  const strategyMismatch = state.snapshot();
  strategyMismatch.reflowStrategy = "stable";
  assert.throws(() => state.restore(strategyMismatch), (error) => error.code === "INVALID_OPTION");
  assert.deepEqual(state.inspect(), before);
});

test("vertical snapshot rejects flow-axis and extent tampering atomically", () => {
  const corruptions = [
    ["illegal cross projection", (layout) => { layout.cells[0].x += 1; }],
    ["arbitrary flow replacement", (layout) => { layout.cells[2].y += 1; }],
    ["flow translation", (layout) => { layout.cells.forEach((cell) => { cell.y += 1; }); }],
    ["same-column flow reorder", (layout) => {
      const first = layout.cells[0].y;
      layout.cells[0].y = layout.cells[2].y;
      layout.cells[2].y = first;
    }],
    ["flow beyond extent", (layout) => { layout.cells.at(-1).y = layout.containerHeight + 10; }],
    ["width corruption", (layout) => { layout.cells[0].width += 1; }],
    ["height corruption", (layout) => { layout.cells[0].height += 1; }],
    ["span and lane corruption", (layout) => {
      layout.cells[0].column = 1;
      layout.cells[0].columnSpan = 2;
    }],
  ];
  for (const [label, corrupt] of corruptions) {
    const state = createMasonryState({
      axis: "vertical",
      items: [
        { id: "a", aspectRatio: 1 },
        { id: "b", aspectRatio: 1 },
        { id: "c", aspectRatio: 1 },
        { id: "d", aspectRatio: 1 },
        { id: "e", aspectRatio: 1 },
        { id: "f", aspectRatio: 1 },
      ],
      options: verticalOptions,
    });
    const snapshot = state.snapshot();
    const before = state.inspect();
    corrupt(snapshot.layout);
    assert.throws(() => state.restore(snapshot), (error) => error.code === "INVALID_OPTION", label);
    assert.deepEqual(state.inspect(), before, label);
  }
});

test("horizontal snapshot rejects flow-axis and extent tampering atomically", () => {
  const corruptions = [
    ["illegal row projection", (layout) => { layout.cells[0].y += 1; }],
    ["arbitrary flow replacement", (layout) => { layout.cells[2].x += 1; }],
    ["flow translation", (layout) => { layout.cells.forEach((cell) => { cell.x += 1; }); }],
    ["same-row flow reorder", (layout) => {
      const first = layout.cells[0].x;
      layout.cells[0].x = layout.cells[2].x;
      layout.cells[2].x = first;
    }],
    ["extent mismatch", (layout) => { layout.containerWidth += 1; }],
  ];
  for (const [label, corrupt] of corruptions) {
    const state = createMasonryState({
      axis: "horizontal",
      items: [
        { id: "a", aspectRatio: 1 },
        { id: "b", aspectRatio: 1 },
        { id: "c", aspectRatio: 1 },
        { id: "d", aspectRatio: 1 },
        { id: "e", aspectRatio: 1 },
        { id: "f", aspectRatio: 1 },
      ],
      options: horizontalOptions,
    });
    const snapshot = state.snapshot();
    const before = state.inspect();
    corrupt(snapshot.layout);
    assert.throws(() => state.restore(snapshot), (error) => error.code === "INVALID_OPTION", label);
    assert.deepEqual(state.inspect(), before, label);
  }
});

test("unchanged compact checkpoints restore across all flow distributions", () => {
  for (const flowDistribution of ["start", "end", "center", "space-between", "space-evenly"]) {
    const vertical = createMasonryState({
      axis: "vertical",
      items: verticalItems,
      options: { ...verticalOptions, flowDistribution },
    });
    const verticalSnapshot = vertical.snapshot();
    assert.deepEqual(vertical.restore(verticalSnapshot), verticalSnapshot.layout, `vertical ${flowDistribution}`);

    const horizontal = createMasonryState({
      axis: "horizontal",
      items: [{ id: "a", aspectRatio: 2 }, { id: "b", aspectRatio: 1 }],
      options: { ...horizontalOptions, flowDistribution },
    });
    const horizontalSnapshot = horizontal.snapshot();
    assert.deepEqual(horizontal.restore(horizontalSnapshot), horizontalSnapshot.layout, `horizontal ${flowDistribution}`);
  }
});

test("snapshots preserve explicit locks, spans, and resolved footprints", () => {
  const vertical = createMasonryState({
    axis: "vertical",
    items: [
      { id: "locked", aspectRatio: 1, layoutHint: { lockedColumn: 1 } },
      { id: "span", aspectRatio: 2, layoutHint: { columnSpan: 2 }, resolvedFootprint: { height: 160, forWidth: 320 } },
    ],
    options: verticalOptions,
  });
  const verticalSnapshot = vertical.snapshot();
  assert.deepEqual(vertical.restore(verticalSnapshot), verticalSnapshot.layout);

  const horizontal = createMasonryState({
    axis: "horizontal",
    items: [
      { id: "locked", aspectRatio: 1, layoutHint: { lockedRow: 1 } },
      { id: "span", aspectRatio: 1, layoutHint: { rowSpan: 2 }, resolvedFootprint: { width: 320, forHeight: 320 } },
    ],
    options: horizontalOptions,
  });
  const horizontalSnapshot = horizontal.snapshot();
  assert.deepEqual(horizontal.restore(horizontalSnapshot), horizontalSnapshot.layout);
});

test("semantic A to B to exact A permits restoring checkpoint A without rollback", () => {
  const state = createMasonryState({ axis: "vertical", items: verticalItems, options: verticalOptions });
  const snapshot = state.snapshot();
  state.update({ id: "b", aspectRatio: 0.5 });
  state.update({ id: "b", aspectRatio: 2 });
  assert.deepEqual(state.restore(snapshot), snapshot.layout);
  assert.deepEqual(state.inspect().items, verticalItems);
});

test("horizontal semantic changes also stale a checkpoint", () => {
  const horizontalItems = [
    { id: "a", aspectRatio: 2, layoutHint: { rowSpan: 2 } },
    { id: "b", aspectRatio: 1 },
  ];
  const options = { containerHeight: 320, minRowHeight: 150, minRows: 2, maxRows: 2, gap: 8 };
  const state = createMasonryState({ axis: "horizontal", items: horizontalItems, options });
  const snapshot = state.snapshot();
  state.update({ id: "b", aspectRatio: 1.5, layoutHint: { rowSpan: 2 } });
  const before = state.inspect();
  assert.throws(() => state.restore(snapshot), (error) => error.code === "INVALID_OPTION");
  assert.deepEqual(state.inspect(), before);
});

test("stable checkpoints restore only matching vertical and horizontal state", () => {
  const cases = [
    {
      axis: "vertical",
      items: [{ id: "v", aspectRatio: 1 }],
      options: { containerWidth: 200, minColumnWidth: 200, minColumns: 1, maxColumns: 1 },
    },
    {
      axis: "horizontal",
      items: [{ id: "h", aspectRatio: 1 }],
      options: { containerHeight: 200, minRowHeight: 200, minRows: 1, maxRows: 1 },
    },
  ];
  for (const input of cases) {
    const state = createMasonryState({ ...input, reflowStrategy: "stable" });
    const snapshot = state.snapshot();
    assert.deepEqual(state.restore(snapshot), snapshot.layout, input.axis);
    assert.equal(state.snapshot().reflowStrategy, "stable", input.axis);
  }
});

test("stable vertical reflow preserves retained lanes while compact remains the default", () => {
  const items = [
    { id: "a", aspectRatio: 1 },
    { id: "b", aspectRatio: 1 },
    { id: "c", aspectRatio: 1 },
    { id: "d", aspectRatio: 1 },
  ];
  const stable = createMasonryState({
    axis: "vertical",
    items,
    options: { containerWidth: 600, minColumnWidth: 180, minColumns: 3, maxColumns: 3, gap: 8 },
    reflowStrategy: "stable",
  });
  const before = new Map(stable.layout.cells.map((cell) => [cell.id, cell.column]));
  stable.remove("a");
  assert.deepEqual(
    stable.layout.cells.map((cell) => [cell.id, cell.column]),
    [["b", before.get("b")], ["c", before.get("c")], ["d", before.get("d")]],
  );
  const stableSnapshot = stable.snapshot();
  assert.deepEqual(stable.restore(stableSnapshot), stableSnapshot.layout);
  const previousLayout = calculateMasonryLayout(items, stable.inspect().options);
  const compactAfterRemoval = calculateMasonryLayout(items.slice(1), stable.inspect().options);
  const displacement = (candidate) => candidate.cells.reduce((total, cell) => {
    const previous = previousLayout.cells.find((beforeCell) => beforeCell.id === cell.id);
    return total + (previous === undefined ? 0 : Math.abs(cell.x - previous.x) + Math.abs(cell.y - previous.y));
  }, 0);
  assert.ok(displacement(stable.layout) < displacement(compactAfterRemoval));
  assert.equal(stable.snapshot().reflowStrategy, "stable");

  const compact = createMasonryState({ axis: "vertical", items, options: stable.inspect().options });
  compact.remove("a");
  assert.deepEqual(compact.layout.cells.map((cell) => cell.column), [0, 1, 2]);
});

test("stable candidate selection preserves explicit locks and composes with every distribution", () => {
  for (const flowDistribution of ["start", "end", "center", "space-between", "space-evenly"]) {
    const state = createMasonryState({
      axis: "vertical",
      items: [
        { id: "a", aspectRatio: 1 },
        { id: "locked", aspectRatio: 1, layoutHint: { lockedColumn: 2 } },
        { id: "c", aspectRatio: 1 },
        { id: "d", aspectRatio: 1 },
      ],
      options: {
        containerWidth: 600,
        minColumnWidth: 180,
        minColumns: 3,
        maxColumns: 3,
        gap: 8,
        flowDistribution,
      },
      reflowStrategy: "stable",
    });
    state.remove("a");
    const locked = state.layout.cells.find((cell) => cell.id === "locked");
    assert.equal(locked?.column, 2, flowDistribution);
    assert.equal(new Set(state.layout.cells.map((cell) => cell.id)).size, state.layout.cells.length);
    assert.ok(state.layout.cells.every((cell) => Number.isFinite(cell.x) && Number.isFinite(cell.y)), flowDistribution);
  }
});

test("stable reflow clamps retained lanes on resize and preserves horizontal symmetry", () => {
  const items = [
    { id: "a", aspectRatio: 1 },
    { id: "b", aspectRatio: 1 },
    { id: "c", aspectRatio: 1 },
  ];
  const vertical = createMasonryState({
    axis: "vertical",
    items,
    options: { containerWidth: 600, minColumnWidth: 180, minColumns: 3, maxColumns: 3, gap: 8 },
    reflowStrategy: "stable",
  });
  vertical.resize({ containerWidth: 320, minColumnWidth: 180, minColumns: 1, maxColumns: 1, gap: 8 });
  assert.equal(vertical.layout.columnCount, 1);
  assert.ok(vertical.layout.cells.every((cell) => cell.column === 0 && cell.columnSpan === 1));

  const horizontal = createMasonryState({
    axis: "horizontal",
    items,
    options: { containerHeight: 600, minRowHeight: 180, minRows: 3, maxRows: 3, gap: 8 },
    reflowStrategy: "stable",
  });
  const horizontalBefore = new Map(horizontal.layout.cells.map((cell) => [cell.id, cell.row]));
  horizontal.remove("a");
  assert.deepEqual(
    horizontal.layout.cells.map((cell) => [cell.id, cell.row]),
    [["b", horizontalBefore.get("b")], ["c", horizontalBefore.get("c")]],
  );
  const horizontalSnapshot = horizontal.snapshot();
  assert.deepEqual(horizontal.restore(horizontalSnapshot), horizontalSnapshot.layout);
  assert.ok(horizontal.layout.cells.every((cell) => Number.isFinite(cell.x) && Number.isFinite(cell.y)));
});

test("stable reflow composes with distribution and failed mutations remain atomic", () => {
  const items = [
    { id: "a", aspectRatio: 1 },
    { id: "b", aspectRatio: 1, layoutHint: { columnSpan: 2 } },
    { id: "c", aspectRatio: 0.5 },
  ];
  const state = createMasonryState({
    axis: "vertical",
    items,
    options: {
      containerWidth: 600,
      minColumnWidth: 180,
      minColumns: 3,
      maxColumns: 3,
      gap: 8,
      flowDistribution: "space-evenly",
    },
    reflowStrategy: "stable",
  });
  const before = state.inspect();
  assert.throws(() => state.append({ id: "a", aspectRatio: 1 }), (error) => error.code === "DUPLICATE_ITEM_ID");
  assert.deepEqual(state.inspect(), before);
  assert.ok(state.layout.cells.every((cell) => Number.isFinite(cell.x) && Number.isFinite(cell.y)));
  assert.equal(state.snapshot().reflowStrategy, "stable");
});

test("incremental start append matches the pure vertical oracle across spans and footprints", () => {
  const options = { containerWidth: 620, minColumnWidth: 180, minColumns: 3, maxColumns: 3, gap: 8 };
  const initial = [{ id: "a", aspectRatio: 1 }, { id: "b", aspectRatio: 2, layoutHint: { columnSpan: 2 } }];
  const incremental = createVerticalAppendLayoutState(initial, options);
  assert.ok(incremental);
  let current = initial.slice();
  for (const item of [
    { id: "c", aspectRatio: 0.75, resolvedFootprint: { height: 240, forWidth: 464 } },
    { id: "d", aspectRatio: 1.5, layoutHint: { preferredColumn: 2 } },
    { id: "e", aspectRatio: 1, layoutHint: { lockedColumn: 1 } },
  ]) {
    current = [...current, item];
    assert.deepEqual(incremental.append(item), calculateMasonryLayout(current, options));
  }
});

test("incremental start append matches the pure horizontal oracle and distribution falls back safely", () => {
  const options = { containerHeight: 620, minRowHeight: 180, minRows: 3, maxRows: 3, gap: 8 };
  const initial = [{ id: "a", aspectRatio: 2 }, { id: "b", aspectRatio: 1, layoutHint: { rowSpan: 2 } }];
  const incremental = createHorizontalAppendLayoutState(initial, options);
  assert.ok(incremental);
  let current = initial.slice();
  for (const item of [
    { id: "c", aspectRatio: 0.5, resolvedFootprint: { width: 240, forHeight: 404 } },
    { id: "d", aspectRatio: 1.5, layoutHint: { preferredRow: 2 } },
  ]) {
    current = [...current, item];
    assert.deepEqual(
      incremental.append(item),
      calculateHorizontalMasonryLayout(current, options),
    );
  }
  assert.equal(
    createVerticalAppendLayoutState(initial, {
      containerWidth: 620,
      minColumnWidth: 180,
      minColumns: 3,
      maxColumns: 3,
      flowDistribution: "space-between",
    }),
    undefined,
  );
});
