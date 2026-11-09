import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 2026-11-08 실행에서 gear_relic_* 8개가 'No module named PIL' 로 변환 실패했다. obj-to-glb.py 는 trimesh 가 텍스처를 읽을 때 Pillow 가 필요하다.
test('마력숲 에셋 재등록 워크플로는 obj→glb 변환에 필요한 Pillow 를 설치한다', () => {
  const y=fs.readFileSync('.github/workflows/owner-fantasy-assets.yml','utf8');
  assert.match(y,/pip install --quiet trimesh numpy pillow/);
  assert.match(y,/node tools\/fantasy-survival-reupload\.mjs/);
});
