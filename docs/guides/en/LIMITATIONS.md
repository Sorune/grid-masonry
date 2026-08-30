# Limitations and status

## Intentional boundaries

- Core does not own DOM, CSS, scrolling, text/locale direction, accessibility
  policy, animation, image loading, or product semantics.
- `crossDirection` is a logical cross-axis projection, not automatic RTL. Hosts
  decide DOM/text direction and keyboard/screen-reader policy.
- Source order and DOM order are not rewritten. Dense/backfill is deferred and
  there is no `dense`, `backfill`, or `placementMode` API.
- Preferred lanes are soft. Locks are logical lane constraints, not absolute
  pixel placement.
- Some state mutations/configurations use full recalculation; no universal
  incremental or O(1) promise is made.
- Reserved-region workloads add obstacle-processing cost, especially with many
  regions. Benchmarks are implementation sanity checks, not SLAs.
- Diagnostics are opt-in and derived; Core does not retain a diagnostic log.
- React Native is deferred.

## Release status

The accepted feature implementation is frozen. Package manifests are
coordinated at `0.3.0` with MIT metadata and exact Core dependencies, but npm
publication and registry-backed clean-consumer verification are not complete.

The repository is not yet a published release. MIT © 2026 Sorune.

## Acknowledgements and development disclosure

Prior-art review informed generic API and architecture evaluation; no copied
implementation, third-party asset, endorsement, or dependency lineage is
claimed beyond the package dependencies declared by the repository. Their own
license notices apply.

AI-assisted engineering tools supported implementation, testing,
documentation, and review/orchestration. Human project ownership remains
responsible for architecture, public contracts, acceptance, maintenance, and
release decisions.
