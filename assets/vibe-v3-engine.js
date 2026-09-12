// 파일명: assets/vibe-v3-engine.js
// 역할: 기존 Vibe 개발 파이프 안에서 책임 코드 탐색, 검증 기억 검색, 다중 후보 경쟁, 실패 재수정, trajectory 기록을 담당한다.
// 원칙: 별도/우회 파이프를 만들지 않고 기존 검증·체크포인트·QA·회귀·증류 게이트를 그대로 사용한다.

const clean=value=>String(value??'').trim();
const lower=value=>clean(value).toLowerCase();
const upper=value=>clean(value).toUpperCase();
const finite=(value,fallback=0)=>{const n=Number(value);return Number.isFinite(n)?n:fallback;};
const unit=value=>Math.max(0,Math.min(1,finite(value,0)));
const unique=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const tokens=value=>new Set(lower(value).split(/[^\p{L}\p{N}_./-]+/u).filter(token=>token.length>1));
const stableHash=value=>{let h=2166136261;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(36);};
const clampCandidateCount=value=>Math.max(3,Math.min(5,Math.floor(finite(value,5))));

export const VIBE3_POLICY=Object.freeze({
  version:3,
  mode:'existing-pipeline-intelligence-upgrade',
  pumpMode:true,
  verifiedRagRequired:true,
  failureMemoryRequired:true,
  taskPlaybookRequired:true,
  sourceGraphRequired:true,
  candidateTournamentRequired:true,
  minCandidateCount:3,
  maxCandidateCount:5,
  defaultCandidateCount:5,
  defaultMaxRepairAttempts:3,
  trajectoryLearningRequired:true,
  portableCrossPlatformContextRequired:true,
  platformEvidenceTransferForbidden:true,
  isolatedCandidateExecutionRequired:true,
  originalSourceOverwriteBeforeWinnerForbidden:true,
  existingEvidenceGateRequired:true,
  existingCheckpointAndRollbackRequired:true,
  benchmarkCountsAsTrainingSample:false,
  localWeightsRequiredForPump:false,
  githubHostedModelTrainingAllowed:false,
  paidApiRequired:false,
  finalAuthority:'verified-runtime-qa-regression',
});

function normalizeFile(file,index){
  const path=clean(file?.path||file?.file||file?.id||`file-${index}`);
  return Object.freeze({id:path,path,language:clean(file?.language),symbols:Object.freeze(unique(file?.symbols)),imports:Object.freeze(unique(file?.imports)),calls:Object.freeze(unique(file?.calls)),tests:Object.freeze(unique(file?.tests)),assets:Object.freeze(unique(file?.assets)),tags:Object.freeze(unique(file?.tags))});
}

export function createVibeSourceGraph({files=[]}={}){
  const nodes=files.map(normalizeFile).filter(node=>node.path),nodeIds=new Set(nodes.map(node=>node.path)),edges=[];
  for(const node of nodes){
    for(const target of node.imports)edges.push(Object.freeze({from:node.path,to:target,type:'import',resolved:nodeIds.has(target)}));
    for(const target of node.calls)edges.push(Object.freeze({from:node.path,to:target,type:'call-or-symbol',resolved:nodeIds.has(target)}));
    for(const target of node.tests)edges.push(Object.freeze({from:node.path,to:target,type:'test',resolved:nodeIds.has(target)}));
    for(const target of node.assets)edges.push(Object.freeze({from:node.path,to:target,type:'asset',resolved:nodeIds.has(target)}));
  }
  const digest=stableHash(JSON.stringify(nodes.map(node=>[node.path,node.symbols,node.imports,node.calls,node.tests,node.assets])));
  return Object.freeze({version:1,nodes:Object.freeze(nodes),edges:Object.freeze(edges),digest,authority:'responsibility-discovery-only'});
}

function overlapScore(left,right){const a=tokens(left),b=tokens(right);if(!a.size||!b.size)return 0;let hit=0;for(const token of a)if(b.has(token))hit+=1;return hit/Math.max(1,a.size);}

