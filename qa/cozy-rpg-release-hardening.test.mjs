import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p));
const cozyConfig=read('roblox-games/cozy-island/shared/GameConfig.luau');
const cozyClient=read('roblox-games/cozy-island/client/Game.client.luau');
const cozyServer=read('roblox-games/cozy-island/server/Game.server.luau');
const cozyLaunch=json('roblox-games/cozy-island/launch-mvp.json');
const rpgConfig=read('roblox-games/daechung-rpg/shared/GameConfig.luau');
const rpgClient=read('roblox-games/daechung-rpg/client/Game.client.luau');
const rpgServer=read('roblox-games/daechung-rpg/server/Game.server.luau');
const rpgLaunch=json('roblox-games/daechung-rpg/launch-mvp.json');

test('포근섬은 자동채집이 아니라 월드 자원 노드를 직접 채집한다',()=>{
 assert.match(cozyConfig,/ManualGatherAmount=3/);
 assert.match(cozyServer,/ManualGatherForest/);
 assert.match(cozyServer,/ManualGatherFarm/);
 assert.match(cozyServer,/ObjectText/);
 assert.match(cozyServer,/"벌목"/);
 assert.match(cozyServer,/"수확"/);
 assert.doesNotMatch(cozyConfig,/AutoGatherTickSeconds/);
 assert.doesNotMatch(cozyServer,/AutoGatherZone/);
 assert.ok(cozyLaunch.launchCore.includes('manual world-node wood and food gathering'));
 assert.ok(cozyLaunch.releaseGates.includes('no passive proximity gathering'));
});

test('포근섬 기본섬에는 NPC와 실제 공격 가능한 몹이 존재한다',()=>{
 for(const marker of ['HomeNPCs','마을 이장','벌목반장','농장주','병영대장','HomeMobs','WildBoar','IslandRaider','멧돼지','섬 약탈병'])assert.match(cozyServer,new RegExp(marker));
 assert.match(cozyServer,/Humanoid.*TakeDamage|h:TakeDamage/);
 assert.match(cozyServer,/RespawnSeconds/);
 assert.ok(cozyLaunch.releaseGates.includes('home-island NPC population'));
 assert.ok(cozyLaunch.releaseGates.includes('home-island roaming mobs'));
});

test('포근섬은 주민 자동생산과 5거점 정복 루프를 유지한다',()=>{
 assert.match(cozyServer,/AutomationTickSeconds/);
 assert.match(cozyServer,/WoodWorkers/);
 assert.match(cozyServer,/Farmers/);
 assert.match(cozyServer,/BattleVisual\.start/);
 assert.match(cozyServer,/NextBaseIndex/);
 assert.match(cozyConfig,/Id="VOLCANO"/);
 assert.match(cozyConfig,/Boss=true/);
});

test('포근섬 모바일 UI는 채집 버튼 없이 마을 운영과 정복만 배치한다',()=>{
 for(const marker of ['TopHUD','ActionDock','ActionPopup','ManualGatherHint','마을','정복','기지 공격','병영 강화','CoreUISafeInsets'])assert.match(cozyClient,new RegExp(marker));
 assert.match(cozyClient,/controls\.Size=UDim2\.fromOffset\(196,42\)/);
 assert.match(cozyClient,/나무\/작물에 가까이 가서 직접 채집/);
 assert.doesNotMatch(cozyClient,/AutoGatherStatus/);
});

