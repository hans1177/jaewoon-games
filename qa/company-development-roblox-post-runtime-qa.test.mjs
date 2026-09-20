import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const workflowPath = '.github/workflows/company-development-roblox-post-runtime-qa.yml';
const probePath = 'tools/company-development-roblox-mobile-independent-qa.luau';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

test('Roblox post-runtime QA stays exact-artifact and real-Studio only', () => {
  const workflow = read(workflowPath);
  assert.match(workflow, /runs-on: \[self-hosted, Windows, X64, roblox-studio-authenticated\]/);
  assert.match(workflow, /ROBLOX_AUTHENTICATED_RUNNER_WIP_MAX: '3'/);
  assert.match(workflow, /ROBLOX_POST_RUNTIME_QA_LOCAL_WIP_MAX=3/);
  assert.match(workflow, /ROBLOX_POST_RUNTIME_QA_RUNNER_POOL_CAPACITY_AWARE=YES/);
  assert.match(workflow, /max-parallel: 3/);
  assert.match(workflow, /EXPECTED_ARTIFACT/);
  assert.match(workflow, /Get-FileHash -Algorithm SHA256/);
  assert.match(workflow, /company-development-roblox-mobile-independent-qa\.luau/);
  assert.match(workflow, /company-development-roblox-runtime-smoke\.luau/);
  assert.match(workflow, /ROBLOX_MOBILE_CONTROL_UI_PASS=YES/);
  assert.match(workflow, /ROBLOX_INDEPENDENT_QA_PASS=YES/);
  assert.match(workflow, /ROBLOX_REGRESSION_PASS=YES/);
  assert.match(workflow, /ROBLOX_RELEASE_CLAIM=NO/);
  assert.doesNotMatch(workflow, /windows-latest/);
});

test('mobile independent QA uses Studio device simulation and real UI interaction', () => {
  const probe = read(probePath);
  assert.match(probe, /StudioDeviceSimulatorService/);
  assert.match(probe, /Enum\.DeviceForm\.Phone/);
  assert.match(probe, /Enum\.ScreenOrientation\.Portrait/);
  assert.match(probe, /UserInputService\.TouchEnabled/);
  assert.match(probe, /CreateVirtualInput\(\)/);
  assert.match(probe, /SendMouseButton/);
  assert.match(probe, /ApprovedScopeHud/);
  assert.match(probe, /LastApprovedScope/);
  assert.match(probe, /ExecuteMultiplayerTestAsync\(1/);
  assert.match(probe, /ROBLOX_MOBILE_CONTROL_UI_PASS=YES/);
  assert.match(probe, /ROBLOX_INDEPENDENT_QA_PASS=YES/);
});

test('owner-focused secondary Roblox enters native mobile QA and regression without changing canonical Unity',()=>{
  const workflow=read(workflowPath);
  assert.match(workflow,/ownerFocusedSecondaryPlatformEligible\(item,roadmap,'ROBLOX'\)/);
  assert.match(workflow,/ownerFocusRobloxRuntimePassed===true/);
  assert.match(workflow,/ownerFocusRobloxServerClientBoundaryPassed===true/);
  assert.match(workflow,/artifactIdentity:artifact,secondaryOwnerFocus/);
  assert.match(workflow,/secondaryOwnerFocus=\(\$env:SECONDARY_OWNER_FOCUS -eq 'true'\)/);
  assert.match(workflow,/ownerFocusRobloxPostRuntimeQaEvidence/);
  assert.match(workflow,/ownerFocusRobloxIndependentQaPassed=independent/);
  assert.match(workflow,/ownerFocusRobloxRegressionPassed=regression/);
  assert.match(workflow,/ownerFocusRobloxAssetPipelineState=regression\?'QA_READY'/);
  const start=workflow.indexOf('if(secondaryOwnerFocus){',workflow.indexOf('Persist exact post-runtime QA state'));
  const end=workflow.indexOf('continue;',start);
  assert.ok(start>=0&&end>start,'secondary post-runtime persist branch missing');
  const block=workflow.slice(start,end);
  assert.doesNotMatch(block,/selectedPlatform\s*[:=]/);
  assert.doesNotMatch(block,/targetPlatform\s*[:=]/);
  assert.doesNotMatch(block,/currentStep\s*[:=]/);
  assert.doesNotMatch(block,/canonicalState\s*[:=]/);
});
