import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validateBootstrapHtml,buildContractSafePlayable,buildFirstPlayable,inferDevelopmentGenre,classifyApprovedScope} from '../tools/company-development-web-bootstrap.mjs';
import {deriveApprovedScopeInventory,runtimeApprovedScopeCoverage,staticApprovedScopeCoverage} from '../tools/company-approved-scope-contract.mjs';

const basePlayable='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body data-audio-state="locked"><button id="act">Act</button><button data-audio-control="mute">Mute</button><input data-audio-control="volume" type="range"><script>let score=0;const AC=window.AudioContext||window.webkitAudioContext;document.querySelector("#act").addEventListener("click",()=>{score++});</script></body></html>';

test('base bootstrap contract still rejects network and persistent storage',()=>{
  assert.equal(validateBootstrapHtml(basePlayable).pass,true);
  const bad=basePlayable.replace('</script>',';localStorage.setItem("x","1");fetch("https://example.com");</script>');
  const result=validateBootstrapHtml(bad);
  assert.equal(result.pass,false);
  assert.ok(result.blockers.includes('PERSISTENT_STORAGE_FORBIDDEN_ON_BOOTSTRAP'));
  assert.ok(result.blockers.includes('NETWORK_API_FORBIDDEN'));
});

test('approved scope inventory captures core gameplay',()=>{
  const baseline={content:{coreFun:'collect resources and upgrade production',coreLoop:['mine ore','smelt and sell','automate and unlock zones'],mobileUx:'touch controls'}};
  const inventory=deriveApprovedScopeInventory(baseline);
  assert.equal(inventory.filter(x=>x.path.startsWith('coreLoop[')).length,3);
  assert.ok(inventory.some(x=>x.path==='coreFun'));
  assert.ok(inventory.some(x=>x.path==='mobileUx'));
});

test('scope contract requires concrete mechanic bindings and diversity',()=>{
  const inventory=[{id:'scope-a'},{id:'scope-b'},{id:'scope-c'},{id:'scope-d'}];
  const good='<body data-approved-scope-count="4"><button id="mine" data-scope-id="scope-a" data-mechanic-id="ore-extraction">A</button><button id="smelt" data-scope-id="scope-b" data-mechanic-id="ore-smelting">B</button><button id="sell" data-scope-id="scope-c" data-mechanic-id="market-sale">C</button><button id="upgrade" data-scope-id="scope-d" data-mechanic-id="factory-upgrade">D</button></body>';
  assert.equal(staticApprovedScopeCoverage(good,inventory).pass,true);
  const proxy=good.replace(' data-mechanic-id="ore-extraction"','');
  const verdict=staticApprovedScopeCoverage(proxy,inventory);
  assert.equal(verdict.pass,false);
  assert.ok(verdict.blockers.includes('APPROVED_SCOPE_MECHANIC_BINDING_MISSING:scope-a'));
});

test('tower placement scope requires a real position input and placement result',()=>{
  const inventory=[{id:'place',path:'coreLoop[0]',label:'place towers on positions covering the threatened route'}];
  const shallow='<main data-approved-scope-count="1"><button data-scope-id="place" data-mechanic-id="tower-placement">타워 설치</button></main>';
  const staticVerdict=staticApprovedScopeCoverage(shallow,inventory);
  assert.equal(staticVerdict.pass,false);
  assert.ok(staticVerdict.blockers.includes('APPROVED_SCOPE_TOWER_POSITION_INPUT_REQUIRED:place'));
  const positioned=shallow.replace('<button ','<button data-build-slot="lane-1-cell-2" ');
  assert.equal(staticApprovedScopeCoverage(positioned,inventory).pass,true);
  const base={declaredCount:1,visibleScopeIds:['place'],interactedScopeIds:['place'],mechanicBindings:['tower-placement'],inventory};
  assert.equal(runtimeApprovedScopeCoverage({...base,interactionResults:[{scopeId:'place',clicked:true,stateChanged:true,positionSelected:false,placementResult:false,towerEntityDelta:0}]}).pass,false);
  assert.equal(runtimeApprovedScopeCoverage({...base,interactionResults:[{scopeId:'place',clicked:true,stateChanged:true,positionSelected:true,placementResult:true,towerEntityDelta:1}]}).pass,true);
});

test('runtime scope coverage needs gameplay results and distinct mechanics',()=>{
  const interactionResults=['a','b','c','d'].map(scopeId=>({scopeId,clicked:true,stateChanged:true}));
  const args={declaredCount:4,visibleScopeIds:['a','b','c','d'],interactedScopeIds:['a','b','c','d'],mechanicBindings:['mine','smelt','sell','upgrade'],interactionResults};
  assert.equal(runtimeApprovedScopeCoverage(args).pass,true);
  assert.equal(runtimeApprovedScopeCoverage({...args,interactedScopeIds:['a']}).pass,false);
  assert.equal(runtimeApprovedScopeCoverage({...args,mechanicBindings:['generic']}).pass,false);
  assert.equal(runtimeApprovedScopeCoverage({...args,interactionResults:[...interactionResults.slice(0,3),{scopeId:'d',clicked:true,stateChanged:false}]}).pass,false);
});

