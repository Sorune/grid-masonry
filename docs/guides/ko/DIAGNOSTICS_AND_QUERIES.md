# 진단, 질의, 가상화

진단은 필요할 때만 켜는 관찰 기능(opt-in)입니다.

```ts
import { calculateMasonryLayoutWithDiagnostics } from "grid-masonry-core";

const observed = calculateMasonryLayoutWithDiagnostics(items, options);
// observed.layout === 일반 calculator의 결과
```

진단 결과에는 요청·확정 span, preferred/locked lane, footprint 상태(`none`,
`used`, `stale`), frontier와 reserved region 이동, distribution 이동이
구조화되어 포함됩니다. 진단은 logging, telemetry, history가 아닙니다.
일반 calculator는 item별 진단 객체를 만들지 않습니다.

`measureLayoutDisplacement`는 유지된 ID를 기준으로 `totalDisplacement`,
`maximumDisplacement`, `movedCount`를 계산합니다. 새로 추가되거나 제거된
item은 displacement 비교 대상이 아닙니다.

`queryVisibleFlowCells`는 선형 기준 구현이고 `createFlowRangeIndex`는 같은
진행 좌표 의미를 이용하는 index 최적화입니다. `queryVirtualizedReference`와
`queryVirtualizedCells`는 overscan을 적용하지만 스크롤을 관찰하거나 DOM을
만들지는 않습니다. 모든 축과 방향에서 결과는 canonical input/index 순서를
유지합니다.