export function rankVibeResponsibleSources({graph,request='',hints=[],limit=8}={}){
  if(!graph||!Array.isArray(graph.nodes))throw new Error('source graph required');
  const hintSet=new Set(unique(hints)),query=clean(request),incoming=new Map();
  for(const edge of graph.edges||[]){if(!incoming.has(edge.to))incoming.set(edge.to,[]);incoming.get(edge.to).push(edge);}
  const ranked=graph.nodes.map(node=>{
    const corpus=[node.path,...node.symbols,...node.tags].join(' ');let score=overlapScore(query,corpus)*0.65;
    if(hintSet.has(node.path))score+=0.25;
    score+=Math.min(0.1,(incoming.get(node.path)||[]).filter(edge=>hintSet.has(edge.from)).length*0.025);
    return Object.freeze({path:node.path,score:Number(Math.min(1,score).toFixed(6)),symbols:node.symbols,tests:node.tests,assets:node.assets});
  }).sort((a,b)=>b.score-a.score||a.path.localeCompare(b.path));
  return Object.freeze({version:1,graphDigest:graph.digest,request:query,candidates:Object.freeze(ranked.slice(0,Math.max(1,Math.floor(finite(limit,8))))),authority:'responsibility-ranking-only'});
}

function normalizedQa(record={}){const qa=record.qa||record.verification?.trace||record.verification||{};return{independentQa:upper(qa.independentQa??record.independentQa),browserQa:upper(qa.browserQa??record.browserQa),runtime:upper(qa.runtime??record.runtime)};}
function sourceKind(record={}){return lower(record.provenance?.sourceKind??record.sourceKind);}
function isVerifiedMemoryPositive(record={}){
  if(lower(record.lifecycle||'active')!=='active')return false;
  const qa=normalizedQa(record),task=lower(record.taskType),source=sourceKind(record),revision=clean(record.provenance?.sourceRevision??record.sourceRevision??record.sourceCommit);
  if(!revision||qa.runtime!=='PASS')return false;
  if(task==='unity'||task==='roblox'||task==='fortnite_uefn')return qa.independentQa==='PASS'&&qa.browserQa==='NOT_APPLICABLE';
  if(task==='qa'&&source==='external-black-box')return qa.independentQa==='BLACK_BOX_EVIDENCE_PASS'&&qa.browserQa==='NOT_APPLICABLE';
  return qa.independentQa==='PASS'&&qa.browserQa==='PASS';
}
function fullTrajectoryPass(record={}){const e=record.finalEvidence||{},runtimePass=e.runtimePass===true||e.runtimePassed===true;return upper(record.outcome)==='VERIFIED_WINNER'&&runtimePass&&e.qaPassed===true&&e.regressionPassed===true&&e.exactRevision===true&&e.protectedStatePreserved!==false;}
function memoryCorpus(entry={}){return [entry.taskType,entry.project,entry.request,entry.instruction,entry.input,entry.output,...(entry.sourcePaths||[]),...(entry.tags||[])].join(' ');}
function inferPortableTags(record={},sourcePaths=[]){
  const corpus=lower([record.request,record.instruction,record.goal,record.input,record.output,record.metadata?.winnerOutput,...sourcePaths].join(' '));
  const tags=[];
  if(sourcePaths.some(path=>lower(path).startsWith('web-games/'))||/\bwebgame\b|web game|browser|html|javascript|canvas|dom/.test(corpus))tags.push('webgame');
  if(/touch|pointer|tap|swipe|drag|조이스틱|터치/.test(corpus))tags.push('touch-input');
  if(/mobile|small screen|safe area|viewport|모바일/.test(corpus))tags.push('mobile-ui');
  if(/canvas/.test(corpus))tags.push('canvas');
  if(/localstorage|save|load|rejoin|resume|세이브|저장|불러오기/.test(corpus))tags.push('save-load');
  if(/performance|fps|memory|frame|성능|렉/.test(corpus))tags.push('performance');
  if(/responsive|aspect ratio|viewport|가로|세로/.test(corpus))tags.push('responsive');
  if(/regression|회귀/.test(corpus))tags.push('regression');
  if(/core loop|core-loop|핵심루프/.test(corpus))tags.push('core-loop');
  return unique(tags);
}
function normalizeMemoryEntry(record={},kind='sample',index=0){
  const taskType=lower(record.taskType||record.metadata?.taskType||'general'),project=clean(record.project||record.gameId||record.metadata?.project||'shared');
  const request=clean(record.request||record.instruction||record.goal),sourcePaths=unique([record.sourcePath,...(record.sourcePaths||[]),record.metadata?.sourcePath,...(record.metadata?.sourcePaths||[])]);
  const revision=clean(record.provenance?.sourceRevision??record.sourceRevision??record.sourceCommit??record.finalEvidence?.sourceRevision);
  const id=clean(record.sampleId||record.trajectoryId||record.candidateId)||`${kind}_${stableHash(`${kind}|${index}|${revision}|${request}`)}`;
  const tags=unique([...(record.tags||[]),...(record.metadata?.tags||[]),...inferPortableTags(record,sourcePaths)]);
  return Object.freeze({id,kind,taskType,project,request,instruction:clean(record.instruction),input:clean(record.input),output:clean(record.output||record.metadata?.winnerOutput),sourcePaths:Object.freeze(sourcePaths),sourceRevision:revision||null,tags:Object.freeze(tags),authority:'verified-memory-entry'});
}
function normalizeFailureEntry(record={},index=0){
  const failure=clean(record.failure||record.error||record.reason||record.message||record.state||'unknown-failure'),sourcePaths=unique([record.sourcePath,...(record.sourcePaths||[])]),tags=inferPortableTags(record,sourcePaths);
  return Object.freeze({id:clean(record.id||record.candidateId)||`failure_${stableHash(`${index}|${failure}|${record.sourcePath||''}`)}`,kind:'failure-warning',taskType:lower(record.taskType||'general'),project:clean(record.project||record.gameId||'shared'),request:clean(record.request||record.goal),failure,failureClass:clean(record.failureClass)||classifyVibeRepairFailure(failure),sourcePaths:Object.freeze(sourcePaths),tags:Object.freeze(tags),authority:'warning-memory-only',positiveTrainingAllowed:false});
}

