// 파일명: qa/pwa-command-vibe2-task.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ingestPwaTask, buildSyncPayload, validateLocalWebOwnerEvent, buildGithubDevelopmentFocus } from '../tools/pwa-command-vibe2-task.mjs';
import { buildVibeContinuousWorkOrder } from '../tools/vibe2-continuous-runner.mjs';

const UUID='11111111-2222-4333-8444-555555555555';
function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'pwa-vibe-'));
  fs.mkdirSync(path.join(root,'web-games','insect-survival'),{recursive:true});
  fs.writeFileSync(path.join(root,'web-games','insect-survival','index.html'),'<html>web game</html>');
  fs.mkdirSync(path.join(root,'company-learning'),{recursive:true});
  fs.writeFileSync(path.join(root,'company-learning','platform-release-roadmap.json'),JSON.stringify({
    status:'OWNER_DIRECT_LOCKED',developmentAccess:{WEB:'ALWAYS_ALLOWED'},
    ownerActiveDevelopmentScope20261009:{status:'ACTIVE',activeTargets:['WEB']},
    localVibeWebChat:{enabled:true,platform:'WEB'},
    finalDevelopmentLock:{sequenceLock:{status:'LOCKED'}}
  }));
  fs.mkdirSync(path.join(root,'unity-games','daechung-rpg'),{recursive:true});
  const catalog={games:[
    {id:'insect-survival',name:'곤충 생존기',webPath:'/web-games/insect-survival/',homepageCategory:'development-confirmed'},
    {id:'daechung-rpg',name:'대충 RPG',webPath:'/web-games/daechung-rpg/',unityProjectPath:'unity-games/daechung-rpg',homepageCategory:'release-confirmed'}
  ]};
  const status={projects:[{gameId:'daechung-rpg',projectPath:'unity-games/daechung-rpg',target:'unity-android'}]};
  return {root,catalog,status};
}

test('PWA owner 지시는 Web Vibe2 최우선 작업으로 변환된다',()=>{
  const f=fixture();
  const result=ingestPwaTask({task:{id:UUID,game_id:'insect-survival',body:'거미 공격 모션 확인하고 수정해',kind:'directive',priority:'urgent'},queue:{version:3,tasks:[]},catalog:f.catalog,status:f.status,repoRoot:f.root});
  const task=result.tasks[0];
  assert.equal(task.target,'web');
  assert.equal(task.sourceRoot,'web-games/insect-survival');
  assert.ok(task.evidence.includes('web-organization-boundary:v1'));
  assert.equal(task.priority,'owner-immediate');
  assert.equal(task.ownerDirective,true);
  assert.equal(task.requiresOwnerDecision,false);
  assert.match(task.goal,/거미 공격 모션/);
  assert.ok(task.evidence.includes('owner-auto-deploy-authorization'));
});

test('유니티 소스는 개발 금지하며 웹 소스만 기존 GitHub 게임 지시에 사용한다',()=>{
  const f=fixture();
  assert.throws(()=>ingestPwaTask({task:{id:UUID,game_id:'daechung-rpg',body:'이동 모션 수정',kind:'feedback'},queue:{tasks:[]},catalog:f.catalog,status:f.status,repoRoot:f.root}),/웹게임 소스가 없어 작업을 접수할 수 없음/);
  fs.mkdirSync(path.join(f.root,'web-games','daechung-rpg'),{recursive:true});
  fs.writeFileSync(path.join(f.root,'web-games','daechung-rpg','index.html'),'<html>web game</html>');
  const result=ingestPwaTask({task:{id:UUID,game_id:'daechung-rpg',body:'웹 이동 모션 수정',kind:'feedback'},queue:{tasks:[]},catalog:f.catalog,status:f.status,repoRoot:f.root});
  assert.equal(result.tasks[0].target,'web');
  assert.equal(result.tasks[0].releaseState,'release-confirmed');
  assert.ok(result.tasks[0].evidence.includes('source-root:web-games/daechung-rpg'));
});

test('Vibe2 작업 상태를 PWA 채팅 상태로 변환한다',()=>{
  const queue={tasks:[
    {id:`pwa-${UUID}`,target:'web',status:'running',blocker:'candidate-awaiting-qa-and-deployment'},
    {id:'pwa-aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',target:'web',status:'done'},
    {id:'other',status:'failed'}
  ]};
  const payload=buildSyncPayload(queue);
  assert.deepEqual(payload.updates.map(x=>x.status),['testing','done']);
});


