# Vibe2 Visual Autonomy Plan

Status: PROPOSED / DOCUMENTED / NOT IMPLEMENTED

목적: Vibe2를 그래픽·애니메이션 자동 개선에 특화하되, 어떤 게임이 들어와도 먼저 게임 특성을 파악하고 그 게임의 정체성·컨셉·장르·플레이 방식에 맞는 시각 언어를 만들고, 안전한 자동수정·검증·학습을 24시간 반복할 수 있는 자율 개선 시스템으로 확장한다.

## 1. 핵심 원칙

1. 게임을 먼저 이해하고 수정한다.
2. 모든 게임에 같은 스타일을 덮어쓰지 않는다.
3. 장르 규칙보다 개별 게임의 고유 정체성이 우선이다.
4. 그래픽 특화이지만 조작감·가독성·성능·모바일·UI·오디오 타이밍·회귀도 함께 본다.
5. 공개 안정판을 직접 무제한 수정하지 않는다. 후보 생성 → 검증 → 채택/폐기 구조를 사용한다.
6. 성공한 수정과 실패한 수정 모두 학습한다.
7. 학습은 권한 확대가 아니라 판단·검증·재사용 품질 강화에 사용한다.
8. 사용자 선호 피드백은 가장 높은 우선순위의 학습 신호로 취급한다.
9. 실제 게임 규칙·저장·진행·경제를 그래픽 개선을 이유로 임의 변경하지 않는다.
10. 자동수정은 항상 원복 가능해야 한다.

## 2. 전체 엔진 구조

```text
Vibe Visual Intelligence Engine
        ↓
 ┌────────────────┬────────────────┬──────────────────┐
 Graphics Evolution  Motion Engine   Scene/Presentation
 └────────────────┴────────────────┴──────────────────┘
        ↓
 Visual QA / Readability / Performance
        ↓
 Learning Memory / Failure Memory
        ↓
 Autopilot Scheduler
        ↺
```

## 3. Vibe Visual Intelligence Engine

상위 판단 엔진. 어떤 게임이 들어와도 먼저 게임 자체를 분석한다.

### 입력
- 게임 코드와 구조
- 플레이 화면/스크린샷
- UI 구조
- 캐릭터·적·보스·맵 구성
- 플레이 흐름과 핵심 루프
- 현재 그래픽/애니메이션 상태
- 모바일 입력 구조
- FPS·성능·로딩 정보
- 기존 아트북/컨셉/대표 이미지가 있으면 함께 사용

### 자동 추출 항목
- 장르
- 시점
- 핵심 재미
- 핵심 루프
- 전투/탐험/수집/방어/전략 비중
- 세계관과 분위기
- 플레이 속도
- 화면 정보량
- 타격감 필요 수준
- 캐릭터 중요도
- 배경 중요도
- UI 중요도
- 보스/대표 장면 중요도
- 모바일 가독성 요구
- 게임 고유 특징

### 출력
`Game Identity Profile`
- identitySentence
- genre
- camera/view
- coreLoop
- visualPriority
- mood
- pacing
- playerAttentionTargets
- signatureSystems
- signatureScenes
- visualRisks
- performanceConstraints
- mobileConstraints

## 4. Visual DNA Generator

게임마다 고유한 그래픽 DNA를 생성한다.

### Visual DNA 항목
- 대표 색상 / 보조 색상 / 금지 색상 조합
- 채도·명도·대비 범위
- 캐릭터 실루엣 방향
- 캐릭터 비율과 형태 언어
- 몬스터 형태 언어
- 배경 밀도
- 배경 깊이
- 지형 형태
- 광원과 그림자 방향
- UI 형태
- 아이콘 스타일
- 폰트 성격
- 이펙트 강도
- 파티클 밀도
- 애니메이션 속도감
- 공격/피격/보상 연출 강도
- 카메라 반응 강도
- 보스 연출 수준
- 사운드-화면 동기화 성격
- 금지 스타일

Visual DNA는 “예쁘게”가 아니라 “이 게임답게”를 판정하는 기준으로 사용한다.

## 5. Graphics Evolution Engine

실제 그래픽 자동수정 후보를 만든다.

### 수정 범위
- 캐릭터
- 몬스터
- 보스
- 배경
- 지형
- 환경 오브젝트
- UI/HUD
- 아이콘
- 색감
- 조명
- 명암
- 실루엣
- VFX
- 파티클
- 화면 구성
- 카메라 프레이밍

### 자동 후보
- A: 안전한 개선
- B: 중간 수준 개선
- C: 공격적인 개선

각 후보는 반드시 아래를 가진다.
- 문제
- 수정 이유
- 예상 효과
- Visual DNA 영향
- 성능 비용
- 모바일 영향
- 원복 가능 여부
- 책임 파일

