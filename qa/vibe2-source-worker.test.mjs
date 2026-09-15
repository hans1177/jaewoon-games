// 파일명: qa/vibe2-source-worker.test.mjs
// 역할: Vibe2 source worker의 격리, 코드 인텔리전스, 수리 루프, 책임 파일 경계와 기존 회귀 계약을 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runVibe2SourceWorker } from '../tools/vibe2-source-worker.mjs';
import { applyExactEdits } from '../tools/autonomous-safe-edit.mjs';
import {
  buildSmartCodeContext,
  classifyVibe2Failure,
  validateCandidatePreview
} from '../tools/vibe2-code-intelligence.mjs';

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
  assert.deepEqual(result.changedFiles, ['Assets/Player.cs']);
  assert.equal(result.exploration.sourceWrite,false);
  assert.ok(result.exploration.reuseKey.length>=16);
  assert.equal(result.roleResults.exploration,'PASS');
  assert.equal(result.codeIntelligence.repairLoop.attemptsUsed,1);
  assert.equal(result.codeIntelligence.repairLoop.repaired,false);
  assert.match(fs.readFileSync(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'utf8'), /1 \+ 1/);
  assert.match(fs.readFileSync(path.join(cwd, '.vibe2/candidates/task-1/files/Assets/Player.cs'), 'utf8'), /return 2/);
});

test('candidate manifest persists design intelligence requirements and starts evidence unverified', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  const workOrder = order({ responsibleFiles: ['unity-games/demo/Assets/Player.cs'], taskId: 'design-contract' });
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
  assert.equal(result.version, 5);
  assert.equal(result.designIntelligence.required, true);
  assert.equal(result.designIntelligence.implementationGate.allowed, true);
  assert.equal(result.designIntelligence.authorityExpanded, false);
  assert.equal(result.designIntelligence.evidenceRequirements.autoPlayer, 'verified-runtime-play-evidence-required');
  assert.deepEqual(result.designIntelligence.pipeline, workOrder.designIntelligence.pipeline);
  assert.equal(persisted.exploration.sourceWrite,false);
  assert.equal(persisted.roleResults.implementation,'PASS');
  for (const key of ['autoPlayer', 'telemetry', 'designReview', 'qa']) {
    assert.equal(result.designEvidence[key].verified, false);
    assert.equal(result.designEvidence[key].status, 'WAITING_EVIDENCE');
    assert.equal(persisted.designEvidence[key].verified, false);
  }
});

test('smart context ranks related code and change impact before implementation', () => {
  const cwd=tempRoot();
  const root=path.join(cwd,'unity-games/demo');
  write(path.join(root,'Assets/Player.cs'), [
    'class Player {',
    '  CombatSystem combat;',
    '  string SaveKey = "player";',
    '  int Hp = 100;',
    '  int Speed() { return 1; }',
    '}'
  ].join('\n'));
  write(path.join(root,'Assets/CombatSystem.cs'),'class CombatSystem { int Damage = 10; }\n');
  write(path.join(root,'Assets/PlayerSave.cs'),'class PlayerSave { void Save() {} void Load() {} }\n');
  write(path.join(root,'Assets/Tests/PlayerTests.cs'),'class PlayerTests { Player player; }\n');
  const smart=buildSmartCodeContext({
    root,
    target:'unity',
    responsibleFiles:['Assets/Player.cs'],
    existingContextFiles:[],
    goal:'플레이어 전투와 세이브 코드 수정'
  });
  assert.equal(smart.strategy,'dependency-symbol-test-ranked');
  assert.equal(smart.readOnlyOutsideResponsible,true);
  assert(smart.files.includes('Assets/CombatSystem.cs'));
  assert(smart.files.includes('Assets/Tests/PlayerTests.cs'));
  assert(smart.changeImpact.categories.includes('combat'));
  assert(smart.changeImpact.categories.includes('persistence'));
  assert.equal(smart.changeImpact.invented,false);
});

test('symbol edit is verified inside the requested function', async () => {
  const cwd=tempRoot(), responseFile=path.join(cwd,'model.json');
  write(path.join(cwd,'unity-games/demo/Assets/Player.cs'),[
    'class Player {',
    '  int Speed() {',
    '    return 1;',
    '  }',
    '}'
  ].join('\n'));
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({responsibleFiles:['unity-games/demo/Assets/Player.cs'],taskId:'symbol-edit'}),null,2));
  write(responseFile,JSON.stringify({
    summary:'Speed 함수만 수정',
    symbolEdits:[{path:'Assets/Player.cs',symbol:'Speed',find:'return 1;',replace:'return 2;'}],
    newFiles:[]
  }));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  const candidate=JSON.parse(fs.readFileSync(path.join(cwd,'.vibe2/candidates/symbol-edit/candidate.json'),'utf8'));
  assert.equal(candidate.edits[0].symbol,'Speed');
  assert.equal(result.codeIntelligence.symbolPatching.verifiedEdits[0].symbol,'Speed');
  assert.equal(result.codeIntelligence.symbolPatching.verifiedEdits[0].enforced,true);
});

