// 파일명: qa/autonomous-development-worker.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  assertRelativeOutputPath,
  browserFailureFeedback,
  buildPrompt,
  buildRetryAttempt,
  classifyGenerationFailure,
  extractStorageKeys,
  generateAutonomousCandidate,
  modelAttemptBudget,
  modelAttemptTimeout,
  MODEL_CONTEXT_TOKENS,
  MODEL_MAX_PREDICT,
  MODEL_RETRY_MAX_PREDICT,
  MODEL_RETRY_TIMEOUT_MS,
  MODEL_TIMEOUT_MS,
  normalizeModelCandidateShape,
  parseModelCandidate,
  readContext,
  selectRetryResponsibilityFile,
  validateCandidateAgainstSource,
} from '../tools/autonomous-development-worker.mjs';
import { buildVibeCoreContext, selectVerifiedVibeLearning } from '../tools/autonomous-department-cycle.mjs';

const fixture='web-games/__autonomous-worker-test__';
const candidateRoot='web-games/.autonomous-candidates/TEST';
const evidenceRoot='.autonomous/evidence';
const browserFailureFile='.autonomous/browser-failures/TEST.json';
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
  fs.rmSync(browserFailureFile,{force:true});
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

test('no-change retry is classified separately and narrowed to one concrete responsibility file',()=>{
  const context={files:[
    {path:'index.html',content:'<iframe src="game.html"></iframe>',preferred:true,focused:false,truncated:false,originalBytes:35},
    {path:'game.html',content:'<script>function update(){requestAnimationFrame(update)}</script>',preferred:true,focused:false,truncated:false,originalBytes:4200},
  ]};
  const error=new Error('후보는 files 또는 edits 중 명확한 변경 하나가 필요함');
  const failureType=classifyGenerationFailure(error);
  assert.equal(failureType,'NO_CHANGE');
  assert.equal(selectRetryResponsibilityFile({context,responsibilityFiles:['index.html','game.html']}),'game.html');
  const retry=buildRetryAttempt({context,responsibilityFiles:['index.html','game.html'],failureType});
  assert.equal(retry.strict,true);
  assert.equal(retry.target,'game.html');
  assert.deepEqual(retry.responsibilityFiles,['game.html']);
  assert.deepEqual(retry.context.files.map(file=>file.path),['game.html']);
  const prompt=buildPrompt({gameId:'TEST',sourcePath:'web-games/test',goal:'최소 플레이 루프 수정',context:retry.context,responsibilityFiles:retry.responsibilityFiles,role:'development',attempt:2,failureReason:`${failureType}: ${error.message}`});
  assert.match(prompt,/재시도 강제계약/);
  assert.match(prompt,/game\.html 1개만 수정/);
  assert.match(prompt,/해당 배열을 비우지 않는다/);
  assert.match(prompt,/실제 변경을 생략하는 응답은 금지/);
  assert.doesNotMatch(prompt,/책임 파일: index\.html/);
});

test('no-change retry prefers an exact diagnostic responsibility file over file size',()=>{
  const context={files:[
    {path:'index.html',content:'BROKEN_TARGET',preferred:true,focused:true,truncated:false,originalBytes:20},
    {path:'game.html',content:'x'.repeat(1000),preferred:true,focused:false,truncated:false,originalBytes:1000},
  ]};
  const retry=buildRetryAttempt({context,responsibilityFiles:['index.html','game.html'],diagnostic:{file:'index.html',needle:'BROKEN_TARGET'},failureType:'OUTPUT_FORMAT'});
  assert.equal(retry.target,'index.html');
  assert.deepEqual(retry.responsibilityFiles,['index.html']);
  assert.deepEqual(retry.context.files.map(file=>file.path),['index.html']);
});

