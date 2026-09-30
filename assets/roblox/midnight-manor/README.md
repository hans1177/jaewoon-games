# 심야 대탈출 · 괴물 가족의 저택

집 배경과 NPC를 블렌더 기본 메시, 내부 CC0 가구·건축 GLB, 처녀귀신 GLB로 재구성한 로비다. 어두운 목재·낡은 벽지·황동·붉은 천을 공통 재질로 사용한다.

## 원본과 재사용

- `sources/*.tar.gz`: 라이선스와 해시가 보존된 Kenney 원본. `asset-manifest.json`에서 출처를 확인한다.
- `../world-ghosts/native/mesh/bride.glb`: 변경하지 않은 내부 캐릭터 원본.
- `build.py`: 심야용 크기·배치·메시·재질·초상화 제작 코드.
- `generated/manor.blend`: 가구와 NPC를 편집할 수 있는 블렌더 장면. 게임용 자산은 이 파일에 직접 덮어쓰지 않고 내보낸다.
- `generated/manor-lobby.glb`: 게임용 전체 저택. 텍스처 포함.
- `generated/butler.glb`, `undertaker.glb`, `archivist.glb`: 발 기준으로 정리한 개별 NPC. `undertaker`는 기존 코드 호환용 이름이며 현재 역할은 벨라의 의상실이다.

집사 모티머는 출정, 벨라는 의상·상점, 기록관 에드윈은 도감, 막내 유령은 초대장을 담당한다. 원본 캐릭터의 리깅과 애니메이션은 원본 GLB에 남고, 로비용 변형본은 정적 메시다. 집사의 머리·갑옷·관 뚜껑은 기존 서버 연출이 움직인다.

## 재생성

Blender 4.5.3의 `bpy`, NumPy, Pillow가 설치된 Python에서 저장소 루트 기준으로 실행한다.

```sh
python assets/roblox/midnight-manor/build.py --render
node --test qa/horror-manor.test.mjs
```

GLB는 Y 위·+Z 정면·스터드 단위다. `import-bounds.json`은 전체 장면의 실제 중심과 폭을 기록한다. 개인 로비의 충돌 경계와 프롬프트는 `server/ManorLobby.luau`에서 관리한다.

`--render`는 배포할 GLB를 빈 장면에 다시 임포트하고 `generated/review/`에 검수 렌더와 입력 해시를 기록한다. 제작 장면과 내보낸 파일 사이의 재질·배치 차이를 직접 확인하는 절차다.

검증 기록: 모델 계약 7개, Luau 컴파일, Rojo 빌드 통과. 실제 GLB를 다시 임포트한 렌더에서 재질·초상화·NPC 배치를 확인했다. 현재 환경에서는 브라우저 미리보기와 Roblox 모바일 실기·재접속 검증을 실행하지 못했다. 렌더는 실제 게임 스크린샷이 아니다.
