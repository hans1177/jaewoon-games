// 파일명: tools/web-vibe-recovery.mjs
// 메인: 기존 PWA 복구에서 제공자 대기와 소스 실패를 분리한다.
// Queue operations are bounded and never assert QA or publication success.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {assertWebVibeQueue} from './web-vibe-organization.mjs';

const validTime=value=>{
  const t=Date.parse(String(value||''));
  if(!Number.isFinite(t))throw Error('WEB_VIBE_RECOVERY_TIME_INVALID');
  return t;
};
const eligible=task=>task?.ownerDirective===true&&task?.status==='queued'
  &&task?.evidence?.includes('owner-source-authenticated');
export function selectWebVibeRecoveryTask(queue,{now=new Date().toISOString(),maxAttempts=3}={}){
  const state=assertWebVibeQueue(queue),at=validTime(now);
  // Choose one ready task per game, preserving the owner's within-game order.
  // Prioritize never-attempted games over retry loops, then the least recently
  // failed game. This keeps an old repeatedly failing task from monopolizing
  // the 5-minute existing WEB watchdog without dropping its retry entitlement.
  // One pass to exclude games with active leases, running edits, or pending
  // cooldown. Do not allow a later task for the same game to overtake an
  // earlier owner directive while it is actively leased or cooling down.
  const busyGames=new Set();
  for(const task of state.tasks){
    if(task.status==='running'
      ||(eligible(task)&&(
        Math.max(0,Math.floor(Number(task.recoveryAttempts)||0))>=maxAttempts
        ||(task.recoveryNextAt&&validTime(task.recoveryNextAt)>at)
        ||(task.recoveryClaimUntil&&validTime(task.recoveryClaimUntil)>at))))
      busyGames.add(task.gameId);
  }
  const perGame=new Map();
  for(const [index,task] of state.tasks.entries()){
    if(!eligible(task)||busyGames.has(task.gameId))continue;
    if(!perGame.has(task.gameId))perGame.set(task.gameId,{task,index});
  }
  const ranked=[...perGame.values()].sort((a,b)=>{
    const retry=t=>Math.max(0,Math.floor(Number(t.recoveryAttempts)||0));
    if(retry(a.task)!==retry(b.task))return retry(a.task)-retry(b.task);
    const last=t=>t.recoveryLastFailureAt?validTime(t.recoveryLastFailureAt):0;
    if(last(a.task)!==last(b.task))return last(a.task)-last(b.task);
    return a.index-b.index;
  });
  const task=ranked[0]?.task;
  if(!task)return null;
  return Object.freeze({id:task.id,taskId:task.id.slice(4),gameId:task.gameId,
    files:task.sourceFiles||'*',sourceRoot:task.sourceRoot,
    queueSelection:'PER_GAME_FRESH_FIRST_BOUNDED_RETRY'});
}
// The existing watchdog records an expiring task claim with a Git SHA CAS.
// Keep the task queued so the authenticated WEB worker uses its original path.
export function claimWebVibeRecoveryTask(queue,id,{now=new Date().toISOString(),
  runId=0,leaseMinutes=75}={}){
  const state=assertWebVibeQueue(queue),at=validTime(now),runner=Number(runId);
  if(!Number.isSafeInteger(runner)||runner<=0
    ||!Number.isSafeInteger(leaseMinutes)||leaseMinutes<60||leaseMinutes>120)
    throw Error('WEB_VIBE_QUEUE_CLAIM_AUTHORITY_INVALID');
  const selected=selectWebVibeRecoveryTask(state,{now});
  if(!selected||selected.id!==id)throw Error('WEB_VIBE_QUEUE_CLAIM_SELECTION_STALE');
  const until=new Date(at+leaseMinutes*60_000).toISOString();
  const tasks=state.tasks.map(row=>row.id!==id?row:{
    ...row,recoveryClaimUntil:until,recoveryClaimRunId:runner,
    recoveryClaimedAt:new Date(at).toISOString()
  });
  return {queue:assertWebVibeQueue({...state,tasks}),changed:true,selection:selected,
    claimRunId:runner,claimUntil:until};
}

