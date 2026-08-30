# grid-masonry-react

React Web adapter for `grid-masonry-core`. It projects Core geometry into
stable keyed React elements and owns adapter lifecycle/measurement coordination.
Core remains the only placement authority.

```bash
npm install grid-masonry-react react
```

```tsx
import { MasonryGrid } from "grid-masonry-react";

<MasonryGrid
  items={items}
  getId={(item) => item.id}
  getAspectRatio={(item) => item.width / item.height}
  minColumnWidth={240}
  gap={8}
  renderItem={({ item }) => <Card item={item} />}
/>
```

`HorizontalMasonryGrid`, layout hooks, `useOrderList`, and
`useVirtualizedMasonryCells` are also exported. `itemMeasurement={{ enabled:
true }}` measures the natural whole-item surface; do not measure the absolute
positioning shell. The host owns scroll, DOM/text direction, accessibility, and
product data. The adapter does not reorder children or infer RTL.

See the [React guide](https://grid-masonry.sorune.org/docs/en/#adapters).

MIT © 2026 Sorune. See the repository [LICENSE](https://github.com/Sorune/grid-masonry/blob/main/LICENSE).
