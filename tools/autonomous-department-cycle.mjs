// 파일명: tools/autonomous-department-cycle.mjs
// 역할: 실제 코드 후보를 만들기 전에 Vibe 공용 제작 엔진 제안 → AI 기획→개발→그래픽→QA→밸런스→기획확인 협업 순환을 실행한다.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { planCompanyDevelopmentTask } from '../assets/vibe-company-orchestration-bridge.js';

const MODEL=process.env.AUTONOMOUS_LOCAL_MODEL||'qwen3:0.6b';
const HOST=process.env.OLLAMA_HOST?`http://${process.env.OLLAMA_HOST}`:'http://127.0.0.1:11434';
const TIMEOUT_MS=Math.max(30000,Math.min(180000,Number(process.env.AUTONOMOUS_DEPARTMENT_TIMEOUT_MS||120000)));
const MAX_PREDICT=Math.max(180,Math.min(520,Number(process.env.AUTONOMOUS_DEPARTMENT_MAX_PREDICT||320)));
const ROLES=['planning','development','graphics','qa','balance','planning-final'];
const ROLE_AGENT={planning:'planning',development:'development',graphics:'graphics',qa:'qa',balance:'balance','planning-final':'planning'};
const ROLE_NAME={planning:'기획부',development:'개발부',graphics:'그래픽부',qa:'QA부',balance:'밸런스부','planning-final':'기획부 최종확인'};
const ROLE_TASK={
  planning:'완성 아트북과 현재 작은 목표, Vibe 실행 제안을 비교하고 이번 개발 플로어의 목적과 범위를 좁힌다.',
  development:'기획 범위와 Vibe 실행 제안을 실제 구현 가능한 최소 변경으로 검토하고 기술 위험을 지적한다.',
  graphics:'이번 변경과 Vibe 제안이 화면·UI·애니메이션·에셋 정체성에 미치는 영향을 검토한다. 에셋 규칙을 우회하지 않는다.',
  qa:'이번 플로어와 Vibe 제안이 통과해야 할 재현 가능한 테스트와 실패 조건을 정한다.',
  balance:'난이도·보상·전투감·성장·경제가 흔들리는지 검토하고 필요한 측정 항목을 정한다.',
  'planning-final':'앞선 부서 의견으로 Vibe 제안의 오류·누락을 교정하고 원래 작은 목표를 벗어나지 않는 최종 실행 제약을 확정한다.',
};
const SCHEMA={
  type:'object',
  required:['decision','summary','nextAction','checks','risks'],
  additionalProperties:false,
  properties:{
    decision:{type:'string',enum:['PROCEED','ADJUST','BLOCK']},
    summary:{type:'string'},
    nextAction:{type:'string'},
    checks:{type:'array',maxItems:4,items:{type:'string'}},
    risks:{type:'array',maxItems:4,items:{type:'string'}},
  },
};

const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const readText=(file,max=5000)=>{try{return fs.readFileSync(file,'utf8').slice(0,max);}catch{return'';}};
const compact=(v,max=2600)=>{const text=typeof v==='string'?v:JSON.stringify(v);return text.length>max?text.slice(0,max)+'…':text;};

function latestBook(artbooks,slug){
  return (artbooks?.artbooks??[]).filter(book=>book.gameId===slug).sort((a,b)=>String(b.createdAt??b.date??'').localeCompare(String(a.createdAt??a.date??'')))[0]||null;
}
function bookEvidence(book){
  if(!book)return null;
  return {
    id:book.id??null,
    status:book.status??null,
    lifecycle:book.lifecycle??null,
    productionApproval:book.productionApproval??null,
    departmentOpinions:book.departmentOpinions??null,
    title:book.title??book.gameName??null,
  };
}
function bookCutCount(book){return Number(book?.cuts?.length||book?.pages?.length||book?.postprocess?.cutCount||book?.pageCount||book?.cutCount||0);}
function bookPostprocessComplete(book){return book?.postprocess?.complete===true||book?.postprocessComplete===true||book?.completedArtbook===true;}
function bookStatus(book){const status=clean(book?.status).toUpperCase();return status==='COMPLETED'||bookPostprocessComplete(book)?'COMPLETED':status;}
function targetFor(order){return clean(order?.sourcePath).startsWith('unity-games/')?'unity':'web';}
function stageFor(order,book){
  const state=clean(book?.lifecycle?.state||book?.lifecycleState||book?.baselineState).toUpperCase();
  const project=clean(order?.projectStage).toLowerCase();
  if(/development|release|full|system|graphics|integrated|optimization/.test(project)||['DESIGN_BASELINE','DEVELOPMENT_BASELINE','RELEASE_BASELINE'].includes(state))return 'full-development';
  return 'technical-architecture';
}

