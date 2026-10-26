# 백수대전쟁 3차: 원시 파츠 금지 · 진짜 메시 아트 배포

- 원시 Roblox `Part` 외형 제작기 폐기. `Game.server.luau`과 `VisualKit.luau`는 더 이상 `Instance.new("Part")`를 호출하지 않는다.
- 바닥/도로/건축 마당: `workspace.Terrain:FillBlock()` (Terrain, Part 인스턴스 아님).
- 생물 8종과 주택/성채/나무/암석: `tools/baeksu-war-author-meshes.py`에서 각각 GLB 실물 모델로 제작한다. 구형 파츠를 메시라고 이름만 바꾸지 않는다.
- `tools/baeksu-war-upload-meshes.mjs`: 별도 메시에 Roblox Model 클라우드 에셋 ID를 실제 발급하고 Universe `10773115989`에 접근 권한을 부여한다.
- GitHub Actions가 이 단계를 성공시켜야만 `roblox-games/baeksu-war/shared/VisualAssetIds.luau`를 실제 ID로 대체하고 Rojo 빌드 후 기존 Place `120481433333785`에 새 버전을 게시한다.
- 서버에서 메시 ID 누락 또는 모델 적재 실패 시 Part로 대체하지 않고 오류로 막는다.
- 원본 출처: **게임 전용 자체 신규 3D 메시 저작**. 외부 게임 모델, 이미지를 복사하지 않음. 외부 CC0 에셋을 사용했다고 주장하지 않음.
- 기존 CC0 재사용 자산 장부 `assets/asset-license-ledger.json`와 `assets/roblox/common-registered-external-assets-v1.json`은 존치. 타 게임 등록 메시 자산을 승인 없이 재사용하지 않음.
- 기존 `baeksu-war-v1` 저장 키, 유닛 8종과 10레벨/건설 경제 규칙 불변.
- 사용자가 요청한 대로 Roblox Studio 테스트를 강제하지 않는다. 공식 Roblox Cloud 게시 성공은 version receipt로 확인한다.
- 자유 시점: Roblox 기본 3인칭 `CameraType.Custom`을 사용하고 Scriptable 고정 카메라를 제거한다. PC 마우스 회전/줌 및 모바일 터치 시점 조작.
