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
  assert.match(player,/currentRange\(\)/);
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
  assert.match(player,/p\.faceX\*27/);
  assert.match(player,/p\.faceY\*27/);
  assert.match(player,/currentRange\(\)\*\.72/);
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
  assert.match(player,/currentRange\(\)\*\.72/);
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
