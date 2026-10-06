import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  BUILD_UP_DOMAINS,
  HOLISTIC_CORE_DOMAINS,
  VISUAL_DOMAINS,
  buildDevelopmentDryRun,
  buildGameSpecificBuildUpDirective,
  classifyDevelopmentImpact,
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

test('existing UI without entry or loading flow becomes a cross-platform build-up gap',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'entry-flow-directive-'));
  const sourcePath=path.join(root,'roblox-games','puzzle','client','Game.client.luau');
  fs.mkdirSync(path.dirname(sourcePath),{recursive:true});
  fs.writeFileSync(sourcePath,'local gui = Instance.new("ScreenGui")\nlocal button = Instance.new("TextButton")\nbutton.Activated:Connect(function() end)\n');
  const sourceObservation=inspectGameSources({repoRoot:root,sourceRoots:['roblox-games/puzzle']});
  assert.ok(sourceObservation.signals.ui>0);
  assert.equal(sourceObservation.signals.entryFlow,0);
  assert.equal(sourceObservation.signals.loadingFlow,0);
  assert.ok(sourceObservation.observations.includes('UI_MENU_FLOW_SPARSE'));
  const directive=buildGameSpecificBuildUpDirective({gameId:'puzzle',gameName:'퍼즐',designRecord:design(),sourceObservation,responsibleFiles:['roblox-games/puzzle/client/Game.client.luau']});
  const menu=directive.qualityGapMap.find(row=>row.domain==='MENU_FLOW');
  assert.equal(menu.state,'GAP');
  assert.match(directive.allDomainImplementationDirectives.find(row=>row.domain==='MENU_FLOW').directive,/로비|허브/);
  assert.match(directive.allDomainImplementationDirectives.find(row=>row.domain==='MENU_FLOW').directive,/가짜 진행률/);
});

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
  assert.ok(directive.platformAdaptationDirectives.WEB);
  assert.ok(directive.platformAdaptationDirectives.ROBLOX);
  assert.ok(directive.platformAdaptationDirectives.UNITY);
  assert.ok(directive.platformAdaptationDirectives.FORTNITE_UEFN);
  assert.ok(directive.platformAdaptationDirectives.UNITY_WEB);
  assert.ok(directive.platformAdaptationDirectives.UNITY_APP);
  assert.equal(directive.autonomousContentExpansion.version,2);
  assert.equal(directive.autonomousContentExpansion.executionBoundary,'EXISTING_BUILD_UP_ONLY');
  assert.equal(directive.autonomousContentExpansion.autonomousDecisionOwner,'VIBE');
  assert.deepEqual([...directive.autonomousContentExpansion.platformScope],['WEB','ROBLOX','UNITY']);
  assert.equal(directive.autonomousContentExpansion.existingCompletenessReview.requiredEveryBuildUp,true);
  assert.equal(directive.autonomousContentExpansion.antiCloneContract.nameColorOrStatOnlyCloneForbidden,true);
  assert.equal(directive.autonomousContentExpansion.continuityAndCausality.required,true);
  assert.equal(directive.autonomousContentExpansion.derivedRuleEvolution.allowed,true);
  assert.equal(directive.autonomousContentExpansion.themeCoverageLedger.version,1);
  assert.equal(directive.autonomousContentExpansion.themeCoverageLedger.distinctCovered,1);
  assert.equal(directive.autonomousContentExpansion.themeCoverageLedger.totalThemes,7);
  assert.ok(directive.autonomousContentExpansion.coherentContentBundle.length>=6);
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
  assert.equal(directive.implementationBlueprint.status,'DETAILED_BUILD_READY_IMPLEMENTATION_SPEC');
  assert.equal(directive.implementationBlueprint.version,2);
  assert.equal(directive.implementationBlueprint.detailLevel,'SOURCE_IMPLEMENTATION_EXPLICIT');
  assert.equal(directive.implementationBlueprint.approximateOrGenericDesignSummaryCannotCloseBuildUp,true);
  assert.equal(directive.implementationBlueprint.everyApplicableSurfaceMustNameImplementationAndRuntimeProof,true);
  assert.equal(directive.implementationBlueprint.mode,'VERTICAL_SLICE_BUILD_UP');
  assert.equal(directive.implementationBlueprint.foundationRepairFirst,false);
  assert.equal(directive.implementationBlueprint.newContentMayPreemptFoundationRepair,false);
  assert.equal(directive.implementationBlueprint.verticalSlice.completeChainRequired,true);
  assert.equal(directive.implementationBlueprint.stateTransitions.length,4);
  assert.ok(directive.implementationBlueprint.systemContracts.length>=2);
  assert.ok(directive.implementationBlueprint.responsibleSourcePlan.length>=1);
  assert.equal(directive.implementationBlueprint.presentationPlan.materialOrMarkerOnlyCannotCloseGraphicsBuildUp,true);
  assert.equal(directive.implementationBlueprint.completionGate.bootstrapOnlyCompletionForbidden,true);
  assert.equal(directive.implementationBlueprint.completionGate.statusOrMarkerOnlyCompletionForbidden,true);
  assert.equal(directive.implementationBlueprint.completionGate.realGameplaySourceDeltaRequired,true);
  assert.ok(directive.effectivenessMeasurement.expectedPlayerEffect.length>20);
  assert.equal(directive.effectivenessMeasurement.previousGeneration.classification,'NO_PREVIOUS_GENERATION');
  assert.equal(directive.nextActionDecision.action,'CONTINUE_BUILD_UP_CURRENT_SYSTEM');
  assert.match(directivePrompt(directive),/GAME_SPECIFIC_BUILD_UP_DIRECTIVE/);
  assert.match(directivePrompt(directive),/SOURCE_ANCHORS:/);
  assert.match(directivePrompt(directive),/EXPECTED_PLAYER_EFFECT:/);
  assert.equal(directive.identityReinforcement.appliesToAllGenres,true);
  assert.ok(directive.identityReinforcement.oneLineFantasy.length>0);
  assert.ok(directive.identityReinforcement.representativeAction.length>0);
  assert.ok(directive.identityReinforcement.representativeChoice.length>0);
  assert.ok(directive.identityReinforcement.signatureWorldRule.length>0);
  assert.ok(directive.identityReinforcement.growthIdentity.length>0);
  assert.match(directivePrompt(directive),/IDENTITY_THREE_SENTENCE_TEST:/);
  assert.match(directivePrompt(directive),/IDENTITY_BUILD_UP_RULE:/);
  assert.match(directivePrompt(directive),/CAUSAL_GRAMMAR_EVIDENCE:/);
  assert.match(directivePrompt(directive),/CAUSAL_GRAMMAR_BUILD_UP_RULE:/);
  assert.equal(directive.identityReinforcement.causalGrammarEvidence.formula,'MATERIAL_CAUSAL_GRAMMAR × (MAIN × A × B × c) + @');
  assert.equal(directive.identityReinforcement.causalGrammarEvidence.existingGameGrammarMap.formula,'MAIN × A × B × c + @');
  assert.equal(directive.identityReinforcement.causalGrammarEvidence.existingGameGrammarMap.majorAxes.length,2);
  assert.equal(directive.identityReinforcement.causalGrammarEvidence.existingGameGrammarMap.identityRewriteRequired,false);
  assert.match(directivePrompt(directive),/EXISTING_GAME_MAIN_A_B_c_AT_MAP:/);
  assert.match(directivePrompt(directive),/HOLISTIC_CORE_DOMAIN_STATUS:/);
  assert.match(directivePrompt(directive),/AUTONOMOUS_CONTENT_EXPANSION:/);
  assert.match(directivePrompt(directive),/CONTENT_BREADTH_LEDGER:/);
  assert.match(directivePrompt(directive),/COHERENT_CONTENT_BUNDLE:/);
  assert.match(directivePrompt(directive),/ANTI_CLONE:/);
  assert.match(directivePrompt(directive),/CONTINUITY_CAUSALITY:/);
  assert.match(directivePrompt(directive),/DERIVED_RULE_EVOLUTION:/);
  assert.match(directivePrompt(directive),/DETAILED_BUILD_READY_IMPLEMENTATION_SPEC:/);
  assert.match(directivePrompt(directive),/VERTICAL_SLICE:/);
  assert.match(directivePrompt(directive),/STATE_TRANSITIONS:/);
  assert.match(directivePrompt(directive),/RESPONSIBLE_SOURCE_PLAN:/);
  assert.match(directivePrompt(directive),/RUNTIME_ACCEPTANCE:/);
  assert.match(directivePrompt(directive),/BUILD_COMPLETION_GATE:/);
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

