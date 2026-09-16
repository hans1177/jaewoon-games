import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const AUTHORITY='vibe2-roblox-skyline-input-playtest';
const RECIPE='roblox-obby-autonomous-balance-v1';
const clean=value=>String(value??'').trim();

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}
function parseArgs(argv=process.argv.slice(2)){const args={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)args[body]=true;else args[body.slice(0,at)]=body.slice(at+1);}return args;}
function assertTelemetry(label,value){
  if(clean(value?.authority)!==AUTHORITY)throw new Error(`${label} telemetry authority mismatch`);
  if(value?.runtimeVerified!==true||value?.inputBased!==true||value?.capabilities?.virtualInput!==true)throw new Error(`${label} telemetry is not verified physical-input evidence`);
  if(Number(value?.metrics?.inputActions||0)<2||Number(value?.metrics?.jumpCount||0)<1)throw new Error(`${label} telemetry lacks dispatched movement input`);
  if(!Array.isArray(value?.stages)||value.stages.length===0)throw new Error(`${label} telemetry contains no stage measurements`);
}
function stageRow(telemetry,stage){return telemetry.stages.find(row=>Number(row?.stage)===stage)||null;}
function contiguousSuccess(telemetry){let highest=0;for(let stage=1;stage<=12;stage+=1){const row=stageRow(telemetry,stage);if(!row||row.success!==true)break;highest=stage;}return highest;}
function friction(row){return Number(row?.deaths||0)*120000+Number(row?.retries||0)*90000+Number(row?.stalledMs||0)*4+Number(row?.elapsedMs||0);}

export function compareR5PhysicalTelemetry({baseline,candidate,manifest}={}){
  assertTelemetry('baseline',baseline);assertTelemetry('candidate',candidate);
  if(clean(manifest?.deterministicRecipe)!==RECIPE)throw new Error('R5 candidate manifest recipe mismatch');
  const selectedStage=Number(manifest?.telemetryEvidence?.selectedStage||0);
  if(selectedStage<1||selectedStage>12)throw new Error('R5 candidate manifest selected stage missing');
  const baselineSha=clean(baseline?.baseMainSha),manifestSha=clean(manifest?.baseMainSha);
  if(!baselineSha||!manifestSha||baselineSha!==manifestSha)throw new Error(`R5 baseline/main revision mismatch: ${baselineSha||'NONE'} != ${manifestSha||'NONE'}`);
  const baselineRow=stageRow(baseline,selectedStage),candidateRow=stageRow(candidate,selectedStage);
  if(!baselineRow)throw new Error(`R5 baseline selected stage missing: ${selectedStage}`);
  const earlierRegressions=[];
  for(let stage=1;stage<selectedStage;stage+=1){const before=stageRow(baseline,stage);if(before?.success===true&&stageRow(candidate,stage)?.success!==true)earlierRegressions.push(stage);}
  let pass=false,reason='target-stage-not-improved';
  if(earlierRegressions.length){reason=`earlier-stage-regression:${earlierRegressions.join(',')}`;}
  else if(!candidateRow){reason='candidate-did-not-reach-target-stage';}
  else if(baselineRow.success!==true){
    pass=candidateRow.success===true;
    reason=pass?'failed-target-stage-now-passes':'failed-target-stage-still-fails';
  }else{
    const before=friction(baselineRow),after=friction(candidateRow);
    pass=candidateRow.success===true&&Number(candidateRow.deaths||0)<=Number(baselineRow.deaths||0)&&Number(candidateRow.retries||0)<=Number(baselineRow.retries||0)&&after<=before*0.90;
    reason=pass?'target-stage-friction-reduced':'target-stage-friction-not-reduced-enough';
  }
  return Object.freeze({
    version:1,pass,reason,baseMainSha:baselineSha,selectedStage,
    baseline:{highestContiguousSuccess:contiguousSuccess(baseline),stage:baselineRow,frictionScore:friction(baselineRow)},
    candidate:{highestContiguousSuccess:contiguousSuccess(candidate),stage:candidateRow,frictionScore:candidateRow?friction(candidateRow):null},
    earlierRegressions,
    adjustment:manifest?.telemetryEvidence?.adjustment||null,
  });
}

export function runR5PhysicalCompare({baselineFile,candidateFile,manifestFile,outputFile=''}={}){
  if(!baselineFile||!candidateFile||!manifestFile)throw new Error('R5 compare requires baseline, candidate, and manifest files');
  const result=compareR5PhysicalTelemetry({baseline:readJson(baselineFile),candidate:readJson(candidateFile),manifest:readJson(manifestFile)});
  if(outputFile)writeJson(outputFile,result);
  return result;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs();
  const result=runR5PhysicalCompare({baselineFile:clean(args.baseline),candidateFile:clean(args.candidate),manifestFile:clean(args.manifest),outputFile:clean(args.output)});
  console.log(`VIBE2_ROBLOX_R5_COMPARE=${result.pass?'PASS':'FAIL'}`);
  console.log(`VIBE2_ROBLOX_R5_COMPARE_STAGE=${result.selectedStage}`);
  console.log(`VIBE2_ROBLOX_R5_COMPARE_REASON=${result.reason}`);
  if(!result.pass)process.exitCode=1;
}

export {AUTHORITY,RECIPE};
