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
  shellOnly=false
}={}){
  const checks={
    gameStarted:bool(gameStarted),
    worldRendered:bool(worldRendered),
    playerRendered:bool(playerRendered),
    playerControllable:bool(playerControllable),
    gameplayFrameAdvanced:bool(gameplayFrameAdvanced),
    enemyContractSatisfied:!bool(enemyExpected)||bool(enemyRendered),
    visibleGameplayObjects:count(visibleGameplayObjects)>0,
    shellNotAlone:!bool(shellOnly)
  };
  const failures=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
  return freeze({version:1,checks,failures,playable:failures.length===0,authority:'v2-playability-evidence'});
}

export function requireVibePlayability(evidence){
  const trusted=evidence?.authority==='v2-playability-evidence';
  const playable=trusted&&evidence.playable===true;
  return freeze({trusted,playable,repairRequired:!playable,reason:playable?'playable':'gameplay-not-proven',failures:trusted?[...(evidence.failures||[])]:['missing-playability-evidence'],authority:'v2-playability-gate'});
}

if(typeof window!=='undefined')Object.assign(window,{createJaewoonVibePlayabilityEvidence:createVibePlayabilityEvidence,requireJaewoonVibePlayability:requireVibePlayability});