export function buildVibeVerifiedMemoryIndex({trainingSamples=[],trajectories=[],failures=[]}={}){
  const positives=[];
  trainingSamples.forEach((record,index)=>{if(isVerifiedMemoryPositive(record))positives.push(normalizeMemoryEntry(record,'verified-sample',index));});
  trajectories.forEach((record,index)=>{if(fullTrajectoryPass(record))positives.push(normalizeMemoryEntry(record,'verified-trajectory',index));});
  const positiveById=new Map();for(const item of positives)positiveById.set(item.id,item);
  const warnings=[];
  failures.forEach((record,index)=>warnings.push(normalizeFailureEntry(record,index)));
  trajectories.forEach((record,index)=>{for(const [candidateIndex,candidate] of (record.candidates||[]).entries())if(candidate.eligible!==true||candidate.failure)warnings.push(normalizeFailureEntry({...candidate,request:record.request,taskType:record.metadata?.taskType,project:record.metadata?.project,sourcePaths:record.metadata?.sourcePaths,tags:record.metadata?.tags},index*100+candidateIndex));});
  const warningById=new Map();for(const item of warnings)warningById.set(item.id,item);
  return Object.freeze({version:2,generation:'V3-PUMP',positive:Object.freeze([...positiveById.values()].sort((a,b)=>a.id.localeCompare(b.id))),failureWarnings:Object.freeze([...warningById.values()].sort((a,b)=>a.id.localeCompare(b.id))),policy:Object.freeze({verifiedPositiveOnly:true,failuresNeverPromotedAsPositive:true,benchmarkCountsAsTrainingSample:false,portableContextMayCrossPlatforms:true,platformEvidenceMayNotTransfer:true}),authority:'verified-rag-memory-index'});
}

