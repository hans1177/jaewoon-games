import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

// 래더 승급 검증(verify)이 오류 보고서와 화면 증거 없는 회차를 막는지, 실제 게임 상태 파일을 건드리지 않고 임시 작업 폴더에서 검사한다.
const repo=process.cwd();
const tool=path.join(repo,'tools','vibe-visual-ladder.mjs');
const hasPillow=spawnSync('python3',['-c','import PIL'],{encoding:'utf8'}).status===0;

function sandbox(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ladder-verify-'));
  fs.mkdirSync(path.join(dir,'tools'),{recursive:true});
  fs.copyFileSync(path.join(repo,'tools','vibe-ladder-frames.py'),path.join(dir,'tools','vibe-ladder-frames.py'));
  const game=path.join(dir,'roblox-games','g1');
  fs.mkdirSync(path.join(game,'shared'),{recursive:true});
  fs.writeFileSync(path.join(game,'visual-ladder.json'),JSON.stringify({
    game:'g1',mood:'bright',paths:{shared:'shared'},
    categories:{world:{label:'월드',tiers:[{tier:1,name:'기본',features:[]},{tier:2,name:'입자',features:['motes']}]}}
  }));
  return dir;
}
function report(dir,text){const f=path.join(dir,'report.json');fs.writeFileSync(f,text);return f}
function advance(dir,...extra){return spawnSync('node',[tool,'--game','g1','--advance',...extra],{cwd:dir,encoding:'utf8'})}
function tierOf(dir){return JSON.parse(fs.readFileSync(path.join(dir,'roblox-games','g1','visual-ladder-state.json'),'utf8')).tiers.world}
function frames(dir,kind){
  const d=path.join(dir,'frames');fs.mkdirSync(d,{recursive:true});
  const code=kind==='black'
    ?`from PIL import Image\nfor i in range(4):Image.new('RGB',(320,180),(0,0,0)).save('${d}/f'+str(i)+'.jpg')`
    :`from PIL import Image\nfor i in range(4):Image.effect_noise((320,180),60+i).convert('RGB').save('${d}/f'+str(i)+'.jpg')`;
  assert.equal(spawnSync('python3',['-c',code]).status,0);
  return d;
}

test('깨끗한 보고서는 승급한다(기존 동작 유지)', () => {
  const dir=sandbox();
  const r=advance(dir,'--report',report(dir,'STUDIO OK\nno problems'));
  assert.match(r.stdout,/승급: world → 2단계/);
  assert.equal(tierOf(dir),2);
});

test('흔한 Luau 런타임 오류가 보고서에 있으면 승급하지 않는다', () => {
  for(const line of [
    'attempt to compare number with nil',
    'attempt to concatenate nil with string',
    'attempt to iterate over a nil value',
    'Workspace.Foo is not a valid member of Workspace "Workspace"',
    'Requested module experienced an error while loading',
    'attempt to index nil with Position',
  ]){
    const dir=sandbox();
    const r=advance(dir,'--report',report(dir,`log start\n${line}\nlog end`));
    assert.match(r.stdout,/승급 없음 \(보고서에 오류/,line);
    assert.equal(tierOf(dir),1,line);
  }
});

test('설명 문장 정도의 일반 단어는 오류로 오탐하지 않는다', () => {
  const dir=sandbox();
  const r=advance(dir,'--report',report(dir,'Compare notes: the module loads fine. member list ok. valid state.'));
  assert.match(r.stdout,/승급: world → 2단계/);
});

test('프레임 폴더를 줬는데 폴더가 없거나 화면이 0장이면 승급하지 않는다', () => {
  let dir=sandbox();
  let r=advance(dir,'--report',report(dir,'ok A'),'--frames',path.join(dir,'nope'));
  assert.match(r.stdout,/프레임 폴더 없음/);
  assert.equal(tierOf(dir),1);
  dir=sandbox();
  fs.mkdirSync(path.join(dir,'empty'));
  r=advance(dir,'--report',report(dir,'ok B'),'--frames',path.join(dir,'empty'));
  assert.match(r.stdout,/승급 없음 \((캡처 화면 0장|화면 검사 불가)/);
  assert.equal(tierOf(dir),1);
});

test('정상 화면 증거가 있으면 승급하고 검은 화면이면 막는다', (t) => {
  if(!hasPillow){t.skip('Pillow 없음');return}
  let dir=sandbox();
  let r=advance(dir,'--report',report(dir,'ok C'),'--frames',frames(dir,'noise'));
  assert.match(r.stdout,/승급: world → 2단계/);
  dir=sandbox();
  r=advance(dir,'--report',report(dir,'ok D'),'--frames',frames(dir,'black'));
  assert.match(r.stdout,/깨진 화면/);
  assert.equal(tierOf(dir),1);
});

test('--frames 없이 실행하는 기존 보고서 전용 경로는 그대로 동작한다', () => {
  const dir=sandbox();
  const r=advance(dir,'--report',report(dir,'plain report'));
  assert.match(r.stdout,/승급: world → 2단계/);
});
