/** Mirrors one physical cross-axis interval inside a container. */
export function reverseCrossOffset(
  crossOffset: number,
  crossSize: number,
  containerCrossSize: number,
): number {
  return containerCrossSize - (crossOffset + crossSize);
}
