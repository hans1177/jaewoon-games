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

## CC0 원본 확보: 기록·이벤트 효과음 20종

- 원저작자: **Kenney** (2014) — RPG Audio, 50개 효과음. 공개 CC0 근거: https://kenney.nl/assets/rpg-audio 및 https://opengameart.org/content/50-rpg-sound-effects
- 저장소에 이미 보존된 다운로드 원본: `assets/external/simple-rpg/priority-v1/kenney-rpg-sfx-50.zip`
- 실제 다운로드: https://opengameart.org/sites/default/files/RPGsounds_Kenney.zip
- 저장소 기존 증빙: `assets/external/simple-rpg/priority-v1/manifest.json`의 `packs` 목록. 라이선스 `CC0-1.0`, 원본 ZIP 690,952바이트.
- 원본 ZIP SHA-256: `3ae398ad63e293f9c450bda22d5d81c3af69c74df66fc1400f33c012c0bbc231`.
- 새 등록 예정: `audio/manifest.json`의 `sfx_story_*` 6종, `sfx_event_*` 5종, `sfx_wonder_temple` 1종 및 지도·책·돛·선장실·화물 효과음 8종. 정확한 ZIP 엔트리는 각 트랙의 `sourceEntry`에 기록.
- 게임용 변경: 원본 아카이브 검증 → 해당 OGG 엔트리를 고립 추출 → 저역/고역 정리, 모바일용 음량 균형, 32 kHz 모노 OGG 재인코딩. 모든 음원이 별도 원본 엔트리에서 생성됨.
- 기존 업로더는 **실제 원본 ZIP 해시**, 라이선스·다운로드 URL·엔트리 유일성을 비교하고 원본 오디오 SHA-256/파생본 SHA-256을 영수증에 남기도록 확장.
- 검증 명령: `AUDIO_CC0_PREFLIGHT=1 node tools/mare-audio-upload.mjs`. 별도 API 키 없이 변환된 모든 오디오를 디코딩하고 길이를 검사하지만, CI/현실 로블록스 플레이의 대체 증거는 아님.
- 현재 **원본 검증 장부 및 변형 파이프라인 구현** 상태. 신규 파생 음원 실제 생성·압축 결과 SHA/로블록스 자산 ID·모바일 볼륨은 검증 전. 사용자에게 완료/등록으로 안내 금지.

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

## 교역소 상인 짧은 음성 인사

- 기존 `Shared/Sfx.luau`의 `Sfx.merchantGreeting`을 `Game.client.luau` 교역소 최초 진입에만 연결한다. 거래 품목 갱신/말풍선 재작성에서는 반복 실행하지 않는다.
- 기본 `AudioTextToSpeech` 및 `AudioDeviceOutput`를 사용하므로 음성 파일 추가·외부 유료 서비스·새 배포 경로가 없다.
- 현지 언어와 음성 사용: 영어·프랑스어·독일어·이탈리아어·스페인어·포르투갈어·아랍어·중국어·일본어·한국어. 미지원 언어는 잘못된 지역 음성으로 위장하지 않고 간단한 영어 인사로 대체한다. 재생에는 별도 자막이 없다.
- 전투/스토리와 무관한 **한마디 인사만** 재생, 동일 사용자 12초 내 중복 인사 억제. 기존 효과음 켜기·끄기 및 음량 설정을 반영한다. 로블록스 TTS 기본 사용량 한도 내 운영하며 유료 확장은 사용하지 않는다.
- 참고: https://create.roblox.com/docs/reference/engine/classes/AudioTextToSpeech 및 https://create.roblox.com/docs/audio/objects
- 실제 Studio/모바일 TTS 음량·목소리 자연스러움·현지 언어 출력은 검증 전. 본 문서는 실기기 PASS 근거가 아니다.

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
- **신규 국가별 12곡과 해역별 6곡은 원본·해시 미확보로 미등록. 추가 효과음 20개는 원본 ZIP 기반의 파생·등록 준비 단계로 실제 자산 ID 미확인.** 검증 없는 PASS 금지.

## 외부 후보 음원 (다운로드 원본 SHA-256 미검증, 게임 적용 금지)

국가별 역사음악으로 확인한 CC0 **후보**들. 웹상의 CC0 표기는 확인했으나 원본 파일 SHA-256/게임별 파생 SHA-256, 음색·음량·루프 품질을 검증하지 않았으므로 `audio/manifest.json`에 등록하지 않았다.

- 유럽 항구·주점: Woli34, [Medieval fair loop](https://opengameart.org/content/medieval-fair-loop) (CC0, 8마디 130 BPM).
- 유럽 항구·왕궁: RandomMind, [Medieval: The Bard's Tale](https://opengameart.org/content/medieval-the-bards-tale) (CC0, 류트·플루트·루프 버전).
- 탐험: RandomMind, [Medieval: Exploration](https://opengameart.org/content/medieval-exploration) (CC0).
- 승리·보상: RandomMind, [Medieval: Victory Theme](https://opengameart.org/content/medieval-victory-theme) (CC0).
- 해전: Eldritch Grim, [Pirate Indenture](https://opengameart.org/content/pirate-indenture) (CC0, 루프).
- 주점: Bobjt, [Crowded Pub](https://opengameart.org/content/crowded-pub) (CC0, OGG/MP3).
- 문화권 악기·리듬 적합성은 시대와 국가별로 별도 확인하고, 유럽 중세 음악을 다른 문화권 대표곡으로 오표시하지 않는다.

## 2026-11-12 서아프리카 오너 창작 음악

- 사용자가 직접 작곡·소유했다고 명시한 34.29초(112 BPM, 16마디) 원곡을 `music_region_w_africa`에 지정.
- 외부 샘플·외부 멜로디 사용 없음. 기존 `audio/synth.py` 안에서 재현. OGG 파일 SHA-256 `bbb537164c8e8b2a584b18a909991869eeac693e92a2f3c4980307b6ca184b2a`(uploaded.json과 일치, 34.29초 확인), 미리듣기 SHA-256 `a5c9a7c568edef9b6a41b7be77d18832d325fa6cf09f80808fae7d0419166340`.
- 오너 지정 해당 음악에 한정한 중앙규칙 예외를 기록. 타 음원 CC0 검증과 기존 합성곡 등록 금지 보호는 유지.
- 새 ID(78206935419029)는 main의 AudioIds에 연결됨. 로블록스 재생 가능 여부는 런타임이 시작 8초 뒤 검사하며, 실패하면 자동으로 기존 항구 음악(`music_harbor`)으로 대체된다. 실제 게임 재생 확인 전까지 상태는 `UPLOADED_PLAYBACK_UNVERIFIED`.
- 등록 워크플로·ID PR·로블록스 본게임 게시·모바일 실재생은 별도 증거로 확인.
