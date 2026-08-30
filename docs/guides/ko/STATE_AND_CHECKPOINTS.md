# 상태, 스냅샷, 안정적 재배치

`createMasonryState`는 `append`, `update`, `remove`, `reorder`, `resize`,
`inspect`, `snapshot`, `restore`를 제공합니다. 단순한 일부 append는
incremental 경로를 사용할 수 있지만, 복잡한 옵션에서는 전체 계산으로
안전하게 전체 계산으로 전환할 수 있습니다. 실패한 작업은 items, options, layout을
부분적으로 변경하지 않습니다.

스냅샷은 동일한 의미의 입력 상태에서 재사용할 수 있는 검증된
배치 캐시 checkpoint입니다. `undo`, history, time travel이 아닙니다.
오래된 입력 상태나 변조된 geometry를 복원하려 하면 원자적으로
거부됩니다. A에서 B로 갔다가 semantic하게 정확히 A로 돌아오면 기존
checkpoint가 다시 유효해질 수 있습니다.

`reflowStrategy`는 `"compact" | "stable"`입니다. stable은 유효한 compact
후보와 retained-lane 후보를 실제 물리 좌표의 이동량(displacement)으로 비교합니다.
비교 순서는 total displacement, maximum displacement, moved count이며,
동률이면 compact가 우선합니다. 기존에 명시한 lock은 유지되고 내부
retention hint는 임시로만 사용됩니다.

`calculateFlowAnchorDelta`는 같은 축에서 발생한 geometry의 진행 축 delta만
반환합니다. 스크롤을 변경하지 않으며, 이를 적용할지는 host가 결정합니다.
