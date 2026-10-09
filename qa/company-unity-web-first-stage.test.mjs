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
    assert.equal(req.postGateAction,'CONTINUE_INDEPENDENT_UNITY_WEB_DEVELOPMENT');
    assert.equal(req.requiredGameplayDimension,'3D');
    assert.equal(req.native3dRuntimeMeshQaRequired,true);
    assert.equal(req.existing2dOr2_5dSourceRequiresInPlace3dRebuild,true);
    // 실제 C# 파일로 검사기를 실행하고 2D 탐지가 실패 원인인지 확인한다.
    const run=()=>execFileSync(process.execPath,[tool,'--game-id=sample-game'],{stdio:'pipe'});
    assert.match(run().toString(),/UNITY_WEB_REQUEST_STATUS=READY/);
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

  const start=workflow.indexOf('      - name: Create verified Unity Web readiness PR');
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
  const repair=workflow.slice(workflow.indexOf('\n  repair-vibe2:'));
  const calleePermissions=vibe.match(/^permissions:\n((?:  .+\n)+)/m)?.[1];
  assert.ok(calleePermissions,'reusable runner declares its token permissions');
  for(const line of calleePermissions.trim().split('\n')){
    const permission=line.trim();
    assert.ok(repair.includes(`      ${permission}\n`),`repair caller must grant callee permission: ${permission}`);
  }
});
test('a playable native-3D owner build receives a separate test URL while final QA still guards the stable URL',()=>{
  const workflow=fs.readFileSync(path.join(repo,'.github','workflows','unity-web-first-stage-build.yml'),'utf8');
  const homepage=fs.readFileSync(path.join(repo,'assets','homepage-enhancements.js'),'utf8');
  const headers=fs.readFileSync(path.join(repo,'_headers'),'utf8');
  const publish=workflow.slice(workflow.indexOf('      - name: Create verified Unity Web readiness PR'));
  assert.match(publish,/if: steps\.evidence\.outputs\.owner_test_eligible == 'true'/);
  assert.match(publish,/test "\$OWNER_TEST_ELIGIBLE" = "true"/);
  assert.match(publish,/runtime_dir="web-games\/\$GAME_ID"/);
  assert.match(publish,/runtime_dir="web-games\/\$GAME_ID\/unity"/);
  assert.match(publish,/if \[ "\$READINESS_PASS" != 'true' \]/);
  assert.doesNotMatch(publish,/test "\$READINESS_PASS" = "true"/);
  assert.match(publish,/test -s "\$runtime_dir\/index\.html"/);
  assert.match(publish,/test -s "\$runtime_dir\/unity-web-gameplay-validation\.json"/);
  assert.match(publish,/test -s "\$runtime_dir\/unity-web-independent-qa\.json"/);
  assert.match(publish,/test -s "\$runtime_dir\/unity-web-regression\.json"/);
  assert.match(workflow,/ownerBrowserTestEligible:true/);
  assert.match(workflow,/&&e\.visualQa\?\.pass===true/);
  assert.match(homepage,/&&row\?\.visualQa\?\.pass===true/);
  assert.match(workflow,/UNITY_WEB_OWNER_TEST_REQUIRES_REAL_3D_GAMEPLAY/);
  assert.match(workflow,/const verified3d=checks\.every/);
  assert.match(workflow,/const gatePass=checks\.every/);
  assert.match(workflow,/owner_test_eligible=true/);
  assert.match(workflow,/UNITY_WEB_FULLSCREEN_BUTTON=READY/);
  assert.match(workflow,/requestFullscreen/);
  assert.match(workflow,/overscroll-behavior:none/);
  assert.match(workflow,/touch-action:none/);
  assert.match(homepage,/unity-web-deploy-manifest\.json/);
  assert.match(homepage,/Unity Web · 테스트/);
  assert.doesNotMatch(homepage,/bundleGroupsFromUnityIndex/);
  assert.match(headers,/Content-Encoding: gzip/);
});
