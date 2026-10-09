import test from 'node:test';
import assert from 'node:assert/strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';

// API 호출은 줄이되 실제 빌드·런타임·독립 QA·회귀의 기존 대기 시간은 보존한다.
test('Unity child polling preserves stage deadlines with fewer requests and a long-running VM',()=>{
  const text=fs.readFileSync('.github/workflows/company-development-unity-runtime.yml','utf8');
  const block=text.slice(text.indexOf('\n  unity-technical-validation:'));
  assert.match(block,/runs-on: ubuntu-latest/);assert.match(block,/timeout-minutes: 160/);
  const waits=[...block.matchAll(/for _ in \$\(seq 1 (\d+)\); do([\s\S]*?)done/g)]
    .filter(row=>/actions\/runs\/\$(?:RUN_ID|child)/.test(row[2])&&/sleep 15/.test(row[2]));
  assert.deepEqual(waits.map(row=>Number(row[1])*15),[6600,2100,2100,1200]);
  assert.equal(waits.reduce((count,row)=>count+Number(row[1]),0),800);
});

const generatorSource=process.env.UNITY_BOOTSTRAP_SOURCE||path.resolve('tools/company-development-unity-bootstrap.mjs');
const workflowSource=fs.readFileSync(path.resolve('.github/workflows/company-development-unity-runtime.yml'),'utf8');
const routerSource=fs.readFileSync(path.resolve('tools/company-selected-platform-router.mjs'),'utf8');
const admissionSource=fs.readFileSync(path.resolve('tools/company-upper-platform-admission.mjs'),'utf8');
const cloudBuildSource=fs.readFileSync(path.resolve('.github/workflows/unity-cloud-android-test.yml'),'utf8');
const hybridWorkflowSource=fs.readFileSync(path.resolve('.github/workflows/unity-hybrid-android-build.yml'),'utf8');
const runtimeWorkflowSource=fs.readFileSync(path.resolve('.github/workflows/unity-android-runtime-smoke.yml'),'utf8');
const independentQaSource=fs.readFileSync(path.resolve('.github/workflows/unity-android-independent-qa.yml'),'utf8');
const regressionSource=fs.readFileSync(path.resolve('.github/workflows/unity-android-regression.yml'),'utf8');
const runtimeSmokeSource=fs.readFileSync(path.resolve('tools/unity-apk-runtime-smoke.sh'),'utf8');

