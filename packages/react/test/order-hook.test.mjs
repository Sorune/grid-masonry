import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { useOrderList } from "../dist/use-order-list.js";

function Harness(props) {
  Harness.result = useOrderList(props);
  return null;
}

function render(props) {
  let renderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(Harness, props));
  });
  return renderer;
}

function update(renderer, props) {
  act(() => {
    renderer.update(React.createElement(Harness, props));
  });
}

const getId = (item) => item.id;
const initialItems = [{ id: "a" }, { id: "b" }, { id: "c" }];

test("uncontrolled order persists moves, reconciles items, and treats initialOrder as initialization-only", () => {
  const renderer = render({
    items: initialItems,
    getId,
    initialOrder: ["c", "a", "b"],
  });

  act(() => Harness.result.move("b", 0));
  assert.deepEqual(Harness.result.order, ["b", "c", "a"]);

  update(renderer, { items: initialItems, getId, initialOrder: ["a", "b", "c"] });
  assert.deepEqual(Harness.result.order, ["b", "c", "a"]);

  const withNew = [...initialItems, { id: "d" }];
  update(renderer, { items: withNew, getId, initialOrder: ["a", "b", "c"] });
  assert.deepEqual(Harness.result.order, ["b", "c", "a", "d"]);

  update(renderer, {
    items: withNew.filter((item) => item.id !== "c"),
    getId,
    initialOrder: ["a", "b", "c"],
  });
  assert.deepEqual(Harness.result.order, ["b", "a", "d"]);
  renderer.unmount();
});

test("uncontrolled commands support setOrder, relative moves, and reset", () => {
  const renderer = render({ items: initialItems, getId });
  act(() => Harness.result.setOrder(["c", "b", "a"]));
  assert.deepEqual(Harness.result.orderedItems.map((item) => item.id), ["c", "b", "a"]);
  act(() => Harness.result.moveBefore("a", "c"));
  assert.deepEqual(Harness.result.order, ["a", "c", "b"]);
  act(() => Harness.result.moveAfter("b", "a"));
  assert.deepEqual(Harness.result.order, ["a", "b", "c"]);
  act(() => Harness.result.reset());
  assert.deepEqual(Harness.result.order, ["a", "b", "c"]);
  renderer.unmount();
});

test("controlled moves emit once and do not mutate until the parent updates", () => {
  const changes = [];
  const props = { items: initialItems, getId, order: ["a", "b", "c"], onOrderChange: (next) => changes.push(next) };
  const renderer = render(props);

  act(() => Harness.result.move("c", 0));
  assert.deepEqual(changes, [["c", "a", "b"]]);
  assert.deepEqual(Harness.result.order, ["a", "b", "c"]);

  act(() => Harness.result.setOrder(["a", "b", "c"]));
  assert.equal(changes.length, 1);

  update(renderer, { ...props, order: changes[0] });
  assert.deepEqual(Harness.result.order, ["c", "a", "b"]);
  renderer.unmount();
});

test("duplicate current IDs propagate through hook reconciliation", () => {
  assert.throws(() => render({
    items: [{ id: "same" }, { id: "same" }],
    getId,
  }));
});
