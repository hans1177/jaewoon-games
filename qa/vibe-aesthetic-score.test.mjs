import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

// 외부 AI 없이 픽셀 통계로 재는 미적 점수기 검사. 합성 이미지로만 검사해서 환경과 무관하게 재현된다.
const repo=process.cwd();
const script=path.join(repo,'tools','vibe_aesthetic_score.py');
const looks=path.join(repo,'assets','roblox','common-look-v1','look-presets.json');
const ok=spawnSync('python3',['-c','import PIL,numpy'],{encoding:'utf8'}).status===0;
const skip=!ok&&'Pillow/numpy 없음';

function mk(dir,name,py){
  fs.mkdirSync(dir,{recursive:true});
  const r=spawnSync('python3',['-c',`from PIL import Image,ImageDraw\nimport random\nrandom.seed(3)\n${py.replace(/OUT/g,JSON.stringify(path.join(dir,name))) }`]);
  assert.equal(r.status,0,String(r.stderr));
}
const flatGray=`Image.new('RGB',(320,180),(120,120,118)).save(OUT)`;
// 하늘 그라데이션 + 따뜻한 지면 + 다양한 물체: 대비·채도·세부가 풍부한 화면
const rich=`im=Image.new('RGB',(320,180));d=ImageDraw.Draw(im)
for y in range(180):
    t=y/180
    d.line([(0,y),(320,y)],fill=(int(40+200*t),int(90+80*t),int(200-150*t)))
d.rectangle([0,110,320,180],fill=(70,110,50))
for i in range(40):
    x=random.randint(0,310);y=random.randint(100,170);d.ellipse([x,y,x+random.randint(6,24),y+random.randint(6,24)],fill=(random.randint(30,255),random.randint(30,255),random.randint(30,120)))
d.ellipse([130,50,190,110],fill=(250,210,90))
im.save(OUT)`;
const run=(dir,...extra)=>{const r=spawnSync('python3',[script,'--dir',dir,...extra],{encoding:'utf8',maxBuffer:1<<26});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout.trim().split('\n').pop())};
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'aes-'));

test('풍부한 화면이 밋밋한 단색 화면보다 확실히 높은 점수를 받고, 고칠 점을 알려 준다', {skip}, () => {
  const a=tmp(),b=tmp();
  mk(a,'flat.png',flatGray);mk(b,'rich.png',rich);
  const flat=run(a),good=run(b);
  assert.ok(good.score>flat.score+25,`rich ${good.score} vs flat ${flat.score}`);
  const axes=flat.advice.map(x=>x.axis);
  assert.ok(axes.includes('flatness')||axes.includes('contrast'),axes.join());
});

test('검은 화면은 노출·가려짐 때문에 낮은 점수', {skip}, () => {
  const d=tmp();mk(d,'black.png',`Image.new('RGB',(320,180),(0,0,0)).save(OUT)`);
  assert.ok(run(d).score<45);
});

test('프레임이 없으면 점수 없이 checked 0으로 정상 종료', {skip}, () => {
  const r=run(tmp());assert.equal(r.checked,0);assert.equal(r.available,true);
});

test('룩 시뮬레이션: 밋밋한 화면은 대비·채도를 올리는 프리셋이 점수를 올린다(추정임이 표시된다)', {skip}, () => {
  const d=tmp();mk(d,'flat.png',`im=Image.new('RGB',(320,180),(125,125,122));d=ImageDraw.Draw(im)\nfor i in range(30):\n    x=random.randint(0,300);y=random.randint(0,160);c=random.randint(105,140);d.rectangle([x,y,x+20,y+20],fill=(c,c,c-3))\nim.save(OUT)`);
  const r=run(d,'--looks',looks);
  assert.equal(r.lookSimulation.estimated,true);
  const presets=JSON.parse(fs.readFileSync(looks,'utf8')).presets;
  assert.equal(r.lookSimulation.ranking.length,presets.length);
  assert.deepEqual(new Set(r.lookSimulation.ranking.map(x=>x.id)),
    new Set(presets.map(x=>x.id)),'시뮬레이션이 실제 룩 프리셋을 빠짐없이 채점해야 한다');
  assert.ok(r.lookSimulation.ranking[0].gain>0,'어떤 프리셋도 점수를 못 올림');
});

