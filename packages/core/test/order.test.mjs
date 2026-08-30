import assert from "node:assert/strict";
import test from "node:test";

import {
  GridMasonryError,
  applyOrder,
  createOrder,
  moveAfter,
  moveBefore,
  moveOrder,
  reconcileOrder,
} from "../dist/index.js";

const items = [
  { id: "a", value: 1 },
  { id: "b", value: 2 },
  { id: "c", value: 3 },
];

test("creates immutable canonical order", () => {
  const order = createOrder(items);
  assert.deepEqual(order, ["a", "b", "c"]);
  assert.notEqual(order, items);
});

test("reconciles missing saved IDs and appends new current IDs", () => {
  assert.deepEqual(
    reconcileOrder(items, ["c", "removed", "a"]),
    ["c", "a", "b"],
  );
});

test("applies order without mutating input items", () => {
  const result = applyOrder(items, ["c", "a"]);
  assert.deepEqual(result.map((item) => item.id), ["c", "a", "b"]);
  assert.deepEqual(items.map((item) => item.id), ["a", "b", "c"]);
});

test("supports absolute and relative immutable moves", () => {
  const order = ["a", "b", "c", "d"];
  assert.deepEqual(moveOrder(order, "a", 2), ["b", "c", "a", "d"]);
  assert.deepEqual(moveBefore(order, "d", "b"), ["a", "d", "b", "c"]);
  assert.deepEqual(moveAfter(order, "a", "c"), ["b", "c", "a", "d"]);
  assert.deepEqual(order, ["a", "b", "c", "d"]);
});

test("rejects duplicate IDs deterministically", () => {
  assert.throws(
    () => createOrder([{ id: "same" }, { id: "same" }]),
    (error) =>
      error instanceof GridMasonryError && error.code === "DUPLICATE_ITEM_ID",
  );
  assert.throws(
    () => reconcileOrder(items, ["a", "a"]),
    (error) =>
      error instanceof GridMasonryError && error.code === "DUPLICATE_ITEM_ID",
  );
});

test("supports host-specific ID resolvers", () => {
  const hostItems = [{ key: 10 }, { key: 20 }];
  const getId = (item) => `item-${item.key}`;
  assert.deepEqual(createOrder(hostItems, getId), ["item-10", "item-20"]);
  assert.deepEqual(
    applyOrder(hostItems, ["item-20"], getId).map((item) => item.key),
    [20, 10],
  );
});

test("handles empty orders and unknown move targets without mutation", () => {
  assert.deepEqual(createOrder([]), []);
  assert.deepEqual(moveOrder(["a", "b"], "missing", 1), ["a", "b"]);
  assert.deepEqual(moveBefore(["a", "b"], "missing", "a"), ["a", "b"]);
  assert.deepEqual(moveAfter(["a", "b"], "a", "missing"), ["a", "b"]);
});

test("rejects invalid absolute move indexes and resolver IDs", () => {
  for (const index of [-1, 2, 0.5]) {
    assert.throws(() => moveOrder(["a", "b"], "a", index));
  }
  assert.throws(() => createOrder([{}], () => ""));
  assert.throws(() => createOrder([{}], () => "  "));
});
