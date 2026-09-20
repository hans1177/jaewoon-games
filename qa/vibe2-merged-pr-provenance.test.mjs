// 파일명: qa/vibe2-merged-pr-provenance.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import {
  buildMergedPullRequestTrace,
  collectMergedPrChangedFiles,
  mergeMergedPrProvenanceLedger,
  migrateLegacyMergedPrProvenance,
  runMergedPullRequestProvenance
} from '../tools/vibe2-merged-pr-provenance.mjs';

function event(overrides={}){
  return {
    number:1883,
    pull_request:{
      number:1883,
      merged:true,
      title:'feat: external assistant raw title SHOULD_NOT_PERSIST',
      body:'raw external assistant body SHOULD_NOT_PERSIST',
      merged_at:'2026-09-20T04:15:00Z',
      merge_commit_sha:'merge123',
      user:{login:'hans1177'},
      base:{ref:'main',sha:'base123'},
      head:{ref:'assistant/capability-distillation-phase1-v2',sha:'head123'},
      ...overrides
    }
  };
}

function initRepo(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-pr-provenance-'));
  execFileSync('git',['init','-q'],{cwd:root});
  execFileSync('git',['config','user.name','test'],{cwd:root});
  execFileSync('git',['config','user.email','test@example.com'],{cwd:root});
  fs.mkdirSync(path.join(root,'tools'),{recursive:true});
  fs.writeFileSync(path.join(root,'tools','demo.mjs'),'export const x=1;\n','utf8');
  execFileSync('git',['add','.'],{cwd:root});
  execFileSync('git',['commit','-qm','base'],{cwd:root});
  const base=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  fs.writeFileSync(path.join(root,'tools','demo.mjs'),'export const x=2;\nexport const y=3;\n','utf8');
  execFileSync('git',['add','.'],{cwd:root});
  execFileSync('git',['commit','-qm','change'],{cwd:root});
  const merge=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  return {root,base,merge};
}

test('merged PR provenance stores no raw title/body and does not claim capability verification',()=>{
  const trace=buildMergedPullRequestTrace({
    eventPayload:event(),
    changedFiles:[
      {path:'tools/vibe2-capability-distillation.mjs',added:10,deleted:2,codingRelevant:true},
      {path:'README.md',added:3,deleted:0,codingRelevant:false}
    ]
  });
  assert.match(trace.traceId,/^prtrace_[0-9a-f]{24}$/);
  assert.equal(trace.teacherClass,'ASSISTANT_OR_AUTOMATION_CODING');
  assert.equal(trace.source,'MERGED_PULL_REQUEST_PROVENANCE');
  assert.equal(trace.task.goal,null);
  assert.match(trace.provenance.titleHash,/^[0-9a-f]{64}$/);
  assert.equal(trace.provenance.titleStored,false);
  assert.equal(trace.provenance.prBodyStored,false);
  assert.equal(trace.provenance.rawExternalAiOutputStored,false);
  assert.equal(trace.provenance.rawPatchStored,false);
  assert.equal(trace.changeStats.changedFileCount,2);
  assert.equal(trace.changeStats.codingRelevantFileCount,1);
  assert.equal(trace.changeStats.rawCodeStored,false);
  assert.equal(trace.verification.workerOutcome,'MERGED_PROVENANCE_ONLY');
  assert.equal(trace.verification.fullRegressionPass,false);
  assert.equal(trace.verification.reviewPass,false);
  assert.equal(trace.verification.mergeIsNotCapabilityVerification,true);
  assert.equal(trace.verification.freshTaskQaRequiredBeforeReusablePromotion,true);
  assert.equal(trace.safety.reusableBeforeVerification,false);
  assert.equal(trace.safety.authorityExpanded,false);
  const serialized=JSON.stringify(trace);
  assert.equal(serialized.includes('SHOULD_NOT_PERSIST'),false);
  assert.equal(serialized.includes('external assistant raw title'),false);
  assert.equal(serialized.includes('raw external assistant body'),false);
});

