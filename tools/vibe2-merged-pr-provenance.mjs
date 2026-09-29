// 파일명: tools/vibe2-merged-pr-provenance.mjs
// 역할: main에 병합된 PR의 관찰 가능한 메타데이터와 변경 통계만 전용 provenance ledger에 보존한다.
// 원칙: PR 병합 자체는 검증된 기술 승격이 아니며 raw title/body/patch/source/model-output/session/secret은 저장하지 않는다.

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
function redactMetadata(value='',max=320){
  let text=clean(value).slice(0,Math.max(0,Number(max)||320));
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
function normalizeChangedFiles(changedFiles=[]){
  return (changedFiles||[]).map(row=>{
    const file=posix(row?.path||row?.filename);
    return Object.freeze({
      path:redactMetadata(file,400),
      added:Math.max(0,Number(row?.added??row?.additions)||0),
      deleted:Math.max(0,Number(row?.deleted??row?.deletions)||0),
      codingRelevant:row?.codingRelevant===true||codingRelevantPath(file)
    });
  }).filter(row=>row.path).slice(0,400);
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
    rows.push({
      path:file,
      added:/^\d+$/.test(addedRaw)?Number(addedRaw):0,
      deleted:/^\d+$/.test(deletedRaw)?Number(deletedRaw):0,
      codingRelevant:codingRelevantPath(file)
    });
  }
  return normalizeChangedFiles(rows);
}

export function buildMergedPullRequestTrace({eventPayload={},changedFiles=[]}={}){
  const pr=eventPayload?.pull_request||{};
  if(pr?.merged!==true)return null;
  const number=Number(eventPayload?.number||pr?.number||0);
  const mergeCommitSha=clean(pr?.merge_commit_sha);
  const baseSha=clean(pr?.base?.sha);
  const headSha=clean(pr?.head?.sha);
  const headBranch=redactMetadata(pr?.head?.ref,180);
  const baseBranch=clean(pr?.base?.ref);
  if(!number||!mergeCommitSha||baseBranch!=='main')return null;

  const files=normalizeChangedFiles(changedFiles);
  const codingFiles=files.filter(row=>row.codingRelevant);
  const rawTitle=clean(pr?.title);
  const traceId='prtrace_'+hash([number,mergeCommitSha,baseSha,headSha].join('|')).slice(0,24);

  return Object.freeze({
    version:2,
    traceId,
    authority:'OBSERVABLE_CODING_TRACE_PROVENANCE_ONLY',
    source:'MERGED_PULL_REQUEST_PROVENANCE',
    teacherClass:teacherClassForBranch(headBranch),
    task:Object.freeze({
      taskId:`merged-pr-${number}`,
      workKey:null,
      gameId:null,
      target:null,
      roadmapVersion:null,
      baseMainSha:baseSha||null,
      variant:'merged-pr',
      goal:null
    }),
    provenance:Object.freeze({
      pullRequestNumber:number,
      baseBranch,
      headBranch:headBranch||null,
      baseSha:baseSha||null,
      headSha:headSha||null,
      mergeCommitSha,
      mergedAt:clean(pr?.merged_at)||null,
      authorLogin:redactMetadata(pr?.user?.login,120)||null,
      titleHash:rawTitle?hash(rawTitle):null,
      titleHashAlgorithm:rawTitle?'sha256':null,
      titleStored:false,
      prBodyStored:false,
      rawExternalAiOutputStored:false,
      rawPatchStored:false,
      rawSourceStored:false,
      authorshipClassification:'BRANCH_CONVENTION_ONLY_NOT_IDENTITY_PROOF'
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
        exploration:'UNKNOWN',implementation:'UNKNOWN',test:'UNKNOWN',
        performance:'UNKNOWN',regression:'UNKNOWN',review:'UNKNOWN'
      }),
      incrementalQaPass:false,
      performancePass:false,
      fullRegressionPass:false,
      reviewPass:false,
      causalReplayStatus:'NOT_APPLICABLE',
      causalReplayExecuted:false,
      causalReplayPrepatchReproduced:false,
      mergeIsNotCapabilityVerification:true,
      freshTaskQaRequiredBeforeReusablePromotion:true
    }),
    metrics:Object.freeze({workerTotalMs:0,candidateMs:0,qaMs:0}),
    evidenceRefs:Object.freeze(unique([
      `pull-request:${number}`,
      `merge-commit:${mergeCommitSha}`,
      baseSha&&`base-main:${baseSha}`
    ])),
    capabilityDomains:Object.freeze([]),
    safety:Object.freeze({
      hiddenChainOfThoughtStored:false,
      rawModelOutputStored:false,
      rawExternalAiOutputStored:false,
      rawCodeStored:false,
      rawTitleStored:false,
      prBodyStored:false,
      secretsOrCredentialsStored:false,
      reusableBeforeVerification:false,
      directProductionAuthority:false,
      directMainWriteAuthority:false,
      automaticPromotionAuthority:false,
      authorityExpanded:false
    })
  });
}

