import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {GATE,decideLook,allowedByPolicy,emptyLook,lookLuau} from '../tools/vibe-look-govern.mjs';
import {policyGames} from '../tools/vibe-look-kit.mjs';

const table=JSON.parse(fs.readFileSync('assets/roblox/common-look-v1/look-presets.json','utf8'));
const policy={enabled:true,allow:['storybook','cozy','bright-adventure'],allowAuto:true,brightOnly:true};
const row=(id,over={})=>({id,score:70,gain:10,minGain:4,...over});
const shot=(rows,over={})=>({available:true,checked:6,score:50,lookSimulation:{ranking:rows},...over});
const T0='2026-11-09T00:00:00Z',h=n=>new Date(Date.parse(T0)+n*36e5).toISOString();
const step=(look,aes,now=T0,extra={})=>decideLook({look,aesthetic:aes,policy,table,now,...extra});

test('관문 기준은 높다(이득 +8, 모든 프레임 +3, 3번 연속, 24시간 쿨다운, 확인 +3)', () => {
  assert.deepEqual([GATE.minGain,GATE.minFrameGain,GATE.streak,GATE.cooldownHours,GATE.keepMargin,GATE.minFrames],[8,3,3,24,3,4]);
});

test('정책이 없거나 꺼져 있으면 아무것도 하지 않는다', () => {
  const r=decideLook({look:emptyLook(),aesthetic:shot([row('storybook')]),policy:undefined,table});
  assert.equal(r.event.type,'DISABLED');
  assert.equal(decideLook({look:emptyLook(),aesthetic:shot([row('storybook')]),policy:{enabled:false},table}).event.type,'DISABLED');
});

test('프레임이 4장 미만이거나 스코어러가 없으면 적용하지 않는다', () => {
  assert.equal(step(emptyLook(),shot([row('storybook')],{checked:3})).event.type,'NOT_ENOUGH_FRAMES');
  assert.equal(step(emptyLook(),{available:false}).event.type,'NOT_ENOUGH_FRAMES');
});

test('이득이 모자라거나 한 프레임이라도 손해면 후보가 아니다', () => {
  assert.equal(step(emptyLook(),shot([row('storybook',{gain:7.9})])).event.type,'NO_CANDIDATE');
  assert.equal(step(emptyLook(),shot([row('storybook',{minGain:2.9})])).event.type,'NO_CANDIDATE');
  assert.equal(step(emptyLook(),shot([row('storybook',{minGain:undefined})])).event.type,'NO_CANDIDATE');
});

test('정책이 허용하지 않은 프리셋·어두운 프리셋은 밝은 게임에서 후보가 아니다', () => {
  assert.equal(step(emptyLook(),shot([row('horror',{gain:30,minGain:20}),row('dark-fantasy',{gain:25,minGain:15})])).event.type,'NO_CANDIDATE');
  const dusk={id:'auto-aaaaaa',auto:true,lighting:{Brightness:0.9,ClockTime:3}};
  assert.equal(allowedByPolicy(dusk,policy,'bright'),false);
  const day={id:'auto-bbbbbb',auto:true,lighting:{Brightness:3,ClockTime:13}};
  assert.equal(allowedByPolicy(day,policy,'bright'),true);
  assert.equal(allowedByPolicy(day,{...policy,allowAuto:false},'bright'),false);
});

test('레퍼런스가 있으면 근접도가 기준선보다 +5 올라야 한다', () => {
  const aes=ref=>shot([row('storybook',{referenceScore:ref})],{reference:{score:60}});
  assert.equal(step(emptyLook(),aes(64)).event.type,'NO_CANDIDATE');
  assert.equal(step(emptyLook(),aes(65)).event.type,'STREAK');
});

test('3번 연속 같은 프리셋이 1위일 때만 적용하고, 중간에 끊기면 처음부터 센다', () => {
  let look=emptyLook();
  let r=step(look,shot([row('storybook')]),h(0));look=r.look;assert.equal(r.event.streak,1);
  r=step(look,shot([row('storybook')]),h(1));look=r.look;assert.equal(r.event.streak,2);
  r=step(look,shot([row('cozy',{gain:12})]),h(2));look=r.look;assert.equal(r.event.streak,1);  // 1위가 바뀌면 리셋
  r=step(look,shot([]),h(3));look=r.look;assert.equal(r.event.type,'NO_CANDIDATE');assert.equal(look.pending,null);
  for(let i=0;i<2;i++){r=step(look,shot([row('storybook')]),h(4+i));look=r.look}
  r=step(look,shot([row('storybook')]),h(6));
  assert.equal(r.event.type,'APPLY');assert.equal(r.look.preset,'storybook');assert.equal(r.look.baseline,50);
});

