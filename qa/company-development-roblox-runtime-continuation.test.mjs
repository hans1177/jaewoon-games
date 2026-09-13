import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectRobloxBuildPreflight} from '../tools/company-development-roblox-build-preflight.mjs';

const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime-continuation.yml',import.meta.url),'utf8');
const smoke=fs.readFileSync(new URL('../tools/company-development-roblox-runtime-smoke.luau',import.meta.url),'utf8');
const directive=JSON.parse(fs.readFileSync(new URL('../company-directive.json',import.meta.url),'utf8'));

test('continuation is a direct post-package edge, not a second source/package pipeline',()=>{
  assert.ok(workflow.includes('workflow_run:'));
  assert.ok(workflow.includes('workflows: [Company DEVELOPMENT_CONFIRMED Roblox Runtime]'));
  assert.ok(workflow.includes('workflow_dispatch:'));
  assert.ok(!workflow.includes('push:'));
  assert.ok(!workflow.includes('company-development-roblox-bootstrap.mjs'));
  assert.ok(!workflow.includes('company-development-roblox-package.mjs'));
  assert.ok(workflow.includes('ROBLOX_EXECUTION_WIP_MAX=2'));
  assert.ok(workflow.includes('ROBLOX_PER_GAME_PROMOTION=YES'));
  assert.ok(workflow.includes('ROBLOX_PROMOTION_COUNT_GATE=NONE'));
});

test('five-lead preflight requires an exact immutable build before runtime',()=>{
  const item={
    gameId:'g',productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform:'ROBLOX',webValidationPassedAt:'2026-09-13T00:00:00Z',musicValidationPassed:true,
    robloxSourceBootstrapPassedAt:'2026-09-13T00:00:00Z',robloxSourceCommit:'a'.repeat(40),robloxBuildOrPackagePassed:true,
    robloxBuildSourceRevision:'a'.repeat(40),robloxBuildArtifactIdentity:`sha256:${'b'.repeat(64)}`,
  };
  const result=inspectRobloxBuildPreflight({item,directive});
  assert.equal(result.pass,true);
  assert.equal(result.distinctLeadCount,5);
  assert.equal(new Set(Object.values(result.leads)).size,5);
  assert.ok(workflow.includes('company-development-roblox-build-preflight.mjs'));
  assert.ok(workflow.includes("robloxBuildPreflightPassed:true"));
  assert.ok(workflow.includes("robloxFailureStage:'TARGET_PLATFORM_RUNTIME'"));
});

test('runtime uses the original package identity and an actual Roblox Studio multiplayer session',()=>{
  assert.ok(workflow.includes('runs-on: windows-latest'));
  assert.ok(workflow.includes('development-roblox-package-$env:GAME_ID'));
  assert.ok(workflow.includes('No retained package matches'));
  assert.ok(workflow.includes('RobloxStudioBeta.exe'));
  assert.ok(workflow.includes("$packageId = 'Roblox.RobloxStudio'"));
  assert.ok(workflow.includes('RobloxStudioInstaller.exe'));
  assert.ok(workflow.includes("$deadline = (Get-Date).AddMinutes(8)"));
  assert.ok(workflow.includes('Get-Process -Name RobloxStudioBeta'));
  assert.ok(workflow.includes('ROBLOX_STUDIO_EXE='));
  assert.ok(!workflow.includes('RobloxStudioLauncherBeta.exe'));
  assert.ok(workflow.includes("item.robloxRuntimeEvidence?.failure==='roblox-studio-install-failed'"));
  assert.ok(workflow.includes("item.robloxFailureSignature==='ROBLOX_RUNTIME_RESULT_MISSING'"));
  assert.ok(workflow.includes('--task RunScript'));
  assert.ok(workflow.includes('--localPlaceFile'));
  assert.ok(workflow.includes('ROBLOX_ACTUAL_STUDIO_RUNTIME=PASS'));
  assert.ok(smoke.includes('StudioTestService:ExecuteMultiplayerTestAsync(1'));
  assert.ok(smoke.includes('RemoteEvent'));
  assert.ok(smoke.includes('ROBLOX_SERVER_CLIENT_BOUNDARY_PASS=YES'));
});

test('runtime checkpoint persistence survives merged artifact directory layouts',()=>{
  assert.ok(workflow.includes("const root='/tmp/roblox-runtime-batch'"));
  assert.ok(workflow.includes("entry.name.endsWith('.runtime.json')"));
  assert.ok(workflow.includes('ROBLOX_RUNTIME_CHECKPOINT_FILES='));
  assert.ok(!workflow.includes("const dir='/tmp/roblox-runtime-batch/results';const results=[];"));
});

test('runtime success does not invent later QA, datastore, regression, final review, or release evidence',()=>{
  assert.ok(workflow.includes("robloxLastSuccessfulStage:'TARGET_PLATFORM_RUNTIME'"));
  assert.ok(workflow.includes("robloxFailureStage:'INDEPENDENT_QA'"));
  assert.ok(workflow.includes('ROBLOX_INDEPENDENT_QA_PASS=NO'));
  assert.ok(workflow.includes('ROBLOX_REGRESSION_PASS=NO'));
  assert.ok(workflow.includes('ROBLOX_FINAL_REVIEW_PASS=NO'));
  assert.ok(workflow.includes('ROBLOX_RELEASE_CLAIM=NO'));
  assert.ok(workflow.includes("datastoreRejoinPassed=(-not $saveRequired)"));
});
