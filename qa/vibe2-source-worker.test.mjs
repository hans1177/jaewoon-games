// 파일명: qa/vibe2-source-worker.test.mjs
// 역할: Vibe2 텍스트 source worker의 격리, 책임 파일 경계, 웹 유지보수, 바이너리 차단과 안전 편집 일치를 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runVibe2SourceWorker, buildGenerationRetryPrompt, shouldRetryGenerationError, generationFailureClass, modelResponseComplete, evaluateSemanticDiffBudget } from '../tools/vibe2-source-worker.mjs';
import { applyExactEdits } from '../tools/autonomous-safe-edit.mjs';

function tempRoot() { return fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-source-worker-')); }
function write(file, content) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content, 'utf8'); }
function order({ target = 'unity', root = 'unity-games/demo', responsibleFiles = [], taskId = 'task-1' } = {}) {
  return {
    run: true,
    workMode: 'source-change-candidate',
    taskId,
    gameId: 'demo',
    target,
    goal: '기존 책임 파일을 직접 수정해 동작을 보강',
    department: 'development',
    source: { root, responsibleFiles },
    qa: ['syntax', 'regression'],
    workerPolicy: { directMainWrite: false }
  };
}

test('Unity text source produces isolated candidate without touching source', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  write(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'class Player { int Speed() { return 1 + 1; } }\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ responsibleFiles: ['unity-games/demo/Assets/Player.cs'] }), null, 2));
  write(responseFile, JSON.stringify({ edits: [{ path: 'Assets/Player.cs', find: 'return 1 + 1;', replace: 'return 2;' }], newFiles: [] }));
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  assert.equal(result.mode, 'candidate-snapshot-only');
  assert.equal(result.candidateManifestPath, '.vibe2/candidates/task-1/manifest.json');
  assert.deepEqual(result.changedFiles, ['Assets/Player.cs']);
  assert.equal(result.exploration.sourceWrite,false);
  assert.ok(result.exploration.reuseKey.length>=16);
  assert.equal(result.roleResults.exploration,'PASS');
  assert.equal(result.codingMethod.version,2);
  assert.equal(result.codingMethod.generationAttempts,1);
  assert.equal(result.codingMethod.candidateProducedFirstAttempt,true);
  assert.equal(result.codingMethod.writableScopeExpansionAllowed,false);
  assert.equal(result.codingMethod.learningAuthorityExpanded,false);
  assert.equal(result.developmentAuthority.owner,'VIBE2_VIBE3');
  assert.equal(result.developmentAuthority.provider,'LOCAL_OLLAMA');
  assert.equal(result.developmentAuthority.codexGameSourceWrite,'FORBIDDEN');
  assert.equal(result.developmentAuthority.paidOpenAiApiAllowed,false);
  assert.match(fs.readFileSync(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'utf8'), /1 \+ 1/);
  assert.match(fs.readFileSync(path.join(cwd, '.vibe2/candidates/task-1/files/Assets/Player.cs'), 'utf8'), /return 2/);
});

test('unappliable edit is retried inside generation before candidate write', async () => {
  const cwd = tempRoot();
  const bad = path.join(cwd, 'bad-edit.json');
  const good = path.join(cwd, 'good-edit.json');
  write(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'class Player { int Speed() { return 1; } }\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ responsibleFiles: ['unity-games/demo/Assets/Player.cs'], taskId: 'edit-preflight-retry' }), null, 2));
  write(bad, JSON.stringify({ edits: [{ path: 'Assets/Player.cs', find: 'return 9;', replace: 'return 2;' }], newFiles: [] }));
  write(good, JSON.stringify({ edits: [{ path: 'Assets/Player.cs', find: 'return 1;', replace: 'return 2;' }], newFiles: [] }));
  const result = await runVibe2SourceWorker({ cwd, responseFiles: [bad, good] });
  assert.equal(result.generation.attempts, 2);
  assert.equal(result.generation.recoveryUsed, true);
  assert.deepEqual(result.changedFiles, ['Assets/Player.cs']);
  assert.match(fs.readFileSync(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'utf8'), /return 1/);
  assert.match(fs.readFileSync(path.join(cwd, '.vibe2/candidates/edit-preflight-retry/files/Assets/Player.cs'), 'utf8'), /return 2/);
});

test('exact edit dry run validates sequential applicability without mutating source', () => {
  const cwd = tempRoot();
  const source = path.join(cwd, 'Player.cs');
  write(source, 'class Player {\n  int Speed() {\n    return 1;\n  }\n}\n');
  const changed = applyExactEdits(cwd, [
    { path: 'Player.cs', find: 'int Speed() {\n  return 1;\n}', replace: 'int Speed() {\n    return 2;\n}' },
    { path: 'Player.cs', find: 'return 2;', replace: 'return 3;' }
  ], { dryRun: true });
  assert.deepEqual(changed, ['Player.cs']);
  assert.match(fs.readFileSync(source, 'utf8'), /return 1;/);
  assert.doesNotMatch(fs.readFileSync(source, 'utf8'), /return 3;/);
});

test('candidate manifest persists design intelligence requirements and starts evidence unverified', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  const workOrder = order({ responsibleFiles: ['unity-games/demo/Assets/Player.cs'], taskId: 'design-contract' });
  workOrder.unifiedLearning = {
    failureFingerprint:'unity|EDIT_MATCH|DEBUGGING',
    failureLocalMemory:[{id:'verified-edit-match',verified:true,reusable:true,failureCause:'edit match not found',reusablePatterns:['trace exact responsible symbol before edit'],avoidPatterns:['do not widen writable scope']}]
  };
  workOrder.designIntelligence = {
    version: 1,
    required: true,
    pipeline: ['DESIGNER', 'CONSTRAINT_ENGINE', 'IMPLEMENTATION', 'AUTO_PLAYER', 'TELEMETRY', 'DESIGN_REVIEW', 'EXPERIENCE_MEMORY'],
    implementationGate: { allowed: true, blockers: [] },
    authorityExpanded: false
  };
  write(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'class Player { int Speed() { return 1; } }\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(responseFile, JSON.stringify({ edits: [{ path: 'Assets/Player.cs', find: 'return 1;', replace: 'return 2;' }], newFiles: [] }));
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  const persisted = JSON.parse(fs.readFileSync(path.join(cwd, '.vibe2/candidates/design-contract/manifest.json'), 'utf8'));
  assert.equal(result.version, 6);
  assert.equal(result.designIntelligence.required, true);
  assert.equal(result.designIntelligence.implementationGate.allowed, true);
  assert.equal(result.designIntelligence.authorityExpanded, false);
  assert.equal(result.designIntelligence.evidenceRequirements.autoPlayer, 'verified-runtime-play-evidence-required');
  assert.deepEqual(result.designIntelligence.pipeline, workOrder.designIntelligence.pipeline);
  assert.equal(persisted.exploration.sourceWrite,false);
  assert.equal(persisted.codingMethod.version,2);
  assert.equal(persisted.codingMethod.strategy,result.exploration.editContract.strategyHint);
  assert.equal(persisted.codingMethod.semanticDiffBudget.unrelatedSystemMutationForbidden,true);
  assert.equal(persisted.codingMethod.failureFingerprint,'unity|EDIT_MATCH|DEBUGGING');
  assert.equal(persisted.codingMethod.patchRecipeMode,'VERIFIED_FAILURE_LOCAL_RECIPE');
  assert.equal(persisted.codingMethod.verifiedFailureLocalMemoryCount,1);
  assert.deepEqual(persisted.codingMethod.verifiedFailureLocalMemoryIds,['verified-edit-match']);
  assert.equal(persisted.roleResults.implementation,'PASS');
  for (const key of ['autoPlayer', 'telemetry', 'designReview', 'qa']) {
    assert.equal(result.designEvidence[key].verified, false);
    assert.equal(result.designEvidence[key].status, 'WAITING_EVIDENCE');
    assert.equal(persisted.designEvidence[key].verified, false);
  }
});

test('Codex game source write override is rejected before generation', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  const previous = process.env.VIBE2_CODEX_GAME_SOURCE_WRITE;
  write(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'class Player { int Speed() { return 1; } }\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ responsibleFiles: ['unity-games/demo/Assets/Player.cs'], taskId: 'codex-authority-reject' }), null, 2));
  write(responseFile, JSON.stringify({ edits: [{ path: 'Assets/Player.cs', find: 'return 1;', replace: 'return 2;' }], newFiles: [] }));
  process.env.VIBE2_CODEX_GAME_SOURCE_WRITE = 'ALLOWED';
  try {
    await assert.rejects(runVibe2SourceWorker({ cwd, responseFile }), /CODEX_GAME_SOURCE_WRITE_FORBIDDEN/);
  } finally {
    if (previous === undefined) delete process.env.VIBE2_CODEX_GAME_SOURCE_WRITE;
    else process.env.VIBE2_CODEX_GAME_SOURCE_WRITE = previous;
  }
});

test('single responsible file safely remaps model placeholder path', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  write(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'class Player { int Speed() { return 1; } }\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ responsibleFiles: ['unity-games/demo/Assets/Player.cs'] }), null, 2));
  write(responseFile, JSON.stringify({ edits: [{ path: 'relative/to/source/root', find: 'return 1;', replace: 'return 2;' }], newFiles: [] }));
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  assert.deepEqual(result.changedFiles, ['Assets/Player.cs']);
});

test('responsible file boundary rejects unrelated model path', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  write(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'class Player {}\n');
  write(path.join(cwd, 'unity-games/demo/Assets/Enemy.cs'), 'class Enemy {}\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ responsibleFiles: ['unity-games/demo/Assets/Player.cs'] }), null, 2));
  write(responseFile, JSON.stringify({ edits: [{ path: 'Assets/Enemy.cs', find: 'class Enemy {}', replace: 'class Enemy { int x; }' }], newFiles: [] }));
  await assert.rejects(runVibe2SourceWorker({ cwd, responseFile }), /책임 파일 범위 밖 수정 금지/);
});

test('approved missing Web root produces isolated index.html bootstrap candidate without touching source', async () => {
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'bootstrap.html');
  const workOrder=order({target:'web',root:'web-games/missing-web',responsibleFiles:['web-games/missing-web/index.html'],taskId:'missing-web-bootstrap'});
  workOrder.gameId='missing-web';
  workOrder.goal='FULL_WEB_GAME_REBUILD SOURCE_ROOT_BOOTSTRAP_ALLOWED';
  workOrder.selectedTask={evidence:['source-root-bootstrap-required','existing-web-source:MISSING']};
  workOrder.workerPolicy={directMainWrite:false,sourceRootBootstrapAllowed:true,fullFileRewriteAllowed:true};
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const body='let frame=0;'+ 'frame+=1;'.repeat(1500);
  const replacement=`<!doctype html><html><body><canvas id="game"></canvas><script>${body}</script></body></html>`;
  write(responseFile,replacement);
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.equal(result.sourceRootBootstrap,true);
  assert.equal(result.fullFileRewriteAllowed,true);
  assert.deepEqual(result.changedFiles,['index.html']);
  assert.equal(fs.existsSync(path.join(cwd,'web-games/missing-web')),false);
  assert.equal(fs.readFileSync(path.join(cwd,'.vibe2/candidates/missing-web-bootstrap/files/index.html'),'utf8').trim(),replacement);
});