test('GitHub authenticated owner event accepts only exact existing-web directive', () => {
  const event = {
    action:'vibe-local-web-owner-directive',
    client_payload: {
      id:UUID,game_id:'insect-survival',platform:'web',
      kind:'directive',body:'모바일 조작 수정 후 QA 자동 배포',autoDeployAfterVerifiedQa:true
    }
  };
  const auth={actor:'hans1177',repository:'hans1177/jaewoon-games'};
  const task=validateLocalWebOwnerEvent(event,auth);
  assert.equal(task.platform,'web');
  assert.equal(task.source,'LOCAL_VIBE_WEB_CHAT');
  const f=fixture();
  const accepted=ingestPwaTask({task,queue:{version:3,tasks:[]},catalog:f.catalog,status:f.status,repoRoot:f.root});
  assert.equal(accepted.tasks[0].target,'web');
  assert.ok(accepted.tasks[0].evidence.includes('owner-auto-deploy-authorization'));
  assert.ok(accepted.tasks[0].evidence.includes('verified-qa-required'));
  assert.ok(accepted.tasks[0].evidence.includes('vibe-local-web-owner-directive'));
  assert.deepEqual(buildSyncPayload(accepted).updates,[],'local web tasks must not pollute PWA device chat state');
  assert.throws(()=>validateLocalWebOwnerEvent(event,{actor:'outsider',repository:auth.repository}),/LOCAL_OWNER_EVENT_NOT_AUTHORIZED/);
  assert.throws(()=>validateLocalWebOwnerEvent(event,{actor:auth.actor,repository:'hans1177/other'}),/LOCAL_OWNER_EVENT_NOT_AUTHORIZED/);
  for(const bad of [{platform:'roblox'},{autoDeployAfterVerifiedQa:false},{body:''},{game_id:'../escape'}]){
    assert.throws(()=>validateLocalWebOwnerEvent({...event,client_payload:{...event.client_payload,...bad}},auth),/LOCAL_OWNER_EVENT_INVALID/);
  }
});

test('explicit web directive is restricted to WEB even when Unity project exists',()=>{
  const f=fixture();
  fs.mkdirSync(path.join(f.root,'web-games','daechung-rpg'),{recursive:true});
  fs.writeFileSync(path.join(f.root,'web-games','daechung-rpg','index.html'),'<html>web game</html>');
  const result=ingestPwaTask({
    task:{id:UUID,game_id:'daechung-rpg',body:'웹 HUD 개선',platform:'web'},
    queue:{tasks:[]},catalog:f.catalog,status:f.status,repoRoot:f.root
  });
  assert.equal(result.tasks[0].target,'web');
  assert.ok(result.tasks[0].evidence.includes('source-root:web-games/daechung-rpg'));
});

test('owner comment rejects forged identities, edits, malformed commands and platform expansion',()=>{
  const payload={id:UUID,game_id:'insect-survival',platform:'web',kind:'directive',body:'기존 저장 보존',autoDeployAfterVerifiedQa:true};
  const event={action:'created',repository:{full_name:'hans1177/jaewoon-games'},sender:{login:'hans1177'},issue:{number:8664},
    comment:{id:123,author_association:'OWNER',user:{login:'hans1177',type:'User'},body:'/vibe-local-web '+JSON.stringify(payload)}};
  const context={actor:'hans1177',repository:'hans1177/jaewoon-games'};
  assert.equal(validateLocalWebOwnerEvent(event,context).body,payload.body);
  for(const edit of [
    e=>e.comment.user.login='attacker',e=>e.sender.login='attacker',e=>e.comment.user.type='Bot',
    e=>e.comment.author_association='COLLABORATOR',e=>e.repository.full_name='other/repo',
    e=>e.action='edited',e=>e.comment.body='/vibe-local-web {',
    e=>e.comment.body='/vibe-local-web '+JSON.stringify({...payload,platform:'unity'}),
    e=>e.comment.body='/vibe-local-web '+JSON.stringify({...payload,body:'x'.repeat(2001)}),
    e=>e.comment.body='/vibe-local-web '+JSON.stringify({...payload,body:'x\u0000y'})
  ]){const invalid=structuredClone(event);edit(invalid);assert.throws(()=>validateLocalWebOwnerEvent(invalid,context));}
  assert.throws(()=>validateLocalWebOwnerEvent(event,{...context,actor:'attacker'}));
  assert.throws(()=>validateLocalWebOwnerEvent(event,{...context,repository:'other/repo'}));
});


