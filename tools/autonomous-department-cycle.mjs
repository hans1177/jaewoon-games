// 파일명: tools/autonomous-department-cycle.mjs
// 역할: 실제 코드 후보를 만들기 전에 Vibe 공용 제작 엔진 제안과 AI 부서별 독립 검토를 실행하고 기획부가 최종 통합한다.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { planCompanyDevelopmentTask } from '../assets/vibe-company-orchestration-bridge.js';
import { selectVerifiedDepartmentLearning } from './department-learning-memory.mjs';

const MODEL=process.env.AUTONOMOUS_LOCAL_MODEL||'qwen3:0.6b';
const HOST=process.env.OLLAMA_HOST?`http://${process.env.OLLAMA_HOST}`:'http://127.0.0.1:11434';
const TIMEOUT_MS=Math.max(30000,Math.min(180000,Number(process.env.AUTONOMOUS_DEPARTMENT_TIMEOUT_MS||120000)));
const MAX_PREDICT=Math.max(180,Math.min(520,Number(process.env.AUTONOMOUS_DEPARTMENT_MAX_PREDICT||320)));
const CORE_ROLES=['planning','development','graphics','qa','balance'];
const FAST_REVIEW_ROLES=['development','qa'];
const FINAL_ROLE='planning-final';
const ROLES=[...CORE_ROLES,FINAL_ROLE];
const ROLE_AGENT={planning:'planning',development:'development',graphics:'graphics',qa:'qa',balance:'balance','planning-final':'planning'};
const ROLE_NAME={planning:'기획부',development:'개발부',graphics:'그래픽부',qa:'QA부',balance:'밸런스부','planning-final':'기획부 최종확인'};
const ROLE_TASK={
  planning:'완성 아트북과 현재 작은 목표, Vibe 실행 제안을 비교하고 이번 개발 플로어의 목적과 범위를 좁힌다.',
  development:'Vibe 실행 제안을 실제 구현 가능한 최소 변경으로 독립 검토하고 기술 위험을 지적한다.',
  graphics:'이번 변경과 Vibe 제안이 화면·UI·애니메이션·에셋 정체성에 미치는 영향을 독립 검토한다. 에셋 규칙을 우회하지 않는다.',
  qa:'이번 플로어와 Vibe 제안이 통과해야 할 재현 가능한 테스트와 실패 조건을 독립적으로 정한다.',
  balance:'난이도·보상·전투감·성장·경제가 흔들리는지 독립 검토하고 필요한 측정 항목을 정한다.',
  'planning-final':'다섯 부서의 독립 의견을 통합해 Vibe 제안의 오류·누락을 교정하고 원래 작은 목표를 벗어나지 않는 최종 실행 제약을 확정한다.',
};
const SCHEMA={type:'object',required:['decision','summary','nextAction','checks','risks'],additionalProperties:false,properties:{decision:{type:'string',enum:['PROCEED','ADJUST','BLOCK']},summary:{type:'string'},nextAction:{type:'string'},checks:{type:'array',maxItems:4,items:{type:'string'}},risks:{type:'array',maxItems:4,items:{type:'string'}}}};

const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const readText=(file,max=5000)=>{try{return fs.readFileSync(file,'utf8').slice(0,max);}catch{return'';}};
const compact=(v,max=2600)=>{const text=typeof v==='string'?v:JSON.stringify(v);return text.length>max?text.slice(0,max)+'…':text;};
const ensureDir=file=>fs.mkdirSync(path.dirname(file),{recursive:true});
const laneFor=order=>clean(order?.workLane||'FULL').toUpperCase();

