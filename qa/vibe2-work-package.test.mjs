// 파일명: qa/vibe2-work-package.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWorkPackage,
  computeWorkPackageEfficiency,
  computeWorkloadTelemetry,
  resolveWorkPackagePolicy
} from '../tools/vibe2-work-package.mjs';

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
  assert.equal(pkg.quantityGoal,'MULTI_TASK_FEATURE');
});

test('substantial owner work may form a single feature package',()=>{
  const policy=resolveWorkPackagePolicy({}, {tasks:[]});
  const pkg=buildWorkPackage({tasks:[baseTask('owner',{ownerDirective:true,evidence:['full-web-game-rebuild']})],project:{gameId:'demo',projectPath:'web-games/demo'},policy});
  assert.equal(pkg.accepted,true);
  assert.ok(pkg.packageWorkUnits>=6);
  assert.equal(pkg.quantityGoal,'FEATURE_COMPLETION');
});

test('two related improvement scopes are not enough when feature threshold is intentionally raised',()=>{
  const policy={...resolveWorkPackagePolicy({}, {tasks:[]}),substantialSingleTaskWorkUnits:8,minRelatedImprovementsPerPackage:3};
  const pkg=buildWorkPackage({
    tasks:[baseTask('not-enough',{evidence:['work-package-scope:qa-regression','work-package-scope:bug-hardening']})],
    project:{gameId:'demo',projectPath:'web-games/demo'},policy
  });
  assert.equal(pkg.accepted,false);
  assert.equal(pkg.rejectionReason,'CYCLE_QUANTITY_GOAL');
  assert.equal(pkg.relatedImprovementCount,2);
});

test('three explicit related improvements satisfy cycle quantity goal without fake task work units',()=>{
  const policy={...resolveWorkPackagePolicy({}, {tasks:[]}),substantialSingleTaskWorkUnits:8,minRelatedImprovementsPerPackage:3};
  const task=baseTask('expanded',{evidence:[
    'work-package-scope:bug-hardening',
    'work-package-scope:qa-regression',
    'work-package-scope:performance-sanity'
  ]});
  const pkg=buildWorkPackage({tasks:[task],project:{gameId:'demo',projectPath:'web-games/demo'},policy});
  assert.equal(pkg.accepted,true);
  assert.equal(pkg.quantityGoal,'RELATED_IMPROVEMENTS');
  assert.equal(pkg.relatedImprovementCount,3);
  assert.equal(pkg.baseTaskWorkUnits,1);
  assert.equal(pkg.packageWorkUnits,4);
  assert.equal(pkg.tasks[0].taskWorkUnits,1);
});

test('historical low efficiency increases minimum package work one step',()=>{
  const tasks=Array.from({length:5},(_,i)=>baseTask(`m${i}`,{packageId:`p${i}`,packageWorkUnits:1,taskWorkUnits:1,status:'done'}));
  const efficiency=computeWorkPackageEfficiency({tasks});
  assert.equal(efficiency.lowEfficiencyDetected,true);
  const policy=resolveWorkPackagePolicy({efficiencyAdaptation:{enabled:true}}, {tasks});
  assert.equal(policy.minWorkUnitsPerPackage,4);
  assert.equal(policy.adaptiveBoost,1);
});

test('two consecutive low-efficiency completed packages increase adaptive package size',()=>{
  const tasks=[0,1].flatMap(i=>[
    baseTask(`a${i}`,{packageId:`p${i}`,packageWorkUnits:4,taskWorkUnits:2,status:'done',retries:1,evidence:[`workload:changed-files:1`,`workload:changed-lines:4`,`workload:prep-ms:800`,`workload:cycle-ms:1000`]}),
    baseTask(`b${i}`,{packageId:`p${i}`,packageWorkUnits:4,taskWorkUnits:2,status:'done',evidence:[`workload:changed-files:0`,`workload:changed-lines:0`,`workload:prep-ms:0`,`workload:cycle-ms:1000`]})
  ]);
  const efficiency=computeWorkPackageEfficiency({tasks});
  assert.equal(efficiency.lowEfficiencyStreak,2);
  assert.equal(efficiency.lowEfficiencyDetected,true);
  const policy=resolveWorkPackagePolicy({efficiencyAdaptation:{enabled:true}}, {tasks});
  assert.equal(policy.adaptiveBoost,1);
  assert.equal(policy.minWorkUnitsPerPackage,4);
});

test('workload telemetry measures completed features change volume rework qa duplication and cycle time',()=>{
  const commonEvidence=[
    'workload:changed-files:2',
    'workload:changed-lines:18',
    'workload:prep-ms:100',
    'workload:cycle-ms:1000',
    'incremental-qa-hash:same'
  ];
  const tasks=[
    baseTask('a',{packageId:'p1',packageWorkUnits:4,taskWorkUnits:2,status:'done',evidence:commonEvidence}),
    baseTask('b',{packageId:'p1',packageWorkUnits:4,taskWorkUnits:2,status:'done',retries:1,evidence:[...commonEvidence,'incremental-qa-hash:same']})
  ];
  const t=computeWorkloadTelemetry({tasks},[{packageWorkUnits:5,taskCount:2,quantityGoal:'MULTI_TASK_FEATURE',relatedImprovementCount:0}]);
  assert.equal(t.completedFeaturePackageCount,1);
  assert.equal(t.plannedPackageCount,1);
  assert.equal(t.plannedFeaturePackageCount,1);
  assert.equal(t.plannedWorkUnits,5);
  assert.equal(t.actualChangedFileCount,4);
  assert.equal(t.actualChangedLineCount,36);
  assert.ok(t.historicalReworkRatePct>0);
  assert.ok(t.historicalQaDuplicateRatePct>0);
  assert.equal(t.averagePackageCycleTimeMs,1000);
  assert.equal(t.duplicateFullRegressionExpected,false);
});
