import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import crypto from 'node:crypto';

// 레지스트리 테스트를 `node 파일` 로 직접 돌려도 커밋된 company-asset-library.json이 바뀌면 안 된다.
test('자산 유니버스 테스트를 직접 실행해도 company-asset-library.json이 그대로다', {timeout:600000}, () => {
  const hash=()=>crypto.createHash('sha256').update(fs.readFileSync('company-asset-library.json')).digest('hex');
  const before=hash();
  const env={...process.env};delete env.NODE_TEST_CONTEXT;
  const r=spawnSync('node',['qa/vibe-studio-asset-universe.test.mjs'],{encoding:'utf8',env,maxBuffer:1<<28});
  const after=hash();
  if(before!==after)spawnSync('git',['checkout','--','company-asset-library.json']);
  assert.equal(after,before,'테스트가 실제 레지스트리를 덮어씀');
  assert.match(r.stdout,/# fail 0/,'직접 실행 시 실패 테스트가 있음');
});
