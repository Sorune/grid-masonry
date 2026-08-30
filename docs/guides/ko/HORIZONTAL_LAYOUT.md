# 가로 레이아웃

가로 masonry는 세로 배치와 같은 규칙을 축만 바꾸어 적용합니다. 논리적인
row가 교차 축(cross axis)의 레인(lane)이 되고, `x`가 진행 축(flow axis)의
좌표가 됩니다.

```ts
import type { HorizontalGridItem } from "grid-masonry-core";
import { calculateHorizontalMasonryLayout } from "grid-masonry-core";

const items: readonly HorizontalGridItem[] = [
  { id: "one", aspectRatio: 3 / 2 },
  { id: "two", aspectRatio: 2 / 3 },
];

const result = calculateHorizontalMasonryLayout(items, {
  containerHeight: 600,
  minRowHeight: 180,
  rowGap: 12,
  columnGap: 8,
});
```

배치 힌트에는 `rowSpan`, `preferredRow`, `lockedRow`를 사용합니다.
가로 레이아웃에서 실제 측정 크기를 전달할 때는
`{ width, forHeight }` 형식의 `resolvedFootprint`을 사용합니다. 결과
셀은 `row`, `rowSpan`, `x`, `y`, `width`, `height`를 포함하며,
`index`는 입력 순서를 그대로 나타냅니다.

`flowDirection: "reverse"`는 결과 범위 안에서 `x` 좌표만 반전합니다.
`crossDirection: "reverse"`는 `y` 좌표만 반전합니다. 두 옵션은 서로
독립적이며 입력 순서나 논리 레인 번호를 바꾸지 않습니다. 스크롤과
텍스트·DOM 방향은 호스트 애플리케이션이 별도로 결정합니다.
