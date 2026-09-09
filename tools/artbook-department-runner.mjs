// 파일명: tools/artbook-department-runner.mjs
// 역할: 유료 API 없이 로컬 Ollama 모델로 모든 게임의 5개 아트북 부서를 독립 실행한다.
// 원칙: Web 게임은 읽기 전용 근거로만 사용하고, 각 실행은 자기 부서 근거와 승인된 Vibe2 선행 초안만 읽는다.
import fs from 'node:fs';
import path from 'node:path';
import { gameplayEvidenceSnippets, REQUIRED_STAGES, stageKey } from './vibe2-artbook-story-core.mjs';

const ROLES=['planning','graphics','development','qa','balance'];
const ROLE_NAMES={planning:'기획',graphics:'그래픽',development:'개발',qa:'QA',balance:'밸런스'};
const ROLE_SECTION_KEYS={
  planning:['worldEvidence','protagonistMotivationEvidence','regionCausality','storyGameplayConnection','gaps','handoffs'],
  graphics:['currentVisualEvidence','identityDirection','characterMonsterEnvironmentLogic','mobileReadability','assetConstraints','gaps','handoffs'],
  development:['implementedNow','architecture','prototypeLimits','technicalRisks','demoPlan','handoffs'],
  qa:['currentPlayableFlow','verifiedEvidence','problemScenes','mobileSaveErrorRisks','testScenarios','unverified','handoffs'],
  balance:['currentNumbers','progressionCurve','combatFeel','economyRewards','difficultyTransitions','testMeasurements','handoffs']
};
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const readText=(file,max=180000)=>{try{const b=fs.readFileSync(file);return b.subarray(0,Math.min(b.length,max)).toString('utf8');}catch{return'';}};
const ensureDir=file=>fs.mkdirSync(path.dirname(file),{recursive:true});
const writeText=(file,text)=>{ensureDir(file);fs.writeFileSync(file,text);};
const writeJson=(file,value)=>writeText(file,JSON.stringify(value,null,2)+'\n');
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const compactText=(v,max=500)=>{const s=clean(v);return s.length>max?s.slice(0,max-1)+'…':s;};
const safeArray=(v,max=12)=>Array.isArray(v)?v.map(clean).filter(Boolean).slice(0,max):[];
const asTextList=(v,max=6)=>Array.isArray(v)?safeArray(v,max):clean(v)?[clean(v)].slice(0,max):[];
const infoKey=v=>clean(v).toLowerCase().replace(/[^a-z0-9가-힣]+/g,'');
const meaningful=(value,min=12)=>{const text=clean(value);if(text.length<min)return false;const words=text.split(/\s+/).filter(Boolean);return words.length>=2||/[가-힣]{4,}/.test(text);};
const role=clean(process.env.ARTBOOK_ROLE||process.argv.find(x=>x.startsWith('--role='))?.split('=')[1]);
if(!ROLES.includes(role))throw new Error(`ARTBOOK_ROLE must be one of: ${ROLES.join(',')}`);

