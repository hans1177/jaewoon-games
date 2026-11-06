import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {
  normalizeSeedState,ensureSeedMaterialPool,composeSeedMaterials,consumeSeedMaterials,
  SEED_MATERIAL_POOL_TARGET,SEED_MATERIAL_SOURCE_FAMILIES
} from '../tools/game-seed-state.mjs';
import {validateGameSeed,GAME_SEED_POLICY} from '../tools/company-game-seed-contract.mjs';
import {buildGameFlowArchitecture} from '../tools/company-vibe2-game-flow-architect.mjs';

test('seed material pool stays at 100 and material is not a game',()=>{
  const state=normalizeSeedState({seeds:[]});
  ensureSeedMaterialPool(state,{timestamp:'2026-09-13T00:00:00Z'});
  assert.equal(SEED_MATERIAL_POOL_TARGET,100);
  assert.equal(state.seedMaterialPolicy.materialIsGame,false);
  assert.equal(state.seedMaterials.filter(x=>x.status==='AVAILABLE').length,100);
  assert.equal(new Set(state.seedMaterials.map(x=>x.sourceFamily)).size,SEED_MATERIAL_SOURCE_FAMILIES.length);
  const selected=composeSeedMaterials(state,{count:3});
  assert.equal(selected.length,3);
  consumeSeedMaterials(state,selected,{seedId:'SEED-TEST'});
  assert.ok(state.seedMaterials.filter(x=>x.status==='AVAILABLE'||x.status==='RESERVED').length>=100);
});

test('new game seed contract requires 30 minute target and multiplayer decision',()=>{
  const seed={
    GAME_CATEGORY:'CASUAL',REFERENCE_INPUTS:[{type:'ORIGINAL_MATERIAL',value:'weather'}],REFERENCE_GAMES:[],
    CORE_FUN_TO_LEARN:['risk/reward choice'],CORE_LOOP:['행동하고 즉시 결과를 확인한다','보상으로 다음 선택을 고른다','선택으로 상황이 변하고 다시 행동한다'],
    DISTINCT_IDENTITY:'A sufficiently distinct original identity that combines weather, routing, and cooperative decisions into its own world and progression.',
    MARKET_EVIDENCE_SUMMARY:{role:'TARGET_DESIGN_REFERENCE'},TARGET_AUDIENCE:'Global players',
    TARGET_SESSION_DIRECTION:'0~5분 이해, 5~15분 핵심루프, 15~25분 변주, 25~30분 중간목표',TARGET_SESSION_MINUTES:30,
    INITIAL_TARGET_PLATFORM:'ROBLOX',INITIAL_PLAY_MODE:'PROJECT_DEFINED',MULTIPLAYER_DESIGN_MODE:'COOP',CROSS_PLATFORM_EXPANSION_VALUE:'POSSIBLE'
  };
  assert.equal(GAME_SEED_POLICY.targetSessionMinutes,30);
  assert.equal(validateGameSeed(seed).pass,true);
  assert.equal(validateGameSeed({...seed,TARGET_SESSION_MINUTES:10}).pass,false);
  assert.equal(validateGameSeed({...seed,MULTIPLAYER_DESIGN_MODE:'LATER'}).pass,false);
});

