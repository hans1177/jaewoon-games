import fs from 'node:fs';
import path from 'node:path';
import {loadSeedState,activeSeedForGame} from './game-seed-state.mjs';

const ROLES=['planning','graphics','development','qa','balance'];
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const clip=(v,n=14000)=>{const s=typeof v==='string'?v:JSON.stringify(v);return s.length>n?s.slice(0,n):s;};
const uniq=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
function kstDate(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return`${g('year')}-${g('month')}-${g('day')}`;}
function hash(value){let h=2166136261;for(const ch of String(value)){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;}

const directive=readJson('company-directive.json',{});
const ai=directive.ai||{};
const pool=uniq(clean(process.env.COMPANY_MODEL_POOL).split(',').filter(Boolean).length?clean(process.env.COMPANY_MODEL_POOL).split(','):(ai.modelPool||[]));
const reviewModelCount=Math.max(Number(ai.minDistinctModelsPerDepartment||3),Number(ai.departmentReviewModelCount||3));
const leadModels=Object.fromEntries(ROLES.map(role=>[role,clean(ai.departmentLeadModels?.[role])]));
const distinctLeadModels=uniq(ROLES.map(role=>leadModels[role]));
if(pool.length<reviewModelCount)throw new Error(`MULTIMODEL_GATE: ${pool.length}/${reviewModelCount}`);
if(distinctLeadModels.length<ROLES.length)throw new Error(`DEPARTMENT_LEAD_GATE: ${distinctLeadModels.length}/${ROLES.length}`);
for(const role of ROLES)if(!leadModels[role]||!pool.includes(leadModels[role]))throw new Error(`DEPARTMENT_LEAD_GATE: invalid ${role} lead`);
function reviewModelsFor(role){const lead=leadModels[role];const start=Math.max(0,pool.indexOf(lead));const models=[lead];for(let i=1;models.length<reviewModelCount&&i<=pool.length*2;i++){const candidate=pool[(start+i)%pool.length];if(candidate&&!models.includes(candidate))models.push(candidate);}if(models.length<reviewModelCount)throw new Error(`${role} review model gate failed`);return models;}
const departmentReviewModels=Object.fromEntries(ROLES.map(role=>[role,reviewModelsFor(role)]));

const gameId=clean(process.env.ARTBOOK_GAME_ID||process.env.GAME_ID||process.argv.find(x=>x.startsWith('--game='))?.split('=')[1]);
const date=clean(process.env.ARTBOOK_DATE||process.env.DESIGN_DATE||kstDate());
if(!gameId)throw new Error('ARTBOOK_GAME_ID or GAME_ID is required');
const seedState=loadSeedState();
const seed=activeSeedForGame(seedState,gameId);
if(!seed)throw new Error(`GAME_SEED_REQUIRED: ${gameId}`);
const catalog=readJson('game-catalog.json',{games:[]});
const catalogGame=(catalog.games||[]).find(x=>x.id===gameId)||null;
if(catalogGame&&clean(catalogGame.productionClass)&&clean(catalogGame.productionClass)!=='DESIGN_ONLY')throw new Error(`DESIGN_ONLY_CLASS_REQUIRED: ${catalogGame.productionClass}`);
const game={id:gameId,name:clean(catalogGame?.name||seed.gameName||gameId),description:clean(catalogGame?.description||seed.DISTINCT_IDENTITY),genre:clean(catalogGame?.genre||seed.GAME_CATEGORY),productionClass:'DESIGN_ONLY',productionTier:3,productionTarget:'DESIGN_BASELINE',webPath:catalogGame?.webPath||null,unityProjectPath:catalogGame?.unityProjectPath||null};
const designerModel=pool[hash(`${gameId}:designer`)%pool.length];
const coordinatorModel=pool[hash(`${gameId}:coordinator`)%pool.length];
const base=path.join('design',gameId,date);fs.mkdirSync(base,{recursive:true});
const submissionBase=path.join('artbook-submissions',gameId,date);
const factPack=readJson(path.join(submissionBase,'fact-pack.json'),{});
const evidence={game,gameSeed:seed,factPack,centralPolicy:'COMPANY_FLOW.md'};

const MEMBER_TEXT={type:'string',maxLength:130};
const MEMBER_REVIEW={type:'object',required:['keep','fix','add','risks','evidence','questions'],properties:{keep:{type:'array',maxItems:1,items:MEMBER_TEXT},fix:{type:'array',maxItems:1,items:MEMBER_TEXT},add:{type:'array',maxItems:1,items:MEMBER_TEXT},risks:{type:'array',maxItems:1,items:MEMBER_TEXT},evidence:{type:'array',maxItems:1,items:MEMBER_TEXT},questions:{type:'array',maxItems:1,items:MEMBER_TEXT}},additionalProperties:false};
const SHORT_TEXT={type:'string',maxLength:260};
const REVIEW={type:'object',required:['keep','fix','add','risks','evidence','questions'],properties:{keep:{type:'array',maxItems:2,items:SHORT_TEXT},fix:{type:'array',maxItems:2,items:SHORT_TEXT},add:{type:'array',maxItems:2,items:SHORT_TEXT},risks:{type:'array',maxItems:2,items:SHORT_TEXT},evidence:{type:'array',maxItems:2,items:SHORT_TEXT},questions:{type:'array',maxItems:2,items:SHORT_TEXT}},additionalProperties:false};
const DESIGN={type:'object',required:['identity','playerFantasy','coreFun','coreLoop','signatureSystems','progressionDirection','visualDirection','mobileUx','marketTargetDirection','steamExpansionDecision','multiplayerExpansionDecision','technicalAssumptions','validationQuestions','openQuestions'],properties:{identity:{type:'string',maxLength:1000},playerFantasy:{type:'string',maxLength:900},coreFun:{type:'string',maxLength:900},coreLoop:{type:'array',minItems:3,maxItems:8,items:{type:'string',maxLength:340}},signatureSystems:{type:'array',maxItems:6,items:{type:'object',required:['name','purpose','playerChoice'],properties:{name:{type:'string',maxLength:130},purpose:{type:'string',maxLength:440},playerChoice:{type:'string',maxLength:440}},additionalProperties:false}},progressionDirection:{type:'string',maxLength:900},visualDirection:{type:'string',maxLength:900},mobileUx:{type:'string',maxLength:900},marketTargetDirection:{type:'string',maxLength:900},steamExpansionDecision:{type:'string',maxLength:500},multiplayerExpansionDecision:{type:'string',maxLength:500},technicalAssumptions:{type:'array',maxItems:8,items:{type:'string',maxLength:340}},validationQuestions:{type:'array',maxItems:8,items:{type:'string',maxLength:340}},openQuestions:{type:'array',maxItems:8,items:{type:'string',maxLength:340}}},additionalProperties:false};
const REVIEWS={type:'object',required:ROLES,properties:Object.fromEntries(ROLES.map(r=>[r,MEMBER_REVIEW])),additionalProperties:false};
const REBUTTAL={type:'object',required:['accept','challenge','revision','reason'],properties:{accept:{type:'array',maxItems:3,items:SHORT_TEXT},challenge:{type:'array',maxItems:3,items:SHORT_TEXT},revision:{type:'array',maxItems:3,items:SHORT_TEXT},reason:{type:'string',maxLength:550}},additionalProperties:false};
const MEETING={type:'object',required:['summary','decisions'],properties:{summary:{type:'string',maxLength:800},decisions:{type:'array',maxItems:12,items:{type:'object',required:['topic','status','reason','departments'],properties:{topic:{type:'string',maxLength:190},status:{type:'string',enum:['CONSENSUS','CONFLICT','HOLD']},reason:{type:'string',maxLength:550},departments:{type:'array',maxItems:5,items:{type:'string',maxLength:40}}},additionalProperties:false}}},additionalProperties:false};
const FATAL_CRITERIA=directive.discardPolicy?.DESIGN_ONLY?.fatalCriteria||[];
const FATAL_REVIEW={type:'object',required:['recommendedState','fatalCriteria','evidence','reason'],properties:{recommendedState:{type:'string',enum:['ACTIVE','REDESIGN','DISCARD']},fatalCriteria:{type:'array',maxItems:4,items:{type:'string',enum:FATAL_CRITERIA}},evidence:{type:'array',maxItems:4,items:SHORT_TEXT},reason:{type:'string',maxLength:700}},additionalProperties:false};

async function callModel(model,system,user,schema,{predict=1100,temperature=0.25}={}){
  let lastError=null;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,think:false,keep_alive:'0s',format:schema,messages:[{role:'system',content:system},{role:'user',content:user+'\n출력은 스키마에 맞는 JSON 객체만 반환한다.'}],options:{temperature:attempt===1?temperature:0,num_ctx:8192,num_predict:Math.min(4096,predict*attempt)}})});
      if(!response.ok)throw new Error(`ollama ${response.status}: ${await response.text()}`);
      const body=await response.json();const text=clean(body?.message?.content);if(!text)throw new Error('empty model response');return JSON.parse(text);
    }catch(error){lastError=error;if(attempt<3)await new Promise(r=>setTimeout(r,800*attempt));}
  }
  throw new Error(`MODEL_CALL_FAILED ${model}: ${clean(lastError?.message)}`);
}

