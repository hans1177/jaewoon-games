import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {buildVibeAssetProductionPlan} from '../tools/vibe2-asset-production-plan.mjs';
import {findPresentationQualityTask,findPresentationQualityTasks,findWeatherPresentationTask,planVibe2AutonomousTasks} from '../tools/vibe2-auto-planner.mjs';
import {runIncrementalQa} from '../tools/vibe2-incremental-qa.mjs';

function writePolicy(root,{pilot='fantasy-survival'}={}){
  fs.mkdirSync(path.join(root,'company-learning'),{recursive:true});
  fs.writeFileSync(path.join(root,'company-learning','platform-release-roadmap.json'),JSON.stringify({
    version:209,
    authority:'MACHINE_EXECUTION_CONTRACT',
    machineSourceOfTruth:'company-learning/platform-release-roadmap.json',
    humanDocumentRequired:false,
    assetProductionParallelContract:{
      version:3,enabled:true,
      atomicPresentationExecution:{enabled:true,legacySerialStageChain:false,topology:'RESPONSIBLE_FILE_ATOMIC_FAN_OUT_WITH_PACKAGE_FAN_IN'},
      firstAdoption:{gameId:pilot,targetPlatforms:['UNITY','ROBLOX']},
      platformAssetSeparation:{
        webAssetDirectReuseIntoUnityForbidden:true,
        webAssetDirectReuseIntoRobloxForbidden:true
      }
    },
    weatherPresentationContract:{
      version:1,enabled:true,
      firstAdoption:{gameId:pilot,surfaces:['WEB_COMPANION','UNITY','ROBLOX']},
      canonicalStates:['CLEAR','RAIN','FOG','SNOW','STORM'],
      regionalExtensions:['VOLCANIC_ASH','HEAT_HAZE']
    }
  },null,2));
}

function tempRoot(opts={}){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-native-weather-'));
  execFileSync('git',['init','-q'],{cwd:root});
  writePolicy(root,opts);
  return root;
}

test('web-only assets are never reused directly by Unity or Roblox',()=>{
  const manifest={version:1,assets:[
    {id:'web-tree',path:'web-games/demo/assets/tree.png',types:['prop'],tags:['나무'],license:'CC0'},
    {id:'unity-ui',path:'',types:['ui'],tags:['UI'],license:'CC0',platforms:['unity']},
    {id:'roblox-fx',path:'',types:['effect'],tags:['이펙트'],license:'CC0',platforms:['roblox']},
    {id:'generic-vfx',path:'',types:['effect'],tags:['이펙트'],license:'CC0'}
  ]};
  const task={gameId:'fantasy-survival',goal:'숲 나무 UI 이펙트 애니메이션 그래픽 개선'};
  const unity=buildVibeAssetProductionPlan({task,target:'unity',manifest,presetCatalog:{version:1,presets:[]}});
  const roblox=buildVibeAssetProductionPlan({task,target:'roblox',manifest,presetCatalog:{version:1,presets:[]}});
  const unityReuse=unity.decisions.flatMap(row=>row.reuseCandidates.map(asset=>asset.id));
  const robloxReuse=roblox.decisions.flatMap(row=>row.reuseCandidates.map(asset=>asset.id));
  assert.equal(unityReuse.includes('web-tree'),false);
  assert.equal(robloxReuse.includes('web-tree'),false);
  assert.equal(unityReuse.includes('unity-ui'),true);
  assert.equal(robloxReuse.includes('unity-ui'),false);
  assert.equal(robloxReuse.includes('roblox-fx'),true);
  assert.equal(unityReuse.includes('roblox-fx'),false);
  assert.equal(unity.capabilities.canChooseDirectAuthoring,true);
  assert.equal(roblox.capabilities.canChooseDirectAuthoring,true);
  assert.ok(unity.decisions.some(row=>row.directAuthoring.includes('csharp-procedural-mesh-and-low-poly-model')));
  assert.ok(roblox.decisions.some(row=>row.directAuthoring.includes('luau-composed-low-poly-model')));
  assert.equal(unity.policy.crossPlatformWebAssetDirectReuseForbidden,true);
  assert.equal(roblox.policy.nativeReuseRequiresTargetCompatibility,true);
});

