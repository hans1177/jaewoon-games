// 파일명: qa/vibe2-auto-player.test.mjs
// 역할: 공통 AUTO PLAYER 계약, 실제 Web 브라우저 입력, Roblox/Unity 엔진 어댑터 증거 게이트를 검증한다.

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

const here=path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot=path.join(here,'fixtures','vibe2-auto-player-web');
const fakeEngine=path.join(here,'fixtures','vibe2-fake-engine-runtime.mjs');
function temp(){return fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-auto-player-test-'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2),'utf8');}

const baseScenario=engine=>({version:1,engine,actions:[{id:'move',type:'key',key:'W'},{id:'state',type:'expect',name:'state changed',expression:'true'}]});

test('common AUTO PLAYER result refuses file-only or checkpoint-only evidence',()=>{
  const noInput=createAutoPlayerResult({engine:'web',runId:'x',actions:[],checkpoints:[{id:'c',required:true,pass:true}],errors:[]});
  assert.equal(noInput.verified,false);
  const noCheckpoint=createAutoPlayerResult({engine:'web',runId:'x',actions:[{id:'a',type:'key',dispatched:true}],checkpoints:[],errors:[]});
  assert.equal(noCheckpoint.verified,false);
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

test('engine runtime harnesses explicitly use Roblox VirtualInput and Unity InputSystem state events',()=>{
  const roblox=fs.readFileSync(path.join(here,'..','tools','runtime','roblox','Vibe2AutoPlayer.luau'),'utf8');
  const unity=fs.readFileSync(path.join(here,'..','tools','runtime','unity','Vibe2AutoPlayerRuntime.cs'),'utf8');
  assert.match(roblox,/StudioTestService/);
  assert.match(roblox,/CreateVirtualInput\(\)/);
  assert.match(roblox,/SendKey\(/);
  assert.match(roblox,/SendMouseButton\(/);
  assert.match(unity,/Application\.isPlaying/);
  assert.match(unity,/InputSystem\.QueueStateEvent/);
  assert.match(unity,/realInputDriver/);
});