test('대충 RPG는 마을 허브와 포탈 5개, 440x440 독립 지역을 가진다',()=>{
 assert.match(rpgConfig,/Portals=\{/);
 for(const id of [1,2,3,4,5])assert.match(rpgConfig,new RegExp('Id='+id+',Name='));
 assert.equal((rpgServer.match(/"Portal"\.\./g)||[]).length>=1,true);
 assert.match(rpgServer,/Vector3\.new\(440,2,440\)/);
 assert.match(rpgServer,/makeVillage\(\)/);
 assert.match(rpgServer,/for _,z in ipairs\(C\.Portals\)do makeZone\(z\)end/);
 assert.ok(rpgLaunch.releaseGates.includes('five visible village portals'));
 assert.ok(rpgLaunch.releaseGates.includes('five distinct large zones'));
});

test('대충 RPG는 3번과 5번 지역 보스, 어그로/복귀 거리, 전투중 귀환 금지를 구현한다',()=>{
 assert.match(rpgConfig,/Id=3,Name="룬 유적".*Boss=/s);
 assert.match(rpgConfig,/Id=5,Name="심연 던전".*Boss=/s);
 assert.match(rpgConfig,/Aggro=/);
 assert.match(rpgConfig,/Leash=/);
 assert.match(rpgServer,/if \(e\.part\.Position-e\.spawn\)\.Magnitude>z\.Leash/);
 assert.match(rpgServer,/전투 중에는 마을로 돌아갈 수 없어/);
 assert.match(rpgServer,/p:SetAttribute\("CurrentZone",0\)/);
});

test('대충 RPG 성장은 Lv60 만렙, Lv40 2차 완성형, 무기/방어구/유물 3슬롯을 가진다',()=>{
 assert.match(rpgConfig,/LevelCap=60/);
 assert.match(rpgConfig,/SecondAdvancementLevel=40/);
 assert.match(rpgConfig,/EquipmentSlots=\{"Weapon","Armor","Relic"\}/);
 assert.match(rpgConfig,/WeaponPrices=\{50,120,240,420,700\}/);
 assert.match(rpgConfig,/ArmorPrices=\{45,110,220,390,650\}/);
 assert.match(rpgServer,/MasteryXP/);
 assert.match(rpgServer,/SecondAdvancementId/);
});

test('대충 RPG는 보스 첫 처치 동료 해금과 플레이어+최대3 동료 파티를 구현한다',()=>{
 for(const id of ['GOLDEN_ANTLER','WHITE_FANG','ANCIENT_HEART','RUIN_GUARDIAN','ABYSS_LORD'])assert.match(rpgConfig,new RegExp('Id="'+id+'"'));
 assert.match(rpgConfig,/BossCompanions=\{/);
 assert.match(rpgServer,/UnlockedCompanions/);
 assert.match(rpgServer,/unlockBossCompanion/);
 assert.match(rpgServer,/makeBossCompanionRoster/);
 assert.match(rpgServer,/spawnActiveCompanion/);
 assert.match(rpgServer,/동료 슬롯 3칸/);
 assert.match(rpgServer,/DamagePerLevel/);
 assert.match(rpgConfig,/PartyHuntTarget=15/);
 assert.match(rpgServer,/Contribution/);
});

test('대충 RPG UI는 포탈 이동을 월드에 맡기고 전투/귀환/파티 상태를 직관적으로 분리한다',()=>{
 for(const marker of ['RPGTopHUD','QuestObjective','PartyStatus','CombatDock','BlockParry','ReturnVillage','MultiplayerCode','공격','스킬','막기','회피','마을 귀환','ActionToast'])assert.match(rpgClient,new RegExp(marker));
 assert.ok(rpgClient.includes('combat.Size=UDim2.fromOffset(116,116)'));
 assert.match(rpgClient,/returnButton\.Visible=zone>0/);
 assert.match(rpgClient,/showToast/);
 assert.match(rpgServer,/BossCompanionPrompt/);
 assert.match(rpgServer,/BreakJointsOnDeath=false/);
 assert.match(rpgClient,/전투 중 귀환 불가/);
 assert.match(rpgClient,/multi.Text="방 "/);
});


test('대충 RPG 초원은 패링 전투와 시드형 로그라이크 런을 구현한다',()=>{
 assert.match(rpgConfig,/GuardMax=100/);
 assert.match(rpgConfig,/ParryWindow=\.22/);assert.match(rpgConfig,/ParryRearmSeconds=\.34/);
 assert.match(rpgConfig,/BLOCK_START="BLOCK_START"/);
 assert.equal((rpgConfig.match(/Id="(?:GRASS_WOLF|DIRE_WOLF|CHARGE_BOAR|THORN_WASP|FOREST_LIZARD|HORN_DEER|VINE_CRAWLER|MEADOW_BANDIT|WOLF_TAMER|MOSS_TURTLE)"/g)||[]).length,10);
 assert.match(rpgConfig,/HiddenBosses=\{[\s\S]*Id="WHITE_FANG"[\s\S]*Id="ANCIENT_HEART"/);assert.match(rpgConfig,/Id="GOLDEN_ANTLER"/);
 for(const marker of ['ProceduralRun','MeadowRunSeed','MeadowRunBossDefeated','RunBossSeal','Dormant','wakeMeadowRunBossIfReady','SecretGrove','SecretRuneStone','MemoryAltar','HiddenChest','HIDDEN_BOSS_APPEAR','PARRY','GUARD_BREAK','AttackUnblockable','staggerEnemy','beginEnemyAttack','ParryRearmUntil'])assert.match(rpgServer,new RegExp(marker));
 assert.match(rpgServer,/generateMeadowRun=function\(seed\)/);
 assert.match(rpgClient,/C\.Actions\.BLOCK_START/);
 assert.match(rpgClient,/KeyCode==Enum\.KeyCode\.F/);
});
