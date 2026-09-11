// 파일명: tools/autonomous-work-planner.mjs
// 역할: 게임 단계·공개 건강도·아트북·결정론적 진단 근거를 합쳐 가장 작은 무료 개발 작업을 고른다.
// 주의: public-game-health 점수는 게임 품질 점수가 아니라 실행/표시 건강도 근거로만 사용한다.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { attemptedGameIds, attemptsForDate } from './autonomous-queue-state.mjs';
import { diagnoseGame, microTaskFromIssue, SEVERITY_SCORE } from './autonomous-diagnostics.mjs';
import { latestDevelopmentBaselineEvidence } from './development-baseline-evidence.mjs';
import {PRODUCTION_CLASSES,productionClassOf} from './production-classification.mjs';

const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const clean=v=>String(v??'').trim();
const ensureDir=file=>fs.mkdirSync(path.dirname(file),{recursive:true});
const writeJson=(file,value)=>{ensureDir(file);fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const NON_ACTIONABLE_DIAGNOSTIC_TYPES=new Set(['LARGE_SINGLE_FILE']);
const META_IMPROVEMENT_TERMS=['본부 결과물','부서 결과물','검토 점수','이번 검토','별점','평가 점수','ratings','averageStars','이미지 중심 1장','이미지 중심 2장','한 장으로 설계','아트북 표현','문서 표현','전문성과 구체화도'];
const issueText=issue=>{
  if(typeof issue==='string')return issue.trim();
  if(!issue||typeof issue!=='object')return clean(issue);
  return [issue.type,issue.message,issue.code].filter(Boolean).map(clean).filter(Boolean).join(': ');
};

function kstDate(now=new Date()){
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const g=t=>p.find(x=>x.type===t)?.value||'';
  return `${g('year')}-${g('month')}-${g('day')}`;
}
function latestArtbookFor(artbooks,slug){
  const rows=(artbooks?.artbooks??[]).filter(book=>book.gameId===slug);
  return rows.sort((a,b)=>String(b.createdAt??b.date??'').localeCompare(String(a.createdAt??a.date??''))||Number(b.edition??0)-Number(a.edition??0))[0]??null;
}
function improvementHints(book){
  const opinions=book?.departmentOpinions??{},rows=[];
  for(const [role,opinion] of Object.entries(opinions)){
    const improvement=clean(opinion?.priorityImprovement);if(!improvement)continue;
    const stars=Number(opinion?.averageStars);rows.push({role,improvement,stars:Number.isFinite(stars)?stars:null});
  }
  rows.sort((a,b)=>(a.stars??5)-(b.stars??5));return rows.slice(0,2);
}
function isMetaImprovement(value){const text=clean(value).toLowerCase();return !text||META_IMPROVEMENT_TERMS.some(term=>text.includes(term.toLowerCase()));}
function actionableImprovementHints(book){return improvementHints(book).filter(row=>!isMetaImprovement(row.improvement));}
function isDiagnosticConstraint(issue){return NON_ACTIONABLE_DIAGNOSTIC_TYPES.has(clean(issue?.type).toUpperCase());}
function diagnosticSeverity(row){return SEVERITY_SCORE[row?.severity]||0;}
function actionableDiagnostic(diagnostic){
  const source=diagnostic||{issues:[],topIssue:null,counts:{}},issues=Array.isArray(source.issues)?source.issues:[],actionableIssues=issues.filter(issue=>!isDiagnosticConstraint(issue));
  const originalTop=source.topIssue;let topIssue=originalTop&&!isDiagnosticConstraint(originalTop)?originalTop:null;
  if(!topIssue&&actionableIssues.length)topIssue=[...actionableIssues].sort((a,b)=>diagnosticSeverity(b)-diagnosticSeverity(a))[0]||null;
  return {...source,issues:actionableIssues,topIssue};
}
function diagnosticConstraints(diagnostic){
  const rows=[...(Array.isArray(diagnostic?.issues)?diagnostic.issues:[])];
  if(diagnostic?.topIssue&&isDiagnosticConstraint(diagnostic.topIssue)&&!rows.includes(diagnostic.topIssue))rows.unshift(diagnostic.topIssue);
  return rows.filter(isDiagnosticConstraint);
}
function legacyCutFeatureAnchors(book){
  const cuts=Array.isArray(book?.cuts)?book.cuts:[];
  const score=cut=>{const title=clean(cut?.title),body=clean(cut?.body),text=`${title} ${body}`;let value=0;if(/초반|중반/.test(title))value+=4;if(/지역/.test(text))value+=3;if(/활동권|생태권|생존권/.test(text))value+=2;if(/확장|더 위험|새 자원|이동 루트/.test(text))value+=2;if(/퀘스트|보스|위협/.test(text))value+=1;return value;};
  return cuts.filter(cut=>['vibe2','planning'].includes(clean(cut?.sourceDepartment).toLowerCase())).filter(cut=>['story-draft','department-visual'].includes(clean(cut?.pageType).toLowerCase())).map(cut=>({body:clean(cut?.body),score:score(cut),no:Number(cut?.no)||999})).filter(row=>row.body&&!isMetaImprovement(row.body)).sort((a,b)=>b.score-a.score||a.no-b.no).map(row=>row.body);
}
function featureAnchor(book){
  const planning=book?.departments?.planning?.section||{},graphics=book?.departments?.graphics?.section||{};
  return [planning.storyGameplayConnection,planning.regionCausality,planning.handoffs,graphics.characterMonsterEnvironmentLogic,graphics.handoffs,book?.planningDirectionSelection?.signatureMoment,book?.planningDirectionSelection?.playerExperience,book?.storySpine?.planningDirectionSelection?.signatureMoment,...legacyCutFeatureAnchors(book)].map(clean).filter(Boolean).filter(text=>!isMetaImprovement(text))[0]||null;
}
function featureDevelopmentGoal(project,book){
  const anchor=featureAnchor(book),anchorText=anchor?` 설계 근거: ${anchor}.`:'';
  return `[FEATURE_DEVELOPMENT] 최신 DESIGN_BASELINE을 실제 플레이 가능한 작은 기능 1개로 구현한다. 우선순위는 맵/지역 확장 → 그래픽·환경·UI → 적·몬스터·콘텐츠 → 퀘스트·전투·성장 시스템 순이며, 현재 코드에 안전하게 연결되는 가장 작은 vertical slice 1개만 고른다.${anchorText} 평가문·별점·아트북 문서 표현·이미지 장수 자체를 게임 코드 목표로 삼지 않는다. ${clean(project?.name)||'현재 게임'}의 저장키·핵심루프·기존 플레이 의미를 유지하고 전면 재작성은 하지 않는다.`;
}
function runtimeIncident(health,slug){
  const item=(health?.games??[]).find(game=>game.gameId===slug);if(!item)return null;
  const issues=Array.isArray(item.issues)?item.issues.map(issueText).filter(Boolean):[];
  const blocked=String(item.status??'').toLowerCase()==='critical'||issues.length>0||item.signals?.loadOk===false||item.signals?.reloadOk===false;
  return blocked?{status:item.status??'unknown',issues,healthReason:item.healthReason??null}:null;
}
function catalogEntry(catalog,slug){return (catalog?.games??[]).find(game=>game.id===slug)||null;}
function isCompletedDesignBaseline(book){return clean(book?.status).toLowerCase()==='completed-artbook'&&clean(book?.lifecycle?.state).toUpperCase()==='DESIGN_BASELINE';}
export function classifyProjectStage(project,catalog){
  const entry=catalogEntry(catalog,project.slug),productionClass=productionClassOf(project,entry||{});
  if(project.mode==='HOLD'||/^HOLD/.test(clean(project.profileStatus)))return {id:'HOLD',rank:99,codeWork:false};
  if(productionClass===PRODUCTION_CLASSES.RELEASE_CONFIRMED)return {id:'RELEASE_CONFIRMED',rank:1,codeWork:true};
  if(productionClass===PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED)return {id:'DEVELOPMENT_CONFIRMED',rank:2,codeWork:true};
  if(productionClass===PRODUCTION_CLASSES.DESIGN_ONLY)return {id:'DESIGN_ONLY',rank:4,codeWork:false};
  if(project.mode==='MAINTENANCE')return {id:'RELEASE_CONFIRMED',rank:1,codeWork:true};
  if(project.mode==='IMPROVE')return {id:'DEVELOPMENT_CONFIRMED',rank:2,codeWork:true};
  if(project.mode==='EXPERIMENT_ONLY'||clean(project.profileStatus)==='NEEDS_AUDIT')return {id:'STRUCTURE_IMPROVEMENT',rank:3,codeWork:true};
  if(project.mode==='REDESIGN'||/REDESIGN|IDENTITY/.test(clean(project.profileStatus)))return {id:'PLANNING_IDENTITY_REQUIRED',rank:4,codeWork:false};
  return {id:'REVIEWING',rank:5,codeWork:true};
}
function baseGoal(project,book){
  const hints=actionableImprovementHints(book);
  if(hints.length)return `최신 아트북의 게임 구현 보완점 중 가장 우선인 1개만 작은 코드 작업으로 처리한다. ${hints[0].role}: ${hints[0].improvement}. 저장키와 핵심 규칙은 유지하고 다른 기능은 건드리지 않는다.`;
  if(project.mode==='EXPERIMENT_ONLY')return '구조 위험 근거 1개만 골라 작은 실험 후보로 수정한다. 공개판/저장 의미/핵심 규칙은 바꾸지 않는다.';
  return '현재 게임의 사용자 체감 문제 1개만 작은 수정 단위로 처리한다. 저장키와 핵심 규칙을 유지하고 전면 재작성은 하지 않는다.';
}
function diagnosticsFor(map,slug){return map?.[slug]||{issues:[],topIssue:null,counts:{}};}
function actionableForStage(stage,{incident,diagnostic,book,artbookHandoffReady=false,releaseEntryReady=true}){
  if(stage.id==='RELEASE_CONFIRMED')return releaseEntryReady&&Boolean(incident||diagnostic?.topIssue);
  if(stage.id==='PLANNING_IDENTITY_REQUIRED'||stage.id==='DESIGN_ONLY'||stage.id==='HOLD')return false;
  return Boolean(artbookHandoffReady||incident||diagnostic?.topIssue||actionableImprovementHints(book).length);
}

export function buildAutonomousWorkOrder({portfolio,artbooks,health,catalog={games:[]},diagnostics={},queueState={version:1,attempts:[]},date=kstDate(),filesystem=fs,priorityGameId='',repoRoot=process.cwd()}={}){
  if(portfolio?.status!=='ACTIVE'||!Array.isArray(portfolio.projects))throw new Error('autonomous portfolio 비활성/오류');
  if(portfolio.paidApi!==false)throw new Error('무료정책 위반: paidApi');
  const maxDaily=Math.max(1,Math.min(24,Number(portfolio.maxAutonomousWorkItemsPerDay??8)||8)),attemptsToday=attemptsForDate(queueState,date);
  if(attemptsToday.length>=maxDaily)return {version:2,run:false,reason:'DAILY_AUTONOMOUS_CAP_REACHED',date,paidApi:false,attemptsToday:attemptsToday.length,maxDaily};
  const attempted=attemptedGameIds(queueState,date);
  const eligible=portfolio.projects.filter(project=>clean(project.sourcePath)&&filesystem.existsSync(project.sourcePath)&&classifyProjectStage(project,catalog).id!=='HOLD');
  if(!eligible.length)return {version:2,run:false,reason:'NO_ELIGIBLE_PROJECT',date,paidApi:false,attemptsToday:attemptsToday.length,maxDaily};
  const remaining=eligible.filter(project=>!attempted.has(project.id));
  if(!remaining.length)return {version:2,run:false,reason:'NO_UNPROCESSED_WORK_TODAY',date,paidApi:false,attemptsToday:attemptsToday.length,maxDaily};

  const requestedPriority=clean(priorityGameId);
  const rows=remaining.map(project=>{
    const stage=classifyProjectStage(project,catalog),entry=catalogEntry(catalog,project.slug)||{},incident=runtimeIncident(health,project.slug),rawDiagnostic=diagnosticsFor(diagnostics,project.slug),diagnostic=actionableDiagnostic(rawDiagnostic),book=latestArtbookFor(artbooks,project.slug);
    const priorityMatch=Boolean(requestedPriority&&(requestedPriority===project.slug||requestedPriority===project.id));
    const artbookHandoffReady=priorityMatch&&stage.id==='DEVELOPMENT_CONFIRMED'&&isCompletedDesignBaseline(book);
    const isReleaseConfirmed=productionClassOf(project,entry)===PRODUCTION_CLASSES.RELEASE_CONFIRMED;
    const developmentBaseline=isReleaseConfirmed?latestDevelopmentBaselineEvidence(project.slug,{repoRoot}):null;
    const releaseEntryReady=!isReleaseConfirmed||developmentBaseline.ready===true;
    return {project,stage,incident,diagnostic,rawDiagnostic,book,priorityMatch,artbookHandoffReady,isReleaseConfirmed,developmentBaseline,releaseEntryReady,actionable:actionableForStage(stage,{incident,diagnostic,book,artbookHandoffReady,releaseEntryReady})};
  });
  const actionable=rows.filter(row=>row.actionable&&row.stage.codeWork);
  if(!actionable.length){
    const blockedReleaseConfirmed=rows.filter(row=>row.isReleaseConfirmed&&!row.releaseEntryReady);
    const planning=rows.find(row=>row.stage.id==='PLANNING_IDENTITY_REQUIRED'),designOnly=rows.find(row=>row.stage.id==='DESIGN_ONLY'),hasCodeStage=rows.some(row=>row.stage.codeWork);
    const reason=blockedReleaseConfirmed.length?'DEVELOPMENT_BASELINE_REQUIRED':(planning?'PLANNING_IDENTITY_REQUIRED':(!hasCodeStage&&designOnly?'DESIGN_ONLY':'NO_ACTIONABLE_DIAGNOSTIC'));
    const planningTarget=planning||(!hasCodeStage?designOnly:null);
    return {version:2,run:false,reason,date,paidApi:false,attemptsToday:attemptsToday.length,maxDaily,planningGameId:planningTarget?.project.id||null,priorityGameId:requestedPriority||null,blockedReleaseConfirmedGameIds:blockedReleaseConfirmed.map(row=>row.project.id)};
  }

  const releaseIncident=actionable.find(row=>row.stage.id==='RELEASE_CONFIRMED'&&row.incident),artbookHandoff=actionable.find(row=>row.artbookHandoffReady);
  if(!releaseIncident&&!artbookHandoff)actionable.sort((a,b)=>a.stage.rank-b.stage.rank||Number(Boolean(b.incident))-Number(Boolean(a.incident))||diagnosticSeverity(b.diagnostic?.topIssue)-diagnosticSeverity(a.diagnostic?.topIssue)||a.project.id.localeCompare(b.project.id));
  const selectedRow=releaseIncident||artbookHandoff||actionable[0],selected=selectedRow.project,incident=selectedRow.incident,diagnostic=selectedRow.diagnostic,rawDiagnostic=selectedRow.rawDiagnostic,book=selectedRow.book,stage=selectedRow.stage,microTask=microTaskFromIssue(diagnostic?.topIssue);
  let reason='STAGE_PRIORITY',goal=baseGoal(selected,book);
  if(incident){reason='RUNTIME_INCIDENT_FIRST';goal=`실행/표시 사고 1건만 복구하는 작은 후보를 만든다. 근거: ${[incident.healthReason,...incident.issues].filter(Boolean).join(' / ')}. 공개 main은 건드리지 않고 저장키를 유지한다.`;}
  else if(selectedRow.artbookHandoffReady){reason='ARTBOOK_COMPLETED_DEVELOPMENT_HANDOFF';const firstTask=microTask?.goal||featureDevelopmentGoal(selected,book);goal=`방금 완성된 최신 아트북 DESIGN_BASELINE을 현재 개발 설계도로 사용한다. 기술 구조 → 플레이어블 개발판 B로 이어지는 첫 작은 구현 작업 1개만 수행한다. ${firstTask} 아트북의 장르·핵심루프·스토리 큰 방향·저장 의미는 임의로 바꾸지 않는다.`;}
  else if(microTask){reason='DIAGNOSTIC_MICROTASK';goal=microTask.goal;}
  const repairMode=microTask?.repairMode==='RULE_PATCH'?'RULE_PATCH':'MODEL',responsibilityFiles=Array.isArray(microTask?.files)&&microTask.files.length?microTask.files:(microTask?.file?[microTask.file]:[]),configuredMax=Math.max(0,Math.min(2,Number(portfolio.maxModelCallsPerRun??2)||0)),modelCalls=repairMode==='RULE_PATCH'?0:Math.max(1,configuredMax),candidateId=`${selected.id}-${date.replaceAll('-','')}-${attemptsToday.length+1}`;
  return {
    version:5,run:true,date,selectedReason:reason,gameId:selected.id,gameSlug:selected.slug,gameName:selected.name,sourcePath:selected.sourcePath,profileStatus:selected.profileStatus,mode:selected.mode,projectStage:stage.id,
    goal,microTask,repairMode,responsibilityFiles,diagnosticTopIssue:diagnostic?.topIssue||null,protectedValues:selected.protectedValues??[],candidateId,
    baselineBranch:portfolio.continuousDevelopmentBranch||'autonomous-dev',publicStableBranch:portfolio.publicStableBranch||'main',candidateBranchPrefix:portfolio.candidateBranchPrefix||'autonomous/candidate-',
    queue:{attemptsToday:attemptsToday.length,maxDaily,remainingBeforeSelection:remaining.length},
    budget:{cashKRW:0,paidApi:false,modelCalls,maxModelCalls:configuredMax,maxRunnerMinutes:Number(portfolio.maxRunnerMinutesPerRun??20),emergencyReserveUse:Boolean(incident),policy:'FREE_LIMIT_EQUALS_COMPANY_BUDGET'},
    evidence:{latestArtbookId:book?.id??null,latestArtbookProductionApproval:book?.productionApproval??null,improvementHints:improvementHints(book),actionableImprovementHints:actionableImprovementHints(book),runtimeIncident:incident,developmentBaseline:selectedRow.developmentBaseline,diagnostics:{filesScanned:rawDiagnostic?.filesScanned??0,counts:rawDiagnostic?.counts??{},topIssue:diagnostic?.topIssue??null,editConstraints:diagnosticConstraints(rawDiagnostic)},healthScoreUsedAsGameQuality:false,artbookDevelopmentHandoff:{requestedGameId:requestedPriority||null,matched:selectedRow.artbookHandoffReady,baselineState:book?.lifecycle?.state??null,nextStage:selectedRow.artbookHandoffReady?'technical-architecture/playable-draft':null,featureAnchor:featureAnchor(book)}}
  };
}

function buildDiagnosticsMap(portfolio,catalog={games:[]}){
  const map={};
  for(const project of portfolio?.projects??[]){const stage=classifyProjectStage(project,catalog);if(!stage.codeWork||!clean(project.sourcePath)||!fs.existsSync(project.sourcePath))continue;try{map[project.slug]=diagnoseGame(project.sourcePath);}catch(error){map[project.slug]={issues:[],topIssue:null,counts:{},diagnosticError:error.message};}}
  return map;
}
async function main(){
  const output=process.argv.find(x=>x.startsWith('--output='))?.slice('--output='.length)||'.autonomous/work-order.json',date=process.argv.find(x=>x.startsWith('--date='))?.slice('--date='.length)||kstDate(),priorityGameId=process.argv.find(x=>x.startsWith('--priority-game-id='))?.slice('--priority-game-id='.length)||clean(process.env.AUTONOMOUS_PRIORITY_GAME_ID);
  const portfolio=readJson('autonomous-portfolio.json'),artbooks=readJson('game-artbooks.json',{artbooks:[]}),health=readJson('public-game-health.json',{games:[]}),catalog=readJson('game-catalog.json',{games:[]}),queueState=readJson('.autonomous/queue-state.json',{version:1,attempts:[]});
  const diagnostics=buildDiagnosticsMap(portfolio,catalog),order=buildAutonomousWorkOrder({portfolio,artbooks,health,catalog,diagnostics,queueState,date,priorityGameId});
  writeJson(output,order);console.log(JSON.stringify(order,null,2));
}
if(import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});

export { actionableDiagnostic, actionableImprovementHints, baseGoal, diagnosticConstraints, featureDevelopmentGoal, improvementHints, issueText, kstDate, latestArtbookFor, runtimeIncident, buildDiagnosticsMap, isCompletedDesignBaseline };
