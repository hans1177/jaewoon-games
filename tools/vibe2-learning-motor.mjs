// 파일명: tools/vibe2-learning-motor.mjs
// 역할: 검증된 개발 결과를 Mastery, 복습, 벤치마크, Web->Roblox handoff, 통합 retrieval로 즉시 환류한다.
// 원칙: 학습/숙련은 권한·관문·PASS를 확대하지 않는다. 양의 숙련은 검증 증거가 있는 결과만 반영한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const clean=v=>String(v??'').trim();
const upper=v=>clean(v).toUpperCase();
const lower=v=>clean(v).toLowerCase();
const uniq=v=>[...new Set((v||[]).map(clean).filter(Boolean))];
const readJson=(file,fallback={})=>file&&fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):fallback;
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');};
const freeze=v=>Object.freeze(v);
const freezeList=v=>freeze([...(v||[])]);
const hash=s=>{let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);};

export const MASTERY_DOMAINS=freeze([
  'CORE_LOOP','STATE_MACHINE','COMBAT','AI','PROGRESSION','ECONOMY','SAVE','MOBILE_INPUT','UI_STATE',
  'DEBUGGING','RECOVERY','SECURITY','PERFORMANCE','ASSET_PRODUCTION','WEB_RUNTIME','ROBLOX_STUDIO','ROBLOX_DATASTORE',
  'ROBLOX_REMOTE_SECURITY','ROBLOX_REPLICATION','ROBLOX_MULTIPLAYER'
]);

const DOMAIN_PATTERNS=freeze({
  CORE_LOOP:/core.?loop|game.?loop|runtime.?loop|session|retry|restart|run.?state/i,
  STATE_MACHINE:/state.?machine|state|phase|terminal|win|fail|softlock|goal.?state/i,
  COMBAT:/combat|attack|damage|weapon|skill|hit|enemy|boss/i,
  AI:/\bai\b|npc|opponent|pathfind|enemy.?intent|navigation|bot/i,
  PROGRESSION:/progress|objective|quest|unlock|level|stage|wave|reward/i,
  ECONOMY:/econom|currency|gold|coin|cost|price|shop|resource|reward/i,
  SAVE:/save|load|restore|persist|storage|checkpoint|migration|datastore/i,
  MOBILE_INPUT:/mobile|touch|pointer|swipe|drag|virtual.?stick|input/i,
  UI_STATE:/\bui\b|hud|menu|panel|feedback|responsive/i,
  DEBUGGING:/debug|failure|bug|repair|causal|responsibility|regression/i,
  RECOVERY:/recovery|recover|retry|requeue|bottleneck|stale|checkpoint|fallback|repair.?loop|resume.?exact/i,
  SECURITY:/security|malware|virus|attack|secret|token|credential|supply.?chain|prompt.?injection|exfiltrat|backdoor|privilege|tamper/i,
  PERFORMANCE:/performance|fps|frame|memory|cpu|jank|pool|latency/i,
  ASSET_PRODUCTION:/asset|sprite|svg|canvas|texture|animation|vfx|audio|model/i,
  WEB_RUNTIME:/\bweb\b|browser|html|canvas|dom|css|javascript/i,
  ROBLOX_STUDIO:/roblox|studio|luau|rbxl|rbxlx/i,
  ROBLOX_DATASTORE:/datastore|ordered.?data.?store/i,
  ROBLOX_REMOTE_SECURITY:/remoteevent|remotefunction|remote.?security|server.?validate/i,
  ROBLOX_REPLICATION:/replication|replicated|server.?client|network.?ownership/i,
  ROBLOX_MULTIPLAYER:/multiplayer|multi.?client|playeradded|players|matchmaking/i
});

const WEB_TRANSFERABLE=new Set(['CORE_LOOP','STATE_MACHINE','COMBAT','AI','PROGRESSION','ECONOMY','SAVE','MOBILE_INPUT','UI_STATE','DEBUGGING','PERFORMANCE']);
const ROBLOX_NATIVE_ONLY=new Set(['ROBLOX_STUDIO','ROBLOX_DATASTORE','ROBLOX_REMOTE_SECURITY','ROBLOX_REPLICATION','ROBLOX_MULTIPLAYER']);
const XP_SUCCESS=12;
const XP_FAILURE=5;
const LEVEL_THRESHOLDS=[0,30,70,120,180,250,340,450,580,730];

function inferDomains(text='',engine=''){
  const source=String(text);
  const out=[];
  for(const [domain,re] of Object.entries(DOMAIN_PATTERNS)) if(re.test(source)) out.push(domain);
  const e=lower(engine);
  if(e==='web') out.push('WEB_RUNTIME');
  if(e==='roblox') out.push('ROBLOX_STUDIO');
  return uniq(out);
}

function masteryLevel(xp=0){
  let level=1;
  for(let i=0;i<LEVEL_THRESHOLDS.length;i++) if(Number(xp)>=LEVEL_THRESHOLDS[i]) level=i+1;
  return Math.min(10,level);
}


function normalizeCodingStrategyMemory(input={}){
  const source=input&&typeof input==='object'?input:{};
  const strategies={};
  for(const [name,rowRaw] of Object.entries(source.strategies||{})){
    const row=rowRaw&&typeof rowRaw==='object'?rowRaw:{};
    const games={};for(const [k,v] of Object.entries(row.games||{}))games[clean(k)]=Math.max(0,Number(v)||0);
    const targets={};for(const [k,v] of Object.entries(row.targets||{}))targets[clean(k)]=Math.max(0,Number(v)||0);
    const applications=Math.max(0,Number(row.verifiedApplications)||0);
    const firstPasses=Math.max(0,Math.min(applications,Number(row.firstCandidatePasses)||0));
    strategies[clean(name)]={verifiedApplications:applications,firstCandidatePasses:firstPasses,totalGenerationAttempts:Math.max(0,Number(row.totalGenerationAttempts)||0),games,targets,state:clean(row.state)||'CANDIDATE',lastEvidence:clean(row.lastEvidence)||null,lastUpdatedAt:clean(row.lastUpdatedAt)||null};
  }
  return{version:1,seenOutcomeIds:uniq(source.seenOutcomeIds||[]),strategies};
}
export function createMasteryState(seed={}){
  const domains={};
  for(const d of MASTERY_DOMAINS){
    const row=seed?.domains?.[d]||{};
    const xp=Math.max(0,Number(row.xp)||0);
    domains[d]={xp,level:masteryLevel(xp),verifiedSuccesses:Math.max(0,Number(row.verifiedSuccesses)||0),verifiedFailureLessons:Math.max(0,Number(row.verifiedFailureLessons)||0),lastEvidence:clean(row.lastEvidence)||null};
  }
  return {
    version:1,
    kind:'vibe2-mastery-state',
    legacyDevelopmentLevelUnaffected:true,
    authorityExpanded:false,
    domains,
    seenExperienceIds:uniq(seed.seenExperienceIds||[]),
    seenCodePatternIds:uniq(seed.seenCodePatternIds||[]),
    failureSignatures:{...(seed.failureSignatures||{})},
    codingStrategyMemory:normalizeCodingStrategyMemory(seed.codingStrategyMemory),
    updatedAt:clean(seed.updatedAt)||null
  };
}

