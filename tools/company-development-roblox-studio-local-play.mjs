import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const clean=v=>String(v??'').trim();
const bool=v=>String(v??'').toLowerCase()==='true';
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');};

export function validateLocalStudioPolicy(roadmap={}){
  const studio=roadmap?.roblox?.studioExecution||{};
  const usage=roadmap?.developmentLifecycleMachine?.robloxStudioUsage||{};
  const pass=
    studio.enabled===true
    &&studio.required===true
    &&studio.localPlaceFileRequired===true
    &&studio.onlinePublishedPlaceDirectOpenForbidden===true
    &&studio.placeIdOrUniverseIdAsStudioLaunchTargetForbidden===true
    &&usage.learningUseForbidden===false
    &&Array.isArray(usage.forbidden)
    &&usage.forbidden.includes('ROBLOX_PLAYER_AUTOMATION')
    &&usage.forbidden.includes('PUBLIC_SERVER_BOT_PLAY')
    &&usage.forbidden.includes('PUBLISHED_PLACE_DIRECT_STUDIO_AUTOMATION');
  if(!pass)throw new Error('ROBLOX_STUDIO_LOCAL_ONLY_POLICY_MISMATCH');
  return true;
}

function artifactRunIdFor(item={},candidate={}){
  return Number(candidate?.artifactRunId||item?.robloxFoundationF0Evidence?.artifactRunId||item?.robloxHeadlessFastMvpEvidence?.artifactRunId||0);
}

export function planLocalStudioCandidates({queue={},roadmap={},requestedGameId=''}={}){
  validateLocalStudioPolicy(roadmap);
  const requested=clean(requestedGameId);
  const include=[];
  for(const item of queue?.items||[]){
    if(requested&&clean(item?.gameId)!==requested)continue;
    const candidate=item?.robloxRuntimeCandidateEvidence||{};
    const sourceRevision=clean(item?.robloxSourceCommit);
    const artifactIdentity=clean(item?.robloxBuildArtifactIdentity);
    const artifactRunId=artifactRunIdFor(item,candidate);
    const exact=Boolean(
      item?.robloxBuildOrPackagePassed===true
      &&clean(item?.robloxBuildSourceRevision)===sourceRevision
      &&/^sha256:[0-9a-f]{64}$/i.test(artifactIdentity)
      &&candidate?.published===true
      &&clean(candidate?.sourceRevision)===sourceRevision
      &&clean(candidate?.artifactIdentity)===artifactIdentity
      &&Number(candidate?.artifactRunId||0)===artifactRunId
      &&artifactRunId>0
      &&/^[1-9][0-9]*$/.test(String(candidate?.universeId||''))
      &&/^[1-9][0-9]*$/.test(String(candidate?.placeId||''))
      &&Number(candidate?.versionNumber||0)>0
      &&clean(candidate?.authority).startsWith('roblox-open-cloud-')
    );
    if(!exact)continue;
    const prior=item?.robloxInternalVibePlayEvidence||{};
    const alreadyObserved=Boolean(
      prior?.localPlaceFile===true
      &&prior?.onlinePlaceDirectOpen===false
      &&prior?.robloxPlayerAutomation===false
      &&clean(prior?.sourceRevision)===sourceRevision
      &&clean(prior?.artifactIdentity)===artifactIdentity
      &&Number(prior?.artifactRunId||0)===artifactRunId
      &&String(prior?.universeId||'')===String(candidate?.universeId||'')
      &&String(prior?.placeId||'')===String(candidate?.placeId||'')
      &&Number(prior?.versionNumber||0)===Number(candidate?.versionNumber||0)
      &&Boolean(clean(prior?.testedAt))
    );
    if(alreadyObserved)continue;
    include.push({
      gameId:clean(item.gameId),
      sourceRevision,
      artifactIdentity,
      artifactRunId,
      universeId:String(candidate.universeId),
      placeId:String(candidate.placeId),
      versionNumber:Number(candidate.versionNumber)
    });
  }
  return{include};
}

