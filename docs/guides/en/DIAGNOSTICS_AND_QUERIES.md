# Diagnostics, queries, and virtualization

## Opt-in diagnostics

```ts
import {
  calculateMasonryLayoutWithDiagnostics,
  measureLayoutDisplacement,
} from "grid-masonry-core";

const observed = calculateMasonryLayoutWithDiagnostics(items, options);
// observed.layout is exactly the ordinary calculator result.
const metrics = measureLayoutDisplacement(previous, observed.layout);
```

Horizontal layouts use `calculateHorizontalMasonryLayoutWithDiagnostics`.
Diagnostics are factual, structured observations: requested/resolved spans,
preferred/locked lanes, footprint status (`none`, `used`, `stale`), frontier
and reserved-region shifts, and distribution shift. They are not logs,
telemetry, history, or persistent state. The ordinary calculator does not
allocate per-item diagnostic records.

`measureLayoutDisplacement` reports `totalDisplacement`,
`maximumDisplacement`, and `movedCount` for retained IDs only. Its metric is the
same physical x/y metric used by stable reflow and rejects incompatible axes.

## Flow queries

```ts
import {
  createFlowRangeIndex,
  queryVisibleFlowCells,
} from "grid-masonry-core";

const range = { start: 400, end: 900 };
const linear = queryVisibleFlowCells(layout, range);
const indexed = createFlowRangeIndex(layout).query(range);
```

The linear and indexed contracts select by final flow coordinates and return
cells in canonical source/index order. They work for both axes and directions.
The index is an optimization; the linear result is the reference semantics.

## Virtualization

`queryVirtualizedReference` and `queryVirtualizedCells` add overscan and return
virtualized Core cells. They do not observe scroll or create DOM. A host owns
the viewport range and can use either path while comparing the indexed result
with the reference implementation.

Reserved regions are not cells and are never virtualized. React and Browser
adapters build their lifecycle around the returned item cells and preserve
source order.