test('verified product-quality failure routes first buildup generation directly to causal repair',()=>{
  const directive=buildGameSpecificBuildUpDirective({
    gameId:'quality-fail-first-generation',
    gameName:'품질 실패 첫 세대',
    designRecord:design(),
    sourceObservation:{
      sourceRoot:'roblox-games/quality-fail-first-generation',
      sourceTreeFingerprint:'8'.repeat(64),
      fileCount:1,
      topFiles:[{file:'roblox-games/quality-fail-first-generation/server/Game.server.luau',score:20}],
      sourceAnchors:[{file:'roblox-games/quality-fail-first-generation/server/Game.server.luau',line:1,kind:'FUNCTION',symbol:'resolvePrimaryAction',context:'function resolvePrimaryAction(player)',score:40}],
      signals:{combat:4,progression:2,ai:1,save:1,multiplayer:1,animation:1,vfx:1,camera:1,ui:1,uiFlow:1,input:1,map:1,landmark:1,interaction:1,inventory:0,equipment:0,settings:0,feedback:1,session:1,content:2,choice:1,connection:1,performance:1,lighting:1,primitive:1,todo:0,errorRecovery:1},
      observations:['CURRENT_SOURCE_FILES=1']
    },
    runtimeEvidence:{
      runtimeObserved:true,
      runtimePassed:false,
      failureStage:'VIBE_INTERNAL_PLAY',
      failureSignature:'ROBLOX_STUDIO_MCP_SCENARIO_CONTRACT_FAILED',
      blockers:['primary-action-effect']
    },
    qualitySignals:['primary-action-effect']
  });
  assert.equal(directive.generation,1);
  assert.equal(directive.effectivenessMeasurement.previousGeneration.classification,'REGRESSION');
  assert.equal(directive.nextActionDecision.action,'CAUSAL_REPAIR');
  assert.match(directive.nextActionDecision.reason,/failure|regression/i);
});


