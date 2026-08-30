# Browser adapter 사용법

`grid-masonry-browser`는 호스트 item을 정규화하고 Core를 호출한 뒤 계산된
배치 정보를 DOM element에 적용하는 framework-independent adapter입니다. 배치,
스크롤 관찰, product content, DOM 방향 정책은 어댑터가 소유하지 않습니다.

레이아웃만 바뀐 경우 기존 element를 재사용하고 위치와 크기만 갱신합니다. content가
바뀌면 `updateItem`을 호출할 수 있으며, virtual window 밖으로 나간 item은
destroy됩니다. `controller.dispose()`는 여러 번 호출해도 안전합니다. 세로와
가로 grid, virtualized grid를 지원하며 element identity와 입력 순서를
유지합니다.

정확한 callback과 option 형태는 `BrowserMasonryGridOptions`,
`BrowserHorizontalMasonryGridOptions`, `BrowserVirtualizedMasonryGridOptions`
declaration을 확인하십시오.
