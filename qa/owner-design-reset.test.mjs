import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {ensureOwnerDesignResetSeed,materializeOwnerDesignResetSeeds} from '../tools/owner-design-reset.mjs';
import {runOwnerAllGamesDesignReset,autoEnrollMissingDesignSeeds} from '../tools/company-all-games-design-reset.mjs';

test('active owner reset seeds stay DESIGN_ONLY inputs even when catalog development has already started',()=>{
  const queue=JSON.parse(fs.readFileSync('owner-design-reset-queue.json','utf8'));
  const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
  const active=(queue.requests||[]).filter(row=>String(row?.status||'').toUpperCase()==='ACTIVE');
  assert.ok(active.length>0);
  const promoted=[];
  for(const request of active){
    assert.ok(request.gameId);
    if(request.designRequest){
      assert.ok(request.designRequest.instruction);
      assert.ok(!request.seed,'owner brief must not contain a pre-authored seed design');
      const game=(catalog.games||[]).find(row=>row.id===request.gameId);
      if(game?.productionClass==='DEVELOPMENT_CONFIRMED')promoted.push(request.gameId);
      continue;
    }
    assert.ok(request.seed);
    assert.equal(request.seed.status,'ACTIVE');
    assert.equal(request.seed.productionClass,'DESIGN_ONLY');
    assert.equal(request.seed.UNITY_WEB_VALIDATION_SURFACE?.role,'VALIDATION_SURFACE_ONLY');
    assert.equal(request.seed.UNITY_WEB_VALIDATION_SURFACE?.canonicalSourceRoot,`unity-games/${request.gameId}`);
    assert.equal(request.seed.UNITY_WEB_VALIDATION_SURFACE?.outputRoot,`web-games/${request.gameId}`);
    assert.equal(request.seed.UNITY_WEB_VALIDATION_SURFACE?.legacyDirectWebAuthoring,false);
    const game=(catalog.games||[]).find(row=>row.id===request.gameId);
    if(game?.productionClass==='DEVELOPMENT_CONFIRMED')promoted.push(request.gameId);
  }
  assert.ok(promoted.length>0,'parallel strict-design review must cover already promoted development games too');
});

test('owner reset intake materializes canonical DESIGN_ONLY seeds without duplicate parallel state',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'owner-reset-'));
  const queue=path.join(dir,'queue.json');
  fs.writeFileSync(queue,JSON.stringify({requests:[{revision:'R1',gameId:'x',gameName:'X',status:'ACTIVE',seed:{seedId:'S1',GAME_CATEGORY:'CASUAL',INITIAL_TARGET_PLATFORM:'UNITY'}}]}));
  const state={version:1,seeds:[]};
  const first=ensureOwnerDesignResetSeed(state,'x',{file:queue});
  assert.equal(first.changed,true);
  assert.equal(first.seed.productionClass,'DESIGN_ONLY');
  assert.equal(first.seed.status,'ACTIVE');
  const second=ensureOwnerDesignResetSeed(state,'x',{file:queue});
  assert.equal(second.changed,false);
  assert.equal(state.seeds.length,1);
  const all=materializeOwnerDesignResetSeeds(state,{file:queue});
  assert.deepEqual(all.changed,[]);
  assert.equal(all.activeCount,1);
});


