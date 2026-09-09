import test from 'node:test';
import assert from 'node:assert/strict';
import {selectContinuousTarget} from '../tools/autonomous-24h-work-planner.mjs';

const filesystem={existsSync:()=>true};
const portfolio={
  developmentFocusPolicy:{maxFocusedGames:2,focusThreshold:8,nextDevelopmentThreshold:5,fillVacantFocusedSlots:true,preferredFocusedGameIds:['P0001','P0002']},
  projects:[
    {id:'P0001',slug:'survival',sourcePath:'web-games/survival',profileStatus:'DEVELOPMENT_CONFIRMED',mode:'IMPROVE',developmentFocus:{total:9}},
    {id:'P0002',slug:'insect-survival',sourcePath:'web-games/insect-survival',profileStatus:'DEVELOPMENT_CONFIRMED',mode:'IMPROVE',developmentFocus:{total:8}},
  ],
};
const catalog={games:[{id:'survival',homepageCategory:'development-confirmed'},{id:'insect-survival',homepageCategory:'development-confirmed'}]};
const artbooks={dailySubmissions:[
  {gameId:'survival',status:'completed-artbook',date:'2026-09-10',lifecycleState:'DESIGN_BASELINE'},
  {gameId:'insect-survival',status:'completed-artbook',date:'2026-09-10',lifecycleState:'DESIGN_BASELINE'},
]};
const low=(candidateId,time)=>({gameId:'P0001',candidateId,impactStatus:'NOT_OBSERVED_BY_SMOKE_QA',priorityEligibleLowImpact:true,evaluatedAt:time});
const history={version:1,entries:[low('a','2026-09-10T00:00:00Z'),low('b','2026-09-10T01:00:00Z')]};

test('two consecutive low-impact outcomes delay the same focused game but do not remove its focus slot',()=>{
  const selected=selectContinuousTarget({portfolio,artbooks,catalog,impactHistory:history,queueState:{version:2,attempts:[]},date:'2026-09-10',filesystem,now:new Date('2026-09-10T03:00:00Z'),isSourceReleased:()=>false});
  assert.deepEqual(selected.focusedGameIds,['P0001','P0002']);
  assert.equal(selected.impactPriorityPenalties.P0001.penalty,1);
  assert.equal(selected.project.id,'P0002');
});

test('explicit owner/artbook priority still overrides low-impact scheduling penalty',()=>{
  const selected=selectContinuousTarget({portfolio,artbooks,catalog,impactHistory:history,queueState:{version:2,attempts:[]},date:'2026-09-10',priorityGameId:'P0001',filesystem,now:new Date('2026-09-10T03:00:00Z'),isSourceReleased:()=>false});
  assert.equal(selected.project.id,'P0001');
  assert.equal(selected.explicitPriority,true);
});
