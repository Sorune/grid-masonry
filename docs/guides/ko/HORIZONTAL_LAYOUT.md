# 가로 레이아웃

가로 masonry에서는 논리 row가 교차 축의 레인이고 `x`가 진행 좌표입니다.

```ts
import { calculateHorizontalMasonryLayout } from "grid-masonry-core";

const result = calculateHorizontalMasonryLayout(
  [{ id: "one", aspectRatio: 3 / 2 }],
  { containerHeight: 600, minRowHeight: 180, gap: 8 },
);
```

가로 item은 `rowSpan`, `preferredRow`, `lockedRow`를 사용하고, measured whole-item
footprint는 `{ width, forHeight }` 형태로 전달합니다. `flowDirection:
"reverse"`는 x축만 반전하고 `crossDirection: "reverse"`는 y축만 반전합니다.
입력 순서와 논리 레인 번호는 바뀌지 않습니다.