test('all-games reset workflow binds expected reset set to current DESIGN_ONLY catalog instead of hardcoded count',()=>{
  const workflow=fs.readFileSync('.github/workflows/owner-all-games-design-reset.yml','utf8');
  assert.doesNotMatch(workflow,/OWNER_ALL_GAMES_DESIGN_RESET_COUNT=19/);
  assert.doesNotMatch(workflow,/OWNER_ALL_GAMES_DESIGN_RESET_EXPECTED_COUNT=19/);
  assert.match(workflow,/productionClass\|\|'?\)?\.trim\(\)==='DESIGN_ONLY'|productionClass\|\|''/);
  assert.match(workflow,/OWNER_DESIGN_RESET_COUNT_MISMATCH/);
  assert.match(workflow,/OWNER_DESIGN_RESET_GAME_IDS_MISMATCH/);
  assert.match(workflow,/OWNER_ALL_GAMES_DESIGN_RESET_CATALOG_BINDING=PASS/);
  assert.match(workflow,/gh workflow run company-seed-design-runtime\.yml/);
});


test('only main pushes or explicit dispatch can run a writable design reset',()=>{
  const workflow=fs.readFileSync('.github/workflows/owner-all-games-design-reset.yml','utf8');
  assert.match(workflow,/  push:\n    branches: \[main\]/);
  assert.match(workflow,/  pull_request:\n    branches: \[main\]/);
  assert.match(workflow,/^permissions:\n  contents: read/m);
  assert.match(workflow,/  reset-to-design:\n    if: github\.event_name == 'workflow_dispatch' \|\| \(github\.event_name == 'push'/);
  assert.match(workflow,/    permissions:\n      contents: write\n      actions: write/);
  assert.match(workflow,/    if: github\.event_name == 'pull_request'/);
  assert.equal((workflow.match(/node tools\/company-shared-context\.mjs --output=\/tmp\/owner-reset-shared-context\.json/g)||[]).length,2,'PR and official reset must both enforce current central policy before writing');
  assert.equal((workflow.match(/node tools\/company-constitution-enforcer\.mjs --phase=owner-design-reset-prewrite/g)||[]).length,2,'both reset paths must enforce canonical owner rules');
});

test('explicit reset opt-out applies only to a trailing marker, not a squash-merge history bullet',()=>{
  const workflow=fs.readFileSync('.github/workflows/owner-all-games-design-reset.yml','utf8');
  assert.match(workflow,/!endsWith\(github\.event\.head_commit\.message, '\[owner-reset-trigger-scope-only\]'\)/);
  assert.doesNotMatch(workflow,/!contains\(github\.event\.head_commit\.message, '\[owner-reset-trigger-scope-only\]'\)/);
  const marker='[owner-reset-trigger-scope-only]';
  const mergeMessage='Fix reset workflow (#6527)\\n\\n* prior scoped-test commit '+marker+'\\n\\n* fix runtime branch checkout';
  assert.equal(mergeMessage.includes(marker),true);
  assert.equal(mergeMessage.endsWith(marker),false,'squashed history must not suppress the official main reset');
  assert.equal(('no-reset-intended '+marker).endsWith(marker),true,'direct scoped write must stay opt-out');
});

test('design reset runtime checkout tolerates dirty CI-only Unity LFS files without a force push',()=>{
  const workflow=fs.readFileSync('.github/workflows/owner-all-games-design-reset.yml','utf8');
  const copy=workflow.indexOf('cp tools/company-all-games-design-reset.mjs /tmp/company-all-games-design-reset.mjs');
  const checkout=workflow.indexOf('git checkout -f -B owner-all-games-design-reset-runtime "origin/$COMPANY_RUNTIME_BRANCH"');
  assert.ok(copy>=0&&checkout>copy,'canonical runtime script must be preserved before switching branches');
  assert.match(workflow,/git push origin "HEAD:refs\/heads\/\$COMPANY_RUNTIME_BRANCH"/);
  assert.doesNotMatch(workflow,/git push --force|git clean -fdx/);
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'owner-reset-lfs-'));
  const git=(...args)=>spawnSync('git',args,{cwd:root,encoding:'utf8'});
  const pass=(...args)=>{const result=git(...args);assert.equal(result.status,0,result.stderr);return result;};
  try{
    pass('init','-q','-b','main');
    pass('config','user.name','owner-reset-test');
    pass('config','user.email','owner-reset-test@example.invalid');
    const filename='hero-idle.tga';
    const asset=path.join(root,filename);
    fs.writeFileSync(asset,'committed Unity asset');
    pass('add',filename);
    pass('commit','-qm','main asset');
    pass('checkout','-qb','company-runtime');
    pass('rm','-q',filename);
    const runtimeState=JSON.stringify({seeds:[{gameId:'x',status:'ACTIVE',stage:'F4',saveSchemaVersion:3}]});
    fs.writeFileSync(path.join(root,'game-seed-state.json'),runtimeState);
    pass('add','game-seed-state.json');
    pass('commit','-qm','runtime state only');
    pass('checkout','-q','main');
    fs.writeFileSync(asset,'modified CI checkout asset');
    assert.notEqual(git('checkout','-B','owner-all-games-design-reset-runtime','company-runtime').status,0);
    pass('checkout','-f','-B','owner-all-games-design-reset-runtime','company-runtime');
    assert.equal(fs.existsSync(asset),false);
    assert.equal(pass('branch','--show-current').stdout.trim(),'owner-all-games-design-reset-runtime');
    assert.equal(pass('show',`main:${filename}`).stdout,'committed Unity asset','canonical main asset must remain in Git history');
    assert.equal(fs.readFileSync(path.join(root,'game-seed-state.json'),'utf8'),runtimeState,'runtime state must survive branch change');
    assert.equal(pass('show','company-runtime:game-seed-state.json').stdout,runtimeState,'runtime ref content must remain unchanged');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('all-games reset preserves active developed games and existing seed save metadata',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'owner-reset-developed-'));
  try{
    const catalog={games:[
      {id:'design-game',name:'Design',productionClass:'DESIGN_ONLY'},
      {id:'developed-game',name:'Developed',productionClass:'DEVELOPMENT_CONFIRMED'},
      {id:'reinstated-game',name:'Reinstated',productionClass:'DEVELOPMENT_CONFIRMED'}
    ]};
    const target={gameId:'design-game',status:'ACTIVE',productionClass:'DESIGN_ONLY',saveSchemaVersion:7,checkpoint:{wave:5}};
    const developed={gameId:'developed-game',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',development:{stage:'F4'},saveSchemaVersion:9,checkpoint:{wave:19}};
    const reinstated={gameId:'reinstated-game',status:'ACTIVE',productionClass:'DESIGN_ONLY',pausedReason:'NOT_IN_CANONICAL_GAME_CATALOG',pausedAt:'2026-10-09',checkpoint:{wave:11}};
    const removed={gameId:'removed-game',status:'ACTIVE',productionClass:'DESIGN_ONLY'};
    fs.writeFileSync(path.join(root,'game-catalog.json'),JSON.stringify(catalog));
    fs.writeFileSync(path.join(root,'game-seed-state.json'),JSON.stringify({version:2,seeds:[target,developed,reinstated,removed]}));
    const result=runOwnerAllGamesDesignReset({root,timestamp:'2026-10-10T00:00:00.000Z'});
    assert.equal(result.count,1);
    const updated=JSON.parse(fs.readFileSync(path.join(root,'game-seed-state.json'),'utf8'));
    const find=id=>updated.seeds.find(seed=>seed.gameId===id);
    assert.equal(find('design-game').productionClass,'DESIGN_ONLY');
    assert.equal(find('design-game').ownerResetRevision,'OWNER-ALL-GAMES-DESIGN-RESET-20260917-1');
    assert.equal(find('design-game').saveSchemaVersion,7);
    assert.deepEqual(find('design-game').checkpoint,{wave:5});
    assert.deepEqual(find('developed-game'),developed,'active developed game and F0-F9 stage must not be touched');
    assert.deepEqual(find('reinstated-game'),{gameId:'reinstated-game',status:'ACTIVE',productionClass:'DESIGN_ONLY',checkpoint:{wave:11}},'obsolete pause must clear without changing saved state');
    assert.equal(find('removed-game').status,'PAUSED','only noncatalog state may be paused');
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'game-catalog.json'),'utf8')),catalog);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('repeated all-games reset is idempotent and preserves newer design checkpoints and review cutoff',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'owner-reset-idempotent-'));
  try{
    const catalog={games:[
      {id:'design-game',productionClass:'DESIGN_ONLY'},
      {id:'developed-game',productionClass:'DEVELOPMENT_CONFIRMED'}
    ]};
    const source={version:2,seeds:[
      {gameId:'design-game',seedId:'existing-design',status:'ACTIVE',productionClass:'DESIGN_ONLY',checkpoint:{tasks:{draft:'saved'}}},
      {gameId:'developed-game',seedId:'developed',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',checkpoint:{stage:'F4'}}
    ]};
    const catalogPath=path.join(root,'game-catalog.json');
    const statePath=path.join(root,'game-seed-state.json');
    fs.writeFileSync(catalogPath,JSON.stringify(catalog));
    fs.writeFileSync(statePath,JSON.stringify(source));
    runOwnerAllGamesDesignReset({root,timestamp:'2026-10-10T01:00:00.000Z'});
    const first=JSON.parse(fs.readFileSync(statePath,'utf8'));
    assert.equal(first.ownerAllGamesDesignReset.updatedAt,'2026-10-10T01:00:00.000Z');
    first.seeds[0].ownerResetRevision='NEW_OWNER_DESIGN_EVENT';
    first.seeds[0].strictDesignReview={verdict:'PASS',totalScore:92,hardFailures:[]};
    first.seeds[0].checkpoint={tasks:{draft:'newly-authored'}};
    fs.writeFileSync(statePath,JSON.stringify(first,null,2)+'\n');
    const before=fs.readFileSync(statePath,'utf8');
    runOwnerAllGamesDesignReset({root,timestamp:'2026-10-10T02:00:00.000Z'});
    assert.equal(fs.readFileSync(statePath,'utf8'),before,'same revision cannot reset authored evidence or advance review cutoff');
    catalog.games.push({id:'new-game',productionClass:'DESIGN_ONLY'});
    fs.writeFileSync(catalogPath,JSON.stringify(catalog));
    runOwnerAllGamesDesignReset({root,timestamp:'2026-10-10T03:00:00.000Z'});
    const after=JSON.parse(fs.readFileSync(statePath,'utf8'));
    assert.deepEqual(after.seeds.find(seed=>seed.gameId==='design-game'),first.seeds[0]);
    assert.ok(after.seeds.some(seed=>seed.gameId==='new-game'&&seed.status==='ACTIVE'));
    assert.equal(after.ownerAllGamesDesignReset.updatedAt,'2026-10-10T01:00:00.000Z');
    assert.deepEqual(after.seeds.find(seed=>seed.gameId==='developed-game'),source.seeds[1]);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('no-op reset does not dispatch another competing design runtime',()=>{
  const workflow=fs.readFileSync('.github/workflows/owner-all-games-design-reset.yml','utf8');
  assert.match(workflow,/id: persist_reset/);
  assert.match(workflow,/owner_reset_changed=false/);
  assert.match(workflow,/owner_reset_changed=true/);
  assert.match(workflow,/if: steps\.persist_reset\.outputs\.owner_reset_changed == 'true'/);
});

test('design queue preserves pending runs and stale engine snapshots cannot modify runtime',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
  const concurrent=workflow.slice(workflow.indexOf('concurrency:'),workflow.indexOf('\nenv:',workflow.indexOf('concurrency:')));
  assert.match(concurrent,/group: company-seed-design-runtime-\$\{\{ github\.sha \}\}/);
  assert.match(concurrent,/queue: max/);
  assert.match(concurrent,/cancel-in-progress: false/);
  const resolver=workflow.slice(workflow.indexOf('  resolve-seed-targets:'),workflow.indexOf('  design-cycle:'));
  assert.match(resolver,/id: main_snapshot/);
  assert.match(resolver,/git diff --quiet "\$GITHUB_SHA" "origin\/main"/);
  assert.match(resolver,/DESIGN_ENGINE_SNAPSHOT=SUPERSEDED_SKIP_NO_MUTATION/);
  assert.match(resolver,/DESIGN_ENGINE_SNAPSHOT_CHECK_FAILED/);
  const protectedSteps=[
    'Load latest company runtime state',
    'Synchronize active owner design reset seeds',
    'Auto-enroll and persist active GAME_SEED intake',
    'Validate shared worker policy log and architecture context',
    'Resolve central-policy active incomplete GAME_SEED targets'
  ];
  for(const name of protectedSteps){
    assert.ok(resolver.includes("      - name: "+name+"\n        if: steps.main_snapshot.outputs.current == 'true'"),
      'stale workflow must skip '+name);
  }
  assert.match(workflow,/if: needs\.resolve-seed-targets\.outputs\.run == 'true'/);
});

test('latest design bootstrap is not blocked by queued stale engine runs',()=>{
  const bootstrap=fs.readFileSync('.github/workflows/company-game-seed-bootstrap.yml','utf8');
  const from=bootstrap.indexOf('      - name: Continue active DESIGN_ONLY work from latest main');
  const to=bootstrap.indexOf('      - name: Summary',from);
  const continuation=bootstrap.slice(from,to);
  assert.ok(from>=0&&to>from);
  assert.match(continuation,/export LATEST_MAIN_SHA=/);
  assert.match(continuation,/sha=process\.env\.LATEST_MAIN_SHA/g);
  assert.doesNotMatch(continuation,/if \[ "\$total_active" -gt 0 \]/);
  assert.match(continuation,/if \[ "\$current_active" -gt 0 \]; then/);
  assert.match(continuation,/GAME_SEED_DESIGN_STALE_RUNS_NON_BLOCKING=YES/);
  assert.match(continuation,/gh workflow run company-seed-design-runtime\.yml --ref main/);
  const statusSet=new Set(['queued','in_progress','pending','waiting','requested']);
  const old=[{head_sha:'older',status:'queued'},{head_sha:'older',status:'pending'}];
  const activeFor=(runs,sha)=>runs.filter(run=>run.head_sha===sha&&statusSet.has(run.status)).length;
  assert.equal(activeFor(old,'current'),0,'stale jobs cannot count as current main design work');
  assert.equal(activeFor([...old,{head_sha:'current',status:'pending'}],'current'),1);
  const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
  assert.match(workflow,/r\.head_sha===sha&&\['queued','in_progress','pending','waiting','requested'\]/);
});


test('seed design runtime keeps owner reset review parallel with active development',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
  assert.match(workflow,/const activeResetSeeds=active\.filter/);
  assert.match(workflow,/designEvolutionDueFor\(seed\)/);
  assert.doesNotMatch(workflow,/GAME_PRIMARY_GATE=DEFER_ACTIVE_GAME_WORK/);
  assert.match(workflow,/materializeOwnerDesignResetSeeds/);
  assert.match(workflow,/ensureOwnerDesignResetSeed/);
  assert.match(workflow,/activeResetIds/);
  assert.match(workflow,/ownerResetPriority\(a\)-ownerResetPriority\(b\)/);
  assert.match(workflow,/OWNER_RESET_SCHEDULING=PRIORITY_NOT_EXCLUSIVE/);
  assert.match(workflow,/OWNER_ACTIVE_DESIGN_RESET_TARGETS=/);
  assert.match(workflow,/OWNER_ACTIVE_DESIGN_RESET_PENDING=/);
});


