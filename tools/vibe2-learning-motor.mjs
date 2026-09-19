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
    const failureFingerprints={};
    for(const [fingerprint,contextRaw] of Object.entries(row.failureFingerprints||{})){
      const context=contextRaw&&typeof contextRaw==='object'?contextRaw:{};
      const contextGames={};for(const [k,v] of Object.entries(context.games||{}))contextGames[clean(k)]=Math.max(0,Number(v)||0);
      const contextTargets={};for(const [k,v] of Object.entries(context.targets||{}))contextTargets[clean(k)]=Math.max(0,Number(v)||0);
      const contextApplications=Math.max(0,Number(context.verifiedApplications)||0);
      const failureGames={};for(const [k,v] of Object.entries(context.failureGames||{}))failureGames[clean(k)]=Math.max(0,Number(v)||0);
      const failureTargets={};for(const [k,v] of Object.entries(context.failureTargets||{}))failureTargets[clean(k)]=Math.max(0,Number(v)||0);
      const failureClasses={};for(const [k,v] of Object.entries(context.failureClasses||{}))failureClasses[clean(k).toUpperCase()]=Math.max(0,Number(v)||0);
      failureFingerprints[clean(fingerprint)]={
        verifiedApplications:contextApplications,
        firstCandidatePasses:Math.max(0,Math.min(contextApplications,Number(context.firstCandidatePasses)||0)),
        totalGenerationAttempts:Math.max(0,Number(context.totalGenerationAttempts)||0),
        verifiedFailures:Math.max(0,Number(context.verifiedFailures)||0),
        games:contextGames,
        targets:contextTargets,
        failureGames,
        failureTargets,
        failureClasses,
        lastEvidence:clean(context.lastEvidence)||null,
        lastFailureEvidence:clean(context.lastFailureEvidence)||null,
        lastUpdatedAt:clean(context.lastUpdatedAt)||null
      };
    }
    const applications=Math.max(0,Number(row.verifiedApplications)||0);
    const firstPasses=Math.max(0,Math.min(applications,Number(row.firstCandidatePasses)||0));
    strategies[clean(name)]={
      verifiedApplications:applications,
      firstCandidatePasses:firstPasses,
      totalGenerationAttempts:Math.max(0,Number(row.totalGenerationAttempts)||0),
      verifiedFailures:Math.max(0,Number(row.verifiedFailures)||0),
      games,targets,failureFingerprints,
      state:clean(row.state)||'CANDIDATE',
      lastEvidence:clean(row.lastEvidence)||null,
      lastFailureEvidence:clean(row.lastFailureEvidence)||null,
      lastUpdatedAt:clean(row.lastUpdatedAt)||null
    };
  }
  return{version:2,seenOutcomeIds:uniq(source.seenOutcomeIds||[]),seenNegativeOutcomeIds:uniq(source.seenNegativeOutcomeIds||[]),strategies};
}
function normalizeCodingCalibration(input={}){
  const source=input&&typeof input==='object'?input:{};
  const contexts={};
  for(const [key,rowRaw] of Object.entries(source.contexts||{})){
    const row=rowRaw&&typeof rowRaw==='object'?rowRaw:{};
    contexts[clean(key)]={
      verifiedSamples:Math.max(0,Number(row.verifiedSamples)||0),
      highConfidenceSamples:Math.max(0,Number(row.highConfidenceSamples)||0),
      highConfidenceFailures:Math.max(0,Number(row.highConfidenceFailures)||0),
      firstCandidatePasses:Math.max(0,Number(row.firstCandidatePasses)||0),
      semanticHardGatePasses:Math.max(0,Number(row.semanticHardGatePasses)||0),
      lastEvidence:clean(row.lastEvidence)||null,lastUpdatedAt:clean(row.lastUpdatedAt)||null
    };
  }
  return{version:1,seenOutcomeIds:uniq(source.seenOutcomeIds||[]),contexts};
}
function normalizeRegressionHotspots(input={}){
  const source=input&&typeof input==='object'?input:{};
  const entries={};
  for(const [key,rowRaw] of Object.entries(source.entries||{})){
    const row=rowRaw&&typeof rowRaw==='object'?rowRaw:{};
    entries[clean(key)]={
      gameId:clean(row.gameId)||null,target:lower(row.target)||null,kind:clean(row.kind)||null,name:clean(row.name)||null,
      verifiedRegressionFailures:Math.max(0,Number(row.verifiedRegressionFailures)||0),
      verifiedPasses:Math.max(0,Number(row.verifiedPasses)||0),
      lastFailureEvidence:clean(row.lastFailureEvidence)||null,lastPassEvidence:clean(row.lastPassEvidence)||null,lastUpdatedAt:clean(row.lastUpdatedAt)||null
    };
  }
  return{version:1,seenEventIds:uniq(source.seenEventIds||[]),entries};
}

