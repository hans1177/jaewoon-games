import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildVibeAssetProductionPlan} from '../tools/vibe2-asset-production-plan.mjs';
import {createVibeArtPipeline,VIBE_HIGH_END_TARGET_FRAME_ROLES} from '../assets/vibe-art-pipeline.js';
import {createVibeHighEndVisualDirection,HIGH_END_VISUAL_TARGET_FRAMES} from '../assets/vibe-visual-autopilot.js';
import {createVibeHighEndPresentationStack} from '../assets/vibe-presentation-director.js';
import {auditVibeRuntimeVisualEvidence,HIGH_END_GOLDEN_SCENE_ROLES} from '../assets/vibe-visual-quality-gate.js';

const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
const logMap=JSON.parse(fs.readFileSync('company-learning/company-log-map.json','utf8'));
const security=JSON.parse(fs.readFileSync('company-learning/security-immune-system.json','utf8'));

test('canonical high-end visual contract reuses existing graphics and asset pipeline',()=>{
  const c=roadmap.assetProductionParallelContract.highEndVisualProductionContract;
  assert.equal(c.status,'ACTIVE_EXECUTABLE_CONTRACT');
  assert.equal(c.target,'HIGH_END_COMMERCIAL_NATIVE_PRESENTATION');
  assert.equal(c.developmentAdmissionGate,false);
  assert.equal(c.runsInParallelWithNativeDevelopment,true);
  assert.equal(c.noNewDepartment,true);
  assert.equal(c.defaultAssetApplication.enabled,true);
  assert.equal(c.defaultAssetApplication.backgroundAndEnvironmentFirstClass,true);
  assert.equal(c.assetMutationAndExpansion.enabled,true);
  assert.equal(c.assetMutationAndExpansion.originalAssetImmutable,true);
  assert.equal(c.cohesion.antiKitbashGateRequired,true);
  assert.equal(c.visualTargetFrames.roles.length,7);
  assert.equal(c.runtimeQa.beforeAfterVisualRegressionRequired,true);
  assert.ok(architecture.executionTopology.assetProduction.includes('HIGH_END_RUNTIME_VISUAL_QA'));
  assert.equal(architecture.departmentTopology.graphics.usesExistingDepartment,true);
  assert.equal(logMap.highEndVisualEvidenceContract.markerOnlyEvidenceForbidden,true);
  assert.equal(security.highEndAssetTransformationSecurity.protections.unverifiedExternalAssetUseForbidden,true);
});

test('asset and direction planners consume one high-end profile without Web-first admission',()=>{
  const plan=buildVibeAssetProductionPlan({
    task:{gameId:'demo',goal:'캐릭터 배경 보스 UI VFX 그래픽 개선'},target:'unity',
    repoRoot:process.cwd(),manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}
  });
  assert.equal(plan.qualityProfile,'HIGH_END_COMMERCIAL_NATIVE_PRESENTATION');
  assert.equal(plan.highEndVisual.visualTargetFrames.length,7);
  assert.equal(plan.policy.webPresentationMustPassBeforeNativeHandoff,false);
  assert.equal(plan.policy.defaultPurposefulAssetsRequired,true);
  assert.equal(plan.policy.antiKitbashGateRequired,true);

  const art=createVibeArtPipeline({request:'하이엔드 캐릭터 배경 보스 애니메이션 VFX',target:'roblox',quality:3});
  assert.equal(art.version,5);
  assert.deepEqual([...art.highEndVisual.targetFrames],[...VIBE_HIGH_END_TARGET_FRAME_ROLES]);
  assert.ok(art.art.transforms.includes('kitbash'));
  assert.equal(art.policy.highEndVisualProduction,true);

  const direction=createVibeHighEndVisualDirection({game:{genre:'action rpg'},world:{materials:['stone']},platform:'mobile'});
  assert.deepEqual([...direction.targetFrames],[...HIGH_END_VISUAL_TARGET_FRAMES]);
  assert.equal(direction.assetPolicy.antiKitbashCohesionGate,true);
  assert.equal(createVibeHighEndPresentationStack().channels.includes('LIGHTING'),true);
});

function evidence(){
  const revision='e'.repeat(40);
  const captures=HIGH_END_GOLDEN_SCENE_ROLES.map((role,index)=>({
    role,source:'roblox-runtime-capture',artifactId:'capture-'+index,candidateRevision:revision,
    observed:true,reviewed:true,comparison:{pass:true}
  }));
  return {
    stage:'INTERNAL_PLAYTEST',candidateRevision:revision,
    qualityProfile:'HIGH_END_COMMERCIAL_NATIVE_PRESENTATION',highEndVisualRequired:true,
    artBibleBound:true,visualTargetFramesBound:true,captures,
    primaryActors:[{id:'player',presentation:'rigged-mesh'}],
    heroAssets:[{id:'player',presentation:'rigged-mesh'},{id:'landmark',presentation:'mesh'}],
    environment:{backgroundAssetBound:true,foregroundMidgroundBackground:true,landmark:true,setDressing:true,environmentalStorytelling:true,regionDifferentiation:true,navigationReadability:true},
    cohesion:{artBible:true,materialLanguage:true,silhouetteLanguage:true,lightingLanguage:true,uiVfxLanguage:true,antiKitbash:true},
    presentation:{animation:true,vfx:true,audio:true,camera:true,lighting:true},
    visualRegression:{pass:true},performance:{pass:true},visualDebt:[]
  };
}

test('high-end runtime QA requires real world cohesion regression and performance evidence',()=>{
  const pass=auditVibeRuntimeVisualEvidence(evidence());
  assert.equal(pass.pass,true,pass.reasons.join(','));
  const sparse=evidence(); sparse.environment={...sparse.environment,setDressing:false};
  assert.equal(auditVibeRuntimeVisualEvidence(sparse).pass,false);
  const sample=evidence(); sample.heroAssets=[{id:'player',presentation:'mesh',sampleAssetUnmodified:true}];
  assert.ok(auditVibeRuntimeVisualEvidence(sample).reasons.includes('hero-asset-placeholder-or-unmodified-sample'));
});