test('semantic quality gate rejects structurally valid but shallow v2 sketches',()=>{
  const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),'seed-v2-quality-'));
  try{
    const state=normalizeSeedState({seeds:[]});
    ensureSeedMaterialPool(state,{timestamp:'2026-10-04T00:00:00Z'});
    const flowArchitecture=buildGameFlowArchitecture({
      gameId:'semantic-shallow-v2',
      genre:'CASUAL',
      baseline:{content:{
        identity:'A route-based original casual prototype with observable state changes.',
        playerFantasy:'Choose routes and actions to change the world.',
        coreFun:'Make choices and observe results.',
        coreLoop:['choose a route and act','observe the changed state and reward','choose the next route based on risk'],
        progressionDirection:'Open more routes and decisions over time.'
      }},
      inventory:[]
    });
    const seed={
      seedId:'SEED-SEMANTIC-SHALLOW-V2',
      gameId:'semantic-shallow-v2',
      gameName:'Semantic Shallow V2',
      status:'ACTIVE',
      generation:'TEST',
      GAME_CATEGORY:'CASUAL',
      REFERENCE_INPUTS:[{type:'ORIGINAL_MATERIAL',value:'route choices'}],
      CORE_FUN_TO_LEARN:['read a route and choose an action with observable consequences'],
      CORE_LOOP:[
        '현재 경로와 목표를 확인하고 실제 이동 행동을 선택한다.',
        '입력 결과로 월드 상태와 보상 상태가 바뀌는 것을 확인한다.',
        '바뀐 상태를 기준으로 다음 경로와 행동을 다시 선택한다.'
      ],
      DISTINCT_IDENTITY:'A distinct original casual route game where player actions visibly change later route options and rewards.',
      GAMEPLAY_SKETCH:{
        version:2,
        worldModel:'Player actions change route states and later choices in a playable world.',
        actors:['player chooses a route','world state records the choice'],
        interactionChains:['choose route -> act -> state changes -> reward changes'],
        stateMachine:['ENTRY','INPUT','ACTION','STATE_CHANGE','REWARD','RISK','GOAL'],
        firstPlayableCycle:['enter','choose','act','observe','receive','risk','continue'],
        playerPromise:'Repeat the same shallow action while numbers gradually become larger over time.',
        funDrivers:['numbers go up','rewards get larger','levels get higher'],
        balanceRules:['bigger numbers','more health','more attack','higher level'],
        pacingPlan:{
          first5Minutes:'repeat phase one',
          minutes5To15:'repeat phase two',
          minutes15To25:'repeat phase three',
          minutes25To30:'repeat phase four',
          midLateGame:'repeat phase five',
          replayMotivation:'repeat phase six'
        },
        progressionLayers:['more level','more number','more power'],
        expansionPlan:['체력 배수 2','공격력 배수 3','데미지 배수 4','레벨 수치 5'],
        longGoalScenario:['repeat early','repeat middle','repeat late'],
        completionCriteria:['finish one','finish two','finish three','finish four'],
        codingGrowthHooks:['code one','code two','code three','code four'],
        validationRisks:['avoid crash','avoid missing file'],
        flowArchitecture
      },
      MARKET_EVIDENCE_SUMMARY:{targetMarketScope:'GLOBAL',hardPassFailGate:false,marketDataAloneCannotDiscard:true},
      TARGET_AUDIENCE:'Global casual players',
      TARGET_SESSION_DIRECTION:'30 minutes of meaningful route and state progression',
      TARGET_SESSION_MINUTES:30,
      INITIAL_TARGET_PLATFORM:'ROBLOX',
      INITIAL_PLAY_MODE:'PROJECT_DEFINED',
      MULTIPLAYER_DESIGN_MODE:'SINGLE',
      CROSS_PLATFORM_EXPANSION_VALUE:'POSSIBLE'
    };
    assert.equal(validateGameSeed(seed).pass,true);
    state.seeds.push(seed);
    const stateFile=path.join(tempDir,'state.json');
    const evidenceFile=path.join(tempDir,'evidence.json');
    fs.writeFileSync(stateFile,JSON.stringify(state));
    fs.writeFileSync(evidenceFile,JSON.stringify({targetMarketScope:'GLOBAL',categories:{}}));
    const result=spawnSync(process.execPath,['tools/company-game-seed-quality-gate.mjs'],{
      cwd:process.cwd(),
      env:{...process.env,GAME_SEED_STATE_FILE:stateFile,GAME_SEED_MARKET_EVIDENCE_FILE:evidenceFile},
      encoding:'utf8'
    });
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/v2-fun-driver-coverage|v2-balance-rule-coverage|v2-expansion-stat-only-forbidden/);
  }finally{
    fs.rmSync(tempDir,{recursive:true,force:true});
  }
});

