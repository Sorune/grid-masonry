import assert from "node:assert/strict";
import test from "node:test";

import {
  GridMasonryError,
  calculateMasonryLayout,
} from "../dist/index.js";

const defaultOptions = {
  containerWidth: 1000,
  gap: 8,
  minColumnWidth: 220,
  minColumns: 1,
  maxColumns: 6,
};

function overlaps(a, b) {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

test("empty input produces zero-height layout", () => {
  const result = calculateMasonryLayout([], defaultOptions);

  assert.equal(result.containerHeight, 0);
  assert.deepEqual(result.cells, []);
  assert.equal(result.coordinateSpace, "container-relative-logical");
});

test("single item preserves aspect ratio and starts at container origin", () => {
  const result = calculateMasonryLayout(
    [{ id: "a", aspectRatio: 4 / 3 }],
    defaultOptions,
  );

  const [cell] = result.cells;

  assert.ok(cell);
  assert.equal(cell.x, 0);
  assert.equal(cell.y, 0);
  assert.ok(Math.abs(cell.width / cell.height - 4 / 3) < 1e-12);
});

test("mixed ratios never exceed container width", () => {
  const items = [
    { id: "a", aspectRatio: 1.5 },
    { id: "b", aspectRatio: 0.75 },
    { id: "c", aspectRatio: 1 },
    { id: "d", aspectRatio: 16 / 9 },
    { id: "e", aspectRatio: 9 / 16 },
  ];

  const result = calculateMasonryLayout(items, defaultOptions);

  for (const cell of result.cells) {
    assert.ok(cell.x >= 0);
    assert.ok(cell.y >= 0);
    assert.ok(cell.width > 0);
    assert.ok(cell.height > 0);
    assert.ok(cell.x + cell.width <= result.containerWidth + 1e-9);
  }
});

test("shortest-column placement is deterministic with lower-index tie break", () => {
  const items = Array.from({ length: 8 }, (_, index) => ({
    id: `item-${index}`,
    aspectRatio: 1,
  }));

  const first = calculateMasonryLayout(items, defaultOptions);
  const second = calculateMasonryLayout(items, defaultOptions);

  assert.deepEqual(first, second);

  const firstRow = first.cells.slice(0, first.columnCount);
  assert.deepEqual(
    firstRow.map((cell) => cell.column),
    Array.from({ length: first.columnCount }, (_, index) => index),
  );
});

test("preferred column wins only an otherwise equivalent lane tie", () => {
  const result = calculateMasonryLayout(
    [{ id: "a", aspectRatio: 1, layoutHint: { preferredColumn: 2 } }],
    { ...defaultOptions, minColumns: 3, maxColumns: 3 },
  );
  assert.equal(result.cells[0]?.column, 2);
});

test("locked column is normalized and remains a hard lane choice", () => {
  const result = calculateMasonryLayout(
    [
      { id: "a", aspectRatio: 1, layoutHint: { lockedColumn: 99 } },
      { id: "b", aspectRatio: 1, layoutHint: { lockedColumn: 2 } },
    ],
    { ...defaultOptions, minColumns: 3, maxColumns: 3 },
  );
  assert.equal(result.cells[0]?.column, 2);
  assert.equal(result.cells[1]?.column, 2);
  assert.ok(
    (result.cells[1]?.y ?? 0) >=
      (result.cells[0]?.y ?? 0) + (result.cells[0]?.height ?? 0) + 8,
  );
});

test("cells do not overlap", () => {
  const items = Array.from({ length: 50 }, (_, index) => ({
    id: `item-${index}`,
    aspectRatio: 0.5 + ((index * 37) % 200) / 100,
  }));

  const result = calculateMasonryLayout(items, defaultOptions);

  for (let i = 0; i < result.cells.length; i += 1) {
    for (let j = i + 1; j < result.cells.length; j += 1) {
      const a = result.cells[i];
      const b = result.cells[j];
      assert.ok(a && b);
      assert.equal(overlaps(a, b), false, `${a.id} overlaps ${b.id}`);
    }
  }
});

test("separate row and column gutters are respected", () => {
  const result = calculateMasonryLayout(
    [
      { id: "a", aspectRatio: 1 },
      { id: "b", aspectRatio: 1 },
      { id: "c", aspectRatio: 1 },
      { id: "d", aspectRatio: 1 },
      { id: "e", aspectRatio: 1 },
    ],
    {
      containerWidth: 600,
      minColumnWidth: 180,
      columnGap: 12,
      rowGap: 20,
      minColumns: 3,
      maxColumns: 3,
    },
  );

  assert.equal(result.columnGap, 12);
  assert.equal(result.rowGap, 20);
  assert.equal(result.columnCount, 3);

  const first = result.cells[0];
  const fourth = result.cells[3];
  assert.ok(first && fourth);
  assert.equal(fourth.column, 0);
  assert.ok(Math.abs(fourth.y - (first.height + 20)) < 1e-12);
});

test("maxColumnWidth may add columns while respecting maxColumns", () => {
  const result = calculateMasonryLayout([], {
    containerWidth: 1600,
    minColumnWidth: 200,
    maxColumnWidth: 260,
    gap: 8,
    minColumns: 1,
    maxColumns: 8,
  });

  assert.ok(result.columnWidth <= 260 + 1e-9);
  assert.ok(result.columnCount <= 8);
});

test("duplicate ids fail explicitly", () => {
  assert.throws(
    () =>
      calculateMasonryLayout(
        [
          { id: "same", aspectRatio: 1 },
          { id: "same", aspectRatio: 2 },
        ],
        defaultOptions,
      ),
    (error) =>
      error instanceof GridMasonryError && error.code === "DUPLICATE_ITEM_ID",
  );
});

test("invalid aspect ratio fails explicitly", () => {
  assert.throws(
    () =>
      calculateMasonryLayout(
        [{ id: "bad", aspectRatio: 0 }],
        defaultOptions,
      ),
    (error) =>
      error instanceof GridMasonryError && error.code === "INVALID_ITEM",
  );
});

test("invalid layout options fail explicitly", () => {
  assert.throws(
    () =>
      calculateMasonryLayout([], {
        ...defaultOptions,
        containerWidth: 0,
      }),
    (error) =>
      error instanceof GridMasonryError && error.code === "INVALID_OPTION",
  );
});

test("large deterministic fixture completes and returns every item", () => {
  const items = Array.from({ length: 10_000 }, (_, index) => ({
    id: `photo-${index}`,
    aspectRatio: 0.4 + ((index * 71) % 260) / 100,
  }));

  const result = calculateMasonryLayout(items, {
    containerWidth: 1440,
    gap: 8,
    minColumnWidth: 220,
    maxColumns: 8,
  });

  assert.equal(result.cells.length, items.length);
  assert.ok(result.containerHeight > 0);
});

test("fill sizing remains the backward-compatible default", () => {
  const implicit = calculateMasonryLayout([], {
    containerWidth: 1000,
    minColumnWidth: 220,
    maxColumnWidth: 230,
    gap: 8,
    maxColumns: 6,
  });
  const explicit = calculateMasonryLayout([], {
    containerWidth: 1000,
    minColumnWidth: 220,
    maxColumnWidth: 230,
    gap: 8,
    maxColumns: 6,
    columnSizing: "fill",
  });

  assert.deepEqual(implicit, explicit);
  assert.equal(implicit.contentWidth, implicit.containerWidth);
  assert.equal(implicit.contentOffsetX, 0);
});

test("cap sizing preserves baseline column count and allows horizontal slack", () => {
  const result = calculateMasonryLayout(
    [{ id: "a", aspectRatio: 1 }],
    {
      containerWidth: 1000,
      minColumnWidth: 220,
      maxColumnWidth: 230,
      gap: 8,
      maxColumns: 6,
      columnSizing: "cap",
      columnAlignment: "center",
    },
  );

  assert.equal(result.columnCount, 4);
  assert.equal(result.columnWidth, 230);
  assert.equal(result.contentWidth, 944);
  assert.equal(result.contentOffsetX, 28);
  assert.equal(result.cells[0]?.x, 28);
});

test("cap sizing supports end alignment", () => {
  const result = calculateMasonryLayout(
    [{ id: "a", aspectRatio: 1 }],
    {
      containerWidth: 1000,
      minColumnWidth: 220,
      maxColumnWidth: 230,
      gap: 8,
      maxColumns: 6,
      columnSizing: "cap",
      columnAlignment: "end",
    },
  );

  assert.equal(result.contentOffsetX, 56);
  assert.equal(result.cells[0]?.x, 56);
});

const footprintOptions = {
  containerWidth: 240,
  minColumnWidth: 240,
  minColumns: 1,
  maxColumns: 1,
  gap: 0,
};

test("ratio-only items preserve the V1 height calculation", () => {
  const result = calculateMasonryLayout(
    [{ id: "ratio-only", aspectRatio: 4 / 3 }],
    footprintOptions,
  );

  assert.equal(result.columnWidth, 240);
  assert.equal(result.cells[0]?.height, 180);
});

test("a current resolved footprint determines cell height", () => {
  const result = calculateMasonryLayout(
    [
      {
        id: "card",
        aspectRatio: 4 / 3,
        resolvedFootprint: { height: 236, forWidth: 240 },
      },
    ],
    footprintOptions,
  );

  assert.equal(result.cells[0]?.height, 236);
  assert.equal(result.cells[0]?.aspectRatio, 4 / 3);
});

test("skyline propagation uses the whole resolved footprint", () => {
  const result = calculateMasonryLayout(
    [
      {
        id: "card",
        aspectRatio: 4 / 3,
        resolvedFootprint: { height: 236, forWidth: 240 },
      },
      { id: "next", aspectRatio: 1 },
    ],
    { ...footprintOptions, rowGap: 8 },
  );

  assert.equal(result.cells[0]?.height, 236);
  assert.equal(result.cells[1]?.y, 244);
});

test("a valid but stale footprint falls back to ratio-derived height", () => {
  const result = calculateMasonryLayout(
    [
      {
        id: "stale-card",
        aspectRatio: 4 / 3,
        resolvedFootprint: { height: 236, forWidth: 200 },
      },
    ],
    footprintOptions,
  );

  assert.equal(result.cells[0]?.height, 180);
});

test("an exact footprint width is current", () => {
  const result = calculateMasonryLayout(
    [
      {
        id: "exact",
        aspectRatio: 4 / 3,
        resolvedFootprint: { height: 236, forWidth: 240 },
      },
    ],
    footprintOptions,
  );

  assert.equal(result.cells[0]?.height, 236);
});

test("a tiny footprint width difference inside tolerance is current", () => {
  const result = calculateMasonryLayout(
    [
      {
        id: "nearby",
        aspectRatio: 4 / 3,
        resolvedFootprint: { height: 236, forWidth: 240 + 1e-8 },
      },
    ],
    footprintOptions,
  );

  assert.equal(result.cells[0]?.height, 236);
});

test("a meaningful footprint width difference is stale", () => {
  const result = calculateMasonryLayout(
    [
      {
        id: "different-width",
        aspectRatio: 4 / 3,
        resolvedFootprint: { height: 236, forWidth: 240 + 1e-3 },
      },
    ],
    footprintOptions,
  );

  assert.equal(result.cells[0]?.height, 180);
});

function assertInvalidFootprint(footprint) {
  assert.throws(
    () =>
      calculateMasonryLayout(
        [{ id: "invalid-footprint", aspectRatio: 4 / 3, resolvedFootprint: footprint }],
        footprintOptions,
      ),
    (error) =>
      error instanceof GridMasonryError && error.code === "INVALID_ITEM",
  );
}

test("invalid resolved footprint heights fail item validation", () => {
  for (const height of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assertInvalidFootprint({ height, forWidth: 240 });
  }
});

test("invalid resolved footprint widths fail item validation", () => {
  for (const forWidth of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assertInvalidFootprint({ height: 236, forWidth });
  }
});

test("resolved footprint does not replace intrinsic aspect ratio semantics", () => {
  const result = calculateMasonryLayout(
    [
      {
        id: "card",
        aspectRatio: 4 / 3,
        resolvedFootprint: { height: 236, forWidth: 240 },
      },
    ],
    footprintOptions,
  );

  assert.equal(result.cells[0]?.aspectRatio, 4 / 3);
  assert.notEqual(result.cells[0]?.width / result.cells[0]?.height, 4 / 3);
});

test("resolved footprint height contributes to container height", () => {
  const result = calculateMasonryLayout(
    [
      {
        id: "card",
        aspectRatio: 4 / 3,
        resolvedFootprint: { height: 236, forWidth: 240 },
      },
    ],
    { ...footprintOptions, rowGap: 8 },
  );

  assert.equal(result.containerHeight, 236);
});

test("ratio-derived and resolved items retain deterministic shortest-column placement", () => {
  const items = [
    { id: "ratio-a", aspectRatio: 1 },
    {
      id: "resolved-b",
      aspectRatio: 1,
      resolvedFootprint: { height: 300, forWidth: 240 },
    },
    { id: "ratio-c", aspectRatio: 1 },
    {
      id: "resolved-d",
      aspectRatio: 1,
      resolvedFootprint: { height: 100, forWidth: 240 },
    },
  ];
  const options = {
    containerWidth: 488,
    minColumnWidth: 240,
    minColumns: 2,
    maxColumns: 2,
    gap: 8,
  };

  const first = calculateMasonryLayout(items, options);
  const second = calculateMasonryLayout(items, options);

  assert.deepEqual(first, second);
  assert.deepEqual(
    first.cells.map((cell) => [cell.id, cell.column, cell.height]),
    [
      ["ratio-a", 0, 240],
      ["resolved-b", 1, 300],
      ["ratio-c", 0, 240],
      ["resolved-d", 1, 100],
    ],
  );
});

const spanOptions = {
  containerWidth: 316,
  minColumnWidth: 100,
  minColumns: 3,
  maxColumns: 3,
  gap: 8,
};

test("omitted span preserves the previous geometry and emits span one", () => {
  const items = [
    { id: "a", aspectRatio: 1 },
    { id: "b", aspectRatio: 2 },
    { id: "c", aspectRatio: 0.5 },
    { id: "d", aspectRatio: 1.5 },
  ];
  const result = calculateMasonryLayout(items, defaultOptions);

  assert.deepEqual(
    result.cells.map(({ id, column, x, y, width, height, aspectRatio, columnSpan }) => ({
      id,
      column,
      x,
      y,
      width,
      height,
      aspectRatio,
      columnSpan,
    })),
    calculateMasonryLayout(
      items.map((item) => ({ ...item, layoutHint: { columnSpan: 1 } })),
      defaultOptions,
    ).cells.map(({ id, column, x, y, width, height, aspectRatio, columnSpan }) => ({
      id,
      column,
      x,
      y,
      width,
      height,
      aspectRatio,
      columnSpan,
    })),
  );
  assert.ok(result.cells.every((cell) => cell.columnSpan === 1));
});

test("explicit span one is equivalent to omitted span", () => {
  const omitted = calculateMasonryLayout(
    [{ id: "a", aspectRatio: 4 / 3 }],
    spanOptions,
  );
  const explicit = calculateMasonryLayout(
    [{ id: "a", aspectRatio: 4 / 3, layoutHint: { columnSpan: 1 } }],
    spanOptions,
  );

  assert.deepEqual(explicit, omitted);
  assert.equal(explicit.cells[0]?.columnSpan, 1);
});

test("span two uses two contiguous columns and the expanded width", () => {
  const result = calculateMasonryLayout(
    [{ id: "wide", aspectRatio: 2, layoutHint: { columnSpan: 2 } }],
    spanOptions,
  );
  const cell = result.cells[0];

  assert.ok(cell);
  assert.equal(cell.column, 0);
  assert.equal(cell.columnSpan, 2);
  assert.equal(cell.x, 0);
  assert.equal(cell.width, 208);
  assert.equal(cell.height, 104);
});

test("equal span windows use the lower starting column", () => {
  const result = calculateMasonryLayout(
    [{ id: "tie", aspectRatio: 1, layoutHint: { columnSpan: 2 } }],
    spanOptions,
  );

  assert.equal(result.cells[0]?.column, 0);
  assert.equal(result.cells[0]?.y, 0);
});

test("uneven skyline selects the lowest contiguous window", () => {
  const result = calculateMasonryLayout(
    [
      { id: "height-200", aspectRatio: 0.5 },
      { id: "height-100", aspectRatio: 1 },
      { id: "height-50", aspectRatio: 2 },
      { id: "wide", aspectRatio: 1, layoutHint: { columnSpan: 2 } },
    ],
    { ...spanOptions, rowGap: 0 },
  );
  const cell = result.cells[3];

  assert.ok(cell);
  assert.equal(cell.column, 1);
  assert.equal(cell.y, 100);
  assert.equal(cell.width, 208);
});

test("a multi-span placement updates every covered skyline column", () => {
  const result = calculateMasonryLayout(
    [
      { id: "height-200", aspectRatio: 0.5 },
      { id: "height-100", aspectRatio: 1 },
      { id: "height-50", aspectRatio: 2 },
      { id: "wide", aspectRatio: 10, layoutHint: { columnSpan: 2 } },
      { id: "after", aspectRatio: 1 },
    ],
    { ...spanOptions, rowGap: 0 },
  );
  const cell = result.cells[4];

  assert.ok(cell);
  assert.equal(cell.column, 1);
  assert.equal(cell.y, 120.8);
});

test("a requested span larger than the column count clamps to full width", () => {
  const result = calculateMasonryLayout(
    [{ id: "clamped", aspectRatio: 1.5, layoutHint: { columnSpan: 5 } }],
    spanOptions,
  );
  const cell = result.cells[0];

  assert.ok(cell);
  assert.equal(cell.column, 0);
  assert.equal(cell.columnSpan, 3);
  assert.equal(cell.width, result.contentWidth);
});

test("a requested span collapses to one column in a one-column layout", () => {
  const result = calculateMasonryLayout(
    [{ id: "mobile", aspectRatio: 1, layoutHint: { columnSpan: 2 } }],
    {
      containerWidth: 100,
      minColumnWidth: 100,
      minColumns: 1,
      maxColumns: 1,
    },
  );
  const cell = result.cells[0];

  assert.ok(cell);
  assert.equal(cell.column, 0);
  assert.equal(cell.columnSpan, 1);
  assert.equal(cell.width, result.columnWidth);
});

test("a span equal to the column count is the full-width equivalent", () => {
  const result = calculateMasonryLayout(
    [{ id: "full", aspectRatio: 1, layoutHint: { columnSpan: 3 } }],
    spanOptions,
  );
  const cell = result.cells[0];

  assert.ok(cell);
  assert.equal(cell.column, 0);
  assert.equal(cell.columnSpan, 3);
  assert.equal(cell.width, result.contentWidth);
});

test("invalid explicit spans fail with the existing item error contract", () => {
  for (const columnSpan of [0, -1, 0.5, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "2", null]) {
    assert.throws(
      () =>
        calculateMasonryLayout(
          [{ id: "invalid-span", aspectRatio: 1, layoutHint: { columnSpan } }],
          spanOptions,
        ),
      (error) =>
        error instanceof GridMasonryError && error.code === "INVALID_ITEM",
    );
  }
});

test("mixed span fixture produces contiguous non-overlapping placement", () => {
  const result = calculateMasonryLayout(
    [
      { id: "a", aspectRatio: 1 },
      { id: "b", aspectRatio: 1 },
      { id: "c", aspectRatio: 1 },
      { id: "d", aspectRatio: 1 },
      { id: "e", aspectRatio: 1, layoutHint: { columnSpan: 2 } },
    ],
    spanOptions,
  );

  const e = result.cells[4];
  assert.ok(e);
  assert.equal(e.columnSpan, 2);
  assert.equal(e.width, 208);

  for (let i = 0; i < result.cells.length; i += 1) {
    for (let j = i + 1; j < result.cells.length; j += 1) {
      const a = result.cells[i];
      const b = result.cells[j];
      assert.ok(a && b);
      assert.equal(overlaps(a, b), false, `${a.id} overlaps ${b.id}`);
    }
  }
});

test("product fixture places two-span items across deterministic bands", () => {
  const result = calculateMasonryLayout(
    [
      { id: "a", aspectRatio: 1, layoutHint: { columnSpan: 2 } },
      { id: "b", aspectRatio: 1 },
      { id: "c", aspectRatio: 1, layoutHint: { columnSpan: 2 } },
      { id: "d", aspectRatio: 1 },
    ],
    spanOptions,
  );

  assert.deepEqual(
    result.cells.map((cell) => [cell.id, cell.column, cell.columnSpan, cell.y]),
    [
      ["a", 0, 2, 0],
      ["b", 2, 1, 0],
      ["c", 0, 2, 216],
      ["d", 2, 1, 108],
    ],
  );
});

test("four-column mixed fixture leaves the two-span item contiguous", () => {
  const options = {
    containerWidth: 424,
    minColumnWidth: 100,
    minColumns: 4,
    maxColumns: 4,
    gap: 8,
  };
  const result = calculateMasonryLayout(
    [
      { id: "a", aspectRatio: 1 },
      { id: "b", aspectRatio: 1, layoutHint: { columnSpan: 2 } },
      { id: "c", aspectRatio: 1 },
    ],
    options,
  );

  assert.deepEqual(
    result.cells.map((cell) => [cell.id, cell.column, cell.columnSpan]),
    [
      ["a", 0, 1],
      ["b", 1, 2],
      ["c", 3, 1],
    ],
  );
});

test("mixed spans produce the same result on repeated calculations", () => {
  const items = [
    { id: "a", aspectRatio: 1, layoutHint: { columnSpan: 1 } },
    { id: "b", aspectRatio: 2, layoutHint: { columnSpan: 2 } },
    { id: "c", aspectRatio: 0.5, layoutHint: { columnSpan: 3 } },
    { id: "d", aspectRatio: 1.5 },
  ];

  assert.deepEqual(
    calculateMasonryLayout(items, spanOptions),
    calculateMasonryLayout(items, spanOptions),
  );
});

test("span one keeps M1A resolved footprint behavior and span two detects stale width", () => {
  const oneColumn = calculateMasonryLayout(
    [
      {
        id: "card",
        aspectRatio: 4 / 3,
        resolvedFootprint: { height: 236, forWidth: 100 },
      },
    ],
    {
      containerWidth: 100,
      minColumnWidth: 100,
      minColumns: 1,
      maxColumns: 1,
    },
  );
  const spanTwo = calculateMasonryLayout(
    [
      {
        id: "wide-card",
        aspectRatio: 1,
        layoutHint: { columnSpan: 2 },
        resolvedFootprint: { height: 236, forWidth: 100 },
      },
    ],
    spanOptions,
  );

  assert.equal(oneColumn.cells[0]?.height, 236);
  assert.equal(spanTwo.cells[0]?.width, 208);
  assert.equal(spanTwo.cells[0]?.height, 208);
});

test("current span-two footprint binds to the widened Core width", () => {
  const result = calculateMasonryLayout(
    [
      {
        id: "wide-card",
        aspectRatio: 2,
        layoutHint: { columnSpan: 2 },
        resolvedFootprint: { height: 180, forWidth: 208 },
      },
    ],
    spanOptions,
  );
  const cell = result.cells[0];

  assert.ok(cell);
  assert.equal(cell.width, 208);
  assert.equal(cell.height, 180);
  assert.equal(cell.columnSpan, 2);
  assert.equal(cell.aspectRatio, 2);
});

test("a single-column footprint is stale after widening to span two", () => {
  const result = calculateMasonryLayout(
    [
      {
        id: "stale-wide-card",
        aspectRatio: 2,
        layoutHint: { columnSpan: 2 },
        resolvedFootprint: { height: 180, forWidth: 100 },
      },
    ],
    spanOptions,
  );

  assert.equal(result.cells[0]?.width, 208);
  assert.equal(result.cells[0]?.height, 104);
});

test("widened-width footprint tolerance preserves current and stale behavior", () => {
  const current = calculateMasonryLayout(
    [
      {
        id: "near-current",
        aspectRatio: 2,
        layoutHint: { columnSpan: 2 },
        resolvedFootprint: { height: 180, forWidth: 208 + 1e-8 },
      },
    ],
    spanOptions,
  );
  const stale = calculateMasonryLayout(
    [
      {
        id: "far-current",
        aspectRatio: 2,
        layoutHint: { columnSpan: 2 },
        resolvedFootprint: { height: 180, forWidth: 208 + 1e-3 },
      },
    ],
    spanOptions,
  );

  assert.equal(current.cells[0]?.height, 180);
  assert.equal(stale.cells[0]?.height, 104);
});

test("skyline propagation uses a span-two card footprint rather than media height", () => {
  const result = calculateMasonryLayout(
    [
      {
        id: "card",
        aspectRatio: 2,
        layoutHint: { columnSpan: 2 },
        resolvedFootprint: { height: 180, forWidth: 208 },
      },
      { id: "after", aspectRatio: 1 },
    ],
    {
      containerWidth: 208,
      minColumnWidth: 100,
      minColumns: 2,
      maxColumns: 2,
      gap: 8,
    },
  );

  assert.equal(result.cells[0]?.height, 180);
  assert.equal(result.cells[1]?.y, 188);
});

test("full-width resolved footprint uses content width without a special path", () => {
  const result = calculateMasonryLayout(
    [
      {
        id: "full-card",
        aspectRatio: 2,
        layoutHint: { columnSpan: 3 },
        resolvedFootprint: { height: 260, forWidth: 316 },
      },
    ],
    spanOptions,
  );
  const cell = result.cells[0];

  assert.ok(cell);
  assert.equal(cell.column, 0);
  assert.equal(cell.columnSpan, 3);
  assert.equal(cell.width, result.contentWidth);
  assert.equal(cell.height, 260);
});

test("responsive span collapse invalidates a desktop width-bound footprint", () => {
  const item = {
    id: "responsive-card",
    aspectRatio: 2,
    layoutHint: { columnSpan: 2 },
    resolvedFootprint: { height: 180, forWidth: 208 },
  };
  const desktop = calculateMasonryLayout([item], {
    containerWidth: 424,
    minColumnWidth: 100,
    minColumns: 4,
    maxColumns: 4,
    gap: 8,
  });
  const mobile = calculateMasonryLayout([item], {
    containerWidth: 100,
    minColumnWidth: 100,
    minColumns: 1,
    maxColumns: 1,
  });

  assert.equal(desktop.cells[0]?.columnSpan, 2);
  assert.equal(desktop.cells[0]?.width, 208);
  assert.equal(desktop.cells[0]?.height, 180);
  assert.equal(mobile.cells[0]?.columnSpan, 1);
  assert.equal(mobile.cells[0]?.width, 100);
  assert.equal(mobile.cells[0]?.height, 50);
});

test("a fresh collapsed-width footprint remains usable on mobile", () => {
  const result = calculateMasonryLayout(
    [
      {
        id: "mobile-card",
        aspectRatio: 2,
        layoutHint: { columnSpan: 2 },
        resolvedFootprint: { height: 120, forWidth: 100 },
      },
    ],
    {
      containerWidth: 100,
      minColumnWidth: 100,
      minColumns: 1,
      maxColumns: 1,
    },
  );

  assert.equal(result.cells[0]?.columnSpan, 1);
  assert.equal(result.cells[0]?.width, 100);
  assert.equal(result.cells[0]?.height, 120);
});

test("whole-card footprint does not replace intrinsic aspect ratio metadata", () => {
  const result = calculateMasonryLayout(
    [
      {
        id: "ratio-card",
        aspectRatio: 16 / 9,
        layoutHint: { columnSpan: 2 },
        resolvedFootprint: { height: 260, forWidth: 208 },
      },
    ],
    spanOptions,
  );
  const cell = result.cells[0];

  assert.ok(cell);
  assert.equal(cell.width, 208);
  assert.equal(cell.height, 260);
  assert.equal(cell.aspectRatio, 16 / 9);
  assert.notEqual(cell.width / cell.height, cell.aspectRatio);
});

test("mixed spans and mixed footprint sources compose deterministically", () => {
  const items = [
    { id: "ratio-a", aspectRatio: 1, layoutHint: { columnSpan: 1 } },
    {
      id: "current-b",
      aspectRatio: 1,
      layoutHint: { columnSpan: 2 },
      resolvedFootprint: { height: 180, forWidth: 208 },
    },
    {
      id: "current-c",
      aspectRatio: 1,
      resolvedFootprint: { height: 70, forWidth: 100 },
    },
    { id: "ratio-d", aspectRatio: 1, layoutHint: { columnSpan: 3 } },
    {
      id: "stale-e",
      aspectRatio: 2,
      layoutHint: { columnSpan: 2 },
      resolvedFootprint: { height: 999, forWidth: 100 },
    },
    { id: "ratio-f", aspectRatio: 1 },
  ];
  const result = calculateMasonryLayout(items, { ...spanOptions, rowGap: 8 });

  assert.deepEqual(
    result.cells.map((cell) => [cell.id, cell.column, cell.columnSpan, cell.y, cell.width, cell.height]),
    [
      ["ratio-a", 0, 1, 0, 100, 100],
      ["current-b", 1, 2, 0, 208, 180],
      ["current-c", 0, 1, 108, 100, 70],
      ["ratio-d", 0, 3, 188, 316, 316],
      ["stale-e", 0, 2, 512, 208, 104],
      ["ratio-f", 2, 1, 512, 100, 100],
    ],
  );
  assert.equal(result.containerHeight, 616);

  for (let i = 0; i < result.cells.length; i += 1) {
    for (let j = i + 1; j < result.cells.length; j += 1) {
      const a = result.cells[i];
      const b = result.cells[j];
      assert.ok(a && b);
      assert.equal(overlaps(a, b), false, `${a.id} overlaps ${b.id}`);
    }
  }
});

test("span and footprint composition is deterministic", () => {
  const items = [
    {
      id: "wide",
      aspectRatio: 4 / 3,
      layoutHint: { columnSpan: 2 },
      resolvedFootprint: { height: 180, forWidth: 208 },
    },
    { id: "full", aspectRatio: 1, layoutHint: { columnSpan: 3 } },
  ];

  assert.deepEqual(
    calculateMasonryLayout(items, spanOptions),
    calculateMasonryLayout(items, spanOptions),
  );
});

test("multi-span resolved footprint contributes to container height", () => {
  const result = calculateMasonryLayout(
    [
      {
        id: "tall-wide-card",
        aspectRatio: 2,
        layoutHint: { columnSpan: 2 },
        resolvedFootprint: { height: 260, forWidth: 208 },
      },
    ],
    spanOptions,
  );

  assert.equal(result.containerHeight, 260);
});

test("uneven skyline fragmentation remains intentional for a wide card", () => {
  const result = calculateMasonryLayout(
    [
      { id: "short", aspectRatio: 1 },
      { id: "tall", aspectRatio: 1 / 3 },
      {
        id: "wide-card",
        aspectRatio: 1,
        layoutHint: { columnSpan: 2 },
        resolvedFootprint: { height: 180, forWidth: 208 },
      },
    ],
    {
      containerWidth: 208,
      minColumnWidth: 100,
      minColumns: 2,
      maxColumns: 2,
      columnGap: 8,
      rowGap: 0,
    },
  );

  assert.equal(result.cells[2]?.column, 0);
  assert.equal(result.cells[2]?.y, 300);
});

test("column gap is included in the width binding for span two", () => {
  const current = calculateMasonryLayout(
    [
      {
        id: "gap-aware",
        aspectRatio: 2,
        layoutHint: { columnSpan: 2 },
        resolvedFootprint: { height: 180, forWidth: 208 },
      },
    ],
    spanOptions,
  );
  const missingGap = calculateMasonryLayout(
    [
      {
        id: "missing-gap",
        aspectRatio: 2,
        layoutHint: { columnSpan: 2 },
        resolvedFootprint: { height: 180, forWidth: 200 },
      },
    ],
    spanOptions,
  );

  assert.equal(current.cells[0]?.width, 208);
  assert.equal(current.cells[0]?.height, 180);
  assert.equal(missingGap.cells[0]?.width, 208);
  assert.equal(missingGap.cells[0]?.height, 104);
});

test("cap alignment changes x but footprint binds to item width", () => {
  const result = calculateMasonryLayout(
    [
      {
        id: "offset-card",
        aspectRatio: 2,
        layoutHint: { columnSpan: 2 },
        resolvedFootprint: { height: 180, forWidth: 208 },
      },
    ],
    {
      containerWidth: 400,
      minColumnWidth: 100,
      maxColumnWidth: 100,
      minColumns: 1,
      maxColumns: 3,
      gap: 8,
      columnSizing: "cap",
      columnAlignment: "center",
    },
  );
  const cell = result.cells[0];

  assert.ok(cell);
  assert.equal(result.columnCount, 3);
  assert.equal(result.columnWidth, 100);
  assert.equal(result.contentWidth, 316);
  assert.equal(result.contentOffsetX, 42);
  assert.equal(cell.x, 42);
  assert.equal(cell.width, 208);
  assert.equal(cell.height, 180);
});
