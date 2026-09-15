// 파일명: tools/vibe2-auto-player-contract.mjs
// 역할: 모든 엔진 AUTO PLAYER가 공유하는 PLAY LOG / TELEMETRY / DESIGN EVIDENCE 계약을 정의한다.
// 원칙: 실제 런타임 입력과 관측이 없으면 verified=true를 만들지 않는다.

import fs from 'node:fs';
import path from 'node:path';

const clean=value=>String(value??'').trim();
const finite=value=>Number.isFinite(Number(value))?Number(value):null;
const unique=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const x of Object.values(value))freeze(x);}return value;};

export const AUTO_PLAYER_ENGINES=freeze(['web','roblox','unity','uefn','unreal']);
export const REAL_INPUT_ACTIONS=freeze(['click','key','pointer','touch','gamepad']);

export function normalizeAutoPlayerScenario(input={}){
  const engine=clean(input.engine||'web').toLowerCase();
  if(!AUTO_PLAYER_ENGINES.includes(engine))throw new Error(`지원하지 않는 AUTO PLAYER engine: ${engine}`);
  const actions=Array.isArray(input.actions)?input.actions.map((row,index)=>({
    id:clean(row?.id)||`action-${index+1}`,
    type:clean(row?.type).toLowerCase(),
    selector:clean(row?.selector),
    key:clean(row?.key),
    code:clean(row?.code),
    expression:clean(row?.expression),
    name:clean(row?.name)||null,
    ms:Math.max(0,Math.min(10000,finite(row?.ms)??0)),
    holdMs:Math.max(0,Math.min(5000,finite(row?.holdMs)??80)),
    required:row?.required!==false
  })).filter(row=>row.type):[];
  if(!actions.length)throw new Error('AUTO PLAYER scenario actions 필요');
  const checkpointCount=actions.filter(row=>row.type==='expect').length;
  return freeze({
    version:1,
    engine,
    page:clean(input.page)||'index.html',
    timeoutMs:Math.max(3000,Math.min(120000,finite(input.timeoutMs)??30000)),
    requirePlayability:input.requirePlayability===true,
    failOnRuntimeError:input.failOnRuntimeError!==false,
    actions:freeze(actions),
    checkpointCount,
    metadata:freeze(input.metadata&&typeof input.metadata==='object'?{...input.metadata}:{})
  });
}

