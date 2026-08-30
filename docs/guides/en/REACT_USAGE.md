# React Web usage

`grid-masonry-react` provides `MasonryGrid`, `HorizontalMasonryGrid`, layout
hooks, `useOrderList`, and `useVirtualizedMasonryCells`. It consumes Core
geometry and owns React lifecycle/CSS projection; it does not recalculate
placement or own scrolling.

## Vertical grid

```tsx
import { MasonryGrid } from "grid-masonry-react";

<MasonryGrid
  items={photos}
  getId={(photo) => photo.id}
  getAspectRatio={(photo) => photo.width / photo.height}
  minColumnWidth={240}
  gap={8}
  renderItem={({ item }) => <PhotoCard photo={item} />}
/>
```

`HorizontalMasonryGrid` uses `minRowHeight`, `initialHeight`,
`getResolvedFootprint` with `{ width, forHeight }`, and the horizontal Core
option names. Hooks expose the same option contracts with an explicit measured
container width/height.

## Measurement

Set `itemMeasurement={{ enabled: true }}` when the adapter should measure the
natural whole-item surface. The host renders content, the adapter reads the
natural border-box surface, and Core receives a cross-size-bound footprint.
Do not measure the absolutely positioned shell as content. `initialWidth` or
`initialHeight` can provide deterministic SSR/first-render dimensions.

## Ordering, keys, and direction

Use stable IDs for React keys. Input order remains `layout.cells` order under
all Core directions; the adapter does not reverse children, set DOM `dir`, or
mutate scroll. `flowDirection` and `crossDirection` are forwarded as logical
geometry options. Accessibility and text direction remain host policy.

`useOrderList` supports controlled `order` or uncontrolled `initialOrder`,
with `move`, `moveBefore`, `moveAfter`, `setOrder`, `reset`, and reconciliation.
It returns ordered items for the host to pass back into the grid.

## Virtualization

`useVirtualizedMasonryCells({ layout, flowRange, overscan })` consumes a Core
layout and returns selected cells. The host supplies the range and scroll
policy; the hook does not observe or mutate scroll.
