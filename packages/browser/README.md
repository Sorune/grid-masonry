# grid-masonry-browser

Framework-independent DOM adapter for `grid-masonry-core`. It normalizes host
items, calls Core, applies returned geometry, and manages stable element and
virtualization lifecycle.

```bash
npm install grid-masonry-browser
```

The adapter does not implement placement, own scroll observation, reorder DOM
children, infer text direction, or define product content. Layout-only changes
reuse retained elements; content changes may call `updateItem`; leaving a
virtual window destroys the item lifecycle; disposal is idempotent.

See the [Browser guide](https://grid-masonry.sorune.org/docs/en/#adapters).

MIT © 2026 Sorune. See the repository [LICENSE](https://github.com/Sorune/grid-masonry/blob/main/LICENSE).
