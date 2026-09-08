// 파일명: qa/vibe2-source-worker.test.mjs
// 역할: Vibe2 텍스트 source worker의 격리, 엔진 경계, 바이너리 차단을 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runVibe2SourceWorker } from '../tools/vibe2-source-worker.mjs';

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-source-worker-'));
}
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}
function order({ target = 'unity', root = 'unity-games/demo', responsibleFiles = [], taskId = 'task-1' } = {}) {
  return {
    run: true,
    workMode: 'source-change-candidate',
    taskId,
    gameId: 'demo',
    target,
    goal: '기존 이동 코드를 직접 수정해 속도 계산 중복 제거',
    department: 'development',
    source: { root, responsibleFiles },
    qa: ['syntax', 'regression'],
    workerPolicy: { directMainWrite: false }
  };
}

test('Unity text source produces isolated candidate without touching source', async () => {
  const cwd = tempRoot();
  write(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'class Player { int Speed() { return 1 + 1; } }\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ responsibleFiles: ['unity-games/demo/Assets/Player.cs'] }), null, 2));
  write(path.join(cwd, 'model.json'), JSON.stringify({
    summary: '중복 계산 제거',
    expectedEffect: '동일 결과 유지',
    edits: [{ path: 'Assets/Player.cs', find: 'return 1 + 1;', replace: 'return 2;' }],
    newFiles: [],
    tests: ['C# syntax']
  }));
  const result = await runVibe2SourceWorker({ cwd, responseFile: 'model.json' });
  assert.equal(result.mode, 'candidate-snapshot-only');
  assert.deepEqual(result.changedFiles, ['Assets/Player.cs']);
  assert.equal(fs.readFileSync(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'utf8').includes('return 1 + 1;'), true);
  assert.equal(fs.readFileSync(path.join(cwd, '.vibe2/candidates/task-1/files/Assets/Player.cs'), 'utf8').includes('return 2;'), true);
});

test('Unreal C++ text source is allowed', async () => {
  const cwd = tempRoot();
  write(path.join(cwd, 'unreal-games/demo/Source/Demo/Hero.cpp'), 'void Hero::Tick() { Value = Value + 0; }\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({
    target: 'unreal',
    root: 'unreal-games/demo',
    responsibleFiles: ['unreal-games/demo/Source/Demo/Hero.cpp'],
    taskId: 'ue-cpp'
  }), null, 2));
  write(path.join(cwd, 'model.json'), JSON.stringify({
    edits: [{ path: 'Source/Demo/Hero.cpp', find: 'Value = Value + 0;', replace: 'Value = Value;' }],
    newFiles: []
  }));
  const result = await runVibe2SourceWorker({ cwd, responseFile: 'model.json' });
  assert.equal(result.target, 'unreal');
  assert.deepEqual(result.changedFiles, ['Source/Demo/Hero.cpp']);
});

test('Unreal uasset is rejected before model execution', async () => {
  const cwd = tempRoot();
  write(path.join(cwd, 'unreal-games/demo/Content/Hero.uasset'), 'not-real-binary');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({
    target: 'unreal',
    root: 'unreal-games/demo',
    responsibleFiles: ['unreal-games/demo/Content/Hero.uasset'],
    taskId: 'ue-binary'
  }), null, 2));
  write(path.join(cwd, 'model.json'), '{}');
  await assert.rejects(
    runVibe2SourceWorker({ cwd, responseFile: 'model.json' }),
    /엔진 에디터 필요 바이너리 파일/
  );
});

test('web-games source root is forbidden', async () => {
  const cwd = tempRoot();
  write(path.join(cwd, 'web-games/demo/index.html'), '<div>old</div>');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({
    target: 'unity',
    root: 'web-games/demo',
    responsibleFiles: ['web-games/demo/index.html']
  }), null, 2));
  write(path.join(cwd, 'model.json'), '{}');
  await assert.rejects(
    runVibe2SourceWorker({ cwd, responseFile: 'model.json' }),
    /허용되지 않은 source root/
  );
});

test('source apply refuses non-candidate branch', async () => {
  const cwd = tempRoot();
  write(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'class Player { int Speed() { return 1; } }\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ responsibleFiles: ['unity-games/demo/Assets/Player.cs'] }), null, 2));
  write(path.join(cwd, 'model.json'), JSON.stringify({
    edits: [{ path: 'Assets/Player.cs', find: 'return 1;', replace: 'return 2;' }],
    newFiles: []
  }));
  await assert.rejects(
    runVibe2SourceWorker({ cwd, responseFile: 'model.json', applySource: true }),
    /vibe2\/candidate\/\* 브랜치에서만 허용/
  );
});
