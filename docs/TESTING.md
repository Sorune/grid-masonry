# Testing

grid-masonry uses Node.js 20 or newer and npm workspaces.

## Local verification

From the repository root:

```bash
npm ci
npm run verify
```

`npm run verify` builds and typechecks the Core, React, and Browser packages,
runs their public type fixtures, and executes the full unit/regression suites.
The supported package baseline is 218 Core tests, 21 React tests, and 30
Browser tests.

The static documentation/demo site is built after the package build:

```bash
npm run build
npm --prefix site run build
```

The site output is `site/dist`.

## Clean consumers

Before publication, package tarballs are installed into temporary projects
outside the workspace. Core is tested alone; React is tested with Core and a
compatible React peer; Browser is tested with Core. These checks avoid
workspace links and verify that packed manifests, exports, declarations, and
runtime imports work as consumers will receive them.

## Browser acceptance

Browser acceptance uses an externally reachable staging site when available.
It covers desktop, tablet, and mobile layouts; English/Korean navigation; the
vertical and horizontal demos; directions, distributions, tolerance, add/reset
controls; basic keyboard accessibility; console errors; and failed assets.
Detailed acceptance evidence belongs in the private development repository;
this document records the reproducible verification approach.
