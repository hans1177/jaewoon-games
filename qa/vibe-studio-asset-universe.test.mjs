import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  STUDIO_ASSET_UNIVERSE_TARGET,
  STUDIO_ASSET_FAMILIES,
  CONCEPT_AXES,
  CREATURE_BODY_PLANS,
  CREATURE_SPECIES,
  CLOTHING_LAYER_SLOTS,
  BIOME_FAMILIES,
  BUILDING_THEMES,
  createAssetDNA,
  createConceptProfile,
  evaluateConceptCompatibility,
  createStyleBible,
  evaluateStyleBible,
  evaluateAssetIdentity,
  checkClothingLayerCompatibility,
  checkOutfitThemeGrammar,
  validateBuildingGrammar,
  createBiomeDNA,
  createPropDensityProfile,
  createSkillPresentationKit,
  createDamagePresentation,
  createDestructionProfile,
  createAssetCompatibilityGraph,
  scanUniversalAssetCoverage,
  buildLibraryHeatmap,
  buildAutonomousAssetGapFillPlan,
  createAssetLineage,
  createStudioAssetUniversePlan
} from '../assets/vibe-studio-asset-universe.js';

test('studio asset universe exposes broad reusable catalogs',()=>{
  assert.equal(STUDIO_ASSET_UNIVERSE_TARGET,'HIGH_END_STUDIO_ASSET_UNIVERSE');
  assert.deepEqual([...STUDIO_ASSET_FAMILIES],['CHARACTER','CREATURE','BUILDING','ENVIRONMENT','WEAPON','SKILL','MATERIAL','AUDIO','VFX','UI','MOTION','PROP']);
  assert.ok(CREATURE_BODY_PLANS.length>=30);
  assert.ok(CREATURE_SPECIES.length>=50);
  assert.equal(CLOTHING_LAYER_SLOTS.length,15);
  assert.ok(BIOME_FAMILIES.length>=18);
  assert.ok(BUILDING_THEMES.length>=12);
});

test('concept director supports weighted mixed concepts without flattening style identity',()=>{
  const concept=createConceptProfile({
    styles:[{family:'WUXIA',weight:6},{family:'DARK_FANTASY',weight:3},{family:'CARTOON',weight:1}],
    artTone:['MYSTERIOUS','DARK'],
    combatFeel:['WUXIA_FLOW']
  });
  assert.equal(concept.weightedStyles.length,3);
  assert.equal(concept.dominantStyle,'WUXIA');
  assert.ok(Math.abs(concept.weightedStyles.reduce((n,row)=>n+row.weight,0)-1)<0.001);
  assert.ok(CONCEPT_AXES.COMBAT_FEEL.includes('WUXIA_FLOW'));
  const compatible=evaluateConceptCompatibility({
    asset:{STYLE_FAMILY:'WUXIA',COMPATIBILITY_TAGS:['DARK_FANTASY']},
    concept
  });
  assert.equal(compatible.pass,true);
  const mismatch=evaluateConceptCompatibility({asset:{STYLE_FAMILY:'SCI_FI'},concept});
  assert.equal(mismatch.pass,false);
});

test('asset DNA and style bible preserve semantic identity',()=>{
  const dna=createAssetDNA({
    id:'goblin-armor',
    family:'CHARACTER',
    subfamily:'ARMOR',
    bodyPlan:'SMALL_HUMANOID_BIPED',
    styleFamily:'CARTOON',
    layerSlot:'TORSO_OUTER',
    platformVariant:'ROBLOX'
  });
  assert.equal(dna.FAMILY,'CHARACTER');
  assert.equal(dna.LAYER_SLOT,'TORSO_OUTER');
  assert.equal(dna.RUNTIME_VERIFICATION_STATE,'PREPARED_SEMANTIC');
  const bible=createStyleBible({styleFamily:'CARTOON'});
  const qa=evaluateStyleBible({...dna,SILHOUETTE_CLASS:'SMALL_HUMANOID'},bible);
  assert.equal(qa.pass,true);
});

test('identity QA rejects color-only variants and accepts meaningful creature identity changes',()=>{
  const base={FAMILY:'CREATURE',SUBFAMILY:'SPECIES',BODY_PLAN:'QUADRUPED_CANINE',STYLE_FAMILY:'DARK_FANTASY'};
  const color=evaluateAssetIdentity({
    candidate:base,reference:base,
    differences:{silhouette:0.1,locomotion:0.1,attackLanguage:0.1,colorOnly:true}
  });
  assert.equal(color.distinct,false);
  assert.equal(color.colorOnlyRejected,true);
  const distinct=evaluateAssetIdentity({
    candidate:base,reference:base,
    differences:{silhouette:0.9,locomotion:0.7,attackLanguage:0.8,signatureSkill:0.7,audioIdentity:0.5,deathOrHit:0.6}
  });
  assert.equal(distinct.distinct,true);
  assert.ok(distinct.score>=55);
});