test('missing Web root without bootstrap authority remains rejected', async () => {
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'unused.html');
  const workOrder=order({target:'web',root:'web-games/missing-web',responsibleFiles:['web-games/missing-web/index.html'],taskId:'missing-web-denied'});
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(responseFile,'<!doctype html><html><body>unused</body></html>');
  await assert.rejects(runVibe2SourceWorker({cwd,responseFile}),/source root 없음/);
});

test('existing web game text maintenance is allowed', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  write(path.join(cwd, 'web-games/demo/index.html'), '<button>old</button>\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({
    target: 'web', root: 'web-games/demo', responsibleFiles: ['web-games/demo/index.html'], taskId: 'web-maintenance'
  }), null, 2));
  write(responseFile, JSON.stringify({ edits: [{ path: 'index.html', find: '>old<', replace: '>new<' }], newFiles: [] }));
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  assert.equal(result.target, 'web');
  assert.deepEqual(result.changedFiles, ['index.html']);
});

test('existing Web assessment overrides stale full-rebuild flags when KEEP_AND_CONTINUE is selected', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  const workOrder = order({ target: 'web', root: 'web-games/demo', responsibleFiles: ['web-games/demo/index.html'], taskId: 'web-keep-existing' });
  workOrder.goal = 'FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed = true;
  workOrder.evidence = ['web-strict-score:84'];
  const source = `<!doctype html><html><body><button id="play">Play</button><script>
  let hp=10,wave=2,gold=30,playerX=1,playerY=1,enemy={hp:3};
  addEventListener('touchstart',()=>{enemy.hp-=1}); function update(){requestAnimationFrame(update)}update();
  function restart(){wave=1} const victory='victory',defeat='defeat'; localStorage.setItem('save','1'); new AudioContext();
  </script></body></html>`;
  write(path.join(cwd, 'web-games/demo/index.html'), source);
  write(path.join(cwd, 'design/demo/2026-09-18/design-revised.json'), JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd, 'design/demo/2026-09-18/cycle-status.json'), JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(responseFile, JSON.stringify({edits:[{path:'index.html',find:'<button id="play">Play</button>',replace:'<button id="play">Continue</button>'}],newFiles:[],replaceFiles:[]}));
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  assert.notEqual(result.exploration.existingWebAssessment.strategy,'FULL_REBUILD');
  assert.equal(result.fullFileRewriteAllowed,false);
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('exploration FULL_REBUILD strategy can authorize full web rewrite without planner pre-deciding rebuild', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.txt');
  const replacement = `<!doctype html><html><body><canvas id="game"></canvas><script>${'let frame=0;frame+=1;'.repeat(650)}</script></body></html>`;
  const workOrder = order({ target: 'web', root: 'web-games/demo', responsibleFiles: ['web-games/demo/index.html'], taskId: 'web-assessed-rebuild' });
  workOrder.goal = 'EXISTING_WEB_ASSESS_AND_IMPLEMENT';
  write(path.join(cwd, 'web-games/demo/index.html'), '<!doctype html><html><body><h1>검증 패널</h1><button data-session-stage="1">다음</button></body></html>\n');
  write(path.join(cwd, 'design/demo/2026-09-18/design-revised.json'), JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd, 'design/demo/2026-09-18/cycle-status.json'), JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(responseFile, ['VIBE2_FULL_FILE','PATH:index.html','SUMMARY:assessment rebuild','EXPECTED_EFFECT:playable game','TEST:gameplay','---VIBE2_FILE_CONTENT---',replacement,'---VIBE2_FILE_END---'].join('\n'));
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  assert.equal(result.fullFileRewriteAllowed, true);
  assert.equal(result.exploration.existingWebAssessment.strategy,'FULL_REBUILD');
});

