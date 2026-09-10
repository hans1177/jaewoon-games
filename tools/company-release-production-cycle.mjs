import fs from 'node:fs';
import path from 'node:path';
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
const releasePolicy=directive.classes?.RELEASE_CONFIRMED||{};
const numericLabels=directive.production?.numericLabels||{};
const configuredPool=clean(process.env.COMPANY_MODEL_POOL).split(',').filter(Boolean);
const pool=uniq(configuredPool.length?configuredPool:(ai.modelPool||[]));
const minModels=Number(ai.minDistinctModelsPerDepartment||3);
const reviewModelCount=Math.max(minModels,Number(ai.departmentReviewModelCount||minModels));
const leadModels=Object.fromEntries(ROLES.map(role=>[role,clean(ai.departmentLeadModels?.[role])]));
const distinctLeadModels=uniq(ROLES.map(role=>leadModels[role]));
if(pool.length<reviewModelCount)throw new Error(`MULTIMODEL_GATE: ${pool.length}/${reviewModelCount}`);
if(ai.departmentLeadModelsMustBeDistinct!==false&&distinctLeadModels.length<ROLES.length)throw new Error(`DEPARTMENT_LEAD_GATE: ${distinctLeadModels.length}/${ROLES.length}`);
for(const role of ROLES){if(!leadModels[role]||!pool.includes(leadModels[role]))throw new Error(`DEPARTMENT_LEAD_GATE: invalid ${role} lead`);}
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

const RISK={type:'object',required:['blockers','warnings','evidence'],properties:{blockers:{type:'array',items:{type:'string'}},warnings:{type:'array',items:{type:'string'}},evidence:{type:'array',items:{type:'string'}}},additionalProperties:false};
const ARTBOOK={type:'object',required:['identity','playerFantasy','coreLoop','signatureSystems','progressionDirection','visualDirection'],properties:{identity:{type:'string'},playerFantasy:{type:'string'},coreLoop:{type:'array',items:{type:'string'}},signatureSystems:{type:'array',items:{type:'string'}},progressionDirection:{type:'string'},visualDirection:{type:'string'}},additionalProperties:false};
const VERIFY={type:'object',required:['supported','unsupportedClaims'],properties:{supported:{type:'boolean'},unsupportedClaims:{type:'array',items:{type:'string'}}},additionalProperties:false};