test('explicit wrong symbol is rejected by preview validation', () => {
  const cwd=tempRoot(), root=path.join(cwd,'unity-games/demo');
  write(path.join(root,'Assets/Player.cs'),[
    'class Player {',
    '  int Speed() {',
    '    return 1;',
    '  }',
    '}'
  ].join('\n'));
  assert.throws(()=>validateCandidatePreview({
    sourceRoot:root,
    candidate:{
      edits:[{path:'Assets/Player.cs',symbol:'Jump',find:'return 1;',replace:'return 2;'}],
      newFiles:[],
      replaceFiles:[]
    }
  }),/SYMBOL_SCOPE_MISMATCH/);
});

test('failure router chooses specialized repair strategies', () => {
  assert.equal(classifyVibe2Failure({error:'SYNTAX_INVALID:game.js',goal:'버그 수정',target:'web'}).route,'SYNTAX_REPAIR');
  assert.equal(classifyVibe2Failure({error:'runtime mismatch',goal:'세이브 Load 호환성 수정',target:'unity'}).route,'PERSISTENCE_REPAIR');
  assert.equal(classifyVibe2Failure({error:'runtime mismatch',goal:'보스 combat damage 로직 수정',target:'unity'}).route,'COMBAT_REPAIR');
  assert.equal(classifyVibe2Failure({error:'runtime mismatch',goal:'터치 joystick 입력 수정',target:'web'}).route,'UI_INPUT_REPAIR');
});

test('repair loop uses validation failure to retry and accepts the repaired candidate', async () => {
  const cwd=tempRoot();
  const bad=path.join(cwd,'bad.json'), good=path.join(cwd,'good.json');
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/game.js'],taskId:'repair-loop'});
  workOrder.goal='점수 함수 코드 오류 수정';
  write(path.join(cwd,'web-games/demo/game.js'),'function score() { return 1; }\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(bad,JSON.stringify({symbolEdits:[{path:'game.js',symbol:'score',find:'return 1;',replace:'return (;'}]}));
  write(good,JSON.stringify({symbolEdits:[{path:'game.js',symbol:'score',find:'return 1;',replace:'return 2;'}]}));
  const result=await runVibe2SourceWorker({cwd,responseFile:bad,repairResponseFiles:[good]});
  assert.equal(result.codeIntelligence.repairLoop.attemptsUsed,2);
  assert.equal(result.codeIntelligence.repairLoop.repaired,true);
  assert.equal(result.codeIntelligence.repairLoop.history[0].route,'SYNTAX_REPAIR');
  assert.deepEqual(result.codeIntelligence.failureRouter.routes,['SYNTAX_REPAIR']);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates/repair-loop/files/game.js'),'utf8'),/return 2/);
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

test('full web rebuild accepts raw full-file envelope without JSON escaping', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.txt');
  const source = '<!doctype html><html><body>old prototype</body></html>\n';
  const replacement = `<!doctype html><html><body><canvas id="game"></canvas><script>${'let frame=0;frame+=1;'.repeat(120)}</script></body></html>`;
  const workOrder = order({ target: 'web', root: 'web-games/demo', responsibleFiles: ['web-games/demo/index.html'], taskId: 'web-full-rebuild' });
  workOrder.goal = 'FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed = true;
  write(path.join(cwd, 'web-games/demo/index.html'), source);
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
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(responseFile, 'VIBE2_FULL_FILE\nPATH:index.html\n---VIBE2_FILE_CONTENT---\n<!doctype html><html><body>잘린 출력');
  await assert.rejects(runVibe2SourceWorker({ cwd, responseFile }), /잘렸거나 종료 마커가 없음/);
});

test('Ollama transport uses streaming instead of one giant non-streaming response', () => {
  const workerSource = fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs', import.meta.url), 'utf8');
  assert.match(workerSource, /stream:true/);
  assert.doesNotMatch(workerSource, /stream:false/);
  assert.match(workerSource, /node:http/);
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
