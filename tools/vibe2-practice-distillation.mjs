// 파일명: tools/vibe2-practice-distillation.mjs
// 역할: practice 모델 답안은 원문을 저장하지 않고, 기존 verified 지식이 독립적으로 뒷받침하는 도메인 신호만 증류한다.
// 안전: raw/candidate text 저장 0, source write 0, production PASS 0, Mastery 직접 상승 0, canonical training sample 직접 생성 0.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const clean=(value)=>String(value??'').trim();
const upper=(value)=>clean(value).toUpperCase();
const uniq=(values=[])=>[...new Set((values||[]).map(clean).filter(Boolean))];
const sha256=(value)=>crypto.createHash('sha256').update(String(value)).digest('hex');
const SHA256=/^[a-f0-9]{64}$/i;
const MIN_EVIDENCE=2;
const MAX_ENTRIES=200;

const DOMAIN_PATTERNS=Object.freeze({
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
  PERFORMANCE:/performance|fps|frame|memory|cpu|jank|pool|latency/i,
  ASSET_PRODUCTION:/asset|sprite|svg|canvas|texture|animation|vfx|audio|model/i,
  STORYTELLING:/story|storytelling|서사|스토리|세계관|plot|narrative|theme|reveal|foreshadow|복선|반전|payoff|결말/i,
  NARRATIVE_STRUCTURE:/narrative.?structure|plot.?structure|story.?structure|act.?structure|scene.?structure|인과|사건.?인과|기승전결|도입|전개|클라이맥스|결말|pacing|tension|긴장/i,
  QUEST_DESIGN:/quest|퀘스트|objective.?chain|mission.?chain|prerequisite|의뢰|선행.?조건|완료.?조건|선택지|choice.?consequence/i,
  CHARACTER_ARC:/character.?arc|character.?growth|want.?need|motivation|캐릭터.?아크|인물.?변화|욕망|동기|갈등|관계.?변화/i,
  DIALOGUE:/dialogue|conversation|대화|대사|subtext|말투|화법|scene.?objective/i,
  WEB_RUNTIME:/\bweb\b|browser|html|canvas|dom|css|javascript/i,
  ROBLOX_STUDIO:/roblox|studio|luau|rbxl|rbxlx/i,
  ROBLOX_DATASTORE:/datastore|ordered.?data.?store/i,
  ROBLOX_REMOTE_SECURITY:/remoteevent|remotefunction|remote.?security|server.?validate/i,
  ROBLOX_REPLICATION:/replication|replicated|server.?client|network.?ownership/i,
  ROBLOX_MULTIPLAYER:/multiplayer|multi.?client|playeradded|players|matchmaking/i
});
const CODE_PATTERN_DOMAINS=Object.freeze({
  SAVE_PERSISTENCE:['SAVE'],
  INPUT_EVENT_BINDING:['MOBILE_INPUT','UI_STATE'],
  STATE_MACHINE:['STATE_MACHINE','CORE_LOOP'],
  AI_INTENT:['AI'],
  COMBAT_RESOLUTION:['COMBAT'],
  ECONOMY_TRANSACTION:['ECONOMY'],
  FRAME_LOOP_PERFORMANCE:['PERFORMANCE'],
  MOBILE_UI_FLOW:['MOBILE_INPUT','UI_STATE'],
  REGRESSION_REPAIR:['DEBUGGING']
});

