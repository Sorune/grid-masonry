# 제한사항과 현재 상태

- Core는 DOM, CSS, scroll, text/locale 방향, 접근성, animation, image loading,
  product semantics를 소유하지 않습니다.
- `crossDirection`은 교차 축의 위치를 투영하는 옵션이며 자동 RTL이 아닙니다.
- input, cells, DOM 순서를 재배열하지 않습니다. dense/backfill과
  `placementMode` API는 제공하지 않습니다.
- preferred lane은 soft intent이고 locked lane은 논리적 레인 제약입니다.
- 일부 state/configuration은 안전하게 전체 재계산으로 전환될 수 있습니다.
- reserved region이 많아지면 장애물 처리 비용이 증가합니다.
- 진단은 opt-in 파생 관찰이며 state에 log를 저장하지 않습니다.
- React Native 지원은 deferred 상태입니다.

현재 feature 구현은 확정되어 있습니다. `0.3.0` package는 MIT 라이선스와
정확한 Core dependency로 게시되었고 registry 검증도 완료되었습니다. 공식
사이트 배포와 production browser smoke도 완료되었습니다. Git tag와 GitHub
Release는 마지막 release 절차로 남아 있습니다.

MIT © 2026 Sorune.

## 감사의 말과 개발 공개

표준 masonry, TypeScript, npm, React, browser platform 패턴은 API와 architecture
경계를 평가하기 위한 비교 자료로 검토했습니다. 별도로 명시하지 않는 한 이는
소스 복사, 제3자 asset 사용, endorsement 또는 근거 없는 lineage를 뜻하지
않습니다. 실제 dependency에는 각 라이선스와 고지 의무가 적용됩니다.

AI-assisted engineering tools는 구현, 테스트, 문서 작성, 분석, 검토 및
orchestration을 지원했습니다. architecture, public contract, acceptance,
maintenance, release 결정의 책임은 사람인 project ownership에 있습니다.
