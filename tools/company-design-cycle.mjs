import fs from 'node:fs';
import path from 'node:path';
import {PRODUCTION_CLASSES,productionClassOf,tierAliasForProductionClass} from './production-classification.mjs';

const ROLES=['planning','graphics','development','qa','balance'];
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const uniq=v=>[...new Set((v||[]).map(clean).filter(Boolean))];
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clip=(value,max=14000)=>{const text=typeof value==='string'?value:JSON.stringify(value);return text.length>max?text.slice(0,max):text;};
function kstDate(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=t=>parts.find(x=>x.type===t)?.value||'';return`${get('year')}-${get('month')}-${get('day')}`;}
function hash(value){let h=2166136261;for(const ch of String(value)){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;}

const directive=readJson('company-directive.json',{});
const ai=directive.ai||{};
const numericLabels=directive.production?.numericLabels||{};
const configured=clean(process.env.COMPANY_MODEL_POOL).split(',').filter(Boolean);
const pool=uniq(configured.length?configured:(ai.modelPool||[]));
const minModels=Math.max(3,Number(ai.minDistinctModelsPerDepartment||3));
const reviewModelCount=Math.max(minModels,Number(ai.departmentReviewModelCount||minModels));
const leadModels=Object.fromEntries(ROLES.map(role=>[role,clean(ai.departmentLeadModels?.[role])]));
const distinctLeadModels=uniq(Object.values(leadModels));
if(pool.length<reviewModelCount)throw new Error(`MULTIMODEL_GATE:${pool.length}/${reviewModelCount}`);
if(distinctLeadModels.length!==ROLES.length)throw new Error(`DEPARTMENT_LEAD_GATE:${distinctLeadModels.length}/${ROLES.length}`);
for(const role of ROLES)if(!leadModels[role]||!pool.includes(leadModels[role]))throw new Error(`DEPARTMENT_LEAD_GATE:${role}`);
function reviewModelsFor(role){const lead=leadModels[role];const start=Math.max(0,pool.indexOf(lead));const out=[lead];for(let i=1;out.length<reviewModelCount&&i<=pool.length*2;i++){const model=pool[(start+i)%pool.length];if(model&&!out.includes(model))out.push(model);}if(out.length<reviewModelCount)throw new Error(`DEPARTMENT_MEMBER_GATE:${role}`);return out;}
const departmentReviewModels=Object.fromEntries(ROLES.map(role=>[role,reviewModelsFor(role)]));

const gameId=clean(process.env.ARTBOOK_GAME_ID||process.env.GAME_ID||process.argv.find(x=>x.startsWith('--game='))?.split('=')[1]);
const date=clean(process.env.ARTBOOK_DATE||process.env.DESIGN_DATE||kstDate());
if(!gameId)throw new Error('ARTBOOK_GAME_ID or GAME_ID is required');
const catalog=readJson('game-catalog.json',{games:[]});
const game=(catalog.games||[]).find(x=>x.id===gameId);
if(!game)throw new Error(`Unknown game:${gameId}`);
const productionClass=productionClassOf({},game,{numericLabels});
if(productionClass!==PRODUCTION_CLASSES.DESIGN_ONLY)throw new Error(`DESIGN_ONLY_REQUIRED:${productionClass}`);
const tierAlias=tierAliasForProductionClass(productionClass,{numericLabels})??3;
const base=path.join('design',gameId,date);
fs.mkdirSync(base,{recursive:true});
const seedPath=clean(game.gameSeedPath)||path.join(base,'game-seed.json');
const seed=readJson(seedPath,null);
if(!seed||seed.gameId!==gameId||seed.status!=='ACTIVE')throw new Error(`GAME_SEED_COMPLETE_REQUIRED:${seedPath}`);
if(seed.sourceCodeRule!=='OWN_IMPLEMENTATION_ONLY'||seed.directExpressionCopyForbidden!==true)throw new Error('GAME_SEED_COPY_BOUNDARY_REQUIRED');
if(seed.marketEvidenceRole!=='TARGET_DESIGN_REFERENCE'||seed.marketEvidenceHardGate!==false)throw new Error('GAME_SEED_MARKET_ROLE_REQUIRED');
const designerModel=pool[hash(gameId)%pool.length];
const coordinatorModel=pool[(hash(`${gameId}:meeting`))%pool.length];

function previousDesignStatus(){
  const root=path.join('design',gameId);if(!fs.existsSync(root))return null;
  const dates=fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isDirectory()&&/^\d{4}-\d{2}-\d{2}$/.test(e.name)&&e.name!==date).map(e=>e.name).sort().reverse();
  for(const d of dates){const data=readJson(path.join(root,d,'cycle-status.json'),null);if(data?.productionClass===PRODUCTION_CLASSES.DESIGN_ONLY)return data;}
  return null;
}
const previousStatus=previousDesignStatus();

