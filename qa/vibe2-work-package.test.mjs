import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWorkPackage, computeWorkPackageEfficiency, computeWorkloadTelemetry, resolveWorkPackagePolicy } from '../tools/vibe2-work-package.mjs';

const baseTask=(id,extra={})=>({id,gameId:'demo',target:'web',sourceRoot:'web-games/demo',goal:`goal ${id}`,responsibleFiles:[`${id}.js`],status:'queued',estimatedRisk:'low',...extra});

test('minimum workload gate defers a truly tiny package',()=>{
  const policy=resolveWorkPackagePolicy({}, {tasks:[]});
  const pkg=buildWorkPackage({tasks:[baseTask('tiny')],project:{gameId:'demo',projectPath:'web-games/demo'},policy});
  assert.equal(pkg.accepted,false);
  assert.equal(pkg.rejectionReason,'MINIMUM_WORKLOAD_GATE');
});

test('related tasks become one functional work package with shared prep and completion criteria',()=>{
  const policy=resolveWorkPackagePolicy({}, {tasks:[]});
  const pkg=buildWorkPackage({tasks:[baseTask('a',{estimatedRisk:'medium'}),baseTask('b')],project:{gameId:'demo',name:'Demo',projectPath:'web-games/demo'},policy});
  assert.equal(pkg.accepted,true);
  assert.ok(pkg.packageWorkUnits>=3);
  assert.equal(pkg.tasks.length,2);
  assert.equal(pkg.tasks.every(t=>t.packageId===pkg.packageId),true);
  assert.equal(pkg.tasks[0].packageRole,'implementation-owner');
  assert.equal(pkg.tasks[0].packageContext.sharedPreparation,true);
  assert.ok(pkg.completionCriteria.includes('full-core-regression-once-at-fan-in'));
});

test('substantial owner work may form a single package',()=>{
  const policy=resolveWorkPackagePolicy({}, {tasks:[]});
  const pkg=buildWorkPackage({tasks:[baseTask('owner',{ownerDirective:true,evidence:['full-web-game-rebuild']})],project:{gameId:'demo',projectPath:'web-games/demo'},policy});
  assert.equal(pkg.accepted,true);
  assert.ok(pkg.packageWorkUnits>=6);
});

test('historical low efficiency increases minimum package work one step',()=>{
  const tasks=Array.from({length:5},(_,i)=>baseTask(`m${i}`,{packageId:`p${i}`,packageWorkUnits:1,taskWorkUnits:1,status:'done'}));
  const efficiency=computeWorkPackageEfficiency({tasks});
  assert.equal(efficiency.lowEfficiencyDetected,true);
  const policy=resolveWorkPackagePolicy({efficiencyAdaptation:{enabled:true}}, {tasks});
  assert.equal(policy.minWorkUnitsPerPackage,4);
  assert.equal(policy.adaptiveBoost,1);
});

test('workload telemetry counts completed packages and rework without using worker count as success',()=>{
  const tasks=[
    baseTask('a',{packageId:'p1',packageWorkUnits:4,taskWorkUnits:2,status:'done'}),
    baseTask('b',{packageId:'p1',packageWorkUnits:4,taskWorkUnits:2,status:'done',retries:1}),
    baseTask('c',{packageId:'p2',packageWorkUnits:3,taskWorkUnits:3,status:'running'})
  ];
  const t=computeWorkloadTelemetry({tasks},[{packageWorkUnits:5,taskCount:2}]);
  assert.equal(t.completedFeaturePackageCount,1);
  assert.equal(t.plannedPackageCount,1);
  assert.equal(t.plannedWorkUnits,5);
  assert.ok(t.historicalReworkRatePct>0);
  assert.equal(t.duplicateFullRegressionExpected,false);
});
