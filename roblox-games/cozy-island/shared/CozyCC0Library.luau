-- 파일명: roblox-games/cozy-island/shared/CozyCC0Library.luau
-- Roblox CC0 original actor registry: assets/roblox/common-registered-external-assets-v1.json
-- 이 파일은 원본을 수정하지 않고 확인된 CC0 모델의 Roblox asset ID만 참조한다.
-- 게임별 Universe 권한은 GitHub publish에서 매번 검증/부여한다.
-- 검증되지 않은 세계/배경/UI/오디오는 여기에 포함하지 않는다.
local Library={
  License="CC0-1.0",
  OriginalSource="assets/roblox/actors/sources",
  Registry="assets/roblox/common-registered-external-assets-v1.json",
  UniverseId="10767445741",
  Npc={
    Chief=70786111181272, -- KayKit Mage
    LumberMaster=116038780084368, -- KayKit Barbarian
    Farmer=85809121784004, -- KayKit Rogue
    Captain=132263407299485, -- KayKit Knight
    Villager1=95194894650580, -- KayKit Rogue Hooded
    Villager2=85809121784004,
    Villager3=70786111181272,
    Villager4=116038780084368,
    Villager5=95194894650580,
  },
  Raider={
    140296381581463, -- KayKit Skeleton Warrior
    98423600292533, -- KayKit Skeleton Rogue
    122314950313754, -- KayKit Skeleton Minion
  },
}
return table.freeze(Library)
