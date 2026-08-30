# Core 사용법

`grid-masonry-core`는 DOM이나 이미지를 읽지 않는 순수 TypeScript 배치 계산
패키지입니다. 입력 배열과 옵션을 변경하지 않고, 컨테이너를 기준으로 한
논리 좌표를 결과로 반환합니다.

```ts
import { calculateMasonryLayout } from "grid-masonry-core";

const layout = calculateMasonryLayout(
  [
    { id: "a", aspectRatio: 4 / 3 },
    { id: "b", aspectRatio: 1 },
  ],
  { containerWidth: 960, minColumnWidth: 220, gap: 8 },
);
```

세로 레이아웃에서는 `x`와 column이 교차 축(cross axis), `y`가 진행 축(flow
axis)입니다. 가로 레이아웃에서는 `y`와 row가 교차 축이고 `x`가 진행
축입니다. `layout.cells`와 `cell.index`는 항상 입력 배열 순서를 유지합니다.

`aspectRatio`는 width / height 비율입니다. 실제 콘텐츠 전체를 측정한 결과는
세로에서 `{ height, forWidth }`, 가로에서 `{ width, forHeight }` 형태의
`resolvedFootprint`로 전달합니다. cross size에 맞지 않는 오래된 footprint는
오류로 처리하지 않고 비율로 계산한 배치 정보로 대체합니다.

`gap`은 별도의 `rowGap`이나 `columnGap`이 없을 때 두 축에 적용됩니다. `fill`과
`cap` sizing, span, preferred lane, locked lane은 모두 논리 규칙으로 처리되며
호출자가 소유한 객체를 변경하지 않습니다.