function kstDate(){
  const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const g=t=>p.find(x=>x.type===t)?.value||'';
  return `${g('year')}-${g('month')}-${g('day')}`;
}
function listFiles(root,exts,max=24){
  const out=[];
  if(!fs.existsSync(root))return out;
  const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){
    if(out.length>=max)return;
    const p=path.join(d,e.name);
    if(e.isDirectory())walk(p);
    else if(exts.some(x=>e.name.toLowerCase().endsWith(x)))out.push(p.replaceAll('\\','/'));
  }};
  walk(root);
  return out;
}
function excerpt(text,patterns,maxLines=120){
  const lines=String(text||'').split(/\r?\n/),indexes=new Set();
  for(let i=0;i<lines.length;i++)if(patterns.some(p=>p.test(lines[i]))){
    for(let j=Math.max(0,i-1);j<=Math.min(lines.length-1,i+2);j++)indexes.add(j);
  }
  return [...indexes].sort((a,b)=>a-b).slice(0,maxLines).map(i=>`${i+1}: ${lines[i]}`).join('\n');
}
function stripUnsafeKeys(value){
  if(Array.isArray(value))return value.map(stripUnsafeKeys);
  if(!value||typeof value!=='object')return value;
  const out={};
  for(const[k,v]of Object.entries(value)){
    if(/score|overallscore|internalscore|productionapproval|productiondecision|formalproduction|releaseapproval/i.test(k))continue;
    out[k]=stripUnsafeKeys(v);
  }
  return out;
}
function normalizeReadiness(value){
  const s=clean(value).toUpperCase();
  if(s.includes('BLOCK')||s.includes('부족')||s.includes('차단'))return 'BLOCKED';
  if(s.includes('READY')&&!s.includes('NOT'))return 'READY';
  return 'NEEDS_VALIDATION';
}
function normalizeCandidate(value){
  const candidate=stripUnsafeKeys(value);
  if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))return null;
  if(typeof candidate.section==='string'&&clean(candidate.section))candidate.section={summary:clean(candidate.section)};
  else if(Array.isArray(candidate.section)&&candidate.section.length)candidate.section={items:candidate.section};
  if(!candidate.section||typeof candidate.section!=='object'||Array.isArray(candidate.section)){
    const section={};
    for(const key of ROLE_SECTION_KEYS[role])if(candidate[key]!==undefined&&candidate[key]!==null&&clean(typeof candidate[key]==='object'?JSON.stringify(candidate[key]):candidate[key]))section[key]=candidate[key];
    candidate.section=section;
  }
  const rawPlan=candidate.conceptPlan&&typeof candidate.conceptPlan==='object'&&!Array.isArray(candidate.conceptPlan)?candidate.conceptPlan:{};
  candidate.conceptPlan={
    creativeIdeas:asTextList(rawPlan.creativeIdeas??candidate.creativeIdeas,3),
    implementationPlan:asTextList(rawPlan.implementationPlan??candidate.implementationPlan,3),
    demoValidation:asTextList(rawPlan.demoValidation??candidate.demoValidation,3)
  };
  candidate.unverified=safeArray(candidate.unverified,4);
  candidate.visualNotes=safeArray(candidate.visualNotes,3);
  return candidate;
}
function validCandidate(candidate){
  const plan=candidate?.conceptPlan;
  return Boolean(candidate&&typeof candidate==='object'&&!Array.isArray(candidate)&&candidate.section&&typeof candidate.section==='object'&&!Array.isArray(candidate.section)&&ROLE_SECTION_KEYS[role].every(key=>clean(candidate.section[key]))&&plan&&['creativeIdeas','implementationPlan','demoValidation'].every(key=>Array.isArray(plan[key])&&plan[key].length>0));
}
export function planningInformationProblems(candidate){
  if(!candidate)return['planning-candidate-missing'];
  const section=candidate.section||{},plan=candidate.conceptPlan||{},problems=[];
  for(const key of ROLE_SECTION_KEYS.planning)if(!meaningful(section[key],12))problems.push(`${key}-too-shallow`);
  const planValues=['creativeIdeas','implementationPlan','demoValidation'].flatMap(key=>Array.isArray(plan[key])?plan[key].map(clean).filter(Boolean):[]);
  if(planValues.some(v=>!meaningful(v,12)))problems.push('concept-plan-item-too-shallow');
  const values=[...ROLE_SECTION_KEYS.planning.map(key=>clean(section[key])).filter(Boolean),...planValues];
  const keys=values.map(infoKey).filter(Boolean),unique=new Set(keys),freq=new Map();
  for(const key of keys)freq.set(key,(freq.get(key)||0)+1);
  const maxRepeat=Math.max(0,...freq.values());
  if(values.length<9||unique.size<6)problems.push('content-too-repetitive');
  if(keys.length&&maxRepeat/keys.length>=0.45)problems.push('single-phrase-dominates');
  if(clean(values.join(' ')).length<180)problems.push('information-volume-too-low');
  return [...new Set(problems)];
}
function xmlEscape(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&apos;'}[c]));}
function createVisualSvg({gameName,role,headline,readiness,notes}){
  const note=safeArray(notes,3).join(' · ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#102d42"/><stop offset="1" stop-color="#245f83"/></linearGradient></defs><rect width="1200" height="675" fill="url(#g)"/><rect x="54" y="54" width="1092" height="567" rx="32" fill="#07131d" fill-opacity=".42" stroke="#90dbff" stroke-opacity=".35"/><text x="78" y="110" font-size="22" font-weight="700" fill="#90dbff">${xmlEscape(gameName)} · ${xmlEscape(ROLE_NAMES[role])} 부서</text><text x="78" y="165" font-size="34" font-weight="800" fill="#fff">${xmlEscape(compactText(headline,48))}</text><text x="78" y="215" font-size="20" fill="#aac9da">${xmlEscape(readiness)}</text><line x1="78" y1="255" x2="1120" y2="255" stroke="#90dbff" stroke-opacity=".32"/><foreignObject x="78" y="295" width="1030" height="210"><div xmlns="http://www.w3.org/1999/xhtml" style="font:24px sans-serif;color:#dcecff;line-height:1.5">${xmlEscape(note)}</div></foreignObject><text x="78" y="590" font-size="17" fill="#89aabe">근거 전용 · 타 부서 미열람 · 제작 승인 아님</text></svg>`;
}
function compactPhase(row){
  if(!row||typeof row!=='object')return null;
  return {stage:stageKey(row.stage),region:compactText(row.region,90),quest:compactText(row.quest,120),cause:compactText(row.cause,120),playerAction:compactText(row.playerAction,120),result:compactText(row.result,120),nextHook:compactText(row.nextHook,120)};
}
function compactNpc(row){if(!row||typeof row!=='object')return null;return{name:compactText(row.name,70),goal:compactText(row.goal,110),conflict:compactText(row.conflict,110),relationshipToPlayer:compactText(row.relationshipToPlayer,110)};}
function compactBoss(row){if(!row||typeof row!=='object')return null;return{boss:compactText(row.boss,80),trigger:compactText(row.trigger,110),whyNow:compactText(row.whyNow,110),winConsequence:compactText(row.winConsequence,110)};}
function planningFallbackCandidate(rawDraft,gameName,evidenceSnippets=[]){
  const phases=(Array.isArray(rawDraft?.phasePlans)?rawDraft.phasePlans:[]).map(compactPhase).filter(Boolean);
  const byStage=new Map(phases.map(p=>[stageKey(p.stage),p]));
  const phase=stage=>byStage.get(stage)||null;
  const phaseLine=stage=>{const p=phase(stage);return p?`${stage}: ${p.cause} → ${p.playerAction} → ${p.result}`:`${stage}: 세부 인과는 기획부 검증 필요`;};
  const opening=phase('OPENING'),early=phase('EARLY'),mid=phase('MID'),late=phase('LATE'),finalBoss=phase('FINAL_BOSS'),ending=phase('ENDING');
  const actualEvidence=evidenceSnippets.slice(0,2).map(v=>compactText(v,120)).join(' / ');
  const gaps=safeArray(rawDraft?.gaps,4).join(' / ')||'NPC·세력·지역 고유명과 기존 구현의 일치 여부를 추가 확인해야 한다.';
  const creative=[mid,late,ending].filter(Boolean).map(p=>`[PROPOSAL] ${p.stage} ${p.region}: ${p.quest} — ${p.result}`).slice(0,3);
  while(creative.length<3)creative.push(`[PROPOSAL] ${gameName}의 중·후반 구간에 원인→행동→결과가 이어지는 독립 사건을 추가한다.`);
  return {
    headline:`${gameName} 6단계 진행 인과 검토`,
    readiness:'NEEDS_VALIDATION',
    section:{
      worldEvidence:actualEvidence?`현재 코드의 게임플레이 근거: ${actualEvidence}`:'현재 코드에서 세계관 고유 설정 근거가 적어 구현 사실과 새 제안을 분리해 확정해야 한다.',
      protagonistMotivationEvidence:`현재 구현에서 주인공 동기는 제한적으로 확인된다. [Vibe2 PROPOSAL] ${opening?.quest||'초기 목표'}에서 시작해 ${early?.quest||'초반 생존 목표'}로 이어진다.`,
      regionCausality:`${phaseLine('EARLY')} / ${phaseLine('MID')} / ${phaseLine('LATE')}`,
      storyGameplayConnection:`${phaseLine('FINAL_BOSS')} / ${phaseLine('ENDING')}`,
      gaps:`미확정 항목: ${gaps}`,
      handoffs:'개발부에는 6단계 stage/quest 전환 데이터화를, QA에는 OPENING→ENDING 연속 진행과 각 전환 조건 검증을 요청한다.'
    },
    conceptPlan:{
      creativeIdeas:creative,
      implementationPlan:[
        '6단계를 고정 stage ID로 두고 각 단계의 region·quest·cause·result·nextHook을 데이터로 연결한다.',
        '현재 구현된 초반 루프는 유지하고 MID 이후 신규 지역·퀘스트·보스 인과를 별도 콘텐츠 데이터로 추가한다.',
        'FINAL_BOSS 승리 결과가 ENDING과 postgame 목표를 실제로 해금하도록 진행 플래그를 연결한다.'
      ],
      demoValidation:[
        '새 게임 시작 후 OPENING 완료가 EARLY 목표를 실제로 해금하는지 플레이로 확인한다.',
        'MID→LATE 전환에서 원인 사건·플레이어 행동·결과가 UI와 실제 진행 상태에 함께 반영되는지 확인한다.',
        'FINAL_BOSS 승리 후 ENDING과 postgame 목표가 순서대로 노출되고 저장·재실행 후 유지되는지 확인한다.'
      ]
    },
    unverified:['로컬 기획 모델이 의미 품질 기준을 통과하지 못해 Vibe2 6단계 초안을 기획 검토 골격으로 사용함','NPC·세력·지역 고유명은 기존 코드 근거와 추가 대조 필요'],
    visualNotes:['6단계 전체 흐름을 한 장의 인과 화살표로 표시','현재 구현 근거와 PROPOSAL을 시각적으로 분리','최종보스 승리→엔딩→postgame 연결을 강조']
  };
}

const queue=readJson('artbook-submission-queue.json',{}),gameId=clean(process.env.ARTBOOK_GAME_ID||queue.currentDailyTarget),date=clean(process.env.ARTBOOK_DATE||kstDate());
if(!gameId)throw new Error('currentDailyTarget is empty');
const workOrderPath=`artbook-work-orders/${date}-${gameId}.json`;
if(!fs.existsSync(workOrderPath)){console.log(`ARTBOOK_DEPARTMENT_SKIP=${role}:no-work-order:${workOrderPath}`);process.exit(0);}

const reusableOutput=path.join('artbook-submissions',gameId,date,`${role}.json`);
const reusable=readJson(reusableOutput,null),reusableDepartment=clean(reusable?.department||reusable?.role);
const reusableValid=Boolean(reusable&&typeof reusable==='object'&&!Array.isArray(reusable)&&clean(reusable.gameId)===gameId&&clean(reusable.date)===date&&reusableDepartment===role&&clean(reusable.status).toUpperCase()==='SUBMITTED'&&Array.isArray(reusable.evidence)&&reusable.evidence.length>0&&reusable.section&&typeof reusable.section==='object'&&!Array.isArray(reusable.section)&&Object.keys(reusable.section).length>0&&(role!=='planning'||planningInformationProblems(reusable).length===0));
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
const evidenceLineLimit=role==='qa'?60:role==='planning'?72:120;
const planningSnippets=role==='planning'?gameplayEvidenceSnippets(combined,{max:18,radius:130}):[];
const draftPath=role==='planning'?clean(workOrder.vibe2FirstDraftPath||workOrder.departmentTasks?.planning?.vibe2FirstDraftPath):'';
const rawDraft=draftPath?readJson(draftPath,null):null;
const vibe2FirstDraft=rawDraft?{
  source:draftPath,
  proposalOnly:rawDraft.proposalOnly===true,
  generationMode:clean(rawDraft.generationMode),
  storySpine:rawDraft.storySpine||{},
  phasePlans:(Array.isArray(rawDraft.phasePlans)?rawDraft.phasePlans:[]).map(compactPhase).filter(Boolean).slice(0,6),
  regions:safeArray(rawDraft.regions,10),
  mainQuestChain:(Array.isArray(rawDraft.mainQuestChain)?rawDraft.mainQuestChain:[]).map(compactPhase).filter(Boolean).slice(0,8),
  npcMotivations:(Array.isArray(rawDraft.npcMotivations)?rawDraft.npcMotivations:[]).map(compactNpc).filter(Boolean).slice(0,6),
  bossCausality:(Array.isArray(rawDraft.bossCausality)?rawDraft.bossCausality:[]).map(compactBoss).filter(Boolean).slice(0,4),
  gaps:safeArray(rawDraft.gaps,10),
  targetArtbookPages:Number(rawDraft.targetArtbookPages||rawDraft.recommendedPages)||null
}:null;
const roleEvidence={
  sourceMode,
  files:evidenceFiles.slice(0,16),
  excerpt:role==='planning'?planningSnippets.join('\n'):excerpt(combined,patterns[role],evidenceLineLimit),
  health:role==='qa'||role==='development'?gameHealth:null,
  assets:role==='graphics'?(assetHealth.assets||[]).filter(x=>String(x.gameId||'')===gameId||String(x.path||'').includes(gameId)).slice(0,10):undefined,
  vibe2FirstDraft:role==='planning'?vibe2FirstDraft:undefined
};
const sharedEvidence={gameId,gameName:workOrder.gameName||game.name||style.name||gameId,date,styleIdentity:style.identity||game.styleProfile||workOrder.styleProfile||'',storyFocus:style.storyFocus||'',signatureSections:style.signatureSections||[],currentStage:game.currentStage||'',role:ROLE_NAMES[role],scope:workOrder.departmentTasks?.[role]?.scope||'',sourceMode,explicitRules:{webGamesReadOnly:true,productionApproval:false,noScores:true,noOtherDepartmentSubmissionReading:true,storyCausalityIsCritical:true,creativeIdeasAreProposals:true,implementationPlanRequired:true,demoValidationRequired:true,vibe2FirstDraftIsProposal:true}};
const roleGuides={
  planning:'Vibe2 1차 초안의 6단계·퀘스트·지역·보스 인과를 실제 코드 근거와 대조한다. 한 단어 반복, 장르명 반복, 빈 문구는 제출 금지다. 기존 사실은 section에, 새 내용은 [PROPOSAL]로 conceptPlan에 쓴다.',
  graphics:'캐릭터·몬스터·보스·배경·UI·인트로의 시각 논리와 실제 근거를 평가하고, 자기 범위의 시각 창작안을 PROPOSAL로 제안한다. 에셋/애니메이션/VFX 구현 계획과 화면 비교 조건을 함께 적는다.',
  development:'실제 구현 범위·구조·기술 위험을 평가하고, 제안된 방향을 Unity 씬·프리팹·데이터·시스템으로 옮길 최소 구현 계획과 플레이어블 시연 구조를 작성한다.',
  qa:'플레이 시작→입력→전투/핵심행동→성장→저장/재실행 흐름을 평가하고, 창작안/구현안이 실제 시연에서 더 좋은지 판별할 테스트 조건을 제안한다. Web 실행상태를 게임 품질 점수로 해석하지 않는다.',
  balance:'실제 코드의 전투·성장·보상 수치를 평가하고, 자기 범위의 조정 아이디어를 PROPOSAL로 제안한다. 구현 가능한 조정 지점과 플레이테스트 측정 계획을 함께 적는다.'
};
const systemPrompt=`/no_think\n너는 재운컴퍼니 ${ROLE_NAMES[role]} 부서의 독립 아트북 AI다. ${roleGuides[role]} 다른 부서 제출물은 볼 수 없고 대신 작성하면 안 된다. 근거 기반 사실과 창작 제안을 구분한다. 창작 제안은 conceptPlan.creativeIdeas에 넣고 구현/검증된 사실처럼 표현하지 않는다. 게임 품질 숫자점수, PASS, 출시/본개발 승인을 만들지 않는다. 반드시 제공된 JSON 스키마만 출력한다. section의 각 값은 40~140자, conceptPlan 각 항목은 30~140자로 작성한다. 서로 다른 필드는 서로 다른 정보를 담아야 한다. 근거 원문이나 소스코드를 복사하지 않는다.`;
const userPrompt=`${sharedEvidence.gameName} ${ROLE_NAMES[role]} 부서 1차 독립 아트북 작업. sourceMode=${sourceMode}. 자기 전문 범위의 근거 요약 + 창작 제안 + 구현 기본 계획 + 시연 검증 계획을 작성해. ${role==='planning'?'Vibe2 초안은 참고 제안이며 기존 근거와 충돌하면 수정해. OPENING→EARLY→MID→LATE→FINAL_BOSS→ENDING 각각의 원인·플레이어 행동·결과·다음 훅을 검토하고 중후반 빈 구간을 구체적으로 지적해. 장르명 한 단어만 반복하면 실패다.':''}\n${JSON.stringify({shared:sharedEvidence,roleEvidence})}`;
const sectionProperties=Object.fromEntries(ROLE_SECTION_KEYS[role].map(key=>[key,{type:'string',minLength:role==='planning'?20:1,maxLength:140}]));
const candidateSchema={
  type:'object',required:['headline','readiness','section','conceptPlan','unverified','visualNotes'],additionalProperties:false,
  properties:{
    headline:{type:'string',minLength:4,maxLength:140},readiness:{type:'string',enum:['READY','NEEDS_VALIDATION','BLOCKED']},
    section:{type:'object',required:ROLE_SECTION_KEYS[role],properties:sectionProperties,additionalProperties:false},
    conceptPlan:{type:'object',required:['creativeIdeas','implementationPlan','demoValidation'],additionalProperties:false,properties:{
      creativeIdeas:{type:'array',minItems:1,maxItems:3,items:{type:'string',minLength:role==='planning'?20:1,maxLength:140}},
      implementationPlan:{type:'array',minItems:1,maxItems:3,items:{type:'string',minLength:role==='planning'?20:1,maxLength:140}},
      demoValidation:{type:'array',minItems:1,maxItems:3,items:{type:'string',minLength:role==='planning'?20:1,maxLength:140}}
    }},
    unverified:{type:'array',maxItems:4,items:{type:'string',maxLength:140}},visualNotes:{type:'array',minItems:1,maxItems:3,items:{type:'string',maxLength:140}}
  }
};
async function callLocalModel(model,numPredict){
  const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,think:false,format:candidateSchema,messages:[{role:'system',content:systemPrompt},{role:'user',content:userPrompt}],options:{temperature:role==='planning'?0.12:0.08,seed:101+ROLES.indexOf(role)*97,num_ctx:8192,num_predict:numPredict}})});
  if(!response.ok)throw new Error(`ollama ${response.status}: ${await response.text()}`);
  const packet=await response.json(),raw=clean(packet?.message?.content).replace(/^```json\s*/i,'').replace(/```$/,'').trim();
  if(!raw)throw new Error('empty structured output');
  return JSON.parse(raw);
}
async function generateCandidate(model){
  const attempts=role==='planning'?[1050,820,650]:role==='qa'?[700,520,400]:[900,650,480];
  let lastError=null,lastPlanningProblems=[];
  for(let i=0;i<attempts.length;i++){
    try{
      const candidate=normalizeCandidate(await callLocalModel(model,attempts[i]));
      if(!validCandidate(candidate))throw new Error('invalid section/conceptPlan output');
      if(role==='planning'){
        const problems=planningInformationProblems(candidate);
        if(problems.length){lastPlanningProblems=problems;throw new Error(`planning semantic quality: ${problems.join(',')}`);}
      }
      return {candidate,modelAttempts:i+1,planningFallbackUsed:false,planningFallbackReason:null};
    }catch(error){
      lastError=error;
      console.error(`ARTBOOK_LOCAL_MODEL_RETRY=${role}:attempt=${i+1}:${error.message}`);
    }
  }
  if(role==='planning'&&rawDraft){
    const candidate=planningFallbackCandidate(rawDraft,sharedEvidence.gameName,planningSnippets);
    const problems=planningInformationProblems(candidate);
    if(problems.length)throw new Error(`planning fallback semantic quality failed: ${problems.join(',')}`);
    console.error(`ARTBOOK_PLANNING_FALLBACK=VIBE2_CAUSAL_REVIEW:${lastPlanningProblems.join(',')||clean(lastError?.message)}`);
    return {candidate,modelAttempts:attempts.length,planningFallbackUsed:true,planningFallbackReason:clean(lastError?.message||'planning model semantic quality failed')};
  }
  throw lastError||new Error(`${role}: local model output failed`);
}

