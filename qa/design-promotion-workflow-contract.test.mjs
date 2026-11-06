// 파일명: qa/design-promotion-workflow-contract.test.mjs
// 임포트
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const promotion=fs.readFileSync('.github/workflows/company-design-promotion-sync.yml','utf8');
const designRuntime=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
const source=fs.readFileSync('tools/design-only-promotion-sync.mjs','utf8');

test('canonical design runtime dedupes execution without cancelling active work',()=>{
  assert.match(designRuntime,/group: company-seed-design-runtime-\$\{\{ github\.sha \}\}/);
  assert.match(designRuntime,/cancel-in-progress:\s*false/);
  assert.match(designRuntime,/group: company-seed-design-game-\$\{\{ matrix\.target\.game_id \}\}/);
});

test('V5 authored identity core is promoted during detailed design, without a new pipeline',()=>{
  assert.match(designRuntime,/group: company-seed-design-runtime-\$\{\{ github\.sha \}\}\s+cancel-in-progress: false\s+queue: max/);
  assert.match(designRuntime,/cp\.designerSeed\?\.contentDigest/);
  assert.match(designRuntime,/GH_TOKEN: \$\{\{ github\.token \}\}/);
  const persist=designRuntime.indexOf('DESIGN_CHECKPOINT_RUNTIME_PERSIST=YES');
  const verify=designRuntime.indexOf('s.authorRole==="GAME_DESIGNER_AI"');
  const dispatch=designRuntime.indexOf('gh workflow run company-design-promotion-sync.yml');
  // Validate the authored digest before committing the checkpoint; dispatch only after persistence.
  assert.ok(verify>=0&&persist>verify&&dispatch>persist);
  assert.match(designRuntime,/s\.contentDigest===digest/);
  assert.match(designRuntime,/s\.fingerprint===cp\.fingerprint/);
  assert.match(designRuntime,/cp\.designerSeed\?\.contentDigest===digest/);
  assert.match(designRuntime,/promotion_dispatch_marker/);
  assert.doesNotMatch(designRuntime,/gh workflow run company-development-roblox-runtime\.yml/);
  assert.doesNotMatch(designRuntime,/gh workflow run company-development-unity-runtime\.yml/);
});

test('stranded verified ideas re-enter the existing promotion worker on an hourly watchdog without bypassing gates',()=>{
  const trigger=promotion.slice(promotion.indexOf('on:'),promotion.indexOf('\npermissions:'));
  assert.match(trigger,/schedule:\s*\n\s*- cron: '53 \* \* \* \*'/);
  const job=promotion.slice(promotion.indexOf('\n  promote:'),promotion.indexOf('\n    runs-on:',promotion.indexOf('\n  promote:')));
  assert.match(job,/github\.event_name == 'schedule'/);
  assert.match(promotion,/node tools\/design-only-promotion-sync\.mjs/);
  assert.match(promotion,/node --test qa\/company-minimum-design-contract\.test\.mjs/);
  assert.match(promotion,/git add -- game-seed-state\.json design autonomous-portfolio\.json game-catalog\.json development-queue\.json/);
  assert.match(promotion,/git diff --cached --quiet/);
  assert.match(promotion,/refill_required/);
});

test('partial design-runtime failure still evaluates each persisted minimum-design-ready game',()=>{
  assert.match(designRuntime,/fail-fast:\s*false/);
  assert.match(promotion,/workflow_run:[\s\S]*types:\s*\[completed\]/);
  assert.match(promotion,/workflow_run\.conclusion == 'success'/);
  assert.match(promotion,/workflow_run\.conclusion == 'failure'/);
  assert.doesNotMatch(promotion,/workflow_run\.conclusion == 'cancelled'/);
  assert.match(promotion,/Promote verified Roblox minimum design to native development/);
  assert.match(promotion,/company-minimum-design-contract\.mjs/);
  assert.match(promotion,/DEVELOPMENT_ADMISSION_GATE=MINIMUM_ROBLOX_DESIGN_READY/);
  assert.match(promotion,/STRICT_DESIGN_REVIEW=PARALLEL_NON_ADMISSION_GATE/);
});