function rankMemory(query,entry,{taskType='',project='',sourcePaths=[]}={}){
  let score=overlapScore(query,memoryCorpus(entry))*0.7;
  if(taskType&&entry.taskType===lower(taskType))score+=0.15;
  if(project&&entry.project===clean(project))score+=0.1;
  const wanted=new Set(unique(sourcePaths));if(entry.sourcePaths?.some(path=>wanted.has(path)))score+=0.05;
  return Number(Math.min(1,score).toFixed(6));
}

export function retrieveVibeVerifiedPatterns({index,request='',taskType='',project='',sourcePaths=[],topKSuccess=5,topKFailure=3}={}){
  if(index?.authority!=='verified-rag-memory-index')throw new Error('verified memory index required');
  const query=clean(request);
  const rank=(rows,limit)=>rows.map(entry=>Object.freeze({entry,score:rankMemory(query,entry,{taskType,project,sourcePaths})})).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||a.entry.id.localeCompare(b.entry.id)).slice(0,Math.max(0,Math.floor(finite(limit,0))));
  return Object.freeze({version:1,query,successes:Object.freeze(rank(index.positive,topKSuccess)),failureWarnings:Object.freeze(rank(index.failureWarnings,topKFailure)),useRule:'reuse-verified-patterns-and-avoid-observed-failures-without-transferring-platform-pass-evidence',authority:'retrieval-context-only'});
}

const PLAYBOOK_BASE=Object.freeze({
  coding:Object.freeze(['rank-responsible-source-before-edit','generate-3-to-5-independent-candidates','prefer-smallest-behavior-preserving-diff','run-syntax-tests-runtime-regression']),
  bugfix:Object.freeze(['reproduce-or-bind-failure-evidence','trace-failure-to-responsible-source','repair-smallest-surface','rerun-original-failure-and-regression']),
  qa:Object.freeze(['bind-exact-revision','separate-launch-from-real-success','preserve-positive-and-negative-boundaries','require-observed-runtime-evidence']),
  unity:Object.freeze(['bind-current-source-tree-and-build','require-android-runtime-pass','require-independent-qa','preserve-save-and-core-design-lock']),
  roblox:Object.freeze(['reuse-portable-web-mobile-save-regression-patterns-as-context-only','bind-roblox-source-and-place','separate-server-client-authority','validate-remotes-and-datastore-boundaries','run-real-roblox-runtime-and-independent-qa','verify-save-rejoin-and-mobile-ui-when-applicable','publish-only-after-exact-revision-pass']),
  fortnite_uefn:Object.freeze(['reuse-portable-shared-patterns-as-context-only','bind-uefn-source-and-project','validate-verse-and-uefn-runtime','require-independent-qa-and-publishing-evidence','publish-only-after-exact-revision-pass']),
  graphics:Object.freeze(['rights-gate-before-derivative','never-overwrite-original','generate-3-to-5-derived-variants','score-style-silhouette-quality-animation-mobile-performance']),
  planning:Object.freeze(['retrieve-verified-project-patterns','preserve-owner-and-design-locks','compare-alternatives','separate-evidence-from-inference']),
  general:Object.freeze(['retrieve-verified-success-and-failure-memory','rank-responsible-context','compare-candidates','require-verifiable-completion']),
});

export function createVibeTaskPlaybook({taskType='general',retrieval=null,sourceRanking=null}={}){
  const type=Object.prototype.hasOwnProperty.call(PLAYBOOK_BASE,lower(taskType))?lower(taskType):'general';
  return Object.freeze({version:2,taskType:type,checklist:PLAYBOOK_BASE[type],reuse:Object.freeze((retrieval?.successes||[]).map(item=>({id:item.entry.id,score:item.score,project:item.entry.project,sourceRevision:item.entry.sourceRevision,sourceTaskType:item.entry.taskType,tags:item.entry.tags,portableContextOnly:item.entry.taskType!==type}))),avoid:Object.freeze((retrieval?.failureWarnings||[]).map(item=>({id:item.entry.id,score:item.score,failureClass:item.entry.failureClass,failure:item.entry.failure,sourceTaskType:item.entry.taskType,tags:item.entry.tags,portableContextOnly:item.entry.taskType!==type}))),responsibleSources:Object.freeze((sourceRanking?.candidates||[]).map(item=>({path:item.path,score:item.score}))),platformEvidenceTransferAllowed:false,authority:'verified-task-playbook'});
}

