import fs from 'node:fs';
import path from 'node:path';

const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const clip=(v,n=12000)=>{const s=typeof v==='string'?v:JSON.stringify(v);return s.length>n?s.slice(0,n):s;};
const ROLES=['planning','graphics','development','qa','balance'];
const ROLE_NAMES={planning:'기획',graphics:'그래픽',development:'개발',qa:'QA',balance:'밸런스'};
function kstDate(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return`${g('year')}-${g('month')}-${g('day')}`;}
function hash(value){let h=2166136261;for(const ch of String(value)){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function uniq(values){return [...new Set(values.map(clean).filter(Boolean))];}

const directive=readJson('company-directive.json',{});
const policy=directive.ai||{};
const pool=uniq(String(process.env.COMPANY_MODEL_POOL||'').split(',').filter(Boolean).length?String(process.env.COMPANY_MODEL_POOL).split(','):(policy.modelPool||[]));
const minModels=Number(policy.minDistinctModelsPerDepartment||3);
if(pool.length<minModels)throw new Error(`MULTIMODEL_GATE: need at least ${minModels} distinct models, configured=${pool.length}`);

const gameId=clean(process.env.ARTBOOK_GAME_ID||process.env.GAME_ID||process.argv.find(x=>x.startsWith('--game='))?.split('=')[1]);
const date=clean(process.env.ARTBOOK_DATE||process.env.DESIGN_DATE||kstDate());
if(!gameId)throw new Error('ARTBOOK_GAME_ID or GAME_ID is required');
const catalog=readJson('game-catalog.json',{games:[]});
const game=(catalog.games||[]).find(x=>x.id===gameId);
if(!game)throw new Error(`Unknown game: ${gameId}`);
const tier=Number(game.productionTier||3);
if(![1,2,3].includes(tier))throw new Error(`Invalid production tier: ${tier}`);

const base=path.join('design',gameId,date);
const submissionBase=path.join('artbook-submissions',gameId,date);
const workOrder=readJson(`artbook-work-orders/${date}-${gameId}.json`,{});
const factPack=readJson(path.join(submissionBase,'fact-pack.json'),{});
const learning=readJson(path.join(submissionBase,'learning-context.json'),readJson(path.join(submissionBase,'artbook-learning-context.json'),{}));
const evidence={game:{id:game.id,name:game.name,genre:game.genre,description:game.description,productionTier:tier,productionTarget:game.productionTarget,hasWebArchive:game.hasWebArchive,webPath:game.webPath,unityProjectPath:game.unityProjectPath},workOrder,factPack,learning};
const evidenceText=clip(evidence,15000);

const DESIGN_SCHEMA={type:'object',required:['identity','playerFantasy','coreLoop','signatureSystems','progressionDirection','visualDirection','mobileUx','technicalAssumptions','validationQuestions','openQuestions'],properties:{identity:{type:'string'},playerFantasy:{type:'string'},coreLoop:{type:'array',minItems:3,maxItems:7,items:{type:'string'}},signatureSystems:{type:'array',minItems:1,maxItems:6,items:{type:'object',required:['name','purpose','playerChoice'],properties:{name:{type:'string'},purpose:{type:'string'},playerChoice:{type:'string'}},additionalProperties:false}},progressionDirection:{type:'string'},visualDirection:{type:'string'},mobileUx:{type:'string'},technicalAssumptions:{type:'array',minItems:1,maxItems:8,items:{type:'string'}},validationQuestions:{type:'array',minItems:3,maxItems:10,items:{type:'string'}},openQuestions:{type:'array',maxItems:8,items:{type:'string'}}},additionalProperties:false};
const REVIEW_SCHEMA={type:'object',required:['keep','fix','add','risks','evidence','questions'],properties:{keep:{type:'array',minItems:1,maxItems:5,items:{type:'string'}},fix:{type:'array',minItems:1,maxItems:5,items:{type:'string'}},add:{type:'array',maxItems:4,items:{type:'string'}},risks:{type:'array',minItems:1,maxItems:5,items:{type:'string'}},evidence:{type:'array',minItems:1,maxItems:5,items:{type:'string'}},questions:{type:'array',maxItems:4,items:{type:'string'}}},additionalProperties:false};
const REP_SCHEMA={type:'object',required:['keep','fix','add','risks','evidence','memberAgreement'],properties:{keep:{type:'array',minItems:1,maxItems:5,items:{type:'string'}},fix:{type:'array',minItems:1,maxItems:5,items:{type:'string'}},add:{type:'array',maxItems:4,items:{type:'string'}},risks:{type:'array',minItems:1,maxItems:5,items:{type:'string'}},evidence:{type:'array',minItems:1,maxItems:5,items:{type:'string'}},memberAgreement:{type:'string'}},additionalProperties:false};
const REBUTTAL_SCHEMA={type:'object',required:['accepted','objections','revisedPosition'],properties:{accepted:{type:'array',maxItems:5,items:{type:'string'}},objections:{type:'array',maxItems:5,items:{type:'string'}},revisedPosition:{type:'string'}},additionalProperties:false};
const MEETING_SCHEMA={type:'object',required:['issues','consensusActions','conflicts','holds'],properties:{issues:{type:'array',minItems:1,maxItems:20,items:{type:'object',required:['topic','state','decision','reason','departments'],properties:{topic:{type:'string'},state:{type:'string',enum:['CONSENSUS','CONFLICT','HOLD']},decision:{type:'string'},reason:{type:'string'},departments:{type:'array',minItems:1,maxItems:5,items:{type:'string'}}},additionalProperties:false}},consensusActions:{type:'array',items:{type:'string'}},conflicts:{type:'array',items:{type:'string'}},holds:{type:'array',items:{type:'string'}}},additionalProperties:false};
const REVISED_SCHEMA={type:'object',required:['design','revisionTrace'],properties:{design:DESIGN_SCHEMA,revisionTrace:{type:'array',minItems:1,maxItems:15,items:{type:'string'}}},additionalProperties:false};
const ARTBOOK_SCHEMA={type:'object',required:['identity','playerFantasy','coreLoop','signatureSystems','progressionDirection','visualDirection','tierStrategy','newClaimsAdded'],properties:{identity:{type:'string'},playerFantasy:{type:'string'},coreLoop:{type:'array',minItems:3,maxItems:6,items:{type:'string'}},signatureSystems:{type:'array',minItems:1,maxItems:5,items:{type:'string'}},progressionDirection:{type:'string'},visualDirection:{type:'string'},tierStrategy:{type:'string'},newClaimsAdded:{type:'boolean'}},additionalProperties:false};
const RISK_SCHEMA={type:'object',required:['issues','releaseBlocker'],properties:{issues:{type:'array',minItems:1,maxItems:8,items:{type:'object',required:['severity','area','problem','evidence','action'],properties:{severity:{type:'string',enum:['LOW','MEDIUM','HIGH','BLOCKER']},area:{type:'string'},problem:{type:'string'},evidence:{type:'string'},action:{type:'string'}},additionalProperties:false}},releaseBlocker:{type:'boolean'}},additionalProperties:false};

async function callModel({model,system,user,schema,seed}){
  let last;
  for(let attempt=0;attempt<3;attempt++){
    try{
      const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,think:false,format:schema,messages:[{role:'system',content:system},{role:'user',content:user}],options:{temperature:0.18,seed:Number(seed)+attempt,num_ctx:12288,num_predict:2200}})});
      if(!response.ok)throw new Error(`ollama ${model} ${response.status}`);
      const payload=await response.json();
      const raw=clean(payload?.message?.content).replace(/^```json\s*/i,'').replace(/```$/,'');
      const parsed=JSON.parse(raw);
      return parsed;
    }catch(error){last=error;console.error(`MODEL_RETRY=${model}:${attempt+1}:${error.message}`);}
  }
  throw last||new Error(`Model failed: ${model}`);
}

