# State, snapshots, and stable reflow

## Stateful layout

```ts
import { createMasonryState } from "grid-masonry-core";

const state = createMasonryState({
  axis: "vertical",
  items: [{ id: "a", aspectRatio: 1 }],
  options: { containerWidth: 800, minColumnWidth: 200, gap: 8 },
  reflowStrategy: "compact",
});

state.append({ id: "b", aspectRatio: 4 / 3 });
state.update({ id: "a", aspectRatio: 3 / 2 });
state.remove("b");
state.reorder(["a"]);
state.resize({ containerWidth: 640, minColumnWidth: 200, gap: 8 });
const inspection = state.inspect();
```

The API also provides `snapshot()` and `restore()`. Some compatible compact
append configurations use incremental state; complex options use a safe full
calculation fallback. The pure calculator remains the correctness reference.
Mutations are transactional: an invalid operation leaves items, options,
layout, and strategy state unchanged.

## Snapshot semantics

A snapshot is a validated reusable placement/cache checkpoint for the same
semantic masonry input state. It is **not** `undo`, history, or time travel.
Restore rejects a stale checkpoint when current semantic values differ, and it
also rejects tampered or internally inconsistent geometry. A failed restore is
atomic. If state changes from A to B and then returns exactly to semantic A,
the original A checkpoint may become valid again.

Compatibility includes axis, item order and IDs, ratios, spans and lane hints,
footprints and cross-size binding, layout options, directions, reserved regions,
flow tolerance, and reflow strategy. Diagnostics are derived observations and
do not make a snapshot stale.

## Stable reflow

```ts
const stable = createMasonryState({
  axis: "horizontal",
  items,
  options,
  reflowStrategy: "stable",
});
```

`compact` is normal deterministic placement. `stable` compares a bounded
compact candidate with a retained-lane candidate and selects the valid result
by actual physical displacement:

1. lower total displacement;
2. lower maximum displacement;
3. lower moved count;
4. compact on an exact score tie.

Stable does not guarantee every previous lane. Explicit host locks remain
authoritative; retained-lane hints are internal and ephemeral.

## Anchor delta

`calculateFlowAnchorDelta(previousLayout, nextLayout, anchorId)` returns a
same-axis geometry-only flow delta. It does not mutate scroll. The host decides
whether and how a viewport should apply that delta. Cross-axis-only movement is
not a flow scroll delta.