function evidenceOf(candidate={}){const e=candidate.evidence||{};return Object.freeze({syntaxPass:e.syntaxPass===true,testsPass:e.testsPass===true,runtimePass:e.runtimePass===true,regressionPass:e.regressionPass===true,protectedStatePreserved:e.protectedStatePreserved===true,exactRevision:e.exactRevision===true,responsibleSource:e.responsibleSource===true,checkpoint:e.checkpoint===true,rollbackReady:e.rollbackReady===true,performanceScore:unit(e.performanceScore??0.5),qualityScore:unit(e.qualityScore??0.5)});}

export function evaluateVibeCandidate(candidate={}){
  const id=clean(candidate.id||candidate.candidateId)||`candidate-${stableHash(JSON.stringify(candidate))}`,evidence=evidenceOf(candidate),blocked=[];
  if(!evidence.syntaxPass)blocked.push('syntax-failed');if(!evidence.testsPass)blocked.push('tests-failed');if(!evidence.runtimePass)blocked.push('runtime-failed');if(!evidence.regressionPass)blocked.push('regression-failed');if(!evidence.protectedStatePreserved)blocked.push('protected-state-changed');if(!evidence.exactRevision)blocked.push('exact-revision-unproven');if(!evidence.responsibleSource)blocked.push('responsible-source-unproven');if(!evidence.checkpoint)blocked.push('checkpoint-missing');if(!evidence.rollbackReady)blocked.push('rollback-unavailable');
  const changedFiles=Math.max(0,Math.floor(finite(candidate.changedFiles,Array.isArray(candidate.files)?candidate.files.length:0))),diffBytes=Math.max(0,finite(candidate.diffBytes,0)),focusScore=1-Math.min(1,(Math.max(0,changedFiles-1)/8)+(diffBytes/500000)),verificationCore=[evidence.syntaxPass,evidence.testsPass,evidence.runtimePass,evidence.regressionPass,evidence.protectedStatePreserved,evidence.exactRevision,evidence.responsibleSource].filter(Boolean).length/7,score=verificationCore*0.68+evidence.qualityScore*0.14+evidence.performanceScore*0.08+focusScore*0.10;
  return Object.freeze({id,eligible:blocked.length===0,score:Number(score.toFixed(6)),evidence,focusScore:Number(focusScore.toFixed(6)),changedFiles,diffBytes,blockedReasons:Object.freeze(blocked),failure:clean(candidate.failure||candidate.error),patchRef:clean(candidate.patchRef)||null,authority:'deterministic-candidate-evaluation'});
}

export function runVibeCandidateTournament({candidates=[],requiredCandidateCount=VIBE3_POLICY.defaultCandidateCount,minWinnerScore=0.78}={}){
  const required=clampCandidateCount(requiredCandidateCount),evaluations=candidates.map(evaluateVibeCandidate).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)),eligible=evaluations.filter(item=>item.eligible),winner=eligible[0]&&eligible[0].score>=unit(minWinnerScore)?eligible[0]:null,blocked=[];
  if(evaluations.length<required)blocked.push('insufficient-independent-candidates');if(!eligible.length)blocked.push('no-fully-verified-candidate');else if(!winner)blocked.push('winner-score-below-threshold');
  return Object.freeze({version:1,requiredCandidateCount:required,receivedCandidateCount:evaluations.length,ready:blocked.length===0&&Boolean(winner),winner,evaluations:Object.freeze(evaluations),blockedReasons:Object.freeze(blocked),selectionRule:'verified-first-then-quality-performance-focus-score',authority:'deterministic-tournament'});
}