test('verified Unity settlement skips unused model downloads and checks out only queue state',()=>{
  assert.doesNotMatch(workflowSource,/prepare-ollama|ollama pull|evidence meeting/);
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'unity-fanin-sparse-'));
  try{
    const remote=path.join(root,'remote'),checkout=path.join(root,'checkout');
    fs.mkdirSync(remote);
    const git=(...args)=>{const r=spawnSync('git',args,{cwd:remote,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
    git('init','-q','-b','vibe2-unreal-core');git('config','user.email','qa@example.invalid');git('config','user.name','QA');
    for(const dir of ['.vibe2','company-learning','roblox-games/example','assets'])fs.mkdirSync(path.join(remote,dir),{recursive:true});
    fs.writeFileSync(path.join(remote,'.vibe2/queue.json'),'{"tasks":[]}');
    fs.writeFileSync(path.join(remote,'.vibe2/parallelism-control.json'),'{}');
    fs.writeFileSync(path.join(remote,'company-learning/platform-release-roadmap.json'),'{}');
    fs.writeFileSync(path.join(remote,'roblox-games/example/source.luau'),'local value = 1');
    fs.writeFileSync(path.join(remote,'assets/large.dat'),'large asset');
    git('add','.');git('commit','-qm','old history');
    fs.writeFileSync(path.join(remote,'.vibe2/queue.json'),'{"tasks":[],"version":3}');git('add','.');git('commit','-qm','current queue');
    const start=workflowSource.indexOf('          git clone --depth=1 --filter=blob:none --no-checkout --branch vibe2-unreal-core');
    assert.ok(start>0);
    const end=workflowSource.indexOf('          git -C /tmp/vibe2-unity-runtime-control config user.name',start);
    const script=workflowSource.slice(start,end).replace(/          /g,'').replace('"https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"',JSON.stringify('file://'+remote)).replaceAll('/tmp/vibe2-unity-runtime-control',checkout);
    const run=spawnSync('bash',['-euo','pipefail','-c',script],{encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);
    assert.equal(JSON.parse(fs.readFileSync(path.join(checkout,'.vibe2/queue.json'),'utf8')).version,3);
    assert.equal(fs.existsSync(path.join(checkout,'assets/large.dat')),false);
    assert.equal(fs.existsSync(path.join(checkout,'roblox-games/example/source.luau')),false);
    const history=spawnSync('git',['-C',checkout,'rev-list','--count','HEAD'],{encoding:'utf8'});
    assert.equal(history.stdout.trim(),'1');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
const evidenceTool=path.resolve('tools/company-development-unity-evidence.mjs');
const expectedUnityEditorVersion='6000.6.0f1';
const expectedUnityEditorRevision='f7f8ed4d1e24';

test('old source reuse keeps game bytes but cannot pin an outdated cloud build driver',()=>{
  const block=workflowSource.split('          preserved_source=false\n')[1]?.split('          directive_args=()')[0];
  assert.ok(block,'source reuse must account for the driver used by the dispatched branch');
  const script='set -euo pipefail\nbind_catalog(){ :; }\npreserved_source=false\n'+block.split('\n').map(line=>line.replace(/^          /,'')).join('\n')+'\nprintf "PRESERVED=%s\\n" "$preserved_source"\n';
  for(const changed of [true,false]){
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'unity-driver-reuse-'));
    try{
      const git=(...args)=>{const run=spawnSync('git',args,{cwd:root,encoding:'utf8'});assert.equal(run.status,0,run.stderr);return run.stdout.trim();};
      git('init','-q');git('config','user.name','QA');git('config','user.email','qa@example.invalid');
      const project='unity-games/reuse-fixture',request='.build-requests/unity/reuse-fixture-development.json';
      for(const dir of ['.github/workflows',project+'/ProjectSettings',path.dirname(request)])fs.mkdirSync(path.join(root,dir),{recursive:true});
      fs.writeFileSync(path.join(root,'.github/workflows/unity-cloud-android-test.yml'),'driver-v1\n');
      fs.writeFileSync(path.join(root,project,'ProjectSettings/ProjectVersion.txt'),'6000.6.0f1\n');
      fs.writeFileSync(path.join(root,project,'prototype-source.json'),JSON.stringify({generatorFingerprint:'same-game-generator'}));
      fs.writeFileSync(path.join(root,project,'player-save-contract.txt'),'preserve the exact original game');
      fs.writeFileSync(path.join(root,request),'{}');git('add','.');git('commit','-qm','existing candidate');
      const source=git('rev-parse','HEAD');
      if(changed){fs.writeFileSync(path.join(root,'.github/workflows/unity-cloud-android-test.yml'),'driver-v2\n');git('add','.');git('commit','-qm','repair build metadata');}
      const output=path.join(root,'outputs');fs.writeFileSync(output,'');
      const run=spawnSync('bash',['-c',script],{cwd:root,encoding:'utf8',env:{...process.env,reuse_source:source,reuse_branch:'existing-candidate',PROJECT:project,REQUEST:request,current_generator:'same-game-generator',GITHUB_OUTPUT:output}});
      assert.equal(run.status,0,run.stderr);
      assert.equal(fs.readFileSync(path.join(root,project,'player-save-contract.txt'),'utf8'),'preserve the exact original game');
      if(changed){assert.match(run.stdout,/PRESERVED=true/);assert.equal(fs.readFileSync(output,'utf8'),'');}
      else{assert.match(run.stdout,/UNCHANGED_SOURCE_REUSED/);assert.match(fs.readFileSync(output,'utf8'),new RegExp('source_revision='+source));}
    }finally{fs.rmSync(root,{recursive:true,force:true});}
  }
});

test('cloud build metadata binds the checkout tree before runtime and F9 download it',()=>{
  assert.doesNotMatch(cloudBuildSource,/git\s+push\s+origin\s+HEAD:main/,'cloud producer must not bypass the canonical homepage publisher');
  assert.match(cloudBuildSource,/UNITY_HOMEPAGE_PUBLICATION_AUTHORITY=COMPANY_RUNTIME_THEN_HOMEPAGE_MANAGER/);
  const block=cloudBuildSource.split('      - name: Create pre-gate build metadata\n')[1]?.split('\n      - name: ')[0];
  assert.ok(block,'cloud metadata producer must exist');
  const script=block.split('        run: |\n')[1].split('\n').map(line=>line.replace(/^          /,'')).join('\n');
  const values={
    'steps.request.outputs.game_id':'amusement-tycoon',
    'steps.request.outputs.request_id':'binding-regression',
    'steps.apk_verify.outputs.application_id':'com.example.binding',
    'steps.artifact.outputs.release_tag':'test-amusement-tycoon-17-1',
    'steps.artifact.outputs.sha256':'a'.repeat(64),
    'steps.artifact.outputs.bytes':'1024',
    'steps.request.outputs.publish_homepage':'true'
  };
  const runnable=script.replace(/\$\{\{\s*([^}]+?)\s*\}\}/g,(_,key)=>{
    assert.ok(key in values,`unexpected workflow input: ${key}`);return values[key];
  });
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'unity-build-binding-'));
  try{
    const git=(...args)=>{
      const result=spawnSync('git',args,{cwd:root,encoding:'utf8'});
      assert.equal(result.status,0,result.stderr);return result.stdout.trim();
    };
    git('init','-q');fs.writeFileSync(path.join(root,'source.txt'),'exact candidate source');git('add','source.txt');
    git('-c','user.name=QA','-c','user.email=qa@example.invalid','commit','-qm','candidate');
    const commit=git('rev-parse','HEAD'),tree=git('rev-parse','HEAD^{tree}');
    fs.mkdirSync(path.join(root,'dist'));
    const env={...process.env,GITHUB_SHA:commit,GITHUB_RUN_ID:'17',GITHUB_RUN_ATTEMPT:'1',JAEWOON_ANDROID_VERIFY_API:'36'};
    const run=spawnSync('bash',['-c',runnable],{cwd:root,env,encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);
    const metadata=JSON.parse(fs.readFileSync(path.join(root,'dist/build-info.json'),'utf8'));
    assert.equal(metadata.sourceCommit,commit);assert.equal(metadata.sourceTreeSha,tree);
    assert.equal(metadata.sha256,values['steps.artifact.outputs.sha256']);
    assert.equal(metadata.installAndLaunchVerified,false,'metadata is not runtime acceptance');
    assert.equal(metadata.homepagePublicationApproved,true);
    assert.equal(metadata.homepagePublished,false,'publication approval is not deployed evidence');
    const drift=spawnSync('bash',['-c',runnable],{cwd:root,env:{...env,GITHUB_SHA:'b'.repeat(40)},encoding:'utf8'});
    assert.notEqual(drift.status,0,'wrong checkout cannot claim the requested source');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
const cases=[
  ['seed-action-survival-rogu-echoes-of-the-lost-star','Echoes of the Lost Star','SURVIVAL'],
  ['seed-single-defense-strat-celestial-bastion','Celestial Bastion','DEFENSE'],
  ['seed-puzzle-chromatic-cascade','Chromatic Cascade','PUZZLE'],
  ['seed-casual-realm-weaver','Realm Weaver','CASUAL'],
  ['seed-idle-growth-rpg-crystal-bloom','Crystal Bloom','IDLE_RPG'],
  ['seed-story-complete-rpg-chronicles-of-eldoria','Chronicles of Eldoria','STORY_RPG'],
];
function fixtures(root, pass=true){
  const baseline=path.join(root,'baseline.json');
  const web=path.join(root,'web.json');
  const playbooks=path.join(root,'playbooks.json');
  fs.writeFileSync(baseline,JSON.stringify({content:{identity:'Distinct test identity',coreLoop:['act','feedback','choice','reward'],platformProfiles:{UNITY:{
    platform:'UNITY',
    inputModel:'Unity Input System touch-first controls with gamepad and keyboard fallback',
    sessionModel:'Unity Android app session lifecycle with local app state and restart behavior',
    multiplayerRuntime:'Unity native networking contract when multiplayer is required by game design',
    performanceBudget:'Android mobile frame memory thermal draw-call and battery budget',
    uiUx:'Unity UI touch-first layout with mobile safe areas and scalable controls',
    saveAndNetwork:'Unity app local persistence and validated networking boundaries when required',
    platformContentAdaptation:'Unity-native scenes prefabs materials animation camera audio and mobile UI',
    internalReleaseTarget:'Internal or closed Unity Android app test build for owner playtest',
    validationEvidence:'Exact APK install launch runtime independent QA and regression evidence'
  }}}}));
  fs.writeFileSync(web,JSON.stringify({gameId:'fixture',pass,validated:pass,state:pass?'PASS':'FAIL',realEvidenceExists:pass}));
  const external={
    id:'external-black-box-fixture-run-1',
    project:'fixture-black-box',
    sourceRevision:'sha256:fixture',
    distilledApplicationPrinciples:['id=fixture-feedback; scope=mobile-feedback; lesson=visible feedback follows input; apply=keep immediate visible feedback'],
    distilledAvoidancePrinciples:['id=fixture-avoid; scope=copying; lesson=do not copy proprietary expression; apply=preserve original expression'],
    distilledLearningUseAllowed:['interaction feedback'],
    distilledLearningUseForbidden:['proprietary source or asset copying']
  };
  const task=()=>({authority:'verified-task-playbook',verifiedExternalBlackBoxReuseCount:1,verifiedExternalBlackBoxCoveragePct:100,reuse:[external]});
  fs.writeFileSync(playbooks,JSON.stringify({policy:{verifiedExternalBlackBoxAllTaskTypesRequired:true,verifiedExternalBlackBoxTruncationForbidden:true},taskTypes:{unity:task(),coding:task(),graphics:task(),general:task(),roblox:task(),qa:task(),bugfix:task(),planning:task()}}));
  return {baseline,web,playbooks};
}

test('creates Unity target-platform prototypes after admission without embedding WebGL into the native generator',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'jaewoon-unity-bootstrap-'));
  const {baseline,playbooks}=fixtures(root,true);
  for(const [id,name,mode] of cases){
    const sandbox=path.join(root,'sandbox-'+mode);
    fs.mkdirSync(path.join(sandbox,'tools'),{recursive:true});
    fs.copyFileSync(generatorSource,path.join(sandbox,'tools/company-development-unity-bootstrap.mjs'));
    const run=spawnSync(process.execPath,['tools/company-development-unity-bootstrap.mjs',`--game-id=${id}`,`--game-name=${name}`,`--baseline=${baseline}`,`--playbooks=${playbooks}`,`--output=unity-games/${id}`],{cwd:sandbox,encoding:'utf8'});
    assert.equal(run.status,0,run.stderr||run.stdout);
    const project=path.join(sandbox,'unity-games',id);
    const meta=JSON.parse(fs.readFileSync(path.join(project,'prototype-source.json'),'utf8'));
    assert.equal(meta.verifiedExternalLearningCoveragePct,100);
    assert.equal(meta.verifiedExternalLearningRetrievedCount,1);
    assert.equal(meta.verifiedExternalLearningAppliedCount,1);
    assert.deepEqual(meta.verifiedExternalLearningIds,['external-black-box-fixture-run-1']);
    assert.equal(meta.verifiedExternalDistilledContentComplete,true);
    assert.equal(meta.verifiedExternalLearningTruncationForbidden,true);
    const runtimeSource=fs.readFileSync(path.join(project,'Assets/Scripts/SeedTechnicalPrototype.cs'),'utf8');
    assert.match(runtimeSource,/VerifiedExternalLearningIds/);
    assert.match(runtimeSource,/VerifiedExternalLearningPrinciples/);
    assert.match(runtimeSource,/ApplyVerifiedExternalLearningFeedback/);
    assert.match(runtimeSource,/JAEWOON_VERIFIED_EXTERNAL_LEARNING_APPLIED/);
    const manifest=JSON.parse(fs.readFileSync(path.join(project,'Packages','manifest.json'),'utf8'));
    const projectVersion=fs.readFileSync(path.join(project,'ProjectSettings','ProjectVersion.txt'),'utf8');
    const buildScript=fs.readFileSync(path.join(project,'Assets','Editor','SeedAndroidBuild.cs'),'utf8');
    const runtimeScript=fs.readFileSync(path.join(project,'Assets','Scripts','SeedTechnicalPrototype.cs'),'utf8');
    const linkerConfig=fs.readFileSync(path.join(project,'Assets','link.xml'),'utf8');
    assert.equal(meta.version,3);
    assert.equal(meta.category,mode);
    assert.equal(meta.selectedPlatform,'UNITY');
    assert.equal(meta.nativeAppOnly,true);
    assert.equal(meta.unityWebEnabled,false);
    assert.equal(meta.platformDesignProfile.platform,'UNITY');
    assert.equal(meta.releaseAuthority,false);
    assert.equal(meta.buildUpDirectiveConsumed,false);
    assert.equal(meta.buildUpDirectiveCompletionClaim,false);
    assert.equal(meta.buildUpDirectiveId,null);
    assert.equal(meta.purpose,'TARGET_PLATFORM_TECHNICAL_VALIDATION');
    assert.equal(meta.unityEditorVersion,expectedUnityEditorVersion);
    assert.equal(meta.unityEditorRevision,expectedUnityEditorRevision);
    assert.match(meta.generatorFingerprint,/^[0-9a-f]{64}$/);
    assert.equal(meta.androidGraphicsCompatibilityProfile,'OPEN_GLES3_ES30_MINIMUM');
    assert.equal(manifest.dependencies['com.unity.modules.imgui'],'1.0.0');
    assert.match(runtimeScript,/private Animator animator;/);
    const motionClass=runtimeScript.slice(runtimeScript.indexOf('public sealed class JaewoonNativeMotionActor'),runtimeScript.indexOf('public sealed class SeedTechnicalPrototype'));
    const bootClass=runtimeScript.slice(runtimeScript.indexOf('public sealed class SeedTechnicalPrototype'));
    assert.doesNotMatch(motionClass,/private int BindNativeMotionActors\(/,'private scene binding must not belong to another component');
    assert.match(bootClass,/private int BindNativeMotionActors\(\)[\s\S]*private void Awake\(\)[\s\S]*int nativeMotionActors = BindNativeMotionActors\(\);/,'boot call must resolve within its own C# class');
    assert.match(runtimeScript,/AvatarIKGoal\.LeftFoot/);
    assert.match(runtimeScript,/Physics\.Raycast\(/);
    assert.equal(manifest.dependencies['com.unity.modules.animation'],'1.0.0','generated Animator and IK code requires AnimationModule');
    assert.equal(manifest.dependencies['com.unity.modules.physics'],'1.0.0','generated foot-contact raycasts require PhysicsModule');
    assert.match(buildScript,/SeedAndroidBuild/);
    assert.match(buildScript,/targetArchitectures = AndroidArchitecture\.ARM64;/);
    assert.doesNotMatch(buildScript,/AndroidArchitecture\.X86_64/);
    assert.match(buildScript,/SetUseDefaultGraphicsAPIs\(BuildTarget\.Android, false\)/);
    assert.match(buildScript,/SetGraphicsAPIs\(BuildTarget\.Android, new\[\] \{ GraphicsDeviceType\.OpenGLES3 \}\)/);
    assert.match(buildScript,/openGLRequireES31 = false/);
    assert.match(buildScript,/openGLRequireES31AEP = false/);
    assert.match(buildScript,/openGLRequireES32 = false/);
    assert.match(buildScript,/GetComponent<SeedTechnicalPrototype>\(\)/);
    assert.match(buildScript,/AddComponent<SeedTechnicalPrototype>\(\)/);
    assert.match(runtimeScript,/JAEWOON_TECH_BOOT/);
    assert.match(runtimeScript,/JAEWOON_TECH_ACTION/);
    assert.match(runtimeScript,/JAEWOON_TECH_SAVE/);
    assert.match(runtimeScript,/JAEWOON_TECH_METRIC/);
    assert.match(linkerConfig,/<assembly fullname="UnityEngine\.ContentLoadModule">/);
    assert.match(linkerConfig,/<type fullname="Unity\.Loading\.ContentLoadingSystem" preserve="all"\s*\/>/);
    assert.equal(projectVersion.trim(),`m_EditorVersion: ${expectedUnityEditorVersion}\nm_EditorVersionWithRevision: ${expectedUnityEditorVersion} (${expectedUnityEditorRevision})`);
  }
});

test('Unity bootstrap repairs existing motion dependencies and preserves custom manifest content on repeated entry',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'jaewoon-unity-manifest-'));
  try{
    const {baseline,playbooks}=fixtures(root);
    const sandbox=path.join(root,'sandbox');
    fs.mkdirSync(path.join(sandbox,'tools'),{recursive:true});
    fs.copyFileSync(generatorSource,path.join(sandbox,'tools/company-development-unity-bootstrap.mjs'));
    const project=path.join(sandbox,'unity-games/seed-puzzle-chromatic-cascade');
    const manifestFile=path.join(project,'Packages/manifest.json');
    fs.mkdirSync(path.dirname(manifestFile),{recursive:true});
    const existing={dependencies:{'com.unity.modules.imgui':'1.0.0','com.example.gameplay':'file:../../custom-gameplay'},scopedRegistries:[{name:'Game packages',url:'https://packages.example.invalid',scopes:['com.example']}]};
    fs.writeFileSync(manifestFile,JSON.stringify(existing));
    const args=['tools/company-development-unity-bootstrap.mjs','--game-id=seed-puzzle-chromatic-cascade',`--baseline=${baseline}`,`--playbooks=${playbooks}`];
    for(let attempt=0;attempt<2;attempt++){
      const run=spawnSync(process.execPath,args,{cwd:sandbox,encoding:'utf8'});
      assert.equal(run.status,0,run.stderr||run.stdout);
      assert.deepEqual(JSON.parse(fs.readFileSync(manifestFile,'utf8')),{...existing,dependencies:{...existing.dependencies,'com.unity.modules.animation':'1.0.0','com.unity.modules.physics':'1.0.0'}});
    }
    const runtime=fs.readFileSync(path.join(project,'Assets/Scripts/SeedTechnicalPrototype.cs'),'utf8');
    assert.match(runtime,/AvatarIKGoal\.LeftFoot/);
    assert.match(runtime,/Physics\.Raycast\(/);
    fs.writeFileSync(manifestFile,'{"dependencies":[]}');
    const rejected=spawnSync(process.execPath,args,{cwd:sandbox,encoding:'utf8'});
    assert.notEqual(rejected.status,0);
    assert.match(rejected.stderr,/UNITY_PACKAGE_MANIFEST_INVALID/);
    assert.equal(fs.readFileSync(path.join(project,'Assets/Scripts/SeedTechnicalPrototype.cs'),'utf8'),runtime,'invalid manifest must fail before replacing the project');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Unity bootstrap preserves existing gameplay while repairing exact modules and duplicate motion ownership',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'jaewoon-unity-existing-source-'));
  try{
    const {baseline,playbooks}=fixtures(root,true);
    const sandbox=path.join(root,'sandbox');
    fs.mkdirSync(path.join(sandbox,'tools'),{recursive:true});
    fs.copyFileSync(generatorSource,path.join(sandbox,'tools/company-development-unity-bootstrap.mjs'));
    const project=path.join(sandbox,'unity-games/seed-puzzle-chromatic-cascade');
    const scripts=path.join(project,'Assets/Scripts');
    const packages=path.join(project,'Packages');
    fs.mkdirSync(scripts,{recursive:true});
    fs.mkdirSync(packages,{recursive:true});
    const existingSource=[
      'using UnityEngine;',
      'using UnityEngine.Networking;',
      'public sealed class JaewoonNativeMotionActor : MonoBehaviour {}',
      'public sealed class ExistingGameplay : MonoBehaviour {',
      '  public string Save(){ return JsonUtility.ToJson(this); }',
      '  public void Bind(byte[] bytes){ var texture=new Texture2D(2,2); texture.LoadImage(bytes); }',
      '  public UnityWebRequest Request(){ return UnityWebRequest.Get("https://example.invalid"); }',
      '}',
      ''
    ].join('\\n');
    const existingFile=path.join(scripts,'UnityWebFloorGame.cs');
    fs.writeFileSync(existingFile,existingSource);
    fs.writeFileSync(path.join(packages,'manifest.json'),JSON.stringify({dependencies:{'com.unity.modules.imgui':'1.0.0'}}));
    const run=spawnSync(process.execPath,['tools/company-development-unity-bootstrap.mjs','--game-id=seed-puzzle-chromatic-cascade',`--baseline=${baseline}`,`--playbooks=${playbooks}`],{cwd:sandbox,encoding:'utf8'});
    assert.equal(run.status,0,run.stderr||run.stdout);
    assert.equal(fs.readFileSync(existingFile,'utf8'),existingSource,'existing gameplay source must survive native F0 bootstrap repair');
    const generated=fs.readFileSync(path.join(scripts,'SeedTechnicalPrototype.cs'),'utf8');
    assert.doesNotMatch(generated,/public sealed class JaewoonNativeMotionActor/,'existing motion owner must not be duplicated');
    assert.match(generated,/GetComponent<JaewoonNativeMotionActor>\(\)/);
    const manifest=JSON.parse(fs.readFileSync(path.join(packages,'manifest.json'),'utf8'));
    assert.equal(manifest.dependencies['com.unity.modules.animation'],'1.0.0');
    assert.equal(manifest.dependencies['com.unity.modules.physics'],'1.0.0');
    assert.equal(manifest.dependencies['com.unity.modules.jsonserialize'],'1.0.0');
    assert.equal(manifest.dependencies['com.unity.modules.unitywebrequest'],'1.0.0');
    assert.equal(manifest.dependencies['com.unity.modules.imageconversion'],'1.0.0');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Unity native generator ignores legacy Web evidence and emits no WebGL path',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'jaewoon-unity-native-only-'));
  const sandbox=path.join(root,'sandbox');
  fs.mkdirSync(path.join(sandbox,'tools'),{recursive:true});
  fs.copyFileSync(generatorSource,path.join(sandbox,'tools/company-development-unity-bootstrap.mjs'));
  const {baseline,playbooks}=fixtures(root,false);
  const run=spawnSync(process.execPath,['tools/company-development-unity-bootstrap.mjs','--game-id=seed-puzzle-chromatic-cascade','--game-name=Chromatic Cascade',`--baseline=${baseline}`,`--playbooks=${playbooks}`],{cwd:sandbox,encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const project=path.join(sandbox,'unity-games','seed-puzzle-chromatic-cascade');
  const build=fs.readFileSync(path.join(project,'Assets/Editor/SeedAndroidBuild.cs'),'utf8');
  const meta=JSON.parse(fs.readFileSync(path.join(project,'prototype-source.json'),'utf8'));
  assert.doesNotMatch(build,/BuildWeb|BuildTarget\.WebGL|WebGL/);
  assert.equal(meta.nativeAppOnly,true);
  assert.equal(meta.unityWebEnabled,false);
});

test('Unity native executor independently enforces Unity Web upper-platform admission',()=>{
  assert.match(workflowSource,/company-upper-platform-admission\.mjs/);
  assert.match(workflowSource,/classifyUpperPlatformAdmission/);
  assert.match(workflowSource,/grandfatherGameIds/);
  assert.match(workflowSource,/admission\.state!=='UPPER_PLATFORM'/);
  assert.match(workflowSource,/UNITY_NATIVE_ADMISSION_BLOCKED=/);
  assert.match(admissionSource,/UPPER_PLATFORM_DEVELOPMENT_READY/);
  assert.match(admissionSource,/READINESS_SOURCE_STALE/);
  assert.match(workflowSource,/UNITY_WEB_PREDEVELOPMENT_FLOOR=INDEPENDENT_UNITY_WEB_DEVELOPMENT_ANDROID_HELD/);
  assert.match(workflowSource,/UNITY_WEB_FLOOR_OWNER=unity-web-first-stage-build\.yml/);
  assert.doesNotMatch(workflowSource,/UNITY_WEB_VALIDATION=NON_BLOCKING_SEPARATE_WORKFLOW/);
});

test('Unity executor uses unbounded eligibility with capacity batching, canary and exact-stage resume sequence',()=>{
  assert.match(workflowSource,/selectTargetPlatformDevelopmentWindow/);
  assert.match(workflowSource,/selectRepresentativeCanary/);
  assert.match(workflowSource,/const batchMax=Math\.max\(1,Math\.min\(256,/);
  assert.match(workflowSource,/rows\.slice\(0,batchMax\)/);
  assert.match(workflowSource,/Math\.min\(batchMax,selected\.length\|\|1\)/);
  assert.match(workflowSource,/DEVELOPMENT_GAME_ELIGIBILITY_CAP=NONE/);
  assert.match(workflowSource,/REPRESENTATIVE_CANARY=/);
  assert.match(workflowSource,/COMMON_FAILURE_DETECTED=/);
  assert.match(workflowSource,/CHANGE_DETECTION=/);
  assert.match(workflowSource,/GENERATOR_FINGERPRINT_MISMATCH/);
  assert.match(workflowSource,/prototype-source\.json/);
  assert.match(workflowSource,/generatorFingerprint/);
  assert.match(workflowSource,/CHEAP_PRECHECK=/);
  assert.match(workflowSource,/SOURCE_FINGERPRINT=/);
  assert.match(workflowSource,/BUILD_REUSE=/);
  assert.match(workflowSource,/SINGLE_BUILD_OR_PACKAGE=REUSED/);
  assert.match(workflowSource,/IMMUTABLE_ARTIFACT_BIND=PASS/);
  assert.match(workflowSource,/TARGET_PLATFORM_RUNTIME=/);
  assert.match(workflowSource,/INDEPENDENT_QA=/);
  assert.match(workflowSource,/REGRESSION=/);
  assert.match(workflowSource,/unity-android-runtime-smoke\.yml/);
  assert.match(workflowSource,/unity-android-independent-qa\.yml/);
  assert.match(workflowSource,/unity-android-regression\.yml/);
  assert.match(workflowSource,/executionEvidence:evidence/);
  assert.match(workflowSource,/unityInternalReleaseReady:internalReady/);
  assert.match(workflowSource,/distribution:'INTERNAL_OR_CLOSED_APP_TEST_BUILD'/);
  assert.doesNotMatch(workflowSource,/unityPublicReleaseReady:false,unityPublicRelease:false/);
  assert.match(workflowSource,/UNITY_PUBLIC_RELEASE_MUTATION=NO/);
  assert.match(workflowSource,/currentStep:internalReady\?'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG'/);
  assert.match(workflowSource,/resumeStage:failure\|\|\(internalReady\?'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG':'IMMEDIATE_NEXT_STAGE_DISPATCH'\)/);
  assert.match(workflowSource,/BUILD_ONCE_PER_SOURCE_FINGERPRINT=ENABLED/);
  assert.match(workflowSource,/RESUME_EXACT_FAILURE_POINT=ENABLED/);
  assert.match(workflowSource,/QUALITY_GATE_WEAKENING=NO/);
});

test('successful APK build is retained even when the legacy child runtime gate fails',()=>{
  assert.match(workflowSource,/select\(\.name=="build"\)/);
  assert.match(workflowSource,/select\(\.name=="android16-install-gate"\)/);
  assert.match(workflowSource,/build_passed=/);
  assert.match(workflowSource,/LEGACY_RUNTIME_JOB_CONCLUSION=/);
  assert.match(workflowSource,/LEGACY_RUNTIME_VERIFY_CONCLUSION=/);
  assert.match(workflowSource,/gh run download "\$BUILD_RUN" -D \/tmp\/unity-build/);
  assert.doesNotMatch(workflowSource,/CLOUD_UNITY_BUILD_FAILED=/);
});

test('Unity F1-F8 use native ARM64 Android 16 once and F9 reuses that evidence without another runtime',()=>{
  assert.match(cloudBuildSource,/architectures': \['arm64-v8a'\]/);
  for(const source of [runtimeWorkflowSource, independentQaSource]){
    assert.match(source,/runs-on: ubuntu-24\.04-arm/);
    assert.match(source,/ANDROID_SERIAL: 127\.0\.0\.1:5555/);
    assert.match(source,/redroid\/redroid:16\.0\.0_64only-latest/);
    assert.match(source,/redroid_modules_sha='86f0a99f00388122aa2fdfaddf5fd507c58aac66'/);
    assert.match(source,/redroid-ashmem-617\.patch/);
    assert.match(source,/ashmem_linux\.ko/);
    assert.match(source,/--device \/dev\/ashmem:\/dev\/ashmem/);
    assert.doesNotMatch(source,/androidboot\.use_memfd=true/);
    assert.match(source,/ro\.product\.cpu\.abilist/);
    assert.match(source,/arm64-v8a/);
    assert.doesNotMatch(source,/system-images;android-36;google_apis;x86_64/);
    assert.doesNotMatch(source,/swiftshader_indirect/);
  }
  assert.match(runtimeWorkflowSource,/unity-apk-runtime-smoke\.sh/);
  assert.doesNotMatch(runtimeWorkflowSource,/binder_devices=\(\)/);
  assert.doesNotMatch(runtimeWorkflowSource,/\$\{binder_devices\[@\]\}/);
  assert.match(runtimeWorkflowSource,/UNITY_ANDROID_ASHMEM_6_17_COMPAT=READY/);
  assert.match(regressionSource,/runs-on: ubuntu-latest/);
  assert.doesNotMatch(regressionSource,/unity-apk-runtime-smoke\.sh/);
  assert.doesNotMatch(regressionSource,/redroid\/redroid/);
  assert.match(regressionSource,/UNITY_F9_RUNTIME_REPLAY=NO/);
  assert.match(runtimeSmokeSource,/ANDROID_RUNTIME_ABI_MISMATCH/);
  assert.match(runtimeSmokeSource,/runtimeAbiCompatible/);
});

test('Unity executor fetches only required refs and migrates one historical source instead of all development refs',()=>{
  assert.doesNotMatch(workflowSource,/fetch-depth:\s*0/);
  assert.doesNotMatch(workflowSource,/refs\/heads\/development\/\*/);
  assert.match(workflowSource,/fetch-depth:\s*1/);
  assert.match(workflowSource,/fetch-tags:\s*false/);
  assert.match(workflowSource,/git\/matching-refs\/heads\/\$prefix/);
  assert.match(workflowSource,/UNITY_SOURCE_MIGRATION_BRANCH=/);
  assert.match(workflowSource,/unity-reuse/);
  assert.match(workflowSource,/unity-history/);
  assert.match(workflowSource,/CHANGE_DETECTION=UNCHANGED_SOURCE_REUSED/);
});

test('checkpoint persistence is game-local and does not wait for cohort artifact fan-in',()=>{
  assert.match(workflowSource,/runtime-persist\/queue/);
  assert.match(workflowSource,/Persist this game's checkpoint immediately/);
  assert.match(workflowSource,/UNITY_RUNTIME_GAME_PERSIST_OPTIMISTIC_ATTEMPT=/);
  assert.match(workflowSource,/UNITY_RUNTIME_GAME_PERSIST_CONFLICT_RETRY=/);
  assert.match(workflowSource,/DEVELOPMENT_UNITY_GAME_PERSIST=/);
  assert.doesNotMatch(workflowSource,/\n  persist-runtime:\n/);
  assert.doesNotMatch(workflowSource,/CHECKPOINT_ROOT/);
  assert.match(workflowSource,/git cat-file -e "\$SOURCE_REVISION:\$PROJECT"/);
  assert.match(workflowSource,/UNITY_CHECKPOINT_SOURCE_TREE_SHA=UNAVAILABLE_SOURCE_STAGE_FAILED/);
});


test('Unity checkpoint persistence preserves farther exact Roblox shared progress for concurrent games',()=>{
  assert.match(workflowSource,/const mergedUpdate=\{\.\.\.update\}/);
  assert.match(workflowSource,/const concurrent=Array\.isArray\(item\.concurrentTargetPlatforms\)/);
  assert.match(workflowSource,/const exactRobloxBuild=item\.robloxBuildOrPackagePassed===true/);
  assert.match(workflowSource,/const exactRobloxCandidate=exactCandidate\.published===true/);
  assert.match(workflowSource,/const robloxInternal=item\.robloxInternalReleaseReady===true/);
  assert.match(workflowSource,/const robloxRepairRequired=/);
  assert.match(workflowSource,/item\.canonicalState\|\|''\)\.toUpperCase\(\)==='TARGET_PLATFORM_REPAIR_REQUIRED'/);
  assert.match(workflowSource,/Boolean\(String\(item\.robloxFailureStage\|\|''\)\.trim\(\)\)/);
  assert.match(workflowSource,/mergedUpdate\.currentStep=String\(item\.currentStep\|\|'TARGET_PLATFORM_TECHNICAL_VALIDATION'\)/);
  assert.match(workflowSource,/mergedUpdate\.canonicalState='TARGET_PLATFORM_REPAIR_REQUIRED'/);
  assert.match(workflowSource,/UNITY_SHARED_REPAIR_PRESERVED_FROM_ROBLOX=/);
  assert.match(workflowSource,/mergedUpdate\.currentStep='PRIVATE_RUNTIME_CANDIDATE_DEPLOY'/);
  assert.match(workflowSource,/mergedUpdate\.canonicalState='F0_SOURCE_PREFLIGHT_PASSED'/);
  assert.match(workflowSource,/mergedUpdate\.currentStep='TARGET_PLATFORM_RUNTIME_FOUNDATION'/);
  assert.match(workflowSource,/mergedUpdate\.canonicalState='PRIVATE_RUNTIME_CANDIDATE_DEPLOYED'/);
  assert.match(workflowSource,/UNITY_SHARED_PROGRESS_PRESERVED_FROM_ROBLOX=/);
  assert.match(workflowSource,/Object\.assign\(item,mergedUpdate\)/);
  assert.doesNotMatch(workflowSource,/Object\.assign\(item,update\)/);
});

test('Unity executor accepts exact game dispatch from the shared native orchestrator',()=>{
  assert.match(workflowSource,/workflow_dispatch:\s*\n\s*inputs:\s*\n\s*game_id:/);
  assert.match(workflowSource,/REQUESTED_GAME_ID: \$\{\{ inputs\.game_id \|\| '' \}\}/);
  assert.match(workflowSource,/requested_ids="\$REQUESTED_GAME_ID"/);
  assert.match(workflowSource,/UNITY_REQUESTED_GAME_ID_INVALID=/);
  assert.match(workflowSource,/requestedRows=requestedIds\.length\?rows\.filter\(row=>requestedSet\.has\(row\.gameId\)\):\[\]/);
  assert.match(workflowSource,/requestedUnavailable=requestedIds\.filter\(id=>!requestedRows\.some\(row=>row\.gameId===id\)\)/);
  assert.match(workflowSource,/const canary=requestedIds\.length\?null:/);
  assert.match(workflowSource,/const selected=requestedIds\.length\?requestedRows\.slice/);
  assert.match(workflowSource,/UNITY_REQUESTED_UNAVAILABLE_IDS=/);
  assert.match(workflowSource,/UNITY_REQUESTED_GAME_IDS=/);
});

test('Unity planner excludes owner-exclusive games from both exact and batch execution',()=>{
  assert.match(workflowSource,/ownerCanonicalRules\?\.ownerExclusiveDevelopment/);
  assert.match(workflowSource,/ownerExclusive\.status==='ACTIVE'\?\(ownerExclusive\.gameIds\|\|\[\]\):\[\]/);
  assert.match(workflowSource,/ownerExcludedGameIds\.has\(item\.gameId\)/);
  assert.match(workflowSource,/UNITY_OWNER_EXCLUSIVE_GAME_EXCLUDED=/);
  assert.match(workflowSource,/UNITY_PUBLICATION_OWNER_EXCLUSIVE_GAME_EXCLUDED=/);
  assert.match(workflowSource,/ownerExclusive\.status==='ACTIVE'&&\(ownerExclusive\.gameIds\|\|\[\]\)\.includes\(process\.env\.GAME_ID\)/);
});

test('Unity publication retry lane preserves the exact failed F9 identity and skips a new F0-F9 pass',()=>{
  assert.match(workflowSource,/publication-repair:/);
  assert.match(workflowSource,/if: \$\{\{ inputs\.publication_retry_only == true \}\}/);
  assert.match(workflowSource,/prepare:[\s\S]*if: \$\{\{ inputs\.publication_retry_only != true \}\}/);
  assert.match(workflowSource,/String\(ev\.sourceRevision\|\|''\)===process\.env\.SOURCE_REVISION/);
  assert.match(workflowSource,/String\(ev\.artifactIdentity\|\|''\)===process\.env\.ARTIFACT_ID/);
  assert.match(workflowSource,/String\(ev\.buildRunId\|\|''\)===process\.env\.BUILD_RUN_ID/);
  assert.match(workflowSource,/gh workflow run company-development-unity-runtime\.yml[\s\S]*-f publication_retry_only=true/);
});

test('Unity platform executor remains event-driven with no periodic schedule of its own',()=>{
  assert.doesNotMatch(workflowSource,/^\s*schedule:/m);
  assert.doesNotMatch(workflowSource,/cron:/);
  assert.match(workflowSource,/push:/);
  assert.match(workflowSource,/workflow_dispatch:/);
  assert.match(workflowSource,/company-development-unity-runtime/);
});

test('runtime smoke never sends gameplay input before the generated seed runtime is ready',()=>{
  assert.match(runtimeSmokeSource,/runtime_ready_timeout=false/);
  assert.match(runtimeSmokeSource,/gameplay_input_delivered=false/);
  assert.match(runtimeSmokeSource,/DEVELOPMENT_SEED_BOOT_TIMEOUT/);
  const readyGate=runtimeSmokeSource.indexOf('if [[ "$boot_observed" == "true" || "$seed_technical" != "true" ]]');
  const firstTap=runtimeSmokeSource.indexOf('adb shell input tap "$center_x" "$primary_y"');
  assert.ok(readyGate>=0,'runtime-ready input gate missing');
  assert.ok(firstTap>readyGate,'gameplay input must be gated behind runtime-ready evidence');
});

test('runtime smoke launches the exact APK activity and fails fast on missing or exited process',()=>{
  assert.match(runtimeSmokeSource,/launchable-activity: name=/);
  assert.match(runtimeSmokeSource,/adb shell am start -W -n "\$launch_component"/);
  assert.doesNotMatch(runtimeSmokeSource,/adb shell monkey/);
  assert.match(runtimeSmokeSource,/process_observed_after_launch=false/);
  assert.match(runtimeSmokeSource,/launch_process_missing=true/);
  assert.match(runtimeSmokeSource,/process_exited_before_runtime_ready=true/);
  assert.match(runtimeSmokeSource,/APK_LAUNCH_PROCESS_MISSING/);
  assert.match(runtimeSmokeSource,/APK_PROCESS_EXITED_BEFORE_RUNTIME_READY/);
  assert.match(runtimeSmokeSource,/JAEWOON_TECH_BOOT/);
  assert.match(runtimeSmokeSource,/JAEWOON_TECH_ACTION/);
  assert.match(runtimeSmokeSource,/JAEWOON_TECH_SAVE/);
  assert.match(runtimeSmokeSource,/JAEWOON_TECH_METRIC/);
  assert.match(runtimeSmokeSource,/ONE_EXACT_RUNTIME_SESSION_F1_THROUGH_F8/);
  assert.match(runtimeSmokeSource,/screen-before-input\.png/);
  assert.match(runtimeSmokeSource,/screen-after-input\.png/);
  assert.match(runtimeSmokeSource,/UNITY_FOUNDATION_F1_F8_SINGLE_RUNTIME=/);
  assert.match(runtimeSmokeSource,/UNITY_F9_RUNTIME_REPLAY=NO/);
});

test('non-seed Unity games bind Android platform metrics without pretending seed-only logs exist',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'jaewoon-unity-evidence-'));
  const project=path.join(root,'project');
  fs.mkdirSync(path.join(project,'Assets'),{recursive:true});
  fs.mkdirSync(path.join(project,'Packages'),{recursive:true});
  fs.mkdirSync(path.join(project,'ProjectSettings'),{recursive:true});
  const sha='a'.repeat(64), commit='b'.repeat(40), tree='c'.repeat(40);
  const build=path.join(root,'build.json'), runtime=path.join(root,'runtime.json'), independent=path.join(root,'independent.json'), output=path.join(root,'evidence.json');
  fs.writeFileSync(build,JSON.stringify({sha256:sha,sourceCommit:commit,sourceTreeSha:tree,runId:17}));
  fs.writeFileSync(runtime,JSON.stringify({state:'PASS',runtime:'PASS',qaPassEligibleRuntimeEvidence:true,apkSha256:sha,buildSourceCommit:commit,sourceTreeSha:tree,gameplayInputDelivered:true,updateInstallPassed:true,developmentSeedRuntime:{required:false,pass:true},blackBoxFoundation:{version:1,mode:'ONE_EXACT_RUNTIME_SESSION_F1_THROUGH_F8',singleRuntimeSession:true,runtimeReplayForF9Required:false,foundationPass:true,visualDeltaObserved:true,foregroundActivityObserved:true,floors:{F1:{state:'PASS'},F2:{state:'PASS'},F3:{state:'PASS'},F4:{state:'PASS'},F5:{state:'PASS'},F6:{state:'PASS'},F7:{state:'DEFER_TO_MULTIPLAYER_APPLICABILITY'},F8:{state:'PASS'}}},androidPerformance:{provider:'ANDROID_DUMPSYS_GFXINFO_SURFACEFLINGER_MEMINFO',graphicsFrameStatsObserved:true,totalFramesRendered:120,jankyFrames:3,jankyFrameRatePct:2.5,memoryTotalPssBytes:67108864,sampleCount:2,pass:true}}));
  fs.writeFileSync(independent,JSON.stringify({state:'PASS',independentQa:'PASS',independent:true,apkSha256:sha,buildSourceCommit:commit,sourceTreeSha:tree,checks:{processLaunch:'PASS',rapidInputStress:'PASS',backgroundResume:'PASS',processAliveAfterStress:'PASS',fatalCrashScan:'PASS',screenshotCaptured:'PASS'}}));
  const args=[evidenceTool,'--game-id=existing-game',`--build-info=${build}`,`--runtime=${runtime}`,`--independent=${independent}`,`--project=${project}`,`--output=${output}`];
  const pass=spawnSync(process.execPath,args,{encoding:'utf8'});
  assert.equal(pass.status,0,pass.stderr||pass.stdout);
  const evidence=JSON.parse(fs.readFileSync(output,'utf8'));
  assert.equal(evidence.state,'PASS');
  assert.equal(evidence.realEvidence.evidenceMode,'ANDROID_PLATFORM_BLACK_BOX');
  assert.equal(evidence.realEvidence.platformMetricsPass,true);
  assert.equal(evidence.realEvidence.seedRuntimeRequired,false);
  assert.equal(evidence.coverage.ANDROID_FPS_FRAME_STABILITY.totalFramesRendered,120);
  assert.equal(evidence.coverage.SAVE_LOAD_UPDATE_COMPATIBILITY.saveSignalObserved,null);

  const missing=JSON.parse(fs.readFileSync(runtime,'utf8'));
  delete missing.androidPerformance;
  fs.writeFileSync(runtime,JSON.stringify(missing));
  const fail=spawnSync(process.execPath,args,{encoding:'utf8'});
  assert.equal(fail.status,2,fail.stderr||fail.stdout);
  assert.match(fail.stdout,/UNITY_PLATFORM_METRICS=FAIL/);
  assert.equal(JSON.parse(fs.readFileSync(output,'utf8')).state,'FAIL');
});

test('Unity checkpoint cannot promote child job success when canonical evidence binding fails',()=>{
  assert.match(workflowSource,/echo "passed=false" >> "\$GITHUB_OUTPUT"[\s\S]*company-development-unity-evidence\.mjs[\s\S]*echo "passed=true" >> "\$GITHUB_OUTPUT"/);
  assert.match(workflowSource,/CANONICAL_PASS: \$\{\{ steps\.canonical\.outputs\.passed \}\}/);
  assert.match(workflowSource,/CANONICAL_OUTCOME: \$\{\{ steps\.canonical\.outcome \}\}/);
  assert.match(workflowSource,/const canonicalEvidenceBound=yes\(process\.env\.CANONICAL_PASS\)&&process\.env\.CANONICAL_OUTCOME==='success'/);
  assert.match(workflowSource,/const runtime=rawRuntime&&canonicalEvidenceBound,qa=rawQa&&canonicalEvidenceBound,regression=rawRegression&&canonicalEvidenceBound/);
  assert.match(workflowSource,/code:canonicalEvidenceBound\?'STAGE_NOT_PASSED':'CANONICAL_EVIDENCE_NOT_BOUND'/);
  assert.match(workflowSource,/unityCanonicalEvidenceBound:canonicalEvidenceBound/);
});

test('Unity runtime captures exact process, visible surface, input and platform metrics for every APK',()=>{
  assert.match(runtimeSmokeSource,/if \[\[ "\$launch_command_pass" == "true" \]\]; then[\s\S]*process_observed_after_launch=true/);
  assert.match(runtimeSmokeSource,/if \[\[ -n "\$pid" \]\]; then[\s\S]*launch_process_missing=false/);
  assert.match(runtimeSmokeSource,/immersive_mode_confirmations confirmed/);
  assert.match(runtimeSmokeSource,/Viewing full screen\|Got it/);
  assert.match(runtimeSmokeSource,/dumpsys gfxinfo "\$package"/);
  assert.match(runtimeSmokeSource,/dumpsys SurfaceFlinger --list/);
  assert.match(runtimeSmokeSource,/SurfaceView\.\*\(BLAST\)/);
  assert.match(runtimeSmokeSource,/grep -v 'Background for '/);
  assert.match(runtimeSmokeSource,/RequestedLayerState\\\{/);
  assert.match(runtimeSmokeSource,/shlex\.quote\(sys\.argv\[1\]\)/);
  assert.match(runtimeSmokeSource,/adb shell "dumpsys SurfaceFlinger --latency \$surface_layer_quoted"/);
  assert.match(runtimeSmokeSource,/dumpsys meminfo "\$package"/);
  assert.match(runtimeSmokeSource,/ANDROID_DUMPSYS_GFXINFO_SURFACEFLINGER_MEMINFO/);
  assert.match(runtimeSmokeSource,/ANDROID_PLATFORM_METRICS_MISSING/);
  assert.match(runtimeSmokeSource,/qaPassEligibleRuntimeEvidence[^\n]*platform_metrics_pass/);
});

test('F9 exact artifact regression binds prior runtime evidence without replaying F1-F8',()=>{
  assert.match(regressionSource,/Download exact upstream prerelease assets/);
  assert.match(regressionSource,/unity-release-artifact-transport\.mjs/);
  assert.doesNotMatch(regressionSource,/actions\/download-artifact@v4[\s\S]*run-id:/);
  assert.match(regressionSource,/actual.*expected/s);
  assert.match(regressionSource,/SOURCE_REVISION/);
  assert.match(regressionSource,/runtime_run_id/);
  assert.match(regressionSource,/independent_run_id/);
  assert.match(regressionSource,/ONE_EXACT_RUNTIME_SESSION_F1_THROUGH_F8/);
  assert.doesNotMatch(regressionSource,/unity-apk-runtime-smoke\.sh/);
  assert.match(regressionSource,/runtimeReplayPerformed.*False/s);
  assert.match(regressionSource,/regressionPassed.*True/s);
  assert.match(regressionSource,/exactArtifactRegression.*True/s);
});

test('Android SurfaceFlinger receives the exact Unity layer through adb remote-shell parsing',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'unity-surface-shell-'));
  try{
    const bin=path.join(root,'bin');fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin,'adb'),'#!/bin/sh\nshift\nexec /bin/sh -c "$*"\n',{mode:0o755});
    fs.writeFileSync(path.join(bin,'dumpsys'),'#!/usr/bin/env python3\nimport json,sys\nprint(json.dumps(sys.argv[1:]))\n',{mode:0o755});
    const start=runtimeSmokeSource.indexOf('if [[ -n "$surface_layer" ]]; then');
    const end=runtimeSmokeSource.indexOf('\nadb shell dumpsys meminfo',start);
    assert(start>=0&&end>start);
    const block=runtimeSmokeSource.slice(start,end);
    for(const layer of ['9ef2b30 SurfaceView[com.jaewoongames.amusementtycoon/com.unity3d.player.UnityPlayerGameActivity](BLAST)#119',"SurfaceView[owner's game](BLAST)#20"]){
      const result=spawnSync('bash',['-c','surface_layer="$TEST_SURFACE_LAYER"\nout_dir="$TEST_OUTPUT"\n'+block],{encoding:'utf8',env:{...process.env,PATH:bin+path.delimiter+process.env.PATH,TEST_SURFACE_LAYER:layer,TEST_OUTPUT:root}});
      assert.equal(result.status,0,result.stderr);
      assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'surfaceflinger-latency.txt'),'utf8')),['SurfaceFlinger','--latency',layer]);
    }
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Unity validation preserves an existing current-main project and only creates a technical request',()=>{
  assert.match(workflowSource,/direct_request="\.build-requests\/unity\/\$\{GAME_ID\}\.json"/);
  assert.match(workflowSource,/UNITY_EXISTING_SOURCE_BUILD_REQUEST_MISSING/);
  assert.match(workflowSource,/buildMethod:String\(direct\.buildMethod\)\.trim\(\)/);
  assert.match(workflowSource,/applicationId=String\(direct\.applicationId\|\|''\)\.trim\(\)/);
  assert.match(workflowSource,/CHANGE_DETECTION=CURRENT_MAIN_SOURCE_REUSED/);
  const preserve=workflowSource.indexOf('direct_request=".build-requests/unity/${GAME_ID}.json"');
  const bootstrap=workflowSource.indexOf('node tools/company-development-unity-bootstrap.mjs');
  assert.ok(preserve>0&&bootstrap>preserve,'existing current-main source must be considered before bootstrap');
});


