import test from 'node:test';
import assert from 'node:assert/strict';
import { checkFantasyAssets } from '../tools/fantasy-asset-link-check.mjs';
test('마력숲 자산 연결 점검: 모델 키·아이콘 셀·에셋 ID가 모두 등록돼 있다', () => {
  const r = checkFantasyAssets();
  assert.ok(r.registered > 100 && r.modelKeys > 10);
  assert.deepEqual(r.problems, []);
});
