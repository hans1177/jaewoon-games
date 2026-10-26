// 파일명: tools/company-homepage-platform-exposure-sync.mjs
// 역할: 운영 플랫폼 상태와 검증·배포가 끝난 고유 개발 회차를 홈페이지에 전달한다.
// 임포트
import fs from 'node:fs';
import crypto from 'node:crypto';
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

// F0~F9 진행 상태: 실행 중이라는 추정 대신 검증된 시각/실패 단계/대기열 상태를 기록한다.
// catalog-only 게임은 기록이 없으므로 날짜를 만들어내지 않는다.
export function robloxFloorProgress(item={}){
  const tracked=clean(item.targetPlatform).toUpperCase()==='ROBLOX'
    &&clean(item.status).toUpperCase()==='ACTIVE'
    &&Boolean(clean(item.robloxProjectPath||item.targetSourcePaths?.ROBLOX));
  const iso=value=>{
    const str=clean(value);
    return str&&Number.isFinite(Date.parse(str))?new Date(str).toISOString():null;
  };
  if(!tracked)return{
    tracked:false,queueState:'NOT_IN_ACTIVE_ROBLOX_RUNTIME_QUEUE',
    currentFloor:null,stage:null,result:'UNCONFIRMED',verifiedAt:null,
    checkedAt:null,lastFailureAt:null,f0PassedAt:null,candidatePublishedAt:null,
    failureCode:null,completedCycles:verifiedCompletionHistory(item,'ROBLOX').count
  };
  const step=clean(item.currentStep)||'UNKNOWN';
  const f0=bool(item.robloxFoundationF0Passed)&&iso(item.robloxFoundationF0PassedAt);
  const candidate=bool(item.robloxRuntimeCandidateEvidence?.published)
    &&iso(item.robloxRuntimeCandidateEvidence?.publishedAt);
  const stage=step==='TARGET_PLATFORM_SOURCE_BIND'?'F0_BEFORE_SOURCE_BIND'
    :step==='ROBLOX_F0_SOURCE_PREFLIGHT'?'F0'
    :step==='PRIVATE_RUNTIME_CANDIDATE_DEPLOY'?'F0_TO_F1_PRIVATE_CANDIDATE'
    :step==='TARGET_PLATFORM_RUNTIME_FOUNDATION'?'F1_TO_F4_RUNTIME_EVIDENCE'
    :/F9|FINAL_REVIEW|RELEASE_REGRESSION/.test(step)?'F9'
    :/F[1-8]/.test(step)?step.match(/F[1-8]/)[0]
    :step;
  const failedAt=iso(item.robloxSourceBootstrapFailedAt)
    ||iso(item.robloxBuildPreflightFailedAt)||iso(item.robloxBuildFailedAt)
    ||iso(item.robloxRuntimeFailedAt)||iso(item.robloxQualityBuildUpEvidence?.testedAt);
  const reportedFailure=clean(item.robloxFailureSignature||item.robloxFailureStage);
  const failureBlocked=Boolean(reportedFailure)
    &&(/FAILED|REPAIR_REQUIRED|SOURCE_BIND/.test(reportedFailure)
      ||step==='ROBLOX_F0_SOURCE_PREFLIGHT'&&!f0);
  const observations=[
    f0,candidate,
    bool(item.robloxBuildOrPackagePassed)?iso(item.robloxBuildPassedAt):null,
    bool(item.robloxIndependentQaPassed)?iso(item.robloxIndependentQaPassedAt):null,
    bool(item.robloxF9ReleaseRegressionPassed)?iso(item.robloxFinalReviewPassedAt):null,
    failureBlocked?failedAt:null
  ].filter(Boolean).sort((a,b)=>Date.parse(b)-Date.parse(a));
  return{
    tracked:true,
    queueState:'ACTIVE_QUEUE_REGISTERED_NOT_LIVE_JOB_PROOF',
    currentFloor:stage,
    stage:step,
    result:failureBlocked?'REPAIR_REQUIRED':candidate?'PRIVATE_CANDIDATE_PUBLISHED_AWAITING_RUNTIME_EVIDENCE'
      :f0?'F0_PASSED_AWAITING_NEXT_EVIDENCE':'PRE_F0_OR_PENDING',
    verifiedAt:observations[0]||null,
    checkedAt:iso(item.updatedAt),
    lastFailureAt:failureBlocked?failedAt:null,
    f0PassedAt:f0||null,
    candidatePublishedAt:candidate||null,
    failureCode:failureBlocked?reportedFailure||clean(item.robloxFailureStage)||null:null,
    completedCycles:verifiedCompletionHistory(item,'ROBLOX').count
  };
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
  const verifiedDedicatedInternalTarget=
    !staleSharedTarget
    &&pub.verified===true
    &&pub.dedicated===true
    &&pub.shared!==true
    &&pub.internalOnly===true
    &&clean(pub.bootstrapState).toUpperCase()==='PUBLISHED_PRIVATE'
    &&/^[1-9][0-9]*$/.test(clean(pub.universeId))
    &&/^[1-9][0-9]*$/.test(clean(pub.placeId));
  const preservedInternalRelease=bool(item.robloxInternalReleasePublished)
    ||(bool(internal.internalRelease)&&bool(internal.published))
    ||bool(migration.internalReleasePreserved)
    ||verifiedDedicatedInternalTarget;
  const releaseReadiness=evaluateInternalRelease(item,'ROBLOX',policy);
  const internalReady=releaseReadiness.homepageReady;
  const publicReleaseReady=!staleSharedTarget&&(bool(item.robloxPublicReleaseReady)||(runtime&&qa&&regression&&published));
  return{
    platform:'ROBLOX',
    completion:verifiedCompletionHistory(item,'ROBLOX'),
    floorProgress:robloxFloorProgress(item),
    developmentState:sourceReady?'NATIVE_DEVELOPMENT':'WAITING_SOURCE',
    runtimePassed:runtime,
    independentQaPassed:qa,
    regressionPassed:regression,
    internalReleaseReady:internalReady,
    releaseReadiness,
    executionAvailable:!staleSharedTarget&&/^[1-9][0-9]*$/.test(placeId)&&(published||preservedInternalRelease),
    historicalInternalRelease:preservedInternalRelease,
    internalReleaseState:internalReady?'PRIVATE_OR_RESTRICTED_TEST_EXPERIENCE':preservedInternalRelease?'DEPLOYED_REVALIDATING':'NOT_READY',
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
  const executionAvailable=Boolean(buildUrl)&&(/^https:\/\//.test(buildUrl)||buildUrl.startsWith('/'))
    &&(evidence.runtimePassed===true||evidence.rawStageResults?.runtime===true||item.unityRuntimeEvidence?.runtimeVerified===true||item.unityRuntimeEvidence?.pass===true);
  const releaseReadiness=evaluateInternalRelease(item,'UNITY',policy);
  const internalReady=releaseReadiness.homepageReady;
  const publicRelease=bool(item.unityPublicRelease)||bool(item.unityExternalReleaseEvidence?.published);
  return{
    platform:'UNITY',
    completion:verifiedCompletionHistory(item,'UNITY'),
    developmentState:sourceReady?'NATIVE_DEVELOPMENT':'WAITING_SOURCE',
    buildRunId:build,
    executionAvailable,
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
// Ignore only the volatile collection timestamp; all per-game timestamps, flags,
// URLs, version and policy fingerprints remain exact-match publication evidence.
export function reuseUnchangedHomepageExposure(previous,candidate){
  const valid=row=>row&&row.version===3&&row.authority==='company-runtime'
    &&row.internalCompanySurface===true&&Array.isArray(row.supportedPlatforms)
    &&Array.isArray(row.games)&&Number.isFinite(Date.parse(row.generatedAt));
  if(!valid(previous)||!valid(candidate))return candidate;
  const stable=row=>{const copy={...row};delete copy.generatedAt;return copy;};
  return JSON.stringify(stable(previous))===JSON.stringify(stable(candidate))?previous:candidate;
}

const PLATFORM_STATE_BUILDERS={ROBLOX:robloxState,UNITY:unityState};

export function buildHomepagePlatformExposure({queue={},catalog={},policy={}}={}){
  // [정책] 변경에 관련된 플랫폼 구성만 중앙 원본에서 직접 컴파일한다.
  // 이전 고정 반환값은 새 플랫폼을 놓치고 정상 정책 지문을 기록하지 못했다.
  const homepage=policy?.serverHomepageIntegration;
  const supportedPlatforms=homepage?.supportedPlatforms;
  const platformStates=homepage?.perGamePlatformStates;
  if(homepage?.sourceOfTruth!=='company-learning/platform-release-roadmap.json'
    ||homepage?.authority!=='MACHINE_EXECUTION_CONTRACT'
    ||homepage?.runtimeAuthority!=='company-runtime'
    ||homepage?.serverRuntimeBranch!=='company-runtime'
    ||homepage?.publicSourceBranch!=='main'
    ||!Number.isInteger(homepage?.version)||homepage.version<1
    ||!Array.isArray(supportedPlatforms)||supportedPlatforms.length===0
    ||!Array.isArray(platformStates)||JSON.stringify(supportedPlatforms)!==JSON.stringify(platformStates)
    ||new Set(supportedPlatforms).size!==supportedPlatforms.length
    ||supportedPlatforms.some(platform=>typeof platform!=='string'||!platform)){
    throw new Error('HOMEPAGE_CENTRAL_POLICY_INVALID:PLATFORM_POLICY_SOURCE_OR_CONFIGURATION');
  }
  const central={
    supportedPlatforms,
    fingerprint:crypto.createHash('sha256').update(JSON.stringify({
      version:homepage.version,sourceOfTruth:homepage.sourceOfTruth,
      runtimeAuthority:homepage.runtimeAuthority,
      serverRuntimeBranch:homepage.serverRuntimeBranch,publicSourceBranch:homepage.publicSourceBranch,
      supportedPlatforms,perGamePlatformStates:platformStates,
      showUnityWeb:homepage.showUnityWeb===true
    })).digest('hex'),
    contract:{version:homepage.version,showUnityWeb:homepage.showUnityWeb===true}
  };
  for(const platform of central.supportedPlatforms){
    if(typeof PLATFORM_STATE_BUILDERS[platform]!=='function')throw new Error('HOMEPAGE_PLATFORM_ADAPTER_MISSING:'+platform);
  }
  const byId=new Map((catalog.games||[]).map(g=>[clean(g?.canonical?.identity?.gameId||g.id),g]));
  const queueItems=(queue.items||[]).filter(item=>clean(item?.gameId));
  const queuedIds=new Set(queueItems.map(item=>clean(item.gameId)));
  // 메인: 대기열에 아직 없는 등록 게임도 플랫폼 현황을 빠짐없이 표시한다.
  // 유효한 실행 증거가 없으면 출시·검증 완료로 처리하지 않는다.
  const catalogOnly=(catalog.games||[])
    .filter(row=>{
      const id=clean(row?.canonical?.identity?.gameId||row?.id);
      const lifecycle=clean(row?.canonical?.lifecycle?.state||row?.lifecycleState).toUpperCase();
      return id&&!queuedIds.has(id)&&!['RETIRED','REMOVED','ARCHIVED'].includes(lifecycle);
    })
    .map(row=>({
      gameId:clean(row?.canonical?.identity?.gameId||row?.id),
      gameName:clean(row?.canonical?.identity?.name||row?.name),
      updatedAt:clean(row?.homepageInfo?.updatedAt||catalog.updatedAt)
    }));
  const games=[...queueItems,...catalogOnly].map(item=>{
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
  const policy=process.argv[5]&&fs.existsSync(process.argv[5])?read(process.argv[5]):{};
  const result=buildHomepagePlatformExposure({queue,catalog,policy});
  write(output,result);
  console.log('HOMEPAGE_PLATFORM_EXPOSURE_SYNC=PASS');
  console.log('HOMEPAGE_PLATFORM_EXPOSURE_AUTHORITY=company-runtime');
  console.log('HOMEPAGE_PLATFORM_EXPOSURE_POLICY_SHA256='+result.centralPolicyFingerprint);
  console.log('HOMEPAGE_PLATFORM_EXPOSURE_PLATFORMS='+result.supportedPlatforms.join(','));
}
