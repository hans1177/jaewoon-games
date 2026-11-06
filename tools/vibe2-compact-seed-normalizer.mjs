import { REQUIRED_STAGES, stageKey } from './vibe2-artbook-story-core.mjs';

export function normalizeCompactSeedStages(seed){
  const phases=Array.isArray(seed?.phases)?seed.phases:[];
  if(phases.length!==REQUIRED_STAGES.length){
    return {valid:false,normalized:false,seed,originalStages:phases.map(x=>stageKey(x?.stage)),reason:`phase-count-${phases.length}`};
  }
  const originalStages=phases.map(x=>stageKey(x?.stage));
  const normalized=originalStages.some((stage,index)=>stage!==REQUIRED_STAGES[index]);
  return {
    valid:true,
    normalized,
    originalStages,
    seed:{...seed,phases:phases.map((phase,index)=>({...phase,stage:REQUIRED_STAGES[index]}))},
    reason:normalized?'stage-label-order-normalized':'already-canonical'
  };
}