## 6. Motion Engine

애니메이션과 체감 피드백 전담.

### 분석 대상
- idle
- 이동
- 공격
- 피격
- 사망
- 스킬
- 보스 등장
- 보스 강공
- 레벨업
- 보상 획득
- UI 전환

### 타격감 기본 분석 축
- anticipation
- impact
- recoil
- recovery

### 추가 요소
- hit stop
- flash
- knockback
- camera shake
- zoom
- easing
- follow-through
- animation readability

캐릭터 체형·성격·무기·전투속도에 따라 같은 모션을 재사용하지 않고 `Animation Personality`를 생성한다.

## 7. Scene & Presentation Engine

한 장면 전체의 시각 전달력을 관리한다.

### 역할
- 캐릭터와 배경 분리
- 주요 오브젝트 시선 유도
- 화면 정보량 관리
- 전투/탐험/보상 장면별 카메라 구성
- 보스 존재감
- 지역 전환 연출
- UI 우선순위
- 배경 깊이
- 색상 균형
- 대표 장면 품질

## 8. Graphic Issue Detector

24시간 자율 작업을 위해 먼저 문제를 자동 탐지한다.

### 탐지 예
- 색 대비 부족
- 캐릭터/적/배경 구분 실패
- UI 너무 작음
- 모바일 버튼 가독성 부족
- 화면 과밀
- 화면이 지나치게 비어 있음
- 에셋 스타일 불일치
- 버튼 우선순위 불명확
- 보스 존재감 부족
- 이펙트 과다/부족
- 조명이 플레이를 방해
- 애니메이션이 너무 짧거나 느림
- 동일 게임 내 스타일 드리프트
- 중요 정보가 효과에 가려짐

각 문제는 severity, confidence, affectedArea, responsibleFiles, expectedGain을 가진다.

## 9. Style Drift Detector

시간이 지나면서 같은 게임 안의 캐릭터·배경·UI·VFX가 서로 다른 게임처럼 변하는 것을 탐지한다.

비교 대상:
- Visual DNA
- 대표 스크린샷
- 이전에 검증된 화면
- 아트북/컨셉
- 최근 수정 후보

## 10. Visual Reference Memory

게임별로 검증된 대표 화면과 성공한 스타일 결정을 저장한다.

용도:
- 새 장면과 기존 베스트 장면 비교
- 스타일 유지
- 색감·UI·캐릭터 일관성 검사
- 성공한 시각 패턴 재사용

## 11. Camera Director Engine

장르와 상황에 따라 카메라를 자동 평가·조정한다.

대상:
- 전투
- 탐험
- 보스
- 보상
- 컷신
- UI 집중 구간

판정:
- 거리
- 줌
- 화면 흔들림
- 포커스
- 추적 속도
- 안전 영역
- 모바일 화면 크기

## 12. Readability Heatmap

화려함이 아니라 플레이 전달력을 평가한다.

주요 대상:
- 플레이어
- 적
- 탄환
- 위험지역
- 아이템
- 상호작용 오브젝트
- 버튼
- 체력/스킬 정보

출력:
- visibility score
- overlap risk
- contrast score
- attention conflict
- mobile readability

## 13. Boss Presentation Engine

보스 전용 시각 품질 엔진.

검사:
- 일반몹과 실루엣 차이
- 등장 연출
- 공격 예고
- 위험 가독성
- 체력 UI
- 사운드/VFX
- 카메라
- 페이즈 전환 표현
- 대표 장면 가치

## 14. Progression Visualizer

플레이어가 강해졌는데 외형·연출은 그대로인 문제를 탐지한다.

표현 후보:
- 장비 변화
- 오라
- 스킬 이펙트
- UI
- 자세
- 공격 궤적
- 보상 연출

게임 규칙 수치는 변경하지 않고 “성장 체감의 시각화”를 담당한다.

## 15. Biome Identity Engine

지역을 색상만 바꾼 복제품으로 만들지 않는다.

지역별 분석/생성:
- 색감
- 지형 형태
- 광원
- 오브젝트 밀도
- 파티클
- 적 실루엣
- 환경 모션
- 사운드 성격
- 화면 깊이

## 16. Adaptive UI Engine

장르·상황·플레이 속도에 따라 UI 밀도를 조절한다.

원칙:
- 평시에는 최소화 가능
- 전투에서는 필요한 정보 우선
- 모바일 터치 영역 보장
- 중요 버튼이 VFX에 묻히지 않음
- 게임 고유 UI 스타일 유지

## 17. Animation Personality Engine

캐릭터마다 별도의 모션 언어를 만든다.

고려 요소:
- 체형
- 무게
- 성격
- 직업
- 무기
- 이동 속도
- 공격 의도
- 감정

목표: 동일 walk/attack template 반복을 방지한다.

