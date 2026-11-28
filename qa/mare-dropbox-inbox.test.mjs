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
  assert.match(wf, /gh workflow run owner-mare-essentia-assets\.yml --repo "\$repo" --ref main/);
  assert.match(wf, /git push -q origin "HEAD:refs\/heads\/\$branch"/, '후보 브랜치로만 push');
  assert.doesNotMatch(wf, /git push -q origin HEAD:main/, 'main 직접 push 금지');
  assert.ok(!fs.existsSync('.github/workflows/mare-dropbox-inbox.yml'), '새 워크플로 금지');
});
test('자동 검사 규칙', () => {
  assert.match(py, /from asset_color_check import color_problem/, '256색 금지');
  assert.match(py, /ROOT_FOLDER = "\/Vibe2Transfer\/inbox"/);
  assert.match(py, /\(png\|jpg\|jpeg\|glb\)\$/, 'FBX(LFS) 제외');
  assert.match(py, /register_asset\.py/, '기존 정본 등록기 사용');
  assert.ok(!/print\([^)]*DROPBOX_(APP|REFRESH)/.test(py), '비밀값 출력 금지');
});

test('지시서 소형 UI 6종만 정확한 규격을 허용한다', () => {
  for (const name of ['ui_frame_tab_on','ui_frame_tab_off','ui_button_gold','ui_button_green','ui_button_grey']) {
    assert.ok(py.includes('"' + name + '.png": (256, 96)'), name);
  }
  assert.ok(py.includes('"ui_haggle_needle.png": (64, 256)'));
  assert.match(py, /if \(w, h\) != ui_size:/);
  assert.match(py, /raw\[24:26\] != b"\\x08\\x06"/);
  assert.match(py, /im\.getchannel\("A"\)\.getextrema\(\)\[0\] != 0/);
  assert.match(py, /elif max\(w, h\) > 4096 or min\(w, h\) < 128:/);
  assert.match(py, /why = color_problem\(tmp\)/);
});
test('일반 인입 후보 검사 완료 이벤트는 정확한 SHA 및 필수 검사 3종을 확인한다', () => {
  assert.ok(wf.includes("branches: ['mare-dropbox-card-*', 'mare-dropbox-inbox-*']"));
  assert.ok(wf.includes('(.head.ref | test("^mare-dropbox-inbox-[0-9]+$"))'));
  assert.ok(wf.includes('.head.repo.full_name == $repo'));
  assert.ok(wf.includes('.head.sha == $event_head'));
  assert.ok(wf.includes('.head_sha == $sha and .app.slug == "github-actions"'));
  assert.ok(wf.includes('group_by(.name)'));
  assert.ok(wf.includes('length == 3 and all(.[]; .pass)'));
  assert.ok(wf.includes('if [[ "$GITHUB_EVENT_NAME" == workflow_run ]]; then exit 0; fi'));
});


test('시설 원화는 정확한 규격 및 원본 시각 승인 없이는 반입하지 않는다', () => {
  assert.ok(py.includes('trade|route|diplomacy|yard|board|battle|scholar|status'));
  assert.ok(py.includes('(w, h) != (2400, 800)'));
  assert.ok(py.includes('시설 가로 원화는 빈 영역 없이 완성된 불투명 그림 필수'));
  const gate = py.split('if kind == "CardArt" and FACILITY_STRIP.fullmatch(fn):')[1].split('# 대륙 원화')[0];
  assert.ok(gate.includes('approved_doc.get("approved", {}).get(card) != digest'));
  assert.ok(gate.includes('status="pending_review"'));
  assert.ok(gate.includes('continue'));
  assert.ok(py.includes('if approved_doc.get("approved", {}).get(card) != prev.get("sha256"):'));
  assert.ok(py.includes('if CONTINENT.match(fn) and approved_doc.get("modelOriginals"'));
});
