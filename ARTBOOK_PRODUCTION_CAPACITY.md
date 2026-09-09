# Vibe2 Artbook Production Capacity

## 목표
아트북 생산량을 늘리되 얕은 문구를 더 많이 만드는 방식은 금지한다. 한 번의 생산 플로어가 Unity 제작에 재사용 가능한 근거·설계·검증 계약을 남기는 것을 생산능력으로 본다.

## 생산 파이프라인
1. **SCAN / FACT PACK** — `tools/artbook-fact-pack.mjs`가 게임 소스를 읽기 전용으로 스캔해 gameplayLoop/input/combat/progression/persistence/uiArt/risk 근거를 구조화한다.
2. **DESIGN / FIVE DEPARTMENTS** — planning/graphics/development/qa/balance가 FACT PACK과 자기 전문 근거를 사용해 독립 제출한다.
3. **CRITIQUE / REWRITE** — 의미 품질 게이트가 placeholder·반복·정보량 부족을 차단한다. 실패 사유는 다음 로컬 모델 재시도 입력에 사용하며 동일한 무근거 문구 반복은 허용하지 않는다.
4. **CROSS REVIEW** — 4개 타 부서 + director가 구체적인 보완점을 남긴다.
5. **PRODUCTION CONTRACT** — 최종 baseline/revision은 KEEP / CHANGE / DROP / UNITY_IMPLEMENTATION_NOTE / UNITY_ART_NOTE / 검증 시나리오를 남긴다.

## FACT PACK 계약
- 사실 추출만 한다. 새 설정이나 수치를 창작하지 않는다.
- Web archive는 읽기 전용이다.
- 기존 승인 baseline을 덮어쓰지 않는다.
- 근거가 없는 영역은 `missingEvidence`로 남긴다.
- 3분류 게임에서도 source를 수정하지 않고 설계 근거로만 사용한다.

## 다음 증설 단계
- department runner가 FACT PACK을 우선 컨텍스트로 소비하도록 연결한다.
- planning에만 있는 semantic retry를 5부서 공통 critique/rewrite 루프로 확장한다.
- `SOURCE_MISSING`, `RUNTIME_TEST_REQUIRED`, `NUMBER_EXTRACTION_REQUIRED`, `DESIGN_DECISION_REQUIRED`, `ASSET_REQUIRED` 원인 코드를 표준화한다.
- 장르 프로필별 질문 세트를 추가하되 공통 게이트와 중복 시스템은 만들지 않는다.
- 2분류 플레이테스트 결과를 revision evidence로 받아 KEEP/CHANGE/DROP과 Unity 계약을 자동 갱신한다.