test('full web rebuild recovers complete direct HTML when the model omits the envelope', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.html');
  const replacement = `<!doctype html><html><body><canvas id="game"></canvas><script>${'let frame=0;frame+=1;'.repeat(650)}</script></body></html>`;
  const workOrder = order({ target: 'web', root: 'web-games/demo', responsibleFiles: ['web-games/demo/index.html'], taskId: 'web-direct-html-recovery' });
  workOrder.goal = 'FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed = true;
  write(path.join(cwd, 'web-games/demo/index.html'), '<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd, 'design/demo/2026-09-18/design-revised.json'), JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd, 'design/demo/2026-09-18/cycle-status.json'), JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(responseFile, replacement);
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  assert.equal(result.fullFileRewriteAllowed, true);
  assert.deepEqual(result.changedFiles, ['index.html']);
  assert.equal(fs.readFileSync(path.join(cwd, '.vibe2/candidates/web-direct-html-recovery/files/index.html'), 'utf8').trim(), replacement);
});

test('full web rebuild accepts fenced complete HTML but rejects prose or truncation', async () => {
  const cwd = tempRoot();
  const good = path.join(cwd, 'good.html');
  const bad = path.join(cwd, 'bad.html');
  const truncated = path.join(cwd, 'truncated.html');
  const replacement = `<!doctype html><html><body><canvas id="game"></canvas><script>${'let frame=0;frame+=1;'.repeat(650)}</script></body></html>`;
  const workOrder = order({ target: 'web', root: 'web-games/demo', responsibleFiles: ['web-games/demo/index.html'], taskId: 'web-fenced-html-recovery' });
  workOrder.goal = 'FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed = true;
  write(path.join(cwd, 'web-games/demo/index.html'), '<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd, 'design/demo/2026-09-18/design-revised.json'), JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd, 'design/demo/2026-09-18/cycle-status.json'), JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(good, `\`\`\`html\n${replacement}\n\`\`\``);
  const result = await runVibe2SourceWorker({ cwd, responseFile: good });
  assert.deepEqual(result.changedFiles, ['index.html']);
  workOrder.taskId = 'web-direct-html-prose-reject';
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(bad, `Here is the game:\n${replacement}`);
  await assert.rejects(runVibe2SourceWorker({ cwd, responseFile: bad }), /JSON 시작을 찾지 못함/);
  workOrder.taskId = 'web-direct-html-truncated-reject';
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(truncated, '<!doctype html><html><body><canvas id="game"></canvas>');
  await assert.rejects(runVibe2SourceWorker({ cwd, responseFile: truncated }), /JSON 시작을 찾지 못함/);
});

test('full web rebuild accepts raw full-file envelope without JSON escaping', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.txt');
  const source = '<!doctype html><html><body>old prototype</body></html>\n';
  const replacement = `<!doctype html><html><body><canvas id="game"></canvas><script>${'let frame=0;frame+=1;'.repeat(650)}</script></body></html>`;
  const workOrder = order({ target: 'web', root: 'web-games/demo', responsibleFiles: ['web-games/demo/index.html'], taskId: 'web-full-rebuild' });
  workOrder.goal = 'FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed = true;
  write(path.join(cwd, 'web-games/demo/index.html'), source);
  write(path.join(cwd, 'design/demo/2026-09-18/design-revised.json'), JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd, 'design/demo/2026-09-18/cycle-status.json'), JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(responseFile, [
    'VIBE2_FULL_FILE',
    'PATH:index.html',
    'SUMMARY:실제 플레이 가능한 웹게임 전체 교체',
    'EXPECTED_EFFECT:직접 입력과 런타임 게임 루프 제공',
    'TEST:mobile gameplay',
    'TEST:restart',
    '---VIBE2_FILE_CONTENT---',
    replacement,
    '---VIBE2_FILE_END---'
  ].join('\n'));
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  assert.equal(result.fullFileRewriteAllowed, true);
  assert.deepEqual(result.changedFiles, ['index.html']);
  assert.equal(fs.readFileSync(path.join(cwd, '.vibe2/candidates/web-full-rebuild/files/index.html'), 'utf8').trim(), replacement);
});

test('full web rebuild rejects truncated raw full-file envelope', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.txt');
  const workOrder = order({ target: 'web', root: 'web-games/demo', responsibleFiles: ['web-games/demo/index.html'], taskId: 'web-full-truncated' });
  workOrder.goal = 'FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed = true;
  write(path.join(cwd, 'web-games/demo/index.html'), '<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd, 'design/demo/2026-09-18/design-revised.json'), JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd, 'design/demo/2026-09-18/cycle-status.json'), JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(responseFile, 'VIBE2_FULL_FILE\nPATH:index.html\n---VIBE2_FILE_CONTENT---\n<!doctype html><html><body>잘린 출력');
  await assert.rejects(runVibe2SourceWorker({ cwd, responseFile }), /잘렸거나 종료 마커가 없음/);
});

test('malformed JSON candidate gets one bounded strict-JSON recovery retry', async () => {
  const cwd = tempRoot();
  const bad = path.join(cwd, 'bad.json');
  const good = path.join(cwd, 'good.json');
  write(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'class Player { int Speed() { return 1; } }\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ responsibleFiles: ['unity-games/demo/Assets/Player.cs'], taskId: 'json-retry' }), null, 2));
  write(bad, "{edits:[{path:'Assets/Player.cs'}]}");
  write(good, JSON.stringify({ edits: [{ path: 'Assets/Player.cs', find: 'return 1;', replace: 'return 2;' }], newFiles: [] }));
  const result = await runVibe2SourceWorker({ cwd, responseFiles: [bad, good] });
  assert.equal(result.generation.attempts, 2);
  assert.equal(result.generation.recoveryUsed, true);
  assert.equal(result.generation.mode, 'JSON_EDIT');
  assert.deepEqual(result.changedFiles, ['Assets/Player.cs']);
});

test('single-file Web diagnostic uses the same compact generation profile', async () => {
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'diagnostic.json');
  const source=['<!doctype html><html><body>','<button id="play">Play</button>','<script>let timer=setInterval(()=>{},1000);</script>','</body></html>'].join('\n');
  write(path.join(cwd,'web-games/demo/rpg.html'),source);
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/rpg.html'],taskId:'web-diagnostic-compact'});
  workOrder.goal='[DIAGNOSTIC_BUNDLE] rpg.html 반복 타이머 생명주기와 중복 실행을 점검하고 필요한 해제 경로를 추가한다.';
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(responseFile,JSON.stringify({
    summary:'cleanup interval lifecycle',
    expectedEffect:'no duplicate timer',
    edits:[{path:'rpg.html',find:'<script>let timer=setInterval(()=>{},1000);</script>',replace:'<script>let timer=setInterval(()=>{},1000);addEventListener("pagehide",()=>clearInterval(timer),{once:true});</script>'}],
    newFiles:[],replaceFiles:[],tests:['interval cleanup']
  }));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.equal(result.generation.focusedWebRepair,true);
  assert.equal(result.generation.maxPredict,1024);
  assert.equal(result.generation.contextWindow,16384);
  assert.ok(result.generation.contextFiles<=3);
  assert.ok(result.generation.contextBytes<=48000);
  assert.deepEqual(result.changedFiles,['rpg.html']);
});

