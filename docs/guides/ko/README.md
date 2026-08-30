# 한국어 문서 안내

이 문서는 grid-masonry 0.3.0이 제공하는 기능과 사용 범위를 설명합니다.
Core는 입력 항목과 옵션을 바탕으로 배치 좌표를 계산하고, React와 Browser
어댑터는 그 결과를 각 렌더링 환경에 적용합니다.

## 문서 구성

- [아키텍처](../../ARCHITECTURE.md)
- [Core 사용법](CORE_USAGE.md)
- [가로 레이아웃](HORIZONTAL_LAYOUT.md)
- [고급 레이아웃](ADVANCED_LAYOUT.md)
- [상태·스냅샷·안정적 재배치](STATE_AND_CHECKPOINTS.md)
- [진단·질의·가상화](DIAGNOSTICS_AND_QUERIES.md)
- [React 사용법](REACT_USAGE.md)
- [Browser 사용법](BROWSER_USAGE.md)
- [제한사항과 현재 상태](LIMITATIONS.md)
- [감사의 말과 개발 과정 공개](ACKNOWLEDGEMENTS.md)
- [테스트 안내](../../TESTING.md)

## 역할 구분

Core는 동일한 입력에 항상 같은 결과를 내는 배치 계산과 논리 좌표를
담당합니다. 호스트 애플리케이션은 DOM과 CSS 렌더링, 콘텐츠 측정 연동,
스크롤, 텍스트 방향, 접근성 정책을 담당합니다. Core는 이러한 환경별 정책을
직접 결정하지 않습니다.

입력 배열의 순서가 배치의 기준 순서입니다. `layout.cells`와
`cell.index`도 이 순서를 유지합니다. `flowDirection`이나
`crossDirection`을 바꾸어도 입력 순서나 DOM 순서가 뒤집히지는 않습니다.

## 출시 상태

Core, React, Browser 패키지 0.3.0은 npm에 공개되었으며 새 프로젝트에서
설치·실행 검증을 마쳤습니다. 공식 사이트와 GitHub Release도 공개되어
있습니다.

- [변경 요약](../../MIGRATION.md)
- [0.3.0 출시 노트](../../RELEASE_NOTES_0.3.0.md)
- [공식 사이트](https://grid-masonry.sorune.org/)
- [GitHub 릴리스](https://github.com/Sorune/grid-masonry/releases/tag/v0.3.0)
