import test from 'node:test';
import assert from 'node:assert/strict';
import { build24hAutonomousWorkOrder, rankDevelopmentFocus, selectContinuousTarget } from '../tools/autonomous-24h-work-planner.mjs';
import { runDepartmentRole } from '../tools/autonomous-department-cycle.mjs';
import { rebalanceProductionTiers } from '../tools/company-status-sync.mjs';

const filesystem={existsSync:()=>true};
const portfolio={status:'ACTIVE',paidApi:false,projects:[
  {id:'P1',slug:'a',sourcePath:'web-games/a',profileStatus:'DEVELOPMENT_CONFIRMED',mode:'IMPROVE'},
  {id:'P2',slug:'b',sourcePath:'web-games/b',profileStatus:'NEEDS_AUDIT',mode:'EXPERIMENT_ONLY'},
  {id:'P3',slug:'release',sourcePath:'web-games/release',profileStatus:'RELEASE_CONFIRMED',mode:'MAINTENANCE'},
]};
const artbooks={artbooks:[
  {id:'a1',gameId:'a',createdAt:'2026-09-09T01:00:00Z',status:'completed-artbook',lifecycle:{state:'DESIGN_BASELINE'}},
  {id:'b1',gameId:'b',createdAt:'2026-09-09T02:00:00Z',status:'completed-artbook',lifecycle:{state:'DESIGN_BASELINE'}},
  {id:'r1',gameId:'release',createdAt:'2026-09-09T03:00:00Z',status:'completed-artbook',lifecycle:{state:'DESIGN_BASELINE'}},
]};
const catalog={games:[
  {id:'a',homepageCategory:'development-confirmed'},
  {id:'b',homepageCategory:'reviewing'},
  {id:'release',homepageCategory:'release-confirmed'},
]};

test('24h target rotates toward the completed artbook with fewer floors today when focus policy is absent',()=>{
  const queueState={version:1,attempts:[
    {date:'2026-09-09',gameId:'P1'},
    {date:'2026-09-09',gameId:'P1'},
    {date:'2026-09-09',gameId:'P2'},
  ]};
  const target=selectContinuousTarget({portfolio,artbooks,catalog,queueState,date:'2026-09-09',filesystem});
  assert.equal(target.project.id,'P2');
  assert.equal(target.attemptsToday,1);
});

test('newly completed artbook priority handoff overrides round-robin selection when focus policy is absent and source root is free',()=>{
  const queueState={version:1,attempts:[{date:'2026-09-09',gameId:'P2'}]};
  const target=selectContinuousTarget({portfolio,artbooks,catalog,queueState,date:'2026-09-09',priorityGameId:'a',filesystem});
  assert.equal(target.project.id,'P1');
  assert.equal(target.explicitPriority,true);
});

test('active source-root lease makes the planner choose a different game in parallel when focus policy is absent',()=>{
  const queueState={version:2,attempts:[
    {date:'2026-09-09',gameId:'P1',gameSlug:'a',sourcePath:'web-games/a',status:'RESERVED',leaseExpiresAt:'2026-09-09T02:30:00Z'},
  ]};
  const target=selectContinuousTarget({portfolio,artbooks,catalog,queueState,date:'2026-09-09',filesystem,now:new Date('2026-09-09T02:00:00Z')});
  assert.equal(target.project.id,'P2');
  assert.deepEqual(target.activeGameIds,['P1']);
});

test('priority handoff cannot start a duplicate floor while that game root is leased',()=>{
  const queueState={version:2,attempts:[
    {date:'2026-09-09',gameId:'P1',gameSlug:'a',sourcePath:'web-games/a',status:'RESERVED',leaseExpiresAt:'2026-09-09T02:30:00Z'},
  ]};
  const target=selectContinuousTarget({portfolio,artbooks,catalog,queueState,date:'2026-09-09',priorityGameId:'a',filesystem,now:new Date('2026-09-09T02:00:00Z')});
  assert.equal(target.project,null);
  assert.equal(target.blockedByActive,true);
  assert.equal(target.requestedGameId,'P1');
});