test('exact Web repair uses compact generation budget without weakening edit boundaries', async () => {
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'model-focused-repair.json');
  const index=['<!doctype html><html><body>','<button id="play">Play</button>',`<script>${'const tick=1;'.repeat(1800)}</script>`,'</body></html>'].join('\n');
  write(path.join(cwd,'web-games/demo/index.html'),index);
  write(path.join(cwd,'web-games/demo/runtime-helper.js'),'export const runtimeHint=true;\n'+('const helper=1;\n'.repeat(700)));
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'focused-web-repair'});
  workOrder.goal='[WEB_REPAIR] company-runtime failure evidence requires one exact index.html repair';
  workOrder.selectedTask={evidence:['web-stage:WEB_REPAIR','company-runtime-state:WEB_VIBE_REPAIR_REQUIRED']};
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(responseFile,JSON.stringify({
    summary:'repair existing mobile action',
    expectedEffect:'visible implementation change',
    edits:[{path:'index.html',find:'>Play<',replace:'>Continue<'}],
    newFiles:[],replaceFiles:[],tests:['button label']
  }));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.equal(result.generation.focusedWebRepair,true);
  assert.equal(result.generation.maxPredict,1024);
  assert.equal(result.generation.contextWindow,16384);
  assert.ok(result.generation.contextFiles<=3);
  assert.ok(result.generation.contextBytes<=48000);
  assert.deepEqual(result.changedFiles,['index.html']);
});
test('focused Web repair composes exact primary-symbol windows instead of broad file excerpts',async()=>{
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'focused-symbol.json');
  const filler='const backgroundDecoration=1;\n'.repeat(3500);
  const source='<!doctype html><html><body><script>\n'+filler+
    'let pointerState=null,placedEntities=[];\n'+
    'function placeTower(slot){placedEntities.push(slot);return true;}\n'+
    'function handlePointer(event){pointerState={x:event.clientX,y:event.clientY};return placeTower(pointerState);}\n'+
    'addEventListener("pointerdown",handlePointer);\n'+filler+'</script></body></html>\n';
  write(path.join(cwd,'web-games/demo/index.html'),source);
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'focused-symbol-context'});
  workOrder.originalGoal='모바일 pointer 입력을 placement state에 연결한다';
  workOrder.goal='[WEB_REPAIR] runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING 수정';
  workOrder.selectedTask={evidence:['web-stage:WEB_REPAIR','runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING'],lastOutcome:'FAIL'};
  workOrder.workPackage={id:'focused-symbol-wp',sharedContext:{diagnosticEvidence:['runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING']}};
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const find='function handlePointer(event){pointerState={x:event.clientX,y:event.clientY};return placeTower(pointerState);}';
  write(responseFile,JSON.stringify({edits:[{path:'index.html',find,replace:'function handlePointer(event){pointerState={x:Math.round(event.clientX),y:Math.round(event.clientY)};return placeTower(pointerState);}'}],newFiles:[],replaceFiles:[]}));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.equal(result.generation.contextMode,'PRIMARY_SYMBOL_WINDOWS');
  assert.equal(result.generation.exactSourceWindows,true);
  assert.equal(result.generation.fullFileContextFallback,false);
  assert.ok(result.generation.focusedSymbolCount>=1);
  assert.ok(result.generation.contextBytes<48000);
  assert.equal(result.codingMethod.contextMode,'PRIMARY_SYMBOL_WINDOWS');
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('focused symbol context matches JavaScript identifiers containing regex metacharacters',async()=>{
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'focused-dollar-symbol.json');
  const filler='const decoration=1;\n'.repeat(2800);
  const source='<!doctype html><html><body><script>\n'+filler+
    'let pointerState=null,placedEntities=[];\n'+
    'function place$Tower(slot){placedEntities.push(slot);return true;}\n'+
    'function handle$Pointer(event){pointerState={x:event.clientX,y:event.clientY};return place$Tower(pointerState);}\n'+
    'addEventListener("pointerdown",handle$Pointer);\n'+filler+'</script></body></html>\n';
  write(path.join(cwd,'web-games/demo/index.html'),source);
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'focused-dollar-symbol'});
  workOrder.originalGoal='모바일 pointer 입력을 placement state에 연결한다';
  workOrder.goal='[WEB_REPAIR] runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING 수정';
  workOrder.selectedTask={evidence:['web-stage:WEB_REPAIR','runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING'],lastOutcome:'FAIL'};
  workOrder.workPackage={id:'focused-dollar-wp',sharedContext:{diagnosticEvidence:['runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING']}};
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const find='function handle$Pointer(event){pointerState={x:event.clientX,y:event.clientY};return place$Tower(pointerState);}';
  write(responseFile,JSON.stringify({edits:[{path:'index.html',find,replace:'function handle$Pointer(event){pointerState={x:Math.round(event.clientX),y:Math.round(event.clientY)};return place$Tower(pointerState);}'}],newFiles:[],replaceFiles:[]}));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.equal(result.generation.contextMode,'PRIMARY_SYMBOL_WINDOWS');
  assert.equal(result.generation.exactSourceWindows,true);
  assert.ok(result.generation.focusedSymbolCount>=1);
  assert.ok(result.generation.contextBytes<48000);
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('zero-change candidate gets one bounded recovery retry that produces a real responsible-file edit', async () => {
  const cwd = tempRoot();
  const empty = path.join(cwd, 'empty.json');
  const good = path.join(cwd, 'good.json');
  write(path.join(cwd, 'web-games/demo/index.html'), '<button id="play">Play</button>\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({
    target: 'web',
    root: 'web-games/demo',
    responsibleFiles: ['web-games/demo/index.html'],
    taskId: 'zero-change-retry'
  }), null, 2));
  write(empty, JSON.stringify({ summary:'looked okay', expectedEffect:'none', edits:[], newFiles:[], replaceFiles:[], tests:[] }));
  write(good, JSON.stringify({
    summary:'make the existing control actionable',
    expectedEffect:'visible implementation progress',
    edits:[{ path:'index.html', find:'>Play<', replace:'>Continue<' }],
    newFiles:[],
    replaceFiles:[],
    tests:['button label']
  }));
  const result = await runVibe2SourceWorker({ cwd, responseFiles:[empty,good] });
  assert.equal(result.generation.attempts,2);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.generation.mode,'JSON_EDIT');
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('zero-change recovery prompt requires a concrete bounded edit', () => {
  const prompt = buildGenerationRetryPrompt('Allowed edit paths: index.html\n=== FILE index.html ===\n<button>Play</button>', {
    allowFullRewrite:false,
    error:new Error('후보가 실제 source 변경을 생성하지 않음')
  });
  assert.match(prompt,/zero actual source changes/);
  assert.match(prompt,/MUST produce at least one edits\[\] entry/);
  assert.match(prompt,/exact Allowed edit path/);
  assert.match(prompt,/Copy find character-for-character/);
  assert.match(prompt,/do not bypass responsible-file boundaries/);
  assert.equal(shouldRetryGenerationError(new Error('후보가 실제 source 변경을 생성하지 않음')),true);
});

