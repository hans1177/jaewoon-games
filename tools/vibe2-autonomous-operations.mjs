// 파일명: tools/vibe2-autonomous-operations.mjs
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
    // [최신 main 우선] 정확히 SHA가 다른 자율 queued 작업을 먼저 취소한다.
    // 취소된 이전 작업은 중복 fingerprint 자리를 점유할 수 없으므로 정상 신규 작업을 보호한다.
    const mark=(task.evidence||[]).map(clean)
      .find(value=>value.startsWith('autonomous-pinned-main-sha:'));
    const base=mark?.slice('autonomous-pinned-main-sha:'.length);
    const stalePinned=automatic(task)&&lower(task.status)==='queued'&&sha40(currentMainSha)
      &&sha40(base)&&base.toLowerCase()!==currentMainSha.toLowerCase();
    if(stalePinned){
      cancelled.push(clean(task.id));
      return {...task,status:'cancelled',blocker:'SUPERSEDED_BY_MAIN_REVISION',
        lastOutcome:'STALE_AUTONOMOUS_REVISION_CANCELLED',reservationId:null,
        reservationRunId:null,reservedAt:null,
        evidence:unique([...(task.evidence||[]),'auto-cleanup:exact-pinned-revision-superseded',
          'superseded-main-sha:'+clean(currentMainSha)])};
    }
    // 취소되지 않은 기존 queued/running 작업의 동일 파일·목표 중복만 제거한다.
    // owner, dependency-bearing, running work is not deleted.
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
    return task;
  });
  return {queue:{...queueInput,tasks},cancelled};
}

// Retry streaks are persisted by finishVibeQueueTask. Avoid counting repeated
// evidence entries: the canonical queue de-duplicates those by design.
export function rerouteRepeatingAutoFailures(queueInput={}, {now=Date.now()}={}){
  const tasks=Array.isArray(queueInput?.tasks)?queueInput.tasks:[];
  const rerouted=[],cooled=[];
  const next=tasks.map(task=>{
    if(!automatic(task)||lower(task.status)!=='queued'
      ||lower(task.department)!=='development'
      ||lower(task.type)!=='implementation')return task;
    const evidence=(task.evidence||[]).map(clean);
    const marker=evidence.findLast(row=>/^retry-cause-streak:[^:]*:[0-9]+$/.test(row))||'';
    const found=/^retry-cause-streak:([^:]*):([0-9]+)$/.exec(marker);
    const count=found?Number(found[2]):0;
    let cause='';
    try{cause=found?decodeURIComponent(found[1]):''}catch{}
    const hadAlternate=evidence.includes('auto-repair:ALTERNATE_CAUSAL_STRATEGY_REQUIRED');
    if(count>=6&&hadAlternate){
      const past=/^auto-repair:cooldown-count:([0-9]+)$/.exec(
        evidence.findLast(x=>x.startsWith('auto-repair:cooldown-count:'))||'');
      const nth=Math.min(5,Math.max(0,Number(past?.[1]||0))+1);
      const durationMinutes=Math.min(120,20*Math.pow(2,nth-1));
      const until=new Date(Number(now)+durationMinutes*60_000).toISOString();
      cooled.push(clean(task.id));
      return {...task,status:'blocked',blocker:'AUTONOMOUS_SAME_CAUSE_COOLDOWN',
        reservationId:null,reservationRunId:null,reservedAt:null,
        evidence:unique([
          ...evidence.filter(row=>!/^auto-repair:cooldown-(?:count:|until:)/.test(row)),
          'auto-repair:cooldown-count:'+nth,'auto-repair:cooldown-until:'+until,
          'auto-repair:repeated-exact-failure:'+encodeURIComponent(cause.slice(0,120))
        ])};
    }
    if(count<3||hadAlternate||!cause)return task;
    rerouted.push(clean(task.id));
    return {...task,priority:'high',
      goal:clean(task.goal)+'\n[AUTONOMOUS_ALTERNATE_CAUSAL_REPAIR] '+count+
        ' consecutive attempts failed for the same exact cause: '+cause+
        '. Inspect actual prior attempts and select a different falsifiable patch. '+
        'Change only responsible source files and repeat failing QA. '+
        'Never claim PASS without independent validation.',
      evidence:unique([...evidence,'auto-repair:ALTERNATE_CAUSAL_STRATEGY_REQUIRED'])};
  });
  return {queue:{...queueInput,tasks:next},rerouted,cooled};
}

