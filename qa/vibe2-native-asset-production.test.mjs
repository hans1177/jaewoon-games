import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {assetProductionGuidance,buildVibeAssetProductionPlan,discoverExistingRobloxGameAssets} from '../tools/vibe2-asset-production-plan.mjs';
import {findPresentationQualityTask,findWeatherPresentationTask,planVibe2AutonomousTasks} from '../tools/vibe2-auto-planner.mjs';
import {runIncrementalQa} from '../tools/vibe2-incremental-qa.mjs';

function writePolicy(root,{pilot='fantasy-survival'}={}){
  fs.mkdirSync(path.join(root,'company-learning'),{recursive:true});
  fs.writeFileSync(path.join(root,'company-learning','platform-release-roadmap.json'),JSON.stringify({
    version:209,
    authority:'MACHINE_EXECUTION_CONTRACT',
    machineSourceOfTruth:'company-learning/platform-release-roadmap.json',
    humanDocumentRequired:false,
    assetProductionParallelContract:{
      version:2,enabled:true,
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


test('Roblox planner reuses source-bound same-game assets before cross-game library candidates',()=>{
  const root=tempRoot();
  try{
    const server=path.join(root,'roblox-games','demo','server');
    const shared=path.join(root,'roblox-games','demo','shared');
    fs.mkdirSync(server,{recursive:true});
    fs.mkdirSync(shared,{recursive:true});
    fs.writeFileSync(path.join(server,'Game.server.luau'),[
      'local ASSETS={Nature=6933438443,City=6933556508,Dungeon=6934021345,StonePortal=12931228293}',
      'local function loadAsset(id) return AssetService:LoadAssetAsync(id) end'
    ].join('\\n'));
    fs.writeFileSync(path.join(shared,'GameConfig.luau'),'return { Audio={Battle="rbxassetid://1837821768"} }\\n');
    const discovered=discoverExistingRobloxGameAssets({repoRoot:root,gameId:'demo'});
    assert.ok(discovered.some(row=>row.robloxAssetId==='6933438443'&&row.sameGameExistingRoblox===true));
    assert.ok(discovered.some(row=>row.robloxAssetId==='1837821768'&&row.types.includes('audio')));
    assert.equal(discovered.every(row=>row.verifiedCompanyReusable===false),true);

    const plan=buildVibeAssetProductionPlan({
      task:{gameId:'demo',goal:'Nature background Battle audio improvement'},target:'roblox',repoRoot:root,
      manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}
    });
    assert.ok(plan.summary.discoveredSameGameRobloxAssets>=4);
    assert.ok(plan.summary.sameGameRobloxCandidateTypes>0);
    assert.ok(plan.decisions.some(row=>row.sameGameCandidates.some(asset=>asset.robloxAssetId==='6933438443')));
    assert.ok(plan.decisions.some(row=>row.decisionOrder[0]==='REUSE_SAME_GAME_EXISTING_ROBLOX_ASSET'));
    assert.equal(plan.policy.sameGameRobloxAssetIsCandidateOnlyUntilRuntimeVerified,true);
    assert.equal(plan.policy.unverifiedSameGameRobloxAssetDoesNotOutrankVerifiedCompanyAsset,true);
    const guidance=assetProductionGuidance(plan);
    assert.match(guidance,/REUSE_SAME_GAME_EXISTING_ROBLOX_ASSET/);
    assert.match(guidance,/6933438443/);

    fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({
      version:1,
      assets:[{id:'verified-company-nature',category:'ENVIRONMENT',status:'VERIFIED_COMPANY_ASSET',verifiedCompanyReusable:true,path:'roblox-games/shared/nature.luau',types:['background'],tags:['Nature','background'],platforms:['roblox'],license:'company-owned'}]
    },null,2));
    const withCompany=buildVibeAssetProductionPlan({
      task:{gameId:'demo',goal:'Nature background improvement'},target:'roblox',repoRoot:root,
      manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}
    });
    const background=withCompany.decisions.find(row=>row.type==='background');
    assert.ok(background);
    assert.equal(background.decisionOrder[0],'REUSE_VERIFIED_COMPANY_ASSET');
    assert.equal(background.reuseCandidates[0].id,'verified-company-nature');

    const other=buildVibeAssetProductionPlan({
      task:{gameId:'other-game',goal:'자연 환경 배경 개선'},target:'roblox',repoRoot:root,
      manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}
    });
    assert.equal(other.summary.discoveredSameGameRobloxAssets,0);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('native asset plan prefers verified company library then repository then external gap fill',()=>{
  const root=tempRoot();
  try{
    fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({
      version:1,
      assets:[{
        id:'company-ui',category:'UI',status:'VERIFIED_COMPANY_ASSET',verifiedCompanyReusable:true,
        path:'unity-games/shared/ui/company.png',license:'company-owned',platforms:['unity']
      }],
      externalSources:[{id:'external-source'}]
    },null,2));
    const manifest={version:1,assets:[
      {id:'repo-ui',path:'unity-games/demo/Assets/UI/repo.png',types:['ui'],tags:['UI'],license:'project-original'},
      {id:'external-ui',path:'',types:['ui'],tags:['UI'],license:'CC0',source:'KayKit',sourceUrl:'https://example.invalid/ui',downloaded:false,platforms:['unity']}
    ]};
    const plan=buildVibeAssetProductionPlan({
      task:{gameId:'demo',goal:'UI 그래픽 개선'},target:'unity',repoRoot:root,
      manifest,presetCatalog:{version:1,presets:[]}
    });
    const row=plan.decisions.find(item=>item.type==='ui');
    assert.ok(row);
    assert.deepEqual(row.companyCandidates.map(item=>item.id),['company-ui']);
    assert.deepEqual(row.repositoryCandidates.map(item=>item.id),['repo-ui']);
    assert.deepEqual(row.externalCandidates.map(item=>item.id),['external-ui']);
    assert.deepEqual(row.reuseCandidates.map(item=>item.id),['company-ui','repo-ui']);
    assert.deepEqual(row.decisionOrder.slice(0,3),[
      'REUSE_VERIFIED_COMPANY_ASSET',
      'REUSE_LICENSE_VERIFIED_EXISTING_REPOSITORY_ASSET',
      'ACQUIRE_LICENSE_VERIFIED_EXTERNAL_ASSET'
    ]);
    assert.equal(plan.summary.companyCandidateTypes>0,true);
    assert.equal(plan.summary.externalCandidateTypes>0,true);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('native presentation pass is available to every confirmed project while the first adoption keeps owner priority',()=>{
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
    assert.equal(fantasy.id,'fantasy-survival-unity-presentation-asset-adaptation-v1');
    assert.equal(fantasy.priority,'owner-immediate');
    assert.ok(other);
    assert.equal(other.id,'other-game-unity-presentation-asset-adaptation-v1');
    assert.equal(other.priority,'normal');
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

test('development-confirmed Unity non-pilot receives presentation work without inheriting pilot weather scope',()=>{
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
      catalog:{games:[{id:'other-game',name:'Other',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'}]},
      developmentQueue:{items:[]},
      queue:{maxConcurrentTasks:4,tasks:[]},repoRoot:root,maxConcurrentTasks:4,planningBacklogTarget:4
    });
    assert.equal(result.planned,true);
    assert.ok(result.tasks.some(row=>row.id==='other-game-unity-presentation-asset-adaptation-v1'));
    assert.equal(result.tasks.some(row=>row.id==='other-game-unity-weather-presentation-v1'),false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('native asset adaptation rejects a single primitive character placeholder',()=>{
  const root=tempRoot();
  try{
    const relative='unity-games/other-game/Assets/Scripts/PrototypeAnimatedVisuals.cs';
    const file=path.join(root,...relative.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,`using UnityEngine;
public class PrototypeAnimatedVisuals:MonoBehaviour {
  void Build(){
    var actor=GameObject.CreatePrimitive(PrimitiveType.Capsule);
    actor.GetComponent<Renderer>().material.color=Color.red;
  }
}
`);
    const manifestPath=path.join(root,'manifest-native-placeholder.json');
    fs.writeFileSync(manifestPath,JSON.stringify({
      target:'unity',
      changedFiles:[relative],
      presentationQuality:{required:true,target:'unity',pass:'ASSET_ADAPTATION'}
    },null,2));
    assert.throws(()=>runIncrementalQa({
      root,manifest:manifestPath,files:[relative],namespace:'native-placeholder',force:true
    }),/PRESENTATION_STATIC_QA_FAILED:ASSET_ADAPTATION:.*(?:NATIVE_COMPOSITE_FORM|GAME_VISUAL_IDENTITY_DOMAINS|NO_SINGLE_PRIMITIVE_PLACEHOLDER)/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('native asset adaptation accepts composed character weapon environment and style identity',()=>{
  const root=tempRoot();
  try{
    const relative='unity-games/other-game/Assets/Scripts/PrototypeAnimatedVisuals.cs';
    const file=path.join(root,...relative.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,`using UnityEngine;
public class PrototypeAnimatedVisuals:MonoBehaviour {
  void Build(){
    var body=GameObject.CreatePrimitive(PrimitiveType.Capsule);
    var head=GameObject.CreatePrimitive(PrimitiveType.Sphere);
    head.transform.SetParent(body.transform);
    var weapon=new GameObject("weapon sword blade");
    weapon.AddComponent<MeshFilter>();
    var weaponRenderer=weapon.AddComponent<MeshRenderer>();
    weaponRenderer.material=new Material(Shader.Find("Standard"));
    weaponRenderer.material.color=new Color(0.3f,0.7f,0.5f);
    var environment=GameObject.CreatePrimitive(PrimitiveType.Cube);
    environment.name="forest ground tree biome";
    environment.transform.localScale=new Vector3(4,1,4);
  }
}
`);
    const manifestPath=path.join(root,'manifest-native-composed.json');
    fs.writeFileSync(manifestPath,JSON.stringify({
      target:'unity',
      changedFiles:[relative],
      presentationQuality:{required:true,target:'unity',pass:'ASSET_ADAPTATION'}
    },null,2));
    const result=runIncrementalQa({
      root,manifest:manifestPath,files:[relative],namespace:'native-composed',force:true
    });
    assert.equal(result.outcome,'PASS');
    assert.equal(result.presentationQa.status,'STATIC_PASS');
    assert.ok(result.presentationQa.checks.some(row=>row.name==='NATIVE_COMPOSITE_FORM'&&row.pass));
    assert.ok(result.presentationQa.checks.some(row=>row.name==='GAME_VISUAL_IDENTITY_DOMAINS'&&row.pass));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('native living motion rejects generic movement without actor secondary motion',()=>{
  const root=tempRoot();
  try{
    const relative='unity-games/other-game/Assets/Scripts/PrototypeAnimatedVisuals.cs';
    const file=path.join(root,...relative.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,`using UnityEngine;
public class PrototypeAnimatedVisuals:MonoBehaviour {
  Transform actor;
  float speed;
  void Update(){
    var idle=speed<0.1f;
    var walk=speed>=0.1f;
    actor.localPosition=Vector3.Lerp(actor.localPosition,Vector3.zero,Time.deltaTime);
  }
}
`);
    const manifestPath=path.join(root,'manifest-native-motion.json');
    fs.writeFileSync(manifestPath,JSON.stringify({
      target:'unity',
      changedFiles:[relative],
      presentationQuality:{required:true,target:'unity',pass:'LIVING_MOTION'}
    },null,2));
    assert.throws(()=>runIncrementalQa({
      root,manifest:manifestPath,files:[relative],namespace:'native-motion',force:true
    }),/PRESENTATION_STATIC_QA_FAILED:LIVING_MOTION:.*SECONDARY_MOTION_SIGNAL/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('web asset adaptation rejects primitive-only gameplay art',()=>{
  const root=tempRoot();
  try{
    const relative='web-games/other-game/index.html';
    const file=path.join(root,...relative.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,`<!doctype html><canvas id="game"></canvas><script>
const ctx=document.getElementById('game').getContext('2d');
function render(){
  ctx.fillStyle='#484';
  ctx.fillRect(0,0,320,180);
  ctx.fillStyle='#fff';
  ctx.fillRect(120,80,20,30); // player placeholder
  ctx.fillStyle='#f00';
  ctx.fillRect(200,80,24,24); // monster placeholder
}
render();
</script>`);
    const manifestPath=path.join(root,'manifest-web-placeholder.json');
    fs.writeFileSync(manifestPath,JSON.stringify({
      target:'web',
      changedFiles:[relative],
      presentationQuality:{required:true,target:'web',pass:'ASSET_ADAPTATION'}
    },null,2));
    assert.throws(()=>runIncrementalQa({
      root,manifest:manifestPath,files:[relative],namespace:'web-placeholder',force:true
    }),/PRESENTATION_STATIC_QA_FAILED:ASSET_ADAPTATION:.*WEB_REAL_ASSET_BINDING/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('web asset adaptation accepts real themed actor equipment environment assets',()=>{
  const root=tempRoot();
  try{
    const relative='web-games/other-game/index.html';
    const file=path.join(root,...relative.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,`<!doctype html><style>
:root{--theme-shadow:#18221c;--theme-accent:#9fd88f}
#game{background-image:url("./assets/background-forest.webp")}
</style><canvas id="game"></canvas><img id="hero" src="./assets/character-hero.webp"><script>
const ctx=document.getElementById('game').getContext('2d');
const player=new Image(); player.src='./assets/character-hero.webp';
const weapon=new Image(); weapon.src='./assets/weapon-sword.webp';
const monster=new Image(); monster.src='./assets/enemy-wolf.webp';
const environment=new Image(); environment.src='./assets/background-forest.webp';
function render(){
  ctx.drawImage(environment,0,0,320,180);
  ctx.drawImage(player,100,80);
  ctx.drawImage(weapon,118,88);
  ctx.drawImage(monster,220,80);
}
render();
</script>`);
    const manifestPath=path.join(root,'manifest-web-themed.json');
    fs.writeFileSync(manifestPath,JSON.stringify({
      target:'web',
      changedFiles:[relative],
      presentationQuality:{required:true,target:'web',pass:'ASSET_ADAPTATION'}
    },null,2));
    const result=runIncrementalQa({
      root,manifest:manifestPath,files:[relative],namespace:'web-themed',force:true
    });
    assert.equal(result.outcome,'PASS');
    assert.ok(result.presentationQa.checks.some(row=>row.name==='WEB_REAL_ASSET_BINDING'&&row.pass));
    assert.ok(result.presentationQa.checks.some(row=>row.name==='WEB_GAME_VISUAL_IDENTITY_DOMAINS'&&row.pass));
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
