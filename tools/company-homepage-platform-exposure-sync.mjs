import fs from 'node:fs';
import { compileHomepageCentralPolicy } from './company-shared-context.mjs';

const clean=v=>String(v??'').trim();
const bool=v=>v===true;
const num=v=>Number.isFinite(Number(v))&&Number(v)>0?Number(v):null;
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');

function robloxState(item={}){
  const pub=item.robloxPublicationTarget||{};
  const rel=item.robloxReleaseEvidence||{};
  const placeId=clean(pub.placeId||rel.placeId);
  const published=bool(rel.published)||bool(pub.published)||bool(rel.verified)||bool(pub.verified);
  const explicitPublic=bool(rel.publicRelease)||bool(rel.public)||clean(rel.exposure).toUpperCase()==='PUBLIC'||clean(pub.exposure).toUpperCase()==='PUBLIC';
  const runtime=bool(item.robloxRuntimePassed)||bool(item.robloxRuntimeEvidence?.pass)||bool(item.robloxIndependentQaPassed);
  const regression=bool(item.robloxRegressionPassed)||bool(item.robloxRegressionEvidence?.pass);
  const sourceReady=Boolean(item.robloxProjectPath||item.robloxSourceCommit||item.robloxCandidateBranch||item.targetSourcePaths?.ROBLOX);
  const internalReady=bool(item.robloxInternalReleaseReady)||(published&&!explicitPublic)||(published&&runtime&&regression);
  return{
    platform:'ROBLOX',
    developmentState:sourceReady?'NATIVE_DEVELOPMENT':'WAITING_SOURCE',
    runtimePassed:runtime,
    independentQaPassed:bool(item.robloxIndependentQaPassed)||bool(item.robloxIndependentQaEvidence?.pass),
    regressionPassed:regression,
    internalReleaseReady:internalReady,
    internalReleaseState:internalReady?'PRIVATE_OR_RESTRICTED_TEST_EXPERIENCE':'NOT_READY',
    publicReleaseReady:bool(item.robloxPublicReleaseReady)||(runtime&&regression&&published),
    publicRelease:explicitPublic,
    publicReleaseState:explicitPublic?'PUBLIC_RELEASE':(bool(item.robloxPublicReleaseReady)?'PUBLIC_RELEASE_READY':'INTERNAL_ONLY'),
    placeId:placeId||null,
    internalUrl:placeId?`https://www.roblox.com/games/${placeId}`:null,
    publicUrl:explicitPublic&&placeId?`https://www.roblox.com/games/${placeId}`:null
  };
}
function unityState(item={}){
  const evidence=item.unityExecutionEvidence||item.executionEvidence||{};
  const build=num(item.unityBuildRunId);
  const runtime=bool(evidence.runtimePassed)||num(item.unityRuntimeSmokeRunId)!==null;
  const qa=bool(evidence.independentQaPassed)||num(item.unityIndependentQaRunId)!==null;
  const regression=bool(evidence.regressionPassed)||num(item.unityRegressionRunId)!==null;
  const sourceReady=Boolean(item.unityProjectPath||item.unitySourceCommit||item.unityCandidateBranch||item.targetSourcePaths?.UNITY);
  const buildUrl=clean(item.unityInternalBuildUrl||item.unityBuildUrl||item.unityDownloadUrl);
  const internalReady=bool(item.unityInternalReleaseReady)||(Boolean(build)&&runtime&&qa&&regression);
  const publicRelease=bool(item.unityPublicRelease)||bool(item.unityExternalReleaseEvidence?.published);
  return{
    platform:'UNITY',
    developmentState:sourceReady?'NATIVE_DEVELOPMENT':'WAITING_SOURCE',
    buildRunId:build,
    runtimePassed:runtime,
    independentQaPassed:qa,
    regressionPassed:regression,
    internalReleaseReady:internalReady,
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
    const platforms=central.supportedPlatforms.map(platform=>PLATFORM_STATE_BUILDERS[platform](item));
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