test('Unity executor admits source-bind work through the shared platform router and existing bootstrap path',()=>{
  assert.match(routerSource,/TARGET_PLATFORM_SOURCE_BIND/);
  assert.match(routerSource,/TARGET_PLATFORM_TECHNICAL_VALIDATION/);
  assert.match(workflowSource,/project="unity-games\/\$GAME_ID"/);
  assert.match(workflowSource,/node tools\/company-development-unity-bootstrap\.mjs/);
  assert.match(workflowSource,/platformDevelopmentEligible\(item,'UNITY'\)/);
});


test('Unity parent accepts actual runtime verification and reuses the exact build without waiting for a Cloud automatic trigger',()=>{
  assert.match(workflowSource,/select\(\.name=="Install and launch exact APK on matching ARM64 runtime"\)\|\.conclusion/);
  assert.match(workflowSource,/runtime_passed=.*legacy_verify.*success/);
  assert.match(workflowSource,/LEGACY_RUNTIME_VERIFY_CONCLUSION=\$legacy_verify/);
  assert.match(workflowSource,/if: steps\.buildstate\.outputs\.build_passed == 'true' && steps\.buildstate\.outputs\.runtime_passed != 'true'/);
  assert.doesNotMatch(workflowSource,/runtime_passed != 'true' && steps\.plan\.outputs\.reuse_build == 'true'/);
  assert.match(workflowSource,/UNITY_RUNTIME_SMOKE_REUSED_EXACT_BUILD=/);
  assert.match(workflowSource,/UNITY_RUNTIME_SMOKE_DISPATCHED_MANUAL=/);
  const reuseExact=workflowSource.indexOf('UNITY_RUNTIME_SMOKE_REUSED_EXACT_BUILD=');
  const manualDispatch=workflowSource.indexOf('jq -n --arg ref main --arg run "$BUILD_RUN"');
  assert.ok(reuseExact>0&&manualDispatch>reuseExact,'exact build runtime must be considered before manual dispatch');
});


