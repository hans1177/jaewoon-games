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

test('verified evidence memory reuses matching failure and latest checkpoint only from the verified evidence root',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-evidence-'));
  try{
    const fp=failureFingerprint({type:'ASSET_LOAD',message:'missing sprite',platform:'android'});
    const oldCheckpoint=buildExecutionCheckpoint({gameId:'P1',role:'graphics',candidateId:'old',status:'VERIFIED',nextAction:'old',sourceCommit:'a'});
    const newCheckpoint={...buildExecutionCheckpoint({gameId:'P1',role:'graphics',candidateId:'new',status:'VERIFIED',nextAction:'continue',sourceCommit:'b'}),updatedAt:'2099-01-01T00:00:00.000Z'};
    fs.writeFileSync(path.join(root,'a.json'),JSON.stringify({gameId:'P1',candidateId:'old',generatedAt:'2026-01-01',changedFiles:['a.css'],summary:'old',vibe2DevelopmentIntelligence:{failureFingerprint:fp,checkpoint:oldCheckpoint}}));
    fs.writeFileSync(path.join(root,'b.json'),JSON.stringify({gameId:'P1',candidateId:'new',generatedAt:'2099-01-01',changedFiles:['b.css'],summary:'fixed',expectedEffect:'visible',vibe2DevelopmentIntelligence:{failureFingerprint:fp,checkpoint:newCheckpoint}}));
    fs.writeFileSync(path.join(root,'other.json'),JSON.stringify({gameId:'P2',candidateId:'other',generatedAt:'2100-01-01',changedFiles:['wrong.css'],vibe2DevelopmentIntelligence:{failureFingerprint:fp,checkpoint:{...newCheckpoint,gameId:'P2'}}}));
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
