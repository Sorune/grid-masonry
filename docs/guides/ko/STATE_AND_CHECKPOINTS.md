# 상태, 스냅샷, 안정적 재배치

`createMasonryState`는 `append`, `update`, `remove`, `reorder`, `resize`,
`inspect`, `snapshot`, `restore`를 제공합니다. 일부 단순 append는
incremental 경로를 사용하지만 복잡한 옵션은 전체 계산으로 안전하게
fallback합니다. 실패한 변경은 items, options, layout을 부분적으로 바꾸지
않습니다.

스냅샷은 같은 semantic 입력 상태에서 재사용할 수 있는 검증된
placement/cache checkpoint입니다. `undo`, history, time travel이 아닙니다.
오래된 semantic 상태나 변조된 geometry는 원자적으로 거부됩니다. A에서 B로
갔다가 semantic하게 정확히 A로 돌아오면 기존 checkpoint가 다시 유효할 수
있습니다.

`reflowStrategy`는 `"compact" | "stable"`입니다. stable은 compact 후보와
retained-lane 후보 중 유효한 것을 실제 물리 좌표 displacement로 비교합니다:
total, maximum, moved count 순이며 동률이면 compact가 우선합니다. 기존
명시적 lock은 유지되고 내부 retention hint는 임시입니다.

`calculateFlowAnchorDelta`는 같은 축의 geometry flow delta만 반환합니다.
스크롤을 변경하지 않으며 적용 여부는 host가 결정합니다.
