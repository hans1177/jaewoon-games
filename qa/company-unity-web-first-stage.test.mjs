// 파일명: qa/company-unity-web-first-stage.test.mjs

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {execFileSync} from 'node:child_process';

const repo=process.cwd();
const tool=path.join(repo,'tools/company-unity-web-first-stage.mjs');

test('Unity Web first-stage request binds canonical Unity source and Web output',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'unity-web-first-stage-'));
  const old=process.cwd();
  try{
    fs.cpSync(path.join(repo,'company-learning'),path.join(tmp,'company-learning'),{recursive:true});
    const root=path.join(tmp,'unity-games','sample-game');
    fs.mkdirSync(path.join(root,'Assets','Scripts'),{recursive:true});
    fs.mkdirSync(path.join(root,'Assets','Editor'),{recursive:true});
    fs.mkdirSync(path.join(root,'Packages'),{recursive:true});
    fs.mkdirSync(path.join(root,'ProjectSettings'),{recursive:true});
    fs.writeFileSync(path.join(root,'Assets','Scripts','Game.cs'),'using UnityEngine; public class Game:MonoBehaviour {}\n');
    fs.writeFileSync(path.join(root,'Assets','Editor','Build.cs'),'public static class SeedAndroidBuild { public static void BuildWeb(){} }\n');
    fs.writeFileSync(path.join(root,'Packages','manifest.json'),'{}\n');
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
    assert.equal(req.postGateAction,'EVALUATE_UPPER_PLATFORM_DEVELOPMENT_READY_THEN_START_ROBLOX_UNITY');
  } finally {
    process.chdir(old);
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});

test('Unity technical prototype is rejected as canonical first-stage source',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'unity-web-first-stage-reject-'));
  const old=process.cwd();
  try{
    fs.cpSync(path.join(repo,'company-learning'),path.join(tmp,'company-learning'),{recursive:true});
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
  assert.match(workflow,/Create verified Unity Web readiness PR/);
  assert.match(workflow,/gh pr create/);
  assert.match(workflow,/UNITY_WEB_DIRECT_MAIN_WRITE=NO/);
  assert.equal(workflow.includes(['git','push','origin','HEAD:main'].join(' ')),false);
  assert.match(workflow,/unity-web-deploy-manifest\.json/);
  assert.match(workflow,/git add -f "web-games\/\$GAME_ID\/Build"/);
  assert.match(workflow,/25\*1024\*1024/);
  const ignore=fs.readFileSync(path.join(repo,'.gitignore'),'utf8');
  assert.match(ignore,/!web-games\/\*\/Build\/\*\*/);
});


test('Unity Web build never directly fans out; main-bound readiness evidence owns upper-platform admission',()=>{
  const workflow=fs.readFileSync(path.join(repo,'.github','workflows','unity-web-first-stage-build.yml'),'utf8');
  const policy=JSON.parse(fs.readFileSync(path.join(repo,'company-learning','platform-release-roadmap.json'),'utf8'));
  const fan=policy.directNativeDualPlatformDevelopment.unityWebNativeFanOut;
  assert.equal(fan.enabled,true);
  assert.equal(fan.trigger,'UPPER_PLATFORM_DEVELOPMENT_READY_ON_MAIN');
  assert.deepEqual(fan.targets,['ROBLOX','UNITY']);
  assert.equal(fan.exactGameOnly,true);
  assert.equal(fan.developmentAdmissionAuthority,true);
  assert.equal(fan.releaseAuthority,false);
  assert.equal(fan.directDispatchFromUnityWebBuildForbidden,true);
  assert.equal(fan.sourceTreeExactMatchRequired,true);
  assert.match(workflow,/Evaluate upper-platform development readiness/);
  assert.match(workflow,/upper-platform-development-readiness\.json/);
  assert.match(workflow,/Create verified Unity Web readiness PR/);
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
});
