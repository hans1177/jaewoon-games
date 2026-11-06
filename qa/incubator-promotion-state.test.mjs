import test from 'node:test';
import assert from 'node:assert/strict';
import {applyVerifiedPrototypePromotion} from '../tools/incubator-promotion-state.mjs';

const base=()=>({
  state:{version:1,candidates:[{id:'NG00001',reservedProjectId:'P0010',status:'PROTOTYPE_REGISTERED',prototypeDevComplete:false,publicReleaseApproved:false}]},
  portfolio:{version:1,projects:[{id:'P0010',incubatorCandidateId:'NG00001',mode:'PROTOTYPE',profileStatus:'NEW_PROTOTYPE_PENDING_SOURCE',publicReleaseApproved:false}]},
  evidence:{newProject:true,incubatorCandidateId:'NG00001',gameId:'P0010',candidateId:'prototype-NG00001-1',sourceCommit:'dev-before',paidApi:false,selfPromote:false,publicStableModified:false}
});

test('verified prototype changes metadata only and never grants public release',()=>{
  const x=base();
  const result=applyVerifiedPrototypePromotion({...x,devRevision:'dev-after',timestamp:'2026-09-09T00:00:00Z'});
  assert.equal(result.changed,true);
  assert.equal(x.state.candidates[0].status,'PROTOTYPE_DEV_VERIFIED');
  assert.equal(x.state.candidates[0].prototypeDevComplete,true);
  assert.equal(x.state.candidates[0].publicReleaseApproved,false);
  assert.equal(x.portfolio.projects[0].mode,'EXPERIMENT_ONLY');
  assert.equal(x.portfolio.projects[0].profileStatus,'PROTOTYPE_DEV_VERIFIED');
  assert.equal(x.portfolio.projects[0].publicReleaseApproved,false);
  assert.equal(x.portfolio.projects[0].prototypeVerifiedDevRevision,'dev-after');
});

test('existing-game evidence does not mutate incubator state',()=>{
  const x=base();x.evidence.newProject=false;
  const before=JSON.stringify(x);
  assert.equal(applyVerifiedPrototypePromotion(x).changed,false);
  assert.equal(JSON.stringify(x),before);
});

test('unsafe evidence is rejected',()=>{
  for(const patch of [{paidApi:true},{selfPromote:true},{publicStableModified:true}]){
    const x=base();Object.assign(x.evidence,patch);
    assert.throws(()=>applyVerifiedPrototypePromotion(x),/안전하지 않은/);
  }
});

test('wrong lifecycle state cannot skip prototype registration',()=>{
  const x=base();x.state.candidates[0].status='ARTBOOK_COMPLETE';
  assert.throws(()=>applyVerifiedPrototypePromotion(x),/상태 오류/);
});

test('idempotent same verified candidate is accepted but conflicting candidate is blocked',()=>{
  const x=base();applyVerifiedPrototypePromotion({...x,devRevision:'d1',timestamp:'2026-09-09T00:00:00Z'});
  assert.equal(applyVerifiedPrototypePromotion({...x,devRevision:'d1'}).reason,'ALREADY_VERIFIED');
  x.evidence.candidateId='prototype-other';
  assert.throws(()=>applyVerifiedPrototypePromotion({...x,devRevision:'d2'}),/다른 candidate/);
});
