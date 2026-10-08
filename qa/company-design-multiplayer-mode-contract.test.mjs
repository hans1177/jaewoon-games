import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const design=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
const gate=fs.readFileSync('tools/company-baseline-gate.mjs','utf8');
const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const robloxQa=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
const headlessQa=fs.readFileSync('tools/company-development-roblox-headless-fast-mvp.mjs','utf8');
const modes=['SINGLE','COOP','COMPETITIVE','HYBRID'];

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
  assert.match(design,/SINGLE\/COOP\/COMPETITIVE\/HYBRID 중 하나를 multiplayerMode에 반드시 명시/);
  assert.doesNotMatch(design,/Android 모바일 싱글 기본/);
});

test('design baseline fails closed when multiplayer mode is absent or invalid',()=>{
  assert.match(gate,/const MULTIPLAYER_MODES=new Set\(\['SINGLE','COOP','COMPETITIVE','HYBRID'\]\)/);
  assert.match(gate,/designMultiplayerMode=clean\(revised\?\.multiplayerMode\)\.toUpperCase\(\)\|\|null/);
  assert.match(gate,/multiplayer-design-mode-required:SINGLE\|COOP\|COMPETITIVE\|HYBRID/);
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