test('Unity runtime dispatch shell reuses exact build runs and immediately dispatches Cloud checkpoints without accepting skipped evidence',()=>{
  const block=workflowSource.split('      - name: Resume target-platform runtime only from its failed checkpoint\n')[1]?.split('\n      - name:')[0];
  assert.ok(block,'runtime checkpoint step must exist');
  const script=block.split('        run: |\n')[1].split('\n').map(line=>line.startsWith('          ')?line.slice(10):line).join('\n');
  const syntax=spawnSync('bash',['-n'],{input:script,encoding:'utf8'});
  assert.equal(syntax.status,0,syntax.stderr);
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'unity-runtime-dispatch-'));
  try{
    const bin=path.join(root,'bin');
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin,'gh'),String.raw`#!/usr/bin/env node
const fs=require('fs');
const args=process.argv.slice(2);
const config=JSON.parse(process.env.MOCK_CONFIG);
const log=process.env.MOCK_LOG;
fs.appendFileSync(log,JSON.stringify(args)+'\n');
const api='repos/example/repository/actions/workflows/unity-android-runtime-smoke.yml';
const endpoint=args.find(value=>value.startsWith('repos/'));
if(args.includes('POST')){
  const payload=JSON.parse(fs.readFileSync(0,'utf8'));
  if(payload.ref!=='main'||payload.inputs?.run_id!==process.env.BUILD_RUN)process.exit(91);
  fs.writeFileSync(process.env.MOCK_DISPATCHED,'yes');
  console.log('{}');
}else if(endpoint===api+'/runs?per_page=100'){
  if(config.discoveryFailure)process.exit(42);
  console.log(JSON.stringify({workflow_runs:config.runs}));
}else if(endpoint===api+'/runs?branch=main&event=workflow_dispatch&per_page=20'){
  if(args.includes('--jq'))console.log(800);
  else console.log(JSON.stringify({workflow_runs:[
    {id:950,display_title:'Unity Android Runtime Smoke 99999'},
    {id:901,display_title:'Unity Android Runtime Smoke '+process.env.BUILD_RUN}
  ]}));
}else if(endpoint?.startsWith('repos/example/repository/actions/runs/')){
  console.log('completed\t'+(config.result||'success'));
}else if(args[0]==='run'&&args[1]==='download'){
  process.exit(1);
}else{
  console.error('unexpected gh invocation '+JSON.stringify(args));
  process.exit(92);
}
`,{mode:0o755});
    fs.writeFileSync(path.join(bin,'sleep'),'#!/bin/sh\nprintf "%s\\n" "$*" >> "$MOCK_SLEEP_LOG"\n',{mode:0o755});
    const row=(id,build,status,event='workflow_dispatch',conclusion=null)=>({id,display_title:'Unity Android Runtime Smoke '+build,status,event,conclusion});
    const cases=[
      {name:'active manual',runs:[row(410,12345,'in_progress'),row(799,54321,'queued')],expected:410,dispatch:false},
      {name:'active automatic',runs:[row(420,12345,'queued','workflow_run')],expected:420,dispatch:false},
      {name:'successful exact checkpoint',runs:[row(430,12345,'completed','workflow_dispatch','success')],expected:430,dispatch:false},
      {name:'fresh Cloud build',runs:[row(790,54321,'in_progress'),row(791,12345,'completed','workflow_dispatch','skipped'),row(792,12345,'completed','workflow_dispatch','failure'),row(793,12345,'completed','workflow_dispatch','cancelled')],expected:901,dispatch:true},
      {name:'reused failed runtime',runs:[row(440,12345,'in_progress')],expected:440,dispatch:false,result:'failure',status:6},
      {name:'API failure',runs:[],discoveryFailure:true,dispatch:false,status:42},
    ];
    for(const [index,scenario] of cases.entries()){
      const output=path.join(root,index+'.output');
      const log=path.join(root,index+'.log');
      const sleepLog=path.join(root,index+'.sleeps');
      const dispatched=path.join(root,index+'.dispatch');
      const run=spawnSync('bash',['-c',script],{encoding:'utf8',env:{...process.env,PATH:bin+path.delimiter+process.env.PATH,BUILD_RUN:'12345',GITHUB_REPOSITORY:'example/repository',GITHUB_OUTPUT:output,MOCK_CONFIG:JSON.stringify(scenario),MOCK_LOG:log,MOCK_SLEEP_LOG:sleepLog,MOCK_DISPATCHED:dispatched}});
      assert.equal(run.status,scenario.status||0,scenario.name+': '+run.stderr+run.stdout);
      assert.equal(fs.existsSync(dispatched),scenario.dispatch,scenario.name);
      assert.equal(fs.existsSync(sleepLog)?fs.readFileSync(sleepLog,'utf8'):'','',scenario.name+' must not wait for a missing automatic trigger');
      const calls=fs.readFileSync(log,'utf8').trim().split('\n').map(JSON.parse);
      assert.equal(calls.filter(args=>args.includes('POST')).length,scenario.dispatch?1:0,scenario.name);
      if(scenario.expected)assert.match(fs.readFileSync(output,'utf8'),new RegExp('run_id='+scenario.expected+'\\n'),scenario.name);
      else assert.equal(fs.existsSync(output),false,'failed discovery must not claim a runtime checkpoint');
    }
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('legacy Genymotion runtime gate cannot block canonical Redroid validation when credentials are absent',()=>{
  assert.match(cloudBuildSource,/Resolve legacy Genymotion gate availability/);
  assert.match(cloudBuildSource,/LEGACY_GENYMOTION_GATE=SKIPPED_CREDENTIALS_UNAVAILABLE/);
  assert.match(cloudBuildSource,/CANONICAL_ANDROID_RUNTIME_GATE=UNITY_ANDROID_RUNTIME_SMOKE_REDROID/);
  assert.match(cloudBuildSource,/outputs:[\s\S]*verified:\s*\$\{\{ steps\.verify\.outputs\.verified \}\}/);
  assert.match(cloudBuildSource,/if:\s*steps\.legacy\.outputs\.enabled == 'true'[\s\S]*Prepare matching ARM64 Android 16 cloud runtime/);
  assert.match(cloudBuildSource,/id:\s*verify[\s\S]*verified=true/);
  assert.match(cloudBuildSource,/publish:[\s\S]*needs\.android16-install-gate\.outputs\.verified == 'true'/);
  assert.match(runtimeWorkflowSource,/workflow_run:[\s\S]*workflows: \["Unity Hybrid Android Build"\]/);
  assert.match(runtimeWorkflowSource,/runs-on: ubuntu-24\.04-arm/);
  assert.match(runtimeWorkflowSource,/redroid\/redroid:16\.0\.0_64only-latest/);
});


