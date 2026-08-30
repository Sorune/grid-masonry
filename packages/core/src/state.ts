import { GridMasonryError } from "./errors.js";
import {
  calculateHorizontalMasonryLayout,
  createHorizontalAppendLayoutState,
} from "./horizontal-layout.js";
import {
  calculateMasonryLayout,
  createVerticalAppendLayoutState,
} from "./layout.js";
import { applyOrder } from "./order.js";
import { measureLayoutDisplacement } from "./layout-diagnostics.js";
import type {
  GridItem,
  HorizontalGridItem,
  HorizontalMasonryLayoutOptions,
  HorizontalMasonryLayoutResult,
  MasonryLayoutOptions,
  MasonryLayoutResult,
} from "./types.js";

export interface MasonryStateInspection<Item, Options, Result> {
  readonly items: readonly Item[];
  readonly options: Options;
  readonly layout: Result;
  readonly reflowStrategy: ReflowStrategy;
}

export type MasonryStateAxis = "vertical" | "horizontal";
export type ReflowStrategy = "compact" | "stable";

export interface MasonryStateSnapshot<Item, Options, Result>
  extends MasonryStateInspection<Item, Options, Result> {
  readonly axis: MasonryStateAxis;
}

export interface MasonryState<Item, Options, Result> {
  readonly layout: Result;
  append(item: Item): Result;
  update(item: Item): Result;
  remove(id: string): Result;
  reorder(order: readonly string[]): Result;
  resize(options: Options): Result;
  inspect(): MasonryStateInspection<Item, Options, Result>;
  snapshot(): MasonryStateSnapshot<Item, Options, Result>;
  restore(snapshot: MasonryStateSnapshot<Item, Options, Result>): Result;
}

export interface VerticalMasonryStateInput {
  readonly axis: "vertical";
  readonly items: readonly GridItem[];
  readonly options: MasonryLayoutOptions;
  readonly reflowStrategy?: ReflowStrategy;
}

export interface HorizontalMasonryStateInput {
  readonly axis: "horizontal";
  readonly items: readonly HorizontalGridItem[];
  readonly options: HorizontalMasonryLayoutOptions;
  readonly reflowStrategy?: ReflowStrategy;
}

export type MasonryStateInput =
  | VerticalMasonryStateInput
  | HorizontalMasonryStateInput;

export type VerticalMasonryState = MasonryState<
  GridItem,
  MasonryLayoutOptions,
  MasonryLayoutResult
>;

export type HorizontalMasonryState = MasonryState<
  HorizontalGridItem,
  HorizontalMasonryLayoutOptions,
  HorizontalMasonryLayoutResult
>;

export type AnyMasonryState = VerticalMasonryState | HorizontalMasonryState;

function cloneSnapshotValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneSnapshotValue(entry)) as T;
  }
  if (value !== null && typeof value === "object") {
    const clone: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      clone[key] = cloneSnapshotValue((value as Record<string, unknown>)[key]);
    }
    return clone as T;
  }
  return value;
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (typeof left !== "object" || left === null || typeof right !== "object" || right === null) {
    return false;
  }
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => valuesEqual(value, right[index]));
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) => key === rightKeys[index] && valuesEqual(leftRecord[key], rightRecord[key]));
}

const DISPLACEMENT_EPSILON = 1e-7;

type PhysicalLayout = MasonryLayoutResult | HorizontalMasonryLayoutResult;

function compareReflowScores(
  left: ReturnType<typeof measureLayoutDisplacement>,
  right: ReturnType<typeof measureLayoutDisplacement>,
): number {
  if (Math.abs(left.totalDisplacement - right.totalDisplacement) > DISPLACEMENT_EPSILON) {
    return left.totalDisplacement < right.totalDisplacement ? -1 : 1;
  }
  if (Math.abs(left.maximumDisplacement - right.maximumDisplacement) > DISPLACEMENT_EPSILON) {
    return left.maximumDisplacement < right.maximumDisplacement ? -1 : 1;
  }
  if (left.movedCount !== right.movedCount) {
    return left.movedCount < right.movedCount ? -1 : 1;
  }
  return 0;
}

