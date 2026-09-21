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
  if(platform==='ROBLOX')return item.robloxRuntimePassed===true&&item.robloxIndependentQaPassed===true&&item.robloxRegressionPassed===true;
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
    gameId+'의 내부 플랫폼 배포/플레이테스트 증거를 기준으로 Roblox 버전을 SOCIAL_FAST_SESSION 방향으로 리빌딩한다.',
    '빠른 진입, 모바일 우선 입력/UI, 친구 합류와 소셜/멀티 흐름(설계가 요구할 때), 짧고 반복 가능한 목표, 서버 권위 동기화, Roblox 네이티브 서비스, 저사양 표현 밀도를 실제 런타임에 반영한다.',
    '핵심 게임 정체성·승인 밸런스 의미·세이브 의미·진행 의미는 보존한다.',
    '내부 배포는 유지하며 외부 공개를 시도하지 않는다. 리빌딩 후 실제 Roblox 런타임, 독립 QA, 회귀와 플랫폼 적응 증거를 다시 생성한다.'
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
  if((queue.tasks||[]).some(t=>clean(t.id)===id&&upper(t.status)!=='CANCELLED'))return queue;
  return{...queue,tasks:[...(queue.tasks||[]),{
    id,gameId,target:platform.toLowerCase(),department:'development',type:'implementation',
    goal:rebuildGoal(gameId,platform),responsibleFiles:rebuildFiles(gameId,platform),
    dependencies:[],priority:'high',releaseState:'development-confirmed',status:'queued',
    retries:0,maxRetries:2,ownerDirective:false,requiresOwnerDecision:false,protectedChange:false,
    paidResourceRequired:false,estimatedRisk:'medium',speculativeEligible:false,
    productionMode:'AUTONOMOUS_VIBE',supervisionApproved:false,
    evidence:[
      'second-platform-gate-rebuild:required',
      'internal-platform-release:yes',
      'external-public-exposure:forbidden-until-second-gate-pass',
      'platform-adaptation:'+(platform==='ROBLOX'?'SOCIAL_FAST_SESSION':'DEEP_IMMERSIVE_SESSION')
    ]
  }]};
}
function platformState(item,tickets,platform){
  const gameId=clean(item.gameId),internal=internalReady(item,platform),adapt=adaptationEvidence(item,platform),blocking=openBlockingTickets(tickets,gameId,platform);
  const rebuildComplete=adapt.rebuildCompleted===true||adapt.rebuildPassed===true;
  const adaptationPass=adapt.pass===true&&adapt.runtimeEvidencePass===true;
  const secondGatePass=internal&&rebuildComplete&&adaptationPass&&blocking.length===0;
  const explicitPublic=platform==='ROBLOX'?item.robloxExternalPublicReleaseConfirmed===true:item.unityExternalPublicReleaseConfirmed===true;
  const legacyPublic=platform==='ROBLOX'&&item.robloxReleaseClaim===true&&item.robloxReleaseEvidence?.published===true&&item.robloxFinalReviewPassed===true&&item.robloxRegressionPassed===true;
  const publicReleased=legacyPublic||(secondGatePass&&explicitPublic);
  return{
    platform,
    internalReleaseState:internal?'INTERNAL_PLATFORM_RELEASE':'NATIVE_TECHNICAL_IN_PROGRESS',
    internalReleaseReady:internal,
    externalExposureAllowed:publicReleased,
    externalExposureState:publicReleased?'PUBLIC_RELEASE':secondGatePass?'PUBLIC_RELEASE_READY':'INTERNAL_ONLY',
    secondGate:{pass:secondGatePass,rebuildComplete,adaptationRuntimeEvidencePass:adaptationPass,openBlockingTesterTickets:blocking.map(t=>t.id)},
    publication:{explicitPublicEvidence:explicitPublic,legacyPublicRelease:legacyPublic,publicReleased},
    distribution:platform==='UNITY'
      ?{intendedTrack:'GOOGLE_PLAY_INTERNAL_OR_CLOSED_TEST',productionTrackAllowed:secondGatePass,credentialsRequiredForStoreUpload:true}
      :{intendedVisibility:'PRIVATE_OR_RESTRICTED_TEST_EXPERIENCE',publicDiscoveryAllowed:secondGatePass},
    rebuildRequired:internal&&!secondGatePass
  };
}
export function controlPlatformExposure({developmentQueue={},ticketQueue={},suitability={},vibeQueue={}}={}){
  let queue={...vibeQueue,tasks:[...(vibeQueue.tasks||[])]};
  const suitabilityById=new Map((suitability.games||[]).map(x=>[clean(x.gameId),x]));
  const games=[];
  for(const item of developmentQueue.items||[]){
    if(!['DEVELOPMENT_CONFIRMED','RELEASE_CONFIRMED'].includes(upper(item.productionClass)))continue;
    const gameId=clean(item.gameId);if(!gameId)continue;
    const platforms=['ROBLOX','UNITY'].map(platform=>platformState(item,ticketQueue,platform));
    for(const p of platforms)if(p.rebuildRequired)queue=ensureRebuildTask(queue,gameId,p.platform);
    games.push({
      gameId,gameName:clean(item.gameName||gameId),platformExecutionMode:'ROBLOX_UNITY_CONCURRENT',
      homepageVisibility:'INTERNAL_COMPANY_HOME_FULL_DETAIL_ALLOWED',
      suitability:suitabilityById.get(gameId)||null,
      platforms,
      publicReleaseReady:platforms.every(x=>x.secondGate.pass===true),
      publicReleased:platforms.every(x=>x.publication.publicReleased===true),
      externalPublicReleaseState:platforms.every(x=>x.publication.publicReleased===true)?'PUBLIC_RELEASE':platforms.every(x=>x.secondGate.pass===true)?'PUBLIC_RELEASE_READY':'INTERNAL_ONLY'
    });
  }
  return{
    state:{version:1,kind:'platform-exposure-state',authority:'OWNER_DIRECTIVE_2026-09-21',policy:'INTERNAL_RELEASE_THEN_SECOND_PLATFORM_GATE_BEFORE_PUBLIC',updatedAt:new Date().toISOString(),games},
    queue
  };
}
export function homepageExposureSnapshot(state={}){
  return{version:1,publicSafe:true,internalCompanySurface:true,updatedAt:state.updatedAt||null,games:(state.games||[]).map(g=>({
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
    vibeQueue:readJson(a.queue,{tasks:[]})
  });
  writeJson(a.output||'.vibe2/platform-exposure-state.json',result.state);
  if(a.queue)writeJson(a.queue,result.queue);
  if(a['homepage-output'])writeJson(a['homepage-output'],homepageExposureSnapshot(result.state));
  console.log('PLATFORM_EXPOSURE_GAMES='+result.state.games.length);
  console.log('PLATFORM_INTERNAL_RELEASES='+result.state.games.flatMap(g=>g.platforms).filter(x=>x.internalReleaseReady).length);
  console.log('PLATFORM_SECOND_GATE_READY='+result.state.games.flatMap(g=>g.platforms).filter(x=>x.secondGate.pass).length);
}