test('레퍼런스 모드: 같은 이미지는 거의 100점, 전혀 다른 분위기는 훨씬 낮고, 프리셋 순위가 레퍼런스를 따른다', {skip}, () => {
  const ref=tmp(),same=tmp(),other=tmp();
  mk(ref,'r.png',rich);mk(same,'s.png',rich);mk(other,'o.png',flatGray);
  const hit=run(same,'--reference',ref),miss=run(other,'--reference',ref);
  assert.ok(hit.reference.score>=95,String(hit.reference.score));
  assert.ok(miss.reference.score<hit.reference.score-25,`${miss.reference.score} vs ${hit.reference.score}`);
  assert.ok(miss.reference.deviations.length>0);
  const sim=run(other,'--reference',ref,'--looks',looks).lookSimulation.ranking;
  assert.ok(sim.every(x=>typeof x.referenceScore==='number'));
  assert.ok(sim[0].referenceScore>=sim[sim.length-1].referenceScore);
});

// 래더 연동: 기준(minScore)이 없으면 보고만, 있으면 낮은 점수에서 승급을 막는다.
function ladderSandbox(extraSpec){
  const dir=tmp();
  fs.mkdirSync(path.join(dir,'tools'),{recursive:true});
  fs.copyFileSync(path.join(repo,'tools','vibe-ladder-frames.py'),path.join(dir,'tools','vibe-ladder-frames.py'));
  fs.copyFileSync(script,path.join(dir,'tools','vibe_aesthetic_score.py'));
  fs.mkdirSync(path.join(dir,'assets','roblox','common-look-v1'),{recursive:true});
  fs.copyFileSync(looks,path.join(dir,'assets','roblox','common-look-v1','look-presets.json'));
  const game=path.join(dir,'roblox-games','g1');fs.mkdirSync(path.join(game,'shared'),{recursive:true});
  fs.writeFileSync(path.join(game,'visual-ladder.json'),JSON.stringify({game:'g1',mood:'bright',paths:{shared:'shared'},
    categories:{world:{label:'월드',tiers:[{tier:1,name:'기본',features:[]},{tier:2,name:'입자',features:['motes']}]}},...extraSpec}));
  fs.writeFileSync(path.join(dir,'report.json'),'STUDIO OK');
  const fr=path.join(dir,'frames');
  for(let i=0;i<3;i++)mk(fr,`f${i}.png`,`Image.effect_noise((320,180),40).convert('RGB').save(OUT)`);
  return {dir,fr};
}
const adv=(s)=>spawnSync('node',[path.join(repo,'tools','vibe-visual-ladder.mjs'),'--game','g1','--advance','--report',path.join(s.dir,'report.json'),'--frames',s.fr],{cwd:s.dir,encoding:'utf8'});

test('래더: 기준이 없으면 점수는 보고만 하고 승급을 막지 않는다', {skip}, () => {
  const s=ladderSandbox({});
  const r=adv(s);
  assert.match(r.stdout,/승급: world → 2단계/,r.stdout+r.stderr);
  const md=fs.readdirSync(path.join(s.dir,'roblox-games','g1')).join();
  assert.ok(md.length>0);
});

test('래더: aestheticBudget.minScore 보다 낮으면 승급하지 않고 이유를 말한다', {skip}, () => {
  const s=ladderSandbox({aestheticBudget:{minScore:99}});
  const r=adv(s);
  assert.match(r.stdout,/승급 없음 \(미적 점수 \d+(\.\d+)? < 기준 99/,r.stdout+r.stderr);
});

test('장면 구도는 수평선과 화면 옆의 윤곽 집중 지점을 구분한다', {skip}, () => {
  const dir=tmp();
  try{
    const horizon=`im=Image.new('RGB',(320,180),(85,145,200));d=ImageDraw.Draw(im)
d.rectangle([0,90,320,180],fill=(55,95,65))`;
    mk(dir,'horizon.png',horizon+'\nim.save(OUT)');
    mk(dir,'landmark.png',horizon+`
for y in range(10,55,10):
    for x in range(220,305,10):
        d.rectangle([x,y,x+5,y+5],fill=(230,190,95))
im.save(OUT)`);
    const [sky,landmark]=run(dir,'--scene-composition').frames;
    assert.equal(sky.sub.focus,0);
    assert.equal(sky.raw.focusColumn,null);
    assert.ok(landmark.sub.focus>0.5);
    assert.equal(landmark.raw.focusColumn,3);
    assert.equal(landmark.raw.focusRow,1);
    assert.ok(run(dir).frames[0].sub.focus>0);
  }finally{
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
