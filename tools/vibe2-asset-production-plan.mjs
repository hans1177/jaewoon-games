// 파일명: tools/vibe2-asset-production-plan.mjs
// 역할: Vibe 게임 구현 작업이 필요한 에셋을 직접 제작/검증 자산 재사용/별도 authoring 요청 중에서 선택할 수 있도록 기계 계획을 만든다.
// 원칙: Vibe2/Vibe3가 게임 구현 주체다. 고정 라이선스/성능/QA 규칙은 학습이나 자동화가 우회하지 못한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { planAssetApplication } from '../assets/asset-selector.js';

const clean=value=>String(value??'').trim();
const freeze=value=>Object.freeze(value);
const freezeList=value=>freeze([...(value||[])]);
const unique=value=>[...new Set((value||[]).map(clean).filter(Boolean))];
const readJson=(file,fallback={})=>fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):fallback;
const highEndVisualContract=repoRoot=>readJson(path.join(repoRoot,'company-learning','platform-release-roadmap.json'),{})?.assetProductionParallelContract?.highEndVisualProductionContract||{};

const WEB_DIRECT_AUTHORING=freeze([
  'svg-final-art',
  'css-presentation',
  'canvas-art-and-effects',
  'procedural-javascript-visuals',
  'web-audio-sfx',
  'motion-engine-animation'
]);

const BINARY_AUTHORING_KINDS=freeze([
  'raster-image-or-sprite-sheet',
  'audio-file-or-bgm',
  '3d-model-or-rig',
  'engine-native-binary-asset'
]);

const UNITY_DIRECT_AUTHORING=freeze([
  'csharp-procedural-mesh-and-low-poly-model',
  'csharp-runtime-material-and-lighting',
  'csharp-particle-vfx-and-trails',
  'csharp-runtime-animation-and-secondary-motion',
  'ugui-runtime-presentation'
]);

const ROBLOX_DIRECT_AUTHORING=freeze([
  'luau-composed-low-poly-model',
  'luau-material-color-and-lighting',
  'luau-particle-beam-trail-vfx',
  'luau-runtime-animation-and-secondary-motion',
  'luau-ui-presentation'
]);

function assetTargetCompatible(asset={},target=''){
  const resolvedTarget=clean(target).toLowerCase();
  const assetPath=clean(asset.path).replaceAll('\\\\','/');
  const platforms=(Array.isArray(asset.platforms)?asset.platforms:[]).map(value=>clean(value).toLowerCase()).filter(Boolean);
  if(resolvedTarget==='web'){
    if(assetPath.startsWith('unity-games/')||assetPath.startsWith('roblox-games/'))return false;
    return !platforms.length||platforms.includes('web');
  }
  if(resolvedTarget==='unity'){
    if(assetPath.startsWith('web-games/')||assetPath.startsWith('roblox-games/'))return false;
    if(platforms.length)return platforms.includes('unity');
    return !assetPath||assetPath.startsWith('unity-games/');
  }
  if(resolvedTarget==='roblox'){
    if(assetPath.startsWith('web-games/')||assetPath.startsWith('unity-games/'))return false;
    if(platforms.length)return platforms.includes('roblox');
    return !assetPath||assetPath.startsWith('roblox-games/');
  }
  return false;
}

function matchedForType(selector={},type='',manifest={},target=''){
  const byId=new Map((Array.isArray(manifest?.assets)?manifest.assets:[]).map(asset=>[clean(asset?.id),asset]));
  return freezeList((selector.matched||[])
    .filter(row=>clean(row.type)===clean(type))
    .filter(row=>assetTargetCompatible(byId.get(clean(row.id))||row,target))
    .map(row=>freeze({
      id:clean(row.id),
      path:clean(row.path)||null,
      license:clean(row.license)||null,
      source:clean(row.source)||null,
      downloaded:row.downloaded!==false,
      animated:row.animated===true,
      motionMode:clean(row.motionMode)||null,
      targetCompatible:true
    })));
}

function directAuthoringFor(target='',type=''){
  const resolvedTarget=clean(target).toLowerCase();
  const actor=/character|player|enemy|boss|npc|animation/i.test(clean(type));
  const audio=/audio|sound|music|bgm|sfx/i.test(clean(type));
  if(resolvedTarget==='web'){
    if(audio) return freezeList(['web-audio-sfx']);
    if(actor) return freezeList(['svg-final-art','canvas-art-and-effects','motion-engine-animation']);
    return WEB_DIRECT_AUTHORING;
  }
  if(resolvedTarget==='unity'){
    if(audio) return freezeList([]);
    return UNITY_DIRECT_AUTHORING;
  }
  if(resolvedTarget==='roblox'){
    if(audio) return freezeList([]);
    return ROBLOX_DIRECT_AUTHORING;
  }
  return freezeList([]);
}