async function callModel(model,system,user,schema,{predict=700,temperature=0.15}={}){
  let lastError=null;
  for(let attempt=1;attempt<=2;attempt++){
    try{
      const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,format:schema,messages:[{role:'system',content:system},{role:'user',content:user}],options:{temperature:attempt===1?temperature:0,num_ctx:8192,num_predict:predict}})});
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
  const dates=fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isDirectory()&&/^\d{4}-\d{2}-\d{2}$/.test(e.name)).map(e=>e.name).sort().reverse();
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
  const dates=fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isDirectory()&&/^\d{4}-\d{2}-\d{2}$/.test(e.name)).map(e=>e.name).sort().reverse();
  for(const d of dates){
    const file=path.join(root,d,'design-development-baseline.json');
    const data=readJson(file,null);
    if(data?.status==='DEVELOPMENT_BASELINE_READY'&&data?.content)return {path:file.replaceAll('\\','/'),date:d,data,content:data.content};
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
function buildIdentity(data){
  return clean(data?.buildId||data?.build_id||data?.sha256||data?.artifactSha256||data?.sourceRevision||data?.sourceSha||data?.commitSha);
}
function evidenceBuildIdentity(data){return clean(data?.buildId||data?.build_id||data?.buildSha256||data?.artifactSha256||data?.sha256||data?.sourceRevision||data?.sourceSha||data?.commitSha);}
function evidenceForBuild(record,identity){
  const state=explicitState(record?.data);
  if(state==='MISSING')return {...record,state:'MISSING',bound:false};
  const ref=evidenceBuildIdentity(record.data);
  const bound=Boolean(identity&&ref&&ref===identity);
  return {...record,state:bound?state:'MISSING',bound,referencedBuild:ref||null};
}
function hasCoreLockViolation(...records){
  return records.some(record=>record?.data?.coreDesignLockViolation===true||record?.data?.core_design_lock_violation===true);
}
function writeState(state,{baseline=null,implementation=null,build=null,runtime=null,qa=null,riskWatch=null,blockers=[],nextAction=null,releaseBaseline=null,artbook=null}={}){
  const status={
    version:1,gameId,date,productionClass,tierAlias,tier:tierAlias,policyDocument:'COMPANY_FLOW.md',
    flow:'RELEASE_CONFIRMED_GATED_DIRECT_RELEASE_PRODUCTION',executionMode:'GATED_DIRECT_RELEASE_PRODUCTION',
    status:state==='RELEASE_READY'?'COMPLETE':state==='RELEASE_BLOCKED'?'BLOCKED':state==='BUILDING'?'BUILDING':'WAITING',state,
    vibe2PrimaryDeveloper:true,coreDesignLock:true,
    developmentBaseline:baseline?{path:baseline.path,date:baseline.date}:null,
    evidence:{
      implementation:implementation?{state:explicitState(implementation.data),path:implementation.path}:null,
      build:build?{state:explicitState(build.data),path:build.path,identity:buildIdentity(build.data)||null}:null,
      runtime:runtime?{state:runtime.state,path:runtime.path,bound:runtime.bound,referencedBuild:runtime.referencedBuild}:null,
      independentQa:qa?{state:qa.state,path:qa.path,bound:qa.bound,referencedBuild:qa.referencedBuild}:null
    },
    departments:riskWatch?{count:ROLES.length,leadModels,distinctLeadModelCount:distinctLeadModels.length,leadModelsDistinct:distinctLeadModels.length===ROLES.length,reviewModelCount,riskWatchPath:riskWatch.path,releaseBlockerCount:riskWatch.releaseBlockerCount}:null,
    blockers,nextAction,releaseBaseline:releaseBaseline?.path||null,artbook:artbook?.path||null,
    contracts:{
      gatedDirect:true,resumeFromLatestEvidence:true,vibe2PrimaryDeveloper:true,coreDesignLock:true,
      aiMayInventBuildPass:false,aiMayInventDeviceValidationPass:false,aiMayInventIndependentQaPass:false,
      currentBuildEvidenceBindingRequired:true,sourceChangeInvalidatesOldBuildValidation:true,
      finalArtbookOnlyAfterReleaseReady:true,numericTierIsCompatibilityAliasOnly:true
    },
    updatedAt:new Date().toISOString()
  };
  writeJson(path.join(base,'release-production-status.json'),status);
  writeJson(path.join(base,'cycle-status.json'),status);
  writeJson(path.join(base,'release-production-request.json'),{version:1,gameId,date,state,nextAction,blockers,policyDocument:'COMPANY_FLOW.md',vibe2PrimaryDeveloper:true,coreDesignLock:true});
  console.log(`RELEASE_DIRECT_STATE=${state}`);
  if(nextAction)console.log(`NEXT_ACTION=${nextAction}`);
  return status;
}

async function runRiskWatch(baseline,build){
  const evidence={developmentBaseline:baseline.content,build:build.data,game:{id:game.id,name:game.name,unityProjectPath:game.unityProjectPath||null}};
  const departmentRiskWatch={};
  let releaseBlockerCount=0;
  for(const role of ROLES){
    const lead=leadModels[role];
    const models=reviewModels[role];
    const passes=[];
    for(const model of models){
      const memberRole=model===lead?'LEAD':'ASSISTANT';
      const result=await callModel(model,`너는 ${role} 부서의 ${memberRole} 출시 위험 감시 AI다. 새 기능을 기획하지 말고 현재 Development Baseline과 현재 빌드에서 실제 출시 차단 위험만 찾는다. 근거가 불충분하면 blocker로 만들지 않는다.`,`현재 빌드의 ${role} 책임영역을 검토하라. blockers는 출시를 막아야 하는 근거가 명확한 항목만 넣고, 경미하거나 불확실한 것은 warnings에 둔다.\nEVIDENCE=${clip(evidence,15000)}`,RISK,{predict:500});
      passes.push({model,memberRole,result});
    }
    const representative=await callModel(lead,`너는 ${role} 부서 Lead AI다. 보조 AI 결과를 통합하되 추측과 중복을 제거하고 근거가 명확한 출시 차단 위험만 blockers로 확정한다.`,`다음 ${role} 부서 내부 결과를 통합하라.\nPASSES=${clip(passes,10000)}\nBUILD=${clip(build.data,5000)}`,RISK,{predict:450,temperature:0.05});
    releaseBlockerCount+=representative.blockers.length;
    departmentRiskWatch[role]={leadModel:lead,assistantModels:models.filter(m=>m!==lead),models,passes,representative};
  }
  const file=path.join(base,'release-risk-watch.json');
  writeJson(file,{version:1,gameId,date,productionClass,buildIdentity:buildIdentity(build.data),leadModels,distinctLeadModels,reviewModels,departmentRiskWatch,releaseBlockerCount,departmentErrorWatchOnly:true,newFeatureProposalDefault:false});
  return {path:file.replaceAll('\\','/'),releaseBlockerCount,departmentRiskWatch};
}

const baseline=latestDevelopmentBaseline();
if(!baseline){
  writeState('RELEASE_BLOCKED',{blockers:['development-baseline-required'],nextAction:'2분류에서 DEVELOPMENT_BASELINE_READY를 먼저 만든다.'});
  process.exit(0);
}

const implementation=latestFile('vibe2-release-implementation.json');
if(explicitState(implementation.data)!=='PASS'){
  writeJson(path.join(base,'vibe2-release-work-request.json'),{
    version:1,gameId,date,productionClass,owner:'VIBE2',role:'PRIMARY_DEVELOPMENT_ENGINE',state:'BUILDING',
    developmentBaseline:baseline.path,unityProjectPath:clean(game.unityProjectPath)||null,coreDesignLock:true,
    instruction:'Development Baseline을 따라 Unity Android 본개발/통합을 수행한다. 새 핵심 기능을 임의 추가하지 말고 구현 완료 근거를 vibe2-release-implementation.json에 기록한다.',
    policyDocument:'COMPANY_FLOW.md'
  });
  writeState('BUILDING',{baseline,implementation,nextAction:'Vibe2 본개발/통합을 완료하고 현재 소스 revision을 포함한 vibe2-release-implementation.json 근거를 기록한다.'});
  process.exit(0);
}

const build=latestFile('unity-android-build.json');
if(explicitState(build.data)==='FAIL'){
  writeState('FIX_AND_REVERIFY',{baseline,implementation,build,blockers:['unity-android-build-failed'],nextAction:'Vibe2가 빌드 실패 원인을 수정하고 새 Unity Android build 근거를 만든다.'});
  process.exit(0);
}
const identity=buildIdentity(build.data);
if(explicitState(build.data)!=='PASS'||!identity){
  writeState('WAITING_BUILD',{baseline,implementation,build,blockers:['current-unity-android-build-required'],nextAction:'현재 Vibe2 구현 revision으로 Unity Android 빌드를 수행하고 buildId 또는 sha256이 있는 unity-android-build.json을 기록한다.'});
  process.exit(0);
}

const riskWatch=await runRiskWatch(baseline,build);
const runtime=evidenceForBuild(latestFile('android-runtime-validation.json'),identity);
if(hasCoreLockViolation(build,runtime)){
  writeState('RELEASE_BLOCKED',{baseline,implementation,build,runtime,riskWatch,blockers:['core-design-lock-violation'],nextAction:'사용자 결정 또는 출시차단 예외 설계회의 없이 Core Design Lock 변경을 진행하지 않는다.'});
  process.exit(0);
}
if(runtime.state==='FAIL'){
  writeState('FIX_AND_REVERIFY',{baseline,implementation,build,runtime,riskWatch,blockers:['android-runtime-validation-failed'],nextAction:'Vibe2가 현재 빌드의 실제 Android 런타임 실패 원인을 수정하고 새 빌드로 재검증한다.'});
  process.exit(0);
}
if(runtime.state!=='PASS'){
  writeState('WAITING_DEVICE_VALIDATION',{baseline,implementation,build,runtime,riskWatch,blockers:['current-build-android-runtime-validation-required'],nextAction:`현재 build ${identity}를 실제 Android에서 검증하고 같은 build ID/SHA를 참조한 android-runtime-validation.json을 기록한다.`});
  process.exit(0);
}
if(riskWatch.releaseBlockerCount>0){
  writeState('FIX_AND_REVERIFY',{baseline,implementation,build,runtime,riskWatch,blockers:[`department-release-blockers:${riskWatch.releaseBlockerCount}`],nextAction:'Vibe2가 5부서가 근거로 확정한 출시 차단 결함을 수정하고 새 빌드부터 다시 검증한다.'});
  process.exit(0);
}

const qa=evidenceForBuild(latestFile('independent-release-qa.json'),identity);
if(hasCoreLockViolation(qa)){
  writeState('RELEASE_BLOCKED',{baseline,implementation,build,runtime,qa,riskWatch,blockers:['core-design-lock-violation'],nextAction:'사용자 결정 또는 출시차단 예외 설계회의로 Core Design Lock 문제를 해결한다.'});
  process.exit(0);
}
if(qa.state==='FAIL'){
  writeState('FIX_AND_REVERIFY',{baseline,implementation,build,runtime,qa,riskWatch,blockers:['independent-release-qa-failed'],nextAction:'Vibe2가 독립 QA 실패를 수정하고 새 빌드/기기/회귀 검증을 수행한다.'});
  process.exit(0);
}
if(qa.state!=='PASS'){
  writeState('WAITING_DEVICE_VALIDATION',{baseline,implementation,build,runtime,qa,riskWatch,blockers:['current-build-independent-qa-required'],nextAction:`현재 build ${identity}에 대해 독립 QA/회귀 검증을 실행하고 같은 build ID/SHA를 참조한 independent-release-qa.json을 기록한다.`});
  process.exit(0);
}

const releaseBaselinePath=path.join(base,'release-baseline.json');
writeJson(releaseBaselinePath,{
  version:1,gameId,date,productionClass,tierAlias,tier:tierAlias,status:'RELEASE_READY',baseline:'RELEASE_BASELINE',
  developmentBaseline:baseline.path,currentBuild:{identity,evidence:build.path},androidRuntimeValidation:runtime.path,independentQa:qa.path,
  departmentRiskWatch:riskWatch.path,coreDesignLockPreserved:true,policyDocument:'COMPANY_FLOW.md',createdAt:new Date().toISOString()
});

const editorModel=pool[hash(`${gameId}:release-artbook-editor`)%pool.length];
const verifierModel=pool[(hash(`${gameId}:release-artbook-verifier`)+1)%pool.length];
const artbook=await callModel(editorModel,'너는 단일 Artbook Editor AI다. RELEASE_READY가 된 게임의 최종 핵심 전략만 압축한다. 새 설정·수치·규칙을 만들지 않고 Development Baseline에 있는 핵심 중 실제 출시 검증을 살아남은 내용만 유지한다.',`최종 Release Baseline 아트북 revision을 작성하라. 긴 QA/기기 로그는 복제하지 않는다.\nDEVELOPMENT_BASELINE=${clip(baseline.content,13000)}\nRELEASE_BASELINE=${clip(readJson(releaseBaselinePath,{}),5000)}`,ARTBOOK,{predict:750});
const verification=await callModel(verifierModel,'너는 Vibe2 검증 역할이다. 아트북 작성자가 아니다. 최종 아트북이 Development Baseline에 없는 새 주장을 만들지 않았는지 확인한다.',`DEVELOPMENT_BASELINE=${clip(baseline.content,12000)}\nFINAL_ARTBOOK=${clip(artbook,7000)}`,VERIFY,{predict:320,temperature:0});
if(!verification.supported)throw new Error(`RELEASE_ARTBOOK_PROVENANCE_GATE: ${verification.unsupportedClaims.join(' | ')}`);
const artbookPath=path.join(base,'core-artbook.json');
writeJson(artbookPath,{version:5,gameId,date,productionClass,tierAlias,tier:tierAlias,editorRole:'ARTBOOK_EDITOR_AI',editorModel,singleEditor:true,releaseBaseline:true,releaseBaselineSource:releaseBaselinePath.replaceAll('\\','/'),sourceDesign:baseline.path,departmentPageAuthorship:false,newClaimsAdded:false,verification,content:artbook});
writeState('RELEASE_READY',{baseline,implementation,build,runtime,qa,riskWatch,releaseBaseline:{path:releaseBaselinePath.replaceAll('\\','/')},artbook:{path:artbookPath.replaceAll('\\','/')}});
console.log('RELEASE_GATE=READY');
console.log(`CURRENT_BUILD_IDENTITY=${identity}`);
console.log(`DISTINCT_DEPARTMENT_LEADS=${distinctLeadModels.length}`);
console.log('INDEPENDENT_QA=CURRENT_BUILD_PASS');
console.log('FINAL_ARTBOOK_REVISION=CREATED_AFTER_RELEASE_READY');
console.log('PAID_API=NO');
