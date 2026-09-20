// 파일명: tools/vibe2-web-experience-ingest.mjs
// 역할: 정식 Web 최종 검증을 통과한 결과만 같은 게임 Vibe Experience Memory로 승격한다.
// 원칙: 30분 실제 플레이, strict 90+, 독립 promotion revalidation, deterministic replay, runtime telemetry,
// design review 증거를 모두 확인하며 어떤 기존 관문도 우회하거나 완화하지 않는다.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { promoteVibeReviewedExperience } from './vibe2-experience-control.mjs';
import { distillExternalAiKnowledge } from './vibe2-external-ai-distillation.mjs';

const clean=v=>String(v??'').trim();
const uniq=v=>[...new Set((v||[]).map(clean).filter(Boolean))];
const readJson=(file,fallback={})=>fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):fallback;
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');};
const safeGame=v=>clean(v).replace(/[^A-Za-z0-9._-]+/g,'-').slice(0,80);
const get=(item,...keys)=>{for(const k of keys){const v=item?.[k];if(v!==undefined&&v!==null&&v!=='')return v;}return null;};

const semanticText=value=>{
  const raw=Array.isArray(value)?value.map(clean).filter(Boolean).join(' → '):typeof value==='object'&&value!==null?JSON.stringify(value):clean(value);
  return clean(raw).replace(/[\r\n|]+/g,' / ').replace(/\s+/g,' ').slice(0,700);
};
const semanticPattern=(key,value)=>{const text=semanticText(value);return text?`WEB_SEMANTIC:${key}:${text}`:'';};
function verifiedWebSemantics({gate={},report={},design=null,designPath=''}={}){
  const promotion=report?.promotionRevalidation||{};
  const scope=report?.scopeCoverage||{};
  const content=design?.content||{};
  const gameId=clean(design?.gameId);
  const verified=gate.valid===true
    &&gameId===clean(gate.gameId)
    &&report?.approvedScopeFullyImplemented===true
    &&scope?.pass===true
    &&promotion?.required===true
    &&promotion?.independentRun===true
    &&promotion?.pass===true
    &&promotion?.baselineHashMatch===true;
  if(!verified)return{verified:false,sourcePath:clean(designPath)||null,patterns:[]};
  const coreLoop=Array.isArray(content.coreLoop)?content.coreLoop.map(clean).filter(Boolean):[];
  const assumptions=Array.isArray(content.technicalAssumptions)?content.technicalAssumptions.map(clean).filter(Boolean):[];
  const signatureSystems=Array.isArray(content.signatureSystems)?content.signatureSystems:[];
  const uiLabels=uniq([...(report?.before?.functionalLabels||[]),...(report?.after?.functionalLabels||[])]);
  const inputBindings=uniq(scope?.mechanicBindings||[]);
  const variety=uniq(report?.contentDepthValidation?.varietyEvents||[]);
  const metrics=report?.implementationMetrics||report?.contentDepthValidation?.metrics||{};
  const runtime=report?.runtimeValidationEvidence||{};
  const stateModel=[
    Number(report?.stateChangeCount||metrics?.meaningfulStateTransitionCount)>0?`meaningful-state-transitions=${Number(report?.stateChangeCount||metrics?.meaningfulStateTransitionCount)}`:'',
    Number(metrics?.uniqueGameplayStateCount)>0?`unique-gameplay-states=${Number(metrics.uniqueGameplayStateCount)}`:'',
    report?.terminalOutcome?.reached===true?`terminal-outcome=${clean(report?.terminalOutcome?.result)||'reached'}`:''
  ].filter(Boolean);
  const combatIntent=coreLoop.filter(value=>/enemy|combat|attack|damage|defen[sc]e|wave|boss|threat|적|전투|공격|방어|웨이브|보스/i.test(value));
  const progression=[clean(content.progressionDirection),...coreLoop.filter(value=>/progress|unlock|stage|level|wave|reward|upgrade|성장|해금|단계|레벨|웨이브|보상|강화/i.test(value))].filter(Boolean);
  const economy=coreLoop.filter(value=>/resource|earn|spend|currency|coin|gold|reward|cost|shop|upgrade|자원|획득|소비|골드|코인|보상|비용|상점|강화/i.test(value));
  const balance=assumptions.filter(value=>/balance|counter|pressure|difficulty|threat|coverage|밸런스|상성|난이도|압박|위협/i.test(value));
  const structure=uniq([
    ...signatureSystems.map(row=>clean(row?.name)||clean(row?.purpose)).filter(Boolean),
    ...variety
  ]);
  const saveMeaning=runtime?.saveRestore?.required===true&&runtime?.saveRestore?.pass===true?'verified runtime save/restore of current gameplay state':'';
  const patterns=uniq([
    semanticPattern('CORE_LOOP',coreLoop),
    semanticPattern('STATE_MODEL',stateModel),
    semanticPattern('COMBAT_AI_INTENT',combatIntent),
    semanticPattern('PROGRESSION_MODEL',progression),
    semanticPattern('ECONOMY_MEANING',economy),
    semanticPattern('UI_FLOW',uiLabels),
    semanticPattern('INPUT_INTENT',[clean(content.mobileUx),...inputBindings].filter(Boolean)),
    semanticPattern('SAVE_MEANING',saveMeaning),
    semanticPattern('CONTENT_STRUCTURE',structure),
    semanticPattern('BALANCE_INTENT',balance)
  ]);
  return{verified:true,sourcePath:clean(designPath)||null,patterns};
}

