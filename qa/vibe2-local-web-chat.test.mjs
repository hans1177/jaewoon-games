import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateLocalWebChatPolicy, readLocalChatPolicy, readApprovedWebGame,
  buildWebChatSystemPrompt, askLocalWebModel
} from '../tools/vibe2-local-web-chat.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policy = JSON.parse(fs.readFileSync(path.join(ROOT, 'company-learning/platform-release-roadmap.json'), 'utf8'));

test('central policy explicitly permits web-only advisory chat without changing worker authority', () => {
  const contract = validateLocalWebChatPolicy(policy);
  assert.equal(contract.platform, 'WEB');
  assert.equal(contract.model, 'qwen2.5-coder:3b');
  assert.equal(contract.localhostOnly, true);
  assert.equal(contract.runtimeEndpoint, 'http://127.0.0.1:11434/api/chat');
  assert.equal(contract.machineStateMutationAllowed, false);
  assert.equal(contract.externalNetworkCallsAllowed, false);
  assert.equal(contract.existingSecurityRuntimeAndF0F9GatesUnchanged, true);
  assert.equal(readLocalChatPolicy(ROOT).sourceWriteAllowed, false);
  assert.equal(policy.fixedAutonomousDevelopmentOperatingContract.newPipelineWrapperOrShadowStructureForThisOperatingModel, false);
});

test('local conversation rejects any source/GitHub/deployment/QA authority expansion', () => {
  for (const key of ['sourceWriteAllowed', 'githubWriteAllowed', 'workflowDispatchAllowed',
    'deploymentAllowed', 'qaVerdictAllowed', 'centralPolicyOverrideAllowed']) {
    assert.throws(() => validateLocalWebChatPolicy({
      localVibeWebChat: { ...policy.localVibeWebChat, [key]: true }
    }), /LOCAL_WEB_CHAT_POLICY_NOT_AUTHORIZED/);
  }
  for (const key of ['platform', 'model', 'executionScope']) {
    assert.throws(() => validateLocalWebChatPolicy({
      localVibeWebChat: { ...policy.localVibeWebChat, [key]: 'INVALID' }
    }), /LOCAL_WEB_CHAT_POLICY_NOT_AUTHORIZED/);
  }
  assert.throws(() => validateLocalWebChatPolicy({}), /LOCAL_WEB_CHAT_POLICY_NOT_AUTHORIZED/);
});

test('web source reader allows only the explicit web-game index.html under the repository', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-local-web-chat-'));
  try {
    const web = path.join(root, 'web-games', 'tiny-game');
    fs.mkdirSync(web, { recursive: true });
    fs.writeFileSync(path.join(web, 'index.html'), '<html>playable</html>');
    fs.mkdirSync(path.join(root, 'secrets'));
    fs.writeFileSync(path.join(root, 'secrets', 'token.txt'), 'SECRET_VALUE');
    assert.equal(readApprovedWebGame('tiny-game', root).excerpt, '<html>playable</html>');
    for (const id of ['../secrets', '/etc/passwd', '.git', 'tiny-game/../../secrets']) {
      assert.throws(() => readApprovedWebGame(id, root), /INVALID_WEB_GAME_ID/);
    }
    const link = path.join(root, 'web-games', 'escape');
    try {
      fs.symlinkSync(path.join(root, 'secrets'), link, 'junction');
      assert.throws(() => readApprovedWebGame('escape', root));
    } catch (error) {
      if (!['EPERM', 'ENOTSUP', 'EACCES'].includes(error.code)) {
        assert.ok(error.code === 'ENOENT' || /WEB_SOURCE_OUTSIDE_APPROVED_ROOT/.test(error.message));
      }
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('model receives bounded local-only advisory messages, never tool privileges', async () => {
  const prompt = buildWebChatSystemPrompt({
    snapshotConsistent: true,
    webTaskSamplesOnly: { queuedPreview: [{ gameId: 'tiny-game', status: 'queued' }] }
  });
  assert.match(prompt, /파일 수정, GitHub 쓰기/);
  assert.match(prompt, /검증되지 않은 참고 의견/);
  let callCount = 0;
  const reply = await askLocalWebModel({
    messages: [{ role: 'system', content: prompt }, { role: 'user', content: '웹게임 상태?' }],
    fetchImpl: async (url, options) => {
      callCount++;
      assert.equal(url, 'http://127.0.0.1:11434/api/chat');
      assert.equal(options.method, 'POST');
      assert.equal(options.redirect, 'error');
      const request = JSON.parse(options.body);
      assert.equal(request.model, 'qwen2.5-coder:3b');
      assert.equal(request.stream, false);
      assert.deepEqual(request.messages.map(row => row.role), ['system', 'user']);
      assert.equal(request.options.num_ctx, 3072);
      return { ok: true, json: async () => ({ message: { content: ' 확인된 정보만 답변 ' } }) };
    }
  });
  assert.equal(callCount, 1);
  assert.equal(reply, '확인된 정보만 답변');
  await assert.rejects(
    askLocalWebModel({
      messages: [{ role: 'system', content: prompt }, { role: 'user', content: '?' }],
      fetchImpl: async () => ({ ok: false, status: 503 })
    }), /OLLAMA_LOCAL_HTTP_503/
  );
});

test('local chat introduces no new workflow, queue writer, or repository command runner', () => {
  const source = fs.readFileSync(path.join(ROOT, 'tools/vibe2-local-web-chat.mjs'), 'utf8');
  assert.doesNotMatch(source, /writeFileSync|appendFileSync|execFileSync|spawnSync|child_process|github\.com\/api|api\.github\.com|workflow_dispatch/);
  assert.match(source, /generateVibe2Handoff/);
  assert.match(source, /127\.0\.0\.1:11434\/api\/chat/);
});
