// 파일명: tools/autonomous-play-impact.mjs
// 역할: 승격 후보와 원본의 모바일 브라우저 관측을 비교해 실제 플레이 체감/실행 품질 근거를 기록한다.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const clean=v=>String(v??'').trim();
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const uniq=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const LOW_IMPACT_STATUS='NOT_OBSERVED_BY_SMOKE_QA';

function browserErrors(report={}){
  return uniq([
    ...(report.errors||[]),
    ...(report.consoleErrors||[]).map(x=>`console:${x}`),
    ...(report.pageErrors||[]).map(x=>`page:${x}`),
    ...(report.failedRequests||[]).map(x=>`request:${x}`),
    ...(report.badResponses||[]).map(x=>`response:${x}`),
  ]);
}
function overflow(metrics={}){return Math.max(0,finite(metrics.scrollWidth)-finite(metrics.viewportWidth));}
function metricsAvailable(report){return Boolean(report&&typeof report.pass==='boolean'&&report.metrics&&report.reloadMetrics);}
function implementationDepartments(evidence={}){
  return uniq((evidence.departmentImplementations||[]).filter(x=>x?.status==='PASS').map(x=>x.role));
}

export function comparePlayImpact({baseline={},candidate={},evidence={}}={}){
  const baselineValid=metricsAvailable(baseline),candidateValid=metricsAvailable(candidate);
  const baselineErrors=browserErrors(baseline),candidateErrors=browserErrors(candidate);
  const changedFiles=uniq(evidence.changedFiles||[]);
  const candidatePass=candidate?.pass===true;
  const defectReduction=baselineValid?Math.max(0,baselineErrors.length-candidateErrors.length):0;
  const baselineOverflow=baselineValid?Math.max(overflow(baseline.metrics),overflow(baseline.reloadMetrics)):null;
  const candidateOverflow=candidateValid?Math.max(overflow(candidate.metrics),overflow(candidate.reloadMetrics)):null;
  const overflowReduction=baselineValid&&candidateValid?Math.max(0,baselineOverflow-candidateOverflow):0;
  const interactiveChanged=baselineValid&&candidateValid&&finite(baseline.metrics?.visibleInteractive)!==finite(candidate.metrics?.visibleInteractive);
  const canvasChanged=baselineValid&&candidateValid&&finite(baseline.metrics?.canvas)!==finite(candidate.metrics?.canvas);
  const titleChanged=baselineValid&&candidateValid&&clean(baseline.metrics?.title)!==clean(candidate.metrics?.title);
  const observableSurfaceChange=interactiveChanged||canvasChanged||titleChanged;

  let executionQualityScore=0;
  if(candidatePass)executionQualityScore+=3;
  if(clean(evidence.saveKeyValidation).toUpperCase()==='PASS')executionQualityScore+=1;
  if(changedFiles.length>=1&&changedFiles.length<=2)executionQualityScore+=1;

  let playerImpactScore=0;
  if(defectReduction>0)playerImpactScore+=3;
  if(overflowReduction>0)playerImpactScore+=1;
  if(observableSurfaceChange)playerImpactScore+=1;
  playerImpactScore=Math.min(5,playerImpactScore);

  let impactStatus='BASELINE_UNAVAILABLE';
  if(!candidatePass)impactStatus='REGRESSION';
  else if(baselineValid&&playerImpactScore>=3)impactStatus='VERIFIED_IMPROVEMENT';
  else if(baselineValid&&playerImpactScore>=1)impactStatus='OBSERVABLE_CHANGE';
  else if(baselineValid)impactStatus=LOW_IMPACT_STATUS;
  const confidence=defectReduction>0?'HIGH':playerImpactScore>0?'MEDIUM':baselineValid?'LOW':'NONE';
  const totalScore=Math.max(0,Math.min(10,executionQualityScore+playerImpactScore));
  const reviewDepartments=['planning','development','graphics','qa','balance'];
  const implementing=implementationDepartments(evidence);

  return {
    version:1,
    kind:'AUTONOMOUS_PLAY_IMPACT',
    gameId:clean(evidence.gameId),
    candidateId:clean(evidence.candidateId),
    executionQualityScore,
    playerImpactScore,
    totalScore,
    impactStatus,
    confidence,
    priorityEligibleLowImpact:impactStatus===LOW_IMPACT_STATUS,
    reviewDepartments,
    implementationDepartments:implementing,
    changedFiles,
    signals:{
      baselinePass:baseline?.pass===true,
      candidatePass,
      baselineErrorCount:baselineErrors.length,
      candidateErrorCount:candidateErrors.length,
      defectReduction,
      baselineOverflow,
      candidateOverflow,
      overflowReduction,
      visibleInteractiveBefore:baselineValid?finite(baseline.metrics?.visibleInteractive):null,
      visibleInteractiveAfter:candidateValid?finite(candidate.metrics?.visibleInteractive):null,
      interactiveChanged,
      canvasChanged,
      titleChanged,
      observableSurfaceChange,
    },
    scoring:{executionQualityMax:5,playerImpactMax:5,totalMax:10,lowImpactPenaltyAfterConsecutive:2},
    evaluatedAt:new Date().toISOString(),
  };
}

