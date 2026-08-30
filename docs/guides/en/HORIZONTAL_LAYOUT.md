# Horizontal layout

Horizontal masonry is the transpose-equivalent Core layout family. Rows are
logical cross-axis lanes and `x` is the flow coordinate.

```ts
import type { HorizontalGridItem } from "grid-masonry-core";
import { calculateHorizontalMasonryLayout } from "grid-masonry-core";

const items: readonly HorizontalGridItem[] = [
  { id: "one", aspectRatio: 3 / 2 },
  { id: "two", aspectRatio: 2 / 3 },
];

const result = calculateHorizontalMasonryLayout(items, {
  containerHeight: 600,
  minRowHeight: 180,
  rowGap: 12,
  columnGap: 8,
});
```

Use `rowSpan`, `preferredRow`, and `lockedRow` in `layoutHint`. Horizontal
footprints use `{ width, forHeight }`. The result uses `row`, `rowSpan`, `x`,
`y`, `width`, and `height` while retaining source `index` order.

The flow axis is `x`; `flowDirection: "reverse"` mirrors x within the result
extent. The cross axis is `y`; `crossDirection: "reverse"` mirrors y. A host
chooses these options independently and remains responsible for scroll and
text/DOM direction.
