import { GridMasonryError } from "./errors.js";
import type {
  HorizontalMasonryCell,
  HorizontalMasonryLayoutResult,
  MasonryCell,
  MasonryLayoutResult,
} from "./types.js";

export interface FlowAnchorDelta {
  readonly anchorId: string;
  readonly previousFlowOffset: number;
  readonly nextFlowOffset: number;
  /** New flow-axis position minus the previous flow-axis position. */
  readonly delta: number;
}

function findFlowOffset(
  layout: MasonryLayoutResult | HorizontalMasonryLayoutResult,
  anchorId: string,
): number | undefined {
  const cell = layout.cells.find((candidate) => candidate.id === anchorId);
  if (cell === undefined) return undefined;
  return "column" in cell
    ? (cell as MasonryCell).y
    : (cell as HorizontalMasonryCell).x;
}

/**
 * Computes a geometry-only flow-axis delta for a persistent anchor.
 * Consumers decide whether and how to apply this delta to platform scroll.
 */
export function calculateFlowAnchorDelta(
  previousLayout: MasonryLayoutResult,
  nextLayout: MasonryLayoutResult,
  anchorId: string,
): FlowAnchorDelta | undefined;
export function calculateFlowAnchorDelta(
  previousLayout: HorizontalMasonryLayoutResult,
  nextLayout: HorizontalMasonryLayoutResult,
  anchorId: string,
): FlowAnchorDelta | undefined;
export function calculateFlowAnchorDelta(
  previousLayout: MasonryLayoutResult | HorizontalMasonryLayoutResult,
  nextLayout: MasonryLayoutResult | HorizontalMasonryLayoutResult,
  anchorId: string,
): FlowAnchorDelta | undefined {
  const previousIsVertical = "columnCount" in previousLayout;
  const nextIsVertical = "columnCount" in nextLayout;
  if (previousIsVertical !== nextIsVertical) {
    throw new GridMasonryError(
      "INVALID_OPTION",
      "Flow anchor delta requires previous and next layouts on the same flow axis.",
    );
  }
  const previousFlowOffset = findFlowOffset(previousLayout, anchorId);
  const nextFlowOffset = findFlowOffset(nextLayout, anchorId);
  if (previousFlowOffset === undefined || nextFlowOffset === undefined) {
    return undefined;
  }
  return {
    anchorId,
    previousFlowOffset,
    nextFlowOffset,
    delta: nextFlowOffset - previousFlowOffset,
  };
}
