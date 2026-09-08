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
  for(const name of ['TEST-good.json','TEST-badsyntax.json'])fs.rmSync(path.join(evidenceRoot,name),{force:true});
}

test('model output accepts JSON files only and blocks traversal',()=>{
  const parsed=parseModelCandidate(JSON.stringify({summary:'x',files:[{path:'app.js',content:'console.log(1);'}]}));
  assert.equal(parsed.files[0].path,'app.js');
  assert.throws(()=>assertRelativeOutputPath('../outside.js'),/경로 오류/);
  assert.throws(()=>parseModelCandidate(JSON.stringify({files:[{path:'evil.exe',content:'x'}]})),/확장자/);
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
    const response=JSON.stringify({
      summary:'candidate improvement',expectedEffect:'clearer feedback',tests:['syntax'],
      files:[{path:'app.js',content:"const KEY='save-v1';\nlocalStorage.setItem('save-v1','ok');\nconsole.log('candidate');\n"}]
    });
    const evidence=await generateAutonomousCandidate({gameId:'TEST',sourcePath:fixture,goal:'피드백 개선',candidateId:'TEST-good',candidatePath:`${candidateRoot}/TEST-good`,evidencePath:`${evidenceRoot}/TEST-good.json`,modelResponse:response});
    assert.equal(evidence.candidateOnly,true);
    assert.equal(evidence.selfPromote,false);
    assert.equal(evidence.publicStableModified,false);
    assert.equal(fs.readFileSync(path.join(fixture,'app.js'),'utf8'),original);
    assert.match(fs.readFileSync(path.join(candidateRoot,'TEST-good','app.js'),'utf8'),/candidate/);
    assert.ok(fs.existsSync(`${evidenceRoot}/TEST-good.json`));
  }finally{cleanup();}
});

test('syntax-invalid generated javascript cannot pass worker gate',async()=>{
  setup();
  try{
    const response=JSON.stringify({files:[{path:'app.js',content:"localStorage.setItem('save-v1','ok');\nfunction broken( {"}]});
    await assert.rejects(()=>generateAutonomousCandidate({gameId:'TEST',sourcePath:fixture,goal:'test',candidateId:'TEST-badsyntax',candidatePath:`${candidateRoot}/TEST-badsyntax`,evidencePath:`${evidenceRoot}/TEST-badsyntax.json`,modelResponse:response}),/문법검증 실패/);
  }finally{cleanup();}
});
