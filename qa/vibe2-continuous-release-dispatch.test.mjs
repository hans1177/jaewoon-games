// 파일명: qa/vibe2-continuous-release-dispatch.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const workflow=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
const releaseWorkflow=fs.readFileSync('.github/workflows/vibe2-candidate-release.yml','utf8');

test('Luau compiler release gate checks exact candidate trees before package and Studio work',{skip:!process.env.VIBE2_TEST_LUAU_COMPILER},()=>{
  const block=releaseWorkflow.match(/VIBE2_LUAU_COMPILER=\/tmp\/luau-bin\/luau-compile node --input-type=module <<'NODE'\n([\s\S]*?)\n          NODE/);
  assert.ok(block);
  const script=block[1].replace(/^ {10}/gm,'');
  assert.ok(releaseWorkflow.indexOf(block[0])<releaseWorkflow.indexOf('      - name: Build candidate package before runtime verification'));
  assert.match(releaseWorkflow,/needs: \[inspect, roblox-package\]/);
  assert.match(releaseWorkflow,/git fetch --no-tags --depth=1 origin "\$CANDIDATE_SHA" "\$BASE_SHA"/);
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'release-source-delta-'));
  const root='roblox-games/demo',relative=root+'/client/Game.client.luau';
  const git=(...args)=>execFileSync('git',args,{cwd:temp,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  try{
    fs.symlinkSync(path.resolve('tools'),path.join(temp,'tools'),'dir');
    fs.mkdirSync(path.dirname(path.join(temp,relative)),{recursive:true});
    git('init','-b','main');git('config','user.name','QA');git('config','user.email','qa@example.invalid');
    const source='local function reportNativeFoundationReady()\n  local character = player.Character or player.CharacterAdded:Wait()\n  return character\nend\nreturn reportNativeFoundationReady()\n';
    fs.writeFileSync(path.join(temp,relative),source);git('add',root);git('commit','-qm','baseline');
    const base=git('rev-parse','HEAD');
    for(const [replacement,reject] of [
      [source.replace('  local character','local character'),true],
      ['-- comment-only change\n'+source,true],
      [source.replace('  return character','  character:SetAttribute("NativeReady",true)\n  return character'),false]
    ]){
      fs.writeFileSync(path.join(temp,relative),replacement);git('add',root);git('commit','-qm','candidate');
      const head=git('rev-parse','HEAD');
      const run=()=>execFileSync(process.execPath,['--input-type=module','-e',script],{cwd:temp,encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,BASE_SHA:base,CANDIDATE_SHA:head,SOURCE_ROOT:root,VIBE2_LUAU_COMPILER:process.env.VIBE2_TEST_LUAU_COMPILER}});
      if(reject)assert.throws(run,error=>String(error.stderr).includes('변경 없는 edit: LUAU_AST_UNCHANGED'));
      else{
        const evidence=JSON.parse(run().trim().split('VIBE2_CANDIDATE_SOURCE_CHANGE=')[1]);
        assert.equal(evidence.baseSha,base);assert.equal(evidence.candidateSha,head);
        assert.equal(evidence.runtimeVerified,false);
        assert.deepEqual(evidence.structuralChangedFiles,['client/Game.client.luau']);
      }
      assert.equal(fs.readFileSync(path.join(temp,relative),'utf8'),replacement);
      assert.equal(git('status','--porcelain','--',root),'');
    }
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('fast recovery CLI and workflow do not wake again for historical queued recovery evidence',()=>{
  const fast=fs.readFileSync('.github/workflows/vibe2-recovery-fast.yml','utf8');
  const assignment=fast.match(/^            (vibe_requeued=.*)$/m)?.[1];
  assert.ok(assignment);
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'recovery-wake-'));
  try{
    const queue=path.join(temp,'queue.json'),recovery=path.join(temp,'recovery.json'),system=path.join(temp,'system.json'),log=path.join(temp,'dispatch.log');
    fs.writeFileSync(queue,JSON.stringify({tasks:Array.from({length:298},(_,i)=>({id:'old-'+i,status:'queued',evidence:['recovery-queue:historical']}))}));
    fs.writeFileSync(recovery,JSON.stringify({tasks:[]}));fs.writeFileSync(system,JSON.stringify({tasks:[]}));
    const run=()=>{
      fs.writeFileSync(log,execFileSync(process.execPath,['tools/company-recovery-dispatch.mjs','--route=all','--queue='+queue,'--recovery='+recovery,'--system-ai='+system],{encoding:'utf8'}));
      const shell=assignment.replace('/tmp/vibe2-recovery-fast/dispatch.log','"$RECOVERY_TEST_LOG"')+'\n[[ "$vibe_requeued" =~ ^[0-9]+$ ]]\nprintf "%s" "$vibe_requeued"';
      return execFileSync('bash',['-euo','pipefail','-c',shell],{encoding:'utf8',env:{...process.env,RECOVERY_TEST_LOG:log}});
    };
    assert.equal(run(),'0');
    fs.writeFileSync(recovery,JSON.stringify({tasks:[{id:'fresh',status:'queued',recoveryOwner:'VIBE2_VIBE3',sourceTaskId:'old-0'}]}));
    assert.equal(run(),'1');
    assert.equal(run(),'0');
    assert.equal(JSON.parse(fs.readFileSync(queue,'utf8')).tasks.length,298);
    assert.ok(fast.includes("if: steps.recovery.outputs.vibe_requeued != '0'"));
    assert.ok(fast.includes('SKIPPED_NO_NEW_GAME_RECOVERY'));
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

function count(needle){
  return workflow.split(needle).length-1;
}

test('failed source generation preserves terminal attempt count in fallback receipt',()=>{
  const parser=workflow.match(/          generation_attempts="\$\(sed[^\n]+\n[\s\S]*?echo "generation_attempts=\$generation_attempts" >> "\$GITHUB_OUTPUT"/);
  assert.ok(parser,'candidate must export attempts before exiting on failure');
  const start=workflow.indexOf(parser[0]);
  assert.ok(start<workflow.indexOf('if [ "$worker_rc" -ne 0 ]; then',start));
  assert.ok(workflow.includes('CANDIDATE_GENERATION_ATTEMPTS: ${{ steps.candidate.outputs.generation_attempts }}'));
  const fallback=workflow.match(/const fallbackCodingMethod=[\s\S]*?const baseCodingMethod=manifest\?\.codingMethod\|\|fallbackCodingMethod;/)[0];
  const evaluate=new Function('process','manifest',`const clean=value=>String(value||'').trim(); const workOrder={candidateStrategyRole:{strategy:'repair'}}; const exploration={}; ${fallback} return baseCodingMethod;`);
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'failed-attempts-'));
  try{
    for(const [log,expected] of [
      ['# VIBE2_GENERATION_ATTEMPTS=99\nVIBE2_GENERATION_ATTEMPTS=1\nVIBE2_GENERATION_ATTEMPTS=4\n',4],
      ['TIMEOUT\n',0],
      ['VIBE2_GENERATION_ATTEMPTS=invalid\n',0]
    ]){
      const sourceLog=path.join(temp,'source.log');
      const output=path.join(temp,'output');
      fs.writeFileSync(sourceLog,log); fs.writeFileSync(output,'');
      execFileSync('bash',['-e','-c',parser[0]],{env:{...process.env,source_worker_log:sourceLog,GITHUB_OUTPUT:output}});
      const attempts=fs.readFileSync(output,'utf8').trim().split('=')[1];
      const env={CANDIDATE_GENERATION_ATTEMPTS:attempts};
      assert.equal(evaluate({env},null).generationAttempts,expected);
      assert.equal(evaluate({env},{codingMethod:{generationAttempts:2}}).generationAttempts,2);
      assert.equal(evaluate({env},null).candidateProducedFirstAttempt,false);
    }
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('shallow candidate inspection fetches exact contract and transport bases and detects out-of-bound changes',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'candidate-shallow-'));
  const upstream=path.join(temp,'upstream');
  const checkout=path.join(temp,'checkout');
  fs.mkdirSync(upstream);
  const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  try{
    git(upstream,'init','-b','main');
    git(upstream,'config','user.name','QA');
    git(upstream,'config','user.email','qa@example.invalid');
    fs.mkdirSync(path.join(upstream,'roblox-games/demo'),{recursive:true});
    fs.writeFileSync(path.join(upstream,'roblox-games/demo/source.lua'),'return 1\n');
    git(upstream,'add','.'); git(upstream,'commit','-m','base');
    const base=git(upstream,'rev-parse','HEAD');
    fs.writeFileSync(path.join(upstream,'unrelated.txt'),'main update\n');
    git(upstream,'add','.'); git(upstream,'commit','-m','main advance');
    const transportBase=git(upstream,'rev-parse','HEAD');
    git(upstream,'checkout','-b','vibe2/candidate/demo',transportBase);
    fs.writeFileSync(path.join(upstream,'roblox-games/demo/source.lua'),'return 2\n');
    fs.writeFileSync(path.join(upstream,'outside.txt'),'must reject\n');
    git(upstream,'add','.'); git(upstream,'commit','-m','candidate');
    git(temp,'clone','--no-tags','--depth=1','--branch','vibe2/candidate/demo',`file://${upstream}`,checkout);
    assert.throws(()=>git(checkout,'cat-file','-e',`${base}^{commit}`));
    assert.throws(()=>git(checkout,'cat-file','-e',`${transportBase}^{commit}`));
    const fetchMain=releaseWorkflow.match(/^          git fetch --no-tags --depth=1 origin \+refs\/heads\/main:refs\/remotes\/origin\/main --quiet$/m)?.[0].trim();
    assert.ok(fetchMain);
    execFileSync('bash',['-e','-c',fetchMain],{cwd:checkout,stdio:'pipe'});
    const fetchStart=releaseWorkflow.indexOf('          reject()');
    const fetchEnd=releaseWorkflow.indexOf('          already_promoted=false',fetchStart);
    const fetchBases=releaseWorkflow.slice(fetchStart,fetchEnd).replace(/^ {10}/gm,'');
    const output=path.join(temp,'output');
    const run=(baseSha,transportSha)=>execFileSync('bash',['-e','-c',fetchBases],{
      cwd:checkout,
      env:{...process.env,base_sha:baseSha,transport_base_sha:transportSha,GITHUB_OUTPUT:output},
      stdio:'pipe'
    });
    run(base,transportBase);
    assert.equal(git(checkout,'rev-parse',`${base}^{commit}`),base);
    assert.equal(git(checkout,'rev-parse',`${transportBase}^{commit}`),transportBase);
    assert.equal(git(checkout,'diff','--name-only',base,'origin/main','--','roblox-games/demo'),'');
    assert.deepEqual(git(checkout,'diff','--name-only',transportBase,'HEAD').split('\n'),['outside.txt','roblox-games/demo/source.lua']);
    fs.writeFileSync(output,'');
    run('--all',transportBase);
    assert.match(fs.readFileSync(output,'utf8'),/reason=base-main-sha-invalid/);
    fs.writeFileSync(output,'');
    run(base,'--all');
    assert.match(fs.readFileSync(output,'utf8'),/reason=transport-base-sha-invalid/);
    fs.writeFileSync(output,'');
    run('f'.repeat(40),transportBase);
    assert.match(fs.readFileSync(output,'utf8'),/reason=base-main-sha-missing/);
    fs.writeFileSync(output,'');
    run(base,'e'.repeat(40));
    assert.match(fs.readFileSync(output,'utf8'),/reason=transport-base-sha-missing/);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('candidate transport retries transient branch push failures without changing transport authority',()=>{
  const commitAt=workflow.indexOf('git -C "$transport_dir" commit -m "vibe2: candidate transport $TASK_ID $VARIANT"');
  const cleanupAt=workflow.indexOf('git -C "$contract_root" worktree remove --force "$transport_dir"',commitAt);
  assert.ok(commitAt>=0&&cleanupAt>commitAt);
  const section=workflow.slice(commitAt,cleanupAt);
  assert.match(section,/candidate_push_ok=0/);
  assert.match(section,/for push_attempt in 1 2 3; do/);
  assert.match(section,/git -C "\$transport_dir" push origin "HEAD:refs\/heads\/\$candidate_branch"/);
  assert.match(section,/VIBE2_CANDIDATE_BRANCH_PUSH_RETRY=\$push_attempt:\$candidate_branch/);
  assert.match(section,/sleep \$\(\(push_attempt \* 2\)\)/);
  assert.match(section,/if \[ "\$candidate_push_ok" != 1 \]; then/);
  assert.match(section,/failed after bounded retry/);
  assert.doesNotMatch(section,/gh api .*git\/refs|POST .*git\/refs/);
});

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
  assert.match(section,/while IFS='\\|' read -r task_id candidate_branch target game_id evidence_only; do/);
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
  assert.match(releaseWorkflow,/git -C \/tmp\/vibe2-control fetch --no-tags --depth=1 origin \+refs\/heads\/main:refs\/remotes\/origin\/main --quiet/);
});


test('Unity candidate release routes WebGL and native execution surfaces independently',()=>{
  assert.match(releaseWorkflow,/execution_surface: \$\{\{ steps\.gate\.outputs\.execution_surface \}\}/);
  assert.match(releaseWorkflow,/const executionSurface=String\(m\.executionSurface\|\|''\)\.trim\(\)\.toUpperCase\(\)/);
  assert.match(releaseWorkflow,/target==='unity' && !\['UNITY_WEB','UNITY_NATIVE'\]\.includes\(executionSurface\)/);
  assert.match(releaseWorkflow,/decision=target==='unity'&&executionSurface==='UNITY_WEB'\?'unity-web':target/);

  const webStart=releaseWorkflow.indexOf('  unity-web-build:');
  const nativeStart=releaseWorkflow.indexOf('\n  unity-build:',webStart);
  const robloxStart=releaseWorkflow.indexOf('\n  roblox-package:',nativeStart);
  assert.ok(webStart>=0&&nativeStart>webStart&&robloxStart>nativeStart);
  const web=releaseWorkflow.slice(webStart,nativeStart);
  const native=releaseWorkflow.slice(nativeStart,robloxStart);
  assert.match(web,/needs\.inspect\.outputs\.decision == 'unity-web'/);
  assert.match(web,/unity-web-first-stage-build\.yml/);
  assert.match(web,/-f source_commit="\$CANDIDATE_SHA"/);
  assert.match(web,/-f base_main_sha="\$BASE_SHA"/);
  assert.match(web,/-f publish_to_main=true/);
  assert.match(web,/-f vibe2_task_id="\$TASK_ID"/);
  assert.match(web,/VIBE2_CANDIDATE_EXECUTION_SURFACE=UNITY_WEB/);
  assert.doesNotMatch(web,/unity-hybrid-android-build\.yml|APK QA/);

  assert.match(native,/needs\.inspect\.outputs\.decision == 'unity'/);
  assert.match(native,/Dispatch candidate APK QA/);
  assert.match(native,/unity-hybrid-android-build\.yml/);
  assert.doesNotMatch(native,/unity-web-first-stage-build\.yml/);
});

test('Unity dispatch failure recovery emits QUEUE_UPDATED without undefined result state',()=>{
  const start=releaseWorkflow.indexOf('  unity-build:');
  const end=releaseWorkflow.indexOf('\n  roblox-package:',start);
  assert.ok(start>=0&&end>start);
  const section=releaseWorkflow.slice(start,end);
  const recoveryStart=section.indexOf('- name: Recover queue if build dispatch failed');
  assert.ok(recoveryStart>=0);
  const recovery=section.slice(recoveryStart);
  assert.match(recovery,/--arg outcome "QUEUE_UPDATED"/);
  assert.match(recovery,/VIBE2_EVENT_DRIVEN_DEPENDENCY_REFILL=\$\{TASK_ID:-NONE\}:QUEUE_UPDATED/);
  assert.doesNotMatch(recovery,/\$result/);
});

test('candidate release queue recovery always fetches main into an explicit remote-tracking ref',()=>{
  const explicit='git -C /tmp/vibe2-control fetch --no-tags --depth=1 origin +refs/heads/main:refs/remotes/origin/main --quiet';
  const legacy='git -C /tmp/vibe2-control fetch origin main --quiet';
  const clones=releaseWorkflow.split('gh repo clone "$GITHUB_REPOSITORY" /tmp/vibe2-control -- --branch vibe2-unreal-core --single-branch --depth=1 --no-tags').length-1;
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
  assert.match(workflow,/git -C "\$control_root" cat-file -e "\$company_runtime_snapshot_sha:\$runtime_design_path"/);
  assert.match(workflow,/git -C "\$control_root" archive "\$company_runtime_snapshot_sha" "\$runtime_design_path" \| tar -x -C \/tmp\/vibe2-main/);
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

test('Web requires F0-F9 proof, mandatory deployment, then resumes perpetual BUILD_UP',()=>{
  const fanInReview=fs.readFileSync('tools/vibe2-fan-in-review.mjs','utf8');
  assert.match(fanInReview,/evidence\.add\('web-f0-f9-verified'\)/);
  assert.match(fanInReview,/evidence\.add\('web-f9-verified'\)/);
  assert.match(fanInReview,/if\(platformTarget==='web'\)\{[\s\S]*status:'verified'[\s\S]*lastOutcome:'PASS'/);
  assert.match(releaseWorkflow,/target!==\'web\'\|\|\([\s\S]*evidence\.includes\('web-f0-f9-verified'\)[\s\S]*&&evidence\.includes\('web-f9-verified'\)[\s\S]*\)/);
  assert.match(releaseWorkflow,/const publicationPending=task[\s\S]*task\.status==='verified'[\s\S]*web-publish-after-f9-required/);

  const dispatch=workflow.slice(
    workflow.indexOf('      - name: Dispatch reviewed winner candidates to release gate'),
    workflow.indexOf('      - name: Dispatch verified system architecture candidates')
  );
  assert.match(dispatch,/VIBE2_RELEASE_DISPATCH_RETRY=/);
  assert.match(dispatch,/if \[ "\$target" = web \]; then[\s\S]*PLATFORM_PUBLISH_DISPATCH_FAILURE_BLOCKS_NEXT_EVOLUTION=YES:WEB:/);
  assert.match(dispatch,/WEB_SAME_VERIFIED_CANDIDATE_DISPATCH_RETRY_REQUIRED=/);

  const start=releaseWorkflow.indexOf('  web-release:');
  const end=releaseWorkflow.indexOf('\n  unity-web-build:',start);
  assert.ok(start>=0&&end>start);
  const section=releaseWorkflow.slice(start,end);
  assert.match(section,/WEB_F9_VERIFIED=YES/);
  assert.match(section,/WEB_DEPLOYMENT_ELIGIBILITY=PLAYABLE_F0_F9_PLUS_STATIC_SAVE_QA/);
  assert.match(section,/WEB_NATIVE_HOMEPAGE_READINESS_REQUIRED=NO/);
  assert.match(section,/WEB_PLAYABLE_VERIFIED_MUST_DEPLOY=YES/);
  assert.doesNotMatch(section,/evaluateInternalRelease/);
  assert.doesNotMatch(section,/DEVELOPMENT_VERIFIED/);
  assert.match(section,/result=DEPLOY_RETRY_REQUIRED/);
  assert.match(section,/WEB_PUBLICATION_OUTCOME_BLOCKS_EVOLUTION=YES/);
  assert.match(section,/WEB_SAME_VERIFIED_CANDIDATE_RETRY=YES/);
  assert.match(section,/vibe2-queue-control\.mjs pass[\s\S]*web-cloudflare-deployment-pass/);
  assert.match(section,/WEB_NEXT_EVOLUTION_CYCLE_DISPATCHED=/);
  assert.match(section,/PLATFORM_NEXT_EVOLUTION_CYCLE_DISPATCHED=WEB:/);
  assert.match(section,/VIBE2_WEB_TASK_FINAL_PASS=EXACT_SOURCE_RUNTIME_AND_DEPLOYMENT/);

  const passAt=section.indexOf('if [ "$result" = PASS ]; then\n            echo "WEB_NEXT_EVOLUTION_CYCLE_DISPATCHED=');
  const deployRetryAt=section.indexOf('if [ "$result" = DEPLOY_RETRY_REQUIRED ]; then');
  assert.ok(deployRetryAt>=0&&passAt>deployRetryAt);
});

test('playable Web deployment policy has no native readiness gate and deployment precedes next BUILD_UP',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const deployment=policy.changeRecord?.playableWebMandatoryDeployment20261002;
  const loop=policy.continuousGameplaySystemEvolutionContract?.webPostDeploymentPerpetualBuildUp;
  assert.equal(deployment?.nativeHomepageReadinessRequired,false);
  assert.equal(deployment?.cloudflareMainRequiredBeforeVibePass,true);
  assert.equal(deployment?.nextBuildUpBeforeDeploymentSuccessForbidden,true);
  assert.equal(deployment?.postDeployment?.perpetualBuildUp,true);
  assert.equal(deployment?.postDeployment?.generationLimit,null);
  assert.equal(deployment?.postDeployment?.newIdeaRequiredEveryCycle,true);
  assert.equal(loop?.enabled,true);
  assert.equal(loop?.deploymentSuccessNextAction,'IMMEDIATE_NEXT_BUILD_UP_GENERATION');
  assert.equal(loop?.generationLimit,null);
  assert.equal(loop?.terminalCompletionStateForbidden,true);
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


test('Roblox candidate static validation precedes promotion without claiming actual play',()=>{
  const native=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  const packageStart=releaseWorkflow.indexOf('  roblox-package:');
  const studioStart=releaseWorkflow.indexOf('  roblox-studio:');
  const promoteStart=releaseWorkflow.indexOf('  roblox-release:');
  assert.ok(packageStart>0&&packageStart<studioStart&&studioStart<promoteStart);
  const build=releaseWorkflow.slice(packageStart,studioStart);
  const studio=releaseWorkflow.slice(studioStart,promoteStart);
  assert.match(studio,/needs: \[inspect, roblox-package\]/);
  assert.match(studio,/with:\n      run_studio: true/);
  assert.match(build,/company-development-roblox-package\.mjs/);
  assert.match(build,/company-development-roblox-build-preflight\.mjs/);
  assert.match(build,/company-development-roblox-headless-fast-mvp\.mjs/);
  assert.match(build,/roblox-place-package-count-invalid/);
  assert.match(build,/for file in "\$\{scripts\[@\]\}"; do \/tmp\/luau-bin\/luau-compile/);
  assert.match(build,/candidate preflight identity mismatch/);
  assert.doesNotMatch(build,/fetch-depth: 0/);
  assert.doesNotMatch(build,/gh pr merge|git push/);
  assert.match(releaseWorkflow.slice(promoteStart),/needs: \[inspect, roblox-package\]/);
  assert.match(releaseWorkflow.slice(promoteStart),/validationMode:'STATIC'/);
  assert.match(releaseWorkflow.slice(promoteStart),/candidate static run mismatch/);
  assert.doesNotMatch(releaseWorkflow.slice(promoteStart),/test "\$STUDIO_RESULT" = success/);
  assert.match(releaseWorkflow.slice(promoteStart),/verified:false,staticVerified:pass/);
  assert.match(releaseWorkflow.slice(promoteStart),/stage:'SOURCE_PROMOTION'/);
  assert.match(native,/candidate must schedule exactly one Studio playtest/);
  assert.match(native,/ROBLOX_CANDIDATE_STUDIO_CANONICAL_WRITE=NO'[\s\S]*?exit 0[\s\S]*?git -C runtime config/);
  assert.match(native,/candidate_context == '' && steps\.studio_play/);
  const followup=native.slice(native.indexOf('      - name: Dispatch exact Studio MCP follow-up'),native.indexOf('      - name: Enforce persistent Open Cloud probe failures'));
  assert.doesNotMatch(followup,/if: \$\{\{ false \}\}/);
});

// 빌드 전 소스 진입 검수: 산출물은 이후 기존 빌드·컴파일·실행 게이트가 검증한다.
test('Roblox source candidates reach package build without prebuilt artifacts',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'candidate-source-admission-'));
  try{
    const root=path.join(temp,'roblox-games/demo');
    fs.mkdirSync(root,{recursive:true});
    fs.writeFileSync(path.join(root,'default.project.json'),'{"name":"demo","tree":{"$className":"DataModel"}}');
    fs.writeFileSync(path.join(root,'Game.server.luau'),'print("candidate")\n');
    const start=releaseWorkflow.indexOf('          if [ "$decision" = \'roblox\' ]; then');
    const end=releaseWorkflow.indexOf('\n          fi',start);
    assert.ok(start>0&&end>start);
    const script='reject() { echo "REJECT:$1"; exit 0; };\n'+releaseWorkflow.slice(start,end+13).replace(/^ {10}/gm,'')+'\necho BUILD_READY';
    const run=()=>execFileSync('bash',['-e','-c',script],{cwd:temp,encoding:'utf8',env:{...process.env,decision:'roblox',source_root:'roblox-games/demo'}});
    assert.match(run(),/BUILD_READY/);
    fs.unlinkSync(path.join(root,'default.project.json'));
    assert.match(run(),/REJECT:roblox-project-missing/);
    fs.writeFileSync(path.join(root,'default.project.json'),'{}');
    fs.unlinkSync(path.join(root,'Game.server.luau'));
    fs.writeFileSync(path.join(root,'old.rbxlx'),'<roblox/>');
    fs.writeFileSync(path.join(root,'roblox-technical-validation.json'),'{"pass":true}');
    assert.match(run(),/REJECT:roblox-source-scripts-missing/);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('queue settlement shallow snapshots still refresh after concurrent writer and push safely',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'candidate-settlement-'));
  const upstream=path.join(temp,'upstream'),checkout=path.join(temp,'checkout'),contract=path.join(temp,'contract');
  fs.mkdirSync(upstream);
  const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  try{
    git(upstream,'init','-b','main');git(upstream,'config','user.name','QA');git(upstream,'config','user.email','qa@example.invalid');
    fs.writeFileSync(path.join(upstream,'contract.txt'),'current contract');git(upstream,'add','.');git(upstream,'commit','-m','main');
    git(upstream,'checkout','-b','vibe2-unreal-core');
    fs.writeFileSync(path.join(upstream,'queue.json'),'old state');git(upstream,'add','.');git(upstream,'commit','-m','control');
    const clone=releaseWorkflow.match(/gh repo clone "\$GITHUB_REPOSITORY" \/tmp\/vibe2-control -- ([^\n]+?) >\/dev\/null/)?.[1];
    assert.ok(clone);
    git(temp,'clone',...clone.split(' '),`file://${upstream}`,checkout);
    assert.equal(git(checkout,'rev-list','--count','HEAD'),'1');
    const fetch=releaseWorkflow.match(/git -C \/tmp\/vibe2-control (fetch [^\n]+main:refs\/remotes\/origin\/main --quiet)/)?.[1];
    assert.ok(fetch);git(checkout,...fetch.split(' '));
    git(checkout,'worktree','add','--detach',contract,'origin/main');
    assert.equal(fs.readFileSync(path.join(contract,'contract.txt'),'utf8'),'current contract');
    fs.writeFileSync(path.join(upstream,'other-task.txt'),'concurrent work');git(upstream,'add','.');git(upstream,'commit','-m','concurrent settlement');
    const refresh=releaseWorkflow.match(/^            (git fetch [^\n]+vibe2-unreal-core[^\n]*--quiet)$/m)?.[1];
    assert.ok(refresh);execFileSync('bash',['-e','-c',refresh],{cwd:checkout,stdio:'pipe'});
    git(checkout,'reset','--hard','origin/vibe2-unreal-core');
    assert.equal(fs.readFileSync(path.join(checkout,'other-task.txt'),'utf8'),'concurrent work');
    git(checkout,'config','user.name','QA');git(checkout,'config','user.email','qa@example.invalid');
    fs.writeFileSync(path.join(checkout,'queue.json'),'repair required');git(checkout,'add','.');git(checkout,'commit','-m','settle');
    git(upstream,'checkout','main');git(checkout,'push','origin','HEAD:vibe2-unreal-core');
    assert.equal(git(upstream,'show','vibe2-unreal-core:queue.json'),'repair required');
    assert.equal(git(upstream,'show','vibe2-unreal-core:other-task.txt'),'concurrent work');
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

// 빠른 복구는 단일 브랜치 checkout에서도 최신 제어 브랜치로 복구 작업을 시작해야 한다.
test('fast recovery fetch binds shallow control ref from a main-only checkout',()=>{
  const fast=fs.readFileSync('.github/workflows/vibe2-recovery-fast.yml','utf8');
  const fetch=fast.match(/^            (git fetch [^\n]+)$/m)?.[1];
  assert.ok(fetch);
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'fast-recovery-ref-'));
  const upstream=path.join(temp,'upstream'),checkout=path.join(temp,'checkout'),control=path.join(temp,'control');
  fs.mkdirSync(upstream);
  const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  try{
    git(upstream,'init','-b','main');git(upstream,'config','user.name','QA');git(upstream,'config','user.email','qa@example.invalid');
    fs.writeFileSync(path.join(upstream,'source.txt'),'main');git(upstream,'add','.');git(upstream,'commit','-m','main');
    git(upstream,'checkout','-b','vibe2-unreal-core');
    fs.writeFileSync(path.join(upstream,'queue.json'),'latest control');git(upstream,'add','.');git(upstream,'commit','-m','control');
    git(temp,'clone','--single-branch','--depth=1','--no-tags','--branch','main',`file://${upstream}`,checkout);
    assert.throws(()=>git(checkout,'rev-parse','--verify','origin/vibe2-unreal-core'));
    execFileSync('bash',['-e','-c',fetch],{cwd:checkout,stdio:'pipe'});
    git(checkout,'worktree','add','--detach',control,'origin/vibe2-unreal-core');
    assert.equal(fs.readFileSync(path.join(control,'queue.json'),'utf8'),'latest control');
    assert.equal(git(checkout,'rev-list','--count','origin/vibe2-unreal-core'),'1');
    fs.writeFileSync(path.join(upstream,'queue.json'),'concurrent update');git(upstream,'add','.');git(upstream,'commit','-m','control advance');
    execFileSync('bash',['-e','-c',fetch],{cwd:checkout,stdio:'pipe'});
    assert.equal(git(checkout,'show','origin/vibe2-unreal-core:queue.json'),'concurrent update');
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});


test('all candidate settlement clones configure existing GitHub token for git push',()=>{
  const clones=[...releaseWorkflow.matchAll(/^          gh repo clone "\$GITHUB_REPOSITORY" \/tmp\/vibe2-control --/gm)];
  assert.ok(clones.length>=5);
  for(const clone of clones){
    const prefix=releaseWorkflow.slice(0,clone.index);
    assert.match(prefix,/gh auth setup-git --hostname github\.com\n$/);
    const step=prefix.slice(prefix.lastIndexOf('      - name:'));
    assert.match(step,/GH_TOKEN: \$\{\{ github\.token \}\}/);
    assert.match(step,/set -euo pipefail/);
  }
});

test('shallow Roblox promotion preserves exact candidate, main drift guard and merged tree comparison',()=>{
  const section=releaseWorkflow.slice(releaseWorkflow.indexOf('  roblox-release:'));
  assert.match(section,/ref: \$\{\{ needs\.inspect\.outputs\.candidate_sha \}\}\n          fetch-depth: 1/);
  const promote=section.slice(section.indexOf('      - name: Promote verified Roblox'),section.indexOf('      - name: Hand exact'));
  const fetches=[...promote.matchAll(/^          (git fetch [^\n]+)$/gm)].map(x=>x[1]);
  assert.equal(fetches.length,4);
  assert.ok(fetches.every(x=>x.includes('--depth=1')));
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-promotion-'));
  const upstream=path.join(temp,'upstream'),checkout=path.join(temp,'checkout'),worktree=path.join(temp,'promote');
  fs.mkdirSync(upstream);
  const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  try{
    git(upstream,'init','-b','main');git(upstream,'config','user.name','QA');git(upstream,'config','user.email','qa@example.invalid');
    fs.mkdirSync(path.join(upstream,'game'));fs.writeFileSync(path.join(upstream,'game/source'),'base');
    git(upstream,'add','.');git(upstream,'commit','-m','base');const base=git(upstream,'rev-parse','HEAD');
    git(upstream,'checkout','-b','candidate');fs.writeFileSync(path.join(upstream,'game/source'),'verified');git(upstream,'commit','-am','candidate');
    const candidate=git(upstream,'rev-parse','HEAD');
    git(temp,'clone','--single-branch','--depth=1','--no-tags','--branch','candidate',`file://${upstream}`,checkout);
    assert.equal(git(checkout,'rev-list','--count','HEAD'),'1');
    fs.writeFileSync(path.join(upstream,'game/source'),'later unverified');git(upstream,'commit','-am','candidate moved');
    git(upstream,'checkout','main');fs.writeFileSync(path.join(upstream,'unrelated'),'main update');git(upstream,'add','.');git(upstream,'commit','-m','unrelated');
    const fetch=cmd=>execFileSync('bash',['-e','-c',cmd],{cwd:checkout,env:{...process.env,BASE_SHA:base},stdio:'pipe'});
    fetch(fetches[0]);fetch(fetches[1]);
    assert.equal(git(checkout,'diff','--name-only',base,'origin/main','--','game'),'');
    git(checkout,'worktree','add','-b','release',worktree,'origin/main');
    git(worktree,'config','user.name','QA');git(worktree,'config','user.email','qa@example.invalid');
    git(worktree,'checkout',candidate,'--','game');assert.equal(fs.readFileSync(path.join(worktree,'game/source'),'utf8'),'verified');
    git(worktree,'commit','-am','promote');const release=git(worktree,'rev-parse','HEAD');
    fs.writeFileSync(path.join(upstream,'game/source'),'concurrent game edit');git(upstream,'commit','-am','drift');fetch(fetches[2]);
    assert.equal(git(checkout,'diff','--name-only',base,'origin/main','--','game'),'game/source');
    fs.writeFileSync(path.join(upstream,'game/source'),'verified');git(upstream,'commit','-am','equivalent squash result');fetch(fetches[3]);
    assert.equal(git(checkout,'diff','--name-only',release,'origin/main','--','game'),'');
    assert.equal(git(checkout,'rev-parse',release+':game'),git(checkout,'rev-parse','origin/main:game'));
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});


test('Roblox F9 refill keeps lane coalescing while exact game context reaches the canonical planner',()=>{
  assert.ok(workflow.includes("VIBE2_FANIN_SOURCE_TASK: \${{ github.event.client_payload.source_task || '' }}"));
  assert.ok(workflow.includes("VIBE2_FANIN_REASON: \${{ github.event.client_payload.reason || '' }}"));
  assert.match(workflow,/VIBE2_ROBLOX_F9_FANIN_WAKE_REBASED_TO_LATEST=/);
  assert.match(workflow,/roblox-f9-verified-next-evolution/);
  assert.ok(workflow.includes('--requested-game="$VIBE2_FANIN_SOURCE_TASK"'));
  assert.ok(workflow.includes("format('vibe2-fanin-refill-{0}'"));
  assert.match(workflow,/cancel-in-progress: false/);
});
