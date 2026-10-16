import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {planVibeAgentHandoff,evaluateVibeAgentHandoff,assertVibeAgentHandoffScope,vibeAgentHandoffGuidance,
  VIBE_OPENAI_PATTERN_REFERENCES,VIBE_EXISTING_ALGORITHMS,selectVibeExistingAlgorithms} from '../tools/vibe2-openai-agent-patterns.mjs';

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
test('source-worker assignment enforces exact task, route, files and authority before writing',()=>{
  const p=plan();
  const trusted={task,route:'text-source-worker',target:'roblox',responsibleFiles:[file]};
  assert.equal(assertVibeAgentHandoffScope({plan:p,...trusted}).pass,true);
  assert.throws(()=>assertVibeAgentHandoffScope({plan:p,...trusted,responsibleFiles:['roblox-games/other/server/Game.server.luau']}),/WORK_ORDER_DRIFT/);
  assert.throws(()=>assertVibeAgentHandoffScope({plan:p,...trusted,route:'analysis-only'}),/WORK_ORDER_DRIFT/);
  assert.throws(()=>assertVibeAgentHandoffScope({plan:{...p,automaticPublication:true},...trusted}),/AUTHORITY_EXPANSION/);
});
test('missing source delta and mismatched published revision cannot pass an AI self-grade',()=>{
  const p=plan();
  const noEdit=evaluateVibeAgentHandoff(p,{taskId:task.id,sourceRevision:sha,
    qaEvidence:[{id:'combat-regression',pass:true,independent:true},{id:'server-save',pass:true,independent:true}]});
  assert.ok(noEdit.errors.includes('HANDOFF_CHANGED_FILES_MISSING'));
  const misbound=evaluateVibeAgentHandoff(p,{taskId:task.id,sourceRevision:sha,changedFiles:[file],handoffFingerprint:'invalid',
    qaEvidence:[{id:'combat-regression',pass:true,independent:true},{id:'server-save',pass:true,independent:true}],
    publicationClaimed:true,publishEvidence:{verified:true,sourceRevision:'b'.repeat(40)}});
  assert.ok(misbound.errors.includes('HANDOFF_FINGERPRINT_MISMATCH'));
  assert.ok(misbound.errors.includes('HANDOFF_PUBLICATION_REVISION_MISMATCH'));
});
test('source worker carries the preflight fingerprint into the existing candidate manifest',()=>{
  const source=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(source,/assertVibeAgentHandoffScope\(/);
  assert.match(source,/agentHandoffPreflight,/);
  assert.match(source,/agentHandoff:order\?\.agentHandoff\|\|null/);
  assert.match(source,/GEMINI_API_KEY_MISSING_NO_LOCAL_FALLBACK/);
});
test('real Vibe continuous runner imports and injects handoff into the work order and goal',()=>{
  const source=fs.readFileSync(new URL('../tools/vibe2-continuous-runner.mjs',import.meta.url),'utf8');
  assert.match(source,/from '\.\/vibe2-openai-agent-patterns\.mjs'/);
  assert.match(source,/const agentHandoff=planVibeAgentHandoff\(/);
  assert.match(source,/const handoffGuidance=vibeAgentHandoffGuidance\(agentHandoff\)/);
  assert.match(source,/centralWorkContractGuidance, handoffGuidance, neuralGuidance/);
  assert.match(source,/compiledWorkContract,\s*agentHandoff,\s*neuralDiagnosis/);
});

test('all 17 existing algorithms are discoverable without adding a scheduler or AI authority',()=>{
  assert.equal(VIBE_EXISTING_ALGORITHMS.length,17);
  assert.equal(new Set(VIBE_EXISTING_ALGORITHMS.map(row=>row.id)).size,17);
  assert.ok(VIBE_EXISTING_ALGORITHMS.every(row=>row.module.startsWith('tools/')||row.module.startsWith('assets/')));
  const plan=selectVibeExistingAlgorithms({task:{goal:'오류 원인 복구와 로비 UI 성능 최적화'},
    responsibleFiles:['roblox-games/demo/client/Menu.client.luau'],qa:['mobile-ui-regression']});
  const ids=plan.recommendations.map(row=>row.id);
  for(const id of ['FAILURE_ROOT_CAUSE','MINIMAL_SOURCE_EDIT','IMPACT_SCOPED_QA',
    'EVIDENCE_GATED_PROMOTION','UI_COMPOSITION','PERFORMANCE_BOTTLENECK',
    'DETERMINISTIC_ALGORITHM_ROUTING'])assert.ok(ids.includes(id),id);
  assert.equal(plan.executed,false);
  assert.equal(plan.qaPassed,false);
  assert.equal(plan.autoMerge,false);
  const p=planVibeAgentHandoff({task:{id:'ui-1',gameId:'demo',goal:'로비 UI 최적화'},route:'text-source-worker',
    responsibleFiles:['roblox-games/demo/client/Menu.client.luau']});
  assert.match(vibeAgentHandoffGuidance(p),/existing-algorithms=/);
  assert.equal(assertVibeAgentHandoffScope({plan:p,task:{id:'ui-1',gameId:'demo'},route:'text-source-worker',
    responsibleFiles:['roblox-games/demo/client/Menu.client.luau']}).pass,true);
  const mutated={...p,algorithmSelection:{...p.algorithmSelection,autoMerge:true}};
  assert.throws(()=>assertVibeAgentHandoffScope({plan:mutated,task:{id:'ui-1',gameId:'demo'},
    route:'text-source-worker',responsibleFiles:['roblox-games/demo/client/Menu.client.luau']}),/ALGORITHM_AUTHORITY_EXPANSION/);
});
