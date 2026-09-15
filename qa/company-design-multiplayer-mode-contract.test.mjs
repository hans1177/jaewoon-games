import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const design=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
const gate=fs.readFileSync('tools/company-baseline-gate.mjs','utf8');
const policy=fs.readFileSync('COMPANY_FLOW.md','utf8');
const robloxQa=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
const modes=['SINGLE','COOP','COMPETITIVE','HYBRID'];

test('central policy decides multiplayer mode during game design',()=>{
  assert.match(policy,/multiplayer:\n\s+decisionStage: GAME_DESIGN/);
  for(const mode of modes)assert.match(policy,new RegExp(`- ${mode}`));
  assert.match(policy,/lateUnplannedMultiplayerAttachmentForbidden: true/);
});

test('designer schema requires one explicit canonical multiplayer mode and no legacy single-player default',()=>{
  assert.match(design,/const MULTIPLAYER_MODES=\['SINGLE','COOP','COMPETITIVE','HYBRID'\]/);
  assert.match(design,/required:\['identity'.*'multiplayerMode'.*'multiplayerExpansionDecision'/s);
  assert.match(design,/multiplayerMode:\{type:'string',enum:MULTIPLAYER_MODES\}/);
  assert.match(design,/SINGLE\/COOP\/COMPETITIVE\/HYBRID 중 하나를 multiplayerMode에 반드시 명시/);
  assert.match(design,/multiplayerExpansionDecision과 현재 플레이 모드를 혼동하지 마라/);
  assert.doesNotMatch(design,/Android 모바일 싱글 기본/);
});

test('design baseline fails closed when multiplayer mode is absent or invalid',()=>{
  assert.match(gate,/const MULTIPLAYER_MODES=new Set\(\['SINGLE','COOP','COMPETITIVE','HYBRID'\]\)/);
  assert.match(gate,/designMultiplayerMode=clean\(revised\?\.multiplayerMode\)\.toUpperCase\(\)\|\|null/);
  assert.match(gate,/multiplayer-design-mode-required:SINGLE\|COOP\|COMPETITIVE\|HYBRID/);
  assert.match(gate,/multiplayerModeRequiredAtGameDesign:true/);
  assert.match(gate,/designMultiplayer:\{required:/);
});

test('Roblox final review consumes the same design modes without weakening later QA',()=>{
  assert.match(robloxQa,/new Set\(\['SINGLE','COOP','COMPETITIVE','HYBRID'\]\)/);
  assert.match(robloxQa,/design\?\.content\?\.multiplayerMode/);
  assert.match(robloxQa,/item\.robloxMultiplayerQaPassed===true/);
  assert.match(robloxQa,/ROBLOX_MULTIPLAYER_DESIGN_DECISION_MISSING/);
  assert.match(robloxQa,/ROBLOX_MULTIPLAYER_QA_REQUIRED/);
});
