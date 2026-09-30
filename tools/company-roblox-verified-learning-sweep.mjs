import fs from 'node:fs';
import path from 'node:path';
import {createRobloxVibe3LearningContext,existingRobloxGameLearningProfile} from './vibe3-roblox-learning-context.mjs';
import {applyVerifiedExternalLearningToExistingRobloxSource} from './company-development-roblox-bootstrap.mjs';
import {ownerExclusiveDevelopmentGameIds} from './company-selected-platform-router.mjs';

const args=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')).map(x=>{
  const i=x.indexOf('=');
  return i>0?[x.slice(2,i),x.slice(i+1)]:[x.slice(2),'true'];
}));
const root=path.resolve(String(args.root||'roblox-games'));
const playbooksFile=path.resolve(String(args.playbooks||''));
const recombinationFile=String(args.recombination||'').trim()?path.resolve(String(args.recombination)):'';
const reportFile=String(args.report||'').trim()?path.resolve(String(args.report)):'';
const roadmapFile=path.resolve(String(args.roadmap||'company-learning/platform-release-roadmap.json'));
if(!fs.existsSync(root))throw new Error('ROBLOX_GAMES_ROOT_MISSING:'+root);
if(!playbooksFile||!fs.existsSync(playbooksFile))throw new Error('ROBLOX_LEARNING_PLAYBOOKS_MISSING:'+playbooksFile);
if(!fs.existsSync(roadmapFile))throw new Error('ROBLOX_OWNER_EXCLUSIVE_ROADMAP_MISSING:'+roadmapFile);

const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const playbooks=readJson(playbooksFile);
const roadmap=readJson(roadmapFile);
const ownerExclusiveIds=ownerExclusiveDevelopmentGameIds(roadmap);
const ownerExclusiveSet=new Set(ownerExclusiveIds);
const recombination=recombinationFile&&fs.existsSync(recombinationFile)?readJson(recombinationFile):{};
const gameIds=fs.readdirSync(root,{withFileTypes:true})
  .filter(entry=>entry.isDirectory())
  .map(entry=>entry.name)
  .filter(gameId=>!ownerExclusiveSet.has(gameId))
  .filter(gameId=>fs.existsSync(path.join(root,gameId,'shared','GameConfig.luau'))&&fs.existsSync(path.join(root,gameId,'client','Game.client.luau')))
  .sort();

const results=[];
for(const gameId of gameIds){
  const gameRoot=path.join(root,gameId);
  const learningProfile=existingRobloxGameLearningProfile(gameId);
  const learning=createRobloxVibe3LearningContext({gameId,profile:learningProfile,artbook:{},playbooks,recombination});
  if(learning.applied!==true)throw new Error('ROBLOX_SWEEP_LEARNING_NOT_APPLIED:'+gameId);
  if(learning.allRetrievedPrinciplesHaveExplicitDisposition!==true||Number(learning.semanticMappingVersion||0)!==1)throw new Error('ROBLOX_SWEEP_SEMANTIC_MAPPING_NOT_FAIL_CLOSED:'+gameId);
  const applied=applyVerifiedExternalLearningToExistingRobloxSource({root:gameRoot,learning});
  const evidenceFile=path.join(gameRoot,'roblox-source-bootstrap.json');
  let evidence={version:1,gameId,platform:'ROBLOX',sourcePath:path.relative(process.cwd(),gameRoot).replaceAll('\\','/')};
  if(fs.existsSync(evidenceFile)){
    try{evidence=readJson(evidenceFile);}catch{}
  }
  const nextEvidence={
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
    verifiedExternalLearningSweepAt:new Date().toISOString()
  };
  const beforeEvidence=fs.existsSync(evidenceFile)?fs.readFileSync(evidenceFile,'utf8'):'';
  const afterEvidence=JSON.stringify(nextEvidence,null,2)+'\n';
  if(beforeEvidence!==afterEvidence)fs.writeFileSync(evidenceFile,afterEvidence);
  results.push({
    gameId,
    changed:applied.changed||beforeEvidence!==afterEvidence,
    changedFiles:[...applied.changedFiles.map(file=>path.relative(process.cwd(),file).replaceAll('\\','/')),path.relative(process.cwd(),evidenceFile).replaceAll('\\','/')],
    serverTouched:false,
    verifiedExternalLearningFingerprint:learning.verifiedExternalLearningFingerprint||null,
    applyAxes:[...(learning.verifiedExternalLearningApplyAxes||[])],
    semanticMappingVersion:Number(learning.semanticMappingVersion||0),
    semanticVariant:learning.semanticVariant||null,
    coreKind:learning.coreKind||null,
    gameSpecificMappingCount:Number(learning.verifiedExternalLearningGameDevelopmentAppliedCount||0),
    validationOnlyPrincipleCount:Number(learning.verifiedExternalValidationOnlyPrincipleCount||0),
    serverInspection:applied.serverInspection||'AFFECTED_SCOPE_ONLY_PRESENTATION_BINDING'
  });
}
const report={
  version:2,
  semanticMappingVersion:1,
  ownerExclusiveExcludedGameIds:[...ownerExclusiveIds],
  scannedGameCount:results.length,
  changedGameCount:results.filter(row=>row.changed).length,
  serverTouched:false,
  results
};
if(reportFile){
  fs.mkdirSync(path.dirname(reportFile),{recursive:true});
  fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
}
console.log('ROBLOX_VERIFIED_LEARNING_SWEEP_OWNER_EXCLUSIVE_EXCLUDED='+(ownerExclusiveIds.join(',')||'NONE'));
console.log('ROBLOX_VERIFIED_EXTERNAL_LEARNING_SWEEP_SCANNED='+report.scannedGameCount);
console.log('ROBLOX_VERIFIED_EXTERNAL_LEARNING_SWEEP_CHANGED='+report.changedGameCount);
console.log('ROBLOX_VERIFIED_EXTERNAL_LEARNING_SWEEP_SERVER_TOUCHED=NO');
console.log('ROBLOX_VERIFIED_EXTERNAL_LEARNING_SWEEP_SEMANTIC_MAPPING_VERSION=1');
for(const row of results)console.log('ROBLOX_VERIFIED_EXTERNAL_LEARNING_SWEEP_GAME='+row.gameId+':'+(row.changed?'UPDATED':'CURRENT'));
