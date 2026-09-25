import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validateBootstrapHtml,buildContractSafePlayable,buildFirstPlayable,inferDevelopmentGenre,classifyApprovedScope,applyPreservedSourceEdits} from '../tools/company-development-web-bootstrap.mjs';
import {deriveApprovedScopeInventory,approvedScopeRequirement,runtimeApprovedScopeCoverage,staticApprovedScopeCoverage} from '../tools/company-approved-scope-contract.mjs';
import {summarizePresentationRuntimeSamples,summarizeActionPresentationEvidence,summarizeCommercialReadinessEvidence,summarizePresentationRegression,buildWebPresentationHandoff,buildRuntimeValidationEvidence} from '../tools/company-development-web-gameplay-validation.mjs';

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

test('mobile button layout is not misclassified as tower placement',()=>{
  const mobile={id:'mobile',path:'mobileUx',label:"한 손 조작 세로형 레이아웃에서 화면 하단의 전진 버튼과 탈출 버튼을 배치한다."};
  const tower={id:'tower',path:'coreLoop[0]',label:'위협 경로에 맞춰 타워를 배치한다.'};
  assert.equal(approvedScopeRequirement(mobile),'STATE_CHANGE');
  assert.equal(approvedScopeRequirement(tower),'TOWER_PLACEMENT');
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

test('canonical DEVELOPMENT_CONFIRMED runtime gates new upper-platform work on Unity Web readiness',()=>{
  const source=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');
  const admission=fs.readFileSync('tools/company-upper-platform-admission.mjs','utf8');
  assert.match(source,/native-plan:/);
  assert.match(source,/String\(item\.productionClass\|\|''\)\.toUpperCase\(\)==='DEVELOPMENT_CONFIRMED'/);
  assert.match(source,/platformDevelopmentEligible\(item,'ROBLOX'\)\|\|platformDevelopmentEligible\(item,'UNITY'\)/);
  assert.match(admission,/MINIMUM_DESIGN_CONTRACT_REQUIRED/);
  assert.match(admission,/DUAL_PLATFORM_DESIGN_PROFILE_REQUIRED/);
  assert.match(admission,/DUAL_NATIVE_TARGETS_REQUIRED/);
  assert.match(admission,/UPPER_PLATFORM_DEVELOPMENT_READY/);
  assert.match(admission,/READINESS_SOURCE_STALE/);
  assert.match(source,/UPPER_PLATFORM_ELIGIBLE_IDS=/);
  assert.match(source,/UNITY_WEB_FLOOR_IDS=/);
  assert.match(source,/UNITY_WEB_FLOOR_BOOTSTRAP_IDS=/);
  assert.match(source,/UPPER_PLATFORM_GRANDFATHERED_IDS=/);
  assert.match(source,/uses: \.\/\.github\/workflows\/company-development-roblox-runtime\.yml/);
  assert.match(source,/uses: \.\/\.github\/workflows\/company-development-unity-runtime\.yml/);
  assert.match(source,/uses: \.\/\.github\/workflows\/unity-web-first-stage-build\.yml/);
  assert.doesNotMatch(source,/UNITY_WEB_RUNTIME_ROLE=NON_BLOCKING_VALIDATION_SURFACE/);
  assert.doesNotMatch(source,/gh workflow run company-development-(?:roblox|unity)-runtime\.yml/);
});

test('native routing admits only readiness-pass or grandfathered games while unready games stay in Unity Web floor',()=>{
  const source=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');
  assert.match(source,/nativeAlreadyStarted/);
  assert.match(source,/readinessFor/);
  assert.match(source,/if\(ready\.pass\)\{nativeIds\.push\(item\.gameId\);continue;\}/);
  assert.match(source,/if\(discoverBuildWeb\(item\.gameId\)\)\{webIds\.push\(item\.gameId\);continue;\}/);
  assert.match(source,/grandfatheredIds\.push\(item\.gameId\)/);
  assert.match(source,/dispatch-roblox:/);
  assert.match(source,/dispatch-unity:/);
  assert.match(source,/dispatch-unity-web-floor:/);
  assert.match(source,/dispatch-unity-web-bootstrap:/);
  assert.match(source,/needs\.native-plan\.outputs\.eligible_json/);
  assert.match(source,/needs\.native-plan\.outputs\.unity_web_json/);
  assert.doesNotMatch(source,/UNITY_WEB_RUNTIME_ROLE=NON_BLOCKING_VALIDATION_SURFACE/);
});

test('target platform failures stay in repair states in native workers',()=>{
  const router=fs.readFileSync('tools/company-selected-platform-router.mjs','utf8');
  const roblox=fs.readFileSync('.github/workflows/company-development-roblox-runtime.yml','utf8');
  const unity=fs.readFileSync('.github/workflows/company-development-unity-runtime.yml','utf8');
  assert.doesNotMatch(router,/WAITING_REVALIDATION|WAITING_TARGET_PLATFORM_REVALIDATION|WAITING_TARGET_PLATFORM_VALIDATION/);
  assert.match(router,/return 'TARGET_PLATFORM_REPAIR_REQUIRED'/);
  assert.match(roblox,/canonicalState:'TARGET_PLATFORM_REPAIR_REQUIRED'/);
  assert.match(roblox,/BUILD_REPAIR_REQUIRED/);
  assert.match(unity,/failure='TARGET_PLATFORM_RUNTIME'/);
  assert.match(unity,/failure='INDEPENDENT_QA'/);
  assert.match(unity,/failure='REGRESSION'/);
});

test('development runtime uses company-runtime queue authority and canonical native eligibility',()=>{
  const source=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');
  assert.match(source,/git show "origin\/\$COMPANY_RUNTIME_BRANCH:development-queue\.json"/);
  assert.match(source,/String\(item\.productionClass\|\|''\)\.toUpperCase\(\)==='DEVELOPMENT_CONFIRMED'/);
  assert.match(source,/String\(item\.status\|\|''\)\.toUpperCase\(\)!=='DISABLED'/);
  assert.match(source,/platformDevelopmentEligible\(item,'ROBLOX'\)\|\|platformDevelopmentEligible\(item,'UNITY'\)/);
  assert.match(source,/DEVELOPMENT_GAME_ELIGIBILITY_CAP=NONE/);
});

test('development runtime has no legacy Web pause switch and uses readiness-controlled reusable native lanes',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');
  assert.doesNotMatch(workflow,/OWNER_WEB_DEVELOPMENT_PAUSED/);
  assert.doesNotMatch(workflow,/WEB_DEVELOPMENT_TARGET_COUNT=0/);
  assert.match(workflow,/DEVELOPMENT_GAME_ELIGIBILITY_CAP=NONE/);
  assert.match(workflow,/UPPER_PLATFORM_ELIGIBLE_IDS=/);
  assert.match(workflow,/uses: \.\/\.github\/workflows\/company-development-roblox-runtime\.yml/);
  assert.match(workflow,/uses: \.\/\.github\/workflows\/company-development-unity-runtime\.yml/);
  assert.match(workflow,/uses: \.\/\.github\/workflows\/unity-web-first-stage-build\.yml/);
  assert.doesNotMatch(workflow,/ROBLOX_RUNTIME_DISPATCH=YES/);
  assert.doesNotMatch(workflow,/UNITY_APP_RUNTIME_DISPATCH=YES/);
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


test('action presentation gate requires attack flow, hit response, VFX, SFX and mobile-friendly controls',()=>{
  const actionEvidence=[{
    mechanicId:'weapon-attack',label:'공격',
    presentationEvent:{
      motionStates:['attack','hit'],
      actionPhases:['windup','active','recovery'],
      vfxPeak:2,audioNodeDelta:1,canvasChanged:true,audioEvents:['sword-hit']
    }
  }];
  const passed=summarizeActionPresentationEvidence({
    required:true,qualityVersion:2,actionEvidence,
    before:{smallControlCount:0,bottomActionCount:3}
  });
  assert.equal(passed.pass,true);
  assert.equal(passed.actionFlowObserved,true);
  assert.equal(passed.vfxObserved,true);
  assert.equal(passed.sfxObserved,true);
  assert.equal(passed.mobileUi.pass,true);
});

test('action presentation gate rejects model-like static combat and inconvenient mobile controls',()=>{
  const failed=summarizeActionPresentationEvidence({
    required:true,qualityVersion:1,
    actionEvidence:[{mechanicId:'attack',label:'공격',presentationEvent:{motionStates:['idle'],actionPhases:['active'],vfxPeak:0,audioNodeDelta:0,canvasChanged:false,audioEvents:[]}}],
    before:{smallControlCount:2,bottomActionCount:0}
  });
  assert.equal(failed.pass,false);
  assert.equal(failed.attackMotion,false);
  assert.equal(failed.actionFlowObserved,false);
  assert.equal(failed.vfxObserved,false);
  assert.equal(failed.sfxObserved,false);
  assert.equal(failed.mobileUi.pass,false);
});

test('preplatform Web prompt requires coherent action presentation and intuitive mobile UI',()=>{
  const source=fs.readFileSync('tools/company-development-web-bootstrap.mjs','utf8');
  assert.match(source,/data-presentation-quality-version="2"/);
  assert.match(source,/선행동작\(anticipation\/windup\).*타격\(active\/contact\).*회수\(recovery\/follow-through\)/);
  assert.match(source,/몬스터는 승인된 세계관.*생태.*전투 역할/);
  assert.match(source,/모바일.*전투 버튼|전투 버튼.*모바일|모바일 UI|엄지/);
});


test('canvas presentation observation uses runtime surface changes without renderer context sampling',()=>{
  const frameDeltas=Array.from({length:29},()=>16.7);
  const samples=Array.from({length:7},(_,i)=>({
    playerPresent:false,
    playerVisual:null,
    canvasState:[`640x360:frame-${i}`],
    canvasRenderSurfaceCount:1,
    environmentVisualDetailCount:0,
    enemyVisualDetailCount:0,
    activeAnimationCount:0,
    playerAnimationCount:0,
    motionState:'attack',
    vfxActiveCount:1,
    cameraResponse:'follow'
  }));
  const evidence=summarizePresentationRuntimeSamples({samples,frameDeltas});
  assert.equal(evidence.canvasRuntimeObserved,true);
  assert.equal(evidence.environmentVisualObserved,true);
  assert.equal(evidence.entityModelDetailObserved,true);
  assert.equal(evidence.pass,true);
});

test('presentation hard gate requires actual environment and entity visual detail for world action games',()=>{
  const base={
    before:{presentationQualityVersion:1},after:{presentationQualityVersion:1},reloadAfter:{presentationQualityVersion:1},
    footprint:{presentationQualityVersion:1,saveContract:false,economyContract:false,difficultyContract:false},
    runtimeFeatureEvidence:{},featureRequirements:{worldRequired:true,actionPresentationRequired:true},movementProbe:{}
  };
  const failed=buildRuntimeValidationEvidence({...base,presentationRuntime:{pass:true,frameTiming:{pass:true},livingMotionObserved:true,environmentVisualObserved:false,entityModelDetailObserved:false}});
  assert.equal(failed.presentation.environmentVisualPass,false);
  assert.equal(failed.presentation.entityModelDetailPass,false);
  assert.equal(failed.presentation.pass,false);
  const passed=buildRuntimeValidationEvidence({...base,presentationRuntime:{pass:true,frameTiming:{pass:true},livingMotionObserved:true,environmentVisualObserved:true,entityModelDetailObserved:true}});
  assert.equal(passed.presentation.environmentVisualPass,true);
  assert.equal(passed.presentation.entityModelDetailPass,true);
  assert.equal(passed.presentation.pass,true);
});

test('action presentation requires death motion when a combat action removes an enemy',()=>{
  const base={
    mechanicId:'weapon-attack',label:'공격',
    combatOutcomeSignature:JSON.stringify({enemy:-1,boss:0}),
    presentationEvent:{
      motionStates:['attack','hit'],
      actionPhases:['windup','active','recovery'],
      vfxPeak:2,audioNodeDelta:1,canvasChanged:true,audioEvents:['sword-hit']
    }
  };
  const failed=summarizeActionPresentationEvidence({required:true,qualityVersion:2,actionEvidence:[base],before:{smallControlCount:0,bottomActionCount:3}});
  assert.equal(failed.enemyRemovalObserved,true);
  assert.equal(failed.deathMotionObserved,false);
  assert.equal(failed.deathMotionPass,false);
  assert.equal(failed.pass,false);
  const passed=summarizeActionPresentationEvidence({
    required:true,qualityVersion:2,
    actionEvidence:[{...base,presentationEvent:{...base.presentationEvent,motionStates:['attack','hit','death']}}],
    before:{smallControlCount:0,bottomActionCount:3}
  });
  assert.equal(passed.deathMotionObserved,true);
  assert.equal(passed.deathMotionPass,true);
  assert.equal(passed.pass,true);
});

test('commercial readiness gate requires style lock, genre UI, animation, accessibility, audio and performance',()=>{
  const view={
    commercialReadinessVersion:1,
    styleLockId:'forest-survival-v1',
    styleLockRevision:'r1',
    genreUiProfile:'SURVIVAL_TOUCH',
    uiMotionLanguage:'grounded-responsive',
    uniqueFunctionalUiCount:5,
    smallControlCount:0,
    duplicateActionRatio:0.2,
    testUiRatio:0,
    motionStates:['idle','move','attack','hit','death'],
    enemyTypes:['wolf','boar'],
    enemyPresentationSignatures:['wolf:lunge-bite-fall','boar:charge-gore-collapse'],
    colorOnlyStatusCount:0,
    intenseMotionEffectCount:1,
    motionSafetyControlCount:1,
    muteControls:1,
    volumeControls:1,
    monetizationControlCount:1,
    mixedMonetizationGameplayControlCount:0
  };
  const evidence=summarizeCommercialReadinessEvidence({
    required:true,
    qualityVersion:2,
    commercialVersion:1,
    before:view,after:view,reloadAfter:view,
    featureRequirements:{genreKey:'SURVIVAL',genreUiMinimum:4,actionPresentationRequired:true},
    actionEvidence:[{presentationEvent:{motionStates:['attack','hit']}}],
    presentationRuntime:{livingMotionObserved:true,frameTiming:{pass:true}},
    interactionCount:4,
    stateTransitionCount:4,
    saveRestore:{required:true,pass:true,status:'PASS'}
  });
  assert.equal(evidence.pass,true);
  assert.equal(evidence.styleLock.pass,true);
  assert.equal(evidence.genrePresentation.pass,true);
  assert.equal(evidence.enemyDistinctiveness.pass,true);
  assert.equal(evidence.accessibility.pass,true);
  assert.equal(evidence.audio.pass,true);
  assert.equal(evidence.performance.pass,true);
});

test('commercial readiness gate rejects style drift, weak mobile UI and mixed monetization controls',()=>{
  const before={
    commercialReadinessVersion:1,styleLockId:'style-a',styleLockRevision:'r1',genreUiProfile:'ACTION_TOUCH',uiMotionLanguage:'snappy',
    uniqueFunctionalUiCount:3,smallControlCount:0,duplicateActionRatio:0.2,testUiRatio:0,motionStates:['idle','move'],
    enemyTypes:['a','b'],enemyPresentationSignatures:['same-body'],colorOnlyStatusCount:0,intenseMotionEffectCount:0,motionSafetyControlCount:0,
    muteControls:1,volumeControls:1,mixedMonetizationGameplayControlCount:0
  };
  const after={...before,styleLockId:'style-b',smallControlCount:2,colorOnlyStatusCount:1,mixedMonetizationGameplayControlCount:1};
  const evidence=summarizeCommercialReadinessEvidence({
    required:true,qualityVersion:2,commercialVersion:1,before,after,reloadAfter:after,
    featureRequirements:{genreKey:'ACTION',genreUiMinimum:3,actionPresentationRequired:false},
    presentationRuntime:{livingMotionObserved:true,frameTiming:{pass:true}},
    interactionCount:4,stateTransitionCount:4,saveRestore:{required:false}
  });
  assert.equal(evidence.pass,false);
  assert.equal(evidence.styleLock.pass,false);
  assert.equal(evidence.enemyDistinctiveness.pass,false);
  assert.equal(evidence.accessibility.pass,false);
  assert.equal(evidence.monetization.pass,false);
});

test('presentation regression guard blocks visual quality regressions against the last passing evidence',()=>{
  const previous={
    pass:true,
    designBaselineSha256:'same-design',
    sourceFootprint:{presentationQualityVersion:2,commercialReadinessVersion:1},
    before:{styleLockId:'style-a',styleLockRevision:'r1',genreUiProfile:'SURVIVAL_TOUCH'},
    presentationRuntime:{livingMotionObserved:true},
    runtimeValidationEvidence:{commercialReadiness:{enemyDistinctiveness:{pass:true},accessibility:{pass:true}}}
  };
  const current={
    pass:false,
    designBaselineSha256:'same-design',
    sourceFootprint:{presentationQualityVersion:1,commercialReadinessVersion:1},
    before:{styleLockId:'style-a',styleLockRevision:'r1',genreUiProfile:'GENERIC'},
    presentationRuntime:{livingMotionObserved:false},
    runtimeValidationEvidence:{commercialReadiness:{enemyDistinctiveness:{pass:false},accessibility:{pass:false}}}
  };
  const regression=summarizePresentationRegression({previous,current});
  assert.equal(regression.required,true);
  assert.equal(regression.pass,false);
  assert.equal(regression.checks.presentationVersionNotDecreased,false);
  assert.equal(regression.checks.genreUiProfileStable,false);
  assert.equal(regression.checks.livingMotionPreserved,false);
});

test('validated Web presentation handoff carries style, UI, motion and commercial readiness without requiring asset binary copy',()=>{
  const handoff=buildWebPresentationHandoff({
    gameId:'demo',
    featureRequirements:{genreKey:'SURVIVAL',genreUiMinimum:4},
    before:{styleLockId:'demo-style',styleLockRevision:'r2',genreUiProfile:'SURVIVAL_TOUCH',uiMotionLanguage:'grounded'},
    footprint:{commercialReadinessVersion:1},
    runtimeValidationEvidence:{presentation:{pass:true},commercialReadiness:{pass:true,animation:{motionStates:['idle','move','attack','hit','death']},enemyDistinctiveness:{pass:true}}},
    actionPresentationEvidence:{required:true,pass:true,phases:['windup','active','recovery'],vfxObserved:true,sfxObserved:true},
    presentationRuntime:{motionStates:['idle','move'],cameraResponses:['impact-small']},
    visualRegression:{required:true,pass:true,status:'PASS'}
  });
  assert.equal(handoff.ready,true);
  assert.equal(handoff.styleLock.id,'demo-style');
  assert.equal(handoff.ui.profile,'SURVIVAL_TOUCH');
  assert.equal(handoff.webAssetBinaryCopyRequired,false);
  assert.match(handoff.adaptationRule,/PLATFORM_NATIVE_RENDERING_ALLOWED/);
});


test('fantasy survival preserved source passes bootstrap without removing multiplayer or save semantics',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'fantasy-survival-preserve-')),candidate=path.join(root,'candidate');
  const baseline={
    gameId:'fantasy-survival',
    gameSeedId:'OWNER-PRESERVE-FANTASY-SURVIVAL-20260920',
    content:{
      coreFun:'기존 탐험·채집·제작·전투·퀘스트 선택과 결과는 바꾸지 않고, 같은 입력과 같은 판정에 살아있는 모션·명확한 타격 피드백·일관된 에셋 표현을 결합해 체감 품질을 높인다.',
      coreLoop:[
        'Fight through an escalating horde in a short real-time survival run while positioning around enemy pressure.',
        'Collect run rewards or experience and choose upgrades, perks, weapons, or skills that change the current build.',
        'Combine upgrades into a stronger build, survive harder waves or a boss, then convert the run result into the next progression choice.'
      ],
      mobileUx:'가상 조이스틱과 직관적인 터치 인터페이스를 통해 복잡한 조작 없이도 이동, 채집, 전투가 원활하게 이루어지도록 최적화된 레이아웃.',
      preservationContract:{mode:'PRESERVATION_PRESENTATION_UPGRADE',gameplayRule:'NO_GAMEPLAY_MECHANIC_ADDITION_REMOVAL_OR_REBALANCE'}
    }
  };
  try{
    const output=await buildFirstPlayable({
      gameId:'fantasy-survival',gameName:'마력숲 생존기',baseline,
      sourcePath:'web-games/fantasy-survival',candidatePath:candidate,candidateId:'fantasy-preserve-test',sourceCommit:'test',model:'none'
    });
    assert.equal(output.review.pass,true,output.review.blockers.join('|'));
    assert.equal(output.generation.modelInvoked,false);
    assert.equal(output.generation.sourcePreserved,true);
    const html=fs.readFileSync(path.join(candidate,'index.html'),'utf8');
    assert.match(html,/jaewoon_fantasy_survival_v1/);
    assert.match(html,/supabase/i);
    assert.match(html,/data-web-artifact-type="REAL_PLAYABLE_GAME"/);
    assert.match(html,/data-run-result="running"/);
    assert.equal((html.match(/data-scope-id=/g)||[]).length,5);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});