export function selectVerifiedVibeLearning(companyDna={},max=6){
  const eligibleStages=new Set(['GAME_VERIFIED','MULTI_GAME_VERIFIED','COMPANY_STANDARD']);
  const stageWeight={COMPANY_STANDARD:3,MULTI_GAME_VERIFIED:2,GAME_VERIFIED:1};
  const patterns=(companyDna?.items??[])
    .filter(item=>item?.type==='VIBE2'&&eligibleStages.has(item?.stage))
    .sort((a,b)=>(stageWeight[b.stage]||0)-(stageWeight[a.stage]||0)||String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))
    .slice(0,max)
    .map(item=>({patternId:item.patternId,stage:item.stage,title:item.title||item.patternId,summary:item.summary??null}));
  const antiPatterns=(companyDna?.antiPatterns??[])
    .filter(item=>item?.type==='VIBE2')
    .slice(0,max)
    .map(item=>({patternId:item.patternId,reason:item.reason,failureEvidence:item.failureEvidence??0}));
  return {source:'company-learning/company-dna.json',verifiedOnly:true,patterns,antiPatterns};
}

export function buildVibeCoreContext({order,book,companyDna={}}={}){
  if(!order?.run)throw new Error('실행 가능한 work-order가 필요함');
  const target=targetFor(order),stageId=stageFor(order,book),responsibleFiles=Array.isArray(order.responsibilityFiles)?order.responsibilityFiles:[];
  const plan=planCompanyDevelopmentTask({
    request:clean(order.goal),target,gameId:clean(order.gameSlug||order.gameId),responsibleFiles,
    knownBroken:clean(order.repairMode).toUpperCase()==='RULE_PATCH',stageId,
    artbook:book,artbookStatus:bookStatus(book),artbookCutCount:bookCutCount(book),
    artbookPostprocessComplete:bookPostprocessComplete(book),artbookRef:clean(book?.id||book?.sourcePath||book?.path),
  });
  const learning=selectVerifiedVibeLearning(companyDna);
  return {
    version:1,engine:'VIBE2_COMPANY_CORE',source:'assets/vibe-company-orchestration-bridge.js',
    authority:'proposal-and-execution-contract-not-final-department-verdict',initialMaturity:'EARLY_COLLABORATIVE',
    target,stageId:plan?.stage?.id||stageId,
    routing:{mayDispatch:plan?.routing?.mayDispatch===true,mayExecute:plan?.routing?.mayExecute===true,requiresOwnerAction:plan?.routing?.requiresOwnerAction===true,completedArtbookLocked:plan?.routing?.completedArtbookLocked===true,artbookRevisionAllowed:plan?.routing?.artbookRevisionAllowed===true,conceptChangeRule:plan?.routing?.conceptChangeRule||null},
    qualityBar:plan?.qualityBar??null,executionQa:Array.isArray(plan?.execution?.qa)?plan.execution.qa.slice(0,16):[],learning,
    departmentReviewRequired:true,maySelfApprove:false,verifiedLearningOnly:true,
  };
}

function rolePrompt({role,order,book,previous,vibeCore}){
  const agent=readText(`.github/agents/${ROLE_AGENT[role]}.agent.md`);
  return `/no_think\n너는 재운컴퍼니 ${ROLE_NAME[role]}다. 아트북 완성 후 24시간 연속 개발의 한 플로어를 검토한다. Vibe는 회사 공용 제작 엔진이지만 아직 초기 단계라 단독 확정자가 아니다. Vibe 제안을 근거와 부서 전문성으로 검토하고 틀리거나 부족하면 ADJUST로 교정한다.\n\n부서 책임:\n${ROLE_TASK[role]}\n\n현재 개발 작업:\n- 게임: ${order.gameName||order.gameId}\n- 경로: ${order.sourcePath}\n- 단계: ${order.projectStage}\n- 원래 작은 목표: ${order.goal}\n- 책임 파일: ${(order.responsibilityFiles||[]).join(', ')||'아직 미지정'}\n- 보호값: ${(order.protectedValues||[]).join(', ')||'save key / core loop'}\n\nVibe 공용 핵심 엔진 제안/실행계약:\n${compact(vibeCore,3000)}\n\n완성 아트북 근거:\n${compact(bookEvidence(book),2200)}\n\n앞선 부서 인계:\n${compact(previous,2400)}\n\n부서 규칙 발췌:\n${compact(agent,3200)}\n\n반드시 지켜라:\n1. Vibe 결과를 그대로 믿지 말고 현재 코드·아트북·부서 근거와 비교한다. 오류/누락은 ADJUST로 구체적으로 교정한다.\n2. Company DNA에서는 검증된 VIBE2 패턴만 재사용하고 anti-pattern은 반복하지 않는다.\n3. 이번 한 플로어의 작은 변경만 다룬다. 전면 재작성 금지.\n4. 저장 의미·핵심 루프·완성 아트북의 큰 방향을 임의 변경하지 않는다.\n5. 출시 완료나 QA PASS를 허위로 선언하지 않는다.\n6. 다른 부서의 책임을 대신 구현하지 말고 검토·인계만 한다.\n7. BLOCK은 실제 안전/정체성/검증 충돌이 있을 때만 사용한다.\n8. JSON Schema 형식만 출력한다.\n9. nextAction은 개발 워커가 그대로 참고할 수 있는 한 문장의 구체적 제약이어야 한다.`;
}
async function callRole(role,ctx){
  let lastError=null;
  for(let attempt=1;attempt<=2;attempt++){
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),TIMEOUT_MS);
    try{
      const response=await fetch(`${HOST}/api/generate`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:MODEL,prompt:rolePrompt({role,...ctx}),stream:false,think:false,format:SCHEMA,options:{temperature:0.1,num_ctx:4096,num_predict:MAX_PREDICT}}),signal:controller.signal});
      if(!response.ok)throw new Error(`Ollama ${response.status}`);
      const payload=await response.json();const value=JSON.parse(clean(payload.response));
      if(!SCHEMA.properties.decision.enum.includes(value.decision)||!clean(value.nextAction))throw new Error('department schema validation failed');
      return {role,department:ROLE_NAME[role],decision:value.decision,summary:clean(value.summary),nextAction:clean(value.nextAction),checks:Array.isArray(value.checks)?value.checks.map(clean).filter(Boolean).slice(0,4):[],risks:Array.isArray(value.risks)?value.risks.map(clean).filter(Boolean).slice(0,4):[],model:MODEL,attempt};
    }catch(error){lastError=error;if(attempt===2)throw new Error(`${ROLE_NAME[role]} AI 작업 실패: ${clean(error?.message||error)}`);}finally{clearTimeout(timeout);}
  }
  throw lastError;
}

