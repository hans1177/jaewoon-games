import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p));

const cases=[
 {id:'cozy-island',graphics:'COZY_CHIBI_STORYBOOK',world:'COZY_CHIBI_KINGDOM_WORLD_V8',character:'COZY_CHIBI_KINGDOM',design:'design/cozy-island/2026-09-22/design-revised.json',md:'design/cozy-island/2026-09-22/GAME_DESIGN.md'},
 {id:'daechung-rpg',graphics:'RPG_HEROIC_PORTAL_FANTASY',world:'RPG_FANTASY_SILHOUETTE_WORLD_V4',character:'RPG_HEROIC_FANTASY_SILHOUETTE',design:'design/daechung-rpg/2026-09-22/design-revised.json',md:'design/daechung-rpg/2026-09-22/GAME_DESIGN.md'},
 {id:'horror-escape-room',graphics:'REALISTIC_HUMANS_ABERRANT_MONSTERS',world:'INFECTION_HORROR_V9',character:'REALISTIC_HUMANS_ABERRANT_MONSTERS',design:'design/horror-escape-room/2026-09-22/design-revised.json',md:'design/horror-escape-room/2026-09-22/GAME_DESIGN.md'}
];

test('주력 3게임 launch가 authoritative 설계문서와 그래픽 계약을 명시한다',()=>{
 for(const c of cases){
  const launch=json('roblox-games/'+c.id+'/launch-mvp.json');
  assert.equal(launch.designContract.authorityBranch,'company-runtime',c.id);
  assert.equal(launch.designContract.designJsonPath,c.design,c.id);
  assert.equal(launch.designContract.designMarkdownPath,c.md,c.id);
  assert.equal(launch.artDirection,c.graphics,c.id);
  assert.equal(launch.designContract.graphicsConcept,c.graphics,c.id);
 }
});

test('설계 그래픽 계약이 실제 서버 런타임 마커와 일치한다',()=>{
 for(const c of cases){
  const server=read('roblox-games/'+c.id+'/server/Game.server.luau');
  assert.ok(server.includes(c.world),c.id+' world art');
  assert.ok(server.includes(c.character),c.id+' character art');
 }
});

test('심야 설계계약은 4대4 240초 감염전 코드와 일치한다',()=>{
 const launch=json('roblox-games/horror-escape-room/launch-mvp.json');
 const config=read('roblox-games/horror-escape-room/shared/GameConfig.luau');
 const server=read('roblox-games/horror-escape-room/server/Game.server.luau');
 assert.match(config,/TargetPopulation=8,SurvivorSlots=4,MonsterSlots=4,RoundSeconds=240/);
 assert.ok(launch.launchCore.includes('240-second infection rounds'));
 assert.ok(!launch.launchCore.some(x=>x.includes('180-second')));
 assert.match(config,/HumanForms=/);
 assert.match(server,/local function infectPlayer\(p\)/);
 assert.match(server,/local function purify\(p\)/);
 assert.match(server,/if humans==0 then endRound\("MONSTER"\)/);
 assert.match(server,/if monsters==0 then endRound\("SURVIVOR"\)/);
});

test('대충 RPG 설계계약은 5포탈 10AI 15킬 파티사냥 코드와 일치한다',()=>{
 const launch=json('roblox-games/daechung-rpg/launch-mvp.json');
 const config=read('roblox-games/daechung-rpg/shared/GameConfig.luau');
 assert.equal((config.match(/Class="(?:NONE|HEALER|WARRIOR|ARCHER)"/g)||[]).length,10);
 assert.match(config,/PartyHuntTarget=15/);
 assert.ok(launch.launchCore.includes('five portal-separated hunting grounds/dungeons'));
 assert.ok(launch.launchCore.includes('ten AI users: 2 none, 2 healer, 3 warrior, 3 archer'));
});

test('포근섬 설계계약은 직접채집 주민자동화 병영 5거점 코드와 일치한다',()=>{
 const launch=json('roblox-games/cozy-island/launch-mvp.json');
 const server=read('roblox-games/cozy-island/server/Game.server.luau');
 for(const item of ['manual world-node wood and food gathering','resident hiring and worker automation','barracks and troop recruitment','five resource bases with distinct defenders/rewards'])assert.ok(launch.launchCore.includes(item),item);
 for(const marker of ['ManualGatherForest','HomeNPCs','HomeMobs','BoarBody','BoarSnout'])assert.ok(server.includes(marker),marker);
});
