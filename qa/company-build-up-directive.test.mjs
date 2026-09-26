import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  BUILD_UP_DOMAINS,
  HOLISTIC_CORE_DOMAINS,
  VISUAL_DOMAINS,
  buildGameSpecificBuildUpDirective,
  directivePrompt,
  inspectGameSources
} from '../tools/company-build-up-directive.mjs';

function design(){
  return {
    content:{
      identity:'곤충의 생태 상성과 서식지 배치가 핵심인 정원 방어 게임',
      coreFun:'포식자 곤충의 역할과 적 해충의 특성을 읽고 배치 선택을 바꾸는 재미',
      coreLoop:['적 조합 확인','곤충 배치','실시간 전투 관찰','자원 획득','진화와 다음 웨이브 준비'],
      signatureSystems:[
        {name:'서식지 상성',purpose:'배치 위치에 의미를 만든다',playerChoice:'어떤 곤충을 어떤 서식지에 배치할지 선택'},
        {name:'포식 관계',purpose:'적 조합에 따라 정답이 달라진다',playerChoice:'현재 웨이브에 맞는 포식자를 선택'}
      ],
      progressionDirection:'새 곤충과 진화를 해금해 더 복잡한 웨이브 조합을 상대한다',
      multiplayerMode:'SINGLE',
      platformProfiles:{
        ROBLOX:{platform:'ROBLOX'},
        UNITY:{platform:'UNITY'}
      }
    }
  };
}

