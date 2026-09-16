import test from 'node:test';
import assert from 'node:assert/strict';
import { compareR5PhysicalTelemetry } from '../tools/vibe2-roblox-r5-compare.mjs';

const baseStage=(stage,overrides={})=>({stage,success:true,elapsedMs:1000,retries:0,deaths:0,stalledMs:0,...overrides});
const telemetry=(stages,baseMainSha='main-sha')=>({
  version:1,
  authority:'vibe2-roblox-skyline-input-playtest',
  runtimeVerified:true,
  inputBased:true,
  baseMainSha,
  capabilities:{virtualInput:true,studioTestService:true},
  metrics:{inputActions:74,jumpCount:24,deaths:stages.reduce((n,row)=>n+Number(row.deaths||0),0),retries:stages.reduce((n,row)=>n+Number(row.retries||0),0)},
  stages,
});
const manifest=(selectedStage=2,baseMainSha='main-sha')=>({
  deterministicRecipe:'roblox-obby-autonomous-balance-v1',
  baseMainSha,
  telemetryEvidence:{selectedStage,adjustment:{kind:'platform-tolerance',before:{x:8,z:8},after:{x:8.64,z:8.64}}},
});

test('R5 compare passes only when the physically failed target stage becomes passable',()=>{
  const baseline=telemetry([baseStage(1),baseStage(2,{success:false,elapsedMs:18016,retries:3,deaths:3,stalledMs:2400})]);
  const candidate=telemetry([baseStage(1,{elapsedMs:2700}),baseStage(2,{success:true,elapsedMs:7300,retries:1,deaths:1,stalledMs:350})]);
  const result=compareR5PhysicalTelemetry({baseline,candidate,manifest:manifest()});
  assert.equal(result.pass,true);
  assert.equal(result.reason,'failed-target-stage-now-passes');
  assert.equal(result.selectedStage,2);
  assert.deepEqual(result.earlierRegressions,[]);
});

test('R5 compare rejects a candidate that still fails the selected physical stage',()=>{
  const baseline=telemetry([baseStage(1),baseStage(2,{success:false,elapsedMs:18016,retries:3,deaths:3,stalledMs:2400})]);
  const candidate=telemetry([baseStage(1),baseStage(2,{success:false,elapsedMs:12000,retries:1,deaths:1,stalledMs:600})]);
  const result=compareR5PhysicalTelemetry({baseline,candidate,manifest:manifest()});
  assert.equal(result.pass,false);
  assert.equal(result.reason,'failed-target-stage-still-fails');
});

test('R5 compare rejects stale baseline evidence from a different main revision',()=>{
  const baseline=telemetry([baseStage(1),baseStage(2,{success:false,deaths:3,retries:3})],'old-main');
  const candidate=telemetry([baseStage(1),baseStage(2)],'old-main');
  assert.throws(()=>compareR5PhysicalTelemetry({baseline,candidate,manifest:manifest(2,'new-main')}),/baseline\/main revision mismatch/);
});

test('R5 compare rejects a regression before the selected target stage',()=>{
  const baseline=telemetry([baseStage(1),baseStage(2,{success:false,deaths:3,retries:3})]);
  const candidate=telemetry([baseStage(1,{success:false,deaths:1,retries:1})]);
  const result=compareR5PhysicalTelemetry({baseline,candidate,manifest:manifest()});
  assert.equal(result.pass,false);
  assert.match(result.reason,/earlier-stage-regression/);
});
