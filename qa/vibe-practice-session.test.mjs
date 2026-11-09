import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {blenderAvailable} from '../tools/vibe-variation-gym.mjs';
import {runPracticeSession,pickPracticeParents} from '../tools/vibe-practice-session.mjs';
import {loop} from '../tools/vibe-practice-loop.mjs';

const imaging=spawnSync('python3',['-c','import PIL,numpy'],{encoding:'utf8'}).status===0;
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'ps-'));

test('연습 부모 선택은 시드가 같으면 같고 승인된 CC0만 고른다', () => {
  const a=pickPracticeParents(process.cwd(),5),b=pickPracticeParents(process.cwd(),5);
  assert.deepEqual(a,b);
  const reg=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
  for(const p of a){const row=reg.assets.find(x=>x.id===p.id);assert.ok(row);assert.match(String(row.license),/^CC0/);assert.ok(!row.securityBlocked&&!row.quarantined);assert.ok(fs.existsSync(p.file))}
});

test('루프: 실패한 회차가 있어도 계속 돌고, 최대 회차에서 멈추며, STOP 파일이면 멈춘다', async () => {
  const root=tmp();fs.mkdirSync(path.join(root,'build'));
  let calls=0;
  const fake=()=>{calls++;if(calls===2)throw new Error('boom');return {session:{gym:{tally:{IMPROVED:1}},light:{best:60},bake:{pass:true}}}};
  const logs=[];
  const r=await loop({interval:0,max:4,doPublish:false,repoRoot:root,session:fake,log:m=>logs.push(m)});
  assert.equal(r.rounds,4);assert.equal(r.fails,1);
  assert.ok(logs.some(l=>/실패\(계속함\)/.test(l)));
  // STOP 파일이 미리 있으면 시작할 때 지우므로, 도는 도중 만들어지게 한다
  let n=0;
  const stopper=()=>{n++;if(n===2)fs.writeFileSync(path.join(root,'build','STOP'),'');return {session:{gym:{tally:{}},light:null,bake:null}}};
  const r2=await loop({interval:0,max:0,doPublish:false,repoRoot:root,session:stopper,log:()=>{}});
  assert.equal(r2.rounds,2);
});

test('실제 Blender: 한 회차가 변형·조명 탐색·굽기를 모두 하고 session.json 을 남긴다', {skip:(!blenderAvailable()||!imaging)&&'Blender 또는 Pillow/numpy 없음'}, () => {
  const root=process.cwd(),out=path.join(tmp(),'out');
  const stats=path.join(tmp(),'stats.json'),lights=path.join(tmp(),'lights.json');
  const {session}=runPracticeSession({repoRoot:root,seed:3,parents:1,variants:3,out,statsPath:stats,lightsPath:lights,lightCandidates:3,lightRounds:1});
  assert.ok(session.gym.children>=1);
  assert.ok(session.light&&Number.isFinite(session.light.best),JSON.stringify(session.light));
  assert.ok(session.bake&&typeof session.bake.pass==='boolean',JSON.stringify(session.bake));
  assert.ok(fs.existsSync(path.join(out,'session.json')));
  const learned=JSON.parse(fs.readFileSync(lights,'utf8'));
  assert.ok(Object.values(learned)[0].top.length>=1);
});