test('model-runtime retry narrows context and contract to one responsibility file',()=>{
  const context={files:[
    {path:'index.html',content:'<iframe src="game.html"></iframe>',preferred:true,focused:false,truncated:false,originalBytes:35},
    {path:'game.html',content:'x'.repeat(4200),preferred:true,focused:false,truncated:false,originalBytes:4200},
  ]};
  const failureType=classifyGenerationFailure(new Error('Ollama 생성 제한시간 초과: 300000ms'));
  assert.equal(failureType,'MODEL_RUNTIME');
  const retry=buildRetryAttempt({context,responsibilityFiles:['index.html','game.html'],failureType});
  assert.equal(retry.strict,true);
  assert.equal(retry.target,'game.html');
  assert.deepEqual(retry.responsibilityFiles,['game.html']);
  assert.deepEqual(retry.context.files.map(file=>file.path),['game.html']);
  const prompt=buildPrompt({gameId:'TEST',sourcePath:'web-games/test',goal:'작은 기능 수정',context:retry.context,responsibilityFiles:retry.responsibilityFiles,role:'development',attempt:2,failureReason:`${failureType}: Ollama 생성 제한시간 초과`});
  assert.match(prompt,/재시도 강제계약/);
  assert.match(prompt,/game\.html 1개만 수정/);
  assert.doesNotMatch(prompt,/책임 파일: index\.html/);
  assert.equal(modelAttemptBudget({attempt:1,failureType:''}),MODEL_MAX_PREDICT);
  assert.equal(modelAttemptTimeout({attempt:1,failureType:''}),MODEL_TIMEOUT_MS);
  assert.equal(modelAttemptBudget({attempt:2,failureType}),MODEL_RETRY_MAX_PREDICT);
  assert.equal(modelAttemptTimeout({attempt:2,failureType}),MODEL_RETRY_TIMEOUT_MS);
  assert.ok(MODEL_RETRY_MAX_PREDICT<MODEL_MAX_PREDICT);
  assert.ok(MODEL_RETRY_TIMEOUT_MS<MODEL_TIMEOUT_MS);
  assert.equal(modelAttemptBudget({attempt:2,failureType:'OUTPUT_FORMAT'}),MODEL_RETRY_MAX_PREDICT);
  assert.equal(modelAttemptTimeout({attempt:2,failureType:'OUTPUT_FORMAT'}),MODEL_RETRY_TIMEOUT_MS);
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
    const evidence=await generateAutonomousCandidate({gameId:'TEST',sourcePath:fixture,goal:'피드백 개선',candidateId:'TEST-good-development',candidatePath:`${candidateRoot}/TEST-good-development`,evidencePath:`${evidenceRoot}/TEST-good-development.json`,modelResponse:response,sourceCommit:'abc',diagnostic:{type:'CONSOLE',file:'app.js',line:3,needle:"console.log('base')"}});
    assert.equal(evidence.candidateOnly,true);
    assert.equal(evidence.selfPromote,false);
    assert.equal(evidence.publicStableModified,false);
    assert.equal(evidence.sourceCommit,'abc');
    assert.equal(evidence.role,'development');
    assert.equal(evidence.diagnosticFocus.line,3);
    assert.equal(fs.readFileSync(path.join(fixture,'app.js'),'utf8'),original);
    assert.match(fs.readFileSync(path.join(candidateRoot,'TEST-good-development','app.js'),'utf8'),/candidate/);
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

test('large source context is bounded and exact diagnostic area is focused instead of flooding the model',()=>{
  setup();
  try{
    const marker='TARGET_BROKEN_RESOURCE';
    fs.writeFileSync(path.join(fixture,'index.html'),`<html>${'x'.repeat(300000)}${marker}${'y'.repeat(300000)}</html>`);
    const context=readContext(fixture,{preferredFiles:['index.html'],diagnostic:{file:'index.html',needle:marker,line:1}});
    const index=context.files.find(x=>x.path==='index.html');
    assert.ok(index);
    assert.equal(index.focused,true);
    assert.ok(index.content.includes(marker));
    assert.ok(context.bytes<=48000);
  }finally{cleanup();}
});

test('prompt includes role, exact diagnostic evidence and stronger bounded generation contract',()=>{
  const prompt=buildPrompt({gameId:'TEST',sourcePath:'web-games/test',goal:'버튼 오류 수정',context:{files:[{path:'app.js',content:'broken()',preferred:true,focused:true,truncated:false,originalBytes:8}]},responsibilityFiles:['app.js'],diagnostic:{type:'DOM_NULL_EVENT_BIND',file:'app.js',line:10,needle:'broken()',message:'버튼 오류'},role:'qa',attempt:2,failureReason:'OUTPUT_FORMAT'});
  assert.match(prompt,/부서 역할: qa/);
  assert.match(prompt,/"line": 10/);
  assert.match(prompt,/broken\(\)/);
  assert.match(prompt,/직전 실패: OUTPUT_FORMAT/);
  assert.ok(MODEL_MAX_PREDICT>=2048);
  assert.ok(MODEL_CONTEXT_TOKENS>=8192);
});

test('persisted browser failure evidence is read and injected into the next worker prompt',()=>{
  fs.mkdirSync(path.dirname(browserFailureFile),{recursive:true});
  fs.writeFileSync(browserFailureFile,JSON.stringify({pass:false,errors:['console:Failed to load resource'],consoleErrors:['boom'],metrics:{viewportWidth:390,width:390,height:844,visibleInteractive:2},screenshot:'qa/failure.png'}));
  try{
    const feedback=browserFailureFeedback('TEST');
    assert.match(feedback,/Failed to load resource/);
    assert.match(feedback,/screenshot=qa\/failure.png/);
    const prompt=buildPrompt({gameId:'TEST',sourcePath:'web-games/test',goal:'리소스 오류 수정',context:{files:[{path:'index.html',content:'<img src="bad.png">',preferred:true,focused:true,truncated:false,originalBytes:19}]},responsibilityFiles:['index.html'],role:'development',browserFeedback:feedback});
    assert.match(prompt,/직전 브라우저 실패 근거/);
    assert.match(prompt,/Failed to load resource/);
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