function latestBook(artbooks,slug){return (artbooks?.artbooks??[]).filter(book=>book.gameId===slug).sort((a,b)=>String(b.createdAt??b.date??'').localeCompare(String(a.createdAt??a.date??'')))[0]||null;}
function bookEvidence(book){if(!book)return null;return{id:book.id??null,status:book.status??null,lifecycle:book.lifecycle??null,productionApproval:book.productionApproval??null,departmentOpinions:book.departmentOpinions??null,title:book.title??book.gameName??null};}
function bookCutCount(book){return Number(book?.cuts?.length||book?.pages?.length||book?.postprocess?.cutCount||book?.pageCount||book?.cutCount||0);}
function bookPostprocessComplete(book){return book?.postprocess?.complete===true||book?.postprocessComplete===true||book?.completedArtbook===true;}
function bookStatus(book){const status=clean(book?.status).toUpperCase();return status==='COMPLETED'||bookPostprocessComplete(book)?'COMPLETED':status;}
function targetFor(order){return clean(order?.sourcePath).startsWith('unity-games/')?'unity':'web';}
function stageFor(order,book){const state=clean(book?.lifecycle?.state||book?.lifecycleState||book?.baselineState).toUpperCase();const project=clean(order?.projectStage).toLowerCase();if(/development|release|full|system|graphics|integrated|optimization/.test(project)||['DESIGN_BASELINE','DEVELOPMENT_BASELINE','RELEASE_BASELINE'].includes(state))return 'full-development';return 'technical-architecture';}
function skippedFastResult(role,order){const now=new Date().toISOString();console.log(`DEPARTMENT_STATE=${role}:SKIPPED_FAST`);return {role,department:ROLE_NAME[role],workState:'DONE',decision:'PROCEED',summary:'FAST_LANE_NOT_REQUIRED',nextAction:clean(order?.goal)||'작은 런타임 복구 범위만 유지한다.',checks:[],risks:[],model:'none',attempt:0,startedAt:now,completedAt:now,skippedFast:true};}

export function selectVerifiedVibeLearning(companyDna={},max=6){
  const eligibleStages=new Set(['GAME_VERIFIED','MULTI_GAME_VERIFIED','COMPANY_STANDARD']);
  const stageWeight={COMPANY_STANDARD:3,MULTI_GAME_VERIFIED:2,GAME_VERIFIED:1};
  const patterns=(companyDna?.items??[]).filter(item=>item?.type==='VIBE2'&&eligibleStages.has(item?.stage)).sort((a,b)=>(stageWeight[b.stage]||0)-(stageWeight[a.stage]||0)||String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))).slice(0,max).map(item=>({patternId:item.patternId,stage:item.stage,title:item.title||item.patternId,summary:item.summary??null}));
  const antiPatterns=(companyDna?.antiPatterns??[]).filter(item=>item?.type==='VIBE2').slice(0,max).map(item=>({patternId:item.patternId,reason:item.reason,failureEvidence:item.failureEvidence??0}));
  return {source:'company-learning/company-dna.json',verifiedOnly:true,patterns,antiPatterns};
}

export function buildVibeCoreContext({order,book,companyDna={},departmentExperience={}}={}){
  if(!order?.run)throw new Error('실행 가능한 work-order가 필요함');
  const target=targetFor(order),stageId=stageFor(order,book),responsibleFiles=Array.isArray(order.responsibilityFiles)?order.responsibilityFiles:[];
  const plan=planCompanyDevelopmentTask({request:clean(order.goal),target,gameId:clean(order.gameSlug||order.gameId),responsibleFiles,knownBroken:clean(order.repairMode).toUpperCase()==='RULE_PATCH',stageId,artbook:book,artbookStatus:bookStatus(book),artbookCutCount:bookCutCount(book),artbookPostprocessComplete:bookPostprocessComplete(book),artbookRef:clean(book?.id||book?.sourcePath||book?.path)});
  const learning=selectVerifiedVibeLearning(companyDna);
  const departmentLearningByRole=Object.fromEntries(CORE_ROLES.map(role=>[role,selectVerifiedDepartmentLearning(departmentExperience,{role,gameId:order.gameId,gameSlug:order.gameSlug,sourcePath:order.sourcePath,workLane:laneFor(order)},3)]));
  const departmentLearning={source:'department-experience.json',verifiedOnly:true,authority:'past-evidence-not-current-verdict',byRole:departmentLearningByRole,totalUsed:Object.values(departmentLearningByRole).reduce((sum,rows)=>sum+rows.length,0)};
  return {version:1,engine:'VIBE2_COMPANY_CORE',source:'assets/vibe-company-orchestration-bridge.js',authority:'proposal-and-execution-contract-not-final-department-verdict',initialMaturity:'EARLY_COLLABORATIVE',target,stageId:plan?.stage?.id||stageId,routing:{mayDispatch:plan?.routing?.mayDispatch===true,mayExecute:plan?.routing?.mayExecute===true,requiresOwnerAction:plan?.routing?.requiresOwnerAction===true,completedArtbookLocked:plan?.routing?.completedArtbookLocked===true,artbookRevisionAllowed:plan?.routing?.artbookRevisionAllowed===true,conceptChangeRule:plan?.routing?.conceptChangeRule||null},qualityBar:plan?.qualityBar??null,executionQa:Array.isArray(plan?.execution?.qa)?plan.execution.qa.slice(0,16):[],learning,departmentLearning,departmentReviewRequired:true,maySelfApprove:false,verifiedLearningOnly:true};
}

