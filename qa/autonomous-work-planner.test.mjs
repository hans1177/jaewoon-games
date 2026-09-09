// qa/autonomous-work-planner.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAutonomousWorkOrder, classifyProjectStage } from '../tools/autonomous-work-planner.mjs';

const filesystem={existsSync:()=>true};
const basePortfolio={
  status:'ACTIVE',paidApi:false,continuousDevelopmentBranch:'autonomous-dev',publicStableBranch:'main',candidateBranchPrefix:'autonomous/candidate-',maxModelCallsPerRun:2,maxRunnerMinutesPerRun:20,maxAutonomousWorkItemsPerDay:8,
  projects:[
    {id:'P0001',slug:'a',name:'A',sourcePath:'web-games/a',profileStatus:'DEVELOPMENT_CONFIRMED',mode:'IMPROVE',protectedValues:['save-a']},
    {id:'P0002',slug:'b',name:'B',sourcePath:'web-games/b',profileStatus:'NEEDS_AUDIT',mode:'EXPERIMENT_ONLY',protectedValues:[]},
    {id:'P0003',slug:'c',name:'C',sourcePath:'web-games/c',profileStatus:'HOLD_X',mode:'HOLD',protectedValues:[]},
    {id:'P0101',slug:'release',name:'Release',sourcePath:'web-games/release',profileStatus:'RELEASE_CONFIRMED',mode:'MAINTENANCE',protectedValues:['public-stable']},
  ]
};
const catalog={games:[{id:'a',homepageCategory:'development-confirmed'},{id:'b',homepageCategory:'development-confirmed'},{id:'release',homepageCategory:'release-confirmed'}]};
const queue=(attempts=[])=>({version:1,attempts});
const diag=(type='DOM_NULL_EVENT_BIND',repairMode='MODEL')=>({filesScanned:2,counts:{high:1},topIssue:{type,severity:'high',file:'app.js',message:'x',microTask:'app.js 문제 1개만 수정',repairMode,autoPatch:repairMode==='RULE_PATCH'?{type:'INSERT_VIEWPORT',path:'index.html'}:null},issues:[]});

test('회사 단계 분류는 출시확정 > 개발확정 > 구조개선 > 기획필요 > HOLD를 표현한다',()=>{
  assert.equal(classifyProjectStage(basePortfolio.projects[3],catalog).rank,1);
  assert.equal(classifyProjectStage(basePortfolio.projects[0],catalog).rank,2);
  assert.equal(classifyProjectStage({...basePortfolio.projects[1],slug:'x'},{games:[]}).rank,3);
  assert.equal(classifyProjectStage({id:'r',slug:'r',mode:'REDESIGN',profileStatus:'REDESIGN_IDENTITY'},{games:[]}).rank,4);
  assert.equal(classifyProjectStage(basePortfolio.projects[2],catalog).id,'HOLD');
});

test('출시확정 게임은 문제가 발견된 경우에만 가장 먼저 보호한다',()=>{
  const diagnostics={release:diag(),a:diag(),b:diag()};
  const order=buildAutonomousWorkOrder({portfolio:basePortfolio,artbooks:{artbooks:[]},health:{games:[]},catalog,diagnostics,date:'2026-09-09',filesystem,queueState:queue()});
  assert.equal(order.gameId,'P0101');
  assert.equal(order.projectStage,'RELEASE_CONFIRMED');
});

test('출시확정 게임이 깨끗하면 개발확정의 실제 문제를 처리한다',()=>{
  const diagnostics={release:{issues:[],topIssue:null},a:diag(),b:diag()};
  const order=buildAutonomousWorkOrder({portfolio:basePortfolio,artbooks:{artbooks:[]},health:{games:[]},catalog,diagnostics,date:'2026-09-09',filesystem,queueState:queue()});
  assert.equal(order.gameId,'P0001');
  assert.equal(order.projectStage,'DEVELOPMENT_CONFIRMED');
});

test('완성된 DESIGN_BASELINE을 넘긴 개발확정 게임은 일반 개발 작업보다 먼저 시작한다',()=>{
  const diagnostics={release:{issues:[],topIssue:null},a:diag(),b:diag()};
  const artbooks={artbooks:[
    {id:'a-design',gameId:'a',createdAt:'2026-09-08',status:'completed-artbook',lifecycle:{state:'DESIGN_BASELINE'},departmentOpinions:{development:{averageStars:4,priorityImprovement:'A 개선'}}},
    {id:'b-design',gameId:'b',createdAt:'2026-09-09',status:'completed-artbook',lifecycle:{state:'DESIGN_BASELINE'},departmentOpinions:{development:{averageStars:4,priorityImprovement:'B 첫 개발'}}},
  ]};
  const order=buildAutonomousWorkOrder({portfolio:basePortfolio,artbooks,health:{games:[]},catalog,diagnostics,date:'2026-09-09',filesystem,queueState:queue(),priorityGameId:'b'});
  assert.equal(order.gameId,'P0002');
  assert.equal(order.selectedReason,'ARTBOOK_COMPLETED_DEVELOPMENT_HANDOFF');
  assert.equal(order.evidence.artbookDevelopmentHandoff.matched,true);
  assert.match(order.goal,/DESIGN_BASELINE/);
});