const model=clean(process.env.ARTBOOK_LOCAL_MODEL||'qwen3:0.6b');
const generated=await generateCandidate(model),candidate=generated.candidate;
const headline=compactText(candidate.headline||`${ROLE_NAMES[role]} 부서 근거 검토`,140);
let readiness=normalizeReadiness(candidate.readiness);
if(generated.planningFallbackUsed)readiness='NEEDS_VALIDATION';
const policyBlocks=[];
if(role==='planning'&&!patterns.planning.some(p=>p.test(combined))){policyBlocks.push('현재 근거에서 정식 스토리/사건 인과가 충분히 확인되지 않음');readiness='BLOCKED';}
if(role==='planning'&&!vibe2FirstDraft){policyBlocks.push('Vibe2 1차 기획 초안 파일을 읽지 못함');readiness='BLOCKED';}
const unverified=[...safeArray(candidate.unverified,12),...policyBlocks].filter((v,i,a)=>a.indexOf(v)===i),visualNotes=safeArray(candidate.visualNotes,3).length?safeArray(candidate.visualNotes,3):[headline];
const outBase=path.join('artbook-submissions',gameId,date),output=path.join(outBase,`${role}.json`),visualPath=path.join(outBase,'visuals',`${role}.svg`).replaceAll('\\','/');
const existing=readJson(output,null);
if(existing&&existing.runner?.type!=='vibe2-local-open-model-department-bot'){console.log(`ARTBOOK_DEPARTMENT_SKIP=${role}:existing-external-submission`);process.exit(0);}
writeText(visualPath,createVisualSvg({gameName:sharedEvidence.gameName,role,headline,readiness,notes:visualNotes}));
const submission={
  version:6,gameId,date,department:role,status:'SUBMITTED',departmentReadiness:readiness,
  runner:{type:'vibe2-local-open-model-department-bot',model,localInference:true,paidApi:false,apiKeyRequired:false,independentInvocation:true,readsOtherDepartmentSubmissions:false,structuredOutput:true,think:false,modelAttempts:generated.modelAttempts,planningFallbackUsed:generated.planningFallbackUsed,planningFallbackReason:generated.planningFallbackReason},
  headline,
  evidence:[...evidenceFiles.slice(0,24).map(source=>({source,usage:'role-scoped-read-only-evidence'})),{source:workOrderPath,usage:'department-work-order'},...(role==='planning'&&draftPath?[{source:draftPath,usage:'vibe2-first-draft-proposal-reviewed-by-planning'}]:[])],
  section:candidate.section,conceptPlan:candidate.conceptPlan,unverified,
  cuts:[{kind:role,title:headline,body:compactText(visualNotes.join(' · '),420),image:visualPath}],
  verification:{evidenceOnly:true,sourceMode,webArchiveReadOnly:true,otherDepartmentSubmissionsRead:false,productionApproval:false,numericQualityScoreUsed:false,sectionOutputNormalized:true,structuredOutputSchema:true,thinkDisabled:true,conceptPlanRequired:true,creativeIdeasAreProposals:true,implementationPlanRequired:true,demoValidationRequired:true,vibe2FirstDraftReviewed:role==='planning'?Boolean(vibe2FirstDraft):undefined,planningSemanticQuality:role==='planning'?planningInformationProblems(candidate).length===0:undefined,planningFallbackUsed:role==='planning'?generated.planningFallbackUsed:undefined,policyBlocks}
};
writeJson(output,submission);
console.log(`ARTBOOK_DEPARTMENT_SUBMITTED=${role}`);
console.log(`ARTBOOK_DEPARTMENT_READINESS=${readiness}`);
console.log(`ARTBOOK_SOURCE_MODE=${sourceMode}`);
console.log(`ARTBOOK_DEPARTMENT_FILE=${output}`);
console.log(`ARTBOOK_LOCAL_MODEL=${model}`);
if(role==='planning'){
  console.log(`VIBE2_FIRST_DRAFT_REVIEWED=${vibe2FirstDraft?'YES':'NO'}`);
  console.log(`ARTBOOK_PLANNING_SEMANTIC_QUALITY=${planningInformationProblems(candidate).length===0?'PASS':'FAIL'}`);
  console.log(`ARTBOOK_PLANNING_FALLBACK_USED=${generated.planningFallbackUsed?'YES':'NO'}`);
}
console.log('ARTBOOK_STRUCTURED_OUTPUT=YES');
console.log('ARTBOOK_CONCEPT_PLAN=CREATIVE+IMPLEMENTATION+DEMO');
console.log('PAID_API=NO');