export function recordWebVibeRecoveryFailure(queue,id,{now=new Date().toISOString(),maxAttempts=3,failureLog=''}={}){
  const state=assertWebVibeQueue(queue),at=validTime(now);
  const task=state.tasks.find(row=>row.id===id);
  if(!task||!eligible(task))return {queue:state,changed:false};
  // 유틸: 실제 worker의 무료 제공자 제한만 대기 처리한다. 인증·정책·소스 오류는 기존 제한 유지.
  const providerLine=String(failureLog).split(/\r?\n/).find(line=>line.startsWith(
    'WEB_VIBE_WORKER_BLOCKED=GEMINI_FREE_TWO_MODEL_POOL_UNAVAILABLE_NO_LOCAL_FALLBACK:'));
  const transient=providerLine&&/:(?:HTTP_(?:429|500|502|503|504)|COOLDOWN|TRANSPORT_OR_TIMEOUT)(?:,|:|$)/.test(providerLine)
    &&! /:(?:HTTP_(?:400|401|402|403|404)|EMPTY_OUTPUT)(?:,|:|$)/.test(providerLine);
  if(transient){
    const advertised=Date.parse(providerLine.match(/:NEXT_RETRY_AT=([^\s]+)/)?.[1]||'');
    const nextAt=Number.isFinite(advertised)&&advertised>at?advertised:at+30*60_000;
    const tasks=state.tasks.map(row=>row.id!==id?row:{...row,
      recoveryLastFailureAt:new Date(at).toISOString(),recoveryNextAt:new Date(nextAt).toISOString(),
      recoveryFailureClass:'PROVIDER_COOLDOWN',blocker:null,
      recoveryClaimUntil:null,recoveryClaimRunId:null,
      evidence:[...new Set([...(row.evidence||[]),'web-vibe-provider-cooldown:source-retry-budget-preserved'])]
    });
    return {queue:assertWebVibeQueue({...state,tasks}),changed:true,
      attempts:Math.max(0,Math.floor(Number(task.recoveryAttempts)||0)),exhausted:false,
      failureClass:'PROVIDER_COOLDOWN',nextRetryAt:new Date(nextAt).toISOString()};
  }
  // A damaged ephemeral checkout is infrastructure, not an authored-source
  // failure. Preserve the source retry budget, but bound these retries too.
  // Never retry unverified authorization or billing errors through this path.
  const workerFailure=String(failureLog).split(/\r?\n/)
    .find(line=>line.startsWith('WEB_VIBE_WORKER_BLOCKED='))||'';
  if(/^WEB_VIBE_WORKER_BLOCKED=(?:WEB_VIBE_CLOUD_CHECKOUT_STILL_DIRTY:|WEB_VIBE_MAIN_MUST_BE_FAST_FORWARDED_FIRST)/.test(workerFailure)){
    const infraAttempts=Math.min(4,Math.max(0,Math.floor(Number(task.recoveryInfraAttempts)||0))+1);
    const exhausted=infraAttempts>=4;
    const nextAt=exhausted?null:new Date(at+infraAttempts*15*60_000).toISOString();
    const tasks=state.tasks.map(row=>row.id!==id?row:{...row,
      recoveryFailureClass:'EPHEMERAL_CHECKOUT',recoveryInfraAttempts:infraAttempts,
      recoveryClaimUntil:null,recoveryClaimRunId:null,
      recoveryLastFailureAt:new Date(at).toISOString(),recoveryNextAt:nextAt,
      status:exhausted?'blocked':'queued',
      blocker:exhausted?'WEB_VIBE_EPHEMERAL_CHECKOUT_REVIEW_REQUIRED':null,
      evidence:[...new Set([...(row.evidence||[]),
        'web-vibe-ephemeral-checkout:source-retry-budget-preserved'])]
    });
    return {queue:assertWebVibeQueue({...state,tasks}),changed:true,
      attempts:Math.max(0,Math.floor(Number(task.recoveryAttempts)||0)),
      infraAttempts,exhausted,failureClass:'EPHEMERAL_CHECKOUT',nextRetryAt:nextAt};
  }
  // Missing free credentials cannot be "fixed" by retrying paid providers.
  if(workerFailure.startsWith('WEB_VIBE_WORKER_BLOCKED=WEB_VIBE_FREE_MODEL_KEY_MISSING:')){
    const tasks=state.tasks.map(row=>row.id!==id?row:{...row,
      status:'blocked',blocker:'WEB_VIBE_VERIFIED_FREE_MODEL_CREDENTIAL_REQUIRED',
      recoveryFailureClass:'FREE_PROVIDER_NOT_CONFIGURED',
      recoveryClaimUntil:null,recoveryClaimRunId:null,
      recoveryLastFailureAt:new Date(at).toISOString(),recoveryNextAt:null,
      evidence:[...new Set([...(row.evidence||[]),
        'web-vibe-free-model-key-missing:fail-closed-no-paid-fallback'])]
    });
    return {queue:assertWebVibeQueue({...state,tasks}),changed:true,
      attempts:Math.max(0,Math.floor(Number(task.recoveryAttempts)||0)),
      exhausted:true,failureClass:'FREE_PROVIDER_NOT_CONFIGURED'};
  }
  const attempts=Math.min(maxAttempts,Math.max(0,Math.floor(Number(task.recoveryAttempts)||0))+1);
  const exhausted=attempts>=maxAttempts,delayMs=attempts*30*60_000;
  const tasks=state.tasks.map(row=>row.id!==id?row:{
    ...row,recoveryFailureClass:'SOURCE_OR_UNCLASSIFIED',recoveryAttempts:attempts,
    recoveryClaimUntil:null,recoveryClaimRunId:null,
    recoveryLastFailureAt:new Date(at).toISOString(),
    recoveryNextAt:exhausted?null:new Date(at+delayMs).toISOString(),
    status:exhausted?'blocked':'queued',
    blocker:exhausted?'WEB_VIBE_RECOVERY_REQUIRES_OWNER_REVIEW':null,
    evidence:[...new Set([...(row.evidence||[]),'web-vibe-recovery-failure:needs-source-or-provider-recheck'])]
  });
  return {queue:assertWebVibeQueue({...state,tasks}),changed:true,attempts,exhausted,
    failureClass:'SOURCE_OR_UNCLASSIFIED',nextRetryAt:exhausted?null:new Date(at+delayMs).toISOString()};
}