test('branch convention classification never pretends unknown authorship is human or AI proven',()=>{
  const trace=buildMergedPullRequestTrace({
    eventPayload:event({head:{ref:'feature/save-fix',sha:'head999'}}),
    changedFiles:[{path:'web-games/demo/index.html',added:5,deleted:1,codingRelevant:true}]
  });
  assert.equal(trace.teacherClass,'UNCLASSIFIED_MERGED_PR_AUTHORSHIP');
  assert.equal(trace.provenance.authorshipClassification,'BRANCH_CONVENTION_ONLY_NOT_IDENTITY_PROOF');
});

test('non-merged or non-main PR is not converted into provenance trace',()=>{
  assert.equal(buildMergedPullRequestTrace({eventPayload:event({merged:false})}),null);
  assert.equal(buildMergedPullRequestTrace({eventPayload:event({base:{ref:'dev',sha:'base123'}})}),null);
});

test('git diff collector stores filenames and line counts but never patch contents',()=>{
  const {root,base,merge}=initRepo();
  const rows=collectMergedPrChangedFiles({repoRoot:root,baseSha:base,mergeCommitSha:merge});
  assert.equal(rows.length,1);
  assert.equal(rows[0].path,'tools/demo.mjs');
  assert.equal(rows[0].codingRelevant,true);
  assert.equal(rows[0].added,2);
  assert.equal(rows[0].deleted,1);
  assert.equal(JSON.stringify(rows).includes('export const'),false);
});

test('dedicated merged PR ledger deduplicates traces without sharing worker retention',()=>{
  const trace=buildMergedPullRequestTrace({
    eventPayload:event(),
    changedFiles:[{path:'tools/demo.mjs',added:2,deleted:1,codingRelevant:true}]
  });
  const first=mergeMergedPrProvenanceLedger({},[trace]);
  const second=mergeMergedPrProvenanceLedger(first,[trace]);
  assert.equal(first.kind,'vibe2-merged-pr-provenance-ledger');
  assert.equal(first.stats.total,1);
  assert.equal(second.stats.total,1);
  assert.equal(second.stats.refreshed,1);
  assert.equal(second.policy.mergedPrProvenanceOnly,true);
  assert.equal(second.policy.rawTitleStored,false);
  assert.equal(second.policy.rawExternalAiOutputStored,false);
  assert.equal(second.policy.unverifiedAttemptReusable,false);
  assert.equal(second.policy.mayExpandAuthority,false);
});

test('legacy migration removes PR provenance from worker ledger and scrubs old raw title',()=>{
  const oldRawTitle='feat: old raw title MUST_BE_REMOVED';
  const legacy={
    traces:[
      {
        version:1,
        traceId:'ctrace_worker',
        authority:'OBSERVABLE_CODING_TRACE_PROVENANCE_ONLY',
        source:'VIBE2_WORKER_RESULT',
        verification:{workerOutcome:'FAIL',reviewPass:false,fullRegressionPass:false}
      },
      {
        version:1,
        traceId:'prtrace_old',
        authority:'OBSERVABLE_CODING_TRACE_PROVENANCE_ONLY',
        source:'MERGED_PULL_REQUEST_PROVENANCE',
        teacherClass:'ASSISTANT_OR_AUTOMATION_CODING',
        task:{taskId:'merged-pr-1891',goal:oldRawTitle,variant:'merged-pr'},
        provenance:{pullRequestNumber:1891,mergeCommitSha:'oldmerge'},
        verification:{workerOutcome:'MERGED_PROVENANCE_ONLY',reviewPass:false,fullRegressionPass:false},
        safety:{rawModelOutputStored:false}
      }
    ]
  };
  const migrated=migrateLegacyMergedPrProvenance(legacy);
  assert.equal(migrated.migratedCount,1);
  assert.equal(migrated.legacyLedger.traces.length,1);
  assert.equal(migrated.legacyLedger.traces[0].traceId,'ctrace_worker');
  assert.equal(migrated.migrated[0].task.goal,null);
  assert.match(migrated.migrated[0].provenance.titleHash,/^[0-9a-f]{64}$/);
  assert.equal(migrated.migrated[0].provenance.titleStored,false);
  assert.equal(JSON.stringify(migrated).includes(oldRawTitle),false);
});

