// Verified DESIGN_ONLY -> Vibe2 read-only admission bridge.
// One exact company-runtime Git revision supplies seed, queue and authored design.
// It never writes game code, queues, release claims, or independent designer decisions.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {evaluateMinimumDesignContract} from './company-minimum-design-contract.mjs';

const clean=value=>String(value??'').trim();
const sha40=value=>/^[0-9a-f]{40}$/i.test(clean(value));
const designPath=(value,gameId)=>new RegExp('^design/'+gameId+'/[0-9]{4}-[0-9]{2}-[0-9]{2}/design-revised\\.json$').test(clean(value));

export function verifyVibeDesignHandoff({runtimeSha,roadmap,readJsonAt,verifyDesign=evaluateMinimumDesignContract}={}){
  const failures=[],verified=[];
  if(!sha40(runtimeSha))failures.push('RUNTIME_SHA_INVALID');
  const method=roadmap?.continuousGameplaySystemEvolutionContract?.gameIdentityConceptContract?.novelCausalGameGrammar?.ownerBasicDesignMethod;
  if(roadmap?.authority!=='MACHINE_EXECUTION_CONTRACT'||method?.formula!=='MAIN = A + B + C + D + @')
    failures.push('CANONICAL_ABCD_PLUS_AT_DESIGN_POLICY_REQUIRED');
  if(roadmap?.developmentAccess?.ROBLOX!=='ALWAYS_ALLOWED'||roadmap?.developmentAccess?.UNITY!=='OWNER_HOLD')
    failures.push('OWNER_ROBLOX_ONLY_UNITY_HOLD_REQUIRED');
  if(failures.length)return Object.freeze({pass:false,runtimeSha:clean(runtimeSha),verified:[],failures});
  let seedState,queue;
  try{seedState=readJsonAt('game-seed-state.json');queue=readJsonAt('development-queue.json');}
  catch{failures.push('RUNTIME_SEED_QUEUE_NOT_AT_EXACT_SHA');return Object.freeze({pass:false,runtimeSha,verified:[],failures});}
  if(!Array.isArray(seedState?.seeds)||!Array.isArray(queue?.items)){
    failures.push('RUNTIME_SEED_QUEUE_SCHEMA_INVALID');
    return Object.freeze({pass:false,runtimeSha,verified:[],failures});
  }
  const rows=queue.items;
  for(const seed of seedState.seeds){
    if(clean(seed?.status).toUpperCase()!=='ACTIVE'||clean(seed?.productionClass).toUpperCase()!=='DEVELOPMENT_CONFIRMED')continue;
    const id=clean(seed?.gameId);
    if(!/^[a-z0-9][a-z0-9-]*$/.test(id)){failures.push('ACTIVE_GAME_ID_INVALID');continue;}
    const matching=rows.filter(row=>clean(row?.gameId)===id&&clean(row?.productionClass).toUpperCase()==='DEVELOPMENT_CONFIRMED');
    if(matching.length!==1){failures.push(id+':RUNTIME_PROMOTION_QUEUE_BINDING_MISSING_OR_DUPLICATED');continue;}
    const item=matching[0],source=clean(item?.minimumDesignContract?.source);
    if(item?.minimumDesignContract?.pass!==true||!designPath(source,id)||clean(item?.designBaselineSource)!==source){
      failures.push(id+':MINIMUM_DESIGN_SOURCE_NOT_VERIFIED');continue;
    }
    // 일반 웹게임은 같은 설계→Vibe→F0~F9 흐름을 WEB 하나로 사용한다.
    const platform=clean(item?.selectedPlatform).toUpperCase();
    const sourceProfile=platform==='WEB'?item?.platformDesignProfiles?.WEB:item?.platformDesignProfiles?.ROBLOX;
    const profilePointer=platform==='WEB'?'/content/webCanonicalDesign':'/content/platformProfiles/ROBLOX';
    const modeOk=platform==='WEB'
      ?item.ownerWebIntakeEngine==='HTML_CSS_JAVASCRIPT'&&item.web3dRedevelopmentRequired===true
      :platform==='ROBLOX';
    if(!modeOk||(item.concurrentTargetPlatforms||[]).length!==1
      ||item.concurrentTargetPlatforms[0]!==platform
      ||clean(sourceProfile?.source)!==source||sourceProfile?.jsonPointer!==profilePointer){
      failures.push(id+':PLATFORM_HANDOFF_BINDING_INVALID');continue;
    }
    let record;
    try{record=readJsonAt(source);}
    catch{failures.push(id+':AUTHORED_DESIGN_MISSING_AT_RUNTIME_SHA');continue;}
    if(record?.gameId!==id){failures.push(id+':AUTHORED_DESIGN_GAME_ID_MISMATCH');continue;}
    let gate;
    try{gate=verifyDesign(record,{seed,requireGrammar:Math.max(Number(seed?.GAMEPLAY_SKETCH?.version||0),Number(seed?.novelGrammarBackfill?.version||0))>=5});}
    catch{failures.push(id+':DESIGN_CONTRACT_VERIFICATION_ERROR');continue;}
    if(gate?.pass!==true){failures.push(id+':DESIGN_CONTRACT_NOT_PASSED');continue;}
    const designSha256=createHash('sha256').update(JSON.stringify(record)).digest('hex');
    verified.push(Object.freeze({gameId:id,designSource:source,designSha256,contractPass:true,strictQaPassClaimed:false,releasePassClaimed:false}));
  }
  return Object.freeze({pass:failures.length===0,runtimeSha,verified:Object.freeze(verified),failures:Object.freeze(failures)});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const runtimeSha=clean(process.argv.find(s=>s.startsWith('--runtime-sha='))?.slice('--runtime-sha='.length));
  const policyPath=clean(process.env.COMPANY_VERIFIED_POLICY_PATH);
  if(!policyPath||!fs.existsSync(policyPath))throw new Error('VIBE_DESIGN_VERIFIED_POLICY_PATH_REQUIRED');
  const roadmap=JSON.parse(fs.readFileSync(policyPath,'utf8'));
  const readJsonAt=relative=>{
    if(!/^[a-z0-9][a-z0-9._/-]*$/.test(relative)||relative.includes('..'))throw new Error('VIBE_DESIGN_UNSAFE_PATH');
    return JSON.parse(execFileSync('git',['show',runtimeSha+':'+relative],{encoding:'utf8',maxBuffer:48*1024*1024}));
  };
  const result=verifyVibeDesignHandoff({runtimeSha,roadmap,readJsonAt});
  console.log('VIBE2_VERIFIED_DESIGN_RUNTIME_SHA='+runtimeSha);
  console.log('VIBE2_VERIFIED_DESIGN_COUNT='+result.verified.length);
  console.log('VIBE2_VERIFIED_DESIGN_GAME_IDS='+(result.verified.map(x=>x.gameId).join(',')||'NONE'));
  console.log('VIBE2_VERIFIED_DESIGN_INTAKE='+(result.pass?'PASS':'BLOCKED'));
  for(const issue of result.failures)console.error('VIBE2_VERIFIED_DESIGN_BLOCKER='+issue);
  if(!result.pass)process.exitCode=1;
}