/** Internal stable candidate selector; intentionally absent from package exports. */
export function selectStableReflowCandidate(
  previousLayout: PhysicalLayout,
  compactLayout: PhysicalLayout,
  retainedLaneLayout: PhysicalLayout,
): PhysicalLayout {
  const compactScore = measureLayoutDisplacement(previousLayout, compactLayout);
  const retainedScore = measureLayoutDisplacement(previousLayout, retainedLaneLayout);
  return compareReflowScores(retainedScore, compactScore) < 0
    ? retainedLaneLayout
    : compactLayout;
}

function hasPhysicalLayoutCells(value: unknown): value is PhysicalLayout {
  if (value === null || typeof value !== "object") return false;
  const cells = (value as { readonly cells?: unknown }).cells;
  return Array.isArray(cells) && cells.every((cell) => cell !== null && typeof cell === "object");
}

/**
 * Snapshot geometry is accepted only when it is an exact result of one of the
 * bounded candidates permitted by the current strategy. Comparing the full
 * result also covers flow coordinates, extents, gaps, metadata, and cells in
 * source order; plausibly non-overlapping hand-authored coordinates cannot
 * pass this check.
 */
function isSnapshotLayoutConsistent(
  acceptedLayouts: readonly PhysicalLayout[],
  snapshotLayout: unknown,
): snapshotLayout is PhysicalLayout {
  return hasPhysicalLayoutCells(snapshotLayout) && acceptedLayouts.some((layout) =>
    valuesEqual(layout, snapshotLayout),
  );
}

