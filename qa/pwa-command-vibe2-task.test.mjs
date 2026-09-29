// 파일명: qa/pwa-command-vibe2-task.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ingestPwaTask, buildSyncPayload } from '../tools/pwa-command-vibe2-task.mjs';

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
