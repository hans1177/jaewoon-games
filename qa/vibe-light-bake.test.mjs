import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {mulberry32,blenderAvailable} from '../tools/vibe-variation-gym.mjs';
import {kelvinToRgb,sample,perturb,SPACE,toRoblox,toJob,mergeLearned,runLightSearch} from '../tools/vibe-light-search.mjs';
import {evaluateBake,runBake,inspectBakeSource,selectBakeParents} from '../tools/vibe-normal-bake.mjs';

const imaging=spawnSync('python3',['-c','import PIL,numpy'],{encoding:'utf8'}).status===0;
const table=JSON.parse(fs.readFileSync('assets/roblox/common-look-v1/look-presets.json','utf8'));

test('색온도: 낮을수록 붉고 높을수록 푸르다', () => {
  const warm=kelvinToRgb(3000),cool=kelvinToRgb(9000);
  assert.ok(warm[0]>warm[2]);assert.ok(cool[2]>=cool[0]);
  for(const c of [...warm,...cool])assert.ok(c>=0&&c<=1);
});

test('탐색 공간: 표본과 흔들기는 항상 범위 안이고 시드가 같으면 같다', () => {
  const a=sample(mulberry32(4)),b=sample(mulberry32(4));
  assert.deepEqual(a,b);
  let p=a;const rng=mulberry32(9);
  for(let i=0;i<200;i++){p=perturb(p,rng,0.3);for(const [k,[lo,hi]] of Object.entries(SPACE))assert.ok(p[k]>=lo&&p[k]<=hi,`${k}=${p[k]}`)}
});

test('Roblox 번역: 룩 키트가 허용하는 범위 안의 속성만 낸다', () => {
  const rng=mulberry32(11),r=table.ranges.lighting;
  for(let i=0;i<100;i++){
    const rb=toRoblox(sample(rng));
    for(const k of ['ClockTime','Brightness','ShadowSoftness'])assert.ok(rb[k]>=r[k][0]&&rb[k]<=r[k][1],`${k}=${rb[k]}`);
    for(const k of ['ColorShift_Top','Ambient','OutdoorAmbient'])assert.ok(rb[k].length===3&&rb[k].every(n=>Number.isInteger(n)&&n>=0&&n<=255),k);
  }
  const morning=toRoblox({...sample(mulberry32(1)),elevation:10,azimuth:90}),noon=toRoblox({...sample(mulberry32(1)),elevation:80,azimuth:90});
  assert.ok(Math.abs(noon.ClockTime-12)<Math.abs(morning.ClockTime-12));
});

test('배운 조합 표: 모델 종류마다 상위 5개만, 중복 없이, 점수순', () => {
  let learned={};
  const mk=(score,e)=>({best:[{score,params:{elevation:e},roblox:{}}],mean:50});
  for(let i=0;i<9;i++)mergeLearned(learned,'PROP',mk(50+i,10+i));
  mergeLearned(learned,'PROP',mk(58,18)); // 같은 조합 중복
  assert.equal(learned.PROP.top.length,5);
  assert.deepEqual(learned.PROP.top.map(t=>t.score),[58,57,56,55,54]);
  assert.equal(learned.PROP.runs,10);
});

test('노멀 굽기 판정: 가벼워지고 요철이 실제로 구워져야 합격', () => {
  assert.equal(evaluateBake({ok:true,trianglesHigh:1000,trianglesLow:250,normalDeviation:0.05}).pass,true);
  assert.match(evaluateBake({ok:true,trianglesHigh:1000,trianglesLow:900,normalDeviation:0.05}).failures[0],/NOT_LIGHTER/);
  assert.match(evaluateBake({ok:true,trianglesHigh:1000,trianglesLow:200,normalDeviation:0}).failures[0],/NOTHING_BAKED/);
  assert.match(evaluateBake({ok:true,trianglesHigh:90000,trianglesLow:20000,normalDeviation:0.05}).failures.join(),/TOO_HEAVY/);
  assert.equal(evaluateBake({ok:false}).pass,false);
});

