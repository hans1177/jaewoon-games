import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildAutonomousWorkOrder } from '../tools/autonomous-work-planner.mjs';
import { build24hAutonomousWorkOrder, rankDevelopmentFocus, selectContinuousTarget } from '../tools/autonomous-24h-work-planner.mjs';

const portfolio=JSON.parse(fs.readFileSync('autonomous-portfolio.json','utf8'));
const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
const filesystem={existsSync:()=>true};
const completed=(gameId,state='DESIGN_BASELINE')=>({gameId,status:'completed-artbook',lifecycle:{state}});
const artbooks={artbooks:[
  completed('daechung-rpg'),
  completed('survival'),
  completed('insect-survival'),
  completed('bug-defense'),
  completed('crystal-defense'),
]};

test('owner portfolio is exactly 2 release, 3 development, remainder design-only',()=>{
  const release=portfolio.projects.filter(row=>row.profileStatus==='RELEASE_CONFIRMED');
  const development=portfolio.projects.filter(row=>row.profileStatus==='DEVELOPMENT_CONFIRMED');
  const design=portfolio.projects.filter(row=>row.profileStatus==='DESIGN_ONLY');
  assert.deepEqual(release.map(row=>row.slug).sort(),['daechung-rpg','survival']);
  assert.deepEqual(development.map(row=>row.slug).sort(),['bug-defense','crystal-defense','insect-survival']);
  assert.equal(release.length,2);
  assert.equal(development.length,3);
  assert.equal(design.length,portfolio.projects.length-5);
  assert.ok(design.every(row=>row.productionTier===3&&row.targetEngine==='design-only'));
});

test('catalog exposes the same three-tier classification without deleting public web archives',()=>{
  const release=catalog.games.filter(row=>row.homepageCategory==='release-confirmed');
  const development=catalog.games.filter(row=>row.homepageCategory==='development-confirmed');
  const design=catalog.games.filter(row=>row.homepageCategory==='design-only');
  assert.deepEqual(release.map(row=>row.id).sort(),['daechung-rpg','survival']);
  assert.deepEqual(development.map(row=>row.id).sort(),['bug-defense','crystal-defense','insect-survival']);
  assert.equal(release.length,2);
  assert.equal(development.length,3);
  assert.equal(design.length,catalog.games.length-5);
  assert.equal(catalog.games.find(row=>row.id==='chess-battle').homepageWebPlayable,true);
  assert.equal(catalog.games.find(row=>row.id==='survival2').homepageWebPlayable,true);
  assert.equal(catalog.games.find(row=>row.id==='territory-war').homepageWebPlayable,true);
});

test('only one release-confirmed game owns deep focus and daechung-rpg wins it',()=>{
  assert.equal(portfolio.developmentFocusPolicy.focusStage,'RELEASE_CONFIRMED');
  assert.equal(portfolio.developmentFocusPolicy.maxFocusedGames,1);
  const ranked=rankDevelopmentFocus({portfolio,catalog,artbooks,filesystem});
  assert.deepEqual(ranked.slice(0,2).map(row=>row.id),['P0006','P0001']);
  const target=selectContinuousTarget({portfolio,catalog,artbooks,filesystem,queueState:{version:2,attempts:[]},date:'2026-09-10'});
  assert.deepEqual(target.focusedGameIds,['P0006']);
  assert.deepEqual(target.nextFocusGameIds,['P0001']);
  assert.deepEqual(target.nextDevelopmentGameIds,['P0002','P0004','P0003']);
  assert.equal(target.project.id,'P0002');
  assert.equal(target.projectLane,'TIER2_WEB_FIRST_IMPLEMENTATION');
});

test('tier2 Web work is a first playable implementation and never claims full artbook reproduction',()=>{
  const order=build24hAutonomousWorkOrder({
    portfolio,catalog,artbooks,filesystem,
    health:{games:[]},diagnostics:{},queueState:{version:2,attempts:[]},date:'2026-09-10',
  });
  assert.equal(order.run,true);
  assert.equal(order.gameId,'P0002');
  assert.equal(order.selectedReason,'TIER2_WEB_FIRST_IMPLEMENTATION');
  assert.equal(order.workLane,'FULL');
  assert.match(order.goal,/WEB_FIRST_IMPLEMENTATION/);
  assert.match(order.goal,/전체 기능을 한 번에 재현하지 않는다/);
  assert.deepEqual(order.continuous24h.focusedGameIds,['P0006']);
  assert.deepEqual(order.continuous24h.nextFocusGameIds,['P0001']);
});

test('explicit tier1 priority is handed to the Unity focus lane instead of Web feature development',()=>{
  const order=build24hAutonomousWorkOrder({
    portfolio,catalog,artbooks,filesystem,
    health:{games:[]},diagnostics:{},queueState:{version:2,attempts:[]},date:'2026-09-10',priorityGameId:'daechung-rpg',
  });
  assert.equal(order.run,false);
  assert.equal(order.reason,'TIER1_UNITY_FOCUS_HANDOFF');
  assert.deepEqual(order.continuous24h.focusedGameIds,['P0006']);
});

test('tier3 design-only game cannot enter autonomous code work',()=>{
  const designProject=portfolio.projects.find(row=>row.id==='P0005');
  const designCatalog={games:[catalog.games.find(row=>row.id===designProject.slug)]};
  const order=buildAutonomousWorkOrder({
    portfolio:{...portfolio,projects:[designProject]},catalog:designCatalog,artbooks:{artbooks:[completed(designProject.slug)]},
    health:{games:[]},diagnostics:{[designProject.slug]:{issues:[],topIssue:null}},queueState:{version:1,attempts:[]},date:'2026-09-10',filesystem,
  });
  assert.equal(order.run,false);
  assert.equal(order.reason,'PLANNING_IDENTITY_REQUIRED');
});
