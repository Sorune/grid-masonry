import { performance } from "node:perf_hooks";
import {
  calculateMasonryLayout,
  createFlowRangeIndex,
  queryVisibleFlowCells,
} from "../dist/index.js";

for (const count of [100, 1000, 10000]) {
  const items = Array.from({ length: count }, (_, index) => ({
    id: `item-${index}`,
    aspectRatio: 0.6 + (index % 9) / 4,
  }));
  const layout = calculateMasonryLayout(items, {
    containerWidth: 1200,
    minColumnWidth: 180,
    minColumns: 2,
    maxColumns: 6,
    gap: 8,
  });
  const index = createFlowRangeIndex(layout);
  const range = { start: layout.containerHeight * 0.4, end: layout.containerHeight * 0.6 };
  for (let warm = 0; warm < 5; warm += 1) {
    queryVisibleFlowCells(layout, range);
    index.query(range);
  }
  const samples = (query) => {
    const times = [];
    for (let run = 0; run < 25; run += 1) {
      const start = performance.now();
      query();
      times.push(performance.now() - start);
    }
    times.sort((left, right) => left - right);
    return times[Math.floor(times.length / 2)];
  };
  console.log(JSON.stringify({ count, linearMs: samples(() => queryVisibleFlowCells(layout, range)), indexedMs: samples(() => index.query(range)) }));
}
