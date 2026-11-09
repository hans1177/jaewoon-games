import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseHealthLog, classify, loadRegistry, buildReport } from '../tools/fantasy-asset-health.mjs';

test('로그 해석: 실패 ID 를 모으고 이상 없음 횟수를 센다', () => {
  const r = parseHealthLog('x\n마력숲 자산점검 15s 실패 2/9: rbxassetid://111111,rbxassetid://222222\n마력숲 자산점검 60s 이상 없음 9\n마력숲 자산점검 60s 실패 1/9: 111111\n');
  assert.deepEqual(r.failedIds.sort(), ['111111', '222222']);
  assert.equal(r.okScans, 1);
  assert.equal(r.badScans, 2);
});

test('조치 분류: 재업로드 대상 모델·미등록 ID·불러오기 실패를 구분한다', () => {
  const reg = { map: new Map([['111111', { key: 'wolf', file: 'shared/VisualAssetIds.luau' }], ['333333', { key: 'SkillIcons', file: 'shared/SkillTreeIconIds.luau' }], ['444444', { key: 'other', file: 'shared/VisualAssetIds.luau' }]]), reuploadKeys: new Set(['wolf']) };
  const by = Object.fromEntries(classify(['111111', '222222', '333333', '444444'], reg).map(i => [i.id, i.action]));
  assert.equal(by['111111'], 'REUPLOAD_MODEL');
  assert.equal(by['222222'], 'UNREGISTERED_ID_CHECK_CODE');
  assert.equal(by['333333'], 'REUPLOAD_ICON_SHEET');
  assert.equal(by['444444'], 'REGISTERED_BUT_NOT_LOADING');
});

test('실제 등록표를 읽어 키를 찾고, 이상 없는 로그는 통과', () => {
  const reg = loadRegistry();
  assert.ok(reg.map.size > 50, 'registry ' + reg.map.size);
  assert.equal(buildReport(['마력숲 자산점검 15s 이상 없음 12']).ok, true);
  const id = [...reg.map.keys()][0];
  const r = buildReport([`마력숲 자산점검 15s 실패 1/9: rbxassetid://${id}`]);
  assert.equal(r.ok, false);
  assert.equal(r.items[0].id, id);
  assert.ok(r.items[0].key);
});

test('게임 쪽 점검 스크립트는 PreloadAsync 실패를 "마력숲 자산점검" 경고로 남긴다(DevReport 가 전달)', () => {
  const s = fs.readFileSync('roblox-games/fantasy-survival/client/AssetHealth.client.luau', 'utf8');
  assert.match(s, /PreloadAsync/);
  assert.match(s, /warn\("마력숲 자산점검 "/);
  assert.match(s, /AssetFetchStatus\.Failure/);
  const dev = fs.readFileSync('roblox-games/fantasy-survival/client/DevReport.client.luau', 'utf8');
  assert.match(dev, /string\.find\(text, "마력숲", 1, true\)/);
});

test('시간별 텔레메트리 워크플로가 자산 점검을 분석하고, 모델 원인일 때만 6시간에 한 번 재등록을 요청하며 끄는 변수가 있다', () => {
  const y = fs.readFileSync('.github/workflows/devloop-report-meadow.yml', 'utf8');
  assert.match(y, /actions: write/);
  assert.match(y, /node tools\/fantasy-asset-health\.mjs \/tmp\/telemetry\.md --write/);
  assert.match(y, /grep -q '"REUPLOAD_MODEL"'/);
  assert.match(y, /-gt 21600/);
  assert.match(y, /FANTASY_ASSET_AUTOFIX/);
  assert.match(y, /owner-fantasy-assets\.yml\/dispatches/);
  assert.ok(y.indexOf("Analyze broken screen assets") < y.indexOf("Commit report"));
});

test('분석 도구는 텔레메트리 표 형식(| n | client/warn | 문장 |)도 읽는다', () => {
  const r = parseHealthLog('| 3 | client/warn | 마력숲 자산점검 15s 실패 2/9: rbxassetid://111111,rbxassetid://222222 |');
  assert.deepEqual(r.failedIds.sort(), ['111111', '222222']);
});

test('시간별 텔레메트리 워크플로는 LFS 저장소에서 git pull/push 가 멈추므로 API 로 올린다', () => {
  const y = fs.readFileSync('.github/workflows/devloop-report-meadow.yml', 'utf8');
  assert.doesNotMatch(y, /git push/);
  assert.match(y, /gh api -X PUT "repos\/\$\{GITHUB_REPOSITORY\}\/contents\/\$\{dest\}"/);
});
