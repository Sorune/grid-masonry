# grid-masonry-core

Pure TypeScript, zero-runtime-dependency masonry geometry for vertical and
horizontal layouts. Core owns deterministic logical placement and returns
container-relative cells; it does not own DOM, CSS, scrolling, image loading,
or product policy.

```bash
npm install grid-masonry-core
```

```ts
import { calculateMasonryLayout } from "grid-masonry-core";

const layout = calculateMasonryLayout(
  [{ id: "a", aspectRatio: 4 / 3 }],
  { containerWidth: 800, minColumnWidth: 200, gap: 8 },
);
```

The final Core surface includes aspect-ratio utilities, order primitives,
vertical/horizontal geometry, spans, preferred/locked logical lanes,
cross-size-bound footprints, state/checkpoints, flow queries and indexes,
virtualization primitives, directions, reserved regions, opt-in diagnostics,
displacement metrics, and optional `flowTolerance`.

Input and output order remain source order. `crossDirection` is a logical
cross-axis projection, not a text/DOM RTL switch. Dense/backfill is deferred
and has no API. See the [Core guide](https://grid-masonry.sorune.org/docs/en/#core)
and [advanced documentation](https://grid-masonry.sorune.org/docs/en/#placement).

MIT © 2026 Sorune. See the repository [LICENSE](https://github.com/Sorune/grid-masonry/blob/main/LICENSE).
