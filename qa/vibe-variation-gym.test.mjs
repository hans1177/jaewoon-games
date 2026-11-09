import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {mulberry32,pickParents,chooseArms,armKey,judge,updateStats,OPERATORS,STRENGTHS,kitbashModes,blenderAvailable,runGymSession} from '../tools/vibe-variation-gym.mjs';

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

test('시드가 같으면 부모·팔(연산:세기) 선택이 같다(재현 가능)', () => {
  const stats={PROP:{'outline:soft':{n:4,gainSum:40,keep:4,improved:4,broken:0},'bevel:soft':{n:4,gainSum:0,keep:0,improved:0,broken:0}}};
  assert.deepEqual(chooseArms(stats,'PROP',6,mulberry32(5)),chooseArms(stats,'PROP',6,mulberry32(5)));
});

test('성적표가 쌓이면 이득이 큰 팔을 더 자주 고르고, 같은 연산도 세기별로 따로 배운다', () => {
  const stats={PROP:{
    'outline:soft':{n:5,gainSum:50,keep:5,improved:5,broken:0},
    'outline:strong':{n:5,gainSum:-40,keep:0,improved:0,broken:0},   // 같은 연산이라도 세게 주면 해롭다
    'bevel:soft':{n:5,gainSum:-20,keep:0,improved:0,broken:0}}};
  const picks=chooseArms(stats,'PROP',600,mulberry32(9),0.1);
  const count=(op,st)=>picks.filter(x=>x.op===op&&x.strength===st).length;
  assert.ok(count('outline','soft')>count('outline','strong')*3,`${count('outline','soft')} vs ${count('outline','strong')}`);
  const cold=chooseArms({},'PROP',800,mulberry32(2));
  for(const op of Object.keys(OPERATORS))for(const st of STRENGTHS)assert.ok(cold.some(x=>x.op===op&&x.strength===st),armKey(op,st));
});

test('세기 구간이 실제로 다르다: strong 파라미터는 soft보다 크다', () => {
  const rng=mulberry32(3);
  const soft=Array.from({length:50},()=>OPERATORS.saturate_contrast.sample(rng,'soft').contrast);
  const strong=Array.from({length:50},()=>OPERATORS.saturate_contrast.sample(rng,'strong').contrast);
  assert.ok(Math.max(...soft)<Math.min(...strong));
  const b=OPERATORS.bevel;assert.ok(b.sample(rng,'soft').width<b.sample(rng,'strong').width);
});

test('부품 조립 규칙표: 어울리는 조합만 허용하고 엉뚱한 조합은 시도하지 않는다', () => {
  assert.deepEqual(kitbashModes('house.obj','lampRoundFloor.glb'),['top']);
  assert.deepEqual(kitbashModes('house.obj','bench_A.obj'),['side']);
  assert.deepEqual(kitbashModes('tree.obj','table.glb'),[]);       // 나무 위 탁자
  assert.deepEqual(kitbashModes('heart.obj','rugDoormat.glb'),[]); // 하트 위 러그
  assert.ok(kitbashModes('tree.obj','mushroom.glb').includes('top'));
});

test('판정: 고장·너무 비슷함·개선·다양성·후퇴를 가른다', () => {
  assert.equal(judge({ok:false}).verdict,'BROKEN');
  assert.equal(judge({ok:true,empty:true}).verdict,'BROKEN');
  assert.equal(judge({ok:true,novelty:0.003,gain:9}).verdict,'TOO_SIMILAR');
  assert.deepEqual(judge({ok:true,novelty:0.1,gain:3}),{verdict:'IMPROVED',keep:true});
  assert.deepEqual(judge({ok:true,novelty:0.1,gain:-0.5}),{verdict:'VARIETY',keep:true});
  assert.deepEqual(judge({ok:true,novelty:0.1,gain:-6}),{verdict:'REGRESSED',keep:false});
});

test('판정: 점수가 올라도 안쪽이 어두워지거나 세부가 뭉개지거나 부품이 떠 있으면 후퇴', () => {
  const base={ok:true,novelty:0.2,gain:8};
  assert.deepEqual(judge({...base,darkening:0.3,detailDrop:0}),{verdict:'REGRESSED',keep:false,reason:'DARKENED'});
  assert.equal(judge({...base,darkening:0,detailDrop:0.6}).reason,'DETAIL_LOST');
  assert.equal(judge({...base,darkening:0,detailDrop:0,attach:{touched:false,gap:0.2}}).reason,'FLOATING_PART');
  assert.equal(judge({...base,darkening:0.05,detailDrop:0.1,attach:{touched:true,gap:0}}).verdict,'IMPROVED');
});

