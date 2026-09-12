import test from 'node:test';
import assert from 'node:assert/strict';
import { build24hAutonomousWorkOrder, rankDevelopmentFocus, selectContinuousTarget } from '../tools/autonomous-24h-work-planner.mjs';
import { runDepartmentRole } from '../tools/autonomous-department-cycle.mjs';

const filesystem={existsSync:()=>true};
const basePortfolio={status:'ACTIVE',paidApi:false,projects:[
  {id:'P1',slug:'a',sourcePath:'web-games/a',profileStatus:'DEVELOPMENT_CONFIRMED',productionClass:'DEVELOPMENT_CONFIRMED',mode:'OPTIONAL_WEB_GAMEPLAY_TESTBED'},
  {id:'P2',slug:'b',sourcePath:'web-games/b',profileStatus:'NEEDS_AUDIT',mode:'EXPERIMENT_ONLY'},
  {id:'P3',slug:'release',sourcePath:'web-games/release',profileStatus:'RELEASE_CONFIRMED',productionClass:'RELEASE_CONFIRMED',mode:'MAINTENANCE',selectedPlatform:'UNITY'},
]};
const artbooks={artbooks:[
  {id:'a1',gameId:'a',createdAt:'2026-09-09T01:00:00Z',status:'completed-artbook',lifecycle:{state:'DESIGN_BASELINE'}},
  {id:'b1',gameId:'b',createdAt:'2026-09-09T02:00:00Z',status:'completed-artbook',lifecycle:{state:'DESIGN_BASELINE'}},
  {id:'r1',gameId:'release',createdAt:'2026-09-09T03:00:00Z',status:'completed-artbook',lifecycle:{state:'DESIGN_BASELINE'}},
]};
const catalog={games:[
  {id:'a',homepageCategory:'development-confirmed',productionClass:'DEVELOPMENT_CONFIRMED'},
  {id:'b',homepageCategory:'reviewing'},
  {id:'release',homepageCategory:'release-confirmed',productionClass:'RELEASE_CONFIRMED',selectedPlatform:'UNITY'},
]};

test('without focus policy the planner rotates eligible non-release projects',()=>{
  const queueState={version:1,attempts:[
    {date:'2026-09-09',gameId:'P1'},
    {date:'2026-09-09',gameId:'P1'},
    {date:'2026-09-09',gameId:'P2'},
  ]};
  const target=selectContinuousTarget({portfolio:basePortfolio,artbooks,catalog,queueState,date:'2026-09-09',filesystem});
  assert.equal(target.project.id,'P2');
  assert.equal(target.attemptsToday,1);
});

test('release-confirmed project is never fed into arbitrary generic feature development',()=>{
  const target=selectContinuousTarget({portfolio:{status:'ACTIVE',paidApi:false,projects:[basePortfolio.projects[2]]},artbooks,catalog,queueState:{version:1,attempts:[]},date:'2026-09-09',filesystem});
  assert.equal(target,null);
});

