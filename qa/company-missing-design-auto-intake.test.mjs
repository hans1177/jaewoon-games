import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {autoEnrollMissingDesignSeeds,latestUsableDesign,makeAutoMissingDesignSeed,CANONICAL_NOVEL_GRAMMAR_V5_SOURCE} from '../tools/company-all-games-design-reset.mjs';
import {validateGameSeed} from '../tools/company-game-seed-contract.mjs';

function tempRepo(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'missing-design-intake-'));
  fs.writeFileSync(path.join(root,'game-catalog.json'),JSON.stringify({
    games:[
      {id:'needs-design',name:'Needs Design',description:'월드에서 적을 상대하고 보상으로 다음 지역을 여는 액션 게임',genre:['액션','성장'],lifecycleState:'ACTIVE',selectedPlatform:'ROBLOX',multiplayerSupported:true},
      {id:'already-designed',name:'Already Designed',description:'existing',genre:['RPG'],lifecycleState:'ACTIVE',selectedPlatform:'UNITY'},
      {id:'retired',name:'Retired',description:'retired',genre:['CASUAL'],lifecycleState:'RETIRED',selectedPlatform:'ROBLOX'}
    ],
    permanentRemovalPolicy:{ids:[]}
  },null,2));
  fs.writeFileSync(path.join(root,'game-seed-state.json'),JSON.stringify({version:2,seeds:[]},null,2));
  const designDir=path.join(root,'design','already-designed','2026-09-25');
  fs.mkdirSync(designDir,{recursive:true});
  fs.writeFileSync(path.join(designDir,'design-revised.json'),JSON.stringify({gameId:'already-designed',content:{identity:'충분히 구체적인 기존 게임 정체성',coreFun:'실제 입력과 선택이 이어지는 핵심 재미',coreLoop:['입력한다','상태가 변한다','다음 목표로 간다']}},null,2));
  return root;
}

test('owner design reset stages every relative module before switching to the runtime branch',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/owner-all-games-design-reset.yml',import.meta.url),'utf8');
  const switchIndex=workflow.indexOf('git checkout -B owner-all-games-design-reset-runtime');
  const resetCopyIndex=workflow.indexOf('cp tools/company-all-games-design-reset.mjs /tmp/company-all-games-design-reset.mjs');
  const contractCopyIndex=workflow.indexOf('cp tools/company-game-seed-contract.mjs /tmp/company-game-seed-contract.mjs');
  const bootstrapCopyIndex=workflow.indexOf('cp tools/company-game-seed-bootstrap.mjs /tmp/company-game-seed-bootstrap.mjs');
  const seedStateCopyIndex=workflow.indexOf('cp tools/game-seed-state.mjs /tmp/game-seed-state.mjs');
  const profileCopyIndex=workflow.indexOf('cp tools/game-seed-platform-profile.mjs /tmp/game-seed-platform-profile.mjs');
  const flowArchitectCopyIndex=workflow.indexOf('cp tools/company-vibe2-game-flow-architect.mjs /tmp/company-vibe2-game-flow-architect.mjs');
  assert.ok(resetCopyIndex>0&&resetCopyIndex<switchIndex);
  assert.ok(contractCopyIndex>resetCopyIndex&&contractCopyIndex<switchIndex);
  assert.ok(bootstrapCopyIndex>contractCopyIndex&&bootstrapCopyIndex<switchIndex);
  assert.ok(seedStateCopyIndex>bootstrapCopyIndex&&seedStateCopyIndex<switchIndex);
  assert.ok(profileCopyIndex>seedStateCopyIndex&&profileCopyIndex<switchIndex);
  assert.ok(flowArchitectCopyIndex>profileCopyIndex&&flowArchitectCopyIndex<switchIndex);
  assert.match(workflow,/- 'tools\/company-game-seed-contract\.mjs'/);
  assert.doesNotMatch(workflow,/- 'tools\/company-all-games-design-reset\.mjs'/);
});

test('owner design reset fetches only the two refs required by the runtime handoff',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/owner-all-games-design-reset.yml',import.meta.url),'utf8');
  assert.match(workflow,/fetch-depth: 1/);
  assert.doesNotMatch(workflow,/fetch-depth: 0/);
  assert.match(workflow,/git fetch --depth=1 origin/);
  assert.match(workflow,/"main:refs\/remotes\/origin\/main"/);
  assert.match(workflow,/"\$COMPANY_RUNTIME_BRANCH:refs\/remotes\/origin\/\$COMPANY_RUNTIME_BRANCH"/);
});

