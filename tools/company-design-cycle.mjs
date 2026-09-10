import fs from 'node:fs';
import path from 'node:path';
import {PRODUCTION_CLASSES,productionClassOf,tierAliasForProductionClass} from './production-classification.mjs';

const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const clip=(v,n=12000)=>{const s=typeof v==='string'?v:JSON.stringify(v);return s.length>n?s.slice(0,n):s;};
const ROLES=['planning','graphics','development','qa','balance'];
function kstDate(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return`${g('year')}-${g('month')}-${g('day')}`;}
function hash(value){let h=2166136261;for(const ch of String(value)){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function uniq(values){return[...new Set(values.map(clean).filter(Boolean))];}

const directive=readJson('company-directive.json',{});
const ai=directive.ai||{};
const numericLabels=directive.production?.numericLabels||{};
const configured=clean(process.env.COMPANY_MODEL_POOL).split(',').filter(Boolean);
const pool=uniq(configured.length?configured:(ai.modelPool||[]));
const minModels=Number(ai.minDistinctModelsPerDepartment||3);
const reviewModelCount=Math.max(minModels,Number(ai.departmentReviewModelCount||minModels));
const leadModels=Object.fromEntries(ROLES.map(role=>[role,clean(ai.departmentLeadModels?.[role])]));
const distinctLeadModels=uniq(ROLES.map(role=>leadModels[role]));
const minLeadModels=Number(ai.minDistinctLeadModelsAcrossDepartments||ROLES.length);

if(pool.length<reviewModelCount)throw new Error(`MULTIMODEL_GATE: need ${reviewModelCount} pool models, got ${pool.length}`);
for(const role of ROLES){
  if(!leadModels[role])throw new Error(`DEPARTMENT_LEAD_GATE: ${role} lead model missing`);
  if(!pool.includes(leadModels[role]))throw new Error(`DEPARTMENT_LEAD_GATE: ${role} lead ${leadModels[role]} is not in modelPool`);
}
if(ai.departmentLeadModelsMustBeDistinct!==false&&distinctLeadModels.length<minLeadModels){
  throw new Error(`DEPARTMENT_LEAD_GATE: need ${minLeadModels} distinct lead models, got ${distinctLeadModels.length}`);
}

function reviewModelsFor(role){
  const lead=leadModels[role];
  const start=Math.max(0,pool.indexOf(lead));
  const models=[lead];
  for(let step=1;models.length<reviewModelCount&&step<=pool.length*2;step++){
    const candidate=pool[(start+step)%pool.length];
    if(candidate&&!models.includes(candidate))models.push(candidate);
  }
  if(uniq(models).length<reviewModelCount)throw new Error(`${role} distinct member model gate failed: ${uniq(models).length}/${reviewModelCount}`);
  return models;
}
const departmentReviewModels=Object.fromEntries(ROLES.map(role=>[role,reviewModelsFor(role)]));

const gameId=clean(process.env.ARTBOOK_GAME_ID||process.env.GAME_ID||process.argv.find(x=>x.startsWith('--game='))?.split('=')[1]);
const date=clean(process.env.ARTBOOK_DATE||process.env.DESIGN_DATE||kstDate());
if(!gameId)throw new Error('ARTBOOK_GAME_ID or GAME_ID is required');
const catalog=readJson('game-catalog.json',{games:[]});
const game=(catalog.games||[]).find(x=>x.id===gameId);
if(!game)throw new Error(`Unknown game: ${gameId}`);
const productionClass=productionClassOf({},game,{numericLabels});
if(!Object.values(PRODUCTION_CLASSES).includes(productionClass))throw new Error(`Invalid production class: ${productionClass}`);
const tierAlias=tierAliasForProductionClass(productionClass,{numericLabels})??(Number(game.productionTier||0)||null);
const idx=hash(gameId)%pool.length;
const designerModel=pool[idx];
const editorModel=pool[(idx+1)%pool.length];
const coordinatorModel=pool[(idx+2)%pool.length];
const base=path.join('design',gameId,date);
const submissionBase=path.join('artbook-submissions',gameId,date);
fs.mkdirSync(base,{recursive:true});
fs.mkdirSync(submissionBase,{recursive:true});

const factPack=readJson(path.join(submissionBase,'fact-pack.json'),{});
const webRuntime=readJson('company-qa-runtime-evidence.json',{games:[]});
const webRuntimeGame=(webRuntime.games||[]).find(x=>x.gameId===gameId)||null;
const evidence={
  game:{id:game.id,name:game.name,description:game.description,genre:game.genre,productionClass,tierAlias,productionTarget:game.productionTarget,webPath:game.webPath,unityProjectPath:game.unityProjectPath||null},
  factPack,
  webRuntimeEvidence:webRuntimeGame,
  centralPolicy:'COMPANY_FLOW.md'
};

const REVIEW={type:'object',required:['keep','fix','add','risks','evidence','questions'],properties:{keep:{type:'array',items:{type:'string'}},fix:{type:'array',items:{type:'string'}},add:{type:'array',items:{type:'string'}},risks:{type:'array',items:{type:'string'}},evidence:{type:'array',items:{type:'string'}},questions:{type:'array',items:{type:'string'}}},additionalProperties:false};
const DESIGN={type:'object',required:['identity','playerFantasy','coreLoop','signatureSystems','progressionDirection','visualDirection','mobileUx','technicalAssumptions','validationQuestions','openQuestions'],properties:{identity:{type:'string'},playerFantasy:{type:'string'},coreLoop:{type:'array',items:{type:'string'}},signatureSystems:{type:'array',items:{type:'object',required:['name','purpose','playerChoice'],properties:{name:{type:'string'},purpose:{type:'string'},playerChoice:{type:'string'}},additionalProperties:false}},progressionDirection:{type:'string'},visualDirection:{type:'string'},mobileUx:{type:'string'},technicalAssumptions:{type:'array',items:{type:'string'}},validationQuestions:{type:'array',items:{type:'string'}},openQuestions:{type:'array',items:{type:'string'}}},additionalProperties:false};
const REVIEWS={type:'object',required:ROLES,properties:Object.fromEntries(ROLES.map(r=>[r,REVIEW])),additionalProperties:false};
const REBUTTAL={type:'object',required:['accept','challenge','revision','reason'],properties:{accept:{type:'array',items:{type:'string'}},challenge:{type:'array',items:{type:'string'}},revision:{type:'array',items:{type:'string'}},reason:{type:'string'}},additionalProperties:false};
const MEETING={type:'object',required:['summary','decisions'],properties:{summary:{type:'string'},decisions:{type:'array',items:{type:'object',required:['topic','status','reason','departments'],properties:{topic:{type:'string'},status:{type:'string',enum:['CONSENSUS','CONFLICT','HOLD']},reason:{type:'string'},departments:{type:'array',items:{type:'string'}}},additionalProperties:false}}},additionalProperties:false};
const ARTBOOK={type:'object',required:['identity','playerFantasy','coreLoop','signatureSystems','progressionDirection','visualDirection'],properties:{identity:{type:'string'},playerFantasy:{type:'string'},coreLoop:{type:'array',items:{type:'string'}},signatureSystems:{type:'array',items:{type:'string'}},progressionDirection:{type:'string'},visualDirection:{type:'string'}},additionalProperties:false};
const VERIFY={type:'object',required:['supported','unsupportedClaims'],properties:{supported:{type:'boolean'},unsupportedClaims:{type:'array',items:{type:'string'}}},additionalProperties:false};
const ROLE_RISK={type:'object',required:['risks','evidence'],properties:{risks:{type:'array',items:{type:'string'}},evidence:{type:'array',items:{type:'string'}}},additionalProperties:false};

async function callModel(model,system,user,schema,{predict=900,temperature=0.25}={}){
  let lastError=null;
  const basePredict=Math.max(1800,Number(predict)||900);
  for(let attempt=1;attempt<=3;attempt++){
    const attemptPredict=Math.min(4096,attempt===1?basePredict:attempt===2?Math.ceil(basePredict*1.5):Math.ceil(basePredict*2.25));
    const retryInstruction=attempt===1?'':'\n\n재시도 지시: 이전 응답이 길이 제한 또는 JSON 파싱 오류로 실패했다. 같은 스키마를 유지하되 각 문자열과 배열 항목을 더 짧게 줄이고, 설명이나 마크다운 없이 유효한 JSON 객체를 반드시 끝까지 닫아라.';
    try{
      const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,format:schema,messages:[{role:'system',content:system},{role:'user',content:user+retryInstruction}],options:{temperature:attempt===1?temperature:0,num_ctx:12288,num_predict:attemptPredict}})});
      if(!response.ok)throw new Error(`ollama ${response.status}: ${await response.text()}`);
      const body=await response.json();
      const text=String(body?.message?.content??'').trim();
      if(!text)throw new Error('empty model response');
      const doneReason=clean(body?.done_reason).toLowerCase();
      try{
        return JSON.parse(text);
      }catch(error){
        const truncated=doneReason==='length'||/unterminated|unexpected end|end of json input|end of data/i.test(clean(error?.message));
        lastError=new Error(`${truncated?'truncated JSON':'invalid JSON'} done_reason=${doneReason||'unknown'} predict=${attemptPredict}: ${clean(error?.message)}`);
        if(attempt<3){
          console.warn(`MODEL_CALL_RETRY model=${model} attempt=${attempt+1}/3 reason=${truncated?'TRUNCATED_JSON':'INVALID_JSON'} next_predict=${Math.min(4096,attempt===1?Math.ceil(basePredict*1.5):Math.ceil(basePredict*2.25))}`);
          continue;
        }
        throw lastError;
      }
    }catch(error){
      lastError=error;
      if(attempt<3)continue;
    }
  }
  throw new Error(`MODEL_CALL_FAILED ${model}: ${clean(lastError?.message)}`);
}