function normalizeArchitectureDriftMemory(input={}){
  const source=input&&typeof input==='object'?input:{};
  const signals={};
  for(const [name,rowRaw] of Object.entries(source.signals||{})){
    const row=rowRaw&&typeof rowRaw==='object'?rowRaw:{};
    const games={};for(const [k,v] of Object.entries(row.games||{}))games[clean(k)]=Math.max(0,Number(v)||0);
    const failureGames={};for(const [k,v] of Object.entries(row.failureGames||{}))failureGames[clean(k)]=Math.max(0,Number(v)||0);
    const passGames={};for(const [k,v] of Object.entries(row.passGames||{}))passGames[clean(k)]=Math.max(0,Number(v)||0);
    signals[clean(name)]={observations:Math.max(0,Number(row.observations)||0),verifiedRegressionFailures:Math.max(0,Number(row.verifiedRegressionFailures)||0),verifiedPasses:Math.max(0,Number(row.verifiedPasses)||0),games,failureGames,passGames,state:clean(row.state)||'CANDIDATE',lastEvidence:clean(row.lastEvidence)||null,lastUpdatedAt:clean(row.lastUpdatedAt)||null};
  }
  return{version:1,seenEventIds:uniq(source.seenEventIds||[]),signals};
}
function normalizeCodingConstitution(input={}){
  const source=input&&typeof input==='object'?input:{};
  const rules=(source.rules||[]).filter(row=>row&&typeof row==='object').map(row=>({
    id:clean(row.id),failureFingerprint:clean(row.failureFingerprint),strategy:clean(row.strategy),state:clean(row.state)||'CANDIDATE',
    globalVerifiedApplications:Math.max(0,Number(row.globalVerifiedApplications)||0),
    contextualVerifiedApplications:Math.max(0,Number(row.contextualVerifiedApplications)||0),
    globalGameCount:Math.max(0,Number(row.globalGameCount)||0),contextualGameCount:Math.max(0,Number(row.contextualGameCount)||0),
    firstCandidatePassRatePct:Math.max(0,Number(row.firstCandidatePassRatePct)||0),
    contextualFailureRatePct:Math.max(0,Number(row.contextualFailureRatePct)||0),
    advisoryOnly:true,authorityExpanded:false
  })).filter(row=>row.id&&row.failureFingerprint&&row.strategy);
  return{version:1,rules,advisoryOnly:true,authorityExpanded:false,lastBuiltAt:clean(source.lastBuiltAt)||null};
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
    codingCalibration:normalizeCodingCalibration(seed.codingCalibration),
    regressionHotspots:normalizeRegressionHotspots(seed.regressionHotspots),
    architectureDriftMemory:normalizeArchitectureDriftMemory(seed.architectureDriftMemory),
    codingConstitution:normalizeCodingConstitution(seed.codingConstitution),
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
function verifiedCodingStrategyFailures(evidence=[]){
  const rows=[];
  for(const value of evidence||[]){
    const marker=clean(value);
    if(!marker.startsWith('coding-strategy-negative:'))continue;
    try{
      const payload=JSON.parse(decodeURIComponent(marker.slice('coding-strategy-negative:'.length)));
      if(payload?.version!==1)continue;
      if(clean(payload?.verifiedBy)!=='IMMUTABLE_WORKER_RESULT'||payload?.infrastructureFailure===true)continue;
      const strategy=clean(payload?.strategy),failureFingerprint=clean(payload?.failureFingerprint),failureClass=upper(payload?.failureClass);
      if(!strategy||!failureFingerprint||!failureClass)continue;
      rows.push({
        variant:clean(payload?.variant)||'primary',
        strategy,failureFingerprint,failureClass,
        runEvidence:clean(payload?.runEvidence)||null
      });
    }catch{}
  }
  return rows;
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
  const seenNegative=new Set(memory.seenNegativeOutcomeIds||[]);
  let added=0,negativeAdded=0;
  for(const task of queueInput?.tasks||[]){
    const evidence=(task?.evidence||[]).map(clean).filter(Boolean);
    const gameId=clean(task.gameId)||'unknown';
    const target=lower(task.target)||'unknown';
    for(const failure of verifiedCodingStrategyFailures(evidence)){
      const negativeId='coding_negative_'+hash([clean(task.id),failure.variant,failure.strategy,failure.failureFingerprint,failure.failureClass,failure.runEvidence||''].join('|'));
      if(seenNegative.has(negativeId))continue;
      const row=memory.strategies[failure.strategy]||{verifiedApplications:0,firstCandidatePasses:0,totalGenerationAttempts:0,verifiedFailures:0,games:{},targets:{},failureFingerprints:{},state:'CANDIDATE',lastEvidence:null,lastFailureEvidence:null,lastUpdatedAt:null};
      row.verifiedFailures=Math.max(0,Number(row.verifiedFailures)||0)+1;
      row.failureFingerprints=row.failureFingerprints||{};
      const contextual=row.failureFingerprints[failure.failureFingerprint]||{verifiedApplications:0,firstCandidatePasses:0,totalGenerationAttempts:0,verifiedFailures:0,games:{},targets:{},failureGames:{},failureTargets:{},failureClasses:{},lastEvidence:null,lastFailureEvidence:null,lastUpdatedAt:null};
      contextual.verifiedFailures=Math.max(0,Number(contextual.verifiedFailures)||0)+1;
      contextual.failureGames=contextual.failureGames||{};
      contextual.failureTargets=contextual.failureTargets||{};
      contextual.failureClasses=contextual.failureClasses||{};
      contextual.failureGames[gameId]=(contextual.failureGames[gameId]||0)+1;
      contextual.failureTargets[target]=(contextual.failureTargets[target]||0)+1;
      contextual.failureClasses[failure.failureClass]=(contextual.failureClasses[failure.failureClass]||0)+1;
      contextual.lastFailureEvidence=negativeId;
      contextual.lastUpdatedAt=new Date().toISOString();
      row.failureFingerprints[failure.failureFingerprint]=contextual;
      row.lastFailureEvidence=negativeId;
      row.lastUpdatedAt=new Date().toISOString();
      row.state=strategyLifecycle(row);
      memory.strategies[failure.strategy]=row;
      seenNegative.add(negativeId);
      negativeAdded+=1;
    }
    if(!evidence.includes('role-result:regression:PASS')||!evidence.includes('role-result:review:PASS')||!evidence.includes('candidate-identity:PASS'))continue;
    const strategy=lastEvidenceMarker(evidence,'coding-strategy:');
    if(!strategy)continue;
    const id=codingOutcomeIdentity(task,strategy);
    if(seen.has(id))continue;
    const firstAttempt=lastEvidenceMarker(evidence,'coding-candidate-first-attempt:')==='YES';
    const attempts=Math.max(1,Number(lastEvidenceMarker(evidence,'coding-generation-attempts:'))||1);
    const failureFingerprint=clean(lastEvidenceMarker(evidence,'coding-failure-fingerprint:'));
    const row=memory.strategies[strategy]||{verifiedApplications:0,firstCandidatePasses:0,totalGenerationAttempts:0,verifiedFailures:0,games:{},targets:{},failureFingerprints:{},state:'CANDIDATE',lastEvidence:null,lastFailureEvidence:null,lastUpdatedAt:null};
    row.verifiedApplications+=1;
    if(firstAttempt)row.firstCandidatePasses+=1;
    row.totalGenerationAttempts+=attempts;
    row.games[gameId]=(row.games[gameId]||0)+1;
    row.targets[target]=(row.targets[target]||0)+1;
    row.failureFingerprints=row.failureFingerprints||{};
    if(failureFingerprint){
      const contextual=row.failureFingerprints[failureFingerprint]||{verifiedApplications:0,firstCandidatePasses:0,totalGenerationAttempts:0,verifiedFailures:0,games:{},targets:{},failureGames:{},failureTargets:{},failureClasses:{},lastEvidence:null,lastFailureEvidence:null,lastUpdatedAt:null};
      contextual.verifiedApplications+=1;
      if(firstAttempt)contextual.firstCandidatePasses+=1;
      contextual.totalGenerationAttempts+=attempts;
      contextual.games[gameId]=(contextual.games[gameId]||0)+1;
      contextual.targets[target]=(contextual.targets[target]||0)+1;
      contextual.lastEvidence=id;
      contextual.lastUpdatedAt=new Date().toISOString();
      row.failureFingerprints[failureFingerprint]=contextual;
    }
    row.state=strategyLifecycle(row);
    row.lastEvidence=id;
    row.lastUpdatedAt=new Date().toISOString();
    memory.strategies[strategy]=row;
    seen.add(id);
    added+=1;
  }
  memory.seenOutcomeIds=[...seen].slice(-5000);
  memory.seenNegativeOutcomeIds=[...seenNegative].slice(-5000);
  state.codingStrategyMemory=memory;
  state.updatedAt=new Date().toISOString();
  return{state,added,negativeAdded};
}

function decodeEvidenceArray(evidence=[],prefix=''){
  const marker=(evidence||[]).map(clean).filter(value=>value.startsWith(prefix)).at(-1);
  if(!marker)return[];
  try{const parsed=JSON.parse(decodeURIComponent(marker.slice(prefix.length)));return Array.isArray(parsed)?uniq(parsed):[];}catch{return[];}
}
function codingVerificationOutcome(task={}){
  const evidence=(task.evidence||[]).map(clean).filter(Boolean);
  const pass=evidence.includes('role-result:regression:PASS')&&evidence.includes('role-result:review:PASS')&&evidence.includes('candidate-identity:PASS');
  const regressionFail=evidence.some(value=>value==='failure-cause:fan-in-regression-failed'||value.startsWith('failure-cause:fan-in-regression-failed:'));
  if(pass)return'PASS';
  if(regressionFail)return'REGRESSION_FAIL';
  return null;
}
function hotspotRisk(row={}){
  const failures=Math.max(0,Number(row.verifiedRegressionFailures)||0),passes=Math.max(0,Number(row.verifiedPasses)||0);
  const score=Math.max(0,failures*3-passes);
  return{score,level:failures>=3&&score>=6?'HIGH':failures>=1&&score>=2?'MEDIUM':'LOW'};
}
export function applyVerifiedCodingCalibration(stateInput={},queueInput={}){
  const state=createMasteryState(stateInput);
  const calibration=normalizeCodingCalibration(state.codingCalibration);
  const hotspots=normalizeRegressionHotspots(state.regressionHotspots);
  const seen=new Set(calibration.seenOutcomeIds||[]),hotspotSeen=new Set(hotspots.seenEventIds||[]);
  let added=0,hotspotEventsAdded=0;
  for(const task of queueInput?.tasks||[]){
    const evidence=(task?.evidence||[]).map(clean).filter(Boolean);
    const outcome=codingVerificationOutcome(task);
    if(!outcome)continue;
    const confidence=upper(lastEvidenceMarker(evidence,'coding-responsibility-confidence:'))||'LOW';
    const gameId=clean(task.gameId)||'unknown',target=lower(task.target)||'unknown';
    const run=evidence.find(value=>value.startsWith('actions-run:'))||evidence.filter(value=>value.startsWith('vibe2/candidate/')).at(-1)||clean(task.id);
    const eventId='coding_cal_'+hash([clean(task.id),run,outcome,confidence].join('|'));
    if(!seen.has(eventId)){
      const contextKeys=['target:'+target,'game:'+gameId];
      for(const key of contextKeys){
        const row=calibration.contexts[key]||{verifiedSamples:0,highConfidenceSamples:0,highConfidenceFailures:0,firstCandidatePasses:0,semanticHardGatePasses:0,lastEvidence:null,lastUpdatedAt:null};
        row.verifiedSamples+=1;
        if(confidence==='HIGH'){row.highConfidenceSamples+=1;if(outcome==='REGRESSION_FAIL')row.highConfidenceFailures+=1;}
        if(outcome==='PASS'&&lastEvidenceMarker(evidence,'coding-candidate-first-attempt:')==='YES')row.firstCandidatePasses+=1;
        if(outcome==='PASS'&&lastEvidenceMarker(evidence,'coding-semantic-diff-mode:')==='HARD_ENFORCE'&&lastEvidenceMarker(evidence,'coding-semantic-diff-pass:')==='YES')row.semanticHardGatePasses+=1;
        row.lastEvidence=eventId;row.lastUpdatedAt=new Date().toISOString();calibration.contexts[key]=row;
      }
      seen.add(eventId);added+=1;
    }
    const primaryTargets=decodeEvidenceArray(evidence,'coding-primary-targets:');
    const primarySystems=decodeEvidenceArray(evidence,'coding-primary-systems:');
    const hotspotEventId='coding_hotspot_'+hash([clean(task.id),run,outcome,primaryTargets.join(','),primarySystems.join(',')].join('|'));
    if(!hotspotSeen.has(hotspotEventId)){
      const refs=[...primaryTargets.map(name=>({kind:'SYMBOL',name})),...primarySystems.map(name=>({kind:'SYSTEM',name}))];
      for(const ref of refs){
        const key=[gameId,ref.kind,clean(ref.name)].join('|');
        const row=hotspots.entries[key]||{gameId,target,kind:ref.kind,name:clean(ref.name),verifiedRegressionFailures:0,verifiedPasses:0,lastFailureEvidence:null,lastPassEvidence:null,lastUpdatedAt:null};
        if(outcome==='REGRESSION_FAIL'){row.verifiedRegressionFailures+=1;row.lastFailureEvidence=hotspotEventId;}else{row.verifiedPasses+=1;row.lastPassEvidence=hotspotEventId;}
        row.lastUpdatedAt=new Date().toISOString();hotspots.entries[key]=row;
      }
      hotspotSeen.add(hotspotEventId);hotspotEventsAdded+=1;
    }
  }
  calibration.seenOutcomeIds=[...seen].slice(-5000);
  hotspots.seenEventIds=[...hotspotSeen].slice(-5000);
  state.codingCalibration=calibration;state.regressionHotspots=hotspots;state.updatedAt=new Date().toISOString();
  return{state,added,hotspotEventsAdded};
}
export function responsibilityCalibrationForTask({task={},stateInput={}}={}){
  const state=createMasteryState(stateInput),gameId=clean(task.gameId)||'unknown',target=lower(task.target)||'unknown';
  const gameRow=state.codingCalibration?.contexts?.['game:'+gameId]||null,targetRow=state.codingCalibration?.contexts?.['target:'+target]||null;
  const chosen=gameRow?.highConfidenceSamples>=3?gameRow:targetRow?.highConfidenceSamples>=3?targetRow:gameRow||targetRow;
  const samples=Number(chosen?.highConfidenceSamples||0),failures=Number(chosen?.highConfidenceFailures||0);
  const failureRatePct=samples?Number(((failures/samples)*100).toFixed(1)):0;
  const recommendation=samples>=3&&failureRatePct>=34?'DOWNGRADE_HIGH_TO_MEDIUM':'KEEP_RAW_CONFIDENCE';
  return{recommendation,highConfidenceSamples:samples,highConfidenceFailures:failures,highConfidenceFailureRatePct:failureRatePct,extraReadOnlyExploration:recommendation==='DOWNGRADE_HIGH_TO_MEDIUM',writableScopeExpansionAllowed:false,authorityExpanded:false};
}
export function regressionHotspotRiskForTask({task={},stateInput={}}={}){
  const state=createMasteryState(stateInput),gameId=clean(task.gameId)||'unknown';
  const entries=Object.values(state.regressionHotspots?.entries||{}).filter(row=>clean(row.gameId)===gameId).map(row=>({...row,risk:hotspotRisk(row)}));
  entries.sort((a,b)=>b.risk.score-a.risk.score||Number(b.verifiedRegressionFailures||0)-Number(a.verifiedRegressionFailures||0));
  const top=entries.slice(0,8);
  const riskLevel=top.some(row=>row.risk.level==='HIGH')?'HIGH':top.some(row=>row.risk.level==='MEDIUM')?'MEDIUM':'LOW';
  return{riskLevel,entries:top,requiresFocusedDependentQa:riskLevel!=='LOW',preferVerifiedStrategy:riskLevel!=='LOW',increaseCandidateDiversity:riskLevel==='HIGH',writableScopeExpansionAllowed:false,authorityExpanded:false};
}
export function codingRiskGuidance({calibration={},hotspot={}}={}){
  const rows=[];
  if(clean(calibration?.recommendation)==='DOWNGRADE_HIGH_TO_MEDIUM')rows.push('[RESPONSIBILITY CONFIDENCE CALIBRATION] Prior verified HIGH-confidence work regressed often enough that raw HIGH must be treated as MEDIUM; perform extra read-only exploration before writing.');
  if(clean(hotspot?.riskLevel)&&clean(hotspot.riskLevel)!=='LOW'){
    rows.push('[REGRESSION HOTSPOT MEMORY] risk='+clean(hotspot.riskLevel));
    for(const row of hotspot.entries||[])rows.push(row.kind+':'+row.name+' failures='+Number(row.verifiedRegressionFailures||0)+' passes='+Number(row.verifiedPasses||0));
    rows.push('Hotspot memory requires focused dependent QA and a proven strategy when available. It MUST NOT expand writable scope or bypass QA.');
  }
  return rows.join('\n');
}

function architectureDriftEvidence(evidence=[]){
  const status=upper(lastEvidenceMarker(evidence,'architecture-drift-status:'));
  if(status!=='ANALYZED')return null;
  const riskLevel=upper(lastEvidenceMarker(evidence,'architecture-drift-risk:'))||'LOW';
  const signals=clean(lastEvidenceMarker(evidence,'architecture-drift-signals:')).split(',').map(clean).filter(value=>value&&value!=='NONE');
  const score=Math.max(0,Number(lastEvidenceMarker(evidence,'architecture-drift-score:'))||0);
  return{riskLevel,signals:uniq(signals),score};
}
export function applyVerifiedArchitectureDriftOutcomes(stateInput={},queueInput={}){
  const state=createMasteryState(stateInput);
  const memory=normalizeArchitectureDriftMemory(state.architectureDriftMemory);
  const seen=new Set(memory.seenEventIds||[]);
  let added=0;
  for(const task of queueInput?.tasks||[]){
    const evidence=(task?.evidence||[]).map(clean).filter(Boolean);
    const drift=architectureDriftEvidence(evidence);
    const outcome=codingVerificationOutcome(task);
    if(!drift||!outcome||!drift.signals.length)continue;
    const gameId=clean(task.gameId)||'unknown';
    const run=evidence.find(value=>value.startsWith('actions-run:'))||evidence.filter(value=>value.startsWith('vibe2/candidate/')).at(-1)||clean(task.id);
    const eventId='architecture_drift_'+hash([clean(task.id),run,outcome,drift.riskLevel,drift.signals.join(',')].join('|'));
    if(seen.has(eventId))continue;
    for(const signal of drift.signals){
      const row=memory.signals[signal]||{observations:0,verifiedRegressionFailures:0,verifiedPasses:0,games:{},failureGames:{},passGames:{},state:'CANDIDATE',lastEvidence:null,lastUpdatedAt:null};
      row.observations+=1;
      row.games[gameId]=(row.games[gameId]||0)+1;
      if(outcome==='REGRESSION_FAIL'){row.verifiedRegressionFailures+=1;row.failureGames[gameId]=(row.failureGames[gameId]||0)+1;}
      else{row.verifiedPasses+=1;row.passGames[gameId]=(row.passGames[gameId]||0)+1;}
      const failureGameCount=Object.keys(row.failureGames||{}).filter(Boolean).length;
      row.state=row.verifiedRegressionFailures>=2&&failureGameCount>=2?'VERIFIED_RISK':row.observations>=2?'OBSERVED':'CANDIDATE';
      row.lastEvidence=eventId;row.lastUpdatedAt=new Date().toISOString();
      memory.signals[signal]=row;
    }
    seen.add(eventId);added+=1;
  }
  memory.seenEventIds=[...seen].slice(-5000);
  state.architectureDriftMemory=memory;state.updatedAt=new Date().toISOString();
  return{state,added};
}
export function architectureDriftRiskForTask({task={},stateInput={}}={}){
  const state=createMasteryState(stateInput),gameId=clean(task.gameId)||'unknown';
  const rows=Object.entries(state.architectureDriftMemory?.signals||{}).map(([signal,row])=>({
    signal,state:clean(row.state)||'CANDIDATE',verifiedRegressionFailures:Number(row.verifiedRegressionFailures||0),verifiedPasses:Number(row.verifiedPasses||0),
    sameGameFailures:Number(row.failureGames?.[gameId]||0),sameGamePasses:Number(row.passGames?.[gameId]||0),
    failureGameCount:Object.keys(row.failureGames||{}).filter(Boolean).length
  })).filter(row=>row.state==='VERIFIED_RISK'||row.sameGameFailures>0);
  rows.sort((a,b)=>Number(b.state==='VERIFIED_RISK')-Number(a.state==='VERIFIED_RISK')||b.sameGameFailures-a.sameGameFailures||b.verifiedRegressionFailures-a.verifiedRegressionFailures);
  const top=rows.slice(0,8);
  const riskLevel=top.some(row=>row.state==='VERIFIED_RISK'&&row.sameGameFailures>0)?'HIGH':top.length?'MEDIUM':'LOW';
  return{riskLevel,signals:top,observeOnly:true,hardReject:false,focusedReviewRequired:riskLevel!=='LOW',writableScopeExpansionAllowed:false,authorityExpanded:false};
}
export function architectureDriftGuidance(risk={}){
  if(!risk||clean(risk.riskLevel)==='LOW')return'';
  const lines=['[VERIFIED ARCHITECTURE DRIFT MEMORY - observe-first]','risk='+clean(risk.riskLevel)];
  for(const row of risk.signals||[])lines.push(row.signal+' state='+row.state+' verifiedRegressionFailures='+row.verifiedRegressionFailures+' sameGameFailures='+row.sameGameFailures);
  lines.push('Avoid repeating correlated drift when choosing the patch shape. Run focused review for affected responsibilities. This memory is observe-first and MUST NOT expand scope or bypass canonical QA.');
  return lines.join('\n');
}
export function buildCodingConstitution(stateInput={}){
  const state=createMasteryState(stateInput);
  const rules=[];
  for(const [strategy,row] of Object.entries(state.codingStrategyMemory?.strategies||{})){
    const globalApplications=Number(row.verifiedApplications||0),globalGames=Object.keys(row.games||{}).filter(Boolean).length;
    const globalFirstPassRate=globalApplications?Number(row.firstCandidatePasses||0)/globalApplications:0;
    if(clean(row.state)!=='PREFERRED'||globalApplications<5||globalGames<2||globalFirstPassRate<0.6)continue;
    for(const [fingerprint,context] of Object.entries(row.failureFingerprints||{})){
      const apps=Number(context.verifiedApplications||0),failures=Number(context.verifiedFailures||0),games=Object.keys(context.games||{}).filter(Boolean).length;
      const total=apps+failures,failureRate=total?failures/total:0;
      if(apps<3||games<2||failureRate>0.25)continue;
      rules.push({
        id:'constitution_'+hash([strategy,fingerprint].join('|')),
        failureFingerprint:fingerprint,
        strategy,
        state:'PREFERRED',
        globalVerifiedApplications:globalApplications,
        contextualVerifiedApplications:apps,
        globalGameCount:globalGames,
        contextualGameCount:games,
        firstCandidatePassRatePct:Number((globalFirstPassRate*100).toFixed(1)),
        contextualFailureRatePct:Number((failureRate*100).toFixed(1)),
        advisoryOnly:true,
        authorityExpanded:false
      });
    }
  }
  rules.sort((a,b)=>b.contextualVerifiedApplications-a.contextualVerifiedApplications||b.globalVerifiedApplications-a.globalVerifiedApplications||a.id.localeCompare(b.id));
  return{version:1,rules,lastBuiltAt:new Date().toISOString(),advisoryOnly:true,authorityExpanded:false};
}
export function codingConstitutionRuleForTask({task={},stateInput={}}={}){
  const state=createMasteryState(stateInput);
  const fingerprint=failureFingerprintForTask(task);
  const constitution=state.codingConstitution?.rules?.length?normalizeCodingConstitution(state.codingConstitution):buildCodingConstitution(state);
  const rows=(constitution.rules||[]).filter(row=>row.failureFingerprint===fingerprint&&row.state==='PREFERRED');
  rows.sort((a,b)=>b.contextualVerifiedApplications-a.contextualVerifiedApplications||b.globalVerifiedApplications-a.globalVerifiedApplications);
  const rule=rows[0]||null;
  return rule?{...rule,matched:true,writableScopeExpansionAllowed:false,qaBypassAllowed:false,authorityExpanded:false}:{matched:false,failureFingerprint:fingerprint,advisoryOnly:true,writableScopeExpansionAllowed:false,qaBypassAllowed:false,authorityExpanded:false};
}
export function codingConstitutionGuidance(rule={}){
  if(rule?.matched!==true)return'';
  return[
    '[CODING CONSTITUTION - verified contextual advisory rule]',
    'failureFingerprint='+clean(rule.failureFingerprint),
    'preferredStrategy='+clean(rule.strategy),
    'contextualVerifiedApplications='+Number(rule.contextualVerifiedApplications||0),
    'contextualGameCount='+Number(rule.contextualGameCount||0),
    'contextualFailureRatePct='+Number(rule.contextualFailureRatePct||0),
    'Use this rule to order the coding method only. It MUST NOT expand writable scope, weaken QA, change protected gameplay/save semantics, or override owner/central policy.'
  ].join('\n');
}

export function preferredCodingStrategyForTask({task={},stateInput={}}={}){
  const state=createMasteryState(stateInput);
  const rows=Object.entries(state.codingStrategyMemory?.strategies||{}).map(([strategy,row])=>({strategy,...row}));
  const eligible=rows.filter(row=>row.state==='PREFERRED');
  if(!eligible.length)return{strategy:null,state:'NO_PREFERRED_STRATEGY',evidenceApplications:0,failureFingerprint:failureFingerprintForTask(task),selectionReason:'NO_PREFERRED_STRATEGY',advisoryOnly:true,authorityExpanded:false};
  const gameId=clean(task.gameId),target=lower(task.target),failureFingerprint=failureFingerprintForTask(task);
  const contextualScore=row=>{
    const context=failureFingerprint?row.failureFingerprints?.[failureFingerprint]:null;
    const sameGameSameFailure=Number(context?.games?.[gameId]||0);
    const sameFailure=Number(context?.verifiedApplications||0);
    const sameGameSameFailureFailures=Number(context?.failureGames?.[gameId]||0);
    const sameFailureFailures=Number(context?.verifiedFailures||0);
    const sameGame=Number(row.games?.[gameId]||0);
    const sameTarget=Number(row.targets?.[target]||0);
    return sameGameSameFailure*1000+sameFailure*200+sameGame*20+sameTarget*5+Number(row.firstCandidatePasses||0)*2+Number(row.verifiedApplications||0)-sameGameSameFailureFailures*800-sameFailureFailures*120-Math.min(50,Number(row.verifiedFailures||0)*2);
  };
  eligible.sort((a,b)=>contextualScore(b)-contextualScore(a)||String(a.strategy).localeCompare(String(b.strategy)));
  const winner=eligible[0];
  const context=failureFingerprint?winner.failureFingerprints?.[failureFingerprint]:null;
  const sameGameSameFailureApplications=Number(context?.games?.[gameId]||0);
  const sameFailureApplications=Number(context?.verifiedApplications||0);
  const selectionReason=sameGameSameFailureApplications>0?'SAME_GAME_SAME_FAILURE_VERIFIED'
    :sameFailureApplications>0?'SAME_FAILURE_VERIFIED'
    :Number(winner.games?.[gameId]||0)>0?'SAME_GAME_VERIFIED'
    :Number(winner.targets?.[target]||0)>0?'SAME_TARGET_VERIFIED'
    :'GLOBAL_PREFERRED';
  return{
    strategy:winner.strategy,state:winner.state,evidenceApplications:Number(winner.verifiedApplications||0),
    firstCandidatePassRatePct:winner.verifiedApplications?Number(((winner.firstCandidatePasses/winner.verifiedApplications)*100).toFixed(1)):0,
    failureFingerprint,
    sameFailureApplications,
    sameGameSameFailureApplications,
    sameFailureVerifiedFailures:Number(context?.verifiedFailures||0),
    sameGameSameFailureVerifiedFailures:Number(context?.failureGames?.[gameId]||0),
    contextualFirstCandidatePassRatePct:context?.verifiedApplications?Number(((context.firstCandidatePasses/context.verifiedApplications)*100).toFixed(1)):0,
    sameGameApplications:Number(winner.games?.[gameId]||0),sameTargetApplications:Number(winner.targets?.[target]||0),
    selectionReason,
    contextualScore:contextualScore(winner),
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
    'failureFingerprint='+(clean(preference.failureFingerprint)||'NONE'),
    'sameFailureApplications='+Number(preference.sameFailureApplications||0),
    'sameGameSameFailureApplications='+Number(preference.sameGameSameFailureApplications||0),
    'sameFailureVerifiedFailures='+Number(preference.sameFailureVerifiedFailures||0),
    'sameGameSameFailureVerifiedFailures='+Number(preference.sameGameSameFailureVerifiedFailures||0),
    'selectionReason='+(clean(preference.selectionReason)||'GLOBAL_PREFERRED'),
    'This preference may change patch ordering but MUST NOT expand writable scope, bypass the compiled edit contract, weaken QA, or alter protected gameplay/save semantics.'
  ].join('\n');
}

function words(value=''){return new Set(lower(value).match(/[a-z0-9가-힣_]{2,}/g)||[]);}
function overlapScore(a,b){let n=0;for(const x of a)if(b.has(x))n++;return n;}


const FAILURE_FINGERPRINT_CLASSES=Object.freeze([
  ['NO_OP',/no.?op|no[-_ ]?changes|empty.?patch|unchanged/i],
  ['EDIT_MATCH',/edit.?match|match.?not.?found|replace.?target|anchor.?not.?found/i],
  ['TIMEOUT',/timeout|timed.?out|time.?limit/i],
  ['MALFORMED_OUTPUT',/malformed|invalid.?json|parse.?fail|schema.?invalid/i],
  ['MOBILE_INPUT',/mobile|touch|pointer|swipe|drag|virtual.?stick|input/i],
  ['SAVE_RESTORE',/save|load|restore|persist|storage|checkpoint|datastore/i],
  ['COMBAT',/combat|attack|damage|weapon|skill|enemy|boss/i],
  ['PLACEMENT',/placement|place.?tower|deploy|grid|slot/i],
  ['STATE_FLOW',/state.?machine|state|phase|softlock|terminal|win|lose|objective/i],
  ['RUNTIME',/runtime|exception|crash|undefined|null.?reference|hard.?failure/i],
  ['RELEASE',/release|deploy|promotion|candidate|qa.?deployment/i]
]);
function explicitFailureCodes(values=[]){
  const out=[];
  for(const value of values){
    const text=clean(value);
    for(const match of text.matchAll(/(?:runtime-failure|source-generation-failure|failure-code|blocker)[:=]([A-Za-z0-9_-]+)/gi)) out.push(upper(match[1]));
  }
  return uniq(out).sort();
}
export function failureFingerprintForTask(task={}){
  const evidence=[task.blocker,task.lastOutcome,...(task.evidence||[]),task.goal].map(clean).filter(Boolean);
  const text=evidence.join(' ');
  const explicit=explicitFailureCodes(evidence);
  const classes=FAILURE_FINGERPRINT_CLASSES.filter(([,re])=>re.test(text)).map(([name])=>name);
  const domains=inferDomains(text,task.target).filter(domain=>!['DEBUGGING','RECOVERY'].includes(domain)).sort();
  if(!explicit.length&&!classes.length&&!/fail|failure|block|repair|error|bug|오류|실패|누락/i.test(text))return null;
  if(explicit.length)return [lower(task.target)||'any',...explicit].filter(Boolean).join('|');
  return [lower(task.target)||'any',...classes,...domains].filter(Boolean).join('|');
}
function failureFingerprintForExperience(record={}){
  const values=[
    record.failureCause,record.problem,record.goal,
    ...(record.evidence||[])
  ].map(clean).filter(Boolean);
  const text=values.join(' ');
  const explicit=explicitFailureCodes(values);
  const classes=FAILURE_FINGERPRINT_CLASSES.filter(([,re])=>re.test(text)).map(([name])=>name);
  const domains=inferDomains(text,record.engine).filter(domain=>!['DEBUGGING','RECOVERY'].includes(domain)).sort();
  if(!explicit.length&&!classes.length&&!clean(record.failureCause))return null;
  if(explicit.length)return [lower(record.engine)||'any',...explicit].filter(Boolean).join('|');
  return [lower(record.engine)||'any',...classes,...domains].filter(Boolean).join('|');
}

export function retrieveUnifiedLearning({task={},experienceInput={},codePatternsInput={},playbooksInput={},practiceDistilledInput={},masteryInput={}}={}){
  const qWords=words([task.goal,task.gameId,task.target,task.genre,task.blocker,task.lastOutcome,...(task.evidence||[])].filter(Boolean).join(' '));
  const gameId=clean(task.gameId);
  const engine=lower(task.target);
  const failureFingerprint=failureFingerprintForTask(task);
  const taskFailureCodes=explicitFailureCodes([task.blocker,task.lastOutcome,...(task.evidence||[]),task.goal].map(clean).filter(Boolean));
  const ranked=(experienceInput?.records||[]).filter(r=>r?.verified===true&&r?.reusable===true).map(record=>{
    let score=0;const reasons=[];
    const recordFailureFingerprint=failureFingerprintForExperience(record);
    const recordFailureCodes=explicitFailureCodes([
      record.failureCause,record.problem,record.goal,record.change,
      ...(record.evidence||[]),...(record.avoidPatterns||[]),...(record.reusablePatterns||[])
    ].map(clean).filter(Boolean));
    const sameGame=Boolean(gameId&&clean(record.gameId)===gameId);
    const exactFailureFingerprint=Boolean(failureFingerprint&&recordFailureFingerprint===failureFingerprint);
    const sharedFailureCode=taskFailureCodes.find(code=>recordFailureCodes.includes(code))||null;
    const sameFailure=Boolean(exactFailureFingerprint||sharedFailureCode);
    if(sharedFailureCode)reasons.push('same-explicit-failure-code:'+sharedFailureCode);
    if(sameGame&&sameFailure){score+=140;reasons.push('same-game-same-failure');}
    else if(sameFailure){score+=90;reasons.push('same-failure');}
    if(sameGame){score+=40;reasons.push('same-game');}
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
    priority:['SAME_GAME_SAME_FAILURE_VERIFIED','SAME_FAILURE_VERIFIED','SAME_GAME_VERIFIED','SAME_ENGINE_VERIFIED','SYSTEM_MATCH_VERIFIED','VERIFIED_PRACTICE_DISTILLED_ADVISORY','GENERAL_PLAYBOOK'],
    failureFingerprint,
    failureLocalMemory:ranked.filter(x=>x.reasons.includes('same-game-same-failure')||x.reasons.includes('same-failure')).slice(0,5).map(x=>({id:x.record.id,gameId:x.record.gameId,engine:x.record.engine,outcome:x.record.outcome,failureCause:x.record.failureCause,reusablePatterns:x.record.reusablePatterns,avoidPatterns:x.record.avoidPatterns,relevance:x.score,reasons:x.reasons,verified:true,reusable:true})),
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
  const lines=['[VIBE VERIFIED LEARNING MOTOR]','우선순위=same-game+same-failure > same-failure > same-game > same-engine > system-match > general. 검증되지 않은 성공은 재사용하지 않는다. 실패는 검증된 원인만 회피 패턴으로 사용한다.'];
  if(context.failureFingerprint)lines.push(`- current-failure-fingerprint=${context.failureFingerprint}`);
  for(const row of context.failureLocalMemory||[]) lines.push(`- verified-failure-local=${row.id}; relevance=${row.relevance}; cause=${clean(row.failureCause)||'none'}; reuse=${(row.reusablePatterns||[]).slice(0,4).join('|')||'none'}; avoid=${(row.avoidPatterns||[]).slice(0,4).join('|')||'none'}`);
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
  const calibrationApplied=applyVerifiedCodingCalibration(strategyApplied.state,queueInput);
  const driftApplied=applyVerifiedArchitectureDriftOutcomes(calibrationApplied.state,queueInput);
  const constitution=buildCodingConstitution(driftApplied.state);
  driftApplied.state.codingConstitution=constitution;
  driftApplied.state.updatedAt=new Date().toISOString();
  const benchmark=buildBenchmarkLadder(driftApplied.state);
  const idlePractice=buildIdlePracticeQueue(driftApplied.state);
  const tournament=enrichQueueForCandidateTournaments(queueInput,driftApplied.state);
  const practice=injectIdlePracticeTask(tournament.queue,idlePractice);
  return {
    state:driftApplied.state,
    addedExperience:applied.added,
    addedCodePatterns:patternApplied.added,
    addedCodingStrategyOutcomes:strategyApplied.added,
    addedCodingStrategyNegativeOutcomes:strategyApplied.negativeAdded||0,
    addedCodingCalibrationOutcomes:calibrationApplied.added||0,
    addedRegressionHotspotEvents:calibrationApplied.hotspotEventsAdded||0,
    addedArchitectureDriftOutcomes:driftApplied.added||0,
    codingConstitutionRuleCount:constitution.rules.length,
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
  console.log(`VIBE2_CODING_STRATEGY_NEGATIVE_OUTCOMES_ADDED=${result.addedCodingStrategyNegativeOutcomes||0}`);
  console.log(`VIBE2_CODING_CALIBRATION_OUTCOMES_ADDED=${result.addedCodingCalibrationOutcomes||0}`);
  console.log(`VIBE2_REGRESSION_HOTSPOT_EVENTS_ADDED=${result.addedRegressionHotspotEvents||0}`);
  console.log(`VIBE2_ARCHITECTURE_DRIFT_OUTCOMES_ADDED=${result.addedArchitectureDriftOutcomes||0}`);
  console.log(`VIBE2_CODING_CONSTITUTION_RULES=${result.codingConstitutionRuleCount||0}`);
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
