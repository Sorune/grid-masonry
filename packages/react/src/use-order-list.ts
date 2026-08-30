import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyOrder,
  createOrder,
  moveAfter,
  moveBefore,
  moveOrder,
  reconcileOrder,
  type OrderId,
} from "grid-masonry-core";

import type { UseOrderListOptions, UseOrderListResult } from "./types.js";

function sameOrder(left: readonly OrderId[], right: readonly OrderId[]): boolean {
  return (
    left.length === right.length && left.every((id, index) => id === right[index])
  );
}

/**
 * React state boundary for stable item order. Geometry remains a separate Core
 * concern; this hook only maps IDs to the host's current item sequence.
 */
export function useOrderList<Item>(
  options: UseOrderListOptions<Item>,
): UseOrderListResult<Item> {
  const { items, getId, order: controlledOrder, initialOrder, onOrderChange } =
    options;
  const controlled = controlledOrder !== undefined;
  const [uncontrolledOrder, setUncontrolledOrder] = useState<readonly OrderId[]>(
    () =>
      reconcileOrder(
        items,
        initialOrder ?? createOrder(items, getId),
        getId,
      ),
  );
  const effectiveOrder = useMemo(
    () =>
      controlled
        ? reconcileOrder(items, controlledOrder, getId)
        : reconcileOrder(items, uncontrolledOrder, getId),
    [controlled, controlledOrder, getId, items, uncontrolledOrder],
  );

  useEffect(() => {
    if (!controlled && !sameOrder(uncontrolledOrder, effectiveOrder)) {
      setUncontrolledOrder(effectiveOrder);
    }
  }, [controlled, effectiveOrder, uncontrolledOrder]);

  const commit = useCallback(
    (nextOrder: readonly OrderId[]): void => {
      const reconciled = reconcileOrder(items, nextOrder, getId);
      if (!sameOrder(reconciled, effectiveOrder)) {
        if (!controlled) {
          setUncontrolledOrder(reconciled);
        }
        onOrderChange?.(reconciled);
      }
    },
    [controlled, effectiveOrder, getId, items, onOrderChange],
  );

  const setOrder = useCallback(
    (nextOrder: readonly OrderId[]) => commit(nextOrder),
    [commit],
  );
  const move = useCallback(
    (id: OrderId, toIndex: number) => commit(moveOrder(effectiveOrder, id, toIndex)),
    [commit, effectiveOrder],
  );
  const moveBeforeItem = useCallback(
    (id: OrderId, targetId: OrderId) =>
      commit(moveBefore(effectiveOrder, id, targetId)),
    [commit, effectiveOrder],
  );
  const moveAfterItem = useCallback(
    (id: OrderId, targetId: OrderId) =>
      commit(moveAfter(effectiveOrder, id, targetId)),
    [commit, effectiveOrder],
  );
  const reset = useCallback(() => commit(createOrder(items, getId)), [commit, getId, items]);
  const reconcile = useCallback(
    () => commit(reconcileOrder(items, effectiveOrder, getId)),
    [commit, effectiveOrder, getId, items],
  );

  return {
    order: effectiveOrder,
    orderedItems: applyOrder(items, effectiveOrder, getId),
    move,
    moveBefore: moveBeforeItem,
    moveAfter: moveAfterItem,
    setOrder,
    reset,
    reconcile,
  };
}
