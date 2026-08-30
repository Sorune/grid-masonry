# 제한사항과 현재 상태

- Core는 DOM, CSS, scroll, text/locale 방향, 접근성, animation, image loading,
  product semantics를 소유하지 않습니다.
- `crossDirection`은 cross-axis geometry 투영이며 자동 RTL이 아닙니다.
- input/cells/DOM 순서를 재배열하지 않습니다. dense/backfill과
  `placementMode` API는 없습니다.
- preferred는 soft intent이고 lock은 논리 lane 제약입니다.
- 일부 state/configuration은 전체 재계산으로 fallback합니다.
- 많은 reserved region은 obstacle 처리 비용을 증가시킵니다.
- 진단은 opt-in 파생 관찰이며 state에 log를 저장하지 않습니다.
- React Native는 deferred입니다.

Accepted feature implementation은 frozen 상태입니다. Package는
`0.3.0`, MIT, exact Core dependency로 준비되었지만 npm publish와 registry
clean-consumer 검증은 아직 완료되지 않았습니다. 현재 문서는 게시된
release를 주장하지 않습니다. MIT © 2026 Sorune.

## 감사 및 개발 공개

표준 masonry, TypeScript, npm, React, browser platform 패턴을 API와
architecture 평가를 위한 prior-art로 검토했습니다. 복사한 구현, 제3자
asset, endorsement, 또는 근거 없는 lineage를 주장하지 않습니다. 선언된
dependency에는 각자의 license notice가 적용됩니다.

AI-assisted engineering tool은 implementation, testing, documentation,
review/orchestration을 지원했습니다. Architecture, public contract,
acceptance, maintenance, release decision의 책임은 human project ownership에
있습니다.