function createState<Item extends { readonly id: string; readonly aspectRatio: number }, Options, Result>(
  initialItems: readonly Item[],
  initialOptions: Options,
  axis: MasonryStateAxis,
  reflowStrategy: ReflowStrategy,
  calculate: (items: readonly Item[], options: Options) => Result,
  getLanes: (layout: Result) => ReadonlyMap<string, number>,
  lockLane: (item: Item, lane: number) => Item,
  createAppendState: (
    items: readonly Item[],
    options: Options,
  ) => { readonly append: (item: Item) => Result } | undefined,
): MasonryState<Item, Options, Result> {
  let items: readonly Item[] = initialItems.slice();
  let options = initialOptions;
  let currentLayout = calculate(items, options);
  let incrementalAppend = reflowStrategy === "compact"
    ? createAppendState(items, options)
    : undefined;

  const itemsForReflow = (
    nextItems: readonly Item[],
    previousLanes: ReadonlyMap<string, number> | undefined,
  ): readonly Item[] => {
    if (reflowStrategy !== "stable" || previousLanes === undefined) {
      return nextItems;
    }
    return nextItems.map((item) => {
      const lane = previousLanes.get(item.id);
      return lane === undefined ? item : lockLane(item, lane);
    });
  };

  const calculateNext = (
    nextItems: readonly Item[],
    nextOptions: Options,
    previousLayout: Result | undefined,
  ): Result => {
    const compactLayout = calculate(nextItems, nextOptions);
    if (reflowStrategy !== "stable" || previousLayout === undefined) {
      return compactLayout;
    }
    const retainedLaneLayout = calculate(
      itemsForReflow(nextItems, getLanes(previousLayout)),
      nextOptions,
    );
    return selectStableReflowCandidate(
      previousLayout as PhysicalLayout,
      compactLayout as PhysicalLayout,
      retainedLaneLayout as PhysicalLayout,
    ) as Result;
  };

  const commit = (nextItems: readonly Item[], nextOptions: Options): Result => {
    const nextLayout = calculateNext(nextItems, nextOptions, currentLayout);
    items = nextItems.slice();
    options = nextOptions;
    currentLayout = nextLayout;
    incrementalAppend = undefined;
    return nextLayout;
  };

  const state: MasonryState<Item, Options, Result> = {
    get layout(): Result {
      return currentLayout;
    },
    append(item: Item): Result {
      if (incrementalAppend !== undefined) {
        const nextLayout = incrementalAppend.append(item);
        items = [...items, item];
        currentLayout = nextLayout;
        return nextLayout;
      }
      return commit([...items, item], options);
    },
    update(item: Item): Result {
      const index = items.findIndex((entry) => entry.id === item.id);
      if (index < 0) {
        throw new GridMasonryError(
          "INVALID_ITEM",
          `Cannot update missing item id: ${item.id}`,
        );
      }
      const nextItems = items.map((entry, entryIndex) =>
        entryIndex === index ? item : entry,
      );
      return commit(nextItems, options);
    },
    remove(id: string): Result {
      const nextItems = items.filter((item) => item.id !== id);
      if (nextItems.length === items.length) {
        throw new GridMasonryError(
          "INVALID_ITEM",
          `Cannot remove missing item id: ${id}`,
        );
      }
      return commit(nextItems, options);
    },
    reorder(order: readonly string[]): Result {
      return commit(applyOrder(items, order, (item) => item.id), options);
    },
    resize(nextOptions: Options): Result {
      return commit(items, nextOptions);
    },
    inspect(): MasonryStateInspection<Item, Options, Result> {
      return { items: items.slice(), options, layout: currentLayout, reflowStrategy };
    },
    snapshot(): MasonryStateSnapshot<Item, Options, Result> {
      return {
        axis,
        items: cloneSnapshotValue(items),
        options: cloneSnapshotValue(options),
        layout: cloneSnapshotValue(currentLayout),
        reflowStrategy,
      };
    },
    restore(snapshot: MasonryStateSnapshot<Item, Options, Result>): Result {
      if (snapshot.axis !== axis) {
        throw new GridMasonryError(
          "INVALID_OPTION",
          `Cannot restore a ${snapshot.axis} snapshot into ${axis} masonry state.`,
        );
      }

      const nextItems = cloneSnapshotValue(snapshot.items);
      const nextOptions = cloneSnapshotValue(snapshot.options);
      if (snapshot.reflowStrategy !== reflowStrategy) {
        throw new GridMasonryError(
          "INVALID_OPTION",
          `Cannot restore a ${snapshot.reflowStrategy} snapshot into ${reflowStrategy} state.`,
        );
      }

      if (!valuesEqual(items, snapshot.items) || !valuesEqual(options, snapshot.options)) {
        throw new GridMasonryError(
          "INVALID_OPTION",
          "Cannot restore a stale masonry snapshot; semantic inputs have changed.",
        );
      }

      const compactLayout = calculate(nextItems, nextOptions) as PhysicalLayout;
      const acceptedLayouts: PhysicalLayout[] = [compactLayout];
      if (reflowStrategy === "stable" && hasPhysicalLayoutCells(snapshot.layout)) {
        const retainedLaneLayout = calculate(
          itemsForReflow(nextItems, getLanes(snapshot.layout as Result)),
          nextOptions,
        ) as PhysicalLayout;
        acceptedLayouts.push(retainedLaneLayout);
      }
      if (!isSnapshotLayoutConsistent(acceptedLayouts, snapshot.layout)) {
        throw new GridMasonryError(
          "INVALID_OPTION",
          "Cannot restore an inconsistent masonry snapshot.",
        );
      }

      items = nextItems;
      options = nextOptions;
      currentLayout = cloneSnapshotValue(snapshot.layout) as Result;
      return currentLayout;
    },
  };

  return state;
}

export function createMasonryState(
  input: VerticalMasonryStateInput,
): VerticalMasonryState;
export function createMasonryState(
  input: HorizontalMasonryStateInput,
): HorizontalMasonryState;
export function createMasonryState(input: MasonryStateInput): AnyMasonryState {
  if (input.axis === "vertical") {
    return createState(
      input.items,
      input.options,
      input.axis,
      input.reflowStrategy ?? "compact",
      calculateMasonryLayout,
      (layout) => new Map(layout.cells.map((cell) => [cell.id, cell.column])),
      (item, lane) => item.layoutHint?.lockedColumn === undefined
        ? { ...item, layoutHint: { ...item.layoutHint, lockedColumn: lane } }
        : item,
      createVerticalAppendLayoutState,
    );
  }
  return createState(
    input.items,
    input.options,
    input.axis,
    input.reflowStrategy ?? "compact",
    calculateHorizontalMasonryLayout,
    (layout) => new Map(layout.cells.map((cell) => [cell.id, cell.row])),
    (item, lane) => item.layoutHint?.lockedRow === undefined
      ? { ...item, layoutHint: { ...item.layoutHint, lockedRow: lane } }
      : item,
    createHorizontalAppendLayoutState,
  );
}