const designerIndex=hash(`${gameId}:designer`)%pool.length;
const designerModel=pool[designerIndex];
const editorModel=pool[(designerIndex+1)%pool.length];
const coordinatorModel=pool[(designerIndex+2)%pool.length];
const roleFocus={planning:'핵심 재미, 루프, 플레이어 선택, 콘텐츠 인과, 정체성',graphics:'비주얼 정체성, 모바일 가독성, 에셋 제작량, 애니메이션과 이펙트 비용',development:'구현 난이도, 구조 복잡도, 성능, 세이브, Web/Unity 이전성과 기술 위험',qa:'테스트 가능성, 재현 조건, 회귀, 입력, 저장, 앱 복귀, 기기별 위험',balance:'전투 시간, 성장 속도, 난이도 곡선, 경제 인플레, 악용 가능성'};

function tierContext(){
  if(tier===3)return '3분류다. 아직 자동 source-code 개발을 하지 않는다. 목표는 개발에 넘길 수 있는 DESIGN_BASELINE이다.';
  if(tier===2)return '2분류다. Web gameplay validation과 Unity technical validation 근거를 중시하고 구현·성능·제작비·QA까지 상세하게 판단해 DEVELOPMENT_BASELINE을 만든다.';
  return '1분류다. Vibe2가 확정 설계대로 본개발한다. 부서는 새 기능 제안보다 오류와 출시 위험만 찾아야 하며 핵심 설계를 자동 변경하지 않는다.';
}

