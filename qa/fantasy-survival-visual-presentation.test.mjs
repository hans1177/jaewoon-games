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