test('clothing layer compatibility catches clipping body rig and duplicate slots',()=>{
  const valid=checkClothingLayerCompatibility({
    bodyPlan:'HUMANOID',rigProfile:'HUMANOID',styleFamily:'FANTASY',
    items:[
      {id:'shirt',LAYER_SLOT:'TORSO_INNER',BODY_PLAN:'HUMANOID',RIG_PROFILE:'HUMANOID',STYLE_FAMILY:'FANTASY'},
      {id:'armor',LAYER_SLOT:'TORSO_OUTER',BODY_PLAN:'HUMANOID',RIG_PROFILE:'HUMANOID',STYLE_FAMILY:'FANTASY'}
    ]
  });
  assert.equal(valid.pass,true);
  const invalid=checkClothingLayerCompatibility({
    bodyPlan:'HUMANOID',rigProfile:'HUMANOID',styleFamily:'FANTASY',
    items:[
      {id:'shoulder',LAYER_SLOT:'SHOULDER',BODY_PLAN:'HUMANOID',RIG_PROFILE:'HUMANOID',STYLE_FAMILY:'FANTASY',largeVolume:true},
      {id:'cape',LAYER_SLOT:'CAPE',BODY_PLAN:'HUMANOID',RIG_PROFILE:'HUMANOID',STYLE_FAMILY:'FANTASY',largeVolume:true},
      {id:'cape2',LAYER_SLOT:'CAPE',BODY_PLAN:'HUMANOID',RIG_PROFILE:'HUMANOID',STYLE_FAMILY:'FANTASY'}
    ]
  });
  assert.equal(invalid.pass,false);
  assert.ok(invalid.conflicts.includes('CAPE_SHOULDER_VOLUME_CONFLICT'));
  assert.ok(invalid.conflicts.some(x=>x.startsWith('DUPLICATE_LAYER_SLOT:CAPE')));
});

test('outfit theme grammar blocks cross-theme nonsense',()=>{
  const result=checkOutfitThemeGrammar({
    theme:'MEDIEVAL',
    items:[{id:'linen',themeTags:['MEDIEVAL']},{id:'cyber-jacket',themeTags:['CYBERPUNK']}]
  });
  assert.equal(result.pass,false);
  assert.deepEqual([...result.violations],['cyber-jacket']);
});

test('building grammar enforces structure navigation and collision',()=>{
  const bad=validateBuildingGrammar({
    modules:[{type:'DOOR'},{type:'UPPER_FLOOR'}],
    navigation:{playerClear:false,npcClear:true,collisionValid:true}
  });
  assert.equal(bad.pass,false);
  assert.ok(bad.failures.includes('NO_FLOATING_DOOR'));
  assert.ok(bad.failures.includes('STAIRS_CONNECT_FLOORS'));
  assert.ok(bad.failures.includes('ROOF_REQUIRED'));
  assert.ok(bad.failures.includes('PLAYER_NAV_BLOCKED'));
  assert.equal(bad.blocksVerifiedPromotion,true);
  const good=validateBuildingGrammar({
    modules:[{type:'WALL'},{type:'DOOR'},{type:'UPPER_FLOOR'},{type:'STAIRS'},{type:'ROOF'}],
    navigation:{playerClear:true,npcClear:true,collisionValid:true}
  });
  assert.equal(good.pass,true);
});

test('biome DNA and prop density remain composition-aware and mobile-budgeted',()=>{
  const biome=createBiomeDNA({
    biome:'SNOW',
    ground:['snow'],rock:['ice-rock'],tree:['pine'],plant:['winter-bush'],cliff:['snow-cliff'],
    water:['frozen-lake'],fog:['cold-fog'],particle:['snowfall'],sky:['overcast'],lighting:['cold-light'],
    landmark:['ice-temple'],smallProp:['snow-log'],ambience:['wind'],creaturePreference:['wolf'],
    architecturePreference:['snow-village']
  });
  assert.equal(biome.biome,'SNOW');
  assert.deepEqual([...biome.channels.CREATURE_PREFERENCE],['wolf']);
  const density=createPropDensityProfile({biome:'SNOW',deviceClass:'MOBILE',cameraDistance:20});
  assert.equal(density.mobileReductionApplied,true);
  assert.ok(density.smallPropDensity<0.8);
});