async function buildDepartmentReview(role,design){
  const memberReviews=[];
  for(let i=0;i<pool.length;i++){
    const model=pool[i];
    const system=`/no_think\n너는 재운컴퍼니 ${ROLE_NAMES[role]} 부서의 독립 AI 직원이다. ${tierContext()} 같은 부서의 다른 AI 답을 아직 보지 말고 독립적으로 검토한다. 담당 관점: ${roleFocus[role]}. 설계를 대신 작성하지 말고 KEEP/FIX/ADD/RISK/EVIDENCE로 검토한다. 기존 사실과 제안을 구분하고 근거 없는 새 핵심 규칙을 확정하지 않는다. 한국어 JSON만 출력한다.`;
    const review=await callModel({model,system,user:JSON.stringify({design,evidence:evidenceText}),schema:REVIEW_SCHEMA,seed:hash(`${gameId}:${date}:${role}:${model}:member`)});
    memberReviews.push({model,review});
  }
  if(uniq(memberReviews.map(x=>x.model)).length<minModels)throw new Error(`${role}: distinct member model gate failed`);
  const leader=pool[(designerIndex+ROLES.indexOf(role)+1)%pool.length];
  const representative=await callModel({model:leader,system:`/no_think\n너는 ${ROLE_NAMES[role]} 부서 회의 정리자다. 서로 다른 실제 AI 모델 직원들의 독립 검토를 모두 읽고 공통점과 충돌을 비교해 부서 대표 의견 하나로 합친다. 소수 의견을 지우지 말고 risks/evidence에 남긴다. 다른 부서 설계를 대신 쓰지 않는다. 한국어 JSON만 출력한다.`,user:JSON.stringify({role,memberReviews}),schema:REP_SCHEMA,seed:hash(`${gameId}:${date}:${role}:representative`)});
  return {department:role,departmentName:ROLE_NAMES[role],memberModels:memberReviews.map(x=>x.model),memberReviews,representativeModel:leader,representative};
}

async function runTierOneRiskWatch(){
  const departments={};
  for(const role of ROLES){
    const members=[];
    for(const model of pool){
      const review=await callModel({model,system:`/no_think\n너는 1분류 출시 게임의 ${ROLE_NAMES[role]} 오류 감시 AI다. 새 기능을 기획하지 않는다. 확정 설계와 현재 근거에서 오류, 회귀, 성능, 세이브, UX, 밸런스 붕괴 등 출시 위험만 구체적으로 찾는다. 근거가 없는 문제를 사실처럼 쓰지 않는다. 한국어 JSON만 출력한다.`,user:JSON.stringify({game:evidence.game,evidence:evidenceText}),schema:RISK_SCHEMA,seed:hash(`${gameId}:${date}:${role}:${model}:risk`) });
      members.push({model,review});
    }
    if(uniq(members.map(x=>x.model)).length<minModels)throw new Error(`${role}: tier1 multimodel risk gate failed`);
    const representativeModel=pool[(designerIndex+ROLES.indexOf(role))%pool.length];
    const representative=await callModel({model:representativeModel,system:`/no_think\n너는 1분류 ${ROLE_NAMES[role]} 부서 오류감시 대표다. 여러 실제 모델이 찾은 문제를 중복 제거하고 실제 출시를 막는 위험을 우선 정리한다. 새 게임 기능이나 설계 변경을 발명하지 않는다. 한국어 JSON만 출력한다.`,user:JSON.stringify({members}),schema:RISK_SCHEMA,seed:hash(`${gameId}:${date}:${role}:risk-rep`)});
    departments[role]={memberModels:members.map(x=>x.model),members,representativeModel,representative};
  }
  const status={version:1,gameId,date,tier,mode:'TIER1_VIBE2_PRIMARY_DEVELOPMENT_DEPARTMENT_RISK_WATCH',vibe2PrimaryDeveloper:true,designModificationAllowed:false,minDistinctModelsPerDepartment:minModels,modelPool:pool,departments,createdAt:new Date().toISOString()};
  writeJson(path.join(base,'release-risk-watch.json'),status);
  writeJson(path.join(base,'cycle-status.json'),{version:1,gameId,date,tier,status:'COMPLETE',flow:'TIER1_RISK_WATCH',vibe2PrimaryDeveloper:true,departmentRole:'ERROR_AND_RELEASE_RISK_REVIEW',designChanged:false,artbookChanged:false,modelPool:pool,minDistinctModelsPerDepartment:minModels});
  console.log('COMPANY_DESIGN_CYCLE=TIER1_RISK_WATCH_COMPLETE');
  return;
}

