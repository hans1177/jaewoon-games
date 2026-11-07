import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {findLuau} from '../tools/roblox-luau-load-smoke.mjs';

const file='assets/roblox/common-vfx-v1/RobloxCommonSkillSignature.luau';
const source=fs.readFileSync(file,'utf8');
const tools=findLuau();
const skip=tools?false:'luau 바이너리가 없어 건너뜀';

test('공개 StyleNames가 실제 구현된 스타일과 정확히 일치한다',()=>{
  const defined=[...source.matchAll(/styles\.([a-z]+)=function/g)].map(m=>m[1]).sort();
  const listed=source.match(/Signature\.StyleNames = \{([\s\S]*?)\n\}/)[1].match(/"([a-z]+)"/g).map(x=>x.replace(/"/g,'')).sort();
  assert.deepEqual(listed,defined);
  assert.ok(defined.length>=24);
});

test('Install은 잘못된 입력에서 게임을 죽이지 않고 문제 목록을 돌려준다',{skip},()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sig-'));
  const script=path.join(dir,'t.luau');
  fs.writeFileSync(script,`warn=function() end\nlocal Sig=(function()\n${source}\nend)()\nlocal problems=Sig.Validate({})\nprint(#problems)\nlocal handle,list=Sig.Install({})\nprint(handle==nil,#list)\nprint(#Sig.Validate(nil),Sig.PART_BUDGET>Sig.PART_BUDGET_REDUCED)\n`);
  const r=spawnSync(tools.luau,[script],{encoding:'utf8',timeout:30000});
  fs.rmSync(dir,{recursive:true,force:true});
  const out=String(r.stdout)+String(r.stderr);
  assert.match(out,/^7\n/,out);
  assert.match(out,/true\s+7/);
  assert.match(out,/1\s+true/);
});

test('새 외부 에셋 없이 기본 이펙트만 쓴다(mesh/asset id 문자열 없음)',()=>{
  assert.doesNotMatch(source,/rbxassetid:\/\//);
  assert.doesNotMatch(source,/Instance\.new\("MeshPart"\)/);
});
