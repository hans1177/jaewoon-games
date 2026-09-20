import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validateBootstrapHtml,buildContractSafePlayable,buildFirstPlayable,inferDevelopmentGenre,classifyApprovedScope,applyPreservedSourceEdits} from '../tools/company-development-web-bootstrap.mjs';
import {deriveApprovedScopeInventory,runtimeApprovedScopeCoverage,staticApprovedScopeCoverage} from '../tools/company-approved-scope-contract.mjs';
import {summarizePresentationRuntimeSamples,buildRuntimeValidationEvidence,baselineFeatureRequirements} from '../tools/company-development-web-gameplay-validation.mjs';

const basePlayable='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body data-audio-state="locked"><button id="act">Act</button><button data-audio-control="mute">Mute</button><input data-audio-control="volume" type="range"><script>let score=0;const AC=window.AudioContext||window.webkitAudioContext;document.querySelector("#act").addEventListener("click",()=>{score++});</script></body></html>';

test('base bootstrap contract still rejects network and persistent storage',()=>{
  assert.equal(validateBootstrapHtml(basePlayable).pass,true);
  const bad=basePlayable.replace('</script>',';localStorage.setItem("x","1");fetch("https://example.com");</script>');
  const result=validateBootstrapHtml(bad);
  assert.equal(result.pass,false);
  assert.ok(result.blockers.includes('PERSISTENT_STORAGE_FORBIDDEN_ON_BOOTSTRAP'));
  assert.ok(result.blockers.includes('NETWORK_API_FORBIDDEN'));
});

test('preserved source repair applies bounded exact edits without whole-document replacement',()=>{
  const original='<main><button id="a">A</button><p>keep</p></main>';
  const patched=applyPreservedSourceEdits(original,[{search:'<button id="a">A</button>',replacement:'<button id="a">B</button>'}]);
  assert.equal(patched,'<main><button id="a">B</button><p>keep</p></main>');
  assert.throws(()=>applyPreservedSourceEdits('<b>x</b><b>x</b>',[{search:'<b>x</b>',replacement:'<b>y</b>'}]),/VIBE2_PATCH_TARGET_AMBIGUOUS/);
});

test('company Web bootstrap cannot generate or repair game source with Gemini',()=>{
  const source=fs.readFileSync('tools/company-development-web-bootstrap.mjs','utf8');
  assert.doesNotMatch(source,/generativelanguage\.googleapis|GEMINI_API_KEY|VIBE2_GEMINI_MODEL_REQUIRED|async function callModel|buildVibePlayable/);
  assert.match(source,/VIBE_WEB_IMPLEMENTATION_REQUIRED/);
  assert.match(source,/GAME_DEVELOPMENT_OWNER=VIBE2_VIBE3/);
  assert.match(source,/NON_VIBE_GAME_SOURCE_WRITE=NO/);
  assert.match(source,/BOOTSTRAP_SOURCE_WRITE_MODE=PRESERVE_ONLY/);
  assert.match(source,/failureSignature/);
  assert.match(source,/vibeWebRequestedStage/);
  assert.match(source,/vibeWebImplementationReason/);
});

test('bug-defense runtime is treated as tower defense without fake avatar movement requirements',()=>{
  const baseline={gameId:'bug-defense',gameSeedId:'OWNER-FULL-REBUILD-BUG-DEFENSE-20260916',content:{identity:'곤충 디펜스',coreFun:'포식자 곤충을 배치해 정원을 방어한다',coreLoop:['웨이브 시작 전 적의 침입 경로를 분석한다','최적 위치에 포식자 곤충을 배치한다','전투 중 배치를 수정한다'],mobileUx:'한 손 터치 배치'}};
  const requirements=baselineFeatureRequirements(baseline,deriveApprovedScopeInventory(baseline));
  assert.equal(requirements.avatarMovementRequired,false);
  assert.equal(requirements.worldRequired,true);
});

