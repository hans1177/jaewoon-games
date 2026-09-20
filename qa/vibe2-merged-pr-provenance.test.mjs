import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import {
  buildMergedPullRequestTrace,
  collectMergedPrChangedFiles,
  runMergedPullRequestProvenance
} from '../tools/vibe2-merged-pr-provenance.mjs';

function event(overrides={}){
  return {
    number:1883,
    pull_request:{
      number:1883,
      merged:true,
      title:'feat: add capability token=SHOULD_NOT_PERSIST',
      merged_at:'2026-09-20T04:15:00Z',
      merge_commit_sha:'merge123',
      user:{login:'hans1177'},
      base:{ref:'main',sha:'base123'},
      head:{ref:'assistant/capability-distillation-phase1-v2',sha:'head123'},
      ...overrides
    }
  };
}

test('merged PR provenance captures metadata only and does not claim capability verification',()=>{
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
  assert.equal(trace.task.goal.includes('SHOULD_NOT_PERSIST'),false);
  assert.equal(trace.provenance.prBodyStored,false);
  assert.equal(trace.provenance.rawPatchStored,false);
  assert.equal(trace.changeStats.changedFileCount,2);
  assert.equal(trace.changeStats.codingRelevantFileCount,1);
  assert.equal(trace.changeStats.rawCodeStored,false);
  assert.equal(trace.verification.workerOutcome,'MERGED_PROVENANCE_ONLY');
  assert.equal(trace.verification.fullRegressionPass,false);
  assert.equal(trace.verification.reviewPass,false);
  assert.equal(trace.verification.mergeIsNotCapabilityVerification,true);
  assert.equal(trace.safety.reusableBeforeVerification,false);
  assert.equal(trace.safety.authorityExpanded,false);
});

test('branch convention classification never pretends unknown authorship is human or AI proven',()=>{
  const trace=buildMergedPullRequestTrace({
    eventPayload:event({head:{ref:'feature/save-fix',sha:'head999'}}),
    changedFiles:[{path:'web-games/demo/index.html',added:5,deleted:1,codingRelevant:true}]
  });
  assert.equal(trace.teacherClass,'UNCLASSIFIED_MERGED_PR_AUTHORSHIP');
  assert.equal(trace.provenance.authorshipClassification,'BRANCH_CONVENTION_ONLY_NOT_IDENTITY_PROOF');
});

test('non-merged or non-main PR is not converted into a provenance trace',()=>{
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

test('runner persists merged provenance into existing trace ledger and remains provenance-only',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-pr-run-'));
  execFileSync('git',['init','-q'],{cwd:root});
  execFileSync('git',['config','user.name','test'],{cwd:root});
  execFileSync('git',['config','user.email','test@example.com'],{cwd:root});
  fs.writeFileSync(path.join(root,'demo.js'),'const x=1;\n','utf8');
  execFileSync('git',['add','.'],{cwd:root});
  execFileSync('git',['commit','-qm','base'],{cwd:root});
  const base=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  fs.writeFileSync(path.join(root,'demo.js'),'const x=2;\n','utf8');
  execFileSync('git',['add','.'],{cwd:root});
  execFileSync('git',['commit','-qm','merge'],{cwd:root});
  const merge=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  const eventFile=path.join(root,'event.json');
  const ledgerFile=path.join(root,'ledger.json');
  fs.writeFileSync(eventFile,JSON.stringify(event({
    base:{ref:'main',sha:base},
    head:{ref:'chatgpt/demo',sha:'head456'},
    merge_commit_sha:merge
  })),'utf8');
  const result=runMergedPullRequestProvenance({eventFile,repoRoot:root,ledgerFile});
  assert.equal(result.recorded,true);
  assert.equal(result.trace.teacherClass,'ASSISTANT_OR_AUTOMATION_CODING');
  const ledger=JSON.parse(fs.readFileSync(ledgerFile,'utf8'));
  assert.equal(ledger.traces.length,1);
  assert.equal(ledger.policy.provenanceOnlyUntilVerified,true);
  assert.equal(ledger.policy.unverifiedAttemptReusable,false);
  assert.equal(ledger.traces[0].verification.mergeIsNotCapabilityVerification,true);
});
