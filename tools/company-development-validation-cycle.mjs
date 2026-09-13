// 파일명: tools/company-development-validation-cycle.mjs
import fs from 'node:fs';
import path from 'node:path';
import {PRODUCTION_CLASSES,productionClassOf,tierAliasForProductionClass} from './production-classification.mjs';
import {resolveSelectedPlatform,adapterForPlatform,canonicalTargetWaitingState,canonicalTargetRevalidationState} from './company-selected-platform-router.mjs';

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
const pool=uniq(clean(process.env.COMPANY_MODEL_POOL).split(',').filter(Boolean).length?clean(process.env.COMPANY_MODEL_POOL).split(','):(ai.modelPool||[]));
const minModels=Number(ai.minDistinctModelsPerDepartment||3);
const reviewModelCount=Math.max(minModels,Number(ai.departmentReviewModelCount||minModels));
const leadModels=Object.fromEntries(ROLES.map(role=>[role,clean(ai.departmentLeadModels?.[role])]));
const distinctLeadModels=uniq(ROLES.map(role=>leadModels[role]));
if(pool.length<reviewModelCount)throw new Error(`MULTIMODEL_GATE: ${pool.length}/${reviewModelCount}`);
if(distinctLeadModels.length<ROLES.length)throw new Error(`DEPARTMENT_LEAD_GATE: ${distinctLeadModels.length}/${ROLES.length}`);
for(const role of ROLES){if(!leadModels[role]||!pool.includes(leadModels[role]))throw new Error(`DEPARTMENT_LEAD_GATE: invalid ${role} lead`);}
function reviewModelsFor(role){
  const lead=leadModels[role];
  const start=Math.max(0,pool.indexOf(lead));
  const models=[lead];
  for(let i=1;models.length<reviewModelCount&&i<=pool.length*2;i++){
    const m=pool[(start+i)%pool.length];
    if(m&&!models.includes(m))models.push(m);
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
if(productionClass!==PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED)throw new Error(`DEVELOPMENT_VALIDATION_CLASS_REQUIRED: ${productionClass}`);
const tierAlias=tierAliasForProductionClass(productionClass,{numericLabels})??(Number(game.productionTier||0)||null);
const selectedPlatform=resolveSelectedPlatform(process.env.SELECTED_PLATFORM||'',game);
const platformAdapter=adapterForPlatform(selectedPlatform);
if(!selectedPlatform||!platformAdapter)throw new Error(`SELECTED_PLATFORM_REQUIRED: ${selectedPlatform||'MISSING'}`);
const platformLabel=selectedPlatform==='FORTNITE_UEFN'?'Fortnite UEFN':selectedPlatform[0]+selectedPlatform.slice(1).toLowerCase();
const base=path.join('design',gameId,date);
fs.mkdirSync(base,{recursive:true});

const shortString=maxLength=>({type:'string',maxLength});
const shortList=(maxItems=1,maxLength=120)=>({type:'array',items:shortString(maxLength),maxItems});
const reviewSchema=(maxItems,maxLength)=>({type:'object',required:['keep','change','drop','hold','risks','evidence','questions'],properties:{keep:shortList(maxItems,maxLength),change:shortList(maxItems,maxLength),drop:shortList(maxItems,maxLength),hold:shortList(maxItems,maxLength),risks:shortList(maxItems,maxLength),evidence:shortList(maxItems,maxLength),questions:shortList(maxItems,maxLength)},additionalProperties:false});
const MEMBER_REVIEW=reviewSchema(1,120);
const REVIEW=reviewSchema(2,160);
const REVIEWS={type:'object',required:ROLES,properties:Object.fromEntries(ROLES.map(r=>[r,MEMBER_REVIEW])),additionalProperties:false};
const REBUTTAL={type:'object',required:['accept','challenge','revision','reason'],properties:{accept:shortList(2,140),challenge:shortList(2,140),revision:shortList(2,140),reason:shortString(220)},additionalProperties:false};
const MEETING={type:'object',required:['summary','decisions'],properties:{summary:shortString(320),decisions:{type:'array',maxItems:8,items:{type:'object',required:['topic','decision','reason','departments','validationImpact'],properties:{topic:shortString(120),decision:{type:'string',enum:['KEEP','CHANGE','DROP','HOLD']},reason:shortString(220),departments:{type:'array',items:{type:'string',enum:ROLES},maxItems:ROLES.length},validationImpact:{type:'string',enum:['WEB','TARGET_PLATFORM','BOTH','NONE']}},additionalProperties:false}}},additionalProperties:false};
const DESIGN={type:'object',required:['identity','playerFantasy','coreLoop','signatureSystems','progressionDirection','visualDirection','mobileUx','technicalAssumptions','validationQuestions','openQuestions'],properties:{identity:{type:'string'},playerFantasy:{type:'string'},coreLoop:{type:'array',items:{type:'string'}},signatureSystems:{type:'array',items:{type:'object',required:['name','purpose','playerChoice'],properties:{name:{type:'string'},purpose:{type:'string'},playerChoice:{type:'string'}},additionalProperties:false}},progressionDirection:{type:'string'},visualDirection:{type:'string'},mobileUx:{type:'string'},technicalAssumptions:{type:'array',items:{type:'string'}},validationQuestions:{type:'array',items:{type:'string'}},openQuestions:{type:'array',items:{type:'string'}}},additionalProperties:false};
const ARTBOOK={type:'object',required:['identity','playerFantasy','coreLoop','signatureSystems','progressionDirection','visualDirection','implementationDirection'],properties:{identity:{type:'string'},playerFantasy:{type:'string'},coreLoop:{type:'array',items:{type:'string'}},signatureSystems:{type:'array',items:{type:'string'}},progressionDirection:{type:'string'},visualDirection:{type:'string'},implementationDirection:{type:'array',items:{type:'string'}}},additionalProperties:false};
const VERIFY={type:'object',required:['supported','unsupportedClaims'],properties:{supported:{type:'boolean'},unsupportedClaims:{type:'array',items:{type:'string'}}},additionalProperties:false};

async function callModel(model,system,user,schema,{predict=900,temperature=0.2,compact=false}={}){
  let lastError=null;
  for(let attempt=1;attempt<=2;attempt++){
    const compactRule=compact?'\nOUTPUT_BUDGET=COMPACT_JSON. 스키마의 모든 필수 키는 유지하되 각 배열에는 가장 중요한 항목만 넣고 빈 배열이 허용되는 곳은 불필요한 항목을 만들지 마라. maxItems/maxLength를 반드시 지켜라.':'';
    const retryRule=attempt===1?'':`\nPREVIOUS_VALIDATION_ERROR=${clean(lastError?.message).slice(0,240)}\n이전 응답은 잘리거나 유효하지 않았다. 판단 내용을 새로 발명하지 말고 같은 근거를 유지한 채 더 짧은 완전한 JSON으로 처음부터 다시 반환하라. 설명문/마크다운/코드펜스는 금지한다.`;
    const retryPredict=attempt===1?predict:Math.min(1800,predict+400);
    try{
      const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,think:false,format:schema,messages:[{role:'system',content:system},{role:'user',content:`${user}${compactRule}${retryRule}`}],options:{temperature:attempt===1?temperature:0,num_ctx:8192,num_predict:retryPredict}})});
      if(!response.ok)throw new Error(`ollama ${response.status}: ${await response.text()}`);
      const body=await response.json();
      const text=clean(body?.message?.content);
      if(!text)throw new Error('empty model response');
      const parsed=JSON.parse(text);
      if(attempt>1)console.log(`MODEL_JSON_RETRY_RECOVERED=${model}`);
      return parsed;
    }catch(error){
      lastError=error;
      if(attempt===1)console.log(`MODEL_JSON_RETRY=${model}:${clean(error?.message).slice(0,180)}`);
    }
  }
  throw new Error(`MODEL_CALL_FAILED ${model}: ${clean(lastError?.message)}`);
}