export function appendImpactHistory(history={version:1,entries:[]},impact,maxEntries=80){
  if(!impact?.gameId||!impact?.candidateId)throw new Error('impact gameId/candidateId 필요');
  const entries=(Array.isArray(history?.entries)?history.entries:[]).filter(row=>row?.candidateId!==impact.candidateId);
  entries.push(impact);
  entries.sort((a,b)=>String(a.evaluatedAt||'').localeCompare(String(b.evaluatedAt||'')));
  return {version:1,updatedAt:new Date().toISOString(),entries:entries.slice(-Math.max(10,maxEntries))};
}
export function latestImpactFor(history={},gameId=''){
  const rows=(history?.entries||[]).filter(row=>clean(row?.gameId)===clean(gameId));
  rows.sort((a,b)=>String(b.evaluatedAt||'').localeCompare(String(a.evaluatedAt||'')));
  return rows[0]||null;
}
export function lowImpactStreak(history={},gameId=''){
  const rows=(history?.entries||[]).filter(row=>clean(row?.gameId)===clean(gameId)).sort((a,b)=>String(b.evaluatedAt||'').localeCompare(String(a.evaluatedAt||'')));
  let streak=0;
  for(const row of rows){if(row?.priorityEligibleLowImpact===true&&row?.impactStatus===LOW_IMPACT_STATUS)streak++;else break;}
  return streak;
}
export function priorityPenaltyForGame(history={},gameId=''){
  const streak=lowImpactStreak(history,gameId);
  return streak<2?0:Math.min(2,streak-1);
}

function arg(name,fallback=''){return process.argv.find(x=>x.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;}
function main(){
  const appendFile=arg('append-history');
  if(appendFile){
    const impactFile=arg('impact');if(!impactFile)throw new Error('--impact 필요');
    const history=appendImpactHistory(readJson(appendFile,{version:1,entries:[]}),readJson(impactFile));
    writeJson(appendFile,history);
    console.log(JSON.stringify({history:appendFile,entries:history.entries.length,latest:history.entries.at(-1)},null,2));
    return;
  }
  const baseline=arg('baseline'),candidate=arg('candidate'),evidence=arg('evidence'),output=arg('output');
  if(!candidate||!evidence||!output)throw new Error('--candidate/--evidence/--output 필요');
  const report=comparePlayImpact({baseline:readJson(baseline,{}),candidate:readJson(candidate,{}),evidence:readJson(evidence,{})});
  writeJson(output,report);
  console.log(JSON.stringify(report,null,2));
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{main();}catch(error){console.error(error.message);process.exitCode=1;}}