test('detailed approved design facts become explicit source implementation contracts',()=>{
  const directive=buildGameSpecificBuildUpDirective({
    gameId:'detailed-rpg',
    gameName:'상세 RPG',
    platform:'ROBLOX',
    designRecord:{
      content:{
        identity:'마을에서 준비하고 포탈 사냥터에서 보스와 싸우는 액션 RPG',
        coreFun:'직접 전투와 패링, 장비/동료 선택',
        coreLoop:['마을 준비','포탈 이동','몬스터 전투','보상 획득','장비/동료 변경','다음 지역 도전'],
        progressionDirection:'레벨과 전직, 보스 동료 해금으로 전투 선택 확장',
        multiplayerMode:'COOP',
        signatureSystems:[
          {name:'완벽 패링',purpose:'전조를 읽고 공격을 되받아친다',playerChoice:'막기 또는 패링 타이밍 선택'},
          {name:'보스 동료',purpose:'격파한 보스를 동료로 편성한다',playerChoice:'최대 3명 동료 조합 선택'}
        ],
        mobileUx:'이동·공격·회피·막기/패링을 큰 버튼으로 제공하고 HUD는 체력·가드·스킬 상태를 실제 서버 상태와 동기화한다.',
        technicalAssumptions:['전투/보상 서버 authoritative','DataStore 저장','Lv60 레벨캡','전투 중 마을 귀환 금지','완벽 패링 판정은 서버 권위'],
        failureRetryRisk:{failureStates:['전투 패배'],retryFlow:'마을 귀환 후 장비·동료 구성을 바꾸고 재도전'},
        mvpScope:{launch:['마을','포탈','보스','장비','패링','저장'],deferred:['추가 포탈'],forbidden:['자동전투가 직접 전투 대체']},
        equipment:{slots:['Weapon','Armor','Relic'],weaponArmorTiers:5},
        balanceContract:{universalBestInSlot:false,itemDependency:'직업/동료 조합 > 플레이 실력 > 아이템'},
        tacticalCommands:['집중공격','후퇴'],
        startingClasses:[{id:'BREAKER',name:'파쇄기사',identity:'대검·방어파괴'}],
        launchCompanions:[{id:'GOLDEN_ANTLER',name:'금빛 큰뿔',route:'보스 첫 처치',role:'돌진·균형파괴'}],
        firstAdvancements:[{from:'BREAKER',branches:[{id:'IRON_BREAKER',name:'철벽파쇄자'}]}],
        visualDirection:'장난감·피규어풍 R15 직업 실루엣과 보스 동료의 원본 보스 실루엣을 구별한다.',
        artAudioDirection:{audioIdentity:'8비트가 아닌 판타지 어드벤처 BGM'},
        graphicsConcept:{id:'RPG_STYLIZED',rules:['직업과 보스 실루엣 구분'],forbidden:['색만 바꾼 동일 캐릭터']},
        implementationSync:{sourceRevision:'abc',codePaths:{config:'shared/GameConfig.luau',server:'server/Game.server.luau',client:'client/Game.client.luau'},syncRule:'DESIGN_EQUALS_IMPLEMENTED_CODE'},
        platformProfiles:{ROBLOX:{inputModel:'모바일 이동·공격·회피·스킬',sessionModel:'마을→포탈→보스→귀환',multiplayerRuntime:'서버가 동료·전투·보상을 authoritative하게 관리',performanceBudget:'AI와 파티클 수 제한',uiUx:'전투 HUD와 파티 화면 분리',saveAndNetwork:'레벨·장비·동료 해금 저장'}}
      }
    },
    sourceObservation:{
      sourceRoot:'roblox-games/detailed-rpg',
      sourceTreeFingerprint:'d'.repeat(64),
      fileCount:3,
      topFiles:[{file:'roblox-games/detailed-rpg/server/Game.server.luau',score:30},{file:'roblox-games/detailed-rpg/client/Game.client.luau',score:20}],
      sourceAnchors:[
        {file:'roblox-games/detailed-rpg/server/Game.server.luau',line:20,kind:'FUNCTION',symbol:'resolveAttack',context:'function resolveAttack(player,target)',score:60},
        {file:'roblox-games/detailed-rpg/client/Game.client.luau',line:30,kind:'FUNCTION',symbol:'renderCombatHud',context:'function renderCombatHud(state)',score:50}
      ],
      signals:{combat:8,progression:8,ai:4,save:4,multiplayer:3,animation:3,motionStates:6,gameFeel:3,vfx:2,camera:1,audio:2,audioDynamics:2,ui:5,uiFlow:3,entryFlow:1,loadingFlow:1,input:4,map:5,landmark:2,interaction:4,inventory:5,equipment:4,settings:2,feedback:4,session:4,content:10,choice:3,connection:3,performance:3,lighting:2,primitive:1,todo:0,errorRecovery:2},
      observations:['CURRENT_SOURCE_FILES=3']
    },
    responsibleFiles:['roblox-games/detailed-rpg/server/Game.server.luau','roblox-games/detailed-rpg/client/Game.client.luau']
  });
  const spec=directive.implementationBlueprint;
  assert.equal(spec.status,'DETAILED_BUILD_READY_IMPLEMENTATION_SPEC');
  assert.equal(spec.implementationFacts.mobileUx.includes('패링'),true);
  assert.ok(spec.implementationFacts.technicalAssumptions.includes('전투/보상 서버 authoritative'));
  assert.equal(spec.implementationFacts.forbiddenScope.includes('자동전투가 직접 전투 대체'),true);
  assert.equal(spec.implementationFacts.exactCodePaths.server,'server/Game.server.luau');
  assert.equal(spec.coreLoopExecutionPlan.length,6);
  assert.equal(spec.rosterContracts.classes[0].design.id,'BREAKER');
  assert.equal(spec.rosterContracts.companions[0].design.id,'GOLDEN_ANTLER');
  assert.ok(spec.interactionCombatContract.exactApprovedRules.some(x=>x.includes('패링')));
  assert.equal(spec.inputUiContract.touchFirstRequired,true);
  assert.match(spec.networkContract.multiplayerRuntime,/authoritative/);
  assert.match(spec.persistenceContract.saveAndNetwork,/저장/);
  assert.equal(spec.progressionEconomyContract.equipment.slots.length,3);
  assert.equal(spec.presentationContract.graphicsConcept.id,'RPG_STYLIZED');
  assert.ok(spec.presentationContract.forbidden.includes('색만 바꾼 동일 캐릭터'));
  assert.equal(spec.sourceImplementationContract.approvedCodePaths.server,'server/Game.server.luau');
  assert.equal(spec.sourceImplementationContract.wrapperShadowTemporaryOverrideForbidden,true);
  assert.equal(spec.orderedImplementationSteps.length,8);
  assert.ok(spec.acceptanceScenarios.some(row=>row.id==='MULTIPLAYER_SYNC'&&row.required===true));
  assert.ok(spec.acceptanceScenarios.some(row=>row.id==='SAVE_REJOIN'&&row.required===true));
  assert.ok(spec.antiShallowImplementationContract.forbiddenAsCompletion.includes('BOOTSTRAP_JSON_ONLY'));
  assert.ok(spec.antiShallowImplementationContract.forbiddenAsCompletion.includes('BUTTON_LABEL_OR_UI_SHELL_WITHOUT_STATE_BINDING'));
  assert.equal(spec.completionGate.bootstrapOnlyCompletionForbidden,true);
});