function rolePrompt({role,order,book,previous,vibeCore}){
  const agent=readText(`.github/agents/${ROLE_AGENT[role]}.agent.md`);
  const collaborationRule=role===FINAL_ROLE?'다섯 부서 독립 결과를 모두 읽고 충돌을 조정한다.':'다른 부서 결과를 기다리지 않고 자기 전문영역을 독립적으로 판단한다.';
  const verifiedDepartmentLearning=role===FINAL_ROLE?vibeCore?.departmentLearning?.byRole:(vibeCore?.departmentLearning?.byRole?.[role]??[]);
  return `/no_think\n너는 재운컴퍼니 ${ROLE_NAME[role]}다. 아트북 완성 후 24시간 연속 개발의 한 플로어를 검토한다. Vibe는 회사 공용 제작 엔진이지만 아직 초기 단계라 단독 확정자가 아니다. Vibe 제안을 근거와 부서 전문성으로 검토하고 틀리거나 부족하면 ADJUST로 교정한다.\n\n부서 책임:\n${ROLE_TASK[role]}\n협업 방식: ${collaborationRule}\n\n현재 개발 작업:\n- 게임: ${order.gameName||order.gameId}\n- 경로: ${order.sourcePath}\n- 단계: ${order.projectStage}\n- 원래 작은 목표: ${order.goal}\n- 책임 파일: ${(order.responsibilityFiles||[]).join(', ')||'아직 미지정'}\n- 보호값: ${(order.protectedValues||[]).join(', ')||'save key / core loop'}\n\nVibe 공용 핵심 엔진 제안/실행계약:\n${compact(vibeCore,3000)}\n\n독립 QA를 통과한 과거 부서 경험(참고 근거이며 현재 판단 권한이 아님):\n${compact(verifiedDepartmentLearning,2600)}\n\n완성 아트북 근거:\n${compact(bookEvidence(book),2200)}\n\n부서 인계/독립 결과:\n${compact(previous,3000)}\n\n부서 규칙 발췌:\n${compact(agent,3200)}\n\n반드시 지켜라:\n1. Vibe 결과를 그대로 믿지 말고 현재 코드·아트북·부서 근거와 비교한다. 오류/누락은 ADJUST로 구체적으로 교정한다.\n2. Company DNA에서는 검증된 VIBE2 패턴만 재사용하고 anti-pattern은 반복하지 않는다. 검증된 과거 부서 경험도 현재 코드/아트북에 맞을 때만 참고하며 XP·레벨이나 과거 결론을 현재 권한으로 승격하지 않는다.\n3. 이번 한 플로어의 작은 변경만 다룬다. 전면 재작성 금지.\n4. 저장 의미·핵심 루프·완성 아트북의 큰 방향을 임의 변경하지 않는다.\n5. 출시 완료나 QA PASS를 허위로 선언하지 않는다.\n6. 다른 부서의 책임을 대신 구현하지 않는다.\n7. BLOCK은 실제 안전/정체성/검증 충돌이 있을 때만 사용한다.\n8. JSON Schema 형식만 출력한다.\n9. nextAction은 개발 워커가 그대로 참고할 수 있는 한 문장의 구체적 제약이어야 한다.\n10. summary는 결론만 한 문장으로 쓰고, checks는 검증할 조건만, risks는 아직 해결되지 않은 위험만 쓴다.\n11. 같은 사실이나 의미를 summary, nextAction, checks, risks 여러 필드에 반복하거나 표현만 바꿔 재작성하지 않는다.\n12. checks와 risks는 서로 독립적인 필수 항목만 넣는다. 없으면 빈 배열, 보통 1~2개만 쓰고 실제로 다른 고위험 근거가 있을 때만 최대 4개까지 쓴다.`;
}

