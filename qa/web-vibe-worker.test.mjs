import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertWebVibeWorkerEnvironment,chooseWebVibeTask,safeWebVibeReplacement} from '../tools/web-vibe-worker.mjs';
import {emptyWebVibeQueue} from '../tools/web-vibe-organization.mjs';
test('independent WEB worker requires its own credentials and own localhost model endpoint',()=>{
  assert.throws(()=>assertWebVibeWorkerEnvironment({token:''}),/DEDICATED_TOKEN_REQUIRED/);
  assert.throws(()=>assertWebVibeWorkerEnvironment({token:'123456789abc',endpoint:'http://127.0.0.1:11434/api/chat'}),/DEDICATED_MODEL_ENDPOINT_REQUIRED/);
  assert.equal(assertWebVibeWorkerEnvironment({token:'123456789abc'}).organization,'WEB');
});
test('WEB local worker can select only web queue tasks',()=>{
  const valid={id:'pwa-aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',gameId:'insect-survival',
    target:'web',sourceRoot:'web-games/insect-survival',status:'queued',goal:'web HUD'};
  const q={...emptyWebVibeQueue(),tasks:[valid]};
  assert.equal(chooseWebVibeTask(q,valid.id).gameId,'insect-survival');
  assert.throws(()=>chooseWebVibeTask(q,'unknown'),/NOT_QUEUED/);
  assert.throws(()=>chooseWebVibeTask({...q,tasks:[{...valid,target:'roblox'}]},valid.id),/INVALID_TASK/);
});
test('WEB model output is untrusted and save keys plus HTML envelope cannot change',()=>{
  const before='<!doctype html><html><body>localStorage.getItem("web-save");<p>Original exact gameplay line</p></body></html>';
  const good=safeWebVibeReplacement(before,JSON.stringify({oldText:'<p>Original exact gameplay line</p>',newText:'<p>Updated actual gameplay line</p>',reason:'fine'}));
  assert.ok(good.updated.includes('Updated actual'));
  assert.throws(()=>safeWebVibeReplacement(before,JSON.stringify({oldText:'localStorage.getItem("web-save")',newText:'localStorage.getItem("native-save")'})),/SAVE_KEY_CHANGED/);
  assert.throws(()=>safeWebVibeReplacement(before,'invalid'),/MODEL_JSON_INVALID/);
  assert.throws(()=>safeWebVibeReplacement(before,JSON.stringify({oldText:'<html>',newText:'<html><script>eval(1)</script>'})));
});
test('WEB worker has no shared Vibe2 executor, native editor, or automatic promotion',()=>{
  const code=fs.readFileSync('tools/web-vibe-worker.mjs','utf8');
  assert.doesNotMatch(code,/vibe2-continuous-core|vibe2-unreal-core|\.vibe2\/queue|jaewoon-unity|roblox-games\//);
  assert.match(code,/WEB_VIBE_GH_TOKEN/);
  assert.match(code,/127\.0\.0\.1:11435\/api\/chat/);
  assert.match(code,/--apply/);
  assert.match(code,/localQaVerified:true,merged:false,deployed:false/);
});
