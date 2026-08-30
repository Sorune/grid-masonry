import assert from "node:assert/strict";
import test from "node:test";

import { selectStableReflowCandidate } from "../dist/state.js";

function layout(displacements) {
  return {
    cells: displacements.map((value, index) => ({
      id: `item-${index}`,
      x: value,
      y: 0,
    })),
  };
}

const previous = layout([0, 0, 0]);

test("stable candidate selection prefers lower total displacement", () => {
  const compact = layout([10, 10, 0]);
  const retained = layout([2, 3, 0]);
  assert.equal(selectStableReflowCandidate(previous, compact, retained), retained);
});

test("stable candidate selection prefers compact when compact has lower total", () => {
  const compact = layout([2, 3, 0]);
  const retained = layout([10, 10, 0]);
  assert.equal(selectStableReflowCandidate(previous, compact, retained), compact);
});

test("stable score breaks equal totals by maximum displacement", () => {
  const compact = layout([8, 2, 0]);
  const retained = layout([5, 5, 0]);
  assert.equal(selectStableReflowCandidate(previous, compact, retained), retained);
});

test("stable score breaks equal total and maximum by moved count", () => {
  const compact = layout([5, 2.5, 2.5]);
  const retained = layout([5, 5, 0]);
  assert.equal(selectStableReflowCandidate(previous, compact, retained), retained);
});

test("exact stable score ties select compact", () => {
  const compact = layout([3, 7, 0]);
  const retained = layout([7, 3, 0]);
  assert.equal(selectStableReflowCandidate(previous, compact, retained), compact);
});