async function callRole(role,ctx){
  let lastError=null;const startedAt=new Date().toISOString();console.log(`DEPARTMENT_STATE=${role}:ACTIVE`);
  for(let attempt=1;attempt<=2;attempt++){
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),TIMEOUT_MS);
    try{
      const response=await fetch(`${HOST}/api/generate`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:MODEL,prompt:rolePrompt({role,...ctx}),stream:false,think:false,format:SCHEMA,options:{temperature:0.1,num_ctx:4096,num_predict:MAX_PREDICT}}),signal:controller.signal});
      if(!response.ok)throw new Error(`Ollama ${response.status}`);
      const payload=await response.json();const value=JSON.parse(clean(payload.response));
      if(!SCHEMA.properties.decision.enum.includes(value.decision)||!clean(value.nextAction))throw new Error('department schema validation failed');
      const metrics={promptEvalCount:Number(payload.prompt_eval_count||0),evalCount:Number(payload.eval_count||0),promptEvalMs:Math.round(Number(payload.prompt_eval_duration||0)/1e6),evalMs:Math.round(Number(payload.eval_duration||0)/1e6),totalMs:Math.round(Number(payload.total_duration||0)/1e6)};
      console.log(`DEPARTMENT_MODEL_METRICS=${role}:prompt_tokens=${metrics.promptEvalCount}:output_tokens=${metrics.evalCount}:prompt_ms=${metrics.promptEvalMs}:output_ms=${metrics.evalMs}:total_ms=${metrics.totalMs}`);
      const completedAt=new Date().toISOString();console.log(`DEPARTMENT_STATE=${role}:DONE`);
      return {role,department:ROLE_NAME[role],workState:'DONE',decision:value.decision,summary:clean(value.summary),nextAction:clean(value.nextAction),checks:Array.isArray(value.checks)?value.checks.map(clean).filter(Boolean).slice(0,4):[],risks:Array.isArray(value.risks)?value.risks.map(clean).filter(Boolean).slice(0,4):[],model:MODEL,attempt,startedAt,completedAt,modelMetrics:metrics};
    }catch(error){lastError=error;if(attempt===2){console.log(`DEPARTMENT_STATE=${role}:BLOCKED`);throw new Error(`${ROLE_NAME[role]} AI 작업 실패: ${clean(error?.message||error)}`);}}finally{clearTimeout(timeout);}
  }
  throw lastError;
}

function loadInputs(){
  const order=readJson('.autonomous/work-order.json');const artbooks=readJson('game-artbooks.json',{artbooks:[]});const companyDna=readJson('company-learning/company-dna.json',{version:1,items:[],antiPatterns:[]});const departmentExperience=readJson('department-experience.json',{version:1,verifiedLearning:[]});
  if(!order?.run)throw new Error('실행 가능한 work-order가 필요함');
  const book=latestBook(artbooks,order.gameSlug);const vibeCore=buildVibeCoreContext({order,book,companyDna,departmentExperience});return {order,artbooks,companyDna,departmentExperience,book,vibeCore};
}