test('genre inference preserves supported seed categories',()=>{
  const cases={BATTLEGROUND_FIGHTING_SHOOTER:'SEED-ROBLOX-BATTLEGROUND_FIGHTING_SHOOTER-001',SIMULATOR_TYCOON_INCREMENTAL:'SEED-ROBLOX-SIMULATOR_TYCOON_INCREMENTAL-001',SURVIVAL_HORROR_ESCAPE:'SEED-ROBLOX-SURVIVAL_HORROR_ESCAPE-001',OBBY_PARTY_MINIGAME:'SEED-ROBLOX-OBBY_PARTY_MINIGAME-001',STORY_RPG_ADVENTURE_RPG:'SEED-ROBLOX-STORY_RPG_ADVENTURE_RPG-001',ROLEPLAY_LIFE_AVATAR:'SEED-ROBLOX-ROLEPLAY_LIFE_AVATAR-001'};
  for(const [genre,gameSeedId] of Object.entries(cases))assert.equal(inferDevelopmentGenre({baseline:{gameSeedId}}),genre);
});

test('scope classifier remains available for design inspection',()=>{
  assert.equal(classifyApprovedScope({path:'combat',label:'attack enemy'},0),'COMBAT');
  assert.equal(classifyApprovedScope({path:'economy',label:'collect resource'},0),'ECONOMY');
  assert.equal(classifyApprovedScope({path:'progression',label:'upgrade level'},0),'PROGRESSION');
});

test('Pocket Foundry deterministic template fails closed when semantic spatial scope is missing',()=>{
  const baseline={gameSeedId:'SEED-ROBLOX-SIMULATOR_TYCOON_INCREMENTAL-001',content:{identity:'Pocket Foundry',coreFun:'collect, upgrade, income, unlock',coreLoop:['collect ore and turn it into production resources','spend earnings on upgrades and automation','unlock a new area and repeat with larger goals'],mobileUx:'touch controls'}};
  assert.throws(()=>buildContractSafePlayable({gameId:'seed-roblox-simulator-tycoon-i-adopt-me',gameName:'Pocket Foundry',baseline}),/APPROVED_SCOPE_REAL_SPATIAL_STATE_REQUIRED/);
});

test('Vector Clash deterministic template fails closed when semantic interaction or spatial scope is missing',()=>{
  const baseline={gameSeedId:'SEED-ROBLOX-BATTLEGROUND_FIGHTING_SHOOTER-001',content:{identity:'Vector Clash',coreFun:'combat, opponent, skill, cooldown',coreLoop:['read opponent movement and create an attack opening','damage opponents and reposition around cooldowns','finish rounds and re-enter with a changed tactical choice'],mobileUx:'touch controls'}};
  assert.throws(()=>buildContractSafePlayable({gameId:'seed-roblox-battleground-fight-welcome-to-bloxburg',gameName:'Vector Clash',baseline}),/APPROVED_SCOPE_REAL_(?:ENTITY_INTERACTION|SPATIAL_STATE)_REQUIRED/);
});