export function classifyVibeRepairFailure(value=''){const text=lower(typeof value==='string'?value:JSON.stringify(value||{}));if(/syntax|parse|unexpected token|문법/.test(text))return'SYNTAX';if(/test|assert|qa|회귀|regression/.test(text))return'TEST_OR_REGRESSION';if(/runtime|crash|exception|anr|segv|abort|실행/.test(text))return'RUNTIME';if(/protected|save|progression|balance|보존|세이브/.test(text))return'PROTECTED_STATE';if(/responsible|wrong file|책임|source/.test(text))return'RESPONSIBILITY';if(/performance|fps|memory|slow|렉|성능/.test(text))return'PERFORMANCE';return'UNKNOWN';}
const REPAIR_ACTIONS=Object.freeze({SYNTAX:'repair-minimal-syntax-at-responsible-source',TEST_OR_REGRESSION:'trace-failing-test-to-first-responsible-change-and-repair',RUNTIME:'bind-runtime-stack-to-source-graph-and-repair-smallest-responsible-surface',PROTECTED_STATE:'rollback-protected-mutation-and-regenerate-with-explicit-locks',RESPONSIBILITY:'rerank-source-graph-and-regenerate-candidates-at-responsible-files',PERFORMANCE:'profile-hot-path-and-regenerate-with-behavior-preserving-optimization',UNKNOWN:'collect-more-evidence-before-next-candidate'});

export function createVibeRepairLoop({attempts=[],maxAttempts=VIBE3_POLICY.defaultMaxRepairAttempts}={}){
  const max=Math.max(1,Math.min(3,Math.floor(finite(maxAttempts,VIBE3_POLICY.defaultMaxRepairAttempts)))),normalized=(attempts||[]).map((attempt,index)=>Object.freeze({index:index+1,candidateId:clean(attempt?.candidateId||attempt?.id),pass:attempt?.pass===true||upper(attempt?.state)==='PASS',failure:clean(attempt?.failure||attempt?.error||attempt?.state)})),successful=[...normalized].reverse().find(item=>item.pass)||null;
  if(successful)return Object.freeze({version:1,state:'PASS',stop:true,nextAction:null,attempts:Object.freeze(normalized),successfulCandidateId:successful.candidateId||null,maxAttempts:max});
  const latest=normalized.at(-1)||null,exhausted=normalized.length>=max,failureClass=classifyVibeRepairFailure(latest?.failure||'');
  return Object.freeze({version:1,state:exhausted?'EXHAUSTED':'REPAIR_REQUIRED',stop:exhausted,nextAction:exhausted?null:REPAIR_ACTIONS[failureClass],failureClass,attempts:Object.freeze(normalized),attemptsRemaining:Math.max(0,max-normalized.length),maxAttempts:max,authority:'bounded-self-repair-loop'});
}

export function createVibeTrajectoryRecord({request='',sourceGraph=null,tournament=null,repairLoop=null,finalEvidence={},metadata={}}={}){
  const record={version:1,trajectoryId:`traj_${stableHash(`${request}|${sourceGraph?.digest||''}|${JSON.stringify(tournament?.evaluations||[])}|${JSON.stringify(repairLoop?.attempts||[])}`)}`,request:clean(request),sourceGraphDigest:clean(sourceGraph?.digest)||null,candidates:(tournament?.evaluations||[]).map(item=>({id:item.id,eligible:item.eligible,score:item.score,blockedReasons:[...item.blockedReasons],failure:item.failure||null,patchRef:item.patchRef||null})),selectedCandidateId:tournament?.winner?.id||null,repairAttempts:(repairLoop?.attempts||[]).map(item=>({...item})),outcome:tournament?.ready?'VERIFIED_WINNER':repairLoop?.state||'UNRESOLVED',finalEvidence:Object.freeze({...finalEvidence}),metadata:Object.freeze({...metadata}),learningUse:Object.freeze({positiveWinnerAllowed:tournament?.ready===true,failedCandidatesPreserved:true,hiddenReasoningRequired:false,observableActionsAndEvidenceOnly:true,portableContextMayCrossPlatforms:true,platformPassEvidenceMayNotTransfer:true}),authority:'verified-development-trajectory'};
  return Object.freeze(record);
}