function classGuidance(){
  if(productionClass===PRODUCTION_CLASSES.DESIGN_ONLY)return 'DESIGN_ONLY 단계다. 코드 구현안을 확정하지 말고 게임 정체성, 핵심 재미, 핵심 루프, 대표 시스템, 성장/비주얼/모바일 UX와 DEVELOPMENT_CONFIRMED에서 검증할 질문을 상세 설계하라.';
  if(productionClass===PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED)return 'DEVELOPMENT_CONFIRMED 단계다. Web gameplay validation과 Unity technical validation을 전제로 재미, 구현 난이도, 성능, 제작량, 세이브, QA, 밸런스를 구체적으로 검토하라. AI 회의 완료를 DEVELOPMENT_BASELINE 통과로 오해하지 말라.';
  return 'RELEASE_CONFIRMED 단계다. 새로운 대형 기능을 제안하지 말고 확정된 기준선 이탈, 크래시, 성능, 세이브, 렌더링, QA, 밸런스 등 출시 차단 위험만 찾는다.';
}

function findLatestRevisedDesign(id,excludeDate=''){
  const root=path.join('design',id);
  if(!fs.existsSync(root))return null;
  const dates=fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isDirectory()&&/^\d{4}-\d{2}-\d{2}$/.test(e.name)&&e.name!==excludeDate).map(e=>e.name).sort().reverse();
  for(const d of dates){const f=path.join(root,d,'design-revised.json');const data=readJson(f,null);if(data)return{path:f.replaceAll('\\','/'),data};}
  return null;
}

