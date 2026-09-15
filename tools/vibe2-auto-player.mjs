// 파일명: tools/vibe2-auto-player.mjs
// 역할: 하나의 진입점에서 Web / Roblox / Unity / UEFN / Unreal AUTO PLAYER 어댑터를 선택한다.

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { runWebAutoPlayer } from './vibe2-web-auto-player.mjs';
import { runRobloxAutoPlayer } from './vibe2-roblox-auto-player.mjs';
import { runUnityAutoPlayer } from './vibe2-unity-auto-player.mjs';
import { runUefnAutoPlayer } from './vibe2-uefn-auto-player.mjs';
import { runUnrealAutoPlayer } from './vibe2-unreal-auto-player.mjs';

const clean=v=>String(v??'').trim();
function argsOf(argv=process.argv.slice(2)){const o={};for(const raw of argv){if(!raw.startsWith('--'))continue;const b=raw.slice(2),i=b.indexOf('=');i<0?o[b]=true:o[b.slice(0,i)]=b.slice(i+1);}return o;}
function readScenario(file){if(!clean(file)||!fs.existsSync(file))throw new Error(`AUTO PLAYER scenario 없음: ${file}`);return JSON.parse(fs.readFileSync(file,'utf8'));}

export async function runVibe2AutoPlayer({scenarioFile='',root='',url='',outputFile='',manifestFile='',chromePath='',command='',commandArgs=[],cwd=process.cwd()}={}){
  const scenario=readScenario(scenarioFile);
  const engine=clean(scenario.engine).toLowerCase();
  if(engine==='web')return runWebAutoPlayer({root,url,scenarioFile,scenario,outputFile,manifestFile,chromePath});
  if(engine==='roblox')return runRobloxAutoPlayer({scenarioFile,command,commandArgs,cwd,outputFile,manifestFile});
  if(engine==='unity')return runUnityAutoPlayer({scenarioFile,command,commandArgs,cwd,outputFile,manifestFile});
  if(engine==='uefn')return runUefnAutoPlayer({scenarioFile,command,commandArgs,cwd,outputFile,manifestFile});
  if(engine==='unreal')return runUnrealAutoPlayer({scenarioFile,command,commandArgs,cwd,outputFile,manifestFile});
  throw new Error(`AUTO PLAYER adapter not connected: ${engine}`);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const a=argsOf();const commandArgs=clean(a['args-json'])?JSON.parse(a['args-json']):[];const result=await runVibe2AutoPlayer({scenarioFile:clean(a.scenario),root:clean(a.root),url:clean(a.url),outputFile:clean(a.output),manifestFile:clean(a.manifest),chromePath:clean(a.chrome),command:clean(a.command),commandArgs,cwd:clean(a.cwd)||process.cwd()});console.log(`VIBE2_AUTO_PLAYER_ENGINE=${result.engine}`);console.log(`VIBE2_AUTO_PLAYER_VERIFIED=${result.verified?'YES':'NO'}`);console.log(`VIBE2_AUTO_PLAYER_RUN_ID=${result.runId}`);if(!result.verified)process.exitCode=1;}
