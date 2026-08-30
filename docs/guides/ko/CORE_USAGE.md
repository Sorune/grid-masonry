# Core 사용법

`grid-masonry-core`는 DOM이나 이미지를 읽지 않는 순수 TypeScript geometry
패키지입니다. 입력 배열과 옵션은 변경되지 않으며 결과는 컨테이너 기준
논리 좌표로 반환됩니다.

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

세로 레이아웃은 `x`/column이 cross axis이고 `y`가 flow axis입니다. 가로
레이아웃은 `y`/row가 cross axis이고 `x`가 flow axis입니다. `cells`와
`cell.index`는 항상 입력/source 순서를 유지합니다.

`aspectRatio`는 width / height입니다. 측정된 전체 콘텐츠는 세로에서
`{ height, forWidth }`, 가로에서 `{ width, forHeight }` 형태의
`resolvedFootprint`로 전달합니다. cross size가 맞지 않는 오래된 footprint는
오류가 아니라 ratio 기반 geometry로 대체됩니다.

`gap`은 별도 `rowGap`/`columnGap`이 없을 때 두 축에 적용됩니다. `fill`과
`cap` sizing, alignment, span, preferred/locked lane은 모두 논리 규칙이며
호출자 객체를 변경하지 않습니다.