test('active game without design receives one canonical GAME_SEED intake and is idempotent',()=>{
  const root=tempRepo();
  try{
    const first=autoEnrollMissingDesignSeeds({root,timestamp:'2026-09-25T00:00:00Z'});
    // MAIN 소재만 있는 과거 설계는 재사용하지 않고 새 씨앗을 작성 대상으로 올린다.
    assert.deepEqual(first.created,['needs-design','already-designed']);
    assert.deepEqual(first.designPresent,[]);
    const state=JSON.parse(fs.readFileSync(path.join(root,'game-seed-state.json'),'utf8'));
    assert.equal(state.seeds.length,2);
    const seed=state.seeds.find(row=>row.gameId==='needs-design');
    assert.equal(seed.gameId,'needs-design');
    assert.equal(seed.generation,'AUTO_MISSING_DESIGN_INTAKE');
    assert.equal(seed.status,'ACTIVE');
    assert.equal(validateGameSeed(seed).pass,false);
    assert.equal(seed.novelGrammarBackfill.authoringPending,true);
    assert.equal(seed.MULTIPLAYER_DESIGN_MODE,'HYBRID');
    assert.equal(seed.GAMEPLAY_SKETCH.version,5);
    assert.equal(seed.GAMEPLAY_SKETCH.novelGameGrammar.gameplaySystemFusion.formula,'MAIN × A × B × C');
    assert.equal(seed.GAMEPLAY_SKETCH.novelGameGrammar.delveLayer.formulaSuffix,'+ @');
    assert.equal(seed.GAMEPLAY_SKETCH.novelGameGrammar.emergentGenre.grammarFormula,'MAIN × A × B × C + @');

    const second=autoEnrollMissingDesignSeeds({root,timestamp:'2026-09-25T00:01:00Z'});
    assert.equal(second.created.length,0);
    assert.deepEqual(second.alreadySeeded,['needs-design','already-designed']);
    assert.deepEqual(second.grammarPending,['needs-design','already-designed']);
    assert.equal(second.changed,0);
    const state2=JSON.parse(fs.readFileSync(path.join(root,'game-seed-state.json'),'utf8'));
    assert.equal(state2.seeds.length,2);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('targeted canonical intake keeps usable design evidence and creates the required GAME_SEED when missing',()=>{
  const root=tempRepo();
  try{
    assert.equal(latestUsableDesign(root,'already-designed'),null);
    const result=autoEnrollMissingDesignSeeds({root,gameId:'already-designed'});
    assert.deepEqual(result.created,['already-designed']);
    assert.deepEqual(result.designPresent,[]);
    const state=JSON.parse(fs.readFileSync(path.join(root,'game-seed-state.json'),'utf8'));
    const seed=state.seeds.find(row=>row.gameId==='already-designed');
    assert.equal(seed.GAMEPLAY_SKETCH.version,5);
    assert.equal(validateGameSeed(seed).pass,false);
    assert.equal(seed.novelGrammarBackfill.authoringPending,true);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});


test('active canonical games stage V5 authored grammar without recycling legacy game designs',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'canonical-grammar-backfill-'));
  try{
    const legacyGame={
      id:'legacy-active',name:'Legacy Active',description:'적을 상대하고 보상으로 다음 지역을 여는 생존 액션 게임',
      genre:['생존','액션'],lifecycleState:'ACTIVE',selectedPlatform:'ROBLOX'
    };
    const currentGame={
      id:'current-active',name:'Current Active',description:'보드 위 선택이 다음 판면 상태를 바꾸는 전략 게임',
      genre:['보드','전략'],lifecycleState:'ACTIVE',selectedPlatform:'UNITY'
    };
    fs.writeFileSync(path.join(root,'game-catalog.json'),JSON.stringify({games:[legacyGame,currentGame],permanentRemovalPolicy:{ids:[]}},null,2));
    const legacy=makeAutoMissingDesignSeed(legacyGame,{timestamp:'2026-10-06T00:00:00Z'});
    legacy.GAMEPLAY_SKETCH={version:1,source:'LEGACY',worldModel:'기존 생존 월드',actors:['플레이어','적'],interactionChains:['입력 -> 상태 변화'],stateMachine:['START','INPUT','ACTION','CHANGE','GOAL'],firstPlayableCycle:['입장','입력','행동','변화','위험','목표'],expansionPlan:['적','지역','상호작용'],longGoalScenario:['초기','중기','장기'],validationRisks:['겉구현 금지','반복 금지']};
    const current=makeAutoMissingDesignSeed(currentGame,{timestamp:'2026-10-06T00:00:00Z'});
    fs.writeFileSync(path.join(root,'game-seed-state.json'),JSON.stringify({version:2,seeds:[legacy,current]},null,2));

    const result=autoEnrollMissingDesignSeeds({root,timestamp:'2026-10-07T07:00:00Z'});
    assert.deepEqual(result.canonicalTargets,['legacy-active','current-active']);
    assert.deepEqual(result.grammarUpgraded,['legacy-active']);
    assert.deepEqual(result.grammarAlreadyCurrent,[]);
    assert.deepEqual(result.grammarPending,['current-active']);

    const state=JSON.parse(fs.readFileSync(path.join(root,'game-seed-state.json'),'utf8'));
    const upgraded=state.seeds.find(row=>row.gameId==='legacy-active');
    const untouched=state.seeds.find(row=>row.gameId==='current-active');
    assert.equal(upgraded.GAMEPLAY_SKETCH.version,5);
    assert.equal(upgraded.GAMEPLAY_SKETCH.novelGameGrammar.gameplaySystemFusion.formula,'MAIN × A × B × C');
    assert.equal(upgraded.GAMEPLAY_SKETCH.novelGameGrammar.delveLayer.formulaSuffix,'+ @');
    assert.equal(upgraded.novelGrammarBackfill.source,CANONICAL_NOVEL_GRAMMAR_V5_SOURCE);
    assert.equal(upgraded.designEvolutionSignals.at(-1).source,'CANONICAL_GAME_SEED');
    assert.equal(untouched.novelGrammarBackfill.authoringPending,true);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('canonical design intake does not depend on homepage web exposure fields',()=>{
  const source=fs.readFileSync(new URL('../tools/company-all-games-design-reset.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/homepageWebPlayable|homepageWebDesignTarget|CURRENT_HOMEPAGE_WEB_GAME|HOMEPAGE_NOVEL_GRAMMAR/);
  assert.match(source,/CANONICAL_OWNER_MAIN_A_B_C_UNBOUNDED_DELVE_20261009/);
});