const SHORT={type:'string',maxLength:280};
const DESIGN={type:'object',required:['identity','playerFantasy','coreLoop','signatureSystems','progressionDirection','visualDirection','mobileUx','technicalAssumptions','validationQuestions','openQuestions'],properties:{identity:{type:'string',maxLength:900},playerFantasy:{type:'string',maxLength:900},coreLoop:{type:'array',minItems:4,maxItems:7,items:SHORT},signatureSystems:{type:'array',minItems:2,maxItems:5,items:{type:'object',required:['name','purpose','playerChoice'],properties:{name:{type:'string',maxLength:120},purpose:{type:'string',maxLength:420},playerChoice:{type:'string',maxLength:420}},additionalProperties:false}},progressionDirection:{type:'string',maxLength:900},visualDirection:{type:'string',maxLength:900},mobileUx:{type:'string',maxLength:900},technicalAssumptions:{type:'array',maxItems:7,items:SHORT},validationQuestions:{type:'array',maxItems:7,items:SHORT},openQuestions:{type:'array',maxItems:7,items:SHORT}},additionalProperties:false};
const REVIEW={type:'object',required:['keep','fix','add','risks','evidence','fatalIssues'],properties:{keep:{type:'array',maxItems:2,items:SHORT},fix:{type:'array',maxItems:2,items:SHORT},add:{type:'array',maxItems:2,items:SHORT},risks:{type:'array',maxItems:2,items:SHORT},evidence:{type:'array',maxItems:2,items:SHORT},fatalIssues:{type:'array',maxItems:2,items:SHORT}},additionalProperties:false};
const REBUTTAL={type:'object',required:['accept','challenge','revision','reason'],properties:{accept:{type:'array',maxItems:3,items:SHORT},challenge:{type:'array',maxItems:3,items:SHORT},revision:{type:'array',maxItems:3,items:SHORT},reason:{type:'string',maxLength:500}},additionalProperties:false};
const MEETING={type:'object',required:['summary','decisions','fatalAssessment'],properties:{summary:{type:'string',maxLength:700},decisions:{type:'array',maxItems:12,items:{type:'object',required:['topic','status','reason','departments'],properties:{topic:{type:'string',maxLength:180},status:{type:'string',enum:['CONSENSUS','CONFLICT','HOLD']},reason:{type:'string',maxLength:500},departments:{type:'array',maxItems:5,items:{type:'string',enum:ROLES}}},additionalProperties:false}},fatalAssessment:{type:'object',required:['fatal','reasons','supportingDepartments','sameFatalOrEquivalentAsPrevious'],properties:{fatal:{type:'boolean'},reasons:{type:'array',maxItems:4,items:SHORT},supportingDepartments:{type:'array',maxItems:5,items:{type:'string',enum:ROLES}},sameFatalOrEquivalentAsPrevious:{type:'boolean'}},additionalProperties:false}},additionalProperties:false};

async function callModel(model,system,user,schema,{predict=1100,temperature=0.2}={}){
  let lastError=null;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,format:schema,messages:[{role:'system',content:system},{role:'user',content:`${user}\n출력은 스키마를 지킨 JSON 객체만 반환한다.`}],options:{temperature:attempt===1?temperature:0,num_ctx:8192,num_predict:Math.min(4096,predict*attempt)}})});
      if(!response.ok)throw new Error(`ollama ${response.status}:${await response.text()}`);
      const body=await response.json();const text=clean(body?.message?.content);if(!text)throw new Error('empty model response');return JSON.parse(text);
    }catch(error){lastError=error;if(attempt<3)await new Promise(resolve=>setTimeout(resolve,500*attempt));}
  }
  throw new Error(`MODEL_CALL_FAILED ${model}:${clean(lastError?.message)}`);
}