export async function runDepartmentRole({role,order,book,vibeCore}={}){
  if(!CORE_ROLES.includes(role))throw new Error(`독립 부서 role 오류: ${role}`);
  if(laneFor(order)==='FAST'&&!FAST_REVIEW_ROLES.includes(role))return skippedFastResult(role,order);
  return callRole(role,{order,book,vibeCore,previous:[]});
}

export function canUseDeterministicFinalization({vibeCore,results}={}){
  if(!Array.isArray(results)||results.length!==CORE_ROLES.length)return false;
  const routing=vibeCore?.routing||{};
  if(routing.mayDispatch!==true||routing.mayExecute!==true||routing.requiresOwnerAction===true)return false;
  const byRole=new Map(results.map(row=>[row?.role,row]));
  return CORE_ROLES.every(role=>{
    const row=byRole.get(role);
    return row?.workState==='DONE'&&row?.decision==='PROCEED'&&clean(row?.nextAction)&&Array.isArray(row?.risks)&&row.risks.map(clean).filter(Boolean).length===0;
  });
}

export function buildDeterministicFinalization(results=[]){
  const now=new Date().toISOString();
  const actions=[...new Set(results.map(row=>clean(row?.nextAction)).filter(Boolean))];
  const checks=[...new Set(results.flatMap(row=>Array.isArray(row?.checks)?row.checks:[]).map(clean).filter(Boolean))].slice(0,4);
  return {role:FINAL_ROLE,department:ROLE_NAME[FINAL_ROLE],workState:'DONE',decision:'PROCEED',summary:'5개 독립 부서가 모두 PROCEED이고 위험 보고가 없어 추가 AI 재판단 없이 합의 제약을 통합했다.',nextAction:actions.join(' / ').slice(0,1600),checks,risks:[],model:'deterministic-department-consensus',attempt:0,startedAt:now,completedAt:now,integrationMode:'DETERMINISTIC_SAFE_CONSENSUS'};
}

function buildCycle({order,vibeCore,results,final}){
  if(final.decision==='BLOCK')throw new Error(`기획부 최종확인 BLOCK: ${final.summary||final.nextAction}`);
  const all=[...results,final];const originalGoal=clean(order.goal),constraint=clean(final.nextAction),qualityTier=vibeCore.qualityBar?.tier?`T${vibeCore.qualityBar.tier}`:'현재 품질바';
  const finalGoal=`${originalGoal} Vibe 공용 실행계약(${vibeCore.stageId}, ${qualityTier})을 따르되 AI 부서 교정이 우선한다. 부서 사이클 최종 제약: ${constraint}`.slice(0,2200);
  const adjustments=all.filter(row=>row.decision==='ADJUST').map(row=>({role:row.role,summary:row.summary,nextAction:row.nextAction}));
  const fast=laneFor(order)==='FAST';
  return {version:3,gameId:order.gameId,gameSlug:order.gameSlug,candidateId:process.env.AUTONOMOUS_CANDIDATE_ID||order.candidateId||null,sourcePath:order.sourcePath,workLane:fast?'FAST':'FULL',sequence:ROLES,parallelDepartments:CORE_ROLES,activeReviewRoles:fast?FAST_REVIEW_ROLES:CORE_ROLES,finalIntegrator:fast?'deterministic-fast-integrator':FINAL_ROLE,allDepartmentsWorked:!fast,paidApi:false,localModel:MODEL,originalGoal,finalGoal,finalDecision:final.decision,vibeCore,collaboration:{mode:fast?'FAST_DEV_QA_REVIEW_THEN_DETERMINISTIC_INTEGRATION':'VIBE_PROPOSES_PARALLEL_AI_DEPARTMENTS_REVIEW_THEN_PLANNING_INTEGRATES',finalIntegrationMode:final.integrationMode||(fast?'DETERMINISTIC_FAST_LANE':'PLANNING_AI'),vibeProposalReviewedBy:fast?FAST_REVIEW_ROLES:ROLES,departmentAdjustmentCount:adjustments.length,departmentAdjustments:adjustments,verifiedLearningUsed:vibeCore.learning.patterns.length,antiPatternsUsed:vibeCore.learning.antiPatterns.length,verifiedDepartmentLearningUsed:vibeCore.departmentLearning?.totalUsed||0,learningWriteAuthority:'independent-qa-verified-outcome-only',vibeMaySelfApprove:false,vibeMayOverrideDepartments:false,sourceWriteConcurrency:'SERIAL_AFTER_PARALLEL_REVIEW'},results:all,completedAt:new Date().toISOString()};
}