if(tier===1){
  await runTierOneRiskWatch();
  process.exit(0);
}

const draft=await callModel({model:designerModel,system:`/no_think\n너는 이 프로젝트의 단일 Game Designer AI다. ${tierContext()} 상세 게임 설계 초안을 처음부터 끝까지 혼자 작성한다. 5개 부서가 초안을 공동 집필하지 않는다. 현재 게임 근거와 사용자 기준을 보존하고, 근거 없는 기존 사실을 만들지 않는다. 제안은 설계안으로만 다룬다. 핵심 재미, 핵심 루프, 대표 시스템, 성장, 비주얼, 모바일 UX, 기술 가정, 검증 질문을 서로 연결한다. 한국어 JSON만 출력한다.`,user:JSON.stringify({game:evidence.game,workOrder,evidence:evidenceText}),schema:DESIGN_SCHEMA,seed:hash(`${gameId}:${date}:designer:draft`)});
writeJson(path.join(base,'design-draft.json'),{version:1,gameId,date,tier,authorRole:'GAME_DESIGNER_AI',authorModel:designerModel,status:'DRAFT',design:draft});

const departments={};
for(const role of ROLES){departments[role]=await buildDepartmentReview(role,draft);writeJson(path.join(base,'department-reviews',`${role}.json`),departments[role]);}

const reps=Object.fromEntries(ROLES.map(role=>[role,departments[role].representative]));
const rebuttals={};
for(const role of ROLES){
  const model=departments[role].representativeModel;
  rebuttals[role]=await callModel({model,system:`/no_think\n너는 ${ROLE_NAMES[role]} 부서 대표다. 다른 4개 부서 대표 의견까지 모두 읽고 딱 1회의 반박·수정 라운드를 수행한다. 타당한 타부서 의견은 accepted, 반대하는 내용은 objections에 근거와 함께 쓰고, 마지막 revisedPosition에 최종 입장을 요약한다. 한국어 JSON만 출력한다.`,user:JSON.stringify({own:reps[role],allDepartments:reps,design:draft}),schema:REBUTTAL_SCHEMA,seed:hash(`${gameId}:${date}:${role}:rebuttal`)});
}
writeJson(path.join(base,'meeting-rebuttals.json'),{version:1,gameId,date,rounds:1,rebuttals});

const meeting=await callModel({model:coordinatorModel,system:`/no_think\n너는 재운컴퍼니 설계 회의 조정기다. 5개 부서 대표 의견과 각 부서의 1회 반박을 읽고 안건별로 CONSENSUS / CONFLICT / HOLD만 판정한다. 다수결만으로 핵심 설계를 확정하지 말고 근거와 실제 제약을 본다. 자동 설계 수정에 넘길 내용은 consensusActions에만 넣는다. 충돌과 보류는 숨기지 않는다. 새 설계를 직접 창작하지 않는다. 한국어 JSON만 출력한다.`,user:JSON.stringify({design:draft,representatives:reps,rebuttals}),schema:MEETING_SCHEMA,seed:hash(`${gameId}:${date}:meeting`)});
writeJson(path.join(base,'meeting.json'),{version:1,gameId,date,coordinatorModel,departmentCount:5,rebuttalRounds:1,meeting});

