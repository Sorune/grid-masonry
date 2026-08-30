import assert from "node:assert/strict";
import test from "node:test";

import {
  GridMasonryError,
  calculateAspectRatio,
  findNearestAspectRatioPreset,
  matchesAspectRatio,
  searchAspectRatios,
} from "../dist/index.js";

test("target query matches ratios within absolute tolerance and exposes deltas", () => {
  const match = matchesAspectRatio(1.334, {
    kind: "target",
    target: 4 / 3,
    tolerance: 0.01,
  });

  assert.equal(match.matches, true);
  assert.ok(match.delta > 0);
  assert.ok(match.relativeDelta > 0);
});

test("range query uses inclusive boundaries", () => {
  assert.equal(
    matchesAspectRatio(1.3, { kind: "range", min: 1.3, max: 1.4 }).matches,
    true,
  );
  assert.equal(
    matchesAspectRatio(1.4, { kind: "range", min: 1.3, max: 1.4 }).matches,
    true,
  );
});

test("orientation query can use square tolerance", () => {
  assert.equal(
    matchesAspectRatio(1.005, {
      kind: "orientation",
      orientation: "square",
      squareTolerance: 0.01,
    }).matches,
    true,
  );
});

test("searchAspectRatios preserves input order and can search calculation descriptors", () => {
  const descriptors = [
    calculateAspectRatio({ width: 4032, height: 3024 }),
    calculateAspectRatio({ width: 1920, height: 1080 }),
    calculateAspectRatio({ width: 4000, height: 2998 }),
  ];

  const results = searchAspectRatios(
    descriptors,
    (descriptor) => descriptor.value,
    { kind: "target", target: 4 / 3, tolerance: 0.01 },
  );

  assert.deepEqual(
    results.map((result) => result.index),
    [0, 2],
  );
  assert.equal(results[0].item, descriptors[0]);
});

test("nearest preset returns the closest preset and tolerance annotation", () => {
  const presets = [
    { id: "square", ratio: 1, tolerance: 0.01 },
    { id: "4:3", ratio: 4 / 3, tolerance: 0.02 },
    { id: "16:9", ratio: 16 / 9, tolerance: 0.02 },
  ];

  const result = findNearestAspectRatioPreset(1.34, presets);

  assert.ok(result);
  assert.equal(result.preset.id, "4:3");
  assert.equal(result.matchesTolerance, true);
});

test("nearest preset uses first preset for an exact distance tie", () => {
  const result = findNearestAspectRatioPreset(1.5, [
    { id: "left", ratio: 1.4 },
    { id: "right", ratio: 1.6 },
  ]);

  assert.equal(result?.preset.id, "left");
});

test("invalid query fails explicitly", () => {
  assert.throws(
    () => matchesAspectRatio(1, { kind: "range", min: 2, max: 1 }),
    (error) =>
      error instanceof GridMasonryError &&
      error.code === "INVALID_RATIO_QUERY",
  );
});

test("invalid orientation query fails explicitly", () => {
  assert.throws(
    () =>
      matchesAspectRatio(1, {
        kind: "orientation",
        orientation: "diagonal",
      }),
    (error) =>
      error instanceof GridMasonryError &&
      error.code === "INVALID_RATIO_QUERY",
  );
});