export function sanitizeMergedPullRequestTrace(trace={}){
  const oldGoal=clean(trace?.task?.goal);
  const existingTitleHash=clean(trace?.provenance?.titleHash);
  return Object.freeze({
    ...trace,
    version:Math.max(2,Number(trace?.version)||0),
    authority:'OBSERVABLE_CODING_TRACE_PROVENANCE_ONLY',
    source:'MERGED_PULL_REQUEST_PROVENANCE',
    task:Object.freeze({
      ...(trace?.task||{}),
      goal:null
    }),
    provenance:Object.freeze({
      ...(trace?.provenance||{}),
      titleHash:existingTitleHash||(oldGoal?hash(oldGoal):null),
      titleHashAlgorithm:(existingTitleHash||oldGoal)?'sha256':null,
      titleStored:false,
      prBodyStored:false,
      rawExternalAiOutputStored:false,
      rawPatchStored:false,
      rawSourceStored:false
    }),
    verification:Object.freeze({
      ...(trace?.verification||{}),
      mergeIsNotCapabilityVerification:true,
      freshTaskQaRequiredBeforeReusablePromotion:true
    }),
    safety:Object.freeze({
      ...(trace?.safety||{}),
      hiddenChainOfThoughtStored:false,
      rawModelOutputStored:false,
      rawExternalAiOutputStored:false,
      rawCodeStored:false,
      rawTitleStored:false,
      prBodyStored:false,
      secretsOrCredentialsStored:false,
      reusableBeforeVerification:false,
      directProductionAuthority:false,
      directMainWriteAuthority:false,
      automaticPromotionAuthority:false,
      authorityExpanded:false
    })
  });
}

export function mergeMergedPrProvenanceLedger(ledgerInput={},traces=[]){
  const current=Array.isArray(ledgerInput?.traces)
    ?ledgerInput.traces.filter(row=>row?.source==='MERGED_PULL_REQUEST_PROVENANCE'&&clean(row?.traceId))
    :[];
  const map=new Map(current.map(row=>[clean(row.traceId),sanitizeMergedPullRequestTrace(row)]));
  let added=0,refreshed=0;
  for(const raw of traces||[]){
    if(!raw||raw?.source!=='MERGED_PULL_REQUEST_PROVENANCE'||!clean(raw?.traceId))continue;
    const trace=sanitizeMergedPullRequestTrace(raw);
    if(map.has(trace.traceId))refreshed+=1;else added+=1;
    map.set(trace.traceId,trace);
  }
  const rows=[...map.values()].slice(-5000);
  return Object.freeze({
    version:1,
    kind:'vibe2-merged-pr-provenance-ledger',
    policy:Object.freeze({
      provenanceOnlyUntilVerified:true,
      mergedPrProvenanceOnly:true,
      mergeIsNotCapabilityVerification:true,
      rawTitleStored:false,
      prBodyStored:false,
      rawPatchStored:false,
      rawCodeStored:false,
      rawModelOutputStored:false,
      rawExternalAiOutputStored:false,
      hiddenChainOfThoughtStored:false,
      secretsOrCredentialsStored:false,
      unverifiedAttemptReusable:false,
      freshTaskQaRequiredBeforeReusablePromotion:true,
      canonicalLearningPipelineOnly:true,
      mayExpandAuthority:false
    }),
    traces:Object.freeze(rows),
    stats:Object.freeze({added,refreshed,total:rows.length})
  });
}