const designDraft=await callModel(designerModel,'너는 단일 Game Designer AI다. GAME_SEED를 설계 원점으로 사용하며 부서가 대신 초안을 작성하지 않는다. 유명 성공작의 구조는 오마주/재해석하되 보호되는 표현과 소스코드는 복제하지 않는다.',`DESIGN_ONLY 상세 설계 초안을 작성하라. GAME_SEED의 핵심 재미와 타겟 방향, Android 모바일 싱글 기본을 보존하라. 시장근거는 타겟 참고용이며 없는 수치를 발명하지 마라.\nEVIDENCE=${clip(evidence,17000)}`,DESIGN,{predict:1700,temperature:0.35});
writeJson(path.join(base,'design-draft.json'),{version:4,gameId,date,productionClass:'DESIGN_ONLY',tierAlias:3,tier:3,gameSeedId:seed.seedId,gameSeedSource:'game-seed-state.json',authorRole:'GAME_DESIGNER_AI',authorModel:designerModel,singleAuthor:true,content:designDraft});

const independentBatches={};
for(const model of pool){independentBatches[model]=await callModel(model,'너는 독립 검토 모델이다. 같은 상세 설계를 planning/graphics/development/qa/balance 다섯 전문부서 관점으로 분리해 검토한다. GAME_SEED에 없는 유명게임 표현 복제를 요구하지 않는다.',`GAME_SEED와 설계 초안을 각 부서 책임 기준으로 검토하라.\nGAME_SEED=${clip(seed,7000)}\nDESIGN=${clip(designDraft,13000)}`,REVIEWS,{predict:1400});}
const memberReviews=Object.fromEntries(ROLES.map(role=>[role,departmentReviewModels[role].map(model=>({model,memberRole:model===leadModels[role]?'LEAD':'ASSISTANT',review:independentBatches[model][role]}))]));
for(const role of ROLES){const models=uniq(memberReviews[role].map(x=>x.model));writeJson(path.join(base,'departments',role,'member-reviews.json'),{version:4,gameId,date,productionClass:'DESIGN_ONLY',department:role,leadModel:leadModels[role],assistantModels:models.filter(m=>m!==leadModels[role]),models,reviews:memberReviews[role]});}

