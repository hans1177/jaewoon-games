// 파일명: qa/vibe2-auto-player.test.mjs
// 역할: 공통 AUTO PLAYER 계약, 실제 Web 브라우저 입력, Roblox/Unity/UEFN/Unreal 엔진 어댑터 증거 게이트를 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAutoPlayerResult, applyAutoPlayerEvidenceToManifest } from '../tools/vibe2-auto-player-contract.mjs';
import { findChromeBinary, runWebAutoPlayer } from '../tools/vibe2-web-auto-player.mjs';
import { runRobloxAutoPlayer } from '../tools/vibe2-roblox-auto-player.mjs';
import { runUnityAutoPlayer } from '../tools/vibe2-unity-auto-player.mjs';
import { runUefnAutoPlayer } from '../tools/vibe2-uefn-auto-player.mjs';
import { runUnrealAutoPlayer } from '../tools/vibe2-unreal-auto-player.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot=path.join(here,'fixtures','vibe2-auto-player-web');
const fakeEngine=path.join(here,'fixtures','vibe2-fake-engine-runtime.mjs');
function temp(){return fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-auto-player-test-'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2),'utf8');}

const baseScenario=engine=>({version:1,engine,actions:[{id:'move',type:'key',key:'W'},{id:'state',type:'expect',name:'state changed',expression:engine==='unreal'?'player-moved':'true'}]});

test('common AUTO PLAYER result refuses file-only or checkpoint-only evidence',()=>{
  const noInput=createAutoPlayerResult({engine:'web',runId:'x',actions:[],checkpoints:[{id:'c',required:true,pass:true}],errors:[]});
  assert.equal(noInput.verified,false);
  const noCheckpoint=createAutoPlayerResult({engine:'web',runId:'x',actions:[{id:'a',type:'key',dispatched:true}],checkpoints:[],errors:[]});
  assert.equal(noCheckpoint.verified,false);
});

test('caller metrics cannot spoof authoritative input, checkpoint or runtime error counts',()=>{
  const result=createAutoPlayerResult({
    engine:'web',runId:'anti-spoof',
    actions:[{id:'real',type:'key',dispatched:true}],
    checkpoints:[{id:'checkpoint',required:true,pass:true}],
    errors:[{type:'runtime-error',message:'boom'}],
    metrics:{inputActionCount:999,actionCount:999,checkpointCount:999,checkpointPassCount:999,runtimeErrorCount:0,consoleErrorCount:7,durationMs:12}
  });
  assert.equal(result.verified,false);
  assert.equal(result.telemetry.metrics.inputActionCount,1);
  assert.equal(result.telemetry.metrics.actionCount,1);
  assert.equal(result.telemetry.metrics.checkpointCount,1);
  assert.equal(result.telemetry.metrics.checkpointPassCount,1);
  assert.equal(result.telemetry.metrics.runtimeErrorCount,1);
  assert.equal(result.telemetry.metrics.consoleErrorCount,7);
});

test('verified AUTO PLAYER evidence updates candidate manifest without expanding authority',()=>{
  const cwd=temp(),manifest=path.join(cwd,'manifest.json');
  writeJson(manifest,{version:5,designEvidence:{autoPlayer:{status:'WAITING_EVIDENCE',verified:false},telemetry:{status:'WAITING_EVIDENCE',verified:false}},authorityExpanded:false});
  const result=createAutoPlayerResult({engine:'web',runId:'run-1',actions:[{id:'a',type:'key',dispatched:true}],checkpoints:[{id:'c',required:true,pass:true}],errors:[],artifactPath:'evidence.json'});
  assert.equal(result.verified,true);
  const updated=applyAutoPlayerEvidenceToManifest(manifest,result,{artifactPath:'evidence.json'});
  assert.equal(updated.designEvidence.autoPlayer.verified,true);
  assert.equal(updated.designEvidence.telemetry.verified,true);
  assert.equal(updated.autoPlayerRuntime.inputActionCount,1);
  assert.equal(updated.authorityExpanded,false);
});

test('Web AUTO PLAYER sends real Chrome input and observes game-state progression', {timeout:30000}, async t=>{
  const chrome=findChromeBinary();
  if(!chrome){t.skip('Chrome/Chromium unavailable on this machine');return;}
  const scenario={version:1,engine:'web',page:'index.html',requirePlayability:true,actions:[
    {id:'start',type:'click',selector:'#start'},
    {id:'started',type:'expect',expression:'window.game.started===true'},
    {id:'move',type:'key',key:'ArrowRight',holdMs:60},
    {id:'moved',type:'expect',expression:'window.game.x===1'},
    {id:'attack-1',type:'key',key:'Space',holdMs:40},
    {id:'attack-2',type:'key',key:'Space',holdMs:40},
    {id:'reward',type:'expect',expression:'window.game.enemyHp===0 && window.game.gold===10'},
    {id:'restart',type:'click',selector:'#restart'},
    {id:'restarted',type:'expect',expression:'window.game.restarts===1 && window.game.gold===0 && window.game.started===true'}
  ]};
  const result=await runWebAutoPlayer({root:fixtureRoot,scenario,chromePath:chrome});
  assert.equal(result.verified,true);
  assert.equal(result.playLog.realInputVerified,true);
  assert.equal(result.telemetry.metrics.inputActionCount,5);
  assert.equal(result.telemetry.metrics.checkpointPassCount,4);
  assert.equal(result.telemetry.metrics.runtimeErrorCount,0);
});

test('Roblox adapter requires signed StudioTestService + VirtualInput runtime evidence', async()=>{
  const cwd=temp(),scenarioFile=path.join(cwd,'scenario.json');writeJson(scenarioFile,baseScenario('roblox'));
  const result=await runRobloxAutoPlayer({scenarioFile,command:process.execPath,commandArgs:[fakeEngine],cwd});
  assert.equal(result.verified,true);
  assert.equal(result.runtime.authority,'vibe2-roblox-studio-runtime');
  assert.equal(result.runtime.capabilities.studioTestService,true);
  assert.equal(result.runtime.capabilities.virtualInput,true);
});

test('Unity adapter requires signed PlayMode + real input driver runtime evidence', async()=>{
  const cwd=temp(),scenarioFile=path.join(cwd,'scenario.json');writeJson(scenarioFile,baseScenario('unity'));
  const result=await runUnityAutoPlayer({scenarioFile,command:process.execPath,commandArgs:[fakeEngine],cwd});
  assert.equal(result.verified,true);
  assert.equal(result.runtime.authority,'vibe2-unity-playmode-runtime');
  assert.equal(result.runtime.capabilities.playMode,true);
  assert.equal(result.runtime.capabilities.realInputDriver,true);
});

test('UEFN adapter requires a signed live UEFN/Fortnite session evidence contract', async()=>{
  const cwd=temp(),scenarioFile=path.join(cwd,'scenario.json');writeJson(scenarioFile,baseScenario('uefn'));
  const result=await runUefnAutoPlayer({scenarioFile,command:process.execPath,commandArgs:[fakeEngine],cwd});
  assert.equal(result.verified,true);
  assert.equal(result.runtime.authority,'vibe2-uefn-fortnite-session-runtime');
  assert.equal(result.runtime.capabilities.uefnSession,true);
  assert.equal(result.runtime.capabilities.fortniteClient,true);
  assert.equal(result.runtime.capabilities.win32Input,true);
  assert.equal(result.runtime.capabilities.runtimeObservation,true);
});

test('Unreal adapter requires Automation Driver + Automation Framework runtime evidence', async()=>{
  const cwd=temp(),scenarioFile=path.join(cwd,'scenario.json');writeJson(scenarioFile,baseScenario('unreal'));
  const result=await runUnrealAutoPlayer({scenarioFile,command:process.execPath,commandArgs:[fakeEngine],cwd});
  assert.equal(result.verified,true);
  assert.equal(result.runtime.authority,'vibe2-unreal-automation-driver-runtime');
  assert.equal(result.runtime.capabilities.automationDriver,true);
  assert.equal(result.runtime.capabilities.automationFramework,true);
  assert.equal(result.runtime.capabilities.platformInput,true);
  assert.equal(result.runtime.capabilities.worldObservation,true);
});

test('engine runtime harnesses use their real platform input/testing primitives',()=>{
  const roblox=fs.readFileSync(path.join(here,'..','tools','runtime','roblox','Vibe2AutoPlayer.luau'),'utf8');
  const unity=fs.readFileSync(path.join(here,'..','tools','runtime','unity','Vibe2AutoPlayerRuntime.cs'),'utf8');
  const uefn=fs.readFileSync(path.join(here,'..','tools','runtime','uefn','Vibe2UefnAutoPlayer.ps1'),'utf8');
  const unreal=fs.readFileSync(path.join(here,'..','tools','runtime','unreal','Vibe2AutoPlayerRuntime.cpp'),'utf8');
  const unrealLaunch=fs.readFileSync(path.join(here,'..','tools','runtime','unreal','RunVibe2AutoPlayer.ps1'),'utf8');
  assert.match(roblox,/StudioTestService/);
  assert.match(roblox,/CreateVirtualInput\(\)/);
  assert.match(unity,/Application\.isPlaying/);
  assert.match(unity,/InputSystem\.QueueStateEvent/);
  assert.match(uefn,/FortniteClient/);
  assert.match(uefn,/System\.Windows\.Forms\.SendKeys/);
  assert.match(uefn,/VIBE2_CHECKPOINT\|/);
  assert.match(unreal,/IAutomationDriverModule/);
  assert.match(unreal,/CreateDriver\(\)/);
  assert.match(unreal,/\.Press\(/);
  assert.match(unreal,/\.Release\(/);
  assert.match(unreal,/player-moved/);
  assert.match(unrealLaunch,/UE\.EditorAutomation/);
  assert.match(unrealLaunch,/Vibe2\.AutoPlayer/);
  assert.match(unrealLaunch,/RunUnreal/);
});

test('common AUTO PLAYER router has all five engine routes',()=>{
  const router=fs.readFileSync(path.join(here,'..','tools','vibe2-auto-player.mjs'),'utf8');
  for(const engine of ['web','roblox','unity','uefn','unreal']) assert.match(router,new RegExp(`engine==='${engine}'`));
});
