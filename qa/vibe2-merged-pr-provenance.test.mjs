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
  runMergedPullRequestProvenance
} from '../tools/vibe2-merged-pr-provenance.mjs';

function event(overrides={}){
  return {
    number:1883,
    pull_request:{
      number:1883,
      merged:true,
      title:'feat: add capability token=SHOULD_NEVER_BE_STORED_RAW',
      body:'raw external assistant output SHOULD_NEVER_BE_STORED_RAW',
      merged_at:'2026-09-20T04:15:00Z',
      merge_commit_sha:'merge123',
      user:{login:'hans1177',type:'User'},
      base:{ref:'main',sha:'base123'},
      head:{ref:'assistant/capability-distillation-phase1-v2',sha:'head123'},
      ...overrides
    }
  };
}

test('merged PR provenance stores metadata only and never treats merge as verification',()=>{
  const trace=buildMergedPullRequestTrace({
    eventPayload:event(),
    changedFiles:[
      {path:'tools/vibe2-capability-distillation.mjs',added:10,deleted:2,codingRelevant:true},
      {path:'README.md',added:3,deleted:0,codingRelevant:false}
    ]
  });
  assert.match(trace.traceId,/^prtrace_[0-9a-f]{24}$/);
  assert.equal(trace.teacherClass,'ASSISTANT_GENERATED_CODING');
  assert.equal(trace.source,'MERGED_PULL_REQUEST_PROVENANCE');
  assert.equal(trace.task.goal,null);
  assert.equal(trace.provenance.titleStored,false);
  assert.equal(trace.provenance.prBodyStored,false);
  assert.equal(trace.provenance.rawExternalAiOutputStored,false);
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
  assert.equal(serialized.includes('SHOULD_NEVER_BE_STORED_RAW'),false);
  assert.equal(serialized.includes('feat: add capability'),false);
});

test('unknown branch authorship stays unclassified instead of guessing human or AI identity',()=>{
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
  const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  const rows=collectMergedPrChangedFiles({repoRoot:root,baseSha:base,mergeCommitSha:head});
  assert.equal(rows.length,1);
  assert.equal(rows[0].path,'tools/demo.mjs');
  assert.equal(rows[0].codingRelevant,true);
  assert.equal(rows[0].added,2);
  assert.equal(rows[0].deleted,1);
  assert.equal(JSON.stringify(rows).includes('export const'),false);
});

test('merged PR ledger is separate provenance-only state with deterministic dedupe',()=>{
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
  assert.equal(second.policy.mergeIsNotCapabilityVerification,true);
  assert.equal(second.policy.rawTitleStored,false);
  assert.equal(second.policy.rawExternalAiOutputStored,false);
  assert.equal(second.policy.freshTaskQaRequiredBeforeReusablePromotion,true);
});

test('runner accepts already-filtered file metadata and writes only provenance ledger',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-pr-run-'));
  const eventFile=path.join(root,'event.json');
  const filesFile=path.join(root,'files.json');
  const ledgerFile=path.join(root,'merged-pr-provenance-ledger.json');
  fs.writeFileSync(eventFile,JSON.stringify(event()),'utf8');
  fs.writeFileSync(filesFile,JSON.stringify([
    {filename:'tools/demo.mjs',additions:2,deletions:1,changes:3}
  ]),'utf8');
  const result=runMergedPullRequestProvenance({eventFile,changedFilesFile:filesFile,repoRoot:root,ledgerFile});
  assert.equal(result.recorded,true);
  assert.equal(result.trace.teacherClass,'ASSISTANT_GENERATED_CODING');
  const ledger=JSON.parse(fs.readFileSync(ledgerFile,'utf8'));
  assert.equal(ledger.traces.length,1);
  assert.equal(ledger.kind,'vibe2-merged-pr-provenance-ledger');
  assert.equal(ledger.traces[0].verification.mergeIsNotCapabilityVerification,true);
});

test('workflow uses trusted pull_request_target context without checking out PR head or mutating queue/experience',()=>{
  const workflow=fs.readFileSync('.github/workflows/vibe2-merged-pr-provenance.yml','utf8');
  assert.match(workflow,/pull_request_target:/);
  assert.match(workflow,/types: \[closed\]/);
  assert.match(workflow,/ref: main/);
  assert.match(workflow,/ref: vibe2-unreal-core/);
  assert.match(workflow,/\.vibe2\/merged-pr-provenance-ledger\.json/);
  assert.doesNotMatch(workflow,/github\.event\.pull_request\.head\.sha/);
  assert.doesNotMatch(workflow,/checkout.*head/i);
  assert.doesNotMatch(workflow,/\.vibe2\/queue\.json/);
  assert.doesNotMatch(workflow,/\.vibe2\/experience\.json/);
  assert.match(workflow,/VIBE2_AUTHORITY_EXPANSION=NO/);
});