const draft=await callModel(designerModel,
  '너는 이 게임의 단일 Game Designer AI다. GAME_SEED의 유명 성공작 핵심 재미를 오마주/재해석하되 원작 표현이나 소스코드를 복제하지 않는다. 초기 제품은 Android 모바일 싱글플레이이며 시장자료는 타겟 설계 참고용이지 탈락 게이트가 아니다.',
  `GAME_SEED를 상세 게임 설계로 확장하라. 핵심루프는 행동→피드백→선택→보상이 보이게 작성한다. 레퍼런스의 이름·캐릭터·스토리·맵·아트·UI 표현을 재사용하지 않는다.\nGAME_SEED=${clip(seed)}\nPREVIOUS_STATUS=${clip(previousStatus||{},5000)}`,
  DESIGN,{predict:1500,temperature:0.25});
writeJson(path.join(base,'design-draft.json'),{version:4,gameId,date,productionClass,tierAlias,authorRole:'GAME_DESIGNER_AI',authorModel:designerModel,sourceSeed:seedPath.replaceAll('\\','/'),content:draft});

const memberReviews={};const representatives={};
for(const role of ROLES){
  const models=departmentReviewModels[role];const lead=leadModels[role];const passes=[];
  for(const model of models){
    const memberRole=model===lead?'LEAD':'ASSISTANT';
    const review=await callModel(model,
      `너는 ${role} 부서 ${memberRole} 검토 AI다. 상세설계를 공동집필하지 않는다. ${role} 책임영역에서 KEEP/FIX/ADD/RISK/EVIDENCE와 치명 문제를 독립 검토한다. 시장수치 부족 자체는 치명 문제로 판정하지 않는다.`,
      `GAME_SEED와 Game Designer 초안을 검토하라. 치명 문제는 핵심 재미 회복불가, 독자성/IP 재해석 실패, Android 싱글 상품 성립불가, 축소하면 핵심재미가 무너지는 제작규모, 다른 활성 시드와 핵심루프 중복 같은 구조 문제만 적는다.\nSEED=${clip(seed,9000)}\nDRAFT=${clip(draft,12000)}`,
      REVIEW,{predict:700});
    passes.push({model,memberRole,review});
  }
  memberReviews[role]=passes;
  representatives[role]=await callModel(lead,
    `너는 ${role} 부서 Lead AI다. 같은 부서 Lead+Assistant 검토를 통합해 부서 대표의견을 직접 작성한다. 근거 없는 치명 판정은 제거한다.`,
    `부서 내부 검토를 통합하라. 시장데이터가 없거나 약하다는 이유만으로 폐기를 주장하지 않는다.\nPASSES=${clip(passes,10000)}`,
    REVIEW,{predict:650,temperature:0.1});
}
writeJson(path.join(base,'department-reviews.json'),{version:4,gameId,date,productionClass,leadModels,reviewModels:departmentReviewModels,memberReviews,representatives});

const rebuttals={};
for(const role of ROLES){
  rebuttals[role]=await callModel(leadModels[role],
    `너는 ${role} 부서 Lead AI다. 다른 4개 부서 대표의견을 읽고 자기 전문영역에서 정확히 한 번 반박·수정한다.`,
    `다섯 부서 대표의견을 읽고 ${role} 부서 최종 반박을 작성하라.\nREPRESENTATIVES=${clip(representatives,14000)}`,
    REBUTTAL,{predict:500,temperature:0.15});
}
const meeting=await callModel(coordinatorModel,
  '너는 5부서 회의 조정 AI다. 새 설계를 창작하지 않고 다섯 Lead 대표의견과 각 Lead의 1회 반박을 CONSENSUS/CONFLICT/HOLD로 정리한다. 폐기 치명판정은 5개 부서 모두가 근거를 남긴 경우만 fatal=true로 할 수 있다. 첫 치명판정은 REDESIGN이며, 이전 REDESIGN에서 같은 또는 구조적으로 동등한 치명 문제가 재검토 후 남았을 때만 sameFatalOrEquivalentAsPrevious=true다.',
  `회의를 정리하라. supportingDepartments는 실제로 치명근거를 남긴 부서만 기록한다. 시장지표 하나만으로 fatal 판정 금지.\nREPRESENTATIVES=${clip(representatives,14000)}\nREBUTTALS=${clip(rebuttals,10000)}\nPREVIOUS_STATUS=${clip(previousStatus||{},6000)}`,
  MEETING,{predict:1100,temperature:0.1});
writeJson(path.join(base,'department-meeting.json'),{version:4,gameId,date,productionClass,leadModels,rebuttals,coordinatorModel,...meeting});

