import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {migrateDirectNativeRuntime} from '../tools/company-direct-native-design-migration.mjs';
import {evaluateMinimumDesignContract,materializeVibeMinimumDesign} from '../tools/company-minimum-design-contract.mjs';

// Exercise the actual current verified-policy contract; never substitute a stub.
const previousVerifiedPolicyPath=process.env.COMPANY_VERIFIED_POLICY_PATH;
test.before(()=>{process.env.COMPANY_VERIFIED_POLICY_PATH=path.resolve('company-learning/platform-release-roadmap.json');});
test.after(()=>{if(previousVerifiedPolicyPath===undefined)delete process.env.COMPANY_VERIFIED_POLICY_PATH;
  else process.env.COMPANY_VERIFIED_POLICY_PATH=previousVerifiedPolicyPath;});

const base=()=>({
  content:{
    identity:'A distinct survival RPG with a persistent village and dangerous expeditions.',
    coreFun:'Choose routes, fight enemies, extract resources, and improve the next expedition.',
    coreLoop:['prepare loadout','enter dangerous region','fight and collect','return and upgrade'],
    signatureSystems:[
      {name:'Risk Route',purpose:'Choose danger for better rewards',playerChoice:'safe or dangerous path'},
      {name:'Loadout Growth',purpose:'Trade resources for stronger future runs',playerChoice:'weapon or survival upgrade'}
    ],
    progressionDirection:'Persistent character and village growth unlock harder regions and more build choices.',
    failureRetryRisk:{failureStates:['player defeat','failed extraction'],retryFlow:'return and rebuild',riskPressure:'deeper regions increase enemy pressure',recoveryRules:'saved upgrades remain'},
    multiplayerMode:'COOP',
    technicalAssumptions:['authoritative gameplay state is separated from presentation','save schema meaning stays stable across platform implementations'],
    platformProfiles:{
      ROBLOX:{
        platform:'ROBLOX',inputModel:'keyboard gamepad and Roblox mobile controls',sessionModel:'social drop-in sessions with fast joins',multiplayerRuntime:'server authoritative Roblox replication',performanceBudget:'mobile Roblox performance budget with bounded effects',uiUx:'Roblox HUD with touch safe areas and social prompts',saveAndNetwork:'DataStore backed save and server validated remotes',platformContentAdaptation:'Roblox social sessions and avatar scale adaptation',internalReleaseTarget:'Private or restricted Roblox experience for owner playtest',validationEvidence:'published private place plus runtime QA and independent regression evidence'
      },
      UNITY:{
        platform:'UNITY',inputModel:'Unity Input System touch gamepad and keyboard',sessionModel:'mobile app sessions with suspend and resume handling',multiplayerRuntime:'app network transport only when multiplayer is enabled',performanceBudget:'Android memory GPU thermal and battery budget',uiUx:'safe-area responsive Unity UI and touch-first controls',saveAndNetwork:'versioned local save plus validated backend sync when needed',platformContentAdaptation:'scene prefab and mobile app lifecycle adaptation',internalReleaseTarget:'internal or closed Android test build',validationEvidence:'install launch runtime QA independent QA and regression evidence'
      }
    }
  }
});

test('all-game policy rejects SINGLE even when minimum design fields are otherwise complete',()=>{
  const record=base();
  record.content.multiplayerMode='SINGLE';
  const verdict=evaluateMinimumDesignContract(record);
  assert.equal(verdict.pass,false);
  assert.ok(verdict.blockers.includes('MINIMUM_MULTIPLAYER_DESIGN_EXTENSION_REQUIRED'));
  const coop=evaluateMinimumDesignContract(base());
  assert.equal(coop.blockers.includes('MINIMUM_MULTIPLAYER_DESIGN_EXTENSION_REQUIRED'),false);
});


test('minimum design requires common core and Roblox when Unity is owner held',()=>{
  const gate=evaluateMinimumDesignContract(base());
  assert.equal(gate.pass,true);
  assert.equal(gate.platformProfiles.ROBLOX,true);
  assert.equal(gate.platformProfiles.UNITY,true);
  assert.equal(gate.platformProfiles.distinct,true);
  assert.equal(gate.platformProfiles.unityRequired,false);
});

