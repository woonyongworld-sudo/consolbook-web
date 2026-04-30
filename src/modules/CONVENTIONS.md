# 모듈 구조 컨벤션

이 폴더는 비즈니스 능력(business capability) 단위로 코드를 나눕니다.
기술 레이어(controllers/services/repos)가 아닌 **사업부 단위**로 자릅니다.

## 현재 모듈

- `types/` — 공통 도메인 타입 (모든 모듈이 의존)
- `consolidation/` — 연결정산표 빌더

## 향후 추가 예정

- `extraction/` — 연결패키지 양식에서 데이터 추출
- `validation/` — 정합성 검증
- `settings/` — 마스터·룰·템플릿 관리

## 모듈 내부 구조

각 모듈은 다음 하위 폴더로 구성합니다 (필요한 것만 만듦):

- `domain/` — 순수 로직과 타입 (DB·HTTP·파일 I/O 모름)
- `ui/` — React 컴포넌트
- `index.ts` — public API 게이트

## 모듈 간 출입 규칙 (지금은 컨벤션, 모듈 2개 이상일 때 ESLint로 강제 예정)

- 다른 모듈을 참조할 때는 **`@/modules/<name>` (= 그 모듈의 `index.ts`)만** import.
  내부 파일을 직접 깊이 import하지 말 것.
- 도메인 레이어는 UI를 import하지 않음. 그 반대는 OK.
- 모든 모듈은 `types/`만 자유롭게 의존. 모듈 간 직접 의존은 가능한 피하고, 필요하면 상위 레이어(앱)에서 조립.

## 시연용 데이터

`src/samples/`에 공용으로 보관. 새 모듈이 추가되면 같은 시나리오를 자기 형식으로 변환해서 사용.
