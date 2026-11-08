# Roblox Common Rig Kit v1

뼈(Bone) 리그 몹의 자세·모션·표현 공용 규칙. 새 도형이나 파츠를 만들지 않는 순수 계산 모듈이다.

- `RobloxCommonRigKit.luau`: 뼈 이름 정규화, 리그 가족 분류, 뼈 위치로 자세 판정, 모델 기준 뼈 회전, 보행 위상·트로트, 개체 성격, 종 전용 모션 격리, 공격 패턴→이펙트 계열, 변종 색 순서.
- `rig-families.json`: 가족 판정 표(원본). `node tools/vibe-rig-kit.mjs --emit`이 모듈의 생성 구간을 이 표와 맞춘다.
- 점검: `node tools/vibe-rig-kit.mjs --game <게임> --report <스튜디오 보고서>` → `docs/devloop/RIG_KIT_<게임>.md`에 몹별 가족·팔레트 누락과 바이브가 채울 일감이 남는다.

표시 전용이다. 판정·체력·AI·저장은 소유하지 않는다. 마력숲에서 실제로 부딪힌 문제(거꾸로 선 사슴, T자 팔, 늑대 전용 모션이 변종으로 새는 문제)에서 뽑았고,
런타임 검증은 소비 게임의 스튜디오 캡처로 한다. 바이브 소스 작성기는 `assets/roblox/common-*-v*`의 모든 모듈과 `ANIMATION` 교훈 3종(RIG_UP_FROM_BONES, RIG_MODEL_SPACE_BONE_POSE, RIG_FAMILY_ROUTING)을 읽는다.