export function migrateLegacyMergedPrProvenance(legacyLedgerInput={}){
  const current=Array.isArray(legacyLedgerInput?.traces)?legacyLedgerInput.traces.filter(row=>row&&clean(row?.traceId)):[];
  const migrated=current
    .filter(row=>row?.source==='MERGED_PULL_REQUEST_PROVENANCE')
    .map(sanitizeMergedPullRequestTrace);
  const workerTraces=current.filter(row=>row?.source!=='MERGED_PULL_REQUEST_PROVENANCE');
  const legacyLedger=mergeCodingTraceLedger({traces:workerTraces},[]);
  return Object.freeze({
    migrated:Object.freeze(migrated),
    migratedCount:migrated.length,
    legacyLedger
  });
}

export function runMergedPullRequestProvenance({
  eventFile='',
  repoRoot='.',
  ledgerFile='.vibe2/merged-pr-provenance-ledger.json',
  legacyLedgerFile='.vibe2/coding-trace-ledger.json'
}={}){
  const event=readJson(eventFile,null);
  if(!event)throw new Error('merged PR event file required');
  const pr=event.pull_request||{};
  if(pr.merged!==true)return Object.freeze({
    recorded:false,reason:'pull-request-not-merged',trace:null,ledger:null,legacyMigration:null
  });

  const changedFiles=collectMergedPrChangedFiles({
    repoRoot,
    baseSha:pr?.base?.sha,
    mergeCommitSha:pr?.merge_commit_sha
  });
  const trace=buildMergedPullRequestTrace({eventPayload:event,changedFiles});
  if(!trace)return Object.freeze({
    recorded:false,reason:'merged-main-pr-required',trace:null,ledger:null,legacyMigration:null
  });

  const legacyExists=Boolean(legacyLedgerFile&&fs.existsSync(legacyLedgerFile));
  const migration=migrateLegacyMergedPrProvenance(
    legacyExists?readJson(legacyLedgerFile,{traces:[]}):{traces:[]}
  );
  const ledger=mergeMergedPrProvenanceLedger(
    readJson(ledgerFile,{traces:[]}),
    [...migration.migrated,trace]
  );

  writeJson(ledgerFile,ledger);
  if(legacyExists&&migration.migratedCount>0)writeJson(legacyLedgerFile,migration.legacyLedger);

  return Object.freeze({
    recorded:true,
    reason:'merged-pr-provenance-recorded',
    trace,
    ledger,
    legacyMigration:Object.freeze({
      migratedCount:migration.migratedCount,
      legacyLedgerRewritten:legacyExists&&migration.migratedCount>0
    })
  });
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs();
  const result=runMergedPullRequestProvenance({
    eventFile:clean(args.event)||clean(process.env.GITHUB_EVENT_PATH),
    repoRoot:clean(args['repo-root'])||'.',
    ledgerFile:clean(args.ledger)||'.vibe2/merged-pr-provenance-ledger.json',
    legacyLedgerFile:clean(args['legacy-ledger'])||'.vibe2/coding-trace-ledger.json'
  });
  console.log(`VIBE2_MERGED_PR_PROVENANCE=${result.recorded?'RECORDED':'SKIPPED'}`);
  console.log(`VIBE2_MERGED_PR_REASON=${result.reason}`);
  if(result.trace){
    console.log(`VIBE2_MERGED_PR_TRACE_ID=${result.trace.traceId}`);
    console.log(`VIBE2_MERGED_PR_TEACHER_CLASS=${result.trace.teacherClass}`);
    console.log(`VIBE2_MERGED_PR_CHANGED_FILES=${result.trace.changeStats.changedFileCount}`);
    console.log(`VIBE2_MERGED_PR_CODING_FILES=${result.trace.changeStats.codingRelevantFileCount}`);
  }
  console.log(`VIBE2_MERGED_PR_LEGACY_MIGRATED=${result.legacyMigration?.migratedCount||0}`);
  console.log(`VIBE2_MERGED_PR_LEDGER_TOTAL=${result.ledger?.stats?.total||0}`);
}
