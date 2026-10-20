// Vibe2 autonomous development operational protections.
// Owner-directed work never enters the autonomous cooldown/admission/cleanup path.
// The existing exact-source QA, release and security checks remain authoritative.
const clean=value=>String(value??'').trim();
const lower=value=>clean(value).toLowerCase();
const unique=values=>[...new Set(values)];
const sha40=value=>/^[a-f0-9]{40}$/i.test(clean(value));
const active=task=>['queued','running'].includes(lower(task.status));
const automatic=task=>task?.ownerDirective!==true;

export function observedHostedRunnerJobs(payload={}){
  // Query GitHub Actions job lists for live workflow runs; workflow-run totals
  // are NOT concurrent runner job totals. Unknown probes must not fake spare slots.
  const groups=Array.isArray(payload.runs)?payload.runs:[];
  let observedJobs=0,reportedRuns=0,allObserved=true;
  for(const group of groups){
    if(lower(group?.status)!=='in_progress')continue;
    reportedRuns++;
    if(!Array.isArray(group.jobs)){allObserved=false;continue;}
    observedJobs+=group.jobs.filter(job=>lower(job.status)==='in_progress'
      &&!(job.labels||[]).some(label=>lower(label)==='self-hosted')).length;
  }
  return {known:allObserved,observedJobs:allObserved?observedJobs:null,
    observedRuns:reportedRuns,scope:'CURRENT_REPOSITORY_ONLY',
    note:'Job counts from other repositories or billing accounts are not available here'};
}

export function repairStaleAutonomousQueue(queueInput={},currentMainSha=''){
  const old=Array.isArray(queueInput.tasks)?queueInput.tasks:[];
  const cancelled=[];
  const activeFingerprints=new Set();
  const tasks=old.map(task=>{
    // Also collapse exact legacy auto duplicates already in the persisted queue.
    // No owner, dependency-bearing, or active running work is deleted.
    const files=[...new Set((task.responsibleFiles||[]).map(clean).filter(Boolean))].sort();
    const fingerprint=files.length&&automatic(task)&&active(task)
      ?JSON.stringify([clean(task.gameId),clean(task.target),clean(task.sourceRoot),
        clean(task.department),clean(task.type),clean(task.goal),files]):'';
    if(fingerprint&&lower(task.status)==='queued'&&!(task.dependencies||[]).length
      &&activeFingerprints.has(fingerprint)){
      cancelled.push(clean(task.id));
      return {...task,status:'cancelled',blocker:'DUPLICATE_AUTONOMOUS_WORK',
        lastOutcome:'DUPLICATE_AUTONOMOUS_WORK_CANCELLED',
        evidence:unique([...(task.evidence||[]),'auto-cleanup:duplicate-existing-file-goal'])};
    }
    if(fingerprint)activeFingerprints.add(fingerprint);
    // A task must explicitly opt into revision-pinned work to be auto-superseded.
    // Running jobs, owner tasks and tasks without exact revision proof are preserved.
    const mark=(task.evidence||[]).map(clean)
      .find(value=>value.startsWith('autonomous-pinned-main-sha:'));
    const base=mark?.slice('autonomous-pinned-main-sha:'.length);
    if(!automatic(task)||lower(task.status)!=='queued'||!sha40(currentMainSha)
      ||!sha40(base)||base.toLowerCase()===currentMainSha.toLowerCase())return task;
    cancelled.push(clean(task.id));
    return {...task,status:'cancelled',blocker:'SUPERSEDED_BY_MAIN_REVISION',
      lastOutcome:'STALE_AUTONOMOUS_REVISION_CANCELLED',reservationId:null,
      reservationRunId:null,reservedAt:null,
      evidence:unique([...(task.evidence||[]),'auto-cleanup:exact-pinned-revision-superseded',
        'superseded-main-sha:'+clean(currentMainSha)])};
  });
  return {queue:{...queueInput,tasks},cancelled};
}

export function rerouteRepeatingAutoFailures(queueInput={}){
  const tasks=Array.isArray(queueInput.tasks)?queueInput.tasks:[];
  const rerouted=[];
  const next=tasks.map(task=>{
    if(!automatic(task)||lower(task.status)!=='queued'||Number(task.retries||0)<3)return task;
    const evidence=(task.evidence||[]).map(clean);
    if(evidence.includes('auto-repair:ALTERNATE_CAUSAL_STRATEGY_REQUIRED'))return task;
    const failed=evidence.filter(item=>item.startsWith('failure-cause:')).map(item=>item.slice(14)).filter(Boolean);
    if(!failed.length||new Set(failed).size!==1)return task;
    rerouted.push(clean(task.id));
    return {...task,priority:'high',
      goal:clean(task.goal)+'\n[AUTONOMOUS_ALTERNATE_CAUSAL_REPAIR] The same failure repeated 3+ times: '
        +failed[0]+'. Identify a different verified hypothesis, inspect prior attempts, '
        +'change only responsible source files, and repeat the same failing QA plus impact-scoped regression. '
        +'Do not repeat an identical patch or claim PASS without runtime evidence.',
      evidence:unique([...evidence,'auto-repair:ALTERNATE_CAUSAL_STRATEGY_REQUIRED'])};
  });
  return {queue:{...queueInput,tasks:next},rerouted};
}