function explicitState(data){
  if(!data||typeof data!=='object'||Array.isArray(data))return 'MISSING';
  if(clean(data.gameId)&&clean(data.gameId)!==gameId)return 'MISSING';
  if(data.pass===true||data.validated===true)return 'PASS';
  if(data.pass===false||data.validated===false)return 'FAIL';
  const state=clean(data.status||data.result||data.decision).toUpperCase();
  if(['PASS','PASSED','VALIDATED','READY'].includes(state))return 'PASS';
  if(['FAIL','FAILED','REJECTED','BLOCKED'].includes(state))return 'FAIL';
  return 'MISSING';
}
function latestFile(fileName){
  const root=path.join('design',gameId);
  if(!fs.existsSync(root))return {path:null,data:null,state:'MISSING'};
  const dates=fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isDirectory()&&/^\d{4}-\d{2}-\d{2}$/.test(e.name)).map(e=>e.name).sort().reverse();
  for(const d of dates){
    const file=path.join(root,d,fileName);
    if(!fs.existsSync(file))continue;
    const data=readJson(file,null);
    return {path:file.replaceAll('\\','/'),data,state:explicitState(data),date:d};
  }
  return {path:null,data:null,state:'MISSING'};
}
function latestDesignBaseline(){
  const root=path.join('design',gameId);
  if(!fs.existsSync(root))return null;
  const dates=fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isDirectory()&&/^\d{4}-\d{2}-\d{2}$/.test(e.name)).map(e=>e.name).sort().reverse();
  for(const d of dates){
    const status=readJson(path.join(root,d,'cycle-status.json'),null);
    if(status?.baselineGate?.state!=='DESIGN_BASELINE_READY')continue;
    const design=readJson(path.join(root,d,'design-revised.json'),null);
    if(design?.content)return {date:d,path:path.join(root,d,'design-revised.json').replaceAll('\\','/'),data:design,content:design.content,authorModel:clean(design.authorModel||status.designer?.model)};
  }
  return null;
}
function writeState(state,{sourceDesign=null,web=null,targetPlatform=null,revalidation=null,webMeeting=null,targetMeeting=null,finalDesign=null,artbook=null,blockers=[],nextAction=null}={}){
  const evidence={web:web?{state:web.state,path:web.path,musicRuntimePass:web.data?.musicRuntime?.pass===true}:null,targetPlatform:targetPlatform?{platform:selectedPlatform,state:targetPlatform.state,path:targetPlatform.path}:null,revalidation:revalidation?{state:revalidation.state,path:revalidation.path}:null};
  if(selectedPlatform==='UNITY')evidence.unity=evidence.targetPlatform;
  const meetings={web:webMeeting?{path:webMeeting.path,decisionCounts:webMeeting.decisionCounts}:null,targetPlatform:targetMeeting?{platform:selectedPlatform,path:targetMeeting.path,decisionCounts:targetMeeting.decisionCounts}:null};
  if(selectedPlatform==='UNITY')meetings.unity=meetings.targetPlatform;
  const status={
    version:3,gameId,date,productionClass,tierAlias,tier:tierAlias,policyDocument:'COMPANY_FLOW.md',
    flow:'DEVELOPMENT_CONFIRMED_GATED_DIRECT',selectedPlatform,platformAdapter:platformAdapter.adapterPath,
    status:state==='DEVELOPMENT_BASELINE_READY'?'COMPLETE':state==='DEVELOPMENT_BLOCKED'?'BLOCKED':'WAITING',
    state,sourceDesign:sourceDesign?{path:sourceDesign.path,date:sourceDesign.date,authorModel:sourceDesign.authorModel}:null,
    evidence,meetings,
    finalDesign:finalDesign?.path||null,artbook:artbook?.path||null,blockers,nextAction,
    contracts:{gatedDirect:true,resumeFromLatestEvidence:true,singlePlatformRouter:true,aiMayInventValidationPass:false,webSmokeDoesNotEqualGameplayValidation:true,webValidationRequired:true,musicValidationRequired:true,webValidationOptional:false,artbookOnlyAfterBaselineReady:true},
    updatedAt:new Date().toISOString()
  };
  writeJson(path.join(base,'development-validation-status.json'),status);
  writeJson(path.join(base,'cycle-status.json'),status);
  const requiredEvidence=state.includes('WEB')?'web-gameplay-validation.json':state.includes('TARGET_PLATFORM')?platformAdapter.evidenceFile:state==='WAITING_REVALIDATION'?'development-revalidation.json':null;
  writeJson(path.join(base,'development-validation-request.json'),{version:3,gameId,date,state,selectedPlatform,platformAdapter:platformAdapter.adapterPath,nextAction,blockers,requiredEvidence,policyDocument:'COMPANY_FLOW.md'});
  console.log(`DEVELOPMENT_DIRECT_STATE=${state}`);
  console.log(`SELECTED_PLATFORM=${selectedPlatform}`);
  if(nextAction)console.log(`NEXT_ACTION=${nextAction}`);
  return status;
}