test('노멀맵 연습은 실제 정적 원본의 면 수를 확인하고 부족한 원본을 제외한다',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'bake-static-'));
  const low=path.join(root,'low.obj'),high=path.join(root,'high.obj'),medium=path.join(root,'medium.obj');
  fs.writeFileSync(low,'o low\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n');
  fs.writeFileSync(high,'o high\nv 0 0 0\nv 1 0 0\nv 0 1 0\n'+
    Array.from({length:1800},()=> 'f 1 2 3\n').join(''));
  fs.writeFileSync(medium,'o medium\nv 0 0 0\nv 1 0 0\nv 0 1 0\n'+
    Array.from({length:1600},()=> 'f 1 2 3\n').join(''));
  const simple=inspectBakeSource(low),detailed=inspectBakeSource(high);
  assert.equal(simple.eligible,false);assert.equal(simple.reason,'SOURCE_HAS_INSUFFICIENT_GEOMETRY');
  assert.equal(detailed.eligible,true);assert.equal(detailed.triangles,1800);
  assert.equal(detailed.nativeRuntimeVerified,false);
  assert.deepEqual(selectBakeParents([{id:'low',file:low},{id:'high',file:high}],3).map(x=>x.id),['high']);
  assert.equal(selectBakeParents([{id:'high',file:high},{id:'medium',file:medium}],1,
    {high:{attempts:3,failures:3},medium:{attempts:0,failures:0}})[0].id,'medium');
  // 동일 원본에서 반복 실패한 경우만 휴지한다. 원본 내용이 바뀌면 검증을 다시 한다.
  const hash=selectBakeParents([{id:'high',file:high}],1)[0].sourceSha256;
  assert.match(hash,/^[a-f0-9]{64}$/);
  const history={high:{attempts:2,failures:2,sourceSha256:hash},
    medium:{attempts:2,failures:2}};
  assert.deepEqual(selectBakeParents([{id:'high',file:high},{id:'medium',file:medium}],3,history),[]);
  fs.appendFileSync(high,'f 1 2 3\n');
  const changed=selectBakeParents([{id:'high',file:high}],1,history);
  assert.equal(changed.length,1);
  assert.notEqual(changed[0].sourceSha256,hash);
  assert.equal(inspectBakeSource(path.join(root,'missing.obj')).eligible,false);
});

test('노멀맵 전처리는 관절과 애니메이션 원본을 구조적으로 보호한다',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'bake-rig-')),rig=path.join(root,'rig.glb');
  const payload=Buffer.from(JSON.stringify({
    asset:{version:'2.0'},buffers:[{byteLength:0}],accessors:[{count:9000}],
    meshes:[{primitives:[{attributes:{POSITION:0}}]}],
    skins:[{joints:[0]}],animations:[{channels:[],samplers:[]}]
  }),'utf8');
  const aligned=Buffer.concat([payload,Buffer.alloc((4-payload.length%4)%4,32)]);
  const glb=Buffer.alloc(20+aligned.length);
  glb.write('glTF',0);glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);
  glb.writeUInt32LE(aligned.length,12);glb.write('JSON',16);aligned.copy(glb,20);
  fs.writeFileSync(rig,glb);
  const result=inspectBakeSource(rig);
  assert.equal(result.triangles,3000);assert.equal(result.skinned,true);
  assert.equal(result.eligible,false);
  assert.equal(result.reason,'ANIMATED_ACTOR_REQUIRES_RIG_PRESERVING_AUTHORING');
  assert.deepEqual(selectBakeParents([{id:'rig',file:rig}],3),[]);
});