function decisionFor(selector={},target='',binding={},manifest={}){
  const type=clean(binding.type);
  const reuseCandidates=matchedForType(selector,type,manifest,target);
  const directAuthoring=directAuthoringFor(target,type);
  const decisionOrder=unique([
    reuseCandidates.length?'REUSE_VERIFIED_COMPANY_ASSET':'',
    directAuthoring.length?'VIBE_DIRECT_AUTHOR':'',
    'AUTHORING_GENERATOR_REQUEST'
  ]);
  return freeze({
    type,
    required:binding.required!==false,
    targetStates:freezeList(binding.targetStates||[]),
    reuseCandidates,
    directAuthoring,
    decisionOrder:freezeList(decisionOrder),
    generatorFallback:freeze({
      route:'AUTHORING_GENERATOR_REQUEST',
      requestedKinds:BINARY_AUTHORING_KINDS,
      onlyWhenReuseAndDirectAuthoringCannotMeetQuality:true,
      directBinaryTextEditForbidden:true,
      paidToolAutoInstallForbidden:true
    })
  });
}

export function buildVibeAssetProductionPlan({
  task={},
  target='',
  repoRoot=process.cwd(),
  manifest=null,
  presetCatalog=null
}={}){
  const resolvedTarget=clean(target||task.target).toLowerCase()||'web';
  const manifestInput=manifest||readJson(path.join(repoRoot,'assets','asset-manifest.json'),{version:0,assets:[]});
  const presetInput=presetCatalog||readJson(path.join(repoRoot,'assets','prototype-asset-presets.json'),{version:0,presets:[]});
  const request=clean(task.goal||task.request||task.gameId||'game asset production');
  const selector=planAssetApplication({
    prompt:request,
    manifest:manifestInput,
    presetCatalog:presetInput,
    rebuild:/FULL_WEB_GAME_REBUILD/i.test(request)
  });
  const decisions=freezeList((selector.binding||[]).map(binding=>decisionFor(selector,resolvedTarget,binding,manifestInput)));
  const highEnd=highEndVisualContract(repoRoot);
  const highEndActive=highEnd?.status==='ACTIVE_EXECUTABLE_CONTRACT';
  const directCount=decisions.filter(row=>row.directAuthoring.length>0).length;
  const reuseCount=decisions.filter(row=>row.reuseCandidates.length>0).length;
  return freeze({
    version:1,
    kind:'vibe2-asset-production-plan',
    graphicsProductionRoot:'GRAPHICS_PRODUCTION',
    externalTopLevelGraphicsWorkUnit:false,
    plannerRole:'GRAPHICS_PRODUCTION_INPUT_ONLY',
    gameId:clean(task.gameId)||null,
    target:resolvedTarget,
    implementationOwner:'VIBE2_VIBE3',
    selectorVersion:Number(selector.version||0),
    presetId:clean(selector.prototypePreset?.id)||null,
    productionProfile:selector.production||null,
    requestedTypes:freezeList(selector.requestedTypes||[]),
    missingTypes:freezeList(selector.missingTypes||[]),
    decisions,
    qualityProfile:highEndActive?'HIGH_END_COMMERCIAL_NATIVE_PRESENTATION':'STANDARD_PRESENTATION',
    highEndVisual:freeze({
      enabled:highEndActive,
      target:clean(highEnd?.target)||null,
      visualTargetFrames:freezeList(highEnd?.visualTargetFrames?.roles||[]),
      defaultAssetCategories:freezeList(highEnd?.defaultAssetApplication?.categories||[]),
      mutationCapabilities:freezeList(highEnd?.assetMutationAndExpansion?.allowedCapabilities||[]),
      heroQualityTargets:freezeList(highEnd?.qualityHierarchy?.HERO||[]),
      worldIdentityTargets:freezeList(highEnd?.qualityHierarchy?.WORLD_IDENTITY||[]),
      backgroundAndEnvironmentFirstClass:highEnd?.defaultAssetApplication?.backgroundAndEnvironmentFirstClass===true,
      antiKitbashGateRequired:highEnd?.cohesion?.antiKitbashGateRequired===true,
      internalPlatformReleasePresentationGateRequired:highEnd?.internalPlatformReleasePresentationGateRequired===true,
      publicReleasePresentationGateRequired:highEnd?.publicReleasePresentationGateRequired===true,
      presentationCompletionIsTerminal:highEnd?.presentationCompletionIsTerminal===true,
      continuousEvolution:highEnd?.continuousEvolution?.enabled===true,
      cinematicDirectionRequired:highEnd?.cinematicDirection?.enabled===true,
      ownerChangeRequestStabilityRequired:highEnd?.ownerChangeRequestStability?.enabled===true
    }),
    capabilities:freeze({
      webDirectAuthoring:WEB_DIRECT_AUTHORING,
      unityDirectAuthoring:UNITY_DIRECT_AUTHORING,
      robloxDirectAuthoring:ROBLOX_DIRECT_AUTHORING,
      binaryAuthoringKinds:BINARY_AUTHORING_KINDS,
      canChooseReuse:true,
      canChooseDirectAuthoring:['web','unity','roblox'].includes(resolvedTarget),
      canRequestGenerator:true
    }),
    summary:freeze({
      decisionCount:decisions.length,
      reuseCandidateTypes:reuseCount,
      directAuthorableTypes:directCount,
      missingSelectorTypes:(selector.missingTypes||[]).length
    }),
    policy:freeze({
      qualityAndGameIdentityFirst:true,
      artDirectionStyleLockRequiredBeforeAssetChoice:true,
      backgroundMustMatchWorldRegionAndNarrativeContext:true,
      monsterVisualMustMatchWorldEcologyAndCombatRole:true,
      actionActorStateSetRequired:freezeList(['IDLE','MOVE','ATTACK','HIT','DEATH']),
      webPresentationMustPassBeforeNativeHandoff:false,
      unityWebValidationSurfaceOnly:true,
      nativeDevelopmentAdmissionUsesMinimumDesign:true,
      defaultPurposefulAssetsRequired:highEnd?.defaultAssetApplication?.enabled===true,
      assetMutationAndExpansionRequired:highEnd?.assetMutationAndExpansion?.enabled===true,
      environmentAndBackgroundFirstClass:highEnd?.defaultAssetApplication?.backgroundAndEnvironmentFirstClass===true,
      visualTargetFramesRequired:highEnd?.visualTargetFrames?.required===true,
      antiKitbashGateRequired:highEnd?.cohesion?.antiKitbashGateRequired===true,
      beforeAfterVisualRegressionRequired:highEnd?.runtimeQa?.beforeAfterVisualRegressionRequired===true,
      existingAssetIsCandidateNotMandatory:true,
      crossPlatformWebAssetDirectReuseForbidden:true,
      nativeReuseRequiresTargetCompatibility:true,
      licenseAndCommercialUseGateRequired:true,
      animationEvidenceRequiredForActors:true,
      mobilePerformanceRequired:true,
      noEmojiPlaceholder:true,
      noGeometricPlaceholder:true,
      noPlaceholderMonsterOrCharacter:true,
      noContextMismatchBackground:true,
      directAuthoredSvgCanvasMustBeFinalQualityNotPlaceholder:true,
      nativeProceduralAuthoringMustBeFinalQualityNotPrimitivePlaceholder:true,
      composedLowPolyRequiresMultipleMeaningfulPartsAndStyleLock:true,
      binaryAssetsDirectTextEditForbidden:true,
      gameplaySaveProgressionEconomyMutationForbiddenForAssetReasons:true,
      sourceAndTransformProvenanceRequiredForReuse:true,
      authoringGeneratorRequestDoesNotCountAsAssetCompleted:true,
      assetUseRequiresRuntimeVisualQa:true,
      siblingTopLevelGraphicsTasksForbidden:true,
      internalModuleMayNotSelfAcceptGraphicsPass:true,
      allAssetDecisionsFanInToGraphicsProductionRoot:true,
      continuousPresentationEvolution:highEnd?.continuousEvolution?.enabled===true,
      graphicsPassIsCheckpointNotTerminal:highEnd?.graphicsPassMeaning==='VERIFIED_PRESENTATION_CHECKPOINT_NOT_TERMINAL_COMPLETION',
      highEndPresentationCompletionIsReleaseGate:false,
      ownerChangeRequestStabilityRequired:highEnd?.ownerChangeRequestStability?.enabled===true,
      latestExplicitOwnerIntentWinsWithinSameScope:highEnd?.ownerChangeRequestStability?.latestExplicitOwnerIntentWinsWithinSameScope===true,
      wrapperOrShadowPresentationAccumulationForbidden:highEnd?.ownerChangeRequestStability?.wrapperOverrideV2FinalTemporaryPatchAccumulationForbidden===true
    }),
    authority:'graphics-production-input-plan-only'
  });
}