test('runtime failure forces implementation blueprint into foundation repair first and blocks decorative preemption',()=>{
  const directive=buildGameSpecificBuildUpDirective({
    gameId:'foundation-broken',
    gameName:'기본 작동 실패 게임',
    platform:'ROBLOX',
    designRecord:design(),
    sourceObservation:{
      sourceRoot:'roblox-games/foundation-broken',
      sourceTreeFingerprint:'a'.repeat(64),
      fileCount:2,
      topFiles:[{file:'roblox-games/foundation-broken/server/Game.server.luau',score:20}],
      sourceAnchors:[{file:'roblox-games/foundation-broken/server/Game.server.luau',line:1,kind:'FUNCTION',symbol:'startRound',context:'function startRound()',score:40}],
      signals:{combat:2,progression:1,ai:1,save:1,multiplayer:1,animation:1,vfx:1,camera:1,ui:1,uiFlow:1,input:1,map:1,landmark:0,interaction:1,inventory:0,equipment:0,settings:0,feedback:1,session:1,content:2,choice:1,connection:1,performance:1,lighting:1,primitive:1,todo:0,errorRecovery:1},
      observations:['CURRENT_SOURCE_FILES=2']
    },
    runtimeEvidence:{
      runtimeObserved:true,
      runtimePassed:false,
      failureStage:'F1_SERVER_BOOT',
      failureSignature:'SERVER_BOOT_NOT_OBSERVED',
      blockers:['core-loop-start']
    }
  });
  const blueprint=directive.implementationBlueprint;
  assert.equal(blueprint.mode,'FOUNDATION_REPAIR_FIRST');
  assert.equal(blueprint.foundationRepairFirst,true);
  assert.equal(blueprint.newContentMayPreemptFoundationRepair,false);
  assert.equal(blueprint.completionGate.basicPlayabilityFailureBlocksDecorativeExpansion,true);
  assert.equal(blueprint.completionGate.sameVerticalSliceMustReachInputStateFeedbackResult,true);
  assert.match(blueprint.verticalSlice.failureAndRetry,/다시 수행/);
});