test('promotion source has one direct-native admission path and no Web-first or strict-score fallback',()=>{
  assert.match(source,/assertCanonicalDirectNativePolicy/);
  assert.match(source,/MINIMUM_ROBLOX_DESIGN_READY/);
  assert.match(source,/strictDesignReviewRequiredForAdmission:false/);
  assert.match(source,/concurrentTargetPlatforms:\['ROBLOX'\]/);
  assert.match(source,/UNITY_WEB_ROLE=OWNER_HOLD_NO_DEVELOPMENT/);
  assert.doesNotMatch(source,/DESIGN_PASS_THRESHOLD/);
  assert.doesNotMatch(source,/bindRequiredWebStage/);
  assert.doesNotMatch(source,/WEB_PLAYABLE_BOOTSTRAP/);
  assert.doesNotMatch(source,/WAITING_WEB_GAMEPLAY_VALIDATION/);
  assert.doesNotMatch(source,/AFTER_WEB_STRICT_REVIEW/);
  assert.doesNotMatch(source,/refreshCompletedDesignBaselineGates/);
});

test('promotion persists only runtime state while machine policy comes from main',()=>{
  const checkout=promotion.slice(promotion.indexOf('- name: Checkout current engine source'),promotion.indexOf('- name: Overlay latest company runtime design evidence'));
  assert.match(checkout,/fetch-depth: 2/);
  assert.doesNotMatch(checkout,/fetch-depth: 0/);
  assert.match(promotion,/COMPANY_RUNTIME_BRANCH: company-runtime/);
  assert.match(promotion,/COMPANY_VERIFIED_POLICY_PATH: \$\{\{ github\.workspace \}\}\/company-learning\/platform-release-roadmap\.json/);
  assert.match(promotion,/COMPANY_VERIFIED_DESIGN_POLICY_PATH: \$\{\{ github\.workspace \}\}\/company-learning\/platform-release-roadmap\.json/);
  assert.ok(promotion.includes('node tools/company-homepage-platform-exposure-sync.mjs development-queue.json game-catalog.json homepage-platform-exposure.json "$COMPANY_VERIFIED_POLICY_PATH"'));
  assert.match(promotion,/test -s "\$COMPANY_VERIFIED_POLICY_PATH"/);
  assert.match(promotion,/git checkout origin\/main -- company-directive\.json company-learning\/platform-release-roadmap\.json/);
  assert.match(promotion,/git reset -- company-directive\.json company-learning\/platform-release-roadmap\.json/);
  assert.match(promotion,/refs\/heads\/\$COMPANY_RUNTIME_BRANCH:refs\/remotes\/origin\/\$COMPANY_RUNTIME_BRANCH/);
  assert.match(promotion,/refs\/heads\/main:refs\/remotes\/origin\/main/);
  assert.match(promotion,/while true; do/);
  assert.match(promotion,/runtime_latest.*runtime_base/);
  assert.doesNotMatch(promotion,/FAILED_AFTER_3_ATTEMPTS/);
  assert.match(promotion,/git fetch origin ['"]\+refs\/heads\/main:refs\/remotes\/origin\/main['"] ['"]\+refs\/heads\/\$COMPANY_RUNTIME_BRANCH:refs\/remotes\/origin\/\$COMPANY_RUNTIME_BRANCH['"] --depth=2 --no-tags --quiet/);
  assert.match(promotion,/git reset --hard "origin\/\$COMPANY_RUNTIME_BRANCH"/);
  assert.match(promotion,/Object\.hasOwn\(item,'webValidationRequired'\)\|\|Object\.hasOwn\(item,'musicValidationRequired'\)/);
  assert.doesNotMatch(promotion,/item\.webValidationRequired!==false\|\|item\.musicValidationRequired!==false/);
  const calls=promotion.match(/node tools\/design-only-promotion-sync\.mjs/g)||[];
  assert.ok(calls.length>=2);
  assert.match(promotion,/git checkout origin\/main -- company-directive\.json company-learning\/platform-release-roadmap\.json company-learning\/company-log-map\.json company-learning\/company-architecture-map\.json company-learning\/security-immune-system\.json tools\/design-only-promotion-sync\.mjs/);
  const policyCheckout=promotion.match(/git checkout origin\/main --[^\n]+/)?.[0]||'';
  const policyReset=promotion.match(/git reset -- company-directive\.json[^\n]+/)?.[0]||'';
  for(const dependency of ['company-homepage-platform-exposure-sync','company-platform-exposure-control','company-shared-context','company-direct-native-design-migration']){
    assert.ok(policyCheckout.split(/\s+/).includes(`tools/${dependency}.mjs`),`checkout must include ${dependency}`);
    assert.ok(policyReset.split(/\s+/).includes(`tools/${dependency}.mjs`),`runtime commit must exclude ${dependency}`);
  }
  assert.match(promotion,/git add -- game-seed-state\.json design autonomous-portfolio\.json game-catalog\.json development-queue\.json/);
  assert.doesNotMatch(promotion,/COMPANY_FLOW\.md/);
  assert.doesNotMatch(promotion,/DIRECT_NATIVE_DUAL_PLATFORM\.md/);
  assert.doesNotMatch(promotion,/tools\/company-baseline-gate\.mjs/);
});

test('stale development admission is removed instead of preserving an invalid queue invariant',()=>{
  assert.match(source,/function demoteStaleAdmission/);
  assert.match(source,/MINIMUM_DESIGN_REQUIRED/);
  assert.match(source,/queue\.items=\(queue\.items\|\|\[\]\)\.filter/);
  assert.match(source,/STALE_DEVELOPMENT_CONFIRMED_DEMOTED=/);
});

test('promotion dispatches both native lanes and does not use Unity Web as a promotion gate',()=>{
  assert.match(designRuntime,/PER_GAME_PROMOTION_DISPATCH=YES/);
  assert.match(designRuntime,/PORTFOLIO_WIDE_PASS_WAIT=NO/);
  assert.match(promotion,/company-development-confirmed-runtime\.yml/);
  assert.match(promotion,/ROBLOX_ONLY_DISPATCH=CENTRAL_EXACT_FANOUT/);
  assert.match(promotion,/DIRECT_NATIVE_BATCH_DISPATCH=FORBIDDEN/);
  assert.doesNotMatch(promotion,/gh workflow run company-development-roblox-runtime\.yml/);
  assert.doesNotMatch(promotion,/gh workflow run company-development-unity-runtime\.yml/);
  assert.match(promotion,/UNITY_WEB_PROMOTION_GATE=NO/);
  assert.match(promotion,/OWNER_HELD_UNITY_DISPATCH=NO/);
});


test('verified design promotion wakes the existing Vibe scheduler only after runtime persistence',()=>{
  const persistIndex=promotion.indexOf('- name: Persist promoted state to company runtime branch');
  const dispatchIndex=promotion.indexOf('- name: Dispatch native development and immediate Vibe planner refill');
  assert.ok(persistIndex>=0&&dispatchIndex>persistIndex);
  assert.match(promotion,/permissions:[\s\S]*actions: write/);
  assert.match(promotion,/gh workflow run vibe2-24h-runner\.yml --repo "\$GITHUB_REPOSITORY" --ref main/);
  assert.match(promotion,/VERIFIED_DESIGN_VIBE_REFILL_DISPATCH=YES/);
  assert.match(promotion,/VERIFIED_DESIGN_VIBE_REFILL_AFTER_RUNTIME_PERSIST=YES/);
});

test('canonical promotion verifies exact design once and the scheduler consumes the same runtime snapshot',()=>{
  const runner=fs.readFileSync('.github/workflows/vibe2-24h-runner.yml','utf8');
  const handoff=fs.readFileSync('tools/vibe2-verified-design-handoff.mjs','utf8');
  assert.match(promotion,/Verify exact promoted runtime design handoff for Vibe/);
  assert.ok(promotion.indexOf('Verify exact promoted runtime design handoff for Vibe')>promotion.indexOf('Persist promoted state to company runtime branch'));
  assert.ok(promotion.indexOf('Verify exact promoted runtime design handoff for Vibe')<promotion.indexOf('Dispatch native development and immediate Vibe planner refill'));
  assert.ok(promotion.includes('node tools/vibe2-verified-design-handoff.mjs --runtime-sha="$runtime_sha"'));
  assert.ok(promotion.includes('VIBE2_VERIFIED_DESIGN_INTAKE=PASS'));
  assert.ok(runner.includes('git -C /tmp/vibe2-main show "$runtime_design_sha:development-queue.json"'));
  assert.ok(runner.includes('git -C /tmp/vibe2-main checkout "$runtime_design_sha" -- "$runtime_design_path"'));
  assert.ok(!runner.includes('VIBE2_VERIFIED_DESIGN_GATE=BLOCKED_UNTIL_AUTHORED_REVALIDATION'));
  assert.ok(handoff.includes('evaluateMinimumDesignContract'));
  assert.ok(handoff.includes("item?.minimumDesignContract?.pass!==true"));
  assert.ok(handoff.includes('strictQaPassClaimed:false,releasePassClaimed:false'));
  assert.ok(!handoff.includes('git push'));
});

test('central gameplay evolution policy binds verified design resume to the canonical Vibe scheduler',()=>{
  const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const design=roadmap?.continuousGameplaySystemEvolutionContract?.designContext||{};
  assert.equal(design.coreFunAndProgressionResumeImmediatelyAfterVerifiedDesign,true);
  assert.equal(design.verifiedDesignResumeTrigger,'IMMEDIATE_EXISTING_VIBE_SCHEDULER_WAKE_AFTER_PROMOTION_RUNTIME_PERSIST');
  assert.equal(design.resumeSchedulerBinding,'.github/workflows/vibe2-24h-runner.yml');
  assert.equal(design.resumeDispatchCondition,'AFTER_CANONICAL_PROMOTION_RUNTIME_PERSIST_SUCCESS');
  assert.equal(design.resumeUsesExistingCanonicalSchedulerOnly,true);
  assert.equal(design.resumeShadowPipelineForbidden,true);
});

test('verified design resumes the existing scheduler with fail-closed central map evidence',()=>{
  const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
  const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  assert.equal(architecture.status,'MINIMAL_SUMMARY_NOT_EXECUTION_POLICY');
  assert.equal(architecture.constitutionalEnforcement.mode,'FAIL_CLOSED');
  assert.equal(architecture.branches.main.directGameWorkerWrite,false);
  const resume=roadmap.continuousGameplaySystemEvolutionContract.designContext;
  assert.equal(resume.resumeSchedulerBinding,'.github/workflows/vibe2-24h-runner.yml');
  assert.equal(resume.resumeDispatchCondition,'AFTER_CANONICAL_PROMOTION_RUNTIME_PERSIST_SUCCESS');
  assert.equal(resume.resumeShadowPipelineForbidden,true);
  const persist=promotion.indexOf('- name: Persist promoted state to company runtime branch');
  const dispatch=promotion.indexOf('- name: Dispatch native development and immediate Vibe planner refill');
  assert.ok(persist>=0&&dispatch>persist);
  assert.match(promotion.slice(dispatch),/gh workflow run vibe2-24h-runner\.yml/);
  assert.match(promotion.slice(dispatch),/VERIFIED_DESIGN_VIBE_REFILL_AFTER_RUNTIME_PERSIST=YES/);
});


test('promotion invariant accepts progressed native states and rejects Web-first regression',()=>{
  assert.match(promotion,/const currentStep=String\(item\.currentStep\|\|''\)\.trim\(\)\.toUpperCase\(\)/);
  assert.match(promotion,/\^WEB_\|\^WAITING_WEB/);
  assert.doesNotMatch(promotion,/currentStep\|\|''\)!=='TARGET_PLATFORM_SOURCE_BIND'/);
});

test('design control and per-game jobs use the available full runner pool',()=>{
  assert.doesNotMatch(designRuntime,/\n  game-primary-gate:|needs\.game-primary-gate/);
  for(const job of ['resolve-seed-targets','design-cycle','sync-strict-design-scores']){
    const block=designRuntime.split(`\n  ${job}:\n`)[1]?.split(/\n  [a-z][a-z0-9-]*:\n/)[0]||'';
    const expectedRunner=job==='resolve-seed-targets'?'ubuntu-slim':'ubuntu-latest';
    assert.match(block,new RegExp(`^    runs-on: ${expectedRunner}$`,'m'),`${job} must use its policy-authorized runner pool`);
  }
  assert.doesNotMatch(designRuntime,/mark-design-engine-canary:/);
  assert.doesNotMatch(designRuntime,/\n  continue-seed-supply:/);
  const finish=designRuntime.slice(designRuntime.indexOf('\n  sync-strict-design-scores:'));
  assert.match(finish,/needs: \[resolve-seed-targets, design-cycle\]/);
  assert.match(finish,/if: always\(\) && !cancelled\(\) && needs\.resolve-seed-targets\.outputs\.run == 'true'/);
  assert.match(finish,/- name: Continue seed supply and immediately repeat failed design gates\n\s+if: always\(\) && !cancelled\(\)/);
  assert.match(finish,/gh workflow run company-seed-design-runtime\.yml --repo "\$GITHUB_REPOSITORY" --ref main/);
});

test('authored minimum design promotion is deduped durably across independent runners',()=>{
  const worker=designRuntime.slice(
    designRuntime.indexOf('          persist_design_checkpoint() {'),
    designRuntime.indexOf('          pipeline_pid=0')
  );
  assert.match(designRuntime,/promotion_dispatch_marker="minimumPromotionDispatchedDigest"/);
  assert.doesNotMatch(worker,/\/tmp\/design-minimum-promotion-/);
  assert.match(worker,/previous_promotion_digest=.*node -e/);
  assert.match(worker,/execFileSync\("git",\["-C",process\.argv\[1\],"show","HEAD:"\+process\.argv\[2\]/);
  assert.match(worker,/\^\[a-f0-9\]\{64\}\$/);
  assert.match(worker,/cp\[field\]=digest/);
  assert.match(worker,/promotion_dispatch_needed=0/);
  assert.match(worker,/\[ "\$previous_promotion_digest" != "\$authored_digest" \]/);
  const persisted=worker.indexOf('git -C "$worktree" push origin');
  const dispatched=worker.indexOf('if [ "$promotion_dispatch_needed" = 1 ]');
  assert.ok(persisted>0&&dispatched>persisted,'new digest must be durably committed before early dispatch');
  assert.match(worker,/DESIGN_AUTHORED_MINIMUM_PROMOTION_DISPATCH=SKIPPED_ALREADY_RECORDED_OR_NOT_AUTHORED/);
  assert.match(worker,/fallback=EXISTING_WORKFLOW_COMPLETION/);
});

test('minimum and strict-design promotion emit only after a new runtime commit',()=>{
  const minimum=designRuntime.slice(designRuntime.indexOf('- name: Persist minimum dual-platform design before strict review'),designRuntime.indexOf('- name: Apply strict 30-minute design review'));
  assert.match(minimum,/early_design_new_commit=0/);
  assert.match(minimum,/then pushed=1; early_design_new_commit=1; break;/);
  assert.match(minimum,/if \[ "\$early_design_new_commit" = 1 \]; then/);
  assert.match(minimum,/EARLY_NATIVE_PROMOTION_DISPATCH=SKIPPED_ALREADY_PERSISTED/);
  const persist=designRuntime.slice(designRuntime.indexOf('- name: Persist validated design evidence to company runtime branch'),designRuntime.indexOf('- name: Dispatch per-game promotion reconciliation on own strict PASS'));
  assert.match(persist,/id: persisted_design/);
  assert.match(persist,/runtime_changed=false/);
  assert.match(persist,/persisted_design_new_commit=0/);
  assert.match(persist,/then pushed=1; persisted_design_new_commit=1; break;/);
  assert.match(persist,/runtime_changed=\$persisted_design_new_commit/);
  assert.match(persist,/SEED_DESIGN_RUNTIME_CHANGE=NO_ALREADY_PERSISTED/);
  const dispatch=designRuntime.slice(designRuntime.indexOf('- name: Dispatch per-game promotion reconciliation on own strict PASS'));
  assert.match(dispatch,/steps\.persisted_design\.outputs\.runtime_changed == 'true'/);
  assert.match(dispatch,/STRICT_DESIGN_READY_FOR_PROMOTION|review\?\.verdict==='PASS'/);
});

test('semantic promotion changes wake the existing scheduler but timestamp-only writes do not',()=>{
  const persist=promotion.slice(promotion.indexOf('- name: Persist promoted state to company runtime branch'),promotion.indexOf('- name: Verify exact promoted runtime design handoff for Vibe'));
  const dispatch=promotion.slice(promotion.indexOf('- name: Dispatch native development and immediate Vibe planner refill'));
  assert.match(persist,/id: persist/);
  assert.ok(persist.includes('git diff --cached --unified=0 -- development-queue.json'));
  assert.ok(persist.includes('grep -Ev'));
  assert.ok(persist.includes('git diff --cached --name-only -- design'));
  assert.ok(persist.includes('refill_required=$refill_required'));
  assert.ok(dispatch.includes('steps.persist.outputs.refill_required'));
  assert.ok(dispatch.indexOf('SKIPPED_NO_SEMANTIC_DESIGN_OR_QUEUE_CHANGE')<dispatch.indexOf('gh workflow run company-development-confirmed-runtime.yml'));
  assert.match(dispatch,/gh workflow run vibe2-24h-runner\.yml/);
  const runner=fs.readFileSync('.github/workflows/vibe2-24h-runner.yml','utf8');
  assert.ok(runner.includes("cron: '*/5 * * * *'"));
});

test('canonical promotion safely discards ephemeral LFS art modifications before runtime checkout',()=>{
  const persist=promotion.slice(promotion.indexOf('- name: Persist promoted state to company runtime branch'),promotion.indexOf('- name: Dispatch native development and immediate Vibe planner refill'));
  assert.ok(persist.length>1000);
  assert.match(persist,/git reset --hard HEAD\s+git clean -fd/);
  assert.match(persist,/git checkout -f -B design-promotion-persist "origin\/\$COMPANY_RUNTIME_BRANCH"/);
  assert.match(persist,/git reset --hard "origin\/\$COMPANY_RUNTIME_BRANCH"/);
  assert.match(persist,/node tools\/design-only-promotion-sync\.mjs/);
  assert.match(persist,/git add -- game-seed-state\.json design autonomous-portfolio\.json game-catalog\.json development-queue\.json/);
});

test('promotion imports the canonical V5 grammar validator and all transitive seed dependencies from main',()=>{
  const checkout=promotion.match(/git checkout origin\/main --[^\n]+/)?.[0]||'';
  const reset=promotion.match(/git reset -- company-directive\.json[^\n]+/)?.[0]||'';
  for(const file of ['tools/company-minimum-design-contract.mjs','tools/company-game-seed-contract.mjs','tools/company-design-gate-scoring-v2.mjs']){
    assert.ok(checkout.split(/\s+/).includes(file),'missing source import in runtime checkout: '+file);
    assert.ok(reset.split(/\s+/).includes(file),'runtime must never commit code modules: '+file);
  }
  assert.match(promotion,/node tools\/design-only-promotion-sync\.mjs/);
});

test('promotion loads latest four central policies into the isolated runtime worktree',()=>{
  const checkout=promotion.match(/git checkout origin\/main --[^\n]+/)?.[0]||'';
  const reset=promotion.match(/git reset -- company-directive\.json[^\n]+/)?.[0]||'';
  const policyFiles=[
    'company-learning/platform-release-roadmap.json',
    'company-learning/company-log-map.json',
    'company-learning/company-architecture-map.json',
    'company-learning/security-immune-system.json'
  ];
  for(const file of policyFiles){
    assert.ok(checkout.split(/\s+/).includes(file),'missing runtime validation policy: '+file);
    assert.ok(reset.split(/\s+/).includes(file),'canonical policy must not be persisted to runtime branch: '+file);
  }
});


// 실제 저장 단계의 셸을 실행하여 연속 충돌과 권한·통신 실패를 구분한다.
test('promotion recalculates beyond three concurrent writes and stops on non-conflict push failure',()=>{
  const start=promotion.indexOf('- name: Persist promoted state to company runtime branch');
  const end=promotion.indexOf('\n      - name:',start+1);
  const block=promotion.slice(start,end);
  const script=block.slice(block.indexOf('run: |')+6).replace(/^ {10}/gm,'');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'promotion-save-'));
  try{
    fs.writeFileSync(path.join(root,'policy.json'),'{}');
    fs.writeFileSync(path.join(root,'git'),`#!/bin/sh
case "$1" in
  rev-parse) cat "$TEST_ROOT/revision" ;;
  diff) case "$*" in
    *--quiet*) exit 1 ;;
    *--unified=0*)
      if [ "$TEST_QUEUE_DIFF" = semantic ]; then
        echo '-    "currentStep": "BLOCKED"'
        echo '+    "currentStep": "READY"'
      elif [ "$TEST_QUEUE_DIFF" = timestamp ]; then
        echo '-    "updatedAt": "before"'
        echo '+    "updatedAt": "after"'
      fi ;;
  esac ;;
  push)
    count=$(cat "$TEST_ROOT/pushes"); count=$((count+1)); echo "$count" > "$TEST_ROOT/pushes"
    if [ "$TEST_MODE" = permanent ]; then exit 1; fi
    if [ "$count" -le 4 ]; then echo "revision-$count" > "$TEST_ROOT/revision"; exit 1; fi
    ;;
esac
exit 0
`,{mode:0o755});
    fs.writeFileSync(path.join(root,'node'),`#!/bin/sh
cat "$TEST_ROOT/revision" >> "$TEST_ROOT/calculations"
`,{mode:0o755});
    fs.writeFileSync(path.join(root,'sleep'),`#!/bin/sh
[ "$1" -ge 2 ] && [ "$1" -le 11 ] || exit 1
echo "$1" >> "$TEST_ROOT/delays"
`,{mode:0o755});
    for(const mode of ['conflict','permanent','semantic','timestamp']){
      fs.writeFileSync(path.join(root,'pushes'),'0');
      fs.writeFileSync(path.join(root,'revision'),'revision-0\n');
      fs.writeFileSync(path.join(root,'calculations'),'');
      fs.writeFileSync(path.join(root,'delays'),'');
      const output=path.join(root,'github-output');
      fs.writeFileSync(output,'');
      const result=spawnSync('bash',['-euo','pipefail','-c',script],{
        cwd:root,encoding:'utf8',timeout:10000,
        env:{...process.env,PATH:root+path.delimiter+process.env.PATH,TEST_ROOT:root,TEST_MODE:mode,
          COMPANY_RUNTIME_BRANCH:'company-runtime',COMPANY_VERIFIED_POLICY_PATH:path.join(root,'policy.json'),
          GITHUB_OUTPUT:output,TEST_QUEUE_DIFF:mode==='semantic'?'semantic':mode==='timestamp'?'timestamp':''}
      });
      assert.ifError(result.error);
      if(mode==='conflict'){
        assert.equal(result.status,0,result.stdout+result.stderr);
        assert.equal(fs.readFileSync(path.join(root,'pushes'),'utf8').trim(),'5');
        const calculations=fs.readFileSync(path.join(root,'calculations'),'utf8').trim().split('\n');
        assert.deepEqual(calculations,Array.from({length:5},(_,i)=>Array(3).fill('revision-'+i)).flat());
        assert.equal(fs.readFileSync(path.join(root,'delays'),'utf8').trim().split('\n').length,4);
        assert.match(result.stdout,/DESIGN_PROMOTION_RUNTIME_CHANGE=PERSISTED/);
        assert.equal(fs.readFileSync(output,'utf8').trim(),'refill_required=false');
      }else if(mode==='permanent'){
        assert.equal(result.status,1);
        assert.equal(fs.readFileSync(path.join(root,'pushes'),'utf8').trim(),'1');
        assert.equal(fs.readFileSync(path.join(root,'delays'),'utf8'),'');
        assert.match(result.stderr,/FAILED_WITHOUT_STATE_CONFLICT/);
      }else{
        assert.equal(result.status,0,result.stdout+result.stderr);
        assert.equal(fs.readFileSync(output,'utf8').trim(),`refill_required=${mode==='semantic'?'true':'false'}`);
      }
    }
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
