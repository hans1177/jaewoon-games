import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  assertRelativeOutputPath,
  extractStorageKeys,
  generateAutonomousCandidate,
  normalizeModelCandidateShape,
  parseModelCandidate,
  readContext,
  validateCandidateAgainstSource,
} from '../tools/autonomous-development-worker.mjs';
import { buildVibeCoreContext, selectVerifiedVibeLearning } from '../tools/autonomous-department-cycle.mjs';

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
  if(fs.existsSync(evidenceRoot))for(const name of fs.readdirSync(evidenceRoot))if(name.startsWith('TEST-'))fs.rmSync(path.join(evidenceRoot,name),{force:true});
}

test('strict model output accepts full files or exact edits only and blocks traversal',()=>{
  const parsed=parseModelCandidate(JSON.stringify({summary:'x',files:[{path:'app.js',content:'console.log(1);'}]}));
  assert.equal(parsed.files[0].path,'app.js');
  const edit=parseModelCandidate(JSON.stringify({summary:'e',edits:[{path:'app.js',find:'base',replace:'fixed'}]}));
  assert.equal(edit.mode,'EXACT_EDITS');
  assert.throws(()=>assertRelativeOutputPath('../outside.js'),/경로 오류/);
  assert.throws(()=>parseModelCandidate(JSON.stringify({files:[{path:'evil.exe',content:'x'}]})),/확장자/);
  assert.throws(()=>parseModelCandidate(JSON.stringify({files:[{path:'app.js',content:'x'}],edits:[{path:'app.js',find:'a',replace:'b'}]})),/정확히 하나/);
});

test('deterministic normalization repairs singular file, changes edit, wrapper, and prose JSON without another model call',()=>{
  const singular=parseModelCandidate(JSON.stringify({summary:'s',file:{path:'app.js',content:'console.log(2);'}}));
  assert.equal(singular.mode,'FULL_FILES');
  assert.deepEqual(singular.normalization.repairs,['SINGULAR_FILE_TO_FILES']);
  const changes=parseModelCandidate(JSON.stringify({changes:[{file:'app.js',before:'base',after:'fixed'}]}));
  assert.equal(changes.mode,'EXACT_EDITS');
  assert.ok(changes.normalization.repairs.includes('NORMALIZED_CHANGES_EDITS'));
  const wrapped=parseModelCandidate(JSON.stringify({summary:'outer',candidate:{edit:{path:'app.js',find:'base',replace:'fixed'}}}));
  assert.equal(wrapped.mode,'EXACT_EDITS');
  assert.ok(wrapped.normalization.repairs.includes('UNWRAPPED_CANDIDATE'));
  const prose=parseModelCandidate('Here is the candidate: {"file":{"path":"app.js","content":"console.log(3);"}} done');
  assert.ok(prose.normalization.repairs.includes('EXTRACTED_BALANCED_JSON'));
});

test('normalizer refuses ambiguous or unsupported repair instead of guessing',()=>{
  assert.throws(()=>normalizeModelCandidateShape({changes:[{path:'app.js',content:'x',find:'a',replace:'b'}]}),/모호/);
  assert.throws(()=>parseModelCandidate(JSON.stringify({summary:'nothing useful'})),/명확한 변경/);
  assert.throws(()=>parseModelCandidate(JSON.stringify({candidate:{file:{path:'a.js',content:'x'}},result:{file:{path:'b.js',content:'y'}}})),/래퍼가 여러 개/);
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
    const evidence=await generateAutonomousCandidate({gameId:'TEST',sourcePath:fixture,goal:'피드백 개선',candidateId:'TEST-good',candidatePath:`${candidateRoot}/TEST-good`,evidencePath:`${evidenceRoot}/TEST-good.json`,modelResponse:response,sourceCommit:'abc'});
    assert.equal(evidence.candidateOnly,true);
    assert.equal(evidence.selfPromote,false);
    assert.equal(evidence.publicStableModified,false);
    assert.equal(evidence.sourceCommit,'abc');
    assert.equal(fs.readFileSync(path.join(fixture,'app.js'),'utf8'),original);
    assert.match(fs.readFileSync(path.join(candidateRoot,'TEST-good','app.js'),'utf8'),/candidate/);
  }finally{cleanup();}
});