export function assetProductionGuidance(plan={}){
  if(plan?.kind!=='vibe2-asset-production-plan') return '';
  const lines=[
    '[GRAPHICS_PRODUCTION / ASSET INPUT]',
    '이 계획은 독립 그래픽 작업이 아니다. 모든 에셋 결정은 단일 GRAPHICS_PRODUCTION 루트에 입력되고 같은 루트에서 캐릭터·환경·애니메이션·VFX·조명·UI와 함께 fan-in 된다.',
    'Vibe2/Vibe3가 게임 소스 구현 주체이며 현재 게임 정체성과 실제 화면 품질을 기준으로 필요한 에셋 방식을 선택한다.',
    '에셋 선택 전에 승인 설계·최신 아트북에서 게임별 Art Bible, Style Lock, Material/Environment/Animation/VFX/Lighting/UI 언어와 Visual Target Frame을 먼저 확정한다.',
    '기본값은 플레이어·적·NPC·무기·아이템·건축물·지형·배경·식생·소품·UI·VFX·오디오까지 목적 있는 에셋을 적용하는 것이다. primitive/샘플 모형은 prototype fallback만 허용하고 Visual Debt로 남긴다.',
    'Hero 품질 대상(플레이어, 주 보스/적, 시그니처 무기, 핵심 랜드마크/시작지역)은 전체 게임의 스타일 기준점으로 먼저 완성한다.',
    '배경과 환경은 후순위 장식이 아니다. 전경/중경/배경, 지역 랜드마크, set dressing, 환경 스토리텔링, 이동/전투 가독성을 실제 플레이 화면에서 확보한다.',
    '권리가 검증된 기존 에셋은 원본을 덮어쓰지 않고 파츠 재조합·실루엣/비율·재질·지역/정예/보스 파생·LOD 최적화 등 derived 변형으로 게임 고유 에셋화할 수 있다.',
    '서로 다른 에셋 팩을 원형 그대로 섞은 kitbash/sample-project 느낌은 완료가 아니다. Art Bible/재질/실루엣/조명/UI/VFX 언어를 통일한다.',
    '배경은 세계관·지역·서사 맥락에 맞고 몬스터는 생태·전투 역할이 읽히는 실루엣과 표현을 가져야 한다.',
    '액션·전투 캐릭터는 Web부터 IDLE/MOVE/ATTACK/HIT/DEATH 상태를 실제 게임 상태와 연결하고 표현 런타임을 통과한 뒤 native 플랫폼으로 이어간다.',
    '선택 순서 후보: 검증된 회사 에셋 재사용 / Vibe 직접 제작 / 별도 authoring generator 요청. 기존 에셋 재사용은 강제가 아니다.',
    'Web에서 SVG/CSS/Canvas/절차적 JavaScript/WebAudio/Motion Engine으로 최종 품질을 만들 수 있으면 Vibe가 직접 제작한다.',
    '이모지/단순 도형/검증용 임시 그래픽/임시 모형 몹/무맥락 배경을 최종 에셋으로 사용하지 않는다.',
    'PNG/WebP 스프라이트시트, 고품질 음원, 3D 모델처럼 binary authoring이 필요한데 현재 worker가 만들 수 없으면 가짜 파일을 쓰지 말고 authoring generator 요청으로 분리한다.',
    '에셋 이유로 게임 규칙, 세이브 의미, 진행, 경제 수치를 바꾸지 않는다.',
    `preset=${clean(plan.presetId)||'none'}; reuseCandidateTypes=${plan.summary?.reuseCandidateTypes||0}; directAuthorableTypes=${plan.summary?.directAuthorableTypes||0}; missingTypes=${(plan.missingTypes||[]).join(',')||'none'}`
  ];
  for(const row of (plan.decisions||[]).slice(0,12)){
    const reuse=(row.reuseCandidates||[]).slice(0,4).map(x=>x.id).join('|')||'none';
    const direct=(row.directAuthoring||[]).join('|')||'none';
    lines.push(`- type=${row.type}; reuse=${reuse}; direct=${direct}; fallback=AUTHORING_GENERATOR_REQUEST`);
  }
  return lines.join('\n');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{const [k,...v]=x.slice(2).split('=');return[k,v.join('=')]}));
  const task={gameId:clean(args.game),goal:clean(args.goal),target:clean(args.target)||'web'};
  const result=buildVibeAssetProductionPlan({task,target:task.target,repoRoot:clean(args.root)||process.cwd()});
  console.log(JSON.stringify(result,null,2));
}