function selectedPlatformFixture(){
  return {
    status:'ACTIVE',paidApi:false,maxModelCallsPerRun:2,maxRunnerMinutesPerRun:20,
    productionClassPolicy:{canonicalField:'productionClass',classes:{RELEASE_CONFIRMED:{engine:'PROJECT_SELECTED_PLATFORM'},DEVELOPMENT_CONFIRMED:{engine:'PROJECT_SELECTED_PLATFORM',webPurpose:'OPTIONAL_GAMEPLAY_VALIDATION_TESTBED'}}},
    developmentFocusPolicy:{maxFocusedGames:1,targetFocusedGames:1,focusStage:'RELEASE_CONFIRMED',fillVacantFocusedSlots:true,focusThreshold:0,nextDevelopmentThreshold:0,optionalWebGameplayTestbedAllowedAlongsideReleaseFocus:true,platformPriority:['ROBLOX','UNITY','FORTNITE_UEFN'],priorityMeaning:'DEFAULT_FOCUS_ONLY_NO_PLATFORM_GATE',fastLane:{reviewRoles:['development','qa'],implementationRoles:['development']}},
    projects:[
      {id:'R',slug:'roblox-release',name:'Roblox Release',sourcePath:'web-games/roblox-release',productionSourcePath:'roblox-games/roblox-release',productionClass:'RELEASE_CONFIRMED',profileStatus:'RELEASE_CONFIRMED',selectedPlatform:'ROBLOX',targetEngine:'roblox',developmentFocus:{total:8},protectedValues:['core-loop']},
      {id:'U',slug:'unity-release',name:'Unity Release',sourcePath:'web-games/unity-release',productionSourcePath:'unity-games/unity-release',productionClass:'RELEASE_CONFIRMED',profileStatus:'RELEASE_CONFIRMED',selectedPlatform:'UNITY',targetEngine:'unity-android',unityProjectReady:true,developmentFocus:{total:10},protectedValues:['core-loop']},
      {id:'F',slug:'uefn-release',name:'UEFN Release',sourcePath:'web-games/uefn-release',productionSourcePath:'uefn-games/uefn-release',productionClass:'RELEASE_CONFIRMED',profileStatus:'RELEASE_CONFIRMED',selectedPlatform:'FORTNITE_UEFN',targetEngine:'fortnite-uefn',developmentFocus:{total:9},protectedValues:['core-loop']},
      {id:'D',slug:'dev-web',name:'Dev Web',sourcePath:'web-games/dev-web',productionClass:'DEVELOPMENT_CONFIRMED',profileStatus:'DEVELOPMENT_CONFIRMED',mode:'OPTIONAL_WEB_GAMEPLAY_TESTBED',targetEngine:'platform-selection-required',developmentFocus:{total:7},protectedValues:['core-loop']},
    ],
  };
}
const selectedCatalog={games:[
  {id:'roblox-release',productionClass:'RELEASE_CONFIRMED',selectedPlatform:'ROBLOX'},
  {id:'unity-release',productionClass:'RELEASE_CONFIRMED',selectedPlatform:'UNITY'},
  {id:'uefn-release',productionClass:'RELEASE_CONFIRMED',selectedPlatform:'FORTNITE_UEFN'},
  {id:'dev-web',productionClass:'DEVELOPMENT_CONFIRMED',homepageCategory:'development-confirmed'},
]};
const selectedBooks={artbooks:[
  {gameId:'roblox-release',status:'completed-artbook',lifecycle:{state:'DEVELOPMENT_BASELINE'}},
  {gameId:'unity-release',status:'completed-artbook',lifecycle:{state:'DEVELOPMENT_BASELINE'}},
  {gameId:'uefn-release',status:'completed-artbook',lifecycle:{state:'DEVELOPMENT_BASELINE'}},
  {gameId:'dev-web',status:'completed-artbook',lifecycle:{state:'DESIGN_BASELINE'}},
]};
const selectedFs={existsSync:value=>[
  'web-games/roblox-release','roblox-games/roblox-release',
  'web-games/unity-release','unity-games/unity-release',
  'web-games/uefn-release','uefn-games/uefn-release',
  'web-games/dev-web',
].includes(String(value))};

test('release focus uses selected-platform readiness and central platform priority only as focus ordering',()=>{
  const portfolio=selectedPlatformFixture();
  const ranked=rankDevelopmentFocus({portfolio,catalog:selectedCatalog,artbooks:selectedBooks,filesystem:selectedFs});
  assert.deepEqual(ranked.map(project=>project.id),['R','U','F']);
  const target=selectContinuousTarget({portfolio,artbooks:selectedBooks,catalog:selectedCatalog,queueState:{version:2,attempts:[]},date:'2026-09-10',filesystem:selectedFs});
  assert.deepEqual(target.focusedGameIds,['R']);
  assert.equal(target.focusedPlatforms.R,'ROBLOX');
  assert.deepEqual(target.nextFocusGameIds,['U','F']);
  assert.equal(target.project.id,'D');
  assert.equal(target.projectLane,'DEVELOPMENT_CONFIRMED_OPTIONAL_WEB_TESTBED');
});

test('explicit priority on focused release hands off to its selected-platform external lane',()=>{
  const portfolio=selectedPlatformFixture();
  const order=build24hAutonomousWorkOrder({portfolio,artbooks:selectedBooks,health:{games:[]},catalog:selectedCatalog,diagnostics:{},queueState:{version:2,attempts:[]},date:'2026-09-10',priorityGameId:'roblox-release',filesystem:selectedFs});
  assert.equal(order.run,false);
  assert.equal(order.reason,'RELEASE_CONFIRMED_TARGET_PLATFORM_FOCUS_HANDOFF');
  assert.equal(order.requestedGameId,'R');
  assert.equal(order.selectedPlatform,'ROBLOX');
  assert.equal(order.continuous24h.mode,'RELEASE_CONFIRMED_TARGET_PLATFORM_FOCUS_EXTERNAL_LANE');
});