test('skill damage and destruction presentation stay presentation-only',()=>{
  const skill=createSkillPresentationKit({
    id:'fireball',skillFamily:'FIRE',
    castMotion:'cast',vfx:'charge',projectile:'fireball',impact:'explode',audio:'fire-sfx',camera:'impact-kick',reaction:'burn-hit'
  });
  assert.equal(skill.complete,true);
  assert.equal(skill.gameplayDamageCooldownAndTargetingAuthority,false);
  const damage=createDamagePresentation({family:'FIRE',reaction:'burn',vfx:'flame',audio:'hit',cameraFeedback:'kick'});
  assert.equal(damage.complete,true);
  assert.equal(damage.gameplayDamageAuthority,false);
  const destroy=createDestructionProfile({family:'STONE_BREAK',lod:'FULL',fragments:30,vfx:'dust',audio:'stone'});
  assert.equal(destroy.mobileSafe,false);
  assert.equal(destroy.gameplayCollisionAuthority,false);
});

test('cross-asset graph blocks unresolved required links',()=>{
  const graph=createAssetCompatibilityGraph({
    nodes:[{id:'goblin',family:'CREATURE'},{id:'rig',family:'RIG'}],
    edges:[
      {from:'goblin',to:'rig',type:'USES',required:true},
      {from:'goblin',to:'missing-sword',type:'USES',required:true}
    ]
  });
  assert.equal(graph.valid,false);
  assert.equal(graph.unresolved.length,1);
});

test('universal coverage separates verified assets from prepared semantic work',()=>{
  const assets=[
    {id:'verified-body',family:'CHARACTER',subfamily:'BODY',status:'VERIFIED_COMPANY_ASSET',verifiedCompanyReusable:true},
    {id:'prepared-body',family:'CHARACTER',subfamily:'BODY',status:'PREPARED_SEMANTIC'},
    {id:'repo-body',family:'CHARACTER',subfamily:'BODY',status:'REPO_ASSET'}
  ];
  const coverage=scanUniversalAssetCoverage({
    assets,
    baselines:{CHARACTER:{BODY:3}},
    activeDemand:{CHARACTER:{BODY:1}},
    platform:'UNITY',
    styleFamily:'STYLIZED_FANTASY'
  });
  assert.equal(coverage.rows[0].availableVerified,1);
  assert.equal(coverage.rows[0].availablePrepared,1);
  assert.equal(coverage.rows[0].missingSlots,2);
  assert.equal(coverage.overallCoveragePercent,33);
});

test('heatmap and autonomous gap fill prioritize real gaps without false promotion',()=>{
  const coverage=scanUniversalAssetCoverage({
    assets:[],
    baselines:{CREATURE:{SPECIES:3},BUILDING:{MODULAR_EXTERIOR:2}},
    activeDemand:{CREATURE:{SPECIES:1},BUILDING:{MODULAR_EXTERIOR:0}},
    platform:'ROBLOX',
    styleFamily:'CARTOON'
  });
  const heat=buildLibraryHeatmap({
    coverageReport:coverage,
    signalsByKey:{'CREATURE:SPECIES':{activeGameDemand:true,heroBossLandmark:true,playerVisibleFrequencyHigh:true}}
  });
  assert.equal(heat.highestPriorityGap.family,'CREATURE');
  const fill=buildAutonomousAssetGapFillPlan({
    coverageReport:coverage,
    verifiedAssets:[],
    repositoryAssets:[],
    externalSources:[{id:'licensed-creature-pack',category:'CREATURE',status:'LICENSE_VERIFIED_EXTERNAL_CANDIDATE'}],
    signalsByKey:{'CREATURE:SPECIES':{activeGameDemand:true}}
  });
  const creature=fill.actions.find(x=>x.family==='CREATURE');
  assert.equal(creature.route,'ACQUIRE_LICENSE_VERIFIED_EXTERNAL_ASSET');
  assert.equal(creature.preparedMayClaimVerified,false);
  assert.equal(creature.nativeRuntimeConsumerRequiredBeforePromotion,true);
  assert.ok(creature.semanticSeeds.length>0);
});

