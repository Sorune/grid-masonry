# 진단, 질의, 가상화

## 선택적 진단

```ts
import {
  calculateMasonryLayoutWithDiagnostics,
  measureLayoutDisplacement,
} from "grid-masonry-core";

const observed = calculateMasonryLayoutWithDiagnostics(items, options);
// observed.layout은 일반 배치 함수의 결과와 정확히 같습니다.
const metrics = measureLayoutDisplacement(previous, observed.layout);
```

가로 레이아웃에서는
`calculateHorizontalMasonryLayoutWithDiagnostics`를 사용합니다. 진단
기능은 일반 배치 계산과 동일한 레이아웃에, 계산 과정에서 확인할 수 있는
구조화된 정보를 덧붙여 반환합니다. 진단을 사용해도 배치 결과는 달라지지
않습니다.

추가 정보에는 항목이 차지하도록 요청한 레인 수와 확정된 레인 수, 선호
레인과 고정 레인 제약,
`resolvedFootprint` 상태(`none`, `used`, `stale`), 레인 앞쪽 경계의
위치, 예약 영역 때문에 밀린 거리, `flowDistribution`으로 이동한 거리가
포함됩니다. 이는 로그나 사용량 수집, 변경 이력, 영구 상태가 아닙니다.
일반 배치 함수는 항목별 진단 레코드를 만들지 않습니다.

`measureLayoutDisplacement`는 두 레이아웃에 모두 남아 있는 ID만 대상으로
`totalDisplacement`, `maximumDisplacement`, `movedCount`를 계산합니다.
이 값은 `stable` 재배치가 사용하는 실제 x/y 이동 거리와 같으며, 축이 서로
다른 레이아웃은 비교하지 않습니다.

## 진행 범위 질의

```ts
import {
  createFlowRangeIndex,
  queryVisibleFlowCells,
} from "grid-masonry-core";

const range = { start: 400, end: 900 };
const linear = queryVisibleFlowCells(layout, range);
const indexed = createFlowRangeIndex(layout).query(range);
```

선형 질의와 색인을 사용하는 질의는 최종 진행 좌표를 기준으로 셀을
선택하고, 결과를 입력 순서대로 반환합니다. 각 셀의 `index`도 이 순서를
나타냅니다. 두 방식은 세로·가로 축과 모든 방향에서 같은 의미를 가집니다.
색인은 질의 속도를 높이기 위한 수단일 뿐이며, 결과의 기준은 선형
질의입니다.

## 가상화

`queryVirtualizedReference`와 `queryVirtualizedCells`는 화면 밖 여유
범위인 overscan을 적용해 필요한 Core 셀만 반환합니다. 스크롤을 관찰하거나
DOM을 만들지는 않습니다. 호스트 애플리케이션이 화면에 보이는 진행 범위를
제공하며, 필요하면 색인을 사용한 결과를 기준 구현과 비교할 수 있습니다.

예약 영역은 셀이 아니므로 가상화 대상에도 포함되지 않습니다. React와
Browser 어댑터는 반환된 항목 셀을 기준으로 생명주기를 관리하고 입력
순서를 유지합니다.
