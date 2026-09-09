// qa/autonomous-production-tier-policy.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAutonomousWorkOrder, classifyProjectStage } from '../tools/autonomous-work-planner.mjs';

const filesystem={existsSync:()=>true};
const queueState={version:1,attempts:[]};
const diagnostic={filesScanned:1,counts:{high:1},topIssue:{type:'DOM_NULL_EVENT_BIND',severity:'high',file:'app.js',message:'x',microTask:'app.js 문제 1개만 수정',repairMode:'MODEL'},issues:[]};
const catalog={games:[
  {id:'tier1',homepageCategory:'development-confirmed'},
  {id:'tier2',homepageCategory:'reviewing'},
  {id:'tier3',homepageCategory:'development-confirmed'},
]};

const project=(id,productionTier)=>({
  id:`P-${id}`,
  slug:id,
  name:id,
  productionTier,
  sourcePath:`web-games/${id}`,
  profileStatus:'DEVELOPMENT_CONFIRMED',
  mode:'IMPROVE',
  protectedValues:[],
});

test('productionTier가 오래된 홈페이지/프로필 상태보다 우선한다',()=>{
  assert.deepEqual(classifyProjectStage(project('tier1',1),catalog),{id:'RELEASE_CONFIRMED',rank:1,codeWork:true});
  assert.deepEqual(classifyProjectStage(project('tier2',2),catalog),{id:'DEVELOPMENT_CONFIRMED',rank:2,codeWork:true});
  assert.deepEqual(classifyProjectStage(project('tier3',3),catalog),{id:'DESIGN_ONLY',rank:4,codeWork:false});
});

test('3분류만 있으면 진단 근거가 있어도 코드 작업을 만들지 않는다',()=>{
  const tier3=project('tier3',3);
  const portfolio={status:'ACTIVE',paidApi:false,maxAutonomousWorkItemsPerDay:8,maxModelCallsPerRun:2,maxRunnerMinutesPerRun:20,projects:[tier3]};
  const order=buildAutonomousWorkOrder({
    portfolio,
    artbooks:{artbooks:[]},
    health:{games:[]},
    catalog,
    diagnostics:{tier3:diagnostic},
    queueState,
    date:'2026-09-10',
    filesystem,
  });
  assert.equal(order.run,false);
  assert.equal(order.reason,'DESIGN_ONLY');
  assert.equal(order.planningGameId,tier3.id);
});

test('2분류와 3분류가 함께 있어도 코드 작업은 2분류만 선택한다',()=>{
  const tier2=project('tier2',2),tier3=project('tier3',3);
  const portfolio={status:'ACTIVE',paidApi:false,maxAutonomousWorkItemsPerDay:8,maxModelCallsPerRun:2,maxRunnerMinutesPerRun:20,projects:[tier3,tier2]};
  const order=buildAutonomousWorkOrder({
    portfolio,
    artbooks:{artbooks:[]},
    health:{games:[]},
    catalog,
    diagnostics:{tier2:diagnostic,tier3:diagnostic},
    queueState,
    date:'2026-09-10',
    filesystem,
  });
  assert.equal(order.run,true);
  assert.equal(order.gameId,tier2.id);
  assert.equal(order.projectStage,'DEVELOPMENT_CONFIRMED');
});