async function runMeeting(stage,sourceDesign,evidence){
  const stageLabel=stage==='WEB'?'Web Gameplay + Music Validation':`${platformLabel} Target Platform Validation`;
  const independent={};
  for(const model of pool){
    independent[model]=await callModel(model,'너는 독립 검토 AI다. 같은 실제 검증 근거를 5개 전문부서 관점으로 분리해서 검토한다. 근거에 없는 결과를 만들지 않는다.',`${stageLabel} 실제 근거와 현재 설계를 planning/graphics/development/qa/balance 관점으로 각각 검토하라. KEEP/CHANGE/DROP/HOLD를 구분하고 근거를 적어라.\nDESIGN=${clip(sourceDesign,13000)}\nEVIDENCE=${clip(evidence,12000)}`,REVIEWS,{predict:1500,compact:true});
  }
  const representatives={};
  const memberReviews={};
  for(const role of ROLES){
    const models=reviewModels[role];
    const lead=leadModels[role];
    memberReviews[role]=models.map(model=>({model,memberRole:model===lead?'LEAD':'ASSISTANT',review:independent[model][role]}));
    representatives[role]=await callModel(lead,`너는 ${role} 부서 Lead AI다. 보조 AI 의견을 읽고 실제 근거가 있는 것만 부서 대표 의견으로 확정한다.`,`${stageLabel} ${role} 부서 내부 검토를 통합하라. 다수결보다 실제 근거를 우선하라.\nREVIEWS=${clip(memberReviews[role],10000)}`,REVIEW,{predict:700,compact:true});
  }
  const rebuttals={};
  for(const role of ROLES){
    rebuttals[role]=await callModel(leadModels[role],`너는 ${role} 부서 Lead AI다. 다른 4개 부서 대표 의견을 읽고 자기 전문영역에서 한 번만 반박·수정한다.`,`${stageLabel} 대표 의견 전체를 읽고 ${role} 관점 반박을 작성하라.\nREPRESENTATIVES=${clip(representatives,13000)}`,REBUTTAL,{predict:500,compact:true});
  }
  const coordinatorModel=pool[(hash(`${gameId}:${stage}:coordinator`))%pool.length];
  const meeting=await callModel(coordinatorModel,'너는 재운컴퍼니 검증회의 조정 AI다. 새 기능을 창작하지 말고 실제 근거와 5부서 의견을 바탕으로 KEEP/CHANGE/DROP/HOLD를 판정한다. 변경이 재검증을 필요로 하는 영역도 WEB/TARGET_PLATFORM/BOTH/NONE으로 표시한다.',`${stageLabel} 부서 대표 의견과 반박을 정리하라. 실제 근거가 없는 항목은 HOLD로 둔다.\nREPRESENTATIVES=${clip(representatives,11000)}\nREBUTTALS=${clip(rebuttals,9000)}\nEVIDENCE=${clip(evidence,8000)}`,MEETING,{predict:1000,compact:true});
  const counts=Object.fromEntries(['KEEP','CHANGE','DROP','HOLD'].map(x=>[x,meeting.decisions.filter(d=>d.decision===x).length]));
  const file=path.join(base,stage==='WEB'?'web-evidence-meeting.json':'target-platform-evidence-meeting.json');
  writeJson(file,{version:2,gameId,date,productionClass,stage,selectedPlatform,stageLabel,leadModels,reviewModels,memberReviews,representatives,rebuttals,coordinatorModel,...meeting,decisionCounts:counts});
  return {path:file.replaceAll('\\','/'),meeting,decisionCounts:counts};
}
async function reviseDesign(stage,designerModel,sourceDesign,meetingResult){
  const file=path.join(base,stage==='WEB'?'design-after-web.json':'design-after-target-platform.json');
  const revised=await callModel(designerModel,'너는 이 게임의 Game Designer AI다. 검증회의의 KEEP/CHANGE/DROP만 실제 근거 범위에서 반영하고 HOLD는 openQuestions에 남긴다. 핵심 재미를 보존하면서 검증된 문제만 수정한다.',`${stage} 검증회의 결과를 현재 상세 설계에 반영하라. 근거 없는 새 시스템을 만들지 마라.\nDESIGN=${clip(sourceDesign,13000)}\nMEETING=${clip(meetingResult.meeting,10000)}`,DESIGN,{predict:1300,temperature:0.2});
  writeJson(file,{version:2,gameId,date,productionClass,stage,selectedPlatform,authorRole:'GAME_DESIGNER_AI',authorModel:designerModel,sourceMeeting:meetingResult.path,content:revised});
  return {path:file.replaceAll('\\','/'),content:revised,authorModel:designerModel};
}
function revalidationTargets(...meetings){
  const out=new Set();
  for(const m of meetings.filter(Boolean))for(const d of m.meeting.decisions||[]){
    if(!['CHANGE','DROP','HOLD'].includes(d.decision))continue;
    if(d.validationImpact==='WEB'||d.validationImpact==='BOTH')out.add('WEB');
    if(d.validationImpact==='TARGET_PLATFORM'||d.validationImpact==='BOTH')out.add('TARGET_PLATFORM');
    if(d.decision==='HOLD'&&d.validationImpact==='NONE')out.add('TARGET_PLATFORM');
  }
  return [...out];
}

