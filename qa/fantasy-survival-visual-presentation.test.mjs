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