test('game-specific directive covers the whole game and all visual domains',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'build-up-directive-'));
  fs.mkdirSync(path.join(root,'roblox-games','bug-defense','server'),{recursive:true});
  fs.mkdirSync(path.join(root,'unity-games','bug-defense','Assets','Scripts'),{recursive:true});
  fs.writeFileSync(path.join(root,'roblox-games','bug-defense','server','Game.server.luau'),
    'local damage=10\nfunction attack(enemy) enemy.Health -= damage end\n');
  fs.writeFileSync(path.join(root,'unity-games','bug-defense','Assets','Scripts','GameCore.cs'),
    'class GameCore { void Save(){} void Reward(){} void Wave(){} }\n');
  const sourceObservation=inspectGameSources({
    repoRoot:root,
    sourceRoots:['roblox-games/bug-defense','unity-games/bug-defense']
  });
  const directive=buildGameSpecificBuildUpDirective({
    gameId:'bug-defense',
    gameName:'곤충 디펜스',
    designRecord:design(),
    sourceObservation,
    responsibleFiles:['roblox-games/bug-defense/server/Game.server.luau']
  });
  assert.equal(directive.gameId,'bug-defense');
  assert.equal(directive.version,2);
  assert.equal(directive.generation,1);
  assert.equal(directive.coverage.allDomainsConsidered,true);
  assert.equal(directive.qualityGapMap.length,BUILD_UP_DOMAINS.length);
  assert.deepEqual(directive.coverage.allowedStates,['PASS','GAP','NOT_APPLICABLE']);
  assert.deepEqual([...directive.coverage.holisticCoreDomains],[...HOLISTIC_CORE_DOMAINS]);
  assert.ok(directive.qualityGapMap.every(row=>['PASS','GAP','NOT_APPLICABLE'].includes(row.state)));
  assert.equal(directive.allDomainImplementationDirectives.length,BUILD_UP_DOMAINS.length);
  assert.ok(directive.allDomainImplementationDirectives.every(row=>row.state==='NOT_APPLICABLE'||String(row.directive||'').length>20));
  assert.equal(directive.developmentDepth,1);
  assert.equal(directive.escalationStage,'FOUNDATION_COMPLETENESS');
  assert.deepEqual(Object.keys(directive.visualBuildUpDirective.domains),[...VISUAL_DOMAINS]);
  assert.match(directive.thisLoopPrimaryGoal,/곤충|서식지|포식|정원/);
  assert.match(directive.primaryGoalReason,/게임 고유 앵커/);
  assert.ok(directive.gameplayImplementationDirectives.some(x=>/서식지 상성/.test(x)));
  assert.ok(directive.acceptanceEvidence.includes('WORKFLOW_QA_HOMEPAGE_ONLY_CHANGE_DOES_NOT_COUNT'));
  assert.ok(directive.acceptanceEvidence.includes('VISUAL_CLAIM_REQUIRES_ACTUAL_RENDERED_DELTA'));
  assert.ok(directive.platformAdaptationDirectives.UNITY_WEB);
  assert.ok(directive.platformAdaptationDirectives.ROBLOX);
  assert.ok(directive.platformAdaptationDirectives.UNITY_APP);
  assert.equal(directive.robloxNativeExecution.required,true);
  assert.ok(directive.robloxNativeExecution.responsibleFiles.some(file=>/roblox-games\/bug-defense/.test(file)));
  assert.ok(directive.robloxNativeExecution.sourceSymbolsOrStateAnchors.some(row=>row.symbol==='attack'));
  assert.ok(directive.robloxNativeExecution.serverClientResponsibility.some(row=>row.role==='SERVER_AUTHORITY'));
  assert.match(directive.robloxNativeExecution.observableAcceptanceScenario,/server validation -> authoritative state change -> client feedback/);
  assert.ok(directive.robloxNativeExecution.codeQualityChecks.includes('REMOTE_INPUT_VALIDATION'));
  assert.ok(directive.currentImplementationFindings.sourceAnchors.some(row=>row.symbol==='attack'));
  assert.ok(directive.responsibleSystemsAndFiles.sourceAnchors.length>=1);
  assert.equal(directive.responsibleSystemsAndFiles.exactSourceAnchorRequired,true);
  assert.equal(directive.responsibleSystemsAndFiles.currentAndIntendedBehaviorRequiredPerPrimaryAnchor,true);
  assert.ok(directive.responsibleSystemsAndFiles.sourceAnchors.every(row=>String(row.currentBehavior||'').length>5));
  assert.ok(directive.responsibleSystemsAndFiles.sourceAnchors.every(row=>String(row.intendedBehavior||'').includes('primary goal')));
  assert.ok(directive.responsibleSystemsAndFiles.sourceAnchors.every(row=>String(row.observableAcceptance||'').includes(row.file)));
  assert.ok(directive.effectivenessMeasurement.expectedPlayerEffect.length>20);
  assert.equal(directive.effectivenessMeasurement.previousGeneration.classification,'NO_PREVIOUS_GENERATION');
  assert.equal(directive.nextActionDecision.action,'CONTINUE_BUILD_UP_CURRENT_SYSTEM');
  assert.match(directivePrompt(directive),/GAME_SPECIFIC_BUILD_UP_DIRECTIVE/);
  assert.match(directivePrompt(directive),/SOURCE_ANCHORS:/);
  assert.match(directivePrompt(directive),/EXPECTED_PLAYER_EFFECT:/);
  assert.match(directivePrompt(directive),/HOLISTIC_CORE_DOMAIN_STATUS:/);
});