test('direct owner game work preserves parallel pool and upgrades legacy one-slot PWA queues',()=>{
  const f=fixture();
  const task={id:UUID,game_id:'insect-survival',body:'몬스터 행동을 개선해',kind:'directive',priority:'urgent'};
  const prior={id:'existing-worker',gameId:'insect-survival',target:'web',status:'running'};
  const queue={version:5,mode:'hierarchical-dag-sharded-work-stealing-queue',maxConcurrentTasks:128,tasks:[prior]};
  const result=ingestPwaTask({task,queue,catalog:f.catalog,status:f.status,repoRoot:f.root});
  assert.equal(result.maxConcurrentTasks,128,'do not replace existing parallel capacity with one slot');
  assert.equal(result.mode,queue.mode);
  assert.equal(result.ownerDirectivePreemptsAutonomy,true);
  assert.equal(result.tasks.length,2);
  assert.deepEqual(result.tasks[0],prior,'do not discard an existing reservation');
  assert.equal(result.tasks[1].priority,'owner-immediate');
  const old=ingestPwaTask({task,queue:{...queue,mode:'single-worker-priority-serial-queue',maxConcurrentTasks:1},
    catalog:f.catalog,status:f.status,repoRoot:f.root});
  assert.equal(old.maxConcurrentTasks,256,'recover legacy PWA serialization without capping the existing worker pool');
  assert.equal(old.mode,'hierarchical-dag-sharded-work-stealing-queue');
  assert.deepEqual(old.tasks[0],prior);
});

test('owner ingress uses direct Vibe2 execution and published WEB QA runs only after deployment',()=>{
  const bridge=fs.readFileSync('.github/workflows/pwa-command-bridge.yml','utf8');
  const cloud=bridge.slice(bridge.indexOf('  bridge:'));
  assert.doesNotMatch(cloud,/needs: local-advisory|needs\.local-advisory/);
  assert.match(cloud,/github\.event\.comment\.author_association == 'OWNER'/);
  assert.match(cloud,/validateLocalWebOwnerEvent/);
  assert.match(cloud,/gh workflow run vibe2-continuous-core\.yml --repo "\$GITHUB_REPOSITORY" --ref main -f execution_lane=game-primary/);
  assert.doesNotMatch(cloud,/gh workflow run vibe2-24h-runner\.yml/);
  const pages=fs.readFileSync('.github/workflows/magic-forest-pages.yml','utf8');
  const published=pages.indexOf('uses: actions/deploy-pages@v4');
  const live=pages.indexOf('id: director_live_qa');
  const browser=pages.indexOf('id: forest_native_3d_live_qa');
  const issues=pages.indexOf('name: Director register issues after live game testing');
  assert.ok(published>0&&live>published&&browser>live&&issues>browser,
    'production publication precedes live HTTP, browser, and defect reporting');
  assert.match(pages.slice(browser,issues),/VIBE_SMOKE_LIVE_BASE:/);
  assert.match(pages.slice(live,issues),/steps\.deployment\.outputs\.page_url/);
});

test('GitHub owner ideas use the existing Vibe queue for one-game source-first work',()=>{
 const focus=buildGithubDevelopmentFocus({gameId:'insect-survival',sourceRoot:'web-games/insect-survival'});
 assert.match(focus,/GITHUB_DEVELOPMENT_FIRST/);
 assert.match(focus,/실제 게임 코드 수정/);
 assert.match(focus,/해당 게임 집중 QA/);
 assert.match(focus,/불필요|무관한 홈페이지/);
 assert.match(focus,/F0-F9/);
 for(const bad of [
  {gameId:'insect-survival',sourceRoot:'web-games/cozy-island'},
  {gameId:'../escape',sourceRoot:'web-games/../escape'},
  {gameId:'insect-survival',sourceRoot:'../../secrets'},
  {gameId:'insect-survival',sourceRoot:'tools/vibe2-engine'},
  {gameId:'insect-survival',sourceRoot:'unity-games/insect-survival'}
 ])assert.throws(()=>buildGithubDevelopmentFocus(bad),/GITHUB_DEVELOPMENT_FOCUS_SOURCE_MISMATCH/);
 const f=fixture();
 const result=ingestPwaTask({task:{id:UUID,game_id:'insect-survival',body:'곤충 3D 땅속 침하 수정',
  platform:'web',kind:'directive'},queue:{tasks:[]},catalog:f.catalog,status:f.status,repoRoot:f.root});
 const row=result.tasks[0];
 assert.equal(row.type,'implementation');
 assert.equal(row.department,'development');
 assert.equal(row.priority,'owner-immediate');
 assert.equal(row.ownerDirective,true);
 assert.deepEqual(row.responsibleFiles,[]);
 assert.deepEqual(row.dependencies,[]);
 assert.match(row.goal,/GITHUB_DEVELOPMENT_FIRST/);
 assert.match(row.goal,/곤충 3D 땅속 침하 수정/);
 assert.match(row.goal,/web-games\/insect-survival/);
 assert.match(row.goal,/독립 QA/);
 assert.ok(row.evidence.includes('verified-qa-required'));
 assert.ok(result.maxConcurrentTasks>1,'must reuse existing parallel owner queue');
});

