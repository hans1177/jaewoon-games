// Evidence-only five-axis gameplay quality audit. Does not authorize publication or change canonical gates.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

export const AXES = Object.freeze({
  gameplay:['playtest','coreLoop','input','feedback','progression'],
  combatAi:['perception','pathfinding','attackDecision','recovery','bossPhase'],
  worldPerformance:['frameTimeP95Ms','frameTimeP99Ms','peakMemoryMb','streamingStallP95Ms','deviceProfile'],
  animation:['idleLocomotionBlend','footContact','attackImpactSync','hitReaction','cameraReadability'],
  integration:['combatInventory','questProgression','physicsInteraction','networkAuthority','regression']
});
const numeric = new Set(['frameTimeP95Ms','frameTimeP99Ms','peakMemoryMb','streamingStallP95Ms']);
const text = value=>typeof value==='string'&&value.trim().length>0;
const hasEvidence = value=>value&&typeof value==='object'&&text(value.sourceRevision)&&text(value.artifact)&&text(value.scenario)&&value.observed===true;
export function auditFiveAxes(input){
  const result={schemaVersion:1,sourceRevision:input?.sourceRevision??null,axes:{},overall:'UNKNOWN',releaseAuthority:false};
  for(const [axis,requirements] of Object.entries(AXES)){
    const record=input?.axes?.[axis]??{};
    const failures=[],missing=[];
    for(const field of requirements){
      const evidence=record[field];
      if(!hasEvidence(evidence)||evidence.sourceRevision!==input?.sourceRevision){missing.push(field);continue;}
      if(numeric.has(field)){
        if(!Number.isFinite(evidence.value)||evidence.value<0||!Number.isFinite(evidence.maxAllowed)||evidence.maxAllowed<=0){missing.push(field);continue;}
        if(evidence.value>evidence.maxAllowed)failures.push(field);
      }else if(field==='deviceProfile'){
        if(!text(evidence.value))missing.push(field);
      }else if(evidence.passed!==true){failures.push(field);}
    }
    result.axes[axis]={status:failures.length?'FAIL':missing.length?'UNKNOWN':'PASS',missing,failures};
  }
  const statuses=Object.values(result.axes).map(x=>x.status);
  result.overall=statuses.includes('FAIL')?'FAIL':statuses.includes('UNKNOWN')?'UNKNOWN':'PASS';
  return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const file=process.argv.find(a=>a.startsWith('--evidence='))?.slice(11);
  if(!file){console.error('Usage: node tools/vibe-five-axis-evidence-audit.mjs --evidence=<json>');process.exitCode=2;}
  else{
    try{const result=auditFiveAxes(JSON.parse(fs.readFileSync(file,'utf8')));console.log(JSON.stringify(result,null,2));if(result.overall!=='PASS')process.exitCode=1;}
    catch(error){console.error(error.message);process.exitCode=2;}
  }
}
