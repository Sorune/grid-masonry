# Browser adapter 사용법

`grid-masonry-browser`는 host item을 정규화하고 Core를 호출하며 geometry를
DOM element에 적용하는 framework-independent adapter입니다. placement,
scroll observation, product content, DOM direction은 소유하지 않습니다.

layout만 바뀌면 유지된 element를 재사용하고 geometry만 갱신합니다. content
변경은 `updateItem`을 호출할 수 있고, virtual window를 벗어난 item은
destroy됩니다. controller dispose는 idempotent입니다. 세로/가로 grid와
virtualized grid를 제공하며 element identity와 source order를 유지합니다.

정확한 callback/option 형태는 `BrowserMasonryGridOptions`,
`BrowserHorizontalMasonryGridOptions`, `BrowserVirtualizedMasonryGridOptions`
declaration을 확인하십시오.
