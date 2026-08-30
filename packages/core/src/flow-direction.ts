/** Mirrors one logical flow interval inside a known content extent. */
export function reverseFlowOffset(
  flowOffset: number,
  flowSize: number,
  flowExtent: number,
): number {
  return flowExtent - (flowOffset + flowSize);
}
