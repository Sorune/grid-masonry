# 고급 레이아웃

세로 hint는 `columnSpan`, `preferredColumn`, `lockedColumn`이고 가로 hint는
각각 `rowSpan`, `preferredRow`, `lockedRow`입니다. span은 연속 lane을
차지하며 lane 수보다 크면 현재 전체 lane으로 정규화됩니다.

preferred lane은 soft intent입니다. locked lane은 lane 수와 span에 맞춰
정규화되는 hard logical lane intent이지만 충돌을 허용하지는 않습니다.

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

`ReservedRegion`은 `{ laneStart, laneSpan, flowStart, flowSize }` 논리
좌표입니다. hard occupied space이며 cell로 반환되지 않습니다. 겹치는
region과 배열 순서는 geometry를 바꾸지 않습니다.

`flowTolerance`는 minimum flow offset 근처의 lane 선택만 넓힙니다. 좌표를
반올림하거나 gap을 줄이거나 overlap을 허용하지 않습니다. `flowDistribution`
은 `start`, `end`, `center`, `space-between`, `space-evenly`이며 flow 축에
적용됩니다.
