# 문서 안내

이 문서는 grid-masonry의 확정된 구현과 지원 기능을 설명합니다.

- [최종 아키텍처](../../ARCHITECTURE.md)
- [Core 사용법](CORE_USAGE.md)
- [가로 레이아웃](HORIZONTAL_LAYOUT.md)
- [고급 레이아웃](ADVANCED_LAYOUT.md)
- [상태·스냅샷·안정적 재배치](STATE_AND_CHECKPOINTS.md)
- [진단·질의·가상화](DIAGNOSTICS_AND_QUERIES.md)
- [React 사용법](REACT_USAGE.md)
- [Browser 사용법](BROWSER_USAGE.md)
- [제한사항·현재 상태](LIMITATIONS.md)
- [감사 및 개발 공개](ACKNOWLEDGEMENTS.md)
- [테스트](../../TESTING.md)

Core는 결정적 배치 계산과 논리적 배치를 담당하고, host는 DOM, CSS, 측정
조정, 스크롤, 텍스트 방향, 접근성 정책을 담당합니다. 입력 배열이 canonical
순서이며, 방향 옵션이 source 또는 DOM 순서를 바꾸지는 않습니다.

자세한 [변경 요약](../../MIGRATION.md)과 [0.3.0 출시 노트](../../RELEASE_NOTES_0.3.0.md)도
참조할 수 있습니다. `0.3.0` npm package는 게시 및 registry 검증이
완료되었습니다. 공식 사이트 배포와 production browser smoke도 완료되었습니다.
Git tag와 GitHub Release의 현재 상태는 각 release 문서에서 확인할 수 있습니다.