if(productionClass===PRODUCTION_CLASSES.RELEASE_CONFIRMED){
  const departmentRiskWatch={};
  for(const role of ROLES){
    const leadModel=leadModels[role];
    const models=departmentReviewModels[role];
    const passes=[];
    for(const model of models){
      const memberRole=model===leadModel?'LEAD':'ASSISTANT';
      const result=await callModel(model,`너는 ${role} 부서의 ${memberRole} 오류 감시 AI다. 새 기능 기획보다 ${role} 책임 영역의 출시 차단 결함과 위험만 판정한다.`,`${classGuidance()}\n현재 근거에서 ${role} 부서가 책임질 출시 위험만 작성하라. 문제가 확실하지 않으면 빈 배열을 써라.\nEVIDENCE=${clip(evidence,13000)}`,ROLE_RISK,{predict:450});
      passes.push({model,memberRole,result});
    }
    const representative=await callModel(leadModel,`너는 ${role} 부서 Lead AI다. 보조 AI의 오류 감시 결과를 검토해 중복과 추측을 제거하고 실제 출시 위험만 대표 의견으로 확정한다.`,`다음 ${role} 부서 내부 감시 결과를 통합하라. 근거 없는 위험은 빼라.\nPASSES=${clip(passes,9000)}`,ROLE_RISK,{predict:400,temperature:0.1});
    departmentRiskWatch[role]={leadModel,assistantModels:models.filter(m=>m!==leadModel),models,passes,representative};
  }
  const artbookSource=findLatestRevisedDesign(gameId,date);
  let artbook=null;
  if(artbookSource){
    artbook=await callModel(editorModel,'너는 Artbook Editor AI 한 명이다. 새 설정이나 수치를 만들지 말고 제공된 확정 설계의 핵심 전략만 압축한다.',`출시 단계 아트북을 갱신하라. 원문에 없는 주장을 추가하지 마라.\nREVISED_DESIGN=${clip(artbookSource.data,12000)}`,ARTBOOK,{predict:700});
    writeJson(path.join(base,'core-artbook.json'),{version:3,gameId,date,productionClass,tierAlias,tier:tierAlias,editorModel,source:artbookSource.path,content:artbook,newClaimsAdded:false});
  }
  writeJson(path.join(base,'release-risk-watch.json'),{version:3,gameId,date,productionClass,tierAlias,tier:tierAlias,departmentLeadModels:leadModels,distinctLeadModels,departmentRiskWatch,departmentErrorWatchOnly:true,vibe2PrimaryDeveloper:true});
  writeJson(path.join(base,'cycle-status.json'),{version:4,date,gameId,productionClass,tierAlias,tier:tierAlias,status:'COMPLETE',policyDocument:'COMPANY_FLOW.md',flow:'RELEASE_CONFIRMED_VIBE2_DEVELOPMENT_DISTINCT_LEAD_DEPARTMENT_ERROR_WATCH',vibe2PrimaryDeveloper:true,designChanged:false,departmentErrorWatchOnly:true,departments:{count:ROLES.length,leadModels,distinctLeadModelCount:distinctLeadModels.length,leadModelsDistinct:distinctLeadModels.length===ROLES.length,reviewModelCount},artbookUpdated:Boolean(artbook),artbook:artbook?{singleEditor:true,editorModel,departmentPageAuthorship:false,newClaimsAdded:false}:null});
  console.log('COMPANY_DESIGN_CYCLE=COMPLETE');
  console.log(`PRODUCTION_CLASS=${productionClass}`);
  console.log(`DISTINCT_DEPARTMENT_LEADS=${distinctLeadModels.length}`);
  console.log('RELEASE_MODE=VIBE2_PRIMARY_DEVELOPMENT_DEPARTMENT_ERROR_WATCH');
  process.exit(0);
}

