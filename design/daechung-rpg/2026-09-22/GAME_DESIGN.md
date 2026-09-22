# 5포탈 RPG: 던전 파티 — Game Design / Code Sync

구현 기준: `5bb5500a2d43e0fb32a84c55ac46a61356093796` (main)

과거의 “스토리 동료 수집형 4인 고정 파티” 문서는 현재 Roblox 구현 계약이 아니다.

## 실제 게임 루프
마을 준비 → 5개 포탈 사냥터 → 퀘스트/장비 성장 → AI 유저 파티 → 15마리 파티 사냥 → 보스.

- 5개 포탈 지역, 3·5지역 보스
- 마을 귀환 풀회복, 전투 중 귀환 금지
- 레벨업 최대체력 +10 / 공격력 +10
- 무기 5티어 / 방어구 5티어
- AI 유저 10명: 무직2 / 힐러2 / 전사3 / 궁수3
- AI 더블클릭 파티 초대/제외
- 파티 사냥 15킬, 기여도별 XP/골드

## 그래픽 콘셉트
**RPG_HEROIC_PORTAL_FANTASY**
- WorldArtPass: `RPG_FANTASY_SILHOUETTE_WORLD_V4`
- CharacterArtDirection: `RPG_HEROIC_FANTASY_SILHOUETTE`
- 작은 머리, 넓은 어깨, 갑옷 가슴판의 성인 영웅 비율.
- 검·후드·망토·지팡이로 역할 실루엣 구분.
- 초원 늑대 / 협곡 도적 / 룬 골렘 / 설원 야수 / 심연 기사처럼 지역별 몬스터 체형을 다르게 한다.
- 보스는 일반 몹 단순 확대 금지.
- 포근섬 치비 비율과 심야 공포 골격을 재사용하지 않는다.

## Roblox 제목
KO: [5포탈 RPG] 던전 파티  
EN: [5 PORTALS] Five Portal RPG: Dungeon Party