const CODE_PATTERN_MASTERY=Object.freeze({
  SAVE_PERSISTENCE:['SAVE'],
  INPUT_EVENT_BINDING:['MOBILE_INPUT','UI_STATE'],
  STATE_MACHINE:['STATE_MACHINE','CORE_LOOP'],
  AI_INTENT:['AI'],
  COMBAT_RESOLUTION:['COMBAT'],
  ECONOMY_TRANSACTION:['ECONOMY'],
  FRAME_LOOP_PERFORMANCE:['PERFORMANCE'],
  MOBILE_UI_FLOW:['MOBILE_INPUT','UI_STATE'],
  REGRESSION_REPAIR:['DEBUGGING','RECOVERY'],
  EXACT_STAGE_RESUME:['RECOVERY','DEBUGGING','STATE_MACHINE'],
  QUEUE_RECOVERY:['RECOVERY','DEBUGGING'],
  CACHE_RUNTIME_RECOVERY:['RECOVERY','DEBUGGING','PERFORMANCE'],
  PROVIDER_FALLBACK:['RECOVERY','DEBUGGING'],
  ORCHESTRATION_RECOVERY:['RECOVERY','DEBUGGING'],
  MACHINE_STATE_RECOVERY:['RECOVERY','DEBUGGING','STATE_MACHINE'],
  RUNTIME_OBSERVATION_RECOVERY:['RECOVERY','DEBUGGING'],
  SECURITY_PERIMETER:['SECURITY','DEBUGGING'],
  SECRET_PROTECTION:['SECURITY'],
  SUPPLY_CHAIN_SECURITY:['SECURITY','DEBUGGING'],
  WORKFLOW_INTEGRITY:['SECURITY','DEBUGGING'],
  PROMPT_INJECTION_DEFENSE:['SECURITY'],
  MALWARE_DETECTION:['SECURITY','DEBUGGING'],
  EXFILTRATION_DEFENSE:['SECURITY']
});

export function applyVerifiedCodePatternsToMastery(stateInput={},libraryInput={}){
  const state=createMasteryState(stateInput);
  const seen=new Set(state.seenCodePatternIds||[]);
  let added=0;
  for(const pattern of libraryInput?.patterns||[]){
    if(pattern?.verified!==true||pattern?.rawCodeStored===true)continue;
    if(pattern?.masteryEligible===false)continue;
    if(upper(pattern.independentQa)!=='PASS')continue;
    const id=clean(pattern.id);if(!id||seen.has(id))continue;
    const domains=CODE_PATTERN_MASTERY[upper(pattern.system)]||inferDomains([pattern.system,pattern.pattern,...(pattern.tags||[])].join(' '),pattern.engine);
    for(const d of domains){
      if(!state.domains[d])continue;
      const row=state.domains[d];
      row.xp+=8;row.level=masteryLevel(row.xp);row.verifiedSuccesses+=1;row.lastEvidence=id;
    }
    seen.add(id);added++;
  }
  state.seenCodePatternIds=[...seen].slice(-5000);
  state.updatedAt=new Date().toISOString();
  return {state,added};
}

function failureSignature(record={}){
  const raw=clean(record.failureCause)||(record.avoidPatterns||[]).map(clean).filter(Boolean).sort().join('|');
  if(!raw) return '';
  return 'fail_'+hash(raw.toLowerCase().replace(/\s+/g,' '));
}

export function applyVerifiedExperienceToMastery(stateInput={},experienceInput={}){
  const state=createMasteryState(stateInput);
  const seen=new Set(state.seenExperienceIds);
  let added=0;
  for(const record of experienceInput?.records||[]){
    if(record?.verified!==true||record?.reusable!==true) continue;
    const id=clean(record.id||record.fingerprint);
    if(!id||seen.has(id)) continue;
    const outcome=upper(record.outcome);
    const failure=clean(record.failureCause)||(record.avoidPatterns||[]).length>0;
    if(outcome!=='PASS'&&!failure) continue;
    const text=[record.problem,record.goal,record.change,record.failureCause,...(record.reusablePatterns||[]),...(record.avoidPatterns||[])].filter(Boolean).join(' ');
    const domains=inferDomains(text,record.engine);
    for(const d of domains){
      const row=state.domains[d];
      const amount=outcome==='PASS'?XP_SUCCESS:XP_FAILURE;
      row.xp+=amount;
      row.level=masteryLevel(row.xp);
      if(outcome==='PASS') row.verifiedSuccesses+=1; else row.verifiedFailureLessons+=1;
      row.lastEvidence=id;
    }
    if(failure){
      const sig=failureSignature(record);
      if(sig){
        const cur=state.failureSignatures[sig]||{count:0,lastEvidence:null,example:clean(record.failureCause)||(record.avoidPatterns||[]).join(' | '),domains:[]};
        cur.count+=1;
        cur.lastEvidence=id;
        cur.domains=uniq([...(cur.domains||[]),...domains]);
        state.failureSignatures[sig]=cur;
      }
    }
    seen.add(id); added+=1;
  }
  state.seenExperienceIds=[...seen].slice(-5000);
  state.updatedAt=new Date().toISOString();
  return {state,added};
}


function lastEvidenceMarker(evidence=[],prefix=''){
  const rows=(evidence||[]).map(clean).filter(value=>value.startsWith(prefix));
  return rows.length?rows.at(-1).slice(prefix.length):'';
}
function codingOutcomeIdentity(task={},strategy=''){
  const evidence=(task.evidence||[]).map(clean);
  const candidate=evidence.filter(value=>value.startsWith('vibe2/candidate/')).at(-1)||clean(task.id);
  return 'coding_'+hash([clean(task.id),clean(strategy),candidate].join('|'));
}
function strategyLifecycle(row={}){
  const applications=Math.max(0,Number(row.verifiedApplications)||0);
  const games=Object.keys(row.games||{}).filter(Boolean).length;
  const firstPassRate=applications?Number(row.firstCandidatePasses||0)/applications:0;
  if(applications>=5&&games>=2&&firstPassRate>=0.6)return'PREFERRED';
  if(applications>=3)return'VERIFIED';
  if(applications>=1)return'OBSERVED';
  return'CANDIDATE';
}
export function applyVerifiedCodingStrategyOutcomes(stateInput={},queueInput={}){
  const state=createMasteryState(stateInput);
  const memory=normalizeCodingStrategyMemory(state.codingStrategyMemory);
  const seen=new Set(memory.seenOutcomeIds||[]);
  let added=0;
  for(const task of queueInput?.tasks||[]){
    const evidence=(task?.evidence||[]).map(clean).filter(Boolean);
    if(!evidence.includes('role-result:regression:PASS')||!evidence.includes('role-result:review:PASS')||!evidence.includes('candidate-identity:PASS'))continue;
    const strategy=lastEvidenceMarker(evidence,'coding-strategy:');
    if(!strategy)continue;
    const id=codingOutcomeIdentity(task,strategy);
    if(seen.has(id))continue;
    const firstAttempt=lastEvidenceMarker(evidence,'coding-candidate-first-attempt:')==='YES';
    const attempts=Math.max(1,Number(lastEvidenceMarker(evidence,'coding-generation-attempts:'))||1);
    const gameId=clean(task.gameId)||'unknown';
    const target=lower(task.target)||'unknown';
    const row=memory.strategies[strategy]||{verifiedApplications:0,firstCandidatePasses:0,totalGenerationAttempts:0,games:{},targets:{},state:'CANDIDATE',lastEvidence:null,lastUpdatedAt:null};
    row.verifiedApplications+=1;
    if(firstAttempt)row.firstCandidatePasses+=1;
    row.totalGenerationAttempts+=attempts;
    row.games[gameId]=(row.games[gameId]||0)+1;
    row.targets[target]=(row.targets[target]||0)+1;
    row.state=strategyLifecycle(row);
    row.lastEvidence=id;
    row.lastUpdatedAt=new Date().toISOString();
    memory.strategies[strategy]=row;
    seen.add(id);
    added+=1;
  }
  memory.seenOutcomeIds=[...seen].slice(-5000);
  state.codingStrategyMemory=memory;
  state.updatedAt=new Date().toISOString();
  return{state,added};
}

