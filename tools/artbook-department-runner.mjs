// 파일명: tools/artbook-department-runner.mjs
// 역할: 유료 API 없이 로컬 Ollama 모델로 모든 게임의 5개 아트북 부서를 독립 실행한다.
// 원칙: Web 게임은 읽기 전용 근거로만 사용하고, 각 실행은 자기 부서 근거만 읽으며 다른 부서 제출물은 읽지 않는다.
import fs from 'node:fs';
import path from 'node:path';

const ROLES=['planning','graphics','development','qa','balance'];
const ROLE_NAMES={planning:'기획',graphics:'그래픽',development:'개발',qa:'QA',balance:'밸런스'};
const ROLE_SECTION_KEYS={planning:['worldEvidence','protagonistMotivationEvidence','regionCausality','storyGameplayConnection','gaps','handoffs'],graphics:['currentVisualEvidence','identityDirection','characterMonsterEnvironmentLogic','mobileReadability','assetConstraints','gaps','handoffs'],development:['implementedNow','architecture','prototypeLimits','technicalRisks','demoPlan','handoffs'],qa:['currentPlayableFlow','verifiedEvidence','problemScenes','mobileSaveErrorRisks','testScenarios','unverified','handoffs'],balance:['currentNumbers','progressionCurve','combatFeel','economyRewards','difficultyTransitions','testMeasurements','handoffs']};
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const readText=(file,max=180000)=>{try{const b=fs.readFileSync(file);return b.subarray(0,Math.min(b.length,max)).toString('utf8');}catch{return'';}};
const ensureDir=file=>fs.mkdirSync(path.dirname(file),{recursive:true});
const writeText=(file,text)=>{ensureDir(file);fs.writeFileSync(file,text);};
const writeJson=(file,value)=>writeText(file,JSON.stringify(value,null,2)+'\n');
const clean=v=>String(v??'').trim();
const safeArray=(v,max=12)=>Array.isArray(v)?v.map(clean).filter(Boolean).slice(0,max):[];
const asTextList=(v,max=6)=>Array.isArray(v)?safeArray(v,max):clean(v)?[clean(v)].slice(0,max):[];
const compactText=(v,max=500)=>{const s=clean(v);return s.length>max?s.slice(0,max-1)+'…':s;};
const role=clean(process.env.ARTBOOK_ROLE||process.argv.find(x=>x.startsWith('--role='))?.split('=')[1]);
if(!ROLES.includes(role))throw new Error(`ARTBOOK_ROLE must be one of: ${ROLES.join(',')}`);
function kstDate(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return`${g('year')}-${g('month')}-${g('day')}`;}
function listFiles(root,exts,max=24){const out=[];if(!fs.existsSync(root))return out;const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){if(out.length>=max)return;const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(exts.some(x=>e.name.toLowerCase().endsWith(x)))out.push(p.replaceAll('\\','/'));}};walk(root);return out;}
function excerpt(text,patterns,maxLines=120){const lines=String(text||'').split(/\r?\n/),indexes=new Set();for(let i=0;i<lines.length;i++)if(patterns.some(p=>p.test(lines[i]))){for(let j=Math.max(0,i-1);j<=Math.min(lines.length-1,i+2);j++)indexes.add(j);}return[...indexes].sort((a,b)=>a-b).slice(0,maxLines).map(i=>`${i+1}: ${lines[i]}`).join('\n');}
function stripUnsafeKeys(value){if(Array.isArray(value))return value.map(stripUnsafeKeys);if(!value||typeof value!=='object')return value;const out={};for(const[k,v]of Object.entries(value)){if(/score|overallscore|internalscore|productionapproval|productiondecision|formalproduction|releaseapproval/i.test(k))continue;out[k]=stripUnsafeKeys(v);}return out;}
function normalizeReadiness(value){const s=clean(value).toUpperCase();if(s.includes('BLOCK')||s.includes('부족')||s.includes('차단'))return'BLOCKED';if(s.includes('READY')&&!s.includes('NOT'))return'READY';return'NEEDS_VALIDATION';}
function normalizeCandidate(value){
  const candidate=stripUnsafeKeys(value);
  if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))return null;
  if(typeof candidate.section==='string'&&clean(candidate.section))candidate.section={summary:clean(candidate.section)};
  else if(Array.isArray(candidate.section)&&candidate.section.length)candidate.section={items:candidate.section};
  if(!candidate.section||typeof candidate.section!=='object'||Array.isArray(candidate.section)){
    const section={};
    for(const key of ROLE_SECTION_KEYS[role])if(candidate[key]!==undefined&&candidate[key]!==null&&clean(typeof candidate[key]==='object'?JSON.stringify(candidate[key]):candidate[key]))section[key]=candidate[key];
    if(!Object.keys(section).length){
      for(const key of ['summary','content','analysis','review','details','findings']){
        const value=candidate[key];if(value!==undefined&&value!==null&&clean(typeof value==='object'?JSON.stringify(value):value)){section[key]=value;break;}
      }
    }
    candidate.section=section;
  }
  const rawPlan=candidate.conceptPlan&&typeof candidate.conceptPlan==='object'&&!Array.isArray(candidate.conceptPlan)?candidate.conceptPlan:{};
  candidate.conceptPlan={
    creativeIdeas:asTextList(rawPlan.creativeIdeas??candidate.creativeIdeas,5),
    implementationPlan:asTextList(rawPlan.implementationPlan??candidate.implementationPlan,5),
    demoValidation:asTextList(rawPlan.demoValidation??candidate.demoValidation,5)
  };
  return candidate;
}
function validCandidate(candidate){
  const plan=candidate?.conceptPlan;
  return Boolean(candidate&&typeof candidate==='object'&&!Array.isArray(candidate)&&candidate.section&&typeof candidate.section==='object'&&!Array.isArray(candidate.section)&&Object.keys(candidate.section).length&&plan&&['creativeIdeas','implementationPlan','demoValidation'].every(key=>Array.isArray(plan[key])&&plan[key].length>0));
}
function xmlEscape(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&apos;'}[c]));}
function createVisualSvg({gameName,role,headline,readiness,notes}){const note=safeArray(notes,3).join(' · ');return`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#102d42"/><stop offset="1" stop-color="#245f83"/></linearGradient></defs><rect width="1200" height="675" fill="url(#g)"/><rect x="54" y="54" width="1092" height="567" rx="32" fill="#07131d" fill-opacity=".42" stroke="#90dbff" stroke-opacity=".35"/><text x="78" y="110" font-size="22" font-weight="700" fill="#90dbff">${xmlEscape(gameName)} · ${xmlEscape(ROLE_NAMES[role])} 부서</text><text x="78" y="165" font-size="34" font-weight="800" fill="#fff">${xmlEscape(compactText(headline,48))}</text><text x="78" y="215" font-size="20" fill="#aac9da">${xmlEscape(readiness)}</text><line x1="78" y1="255" x2="1120" y2="255" stroke="#90dbff" stroke-opacity=".32"/><foreignObject x="78" y="295" width="1030" height="210"><div xmlns="http://www.w3.org/1999/xhtml" style="font:24px sans-serif;color:#dcecff;line-height:1.5">${xmlEscape(note)}</div></foreignObject><text x="78" y="590" font-size="17" fill="#89aabe">근거 전용 · 타 부서 미열람 · 제작 승인 아님</text></svg>`;}

const queue=readJson('artbook-submission-queue.json',{}),gameId=clean(process.env.ARTBOOK_GAME_ID||queue.currentDailyTarget),date=clean(process.env.ARTBOOK_DATE||kstDate());
if(!gameId)throw new Error('currentDailyTarget is empty');
const workOrderPath=`artbook-work-orders/${date}-${gameId}.json`;
if(!fs.existsSync(workOrderPath)){console.log(`ARTBOOK_DEPARTMENT_SKIP=${role}:no-work-order:${workOrderPath}`);process.exit(0);}

// 이미 검증된 과거 제출은 역사적 완료본을 깨뜨리지 않도록 그대로 보존한다.
// 신규 생성/재작성 제출은 version 5 conceptPlan 계약을 따른다.
const reusableOutput=path.join('artbook-submissions',gameId,date,`${role}.json`);
const reusable=readJson(reusableOutput,null);
const reusableDepartment=clean(reusable?.department||reusable?.role);
const reusableValid=Boolean(
  reusable&&typeof reusable==='object'&&!Array.isArray(reusable)&&
  clean(reusable.gameId)===gameId&&clean(reusable.date)===date&&reusableDepartment===role&&
  clean(reusable.status).toUpperCase()==='SUBMITTED'&&
  Array.isArray(reusable.evidence)&&reusable.evidence.length>0&&
  reusable.section&&typeof reusable.section==='object'&&!Array.isArray(reusable.section)&&Object.keys(reusable.section).length>0
);
if(reusableValid){
  console.log(`ARTBOOK_BASE_REUSE=${role}:YES`);
  console.log(`ARTBOOK_DEPARTMENT_FILE=${reusableOutput}`);
  console.log('ARTBOOK_BASE_REWRITE=NO');
  process.exit(0);
}
console.log(`ARTBOOK_BASE_REUSE=${role}:NO`);

const workOrder=readJson(workOrderPath,{}),game=(queue.games||[]).find(x=>x.gameId===gameId)||{},styles=readJson('artbook-style-profiles.json',{games:{}}),style=styles.games?.[gameId]||{};
const health=readJson('public-game-health.json',{games:[]}),assetHealth=readJson('asset-health.json',{assets:[]}),gameHealth=(health.games||[]).find(x=>x.gameId===gameId)||null;
const unityRoot=`unity-games/${gameId}`,webRoot=`web-games/${gameId}`;
const unityFiles=listFiles(path.join(unityRoot,'Assets','Scripts'),['.cs'],24),webFiles=listFiles(webRoot,['.html','.js','.css','.json'],24),evidenceFiles=[...unityFiles,...webFiles];
const combined=evidenceFiles.map(f=>`\n### ${f}\n${readText(f,90000)}`).join('\n').slice(0,520000);
const sourceMode=unityFiles.length&&webFiles.length?'UNITY_PLUS_WEB_ARCHIVE':unityFiles.length?'UNITY':webFiles.length?'WEB_ARCHIVE_READ_ONLY':'METADATA_ONLY';
const patterns={planning:[/story|quest|region|dialog|npc|world|boss|ending|스토리|퀘스트|지역|대사|보스|엔딩/i],graphics:[/image|sprite|background|color|ui|canvas|character|monster|boss|asset|이미지|배경|캐릭터|몬스터|보스/i],development:[/class |function |const |let |save|load|localStorage|spawn|attack|update|onclick|touch|unity|script/i],qa:[/error|catch|save|load|touch|mobile|viewport|restart|start|game over|오류|저장|모바일|터치/i],balance:[/hp|health|damage|attack|gold|xp|level|speed|cooldown|reward|price|chance|체력|공격|골드|레벨|보상|확률/i]};
const evidenceLineLimit=role==='qa'?60:120;
const roleEvidence={sourceMode,files:evidenceFiles.slice(0,16),excerpt:excerpt(combined,patterns[role],evidenceLineLimit),health:role==='qa'||role==='development'?gameHealth:null,assets:role==='graphics'?(assetHealth.assets||[]).filter(x=>String(x.gameId||'')===gameId||String(x.path||'').includes(gameId)).slice(0,10):undefined};
const sharedEvidence={gameId,gameName:workOrder.gameName||game.name||style.name||gameId,date,styleIdentity:style.identity||game.styleProfile||workOrder.styleProfile||'',storyFocus:style.storyFocus||'',signatureSections:style.signatureSections||[],currentStage:game.currentStage||'',role:ROLE_NAMES[role],scope:workOrder.departmentTasks?.[role]?.scope||'',sourceMode,explicitRules:{webGamesReadOnly:true,productionApproval:false,noScores:true,noOtherDepartmentSubmissionReading:true,storyCausalityIsCritical:true,creativeIdeasAreProposals:true,implementationPlanRequired:true,demoValidationRequired:true}};
const roleGuides={planning:'스토리·세계관·주인공 동기·지역/퀘스트 사건 인과를 평가하고, 근거와 게임 정체성을 출발점으로 자기 범위의 창작 아이디어를 PROPOSAL로 제안한다. 제안을 구현된 사실처럼 쓰지 않는다.',graphics:'캐릭터·몬스터·보스·배경·UI·인트로의 시각 논리와 실제 근거를 평가하고, 자기 범위의 시각 창작안을 PROPOSAL로 제안한다. 에셋/애니메이션/VFX 구현 계획과 화면 비교 조건을 함께 적는다.',development:'실제 구현 범위·구조·기술 위험을 평가하고, 제안된 방향을 Unity 씬·프리팹·데이터·시스템으로 옮길 최소 구현 계획과 플레이어블 시연 구조를 작성한다.',qa:'플레이 시작→입력→전투/핵심행동→성장→저장/재실행 흐름을 평가하고, 창작안/구현안이 실제 시연에서 더 좋은지 판별할 테스트 조건을 제안한다. Web 실행상태를 게임 품질 점수로 해석하지 않는다.',balance:'실제 코드의 전투·성장·보상 수치를 평가하고, 자기 범위의 조정 아이디어를 PROPOSAL로 제안한다. 구현 가능한 조정 지점과 플레이테스트 측정 계획을 함께 적는다.'};
const systemPrompt=`/no_think\n너는 재운컴퍼니 ${ROLE_NAMES[role]} 부서의 독립 아트북 AI다. ${roleGuides[role]} 다른 부서 제출물은 볼 수 없고 대신 작성하면 안 된다. 근거 기반 사실과 창작 제안을 구분한다. 창작 제안은 conceptPlan.creativeIdeas에 넣고 구현/검증된 사실처럼 표현하지 않는다. 게임 품질 숫자점수, PASS, 출시/본개발 승인을 만들지 않는다. JSON 객체만 출력한다. 최상위 키는 반드시 headline, readiness, section, conceptPlan, unverified, visualNotes다. section은 반드시 JSON 객체이며 배열이나 문자열이면 안 된다. conceptPlan은 반드시 {creativeIdeas:[],implementationPlan:[],demoValidation:[]} 형식이고 세 배열 모두 비어 있으면 안 된다. readiness는 READY|NEEDS_VALIDATION|BLOCKED 중 하나. section은 ${ROLE_SECTION_KEYS[role].join(', ')} 중심으로 자기 부서 내용만 작성한다. 근거 원문이나 소스코드를 그대로 복사하지 말고 짧게 요약한다.`;
const userPrompt=`${sharedEvidence.gameName} ${ROLE_NAMES[role]} 부서 1차 독립 아트북 작업. sourceMode=${sourceMode}. 아래 근거를 사실 기준으로 사용하고, 자기 전문 범위의 창작 아이디어 + 구현 기본 계획 + 시연 검증 계획을 conceptPlan에 작성해. 창작 아이디어는 제안으로 명시하고 확정 사실과 섞지 마. section은 반드시 중괄호 객체로 출력해. 근거 원문을 답변에 재출력하지 마.\n${JSON.stringify({shared:sharedEvidence,roleEvidence},null,2)}`;
async function callLocalModel(model,numPredict=700,strict=false){
  const strictNote=strict?'\n출력 길이 제한: headline 80자 이하, section 각 값 160자 이하, conceptPlan 각 배열 최대 3개·각 항목 160자 이하, unverified 최대 4개, visualNotes 최대 3개. 소스코드/근거 excerpt를 절대 복사하지 마. 완결된 JSON만 반환해.':'';
  const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,format:'json',messages:[{role:'system',content:systemPrompt+strictNote},{role:'user',content:userPrompt}],options:{temperature:0.12,seed:101+ROLES.indexOf(role)*97,num_ctx:8192,num_predict:numPredict}})});
  if(!response.ok)throw new Error(`ollama ${response.status}: ${await response.text()}`);
  const packet=await response.json();
  const raw=clean(packet?.message?.content).replace(/^```json\s*/i,'').replace(/```$/,'').trim();
  return JSON.parse(raw);
}
async function generateCandidate(model){
  const attempts=role==='qa'?[620,420,300]:[820,540,340];
  let lastError=null;
  for(let i=0;i<attempts.length;i++){
    try{
      const candidate=normalizeCandidate(await callLocalModel(model,attempts[i],i>0));
      if(validCandidate(candidate))return candidate;
      lastError=new Error('invalid section/conceptPlan output');
      console.error(`ARTBOOK_SECTION_FORMAT_RETRY=${role}:attempt=${i+1}`);
    }catch(error){
      lastError=error;
      console.error(`ARTBOOK_LOCAL_MODEL_RETRY=${role}:attempt=${i+1}:${error.message}`);
    }
  }
  throw lastError||new Error(`${role}: local model output failed`);
}
const model=clean(process.env.ARTBOOK_LOCAL_MODEL||'qwen3:0.6b');
const candidate=await generateCandidate(model);
const headline=compactText(candidate.headline||`${ROLE_NAMES[role]} 부서 근거 검토`,140);let readiness=normalizeReadiness(candidate.readiness);const policyBlocks=[];if(role==='planning'&&!patterns.planning.some(p=>p.test(combined))){policyBlocks.push('현재 근거에서 정식 스토리/사건 인과가 충분히 확인되지 않음');readiness='BLOCKED';}
const unverified=[...safeArray(candidate.unverified,12),...policyBlocks].filter((v,i,a)=>a.indexOf(v)===i),visualNotes=safeArray(candidate.visualNotes,3).length?safeArray(candidate.visualNotes,3):[headline];
const outBase=path.join('artbook-submissions',gameId,date),output=path.join(outBase,`${role}.json`),visualPath=path.join(outBase,'visuals',`${role}.svg`).replaceAll('\\','/');const existing=readJson(output,null);if(existing&&existing.runner?.type!=='vibe2-local-open-model-department-bot'){console.log(`ARTBOOK_DEPARTMENT_SKIP=${role}:existing-external-submission`);process.exit(0);}
writeText(visualPath,createVisualSvg({gameName:sharedEvidence.gameName,role,headline,readiness,notes:visualNotes}));
const submission={version:5,gameId,date,department:role,status:'SUBMITTED',departmentReadiness:readiness,runner:{type:'vibe2-local-open-model-department-bot',model,localInference:true,paidApi:false,apiKeyRequired:false,independentInvocation:true,readsOtherDepartmentSubmissions:false},headline,evidence:[...evidenceFiles.slice(0,24).map(source=>({source,usage:'role-scoped-read-only-evidence'})),{source:workOrderPath,usage:'department-work-order'}],section:candidate.section,conceptPlan:candidate.conceptPlan,unverified,cuts:[{kind:role,title:headline,body:compactText(candidate.section.summary||visualNotes.join(' · '),420),image:visualPath}],verification:{evidenceOnly:true,sourceMode,webArchiveReadOnly:true,otherDepartmentSubmissionsRead:false,productionApproval:false,numericQualityScoreUsed:false,sectionOutputNormalized:true,shortJsonRetryEnabled:true,conceptPlanRequired:true,creativeIdeasAreProposals:true,implementationPlanRequired:true,demoValidationRequired:true,policyBlocks}};
writeJson(output,submission);console.log(`ARTBOOK_DEPARTMENT_SUBMITTED=${role}`);console.log(`ARTBOOK_DEPARTMENT_READINESS=${readiness}`);console.log(`ARTBOOK_SOURCE_MODE=${sourceMode}`);console.log(`ARTBOOK_DEPARTMENT_FILE=${output}`);console.log(`ARTBOOK_LOCAL_MODEL=${model}`);console.log('ARTBOOK_CONCEPT_PLAN=CREATIVE+IMPLEMENTATION+DEMO');console.log('PAID_API=NO');