test('Unity cloud APK build keeps LFS but avoids full Git history',()=>{
  assert.match(cloudBuildSource,/name: Checkout[\s\S]*fetch-depth:\s*1[\s\S]*fetch-tags:\s*false[\s\S]*lfs:\s*true/);
  assert.doesNotMatch(cloudBuildSource,/fetch-depth:\s*0/);
});


test('independent Unity QA launches exact APK activity without monkey',()=>{
  assert.match(independentQaSource,/launchable-activity: name=/);
  assert.match(independentQaSource,/launch_component="\$package\/\$activity"/);
  assert.match(independentQaSource,/adb shell am start -W -n "\$launch_component"/);
  assert.doesNotMatch(independentQaSource,/adb shell monkey/);
});


test('independent Unity QA ignores unrelated Redroid system crashes and scopes fatal scan to the tested app',()=>{
  assert.match(independentQaSource,/awk -v pid="\$pid_after" '\$3==pid \{print\}'/);
  assert.match(independentQaSource,/app-logcat\.txt/);
  assert.match(independentQaSource,/grep -Eiq 'FATAL EXCEPTION\|Fatal signal' qa-artifacts\/unity-independent-qa\/app-logcat\.txt/);
  assert.match(independentQaSource,/ANR in \$\{package\}\|Process \$\{package\} .* has died/);
  assert.doesNotMatch(independentQaSource,/FATAL EXCEPTION\|ANR in \$\{package\}\|Fatal signal\|Process/);
});


