# React Web 사용법

`grid-masonry-react`는 `MasonryGrid`, `HorizontalMasonryGrid`, layout hook,
`useOrderList`, `useVirtualizedMasonryCells`를 제공합니다. Core geometry를
사용하고 React lifecycle과 CSS 연결을 담당하지만, 배치를 다시 계산하거나
스크롤을 소유하지는 않습니다.

```tsx
import { MasonryGrid } from "grid-masonry-react";

<MasonryGrid
  items={photos}
  getId={(photo) => photo.id}
  getAspectRatio={(photo) => photo.width / photo.height}
  minColumnWidth={240}
  gap={8}
  renderItem={({ item }) => <PhotoCard photo={item} />}
/>;
```

`itemMeasurement={{ enabled: true }}`를 사용하면 어댑터가 자연스러운 전체
콘텐츠 영역을 측정해 footprint를 전달할 수 있습니다. 절대 위치 shell을
콘텐츠 측정값으로 사용하지 마십시오. 안정적인 key를 사용하고 children을
역순으로 만들거나 DOM `dir`을 자동으로 설정하지 마십시오. 접근성, 텍스트
방향, 스크롤 정책은 host가 결정합니다.
