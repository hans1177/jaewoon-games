// 파일명: qa/company-unity-web-first-stage.test.mjs

// 검증 · 실제 마력숲 C#에 사용되는 애니메이션·입자 모듈이 WebGL 네이티브 프로젝트에 선언돼야 한다.
test('Fantasy Survival WebGL native animation and skill particles must resolve from the canonical Unity manifest',()=>{
  const manifest=JSON.parse(fs.readFileSync('unity-games/fantasy-survival/Packages/manifest.json','utf8'));
  const source=fs.readFileSync('unity-games/fantasy-survival/Assets/Scripts/UnityWebFloorGame.cs','utf8');
  const buildRequest=JSON.parse(fs.readFileSync('.build-requests/unity-web/fantasy-survival.json','utf8'));
  assert.match(source,/\bAnimation\b/,'real skinned character clips use the native animation module');
  assert.match(source,/\bParticleSystem\b/,'real skill and biome visual effects use the native particle module');
  for(const module of ['animation','particlesystem']){
    assert.equal(manifest.dependencies['com.unity.modules.'+module],'1.0.0','required Unity WebGL module '+module);
  }
  assert.equal(buildRequest.gameId,'fantasy-survival');
  assert.equal(buildRequest.fullGameplayPassAuthority,false);
  assert.equal(buildRequest.productionVerified,false);
  assert.equal(buildRequest.releaseAuthority,false);
});


