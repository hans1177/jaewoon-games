// 파일명: tools/artbook-department-runner.mjs
// 역할: 유료 API 없이 로컬 Ollama 모델로 아트북 5개 부서를 독립 실행한다.
// 원칙: 각 실행은 자기 부서 근거만 읽고 다른 부서 제출물은 절대 읽지 않는다.
import fs from 'node:fs';
import path from 'node:path';

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
const readText=file=>{try{return fs.readFileSync(file,'utf8');}catch{return'';}};
const ensureDir=file=>fs.mkdirSync(path.dirname(file),{recursive:true});
const writeText=(file,text)=>{ensureDir(file);fs.writeFileSync(file,text);};
const writeJson=(file,value)=>writeText(file,JSON.stringify(value,null,2)+'\n');
const clean=v=>String(v??'').trim();
const role=clean(process.env.ARTBOOK_ROLE||process.argv.find(x=>x.startsWith('--role='))?.split('=')[1]);
if(!ROLES.includes(role))throw new Error(`ARTBOOK_ROLE must be one of: ${ROLES.join(',')}`);

function kstDate(){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const get=t=>parts.find(p=>p.type===t)?.value||'';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function excerpt(text,patterns,maxLines=120){
  const lines=String(text||'').split(/\r?\n/),indexes=new Set();
  for(let i=0;i<lines.length;i++){
    if(patterns.some(p=>typeof p==='string'?lines[i].includes(p):p.test(lines[i]))){
      for(let j=Math.max(0,i-1);j<=Math.min(lines.length-1,i+2);j++)indexes.add(j);
    }
  }
  return [...indexes].sort((a,b)=>a-b).slice(0,maxLines).map(i=>`${i+1}: ${lines[i]}`).join('\n');
}
function safeArray(v,max=12){return Array.isArray(v)?v.map(clean).filter(Boolean).slice(0,max):[];}
function compactText(v,max=500){const s=clean(v);return s.length>max?s.slice(0,max-1)+'…':s;}
function stripUnsafeKeys(value){
  if(Array.isArray(value))return value.map(stripUnsafeKeys);
  if(!value||typeof value!=='object')return value;
  const out={};
  for(const [k,v] of Object.entries(value)){
    if(/score|overallscore|internalscore|productionapproval|productiondecision|formalproduction|releaseapproval/i.test(k))continue;
    out[k]=stripUnsafeKeys(v);
  }
  return out;
}
function normalizeReadiness(value){
  const s=clean(value).toUpperCase();
  if(s.includes('BLOCK')||s.includes('부족')||s.includes('차단'))return'BLOCKED';
  if(s.includes('READY')&&!s.includes('NOT'))return'READY';
  return'NEEDS_VALIDATION';
}
function xmlEscape(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
function wrap(v,width=34,maxLines=3){
  const raw=clean(v);if(!raw)return[];
  const out=[];let line='';
  for(const token of raw.split(/\s+/)){
    if((line+' '+token).trim().length>width&&line){out.push(line);line=token;}else line=(line+' '+token).trim();
    if(out.length>=maxLines)break;
  }
  if(out.length<maxLines&&line)out.push(line);
  return out.slice(0,maxLines);
}
function createVisualSvg({gameName,role,headline,readiness,notes}){
  const labels=safeArray(notes,3);
  const roleName=ROLE_NAMES[role];
  const titleLines=wrap(headline,30,2);
  const noteLines=labels.flatMap((x,i)=>wrap(`${i+1}. ${x}`,38,2));
  const noteSvg=noteLines.map((x,i)=>`<text x="78" y="${315+i*38}" font-size="22" fill="#dcecff">${xmlEscape(x)}</text>`).join('');
  const titleSvg=titleLines.map((x,i)=>`<text x="78" y="${175+i*42}" font-size="32" font-weight="800" fill="#ffffff">${xmlEscape(x)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#102d42"/><stop offset="1" stop-color="#245f83"/></linearGradient></defs><rect width="1200" height="675" fill="url(#g)"/><rect x="54" y="54" width="1092" height="567" rx="32" fill="#07131d" fill-opacity=".42" stroke="#90dbff" stroke-opacity=".35"/><text x="78" y="105" font-size="20" font-weight="700" fill="#90dbff">${xmlEscape(gameName)} · ${xmlEscape(roleName)} 부서 독립 검토</text><text x="78" y="143" font-size="18" fill="#aac9da">VIBE2 LOCAL OPEN MODEL · ${xmlEscape(readiness)}</text>${titleSvg}<line x1="78" y1="270" x2="1120" y2="270" stroke="#90dbff" stroke-opacity=".32"/>${noteSvg}<text x="78" y="590" font-size="17" fill="#89aabe">검증 근거만 사용 · 다른 부서 제출물 미열람 · 제작 승인 아님</text></svg>`;
}

const queue=readJson('artbook-submission-queue.json',{});
const gameId=clean(process.env.ARTBOOK_GAME_ID||queue.currentDailyTarget);
const date=clean(process.env.ARTBOOK_DATE||kstDate());
if(!gameId)throw new Error('currentDailyTarget is empty');
const workOrderPath=`artbook-work-orders/${date}-${gameId}.json`;
if(!fs.existsSync(workOrderPath)){
  console.log(`ARTBOOK_DEPARTMENT_SKIP=${role}:no-work-order:${workOrderPath}`);
  process.exit(0);
}
const workOrder=readJson(workOrderPath,{});
const game=(queue.games||[]).find(x=>x.gameId===gameId)||{};
const styles=readJson('artbook-style-profiles.json',{games:{}});
const style=styles.games?.[gameId]||{};
const companyStatus=readJson('company-status.json',{});
const health=readJson('public-game-health.json',{games:[]});
const assetHealth=readJson('asset-health.json',{assets:[]});
const legacyResult=companyStatus.redevelopmentReview?.reviewResults?.[gameId]||{};
const legacyRole=legacyResult.departments?.[role]||null;
const gameHealth=(health.games||[]).find(x=>x.gameId===gameId)||null;

const root=`unity-games/${gameId}/Assets/Scripts`;
const coreFile=`${root}/GameCore.cs`,runtimeFile=`${root}/RuntimeBootstrap.cs`,visualFile=`${root}/PrototypeAnimatedVisuals.cs`;
const core=readText(coreFile),runtime=readText(runtimeFile),visual=readText(visualFile);
const roleEvidence={
  planning:{
    files:[coreFile,runtimeFile,workOrderPath,'artbook-style-profiles.json'],
    excerpts:{
      core:excerpt(core,['mainQuestStep','completedHiddenQuests','currentRegionId','QuestDefinition','Region(','TryChangeJob','SetRegion'],100),
      runtime:excerpt(runtime,['DrawRegionControls','DrawTownControls','MoveTo(','SpawnFirstEnemyInCurrentRegion','JOB CHANGE'],80)
    }
  },
  graphics:{
    files:[visualFile,'asset-health.json',workOrderPath,'artbook-style-profiles.json'],
    excerpts:{
      visuals:excerpt(visual,['SourceRoot','Actions','pirate','skeleton','StatusText','LoadClip','SetupCamera','targetFrameRate'],100),
      assets:(assetHealth.assets||[]).filter(x=>x.actor||x.verifiedAnimation).slice(0,12).map(x=>({id:x.id,license:x.license,verifiedAnimation:x.verifiedAnimation,healthy:x.healthy,sourceUrl:x.sourceUrl}))
    }
  },
  development:{
    files:[coreFile,runtimeFile,visualFile,'public-game-health.json',workOrderPath],
    excerpts:{
      core:excerpt(core,['PlayerState','SaveKey','TryBuyWeapon','TryBuyArmor','TryChangeJob','SetRegion','Save()','Load()','Region('],120),
      runtime:excerpt(runtime,['AutoStart','OnGUI','DrawRegionControls','AttackEnemy','RewardEnemyDefeat','ExperienceNeeded'],110),
      visuals:excerpt(visual,['UnityWebRequest','persistentDataPath','LoadAll','StatusText'],50),
      buildHealth:gameHealth?.buildHealth||null
    }
  },
  qa:{
    files:[runtimeFile,visualFile,'public-game-health.json',workOrderPath],
    excerpts:{
      runtime:excerpt(runtime,['OnGUI','DrawRegionControls','DrawCombatControls','DrawTownControls','MoveTo','AttackEnemy','Defeated','ExperienceNeeded'],120),
      visuals:excerpt(visual,['UnityWebRequest','_loadError','StatusText','LoadAll','LoadClip'],70),
      webSmoke:gameHealth?{status:gameHealth.status,issues:gameHealth.issues,failedRequestCount:gameHealth.failedRequestCount,buildHealth:gameHealth.buildHealth}:null
    }
  },
  balance:{
    files:[coreFile,runtimeFile,workOrderPath],
    excerpts:{
      core:excerpt(core,['baseMaxHp','baseAttack','WeaponDefinition','ArmorDefinition','old-stone-sword','iron-','steel-','Enemy(','bonusHp','experienceReward','goldReward','GetAttackPower'],150),
      runtime:excerpt(runtime,['AttackEnemy','RewardEnemyDefeat','ExperienceNeeded','player.baseMaxHp +=','player.baseAttack +=','BUY STONE SWORD'],90)
    }
  }
}[role];

const historicalEvidence=legacyRole?.summary?{
  source:'company-status.json',
  label:'기존 ARTBOOK FIRST 이전 부서 검토 요약 - 현재 승인/점수로 재사용 금지',
  summary:legacyRole.summary
}:null;
const sharedEvidence={
  gameId,gameName:workOrder.gameName||game.name||style.name||gameId,date,
  styleIdentity:style.identity||game.styleProfile||workOrder.styleProfile||'',
  storyFocus:style.storyFocus||'',signatureSections:style.signatureSections||[],
  currentStage:game.currentStage||'',
  role:ROLE_NAMES[role],scope:workOrder.departmentTasks?.[role]?.scope||'',
  explicitRules:{webGamesReadOnly:true,productionApproval:false,noScores:true,noOtherDepartmentSubmissionReading:true,storyCausalityIsCritical:true}
};
const evidencePayload={shared:sharedEvidence,historicalEvidence,roleEvidence};

const roleGuides={
  planning:'스토리·세계관·주인공 동기·지역/퀘스트 사건 인과만 평가한다. 현재 코드에 스토리 근거가 없으면 새 설정을 만들지 말고 공백으로 명시한다. 스토리 인과가 증명되지 않으면 READY라고 하지 않는다.',
  graphics:'캐릭터·몬스터·보스·배경·UI·인트로의 시각 논리와 에셋 근거만 평가한다. Pirate/Skeleton 같은 프로토타입 배우를 정식 세계관 캐릭터라고 단정하지 않는다. 기획 근거 없이 새 캐릭터 설정을 만들지 않는다.',
  development:'현재 실제 구현 범위, 시스템 구조, 기술 위험, 최소 플레이어블 시연 구조만 평가한다. 데이터에 존재하는 것과 현재 UI에서 실제 접근 가능한 것을 분리한다. 빌드 미검증을 완료로 말하지 않는다.',
  qa:'플레이 시작→이동→전투→성장→저장/재실행 흐름과 문제 장면·테스트 시나리오만 평가한다. 기존 웹 스모크 상태를 게임 품질 점수로 해석하지 않는다. APK 빌드가 막혀 있으면 실제 Android 검증 완료라고 하지 않는다.',
  balance:'코드에 있는 전투·성장·보상 수치와 체감 위험만 평가한다. 계산 가능한 것은 계산 근거를 적고, 실제 체감은 플레이테스트 전까지 미검증으로 둔다. 이전 부서 점수는 사용하지 않는다.'
};
const sectionKeys=ROLE_SECTION_KEYS[role];
const systemPrompt=`/no_think\n너는 재운컴퍼니 ${ROLE_NAMES[role]} 부서의 독립 아트북 검토 AI다. 로컬 오픈모델로 실행 중이며 유료 API를 쓰지 않는다.\n${roleGuides[role]}\n다른 부서의 제출물은 볼 수 없고 대신 작성하면 안 된다. 제공된 evidence만 사실로 사용할 수 있다. 근거가 없으면 반드시 '근거 부족' 또는 미검증으로 남긴다. 게임 품질 점수, 숫자 평가점수, PASS 판정, 출시/본개발 승인을 만들지 않는다. 홈페이지 공개와 제작 승인은 별개다. 답은 한국어로 간결하고 구체적으로 작성한다.\nJSON 객체만 출력한다. 필수 최상위 키: headline(string), readiness(READY|NEEDS_VALIDATION|BLOCKED), section(object), unverified(array), visualNotes(array 1~3). section은 이 부서 전용 키 ${sectionKeys.join(', ')}를 중심으로 구성하고 다른 부서의 섹션을 작성하지 않는다.`;
const userPrompt=`아래는 ${sharedEvidence.gameName}의 ${ROLE_NAMES[role]} 부서 전용 근거다. 서로 다른 부서 의견을 보지 않은 첫 검토다. 근거를 비교해 아트북에 들어갈 자기 부서 파트만 작성해.\n\n${JSON.stringify(evidencePayload,null,2)}`;
const retrySystemPrompt=`${systemPrompt}\n중요: 이전 시도는 JSON이 끝까지 닫히지 않아 파싱에 실패했다. 이번에는 설명·마크다운·코드펜스 없이 완결된 JSON 객체 하나만 출력한다. 전체 응답은 약 900토큰 이하로 유지하고, section의 각 항목은 핵심 근거 1~3개만 짧게 쓴다. 긴 코드·근거 원문을 복사하지 않는다.`;

function parseLocalModelJson(raw){
  const cleaned=clean(raw).replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/```$/,'').trim();
  const parsed=JSON.parse(cleaned);
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('local model did not return an object');
  if(!parsed.section||typeof parsed.section!=='object'||Array.isArray(parsed.section))throw new Error('local model section object missing');
  return parsed;
}

async function callLocalModel(model){
  const baseSeed=101+ROLES.indexOf(role)*97;
  let lastError=null;
  for(let attempt=0;attempt<2;attempt++){
    const compactRetry=attempt===1;
    try{
      const response=await fetch('http://127.0.0.1:11434/api/chat',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({
          model,stream:false,format:'json',
          messages:[{role:'system',content:compactRetry?retrySystemPrompt:systemPrompt},{role:'user',content:userPrompt}],
          options:{temperature:compactRetry?0.1:0.25,seed:baseSeed+(compactRetry?1000:0),num_ctx:16384,num_predict:compactRetry?2200:1800}
        })
      });
      if(!response.ok)throw new Error(`ollama ${response.status}: ${await response.text()}`);
      const packet=await response.json();
      return parseLocalModelJson(packet?.message?.content);
    }catch(error){
      lastError=error;
      if(attempt===0){
        console.warn(`ARTBOOK_LOCAL_MODEL_RETRY=${role}:reason=${compactText(error.message,160)}`);
        continue;
      }
    }
  }
  throw lastError||new Error('local model failed without an error');
}

const model=clean(process.env.ARTBOOK_LOCAL_MODEL||'qwen3:1.7b');
let candidate;
try{candidate=await callLocalModel(model);}catch(error){
  console.error(`ARTBOOK_LOCAL_MODEL_ERROR=${role}:${error.message}`);
  process.exitCode=2;
  throw error;
}
candidate=stripUnsafeKeys(candidate);
if(!candidate.section||typeof candidate.section!=='object'||Array.isArray(candidate.section))throw new Error(`${role}: section object missing`);
const headline=compactText(candidate.headline||`${ROLE_NAMES[role]} 부서 근거 검토`,140);
let readiness=normalizeReadiness(candidate.readiness);
const policyBlocks=[];
if(role==='planning'){
  const storySignals=/description\s*=|story|스토리|대사|dialogue/i.test(core+'\n'+runtime);
  if(!storySignals){policyBlocks.push('현재 Unity 플레이어블 근거에서 정식 스토리/사건 인과가 확인되지 않음');readiness='BLOCKED';}
}
if(role==='qa'&&gameHealth?.buildHealth?.status==='blocked'){
  policyBlocks.push(`Android 빌드 검증 차단: ${gameHealth.buildHealth.reason||'원인 기록 필요'}`);
  readiness='BLOCKED';
}
const unverified=[...safeArray(candidate.unverified,12),...policyBlocks].filter((v,i,a)=>a.indexOf(v)===i);
const visualNotes=safeArray(candidate.visualNotes,3).length?safeArray(candidate.visualNotes,3):[headline];
const outBase=path.join('artbook-submissions',gameId,date);
const output=path.join(outBase,`${role}.json`);
const visualPath=path.join(outBase,'visuals',`${role}.svg`).replaceAll('\\','/');
const existing=readJson(output,null);
if(existing&&existing.runner?.type!=='vibe2-local-open-model-department-bot'){
  console.log(`ARTBOOK_DEPARTMENT_SKIP=${role}:existing-external-submission`);
  process.exit(0);
}
writeText(visualPath,createVisualSvg({gameName:sharedEvidence.gameName,role,headline,readiness,notes:visualNotes}));
const submission={
  version:1,gameId,date,department:role,status:'SUBMITTED',departmentReadiness:readiness,
  runner:{type:'vibe2-local-open-model-department-bot',model,localInference:true,paidApi:false,apiKeyRequired:false,independentInvocation:true,readsOtherDepartmentSubmissions:false},
  headline,
  evidence:[
    ...roleEvidence.files.map(source=>({source,usage:'role-scoped-evidence'})),
    ...(historicalEvidence?[{source:historicalEvidence.source,usage:historicalEvidence.label}]:[])
  ],
  section:candidate.section,
  unverified,
  cuts:[{kind:role,title:headline,body:compactText(candidate.section.summary||visualNotes.join(' · '),420),image:visualPath}],
  verification:{evidenceOnly:true,otherDepartmentSubmissionsRead:false,productionApproval:false,numericQualityScoreUsed:false,policyBlocks}
};
writeJson(output,submission);
console.log(`ARTBOOK_DEPARTMENT_SUBMITTED=${role}`);
console.log(`ARTBOOK_DEPARTMENT_READINESS=${readiness}`);
console.log(`ARTBOOK_DEPARTMENT_FILE=${output}`);
console.log(`ARTBOOK_LOCAL_MODEL=${model}`);
console.log('PAID_API=NO');
