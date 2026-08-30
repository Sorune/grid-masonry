# Migration and change summary

This summary is intentionally version-neutral. Package version selection and
release metadata reconciliation are separate work.

## Additive and default-preserving

- Core keeps the ratio/layout foundation and adds axis-neutral horizontal
  geometry, logical spans, preferred/locked lanes, state/checkpoints, queries,
  indexed virtualization primitives, directions, reserved regions,
  diagnostics, and optional flow tolerance.
- Existing ratio-only items remain valid. Omitted options retain the accepted
  historical geometry; every new option is opt-in or defaults to the previous
  behavior.
- React and Browser adapters continue to consume Core geometry. Measurement is
  host-owned and can provide whole-item resolved footprints.
- Source order, cell order, IDs, and indexes remain stable. No DOM reversal or
  automatic text RTL behavior is added.

## Behaviorally opt-in

`reflowStrategy: "stable"`, `flowDirection: "reverse"`,
`crossDirection: "reverse"`, `reservedRegions`, `flowTolerance`, and the
diagnostic calculator APIs are opt-in. `flowTolerance` changes candidate lane
selection only; it does not change collision/gap rules.

## Deferred

- Dense/backfill has no production API and is not represented by a speculative
  `placementMode` or `dense` option.
- React Native remains deferred.
- Package version selection, private-Git dependency reconciliation, publishing,
  release tags, and host/product policy remain outside this documentation
  reconciliation.

Consumers should migrate by adding only the semantic options they need and by
keeping DOM/accessibility policy in the host.
