// 파일명: tools/autonomous-play-impact.mjs
// 역할: 승격 후보와 원본의 모바일/플레이 시나리오 관측을 비교해 실제 플레이 체감, 회귀위험, 부서별 성과 근거를 기록한다.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const clean=v=>String(v??'').trim();
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const uniq=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const round2=value=>Math.round(Number(value||0)*100)/100;
const LOW_IMPACT_STATUS='NOT_OBSERVED_BY_SMOKE_QA';
const REVIEW_DEPARTMENTS=['planning','development','graphics','qa','balance'];

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
function riskLevel(score){return score>=5?'CRITICAL':score>=3?'HIGH':score>=1?'MODERATE':'LOW';}

export function scoreRegressionRisk({baseline={},candidate={}}={}){
  const baselineErrors=browserErrors(baseline),candidateErrors=browserErrors(candidate);
  const baselineValid=metricsAvailable(baseline),candidateValid=metricsAvailable(candidate);
  const newRuntimeErrors=Math.max(0,candidateErrors.length-baselineErrors.length);
  const baselineOverflow=baselineValid?Math.max(overflow(baseline.metrics),overflow(baseline.reloadMetrics)):null;
  const candidateOverflow=candidateValid?Math.max(overflow(candidate.metrics),overflow(candidate.reloadMetrics)):null;
  const overflowWorse=baselineValid&&candidateValid&&candidateOverflow>baselineOverflow;
  const visibleInteractiveLost=baselineValid&&candidateValid&&finite(candidate.metrics?.visibleInteractive)<finite(baseline.metrics?.visibleInteractive)-1;
  const baselineScenarioPass=baseline?.gameplayScenario?.expectedPlayable===true&&baseline?.gameplayScenario?.pass===true;
  const candidateScenarioPass=candidate?.gameplayScenario?.expectedPlayable!==true||candidate?.gameplayScenario?.pass===true;
  const scenarioRegression=baselineScenarioPass&&!candidateScenarioPass;
  let score=0;
  if(candidate?.pass!==true)score+=3;
  if(newRuntimeErrors>0)score+=Math.min(2,newRuntimeErrors);
  if(overflowWorse)score+=1;
  if(visibleInteractiveLost)score+=1;
  if(scenarioRegression)score+=2;
  score=Math.min(5,score);
  return {score,level:riskLevel(score),newRuntimeErrors,overflowWorse,visibleInteractiveLost,baselineScenarioPass,candidateScenarioPass,scenarioRegression};
}