test('실제 Blender: 조명 탐색이 렌더·채점해 최고 조합을 돌려주고, 굽기가 줄이고 노멀맵을 만든다', {skip:(!blenderAvailable()||!imaging)&&'Blender 또는 Pillow/numpy 없음'}, () => {
  const out=fs.mkdtempSync(path.join(os.tmpdir(),'lb-'));
  const parent='assets/shared/homely-house/fence_open.obj';
  const res=runLightSearch({parent:path.resolve(parent),candidates:4,rounds:2,seed:2,out:path.join(out,'ls')});
  assert.equal(res.tested,8);
  assert.ok(res.best.length>=1&&res.best[0].score>=res.best[res.best.length-1].score);
  assert.ok(res.best[0].roblox.ClockTime>=0&&res.best[0].roblox.ClockTime<=24);
  const bake=runBake({parent,ratio:0.3,size:128,out:path.join(out,'bake')});
  assert.equal(bake.ok,true,JSON.stringify(bake));
  assert.ok(bake.trianglesLow<bake.trianglesHigh);
  assert.ok(fs.existsSync(bake.png)&&fs.existsSync(bake.glb));
  // 합격 여부는 Blender 버전과 모델 모양(평평한 상자는 구울 요철이 없다)에 따라 달라서 판정이 정상 형태로 나오는지만 본다
  const ev=evaluateBake(bake);
  assert.equal(typeof ev.pass,'boolean');assert.ok(ev.reduction>0.3);
});

test('실제 Blender: 확장 연산 4종이 CC0 부모에서 모두 성공한다', {skip:!blenderAvailable()&&'Blender 없음'}, () => {
  const out=fs.mkdtempSync(path.join(os.tmpdir(),'ops-'));
  const parent=path.resolve('assets/shared/homely-house/fence_open.obj');
  const jobs=[['moss',{seed:3,threshold:0.6,coverage:0.9}],['wear',{height:0.3}],['noise_displace',{scale:0.25,strength:0.04}],['inset_panel',{thickness:0.06,depth:0.04}]].map(([op,params])=>({id:'t__'+op,parent,op,params}));
  fs.writeFileSync(path.join(out,'jobs.json'),JSON.stringify(jobs));
  const script=path.resolve('tools/vibe_variation_gym.py');
  const bl=process.env.VIBE2_BLENDER_BINARY;
  const a=['--jobs',path.join(out,'jobs.json'),'--out',path.join(out,'o')];
  const r=bl?spawnSync(bl,['--background','--factory-startup','--python-exit-code','1','--python',script,'--',...a],{encoding:'utf8',maxBuffer:1<<27})
    :spawnSync('python3',['-I','-c',`import sys,runpy;sys.argv=['x','--',${a.map(x=>JSON.stringify(x)).join(',')}];runpy.run_path(${JSON.stringify(script)},run_name='__main__')`],{encoding:'utf8',maxBuffer:1<<27});
  const res=JSON.parse(fs.readFileSync(path.join(out,'o','results.json'),'utf8'));
  assert.deepEqual(res.map(x=>x.ok),[true,true,true,true],JSON.stringify(res.map(x=>x.error)));
});

test('light search replays same-family anchors and compares current renders',()=>{
  const out=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-light-replay-'));
  const params=sample(mulberry32(13));
  const jobs=[];
  try{
    const result=runLightSearch({parent:'approved.obj',candidates:8,rounds:1,out,
      learned:[{score:100,params:{...params,kelvin:Infinity}},{score:99,params},{score:98,params}],
      render:(_parent,rows)=>jobs.push(...rows),
      score:()=>Object.fromEntries(jobs.map((job,i)=>[job.id,i===1?80:70]))});
    assert.deepEqual(jobs[0],toJob(jobs[0].id,params));
    assert.equal(result.tested,8);
    assert.equal(result.replayed,1);
    assert.equal(result.baseline,70);
    assert.equal(result.gain,10);
    assert.throws(()=>runLightSearch({candidates:4,rounds:1,out,render:()=>{},score:()=>({})}),
      /LIGHT_SCORE_INCOMPLETE/);
  }finally{
    fs.rmSync(out,{recursive:true,force:true});
  }
});