const revised=await callModel({model:designerModel,system:`/no_think\n너는 초안을 작성했던 동일한 Game Designer AI다. 회의 결과 중 CONSENSUS만 자동 반영해 상세 설계를 수정한다. CONFLICT/HOLD를 몰래 결정하거나 합의된 것처럼 쓰지 않는다. 기존 핵심 정체성을 불필요하게 바꾸지 않는다. revisionTrace에는 실제 반영한 합의만 적는다. 한국어 JSON만 출력한다.`,user:JSON.stringify({originalDesign:draft,consensusActions:meeting.consensusActions,conflicts:meeting.conflicts,holds:meeting.holds}),schema:REVISED_SCHEMA,seed:hash(`${gameId}:${date}:designer:revision`)});
writeJson(path.join(base,'design-revised.json'),{version:1,gameId,date,tier,authorRole:'GAME_DESIGNER_AI',authorModel:designerModel,sameModelAsDraft:true,status:tier===3?'DESIGN_BASELINE_CANDIDATE':'DEVELOPMENT_BASELINE_CANDIDATE',...revised,unresolved:{conflicts:meeting.conflicts,holds:meeting.holds}});

const artbook=await callModel({model:editorModel,system:`/no_think\n너는 별도의 단일 Artbook Editor AI다. 수정된 상세 설계를 읽고 게임의 핵심 전략만 압축해 한 권의 아트북 내용으로 정리한다. 부서별 페이지를 만들지 않는다. 새 설정, 새 수치, 새 규칙을 발명하면 안 된다. 상세 구현 설명이나 긴 QA 목록은 옮기지 않는다. identity, playerFantasy, coreLoop, signatureSystems, progressionDirection, visualDirection만 간결하게 남긴다. newClaimsAdded는 반드시 false다. 한국어 JSON만 출력한다.`,user:JSON.stringify({game:evidence.game,revisedDesign:revised.design,tier}),schema:ARTBOOK_SCHEMA,seed:hash(`${gameId}:${date}:artbook-editor`)});
if(artbook.newClaimsAdded!==false)throw new Error('ARTBOOK_EDITOR_GATE: newClaimsAdded must be false');
writeJson(path.join(submissionBase,'core-artbook.json'),{version:1,gameId,date,tier,authorRole:'ARTBOOK_EDITOR_AI',authorModel:editorModel,detail:'CORE_STRATEGY_ONLY',departmentPageAuthorship:false,sourceDesign:path.join(base,'design-revised.json').replaceAll('\\','/'),artbook});

const modelAudit=Object.fromEntries(ROLES.map(role=>[role,{distinctModels:uniq(departments[role].memberModels),count:uniq(departments[role].memberModels).length,required:minModels,pass:uniq(departments[role].memberModels).length>=minModels}]));
const allDepartmentModelGatesPass=Object.values(modelAudit).every(x=>x.pass);
if(!allDepartmentModelGatesPass)throw new Error('MULTIMODEL_DEPARTMENT_GATE_FAILED');
writeJson(path.join(base,'cycle-status.json'),{version:1,gameId,date,tier,status:'COMPLETE',flow:tier===3?'TIER3_DESIGN_BASELINE_CYCLE':'TIER2_DEVELOPMENT_BASELINE_REVIEW_CYCLE',policyDocument:directive.policyDocument||'COMPANY_FLOW.md',designer:{model:designerModel,singleAuthor:true,sameModelRevised:true},departments:{count:5,minDistinctModelsPerDepartment:minModels,modelAudit,internalConsensus:true,crossDepartmentMeeting:true,rebuttalRounds:1},meeting:{consensusCount:meeting.consensusActions.length,conflictCount:meeting.conflicts.length,holdCount:meeting.holds.length},artbook:{editorModel,singleEditor:true,coreStrategyOnly:true,departmentPageAuthorship:false,newClaimsAdded:false},vibe2Role:tier===3?'VALIDATION_AND_LEARNING':'VALIDATION_TEST_ANALYSIS_AND_DEVELOPMENT_SUPPORT',paidApi:false,createdAt:new Date().toISOString()});
console.log(`COMPANY_DESIGN_CYCLE=${tier===3?'TIER3':'TIER2'}_COMPLETE`);
console.log(`GAME_DESIGNER_MODEL=${designerModel}`);
console.log(`ARTBOOK_EDITOR_MODEL=${editorModel}`);
console.log(`DEPARTMENT_MULTIMODEL_GATE=${allDepartmentModelGatesPass?'PASS':'FAIL'}`);
console.log(`DISTINCT_MODELS_PER_DEPARTMENT_MIN=${minModels}`);
console.log('DEPARTMENT_ARTBOOK_AUTHORSHIP=NO');
console.log(`VIBE2_ROLE=${tier===3?'VALIDATION_AND_LEARNING':'VALIDATION_TEST_ANALYSIS_AND_DEVELOPMENT_SUPPORT'}`);
console.log('PAID_API=NO');
