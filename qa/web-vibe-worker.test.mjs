import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {assertWebVibeWorkerEnvironment,chooseWebVibeTask,safeWebVibeReplacement,resolveWebVibeSources,proposeWebVibeChange} from '../tools/web-vibe-worker.mjs';
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

// 파일명: qa/web-vibe-worker.test.mjs / 웹 전용 한방패치 회귀
test('WEB onepatch selects all existing game text files without count limit',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'web-onepatch-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const game=path.join(root,'web-games','demo');
  fs.mkdirSync(path.join(game,'client'),{recursive:true});
  fs.mkdirSync(path.join(game,'assets'),{recursive:true});
  fs.writeFileSync(path.join(root,'game-catalog.json'),JSON.stringify({games:[{id:'demo',webPath:'/web-games/demo/'}]}));
  fs.writeFileSync(path.join(game,'index.html'),'<html><body>play</body></html>');
  for(let i=0;i<24;i++)fs.writeFileSync(path.join(game,'client','unit'+i+'.mjs'),'export const tick='+i+';');
  fs.writeFileSync(path.join(game,'assets','model.glb'),'not editable');
  assert.equal(resolveWebVibeSources('demo',{repoRoot:root,files:'*'}).length,25);
  assert.equal(resolveWebVibeSources('demo',{repoRoot:root,files:'index.html,client/unit0.mjs'}).length,2);
  assert.equal(resolveWebVibeSources('demo',{repoRoot:root}).length,1);
  for(const target of ['../secret.js','client/../index.html','/etc/passwd','assets/model.glb','native/script.luau','../../company-directive.json']){
    assert.throws(()=>resolveWebVibeSources('demo',{repoRoot:root,files:target}));
  }
  const external=path.join(root,'outside.js');
  fs.writeFileSync(external,'export const z=1;');
  fs.symlinkSync(external,path.join(game,'client','outside.js'));
  assert.throws(()=>resolveWebVibeSources('demo',{repoRoot:root,files:'client/outside.js'}),/SOURCE_OUTSIDE_WEB_GAME/);
  assert.equal(resolveWebVibeSources('demo',{repoRoot:root,files:'*'}).length,25);
  assert.throws(()=>resolveWebVibeSources('demo',{repoRoot:root,files:'roblox-games/demo/server/init.luau'}));
});
test('WEB onepatch preserves existing save keys and JSON structure across files',()=>{
  const original='export const value = 1;\nlocalStorage.getItem("game-save-v1");';
  assert.match(safeWebVibeReplacement(original,JSON.stringify({
    oldText:'export const value = 1;',newText:'export const value = 2;',reason:'requested'
  }),{relative:'client/game.mjs'}).updated,/value = 2/);
  assert.throws(()=>safeWebVibeReplacement(original,JSON.stringify({
    oldText:'"game-save-v1"',newText:'"game-save-v2"'
  }),{relative:'client/game.mjs'}),/SAVE_KEY_CHANGED/);
  assert.throws(()=>safeWebVibeReplacement('{"health":50}',JSON.stringify({
    oldText:'{"health":50}',newText:'{"health":xx}'
  }),{relative:'data/config.json'}),/JSON_STRUCTURE_INVALID/);
});
test('WEB onepatch requires explicit owner scope, real changes, and retains canonical PR/main publication',()=>{
  const code=fs.readFileSync('tools/web-vibe-worker.mjs','utf8');
  assert.match(code,/--files=/);
  assert.match(code,/--all/);
  assert.match(code,/WEB_VIBE_NO_ACTUAL_SOURCE_DELTA/);
  assert.match(code,/WEB_VIBE_UNEXPECTED_CHANGED_FILE/);
  assert.match(code,/WEB_VIBE_CONTROL_BRANCH/);
  assert.match(code,/qa\/web-vibe-organization.test.mjs/);
  const pages=fs.readFileSync('.github/workflows/magic-forest-pages.yml','utf8');
  assert.match(pages,/actions\/deploy-pages@v4/);
  assert.match(pages,/POST_PUBLISH_SMOKE_EXACT_SHA=PASS/);
});

