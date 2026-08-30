# Acknowledgements and development disclosure

## Prior art and comparative references

The project evaluated the broader masonry and virtualization ecosystem while
defining deterministic placement, dynamic measurement, spatial queries, and
large-list behavior. Unless explicitly noted otherwise, mentioning another
project means it was studied or compared as prior art; it does not imply that
grid-masonry contains copied source code, is a fork, or is endorsed by that
project or its maintainers.

## Evaluated integration alternatives

Embla Carousel, Swiper, and Keen Slider were studied while defining the
boundary between horizontal geometry, viewport behavior, and host-owned
scrolling. They are not production dependencies of grid-masonry. Their
maintainers and contributors are acknowledged without implying endorsement.

## Independent implementation

grid-masonry follows an independently designed architecture centered on a
platform-independent geometry Core with separate React and Browser adapters.
The Core has zero runtime dependencies and does not bundle third-party
placement or carousel implementations.

## Development transparency

grid-masonry was developed using AI-assisted engineering tools as part of
implementation, testing, documentation, analysis, and review workflows.
AI-generated proposals and changes were treated as engineering inputs rather
than acceptance authority. Public contracts, architecture boundaries, test
criteria, feature-freeze decisions, and release decisions remained
human-directed and were validated against repository source and test results.
The project maintainer remains responsible for the published software and its
release decisions.

## Third-party software and notices

The repository audit found no copied third-party source, bundled third-party
assets, or additional attribution notice required for the published packages
or site. Actual dependencies, when present in development or host projects,
remain governed by their own licenses.
