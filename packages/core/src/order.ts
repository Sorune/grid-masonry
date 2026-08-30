import { GridMasonryError } from "./errors.js";

/** A stable host-independent identifier used by the order primitives. */
export type OrderId = string;

export interface IdentifiedItem {
  readonly id: OrderId;
}

export type ItemIdResolver<Item> = (item: Item, index: number) => OrderId;

function assertId(id: OrderId, context: string): void {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new GridMasonryError(
      "INVALID_ITEM",
      `${context} must be a non-empty string. Received: ${String(id)}`,
    );
  }
}

function assertUnique(ids: readonly OrderId[], context: string): void {
  const seen = new Set<OrderId>();
  for (const [index, id] of ids.entries()) {
    assertId(id, `${context}[${index}]`);
    if (seen.has(id)) {
      throw new GridMasonryError(
        "DUPLICATE_ITEM_ID",
        `${context} contains duplicate id "${id}".`,
      );
    }
    seen.add(id);
  }
}

function defaultItemId<Item>(item: Item, index: number): OrderId {
  if (
    typeof item === "object" &&
    item !== null &&
    "id" in item &&
    typeof item.id === "string"
  ) {
    return item.id;
  }

  throw new GridMasonryError(
    "INVALID_ITEM",
    `Item at index ${index} must expose a string id or use an id resolver.`,
  );
}

function resolveItemIds<Item>(
  items: readonly Item[],
  getId: ItemIdResolver<Item> = defaultItemId,
): readonly OrderId[] {
  const ids = items.map((item, index) => getId(item, index));
  assertUnique(ids, "items");
  return ids;
}

/** Creates the canonical order from the current item sequence. */
export function createOrder<Item extends IdentifiedItem>(
  items: readonly Item[],
): readonly OrderId[];
export function createOrder<Item>(
  items: readonly Item[],
  getId: ItemIdResolver<Item>,
): readonly OrderId[];
export function createOrder<Item>(
  items: readonly Item[],
  getId?: ItemIdResolver<Item>,
): readonly OrderId[] {
  return resolveItemIds(items, getId);
}

/**
 * Reconciles a saved order against the current item set. Saved IDs that no
 * longer exist are dropped; current IDs not present in the saved order are
 * appended in current input order.
 */
export function reconcileOrder<Item extends IdentifiedItem>(
  items: readonly Item[],
  savedOrder: readonly OrderId[],
): readonly OrderId[];
export function reconcileOrder<Item>(
  items: readonly Item[],
  savedOrder: readonly OrderId[],
  getId: ItemIdResolver<Item>,
): readonly OrderId[];
export function reconcileOrder<Item>(
  items: readonly Item[],
  savedOrder: readonly OrderId[],
  getId?: ItemIdResolver<Item>,
): readonly OrderId[] {
  const currentIds = resolveItemIds(items, getId);
  return reconcileIds(currentIds, savedOrder);
}

function reconcileIds(
  currentIds: readonly OrderId[],
  savedOrder: readonly OrderId[],
): readonly OrderId[] {
  assertUnique(savedOrder, "savedOrder");
  const current = new Set(currentIds);
  const result: OrderId[] = [];

  for (const id of savedOrder) {
    if (current.has(id)) {
      result.push(id);
    }
  }

  const included = new Set(result);
  for (const id of currentIds) {
    if (!included.has(id)) {
      result.push(id);
    }
  }

  return result;
}

/** Applies a canonical or partially stale order without mutating items. */
export function applyOrder<Item extends IdentifiedItem>(
  items: readonly Item[],
  order: readonly OrderId[],
): readonly Item[];
export function applyOrder<Item>(
  items: readonly Item[],
  order: readonly OrderId[],
  getId: ItemIdResolver<Item>,
): readonly Item[];
export function applyOrder<Item>(
  items: readonly Item[],
  order: readonly OrderId[],
  getId?: ItemIdResolver<Item>,
): readonly Item[] {
  const ids = resolveItemIds(items, getId);
  const reconciled = reconcileIds(ids, order);
  const byId = new Map<OrderId, Item>();
  items.forEach((item, index) => byId.set(ids[index]!, item));
  return reconciled.map((id) => byId.get(id)!);
}

/** Moves one ID to an absolute index and returns a new order. */
export function moveOrder(
  order: readonly OrderId[],
  id: OrderId,
  toIndex: number,
): readonly OrderId[] {
  assertUnique(order, "order");
  assertId(id, "id");
  if (!Number.isInteger(toIndex) || toIndex < 0 || toIndex >= order.length) {
    throw new GridMasonryError(
      "INVALID_OPTION",
      `toIndex must be an integer within order bounds. Received: ${String(toIndex)}`,
    );
  }
  const fromIndex = order.indexOf(id);
  if (fromIndex < 0 || fromIndex === toIndex) {
    return order.slice();
  }
  const result = order.slice();
  result.splice(fromIndex, 1);
  result.splice(toIndex, 0, id);
  return result;
}

function moveRelative(
  order: readonly OrderId[],
  id: OrderId,
  targetId: OrderId,
  after: boolean,
): readonly OrderId[] {
  assertUnique(order, "order");
  assertId(id, "id");
  assertId(targetId, "targetId");
  if (id === targetId) {
    return order.slice();
  }
  const targetIndex = order.indexOf(targetId);
  if (targetIndex < 0 || order.indexOf(id) < 0) {
    return order.slice();
  }
  const result = order.filter((entry) => entry !== id);
  const adjustedTarget = result.indexOf(targetId) + (after ? 1 : 0);
  result.splice(adjustedTarget, 0, id);
  return result;
}

/** Moves `id` immediately before `targetId`. */
export function moveBefore(
  order: readonly OrderId[],
  id: OrderId,
  targetId: OrderId,
): readonly OrderId[] {
  return moveRelative(order, id, targetId, false);
}

/** Moves `id` immediately after `targetId`. */
export function moveAfter(
  order: readonly OrderId[],
  id: OrderId,
  targetId: OrderId,
): readonly OrderId[] {
  return moveRelative(order, id, targetId, true);
}
