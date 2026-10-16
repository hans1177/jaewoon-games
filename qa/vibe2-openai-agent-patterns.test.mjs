import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {planVibeAgentHandoff,evaluateVibeAgentHandoff,vibeAgentHandoffGuidance,
  VIBE_OPENAI_PATTERN_REFERENCES} from '../tools/vibe2-openai-agent-patterns.mjs';

const sha='a'.repeat(40);
const task={id:'repair-world-tree',gameId:'simple-rpg',target:'roblox'};
const file='roblox-games/simple-rpg/server/Game.server.luau';
const plan=()=>planVibeAgentHandoff({
  task,route:{route:'text-source-worker'},target:'roblox',
  responsibleFiles:[file],qa:['combat-regression','server-save']
});
test('OpenAI-style handoff routes game generation to external Gemini and QA to existing deterministic pipeline',()=>{
  const p=plan();
  assert.deepEqual(p.stages.map(x=>x.id),['TRIAGE','GENERATE','VERIFY','HANDOFF']);
  assert.deepEqual(p.stages.map(x=>x.provider),['DETERMINISTIC','GEMINI_API','DETERMINISTIC','DETERMINISTIC']);
  assert.equal(p.localAiRequired,false);
  assert.equal(p.openAiApiRequired,false);
  assert.equal(p.executionState,'PLANNED_NOT_EXECUTED');
  assert.equal(p.automaticPublication,false);
  assert.equal(p.gameScoped,true);
  assert.match(p.handoffFingerprint,/^[0-9a-f]{64}$/);
  assert.match(vibeAgentHandoffGuidance(p),/No local Ollama/);
  assert.equal(VIBE_OPENAI_PATTERN_REFERENCES.length,2);
});
test('same task, scope and QA yields a stable handoff fingerprint; different file changes it',()=>{
  const p=plan();
  assert.equal(p.handoffFingerprint,plan().handoffFingerprint);
  const other=planVibeAgentHandoff({
    task,route:'text-source-worker',target:'roblox',
    responsibleFiles:['roblox-games/simple-rpg/client/Game.client.luau'],
    qa:['combat-regression','server-save']
  });
  assert.notEqual(p.handoffFingerprint,other.handoffFingerprint);
  assert.throws(()=>planVibeAgentHandoff({
    task,route:'text-source-worker',responsibleFiles:['../company-directive.json']
  }),/UNSAFE_FILE_PATH/);
  assert.throws(()=>planVibeAgentHandoff({task,route:'unsupported'}),/UNSUPPORTED_ROUTE/);
});
test('external AI self-reported pass is insufficient without independent game QA and exact revision',()=>{
  const p=plan();
  const bad=evaluateVibeAgentHandoff(p,{taskId:task.id,changedFiles:[file],selfReportedPass:true});
  assert.equal(bad.pass,false);
  assert.ok(bad.errors.includes('HANDOFF_SOURCE_REVISION_MISSING'));
  assert.ok(bad.errors.includes('HANDOFF_GAME_QA_EVIDENCE_MISSING'));
  const valid=evaluateVibeAgentHandoff(p,{
    taskId:task.id,sourceRevision:sha,changedFiles:[file],
    qaEvidence:[{id:'combat-regression',pass:true,independent:true},
      {id:'server-save',pass:true,independent:true}]
  });
  assert.equal(valid.pass,true);
  assert.equal(valid.review,'DETERMINISTIC_GAME_EVIDENCE_ONLY');
});
test('cross-game file, forged QA and unverified publication fail independently',()=>{
  const p=plan();
  const result=evaluateVibeAgentHandoff(p,{
    taskId:'other',sourceRevision:sha,changedFiles:['roblox-games/other/server/Game.server.luau'],
    qaEvidence:[{id:'combat-regression',pass:true,independent:false}],
    publicationClaimed:true,publishEvidence:{verified:false,sourceRevision:sha}
  });
  assert.equal(result.pass,false);
  assert.ok(result.errors.includes('HANDOFF_TASK_MISMATCH'));
  assert.ok(result.errors.includes('HANDOFF_OUT_OF_SCOPE_FILE'));
  assert.ok(result.errors.includes('HANDOFF_GAME_QA_EVIDENCE_MISSING'));
  assert.ok(result.errors.includes('HANDOFF_PUBLICATION_PROOF_MISSING'));
});
test('Unity editor and analysis/practice routes do not force local AI or OpenAI paid APIs',()=>{
  const editor=planVibeAgentHandoff({
    task:{id:'unity-asset',gameId:'forest'},route:'engine-editor',target:'unity',
    responsibleFiles:['unity-games/forest/Assets/World.prefab']
  });
  assert.equal(editor.stages[1].provider,'EXISTING_ENGINE_RUNTIME');
  const read=planVibeAgentHandoff({task,route:'analysis-only',responsibleFiles:[]});
  assert.equal(read.stages[1].id,'ANALYZE');
  assert.equal(read.stages[1].provider,'GEMINI_API');
  assert.equal(read.evalContract.sourceRevisionRequired,false);
});
test('real Vibe continuous runner imports and injects handoff into the work order and goal',()=>{
  const source=fs.readFileSync(new URL('../tools/vibe2-continuous-runner.mjs',import.meta.url),'utf8');
  assert.match(source,/from '\.\/vibe2-openai-agent-patterns\.mjs'/);
  assert.match(source,/const agentHandoff=planVibeAgentHandoff\(/);
  assert.match(source,/const handoffGuidance=vibeAgentHandoffGuidance\(agentHandoff\)/);
  assert.match(source,/centralWorkContractGuidance, handoffGuidance, neuralGuidance/);
  assert.match(source,/compiledWorkContract,\s*agentHandoff,\s*neuralDiagnosis/);
});
