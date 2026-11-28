// [GPT 멈춤 방지] 2026-11-28 오너: "지피티 맨날 '중앙 검증기 실행 환경 연결 못해 수정 보류' — 원인 해결"
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const agents = fs.readFileSync('AGENTS.md', 'utf8');
const roadmap = JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json', 'utf8'));
test('AGENTS.md 가 사전점검 뜻과 멈춤 금지를 적는다', () => {
  assert.match(agents, /사전점검 = 최신 main에서 위 4종을 읽고/);
  assert.match(agents, /채팅형 GPT가 node·셸을 직접 실행할 수 없는 것은 사전점검 실패가 아니다/);
  assert.match(agents, /company-central-policy-contract-qa/);
});
test('근거가 되는 중앙정책 값이 그대로다', () => {
  const c = roadmap.fixedAutonomousDevelopmentOperatingContract;
  assert.equal(c.ownerRequestedVibeOneShotPatch.chatExecution.chatgptDirectCoding, true);
  assert.equal(c.startupSync.documentHashesRequired, true);
  assert.ok(fs.existsSync('.github/workflows/company-central-policy-contract-qa.yml'));
});
