# 고급 레이아웃

세로 레이아웃에서는 `columnSpan`, `preferredColumn`, `lockedColumn`을
사용하고, 가로 레이아웃에서는 각각 `rowSpan`, `preferredRow`,
`lockedRow`를 사용합니다. span은 서로 이어진 레인(lane)을 차지하며, 현재
레인 수보다 크면 사용할 수 있는 전체 레인으로 정규화됩니다.

preferred lane은 배치를 위한 부드러운 의도(soft intent)입니다. 반면 locked
lane은 레인 수와 span에 맞춰 정규화되는 논리적 제약입니다. 다만 lock이 다른
항목과의 충돌을 허용하는 것은 아니며, 장애물이 있으면 진행 축 방향으로
밀릴 수 있습니다.

```ts
const options = {
  containerWidth: 960,
  minColumnWidth: 220,
  gap: 8,
  reservedRegions: [
    { laneStart: 0, laneSpan: 2, flowStart: 120, flowSize: 240 },
  ],
  flowTolerance: 0.5,
};
```

`ReservedRegion`은 `{ laneStart, laneSpan, flowStart, flowSize }` 형태의
논리 좌표입니다. 항목이 들어갈 수 없는 점유 영역이며 cell로 반환되지
않습니다. 겹치는 region과 입력 배열에서의 순서는 geometry를 바꾸지
않습니다.

`flowTolerance`는 최소 진행 오프셋에 가까운 후보 레인을 선택할 수 있도록
범위만 넓힙니다. 좌표를 반올림하거나 gap을 줄이지 않으며 overlap도
허용하지 않습니다. `flowDistribution`은 `start`, `end`, `center`,
`space-between`, `space-evenly`를 진행 축에 적용합니다.