test('asset lineage preserves provenance and native verification linkage',()=>{
  const lineage=createAssetLineage({
    assetId:'goblin-cartoon-unity',
    parentId:'goblin-base',
    sourceId:'source-001',
    sourceHash:'abc',
    derivedHash:'def',
    transformHistory:['retarget','cartoon-style'],
    licenseEvidence:'license',
    platform:'UNITY',
    styleFamily:'CARTOON',
    gameId:'demo',
    verificationSha:'sha',
    runtimeEvidenceId:'evidence'
  });
  assert.equal(lineage.complete,true);
  assert.equal(lineage.originalImmutable,true);
  assert.equal(lineage.revalidateDerivedWhenParentImproves,true);
});

test('company registry exposes semantic template space without claiming production verification',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  assert.equal(registry.studioAssetUniverse.target,'HIGH_END_STUDIO_ASSET_UNIVERSE');
  assert.equal(registry.studioAssetUniverse.productionVerified,false);
  assert.ok(registry.studioAssetUniverse.creatureCatalog.bodyPlans.length>=30);
  assert.ok(registry.studioAssetUniverse.creatureCatalog.species.length>=50);
  assert.equal(registry.studioAssetUniverse.semanticTemplateSpace.productionVerified,false);
  assert.equal(registry.studioAssetUniverse.semanticTemplateSpace.clothing.themeLayerCombinations,225);
  assert.equal(registry.studioAssetUniverse.semanticTemplateSpace.biome.biomeChannelSlots,270);
  assert.equal(registry.universalCoverage.preparedSemanticDoesNotCountAsVerified,true);
});

test('full studio asset universe plan exposes coverage heatmap and 24h gap fill',()=>{
  const plan=createStudioAssetUniversePlan({
    assets:[],
    repositoryAssets:[],
    externalSources:[],
    platform:'UNITY',
    styleFamily:'CARTOON'
  });
  assert.equal(plan.target,STUDIO_ASSET_UNIVERSE_TARGET);
  assert.equal(plan.continuous24h,true);
  assert.equal(plan.existingCanonicalLearningChainOnly,true);
  assert.equal(plan.preparedSemanticMayClaimVerified,false);
  assert.equal(plan.concept.dominantStyle,'CARTOON');
  assert.ok(plan.styleFamilies.includes('WUXIA'));
  assert.ok(plan.coverage.missingSlotCount>0);
  assert.ok(plan.heatmap.highestPriorityGap);
  assert.ok(plan.gapFill.actions.length>0);
});

test('asset production planner consumes the studio universe contract',async()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const {buildVibeAssetProductionPlan}=await import('../tools/vibe2-asset-production-plan.mjs');
  const plan=buildVibeAssetProductionPlan({
    task:{gameId:'studio-universe-test',goal:'카툰 무협 다크 판타지 몬스터 의복 건물 숲 배경 스킬 VFX 추가'},
    target:'unity',
    repoRoot:path.resolve(here,'..')
  });
  assert.equal(plan.companyGraphicsLibrary.studioAssetUniverse.enabled,true);
  assert.equal(plan.companyGraphicsLibrary.studioAssetUniverse.target,'HIGH_END_STUDIO_ASSET_UNIVERSE');
  assert.ok(plan.companyGraphicsLibrary.studioAssetUniverse.creatureBodyPlans.length>=30);
  assert.ok(plan.companyGraphicsLibrary.studioAssetUniverse.creatureSpecies.length>=50);
  assert.ok(plan.companyGraphicsLibrary.studioAssetUniverse.coverage.missingSlotCount>0);
  assert.ok(plan.companyGraphicsLibrary.studioAssetUniverse.plannedSemanticSeedCount>0);
  assert.equal(plan.companyGraphicsLibrary.studioAssetUniverse.preparedSemanticMayNotClaimVerified,true);
  assert.equal(plan.policy.universalAssetCoverageScannerRequired,true);
  assert.equal(plan.policy.assetIdentityQaRequired,true);
  assert.equal(plan.policy.autonomousLibraryPopulation24h,true);
  assert.equal(plan.policy.semanticAssetSeedCannotSelfPromote,true);
  assert.equal(plan.policy.conceptDirectorRequired,true);
  assert.equal(plan.policy.weightedConceptBlendAllowed,true);
  assert.equal(plan.policy.adaptiveWorldGenerationRequired,true);
  assert.equal(plan.policy.mapDnaRequired,true);
  assert.equal(plan.policy.seamlessStreamingPlanRequired,true);
  assert.ok(plan.companyGraphicsLibrary.studioAssetUniverse.conceptDirector.requested.weightedStyles.length>=3);
  assert.equal(plan.companyGraphicsLibrary.studioAssetUniverse.worldGenerationStudio.directLayoutCopyForbidden,true);
});
