import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRobloxVibe3LearningContext,existingRobloxGameLearningProfile} from './vibe3-roblox-learning-context.mjs';
import {robloxLearningProfileFromSource} from './company-development-roblox-gameplay-product-readiness.mjs';
import {latestVerifiedDesign} from './company-all-games-design-reset.mjs';
import {latestMinimumDesign} from './company-minimum-design-contract.mjs';
import {applyVerifiedExternalLearningToExistingRobloxSource,robloxBuildProfileFromBaseline,ROBLOX_VERIFIED_EXTERNAL_NATIVE_BINDING_VERSION} from './company-development-roblox-bootstrap.mjs';

const args=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')).map(x=>{
  const i=x.indexOf('=');
  return i>0?[x.slice(2,i),x.slice(i+1)]:[x.slice(2),'true'];
}));
const root=path.resolve(String(args.root||'roblox-games'));
const playbooksFile=path.resolve(String(args.playbooks||''));
const recombinationFile=String(args.recombination||'').trim()?path.resolve(String(args.recombination)):'';
const reportFile=String(args.report||'').trim()?path.resolve(String(args.report)):'';
const requestedGameId=String(args['game-id']||'').trim();
const requestedGameIds=[...new Set([
  requestedGameId,
  ...String(args['game-ids']||'').split(',').map(value=>value.trim())
].filter(Boolean))].sort();
for(const gameId of requestedGameIds){
  if(!/^[a-z0-9][a-z0-9-]{1,80}$/.test(gameId))throw new Error('ROBLOX_LEARNING_SWEEP_GAME_ID_INVALID:'+gameId);
}
const requestedGameSet=new Set(requestedGameIds);
if(!fs.existsSync(root))throw new Error('ROBLOX_GAMES_ROOT_MISSING:'+root);
if(!playbooksFile||!fs.existsSync(playbooksFile))throw new Error('ROBLOX_LEARNING_PLAYBOOKS_MISSING:'+playbooksFile);

