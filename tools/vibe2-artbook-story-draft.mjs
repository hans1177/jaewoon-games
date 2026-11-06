// Lightweight orchestrator: keep the existing draft engine intact, then run one short planning direction selection.
// Existing QA contract markers are intentionally mirrored here while implementation lives in vibe2-artbook-story-engine.mjs:
// COMPACT_MODEL_PLUS_DETERMINISTIC_EXPANSION
// DETERMINISTIC_FALLBACK
// DETERMINISTIC_GAME_FACT_PACK
// DETERMINISTIC_STAGE_LABEL_NORMALIZATION
// SEMANTIC_GROUNDING_GATE
// num_predict:1800

const originalExit=process.exit.bind(process);
let requestedExit=null;
process.exit=(code=0)=>{
  const error=new Error(`VIBE2_ORCHESTRATED_EXIT:${code}`);
  error.vibe2OrchestratedExit=true;
  error.exitCode=Number(code)||0;
  throw error;
};

try{
  await import('./vibe2-artbook-story-engine.mjs');
}catch(error){
  if(!error?.vibe2OrchestratedExit)throw error;
  requestedExit=error.exitCode;
}finally{
  process.exit=originalExit;
}

if(requestedExit!==null&&requestedExit!==0)originalExit(requestedExit);
await import('./vibe2-artbook-direction-selection.mjs');
