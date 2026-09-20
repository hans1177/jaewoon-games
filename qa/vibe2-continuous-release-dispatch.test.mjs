import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

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


test('web candidate release checks inline scripts and preserves historical save-key meaning',()=>{
  const start=releaseWorkflow.indexOf('      - name: Web syntax QA');
  const end=releaseWorkflow.indexOf('      - name: Promote approved web source root through reviewed PR',start);
  const section=releaseWorkflow.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.match(section,/BASE_SHA:/);
  assert.match(section,/matchAll\(\/<script\\b/);
  assert.match(section,/execFileSync\(process\.execPath,\['--check',tmp\]/);
  assert.match(section,/const historicalSaveKey="const key='jg-final:'\+C\.id;"/);
  assert.match(section,/VIBE2_WEB_SAVE_KEY_REGRESSION/);
  assert.match(section,/VIBE2_WEB_INLINE_SCRIPT_QA=PASS/);
  assert.match(section,/VIBE2_WEB_SAVE_KEY_COMPATIBILITY=PASS/);
});


test('web candidate release blocks inline script syntax and historical save-key regressions',()=>{
  const section=releaseWorkflow.slice(releaseWorkflow.indexOf('- name: Web syntax QA'),releaseWorkflow.indexOf('- name: Promote approved web source root through reviewed PR'));
  assert.match(section,/VIBE2_WEB_INLINE_SCRIPT_QA=PASS/);
  assert.match(section,/VIBE2_WEB_SAVE_KEY_COMPATIBILITY=PASS/);
  assert.match(section,/node --check/);
  assert.match(section,/const historicalSaveKey="const key='jg-final:'\+C\.id;"/);
  assert.match(section,/VIBE2_WEB_SAVE_KEY_REGRESSION/);
});