const designDraft=await callModel(designerModel,'너는 이 프로젝트의 단일 Game Designer AI다. 설계 전체를 혼자 작성한다. 제공된 사실과 사용자 확정 규칙을 우선하며 모르는 것은 openQuestions에 둔다.',`${classGuidance()}\n상세 게임 설계 초안을 JSON으로 작성하라. 부서가 대신 설계하지 않는다.\nEVIDENCE=${clip(evidence,15000)}`,DESIGN,{predict:1300,temperature:0.35});
writeJson(path.join(base,'design-draft.json'),{version:3,gameId,date,productionClass,tierAlias,tier:tierAlias,authorRole:'GAME_DESIGNER_AI',authorModel:designerModel,singleAuthor:true,content:designDraft});

// 모든 풀 모델을 한 번씩 실행해 실제 독립 응답을 확보한 뒤,
// 부서별로 고유 Lead + 회전 보조 모델 집합만 내부 회의 입력으로 사용한다.
const independentBatches={};
for(const model of pool){
  independentBatches[model]=await callModel(model,'너는 독립 검토 모델이다. 같은 설계를 5개 전문부서 관점으로 각각 검토한다. 부서별 의견을 섞지 말고 각 부서 책임 기준으로 작성한다.',`${classGuidance()}\n다음 상세 설계 초안을 planning/graphics/development/qa/balance 다섯 관점에서 각각 독립 검토하라. KEEP/FIX/ADD/RISK/EVIDENCE를 구체적으로 작성하라.\nDESIGN=${clip(designDraft,13000)}\nEVIDENCE=${clip(evidence,7000)}`,REVIEWS,{predict:1150});
}

