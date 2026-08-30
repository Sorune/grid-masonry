# 감사 및 개발 공개

## 선행 사례와 비교 자료

이 프로젝트는 결정적 배치, 동적 측정, 공간 질의, 대규모 목록 동작을
정의하는 과정에서 masonry와 virtualization 생태계를 검토했습니다. 별도로
명시하지 않는 한 다른 프로젝트를 언급하는 것은 선행 사례로 연구하거나
비교했다는 뜻이며, grid-masonry가 해당 프로젝트의 소스 코드를 복사했거나
fork했거나 유지관리자의 보증을 받는다는 뜻이 아닙니다.

## 검토한 통합 대안

Embla Carousel, Swiper, Keen Slider는 horizontal geometry, viewport 동작,
host가 소유하는 scrolling의 경계를 정의하는 과정에서 검토했습니다. 이들은
grid-masonry의 production dependency가 아닙니다. 유지관리자와 기여자에게
감사를 표하지만 endorsement를 의미하지는 않습니다.

## 독립적인 구현

grid-masonry는 platform-independent geometry Core와 별도의 React 및 Browser
adapter를 중심으로 독립적으로 설계한 architecture를 따릅니다. Core에는
runtime dependency가 없으며 third-party placement 또는 carousel 구현을
bundling하지 않습니다.

## 개발 투명성

grid-masonry의 implementation, testing, documentation, analysis,
review workflow에는 AI-assisted engineering tool이 사용되었습니다.
AI가 제안하거나 생성한 변경은 acceptance authority가 아니라 engineering
input으로 취급했습니다. Public contract, architecture boundary, test 기준,
feature-freeze 결정, release 결정은 human이 주도했으며 repository source와
test 결과로 검증했습니다. Published software와 release 결정의 책임은
project maintainer에게 있습니다.

## Third-party software와 notice

Repository audit 결과 published package 또는 site에 복사된 third-party
source, bundled asset, 추가 attribution notice 의무는 발견되지 않았습니다.
개발 환경이나 host project에서 사용하는 실제 dependency에는 각자의
license가 적용됩니다.
