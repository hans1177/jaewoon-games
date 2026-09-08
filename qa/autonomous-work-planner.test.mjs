// qa/autonomous-work-planner.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAutonomousWorkOrder } from '../tools/autonomous-work-planner.mjs';

const filesystem={existsSync:()=>true};
const basePortfolio={
  status:'ACTIVE',paidApi:false,continuousDevelopmentBranch:'autonomous-dev',publicStableBranch:'main',candidateBranchPrefix:'autonomous/candidate-',maxModelCallsPerRun:1,maxRunnerMinutesPerRun:20,
  projects:[
    {id:'P0001',slug:'a',name:'A',sourcePath:'web-games/a',profileStatus:'AUDITED_PARTIAL',mode:'IMPROVE',protectedValues:['save-a']},
    {id:'P0002',slug:'b',name:'B',sourcePath:'web-games/b',profileStatus:'NEEDS_AUDIT',mode:'EXPERIMENT_ONLY',protectedValues:[]},
    {id:'P0003',slug:'c',name:'C',sourcePath:'web-games/c',profileStatus:'HOLD_X',mode:'HOLD',protectedValues:[]},
  ]
};

test('HOLD 프로젝트는 자동 개발 대상에서 제외하고 하루 1개만 고른다',()=>{
  const order=buildAutonomousWorkOrder({portfolio:basePortfolio,artbooks:{artbooks:[]},health:{games:[]},date:'2026-09-09',filesystem});
  assert.equal(order.run,true);
  assert.notEqual(order.gameId,'P0003');
  assert.equal(order.budget.modelCalls,1);
  assert.equal(order.budget.cashKRW,0);
  assert.equal(order.budget.paidApi,false);
});

test('실행 사고가 있으면 일일 순환보다 우선한다',()=>{
  const health={games:[{gameId:'b',status:'critical',healthReason:'load failed',issues:['blank-screen'],signals:{loadOk:false}}]};
  const order=buildAutonomousWorkOrder({portfolio:basePortfolio,artbooks:{artbooks:[]},health,date:'2026-09-09',filesystem});
  assert.equal(order.gameId,'P0002');
  assert.equal(order.selectedReason,'RUNTIME_INCIDENT_FIRST');
  assert.equal(order.budget.emergencyReserveUse,true);
});

test('건강도 숫자 자체를 게임 품질 점수로 사용하지 않는다',()=>{
  const health={games:[{gameId:'a',status:'healthy',score:10,issues:[],signals:{loadOk:true,reloadOk:true}}]};
  const order=buildAutonomousWorkOrder({portfolio:{...basePortfolio,projects:[basePortfolio.projects[0]]},artbooks:{artbooks:[]},health,date:'2026-09-09',filesystem});
  assert.equal(order.selectedReason,'DAILY_PORTFOLIO_ROTATION');
  assert.equal(order.evidence.healthScoreUsedAsGameQuality,false);
  assert.equal(order.evidence.runtimeIncident,null);
});

test('최신 아트북의 낮은 부서 보완점을 목표 근거로 넣는다',()=>{
  const artbooks={artbooks:[{id:'a-1',gameId:'a',createdAt:'2026-09-08',productionApproval:false,departmentOpinions:{graphics:{averageStars:3,priorityImprovement:'보스 실루엣을 강화한다'},qa:{averageStars:4,priorityImprovement:'모바일 버튼 겹침을 고친다'}}}]};
  const order=buildAutonomousWorkOrder({portfolio:{...basePortfolio,projects:[basePortfolio.projects[0]]},artbooks,health:{games:[]},date:'2026-09-09',filesystem});
  assert.match(order.goal,/보스 실루엣/);
  assert.equal(order.evidence.latestArtbookProductionApproval,false);
});

test('프로젝트 수는 9로 고정되지 않고 P0010 이후도 동일하게 선택 가능',()=>{
  const portfolio={...basePortfolio,projects:[{id:'P0010',slug:'new',name:'New',sourcePath:'web-games/new',profileStatus:'NEW',mode:'EXPERIMENT_ONLY',protectedValues:[]}]};
  const order=buildAutonomousWorkOrder({portfolio,artbooks:{artbooks:[]},health:{games:[]},date:'2026-09-09',filesystem});
  assert.equal(order.gameId,'P0010');
});

test('paidApi가 켜진 포트폴리오는 즉시 거부한다',()=>{
  assert.throws(()=>buildAutonomousWorkOrder({portfolio:{...basePortfolio,paidApi:true},artbooks:{},health:{},filesystem}),/무료정책 위반/);
});