test('Unity canonical runtime starts from native source and tracked build requests',()=>{
  assert.match(workflowSource,/push:[\s\S]*'\.build-requests\/unity\/\*\*'/);
  assert.match(workflowSource,/push:[\s\S]*'unity-games\/\*\*'/);
  assert.match(workflowSource,/RUNTIME_THEN_INDEPENDENT_QA_THEN_REGRESSION=ENABLED/);
});


test('Unity runtime has no retired validation-cycle dependency',()=>{
  assert.doesNotMatch(workflowSource,/company-development-validation-cycle\.mjs/);
  assert.doesNotMatch(workflowSource,/cycle-status\.json/);
  assert.doesNotMatch(workflowSource,/steps\.meeting\.outputs\.state/);
  assert.doesNotMatch(workflowSource,/Revalidate shared worker context before Unity checkpoint/);
  assert.match(workflowSource,/company-shared-context-unity-plan\.json/);
  assert.match(workflowSource,/const canonical=process\.env\.MEETING_STATE\|\|'WAITING_TARGET_PLATFORM_VALIDATION'/);
});


test('independent Unity QA does not launch a duplicate F9 regression run',()=>{
  assert.doesNotMatch(independentQaSource,/gh workflow run unity-android-regression\.yml/);
  assert.match(independentQaSource,/UNITY_ANDROID_REGRESSION_DISPATCH_OWNER=PARENT_EXACT_CANDIDATE/);
  assert.match(independentQaSource,/UNITY_DUPLICATE_F9_RUNTIME_DISPATCH=NO/);
  assert.match(workflowSource,/runtime_run_id/);
  assert.match(workflowSource,/independent_run_id/);
});


