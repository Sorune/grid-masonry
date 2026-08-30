import { GridMasonryError } from "./errors.js";
import type {
  FootprintDiagnosticStatus,
  HorizontalMasonryLayoutResult,
  LayoutDiagnosticAxis,
  LayoutDiagnostics,
  LayoutDisplacementMetrics,
  LayoutItemDiagnostics,
  MasonryLayoutResult,
} from "./types.js";

export interface LayoutDiagnosticCollector {
  recordPlacement(input: {
    readonly id: string;
    readonly index: number;
    readonly requestedLaneSpan: number;
    readonly resolvedLaneSpan: number;
    readonly requestedPreferredLane?: number;
    readonly normalizedPreferredLane?: number;
    readonly preferredLaneHonored?: boolean;
    readonly requestedLockedLane?: number;
    readonly normalizedLockedLane?: number;
    readonly resolvedLaneStart: number;
    readonly footprintStatus: FootprintDiagnosticStatus;
    readonly crossSize: number;
    readonly flowSize: number;
    readonly frontierFlowOffset: number;
    readonly reservedAdjustedFlowOffset: number;
  }): void;
  recordDistribution(index: number, flowOffset: number): void;
  finish(
    logicalFlowExtent: number,
    laneCount: number,
    reservedRegionCount: number,
  ): LayoutDiagnostics;
}

interface MutableLayoutItemDiagnostics extends LayoutItemDiagnostics {
  distributionFlowShift: number;
  distributedFlowOffset: number;
}

export function createLayoutDiagnosticCollector(
  axis: LayoutDiagnosticAxis,
  itemCount: number,
): LayoutDiagnosticCollector {
  const records: Array<MutableLayoutItemDiagnostics | undefined> = [];

  return {
    recordPlacement(input): void {
      const reservedFlowShift =
        input.reservedAdjustedFlowOffset - input.frontierFlowOffset;
      records[input.index] = {
        ...input,
        reservedFlowShift,
        distributedFlowOffset: input.reservedAdjustedFlowOffset,
        distributionFlowShift: 0,
      };
    },
    recordDistribution(index, flowOffset): void {
      const record = records[index];
      if (record === undefined) return;
      record.distributedFlowOffset = flowOffset;
      record.distributionFlowShift =
        flowOffset - record.reservedAdjustedFlowOffset;
    },
    finish(logicalFlowExtent, resolvedLaneCount, resolvedReservedRegionCount): LayoutDiagnostics {
      const items = records
        .filter((record): record is MutableLayoutItemDiagnostics => record !== undefined)
        .sort((left, right) => left.index - right.index)
        .map((record) => ({ ...record }));
      return {
        axis,
        itemCount,
        laneCount: resolvedLaneCount,
        reservedRegionCount: resolvedReservedRegionCount,
        logicalFlowExtent,
        items,
      };
    },
  };
}

type PhysicalLayout = MasonryLayoutResult | HorizontalMasonryLayoutResult;

function layoutAxis(layout: PhysicalLayout): LayoutDiagnosticAxis | undefined {
  if ("columnCount" in layout) return "vertical";
  if ("rowCount" in layout) return "horizontal";
  return undefined;
}

const DISPLACEMENT_EPSILON = 1e-7;

export function measureLayoutDisplacement(
  previousLayout: PhysicalLayout,
  nextLayout: PhysicalLayout,
): LayoutDisplacementMetrics {
  const previousAxis = layoutAxis(previousLayout);
  const nextAxis = layoutAxis(nextLayout);
  if (
    previousAxis !== undefined &&
    nextAxis !== undefined &&
    previousAxis !== nextAxis
  ) {
    throw new GridMasonryError(
      "INVALID_OPTION",
      "Layout displacement requires both layouts to use the same axis.",
    );
  }

  const previousById = new Map(previousLayout.cells.map((cell) => [cell.id, cell]));
  let totalDisplacement = 0;
  let maximumDisplacement = 0;
  let movedCount = 0;
  for (const nextCell of nextLayout.cells) {
    const previousCell = previousById.get(nextCell.id);
    if (previousCell === undefined) continue;
    const displacement =
      Math.abs(nextCell.x - previousCell.x) +
      Math.abs(nextCell.y - previousCell.y);
    totalDisplacement += displacement;
    maximumDisplacement = Math.max(maximumDisplacement, displacement);
    if (displacement > DISPLACEMENT_EPSILON) movedCount += 1;
  }
  return { totalDisplacement, maximumDisplacement, movedCount };
}