export function createLocalStudioPlayEvidence({
  item={},runtime={},expected={},workflowRunId=0,studioStepSucceeded=true,testedAt=new Date().toISOString()
}={}){
  const candidate=item?.robloxRuntimeCandidateEvidence||{};
  const sourceRevision=clean(expected?.sourceRevision);
  const artifactIdentity=clean(expected?.artifactIdentity);
  const artifactRunId=Number(expected?.artifactRunId||0);
  const universeId=String(expected?.universeId||'');
  const placeId=String(expected?.placeId||'');
  const versionNumber=Number(expected?.versionNumber||0);
  const exactCurrent=Boolean(
    clean(item?.robloxSourceCommit)===sourceRevision
    &&clean(item?.robloxBuildArtifactIdentity)===artifactIdentity
    &&candidate?.published===true
    &&clean(candidate?.authority).startsWith('roblox-open-cloud-')
    &&clean(candidate?.sourceRevision)===sourceRevision
    &&clean(candidate?.artifactIdentity)===artifactIdentity
    &&Number(candidate?.artifactRunId||0)===artifactRunId
    &&String(candidate?.universeId||'')===universeId
    &&String(candidate?.placeId||'')===placeId
    &&Number(candidate?.versionNumber||0)===versionNumber
  );
  if(!exactCurrent)throw new Error('ROBLOX_STUDIO_LOCAL_CANDIDATE_STALE');
  if(clean(runtime?.authority)!=='vibe2-roblox-studio-runtime')throw new Error('ROBLOX_STUDIO_LOCAL_RUNTIME_AUTHORITY_INVALID');

  const actions=(Array.isArray(runtime?.actions)?runtime.actions:[]).map(row=>({
    id:clean(row?.id),
    type:clean(row?.type),
    dispatched:row?.dispatched===true,
    ok:row?.ok===true
  })).filter(row=>row.id&&row.type);
  const checkpoints=(Array.isArray(runtime?.checkpoints)?runtime.checkpoints:[]).map(row=>({
    id:clean(row?.id),
    name:clean(row?.name||row?.id),
    required:row?.required!==false,
    pass:row?.pass===true
  })).filter(row=>row.id);
  const errors=(Array.isArray(runtime?.errors)?runtime.errors:[]).map(row=>({
    type:clean(row?.type||'runtime-error'),
    actionId:clean(row?.actionId)||null
  })).filter(row=>row.type);
  const required=checkpoints.filter(row=>row.required!==false);
  const dispatched=actions.some(row=>row.dispatched===true&&row.ok===true);
  const studioCapability=runtime?.capabilities?.studioTestService===true;
  const virtualInput=runtime?.capabilities?.virtualInput===true;
  const actualPlay=studioCapability;
  const requiredPass=required.length>0&&required.every(row=>row.pass===true);
  const pass=Boolean(
    studioStepSucceeded===true
    &&actualPlay
    &&runtime?.runtimeVerified===true
    &&virtualInput
    &&dispatched
    &&requiredPass
    &&errors.length===0
  );
  const failureClass=pass?null
    :errors.length?'STUDIO_RUNTIME_ERROR'
    :required.some(row=>row.pass!==true)?'STUDIO_REQUIRED_CHECKPOINT_FAILURE'
    :!dispatched?'STUDIO_INPUT_NOT_OBSERVED'
    :'STUDIO_LOCAL_PLAY_FAILED';
  const learningSignals=[
    'roblox studio local runtime',
    ...actions.filter(row=>row.ok===true).map(row=>clean(row.type||row.id||'input')),
    ...checkpoints.filter(row=>row.pass===true).map(row=>clean(row.name||row.id||'checkpoint')),
    ...(errors.length?['debugging','runtime error']:[])
  ].filter(Boolean).slice(0,40);

  return{
    pass,
    evidence:{
      version:1,
      gameId:clean(item?.gameId),
      authority:'vibe2-roblox-studio-runtime',
      pass,
      actualPlay,
      runtimeVerified:runtime?.runtimeVerified===true,
      learningReusable:actualPlay&&(pass||errors.length>0||required.some(row=>row.pass!==true)),
      infrastructureFailure:false,
      failureClass,
      localPlaceFile:true,
      onlinePlaceDirectOpen:false,
      robloxPlayerAutomation:false,
      studioLaunchTarget:'LOCAL_EXACT_BUILD_ARTIFACT',
      sourceRevision,
      artifactIdentity,
      artifactRunId,
      universeId,
      placeId,
      versionNumber,
      publishedCandidateCrossCheckPassed:true,
      publishedCandidateCrossCheckAuthority:'OPEN_CLOUD',
      capabilities:{
        studioTestService:studioCapability,
        virtualInput
      },
      actions,
      checkpoints,
      errors,
      runtimeSummary:{
        consoleErrorCount:Number(runtime?.metrics?.consoleErrorCount||0)
      },
      learningSignals,
      rawSourceIncluded:false,
      rawGameplayValuesIncluded:false,
      scenarioCoverage:[],
      scenarioCoveragePass:false,
      testedAt,
      workflowRunId:Number(workflowRunId||0),
      publicationAuthority:false,
      publicationTargetDiscovery:false
    }
  };
}