test('holistic build-up marks sparse map inventory UI session and convenience systems as explicit gaps',()=>{
  const sourceObservation={
    sourceRoot:'roblox-games/sample',
    sourceTreeFingerprint:'7'.repeat(64),
    fileCount:2,
    topFiles:[],
    sourceAnchors:[],
    signals:{
      combat:8,progression:3,ai:2,save:2,multiplayer:0,animation:2,vfx:2,camera:1,ui:2,uiFlow:0,input:1,
      map:3,landmark:0,interaction:1,inventory:2,equipment:1,settings:0,feedback:0,session:1,content:5,
      choice:0,connection:0,performance:0,lighting:1,primitive:2,todo:0,errorRecovery:1
    },
    observations:['CURRENT_SOURCE_FILES=2']
  };
  const d=buildGameSpecificBuildUpDirective({
    gameId:'sample',
    designRecord:{
      content:{
        identity:'지역 탐험과 장비 성장 게임',
        coreFun:'탐험해서 자원을 얻고 장비를 바꿔 더 위험한 지역에 진입하는 재미',
        coreLoop:['지역 탐험','전리품 획득','장비 교체','새 지역 해금'],
        signatureSystems:[
          {name:'지역 탐험',purpose:'위험과 보상을 고른다',playerChoice:'어느 지역을 먼저 갈지 선택'},
          {name:'장비 성장',purpose:'획득품을 다음 전투 선택에 연결한다',playerChoice:'어떤 장비를 장착할지 선택'}
        ],
        progressionDirection:'새 지역과 장비를 순차적으로 해금한다',
        multiplayerMode:'SINGLE'
      }
    },
    sourceObservation
  });
  const state=Object.fromEntries(d.qualityGapMap.map(row=>[row.domain,row.state]));
  for(const domain of ['MAP_EXPANSION','WORLD_DENSITY','WORLD_NAVIGATION','INTERACTION_DISCOVERABILITY','INVENTORY_USABILITY','EQUIPMENT_LOADOUT','SYSTEM_CONNECTION','SESSION_FLOW','FIRST_10_MINUTES','MID_LATE_GAME_DEPTH','SETTINGS_ACCESSIBILITY','MENU_FLOW','CONVENIENCE','UI_DESIGN_SYSTEM','UI_INFORMATION_PRIORITY','FEEDBACK_CLARITY','PLAYER_AGENCY','ANTI_GRIND','CONTENT_DENSITY','PERFORMANCE_BUDGET']){
    assert.equal(state[domain],'GAP',domain);
  }
  assert.ok(d.coverage.holisticGaps.includes('MAP_EXPANSION'));
  assert.ok(d.coverage.holisticGaps.includes('INVENTORY_USABILITY'));
  assert.ok(d.coverage.holisticGaps.includes('UI_DESIGN_SYSTEM'));
  assert.match(directivePrompt(d),/MAP_EXPANSION\[FIX_NOW\]/);
  assert.match(directivePrompt(d),/INVENTORY_USABILITY\[FIX_NOW\]/);
});

test('unverified history raises generation but does not rotate focus without a verified source delta',()=>{
  const sourceObservation={
    sourceRoot:'roblox-games/bug-defense',
    sourceTreeFingerprint:'a'.repeat(64),
    fileCount:3,
    topFiles:[],
    signals:{combat:20,progression:20,ai:20,save:5,multiplayer:0,animation:0,vfx:0,camera:0,ui:5,lighting:0,primitive:30,todo:0,errorRecovery:3},
    observations:['PLACEHOLDER_OR_PRIMITIVE_USAGE_HIGH','MOTION_IMPLEMENTATION_SPARSE']
  };
  const first=buildGameSpecificBuildUpDirective({
    gameId:'bug-defense',gameName:'곤충 디펜스',designRecord:design(),sourceObservation,
    qualitySignals:['visual placeholder animation vfx']
  });
  const second=buildGameSpecificBuildUpDirective({
    gameId:'bug-defense',gameName:'곤충 디펜스',designRecord:design(),sourceObservation,
    qualitySignals:['visual placeholder animation vfx'],previousDirective:first
  });
  assert.equal(second.generation,2);
  assert.equal(second.developmentDepth,1);
  assert.equal(second.escalationMode,'CONTINUE_UNVERIFIED_DEPTH');
  assert.equal(second.previousDirectiveFingerprint,first.directiveFingerprint);
  assert.equal(second.primaryFocus,first.primaryFocus);
  assert.equal(second.loopEscalation.automatic,true);
  assert.equal(second.loopEscalation.reuseSameGoalWithoutNewEvidence,false);
});