test('all active eligible roots stop fanout cleanly instead of falling through to duplicate work',()=>{
  const queueState={version:2,attempts:[
    {date:'2026-09-09',gameId:'P1',sourcePath:'web-games/a',status:'RESERVED',leaseExpiresAt:'2026-09-09T02:30:00Z'},
    {date:'2026-09-09',gameId:'P2',sourcePath:'web-games/b',status:'RESERVED',leaseExpiresAt:'2026-09-09T02:30:00Z'},
  ]};
  const order=build24hAutonomousWorkOrder({portfolio,artbooks,health:{games:[]},catalog,queueState,date:'2026-09-09',filesystem,now:new Date('2026-09-09T02:00:00Z')});
  assert.equal(order.run,false);
  assert.equal(order.reason,'ALL_ELIGIBLE_SOURCE_ROOTS_ACTIVE');
});

test('released main source invalidates the old lease and makes the game eligible again',()=>{
  const queueState={version:2,attempts:[
    {date:'2026-09-09',gameId:'P1',sourcePath:'web-games/a',status:'RESERVED',leaseExpiresAt:'2026-09-09T02:30:00Z'},
    {date:'2026-09-09',gameId:'P2',sourcePath:'web-games/b',status:'RESERVED',leaseExpiresAt:'2026-09-09T02:30:00Z'},
  ]};
  const target=selectContinuousTarget({portfolio,artbooks,catalog,queueState,date:'2026-09-09',filesystem,now:new Date('2026-09-09T02:00:00Z'),isSourceReleased:row=>row.gameId==='P1'});
  assert.equal(target.project.id,'P1');
});

test('release-confirmed stable game is not fed into arbitrary 24h feature development',()=>{
  const target=selectContinuousTarget({portfolio:{status:'ACTIVE',paidApi:false,projects:[portfolio.projects[2]]},artbooks,catalog,queueState:{version:1,attempts:[]},date:'2026-09-09',filesystem});
  assert.equal(target,null);
});

test('focus policy keeps only two deep-development games and counts dedicated Unity as one slot',()=>{
  const focusedPortfolio={
    status:'ACTIVE',paidApi:false,
    developmentFocusPolicy:{maxFocusedGames:2,focusThreshold:8,nextDevelopmentThreshold:5},
    projects:[
      {id:'P1',slug:'a',sourcePath:'web-games/a',profileStatus:'DEVELOPMENT_CONFIRMED',mode:'IMPROVE',developmentFocus:{total:9}},
      {id:'P2',slug:'b',sourcePath:'web-games/b',profileStatus:'NEEDS_AUDIT',mode:'EXPERIMENT_ONLY',developmentFocus:{total:8}},
      {id:'P6',slug:'unity',sourcePath:'web-games/unity',profileStatus:'DEVELOPMENT_CONFIRMED',mode:'EXPERIMENT_ONLY',dedicatedDevelopmentLane:'UNITY_PRIMARY',developmentFocus:{total:8}},
    ],
  };
  const focusedBooks={artbooks:[
    {gameId:'a',status:'completed-artbook',lifecycle:{state:'DESIGN_BASELINE'}},
    {gameId:'b',status:'completed-artbook',lifecycle:{state:'DESIGN_BASELINE'}},
    {gameId:'unity',status:'completed-artbook',lifecycle:{state:'DESIGN_BASELINE'}},
  ]};
  const focusedCatalog={games:[
    {id:'a',homepageCategory:'development-confirmed'},
    {id:'b',homepageCategory:'development-confirmed'},
    {id:'unity',homepageCategory:'development-confirmed'},
  ]};
  const ranked=rankDevelopmentFocus({portfolio:focusedPortfolio,catalog:focusedCatalog,artbooks:focusedBooks,filesystem});
  assert.deepEqual(ranked.map(x=>x.id),['P1','P6','P2']);
  const target=selectContinuousTarget({portfolio:focusedPortfolio,artbooks:focusedBooks,catalog:focusedCatalog,queueState:{version:2,attempts:[]},date:'2026-09-09',filesystem});
  assert.equal(target.project.id,'P1');
  assert.deepEqual(target.focusedGameIds,['P1','P6']);
  assert.deepEqual(target.nextDevelopmentGameIds,['P2']);
});

