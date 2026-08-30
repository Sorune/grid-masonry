import assert from "node:assert/strict";
import test from "node:test";

import {
  GridMasonryError,
  calculateAspectRatio,
  classifyAspectOrientation,
  reduceAspectRatio,
} from "../dist/index.js";

test("calculateAspectRatio derives value, orientation, and reduced integer ratio", () => {
  const ratio = calculateAspectRatio({ width: 4032, height: 3024 });

  assert.equal(ratio.value, 4 / 3);
  assert.equal(ratio.intrinsicWidth, 4032);
  assert.equal(ratio.intrinsicHeight, 3024);
  assert.equal(ratio.orientation, "landscape");
  assert.equal(ratio.reducedWidth, 4);
  assert.equal(ratio.reducedHeight, 3);
});

test("non-integer intrinsic sizes still produce a descriptor without reduced ratio", () => {
  const ratio = calculateAspectRatio({ width: 10.5, height: 7 });

  assert.equal(ratio.value, 1.5);
  assert.equal(ratio.reducedWidth, undefined);
  assert.equal(ratio.reducedHeight, undefined);
});

test("square tolerance can classify near-square ratios consistently", () => {
  assert.equal(classifyAspectOrientation(1.005, 0.01), "square");
  assert.equal(classifyAspectOrientation(1.02, 0.01), "landscape");
  assert.equal(classifyAspectOrientation(0.98, 0.01), "portrait");
});

test("reduceAspectRatio reduces integer dimensions by greatest common divisor", () => {
  assert.deepEqual(reduceAspectRatio(1920, 1080), { width: 16, height: 9 });
  assert.deepEqual(reduceAspectRatio(1080, 1080), { width: 1, height: 1 });
});

test("invalid intrinsic size fails explicitly", () => {
  assert.throws(
    () => calculateAspectRatio({ width: 0, height: 100 }),
    (error) =>
      error instanceof GridMasonryError &&
      error.code === "INVALID_INTRINSIC_SIZE",
  );
});
