# Browser 어댑터 사용법

`grid-masonry-browser`는 특정 프레임워크에 의존하지 않는 DOM 어댑터입니다.
호스트 애플리케이션이 전달한 항목을 Core 형식으로 정규화하고, Core가
반환한 좌표를 DOM 요소에 적용하며, 같은 항목의 요소를 안정적으로
재사용합니다. 배치 계산, 스크롤 감시, 실제 콘텐츠, DOM 방향 정책은
어댑터의 책임이 아닙니다.

## 생명주기 경계

호스트 애플리케이션은 항목의 ID와 콘텐츠를 제공하고 생명주기 콜백을
받습니다. 콘텐츠는 그대로이고 레이아웃만 바뀌면 기존 요소를 재사용해
위치와 크기만 갱신합니다. 콘텐츠가 바뀌면 `updateItem`을 호출할 수
있습니다. 가상화 범위에서 빠진 항목은 제거되며,
`controller.dispose()`는 여러 번 호출해도 안전합니다. 어댑터가 등록한
측정을 위해 등록한 관찰자와 이벤트 수신기도 생명주기가 끝날 때
정리됩니다.

항목의 실제 크기를 측정할 때는 자연스러운 콘텐츠 영역을 사용해야 합니다.
절대 위치를 담당하는 바깥 컨테이너를 측정 대상으로 사용하면 안 됩니다.
배치 좌표를 결정하는 유일한 주체는 Core입니다.

## 가상화

`createVirtualizedMasonryGrid`는 Core 레이아웃과 호스트가 제공한 진행 범위,
화면 밖 여유 범위인 overscan을 사용합니다. `createMasonryGrid`는 세로 레이아웃을,
`createHorizontalMasonryGrid`는 가로 레이아웃을 다룹니다. 관리되는 셀의
ID와 `index`는 입력 항목과 같은 정체성을 유지합니다.

어댑터는 화면에 보이는 순서에 맞추려고 DOM 자식 요소를 재배열하지 않으며
스크롤도 변경하지 않습니다.

정확한 옵션과 콜백 형식은 패키지의 타입 선언인
`BrowserMasonryGridOptions`, `BrowserHorizontalMasonryGridOptions`,
`BrowserVirtualizedMasonryGridOptions`에서 확인할 수 있습니다.