export function applyLocalStudioPlayResult({queue={},gameId='',runtime={},expected={},workflowRunId=0,studioStepSucceeded=true,testedAt}={}){
  const item=(queue?.items||[]).find(row=>clean(row?.gameId)===clean(gameId));
  if(!item)throw new Error('ROBLOX_STUDIO_LOCAL_QUEUE_ITEM_MISSING:'+clean(gameId));
  const result=createLocalStudioPlayEvidence({item,runtime,expected,workflowRunId,studioStepSucceeded,testedAt});
  item.robloxInternalVibePlayEvidence=result.evidence;
  item.robloxInternalPlaytestPassed=result.pass;
  item.robloxInternalPlaytestPassedAt=result.pass?result.evidence.testedAt:null;
  item.robloxStudioLocalPlayRepairRequired=!result.pass;
  item.robloxStudioLocalPlayInfrastructurePending=false;
  if(!result.pass){
    item.canonicalState='REPAIR_REQUIRED';
    item.robloxFailureStage='VIBE_INTERNAL_PLAY';
    item.robloxFailureSignature=result.evidence.errors.length?'ROBLOX_STUDIO_LOCAL_RUNTIME_ERROR':'ROBLOX_STUDIO_LOCAL_PLAY_CHECKPOINT_FAILED';
    item.routingBlockers=['roblox-studio-local-play-repair-required'];
  }
  item.updatedAt=result.evidence.testedAt;
  queue.updatedAt=result.evidence.testedAt;
  return{queue,item,result};
}

function args(argv=process.argv.slice(2)){
  const out={};
  for(const raw of argv){
    if(!raw.startsWith('--'))continue;
    const i=raw.indexOf('=');
    if(i<0)out[raw.slice(2)]=true;
    else out[raw.slice(2,i)]=raw.slice(i+1);
  }
  return out;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const a=args();
  const mode=clean(a.mode);
  if(mode==='plan'){
    const matrix=planLocalStudioCandidates({
      queue:readJson(a.queue),
      roadmap:readJson(a.roadmap),
      requestedGameId:clean(a['game-id'])
    });
    writeJson(a.output,matrix);
    console.log('ROBLOX_STUDIO_LOCAL_PLAN_COUNT='+matrix.include.length);
  }else if(mode==='persist'){
    const queue=readJson(a.queue);
    const runtime=readJson(a.runtime);
    const expected={
      sourceRevision:clean(a['source-revision']),
      artifactIdentity:clean(a['artifact-identity']),
      artifactRunId:Number(a['artifact-run-id']||0),
      universeId:clean(a['universe-id']),
      placeId:clean(a['place-id']),
      versionNumber:Number(a['version-number']||0)
    };
    const applied=applyLocalStudioPlayResult({
      queue,
      gameId:clean(a['game-id']),
      runtime,
      expected,
      workflowRunId:Number(a['workflow-run-id']||0),
      studioStepSucceeded:bool(a['studio-step-succeeded']),
      testedAt:clean(a['tested-at'])||undefined
    });
    writeJson(a.queue,applied.queue);
    console.log('ROBLOX_STUDIO_LOCAL_PLAY_RESULT='+clean(a['game-id'])+':'+(applied.result.pass?'PASS':'FAIL'));
    console.log('ROBLOX_STUDIO_LOCAL_PLAY_LEARNING='+(applied.result.evidence.learningReusable?'VERIFIED':'NO'));
  }else{
    throw new Error('unsupported --mode; expected plan or persist');
  }
}
