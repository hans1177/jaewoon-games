// Vibe Maker V2 gameplay/playability evidence.
// Detects the failure class where shell/UI loads but the actual game world is absent.
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.freeze(v);for(const x of Object.values(v))freeze(x)}return v};
const bool=v=>v===true;
const count=v=>Number.isFinite(Number(v))?Math.max(0,Number(v)):0;

export function createVibePlayabilityEvidence({
  gameStarted=false,
  worldRendered=false,
  playerRendered=false,
  playerControllable=false,
  gameplayFrameAdvanced=false,
  enemyExpected=false,
  enemyRendered=false,
  visibleGameplayObjects=0,
  shellOnly=false,
  replayRequired=false,
  replayEvidence=[]
}={}){
  // 메인: 실제로 실행된 미래 상태 재현 증거만 추가로 검사한다.
  const allowedHorizons=new Set(['IMMEDIATE','NEXT_STATE_TRANSITION','SAVE_LOAD_CYCLE','LONG_SESSION','NEXT_STAGE']);
  const replayRows=Array.isArray(replayEvidence)?replayEvidence:[];
  const replayVerified=replayRows.length>0&&replayRows.every(row=>
    row&&allowedHorizons.has(row.horizon)&&typeof row.scenarioId==='string'&&row.scenarioId.length>0&&
    typeof row.sourceRevision==='string'&&row.sourceRevision.length>0&&
    row.actualPlatformRuntime===true&&row.independentQaPass===true&&
    row.expectedObservationMet===true&&row.gameplaySemanticsPreserved===true);
  const checks={
    gameStarted:bool(gameStarted),
    worldRendered:bool(worldRendered),
    playerRendered:bool(playerRendered),
    playerControllable:bool(playerControllable),
    gameplayFrameAdvanced:bool(gameplayFrameAdvanced),
    enemyContractSatisfied:!bool(enemyExpected)||bool(enemyRendered),
    visibleGameplayObjects:count(visibleGameplayObjects)>0,
    shellNotAlone:!bool(shellOnly),
    ...((bool(replayRequired))?{temporalReplayVerified:replayVerified}:{}),
  };
  const failures=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
  return freeze({
    version:1,checks,failures,playable:failures.length===0,
    temporalReplay:freeze({required:bool(replayRequired),verified:replayVerified,
      scenarioCount:replayRows.length,authority:'ACTUAL_RUNTIME_EVIDENCE_REQUIRED'}),
    authority:'v2-playability-evidence'
  });
}

export function requireVibePlayability(evidence){
  const trusted=evidence?.authority==='v2-playability-evidence';
  const playable=trusted&&evidence.playable===true;
  return freeze({trusted,playable,repairRequired:!playable,reason:playable?'playable':'gameplay-not-proven',failures:trusted?[...(evidence.failures||[])]:['missing-playability-evidence'],authority:'v2-playability-gate'});
}

if(typeof window!=='undefined')Object.assign(window,{createJaewoonVibePlayabilityEvidence:createVibePlayabilityEvidence,requireJaewoonVibePlayability:requireVibePlayability});