test('Unity hybrid Android builds are not globally serialized by internal policy',()=>{
  assert.doesNotMatch(hybridWorkflowSource,/^concurrency:\s*\n\s*group:\s*unity-hybrid-android-build\s*$/m);
});


test('Unity hybrid router avoids full repository history and fetches only the event before commit when needed',()=>{
  assert.match(hybridWorkflowSource,/name: Checkout[\s\S]*fetch-depth:\s*1[\s\S]*fetch-tags:\s*false/);
  assert.doesNotMatch(hybridWorkflowSource,/fetch-depth:\s*0/);
  assert.match(hybridWorkflowSource,/git fetch --no-tags --depth=1 origin "\$before"/);
});


test('distinct Unity games persist immediately without a cohort fan-in or global writer lock',()=>{
  assert.doesNotMatch(workflowSource,/^concurrency:\s*\n\s*group:\s*company-development-unity-runtime\s*$/m);
  assert.doesNotMatch(workflowSource,/\n  persist-runtime:\n/);
  assert.doesNotMatch(workflowSource,/group:\s*company-runtime-writer/);
  assert.match(workflowSource,/Persist this game's checkpoint immediately/);
  assert.match(workflowSource,/UNITY_RUNTIME_GAME_PERSIST_OPTIMISTIC_ATTEMPT=/);
  assert.match(workflowSource,/UNITY_RUNTIME_GAME_PERSIST_CONFLICT_RETRY=/);
  assert.match(workflowSource,/git worktree add --force --detach "\$state_dir" origin\/company-runtime/);
  assert.match(workflowSource,/company-development-confirmed-runtime\.yml --repo "\$GITHUB_REPOSITORY" --ref main -f game_id="\$GAME_ID"/);
  assert.match(workflowSource,/COHORT_PERSIST_FAN_IN=DISABLED/);
  assert.doesNotMatch(workflowSource,/git rebase origin\/company-runtime/);
});


test('Unity runtime does not reapply shared cross-platform step filtering after platform eligibility',()=>{
  assert.match(workflowSource,/return platformDevelopmentEligible\(item,'UNITY'\);/);
  assert.doesNotMatch(workflowSource,/const step=String\(item\.currentStep\|\|''\)\.toUpperCase\(\);[\s\S]*WAITING_UNITY_REVALIDATION/);
});


test('Unity direct native changes override unrelated representative canary selection',()=>{
  assert.match(workflowSource,/REQUESTED_GAME_IDS/);
  assert.match(workflowSource,/test\("\^\\\\\.build-requests\/unity\/\[\^\/\]\+\\\\\.json\$"\)/);
  assert.match(workflowSource,/test\("\^unity-games\/\[\^\/\]\+\/"\)/);
  assert.match(workflowSource,/gh api "repos\/\$GITHUB_REPOSITORY\/commits\/\$GITHUB_SHA"/);
  assert.match(workflowSource,/const requestedRows=requestedIds\.length\?rows\.filter/);
  assert.match(workflowSource,/const canary=requestedIds\.length\?null:/);
  assert.match(workflowSource,/const selected=requestedIds\.length\?requestedRows\.slice/);
});

test('Unity prepare uses slim ingress capacity while technical validation stays on the full runner pool',()=>{
  assert.match(workflowSource,/\n  prepare:\n[\s\S]*?runs-on:\s*ubuntu-slim/);
  assert.match(workflowSource,/\n  unity-technical-validation:\n[\s\S]*?runs-on:\s*ubuntu-latest/);
});

test('Unity child QA dispatch reuses an active exact immutable-build run instead of duplicating runner work',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-unity-runtime.yml',import.meta.url),'utf8');
  assert.match(workflow,/UNITY_ANDROID_INDEPENDENT_QA_REUSE_ACTIVE=/);
  assert.match(workflow,/UNITY_ANDROID_REGRESSION_REUSE_ACTIVE=/);
  assert.match(workflow,/\.status=="queued" or \.status=="pending" or \.status=="in_progress" or \.status=="requested"/);
  assert.match(workflow,/per_page=100/);
});


test('Unity BUILD_UP settlement requires exact source tree plus runtime independent QA and regression',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-unity-runtime.yml',import.meta.url),'utf8');
  assert.match(workflow,/UNITY_CHECKPOINT_SOURCE_TREE_SHA=/);
  assert.match(workflow,/sourceRootTreeSha:process\.env\.SOURCE_TREE_SHA/);
  assert.match(workflow,/authority:'unity-exact-apk-runtime-qa-regression'/);
  assert.match(workflow,/Settle exact Vibe Unity BUILD_UP task after runtime QA and regression/);
  assert.match(workflow,/candidate-awaiting-unity-runtime-qa/);
  assert.match(workflow,/const exactTreeMarker='unity-runtime-await-source-tree:'\+sourceTree/);
  assert.match(workflow,/if\(!evidence\.includes\(exactTreeMarker\)\)continue/);
  assert.match(workflow,/unity-runtime-pass,unity-independent-qa-pass,unity-regression-pass/);
  assert.match(workflow,/unity-runtime-source-tree:\$\{runtime_source_tree_sha\}/);
  assert.match(workflow,/UNITY_BUILD_UP_VIBE_TASK_PASS=/);
});

test('Unity exact-candidate validation never demotes an existing external publication state',()=>{
  const checkpointAt=workflowSource.indexOf("const row={");
  const persistAt=workflowSource.indexOf("Persist this game's checkpoint immediately");
  assert.ok(checkpointAt>0&&persistAt>checkpointAt);
  const checkpoint=workflowSource.slice(checkpointAt,persistAt);
  assert.doesNotMatch(checkpoint,/unityPublicReleaseReady:false/);
  assert.doesNotMatch(checkpoint,/unityPublicRelease:false/);
  assert.match(checkpoint,/UNITY_PUBLIC_RELEASE_MUTATION=NO/);
  assert.match(workflowSource,/Object\.assign\(item,mergedUpdate\)/);
});