const memberReviews=Object.fromEntries(ROLES.map(role=>[role,departmentReviewModels[role].map(model=>({model,memberRole:model===leadModels[role]?'LEAD':'ASSISTANT',review:independentBatches[model][role]}))]));
for(const role of ROLES){
  const distinct=uniq(memberReviews[role].map(x=>x.model));
  if(distinct.length<reviewModelCount)throw new Error(`${role} distinct member model gate failed: ${distinct.length}/${reviewModelCount}`);
  if(memberReviews[role].filter(x=>x.memberRole==='LEAD').length!==1)throw new Error(`${role} lead membership gate failed`);
  writeJson(path.join(base,'departments',role,'member-reviews.json'),{version:3,gameId,date,productionClass,department:role,leadModel:leadModels[role],assistantModels:distinct.filter(m=>m!==leadModels[role]),models:distinct,reviews:memberReviews[role]});
}

const representatives={};
for(const role of ROLES){
  const leadModel=leadModels[role];
  representatives[role]=await callModel(leadModel,`너는 ${role} 부서의 Lead AI다. 네 독립 의견과 보조 AI 의견을 모두 비교한 뒤 ${role} 책임 범위의 대표 의견 하나를 확정한다. 다수결만으로 뭉개지 말고 근거와 위험을 비교하며 원 설계에 없는 기능을 확정하지 않는다.`,`${classGuidance()}\n${role} 부서 내부 검토를 읽고 KEEP/FIX/ADD/RISK/EVIDENCE 형식의 부서 대표 의견을 작성하라.\nMEMBER_REVIEWS=${clip(memberReviews[role],10000)}`,REVIEW,{predict:700});
  writeJson(path.join(base,'departments',role,'representative.json'),{version:3,gameId,date,productionClass,department:role,representativeModel:leadModel,leadModel,assistantModels:departmentReviewModels[role].filter(m=>m!==leadModel),representativeAuthoredByLead:true,representative:representatives[role]});
}

const rebuttals={};
for(const role of ROLES){
  const leadModel=leadModels[role];
  const otherRepresentatives=Object.fromEntries(ROLES.filter(r=>r!==role).map(r=>[r,representatives[r]]));
  rebuttals[role]=await callModel(leadModel,`너는 ${role} 부서 Lead AI다. 다른 4개 부서 대표 의견을 읽고 ${role} 책임 기준으로 한 번만 수용/반박/수정한다. 자기 부서 책임을 벗어난 새 기획을 만들지 않는다.`,`${classGuidance()}\nOWN_REPRESENTATIVE=${clip(representatives[role],5000)}\nOTHER_REPRESENTATIVES=${clip(otherRepresentatives,11000)}`,REBUTTAL,{predict:500});
}
writeJson(path.join(base,'meeting-rebuttal-round.json'),{version:3,gameId,date,productionClass,round:1,departmentLeadModels:leadModels,rebuttalAuthoredByDepartmentLeads:true,rebuttals});

