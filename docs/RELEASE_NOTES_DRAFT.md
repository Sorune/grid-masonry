# Release notes draft

**0.3.0 — NOT PUBLISHED**

The feature implementation is frozen for the accepted P1–P19 capability set.
This draft is not yet a Git tag, npm publication, or GitHub Release. It records
the coordinated `0.3.0` release candidate.

Highlights:

- deterministic vertical and horizontal Core masonry geometry;
- immutable order primitives and React controlled/uncontrolled order state;
- spans, preferred lanes, hard logical lane locks, and measured whole-item
  footprints;
- state operations, validated stale checkpoints, bounded stable reflow, and
  geometry-only anchor deltas;
- independent flow and cross-axis directions without Core DOM/text RTL policy;
- logical reserved regions with hard collision/gap constraints;
- opt-in diagnostics, displacement metrics, and flow placement tolerance;
- linear/indexed flow queries and Core/React/Browser virtualization primitives.

Dense/backfill is deferred. React Native is deferred. DOM, scrolling,
accessibility, text direction, and product semantics remain host-owned.

No tag, GitHub release, or npm package publication has been created yet.
License: MIT © 2026 Sorune.

## Acknowledgements and development disclosure

Prior-art review covered standard masonry, TypeScript, npm, React, and browser
platform patterns for API and architecture evaluation. The repository does not
claim copied third-party implementation, bundled third-party assets, or
endorsement by those projects. Dependencies retain their own license notices.

AI-assisted engineering tools supported implementation, testing,
documentation, and review/orchestration. Human project ownership remains
responsible for architecture, public contracts, acceptance, maintenance, and
release decisions.