test('non-focused artbook priority cannot steal a deep-development slot',()=>{
  const focusedPortfolio={
    status:'ACTIVE',paidApi:false,
    developmentFocusPolicy:{maxFocusedGames:1,focusThreshold:8,nextDevelopmentThreshold:5},
    projects:[
      {id:'P1',slug:'a',sourcePath:'web-games/a',profileStatus:'DEVELOPMENT_CONFIRMED',mode:'IMPROVE',developmentFocus:{total:9}},
      {id:'P2',slug:'b',sourcePath:'web-games/b',profileStatus:'NEEDS_AUDIT',mode:'EXPERIMENT_ONLY',developmentFocus:{total:8}},
    ],
  };
  const focusedCatalog={games:[{id:'a',homepageCategory:'development-confirmed'},{id:'b',homepageCategory:'development-confirmed'}]};
  const target=selectContinuousTarget({portfolio:focusedPortfolio,artbooks,catalog:focusedCatalog,queueState:{version:2,attempts:[]},date:'2026-09-09',priorityGameId:'b',filesystem});
  assert.equal(target.project.id,'P1');
  assert.equal(target.explicitPriority,false);
});

test('runtime incident preempts deep development through FAST lane',()=>{
  const focusPortfolio={
    status:'ACTIVE',paidApi:false,maxModelCallsPerRun:2,maxRunnerMinutesPerRun:20,
    developmentFocusPolicy:{maxFocusedGames:1,focusThreshold:8,nextDevelopmentThreshold:5,fastLane:{reviewRoles:['development','qa'],implementationRoles:['development']}},
    projects:[
      {id:'P1',slug:'a',name:'A',sourcePath:'web-games/a',profileStatus:'DEVELOPMENT_CONFIRMED',mode:'IMPROVE',developmentFocus:{total:9},protectedValues:['core-loop']},
      {id:'P3',slug:'release',name:'Release',sourcePath:'web-games/release',profileStatus:'RELEASE_CONFIRMED',mode:'MAINTENANCE',protectedValues:['public-stable']},
    ],
  };
  const health={games:[{gameId:'release',status:'warning',issues:['404 asset'],healthReason:'same-origin-resource-failure'}]};
  const order=build24hAutonomousWorkOrder({portfolio:focusPortfolio,artbooks,health,catalog,diagnostics:{},queueState:{version:2,attempts:[]},date:'2026-09-09',filesystem});
  assert.equal(order.gameId,'P3');
  assert.equal(order.workLane,'FAST');
  assert.deepEqual(order.departmentReviewRoles,['development','qa']);
  assert.deepEqual(order.implementationRoles,['development']);
});

test('FAST lane skips nonessential department AI calls deterministically',async()=>{
  const order={run:true,workLane:'FAST',goal:'404 경로 하나만 복구',gameId:'P',gameName:'P'};
  const result=await runDepartmentRole({role:'graphics',order,book:null,vibeCore:{}});
  assert.equal(result.workState,'DONE');
  assert.equal(result.skippedFast,true);
  assert.equal(result.model,'none');
});

