// qa/autonomous-candidate-review.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { reviewAutonomousCandidate } from '../tools/autonomous-candidate-review.mjs';

const source='web-games/__autonomous-review-source__';
const candidate='web-games/.autonomous-candidates/TEST/review';
function setup(before="localStorage.setItem('save-v1','a');\nconsole.log('before');\n",after="localStorage.setItem('save-v1','a');\nconsole.log('after');\n"){
  fs.rmSync(source,{recursive:true,force:true});
  fs.rmSync('web-games/.autonomous-candidates/TEST',{recursive:true,force:true});
  fs.mkdirSync(source,{recursive:true});fs.mkdirSync(candidate,{recursive:true});
  fs.writeFileSync(path.join(source,'app.js'),before);fs.writeFileSync(path.join(candidate,'app.js'),after);
}
function cleanup(){fs.rmSync(source,{recursive:true,force:true});fs.rmSync('web-games/.autonomous-candidates/TEST',{recursive:true,force:true});}
function evidence(overrides={}){return {candidateOnly:true,selfPromote:false,publicStableModified:false,paidApi:false,sourcePath:source,candidatePath:candidate,candidateId:'review',sourceCommit:'a'.repeat(40),changedFiles:['app.js'],...overrides};}

test('independent gate accepts changed candidate with preserved save key',()=>{setup();try{const r=reviewAutonomousCandidate({evidence:evidence(),expectedSourceCommit:'a'.repeat(40)});assert.equal(r.pass,true);assert.equal(r.promotionScope,'AUTONOMOUS_DEV_ONLY');assert.equal(r.publicReleaseAllowed,false);}finally{cleanup();}});

test('source revision mismatch blocks promotion',()=>{setup();try{const r=reviewAutonomousCandidate({evidence:evidence(),expectedSourceCommit:'b'.repeat(40)});assert.equal(r.pass,false);assert.ok(r.blockers.includes('SOURCE_REVISION_MISMATCH'));}finally{cleanup();}});

test('save key mutation is independently blocked',()=>{setup(undefined,"localStorage.setItem('save-v2','a');\nconsole.log('after');\n");try{const r=reviewAutonomousCandidate({evidence:evidence(),expectedSourceCommit:'a'.repeat(40)});assert.equal(r.pass,false);assert.ok(r.blockers.some(x=>x.startsWith('SAVE_KEY_CHANGE')));}finally{cleanup();}});

test('no-op candidate cannot advance',()=>{const same="localStorage.setItem('save-v1','a');\nconsole.log('same');\n";setup(same,same);try{const r=reviewAutonomousCandidate({evidence:evidence(),expectedSourceCommit:'a'.repeat(40)});assert.equal(r.pass,false);assert.ok(r.blockers.some(x=>x.startsWith('NO_MEANINGFUL_FILE_CHANGE')));}finally{cleanup();}});

test('paid/self-promoting/public mutation flags block candidate',()=>{setup();try{const r=reviewAutonomousCandidate({evidence:evidence({paidApi:true,selfPromote:true,publicStableModified:true}),expectedSourceCommit:'a'.repeat(40)});assert.equal(r.pass,false);assert.ok(r.blockers.includes('PAID_API_FLAG'));assert.ok(r.blockers.includes('SELF_PROMOTE_FLAG'));assert.ok(r.blockers.includes('PUBLIC_STABLE_MUTATION_FLAG'));}finally{cleanup();}});
