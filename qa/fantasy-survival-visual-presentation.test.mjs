// 파일명: qa/fantasy-survival-visual-presentation.test.mjs
// 역할: 마력숲 표현 개선이 실제 자산 바인딩을 사용하면서 기존 게임 의미를 보존하는지 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('web-games/fantasy-survival/index.html','utf8');

function functionBody(name){
  const start=source.indexOf(`function ${name}(`);
  assert.ok(start>=0,`${name} 함수가 있어야 함`);
  const end=source.indexOf('\nfunction ',start+20);
  return source.slice(start,end<0?source.length:end);
}

test('fantasy survival actor presentation binds authored image assets into the live canvas renderer',()=>{
  assert.match(source,/FANTASY_VISUAL_STYLE_LOCK/);
  assert.match(source,/magic-forest-preservation-2026-09-20/);
  assert.match(source,/new Image\s*\(\s*\)/);
  assert.match(source,/ctx\.drawImage\s*\(/);
  assert.match(source,/data:image\/svg\+xml/);
  const creature=functionBody('drawCreature');
  assert.match(creature,/drawThemedCreatureAsset\(e,x,y,now\)/);
  assert.doesNotMatch(creature,/ctx\.arc\(x,y,e\.type\.r,0,Math\.PI\*2\);ctx\.fill\(\);ctx\.stroke\(\)/);
});

test('existing bespoke combat creatures remain on their dedicated motion renderers',()=>{
  const creature=functionBody('drawCreature');
  assert.match(creature,/drawFireSnakeModel\(e,x,y,now\)/);
  assert.match(creature,/drawBearModel\(e,x,y,now\)/);
  assert.match(creature,/drawWolfModel\(e,x,y,now\)/);
  assert.match(functionBody('drawDeathEffects'),/drawFantasyCreatureAssetLocal/);
});

test('player presentation uses the forest mage asset without changing equipment and attack feedback ownership',()=>{
  const player=functionBody('drawPlayer');
  assert.match(player,/fantasyPlayerVisualAsset\(\)/);
  assert.match(player,/ctx\.drawImage\(playerImage/);
  assert.match(player,/p\.torchEquipped/);
  assert.match(player,/p\.weapon/);
  assert.match(player,/drawPlayerCombatVfx\(p,x,y,now,angle,attackPose,attackActive\)/);
  assert.match(functionBody('drawPlayerCombatVfx'),/currentRange\(\)/);
});

test('protected save key and representative balance values remain present',()=>{
  assert.match(source,/jaewoon_fantasy_survival_v1/);
  assert.match(source,/mossboar:\{id:'mossboar',name:'이끼멧돼지',mood:'neutral',hp:72,dmg:9,speed:62,r:20/);
  assert.match(source,/worldtreebear:\{id:'worldtreebear',name:'세계수 곰',mood:'aggressive',hp:380,dmg:28,speed:70,r:30/);
  assert.match(source,/firesnake:\{id:'firesnake',name:'화염 뱀',mood:'aggressive',hp:300,dmg:25,speed:105,r:23/);
});

test('world regions use cached contextual material patterns instead of flat color only',()=>{
  assert.match(source,/fantasyRegionPatternCache=new Map\(\)/);
  assert.match(source,/ctx\.createPattern\(image,'repeat'\)/);
  assert.match(source,/fillFantasyRegionTextureRect\(SNOW_REGION,'snow'/);
  assert.match(source,/fillFantasyRegionTextureRect\(JUNGLE_REGION,'jungle'/);
  assert.match(source,/fillFantasyRegionTextureRect\(CRYSTAL_REGION,'crystal'/);
  assert.match(source,/fillFantasyRegionTextureRect\(GIANT_LAKE_WATER,'water'/);
  assert.match(source,/fillFantasyRegionTexturePolygon\(CANYON_POLY,'wasteland'/);
  assert.match(source,/fillFantasyRegionTexturePolygon\(WORLD_TREE_POLY,'forest'/);
});

test('interactive world resources and stations use authored visual assets while preserving presentation infrastructure and labels',()=>{
  assert.match(source,/const FANTASY_VISUAL_STYLE_LOCK=Object\.freeze/);
  assert.match(source,/const fantasyVisualAssetCache=new Map\(\)/);
  assert.match(source,/function fantasyWorldObjectSvg\(kind\)/);
  assert.match(source,/fantasyWorldObjectAsset\(kind\)/);
  assert.match(source,/drawFantasyWorldObject\(kind,x,y,size,size\)/);
  const node=functionBody('drawNode');
  assert.match(node,/n\.kind==='poisonstone'/);
  assert.match(node,/독점석/);
  const structure=functionBody('drawStructure');
  assert.match(structure,/drawFantasyWorldObject\(visualKind/);
  assert.match(structure,/제작대/);
  assert.match(structure,/화로 · 두 번 누르기/);
  assert.match(structure,/부화기 · 두 번 누르기/);
  assert.match(structure,/요리대 · 두 번 누르기/);
  assert.match(structure,/독점석 제작대/);
  assert.match(structure,/금 제작대/);
  assert.match(structure,/깃발/);
});

test('living motion is render-only and smooths turn, locomotion and non-uniform breathing',()=>{
  assert.match(source,/const fantasyLivingMotionState=new WeakMap\(\)/);
  const motion=functionBody('fantasyLivingMotion');
  assert.match(motion,/angleDelta/);
  assert.match(motion,/moveBlend/);
  assert.match(motion,/Math\.exp/);
  assert.match(motion,/breath/);
  assert.match(motion,/stride/);
  assert.match(motion,/secondary/);
  assert.doesNotMatch(motion,/attackAt|attackFx|nextAttackAt|hitAt/);
  assert.doesNotMatch(motion,/actor\.(?:x|y|faceX|faceY)\s*=/);
});

test('living motion binds to generic and dedicated creature renderers without replacing combat ownership',()=>{
  assert.match(functionBody('drawThemedCreatureAsset'),/fantasyLivingMotion\(e,now,targetAngle,!!e\.moving\)/);
  assert.match(functionBody('drawWolfModel'),/fantasyLivingMotion\(e,now,creatureAngle\(e\),!!e\.moving\)/);
  assert.match(functionBody('drawBearModel'),/fantasyLivingMotion\(e,now,creatureAngle\(e\),!!e\.moving\)/);
  assert.match(functionBody('drawFireSnakeModel'),/fantasyLivingMotion\(e,now,creatureAngle\(e\),!!e\.moving\)/);
  assert.match(functionBody('drawWolfBodyLocal'),/motionBlend/);
  assert.match(functionBody('drawBearBodyLocal'),/motionBlend/);
  assert.match(functionBody('enemyAttackPhase'),/e\.attackAt/);
});

test('player living motion keeps authoritative movement, weapon direction and attack range unchanged',()=>{
  const player=functionBody('drawPlayer');
  assert.match(player,/fantasyLivingMotion\(p,now,angle,moveInput\)/);
  assert.match(player,/motion\.moveBlend/);
  assert.match(player,/motion\.breath/);
  assert.match(player,/angle=Math\.atan2\(p\.faceY\|\|0,p\.faceX\|\|1\)/);
  assert.match(player,/ctx\.lineTo\(x\+Math\.cos\(weaponAngle\)\*weaponLen,y\+Math\.sin\(weaponAngle\)\*weaponLen\)/);
  assert.match(functionBody('drawPlayerCombatVfx'),/currentRange\(\)/);
  assert.doesNotMatch(player,/p\.(?:x|y|faceX|faceY|attackAt|attackFx)\s*=/);
});

test('animation feel uses authoritative attack timestamps for anticipation impact and recovery without mutating combat state',()=>{
  const enemyPose=functionBody('fantasyEnemyAttackPose');
  assert.match(enemyPose,/nextAttackAt/);
  assert.match(enemyPose,/attackAt/);
  assert.match(enemyPose,/hitAt/);
  assert.match(enemyPose,/anticipation/);
  assert.match(enemyPose,/impact/);
  assert.match(enemyPose,/recovery/);
  assert.doesNotMatch(enemyPose,/e\.(?:nextAttackAt|attackAt|hitAt)\s*=/);
  const playerPose=functionBody('fantasyPlayerAttackPose');
  assert.match(playerPose,/p\?\.attackAt/);
  assert.match(playerPose,/attackActive/);
  assert.match(playerPose,/anticipation/);
  assert.match(playerPose,/impact/);
  assert.match(playerPose,/recovery/);
  assert.doesNotMatch(playerPose,/p\.(?:attackAt|attackFx)\s*=/);
});

test('dedicated creature strikes now peak on the authoritative attack event and recover afterward',()=>{
  assert.match(functionBody('drawFantasyCreatureAssetLocal'),/Math\.max\(0,1-phase\)/);
  assert.match(functionBody('drawWolfBodyLocal'),/strike=phase>=0\?Math\.max\(0,1-phase\):0/);
  assert.match(functionBody('drawBearBodyLocal'),/strike=phase>=0\?Math\.max\(0,1-phase\):0/);
  assert.match(functionBody('drawFireSnakeModel'),/strike=phase>=0\?Math\.max\(0,1-phase\):0/);
  assert.match(functionBody('drawWolfModel'),/fantasyEnemyAttackPose\(e,now\)/);
  assert.match(functionBody('drawBearModel'),/fantasyEnemyAttackPose\(e,now\)/);
  assert.match(functionBody('drawFireSnakeModel'),/fantasyEnemyAttackPose\(e,now\)/);
});

test('player attack feel stays inside the existing attack presentation window and preserves range ownership',()=>{
  const player=functionBody('drawPlayer');
  assert.match(player,/fantasyPlayerAttackPose\(p,now,attackActive\)/);
  assert.match(player,/weaponOffset/);
  assert.match(player,/drawPlayerCombatVfx\(p,x,y,now,angle,attackPose,attackActive\)/);
  assert.match(functionBody('drawPlayerCombatVfx'),/currentRange\(\)/);
  assert.doesNotMatch(player,/p\.(?:x|y|faceX|faceY|attackAt|attackFx)\s*=/);
});

test('combat vfx is stateless bounded and keyed to authoritative hit timing',()=>{
  const enemyVfx=functionBody('drawEnemyCombatVfx');
  assert.match(enemyVfx,/fantasyEnemyAttackPose\(e,now\)/);
  assert.match(enemyVfx,/e\.hitAt/);
  assert.match(enemyVfx,/remaining>110/);
  assert.match(enemyVfx,/for\(let i=0;i<4;i\+\+\)/);
  assert.doesNotMatch(enemyVfx,/push\(|splice\(|new Array|\[\]/);
  const playerVfx=functionBody('drawPlayerCombatVfx');
  assert.match(playerVfx,/attackActive/);
  assert.match(playerVfx,/p\.invuln/);
  assert.match(playerVfx,/currentRange\(\)/);
  assert.doesNotMatch(playerVfx,/push\(|splice\(|new Array|\[\]/);
  assert.doesNotMatch(source,/(?:combatFx|impactFx|hitFx)\s*=\s*\[/);
});

test('combat vfx is bound after actor rendering without changing combat ownership',()=>{
  assert.match(functionBody('drawCreature'),/drawEnemyCombatVfx\(e,x,y,now\)/);
  assert.match(functionBody('drawPlayer'),/drawPlayerCombatVfx\(p,x,y,now,angle,attackPose,attackActive\)/);
  assert.doesNotMatch(functionBody('drawEnemyCombatVfx'),/e\.(?:hp|attackAt|nextAttackAt|hitAt)\s*=/);
  assert.doesNotMatch(functionBody('drawPlayerCombatVfx'),/p\.(?:hp|attackAt|attackFx|invuln)\s*=/);
});

test('multiplayer snapshots derive visual hit timing only from authoritative hp decrease',()=>{
  const snapshot=functionBody('applyWorldSnapshot');
  assert.match(snapshot,/Number\(n\.hp\)<Number\(old\.hp\)\?now\+110/);
  assert.match(snapshot,/hitAt/);
  assert.doesNotMatch(snapshot,/n\.hp\s*=/);
  assert.doesNotMatch(snapshot,/old\.hp\s*=/);
});

test('camera presentation smooths follow and caps combat response on mobile without mutating gameplay state',()=>{
  const camera=functionBody('updateCameraPresentation');
  assert.match(camera,/camera\.area!==state\.area/);
  assert.match(camera,/Math\.exp\(-Math\.max\(0,dt\)\*followRate\)/);
  assert.match(camera,/innerWidth<=900/);
  assert.match(camera,/shakeCap=mobile\?3\.2:5\.2/);
  assert.match(camera,/p\.attackAt/);
  assert.match(camera,/p\.invuln/);
  assert.match(camera,/camera\.x=clamp/);
  assert.match(camera,/camera\.y=clamp/);
  assert.doesNotMatch(camera,/p\.(?:x|y|faceX|faceY|attackAt|attackFx|invuln)\s*=/);
});

test('camera update replaces hard snap while keeping world tap coordinates aligned to rendered camera',()=>{
  const update=functionBody('update');
  assert.match(update,/updateCameraPresentation\(p,dt,now,camW,camH\)/);
  assert.doesNotMatch(update,/state\.camera\.x=clamp\(p\.x-innerWidth\/2/);
  assert.doesNotMatch(update,/state\.camera\.y=clamp\(p\.y-innerHeight\/2/);
  const worldTap=functionBody('handleWorldTap');
  assert.match(worldTap,/e\.clientX\+state\.camera\.x/);
  assert.match(worldTap,/e\.clientY\+state\.camera\.y/);
});

test('mobile polish keeps primary touch controls at least 44px and respects safe areas',()=>{
  assert.match(source,/\.save,\.bestiary,\.multiBtn,\.home\{[^}]*min-width:44px;min-height:44px/);
  assert.match(source,/\.multiHead button\{width:44px;height:44px/);
  assert.match(source,/\.multiRow button\{[^}]*min-height:44px/);
  assert.match(source,/\.bookTabs button\{[^}]*min-height:44px/);
  assert.match(source,/\.tab,\.close\{[^}]*min-height:44px/);
  assert.match(source,/\.map\{display:none;width:78px;height:44px/);
  assert.match(source,/@media\(max-width:430px\)[\s\S]*?\.map\{width:68px;height:44px/);
  assert.match(source,/\.sheet\{left:max\(7px,env\(safe-area-inset-left\)\);right:max\(7px,env\(safe-area-inset-right\)\);top:auto;bottom:max\(7px,env\(safe-area-inset-bottom\)\)/);
});

test('mobile panels remain scrollable and joystick input recovers from lost pointer capture',()=>{
  assert.match(source,/\.smelt\{left:max\(7px,env\(safe-area-inset-left\)\)[^}]*max-height:68dvh;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y/);
  assert.match(source,/\.multiPanel\{top:max\(72px,calc\(env\(safe-area-inset-top\) \+ 54px\)\);max-height:70dvh;overflow-y:auto/);
  assert.match(source,/stick\.addEventListener\('lostpointercapture',endStick\)/);
  assert.match(source,/function endStick\(e\)\{if\(sp!==e\.pointerId\)return;sp=null;state\.stick\.x=state\.stick\.y=0/);
});

test('mobile canvas rendering degrades pixel density without changing gameplay resolution semantics',()=>{
  const resize=functionBody('resize');
  assert.match(resize,/innerWidth<=900\|\|innerHeight<=600/);
  assert.match(resize,/Math\.min\(mobileCanvas\?1\.5:2,devicePixelRatio\|\|1\)/);
  assert.match(resize,/canvas\.style\.width=innerWidth\+'px'/);
  assert.match(resize,/canvas\.style\.height=innerHeight\+'px'/);
  assert.match(source,/jaewoon_fantasy_survival_v1/);
});

test('audio feel reuses the existing bounded WebAudio primitives without a parallel sound queue',()=>{
  const combat=functionBody('playCombatAudio');
  assert.match(combat,/music\.enabled/);
  assert.match(combat,/music\.started/);
  assert.match(combat,/noiseBrush\(/);
  assert.match(combat,/smoothVoice\(/);
  assert.match(combat,/lowDrum\(/);
  assert.doesNotMatch(combat,/push\(|splice\(|new Array|\[\]/);
  const reward=functionBody('playRewardAudio');
  assert.match(reward,/smoothVoice\(/);
  assert.match(reward,/lowDrum\(/);
  assert.doesNotMatch(reward,/push\(|splice\(|new Array|\[\]/);
  assert.doesNotMatch(source,/(?:audioFx|sfxQueue|soundQueue)\s*=\s*\[/);
});

test('combat audio references the same authoritative attack and hit moments as animation vfx and camera',()=>{
  const attack=functionBody('attack');
  assert.match(attack,/p\.attackAt=now;p\.attackFx=now\+150/);
  assert.match(attack,/playCombatAudio\('swing',audioWeight\)/);
  assert.match(attack,/e\.hitAt=now\+110/);
  assert.match(attack,/playCombatAudio\('hit',audioWeight\)/);
  const damage=functionBody('damagePlayer');
  assert.match(damage,/p\.invuln=now\+520;playCombatAudio\('hurt'/);
  assert.match(functionBody('updateCameraPresentation'),/p\.attackAt/);
  assert.match(functionBody('drawEnemyCombatVfx'),/e\.hitAt/);
});

test('boss reward audio is presentation-only and preserves existing reward ownership',()=>{
  const rewardBoss=functionBody('rewardBoss');
  assert.match(rewardBoss,/addInv\('forest-wooden-sword',1\)/);
  assert.match(rewardBoss,/playRewardAudio\('boss'\)/);
  const labBoss=functionBody('finishStoryLabBoss');
  assert.match(labBoss,/playRewardAudio\('boss'\)/);
  assert.match(source,/jaewoon_fantasy_survival_v1/);
});

test('polish adds presentation-only hit-stop recoil and settle without pausing gameplay authority',()=>{
  const enemy=functionBody('fantasyEnemyAttackPose');
  assert.match(enemy,/hitStop=attackElapsed>=0&&attackElapsed<40\?1:0/);
  assert.match(enemy,/recoil=attackElapsed>=40&&attackElapsed<150/);
  assert.match(enemy,/recovery=attackElapsed>=80&&attackElapsed<360/);
  assert.match(enemy,/hitElapsed<35\?1:Math\.max\(0,1-\(hitElapsed-35\)\/75\)/);
  assert.doesNotMatch(enemy,/e\.(?:attackAt|nextAttackAt|hitAt|hp|x|y)\s*=/);
  const player=functionBody('fantasyPlayerAttackPose');
  assert.match(player,/hitStop=attackElapsed>=0&&attackElapsed<35\?1:0/);
  assert.match(player,/recoil=attackElapsed>=35&&attackElapsed<115/);
  assert.match(player,/recovery=attackElapsed>=65&&attackElapsed<150/);
  assert.doesNotMatch(player,/p\.(?:attackAt|attackFx|invuln|hp|x|y)\s*=/);
});

test('camera impact response holds the same short presentation window while preserving mobile readability caps',()=>{
  const camera=functionBody('updateCameraPresentation');
  assert.match(camera,/attackElapsed>=0&&attackElapsed<35\?1/);
  assert.match(camera,/hitElapsed>=0&&hitElapsed<40\?1/);
  assert.match(camera,/shakeCap=mobile\?3\.2:5\.2/);
  assert.doesNotMatch(camera,/p\.(?:attackAt|attackFx|invuln|hp|x|y)\s*=/);
});

test('hit-stop polish keeps frame work bounded and avoids transient queues or timers',()=>{
  for(const name of ['fantasyEnemyAttackPose','fantasyPlayerAttackPose','updateCameraPresentation']){
    const body=functionBody(name);
    assert.doesNotMatch(body,/push\(|splice\(|new Array|setTimeout\(|setInterval\(/);
  }
  assert.match(source,/playCombatAudio\('hit',audioWeight\)/);
  assert.match(functionBody('drawEnemyCombatVfx'),/e\.hitAt/);
  assert.match(source,/jaewoon_fantasy_survival_v1/);
});

test('presentation runtime exposes the central quality contract marker',()=>{
  assert.match(source,/<html lang="ko" data-presentation-quality-version="1">/);
});

test('frame stability keeps simulation delta and decorative rendering costs bounded',()=>{
  assert.match(source,/function loop\(now\)\{const dt=Math\.min\(\.033,\(now-state\.last\)\/1000\)/);
  const weather=functionBody('weatherParticleBudget');
  assert.match(weather,/return \.45/);
  assert.match(weather,/return \.7/);
  assert.match(weather,/return 1/);
  const resize=functionBody('resize');
  assert.match(resize,/Math\.min\(mobileCanvas\?1\.5:2,devicePixelRatio\|\|1\)/);
  assert.doesNotMatch(source,/(?:combatFx|impactFx|hitFx|sfxQueue|soundQueue)\s*=\s*\[/);
});

test('final presentation gate keeps all synchronized feel layers on the same preserved runtime',()=>{
  assert.match(source,/function fantasyLivingMotion\(/);
  assert.match(source,/function fantasyEnemyAttackPose\(/);
  assert.match(source,/function drawEnemyCombatVfx\(/);
  assert.match(source,/function playCombatAudio\(/);
  assert.match(source,/function updateCameraPresentation\(/);
  assert.match(source,/hitStop=attackElapsed/);
  assert.match(source,/jaewoon_fantasy_survival_v1/);
});

test('nearby auto gather keeps the existing manual gather path and mobile toggle reachable',()=>{
  assert.match(source,/id="autoGather"[^>]*data-mechanic-id="auto-gather-toggle"[^>]*aria-pressed="false">자동 OFF<\/button>/);
  assert.match(source,/\.autoGather\{height:44px/);
  assert.match(source,/@media\(max-width:430px\)[\s\S]*?\.autoGather\{height:44px;font-size:9px\}/);
  assert.match(source,/gather\(state\.gathering\.manualTarget,false\)/);
});

test('auto gather reuses authoritative resource balance and tool gates instead of duplicating rewards',()=>{
  const gather=functionBody('gather');
  assert.match(gather,/let amount=1;if\(tool\?\.target===best\.kind\)amount=tool\.mult;if\(best\.kind==='iron'\|\|best\.kind==='poisonstone'\|\|best\.kind==='sunstone'\)amount=1/);
  assert.match(gather,/best\.kind==='iron'.*stone-pick.*iron-pick.*gold-pick/);
  assert.match(gather,/best\.kind==='gold'.*p\.tool!=='iron-pick'/);
  assert.match(gather,/best\.kind==='poisonstone'.*p\.tool!=='gold-pick'/);
  assert.match(gather,/best\.kind==='essence'&&!axeId/);
  assert.match(functionBody('equippedAxeId'),/iron-axe.*gold-axe/);
  const auto=functionBody('updateAutoGather');
  assert.match(auto,/nearestGatherResource\(\)/);
  assert.match(auto,/gather\(target,true\)/);
  assert.doesNotMatch(auto,/wood\+\=|stone\+\=|fiber\+\=|ironOre\+\=|goldOre\+\=|essence\+\=/);
});

test('auto gather is nearest-only local runtime state and does not alter save or multiplayer semantics',()=>{
  assert.match(source,/SAVE_KEY='jaewoon_fantasy_survival_v1',SAVE_VERSION=(?:[7-9]\d|[1-9]\d{2,})/);
  assert.match(source,/gathering:\{auto:false,target:null,manualTarget:null,nextAt:0,blockedUntil:0\}/);
  const nearest=functionBody('nearestGatherResource');
  assert.match(nearest,/for\(const n of resourceNodes\(\)\)/);
  assert.match(nearest,/if\(d<bestD\)\{best=n;bestD=d\}/);
  const save=functionBody('saveGame');
  assert.match(save,/settings:\{difficulty:.*autoGather/);
  assert.doesNotMatch(save,/gathering:\{/);
  const gather=functionBody('gather');
  assert.match(gather,/multiplayer\.connected&&!multiIsHost\(\)/);
  assert.match(gather,/multiSend\('resource-gather'/);
  assert.doesNotMatch(functionBody('updateAutoGather'),/multiSend|multiBroadcast|channel/);
});

test('auto gather stops on combat attack hit range exit and resource depletion',()=>{
  const combat=functionBody('playerCombatActive');
  assert.match(combat,/e\.hostile\|\|e\.enemyTarget\|\|state\.pet\.targetId===e\.netId/);
  const auto=functionBody('updateAutoGather');
  assert.match(auto,/playerCombatActive\(\)/);
  assert.match(auto,/now<\(p\.stunnedUntil\|\|0\)/);
  assert.match(auto,/nearestGatherResource\(\)/);
  assert.match(auto,/if\(!gathered\|\|target\.dead\)g\.target=null/);
  assert.match(functionBody('attack'),/interruptAutoGather\(now\)/);
  assert.match(functionBody('damagePlayer'),/interruptAutoGather\(now\)/);
  assert.match(functionBody('updateHazards'),/interruptAutoGather\(now\)/);
});

test('manual world targeting stays separate from automatic nearest selection',()=>{
  const tap=functionBody('handleWorldTap');
  assert.match(tap,/state\.gathering\.manualTarget=gatherTarget/);
  assert.match(tap,/채집 대상 지정/);
  const gather=functionBody('gather');
  assert.match(gather,/if\(target&&!target\.dead\)/);
  assert.match(gather,/지정한 자원 가까이 가/);
  const auto=functionBody('updateAutoGather');
  assert.doesNotMatch(auto,/manualTarget/);
});


test('world tree inner room is reachable from original world tree without resizing the exterior region',()=>{
  assert.match(source,/WORLD_TREE_POLY=\[\{x:6180,y:9150\},\{x:11820,y:9150\},\{x:11820,y:10000\},\{x:6180,y:10000\}\]/);
  assert.match(source,/WORLD_TREE_INTERIOR=\{w:3200,h:2300/);
  assert.match(functionBody('enterWorldTreeInterior'),/state\.area='worldtreeinside'/);
  assert.match(functionBody('leaveWorldTreeInterior'),/state\.area='surface'/);
  assert.match(functionBody('handleWorldTap'),/worldtree-inner-door/);
  assert.match(functionBody('handleWorldTap'),/worldtree-inner-exit/);
  assert.match(functionBody('drawWorldTreeInterior'),/Living|나이테|발광/);
  assert.doesNotMatch(functionBody('draw'),/drawWorldTreeInterior/); // 오너 지시: 2D 대체 화면 금지
  assert.match(functionBody('update'),/WORLD_TREE_INTERIOR\.w-85/);
  assert.match(source,/s\.area==='worldtreeinside'\?'worldtreeinside'/);
  assert.match(source,/jaewoon_fantasy_survival_v1/);
  assert.match(functionBody('summonBoss'),/rootsovereign/);
});

test('world tree interior has bear golem and snake, and the neutral tier-three golem keeps exact owner numbers',()=>{
  assert.match(source,/worldtreegolem:\{id:'worldtreegolem',name:'세계수 골렘',mood:'neutral',hp:586,dmg:48/);
  assert.match(source,/worldtreesnake:\{id:'worldtreesnake',name:'세계수 뱀'/);
  assert.match(source,/worldtreegolem:3,worldtreesnake:3/);
  const init=functionBody('initWorld');
  assert.match(init,/\['worldtreebear',800,1130\]/);
  assert.match(init,/\['worldtreegolem',1610,950\]/);
  assert.match(init,/\['worldtreesnake',970,1580\]/);
  assert.match(init,/e\.area='worldtreeinside'/);
  assert.match(source,/worldtreebear:\{id:'worldtreebear',name:'세계수 곰',mood:'aggressive',hp:380,dmg:28,speed:70,r:30/);
});

test('golem launches four roots every two seconds with 50 percent roll and no hit damage or attack lock',()=>{
  const launch=functionBody('throwWorldTreeRoots'),update=functionBody('update');
  assert.match(launch,/e\.nextWorldTreeRootsAt=now\+2000/);
  assert.match(launch,/Math\.random\(\)>=\.5/);
  assert.match(launch,/i<4/);
  assert.match(launch,/kind:'worldtreeRoot'/);
  assert.match(launch,/damage:0/);
  const projectile=functionBody('updateProjectiles');
  const rootEffect=projectile.slice(projectile.indexOf("if(q.kind==='worldtreeRoot'){"));
  assert.match(rootEffect,/rootedUntil=Math\.max\(p\.rootedUntil\|\|0,now\+3000\)/);
  assert.doesNotMatch(rootEffect.slice(0,rootEffect.indexOf("if(q.kind==='toxicGasShot')")) ,/damagePlayer\(/);
  assert.match(update,/now>=\(p\.rootedUntil\|\|0\)/);
  assert.doesNotMatch(functionBody('attack'),/rootedUntil/);
  assert.match(functionBody('applyRemoteEnemyEffect'),/kind==='rootbind'/);
  assert.match(functionBody('drawProjectiles'),/kind==='worldtreeRoot'/);
});

test('world tree chamber art and cellar entrance are bound to the existing tap and floor renderer',()=>{
  assert.match(source,/WORLD_TREE_INTERIOR=\{w:3200,h:2300,[^;]*basement:\{x:1600,y:335\}/);
  const tap=functionBody('handleWorldTap'),inside=functionBody('drawWorldTreeInterior');
  assert.match(tap,/worldtree-basement-entrance/);
  assert.match(tap,/WORLD_TREE_INTERIOR\.basement\.x/);
  assert.match(inside,/뿌리 회랑/);
  assert.match(inside,/고목 심장/);
  assert.match(inside,/floor\.addColorStop\(0,'#617756'\)/);
  assert.match(inside,/수액 정원/);
  assert.match(inside,/세계수 지하 · 두 번 눌러 내려가기/);
  assert.doesNotMatch(functionBody('draw'),/drawWorldTreeInterior\(cx,cy/);
});

test('underground entrance and exit round-trip preserve the previous outdoor passage and saved world tree destination',()=>{
  const enter=functionBody('enterCave'),leave=functionBody('leaveCave'),save=functionBody('saveGame'),load=functionBody('loadGame');
  assert.match(enter,/state\.area==='worldtreeinside'/);
  assert.match(enter,/if\(!fromInterior\)state\.surfacePos=/);
  assert.match(enter,/state\.caveReturnArea=fromInterior\?'worldtreeinside':'surface'/);
  assert.match(leave,/const toInterior=state\.caveReturnArea==='worldtreeinside'/);
  assert.match(leave,/state\.area=toInterior\?'worldtreeinside':'surface'/);
  assert.match(leave,/state\.caveReturnArea='surface'/);
  assert.match(save,/caveReturnArea:state\.caveReturnArea/);
  assert.match(load,/s\.caveReturnArea==='worldtreeinside'\?'worldtreeinside':'surface'/);
  assert.match(enter,/CAVE_ENTRY/);
  assert.match(leave,/TREE_HOLE/);
});

test('world tree basement is bright without a torch while quest cave darkness remains unchanged',()=>{
  const underground=functionBody('drawCave'),dark=functionBody('drawQuestDarkness');
  assert.match(underground,/stoneFloor\.addColorStop\(0,'#928797'\)/);
  assert.match(underground,/세계수 지하 · 봉인의 뿌리/);
  assert.match(underground,/BOSS_ALTAR/);
  assert.match(dark,/const basement=state\.area==='underground'/);
  assert.match(dark,/basement\?'rgba\(12,12,19,\.06\)':'rgba\(0,0,0,\.91\)'/);
  assert.match(dark,/light\.lit\?430:78/);
  assert.match(functionBody('summonBoss'),/state\.bossSummoned=true/);
  assert.match(source,/worldtreegolem:\{id:'worldtreegolem',name:'세계수 골렘',mood:'neutral',hp:586,dmg:48/);
});


test('snake spell morphs actual roots to real hostile combat enemies and restores originals after death or 10s',()=>{
 const spell=functionBody('updateWorldTreeRootSnakes'),draw=functionBody('drawWorldTreeInterior');
 assert.match(source,/WORLD_TREE_ROOT_SNAKES=Object\.freeze\(\{intervalMs:3000,probability:\.67,durationMs:10000,maxRoots:5,range:400\}\)/);
 assert.match(spell,/multiplayer\.connected&&!multiIsHost\(\)/);
 assert.match(spell,/caster\.type\?\.id!=='worldtreesnake'/);
 assert.match(spell,/Number\.isInteger\(caster\.rootMorphIndex\)/);
 assert.match(spell,/Math\.random\(\)>=WORLD_TREE_ROOT_SNAKES\.probability/);
 assert.match(spell,/now>=\(snake\.rootMorphUntil\|\|0\)/);
 assert.match(spell,/snake\.hp=0/);
 assert.match(spell,/spawnAt\(creatures\.worldtreesnake,anchor\.x,anchor\.y,null\)/);
 assert.match(spell,/snake\.rootMorphIndex=index/);
 assert.match(spell,/snake\.rootMorphUntil=now\+WORLD_TREE_ROOT_SNAKES\.durationMs/);
 assert.match(spell,/snake\.noRespawn=true/);
 assert.match(spell,/state\.enemies\.push\(snake\)/);
 assert.match(draw,/transformedRoots\.has\(i\)/);
 assert.match(draw,/worldTreeRootPosition\(i\)/);
 assert.match(functionBody('update'),/updateWorldTreeRootSnakes\(now\)/);
 assert.match(functionBody('serializeWorld'),/rootMorphIndex:Number\.isInteger\(e\.rootMorphIndex\)/);
 assert.match(functionBody('applyWorldSnapshot'),/rootMorphIndex:Number\.isInteger\(n\.rootMorphIndex\)/);
 assert.doesNotMatch(source,/worldTreeSnakeIllusion|updateWorldTreeSnakeIllusion|IllusorySnake/);
 assert.match(source,/worldtreesnake:\{id:'worldtreesnake',name:'세계수 뱀',mood:'aggressive',hp:250,dmg:39/);
});


test('goblin outpost entrance is on the western world tree field and marked on maps',()=>{
 const match=source.match(/const GOBLIN_OUTPOST_ENTRANCE=\{x:(\d+),y:(\d+),r:92\}/);
 assert.ok(match,'전초기지 입구 좌표가 있어야 함');
 const x=Number(match[1]),y=Number(match[2]);
 assert.ok(x>=6180&&x<9000&&y>=9150&&y<=10000,'세계수 서쪽 지상에 있어야 함');
 assert.doesNotMatch(functionBody('draw'),/drawGoblinOutpostEntrance\(cx,cy\)/);
 assert.match(functionBody('drawGoblinOutpostEntrance'),/fillText\('고블린 전초기지'/);
 assert.match(functionBody('drawMap'),/GOBLIN_OUTPOST_ENTRANCE\.x\*sx/);
 assert.match(functionBody('drawMiniMap'),/landmark\(GOBLIN_OUTPOST_ENTRANCE\.x,GOBLIN_OUTPOST_ENTRANCE\.y/);
});

test('goblin crossbow arrow velocity is 0.4x baseline without damage or lifetime changes',()=>{
 const fire=functionBody('fireGoblinCrossbow');
 assert.match(fire,/speed=\(Number\(p\.speed\)\|\|state\.player\.speed\)\*2/);
 assert.doesNotMatch(fire,/\*5/);
 assert.match(fire,/kind:'goblinCrossbowArrow'/);
 assert.match(fire,/life:2600/);
 assert.match(fire,/damage:23/);
 assert.match(source,/쇠뇌병\. 2\.8초마다 플레이어 2배 속도의 비유도 화살을 발사한다\./);
 const state={projectiles:[],player:{speed:185}};
 const fireArrow=new Function('state','multiplayer',`return (${fire})`)(state,{playerId:'local-player'});
 fireArrow({x:0,y:0,netId:'goblin-test',area:'goblinoutpost-1'}, {x:100,y:0,speed:185},1000);
 assert.equal(state.projectiles.length,1);
 const arrow=state.projectiles[0];
 assert.equal(arrow.speed,370);
 assert.equal(arrow.vx,370);
 assert.equal(arrow.vy,0);
 assert.equal(arrow.life,2600);
 assert.equal(arrow.damage,23);
});

test('stone fiber and tree density is exactly fourfold only in ordinary forest and existing other biome nodes remain unchanged',()=>{
 const generate=functionBody('spawnForestResourceNodes'),node=functionBody('makeNode');
 assert.match(node,/forestOnly=false/);
 assert.match(node,/forestOnly&&regionAt\(x,y\)!=='forest'/);
 assert.match(generate,/forestCount\*3/);
 assert.match(functionBody('initWorld'),/state\.trees=spawnForestResourceNodes\('tree',840\)/);
 assert.match(functionBody('initWorld'),/state\.rocks=spawnForestResourceNodes\('rock',680\)/);
 assert.match(functionBody('initWorld'),/state\.fibers=spawnForestResourceNodes\('fiber',880\)/);
 const makeNode=(kind,i,forestOnly=false)=>({id:kind+i,kind,x:forestOnly?0:i%2,y:0});
 const regionAt=(x,y)=>x===0?'forest':'snow';
 const create=new Function('makeNode','regionAt',`return (${generate})`)(makeNode,regionAt);
 for(const kind of ['tree','rock','fiber']){
  const all=create(kind,6);
  const original=all.slice(0,6);
  assert.equal(original.filter(n=>regionAt(n.x,n.y)==='forest').length,3);
  assert.equal(all.filter(n=>regionAt(n.x,n.y)==='forest').length,12);
  assert.equal(all.filter(n=>regionAt(n.x,n.y)==='snow').length,3);
  assert.equal(new Set(all.map(n=>n.id)).size,all.length);
 }
 assert.match(source,/RESOURCE_RESPAWN_MS=300000/);
 assert.match(source,/jaewoon_fantasy_survival_v1/);
});