test('source fingerprint tracks real code and assets but ignores generated evidence metadata',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'build-up-source-'));
  const scripts=path.join(root,'unity-games','sample','Assets','Scripts');
  const prefabs=path.join(root,'unity-games','sample','Assets','Prefabs');
  fs.mkdirSync(scripts,{recursive:true});
  fs.mkdirSync(prefabs,{recursive:true});
  const file=path.join(scripts,'GameCore.cs');
  const metadata=path.join(root,'unity-games','sample','prototype-source.json');
  fs.writeFileSync(file,'class GameCore { int hp = 10; }\n');
  fs.writeFileSync(metadata,JSON.stringify({generatedAt:'v1'}));
  const before=inspectGameSources({repoRoot:root,sourceRoots:['unity-games/sample']});

  fs.writeFileSync(metadata,JSON.stringify({generatedAt:'v2',workflowOnly:true}));
  const metadataOnly=inspectGameSources({repoRoot:root,sourceRoots:['unity-games/sample']});
  assert.equal(before.sourceTreeFingerprint,metadataOnly.sourceTreeFingerprint);

  fs.writeFileSync(file,'class GameCore { int hp = 10; void Attack(){} }\n');
  const codeAfter=inspectGameSources({repoRoot:root,sourceRoots:['unity-games/sample']});
  assert.notEqual(before.sourceTreeFingerprint,codeAfter.sourceTreeFingerprint);

  fs.writeFileSync(path.join(prefabs,'Enemy.prefab'),'--- !u!1 &1\nGameObject:\n  m_Name: EnemyVisual\n');
  const assetAfter=inspectGameSources({repoRoot:root,sourceRoots:['unity-games/sample']});
  assert.notEqual(codeAfter.sourceTreeFingerprint,assetAfter.sourceTreeFingerprint);
});


test('verified loop outcome raises development depth and changes escalation stage',()=>{
  const sourceObservation={
    sourceRoot:'unity-games/bug-defense',
    sourceTreeFingerprint:'b'.repeat(64),
    fileCount:4,
    topFiles:[],
    signals:{combat:12,progression:8,ai:4,save:2,multiplayer:0,animation:3,vfx:3,camera:1,ui:4,lighting:1,primitive:2,todo:0,errorRecovery:2},
    observations:['CURRENT_SOURCE_FILES=4']
  };
  const first=buildGameSpecificBuildUpDirective({gameId:'bug-defense',designRecord:design(),sourceObservation});
  const changedSourceObservation={...sourceObservation,sourceTreeFingerprint:'c'.repeat(64)};
  const second=buildGameSpecificBuildUpDirective({
    gameId:'bug-defense',designRecord:design(),sourceObservation:changedSourceObservation,
    previousDirective:first,previousDirectiveOutcome:'verified'
  });
  assert.equal(second.generation,2);
  assert.equal(second.developmentDepth,1);
  assert.equal(second.escalationStage,'FOUNDATION_COMPLETENESS');
  assert.equal(second.escalationMode,'VERIFIED_SOURCE_DELTA_AWAITING_EFFECT');
  assert.equal(second.loopEscalation.nextDevelopmentDepth,1);
  assert.equal(second.effectivenessMeasurement.previousGeneration.classification,'PARTIAL_EFFECT');
  assert.equal(second.nextActionDecision.action,'CONTINUE_BUILD_UP_CURRENT_SYSTEM');
});


test('verified status without a real game source delta cannot raise development depth',()=>{
  const sourceObservation={
    sourceRoot:'roblox-games/bug-defense',
    sourceTreeFingerprint:'d'.repeat(64),
    fileCount:3,
    topFiles:[],
    signals:{combat:10,progression:6,ai:3,save:1,multiplayer:0,animation:2,vfx:2,camera:1,ui:3,lighting:1,primitive:2,todo:0,errorRecovery:2},
    observations:['CURRENT_SOURCE_FILES=3']
  };
  const first=buildGameSpecificBuildUpDirective({gameId:'bug-defense',designRecord:design(),sourceObservation});
  const second=buildGameSpecificBuildUpDirective({
    gameId:'bug-defense',designRecord:design(),sourceObservation,
    previousDirective:first,previousDirectiveOutcome:'verified'
  });
  assert.equal(second.developmentDepth,1);
  assert.equal(second.escalationMode,'VERIFIED_STATUS_WITHOUT_GAME_SOURCE_DELTA_RETRY');
  assert.equal(second.previousVersionDelta.sourceChanged,false);
  assert.equal(second.loopEscalation.completedGoalBecomesBaseline,false);
  assert.equal(second.effectivenessMeasurement.previousGeneration.classification,'NO_MEANINGFUL_EFFECT');
  assert.equal(second.nextActionDecision.action,'CONTINUE_BUILD_UP_CURRENT_SYSTEM');
  assert.match(second.primaryGoalReason,/source tree가 바뀌지 않았다/);
});