const meeting=await callModel(coordinatorModel,'너는 재운컴퍼니 회의 조정 AI다. 새 기획을 만드는 사람이 아니다. 5개의 서로 다른 부서 Lead 의견과 각 Lead의 반박을 읽고 안건별 CONSENSUS/CONFLICT/HOLD만 판정한다.',`${classGuidance()}\n대표 의견과 1회 반박을 정리해 회의 결론을 작성하라. CONSENSUS만 자동 설계 수정에 사용된다.\nREPRESENTATIVES=${clip(representatives,11000)}\nREBUTTALS=${clip(rebuttals,10000)}`,MEETING,{predict:850});
const consensus=meeting.decisions.filter(x=>x.status==='CONSENSUS');
const conflicts=meeting.decisions.filter(x=>x.status==='CONFLICT');
const holds=meeting.decisions.filter(x=>x.status==='HOLD');
writeJson(path.join(base,'department-meeting.json'),{version:3,gameId,date,productionClass,coordinatorModel,departmentLeadModels:leadModels,distinctLeadModelCount:distinctLeadModels.length,representatives,rebuttalRound:1,rebuttalAuthoredByDepartmentLeads:true,...meeting,counts:{consensus:consensus.length,conflict:conflicts.length,hold:holds.length}});

const revisedDesign=await callModel(designerModel,'너는 초안을 작성한 동일 Game Designer AI다. 다른 저자처럼 새 설계를 쓰지 말고 기존 초안에 CONSENSUS만 반영한다. CONFLICT/HOLD는 openQuestions에 남긴다.',`${classGuidance()}\n초안과 회의 결과를 사용해 상세 설계를 수정하라. CONSENSUS만 자동 반영하고 CONFLICT/HOLD는 확정하지 마라.\nDRAFT=${clip(designDraft,11000)}\nCONSENSUS=${clip(consensus,6000)}\nCONFLICT=${clip(conflicts,3000)}\nHOLD=${clip(holds,3000)}`,DESIGN,{predict:1300,temperature:0.25});
const candidateStatus=productionClass===PRODUCTION_CLASSES.DESIGN_ONLY?'DESIGN_BASELINE_CANDIDATE':'DEVELOPMENT_BASELINE_CANDIDATE';
writeJson(path.join(base,'design-revised.json'),{version:3,gameId,date,productionClass,tierAlias,tier:tierAlias,authorRole:'GAME_DESIGNER_AI',authorModel:designerModel,sameModelAsDraft:true,appliedConsensusCount:consensus.length,unresolvedConflictCount:conflicts.length,heldCount:holds.length,status:candidateStatus,content:revisedDesign});

let artbook=await callModel(editorModel,'너는 이 프로젝트의 단일 Artbook Editor AI다. 상세 설계의 핵심 전략만 압축한다. 새 설정, 새 수치, 새 시스템, 새 스토리를 절대 발명하지 않는다.',`수정된 상세 설계에서 게임 정체성, 플레이어 판타지, 핵심 루프, 시그니처 시스템, 성장 방향, 비주얼 방향만 아트북으로 압축하라.\nREVISED_DESIGN=${clip(revisedDesign,13000)}`,ARTBOOK,{predict:750});
let verification=await callModel(coordinatorModel,'너는 Vibe2 검증 역할이다. 작성자가 아니다. 아트북의 모든 주장이 수정된 상세 설계에 근거하는지만 확인한다.',`아트북에 수정 설계에 없는 새 주장이나 시스템이 있는지 검증하라. 표현 압축은 허용한다.\nREVISED_DESIGN=${clip(revisedDesign,11000)}\nARTBOOK=${clip(artbook,7000)}`,VERIFY,{predict:350,temperature:0});
if(!verification.supported){
  artbook=await callModel(editorModel,'너는 같은 단일 Artbook Editor AI다. 검증에서 지적된 새 주장을 제거하고 수정 설계에 명시된 핵심 전략만 남긴다.',`수정 설계에 없는 주장을 제거해 아트북을 다시 작성하라.\nUNSUPPORTED=${clip(verification.unsupportedClaims,2500)}\nREVISED_DESIGN=${clip(revisedDesign,12000)}\nARTBOOK=${clip(artbook,6000)}`,ARTBOOK,{predict:700,temperature:0.15});
  verification=await callModel(coordinatorModel,'너는 Vibe2 검증 역할이다. 작성자가 아니다. 수정본 아트북에 원 설계에 없는 주장이 남았는지 재검증한다.',`REVISED_DESIGN=${clip(revisedDesign,11000)}\nARTBOOK=${clip(artbook,7000)}`,VERIFY,{predict:300,temperature:0});
}
if(!verification.supported)throw new Error(`ARTBOOK_PROVENANCE_GATE: unsupported claims remain: ${verification.unsupportedClaims.join(' | ')}`);
writeJson(path.join(base,'core-artbook.json'),{version:3,gameId,date,productionClass,tierAlias,tier:tierAlias,editorRole:'ARTBOOK_EDITOR_AI',editorModel,singleEditor:true,sourceDesign:path.join(base,'design-revised.json').replaceAll('\\','/'),departmentPageAuthorship:false,newClaimsAdded:false,verification,content:artbook});