const representatives={};
for(const role of ROLES){const lead=leadModels[role];representatives[role]=await callModel(lead,`너는 ${role} 부서 Lead AI다. Lead와 보조 모델의 독립검토를 비교해 부서 대표 의견 하나를 확정한다.`,`${role} 내부 검토를 KEEP/FIX/ADD/RISK/EVIDENCE로 통합하라.\nREVIEWS=${clip(memberReviews[role],11000)}`,REVIEW,{predict:800});writeJson(path.join(base,'departments',role,'representative.json'),{version:4,gameId,date,productionClass:'DESIGN_ONLY',department:role,representativeModel:lead,leadModel:lead,assistantModels:departmentReviewModels[role].filter(m=>m!==lead),representativeAuthoredByLead:true,representative:representatives[role]});}
const rebuttals={};
for(const role of ROLES){const other=Object.fromEntries(ROLES.filter(r=>r!==role).map(r=>[r,representatives[r]]));rebuttals[role]=await callModel(leadModels[role],`너는 ${role} 부서 Lead AI다. 다른 네 부서 대표 의견을 읽고 자기 책임범위에서 한 번만 수용/반박/수정한다.`, `OWN=${clip(representatives[role],5000)}\nOTHERS=${clip(other,12000)}`,REBUTTAL,{predict:600});}
writeJson(path.join(base,'meeting-rebuttal-round.json'),{version:4,gameId,date,productionClass:'DESIGN_ONLY',round:1,departmentLeadModels:leadModels,rebuttalAuthoredByDepartmentLeads:true,rebuttals});
const meeting=await callModel(coordinatorModel,'너는 5부서 회의 조정 AI다. 새 기능을 창작하지 않고 대표의견과 각 Lead의 1회 반박을 안건별 CONSENSUS/CONFLICT/HOLD로만 정리한다.',`CONSENSUS만 자동 수정에 사용한다.\nREPRESENTATIVES=${clip(representatives,12000)}\nREBUTTALS=${clip(rebuttals,11000)}`,MEETING,{predict:1100,temperature:0.15});
const consensus=meeting.decisions.filter(x=>x.status==='CONSENSUS');const conflicts=meeting.decisions.filter(x=>x.status==='CONFLICT');const holds=meeting.decisions.filter(x=>x.status==='HOLD');
writeJson(path.join(base,'department-meeting.json'),{version:4,gameId,date,productionClass:'DESIGN_ONLY',coordinatorModel,departmentLeadModels:leadModels,distinctLeadModelCount:distinctLeadModels.length,representatives,rebuttalRound:1,rebuttalAuthoredByDepartmentLeads:true,...meeting,counts:{consensus:consensus.length,conflict:conflicts.length,hold:holds.length}});

