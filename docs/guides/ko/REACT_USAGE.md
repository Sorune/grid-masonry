# React Web 사용법

`grid-masonry-react`는 `MasonryGrid`, `HorizontalMasonryGrid`, 레이아웃
훅, `useOrderList`, `useVirtualizedMasonryCells`를 제공합니다. Core가
계산한 좌표를 React 컴포넌트와 CSS에 적용하지만 배치를 다시 계산하거나
스크롤을 직접 관리하지는 않습니다.

## 세로 레이아웃

```tsx
import { MasonryGrid } from "grid-masonry-react";

<MasonryGrid
  items={photos}
  getId={(photo) => photo.id}
  getAspectRatio={(photo) => photo.width / photo.height}
  minColumnWidth={240}
  gap={8}
  renderItem={({ item }) => <PhotoCard photo={item} />}
/>
```

가로 레이아웃에는 `HorizontalMasonryGrid`를 사용합니다. 세로 레이아웃의
`minColumnWidth` 대신 `minRowHeight`를 사용하고,
`getResolvedFootprint`은 `{ width, forHeight }` 형식의 값을 반환해야
합니다. 레이아웃 훅도 같은 옵션을 사용하며, 측정된 컨테이너의 너비나
높이를 명시적으로 전달받습니다.

## 콘텐츠 측정

어댑터가 항목 전체의 자연스러운 크기를 측정해야 한다면
`itemMeasurement={{ enabled: true }}`를 설정합니다. 호스트 애플리케이션이
콘텐츠를 렌더링하면 어댑터가 그 콘텐츠의 자연스러운 border-box를 측정하고,
Core에는 현재 교차 축 크기에 연결된 `resolvedFootprint`을 전달합니다.
절대 위치를 담당하는 바깥 컨테이너를 콘텐츠 크기로 측정하면 안 됩니다.

SSR이나 첫 렌더링에서도 일정한 초기 크기가 필요하면 `initialWidth` 또는
`initialHeight`를 사용할 수 있습니다.

## 순서, `key`, 방향

React의 `key`에는 안정적인 ID를 사용합니다. Core의 방향 옵션과 관계없이 입력
순서와 `layout.cells`의 순서는 같습니다. 어댑터는 `children` 순서를
뒤집거나 DOM의 `dir`을 설정하지 않고 스크롤도 변경하지 않습니다.
`flowDirection`과 `crossDirection`은 논리 좌표 계산 옵션으로 Core에
전달됩니다. 접근성과 텍스트 방향은 호스트 애플리케이션이 결정합니다.

`useOrderList`는 외부에서 관리하는 `order`와 내부에서 관리하는
`initialOrder` 방식을 모두 지원합니다. `move`, `moveBefore`,
`moveAfter`, `setOrder`, `reset`과 현재 항목 목록에 맞춘 순서 조정을
제공합니다. 훅이 반환한 정렬된 항목을 호스트가 다시 그리드에 전달합니다.

## 가상화

`useVirtualizedMasonryCells({ layout, flowRange, overscan })`는 Core
레이아웃에서 지정한 범위에 필요한 셀만 반환합니다. 진행 범위와 스크롤
정책은 호스트 애플리케이션이 제공하며, 훅은 스크롤을 감시하거나
변경하지 않습니다.
