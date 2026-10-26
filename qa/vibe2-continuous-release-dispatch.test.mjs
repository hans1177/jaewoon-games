// 파일명: qa/vibe2-continuous-release-dispatch.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// 웹 배포 책임 범위는 후보와 같은 소스 및 생성 자산 집합이어야 한다.
test('Web promotion keeps generated assets and checks drift across the complete candidate boundary',()=>{
  const section=releaseWorkflow.slice(releaseWorkflow.indexOf('      - name: Promote approved web source root'),releaseWorkflow.indexOf('      - name: Settle web result'));
  assert.match(section,/GENERATED_ASSET_FILES: \$\{\{ needs\.inspect\.outputs\.generated_asset_files \}\}/);
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'web-promotion-assets-'));
  const git=(...args)=>execFileSync('git',args,{cwd:temp,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  try{
    git('init','-b','main');git('config','user.name','QA');git('config','user.email','qa@example.invalid');
    fs.mkdirSync(path.join(temp,'web-games/demo'),{recursive:true});
    fs.mkdirSync(path.join(temp,'assets/demo'),{recursive:true});
    fs.writeFileSync(path.join(temp,'web-games/demo/index.html'),'old');
    fs.writeFileSync(path.join(temp,'assets/demo/motion.json'),'old asset');
    git('add','.');git('commit','-qm','base');const base=git('rev-parse','HEAD');
    git('checkout','-qb','candidate');
    fs.writeFileSync(path.join(temp,'web-games/demo/index.html'),'new source');
    fs.writeFileSync(path.join(temp,'assets/demo/motion.json'),'new asset');
    git('commit','-qam','candidate');const candidate=git('rev-parse','HEAD');
    git('checkout','main');
    const checkout=section.split('\n').find(line=>line.trim().startsWith('git checkout "$CANDIDATE_SHA"'));
    const stage=section.split('\n').find(line=>line.trim().startsWith('git add '));
    assert.ok(checkout&&stage);
    execFileSync('bash',['-euc','mapfile -t generated_asset_files < <(node -e \'for(const file of JSON.parse(process.env.GENERATED_ASSET_FILES))console.log(file)\'); promotion_paths=("$SOURCE_ROOT" "${generated_asset_files[@]}");\n'+checkout+'\n'+stage],{cwd:temp,env:{...process.env,SOURCE_ROOT:'web-games/demo',CANDIDATE_SHA:candidate,GENERATED_ASSET_FILES:'["assets/demo/motion.json"]'},stdio:'pipe'});
    assert.equal(git('show',':assets/demo/motion.json'),'new asset');
    assert.deepEqual(git('diff','--cached','--name-only').split('\n'),['assets/demo/motion.json','web-games/demo/index.html']);
    const comparisons=section.split('\n').filter(line=>line.includes('git diff')&&!line.includes('--cached')&&!line.includes('diff --check'));
    assert.equal(comparisons.length,5);
    for(const line of comparisons)assert.ok(line.includes('"${promotion_paths[@]}"'),line);
    git('reset','--hard',base);
    fs.writeFileSync(path.join(temp,'assets/demo/motion.json'),'concurrent asset edit');git('commit','-qam','asset drift');
    assert.equal(git('diff','--name-only',base,'HEAD','--','web-games/demo','assets/demo/motion.json'),'assets/demo/motion.json');
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});


const workflow=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
const releaseWorkflow=fs.readFileSync('.github/workflows/vibe2-candidate-release.yml','utf8');
const unityWebWorkflow=fs.readFileSync('.github/workflows/unity-web-first-stage-build.yml','utf8');
const unityReleaseWorkflow=fs.readFileSync('.github/workflows/vibe2-unity-release-result.yml','utf8');

test('candidate release keeps Work-Locked generated assets through Roblox Unity and Unity Web reviewed promotion',()=>{
  assert.match(releaseWorkflow,/generated_asset_files: \$\{\{ steps\.gate\.outputs\.generated_asset_files \}\}/);
  assert.match(releaseWorkflow,/generated asset missing from work lock/);
  assert.match(releaseWorkflow,/VIBE2_CANDIDATE_GENERATED_ASSET_FILES=/);
  assert.match(releaseWorkflow,/GENERATED_ASSET_FILES: \$\{\{ needs\.inspect\.outputs\.generated_asset_files \}\}/);
  assert.match(releaseWorkflow,/promotion_paths=\("\$SOURCE_ROOT" "\$\{generated_asset_files\[@\]\}"\)/);
  assert.match(releaseWorkflow,/generated_asset_files="\$GENERATED_ASSET_FILES"/);

  assert.match(unityReleaseWorkflow,/generated_asset_files/);
  assert.match(unityReleaseWorkflow,/promotion_paths=\("\$SOURCE_ROOT" "\$\{generated_asset_files\[@\]\}"\)/);
  assert.match(unityReleaseWorkflow,/git checkout "\$CANDIDATE_SHA" -- "\$\{promotion_paths\[@\]\}"/);
  assert.match(unityReleaseWorkflow,/asset_promotion_candidates/);
  assert.match(unityReleaseWorkflow,/Persist exact Unity generated asset runtime promotion plan/);
  assert.match(unityReleaseWorkflow,/unityAssetRuntimePromotionPlan/);
  assert.match(unityReleaseWorkflow,/status:'PENDING_EXACT_NATIVE_RUNTIME'/);

  assert.match(unityWebWorkflow,/generated_asset_files:/);
  assert.match(unityWebWorkflow,/candidate_paths=\("unity-games\/\$GAME_ID" "\$\{generated_asset_files\[@\]\}"\)/);
  assert.match(unityWebWorkflow,/git checkout "\$SOURCE_COMMIT" -- "\$\{candidate_paths\[@\]\}"/);
  assert.match(unityWebWorkflow,/UNITY_WEB_MAIN_SOURCE_OR_ASSET_DRIFT_BEFORE_MERGE/);
});

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

test('work order resolves the asset library and game source from pinned main while retaining current control state',()=>{
  const start=workflow.indexOf('      - name: Build reserved task work order');
  const run=workflow.indexOf('        run: |\n',start)+'        run: |\n'.length;
  // 실제 주문 생성 뒤에는 정책 경로를 지정한 별도 소스 검증 명령이 이어진다.
  // 임시 폴더에서는 기존 주문 생성 단계만 격리 실행한다.
  const end=workflow.indexOf('          COMPANY_VERIFIED_POLICY_PATH="$contract_root/company-learning/platform-release-roadmap.json" node --input-type=module',run);
  assert.ok(start>0&&end>run,'the work-order command and separate verified source gate must both exist');
  const script=workflow.slice(run,end).replace(/^ {10}/gm,'');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'work-order-roots-'));
  const contract=path.join(root,'vibe2-contract');
  try{
    fs.mkdirSync(path.join(root,'.vibe2'),{recursive:true});
    fs.mkdirSync(path.join(contract,'tools'),{recursive:true});
    fs.mkdirSync(path.join(contract,'.vibe2'),{recursive:true});
    fs.mkdirSync(path.join(contract,'web-games/demo'),{recursive:true});
    fs.mkdirSync(path.join(root,'vibe2-learning-memory/company-learning'),{recursive:true});
    const queueFile=path.join(root,'.vibe2/queue.json');
    const libraryFile=path.join(contract,'company-asset-library.json');
    const library=JSON.stringify({version:112,assets:[{id:'existing-asset'}]});
    fs.writeFileSync(libraryFile,library);
    fs.writeFileSync(queueFile,JSON.stringify({identity:'current-control'}));
    fs.writeFileSync(path.join(contract,'.vibe2/queue.json'),JSON.stringify({identity:'stale-main-mirror'}));
    fs.writeFileSync(path.join(contract,'vibe2-runtime.json'),'{}');
    fs.writeFileSync(path.join(contract,'web-games/demo/index.html'),'current main source');
    fs.writeFileSync(path.join(root,'vibe2-learning-memory/company-learning/vibe3-task-playbooks.json'),JSON.stringify({identity:'cohort-learning'}));
    fs.writeFileSync(path.join(contract,'tools/vibe2-continuous-runner.mjs'),`
import fs from 'node:fs';
import path from 'node:path';
const args=Object.fromEntries(process.argv.slice(2).map(arg=>{const i=arg.indexOf('=');return[arg.slice(2,i),arg.slice(i+1)];}));
const read=file=>fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
const library=read(path.join(process.cwd(),'company-asset-library.json'));
const source=path.join(process.cwd(),'web-games/demo/index.html');
const result={root:process.cwd(),registryAssetCount:(library.assets||[]).length,source:fs.existsSync(source)?fs.readFileSync(source,'utf8'):null,queue:read(args.queue).identity,learning:read(args.playbooks).identity};
fs.writeFileSync(args.output,JSON.stringify(result));
`);
    const output=path.join(root,'order.json'),log=path.join(root,'order.log');
    const isolated=script.replaceAll('/tmp/vibe2-work-order.json',output).replaceAll('/tmp/vibe2-order.log',log);
    const execute=body=>{
      execFileSync('bash',['-euo','pipefail','-c',body],{cwd:root,stdio:'pipe',env:{...process.env,GITHUB_WORKSPACE:root,TASK_ID:'web-demo',VARIANT:'primary'}});
      return JSON.parse(fs.readFileSync(output,'utf8'));
    };
    const before=execute(isolated.replace('cd "$contract_root"',''));
    assert.equal(before.registryAssetCount,0,'state-only checkout reproduces empty-library failure');
    assert.equal(before.source,null);
    const after=execute(isolated);
    assert.deepEqual(after,{root:contract,registryAssetCount:1,source:'current main source',queue:'current-control',learning:'cohort-learning'});
    assert.equal(fs.readFileSync(libraryFile,'utf8'),library,'library input must remain read-only');
    assert.equal(JSON.parse(fs.readFileSync(queueFile,'utf8')).identity,'current-control');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

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
  assert.match(section,/source_tree_sha="\$\(git rev-parse "\$promotion_sha:\$SOURCE_ROOT"\)"/);
  assert.match(section,/VIBE2_WEB_MAIN_PROMOTION_SOURCE_TREE_SHA/);
  assert.match(section,/PROMOTED_SOURCE_TREE_SHA:/);
  assert.match(section,/WEB_PROMOTED_SOURCE_TREE_IDENTITY=INVALID/);
  assert.match(section,/web-github-pages-deployment-pass/);
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

test('Web F9 release admission rejects a branch whose current source differs from reviewed source',()=>{
  const start=releaseWorkflow.indexOf("          const queue=JSON.parse(fs.readFileSync('/tmp/vibe2-current-control-queue.json','utf8'));");
  const end=releaseWorkflow.indexOf('\n          NODE',start);
  assert.ok(start>0&&end>start);
  const script=releaseWorkflow.slice(start,end);
  const candidateSha='a'.repeat(40),branch='vibe2/candidate/web-exact';
  for(const status of ['running','verified']){
    for(const reviewedSha of [candidateSha,'b'.repeat(40),'']){
      const task={id:'web-task',status,blocker:'candidate-awaiting-qa-and-deployment',evidence:[branch,
        'package-review:all-required-roles-pass','web-f0-f9-verified','web-f9-verified',
        'web-publish-after-f9-required',...(reviewedSha?['candidate-sha:'+reviewedSha]:[])]};
      let output='';
      new Function('fs','process',script)(
        {readFileSync:()=>JSON.stringify({tasks:[task]})},
        {env:{TASK_ID:task.id,CANDIDATE_BRANCH:branch,CANDIDATE_SHA:candidateSha,TARGET:'web',EVIDENCE_ONLY:'false'},stdout:{write:value=>{output=value;}}}
      );
      assert.equal(output,reviewedSha===candidateSha?'CURRENT':'STALE',status+':'+reviewedSha);
    }
  }
});

test('existing GitHub Pages publisher preserves root paths, existing gh-pages history, games and necessary assets',()=>{
  const publisher=fs.readFileSync('.github/workflows/magic-forest-pages.yml','utf8');
  assert.match(publisher,/name: Magic Forest Static Play/);
  // Every merged main commit publishes, including policy, catalog, Vibe, media and arbitrary source changes.
  const mainPush=publisher.split('  push:')[1]?.split('  workflow_dispatch:')[0]||'';
  assert.match(mainPush,/branches:\s*\[main\]/);
  assert.doesNotMatch(mainPush,/^\s*(?:paths|paths-ignore|if):/m,'no post-merge trigger exclusions');
  assert.match(publisher,/OWNER-LOCKED PUBLICATION TRIGGER/);
  assert.match(publisher,/workflow_dispatch:/);
  assert.equal((publisher.match(/^  workflow_dispatch:$/gm)||[]).length,1,'Pages publisher must declare manual workflow dispatch only once');
  assert.match(publisher,/web-games\/publish-manifest\.json/);
  assert.match(publisher,/sourceSha:process\.env\.GITHUB_SHA/);
  assert.ok(publisher.includes('sourceTreeShas'), 'published manifest carries per-game source identity');
  assert.ok(publisher.includes("cp.execFileSync('git',['ls-tree','-z','HEAD:web-games']"), 'source identity comes from the exact main Git tree in one read');
  assert.ok(publisher.includes('gameTreeShas.get(id)'), 'per-game source SHA comes from the main Git tree index');
  assert.ok(publisher.includes('sourceTreeShas[id]=treeSha'), 'per-game source SHA is retained in the publication manifest');
  assert.ok(publisher.includes('m.sourceTreeShas?.[id]'), 'missing per-game tree hashes must fail live verification');

  // Current Pages publisher copies all game roots in bounded async workers.
  // Verify full paths and propagation of actual copy failures (not a no-op shortcut).
  assert.match(publisher,/await fs\.promises\.cp\(root,path\.join\(site,root\),\{recursive:true\}\)/);
  assert.match(publisher,/for\(const result of gameCopyResults\)if\(result\.status==='rejected'\)throw result\.reason/);
  assert.match(publisher,/PAGES_GAME_COPY_PARALLELISM=8/);
  assert.match(publisher,/git clone --quiet --depth=1 --single-branch --branch gh-pages/);
  // 새 공식 홈 리다이렉트는 존재 여부뿐 아니라 내용이 비어 있지 않아야 한다.
  assert.match(publisher,/test -s "\$site\/index\.html"/);
  assert.match(publisher,/GITHUB_PAGES_LFS_POINTER_NOT_PLAYABLE/);
  assert.match(publisher,/git -C "\$site" push origin HEAD:gh-pages/);

  // The GITHUB_TOKEN push saves history but cannot initiate a Pages build.
  // Official deployment uploads the retained gh-pages tree without Git metadata.
  assert.ok(publisher.includes('shopt -s dotglob nullglob'),'include hidden published entries in the official Pages artifact');
  assert.ok(publisher.includes('[[ "${entry##*/}" == .git ]] || published_entries+=("$entry")'),'exclude only Git metadata from retained tree');
  assert.ok(publisher.includes('cp -a --reflink=auto -- "${published_entries[@]}" "$artifact/"'),'copy exact published entries into the Pages artifact');
  assert.ok(publisher.includes('test ! -e "$artifact/.git"'),'Git metadata must be excluded from official Pages artifact');
  assert.ok(publisher.includes('test -d "$retained/.git"'),'retained history must remain intact before staging');
  assert.ok(publisher.includes('WEB_PAGES_EXACT_ARTIFACT_SOURCE_SHA='));
  assert.ok(publisher.includes('WEB_PAGES_RETAINED_GAME_COUNT='));
  assert.ok(publisher.includes('uses: actions/upload-pages-artifact@v4'));
  assert.ok(publisher.includes('uses: actions/deploy-pages@v4'));
  assert.ok(publisher.includes('pages: write'));
  assert.ok(publisher.includes('id-token: write'));
  assert.ok(publisher.includes('name: github-pages'));
  const nativeDeploy=publisher.indexOf('uses: actions/deploy-pages@v4');
  const liveVerify=publisher.indexOf('      - name: Verify live GitHub Pages source and game routes');
  assert.ok(nativeDeploy>0&&liveVerify>nativeDeploy,'actual Pages deploy must precede public verification');
  assert.ok(publisher.includes('steps.deployment.outputs.page_url'));
  assert.ok(publisher.includes('WEB_PAGES_DEPLOY_URL_MISSING'));
  assert.doesNotMatch(publisher,/git push origin HEAD:gh-pages --force/);
  assert.match(publisher,/if: github\.event_name != 'pull_request'/);
  assert.match(publisher,/WEB_PAGES_LIVE_ASSETS_HTTP_200=PASS/);
  // GitHub Pages는 Cloudflare 리다이렉트가 아니라 실제 공식 홈과 의존 자산을 배포한다.
  assert.match(publisher,/PAGES_OFFICIAL_HOME_RENDER_QA=PASS/);
  assert.match(publisher,/WEB_PAGES_CANONICAL_HOMEPAGE_NOT_LIVE/);
  assert.match(publisher,/WEB_PAGES_HOME_RENDERER_PATH_MISMATCH/);
  assert.match(publisher,/WEB_PAGES_HOME_DEPENDENCY_NOT_LIVE/);
  assert.match(publisher,/data-homepage-version="SAMPLE_FRONT_DOOR_V1"/);
  assert.match(publisher,/WEB_PAGES_ROUTE_NOT_LIVE=/);
  assert.match(publisher,/WEB_PAGES_SOURCE_SHA=/);
  assert.match(publisher,/WEB_PAGES_LIVE_SOURCE_SHA=/);
});

test('Web main deployment requires exact F9 game source tree in GitHub Pages, real route and non-200 failure handling',()=>{
  const section=releaseWorkflow.slice(releaseWorkflow.indexOf('  web-release:'),releaseWorkflow.indexOf('\n  unity-web-build:'));
  const promote=section.slice(section.indexOf('      - name: Promote approved web'),section.indexOf('      - name: Settle web result'));
  assert.match(section,/ref: \$\{\{ needs\.inspect\.outputs\.candidate_sha \}\}/);
  assert.match(promote,/promotion_sha="\$\(gh pr view[^\n]*--json mergeCommit/);
  assert.match(promote,/gh pr merge "\$pr_url"/);
  assert.ok(promote.includes('gh workflow run magic-forest-pages.yml'),'candidate promotion must explicitly dispatch the existing Pages publisher after GITHUB_TOKEN PR merge');
  assert.ok(promote.includes('WEB_PAGES_NATIVE_PUBLISH_DISPATCHED='));
  assert.ok(promote.includes('WEB_PAGES_NATIVE_PUBLISH_ALREADY_ACTIVE='));
  const pagesDispatch=promote.indexOf('gh workflow run magic-forest-pages.yml');
  assert.ok(pagesDispatch>promote.indexOf('gh pr merge "$pr_url"'),'publisher must run only after approved merge');
  assert.ok(promote.includes('.head_sha=='),'same exact SHA must suppress duplicate queued publisher');
  assert.match(promote,/Homepage PR Fast QA/);
  assert.match(promote,/publish-manifest\.json/);
  assert.ok(promote.includes('m.sourceTreeShas?.[gameId]!==treeSha'),'web must require exact F9 game tree in published manifest');
  assert.match(promote,/m\.routes\.includes\(route\)/);
  assert.match(promote,/curl --fail/);
  assert.match(promote,/target_route="web-games\/\$GAME_ID\/"/);
  assert.match(promote,/if \[ "\$published" != true \]; then/);
  assert.match(promote,/VIBE2_WEB_CURRENT_DEPLOYMENT_CHECK=SUCCESS/);
  assert.match(promote,/deployment_pass=true/);
  assert.doesNotMatch(promote,/select\(\.name=="Cloudflare Pages"\)/);
  assert.doesNotMatch(promote,/git push origin HEAD:gh-pages --force/);
  // Both SHA and individual game path must bind to the actual published manifest.
  const verification=promote.slice(promote.indexOf("          const fs=require('node:fs');"),promote.indexOf("          NODE",promote.indexOf("          const fs=require('node:fs');")));
  assert.ok(verification.includes('m.sourceTreeShas?.[gameId]!==treeSha'),'verified game tree must agree with real published route');
  assert.match(verification,/!m\.routes\.includes\(route\)/);
});


test('Web successful syntax and promotion cannot settle PASS without production deployment proof',()=>{
  const start=releaseWorkflow.indexOf('          if [ "$QA_OUTCOME" = success ] && [ "$PROMOTE_OUTCOME" = success ]');
  const end=releaseWorkflow.indexOf('\n          if [ "$CANDIDATE_ORIGIN"',start);
  assert.ok(start>0&&end>start);
  const script=releaseWorkflow.slice(start,end).replace(/^ {10}/gm,'')+'\nprintf "%s" "$result"';
  for(const [deployment,tree,expected] of [
    ['true','d'.repeat(40),'PASS'],['false','d'.repeat(40),'DEPLOY_RETRY_REQUIRED'],
    ['', 'd'.repeat(40),'DEPLOY_RETRY_REQUIRED'],['true','','DEPLOY_RETRY_REQUIRED']
  ]){
    const result=execFileSync('bash',['-euo','pipefail','-c',script],{encoding:'utf8',stdio:'pipe',env:{...process.env,
      QA_OUTCOME:'success',PROMOTE_OUTCOME:'success',DEPLOYMENT_PASS:deployment,PROMOTED_SOURCE_TREE_SHA:tree}});
    assert.equal(result,expected);
  }
});


test('Vibe2 runtime design overlay preserves pinned main Git identity without modifying its source',()=>{
  assert.doesNotMatch(workflow,/git -C \/tmp\/vibe2-main (?:fetch|checkout|reset|cat-file)/);
  assert.match(workflow,/git -C "\$control_root" cat-file -e "\$company_runtime_snapshot_sha:\$runtime_design_path"/);
  assert.match(workflow,/git -C "\$control_root" archive "\$company_runtime_snapshot_sha" "\$runtime_design_path" \| tar -x -C \/tmp\/vibe2-main/);
  assert.match(workflow,/VIBE2_RUNTIME_DESIGN_OVERLAY=company-runtime:design,game-seed-state\.json/);
  assert.equal(workflow.split('VIBE2_RUNTIME_DESIGN_OVERLAY=company-runtime:design,game-seed-state.json').length-1,2);
  // A pinned worktree requires exactly one read-only SHA check; overlay must not mutate Git state.
  assert.match(workflow,/GIT_LFS_SKIP_SMUDGE=1 git worktree add --detach \/tmp\/vibe2-main "\$contract_sha"/);
  assert.match(workflow,/test "\$\(git -C \/tmp\/vibe2-main rev-parse HEAD\)" = "\$contract_sha"/);
  assert.equal(workflow.split('git -C /tmp/vibe2-main').length-1,1);
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
  assert.match(dispatch,/if \[ "\$target" = web \]; then[\s\S]*PLATFORM_PUBLISH_DISPATCH_FAILURE_BLOCKS_NEXT_EVOLUTION=NO:WEB:/);
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
  assert.match(section,/WEB_PUBLICATION_RETRY_TRACKED=YES/);
  assert.match(section,/WEB_SAME_VERIFIED_CANDIDATE_RETRY=YES/);
  assert.match(section,/WEB_F9_VERIFIED_QUEUE_PRESERVED_FOR_SAME_CYCLE_PUBLISH_RETRY=YES/);
  assert.match(section,/web-f9-publish-attempted-retry-in-parallel-with-next-cycle/);
  assert.match(section,/WEB_NEXT_EVOLUTION_CYCLE_DISPATCHED_AFTER_PUBLISH_ATTEMPT=/);
  assert.match(section,/AUTONOMOUS_NEXT_EVOLUTION_CYCLE=DISPATCHED_AFTER_WEB_PUBLISH_ATTEMPT/);
  const retryStart=section.indexOf('echo "WEB_PUBLICATION_RETRY_REQUIRED=');
  const retryEnd=section.indexOf('          rm -rf /tmp/vibe2-control',retryStart);
  assert.ok(retryStart>0&&retryEnd>retryStart);
  const retry=section.slice(retryStart,retryEnd);
  assert.match(retry,/WEB_NEXT_EVOLUTION_DISPATCH_AFTER_PUBLICATION_ATTEMPT=YES/);
  assert.match(retry,/WEB_PUBLICATION_RETRY_OWNER=VIBE2_24H_EXACT_F9_RECOVERY/);
  assert.doesNotMatch(retry,/gh workflow run vibe2-candidate-release\.yml/);
  const recovery=fs.readFileSync('.github/workflows/vibe2-24h-runner.yml','utf8');
  const recoveryStart=recovery.indexOf('      - name: Recover reviewed winners stranded before release dispatch');
  const recoveryEnd=recovery.indexOf('      - name: Upload generated machine handoff',recoveryStart);
  assert.ok(recoveryStart>0&&recoveryEnd>recoveryStart);
  const recoverySection=recovery.slice(recoveryStart,recoveryEnd);
  assert.match(recoverySection,/vibe2-release-dispatch-recovery\.mjs/);
  assert.match(recoverySection,/if \[ "\$remote_sha" != "\$candidate_sha" \]; then/);
  assert.match(recoverySection,/release-dispatch-recovery-at:\$stamp/);
  assert.match(recoverySection,/vibe2-candidate-release\.yml\/dispatches/);

  assert.doesNotMatch(retry,/exit 0/);
  // 기존 F9 상태를 보존하고 게시 실패를 QA 실패로 재분류하지 않는다.
  const queueStart=section.indexOf('node /tmp/vibe2-main-contract/tools/vibe2-queue-control.mjs pass --id=');
  const queueEnd=section.indexOf('node /tmp/vibe2-main-contract/tools/vibe2-queue-control.mjs storage-pack',queueStart);
  assert.ok(queueStart>0&&queueEnd>queueStart);
  const queue=section.slice(queueStart,queueEnd);
  const retryQueueStart=queue.indexOf('elif [ "$result" = DEPLOY_RETRY_REQUIRED ]; then');
  const retryQueueEnd=queue.indexOf('else',retryQueueStart);
  assert.ok(retryQueueStart>0&&retryQueueEnd>retryQueueStart);
  const retryQueue=queue.slice(retryQueueStart,retryQueueEnd);
  assert.match(retryQueue,/WEB_F9_VERIFIED_QUEUE_PRESERVED_FOR_SAME_CYCLE_PUBLISH_RETRY=YES/);
  assert.doesNotMatch(retryQueue,/web-release-qa-failed/);
  assert.match(section,/vibe2-queue-control\.mjs pass[\s\S]*web-github-pages-deployment-pass/);
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
  assert.equal(deployment?.cloudflareMainRequiredBeforeVibePass,false);
  assert.equal(deployment?.githubPagesMainRequiredBeforeVibePass,true);
  assert.equal(deployment?.nextBuildUpBeforeDeploymentSuccessForbidden,false);
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
  assert.match(followup,/if: \$\{\{ false \}\} # OWNER_DIRECTIVE_2026-10-05_CLOUD_API_ONLY/);
  const studioPlan=native.slice(native.indexOf('  studio-local-plan:'),native.indexOf('  studio-mcp-auto-play:'));
  assert.match(studioPlan,/if: \$\{\{ false \}\}/);
  assert.match(native,/const cloudApiOnly=true/);
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
  }finally{
    // Git worktree metadata can briefly outlive the final synchronous git command on CI.
    // Retry only teardown ENOTEMPTY/EBUSY races; assertions and promotion gates stay unchanged.
    fs.rmSync(temp,{recursive:true,force:true,maxRetries:5,retryDelay:100});
  }
});

// F9 이후 게이트는 출시 등급·점수와 독립적이다. 등록·활성·검증된 게임만 기존 배포 경로를 사용한다.
test('exact F9 publication excludes release classification and catalog scoring for every platform',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const loop=policy.developmentLifecycleMachine.verifiedF0F9PublicationLoop;
  const owner=policy.changeRecord.ownerEveryGameF9Publish20261018;
  const steps=loop.sequence;
  assert.deepEqual(steps.slice(1,11),['F0','F1','F2','F3','F4','F5','F6','F7','F8','F9']);
  assert.equal(steps[11],'PUBLISH_EVERY_F9_VERIFIED_GAME');
  assert.equal(steps.includes('RELEASE_CLASSIFICATION'),false);
  assert.equal(owner.publicationScoreGate,false);
  assert.equal(owner.publicationClassificationGate,false);
  const exactF9Sequence=policy.roblox.deploymentControl.verifiedCyclePublication.sequence.join('|');
  // The canonical locked dispatch step is exact artifact publication, with no
  // release grade/classification conditions. Keep the owner-locked order intact.
  assert.match(exactF9Sequence,/(?:^|\|)DISPATCH_EXACT_F9_ARTIFACT(?:\||$)/);
  assert.doesNotMatch(exactF9Sequence,/RELEASE_CLASSIFICATION|ONLY_IF_RELEASED|PUBLISH_IF_SCORED/);
  assert.doesNotMatch(policy.roblox.deploymentControl.verifiedCyclePublication.sequence.join('|'),/ONLY_IF_RELEASED/);
  const inspect=releaseWorkflow.slice(releaseWorkflow.indexOf('  inspect:'),releaseWorkflow.indexOf('  web-release:'));
  assert.match(inspect,/game-not-in-canonical-catalog/);
  assert.match(inspect,/game-not-active/);
  assert.doesNotMatch(inspect,/current-production-class-not-auto-deployable/);
  assert.match(releaseWorkflow,/WEB_DEPLOYMENT_ELIGIBILITY=PLAYABLE_F0_F9_PLUS_STATIC_SAVE_QA/);
});


test('every Web F0 candidate validates actual BUILD_UP asset lineage before publication',()=>{
  const source=releaseWorkflow;
  const marker="          MANIFEST=\"$manifest\" node <<'NODE'\n";
  const start=source.indexOf(marker);
  const end=source.indexOf("\n          NODE",start+marker.length);
  assert.ok(start>=0&&end>start,'web F0 candidate gate script missing');
  const script=source.slice(start+marker.length,end);
  const hash='a'.repeat(64),version=42;
  const manifest={
    taskId:'test-web-f0',gameId:'test-game',target:'web',sourceRoot:'web-games/test-game',
    baseMainSha:'b'.repeat(40),transportBaseSha:'b'.repeat(40),
    codingMethod:{
      internalAssetSourceUsageFingerprint:hash,internalAssetSourceUsageLibraryVersion:version,
      allGameDynamicAssetBindingRequired:true,allGameDynamicAssetBindingPass:true,
      allGameDynamicAssetBindingFingerprint:hash
    },
    assetProduction:{allGameDynamicLibraryBinding:{fingerprint:hash,libraryVersion:version}}
  };
  const runGate=(patch={})=>{
    let output='';
    const input={...manifest,...patch};
    const files={
      readFileSync(file){
        if(file==='fixture')return JSON.stringify(input);
        if(file==='/tmp/main-game-catalog.json')return JSON.stringify({games:[{
          id:'test-game',productionClass:'DEVELOPMENT_CONFIRMED',canonical:{lifecycle:{state:'ACTIVE'}}
        }]});
        throw Error('unexpected file '+file);
      },
      appendFileSync(file,text){assert.equal(file,'out');output+=text;}
    };
    vm.runInNewContext(script,{require:name=>{
      assert.equal(name,'fs');return files;
    },process:{env:{MANIFEST:'fixture',GITHUB_OUTPUT:'out'}}},{timeout:2000});
    return Object.fromEntries(output.trim().split('\n').map(line=>{
      const at=line.indexOf('=');return[line.slice(0,at),line.slice(at+1)];
    }));
  };
  assert.equal(runGate().candidate_decision,'web');
  assert.equal(runGate({codingMethod:{...manifest.codingMethod,internalAssetSourceUsageFingerprint:''}}).candidate_reason,'web-f0-build-up-asset-fingerprint-missing');
  assert.equal(runGate({codingMethod:{...manifest.codingMethod,allGameDynamicAssetBindingPass:false}}).candidate_reason,'web-f0-dynamic-asset-binding-unverified');
  assert.equal(runGate({codingMethod:{...manifest.codingMethod,allGameDynamicAssetBindingRequired:false}}).candidate_reason,'web-f0-dynamic-asset-binding-not-required');
  assert.equal(runGate({codingMethod:{...manifest.codingMethod,allGameDynamicAssetBindingFingerprint:'c'.repeat(64)}}).candidate_reason,'web-f0-dynamic-asset-binding-fingerprint-mismatch');
  assert.equal(runGate({assetProduction:{allGameDynamicLibraryBinding:{fingerprint:hash,libraryVersion:version+1}}}).candidate_reason,'web-f0-dynamic-asset-library-version-mismatch');
});

test('24H asset QA reuse requires successful full Core test job at the identical main SHA',()=>{
  const runner=fs.readFileSync('.github/workflows/vibe2-24h-runner.yml','utf8');
  const marker="core_qa_run_id=\"$(MAIN_SHA=\"$main_sha\" node <<'NODE'\n";
  const start=runner.indexOf(marker);
  const end=start<0?-1:runner.indexOf('\n          NODE',start+marker.length);
  assert.ok(start>=0&&end>start,'24H must select an exact-SHA Core QA run before attempting reuse');
  const script=runner.slice(start+marker.length,end);
  const candidateSha='b'.repeat(40);
  const selectedRun=workflowRuns=>{
    let observed='';
    vm.runInNewContext(script,{
      require(name){
        assert.equal(name,'fs');
        return {readFileSync(){return JSON.stringify({workflow_runs:workflowRuns})}};
      },
      process:{env:{MAIN_SHA:candidateSha},stdout:{write(value){observed=String(value)}}}
    });
    return observed;
  };
  const valid={name:'Vibe2 Core QA',head_sha:candidateSha,head_branch:'main',
    event:'push',status:'completed',conclusion:'success',id:123};
  assert.equal(selectedRun([valid]),'123');
  for(const overrides of [
    {head_sha:'a'.repeat(40)},{head_branch:'other'},{event:'pull_request'},
    {status:'in_progress'},{conclusion:'failure'}
  ])assert.equal(selectedRun([{...valid,...overrides}]),'0',JSON.stringify(overrides));
  assert.ok(runner.includes('actions/runs/${core_qa_run_id}/jobs?per_page=100'),
    'selected workflow must inspect its actual jobs before reusing asset regression');
  assert.ok(runner.includes('select(.name=="test")'),
    'skipped impact-scoped Core workflow cannot be treated as full suite PASS');
  assert.ok(runner.includes('if [ "$core_qa_test_conclusion" = success ]; then core_qa_reuse=1; fi'));
  assert.ok(runner.includes('VIBE2_24H_ASSET_QA=RUN_REQUIRED:'),
    'missing or skipped Core test must still run original 24H asset regression');
});