test('a non-focused release priority cannot steal the single selected-platform focus slot',()=>{
  const portfolio=selectedPlatformFixture();
  const target=selectContinuousTarget({portfolio,artbooks:selectedBooks,catalog:selectedCatalog,queueState:{version:2,attempts:[]},date:'2026-09-10',priorityGameId:'unity-release',filesystem:selectedFs});
  assert.deepEqual(target.focusedGameIds,['R']);
  assert.equal(target.project.id,'D');
  assert.equal(target.explicitPriority,false);
});

test('optional Web testbed work never claims to replace selected-platform validation',()=>{
  const portfolio=selectedPlatformFixture();
  const order=build24hAutonomousWorkOrder({portfolio,artbooks:selectedBooks,health:{games:[]},catalog:selectedCatalog,diagnostics:{},queueState:{version:2,attempts:[]},date:'2026-09-10',filesystem:selectedFs});
  assert.equal(order.run,true);
  assert.equal(order.gameId,'D');
  assert.equal(order.selectedReason,'DEVELOPMENT_CONFIRMED_OPTIONAL_WEB_TESTBED');
  assert.equal(order.continuous24h.mode,'DEVELOPMENT_CONFIRMED_OPTIONAL_WEB_TESTBED');
  assert.match(order.goal,/선택 플랫폼 기술·게임플레이 검증을 대체하거나 플랫폼 선택을 강제하지 않는다/);
});

test('active optional-Web root blocks duplicate work without blocking selected-platform focus metadata',()=>{
  const portfolio=selectedPlatformFixture();
  const queueState={version:2,attempts:[{date:'2026-09-10',gameId:'D',gameSlug:'dev-web',sourcePath:'web-games/dev-web',status:'RESERVED',leaseExpiresAt:'2026-09-10T02:30:00Z'}]};
  const order=build24hAutonomousWorkOrder({portfolio,artbooks:selectedBooks,health:{games:[]},catalog:selectedCatalog,diagnostics:{},queueState,date:'2026-09-10',filesystem:selectedFs,now:new Date('2026-09-10T02:00:00Z')});
  assert.equal(order.run,false);
  assert.equal(order.reason,'ALL_OPTIONAL_WEB_TESTBED_SOURCE_ROOTS_ACTIVE');
  assert.deepEqual(order.continuous24h.focusedGameIds,['R']);
  assert.equal(order.continuous24h.focusedPlatforms.R,'ROBLOX');
});

test('runtime incident on a development-confirmed Web archive still preempts through FAST recovery',()=>{
  const portfolio=selectedPlatformFixture();
  const health={games:[{gameId:'dev-web',status:'warning',issues:['404 asset'],healthReason:'same-origin-resource-failure'}]};
  const fsWithEntry={existsSync:value=>selectedFs.existsSync(value)||String(value)==='web-games/dev-web/index.html'};
  const order=build24hAutonomousWorkOrder({portfolio,artbooks:selectedBooks,health,catalog:selectedCatalog,diagnostics:{},queueState:{version:2,attempts:[]},date:'2026-09-10',filesystem:fsWithEntry});
  assert.equal(order.gameId,'D');
  assert.equal(order.selectedReason,'RUNTIME_INCIDENT_FIRST');
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

test('DESIGN_ONLY runtime issue cannot enter autonomous source-code FAST lane',()=>{
  const portfolio={status:'ACTIVE',paidApi:false,maxModelCallsPerRun:2,productionClassPolicy:{canonicalField:'productionClass'},developmentFocusPolicy:{maxFocusedGames:1,focusStage:'RELEASE_CONFIRMED',optionalWebGameplayTestbedAllowedAlongsideReleaseFocus:true},projects:[{id:'T3',slug:'design',name:'Design',sourcePath:'web-games/design',productionClass:'DESIGN_ONLY',profileStatus:'DESIGN_ONLY',mode:'REDESIGN',targetEngine:'design-only',developmentFocus:{total:10}}]};
  const designCatalog={games:[{id:'design',homepageCategory:'design-only',productionClass:'DESIGN_ONLY'}]};
  const designBooks={artbooks:[{gameId:'design',status:'completed-artbook',lifecycle:{state:'DESIGN_BASELINE'}}]};
  const health={games:[{gameId:'design',status:'warning',issues:['404 asset'],healthReason:'same-origin-resource-failure'}]};
  const order=build24hAutonomousWorkOrder({portfolio,artbooks:designBooks,health,catalog:designCatalog,diagnostics:{},queueState:{version:2,attempts:[]},date:'2026-09-10',filesystem});
  assert.equal(order.run,false);
  assert.notEqual(order.workLane,'FAST');
});