test('runtime-confirmed verified generation advances depth and selects the next higher-value gap',()=>{
  const sourceObservation={
    sourceRoot:'roblox-games/bug-defense',
    sourceTreeFingerprint:'e'.repeat(64),
    fileCount:2,
    topFiles:[{file:'roblox-games/bug-defense/server/Combat.server.luau',score:20}],
    sourceAnchors:[{file:'roblox-games/bug-defense/server/Combat.server.luau',line:4,kind:'FUNCTION',symbol:'resolveAttack',context:'function resolveAttack(enemy)',score:40}],
    signals:{combat:12,progression:8,ai:4,save:1,multiplayer:0,animation:2,vfx:2,camera:1,ui:2,lighting:1,primitive:1,todo:0,errorRecovery:2},
    observations:['CURRENT_SOURCE_FILES=2']
  };
  const first=buildGameSpecificBuildUpDirective({gameId:'bug-defense',designRecord:design(),sourceObservation});
  const second=buildGameSpecificBuildUpDirective({
    gameId:'bug-defense',
    designRecord:design(),
    sourceObservation:{...sourceObservation,sourceTreeFingerprint:'f'.repeat(64)},
    previousDirective:first,
    previousDirectiveOutcome:'verified',
    runtimeEvidence:{runtimeObserved:true,runtimePassed:true}
  });
  assert.equal(second.developmentDepth,2);
  assert.equal(second.escalationStage,'ROLE_DIFFERENTIATION');
  assert.equal(second.escalationMode,'ESCALATE_AFTER_VERIFIED_GAME_SOURCE_DELTA');
  assert.equal(second.effectivenessMeasurement.previousGeneration.classification,'EFFECT_CONFIRMED');
  assert.equal(second.nextActionDecision.action,'MOVE_TO_NEXT_HIGHER_VALUE_GAP');
  assert.match(second.primaryGoalReason,/Combat\.server\.luau::resolveAttack/);
});

test('failed previous generation keeps depth and routes next action to causal repair',()=>{
  const source={
    sourceRoot:'unity-games/bug-defense',
    sourceTreeFingerprint:'1'.repeat(64),
    fileCount:1,
    topFiles:[],
    sourceAnchors:[],
    signals:{combat:4,progression:4,ai:1,save:1,multiplayer:0,animation:1,vfx:1,camera:0,ui:1,lighting:0,primitive:2,todo:0,errorRecovery:1},
    observations:['CURRENT_SOURCE_FILES=1']
  };
  const first=buildGameSpecificBuildUpDirective({gameId:'bug-defense',designRecord:design(),sourceObservation:source});
  const second=buildGameSpecificBuildUpDirective({
    gameId:'bug-defense',designRecord:design(),
    sourceObservation:{...source,sourceTreeFingerprint:'2'.repeat(64)},
    previousDirective:first,previousDirectiveOutcome:'failed',
    runtimeEvidence:{failureStage:'INCREMENTAL_QA',failureSignature:'combat-state-regression',runtimeObserved:true,runtimePassed:false}
  });
  assert.equal(second.developmentDepth,1);
  assert.equal(second.effectivenessMeasurement.previousGeneration.classification,'REGRESSION');
  assert.equal(second.nextActionDecision.action,'CAUSAL_REPAIR');
});


test('primary focus prioritizes core gameplay over generic presentation debt when both are evidenced',()=>{
  const sourceObservation={
    sourceRoot:'roblox-games/bug-defense',
    sourceTreeFingerprint:'9'.repeat(64),
    fileCount:2,
    topFiles:[],
    sourceAnchors:[],
    signals:{combat:1,progression:1,ai:1,save:0,multiplayer:0,animation:0,vfx:0,camera:0,ui:0,lighting:0,primitive:20,todo:0,errorRecovery:0},
    observations:['PLACEHOLDER_OR_PRIMITIVE_USAGE_HIGH','MOTION_IMPLEMENTATION_SPARSE']
  };
  const directive=buildGameSpecificBuildUpDirective({
    gameId:'bug-defense',
    designRecord:design(),
    sourceObservation,
    qualitySignals:['combat decision gap','visual placeholder debt']
  });
  assert.equal(directive.primaryFocus,'CORE_FUN');
  assert.match(directive.thisLoopPrimaryGoal,/입력→판단→상태 변화→피드백→다음 선택/);
});
