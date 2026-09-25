import fs from 'node:fs';
import path from 'node:path';

const clean=v=>String(v??'').trim();
const upper=v=>clean(v).toUpperCase();
const readJson=(file,fallback={})=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');};
function args(argv=process.argv.slice(2)){return Object.fromEntries(argv.filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{const [k,...v]=x.slice(2).split('=');return[k,v.join('=')]}));}
function openBlockingTickets(ticketQueue={},gameId='',platform=''){
  return (ticketQueue.tickets||[]).filter(t=>clean(t.gameId)===gameId&&['OPEN','REOPENED'].includes(upper(t.status))&&['CRITICAL','HIGH'].includes(upper(t.severity))&&(!clean(t.surface)||upper(t.surface)===platform||upper(t.surface)==='WEB'));
}
function internalReady(item={},platform=''){
  if(platform==='UNITY'){
    const e=item.executionEvidence||{};
    return e.runtimePassed===true&&e.independentQaPassed===true&&e.regressionPassed===true&&e.exactRevision===true;
  }
  if(platform==='ROBLOX')return item.robloxInternalReleaseReady===true||(item.robloxRuntimePassed===true&&item.robloxIndependentQaPassed===true&&item.robloxRegressionPassed===true);
  return false;
}
function adaptationEvidence(item={},platform=''){
  if(platform==='UNITY')return item.unityPlatformAdaptationEvidence||item.platformAdaptationEvidence?.UNITY||{};
  if(platform==='ROBLOX')return item.robloxPlatformAdaptationEvidence||item.platformAdaptationEvidence?.ROBLOX||{};
  return{};
}
function rebuildFiles(gameId,platform){
  if(platform==='ROBLOX')return[
    'roblox-games/'+gameId+'/shared/GameConfig.luau',
    'roblox-games/'+gameId+'/server/Game.server.luau',
    'roblox-games/'+gameId+'/client/Game.client.luau'
  ];
  return[
    'unity-games/'+gameId+'/Assets/Scripts/RuntimeBootstrap.cs',
    'unity-games/'+gameId+'/Assets/Scripts/GameCore.cs',
    'unity-games/'+gameId+'/Assets/Scripts/PrototypeAnimatedVisuals.cs'
  ];
}
function rebuildGoal(gameId,platform){
  if(platform==='ROBLOX')return [
    '[SECOND_PLATFORM_ADAPTATION_REBUILD:ROBLOX]',
    gameId+'의 실제 Vibe 내부 플레이 증거와 tester/debug 증거를 기준으로 기존 Roblox 구현을 직접 빌드업한다.',
    '빠른 진입, 모바일 우선 입력/UI, 반복 가능한 목표, 소셜/멀티 흐름(설계가 요구할 때), 서버 권위 동기화, Roblox 네이티브 서비스, 저사양 표현 밀도를 실제 런타임에 반영한다.',
    '핵심 게임 정체성·승인 밸런스 의미·세이브 의미·진행 의미는 보존한다.',
    '외부 공개를 시도하지 않는다. 수정 후 기존 Roblox runtime/QA/regression으로 정확 후보를 다시 검증하고 다시 Vibe 내부 플레이로 순환한다.'
  ].join('\n');
  return [
    '[SECOND_PLATFORM_ADAPTATION_REBUILD:UNITY]',
    gameId+'의 내부 플랫폼 배포/플레이테스트 증거를 기준으로 Unity 버전을 DEEP_IMMERSIVE_SESSION 방향으로 리빌딩한다.',
    '깊은 시스템 표현, 긴 세션 지원(설계가 요구할 때), 세밀한 조작, 카메라/연출, 풍부한 네이티브 그래픽·VFX, 공간음향, 기기별 성능 스케일링을 실제 런타임에 반영한다.',
    '핵심 게임 정체성·승인 밸런스 의미·세이브 의미·진행 의미는 보존한다.',
    '내부 테스트 트랙/빌드는 유지하며 외부 production 공개를 시도하지 않는다. 리빌딩 후 실제 Unity 런타임, 독립 QA, 회귀와 플랫폼 적응 증거를 다시 생성한다.'
  ].join('\n');
}
function ensureRebuildTask(queue,gameId,platform){
  const id=gameId+'-'+platform.toLowerCase()+'-second-gate-rebuild-v1';
  if((queue.tasks||[]).some(t=>clean(t.id)===id&&upper(t.status)!=='CANCELLED'&&upper(t.status)!=='DONE'))return queue;
  return{...queue,tasks:[...(queue.tasks||[]),{
    id,gameId,target:platform.toLowerCase(),department:'development',type:'implementation',
    goal:rebuildGoal(gameId,platform),responsibleFiles:rebuildFiles(gameId,platform),
    dependencies:[],priority:'high',releaseState:'development-confirmed',status:'queued',
    retries:0,retryPolicy:'UNLIMITED_CAUSAL_REPAIR',maxRetries:null,ownerDirective:false,requiresOwnerDecision:false,protectedChange:false,
    paidResourceRequired:false,estimatedRisk:'medium',speculativeEligible:false,
    productionMode:'AUTONOMOUS_VIBE',supervisionApproved:false,
    evidence:[
      'second-platform-gate-rebuild:required',
      'internal-platform-release:yes',
      'actual-vibe-play-evidence:required',
      'external-public-exposure:forbidden-until-hard-gate-pass',
      'platform-adaptation:'+(platform==='ROBLOX'?'SOCIAL_FAST_SESSION':'DEEP_IMMERSIVE_SESSION')
    ]
  }]};
}
function exactRobloxEvidence(e={},item={}){
  const sourceRevision=clean(item.robloxSourceCommit);
  const artifactIdentity=clean(item.robloxBuildArtifactIdentity);
  const candidate=item.robloxRuntimeCandidateEvidence||item.robloxInternalReleaseEvidence||{};
  return Boolean(
    e&&e.pass===true
    &&sourceRevision&&artifactIdentity
    &&clean(e.sourceRevision)===sourceRevision
    &&clean(e.artifactIdentity)===artifactIdentity
    &&String(e.universeId||'')===String(candidate.universeId||'')
    &&String(e.placeId||'')===String(candidate.placeId||'')
    &&Number(e.versionNumber||0)>0
    &&Number(e.versionNumber)===Number(candidate.versionNumber||0)
  );
}
function robloxPublicHardGate(item={},tickets=[]){
  const candidate=item.robloxRuntimeCandidateEvidence||item.robloxInternalReleaseEvidence||{};
  const play=item.robloxInternalVibePlayEvidence||{};
  const completion=item.robloxGameCompletionEvidence||{};
  const adaptation=adaptationEvidence(item,'ROBLOX');
  const presentation=item.robloxPresentationCompletionEvidence||{};
  const stability=item.robloxReleaseStabilityEvidence||{};
  const security=item.robloxSecurityReleaseEvidence||{};
  const final=item.robloxPublicReleaseFinalEvidence||{};
  const mandatoryScenarios=['NEW_GAME_START','CORE_GAMEPLAY_LOOP','PROGRESSION_AND_REWARD'];
  const scenarios=new Set((play.scenarioCoverage||[]).map(upper));
  const scenarioCoverage=play.scenarioCoveragePass===true&&mandatoryScenarios.every(x=>scenarios.has(x));
  const checks={
    technical:item.robloxRuntimePassed===true&&item.robloxIndependentQaPassed===true&&item.robloxRegressionPassed===true,
    realServerBoot:item.robloxPublicReleaseRuntimeObservationPending!==true,
    exactRuntime:item.robloxExactRevisionPassed===true&&item.robloxF9ReleaseRegressionPassed===true&&item.robloxFinalReviewPassed===true,
    actualVibePlay:play.actualPlay===true&&exactRobloxEvidence(play,item),
    vibeScenarioCoverage:scenarioCoverage,
    noBlockingTickets:tickets.length===0,
    gameCompletion:exactRobloxEvidence(completion,item)&&completion.coreSystemsImplemented===true&&completion.progressionDepthPassed===true&&completion.noCoreContentDeadEnd===true&&completion.goalsRewardsProgressionConnected===true,
    platformAdaptation:exactRobloxEvidence(adaptation,item)&&adaptation.rebuildCompleted===true&&adaptation.runtimeEvidencePassed===true,
    saveRejoin:item.robloxDatastoreRejoinPassed===true,
    multiplayer:item.robloxMultiplayerQaPassed===true,
    serverClientAuthority:item.robloxServerClientBoundaryPassed===true&&item.robloxFoundationF0Passed===true,
    mobileAndPerformance:item.robloxMobileControlUiPassed===true&&adaptation.mobileAndLowEndPerformancePassed===true,
    security:exactRobloxEvidence(security,item)&&security.noReleaseBlockingFinding===true,
    presentation:exactRobloxEvidence(presentation,item)&&presentation.primaryGameplayPlaceholderDebt===0&&presentation.runtimeVisualEvidencePassed===true,
    stability:exactRobloxEvidence(stability,item)&&stability.distinctCompletedBuildupCycles===true&&stability.releaseBlockingFailureObservedSinceBaseline===false,
    exactFinal:exactRobloxEvidence(final,item)&&final.fullPublicGateRevalidationPassed===true
  };
  const blockers=Object.entries(checks).filter(([,pass])=>pass!==true).map(([name])=>'ROBLOX_PUBLIC_HARD_GATE_'+name.toUpperCase());
  return{pass:blockers.length===0,checks,blockers,candidateVersionNumber:Number(candidate.versionNumber||0)};
}
function platformState(item,tickets,platform,roadmap={}){
  void roadmap;
  const gameId=clean(item.gameId);
  const technical=internalReady(item,platform);
  const blocking=openBlockingTickets(tickets,gameId,platform);
  const lower=platform==='ROBLOX'?'roblox':'unity';
  const internalPublished=platform==='ROBLOX'
    ?item.robloxInternalReleasePublished===true||(item.robloxReleaseEvidence?.published===true&&item.robloxExternalPublicReleaseConfirmed!==true)
    :item.unityInternalReleasePublished===true||item.unityInternalTestBuildPublished===true;
  const playtestPassed=item[lower+'InternalPlaytestPassed']===true;
  const explicitPublic=platform==='ROBLOX'?item.robloxExternalPublicReleaseConfirmed===true:item.unityExternalPublicReleaseConfirmed===true;
  const hardGate=platform==='ROBLOX'?robloxPublicHardGate(item,blocking):null;
  const publicReady=platform==='ROBLOX'
    ?technical&&internalPublished&&hardGate.pass===true
    :technical&&internalPublished&&playtestPassed&&blocking.length===0;
  const legacyPublic=platform==='ROBLOX'&&item.preexistingPublicReleaseBeforeExposureGate===true&&explicitPublic;
  const publicReleased=explicitPublic&&(publicReady||legacyPublic);
  const state=publicReleased
    ?'PUBLIC_RELEASE'
    :publicReady
      ?'PUBLIC_RELEASE_READY'
      :internalPublished
        ?'INTERNAL_PLAYTEST_AND_DEBUG'
        :technical
          ?'INTERNAL_RELEASE_READY'
          :'NATIVE_DEVELOPMENT';
  return{
    platform,
    technicalReady:technical,
    internalReleaseState:state,
    internalReleaseReady:technical,
    internalReleasePublished:internalPublished,
    internalPlaytestPassed:platform==='ROBLOX'?hardGate?.checks?.actualVibePlay===true:playtestPassed,
    externalExposureAllowed:publicReleased,
    externalExposureState:publicReleased?'PUBLIC_RELEASE':publicReady?'PUBLIC_RELEASE_READY':'INTERNAL_ONLY',
    publicReleaseReady:publicReady,
    publicHardGate:platform==='ROBLOX'?hardGate:null,
    perpetualBuildupActive:platform==='ROBLOX'&&internalPublished,
    testerTickets:{openBlocking:blocking.map(t=>t.id)},
    publication:{explicitPublicEvidence:explicitPublic,publicReleased},
    distribution:platform==='UNITY'
      ?{intendedTrack:'INTERNAL_OR_CLOSED_APP_TEST',productionTrackAllowed:publicReady,credentialsRequiredForStoreUpload:true}
      :{intendedVisibility:'PRIVATE_OR_RESTRICTED_TEST_EXPERIENCE',publicDiscoveryAllowed:publicReady},
    rebuildRequired:platform==='ROBLOX'?internalPublished&&!publicReady:false
  };
}
export function controlPlatformExposure({developmentQueue={},ticketQueue={},suitability={},vibeQueue={},roadmap={}}={}){
  let queue={...vibeQueue,tasks:[...(vibeQueue.tasks||[])]};
  const suitabilityById=new Map((suitability.games||[]).map(x=>[clean(x.gameId),x]));
  const games=[];
  for(const item of developmentQueue.items||[]){
    if(!['DEVELOPMENT_CONFIRMED','RELEASE_CONFIRMED'].includes(upper(item.productionClass)))continue;
    const gameId=clean(item.gameId);if(!gameId)continue;
    const platforms=['ROBLOX','UNITY'].map(platform=>platformState(item,ticketQueue,platform,roadmap));
    const roblox=platforms.find(x=>x.platform==='ROBLOX');
    if(roblox?.internalReleasePublished===true&&item.robloxInternalVibePlayEvidence?.actualPlay===true&&roblox.publicReleaseReady!==true){
      queue=ensureRebuildTask(queue,gameId,'ROBLOX');
    }
    const anyPublic=platforms.some(x=>x.publication.publicReleased===true);
    const anyReady=platforms.some(x=>x.publicReleaseReady===true);
    games.push({
      gameId,gameName:clean(item.gameName||gameId),platformExecutionMode:'ROBLOX_UNITY_CONCURRENT_SAME_GAME',
      homepageVisibility:'INTERNAL_COMPANY_HOME_FULL_DETAIL_ALLOWED',
      suitability:suitabilityById.get(gameId)||null,
      platforms,
      publicReleaseReady:platforms.every(x=>x.publicReleaseReady===true),
      publicReleased:platforms.every(x=>x.publication.publicReleased===true),
      anyPlatformPublicReleased:anyPublic,
      externalPublicReleaseState:platforms.every(x=>x.publication.publicReleased===true)?'PUBLIC_RELEASE_ALL':anyPublic?'PUBLIC_RELEASE_PARTIAL':anyReady?'PUBLIC_RELEASE_READY_PARTIAL':'INTERNAL_ONLY'
    });
  }
  return{
    state:{version:3,kind:'platform-exposure-state',authority:'OWNER_DIRECTIVE_2026-09-25',policy:'PERPETUAL_INTERNAL_BUILDUP_WITH_FAIL_CLOSED_EXTERNAL_PUBLIC_HARD_GATE',updatedAt:new Date().toISOString(),games},
    queue
  };
}
export function homepageExposureSnapshot(state={}){
  return{version:3,publicSafe:true,internalCompanySurface:true,updatedAt:state.updatedAt||null,games:(state.games||[]).map(g=>({
    gameId:g.gameId,gameName:g.gameName,platformExecutionMode:g.platformExecutionMode,
    externalPublicReleaseState:g.externalPublicReleaseState,publicReleaseReady:g.publicReleaseReady,
    suitability:g.suitability,platforms:g.platforms
  }))};
}
if(process.argv[1]===new URL(import.meta.url).pathname){
  const a=args();
  const result=controlPlatformExposure({
    developmentQueue:readJson(a['development-queue'],{items:[]}),
    ticketQueue:readJson(a.tickets,{tickets:[]}),
    suitability:readJson(a.suitability,{games:[]}),
    vibeQueue:readJson(a.queue,{tasks:[]}),
    roadmap:readJson(a.roadmap,{})
  });
  writeJson(a.output||'.vibe2/platform-exposure-state.json',result.state);
  if(a.queue)writeJson(a.queue,result.queue);
  if(a['homepage-output'])writeJson(a['homepage-output'],homepageExposureSnapshot(result.state));
  console.log('PLATFORM_EXPOSURE_GAMES='+result.state.games.length);
  console.log('PLATFORM_INTERNAL_RELEASES='+result.state.games.flatMap(g=>g.platforms).filter(x=>x.internalReleaseReady).length);
  console.log('PLATFORM_PUBLIC_RELEASE_READY='+result.state.games.flatMap(g=>g.platforms).filter(x=>x.publicReleaseReady).length);
  console.log('ROBLOX_PERPETUAL_BUILDUP_ACTIVE='+result.state.games.filter(g=>g.platforms.find(p=>p.platform==='ROBLOX')?.perpetualBuildupActive).length);
}