test('second no-op receives one short focused third retry', async () => {
  const cwd=tempRoot();
  const noop1=path.join(cwd,'noop1.json');
  const noop2=path.join(cwd,'noop2.json');
  const good=path.join(cwd,'good3.json');
  write(path.join(cwd,'web-games/demo/index.html'),'<button id="play">Play</button>\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'focused-third-retry'}),null,2));
  const noop=JSON.stringify({edits:[{path:'index.html',find:'>Play<',replace:'>Play<'}],newFiles:[],replaceFiles:[]});
  write(noop1,noop);
  write(noop2,noop);
  write(good,JSON.stringify({edits:[{path:'index.html',find:'>Play<',replace:'>Continue<'}],newFiles:[],replaceFiles:[]}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[noop1,noop2,good]});
  assert.equal(result.generation.attempts,3);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.generation.focusedFinalRetry,true);
  assert.equal(result.generation.timeoutMs,150000);
  assert.equal(result.generation.maxPredict,768);
  assert.equal(result.generation.temperature,0.22);
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('semantic diff violation retries inside the same worker and succeeds with a narrowed responsible patch',async()=>{
  const cwd=tempRoot();
  const bad=path.join(cwd,'semantic-bad.json');
  const good=path.join(cwd,'semantic-good.json');
  const source='<!doctype html><html><body><script>\n'+
    'let pointerState=null, placedEntities=[], gold=100;\n'+
    'function placeTower(slot){ placedEntities.push(slot); return true; }\n'+
    'function handlePointer(event){ pointerState={x:event.clientX,y:event.clientY}; return placeTower(pointerState); }\n'+
    'addEventListener("pointerdown",handlePointer);\n'+
    '</script></body></html>\n';
  write(path.join(cwd,'web-games/demo/index.html'),source);
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'semantic-retry'});
  workOrder.originalGoal='모바일 pointer 입력을 placement state에 연결한다';
  workOrder.goal='runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING 수정';
  workOrder.selectedTask={evidence:['runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING'],lastOutcome:'FAIL'};
  workOrder.workPackage={id:'semantic-wp',sharedContext:{diagnosticEvidence:['runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING']}};
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const find='function handlePointer(event){ pointerState={x:event.clientX,y:event.clientY}; return placeTower(pointerState); }';
  write(bad,JSON.stringify({edits:[{path:'index.html',find,replace:'function handlePointer(event){ pointerState={x:event.clientX,y:event.clientY}; gold+=999; return placeTower(pointerState); }'}],newFiles:[],replaceFiles:[]}));
  write(good,JSON.stringify({edits:[{path:'index.html',find,replace:'function handlePointer(event){ pointerState={x:Math.round(event.clientX),y:Math.round(event.clientY)}; return placeTower(pointerState); }'}],newFiles:[],replaceFiles:[]}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad,good]});
  assert.equal(result.generation.attempts,2);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.codingMethod.semanticDiffEnforcement.mode,'HARD_ENFORCE');
  assert.equal(result.codingMethod.semanticDiffEnforcement.pass,true);
  assert.equal(result.codingMethod.candidateProducedFirstAttempt,false);
  assert.deepEqual(result.changedFiles,['index.html']);
});
test('semantic diff hard gate allows primary responsibility edits inside the compiled system budget',()=>{
  const result=evaluateSemanticDiffBudget({
    candidate:{edits:[{path:'index.html',find:'function handlePointer(e){ pointerState=e; return placeTower(pointerState); }',replace:'function handlePointer(e){ pointerState=normalizePointer(e); return placeTower(pointerState); }'}],newFiles:[],replaceFiles:[]},
    editContract:{
      responsibilityConfidence:'HIGH',primaryTargets:['handlePointer'],allowedDependentSymbolsOrSystems:['placeTower'],ownedState:['pointerState'],
      codingArchitecture:{developmentMode:'PRESERVE_PATCH'},
      semanticDiffBudget:{allowedSystems:['INPUT','PLACEMENT'],unrelatedSystemMutationForbidden:true,saveKeysMustRemainCompatible:[]}
    }
  });
  assert.equal(result.mode,'HARD_ENFORCE');
  assert.equal(result.pass,true);
  assert.ok(result.touchedSystems.includes('INPUT'));
});

test('semantic diff hard gate rejects explicit unrelated system mutation even when edit touches the primary symbol',()=>{
  const result=evaluateSemanticDiffBudget({
    candidate:{edits:[{path:'index.html',find:'function handlePointer(e){ pointerState=e; return placeTower(pointerState); }',replace:'function handlePointer(e){ pointerState=e; gold+=999; return placeTower(pointerState); }'}],newFiles:[],replaceFiles:[]},
    editContract:{
      responsibilityConfidence:'HIGH',primaryTargets:['handlePointer'],allowedDependentSymbolsOrSystems:['placeTower'],ownedState:['pointerState'],
      codingArchitecture:{developmentMode:'PRESERVE_PATCH'},
      semanticDiffBudget:{allowedSystems:['INPUT','PLACEMENT'],unrelatedSystemMutationForbidden:true,saveKeysMustRemainCompatible:[]}
    }
  });
  assert.equal(result.pass,false);
  assert.ok(result.unexpectedSystems.includes('ECONOMY'));
  assert.match(result.violations.join('|'),/UNRELATED_SYSTEM:ECONOMY/);
});

test('semantic diff hard gate protects existing save keys from silent removal',()=>{
  const result=evaluateSemanticDiffBudget({
    candidate:{edits:[{path:'index.html',find:'function saveGame(){ localStorage.setItem("demo-save", JSON.stringify(state)); }',replace:'function saveGame(){ localStorage.setItem("new-save", JSON.stringify(state)); }'}],newFiles:[],replaceFiles:[]},
    editContract:{
      responsibilityConfidence:'HIGH',primaryTargets:['saveGame'],allowedDependentSymbolsOrSystems:[],ownedState:['serializedProgress'],
      codingArchitecture:{developmentMode:'PRESERVE_PATCH'},
      semanticDiffBudget:{allowedSystems:['SAVE'],unrelatedSystemMutationForbidden:true,saveKeysMustRemainCompatible:['demo-save']}
    }
  });
  assert.equal(result.pass,false);
  assert.match(result.violations.join('|'),/SAVE_KEY_COMPATIBILITY/);
});