test('native presentation pass exists only for the central first-adoption game',()=>{
  const root=tempRoot();
  try{
    const fantasyUnity=path.join(root,'unity-games','fantasy-survival','Assets','Scripts');
    const otherUnity=path.join(root,'unity-games','other-game','Assets','Scripts');
    fs.mkdirSync(fantasyUnity,{recursive:true});
    fs.mkdirSync(otherUnity,{recursive:true});
    fs.writeFileSync(path.join(fantasyUnity,'PrototypeAnimatedVisuals.cs'),'using UnityEngine; public class PrototypeAnimatedVisuals:MonoBehaviour { void Update(){} }\n');
    fs.writeFileSync(path.join(otherUnity,'PrototypeAnimatedVisuals.cs'),'using UnityEngine; public class PrototypeAnimatedVisuals:MonoBehaviour { void Update(){} }\n');
    const fantasy=findPresentationQualityTask({
      gameId:'fantasy-survival',engine:'unity',releaseState:'development-confirmed',
      projectPath:'unity-games/fantasy-survival',source:'company-status'
    },root,{tasks:[]});
    const other=findPresentationQualityTask({
      gameId:'other-game',engine:'unity',releaseState:'development-confirmed',
      projectPath:'unity-games/other-game',source:'company-status'
    },root,{tasks:[]});
    assert.ok(fantasy);
    assert.equal(fantasy.atomicPresentationTask,true);
    assert.match(fantasy.id,/^fantasy-survival-unity-presentation-atomic-[a-z0-9]+-v2$/);
    assert.equal(fantasy.priority,'owner-immediate');
    assert.ok(fantasy.evidence.includes('presentation-execution:ATOMIC_FAN_OUT'));
    assert.ok(fantasy.evidence.includes('presentation-legacy-serial-chain:REMOVED'));
    assert.equal(other,null);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});


test('native presentation files fan out atomically when responsibilities are disjoint',()=>{
  const root=tempRoot();
  try{
    const scripts=path.join(root,'unity-games','fantasy-survival','Assets','Scripts');
    fs.mkdirSync(path.join(scripts,'UI'),{recursive:true});
    fs.mkdirSync(path.join(scripts,'Vfx'),{recursive:true});
    fs.mkdirSync(path.join(scripts,'Camera'),{recursive:true});
    fs.writeFileSync(path.join(scripts,'PrototypeAnimatedVisuals.cs'),'using UnityEngine; public class PrototypeAnimatedVisuals:MonoBehaviour { void Update(){ transform.localScale=Vector3.one; } }\n');
    fs.writeFileSync(path.join(scripts,'UI','HudView.cs'),'using UnityEngine; public class HudView:MonoBehaviour { }\n');
    fs.writeFileSync(path.join(scripts,'Vfx','HitEffect.cs'),'using UnityEngine; public class HitEffect:MonoBehaviour { ParticleSystem fx; }\n');
    fs.writeFileSync(path.join(scripts,'Camera','CameraRig.cs'),'using UnityEngine; public class CameraRig:MonoBehaviour { Camera cam; }\n');
    const tasks=findPresentationQualityTasks({
      gameId:'fantasy-survival',engine:'unity',releaseState:'development-confirmed',
      projectPath:'unity-games/fantasy-survival',source:'company-status'
    },root,{tasks:[]});
    assert.ok(tasks.length>=4);
    assert.ok(tasks.every(row=>row.atomicPresentationTask===true));
    assert.equal(new Set(tasks.map(row=>row.responsibleFiles[0])).size,tasks.length);
    assert.ok(tasks.some(row=>row.evidence.includes('presentation-pass:VFX')));
    assert.ok(tasks.some(row=>row.evidence.includes('presentation-pass:CAMERA_LANGUAGE')));
    assert.ok(tasks.some(row=>row.evidence.includes('presentation-pass:UI_ART')));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('fantasy-survival development-confirmed Unity can receive P0 weather work only through owner-authorized company status',()=>{
  const root=tempRoot();
  try{
    const scripts=path.join(root,'unity-games','fantasy-survival','Assets','Scripts');
    fs.mkdirSync(scripts,{recursive:true});
    fs.writeFileSync(path.join(scripts,'PrototypeAnimatedVisuals.cs'),'using UnityEngine; public class PrototypeAnimatedVisuals:MonoBehaviour { void Update(){} }\n');
    const result=planVibe2AutonomousTasks({
      status:{projects:[{
        gameId:'fantasy-survival',name:'마력숲 생존기',ownerDecision:'PASS',
        target:'unity',selectedPlatform:'unity-android',projectPath:'unity-games/fantasy-survival',progress:20
      }]},
      catalog:{games:[{
        id:'fantasy-survival',name:'마력숲 생존기',
        productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'
      }]},
      developmentQueue:{items:[]},
      queue:{maxConcurrentTasks:4,tasks:[]},
      repoRoot:root,maxConcurrentTasks:4,planningBacklogTarget:4
    });
    assert.equal(result.planned,true);
    const weather=result.tasks.find(row=>row.id==='fantasy-survival-unity-weather-presentation-v1');
    assert.ok(weather);
    assert.equal(weather.priority,'owner-immediate');
    assert.equal(weather.weatherPresentationLane,true);
    assert.ok(weather.evidence.includes('weather-presentation:v1'));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('development-confirmed Unity remains non-autonomous for non-pilot games',()=>{
  const root=tempRoot();
  try{
    const scripts=path.join(root,'unity-games','other-game','Assets','Scripts');
    fs.mkdirSync(scripts,{recursive:true});
    fs.writeFileSync(path.join(scripts,'PrototypeAnimatedVisuals.cs'),'using UnityEngine; public class PrototypeAnimatedVisuals:MonoBehaviour { void Update(){} }\n');
    const result=planVibe2AutonomousTasks({
      status:{projects:[{
        gameId:'other-game',name:'Other',ownerDecision:'PASS',
        target:'unity',selectedPlatform:'unity-android',projectPath:'unity-games/other-game',progress:20
      }]},
      catalog:{games:[{id:'other-game',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'}]},
      queue:{maxConcurrentTasks:4,tasks:[]},repoRoot:root,maxConcurrentTasks:4
    });
    assert.equal(result.planned,false);
    assert.equal(result.reason,'NO_CONFIRMED_PRODUCTION_PROJECT');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('web weather marker prevents duplicate weather task creation',()=>{
  const root=tempRoot();
  try{
    const gameRoot=path.join(root,'web-games','fantasy-survival');
    fs.mkdirSync(gameRoot,{recursive:true});
    fs.writeFileSync(path.join(gameRoot,'index.html'),'<script>const WEATHER_PRESENTATION_VERSION=1;</script>\n');
    const task=findWeatherPresentationTask({
      gameId:'fantasy-survival',engine:'web',releaseState:'development-confirmed',
      projectPath:'web-games/fantasy-survival',source:'company-development-queue'
    },root,{tasks:[]});
    assert.equal(task,null);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('weather incremental QA requires real Web weather implementation signals',()=>{
  const root=tempRoot();
  try{
    const gameRoot=path.join(root,'web-games','fantasy-survival');
    fs.mkdirSync(gameRoot,{recursive:true});
    const source=`<!doctype html><canvas id="game"></canvas><script>
const WEATHER_PRESENTATION_VERSION=1;
const WEATHER_STATES=['CLEAR','RAIN','FOG','SNOW','STORM'];
const state={weather:{kind:'CLEAR'}};
function setWeather(kind){state.weather.kind=kind}
function nextWeather(){return WEATHER_STATES[1]}
function weatherParticleBudget(){return navigator.deviceMemory<=2?.45:1}
function drawWeatherOverlay(){const c=document.getElementById('game').getContext('2d');c.fillRect(0,0,10,10)}
function serializeWorld(){return {weather:state.weather}}
function applyWorldSnapshot(w){if(w.weather)setWeather(w.weather.kind)}
</script>`;
    fs.writeFileSync(path.join(gameRoot,'index.html'),source);
    const manifestPath=path.join(root,'manifest.json');
    fs.writeFileSync(manifestPath,JSON.stringify({
      target:'web',
      changedFiles:['web-games/fantasy-survival/index.html'],
      weatherPresentation:{
        required:true,target:'web',
        runtimeChecks:['weather-state-transitions','multiplayer-weather-sync']
      }
    },null,2));
    const result=runIncrementalQa({
      root,manifest:manifestPath,
      files:['web-games/fantasy-survival/index.html'],
      namespace:'weather-test',force:true
    });
    assert.equal(result.outcome,'PASS');
    assert.equal(result.weatherPresentationQa.status,'STATIC_PASS');
    assert.equal(result.weatherPresentationQa.runtimeStillRequired,true);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});


test('central graphics contract forbids the legacy serial presentation chain',()=>{
  const roadmap=JSON.parse(fs.readFileSync(new URL('../company-learning/platform-release-roadmap.json',import.meta.url),'utf8'));
  const contract=roadmap.assetProductionParallelContract;
  assert.equal(contract.version,3);
  assert.equal(contract.atomicPresentationExecution.enabled,true);
  assert.equal(contract.atomicPresentationExecution.legacySerialStageChain,false);
  assert.equal(contract.atomicPresentationExecution.legacyStageOrderExecutionForbidden,true);
  assert.equal(contract.parallelism.differentResponsibleFilesMayFanOutImmediately,true);
  assert.equal(contract.parallelism.monolithicPresentationFileMustBeOneAtomicTaskNotRepeatedSerialPasses,true);
  assert.equal(contract.parallelism.globalPresentationWaveBarrierForbidden,true);
  assert.ok(contract.workflow.includes('MICRO_FAN_IN_EACH_ATOMIC_PRESENTATION_TASK_IMMEDIATELY'));
  assert.equal(contract.workflow.includes('RUN_GAMEPLAY_CODE_AND_ASSET_PRODUCTION_IN_PARALLEL'),false);

  const runtime=JSON.parse(fs.readFileSync(new URL('../vibe2-runtime.json',import.meta.url),'utf8'));
  assert.equal(runtime.continuous.atomicNeuronStream.presentationAtomicFanOut.enabled,true);
  assert.equal(runtime.continuous.atomicNeuronStream.presentationAtomicFanOut.legacySerialStageChain,false);

  const planner=fs.readFileSync(new URL('../tools/vibe2-auto-planner.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(planner,/function presentationStagesForProject/);
  assert.match(planner,/findPresentationQualityTasks/);
  assert.match(planner,/PRESENTATION_ATOMIC:/);
  assert.match(planner,/PRESENTATION_FANIN:POLISH_MOBILE/);
});
