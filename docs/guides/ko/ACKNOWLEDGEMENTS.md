# 감사의 말과 개발 공개

## 선행 사례와 비교 자료

grid-masonry는 동일한 입력에 같은 결과를 내는 배치 계산(deterministic
geometry), 동적 측정, 공간 질의, 대규모 목록 처리를 설계하면서 masonry 및
virtualization 생태계를
검토했습니다. 여기서 다른 프로젝트를 언급하는 것은 연구·비교 대상으로
살펴보았다는 뜻입니다. 별도로 명시하지 않는 한 소스 코드를 복사했거나
fork했다는 뜻이 아니며, 해당 프로젝트나 유지관리자의 보증을 의미하지도
않습니다.

## 검토한 통합 대안

Embla Carousel, Swiper, Keen Slider는 가로 레이아웃에서 viewport와 스크롤,
그리고 배치 계산의 소유권 경계를 정하는 과정에서 검토했습니다. 이들은
grid-masonry의 실행 시 의존성으로 채택하지 않았습니다. 각 프로젝트의
유지관리자와 기여자에게 감사드리지만, 이 언급이 endorsement를 뜻하는 것은
아닙니다.

## 독립적인 구현

grid-masonry는 플랫폼 독립적인 geometry Core와 React 및 Browser adapter를
분리하는 구조로 독립적으로 설계했습니다. Core에는 실행 시 의존성이
없으며, 다른 프로젝트의 배치 또는 carousel 구현을 포함하지 않습니다.

## 개발 투명성

grid-masonry의 구현, 테스트, 문서 작성, 분석, 검토 및 orchestration 과정에는
AI-assisted engineering tools가 사용되었습니다. AI가 제안하거나 생성한
내용은 engineering input으로만 다루었고 acceptance authority로 사용하지
않았습니다. 공개 contract, architecture boundary, 테스트 기준,
feature-freeze와 release 결정은 사람이 주도했으며 repository source와
테스트 결과를 바탕으로 검증했습니다. 게시된 소프트웨어와 release에 대한
최종 책임은 project maintainer에게 있습니다.

## Third-party software 및 고지

배포 package와 site를 감사한 결과, 복사한 third-party source나 bundled
asset, 별도의 attribution notice가 필요한 항목은 발견되지 않았습니다.
개발 환경이나 host project에서 사용하는 실제 dependency에는 각 라이선스와
고지 의무가 적용됩니다.