test('ambiguous or low confidence semantic classification is observe-only instead of false rejecting',()=>{
  const result=evaluateSemanticDiffBudget({
    candidate:{edits:[{path:'index.html',find:'const value=1;',replace:'const value=2; gold+=1;'}],newFiles:[],replaceFiles:[]},
    editContract:{responsibilityConfidence:'LOW',primaryTargets:[],codingArchitecture:{developmentMode:'PRESERVE_PATCH'},semanticDiffBudget:{allowedSystems:['INPUT'],unrelatedSystemMutationForbidden:true}}
  });
  assert.equal(result.mode,'OBSERVE_ONLY');
  assert.equal(result.pass,true);
  assert.equal(result.ambiguousClassificationObserved,true);
});
test('generation failure classification keeps causal retry reasons distinct',()=>{
  assert.equal(generationFailureClass(new Error('변경 없는 edit: index.html')),'NO_OP');
  assert.equal(generationFailureClass(new Error('Ollama 응답 시간 초과: 240000ms')),'TIMEOUT');
  assert.equal(generationFailureClass(new Error('SEMANTIC_DIFF_BUDGET_VIOLATION:UNRELATED_SYSTEM:ECONOMY')),'SEMANTIC_DIFF_BUDGET');
  assert.equal(shouldRetryGenerationError(new Error('SEMANTIC_DIFF_BUDGET_VIOLATION:UNRELATED_SYSTEM:ECONOMY')),true);
  assert.equal(generationFailureClass(new Error('책임 파일 범위 밖 수정 금지: config.js')),'INVALID_PATH');
  assert.equal(generationFailureClass(new Error('전체 교체 파일 크기 오류: index.html')),'FULL_REWRITE_SIZE');
  assert.equal(generationFailureClass(new Error('모델 JSON 파싱 실패')),'MALFORMED_OUTPUT');
});
test('truncated FULL_REBUILD gets one compact raw-envelope recovery retry', async () => {
  const cwd = tempRoot();
  const bad = path.join(cwd, 'bad.txt');
  const good = path.join(cwd, 'good.txt');
  const replacement = `<!doctype html><html><body><canvas id="game"></canvas><script>${'let frame=0;frame+=1;'.repeat(650)}</script></body></html>`;
  const workOrder = order({ target: 'web', root: 'web-games/demo', responsibleFiles: ['web-games/demo/index.html'], taskId: 'full-retry' });
  workOrder.goal = 'FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed = true;
  write(path.join(cwd, 'web-games/demo/index.html'), '<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd, 'design/demo/2026-09-18/design-revised.json'), JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd, 'design/demo/2026-09-18/cycle-status.json'), JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(bad, 'VIBE2_FULL_FILE\nPATH:index.html\n---VIBE2_FILE_CONTENT---\n<!doctype html><html><body>truncated');
  write(good, ['VIBE2_FULL_FILE','PATH:index.html','SUMMARY:compact retry','EXPECTED_EFFECT:playable','TEST:runtime','---VIBE2_FILE_CONTENT---',replacement,'---VIBE2_FILE_END---'].join('\n'));
  const result = await runVibe2SourceWorker({ cwd, responseFiles: [bad, good] });
  assert.equal(result.generation.attempts, 2);
  assert.equal(result.generation.recoveryUsed, true);
  assert.equal(result.generation.mode, 'FULL_WEB');
  assert.deepEqual(result.changedFiles, ['index.html']);
});

test('undersized full web error reports validator-scale generation minimum without lowering parser safety gate', async () => {
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'undersized-single.txt');
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'full-size-telemetry'});
  workOrder.goal='FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed=true;
  write(path.join(cwd,'web-games/demo/index.html'),'<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd,'design/demo/2026-09-18/design-revised.json'),JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd,'design/demo/2026-09-18/cycle-status.json'),JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(responseFile,'VIBE2_FULL_FILE\nPATH:index.html\nSUMMARY:small\n---VIBE2_FILE_CONTENT---\n<!doctype html><html><body>tiny</body></html>\n---VIBE2_FILE_END---');
  await assert.rejects(
    runVibe2SourceWorker({cwd,responseFile}),
    /전체 교체 파일 크기 오류: index\.html:bytes=\d+:min=12000:max=260000/
  );
});

