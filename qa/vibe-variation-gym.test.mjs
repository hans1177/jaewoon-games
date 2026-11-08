import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {mulberry32,pickParents,chooseOps,judge,updateStats,OPERATORS,blenderAvailable,runGymSession} from '../tools/vibe-variation-gym.mjs';

const repo=process.cwd();
const imaging=spawnSync('python3',['-c','import PIL,numpy'],{encoding:'utf8'}).status===0;
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'gym-'));

test('부모 후보는 오너 승인 CC0·실제 파일·비파생·막힘 없는 것만 고른다', () => {
  const root=tmp();fs.mkdirSync(path.join(root,'a'));
  for(const f of ['ok.obj','blocked.obj','derived.obj','pay.obj'])fs.writeFileSync(path.join(root,'a',f),'o');
  const reg={assets:[
    {id:'ok',license:'CC0',family:'PROP',sourceFiles:['a/ok.obj']},
    {id:'blocked',license:'CC0',family:'PROP',sourceFiles:['a/blocked.obj'],securityBlocked:true},
    {id:'derived',license:'CC0',family:'PROP',sourceFiles:['a/derived.obj'],derivedFromAssetId:'ok'},
    {id:'pay',license:'CC-BY-4.0',family:'PROP',sourceFiles:['a/pay.obj']},
    {id:'nofile',license:'CC0',family:'PROP',sourceFiles:['a/missing.obj']},
    {id:'texture',license:'CC0',family:'PROP',sourceFiles:['a/ok.png']},
  ]};
  assert.deepEqual(pickParents(reg,root,10,mulberry32(1)).map(p=>p.id),['ok']);
});

test('시드가 같으면 부모·연산 선택이 같다(재현 가능)', () => {
  const draw=()=>{const r=mulberry32(42);return [r(),r(),r()].join()};
  assert.equal(draw(),draw());
  const stats={PROP:{outline:{n:4,gainSum:40,keep:4,improved:4,broken:0},bevel:{n:4,gainSum:0,keep:0,improved:0,broken:0}}};
  const a=chooseOps(stats,'PROP',6,mulberry32(5)),b=chooseOps(stats,'PROP',6,mulberry32(5));
  assert.deepEqual(a,b);
});

test('성적표가 쌓이면 이득이 큰 연산을 더 자주 고르고, 성적표가 없으면 전부 탐험한다', () => {
  const stats={PROP:{outline:{n:5,gainSum:50,keep:5,improved:5,broken:0},hue_shift:{n:5,gainSum:-2,keep:2,improved:0,broken:0},bevel:{n:5,gainSum:-20,keep:0,improved:0,broken:0}}};
  const rng=mulberry32(9),picks=chooseOps(stats,'PROP',400,rng,0.1);
  const count=o=>picks.filter(x=>x===o).length;
  assert.ok(count('outline')>count('bevel')*3,`${count('outline')} vs ${count('bevel')}`);
  const cold=chooseOps({},'PROP',500,mulberry32(2));
  for(const op of Object.keys(OPERATORS))assert.ok(cold.includes(op),op);
});

test('판정: 고장·너무 비슷함·개선·다양성·후퇴를 가른다', () => {
  assert.equal(judge({ok:false}).verdict,'BROKEN');
  assert.equal(judge({ok:true,empty:true}).verdict,'BROKEN');
  assert.equal(judge({ok:true,novelty:0.003,gain:9}).verdict,'TOO_SIMILAR');
  assert.deepEqual(judge({ok:true,novelty:0.1,gain:3}),{verdict:'IMPROVED',keep:true});
  assert.deepEqual(judge({ok:true,novelty:0.1,gain:-0.5}),{verdict:'VARIETY',keep:true});
  assert.deepEqual(judge({ok:true,novelty:0.1,gain:-6}),{verdict:'REGRESSED',keep:false});
});