## 18. Audio-Visual Sync Engine

화면 효과와 사운드 타이밍을 함께 평가한다.

대상:
- 공격
- 피격
- 스킬
- UI 클릭
- 레벨업
- 보상
- 보스 등장

검사:
- impact sync
- delay
- over-stimulation
- missing feedback
- repetition

## 19. Screenshot Critic

일정 주기마다 대표 플레이 화면을 한 장의 게임 스크린샷으로 평가한다.

평가 축:
- 구도
- 시선 집중
- 색상 균형
- 혼잡도
- 중요 대상 가독성
- 게임 정체성
- 대표 장면 가치
- 모바일 화면 적합성

## 20. Asset Reuse Intelligence

기존 자산을 무조건 교체하지 않는다.

전략:
- KEEP
- ENHANCE
- COMBINE
- REPLACE

평가 요소:
- Visual DNA 적합도
- 라이선스
- 성능
- 품질
- 재사용 비용
- 스타일 일관성

## 21. Performance-Aware Beauty

그래픽 품질과 성능을 같이 최적화한다.

수정 후 반드시 확인:
- FPS
- 메모리
- 로딩
- 모바일 발열/부하 가능성
- 파티클 비용
- 캔버스/DOM 비용
- 애니메이션 비용

예뻐졌지만 성능이 크게 떨어지면 실패 후보로 처리한다.

## 22. Visual A/B Tournament

한 번의 A/B만으로 끝내지 않고 여러 후보를 작은 토너먼트로 비교할 수 있다.

예:
A/B/C → 1차 평가 → 상위 2개 → 2차 평가 → 승자 → 회귀검사 → 채택 후보

무한 세대 반복은 금지하고 작업 예산과 개선폭 기준으로 중단한다.

## 23. Failure Memory

실패를 삭제하지 않는다.

저장 예:
- 특정 장르에서 화면 흔들림 과다
- 특정 게임에서 조명 강화가 시인성 악화
- 특정 모바일 UI에서 버튼 축소가 오입력 증가
- 특정 VFX가 FPS 저하

실패 패턴은 다음 후보 생성 시 감점 또는 금지 조건으로 사용한다.

## 24. Human Preference Learning

사용자가 직접 선택한 결과를 가장 높은 우선순위 선호 데이터로 저장한다.

예:
- A가 B보다 좋다
- 이 색감 유지
- 이 정도 이펙트가 좋다
- 캐릭터를 더 단순하게
- UI는 이 스타일 유지

단, 개인 선호가 게임 고유 컨셉을 파괴하면 둘 사이의 충돌을 표시하고 자동 강행하지 않는다.

## 25. Visual Aging Detector

오래된 UI/그래픽 패턴을 탐지하지만 유행 자체를 목표로 삼지 않는다.

판단 기준:
- 가독성
- 조작성
- 현재 플랫폼 기대치
- 게임 정체성
- 성능

## 26. Polish Budget Manager

24시간 작업에서 한 게임/한 화면만 무한 수정하지 않도록 개선 효율을 계산한다.

우선순위 점수 예:
`expectedQualityGain × confidence × playerImpact ÷ risk ÷ cost`

관리:
- 게임별 수정 예산
- 하루 후보 수
- 연속 실패 제한
- 연속 미미한 개선 제한
- 고위험 작업 자동 중단

## 27. Visual Director Memory

그래픽 자율학습의 핵심 장기 기억.

함께 저장:
1. 게임 Visual DNA
2. 검증된 대표 화면
3. 성공 패턴
4. 실패 패턴
5. 사용자 선호
6. 장르 경험
7. 성능 제약
8. 모바일 제약

새 작업에서는 이 메모리를 검색해 유사 사례를 가져오고 후보 우선순위를 조정한다.

## 28. Learning Engine

모델 자체 재훈련이 아니라 검증된 경험 기반 자가개선 시스템을 기본으로 한다.

### 학습 레코드
- gameIdentity
- visualDNA
- issueType
- changeType
- candidate
- expectedGain
- actualGain
- beforeScore
- afterScore
- success/failure
- failureReason
- performanceDelta
- mobileResult
- regressionResult
- userPreference
- reusableWhen
- doNotUseWhen
- evidence

### 학습 방식
- 성공률 기반 패턴 가중치
- 실패 패턴 감점
- 유사 게임/유사 문제 검색
- 장르별 경험 보조
- 개별 게임 경험 최우선
- 사용자 선택 가중치 최상위

## 29. 장르별 패턴 학습

지원 범주는 고정 목록이 아니라 확장 가능해야 한다.

초기 예:
- RPG
- 액션
- 생존
- 디펜스
- 전략
- 슈팅
- 퍼즐
- 카드
- 방치
- 시뮬레이션
- 레이싱
- 로그라이크