export function createAutoPlayerResult({
  engine='web',runId='',startedAt='',finishedAt='',browser='',page='',actions=[],checkpoints=[],errors=[],playability=null,metrics={},artifactPath=''
}={}){
  const normalizedActions=(actions||[]).map(row=>({...row}));
  const normalizedCheckpoints=(checkpoints||[]).map(row=>({...row}));
  const realInputs=normalizedActions.filter(row=>REAL_INPUT_ACTIONS.includes(clean(row?.type).toLowerCase())&&row?.dispatched===true);
  const requiredCheckpoints=normalizedCheckpoints.filter(row=>row.required!==false);
  const checkpointPass=requiredCheckpoints.length>0&&requiredCheckpoints.every(row=>row.pass===true);
  const runtimeErrors=(errors||[]).filter(Boolean);
  const playabilityRequired=playability?.required===true;
  const playabilityPass=!playabilityRequired||(playability?.trusted===true&&playability?.playable===true);
  const verified=realInputs.length>0&&checkpointPass&&runtimeErrors.length===0&&playabilityPass;
  const durationMs=Math.max(0,(finite(metrics?.durationMs)??0));
  const telemetry={
    version:1,
    engine,
    runId:clean(runId),
    verified,
    metrics:freeze({
      durationMs,
      timeToFirstActionMs:finite(metrics?.timeToFirstActionMs),
      inputActionCount:realInputs.length,
      actionCount:normalizedActions.length,
      checkpointCount:requiredCheckpoints.length,
      checkpointPassCount:requiredCheckpoints.filter(row=>row.pass===true).length,
      runtimeErrorCount:runtimeErrors.length,
      consoleErrorCount:finite(metrics?.consoleErrorCount)??0,
      ...metrics
    }),
    authority:'vibe2-observed-telemetry'
  };
  const playLog={
    version:1,
    engine,
    runId:clean(runId),
    startedAt:clean(startedAt),
    finishedAt:clean(finishedAt),
    browser:clean(browser)||null,
    page:clean(page)||null,
    realInputVerified:realInputs.length>0,
    actions:freeze(normalizedActions),
    checkpoints:freeze(normalizedCheckpoints),
    errors:freeze(runtimeErrors.map(row=>typeof row==='string'?row:{...row})),
    playability:playability||null,
    authority:'vibe2-play-log'
  };
  const evidencePath=clean(artifactPath)||null;
  const autoPlayerEvidence={
    status:verified?'PASS':'FAIL',
    verified,
    engine,
    runId:clean(runId),
    path:evidencePath,
    evidence:evidencePath?`play-log:${evidencePath}`:`play-log:${clean(runId)}`,
    realInputActionCount:realInputs.length,
    checkpointPassCount:requiredCheckpoints.filter(row=>row.pass===true).length,
    checkpointCount:requiredCheckpoints.length,
    authority:'vibe2-auto-player-evidence'
  };
  const telemetryEvidence={
    status:verified?'PASS':'FAIL',
    verified,
    engine,
    runId:clean(runId),
    path:evidencePath,
    evidence:evidencePath?`telemetry:${evidencePath}`:`telemetry:${clean(runId)}`,
    metrics:telemetry.metrics,
    authority:'vibe2-telemetry-evidence'
  };
  return freeze({version:1,verified,engine,runId:clean(runId),playLog,telemetry,designEvidence:freeze({autoPlayer:autoPlayerEvidence,telemetry:telemetryEvidence}),authorityExpanded:false});
}

export function persistAutoPlayerResult(file,result){
  if(!clean(file))throw new Error('AUTO PLAYER output path 필요');
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,`${JSON.stringify(result,null,2)}\n`,'utf8');
  return file;
}

export function applyAutoPlayerEvidenceToManifest(manifestFile,result,{artifactPath=''}={}){
  if(!clean(manifestFile)||!fs.existsSync(manifestFile))throw new Error(`candidate manifest 없음: ${manifestFile}`);
  const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
  const pathValue=clean(artifactPath)||clean(result?.designEvidence?.autoPlayer?.path);
  const autoPlayer={...result.designEvidence.autoPlayer,path:pathValue||result.designEvidence.autoPlayer.path};
  const telemetry={...result.designEvidence.telemetry,path:pathValue||result.designEvidence.telemetry.path};
  manifest.designEvidence={...(manifest.designEvidence||{}),autoPlayer,telemetry};
  manifest.autoPlayerRuntime={
    engine:result.engine,
    runId:result.runId,
    verified:result.verified===true,
    inputActionCount:result.telemetry?.metrics?.inputActionCount??0,
    checkpointPassCount:result.telemetry?.metrics?.checkpointPassCount??0,
    checkpointCount:result.telemetry?.metrics?.checkpointCount??0,
    runtimeErrorCount:result.telemetry?.metrics?.runtimeErrorCount??0,
    authorityExpanded:false
  };
  manifest.authorityExpanded=false;
  fs.writeFileSync(manifestFile,`${JSON.stringify(manifest,null,2)}\n`,'utf8');
  return freeze(manifest);
}

export function waitingAutoPlayerEvidence(engine='web',reason='runtime-not-executed'){
  return freeze({
    verified:false,
    engine:clean(engine),
    reason:clean(reason),
    designEvidence:freeze({
      autoPlayer:freeze({status:'WAITING_EVIDENCE',verified:false,engine:clean(engine),reason:clean(reason)}),
      telemetry:freeze({status:'WAITING_EVIDENCE',verified:false,engine:clean(engine),reason:clean(reason)})
    }),
    authorityExpanded:false
  });
}
