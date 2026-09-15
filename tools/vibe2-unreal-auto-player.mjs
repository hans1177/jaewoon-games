// 파일명: tools/vibe2-unreal-auto-player.mjs
// 역할: Unreal Automation Driver/Automation Framework 런타임 증거를 공통 Vibe2 PLAY LOG/TELEMETRY로 변환한다.

import { pathToFileURL } from 'node:url';
import { runExternalEngineAutoPlayer, parseCommandArgs } from './vibe2-engine-auto-player.mjs';

const clean=v=>String(v??'').trim();
function argsOf(argv=process.argv.slice(2)){const o={};for(const raw of argv){if(!raw.startsWith('--'))continue;const b=raw.slice(2),i=b.indexOf('=');i<0?o[b]=true:o[b.slice(0,i)]=b.slice(i+1);}return o;}

export function runUnrealAutoPlayer(options={}){
  return runExternalEngineAutoPlayer({
    ...options,
    engine:'unreal',
    authority:'vibe2-unreal-automation-driver-runtime',
    requiredCapabilities:['automationDriver','automationFramework','platformInput','worldObservation'],
    timeoutMs:Math.max(15000,Number(options.timeoutMs||240000))
  });
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const a=argsOf();
  const result=await runUnrealAutoPlayer({scenarioFile:clean(a.scenario),command:clean(a.command),commandArgs:parseCommandArgs(a['args-json']),cwd:clean(a.cwd)||process.cwd(),outputFile:clean(a.output),manifestFile:clean(a.manifest),timeoutMs:Number(a.timeout||240000)});
  console.log(`VIBE2_UNREAL_AUTO_PLAYER_VERIFIED=${result.verified?'YES':'NO'}`);
  console.log(`VIBE2_UNREAL_AUTO_PLAYER_RUN_ID=${result.runId}`);
  if(!result.verified)process.exitCode=1;
}
