// 파일명: qa/pwa-command-vibe2-task.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ingestPwaTask, buildSyncPayload, validateLocalWebOwnerEvent } from '../tools/pwa-command-vibe2-task.mjs';

const UUID='11111111-2222-4333-8444-555555555555';
function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'pwa-vibe-'));
  fs.mkdirSync(path.join(root,'web-games','insect-survival'),{recursive:true});
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
  assert.equal(task.priority,'owner-immediate');
  assert.equal(task.ownerDirective,true);
  assert.equal(task.requiresOwnerDecision,false);
  assert.match(task.goal,/거미 공격 모션/);
  assert.ok(task.evidence.includes('owner-auto-deploy-authorization'));
});

test('실제 Unity 프로젝트가 있으면 Unity 소스를 우선한다',()=>{
  const f=fixture();
  const result=ingestPwaTask({task:{id:UUID,game_id:'daechung-rpg',body:'이동 모션 수정',kind:'feedback'},queue:{tasks:[]},catalog:f.catalog,status:f.status,repoRoot:f.root});
  assert.equal(result.tasks[0].target,'unity');
  assert.equal(result.tasks[0].releaseState,'release-confirmed');
});

test('Vibe2 작업 상태를 PWA 채팅 상태로 변환한다',()=>{
  const queue={tasks:[
    {id:`pwa-${UUID}`,status:'running',blocker:'candidate-awaiting-qa-and-deployment'},
    {id:'pwa-aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',status:'done'},
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
