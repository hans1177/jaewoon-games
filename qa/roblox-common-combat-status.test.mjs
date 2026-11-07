import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {findLuau,STUB_PRELUDE} from '../tools/roblox-luau-load-smoke.mjs';

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

test('효과표 검증이 알 수 없는 키와 범위 밖 값을 보고한다',{skip},()=>{
  const out=run(`
local bad=Combat.ValidateEffectTable({ok={crit=.1},typo={crti=.1},big={burn=1.5},neg={leech=-.1}})
print(#bad)
for _,line in ipairs(bad) do print(line) end
print(#Combat.ValidateEffectTable({a={crit=.05,dr=.1}}))
`);
  assert.match(out,/^3\n/);
  assert.match(out,/crti/);
  assert.match(out,/burn: 0~1/);
  assert.match(out,/leech: 0~1/);
  assert.match(out,/\n0\s*$/);
});

test('한글 설명·피해 감소·회피·저항이 상한과 함께 동작한다',{skip},()=>{
  const out=run(`
print(Combat.Describe({crit=.05,burn=.1,dr=.08}))
print(Combat.DamageMultiplier({dr=.9}),Combat.DamageMultiplier({dr=.1}))
print(Combat.DefendRoll({dodge=.9},function() return .19 end).dodged,Combat.DefendRoll({dodge=.9},function() return .21 end).dodged)
local kept=Combat.FilterByResist({"burn","poison"},{resist={burn=1}},function() return .5 end)
print(#kept,kept[1])
`);
  assert.match(out,/치명타 5% · 화염 10% · 받는 피해 감소 8%/);
  assert.match(out,/0\.7\s+0\.9/);
  assert.match(out,/true\s+false/);
  assert.match(out,/1\s+poison/);
});

test('정화는 상태·쿨다운·표시를 모두 지우고 알림 콜백이 호출된다',{skip},()=>{
  const out=run(`
local attrs={MeadowStatus="화염"}
local model={Parent=true,SetAttribute=function(_,k,v) attrs[k]=v end}
local target={HP=10,model=model,status={burn=999,poison=999},frostCooldown=5}
local removed=Combat.Purge(target)
print(table.concat(removed,","),attrs.MeadowStatus==nil,target.frostCooldown==nil)
local events={}
local frostTarget={HP=10,model=model,isBoss=true}
Combat.ApplyStatus(frostTarget,"frost",{now=1,spawn=function() end,wait=function() end,tickBase=function() return 1 end,dealTick=function() end,onStatus=function(_,kind,event) events[#events+1]=kind..":"..event end})
print(events[1])
`);
  assert.match(out,/burn,poison\s+true\s+true/);
  assert.match(out,/frost:immune/);
});

test('마력숲 실제 장비 효과표가 모듈 검증을 통과한다',{skip},()=>{
  const config=fs.readFileSync('roblox-games/fantasy-survival/shared/GameConfig.luau','utf8');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'combat-real-'));
  const file=path.join(dir,'t.luau');
  fs.writeFileSync(file,`${STUB_PRELUDE}\nlocal Combat=(function()\n${module_}\nend)()\nlocal Config=(function()\n${config}\nend)()\nlocal bad=Combat.ValidateEffectTable(Config.GearEffects)\nprint("BAD",#bad)\nfor _,l in ipairs(bad) do print(l) end\n`);
  const r=spawnSync(tools.luau,[file],{encoding:'utf8',timeout:60000});
  fs.rmSync(dir,{recursive:true,force:true});
  const out=String(r.stdout)+String(r.stderr);
  assert.match(out,/BAD\s+0/,out.slice(0,400));
});
