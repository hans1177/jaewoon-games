import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildAutonomousWorkOrder } from '../tools/autonomous-work-planner.mjs';
import { latestDevelopmentBaselineEvidence } from '../tools/development-baseline-evidence.mjs';

const filesystem={existsSync:()=>true};
const catalog={games:[{id:'demo',productionClass:'RELEASE_CONFIRMED',homepageCategory:'release-confirmed'}]};
const diagnostics={demo:{filesScanned:1,counts:{high:1},topIssue:{type:'DOM_NULL_EVENT_BIND',severity:'high',file:'app.js',message:'x',microTask:'app.js 문제 1개만 수정',repairMode:'MODEL'},issues:[]}};
const portfolio={status:'ACTIVE',paidApi:false,maxAutonomousWorkItemsPerDay:8,maxModelCallsPerRun:2,maxRunnerMinutesPerRun:20,projects:[{id:'P1',slug:'demo',name:'Demo',sourcePath:'web-games/demo',productionClass:'RELEASE_CONFIRMED',profileStatus:'RELEASE_CONFIRMED',mode:'UNITY_NEXT',targetEngine:'unity-android',protectedValues:[]}]};

function tempRoot(){return fs.mkdtempSync(path.join(os.tmpdir(),'release-confirmed-baseline-'));}
function writeGate(root,{unityPass=true,state='DEVELOPMENT_BASELINE_READY',ready=true}={}){
  const dir=path.join(root,'design','demo','2026-09-11');
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'cycle-status.json'),JSON.stringify({status:'COMPLETE',baselineGate:{policyDocument:'COMPANY_FLOW.md',productionClass:'DEVELOPMENT_CONFIRMED',baseline:'DEVELOPMENT_BASELINE',state,ready,evidence:{webGameplay:{pass:true},unityProject:{present:true},unityTechnical:{pass:unityPass}}}},null,2));
}
function plan(root){return buildAutonomousWorkOrder({portfolio,artbooks:{artbooks:[]},health:{games:[]},catalog,diagnostics,queueState:{version:1,attempts:[]},date:'2026-09-11',filesystem,repoRoot:root});}

test('RELEASE_CONFIRMED production work requires central Development Baseline evidence without numeric-tier semantics',()=>{
  const root=tempRoot();
  try{
    const order=plan(root);
    assert.equal(order.run,false);
    assert.equal(order.reason,'DEVELOPMENT_BASELINE_REQUIRED');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('complete Web and Unity Development Baseline unlocks RELEASE_CONFIRMED work',()=>{
  const root=tempRoot();
  try{
    writeGate(root);
    const evidence=latestDevelopmentBaselineEvidence('demo',{repoRoot:root});
    assert.equal(evidence.ready,true);
    assert.equal(evidence.gate.productionClass,'DEVELOPMENT_CONFIRMED');
    assert.equal(evidence.gate.baseline,'DEVELOPMENT_BASELINE');
    const order=plan(root);
    assert.equal(order.run,true);
    assert.equal(order.projectStage,'RELEASE_CONFIRMED');
    assert.equal(order.evidence.developmentBaseline.ready,true);
    assert.match(order.evidence.developmentBaseline.source,/design\/demo\/2026-09-11\/cycle-status\.json$/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('partial Development Baseline cannot unlock RELEASE_CONFIRMED even when release diagnostic exists',()=>{
  const root=tempRoot();
  try{
    writeGate(root,{unityPass:false});
    assert.equal(latestDevelopmentBaselineEvidence('demo',{repoRoot:root}).ready,false);
    const order=plan(root);
    assert.equal(order.run,false);
    assert.equal(order.reason,'DEVELOPMENT_BASELINE_REQUIRED');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
