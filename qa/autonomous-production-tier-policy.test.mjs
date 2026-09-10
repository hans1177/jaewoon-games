// qa/autonomous-production-tier-policy.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAutonomousWorkOrder, classifyProjectStage } from '../tools/autonomous-work-planner.mjs';

const filesystem={existsSync:()=>true};
const queueState={version:1,attempts:[]};
const diagnostic={filesScanned:1,counts:{high:1},topIssue:{type:'DOM_NULL_EVENT_BIND',severity:'high',file:'app.js',message:'x',microTask:'app.js 문제 1개만 수정',repairMode:'MODEL'},issues:[]};
const catalog={games:[
  {id:'release',productionClass:'RELEASE_CONFIRMED',homepageCategory:'design-only'},
  {id:'development',productionClass:'DEVELOPMENT_CONFIRMED',homepageCategory:'release-confirmed'},
  {id:'design',productionClass:'DESIGN_ONLY',homepageCategory:'development-confirmed'},
  {id:'legacy-release',homepageCategory:'reviewing'},
]};

const project=(id,productionClass,productionTier,profileStatus='DEVELOPMENT_CONFIRMED')=>({
  id:`P-${id}`,
  slug:id,
  name:id,
  productionClass,
  productionTier,
  sourcePath:`web-games/${id}`,
  profileStatus,
  mode:'IMPROVE',
  protectedValues:[],
});

test('productionClass가 오래된 숫자 tier·홈페이지·프로필보다 우선한다',()=>{
  assert.deepEqual(classifyProjectStage(project('release','RELEASE_CONFIRMED',3),catalog),{id:'RELEASE_CONFIRMED',rank:1,codeWork:true});
  assert.deepEqual(classifyProjectStage(project('development','DEVELOPMENT_CONFIRMED',1),catalog),{id:'DEVELOPMENT_CONFIRMED',rank:2,codeWork:true});
  assert.deepEqual(classifyProjectStage(project('design','DESIGN_ONLY',1),catalog),{id:'DESIGN_ONLY',rank:4,codeWork:false});
});

test('productionClass·프로필·홈페이지 의미값이 없는 레거시 데이터는 숫자 tier fallback을 계속 지원한다',()=>{
  assert.deepEqual(classifyProjectStage(project('legacy-release',undefined,1,'REVIEWING'),catalog),{id:'RELEASE_CONFIRMED',rank:1,codeWork:true});
});

test('DESIGN_ONLY만 있으면 진단 근거가 있어도 코드 작업을 만들지 않는다',()=>{
  const design=project('design','DESIGN_ONLY',3);
  const portfolio={status:'ACTIVE',paidApi:false,maxAutonomousWorkItemsPerDay:8,maxModelCallsPerRun:2,maxRunnerMinutesPerRun:20,projects:[design]};
  const order=buildAutonomousWorkOrder({
    portfolio,
    artbooks:{artbooks:[]},
    health:{games:[]},
    catalog,
    diagnostics:{design:diagnostic},
    queueState,
    date:'2026-09-11',
    filesystem,
  });
  assert.equal(order.run,false);
  assert.equal(order.reason,'DESIGN_ONLY');
  assert.equal(order.planningGameId,design.id);
});

test('DEVELOPMENT_CONFIRMED와 DESIGN_ONLY가 함께 있어도 코드 작업은 개발확정만 선택한다',()=>{
  const development=project('development','DEVELOPMENT_CONFIRMED',2),design=project('design','DESIGN_ONLY',3);
  const portfolio={status:'ACTIVE',paidApi:false,maxAutonomousWorkItemsPerDay:8,maxModelCallsPerRun:2,maxRunnerMinutesPerRun:20,projects:[design,development]};
  const order=buildAutonomousWorkOrder({
    portfolio,
    artbooks:{artbooks:[]},
    health:{games:[]},
    catalog,
    diagnostics:{development:diagnostic,design:diagnostic},
    queueState,
    date:'2026-09-11',
    filesystem,
  });
  assert.equal(order.run,true);
  assert.equal(order.gameId,development.id);
  assert.equal(order.projectStage,'DEVELOPMENT_CONFIRMED');
});
