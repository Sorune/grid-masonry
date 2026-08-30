# 문서 안내

이 문서는 frozen public 구현과 지원하는 capability를 설명합니다.

- [최종 아키텍처](../../ARCHITECTURE.md)
- [Core 사용법](CORE_USAGE.md)
- [가로 레이아웃](HORIZONTAL_LAYOUT.md)
- [고급 레이아웃](ADVANCED_LAYOUT.md)
- [상태·스냅샷·안정적 재배치](STATE_AND_CHECKPOINTS.md)
- [진단·쿼리·가상화](DIAGNOSTICS_AND_QUERIES.md)
- [React 사용법](REACT_USAGE.md)
- [Browser 사용법](BROWSER_USAGE.md)
- [제한사항·현재 상태](LIMITATIONS.md)
- [감사 및 개발 공개](ACKNOWLEDGEMENTS.md)
- [테스트](../../TESTING.md)

영문 문서와 동일하게 Core는 결정적 geometry와 논리 배치를 소유하고,
호스트는 DOM, CSS, 측정 조정, 스크롤, 텍스트/접근성 정책을 소유합니다.

자세한 [변경 요약](../../MIGRATION.md)과 [0.3.0 출시 노트](../../RELEASE_NOTES_0.3.0.md)도
참조할 수 있습니다. npm package는 게시 및 registry 검증이 완료되었으며,
최종 tag와 GitHub Release, production website 배포는 별도의 pending 단계입니다.
