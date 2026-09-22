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

test('대충 RPG 성장/상점은 레벨당 체력+10 공격+10과 장비 5단계를 가진다',()=>{
 assert.match(rpgConfig,/LevelHPGain=10/);
 assert.match(rpgConfig,/LevelAttackGain=10/);
 assert.match(rpgConfig,/WeaponPrices=\{50,120,240,420,700\}/);
 assert.match(rpgConfig,/ArmorPrices=\{45,110,220,390,650\}/);
 assert.match(rpgServer,/WeaponMerchant/);
 assert.match(rpgServer,/ArmorMerchant/);
 assert.match(rpgServer,/while xp>=level\*100/);
});

test('대충 RPG에는 지정된 10명 AI와 파티사냥 기여도 시스템이 있다',()=>{
 for(const pair of [['NONE',2],['HEALER',2],['WARRIOR',3],['ARCHER',3]]){
  const re=new RegExp('Class="'+pair[0]+'"','g');assert.equal((rpgConfig.match(re)||[]).length,pair[1]);
 }
 assert.match(rpgServer,/ClickDetector/);
 assert.match(rpgServer,/한 번 더 눌러 파티 초대\/제외/);
 assert.match(rpgConfig,/PartyHuntTarget=15/);
 assert.match(rpgServer,/Contribution/);
 assert.match(rpgServer,/파티 사냥 완료/);
 assert.match(rpgServer,/ai\.def\.Class=="HEALER"/);
 assert.match(rpgServer,/h\.Health=math\.min\(h\.MaxHealth,h\.Health\+10\)/);
});

test('대충 RPG UI는 포탈 이동을 월드에 맡기고 전투/귀환/파티 상태를 직관적으로 분리한다',()=>{
 for(const marker of ['RPGTopHUD','QuestObjective','PartyStatus','CombatDock','ReturnVillage','MultiplayerCode','공격','스킬','회피','마을 귀환','AI 두번 터치'])assert.match(rpgClient,new RegExp(marker));
 assert.match(rpgClient,/combat\.Size=UDim2\.fromOffset\(62,174\)/);
 assert.match(rpgClient,/returnButton\.Visible=zone>0/);
 assert.match(rpgClient,/전투 중 귀환 불가/);
 assert.match(rpgClient,/멀티 코드 /);
});