export function createVibePumpModeContract({candidateCount=5,maxRepairAttempts=3,teacherCandidateMax=2,hourlyRefresh=true}={}){
  return Object.freeze({version:2,generation:'V3-PUMP',enabled:true,verifiedRag:Object.freeze({required:true,verifiedPositiveOnly:true,includeFailureWarnings:true,taskPlaybookRequired:true,portableCrossPlatformContext:true,platformPassEvidenceTransfer:false}),candidateTournament:Object.freeze({min:3,max:5,default:clampCandidateCount(candidateCount),isolated:true}),repairLoop:Object.freeze({enabled:true,maxAttempts:Math.max(1,Math.min(3,Math.floor(finite(maxRepairAttempts,3))))}),teacherCandidates:Object.freeze({enabled:true,max:Math.max(0,Math.min(2,Math.floor(finite(teacherCandidateMax,2)))),freeOnly:true,nonAuthoritative:true,paidFallback:false}),experiencePump:Object.freeze({hourlyRefresh:Boolean(hourlyRefresh),continuousMode:'24H',bindToExistingDistillationWorkflow:true,benchmarkAccumulation:true,benchmarkCountsAsTrainingSample:false}),weights:Object.freeze({localWeightsRequiredForPump:false,preferredTrainingBackend:'SERVER_SELF_HOSTED',localTrainingBackendPreserved:true,githubHostedModelTrainingAllowed:false,actualWeightTrainingDeferredUntilCanonicalReadiness:true}),graphics:Object.freeze({existingAssetVariants:true,rightsGateRequired:true,originalImmutable:true,candidateTournament:true}),integration:Object.freeze({parallelPipeline:false,canonicalLearningChainUnchanged:true}),authority:'vibe3-pump-mode-contract'});
}

export function createVibeV3ExecutionContract({candidateCount=VIBE3_POLICY.defaultCandidateCount,maxRepairAttempts=VIBE3_POLICY.defaultMaxRepairAttempts,minWinnerScore=0.78}={}){
  const count=clampCandidateCount(candidateCount),repairs=Math.max(1,Math.min(3,Math.floor(finite(maxRepairAttempts,3))));
  return Object.freeze({version:3,policy:VIBE3_POLICY,pumpMode:createVibePumpModeContract({candidateCount:count,maxRepairAttempts:repairs}),sourceDiscovery:Object.freeze({buildDependencyGraph:true,rankResponsibleFiles:true,inspectSymbolsImportsCallersTestsAssets:true}),verifiedContext:Object.freeze({retrieveBeforeGeneration:true,successMemory:true,failureWarnings:true,taskPlaybook:true,portableCrossPlatformContext:true,platformPassEvidenceTransfer:false}),candidateTournament:Object.freeze({required:true,count,isolatedExecution:true,minWinnerScore:unit(minWinnerScore),winnerRequiresSyntaxTestsRuntimeRegressionProtectedStateExactRevision:true}),repairLoop:Object.freeze({enabled:true,maxAttempts:repairs,failureEvidenceFeedsNextAttempt:true,stopOnVerifiedPass:true}),trajectory:Object.freeze({persistSuccess:true,persistFailure:true,persistCandidateComparisons:true,feedVerifiedLearningPipeline:true}),integration:Object.freeze({parallelPipeline:false,reuseExistingCheckpoint:true,reuseExistingRuntimeObservation:true,reuseExistingQaAndRegression:true,reuseExistingPromotionGate:true,reuseExistingDistillationWorkflow:true}),authority:'vibe3-existing-pipeline-upgrade'});
}

if(typeof window!=='undefined')Object.assign(window,{createJaewoonVibeSourceGraph:createVibeSourceGraph,rankJaewoonVibeResponsibleSources:rankVibeResponsibleSources,buildJaewoonVibeVerifiedMemoryIndex:buildVibeVerifiedMemoryIndex,retrieveJaewoonVibeVerifiedPatterns:retrieveVibeVerifiedPatterns,createJaewoonVibeTaskPlaybook:createVibeTaskPlaybook,runJaewoonVibeCandidateTournament:runVibeCandidateTournament,createJaewoonVibeRepairLoop:createVibeRepairLoop,createJaewoonVibeTrajectoryRecord:createVibeTrajectoryRecord,createJaewoonVibePumpModeContract:createVibePumpModeContract,createJaewoonVibeV3ExecutionContract:createVibeV3ExecutionContract});
