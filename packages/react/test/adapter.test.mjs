import test from "node:test";
import assert from "node:assert/strict";
import { calculateMasonryLayout } from "grid-masonry-core";
import { calculateHorizontalMasonryLayout } from "grid-masonry-core";
import { normalizeGridItems } from "../dist/normalize.js";
import { normalizeHorizontalGridItems } from "../dist/normalize-horizontal.js";
import {
  createMasonryCellStyle,
  createMasonryContainerStyle,
} from "../dist/styles.js";
import {
  areMeasuredHeightsEquivalent,
  readBorderBoxHeight,
} from "../dist/use-measured-footprints.js";
import {
  areMeasuredWidthsEquivalent,
  readBorderBoxWidth,
} from "../dist/use-horizontal-measured-footprints.js";
import {
  createHorizontalMasonryCellStyle,
  createHorizontalMasonryContainerStyle,
  horizontalNaturalContentStyle,
} from "../dist/horizontal-styles.js";

const sampleCell = {
  id: "p-1",
  index: 0,
  column: 2,
  columnSpan: 1,
  x: 420.5,
  y: 180.25,
  width: 200,
  height: 133.333,
  aspectRatio: 1.5,
};

const vnextOptions = {
  containerWidth: 316,
  minColumnWidth: 100,
  minColumns: 3,
  maxColumns: 3,
  gap: 8,
};

test("normalizeGridItems adapts arbitrary host-domain items without retaining them", () => {
  const photos = [
    { photoId: 11, width: 3000, height: 2000 },
    { photoId: 12, width: 1600, height: 2400 },
  ];

  const normalized = normalizeGridItems(
    photos,
    (photo) => String(photo.photoId),
    (photo) => photo.width / photo.height,
  );

  assert.deepEqual(normalized, [
    { id: "11", aspectRatio: 1.5 },
    { id: "12", aspectRatio: 2 / 3 },
  ]);
  assert.notEqual(normalized[0], photos[0]);
});

test("normalizeGridItems preserves host order and resolver index", () => {
  const indexes = [];
  const items = ["a", "b", "c"];

  const normalized = normalizeGridItems(
    items,
    (item, index) => `${index}:${item}`,
    (_item, index) => {
      indexes.push(index);
      return index + 1;
    },
  );

  assert.deepEqual(indexes, [0, 1, 2]);
  assert.deepEqual(
    normalized.map((item) => item.id),
    ["0:a", "1:b", "2:c"],
  );
});

test("normalizeGridItems forwards explicit layout hints and declared footprints once per item", () => {
  const items = [
    {
      id: "wide",
      aspectRatio: 2,
      layoutHint: { columnSpan: 2 },
      footprint: { height: 180, forWidth: 208 },
    },
  ];
  let layoutHintCalls = 0;
  let footprintCalls = 0;

  const normalized = normalizeGridItems(
    items,
    (item) => item.id,
    (item) => item.aspectRatio,
    (item) => {
      layoutHintCalls += 1;
      return item.layoutHint;
    },
    (item) => {
      footprintCalls += 1;
      return item.footprint;
    },
  );

  assert.equal(layoutHintCalls, 1);
  assert.equal(footprintCalls, 1);
  assert.deepEqual(normalized, [
    {
      id: "wide",
      aspectRatio: 2,
      layoutHint: { columnSpan: 2 },
      resolvedFootprint: { height: 180, forWidth: 208 },
    },
  ]);

  const layout = calculateMasonryLayout(normalized, vnextOptions);
  assert.equal(layout.cells[0]?.columnSpan, 2);
  assert.equal(layout.cells[0]?.width, 208);
  assert.equal(layout.cells[0]?.height, 180);
});

test("forwarded stale footprints fall back through the core width-binding contract", () => {
  const normalized = normalizeGridItems(
    [
      {
        id: "wide",
        aspectRatio: 2,
        layoutHint: { columnSpan: 2 },
        footprint: { height: 180, forWidth: 100 },
      },
    ],
    (item) => item.id,
    (item) => item.aspectRatio,
    (item) => item.layoutHint,
    (item) => item.footprint,
  );

  const layout = calculateMasonryLayout(normalized, vnextOptions);
  assert.equal(layout.cells[0]?.width, 208);
  assert.equal(layout.cells[0]?.height, 104);
});

test("invalid forwarded generic input is rejected by core validation", () => {
  const normalized = normalizeGridItems(
    [{ id: "bad", aspectRatio: 1, layoutHint: { columnSpan: 0 } }],
    (item) => item.id,
    (item) => item.aspectRatio,
    (item) => item.layoutHint,
  );

  assert.throws(
    () => calculateMasonryLayout(normalized, vnextOptions),
    /layoutHint\.columnSpan/,
  );
});

test("cell geometry is authoritative over host style", () => {
  const style = createMasonryCellStyle(sampleCell, {
    position: "fixed",
    left: 999,
    width: 1,
    opacity: 0.8,
  });

  assert.equal(style.position, "absolute");
  assert.equal(style.left, 420.5);
  assert.equal(style.top, 180.25);
  assert.equal(style.width, 200);
  assert.equal(style.height, 133.333);
  assert.equal(style.opacity, 0.8);
});

