# 가로 레이아웃

가로 masonry에서는 논리 row가 cross-axis lane이고 `x`가 flow 좌표입니다.

```ts
import { calculateHorizontalMasonryLayout } from "grid-masonry-core";

const result = calculateHorizontalMasonryLayout(
  [{ id: "one", aspectRatio: 3 / 2 }],
  { containerHeight: 600, minRowHeight: 180, gap: 8 },
);
```

가로 item은 `rowSpan`, `preferredRow`, `lockedRow`를 사용하고 footprint는
`{ width, forHeight }`를 사용합니다. `flowDirection: "reverse"`는 x만,
`crossDirection: "reverse"`는 y만 투영합니다. source order와 논리 lane은
바뀌지 않습니다.
