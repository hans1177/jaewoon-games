// 파일명: tools/vibe2-merged-pr-provenance.mjs
// 역할: main에 병합된 PR의 관찰 가능한 메타데이터와 변경 통계만 coding trace ledger에 보존한다.
// 원칙: PR 병합 자체는 검증된 기술 승격이 아니며 raw patch/source/body/session/secret은 저장하지 않는다.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { mergeCodingTraceLedger } from './vibe2-capability-distillation.mjs';

const clean=value=>String(value??'').trim();
const posix=value=>clean(value).replaceAll('\\','/');
const unique=values=>[...new Set((values||[]).map(clean).filter(Boolean))];

function readJson(file,fallback=null){
  if(!file||!fs.existsSync(file))return fallback;
  return JSON.parse(fs.readFileSync(file,'utf8'));
}
function writeJson(file,value){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');
}
function parseArgs(argv=process.argv.slice(2)){
  const out={};
  for(const raw of argv){
    if(!raw.startsWith('--'))continue;
    const body=raw.slice(2),at=body.indexOf('=');
    if(at<0)out[body]=true;else out[body.slice(0,at)]=body.slice(at+1);
  }
  return out;
}
function hash(value){
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}
function redact(value='',max=500){
  let text=clean(value).slice(0,Math.max(0,Number(max)||500));
  const rules=[
    [/\b(gh[pousr]_[A-Za-z0-9_]{16,})\b/g,'[REDACTED_GITHUB_TOKEN]'],
    [/\b(github_pat_[A-Za-z0-9_]{16,})\b/g,'[REDACTED_GITHUB_TOKEN]'],
    [/\b(sk-[A-Za-z0-9_-]{12,})\b/g,'[REDACTED_API_KEY]'],
    [/\b(AKIA[0-9A-Z]{16})\b/g,'[REDACTED_AWS_KEY]'],
    [/\b(password|passwd|token|secret|api[_-]?key)\s*[:=]\s*[^\s,;]+/ig,'$1=[REDACTED]']
  ];
  for(const [pattern,replacement] of rules)text=text.replace(pattern,replacement);
  return text;
}
function teacherClassForBranch(branch=''){
  const value=clean(branch);
  if(/^vibe2\/candidate\//i.test(value))return'VIBE_GENERATED_CODING';
  if(/^(assistant|chatgpt)\//i.test(value))return'ASSISTANT_OR_AUTOMATION_CODING';
  return'UNCLASSIFIED_MERGED_PR_AUTHORSHIP';
}
function codingRelevantPath(file=''){
  const value=posix(file).toLowerCase();
  if(!value)return false;
  if(/\.(?:js|mjs|cjs|ts|tsx|jsx|py|lua|luau|cs|cpp|cc|c|h|hpp|java|kt|go|rs|sh|bash|yml|yaml|json|html|css|sql)$/i.test(value))return true;
  return value.startsWith('.github/workflows/')||value.startsWith('tools/')||value.startsWith('qa/')||value.startsWith('assets/');
}

export function collectMergedPrChangedFiles({repoRoot='.',baseSha='',mergeCommitSha=''}={}){
  const base=clean(baseSha),merge=clean(mergeCommitSha);
  if(!base||!merge)return[];
  const output=execFileSync('git',['diff','--numstat','--no-renames',base,merge],{cwd:repoRoot,encoding:'utf8'});
  const rows=[];
  for(const line of output.split('\n')){
    if(!line.trim())continue;
    const [addedRaw,deletedRaw,...fileParts]=line.split('\t');
    const file=posix(fileParts.join('\t'));
    if(!file)continue;
    const added=/^\d+$/.test(addedRaw)?Number(addedRaw):0;
    const deleted=/^\d+$/.test(deletedRaw)?Number(deletedRaw):0;
    rows.push(Object.freeze({path:file,added,deleted,codingRelevant:codingRelevantPath(file)}));
  }
  return rows;
}

export function buildMergedPullRequestTrace({eventPayload={},changedFiles=[]}={}){
  const pr=eventPayload?.pull_request||{};
  if(pr?.merged!==true)return null;
  const number=Number(eventPayload?.number||pr?.number||0);
  const mergeCommitSha=clean(pr?.merge_commit_sha);
  const baseSha=clean(pr?.base?.sha);
  const headSha=clean(pr?.head?.sha);
  const headBranch=clean(pr?.head?.ref);
  const baseBranch=clean(pr?.base?.ref);
  if(!number||!mergeCommitSha||baseBranch!=='main')return null;
  const files=(changedFiles||[]).map(row=>({
    path:posix(row?.path),
    added:Math.max(0,Number(row?.added)||0),
    deleted:Math.max(0,Number(row?.deleted)||0),
    codingRelevant:row?.codingRelevant===true||codingRelevantPath(row?.path)
  })).filter(row=>row.path).slice(0,400);
  const codingFiles=files.filter(row=>row.codingRelevant);
  const traceId='prtrace_'+hash([number,mergeCommitSha,baseSha,headSha].join('|')).slice(0,24);
  return Object.freeze({
    version:1,
    traceId,
    authority:'OBSERVABLE_CODING_TRACE_PROVENANCE_ONLY',
    source:'MERGED_PULL_REQUEST_PROVENANCE',
    teacherClass:teacherClassForBranch(headBranch),
    task:{
      taskId:`merged-pr-${number}`,
      workKey:null,
      gameId:null,
      target:null,
      roadmapVersion:null,
      baseMainSha:baseSha||null,
      variant:'merged-pr',
      goal:redact(pr?.title||'',500)
    },
    provenance:Object.freeze({
      pullRequestNumber:number,
      baseBranch,
      headBranch:headBranch||null,
      baseSha:baseSha||null,
      headSha:headSha||null,
      mergeCommitSha,
      mergedAt:clean(pr?.merged_at)||null,
      authorLogin:clean(pr?.user?.login)||null,
      authorshipClassification:'BRANCH_CONVENTION_ONLY_NOT_IDENTITY_PROOF',
      prBodyStored:false,
      rawPatchStored:false,
      rawSourceStored:false
    }),
    decision:Object.freeze({
      strategy:null,
      responsibilityConfidence:null,
      primaryTargets:Object.freeze([]),
      primarySystems:Object.freeze([]),
      dependentSystems:Object.freeze([]),
      contextMode:null,
      contextBytes:0,
      failureFingerprint:null,
      patchRecipeMode:null,
      architectureDriftStatus:null,
      architectureDriftRisk:null
    }),
    execution:Object.freeze({
      generationAttempts:0,
      generationAttemptBudget:0,
      recoveryUsed:false,
      candidateBranch:headBranch||null,
      candidateSha:headSha||null
    }),
    changeStats:Object.freeze({
      changedFileCount:files.length,
      codingRelevantFileCount:codingFiles.length,
      addedLineCount:files.reduce((sum,row)=>sum+row.added,0),
      deletedLineCount:files.reduce((sum,row)=>sum+row.deleted,0),
      changedFiles:Object.freeze(files.map(row=>row.path)),
      codingRelevantFiles:Object.freeze(codingFiles.map(row=>row.path)),
      rawPatchStored:false,
      rawCodeStored:false
    }),
    verification:Object.freeze({
      workerOutcome:'MERGED_PROVENANCE_ONLY',
      blocker:null,
      candidateFailureClass:null,
      roleResults:Object.freeze({
        exploration:'UNKNOWN',implementation:'UNKNOWN',test:'UNKNOWN',performance:'UNKNOWN',regression:'UNKNOWN',review:'UNKNOWN'
      }),
      incrementalQaPass:false,
      performancePass:false,
      fullRegressionPass:false,
      reviewPass:false,
      causalReplayStatus:'NOT_APPLICABLE',
      causalReplayExecuted:false,
      causalReplayPrepatchReproduced:false,
      mergeIsNotCapabilityVerification:true
    }),
    metrics:Object.freeze({workerTotalMs:0,candidateMs:0,qaMs:0}),
    evidenceRefs:Object.freeze(unique([`pull-request:${number}`,`merge-commit:${mergeCommitSha}`,baseSha&&`base-main:${baseSha}`])),
    capabilityDomains:Object.freeze([]),
    safety:Object.freeze({
      hiddenChainOfThoughtStored:false,
      rawModelOutputStored:false,
      rawCodeStored:false,
      prBodyStored:false,
      secretsOrCredentialsStored:false,
      reusableBeforeVerification:false,
      directProductionAuthority:false,
      directMainWriteAuthority:false,
      authorityExpanded:false
    })
  });
}

export function runMergedPullRequestProvenance({eventFile='',repoRoot='.',ledgerFile='.vibe2/coding-trace-ledger.json'}={}){
  const event=readJson(eventFile,null);
  if(!event)throw new Error('merged PR event file required');
  const pr=event.pull_request||{};
  if(pr.merged!==true)return Object.freeze({recorded:false,reason:'pull-request-not-merged',trace:null,ledger:null});
  const changedFiles=collectMergedPrChangedFiles({repoRoot,baseSha:pr?.base?.sha,mergeCommitSha:pr?.merge_commit_sha});
  const trace=buildMergedPullRequestTrace({eventPayload:event,changedFiles});
  if(!trace)return Object.freeze({recorded:false,reason:'merged-main-pr-required',trace:null,ledger:null});
  const ledger=mergeCodingTraceLedger(readJson(ledgerFile,{traces:[]}),[trace]);
  writeJson(ledgerFile,ledger);
  return Object.freeze({recorded:true,reason:'merged-pr-provenance-recorded',trace,ledger});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs();
  const result=runMergedPullRequestProvenance({
    eventFile:clean(args.event)||clean(process.env.GITHUB_EVENT_PATH),
    repoRoot:clean(args['repo-root'])||'.',
    ledgerFile:clean(args.ledger)||'.vibe2/coding-trace-ledger.json'
  });
  console.log(`VIBE2_MERGED_PR_PROVENANCE=${result.recorded?'RECORDED':'SKIPPED'}`);
  console.log(`VIBE2_MERGED_PR_REASON=${result.reason}`);
  if(result.trace){
    console.log(`VIBE2_MERGED_PR_TRACE_ID=${result.trace.traceId}`);
    console.log(`VIBE2_MERGED_PR_TEACHER_CLASS=${result.trace.teacherClass}`);
    console.log(`VIBE2_MERGED_PR_CHANGED_FILES=${result.trace.changeStats.changedFileCount}`);
    console.log(`VIBE2_MERGED_PR_CODING_FILES=${result.trace.changeStats.codingRelevantFileCount}`);
  }
  console.log(`VIBE2_MERGED_PR_LEDGER_TOTAL=${result.ledger?.stats?.total||0}`);
}