const sourceBaseline=latestDesignBaseline();
if(!sourceBaseline){
  writeState('DEVELOPMENT_BLOCKED',{blockers:['design-baseline-required'],nextAction:'DESIGN_ONLY에서 DESIGN_BASELINE_READY를 먼저 만든다.'});
  process.exit(0);
}
const designerModel=sourceBaseline.authorModel||pool[hash(gameId)%pool.length];
if(!pool.includes(designerModel)){
  writeState('DEVELOPMENT_BLOCKED',{sourceDesign:sourceBaseline,blockers:[`game-designer-model-unavailable:${designerModel}`],nextAction:'Design Baseline을 작성한 Game Designer 모델을 현재 무료 모델 풀에서 사용 가능하게 한다.'});
  process.exit(0);
}

const web=latestFile('web-gameplay-validation.json');
const webGameplayPass=web.state==='PASS';
const musicRuntimePass=web.data?.musicRuntime?.pass===true;
if(!webGameplayPass||!musicRuntimePass){
  const blockers=[];
  if(web.state==='MISSING')blockers.push('web-gameplay-validation-required');
  else if(web.state==='FAIL')blockers.push('web-gameplay-validation-failed');
  if(!musicRuntimePass)blockers.push('music-runtime-validation-required');
  const waitState=web.state==='MISSING'?'WAITING_WEB_GAMEPLAY_VALIDATION':'WAITING_WEB_GAMEPLAY_REVALIDATION';
  writeState(waitState,{sourceDesign:sourceBaseline,web,blockers,nextAction:'Web 실제 플레이와 음악 런타임을 같은 후보에서 검증하고 web-gameplay-validation.json PASS 근거를 기록한다.'});
  process.exit(0);
}
const webMeeting=await runMeeting('WEB',sourceBaseline.content,web.data);
const afterWeb=await reviseDesign('WEB',designerModel,sourceBaseline.content,webMeeting);

