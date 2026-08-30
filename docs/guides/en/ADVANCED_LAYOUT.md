# Advanced layout

All options in this guide are generic Core semantics and are optional.

## Spans and lanes

```ts
const item = {
  id: "featured",
  aspectRatio: 16 / 9,
  layoutHint: {
    columnSpan: 2,
    preferredColumn: 1,
  },
};
```

Horizontal items use `rowSpan` and `preferredRow`. Spans occupy contiguous
logical lanes. An oversized span is normalized to the available lane count;
the caller's object is not changed.

`preferredColumn`/`preferredRow` is soft intent. A preferred lane is selected
when its legal candidate satisfies the placement rules; it is not a physical
coordinate guarantee. `lockedColumn`/`lockedRow` is hard logical lane intent,
normalized after responsive lane changes. A lock never authorizes overlap; an
obstacle can move the item forward in its locked lane.

## Directions

`flowDirection` defaults to `"forward"` and mirrors only the flow axis.
`crossDirection` defaults to `"forward"` and mirrors only the cross axis.
Logical lanes, spans, IDs, indexes, and source order never change. A reversed
cross direction is a geometry projection, not automatic RTL, DOM direction, or
text direction.

## Reserved regions

```ts
const options = {
  containerWidth: 960,
  minColumnWidth: 220,
  gap: 8,
  reservedRegions: [
    { laneStart: 0, laneSpan: 2, flowStart: 120, flowSize: 240 },
  ],
};
```

`ReservedRegion` uses logical `{ laneStart, laneSpan, flowStart, flowSize }`.
It is hard occupied space, not a GridItem. Regions may overlap and array order
does not affect geometry. Items sharing lanes keep the accepted flow gap from
the occupied interval, and region extent contributes to layout extent. No
synthetic cell or ID is returned.

## Flow tolerance

`flowTolerance` defaults to `0`. It widens only the candidate lane-selection
band:

```text
minimum = 100
candidate = 100.5
flowTolerance = 0.5  -> candidate is eligible
```

Within the band, an eligible preferred lane wins; otherwise the smallest
logical lane wins. The selected lane retains its exact legal flow coordinate.
Tolerance never rounds coordinates, relaxes gaps, or permits overlap.

## Distribution

`flowDistribution` is `start`, `end`, `center`, `space-between`, or
`space-evenly`. It applies along the flow axis after logical placement. It is
independent of cross direction and does not turn preferred lanes into locks.