test('Web runtime spatial detector does not treat absent coordinates as 3D and recognizes Korean exploration input',()=>{
  const source=fs.readFileSync('tools/company-development-web-gameplay-validation.mjs','utf8');
  assert.ok(source.includes("if(value==='')return null;"));
  assert.match(source,/탐험\|탐색\|경로/);
  assert.match(source,/detected3D=spatialDimension==='3d'\|\|\[playerPosition\.x,playerPosition\.y,playerPosition\.z\]\.every\(Number\.isFinite\)/);
});

test('Eldoria story runtime exposes changing quest objectives and NPC dialogue interaction evidence',()=>{
  const source=fs.readFileSync('web-games/_shared/vibe2-final.js','utf8');
  assert.match(source,/data-objective=\"chapter-\$\{chapter\}-quest-main/);
  assert.match(source,/data-interaction-target=\"story-guide-\$\{chapter\}/);
  assert.match(source,/talk\.dataset\.interactionTarget=`story-guide-\$\{chapter\}`/);
  assert.match(source,/talk\.dataset\.dialogueState=String\(clue\)/);
  assert.match(source,/S\.progress=0;if\(S\.chapter>5\)/);
});

test('shared preserved engine binds more than five approved scopes without model regeneration',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-shared-scopes-'));
  const source=path.join(root,'source'),candidate=path.join(root,'candidate');
  fs.mkdirSync(source,{recursive:true});
  fs.writeFileSync(path.join(source,'index.html'),'<!doctype html><html lang="ko"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><script>window.GAME_CONFIG={id:"shared-story-test",name:"Shared Story",mode:"eldoria",hp:100,desc:"story",story:"story"}</script><script src="/web-games/_shared/vibe2-final.js"></script></body></html>');
  const baseline={content:{coreFun:'Explore an area, meet characters, accept story quests, and discover information.',coreLoop:[
    'Fight enemies and bosses, gain equipment or skills, and use that growth to reach the next story location or major encounter.',
    'Progress through the complete story arc to a final boss and a real ending, with optional post-game or sequel hooks kept separate from the base conclusion.',
    'Explore an area, meet characters, accept or advance story quests, and discover information that moves the main narrative forward.',
    'Fight enemies and bosses, gain equipment or skills, and use that growth to reach the next story location or major encounter.',
    'Progress through the complete story arc to a final boss and a real ending, with optional post-game or sequel hooks kept separate from the base conclusion.',
    'Explore an area, meet characters, accept or advance story quests, and discover information that moves the main narrative forward.',
    'Fight enemies and bosses, gain equipment or skills, and use that growth to reach the next story location or major encounter.'
  ],mobileUx:'Story Driven'}};
  const output=await buildFirstPlayable({gameId:'shared-story-test',gameName:'Shared Story',baseline,sourcePath:source,candidatePath:candidate,candidateId:'shared-story-test',sourceCommit:'test',model:'none'});
  assert.equal(output.generation.modelInvoked,false);
  assert.equal(output.review.pass,true);
  assert.equal(output.review.mechanicCount,5);
  assert.equal(output.approvedScopeInventory.length,9);
  const html=fs.readFileSync(path.join(candidate,'index.html'),'utf8');
  assert.equal((html.match(/data-scope-id=/g)||[]).length,9);
  assert.match(html,/dataset\.area=/);
  assert.doesNotMatch(html,/validationScopes\)\?C\.validationScopes\.slice\(0,5\)/);
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

test('battleground genre has no deleted-project template fallback and stays Vibe-owned',()=>{
  const baseline={gameSeedId:'SEED-ROBLOX-BATTLEGROUND_FIGHTING_SHOOTER-001',content:{identity:'New Battleground',coreFun:'combat, opponent, skill, cooldown',coreLoop:['read opponent movement and create an attack opening','damage opponents and reposition around cooldowns','finish rounds and re-enter with a changed tactical choice'],mobileUx:'touch controls'}};
  assert.throws(()=>buildContractSafePlayable({gameId:'new-battleground-game',gameName:'New Battleground',baseline}),/GENRE_REAL_IMPLEMENTATION_NOT_READY:BATTLEGROUND_FIGHTING_SHOOTER/);
});

test('Celestial Bastion shallow tower button is rejected and returns to Vibe instead of being preserved',async()=>{
  const baseline={gameSeedId:'SEED-SINGLE_DEFENSE_STRATEGY-001',content:{identity:'Celestial Bastion',coreFun:'defend the celestial core with tower placement and wave adaptation',coreLoop:['place towers against the threatened route','earn resources and upgrade the defense','adapt to enemy waves and clear the final threat'],mobileUx:'touch-first tower defense controls'}};
  const current=fs.readFileSync('web-games/seed-single-defense-strat-celestial-bastion/index.html','utf8');
  assert.match(current,/S\.towers\+\+/);
  assert.match(current,/j===2&&r<S\.towers/);
  assert.doesNotMatch(current,/data-(?:placement-position|build-slot|tower-slot|grid-x|grid-y)/i);
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'web-celestial-repair-')),candidate=path.join(temp,'candidate');
  try{
    await assert.rejects(()=>buildFirstPlayable({gameId:'seed-single-defense-strat-celestial-bastion',gameName:'Celestial Bastion',baseline,sourcePath:'web-games/seed-single-defense-strat-celestial-bastion',candidatePath:candidate,candidateId:'repair-test',sourceCommit:'test',model:'none'}),/VIBE_WEB_IMPLEMENTATION_REQUIRED/);
    assert.equal(fs.existsSync(path.join(candidate,'index.html')),false);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('unfinished deterministic genres fail closed instead of receiving the old generic game shell',()=>{
  const baseline={gameSeedId:'SEED-ROBLOX-SURVIVAL_HORROR_ESCAPE-001',content:{identity:'Last Lantern',coreFun:'survive and escape',coreLoop:['explore','avoid threat','escape'],mobileUx:'touch controls'}};
  assert.throws(()=>buildContractSafePlayable({gameId:'seed-roblox-survival-horror-es-doors',gameName:'Last Lantern',baseline}),/GENRE_REAL_IMPLEMENTATION_NOT_READY:SURVIVAL_HORROR_ESCAPE/);
});

test('canonical Web bootstrap is validation-only and returns implementation work to Vibe',()=>{
  const source=fs.readFileSync('tools/company-development-web-bootstrap.mjs','utf8');
  const start=source.indexOf('export async function buildFirstPlayable');
  const end=source.indexOf('async function main()',start);
  const implementation=source.slice(start,end);
  assert.match(implementation,/SOURCE_PRESERVED_VALIDATION_ONLY/);
  assert.match(implementation,/VIBE_WEB_IMPLEMENTATION_REQUIRED:WEB_BASE_IMPLEMENTATION/);
  assert.match(implementation,/VIBE_WEB_IMPLEMENTATION_REQUIRED:\$\{forceRepair\?'WEB_REPAIR':'WEB_BASE_IMPLEMENTATION'\}/);
  assert.doesNotMatch(implementation,/buildContractSafePlayable|callModel|Gemini|GEMINI|buildVibePlayable/);
  assert.match(source,/GAME_DEVELOPMENT_OWNER=VIBE2_VIBE3/);
  assert.match(source,/NON_VIBE_GAME_SOURCE_WRITE=NO/);
  assert.match(source,/MODEL_INVOKED=NO/);
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
  assert.match(initialBlock,/strictImplementationReviewPath:null,strictImplementationScore:null,webStrictScore:null/);
  assert.match(initialBlock,/webValidationSchemaVersion:null,webSourceIndexSha256:null,webDesignBaselineSha256:null/);
  assert.match(initialBlock,/WEB_INITIAL_CANONICAL_PERSIST/);
  assert.match(initialBlock,/WEB_FINAL_CONTENT_DEPTH_EXECUTED=NO/);

  // B: all initial failures return directly to active repair, preserving prior context when present.
  assert.match(initialBlock,/if\(item\.existingWebValidated===true\)/);
  assert.match(initialBlock,/materialize\(`\$\{stableSource\}\/index\.html`\)/);
  assert.match(initialBlock,/WEB_EXISTING_GAME_FRESH_REVALIDATION/);
  assert.match(failureBlock,/item\.webInitialCyclePassed===true\|\|item\.existingWebValidated===true/);
  assert.match(failureBlock,/const repairState='WEB_VIBE_REPAIR_REQUIRED'/);
  assert.match(failureBlock,/canonicalState:repairState/);
  assert.doesNotMatch(failureBlock,/WAITING_WEB_GAMEPLAY_REVALIDATION/);
  assert.doesNotMatch(failureBlock,/RETURN_TO_WEB_DEVELOPMENT_FOR_CONTENT_EXPANSION/);
  assert.match(failureBlock,/webInitialCyclePassed:rework/);
  assert.match(failureBlock,/WEB_CONTENT_REWORK_RETRY_PRESERVED=YES/);
  assert.match(source,/WEB_FAILURE_STALE_FULL_SCORE_INVALIDATED=YES/);
  assert.match(source,/strictImplementationReviewPath:null,strictImplementationScore:null,webStrictScore:null/);
  assert.match(source,/webValidationEvidencePath:null,homepageTestScore:null/);
  assert.match(failureBlock,/WEB_FINAL_CONTENT_DEPTH_EXECUTED=NO/);

  // B2: expected bootstrap signals are structured for Vibe; unexpected errors retain generic traceable routing.
  assert.match(failureBlock,/VIBE_WEB_IMPLEMENTATION_REQUIRED:\(WEB_BASE_IMPLEMENTATION\|WEB_REPAIR\)/);
  assert.match(failureBlock,/vibeRequestedStage==='WEB_REPAIR'\?'VIBE_WEB_REPAIR'/);
  assert.match(failureBlock,/vibeRequestedStage==='WEB_BASE_IMPLEMENTATION'\?'VIBE_WEB_BASE_IMPLEMENTATION'/);
  assert.match(failureBlock,/vibe-web-implementation-required:\$\{vibeRequestedStage\}:\$\{vibeRequestedReason\}/);
  assert.match(failureBlock,/sourceRootBootstrapRequired=vibeRequestedStage==='WEB_BASE_IMPLEMENTATION'/);
  assert.match(failureBlock,/web-gameplay-music/);
  assert.match(failureBlock,/vibeWebImplementationRequired:Boolean\(vibeImplementationSignal\)/);
  assert.match(failureBlock,/WEB_VIBE_IMPLEMENTATION_SIGNAL/);

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
  assert.match(finalBlock,/WEB_VIBE_REPAIR_REQUIRED/);

  // E: final depth failure returns directly to active development repair, and next initial cycle forces Vibe source repair.
  assert.doesNotMatch(finalBlock,/company-development-web-bootstrap\.mjs/);
  assert.match(failureBlock,/canonicalState:'WEB_VIBE_REPAIR_REQUIRED'/);
  assert.match(failureBlock,/currentStep:'VIBE_WEB_REPAIR'/);
  assert.match(failureBlock,/webInitialCycleEvidencePath:item\.webInitialCycleEvidencePath/);
  assert.match(failureBlock,/webInitialCycleSourcePath:item\.webInitialCycleSourcePath/);
  assert.match(failureBlock,/WEB_CONTENT_RETURN_TO_DEVELOPMENT=YES/);
  assert.match(source,/--force-repair=true/);
  assert.match(source,/WEB_RETURN_TO_VIBE=YES/);
  assert.match(source,/WEB_VIBE_24H_DISPATCH=YES/);
  assert.match(source,/--repair-reason=FINAL_CONTENT_DEPTH_REWORK_REQUIRED/);
  assert.match(source,/vibe-web-development-required:web-worker-result-missing/);
  assert.doesNotMatch(source,/Confirm lazy optional AI runtime policy/);
  assert.match(source,/COMPANY_WEB_ROLE=VALIDATE_ROUTE_FAN_IN/);

  // F: direct time-stage/test-harness controls stay forbidden.
  assert.match(validator,/DIRECT_TIME_STAGE_CONTROL_FORBIDDEN/);
  assert.match(validator,/FAKE_TIME_PROGRESS_MARKERS_FORBIDDEN/);
  assert.match(validator,/GENERIC_OR_TIME_PROXY_MARKERS_FORBIDDEN/);

  // G: existing source feeds development bootstrap, while final validates only the freshly revalidated persisted source.
  assert.match(initialBlock,/`--source-path=\$\{item\.webSourcePath\}`/);
  assert.match(finalBlock,/`--source=\$\{item\.webInitialCycleSourcePath\}`/);

  assert.match(source,/WEB_VALIDATION_SCHEMA_VERSION/);
  assert.match(source,/webValidationEvidenceSchemaMinimum=WEB_VALIDATION_SCHEMA_VERSION/);
  assert.doesNotMatch(source,/WEB_VALIDATION_SCHEMA_MINIMUM=13/);
  assert.doesNotMatch(source,/webValidationEvidenceSchemaMinimum=13/);
  assert.doesNotMatch(source,/Number\(item\.webValidationSchemaVersion\)!==13/);
  assert.match(source,/timeout-minutes: 85/);
  assert.match(source,/cancel-in-progress: false/);
  assert.match(source,/max-parallel: 20/);
  assert.match(source,/WEB_PILOT_TARGET/);
});

test('platform routing does not wait for optional post-Web artbook',()=>{
  const source=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');
  assert.match(source,/\n  route:\n[\s\S]{0,600}needs: \[web-gate\]/);
  assert.doesNotMatch(source,/\n  route:\n[\s\S]{0,600}needs: \[web-gate, post-web-artbook\]/);
  assert.match(source,/ARTBOOK_FAILURE_ONLY_BLOCKS_HOMEPAGE=YES/);
  assert.match(source,/post-web-artbook:[\s\S]{0,400}continue-on-error: true/);
  assert.match(source,/POST_WEB_ARTBOOK_FAILURE_NATIVE_BLOCK=NO/);
});


test('target platform failures use repair states while missing executors block explicitly',()=>{
  const source=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');
  assert.doesNotMatch(source,/state==='WAITING_REVALIDATION'/);
  assert.doesNotMatch(source,/state==='WAITING_TARGET_PLATFORM_REVALIDATION'/);
  assert.doesNotMatch(source,/state==='WAITING_TARGET_PLATFORM_VALIDATION'/);
  assert.match(source,/state==='DEVELOPMENT_REVALIDATION_REPAIR_REQUIRED'/);
  assert.match(source,/state==='TARGET_PLATFORM_REPAIR_REQUIRED'/);
  assert.match(source,/status:'BLOCKED'[\s\S]{0,300}canonicalState:'DEVELOPMENT_BLOCKED'/);
  assert.match(source,/routingBlockers:\['platform-runtime-executor-not-configured'\]/);
  assert.match(source,/DEVELOPMENT_ROUTE_EXTERNAL_BLOCKED=/);
});


test('development runtime ignores queue entries outside canonical active catalog',()=>{
  const source=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');
  assert.ok((source.match(/const canonicalGameIds=new Set\(/g)||[]).length>=3);
  assert.ok((source.match(/const ownerResetIds=new Set\(/g)||[]).length>=3);
  assert.ok((source.match(/const resetPassIds=new Set\(/g)||[]).length>=3);
  assert.ok((source.match(/updatedAt>=ownerResetAt/g)||[]).length>=3);
  assert.ok((source.match(/!ownerResetIds\.has\(gameId\)\|\|resetPassIds\.has\(gameId\)/g)||[]).length>=3);
  assert.ok((source.match(/\['ACTIVE','REBUILD'\]\.includes\(String\(game\.lifecycleState\|\|'ACTIVE'\)\.toUpperCase\(\)\)&&String\(game\.productionClass\|\|''\)\.toUpperCase\(\)==='DEVELOPMENT_CONFIRMED'/g)||[]).length>=3);
  assert.ok((source.match(/if\(!canonicalGameIds\.has\(String\(item\.gameId\|\|''\)\.trim\(\)\)\)/g)||[]).length>=3);
  assert.match(source,/requestedItem=requestedGameId\?\(q\.items\|\|\[\]\)\.find\(item=>item\.gameId===requestedGameId&&canonicalGameIds\.has/);
});

test('owner pause keeps DEVELOPMENT_CONFIRMED at pre-Web boundary',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');
  assert.match(workflow,/OWNER_WEB_DEVELOPMENT_PAUSED: 'false'/);
  assert.match(workflow,/OWNER_WEB_DEVELOPMENT_PAUSED=YES/);
  assert.match(workflow,/WEB_DEVELOPMENT_TARGET_COUNT=0/);
  assert.match(workflow,/printf 'target_count=0\\n' >> "\$GITHUB_OUTPUT"/);
  assert.match(workflow,/printf 'matrix=%s\\n' '\{"include":\[\]\}' >> "\$GITHUB_OUTPUT"/);
});


test('presentation runtime observation measures frame continuity and living motion',()=>{
  const frameDeltas=Array.from({length:29},()=>16.7);
  const samples=Array.from({length:7},(_,i)=>({
    playerPresent:true,
    playerVisual:{x:10,y:20+i*0.3,w:20,h:30,transform:`matrix(1,0,0,1,0,${i*0.2})`,opacity:'1'},
    canvasState:[],
    activeAnimationCount:1,
    playerAnimationCount:1,
    motionState:'idle',
    vfxActiveCount:0,
    cameraResponse:''
  }));
  const evidence=summarizePresentationRuntimeSamples({samples,frameDeltas});
  assert.equal(evidence.frameTiming.pass,true);
  assert.equal(evidence.frameTiming.target60FpsObserved,true);
  assert.equal(evidence.livingMotionObserved,true);
  assert.equal(evidence.pass,true);
});

test('presentation runtime observation rejects frozen presentation despite healthy frame timing',()=>{
  const frameDeltas=Array.from({length:29},()=>16.7);
  const sample={playerPresent:true,playerVisual:{x:10,y:20,w:20,h:30,transform:'none',opacity:'1'},canvasState:['320x180:same'],activeAnimationCount:0,playerAnimationCount:0,motionState:'',vfxActiveCount:0,cameraResponse:''};
  const evidence=summarizePresentationRuntimeSamples({samples:Array.from({length:7},()=>sample),frameDeltas});
  assert.equal(evidence.frameTiming.pass,true);
  assert.equal(evidence.livingMotionObserved,false);
  assert.equal(evidence.pass,false);
});

test('final presentation marker turns runtime presentation evidence into a gate',()=>{
  const base={before:{presentationQualityVersion:1},after:{presentationQualityVersion:1},reloadAfter:{presentationQualityVersion:1},footprint:{presentationQualityVersion:1,saveContract:false,economyContract:false,difficultyContract:false},runtimeFeatureEvidence:{},featureRequirements:{},movementProbe:{},presentationRuntime:{pass:false,frameTiming:{pass:true},livingMotionObserved:false}};
  const failed=buildRuntimeValidationEvidence(base);
  assert.equal(failed.presentation.required,true);
  assert.equal(failed.presentation.pass,false);
  assert.equal(failed.presentation.status,'FAIL');
  const passed=buildRuntimeValidationEvidence({...base,presentationRuntime:{pass:true,frameTiming:{pass:true},livingMotionObserved:true}});
  assert.equal(passed.presentation.required,true);
  assert.equal(passed.presentation.pass,true);
  assert.equal(passed.presentation.status,'PASS');
});


test('presentation runtime marker must be exposed by the live DOM',()=>{
  const evidence=buildRuntimeValidationEvidence({
    before:{presentationQualityVersion:0},after:{presentationQualityVersion:0},reloadAfter:{presentationQualityVersion:0},
    footprint:{presentationQualityVersion:1,saveContract:false,economyContract:false,difficultyContract:false},
    runtimeFeatureEvidence:{},featureRequirements:{},movementProbe:{},
    presentationRuntime:{pass:true,frameTiming:{pass:true},livingMotionObserved:true}
  });
  assert.equal(evidence.presentation.required,true);
  assert.equal(evidence.presentation.contractExposed,false);
  assert.equal(evidence.presentation.pass,false);
  assert.equal(evidence.presentation.status,'FAIL');
});