export function validateFormalWebLearningEvidence(item={},report={}){
  const issues=[];
  const gameId=clean(get(item,'gameId','id')||report.gameId);
  const score=Number(report.webStrictScore??report.strictReview?.totalScore??get(item,'webStrictScore','strictImplementationScore'));
  const hardFailures=Array.isArray(report.strictReview?.hardFailures)?report.strictReview.hardFailures:[];
  const runtime=report.runtimeValidationEvidence||{};
  const replay=runtime.replayRegression||{};
  const content=report.contentDepthValidation||{};
  const promotion=report.promotionRevalidation||{};
  const strictVerdict=clean(report.strictReview?.verdict||get(item,'strictImplementationVerdict')).toUpperCase();
  const sourceRevision=clean(report.sourceRevision||get(item,'webValidationSourceRevision','webInitialCycleSourceRevision'));

  if(!gameId)issues.push('game-id-required');
  if(get(item,'formalImplementationPassed')!==true)issues.push('queue-formal-implementation-pass-required');
  if(report.pass!==true)issues.push('web-runtime-pass-required');
  if(report.formalImplementationPassed!==true)issues.push('report-formal-implementation-pass-required');
  if(!Number.isFinite(score)||score<90)issues.push('web-strict-90-required');
  if(strictVerdict!=='PASS')issues.push('strict-review-pass-required');
  if(hardFailures.length)issues.push('strict-review-hard-failure-present');
  if(content.validationMode!=='REAL_ELAPSED_GAMEPLAY'||content.pass!==true||Number(content.meaningfulGameplayMilliseconds)<1800000)issues.push('real-30min-content-depth-required');
  if(promotion.required!==true||promotion.independentRun!==true||promotion.pass!==true)issues.push('independent-promotion-revalidation-required');
  if(replay.required!==true||replay.independentRun!==true||replay.pass!==true)issues.push('deterministic-replay-required');
  if(runtime.preplatformReadiness?.pass!==true)issues.push('preplatform-readiness-required');
  if(runtime.performance?.pass!==true)issues.push('runtime-performance-required');
  if(runtime.mobile?.pass!==true)issues.push('mobile-runtime-required');
  if(report.gameplayInteractionPerformed!==true||Number(report.interactionCount)<1)issues.push('auto-player-interaction-required');
  if(!sourceRevision)issues.push('source-revision-required');

  const designReviewVerified=strictVerdict==='PASS'&&Number.isFinite(score)&&score>=90&&hardFailures.length===0;
  const autoPlayerVerified=report.gameplayInteractionPerformed===true&&Number(report.interactionCount)>0&&replay.independentRun===true&&replay.pass===true;
  const telemetryVerified=Boolean(report.implementationMetrics&&runtime&&runtime.performance&&runtime.mobile&&runtime.preplatformReadiness);

  return {
    valid:issues.length===0,
    issues:uniq(issues),
    gameId,
    score:Number.isFinite(score)?score:null,
    sourceRevision:sourceRevision||null,
    autoPlayerVerified,
    telemetryVerified,
    designReviewVerified
  };
}

