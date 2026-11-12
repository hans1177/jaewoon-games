# 마리 에센시아 오디오 출처·등록 현황

## 범위와 원칙
- 게임: `roblox-games/mare-essentia` / 원본 기준: `main`.
- 중앙 규칙: `company-learning/platform-release-roadmap.json#ownerCanonicalRules.rule5` — **CC0 원본 출처·허락·해시 확인 + 게임별 수정 파생본만 신규 자산으로 인정**.
- 기존 재생기는 `Shared/Sfx.luau`, 실제 ID는 `Shared/AudioIds.luau`, 등록은 기존 `tools/mare-audio-upload.mjs`을 사용한다. 새 재생기·우회 파이프라인은 만들지 않는다.
- 저장·교역·전투·보상·날짜·난이도에는 영향이 없는 **표현 레이어**만 변경한다.

## 확인된 기존 자산
- `audio/manifest.json` 기준 4 BGM(항구, 항해, 해전, 교역) + 16 효과음·환경음.
- `audio/uploaded.json`에 기존 20개 ID와 granted:true 기록이 있다. 실기기 재생과 해당 권한의 유효성을 이번 작업에서 새로 검증한 것은 아니다.
- 기존 20개는 `OWNER_CREATED_AUDIO` 자체 합성이므로 중앙 CC0 원본 대체 대상. **활성 사용자 소리·기능 보호를 위해 대체·바인딩·회귀 검사 전 삭제·재업로드 금지**.
- `audio/out/*.ogg`는 Git LFS 포인터로 저장되며, 체크아웃 시 LFS 원본 확보가 필요하다.

## CC0 원본 확보: 해적·사략 사건 1건
- 새 자산 키: `music_pirate`, 산출 경로: `audio/out/music_pirate.ogg` (기존 등록 실행 시 파생 생성).
- 원저작자: beardalaxy
- 원출처: https://opengameart.org/content/pirate-ship-theme-loop
- 출처 쪽 라이선스: **CC0**
- 기존 저장소 원본: `web-games/ocean-voyage/assets/cc0/music/pirate_ship_in_game.ogg`
- 기존 검증 장부: `web-games/ocean-voyage/assets/cc0/manifest.json`, `CC0-1.0`, 크기 317,090바이트
- 원본 Git blob SHA-1: `a8388f549590a69c4c771bb60c116b8c266a2fb8`
- 게임별 변형: 기존 업로더에서 32 kHz 모노 변환, 고역·저역 필터 및 약한 음량 감쇠.
- 안전 검사: 위 원본 장부의 URL·CC0·Git blob 해시와 실제 원본 바이트를 일치 검사. 업로드 실행 시 원본 SHA-256 및 파생본 SHA-256을 계산해 등록 기록에 남김.
- 현 상태: **메타데이터 및 변형·업로드 코드 등록**, 산출 OGG·Roblox ID·Studio 실제 재생은 아직 검증 전. `AudioIds.luau`에 검증되지 않은 ID를 기입하지 않음.

## 국가별·해역별 음악 슬롯 (실제 CC0 원본 부족)

`Sfx.portMusic`이 다음 순서대로 **실제 AudioIds에 있는 것만** 선택:
1. 국가별 항구 `music_nation_<country>` / 교역 `music_market_nation_<country>` (항구 개별곡도 허용)
2. 6대 해역 `music_region_<region>` / `music_market_region_<region>`
3. 기존 `music_harbor` / `music_market`

6개 해역: `europe`, `w_africa`, `new_world`, `indian`, `far_east`, `pacific`.

시작 국가 12개: `england`, `netherlands`, `france`, `denmark`, `sweden`, `venice`, `ottoman`, `swahili`, `malabar`, `japan`, `new_spain`, `portugal`. 국가별 곡을 지역에서 들을 때는 현재 **항구 소속 국가**를 기준으로 하고, 플레이어 국적이나 저장을 바꾸지 않는다.

향후 CC0 원본 탐색 방향:
- 영국·북해: 류트, 피들, 선원 합창 없는 현악 버전
- 베네치아·지중해: 실내악, 류트, 만돌린
- 오스만·인도양: 해당 지역 악기와 리듬을 존중하는 라이선스 검증 음원
- 동아시아: 지역별 전통 악기·선율을 별개로 검수한 곡
- 카리브·신대륙: 항구·교역·선원 음악과 사략선 전투곡 구분
- 태평양: 항구·섬 환경음과 지역 음악을 구분

단순 피치·속도만 바꾼 동일 곡을 서로 다른 국가의 전통 음악이라고 표시하지 않는다. **이 국가별 슬롯은 아직 음원 없음.**

## 스토리·역사 사건·원더 연출

- 스토리 7종 장면: `tavern`, `storm`, `palace`, `library`, `observatory`, `ruins`, `harbor`. 음악 `music_story_<art>`, 효과음 `sfx_story_<art>`가 없으면 기존 테마와 기존 효과음.
- 해적·사략선 스토리: 등록된 경우 `music_pirate` 사용. 미등록이면 기존 `music_battle`.
- 역사 사건: 전쟁, 재난, 교역·경제, 학문·문화, 탐험에 따라 음악·효과음을 기존 ID에서 선택. 장면 종료 시 기존 음악 복구.
- 세계 불가사의: 자연·사원별 `music_wonder_<mood>`, `sfx_wonder_<mood>`; 실제 등록 전 기존 `WonderScenes.Moods` 사용.
- 환경음: `sfx_ambience_port_<id>`, `sfx_ambience_nation_<country>`, `sfx_ambience_region_<region>`. 미등록 시 기존 파도. 같은 환경음 재생 요청은 중복 시작하지 않음.

## 검증·미완료
- 확인 필요: CI에서 CC0 원본 Git 해시 및 SHA-256 확인, 실제 파생 OGG 생성/음량·루프 이음매·파일 크기 확인.
- 확인 필요: 로블록스 Open Cloud 오디오 등록·체험 권한 승인·실제 `AudioIds.luau` 기록.
- 확인 필요: Roblox Studio 실제 플레이와 모바일 스피커에서 국가·항구·스토리·역사·불가사의 BGM 전환/복귀/효과음 중복/볼륨/지속 루프 점검.
- 확인 필요: 기존 20개 자체 합성 음원의 CC0 교체에 필요한 각 원본·파생 SHA-256, 소비자 바인딩과 런타임/저장 회귀 증거.
- **신규 국가별 12곡과 해역별 6곡 및 추가 이벤트 효과음은 CC0 음원 바이너리와 해시가 확보되지 않아 미등록**. 검증 없는 PASS 금지.
