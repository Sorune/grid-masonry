import { GridMasonryError } from "./errors.js";
import {
  classifyAspectOrientation,
  validateAspectRatio,
} from "./aspect-ratio.js";
import type {
  AspectRatioMatch,
  AspectRatioPreset,
  AspectRatioPresetMatch,
  AspectRatioQuery,
  AspectRatioSearchResult,
} from "./types.js";

function assertNonNegativeFinite(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new GridMasonryError(
      "INVALID_RATIO_QUERY",
      `${name} must be a non-negative finite number. Received: ${String(value)}`,
    );
  }
}

export function validateAspectRatioQuery(query: AspectRatioQuery): void {
  switch (query.kind) {
    case "target":
      validateAspectRatio(query.target);
      assertNonNegativeFinite("tolerance", query.tolerance);
      return;
    case "range":
      validateAspectRatio(query.min);
      validateAspectRatio(query.max);
      if (query.max < query.min) {
        throw new GridMasonryError(
          "INVALID_RATIO_QUERY",
          `range max (${query.max}) must be >= min (${query.min}).`,
        );
      }
      return;
    case "orientation":
      if (
        query.orientation !== "portrait" &&
        query.orientation !== "square" &&
        query.orientation !== "landscape"
      ) {
        throw new GridMasonryError(
          "INVALID_RATIO_QUERY",
          `orientation must be "portrait", "square", or "landscape". Received: ${String(query.orientation)}`,
        );
      }
      assertNonNegativeFinite(
        "squareTolerance",
        query.squareTolerance ?? 0,
      );
      return;
    default: {
      const exhaustive: never = query;
      return exhaustive;
    }
  }
}

function matchValidatedAspectRatio(
  ratio: number,
  query: AspectRatioQuery,
): AspectRatioMatch {
  switch (query.kind) {
    case "target": {
      const delta = Math.abs(ratio - query.target);
      return {
        matches: delta <= query.tolerance,
        ratio,
        delta,
        relativeDelta: delta / query.target,
      };
    }
    case "range":
      return {
        matches: ratio >= query.min && ratio <= query.max,
        ratio,
      };
    case "orientation":
      return {
        matches:
          classifyAspectOrientation(ratio, query.squareTolerance ?? 0) ===
          query.orientation,
        ratio,
      };
  }
}

export function matchesAspectRatio(
  ratio: number,
  query: AspectRatioQuery,
): AspectRatioMatch {
  validateAspectRatio(ratio);
  validateAspectRatioQuery(query);
  return matchValidatedAspectRatio(ratio, query);
}

export function searchAspectRatios<Item>(
  items: readonly Item[],
  getAspectRatio: (item: Item, index: number) => number,
  query: AspectRatioQuery,
): readonly AspectRatioSearchResult<Item>[] {
  validateAspectRatioQuery(query);

  const results: AspectRatioSearchResult<Item>[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item === undefined) continue;

    const ratio = getAspectRatio(item, index);
    validateAspectRatio(ratio);
    const match = matchValidatedAspectRatio(ratio, query);

    if (match.matches) {
      results.push({ item, index, ratio, match });
    }
  }

  return results;
}

export function findNearestAspectRatioPreset(
  ratio: number,
  presets: readonly AspectRatioPreset[],
): AspectRatioPresetMatch | null {
  validateAspectRatio(ratio);

  if (presets.length === 0) {
    return null;
  }

  let nearest: AspectRatioPresetMatch | null = null;

  for (const preset of presets) {
    if (typeof preset.id !== "string" || preset.id.trim().length === 0) {
      throw new GridMasonryError(
        "INVALID_RATIO_QUERY",
        "AspectRatioPreset.id must be a non-empty string.",
      );
    }

    validateAspectRatio(preset.ratio);
    if (preset.tolerance !== undefined) {
      assertNonNegativeFinite("preset tolerance", preset.tolerance);
    }

    const delta = Math.abs(ratio - preset.ratio);
    const candidate: AspectRatioPresetMatch = {
      preset,
      ratio,
      delta,
      relativeDelta: delta / preset.ratio,
      ...(preset.tolerance === undefined
        ? {}
        : { matchesTolerance: delta <= preset.tolerance }),
    };

    if (nearest === null || candidate.delta < nearest.delta) {
      nearest = candidate;
    }
  }

  return nearest;
}
