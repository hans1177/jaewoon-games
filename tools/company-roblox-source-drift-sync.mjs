// Synchronize changed Roblox game source on main with company-runtime without reusing stale release evidence.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {concurrentTargetPlatforms} from './company-selected-platform-router.mjs';
import {validateExistingRobloxSourceTree} from './company-development-roblox-source-reconcile.mjs';

const clean=v=>String(v??'').trim();
const upper=v=>clean(v).toUpperCase();
const arg=(name,fallback='')=>process.argv.find(v=>v.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;

export function robloxBuildInputGameId(file=''){
  const normalized=clean(file).replaceAll('\\','/').replace(/^\.\//,'');
  const parts=normalized.split('/').filter(Boolean);
  if(parts[0]!=='roblox-games'||parts.length<3)return '';
  const gameId=clean(parts[1]);
  const rel=parts.slice(2).join('/');
  if(!/^[a-z0-9][a-z0-9-]{1,48}$/.test(gameId))return '';
  if(rel==='default.project.json'||rel.startsWith('shared/')||rel.startsWith('server/')||rel.startsWith('client/'))return gameId;
  return '';
}
export function changedRobloxBuildGameIds(files=[]){
  return [...new Set((files||[]).map(robloxBuildInputGameId).filter(Boolean))].sort();
}
function robloxBuildPathspecs(gameId=''){
  const root=`roblox-games/${clean(gameId)}`;
  return [`${root}/default.project.json`,`${root}/shared`,`${root}/server`,`${root}/client`];
}
export function robloxBuildSourceChangedBetween({repoRoot='.',gameId='',fromRevision='',toRevision=''}={}){
  const from=clean(fromRevision),to=clean(toRevision),id=clean(gameId);
  if(!/^[0-9a-f]{40}$/i.test(from)||!/^[0-9a-f]{40}$/i.test(to)||!id)return null;
  if(from===to)return false;
  try{
    execFileSync('git',['diff','--quiet',from,to,'--',...robloxBuildPathspecs(id)],{cwd:repoRoot,stdio:'ignore'});
    return false;
  }catch(error){
    if(Number(error?.status)===1)return true;
    return null;
  }
}
function concurrentRobloxSelectionPatch(item={}){
  const selected=upper(item.selectedPlatform||item.targetPlatform);
  const concurrent=Array.isArray(item.concurrentTargetPlatforms)&&item.concurrentTargetPlatforms.some(value=>upper(value)==='ROBLOX');
  return selected&&selected!=='ROBLOX'&&concurrent?{}:{selectedPlatform:'ROBLOX',targetPlatform:'ROBLOX'};
}
export function restoreMetadataOnlyRobloxInvalidation(item,{stamp=new Date().toISOString()}={}){
  const invalidation=item?.robloxEvidenceInvalidatedBySourceChange||{};
  const previous=clean(invalidation.previousSourceRevision);
  const candidate=item?.robloxRuntimeCandidateEvidence||{};
  const preflight=item?.robloxBuildPreflightEvidence||{};
  const headless=item?.robloxHeadlessFastMvpEvidence||{};
  const artifact=clean(candidate.artifactIdentity||preflight.artifactIdentity||preflight?.facts?.build?.artifactIdentity);
  const exact=Boolean(
    /^[0-9a-f]{40}$/i.test(previous)
    &&/^sha256:[0-9a-f]{64}$/i.test(artifact)
    &&clean(candidate.sourceRevision||preflight.sourceRevision||preflight?.facts?.build?.sourceRevision)===previous
    &&clean(candidate.artifactIdentity||artifact)===artifact
    &&(candidate.published===true||preflight.pass===true||preflight.state==='PASS')
  );
  if(!exact)return false;
  const preflightExact=preflight.pass===true
    &&clean(preflight.sourceRevision)===previous
    &&clean(preflight.artifactIdentity)===artifact;
  const headlessExact=headless.pass===true
    &&clean(headless.sourceRevision)===previous
    &&clean(headless.artifactIdentity)===artifact;
  const vibePass=item?.robloxInternalVibePlayEvidence?.pass===true;
  const restoredState=vibePass?'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG':'TARGET_PLATFORM_RUNTIME_FOUNDATION';
  Object.assign(item,concurrentRobloxSelectionPatch(item),{
    status:'ACTIVE',
    currentStep:restoredState,
    canonicalState:restoredState,
    sourcePath:`roblox-games/${item.gameId}`,
    targetSourcePath:`roblox-games/${item.gameId}`,
    robloxProjectPath:`roblox-games/${item.gameId}`,
    robloxSourceCommit:previous,
    robloxBuildOrPackagePassed:true,
    robloxBuildSourceRevision:previous,
    robloxBuildArtifactIdentity:artifact,
    robloxBuildPassedAt:stamp,
    robloxBuildFailedAt:null,
    robloxBuildPreflightPassed:preflightExact,
    robloxBuildPreflightPassedAt:preflightExact?(clean(preflight.checkedAt)||stamp):null,
    robloxBuildPreflightFailedAt:null,
    robloxHeadlessFastMvpPassed:headlessExact,
    robloxFailureStage:null,
    robloxFailureSignature:null,
    routingBlockers:[],
    robloxMetadataOnlySourceRecoveryEvidence:{
      version:1,
      previousSourceRevision:previous,
      ignoredMetadataRevision:clean(invalidation.newSourceRevision)||null,
      artifactIdentity:artifact,
      preflightEvidenceReused:preflightExact,
      headlessEvidenceReused:headlessExact,
      actualPlayEvidencePreserved:vibePass,
      recoveredAt:stamp,
      authority:'canonical-roblox-build-input-diff'
    },
    robloxEvidenceInvalidatedBySourceChange:null,
    updatedAt:stamp
  });
  return true;
}

export function activeRobloxDevelopmentItem(item={}){
  if(upper(item.productionClass)!=='DEVELOPMENT_CONFIRMED')return false;
  if(!['ACTIVE','PENDING'].includes(upper(item.status)))return false;
  if(upper(item.canonicalState)==='DEVELOPMENT_BLOCKED')return false;
  if(!concurrentTargetPlatforms(item).includes('ROBLOX'))return false;
  const ownerDirect=item.ownerDirectDevelopment===true&&upper(item.ownerDirectDevelopmentAuthority).startsWith('OWNER_DIRECTIVE');
  if(ownerDirect)return Boolean(clean(item.designBaselineSource));
  return item.minimumDesignContract?.pass===true;
}

export function invalidateRobloxDownstreamEvidence(item,{sourceRevision,stamp}){
  const previousSourceRevision=clean(item.robloxSourceCommit)||null;
  Object.assign(item,concurrentRobloxSelectionPatch(item),{
    status:'ACTIVE',
    currentStep:'TARGET_PLATFORM_TECHNICAL_VALIDATION',
    canonicalState:'TARGET_PLATFORM_REPAIR_REQUIRED',
    sourcePath:`roblox-games/${item.gameId}`,
    targetSourcePath:`roblox-games/${item.gameId}`,
    robloxProjectPath:`roblox-games/${item.gameId}`,
    robloxSourceCommit:sourceRevision,
    robloxSourceBootstrapPassedAt:stamp,
    robloxSourceBootstrapFailedAt:null,
    robloxBuildOrPackagePassed:false,
    robloxBuildSourceRevision:null,
    robloxBuildArtifactIdentity:null,
    robloxBuildPassedAt:null,
    robloxBuildFailedAt:null,
    robloxBuildPreflightPassed:false,
    robloxBuildPreflightPassedAt:null,
    robloxBuildPreflightFailedAt:null,
    robloxRuntimePassed:false,
    robloxRuntimePassedAt:null,
    robloxRuntimeFailedAt:null,
    robloxServerClientBoundaryPassed:false,
    robloxDatastoreRejoinPassed:false,
    robloxMobileControlUiPassed:false,
    robloxIndependentQaPassed:false,
    robloxIndependentQaPassedAt:null,
    robloxRegressionPassed:false,
    robloxRegressionPassedAt:null,
    robloxFinalReviewPassed:false,
    robloxFinalReviewPassedAt:null,
    robloxExactRevisionPassed:false,
    robloxMultiplayerQaPassed:false,
    robloxHeadlessFastMvpPassed:false,
    robloxHeadlessFinalReviewPassed:false,
    robloxHeadlessPassedAt:null,
    robloxInternalReleaseReady:false,
    robloxInternalReleasePublished:false,
    robloxPublicReleaseReady:false,
    robloxPublicRelease:false,
    robloxReleaseClaim:false,
    robloxReleasePublishedAt:null,
    robloxFastMvpPublished:false,
    robloxFastMvpPublishedAt:null,
    robloxLastSuccessfulStage:'TARGET_PLATFORM_SOURCE_BIND',
    robloxFailureStage:'TARGET_PLATFORM_BUILD_OR_PACKAGE',
    robloxFailureSignature:'ROBLOX_BUILD_PACKAGE_REVALIDATION_PENDING',
    robloxEvidenceInvalidatedBySourceChange:{previousSourceRevision,newSourceRevision:sourceRevision,invalidatedAt:stamp},
    routingBlockers:['roblox-build-package-revalidation-pending'],
    updatedAt:stamp,
  });
}

export function reconcileChangedRobloxItems({queue={},changedGameIds=[],sourceRevision='',stamp=new Date().toISOString(),validateItem}={}){
  if(typeof validateItem!=='function')throw new Error('validateItem callback required');
  if(!/^[0-9a-f]{40}$/i.test(sourceRevision))throw new Error('sourceRevision must be a 40-char sha');
  const changed=[...new Set((changedGameIds||[]).map(clean).filter(Boolean))];
  const results=[];
  for(const gameId of changed){
    const item=(queue.items||[]).find(x=>clean(x.gameId)===gameId);
    if(!item||!activeRobloxDevelopmentItem(item)){results.push({gameId,skipped:true,reason:'not-active-development'});continue;}
    const verdict=validateItem(item);
    if(verdict?.pass===true){
      if(verdict?.buildSourceChanged==null){
        results.push({
          gameId,
          pass:false,
          sourceRevision,
          blockers:['ROBLOX_BUILD_SOURCE_DIFF_UNAVAILABLE'],
          comparisonBaseRevision:clean(verdict?.comparisonBaseRevision)||null,
          nonMutating:true
        });
        continue;
      }
      if(verdict?.buildSourceChanged===false){
        const restored=restoreMetadataOnlyRobloxInvalidation(item,{stamp});
        results.push({gameId,pass:true,sourceRevision,buildSourceChanged:false,metadataOnly:true,restored});
        continue;
      }
      invalidateRobloxDownstreamEvidence(item,{sourceRevision,stamp});
      results.push({gameId,pass:true,sourceRevision,buildSourceChanged:verdict?.buildSourceChanged!==false});
    }else{
      const blockers=Array.isArray(verdict?.blockers)?verdict.blockers:['SOURCE_REVALIDATION_FAILED'];
      Object.assign(item,{
        status:'ACTIVE',currentStep:'TARGET_PLATFORM_SOURCE_BIND',canonicalState:'TARGET_PLATFORM_REPAIR_REQUIRED',
        robloxSourceBootstrapFailedAt:stamp,robloxRuntimePassed:false,robloxHeadlessFastMvpPassed:false,
        robloxInternalReleaseReady:false,robloxInternalReleasePublished:false,robloxPublicReleaseReady:false,robloxPublicRelease:false,robloxReleaseClaim:false,
        robloxFailureStage:'TARGET_PLATFORM_SOURCE_BIND',robloxFailureSignature:'ROBLOX_CHANGED_SOURCE_REVALIDATION_FAILED',
        routingBlockers:[`roblox-source-drift:${blockers.join('|')}`],updatedAt:stamp,
      });
      results.push({gameId,pass:false,blockers});
    }
  }
  queue.updatedAt=stamp;
  return {queue,results};
}

function runCli(){
  const resolveFiles=arg('resolve-files');
  if(resolveFiles){
    const files=fs.existsSync(resolveFiles)?fs.readFileSync(resolveFiles,'utf8').split(/\r?\n/).map(clean).filter(Boolean):[];
    process.stdout.write(changedRobloxBuildGameIds(files).join(','));
    return;
  }
  const generation=clean(process.env.ROBLOX_SOURCE_DRIFT_SYNC_GENERATION);
  if(generation!=='v2')throw new Error('ROBLOX_SOURCE_DRIFT_SYNC_GENERATION_STALE:'+(generation||'MISSING'));
  const queueFile=arg('queue');
  const repoRoot=arg('repo-root','.');
  const runtimeRef=arg('runtime-ref');
  const sourceRevision=arg('source-revision');
  const changedGameIds=arg('changed-game-ids').split(',').map(clean).filter(Boolean);
  const output=arg('output','/tmp/company-roblox-source-drift-sync.json');
  if(!queueFile||!runtimeRef||!sourceRevision)throw new Error('required: --queue, --runtime-ref, --source-revision');
  const queue=JSON.parse(fs.readFileSync(queueFile,'utf8'));
  const result=reconcileChangedRobloxItems({
    queue,changedGameIds,sourceRevision,
    validateItem:item=>{
      const sourcePath=`roblox-games/${item.gameId}`;
      const root=path.join(repoRoot,sourcePath);
      if(!fs.existsSync(root))return {pass:false,blockers:['SOURCE_ROOT_MISSING']};
      const baselinePath=clean(item.designBaselineSource);
      if(!baselinePath)return {pass:false,blockers:['DESIGN_BASELINE_MISSING']};
      try{
        const baseline=JSON.parse(execFileSync('git',['show',`${runtimeRef}:${baselinePath}`],{encoding:'utf8',maxBuffer:8*1024*1024}));
        const verdict=validateExistingRobloxSourceTree({root,baseline});
        const comparisonBase=clean(item?.robloxEvidenceInvalidatedBySourceChange?.previousSourceRevision)||clean(item?.robloxSourceCommit);
        const buildSourceChanged=robloxBuildSourceChangedBetween({repoRoot,gameId:item.gameId,fromRevision:comparisonBase,toRevision:sourceRevision});
        return {...verdict,buildSourceChanged,comparisonBaseRevision:comparisonBase};

      }catch(error){
        return {pass:false,blockers:['SOURCE_BASELINE_OR_VALIDATION_UNAVAILABLE'],detail:String(error?.message||error)};
      }
    },
  });
  fs.writeFileSync(queueFile,JSON.stringify(result.queue,null,2)+'\n');
  fs.writeFileSync(output,JSON.stringify(result.results,null,2)+'\n');
  console.log(`ROBLOX_CHANGED_SOURCE_SYNC_COUNT=${result.results.length}`);
  console.log(`ROBLOX_CHANGED_SOURCE_SYNC_PASS=${result.results.filter(x=>x.pass===true).length}`);
  console.log(`ROBLOX_CHANGED_SOURCE_SYNC_FAIL=${result.results.filter(x=>x.pass===false).length}`);
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href)runCli();
