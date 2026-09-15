// 파일명: tools/vibe2-engine-auto-player.mjs
// 역할: Roblox/Unity 등 외부 엔진 런타임이 생성한 실제 입력 증거를 공통 Vibe2 PLAY LOG/TELEMETRY로 변환한다.
// nonce + 엔진 authority + runtime capability를 모두 확인하며, 파일 존재나 빌드 성공만으로 PASS하지 않는다.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { normalizeAutoPlayerScenario, createAutoPlayerResult, persistAutoPlayerResult, applyAutoPlayerEvidenceToManifest } from './vibe2-auto-player-contract.mjs';

const clean=v=>String(v??'').trim();
const STDOUT_MARKER='VIBE2_AUTO_PLAYER_RUNTIME_JSON=';
function parseCommandArgs(value=''){if(!clean(value))return[];const parsed=JSON.parse(value);if(!Array.isArray(parsed))throw new Error('AUTO PLAYER command args는 JSON 배열이어야 함');return parsed.map(v=>String(v));}
function runProcess(command,args,{cwd,env,timeoutMs}){return new Promise((resolve,reject)=>{const child=spawn(command,args,{cwd,env:{...process.env,...env},stdio:['ignore','pipe','pipe'],shell:false});let stdout='',stderr='',done=false;const finish=(error,code=null)=>{if(done)return;done=true;clearTimeout(timer);if(error)reject(error);else resolve({code,stdout,stderr});};const timer=setTimeout(()=>{try{child.kill('SIGKILL');}catch{}finish(new Error(`AUTO PLAYER engine timeout: ${timeoutMs}ms`));},timeoutMs);child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',c=>{if(stdout.length<400000)stdout+=c;});child.stderr.on('data',c=>{if(stderr.length<400000)stderr+=c;});child.on('error',finish);child.on('close',code=>finish(null,code));});}
function rawFromOutput(rawFile,stdout){if(fs.existsSync(rawFile)&&fs.statSync(rawFile).size>0)return JSON.parse(fs.readFileSync(rawFile,'utf8'));const line=stdout.split(/\r?\n/).reverse().find(row=>row.startsWith(STDOUT_MARKER));if(!line)throw new Error('engine runtime evidence 없음');const encoded=line.slice(STDOUT_MARKER.length).trim();try{return JSON.parse(Buffer.from(encoded,'base64url').toString('utf8'));}catch(error){throw new Error(`engine runtime stdout evidence 파싱 실패: ${error.message}`);}}
function validateRaw(raw,{engine,nonce,authority,requiredCapabilities}){const issues=[];if(raw?.version!==1)issues.push('runtime-version-invalid');if(clean(raw?.engine).toLowerCase()!==engine)issues.push('runtime-engine-mismatch');if(clean(raw?.nonce)!==nonce)issues.push('runtime-nonce-mismatch');if(clean(raw?.authority)!==authority)issues.push('runtime-authority-mismatch');if(raw?.runtimeVerified!==true)issues.push('runtime-not-verified');for(const capability of requiredCapabilities||[])if(raw?.capabilities?.[capability]!==true)issues.push(`runtime-capability-missing:${capability}`);const actions=Array.isArray(raw?.actions)?raw.actions:[];const checkpoints=Array.isArray(raw?.checkpoints)?raw.checkpoints:[];if(!actions.some(x=>x?.dispatched===true))issues.push('real-input-dispatch-required');if(!checkpoints.some(x=>x?.required!==false))issues.push('runtime-checkpoint-required');if(checkpoints.some(x=>x?.required!==false&&x?.pass!==true))issues.push('runtime-checkpoint-failed');if((raw?.errors||[]).length)issues.push('runtime-errors-present');return{valid:issues.length===0,issues,actions,checkpoints};}

export async function runExternalEngineAutoPlayer({engine='',scenarioFile='',scenario=null,command='',commandArgs=[],cwd=process.cwd(),outputFile='',manifestFile='',authority='',requiredCapabilities=[],timeoutMs=120000}={}){
  const normalizedEngine=clean(engine).toLowerCase();
  const sc=normalizeAutoPlayerScenario(scenario||JSON.parse(fs.readFileSync(scenarioFile,'utf8')));
  if(sc.engine!==normalizedEngine)throw new Error(`${normalizedEngine} AUTO PLAYER scenario engine 불일치: ${sc.engine}`);
  if(!clean(command))throw new Error(`${normalizedEngine} AUTO PLAYER runtime command 없음`);
  const nonce=crypto.randomBytes(24).toString('hex');
  const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),`vibe2-${normalizedEngine}-`));
  const rawFile=path.join(tempRoot,'runtime-result.json');
  const startedAt=new Date().toISOString(),startedMs=Date.now(),runId=`${normalizedEngine}-${startedMs}-${process.pid}`;
  try{
    const processResult=await runProcess(command,commandArgs,{cwd,timeoutMs:Math.max(5000,Number(timeoutMs)||120000),env:{VIBE2_AUTO_PLAYER_ENGINE:normalizedEngine,VIBE2_AUTO_PLAYER_SCENARIO:path.resolve(scenarioFile),VIBE2_AUTO_PLAYER_RUNTIME_RESULT:rawFile,VIBE2_AUTO_PLAYER_NONCE:nonce,VIBE2_AUTO_PLAYER_RUN_ID:runId}});
    if(processResult.code!==0)throw new Error(`${normalizedEngine} runtime exit ${processResult.code}: ${processResult.stderr.slice(-4000)}`);
    const raw=rawFromOutput(rawFile,processResult.stdout);
    const validation=validateRaw(raw,{engine:normalizedEngine,nonce,authority,requiredCapabilities});
    const errors=[...(raw.errors||[]),...validation.issues.map(message=>({type:'runtime-evidence',message}))];
    const result=createAutoPlayerResult({engine:normalizedEngine,runId,startedAt,finishedAt:new Date().toISOString(),browser:'',page:clean(raw.scene||raw.place||raw.project),actions:validation.actions,checkpoints:validation.checkpoints,errors,playability:{required:false,trusted:true,playable:raw.runtimeVerified===true},metrics:{durationMs:Date.now()-startedMs,timeToFirstActionMs:Number.isFinite(Number(raw?.metrics?.timeToFirstActionMs))?Number(raw.metrics.timeToFirstActionMs):null,consoleErrorCount:Number(raw?.metrics?.consoleErrorCount||0),engineRuntimeVerified:raw.runtimeVerified===true,capabilities:raw.capabilities||{}},artifactPath:outputFile});
    if(outputFile)persistAutoPlayerResult(outputFile,result);
    if(manifestFile)applyAutoPlayerEvidenceToManifest(manifestFile,result,{artifactPath:outputFile});
    return Object.freeze({...result,runtime:{authority:clean(raw.authority),capabilities:raw.capabilities||{},stdout:processResult.stdout.slice(-8000),stderr:processResult.stderr.slice(-8000)},validation:Object.freeze(validation)});
  }finally{try{fs.rmSync(tempRoot,{recursive:true,force:true});}catch{}}
}

export { parseCommandArgs, STDOUT_MARKER };
