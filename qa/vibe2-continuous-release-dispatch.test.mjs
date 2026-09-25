import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const workflow=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
const releaseWorkflow=fs.readFileSync('.github/workflows/vibe2-candidate-release.yml','utf8');

function count(needle){
  return workflow.split(needle).length-1;
}

test('reviewed winner release dispatch remains structurally intact',()=>{
  assert.equal(count('      - name: Dispatch reviewed winner candidates to release gate'),1);
  assert.equal(count('      - name: Upload generated machine handoff and role review'),1);
  assert.equal(count('      - name: Aggregate Vibe2 parallelism telemetry'),1);
  assert.equal(count('      - name: Event-driven fan-in refill fallback'),1);

  const dispatch=workflow.indexOf('      - name: Dispatch reviewed winner candidates to release gate');
  const upload=workflow.indexOf('      - name: Upload generated machine handoff and role review');
  const telemetry=workflow.indexOf('      - name: Aggregate Vibe2 parallelism telemetry');
  const refill=workflow.indexOf('      - name: Event-driven fan-in refill fallback');
  assert.ok(dispatch>0&&dispatch<upload&&upload<telemetry&&telemetry<refill);

  const section=workflow.slice(dispatch,upload);
  assert.match(section,/while IFS=\$'\\t' read -r task_id candidate_branch; do/);
  assert.match(section,/done < \/tmp\/vibe2-release-candidates\.tsv/);
  assert.match(section,/actions\/workflows\/vibe2-candidate-release\.yml\/dispatches/);
  assert.match(section,/VIBE2_RELEASE_DISPATCHED=/);

  assert.doesNotMatch(workflow,/while IFS=\s*\n\s*uses:/);
  assert.doesNotMatch(workflow,/^\\t' read -r task_id candidate_branch; do/m);
});

test('candidate release dispatch cannot claim review or release itself',()=>{
  const dispatch=workflow.indexOf('      - name: Dispatch reviewed winner candidates to release gate');
  const upload=workflow.indexOf('      - name: Upload generated machine handoff and role review');
  const section=workflow.slice(dispatch,upload);
  assert.match(section,/vibe2-candidate-release\.yml/);
  assert.doesNotMatch(section,/outcome=['"]?PASS/i);
  assert.doesNotMatch(section,/release[_ -]?passed/i);
});


test('candidate release selects the manifest bound to the submitted branch',()=>{
  assert.match(releaseWorkflow,/matching_manifests=\(\)/);
  assert.match(releaseWorkflow,/manifest_branch=.*m\.branch/);
  assert.match(releaseWorkflow,/\[ "\$manifest_branch" = "\$SUBMITTED_CANDIDATE_BRANCH" \]/);
  assert.match(releaseWorkflow,/VIBE2_CANDIDATE_MANIFEST_MATCH=/);
  assert.match(releaseWorkflow,/candidate-manifest-not-unique-for-branch/);
  assert.match(releaseWorkflow,/VIBE2_CANDIDATE_MANIFEST_LEGACY_SINGLE=/);
  assert.doesNotMatch(releaseWorkflow,/reason=manifest-count-invalid/);
});


test('web candidate release checks inline scripts and preserves generic storage contract meaning',()=>{
  const start=releaseWorkflow.indexOf('      - name: Web syntax QA');
  const end=releaseWorkflow.indexOf('      - name: Promote approved web source root through reviewed PR',start);
  const section=releaseWorkflow.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.match(section,/BASE_SHA:/);
  assert.match(section,/matchAll\(\/<script\\b/);
  assert.match(section,/execFileSync\(process\.execPath,\['--check',tmp\]/);
  assert.match(section,/const storageContract=raw=>/);
  assert.match(section,/literalKeys/);
  assert.match(section,/variableBindings/);
  assert.match(section,/VIBE2_WEB_SAVE_CONTRACT_MUTATION/);
  assert.match(section,/VIBE2_WEB_INLINE_SCRIPT_QA=PASS/);
  assert.match(section,/VIBE2_WEB_SAVE_KEY_COMPATIBILITY=PASS/);
});


test('web candidate release inline QA module itself compiles',()=>{
  const webQa=releaseWorkflow.slice(
    releaseWorkflow.indexOf('- name: Web syntax QA'),
    releaseWorkflow.indexOf('- name: Promote approved web source root through reviewed PR')
  );
  const match=/node --input-type=module <<'NODE'\n([\s\S]*?)\n\s+NODE/.exec(webQa);
  assert.ok(match,'Web syntax QA module heredoc must remain extractable');
  const source=match[1].split('\n').map(line=>line.replace(/^ {10}/,'')).join('\n');
  const temp=path.join(os.tmpdir(),`vibe2-release-inline-${process.pid}.mjs`);
  try{
    fs.writeFileSync(temp,source,'utf8');
    execFileSync(process.execPath,['--check',temp],{stdio:'pipe'});
  }finally{
    fs.rmSync(temp,{force:true});
  }
});

test('web candidate release blocks inline script syntax and generic storage-contract regressions',()=>{
  const section=releaseWorkflow.slice(releaseWorkflow.indexOf('- name: Web syntax QA'),releaseWorkflow.indexOf('- name: Promote approved web source root through reviewed PR'));
  assert.match(section,/VIBE2_WEB_INLINE_SCRIPT_QA=PASS/);
  assert.match(section,/VIBE2_WEB_SAVE_KEY_COMPATIBILITY=PASS/);
  assert.match(section,/node --check/);
  assert.match(section,/\.filter\(match=>!\/\\bsrc\\s\*=\\s\*\/i\.test/);
  assert.match(section,/storageContract\(base\)/);
  assert.match(section,/storageContract\(source\)/);
  assert.match(section,/VIBE2_WEB_SAVE_CONTRACT_MUTATION/);
  assert.match(releaseWorkflow,/git -C \/tmp\/vibe2-control fetch origin main:refs\/remotes\/origin\/main --quiet/);
});


test('candidate release queue recovery always fetches main into an explicit remote-tracking ref',()=>{
  const explicit='git -C /tmp/vibe2-control fetch origin main:refs/remotes/origin/main --quiet';
  const legacy='git -C /tmp/vibe2-control fetch origin main --quiet';
  const clones=releaseWorkflow.split('git clone --branch vibe2-unreal-core --single-branch').length-1;
  const explicitFetches=releaseWorkflow.split(explicit).length-1;
  assert.ok(clones>=4);
  assert.equal(explicitFetches,clones);
  assert.equal(releaseWorkflow.includes(legacy),false);
  assert.match(releaseWorkflow,/worktree add --detach \/tmp\/vibe2-main-contract origin\/main/);
});

test('Unity release baseline uses minimum design and Unity native evidence without Web gameplay authority',()=>{
  const start=releaseWorkflow.indexOf("if [ \"$decision\" = 'unity' ] && [ \"$production_class\" = 'RELEASE_CONFIRMED' ]");
  const end=releaseWorkflow.indexOf("echo \"decision=$decision\"",start);
  assert.ok(start>=0&&end>start);
  const section=releaseWorkflow.slice(start,end);
  assert.match(section,/company-learning\/platform-release-roadmap\.json/);
  assert.match(section,/minimumDesignPass/);
  assert.match(section,/unityProjectPass/);
  assert.match(section,/unityTechnicalPass/);
  assert.match(section,/webIsNonBlocking/);
  assert.match(section,/UNITY_WEB_RELEASE_GATE_AUTHORITY=NONE/);
  assert.doesNotMatch(section,/COMPANY_FLOW\.md/);
  assert.doesNotMatch(section,/e\.webGameplay\?\.pass===true/);
});


test('Vibe2 runtime design overlay never runs git inside the archived main snapshot',()=>{
  assert.doesNotMatch(workflow,/git -C \/tmp\/vibe2-main (?:fetch|checkout|reset|cat-file)/);
  assert.match(workflow,/git -C "\$control_root" cat-file -e "origin\/company-runtime:\$runtime_design_path"/);
  assert.match(workflow,/git -C "\$control_root" archive "origin\/company-runtime" "\$runtime_design_path" \| tar -x -C \/tmp\/vibe2-main/);
  assert.match(workflow,/VIBE2_RUNTIME_DESIGN_OVERLAY=company-runtime:design,game-seed-state\.json/);
  assert.equal(workflow.split('VIBE2_RUNTIME_DESIGN_OVERLAY=company-runtime:design,game-seed-state.json').length-1,2);
  assert.equal(workflow.split('git -C /tmp/vibe2-main').length-1,0);
});