test("container style preserves host decoration but owns layout height", () => {
  const style = createMasonryContainerStyle(
    {
      coordinateSpace: "container-relative-logical",
      containerWidth: 1000,
      containerHeight: 876.5,
      contentWidth: 1000,
      contentOffsetX: 0,
      columnCount: 4,
      columnWidth: 244,
      columnGap: 8,
      rowGap: 8,
      columnSizing: "fill",
      columnAlignment: "start",
      cells: [],
    },
    {
      width: "80%",
      height: 12,
      background: "black",
    },
  );

  assert.equal(style.position, "relative");
  assert.equal(style.width, "80%");
  assert.equal(style.height, 876.5);
  assert.equal(style.background, "black");
});

test("unmeasured container style has zero height", () => {
  const style = createMasonryContainerStyle(null);
  assert.equal(style.height, 0);
  assert.equal(style.width, "100%");
});

test("measured height equivalence suppresses only adapter-sized noise", () => {
  assert.equal(areMeasuredHeightsEquivalent(180, 180), true);
  assert.equal(areMeasuredHeightsEquivalent(180, 180.00000001), true);
  assert.equal(areMeasuredHeightsEquivalent(180, 180.00009), true);
  assert.equal(areMeasuredHeightsEquivalent(180, 180.0002), false);
  assert.equal(areMeasuredHeightsEquivalent(236, 180), false);
});

test("border-box extraction accepts array-like and single-size observer shapes", () => {
  const target = {
    getBoundingClientRect: () => ({ height: 99 }),
  };

  assert.equal(
    readBorderBoxHeight(
      { borderBoxSize: [{ blockSize: 236.25 }] },
      target,
    ),
    236.25,
  );
  assert.equal(
    readBorderBoxHeight({ borderBoxSize: { blockSize: 180.5 } }, target),
    180.5,
  );
  assert.equal(
    readBorderBoxHeight(
      { borderBoxSize: { 0: { blockSize: 144.75 } } },
      target,
    ),
    144.75,
  );
});

test("border-box extraction falls back to the natural target only when unsupported", () => {
  const target = {
    getBoundingClientRect: () => ({ height: 72.5 }),
  };

  assert.equal(
    readBorderBoxHeight({ borderBoxSize: undefined }, target),
    72.5,
  );
  assert.equal(
    readBorderBoxHeight({ borderBoxSize: { blockSize: 0 } }, target),
    undefined,
  );
  assert.equal(
    readBorderBoxHeight({ borderBoxSize: { blockSize: Number.NaN } }, target),
    undefined,
  );
});

test("horizontal normalization forwards row spans and height-bound footprints", () => {
  const normalized = normalizeHorizontalGridItems(
    [{ id: "wide", ratio: 2, hint: { rowSpan: 2 }, footprint: { width: 180, forHeight: 100 } }],
    (item) => item.id,
    (item) => item.ratio,
    (item) => item.hint,
    (item) => item.footprint,
  );
  assert.deepEqual(normalized, [{
    id: "wide",
    aspectRatio: 2,
    layoutHint: { rowSpan: 2 },
    resolvedFootprint: { width: 180, forHeight: 100 },
  }]);
  const layout = calculateHorizontalMasonryLayout(normalized, {
    containerHeight: 208,
    minRowHeight: 100,
    minRows: 2,
    maxRows: 2,
    gap: 8,
  });
  assert.equal(layout.cells[0]?.rowSpan, 2);
  assert.equal(layout.cells[0]?.height, 208);
});

test("horizontal styles project physical geometry and preserve flow width", () => {
  const cell = {
    id: "h-1", index: 0, row: 1, rowSpan: 2,
    x: 120.5, y: 8.25, width: 180.5, height: 96.25, aspectRatio: 2,
  };
  assert.deepEqual(createHorizontalMasonryCellStyle(cell, { opacity: 0.8 }), {
    opacity: 0.8, position: "absolute", boxSizing: "border-box",
    left: 120.5, top: 8.25, width: 180.5, height: 96.25,
  });
  assert.deepEqual(createHorizontalMasonryContainerStyle({
    coordinateSpace: "container-relative-logical", containerWidth: 640,
    containerHeight: 208, contentWidth: 640, contentHeight: 208,
    contentOffsetY: 0, rowCount: 2, rowHeight: 100, rowGap: 8,
    columnGap: 8, rowSizing: "fill", rowAlignment: "start", cells: [],
  }), {
    position: "relative", boxSizing: "border-box", width: 640, height: 208,
  });
  assert.equal(horizontalNaturalContentStyle.width, "max-content");
  assert.equal(horizontalNaturalContentStyle.height, "100%");
});

test("horizontal width measurement preserves fractional border-box values and suppresses noise", () => {
  const target = { getBoundingClientRect: () => ({ width: 72.5 }) };
  assert.equal(readBorderBoxWidth({ borderBoxSize: [{ inlineSize: 180.25 }] }, target), 180.25);
  assert.equal(readBorderBoxWidth({ borderBoxSize: { inlineSize: 180.5 } }, target), 180.5);
  assert.equal(readBorderBoxWidth({ borderBoxSize: { 0: { inlineSize: 144.75 } } }, target), 144.75);
  assert.equal(readBorderBoxWidth({ borderBoxSize: undefined }, target), 72.5);
  assert.equal(readBorderBoxWidth({ borderBoxSize: { inlineSize: 0 } }, target), undefined);
  assert.equal(areMeasuredWidthsEquivalent(180, 180.00009), true);
  assert.equal(areMeasuredWidthsEquivalent(180, 180.0002), false);
});
