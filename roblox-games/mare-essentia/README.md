# Mare Essentia: Explorer's Encyclopedia

서유럽·북유럽 항구에서 출발해 특산품을 교역하고, 증기 기술을 연구하고, 세계 백과를 완성하는 로블록스 RPG.

- 시대: 1600~1700년대 + 증기 대체 역사
- 핵심: 교역 + 항해 + 자동 해전(백병전 포함) + 도감 수집 + 증기 연구
- 엔진: Roblox (Luau), 프로젝트 구조는 Rojo
- 참고한 구조: 교역·모험·전투 3대 직업, 선박 관리, 항해 사건 같은 대항해 시대 류 게임의 시스템 (이름·그림·문장은 모두 새로 만듦)

## 구현된 것
| 시스템 | 내용 | 검증 |
|---|---|---|
| 교역 | 12개 항구, 16종 상품, 수요공급 가격, 교역 레벨 보너스 | Luau 테스트 |
| 선박 | 범선 4종 + 증기선 2종, 구매/교체/수리/선원/보급품 | Luau 테스트 |
| 항해 | 거리와 속도로 소요일, 보급품·석탄 소모, 바람과 사건 | Luau 테스트 |
| 자동 해전 | 포격 → 접현 백병전, 자동스킬 11종과 우선순위 | Luau 테스트 + 밸런스 표 |
| 직업 | 교역 / 모험 / 전투 레벨 | Luau 테스트 |
| 탐험·도감 | 탐험 지점 15곳, 지식 카드 28장 | Luau 테스트 |
| 학자 NPC | 실존 학자 12명, 연도 범위 안에서만 방문 | Luau 테스트 |
| 증기 연구 | 6개 기술 트리, 증기선·증기 스킬 해금 | Luau 테스트 |
| 퀘스트 | 10개 (납품, 발견, 전투, 방문, 연구) | Luau 테스트 |
| 저장 | DataStore, 변조 데이터 검증 | 검증 로직만 테스트 |
| 서버 진입점 / UI | RemoteFunction, 탭 UI 9개 | **Roblox Studio 미검증** |

## 실행
```
# 로직 테스트 (Roblox 없이 Luau CLI로)
LUAU_DIR=/path/to/luau tests/run.sh

# 전투 밸런스 표
LUAU_DIR=/path/to/luau tests/run.sh balance

# 카탈로그 문서 다시 만들기
LUAU_DIR=/path/to/luau tests/run.sh catalog > docs/CATALOG.md

# Roblox Studio에서 열기
rojo serve
```
Luau CLI는 https://github.com/luau-lang/luau/releases 에서 받는다.

## 문서
- [docs/DESIGN.md](docs/DESIGN.md): 컨셉·시스템 설계
- [docs/STEAM.md](docs/STEAM.md): 증기 세계관
- [docs/CATALOG.md](docs/CATALOG.md): 게임 콘텐츠 카탈로그 (자동 생성)
- [docs/ROADMAP.md](docs/ROADMAP.md): 현재 상태와 다음 작업
- [docs/REUSE.md](docs/REUSE.md): 마력숲에서 가져온 코드
- [docs/RULES.md](docs/RULES.md): 원본 에셋·문화권·배포 규칙과 **복식·건축·선박·가축 통합 재질 제작 표준**

## 게임 전체 재질 제작 기준

복식·건축물·선박·소품·가축의 재질은 **반실사·소재별 구분·모바일 우선**으로 통일한다. 직물/모직/비단/돛천, 가죽/잔돌기 가죽, 금속, 회벽/석재/벽돌/목재/지붕·도로 소재를 실제 용도와 문화권에 맞게 사용한다. 작은 돌기·섬유결은 승인된 UV/노멀맵 기반으로 표현하며, 색상이 정상인 GLB·기존 PBR/저장·전투/건물 발전도를 재질 교체 명목으로 바꾸지 않는다.

**제작·다운로드·명명·권한·검수 기준의 정본:** [docs/RULES.md → 통합 3D 재질 제작 표준](docs/RULES.md#통합-3d-재질-제작-표준-복식건축선박소품). 해당 표준은 작업 지침이며 재질 텍스처 3D 제작·Roblox 업로드가 자동 완료됐다는 의미가 아니다.

## 3D 원본 확보 및 6종 선박 모델 연결

`assets/`에는 GLB 245개, FBX 22개, OBJ 22개, MTL 재질 22개가 있다. OBJ 22개는 같은 이름의 GLB와 함께 보유한 형식이다. CC0 신규 모델 80개 + 59개에 이어 항구·항해·교역·탐험용 GLB **44개**를 더 확보했다. 원본 Git SHA를 확인하고 외부 텍스처를 병합했다. 자산 ID는 실제 Roblox 업로드 후에만 등록한다.
실행할 때는 Roblox Studio의 **가져오기**로 GLB/OBJ/FBX를 MeshPart 모델로 수입하고,
`ReplicatedStorage/MareAssets` 폴더 아래에 넣어야 한다. GitHub에만 있는 모델은 자동 로드되지 않는다.

| 항구 모델 수입 폴더 | 모델명 | 게임에서 사용 |
|---|---|---|
| Naval | ship-small | 캐러벨 |
| Naval | ship-medium | 플루트선 |
| Naval | ship-pirate-medium | 프리깃/철갑 증기 프리깃 선체 |
| Naval | ship-large | 갈레온 |
| Naval | ship-pirate-small | 외륜 증기선 기본 선체 |
| Naval | structure-platform-dock | 실제 부두 |
| Town | house, chimney, fountain-round | 마을, 증기선 굴뚝, 분수 |
| People | Pirate_Male, Pirate_Female, Worker_Male, Worker_Female, Casual_Male, Casual_Female, OldClassy_Male, OldClassy_Female | 선원·상인·주민 |

6종 완전 별도 모델을 수입한 경우 `MareAssets/Ships/<선박ID>` (caravel, fluyt, frigate, galleon, paddle_steamer, ironclad_frigate)로 넣으면 해당 모델을 우선 사용한다.
현재 보유 선체는 5종이므로 증기선 두 모델은 다른 원본 선체 + 굴뚝·연기·재질로 구분한다.
**전용 외륜·철갑 선체가 최종 완성된 것으로 취급하지 않는다.**
모델 미수입 상태에서는 기존 도형 임시 그래픽이 유지되어 게임 진입을 막지 않는다.
출처·CC0 근거는 `assets/SOURCES.md` 참고.

아직 Roblox Studio 모델 수입/Play/모바일 검증 및 로블록스 게시를 확인하지 못했다.
