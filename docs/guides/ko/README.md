# 문서 안내

이 문서는 frozen P1–P19 구현을 설명합니다. 단계 번호는 개발 이력이며
사용자가 이해해야 할 API 모델이 아닙니다.

- [최종 아키텍처](../../ARCHITECTURE.md)
- [Core 사용법](CORE_USAGE.md)
- [가로 레이아웃](HORIZONTAL_LAYOUT.md)
- [고급 레이아웃](ADVANCED_LAYOUT.md)
- [상태·스냅샷·안정적 재배치](STATE_AND_CHECKPOINTS.md)
- [진단·쿼리·가상화](DIAGNOSTICS_AND_QUERIES.md)
- [React 사용법](REACT_USAGE.md)
- [Browser 사용법](BROWSER_USAGE.md)
- [제한사항·현재 상태](LIMITATIONS.md)

영문 문서와 동일하게 Core는 결정적 geometry와 논리 배치를 소유하고,
호스트는 DOM, CSS, 측정 조정, 스크롤, 텍스트/접근성 정책을 소유합니다.

자세한 [변경 요약](../../MIGRATION.md)과 [출시 노트 초안](../../RELEASE_NOTES_DRAFT.md)도
참조할 수 있습니다. 버전은 아직 정해지지 않았고 게시되지 않았습니다.
