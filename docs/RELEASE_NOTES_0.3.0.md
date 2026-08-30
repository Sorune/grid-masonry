# grid-masonry 0.3.0 release notes

**0.3.0 — NPM PUBLISHED / REGISTRY VERIFIED**

The feature implementation is frozen. The coordinated npm packages are
published and accepted by fresh registry-only consumers. The official site is
deployed and production browser smoke acceptance is complete. The `v0.3.0`
Git tag and GitHub Release are available.

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

Npm Core: published
Npm React: published
Npm Browser: published
Registry-only consumer acceptance: PASS
Git tag: `v0.3.0` — created
GitHub Release: created
Production Cloudflare Pages deployment: PASS
Production browser smoke: PASS
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