test('autonomous content expansion rotates after a verified effective generation instead of cloning the same content theme',()=>{
  const sourceObservation={
    sourceRoot:'roblox-games/expansion-demo',
    sourceTreeFingerprint:'3'.repeat(64),
    fileCount:4,
    topFiles:[{file:'roblox-games/expansion-demo/server/World.server.luau',score:30}],
    sourceAnchors:[{file:'roblox-games/expansion-demo/server/World.server.luau',line:2,kind:'FUNCTION',symbol:'updateWorld',context:'function updateWorld()',score:40}],
    signals:{
      combat:4,progression:3,ai:1,save:1,multiplayer:0,animation:1,vfx:1,camera:1,ui:2,uiFlow:1,input:2,
      map:2,landmark:0,interaction:1,inventory:1,equipment:1,settings:0,feedback:1,session:1,content:3,
      choice:1,connection:0,performance:1,lighting:1,primitive:3,todo:0,errorRecovery:1
    },
    observations:['CURRENT_SOURCE_FILES=4','WORLD_MAP_IMPLEMENTATION_SPARSE']
  };
  const first=buildGameSpecificBuildUpDirective({
    gameId:'expansion-demo',
    gameName:'확장 데모',
    designRecord:{
      content:{
        identity:'지역 탐험과 생태 전투가 이어지는 성장 게임',
        coreFun:'지역 위험과 적 역할을 읽고 장비와 경로를 바꾸는 재미',
        coreLoop:['지역 진입','탐험과 전투','자원 획득','장비 선택','다음 지역 해금'],
        signatureSystems:[
          {name:'지역 생태',purpose:'지역마다 다른 위험과 보상을 만든다',playerChoice:'어느 지역과 적을 먼저 상대할지 선택'},
          {name:'장비 조합',purpose:'획득품이 다음 전투 전략을 바꾼다',playerChoice:'장비 조합을 선택'}
        ],
        progressionDirection:'지역·적·장비·퀘스트가 연결되며 중후반 선택지가 확장된다',
        multiplayerMode:'SINGLE'
      }
    },
    sourceObservation
  });
  const second=buildGameSpecificBuildUpDirective({
    gameId:'expansion-demo',
    gameName:'확장 데모',
    designRecord:{
      content:{
        identity:'지역 탐험과 생태 전투가 이어지는 성장 게임',
        coreFun:'지역 위험과 적 역할을 읽고 장비와 경로를 바꾸는 재미',
        coreLoop:['지역 진입','탐험과 전투','자원 획득','장비 선택','다음 지역 해금'],
        signatureSystems:[
          {name:'지역 생태',purpose:'지역마다 다른 위험과 보상을 만든다',playerChoice:'어느 지역과 적을 먼저 상대할지 선택'},
          {name:'장비 조합',purpose:'획득품이 다음 전투 전략을 바꾼다',playerChoice:'장비 조합을 선택'}
        ],
        progressionDirection:'지역·적·장비·퀘스트가 연결되며 중후반 선택지가 확장된다',
        multiplayerMode:'SINGLE'
      }
    },
    sourceObservation:{...sourceObservation,sourceTreeFingerprint:'4'.repeat(64)},
    previousDirective:first,
    previousDirectiveOutcome:'verified',
    runtimeEvidence:{runtimeObserved:true,runtimePassed:true}
  });
  assert.notEqual(second.autonomousContentExpansion.selectedTheme,first.autonomousContentExpansion.selectedTheme);
  assert.equal(second.autonomousContentExpansion.executionBoundary,'EXISTING_BUILD_UP_ONLY');
  assert.equal(second.autonomousContentExpansion.existingCompletenessReview.weakExistingContentMayPreemptNewContent,true);
  assert.equal(second.autonomousContentExpansion.antiCloneContract.minimumMeaningfulDistinctAxes,2);
});


test('successful buildup generations cover every major content theme before starting a new breadth cycle',()=>{
  const sourceBase={
    sourceRoot:'roblox-games/breadth-demo',
    sourceTreeFingerprint:'0'.repeat(64),
    fileCount:5,
    topFiles:[{file:'roblox-games/breadth-demo/server/World.server.luau',score:35}],
    sourceAnchors:[{file:'roblox-games/breadth-demo/server/World.server.luau',line:3,kind:'FUNCTION',symbol:'updateWorld',context:'function updateWorld()',score:40}],
    signals:{
      combat:3,progression:2,ai:1,save:1,multiplayer:1,animation:1,vfx:1,camera:1,ui:2,uiFlow:1,input:2,
      map:2,landmark:0,interaction:1,inventory:1,equipment:1,settings:0,feedback:1,session:1,content:2,
      choice:1,connection:0,performance:1,lighting:1,primitive:2,todo:0,errorRecovery:1
    },
    observations:['CURRENT_SOURCE_FILES=5','CONTENT_BREADTH_STILL_SHALLOW']
  };
  const directives=[];
  let previous=null;
  for(let index=0;index<7;index+=1){
    const directive=buildGameSpecificBuildUpDirective({
      gameId:'breadth-demo',
      gameName:'Breadth Demo',
      designRecord:design(),
      sourceObservation:{...sourceBase,sourceTreeFingerprint:String(index+1).repeat(64)},
      previousDirective:previous,
      previousDirectiveOutcome:previous?'verified':'',
      runtimeEvidence:previous?{runtimeObserved:true,runtimePassed:true}:{}
    });
    directives.push(directive);
    previous=directive;
  }
  const themes=directives.map(row=>row.autonomousContentExpansion.selectedTheme);
  assert.equal(new Set(themes).size,7);
  const finalLedger=directives.at(-1).autonomousContentExpansion.themeCoverageLedger;
  assert.equal(finalLedger.distinctCovered,7);
  assert.equal(finalLedger.totalThemes,7);
  assert.equal(finalLedger.breadthCycleComplete,true);
  assert.deepEqual([...finalLedger.missingThemes],[]);
  assert.ok(Object.values(finalLedger.counts).every(value=>value===1));
});