export async function runDepartmentCycle({order,artbooks,companyDna={}}={}){
  if(!order?.run)throw new Error('실행 가능한 work-order가 필요함');
  const book=latestBook(artbooks,order.gameSlug);const vibeCore=buildVibeCoreContext({order,book,companyDna});const results=[];
  for(const role of ROLES){const result=await callRole(role,{order,book,vibeCore,previous:results});results.push(result);}
  const final=results.at(-1);if(final.decision==='BLOCK')throw new Error(`기획부 최종확인 BLOCK: ${final.summary||final.nextAction}`);
  const original=clean(order.goal),constraint=clean(final.nextAction),qualityTier=vibeCore.qualityBar?.tier?`T${vibeCore.qualityBar.tier}`:'현재 품질바';
  const finalGoal=`${original} Vibe 공용 실행계약(${vibeCore.stageId}, ${qualityTier})을 따르되 AI 부서 교정이 우선한다. 부서 사이클 최종 제약: ${constraint}`.slice(0,2200);
  const adjustments=results.filter(row=>row.decision==='ADJUST').map(row=>({role:row.role,summary:row.summary,nextAction:row.nextAction}));
  return {version:2,gameId:order.gameId,gameSlug:order.gameSlug,candidateId:process.env.AUTONOMOUS_CANDIDATE_ID||order.candidateId||null,sourcePath:order.sourcePath,sequence:ROLES,allDepartmentsWorked:true,paidApi:false,localModel:MODEL,originalGoal,finalGoal,finalDecision:final.decision,vibeCore,collaboration:{mode:'VIBE_PROPOSES_AI_DEPARTMENTS_REVIEW_AND_CORRECT',vibeProposalReviewedBy:ROLES,departmentAdjustmentCount:adjustments.length,departmentAdjustments:adjustments,verifiedLearningUsed:vibeCore.learning.patterns.length,antiPatternsUsed:vibeCore.learning.antiPatterns.length,learningWriteAuthority:'independent-qa-verified-outcome-only',vibeMaySelfApprove:false,vibeMayOverrideDepartments:false},results,completedAt:new Date().toISOString()};
}

async function main(){
  const order=readJson('.autonomous/work-order.json');const artbooks=readJson('game-artbooks.json',{artbooks:[]});const companyDna=readJson('company-learning/company-dna.json',{version:1,items:[],antiPatterns:[]});
  const cycle=await runDepartmentCycle({order,artbooks,companyDna});fs.writeFileSync('/tmp/autonomous-department-cycle.json',JSON.stringify(cycle,null,2)+'\n');
  if(process.env.GITHUB_ENV){fs.appendFileSync(process.env.GITHUB_ENV,`AUTONOMOUS_GOAL<<JAEWOON_DEPARTMENT_GOAL\n${cycle.finalGoal.replaceAll('\r',' ')}\nJAEWOON_DEPARTMENT_GOAL\n`);fs.appendFileSync(process.env.GITHUB_ENV,'AUTONOMOUS_DEPARTMENT_CYCLE=PASS\n');fs.appendFileSync(process.env.GITHUB_ENV,'AUTONOMOUS_VIBE_CORE=COLLABORATIVE\n');}
  console.log(JSON.stringify({gameId:cycle.gameId,vibeCore:cycle.vibeCore.engine,sequence:cycle.sequence,allDepartmentsWorked:cycle.allDepartmentsWorked,departmentAdjustments:cycle.collaboration.departmentAdjustmentCount,verifiedLearningUsed:cycle.collaboration.verifiedLearningUsed,finalDecision:cycle.finalDecision,finalGoal:cycle.finalGoal},null,2));
}

if(import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});