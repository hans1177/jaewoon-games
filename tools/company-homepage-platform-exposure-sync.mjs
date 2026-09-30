// 파일명: tools/company-homepage-platform-exposure-sync.mjs
// 역할: 운영 플랫폼 상태와 검증·배포가 끝난 고유 개발 회차를 홈페이지에 전달한다.
// 임포트
import fs from 'node:fs';
import { compileHomepageCentralPolicy } from './company-shared-context.mjs';
import { evaluateInternalRelease } from './company-platform-exposure-control.mjs';

const clean=v=>String(v??'').trim();
const bool=v=>v===true;
const num=v=>Number.isFinite(Number(v))&&Number(v)>0?Number(v):null;
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');

// 완주 기록: 현재 수리 상태와 과거 완주를 분리하고 재시도는 같은 회차로 집계한다.
export function verifiedCompletionHistory(item={},platform='ROBLOX'){
  const roblox=platform==='ROBLOX';
  const rows=roblox
    ?[...(Array.isArray(item.robloxCanonicalPublishQueue)?item.robloxCanonicalPublishQueue:[]),item.robloxCanonicalReleaseEvidence,item.robloxLastCanonicalPublishedEvidence]
    :[...(Array.isArray(item.unityCanonicalPublishHistory)?item.unityCanonicalPublishHistory:[]),item.unityCanonicalReleaseEvidence];
  const cycles=new Map();
  for(const row of rows){
    if(!row||row.published!==true||!Number.isFinite(Date.parse(row.publishedAt)))continue;
    if(row.gameId&&clean(row.gameId)!==clean(item.gameId))continue;
    const sourceRevision=clean(row.sourceRevision),artifactIdentity=clean(row.artifactIdentity);
    if(!/^[a-f0-9]{40}$/i.test(sourceRevision)||!/^sha256:[a-f0-9]{64}$/i.test(artifactIdentity))continue;
    const cycleId=sourceRevision+':'+artifactIdentity;
    if(row.cycleId&&row.cycleId!==cycleId)continue;
    const workflowRunId=num(row.workflowRunId);
    if(!Number.isSafeInteger(workflowRunId))continue;
    if(roblox){
      if(!['roblox-f9-immutable-canonical-publish-queue','roblox-open-cloud-f9-verified-canonical-publish'].includes(row.authority))continue;
      if(row.finalReviewPassed!==true||row.f9ReleaseRegressionPassed!==true||!num(row.versionNumber)||!num(row.artifactRunId))continue;
      if(!/^[1-9][0-9]*$/.test(clean(row.placeId))||!/^[1-9][0-9]*$/.test(clean(row.universeId)))continue;
      if(row.status&&row.status!=='PUBLISHED')continue;
    }else{
      if(!['unity-f9-exact-canonical-internal-release','unity-f9-exact-publication-repair'].includes(row.authority)||row.status!=='PUBLISHED')continue;
      if(![row.buildRunId,row.runtimeRunId,row.independentQaRunId,row.regressionRunId].every(value=>Number.isSafeInteger(num(value))))continue;
    }
    const record={cycleId,sourceRevision,artifactIdentity,completedAt:row.publishedAt,workflowRunId,evidenceUrl:`https://github.com/hans1177/jaewoon-games/actions/runs/${workflowRunId}`};
    const previous=cycles.get(cycleId);
    if(!previous||Date.parse(record.completedAt)<Date.parse(previous.completedAt))cycles.set(cycleId,record);
  }
  const records=[...cycles.values()].sort((a,b)=>Date.parse(b.completedAt)-Date.parse(a.completedAt)||a.cycleId.localeCompare(b.cycleId));
  return{count:records.length,lastCompletedAt:records[0]?.completedAt||null,evidenceUrl:records[0]?.evidenceUrl||null,scope:'RETAINED_VERIFIED_PUBLICATION_RECORDS',records:records.slice(0,10)};
}

