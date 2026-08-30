# Browser adapter usage

`grid-masonry-browser` is a framework-independent DOM adapter. It normalizes
host items, calls Core, applies returned geometry, and manages stable element
lifecycle. It does not own placement, scroll observation, product content, or
DOM direction policy.

## Lifecycle boundary

The host supplies item identity/content and receives lifecycle callbacks. A
layout-only update reuses a retained element and applies new geometry. A
content change may call `updateItem`. Items leaving the selected virtual window
are destroyed; controller disposal is idempotent. Measurement observers and
listeners are cleaned up by the adapter lifecycle.

Measure a natural content surface when using footprint measurement; do not use
the absolute-positioning shell as the measurement source. Core remains the
single geometry authority.

## Virtualization

`createVirtualizedMasonryGrid` consumes a Core layout and host-provided flow
range/overscan. `createMasonryGrid` and `createHorizontalMasonryGrid` cover
vertical and horizontal layouts. Returned/managed cells retain source/index
identity. The adapter does not reorder DOM children to match physical visual
order and does not mutate scroll.

For exact option and callback shapes, use the package's generated declarations:
`BrowserMasonryGridOptions`, `BrowserHorizontalMasonryGridOptions`, and
`BrowserVirtualizedMasonryGridOptions`.