const targetPlatform=latestFile(platformAdapter.evidenceFile);
const projectPath=clean(game[platformAdapter.projectField]||'');
const projectPresent=Boolean(projectPath&&fs.existsSync(projectPath));
if(!projectPresent||targetPlatform.state==='MISSING'){
  const blockers=[];
  if(!projectPresent)blockers.push(`${selectedPlatform.toLowerCase()}-project-required-for-technical-validation`);
  if(targetPlatform.state==='MISSING')blockers.push(`${selectedPlatform.toLowerCase()}-technical-validation-required`);
  writeState(canonicalTargetWaitingState(),{sourceDesign:sourceBaseline,web,targetPlatform,webMeeting,finalDesign:afterWeb,blockers,nextAction:`${platformLabel} 선택 플랫폼 프로토타입을 실제 실행하고 ${platformAdapter.evidenceFile} 근거를 기록한다.`});
  process.exit(0);
}
const targetMeeting=await runMeeting('TARGET_PLATFORM',afterWeb.content,targetPlatform.data);
const afterTarget=await reviseDesign('TARGET_PLATFORM',designerModel,afterWeb.content,targetMeeting);
if(targetPlatform.state==='FAIL'){
  writeState(canonicalTargetRevalidationState(),{sourceDesign:sourceBaseline,web,targetPlatform,webMeeting,targetMeeting,finalDesign:afterTarget,blockers:[`${selectedPlatform.toLowerCase()}-technical-validation-failed`],nextAction:`${platformLabel} 기술 수정안을 동일 선택 플랫폼에서 재검증하고 새 ${platformAdapter.evidenceFile} 근거를 기록한다.`});
  process.exit(0);
}

