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
  assert.match(agents, /깃허브 주소 해석 오류\(DNS\)/);
  assert.match(agents, /중앙 검증기를 채팅 AI 가 직접 실행하는 단계는 없다/);
});
test('근거가 되는 중앙정책 값이 그대로다', () => {
  const c = roadmap.fixedAutonomousDevelopmentOperatingContract;
  assert.equal(c.ownerRequestedVibeOneShotPatch.chatExecution.chatgptDirectCoding, true);
  assert.equal(c.startupSync.documentHashesRequired, true);
  assert.ok(fs.existsSync('.github/workflows/company-central-policy-contract-qa.yml'));
});
test('START_HERE: 모든 AI 입구 파일이 가리키고, 정책 4종 경로·멈춤 금지 문장이 있다', () => {
  const start = fs.readFileSync('START_HERE.md', 'utf8');
  for (const f of ['platform-release-roadmap.json', 'platform-release-roadmap.brief.json', 'company-log-map.json', 'company-architecture-map.json', 'security-immune-system.json']) {
    assert.ok(start.includes(f), f);
    assert.ok(fs.existsSync(`company-learning/${f}`), f + ' 실제 존재');
  }
  for (const phrase of ['중앙 정책이 없다', '비어 있어 검증 불가', '검증기 실행 환경에 연결 못 해', '깃허브 주소 해석 오류', '오류 종류는 상관없다', '중앙 검증기는 네가 직접 실행하지 않는다']) assert.ok(start.includes(phrase), phrase);
  for (const entry of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', '.cursorrules', '.github/copilot-instructions.md', 'roblox-games/mare-essentia/docs/READ_FIRST.md']) {
    assert.ok(fs.readFileSync(entry, 'utf8').includes('START_HERE.md'), entry);
  }
});
test('PR 양식·푸시 전 컴파일 검사(R5)', () => {
  const tpl = fs.readFileSync('.github/pull_request_template.md', 'utf8');
  for (const k of ['main 커밋 SHA', '미검증 항목', 'STUDIO_STEP_OUT']) assert.ok(tpl.includes(k), k);
  const lint = fs.readFileSync('tools/devloop/lint_luau.py', 'utf8');
  assert.match(lint, /subprocess\.run\(\[compiler, "--null", path\]/);
  assert.ok(fs.readFileSync('START_HERE.md', 'utf8').includes('pull_request_template.md'));
});