test('출시확정 런타임 사고는 아트북 개발 handoff보다 먼저 복구한다',()=>{
  const diagnostics={release:diag(),b:diag()};
  const health={games:[{gameId:'release',status:'critical',healthReason:'load failed',issues:['blank-screen'],signals:{loadOk:false}}]};
  const artbooks={artbooks:[{id:'b-design',gameId:'b',createdAt:'2026-09-09',status:'completed-artbook',lifecycle:{state:'DESIGN_BASELINE'}}]};
  const order=buildAutonomousWorkOrder({portfolio:basePortfolio,artbooks,health,catalog,diagnostics,date:'2026-09-09',filesystem,queueState:queue(),priorityGameId:'b'});
  assert.equal(order.gameId,'P0101');
  assert.equal(order.selectedReason,'RUNTIME_INCIDENT_FIRST');
});

test('진단 microtask는 책임 파일을 지정하고 모델 작업은 최대 2회 예산을 쓴다',()=>{
  const portfolio={...basePortfolio,projects:[basePortfolio.projects[0]]};
  const order=buildAutonomousWorkOrder({portfolio,artbooks:{artbooks:[]},health:{games:[]},catalog,diagnostics:{a:diag()},date:'2026-09-09',filesystem,queueState:queue()});
  assert.equal(order.selectedReason,'DIAGNOSTIC_MICROTASK');
  assert.deepEqual(order.responsibilityFiles,['app.js']);
  assert.equal(order.repairMode,'MODEL');
  assert.equal(order.budget.modelCalls,2);
});

test('안전 규칙 패치는 모델 호출 0회로 계획한다',()=>{
  const portfolio={...basePortfolio,projects:[basePortfolio.projects[0]]};
  const d={filesScanned:1,counts:{high:1},topIssue:{type:'MISSING_VIEWPORT',severity:'high',file:'index.html',message:'viewport',microTask:'viewport 1개 추가',repairMode:'RULE_PATCH',autoPatch:{type:'INSERT_VIEWPORT',path:'index.html'}}};
  const order=buildAutonomousWorkOrder({portfolio,artbooks:{artbooks:[]},health:{games:[]},catalog,diagnostics:{a:d},date:'2026-09-09',filesystem,queueState:queue()});
  assert.equal(order.repairMode,'RULE_PATCH');
  assert.equal(order.budget.modelCalls,0);
});

test('같은 단계의 실행 사고는 일반 진단보다 우선한다',()=>{
  const portfolio={...basePortfolio,projects:[basePortfolio.projects[0],basePortfolio.projects[1]]};
  const health={games:[{gameId:'b',status:'critical',healthReason:'load failed',issues:['blank-screen'],signals:{loadOk:false}}]};
  const localCatalog={games:[{id:'a',homepageCategory:'development-confirmed'},{id:'b',homepageCategory:'development-confirmed'}]};
  const order=buildAutonomousWorkOrder({portfolio,artbooks:{artbooks:[]},health,catalog:localCatalog,diagnostics:{a:diag(),b:diag()},date:'2026-09-09',filesystem,queueState:queue()});
  assert.equal(order.gameId,'P0002');
  assert.equal(order.selectedReason,'RUNTIME_INCIDENT_FIRST');
  assert.equal(order.budget.emergencyReserveUse,true);
});

test('오늘 이미 예약된 게임은 다시 고르지 않는다',()=>{
  const portfolio={...basePortfolio,projects:[basePortfolio.projects[0],basePortfolio.projects[1]]};
  const q=queue([{date:'2026-09-09',gameId:'P0001',status:'RESERVED'}]);
  const localCatalog={games:[{id:'a',homepageCategory:'development-confirmed'},{id:'b',homepageCategory:'development-confirmed'}]};
  const order=buildAutonomousWorkOrder({portfolio,artbooks:{artbooks:[]},health:{games:[]},catalog:localCatalog,diagnostics:{a:diag(),b:diag()},date:'2026-09-09',filesystem,queueState:q});
  assert.equal(order.gameId,'P0002');
});

test('일일 상한에 도달하면 프로젝트가 더 있어도 종료한다',()=>{
  const portfolio={...basePortfolio,maxAutonomousWorkItemsPerDay:1};
  const q=queue([{date:'2026-09-09',gameId:'P0001'}]);
  const order=buildAutonomousWorkOrder({portfolio,artbooks:{artbooks:[]},health:{games:[]},catalog,diagnostics:{release:diag()},date:'2026-09-09',filesystem,queueState:q});
  assert.equal(order.run,false);assert.equal(order.reason,'DAILY_AUTONOMOUS_CAP_REACHED');
});

