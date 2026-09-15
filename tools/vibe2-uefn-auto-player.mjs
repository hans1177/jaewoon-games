// 파일명: tools/vibe2-uefn-auto-player.mjs
// 역할: 실제 UEFN + Fortnite 플레이테스트 세션에서 생성된 입력/관측 증거만 공통 Vibe2 증거로 승격한다.

import { pathToFileURL } from 'node:url';
import { runExternalEngineAutoPlayer, parseCommandArgs } from './vibe2-engine-auto-player.mjs';

const clean=v=>String(v??'').trim();
function argsOf(argv=process.argv.slice(2)){const o={};for(const raw of argv){if(!raw.startsWith('--'))continue;const b=raw.slice(2),i=b.indexOf('=');i<0?o[b]=true:o[b.slice(0,i)]=b.slice(i+1);}return o;}

export function runUefnAutoPlayer(options={}){
  return runExternalEngineAutoPlayer({
    ...options,
    engine:'uefn',
    authority:'vibe2-uefn-fortnite-session-runtime',
    requiredCapabilities:['uefnSession','fortniteClient','win32Input','runtimeObservation'],
    timeoutMs:Math.max(15000,Number(options.timeoutMs||180000))
  });
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const a=argsOf();
  const result=await runUefnAutoPlayer({scenarioFile:clean(a.scenario),command:clean(a.command),commandArgs:parseCommandArgs(a['args-json']),cwd:clean(a.cwd)||process.cwd(),outputFile:clean(a.output),manifestFile:clean(a.manifest),timeoutMs:Number(a.timeout||180000)});
  console.log(`VIBE2_UEFN_AUTO_PLAYER_VERIFIED=${result.verified?'YES':'NO'}`);
  console.log(`VIBE2_UEFN_AUTO_PLAYER_RUN_ID=${result.runId}`);
  if(!result.verified)process.exitCode=1;
}