test('성적표 갱신: 횟수·이득 합·유지·개선·고장을 센다', () => {
  const s=updateStats({}, 'PROP',[{arm:'bevel:soft',op:'bevel',gain:2,keep:true,verdict:'IMPROVED'},{arm:'bevel:soft',op:'bevel',gain:-4,keep:false,verdict:'REGRESSED'},{arm:'outline:strong',op:'outline',gain:0,keep:false,verdict:'BROKEN'}]);
  assert.deepEqual(s.PROP['bevel:soft'],{n:2,gainSum:-2,keep:1,improved:1,broken:0,fail:{REGRESSED:1}});
  assert.equal(s.PROP['outline:strong'].broken,1);
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
  assert.ok(ledger.length>=1&&ledger.length<=3);
  for(const r of ledger){
    assert.match(r.arm,/^[a-z_]+:(soft|strong)$/);
    assert.ok(Number.isFinite(r.darkening)&&Number.isFinite(r.detailDrop));
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

test('확장 연산(이끼·흙때·울퉁불퉁·패널 홈)이 있고 세기에 따라 값이 다르다', async () => {
  const {OPERATORS:ops}=await import('../tools/vibe-variation-gym.mjs');
  for(const k of ['moss','wear','noise_displace','inset_panel'])assert.ok(ops[k],k);
  const rng=mulberry32(3);
  assert.ok(ops.noise_displace.sample(rng,'strong').strength>ops.noise_displace.sample(rng,'soft').strength);
  assert.ok(ops.moss.sample(rng,'strong').coverage>ops.moss.sample(rng,'soft').coverage);
});

test('실패 도감: 여러 번 해 보고 거의 다 실패한 팔은 탐험에서도 다시 뽑지 않는다', () => {
  const stats={PROP:{'moss:strong':{n:8,gainSum:-30,keep:0,improved:0,broken:0}}};
  const picks=chooseArms(stats,'PROP',800,mulberry32(2),1);
  assert.equal(picks.filter(x=>x.op==='moss'&&x.strength==='strong').length,0);
  // 전부 실패한 극단에서도 뽑을 팔이 남는다(전체로 되돌림)
  const every={PROP:Object.fromEntries(Object.keys(OPERATORS).flatMap(op=>STRENGTHS.map(st=>[armKey(op,st),{n:9,gainSum:-9,keep:0,improved:0,broken:0}])))};
  assert.equal(chooseArms(every,'PROP',5,mulberry32(2),1).length,5);
});

test('실패 이유가 성적표에 쌓인다(어디서 자주 망하는지)', () => {
  const st=updateStats({},'PROP',[{arm:'moss:soft',gain:-3,keep:false,verdict:'REGRESSED',reason:'DARKENED'},{arm:'moss:soft',gain:-2,keep:false,verdict:'REGRESSED',reason:'DARKENED'},{arm:'moss:soft',gain:2,keep:true,verdict:'IMPROVED'}]);
  assert.equal(st.PROP['moss:soft'].fail.DARKENED,2);
  assert.equal(st.PROP['moss:soft'].keep,1);
});

test('리그 점검 게이트: 캐릭터 계열은 검사 실패 시 유지하지 않고, 소품은 검사하지 않는다', async () => {
  const {rigGate}=await import('../tools/vibe-variation-gym.mjs');
  let calls=0;
  const bad=f=>{calls++;return {pass:false,failures:['UNWEIGHTED_VERTICES:body:12']}};
  const good=()=>({pass:true,failures:[]});
  const prop=rigGate({family:'PROP',keep:true,verdict:'IMPROVED',glb:'x.glb'},bad);
  assert.equal(prop.keep,true);assert.equal(calls,0);
  const hero=rigGate({family:'CHARACTER',keep:true,verdict:'IMPROVED',glb:'x.glb'},bad);
  assert.equal(hero.keep,false);assert.match(hero.reason,/^RIG:UNWEIGHTED/);
  assert.equal(rigGate({family:'CHARACTER',keep:true,verdict:'IMPROVED',glb:'x.glb'},good).keep,true);
  const err=rigGate({family:'CREATURE',keep:true,verdict:'IMPROVED',glb:'x.glb'},()=>{throw new Error('boom')});
  assert.equal(err.verdict,'BROKEN');
});