function readJson(file,fallback={}){try{return file&&fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):fallback;}catch{return fallback;}}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}
function parseArgs(argv=process.argv.slice(2)){return Object.fromEntries(argv.filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{const [k,...v]=x.slice(2).split('=');return[k,v.join('=')]}));}
function inferDomains(text=''){const source=String(text);return Object.entries(DOMAIN_PATTERNS).filter(([,re])=>re.test(source)).map(([domain])=>domain);}
function orderDomains(order={}){
  const text=[order.originalGoal,order.goal].filter(Boolean).join('\n');
  const match=text.match(/domains=([A-Z0-9_,| -]+)/i);
  if(match){
    const explicit=match[1].split(/[,| ]+/).map(upper).filter(x=>DOMAIN_PATTERNS[x]);
    if(explicit.length)return uniq(explicit);
  }
  return uniq(inferDomains(text));
}
function candidateDomains(result={},order={}){
  const raw=[
    result.diagnosis,result.strategy,
    ...(Array.isArray(result.tests)?result.tests:[]),
    ...(Array.isArray(result.reusablePatterns)?result.reusablePatterns:[]),
    ...(Array.isArray(result.avoidPatterns)?result.avoidPatterns:[])
  ].map(clean).filter(Boolean).join(' ');
  const allowed=new Set(orderDomains(order));
  return uniq(inferDomains(raw)).filter(domain=>allowed.has(domain));
}
function boundaryReasons(result={}){
  const reasons=[];
  if(result?.practiceOnly!==true)reasons.push('PRACTICE_ONLY_REQUIRED');
  if(result?.productionPass!==false)reasons.push('PRODUCTION_PASS_MUST_BE_FALSE');
  if(result?.sourceWrite!==false)reasons.push('SOURCE_WRITE_MUST_BE_FALSE');
  if(clean(result?.knowledgeState)!=='UNTRUSTED_PRACTICE_OUTPUT')reasons.push('UNTRUSTED_PRACTICE_STATE_REQUIRED');
  if(result?.rawModelOutputStored!==false)reasons.push('RAW_OUTPUT_STORAGE_FORBIDDEN');
  if(result?.candidateLessonsVerified!==false)reasons.push('CANDIDATE_LESSON_MUST_START_UNVERIFIED');
  if(result?.retrievalEligible!==false)reasons.push('RAW_RETRIEVAL_FORBIDDEN');
  if(result?.masteryCreditEligible!==false)reasons.push('RAW_MASTERY_FORBIDDEN');
  if(result?.canonicalTrainingEligible!==false)reasons.push('RAW_TRAINING_FORBIDDEN');
  if(result?.independentVerificationRequired!==true)reasons.push('INDEPENDENT_VERIFICATION_REQUIRED');
  if(result?.distillationRequiredBeforeReuse!==true)reasons.push('DISTILLATION_REQUIRED');
  if(upper(result?.evaluation)!=='PASS')reasons.push('PRACTICE_EVALUATION_PASS_REQUIRED');
  if(!SHA256.test(clean(result?.rawModelOutputSha256)))reasons.push('RAW_OUTPUT_SHA256_REQUIRED');
  return reasons;
}
function evidenceForDomain(domain,{experienceInput={},codePatternsInput={},knowledgeInput={}}={}){
  const evidence=[];
  const patternRevisionSeen=new Set();
  for(const row of codePatternsInput?.patterns||[]){
    if(row?.verified!==true||row?.rawCodeStored===true||upper(row?.independentQa)!=='PASS')continue;
    const domains=CODE_PATTERN_DOMAINS[upper(row.system)]||inferDomains([row.system,row.pattern,...(row.tags||[])].join(' '));
    if(!domains.includes(domain))continue;
    const revision=clean(row.sourceRevision)||clean(row.id);
    if(!revision||patternRevisionSeen.has(revision))continue;
    patternRevisionSeen.add(revision);
    evidence.push('code-pattern:'+clean(row.id)+':'+revision);
  }
  const experienceGameSeen=new Set();
  for(const row of experienceInput?.records||[]){
    if(row?.verified!==true||row?.reusable!==true||clean(row.taskType).toLowerCase()==='game-study')continue;
    const domains=inferDomains([row.problem,row.goal,row.change,row.failureCause,...(row.reusablePatterns||[]),...(row.avoidPatterns||[])].join(' '));
    if(!domains.includes(domain))continue;
    const game=clean(row.gameId)||clean(row.id);
    if(!game||experienceGameSeen.has(game))continue;
    experienceGameSeen.add(game);
    evidence.push('experience:'+clean(row.id||row.fingerprint)+':'+game);
  }
  for(const row of knowledgeInput?.derived?.mergedKnowledge||[]){
    if(row?.crossGameVerified!==true)continue;
    if(!inferDomains(clean(row.pattern)).includes(domain))continue;
    for(const game of uniq(row.games||[]))evidence.push('game-study:'+game+':'+clean(row.pattern));
  }
  return uniq(evidence).slice(0,12);
}
export function validatePracticeResultForDistillation(result={}){
  const reasons=boundaryReasons(result);
  return {ok:reasons.length===0,reasons};
}
export function distillPracticeResult({result={},order={},experienceInput={},codePatternsInput={},knowledgeInput={}}={}){
  const check=validatePracticeResultForDistillation(result);
  if(!check.ok)return {version:1,kind:'vibe2-practice-distillation-result',accepted:[],rejected:[{reason:check.reasons.join('|')}],rawCandidateStored:false,authorityExpanded:false};
  const accepted=[],rejected=[];
  for(const domain of candidateDomains(result,order)){
    const verificationEvidence=evidenceForDomain(domain,{experienceInput,codePatternsInput,knowledgeInput});
    if(verificationEvidence.length<MIN_EVIDENCE){rejected.push({domain,reason:'INSUFFICIENT_VERIFIED_CORROBORATION',evidenceCount:verificationEvidence.length});continue;}
    accepted.push({
      id:'practice-distilled:'+sha256(domain+'|'+verificationEvidence.join('|')).slice(0,20),
      domain,
      verified:true,
      independentlyVerified:true,
      verificationMethod:'internal-verified-corroboration',
      verificationEvidence,
      authority:'VERIFIED_DISTILLED_PRACTICE_KNOWLEDGE',
      practiceTaskId:clean(result.taskId)||null,
      rawModelOutputSha256:clean(result.rawModelOutputSha256).toLowerCase(),
      rawModelOutputStored:false,
      candidateTextStored:false,
      advisoryOnly:true,
      retrievalEligible:true,
      directSourceWrite:false,
      directProductionPass:false,
      directReleaseEvidence:false,
      directMasteryCredit:false,
      directTrainingSample:false,
      authorityExpanded:false
    });
  }
  return {version:1,kind:'vibe2-practice-distillation-result',accepted,rejected,rawCandidateStored:false,authorityExpanded:false};
}
export function createPracticeDistilledStore(seed={}){
  const rows=Array.isArray(seed?.entries)?seed.entries:[];
  return {
    version:1,
    kind:'vibe2-practice-distilled-knowledge',
    entries:rows.slice(-MAX_ENTRIES),
    policy:{
      rawPracticeModelOutputStored:false,
      candidateTextStored:false,
      minimumTraceableVerificationEvidenceItems:MIN_EVIDENCE,
      independentVerificationRequired:true,
      retrievalAdvisoryOnly:true,
      directSourceWrite:false,
      directProductionPass:false,
      directReleaseEvidence:false,
      directMasteryCredit:false,
      directTrainingSample:false,
      verifiedProjectOutcomeStillRequiredForPositiveMasteryOrTraining:true,
      authorityExpanded:false
    },
    authorityExpanded:false
  };
}
function safeEntry(row={}){
  return row?.verified===true&&row?.independentlyVerified===true&&row?.retrievalEligible===true
    &&clean(row.authority)==='VERIFIED_DISTILLED_PRACTICE_KNOWLEDGE'
    &&row?.rawModelOutputStored===false&&row?.candidateTextStored===false
    &&Array.isArray(row.verificationEvidence)&&row.verificationEvidence.length>=MIN_EVIDENCE
    &&SHA256.test(clean(row.rawModelOutputSha256))&&DOMAIN_PATTERNS[upper(row.domain)];
}
export function mergePracticeDistillationStore(storeInput={},distillations=[]){
  const store=createPracticeDistilledStore(storeInput);
  const byDomain=new Map((store.entries||[]).filter(safeEntry).map(row=>[upper(row.domain),{...row}]));
  let accepted=0;
  for(const payload of distillations||[]){
    for(const row of payload?.accepted||[]){
      if(!safeEntry(row))continue;
      const domain=upper(row.domain);
      const cur=byDomain.get(domain);
      if(cur){
        cur.confirmations=Math.max(1,Number(cur.confirmations)||1)+1;
        cur.practiceTaskIds=uniq([...(cur.practiceTaskIds||[]),clean(row.practiceTaskId)]).slice(-20);
        cur.rawModelOutputSha256s=uniq([...(cur.rawModelOutputSha256s||[]),clean(row.rawModelOutputSha256)]).slice(-20);
        cur.verificationEvidence=uniq([...(cur.verificationEvidence||[]),...(row.verificationEvidence||[])]).slice(0,20);
        cur.updatedAt=new Date().toISOString();
      }else{
        byDomain.set(domain,{
          ...row,
          confirmations:1,
          practiceTaskIds:uniq([clean(row.practiceTaskId)]),
          rawModelOutputSha256s:uniq([clean(row.rawModelOutputSha256)]),
          createdAt:new Date().toISOString(),
          updatedAt:new Date().toISOString()
        });
      }
      accepted+=1;
    }
  }
  return {store:createPracticeDistilledStore({entries:[...byDomain.values()].slice(-MAX_ENTRIES)}),accepted};
}
export function mergePracticeFanIn(fanin={},storeInput={}){
  const distillations=(fanin?.results||[]).filter(row=>upper(row?.outcome)==='PASS'&&row?.practiceDistillation).map(row=>row.practiceDistillation);
  return mergePracticeDistillationStore(storeInput,distillations);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs();
  if(clean(args.result)){
    const payload=distillPracticeResult({
      result:readJson(clean(args.result),{}),
      order:readJson(clean(args.order),{}),
      experienceInput:readJson(clean(args.experience)||'.vibe2/experience.json',{records:[]}),
      codePatternsInput:readJson(clean(args.patterns)||'.vibe2/code-pattern-library.json',{patterns:[]}),
      knowledgeInput:readJson(clean(args.knowledge)||'.vibe2/game-study-knowledge.json',{})
    });
    writeJson(clean(args.output)||'/tmp/vibe2-practice-distillation.json',payload);
    console.log('VIBE2_PRACTICE_DISTILLED_ACCEPTED='+payload.accepted.length);
    console.log('VIBE2_PRACTICE_RAW_CANDIDATE_STORED=NO');
  }else if(clean(args.fanin)){
    const storeFile=clean(args.store)||'.vibe2/practice-distilled-knowledge.json';
    const merged=mergePracticeFanIn(readJson(clean(args.fanin),{}),readJson(storeFile,{}));
    writeJson(storeFile,merged.store);
    console.log('VIBE2_PRACTICE_DISTILLED_MERGED='+merged.accepted);
    console.log('VIBE2_PRACTICE_RAW_CANDIDATE_STORED=NO');
  }else{
    throw new Error('--result or --fanin required');
  }
}
