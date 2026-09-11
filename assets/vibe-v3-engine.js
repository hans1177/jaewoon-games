// 파일명: assets/vibe-v3-engine.js
// 역할: 기존 Vibe 개발 파이프 안에서 책임 코드 탐색, 다중 후보 경쟁, 실패 재수정, trajectory 기록을 담당한다.
// 원칙: 별도/우회 파이프를 만들지 않고 기존 검증·체크포인트·QA·회귀 게이트를 그대로 사용한다.

const clean=value=>String(value??'').trim();
const lower=value=>clean(value).toLowerCase();
const finite=(value,fallback=0)=>{const n=Number(value);return Number.isFinite(n)?n:fallback;};
const unit=value=>Math.max(0,Math.min(1,finite(value,0)));
const unique=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const tokens=value=>new Set(lower(value).split(/[^\p{L}\p{N}_./-]+/u).filter(token=>token.length>1));
const stableHash=value=>{let h=2166136261;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(36);};

export const VIBE3_POLICY=Object.freeze({
  version:3,
  mode:'existing-pipeline-intelligence-upgrade',
  sourceGraphRequired:true,
  candidateTournamentRequired:true,
  defaultCandidateCount:3,
  defaultMaxRepairAttempts:3,
  trajectoryLearningRequired:true,
  isolatedCandidateExecutionRequired:true,
  originalSourceOverwriteBeforeWinnerForbidden:true,
  existingEvidenceGateRequired:true,
  existingCheckpointAndRollbackRequired:true,
  finalAuthority:'verified-runtime-qa-regression',
});

function normalizeFile(file,index){
  const path=clean(file?.path||file?.file||file?.id||`file-${index}`);
  return Object.freeze({
    id:path,
    path,
    language:clean(file?.language),
    symbols:Object.freeze(unique(file?.symbols)),
    imports:Object.freeze(unique(file?.imports)),
    calls:Object.freeze(unique(file?.calls)),
    tests:Object.freeze(unique(file?.tests)),
    assets:Object.freeze(unique(file?.assets)),
    tags:Object.freeze(unique(file?.tags)),
  });
}

export function createVibeSourceGraph({files=[]}={}){
  const nodes=files.map(normalizeFile).filter(node=>node.path);
  const nodeIds=new Set(nodes.map(node=>node.path));
  const edges=[];
  for(const node of nodes){
    for(const target of node.imports)edges.push(Object.freeze({from:node.path,to:target,type:'import',resolved:nodeIds.has(target)}));
    for(const target of node.calls)edges.push(Object.freeze({from:node.path,to:target,type:'call-or-symbol',resolved:nodeIds.has(target)}));
    for(const target of node.tests)edges.push(Object.freeze({from:node.path,to:target,type:'test',resolved:nodeIds.has(target)}));
    for(const target of node.assets)edges.push(Object.freeze({from:node.path,to:target,type:'asset',resolved:nodeIds.has(target)}));
  }
  const digest=stableHash(JSON.stringify(nodes.map(node=>[node.path,node.symbols,node.imports,node.calls,node.tests,node.assets])));
  return Object.freeze({version:1,nodes:Object.freeze(nodes),edges:Object.freeze(edges),digest,authority:'responsibility-discovery-only'});
}

function overlapScore(left,right){
  const a=tokens(left),b=tokens(right);if(!a.size||!b.size)return 0;let hit=0;for(const token of a)if(b.has(token))hit+=1;return hit/Math.max(1,a.size);
}

export function rankVibeResponsibleSources({graph,request='',hints=[],limit=8}={}){
  if(!graph||!Array.isArray(graph.nodes))throw new Error('source graph required');
  const hintSet=new Set(unique(hints));
  const query=clean(request);
  const incoming=new Map();
  for(const edge of graph.edges||[]){
    if(!incoming.has(edge.to))incoming.set(edge.to,[]);
    incoming.get(edge.to).push(edge);
  }
  const ranked=graph.nodes.map(node=>{
    const corpus=[node.path,...node.symbols,...node.tags].join(' ');
    let score=overlapScore(query,corpus)*0.65;
    if(hintSet.has(node.path))score+=0.25;
    const related=(incoming.get(node.path)||[]).filter(edge=>hintSet.has(edge.from)).length;
    score+=Math.min(0.1,related*0.025);
    return Object.freeze({path:node.path,score:Number(Math.min(1,score).toFixed(6)),symbols:node.symbols,tests:node.tests,assets:node.assets});
  }).sort((a,b)=>b.score-a.score||a.path.localeCompare(b.path));
  return Object.freeze({version:1,graphDigest:graph.digest,request:query,candidates:Object.freeze(ranked.slice(0,Math.max(1,Math.floor(finite(limit,8))))),authority:'responsibility-ranking-only'});
}

