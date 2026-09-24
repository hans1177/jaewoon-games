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
const companyGraphicsLibraryContract=repoRoot=>readJson(path.join(repoRoot,'company-learning','platform-release-roadmap.json'),{})?.assetProductionParallelContract?.companyGraphicsLibrary24h||{};
const companyAssetLibraryRegistry=repoRoot=>readJson(path.join(repoRoot,'company-asset-library.json'),{version:0,assets:[],externalSources:[]});

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

const COMPANY_CATEGORY_TYPES=freeze({
  CHARACTER:freeze(['character']),
  CREATURE:freeze(['enemy','boss']),
  MOTION:freeze(['animation']),
  ENVIRONMENT:freeze(['background','prop']),
  VFX:freeze(['effect']),
  UI:freeze(['ui']),
  WEAPON:freeze(['item'])
});

function verifiedCompanyManifestAssets(registry={}){
  return (Array.isArray(registry?.assets)?registry.assets:[])
    .filter(asset=>asset?.verifiedCompanyReusable===true||/^VERIFIED_COMPANY_/.test(clean(asset?.status).toUpperCase()))
    .map(asset=>({
      ...asset,
      id:clean(asset.id),
      path:clean(asset.path).replace(/^\//,''),
      types:Array.isArray(asset.types)&&asset.types.length?asset.types:(COMPANY_CATEGORY_TYPES[clean(asset.category).toUpperCase()]||[]),
      tags:Array.isArray(asset.tags)?asset.tags:[clean(asset.title),clean(asset.category)].filter(Boolean),
      platforms:Array.isArray(asset.platforms)?asset.platforms:(clean(asset.platform)&&!/^SHARED|WEB_/i.test(clean(asset.platform))?[clean(asset.platform).toLowerCase()]:[]),
      downloaded:true,
      companyVerified:true,
      source:clean(asset.source)||'COMPANY_ASSET_LIBRARY'
    }))
    .filter(asset=>asset.id);
}

function mergeManifestWithCompanyLibrary(manifest={},registry={}){
  const rows=[...(Array.isArray(manifest?.assets)?manifest.assets:[])];
  const byId=new Map(rows.map(asset=>[clean(asset?.id),asset]));
  for(const asset of verifiedCompanyManifestAssets(registry))byId.set(asset.id,{...(byId.get(asset.id)||{}),...asset});
  return {...manifest,assets:[...byId.values()]};
}

function sourceTierFor(asset={}){
  if(asset?.companyVerified===true)return 'VERIFIED_COMPANY_ASSET';
  const assetPath=clean(asset.path);
  const sourceUrl=clean(asset.sourceUrl);
  if(asset?.downloaded!==false&&!sourceUrl)return 'LICENSE_VERIFIED_EXISTING_REPOSITORY_ASSET';
  if(assetPath&&asset?.downloaded!==false)return 'LICENSE_VERIFIED_EXISTING_REPOSITORY_ASSET';
  return 'LICENSE_VERIFIED_EXTERNAL_ASSET';
}

function assetTargetCompatible(asset={},target=''){
  const resolvedTarget=clean(target).toLowerCase();
  const assetPath=clean(asset.path).replaceAll('\\\\','/');
  const platforms=(Array.isArray(asset.platforms)?asset.platforms:[]).map(value=>clean(value).toLowerCase()).filter(Boolean);
  const researchTargets=(Array.isArray(asset.platformResearchTargets)?asset.platformResearchTargets:[]).map(value=>clean(value).toLowerCase()).filter(Boolean);
  if(resolvedTarget==='web'){
    if(assetPath.startsWith('unity-games/')||assetPath.startsWith('roblox-games/'))return false;
    return !platforms.length||platforms.includes('web');
  }
  if(resolvedTarget==='unity'){
    if(assetPath.startsWith('web-games/')||assetPath.startsWith('roblox-games/'))return false;
    if(platforms.length&&platforms.includes('unity'))return true;
    if(!assetPath&&researchTargets.includes('unity'))return true;
    if(platforms.length)return false;
    return !assetPath||assetPath.startsWith('unity-games/');
  }
  if(resolvedTarget==='roblox'){
    if(assetPath.startsWith('web-games/')||assetPath.startsWith('unity-games/'))return false;
    if(platforms.length&&platforms.includes('roblox'))return true;
    if(!assetPath&&researchTargets.includes('roblox'))return true;
    if(platforms.length)return false;
    return !assetPath||assetPath.startsWith('roblox-games/');
  }
  return false;
}

function matchedForType(selector={},type='',manifest={},target=''){
  const byId=new Map((Array.isArray(manifest?.assets)?manifest.assets:[]).map(asset=>[clean(asset?.id),asset]));
  return freezeList((selector.matched||[])
    .filter(row=>clean(row.type)===clean(type))
    .filter(row=>assetTargetCompatible(byId.get(clean(row.id))||row,target))
    .map(row=>{
      const asset=byId.get(clean(row.id))||row;
      return freeze({
        id:clean(row.id),
        path:clean(row.path)||null,
        license:clean(row.license)||null,
        source:clean(row.source)||null,
        sourceUrl:clean(asset.sourceUrl)||null,
        downloaded:asset.downloaded!==false,
        animated:row.animated===true,
        motionMode:clean(row.motionMode)||null,
        sourceTier:sourceTierFor(asset),
        companyVerified:asset.companyVerified===true,
        retargetable:asset.retargetable===true,
        studioMotionCandidate:asset.studioMotionCandidate===true,
        creatureFamily:clean(asset.creatureFamily)||null,
        compatibleMotionSourceIds:freezeList(asset.compatibleMotionSourceIds||[]),
        targetCompatible:true
      });
    }));
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
  const matched=matchedForType(selector,type,manifest,target);
  const companyCandidates=freezeList(matched.filter(asset=>asset.sourceTier==='VERIFIED_COMPANY_ASSET'));
  const repositoryCandidates=freezeList(matched.filter(asset=>asset.sourceTier==='LICENSE_VERIFIED_EXISTING_REPOSITORY_ASSET'));
  const externalCandidates=freezeList(matched.filter(asset=>asset.sourceTier==='LICENSE_VERIFIED_EXTERNAL_ASSET'));
  const reuseCandidates=freezeList([...companyCandidates,...repositoryCandidates]);
  const directAuthoring=directAuthoringFor(target,type);
  const decisionOrder=unique([
    companyCandidates.length?'REUSE_VERIFIED_COMPANY_ASSET':'',
    repositoryCandidates.length?'REUSE_LICENSE_VERIFIED_EXISTING_REPOSITORY_ASSET':'',
    externalCandidates.length?'ACQUIRE_LICENSE_VERIFIED_EXTERNAL_ASSET':'',
    directAuthoring.length?'VIBE_DIRECT_AUTHOR':'',
    'AUTHORING_GENERATOR_REQUEST'
  ]);
  return freeze({
    type,
    required:binding.required!==false,
    targetStates:freezeList(binding.targetStates||[]),
    companyCandidates,
    repositoryCandidates,
    externalCandidates,
    reuseCandidates,
    directAuthoring,
    decisionOrder:freezeList(decisionOrder),
    generatorFallback:freeze({
      route:'AUTHORING_GENERATOR_REQUEST',
      requestedKinds:BINARY_AUTHORING_KINDS,
      onlyWhenCompanyRepositoryExternalAndDirectAuthoringCannotMeetQuality:true,
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
  const manifestBase=manifest||readJson(path.join(repoRoot,'assets','asset-manifest.json'),{version:0,assets:[]});
  const companyRegistry=companyAssetLibraryRegistry(repoRoot);
  const manifestInput=mergeManifestWithCompanyLibrary(manifestBase,companyRegistry);
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
  const companyLibrary=companyGraphicsLibraryContract(repoRoot);
  const companyLibraryActive=companyLibrary?.status==='ACTIVE_EXECUTABLE_CONTRACT';
  const directCount=decisions.filter(row=>row.directAuthoring.length>0).length;
  const reuseCount=decisions.filter(row=>row.reuseCandidates.length>0).length;
  const companyCount=decisions.filter(row=>row.companyCandidates.length>0).length;
  const repositoryCount=decisions.filter(row=>row.repositoryCandidates.length>0).length;
  const externalCount=decisions.filter(row=>row.externalCandidates.length>0).length;
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
    companyGraphicsLibrary:freeze({
      enabled:companyLibraryActive,
      graphicsProductionRoot:clean(companyLibrary?.graphicsProductionRoot)||'GRAPHICS_PRODUCTION',
      scheduler:clean(companyLibrary?.scheduler)||null,
      platformProfile:resolvedTarget==='unity'?'UNITY':resolvedTarget==='roblox'?'ROBLOX':'WEB_REFERENCE_ONLY',
      baseArchetypes:freezeList(companyLibrary?.characterPreparation?.baseArchetypes||[]),
      modularParts:freezeList(companyLibrary?.characterPreparation?.modularParts||[]),
      weaponPacks:freezeList(companyLibrary?.actionMotionLibrary?.weaponPacks||[]),
      motionMinimums:freeze(companyLibrary?.actionMotionLibrary?.minimumCoverage||{}),
      qualityRequirements:freezeList(companyLibrary?.actionMotionLibrary?.qualityRequirements||[]),
      reusableLibraries:freezeList(companyLibrary?.reusableLibraries||[]),
      preparedArtifactMayNotClaimProductionPass:companyLibrary?.promotionRules?.preparedArtifactMayNotClaimProductionPass===true,
      runtimeVerifiedConsumerRequiredBeforePromotion:companyLibrary?.promotionRules?.runtimeVerifiedConsumerRequiredBeforeCompanyAssetPromotion===true,
      platformSpecificReauthoringRequired:companyLibrary?.promotionRules?.platformSpecificReauthoringRequired===true,
      mandatoryConsumer:companyLibrary?.consumption?.requiredForEveryNativeGameDevelopment===true&&['unity','roblox'].includes(resolvedTarget),
      lookupBeforeAssetChoice:companyLibrary?.consumption?.lookupBeforeAssetChoice===true,
      externalGapFillBeforeNewAuthoring:companyLibrary?.gapFill?.enabled===true,
      gapFillOrder:freezeList(companyLibrary?.gapFill?.order||[]),
      studioMotionTarget:clean(companyLibrary?.studioMotionProgram?.target)||null,
      studioMotionPriority:freezeList(companyLibrary?.studioMotionProgram?.priorityBootstrap||[]),
      humanoidFoundation:freeze(companyLibrary?.studioMotionProgram?.humanoidFoundation||{}),
      creatureFamilies:freezeList(companyLibrary?.studioMotionProgram?.creatureFamilies||[]),
      bipedCreature:freeze({
        enabled:companyLibrary?.bipedCreatureMotionStudio?.status==='ACTIVE_EXECUTABLE_CONTRACT',
        target:clean(companyLibrary?.bipedCreatureMotionStudio?.target)||null,
        taxonomy:freeze(companyLibrary?.bipedCreatureMotionStudio?.taxonomy||{}),
        sharedRigDoesNotImplySharedMotionIdentity:companyLibrary?.bipedCreatureMotionStudio?.sharedRigDoesNotImplySharedMotionIdentity===true,
        speedScaleOnlyVariationForbidden:companyLibrary?.bipedCreatureMotionStudio?.speedScaleOnlyVariationForbidden===true,
        specialBodyPartBindings:freezeList(companyLibrary?.bipedCreatureMotionStudio?.specialBodyPartBindings||[]),
        minotaurProfile:freeze(companyLibrary?.bipedCreatureMotionStudio?.minotaurProfile||{}),
        goblinProfile:freeze(companyLibrary?.bipedCreatureMotionStudio?.goblinProfile||{}),
        runtimeQa:freezeList(companyLibrary?.bipedCreatureMotionStudio?.runtimeQa||[])
      }),
      styleVariants:freeze({
        enabled:companyLibrary?.styleVariantTransformation?.status==='ACTIVE_EXECUTABLE_CONTRACT',
        target:clean(companyLibrary?.styleVariantTransformation?.target)||null,
        supportedStyles:freezeList(companyLibrary?.styleVariantTransformation?.supportedStyleFamilies||[]),
        transformAxes:freezeList(companyLibrary?.styleVariantTransformation?.transformAxes||[]),
        cartoonProfile:freeze(companyLibrary?.styleVariantTransformation?.cartoonProfile||{}),
        interLibraryBindings:freezeList(companyLibrary?.styleVariantTransformation?.interLibraryBindings||[]),
        graphRule:clean(companyLibrary?.styleVariantTransformation?.graphRule)||null,
        styleLockAlwaysWins:companyLibrary?.styleVariantTransformation?.styleLockAlwaysWins===true,
        gameplayAuthorityImmutable:companyLibrary?.styleVariantTransformation?.preservationRules?.gameplayBalanceSaveProgressionEconomyHitCooldownMultiplayerIntentImmutable===true,
        rootMotionEnvelopeRequired:companyLibrary?.styleVariantTransformation?.preservationRules?.rootMotionMustRespectAuthoritativeMovementEnvelope===true,
        contactMarkersSynchronized:companyLibrary?.styleVariantTransformation?.preservationRules?.contactMarkersMustRemainSynchronized===true,
        sameSourceMayHaveMultipleStyleVariants:companyLibrary?.styleVariantTransformation?.preservationRules?.sameSourceCanProduceMultipleStyleVariants===true,
        runtimeVerificationRequired:companyLibrary?.styleVariantTransformation?.preservationRules?.styleVariantPromotionRequiresTargetGameRuntimeVerification===true
      }),
      motionDirector:freeze({
        enabled:companyLibrary?.motionDirectorSystem?.status==='ACTIVE_EXECUTABLE_CONTRACT',
        target:clean(companyLibrary?.motionDirectorSystem?.target)||null,
        implementation:clean(companyLibrary?.motionDirectorSystem?.implementation)||null,
        internalModuleOnly:companyLibrary?.motionDirectorSystem?.internalModuleOnly===true,
        continuousExpansion:companyLibrary?.motionDirectorSystem?.continuousExpansion?.enabled===true,
        noArtificialMotionCategoryCap:companyLibrary?.motionDirectorSystem?.continuousExpansion?.noArtificialMotionCategoryCap===true,
        noArtificialCombinationCap:companyLibrary?.motionDirectorSystem?.continuousExpansion?.noArtificialCombinationCap===true,
        compositionChannels:freezeList(companyLibrary?.motionDirectorSystem?.compositionChannels||[]),
        motionDNAFields:freezeList(companyLibrary?.motionDirectorSystem?.motionDNAFields||[]),
        motionFamilies:freeze(companyLibrary?.motionDirectorSystem?.motionFamilies||{}),
        grammars:freeze(companyLibrary?.motionDirectorSystem?.motionGrammar||{}),
        compatibilityDimensions:freezeList(companyLibrary?.motionDirectorSystem?.compatibilityGraph?.dimensions||[]),
        contextInputs:freezeList(companyLibrary?.motionDirectorSystem?.contextSelector?.inputs||[]),
        reactionInputs:freezeList(companyLibrary?.motionDirectorSystem?.reactionMatcher?.inputs||[]),
        pairFamilies:freezeList(companyLibrary?.motionDirectorSystem?.pairMotion?.families||[]),
        speciesSignatureSlots:freezeList(companyLibrary?.motionDirectorSystem?.speciesSignature?.slots||[]),
        mutationAllowed:freezeList(companyLibrary?.motionDirectorSystem?.motionMutation?.allowed||[]),
        variationMemory:freeze(companyLibrary?.motionDirectorSystem?.variationMemory||{}),
        libraryGraphNodes:freezeList(companyLibrary?.motionDirectorSystem?.libraryInterlink?.nodes||[]),
        platformAdapters:freeze(companyLibrary?.motionDirectorSystem?.platformAdapters||{}),
        runtimeQa:freezeList(companyLibrary?.motionDirectorSystem?.runtimeQa||[]),
        gameplayAuthority:companyLibrary?.motionDirectorSystem?.authorityGuard?.motionDirectorOwnsPresentationSelectionAndCompositionOnly===true?false:null
      }),
      motionBootstrap:freeze({
        status:clean(companyRegistry?.motionBootstrap?.status)||null,
        productionVerified:companyRegistry?.motionBootstrap?.productionVerified===true,
        setCount:Array.isArray(companyRegistry?.motionBootstrap?.sets)?companyRegistry.motionBootstrap.sets.length:0,
        setIds:freezeList((companyRegistry?.motionBootstrap?.sets||[]).map(row=>clean(row.id)).filter(Boolean)),
        archetypes:freezeList((companyRegistry?.motionBootstrap?.sets||[]).map(row=>clean(row.archetype)).filter(Boolean)),
        bodyPlans:freezeList([...new Set((companyRegistry?.motionBootstrap?.sets||[]).map(row=>clean(row.bodyPlan)).filter(Boolean))]),
        platformTargets:freezeList(companyRegistry?.motionBootstrap?.platformTargets||[]),
        verificationRule:clean(companyRegistry?.motionBootstrap?.verificationRule)||null
      }),
      retargetCleanupRequirements:freezeList(companyLibrary?.studioMotionProgram?.retargetCleanupRequirements||[]),
      unarmedCombat:freeze({
        enabled:companyLibrary?.unarmedCombatStudio?.status==='ACTIVE_EXECUTABLE_CONTRACT',
        target:clean(companyLibrary?.unarmedCombatStudio?.target)||null,
        noArtificialStyleOrMotionCap:companyLibrary?.unarmedCombatStudio?.noArtificialStyleOrMotionCap===true,
        styleFamilies:freezeList(companyLibrary?.unarmedCombatStudio?.supportedStyleFamilies||[]),
        motionFamilies:freeze(companyLibrary?.unarmedCombatStudio?.motionFamilies||{}),
        comboRoles:freezeList(companyLibrary?.unarmedCombatStudio?.comboMotionGrammar?.roles||[]),
        motionMetadata:freezeList(companyLibrary?.unarmedCombatStudio?.comboMotionGrammar?.motionMetadata||[]),
        qualityRequirements:freezeList(companyLibrary?.unarmedCombatStudio?.qualityRequirements||[]),
        timingMarkersCannotOwnGameplayRules:companyLibrary?.unarmedCombatStudio?.comboMotionGrammar?.animationMayExposeTimingMarkersButAuthoritativeHitboxDamageCooldownAndComboRulesRemainGameplayOwned===true,
        externalLicensedMotionGapFill:companyLibrary?.unarmedCombatStudio?.externalMotionUse?.searchExternalLicensedMotionBeforeAuthoringMissingCoverage===true,
        platformNativeRuntimeVerificationRequired:companyLibrary?.unarmedCombatStudio?.externalMotionUse?.retargetCleanupAndPlatformNativeRuntimeValidationRequired===true
      }),
      verifiedCompanyAssetCount:verifiedCompanyManifestAssets(companyRegistry).length,
      externalSourceCount:Array.isArray(companyRegistry?.externalSources)?companyRegistry.externalSources.length:0,
      externalSourceIds:freezeList((companyRegistry?.externalSources||[]).map(row=>clean(row.id)).filter(Boolean))
    }),
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
      companyCandidateTypes:companyCount,
      repositoryCandidateTypes:repositoryCount,
      externalCandidateTypes:externalCount,
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
      companyGraphicsLibrary24h:companyLibraryActive,
      companyLibraryLookupRequiredBeforeNativeAssetChoice:companyLibrary?.consumption?.lookupBeforeAssetChoice===true,
      existingRepositoryInventoryBeforeExternal:companyLibrary?.gapFill?.order?.[0]==='INVENTORY_EXISTING_REPOSITORY_ASSETS',
      externalGapFillBeforeNewAuthoring:companyLibrary?.gapFill?.enabled===true,
      unityRobloxLibraryVariantsSeparated:companyLibrary?.promotionRules?.platformSpecificReauthoringRequired===true,
      actionReadyMotionVarietyRequired:companyLibraryActive,
      studioGradeMotionRequired:companyLibrary?.studioMotionProgram?.target==='STUDIO_GRADE_GAME_MOTION',
      unarmedVersusActionMotionRequired:companyLibrary?.unarmedCombatStudio?.status==='ACTIVE_EXECUTABLE_CONTRACT',
      unarmedStyleResearchNoArtificialCap:companyLibrary?.unarmedCombatStudio?.noArtificialStyleOrMotionCap===true,
      wuxiaUnarmedMotionResearch:companyLibrary?.unarmedCombatStudio?.supportedStyleFamilies?.includes('WUXIA_UNARMED_FANTASY')===true,
      unarmedAnimationMarkersCannotOwnGameplayRules:companyLibrary?.unarmedCombatStudio?.comboMotionGrammar?.animationMayExposeTimingMarkersButAuthoritativeHitboxDamageCooldownAndComboRulesRemainGameplayOwned===true,
      pairedThrowPlatformRuntimeVerificationRequired:companyLibrary?.unarmedCombatStudio?.platformAdaptation?.pairedTwoActorThrowAlignmentMustBeReauthoredAndRuntimeVerifiedPerPlatform===true,
      retargetAndCleanupRequiredForExternalMotion:companyLibrary?.studioMotionProgram?.externalMotionUse?.retargetAndCleanupRequired===true,
      speciesMotionStudyRequired:companyLibrary?.studioMotionProgram?.creatureRules?.speciesReferenceStudyRequired===true,
      bipedCreatureBodyPlanMotionRequired:companyLibrary?.bipedCreatureMotionStudio?.status==='ACTIVE_EXECUTABLE_CONTRACT',
      sharedRigDoesNotImplySharedMotionIdentity:companyLibrary?.bipedCreatureMotionStudio?.sharedRigDoesNotImplySharedMotionIdentity===true,
      bipedSpeedScaleOnlyVariationForbidden:companyLibrary?.bipedCreatureMotionStudio?.speedScaleOnlyVariationForbidden===true,
      styleVariantDerivationAllowed:companyLibrary?.styleVariantTransformation?.status==='ACTIVE_EXECUTABLE_CONTRACT',
      cartoonStyleVariantAllowed:companyLibrary?.styleVariantTransformation?.supportedStyleFamilies?.includes('CARTOON')===true,
      styleVariantPreservesGameplayAuthority:companyLibrary?.styleVariantTransformation?.preservationRules?.gameplayBalanceSaveProgressionEconomyHitCooldownMultiplayerIntentImmutable===true,
      creatureLibraryGraphInterlinkRequired:Array.isArray(companyLibrary?.styleVariantTransformation?.interLibraryBindings)&&companyLibrary.styleVariantTransformation.interLibraryBindings.includes('CREATURE_RIG_LIBRARY')&&companyLibrary.styleVariantTransformation.interLibraryBindings.includes('ACTION_MOTION_LIBRARY'),
      composableMotionDirectorRequired:companyLibrary?.motionDirectorSystem?.status==='ACTIVE_EXECUTABLE_CONTRACT',
      motionDirectorContinuousExpansion:companyLibrary?.motionDirectorSystem?.continuousExpansion?.enabled===true,
      motionDirectorNoArtificialCombinationCap:companyLibrary?.motionDirectorSystem?.continuousExpansion?.noArtificialCombinationCap===true,
      motionDNARequired:Array.isArray(companyLibrary?.motionDirectorSystem?.motionDNAFields)&&companyLibrary.motionDirectorSystem.motionDNAFields.includes('BODY_PLAN')&&companyLibrary.motionDirectorSystem.motionDNAFields.includes('COMBAT_ROLE'),
      motionCompatibilityGraphRequired:companyLibrary?.motionDirectorSystem?.compatibilityGraph?.required===true,
      contextMotionSelectorRequired:companyLibrary?.motionDirectorSystem?.contextSelector?.enabled===true,
      reactionMatcherRequired:companyLibrary?.motionDirectorSystem?.reactionMatcher?.enabled===true,
      pairMotionRequired:companyLibrary?.motionDirectorSystem?.pairMotion?.enabled===true,
      variationMemoryRequired:companyLibrary?.motionDirectorSystem?.variationMemory?.enabled===true,
      preparedSemanticMotionSetsDoNotCountAsVerified:companyRegistry?.motionBootstrap?.status==='PREPARED_SEMANTIC_LIBRARY'&&companyRegistry?.motionBootstrap?.productionVerified!==true,
      motionBootstrapAvailable:Array.isArray(companyRegistry?.motionBootstrap?.sets)&&companyRegistry.motionBootstrap.sets.length>0,
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
    plan.companyGraphicsLibrary?.enabled?'회사 공용 그래픽 라이브러리는 24시간 idle 준비를 계속하지만 연습 산출물은 바로 production asset이 아니다. 실제 게임의 Unity/Roblox 네이티브 적용과 runtime 시각·모션·모바일 QA를 통과한 것만 검증 공용 자산으로 승격한다.':'',
    plan.companyGraphicsLibrary?.enabled?`캐릭터 플랫폼 프로필=${plan.companyGraphicsLibrary.platformProfile}; Unity/Roblox 바이너리·리그는 직접 공유하지 않고 공통 실루엣/체형/장비 의미만 공유한 뒤 네이티브 재authoring한다.`:'',
    plan.companyGraphicsLibrary?.enabled?`액션 모션 최소 커버리지=${JSON.stringify(plan.companyGraphicsLibrary.motionMinimums)}; weaponPacks=${plan.companyGraphicsLibrary.weaponPacks.join('|')}`:'',
    plan.companyGraphicsLibrary?.enabled?`스튜디오 모션=${plan.companyGraphicsLibrary.studioMotionTarget}; 우선 구축=${plan.companyGraphicsLibrary.studioMotionPriority.join('→')}; 리타겟 클린업=${plan.companyGraphicsLibrary.retargetCleanupRequirements.join('|')}`:'',
    plan.companyGraphicsLibrary?.unarmedCombat?.enabled?`맨손 대전 액션=${plan.companyGraphicsLibrary.unarmedCombat.target}; 스타일=${plan.companyGraphicsLibrary.unarmedCombat.styleFamilies.join('|')}; comboRoles=${plan.companyGraphicsLibrary.unarmedCombat.comboRoles.join('|')}; 모션 메타데이터=${plan.companyGraphicsLibrary.unarmedCombat.motionMetadata.join('|')}`:'',
    plan.companyGraphicsLibrary?.unarmedCombat?.enabled?'맨손 모션은 가드/보법/주먹/팔꿈치/무릎/킥/방어·카운터/잡기·던지기/낙법·기상/무협 판타지/대전 리액션을 계속 확장한다. 애니메이션 타이밍 마커는 표현·동기화 정보이며 데미지·히트박스·쿨다운·콤보 판정 권한을 갖지 않는다.':'',
    plan.companyGraphicsLibrary?.bipedCreature?.enabled?`두발 몬스터=${plan.companyGraphicsLibrary.bipedCreature.target}; 체형=${Object.keys(plan.companyGraphicsLibrary.bipedCreature.taxonomy||{}).join('|')}; 고블린=${plan.companyGraphicsLibrary.bipedCreature.goblinProfile.family||'n/a'}; 미노타우로스=${plan.companyGraphicsLibrary.bipedCreature.minotaurProfile.family||'n/a'}`:'',
    plan.companyGraphicsLibrary?.bipedCreature?.enabled?'두발 몹은 인간형 리그를 재사용할 수 있어도 체형/체중/보폭/회전/공격/피격/사망 모션 정체성을 따로 검증한다. 속도 배율만 바꾼 인간 걷기로 종 차이를 대체하지 않는다.':'',
    plan.companyGraphicsLibrary?.styleVariants?.enabled?`Style Variant=${plan.companyGraphicsLibrary.styleVariants.supportedStyles.join('|')}; cartoon transforms=${(plan.companyGraphicsLibrary.styleVariants.cartoonProfile.allowed||[]).join('|')}; graph=${plan.companyGraphicsLibrary.styleVariants.interLibraryBindings.join('→')}`:'',
    plan.companyGraphicsLibrary?.styleVariants?.enabled?'카툰 등 컨셉 변형은 비율·실루엣·키포즈·anticipation·squash/stretch·반동·표정·재질·VFX를 변형하되 이동속도/히트박스/데미지/쿨다운/authoritative root movement와 contact marker 의미를 보존한다.':'',
    plan.companyGraphicsLibrary?.motionDirector?.enabled?`Motion Director=${plan.companyGraphicsLibrary.motionDirector.target}; channels=${plan.companyGraphicsLibrary.motionDirector.compositionChannels.join('|')}; libraries=${plan.companyGraphicsLibrary.motionDirector.libraryGraphNodes.join('→')}`:'',
    plan.companyGraphicsLibrary?.motionDirector?.enabled?'Motion DNA와 호환성 그래프를 기준으로 상체/하체/사지/머리/꼬리/날개/VFX/오디오/카메라를 조합하고, 거리·방향·속도·지형·벽·이전 모션을 Context Selector에 넣어 가장 맞는 표현을 선택한다.':'',
    plan.companyGraphicsLibrary?.motionDirector?.enabled?'스킬은 PREPARE→CHARGE/CHANNEL→AIM→RELEASE→IMPACT_RESPONSE→RECOVERY 문법을 사용하고, 피격은 방향/높이/강도/현재자세/벽/공중상태로 Reaction Matcher가 표현을 고른다. Pair Motion은 잡기·던지기·피니셔 등 2인 정렬을 플랫폼별로 검증한다.':'',
    plan.companyGraphicsLibrary?.motionDirector?.enabled?'Motion Mutation과 Variation Memory로 Mirror/stance/pose/anticipation/style 파생과 반복 억제를 수행하되 데미지·히트박스·쿨다운·콤보/캔슬·이동 권한은 게임플레이가 유지한다.':'',
    plan.companyGraphicsLibrary?.motionBootstrap?.setCount?`모션 시드 세트=${plan.companyGraphicsLibrary.motionBootstrap.setCount}개; archetypes=${plan.companyGraphicsLibrary.motionBootstrap.archetypes.join('|')}; 상태=${plan.companyGraphicsLibrary.motionBootstrap.status}. PREPARED_SEMANTIC은 실제 네이티브 클립 PASS가 아니며 실게임 런타임 검증 후에만 승격한다.`:'',
    '선택 순서: 같은 게임/검증 회사 에셋 → 라이선스 검증 기존 저장소 → 라이선스 검증 외부 에셋·모션 확보 → 리타겟/클린업 또는 직접 제작 → 별도 authoring generator. 외부 후보는 실제 다운로드·플랫폼 변환·런타임 검증 전 회사 검증 자산이 아니다.',
    'Web에서 SVG/CSS/Canvas/절차적 JavaScript/WebAudio/Motion Engine으로 최종 품질을 만들 수 있으면 Vibe가 직접 제작한다.',
    '이모지/단순 도형/검증용 임시 그래픽/임시 모형 몹/무맥락 배경을 최종 에셋으로 사용하지 않는다.',
    'PNG/WebP 스프라이트시트, 고품질 음원, 3D 모델처럼 binary authoring이 필요한데 현재 worker가 만들 수 없으면 가짜 파일을 쓰지 말고 authoring generator 요청으로 분리한다.',
    '에셋 이유로 게임 규칙, 세이브 의미, 진행, 경제 수치를 바꾸지 않는다.',
    `preset=${clean(plan.presetId)||'none'}; reuseCandidateTypes=${plan.summary?.reuseCandidateTypes||0}; directAuthorableTypes=${plan.summary?.directAuthorableTypes||0}; missingTypes=${(plan.missingTypes||[]).join(',')||'none'}`
  ];
  for(const row of (plan.decisions||[]).slice(0,12)){
    const reuse=(row.reuseCandidates||[]).slice(0,4).map(x=>x.id).join('|')||'none';
    const external=(row.externalCandidates||[]).slice(0,4).map(x=>x.id).join('|')||'none';
    const direct=(row.directAuthoring||[]).join('|')||'none';
    lines.push(`- type=${row.type}; reuse=${reuse}; external=${external}; direct=${direct}; order=${(row.decisionOrder||[]).join('>')}`);
  }
  return lines.join('\n');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{const [k,...v]=x.slice(2).split('=');return[k,v.join('=')]}));
  const task={gameId:clean(args.game),goal:clean(args.goal),target:clean(args.target)||'web'};
  const result=buildVibeAssetProductionPlan({task,target:task.target,repoRoot:clean(args.root)||process.cwd()});
  console.log(JSON.stringify(result,null,2));
}