test('undersized full web output keeps a bounded full-file fallback while expansion mode is active', async () => {
  const cwd=tempRoot();
  const small1=path.join(cwd,'small1.txt');
  const small2=path.join(cwd,'small2.txt');
  const good=path.join(cwd,'good3.txt');
  const replacement=`<!doctype html><html><body><button id="start">Start</button><canvas id="game"></canvas><script>${'let frame=0;frame+=1;'.repeat(650)}</script></body></html>`;
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'full-size-third-retry'});
  workOrder.goal='FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed=true;
  write(path.join(cwd,'web-games/demo/index.html'),'<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd,'design/demo/2026-09-18/design-revised.json'),JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd,'design/demo/2026-09-18/cycle-status.json'),JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const small='VIBE2_FULL_FILE\nPATH:index.html\nSUMMARY:small\n---VIBE2_FILE_CONTENT---\n<!doctype html><html><body>tiny</body></html>\n---VIBE2_FILE_END---';
  write(small1,small);
  write(small2,small);
  write(good,['VIBE2_FULL_FILE','PATH:index.html','SUMMARY:final','EXPECTED_EFFECT:playable','TEST:mobile','---VIBE2_FILE_CONTENT---',replacement,'---VIBE2_FILE_END---'].join('\n'));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[small1,small2,good]});
  assert.equal(result.generation.attempts,3);
  assert.equal(result.generation.focusedFinalRetry,false);
  assert.equal(result.generation.fullWebExpansionStages,0);
  assert.equal(result.generation.timeoutMs,300000);
  assert.equal(result.generation.maxPredict,4096);
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('undersized full web seed accumulates additive model expansions until validator scale', async () => {
  const cwd=tempRoot();
  const seedFile=path.join(cwd,'seed.txt');
  const expansion1=path.join(cwd,'expansion1.txt');
  const expansion2=path.join(cwd,'expansion2.txt');
  const seedBody=Array.from({length:70},(_,i)=>`function seedMechanic${i}(s){s.score=(s.score||0)+${i%7};return s}`).join('');
  const seed=`<!doctype html><html><body><main id="game"><button id="start">Start</button><canvas></canvas></main><script>let state={score:0,hp:10,wave:1};${seedBody}</script></body></html>`;
  const fragment1=`<section class="combat-system" data-gameplay-system="combat"></section><script>(()=>{const api={};${Array.from({length:90},(_,i)=>`api.m${i}=s=>{s.hp=Math.max(0,(s.hp||10)-1);s.score=(s.score||0)+1;return s};`).join('')}window.addEventListener('pointerdown',e=>{state.x=e.clientX;state.y=e.clientY;state.score+=1});})();</script>`;
  const fragment2=`<section class="progress-system" data-gameplay-system="progression"></section><script>(()=>{${Array.from({length:90},(_,i)=>`function progress${i}(s){s.wave=(s.wave||1)+1;s.gold=(s.gold||0)+${i%5};return s}`).join('')}function finish(){if(state.score>50)document.body.dataset.runResult='victory';if(state.hp<=0)document.body.dataset.runResult='defeat';localStorage.setItem('vibe2-expansion-test',JSON.stringify(state))}window.addEventListener('touchstart',finish,{passive:true});})();</script>`;
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'full-web-expansion-accumulate'});
  workOrder.goal='FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed=true;
  write(path.join(cwd,'web-games/demo/index.html'),'<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd,'design/demo/2026-09-18/design-revised.json'),JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd,'design/demo/2026-09-18/cycle-status.json'),JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(seedFile,['VIBE2_FULL_FILE','PATH:index.html','SUMMARY:seed','---VIBE2_FILE_CONTENT---',seed,'---VIBE2_FILE_END---'].join('\n'));
  write(expansion1,fragment1);
  write(expansion2,['VIBE2_WEB_EXPANSION','---VIBE2_EXPANSION_CONTENT---',fragment2,'---VIBE2_EXPANSION_END---'].join('\n'));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[seedFile,expansion1,expansion2]});
  assert.equal(result.generation.attempts,3);
  assert.equal(result.generation.fullWebExpansionStages,2);
  assert.equal(result.generation.mode,'FULL_WEB');
  assert.equal(result.generation.temperature,0.22);
  assert.equal(result.generation.repeatedIntermediateOutputs,0);
  assert.deepEqual(result.generation.expansionStageTargets,['REAL_INPUT','UPDATE_OR_STATE_TRANSITION_LOOP']);
  assert.deepEqual(result.codingMethod.expansionStageTargets,['REAL_INPUT','UPDATE_OR_STATE_TRANSITION_LOOP']);
  assert.equal(result.generation.intermediateGrowthBytes.length,2);
  assert.ok(result.generation.intermediateGrowthBytes.every(value=>value>120));
  const output=fs.readFileSync(path.join(cwd,'.vibe2/candidates/full-web-expansion-accumulate/files/index.html'),'utf8');
  assert.ok(Buffer.byteLength(output,'utf8')>=12000);
  assert.match(output,/data-gameplay-system="combat"/);
  assert.match(output,/data-gameplay-system="progression"/);
  assert.doesNotMatch(output,/VIBE2_WEB_EXPANSION/);
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('timeout final retry prompt strips read-only context and asks for one compact real edit',()=>{
  const base=[
    'Allowed edit paths: index.html',
    '',
    '=== FILE index.html [EDITABLE] ===',
    '<button id="play">Play</button>',
    '',
    '=== FILE config.js [READ-ONLY IMPACT CONTEXT] ===',
    'window.CONFIG={x:1};'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(base,{allowFullRewrite:false,error:new Error('Ollama 응답 시간 초과: 240000ms'),responsibleFiles:['index.html'],attempt:3});
  assert.match(retry,/exceeded the time budget/);
  assert.match(retry,/FINAL FOCUSED RETRY/);
  assert.doesNotMatch(retry,/config\.js/);
  assert.match(retry,/exact writable path/);
});

test('generation recovery remains bounded and keeps strict output contracts', () => {
  assert.equal(shouldRetryGenerationError(new Error('Ollama 응답 시간 초과: 540000ms')), true);
  assert.equal(shouldRetryGenerationError(new Error('모델 JSON 파싱 실패')), true);
  assert.equal(shouldRetryGenerationError(new Error('unsupported target')), false);
  const full = buildGenerationRetryPrompt('base', { allowFullRewrite:true, error:new Error('전체 교체 파일 크기 오류: index.html') });
  assert.match(full, /MUST begin with VIBE2_FULL_FILE/);
  assert.match(full, /MUST end with ---VIBE2_FILE_END---/);
  assert.match(full, /12000-24000 UTF-8 bytes/);
  assert.match(full, /hard safety range remains 1800-260000 UTF-8 bytes/);
  assert.match(full, /MUST reach at least 12000 bytes/);
  assert.match(full, /substantial executable JavaScript/);
  const raised = buildGenerationRetryPrompt('Full Web generation target: 18000-36000 UTF-8 bytes.', { allowFullRewrite:true, error:new Error('전체 교체 파일 크기 오류: index.html') });
  assert.match(raised, /MUST reach at least 18000 bytes/);
  assert.match(raised, /at or below 36000 bytes/);
  const json = buildGenerationRetryPrompt('base', { allowFullRewrite:false, error:new Error('JSON') });
  assert.match(json, /strict JSON object only/);
  assert.match(json, /No markdown/);
});

test('full web recovery carries the previous undersized candidate forward for expansion', () => {
  const previous = [
    'VIBE2_FULL_FILE',
    'PATH:index.html',
    '---VIBE2_FILE_CONTENT---',
    '<!doctype html><html><body><canvas id="game"></canvas><script>let hp=10;</script></body></html>',
    '---VIBE2_FILE_END---'
  ].join('\n');
  const retry = buildGenerationRetryPrompt(
    'Full Web generation target: 12000-24000 UTF-8 bytes.',
    {
      allowFullRewrite:true,
      error:new Error('전체 교체 파일 크기 오류: index.html:bytes=1262:min=12000:max=260000'),
      previousOutput:previous,
      attempt:2
    }
  );
  assert.match(retry,/previous full-Web candidate was \d+ UTF-8 bytes/i);
  assert.match(retry,/Expand this actual implementation instead of restarting as a smaller shell/);
  assert.match(retry,/---BEGIN_PREVIOUS_FULL_WEB_CANDIDATE---/);
  assert.match(retry,/<canvas id="game">/);
  assert.match(retry,/---END_PREVIOUS_FULL_WEB_CANDIDATE---/);
});

test('model response completion stops only at a complete candidate boundary', () => {
  assert.equal(modelResponseComplete('{"edits":[{"path":"index.html","find":"a","replace":"b"}],"newFiles":[]}', 'JSON_EDIT'), true);
  assert.equal(modelResponseComplete('{"edits":[{"path":"index.html"', 'JSON_EDIT'), false);
  assert.equal(modelResponseComplete('VIBE2_FULL_FILE\nPATH:index.html\n---VIBE2_FILE_CONTENT---\n<!doctype html><html><body>x</body></html>', 'FULL_WEB'), false);
  assert.equal(modelResponseComplete('VIBE2_FULL_FILE\nPATH:index.html\n---VIBE2_FILE_CONTENT---\n<!doctype html><html><body>x</body></html>\n---VIBE2_FILE_END---', 'FULL_WEB'), true);
  assert.equal(modelResponseComplete('<!doctype html><html><body>x</body></html>', 'FULL_WEB'), true);
  assert.equal(modelResponseComplete('VIBE2_WEB_EXPANSION\n---VIBE2_EXPANSION_CONTENT---\n<script>(()=>{})();</script>', 'FULL_WEB_EXPANSION'), false);
  assert.equal(modelResponseComplete('VIBE2_WEB_EXPANSION\n---VIBE2_EXPANSION_CONTENT---\n<script>(()=>{})();</script>\n---VIBE2_EXPANSION_END---', 'FULL_WEB_EXPANSION'), true);
});

test('second malformed JSON receives the bounded focused third retry', async () => {
  const cwd=tempRoot();
  const bad1=path.join(cwd,'bad1.json');
  const bad2=path.join(cwd,'bad2.json');
  const good=path.join(cwd,'good3.json');
  write(path.join(cwd,'web-games/demo/index.html'),'<button id="play">Play</button>\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'malformed-third-retry'}),null,2));
  write(bad1,'{"edits":[');
  write(bad2,'{"edits":[{"path":"index.html"');
  write(good,JSON.stringify({edits:[{path:'index.html',find:'>Play<',replace:'>Continue<'}],newFiles:[],replaceFiles:[]}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad1,bad2,good]});
  assert.equal(result.generation.attempts,3);
  assert.equal(result.generation.focusedFinalRetry,true);
  assert.equal(result.generation.temperature,0.22);
  assert.equal(result.generation.completionMode,'JSON_EDIT');
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('Ollama transport uses streaming instead of one giant non-streaming response', () => {
  const workerSource = fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs', import.meta.url), 'utf8');
  assert.match(workerSource, /stream:true/);
  assert.doesNotMatch(workerSource, /stream:false/);
  assert.match(workerSource, /node:http/);
  assert.match(workerSource, /vibe2PartialOutput=output/);
  assert.match(workerSource, /error\?\.vibe2PartialOutput/);
  assert.match(workerSource, /\['FULL_REWRITE_SIZE','TIMEOUT','MALFORMED_OUTPUT'\]/);
});

test('Unreal C++ text source is allowed', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  write(path.join(cwd, 'unreal-games/demo/Source/Demo/Hero.cpp'), 'void Hero::Tick() { Value = Value + 0; }\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ target: 'unreal', root: 'unreal-games/demo', responsibleFiles: ['unreal-games/demo/Source/Demo/Hero.cpp'], taskId: 'ue-cpp' }), null, 2));
  write(responseFile, JSON.stringify({ edits: [{ path: 'Source/Demo/Hero.cpp', find: 'Value = Value + 0;', replace: 'Value = Value;' }], newFiles: [] }));
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  assert.equal(result.target, 'unreal');
});

test('Unreal uasset is rejected before model execution', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  write(path.join(cwd, 'unreal-games/demo/Content/Hero.uasset'), 'not-real-binary');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ target: 'unreal', root: 'unreal-games/demo', responsibleFiles: ['unreal-games/demo/Content/Hero.uasset'], taskId: 'ue-binary' }), null, 2));
  write(responseFile, '{}');
  await assert.rejects(runVibe2SourceWorker({ cwd, responseFile }), /엔진 에디터 필요 바이너리 파일/);
});

