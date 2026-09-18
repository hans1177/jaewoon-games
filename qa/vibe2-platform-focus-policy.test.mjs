import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPlatformFocusPolicy } from '../tools/vibe2-platform-focus-policy.mjs';

const config={
  version:2,
  mode:'UNITY_ROBLOX_EQUAL_FIRST_TIER',
  enabled:true,
  primaryPlatforms:['unity','roblox'],
  selection:['readiness','estimated-execution-cost','enqueued-at']
};

function task(id,target,status='queued',extra={}){
  return {id,target,status,goal:'work',priority:'normal',releaseState:'development-confirmed',evidence:[],...extra};
}

test('Roblox availability does not defer Unity feature or maintenance work',()=>{
  const result=applyPlatformFocusPolicy({maxConcurrentTasks:20,tasks:[
    task('rbx','roblox'),
    task('unity-feature','unity','queued',{goal:'새 지역 기능 추가'}),
    task('unity-save-fix','unity','queued',{goal:'세이브 null 오류 복구'}),
    task('web','web','queued')
  ]},config);
  const byId=new Map(result.queue.tasks.map(row=>[row.id,row]));
  assert.equal(result.enabled,true);
  assert.equal(result.equalTier,true);
  assert.equal(result.robloxAvailable,true);
  assert.equal(byId.get('unity-feature').status,'queued');
  assert.equal(byId.get('unity-feature').blocker,undefined);
  assert.equal(byId.get('unity-save-fix').status,'queued');
  assert.equal(result.deferredMaintenanceOnly,0);
  assert.equal(result.deferredBudget,0);
});

test('legacy Roblox-primary Unity blocks reopen under equal-tier policy',()=>{
  const result=applyPlatformFocusPolicy({maxConcurrentTasks:20,tasks:[
    task('unity-feature','unity','blocked',{
      blocker:'platform-focus:roblox-primary-maintenance-only',
      evidence:['platform-focus:roblox-primary:deferred']
    }),
    task('unity-budget','unity','blocked',{
      blocker:'platform-focus:roblox-primary-unity-budget'
    })
  ]},config);
  const byId=new Map(result.queue.tasks.map(row=>[row.id,row]));
  for(const id of ['unity-feature','unity-budget']){
    assert.equal(byId.get(id).status,'queued');
    assert.equal(byId.get(id).blocker,null);
    assert.ok(byId.get(id).evidence.includes('platform-focus:unity-roblox-equal-tier:legacy-roblox-primary-block-released'));
  }
  assert.equal(result.restored,2);
  assert.equal(result.changed,true);
});

test('unrelated blockers remain blocked',()=>{
  const result=applyPlatformFocusPolicy({tasks:[
    task('unity-dependency','unity','blocked',{blocker:'dependency-not-ready'}),
    task('rbx-policy','roblox','blocked',{blocker:'owner-hold'})
  ]},config);
  const byId=new Map(result.queue.tasks.map(row=>[row.id,row]));
  assert.equal(byId.get('unity-dependency').status,'blocked');
  assert.equal(byId.get('unity-dependency').blocker,'dependency-not-ready');
  assert.equal(byId.get('rbx-policy').status,'blocked');
  assert.equal(byId.get('rbx-policy').blocker,'owner-hold');
  assert.equal(result.restored,0);
});

test('owner directives and running work are unchanged by equal-tier normalization',()=>{
  const result=applyPlatformFocusPolicy({tasks:[
    task('owner-unity','unity','queued',{ownerDirective:true,priority:'owner-immediate'}),
    task('running-rbx','roblox','running')
  ]},config);
  const byId=new Map(result.queue.tasks.map(row=>[row.id,row]));
  assert.equal(byId.get('owner-unity').status,'queued');
  assert.equal(byId.get('running-rbx').status,'running');
  assert.equal(result.changed,false);
});

test('disabled or invalid config does not rewrite legacy blockers',()=>{
  const result=applyPlatformFocusPolicy({tasks:[
    task('legacy','unity','blocked',{blocker:'platform-focus:roblox-primary-maintenance-only'})
  ]},{enabled:false});
  assert.equal(result.enabled,false);
  assert.equal(result.queue.tasks[0].status,'blocked');
  assert.equal(result.restored,0);
});