장르 패턴은 초기 힌트일 뿐 최종 판단은 Game Identity Profile과 Visual DNA가 우선한다.

## 30. 24시간 Autopilot Loop

```text
ANALYZE GAME
→ BUILD/REFRESH IDENTITY
→ BUILD/REFRESH VISUAL DNA
→ DETECT VISUAL ISSUES
→ PRIORITIZE
→ CREATE A/B/C CANDIDATES
→ APPLY TO SANDBOX/CANDIDATE
→ PLAY/RUNTIME OBSERVE
→ SCREENSHOT/READABILITY QA
→ PERFORMANCE QA
→ MOBILE QA
→ REGRESSION QA
→ ADOPT / REVISE / REJECT / ROLLBACK
→ WRITE LEARNING RECORD
→ UPDATE MEMORY WEIGHTS
→ NEXT TASK
```

## 31. 자동 허용 범위

기본 SAFE/NORMAL 후보:
- 색감
- 대비
- UI 정렬/여백/크기
- 화면 구성
- 비파괴적 이펙트
- 애니메이션 타이밍
- 배경 보강
- 시인성
- 카메라 미세조정
- 그래픽 품질 개선
- 기존 에셋 ENHANCE/COMBINE 후보

## 32. 제한/상위 게이트 범위

자동으로 강행하지 않음:
- 핵심 전투 규칙 변경
- 저장 구조 변경
- 성장 구조 변경
- 경제/보상 구조 변경
- 게임 정체성 자체 변경
- 대규모 콘텐츠 삭제
- 공개판 자동 승격
- 라이선스 불명 에셋 사용
- 성능 저하가 큰 그래픽 변경
- 되돌릴 수 없는 변경

## 33. 자동 채택 조건

후보가 자동 채택 후보가 되려면 최소:
- Visual DNA 적합
- Game Identity 유지 또는 강화
- 가독성 악화 없음
- 모바일 악화 없음
- 성능 기준 통과
- 회귀검사 통과
- 저장/진행 영향 없음
- 책임 파일 증명
- 원복 체크포인트 존재

## 34. 자율학습 성숙도 단계

### L1 관찰
문제 탐지와 기록만.

### L2 추천
수정 후보를 제안하지만 적용하지 않음.

### L3 안전 자동수정
SAFE 범위만 후보판에 자동 적용.

### L4 검증형 자율개선
후보 생성 → 검증 → 자동 채택/폐기.

### L5 장기 자율학습
유사 사례 검색, 성공률 가중치, 실패 메모리, 사용자 선호를 이용해 24시간 우선순위까지 스스로 조정.

## 35. 구현 우선순위

1. Game Identity Analyzer
2. Visual DNA Generator
3. Graphic Issue Detector
4. Visual Director Memory / Learning Engine
5. Graphics Evolution Engine
6. Motion/Animation Personality Engine
7. Scene & Presentation / Camera / Boss / Biome
8. Readability Heatmap / Screenshot Critic
9. Performance-Aware Beauty / Mobile QA
10. A/B Tournament / Polish Budget Manager
11. 24h Autopilot Scheduler

## 36. 기존 Vibe2와의 관계

기존 Vibe2의 분석·후보·검증·회귀·체크포인트·경험치 구조를 버리지 않는다.

새 기능은 기존 구성 요소 위에 시각 특화 계층을 추가한다.
- vibe-quality-intelligence: 검증/회귀 기반
- vibe-visual-autopilot: 자율 시각 작업 기반
- vibe-visual-quality-gate: 시각 게이트 기반
- vibe-motion-effects-director: 모션/VFX 기반
- vibe-presentation-director: 장면 표현 기반
- vibe-environment-director: 환경 기반
- vibe-character-design-director: 캐릭터 디자인 기반
- department-experience: 검증 경험 누적 기반

새 상위 핵심 개념:
- `Vibe Visual Intelligence Engine`
- `Game Identity Profile`
- `Visual DNA`
- `Visual Director Memory`
- `Learning Pattern Weights`

## 37. 구현 전 질문 게이트

이 문서는 방향 확정용이며 코드 구현을 시작하지 않는다.

실제 구현 전에 사용자에게 반드시 아래를 확인한다.
1. 24시간 자동수정을 어느 단계(L1~L5)까지 허용할지
2. SAFE 변경을 후보판에 자동 적용할지, 모든 적용 전 승인을 받을지
3. 사용자 취향 학습을 게임별로만 쓸지, 전 게임 공통 선호로도 쓸지
4. 학습 메모리를 GitHub 파일로 영구 저장할지, 런타임 상태로 둘지
5. 하루/게임별 자동 실험 한도와 중단 조건

사용자 답변 전에는 구현 코드 변경을 시작하지 않는다.
