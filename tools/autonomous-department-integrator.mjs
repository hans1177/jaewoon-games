// 파일명: tools/autonomous-department-integrator.mjs
// 역할: 부서별 격리 코드 후보를 공통 baseline 기준 3-way merge하고 최종 autonomous 후보 증거를 만든다.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { extractStorageKeys } from './autonomous-development-worker.mjs';
import {
  buildExecutionCheckpoint,
  classifyImplementationImpact,
  compileDevelopmentPolicy,
  failureFingerprint,
  findVerifiedFailureResolution,
  loadLatestVerifiedCheckpoint,
} from './vibe2-development-intelligence.mjs';

const ROLES=['development','graphics','qa','balance'];
const clean=v=>String(v??'').trim();
const posix=v=>String(v??'').replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const exists=file=>{try{return fs.statSync(file),true;}catch{return false;}};
const arg=(name,fallback='')=>process.argv.find(x=>x.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const sha=text=>{const r=spawnSync('git',['hash-object','--stdin'],{input:String(text??''),encoding:'utf8'});return clean(r.stdout);};
function copyTree(from,to){fs.rmSync(to,{recursive:true,force:true});fs.mkdirSync(path.dirname(to),{recursive:true});fs.cpSync(from,to,{recursive:true});}
function safeRelative(value){const v=posix(value);if(!v||v.startsWith('/')||v.split('/').includes('..'))throw new Error(`invalid relative path: ${value}`);return v;}
function deterministicDisjointLineMerge(base,current,theirs){
  const b=base.split('\n'),c=current.split('\n'),t=theirs.split('\n');
  if(b.length!==c.length||b.length!==t.length)return null;
  const changedCurrent=new Set(),changedTheirs=new Set();
  for(let i=0;i<b.length;i++){if(c[i]!==b[i])changedCurrent.add(i);if(t[i]!==b[i])changedTheirs.add(i);}
  for(const i of changedCurrent)if(changedTheirs.has(i)&&c[i]!==t[i])return null;
  const merged=b.map((line,i)=>changedTheirs.has(i)?t[i]:changedCurrent.has(i)?c[i]:line).join('\n');
  return {content:merged,conflict:false,mode:'DISJOINT_LINE_MERGE'};
}
function mergeText(base,current,theirs,label){
  if(current===theirs)return {content:current,conflict:false,mode:'IDENTICAL'};
  if(current===base)return {content:theirs,conflict:false,mode:'THEIRS_ONLY'};
  if(theirs===base)return {content:current,conflict:false,mode:'CURRENT_ONLY'};
  const deterministic=deterministicDisjointLineMerge(base,current,theirs);if(deterministic)return deterministic;
  const dir=fs.mkdtempSync('/tmp/jaewoon-dept-merge-');
  const a=path.join(dir,'current'),b=path.join(dir,'base'),c=path.join(dir,'theirs');
  fs.writeFileSync(a,current);fs.writeFileSync(b,base);fs.writeFileSync(c,theirs);
  const r=spawnSync('git',['merge-file','-p','-L','integrated','-L','baseline','-L',label,a,b,c],{encoding:'utf8'});
  fs.rmSync(dir,{recursive:true,force:true});
  if(![0,1].includes(r.status))throw new Error(`git merge-file failed: ${clean(r.stderr)}`);
  return {content:r.stdout,conflict:r.status===1,mode:'GIT_THREE_WAY'};
}
function syntaxChecks(root,files){
  const checks=[];
  for(const rel of files){
    if(!/\.(?:js|mjs|cjs)$/i.test(rel))continue;
    const r=spawnSync(process.execPath,['--check',path.join(root,rel)],{encoding:'utf8'});
    checks.push({name:`syntax:${rel}`,status:r.status===0?'PASS':'FAIL',detail:clean(r.stderr||'node --check').slice(0,600)});
  }
  return checks;
}
function putOutput(k,v){if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`${k}=${String(v??'').replaceAll('\n',' ')}\n`);}