test('owner-held Unity is optional but Roblox profile is mandatory',()=>{
  const missing=base();delete missing.content.platformProfiles.UNITY;
  assert.equal(evaluateMinimumDesignContract(missing).pass,true);
  const noRoblox=base();delete noRoblox.content.platformProfiles.ROBLOX;
  assert.equal(evaluateMinimumDesignContract(noRoblox).pass,false);
  const copied=base();copied.content.platformProfiles.UNITY={...copied.content.platformProfiles.ROBLOX};
  copied.content.platformProfiles.UNITY.platform='UNITY';
  assert.equal(evaluateMinimumDesignContract(copied).pass,true);
  copied.content.platformProfiles.UNITY={...copied.content.platformProfiles.ROBLOX};
  assert.equal(evaluateMinimumDesignContract(copied).pass,true);
});


test('detailed multiplayer label may use canonical Roblox play mode without weakening the minimum gate',()=>{
  const detailed=base();
  detailed.content.multiplayerMode='COOP_WITH_BOSS_COMPANIONS';
  detailed.content.robloxBuildProfile={playMode:'COOP'};
  assert.equal(evaluateMinimumDesignContract(detailed).pass,true);

  const competitive=base();
  competitive.content.multiplayerMode='FOUR_VS_FOUR_INFECTION_WITH_AI_FILL';
  competitive.content.robloxBuildProfile={playMode:'COMPETITIVE'};
  assert.equal(evaluateMinimumDesignContract(competitive).pass,true);

  const invalid=base();
  invalid.content.multiplayerMode='CUSTOM_UNCLASSIFIED_MODE';
  invalid.content.robloxBuildProfile={playMode:'CUSTOM'};
  assert.equal(evaluateMinimumDesignContract(invalid).pass,false);
});


test('Vibe minimum design materializes one truthful development input without inventing strict QA evidence',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-minimum-source-grounded-'));
  const seed={
    gameId:'bug-defense',seedId:'OWNER-DEFENSE',status:'ACTIVE',
    DISTINCT_IDENTITY:'곤충 종류와 배치 전략이 매 웨이브마다 변하는 30웨이브 수비 게임',
    CORE_LOOP:['다가오는 곤충 웨이브를 확인한다','제한된 자원을 사용해 방어 유닛을 배치한다','웨이브를 방어하고 다음 선택을 준비한다'],
    CORE_FUN_TO_LEARN:['웨이브별 곤충 상성','방어 유닛 배치 선택'],
    MULTIPLAYER_DESIGN_MODE:'COOP',SAVE_POLICY:'KEEP_EXISTING_SAVE_KEYS',
    TARGET_SESSION_MINUTES:30,
    GAMEPLAY_SKETCH:{
      flowArchitecture:{systemBlueprint:{requiredSystems:[
        {id:'DEFENSE_PLACEMENT',purpose:'배치와 사거리·타깃 선택에 따라 전투 결과가 달라진다'},
        {id:'WAVE_ENCOUNTER',purpose:'웨이브 구성과 곤충의 행동 방식에 따라 위험이 달라진다'}
      ]}},
      progressionLayers:['웨이브마다 유효한 전략과 위치 선택의 폭이 확장된다']
    }
  };
  try{
    const result=materializeVibeMinimumDesign({root,seed,catalogGame:{description:'30웨이브 곤충 디펜스'},date:'2026-10-10'});
    assert.equal(result.created,true);
    assert.equal(result.gate.pass,true);
    const record=JSON.parse(fs.readFileSync(path.join(root,result.file),'utf8'));
    assert.equal(record.authorRole,'VIBE2_MINIMUM_DESIGN_PREPARATION');
    assert.equal(record.strictDesignPass,false);
    assert.equal(record.runtimePass,false);
    assert.equal(record.independentQaPass,false);
    assert.equal(record.releasePass,false);
    assert.equal(record.content.multiplayerMode,'COOP');
    assert.deepEqual(record.content.coreLoop,seed.CORE_LOOP);
    assert.equal(record.content.coreNumbersAndBalance.inventedNumericValues,false);
    assert.equal(record.content.saveMeaning,'KEEP_EXISTING_SAVE_KEYS');
    assert.deepEqual(record.content.signatureSystems.map(row=>row.id),['DEFENSE_PLACEMENT','WAVE_ENCOUNTER']);
    assert.equal(materializeVibeMinimumDesign({root,seed,date:'2026-10-10'}).created,false);
    assert.equal(evaluateMinimumDesignContract(record).pass,true);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Vibe minimum authoring rejects empty creative intake and never overrides an existing design file',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-minimum-reject-'));
  try{
    const seed={gameId:'demo',status:'ACTIVE',CORE_LOOP:['a','b','c'],DISTINCT_IDENTITY:'단순 입력만 존재하는 미완성 설계 요청'};
    assert.equal(materializeVibeMinimumDesign({root,seed,date:'2026-10-10'}).created,false);
    const target=path.join(root,'design/demo/2026-10-10/design-revised.json');
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,JSON.stringify({status:'DESIGNER_AUTHORED_CANDIDATE',content:{identity:'owner authored'}}));
    assert.equal(materializeVibeMinimumDesign({root,seed,date:'2026-10-10'}).created,false);
    assert.equal(JSON.parse(fs.readFileSync(target,'utf8')).status,'DESIGNER_AUTHORED_CANDIDATE');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('an owner brief marked for V5 cannot enter Vibe development with a legacy minimum design',()=>{
  const design=base();
  const ownerSeed={GAMEPLAY_SKETCH:{version:1},novelGrammarBackfill:{version:5,authoringPending:true}};
  const verdict=evaluateMinimumDesignContract(design,{seed:ownerSeed});
  assert.equal(verdict.pass,false);
  assert.equal(verdict.creativeGrammarReady,false);
  assert.ok(verdict.blockers.some(code=>code.startsWith('DESIGN_MAIN_A_B')||code.startsWith('DESIGN_C_')));
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'owner-brief-v5-minimum-'));
  try{
    const seed={...ownerSeed,gameId:'owner-brief',seedId:'original',status:'ACTIVE',
      DISTINCT_IDENTITY:'오너 원본과 기존 저장을 유지하는 게임',
      CORE_LOOP:['원본 선택','원본 상태 변화','원본 결과'],MULTIPLAYER_DESIGN_MODE:'SINGLE'};
    const result=materializeVibeMinimumDesign({root,seed,date:'2026-10-10'});
    assert.equal(result.created,false);
    assert.equal(result.reason,'DESIGN_GRAMMAR_DESIGNER_SEED_PENDING');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});