const modelAudit=Object.fromEntries(ROLES.map(role=>{
  const models=uniq(memberReviews[role].map(x=>x.model));
  const leadModel=leadModels[role];
  return[role,{leadModel,assistantModels:models.filter(m=>m!==leadModel),models,count:models.length,required:reviewModelCount,pass:models.length>=reviewModelCount&&models.includes(leadModel),representativeModel:leadModel,representativeAuthoredByLead:true,rebuttalModel:leadModel,rebuttalAuthoredByLead:true}];
}));
const flow=productionClass===PRODUCTION_CLASSES.DESIGN_ONLY?'DESIGN_ONLY_DISTINCT_LEAD_BASELINE_REVIEW_TO_ARTBOOK':'DEVELOPMENT_CONFIRMED_DISTINCT_LEAD_VALIDATION_REVIEW_CYCLE';
const vibe2Role=ai.vibe2?.roleByClass?.[productionClass]||'VALIDATION_AND_LEARNING';
writeJson(path.join(base,'cycle-status.json'),{version:4,date,gameId,productionClass,tierAlias,tier:tierAlias,status:'COMPLETE',policyDocument:'COMPANY_FLOW.md',flow,designer:{role:'GAME_DESIGNER_AI',model:designerModel,singleAuthor:true,sameModelRevised:true},departments:{count:ROLES.length,roles:ROLES,leadModels,distinctLeadModels,distinctLeadModelCount:distinctLeadModels.length,minDistinctLeadModels:minLeadModels,leadModelsDistinct:distinctLeadModels.length>=minLeadModels,reviewModelCount,modelAudit,rebuttalRounds:1,rebuttalAuthoredByDepartmentLeads:true},meeting:{consensusCount:consensus.length,conflictCount:conflicts.length,holdCount:holds.length,coordinatorModel},artbook:{singleEditor:true,editorModel,departmentPageAuthorship:false,newClaimsAdded:false,provenanceVerified:true,directAfterDesignCycle:productionClass===PRODUCTION_CLASSES.DESIGN_ONLY},vibe2Role,paidApi:false});
console.log('COMPANY_DESIGN_CYCLE=COMPLETE');
console.log(`GAME_ID=${gameId}`);
console.log(`PRODUCTION_CLASS=${productionClass}`);
console.log(`TIER_ALIAS=${tierAlias??'NONE'}`);
console.log(`DESIGNER_MODEL=${designerModel}`);
console.log(`DEPARTMENT_LEADS=${ROLES.map(role=>`${role}:${leadModels[role]}`).join(',')}`);
console.log(`DISTINCT_DEPARTMENT_LEADS=${distinctLeadModels.length}`);
console.log(`DISTINCT_MODELS_PER_DEPARTMENT=${reviewModelCount}`);
console.log('DEPARTMENT_REPRESENTATIVE_OWNER=LEAD_MODEL');
console.log('DEPARTMENT_REBUTTAL_OWNER=LEAD_MODEL');
console.log('DEPARTMENT_REBUTTAL_ROUNDS=1');
console.log(`MEETING_CONSENSUS=${consensus.length}`);
console.log(`MEETING_CONFLICT=${conflicts.length}`);
console.log(`MEETING_HOLD=${holds.length}`);
console.log(`ARTBOOK_EDITOR_MODEL=${editorModel}`);
console.log('DESIGN_ONLY_ARTBOOK_DIRECT=YES');
console.log('ARTBOOK_PROVENANCE_GATE=PASS');
console.log('PAID_API=NO');
