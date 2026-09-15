// 파일명: tools/vibe2-roblox-auto-player.mjs
// 역할: Roblox StudioTestService + VirtualInput 런타임을 Vibe2 공통 AUTO PLAYER 증거로 연결한다.

import { pathToFileURL } from 'node:url';
import { runExternalEngineAutoPlayer, parseCommandArgs } from './vibe2-engine-auto-player.mjs';

const clean=v=>String(v??'').trim();
function argsOf(argv=process.argv.slice(2)){const o={};for(const raw of argv){if(!raw.startsWith('--'))continue;const b=raw.slice(2),i=b.indexOf('=');i<0?o[b]=true:o[b.slice(0,i)]=b.slice(i+1);}return o;}

export async function runRobloxAutoPlayer({scenarioFile='',command='',commandArgs=[],cwd=process.cwd(),outputFile='',manifestFile='',timeoutMs=180000}={}){
  return runExternalEngineAutoPlayer({
    engine:'roblox',scenarioFile,command:clean(command)||clean(process.env.VIBE2_ROBLOX_AUTO_PLAYER_COMMAND),commandArgs:commandArgs.length?commandArgs:parseCommandArgs(process.env.VIBE2_ROBLOX_AUTO_PLAYER_ARGS||'[]'),cwd,outputFile,manifestFile,timeoutMs,
    authority:'vibe2-roblox-studio-runtime',requiredCapabilities:['studioTestService','virtualInput']
  });
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const a=argsOf();const result=await runRobloxAutoPlayer({scenarioFile:clean(a.scenario),command:clean(a.command),commandArgs:parseCommandArgs(clean(a['args-json'])||'[]'),cwd:clean(a.cwd)||process.cwd(),outputFile:clean(a.output),manifestFile:clean(a.manifest),timeoutMs:Number(a.timeout)||180000});console.log(`VIBE2_AUTO_PLAYER_ENGINE=${result.engine}`);console.log(`VIBE2_AUTO_PLAYER_VERIFIED=${result.verified?'YES':'NO'}`);console.log(`VIBE2_AUTO_PLAYER_INPUTS=${result.telemetry.metrics.inputActionCount}`);console.log(`VIBE2_AUTO_PLAYER_CHECKPOINTS=${result.telemetry.metrics.checkpointPassCount}/${result.telemetry.metrics.checkpointCount}`);if(!result.verified)process.exitCode=1;}
