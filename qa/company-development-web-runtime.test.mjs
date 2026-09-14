import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validateBootstrapHtml,validatePreservedSourceHtml,buildContractSafePlayable,buildFirstPlayable,inferDevelopmentGenre,classifyApprovedScope} from '../tools/company-development-web-bootstrap.mjs';
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

test('runtime scope coverage needs interactions and distinct mechanics',()=>{
  const args={declaredCount:4,visibleScopeIds:['a','b','c','d'],interactedScopeIds:['a','b','c','d'],mechanicBindings:['mine','smelt','sell','upgrade']};
  assert.equal(runtimeApprovedScopeCoverage(args).pass,true);
  assert.equal(runtimeApprovedScopeCoverage({...args,interactedScopeIds:['a']}).pass,false);
  assert.equal(runtimeApprovedScopeCoverage({...args,mechanicBindings:['generic']}).pass,false);
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

test('Pocket Foundry compiler emits a real factory loop, footprint and non-clickable session milestones',()=>{
  const baseline={gameSeedId:'SEED-ROBLOX-SIMULATOR_TYCOON_INCREMENTAL-001',content:{identity:'Pocket Foundry',coreFun:'collect, upgrade, income, unlock',coreLoop:['collect ore and turn it into production resources','spend earnings on upgrades and automation','unlock a new area and repeat with larger goals'],mobileUx:'touch controls'}};
  const inventory=deriveApprovedScopeInventory(baseline);
  const compiled=buildContractSafePlayable({gameId:'seed-roblox-simulator-tycoon-i-adopt-me',gameName:'Pocket Foundry',baseline});
  const contract=validateBootstrapHtml(compiled.html,{scopeInventory:inventory});
  assert.equal(compiled.generationMode,'GENRE_SPECIFIC_REAL_IMPLEMENTATION');
  assert.equal(contract.pass,true,contract.blockers.join(','));
  assert.ok(contract.bytes>=12000);
  assert.ok(contract.scriptBytes>=6000);
  assert.ok(contract.mechanicCount>=5);
  assert.match(compiled.html,/data-mechanic-id="ore-extraction"/);
  assert.match(compiled.html,/data-mechanic-id="ore-smelting"/);
  assert.match(compiled.html,/data-mechanic-id="automation-drone"/);
  assert.match(compiled.html,/data-mechanic-id="zone-unlock"/);
  assert.match(compiled.html,/data-session-proof-mode="PROGRESSION_MILESTONES"/);
  assert.doesNotMatch(compiled.html,/<button\b[^>]*data-session-stage=/i);
  assert.doesNotMatch(compiled.html,/scope-control-/i);
  assert.match(compiled.html,/state\.ore/);
  assert.match(compiled.html,/state\.ingot/);
  assert.match(compiled.html,/state\.drones/);
  assert.match(compiled.html,/state\.zone/);
});

test('Vector Clash compiler emits a real arena combat loop with ranges, dodge, skill cooldown and rounds',()=>{
  const baseline={gameSeedId:'SEED-ROBLOX-BATTLEGROUND_FIGHTING_SHOOTER-001',content:{identity:'Vector Clash',coreFun:'combat, opponent, skill, cooldown',coreLoop:['read opponent movement and create an attack opening','damage opponents and reposition around cooldowns','finish rounds and re-enter with a changed tactical choice'],mobileUx:'touch controls'}};
  const inventory=deriveApprovedScopeInventory(baseline);
  const compiled=buildContractSafePlayable({gameId:'seed-roblox-battleground-fight-welcome-to-bloxburg',gameName:'Vector Clash',baseline});
  const contract=validateBootstrapHtml(compiled.html,{scopeInventory:inventory});
  assert.equal(compiled.generationMode,'GENRE_SPECIFIC_REAL_IMPLEMENTATION');
  assert.equal(contract.pass,true,contract.blockers.join(','));
  assert.ok(contract.bytes>=12000);
  assert.ok(contract.scriptBytes>=6000);
  assert.ok(contract.mechanicCount>=5);
  assert.match(compiled.html,/data-mechanic-id="basic-attack"/);
  assert.match(compiled.html,/data-mechanic-id="timed-dodge"/);
  assert.match(compiled.html,/data-mechanic-id="vector-burst"/);
  assert.match(compiled.html,/data-mechanic-id="distance-control"/);
  assert.match(compiled.html,/state\.distance/);
  assert.match(compiled.html,/state\.skillCd/);
  assert.match(compiled.html,/state\.wins/);
  assert.match(compiled.html,/enemyPlan\(\)/);
  assert.match(compiled.html,/data-session-proof-mode="PROGRESSION_MILESTONES"/);
  assert.doesNotMatch(compiled.html,/<button\b[^>]*data-session-stage=/i);
  assert.doesNotMatch(compiled.html,/scope-control-/i);
});

test('existing shared real game is preserved, inlined and rebound to approved scope before compiler fallback',async()=>{
  const baseline={gameSeedId:'SEED-SINGLE_DEFENSE_STRATEGY-001',content:{identity:'Celestial Bastion',coreFun:'defend the celestial core with tower placement and wave adaptation',coreLoop:['place towers against the threatened route','earn resources and upgrade the defense','adapt to enemy waves and clear the final threat'],mobileUx:'touch-first tower defense controls'}};
  const inventory=deriveApprovedScopeInventory(baseline);
  assert.equal(inventory.length,5);
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'web-preserve-'));
  const candidate=path.join(temp,'candidate');
  try{
    const built=await buildFirstPlayable({gameId:'seed-single-defense-strat-celestial-bastion',gameName:'Celestial Bastion',baseline,sourcePath:'web-games/seed-single-defense-strat-celestial-bastion',candidatePath:candidate,candidateId:'preserve-test',sourceCommit:'test',model:'none'});
    const html=fs.readFileSync(path.join(candidate,'index.html'),'utf8');
    assert.equal(built.generation.sourcePreserved,true);
    assert.equal(built.result.generationMode,'SOURCE_PRESERVED_REAL_GAME');
    assert.equal(built.review.pass,true,built.review.blockers.join(','));
    assert.equal(validatePreservedSourceHtml(html,{scopeInventory:inventory}).pass,true);
    assert.ok(Buffer.byteLength(html,'utf8')>=12000);
    assert.match(html,/localStorage/);
    assert.match(html,/data-session-proof-mode="PROGRESSION_MILESTONES"/);
    assert.match(html,/data-audio-control="mute"/);
    assert.match(html,/data-audio-control="volume"/);
    assert.doesNotMatch(html,/src="\/web-games\/_shared\/vibe2-final\.js"/);
    assert.doesNotMatch(html,/scope-control-/);
    for(const scope of inventory)assert.match(html,new RegExp(`data-scope-id="${scope.id}"`));
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('unfinished deterministic genres fail closed instead of receiving the old generic game shell',()=>{
  const baseline={gameSeedId:'SEED-ROBLOX-SURVIVAL_HORROR_ESCAPE-001',content:{identity:'Last Lantern',coreFun:'survive and escape',coreLoop:['explore','avoid threat','escape'],mobileUx:'touch controls'}};
  assert.throws(()=>buildContractSafePlayable({gameId:'seed-roblox-survival-horror-es-doors',gameName:'Last Lantern',baseline}),/GENRE_REAL_IMPLEMENTATION_NOT_READY:SURVIVAL_HORROR_ESCAPE/);
});

test('canonical Web bootstrap keeps Vibe2 as primary developer while deterministic fallbacks remain fail-closed',()=>{
  const source=fs.readFileSync('tools/company-development-web-bootstrap.mjs','utf8');
  assert.match(source,/VIBE2_PRIMARY_MODEL_IMPLEMENTATION/);
  assert.match(source,/VIBE2_PRIMARY_DEVELOPER=YES/);
  assert.match(source,/await ensureLocalVibeRuntime\(model\)/);
  assert.match(source,/await buildVibePlayable\(/);
  assert.match(source,/MODEL_USED='\+\(generation\.modelUsed\?'YES':'NO'\)/);
  assert.match(source,/GENRE_REAL_IMPLEMENTATION_NOT_READY/);
});

test('legacy frozen implementation context may recover only from the exact canonical game and seed record',()=>{
  const source=fs.readFileSync('tools/company-strict-production-review.mjs','utf8');
  assert.match(source,/clean\(row\?\.gameId\)===gameId&&clean\(row\?\.seedId\)===seedId/);
  assert.match(source,/historical\?\.GAME_CATEGORY/);
  assert.match(source,/historical\?\.INITIAL_TARGET_PLATFORM/);
  assert.match(source,/cycleSeedId!==seedId/);
  assert.match(source,/FROZEN_DESIGN_BASELINE\+CANONICAL_SEED_RECORD/);
});