function evidenceOf(candidate={}){
  const e=candidate.evidence||{};
  return Object.freeze({
    syntaxPass:e.syntaxPass===true,
    testsPass:e.testsPass===true,
    runtimePass:e.runtimePass===true,
    regressionPass:e.regressionPass===true,
    protectedStatePreserved:e.protectedStatePreserved===true,
    exactRevision:e.exactRevision===true,
    responsibleSource:e.responsibleSource===true,
    checkpoint:e.checkpoint===true,
    rollbackReady:e.rollbackReady===true,
    performanceScore:unit(e.performanceScore??0.5),
    qualityScore:unit(e.qualityScore??0.5),
  });
}

export function evaluateVibeCandidate(candidate={}){
  const id=clean(candidate.id||candidate.candidateId)||`candidate-${stableHash(JSON.stringify(candidate))}`;
  const evidence=evidenceOf(candidate);
  const blocked=[];
  if(!evidence.syntaxPass)blocked.push('syntax-failed');
  if(!evidence.testsPass)blocked.push('tests-failed');
  if(!evidence.runtimePass)blocked.push('runtime-failed');
  if(!evidence.regressionPass)blocked.push('regression-failed');
  if(!evidence.protectedStatePreserved)blocked.push('protected-state-changed');
  if(!evidence.exactRevision)blocked.push('exact-revision-unproven');
  if(!evidence.responsibleSource)blocked.push('responsible-source-unproven');
  if(!evidence.checkpoint)blocked.push('checkpoint-missing');
  if(!evidence.rollbackReady)blocked.push('rollback-unavailable');
  const changedFiles=Math.max(0,Math.floor(finite(candidate.changedFiles,Array.isArray(candidate.files)?candidate.files.length:0)));
  const diffBytes=Math.max(0,finite(candidate.diffBytes,0));
  const focusScore=1-Math.min(1,(Math.max(0,changedFiles-1)/8)+(diffBytes/500000));
  const verificationCore=[evidence.syntaxPass,evidence.testsPass,evidence.runtimePass,evidence.regressionPass,evidence.protectedStatePreserved,evidence.exactRevision,evidence.responsibleSource].filter(Boolean).length/7;
  const score=verificationCore*0.68+evidence.qualityScore*0.14+evidence.performanceScore*0.08+focusScore*0.10;
  return Object.freeze({
    id,
    eligible:blocked.length===0,
    score:Number(score.toFixed(6)),
    evidence,
    focusScore:Number(focusScore.toFixed(6)),
    changedFiles,
    diffBytes,
    blockedReasons:Object.freeze(blocked),
    failure:clean(candidate.failure||candidate.error),
    patchRef:clean(candidate.patchRef)||null,
    authority:'deterministic-candidate-evaluation',
  });
}

export function runVibeCandidateTournament({candidates=[],requiredCandidateCount=VIBE3_POLICY.defaultCandidateCount,minWinnerScore=0.78}={}){
  const required=Math.max(2,Math.floor(finite(requiredCandidateCount,VIBE3_POLICY.defaultCandidateCount)));
  const evaluations=candidates.map(evaluateVibeCandidate).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
  const eligible=evaluations.filter(item=>item.eligible);
  const winner=eligible[0]&&eligible[0].score>=unit(minWinnerScore)?eligible[0]:null;
  const blocked=[];
  if(evaluations.length<required)blocked.push('insufficient-independent-candidates');
  if(!eligible.length)blocked.push('no-fully-verified-candidate');
  else if(!winner)blocked.push('winner-score-below-threshold');
  return Object.freeze({
    version:1,
    requiredCandidateCount:required,
    receivedCandidateCount:evaluations.length,
    ready:blocked.length===0&&Boolean(winner),
    winner,
    evaluations:Object.freeze(evaluations),
    blockedReasons:Object.freeze(blocked),
    selectionRule:'verified-first-then-quality-performance-focus-score',
    authority:'deterministic-tournament',
  });
}

export function classifyVibeRepairFailure(value=''){
  const text=lower(typeof value==='string'?value:JSON.stringify(value||{}));
  if(/syntax|parse|unexpected token|문법/.test(text))return'SYNTAX';
  if(/test|assert|qa|회귀|regression/.test(text))return'TEST_OR_REGRESSION';
  if(/runtime|crash|exception|anr|segv|abort|실행/.test(text))return'RUNTIME';
  if(/protected|save|progression|balance|보존|세이브/.test(text))return'PROTECTED_STATE';
  if(/responsible|wrong file|책임|source/.test(text))return'RESPONSIBILITY';
  if(/performance|fps|memory|slow|렉|성능/.test(text))return'PERFORMANCE';
  return'UNKNOWN';
}

const REPAIR_ACTIONS=Object.freeze({
  SYNTAX:'repair-minimal-syntax-at-responsible-source',
  TEST_OR_REGRESSION:'trace-failing-test-to-first-responsible-change-and-repair',
  RUNTIME:'bind-runtime-stack-to-source-graph-and-repair-smallest-responsible-surface',
  PROTECTED_STATE:'rollback-protected-mutation-and-regenerate-with-explicit-locks',
  RESPONSIBILITY:'rerank-source-graph-and-regenerate-candidates-at-responsible-files',
  PERFORMANCE:'profile-hot-path-and-regenerate-with-behavior-preserving-optimization',
  UNKNOWN:'collect-more-evidence-before-next-candidate',
});