test('design runtime persists only the target seed and cannot overwrite newer shared seed state',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
  assert.match(workflow,/SEED_RUNTIME_TARGET_MERGE=YES/);
  assert.match(workflow,/TARGET_SEED_MERGE_SOURCE_MISSING/);
  assert.match(workflow,/runtime\.seeds\[index\]=seed/);
  assert.doesNotMatch(workflow,/checkout "\$generated_commit" -- game-seed-state\.json/);
});


test('promoted owner-reset seeds remain eligible for parallel strict design review',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
  const predicateMatches=workflow.match(/strictDesignReviewContinuesInParallel===true/g)||[];
  assert.ok(predicateMatches.length>=4,'all scheduler, matrix, score-sync and continuation paths must honor parallel strict design review');
  assert.match(workflow,/status==='ACTIVE'\|\|seed\?\.promotion\?\.strictDesignReviewContinuesInParallel===true/);
  assert.match(workflow,/status==='ACTIVE'\|\|x\?\.promotion\?\.strictDesignReviewContinuesInParallel===true/);
  assert.doesNotMatch(workflow,/find\(x=>String\(x\.gameId\)===gameId&&String\(x\.status\)\.toUpperCase\(\)==='ACTIVE'\)/);
});


test('design runtime keeps PASS as checkpoint and schedules recurring design health review',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
  assert.match(workflow,/cron: '0 16 \* \* \*'/);
  assert.match(workflow,/designEvolutionDueFor/);
  assert.match(workflow,/deepReviewIntervalHours\|\|168/);
  assert.match(workflow,/NEW_VERIFIED_OR_OWNER_SIGNAL/);
  assert.match(workflow,/NEW_OWNER_EVENT/);
  assert.match(workflow,/ownerDesignEventId/);
  assert.match(workflow,/PERIODIC_DEEP_HEALTH_REVIEW/);
  assert.match(workflow,/PASS_CHECKPOINT_STILL_FRESH_NO_NEW_SIGNAL/);
  assert.match(workflow,/DESIGN_PASS_IS_CHECKPOINT_NOT_TERMINAL=YES/);
  assert.match(workflow,/design_evolution_due/);
  assert.match(workflow,/TARGET_DESIGN_EVOLUTION_DUE/);
  assert.match(workflow,/DESIGN_EVOLUTION_NO_DUE_SIGNAL_MUTATION=NO/);
  assert.doesNotMatch(workflow,/const pending=eligible\.filter\(seed=>!strictPassFor\(seed\)\)/);
});

