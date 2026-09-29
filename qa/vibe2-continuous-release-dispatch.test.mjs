// 파일명: qa/vibe2-continuous-release-dispatch.test.mjs
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
  assert.match(section,/while IFS='\\|' read -r task_id candidate_branch target game_id; do/);
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
  const clones=releaseWorkflow.split('gh repo clone "$GITHUB_REPOSITORY" /tmp/vibe2-control -- --branch vibe2-unreal-core --single-branch').length-1;
  const explicitFetches=releaseWorkflow.split(explicit).length-1;
  assert.ok(clones>=4);
  assert.equal(explicitFetches,clones);
  assert.equal(releaseWorkflow.includes(legacy),false);
  assert.match(releaseWorkflow,/worktree add --detach \/tmp\/vibe2-main-contract origin\/main/);
});

test('Web BUILD_UP closes on exact deployed Web source and never substitutes Roblox runtime',()=>{
  const start=releaseWorkflow.indexOf('  web-release:');
  const end=releaseWorkflow.indexOf('\n  unity-build:',start);
  assert.ok(start>=0&&end>start);
  const section=releaseWorkflow.slice(start,end);
  assert.match(section,/source_tree_sha="\$\(git rev-parse "origin\/main:\$SOURCE_ROOT"\)"/);
  assert.match(section,/VIBE2_WEB_MAIN_PROMOTION_SOURCE_TREE_SHA/);
  assert.match(section,/PROMOTED_SOURCE_TREE_SHA:/);
  assert.match(section,/WEB_PROMOTED_SOURCE_TREE_IDENTITY=INVALID/);
  assert.match(section,/web-cloudflare-deployment-pass/);
  assert.match(section,/web-runtime-source-tree:\$\{PROMOTED_SOURCE_TREE_SHA\}/);
  assert.match(section,/VIBE2_WEB_TASK_FINAL_PASS=EXACT_SOURCE_RUNTIME_AND_DEPLOYMENT/);
  assert.match(section,/VIBE2_RELEASE_PAGES_CHECK=/);
  assert.match(section,/VIBE2_WEB_CURRENT_DEPLOYMENT_CHECK=/);
  assert.doesNotMatch(section,/company-development-roblox-runtime\.yml/);
  assert.doesNotMatch(section,/VIBE2_ROBLOX_RUNTIME_QA_DISPATCHED/);
  assert.doesNotMatch(section,/RUNTIME_QA_PENDING/);
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

test('platform review cannot claim native runtime F9 before platform verification',()=>{
  const fanInReview=fs.readFileSync('tools/vibe2-fan-in-review.mjs','utf8');
  assert.match(fanInReview,/releaseCandidates\.push\(\{taskId:clean\(task\.id\),candidateBranch,target:platformTarget,gameId:clean\(task\.gameId\),f0ToF9Verified:platformTarget==='web',f9Verified:platformTarget==='web'\}\)/);
  const dispatch=workflow.slice(
    workflow.indexOf('      - name: Dispatch reviewed winner candidates to release gate'),
    workflow.indexOf('      - name: Dispatch verified system architecture candidates')
  );
  assert.match(dispatch,/if \[ \"\$target\" = web \]; then/);
  assert.match(dispatch,/PLATFORM_RUNTIME_VERIFICATION_REQUIRED=/);
  assert.match(dispatch,/PLATFORM_PUBLISH_OR_DEPLOY_DISPATCHED=/);
});

test('Web requires F0-F9 fan-in proof before deploy and immediately refills regardless deploy outcome',()=>{
  const fanInReview=fs.readFileSync('tools/vibe2-fan-in-review.mjs','utf8');
  assert.match(fanInReview,/evidence\.add\('web-f0-f9-verified'\)/);
  assert.match(fanInReview,/evidence\.add\('web-f9-verified'\)/);
  assert.match(fanInReview,/if\(platformTarget==='web'\)\{[\s\S]*status:'verified'[\s\S]*lastOutcome:'PASS'/);
  assert.match(releaseWorkflow,/target!==\'web\'\|\|\([\s\S]*evidence\.includes\('web-f0-f9-verified'\)[\s\S]*&&evidence\.includes\('web-f9-verified'\)[\s\S]*\)/);
  assert.match(releaseWorkflow,/const publicationPending=task[\s\S]*task\.status==='verified'[\s\S]*web-publish-after-f9-required/);
  assert.match(workflow,/VIBE2_RELEASE_DISPATCH_RETRY=/);
  assert.match(workflow,/PLATFORM_PUBLISH_DISPATCH_FAILURE_BLOCKS_NEXT_EVOLUTION=NO/);
  const start=releaseWorkflow.indexOf('  web-release:');
  const end=releaseWorkflow.indexOf('\n  unity-build:',start);
  const section=releaseWorkflow.slice(start,end);
  assert.match(section,/WEB_F9_VERIFIED=YES/);
  assert.match(section,/WEB_DEPLOY_ATTEMPTED=/);
  assert.match(section,/WEB_NEXT_EVOLUTION_CYCLE_DISPATCHED=/);
  assert.match(section,/PLATFORM_NEXT_EVOLUTION_CYCLE_DISPATCHED=WEB:/);
  assert.match(section,/WEB_PUBLICATION_OUTCOME_BLOCKS_EVOLUTION=NO/);
});

test('Roblox generic candidate release cannot publish canonical Open Cloud before native F9',()=>{
  const start=releaseWorkflow.indexOf('  roblox-release:');
  const end=releaseWorkflow.indexOf('\n  reject:',start);
  const section=releaseWorkflow.slice(start,end);
  assert.match(section,/ROBLOX_PRE_F9_CANONICAL_PUBLISH=FORBIDDEN/);
  assert.match(section,/ROBLOX_F0_F9_RUNTIME_HANDOFF=PASS/);
  assert.match(section,/ROBLOX_CANONICAL_SERVER_PUBLISH_OWNER=F9_FINAL_REVIEW_ONLY/);
  assert.doesNotMatch(section,/vibe3-roblox-platform\.mjs[^\n]*--execute/);
  assert.doesNotMatch(section,/roblox-open-cloud-published/);
});


test('Roblox candidate build and Studio verification precede promotion without publishing candidate state',()=>{
  const native=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  const packageStart=releaseWorkflow.indexOf('  roblox-package:');
  const studioStart=releaseWorkflow.indexOf('  roblox-studio:');
  const promoteStart=releaseWorkflow.indexOf('  roblox-release:');
  assert.ok(packageStart>0&&packageStart<studioStart&&studioStart<promoteStart);
  const build=releaseWorkflow.slice(packageStart,studioStart);
  assert.match(build,/company-development-roblox-package\.mjs/);
  assert.match(build,/company-development-roblox-build-preflight\.mjs/);
  assert.match(build,/company-development-roblox-headless-fast-mvp\.mjs/);
  assert.doesNotMatch(build,/gh pr merge|git push/);
  assert.match(releaseWorkflow.slice(promoteStart),/needs: \[inspect, roblox-package, roblox-studio\]/);
  assert.match(releaseWorkflow.slice(promoteStart),/stage:'SOURCE_PROMOTION'/);
  assert.match(native,/candidate must schedule exactly one Studio playtest/);
  assert.match(native,/ROBLOX_CANDIDATE_STUDIO_CANONICAL_WRITE=NO'[\s\S]*?exit 0[\s\S]*?git -C runtime config/);
  assert.match(native,/candidate_context == '' && steps\.studio_play/);
  const followup=native.slice(native.indexOf('      - name: Dispatch exact Studio MCP follow-up'),native.indexOf('      - name: Enforce persistent Open Cloud probe failures'));
  assert.doesNotMatch(followup,/if: \$\{\{ false \}\}/);
});