test('source apply refuses non-candidate branch', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  write(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'class Player { int Speed() { return 1; } }\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ responsibleFiles: ['unity-games/demo/Assets/Player.cs'] }), null, 2));
  write(responseFile, JSON.stringify({ edits: [{ path: 'Assets/Player.cs', find: 'return 1;', replace: 'return 2;' }], newFiles: [] }));
  await assert.rejects(runVibe2SourceWorker({ cwd, responseFile, applySource: true }), /vibe2\/candidate\/\* 브랜치에서만 허용/);
});

test('exact edit accepts only unique indentation and line-ending drift', () => {
  const cwd = tempRoot();
  const source = path.join(cwd, 'Player.cs');
  write(source, 'class Player {\r\n  int Speed() {\r\n    return 1;\r\n  }\r\n}\r\n');
  const changed = applyExactEdits(cwd, [{
    path: 'Player.cs',
    find: 'int Speed() {\n  return 1;\n}',
    replace: 'int Speed() {\n    return 2;\n}'
  }]);
  assert.deepEqual(changed, ['Player.cs']);
  assert.match(fs.readFileSync(source, 'utf8'), /return 2;/);
});

test('exact edit still rejects materially different source text', () => {
  const cwd = tempRoot();
  const source = path.join(cwd, 'Player.cs');
  write(source, 'class Player {\n  int Speed() {\n    return 1;\n  }\n}\n');
  assert.throws(() => applyExactEdits(cwd, [{
    path: 'Player.cs',
    find: 'int Speed() {\n  return 9;\n}',
    replace: 'int Speed() {\n    return 2;\n}'
  }]), /edit find 불일치/);
});


test('edit-match recovery immediately narrows to one exact writable snippet', () => {
  const base=[
    'Allowed edit paths: index.html',
    '',
    '=== FILE index.html [EDITABLE] ===',
    '<button id="play">Play</button>',
    '<div id="status">Ready</div>',
    '',
    '=== FILE config.js [READ-ONLY IMPACT CONTEXT] ===',
    'window.CONFIG={x:1};'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(base,{
    allowFullRewrite:false,
    error:new Error('edit find 불일치: index.html'),
    responsibleFiles:['index.html'],
    attempt:2
  });
  assert.match(retry,/previous edits\[\]\.find text did not match the writable source/);
  assert.match(retry,/ONLY writable path is "index\.html"/);
  assert.match(retry,/one short, unique find snippet copied character-for-character/);
  assert.match(retry,/Do not paraphrase, normalize, reconstruct, or guess source text/);
  assert.doesNotMatch(retry,/config\.js/);
  assert.match(retry,/do not bypass responsible-file boundaries/);
});

test('invalid edit path recovery requires an exact allowed path', () => {
  const error=new Error('텍스트 worker 허용 확장자 아님: exact allowed path');
  assert.equal(shouldRetryGenerationError(error),true);
  const prompt=buildGenerationRetryPrompt('Allowed edit paths: web-games/demo/index.html\n=== FILE web-games/demo/index.html ===\n<button>Play</button>',{error});
  assert.match(prompt,/invalid edit path/);
  assert.match(prompt,/copied exactly from Allowed edit paths/);
  assert.match(prompt,/Never output placeholders/);
});


test('token-repeat abort is retryable infrastructure output failure', () => {
  assert.equal(shouldRetryGenerationError(new Error('Ollama 오류: prediction aborted, token repeat limit reached')),true);
});


test('retry prompt keeps only editable context and pins the single responsible path', () => {
  const base=[
    'Allowed edit paths: index.html',
    '',
    '=== FILE index.html [EDITABLE] ===',
    '<main id="game">old</main>',
    '',
    '=== FILE scripts/config.js [READ-ONLY IMPACT CONTEXT] ===',
    'window.GAME_CONFIG={speed:1};'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(base,{
    error:new Error('책임 파일 범위 밖 수정 금지: scripts/window.GAME_CONFIG.js'),
    responsibleFiles:['index.html']
  });
  assert.match(retry,/The ONLY writable path is "index\.html"/);
  assert.match(retry,/=== FILE index\.html \[EDITABLE\] ===/);
  assert.doesNotMatch(retry,/scripts\/config\.js/);
  assert.doesNotMatch(retry,/window\.GAME_CONFIG/);
});

test('single responsible file remaps literal allowed-path placeholder without widening scope', async () => {
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'model-placeholder.json');
  write(path.join(cwd,'web-games/demo/index.html'),'<!doctype html><html><body><main>old</main></body></html>\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({
    target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'literal-placeholder'
  }),null,2));
  write(responseFile,JSON.stringify({edits:[{path:'exact allowed path',find:'<main>old</main>',replace:'<main>new</main>'}],newFiles:[]}));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.deepEqual(result.changedFiles,['index.html']);
});


test('no-op edit gets one focused causal retry', () => {
  const error=new Error('변경 없는 edit: index.html');
  assert.equal(shouldRetryGenerationError(error),true);
  const base=[
    'Allowed edit paths: index.html',
    '',
    '=== FILE index.html [EDITABLE] ===',
    '<button id="play">Play</button>',
    '',
    '=== FILE scripts/config.js [READ-ONLY IMPACT CONTEXT] ===',
    'window.GAME_CONFIG={speed:1};'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(base,{error,responsibleFiles:['index.html']});
  assert.match(retry,/previous edit copied the same text/);
  assert.match(retry,/The ONLY writable path is "index\.html"/);
  assert.match(retry,/replace is materially different from find/);
  assert.match(retry,/=== FILE index\.html \[EDITABLE\] ===/);
  assert.doesNotMatch(retry,/scripts\/config\.js/);
});
