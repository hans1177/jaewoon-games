import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPlatformFocusPolicy } from '../tools/vibe2-platform-focus-policy.mjs';

const config={
  enabled:true,
  primary:'roblox',
  weights:{roblox:80,unity:20},
  unity:{
    keepRunning:true,
    maintenanceOnlyWhileRobloxAvailable:true,
    criticalBypassesBudget:true,
    allowWhenRobloxUnavailable:true,
    softSlotCap:4
  }
};

function task(id,target,status='queued',extra={}){
  return {id,target,status,goal:'work',priority:'normal',releaseState:'development-confirmed',evidence:[],...extra};
}

test('Roblox availability keeps running Unity but defers non-maintenance Unity',()=>{
  const result=applyPlatformFocusPolicy({maxConcurrentTasks:20,tasks:[
    task('rbx','roblox'),
    task('unity-running','unity','running',{goal:'existing Unity work'}),
    task('unity-feature','unity','queued',{goal:'새 지역 기능 추가'}),
    task('unity-save-fix','unity','queued',{goal:'세이브 null 오류 복구'}),
    task('web','web','queued',{goal:'existing web flow'})
  ]},config);
  const byId=new Map(result.queue.tasks.map(row=>[row.id,row]));
  assert.equal(result.robloxAvailable,true);
  assert.equal(byId.get('unity-running').status,'running');
  assert.equal(byId.get('unity-feature').status,'blocked');
  assert.equal(byId.get('unity-feature').blocker,'platform-focus:roblox-primary-maintenance-only');
  assert.equal(byId.get('unity-save-fix').status,'queued');
  assert.equal(byId.get('web').status,'queued');
});

test('Unity low-intensity budget is 20 percent while Roblox has work',()=>{
  const tasks=[task('rbx','roblox'),task('unity-running','unity','running',{goal:'빌드 오류 복구'})];
  for(let i=1;i<=5;i++)tasks.push(task(`unity-maint-${i}`,'unity','queued',{goal:`버그 수정 ${i}`,priority:'high'}));
  const result=applyPlatformFocusPolicy({maxConcurrentTasks:20,tasks},config);
  const queued=result.queue.tasks.filter(row=>row.target==='unity'&&row.status==='queued');
  const blocked=result.queue.tasks.filter(row=>row.target==='unity'&&row.status==='blocked');
  assert.equal(result.unitySoftCap,4);
  assert.equal(queued.length,3);
  assert.equal(blocked.length,2);
  assert.equal(blocked.every(row=>row.blocker==='platform-focus:roblox-primary-unity-budget'),true);
});

test('critical Unity maintenance bypasses soft budget',()=>{
  const result=applyPlatformFocusPolicy({maxConcurrentTasks:1,tasks:[
    task('rbx','roblox'),
    task('unity-running','unity','running',{goal:'maintenance'}),
    task('unity-critical','unity','queued',{goal:'빌드 실패 복구',priority:'critical'}),
    task('unity-normal','unity','queued',{goal:'버그 수정'})
  ]},config);
  const byId=new Map(result.queue.tasks.map(row=>[row.id,row]));
  assert.equal(result.unitySoftCap,1);
  assert.equal(byId.get('unity-critical').status,'queued');
  assert.equal(byId.get('unity-normal').status,'blocked');
});

test('policy-deferred Unity automatically reopens when Roblox is empty or blocked',()=>{
  const result=applyPlatformFocusPolicy({maxConcurrentTasks:20,tasks:[
    task('rbx-blocked','roblox','blocked',{blocker:'dependency-not-ready'}),
    task('unity-feature','unity','blocked',{goal:'새 기능',blocker:'platform-focus:roblox-primary-maintenance-only'})
  ]},config);
  const unity=result.queue.tasks.find(row=>row.id==='unity-feature');
  assert.equal(result.robloxAvailable,false);
  assert.equal(unity.status,'queued');
  assert.equal(unity.blocker,null);
});

test('owner Unity directive is never deferred by platform focus',()=>{
  const result=applyPlatformFocusPolicy({maxConcurrentTasks:20,tasks:[
    task('rbx','roblox'),
    task('owner-unity','unity','queued',{goal:'owner feature',ownerDirective:true,priority:'owner-immediate'})
  ]},config);
  const unity=result.queue.tasks.find(row=>row.id==='owner-unity');
  assert.equal(unity.status,'queued');
  assert.equal(unity.blocker,undefined);
});
