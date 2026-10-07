import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ensureOwnerDesignResetSeed,materializeOwnerDesignResetSeeds} from '../tools/owner-design-reset.mjs';

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


test('seed design runtime keeps owner reset review parallel with active development',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
  assert.match(workflow,/GAME_PRIMARY_GATE=RUN_PARALLEL_STRICT_DESIGN/);
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
  assert.match(workflow,/node --check tools\/vibe2-design-intelligence\.mjs/);
  assert.match(workflow,/node --test qa\/vibe2-design-intelligence\.test\.mjs/);
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
    const intake=fs.readFileSync('tools/company-all-games-design-reset.mjs','utf8');
    const body=intake.match(/function upgradeCanonicalNovelGrammarSeed\(seed,game,timestamp\)\{([\s\S]*?)\n\}/)[1];
    const upgrade=new Function('seed','game','timestamp',body);
    assert.equal(upgrade(result.seed,{},'now'),false,'brief must not reach automatic grammar generation');
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
  const line=cycle.split('\n').find(row=>row.includes('DESIGN_ONLY_CLASS_REQUIRED'));
  assert.ok(line);
  const predicate=line.slice(line.indexOf('if(')+3,line.indexOf(')throw new Error'));
  const blocked=new Function('catalogGame','seed','clean','return '+predicate);
  const clean=v=>String(v??'').trim();
  assert.equal(blocked({productionClass:'DEVELOPMENT_CONFIRMED'},{designInputMode:'OWNER_BRIEF_AND_ORIGINAL_ONLY'},clean),false);
  assert.equal(blocked({productionClass:'DEVELOPMENT_CONFIRMED'},{},clean),true);
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