import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const repo=process.cwd();
const tool=path.join(repo,'tools/company-unity-web-first-stage.mjs');
test('held Unity Web and Android jobs consult current main and skip heavy builds without repair dispatch',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'unity-owner-hold-'));
  try{
    fs.mkdirSync(path.join(root,'company-learning'),{recursive:true});
    for(const [file,platform,job] of [
      ['unity-web-first-stage-build.yml','UNITY_WEB','build'],
      ['unity-web-floor-source-bootstrap.yml','UNITY_WEB','bootstrap'],
      ['unity-cloud-android-test.yml','UNITY_ANDROID','build']
    ]){
      const workflow=fs.readFileSync(path.join(repo,'.github/workflows',file),'utf8');
      const gate=workflow.split('  owner-policy:\n')[1].split('\n  '+job+':')[0];
      assert.match(gate,/ref: main/);
      assert.match(workflow,new RegExp('  '+job+':\\n    needs: owner-policy\\n    if: needs\\.owner-policy\\.outputs\\.allowed'));
      const script=gate.match(/node --input-type=module <<'NODE'\n([\s\S]*?)\n          NODE/)[1].replace(/^          /gm,'');
      for(const allowed of [false,true]){
        fs.writeFileSync(path.join(root,'company-learning/platform-release-roadmap.json'),JSON.stringify({developmentAccess:{[platform]:allowed?'ALWAYS_ALLOWED':'OWNER_HOLD'}}));
        const output=path.join(root,'output');fs.writeFileSync(output,'');
        execFileSync(process.execPath,['--input-type=module','--eval',script],{cwd:root,env:{...process.env,GITHUB_OUTPUT:output}});
        assert.equal(fs.readFileSync(output,'utf8'),'allowed='+allowed+'\n');
      }
    }
    fs.writeFileSync(path.join(root,'company-learning/platform-release-roadmap.json'),JSON.stringify({developmentAccess:{UNITY_WEB:'OWNER_HOLD'}}));
    assert.throws(()=>execFileSync(process.execPath,[tool,'--game-id=hold-probe'],{cwd:root,stdio:'pipe'}),/UNITY_WEB_OWNER_HOLD/);
    assert.equal(fs.existsSync(path.join(root,'.build-requests')),false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
function enableFixtureWeb(root){
  const file=path.join(root,'company-learning/platform-release-roadmap.json');
  const policy=JSON.parse(fs.readFileSync(file,'utf8'));
  policy.unityWebFirstStage.enabled=true;policy.developmentAccess.UNITY_WEB='ALWAYS_ALLOWED';
  fs.writeFileSync(file,JSON.stringify(policy));
}


// 변환 · 실제 공유 모델의 금속/비금속과 모션 곡선은 엔진 임포트에서 검증한다.
test('Fantasy Survival native importer retains authored PBR and validates animation interpolation in Unity',()=>{
  const importer=fs.readFileSync('unity-games/fantasy-survival/Assets/Editor/UnityCompanyAssets.cs','utf8');
  const bytes=fs.readFileSync('unity-games/fantasy-survival/Assets/Editor/MagicForestGuardian.bytes');
  const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString('utf8'));
  assert.ok(doc.materials.some(row=>row.pbrMetallicRoughness.metallicFactor>.4));
  assert.ok(doc.materials.some(row=>row.pbrMetallicRoughness.metallicFactor===0));
  assert.ok(new Set(doc.materials.map(row=>row.pbrMetallicRoughness.roughnessFactor)).size>1);
  assert.match(importer,/mat\.SetFloat\("_Metallic", metallic\)/);
  assert.match(importer,/mat\.SetFloat\(smoothnessProperty, 1f - roughness\)/);
  assert.match(importer,/GraphicsSettings\.currentRenderPipeline/);
  assert.match(importer,/UNITY_COMPANY_PBR_CONVERSION_LOSS/);
  assert.doesNotMatch(importer,/Shader\.Find\("Unlit\/Color"\)/);
  assert.match(importer,/AnimationUtility\.TangentMode\.Constant/);
  assert.match(importer,/AnimationUtility\.TangentMode\.Linear/);
  assert.match(importer,/curves\[k\]\.Evaluate\(sampleTime\)/);
  assert.match(importer,/UNITY_COMPANY_ACTION_INTERPOLATION_LOSS/);
  assert.match(importer,/scaled \? "localScale\."/);
});

// 파일명: qa/company-unity-web-first-stage.test.mjs
// 그래픽 · 실제 회사 3D OBJ 파생본이 Unity 프로젝트 리소스와 기존 게임 소비자까지 이어지는지 검사한다.
// 마력숲 웹 · 공용 3D 자산/오토 바이옴/캐릭터/스킬 모션은 기존 유니티 게임 소스 안에서만 바인딩한다.
test('Fantasy Survival Unity Web validates imported skinned action assets instead of inactive prefab AnimationState enumeration',()=>{
  const build=fs.readFileSync('unity-games/fantasy-survival/Assets/Editor/UnityWebFloorBuild.cs','utf8');
  const importer=fs.readFileSync('unity-games/fantasy-survival/Assets/Editor/UnityCompanyAssets.cs','utf8');
  assert.match(build,/UnityCompanyAssets\.Prepare\(\)/);
  assert.match(build,/AssetDatabase\.FindAssets\("t:AnimationClip"/);
  assert.match(build,/clipPath\.StartsWith\(clipPrefix,StringComparison\.Ordinal\)/);
  assert.match(build,/clip!=null && clip\.legacy && !clip\.empty/);
  assert.doesNotMatch(build,/foreach\(AnimationState state in actor\.GetComponent<Animation>\(\)\)/);
  assert.match(build,/UNITY_COMPANY_GUARDIAN_ACTION_CLIP_MISSING/);
  assert.match(build,/if\(clipCount<5\)throw new Exception\("UNITY_COMPANY_ACTOR_ACTION_COVERAGE_MISSING:/);
  assert.match(importer,/var clip = new AnimationClip \{ name = source\.name, legacy = true/);
  assert.match(importer,/AssetDatabase\.CreateAsset\(clip, clipPath\)/);
});

test('Fantasy Survival Web native 3D auto biome and real skill motion remain cosmetic-only',()=>{
  const game=fs.readFileSync('unity-games/fantasy-survival/Assets/Scripts/UnityWebFloorGame.cs','utf8');
  const build=fs.readFileSync('unity-games/fantasy-survival/Assets/Editor/UnityWebFloorBuild.cs','utf8');
  const registered=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
  const village=registered.assets.filter(row=>row.id?.startsWith('external-tinytreats-'));
  assert.equal(village.length,32,'acquired shared 3D models must remain available');
  assert.match(build,/ImportSharedVillageModels\(\)/,'same Unity web build must import real shared meshes');
  assert.match(build,/MAGIC_FOREST_SHARED_SOURCE_HASH_MISMATCH/,'source hashes are checked');
  assert.match(game,/MAGIC_FOREST_AUTOBIOME=FIVE_NATIVE_3D_REGIONS/,'five true native 3D biomes are built');
  assert.match(game,/surface\.AddComponent<MeshFilter>\(\)\.sharedMesh=mesh/,'3D ground surfaces have real mesh data');
  assert.match(game,/string\[\] biomeNames=\{"ROCK_CANYON","LAKE_SHORE","MAGIC_FOREST","SNOWFIELD","SAND_WASTELAND"\}/);
  assert.match(game,/BindCompanyVisual\("MagicForestGuardian"/,'player uses the 3D guardian skinned model');
  assert.match(game,/monster\.nativeMotion=rigVisual\.GetComponent<Animation>\(\)/,'monsters use native rig action clips');
  assert.match(game,/ParticleSystemStopAction\.Destroy/,'skill hit particles have bounded lifetimes');
  assert.match(game,/trail\.time=\.30f/,'homing projectiles have visible 3D motion trails');
  assert.match(game,/StyleHomingProjectile\(sphere,sand\)/,'spell VFX is applied to the actual projectile');
  assert.match(game,/target\.hp=Mathf\.Max\(0f,target\.hp-Mathf\.Max\(0f,damage\)\)/,'existing damage logic unchanged');
  assert.match(game,/private const string SavePrefix = "fantasy_survival_webfloor_"/,'save namespace remains stable');
});

// 캐릭터 · 실제 공용 GLB 본·애니메이션과 교체된 Unity 3D 플레이어 생성 경로 검증.
test('Fantasy Survival replaces primitive avatar with actual guardian native skinned rig',()=>{
  const game=fs.readFileSync('unity-games/fantasy-survival/Assets/Scripts/UnityWebFloorGame.cs','utf8');
  const importer=fs.readFileSync('unity-games/fantasy-survival/Assets/Editor/UnityCompanyAssets.cs','utf8');
  const build=fs.readFileSync('unity-games/fantasy-survival/Assets/Editor/UnityWebFloorBuild.cs','utf8');
  const glb=fs.readFileSync('unity-games/fantasy-survival/Assets/Editor/MagicForestGuardian.bytes');
  assert.equal(glb.toString('ascii',0,4),'glTF','character source must be native 3D GLB');
  assert.equal(glb.readUInt32LE(4),2,'native character GLB version required');
  const jsonLength=glb.readUInt32LE(12);
  const model=JSON.parse(glb.subarray(20,20+jsonLength).toString('utf8'));
  assert.ok(model.meshes?.[0]?.primitives?.length>=1,'character must have real mesh');
  assert.ok(model.skins?.[0]?.joints?.length>=3,'character must have a real bone rig');
  assert.ok(model.nodes?.some(node=>node.name==='WeaponGrip'),'existing weapon attaches to the model');
  for(const clip of ['IDLE_BREATH','RUN','ATTACK_LIGHT_SLASH','ATTACK_HEAVY','HIT_FRONT','GUARDIAN_REVIVE','GUARDIAN_PARRY'])
    assert.ok(model.animations?.some(action=>action.name===clip),'missing real guardian action '+clip);
  assert.match(importer,/"Traveler", "Rogue", "Guardian"/,'original common importer must prepare real guardian prefab');
  assert.match(build,/UnityCompanyAssets\.Prepare\(\)/,'original WebGL build consumes the imported model');
  assert.match(game,/MAGIC_FOREST_PLAYER_GUARDIAN_SKIN_OR_MOTION_INVALID/,'cannot fall back to primitive actor');
  assert.match(game,/playerWeaponGrip=bone/,'weapon remains bound to actual rig');
  const actorStart=game.indexOf('GameObject character = new GameObject("Player_3D")');
  const actorEnd=game.indexOf('FollowCamera(true);',actorStart);
  assert.ok(actorStart>=0&&actorEnd>actorStart);
  const playerBlock=game.slice(actorStart,actorEnd);
  assert.match(playerBlock,/BindCompanyVisual\("MagicForestGuardian"/);
  assert.doesNotMatch(playerBlock,/CreatePart\(/,'no placeholder capsule player remains');
  assert.doesNotMatch(playerBlock,/MagicForestTraveler/,'old traveler model cannot appear as the player');
  assert.match(game,/private const string SavePrefix = "fantasy_survival_webfloor_"/,'save keys are unchanged');
});

test('Fantasy Survival reauthored company 3D tree assets reach the canonical Unity Web build and preserve harvest collision',()=>{
  const art='unity-games/fantasy-survival/Assets/Resources/CompanyAssets/';
  const sources=['tree_trunk_thick.obj','tree_crown_round.obj'].map(name=>
    fs.readFileSync('assets/roblox/survival-core-world-v1/'+name,'utf8'));
  const models=['MagicForestTrunk.obj','MagicForestCrown.obj'].map(name=>
    fs.readFileSync(art+name,'utf8'));
  const mtls=fs.readFileSync(art+'MagicForestMaterials.mtl','utf8');
  const game=fs.readFileSync('unity-games/fantasy-survival/Assets/Scripts/UnityWebFloorGame.cs','utf8');
  const build=fs.readFileSync('unity-games/fantasy-survival/Assets/Editor/UnityWebFloorBuild.cs','utf8');
  const workflow=fs.readFileSync('.github/workflows/unity-web-first-stage-build.yml','utf8');
  const manifest=JSON.parse(fs.readFileSync('unity-games/fantasy-survival/Packages/manifest.json','utf8'));
  const request=JSON.parse(fs.readFileSync('.build-requests/unity-web/fantasy-survival.json','utf8'));
  const companyRegistry=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
  const sha256=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const materialId='unity-fantasy-survival-tree-materials-v1';
  const recordedMaterial=companyRegistry.assets.find(asset=>asset.id===materialId);
  assert.ok(recordedMaterial,'native material derivative must exist in the central registry');
  assert.equal(recordedMaterial.path,'/'+art+'MagicForestMaterials.mtl');
  assert.equal(recordedMaterial.family,'MATERIAL');
  assert.equal(recordedMaterial.sourceHash,sha256('assets/roblox/survival-core-world-v1/survival-core-world.mtl'));
  assert.equal(recordedMaterial.nativeArtifactHash,sha256(art+'MagicForestMaterials.mtl'));
  assert.equal(recordedMaterial.productionVerified,false,'static source evidence cannot promote a material');
  const expectedNativeIds=['unity-fantasy-survival-tree-trunk-v1','unity-fantasy-survival-tree-crown-v1'];
  for(const [i,obj] of models.entries()){
    const row=companyRegistry.assets.find(asset=>asset.id===expectedNativeIds[i]);
    assert.ok(row,'real Unity asset derivative must be registered');
    assert.equal(row.platform,'UNITY');
    assert.equal(row.family,'ENVIRONMENT');
    assert.equal(row.status,'REPO_ASSET');
    assert.equal(row.productionVerified,false);
    assert.equal(row.nativeRuntimeVerified,false);
    assert.equal(row.consumerGameIds.length,0,'source selection alone is not verified consumer usage');
    assert.equal(row.originalSourceImmutable,true);
    const originalPath='assets/roblox/survival-core-world-v1/'+['tree_trunk_thick.obj','tree_crown_round.obj'][i];
    const nativePath=art+['MagicForestTrunk.obj','MagicForestCrown.obj'][i];
    assert.equal(row.sourceHash,sha256(originalPath));
    assert.equal(row.nativeArtifactHash,sha256(nativePath));
    assert.equal(row.platformVariants?.UNITY?.path,nativePath);
    assert.equal(row.path,'/'+nativePath);
    assert.equal(row.sourceParentPath,originalPath);
    assert.ok(row.transformHistory.some(change=>change.kind==='PLATFORM_NATIVE_Y_UP_AND_PROPORTION_ADAPT'));
    assert.notEqual(obj,sources[i],'native Unity model must be a real derivative, not a cross-platform raw copy');
    assert.match(obj,/mtllib MagicForestMaterials\.mtl/);
    assert.match(obj,/Parent Git blob [0-9a-f]{40}/);
    assert.match(obj,/project-original/);
    const vertices=obj.split('\n').filter(line=>line.startsWith('v ')).map(line=>line.trim().split(/\s+/).slice(1).map(Number));
    const faces=obj.split('\n').filter(line=>line.startsWith('f ')).map(line=>line.trim().split(/\s+/).slice(1));
    assert.ok(vertices.length>=500,'genuine 3D vertices required');
    assert.ok(faces.length>=350,'genuine geometry faces required');
    assert.ok(vertices.every(v=>v.length===3&&v.every(Number.isFinite)),'vertex coordinates finite');
    assert.ok(faces.every(face=>face.length>=3&&face.every(token=>{
      const n=Number(token.split('/')[0]);
      return Number.isInteger(n)&&n>0&&n<=vertices.length;
    })),'face indices must reference native vertices');
    const spans=[0,1,2].map(k=>Math.max(...vertices.map(v=>v[k]))-Math.min(...vertices.map(v=>v[k])));
    assert.ok(spans.every(n=>n>.3),'actual volumetric 3D depth, not flat plane');
    const sourceVertex=sources[i].split('\n').find(line=>line.startsWith('v ')).trim().split(/\s+/).slice(1).map(Number);
    const targetVertex=vertices[0];
    const nativeScale=i===0?1.035:.94;
    assert.ok(Math.abs(targetVertex[1]-sourceVertex[2]*nativeScale)<.00002,'reoriented Unity Y-up native geometry');
  }
  assert.match(mtls,/newmtl SURVIVAL_BARK/);
  assert.match(mtls,/newmtl SURVIVAL_LEAF/);
  assert.match(mtls,/0\.195 0\.48 0\.235/,'material color was actually altered');
  assert.match(game,/Resources\.Load<GameObject>\("CompanyAssets\/MagicForestTrunk"\)/);
  assert.match(game,/Resources\.Load<GameObject>\("CompanyAssets\/MagicForestCrown"\)/);
  assert.match(game,/Instantiate\(treeTrunkSource, worldRoot\.transform\)/);
  assert.match(game,/Instantiate\(treeCrownSource, worldRoot\.transform\)/);
  assert.match(game,/trunk\.GetComponent<Renderer>\(\)\.enabled = false/);
  assert.match(game,/crown\.GetComponent<Renderer>\(\)\.enabled = false/);
  assert.match(game,/Collider oldCrownCollider = crown\.GetComponent<Collider>\(\)/);
  assert.match(game,/Destroy\(oldCrownCollider\)/,'hidden canopy collider must not block resource raycast');
  assert.match(game,/trunk\.name = i % 4 == 0 \? "Rock" : "Tree"/,'existing harvest target names remain');
  assert.match(game,/if\(n!="Tree" && n!="Rock" && n!="Fiber"\)continue;/,'existing tree/rock harvesting retained and missing fiber reconnected');
  assert.match(game,/MAGIC_FOREST_NATIVE_ASSET_BINDING=.*ASSET_REPAIR_REQUIRED/,'runtime failure remains visible');
  assert.match(game,/private const string LegacyNormalSaveKey = SavePrefix \+ "world_v1"/);
  assert.match(build,/UnityWebFloorBuild/);
  assert.match(build,/BuildPipeline\.BuildPlayer\(/);
  assert.match(build,/AssetDatabase\.LoadAssetAtPath<GameObject>\(modelPath\)/);
  assert.match(build,/UNITY_WEB_NATIVE_ASSET_IMPORT_FAILED/);
  assert.match(build,/UNITY_WEB_NATIVE_ASSET_GEOMETRY_OR_MATERIAL_FAILED/);
  assert.match(workflow,/UNITY_WEB_NATIVE_ASSET_REGISTRY_VERSION_STALE/);
  assert.match(workflow,/UNITY_WEB_NATIVE_ASSET_SOURCE_PATH_INVALID/);
  assert.match(workflow,/UNITY_WEB_NATIVE_ASSET_SHA256_MISMATCH/);
  assert.match(workflow,/UNITY_WEB_NATIVE_ASSET_SOURCE_SHA256=VALIDATED_RUNTIME_UNVERIFIED/);
  assert.ok(request.registryVersionRequired<=companyRegistry.version,'stored binding may predate unrelated Roblox catalog growth');
  assert.deepEqual(request.registryAssetIds.slice(0,3),[
    'unity-fantasy-survival-tree-trunk-v1',
    'unity-fantasy-survival-tree-crown-v1',
    'unity-fantasy-survival-tree-materials-v1'
  ]);
  assert.equal(request.registryAssetIds.length,22,'expanded internal Unity asset loadout must be source registered');
  assert.match(build,/SOURCE_READY_RUNTIME_UNVERIFIED/,'import preflight cannot claim runtime QA');
  assert.match(build,/mesh\.GetIndexCount\(submesh\)/,'Editor import QA must work with unreadable meshes');
  assert.match(game,/mesh\.GetIndexCount\(submesh\)/,'WebGL runtime must use non-readable-safe mesh index metadata');
  assert.doesNotMatch(build,/mesh\.triangles\.Length/);
  assert.doesNotMatch(game,/sharedMesh\.triangles\.Length/);
  assert.equal(manifest.dependencies['com.unity.modules.physics'],'1.0.0');
  assert.equal(request.gameId,'fantasy-survival');
  assert.equal(request.projectPath,'unity-games/fantasy-survival');
  assert.equal(request.buildMethod,'UnityWebFloorBuild.BuildWeb');
  assert.equal(request.fullGameplayPassAuthority,false,'source and metadata are not runtime pass evidence');
});

// [마력숲 Vibe 회귀] 웹 원본의 섬유·제작/저장 의미를 Unity 네이티브 책임 함수에서 보존한다.

// [마력숲 기동 회귀] 원본 Unity 월드가 실제로 준비됐을 때만 부팅 표식을 기록한다.
test('Fantasy Survival bootstrap boot marker follows the actual camera/player/world readiness gate',()=>{
  const game=fs.readFileSync('unity-games/fantasy-survival/Assets/Scripts/UnityWebFloorGame.cs','utf8');
  const awake=game.slice(game.indexOf('private void Awake()'),game.indexOf('private static float ParseFloat('));
  assert.match(awake,/BuildWorld\(\);/);
  assert.match(awake,/worldRoot == null \|\| !worldRoot\.activeInHierarchy \|\| player == null/);
  assert.match(awake,/mainCamera == null \|\| !mainCamera\.isActiveAndEnabled \|\| species\.Count == 0 \|\| recipes\.Count == 0/);
  assert.match(awake,/status=REPAIR_REQUIRED reason=NATIVE_WORLD_BOOT_INCOMPLETE/);
  assert.match(awake,/throw new InvalidOperationException\("MAGIC_FOREST_NATIVE_WORLD_BOOT_INCOMPLETE"\)/);
  assert.match(awake,/JAEWOON_UNITY_WEB_QA BOOT game=.*status=PASS/);
  assert.ok(awake.indexOf('BuildWorld();')<awake.indexOf('worldRoot == null'));
  assert.ok(awake.indexOf('worldRoot == null')<awake.indexOf('status=PASS'));
  assert.match(game,/if\(material==""\)\{info="가까운 나무·돌·섬유가 없어\.";return;\}/);
});

test('Fantasy Survival Unity reconnects missing fiber harvesting and restores normal equipment and structures',()=>{
  const game=fs.readFileSync('unity-games/fantasy-survival/Assets/Scripts/UnityWebFloorGame.cs','utf8');
  const web=fs.readFileSync('web-games/fantasy-survival/index.html','utf8');
  assert.match(web,/best\.kind==='fiber'\)p\.fiber\+=amount/);
  assert.match(web,/fiber:p\.fiber/);
  assert.match(game,/CreatePart\(worldRoot\.transform,\s*PrimitiveType\.Capsule,\s*"Fiber"/);
  assert.match(game,/if\(n!="Tree" && n!="Rock" && n!="Fiber"\)continue/);
  assert.match(game,/material=n=="Tree"\?"wood":n=="Rock"\?"stone":"fiber"/);
  assert.match(game,/material=="stone"\?"돌":"섬유"/);
  // 기존 PlayerPrefs 키의 구버전 데이터도 nullable 추가 필드로 마이그레이션한다.
  assert.match(game,/private const string LegacyNormalSaveKey = SavePrefix \+ "world_v1"/);
  assert.match(game,/public int fiber;/);
  assert.match(game,/public List<string> crafted;/);
  assert.match(game,/public List<BuildingRecord> buildings;/);
  assert.match(game,/if\(old\.crafted!=null\)/);
  assert.match(game,/if\(old\.buildings!=null\)/);
  assert.match(game,/materials\["fiber"\]=Mathf\.Max\(0,old\.fiber\)/);
  assert.match(game,/fiber=materials\.ContainsKey\("fiber"\)/);
  assert.match(game,/crafted=new List<string>\(crafted\)/);
  assert.match(game,/if\(creative\)SaveCreative\(\);\s*else SaveNormalCounters\(\)/);
  assert.match(game,/if\(screenMode==ScreenMode.Playing\)\s*\{\s*if\(creative\)SaveCreative\(\);\s*else SaveNormalCounters\(\)/,
    'returning to title saves a real normal session without rewriting saves from title options');
  assert.equal((game.match(/private void PlaceStructure\(/g)||[]).length,1,'single owner handles building creation and restoration');
  assert.match(game,/PlaceStructure\(recipe\.id,player\.position/);
  assert.match(game,/PlaceStructure\(entry\.recipeId,entry\.position\)/);
  assert.match(game,/PlaceStructure\(item\.recipeId,item\.position\)/);
});

// [마력숲 저장 회귀] 채집 직후 유지하고 앱이 타이틀인 동안에는 이전 세션을 다시 저장하지 않는다.
test('Fantasy Survival saves normal gathered fiber immediately and prevents title-screen app lifecycle save overwrite',()=>{
  const game=fs.readFileSync('unity-games/fantasy-survival/Assets/Scripts/UnityWebFloorGame.cs','utf8');
  const gather=game.slice(game.indexOf('private void Gather()'),game.indexOf('private void LoadNormalCounters()'));
  assert.match(gather,/materials\[material\]\+\+;/);
  assert.match(gather,/if\(!creative\)SaveNormalCounters\(\)/);
  assert.ok(gather.indexOf('materials[material]++')<gather.indexOf('SaveNormalCounters()'));
  const lifecycle=game.slice(game.indexOf('private void OnApplicationPause('),game.indexOf('private void OnGUI()'));
  assert.match(lifecycle,/if\(!paused \|\| screenMode!=ScreenMode\.Playing\)return/);
  assert.match(lifecycle,/if\(screenMode!=ScreenMode\.Playing\)return/);
  assert.equal((lifecycle.match(/if\(creative\)SaveCreative\(\);/g)||[]).length,2);
  assert.equal((lifecycle.match(/else SaveNormalCounters\(\);/g)||[]).length,2);
});

test('Fantasy Survival mobile gather control stays separate from movement and attack on compact screens',()=>{
  const game=fs.readFileSync('unity-games/fantasy-survival/Assets/Scripts/UnityWebFloorGame.cs','utf8');
  const hud=game.slice(game.indexOf('private void OnGUI('),game.indexOf('private void DrawPanel('));
  assert.match(hud,/new Rect\(w\*\.5f-sz\*\.5f,yy-sz,sz,sz\),"채집"/);
  assert.match(hud,/GUI\.RepeatButton\(new Rect\(12\+sz\*2,yy,sz,sz\),"◀"\)/);
  assert.match(hud,/new Rect\(w-sz-14,yy-sz,sz,sz\),"공격"/);
  for(const width of [240,320,360,390,412]){
    const size=Math.max(50,Math.min(width*.16,74));
    const gatherLeft=width*.5-size*.5,gatherRight=gatherLeft+size;
    const topArrowRight=12+size,attackLeft=width-size-14;
    assert(gatherLeft>=topArrowRight,'gather must not overlap upward movement control');
    assert(gatherRight<=attackLeft,'gather must not overlap attack control');
  }
});

test('Fantasy Survival removes dead monster touch hitboxes through the existing update flow and retains Vibe repair routing',()=>{
  const game=fs.readFileSync('unity-games/fantasy-survival/Assets/Scripts/UnityWebFloorGame.cs','utf8');
  const update=game.slice(game.indexOf('private void UpdateMonsters('),game.indexOf('private void HurtMonster('));
  assert.match(update,/if\(m\.hp<=0\)/);
  assert.match(update,/monsterColliders\.Remove\(collider\)/);
  assert.ok(update.indexOf('monsterColliders.Remove(collider)')<update.indexOf('monsters.RemoveAt(i)'));
  const workflow=fs.readFileSync('.github/workflows/unity-web-first-stage-build.yml','utf8');
  assert.match(workflow,/UNITY_WEB_REPAIR_PLANNER_HANDOFF=REUSABLE_WORKFLOW/);
  assert.match(workflow,/UNITY_WEB_REPAIR_FAILURE_SIGNATURE=/);
  assert.match(workflow,/repair-vibe2:/);
});


test('Fantasy Survival Unity Web uses real shared library meshes, UI and action timing sources without changing game authority',()=>{
  const project='unity-games/fantasy-survival/Assets/';
  const game=fs.readFileSync(project+'Scripts/UnityWebFloorGame.cs','utf8');
  const editor=fs.readFileSync(project+'Editor/UnityWebFloorBuild.cs','utf8');
  const reg=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
  const request=JSON.parse(fs.readFileSync('.build-requests/unity-web/fantasy-survival.json','utf8'));
  const registryPolicy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const nativeAssets=request.registryAssetIds.map(id=>reg.assets.find(asset=>asset.id===id));
  assert.ok(nativeAssets.every(Boolean),'every requested asset is in the company registry');
  assert.equal(new Set(request.registryAssetIds).size,request.registryAssetIds.length);
  assert.ok(request.registryVersionRequired<=reg.version,'stored binding may predate unrelated Roblox catalog growth');
  assert.deepEqual([...new Set(nativeAssets.map(a=>a.family))].sort(),
    ['BUILDING','CHARACTER','CREATURE','ENVIRONMENT','MATERIAL','MOTION','PROP','UI','WEAPON']);
  for(const asset of nativeAssets){
    assert.equal(asset.platform,'UNITY');
    assert.equal(asset.originalSourceImmutable,true);
    assert.equal(asset.productionVerified,false);
    assert.equal(asset.nativeRuntimeVerified,false);
    assert.ok(asset.sourceParentPath.startsWith('assets/'));
    const relative=asset.path.replace(/^\/+/, '');
    assert.equal(asset.nativeArtifactHash,createHash('sha256').update(fs.readFileSync(relative)).digest('hex'));
    const currentParentHash=createHash('sha256').update(fs.readFileSync(asset.sourceParentPath)).digest('hex');
    if(asset.sourceHash!==currentParentHash){
      assert.equal(registryPolicy.developmentAccess.UNITY_WEB,'OWNER_HOLD');
      assert.equal(asset.productionVerified,false,'stale held derivative cannot be promoted');
    }
  }
  for(const name of ['MagicForestRock','MagicForestChest','MagicForestCrate','MagicForestWall','MagicForestDoor',
    'MagicForestFoundation','MagicForestRoof','MagicForestLamp','MagicForestRoad','MagicForestTorso','MagicForestCape',
    'MagicForestShoulder','MagicForestCanine','MagicForestClaw','MagicForestSword','MagicForestGrip']){
    assert.match(editor,new RegExp('CompanyAssets/'+name+'\\.obj'));
    const model=fs.readFileSync(project+'Resources/CompanyAssets/'+name+'.obj','utf8');
    // 자산 복구본의 실제 소재 참조와 원본 바이트를 검사한다. 주석 표기나 과거 소재 파일명에 의존하지 않는다.
    const materialFiles=[...model.matchAll(/^mtllib (MagicForest[A-Za-z]*Materials\.mtl)\s*$/gm)];
    assert.ok(materialFiles.length>0,name+' must bind a native material library');
    const materials=materialFiles.map(([,file])=>fs.readFileSync(project+'Resources/CompanyAssets/'+file,'utf8')).join('\n');
    const definedMaterials=new Set([...materials.matchAll(/^newmtl\s+(\S+)/gm)].map(([,id])=>id));
    const usedMaterials=[...model.matchAll(/^usemtl\s+(\S+)/gm)].map(([,id])=>id);
    assert.ok(usedMaterials.length>0,name+' must use actual materials');
    assert.ok(usedMaterials.every(id=>definedMaterials.has(id)),name+' material references must resolve');
    const registered=nativeAssets.find(asset=>asset.path.endsWith('/'+name+'.obj'));
    const parent=fs.readFileSync(registered.sourceParentPath);
    const parentBlob=createHash('sha1').update('blob '+parent.length+'\0').update(parent).digest('hex');
    const recordedParent=model.match(/(?:Parent|Original) Git blob:?\s*([0-9a-f]{40})/);
    assert.equal(recordedParent?.[1],parentBlob,name+' parent Git blob must match immutable source');
    assert.ok((model.match(/^v /gm)||[]).length>=30);
    assert.ok((model.match(/^f /gm)||[]).length>=20);
  }
  const ui=JSON.parse(fs.readFileSync(project+'Resources/CompanyAssets/MagicForestUI.json','utf8'));
  const motion=JSON.parse(fs.readFileSync(project+'Resources/CompanyAssets/MagicForestMotion.json','utf8'));
  assert.equal(ui.source,'assets/roblox/common-ui-v1/RobloxCommonUI.luau');
  assert.equal(motion.source,'assets/roblox/common-motion-v1/RobloxCommonMotion.luau');
  assert.equal(motion.runtimeVerification,'PENDING_UNITY_WEB');
  assert.match(game,/Resources\.Load<TextAsset>\("CompanyAssets\/MagicForestUI"\)/);
  assert.match(game,/Resources\.Load<TextAsset>\("CompanyAssets\/MagicForestMotion"\)/);
  assert.match(game,/BindCompanyVisual\("MagicForestRock"/);
  assert.match(game,/BindCompanyVisual\("MagicForestRoad"/);
  assert.match(game,/BindCompanyVisual\("MagicForestGuardian"/);
  assert.match(game,/SyncPlayerWeaponVisual\(\)/);
  assert.match(game,/AnimatePlayerPresentation\(movement\.magnitude\)/);
  assert.match(game,/AnimateMonsterPresentation\(m,presentationWalking\)/);
  assert.match(game,/ApplyCompanyUiSkin\(\)/);
  assert.match(game,/BeginPlayerAction\(2\)/);
  assert.match(game,/BeginPlayerAction\(3\)/);
  assert.match(game,/monsterColliders\.Remove\(collider\)/);
  assert.match(game,/private const string LegacyNormalSaveKey = SavePrefix \+ "world_v1"/);
  assert.equal(request.productionVerified,false);
  assert.equal(request.fullGameplayPassAuthority,false);
  assert.match(editor,/UNITY_WEB_NATIVE_PRESENTATION_SOURCE_MISSING/);
  assert.doesNotMatch(game,/sharedMesh\.triangles\.Length/);
});

test('native asset registry preflight runs before Unity editor and fails closed on tampered source',()=>{
  const workflow=fs.readFileSync('.github/workflows/unity-web-first-stage-build.yml','utf8');
  const begin=workflow.indexOf('      - name: Verify Unity Web development-floor contract');
  const after=workflow.indexOf('      - name: Bind canonical Unity source tree',begin);
  assert.ok(begin>=0&&after>begin);
  const section=workflow.slice(begin,after);
  const start=section.indexOf("node --input-type=module <<'NODE'\n");
  const end=section.indexOf('\n          NODE',start);
  assert.ok(start>=0&&end>start);
  const code=section.slice(start+"node --input-type=module <<'NODE'\n".length,end)
    .split('\n').map(line=>line.replace(/^          /,'')).join('\n');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'fantasy-registry-preflight-'));
  const paths=[
    'company-learning/platform-release-roadmap.json',
    'company-asset-library.json',
    '.build-requests/unity-web/fantasy-survival.json',
    'assets/roblox/survival-core-world-v1/tree_trunk_thick.obj',
    'assets/roblox/survival-core-world-v1/tree_crown_round.obj',
    'assets/roblox/survival-core-world-v1/survival-core-world.mtl',
    'unity-games/fantasy-survival/Assets/Resources/CompanyAssets/MagicForestTrunk.obj',
    'unity-games/fantasy-survival/Assets/Resources/CompanyAssets/MagicForestCrown.obj',
    'unity-games/fantasy-survival/Assets/Resources/CompanyAssets/MagicForestMaterials.mtl'
  ];
  // 확장된 내부 라이브러리 원본/네이티브 파생까지 동일한 기존 해시 게이트에서 검사한다.
  const declaration=JSON.parse(fs.readFileSync('.build-requests/unity-web/fantasy-survival.json','utf8'));
  const registry=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
  for(const id of declaration.registryAssetIds){
    const row=registry.assets.find(asset=>asset.id===id);
    assert.ok(row,'registered native source required: '+id);
    paths.push(row.sourceParentPath,String(row.path).replace(/^\/+/,'')); 
  }
  const invoke=()=>execFileSync(process.execPath,['--input-type=module','--eval',code],{
    cwd:root,encoding:'utf8',timeout:15000,
    env:{...process.env,GAME_ID:'fantasy-survival',PROJECT_PATH:'unity-games/fantasy-survival'}
  });
  try{
    for(const relative of new Set(paths)){
      const dest=path.join(root,relative);
      fs.mkdirSync(path.dirname(dest),{recursive:true});
      fs.copyFileSync(relative,dest);
    }
    enableFixtureWeb(root);
    const requestFile=path.join(root,'.build-requests/unity-web/fantasy-survival.json');
    const currentRequest=JSON.parse(fs.readFileSync(requestFile,'utf8'));
    const fixtureRegistry=JSON.parse(fs.readFileSync(path.join(root,'company-asset-library.json'),'utf8'));
    const staleAssets=fixtureRegistry.assets.filter(asset=>declaration.registryAssetIds.includes(asset.id)&&asset.sourceHash!==createHash('sha256').update(fs.readFileSync(path.join(root,asset.sourceParentPath))).digest('hex'));
    if(staleAssets.length) assert.throws(invoke,error=>{assert.match(String(error.stderr),/UNITY_WEB_NATIVE_ASSET_SHA256_MISMATCH/);return true;});
    // 독립 해시 검사의 성공·변조 경로를 재현하는 임시 픽스처만 갱신한다. 실제 보류 자산은 유지한다.
    for(const asset of staleAssets) asset.sourceHash=createHash('sha256').update(fs.readFileSync(path.join(root,asset.sourceParentPath))).digest('hex');
    fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify(fixtureRegistry));
    currentRequest.registryVersionRequired=registry.version;
    fs.writeFileSync(requestFile,JSON.stringify(currentRequest));
    const cleanRun=invoke();
    assert.match(cleanRun,new RegExp('UNITY_WEB_NATIVE_ASSET_SOURCE_SHA256=VALIDATED_RUNTIME_UNVERIFIED count='
      +declaration.registryAssetIds.length+'(?:\\r?\\n|$)'));
    const tampered=path.join(root,'unity-games/fantasy-survival/Assets/Resources/CompanyAssets/MagicForestTrunk.obj');
    fs.appendFileSync(tampered,'\n# deliberate SHA256 mismatch\n');
    assert.throws(invoke,error=>{
      assert.match(String(error.stderr),/UNITY_WEB_NATIVE_ASSET_SHA256_MISMATCH/);
      return true;
    });
    fs.copyFileSync('unity-games/fantasy-survival/Assets/Resources/CompanyAssets/MagicForestTrunk.obj',tampered);
    const req=JSON.parse(fs.readFileSync(requestFile,'utf8'));
    req.registryVersionRequired=999999;
    fs.writeFileSync(requestFile,JSON.stringify(req));
    assert.throws(invoke,error=>{
      assert.match(String(error.stderr),/UNITY_WEB_NATIVE_ASSET_REGISTRY_VERSION_STALE/);
      return true;
    });
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Unity Web first-stage request binds canonical Unity source and Web output',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'unity-web-first-stage-'));
  const old=process.cwd();
  try{
    fs.cpSync(path.join(repo,'company-learning'),path.join(tmp,'company-learning'),{recursive:true});
    enableFixtureWeb(tmp);
    const root=path.join(tmp,'unity-games','sample-game');
    fs.mkdirSync(path.join(root,'Assets','Scripts'),{recursive:true});
    fs.mkdirSync(path.join(root,'Assets','Editor'),{recursive:true});
    fs.mkdirSync(path.join(root,'Packages'),{recursive:true});
    fs.mkdirSync(path.join(root,'ProjectSettings'),{recursive:true});
    const valid3d=[
      'using UnityEngine;',
      'using UnityEngine.UI;',
      '// SpriteRenderer / Physics2D in comments are not active components.',
      '/* TilemapRenderer is historical documentation, not gameplay. */',
      'public class Game : MonoBehaviour {',
      '  MeshFilter world; MeshRenderer actor; Rigidbody body;',
      '  Image hud; RawImage minimap; Texture2D icon;',
      '  string label = "Rigidbody2D";',
      '}',
      '',
    ].join('\n');
    fs.writeFileSync(path.join(root,'Assets','Scripts','Game.cs'),valid3d);
    fs.writeFileSync(path.join(root,'Assets','Editor','Build.cs'),'public static class SeedAndroidBuild { public static void BuildWeb(){} }\n');
    fs.writeFileSync(path.join(root,'Packages','manifest.json'),JSON.stringify({dependencies:{'com.unity.modules.physics':'1.0.0'}})+'\n');
    fs.writeFileSync(path.join(root,'ProjectSettings','ProjectVersion.txt'),'m_EditorVersion: 6000.6.0f1\nm_EditorVersionWithRevision: 6000.6.0f1 (f7f8ed4d1e24)\n');
    process.chdir(tmp);
    execFileSync(process.execPath,[tool,'--game-id=sample-game','--source-commit=abc'],{stdio:'pipe'});
    const req=JSON.parse(fs.readFileSync(path.join(tmp,'.build-requests','unity-web','sample-game.json'),'utf8'));
    assert.equal(req.projectPath,'unity-games/sample-game');
    assert.equal(req.outputRoot,'web-games/sample-game');
    assert.equal(req.kind,'UNITY_WEB_DEVELOPMENT_FLOOR_BUILD');
    assert.equal(req.fullGameplayPassAuthority,false);
    assert.equal(req.requestEvidenceOnly,true);
    assert.equal(req.nativeGateAuthority,false);
    assert.equal(req.developmentAdmissionAuthority,false);
    assert.equal(req.upperPlatformReadinessRequired,true);
    assert.equal(req.upperPlatformReadinessEvidence,'web-games/sample-game/upper-platform-development-readiness.json');
    assert.equal(req.releaseAuthority,false);
    assert.equal(req.homepageTestSurface,true);
    assert.equal(req.postGateAction,'CONTINUE_INDEPENDENT_UNITY_WEB_DEVELOPMENT');
    assert.equal(req.requiredGameplayDimension,'3D');
    assert.equal(req.native3dRuntimeMeshQaRequired,true);
    assert.equal(req.existing2dOr2_5dSourceRequiresInPlace3dRebuild,true);
    // 실제 C# 파일로 검사기를 실행하고 2D 탐지가 실패 원인인지 확인한다.
    const run=()=>execFileSync(process.execPath,[tool,'--game-id=sample-game'],{stdio:'pipe'});
    assert.match(run().toString(),/UNITY_WEB_REQUEST_STATUS=READY/);
    // 검증 모드에서는 요청 파일이 없어야 하며 실패는 정확한 모듈을 보고한다.
    const moduleManifest=path.join(root,'Packages','manifest.json');
    const preflightRequest=path.join(tmp,'.build-requests','unity-web','sample-game.json');
    fs.rmSync(preflightRequest,{force:true});
    const preflight=execFileSync(process.execPath,[tool,'--game-id=sample-game','--validate-only'],{stdio:'pipe'}).toString();
    assert.match(preflight,/UNITY_WEB_NATIVE_MODULES=VALIDATED/);
    assert.match(preflight,/UNITY_WEB_SOURCE_PREFLIGHT=PASS/);
    assert.equal(fs.existsSync(preflightRequest),false);
    assert.match(run().toString(),/UNITY_WEB_REQUEST_STATUS=READY/);
    fs.writeFileSync(moduleManifest,'{}\n');
    assert.throws(run,error=>{
      assert.match(String(error.stderr),/UNITY_WEB_NATIVE_MODULE_MISSING:com\.unity\.modules\.physics:/);
      return true;
    });
    fs.writeFileSync(moduleManifest,JSON.stringify({dependencies:{'com.unity.modules.physics':'1.0.0'}})+'\n');
    for(const [reference,module] of [
      ['Animator actor;', 'animation'],
      ['AudioSource sound;', 'audio'],
      ['string value = JsonUtility.ToJson(this);', 'jsonserialize'],
      ['GUI.Button(new Rect(0,0,10,10), "Play");', 'imgui']
    ]){
      const sourceFile=path.join(root,'Assets','Scripts','Game.cs');
      fs.writeFileSync(sourceFile,'using UnityEngine; public class Game:MonoBehaviour { '+reference+' }\n');
      try{
        assert.throws(run,error=>{
          assert.match(String(error.stderr),new RegExp('UNITY_WEB_NATIVE_MODULE_MISSING:com\\.unity\\.modules\\.'+module+':'));
          return true;
        });
      }finally{fs.writeFileSync(sourceFile,valid3d);}
    }
    assert.match(run().toString(),/UNITY_WEB_REQUEST_STATUS=READY/);
    // 3D 검증의 읽기 전용 탐지는 허용하지만 실제 2D 컴포넌트 사용은 아래 테스트에서 차단한다.
    const nativeSourceFile=path.join(root,'Assets','Scripts','Game.cs');
    fs.writeFileSync(nativeSourceFile,[
      'using UnityEngine;',
      'public class Game:MonoBehaviour {',
      '  void Check() {',
      '    int spriteGameplayActors = 0;',
      '    foreach (Renderer candidate in FindObjectsByType<Renderer>(FindObjectsSortMode.None)) {',
      '      if (candidate != null && candidate.gameObject.activeInHierarchy',
      '          && candidate.GetType().Name == "SpriteRenderer") spriteGameplayActors++;',
      '    }',
      '  }',
      '}'
    ].join('\n'));
    assert.match(run().toString(),/UNITY_WEB_REQUEST_STATUS=READY/);
    fs.writeFileSync(nativeSourceFile,valid3d);
    const reject=(relative,body)=>{
      const target=path.join(root,relative);
      fs.mkdirSync(path.dirname(target),{recursive:true});
      fs.writeFileSync(target,body);
      try{
        assert.throws(run,error=>{
          assert.match(String(error.stderr),/UNITY_WEB_2D_GAMEPLAY_FORBIDDEN_REDEVELOP_3D:/);
          assert.ok(String(error.stderr).includes(relative.replaceAll('\\','/')));
          return true;
        });
      } finally {
        if(relative==='Assets/Scripts/Game.cs')fs.writeFileSync(target,valid3d);
        else fs.rmSync(target,{force:true});
      }
    };
    for(const type of [
      'Rigidbody2D','BoxCollider2D','Physics2D','SpriteRenderer',
      'Tilemap','TilemapRenderer','SpriteShapeRenderer'
    ]){
      reject('Assets/Scripts/Game.cs',
        'using UnityEngine; using UnityEngine.Tilemaps; using UnityEngine.U2D; '+
        'public class Game:MonoBehaviour { '+type+' component; }\n');
    }
    // 문자열의 URL에 있는 // 가 뒤쪽의 실제 Rigidbody2D 토큰을 숨기면 안 된다.
    reject('Assets/Scripts/Game.cs',
      'using UnityEngine; public class Game:MonoBehaviour { void Start() { Debug.Log("https://example.org"); Rigidbody2D body = null; } }\n');
    // Assets/Scripts 밖의 런타임 C#도 동일하게 차단한다.
    reject('Assets/Gameplay/Enemy.cs',
      'using UnityEngine; public class Enemy:MonoBehaviour { CircleCollider2D hitbox; }\n');
    // 편집기용 레거시 코드는 런타임 3D 소스 판단에서 제외한다.
    fs.writeFileSync(path.join(root,'Assets','Editor','LegacyInspector.cs'),
      'using UnityEngine; public class LegacyInspector { Rigidbody2D oldReference; }\n');
    assert.match(run().toString(),/UNITY_WEB_REQUEST_STATUS=READY/);
  } finally {
    process.chdir(old);
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});

test('2D source detector uses a single literal word boundary and preserves 3D and UI authoring',()=>{
  const script=fs.readFileSync(tool,'utf8');
  const line=script.split('\n').find(row=>row.startsWith('const forbidden2dComponents='));
  assert.ok(line);
  assert.ok(line.startsWith('const forbidden2dComponents=/\\b(?:Rigidbody2D'));
  assert.ok(line.endsWith(')\\b/u;'));
  assert.equal(line.includes('\\\\b'),false,'double escaping would match a literal backslash instead of C# boundaries');
  assert.match(script,/walk\(path\.join\(sourceRoot,'Assets'\)\)/);
  assert.match(script,/entry\.name!=='Editor'&&entry\.name!=='Tests'/);
});

test('source preflight requires the central existing-game and all-spatial-assets 3D contract',()=>{
  const source=fs.readFileSync(tool,'utf8');
  assert.match(source,/twoPointFiveDimensionalFinalPassForbidden/);
  assert.match(source,/MANDATORY_IN_PLACE_NATIVE_UNITY_3D_REDEVELOPMENT_ALL_EXISTING_GAMES/);
  assert.match(source,/mandatory3dFamilies\.every/);
  assert.match(source,/sharedLibraryGameWorldFamilies3dOnly/);
});

test('Unity technical prototype is rejected as canonical first-stage source',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'unity-web-first-stage-reject-'));
  const old=process.cwd();
  try{
    fs.cpSync(path.join(repo,'company-learning'),path.join(tmp,'company-learning'),{recursive:true});
    enableFixtureWeb(tmp);
    const root=path.join(tmp,'unity-games','sample-game');
    fs.mkdirSync(path.join(root,'Assets','Scripts'),{recursive:true});
    fs.mkdirSync(path.join(root,'Assets','Editor'),{recursive:true});
    fs.mkdirSync(path.join(root,'Packages'),{recursive:true});
    fs.mkdirSync(path.join(root,'ProjectSettings'),{recursive:true});
    fs.writeFileSync(path.join(root,'Assets','Scripts','Game.cs'),'using UnityEngine; public class Game:MonoBehaviour {}\n');
    fs.writeFileSync(path.join(root,'Assets','Editor','Build.cs'),'public static class SeedAndroidBuild { public static void BuildWeb(){} }\n');
    fs.writeFileSync(path.join(root,'Packages','manifest.json'),'{}\n');
    fs.writeFileSync(path.join(root,'ProjectSettings','ProjectVersion.txt'),'m_EditorVersion: 6000.6.0f1\nm_EditorVersionWithRevision: 6000.6.0f1 (f7f8ed4d1e24)\n');
    fs.writeFileSync(path.join(root,'prototype-source.json'),JSON.stringify({purpose:'TARGET_PLATFORM_TECHNICAL_VALIDATION'}));
    process.chdir(tmp);
    assert.throws(()=>execFileSync(process.execPath,[tool,'--game-id=sample-game'],{stdio:'pipe'}),/Command failed/);
  } finally {
    process.chdir(old);
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});

test('Unity Web readiness publication uses PR instead of direct main write',()=>{
  const workflow=fs.readFileSync(path.join(repo,'.github','workflows','unity-web-first-stage-build.yml'),'utf8');
  assert.match(workflow,/Publish every verified Unity Web build via reviewed PR/);
  assert.match(workflow,/gh pr create/);
  assert.match(workflow,/UNITY_WEB_DIRECT_MAIN_WRITE=NO/);
  assert.equal(workflow.includes(['git','push','origin','HEAD:main'].join(' ')),false);
  assert.match(workflow,/unity-web-deploy-manifest\.json/);
  assert.match(workflow,/git add -f "\$runtime_dir\/Build"/);
  assert.match(workflow,/25\*1024\*1024/);
  const ignore=fs.readFileSync(path.join(repo,'.gitignore'),'utf8');
  assert.match(ignore,/!web-games\/\*\/Build\/\*\*/);
});


test('Unity Web reviewed promotion binds candidate Unity source and verified WebGL bundle before Vibe2 PASS',()=>{
  const workflow=fs.readFileSync(path.join(repo,'.github','workflows','unity-web-first-stage-build.yml'),'utf8');
  assert.match(workflow,/base_main_sha:/);
  assert.match(workflow,/vibe2_task_id:/);
  assert.match(workflow,/vibe2_candidate_branch:/);

  const start=workflow.indexOf('      - name: Publish every verified Unity Web build via reviewed PR');
  const end=workflow.indexOf('\n\n  settle-vibe2-failure:',start);
  assert.ok(start>=0&&end>start);
  const section=workflow.slice(start,end);
  assert.match(section,/candidate_paths=\("unity-games\/\$GAME_ID" "\$\{generated_asset_files\[@\]\}"\)/);
  assert.match(section,/git checkout "\$SOURCE_COMMIT" -- "\$\{candidate_paths\[@\]\}"/);
  assert.match(section,/git add "unity-games\/\$GAME_ID" "\$runtime_dir"/);
  assert.match(section,/UNITY_WEB_CLOUDFLARE_PREVIEW=/);
  assert.match(section,/gh pr merge "\$pr_url"/);
  assert.match(section,/merged_paths=\("unity-games\/\$GAME_ID" "\$runtime_dir" "\$\{generated_asset_files\[@\]\}"\)/);
  assert.match(section,/git diff --quiet "\$release_commit" origin\/main -- "\$\{merged_paths\[@\]\}"/);
  assert.match(section,/UNITY_WEB_CLOUDFLARE_MAIN=/);
  const mainDeploy=section.indexOf('UNITY_WEB_CLOUDFLARE_MAIN=');
  const queuePass=section.indexOf('vibe2-queue-control.mjs pass');
  assert.ok(mainDeploy>=0&&queuePass>mainDeploy);
  assert.match(section,/execution-surface:UNITY_WEB/);
  assert.match(section,/unity-web-webgl-build-pass/);
  assert.match(section,/unity-web-browser-play-pass/);
  assert.match(section,/unity-web-independent-qa-pass/);
  assert.match(section,/unity-web-regression-pass/);
  assert.match(section,/unity-web-cloudflare-deployment-pass/);
  assert.match(section,/VIBE2_UNITY_WEB_TASK_FINAL_PASS=EXACT_SOURCE_RUNTIME_AND_DEPLOYMENT/);
});

test('verified unscoped Unity Web deployment resumes the existing Vibe game cycle only after main publication',()=>{
  const workflow=fs.readFileSync(path.join(repo,'.github','workflows','unity-web-first-stage-build.yml'),'utf8');
  const start=workflow.indexOf('      - name: Publish every verified Unity Web build via reviewed PR');
  const end=workflow.indexOf('      - name: Mark Unity Web floor repair requirement',start);
  assert.ok(start>=0&&end>start);
  const section=workflow.slice(start,end);
  assert.match(section,/if \[ -z "\$VIBE2_TASK_ID" \] && \[ "\$READINESS_PASS" = 'true' \]; then/);
  assert.match(section,/vibe2-fanin-refill/);
  assert.match(section,/execution_lane:"game-primary"/);
  assert.match(section,/reason:"unity-web-main-deployed-next-build-up"/);
  const deploy=section.indexOf('UNITY_WEB_CLOUDFLARE_MAIN=');
  const settled=section.indexOf('VIBE2_UNITY_WEB_TASK_FINAL_PASS=EXACT_SOURCE_RUNTIME_AND_DEPLOYMENT');
  const next=section.indexOf('UNITY_WEB_POST_DEPLOY_NEXT_BUILD_UP=');
  assert.ok(deploy>=0&&settled>deploy&&next>settled);
  assert.doesNotMatch(section,/gh workflow run company-development-confirmed-runtime\.yml/);
  assert.doesNotMatch(section,/gh workflow run vibe2-24h-runner\.yml/);
});

test('failed Vibe2 Unity Web execution requeues the exact task instead of claiming PASS',()=>{
  const workflow=fs.readFileSync(path.join(repo,'.github','workflows','unity-web-first-stage-build.yml'),'utf8');
  const start=workflow.indexOf('  settle-vibe2-failure:');
  const end=workflow.indexOf('\n\n  repair-vibe2:',start);
  assert.ok(start>=0&&end>start);
  const section=workflow.slice(start,end);
  assert.match(section,/needs\.build\.result == 'failure'/);
  assert.match(section,/vibe2-queue-control\.mjs fail/);
  assert.match(section,/--blocker=unity-web-runtime-or-promotion-failed/);
  assert.match(section,/execution-surface:UNITY_WEB/);
  assert.match(section,/source_outcome:\$outcome/);
  assert.doesNotMatch(section,/vibe2-queue-control\.mjs pass/);
});

test('Unity Web build never directly fans out; main-bound readiness evidence owns upper-platform admission',()=>{
  const workflow=fs.readFileSync(path.join(repo,'.github','workflows','unity-web-first-stage-build.yml'),'utf8');
  const policy=JSON.parse(fs.readFileSync(path.join(repo,'company-learning','platform-release-roadmap.json'),'utf8'));
  const fan=policy.directNativeDualPlatformDevelopment.unityWebNativeFanOut;
  assert.equal(fan.enabled,false);
  assert.equal(fan.trigger,'UPPER_PLATFORM_DEVELOPMENT_READY_ON_MAIN');
  assert.deepEqual(fan.targets,['ROBLOX','UNITY']);
  assert.equal(fan.exactGameOnly,true);
  assert.equal(fan.developmentAdmissionAuthority,false);
  assert.equal(fan.releaseAuthority,false);
  assert.equal(fan.directDispatchFromUnityWebBuildForbidden,true);
  assert.equal(fan.sourceTreeExactMatchRequired,true);
  assert.match(workflow,/Evaluate upper-platform development readiness/);
  assert.match(workflow,/upper-platform-development-readiness\.json/);
  assert.match(workflow,/Publish every verified Unity Web build via reviewed PR/);
  assert.doesNotMatch(workflow,/Fan verified Unity Web into exact Roblox and Unity development/);
  assert.doesNotMatch(workflow,/gh workflow run company-development-confirmed-runtime\.yml/);
});


test('Unity Web readiness failure enters reusable Vibe2 causal repair and still fails closed',()=>{
  const workflow=fs.readFileSync(path.join(repo,'.github','workflows','unity-web-first-stage-build.yml'),'utf8');
  const vibe=fs.readFileSync(path.join(repo,'.github','workflows','vibe2-24h-runner.yml'),'utf8');
  assert.match(workflow,/Mark Unity Web floor repair requirement/);
  assert.match(workflow,/id: repair/);
  assert.match(workflow,/repair_required:/);
  assert.match(workflow,/UNITY_WEB_FLOOR_STATE=REPAIR_REQUIRED/);
  assert.match(workflow,/UNITY_WEB_REPAIR_PLANNER_HANDOFF=REUSABLE_WORKFLOW/);
  assert.match(workflow,/uses: \.\/\.github\/workflows\/vibe2-24h-runner\.yml/);
  assert.match(workflow,/needs\.build\.result == 'failure'/);
  assert.match(workflow,/needs\.build\.outputs\.repair_required == 'true'/);
  assert.doesNotMatch(workflow,/gh workflow run vibe2-24h-runner\.yml/);
  assert.match(workflow,/exit 42/);
  assert.match(vibe,/workflow_call:/);
  const repair=workflow.slice(workflow.indexOf('\n  repair-vibe2:'));
  const calleePermissions=vibe.match(/^permissions:\n((?:  .+\n)+)/m)?.[1];
  assert.ok(calleePermissions,'reusable runner declares its token permissions');
  for(const line of calleePermissions.trim().split('\n')){
    const permission=line.trim();
    assert.ok(repair.includes(`      ${permission}\n`),`repair caller must grant callee permission: ${permission}`);
  }
});

test('paused Unity Web homepage never probes builds while static Unity compression remains compatible',()=>{
  const homepage=fs.readFileSync(path.join(repo,'assets','homepage-enhancements.js'),'utf8');
  const routes=JSON.parse(fs.readFileSync(path.join(repo,'_routes.json'),'utf8'));
  const headers=fs.readFileSync(path.join(repo,'_headers'),'utf8');
  const orchestrator=fs.readFileSync(path.join(repo,'.github','workflows','company-development-confirmed-runtime.yml'),'utf8');
  assert.doesNotMatch(homepage,/bindAvailableUnityWebSurfaces|unity-web-deploy-manifest|probeFetch/);
  assert.doesNotMatch(orchestrator,/dispatch-unity-web-floor:|dispatch-unity-web-bootstrap:/);
  assert.ok(routes.exclude.includes('/assets/*'));
  assert.match(headers,/\/web-games\/\*\.wasm\.gz\n  Content-Type: application\/wasm\n  Content-Encoding: gzip/);
  const worker=fs.readFileSync(path.join(repo,'_worker.js'),'utf8');
  assert.ok(worker.includes("headers.set('Content-Encoding',format==='gz'?'gzip':'br')"));
});

test('Unity monster adventure keeps real UV-less source meshes and uses triplanar physical material rendering',()=>{
  const root=path.join(repo,'unity-games','monster-adventure','Assets');
  const editor=fs.readFileSync(path.join(root,'Editor','UnityWebFloorBuild.cs'),'utf8');
  const shader=fs.readFileSync(path.join(root,'Materials','LibrarySurface.shader'),'utf8');
  assert.match(shader,/Shader "Jaewoon\/LibrarySurface"/);
  assert.match(shader,/#pragma surface surf StandardSpecular fullforwardshadows/);
  assert.match(shader,/#pragma target 3\.0/);
  for(const axis of ['yz','zx','xy'])assert.ok(shader.includes('tex2D(_DetailMap, p.'+axis+')'));
  for(const field of ['Albedo','Specular','Smoothness','Emission'])assert.ok(shader.includes('o.'+field+' ='));
  assert.ok(editor.includes('EnsureDetailTexture();'));
  assert.ok(editor.includes('TextureFormat.RGBA32,true,true'));
  assert.ok(editor.includes('TextureWrapMode.Repeat'));
  assert.ok(editor.includes('FilterMode.Trilinear'));
  assert.ok(editor.includes('tokens[0]=="Ks"'));
  assert.ok(editor.includes('Mathf.Sqrt(2f/(ns+2f))'));
  assert.ok(editor.includes('material.SetTexture("_DetailMap",detailTexture)'));
  assert.ok(!editor.includes('Shader.Find("Standard")'));
  const binds=[...editor.matchAll(/BindModel\(scene,"[^"]+","([^"]+)","([^"]+)"/g)];
  assert.ok(binds.length>=18,'original scene meshes preserved');
  const palettes=new Map();
  for(const match of binds){
    const [,asset,palette]=match;
    const obj=fs.readFileSync(path.join(root,'Art',asset+'.obj'),'utf8');
    const mtl=fs.readFileSync(path.join(root,'Art',palette+'.mtl'),'utf8');
    if(!palettes.has(palette))palettes.set(palette,new Set([...mtl.matchAll(/^newmtl\s+(\S+)/gm)].map(m=>m[1])));
    const parts=[...new Set([...obj.matchAll(/^usemtl\s+(\S+)/gm)].map(m=>m[1]))];
    assert.ok(parts.length>0,asset+' includes assigned material parts');
    assert.match(obj,/^v\s+/m);
    assert.match(obj,/^f\s+/m);
    assert.doesNotMatch(obj,/^vt\s+/m,'UV-less asset demands triplanar material');
    for(const part of parts)assert.ok(palettes.get(palette).has(part),asset+' / '+part);
  }
});

// 메인: 유니티 웹 사전검사 실패와 실제 라이선스 실패를 분리한다.
test('Unity Web only enforces license activation when activation was attempted',()=>{
  const workflow=fs.readFileSync(path.join(repo,'.github','workflows','unity-web-first-stage-build.yml'),'utf8');
  const start=workflow.indexOf('      - name: Enforce Unity activation');
  const end=workflow.indexOf('      - name: Build Unity Web',start);
  assert.ok(start>=0&&end>start);
  const step=workflow.slice(start,end);
  assert.ok(step.includes("if: ${{ always() && steps.license.outcome != 'skipped' }}"));
  assert.match(step,/steps\.license\.outcome/);
  assert.match(step,/exit 198/);
  assert.match(workflow,/UNITY_WEB_REPAIR_FAILURE_STAGE=/);
  assert.match(workflow,/UNITY_WEB_REPAIR_FAILURE_SIGNATURE=/);
});

test('Unity Web uses one shared retained editor cache per exact version without weakening runtime QA',()=>{
  const workflow=fs.readFileSync(path.join(repo,'.github','workflows','unity-web-first-stage-build.yml'),'utf8');
  const steps=[
    'Restore installed Unity WebGL editor',
    'Install Unity Hub and WebGL Editor',
    'Retain installed Unity WebGL editor',
    'Activate Unity Personal',
    'Build Unity Web',
    'Run Unity Web actual browser play',
    'Run Unity Web independent QA',
    'Run Unity Web regression',
    'Evaluate upper-platform development readiness'
  ];
  const offsets=steps.map(step=>workflow.indexOf('      - name: '+step));
  assert.ok(offsets.every(n=>n>=0),'editor reuse and original build/QA stages are present');
  for(let i=1;i<offsets.length;i++)assert.ok(offsets[i]>offsets[i-1],steps[i]);
  const key='key: unity-webgl-editor-v1-'+'${'+ '{ runner.os }}-'
    +'${'+ '{ steps.request.outputs.unity_version }}-'
    +'${'+ '{ steps.request.outputs.unity_revision }}';
  assert.equal(workflow.split(key).length-1,2,'all games share the same exact-version cache');
  assert.match(workflow,/uses: actions\/cache\/restore@v4/);
  assert.match(workflow,/uses: actions\/cache\/save@v4/);
  assert.match(workflow,/if: steps\.editor_cache\.outputs\.cache-hit != 'true'/);
  assert.match(workflow,/UNITY_WEB_EDITOR_REUSED=YES/);
  assert.match(workflow,/WebGLSupport/);
  assert.match(workflow,/UNITY_WEB_EDITOR_CACHE_RETAINED=UNVERIFIED_RETRY_NEXT_BUILD/);
  assert.doesNotMatch(workflow,/sudo rm -rf \/opt\/unityhub/);
  const cache=workflow.slice(workflow.indexOf('      - name: Restore installed Unity WebGL editor'),
    workflow.indexOf('      - name: Activate Unity Personal'));
  assert.equal((cache.match(/continue-on-error: true/g)||[]).length,2,'cache failures must not block real builds');
});

test('existing local Vibe director reuses Blender and the active Unity MCP editor for all eligible games',()=>{
  const start=fs.readFileSync(path.join(repo,'tools','unity-mcp','start-unity-ai.ps1'),'utf8');
  const director=fs.readFileSync(path.join(repo,'tools','unity-mcp','run-company-ai.ps1'),'utf8');
  assert.match(start,/function Resolve-PersistentBlender/);
  assert.match(start,/function Ensure-PersistentBlender/);
  assert.match(start,/BlenderFoundation\.Blender/);
  assert.match(start,/VIBE2_BLENDER_BINARY/);
  assert.match(start,/'--default-instance', \(Split-Path \$resolvedProject -Leaf\)/);
  assert.match(director,/Persistent Blender executable: \$blenderBinary/);
  assert.match(director,/Connected local Unity Editor project: unity-games\/\$localProjectId/);
  assert.match(director,/Select eligible Unity Web games from the existing DEVELOPMENT_CONFIRMED pipeline/);
  assert.match(director,/company-learning\/security-immune-system\.json/);
  assert.doesNotMatch(director,/Priority game project: unity-games\/daechung-rpg/);
});


test('Unity Web game-specific browser QA cannot strand GitHub runners while preserving all mandatory gates',()=>{
  const workflow=fs.readFileSync(path.join(repo,'.github','workflows','unity-web-first-stage-build.yml'),'utf8');
  const section=name=>{
    const start=workflow.indexOf('      - name: '+name+'\n');
    assert.ok(start>=0,'missing workflow stage '+name);
    const end=workflow.indexOf('\n      - name: ',start+1);
    return workflow.slice(start,end>start?end:undefined);
  };
  assert.match(section('Build Unity Web'),/timeout-minutes: 40/);
  assert.match(section('Prepare Unity Web browser runtime'),/timeout-minutes: 12/);
  for(const stage of ['Run Unity Web actual browser play','Run Unity Web independent QA','Run Unity Web regression']){
    const step=section(stage);
    assert.match(step,/timeout-minutes: 10/);
    assert.match(step,/continue-on-error: true/);
    assert.match(step,/company-unity-web-gameplay-validation\.mjs/);
    assert.match(step,/--output="\/tmp\/unity-web\/web-games\/\$GAME_ID\//);
  }
  assert.match(section('Write build evidence'),/UNITY_WEB_QA_REPAIR_REQUIRED/);
  assert.match(section('Write build evidence'),/UNITY_WEB_REAL_BROWSER_PLAYABILITY_REQUIRED/);
  assert.match(section('Upload Unity Web artifact'),/always\(\) && steps\.output\.outcome == 'success'/);
  assert.match(workflow,/needs\.build\.result == 'failure'/);
  assert.match(workflow,/vibe2-queue-control\.mjs fail/);
});


test('Unity Web successful publication and causal failure never strand the existing Vibe queue after three write conflicts',()=>{
  const workflow=fs.readFileSync(path.join(repo,'.github','workflows','unity-web-first-stage-build.yml'),'utf8');
  const promoted=workflow.slice(workflow.indexOf('if [ -n "$VIBE2_TASK_ID" ] && [ "$READINESS_PASS" = \'true\' ]; then'),workflow.indexOf('      - name: Mark Unity Web floor repair requirement'));
  const failure=workflow.slice(workflow.indexOf('  settle-vibe2-failure:'),workflow.indexOf('\n  repair-vibe2:'));
  assert.match(promoted,/settle_attempt=0\s+while true; do\s+settle_attempt=\$\(\(settle_attempt\+1\)\)/);
  assert.match(failure,/attempt=0\s+while true; do\s+attempt=\$\(\(attempt\+1\)\)/);
  assert.match(promoted,/UNITY_WEB_PASS_QUEUE_CONFLICT_RETRY=/);
  assert.match(failure,/UNITY_WEB_FAILURE_QUEUE_CONFLICT_RETRY=/);
  assert.match(promoted,/settle_attempt<5\?settle_attempt:5/);
  assert.match(failure,/attempt<5\?attempt:5/);
  assert.doesNotMatch(promoted,/for settle_attempt in 1 2 3/);
  assert.doesNotMatch(failure,/for attempt in 1 2 3/);
  assert.match(promoted,/vibe2-queue-control\.mjs pass/);
  assert.match(failure,/vibe2-queue-control\.mjs fail/);
  assert.match(promoted,/vibe2-fanin-refill/);
  assert.match(failure,/vibe2-fanin-refill/);
});


test('Unity Web actual browser failure signatures reach the existing Vibe repair queue',()=>{
  const workflow=fs.readFileSync(path.join(repo,'.github','workflows','unity-web-first-stage-build.yml'),'utf8');
  const repair=workflow.slice(workflow.indexOf('      - name: Mark Unity Web floor repair requirement'),workflow.indexOf('\n  settle-vibe2-failure:'));
  const settlement=workflow.slice(workflow.indexOf('  settle-vibe2-failure:'),workflow.indexOf('\n  repair-vibe2:'));
  assert.match(workflow,/failure_stage: \$\{\{ steps\.repair\.outputs\.failure_stage \}\}/);
  assert.match(workflow,/failure_signature: \$\{\{ steps\.repair\.outputs\.failure_signature \}\}/);
  assert.match(repair,/always\(\) && !cancelled\(\) && \(steps\.readiness\.outputs\.pass != 'true' \|\| steps\.publish\.outcome == 'failure'\)/);
  assert.match(repair,/unity-web-gameplay-validation\.json unity-web-independent-qa\.json unity-web-regression\.json/);
  assert.match(repair,/\.observedRuntimeFailure == true/);
  assert.match(repair,/UNITY_WEB_REPAIR_FAILURE_SIGNATURE=/);
  assert.match(settlement,/UNITY_WEB_FAILURE_STAGE: \$\{\{ needs\.build\.outputs\.failure_stage \}\}/);
  assert.match(settlement,/UNITY_WEB_FAILURE_SIGNATURE: \$\{\{ needs\.build\.outputs\.failure_signature \}\}/);
  assert.match(settlement,/unity-web-failure-stage:\$\{UNITY_WEB_FAILURE_STAGE:-UNITY_WEB_UNKNOWN\}/);
  assert.match(settlement,/unity-web-failure-signature:\$\{UNITY_WEB_FAILURE_SIGNATURE:-UNKNOWN\}/);
  assert.match(settlement,/vibe2-queue-control\.mjs fail/);
  assert.doesNotMatch(settlement,/vibe2-queue-control\.mjs pass/);
});

test('source-only Unity Web boot fails cheap F0 before Unity editor and preserves browser QA authority',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'unity-web-boot-f0-'));
  const gameId='source-only-game';
  const root=path.join(tmp,'unity-games',gameId);
  const scriptPath=path.join(root,'Assets','Scripts','Gameplay.cs');
  try{
    for(const part of ['Assets/Scripts','Assets/Editor','Packages','ProjectSettings'])
      fs.mkdirSync(path.join(root,part),{recursive:true});
    fs.mkdirSync(path.join(tmp,'company-learning'),{recursive:true});
    fs.copyFileSync(path.join(repo,'company-learning','platform-release-roadmap.json'),
      path.join(tmp,'company-learning','platform-release-roadmap.json'));
    enableFixtureWeb(tmp);
    fs.writeFileSync(path.join(root,'Packages','manifest.json'),
      JSON.stringify({dependencies:{'com.unity.modules.physics':'1.0.0'}}));
    fs.writeFileSync(path.join(root,'ProjectSettings','ProjectVersion.txt'),
      'm_EditorVersion: 6000.6.0f1\n');
    fs.writeFileSync(path.join(root,'Assets','Editor','Build.cs'),
      'public static class SeedAndroidBuild { public static void BuildWeb(){} }\n');
    const prefix='using UnityEngine;\npublic class Gameplay : MonoBehaviour { MeshFilter world; '+
      'private void Awake() { GameObject.CreatePrimitive(PrimitiveType.Cube); ';
    fs.writeFileSync(scriptPath,prefix+
      'Debug.Log("JAEWOON_UNITY_WEB_QA BOOT game=source-only-game status=SOURCE_READY_3D"); } }\n');
    const run=()=>execFileSync(process.execPath,[tool,'--game-id='+gameId,'--validate-only'],
      {cwd:tmp,encoding:'utf8',timeout:15000});
    assert.throws(run,error=>{
      assert.match(String(error.stderr),
        /UNITY_WEB_BOOT_SOURCE_ONLY_REPAIR_REQUIRED:unity-games\/source-only-game\/Assets\/Scripts\/Gameplay\.cs/);
      return true;
    });
    // 주석에 적힌 가짜 PASS는 실제 SOURCE_READY_3D 로그의 실패를 숨기지 못한다.
    fs.writeFileSync(scriptPath,prefix+
      'Debug.Log("JAEWOON_UNITY_WEB_QA BOOT game=source-only-game status=SOURCE_READY_3D"); '+
      '// Debug.Log("JAEWOON_UNITY_WEB_QA BOOT game=source-only-game status=PASS");\n } }\n');
    assert.throws(run,/UNITY_WEB_BOOT_SOURCE_ONLY_REPAIR_REQUIRED/);
    fs.writeFileSync(scriptPath,prefix+
      'Debug.Log("JAEWOON_UNITY_WEB_QA BOOT game=source-only-game status=SOURCE_READY_3D"); '+
      '/* Debug.Log("JAEWOON_UNITY_WEB_QA BOOT game=source-only-game status=PASS"); */ } }\n');
    assert.throws(run,/UNITY_WEB_BOOT_SOURCE_ONLY_REPAIR_REQUIRED/);
    // 같은 줄의 실제 두 개 로그는 각각 판정하고 실제 브라우저 PASS로 승격하지 않는다.
    fs.writeFileSync(scriptPath,prefix+
      'Debug.Log("JAEWOON_UNITY_WEB_QA BOOT game=source-only-game status=SOURCE_READY_3D"); '+
      'Debug.Log("JAEWOON_UNITY_WEB_QA BOOT game=source-only-game status=PASS"); } }\n');
    assert.match(run(),/UNITY_WEB_SOURCE_PREFLIGHT=PASS/);
    // A native real-world boot source may proceed to QA; F0 alone still cannot claim WebGL PASS.
    fs.writeFileSync(scriptPath,prefix+
      'Debug.Log("JAEWOON_UNITY_WEB_QA BOOT game=source-only-game status=PASS"); } }\n');
    const verifiedSource=run();
    assert.match(verifiedSource,/UNITY_WEB_SOURCE_PREFLIGHT=PASS/);
    assert.doesNotMatch(verifiedSource,/UNITY_WEB_GAMEPLAY_QA=PASS/);
    assert.doesNotMatch(verifiedSource,/UNITY_WEB_RUNTIME=PASS/);
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

 
// [유니티 웹 자동 배포 회귀] 수동 입력값 때문에 성공한 빌드가 배포 없이 종료되지 않게 한다.
test('Unity Web verified builds automatically enter the existing reviewed Cloudflare deployment sequence',()=>{
  const workflow=fs.readFileSync('.github/workflows/unity-web-first-stage-build.yml','utf8');
  const start=workflow.indexOf('      - name: Publish every verified Unity Web build via reviewed PR');
  const end=workflow.indexOf('      - name: Mark Unity Web floor repair requirement',start);
  assert.ok(start>0&&end>start,'the existing verified build publication stage must remain in the canonical workflow');
  const publish=workflow.slice(start,end);
  assert.match(publish,/if: steps\.readiness\.outcome == 'success'/);
  assert.doesNotMatch(publish,/github\.event_name == 'push' \|\| inputs\.publish_to_main/,'manual and workflow_call builds must not silently skip reviewed publication');
  assert.match(publish,/UNITY_WEB_SOURCE_SUPERSEDED_BY_NEW_MAIN_REBUILD_REQUIRED/,'do not deploy stale Unity source');
  assert.match(publish,/gh pr create --repo/,'reviewed PR remains required');
  assert.match(publish,/UNITY_WEB_CLOUDFLARE_PREVIEW=/,'Cloudflare preview proof remains required');
  assert.match(publish,/gh pr merge "\$pr_url"/,'reuse existing automatic main promotion');
  assert.match(publish,/UNITY_WEB_CLOUDFLARE_MAIN=/,'actual main deployment remains required');
  assert.match(publish,/UNITY_WEB_PUBLIC_MOBILE_ACTUAL_PLAY=PASS/,'mobile gameplay validation remains required');
  assert.match(workflow,/repair-vibe2:/,'failed build and deployment continue through existing causal repair');
});

test('Fantasy Survival WebGL preserves native colliders and persisted guardian actions through Unity linker',()=>{
  const linker=fs.readFileSync('unity-games/fantasy-survival/Assets/link.xml','utf8');
  const importer=fs.readFileSync('unity-games/fantasy-survival/Assets/Editor/UnityCompanyAssets.cs','utf8');
  const nativeGame=fs.readFileSync('unity-games/fantasy-survival/Assets/Scripts/UnityWebFloorGame.cs','utf8');
  for(const type of ['UnityEngine.BoxCollider','UnityEngine.SphereCollider','UnityEngine.CapsuleCollider',
    'UnityEngine.Animation','UnityEngine.AnimationClip','UnityEngine.AnimationState']){
    assert.ok(linker.includes('fullname="'+type+'" preserve="all"'),type+' cannot be removed by WebGL stripping');
  }
  assert.ok(importer.includes('AnimationUtility.SetAnimationClips(animation, actionClips.ToArray())'));
  assert.ok(importer.includes('AnimationUtility.GetAnimationClips(persisted)'));
  assert.ok(importer.includes('UNITY_COMPANY_PERSISTED_ACTION_CLIP_MISSING'));
  assert.ok(nativeGame.includes('MAGIC_FOREST_PLAYER_GUARDIAN_ACTION_OR_GRIP_MISSING'));
  assert.ok(nativeGame.includes('Resources.Load<AnimationClip>("CompanyAssets/MagicForestGuardian_"+action)'));
  assert.ok(nativeGame.includes('playerNativeMotion.AddClip(clip,action)'));
  assert.ok(nativeGame.includes('clip==null || !clip.legacy || clip.empty'));
  assert.ok(nativeGame.includes('MAGIC_FOREST_PLAYER_GUARDIAN_ACTION_BINDING_FAILED:'));
  assert.ok(nativeGame.includes('GameObject.CreatePrimitive(primitive)'));
});

// 마력숲 · 실제 모바일 WebGL에서 관측된 누락 콜라이더 189건 재발 방지.
test('Fantasy Survival WebGL canonical native physics scene collider references',()=>{
  const build=fs.readFileSync('unity-games/fantasy-survival/Assets/Editor/UnityWebFloorBuild.cs','utf8');
  const game=fs.readFileSync('unity-games/fantasy-survival/Assets/Scripts/UnityWebFloorGame.cs','utf8');
  assert.ok(build.includes('if(root.GetComponent<UnityWebFloorGame>()==null)root.AddComponent<UnityWebFloorGame>()'));
  assert.ok(build.includes('root.transform.Find("UNITY_WEB_PHYSICS_TYPES")'),'reuse the existing native physics carrier on rebuild');
  assert.ok(build.includes('physicsCarrier.SetActive(false)'),'native physics references never participate in gameplay collision');
  for(const type of ['Box','Sphere','Capsule']){
    assert.ok(build.includes('if(physicsCarrier.GetComponent<'+type+'Collider>()==null)physicsCarrier.AddComponent<'+type+'Collider>()'),
      'reuse existing native component or create it using Unity null equality: '+type);
    assert.ok(!build.includes('GetComponent<'+type+'Collider>()??'),
      'CLR null coalescing must not retain an Editor missing-component object: '+type);
    assert.ok(game.includes('obj.AddComponent<'+type+'Collider>()'),'native runtime reference: '+type);
  }
  assert.ok(game.includes('if(keepCollider && obj.GetComponent<Collider>()==null)'));
  assert.ok(game.includes('if (!keepCollider) Destroy(obj.GetComponent<Collider>())'));
  assert.ok(game.includes('private const string SavePrefix = "fantasy_survival_webfloor_"'));
});
