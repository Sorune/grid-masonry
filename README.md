# grid-masonry

`grid-masonry` is a deterministic, platform-independent masonry geometry
library. Core calculates logical item placement; React and Browser packages
project that geometry into host-owned rendering lifecycles.

**Npm packages:** `0.3.0` published and registry-verified · [Official website](https://grid-masonry.sorune.org/) · [English docs](https://grid-masonry.sorune.org/docs/en/) · [한국어 문서](https://grid-masonry.sorune.org/docs/ko/)

grid-masonry originated from a product layout implementation where geometry,
rendering, measurement, application state, and product-specific behavior had
become too tightly coupled. It was extracted so deterministic layout logic
could be tested and maintained independently while host applications retain
rendering, interaction, accessibility, and product policy.

```bash
npm install grid-masonry-core
npm install grid-masonry-react react
npm install grid-masonry-browser
```

## Packages

- `grid-masonry-core` — pure TypeScript geometry, ordering, state, queries,
  virtualization primitives, checkpoints, directions, reserved regions,
  diagnostics, and flow tolerance. It has zero runtime dependencies.
- `grid-masonry-react` — React Web components and hooks. It measures the host
  container/natural content when requested and renders stable keyed elements.
- `grid-masonry-browser` — framework-independent DOM lifecycle and
  virtualization adapters.

React Native is deferred. Dense/backfill is also deferred and has no public
API in this implementation.

## Core in one minute

```ts
import { calculateMasonryLayout } from "grid-masonry-core";

const layout = calculateMasonryLayout(
  [
    { id: "a", aspectRatio: 4 / 3 },
    { id: "b", aspectRatio: 1 },
    { id: "c", aspectRatio: 2 / 3 },
  ],
  { containerWidth: 960, minColumnWidth: 220, gap: 8 },
);

for (const cell of layout.cells) {
  // cell.index and cells order are the input/source order.
  console.log(cell.id, cell.x, cell.y, cell.width, cell.height);
}
```

Both vertical and horizontal layouts use logical lanes, spans, aspect ratios,
optional measured whole-item footprints, and deterministic source-order
placement. See the [Core guide](docs/guides/en/CORE_USAGE.md) and the
[horizontal guide](docs/guides/en/HORIZONTAL_LAYOUT.md).

## Capability map

| Need | Core capability |
| --- | --- |
| Ordered input | `createOrder`, `applyOrder`, `moveOrder`, `reconcileOrder` |
| Vertical/horizontal geometry | `calculateMasonryLayout`, `calculateHorizontalMasonryLayout` |
| Spans and placement intent | `columnSpan`/`rowSpan`, preferred and locked lanes |
| Measured content | `resolvedFootprint` bound to the resolved cross size |
| Stateful updates | `createMasonryState` |
| Visible items | linear and indexed flow queries |
| Virtualization | reference and indexed virtualization primitives |
| Checkpoints | validated, stale-rejecting `snapshot`/`restore` |
| Reflow | bounded `compact`/`stable` strategy |
| Directions | independent `flowDirection` and `crossDirection` |
| Obstacles | logical `reservedRegions` |
| Explanation | opt-in diagnostics and displacement metrics |
| Near-equal placement | optional `flowTolerance` |

## Ownership boundary

Core owns deterministic geometry and logical layout semantics. Hosts own DOM,
CSS, measurement coordination, scrolling, text/locale direction,
accessibility policy, animation, and product data. `crossDirection: "reverse"`
is a logical cross-axis projection; it is not a Core text or DOM RTL switch.

The input array, `layout.cells`, and `cell.index` retain source order. Physical
geometry may not resemble row-major reading order. Core does not implement
dense/backfill placement, drag-and-drop, or carousel behavior.

## Documentation

- [Final architecture](docs/ARCHITECTURE.md)
- [Documentation index](docs/README.md)
- [Core guide](docs/guides/en/CORE_USAGE.md)
- [React guide](docs/guides/en/REACT_USAGE.md)
- [Browser guide](docs/guides/en/BROWSER_USAGE.md)
- [Advanced layout](docs/guides/en/ADVANCED_LAYOUT.md)
- [State and checkpoints](docs/guides/en/STATE_AND_CHECKPOINTS.md)
- [Diagnostics and queries](docs/guides/en/DIAGNOSTICS_AND_QUERIES.md)
- [Limitations and status](docs/guides/en/LIMITATIONS.md)
- [한국어 문서](docs/guides/ko/README.md)
- [0.3.0 release notes](docs/RELEASE_NOTES_0.3.0.md)
- [Testing](docs/TESTING.md)

## License

MIT © 2026 Sorune. See [LICENSE](LICENSE).

## Acknowledgements and disclosure

See the [detailed acknowledgements and development disclosure](docs/guides/en/ACKNOWLEDGEMENTS.md).

The repository uses standard TypeScript, npm, React, and browser platform
interfaces. Prior-art review informed API and architecture evaluation; no
third-party implementation is claimed as copied or bundled by Core. Any
third-party runtime or development dependency remains governed by its own
license notices.

AI-assisted engineering tools were used for implementation support, testing,
documentation, and review/orchestration. Human project ownership remains
responsible for architecture, public contracts, acceptance, maintenance, and
release decisions.

## Current status

The accepted feature implementation is frozen. The coordinated `0.3.0` npm
packages are published and registry-verified. The Git tag, GitHub Release, and
production website deployment remain separate pending release steps.