const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const runtimeRef=String(args['runtime-ref']||'').trim();
const runtimeQueueFile=String(args['runtime-queue']||'').trim();
if(Boolean(runtimeRef)!==Boolean(runtimeQueueFile)||runtimeRef&&!/^[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(runtimeRef)){
  throw new Error('ROBLOX_SWEEP_RUNTIME_DESIGN_INPUT_INVALID');
}
const runtimeQueue=runtimeQueueFile?readJson(path.resolve(runtimeQueueFile)):null;
const runtimeItems=new Map((runtimeQueue?.items||[]).filter(item=>item?.gameId).map(item=>[String(item.gameId),item]));
const nativeBindingVersion=source=>{
  const match=String(source||'').match(/VERIFIED_EXTERNAL_LEARNING_NATIVE_BINDING_VERSION\s*=\s*(\d+)/);
  return Number(match?.[1]||0);
};
const playbooks=readJson(playbooksFile);
const recombination=recombinationFile&&fs.existsSync(recombinationFile)?readJson(recombinationFile):{};
const gameIds=fs.readdirSync(root,{withFileTypes:true})
  .filter(entry=>entry.isDirectory())
  .map(entry=>entry.name)
  .filter(gameId=>!requestedGameSet.size||requestedGameSet.has(gameId))
  .filter(gameId=>fs.existsSync(path.join(root,gameId,'shared','GameConfig.luau'))&&fs.existsSync(path.join(root,gameId,'client','Game.client.luau')))
  .sort();
if(requestedGameSet.size){
  const found=new Set(gameIds);
  const missing=requestedGameIds.filter(gameId=>!found.has(gameId));
  if(missing.length)throw new Error('ROBLOX_LEARNING_SWEEP_GAME_NOT_FOUND:'+missing.join(','));
}

const results=[];
for(const gameId of gameIds){
  const gameRoot=path.join(root,gameId);
  const configSource=fs.readFileSync(path.join(gameRoot,'shared','GameConfig.luau'),'utf8');
  const fallbackProfile=existingRobloxGameLearningProfile(gameId);
  const sourceProfile=robloxLearningProfileFromSource({gameId,config:configSource,fallback:fallbackProfile});
  // Use the same canonical company-runtime design as exact source reconciliation.
  // Runtime design baselines are not committed into main.
  const runtimeItem=runtimeItems.get(gameId);
  if(runtimeQueue&&requestedGameSet.has(gameId)&&!runtimeItem)throw new Error('ROBLOX_SWEEP_RUNTIME_GAME_NOT_IN_QUEUE:'+gameId);
  if(runtimeItem&&(String(runtimeItem.productionClass||'').toUpperCase()!=='DEVELOPMENT_CONFIRMED'||String(runtimeItem.status||'').toUpperCase()!=='ACTIVE')){
    if(requestedGameSet.has(gameId))throw new Error('ROBLOX_SWEEP_RUNTIME_GAME_INELIGIBLE:'+gameId);
    continue;
  }
  let runtimeBaseline=null;
  const baselinePath=String(runtimeItem?.designBaselineSource||'').trim();
  if(runtimeItem){
    if(!new RegExp('^design/'+gameId+'/[0-9]{4}-[0-9]{2}-[0-9]{2}/design-revised\\.json$').test(baselinePath)){
      throw new Error('ROBLOX_SWEEP_RUNTIME_DESIGN_PATH_INVALID:'+gameId);
    }
    try{
      runtimeBaseline=JSON.parse(execFileSync('git',['show',runtimeRef+':'+baselinePath],{
        cwd:process.cwd(),encoding:'utf8',maxBuffer:4*1024*1024
      }));
    }catch{
      throw new Error('ROBLOX_SWEEP_RUNTIME_DESIGN_BASELINE_UNAVAILABLE:'+gameId);
    }
    if(runtimeBaseline?.gameId!==gameId)throw new Error('ROBLOX_SWEEP_RUNTIME_DESIGN_GAME_ID_MISMATCH:'+gameId);
  }
  const designContext=runtimeBaseline?{record:runtimeBaseline}:(latestVerifiedDesign(process.cwd(),gameId)||latestMinimumDesign(process.cwd(),gameId));
  const designProfile=designContext?.record?robloxBuildProfileFromBaseline(designContext.record):null;
  const learningProfile=designProfile||sourceProfile;
  const learning=createRobloxVibe3LearningContext({gameId,profile:learningProfile,artbook:{},playbooks,recombination});
  if(learning.applied!==true)throw new Error('ROBLOX_SWEEP_LEARNING_NOT_APPLIED:'+gameId);
  if(learning.allRetrievedPrinciplesHaveExplicitDisposition!==true||Number(learning.semanticMappingVersion||0)!==1)throw new Error('ROBLOX_SWEEP_SEMANTIC_MAPPING_NOT_FAIL_CLOSED:'+gameId);
  const clientFile=path.join(gameRoot,'client','Game.client.luau');
  const currentClientSource=fs.readFileSync(clientFile,'utf8');
  const currentNativeBindingVersion=nativeBindingVersion(currentClientSource);
  let applied;
  if(currentNativeBindingVersion>ROBLOX_VERIFIED_EXTERNAL_NATIVE_BINDING_VERSION&&!requestedGameSet.has(gameId)){
    // Preserve legacy all-game sweep behavior; only the exact reconciliation scope may
    // refresh a newer game-owned native client's verified config.
    const requiredConfigSignals=[
      `MemoryFingerprint = "${learning.verifiedExternalLearningFingerprint||''}"`,
      `SemanticMappingVersion = ${Number(learning.semanticMappingVersion||0)}`,
      'GameSpecificSemanticMappings = {',
      'LearningDispositions = {'
    ];
    if(requiredConfigSignals.some(signal=>!configSource.includes(signal))){
      throw new Error('ROBLOX_SWEEP_NEWER_NATIVE_BINDING_CONFIG_DRIFT:'+gameId);
    }
    applied=Object.freeze({changed:false,changedFiles:Object.freeze([]),serverInspection:'PRESERVED_NEWER_NATIVE_BINDING'});
  }else if(currentNativeBindingVersion>ROBLOX_VERIFIED_EXTERNAL_NATIVE_BINDING_VERSION){
    // Refresh only the managed config and context; do not downgrade game-owned native code.
    const nativePattern=/-- VERIFIED_EXTERNAL_LEARNING_ROBLOX_NATIVE_BEGIN\n[\s\S]*?-- VERIFIED_EXTERNAL_LEARNING_ROBLOX_NATIVE_END/;
    const nativeBefore=currentClientSource.match(nativePattern)?.[0]||'';
    const currentVariant=configSource.match(/SemanticVariant\s*=\s*["']([^"']+)["']/)?.[1]||'';
    if(!nativeBefore||!currentVariant||currentVariant!==learning.semanticVariant){
      throw new Error('ROBLOX_SWEEP_NEWER_NATIVE_BINDING_CONFIG_DRIFT:'+gameId);
    }
    const refreshed=applyVerifiedExternalLearningToExistingRobloxSource({root:gameRoot,learning});
    const afterClient=fs.readFileSync(clientFile,'utf8');
    if(afterClient.match(nativePattern)?.[0]!==nativeBefore
      ||nativeBindingVersion(afterClient)!==currentNativeBindingVersion){
      throw new Error('ROBLOX_SWEEP_NEWER_NATIVE_BINDING_CONFIG_DRIFT:'+gameId);
    }
    applied=Object.freeze({...refreshed,serverInspection:'PRESERVED_NEWER_NATIVE_BINDING'});
  }else{
    applied=applyVerifiedExternalLearningToExistingRobloxSource({root:gameRoot,learning});
  }
  const evidenceFile=path.join(gameRoot,'roblox-source-bootstrap.json');
  let evidence={version:1,gameId,platform:'ROBLOX',sourcePath:path.relative(process.cwd(),gameRoot).replaceAll('\\','/')};
  if(fs.existsSync(evidenceFile)){
    try{evidence=readJson(evidenceFile);}catch{}
  }
  const previousSweepAt=typeof evidence.verifiedExternalLearningSweepAt==='string'
    ?evidence.verifiedExternalLearningSweepAt
    :null;
  let nextEvidence={
    ...evidence,
    vibe3LearningApplied:true,
    verifiedExternalLearningAppliedToExistingSource:true,
    verifiedExternalLearningIds:[...(learning.verifiedExternalLearningIds||[])],
    verifiedExternalLearningFingerprint:learning.verifiedExternalLearningFingerprint||null,
    verifiedExternalLearningApplyAxes:[...(learning.verifiedExternalLearningApplyAxes||[])],
    verifiedExternalLearningRetrievedCount:Number(learning.verifiedExternalLearningRetrievedCount||0),
    verifiedExternalLearningAppliedCount:Number(learning.verifiedExternalLearningAppliedCount||0),
    semanticMappingVersion:Number(learning.semanticMappingVersion||0),
    semanticMappingFingerprint:learning.semanticMappingFingerprint||null,
    semanticVariant:learning.semanticVariant||null,
    coreKind:learning.coreKind||null,
    gameSpecificSemanticMappings:[...(learning.gameSpecificSemanticMappings||[])],
    verifiedExternalLearningDispositions:[...(learning.verifiedExternalLearningDispositions||[])],
    verifiedExternalValidationOnlyPrincipleCount:Number(learning.verifiedExternalValidationOnlyPrincipleCount||0),
    verifiedExternalLearningGameDevelopmentAppliedCount:Number(learning.verifiedExternalLearningGameDevelopmentAppliedCount||0),
    serverTouchedByVerifiedExternalLearningSweep:false,
    verifiedExternalLearningSweepAt:previousSweepAt
  };
  const beforeEvidence=fs.existsSync(evidenceFile)?fs.readFileSync(evidenceFile,'utf8'):'';
  const stableEvidence=JSON.stringify(nextEvidence,null,2)+'\n';
  const evidenceContentChanged=beforeEvidence!==stableEvidence;
  const sweepChanged=applied.changed||evidenceContentChanged;
  if(sweepChanged)nextEvidence={...nextEvidence,verifiedExternalLearningSweepAt:new Date().toISOString()};
  const afterEvidence=JSON.stringify(nextEvidence,null,2)+'\n';
  const evidenceFileChanged=beforeEvidence!==afterEvidence;
  if(evidenceFileChanged)fs.writeFileSync(evidenceFile,afterEvidence);
  const changedFiles=[...applied.changedFiles.map(file=>path.relative(process.cwd(),file).replaceAll('\\','/'))];
  if(evidenceFileChanged)changedFiles.push(path.relative(process.cwd(),evidenceFile).replaceAll('\\','/'));
  results.push({
    gameId,
    changed:sweepChanged,
    changedFiles,
    serverTouched:false,
    verifiedExternalLearningFingerprint:learning.verifiedExternalLearningFingerprint||null,
    applyAxes:[...(learning.verifiedExternalLearningApplyAxes||[])],
    semanticMappingVersion:Number(learning.semanticMappingVersion||0),
    semanticVariant:learning.semanticVariant||null,
    coreKind:learning.coreKind||null,
    gameSpecificMappingCount:Number(learning.verifiedExternalLearningGameDevelopmentAppliedCount||0),
    sourceProfile,
    designProfile,
    runtimeDesignBaselineSource:runtimeBaseline?baselinePath:null,
    profileMismatch:Boolean(designProfile&&(String(designProfile.genre)!==String(sourceProfile.genre)||String(designProfile.playMode)!==String(sourceProfile.playMode))),
    validationOnlyPrincipleCount:Number(learning.verifiedExternalValidationOnlyPrincipleCount||0),
    serverInspection:applied.serverInspection||'AFFECTED_SCOPE_ONLY_PRESENTATION_BINDING',
    currentNativeBindingVersion,
    generatorNativeBindingVersion:Number(ROBLOX_VERIFIED_EXTERNAL_NATIVE_BINDING_VERSION||0),
    newerNativeBindingPreserved:currentNativeBindingVersion>ROBLOX_VERIFIED_EXTERNAL_NATIVE_BINDING_VERSION
  });
}
const report={
  version:4,
  requestedGameId:requestedGameId||null,
  requestedGameIds,
  semanticMappingVersion:1,
  scannedGameCount:results.length,
  changedGameCount:results.filter(row=>row.changed).length,
  serverTouched:false,
  results
};
if(reportFile){
  fs.mkdirSync(path.dirname(reportFile),{recursive:true});
  fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
}
console.log('ROBLOX_VERIFIED_EXTERNAL_LEARNING_SWEEP_SCOPE='+(requestedGameIds.length?requestedGameIds.join(','):'ALL'));
console.log('ROBLOX_VERIFIED_EXTERNAL_LEARNING_SWEEP_SCANNED='+report.scannedGameCount);
console.log('ROBLOX_VERIFIED_EXTERNAL_LEARNING_SWEEP_CHANGED='+report.changedGameCount);
console.log('ROBLOX_VERIFIED_EXTERNAL_LEARNING_SWEEP_SERVER_TOUCHED=NO');
console.log('ROBLOX_VERIFIED_EXTERNAL_LEARNING_SWEEP_SEMANTIC_MAPPING_VERSION=1');
for(const row of results)console.log('ROBLOX_VERIFIED_EXTERNAL_LEARNING_SWEEP_GAME='+row.gameId+':'+(row.changed?'UPDATED':'CURRENT'));
