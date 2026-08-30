export type GridMasonryErrorCode =
  | "INVALID_OPTION"
  | "INVALID_ITEM"
  | "DUPLICATE_ITEM_ID"
  | "INVALID_INTRINSIC_SIZE"
  | "INVALID_RATIO"
  | "INVALID_RATIO_QUERY"
  | "INVALID_RANGE";

export class GridMasonryError extends Error {
  readonly code: GridMasonryErrorCode;

  constructor(code: GridMasonryErrorCode, message: string) {
    super(message);
    this.name = "GridMasonryError";
    this.code = code;
  }
}