function robloxState(item={},policy={}){
  const pub=item.robloxPublicationTarget||{};
  const rel=item.robloxReleaseEvidence||{};
  const internal=item.robloxInternalReleaseEvidence||{};
  const migration=item.robloxDedicatedTargetMigration||{};
  const staleSharedTarget=item.robloxSharedTargetCurrent===false
    &&pub.dedicated!==true
    &&Boolean(clean(pub.placeId||rel.placeId||internal.placeId));
  const placeId=staleSharedTarget?'':clean(pub.placeId||rel.placeId||internal.placeId);
  const published=!staleSharedTarget&&(bool(rel.published)||bool(pub.published)||bool(rel.verified)||bool(pub.verified));
  const explicitPublic=!staleSharedTarget&&(bool(rel.publicRelease)||bool(rel.public)||clean(rel.exposure).toUpperCase()==='PUBLIC'||clean(pub.exposure).toUpperCase()==='PUBLIC');
  const runtime=bool(item.robloxRuntimePassed)||bool(item.robloxRuntimeEvidence?.pass);
  const qa=bool(item.robloxIndependentQaPassed)||bool(item.robloxIndependentQaEvidence?.pass);
  const regression=bool(item.robloxRegressionPassed)||bool(item.robloxRegressionEvidence?.pass);
  const sourceReady=Boolean(item.robloxProjectPath||item.robloxSourceCommit||item.robloxCandidateBranch||item.targetSourcePaths?.ROBLOX);
  const preservedInternalRelease=bool(item.robloxInternalReleasePublished)
    ||(bool(internal.internalRelease)&&bool(internal.published))
    ||bool(migration.internalReleasePreserved);
  const releaseReadiness=evaluateInternalRelease(item,'ROBLOX',policy);
  const internalReady=releaseReadiness.homepageReady;
  const publicReleaseReady=!staleSharedTarget&&(bool(item.robloxPublicReleaseReady)||(runtime&&qa&&regression&&published));
  return{
    platform:'ROBLOX',
    completion:verifiedCompletionHistory(item,'ROBLOX'),
    developmentState:sourceReady?'NATIVE_DEVELOPMENT':'WAITING_SOURCE',
    runtimePassed:runtime,
    independentQaPassed:qa,
    regressionPassed:regression,
    internalReleaseReady:internalReady,
    releaseReadiness,
    historicalInternalRelease:preservedInternalRelease,
    internalReleaseState:internalReady?'PRIVATE_OR_RESTRICTED_TEST_EXPERIENCE':'NOT_READY',
    publicReleaseReady,
    publicRelease:explicitPublic,
    publicReleaseState:explicitPublic?'PUBLIC_RELEASE':(publicReleaseReady?'PUBLIC_RELEASE_READY':'INTERNAL_ONLY'),
    placeId:placeId||null,
    internalUrl:placeId?`https://www.roblox.com/games/${placeId}`:null,
    publicUrl:explicitPublic&&placeId?`https://www.roblox.com/games/${placeId}`:null,
    internalLinkSuppressedReason:staleSharedTarget?'STALE_SHARED_TARGET_AWAITING_DEDICATED_TARGET':null
  };
}
function unityState(item={},policy={}){
  const evidence=item.unityExecutionEvidence||item.executionEvidence||{};
  const build=num(item.unityBuildRunId);
  const runtime=bool(evidence.runtimePassed)||num(item.unityRuntimeSmokeRunId)!==null;
  const qa=bool(evidence.independentQaPassed)||num(item.unityIndependentQaRunId)!==null;
  const regression=bool(evidence.regressionPassed)||num(item.unityRegressionRunId)!==null;
  const sourceReady=Boolean(item.unityProjectPath||item.unitySourceCommit||item.unityCandidateBranch||item.targetSourcePaths?.UNITY);
  const buildUrl=clean(item.unityInternalBuildUrl||item.unityBuildUrl||item.unityDownloadUrl);
  const releaseReadiness=evaluateInternalRelease(item,'UNITY',policy);
  const internalReady=releaseReadiness.homepageReady;
  const publicRelease=bool(item.unityPublicRelease)||bool(item.unityExternalReleaseEvidence?.published);
  return{
    platform:'UNITY',
    completion:verifiedCompletionHistory(item,'UNITY'),
    developmentState:sourceReady?'NATIVE_DEVELOPMENT':'WAITING_SOURCE',
    buildRunId:build,
    runtimePassed:runtime,
    independentQaPassed:qa,
    regressionPassed:regression,
    internalReleaseReady:internalReady,
    releaseReadiness,
    internalReleaseState:internalReady?'INTERNAL_OR_CLOSED_APP_TEST_BUILD':'NOT_READY',
    publicReleaseReady:bool(item.unityPublicReleaseReady)||(internalReady&&bool(item.unityExternalReleaseEvidence?.ready)),
    publicRelease,
    publicReleaseState:publicRelease?'PUBLIC_RELEASE':(bool(item.unityPublicReleaseReady)?'PUBLIC_RELEASE_READY':'INTERNAL_ONLY'),
    internalUrl:buildUrl||null,
    publicUrl:publicRelease?clean(item.unityPublicUrl||item.unityStoreUrl)||null:null
  };
}
const PLATFORM_STATE_BUILDERS={ROBLOX:robloxState,UNITY:unityState};

