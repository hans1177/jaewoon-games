import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {findLuau,smokeGame,checkProjectMappings} from '../tools/roblox-luau-load-smoke.mjs';

const tools=findLuau();
const skip=tools?false:'luau 바이너리가 없어 건너뜀(CI에서는 설치 후 실행)';

test('마력숲 소스는 컴파일되고 GameConfig가 끝까지 실행된다',{skip},()=>{
  const result=smokeGame('roblox-games/fantasy-survival',tools);
  assert.deepEqual(result.errors,[]);
});

test('정의 전에 값을 읽는 GameConfig 로드 크래시를 실제로 잡아낸다',{skip},()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'smoke-bad-'));
  fs.mkdirSync(path.join(dir,'shared'));
  fs.writeFileSync(path.join(dir,'shared','GameConfig.luau'),'local Config={}\nlocal x=Config.Veins["a"]\nConfig.Veins={a=1}\nreturn Config\n');
  const result=smokeGame(dir,tools);
  assert.equal(result.errors.length,1);
  assert.match(result.errors[0],/CONFIG/);
  fs.rmSync(dir,{recursive:true,force:true});
});

test('정상 설정은 통과한다',{skip},()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'smoke-ok-'));
  fs.mkdirSync(path.join(dir,'shared'));
  fs.writeFileSync(path.join(dir,'shared','GameConfig.luau'),'local Config={Veins={a=1}}\nreturn Config\n');
  assert.deepEqual(smokeGame(dir,tools).errors,[]);
  fs.rmSync(dir,{recursive:true,force:true});
});

test('Rojo에 매핑되지 않은 Shared 모듈 require를 잡아낸다',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'smoke-map-'));
  fs.mkdirSync(path.join(dir,'shared'));fs.mkdirSync(path.join(dir,'client'));
  fs.writeFileSync(path.join(dir,'shared','GameConfig.luau'),'return {}\n');
  fs.writeFileSync(path.join(dir,'client','Game.client.luau'),'local A=require(Shared:WaitForChild("GameConfig"))\nlocal B=require(Shared:WaitForChild("MissingModule"))\n');
  fs.writeFileSync(path.join(dir,'default.project.json'),JSON.stringify({name:'x',tree:{$className:'DataModel',ReplicatedStorage:{$className:'ReplicatedStorage',Shared:{$path:'shared',Ghost:{$path:'nope/Ghost.luau'}}}}}));
  const errors=checkProjectMappings(dir);
  assert.ok(errors.some(e=>/MissingModule/.test(e)),errors.join('\n'));
  assert.ok(errors.some(e=>/nope\/Ghost/.test(e)),errors.join('\n'));
  assert.ok(!errors.some(e=>/GameConfig/.test(e)));
  fs.rmSync(dir,{recursive:true,force:true});
});

test('모든 로블록스 게임의 Rojo 매핑과 require가 일치한다',()=>{
  const bad=[];
  for(const game of fs.readdirSync('roblox-games')){
    const dir=path.join('roblox-games',game);
    if(!fs.statSync(dir).isDirectory())continue;
    for(const error of checkProjectMappings(dir))bad.push(`${game}: ${error}`);
  }
  assert.deepEqual(bad,[]);
});