test('웹 조직은 잘못된 원본 경로·빈 게임·정책 오류를 거부한다',()=>{
  const f=fixture(),task={id:UUID,game_id:'insect-survival',body:'조작 수정',platform:'web'};
  const ingest=catalog=>ingestPwaTask({task,queue:{tasks:[]},catalog,status:f.status,repoRoot:f.root});
  const original=f.catalog.games[0];
  assert.throws(()=>ingest({games:[{...original,webPath:'/roblox-games/insect-survival/'}]}),/WEB_ORG_WEB_SOURCE_MISMATCH/);
  assert.throws(()=>ingest({games:[{...original,webPath:'/web-games/daechung-rpg/'}]}),/WEB_ORG_WEB_SOURCE_MISMATCH/);
  assert.throws(()=>ingestPwaTask({task:{...task,platform:'unity'},queue:{tasks:[]},catalog:f.catalog,status:f.status,repoRoot:f.root}),/명시적 플랫폼 요청은 웹만 지원/);
  fs.unlinkSync(path.join(f.root,'web-games','insect-survival','index.html'));
  assert.throws(()=>ingest(f.catalog),/웹게임 소스가 없어/);
  fs.writeFileSync(path.join(f.root,'web-games','insect-survival','index.html'),'<html>web game</html>');
  const policyPath=path.join(f.root,'company-learning','platform-release-roadmap.json');
  const policy=JSON.parse(fs.readFileSync(policyPath,'utf8'));
  policy.ownerActiveDevelopmentScope20261009.activeTargets=['ROBLOX'];
  fs.writeFileSync(policyPath,JSON.stringify(policy));
  assert.throws(()=>ingest(f.catalog),/WEB_ORG_CENTRAL_BOUNDARY_NOT_VERIFIED/);
});

test('PWA 웹 개발은 실제 바이브 작업 주문에서도 로블록스·유니티·타 조직 파일로 전환할 수 없다',()=>{
  const id='pwa-'+UUID;
  const source={id,gameId:'insect-survival',status:'running',
    target:'web',sourceRoot:'web-games/insect-survival',
    department:'development',type:'implementation',goal:'웹 HUD 조정',responsibleFiles:[],
    evidence:['web-organization-boundary:v1']};
  const order=overrides=>buildVibeContinuousWorkOrder({
    runtime:{continuous:{enabled:true}},
    queue:{version:3,maxConcurrentTasks:4,tasks:[{...source,...overrides}]},
    taskId:id,centralPolicySnapshot:{required:false,valid:true}
  });
  for(const native of ['roblox','unity','unreal']){
    const result=order({target:native});
    assert.equal(result.run,false);
    assert.equal(result.reason,'WEB_OWNER_NATIVE_DEVELOPMENT_FORBIDDEN');
  }
  for(const file of ['roblox-games/insect-survival/init.luau',
     'unity-games/insect-survival/Assets/Game.cs','assets/roblox/actor.glb']){
    const result=order({responsibleFiles:[file]});
    assert.equal(result.run,false);
    assert.equal(result.reason,'WEB_OWNER_NATIVE_DEVELOPMENT_FORBIDDEN');
  }
  assert.equal(order({sourceRoot:'roblox-games/insect-survival'}).reason,
    'WEB_OWNER_NATIVE_DEVELOPMENT_FORBIDDEN');
  assert.equal(order({gameId:'cozy-island'}).reason,
    'WEB_OWNER_NATIVE_DEVELOPMENT_FORBIDDEN');
});