const tierFixture=()=>({
  portfolio:{
    status:'ACTIVE',paidApi:false,maxModelCallsPerRun:2,maxRunnerMinutesPerRun:20,
    productionTierPolicy:{releaseConfirmedCount:2,developmentConfirmedCount:3,fixedGameIds:false,autoPromotionDemotion:true},
    developmentFocusPolicy:{maxFocusedGames:1,targetFocusedGames:1,focusStage:'RELEASE_CONFIRMED',fillVacantFocusedSlots:true,focusThreshold:0,nextDevelopmentThreshold:0,tier2WebPrototypeAllowedAlongsideUnityFocus:true,fastLane:{reviewRoles:['development','qa'],implementationRoles:['development']}},
    projects:[
      {id:'A',slug:'ga',name:'A',sourcePath:'web-games/ga',developmentFocus:{total:9},protectedValues:['core-loop']},
      {id:'B',slug:'gb',name:'B',sourcePath:'web-games/gb',productionSourcePath:'unity-games/gb',developmentFocus:{total:8},protectedValues:['core-loop']},
      {id:'C',slug:'gc',name:'C',sourcePath:'web-games/gc',developmentFocus:{total:7},protectedValues:['core-loop']},
      {id:'D',slug:'gd',name:'D',sourcePath:'web-games/gd',developmentFocus:{total:6},protectedValues:['core-loop']},
      {id:'E',slug:'ge',name:'E',sourcePath:'web-games/ge',developmentFocus:{total:5},protectedValues:['core-loop']},
      {id:'F',slug:'gf',name:'F',sourcePath:'web-games/gf',developmentFocus:{total:4},protectedValues:['core-loop']},
      {id:'G',slug:'gg',name:'G',sourcePath:'web-games/gg',developmentFocus:{total:3},protectedValues:['core-loop']},
    ],
  },
  catalog:{games:['ga','gb','gc','gd','ge','gf','gg'].map(id=>({id,hasWebArchive:true,homepageWebPlayable:true,homepageCategory:'reviewing'}))},
  artbooks:{artbooks:['ga','gb','gc','gd','ge','gf','gg'].map((gameId,index)=>({id:`book-${index}`,gameId,status:'completed-artbook',lifecycle:{state:'DESIGN_BASELINE'}}))},
});
const tierFilesystem={existsSync:path=>String(path).startsWith('web-games/')||path==='unity-games/gb'};

test('active Tier2 runtime incident does not mask a free Tier2 runtime incident from FAST lane',()=>{
  const fixture=tierFixture();
  rebalanceProductionTiers({...fixture,filesystem:tierFilesystem});
  const health={games:[
    {gameId:'gc',status:'warning',issues:['404 active'],healthReason:'same-origin-resource-failure'},
    {gameId:'gd',status:'warning',issues:['404 free'],healthReason:'same-origin-resource-failure'},
  ]};
  const queueState={version:2,attempts:[
    {date:'2026-09-10',gameId:'C',gameSlug:'gc',sourcePath:'web-games/gc',status:'RESERVED',leaseExpiresAt:'2026-09-10T02:30:00Z'},
  ]};
  const order=build24hAutonomousWorkOrder({
    portfolio:fixture.portfolio,
    artbooks:fixture.artbooks,
    health,
    catalog:fixture.catalog,
    diagnostics:{},
    queueState,
    date:'2026-09-10',
    filesystem:tierFilesystem,
    now:new Date('2026-09-10T02:00:00Z'),
  });
  assert.equal(order.gameId,'D');
  assert.equal(order.selectedReason,'RUNTIME_INCIDENT_FIRST');
  assert.equal(order.workLane,'FAST');
  assert.deepEqual(order.departmentReviewRoles,['development','qa']);
  assert.deepEqual(order.implementationRoles,['development']);
});