export function createVibeRepairLoop({attempts=[],maxAttempts=VIBE3_POLICY.defaultMaxRepairAttempts}={}){
  const max=Math.max(1,Math.floor(finite(maxAttempts,VIBE3_POLICY.defaultMaxRepairAttempts)));
  const normalized=(attempts||[]).map((attempt,index)=>Object.freeze({
    index:index+1,
    candidateId:clean(attempt?.candidateId||attempt?.id),
    pass:attempt?.pass===true||clean(attempt?.state).toUpperCase()==='PASS',
    failure:clean(attempt?.failure||attempt?.error||attempt?.state),
  }));
  const successful=[...normalized].reverse().find(item=>item.pass)||null;
  if(successful)return Object.freeze({version:1,state:'PASS',stop:true,nextAction:null,attempts:Object.freeze(normalized),successfulCandidateId:successful.candidateId||null,maxAttempts:max});
  const latest=normalized.at(-1)||null;
  const exhausted=normalized.length>=max;
  const failureClass=classifyVibeRepairFailure(latest?.failure||'');
  return Object.freeze({
    version:1,
    state:exhausted?'EXHAUSTED':'REPAIR_REQUIRED',
    stop:exhausted,
    nextAction:exhausted?null:REPAIR_ACTIONS[failureClass],
    failureClass,
    attempts:Object.freeze(normalized),
    attemptsRemaining:Math.max(0,max-normalized.length),
    maxAttempts:max,
    authority:'bounded-self-repair-loop',
  });
}

export function createVibeTrajectoryRecord({request='',sourceGraph=null,tournament=null,repairLoop=null,finalEvidence={},metadata={}}={}){
  const record={
    version:1,
    trajectoryId:`traj_${stableHash(`${request}|${sourceGraph?.digest||''}|${JSON.stringify(tournament?.evaluations||[])}|${JSON.stringify(repairLoop?.attempts||[])}`)}`,
    request:clean(request),
    sourceGraphDigest:clean(sourceGraph?.digest)||null,
    candidates:(tournament?.evaluations||[]).map(item=>({id:item.id,eligible:item.eligible,score:item.score,blockedReasons:[...item.blockedReasons],failure:item.failure||null,patchRef:item.patchRef||null})),
    selectedCandidateId:tournament?.winner?.id||null,
    repairAttempts:(repairLoop?.attempts||[]).map(item=>({...item})),
    outcome:tournament?.ready?'VERIFIED_WINNER':repairLoop?.state||'UNRESOLVED',
    finalEvidence:Object.freeze({...finalEvidence}),
    metadata:Object.freeze({...metadata}),
    learningUse:Object.freeze({positiveWinnerAllowed:tournament?.ready===true,failedCandidatesPreserved:true,hiddenReasoningRequired:false,observableActionsAndEvidenceOnly:true}),
    authority:'verified-development-trajectory',
  };
  return Object.freeze(record);
}

export function createVibeV3ExecutionContract({candidateCount=VIBE3_POLICY.defaultCandidateCount,maxRepairAttempts=VIBE3_POLICY.defaultMaxRepairAttempts,minWinnerScore=0.78}={}){
  return Object.freeze({
    version:3,
    policy:VIBE3_POLICY,
    sourceDiscovery:Object.freeze({buildDependencyGraph:true,rankResponsibleFiles:true,inspectSymbolsImportsCallersTestsAssets:true}),
    candidateTournament:Object.freeze({required:true,count:Math.max(2,Math.floor(finite(candidateCount,3))),isolatedExecution:true,minWinnerScore:unit(minWinnerScore),winnerRequiresSyntaxTestsRuntimeRegressionProtectedStateExactRevision:true}),
    repairLoop:Object.freeze({enabled:true,maxAttempts:Math.max(1,Math.floor(finite(maxRepairAttempts,3))),failureEvidenceFeedsNextAttempt:true,stopOnVerifiedPass:true}),
    trajectory:Object.freeze({persistSuccess:true,persistFailure:true,persistCandidateComparisons:true,feedVerifiedLearningPipeline:true}),
    integration:Object.freeze({parallelPipeline:false,reuseExistingCheckpoint:true,reuseExistingRuntimeObservation:true,reuseExistingQaAndRegression:true,reuseExistingPromotionGate:true}),
    authority:'vibe3-existing-pipeline-upgrade',
  });
}

if(typeof window!=='undefined')Object.assign(window,{
  createJaewoonVibeSourceGraph:createVibeSourceGraph,
  rankJaewoonVibeResponsibleSources:rankVibeResponsibleSources,
  runJaewoonVibeCandidateTournament:runVibeCandidateTournament,
  createJaewoonVibeRepairLoop:createVibeRepairLoop,
  createJaewoonVibeTrajectoryRecord:createVibeTrajectoryRecord,
  createJaewoonVibeV3ExecutionContract:createVibeV3ExecutionContract,
});
