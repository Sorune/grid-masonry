# Final architecture

`grid-masonry` has one geometry authority and thin platform adapters.

```text
host data and policy
        |
        v
explicit generic item intent
        |
        v
grid-masonry Core
  logical placement, spans, footprints, state, queries
        |
        v
container-relative geometry
        |
   +----+----+
   |         |
 React     Browser
 projection projection
```

## Ownership

| Concern | Core | React | Browser | Host |
| --- | --- | --- | --- | --- |
| Logical lane placement, spans, gaps | owns | consumes | consumes | supplies intent |
| `x`, `y`, width, height geometry | owns | consumes | consumes | does not recalculate |
| Aspect ratios and footprint binding | owns rules | supplies resolvers/measurement | supplies measurement | supplies metadata |
| State, snapshots, stable reflow | owns | may call | may call | chooses policy |
| Flow/cross projection | owns | consumes | consumes | chooses options |
| Visible/indexed queries | owns | may call | may call | chooses viewport range |
| DOM/CSS/HTMLElement lifecycle | no | owns React lifecycle | owns DOM lifecycle | owns rendering policy |
| Scroll mutation | no | host/application | host/application | owns |
| Text/locale/accessibility direction | no | host/application | host/application | owns |
| Product DTOs, analytics, persistence | no | no | no | owns |

Core does not import React, DOM, browser APIs, React Native, image APIs, or
product types. Core runtime dependencies remain zero.

## Why this library exists

grid-masonry was extracted from a product-specific layout implementation where
geometry calculation had become increasingly coupled to rendering,
measurement, application state, and product policy.

The extraction had three primary goals:

- keep deterministic geometry independently testable;
- prevent host and product semantics from leaking into the layout engine;
- allow rendering adapters and applications to evolve without rewriting the
  layout model.

For that reason, Core intentionally does not own DOM rendering, scrolling,
drag gestures, accessibility policy, localization, or product-specific state.
Reusability is a consequence of isolating the layout boundary rather than a
requirement for product-specific behavior to enter Core.

## Logical geometry pipeline

```text
items + semantic options
        |
        v
validate and normalize lanes/spans/footprints/regions
        |
        v
logical lane placement
        |
        v
flow distribution
        |
        v
flowDirection projection
        |
        v
crossDirection projection
        |
        v
final container-relative cells
```

Vertical layouts use `x`/columns as the cross axis and `y` as the flow axis.
Horizontal layouts use `y`/rows as the cross axis and `x` as the flow axis.
The same logical concepts are used on both axes. Flow direction mirrors only
the flow coordinate; cross direction mirrors only the cross coordinate.

```ts
// Vertical reverse flow: y' = H - y - height
// Horizontal reverse flow: x' = W - x - width
// Vertical cross reverse: x' = W - x - width
// Horizontal cross reverse: y' = H - y - height
```

Logical lane numbers, spans, item IDs, indexes, and source order are unchanged
by either projection. A vertical RTL-style host can select
`crossDirection: "reverse"` and independently apply its DOM/text policy. Core
does not infer or own RTL.

## Ordering and placement

The input array is canonical source order. `layout.cells` remains in that order
and `cell.index` is the source index. Masonry geometry can create a visual
order that differs from source order because of spans, directions, or reserved
space. This is intentional. Dense/backfill, which would place later items into
earlier holes, is deferred and has no production API.

Placement is deterministic: equal candidates resolve by the accepted logical
lane rules, and `flowTolerance` only widens the candidate-selection band. It
never snaps coordinates, relaxes gaps, or permits overlap.

## Measurement boundary

```text
Core resolves cross size/span
        |
        v
host renders natural content surface
        |
        v
host measures natural border-box content
        |
        v
resolvedFootprint { height, forWidth }  // vertical
resolvedFootprint { width, forHeight }  // horizontal
        |
        v
Core calculates final geometry
```

Do not measure the absolutely positioned shell as the natural content
footprint. Stale or mismatched footprints fall back to ratio-derived geometry;
they are not errors.

## State and checkpoints

`createMasonryState` supports append, update, remove, reorder, resize, inspect,
snapshot, and restore. Some append configurations use a bounded incremental
path; complex configurations safely fall back to full calculation. Correctness
is defined by the pure calculator, not by an optimization promise.

A snapshot is a validated reusable placement/cache checkpoint for the same
semantic input state. It is not undo, history, or time travel. Restore rejects
stale semantic inputs and corrupt/inconsistent geometry atomically. Returning
from state A to semantically identical state A may make an earlier checkpoint
valid again. Diagnostics are derived observations and are not snapshot state.

Stable reflow compares bounded compact and retained-lane candidates using
actual physical displacement: total displacement, maximum displacement, moved
count, then compact on an exact tie. Explicit host locks remain authoritative;
retention hints are ephemeral.

## Regions, queries, and adapters

`ReservedRegion` is logical `{ laneStart, laneSpan, flowStart, flowSize }`.
Regions are hard occupied space, may overlap, are order-independent, contribute
to flow extent, and never appear as synthetic cells. Items sharing lanes keep
the accepted flow gap from regions. Queries and virtualization operate on final
item cells only and return source/index order; reserved empty space is not a
virtualized item.

React and Browser consume Core cells and preserve key/element identity where
their lifecycle contracts allow. They do not duplicate placement, reorder DOM
children, infer direction, or mutate scroll. The Browser adapter's update and
destroy lifecycle belongs to the host DOM boundary.

## Deferred boundaries

P20 dense/backfill is deferred because its visual/source-order divergence,
accessibility consequences, multi-span hole model, distribution and stable
reflow interactions, and invalidation cost need a separate product-neutral
decision. React Native is deferred. Package version/dependency reconciliation,
publication, and release tagging are also outside the implementation freeze.