test('성적표 갱신: 횟수·이득 합·유지·개선·고장을 센다', () => {
  const s=updateStats({}, 'PROP',[{op:'bevel',gain:2,keep:true,verdict:'IMPROVED'},{op:'bevel',gain:-4,keep:false,verdict:'REGRESSED'},{op:'outline',gain:0,keep:false,verdict:'BROKEN'}]);
  assert.deepEqual(s.PROP.bevel,{n:2,gainSum:-2,keep:1,improved:1,broken:0});
  assert.equal(s.PROP.outline.broken,1);
});

function png(dir,name,py){fs.mkdirSync(dir,{recursive:true});const f=path.join(dir,name);
  assert.equal(spawnSync('python3',['-c',`from PIL import Image,ImageDraw\nim=Image.new('RGBA',(256,256),(0,0,0,0));d=ImageDraw.Draw(im)\n${py}\nim.save(${JSON.stringify(f)})`]).status,0);return f}
const scorer=(...a)=>JSON.parse(spawnSync('python3',[path.join(repo,'tools','vibe_object_score.py'),...a],{encoding:'utf8'}).stdout.trim().split('\n').pop());

test('오브젝트 점수기: 명암·색이 있는 물체가 밋밋한 회색 덩어리보다 높고, 같은 그림의 새로움은 0이며, 빈 그림은 0점', {skip:!imaging&&'Pillow/numpy 없음'}, () => {
  const d=tmp();
  const rich=png(d,'rich.png',"d.rectangle([60,100,200,210],fill=(200,80,60,255]);d.polygon([(50,100),(130,40),(210,100)],fill=(90,50,160,255));d.rectangle([90,140,120,210],fill=(250,200,60,255));d.ellipse([150,120,190,160],fill=(40,150,200,255))".replace('255]);d.polygon','255));d.polygon'));
  const gray=png(d,'gray.png',"d.ellipse([50,50,210,210],fill=(120,120,120,255))");
  const empty=png(d,'empty.png',"pass");
  const r=scorer('--png',rich,'--png',gray,'--png',empty,'--parent',rich).results;
  assert.ok(r[0].score>r[1].score+10,`${r[0].score} vs ${r[1].score}`);
  assert.equal(r[0].novelty,0);
  assert.ok(r[1].novelty>0.05);
  assert.equal(r[2].score,0);
  assert.equal(r[2].empty,true);
});

// 실제 Blender(bpy)가 있을 때만: 진짜 CC0 부모 1개를 변형·렌더·채점해 성적 기록까지 끝에서 끝으로 돌린다.
test('실제 Blender: CC0 부모 변형 → 렌더 → 채점 → 출처·해시가 남는 성적표', {skip:(!blenderAvailable()||!imaging)&&'Blender/bpy 또는 Pillow 없음',timeout:600000}, () => {
  const out=tmp(),statsPath=path.join(out,'stats.json');
  const before=crypto.createHash('sha256').update(fs.readFileSync('company-asset-library.json')).digest('hex');
  const {ledger}=runGymSession({repoRoot:repo,parents:1,variants:3,seed:11,out:path.relative(repo,out),statsPath,only:['external-tinytreats-bench-a-v1']});
  assert.equal(ledger.length,3);
  for(const r of ledger){
    assert.equal(r.parentId,'external-tinytreats-bench-a-v1');
    assert.equal(r.license,'CC0');
    assert.equal(r.registered,false); // 자식은 오너 승인 전 자동 등록되지 않는다
    assert.equal(r.parentSha256,crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,r.parentFile))).digest('hex'));
    assert.ok(r.ok&&fs.existsSync(path.join(repo,r.glb)),r.error);
    assert.ok(['IMPROVED','VARIETY','REGRESSED','TOO_SIMILAR'].includes(r.verdict),r.verdict);
  }
  assert.ok(fs.existsSync(statsPath));
  // 연습장은 실제 레지스트리를 건드리지 않는다
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync('company-asset-library.json')).digest('hex'),before);
});