export function preferredCodingStrategyForTask({task={},stateInput={}}={}){
  const state=createMasteryState(stateInput);
  const rows=Object.entries(state.codingStrategyMemory?.strategies||{}).map(([strategy,row])=>({strategy,...row}));
  const eligible=rows.filter(row=>row.state==='PREFERRED');
  if(!eligible.length)return{strategy:null,state:'NO_PREFERRED_STRATEGY',evidenceApplications:0,advisoryOnly:true,authorityExpanded:false};
  const gameId=clean(task.gameId),target=lower(task.target);
  eligible.sort((a,b)=>{
    const score=row=>Number(row.games?.[gameId]||0)*20+Number(row.targets?.[target]||0)*5+Number(row.firstCandidatePasses||0)*2+Number(row.verifiedApplications||0);
    return score(b)-score(a)||String(a.strategy).localeCompare(String(b.strategy));
  });
  const winner=eligible[0];
  return{
    strategy:winner.strategy,state:winner.state,evidenceApplications:Number(winner.verifiedApplications||0),
    firstCandidatePassRatePct:winner.verifiedApplications?Number(((winner.firstCandidatePasses/winner.verifiedApplications)*100).toFixed(1)):0,
    sameGameApplications:Number(winner.games?.[gameId]||0),sameTargetApplications:Number(winner.targets?.[target]||0),
    advisoryOnly:true,authorityExpanded:false
  };
}
export function codingStrategyGuidance(preference={}){
  if(!clean(preference?.strategy))return'';
  return[
    '[VERIFIED CODING STRATEGY PREFERENCE - advisory inside reserved scope]',
    'strategy='+clean(preference.strategy),
    'verifiedApplications='+Number(preference.evidenceApplications||0),
    'firstCandidatePassRatePct='+Number(preference.firstCandidatePassRatePct||0),
    'sameGameApplications='+Number(preference.sameGameApplications||0),
    'This preference may change patch ordering but MUST NOT expand writable scope, bypass the compiled edit contract, weaken QA, or alter protected gameplay/save semantics.'
  ].join('\n');
}

function words(value=''){return new Set(lower(value).match(/[a-z0-9가-힣_]{2,}/g)||[]);}
function overlapScore(a,b){let n=0;for(const x of a)if(b.has(x))n++;return n;}