export function buildHomepagePlatformExposure({queue={},catalog={},policy={}}={}){
  const central=compileHomepageCentralPolicy(policy);
  if(!central.valid)throw new Error('HOMEPAGE_CENTRAL_POLICY_INVALID:'+central.errors.join('|'));
  for(const platform of central.supportedPlatforms){
    if(typeof PLATFORM_STATE_BUILDERS[platform]!=='function')throw new Error('HOMEPAGE_PLATFORM_ADAPTER_MISSING:'+platform);
  }
  const byId=new Map((catalog.games||[]).map(g=>[clean(g.id),g]));
  const games=(queue.items||[]).map(item=>{
    const gameId=clean(item.gameId); if(!gameId)return null;
    const platforms=central.supportedPlatforms.map(platform=>PLATFORM_STATE_BUILDERS[platform](item,policy));
    const externalPublicReleaseState=platforms.some(row=>row.publicRelease)?'PUBLIC_RELEASE'
      :(platforms.some(row=>row.publicReleaseReady)?'PUBLIC_RELEASE_READY':'INTERNAL_ONLY');
    return{
      gameId,
      gameName:clean(byId.get(gameId)?.name||item.gameName||gameId),
      authority:'company-runtime',
      internalCompanySurface:true,
      externalPublicReleaseState,
      platforms,
      updatedAt:clean(item.updatedAt)||new Date().toISOString()
    };
  }).filter(Boolean).sort((a,b)=>a.gameId.localeCompare(b.gameId));
  return{
    version:3,
    authority:'company-runtime',
    centralPolicy:'company-learning/platform-release-roadmap.json',
    centralPolicyFingerprint:central.fingerprint,
    centralPolicyVersion:central.contract.version,
    publicSafe:true,
    internalCompanySurface:true,
    supportedPlatforms:central.supportedPlatforms,
    unityWebEnabled:central.contract.showUnityWeb===true,
    generatedAt:new Date().toISOString(),
    games
  };
}
if(process.argv[1]&&process.argv[1].endsWith('company-homepage-platform-exposure-sync.mjs')){
  const queue=read(process.argv[2]||'development-queue.json');
  const catalog=read(process.argv[3]||'game-catalog.json');
  const output=process.argv[4]||'homepage-platform-exposure.json';
  const policy=read(process.argv[5]||'company-learning/platform-release-roadmap.json');
  const result=buildHomepagePlatformExposure({queue,catalog,policy});
  write(output,result);
  console.log('HOMEPAGE_PLATFORM_EXPOSURE_SYNC=PASS');
  console.log('HOMEPAGE_PLATFORM_EXPOSURE_AUTHORITY=company-runtime');
  console.log('HOMEPAGE_PLATFORM_EXPOSURE_POLICY_SHA256='+result.centralPolicyFingerprint);
  console.log('HOMEPAGE_PLATFORM_EXPOSURE_PLATFORMS='+result.supportedPlatforms.join(','));
}
