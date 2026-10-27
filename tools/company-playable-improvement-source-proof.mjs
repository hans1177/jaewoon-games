// Existing Vibe2 BUILD_UP candidate gate: source grounding only, never a native runtime PASS.
// This module adds no scheduler, queue, workflow, F0-F9 stage, or player/gameplay authority.
export const PLAYABLE_IMPROVEMENT_IDS=Object.freeze([
  'FIRST_ACTION','CORE_STATE_RESPONSE','PLAYER_CHOICE','PRESENTATION_BINDING','SESSION_RETRY'
]);
const clean=value=>String(value??'').trim();
const executable=value=>String(value??'').split('\n')
  .filter(line=>{const v=line.trim();return v&&!/^(?:--|\/\/|#|\/\*|\*|\*\/|<!--|\*\*)/.test(v);}).join('\n');
const meaningful=value=>executable(value).replace(/\s+/g,' ').trim();
export function evaluatePlayableImprovementSourceProof({candidate={},contract={}}={}){
  const phase=clean(contract?.phase).toUpperCase();
  const min=Math.max(0,Math.floor(Number(contract?.requiredPlayableImprovements?.min)||0));
  if(phase!=='BUILD_UP'||min<5)return{required:false,pass:true,requiredCount:0,groundedCount:0,reason:'NOT_REQUIRED'};
  const report=candidate?.playableImprovementReport;
  const items=Array.isArray(report?.items)?report.items:[];
  const faults=[];
  const accepted=[],ids=new Set(),sites=new Set();
  if(items.length<min||items.length>32)faults.push('FIVE_PLAYABLE_EVIDENCE_ROWS_REQUIRED');
  const edits=Array.isArray(candidate?.edits)?candidate.edits:[];
  for(const row of items){
    const id=clean(row?.id),p=clean(row?.path),before=clean(row?.before),after=clean(row?.after);
    const action=clean(row?.action),state=clean(row?.state),feedback=clean(row?.feedback),scenario=clean(row?.scenario);
    if(!PLAYABLE_IMPROVEMENT_IDS.includes(id)||ids.has(id)){faults.push('INVALID_OR_DUPLICATE_PLAYABLE_ID');continue;}
    ids.add(id);
    if(clean(row?.runtimeStatus)==='PASS'||row?.runtimeVerified===true){faults.push('FABRICATED_PLAY_RUNTIME_PASS:'+id);continue;}
    if(scenario.length<12||new Set([action,state,feedback]).size!==3
      ||[before,after,action,state,feedback].some(value=>value.length<8)){
      faults.push('INCOMPLETE_ACTION_STATE_FEEDBACK:'+id);continue;
    }
    const site=p+'\u0000'+after;
    if(sites.has(site)){faults.push('DUPLICATE_PLAYABLE_SOURCE_SITE:'+id);continue;}
    sites.add(site);
    const owning=edits.some(edit=>clean(edit?.path)===p
      &&String(edit.find??'').includes(before)
      &&String(edit.replace??'').includes(after)
      &&!String(edit.find??'').includes(after)
      &&meaningful(edit.find)!==meaningful(edit.replace));
    if(!owning){faults.push('PLAYABLE_CODE_DELTA_NOT_GROUNDED:'+id);continue;}
    const code=executable(after);
    if(meaningful(code).length<16
      ||![action,state,feedback].every(snippet=>code.includes(snippet))){
      faults.push('PLAYABLE_CODE_CHAIN_NOT_IN_CHANGED_SOURCE:'+id);continue;
    }
    if([action,state,feedback].some(snippet=>!meaningful(snippet)||!code.includes(snippet))){
      faults.push('COMMENT_ONLY_OR_UNGROUNDED_PLAYABLE_EVIDENCE:'+id);continue;
    }
    accepted.push({id,path:p,scenario,sourceState:'GROUNDED_SOURCE_ONLY',runtimeVerified:false});
  }
  for(const id of PLAYABLE_IMPROVEMENT_IDS)if(!accepted.some(row=>row.id===id))faults.push('PLAYABLE_ROLE_NOT_GROUNDED:'+id);
  if(accepted.length<min)faults.push('INSUFFICIENT_DISTINCT_PLAYABLE_SOURCE_PROOFS');
  return{
    required:true,pass:faults.length===0,requiredCount:min,
    groundedCount:accepted.length,items:accepted,
    runtimeVerified:false,
    reason:faults.length?faults[0]:'FIVE_SOURCE_CHAINS_GROUNDED_NATIVE_PLAY_UNVERIFIED',
    failures:[...new Set(faults)]
  };
}