function applied(){
  let look=emptyLook();
  for(let i=0;i<3;i++)look=step(look,shot([row('storybook')]),h(i)).look;
  assert.equal(look.preset,'storybook');return look;
}

test('적용 뒤 실제 캡처 2회 평균이 기준선+3 이상이면 확정한다', () => {
  let look=applied();
  let r=step(look,shot([],{score:55}),h(10));look=r.look;assert.equal(r.event.type,'VERIFYING');
  r=step(look,shot([],{score:56}),h(11));
  assert.equal(r.event.type,'CONFIRMED');assert.equal(r.look.confirmed,true);assert.equal(r.look.preset,'storybook');
});

test('실제로는 점수가 안 오르면 되돌리고 그 게임에서 영구 차단한다', () => {
  let look=applied();
  let r=step(look,shot([],{score:51}),h(10));look=r.look;
  r=step(look,shot([],{score:51.5}),h(11));
  assert.equal(r.event.type,'ROLLBACK');assert.equal(r.look.preset,null);assert.ok(r.look.blocked.includes('storybook'));
  // 차단된 프리셋은 다시 후보가 되지 않는다(쿨다운이 지나도)
  const later=step(r.look,shot([row('storybook')]),h(100));
  assert.equal(later.event.type,'NO_CANDIDATE');
});

test('한 번이라도 -3 이하로 떨어지면 즉시 되돌린다(확정 뒤에도)', () => {
  let look=applied();
  assert.equal(step(look,shot([],{score:46.9}),h(10)).event.type,'ROLLBACK');
  look=step(look,shot([],{score:55}),h(10)).look;look=step(look,shot([],{score:56}),h(11)).look;
  assert.equal(look.confirmed,true);
  assert.equal(step(look,shot([],{score:47}),h(20)).event.type,'ROLLBACK');
});

test('쿨다운: 마지막 변경 24시간 안에는 새로 적용하지 않는다', () => {
  let look=applied();
  look=step(look,shot([],{score:40}),h(5)).look;           // 되돌림 → lastChange=h(5)
  assert.equal(look.preset,null);
  assert.equal(step(look,shot([row('cozy')]),h(20)).event.type,'COOLDOWN');
  assert.equal(step(look,shot([row('cozy')]),h(30)).event.type,'STREAK');
});

test('생성되는 Luau: 적용 안 함은 nil, 적용이면 id 만 안전하게', () => {
  assert.match(lookLuau(undefined),/Preset=nil/);
  assert.match(lookLuau({preset:'cozy',confirmed:true}),/Preset="cozy"[\s\S]*Confirmed=true/);
  assert.match(lookLuau({preset:'a"b;c'}),/Preset="abc"/);   // 따옴표·기호 제거
});

test('마레: 정책이 켜져 있고, 키트 사본·적용 스크립트가 원본과 같고, 지금은 적용 안 함이며 래더 점검이 통과한다', () => {
  assert.ok(policyGames().some(g=>g.game==='mare-essentia'));
  const kit=fs.readFileSync('assets/roblox/common-look-v1/RobloxCommonLookKit.luau','utf8');
  for(const g of policyGames())assert.equal(fs.readFileSync(g.copy,'utf8'),kit,g.game);
  assert.equal(fs.readFileSync('roblox-games/mare-essentia/src/StarterPlayer/LookApply.client.luau','utf8'),fs.readFileSync('assets/roblox/common-look-v1/LookApply.client.luau','utf8'));
  const assign=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/LookAssignment.luau','utf8');
  assert.match(assign,/Preset=nil|Preset="[a-z0-9-]+"/);
  const r=spawnSync('node',['tools/vibe-visual-ladder.mjs','--game','mare-essentia','--check'],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
});

test('적용 스크립트는 Preset 이 nil 이면 아무것도 하지 않고 게임 효과를 존중한다', () => {
  const s=fs.readFileSync('assets/roblox/common-look-v1/LookApply.client.luau','utf8');
  assert.match(s,/type\(assign\.Preset\) ~= "string"[\s\S]*return/);
  assert.match(s,/respectGameEffects = true/);
});
