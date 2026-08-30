import {
  applyOrder,
  calculateFlowAnchorDelta,
  calculateHorizontalMasonryLayout,
  calculateHorizontalMasonryLayoutWithDiagnostics,
  calculateMasonryLayout,
  calculateMasonryLayoutWithDiagnostics,
  calculateMasonryFromSettings,
  createFlowRangeIndex,
  createMasonryState,
  createOrder,
  measureLayoutDisplacement,
  queryVirtualizedCells,
  queryVirtualizedReference,
  queryVisibleFlowCells,
} from "../../packages/core/src/index.js";
import type {
  HorizontalGridItem,
  HorizontalMasonryLayoutOptions,
  MasonryLayoutOptions,
  ReservedRegion,
} from "../../packages/core/src/index.js";

const region: ReservedRegion = {
  laneStart: 0,
  laneSpan: 1,
  flowStart: 120,
  flowSize: 180,
};

const verticalOptions: MasonryLayoutOptions = {
  containerWidth: 960,
  minColumnWidth: 220,
  gap: 8,
  reservedRegions: [region],
  flowDirection: "forward",
  crossDirection: "reverse",
  flowTolerance: 0.25,
};

const verticalItems = [
  {
    id: "a",
    aspectRatio: 4 / 3,
    layoutHint: { columnSpan: 1, preferredColumn: 0 },
    resolvedFootprint: { height: 240, forWidth: 313.3333333333333 },
  },
  { id: "b", aspectRatio: 1, layoutHint: { lockedColumn: 1 } },
] as const;

const vertical = calculateMasonryLayout(verticalItems, verticalOptions);
const verticalObserved = calculateMasonryLayoutWithDiagnostics(
  verticalItems,
  verticalOptions,
);
const verticalRange = { start: 0, end: 600 };
const verticalLinear = queryVisibleFlowCells(vertical, verticalRange);
const verticalIndexed = createFlowRangeIndex(vertical).query(verticalRange);
const verticalVirtual = queryVirtualizedCells(vertical, verticalRange, { overscan: 20 });
const verticalReference = queryVirtualizedReference(vertical, verticalRange, { overscan: 20 });

const order = createOrder(verticalItems);
const reordered = applyOrder(verticalItems, order);
const state = createMasonryState({
  axis: "vertical",
  items: reordered,
  options: verticalOptions,
});
const checkpoint = state.snapshot();
const restored = state.restore(checkpoint);
const delta = calculateFlowAnchorDelta(vertical, restored, "a");
const displacement = measureLayoutDisplacement(vertical, restored);

const horizontalOptions: HorizontalMasonryLayoutOptions = {
  containerHeight: 640,
  minRowHeight: 180,
  gap: 8,
  flowDirection: "reverse",
  crossDirection: "forward",
};
const horizontalItems: readonly HorizontalGridItem[] = [
  { id: "h1", aspectRatio: 3 / 2, layoutHint: { rowSpan: 1, preferredRow: 0 } },
];
const horizontal = calculateHorizontalMasonryLayout(horizontalItems, horizontalOptions);
const horizontalObserved = calculateHorizontalMasonryLayoutWithDiagnostics(
  horizontalItems,
  horizontalOptions,
);

// Settings facade remains discriminated by axis.
const fromSettings = calculateMasonryFromSettings({
  axis: "vertical",
  items: verticalItems,
  options: verticalOptions,
});

void [
  verticalObserved,
  verticalLinear,
  verticalIndexed,
  verticalVirtual,
  verticalReference,
  delta,
  displacement,
  horizontal,
  horizontalObserved,
  fromSettings,
];
