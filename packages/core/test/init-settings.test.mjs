import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateMasonryFromSettings,
} from "../dist/index.js";

const vertical = {
  axis: "vertical",
  items: [{ id: "a", aspectRatio: 2 }],
  options: {
    containerWidth: 200,
    minColumnWidth: 200,
  },
};

test("dispatches the vertical discriminated facade to the existing layout", () => {
  const result = calculateMasonryFromSettings(vertical);
  assert.equal(result.cells[0]?.width, 200);
  assert.equal(result.cells[0]?.height, 100);
});

test("dispatches the horizontal discriminated facade without reinterpreting vertical fields", () => {
  const result = calculateMasonryFromSettings({
    axis: "horizontal",
    items: [{ id: "a", aspectRatio: 2 }],
    options: { containerHeight: 100, minRowHeight: 100 },
  });
  assert.equal(result.cells[0]?.height, 100);
  assert.equal(result.cells[0]?.width, 200);
});