export function requeueCooledDownAutoFailures(queueInput={}, {now=Date.now()}={}){
  const tasks=Array.isArray(queueInput?.tasks)?queueInput.tasks:[];
  const resumed=[];
  const next=tasks.map(task=>{
    if(!automatic(task)||lower(task.status)!=='blocked'
      ||clean(task.blocker)!=='AUTONOMOUS_SAME_CAUSE_COOLDOWN')return task;
    const evidence=(task.evidence||[]).map(clean);
    const until=evidence.findLast(x=>x.startsWith('auto-repair:cooldown-until:'));
    const time=until?Date.parse(until.slice('auto-repair:cooldown-until:'.length)):NaN;
    if(!Number.isFinite(time)||Number(now)<time)return task;
    resumed.push(clean(task.id));
    // A new bounded retry window starts; the previous failure identity is
    // retained while the consecutive streak resets, avoiding instant re-block.
    const cleanEvidence=evidence.filter(x=>!x.startsWith('retry-cause-streak:')
      &&!x.startsWith('auto-repair:cooldown-until:'));
    return {...task,status:'queued',blocker:null,lastOutcome:'FAIL',
      evidence:unique([...cleanEvidence,'auto-repair:cooldown-expired:'+new Date(Number(now)).toISOString()])};
  });
  return {queue:{...queueInput,tasks:next},resumed};
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


// Admission applies exclusively to NEW scheduled autonomous waves. It must
// never cancel existing workers, owner-direct dispatch, independent QA or
// previously verified release recovery.
export function assessAutonomousExpansionAdmission({
  queuedWorkflowRuns=null,pendingWorkflowRuns=null,ownerPublishRuns=null,
  maxQueuedWorkflowRuns=48
}={}){
  const queued=Number(queuedWorkflowRuns),pending=Number(pendingWorkflowRuns);
  const countsKnown=queuedWorkflowRuns!==null&&pendingWorkflowRuns!==null
    &&Number.isSafeInteger(queued)&&Number.isSafeInteger(pending)&&queued>=0&&pending>=0;
  const ownerKnown=Array.isArray(ownerPublishRuns);
  const ownerWait=ownerKnown&&ownerPublishRuns.some(run=>
    ['queued','pending','requested','waiting','in_progress'].includes(lower(run.status)));
  const backlog=countsKnown?queued+pending:null;
  const threshold=Math.max(10,Math.floor(Number(maxQueuedWorkflowRuns)||48));
  const allowed=!ownerWait&&!(countsKnown&&backlog>=threshold);
  const reason=ownerWait?'OWNER_PUBLICATION_PRIORITY'
    :countsKnown&&backlog>=threshold?'AUTONOMOUS_WORKFLOW_BACKLOG'
    :'AUTONOMOUS_ADMITTED';
  return Object.freeze({allowed,reason,backlog,threshold,countsKnown,ownerKnown,
    ownerPublishPending:!!ownerWait,scope:'NEW_AUTONOMOUS_WAVES_ONLY',
    // 새 자율 확장은 소유자 게시 작업을 우선하되, 기존 서로 다른 게임의 실행은 멈추지 않는다.
    // 파일 충돌·예약 슬롯·소유자 우선순위는 기존 개별 실행 경로에서 유지한다.
    existingQueueDispatchAllowed:true,
    existingWorkCancelled:false,ownerDirectWorkAllowed:true,finalQaPreserved:true});
}
