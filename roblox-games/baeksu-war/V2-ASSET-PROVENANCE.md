# 백수대전쟁 2차 배포: 외형 모듈 및 저작권 출처

## 참고한 게임 (행동·구조 원칙만)
- Noob Army Tycoon, Thinking Project: 기지 성장과 자동 진격, 전선 시각화 방식 참고. https://www.roblox.com/games/6610021055
- Clone Tycoon 2, Ultraw: 생산시설 → 유닛 → 전투 수익 → 업그레이드의 루프 참고. https://www.roblox.com/games/413424176
- 두 게임의 스크립트, 모델, 로고, 사운드, UI 이미지, 맵은 사용하지 않음.

## 2차에 실제 포함된 외형 소스
- `shared/VisualKit.luau`: 오리지널 Luau Part 기반 외형 모듈 제작기. 생물(8종), 발전형 건물, 성문·성탑, 나무·도로·램프, 피격 VFX 구현.
- 내부 재사용 *설계 카탈로그*인 `assets/roblox/common-creature-parts-v1/catalog.json`, `common-building-v1/catalog.json`, `common-world-props-v1/catalog.json`의 부위·건축·소품 **역할 분류**를 참고해 독자적으로 작성.
- 위 카탈로그의 `productionVerified`는 `false`, `runtimeVerificationState`는 `PENDING_STUDIO`. 목록이 곧 검증 완료한 실행 가능한 모델팩이라는 주장은 하지 않음.
- 실제 배포된 외부 CC0 메시/모델/이미지/오디오 자산 ID: **0개**. Roblox 표준 재질 및 코드로 직접 구성한 파츠만 사용.
- `assets/roblox/common-registered-external-assets-v1.json`의 등록 외부 자산 15개는 라이선스 `CC0-1.0`으로 표기되어 있지만, 이번 게임의 Universe `10773115989`에는 사용 권한이 기록되어 있지 않으며 등록 자산을 가져오지 않음.
- 외부 CC0 콘텐츠를 포함하는 후속 릴리스는 원본 라이선스 기록과 소스 무결성을 확인하고 **게임별 Universe 권한 부여** 후에만 사용할 것.

## 기존 게임 유지
- Game ID: `baeksu-war`
- SaveKey: `baeksu-war-v1` (변경 없음)
- 게임 비용/8종 전투 유닛/10단계 업그레이드/전투 판정: 기존 루프 및 서버 권한 유지
- 비공개 동일 대상 업데이트: Universe `10773115989`, Place `120481433333785`
- Rojo 배포 후 실제 Roblox Published version은 배포 작업 로그로만 확인. 정식 공개 출시나 실기기 Studio 테스트를 주장하지 않음.
