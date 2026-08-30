# grid-masonry 0.3.0 release notes

**0.3.0 — NPM PUBLISHED / REGISTRY VERIFIED**

The feature implementation is frozen. The coordinated npm packages are
published and accepted by fresh registry-only consumers. This document records
the `0.3.0` release line before the remaining Git tag, GitHub Release, and
production Cloudflare Pages deployment steps.

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
Git tag: pending
GitHub Release: pending
Production Cloudflare Pages deployment: pending
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
