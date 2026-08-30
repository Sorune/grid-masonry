import { GridMasonryError } from "./errors.js";
import type {
  AspectOrientation,
  AspectRatioCalculationOptions,
  AspectRatioDescriptor,
  IntrinsicSize,
  ReducedAspectRatio,
} from "./types.js";

function assertPositiveFiniteDimension(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new GridMasonryError(
      "INVALID_INTRINSIC_SIZE",
      `${name} must be a positive finite number. Received: ${String(value)}`,
    );
  }
}

function assertNonNegativeFinite(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new GridMasonryError(
      "INVALID_RATIO_QUERY",
      `${name} must be a non-negative finite number. Received: ${String(value)}`,
    );
  }
}

export function validateIntrinsicSize(size: IntrinsicSize): void {
  assertPositiveFiniteDimension("width", size.width);
  assertPositiveFiniteDimension("height", size.height);
}

export function validateAspectRatio(ratio: number): void {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new GridMasonryError(
      "INVALID_RATIO",
      `aspect ratio must be a positive finite number. Received: ${String(ratio)}`,
    );
  }
}

export function reduceAspectRatio(
  width: number,
  height: number,
): ReducedAspectRatio | null {
  assertPositiveFiniteDimension("width", width);
  assertPositiveFiniteDimension("height", height);

  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)) {
    return null;
  }

  let a = width;
  let b = height;

  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }

  return {
    width: width / a,
    height: height / a,
  };
}

export function classifyAspectOrientation(
  ratio: number,
  squareTolerance = 0,
): AspectOrientation {
  validateAspectRatio(ratio);
  assertNonNegativeFinite("squareTolerance", squareTolerance);

  if (Math.abs(ratio - 1) <= squareTolerance) {
    return "square";
  }

  return ratio > 1 ? "landscape" : "portrait";
}

export function calculateAspectRatio(
  size: IntrinsicSize,
  options: AspectRatioCalculationOptions = {},
): AspectRatioDescriptor {
  validateIntrinsicSize(size);

  const squareTolerance = options.squareTolerance ?? 0;
  assertNonNegativeFinite("squareTolerance", squareTolerance);

  const value = size.width / size.height;
  const reduced = reduceAspectRatio(size.width, size.height);

  return {
    value,
    intrinsicWidth: size.width,
    intrinsicHeight: size.height,
    orientation: classifyAspectOrientation(value, squareTolerance),
    ...(reduced === null
      ? {}
      : {
          reducedWidth: reduced.width,
          reducedHeight: reduced.height,
        }),
  };
}