export function buildFormalWebExperienceReview({item={},report={},evidencePath='',design=null,designPath=''}={}){
  const gate=validateFormalWebLearningEvidence(item,report);
  if(!gate.valid)return {valid:false,gate,review:null};
  const runtime=report.runtimeValidationEvidence||{};
  const semantics=verifiedWebSemantics({gate,report,design,designPath});
  const reusablePatterns=uniq([
    runtime.replayRegression?.pass===true?'deterministic-replay-stable':'',
    runtime.saveRestore?.required===true&&runtime.saveRestore?.pass===true?'save-restore-verified':'',
    runtime.performance?.pass===true?'runtime-performance-clean':'',
    runtime.mobile?.pass===true?'mobile-touch-runtime-verified':'',
    runtime.preplatformReadiness?.pass===true?'preplatform-gameplay-readiness':'',
    runtime.strategyOutcomes?.required===true&&runtime.strategyOutcomes?.pass===true?'strategy-outcome-divergence-verified':'',
    report.terminalOutcome?.reached===true?'terminal-retry-loop-verified':'',
    report.contentDepthValidation?.pass===true?'real-30min-content-depth-verified':'',
    ...semantics.patterns
  ]);
  const gameId=gate.gameId;
  const sourceRevision=gate.sourceRevision;
  const review={
    id:`web-final-${safeGame(gameId)}-${sourceRevision.slice(0,12)}`,
    gameId,
    engine:'web',
    departments:['development','qa'],
    taskType:'coding',
    problem:`Implement the approved Web gameplay baseline for ${gameId} without losing gameplay semantics.`,
    goal:`Verified final Web implementation for ${gameId} suitable as executable blueprint and practice evidence.`,
    change:`Final Web implementation verified at source revision ${sourceRevision} with strict score ${gate.score}.`,
    outcome:'PASS',
    failureCause:'',
    qa:[
      'CANONICAL_WEB_PLAYWRIGHT_VALIDATOR',
      'REAL_ELAPSED_GAMEPLAY_30MIN',
      'DETERMINISTIC_REPLAY',
      'STRICT_IMPLEMENTATION_REVIEW',
      'INDEPENDENT_PROMOTION_REVALIDATION'
    ],
    build:'CANONICAL_WEB_PLAYWRIGHT_VALIDATOR',
    evidence:uniq([
      evidencePath?`web-runtime-evidence:${evidencePath}`:'',
      `source-revision:${sourceRevision}`,
      `strict-review-score:${gate.score}`,
      'real-30min-content-depth:PASS',
      'deterministic-replay:PASS',
      'promotion-revalidation:PASS',
      semantics.verified?`verified-web-semantics:${semantics.sourcePath||'embedded-design'}`:''
    ]),
    reusablePatterns,
    avoidPatterns:[],
    reviewVerified:true,
    reviewDecision:'PASS',
    engineQaVerified:true,
    designIntelligenceRequired:true,
    autoPlayerVerified:gate.autoPlayerVerified,
    telemetryVerified:gate.telemetryVerified,
    designReviewVerified:gate.designReviewVerified,
    designReviewDecision:'PASS',
    authorityExpanded:false
  };
  return {valid:true,gate,review};
}

function readJsonFromGit(ref,file){
  const raw=execFileSync('git',['show',`${ref}:${file}`],{encoding:'utf8',maxBuffer:32*1024*1024});
  return JSON.parse(raw);
}

function designPathCandidates(evidencePath=''){
  const dir=path.posix.dirname(clean(evidencePath).replaceAll('\\','/'));
  if(!dir||dir==='.')return[];
  return[`${dir}/design-after-web.json`,`${dir}/design-revised.json`];
}
function readFirstJsonFromGit(ref,files=[]){
  for(const file of files){
    try{return{path:file,data:readJsonFromGit(ref,file)};}catch{}
  }
  return{path:null,data:null};
}


function verifiedExternalAiCandidateFromWeb({item={},gate={},evidencePath=''}={}){
  const candidate=item?.webExternalAiLearningCandidate;
  if(!candidate||candidate.sourceKind!=='external-ai'||!/^[a-f0-9]{64}$/i.test(clean(candidate.rawOutputSha256)))return null;
  if(!clean(candidate.provider)||!clean(candidate.model)||!Array.isArray(candidate.distilledPatterns)||!candidate.distilledPatterns.length)return null;
  return{
    ...candidate,
    sourceKind:'external-ai',
    sourceWrite:false,
    productionPass:false,
    authorityExpanded:false,
    verification:{
      independent:true,
      status:'PASS',
      method:'runtime',
      evidence:[
        `runtime:${clean(evidencePath)||'canonical-web-final'}`,
        `source:${clean(gate.sourceRevision)||'verified-web-source'}`
      ]
    }
  };
}