test('failed effectiveness may stay on the same content theme instead of breadth rotation hiding the causal repair',()=>{
  const first=buildGameSpecificBuildUpDirective({
    gameId:'breadth-repair-demo',
    designRecord:design(),
    sourceObservation:{
      sourceRoot:'roblox-games/breadth-repair-demo',
      sourceTreeFingerprint:'a'.repeat(64),
      fileCount:2,topFiles:[],sourceAnchors:[],
      signals:{combat:2,progression:2,ai:1,save:1,multiplayer:0,animation:1,vfx:1,camera:0,ui:1,uiFlow:0,input:1,map:1,landmark:0,interaction:1,inventory:0,equipment:0,settings:0,feedback:0,session:1,content:2,choice:0,connection:0,performance:1,lighting:0,primitive:2,todo:0,errorRecovery:1},
      observations:['CURRENT_SOURCE_FILES=2']
    }
  });
  const second=buildGameSpecificBuildUpDirective({
    gameId:'breadth-repair-demo',
    designRecord:design(),
    sourceObservation:{
      sourceRoot:'roblox-games/breadth-repair-demo',
      sourceTreeFingerprint:'b'.repeat(64),
      fileCount:2,topFiles:[],sourceAnchors:[],
      signals:{combat:2,progression:2,ai:1,save:1,multiplayer:0,animation:1,vfx:1,camera:0,ui:1,uiFlow:0,input:1,map:1,landmark:0,interaction:1,inventory:0,equipment:0,settings:0,feedback:0,session:1,content:2,choice:0,connection:0,performance:1,lighting:0,primitive:2,todo:0,errorRecovery:1},
      observations:['CURRENT_SOURCE_FILES=2']
    },
    previousDirective:first,
    previousDirectiveOutcome:'failed',
    runtimeEvidence:{runtimeObserved:true,runtimePassed:false,failureStage:'PLAYTEST',failureSignature:'verified-product-quality-failure'}
  });
  assert.equal(second.autonomousContentExpansion.selectedTheme,first.autonomousContentExpansion.selectedTheme);
  assert.equal(second.autonomousContentExpansion.themeDepth,2);
  assert.equal(second.autonomousContentExpansion.executionMode,'CAUSAL_REPAIR_FIRST_KEEP_EXPANSION_CONTEXT');
});

test('verified product-quality failure keeps autonomous expansion inside existing buildup but causal repair goes first',()=>{
  const d=buildGameSpecificBuildUpDirective({
    gameId:'repair-before-expansion',
    designRecord:design(),
    sourceObservation:{
      sourceRoot:'roblox-games/repair-before-expansion',
      sourceTreeFingerprint:'6'.repeat(64),
      fileCount:1,
      topFiles:[],
      sourceAnchors:[],
      signals:{combat:2,progression:2,ai:1,save:1,multiplayer:0,animation:1,vfx:1,camera:0,ui:1,uiFlow:0,input:1,map:1,landmark:0,interaction:1,inventory:0,equipment:0,settings:0,feedback:0,session:1,content:2,choice:0,connection:0,performance:1,lighting:0,primitive:2,todo:0,errorRecovery:1},
      observations:['CURRENT_SOURCE_FILES=1']
    },
    runtimeEvidence:{runtimeObserved:true,runtimePassed:false,failureStage:'PLAYTEST',failureSignature:'verified-product-quality-failure'}
  });
  assert.equal(d.nextActionDecision.action,'CAUSAL_REPAIR');
  assert.equal(d.autonomousContentExpansion.executionMode,'CAUSAL_REPAIR_FIRST_KEEP_EXPANSION_CONTEXT');
  assert.equal(d.autonomousContentExpansion.newWorkflowForbidden,true);
  assert.equal(d.autonomousContentExpansion.newStageForbidden,true);
});