test('design runtime binds design intelligence into engine digest and static QA',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
  assert.match(workflow,/tools\/vibe2-design-intelligence\.mjs/);
  const begin=workflow.indexOf('const engineFiles=['),end=workflow.indexOf('const engineDigest=',begin);
  assert.ok(begin>=0&&end>begin,'design intelligence must be included in the current designer engine digest');
  assert.match(workflow.slice(begin,end),/tools\/vibe2-design-intelligence\.mjs/);
  assert.match(workflow,/'qa\/vibe2-design-intelligence\.test\.mjs'/);
});


test('owner brief loads the original without authoring A/B/c/@ and survives runtime refresh',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'owner-brief-'));
  try{
    const relative='design/x/2026-10-07/design-revised.json';
    fs.mkdirSync(path.dirname(path.join(dir,relative)),{recursive:true});
    const original={gameId:'x',gameName:'Original X',version:7,gameCategory:'CASUAL',content:{identity:'Original four versus four infection',coreFun:'Convert humans through explicit infection attacks',coreLoop:['Start four versus four','Infect or purify','Resolve teams'],multiplayerMode:'COMPETITIVE',platformProfiles:{ROBLOX:{inputModel:'touch'}}}};
    fs.writeFileSync(path.join(dir,relative),JSON.stringify(original));
    const file=path.join(dir,'queue.json');
    fs.writeFileSync(file,JSON.stringify({requests:[{gameId:'x',gameName:'X',status:'ACTIVE',revision:'R2',designRequest:{instruction:'Designer authors the new design from the original.',originalPlatform:'ROBLOX',baselineSource:relative}}]}));
    const stale={seeds:[{gameId:'x',ownerResetRevision:'R1',CORE_LOOP:['stale freeze and thaw']}]};
    const first=materializeOwnerDesignResetSeeds(stale,{file});
    assert.deepEqual(first.changed,['x']);
    const seed=stale.seeds[0];
    assert.deepEqual(seed.CORE_LOOP,original.content.coreLoop);
    assert.deepEqual(seed.originalDesignContext.content,original.content);
    assert.equal(seed.GAMEPLAY_SKETCH.novelGameGrammar,undefined);
    assert.equal(seed.designInputMode,'OWNER_BRIEF_AND_ORIGINAL_ONLY');
    assert.equal(seed.productionClass,'DESIGN_ONLY');
    assert.equal(ensureOwnerDesignResetSeed(stale,'x',{file}).changed,false);
    const refreshed={seeds:[{gameId:'x',ownerResetRevision:'R1',CORE_LOOP:['stale freeze and thaw']}]};
    materializeOwnerDesignResetSeeds(refreshed,{file});
    assert.deepEqual(refreshed.seeds[0].CORE_LOOP,original.content.coreLoop);
    const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
    const refresh=workflow.indexOf('cp /tmp/company-runtime-seed-state-before.json game-seed-state.json');
    const reapply=workflow.indexOf('OWNER_REQUESTS_REAPPLIED_AFTER_RUNTIME_REFRESH',refresh);
    const auto=workflow.indexOf('node tools/company-all-games-design-reset.mjs --auto-missing-design-intake',refresh);
    assert.ok(refresh>=0&&reapply>refresh&&auto>reapply);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('missing design is admitted as a brief without invented mechanics or grammar',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'owner-brief-empty-'));
  try{
    const file=path.join(dir,'queue.json');
    fs.writeFileSync(file,JSON.stringify({requests:[{gameId:'x',gameName:'X',status:'ACTIVE',revision:'R1',designRequest:{instruction:'Design this game from my request.'}}]}));
    const state={seeds:[]};
    const result=ensureOwnerDesignResetSeed(state,'x',{file});
    assert.equal(result.changed,true);
    assert.equal(result.seed.DESIGN_BASELINE_SOURCE,null);
    assert.equal(result.seed.OWNER_LATEST_DESIGN_REQUEST,'Design this game from my request.');
    assert.equal(result.seed.GAMEPLAY_SKETCH.novelGameGrammar,undefined);
    // 실제 접수 경로는 브리프를 보존하고 디자이너 재작성 요청만 표시한다.
    for(const mode of ['OWNER_BRIEF_AND_ORIGINAL_ONLY','DESIGNER_SELF_SEED']){
      const seed={...result.seed,designInputMode:mode};
      fs.writeFileSync(path.join(dir,'game-catalog.json'),JSON.stringify({games:[{id:'x',name:'X',lifecycleState:'ACTIVE',selectedPlatform:'ROBLOX'}]}));
      fs.writeFileSync(path.join(dir,'game-seed-state.json'),JSON.stringify({version:2,seeds:[seed]}));
      const enrolled=autoEnrollMissingDesignSeeds({root:dir,timestamp:'2026-10-12T00:00:00Z'});
      assert.deepEqual(enrolled.grammarUpgraded,['x']);
      const persisted=JSON.parse(fs.readFileSync(path.join(dir,'game-seed-state.json'),'utf8')).seeds[0];
      assert.equal(persisted.OWNER_LATEST_DESIGN_REQUEST,seed.OWNER_LATEST_DESIGN_REQUEST);
      assert.deepEqual(persisted.CORE_LOOP,seed.CORE_LOOP);
      assert.deepEqual(persisted.GAMEPLAY_SKETCH,seed.GAMEPLAY_SKETCH);
      assert.equal(persisted.novelGrammarBackfill.authoringPending,true);
      assert.equal(persisted.designEvolutionSignals[0].status,'OPEN');
      assert.equal(persisted.DESIGN_BASELINE_SOURCE,null);
      const beforeRepeat=fs.readFileSync(path.join(dir,'game-seed-state.json'),'utf8');
      const repeated=autoEnrollMissingDesignSeeds({root:dir,timestamp:'2026-10-13T00:00:00Z'});
      assert.deepEqual(repeated.grammarUpgraded,[],'pending brief must not restart every intake');
      assert.equal(fs.readFileSync(path.join(dir,'game-seed-state.json'),'utf8'),beforeRepeat);
    }
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('owner brief cannot read a different game or escape the original design directory',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'owner-brief-scope-'));
  try{
    const file=path.join(dir,'queue.json');
    for(const baselineSource of ['../secret.json','design/y/2026-10-07/design-revised.json']){
      fs.writeFileSync(file,JSON.stringify({requests:[{gameId:'x',status:'ACTIVE',designRequest:{instruction:'Design X',baselineSource}}]}));
      assert.throws(()=>ensureOwnerDesignResetSeed({seeds:[]},'x',{file}),/OWNER_DESIGN_BASELINE_PATH_INVALID/);
    }
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('already developed games can re-enter the same designer from an owner brief',()=>{
  const cycle=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
  const begin=cycle.indexOf('function resolveDesignerSeedInput(');
  const end=cycle.indexOf('const gameId=clean(process.env.',begin);
  assert.ok(begin>=0&&end>begin,'owner request must use the same designer intake');
  const body=cycle.slice(begin,end);
  assert.doesNotMatch(body,/DESIGN_ONLY_CLASS_REQUIRED/);
  const owner={
    gameId:'developed-game',seedId:'OWNER-DEVELOPED',status:'ACTIVE',
    productionClass:'DESIGN_ONLY',designInputMode:'OWNER_BRIEF_AND_ORIGINAL_ONLY',
    OWNER_LATEST_DESIGN_REQUEST:'Preserve the game and write its design'
  };
  const resolver=new Function('clean','activeSeedForGame','ownerDesignResetSeedForGame','makeAutoMissingDesignSeed',
    'latestUsableDesign','validateGameSeed','path',body+'\nreturn resolveDesignerSeedInput;')(
      v=>String(v??'').trim(),()=>null,()=>owner,()=>{throw Error('owner request must remain the source');},
      ()=>null,()=>({pass:true,errors:[]}),path
    );
  const state={seeds:[]};
  const catalog={games:[{id:'developed-game',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'}]};
  const result=resolver({state,gameId:'developed-game',catalog});
  assert.equal(result.created,true);
  assert.equal(result.seed,owner);
  assert.equal(state.seeds[0],owner);
  assert.equal(owner.seedAuthoring.writer,'GAME_DESIGNER_AI');
  assert.equal(owner.designInputMode,'OWNER_BRIEF_AND_ORIGINAL_ONLY');
  assert.match(cycle,/OWNER_ORIGINAL_DESIGN_INPUT=/);
});

test('design workflow invokes the actual designer for developed games instead of class routing',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
  const launch=workflow.match(/          node tools\/artbook-fact-pack\.mjs\n          node tools\/company-design-cycle\.mjs &\n          pipeline_pid=\$!/);
  assert.ok(launch,'same design workflow must directly call the existing designer');
  assert.doesNotMatch(workflow,/node tools\/artbook-production-pipeline\.mjs &/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'design-direct-launch-'));
  try{
    fs.mkdirSync(path.join(dir,'tools'));
    fs.writeFileSync(path.join(dir,'game-catalog.json'),JSON.stringify({games:[{id:'x',productionClass:'DEVELOPMENT_CONFIRMED'}]}));
    fs.writeFileSync(path.join(dir,'tools/artbook-fact-pack.mjs'),"import fs from 'node:fs'; fs.writeFileSync('fact-ready','yes');");
    fs.writeFileSync(path.join(dir,'tools/company-design-cycle.mjs'),"import fs from 'node:fs'; if(!fs.existsSync('fact-ready'))throw Error('facts missing');fs.writeFileSync('designer-called',process.env.ARTBOOK_GAME_ID);");
    const result=spawnSync('bash',['-euo','pipefail','-c',launch[0]+'\nwait "$pipeline_pid"'],{cwd:dir,env:{...process.env,ARTBOOK_GAME_ID:'x'},encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    assert.equal(fs.readFileSync(path.join(dir,'designer-called'),'utf8'),'x');
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('a zero-exit designer without current authored output cannot be marked complete',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
  const begin=workflow.indexOf('          if [ "$rc" -eq 0 ]; then');
  const end=workflow.indexOf("            echo 'complete=true'",begin);
  const block=workflow.slice(begin,end);
  assert.ok(begin>=0&&end>begin);
  const source=block.match(/<<'NODE'\n([\s\S]*?)\n          NODE/)[1].replace(/^          /gm,'');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'design-output-guard-'));
  try{
    const run=()=>spawnSync(process.execPath,['--input-type=module','-e',source],{cwd:dir,env:{...process.env,ARTBOOK_GAME_ID:'x',ARTBOOK_DATE:'2026-10-08'},encoding:'utf8'});
    assert.match(run().stderr,/DESIGN_MODEL_OUTPUT_MISSING/);
    const base=path.join(dir,'design/x/2026-10-08');fs.mkdirSync(base,{recursive:true});
    const write=(name,value)=>fs.writeFileSync(path.join(base,name),JSON.stringify(value));
    fs.writeFileSync(path.join(dir,'game-seed-state.json'),JSON.stringify({seeds:[{gameId:'x',status:'ACTIVE',ownerResetRevision:'CURRENT'}]}));
    write('cycle-status.json',{gameId:'x',date:'2026-10-08',status:'COMPLETE'});
    const design={gameId:'x',date:'2026-10-08',authorRole:'GAME_DESIGNER_AI',authorModel:'test-designer',ownerDesignEventId:'OLD',content:{identity:'test fixture'}};
    write('design-revised.json',design);
    assert.match(run().stderr,/DESIGN_MODEL_OWNER_EVENT_MISMATCH/);
    design.ownerDesignEventId='CURRENT';design.authorRole='REQUEST_ORCHESTRATOR';
    write('design-revised.json',design);
    assert.match(run().stderr,/DESIGN_MODEL_AUTHOR_OUTPUT_REQUIRED/);
    design.authorRole='GAME_DESIGNER_AI';write('design-revised.json',design);
    const good=run();assert.equal(good.status,0,good.stderr);
    assert.match(good.stdout,/DESIGN_MODEL_OUTPUT_FILES=VERIFIED/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});


test('explicit free-topic owner reset discards prior design input while keeping Roblox cooperation',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'owner-free-topic-'));
  try{
    const queueFile=path.join(dir,'queue.json');
    const request={revision:'FREE-1',gameId:'cozy-island',gameName:'포근섬',status:'ACTIVE',designRequest:{
      originalPlatform:'ROBLOX',baselineSource:'',topicMode:'VIBE_FREE_TOPIC',multiplayerMode:'COOP',
      instruction:'디자이너가 기존 주제를 가져오지 않고 창작 문법으로 새 주제를 작성한다.'
    }};
    fs.writeFileSync(queueFile,JSON.stringify({requests:[request]}));
    const state={seeds:[]};
    const first=ensureOwnerDesignResetSeed(state,'cozy-island',{file:queueFile});
    assert.equal(first.changed,true);
    assert.equal(first.seed.designTopicMode,'VIBE_FREE_TOPIC');
    assert.equal(first.seed.DESIGN_BASELINE_SOURCE,null);
    assert.deepEqual(first.seed.originalDesignContext.content,{});
    assert.equal(first.seed.MULTIPLAYER_DESIGN_MODE,'COOP');
    const second=ensureOwnerDesignResetSeed(state,'cozy-island',{file:queueFile});
    assert.equal(second.changed,false);
    request.revision='FREE-2';fs.writeFileSync(queueFile,JSON.stringify({requests:[request]}));
    assert.equal(ensureOwnerDesignResetSeed(state,'cozy-island',{file:queueFile}).changed,true);
    request.designRequest.baselineSource='design/cozy-island/2026-09-22/design-revised.json';
    fs.writeFileSync(queueFile,JSON.stringify({requests:[request]}));
    assert.throws(()=>ensureOwnerDesignResetSeed(state,'cozy-island',{file:queueFile}),/OWNER_FREE_TOPIC_BASELINE_FORBIDDEN/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('fresh owner reset reads only the first actual seed system for A, without copying other original design fields',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'owner-a-auto-seed-'));
  try{
    const file=path.join(dir,'queue.json');
    const origin='design/cozy-island/2026-09-22/design-revised.json';
    const originalPath=path.join(dir,origin);
    fs.mkdirSync(path.dirname(originalPath),{recursive:true});
    const old={gameId:'cozy-island',content:{identity:'기존 왕국 정복 주제',
      coreLoop:['기존 나무 수집','주민 훈련','옛 왕국 성장'],
      creativeGrammar:{a:{material:'왕조 계승'},b:{material:'철학'}},
      signatureSystems:[
        {name:'원본 첫 핵심 게임플레이',purpose:'원본 월드에서 플레이어가 대상과 상호작용해 기본 자원을 획득한다.'},
        {name:'과거 두 번째 시스템',purpose:'기존 게임의 상세 문법과 B 시스템을 복제해선 안 된다.'}
      ]}};
    fs.writeFileSync(originalPath,JSON.stringify(old));
    const request={revision:'AUTO-A-1',gameId:'cozy-island',gameName:'포근섬',status:'ACTIVE',
      designRequest:{topicMode:'VIBE_FREE_TOPIC',baselineSource:'',originalPlatform:'ROBLOX',
        multiplayerMode:'COOP',instruction:'원본 시드에서 A 게임 시스템만 자동 추출하고 B C @와 MAIN은 새로 창작한다.',
        aSystemReference:{scope:'A_SYSTEM_ONLY',source:origin}}};
    fs.writeFileSync(file,JSON.stringify({requests:[request]}));
    const state={seeds:[]};
    const first=ensureOwnerDesignResetSeed(state,'cozy-island',{file});
    assert.equal(first.changed,true);
    assert.deepEqual(first.seed.A_SYSTEM_REFERENCE,{scope:'A_SYSTEM_ONLY',source:origin,
      systemFamily:old.content.signatureSystems[0].name,playerChoice:old.content.signatureSystems[0].purpose});
    assert.deepEqual(first.seed.originalDesignContext.content,{});
    assert.equal(first.seed.DESIGN_BASELINE_SOURCE,null);
    assert.equal(first.seed.designTopicMode,'VIBE_FREE_TOPIC');
    assert.equal(first.seed.MULTIPLAYER_DESIGN_MODE,'COOP');
    assert.ok(!JSON.stringify(first.seed.A_SYSTEM_REFERENCE).includes('왕조 계승'));
    assert.ok(!JSON.stringify(first.seed.A_SYSTEM_REFERENCE).includes('과거 두 번째 시스템'));
    assert.equal(ensureOwnerDesignResetSeed(state,'cozy-island',{file}).changed,false);
    for(const invalid of [
      {scope:'A_SYSTEM_ONLY',source:'design/other-game/2026-09-22/design-revised.json'},
      {scope:'A_SYSTEM_ONLY',source:origin,systemFamily:'대화가 지정한 가짜 시스템'},
      {scope:'A_AND_B',source:origin}
    ]){
      request.revision+='-NEXT';request.designRequest.aSystemReference=invalid;
      fs.writeFileSync(file,JSON.stringify({requests:[request]}));
      assert.throws(()=>ensureOwnerDesignResetSeed(state,'cozy-island',{file}),
        /OWNER_FREE_TOPIC_A_SYSTEM_ONLY_INVALID/);
    }
    request.revision+='-NEXT';request.designRequest.aSystemReference={scope:'A_SYSTEM_ONLY',source:origin};
    fs.unlinkSync(originalPath);fs.writeFileSync(file,JSON.stringify({requests:[request]}));
    assert.throws(()=>ensureOwnerDesignResetSeed(state,'cozy-island',{file}),
      /OWNER_FREE_TOPIC_A_SYSTEM_SOURCE_READ_FAILED/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('design runtime lazily restores only validated active owner baselines before reset materialization',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
  const segment=workflow.slice(workflow.indexOf('      - name: Load latest company runtime state'),workflow.indexOf('      - name: Synchronize active owner design reset seeds'));
  assert.match(segment,/OWNER_DESIGN_BASELINE_LOAD_MODE=TARGET_FILES_ONLY/);
  assert.doesNotMatch(segment,/git checkout "origin\/\$COMPANY_RUNTIME_BRANCH" -- "\$runtime_path"/);
  const match=segment.match(/node --input-type=module <<'NODE'\n([\s\S]*?)\n          NODE/);
  assert.ok(match,'existing load step must validate and restore explicitly referenced originals');
  const source=match[1].replace(/^          /gm,'').replace(/^import .*;\n/gm,'');
  const one='design/daechung-rpg/2026-09-22/design-revised.json';
  const two='design/horror-escape-room/2026-09-22/design-revised.json';
  const requests=[
    {gameId:'cozy-island',designRequest:{topicMode:'VIBE_FREE_TOPIC',baselineSource:''}},
    {gameId:'daechung-rpg',designRequest:{baselineSource:one}},
    {gameId:'horror-escape-room',designRequest:{baselineSource:two}}
  ];
  const reads=[],writes=[],messages=[];
  const execute=rows=>runInNewContext(source,{
    activeOwnerDesignResetRequests:()=>rows,
    execFileSync:(program,args)=>{assert.equal(program,'git');assert.equal(args[0],'show');reads.push(args[1]);return JSON.stringify({gameId:args[1]});},
    fs:{mkdirSync:()=>{},writeFileSync:(file,content)=>writes.push({file,content})},
    path,
    process:{env:{COMPANY_RUNTIME_BRANCH:'company-runtime'}},
    console:{log:message=>messages.push(message)}
  });
  execute(requests);
  assert.deepEqual(reads,['origin/company-runtime:'+one,'origin/company-runtime:'+two]);
  assert.deepEqual(writes.map(row=>row.file),[one,two]);
  assert.ok(messages.includes('OWNER_DESIGN_BASELINE_SELECTED_COUNT=2'));
  assert.ok(messages.includes('OWNER_DESIGN_BASELINE_LOAD_MODE=TARGET_FILES_ONLY'));
  reads.length=0;
  writes.length=0;
  const aSeed='design/cozy-island/2026-09-22/design-revised.json';
  execute([{gameId:'cozy-island',designRequest:{topicMode:'VIBE_FREE_TOPIC',baselineSource:'',
    aSystemReference:{scope:'A_SYSTEM_ONLY',source:aSeed}}}]);
  assert.deepEqual(reads,['origin/company-runtime:'+aSeed],
    'the free redesign may download the exact original design only for A seed system extraction');
  assert.deepEqual(writes.map(row=>row.file),[aSeed]);
  reads.length=0;
  writes.length=0;
  assert.throws(()=>execute([{gameId:'cozy-island',designRequest:{topicMode:'VIBE_FREE_TOPIC',
    aSystemReference:{scope:'A_SYSTEM_ONLY',source:'design/another-game/2026-09-22/design-revised.json'}}}]),
    /OWNER_DESIGN_A_SYSTEM_ONLY_PATH_INVALID/);
  assert.equal(reads.length,0);
  reads.length=0;
  writes.length=0;
  assert.throws(()=>execute([{gameId:'daechung-rpg',designRequest:{baselineSource:'design/daechung-rpg/../unsafe.json'}}]),/OWNER_DESIGN_BASELINE_PATH_INVALID/);
  assert.equal(reads.length,0);
  assert.equal(writes.length,0);
  assert.throws(()=>runInNewContext(source,{
    activeOwnerDesignResetRequests:()=>[requests[1]],
    execFileSync:()=>{throw new Error('missing')},
    fs:{mkdirSync:()=>{throw new Error('should not create')},writeFileSync:()=>{throw new Error('should not write')}},
    path,process:{env:{COMPANY_RUNTIME_BRANCH:'company-runtime'}},
    console:{log:()=>{}}
  }),/OWNER_DESIGN_BASELINE_READ_FAILED/);
});