test('Celestial Bastion shallow tower button is rejected and returns to Vibe instead of being preserved',async()=>{
  const baseline={gameSeedId:'SEED-SINGLE_DEFENSE_STRATEGY-001',content:{identity:'Celestial Bastion',coreFun:'defend the celestial core with tower placement and wave adaptation',coreLoop:['place towers against the threatened route','earn resources and upgrade the defense','adapt to enemy waves and clear the final threat'],mobileUx:'touch-first tower defense controls'}};
  const current=fs.readFileSync('web-games/seed-single-defense-strat-celestial-bastion/index.html','utf8');
  assert.match(current,/S\.towers\+\+/);
  assert.match(current,/j===2&&r<S\.towers/);
  assert.doesNotMatch(current,/data-(?:placement-position|build-slot|tower-slot|grid-x|grid-y)/i);
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'web-celestial-repair-')),candidate=path.join(temp,'candidate');
  try{
    await assert.rejects(()=>buildFirstPlayable({gameId:'seed-single-defense-strat-celestial-bastion',gameName:'Celestial Bastion',baseline,sourcePath:'web-games/seed-single-defense-strat-celestial-bastion',candidatePath:candidate,candidateId:'repair-test',sourceCommit:'test',model:'none'}),/VIBE2_LOCAL_MODEL_REQUIRED/);
    assert.equal(fs.existsSync(path.join(candidate,'index.html')),false);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('unfinished deterministic genres fail closed instead of receiving the old generic game shell',()=>{
  const baseline={gameSeedId:'SEED-ROBLOX-SURVIVAL_HORROR_ESCAPE-001',content:{identity:'Last Lantern',coreFun:'survive and escape',coreLoop:['explore','avoid threat','escape'],mobileUx:'touch controls'}};
  assert.throws(()=>buildContractSafePlayable({gameId:'seed-roblox-survival-horror-es-doors',gameName:'Last Lantern',baseline}),/GENRE_REAL_IMPLEMENTATION_NOT_READY:SURVIVAL_HORROR_ESCAPE/);
});

test('canonical Web bootstrap keeps Vibe2 as primary developer and supports preserved-source content rework',()=>{
  const source=fs.readFileSync('tools/company-development-web-bootstrap.mjs','utf8');
  assert.match(source,/VIBE2_PRIMARY_MODEL_IMPLEMENTATION/);
  assert.match(source,/VIBE2_PRESERVED_SOURCE_REPAIR/);
  assert.match(source,/VIBE2_PRIMARY_DEVELOPER=YES/);
  assert.match(source,/await ensureLocalVibeRuntime\(model\)/);
  assert.match(source,/await buildVibePlayable\(/);
  assert.match(source,/VIBE_DEVELOPMENT_CONTEXT/);
  assert.match(source,/repairReason/);
  assert.match(source,/FINAL_CONTENT_DEPTH_REWORK_REQUIRED|반복 행동\/재시작 시간/);
  assert.match(source,/SOURCE_REPAIRED=/);
  assert.match(source,/GENRE_REAL_IMPLEMENTATION_NOT_READY/);
});

test('legacy frozen implementation context requires an exact canonical game and seed binding',()=>{
  const source=fs.readFileSync('tools/company-strict-production-review.mjs','utf8');
  assert.match(source,/clean\(row\?\.gameId\)===gameId&&clean\(row\?\.seedId\)===seedId/);
  assert.match(source,/runtimeQueueRecord\(seedId\)/);
  assert.match(source,/queued\?\.selectedPlatform\|\|queued\?\.targetPlatform/);
  assert.match(source,/canonicalMatch=Boolean\(historical\|\|queued\)/);
  assert.match(source,/cycleSeedId!==seedId/);
  assert.match(source,/FROZEN_DESIGN_BASELINE\+CANONICAL_DEVELOPMENT_QUEUE/);
});

test('canonical DEVELOPMENT_CONFIRMED runtime returns shallow final content to Vibe development before retrying depth',()=>{
  const source=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');
  const validator=fs.readFileSync('tools/company-development-web-gameplay-validation.mjs','utf8');
  const initialAt=source.indexOf('if(!finalStage){');
  const finalStageMarker=source.indexOf('if(item.webInitialCyclePassed!==true',initialAt);
  const finalAt=source.lastIndexOf('}else{',finalStageMarker);
  const catchAt=source.indexOf('}catch(error){',finalAt);
  const resultWriteAt=source.indexOf('fs.writeFileSync(path.join(resultsRoot',catchAt);
  assert.ok(initialAt>0);assert.ok(finalStageMarker>initialAt);assert.ok(finalAt>initialAt);assert.ok(catchAt>finalAt);assert.ok(resultWriteAt>catchAt);
  const initialBlock=source.slice(initialAt,finalAt),finalBlock=source.slice(finalAt,catchAt),failureBlock=source.slice(catchAt,resultWriteAt);

  // A: initial PASS is persisted before final depth and is not homepage eligible yet.
  assert.match(initialBlock,/--validation-stage=initial-cycle/);
  assert.doesNotMatch(initialBlock,/--validation-stage=final-content-depth/);
  assert.match(source,/web-initial-cycle-validation\.json/);
  assert.match(initialBlock,/canonicalState:'WAITING_WEB_FINAL_CONTENT_DEPTH'/);
  assert.match(initialBlock,/webInitialCyclePassed:true/);
  assert.match(initialBlock,/webInitialCycleEvidencePath:initialEvidenceRelative/);
  assert.match(initialBlock,/webInitialCycleSourcePath:stableSource/);
  assert.match(initialBlock,/homepageTestEligible:false/);
  assert.match(initialBlock,/WEB_INITIAL_CANONICAL_PERSIST/);
  assert.match(initialBlock,/WEB_FINAL_CONTENT_DEPTH_EXECUTED=NO/);

  // B: first-time initial failures remain revalidation failures; existing/historical rework failures return to canonical development.
  assert.match(initialBlock,/if\(item\.existingWebValidated===true\)/);
  assert.match(initialBlock,/materialize\(`\$\{stableSource\}\/index\.html`\)/);
  assert.match(initialBlock,/WEB_EXISTING_GAME_FRESH_REVALIDATION/);
  assert.match(failureBlock,/item\.webInitialCyclePassed===true\|\|item\.existingWebValidated===true/);
  assert.match(failureBlock,/canonicalState:rework\?'RETURN_TO_WEB_DEVELOPMENT_FOR_CONTENT_EXPANSION':'WAITING_WEB_GAMEPLAY_REVALIDATION'/);
  assert.match(failureBlock,/webInitialCyclePassed:rework/);
  assert.match(failureBlock,/WEB_CONTENT_REWORK_RETRY_PRESERVED=YES/);
  assert.match(failureBlock,/WEB_FINAL_CONTENT_DEPTH_EXECUTED=NO/);

  // C: final run consumes exact persisted source/evidence and verifies hashes.
  assert.match(source,/canonicalState==='WAITING_WEB_FINAL_CONTENT_DEPTH'\?'final-content-depth':'initial-cycle'/);
  assert.match(finalBlock,/materialize\(item\.webInitialCycleEvidencePath\)/);
  assert.match(finalBlock,/materialize\(`\$\{item\.webInitialCycleSourcePath\}\/index\.html`\)/);
  assert.match(finalBlock,/persistedInitial\.sourceIndexSha256!==item\.webInitialCycleSourceIndexSha256/);
  assert.match(finalBlock,/persistedInitial\.designBaselineSha256!==item\.webInitialCycleDesignBaselineSha256/);
  assert.match(finalBlock,/WEB_FINAL_CONTENT_DEPTH_RESUME/);

  // D: only meaningful final gameplay time can become homepage/strict/promotion eligible.
  assert.match(finalBlock,/--validation-stage=final-content-depth/);
  assert.match(finalBlock,/contentDepthValidation\?\.validationMode!==\'REAL_ELAPSED_GAMEPLAY\'/);
  assert.match(finalBlock,/meaningfulGameplayMilliseconds\)<1800000/);
  assert.match(finalBlock,/homepageTestEligible:true/);
  assert.match(finalBlock,/PENDING_SELECTED_PLATFORM_BIND/);
  assert.match(finalBlock,/WAITING_WEB_STRICT_IMPROVEMENT/);

  // E: final depth failure returns to existing development, and next initial cycle forces Vibe source repair.
  assert.doesNotMatch(finalBlock,/company-development-web-bootstrap\.mjs/);
  assert.match(failureBlock,/canonicalState:'RETURN_TO_WEB_DEVELOPMENT_FOR_CONTENT_EXPANSION'/);
  assert.match(failureBlock,/currentStep:'FULL_APPROVED_SCOPE_WEB_COMPANION_BOOTSTRAP'/);
  assert.match(failureBlock,/webInitialCycleEvidencePath:item\.webInitialCycleEvidencePath/);
  assert.match(failureBlock,/webInitialCycleSourcePath:item\.webInitialCycleSourcePath/);
  assert.match(failureBlock,/WEB_CONTENT_RETURN_TO_DEVELOPMENT=YES/);
  assert.match(source,/--force-repair=true/);
  assert.match(source,/--repair-reason=FINAL_CONTENT_DEPTH_REWORK_REQUIRED/);
  assert.match(source,/web-content-development-rework:web-worker-result-missing/);
  assert.match(source,/Prepare local Vibe2 model for development cycles/);

  // F: direct time-stage/test-harness controls stay forbidden.
  assert.match(validator,/DIRECT_TIME_STAGE_CONTROL_FORBIDDEN/);
  assert.match(validator,/FAKE_TIME_PROGRESS_MARKERS_FORBIDDEN/);
  assert.match(validator,/GENERIC_OR_TIME_PROXY_MARKERS_FORBIDDEN/);

  // G: existing source feeds development bootstrap, while final validates only the freshly revalidated persisted source.
  assert.match(initialBlock,/`--source-path=\$\{item\.webSourcePath\}`/);
  assert.match(finalBlock,/`--source=\$\{item\.webInitialCycleSourcePath\}`/);

  assert.match(source,/WEB_VALIDATION_SCHEMA_MINIMUM=13/);
  assert.doesNotMatch(source,/WEB_VALIDATION_SCHEMA_MINIMUM=10/);
  assert.match(source,/webValidationEvidenceSchemaMinimum=13/);
  assert.match(source,/Number\(item\.webValidationSchemaVersion\)!==13/);
  assert.match(source,/timeout-minutes: 85/);
  assert.match(source,/cancel-in-progress: false/);
  assert.match(source,/max-parallel: 1/);
  assert.match(source,/WEB_PILOT_TARGET/);
});