test('WEB-only next development receives verified past patches as context, not deployment proof',()=>{
 const source=fs.readFileSync('tools/web-vibe-worker.mjs','utf8');
 assert.match(source,/prior=\(task\.ownerPatchLineage\?\.verifiedPredecessors/);
 assert.match(source,/WEB_VIBE_BUILD_UP_HISTORY_NOT_VERIFIED/);
 assert.match(source,/Continue from current game source and preserve existing mechanics\/saves/);
 assert.match(source,/previousVerified\.map/);
 assert.doesNotMatch(source,/roblox-games\/|vibe2-unreal-core|Cloudflare/i);
});


test('GitHub-hosted WEB_VIBE_1 rejects spoofed identity and requires independent free-model credential',()=>{
  const token='web-dedicated-repo-pat';
  const context={GITHUB_ACTIONS:'true',GITHUB_ACTOR:'hans1177',
    GITHUB_REPOSITORY:'hans1177/jaewoon-games',GITHUB_EVENT_NAME:'issue_comment',
    GITHUB_REF:'refs/heads/main',GEMINI_API_KEY:'testing-fixture'};
  assert.equal(assertWebVibeWorkerEnvironment({token,cloud:true,environment:context}).organization,'WEB');
  assert.equal(assertWebVibeWorkerEnvironment({token,cloud:true,
    environment:{...context,GITHUB_EVENT_NAME:'repository_dispatch'}}).githubHosted,true);
  for(const env of [
    {...context,GITHUB_ACTOR:'someone-else'},
    {...context,GITHUB_REPOSITORY:'other/team'},
    {...context,GITHUB_EVENT_NAME:'pull_request'},
    {...context,GITHUB_REF:'refs/heads/feature'}
  ])assert.throws(()=>assertWebVibeWorkerEnvironment({token,cloud:true,environment:env}));
  assert.equal(assertWebVibeWorkerEnvironment({token,cloud:true,environment:{...context,GEMINI_API_KEY:''}}).githubHosted,true);
  assert.throws(()=>assertWebVibeWorkerEnvironment({token:'',cloud:true,environment:context}));
});
test('existing cloud free-model response is bounded by same WEB source and save invariants',async()=>{
  const task={gameId:'demo',goal:'fix score HUD'};
  const source={relative:'web-games/demo/client/game.js',
    original:'const score=1;\\nlocalStorage.setItem("player-save-v1", score);\\n'};
  let calls=0;
  const patch=await proposeWebVibeChange(task,source,{cloud:true,apiKey:'fixture',
    geminiImpl:async args=>{
      calls++;
      assert.equal(args.responseMimeType,'application/json');
      assert.ok(args.contents[0].parts[0].text.includes('web-games/demo/client/game.js'));
      assert.ok(!args.contents[0].parts[0].text.includes('roblox-games/'));
      return {text:JSON.stringify({oldText:'const score=1;',newText:'const score=2;',reason:'hud'})};
    }});
  assert.equal(calls,1);
  assert.match(patch.updated,/score=2/);
  assert.match(patch.updated,/player-save-v1/);
  const irrelevant=await proposeWebVibeChange(task,source,{cloud:true,apiKey:'fixture',
    geminiImpl:async()=>({text:JSON.stringify({skip:true,reason:'not affected'})})});
  assert.equal(irrelevant,null);
  await assert.rejects(()=>proposeWebVibeChange(task,source,{cloud:true,apiKey:'fixture',
    geminiImpl:async()=>({text:JSON.stringify({oldText:'player-save-v1',newText:'player-save-v2'})})}));
});


test('WEB cloud patch uses stable owner task branch and review checkpoint instead of false merge',()=>{
 const source=fs.readFileSync('tools/web-vibe-worker.mjs','utf8');
 assert.match(source,/const branch='web-vibe\/'\+task.gameId\+'-'\+task.id.slice\(4\)/);
 assert.match(source,/markWebVibeReview\(task,pr,token\)/);
 assert.match(source,/status:'review',reviewPrUrl:url/);
 assert.match(source,/WEB_VIBE_REVIEW_QUEUE_STALE/);
 assert.match(source,/web-vibe-pr-created:needs-independent-qa-and-owner-merge/);
 assert.match(source,/merged:false,deployed:false/);
});

test('WEB onepatch uses existing gameplay function without model key and rejects unsupported keyless tasks',async()=>{
  const game='<html><body><button id="attackButton" data-gameplay-action="attack">공격</button>'
    +'<script>let attacks=0;function attack(){attacks+=1;}</script>'
    +'<section>'+('Existing gameplay and mobile game controls remain unchanged for all players. ').repeat(10)+'</section></body></html>';
  const task={gameId:'demo',goal:'모바일 공격 버튼 터치 연결'};
  const edit=await proposeWebVibeChange(task,{relative:'web-games/demo/index.html',original:game},
    {cloud:true,apiKey:'',geminiImpl:async()=>{throw Error('unexpected model call');}});
  assert.equal(edit.deterministicWebInput,true);
  assert.match(edit.updated,/addEventListener\("click", attack\)/);
  assert.match(edit.updated,/let attacks=0/);
  assert.match(edit.updated,/Existing gameplay/);
  await assert.rejects(()=>proposeWebVibeChange({...task,goal:'보스 전투 로직 전체 작성'},
    {relative:'web-games/demo/index.html',original:'<html><script>function dodge(){}</script></html>'},
    {cloud:true,apiKey:'',geminiImpl:async()=>{throw Error('model called');}}),/WEB_VIBE_FREE_MODEL_KEY_MISSING/);
});
