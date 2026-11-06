// 파일명: qa/cozy-rpg-release-hardening.test.mjs
// 임포트: 게임 계약 및 실제 배치 함수의 Luau 모의 환경 검사.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

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

test('포근섬 시작섬 확장과 배경 일괄 배치는 기존 진행·원정·저장을 보존한다',()=>{
 const style=read('roblox-games/cozy-island/shared/VisualStyle.luau');
 const home=style.match(/HomeIsland=\{Radius=(\d+),Length=(\d+),GridStep=(\d+),ForestCount=(\d+),ArtPass="([^"]+)"\}/);
 assert.ok(home,'시작섬 설정');
 assert.ok(Number(home[1])>=675,'시작섬 너비');
 assert.ok(Number(home[2])>=1800,'시작섬 길이');
 assert.ok(Number(home[4])>=198,'배경 숲');
 assert.equal(home[5],'COZY_GRAND_START_ISLAND_V12');
 assert.match(cozyServer,/local function islandHalfWidth\(z\)/);
 assert.match(cozyServer,/for iz=3,math\.floor\(home\.Length\/45\) do/);
 assert.match(cozyServer,/for z=650,1850,600 do/);
 assert.match(cozyServer,/for z=145,home\.Length-65,37 do/);
 for(const detail of ['GrandIslandScenery','CoastalCottage_','OrchardFruit',
  'MeadowHayBale','SouthTrailLamp','SouthCapeDeck','SouthCapeBeacon','CrystalWaterfall',
  'ForestShrine','SunsetLighthouse'])assert.ok(cozyServer.includes(detail),detail);
 assert.match(cozyServer,/GrandIslandDistrictCount",4/);
 for(const preserved of ['ManualGatherForest','ManualGatherFarm','HomeNPCs','HomeMobs',
  'FoundationSpawn','C.Bases','BattleVisual.start','GetDataStore("cozy-island-conquest-v3")'])
  assert.ok(cozyServer.includes(preserved),preserved);
 assert.match(cozyServer,/workspace:SetAttribute\("GrandIslandSceneryCount",#scenery:GetDescendants\(\)\)/);
});

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

test('포근섬 NPC·몹은 실제 바닥을 기준으로 발끝을 접지하고 CC0 외형도 같은 바닥에 놓는다',()=>{
 assert.match(cozyServer,/local function placeActorOnGround\(rootPart,islandTopY\)/);
 assert.match(cozyServer,/FilterType=Enum\.RaycastFilterType\.Include/);
 assert.match(cozyServer,/workspace:Raycast\(/);
 assert.match(cozyServer,/item\.Name=="VillagePlaza"/);
 assert.match(cozyServer,/item\.Name=="VillageGreen"/);
 assert.match(cozyServer,/item\.Name=="BarracksYard"/);
 assert.match(cozyServer,/math\.abs\(frame\.RightVector\.Y\)\*size\.X/);
 assert.match(cozyServer,/floorY-lowestY\+\.04/);
 assert.match(cozyServer,/placeActorOnGround\(r,pos\.Y-6\)/);
 assert.match(cozyServer,/placeActorOnGround\(r,islandTopY\)/);
 assert.match(cozyServer,/spawnMob\(kind,pos,visualIndex,islandTopY\)/);
 assert.match(cozyServer,/spawnMob\(kind,pos,visualIndex,islandTopY\)end end/);
 assert.match(cozyServer,/floorY-bottomY\+\.04/);
 assert.match(cozyServer,/CozyGroundStatus/);
 assert.match(cozyServer,/UNVERIFIED_FLOOR/);
 assert.match(cozyServer,/CozyActorGroundingGeometryAligned/);
 assert.match(cozyServer,/CozyActorGroundingUnverified/);
 assert.match(cozyServer,/CozyActorGroundingGeometryCheck/);
 assert.match(cozyServer,/expected==19 and aligned==expected and unverified==0/);
 assert.match(cozyServer,/foundationCheckpoint\("NPC_MONSTER_GROUND_GEOMETRY"/);
 assert.doesNotMatch(cozyServer,/CozyActorRuntimeGroundingVerified",true/);
});

test('검증되지 않은 조립 곰은 출시 월드에 등장하거나 CC0 통과로 처리되지 않는다',()=>{
 assert.match(cozyServer,/CozyBearCC0Status","BLOCKED_UNVERIFIED_SOURCE"/);
 assert.match(cozyServer,/VillageBearCount",0/);
 assert.doesNotMatch(cozyServer,/Wildlife\.Spawn\("BEAR"/);
 assert.doesNotMatch(cozyServer,/spawnVillageBear\(/);
 assert.match(cozyServer,/spawnMob\("BOAR"/);
 assert.match(cozyServer,/spawnMob\("RAIDER"/);
});

test('포근섬 SKILL 자산은 서버 확정 전투 타격에 실제 파티클로 반영하고 정리한다',()=>{
  assert.match(cozyClient,/hasStudioAssetAtom\("SKILL","IMPACT_SMALL"\)/);
  assert.match(cozyClient,/value:find\("\^HIT:"\)/);
  assert.match(cozyClient,/local impact=Instance\.new\("Attachment"\)/);
  assert.match(cozyClient,/local sparks=Instance\.new\("ParticleEmitter"\)/);
  assert.match(cozyClient,/sparks\.Parent=impact/);
  assert.match(cozyClient,/sparks:Emit\(9\)/);
  assert.match(cozyClient,/task\.delay\(\.7,function\(\)if impact\.Parent then impact:Destroy\(\)end end\)/);
  assert.doesNotMatch(cozyServer,/spawnVillageBear\(/);
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
 assert.match(cozyClient,/controls\.Size=UDim2\.fromOffset\(196,56\)/);
 assert.match(cozyClient,/나무\/작물에 가까이 가서 직접 채집/);
 assert.doesNotMatch(cozyClient,/AutoGatherStatus/);
});

test('포근섬 모바일 채집 안내는 시작 버튼 이후 9초간 표시하고 종료 후 복원되지 않는다',()=>{
 assert.match(cozyClient,/local touchGatherHintUntil=0/);
 assert.match(cozyClient,/touchGatherHintUntil=os\.clock\(\)\+9/);
 assert.match(cozyClient,/local hint=gui:FindFirstChild\("ManualGatherHint"\)/);
 assert.match(cozyClient,/gatherHint\.Visible=ready and not actionPopup\.Visible and \(not touchEnabled or os\.clock\(\)<touchGatherHintUntil\)/);
 assert.doesNotMatch(cozyClient,/if touchEnabled then task\.delay\(9,function\(\)if gatherHint\.Parent/);
});

test('포근섬 실제 배치 함수는 가로 화면에서 메뉴와 행동 탭을 겹치지 않게 배치한다',{skip:!process.env.VIBE2_LUAU_BINARY},()=>{
 const start=cozyClient.indexOf('local function layoutControls()');
 const end=cozyClient.indexOf('actionPopup:GetPropertyChangedSignal("Visible")',start);
 assert.ok(start>=0&&end>start);
 const source=`
local Vector2={new=function(x,y)return{X=x,Y=y}end,zero={X=0,Y=0}}
local UDim2={new=function(xs,x,ys,y)return{xs,x,ys,y}end,fromOffset=function(x,y)return{0,x,0,y}end,fromScale=function(x,y)return{x,0,y,0}end}
local gui={};local hud={};local resources={};local objective={};local gatherHint={}
local controls={};local actionPopup={Size=UDim2.fromOffset(260,128)}
local actionButtons={{},{},{},{}};local startupOverlay={};local touchEnabled=true
local touchGatherHintUntil=os.clock()+9
${cozyClient.slice(start,end)}
local function rect(o,w,h)
 local s=o.Size;local p=o.Position;local a=o.AnchorPoint or Vector2.zero
 local rw=w*s[1]+s[2];local rh=h*s[3]+s[4]
 return{x=w*p[1]+p[2]-rw*a.X,y=h*p[3]+p[4]-rh*a.Y,w=rw,h=rh}
end
for _,v in ipairs({{320,480},{390,760},{480,270},{568,274},{667,320},{844,350},{1280,720}})do
 gui.AbsoluteSize=Vector2.new(v[1],v[2])
 for _,touch in ipairs({true,false})do
  touchEnabled=touch;startupOverlay.Parent=nil;actionPopup.Visible=true;layoutControls()
  local menu=rect(actionPopup,v[1],v[2]);local dock=rect(controls,v[1],v[2])
  for _,r in ipairs({menu,dock})do assert(r.x>=0 and r.y>=0 and r.x+r.w<=v[1] and r.y+r.h<=v[2],'화면 잘림')end
  assert(menu.x+menu.w<=dock.x or dock.x+dock.w<=menu.x or menu.y+menu.h<=dock.y or dock.y+dock.h<=menu.y,'메뉴와 행동 탭 겹침')
  assert(dock.w*.46>=44 and dock.h>=52,'터치 영역 부족')
  assert(not hud.Visible and not objective.Visible and not gatherHint.Visible and controls.Visible)
  actionPopup.Visible=false;layoutControls();assert(hud.Visible and objective.Visible and controls.Visible)
  assert(gatherHint.Visible,'첫 진입 채집 안내가 메뉴를 닫으면 보이지 않음')
  startupOverlay.Parent={};actionPopup.Visible=true;layoutControls()
  assert(not actionPopup.Visible and not controls.Visible and not hud.Visible)
 end
end
touchEnabled=true
startupOverlay.Parent=nil
actionPopup.Visible=false
touchGatherHintUntil=os.clock()-1
layoutControls()
assert(not gatherHint.Visible,'9초가 지난 모바일 안내가 다시 표시됨')
print('COZY_LAYOUT_MOCK_PASS:7_VIEWPORTS')
`;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cozy-layout-'));
 try{
  const file=path.join(dir,'layout.luau');fs.writeFileSync(file,source);
  const result=spawnSync(process.env.VIBE2_LUAU_BINARY,[file],{encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,result.stderr||result.stdout||String(result.error));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
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
 for(const marker of ['RPGTopHUD','QuestObjective','PartyStatus','CombatDock','BlockParry','ReturnVillage','MultiplayerCode','공격','스킬','막기','회피','마을 귀환','동료 두번 터치'])assert.match(rpgClient,new RegExp(marker));
 assert.ok(rpgClient.includes('combat.Size=UDim2.fromOffset(62,232)'));
 assert.match(rpgClient,/returnButton\.Visible=zone>0/);
 assert.match(rpgClient,/전투 중 귀환 불가/);
 assert.match(rpgClient,/멀티 코드 /);
});


test('대충 RPG 초원은 패링 전투와 시드형 로그라이크 런을 구현한다',()=>{
 assert.match(rpgConfig,/GuardMax=100/);
 assert.match(rpgConfig,/ParryWindow=\.25/);assert.match(rpgConfig,/ParryRearmSeconds=\.34/);
 assert.match(rpgConfig,/BLOCK_START="BLOCK_START"/);
 assert.equal((rpgConfig.match(/Id="(?:GRASS_WOLF|DIRE_WOLF|CHARGE_BOAR|THORN_WASP|FOREST_LIZARD|HORN_DEER|VINE_CRAWLER|MEADOW_BANDIT|WOLF_TAMER|MOSS_TURTLE)"/g)||[]).length,10);
 assert.match(rpgConfig,/HiddenBosses=\{[\s\S]*Id="WHITE_FANG"[\s\S]*Id="ANCIENT_HEART"/);assert.match(rpgConfig,/Id="GOLDEN_ANTLER"/);
 for(const marker of ['ProceduralRun','MeadowRunSeed','MeadowRunBossDefeated','RunBossSeal','Dormant','wakeMeadowRunBossIfReady','SecretGrove','SecretRuneStone','MemoryAltar','HiddenChest','HIDDEN_BOSS_APPEAR','PARRY','GUARD_BREAK','AttackUnblockable','staggerEnemy','beginEnemyAttack','ParryRearmUntil'])assert.match(rpgServer,new RegExp(marker));
 assert.match(rpgServer,/generateMeadowRun=function\(seed\)/);
 assert.match(rpgClient,/C\.Actions\.BLOCK_START/);
 assert.match(rpgClient,/KeyCode==Enum\.KeyCode\.F/);
});