test('runner migrates legacy PR traces and persists current PR only in dedicated provenance ledger',()=>{
  const {root,base,merge}=initRepo();
  const eventFile=path.join(root,'event.json');
  const ledgerFile=path.join(root,'merged-pr-provenance-ledger.json');
  const legacyLedgerFile=path.join(root,'coding-trace-ledger.json');
  const oldRawTitle='feat: old raw title MUST_BE_REMOVED';
  fs.writeFileSync(eventFile,JSON.stringify(event({
    base:{ref:'main',sha:base},
    head:{ref:'chatgpt/demo',sha:'head456'},
    merge_commit_sha:merge
  })),'utf8');
  fs.writeFileSync(legacyLedgerFile,JSON.stringify({
    traces:[
      {
        traceId:'ctrace_worker',
        authority:'OBSERVABLE_CODING_TRACE_PROVENANCE_ONLY',
        source:'VIBE2_WORKER_RESULT',
        verification:{workerOutcome:'FAIL',reviewPass:false,fullRegressionPass:false}
      },
      {
        traceId:'prtrace_legacy',
        authority:'OBSERVABLE_CODING_TRACE_PROVENANCE_ONLY',
        source:'MERGED_PULL_REQUEST_PROVENANCE',
        task:{taskId:'merged-pr-1891',goal:oldRawTitle,variant:'merged-pr'},
        provenance:{pullRequestNumber:1891,mergeCommitSha:'legacymerge'},
        verification:{workerOutcome:'MERGED_PROVENANCE_ONLY',reviewPass:false,fullRegressionPass:false}
      }
    ]
  }),'utf8');

  const result=runMergedPullRequestProvenance({
    eventFile,repoRoot:root,ledgerFile,legacyLedgerFile
  });
  assert.equal(result.recorded,true);
  assert.equal(result.trace.teacherClass,'ASSISTANT_OR_AUTOMATION_CODING');
  assert.equal(result.legacyMigration.migratedCount,1);
  assert.equal(result.legacyMigration.legacyLedgerRewritten,true);

  const provenanceLedger=JSON.parse(fs.readFileSync(ledgerFile,'utf8'));
  const workerLedger=JSON.parse(fs.readFileSync(legacyLedgerFile,'utf8'));
  assert.equal(provenanceLedger.kind,'vibe2-merged-pr-provenance-ledger');
  assert.equal(provenanceLedger.traces.length,2);
  assert.ok(provenanceLedger.traces.every(row=>row.source==='MERGED_PULL_REQUEST_PROVENANCE'));
  assert.ok(provenanceLedger.traces.every(row=>row.task?.goal===null));
  assert.equal(workerLedger.traces.length,1);
  assert.equal(workerLedger.traces[0].traceId,'ctrace_worker');
  assert.equal(workerLedger.traces.some(row=>row.source==='MERGED_PULL_REQUEST_PROVENANCE'),false);
  assert.equal(JSON.stringify({provenanceLedger,workerLedger}).includes(oldRawTitle),false);
  assert.equal(JSON.stringify(provenanceLedger).includes('external assistant raw title'),false);
});

test('workflow persists only the two provenance retention files and never mutates queue or experience',()=>{
  const workflow=fs.readFileSync('.github/workflows/vibe2-merged-pr-provenance.yml','utf8');
  assert.match(workflow,/\.vibe2\/merged-pr-provenance-ledger\.json/);
  assert.match(workflow,/\.vibe2\/coding-trace-ledger\.json/);
  assert.match(workflow,/--legacy-ledger=/);
  assert.doesNotMatch(workflow,/git add .*\.vibe2\/queue\.json/);
  assert.doesNotMatch(workflow,/git add .*\.vibe2\/experience\.json/);
  assert.match(workflow,/VIBE2_QUEUE_MUTATION=NO/);
  assert.match(workflow,/VIBE2_WAVE_REORDER=NO/);
  assert.match(workflow,/VIBE2_AUTHORITY_EXPANSION=NO/);
});
