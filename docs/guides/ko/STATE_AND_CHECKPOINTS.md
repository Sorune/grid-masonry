# 상태, 스냅샷, 안정적 재배치

## 상태 기반 레이아웃

```ts
import { createMasonryState } from "grid-masonry-core";

const state = createMasonryState({
  axis: "vertical",
  items: [{ id: "a", aspectRatio: 1 }],
  options: { containerWidth: 800, minColumnWidth: 200, gap: 8 },
  reflowStrategy: "compact",
});

state.append({ id: "b", aspectRatio: 4 / 3 });
state.update({ id: "a", aspectRatio: 3 / 2 });
state.remove("b");
state.reorder(["a"]);
state.resize({ containerWidth: 640, minColumnWidth: 200, gap: 8 });
const inspection = state.inspect();
```

`createMasonryState`는 `append`, `update`, `remove`, `reorder`,
`resize`, `inspect`, `snapshot`, `restore`를 제공합니다.
`reflowStrategy`가 `compact`이고 안전하게 증분 계산을 적용할 수 있는 일부
`append` 설정에서는 기존 상태를 활용합니다. 방향이나 예약 영역처럼 계산
조건이 복잡한 경우에는 전체를 다시 계산합니다. 어느 경로를 사용하든 순수
배치 함수의 결과가 정확성의 기준입니다.

상태 변경은 원자적으로 처리됩니다. 유효하지 않은 작업이 실패하면 항목,
옵션, 레이아웃, `reflowStrategy` 중 어느 것도 일부만 바뀐 채 남지
않습니다.

## 스냅샷과 복원

스냅샷은 의미가 같은 배치 입력 상태에서 다시 사용할 수 있도록 검증된
체크포인트입니다. 작업을 되돌리는 기능이 아니며, 변경 이력을 보관하거나
과거 상태를 자유롭게 오가는 기능도 아닙니다.

`restore`를 호출할 때 현재 입력의 의미가 스냅샷을 만든 시점과 다르면
오래된 체크포인트로 판단해 거부합니다. 저장된 좌표가 변조되었거나 내부
구조가 일치하지 않는 경우에도 복원하지 않습니다. 복원 실패는 원자적이므로
현재 상태를 바꾸지 않습니다. 상태가 A에서 B로 바뀐 뒤 의미상 완전히 같은
A로 돌아오면, 이전에 만든 A 체크포인트를 다시 사용할 수 있습니다.

호환성 검사에는 축, 항목 순서와 ID, 비율, span과 레인 힌트,
`resolvedFootprint`과 교차 축 크기 연결, 레이아웃 옵션, 방향, 예약 영역,
`flowTolerance`, `reflowStrategy`가 포함됩니다. 진단 정보는 계산 결과에서
파생되는 관찰값이므로 스냅샷 호환성에 영향을 주지 않습니다.

## 안정적 재배치

```ts
const stable = createMasonryState({
  axis: "horizontal",
  items,
  options,
  reflowStrategy: "stable",
});
```

`compact`는 일반적인 결정적 배치를 수행합니다. `stable`은 `compact` 후보와
기존 레인을 유지하는 후보 중 유효한 결과를 실제 물리 좌표의 이동 거리로
비교합니다. 비교 순서는 다음과 같습니다.

1. 전체 이동 거리(`totalDisplacement`)가 작은 후보
2. 최대 이동 거리(`maximumDisplacement`)가 작은 후보
3. 움직인 항목 수(`movedCount`)가 적은 후보
4. 세 값이 모두 같으면 `compact` 후보

`stable`이 모든 항목의 이전 레인을 보장하는 것은 아닙니다. 호스트가
명시한 `lockedColumn`이나 `lockedRow`가 항상 우선하며, 기존 레인을
유지하기 위한 내부 힌트는 후보를 계산하는 동안에만 사용됩니다.

## 앵커 이동량

`calculateFlowAnchorDelta(previousLayout, nextLayout, anchorId)`는 같은 축의
두 레이아웃에서 앵커가 진행 축으로 이동한 거리만 반환합니다. 스크롤을 직접
바꾸지 않으며, 이 값을 화면에 적용할지와 적용 방법은 호스트 애플리케이션이
결정합니다. 교차 축으로만 이동한 값은 진행 축 스크롤
보정값으로 취급하지 않습니다.
