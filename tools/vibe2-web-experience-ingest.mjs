// 파일명: tools/vibe2-web-experience-ingest.mjs
// 역할: 정식 Web 최종 검증을 통과한 결과만 같은 게임 Vibe Experience Memory로 승격한다.
// 원칙: 30분 실제 플레이, strict 90+, 독립 promotion revalidation, deterministic replay, runtime telemetry,
// design review 증거를 모두 확인하며 어떤 기존 관문도 우회하거나 완화하지 않는다.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { promoteVibeReviewedExperience } from './vibe2-experience-control.mjs';

const clean=v=>String(v??'').trim();
const uniq=v=>[...new Set((v||[]).map(clean).filter(Boolean))];
const readJson=(file,fallback={})=>fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):fallback;
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');};
const safeGame=v=>clean(v).replace(/[^A-Za-z0-9._-]+/g,'-').slice(0,80);
const get=(item,...keys)=>{for(const k of keys){const v=item?.[k];if(v!==undefined&&v!==null&&v!=='')return v;}return null;};

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

export function buildFormalWebExperienceReview({item={},report={},evidencePath=''}={}){
  const gate=validateFormalWebLearningEvidence(item,report);
  if(!gate.valid)return {valid:false,gate,review:null};
  const runtime=report.runtimeValidationEvidence||{};
  const reusablePatterns=uniq([
    runtime.replayRegression?.pass===true?'deterministic-replay-stable':'',
    runtime.saveRestore?.required===true&&runtime.saveRestore?.pass===true?'save-restore-verified':'',
    runtime.performance?.pass===true?'runtime-performance-clean':'',
    runtime.mobile?.pass===true?'mobile-touch-runtime-verified':'',
    runtime.preplatformReadiness?.pass===true?'preplatform-gameplay-readiness':'',
    runtime.strategyOutcomes?.required===true&&runtime.strategyOutcomes?.pass===true?'strategy-outcome-divergence-verified':'',
    report.terminalOutcome?.reached===true?'terminal-retry-loop-verified':'',
    report.contentDepthValidation?.pass===true?'real-30min-content-depth-verified':''
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
      'promotion-revalidation:PASS'
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

export function ingestFormalWebExperiences({
  queueInput={},
  memoryInput={},
  evidenceLoader=()=>null
}={}){
  let memory=memoryInput;
  const results=[];
  for(const item of queueInput?.items||queueInput?.projects||[]){
    if(item?.formalImplementationPassed!==true)continue;
    const evidencePath=clean(get(item,'webValidationEvidencePath','webFinalContentDepthEvidencePath'));
    if(!evidencePath){results.push({gameId:clean(item?.gameId),promoted:false,reason:'web-final-evidence-path-missing'});continue;}
    let report;
    try{report=evidenceLoader(evidencePath,item);}catch(error){
      results.push({gameId:clean(item?.gameId),promoted:false,reason:'web-final-evidence-unreadable',error:clean(error?.message||error).slice(0,240)});
      continue;
    }
    const built=buildFormalWebExperienceReview({item,report,evidencePath});
    if(!built.valid){
      results.push({gameId:built.gate.gameId||clean(item?.gameId),promoted:false,reason:'formal-web-learning-gate-failed',issues:built.gate.issues});
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
    eligibleCount:results.filter(x=>x.reason!=='web-final-evidence-path-missing'&&x.reason!=='web-final-evidence-unreadable').length
  };
}

function args(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const i=raw.indexOf('=');if(i<0)out[raw.slice(2)]=true;else out[raw.slice(2,i)]=raw.slice(i+1);}return out;}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const a=args();
  const queueFile=clean(a.queue)||'/tmp/vibe2-company-runtime-queue.json';
  const memoryFile=clean(a.experience)||'.vibe2/experience.json';
  const runtimeRef=clean(a['company-runtime-ref'])||'origin/company-runtime';
  const result=ingestFormalWebExperiences({
    queueInput:readJson(queueFile,{items:[]}),
    memoryInput:readJson(memoryFile,{records:[]}),
    evidenceLoader:file=>readJsonFromGit(runtimeRef,file)
  });
  if(result.promotedCount>0)writeJson(memoryFile,result.memory);
  console.log('VIBE2_WEB_EXPERIENCE_INGEST=PASS');
  console.log(`VIBE2_WEB_EXPERIENCE_ELIGIBLE=${result.eligibleCount}`);
  console.log(`VIBE2_WEB_EXPERIENCE_PROMOTED=${result.promotedCount}`);
  console.log('VIBE2_WEB_EXPERIENCE_GATE_WEAKENED=NO');
  for(const row of result.results)console.log(`VIBE2_WEB_EXPERIENCE_RESULT=${row.gameId||'unknown'}:${row.promoted?'PROMOTED':'SKIP'}:${row.reason}`);
}
