# Core usage

`grid-masonry-core` is the platform-independent geometry package. It accepts
immutable item/options values and returns container-relative logical geometry.
It does not read a DOM, load images, or mutate scrolling.

## Vertical layout

```ts
import { calculateMasonryLayout } from "grid-masonry-core";

const items = [
  { id: "a", aspectRatio: 4 / 3 },
  { id: "b", aspectRatio: 1 },
];

const layout = calculateMasonryLayout(items, {
  containerWidth: 960,
  minColumnWidth: 220,
  minColumns: 1,
  maxColumns: 4,
  gap: 8,
});
```

`aspectRatio` is width divided by height. Each result cell contains `x`, `y`,
`width`, `height`, logical `column`, normalized `columnSpan`, `id`, and source
`index`. The result is deterministic for the same ordered items and options.

## Horizontal layout

```ts
import { calculateHorizontalMasonryLayout } from "grid-masonry-core";

const layout = calculateHorizontalMasonryLayout(
  [
    { id: "a", aspectRatio: 4 / 3 },
    { id: "b", aspectRatio: 1 },
  ],
  { containerHeight: 640, minRowHeight: 180, gap: 8 },
);
```

Vertical uses columns across `x` and `y` as flow. Horizontal uses rows across
`y` and `x` as flow. The options and result names are intentionally explicit:
vertical cells use `column`/`columnSpan`; horizontal cells use `row`/`rowSpan`.

## Ratios and footprints

Use `calculateAspectRatio` for intrinsic dimensions. A host may later provide a
whole-item footprint after measuring natural content:

```ts
const measured = {
  id: "a",
  aspectRatio: 4 / 3,
  resolvedFootprint: { height: 260, forWidth: 360 },
};
```

Vertical footprints are `{ height, forWidth }`; horizontal footprints are
`{ width, forHeight }`. The binding size must match the Core-resolved cross
size within the existing freshness rule. Otherwise Core falls back to the
ratio-derived size. A stale footprint is not an error.

## Sizing and gaps

`gap` supplies both gutters unless `columnGap` or `rowGap` is explicit. The
default `columnSizing`/`rowSizing` is `fill`. `cap` keeps the baseline lane
count, caps lane size, and exposes slack through `contentWidth`/
`contentOffsetX` or their horizontal equivalents. Alignment is `start`,
`center`, or `end`.

## Immutability and ordering

Items, options, hints, footprints, and region arrays are read-only inputs. Core
does not rewrite them. Input order is canonical: `layout.cells` and each
`cell.index` remain source order even when physical geometry makes visual flow
look different. Use the order primitives or a host-owned `useOrderList` to
produce a new ordered input array.

For the complete exported surface, inspect the package declarations or the
[advanced layout](ADVANCED_LAYOUT.md), [state](STATE_AND_CHECKPOINTS.md), and
[diagnostics](DIAGNOSTICS_AND_QUERIES.md) guides.
