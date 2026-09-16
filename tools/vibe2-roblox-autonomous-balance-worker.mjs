// Skyline Sprint R5 deterministic balance worker.
// Reads verified physical-input telemetry and makes one conservative, evidence-driven source adjustment.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const clean=value=>String(value??'').trim();
const posix=value=>clean(value).replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const RECIPE='roblox-obby-autonomous-balance-v1';
const AUTHORITY='vibe2-roblox-skyline-input-playtest';
const DEFAULT_EVIDENCE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','.vibe2','runtime-evidence','skyline-r5-baseline.json');

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}
function currentBranch(cwd){return clean(execFileSync('git',['rev-parse','--abbrev-ref','HEAD'],{cwd,encoding:'utf8'}));}
function assertCandidateBranch(cwd){const branch=currentBranch(cwd);if(!branch.startsWith('vibe2/candidate/'))throw new Error(`R5 balance write requires candidate branch: ${branch||'unknown'}`);return branch;}
function safeId(value){return clean(value).replace(/[^A-Za-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'task';}
function clamp(value,min,max){return Math.min(max,Math.max(min,value));}
function fmt(value){const rounded=Math.round(value*100)/100;return Number.isInteger(rounded)?String(rounded):String(rounded);}

function validateTelemetry(telemetry){
  if(clean(telemetry?.authority)!==AUTHORITY)throw new Error('R5 telemetry authority mismatch');
  if(telemetry?.runtimeVerified!==true||telemetry?.inputBased!==true||telemetry?.capabilities?.virtualInput!==true)throw new Error('R5 telemetry is not verified physical-input evidence');
  if(Number(telemetry?.metrics?.inputActions||0)<2||Number(telemetry?.metrics?.jumpCount||0)<1)throw new Error('R5 telemetry lacks real input dispatch');
  const stages=Array.isArray(telemetry?.stages)?telemetry.stages.filter(row=>Number(row?.stage)>=1&&Number(row?.stage)<=12):[];
  if(!stages.length)throw new Error('R5 telemetry contains no stage measurements');
  return stages;
}
function stageScore(row){return Number(row?.deaths||0)*120000+Number(row?.retries||0)*90000+Number(row?.stalledMs||0)*4+Number(row?.elapsedMs||0);}
function chooseStage(stages){
  const failed=stages.find(row=>row?.success!==true);
  if(failed)return{stage:Number(failed.stage),reason:'physical-stage-failure',score:stageScore(failed),row:failed};
  const ranked=[...stages].sort((a,b)=>stageScore(b)-stageScore(a));
  const worst=ranked[0];
  const scores=ranked.map(stageScore).sort((a,b)=>a-b);const median=scores[Math.floor(scores.length/2)]||1;
  const justified=Number(worst?.deaths||0)>0||Number(worst?.retries||0)>0||Number(worst?.stalledMs||0)>=900||stageScore(worst)>=median*1.35;
  if(!justified)throw new Error('R5_NO_BALANCE_CHANGE_JUSTIFIED');
  return{stage:Number(worst.stage),reason:'verified-stage-friction-outlier',score:stageScore(worst),row:worst};
}
function stageChain(source){const start=source.indexOf('  if stage == 1 then');const end=source.indexOf('\n  -- Preserve the original per-stage hazard naming contract',start);if(start<0||end<=start)throw new Error('R4 stage chain not found');return{start,end,text:source.slice(start,end)};}
function stageBlock(source,stage){
  const chain=stageChain(source);let marker;
  if(stage===1)marker='  if stage == 1 then';else if(stage===12)marker='\n  else\n';else marker=`\n  elseif stage == ${stage} then`;
  let localStart=chain.text.indexOf(marker);if(localStart<0)throw new Error(`R4 stage block missing: ${stage}`);if(marker.startsWith('\n'))localStart+=1;
  const after=localStart+(marker.startsWith('\n')?marker.length-1:marker.length);
  const nextElseIf=chain.text.indexOf('\n  elseif stage == ',after);const nextElse=chain.text.indexOf('\n  else\n',after);
  let localEnd=chain.text.length;for(const value of [nextElseIf,nextElse])if(value>=0&&value<localEnd)localEnd=value;
  return{chain,start:chain.start+localStart,end:chain.start+localEnd,text:chain.text.slice(localStart,localEnd)};
}
function replaceBlock(source,block,newBlock){return source.slice(0,block.start)+newBlock+source.slice(block.end);}
function tuneStage(source,stage){
  const block=stageBlock(source,stage);let text=block.text;let adjustment=null;
  const spinner=/(addSpinner\([\s\S]*?,\s*\d+(?:\.\d+)?\s*,\s*)(-?\d+(?:\.\d+)?)(\s*,\s*-?\d+(?:\.\d+)?\s*\))/;
  if(spinner.test(text)){
    text=text.replace(spinner,(_,a,speed,c)=>{const before=Number(speed),after=Math.sign(before||1)*clamp(Math.abs(before)*0.90,0.5,3);adjustment={kind:'spinner-speed',before,after};return`${a}${fmt(after)}${c}`;});
  }else{
    const pusher=/(addPusher\([\s\S]*?Vector3\.new\(\s*)(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)(\s*\)\s*\))/;
    if(pusher.test(text)){
      text=text.replace(pusher,(_,a,x,y,z,c)=>{const before={x:Number(x),y:Number(y),z:Number(z)},after={x:before.x*0.90,y:before.y,z:before.z*0.90};adjustment={kind:'pusher-horizontal-strength',before,after};return`${a}${fmt(after.x)}, ${fmt(after.y)}, ${fmt(after.z)}${c}`;});
    }else{
      const moving=/(addMovingPlatform\([\s\S]*?Vector3\.new\([^)]*\)\s*,\s*)(\d+(?:\.\d+)?)(\s*,\s*-?\d+(?:\.\d+)?\s*\))/;
      if(moving.test(text)){
        text=text.replace(moving,(_,a,period,c)=>{const before=Number(period),after=clamp(before*1.08,before,8);adjustment={kind:'moving-platform-period',before,after};return`${a}${fmt(after)}${c}`;});
      }else if(stage>=10&&/addDisappearingPlatform/.test(text)){
        const visible=/visibleTime\s*=\s*(\d+(?:\.\d+)?)/,hidden=/hiddenTime\s*=\s*(\d+(?:\.\d+)?)/;
        const vm=source.match(visible),hm=source.match(hidden);if(!vm||!hm)throw new Error('disappearing timing constants missing');
        const before={visible:Number(vm[1]),hidden:Number(hm[1])},after={visible:clamp(before.visible*1.08,before.visible,4),hidden:clamp(before.hidden*0.92,0.7,before.hidden)};
        const tuned=source.replace(visible,`visibleTime = ${fmt(after.visible)}`).replace(hidden,`hiddenTime = ${fmt(after.hidden)}`);
        return{source:tuned,adjustment:{kind:'disappearing-window',before,after},stage};
      }else{
        let count=0;const size=/Vector3\.new\(\s*(\d+(?:\.\d+)?)\s*,\s*1(?:\.0)?\s*,\s*(\d+(?:\.\d+)?)\s*\)/g;
        text=text.replace(size,(_,x,z)=>{count+=1;const before={x:Number(x),z:Number(z)},after={x:clamp(before.x*1.08,before.x,before.x+1.5),z:clamp(before.z*1.08,before.z,before.z+1.5)};if(!adjustment)adjustment={kind:'platform-tolerance',before,after};return`Vector3.new(${fmt(after.x)}, 1, ${fmt(after.z)})`;});
        if(count===0)throw new Error(`R5 stage ${stage} has no supported bounded adjustment`);
        adjustment.count=count;
      }
    }
  }
  return{source:replaceBlock(source,block,text),adjustment,stage};
}

export function runRobloxAutonomousBalanceWorker({cwd=process.cwd(),workOrderFile='.vibe2/work-order-effective.json',outputRoot='.vibe2/candidates',applySource=false,evidenceFile=''}={}){
  const order=readJson(path.resolve(cwd,workOrderFile));if(!order?.run||order?.workMode!=='source-change-candidate')throw new Error('R5 requires runnable source-change work order');
  if(clean(order?.developmentExecution?.recipe)!==RECIPE)throw new Error(`R5 recipe mismatch: ${clean(order?.developmentExecution?.recipe)||'NONE'}`);
  if(order?.workerPolicy?.directMainWrite!==false)throw new Error('R5 directMainWrite policy violation');
  const sourceRootRelative=posix(order?.source?.root);const sourceRoot=path.resolve(cwd,sourceRootRelative);const serverFile=path.join(sourceRoot,'server','Game.server.luau');
  if(!fs.existsSync(serverFile))throw new Error(`R5 server source missing: ${serverFile}`);
  const telemetryPath=path.resolve(clean(evidenceFile||process.env.VIBE2_RUNTIME_EVIDENCE_FILE)||DEFAULT_EVIDENCE);if(!fs.existsSync(telemetryPath))throw new Error(`R5 verified input telemetry missing: ${telemetryPath}`);
  const telemetry=readJson(telemetryPath),stages=validateTelemetry(telemetry),selection=chooseStage(stages);const original=fs.readFileSync(serverFile,'utf8');
  if(!original.includes('course:SetAttribute("MapRevision", "R4")'))throw new Error('R5 expects verified R4 map baseline');
  const tuned=tuneStage(original,selection.stage);if(tuned.source===original)throw new Error('R5 balance worker produced no source change');
  const branch=applySource?assertCandidateBranch(cwd):null;if(applySource)fs.writeFileSync(serverFile,tuned.source.endsWith('\n')?tuned.source:`${tuned.source}\n`,'utf8');
  const taskId=safeId(order.taskId),candidateRoot=path.resolve(cwd,outputRoot,taskId);fs.rmSync(candidateRoot,{recursive:true,force:true});fs.mkdirSync(candidateRoot,{recursive:true});
  if(!applySource){const file=path.join(candidateRoot,'files','server','Game.server.luau');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,tuned.source,'utf8');}
  const summary=`Skyline R5 telemetry-driven bounded balance adjustment at Stage ${selection.stage}`;
  const tests=['input-based-playtest-evidence','stage-telemetry','checkpoint-respawn','round-1-finished','round-2-reset','server-authority-preserved','mobile-default-controls-preserved'];
  const manifest={version:6,taskId:order.taskId,gameId:order.gameId||null,target:'roblox',sourceRoot:sourceRootRelative,releaseState:clean(order.releaseState)||'other',priority:clean(order.priority)||'critical',baseMainSha:clean(process.env.VIBE2_BASE_MAIN_SHA)||null,goal:order.goal,generatedAt:new Date().toISOString(),mode:applySource?'isolated-candidate-branch-source-write':'candidate-snapshot-only',branch,model:null,aiUsed:false,implementationExecutor:'deterministic-source-worker',deterministicRecipe:RECIPE,changedFiles:['server/Game.server.luau'],summary,expectedEffect:'Reduce verified stage friction with one conservative change while preserving R3/R4 contracts',tests,exploration:order.exploration||null,telemetryEvidence:{authority:telemetry.authority,inputBased:true,inputProfile:telemetry.inputProfile||null,metrics:telemetry.metrics||{},selectedStage:selection.stage,selectionReason:selection.reason,selectedStageTelemetry:selection.row,adjustment:tuned.adjustment},codeIntelligence:{version:1,deterministicRecipe:{id:RECIPE,verified:true},repairLoop:{enabled:true,maxAttempts:2,attemptsUsed:0,repaired:false,history:[]}},roleResults:{exploration:'PASS',implementation:'PASS',test:'WAITING_INCREMENTAL_QA',performance:'WAITING_SANITY',regression:'WAITING_FAN_IN',review:'WAITING_FAN_IN'},designIntelligence:order.designIntelligence||null,designEvidence:{autoPlayer:{status:'BASELINE_VERIFIED',verified:true},telemetry:{status:'BASELINE_VERIFIED',verified:true},designReview:{status:'WAITING_EVIDENCE',verified:false,decision:null},qa:{status:'WAITING_EVIDENCE',verified:false}},fullFileRewriteAllowed:false,protectedGameplayMutationAutomatic:false,binaryAssetsDirectTextEditForbidden:true,directMainWrite:false,verifiedBeforePromotion:false};
  writeJson(path.join(candidateRoot,'manifest.json'),manifest);writeJson(path.join(candidateRoot,'candidate.json'),{summary,expectedEffect:manifest.expectedEffect,replaceFiles:[{path:'server/Game.server.luau',content:tuned.source}],tests,telemetryEvidence:manifest.telemetryEvidence});return manifest;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const result=runRobloxAutonomousBalanceWorker({applySource:process.argv.includes('--apply-source=true')});console.log('VIBE2_ROBLOX_AUTONOMOUS_BALANCE_WORKER=PASS');console.log(`VIBE2_BALANCE_STAGE=${result.telemetryEvidence.selectedStage}`);console.log(`VIBE2_BALANCE_KIND=${result.telemetryEvidence.adjustment.kind}`);}

export {AUTHORITY,DEFAULT_EVIDENCE,RECIPE};