function deterministicFastFinal(order,results){
  const active=results.filter(row=>FAST_REVIEW_ROLES.includes(row.role));
  const blocked=active.find(row=>row.decision==='BLOCK');
  if(blocked)return {role:FINAL_ROLE,department:'FAST 결정론적 통합',workState:'DONE',decision:'BLOCK',summary:`${blocked.role}: ${blocked.summary}`,nextAction:blocked.nextAction,checks:blocked.checks||[],risks:blocked.risks||[],model:'none',attempt:0,startedAt:new Date().toISOString(),completedAt:new Date().toISOString(),deterministicFast:true,integrationMode:'DETERMINISTIC_FAST_LANE'};
  const adjusted=active.filter(row=>row.decision==='ADJUST');
  const dev=active.find(row=>row.role==='development'),qa=active.find(row=>row.role==='qa');
  const qaChecks=(qa?.checks||[]).slice(0,2).join(' / ');
  const nextAction=[dev?.nextAction,qaChecks?`QA 확인: ${qaChecks}`:qa?.nextAction].map(clean).filter(Boolean).join(' ').slice(0,1000)||clean(order.goal);
  const now=new Date().toISOString();
  return {role:FINAL_ROLE,department:'FAST 결정론적 통합',workState:'DONE',decision:adjusted.length?'ADJUST':'PROCEED',summary:'FAST 복구는 개발부 수정 제약과 QA 재현 조건만 결합한다.',nextAction,checks:(qa?.checks||[]).slice(0,4),risks:[...(dev?.risks||[]),...(qa?.risks||[])].slice(0,4),model:'none',attempt:0,startedAt:now,completedAt:now,deterministicFast:true,integrationMode:'DETERMINISTIC_FAST_LANE'};
}

export async function finalizeDepartmentCycle({order,book,vibeCore,results}={}){
  if(!Array.isArray(results)||results.length!==CORE_ROLES.length)throw new Error('5개 독립 부서 결과가 모두 필요함');
  const byRole=new Map(results.map(row=>[row.role,row]));for(const role of CORE_ROLES)if(!byRole.has(role)||byRole.get(role)?.workState!=='DONE')throw new Error(`${role} 결과 미완료`);
  const ordered=CORE_ROLES.map(role=>byRole.get(role));
  const fast=laneFor(order)==='FAST';
  const deterministic=!fast&&canUseDeterministicFinalization({vibeCore,results:ordered});
  const final=fast?deterministicFastFinal(order,ordered):deterministic?buildDeterministicFinalization(ordered):await callRole(FINAL_ROLE,{order,book,vibeCore,previous:ordered});
  console.log(`PLANNING_FINAL_MODE=${final.integrationMode||(fast?'DETERMINISTIC_FAST_LANE':'PLANNING_AI')}`);
  return buildCycle({order,vibeCore,results:ordered,final});
}

export async function runDepartmentCycle({order,artbooks,companyDna={},departmentExperience={}}={}){
  if(!order?.run)throw new Error('실행 가능한 work-order가 필요함');
  const book=latestBook(artbooks,order.gameSlug);const vibeCore=buildVibeCoreContext({order,book,companyDna,departmentExperience});const results=await Promise.all(CORE_ROLES.map(role=>runDepartmentRole({role,order,book,vibeCore})));return finalizeDepartmentCycle({order,book,vibeCore,results});
}