const consensus=meeting.decisions.filter(x=>x.status==='CONSENSUS');
const conflicts=meeting.decisions.filter(x=>x.status==='CONFLICT');
const holds=meeting.decisions.filter(x=>x.status==='HOLD');
const revised=await callModel(designerModel,
  '너는 최초 초안을 쓴 동일 Game Designer AI다. 5부서 회의의 CONSENSUS만 자동 반영하고 CONFLICT/HOLD는 해결된 것처럼 숨기지 않는다. GAME_SEED의 오마주/재해석 경계와 Android 모바일 싱글 타겟을 유지한다.',
  `초안을 수정하라. CONSENSUS만 자동 반영하고 CONFLICT/HOLD는 openQuestions에 남긴다.\nSEED=${clip(seed,9000)}\nDRAFT=${clip(draft,10000)}\nCONSENSUS=${clip(consensus,7000)}\nCONFLICT=${clip(conflicts,5000)}\nHOLD=${clip(holds,5000)}`,
  DESIGN,{predict:1500,temperature:0.2});
writeJson(path.join(base,'design-revised.json'),{version:4,gameId,date,productionClass,tierAlias,authorRole:'GAME_DESIGNER_AI',authorModel:designerModel,sameModelAsDraft:true,sourceSeed:seedPath.replaceAll('\\','/'),appliedConsensusCount:consensus.length,unresolvedConflictCount:conflicts.length,heldCount:holds.length,status:'DESIGN_BASELINE_CANDIDATE',content:revised});

const fatalDepartments=uniq(meeting.fatalAssessment?.supportingDepartments||[]);
const fatalConsensus=meeting.fatalAssessment?.fatal===true&&fatalDepartments.length===ROLES.length;
const previousRedesign=Boolean(previousStatus?.designHealth?.redesignRequired===true||previousStatus?.baselineGate?.state==='DESIGN_BASELINE_REDESIGN_REQUIRED');
const repeatedFatal=fatalConsensus&&previousRedesign&&meeting.fatalAssessment?.sameFatalOrEquivalentAsPrevious===true;
const lifecycleOutcome=repeatedFatal?'DISCARDED':fatalConsensus?'REDESIGN':'ACTIVE';
const modelAudit=Object.fromEntries(ROLES.map(role=>{const models=uniq(memberReviews[role].map(x=>x.model));const lead=leadModels[role];return[role,{leadModel:lead,assistantModels:models.filter(x=>x!==lead),models,count:models.length,required:reviewModelCount,pass:models.length>=reviewModelCount&&models.includes(lead),representativeModel:lead,representativeAuthoredByLead:true,rebuttalModel:lead,rebuttalAuthoredByLead:true}];}));
const status={
  version:5,gameId,date,productionClass,tierAlias,tier:tierAlias,status:'COMPLETE',state:'DESIGN_REVIEW_COMPLETE',policyDocument:'COMPANY_FLOW.md',flow:'GAME_SEED_TO_DESIGN_BASELINE',
  gameSeed:{path:seedPath.replaceAll('\\','/'),complete:true,category:seed.gameCategory,marketEvidenceRole:seed.marketEvidenceRole},
  designer:{model:designerModel,sameModelRevised:true},
  departments:{count:ROLES.length,leadModels,distinctLeadModelCount:distinctLeadModels.length,leadModelsDistinct:true,reviewModelCount,modelAudit},
  meeting:{consensusCount:consensus.length,conflictCount:conflicts.length,holdCount:holds.length,rebuttalRounds:1,fatalAssessment:meeting.fatalAssessment},
  designHealth:{fatalConsensus,repeatedFatal,redesignRequired:fatalConsensus&&!repeatedFatal,lifecycleOutcome},
  artbook:{created:false,reason:'DESIGN_BASELINE_GATE_MUST_RUN_FIRST'},
  contracts:{gameSeedFirst:true,sourceCodeOwnImplementation:true,directExpressionCopyForbidden:true,marketEvidenceTargetReferenceOnly:true,departmentsDoNotCoauthorDraft:true,artbookBeforeBaselineForbidden:true},
  updatedAt:new Date().toISOString()
};
writeJson(path.join(base,'cycle-status.json'),status);
console.log('COMPANY_DESIGN_CYCLE=COMPLETE');
console.log('DESIGN_FLOW=GAME_SEED_TO_DESIGN_BASELINE');
console.log(`DESIGN_LIFECYCLE_OUTCOME=${lifecycleOutcome}`);
console.log(`DESIGN_FATAL_CONSENSUS=${fatalConsensus?'YES':'NO'}`);
console.log('ARTBOOK_WRITTEN_BEFORE_BASELINE=NO');