const revisedDesign=await callModel(designerModel,'너는 초안을 작성한 동일 Game Designer AI다. CONSENSUS만 설계에 반영하고 CONFLICT/HOLD는 openQuestions에 남긴다. GAME_SEED의 정체성과 타겟 근거를 잃지 않는다.',`같은 설계자가 수정한다.\nGAME_SEED=${clip(seed,6500)}\nDRAFT=${clip(designDraft,12000)}\nCONSENSUS=${clip(consensus,6500)}\nCONFLICT=${clip(conflicts,3500)}\nHOLD=${clip(holds,3500)}`,DESIGN,{predict:1700,temperature:0.2});
writeJson(path.join(base,'design-revised.json'),{version:4,gameId,date,productionClass:'DESIGN_ONLY',tierAlias:3,tier:3,gameSeedId:seed.seedId,authorRole:'GAME_DESIGNER_AI',authorModel:designerModel,sameModelAsDraft:true,appliedConsensusCount:consensus.length,unresolvedConflictCount:conflicts.length,heldCount:holds.length,status:'DESIGN_BASELINE_CANDIDATE',content:revisedDesign});

const fatalReviews={};
for(const role of ROLES){fatalReviews[role]=await callModel(leadModels[role],`너는 ${role} 부서 Lead AI다. Game Designer 수정 이후 폐기 안전 재검토를 한다. 단순 불만·시장수치·수정가능 문제로 DISCARD를 선택하면 안 된다. DISCARD는 중앙정책의 fatalCriteria 중 수정 후에도 남은 치명 조건이 실제 설계 근거로 확인될 때만 가능하다.`, `수정 설계를 다시 검토해 ACTIVE/REDESIGN/DISCARD 중 하나를 권고하라.\nVALID_FATAL_CRITERIA=${JSON.stringify(FATAL_CRITERIA)}\nGAME_SEED=${clip(seed,6000)}\nREVISED_DESIGN=${clip(revisedDesign,13000)}\nINITIAL_MEETING=${clip(meeting,5000)}`,FATAL_REVIEW,{predict:700,temperature:0.1});}
const discardVotes=ROLES.filter(role=>fatalReviews[role].recommendedState==='DISCARD');
const commonFatal=FATAL_CRITERIA.filter(criterion=>ROLES.every(role=>(fatalReviews[role].fatalCriteria||[]).includes(criterion)));
const unanimousFatalDiscard=discardVotes.length===ROLES.length&&commonFatal.length>0;
let disposition='ACTIVE';
if(unanimousFatalDiscard)disposition='DISCARDED';
else if(conflicts.length||holds.length||ROLES.some(role=>fatalReviews[role].recommendedState!=='ACTIVE'))disposition='REDESIGN';
const dispositionEvidence={version:1,gameId,date,state:disposition,sameDesignerRevisionAttempted:true,repeatedFiveDepartmentReview:true,allFiveLeadModelsReviewed:ROLES.every(role=>Boolean(fatalReviews[role])),discardVotes:discardVotes.length,commonFatalCriteria:commonFatal,unanimousFatalDiscard,fatalReviews,marketMetricAloneUsedForDiscard:false};
writeJson(path.join(base,'design-disposition.json'),dispositionEvidence);

