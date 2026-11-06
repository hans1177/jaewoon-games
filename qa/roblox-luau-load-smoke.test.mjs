import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {findLuau,smokeGame} from '../tools/roblox-luau-load-smoke.mjs';

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
