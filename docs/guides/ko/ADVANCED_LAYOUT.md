# 고급 레이아웃

이 문서의 옵션은 모두 Core가 제공하는 범용 기능이며 필요할 때만 사용합니다.

## span과 레인

```ts
const item = {
  id: "featured",
  aspectRatio: 16 / 9,
  layoutHint: {
    columnSpan: 2,
    preferredColumn: 1,
  },
};
```

세로 레이아웃에서는 `columnSpan`, `preferredColumn`,
`lockedColumn`을 사용합니다. 가로 레이아웃에서는 각각 `rowSpan`,
`preferredRow`, `lockedRow`를 사용합니다. span은 서로 이어진 논리
레인(lane)을 차지합니다. 요청한 span이 현재 레인 수보다 크면 사용할 수
있는 전체 레인 수로 정규화되며, 호출자가 전달한 객체는 바뀌지 않습니다.

`preferredColumn`과 `preferredRow`는 가능한 경우 우선적으로 사용할
레인을 지정합니다. 해당 레인이 유효한 배치 후보가 아니면 다른 레인에
배치될 수 있으므로 물리 좌표를 보장하지는 않습니다.

`lockedColumn`과 `lockedRow`는 항목을 배치할 논리 레인을 제약합니다.
반응형 레이아웃에서 레인 수가 바뀌면 현재 span과 레인 수에 맞게
정규화됩니다. 고정 레인 제약이 다른 항목이나 예약 영역과의 겹침을
허용하는 것은 아닙니다. 장애물이 있으면 같은 레인에서 진행 축 방향으로
밀려날 수 있습니다.

## 방향

`flowDirection`과 `crossDirection`의 기본값은 모두 `"forward"`입니다.
`flowDirection`은 진행 축만, `crossDirection`은 교차 축만 반전합니다.
논리 레인, span, ID, `index`, 입력 순서는 바뀌지 않습니다. 교차 축 반전은
좌표 투영 방식일 뿐이며 RTL, DOM 방향, 텍스트 방향을 자동으로 설정하지
않습니다.

## 예약 영역

```ts
const options = {
  containerWidth: 960,
  minColumnWidth: 220,
  gap: 8,
  reservedRegions: [
    { laneStart: 0, laneSpan: 2, flowStart: 120, flowSize: 240 },
  ],
};
```

`ReservedRegion`은
`{ laneStart, laneSpan, flowStart, flowSize }` 형식의 논리 좌표로
지정합니다. 항목을 놓을 수 없는 점유 영역이며 GridItem이 아닙니다. 여러
영역이 겹칠 수 있고 배열의 순서를 바꾸어도 배치 결과는 달라지지 않습니다.
같은 레인을 사용하는 항목은 점유 구간과의 진행 축 간격을 지켜야 하며,
예약 영역의 끝점이 전체 레이아웃 범위를 늘릴 수도 있습니다. 예약 영역을
나타내는 가짜 셀이나 ID는 반환하지 않습니다.

## flowTolerance

`flowTolerance`의 기본값은 `0`입니다. 이 값은 최소 진행 오프셋과 가까운
레인을 배치 후보로 인정하는 범위만 넓힙니다.

```text
minimum = 100
candidate = 100.5
flowTolerance = 0.5  -> 후보로 인정
```

후보 범위 안에 `preferredColumn` 또는 `preferredRow`가 있으면 그 레인을
우선합니다. 그렇지 않으면 논리 번호가 가장 작은 레인을 선택합니다. 선택한
레인의 정확한 진행 좌표는 그대로 유지합니다. `flowTolerance`는 좌표를
반올림하거나 간격을 줄이지 않으며 겹침도 허용하지 않습니다.

## flowDistribution

`flowDistribution`은 `start`, `end`, `center`, `space-between`,
`space-evenly` 중 하나입니다. 논리 배치가 끝난 뒤 진행 축에 적용되며,
교차 축 방향과는 독립적입니다. 선호 레인으로 지정한 값을 고정 레인
제약으로 바꾸지도 않습니다.