// 회귀: 레거시 변환에서도 원본 문법과 게임별 B 참조 검증을 보존한다.
test('legacy migration cannot reapprove a standard design by dropping its seed',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'native-design-contract-'));
  const source='design/cozy-island/2026-10-20/design-revised.json';
  const record=base();
  record.content.creativeGrammar={standardVersion:1,a:{system:'old A'},b:{system:'old B'}};
  const previous=process.env.COMPANY_VERIFIED_DESIGN_POLICY_PATH;
  process.env.COMPANY_VERIFIED_DESIGN_POLICY_PATH=path.resolve('company-learning/platform-release-roadmap.json');
  try{
    const noSeed=evaluateMinimumDesignContract(record);
    assert.equal(noSeed.pass,false);
    assert.ok(noSeed.blockers.includes('DESIGN_A_NAMED_REFERENCE_GAME_REQUIRED'));
    const put=(file,value)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),JSON.stringify(value));};
    put(source,record);
    const original=fs.readFileSync(path.join(root,source),'utf8');
    put('development-queue.json',{items:[{gameId:'cozy-island',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',designBaselineSource:source}]});
    put('game-seed-state.json',{seeds:[{gameId:'cozy-island',novelGrammarBackfill:{version:5},B_SYSTEM_REFERENCE:{scope:'B_EXISTING_GAME_SYSTEMS',systemFamily:'직접 채집',playerChoice:'월드 노드에서 직접 상호작용한다',source:'design/cozy-island/2026-09-22/design-revised.json'}}]});
    put('autonomous-portfolio.json',{projects:[]});put('game-catalog.json',{games:[]});
    const result=migrateDirectNativeRuntime(root);
    assert.equal(result.blocked.length,1);
    assert.ok(result.blocked[0].blockers.includes('DESIGN_B_EXISTING_SYSTEM_BASELINE_REQUIRED'));
    assert.equal(result.alreadyReady.includes('cozy-island'),false);
    assert.equal(fs.readFileSync(path.join(root,source),'utf8'),original);
  }finally{
    if(previous===undefined)delete process.env.COMPANY_VERIFIED_DESIGN_POLICY_PATH;else process.env.COMPANY_VERIFIED_DESIGN_POLICY_PATH=previous;
    fs.rmSync(root,{recursive:true,force:true});
  }
});