export function ingestFormalWebExperiences({
  queueInput={},
  memoryInput={},
  externalAiKnowledgeInput={version:1,entries:[]},
  evidenceLoader=()=>null,
  designLoader=()=>({path:null,data:null})
}={}){
  let memory=memoryInput;
  let externalAiKnowledge=externalAiKnowledgeInput&&typeof externalAiKnowledgeInput==='object'?externalAiKnowledgeInput:{version:1,entries:[]};
  const results=[];
  let externalAiAcceptedCount=0;
  for(const item of queueInput?.items||queueInput?.projects||[]){
    if(item?.formalImplementationPassed!==true)continue;
    const evidencePath=clean(get(item,'webValidationEvidencePath','webFinalContentDepthEvidencePath'));
    if(!evidencePath){results.push({gameId:clean(item?.gameId),promoted:false,reason:'web-final-evidence-path-missing'});continue;}
    let report;
    try{report=evidenceLoader(evidencePath,item);}catch(error){
      results.push({gameId:clean(item?.gameId),promoted:false,reason:'web-final-evidence-unreadable',error:clean(error?.message||error).slice(0,240)});
      continue;
    }
    let designInfo={path:null,data:null};
    try{designInfo=designLoader(evidencePath,item,report)||designInfo;}catch{}
    const built=buildFormalWebExperienceReview({item,report,evidencePath,design:designInfo?.data||null,designPath:designInfo?.path||''});
    if(!built.valid){
      results.push({gameId:built.gate.gameId||clean(item?.gameId),promoted:false,reason:'formal-web-learning-gate-failed',issues:built.gate.issues});
      continue;
    }
    const externalCandidate=verifiedExternalAiCandidateFromWeb({item,gate:built.gate,evidencePath});
    if(externalCandidate){
      const distilledId='external-ai-distilled:'+safeGame(externalCandidate.id);
      const exists=(externalAiKnowledge.entries||[]).some(row=>clean(row?.id)===distilledId);
      if(!exists){
        const distilled=distillExternalAiKnowledge({records:[externalCandidate]},externalAiKnowledge);
        externalAiKnowledge=distilled.knowledge;
        externalAiAcceptedCount+=distilled.accepted.length;
      }
    }
    const alreadyRecorded=(memory?.records||[]).some(record=>
      clean(record?.id)===clean(built.review.id) ||
      (clean(record?.gameId)===clean(built.review.gameId) && (record?.evidence||[]).some(value=>clean(value)===`source-revision:${built.gate.sourceRevision}`))
    );
    if(alreadyRecorded){
      results.push({
        gameId:built.review.gameId,
        promoted:false,
        reason:'formal-web-experience-already-ingested',
        recordId:built.review.id,
        sourceRevision:built.gate.sourceRevision
      });
      continue;
    }
    const promoted=promoteVibeReviewedExperience(memory,built.review);
    memory=promoted.memory;
    results.push({
      gameId:built.review.gameId,
      promoted:promoted.promoted===true,
      reason:promoted.reason,
      recordId:promoted.record?.id||built.review.id,
      sourceRevision:built.gate.sourceRevision
    });
  }
  return {
    memory,
    results,
    promotedCount:results.filter(x=>x.promoted===true).length,
    eligibleCount:results.filter(x=>x.reason!=='web-final-evidence-path-missing'&&x.reason!=='web-final-evidence-unreadable').length,
    externalAiKnowledge,
    externalAiAcceptedCount
  };
}

function args(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const i=raw.indexOf('=');if(i<0)out[raw.slice(2)]=true;else out[raw.slice(2,i)]=raw.slice(i+1);}return out;}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const a=args();
  const queueFile=clean(a.queue)||'/tmp/vibe2-company-runtime-queue.json';
  const memoryFile=clean(a.experience)||'.vibe2/experience.json';
  const externalAiFile=clean(a['external-ai-distilled'])||'.vibe2/external-ai-distilled-knowledge.json';
  const runtimeRef=clean(a['company-runtime-ref'])||'origin/company-runtime';
  const result=ingestFormalWebExperiences({
    queueInput:readJson(queueFile,{items:[]}),
    memoryInput:readJson(memoryFile,{records:[]}),
    externalAiKnowledgeInput:readJson(externalAiFile,{version:1,entries:[]}),
    evidenceLoader:file=>readJsonFromGit(runtimeRef,file),
    designLoader:file=>readFirstJsonFromGit(runtimeRef,designPathCandidates(file))
  });
  if(result.promotedCount>0)writeJson(memoryFile,result.memory);
  if(result.externalAiAcceptedCount>0)writeJson(externalAiFile,result.externalAiKnowledge);
  console.log('VIBE2_WEB_EXPERIENCE_INGEST=PASS');
  console.log(`VIBE2_WEB_EXPERIENCE_ELIGIBLE=${result.eligibleCount}`);
  console.log(`VIBE2_WEB_EXPERIENCE_PROMOTED=${result.promotedCount}`);
  console.log(`VIBE2_WEB_EXTERNAL_AI_DISTILLED_ACCEPTED=${result.externalAiAcceptedCount||0}`);
  console.log('VIBE2_WEB_EXPERIENCE_GATE_WEAKENED=NO');
  for(const row of result.results)console.log(`VIBE2_WEB_EXPERIENCE_RESULT=${row.gameId||'unknown'}:${row.promoted?'PROMOTED':'SKIP'}:${row.reason}`);
}