const modelAudit=Object.fromEntries(ROLES.map(role=>{const models=uniq(memberReviews[role].map(x=>x.model));return[role,{leadModel:leadModels[role],assistantModels:models.filter(m=>m!==leadModels[role]),models,count:models.length,required:reviewModelCount,pass:models.length>=reviewModelCount&&models.includes(leadModels[role]),representativeModel:leadModels[role],representativeAuthoredByLead:true,rebuttalModel:leadModels[role],rebuttalAuthoredByLead:true}];}));
writeJson(path.join(base,'cycle-status.json'),{version:5,date,gameId,gameName:game.name,productionClass:'DESIGN_ONLY',tierAlias:3,tier:3,status:'COMPLETE',policyDocument:'COMPANY_FLOW.md',flow:'GAME_SEED_TO_DESIGN_BASELINE_CANDIDATE',gameSeed:{seedId:seed.seedId,category:seed.GAME_CATEGORY,source:'game-seed-state.json',complete:true},designer:{role:'GAME_DESIGNER_AI',model:designerModel,singleAuthor:true,sameModelRevised:true},departments:{count:ROLES.length,roles:ROLES,leadModels,distinctLeadModels,distinctLeadModelCount:distinctLeadModels.length,leadModelsDistinct:distinctLeadModels.length===ROLES.length,reviewModelCount,modelAudit,rebuttalRounds:1,rebuttalAuthoredByDepartmentLeads:true,repeatedFatalReview:true},meeting:{consensusCount:consensus.length,conflictCount:conflicts.length,holdCount:holds.length,coordinatorModel},disposition:dispositionEvidence,artbook:{created:false,reason:'DESIGN_BASELINE_GATE_MUST_RUN_FIRST'},vibe2Used:false,paidApi:false});
console.log('COMPANY_DESIGN_CYCLE=COMPLETE');
console.log(`GAME_ID=${gameId}`);
console.log(`GAME_SEED_ID=${seed.seedId}`);
console.log('PRODUCTION_CLASS=DESIGN_ONLY');
console.log(`DISTINCT_DEPARTMENT_LEADS=${distinctLeadModels.length}`);
console.log(`DESIGN_DISPOSITION=${disposition}`);
console.log('DESIGN_ONLY_ARTBOOK_CREATED=NO');
console.log('DESIGN_ONLY_VIBE2_USED=NO');
console.log('PAID_API=NO');
