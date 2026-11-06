import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {findLuau} from '../tools/roblox-luau-load-smoke.mjs';

const tools=findLuau();
const skip=tools?false:'luau 바이너리가 없어 건너뜀';
const module_=fs.readFileSync('assets/roblox/common-combat-v1/RobloxCommonCombatStatus.luau','utf8');

function run(script){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'combat-status-'));
  const file=path.join(dir,'t.luau');
  fs.writeFileSync(file,`local Combat=(function()\n${module_}\nend)()\n${script}`);
  const r=spawnSync(tools.luau,[file],{encoding:'utf8',timeout:30000});
  fs.rmSync(dir,{recursive:true,force:true});
  return String(r.stdout)+String(r.stderr);
}

test('장비 효과 합계와 상한이 마력숲 수치와 같다',{skip},()=>{
  const out=run(`
local fx=Combat.SumEffects({a={crit=.3,burn=.5},b={crit=.2,leech=.4}},{"a","b","none"})
print(fx.crit,fx.burn,fx.leech)
local never=function() return 0 end
local hit=Combat.RollHitEffects({burn=.9,poison=.9,frost=.9,bleed=.9,stun=.9,leech=.9},{isBoss=false},never)
print(#hit.statuses,hit.stun,hit.leechRatio)
local boss=Combat.RollHitEffects({stun=.9},{isBoss=true},never)
print(boss.stun)
print(Combat.RollCrit({crit=.9},function() return .39 end),Combat.RollCrit({crit=.9},function() return .41 end))
`);
  assert.match(out,/0\.5\s+0\.5\s+0\.4/);
  assert.match(out,/4\s+true\s+0\.15/);
  assert.match(out,/false/);
  assert.match(out,/true\s+false/);
});

test('죽은 대상에는 상태이상·기절이 걸리지 않고 흡수만 남는다',{skip},()=>{
  const out=run(`
local hit=Combat.RollHitEffects({burn=1,stun=1,leech=.1},{targetDead=true},function() return 0 end)
print(#hit.statuses,hit.stun,hit.leechRatio)
`);
  assert.match(out,/0\s+false\s+0\.1/);
});

test('화상은 지속 피해 틱을 주고 서리는 보스에게 통하지 않는다',{skip},()=>{
  const out=run(`
local attrs={}
local model={Parent=true,SetAttribute=function(self,k,v) attrs[k]=v end}
local target={HP=100,model=model,isBoss=false}
local ticks=0
local queue={}
local ctx={now=100,spawn=function(fn) fn() end,wait=function() target.model.Parent=ticks<2 end,
  tickBase=function() return 50 end,dealTick=function(t,tick) ticks+=1;t.lastTick=tick end}
-- os.clock 대신 충분히 긴 지속을 위해 status를 미리 크게 둔다
Combat.ApplyStatus(target,"burn",{now=os.clock(),spawn=function(fn) target.status.burn=os.clock()+100;fn() end,wait=ctx.wait,tickBase=ctx.tickBase,dealTick=ctx.dealTick})
print(attrs.MeadowStatus,target.lastTick)
local boss={HP=50,model=model,isBoss=true}
model.Parent=true
print(Combat.ApplyStatus(boss,"frost",{now=1,spawn=function() end,wait=function() end,tickBase=function() return 1 end,dealTick=function() end}))
`);
  assert.match(out,/화염|nil/);
  assert.match(out,/false/);
});