export function checkAutonomousCandidate(task={},result={}){
  if(!automatic(task)||lower(task.department)!=='development'
    ||!['implementation','code','build'].includes(lower(task.type))
    ||clean(result.outcome).toUpperCase()!=='PASS')return{accepted:true};
  const metrics=result.metrics||{};
  // The worker always reports changedFileCount. Only a zero verified source
  // mutation is rejected; no-op research/analysis tasks are not code changes.
  if(Number.isFinite(metrics.changedFileCount)&&metrics.changedFileCount===0)
    return{accepted:false,reason:'AUTONOMOUS_NO_SOURCE_CHANGE',category:'NO_OP'};
  const before=result.runtimePerformance?.before||{},after=result.runtimePerformance?.after||{};
  const measured=Number.isFinite(Number(before.fps))&&Number.isFinite(Number(after.fps))
    &&Number(before.fps)>0&&Number(after.fps)>0;
  if(measured&&Number(after.fps)<Number(before.fps)*.8)
    return{accepted:false,reason:'AUTONOMOUS_FPS_REGRESSION',category:'PERFORMANCE'};
  if(Number.isFinite(Number(before.memoryMb))&&Number.isFinite(Number(after.memoryMb))
    &&Number(before.memoryMb)>0&&Number(after.memoryMb)>Number(before.memoryMb)*1.25)
    return{accepted:false,reason:'AUTONOMOUS_MEMORY_REGRESSION',category:'PERFORMANCE'};
  return{accepted:true,observedPerformance:measured,
    performanceClaim:measured?'MEASURED':'NOT_MEASURED'};
}

export function classifyCloudflareQuota(text=''){
  const value=lower(text);
  const identified=/cloudflare|pages|workers|wrangler/.test(value)
    &&/quota|free.plan.limit|daily.limit|limit.exceeded|limit.reached|builds.exceeded|usage.limit|too.many.builds/.test(value);
  return {quotaExceeded:identified,retryAllowed:!identified,
    reason:identified?'CLOUDFLARE_FREE_TIER_QUOTA':'NOT_CONFIRMED_QUOTA',
    resetVerified:false,autoPass:false};
}
export function shouldRetryCloudflarePublication(task={}){
  const flags=new Set((task.evidence||[]).map(clean));
  return !flags.has('cloudflare-quota-exhausted')
    ||flags.has('cloudflare-quota-cleared-verified');
}

export function automaticImpactedChecks(changedFiles=[]){
  const files=unique(changedFiles.map(clean).filter(Boolean));
  const games=unique(files.map(f=>/^(?:web|roblox|unity|unreal)-games\/([^/]+)\//.exec(f)?.[1]).filter(Boolean));
  const shared=files.some(f=>/^(assets\/|tools\/|\.github\/|qa\/)/.test(f));
  return {gameIds:games,sharedCodeChanged:shared,
    tests:['source-syntax-and-security',...games.map(g=>'game-runtime:'+g),
      ...(shared?['shared-dependency-regression']:[]),'full-release-fan-in-unchanged'],
    scope:'ADVISORY_FIRST_PASS_ONLY',canReplaceFinalQA:false};
}

export function verifiedMaintenanceMode(task={},proof={}){
  // Release remains an evidence-bound state, never inferred from a progress bar.
  const release=proof.published===true&&proof.independentQA===true
    &&proof.regression===true&&sha40(proof.sourceRevision)
    &&clean(proof.sourceRevision)===clean(proof.verifiedSourceRevision);
  if(!release)return{mode:'DEVELOPMENT',verified:false};
  if(task.ownerDirective===true)return{mode:'OWNER_DIRECT',verified:true};
  return{mode:'MAINTENANCE',verified:true,
    priorities:['SECURITY_HOTFIX','SAVED_GAME_INTEGRITY','LIVE_BUG','PERFORMANCE_REGRESSION','SMALL_SAFE_UPDATES'],
    preserveLiveBuildUntilExactVerifiedReplacement:true};
}
