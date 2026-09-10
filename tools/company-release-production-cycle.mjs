import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {PRODUCTION_CLASSES,productionClassOf,tierAliasForProductionClass} from './production-classification.mjs';

const ROLES=['planning','graphics','development','qa','balance'];
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const clip=(v,n=12000)=>{const s=typeof v==='string'?v:JSON.stringify(v);return s.length>n?s.slice(0,n):s;};
const uniq=values=>[...new Set(values.map(clean).filter(Boolean))];
function kstDate(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return`${g('year')}-${g('month')}-${g('day')}`;}
function hash(value){let h=2166136261;for(const ch of String(value)){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;}

const directive=readJson('company-directive.json',{});
const ai=directive.ai||{};
const numericLabels=directive.production?.numericLabels||{};
const configuredPool=clean(process.env.COMPANY_MODEL_POOL).split(',').filter(Boolean);
const pool=uniq(configuredPool.length?configuredPool:(ai.modelPool||[]));
const minModels=Number(ai.minDistinctModelsPerDepartment||3);
const reviewModelCount=Math.max(minModels,Number(ai.departmentReviewModelCount||minModels));
const leadModels=Object.fromEntries(ROLES.map(role=>[role,clean(ai.departmentLeadModels?.[role])]));
const distinctLeadModels=uniq(ROLES.map(role=>leadModels[role]));

if(pool.length<reviewModelCount)throw new Error(`MULTIMODEL_GATE: ${pool.length}/${reviewModelCount}`);
if(ai.departmentLeadModelsMustBeDistinct!==false&&distinctLeadModels.length<ROLES.length){
  throw new Error(`DEPARTMENT_LEAD_GATE: ${distinctLeadModels.length}/${ROLES.length}`);
}
for(const role of ROLES){
  if(!leadModels[role]||!pool.includes(leadModels[role]))throw new Error(`DEPARTMENT_LEAD_GATE: invalid ${role} lead`);
}
function reviewModelsFor(role){
  const lead=leadModels[role];
  const start=Math.max(0,pool.indexOf(lead));
  const models=[lead];
  for(let i=1;models.length<reviewModelCount&&i<=pool.length*2;i++){
    const model=pool[(start+i)%pool.length];
    if(model&&!models.includes(model))models.push(model);
  }
  if(models.length<reviewModelCount)throw new Error(`${role} review model gate failed`);
  return models;
}
const reviewModels=Object.fromEntries(ROLES.map(role=>[role,reviewModelsFor(role)]));

const gameId=clean(process.env.ARTBOOK_GAME_ID||process.env.GAME_ID||process.argv.find(x=>x.startsWith('--game='))?.split('=')[1]);
const date=clean(process.env.ARTBOOK_DATE||process.env.DESIGN_DATE||kstDate());
if(!gameId)throw new Error('ARTBOOK_GAME_ID or GAME_ID is required');

const catalog=readJson('game-catalog.json',{games:[]});
const game=(catalog.games||[]).find(x=>x.id===gameId);
if(!game)throw new Error(`Unknown game: ${gameId}`);
const productionClass=productionClassOf({},game,{numericLabels});
if(productionClass!==PRODUCTION_CLASSES.RELEASE_CONFIRMED)throw new Error(`RELEASE_PRODUCTION_CLASS_REQUIRED: ${productionClass}`);
const tierAlias=tierAliasForProductionClass(productionClass,{numericLabels})??(Number(game.productionTier||0)||null);
const base=path.join('design',gameId,date);
fs.mkdirSync(base,{recursive:true});

const unityProjectPath=clean(game.unityProjectPath);
function currentUnitySourceTreeSha(){
  if(!unityProjectPath||!fs.existsSync(unityProjectPath))return null;
  try{return clean(execFileSync('git',['rev-parse',`HEAD:${unityProjectPath}`],{encoding:'utf8'}));}catch{return null;}
}
const currentSourceTreeSha=currentUnitySourceTreeSha();

const RISK={type:'object',required:['blockers','warnings','evidence'],properties:{
  blockers:{type:'array',items:{type:'string'}},
  warnings:{type:'array',items:{type:'string'}},
  evidence:{type:'array',items:{type:'string'}}
},additionalProperties:false};
const ARTBOOK={type:'object',required:['identity','playerFantasy','coreLoop','signatureSystems','progressionDirection','visualDirection'],properties:{
  identity:{type:'string'},playerFantasy:{type:'string'},coreLoop:{type:'array',items:{type:'string'}},
  signatureSystems:{type:'array',items:{type:'string'}},progressionDirection:{type:'string'},visualDirection:{type:'string'}
},additionalProperties:false};
const VERIFY={type:'object',required:['supported','unsupportedClaims'],properties:{
  supported:{type:'boolean'},unsupportedClaims:{type:'array',items:{type:'string'}}
},additionalProperties:false};

async function callModel(model,system,user,schema,{predict=700,temperature=0.15}={}){
  let lastError=null;
  for(let attempt=1;attempt<=2;attempt++){
    try{
      const response=await fetch('http://127.0.0.1:11434/api/chat',{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({
          model,stream:false,format:schema,
          messages:[{role:'system',content:system},{role:'user',content:user}],
          options:{temperature:attempt===1?temperature:0,num_ctx:8192,num_predict:predict}
        })
      });
      if(!response.ok)throw new Error(`ollama ${response.status}: ${await response.text()}`);
      const body=await response.json();
      const text=clean(body?.message?.content);
      if(!text)throw new Error('empty model response');
      return JSON.parse(text);
    }catch(error){lastError=error;}
  }
  throw new Error(`MODEL_CALL_FAILED ${model}: ${clean(lastError?.message)}`);
}

function latestFile(fileName){
  const root=path.join('design',gameId);
  if(!fs.existsSync(root))return {path:null,data:null,date:null};
  const dates=fs.readdirSync(root,{withFileTypes:true})
    .filter(e=>e.isDirectory()&&/^\d{4}-\d{2}-\d{2}$/.test(e.name))
    .map(e=>e.name).sort().reverse();
  for(const d of dates){
    const file=path.join(root,d,fileName);
    if(!fs.existsSync(file))continue;
    return {path:file.replaceAll('\\','/'),data:readJson(file,null),date:d};
  }
  return {path:null,data:null,date:null};
}
function latestDevelopmentBaseline(){
  const root=path.join('design',gameId);
  if(!fs.existsSync(root))return null;
  const dates=fs.readdirSync(root,{withFileTypes:true})
    .filter(e=>e.isDirectory()&&/^\d{4}-\d{2}-\d{2}$/.test(e.name))
    .map(e=>e.name).sort().reverse();
  for(const d of dates){
    const file=path.join(root,d,'design-development-baseline.json');
    const data=readJson(file,null);
    if(data?.status==='DEVELOPMENT_BASELINE_READY'&&data?.content){
      return {path:file.replaceAll('\\','/'),date:d,data,content:data.content};
    }
  }
  return null;
}
function explicitState(data){
  if(!data||typeof data!=='object'||Array.isArray(data))return 'MISSING';
  if(clean(data.gameId)&&clean(data.gameId)!==gameId)return 'MISSING';
  if(data.pass===true||data.validated===true)return 'PASS';
  if(data.pass===false||data.validated===false)return 'FAIL';
  const value=clean(data.status||data.result||data.decision||data.state).toUpperCase();
  if(['PASS','PASSED','VALIDATED','READY','SUCCESS','SUCCEEDED','COMPLETE','COMPLETED'].includes(value))return 'PASS';
  if(['FAIL','FAILED','REJECTED','BLOCKED','ERROR'].includes(value))return 'FAIL';
  return 'MISSING';
}
function implementationSourceTreeSha(data){return clean(data?.sourceTreeSha||data?.source_tree_sha);}
function buildSourceTreeSha(data){return clean(data?.sourceTreeSha||data?.source_tree_sha);}
function buildIdentity(data){return clean(data?.buildId||data?.build_id||data?.sha256||data?.artifactSha256);}
function evidenceBuildIdentity(data){return clean(data?.buildId||data?.build_id||data?.buildSha256||data?.artifactSha256||data?.sha256);}
function evidenceForBuild(record,identity){
  const state=explicitState(record?.data);
  if(state==='MISSING')return {...record,state:'MISSING',bound:false,referencedBuild:null};
  const ref=evidenceBuildIdentity(record.data);
  const bound=Boolean(identity&&ref&&ref===identity);
  return {...record,state:bound?state:'MISSING',bound,referencedBuild:ref||null};
}
function hasCoreLockViolation(...records){
  return records.some(record=>record?.data?.coreDesignLockViolation===true||record?.data?.core_design_lock_violation===true);
}

function writeState(state,{baseline=null,implementation=null,build=null,runtime=null,qa=null,riskWatch=null,blockers=[],nextAction=null,releaseBaseline=null,artbook=null}={}){
  const implementationTree=implementationSourceTreeSha(implementation?.data);
  const buildTree=buildSourceTreeSha(build?.data);
  const status={
    version:3,gameId,date,productionClass,tierAlias,tier:tierAlias,policyDocument:'COMPANY_FLOW.md',
    flow:'RELEASE_CONFIRMED_GATED_DIRECT_RELEASE_PRODUCTION',executionMode:'GATED_DIRECT_RELEASE_PRODUCTION',
    status:state==='RELEASE_READY'?'COMPLETE':state==='RELEASE_BLOCKED'?'BLOCKED':state==='BUILDING'?'BUILDING':'WAITING',
    state,vibe2PrimaryDeveloper:true,coreDesignLock:true,
    unityProjectPath:unityProjectPath||null,currentSourceTreeSha,
    developmentBaseline:baseline?{path:baseline.path,date:baseline.date}:null,
    evidence:{
      implementation:implementation?{
        state:explicitState(implementation.data),path:implementation.path,sourceTreeSha:implementationTree||null,
        boundToCurrentSource:Boolean(currentSourceTreeSha&&implementationTree===currentSourceTreeSha)
      }:null,
      build:build?{
        state:explicitState(build.data),path:build.path,identity:buildIdentity(build.data)||null,sourceTreeSha:buildTree||null,
        boundToCurrentSource:Boolean(currentSourceTreeSha&&buildTree===currentSourceTreeSha),
        boundToImplementation:Boolean(implementationTree&&buildTree===implementationTree)
      }:null,
      runtime:runtime?{state:runtime.state,path:runtime.path,bound:runtime.bound,referencedBuild:runtime.referencedBuild}:null,
      independentQa:qa?{state:qa.state,path:qa.path,bound:qa.bound,referencedBuild:qa.referencedBuild}:null
    },
    departments:riskWatch?{
      count:ROLES.length,leadModels,distinctLeadModelCount:distinctLeadModels.length,
      leadModelsDistinct:distinctLeadModels.length===ROLES.length,reviewModelCount,
      riskWatchPath:riskWatch.path,phase:riskWatch.phase,releaseBlockerCount:riskWatch.releaseBlockerCount
    }:null,
    blockers,nextAction,releaseBaseline:releaseBaseline?.path||null,artbook:artbook?.path||null,
    contracts:{
      gatedDirect:true,resumeFromLatestEvidence:true,vibe2PrimaryDeveloper:true,coreDesignLock:true,
      aiMayInventBuildPass:false,aiMayInventDeviceValidationPass:false,aiMayInventIndependentQaPass:false,
      currentSourceTreeBindingRequired:true,currentBuildEvidenceBindingRequired:true,sourceChangeInvalidatesOldBuildValidation:true,
      finalDepartmentRiskWatchUsesBuildRuntimeQaEvidence:true,
      finalArtbookOnlyAfterReleaseReady:true,numericTierIsCompatibilityAliasOnly:true
    },
    updatedAt:new Date().toISOString()
  };
  writeJson(path.join(base,'release-production-status.json'),status);
  writeJson(path.join(base,'cycle-status.json'),status);
  writeJson(path.join(base,'release-production-request.json'),{
    version:3,gameId,date,state,nextAction,blockers,policyDocument:'COMPANY_FLOW.md',
    vibe2PrimaryDeveloper:true,coreDesignLock:true,unityProjectPath:unityProjectPath||null,currentSourceTreeSha
  });
  console.log(`RELEASE_DIRECT_STATE=${state}`);
  console.log(`CURRENT_SOURCE_TREE_SHA=${currentSourceTreeSha||'MISSING'}`);
  if(nextAction)console.log(`NEXT_ACTION=${nextAction}`);
  return status;
}

async function runRiskWatch(baseline,build,{runtime=null,qa=null,phase='BUILD_PREFLIGHT'}={}){
  const identity=buildIdentity(build.data);
  const finalPhase=phase==='FINAL_RELEASE_REVIEW';
  if(finalPhase){
    if(runtime?.state!=='PASS'||runtime?.bound!==true)throw new Error('FINAL_RISK_WATCH_REQUIRES_CURRENT_BUILD_RUNTIME_PASS');
    if(qa?.state!=='PASS'||qa?.bound!==true)throw new Error('FINAL_RISK_WATCH_REQUIRES_CURRENT_BUILD_INDEPENDENT_QA_PASS');
  }
  const evidence={
    developmentBaseline:baseline.content,
    build:build.data,
    androidRuntimeValidation:runtime?.data||null,
    independentReleaseQa:qa?.data||null,
    currentSourceTreeSha,
    currentBuildIdentity:identity,
    phase,
    game:{id:game.id,name:game.name,unityProjectPath:unityProjectPath||null}
  };
  const departmentRiskWatch={};
  let releaseBlockerCount=0;

  for(const role of ROLES){
    const lead=leadModels[role];
    const models=reviewModels[role];
    const passes=[];
    for(const model of models){
      const memberRole=model===lead?'LEAD':'ASSISTANT';
      const scope=finalPhase
        ?'현재 Development Baseline, 현재 Android 빌드, 그 빌드에 묶인 실제 Android 런타임 검증과 독립 QA/회귀 근거'
        :'현재 Development Baseline과 현재 Android 빌드 근거';
      const result=await callModel(
        model,
        `너는 ${role} 부서의 ${memberRole} 출시 위험 감시 AI다. 새 기능을 기획하지 말고 ${scope}에서 실제 출시 차단 위험만 찾는다. 근거가 불충분하면 blocker로 만들지 않는다.`,
        `현재 릴리즈 후보의 ${role} 책임영역을 검토하라. blockers는 제공된 실제 근거로 출시를 막아야 함이 명확한 항목만 넣고, 경미하거나 불확실한 항목은 warnings에 둔다.\nEVIDENCE=${clip(evidence,18000)}`,
        RISK,{predict:520}
      );
      passes.push({model,memberRole,result});
    }
    const representative=await callModel(
      lead,
      `너는 ${role} 부서 Lead AI다. 보조 AI 결과를 통합하되 추측과 중복을 제거하고 제공된 현재 빌드 근거로 확인되는 출시 차단 위험만 blockers로 확정한다.`,
      `PHASE=${phase}\n다음 ${role} 부서 결과를 통합하라.\nPASSES=${clip(passes,12000)}\nEVIDENCE=${clip(evidence,12000)}`,
      RISK,{predict:480,temperature:0.05}
    );
    releaseBlockerCount+=representative.blockers.length;
    departmentRiskWatch[role]={
      leadModel:lead,assistantModels:models.filter(m=>m!==lead),models,passes,representative
    };
  }

  const fileName=finalPhase?'release-risk-watch.json':'release-risk-watch-preflight.json';
  const file=path.join(base,fileName);
  writeJson(file,{
    version:3,gameId,date,productionClass,phase,buildIdentity:identity,sourceTreeSha:currentSourceTreeSha,
    evidenceBindings:{
      buildIdentity:identity,
      androidRuntimeValidation:runtime?{path:runtime.path,state:runtime.state,bound:runtime.bound,referencedBuild:runtime.referencedBuild}:null,
      independentReleaseQa:qa?{path:qa.path,state:qa.state,bound:qa.bound,referencedBuild:qa.referencedBuild}:null,
      allFinalEvidenceBound:finalPhase?Boolean(runtime?.bound&&qa?.bound&&runtime?.state==='PASS'&&qa?.state==='PASS'):false
    },
    leadModels,distinctLeadModels,reviewModels,departmentRiskWatch,releaseBlockerCount,
    departmentErrorWatchOnly:true,newFeatureProposalDefault:false,
    finalReviewUsesBuildRuntimeQaEvidence:finalPhase
  });
  return {path:file.replaceAll('\\','/'),phase,releaseBlockerCount,departmentRiskWatch};
}

const baseline=latestDevelopmentBaseline();
if(!baseline){
  writeState('RELEASE_BLOCKED',{
    blockers:['development-baseline-required'],
    nextAction:'2분류에서 DEVELOPMENT_BASELINE_READY를 먼저 만든다.'
  });
  process.exit(0);
}

if(!unityProjectPath||!fs.existsSync(unityProjectPath)||!currentSourceTreeSha){
  writeJson(path.join(base,'vibe2-release-work-request.json'),{
    version:3,gameId,date,productionClass,owner:'VIBE2',role:'PRIMARY_DEVELOPMENT_ENGINE',state:'BUILDING',
    developmentBaseline:baseline.path,unityProjectPath:unityProjectPath||null,coreDesignLock:true,
    instruction:'Development Baseline을 따라 Unity Android 프로젝트/본개발을 준비하고 현재 Unity source tree SHA를 기록할 수 있는 상태로 만든다.',
    policyDocument:'COMPANY_FLOW.md'
  });
  writeState('BUILDING',{
    baseline,blockers:['unity-project-or-source-tree-required'],
    nextAction:'Vibe2가 Unity Android 프로젝트와 실제 소스 트리를 준비한다.'
  });
  process.exit(0);
}

const implementation=latestFile('vibe2-release-implementation.json');
if(hasCoreLockViolation(implementation)){
  writeState('RELEASE_BLOCKED',{
    baseline,implementation,blockers:['core-design-lock-violation'],
    nextAction:'사용자 결정 또는 출시차단 예외 설계회의 없이 Core Design Lock 변경을 진행하지 않는다.'
  });
  process.exit(0);
}
if(explicitState(implementation.data)==='FAIL'){
  writeState('FIX_AND_REVERIFY',{
    baseline,implementation,blockers:['vibe2-release-implementation-failed'],
    nextAction:'Vibe2가 확인된 구현 실패를 수정하고 현재 source tree SHA를 포함한 새 구현 근거를 기록한다.'
  });
  process.exit(0);
}

const implementationTree=implementationSourceTreeSha(implementation.data);
if(explicitState(implementation.data)!=='PASS'||!implementationTree||implementationTree!==currentSourceTreeSha){
  writeJson(path.join(base,'vibe2-release-work-request.json'),{
    version:3,gameId,date,productionClass,owner:'VIBE2',role:'PRIMARY_DEVELOPMENT_ENGINE',state:'BUILDING',
    developmentBaseline:baseline.path,unityProjectPath,currentSourceTreeSha,coreDesignLock:true,
    instruction:'Development Baseline을 따라 Unity Android 본개발/통합을 수행한다. 새 핵심 기능을 임의 추가하지 말고 구현 완료 근거에 현재 sourceTreeSha를 정확히 기록한다.',
    policyDocument:'COMPANY_FLOW.md'
  });
  writeState('BUILDING',{
    baseline,implementation,blockers:['current-source-vibe2-implementation-evidence-required'],
    nextAction:`현재 Unity source tree ${currentSourceTreeSha}를 참조하는 vibe2-release-implementation.json 근거를 기록한다.`
  });
  process.exit(0);
}

const build=latestFile('unity-android-build.json');
const buildState=explicitState(build.data);
const identity=buildIdentity(build.data);
const buildTree=buildSourceTreeSha(build.data);

if(buildState==='FAIL'&&buildTree===currentSourceTreeSha){
  writeState('FIX_AND_REVERIFY',{
    baseline,implementation,build,blockers:['unity-android-build-failed'],
    nextAction:'Vibe2가 현재 소스의 빌드 실패 원인을 수정하고 새 Unity Android build 근거를 만든다.'
  });
  process.exit(0);
}
if(buildState!=='PASS'||!identity||!buildTree||buildTree!==currentSourceTreeSha||buildTree!==implementationTree){
  writeState('WAITING_BUILD',{
    baseline,implementation,build,blockers:['current-source-unity-android-build-required'],
    nextAction:`현재 sourceTreeSha ${currentSourceTreeSha}로 Unity Android 빌드를 수행하고 buildId 또는 sha256 + 같은 sourceTreeSha를 unity-android-build.json에 기록한다.`
  });
  process.exit(0);
}

// 1차 부서 preflight: 빌드 메타/구조만으로도 명확히 보이는 차단 위험을 먼저 잡는다.
const preflightRiskWatch=await runRiskWatch(baseline,build,{phase:'BUILD_PREFLIGHT'});
if(preflightRiskWatch.releaseBlockerCount>0){
  writeState('FIX_AND_REVERIFY',{
    baseline,implementation,build,riskWatch:preflightRiskWatch,
    blockers:[`department-preflight-release-blockers:${preflightRiskWatch.releaseBlockerCount}`],
    nextAction:'Vibe2가 빌드 단계에서 확인된 출시 차단 결함을 수정하고 새 소스/빌드부터 다시 검증한다.'
  });
  process.exit(0);
}

const runtime=evidenceForBuild(latestFile('android-runtime-validation.json'),identity);
if(hasCoreLockViolation(build,runtime)){
  writeState('RELEASE_BLOCKED',{
    baseline,implementation,build,runtime,riskWatch:preflightRiskWatch,blockers:['core-design-lock-violation'],
    nextAction:'사용자 결정 또는 출시차단 예외 설계회의 없이 Core Design Lock 변경을 진행하지 않는다.'
  });
  process.exit(0);
}
if(runtime.state==='FAIL'){
  writeState('FIX_AND_REVERIFY',{
    baseline,implementation,build,runtime,riskWatch:preflightRiskWatch,
    blockers:['android-runtime-validation-failed'],
    nextAction:'Vibe2가 현재 빌드의 실제 Android 런타임 실패 원인을 수정하고 새 소스/빌드로 재검증한다.'
  });
  process.exit(0);
}
if(runtime.state!=='PASS'){
  writeState('WAITING_DEVICE_VALIDATION',{
    baseline,implementation,build,runtime,riskWatch:preflightRiskWatch,
    blockers:['current-build-android-runtime-validation-required'],
    nextAction:`현재 build ${identity}를 실제 Android에서 검증하고 같은 build ID/SHA를 참조한 android-runtime-validation.json을 기록한다.`
  });
  process.exit(0);
}

const qa=evidenceForBuild(latestFile('independent-release-qa.json'),identity);
if(hasCoreLockViolation(qa)){
  writeState('RELEASE_BLOCKED',{
    baseline,implementation,build,runtime,qa,riskWatch:preflightRiskWatch,blockers:['core-design-lock-violation'],
    nextAction:'사용자 결정 또는 출시차단 예외 설계회의로 Core Design Lock 문제를 해결한다.'
  });
  process.exit(0);
}
if(qa.state==='FAIL'){
  writeState('FIX_AND_REVERIFY',{
    baseline,implementation,build,runtime,qa,riskWatch:preflightRiskWatch,
    blockers:['independent-release-qa-failed'],
    nextAction:'Vibe2가 독립 QA 실패를 수정하고 새 소스/빌드/기기/회귀 검증을 수행한다.'
  });
  process.exit(0);
}
if(qa.state!=='PASS'){
  writeState('WAITING_DEVICE_VALIDATION',{
    baseline,implementation,build,runtime,qa,riskWatch:preflightRiskWatch,
    blockers:['current-build-independent-qa-required'],
    nextAction:`현재 build ${identity}에 대해 독립 QA/회귀 검증을 실행하고 같은 build ID/SHA를 참조한 independent-release-qa.json을 기록한다.`
  });
  process.exit(0);
}

// 최종 부서 위험감시: 모든 부서가 동일한 현재 build + Android runtime + 독립 QA 실제 근거를 읽는다.
const finalRiskWatch=await runRiskWatch(baseline,build,{runtime,qa,phase:'FINAL_RELEASE_REVIEW'});
if(finalRiskWatch.releaseBlockerCount>0){
  writeState('FIX_AND_REVERIFY',{
    baseline,implementation,build,runtime,qa,riskWatch:finalRiskWatch,
    blockers:[`department-final-release-blockers:${finalRiskWatch.releaseBlockerCount}`],
    nextAction:'Vibe2가 최종 5부서 위험감시에서 확인된 출시 차단 결함을 수정하고 새 소스/빌드/기기/QA부터 재검증한다.'
  });
  process.exit(0);
}

const releaseBaselinePath=path.join(base,'release-baseline.json');
writeJson(releaseBaselinePath,{
  version:3,gameId,date,productionClass,tierAlias,tier:tierAlias,status:'RELEASE_READY',baseline:'RELEASE_BASELINE',
  developmentBaseline:baseline.path,currentSourceTreeSha,
  currentBuild:{identity,sourceTreeSha:buildTree,evidence:build.path},
  androidRuntimeValidation:runtime.path,independentQa:qa.path,
  departmentRiskWatch:finalRiskWatch.path,departmentPreflightRiskWatch:preflightRiskWatch.path,
  finalDepartmentReviewEvidenceBound:true,coreDesignLockPreserved:true,
  policyDocument:'COMPANY_FLOW.md',createdAt:new Date().toISOString()
});

const editorModel=pool[hash(`${gameId}:release-artbook-editor`)%pool.length];
const verifierModel=pool[(hash(`${gameId}:release-artbook-verifier`)+1)%pool.length];
const artbook=await callModel(
  editorModel,
  '너는 단일 Artbook Editor AI다. RELEASE_READY가 된 게임의 최종 핵심 전략만 압축한다. 새 설정·수치·규칙을 만들지 않고 Development Baseline에 있는 핵심 중 실제 출시 검증을 살아남은 내용만 유지한다.',
  `최종 Release Baseline 아트북 revision을 작성하라. 긴 QA/기기 로그는 복제하지 않는다.\nDEVELOPMENT_BASELINE=${clip(baseline.content,13000)}\nRELEASE_BASELINE=${clip(readJson(releaseBaselinePath,{}),6000)}`,
  ARTBOOK,{predict:750}
);
const verification=await callModel(
  verifierModel,
  '너는 Vibe2 검증 역할이다. 아트북 작성자가 아니다. 최종 아트북이 Development Baseline에 없는 새 주장을 만들지 않았는지 확인한다.',
  `DEVELOPMENT_BASELINE=${clip(baseline.content,12000)}\nFINAL_ARTBOOK=${clip(artbook,7000)}`,
  VERIFY,{predict:320,temperature:0}
);
if(!verification.supported)throw new Error(`RELEASE_ARTBOOK_PROVENANCE_GATE: ${verification.unsupportedClaims.join(' | ')}`);

const artbookPath=path.join(base,'core-artbook.json');
writeJson(artbookPath,{
  version:7,gameId,date,productionClass,tierAlias,tier:tierAlias,
  editorRole:'ARTBOOK_EDITOR_AI',editorModel,singleEditor:true,releaseBaseline:true,
  releaseBaselineSource:releaseBaselinePath.replaceAll('\\','/'),
  sourceDesign:baseline.path,sourceTreeSha:currentSourceTreeSha,
  departmentPageAuthorship:false,newClaimsAdded:false,verification,content:artbook
});

writeState('RELEASE_READY',{
  baseline,implementation,build,runtime,qa,riskWatch:finalRiskWatch,
  releaseBaseline:{path:releaseBaselinePath.replaceAll('\\','/')},
  artbook:{path:artbookPath.replaceAll('\\','/')}
});
console.log('RELEASE_GATE=READY');
console.log(`CURRENT_SOURCE_TREE_SHA=${currentSourceTreeSha}`);
console.log(`CURRENT_BUILD_IDENTITY=${identity}`);
console.log(`DISTINCT_DEPARTMENT_LEADS=${distinctLeadModels.length}`);
console.log('SOURCE_TO_BUILD_BINDING=PASS');
console.log('FINAL_DEPARTMENT_REVIEW_BUILD_RUNTIME_QA_BINDING=PASS');
console.log('INDEPENDENT_QA=CURRENT_BUILD_PASS');
console.log('FINAL_ARTBOOK_REVISION=CREATED_AFTER_RELEASE_READY');
console.log('PAID_API=NO');
