import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildExecutionCheckpoint,
  classifyImplementationImpact,
  compileDevelopmentPolicy,
  evaluateAndroidInstallGate,
  failureFingerprint,
  findVerifiedFailureResolution,
  loadLatestVerifiedCheckpoint,
  packAdaptiveContext,
  rankAdaptiveContextCandidates,
} from '../tools/vibe2-development-intelligence.mjs';

test('failure fingerprint is stable for equivalent evidence and changes with the symptom',()=>{
  const a=failureFingerprint({type:'NULL',message:' Button   missing ',stack:'at x 0xABC',test:'smoke',platform:'Android 16',file:'ui/Hud.cs'});
  const b=failureFingerprint({type:'null',message:'button missing',stack:'at x 0xDEF',test:'SMOKE',platform:'android 16',file:'ui/Hud.cs'});
  assert.equal(a.id,b.id);
  assert.notEqual(a.id,failureFingerprint({type:'NULL',message:'different symptom',test:'smoke',platform:'Android 16',file:'ui/Hud.cs'}).id);
});

test('adaptive context ranks exact diagnostics and responsibility before generic files and respects the byte budget',()=>{
  const files=[
    {path:'misc.js',content:'x'.repeat(30000)},
    {path:'ui/hud.css',content:'safe-area target '+ 'y'.repeat(30000)},
    {path:'qa/hud.test.js',content:'test'},
    {path:'game.js',content:'runtime'},
  ];
  const ranked=rankAdaptiveContextCandidates({files,diagnostic:{file:'ui/hud.css',needle:'safe-area',relatedFiles:['qa/hud.test.js']},responsibilityFiles:['game.js'],role:'graphics'});
  assert.equal(ranked[0].path,'ui/hud.css');
  const packed=packAdaptiveContext({files,diagnostic:{file:'ui/hud.css',needle:'safe-area'},responsibilityFiles:['game.js'],role:'graphics',limits:{maxFiles:2,maxBytes:1200,maxFileBytes:900}});
  assert.ok(packed.bytes<=1200);
  assert.ok(packed.files.length<=2);
  assert.equal(packed.files[0].path,'ui/hud.css');
});

test('compiled policy gives owner intent precedence but immutable safety still cannot be overridden',()=>{
  const policy=compileDevelopmentPolicy({
    verifiedLearning:{quality:'old'},projectPolicy:{quality:'project'},agentsPolicy:{quality:'agents'},activeIntent:{quality:'owner',directMainWrite:true,paidApi:true},role:'graphics'
  });
  assert.equal(policy.effective.quality,'owner');
  assert.equal(policy.effective.directMainWrite,false);
  assert.equal(policy.effective.paidApi,false);
  assert.equal(policy.effective.graphicsGameplayAuthority,false);
});

test('implementation impact gives no gameplay credit to metadata only but recognizes visual and gameplay code',()=>{
  assert.equal(classifyImplementationImpact({changedFiles:['company-status.json','.github/workflows/x.yml']}).status,'NO_GAME_CHANGE');
  const visual=classifyImplementationImpact({changedFiles:['web-games/a/style.css'],role:'graphics'});
  assert.equal(visual.status,'VISUAL_IMPLEMENTATION');
  assert.equal(visual.implementationCredit,true);
  assert.equal(classifyImplementationImpact({changedFiles:['unity-games/a/Assets/Scripts/GameCore.cs']}).status,'GAMEPLAY_IMPLEMENTATION');
});

