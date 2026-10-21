// 파일명: qa/vibe2-control-queue-bottleneck.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('central v499 preserves every result artifact while coalescing callback workflows under pressure',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  assert.ok(policy.version>=499,'current policy must retain the v499 pressure-coalescing contract');
  const gate=policy.developmentSpeedExecution?.controlPlaneQueueBacklogMitigation||{};
  assert.equal(gate.status,'ENABLED_PRESSURE_COHORT_FANIN');
  assert.equal(gate.neuronCompletionCallback?.resultBearing,true);
  assert.equal(gate.neuronCompletionCallback?.coalescingForbidden,false);
  assert.equal(gate.neuronCompletionCallback?.resultArtifactCoalescingForbidden,true);
  assert.equal(gate.neuronCompletionCallback?.callbackWorkflowSuppressionUnderQueuePressure,true);
  assert.equal(gate.neuronCompletionCallback?.singleTaskGameMicroFanInPressureExceptionRemoved,true);
  assert.equal(gate.neuronCompletionCallback?.reserveRunnerPool,'ubuntu-latest');
  assert.equal(gate.fanInRefill?.coalesceByExecutionLane,true);
  assert.equal(gate.fanInRefill?.reserveRunnerPool,'ubuntu-latest');
  assert.equal(gate.fanInRunnerPool,'ubuntu-latest');
  assert.equal(gate.qualityOrEvidenceGateWeakeningForbidden,true);
});

test('continuous core suppresses non-asset callback storms under pressure and preserves cohort fan-in',()=>{
  const workflow=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
  assert.match(workflow,/github\.event\.action == 'vibe2-fanin-refill' \|\| github\.event\.action == 'vibe2-neuron-complete'/);
  assert.match(workflow,/vibe2-neuron-complete'[\s\S]*'ubuntu-latest'/);
  assert.match(workflow,/fan_in:[\s\S]*runs-on: ubuntu-latest/);
  assert.match(workflow,/if \[ "\$\{queue_pressure:-0\}" -gt 0 \] && \[ "\$VIBE2_EXECUTION_LANE" != 'asset-development' \]; then/);
  assert.doesNotMatch(workflow,/queue_pressure:-0\}" -gt 0[^\n]+game_micro_fanin/);
  assert.match(workflow,/VIBE2_ATOMIC_NEURON_COMPLETION_DISPATCH=COALESCED_TO_COHORT_FANIN/);
  assert.match(workflow,/VIBE2_GAME_MICRO_FANIN=IMMEDIATE_ONLY_WITHOUT_QUEUE_PRESSURE/);
  assert.match(workflow,/run-name: Vibe2 Continuous Core · \$\{\{ github\.event\.action \|\| github\.event_name \}\} ·/);
  assert.match(workflow,/runs\?event=repository_dispatch&per_page=100/);
  assert.match(workflow,/VIBE2_EVENT_DRIVEN_REFILL=DEDUPED_ACTIVE_EXACT:/);
  assert.match(workflow,/VIBE2_NEURON_REFILL_DISPATCH=DEDUPED_ACTIVE_EXACT:/);
  assert.match(workflow,/VIBE2_FAN_IN_REGRESSION_REFILL=DEDUPED_ACTIVE_EXACT:/);
  assert.match(workflow,/String\(run\.id\|\|''\)!==String\(process\.env\.CURRENT_RUN\|\|''\)/);
  assert.match(workflow,/String\(run\.head_sha\|\|''\)===String\(process\.env\.CURRENT_MAIN\|\|''\)/);
  assert.doesNotMatch(workflow,/refill_active="\$\(REFILL_TITLE=[\s\S]{0,300}node - <<'NODE'/);
  assert.match(workflow,/CURRENT_RUN="\$GITHUB_RUN_ID" node - <<'NODE' > \/tmp\/vibe2-neuron-refill-active\.txt/);
  assert.match(workflow,/CURRENT_RUN="\$GITHUB_RUN_ID" node - <<'NODE' > \/tmp\/vibe2-regression-refill-active\.txt/);
  assert.match(workflow,/CURRENT_RUN="\$GITHUB_RUN_ID" node - <<'NODE' > \/tmp\/vibe2-fanin-refill-active\.txt/);
  assert.match(workflow,/\n          NODE\n\s+refill_active="\$\(cat \/tmp\/vibe2-neuron-refill-active\.txt\)"/);
  assert.match(workflow,/\n          NODE\n\s+refill_active="\$\(cat \/tmp\/vibe2-regression-refill-active\.txt\)"/);
  assert.match(workflow,/\n          NODE\n\s+refill_active="\$\(cat \/tmp\/vibe2-fanin-refill-active\.txt\)"/);
  assert.match(workflow,/github\.event\.action == 'vibe2-fanin-refill' && format\('vibe2-fanin-refill-\{0\}-\{1\}', github\.run_id,/);
  assert.doesNotMatch(workflow,/github\.event\.action == 'vibe2-fanin-refill' && format\('vibe2-fanin-refill-\{0\}-\{1\}', github\.sha,/);
  assert.match(workflow,/cancel-in-progress: false/);
});

// 실제 워크플로의 중복 판별 코드를 실행하여 오래 실행되는 워커가 새 리필을 막지 않는지 확인한다.
test('refill admission and completion callbacks merge waiting wakes only',()=>{
  const workflow=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
  const title='Vibe2 Continuous Core · vibe2-fanin-refill · game-primary';
  const blocks=[...workflow.matchAll(/^ +const fs=require\('fs'\);\n(?:(?!^ +NODE$)[\s\S])*?process\.stdout\.write\((older|found)\?'yes':'no'\);/gm)]
    .map(match=>match[0]).filter(code=>/refill-(?:admission-)?runs\.json/.test(code));
  assert.equal(blocks.length,4);
  for(const code of blocks){
    for(const [status,sha,lane,id,expected] of [
      ['queued','head',title,1,'yes'],['pending','head',title,1,'yes'],
      ['in_progress','head',title,1,'yes'],['completed','head',title,1,'no'],
      ['queued','old',title,1,'no'],['queued','head',title+'-other',1,'no'],
      ['queued','head',title,2,'no']
    ]){
      let output='';
      const run={id,event:'repository_dispatch',head_branch:'main',head_sha:sha,display_title:lane,status};
      vm.runInNewContext(code,{
        require:name=>name==='fs'?{readFileSync:()=>JSON.stringify({workflow_runs:[run]})}:{execFileSync:()=>JSON.stringify({jobs:[{name:'reserve',status:'in_progress'}]})},
        process:{env:{CURRENT_RUN:'2',CURRENT_MAIN:'head',REFILL_LANE:'game-primary',REFILL_TITLE:title},stdout:{write:value=>{output+=value;}}}
      });
      assert.equal(output,expected,status+':'+sha+':'+lane+':'+id);
      if(expected==='yes')for(const jobs of [[{name:'reserve',status:'completed'},{name:'worker',status:'queued'}],null]){
        output='';
        vm.runInNewContext(code,{
          require:name=>name==='fs'?{readFileSync:()=>JSON.stringify({workflow_runs:[run]})}:{execFileSync:()=>{if(jobs===null)throw Error('probe unavailable');return JSON.stringify({jobs});}},
          process:{env:{CURRENT_RUN:'2',CURRENT_MAIN:'head',REFILL_LANE:'game-primary',REFILL_TITLE:title},stdout:{write:value=>{output+=value;}}}
        });
        assert.equal(output,'no','completed reserve or unavailable telemetry must not suppress refill');
      }
    }
  }
});
