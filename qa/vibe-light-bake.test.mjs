import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {mulberry32,blenderAvailable} from '../tools/vibe-variation-gym.mjs';
import {kelvinToRgb,sample,perturb,SPACE,toRoblox,toJob,mergeLearned,runLightSearch} from '../tools/vibe-light-search.mjs';
import {evaluateBake,runBake} from '../tools/vibe-normal-bake.mjs';

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
