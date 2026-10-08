// 파일명: qa/company-design-multiplayer-mode-contract.test.mjs
// 설계 단계의 중앙 멀티플레이·MAIN/A/B/c/@·Unity WebGL 2.5D 이상 의무 검증
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const design=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
const gate=fs.readFileSync('tools/company-baseline-gate.mjs','utf8');
const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const robloxQa=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
const headlessQa=fs.readFileSync('tools/company-development-roblox-headless-fast-mvp.mjs','utf8');
const modes=['COOP','COMPETITIVE','HYBRID'];

test('central policy requires multiplayer mode inside the minimum game design contract',()=>{
  const direct=policy.directNativeDualPlatformDevelopment;
  assert.ok(direct.minimumDesignContract.includes('MULTIPLAYER_MODE'));
  assert.ok(direct.design.minimumAdmissionContract.requiredCommonFields.includes('multiplayerMode'));
  assert.equal(direct.minimumDesignRequired,true);
  assert.equal(direct.design.required,true);
  assert.equal(direct.design.sharedCoreRequired,true);
});

test('designer schema requires one explicit canonical multiplayer mode and no legacy single-player default',()=>{
  assert.match(design,/allGamesMultiplayerRequired\?\['COOP','COMPETITIVE','HYBRID'\]/);
  assert.match(design,/includes\(originalMultiplayerMode\)\?\[originalMultiplayerMode\]/);
  assert.equal(policy.directNativeDualPlatformDevelopment.multiplayerImplementation.required,true);
  assert.equal(policy.directNativeDualPlatformDevelopment.multiplayerImplementation.developmentAdmissionGate,false);
  assert.match(design,/required:\['identity'.*'multiplayerMode'.*'multiplayerExpansionDecision'/s);
  assert.match(design,/multiplayerMode:\{type:'string',enum:MULTIPLAYER_MODES\}/);
  assert.match(design,/COOP\/COMPETITIVE\/HYBRID 중 하나를 multiplayerMode에 반드시 명시/);
  assert.doesNotMatch(design,/Android 모바일 싱글 기본/);
});

test('design baseline fails closed when multiplayer mode is absent or invalid',()=>{
  assert.match(gate,/const MULTIPLAYER_MODES=new Set\(\['COOP','COMPETITIVE','HYBRID'\]\)/);
  assert.match(gate,/designMultiplayerMode=clean\(revised\?\.multiplayerMode\)\.toUpperCase\(\)\|\|null/);
  assert.match(gate,/multiplayer-design-mode-required:COOP\|COMPETITIVE\|HYBRID/);
  assert.match(gate,/multiplayerModeRequiredAtGameDesign:true/);
  assert.match(gate,/designMultiplayer:\{required:/);
});

test('Roblox multiplayer design semantics pass through the static source contract while runtime foundation stays separately verified',()=>{
  assert.match(headlessQa,/function multiplayerRequired\(config\)/);
  assert.match(headlessQa,/checks\.multiplayerSync=!multi\|\|\(\/Players:GetPlayers\\s\*\\\(\\\)\/\.test\(server\)&&\/FireAllClients/);
  assert.match(headlessQa,/multiplayerApplicable:multi/);
  assert.match(headlessQa,/actualRuntimeEvidence:false/);
  assert.match(headlessQa,/runtimeFoundationPassed:false/);
  assert.match(robloxQa,/validateRobloxRuntimeFoundationEvidence/);
  assert.match(robloxQa,/const staticMultiplayerCodePass=multiplayer\.required===true&&multiplayerSourceContract\.passed===true/);
  assert.match(robloxQa,/item\.robloxMultiplayerQaPassed=true/);
  assert.match(robloxQa,/authority:'roblox-static-two-client-source-contract'/);
  assert.match(robloxQa,/runtimeTwoClientExecutionRequired:false/);
  assert.match(robloxQa,/actualPlatformRuntime:true/);
});

test('all design stages require MAIN/A/B/c/@ and the inherited multiplayer modes are never single-only',()=>{
  const scorer=fs.readFileSync('tools/company-design-gate-scoring-v2.mjs','utf8');
  assert.match(design,/signatureSystems:\{type:'array',minItems:5/);
  assert.match(design,/required:\['name','purpose','playerChoice','id','grammarRole','stateInputs','stateOutputs'\]/);
  assert.match(design,/signatureSystems:value\.signatureSystems/);
  assert.match(design,/systemInterconnections:value\.systemInterconnections/);
  assert.match(scorer,/DESIGN_MAIN_A_B_c_DELVE_REQUIRED/);
  assert.match(scorer,/DESIGN_MULTIPLAYER_CONTRADICTION/);
  assert.match(design,/MULTIPLAYER_MODES=\$\{JSON\.stringify\(MULTIPLAYER_MODES\)\}/);
  assert.deepEqual(modes,['COOP','COMPETITIVE','HYBRID']);
});

test('Unity WebGL requires 2.5D or 3D spatial presentation in the existing authored platform profile',()=>{
  const scorer=fs.readFileSync('tools/company-design-gate-scoring-v2.mjs','utf8');
  const central=policy.livingMotionVisualQualityContract.minimumSpatialPresentation;
  assert.equal(central.minimumFinalGameplayDimension,'2.5D');
  assert.equal(central.flat2DFinalGameplayForbidden,true);
  assert.equal(central.uiOverlayMayRemain2D,true);
  assert.match(design,/const UNITY_WEB_SPATIAL_PRESENTATION=/);
  assert.match(design,/dimension:\{type:'string',enum:\['2.5D','3D'\]\}/);
  assert.match(design,/unityWebSpatialPresentation:UNITY_WEB_SPATIAL_PRESENTATION/);
  assert.match(scorer,/DESIGN_UNITY_WEB_SPATIAL_DEPTH_REQUIRED/);
  assert.match(scorer,/\['worldDepth','cameraAndOcclusion','lightingAndMaterials','mobileWebglEvidence'\]/);
});