export function buildDepartmentAttribution(evidence={},performance={totalScore:0,playerImpactScore:0,netScore:0}){
  const components=(evidence.departmentImplementations||[]).filter(row=>row?.status==='PASS');
  const mergeModes=Array.isArray(evidence?.integration?.mergeModes)?evidence.integration.mergeModes:[];
  const finalFiles=new Set((evidence.changedFiles||[]).map(clean));
  const fileRoles=new Map();
  for(const row of components){for(const file of uniq(row.changedFiles||[])){if(!finalFiles.has(file))continue;if(!fileRoles.has(file))fileRoles.set(file,[]);fileRoles.get(file).push(row.role);}}
  const rows=REVIEW_DEPARTMENTS.map(role=>{
    const component=components.find(row=>row.role===role)||null;
    const changedFiles=uniq(component?.changedFiles||[]).filter(file=>finalFiles.has(file));
    const directUniqueFiles=changedFiles.filter(file=>(fileRoles.get(file)||[]).length===1);
    const sharedFiles=changedFiles.filter(file=>(fileRoles.get(file)||[]).length>1);
    const roleModes=mergeModes.filter(row=>row?.role===role&&changedFiles.includes(clean(row.path))).map(row=>({path:row.path,mode:row.mode}));
    const retainedModes=roleModes.filter(row=>row.mode!=='CURRENT_ONLY');
    const rawWeight=changedFiles.reduce((sum,file)=>sum+1/Math.max(1,(fileRoles.get(file)||[]).length),0);
    return {department:role,reviewContributor:true,implementationContributor:Boolean(component),changedFiles,directUniqueFiles,sharedFiles,mergeModes:roleModes,retainedIntegrationSignals:retainedModes.length,rawWeight};
  });
  const totalWeight=rows.reduce((sum,row)=>sum+row.rawWeight,0);
  for(const row of rows){
    const share=totalWeight>0?row.rawWeight/totalWeight:0;
    row.attributionShare=round2(share);
    row.totalPerformanceCredit=round2(finite(performance.netScore)*share);
    row.playerImpactCredit=round2(finite(performance.playerImpactScore)*share);
    row.creditBasis=row.implementationContributor?(row.directUniqueFiles.length?'DIRECT_UNIQUE_FILE_PLUS_SHARED_FINAL':'SHARED_FINAL_INTEGRATION'):'REVIEW_ONLY_NO_DIRECT_CODE_CREDIT';
    delete row.rawWeight;
  }
  return {mode:'FINAL_INTEGRATED_FILE_WEIGHTED',reviewCreditSeparatedFromDirectCodeCredit:true,departments:rows};
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
  const scenarioImproved=baseline?.gameplayScenario?.expectedPlayable===true&&baseline?.gameplayScenario?.pass!==true&&candidate?.gameplayScenario?.pass===true;
  const observableSurfaceChange=interactiveChanged||canvasChanged||titleChanged;

  let executionQualityScore=0;
  if(candidatePass)executionQualityScore+=3;
  if(clean(evidence.saveKeyValidation).toUpperCase()==='PASS')executionQualityScore+=1;
  if(changedFiles.length>=1&&changedFiles.length<=2)executionQualityScore+=1;

  let playerImpactScore=0;
  if(defectReduction>0)playerImpactScore+=3;
  if(overflowReduction>0)playerImpactScore+=1;
  if(observableSurfaceChange)playerImpactScore+=1;
  if(scenarioImproved)playerImpactScore+=2;
  playerImpactScore=Math.min(5,playerImpactScore);

  const regressionRisk=scoreRegressionRisk({baseline,candidate});
  let impactStatus='BASELINE_UNAVAILABLE';
  if(!candidatePass)impactStatus='REGRESSION';
  else if(regressionRisk.score>=3)impactStatus='REGRESSION_RISK_HIGH';
  else if(baselineValid&&playerImpactScore>=3)impactStatus='VERIFIED_IMPROVEMENT';
  else if(baselineValid&&playerImpactScore>=1)impactStatus='OBSERVABLE_CHANGE';
  else if(baselineValid)impactStatus=LOW_IMPACT_STATUS;
  const confidence=defectReduction>0||scenarioImproved?'HIGH':playerImpactScore>0?'MEDIUM':baselineValid?'LOW':'NONE';
  const totalScore=Math.max(0,Math.min(10,executionQualityScore+playerImpactScore));
  const netScore=Math.max(0,Math.min(10,totalScore-regressionRisk.score));
  const implementing=implementationDepartments(evidence);
  const departmentAttribution=buildDepartmentAttribution(evidence,{totalScore,playerImpactScore,netScore});

  return {
    version:2,
    kind:'AUTONOMOUS_PLAY_IMPACT',
    gameId:clean(evidence.gameId),
    candidateId:clean(evidence.candidateId),
    executionQualityScore,
    playerImpactScore,
    totalScore,
    regressionRiskScore:regressionRisk.score,
    regressionRiskLevel:regressionRisk.level,
    netScore,
    impactStatus,
    confidence,
    priorityEligibleLowImpact:impactStatus===LOW_IMPACT_STATUS&&regressionRisk.score<3,
    reviewDepartments:REVIEW_DEPARTMENTS,
    implementationDepartments:implementing,
    departmentAttribution,
    changedFiles,
    gameplayScenario:{baseline:baseline?.gameplayScenario||null,candidate:candidate?.gameplayScenario||null,improved:scenarioImproved,regression:regressionRisk.scenarioRegression},
    regressionRisk,
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
      scenarioImproved,
    },
    scoring:{executionQualityMax:5,playerImpactMax:5,regressionRiskMax:5,totalMax:10,netMax:10,lowImpactPenaltyAfterConsecutive:2},
    evaluatedAt:new Date().toISOString(),
  };
}

export function appendImpactHistory(history={version:1,entries:[]},impact,maxEntries=80){
  if(!impact?.gameId||!impact?.candidateId)throw new Error('impact gameId/candidateId 필요');
  const entries=(Array.isArray(history?.entries)?history.entries:[]).filter(row=>row?.candidateId!==impact.candidateId);
  entries.push(impact);
  entries.sort((a,b)=>String(a.evaluatedAt||'').localeCompare(String(b.evaluatedAt||'')));
  return {version:2,updatedAt:new Date().toISOString(),entries:entries.slice(-Math.max(10,maxEntries))};
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
