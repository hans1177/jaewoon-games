# Roblox Common VFX v1

회사 공용 Roblox VFX 베이스 3종.

- IMPACT_FLASH
- TRAIL_SHORT
- SHAPE_BURST

외부 텍스처 없이 Roblox 기본 Part / Trail / Tween으로 구성한다.
게임마다 color / accent / scale / duration만 파생해 사용한다.
데미지, 히트박스, 쿨다운, 이동, Remote 권한을 소유하지 않는다.

현재 productionVerified=false / PENDING_STUDIO.

## RobloxCommonSkillSignature (스킬 시그니처 연출 패키지)

마력숲에서 검증한 전투 연출을 모든 게임이 쓰도록 분리한 모듈이다. `Install(ctx)` 한 번으로 스킬마다 다른 모양의 충격파·궤적·입자,
무기 궤적과 잔상, 화면 줌·림라이트·소리, 막기/완벽 패리 방패 연출, 타격 후 추가 충격을 설치한다.

- 필요한 입력: `player`, `gui`, `Config`(MeadowSkillNodeById 등 스킬 메타), `actionsById`, `remote`, `meadowArt`(sfx 포함 테이블), `combatVFX`(선택), `reducedEffects()`
- 순수 시각 효과이며 서버가 승인한 이벤트에서만 호출한다. 판정·피해·쿨다운은 변경하지 않는다.
- 새 모델·외부 에셋 없이 기본 파티클·네온 효과 파트·빔만 사용하고 Debris로 정리한다. 저사양(`reducedEffects`)에서는 입자·흔들림을 줄인다.
- 적용 방법: 게임의 `default.project.json` Shared 아래에 `RobloxCommonSkillSignature`를 추가하고 클라이언트에서 `require(...).Install(ctx)`를 호출한다(마력숲 참고).