test('perpetual BUILD_UP carries exact data budgets without content or generation caps',()=>{
  const directive=buildGameSpecificBuildUpDirective({
    gameId:'data-budget-normal',
    platform:'WEB',
    designRecord:design(),
    sourceObservation:{
      sourceRoot:'web-games/data-budget-normal',
      sourceTreeFingerprint:'7'.repeat(64),
      fileCount:4,dataFileCount:4,sourceBytes:10*1024*1024,largestFileBytes:2*1024*1024,
      topFiles:[],sourceAnchors:[],
      signals:{combat:3,progression:3,ai:2,save:2,multiplayer:0,animation:2,vfx:2,camera:1,ui:2,uiFlow:2,input:2,map:3,landmark:1,interaction:2,inventory:1,equipment:1,settings:1,feedback:2,session:2,content:5,choice:2,connection:1,performance:3,lighting:1,primitive:1,todo:0,errorRecovery:2},
      observations:['CURRENT_SOURCE_FILES=4']
    }
  });
  const budget=directive.autonomousContentExpansion.dataCapacityBudget;
  assert.equal(budget.state,'NORMAL');
  assert.equal(budget.limits.savePersistedDataBytes,2*1024*1024);
  assert.equal(budget.limits.webDownloadBytes,100*1024*1024);
  assert.equal(budget.limits.singleFileBytes,25*1024*1024);
  assert.equal(budget.limits.mobileMemoryTargetBytes,300*1024*1024);
  assert.equal(budget.limits.mobileMinimumFps,30);
  assert.equal(budget.generationLimit,null);
  assert.equal(budget.contentCountLimit,null);
  assert.equal(budget.buildUpMustContinue,true);
});

test('Web capacity warning pivots ideas to reuse and recombination without ending BUILD_UP',()=>{
  const directive=buildGameSpecificBuildUpDirective({
    gameId:'data-budget-warning',
    platform:'WEB',
    designRecord:design(),
    sourceObservation:{
      sourceRoot:'web-games/data-budget-warning',
      sourceTreeFingerprint:'8'.repeat(64),
      fileCount:10,dataFileCount:20,sourceBytes:85*1024*1024,largestFileBytes:21*1024*1024,
      topFiles:[],sourceAnchors:[],
      signals:{combat:3,progression:3,ai:2,save:2,multiplayer:0,animation:2,vfx:2,camera:1,ui:2,uiFlow:2,input:2,map:3,landmark:1,interaction:2,inventory:1,equipment:1,settings:1,feedback:2,session:2,content:8,choice:2,connection:1,performance:3,lighting:1,primitive:1,todo:0,errorRecovery:2},
      observations:['CURRENT_SOURCE_FILES=10']
    }
  });
  const budget=directive.autonomousContentExpansion.dataCapacityBudget;
  assert.equal(budget.state,'WARNING');
  assert.ok(budget.warning.includes('WEB_DOWNLOAD_BUDGET'));
  assert.ok(budget.warning.includes('SINGLE_FILE_BUDGET'));
  assert.match(budget.strategy,/REUSE_RECOMBINATION/);
  assert.equal(budget.buildUpMustContinue,true);
  const prompt=directivePrompt(directive);
  assert.match(prompt,/DATA_CAPACITY_BUDGET: state=WARNING/);
  assert.match(prompt,/generationLimit=NONE; contentCountLimit=NONE/);
  assert.match(prompt,/재사용·재조합/);
});

test('capacity exceedance becomes causal capacity repair and preserves perpetual idea generation',()=>{
  const directive=buildGameSpecificBuildUpDirective({
    gameId:'data-budget-exceeded',
    platform:'WEB',
    designRecord:design(),
    sourceObservation:{
      sourceRoot:'web-games/data-budget-exceeded',
      sourceTreeFingerprint:'9'.repeat(64),
      fileCount:10,dataFileCount:20,sourceBytes:110*1024*1024,largestFileBytes:26*1024*1024,
      topFiles:[],sourceAnchors:[],
      signals:{combat:3,progression:3,ai:2,save:2,multiplayer:0,animation:2,vfx:2,camera:1,ui:2,uiFlow:2,input:2,map:3,landmark:1,interaction:2,inventory:1,equipment:1,settings:1,feedback:2,session:2,content:8,choice:2,connection:1,performance:3,lighting:1,primitive:1,todo:0,errorRecovery:2},
      observations:['CURRENT_SOURCE_FILES=10']
    },
    runtimeEvidence:{persistedDataBytes:3*1024*1024,mobileMemoryBytes:340*1024*1024,mobileFps:24}
  });
  const budget=directive.autonomousContentExpansion.dataCapacityBudget;
  assert.equal(budget.state,'EXCEEDED');
  for(const key of ['SAVE_AND_PERSISTED_DATA_BUDGET','WEB_DOWNLOAD_BUDGET','SINGLE_FILE_BUDGET','MOBILE_MEMORY_BUDGET','MOBILE_FRAME_BUDGET'])assert.ok(budget.exceeded.includes(key));
  assert.match(budget.strategy,/CAUSAL_CAPACITY_REPAIR/);
  assert.equal(budget.generationLimit,null);
  assert.equal(budget.contentCountLimit,null);
  assert.equal(budget.buildUpMustContinue,true);
  assert.equal(budget.protectedStateDeletionForbidden,true);
});