test('buildup recognizes actual Roblox Luau as game implementation and prioritizes native client visuals',()=>{
  const server='roblox-games/simple-rpg/server/Game.server.luau';
  const client='roblox-games/simple-rpg/client/Game.client.luau';
  const evidence='roblox-games/simple-rpg/roblox-source-bootstrap.json';
  const changed=classifyImplementationImpact({changedFiles:[server],role:'development'});
  assert.equal(changed.status,'GAMEPLAY_IMPLEMENTATION');
  assert.equal(changed.implementationCredit,true);
  assert.deepEqual(changed.gameplayFiles,[server]);
  assert.equal(classifyImplementationImpact({changedFiles:[server,evidence],role:'integration'}).status,'GAMEPLAY_IMPLEMENTATION');
  const context=rankAdaptiveContextCandidates({
    role:'graphics',files:[
      {path:server,content:'combat authority'},
      {path:client,content:'native camera and animation'},
      {path:'roblox-games/simple-rpg/shared/ProgressionData.luau',content:'data'}
    ]
  });
  assert.equal(context[0].path,client);
  assert.equal(classifyImplementationImpact({changedFiles:['company-learning/report.json'],role:'graphics'}).status,'NO_GAME_CHANGE');
});

test('verified evidence memory reuses matching failure and latest checkpoint only from the verified evidence root',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-evidence-'));
  try{
    const fp=failureFingerprint({type:'ASSET_LOAD',message:'missing sprite',platform:'android'});
    const oldCheckpoint=buildExecutionCheckpoint({gameId:'P1',role:'graphics',candidateId:'old',status:'VERIFIED',nextAction:'old',sourceCommit:'a'});
    const newCheckpoint={...buildExecutionCheckpoint({gameId:'P1',role:'graphics',candidateId:'new',status:'VERIFIED',nextAction:'continue',sourceCommit:'b'}),updatedAt:'2099-01-01T00:00:00.000Z'};
    fs.writeFileSync(path.join(root,'a.json'),JSON.stringify({gameId:'P1',candidateId:'old',verified:true,outcome:'SUCCESS',independentQa:'PASS',generatedAt:'2026-01-01',changedFiles:['a.css'],summary:'old',vibe2DevelopmentIntelligence:{failureFingerprint:fp,checkpoint:oldCheckpoint}}));
    fs.writeFileSync(path.join(root,'b.json'),JSON.stringify({gameId:'P1',candidateId:'new',verified:true,outcome:'SUCCESS',independentQa:'PASS',generatedAt:'2099-01-01',changedFiles:['b.css'],summary:'fixed',expectedEffect:'visible',vibe2DevelopmentIntelligence:{failureFingerprint:fp,checkpoint:newCheckpoint}}));
    fs.writeFileSync(path.join(root,'other.json'),JSON.stringify({gameId:'P2',candidateId:'other',verified:true,outcome:'SUCCESS',independentQa:'PASS',generatedAt:'2100-01-01',changedFiles:['wrong.css'],vibe2DevelopmentIntelligence:{failureFingerprint:fp,checkpoint:{...newCheckpoint,gameId:'P2'}}}));
    assert.equal(findVerifiedFailureResolution({root,gameId:'P1',fingerprint:fp}).candidateId,'new');
    assert.equal(loadLatestVerifiedCheckpoint({root,gameId:'P1',role:'graphics'}).candidateId,'new');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('execution checkpoint preserves resume-critical state',()=>{
  const checkpoint=buildExecutionCheckpoint({gameId:'P1',role:'development',sourceCommit:'abc',candidateId:'c1',goal:'fix one issue',completed:['patched'],changedFiles:['game.js'],nextAction:'run QA',pendingCi:['Vibe QA'],acceptanceCriteria:['no crash']});
  assert.equal(checkpoint.status,'IMPLEMENTED_PENDING_QA');
  assert.equal(checkpoint.sourceCommit,'abc');
  assert.deepEqual(checkpoint.changedFiles,['game.js']);
  assert.deepEqual(checkpoint.pendingCi,['Vibe QA']);
});

test('Android install evidence requires metadata, compatible SDK/ABI, fresh install, runtime and update install',()=>{
  const good=evaluateAndroidInstallGate({package:'com.jaewoon.game',certSha256:'AA',versionCode:12,minSdk:23,deviceApi:36,nativeAbis:['arm64-v8a','x86_64'],deviceAbis:['x86_64'],freshInstallPassed:true,runtimeSmokePassed:true,updateInstallPassed:true});
  assert.equal(good.pass,true);
  const bad=evaluateAndroidInstallGate({package:'com.jaewoon.game',versionCode:12,minSdk:37,deviceApi:36,nativeAbis:['arm64-v8a'],deviceAbis:['x86_64'],freshInstallPassed:true,runtimeSmokePassed:true,updateInstallPassed:true});
  assert.equal(bad.pass,false);
  assert.ok(bad.failed.includes('signingCertificate'));
  assert.ok(bad.failed.includes('sdkCompatible'));
  assert.ok(bad.failed.includes('abiCompatible'));
});

test('deep diagnostic anchors remain visible within strict UTF-8 context budgets',()=>{
  const needle='SAVE_FAILURE_ROOT';
  const source='한글 문맥 '.repeat(4000)+'\\nfunction loadGame(){ const SAVE_FAILURE_ROOT=true; }\\n'+'후속 로직 '.repeat(2000);
  const packed=packAdaptiveContext({
    files:[{path:'game.js',content:source}],
    diagnostic:{file:'game.js',needle},
    limits:{maxFiles:1,maxBytes:240,maxFileBytes:240}
  });
  assert.equal(packed.files.length,1);
  assert.equal(packed.files[0].content.includes(needle),true);
  assert.equal(packed.files[0].content.includes('�'),false);
  assert.equal(packed.files[0].truncated,true);
  assert.ok(packed.bytes<=240);
  const fallback=packAdaptiveContext({files:[{path:'game.js',content:source}],diagnostic:{needle:'NONEXISTENT'},limits:{maxFiles:1,maxBytes:240,maxFileBytes:240}});
  assert.equal(fallback.files[0].content.startsWith('한글 문맥'),true);
});

test('complete source diagnostic match boosts ranking without storing full source as context',()=>{
  const files=[
    {path:'a.js',baseScore:13,content:'function update(){}'},
    {path:'z.js',baseScore:13,content:'function update(){}',diagnosticMatch:true}
  ];
  const ranked=rankAdaptiveContextCandidates({files,diagnostic:{needle:'DEEP_FAULT'},role:'development'});
  assert.equal(ranked[0].path,'z.js');
});

test('coding memory rejects unverified, failed and pending checkpoint records',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-memory-gate-'));
  try{
    const fp=failureFingerprint({type:'SAVE_FAILURE',message:'restore failed',platform:'web'});
    const good=buildExecutionCheckpoint({gameId:'G1',role:'integration',candidateId:'good',status:'VERIFIED'});
    const make=(id,overrides={})=>({gameId:'G1',candidateId:id,generatedAt:'2099-01-01',
      verified:true,outcome:'SUCCESS',independentQa:'PASS',
      vibe2DevelopmentIntelligence:{failureFingerprint:fp,checkpoint:good},...overrides});
    const records=[
      make('good',{generatedAt:'2026-01-01'}),
      make('pending',{verified:false}),
      make('unproven',{independentQa:undefined}),
      make('qa-failed',{independentQa:'FAIL'}),
      make('wrong-outcome',{outcome:'FAILURE'}),
      make('pending-checkpoint',{generatedAt:'2025-01-01',
        vibe2DevelopmentIntelligence:{failureFingerprint:fp,checkpoint:{...good,status:'IMPLEMENTED_PENDING_QA',updatedAt:'2999-01-01T00:00:00.000Z'}}})
    ];
    for(const row of records)fs.writeFileSync(path.join(root,row.candidateId+'.json'),JSON.stringify(row));
    assert.equal(findVerifiedFailureResolution({root,gameId:'G1',fingerprint:fp})?.candidateId,'good');
    assert.equal(loadLatestVerifiedCheckpoint({root,gameId:'G1',role:'integration'})?.candidateId,'good');
    assert.equal(findVerifiedFailureResolution({root,gameId:'G1',fingerprint:''}),null);
    assert.equal(findVerifiedFailureResolution({root,gameId:'',fingerprint:fp}),null);
    assert.equal(loadLatestVerifiedCheckpoint({root,gameId:''}),null);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