export function retrieveUnifiedLearning({task={},experienceInput={},codePatternsInput={},playbooksInput={},practiceDistilledInput={},masteryInput={}}={}){
  const qWords=words([task.goal,task.gameId,task.target,task.genre].filter(Boolean).join(' '));
  const gameId=clean(task.gameId);
  const engine=lower(task.target);
  const ranked=(experienceInput?.records||[]).filter(r=>r?.verified===true&&r?.reusable===true).map(record=>{
    let score=0;const reasons=[];
    if(gameId&&clean(record.gameId)===gameId){score+=40;reasons.push('same-game');}
    if(engine&&lower(record.engine)===engine){score+=20;reasons.push('same-engine');}
    const rWords=words([record.problem,record.goal,record.change,record.failureCause,...(record.reusablePatterns||[]),...(record.avoidPatterns||[])].filter(Boolean).join(' '));
    const overlap=overlapScore(qWords,rWords);
    if(overlap){score+=Math.min(20,overlap*2);reasons.push('keyword-overlap:'+overlap);}
    score+=Math.min(10,Math.log2(Math.max(1,Number(record.confirmations)||1)+1)*2);
    return {record,score:Number(score.toFixed(3)),reasons};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,8);

  const patterns=(codePatternsInput?.patterns||[]).map(row=>{
    const pWords=words([row.id,row.system,row.problem,row.pattern,row.tags].flat().filter(Boolean).join(' '));
    let score=overlapScore(qWords,pWords)*3;
    if(gameId&&clean(row.gameId)===gameId) score+=30;
    if(engine&&lower(row.engine)===engine) score+=15;
    return {...row,relevance:score};
  }).filter(x=>x.verified===true&&x.relevance>0).sort((a,b)=>b.relevance-a.relevance).slice(0,6);

  const taskType=lower(task.taskType||task.type||'coding');
  const playbook=playbooksInput?.taskTypes?.[taskType]||playbooksInput?.taskTypes?.coding||null;
  const mastery=createMasteryState(masteryInput);
  const domains=inferDomains(clean(task.goal),engine);
  const practiceDistilled=(practiceDistilledInput?.entries||[])
    .filter(row=>row?.verified===true&&row?.independentlyVerified===true&&row?.retrievalEligible===true&&clean(row.authority)==='VERIFIED_DISTILLED_PRACTICE_KNOWLEDGE'&&domains.includes(upper(row.domain)))
    .map(row=>({id:clean(row.id),domain:upper(row.domain),confirmations:Math.max(1,Number(row.confirmations)||1),verificationEvidence:(row.verificationEvidence||[]).map(clean).filter(Boolean).slice(0,6),authority:clean(row.authority),relevance:Math.min(12,4+Math.max(1,Number(row.confirmations)||1))}))
    .sort((a,b)=>b.relevance-a.relevance||a.domain.localeCompare(b.domain)).slice(0,6);
  return {
    version:1,kind:'vibe2-unified-learning-context',gameId:gameId||null,target:engine||null,
    priority:['SAME_GAME_VERIFIED','SAME_ENGINE_VERIFIED','SYSTEM_MATCH_VERIFIED','VERIFIED_PRACTICE_DISTILLED_ADVISORY','GENERAL_PLAYBOOK'],
    experience:ranked.map(x=>({id:x.record.id,gameId:x.record.gameId,engine:x.record.engine,outcome:x.record.outcome,reusablePatterns:x.record.reusablePatterns,avoidPatterns:x.record.avoidPatterns,failureCause:x.record.failureCause,relevance:x.score,reasons:x.reasons})),
    codePatterns:patterns,
    practiceDistilled,
    playbook,
    mastery:domains.map(d=>({domain:d,...mastery.domains[d]})),
    authorityExpanded:false
  };
}

export function learningGuidance(context={}){
  if(context?.kind!=='vibe2-unified-learning-context') return '';
  const lines=['[VIBE VERIFIED LEARNING MOTOR]','우선순위=same-game > same-engine > system-match > general. 검증되지 않은 성공은 재사용하지 않는다. 실패는 검증된 원인만 회피 패턴으로 사용한다.'];
  for(const row of context.experience||[]) lines.push(`- experience=${row.id}; game=${row.gameId||'n/a'}; engine=${row.engine||'n/a'}; relevance=${row.relevance}; reuse=${(row.reusablePatterns||[]).slice(0,5).join('|')||'none'}; avoid=${(row.avoidPatterns||[]).slice(0,5).join('|')||row.failureCause||'none'}`);
  for(const row of context.codePatterns||[]) lines.push(`- verified-code-pattern=${row.id}; system=${row.system||'general'}; relevance=${row.relevance}; pattern=${clean(row.pattern).slice(0,280)}`);
  for(const row of context.practiceDistilled||[]) lines.push(`- verified-practice-distilled=${row.domain}; confirmations=${row.confirmations}; evidence=${(row.verificationEvidence||[]).slice(0,3).join('|')}`);
  if(context.playbook?.checklist?.length) lines.push(`- playbook=${context.playbook.checklist.join(' | ')}`);
  if(context.mastery?.length) lines.push(`- mastery=${context.mastery.map(x=>x.domain+':LV'+x.level).join(' | ')}`);
  return lines.join('\n');
}

export function candidateTournamentPolicy({task={},masteryInput={}}={}){
  const state=createMasteryState(masteryInput);
  const goal=clean(task.goal);
  const repeated=Object.values(state.failureSignatures||{}).some(row=>Number(row.count)>=2&&(row.domains||[]).some(d=>inferDomains(goal,task.target).includes(d)));
  const highRisk=lower(task.priority)==='critical'||lower(task.estimatedRisk)==='high'||/FULL_WEB_GAME_REBUILD|release|migration|multiplayer|datastore/i.test(goal);
  const count=repeated||highRisk?3:1;
  return {candidateCount:count,maxCandidates:5,reason:repeated?'repeated-verified-failure':highRisk?'high-risk':'normal',winnerRule:'VERIFIED_QA_PLUS_LOWEST_REGRESSION_RISK',gateBypass:false};
}

export function buildBenchmarkLadder(masteryInput={}){
  const state=createMasteryState(masteryInput);
  const mapping={CODING:['CORE_LOOP','STATE_MACHINE'],BUGFIX:['DEBUGGING'],WEB_GAMEPLAY:['WEB_RUNTIME','MOBILE_INPUT'],ROBLOX_NATIVE:['ROBLOX_STUDIO','ROBLOX_REPLICATION'],AI:['AI'],SAVE:['SAVE'],PERFORMANCE:['PERFORMANCE'],ASSET_PRODUCTION:['ASSET_PRODUCTION']};
  const cases=[];
  for(const [track,domains] of Object.entries(mapping)){
    const avg=domains.reduce((n,d)=>n+(state.domains[d]?.level||1),0)/domains.length;
    const level=Math.max(1,Math.min(10,Math.ceil(avg)));
    cases.push({id:`mastery-${lower(track)}-l${level}`,track,level,state:'READY_FOR_VERIFIED_PRACTICE',countsAsTrainingSample:false,requiredVerification:['SYNTAX','RUNTIME_WHEN_APPLICABLE','INDEPENDENT_QA','REGRESSION'],promotionRule:'ONLY_VERIFIED_RESULT_MAY_ENTER_CANONICAL_DISTILLATION'});
  }
  return {version:1,kind:'vibe2-benchmark-ladder',cases,authority:'practice-and-measurement-only'};
}

export function enrichQueueForCandidateTournaments(queueInput={},masteryInput={}){
  const state=createMasteryState(masteryInput);
  let changed=0;
  const tasks=(queueInput?.tasks||[]).map(task=>{
    if(lower(task?.status)!=='queued'||lower(task?.type)!=='implementation') return task;
    const policy=candidateTournamentPolicy({task,masteryInput:state});
    if(policy.candidateCount<=1) return task;
    const evidence=uniq([...(task.evidence||[]),`learning-motor-candidate-tournament:${policy.reason}`]);
    const next={...task,speculativeEligible:true,estimatedRisk:'high',evidence};
    if(task.speculativeEligible!==true||lower(task.estimatedRisk)!=='high'||evidence.length!==(task.evidence||[]).length) changed++;
    return next;
  });
  return {queue:{...queueInput,tasks},changed};
}

export function buildIdlePracticeQueue(masteryInput={}){
  const state=createMasteryState(masteryInput);
  const gaps=Object.entries(state.domains).sort((a,b)=>a[1].level-b[1].level||a[0].localeCompare(b[0]));
  const repeated=Object.entries(state.failureSignatures).filter(([,row])=>Number(row.count)>=2).sort((a,b)=>Number(b[1].count)-Number(a[1].count)).slice(0,5);
  const drills=[
    ...repeated.map(([sig,row])=>({id:`review-${sig}`,kind:Number(row.count)>=3?'REPRO_DRILL':'FORCED_RETRIEVAL_REVIEW',priority:'high',productionPreemptible:true,countsAsProductionPass:false,domains:row.domains,sourceFailure:sig})),
    ...gaps.map(([domain,row])=>({id:`gap-${lower(domain)}-l${row.level}`,kind:'MINI_GAME_SYSTEM_DRILL',priority:'low',productionPreemptible:true,countsAsProductionPass:false,domains:[domain]}))
  ];
  return {version:1,kind:'vibe2-idle-practice-queue',productionWorkAlwaysPreemptsPractice:true,drills};
}

function isIdlePracticeTask(task={}){
  return (task?.evidence||[]).some(x=>clean(x)==='learning-practice-only')||/^LEARNING-PRACTICE-/.test(clean(task?.id));
}
function idlePracticeTaskId(drill={}){
  return `LEARNING-PRACTICE-${clean(drill.id).replace(/[^A-Za-z0-9._-]+/g,'-').slice(0,80)}`;
}
function practiceStatusRank(status=''){
  return ({running:6,queued:5,done:4,failed:3,blocked:2,cancelled:1})[lower(status)]||0;
}
export function dedupeIdlePracticeTasks(tasksInput=[]){
  const tasks=Array.isArray(tasksInput)?tasksInput:[];
  const groups=new Map(),firstIndex=new Map();
  for(let i=0;i<tasks.length;i++){
    const task=tasks[i];
    if(!isIdlePracticeTask(task)||!clean(task?.id))continue;
    const id=clean(task.id);
    if(!groups.has(id)){groups.set(id,[]);firstIndex.set(id,i);}
    groups.get(id).push(task);
  }
  let removed=0;
  const canonical=new Map();
  for(const [id,rows] of groups.entries()){
    if(rows.length<2){canonical.set(id,rows[0]);continue;}
    removed+=rows.length-1;
    const sorted=[...rows].sort((a,b)=>practiceStatusRank(b?.status)-practiceStatusRank(a?.status)||Number(b?.retries||0)-Number(a?.retries||0)||Number((b?.evidence||[]).length)-Number((a?.evidence||[]).length));
    const winner=sorted[0];
    canonical.set(id,{
      ...winner,
      retries:Math.max(...rows.map(row=>Number(row?.retries||0))),
      maxRetries:Math.max(...rows.map(row=>Number(row?.maxRetries||0))),
      evidence:[...new Set(rows.flatMap(row=>Array.isArray(row?.evidence)?row.evidence:[]).map(clean).filter(Boolean))]
    });
  }
  const next=[];
  for(let i=0;i<tasks.length;i++){
    const task=tasks[i];
    if(!isIdlePracticeTask(task)||!clean(task?.id)){next.push(task);continue;}
    const id=clean(task.id);
    if(firstIndex.get(id)!==i)continue;
    next.push(canonical.get(id)||task);
  }
  return {tasks:next,changed:removed>0,removed};
}

export function injectIdlePracticeTask(queueInput={},idlePracticeInput={}){
  const inputTasks=Array.isArray(queueInput?.tasks)?queueInput.tasks:[];
  const deduped=dedupeIdlePracticeTasks(inputTasks);
  const tasks=deduped.tasks;
  const normalizedQueue=deduped.changed?{...queueInput,tasks}:queueInput;
  const active=tasks.filter(task=>['queued','running'].includes(lower(task?.status)));
  const productionActive=active.some(task=>!isIdlePracticeTask(task));
  const existingPractice=active.find(isIdlePracticeTask);
  if(productionActive||existingPractice)return {queue:normalizedQueue,added:false,changed:deduped.changed,deduped:deduped.removed,reason:productionActive?'PRODUCTION_WORK_PRESENT':'PRACTICE_ALREADY_ACTIVE'};
  const represented=new Set(tasks.filter(isIdlePracticeTask).map(task=>clean(task.id)).filter(Boolean));
  const drill=(idlePracticeInput?.drills||[]).find(row=>!represented.has(idlePracticeTaskId(row)));
  if(!drill)return {queue:normalizedQueue,added:false,changed:deduped.changed,deduped:deduped.removed,reason:'NO_NEW_PRACTICE_DRILL'};
  const id=idlePracticeTaskId(drill);
  const goal=[
    '[VIBE_LEARNING_PRACTICE]',
    `kind=${clean(drill.kind)}`,
    `domains=${(drill.domains||[]).join(',')||'GENERAL'}`,
    clean(drill.sourceFailure)?`sourceFailure=${clean(drill.sourceFailure)}`:'',
    '소스 파일을 수정하지 않는다. 문제 원인, 최소 안전 해결 전략, 검증 테스트, 재사용/회피 패턴을 작성한다.',
    '이 결과는 연습 전용이며 production PASS, QA PASS, release evidence로 사용할 수 없다.'
  ].filter(Boolean).join('\n');
  const task={
    id,gameId:null,target:'web',department:'development',type:'research',goal,
    responsibleFiles:[],dependencies:[],priority:'low',releaseState:'other',status:'queued',
    retries:0,maxRetries:1,ownerDirective:false,requiresOwnerDecision:false,protectedChange:false,
    paidResourceRequired:false,sourceRoot:`learning-practice:${clean(drill.id)}`,
    speculativeEligible:false,estimatedRisk:'low',
    evidence:['learning-practice-only','production-pass:NO',`practice-kind:${clean(drill.kind)}`,...(drill.domains||[]).map(d=>`practice-domain:${clean(d)}`)],
    completionCriteria:['PRACTICE_ANALYSIS_COMPLETED','SOURCE_WRITE_ZERO','PRODUCTION_PASS_NO']
  };
  return {queue:{...queueInput,tasks:[...tasks,task]},added:true,changed:true,deduped:deduped.removed,reason:'IDLE_PRACTICE_ENQUEUED',task};
}

function get(item,...keys){for(const k of keys){const v=item?.[k];if(v!==undefined&&v!==null&&v!=='')return v;}return null;}
function verifiedWebSemanticContext(experienceInput={},gameId=''){
  const records=(experienceInput?.records||[]).filter(record=>record?.verified===true&&record?.reusable===true&&upper(record?.outcome)==='PASS'&&lower(record?.engine)==='web'&&clean(record?.gameId)===clean(gameId)).sort((a,b)=>String(b?.lastVerifiedAt||b?.createdAt||'').localeCompare(String(a?.lastVerifiedAt||a?.createdAt||'')));
  const values={},sourceExperienceIds=[];
  let runtimeEvidence=null;
  for(const record of records){
    sourceExperienceIds.push(clean(record.id));
    if(!runtimeEvidence){const marker=(record.evidence||[]).map(clean).find(value=>value.startsWith('web-runtime-evidence:'));if(marker)runtimeEvidence=marker.slice('web-runtime-evidence:'.length);}
    for(const pattern of record.reusablePatterns||[]){
      const match=/^WEB_SEMANTIC:([A-Z_]+):(.+)$/.exec(clean(pattern));
      if(!match||values[match[1]])continue;
      values[match[1]]=clean(match[2]);
    }
  }
  return{values,sourceExperienceIds:uniq(sourceExperienceIds),runtimeEvidence};
}
const PROJECT_MACHINE_FIELDS=Object.freeze(["PROJECT_PHASE","PLATFORM","GENRE","WEB_BASELINE","ROBLOX_HANDOFF","POST_RELEASE_FOCUS_RUNNER","LEARNING_CONTEXT","NEXT_MACHINE_ACTION"]);
const PROJECT_MACHINE_STAGES=Object.freeze(new Set([
  'PLATFORM_AND_GENRE_LOCKED','WEB_BASE_IMPLEMENTATION','WEB_RUNTIME_VALIDATION','WEB_DEVELOPMENT_BASELINE_READY',
  'TARGET_PLATFORM_SOURCE_BIND','TARGET_PLATFORM_RUNTIME','TARGET_PLATFORM_INDEPENDENT_QA',
  'TARGET_PLATFORM_REGRESSION','RELEASE_PROMOTION','POST_RELEASE_FOCUSED_DEVELOPMENT'
]));
function permanentProjectIds(roadmapInput={}){
  return new Set((Array.isArray(roadmapInput?.permanentProjectRemoval?.ids)?roadmapInput.permanentProjectRemoval.ids:[]).map(clean).filter(Boolean));
}
function webBaselinePassed(item={}){
  return Boolean(item.webValidationPassedAt||item.webPromotionRevalidationPassed===true||item.formalImplementationPassed===true);
}
function releasedRobloxProject(item={}){
  const platform=upper(get(item,'selectedPlatform','targetPlatform','INITIAL_TARGET_PLATFORM'));
  const evidence=item.robloxReleaseEvidence||{};
  const sourceRevision=clean(item.robloxSourceCommit);
  const artifactIdentity=clean(item.robloxBuildArtifactIdentity);
  return platform==='ROBLOX'
    &&item.robloxReleaseClaim===true
    &&evidence.published===true
    &&clean(evidence.sourceRevision)===sourceRevision
    &&clean(evidence.artifactIdentity)===artifactIdentity
    &&Number(evidence.versionNumber||0)>0
    &&item.robloxFinalReviewPassed===true
    &&item.robloxRegressionPassed===true
    &&item.robloxExactRevisionPassed===true
    &&/^[a-f0-9]{40}$/i.test(sourceRevision)
    &&/^sha256:[a-f0-9]{64}$/i.test(artifactIdentity);
}
function projectGenre(item={}){
  return clean(get(item,'genre','selectedGenre','gameGenre')||item?.robloxBuildProfile?.genre||item?.designBaseline?.robloxBuildProfile?.genre)||null;
}
function buildWebBaselineState(item={},verifiedSemantic={}){
  const semantic=verifiedSemantic.values||{};
  const passed=webBaselinePassed(item);
  const numberOrNull=value=>value===null||value===undefined||value===''?null:(Number.isFinite(Number(value))?Number(value):null);
  return {
    required:true,
    state:passed?'VERIFIED':'PENDING',
    sourcePath:clean(get(item,'webSourcePath','webPath','sourcePath'))||null,
    evidencePath:clean(get(item,'webValidationEvidencePath','webRuntimeEvidence'))||verifiedSemantic.runtimeEvidence||null,
    sourceIndexSha256:clean(get(item,'webSourceIndexSha256'))||null,
    designBaselineSha256:clean(get(item,'webDesignBaselineSha256'))||null,
    validationSchemaVersion:numberOrNull(get(item,'webValidationSchemaVersion')),
    strictScore:numberOrNull(get(item,'webStrictScore')),
    promotionRevalidationPassed:item.webPromotionRevalidationPassed===true,
    CORE_LOOP:get(item,'coreLoop','webCoreLoop','gameplayLoop')||semantic.CORE_LOOP||null,
    STATE_MODEL:get(item,'stateModel','webStateModel')||semantic.STATE_MODEL||null,
    PROGRESSION_MODEL:get(item,'progressionModel')||semantic.PROGRESSION_MODEL||null,
    UI_FLOW:get(item,'uiFlow')||semantic.UI_FLOW||null,
    INPUT_INTENT:get(item,'inputIntent')||semantic.INPUT_INTENT||null,
    SAVE_MEANING:get(item,'saveMeaning','saveModel')||semantic.SAVE_MEANING||null,
    CONTENT_STRUCTURE:get(item,'contentStructure')||semantic.CONTENT_STRUCTURE||null,
    BALANCE_INTENT:get(item,'balanceIntent')||semantic.BALANCE_INTENT||null
  };
}
function derivedProjectPhase(item={},platform='',genre=null){
  if(releasedRobloxProject(item))return'POST_RELEASE_FOCUSED_DEVELOPMENT';
  const explicit=upper(get(item,'PROJECT_PHASE','projectPhase','developmentStage'));
  if(PROJECT_MACHINE_STAGES.has(explicit))return explicit;
  if(!platform||!genre)return'AWAITING_PLATFORM_AND_GENRE_LOCK';
  if(!webBaselinePassed(item)){
    if(item.webRuntimeValidationStartedAt||item.webValidationStartedAt)return'WEB_RUNTIME_VALIDATION';
    return'WEB_BASE_IMPLEMENTATION';
  }
  if(platform!=='ROBLOX')return'TARGET_PLATFORM_SOURCE_BIND';
  if(!clean(item.robloxSourceCommit))return'TARGET_PLATFORM_SOURCE_BIND';
  if(item.robloxRuntimePassed!==true)return'TARGET_PLATFORM_RUNTIME';
  if(item.robloxIndependentQaPassed!==true)return'TARGET_PLATFORM_INDEPENDENT_QA';
  if(item.robloxRegressionPassed!==true||item.robloxExactRevisionPassed!==true)return'TARGET_PLATFORM_REGRESSION';
  return'RELEASE_PROMOTION';
}
function nextMachineAction(item={},phase='',handoff=null){
  if(phase==='AWAITING_PLATFORM_AND_GENRE_LOCK')return'LOCK_PLATFORM_AND_GENRE_AFTER_VERIFICATION';
  if(phase==='WEB_BASE_IMPLEMENTATION')return'IMPLEMENT_WEB_CORE_LOOP_AND_BASE_SYSTEMS';
  if(phase==='WEB_RUNTIME_VALIDATION')return'VALIDATE_WEB_BASELINE';
  if(phase==='WEB_DEVELOPMENT_BASELINE_READY')return'BIND_WEB_BASELINE_TO_TARGET_PLATFORM';
  if(phase==='TARGET_PLATFORM_SOURCE_BIND'){
    if(upper(get(item,'selectedPlatform','targetPlatform','INITIAL_TARGET_PLATFORM'))==='ROBLOX'&&handoff?.complete!==true)return'COMPLETE_VERIFIED_WEB_TO_ROBLOX_HANDOFF_CONTEXT';
    return'BUILD_TARGET_PLATFORM_FROM_WEB_AND_LEARNING_CONTEXT';
  }
  if(phase==='TARGET_PLATFORM_RUNTIME')return'RUN_TARGET_PLATFORM_RUNTIME';
  if(phase==='TARGET_PLATFORM_INDEPENDENT_QA')return'RUN_TARGET_PLATFORM_INDEPENDENT_QA';
  if(phase==='TARGET_PLATFORM_REGRESSION')return'RUN_TARGET_PLATFORM_REGRESSION';
  if(phase==='RELEASE_PROMOTION')return'PROMOTE_EXACT_VERIFIED_RELEASE';
  if(phase==='POST_RELEASE_FOCUSED_DEVELOPMENT')return'CONTINUE_ONE_FOCUSED_VERIFIED_DEVELOPMENT_CYCLE';
  return'REEVALUATE_CANONICAL_PROJECT_PHASE';
}
function projectMachineState(item={},experienceInput={},handoff=null){
  const gameId=clean(get(item,'gameId','id'));
  const platform=upper(get(item,'selectedPlatform','targetPlatform','INITIAL_TARGET_PLATFORM'))||null;
  const genre=projectGenre(item);
  const verifiedSemantic=verifiedWebSemanticContext(experienceInput,gameId);
  const phase=derivedProjectPhase(item,platform,genre);
  const released=releasedRobloxProject(item);
  return {
    gameId,
    PROJECT_PHASE:phase,
    PLATFORM:platform,
    GENRE:genre,
    WEB_BASELINE:buildWebBaselineState(item,verifiedSemantic),
    ROBLOX_HANDOFF:platform==='ROBLOX'?(handoff||{required:true,ready:false,reason:webBaselinePassed(item)?'VERIFIED_SEMANTIC_CONTEXT_INCOMPLETE':'WEB_BASELINE_NOT_VERIFIED'}):null,
    POST_RELEASE_FOCUS_RUNNER:{
      eligibleAfterRelease:platform==='ROBLOX',
      assigned:released,
      state:released?'ASSIGNED':'WAITING_FOR_VERIFIED_RELEASE',
      logicalRunnerPerProject:1,
      activeTaskMaxPerProject:1,
      sharedProtectedRunnerSlots:1,
      scheduler:'vibe2-24h-runner',
      worker:'vibe2-continuous-core',
      continuousRefill:true
    },
    LEARNING_CONTEXT:{
      authority:'VERIFIED_PLUS_TRANSFORMATIVE_RECOMBINATION_CONTEXT',
      verifiedSemanticExperienceIds:verifiedSemantic.sourceExperienceIds,
      canonicalDistillation:'vibe2-learning-runtime:company-learning/distillation-status.json',
      transformativeRecombination:'vibe2-learning-runtime:company-learning/vibe3-recombination-memory.json',
      webBaselinePortableToRoblox:true,
      rawSourceCopyAllowed:false,
      rawAssetCopyAllowed:false,
      gateBypass:false,
      continuousLearning:true
    },
    NEXT_MACHINE_ACTION:nextMachineAction(item,phase,handoff)
  };
}
function postReleaseFocusQueueTask(task={},removedIds=new Set()){
  const gameId=clean(task.gameId);
  if(!gameId||removedIds.has(gameId)||clean(task.blocker)==='lifecycle-inactive:REMOVED_PERMANENTLY')return false;
  const evidence=new Set((task.evidence||[]).map(clean));
  const historical=task.historicalDeploymentRecovery===true||evidence.has('historical-deployment-recovery:yes');
  const status=lower(task.status);
  const retryableFailed=status==='failed'&&Number(task.retries||0)<=Number(task.maxRetries??2);
  const legacyLifecycleSync=historical&&status==='cancelled'&&clean(task.blocker)==='lifecycle-inactive:MISSING_FROM_CATALOG';
  return lower(task.target)==='roblox'
    &&lower(task.department)==='development'
    &&lower(task.type)==='implementation'
    &&task.postReleaseFocused===true
    &&(['queued','running','blocked'].includes(status)||retryableFailed||legacyLifecycleSync);
}
function postReleaseFocusProjectState(task={},experienceInput={}){
  const gameId=clean(task.gameId);
  const evidence=(task.evidence||[]).map(clean);
  const evidenceSet=new Set(evidence);
  const historical=task.historicalDeploymentRecovery===true||evidenceSet.has('historical-deployment-recovery:yes');
  const status=lower(task.status);
  const verifiedSemantic=verifiedWebSemanticContext(experienceInput,gameId);
  const recipe=evidence.find(value=>value.startsWith('recombination-recipe:'))?.slice('recombination-recipe:'.length)||null;
  const runnerState=status==='running'?'RUNNING'
    :status==='queued'?'ASSIGNED'
    :status==='blocked'?'BLOCKED'
    :status==='failed'?'RECOVERY_PENDING'
    :'WAITING_FOR_LIFECYCLE_SYNC';
  const nextAction=status==='running'?'CONTINUE_POST_RELEASE_FOCUSED_GAP'
    :status==='queued'?'EXECUTE_POST_RELEASE_FOCUSED_GAP'
    :status==='blocked'?'RECOVER_OR_RESUME_POST_RELEASE_FOCUSED_GAP'
    :status==='failed'?'REQUEUE_RETRYABLE_POST_RELEASE_FOCUSED_GAP'
    :'SYNC_HISTORICAL_MAINTENANCE_LIFECYCLE';
  return {
    gameId,
    PROJECT_PHASE:'POST_RELEASE_FOCUSED_DEVELOPMENT',
    PLATFORM:'ROBLOX',
    GENRE:projectGenre(task),
    WEB_BASELINE:{
      requiredForNewPlatformLifecycle:true,
      requiredForThisMaintenanceCycle:historical?false:true,
      state:'NOT_BOUND_IN_CURRENT_COMPANY_QUEUE_SNAPSHOT',
      verified:false,
      sourcePath:null,
      evidencePath:null,
      currentCompanyWebBaselineBound:false,
      historicalDeploymentRecovery:historical,
      reason:historical?'HISTORICAL_NATIVE_MAINTENANCE_DOES_NOT_CLAIM_CURRENT_WEB_BASELINE':'CURRENT_COMPANY_WEB_BASELINE_NOT_PRESENT_IN_QUEUE_SNAPSHOT'
    },
    ROBLOX_HANDOFF:historical?{
      requiredForThisMaintenanceCycle:false,
      ready:false,
      historicalDeploymentRecovery:true,
      currentWebHandoffClaim:false,
      nativeReverificationRequired:true,
      webEvidenceSubstitutesRobloxQa:false,
      reason:'HISTORICAL_NATIVE_MAINTENANCE_USES_EXISTING_VERIFIED_ROBLOX_LINEAGE'
    }:{
      required:true,
      ready:false,
      currentWebHandoffClaim:false,
      webEvidenceSubstitutesRobloxQa:false,
      reason:'CURRENT_COMPANY_WEB_HANDOFF_NOT_PRESENT_IN_QUEUE_SNAPSHOT'
    },
    POST_RELEASE_FOCUS_RUNNER:{
      eligibleAfterRelease:true,
      assigned:['queued','running','blocked'].includes(status),
      state:runnerState,
      queueTaskId:clean(task.id)||null,
      queueStatus:status||null,
      logicalRunnerPerProject:1,
      activeTaskMaxPerProject:1,
      sharedProtectedRunnerSlots:1,
      scheduler:'vibe2-24h-runner',
      worker:'vibe2-continuous-core',
      continuousRefill:true,
      historicalDeploymentRecovery:historical
    },
    LEARNING_CONTEXT:{
      authority:'VERIFIED_PLUS_TRANSFORMATIVE_RECOMBINATION_CONTEXT',
      verifiedSemanticExperienceIds:verifiedSemantic.sourceExperienceIds,
      canonicalDistillation:'vibe2-learning-runtime:company-learning/distillation-status.json',
      transformativeRecombination:'vibe2-learning-runtime:company-learning/vibe3-recombination-memory.json',
      recombinationRecipeId:recipe,
      rawSourceCopyAllowed:false,
      rawAssetCopyAllowed:false,
      gateBypass:false,
      continuousLearning:true
    },
    NEXT_MACHINE_ACTION:nextAction
  };
}
export function buildWebRobloxHandoffs(companyQueueInput={},experienceInput={},queueInput={},roadmapInput={}){
  const removedIds=permanentProjectIds(roadmapInput);
  const items=(companyQueueInput?.items||companyQueueInput?.projects||[]).filter(item=>!removedIds.has(clean(get(item,'gameId','id'))));
  const handoffs=[];
  const handoffByGameId=new Map();
  for(const item of items){
    const platform=upper(get(item,'selectedPlatform','targetPlatform','INITIAL_TARGET_PLATFORM'));
    if(platform!=='ROBLOX'||!webBaselinePassed(item))continue;
    const gameId=clean(get(item,'gameId','id'));if(!gameId)continue;
    const verifiedSemantic=verifiedWebSemanticContext(experienceInput,gameId);
    const semantic=verifiedSemantic.values;
    const handoff={
      gameId,selectedPlatform:'ROBLOX',sourceStage:'WEB_VALIDATED_EXECUTABLE_BLUEPRINT',
      CORE_LOOP:get(item,'coreLoop','webCoreLoop','gameplayLoop')||semantic.CORE_LOOP||null,
      STATE_MODEL:get(item,'stateModel','webStateModel')||semantic.STATE_MODEL||null,
      COMBAT_AI_INTENT:get(item,'combatAiIntent','combatModel','aiModel')||semantic.COMBAT_AI_INTENT||null,
      PROGRESSION_MODEL:get(item,'progressionModel')||semantic.PROGRESSION_MODEL||null,
      ECONOMY_MEANING:get(item,'economyMeaning','economyModel')||semantic.ECONOMY_MEANING||null,
      UI_FLOW:get(item,'uiFlow')||semantic.UI_FLOW||null,
      INPUT_INTENT:get(item,'inputIntent')||semantic.INPUT_INTENT||null,
      SAVE_MEANING:get(item,'saveMeaning','saveModel')||semantic.SAVE_MEANING||null,
      CONTENT_STRUCTURE:get(item,'contentStructure')||semantic.CONTENT_STRUCTURE||null,
      BALANCE_INTENT:get(item,'balanceIntent')||semantic.BALANCE_INTENT||null,
      VERIFIED_FAILURES:get(item,'verifiedFailures','webVerifiedFailures')||[],
      VERIFIED_FIXES:get(item,'verifiedFixes','webVerifiedFixes')||[],
      WEB_RUNTIME_EVIDENCE:get(item,'webValidationPassedAt','webRuntimeEvidence')||verifiedSemantic.runtimeEvidence||null,
      discardAsImplementation:['DOM_STRUCTURE','CSS_IMPLEMENTATION','WEB_RENDERING_HACKS','WEB_ONLY_STORAGE_CODE'],
      robloxNativeReimplementationRequired:true,
      webEvidenceSubstitutesRobloxQa:false,
      verifiedSemanticExperienceIds:verifiedSemantic.sourceExperienceIds
    };
    handoff.complete=['CORE_LOOP','STATE_MODEL','PROGRESSION_MODEL','UI_FLOW','INPUT_INTENT','SAVE_MEANING','CONTENT_STRUCTURE','BALANCE_INTENT','WEB_RUNTIME_EVIDENCE'].every(k=>handoff[k]!=null);
    handoffs.push(handoff);
    handoffByGameId.set(gameId,handoff);
  }
  const companyProjects=items.map(item=>{
    const gameId=clean(get(item,'gameId','id'));
    return projectMachineState(item,experienceInput,handoffByGameId.get(gameId)||null);
  }).filter(project=>project.gameId);
  const companyProjectIds=new Set(companyProjects.map(project=>project.gameId));
  const focusStatusRank={running:0,queued:1,blocked:2,failed:3,cancelled:4};
  const focusByGameId=new Map();
  for(const task of queueInput?.tasks||[]){
    if(!postReleaseFocusQueueTask(task,removedIds))continue;
    const gameId=clean(task.gameId);
    if(companyProjectIds.has(gameId))continue;
    const existing=focusByGameId.get(gameId);
    if(!existing||Number(focusStatusRank[lower(task.status)]??99)<Number(focusStatusRank[lower(existing.status)]??99))focusByGameId.set(gameId,task);
  }
  const projects=[
    ...companyProjects,
    ...[...focusByGameId.values()].map(task=>postReleaseFocusProjectState(task,experienceInput))
  ];
  return {
    version:1,
    projectStateVersion:1,
    kind:'vibe2-web-roblox-handoffs',
    requiredProjectFields:[...PROJECT_MACHINE_FIELDS],
    projects,
    handoffs,
    gateBypass:false,
    authority:'verified-handoff-context-only'
  };
}

export function refreshLearningMotor({stateInput={},experienceInput={},codePatternsInput={},companyQueueInput={},queueInput={},roadmapInput={}}={}){
  const applied=applyVerifiedExperienceToMastery(stateInput,experienceInput);
  const patternApplied=applyVerifiedCodePatternsToMastery(applied.state,codePatternsInput);
  const strategyApplied=applyVerifiedCodingStrategyOutcomes(patternApplied.state,queueInput);
  const benchmark=buildBenchmarkLadder(strategyApplied.state);
  const idlePractice=buildIdlePracticeQueue(strategyApplied.state);
  const tournament=enrichQueueForCandidateTournaments(queueInput,strategyApplied.state);
  const practice=injectIdlePracticeTask(tournament.queue,idlePractice);
  return {
    state:strategyApplied.state,
    addedExperience:applied.added,
    addedCodePatterns:patternApplied.added,
    addedCodingStrategyOutcomes:strategyApplied.added,
    benchmark,
    idlePractice,
    handoffs:buildWebRobloxHandoffs(companyQueueInput,experienceInput,practice.queue,roadmapInput),
    queue:practice.queue,
    tournamentTasksChanged:tournament.changed,
    idlePracticeTaskAdded:practice.added,
    idlePracticeQueueChanged:practice.changed===true,
    idlePracticeDeduped:practice.deduped||0,
    idlePracticeReason:practice.reason
  };
}

function args(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const i=raw.indexOf('=');if(i<0)out[raw.slice(2)]=true;else out[raw.slice(2,i)]=raw.slice(i+1);}return out;}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const a=args();
  const stateFile=clean(a.state)||'.vibe2/learning-motor-state.json';
  const experienceFile=clean(a.experience)||'.vibe2/experience.json';
  const companyQueueFile=clean(a['company-queue'])||'development-queue.json';
  const queueFile=clean(a.queue);
  const roadmapFile=clean(a.roadmap)||'company-learning/platform-release-roadmap.json';
  const codePatternsFile=clean(a['code-patterns'])||'.vibe2/code-pattern-library.json';
  const result=refreshLearningMotor({stateInput:readJson(stateFile,{}),experienceInput:readJson(experienceFile,{records:[]}),codePatternsInput:readJson(codePatternsFile,{patterns:[]}),companyQueueInput:readJson(companyQueueFile,{items:[]}),queueInput:queueFile?readJson(queueFile,{tasks:[]}):{tasks:[]},roadmapInput:readJson(roadmapFile,{})});
  writeJson(stateFile,result.state);
  if(queueFile&&(result.tournamentTasksChanged>0||result.idlePracticeQueueChanged)) writeJson(queueFile,result.queue);
  if(clean(a.benchmark)) writeJson(a.benchmark,result.benchmark);
  if(clean(a.practice)) writeJson(a.practice,result.idlePractice);
  if(clean(a.handoff)) writeJson(a.handoff,result.handoffs);
  console.log(`VIBE2_LEARNING_MOTOR=PASS`);
  console.log(`VIBE2_MASTERY_NEW_EXPERIENCE=${result.addedExperience}`);
  console.log(`VIBE2_MASTERY_NEW_CODE_PATTERNS=${result.addedCodePatterns}`);
  console.log(`VIBE2_CODING_STRATEGY_OUTCOMES_ADDED=${result.addedCodingStrategyOutcomes||0}`);
  console.log(`VIBE2_BENCHMARK_CASES=${result.benchmark.cases.length}`);
  console.log(`VIBE2_IDLE_PRACTICE_DRILLS=${result.idlePractice.drills.length}`);
  console.log(`VIBE2_WEB_ROBLOX_HANDOFFS=${result.handoffs.handoffs.length}`);
  console.log(`VIBE2_CANDIDATE_TOURNAMENT_TASKS=${result.tournamentTasksChanged}`);
  console.log(`VIBE2_IDLE_PRACTICE_TASK_ADDED=${result.idlePracticeTaskAdded?'YES':'NO'}`);
  console.log(`VIBE2_IDLE_PRACTICE_QUEUE_CHANGED=${result.idlePracticeQueueChanged?'YES':'NO'}`);
  console.log(`VIBE2_IDLE_PRACTICE_DEDUPED=${result.idlePracticeDeduped||0}`);
  console.log(`VIBE2_IDLE_PRACTICE_REASON=${result.idlePracticeReason}`);
  console.log('VIBE2_GATE_WEAKENED=NO');
}
