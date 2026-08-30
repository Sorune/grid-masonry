import {
  calculateHorizontalMasonryLayoutWithDiagnostics,
  calculateMasonryLayoutWithDiagnostics,
  measureLayoutDisplacement,
} from "../../dist/index.js";
import type {
  HorizontalMasonryLayoutOptions,
  HorizontalMasonryLayoutResult,
  LayoutDiagnostics,
  LayoutDisplacementMetrics,
  LayoutWithDiagnostics,
  MasonryLayoutResult,
  MasonryLayoutOptions,
  ReservedRegion,
} from "../../dist/index.js";

const verticalForward: MasonryLayoutOptions = {
  containerWidth: 320,
  minColumnWidth: 140,
  flowDirection: "forward",
};
const verticalReverse: MasonryLayoutOptions = {
  containerWidth: 320,
  minColumnWidth: 140,
  flowDirection: "reverse",
  flowTolerance: 0.5,
};
const horizontalForward: HorizontalMasonryLayoutOptions = {
  containerHeight: 320,
  minRowHeight: 140,
  flowDirection: "forward",
};
const horizontalReverse: HorizontalMasonryLayoutOptions = {
  containerHeight: 320,
  minRowHeight: 140,
  flowDirection: "reverse",
  flowTolerance: 0,
};

const invalidVertical: MasonryLayoutOptions = {
  containerWidth: 320,
  minColumnWidth: 140,
  // @ts-expect-error flowDirection accepts only the public forward/reverse union.
  flowDirection: "sideways",
};
const invalidHorizontal: HorizontalMasonryLayoutOptions = {
  containerHeight: 320,
  minRowHeight: 140,
  // @ts-expect-error flowDirection accepts only the public forward/reverse union.
  flowDirection: "sideways",
};

const verticalCrossForward: MasonryLayoutOptions = {
  containerWidth: 320,
  minColumnWidth: 140,
  crossDirection: "forward",
};
const horizontalCrossReverse: HorizontalMasonryLayoutOptions = {
  containerHeight: 320,
  minRowHeight: 140,
  crossDirection: "reverse",
};
const invalidCrossVertical: MasonryLayoutOptions = {
  containerWidth: 320,
  minColumnWidth: 140,
  // @ts-expect-error crossDirection accepts only the public forward/reverse union.
  crossDirection: "sideways",
};
const invalidCrossHorizontal: HorizontalMasonryLayoutOptions = {
  containerHeight: 320,
  minRowHeight: 140,
  // @ts-expect-error crossDirection accepts only the public forward/reverse union.
  crossDirection: "sideways",
};

const region: ReservedRegion = {
  laneStart: 0,
  laneSpan: 1,
  flowStart: 24.5,
  flowSize: 80,
};
const verticalRegions: MasonryLayoutOptions = {
  containerWidth: 320,
  minColumnWidth: 140,
  reservedRegions: [region],
};
const horizontalRegions: HorizontalMasonryLayoutOptions = {
  containerHeight: 320,
  minRowHeight: 140,
  reservedRegions: [region],
};
const invalidRegion: ReservedRegion = {
  // @ts-expect-error logical lane coordinates are numeric.
  laneStart: "first",
  laneSpan: 1,
  flowStart: 0,
  flowSize: 20,
};
const incompleteRegion: ReservedRegion = {
  laneStart: 0,
  laneSpan: 1,
  flowStart: 0,
  // @ts-expect-error flowSize is required by the reserved-region contract.
  flowSize: undefined,
};

const diagnosticVertical: LayoutWithDiagnostics<MasonryLayoutResult> =
  calculateMasonryLayoutWithDiagnostics([], verticalForward);
const diagnosticHorizontal: LayoutWithDiagnostics<HorizontalMasonryLayoutResult> =
  calculateHorizontalMasonryLayoutWithDiagnostics([], horizontalForward);
const diagnosticFacts: LayoutDiagnostics = diagnosticVertical.diagnostics;
const displacement: LayoutDisplacementMetrics = measureLayoutDisplacement(
  diagnosticVertical.layout,
  diagnosticVertical.layout,
);
// @ts-expect-error the vertical diagnostic calculator accepts only vertical options.
calculateMasonryLayoutWithDiagnostics([], horizontalForward);
// @ts-expect-error the horizontal diagnostic calculator accepts only horizontal options.
calculateHorizontalMasonryLayoutWithDiagnostics([], verticalForward);

void verticalForward;
void verticalReverse;
void horizontalForward;
void horizontalReverse;
void invalidVertical;
void invalidHorizontal;
void verticalCrossForward;
void horizontalCrossReverse;
void invalidCrossVertical;
void invalidCrossHorizontal;
void verticalRegions;
void horizontalRegions;
void invalidRegion;
void incompleteRegion;
void diagnosticVertical;
void diagnosticHorizontal;
void diagnosticFacts;
void displacement;
