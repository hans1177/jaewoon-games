import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDepartmentAttribution, comparePlayImpact, scoreRegressionRisk } from '../tools/autonomous-play-impact.mjs';

const browser=({pass=true,scenarioPass=true,errors=[],visible=4,overflow=0}={})=>({
  pass,errors,consoleErrors:[],pageErrors:[],failedRequests:[],badResponses:[],
  metrics:{bodyVisible:true,width:390,scrollWidth:390+overflow,viewportWidth:390,visibleInteractive:visible,canvas:1,title:'Game'},
  reloadMetrics:{bodyVisible:true,width:390,scrollWidth:390+overflow,viewportWidth:390,visibleInteractive:visible,canvas:1,title:'Game'},
  gameplayScenario:{configured:true,expectedPlayable:true,pass:scenarioPass,status:scenarioPass?'PASS':'FAILED',scenarioId:'core'},
});

test('기존 시나리오 PASS가 후보에서 깨지면 회귀위험이 올라간다',()=>{
  const risk=scoreRegressionRisk({baseline:browser(),candidate:browser({scenarioPass:false})});
  assert.equal(risk.scenarioRegression,true);
  assert.ok(risk.score>=2);
  assert.notEqual(risk.level,'LOW');
});

test('새 런타임 오류와 UI 축소는 회귀위험에 누적된다',()=>{
  const risk=scoreRegressionRisk({
    baseline:browser({visible:5}),
    candidate:browser({pass:false,errors:['page:new'],visible:2,overflow:20}),
  });
  assert.equal(risk.level,'CRITICAL');
  assert.equal(risk.score,5);
});

test('최종 통합 파일 기준으로 부서별 직접 성과를 분리한다',()=>{
  const evidence={
    changedFiles:['index.html','ui.js'],
    departmentImplementations:[
      {role:'development',status:'PASS',changedFiles:['index.html','ui.js']},
      {role:'graphics',status:'PASS',changedFiles:['ui.js']},
      {role:'qa',status:'NO_SCOPE',changedFiles:[]},
      {role:'balance',status:'NO_SCOPE',changedFiles:[]},
    ],
    integration:{mergeModes:[
      {path:'index.html',role:'development',mode:'THEIRS_ONLY'},
      {path:'ui.js',role:'development',mode:'THEIRS_ONLY'},
      {path:'ui.js',role:'graphics',mode:'DISJOINT_LINE_MERGE'},
    ]},
  };
  const result=buildDepartmentAttribution(evidence,{totalScore:8,playerImpactScore:4,netScore:7});
  const planning=result.departments.find(x=>x.department==='planning');
  const development=result.departments.find(x=>x.department==='development');
  const graphics=result.departments.find(x=>x.department==='graphics');
  assert.equal(planning.totalPerformanceCredit,0);
  assert.equal(planning.creditBasis,'REVIEW_ONLY_NO_DIRECT_CODE_CREDIT');
  assert.ok(development.totalPerformanceCredit>graphics.totalPerformanceCredit);
  assert.deepEqual(development.directUniqueFiles,['index.html']);
  assert.deepEqual(graphics.sharedFiles,['ui.js']);
});

test('최종 플레이 성과는 회귀위험을 뺀 netScore와 부서 귀속을 함께 기록한다',()=>{
  const evidence={
    gameId:'P0001',candidateId:'P0001-x',saveKeyValidation:'PASS',changedFiles:['index.html'],
    departmentImplementations:[{role:'development',status:'PASS',changedFiles:['index.html']}],
    integration:{mergeModes:[{path:'index.html',role:'development',mode:'THEIRS_ONLY'}]},
  };
  const result=comparePlayImpact({baseline:browser({errors:['page:old']}),candidate:browser(),evidence});
  assert.equal(result.regressionRiskScore,0);
  assert.ok(result.netScore>=result.executionQualityScore);
  assert.equal(result.departmentAttribution.departments.find(x=>x.department==='development').attributionShare,1);
  assert.equal(result.departmentAttribution.departments.find(x=>x.department==='planning').attributionShare,0);
});
