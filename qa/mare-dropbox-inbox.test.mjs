// [드롭박스 전체 자동 인입] 기존 등록 워크플로 안에서만 돌고, 256색·형식 검사를 거쳐 기존 등록기로 넘긴다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const wf = fs.readFileSync('.github/workflows/owner-mare-essentia-assets.yml', 'utf8');
const py = fs.readFileSync('tools/devloop/dropbox_inbox.py', 'utf8');
test('기존 등록 워크플로의 한 단계로 연결', () => {
  assert.match(wf, /name: Import all Dropbox inbox assets \(auto-checked\)/);
  assert.match(wf, /python3 tools\/devloop\/dropbox_inbox\.py/);
  assert.match(wf, /github\.event_name == 'schedule' \|\| github\.event_name == 'repository_dispatch'/, '수동 재실행에서는 다시 돌지 않음');
  assert.match(wf, /gh workflow run owner-mare-essentia-assets\.yml --ref main/);
  assert.ok(!fs.existsSync('.github/workflows/mare-dropbox-inbox.yml'), '새 워크플로 금지');
});
test('자동 검사 규칙', () => {
  assert.match(py, /from asset_color_check import color_problem/, '256색 금지');
  assert.match(py, /ROOT_FOLDER = "\/Vibe2Transfer\/inbox"/);
  assert.match(py, /\(png\|jpg\|jpeg\|glb\)\$/, 'FBX(LFS) 제외');
  assert.match(py, /register_asset\.py/, '기존 정본 등록기 사용');
  assert.ok(!/print\([^)]*DROPBOX_(APP|REFRESH)/.test(py), '비밀값 출력 금지');
});