function writeJson(file,value){ensureDir(file);fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
function applyCycleEnv(cycle){if(!process.env.GITHUB_ENV)return;fs.appendFileSync(process.env.GITHUB_ENV,`AUTONOMOUS_GOAL<<JAEWOON_DEPARTMENT_GOAL\n${cycle.finalGoal.replaceAll('\r',' ')}\nJAEWOON_DEPARTMENT_GOAL\n`);fs.appendFileSync(process.env.GITHUB_ENV,'AUTONOMOUS_DEPARTMENT_CYCLE=PASS\n');fs.appendFileSync(process.env.GITHUB_ENV,'AUTONOMOUS_VIBE_CORE=COLLABORATIVE\n');}

async function main(){
  const {order,book,vibeCore}=loadInputs();const role=clean(process.env.AUTONOMOUS_DEPARTMENT_ROLE);const finalize=clean(process.env.AUTONOMOUS_DEPARTMENT_FINALIZE).toLowerCase()==='true';
  if(role){
    const result=await runDepartmentRole({role,order,book,vibeCore});const output=process.env.AUTONOMOUS_DEPARTMENT_OUTPUT||`.autonomous/department-results/${process.env.AUTONOMOUS_CANDIDATE_ID||order.gameId}/${role}.json`;
    writeJson(output,{version:1,gameId:order.gameId,gameSlug:order.gameSlug,candidateId:process.env.AUTONOMOUS_CANDIDATE_ID||null,role,workState:'DONE',vibeCore,result});console.log(JSON.stringify({gameId:order.gameId,role,workState:'DONE',decision:result.decision,skippedFast:result.skippedFast===true,output}));return;
  }
  if(finalize){
    const dir=process.env.AUTONOMOUS_DEPARTMENT_RESULTS_DIR||'.autonomous/department-results';const packages=CORE_ROLES.map(role=>readJson(path.join(dir,`${role}.json`))).filter(Boolean);if(packages.length!==CORE_ROLES.length)throw new Error(`부서 결과 ${packages.length}/5`);
    const cycle=await finalizeDepartmentCycle({order,book,vibeCore,results:packages.map(item=>item.result)});const output=process.env.AUTONOMOUS_DEPARTMENT_CYCLE_OUTPUT||'/tmp/autonomous-department-cycle.json';writeJson(output,cycle);applyCycleEnv(cycle);console.log(JSON.stringify({gameId:cycle.gameId,vibeCore:cycle.vibeCore.engine,parallelDepartments:cycle.parallelDepartments,activeReviewRoles:cycle.activeReviewRoles,workLane:cycle.workLane,allDepartmentsWorked:cycle.allDepartmentsWorked,finalDecision:cycle.finalDecision,finalIntegrationMode:cycle.collaboration.finalIntegrationMode,departmentAdjustmentCount:cycle.collaboration.departmentAdjustmentCount,verifiedDepartmentLearningUsed:cycle.collaboration.verifiedDepartmentLearningUsed,output}));return;
  }
  const artbooks=readJson('game-artbooks.json',{artbooks:[]});const companyDna=readJson('company-learning/company-dna.json',{version:1,items:[],antiPatterns:[]});const departmentExperience=readJson('department-experience.json',{version:1,verifiedLearning:[]});const cycle=await runDepartmentCycle({order,artbooks,companyDna,departmentExperience});writeJson('/tmp/autonomous-department-cycle.json',cycle);applyCycleEnv(cycle);console.log(JSON.stringify({gameId:cycle.gameId,vibeCore:cycle.vibeCore.engine,parallelDepartments:cycle.parallelDepartments,activeReviewRoles:cycle.activeReviewRoles,workLane:cycle.workLane,allDepartmentsWorked:cycle.allDepartmentsWorked,finalDecision:cycle.finalDecision,finalIntegrationMode:cycle.collaboration.finalIntegrationMode,departmentAdjustmentCount:cycle.collaboration.departmentAdjustmentCount,verifiedDepartmentLearningUsed:cycle.collaboration.verifiedDepartmentLearningUsed}));
}

const isMain=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(isMain)main().catch(error=>{console.error(error?.stack||error);process.exit(1);});