export function integrateDepartmentCandidates({order,cycle,implementationsDir,candidateId,candidatePath,sourceCommit,resolutionCandidate='',evidencePath,reportPath}={}){
  if(!order?.run)throw new Error('runnable work-order required');
  const sourcePath=posix(order.sourcePath);
  if(!sourcePath.startsWith('web-games/')||sourcePath.includes('/.autonomous-candidates/'))throw new Error(`unsupported source path: ${sourcePath}`);
  if(!exists(sourcePath))throw new Error(`source path missing: ${sourcePath}`);
  const finalId=clean(candidateId);if(!finalId)throw new Error('candidateId required');
  const finalPath=posix(candidatePath);if(!finalPath.startsWith('web-games/.autonomous-candidates/'))throw new Error('final candidate path must stay in autonomous candidate area');
  copyTree(sourcePath,finalPath);

  const proposals=new Map(),components=[];
  for(const role of ROLES){
    const root=path.join(implementationsDir,role),status=readJson(path.join(root,'status.json'),{status:'MISSING'});
    if(status.status!=='PASS'){components.push({role,status:status.status||'NO_SCOPE',reason:status.reason||null});continue;}
    const evidence=readJson(path.join(root,'evidence.json'));
    const game=path.join(root,'game');
    if(!evidence||!exists(game))throw new Error(`${role} implementation artifact incomplete`);
    if(posix(evidence.sourcePath)!==sourcePath)throw new Error(`${role} source path mismatch`);
    if(sourceCommit&&clean(evidence.sourceCommit)!==clean(sourceCommit))throw new Error(`${role} source revision mismatch`);
    const changed=(evidence.changedFiles||[]).map(safeRelative);
    if(changed.length<1)throw new Error(`${role} PASS implementation has no changed files`);
    const allowed=(status.scope||[]).map(posix);
    if(allowed.length&&changed.some(file=>!allowed.includes(file)))throw new Error(`${role} changed outside owned scope`);
    components.push({role,status:'PASS',candidateId:evidence.candidateId,changedFiles:changed,summary:evidence.summary||null,expectedEffect:evidence.expectedEffect||null});
    for(const rel of changed){
      const file=path.join(game,rel);if(!exists(file)||!fs.statSync(file).isFile())throw new Error(`${role} candidate file missing: ${rel}`);
      if(!proposals.has(rel))proposals.set(rel,[]);
      proposals.get(rel).push({role,content:fs.readFileSync(file,'utf8')});
    }
  }
  if(proposals.size<1)throw new Error('no department implementation produced a source change');
  if(proposals.size>4)throw new Error(`integrated changed file count exceeds 4: ${proposals.size}`);

  const conflicts=[],mergeModes=[];
  for(const [rel,variants] of proposals){
    const sourceFile=path.join(sourcePath,rel),base=exists(sourceFile)?fs.readFileSync(sourceFile,'utf8'):'';
    let current=base,conflict=false;
    for(const variant of variants){const merged=mergeText(base,current,variant.content,variant.role);current=merged.content;conflict=conflict||merged.conflict;mergeModes.push({path:rel,role:variant.role,mode:merged.mode});}
    const target=path.join(finalPath,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,current,'utf8');
    if(conflict)conflicts.push({path:rel,roles:variants.map(x=>x.role)});
  }

  if(conflicts.length&&resolutionCandidate){
    const resolutionRoot=posix(resolutionCandidate);
    for(const row of conflicts){
      const resolved=path.join(resolutionRoot,row.path);if(!exists(resolved))throw new Error(`conflict resolver did not produce ${row.path}`);
      const text=fs.readFileSync(resolved,'utf8');if(/^(?:<<<<<<<|=======|>>>>>>>)/m.test(text))throw new Error(`conflict markers remain: ${row.path}`);
      const target=path.join(finalPath,row.path);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,text,'utf8');
      row.resolved=true;
    }
  }

  const unresolved=conflicts.filter(x=>x.resolved!==true);
  const changedFiles=[...proposals.keys()].sort();
  const report={version:1,status:unresolved.length?'CONFLICT':'PASS',gameId:order.gameId,gameSlug:order.gameSlug,sourcePath,candidateId:finalId,candidatePath:finalPath,sourceCommit,components,changedFiles,conflicts,conflictCount:unresolved.length,mergeMode:'COMMON_BASE_THREE_WAY',mergeModes,sameFilePolicy:'AUTO_MERGE_NON_OVERLAPPING_THEN_AI_RESOLVE_TRUE_CONFLICT'};
  writeJson(reportPath,report);
  putOutput('status',report.status);putOutput('conflict_count',unresolved.length);putOutput('candidate_path',finalPath);putOutput('report_path',reportPath);
  if(unresolved.length)return report;

  const saveViolations=[];
  for(const rel of changedFiles){
    const beforeFile=path.join(sourcePath,rel),afterFile=path.join(finalPath,rel);
    const before=exists(beforeFile)?fs.readFileSync(beforeFile,'utf8'):'',after=fs.readFileSync(afterFile,'utf8');
    if(sha(before)===sha(after))throw new Error(`integrated no-op: ${rel}`);
    const beforeKeys=extractStorageKeys(before),afterKeys=extractStorageKeys(after);
    if(JSON.stringify(beforeKeys)!==JSON.stringify(afterKeys))saveViolations.push({path:rel,before:beforeKeys,after:afterKeys});
  }
  if(saveViolations.length)throw new Error(`integrated save key change: ${saveViolations.map(x=>x.path).join(',')}`);
  const syntax=syntaxChecks(finalPath,changedFiles);if(syntax.some(x=>x.status!=='PASS'))throw new Error(`integrated syntax failure: ${syntax.filter(x=>x.status!=='PASS').map(x=>x.name).join(',')}`);

  const diagnostic=order.diagnosticTopIssue||order.microTask||null;
  const fingerprint=diagnostic&&(diagnostic.type||diagnostic.message)?failureFingerprint({type:diagnostic.type,message:diagnostic.message||order.goal,stack:diagnostic.stack,test:diagnostic.test,platform:order.targetEngine||order.projectStage,file:diagnostic.file}):null;
  const priorCheckpoint=loadLatestVerifiedCheckpoint({gameId:order.gameId,role:'integration'});
  const priorResolution=fingerprint?findVerifiedFailureResolution({gameId:order.gameId,fingerprint}):null;
  const implementationImpact=classifyImplementationImpact({changedFiles,role:components.filter(x=>x.status==='PASS').length===1?components.find(x=>x.status==='PASS')?.role:'integration'});
  const policy=compileDevelopmentPolicy({
    role:'integration',
    verifiedLearning:{priorCheckpointCandidateId:priorCheckpoint?.candidateId||null,priorFailureResolutionCandidateId:priorResolution?.candidateId||null},
    projectPolicy:{sourcePath,workLane:order.workLane||'FULL',repairMode:order.repairMode||'MODEL'},
    agentsPolicy:{sourceRootExclusive:true,protectedValues:order.protectedValues||[],independentQaRequired:true},
    activeIntent:{goal:cycle?.finalGoal||order.goal,gameId:order.gameId},
  });
  const acceptanceCriteria=[...new Set((cycle?.results||[]).flatMap(x=>x.checks||[]))].slice(0,8);
  const checkpoint=buildExecutionCheckpoint({
    gameId:order.gameId,role:'integration',sourceCommit,candidateId:finalId,goal:cycle?.finalGoal||order.goal,
    completed:components.filter(x=>x.status==='PASS').map(x=>`${x.role}: ${clean(x.summary||x.expectedEffect||'implementation')}`),changedFiles,
    nextAction:'독립 후보 QA와 Vibe2 release gate를 통과한 뒤에만 승격한다.',pendingCi:['INDEPENDENT_PROMOTION_QA','VIBE2_RELEASE_GATE'],acceptanceCriteria,fingerprint,status:'IMPLEMENTED_PENDING_QA'
  });

  const evidence={version:5,candidateOnly:true,selfPromote:false,publicStableModified:false,paidApi:false,model:'PARALLEL_DEPARTMENT_LOCAL_AI',modelTransport:'ISOLATED_DEPARTMENT_WORKSPACES_THREE_WAY_INTEGRATION',modelAttempts:components.filter(x=>x.status==='PASS').length,repairMode:order.repairMode||'MODEL',gameId:order.gameId,gameSlug:order.gameSlug,sourcePath,candidateId:finalId,candidatePath:finalPath,sourceCommit,goal:cycle?.finalGoal||order.goal,responsibilityFiles:[...new Set(components.flatMap(x=>x.changedFiles||[]))],changedFiles,summary:'Integrated parallel department implementation',expectedEffect:'Department-owned code changes combined after planning integration',proposedTests:acceptanceCriteria,changeMode:'PARALLEL_DEPARTMENT_INTEGRATION',fileCount:changedFiles.length,editCount:0,saveKeyValidation:'PASS',syntaxChecks:syntax,departmentCycle:cycle,departmentCycleGate:'PASS',departmentImplementations:components,integration:{mode:'COMMON_BASE_THREE_WAY',mergeModes,conflictsResolved:conflicts.length,conflicts,finalIntegrationQa:'PENDING_INDEPENDENT_PROMOTION_GATE'},vibe2DevelopmentIntelligence:{version:2,contextPlan:order.vibe2ContextPlan||null,failureFingerprint:fingerprint,priorVerifiedResolution:priorResolution,priorVerifiedCheckpoint:priorCheckpoint,implementationImpact,policy,checkpoint},generatedAt:new Date().toISOString(),completionAuthority:'INDEPENDENT_QA_AND_JAY'};
  writeJson(evidencePath,evidence);report.evidencePath=evidencePath;writeJson(reportPath,report);return report;
}

async function main(){
  const orderFile=arg('order','.autonomous/work-order.json'),cycleFile=arg('cycle','department-cycle.json'),implDir=arg('implementations','department-implementations');
  const candidateId=arg('candidate-id'),candidatePath=arg('candidate-path'),sourceCommit=arg('source-commit'),resolutionCandidate=arg('resolution-candidate','');
  const evidencePath=arg('evidence',`.autonomous/evidence/${candidateId}.json`),reportPath=arg('report','department-integration.json');
  const order=readJson(orderFile),cycle=readJson(cycleFile);
  const report=integrateDepartmentCandidates({order,cycle,implementationsDir:implDir,candidateId,candidatePath,sourceCommit,resolutionCandidate,evidencePath,reportPath});
  console.log(JSON.stringify(report,null,2));
}
if(import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