// [학습] 같은 웹게임 공개 플레이·정확한 Git 소스·독립 검증이 일치한 PR만 학습으로 승격한다.
// 기존 수동 검토/병합 권한은 바꾸지 않는다.
export function reconcileVerifiedWebReviews(queue,proofByTaskId={}){
  const state=assertWebVibeQueue(queue),changed=[];
  const tasks=state.tasks.map(row=>{
    if(row.status!=='review'||!row.reviewPrUrl)return row;
    const proof=proofByTaskId[row.id];
    if(!proof||proof.status!=='VERIFIED'||proof.gameId!==row.gameId
      ||proof.reviewPrUrl!==row.reviewPrUrl||proof.browserPassed!==true
      ||proof.independentQaPassed!==true
      ||!Number.isSafeInteger(proof.runId)||proof.runId<=0
      ||! /^[a-f0-9]{40}$/.test(String(proof.sourceRevision||''))||
      ! /^[a-f0-9]{40}$/.test(String(proof.sourceTreeSha||'')))return row;
    changed.push(row.id);
    return {...row,status:'merged',blocker:null,
      learningVerification:{status:'VERIFIED',browserPassed:true,independentQaPassed:true,
        sourceRevision:proof.sourceRevision,sourceTreeSha:proof.sourceTreeSha,
        runId:proof.runId,scope:'EXACT_PUBLISHED_GAME_BROWSER_SCENARIOS_ONLY'},
      evidence:[...new Set([...(row.evidence||[]),
        'web-vibe-verified-merged-pr:'+row.reviewPrUrl,
        'web-vibe-verified-published-source:'+proof.sourceRevision,
        'web-vibe-verified-browser-run:'+proof.runId])]};
  });
  return {queue:assertWebVibeQueue({...state,tasks}),changed:changed.length,verifiedTaskIds:changed};
}
function github(path){
  return JSON.parse(execFileSync('gh',['api',path],{encoding:'utf8',timeout:20000,maxBuffer:8*1024*1024,
    stdio:['ignore','pipe','pipe']}));
}
function verifiedPublishedReview(task){
  const match=String(task.reviewPrUrl||'').match(/^https:\/\/github\.com\/hans1177\/jaewoon-games\/pull\/([0-9]+)$/);
  if(!match||task.ownerDirective!==true||!task.evidence?.includes('owner-source-authenticated'))return null;
  const pr=github('repos/hans1177/jaewoon-games/pulls/'+match[1]);
  const sha=String(pr.merge_commit_sha||''),expected='web-vibe/'+task.gameId+'-'+task.id.slice(4);
  if(pr.merged!==true||pr.base?.ref!=='main'||pr.head?.ref!==expected
    ||pr.head?.repo?.full_name!=='hans1177/jaewoon-games'
    ||! /^[a-f0-9]{40}$/.test(sha))return null;
  const files=github('repos/hans1177/jaewoon-games/pulls/'+match[1]+'/files?per_page=100');
  if(!Array.isArray(files)||files.length<1||files.length>8||
    files.some(row=>typeof row.filename!=='string'||!row.filename.startsWith(task.sourceRoot+'/')
      ||!/^\w+(?:[-./]\w+)*\.(?:html?|js|mjs|cjs|json|css|svg)$/.test(row.filename)
      ||!['modified','added'].includes(row.status)))return null;
  const compare=github('repos/hans1177/jaewoon-games/compare/'+sha+'...main');
  if(!['ahead','identical'].includes(compare.status))return null;
  const runs=github('repos/hans1177/jaewoon-games/actions/workflows/magic-forest-pages.yml/runs?head_sha='+sha+'&per_page=20');
  for(const run of (runs.workflow_runs||[]).filter(r=>r.head_sha===sha
    &&r.status==='completed'&&r.conclusion==='success'
    &&['push','workflow_dispatch'].includes(r.event)).slice(0,5)){
    try{
      const jobs=github('repos/hans1177/jaewoon-games/actions/runs/'+run.id+'/jobs?per_page=100').jobs||[];
      const smoke=jobs.find(j=>j.name==='post-publication-3d-smoke'&&j.conclusion==='success');
      if(!smoke||!['Bind browser QA to exact live published revision',
        'Validate live published 3D model and game controls'].every(label=>
        smoke.steps?.some(s=>s.name===label&&s.conclusion==='success')))continue;
      const artifacts=github('repos/hans1177/jaewoon-games/actions/runs/'+run.id+'/artifacts?per_page=100').artifacts||[];
      const artifact=artifacts.find(a=>a.name==='ocean-naval-mobile-render'&&a.expired!==true);
      if(!Number.isSafeInteger(artifact?.id))continue;
      const zip=execFileSync('gh',['api','repos/hans1177/jaewoon-games/actions/artifacts/'+artifact.id+'/zip'],
        {encoding:null,timeout:45000,maxBuffer:32*1024*1024,stdio:['ignore','pipe','pipe']});
      if(zip.length>32*1024*1024)continue;
      const archive=path.join(os.tmpdir(),'web-vibe-proof-'+process.pid+'-'+artifact.id+'.zip');
      let report;
      try{
        fs.writeFileSync(archive,zip,{mode:0o600,flag:'wx'});
        report=JSON.parse(execFileSync('unzip',['-p',archive,'web-playtest-report.json'],
          {encoding:'utf8',timeout:15000,maxBuffer:2*1024*1024,stdio:['ignore','pipe','pipe']}));
      }finally{fs.rmSync(archive,{force:true});}
      if(report.authority!=='PUBLISHED_WEB_BROWSER_SMOKE'||report.exactPublishedRevision!==true
        ||String(report.runId)!==String(run.id))continue;
      const game=(report.games||[]).find(g=>g.gameId===task.gameId&&g.target==='web'
        &&g.sourceRoot===task.sourceRoot&&g.runtimeObserved===true&&g.runtimePassed===true
        &&g.sourceRevision===sha&&/^[a-f0-9]{40}$/.test(g.sourceTreeSha||''));
      if(!game)continue;
      // 실시간 main에서 해당 게임 또는 공유 에셋이 바뀌었다면 과거 성공을 학습하지 않는다.
      const local=rel=>execFileSync('git',['rev-parse','--verify','HEAD:'+rel],
        {encoding:'utf8',timeout:10000,stdio:['ignore','pipe','ignore']}).trim();
      if(local(task.sourceRoot)!==game.sourceTreeSha||local('assets')!==report.sharedSourceTrees?.assets)continue;
      return {status:'VERIFIED',gameId:task.gameId,reviewPrUrl:task.reviewPrUrl,
        browserPassed:true,independentQaPassed:true,runId:run.id,sourceRevision:sha,
        sourceTreeSha:game.sourceTreeSha};
    }catch(error){console.log('WEB_VIBE_LEARNING_PROOF_UNAVAILABLE='+task.id+':'+String(error.message||error).slice(0,90));}
  }
  return null;
}
export function reconcileWebVibeGitHubReviews(queue){
  if(process.env.GITHUB_ACTIONS!=='true'
    ||process.env.GITHUB_REPOSITORY!=='hans1177/jaewoon-games'
    ||process.env.GITHUB_WORKFLOW!=='PWA Command Bridge'
    ||!['schedule','workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME))
    throw Error('WEB_VIBE_LEARNING_AUTHORITY_REQUIRED');
  const proofs={};
  for(const row of assertWebVibeQueue(queue).tasks.filter(t=>t.status==='review'&&t.reviewPrUrl).slice(0,12)){
    try{const result=verifiedPublishedReview(row);if(result)proofs[row.id]=result;}
    catch(error){console.log('WEB_VIBE_LEARNING_SKIP_UNVERIFIED='+row.id+':'+String(error.message||error).slice(0,90));}
  }
  return reconcileVerifiedWebReviews(queue,proofs);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [command,queueFile,id,outputFile,failureFile]=process.argv.slice(2);
  const queue=JSON.parse(fs.readFileSync(queueFile,'utf8'));
  if(command==='select')console.log(JSON.stringify(selectWebVibeRecoveryTask(queue)));
  else if(command==='reconcile'){
    const result=reconcileWebVibeGitHubReviews(queue);
    if(result.changed)fs.writeFileSync(id,JSON.stringify(result.queue,null,2)+'\n');
    console.log(JSON.stringify({changed:result.changed,verifiedTaskIds:result.verifiedTaskIds}));
  }
  else if(command==='claim'){
    const result=claimWebVibeRecoveryTask(queue,id,{runId:Number(failureFile)});
    if(result.changed)fs.writeFileSync(outputFile,JSON.stringify(result.queue,null,2)+'\n');
    console.log(JSON.stringify({changed:result.changed,selected:result.selection,
      claimRunId:result.claimRunId,claimUntil:result.claimUntil}));
  }
  else if(command==='failure'){
    const failureLog=failureFile&&fs.existsSync(failureFile)?fs.readFileSync(failureFile,'utf8'):'';
    const result=recordWebVibeRecoveryFailure(queue,id,{failureLog});
    if(result.changed)fs.writeFileSync(outputFile,JSON.stringify(result.queue,null,2)+'\n');
    console.log(JSON.stringify({changed:result.changed,attempts:result.attempts||0,exhausted:result.exhausted||false,
      failureClass:result.failureClass||'SOURCE_OR_UNCLASSIFIED',nextRetryAt:result.nextRetryAt||null}));
  }else throw Error('WEB_VIBE_RECOVERY_COMMAND_INVALID');
}