test('each approved loop and signature choice reaches the shared implementation prompt',()=>{
  for(const platform of ['ROBLOX','WEB']){
    const directive=buildGameSpecificBuildUpDirective({gameId:'design-chain',platform,designRecord:design(),sourceObservation:{sourceTreeFingerprint:'test',signals:{},observations:[],topFiles:[],sourceAnchors:[]}});
    const prompt=directivePrompt(directive);
    for(const step of design().content.coreLoop)assert.ok(prompt.includes(`기획 루프 ${design().content.coreLoop.indexOf(step)+1} "${step}"`));
    for(const system of design().content.signatureSystems)assert.ok(prompt.includes(`플레이어 선택 "${system.playerChoice}"`));
    assert.match(prompt,/공통 점수 증가만으로/);
    assert.match(prompt,/실측하지 못하면 미확인/);
  }
});


test('development dry-run classifies only relevant impact and adds no new execution path',()=>{
  const impact=classifyDevelopmentImpact({
    platform:'ROBLOX',
    responsibleFiles:['roblox-games/demo/server/WorldMap.server.luau','roblox-games/demo/shared/SaveData.luau'],
    qualityGapMap:[
      {domain:'WORLD_MAP_TOPOLOGY',state:'GAP'},
      {domain:'SAVE_COMPLETENESS',state:'GAP'}
    ]
  });
  assert.deepEqual([...impact.categories],['MAP','SAVE']);
  assert.ok(impact.requiredQa.includes('ROBLOX_OPEN_CLOUD_WORLD_EVIDENCE'));
  assert.ok(impact.requiredQa.includes('SECURITY_AUTHORITY_QA'));
  assert.equal(impact.securityRelevant,true);
  const dry=buildDevelopmentDryRun({
    gameId:'demo',platform:'ROBLOX',
    responsibleSystemsAndFiles:{files:['roblox-games/demo/server/WorldMap.server.luau']},
    qualityGapMap:[{domain:'WORLD_MAP_TOPOLOGY',state:'GAP'}]
  });
  assert.equal(dry.mode,'DRY_RUN_NO_SOURCE_MUTATION');
  assert.equal(dry.sourceMutationPerformed,false);
  assert.equal(dry.newWorkflowOrQueueRequired,false);
  assert.deepEqual(dry.openCloudWorldChecks,[
    'SERVER_BOOT','FINITE_WORLD_BOUNDS','SPAWN_IN_PLAYABLE_BOUNDS','LANDMARK_AND_OBJECTIVE_COUNTS',
    'WORLD_GEOMETRY','TERRAIN_BINDING','LIGHTING_ATMOSPHERE','STREAMING_CONFIGURATION'
  ]);
});

test('generated BUILD_UP directive carries dry-run and impact classification before mutation',()=>{
  const directive=buildGameSpecificBuildUpDirective({
    gameId:'map-demo',platform:'ROBLOX',designRecord:design(),
    sourceObservation:{sourceTreeFingerprint:'tree',signals:{},observations:[],topFiles:[{file:'roblox-games/map-demo/server/WorldMap.server.luau'}],sourceAnchors:[]},
    responsibleFiles:['roblox-games/map-demo/server/WorldMap.server.luau']
  });
  assert.equal(directive.preMutationDryRun.mode,'DRY_RUN_NO_SOURCE_MUTATION');
  assert.ok(directive.developmentImpact.categories.includes('MAP'));
  assert.equal(directive.preMutationDryRun.sourceMutationPerformed,false);
});

// 무한 반복은 실제 소스와 플레이 효과의 검증을 생략하지 않는다.
test('every platform cycle carries asset replacement and source-content growth without false advancement',()=>{
  for(const platform of ['ROBLOX','UNITY','WEB']){
    const args={gameId:'cycle-demo',platform,designRecord:design(),sourceObservation:{sourceTreeFingerprint:'unchanged-tree',signals:{},observations:[],topFiles:[],sourceAnchors:[]}};
    const first=buildGameSpecificBuildUpDirective(args);
    const next=buildGameSpecificBuildUpDirective({...args,previousDirective:first,previousDirectiveOutcome:'PASS',runtimeEvidence:{runtimeObserved:false,runtimePassed:false}});
    assert.equal(next.generation,first.generation+1);
    assert.equal(next.internalAssetEvolution.generation,next.generation);
    assert.equal(next.internalAssetEvolution.generationLimit,null);
    assert.equal(next.internalAssetEvolution.randomSwapOrMarkerOnlyGrowthForbidden,true);
    assert.equal(next.internalAssetEvolution.codeQualityAndApprovedContentExpansionMustContinue,true);
    assert.equal(next.loopEscalation.verifiedEvolution,false);
    assert.match(directivePrompt(next),/INTERNAL_ASSET_EVOLUTION/);
    assert.match(directivePrompt(next),/generationLimit=NONE/);
  }
});
