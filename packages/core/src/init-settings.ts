import { calculateHorizontalMasonryLayout } from "./horizontal-layout.js";
import { calculateMasonryLayout } from "./layout.js";
import type {
  GridItem,
  HorizontalGridItem,
  HorizontalMasonryLayoutOptions,
  HorizontalMasonryLayoutResult,
  MasonryLayoutOptions,
  MasonryLayoutResult,
} from "./types.js";

export interface VerticalMasonryInitSettings {
  readonly axis: "vertical";
  readonly items: readonly GridItem[];
  readonly options: MasonryLayoutOptions;
}

export interface HorizontalMasonryInitSettings {
  readonly axis: "horizontal";
  readonly items: readonly HorizontalGridItem[];
  readonly options: HorizontalMasonryLayoutOptions;
}

export type MasonryInitSettings =
  | VerticalMasonryInitSettings
  | HorizontalMasonryInitSettings;

export type MasonryInitResult =
  | MasonryLayoutResult
  | HorizontalMasonryLayoutResult;

/**
 * Additive axis-discriminated entry point over the accepted low-level layout
 * functions. Capability flags describe adapter concerns but do not make Core
 * perform measurement or reordering.
 */
export function calculateMasonryFromSettings(
  settings: VerticalMasonryInitSettings,
): MasonryLayoutResult;
export function calculateMasonryFromSettings(
  settings: HorizontalMasonryInitSettings,
): HorizontalMasonryLayoutResult;
export function calculateMasonryFromSettings(
  settings: MasonryInitSettings,
): MasonryInitResult {
  if (settings.axis === "vertical") {
    return calculateMasonryLayout(settings.items, settings.options);
  }

  return calculateHorizontalMasonryLayout(settings.items, settings.options);
}
