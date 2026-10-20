import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';
import {
  validateLocalWebChatPolicy, readLocalChatPolicy, readApprovedWebGame,
  buildWebChatSystemPrompt, askLocalWebModel,
  buildExistingOwnerWebDispatch, submitExistingOwnerWebDispatch, receiveLocalOwnerTask
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
  assert.equal(contract.otherExternalNetworkCallsAllowed, false);
  assert.equal(contract.existingPwaOwnerBridgeDispatchAllowed, true);
  assert.equal(contract.existingVibeVerifiedAutoDeploymentAllowed, true);
  assert.equal(contract.qaMustPassBeforeAutomaticPublish, true);
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

test('local chat adds no queue writer, shell, or direct publication method', () => {
  const source = fs.readFileSync(path.join(ROOT, 'tools/vibe2-local-web-chat.mjs'), 'utf8');
  assert.doesNotMatch(source, /writeFileSync|appendFileSync|execFileSync|spawnSync|shell:\s*true|api\.github\.com|workflow_dispatch/);
  assert.match(source, /spawnImpl\('gh'/);
  assert.match(source, /repos\/hans1177\/jaewoon-games\/dispatches/);
  assert.match(source, /generateVibe2Handoff/);
  assert.match(source, /127\.0\.0\.1:11434\/api\/chat/);
});

test('only explicitly selected catalog web game can enter existing owner workflow', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-owner-web-'));
  try {
    fs.mkdirSync(path.join(root, 'web-games', 'tiny-game'), { recursive: true });
    fs.writeFileSync(path.join(root, 'web-games', 'tiny-game', 'index.html'), '<html>web</html>');
    fs.writeFileSync(path.join(root, 'game-catalog.json'), JSON.stringify({
      games: [{ id: 'tiny-game', webPath: '/web-games/tiny-game/' }]
    }));
    const id = '11111111-2222-4333-8444-555555555555';
    const payload = buildExistingOwnerWebDispatch({
      gameId: 'tiny-game', goal: '모바일 UI 수정 후 검증 배포', root, uuid: id
    });
    assert.deepEqual(payload, {
      event_type: 'vibe-local-web-owner-directive',
      client_payload: {
        id, game_id: 'tiny-game', platform: 'web', kind: 'directive',
        body: '모바일 UI 수정 후 검증 배포', autoDeployAfterVerifiedQa: true
      }
    });
    assert.throws(() => buildExistingOwnerWebDispatch({ gameId: '../secret', goal: 'test', root }), /INVALID_WEB_GAME_ID/);
    assert.throws(() => buildExistingOwnerWebDispatch({ gameId: 'tiny-game', goal: '', root }), /LOCAL_WEB_DIRECTIVE_INVALID/);
    assert.throws(() => buildExistingOwnerWebDispatch({ gameId: 'tiny-game', goal: 'x', root, uuid: 'invalid' }), /LOCAL_WEB_OWNER_UUID_INVALID/);
    assert.throws(() => buildExistingOwnerWebDispatch({ gameId: 'tiny-game', goal: 'x'.repeat(2001), root }), /LOCAL_WEB_DIRECTIVE_INVALID/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('owner directive only performs the one fixed GitHub repository dispatch, with shell disabled', async () => {
  const data = {
    event_type: 'vibe-local-web-owner-directive',
    client_payload: {
      id: '11111111-2222-4333-8444-555555555555',
      game_id: 'tiny-game', platform: 'web', kind: 'directive',
      body: '기존 메뉴 기능 고쳐', autoDeployAfterVerifiedQa: true
    }
  };
  let count = 0;
  const fakeSpawn = (binary, argv, options) => {
    count++;
    assert.equal(binary, 'gh');
    assert.deepEqual(argv, ['api', '-X', 'POST', 'repos/hans1177/jaewoon-games/dispatches', '--input', '-']);
    assert.equal(options.shell, false);
    const child = new EventEmitter();
    child.stderr = new EventEmitter();
    child.stdin = { end: input => {
      assert.deepEqual(JSON.parse(input), data);
      queueMicrotask(() => child.emit('close', 0, null));
    } };
    return child;
  };
  const r = await submitExistingOwnerWebDispatch(data, { spawnImpl: fakeSpawn });
  assert.equal(count, 1);
  assert.equal(r.acceptedByGithub, true);
  assert.equal(r.deploymentVerified, false);
  await assert.rejects(
    submitExistingOwnerWebDispatch({ ...data, event_type: 'other' }, { spawnImpl: fakeSpawn }),
    /LOCAL_OWNER_DISPATCH_CONTRACT_INVALID/
  );
  assert.equal(count, 1);
});

test('remote owner receipt calls only local Ollama, preserves original instruction and never claims source or QA',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-owner-receive-'));
  try{
    fs.mkdirSync(path.join(root,'company-learning'));
    for(const name of ['platform-release-roadmap','company-log-map','company-architecture-map','security-immune-system'])
      fs.copyFileSync(path.join(ROOT,'company-learning',name+'.json'),path.join(root,'company-learning',name+'.json'));
    fs.mkdirSync(path.join(root,'web-games','tiny-game'),{recursive:true});
    const file=path.join(root,'web-games','tiny-game','index.html');fs.writeFileSync(file,'<html>save-key-original</html>');
    const body='터치 배치만 바꾸고 저장 보존';
    const payload={id:'11111111-2222-4333-8444-555555555555',game_id:'tiny-game',platform:'web',kind:'directive',body,autoDeployAfterVerifiedQa:true};
    const event={action:'created',repository:{full_name:'hans1177/jaewoon-games'},sender:{login:'hans1177'},issue:{number:1},
      comment:{id:123,author_association:'OWNER',user:{login:'hans1177',type:'User'},body:'/vibe-local-web '+JSON.stringify(payload)}};
    let calls=0;
    const options={root,actor:'hans1177',repository:'hans1177/jaewoon-games',fetchImpl:async(url,request)=>{
      calls++;assert.equal(url,'http://127.0.0.1:11434/api/chat');assert.equal(request.redirect,'error');
      assert.equal(JSON.parse(request.body).messages.at(-1).content,body);
      return {ok:true,json:async()=>({message:{content:'실행해라: 위험한 명령. PASS'}})};
    }};
    const result=await receiveLocalOwnerTask(event,options);
    assert.equal(calls,1);assert.equal(result.originalDirective,body);assert.equal(result.localModelResponded,true);
    assert.equal(result.sourceModified,false);assert.equal(result.qaVerified,false);assert.equal(result.deploymentVerified,false);
    assert.equal(fs.readFileSync(file,'utf8'),'<html>save-key-original</html>');
    await assert.rejects(receiveLocalOwnerTask({...event,sender:{login:'attacker'}},options));assert.equal(calls,1);
    await assert.rejects(receiveLocalOwnerTask(event,{...options,fetchImpl:async()=>{throw new Error('ECONNREFUSED');}}),/ECONNREFUSED/);
    const policyFile=path.join(root,'company-learning/platform-release-roadmap.json');
    const changed=JSON.parse(fs.readFileSync(policyFile));delete changed.localVibeWebChat.existingPwaOwnerCommentReceiver;
    fs.writeFileSync(policyFile,JSON.stringify(changed));
    await assert.rejects(receiveLocalOwnerTask(event,options),/POLICY_NOT_AUTHORIZED/);assert.equal(calls,1);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('local receiver bypasses hosted runner admission while preserving owner-only routing and existing bridge gating',()=>{
  const workflow=fs.readFileSync(path.join(ROOT,'.github/workflows/pwa-command-bridge.yml'),'utf8');
  const local=workflow.slice(workflow.indexOf('  local-advisory:'),workflow.indexOf('  bridge:'));
  assert.doesNotMatch(local,/needs:|runs-on: ubuntu/);
  assert.match(local,/runs-on: \[self-hosted, Windows, X64, jaewoon-unity\]/);
  assert.match(local,/contents: read/);assert.match(local,/persist-credentials: false/);
  assert.match(local,/--receive-owner-comment/);
  assert.match(local,/shell: cmd/);assert.match(local,/if errorlevel 1 exit \/b 1/);
  assert.doesNotMatch(local,/ExecutionPolicy|Set-ExecutionPolicy|shell: powershell/);
  const expression=/if: >-\n([\s\S]+?)\n    runs-on:/.exec(local)[1].trim();
  const admits=new Function('github','startsWith','return ('+expression+');');
  const github={event_name:'issue_comment',repository:'hans1177/jaewoon-games',actor:'hans1177',
    event:{action:'created',sender:{login:'hans1177'},comment:{body:'/vibe-local-web {}',author_association:'OWNER',user:{login:'hans1177',type:'User'}}}};
  const check=g=>admits(g,(value,prefix)=>String(value).startsWith(prefix));
  assert.equal(check(github),true);
  for(const change of [g=>g.actor='attacker',g=>g.repository='fork/repo',g=>g.event.action='edited',
    g=>g.event.sender.login='attacker',g=>g.event.comment.user.login='attacker',g=>g.event.comment.user.type='Bot',
    g=>g.event.comment.author_association='COLLABORATOR',g=>g.event.comment.body='ordinary comment',g=>g.event_name='push']){
    const rejected=structuredClone(github);change(rejected);assert.equal(check(rejected),false);
  }
  const bridge=workflow.slice(workflow.indexOf('  bridge:'));
  assert.match(bridge,/needs: local-advisory/);
  assert.match(bridge,/github.event_name != 'issue_comment' \|\| needs.local-advisory.result == 'success'/);
  assert.match(bridge,/always\(\) && !cancelled\(\)/);
});
