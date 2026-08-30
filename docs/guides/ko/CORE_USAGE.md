# Core 사용법

`grid-masonry-core`는 플랫폼에 의존하지 않는 배치 계산 패키지입니다.
호출자가 전달한 항목과 옵션을 수정하지 않으며, 컨테이너를 기준으로 한 논리
좌표를 반환합니다. DOM을 읽거나 이미지를 불러오거나 스크롤을 변경하지
않습니다.

## 세로 레이아웃

```ts
import { calculateMasonryLayout } from "grid-masonry-core";

const items = [
  { id: "a", aspectRatio: 4 / 3 },
  { id: "b", aspectRatio: 1 },
];

const layout = calculateMasonryLayout(items, {
  containerWidth: 960,
  minColumnWidth: 220,
  minColumns: 1,
  maxColumns: 4,
  gap: 8,
});
```

`aspectRatio`는 너비를 높이로 나눈 값입니다. 각 셀에는 `x`, `y`,
`width`, `height`, 논리 열 번호인 `column`, 정규화된
`columnSpan`, `id`, 입력 위치를 나타내는 `index`가 들어 있습니다. 항목의
순서와 옵션이 같으면 언제나 같은 결과를 반환합니다.

## 가로 레이아웃

```ts
import { calculateHorizontalMasonryLayout } from "grid-masonry-core";

const layout = calculateHorizontalMasonryLayout(
  [
    { id: "a", aspectRatio: 4 / 3 },
    { id: "b", aspectRatio: 1 },
  ],
  { containerHeight: 640, minRowHeight: 180, gap: 8 },
);
```

세로 레이아웃에서는 `x` 방향의 column이 교차 축(cross axis)을 이루고,
`y`가 진행 축(flow axis)이 됩니다. 가로 레이아웃에서는 `y` 방향의 row가
교차 축이고 `x`가 진행 축입니다. 세로 셀은 `column`과 `columnSpan`을,
가로 셀은 `row`와 `rowSpan`을 사용합니다.

## 비율과 실제 측정 크기

이미지 같은 원본 크기에서는 `calculateAspectRatio`를 사용할 수 있습니다.
호스트 애플리케이션이 자연스러운 콘텐츠 전체를 측정한 뒤에는 다음처럼
`resolvedFootprint`을 전달할 수 있습니다.

```ts
const measured = {
  id: "a",
  aspectRatio: 4 / 3,
  resolvedFootprint: { height: 260, forWidth: 360 },
};
```

세로 레이아웃의 `resolvedFootprint`은 `{ height, forWidth }`, 가로
레이아웃은 `{ width, forHeight }` 형식입니다. 여기에 기록된 교차 축
크기가 현재 Core가 계산한 크기와 허용 범위 안에서 일치해야 측정값을
사용합니다. 일치하지 않으면 오류를 내지 않고 `aspectRatio`를 기준으로
크기를 다시 계산합니다.

## 레인 크기와 간격

`columnGap`이나 `rowGap`을 따로 지정하지 않으면 `gap`이 두 방향의
간격에 모두 적용됩니다. `columnSizing`과 `rowSizing`의 기본값은
`fill`입니다. `cap`은 기준 레인 수를 유지하면서 레인 크기에 상한을
적용하고, 남는 공간을 `contentWidth`와 `contentOffsetX` 또는 가로
레이아웃의 대응 필드로 제공합니다. 정렬 방식은 `start`, `center`,
`end` 중 하나입니다.

## 불변성과 입력 순서

항목, 옵션, 배치 힌트, `resolvedFootprint`, 예약 영역 배열은 모두 읽기
전용 입력입니다. Core는 이 값을 다시 쓰지 않습니다. 입력 배열의 순서가
기준 순서이며, 물리적인 배치가 눈에 보이는 흐름과 달라지더라도
`layout.cells`와 각 셀의 `index`는 입력 순서를 유지합니다. 순서를
바꾸려면 순서 처리 함수나 호스트가 관리하는 `useOrderList`로 새 입력
배열을 만들어야 합니다.

전체 기능은 패키지의 공개 타입 선언과 [고급 레이아웃](ADVANCED_LAYOUT.md),
[상태](STATE_AND_CHECKPOINTS.md), [진단](DIAGNOSTICS_AND_QUERIES.md) 문서에서
확인할 수 있습니다.
