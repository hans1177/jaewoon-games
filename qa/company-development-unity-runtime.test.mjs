import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const generatorSource=process.env.UNITY_BOOTSTRAP_SOURCE||path.resolve('tools/company-development-unity-bootstrap.mjs');
const workflowSource=fs.readFileSync(path.resolve('.github/workflows/company-development-unity-runtime.yml'),'utf8');
const expectedUnityEditorVersion='6000.6.0f1';
const expectedUnityEditorRevision='f7f8ed4d1e24';
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
  fs.writeFileSync(baseline,JSON.stringify({content:{identity:'Distinct test identity',coreLoop:['act','feedback','choice','reward']}}));
  fs.writeFileSync(web,JSON.stringify({gameId:'fixture',pass,validated:pass,state:pass?'PASS':'FAIL',realEvidenceExists:pass}));
  return {baseline,web};
}

test('creates one distinct cloud-build-ready Unity technical prototype per promoted seed from real Web PASS evidence',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'jaewoon-unity-bootstrap-'));
  const {baseline,web}=fixtures(root,true);
  for(const [id,name,mode] of cases){
    const sandbox=path.join(root,'sandbox-'+mode);
    fs.mkdirSync(path.join(sandbox,'tools'),{recursive:true});
    fs.copyFileSync(generatorSource,path.join(sandbox,'tools/company-development-unity-bootstrap.mjs'));
    const run=spawnSync(process.execPath,['tools/company-development-unity-bootstrap.mjs',`--game-id=${id}`,`--game-name=${name}`,`--baseline=${baseline}`,`--web-evidence=${web}`,`--output=unity-games/${id}`],{cwd:sandbox,encoding:'utf8'});
    assert.equal(run.status,0,run.stderr||run.stdout);
    const project=path.join(sandbox,'unity-games',id);
    const meta=JSON.parse(fs.readFileSync(path.join(project,'prototype-source.json'),'utf8'));
    const manifest=JSON.parse(fs.readFileSync(path.join(project,'Packages','manifest.json'),'utf8'));
    const projectVersion=fs.readFileSync(path.join(project,'ProjectSettings','ProjectVersion.txt'),'utf8');
    const buildScript=fs.readFileSync(path.join(project,'Assets','Editor','SeedAndroidBuild.cs'),'utf8');
    const runtimeScript=fs.readFileSync(path.join(project,'Assets','Scripts','SeedTechnicalPrototype.cs'),'utf8');
    assert.equal(meta.category,mode);
    assert.equal(meta.webEvidenceBound,true);
    assert.equal(meta.releaseAuthority,false);
    assert.equal(meta.purpose,'UNITY_ANDROID_TECHNICAL_VALIDATION');
    assert.equal(meta.unityEditorVersion,expectedUnityEditorVersion);
    assert.equal(meta.unityEditorRevision,expectedUnityEditorRevision);
    assert.equal(manifest.dependencies['com.unity.modules.imgui'],'1.0.0');
    assert.match(buildScript,/SeedAndroidBuild/);
    assert.match(buildScript,/Path\.GetFullPath\(Path\.Combine\(projectRoot, "\.\.", "\.\.", "build", "Android"\)\)/);
    assert.match(buildScript,/AndroidArchitecture\.ARM64 \| AndroidArchitecture\.X86_64/);
    assert.match(runtimeScript,/JAEWOON_TECH_METRIC/);
    assert.match(runtimeScript,/PlayerPrefs/);
    assert.equal(projectVersion.trim(),`m_EditorVersion: ${expectedUnityEditorVersion}\nm_EditorVersionWithRevision: ${expectedUnityEditorVersion} (${expectedUnityEditorRevision})`);
  }
});

test('refuses Unity prototype generation without real Web gameplay PASS',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'jaewoon-unity-block-'));
  const sandbox=path.join(root,'sandbox');
  fs.mkdirSync(path.join(sandbox,'tools'),{recursive:true});
  fs.copyFileSync(generatorSource,path.join(sandbox,'tools/company-development-unity-bootstrap.mjs'));
  const {baseline,web}=fixtures(root,false);
  const run=spawnSync(process.execPath,['tools/company-development-unity-bootstrap.mjs','--game-id=seed-puzzle-chromatic-cascade','--game-name=Chromatic Cascade',`--baseline=${baseline}`,`--web-evidence=${web}`],{cwd:sandbox,encoding:'utf8'});
  assert.notEqual(run.status,0);
  assert.match(run.stderr,/REAL_WEB_GAMEPLAY_PASS_REQUIRED/);
});

test('DEVELOPMENT Unity runtime is serial cloud-only and keeps homepage test publication enabled',()=>{
  assert.match(workflowSource,/max-parallel:\s*1/);
  assert.match(workflowSource,/unity-cloud-android-test\.yml/);
  assert.doesNotMatch(workflowSource,/unity-local-pc-android\.yml/);
  assert.match(workflowSource,/CLOUD_UNITY_BUILD_RUN_ID/);
  assert.match(workflowSource,/homepagePublicationApproved=true/);
  assert.match(workflowSource,/publishTestBuildWhenReady=true/);
  assert.match(workflowSource,/HOMEPAGE_TEST_APK_PUBLISH=YES/);
  assert.match(workflowSource,/sourceTreeSha=tree/);
});

test('discovers dispatched workflow runs with standalone jq instead of invalid gh --jq arguments',()=>{
  assert.equal((workflowSource.match(/--jq --argjson/g)||[]).length,0);
  assert.ok((workflowSource.match(/\| jq -r --argjson/g)||[]).length>=3);
});