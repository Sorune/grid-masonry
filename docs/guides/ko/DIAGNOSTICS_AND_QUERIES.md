# 진단, 쿼리, 가상화

진단은 opt-in 관찰입니다.

```ts
import { calculateMasonryLayoutWithDiagnostics } from "grid-masonry-core";

const observed = calculateMasonryLayoutWithDiagnostics(items, options);
// observed.layout === 일반 calculator의 결과
```

진단은 span, preferred/locked lane, footprint 상태(`none`, `used`, `stale`),
frontier/region shift, distribution shift를 구조화해 제공합니다. logging,
telemetry, history가 아니며 일반 calculator는 item별 진단 객체를 만들지
않습니다. `measureLayoutDisplacement`는 retained ID에 대해
`totalDisplacement`, `maximumDisplacement`, `movedCount`를 계산합니다.

`queryVisibleFlowCells`는 선형 기준 구현이고 `createFlowRangeIndex`는 같은
flow 좌표 의미의 index 최적화입니다. `queryVirtualizedReference`와
`queryVirtualizedCells`는 overscan을 적용하지만 scroll을 관찰하거나 DOM을
만들지 않습니다. 결과는 모든 방향과 축에서 source/index 순서를 유지합니다.
