# Mare Scientia: Explorer's Encyclopedia

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
