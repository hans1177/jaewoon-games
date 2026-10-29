// 파일명: qa/web-vibe-worker.test.mjs · 웹 작업자 검증
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {assertWebVibeWorkerEnvironment,chooseWebVibeTask,safeWebVibeReplacement,resolveWebVibeSources,proposeWebVibeChange,webLearningCandidate,compileVerifiedWebLearning,synthesizeWebProgressionWithoutModel,synthesizeWebAlgorithmWithoutModel} from '../tools/web-vibe-worker.mjs';
import {emptyWebVibeQueue} from '../tools/web-vibe-organization.mjs';
import {synthesizeVibe59NumericAlgorithm,synthesizeVibe59NumericAlgorithmSource,runVibe59CodeLaboratory,extractVibe59AlgorithmConceptCandidates,renderVibe59NumericLuaAST,createVibe59CodeCandidate,createVibe59CodeCandidates,evaluateVibe59OfflinePatchEvidence} from '../tools/vibe2-v59-autonomy.mjs';
test('independent WEB worker requires its own credentials and own localhost model endpoint',()=>{
  assert.throws(()=>assertWebVibeWorkerEnvironment({token:''}),/DEDICATED_TOKEN_REQUIRED/);
  assert.throws(()=>assertWebVibeWorkerEnvironment({token:'123456789abc',endpoint:'http://127.0.0.1:11434/api/chat'}),/DEDICATED_MODEL_ENDPOINT_REQUIRED/);
  assert.equal(assertWebVibeWorkerEnvironment({token:'123456789abc'}).organization,'WEB');
});
test('WEB cloud checkout recovery is limited to authenticated ephemeral GitHub workspace',()=>{
  const source=fs.readFileSync('tools/web-vibe-worker.mjs','utf8');
  assert.match(source,/function verifiedLocalMain\(\{cloud=false\}=\{\}\)/);
  assert.match(source,/process\.env\.GITHUB_ACTIONS==='true'/);
  assert.match(source,/process\.env\.GITHUB_REPOSITORY===REPO/);
  assert.match(source,/path\.resolve\(process\.env\.GITHUB_WORKSPACE\|\|'\/'\)===ROOT/);
  assert.match(source,/if\(!isolatedCloudCheckout\)fail\('WEB_VIBE_LOCAL_UNCOMMITTED_CHANGES'\)/);
  assert.match(source,/WEB_VIBE_MAIN_MUST_BE_FAST_FORWARDED_FIRST/);
  assert.match(source,/run\('git',\['restore','--source=HEAD'/);
  assert.match(source,/run\('git',\['clean','-fd'\]\)/);
  assert.match(source,/WEB_VIBE_CLOUD_CHECKOUT_STILL_DIRTY/);
  assert.match(source,/verifiedLocalMain\(\{cloud:args\.cloud===true\}\)/);
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
test('WEB owner worker accepts existing large game file but keeps a finite source limit',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'web-vibe-large-source-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const game=path.join(root,'web-games','fantasy-survival');
  fs.mkdirSync(game,{recursive:true});
  fs.writeFileSync(path.join(root,'game-catalog.json'),JSON.stringify({
    games:[{id:'fantasy-survival',webPath:'web-games/fantasy-survival'}]
  }));
  const file=path.join(game,'index.html');
  fs.writeFileSync(file,'<html>'+('X'.repeat(1361000))+'</html>');
  assert.equal(resolveWebVibeSources('fantasy-survival',{repoRoot:root}).length,1);
  fs.writeFileSync(file,'<html>'+('X'.repeat(2*1024*1024))+'</html>');
  assert.throws(()=>resolveWebVibeSources('fantasy-survival',{repoRoot:root}),/SOURCE_SIZE_OUT_OF_SCOPE/);
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
    original:'const score=1;\nlocalStorage.setItem("player-save-v1", score);\n'};
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
 assert.match(source,/markWebVibeReview\(task,pr,token,changed\)/);
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

test('existing exorcist office extends native mission and investigation contracts without altering saves or combat',()=>{
  const source=fs.readFileSync('web-games/exorcist-office/index.html','utf8');
  const missionsText=source.match(/const MISSIONS=(\[[\s\S]*?\]);\s*const INVESTIGATIONS=/)?.[1];
  const investigationsText=source.match(/const INVESTIGATIONS=(\{[\s\S]*?\});\s*const OFFICE_UPGRADES=/)?.[1];
  assert.ok(missionsText&&investigationsText);
  const missions=Function('return '+missionsText)();
  const investigations=Function('return '+investigationsText)();
  assert.equal(missions.filter(m=>m.id==='m10').length,1);
  assert.ok(missions.some(m=>m.id==='m9'&&m.ghost==='pack'&&m.reward===2600));
  const mission=missions.find(m=>m.id==='m10');
  assert.equal(mission.level,3);
  assert.equal(mission.reward,2600,'new variant reuses established enemy reward tier');
  assert.equal(mission.ghost,'pack','reuses existing enemy mechanics');
  const scenario=investigations.m10;
  assert.equal(scenario.tasks.length,8);
  assert.equal(scenario.clueHints.length,5);
  for(let i=0;i<scenario.tasks.length;i++){
    for(const prior of scenario.tasks[i].requiresTasks||[])assert.ok(Number.isInteger(prior)&&prior>=0&&prior<i);
    for(const hint of scenario.tasks[i].requiresClues||[])assert.ok(Number.isInteger(hint)&&hint>=0&&hint<scenario.clueHints.length);
  }
  assert.match(source,/INVESTIGATIONS\[m\.id\]/);
  assert.match(source,/function updateInvestigation\(/);
  assert.match(source,/for\(const m of MISSIONS\)/);
  assert.match(source,/localStorage\.setItem\(SAVE_KEY,JSON\.stringify\(save\)\)/);
  assert.match(source,/function defaultSave\(\)/);
});

// 앞부분에 없는 함수와 기존 리스너가 있어도 실제 필요한 연결만 일괄 수정한다.
test('keyless worker scans complete module and executes batched controls resize blur and frame fixes',async()=>{
 const original='<html><body><button id="attackButton" data-gameplay-action="attack">공격</button>'
  +'<button id="dodgeButton" data-gameplay-action="dodge">회피</button><script type="module">'
  +'/*'+('existing verified game source '.repeat(550))+'*/\n'
  +'(()=>{function attack(){state.attacks++}function dodge(){state.dodges++}\n'
  +'function releaseInputs(){state.releases++}function resize(){state.resizes++}\n'
  +'function tick(now,last){const dt=(now-last)/1000;return dt}globalThis.tick=tick;\n'
  +'addEventListener("keydown",()=>{});})();</script></body></html>';
 let network=0;
 const edit=await proposeWebVibeChange({gameId:'demo',goal:'모바일 버튼 입력·화면 회전·프레임 시간차 수정'},
  {relative:'web-games/demo/index.html',original},{cloud:true,apiKey:'',fetchImpl:async()=>{network++;throw Error('network')},geminiImpl:async()=>{network++;throw Error('model')}});
 await assert.rejects(()=>proposeWebVibeChange({gameId:'demo',goal:'모바일 버튼 연결과 신규 보스 전투 구현'},
  {relative:'web-games/demo/index.html',original},{cloud:true,apiKey:''}),/FREE_MODEL_KEY_MISSING/);
 assert.equal(network,0);assert.ok(edit.analysis.bytes>13500);assert.ok(edit.analysis.functions.includes('releaseInputs'));
 assert.equal(edit.deterministicSteps,2);
 const handlers=new Map(),buttons=new Map(),state={attacks:0,dodges:0,releases:0,resizes:0};
 const context=vm.createContext({state,addEventListener:(type,fn)=>handlers.set(type,fn),document:{getElementById:id=>({addEventListener:(type,fn)=>buttons.set(id,fn)})}});
 vm.runInContext(edit.updated.match(/<script type="module">([\s\S]*?)<\/script>/)[1],context);
 buttons.get('attackButton')();buttons.get('dodgeButton')();handlers.get('blur')();handlers.get('resize')();
 assert.deepEqual(state,{attacks:1,dodges:1,releases:1,resizes:1});assert.equal(context.tick(10000,0),.05);assert.equal(context.tick(0,100),0);
 await assert.rejects(()=>proposeWebVibeChange({gameId:'demo',goal:'모바일 버튼 입력·화면 회전·프레임 시간차 수정'},
  {relative:'web-games/demo/index.html',original:edit.updated},{cloud:true,apiKey:''}),/FREE_MODEL_KEY_MISSING/);
});

test('worker refuses invalid module and inline script before any candidate write',()=>{
 assert.throws(()=>safeWebVibeReplacement('const value=1;',JSON.stringify({oldText:'const value=1;',newText:'const value=;'}),{relative:'game.mjs'}));
 assert.throws(()=>safeWebVibeReplacement('<html><script>let value=1;</script></html>',JSON.stringify({oldText:'let value=1;',newText:'let value=;'})));
});

test('scheduled WEB retry is restricted to the authenticated owner WEB workflow',()=>{
  const token='x'.repeat(30);
  const env={GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'hans1177/jaewoon-games',
    GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'schedule',
    GITHUB_ACTOR:'github-actions[bot]',GITHUB_WORKFLOW:'PWA Command Bridge'};
  assert.equal(assertWebVibeWorkerEnvironment({token,cloud:true,environment:env}).githubHosted,true);
  for(const changed of [
    {GITHUB_WORKFLOW:'Different workflow'},
    {GITHUB_REPOSITORY:'other/repository'},
    {GITHUB_REF:'refs/heads/feature'},
    {GITHUB_ACTIONS:'false'},
    {GITHUB_EVENT_NAME:'pull_request'},
    {GITHUB_EVENT_NAME:'workflow_dispatch'}
  ])assert.throws(()=>assertWebVibeWorkerEnvironment({token,cloud:true,environment:{...env,...changed}}));
  assert.equal(assertWebVibeWorkerEnvironment({token,cloud:true,
    environment:{...env,GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_ACTOR:'hans1177'}}).githubHosted,true);
});

// 회귀: 큰 파일의 뒤쪽 책임 함수와 연결 변경을 기존 검증 경로로 처리한다.
test('WEB large file context reaches late responsible functions and exact dependencies',async()=>{
 const prefix='/*'+('unrelated padding '.repeat(4500))+'*/\n';
 const functions=Array.from({length:180},(_,i)=>'function idle'+i+'(){return '+i+';}').join('\n');
 const original=prefix+functions+'\nfunction combatDependency(){return 12;}\nfunction lateAttack(){return combatDependency()+1;}';
 let prompt='';
 const edit=await proposeWebVibeChange({gameId:'demo',goal:'lateAttack combat improvement '+('owner detail '.repeat(210))+'TAIL_OWNER_REQUIREMENT',responsibleSymbols:['lateAttack']},
  {relative:'web-games/demo/game.mjs',original},{cloud:true,apiKey:'fixture',geminiImpl:async request=>{
    prompt=request.contents[0].parts[0].text;
    assert.ok(prompt.includes('TAIL_OWNER_REQUIREMENT'));
    assert.equal(request.maxOutputTokens,8192);
    return {text:JSON.stringify({edits:[{oldText:'function lateAttack(){return combatDependency()+1;}',newText:'function lateAttack(){return combatDependency()+2;}'}],reason:'actual existing function change'})};
  }});
 assert.ok(prompt.includes('COMPLETE FUNCTION lateAttack'));
 assert.ok(prompt.includes('function combatDependency(){return 12;}'));
 assert.ok(!prompt.includes(prefix.trim()));
 assert.ok(edit.updated.endsWith('function lateAttack(){return combatDependency()+2;}'));
});
test('WEB connected edits are atomic, source anchored and retain final save and syntax guards',()=>{
 const original='const firstValue=1; const secondValue=2; localStorage.getItem("existing-save");';
 const change=safeWebVibeReplacement(original,JSON.stringify({edits:[
  {oldText:'const firstValue=1;',newText:'const firstValue=3;'},
  {oldText:'const secondValue=2;',newText:'const secondValue=4;'}
 ]}),{relative:'game.mjs'});
 assert.ok(change.updated.includes('firstValue=3'));
 assert.ok(change.updated.includes('secondValue=4'));
 assert.equal(change.edits.length,2);
 assert.throws(()=>safeWebVibeReplacement(original,JSON.stringify({edits:[
  {oldText:'const firstValue=1;',newText:'const firstValue=3;'},
  {oldText:'localStorage.getItem("existing-save")',newText:'localStorage.getItem("changed-save")'}
 ]}),{relative:'game.mjs'}),/SAVE_KEY_CHANGED/);
 assert.throws(()=>safeWebVibeReplacement(original,JSON.stringify({edits:[
  {oldText:'const firstValue=1;',newText:'const firstValue=3;'},
  {oldText:'firstValue=1;',newText:'firstValue=4;'}
 ]}),{relative:'game.mjs'}),/UNSAFE_OR_NONUNIQUE/);
 const block='function largeCombat(){return ['+Array.from({length:1800},(_,i)=>i).join(',')+'];}';
 assert.ok(safeWebVibeReplacement(block,JSON.stringify({oldText:block,newText:block.replace('return [','return [999,')}),{relative:'game.mjs'}).updated.includes('[999,'));
 assert.throws(()=>safeWebVibeReplacement(original,JSON.stringify({edits:[{oldText:'const firstValue=1;',newText:'const firstValue=;'}]}),{relative:'game.mjs'}));
});


// [무모델 개발] 기존 게임의 실제 책임 함수를 읽고, 실행 코드 변화와 보존 범위를 함께 검증한다.
test('WEB model-less source compiler updates existing 3D bestiary rendering without model calls',async()=>{
  const released=fs.readFileSync('web-games/fantasy-survival/world3d.mjs','utf8');
  assert.match(released,/pen\.font='900 76px system-ui,sans-serif'/);
  const original=released.replace("pen.font='900 76px system-ui,sans-serif'","pen.font='900 64px system-ui,sans-serif'")
    .replace("pen.strokeStyle='#010c08';pen.lineWidth=11;","pen.strokeStyle='#010c08';pen.lineWidth=9;");
  const source={relative:'web-games/fantasy-survival/world3d.mjs',original};
  let calls=0;
  const candidate=await proposeWebVibeChange({
    gameId:'fantasy-survival',goal:'마력숲 도감 등록 몬스터 3D 이름표 너무 흐려서 가독성 개선'
  },source,{cloud:true,apiKey:'',geminiImpl:async()=>{calls++;throw Error('MODEL_MUST_NOT_RUN');}});
  assert.equal(calls,0);
  assert.equal(candidate.deterministicWebSource,true);
  assert.equal(candidate.updated,released,'무모델 생성 결과가 실제 main 소스 변경과 일치해야 한다');
  assert.equal(candidate.offlineSourceProof.runtimeVerified,false);
  assert.deepEqual(candidate.offlineSourceProof.roles,['EXISTING_BESTIARY_NAME_READABILITY']);
  assert.match(candidate.updated,/pen\.font='900 76px system-ui,sans-serif'/);
  assert.match(candidate.updated,/pen\.strokeStyle='#010c08';pen\.lineWidth=11/);
  assert.ok(candidate.updated.includes('state.bestiary?.[e.type?.id]'));
  assert.equal(candidate.updated.includes('pen.font=\'900 64px system-ui,sans-serif\''),false);
  const mixed={gameId:'fantasy-survival',goal:'도감 이름표 흐림 수정, 청사진 설치 오류, 공격 처치 오류까지 모두 변경'};
  await assert.rejects(()=>proposeWebVibeChange(mixed,source,{
    cloud:true,apiKey:'',geminiImpl:async()=>{calls++;throw Error('MODEL_MUST_NOT_RUN');}
  }),/WEB_VIBE_FREE_MODEL_KEY_MISSING/);
  assert.equal(calls,0);
  await assert.rejects(()=>proposeWebVibeChange({
    gameId:'fantasy-survival',goal:'마력숲 도감 등록 몬스터 3D 이름표 너무 흐려서 가독성 개선'
  },{...source,original:candidate.updated},{cloud:true,apiKey:''}),/WEB_VIBE_FREE_MODEL_KEY_MISSING/);
});
test('WEB model-less source compiler directly improves existing frame function and rejects invented content',async()=>{
  const original='function updateFrame(now,last){const dt=(now-last)/1000;return dt;}';
  const source={relative:'web-games/demo/game.js',original};
  let calls=0;
  const candidate=await proposeWebVibeChange({gameId:'demo',goal:'게임 프레임 시간차 안정 개선'},source,{
    cloud:true,apiKey:'',geminiImpl:async()=>{calls++;throw Error('MODEL_MUST_NOT_RUN');}
  });
  assert.equal(calls,0);
  assert.equal(candidate.deterministicWebSource,true);
  assert.match(candidate.updated,/Math\.max\(0,Math\.min\(\.05,\(now-last\)\/1000\)\)/);
  assert.deepEqual(candidate.offlineSourceProof.roles,['EXISTING_FRAME_DELTA_BOUND']);
  assert.equal(candidate.offlineSourceProof.runtimeVerified,false);
  await assert.rejects(()=>proposeWebVibeChange({gameId:'demo',goal:'신규 보스 전투 전체 구현'},
    source,{cloud:true,apiKey:'',geminiImpl:async()=>{calls++;throw Error('MODEL_MUST_NOT_RUN');}}),/WEB_VIBE_FREE_MODEL_KEY_MISSING/);
  assert.equal(calls,0);
});


// [자동 학습] 후보 작성만으로는 학습되지 않으며 병합·공개판·게임별 독립 QA가 필요하다.
test('WEB verified code evolution learns compact responsible-function changes and rejects unverified examples',()=>{
 const task={id:'pwa-'+('a'.repeat(8))+'-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  gameId:'demo',sourceRoot:'web-games/demo',goal:'3D 그래픽 시각 개선'};
 const original='function drawLabel(){label.style.opacity=0.5;label.style.fontWeight="bold";}\n';
 const source={relative:'web-games/demo/game.js',original};
 const patch=safeWebVibeReplacement(original,JSON.stringify({
  oldText:'label.style.opacity=0.5;',newText:'label.style.opacity=0.85;'
 }),{relative:source.relative});
 const recipe=webLearningCandidate(task,[{source,edit:patch}]);
 assert.equal(recipe.length,1);
 assert.equal(recipe[0].owner,'drawLabel');
 assert.equal(recipe[0].topic,'SCENE_PRESENTATION');
 assert.equal(recipe[0].source,source.relative);
 assert.equal(recipe[0].baseSourceSha.length,64);
 const proof={status:'VERIFIED',independentQaPassed:true,browserPassed:true,
  runId:40816165612,sourceRevision:'a'.repeat(40),sourceTreeSha:'b'.repeat(40)};
 const verified={...task,status:'merged',learningCandidates:recipe,learningVerification:proof};
 const result=compileVerifiedWebLearning(task,source,[verified]);
 assert.equal(result.deterministicWebLearned,true);
 assert.match(result.updated,/opacity=0\.85/);
 assert.equal(result.offlineSourceProof.runtimeVerified,false);
 assert.equal(result.offlineSourceProof.verifiedBrowserRun,40816165612);
 for(const bad of [
  {...verified,status:'review'},
  {...verified,learningVerification:{...proof,browserPassed:false}},
  {...verified,learningVerification:{...proof,independentQaPassed:false}},
  {...verified,learningVerification:{...proof,runId:0}},
  {...verified,gameId:'foreign'}
 ])assert.equal(compileVerifiedWebLearning(task,source,[bad]),null);
 assert.equal(compileVerifiedWebLearning({...task,goal:'새로운 보스 전투 추가'},source,[verified]),null);
 assert.equal(compileVerifiedWebLearning(task,{...source,original:patch.updated},[verified]),null);
 assert.equal(compileVerifiedWebLearning(task,{...source,relative:'web-games/other/game.js'},[verified]),null);
 const externalTask={...task,gameId:'other',sourceRoot:'web-games/other'};
 const ported=compileVerifiedWebLearning(externalTask,{...source,relative:'web-games/other/game.js'},[verified]);
 assert.equal(ported.deterministicWebLearned,true);
 assert.match(ported.updated,/opacity=0\.85/);
 assert.equal(ported.offlineSourceProof.runtimeVerified,false);
 assert.equal(compileVerifiedWebLearning(externalTask,{...source,relative:'web-games/other/index.html'},[verified]),null);
});
test('WEB no-model worker actually replays browser-verified same-game learning without any model call',async()=>{
 const source={relative:'web-games/demo/game.js',
  original:'function drawLabel(){label.style.opacity=0.5;label.style.fontWeight="bold";}\n'};
 const task={id:'pwa-11111111-2222-4333-8444-555555555555',
  gameId:'demo',sourceRoot:'web-games/demo',goal:'3D 그래픽 시각 개선'};
 const edit=safeWebVibeReplacement(source.original,JSON.stringify({
  oldText:'label.style.opacity=0.5;',newText:'label.style.opacity=0.85;'
 }),{relative:source.relative});
 const prior={...task,id:'pwa-22222222-3333-4444-8555-666666666666',
  status:'merged',learningCandidates:webLearningCandidate(task,[{source,edit}]),
  learningVerification:{status:'VERIFIED',independentQaPassed:true,browserPassed:true,runId:40816165612,
   sourceRevision:'a'.repeat(40),sourceTreeSha:'b'.repeat(40)}};
 let modelCalls=0;
 const produced=await proposeWebVibeChange(task,source,{cloud:true,apiKey:'',
  previousVerified:[prior],geminiImpl:async()=>{modelCalls++;throw Error('MODEL_CALLED');}});
 assert.equal(modelCalls,0);
 assert.equal(produced.deterministicWebLearned,true);
 assert.match(produced.updated,/opacity=0\.85/);
 assert.equal(produced.offlineSourceProof.runtimeVerified,false);
 await assert.rejects(()=>proposeWebVibeChange(task,source,{cloud:true,apiKey:'',
  previousVerified:[{...prior,status:'review'}],geminiImpl:async()=>{modelCalls++;throw Error('MODEL_CALLED');}}),
  /WEB_VIBE_FREE_MODEL_KEY_MISSING/);
 assert.equal(modelCalls,0);
});


// [무모델 성장] 기존 4개 카탈로그 및 실제 경로 실행 함수로만 콘텐츠를 늘린다.
test('WEB model-less evolution composes distinct playable routes from existing game content without new balance values',async()=>{
 const initial=[
  'const questIds=["q1","q2"];',
  'const recipeIds=["iron","stone"];',
  'const enemyBehaviorIds=["guard","chase"];',
  'const regionIds=["forest","desert"];',
  'const questRoutes=[{"id":"route0","questId":"q1","regionId":"forest","enemyBehaviorId":"guard","recipeId":"iron","nextRegionId":"desert"}];',
  'function selectQuest(){} function enterRegion(){} function setEnemyBehavior(){} function craftItem(){}',
  'function startQuestRoute(id){const route=questRoutes.find(r=>r.id===id);',
  'selectQuest(route.questId);enterRegion(route.regionId);',
  'setEnemyBehavior(route.enemyBehaviorId);craftItem(route.recipeId);enterRegion(route.nextRegionId);}',
  'questRoutes.forEach(row=>{if(row.id){} });'
 ].join('\n');
 const task={gameId:'demo',goal:'퀘스트 지역 전투 제작 콘텐츠 지속 확장'};
 const source={relative:'web-games/demo/game.js',original:initial};
 let calls=0;
 const first=await proposeWebVibeChange(task,source,{cloud:true,apiKey:'',
  geminiImpl:async()=>{calls++;throw Error('MODEL_MUST_NOT_RUN');}});
 assert.equal(calls,0);
 assert.equal(first.deterministicWebGrowth,true);
 assert.equal(first.offlineSourceProof.roles[0],'VERIFIED_EXISTING_PROGRESS_ROUTE');
 assert.equal(first.offlineSourceProof.runtimeVerified,false);
 const rows=value=>JSON.parse(value.match(/const questRoutes=(\[[^\n\r;]*\]);/)[1]);
 assert.equal(rows(first.updated).length,2);
 assert.deepEqual(rows(first.updated)[0],rows(initial)[0]);
 assert.equal(new Set(rows(first.updated).map(x=>x.id)).size,2);
 const second=synthesizeWebProgressionWithoutModel(task,{...source,original:first.updated});
 assert.equal(second.deterministicWebGrowth,true);
 assert.equal(rows(second.updated).length,3);
 assert.equal(new Set(rows(second.updated).map(x=>x.id)).size,3);
 assert.equal(second.updated.includes('const recipeIds=["iron","stone"]'),true);
 assert.equal(second.updated.includes('const enemyBehaviorIds=["guard","chase"]'),true);
 assert.equal(synthesizeWebProgressionWithoutModel({...task,goal:'전투 공격력 변경 콘텐츠 확장'},source),null);
 assert.equal(synthesizeWebProgressionWithoutModel(task,{...source,original:initial.replace('craftItem(route.recipeId);','') }),null);
 assert.equal(synthesizeWebProgressionWithoutModel(task,{...source,original:initial.replace('const regionIds=["forest","desert"];','const regionIds=["forest"];')}),null);
});


// [코드 실험실/알고리즘 발명] 같은 승인 입력으로 제한 탐색과 반례 실험을 반복한다.
test('Vibe2 offline code laboratory ranks only actually played and independently attested strategies',()=>{
 const spec={parameters:['x','y'],maxDepth:3,strategy:'evolution',
  examples:[{args:[1,0],output:1},{args:[2,0],output:2},{args:[3,0],output:3}],
  holdouts:[{args:[2,3],output:5},{args:[4,5],output:9}]};
 const attested=(strategy,revision,evidenceId,outcome='PASS')=>{
   const sourceRevision=revision.repeat(40),playtestRunId=123456;
   return {strategy,sourceRevision,evidenceId,outcome,
    platform:'WEB',gameId:'sample',domain:'AI',modelUsed:false,
    sourceChanged:true,gameSourceChanged:true,actualGamePlaytest:true,
    saveAndBalancePreserved:true,independentQa:'PASS',
    regression:'PASS',security:'PASS',runtime:'PASS',securityEvidenceId:'security-proof-'+evidenceId,
    playtestSourceRevision:sourceRevision,playtestRunId,heldOutCases:3,
    regressionCount:0,reproduced:outcome==='FAIL',counterexampleId:outcome==='FAIL'?'counter-'+evidenceId:null,
    failureSignature:outcome==='FAIL'?'ALGORITHM_DISAGREEMENT':null,
    proof:{evidenceId,sourceRevision,playtestRunId,securityEvidenceId:'security-proof-'+evidenceId,
      independentQa:'PASS',regression:'PASS',security:'PASS',runtime:'PASS',
      actualPlatformRuntime:true,actualGamePlaytest:true,gameSourceChanged:true}};
 };
 const balanced=attested('balanced','a','balanced-real-1');
 const lean=attested('lean','b','lean-real-1','FAIL');
 const counterfeit={...attested('balanced','c','unverified-1'),
   proof:{...balanced.proof,evidenceId:'unverified-1',sourceRevision:'c'.repeat(40),runtime:'PENDING'}};
 const badSource={...attested('balanced','d','mismatch-1'),playtestSourceRevision:'e'.repeat(40)};
 const badSecurity={...attested('balanced','e','security-mismatch-1'),
   securityEvidenceId:'not-the-proof-security-id'};
 const unplayed={...attested('balanced','f','not-played-1'),actualGamePlaytest:false};
 const duplicate={...balanced,strategy:'lean'};
 const lab=runVibe59CodeLaboratory({spec,verifiedHistory:[
  counterfeit,badSource,badSecurity,unplayed,balanced,duplicate,lean,
  {...attested('balanced','g','stale-replay-1'),gameSourceChanged:false}
 ]});
 assert.equal(lab.modelUsed,false);
 assert.equal(lab.runtime,'NOT_RUN');
 assert.equal(lab.sourceWrite,false);
 assert.equal(lab.strategyEvidenceCount,2);
 assert.ok(lab.experiments.length>=2&&lab.experiments.length<=3);
 assert.equal(lab.winner.casesPassed,5);
 assert.ok(Array.isArray(lab.winner.ast));
 assert.ok(lab.winner.inventionOperators.includes('MUTATION'));
 assert.ok(lab.experiments.every(x=>x.sourceChanged===false));
 const verifiedOnly=runVibe59CodeLaboratory({spec,verifiedHistory:[balanced,lean]});
 assert.equal(lab.selectedStrategy,verifiedOnly.selectedStrategy);
 assert.equal(lab.strategyEvidenceCount,verifiedOnly.strategyEvidenceCount);
 assert.equal(lab.independentQa,'NOT_RUN');
 const missingAttestation=runVibe59CodeLaboratory({spec,verifiedHistory:[
  {strategy:'balanced',modelUsed:false,sourceChanged:true,independentQa:'PASS',
   regression:'PASS',security:'PASS',runtime:'PASS',outcome:'PASS',
   sourceRevision:'a'.repeat(40)}
 ]});
 assert.equal(missingAttestation.strategyEvidenceCount,0);
 assert.throws(()=>runVibe59CodeLaboratory({spec:{...spec,holdouts:[]}}),/EXPLICIT_EXAMPLES_REQUIRED/);
});
// [로블록스 공통 코드 경로] 검증된 수치 후보만 기존 Luau 함수 본문에 제안한다.
test('Vibe2 generated algorithm integrates with canonical Roblox candidate without fake runtime proof',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-luau-lab-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const original='local stateName = "unchanged"\nlocal function score(x,y)\n return 0\nend\n';
 fs.writeFileSync(path.join(root,'logic.luau'),original);
 const spec={functionName:'score',parameters:['x','y'],
  examples:[{args:[1,2],output:2},{args:[4,3],output:4},{args:[0,5],output:5}],
  holdouts:[{args:[8,1],output:8},{args:[-2,-1],output:-1}]};
 const order={vibe59CodeRequest:{ownerApproved:true,path:'logic.luau',
  find:'local function score(x,y)\n return 0\nend',algorithmSpec:spec}};
 const candidate=createVibe59CodeCandidate({order,sourceRoot:root,
  responsibleFiles:['logic.luau'],target:'roblox'});
 const inferred=createVibe59CodeCandidate({order:{vibe59CodeRequest:{
   ownerApproved:true,path:'logic.luau',algorithmSpec:spec}},sourceRoot:root,
   responsibleFiles:['logic.luau'],target:'roblox'});
 assert.equal(inferred.sourceFunctionAutoLocated,true);
 assert.equal(inferred.sourceFunctionRewrite,true);
 assert.equal(inferred.edits[0].find,'local function score(x,y)\n return 0\nend');
 assert.equal(candidate.vibe59CodeKind,'ROBLOX_SYNTHESIZED_NUMERIC_ALGORITHM');
 assert.equal(candidate.algorithmProof.runtimeVerified,false);
 assert.equal(candidate.codeLaboratory.independentQa,'NOT_RUN');
 assert.equal(candidate.codeLaboratory.runtime,'NOT_RUN');
 assert.match(candidate.edits[0].replace,/return math\.max\(/);
 assert.match(fs.readFileSync(path.join(root,'logic.luau'),'utf8'),/return 0/);
 assert.throws(()=>createVibe59CodeCandidate({order,sourceRoot:root,
  responsibleFiles:['logic.luau'],target:'web'}),/SOURCE_TARGET_MISMATCH/);
 assert.throws(()=>synthesizeVibe59NumericAlgorithmSource({spec:{...spec,ownerApproved:true},
  target:'roblox',source:'function score(x,y)\n return game.Players\nend',
  relative:'roblox-games/demo/logic.luau'}),/EXISTING_PURE_FUNCTION_REQUIRED/);
});

// [Vibe5.9] 문법 기반 후보 탐색과 반례를 통한 재합성으로 새 계산 함수를 만든다.
test('Vibe5.9 invents nontrivial arithmetic algorithms using counterexample-guided search',()=>{
 const spec={parameters:['x','y'],
  examples:[
   {args:[1,0],output:1},{args:[2,0],output:2},{args:[3,0],output:3},
   {args:[4,0],output:4}
  ],
  holdouts:[{args:[2,3],output:5},{args:[4,5],output:9}]};
 const result=synthesizeVibe59NumericAlgorithm({spec});
 assert.match(result.source,/^return [\s\S]+;$/);
 assert.equal(result.casesPassed,6);
 assert.equal(result.heldOutCases,2);
 assert.ok(result.counterexamples.length>=1,'initial x-only overfit must yield at least one holdout counterexample');
 assert.ok(Number.isSafeInteger(result.candidatesConsidered));
 assert.ok(result.candidatesConsidered>2);
 assert.equal(result.runtimeVerified,false);
 assert.equal(result.sourceWrite,false);
 const source='function solve(x,y){return 0;}\n';
 const compiled=synthesizeVibe59NumericAlgorithmSource({
  spec:{...spec,ownerApproved:true,functionName:'solve'},source,relative:'web-games/demo/game.js'});
 assert.ok(compiled.newText.includes(result.source));
 assert.equal(compiled.search.modelUsed,false);
 assert.throws(()=>synthesizeVibe59NumericAlgorithmSource({
  spec:{...spec,ownerApproved:false,functionName:'solve'},source,relative:'web-games/demo/game.js'}),
  /SOURCE_SCOPE_REQUIRED/);
 assert.throws(()=>synthesizeVibe59NumericAlgorithm({spec:{...spec,holdouts:[]}}),/EXPLICIT_EXAMPLES_REQUIRED/);
 assert.throws(()=>synthesizeVibe59NumericAlgorithm({spec:{...spec,examples:[...spec.examples,spec.examples[0]]}}),
  /DUPLICATE_INPUT/);
 assert.throws(()=>synthesizeVibe59NumericAlgorithmSource({
  spec:{...spec,ownerApproved:true,functionName:'solve'},
  source:'function solve(x,y){localStorage.setItem("save",x);return 0;}',
  relative:'web-games/demo/game.js'}),/EXISTING_PURE_FUNCTION_REQUIRED/);
});
test('WEB existing owner task applies a synthesized numeric algorithm without model, retaining other source',async()=>{
 const source={relative:'web-games/demo/game.js',
  original:'const keepSave="save-v1";function resolve(x,y){return 0;}\n'};
 const spec={source:source.relative,functionName:'resolve',parameters:['x','y'],
  examples:[{args:[1,2],output:2},{args:[4,3],output:4},{args:[0,5],output:5}],
  holdouts:[{args:[8,1],output:8},{args:[-2,-1],output:-1}]};
 const task={gameId:'demo',goal:'기존 계산 함수를 새 알고리즘으로 작성',
  ownerDirective:true,evidence:['owner-source-authenticated'],algorithmSpec:spec};
 let calls=0;
 const edit=await proposeWebVibeChange(task,source,{cloud:true,apiKey:'',
  geminiImpl:async()=>{calls++;throw Error('MODEL_CALLED');}});
 assert.equal(calls,0);
 assert.equal(edit.deterministicWebAlgorithm,true);
 assert.equal(edit.offlineSourceProof.modelUsed,false);
 assert.equal(edit.offlineSourceProof.runtimeVerified,false);
 assert.equal(edit.offlineSourceProof.heldOutCases,2);
 assert.match(edit.updated,/const keepSave="save-v1"/);
 assert.notEqual(edit.updated,source.original);
 assert.equal(synthesizeWebAlgorithmWithoutModel({...task,ownerDirective:false},source),null);
 assert.equal(synthesizeWebAlgorithmWithoutModel({...task,evidence:[]},source),null);
 assert.throws(()=>synthesizeWebAlgorithmWithoutModel({...task,algorithmSpec:{...spec,source:'web-games/other/game.js'}},source),/SPEC_SCOPE_INVALID/);
 // 두 번째 파일을 임의로 바꾸지 않는다.
 assert.equal(await proposeWebVibeChange(task,
  {relative:'web-games/demo/other.js',original:'const status=1;'},
  {cloud:true,apiKey:'',geminiImpl:async()=>{calls++;throw Error('MODEL_CALLED')}}),null);
 assert.equal(calls,0);
 const embedded={...task,algorithmSpec:undefined,
   goal:'알고리즘 작성\n'+String.fromCharCode(96).repeat(3)+'json\n'+
   JSON.stringify({algorithmSpec:spec})+'\n'+String.fromCharCode(96).repeat(3)};
 const inline=synthesizeWebAlgorithmWithoutModel(embedded,source);
 assert.equal(inline.deterministicWebAlgorithm,true);
});
test('Vibe5.9 canonical source candidate accepts only owner-approved bounded algorithm specs',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-algorithm-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.writeFileSync(path.join(root,'logic.js'),'function clamp(a,b){return 0;}\n');
 const spec={functionName:'clamp',parameters:['a','b'],
  examples:[{args:[3,2],output:3},{args:[1,5],output:5},{args:[9,4],output:9}],
  holdouts:[{args:[7,8],output:8},{args:[-1,-4],output:-1}]};
 const order={gameId:'demo',vibe59CodeRequest:{
  ownerApproved:true,path:'logic.js',find:'function clamp(a,b){return 0;}',
  algorithmSpec:spec}};
 const result=createVibe59CodeCandidate({order,sourceRoot:root,
  responsibleFiles:['logic.js'],target:'web'});
 assert.equal(result.vibe59CodeKind,'WEB_SYNTHESIZED_NUMERIC_ALGORITHM');
 assert.equal(result.vibe59TestPlan.pass,true);
 assert.equal(result.algorithmProof.runtimeVerified,false);
 assert.match(result.edits[0].replace,/return Math\.max\(/);
 assert.equal(fs.readFileSync(path.join(root,'logic.js'),'utf8'),'function clamp(a,b){return 0;}\n');
 assert.throws(()=>createVibe59CodeCandidate({order:{...order,vibe59CodeRequest:{
  ...order.vibe59CodeRequest,ownerApproved:false}},sourceRoot:root,
  responsibleFiles:['logic.js'],target:'web'}),/OWNER_EXPLICIT_CODING_SPEC_REQUIRED/);
});


// [학습] 새로 발견한 알고리즘도 실제 검증 전에는 숙련도나 코드 재사용 근거가 아니다.
test('WEB generated algorithm is reusable only after exact merged browser verification',()=>{
  const task={id:'pwa-11111111-2222-4333-8444-555555555555',
    gameId:'demo',sourceRoot:'web-games/demo',goal:'새 계산 알고리즘 작성'};
  const source={relative:'web-games/demo/game.js',
    original:'function score(x,y){return 0;}\n'};
  const change=safeWebVibeReplacement(source.original,JSON.stringify({
    oldText:'function score(x,y){return 0;}',
    newText:'function score(x,y){return Math.max(x,y);}'
  }),{relative:source.relative});
  const lesson=webLearningCandidate(task,[{source,edit:change}]);
  assert.equal(lesson.length,1);
  assert.equal(lesson[0].owner,'score');
  assert.equal(lesson[0].topic,'ALGORITHM_SYNTHESIS');
  const common={...task,status:'review',learningCandidates:lesson,
    learningVerification:{status:'VERIFIED',sourceRevision:'a'.repeat(40),runId:123456,
      independentQaPassed:true,browserPassed:true}};
  assert.equal(compileVerifiedWebLearning(task,source,[common]),null);
  const accepted=compileVerifiedWebLearning(task,source,[{...common,status:'merged'}]);
  assert.equal(accepted.deterministicWebLearned,true);
  assert.match(accepted.updated,/return Math\.max\(x,y\)/);
  assert.equal(accepted.offlineSourceProof.runtimeVerified,false);
});


// [회귀] 무모델 진화기는 WEB/ROBLOX 모두 명시적 수치 oracle과 소스 범위에서만 작동한다.
test('Vibe5.9 AST mutation and crossover search passes new numeric holdouts without a model',()=>{
 const spec={parameters:['x'],strategy:'evolution',maxGenerations:8,
  examples:[{args:[1],output:1},{args:[2],output:0},{args:[3],output:1},{args:[4],output:0}],
  holdouts:[{args:[7],output:1},{args:[8],output:0}]};
 const result=synthesizeVibe59NumericAlgorithm({spec});
 assert.equal(result.search,'BOUNDED_AST_EVOLUTION_CEGIS');
 assert.ok(Array.isArray(result.ast));
 assert.equal(result.casesPassed,6);
 assert.equal(result.fitness.accuracy,1);
 assert.ok(result.fitness.complexity>0);
 assert.ok(result.candidatesConsidered>10);
 assert.equal(result.runtimeVerified,false);
 const program=vm.runInNewContext('(function(x){'+result.source+'})');
 for(const row of [...spec.examples,...spec.holdouts])assert.equal(program(...row.args),row.output);
 // Code alone is never a runtime verified proof.
 assert.equal(result.sourceWrite,false);
});

test('Vibe5.9 AST proof can generate a Luau expression only in an existing pure function',()=>{
 const spec={ownerApproved:true,functionName:'resolve',parameters:['a','b'],
  examples:[{args:[3,2],output:3},{args:[1,5],output:5},{args:[9,4],output:9}],
  holdouts:[{args:[7,8],output:8},{args:[-1,-4],output:-1}]};
 const original='local function resolve(a,b)\n  return 0\nend\n';
 const result=synthesizeVibe59NumericAlgorithmSource({
  spec,source:original,relative:'ServerScriptService/score.server.luau'});
 assert.match(result.newText,/math\.max\(a,b\)/);
 assert.ok(result.search.ast);
 assert.equal(result.search.casesPassed,5);
 assert.equal(result.sourceWrite,false);
 assert.equal(original,'local function resolve(a,b)\n  return 0\nend\n');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-luau-evolution-'));
 try{
  fs.writeFileSync(path.join(root,'score.server.luau'),original);
  const candidate=createVibe59CodeCandidate({target:'roblox',sourceRoot:root,
   responsibleFiles:['score.server.luau'],order:{vibe59CodeRequest:{
    path:'score.server.luau',find:original.trimEnd(),ownerApproved:true,
    algorithmSpec:spec}}});
  assert.equal(candidate.vibe59CodeKind,'ROBLOX_SYNTHESIZED_NUMERIC_ALGORITHM');
  assert.equal(candidate.runtimeVerified,false);
  assert.equal(fs.readFileSync(path.join(root,'score.server.luau'),'utf8'),original);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
 assert.throws(()=>synthesizeVibe59NumericAlgorithmSource({
   spec,source:'local function resolve(a,b)\n  game.Players:ClearAllChildren()\n  return 0\nend\n',
   relative:'score.server.luau'}),/EXISTING_PURE_FUNCTION_REQUIRED/);
});

test('offline general function rewrite composes original Web event handler from verified transition cases',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe59-general-web-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const original='const saved="save-v1";\nfunction advance( eventName ) { return false; }\n';
 fs.writeFileSync(path.join(root,'game.js'),original);
 const machine={handlerName:'advance',stateVariable:'phase',
  states:['idle','active'],events:['start'],transitions:[{from:'idle',to:'active',event:'start'}]};
 const scenarios=[
  {name:'start',initialState:{phase:'idle'},events:['start'],expectedState:{phase:'active'},expectedConsumed:[true]},
  {name:'no-duplicate',initialState:{phase:'active'},events:['start'],expectedState:{phase:'active'},expectedConsumed:[false]}];
 const req={path:'game.js',ownerApproved:true,rewriteExistingFunction:true,machine,scenarios};
 const run=request=>createVibe59CodeCandidate({order:{vibe59CodeRequest:request},
  target:'web',sourceRoot:root,responsibleFiles:['game.js']});
 const result=run(req);
 assert.equal(result.sourceFunctionRewrite,true);
 assert.equal(result.sourceFunction,'advance');
 assert.equal(result.sourceFunctionAutoLocated,true);
 assert.match(result.edits[0].replace,/function advance\( eventName \) \{/);
 assert.equal(result.vibe59TestPlan.pass,true);
 assert.equal(result.vibe59JsReplay.pass,true);
 const audited=()=>createVibe59CodeCandidates({order:{vibe59CodeRequest:req},
  target:'web',sourceRoot:root,responsibleFiles:['game.js']});
 const checked=audited();
 assert.equal(checked.vibe59OfflineAudit.status,'STATIC_ONLY_QA_RUNTIME_REQUIRED');
 assert.equal(checked.vibe59OfflineAudit.functionCount,1);
 assert.equal(checked.vibe59OfflineAudit.editCount,1);
 assert.equal(checked.vibe59OfflineAudit.sourceEvidence.length,1);
 assert.equal(checked.vibe59OfflineAudit.runtimeVerified,false);
 const fingerprint=checked.vibe59OfflineAudit.fingerprint;
 assert.equal(fingerprint.length,64);
 assert.throws(()=>createVibe59CodeCandidates({order:{
  vibe59CodeRequest:req,vibe59RejectedCandidateFingerprints:[fingerprint]},
  target:'web',sourceRoot:root,responsibleFiles:['game.js']}),/REPEATED_FAILED_CANDIDATE/);
 assert.equal(result.edits.length,1);
 assert.match(result.edits[0].replace,/phase = "active"/);
 assert.equal(result.runtimeVerified,false);
 assert.equal(fs.readFileSync(path.join(root,'game.js'),'utf8'),original);
 assert.throws(()=>run({...req,sourceSha256:'0'.repeat(64)}),/STALE_SOURCE/);
 assert.throws(()=>run({...req,scenarios:scenarios.slice(0,1)}),/INDEPENDENT_SCENARIOS_REQUIRED/);
 assert.throws(()=>run({...req,find:'return false;'}),/ANCHOR_MISMATCH/);
});

test('model-free Web rule rewrite executes its final original function, preserving caller contract',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe59-final-replay-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const file='game.js',original='function refresh() { alive=false; }\n';
 fs.writeFileSync(path.join(root,file),original);
 const rule={when:{kind:'compare',op:'gte',left:{kind:'ref',name:'hp'},
   right:{kind:'number',value:1}},
  then:[{output:'alive',action:'assign',value:{kind:'boolean',value:true}}],
  otherwise:[{output:'alive',action:'assign',value:{kind:'boolean',value:false}}]};
 const scenarios=[{name:'living',initialState:{hp:2,alive:false},expectedState:{alive:true}},
  {name:'dead',initialState:{hp:0,alive:true},expectedState:{alive:false}}];
 const request={ownerApproved:true,path:file,rewriteExistingFunction:true,functionName:'refresh',rule,scenarios};
 const run=req=>createVibe59CodeCandidate({target:'web',sourceRoot:root,
  responsibleFiles:[file],order:{vibe59CodeRequest:req}});
 const result=run(request);
 assert.equal(result.sourceFunctionRewrite,true);
 assert.equal(result.vibe59JsReplay.pass,true);
 assert.equal(result.vibe59JsReplay.cases.length>=2,true);
 assert.match(result.edits[0].replace,/function refresh\(\)/);
 assert.equal(fs.readFileSync(path.join(root,file),'utf8'),original);
 fs.writeFileSync(path.join(root,file),'function refresh(hp) { alive=false; }\n');
 assert.throws(()=>run(request),/PARAMETER_CONTRACT/);
 fs.writeFileSync(path.join(root,file),'function refresh() { return false; }\n');
 assert.throws(()=>run(request),/RETURN_CONTRACT/);
});

test('model-free failed independent patch dedupe ignores edit list ordering',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe59-fingerprint-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.writeFileSync(path.join(root,'game.js'),
   'function render(){score = 1;}\nfunction update(){level = 1;}\n');
 const a={path:'game.js',find:'score = 1;',replace:'score = 2;'};
 const b={path:'game.js',find:'level = 1;',replace:'level = 2;'};
 const audit=(edits,order={})=>evaluateVibe59OfflinePatchEvidence({
  candidate:{edits,vibe59CodeKind:'STATE_RULE'},sourceRoot:root,
  responsibleFiles:['game.js'],target:'web',order});
 const forward=audit([a,b]);
 const reverse=audit([b,a]);
 assert.equal(forward.vibe59OfflineAudit.fingerprint,reverse.vibe59OfflineAudit.fingerprint);
 assert.equal(forward.vibe59OfflineAudit.functionCount,2);
 assert.throws(()=>audit([b,a],{
  vibe59RejectedCandidateFingerprints:[forward.vibe59OfflineAudit.fingerprint]
 }),/REPEATED_FAILED_CANDIDATE/);
 assert.equal(fs.readFileSync(path.join(root,'game.js'),'utf8').includes('score = 1;'),true);
});

test('offline Luau state function rewrite stays within original function and cannot alter saves',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe59-luau-function-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const original='local keep="save-v1"\nlocal function advance(eventName)\n return false\nend\n';
 fs.writeFileSync(path.join(root,'main.luau'),original);
 const machine={handlerName:'advance',stateVariable:'phase',
  states:['idle','active'],events:['start'],transitions:[{from:'idle',to:'active',event:'start'}]};
 const scenarios=[{name:'start',initialState:{phase:'idle'},events:['start'],
   expectedState:{phase:'active'},expectedConsumed:[true]},
  {name:'repeat',initialState:{phase:'active'},events:['start'],
   expectedState:{phase:'active'},expectedConsumed:[false]}];
 const order={vibe59CodeRequest:{ownerApproved:true,path:'main.luau',
  rewriteExistingFunction:true,machine,scenarios}};
 const generate=()=>createVibe59CodeCandidate({order,sourceRoot:root,
  responsibleFiles:['main.luau'],target:'roblox'});
 const candidate=generate();
 assert.equal(candidate.sourceFunction,'advance');
 assert.equal(candidate.sourceFunctionAutoLocated,true);
 assert.equal(candidate.edits[0].find,'local function advance(eventName)\n return false\nend');
 assert.match(candidate.edits[0].replace,/local function advance\(eventName\)/);
 assert.match(candidate.edits[0].replace,/phase = "active"/);
 assert.equal(candidate.vibe59TestPlan.pass,true);
 assert.equal(fs.readFileSync(path.join(root,'main.luau'),'utf8'),original);
 fs.writeFileSync(path.join(root,'main.luau'),original+'local function advance(eventName)\n return false\nend\n');
 assert.throws(generate,/FUNCTION_OWNER_AMBIGUOUS/);
 fs.writeFileSync(path.join(root,'main.luau'),original.replace('return false','DataStoreService:UpdateAsync("key")'));
 assert.throws(generate,/FUNCTION_REWRITE_PROTECTED/);
});

test('Vibe5.9 inherited AST concepts must be attested and acyclic before use',()=>{
 const recursive=['abs'];recursive.push(recursive);
 const spec={parameters:['x','y'],strategy:'evolution',maxGenerations:3,
  examples:[{args:[3,2],output:3},{args:[1,5],output:5},{args:[9,4],output:9}],
  holdouts:[{args:[7,8],output:8},{args:[-1,-4],output:-1}],
  verifiedConcepts:[{verified:true,proof:{independentQa:'PASS',
   regression:'PASS',runtime:'PASS',actualPlatformRuntime:true},ast:recursive}]};
 const result=synthesizeVibe59NumericAlgorithm({spec});
 assert.equal(result.casesPassed,5);
 assert.equal(result.search,'BOUNDED_AST_EVOLUTION_CEGIS');
});


test('Vibe5.9 uses only source-matched and independently replayed playtest counterexamples',()=>{
 const source='function solve(x,y){return 0;}\n';
 const sourceSha256=crypto.createHash('sha256').update(source).digest('hex');
 const spec={ownerApproved:true,functionName:'solve',parameters:['x','y'],
  examples:[{args:[2,5],output:5},{args:[8,1],output:8},{args:[-3,-1],output:-1}],
  holdouts:[{args:[7,9],output:9},{args:[0,4],output:4}]};
 const proof={evidenceId:'counterexample-actual-game',independentQa:'PASS',
  regression:'PASS',runtime:'PASS',actualPlatformRuntime:true};
 const row={sourceSha256,actualGamePlaytest:true,gameSourceChanged:true,
  reproduced:true,args:[11,3],output:11,proof};
 const good=synthesizeVibe59NumericAlgorithmSource({spec:{...spec,verifiedCounterexamples:[row]},
  source,relative:'web-games/demo/logic.js'});
 assert.equal(good.acceptedRuntimeCounterexamples,1);
 assert.equal(good.search.trainingCases,4);
 assert.equal(good.search.casesPassed,6);
 assert.throws(()=>synthesizeVibe59NumericAlgorithmSource({
   spec:{...spec,verifiedCounterexamples:[{...row,sourceSha256:'0'.repeat(64)}]},
   source,relative:'web-games/demo/logic.js'}),/COUNTEREXAMPLE_UNVERIFIED/);
 assert.throws(()=>synthesizeVibe59NumericAlgorithmSource({
   spec:{...spec,verifiedCounterexamples:[{...row,proof:{...proof,runtime:'PENDING'}}]},
   source,relative:'web-games/demo/logic.js'}),/COUNTEREXAMPLE_UNVERIFIED/);
});


test('Vibe5.9 extracts reusable WEB and Roblox AST subexpressions without silently verifying them',()=>{
 const specs={ownerApproved:true,functionName:'score',parameters:['x','y'],
   examples:[{args:[1,2],output:2},{args:[4,3],output:4},{args:[0,5],output:5}],
   holdouts:[{args:[8,1],output:8},{args:[-2,-1],output:-1}]};
 const web=synthesizeVibe59NumericAlgorithmSource({spec:specs,
   source:'function score(x,y){return 0;}\n',relative:'web-games/demo/logic.js'});
 const lua=synthesizeVibe59NumericAlgorithmSource({spec:specs,
   source:'local function score(x,y)\n return 0\nend\n',
   relative:'roblox-games/demo/logic.luau'});
 for(const row of [web,lua]){
   const extracted=row.conceptCandidates;
   assert.equal(extracted.verification,'ORACLE_ONLY');
   assert.equal(extracted.verified,false);
   assert.equal(extracted.promotionAuthorized,false);
   assert.equal(extracted.persisted,false);
   assert.ok(extracted.concepts.length>=1);
   assert.ok(extracted.concepts.length<=8);
   assert.ok(extracted.concepts.every(x=>x.verified===false
     &&x.sourceWriteAuthorized===false&&x.reusableAfterGameProofOnly===true));
   assert.ok(extracted.concepts.some(x=>x.ast[0]==='max'));
   const repeated=extractVibe59AlgorithmConceptCandidates({search:row.search});
   assert.deepEqual(repeated.concepts,extracted.concepts);
 }
 assert.equal(web.search.casesPassed,5);
 assert.equal(lua.search.casesPassed,5);
});
test('Vibe5.9 never promotes forged, cyclic, out-of-bound or unproven AST concepts',()=>{
 const valid={modelUsed:false,sourceWrite:false,runtimeVerified:false,
   casesPassed:5,trainingCases:3,heldOutCases:2,parameters:['x','y'],
   ast:['+', ['param',0], ['param',1]]};
 const accepted=extractVibe59AlgorithmConceptCandidates({search:valid,maxConcepts:1});
 assert.equal(accepted.concepts.length,1);
 assert.equal(accepted.concepts[0].complexity,3);
 assert.equal(accepted.concepts[0].verified,false);
 const cyclic=['abs'];cyclic.push(cyclic);
 const invalid=[
   {...valid,ast:cyclic},
   {...valid,ast:['+', ['param',0],['param',2]]},
   {...valid,ast:['select',['param',0],['const',0]]},
   {...valid,ast:['+', ['param',0],['const',Infinity]]},
   {...valid,ast:['+', ['param',0],['const',2],['const',3]]},
   {...valid,ast:['+', ['param',0],['const',1]],modelUsed:true},
   {...valid,casesPassed:4}
 ];
 for(const row of invalid){
   assert.equal(extractVibe59AlgorithmConceptCandidates({search:row}).concepts.length,0);
 }
 const sourceProof={...valid,ast:{kind:'crossover',operator:'max',
   left:{kind:'reference',name:'x'},right:{kind:'reference',name:'y'}}};
 assert.deepEqual(extractVibe59AlgorithmConceptCandidates({search:sourceProof})
   .concepts[0].ast,['max',['param',0],['param',1]]);
});


test('Vibe5.9 canonical source candidate exposes extracted concepts without mutating a game',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe59-concepts-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const original='function score(x,y){return 0;}\nconst untouchedSave="save-v1";\n';
 fs.writeFileSync(path.join(root,'logic.js'),original);
 const order={vibe59CodeRequest:{ownerApproved:true,path:'logic.js',
   find:'function score(x,y){return 0;}',algorithmSpec:{
     functionName:'score',parameters:['x','y'],
     examples:[{args:[1,2],output:2},{args:[4,3],output:4},{args:[0,5],output:5}],
     holdouts:[{args:[8,1],output:8},{args:[-2,-1],output:-1}]}}};
 const candidate=createVibe59CodeCandidate({order,sourceRoot:root,
   responsibleFiles:['logic.js'],target:'web'});
 const auto=createVibe59CodeCandidate({order:{vibe59CodeRequest:{
   ...order.vibe59CodeRequest,find:undefined}},sourceRoot:root,
   responsibleFiles:['logic.js'],target:'web'});
 assert.equal(auto.sourceFunctionAutoLocated,true);
 assert.equal(auto.edits[0].find,'function score(x,y){return 0;}');
 assert.ok(candidate.algorithmConceptCandidates.concepts.length>=1);
 assert.equal(candidate.algorithmConceptCandidates.promotionAuthorized,false);
 assert.equal(candidate.sourceWrite,false);
 assert.equal(candidate.runtimeVerified,false);
 assert.equal(fs.readFileSync(path.join(root,'logic.js'),'utf8'),original);
});


test('Vibe5.9 enumerative provenance never masquerades as evolved AST',()=>{
 const spec={parameters:['x','y'],
  examples:[{args:[1,3],output:3},{args:[7,2],output:7},{args:[-4,-1],output:-1}],
  holdouts:[{args:[9,8],output:9},{args:[0,5],output:5}]};
 const enumerative=synthesizeVibe59NumericAlgorithm({spec});
 assert.equal(enumerative.search,'BOUNDED_ENUMERATIVE_CEGIS');
 assert.equal(Array.isArray(enumerative.ast),false);
 assert.equal(enumerative.ast.kind,'crossover');
 assert.equal(enumerative.casesPassed,5);
 assert.equal(enumerative.runtimeVerified,false);
 assert.equal(enumerative.sourceWrite,false);
 const lab=runVibe59CodeLaboratory({spec});
 assert.equal(lab.winner.search,'BOUNDED_ENUMERATIVE_CEGIS');
 assert.equal(lab.winner.runtimeVerified,false);
 const concepts=extractVibe59AlgorithmConceptCandidates({search:enumerative});
 assert.ok(concepts.concepts.length>0);
 assert.equal(concepts.verified,false);
 assert.equal(concepts.promotionAuthorized,false);
});


test('Vibe5.9 Lua compiler accepts enumerative object AST and evolved array AST with the same bounded language',()=>{
 const spec={parameters:['x','y'],
   examples:[{args:[1,3],output:3},{args:[7,2],output:7},{args:[-4,-1],output:-1}],
   holdouts:[{args:[9,8],output:9},{args:[0,5],output:5}]};
 const enumerative=synthesizeVibe59NumericAlgorithm({spec});
 assert.equal(enumerative.search,'BOUNDED_ENUMERATIVE_CEGIS');
 assert.equal(Array.isArray(enumerative.ast),false);
 assert.equal(enumerative.casesPassed,5);
 assert.equal(renderVibe59NumericLuaAST(enumerative.ast,enumerative.parameters),'math.max(x,y)');
 const evolved=synthesizeVibe59NumericAlgorithm({spec:{...spec,strategy:'evolution',maxGenerations:5}});
 assert.equal(evolved.search,'BOUNDED_AST_EVOLUTION_CEGIS');
 assert.ok(Array.isArray(evolved.ast));
 assert.match(renderVibe59NumericLuaAST(evolved.ast,evolved.parameters),/^(?:math\.max\(|\()/);
 assert.equal(renderVibe59NumericLuaAST(['%',['param',0],['param',1]],['x','y']),
   '(x-math.modf(x/y)*y)');
 assert.equal(renderVibe59NumericLuaAST({kind:'mutation',operator:'round',
   operand:{kind:'reference',name:'x'}},['x']), 'math.floor((x)+0.5)');
 assert.equal(enumerative.runtimeVerified,false);
 assert.equal(evolved.runtimeVerified,false);
});
test('Vibe5.9 Lua compiler fails closed on malformed, cyclic and injected AST',()=>{
 const cyclic={kind:'mutation',operator:'abs'};cyclic.operand=cyclic;
 const deep=['param',0];let nested=deep;
 for(let i=0;i<6;i++)nested=['neg',nested];
 const cases=[
   cyclic,nested,
   ['+', ['param',0], ['param',2]],
   ['+', ['param',0]],
   ['const',Infinity],
   ['const','game.Players:ClearAllChildren()'],
   {kind:'constant',value:1,poison:'ignore'},
   {kind:'crossover',operator:'; game:Destroy()',left:{kind:'reference',name:'x'},
     right:{kind:'reference',name:'y'}},
   {kind:'reference',name:'workspace'},
   ['unknown',['param',0],['param',1]],
   ['select',['param',0],['param',1]]
 ];
 for(const ast of cases)
   assert.throws(()=>renderVibe59NumericLuaAST(ast,['x','y']),/LUA_AST_REQUIRED/);
 assert.throws(()=>renderVibe59NumericLuaAST(['param',0],['__proto__']),
   /LUA_PARAMETERS_INVALID/);
 assert.throws(()=>renderVibe59NumericLuaAST(['param',0],['x','x']),
   /LUA_PARAMETERS_INVALID/);
 for(const illegal of ['x$','and','end','function','goto','type','export'])
   assert.throws(()=>renderVibe59NumericLuaAST(['param',0],[illegal]),
     /LUA_PARAMETERS_INVALID/);
 const badLua='local function score$(x)\n return 0\nend\n';
 assert.throws(()=>synthesizeVibe59NumericAlgorithmSource({
   spec:{ownerApproved:true,functionName:'score$',parameters:['x'],
     examples:[{args:[1],output:1},{args:[2],output:2},{args:[3],output:3}],
     holdouts:[{args:[4],output:4},{args:[5],output:5}]},
   source:badLua,relative:'roblox-games/demo/logic.luau',target:'roblox'
 }),/LUA_PARAMETERS_INVALID/);
});


test('Vibe5.9 CEGIS isolates hidden invalid holdouts and lazily evaluates safe conditional AST branches',()=>{
 const guardedReciprocal=['select',
   ['gt',['param',0],['const',0]],
   ['/', ['const',1],['param',0]],
   ['const',0]];
 const spec={parameters:['x'],maxDepth:3,maxGenerations:2,
  examples:[{args:[1],output:1},{args:[2],output:0.5},{args:[4],output:0.25}],
  holdouts:[{args:[0],output:0},{args:[8],output:0.125}],
  verifiedConcepts:[{verified:true,
    proof:{independentQa:'PASS',regression:'PASS',runtime:'PASS',actualPlatformRuntime:true},
    ast:guardedReciprocal}]};
 for(const strategy of ['evolution',undefined]){
   const result=synthesizeVibe59NumericAlgorithm({spec:{...spec,strategy}});
   assert.equal(result.casesPassed,5);
   assert.equal(result.heldOutCases,2);
   assert.ok(result.counterexamples.includes(0),
     'the hidden zero-denominator holdout must become an explicit counterexample');
   assert.equal(result.runtimeVerified,false);
   assert.equal(result.sourceWrite,false);
   const fn=vm.runInNewContext('(function(x){'+result.source+'})');
   assert.equal(fn(0),0,'unselected 1/0 branch must not invalidate the result');
   assert.equal(fn(8),0.125);
   assert.equal(fn(4),0.25);
   assert.equal(renderVibe59NumericLuaAST(result.ast,['x']).includes('game'),false);
 }
});


test('Vibe5.9 conditional AST evaluates only its selected branch on zero divisors',()=>{
 const piecewise=['select',['param',0],
   ['/', ['const',1],['param',1]],['const',4]];
 const spec={parameters:['x','y'],strategy:'evolution',maxGenerations:2,
   verifiedConcepts:[{verified:true,ast:piecewise,proof:{
     independentQa:'PASS',regression:'PASS',runtime:'PASS',actualPlatformRuntime:true}}],
   examples:[{args:[1,2],output:0.5},{args:[-1,0],output:4},
     {args:[3,5],output:0.2},{args:[-2,0],output:4}],
   holdouts:[{args:[2,4],output:0.25},{args:[-3,0],output:4}]};
 const result=synthesizeVibe59NumericAlgorithm({spec});
 assert.equal(result.search,'BOUNDED_AST_EVOLUTION_CEGIS');
 assert.ok(Array.isArray(result.ast));
 assert.equal(result.casesPassed,6);
 assert.equal(result.runtimeVerified,false);
 const fn=vm.runInNewContext('(function(x,y){'+result.source+'})');
 for(const row of [...spec.examples,...spec.holdouts])
   assert.ok(Math.abs(fn(...row.args)-row.output)<1e-8);
 const roblox=synthesizeVibe59NumericAlgorithmSource({
   spec:{...spec,ownerApproved:true,functionName:'score'},
   source:'local function score(x,y)\n return 0\nend\n',
   relative:'roblox-games/demo/score.luau',target:'roblox'});
 assert.match(roblox.newText,/return/);
 assert.match(roblox.newText,/and/);
 assert.equal(roblox.search.casesPassed,6);
 assert.equal(roblox.runtimeVerified,false);
 assert.equal(roblox.sourceWrite,false);
 assert.equal(roblox.conceptCandidates.verified,false);
});
