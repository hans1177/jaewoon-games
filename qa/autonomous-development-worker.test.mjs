// qa/autonomous-development-worker.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  assertRelativeOutputPath,
  extractStorageKeys,
  generateAutonomousCandidate,
  parseModelCandidate,
  readContext,
  validateCandidateAgainstSource,
} from '../tools/autonomous-development-worker.mjs';

const fixture='web-games/__autonomous-worker-test__';
const candidateRoot='web-games/.autonomous-candidates/TEST';
const evidenceRoot='.autonomous/evidence';
function setup(){
  fs.rmSync(fixture,{recursive:true,force:true});
  fs.rmSync(candidateRoot,{recursive:true,force:true});
  fs.mkdirSync(fixture,{recursive:true});
  fs.writeFileSync(path.join(fixture,'index.html'),'<!doctype html><script src="app.js"></script>\n');
  fs.writeFileSync(path.join(fixture,'app.js'),"const KEY='save-v1';\nlocalStorage.setItem('save-v1','ok');\nconsole.log('base');\n");
}
function cleanup(){
  fs.rmSync(fixture,{recursive:true,force:true});
  fs.rmSync(candidateRoot,{recursive:true,force:true});
  for(const name of ['TEST-good.json','TEST-edit.json','TEST-badsyntax.json'])fs.rmSync(path.join(evidenceRoot,name),{force:true});
}

test('model output accepts full files or exact edits only and blocks traversal',()=>{
  const parsed=parseModelCandidate(JSON.stringify({summary:'x',files:[{path:'app.js',content:'console.log(1);'}]}));
  assert.equal(parsed.files[0].path,'app.js');
  const edit=parseModelCandidate(JSON.stringify({summary:'e',edits:[{path:'app.js',find:'base',replace:'fixed'}]}));
  assert.equal(edit.mode,'EXACT_EDITS');
  assert.equal(edit.edits.length,1);
  assert.throws(()=>assertRelativeOutputPath('../outside.js'),/경로 오류/);
  assert.throws(()=>parseModelCandidate(JSON.stringify({files:[{path:'evil.exe',content:'x'}]})),/확장자/);
  assert.throws(()=>parseModelCandidate(JSON.stringify({files:[{path:'app.js',content:'x'}],edits:[{path:'app.js',find:'a',replace:'b'}]})),/정확히 하나/);
});

test('save key changes are rejected by deterministic guard',()=>{
  setup();
  try{
    const candidate=parseModelCandidate(JSON.stringify({files:[{path:'app.js',content:"localStorage.setItem('save-v2','ok');"}]}));
    const result=validateCandidateAgainstSource(fixture,candidate);
    assert.equal(result.pass,false);
    assert.equal(result.violations[0].reason,'SAVE_KEY_CHANGE');
    assert.deepEqual(extractStorageKeys(fs.readFileSync(path.join(fixture,'app.js'),'utf8')),['save-v1']);
  }finally{cleanup();}
});

test('worker writes only autonomous candidate copy and leaves source unchanged',async()=>{
  setup();
  const original=fs.readFileSync(path.join(fixture,'app.js'),'utf8');
  try{
    const response=JSON.stringify({summary:'candidate improvement',expectedEffect:'clearer feedback',tests:['syntax'],files:[{path:'app.js',content:"const KEY='save-v1';\nlocalStorage.setItem('save-v1','ok');\nconsole.log('candidate');\n"}]});
    const evidence=await generateAutonomousCandidate({gameId:'TEST',sourcePath:fixture,goal:'피드백 개선',candidateId:'TEST-good',candidatePath:`${candidateRoot}/TEST-good`,evidencePath:`${evidenceRoot}/TEST-good.json`,modelResponse:response});
    assert.equal(evidence.candidateOnly,true);
    assert.equal(evidence.selfPromote,false);
    assert.equal(evidence.publicStableModified,false);
    assert.equal(fs.readFileSync(path.join(fixture,'app.js'),'utf8'),original);
    assert.match(fs.readFileSync(path.join(candidateRoot,'TEST-good','app.js'),'utf8'),/candidate/);
  }finally{cleanup();}
});

test('exact edit applies once in candidate copy and preserves source/save key',async()=>{
  setup();
  const original=fs.readFileSync(path.join(fixture,'app.js'),'utf8');
  try{
    const response=JSON.stringify({summary:'small fix',edits:[{path:'app.js',find:"console.log('base');",replace:"console.log('fixed');"}]});
    const evidence=await generateAutonomousCandidate({gameId:'TEST',sourcePath:fixture,goal:'작은 수정',candidateId:'TEST-edit',candidatePath:`${candidateRoot}/TEST-edit`,evidencePath:`${evidenceRoot}/TEST-edit.json`,modelResponse:response});
    assert.equal(evidence.changeMode,'EXACT_EDITS');
    assert.equal(evidence.editCount,1);
    assert.equal(fs.readFileSync(path.join(fixture,'app.js'),'utf8'),original);
    assert.match(fs.readFileSync(path.join(candidateRoot,'TEST-edit','app.js'),'utf8'),/fixed/);
  }finally{cleanup();}
});

test('large single-file source produces bounded truncated context instead of disappearing',()=>{
  setup();
  try{
    fs.writeFileSync(path.join(fixture,'index.html'),`<html>${'x'.repeat(700000)}<\/html>`);
    const context=readContext(fixture);
    const index=context.files.find(x=>x.path==='index.html');
    assert.ok(index);
    assert.equal(index.truncated,true);
    assert.ok(context.bytes<=420000);
  }finally{cleanup();}
});

test('syntax-invalid generated javascript cannot pass worker gate',async()=>{
  setup();
  try{
    const response=JSON.stringify({files:[{path:'app.js',content:"localStorage.setItem('save-v1','ok');\nfunction broken( {"}]});
    await assert.rejects(()=>generateAutonomousCandidate({gameId:'TEST',sourcePath:fixture,goal:'test',candidateId:'TEST-badsyntax',candidatePath:`${candidateRoot}/TEST-badsyntax`,evidencePath:`${evidenceRoot}/TEST-badsyntax.json`,modelResponse:response}),/문법검증 실패/);
  }finally{cleanup();}
});