test('건강도 숫자 자체를 게임 품질 점수로 사용하지 않는다',()=>{
  const portfolio={...basePortfolio,projects:[basePortfolio.projects[0]]};
  const health={games:[{gameId:'a',status:'healthy',score:10,issues:[],signals:{loadOk:true,reloadOk:true}}]};
  const order=buildAutonomousWorkOrder({portfolio,artbooks:{artbooks:[]},health,catalog,diagnostics:{a:diag()},date:'2026-09-09',filesystem,queueState:queue()});
  assert.equal(order.evidence.healthScoreUsedAsGameQuality,false);assert.equal(order.evidence.runtimeIncident,null);
});

test('최신 아트북의 낮은 부서 보완점을 진단이 없을 때 작은 목표 근거로 사용한다',()=>{
  const portfolio={...basePortfolio,projects:[basePortfolio.projects[0]]};
  const artbooks={artbooks:[{id:'a-1',gameId:'a',createdAt:'2026-09-08',productionApproval:false,departmentOpinions:{graphics:{averageStars:3,priorityImprovement:'보스 실루엣을 강화한다'}}}]};
  const order=buildAutonomousWorkOrder({portfolio,artbooks,health:{games:[]},catalog,diagnostics:{a:{issues:[],topIssue:null}},date:'2026-09-09',filesystem,queueState:queue()});
  assert.match(order.goal,/보스 실루엣/);assert.equal(order.evidence.latestArtbookProductionApproval,false);
});

test('아트북 평가문 자체는 게임 코드 작업으로 만들지 않는다',()=>{
  const portfolio={...basePortfolio,projects:[basePortfolio.projects[0]]};
  const artbooks={artbooks:[{id:'a-1',gameId:'a',createdAt:'2026-09-08',departmentOpinions:{qa:{averageStars:2,priorityImprovement:'본부 결과물의 이번 검토 점수와 전문성과 구체화도를 개선한다'}}}]};
  const order=buildAutonomousWorkOrder({portfolio,artbooks,health:{games:[]},catalog,diagnostics:{a:{issues:[],topIssue:null}},date:'2026-09-09',filesystem,queueState:queue()});
  assert.equal(order.run,false);
  assert.equal(order.reason,'NO_ACTIONABLE_DIAGNOSTIC');
});

test('집중 DESIGN_BASELINE에서 대형 단일 파일은 개발 목표가 아니라 편집 제약으로만 남긴다',()=>{
  const portfolio={...basePortfolio,projects:[basePortfolio.projects[0]]};
  const large={type:'LARGE_SINGLE_FILE',severity:'high',file:'index.html',message:'large file',microTask:'대형 파일 전체 재작성 금지',repairMode:'MODEL'};
  const diagnostics={a:{filesScanned:1,counts:{high:1},topIssue:large,issues:[large]}};
  const artbooks={artbooks:[{
    id:'a-design',gameId:'a',createdAt:'2026-09-09',status:'completed-artbook',lifecycle:{state:'DESIGN_BASELINE'},
    departments:{planning:{section:{storyGameplayConnection:'시작 지역의 자원 루프를 안정화한 뒤 위험 지역으로 확장한다.'}}},
    departmentOpinions:{qa:{averageStars:1,priorityImprovement:'본부 결과물은 이미지 중심 1장 구조와 이번 검토 점수를 더 강조해야 한다'}}
  }]};
  const order=buildAutonomousWorkOrder({portfolio,artbooks,health:{games:[]},catalog,diagnostics,date:'2026-09-09',filesystem,queueState:queue(),priorityGameId:'a'});
  assert.equal(order.selectedReason,'ARTBOOK_COMPLETED_DEVELOPMENT_HANDOFF');
  assert.equal(order.microTask,null);
  assert.deepEqual(order.responsibilityFiles,[]);
  assert.match(order.goal,/\[FEATURE_DEVELOPMENT\]/);
  assert.match(order.goal,/시작 지역의 자원 루프/);
  assert.doesNotMatch(order.goal,/이번 검토 점수/);
  assert.equal(order.evidence.diagnostics.editConstraints[0].type,'LARGE_SINGLE_FILE');
  assert.equal(order.evidence.diagnostics.topIssue,null);
});

test('기획 정체성만 필요한 프로젝트는 코드 생성으로 밀어 넣지 않는다',()=>{
  const portfolio={...basePortfolio,projects:[{id:'P9',slug:'r',name:'R',sourcePath:'web-games/r',profileStatus:'REDESIGN_IDENTITY',mode:'REDESIGN',protectedValues:[]}]};
  const order=buildAutonomousWorkOrder({portfolio,artbooks:{artbooks:[]},health:{games:[]},catalog:{games:[]},diagnostics:{r:diag()},date:'2026-09-09',filesystem,queueState:queue()});
  assert.equal(order.run,false);assert.equal(order.reason,'PLANNING_IDENTITY_REQUIRED');
});

test('paidApi가 켜진 포트폴리오는 즉시 거부한다',()=>{
  assert.throws(()=>buildAutonomousWorkOrder({portfolio:{...basePortfolio,paidApi:true},artbooks:{},health:{},catalog,diagnostics:{},filesystem,queueState:queue()}),/무료정책 위반/);
});