test('웹 PWA 상태는 로블록스와 유니티 작업 및 대상이 없는 기록을 노출하지 않는다',()=>{
  const queue={tasks:[
    {id:'pwa-aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',target:'roblox',status:'failed',blocker:'native-private'},
    {id:'pwa-bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',target:'unity',status:'done'},
    {id:'pwa-cccccccc-dddd-4eee-8fff-aaaaaaaaaaaa',status:'done'},
    {id:`pwa-${UUID}`,target:'web',status:'running',blocker:'web-only'},
    {id:'pwa-dddddddd-eeee-4fff-8aaa-bbbbbbbbbbbb',target:'web',status:'done',evidence:['vibe-local-web-owner-directive']}
  ]};
  assert.deepEqual(buildSyncPayload(queue),{action:'sync',updates:[
    {taskId:UUID,status:'working',blocker:'web-only'}
  ]});
});

test('동일 UUID에 타 조직 작업이 있다면 웹 작업 성공으로 처리하지 않는다',()=>{
  const f=fixture(),task={id:UUID,game_id:'insect-survival',body:'웹 조작 개선',platform:'web'};
  const queue={version:3,tasks:[{id:`pwa-${UUID}`,gameId:'insect-survival',target:'roblox',sourceRoot:'roblox-games/insect-survival',status:'queued'}]};
  assert.throws(()=>ingestPwaTask({task,queue,catalog:f.catalog,status:f.status,repoRoot:f.root}),/WEB_ORG_QUEUE_IDENTITY_COLLISION/);
  const mismatched={...queue,tasks:[{...queue.tasks[0],target:'web',sourceRoot:'web-games/cozy-island'}]};
  assert.throws(()=>ingestPwaTask({task,queue:mismatched,catalog:f.catalog,status:f.status,repoRoot:f.root}),/WEB_ORG_QUEUE_IDENTITY_COLLISION/);
});

test('웹 작업 접수는 기존 로블록스/유니티 전역 큐 설정을 변경하지 않는다',()=>{
  const f=fixture(),task={id:UUID,game_id:'insect-survival',body:'웹 전용 인벤토리 개선',platform:'web'};
  for(const platform of ['roblox','unity','unreal']){
    const native={id:'native-'+platform,gameId:'fort',target:platform,status:'running',
      sourceRoot:platform+'-games/fort',responsibleFiles:[platform+'-games/fort/start.js']};
    const queue={version:5,mode:'single-worker-priority-serial-queue',
      maxConcurrentTasks:1,ownerDirectivePreemptsAutonomy:false,
      schedulerMetadata:{nativeSlots:9,original:true},tasks:[native]};
    const oldBytes=JSON.stringify(queue);
    const result=ingestPwaTask({task,queue,catalog:f.catalog,status:f.status,repoRoot:f.root});
    assert.equal(JSON.stringify(queue),oldBytes,'원래 큐는 수정하지 않는다');
    assert.equal(result.maxConcurrentTasks,1,'타 조직 실행 수를 변경하지 않는다');
    assert.equal(result.mode,queue.mode,'타 조직 스케줄링 모드를 변경하지 않는다');
    assert.equal(result.ownerDirectivePreemptsAutonomy,false,'타 조직 owner 정책을 변경하지 않는다');
    assert.deepEqual(result.schedulerMetadata,queue.schedulerMetadata);
    assert.deepEqual(result.tasks[0],native);
    assert.equal(result.tasks[1].target,'web');
    assert.equal(result.tasks[1].sourceRoot,'web-games/insect-survival');
  }
  const unknownQueue={version:5,mode:'single-worker-priority-serial-queue',
    maxConcurrentTasks:1,tasks:[{id:'legacy-target-missing',status:'queued'}]};
  const unknown=ingestPwaTask({task,queue:unknownQueue,catalog:f.catalog,status:f.status,repoRoot:f.root});
  assert.equal(unknown.maxConcurrentTasks,1,'정체가 확인되지 않은 레거시 작업도 보존한다');
  const webQueue={version:5,mode:'single-worker-priority-serial-queue',
    maxConcurrentTasks:1,tasks:[{id:'legacy-web',gameId:'insect-survival',target:'web',status:'queued'}]};
  const web=ingestPwaTask({task,queue:webQueue,catalog:f.catalog,status:f.status,repoRoot:f.root});
  assert.equal(web.maxConcurrentTasks,256,'웹 작업만 있는 레거시 큐는 기존 복구를 유지한다');
});