test('repaired singular exact edit applies once and records normalization',async()=>{
  setup();
  const original=fs.readFileSync(path.join(fixture,'app.js'),'utf8');
  try{
    const response=JSON.stringify({summary:'small fix',edit:{path:'app.js',find:"console.log('base');",replace:"console.log('fixed');"}});
    const evidence=await generateAutonomousCandidate({gameId:'TEST',sourcePath:fixture,goal:'작은 수정',candidateId:'TEST-edit',candidatePath:`${candidateRoot}/TEST-edit`,evidencePath:`${evidenceRoot}/TEST-edit.json`,modelResponse:response,sourceCommit:'abc'});
    assert.equal(evidence.changeMode,'EXACT_EDITS');
    assert.equal(evidence.editCount,1);
    assert.equal(evidence.modelNormalization.applied,true);
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
    await assert.rejects(()=>generateAutonomousCandidate({gameId:'TEST',sourcePath:fixture,goal:'test',candidateId:'TEST-badsyntax',candidatePath:`${candidateRoot}/TEST-badsyntax`,evidencePath:`${evidenceRoot}/TEST-badsyntax.json`,modelResponse:response,sourceCommit:'abc'}),/문법검증 실패/);
  }finally{cleanup();}
});

test('Vibe collaboration core reuses only verified Company DNA and never self-approves',()=>{
  const learning=selectVerifiedVibeLearning({
    items:[
      {type:'VIBE2',patternId:'verified-one',stage:'GAME_VERIFIED',updatedAt:'2026-09-09T00:00:00Z'},
      {type:'VIBE2',patternId:'experiment-only',stage:'EXPERIMENTING',updatedAt:'2026-09-09T01:00:00Z'},
      {type:'QA',patternId:'other-domain',stage:'COMPANY_STANDARD',updatedAt:'2026-09-09T02:00:00Z'},
    ],
    antiPatterns:[{type:'VIBE2',patternId:'repeat-failure',reason:'REPEATED_VERIFIED_FAILURE',failureEvidence:2}],
  });
  assert.deepEqual(learning.patterns.map(x=>x.patternId),['verified-one']);
  assert.deepEqual(learning.antiPatterns.map(x=>x.patternId),['repeat-failure']);
  assert.equal(learning.verifiedOnly,true);
});

test('autonomous development routes through existing Vibe company bridge before department review',()=>{
  const order={
    run:true,gameId:'TEST',gameSlug:'test-game',gameName:'테스트',sourcePath:'web-games/test-game',projectStage:'development',goal:'UI 피드백을 작은 범위로 개선',responsibilityFiles:['web-games/test-game/index.html'],protectedValues:['save keys','core loop'],
  };
  const book={id:'test-artbook',gameId:'test-game',status:'COMPLETED',cuts:Array.from({length:16},(_,i)=>({i})),postprocess:{complete:true},lifecycle:{state:'DESIGN_BASELINE'}};
  const core=buildVibeCoreContext({order,book,companyDna:{version:1,items:[],antiPatterns:[]}});
  assert.equal(core.engine,'VIBE2_COMPANY_CORE');
  assert.equal(core.source,'assets/vibe-company-orchestration-bridge.js');
  assert.equal(core.initialMaturity,'EARLY_COLLABORATIVE');
  assert.equal(core.departmentReviewRequired,true);
  assert.equal(core.maySelfApprove,false);
  assert.equal(core.verifiedLearningOnly,true);
  assert.equal(core.routing.completedArtbookLocked,true);
  assert.ok(Array.isArray(core.executionQa));
});