test('Unity actual native source generation consumes 100% verified APK black-box learning',()=>{
  assert.match(workflowSource,/VIBE2_LEARNING_RUNTIME_BRANCH: vibe2-learning-runtime/);
  assert.match(workflowSource,/vibe3-task-playbooks\.json/);
  assert.match(workflowSource,/UNITY_VERIFIED_EXTERNAL_LEARNING_MEMORY=READY/);
  assert.match(workflowSource,/--playbooks=\/tmp\/vibe3-task-playbooks\.json/);
  assert.match(workflowSource,/UNITY_CURRENT_MAIN_SOURCE_REUSE_INVALIDATED=VERIFIED_EXTERNAL_LEARNING_OR_GENERATOR_STALE/);
  const source=fs.readFileSync(generatorSource,'utf8');
  assert.match(source,/verifiedExternalLearningFromPlaybooks/);
  assert.match(source,/UNITY_VERIFIED_EXTERNAL_LEARNING_TASK_COVERAGE_INVALID/);
  assert.match(source,/VerifiedExternalLearningPrinciples/);
  assert.match(source,/ApplyVerifiedExternalLearningFeedback/);
  assert.match(source,/verifiedExternalLearningCoveragePct:verifiedExternalLearning\.coveragePct/);
});


test('Unity APK principles drive concrete gameplay UX instead of hash-based motion',()=>{
  const source=fs.readFileSync(generatorSource,'utf8');
  assert.match(source,/unityGameDevelopmentProfile/);
  assert.match(source,/VerifiedGameDevelopmentPrinciples/);
  assert.match(source,/UseImmediateVisibleFeedback/);
  assert.match(source,/UseContextualOnboarding/);
  assert.match(source,/UsePersistentActionControls/);
  assert.match(source,/입력 반영/);
  assert.match(source,/핵심 조작을 눌러 바로 플레이/);
  assert.doesNotMatch(source,/float learningPulse/);
  assert.doesNotMatch(source,/verifiedLearningSignal/);
});


test('Unity game-development APK principles cannot remain unmapped',()=>{
  const source=fs.readFileSync(generatorSource,'utf8');
  assert.match(source,/UNITY_GAME_DEVELOPMENT_PRINCIPLE_UNMAPPED/);
  assert.match(source,/VISIBLE_PROGRESSION_RISK_CUE/);
  assert.match(source,/UseVisibleProgressionRiskCue/);
  assert.match(source,/도전 전 상태 확인/);
  assert.match(source,/mappings:Object\.freeze\(mappings\)/);
});


test('portable touch-look learning maps to immediate Unity feedback instead of aborting every generator lane',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'jaewoon-unity-touch-look-'));
  const sandbox=path.join(root,'sandbox');
  fs.mkdirSync(path.join(sandbox,'tools'),{recursive:true});
  fs.copyFileSync(generatorSource,path.join(sandbox,'tools/company-development-unity-bootstrap.mjs'));
  const {baseline,playbooks}=fixtures(root,true);
  const data=JSON.parse(fs.readFileSync(playbooks,'utf8'));
  const principle='id=touch-look-produces-immediate-spatial-feedback; scope=mobile-3d-controls; lesson=A short horizontal touch gesture on the first-person play surface produced an immediate, clearly visible camera-orientation change while the movement and action HUD remained available.; apply=Validate look gestures with before/after scene framing while preserving consistent movement and action affordances.';
  for(const task of Object.values(data.taskTypes))task.reuse[0].distilledApplicationPrinciples=[principle];
  fs.writeFileSync(playbooks,JSON.stringify(data));
  const run=spawnSync(process.execPath,['tools/company-development-unity-bootstrap.mjs','--game-id=seed-action-survival-rogu-echoes-of-the-lost-star','--game-name=Echoes of the Lost Star',`--baseline=${baseline}`,`--playbooks=${playbooks}`],{cwd:sandbox,encoding:'utf8'});
  assert.equal(run.status,0,run.stderr||run.stdout);
  const meta=JSON.parse(fs.readFileSync(path.join(sandbox,'unity-games/seed-action-survival-rogu-echoes-of-the-lost-star/prototype-source.json'),'utf8'));
  assert.equal(meta.verifiedExternalGameDevelopmentProfile.immediateVisibleFeedback,true);
  assert.deepEqual(meta.verifiedExternalGameDevelopmentProfile.mappings[0].behaviors,['IMMEDIATE_VISIBLE_FEEDBACK']);
});


test('Unity runs exact F0-F9, deploys the F9 artifact, and starts the next cycle without publication gating',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-unity-runtime.yml',import.meta.url),'utf8');
  assert.match(workflow,/const f0ToF9=\{/);
  for(const floor of ['F0','F1','F2','F3','F4','F5','F6','F7','F8','F9']) assert.match(workflow,new RegExp(floor+'\\s*:'));
  assert.match(workflow,/unityF0ThroughF9Evidence:f0ToF9/);
  assert.match(workflow,/unityF9ReleaseRegressionPassed:internalReady/);
  assert.match(workflow,/const performanceCoverage=technical\?\.coverage\?\.ANDROID_FPS_FRAME_STABILITY\|\|\{\}/);
  assert.match(workflow,/const unityMobilePerformancePassed=Boolean\(/);
  assert.match(workflow,/totalFramesRendered/);
  assert.match(workflow,/crypto\.createHash\('sha256'\)/);
  assert.match(workflow,/exactGeneratedAssetIdentityPassed:generatedAssetIdentityPassed/);
  assert.match(workflow,/unityGeneratedAssetRuntimeBindingPassed/);
  assert.match(workflow,/unityAssetRuntimeBindingEvidence/);
  assert.match(workflow,/UNITY_GENERATED_ASSET_RUNTIME_BINDING=/);
  assert.match(workflow,/Publish exact F9 Unity APK to canonical internal release target/);
  assert.match(workflow,/gh release create "\$tag"[\s\S]*--target "\$SOURCE_REVISION"[\s\S]*--prerelease/);
  assert.match(workflow,/UNITY_F9_CANONICAL_SOURCE_ARTIFACT_MATCH=YES/);
  assert.match(workflow,/UNITY_F9_VERIFIED=/);
  assert.match(workflow,/PLATFORM_F9_VERIFIED=UNITY:/);
  assert.match(workflow,/PLATFORM_PUBLISH_OR_DEPLOY_DISPATCHED=UNITY:/);
  assert.match(workflow,/UNITY_F9_DEPLOYED_INTERNAL_OR_CLOSED_BUILD=/);
  assert.match(workflow,/UNITY_F9_PUBLICATION_REPAIR_REQUIRED=/);
  assert.match(workflow,/publication-repair:/);
  assert.match(workflow,/publication_retry_only/);
  assert.match(workflow,/UNITY_F9_PUBLICATION_RETRY_IDENTITY=PASS/);
  assert.match(workflow,/unityCanonicalPublishRetry/);
  assert.match(workflow,/UNITY_F9_PUBLICATION_STATE_PERSISTED=/);
  assert.match(workflow,/UNITY_F9_PUBLICATION_AUTOMATIC_REDISPATCH=YES/);
  assert.match(workflow,/UNITY_PUBLICATION_RETRY_BLOCKS_NEXT_EVOLUTION=NO/);
  assert.match(workflow,/UNITY_F9_CANONICAL_PUBLISH_BLOCKS_NEXT_CYCLE=NO/);
  assert.match(workflow,/UNITY_PUBLICATION_OUTCOME_BLOCKS_EVOLUTION=NO/);
  assert.match(workflow,/UNITY_NEXT_EVOLUTION_CYCLE_DISPATCHED=/);
  assert.match(workflow,/PLATFORM_NEXT_EVOLUTION_CYCLE_DISPATCHED=UNITY:/);
  assert.match(workflow,/UNITY_NEXT_EVOLUTION_CYCLE_DEPENDS_ON_PUBLICATION_OUTCOME=NO/);
  assert.match(workflow,/unity-f0-f9-verified,unity-f9-pass,unity-f9-nonterminal/);
  assert.match(workflow,/singleRuntimeSessionF1ThroughF8:true/);
  assert.match(workflow,/f9RuntimeReplayRequired:false/);
  assert.match(workflow,/F0_TO_F8_EVIDENCE_FAN_IN_NO_RUNTIME_REPLAY/);
  assert.match(workflow,/UNITY_F9_RUNTIME_REPLAY=NO/);
});

// 정상 배포·재시도 두 경로 모두 이전 완주를 보존하고 동일 빌드는 한 번만 기록한다.
test('Unity publication and repair preserve unique completed history on retry and next cycle',()=>{
  const blocks=[...workflowSource.matchAll(/          if\(pass\)\{\n            const evidence=\{\.\.\.(retry|record),[\s\S]*?item\.unityCanonicalReleaseEvidence=evidence;\n          \}/g)];
  assert.equal(blocks.length,2);
  for(const match of blocks){
    const item={unityCanonicalReleaseEvidence:{sourceRevision:'older',artifactIdentity:'old',published:true,publishedAt:'before'}};
    const publication={sourceRevision:'new',artifactIdentity:'new',workflowRunId:1};
    const execute=pass=>runInNewContext(match[0],{pass,item,retry:publication,record:publication,stamp:'now'});
    execute(false);
    assert.equal(item.unityCanonicalPublishHistory,undefined);
    execute(true);execute(true);
    assert.equal(item.unityCanonicalPublishHistory.length,2);
    publication.sourceRevision='next';publication.artifactIdentity='next';
    execute(true);
    assert.equal(item.unityCanonicalPublishHistory.length,3);
    execute(false);
    assert.equal(item.unityCanonicalPublishHistory.length,3);
    assert.equal(item.unityCanonicalPublishHistory[1].publishedAt,'now');
  }
});

test('Unity native generator binds real Animator IK motion evidence without claiming placeholder success',()=>{
  const source=fs.readFileSync(generatorSource,'utf8');
  assert.match(source,/public sealed class JaewoonNativeMotionActor/);
  assert.match(source,/private void OnAnimatorIK\(int layerIndex\)/);
  assert.match(source,/FindObjectsByType<Animator>\(FindObjectsSortMode\.None\)/);
  assert.match(source,/JAEWOON_UNITY_NATIVE_MOTION_BIND status=/);
  assert.match(source,/JAEWOON_UNITY_NATIVE_MOTION=START/);
  assert.match(source,/FOOT_SLIDE_EXCEEDED/);
  assert.match(source,/MOBILE_FRAME_FLOOR_30_FAILED/);
  assert.match(source,/FootSlideNormalizedMax = 0\.035f/);
  assert.match(source,/JaewoonMotionContact\(\)/);
  assert.match(source,/JaewoonMotionHit\(\)/);
});

test('Unity runtime has no whole-game top-level serialization',()=>{
  const header=workflowSource.slice(0,workflowSource.indexOf('\njobs:\n'));
  assert.doesNotMatch(header,/\nconcurrency:\n/);
});