const targets=revalidationTargets(webMeeting,targetMeeting);
const revalidation=latestFile('development-revalidation.json');
const rawTargets=Array.isArray(revalidation.data?.targets)?revalidation.data.targets.map(x=>clean(x).toUpperCase()):[];
const revalidatedTargets=new Set(rawTargets);
if(revalidatedTargets.has(selectedPlatform)||revalidatedTargets.has('UNITY'))revalidatedTargets.add('TARGET_PLATFORM');
const targetsCovered=targets.every(t=>revalidatedTargets.has(t));
if(targets.length>0&&(revalidation.state!=='PASS'||!targetsCovered)){
  writeState('WAITING_REVALIDATION',{sourceDesign:sourceBaseline,web,targetPlatform,revalidation,webMeeting,targetMeeting,finalDesign:afterTarget,blockers:[`revalidation-required:${targets.join('+')}`],nextAction:`변경 영향 범위 ${targets.join('+')}를 실제로 재검증하고 development-revalidation.json에 PASS 근거를 기록한다.`});
  process.exit(0);
}

const editorModel=pool[(hash(`${gameId}:artbook-editor`))%pool.length];
const verifierModel=pool[(hash(`${gameId}:artbook-verifier`)+1)%pool.length];
let artbook=await callModel(editorModel,'너는 단일 Artbook Editor AI다. Development Baseline을 통과한 상세 설계와 검증 결과에서 살아남은 핵심 전략만 압축한다. 새 설정·수치·시스템을 만들지 않는다.',`2분류 검증을 통과한 최종 상세 설계를 핵심 전략 아트북으로 갱신하라. 구현 방향은 검증으로 살아남은 것만 포함한다.\nFINAL_DESIGN=${clip(afterTarget.content,13000)}\nWEB=${clip(web.data,5000)}\nTARGET_PLATFORM=${clip(targetPlatform.data,5000)}\nREVALIDATION=${clip(revalidation.data,3000)}`,ARTBOOK,{predict:800});
let verification=await callModel(verifierModel,'너는 Vibe2 검증 역할이다. 아트북 작성자가 아니다. 아트북의 모든 주장이 최종 상세 설계와 실제 검증 근거에 있는지 확인한다.',`FINAL_DESIGN=${clip(afterTarget.content,11000)}\nARTBOOK=${clip(artbook,7000)}`,VERIFY,{predict:320,temperature:0});
if(!verification.supported)throw new Error(`DEVELOPMENT_ARTBOOK_PROVENANCE_GATE: ${verification.unsupportedClaims.join(' | ')}`);
const artbookPath=path.join(base,'core-artbook.json');
writeJson(artbookPath,{version:5,gameId,date,productionClass,tierAlias,tier:tierAlias,selectedPlatform,editorRole:'ARTBOOK_EDITOR_AI',editorModel,singleEditor:true,sourceDesign:afterTarget.path,developmentBaseline:true,departmentPageAuthorship:false,newClaimsAdded:false,verification,content:artbook});
const finalDesignPath=path.join(base,'design-development-baseline.json');
writeJson(finalDesignPath,{version:2,gameId,date,productionClass,selectedPlatform,authorRole:'GAME_DESIGNER_AI',authorModel:designerModel,source:afterTarget.path,status:'DEVELOPMENT_BASELINE_READY',content:afterTarget.content});
writeState('DEVELOPMENT_BASELINE_READY',{sourceDesign:sourceBaseline,web,targetPlatform,revalidation,webMeeting,targetMeeting,finalDesign:{path:finalDesignPath.replaceAll('\\','/')},artbook:{path:artbookPath.replaceAll('\\','/')}});
console.log('DEVELOPMENT_BASELINE_GATE=READY');
console.log(`DISTINCT_DEPARTMENT_LEADS=${distinctLeadModels.length}`);
console.log('ARTBOOK_REVISION=CREATED_AFTER_BASELINE_READY');
console.log('PAID_API=NO');