test('fixed tier counts auto-promote and demote games without pinned IDs',()=>{
  const first=tierFixture();
  const result=rebalanceProductionTiers({...first,filesystem:tierFilesystem});
  assert.deepEqual(result.state.releaseConfirmedGameIds,['A','B']);
  assert.deepEqual(result.state.developmentConfirmedGameIds,['C','D','E']);
  assert.equal(result.state.fixedGameIds,false);
  assert.equal(result.state.autoPromotionDemotion,true);
  assert.equal(first.portfolio.projects.filter(p=>p.productionTier===1).length,2);
  assert.equal(first.portfolio.projects.filter(p=>p.productionTier===2).length,3);

  const changed=tierFixture();
  changed.portfolio.projects.find(p=>p.id==='F').developmentFocus.total=10;
  const rotated=rebalanceProductionTiers({...changed,filesystem:tierFilesystem});
  assert.ok(rotated.state.releaseConfirmedGameIds.includes('F'));
  assert.ok(!rotated.state.releaseConfirmedGameIds.includes('B'));
  assert.ok(rotated.state.developmentConfirmedGameIds.includes('B'));
  assert.equal(changed.portfolio.projects.filter(p=>p.productionTier===1).length,2);
  assert.equal(changed.portfolio.projects.filter(p=>p.productionTier===2).length,3);
});

test('dynamic tier planner focuses one Tier1 Unity candidate and feeds Tier2 Web only',()=>{
  const fixture=tierFixture();
  rebalanceProductionTiers({...fixture,filesystem:tierFilesystem});
  const target=selectContinuousTarget({portfolio:fixture.portfolio,artbooks:fixture.artbooks,catalog:fixture.catalog,queueState:{version:2,attempts:[]},date:'2026-09-10',filesystem:tierFilesystem});
  assert.deepEqual(target.focusedGameIds,['B']);
  assert.deepEqual(target.nextFocusGameIds,['A']);
  assert.equal(target.project.id,'C');
  assert.equal(target.projectLane,'TIER2_WEB_FIRST_IMPLEMENTATION');
  assert.equal(target.focusedGameIds.length,1);
});

test('Tier1 priority is handed to Unity lane instead of Web feature development',()=>{
  const fixture=tierFixture();
  rebalanceProductionTiers({...fixture,filesystem:tierFilesystem});
  const order=build24hAutonomousWorkOrder({portfolio:fixture.portfolio,artbooks:fixture.artbooks,health:{games:[]},catalog:fixture.catalog,diagnostics:{},queueState:{version:2,attempts:[]},date:'2026-09-10',priorityGameId:'gb',filesystem:tierFilesystem});
  assert.equal(order.run,false);
  assert.equal(order.reason,'TIER1_UNITY_FOCUS_HANDOFF');
  assert.equal(order.requestedGameId,'B');
});

test('Tier3 runtime issue cannot enter autonomous source-code FAST lane',()=>{
  const tier3Portfolio={
    status:'ACTIVE',paidApi:false,maxModelCallsPerRun:2,
    productionTierPolicy:{releaseConfirmedCount:2,developmentConfirmedCount:3,fixedGameIds:false,autoPromotionDemotion:true},
    developmentFocusPolicy:{maxFocusedGames:1,targetFocusedGames:1,focusStage:'RELEASE_CONFIRMED',fillVacantFocusedSlots:true,focusThreshold:0,nextDevelopmentThreshold:0,tier2WebPrototypeAllowedAlongsideUnityFocus:true,fastLane:{reviewRoles:['development','qa'],implementationRoles:['development']}},
    projects:[{id:'T3',slug:'tier3',name:'Tier3',sourcePath:'web-games/tier3',profileStatus:'DESIGN_ONLY',mode:'REDESIGN',productionTier:3,targetEngine:'design-only',developmentFocus:{total:10}}],
  };
  const tier3Catalog={games:[{id:'tier3',homepageCategory:'reviewing',productionTier:3}]};
  const tier3Books={artbooks:[{gameId:'tier3',status:'completed-artbook',lifecycle:{state:'DESIGN_BASELINE'}}]};
  const health={games:[{gameId:'tier3',status:'warning',issues:['404 asset'],healthReason:'same-origin-resource-failure'}]};
  const order=build24hAutonomousWorkOrder({portfolio:tier3Portfolio,artbooks:tier3Books,health,catalog:tier3Catalog,diagnostics:{},queueState:{version:2,attempts:[]},date:'2026-09-10',filesystem});
  assert.equal(order.run,false);
  assert.notEqual(order.workLane,'FAST');
});
