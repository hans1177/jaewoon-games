import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runInNewContext} from 'node:vm';
import {repairDesignRequiredFields} from '../tools/company-design-prepromotion-repair.mjs';
import {
  BUILD_UP_DOMAINS,
  HOLISTIC_CORE_DOMAINS,
  VISUAL_DOMAINS,
  buildDevelopmentDryRun,
  buildGameSpecificBuildUpDirective,
  buildDesignToPlatformCodingTrace,
  classifyDevelopmentImpact,
  directivePrompt,
  inspectGameSources
} from '../tools/company-build-up-directive.mjs';


test('web detailed original backfill preserves existing Roblox detailed platform design',()=>{
  const robloxProfile={
    platform:'ROBLOX',
    inputModel:'ROBLOX_SENTINEL_INPUT',
    sessionModel:'ROBLOX_SENTINEL_SESSION',
    multiplayerRuntime:'ROBLOX_SENTINEL_RUNTIME',
    performanceBudget:'ROBLOX_SENTINEL_PERFORMANCE',
    uiUx:'ROBLOX_SENTINEL_UI',
    saveAndNetwork:'ROBLOX_SENTINEL_SAVE',
    platformContentAdaptation:'ROBLOX_SENTINEL_CONTENT',
    internalReleaseTarget:'ROBLOX_SENTINEL_RELEASE',
    validationEvidence:'ROBLOX_SENTINEL_EVIDENCE'
  };
  const robloxBuildProfile={version:77,targetPlatform:'ROBLOX',marker:'ROBLOX_BUILD_PROFILE_SENTINEL'};
  const source={
    identity:'정원 방어',
    playerFantasy:'정원을 지키는 관리자',
    coreFun:'곤충 상성을 읽고 배치한다',
    coreLoop:['적 조합 확인','곤충 배치','전투 관찰','보상 선택'],
    signatureSystems:[{name:'서식지 상성',purpose:'배치 위치에 의미를 만든다',playerChoice:'곤충과 위치 선택'}],
    progressionDirection:'새 곤충과 지역을 열어 더 복잡한 조합을 상대한다',
    multiplayerMode:'SINGLE',
    platformProfiles:{
      ROBLOX:robloxProfile,
      UNITY:{
        platform:'UNITY',
        inputModel:'UNITY_INPUT',
        sessionModel:'UNITY_SESSION',
        multiplayerRuntime:'UNITY_RUNTIME',
        performanceBudget:'UNITY_PERFORMANCE',
        uiUx:'UNITY_UI',
        saveAndNetwork:'UNITY_SAVE',
        platformContentAdaptation:'UNITY_CONTENT',
        internalReleaseTarget:'UNITY_RELEASE',
        validationEvidence:'UNITY_EVIDENCE'
      }
    },
    robloxBuildProfile
  };
  const repaired=repairDesignRequiredFields(source,{
    seed:{
      DISTINCT_IDENTITY:'정원 방어',
      CORE_FUN_TO_LEARN:'곤충 상성을 읽고 배치한다',
      CORE_LOOP:['적 조합 확인','곤충 배치','전투 관찰','보상 선택'],
      MULTIPLAYER_DESIGN_MODE:'SINGLE',
      INITIAL_TARGET_PLATFORM:'ROBLOX',
      TARGET_SESSION_DIRECTION:'반복 웨이브 세션'
    },
    phase:'DRAFT'
  });
  assert.deepEqual(repaired.value.platformProfiles.ROBLOX,robloxProfile);
  assert.deepEqual(repaired.value.robloxBuildProfile,robloxBuildProfile);
  assert.equal(repaired.value.webCanonicalDesign.role,'SHARED_DESIGN_WEB_APPLICATION');
  assert.equal(repaired.value.webCanonicalDesign.playerFlow.length>=4,true);
  assert.deepEqual(repaired.value.platformExpansionPolicy.sharedLargeFrame,[
    'CORE_IDENTITY',
    'CORE_FUN_AND_REPRESENTATIVE_LOOP',
    'WORLD_AND_PROGRESSION_DIRECTION',
    'SAVE_PERSISTENCE_MEANING',
    'MULTIPLAYER_INTENT'
  ]);
  assert.equal(repaired.value.platformExpansionPolicy.expansionLimit,'GAMEPLAY_CHANGES_REQUIRE_SHARED_ORIGINAL_REVISION');
});

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

test('detailed verified design fields survive into build-up and implementation prompt',()=>{
  const sourceObservation={
    sourceRoot:'roblox-games/detail-lineage',sourceTreeFingerprint:'d'.repeat(64),fileCount:1,topFiles:[],sourceAnchors:[],observations:[],
    signals:{combat:1,progression:1,ai:1,save:1,multiplayer:0,animation:1,vfx:1,camera:1,ui:1,uiFlow:1,input:1,map:1,landmark:1,interaction:1,inventory:0,equipment:0,settings:1,feedback:1,session:1,content:1,choice:1,connection:1,performance:1,lighting:1,primitive:0,todo:0,errorRecovery:1}
  };
  const detailed=design();
  Object.assign(detailed.content.signatureSystems[0],{id:'habitat',grammarRole:'MAIN',stateInputs:['wave'],stateOutputs:['habitat']});
  detailed.content.systemInterconnections=[{fromId:'habitat',toId:'predator',stateKeys:['habitat'],fromSystem:'서식지',toSystem:'포식',trigger:'배치',stateChange:'피해 반응'}];
  detailed.content.mobileUx='모바일 전투 중 엄지 영역과 메뉴 복귀 흐름을 분리한다.';
  detailed.content.uxAccessibilityPlan={hudPriorities:'체력과 현재 목표 우선',touchAndInput:'하단 우측 공격 버튼과 뒤로가기 버튼의 역할을 분리',readability:'작은 화면에서도 목표와 버튼 상태를 읽게 한다',accessibility:'진동과 음량을 분리 설정'};
  detailed.content.platformFitPlan={targetPlatform:'ROBLOX',inputModel:'터치/패드/키보드 동일 상태를 사용',performanceBudget:'모바일 전투 프레임 예산',sessionConstraints:'중단 후 복귀 가능'};
  detailed.content.webCanonicalDesign={role:'WEB_DETAILED_GAME_ORIGINAL',designAuthority:'GAME_DESIGN_REFERENCE_NOT_SOURCE_CODE_AUTHORITY',playerFlow:['적 조합 확인','곤충 배치','전투 관찰','보상 후 다음 웨이브 준비'],worldAndTraversal:'정원 지역과 온실을 이동 선택과 위험 보상으로 연결',systemsAndContent:'서식지 상성과 포식 관계를 적·지역·보상에 연결',combatAndInteraction:'배치와 실시간 전투 반응을 한 상태 흐름으로 연결',progressionAndEconomy:'보상으로 새 곤충과 진화를 열고 다음 웨이브 선택을 바꿈',sessionFailureRecovery:'웨이브 실패 뒤 준비 상태로 복귀해 다시 배치',uiMenuAndOnboarding:'시작부터 배치와 첫 전투, 첫 진화까지 메뉴 흐름을 연결',inputCameraAccessibility:'터치 배치와 카메라 이동을 분리하고 작은 화면 가독성을 유지',presentationAndAudio:'포식 관계와 위험 신호를 모션·VFX·오디오로 구분',multiplayerPersistence:'SINGLE 의도와 저장 의미를 유지',expansionSpace:'WEB 자체 지역·적·퀘스트·연출 확장에 세부 parity 제한 없음'};
  detailed.content.platformExpansionPolicy={mode:'SHARED_LARGE_FRAME_PLATFORM_NATIVE_EXPANSION',sharedLargeFrame:['CORE_IDENTITY','CORE_FUN_AND_REPRESENTATIVE_LOOP','WORLD_AND_PROGRESSION_DIRECTION','SAVE_PERSISTENCE_MEANING','MULTIPLAYER_INTENT'],expansionLimit:'NO_ARTIFICIAL_PARITY_LIMIT_WITHIN_SHARED_LARGE_FRAME',webRule:'WEB은 상세 원본 자체를 자유 확장',unityRule:'Unity는 공통 큰틀 안에서 네이티브 확장',robloxRule:'기존 Roblox 상세 설계를 그대로 유지하고 독립 확장'};
  detailed.content.contentVarietyPlan={regions:[{name:'정원 북쪽',traversal:'우회 경로',riskReward:'위험한 지름길',landmark:'온실',encounterPattern:'매복 해충',resourcePressure:'회복 자원 부족',storyContext:'침입 원인 추적'}],enemiesOrChallenges:[],objectives:[],antiMonotonyRule:'같은 처치 수치 복제를 금지'};
  detailed.content.narrativeDialoguePlan={applicable:true,worldRules:['포식 관계가 지역 질서를 바꾼다'],characterGoals:['관리인은 정원을 지키려 한다'],plotBeats:['침입 원인을 발견한다'],questStates:['퀘스트: 온실 단서 조사 -> 방어 -> 후속 지역 해금'],foreshadowing:[],payoffs:[],twists:[],dialogueRules:[],characterVoiceProfiles:[],sceneBeats:[]};
  detailed.content.selectedDesignPlan={label:'PLAN_A',rationale:'메뉴와 전투 상태를 하나의 진행 흐름으로 연결',identityPreserved:'정원 방어 정체성 유지',creativeDeviation:'온실 조사와 방어 연결',genreChange:false,reversibility:'기존 상태로 복귀 가능'};
  detailed.content.implementationTraceability=[{designElement:'메뉴 버튼 상태',responsibleSystem:'HUD/Menu state',validationEvidence:'버튼 활성/잠금과 실제 상태 일치'}];
  const directive=buildGameSpecificBuildUpDirective({gameId:'detail-lineage',gameName:'상세 설계',designRecord:detailed,sourceObservation,responsibleFiles:['roblox-games/detail-lineage/Game.luau']});
  assert.deepEqual(directive.designImplementationContext.signatureSystems[0],detailed.content.signatureSystems[0]);
  assert.deepEqual(directive.designImplementationContext.systemInterconnections,detailed.content.systemInterconnections);
  assert.equal(directive.designImplementationContext.uxAccessibilityPlan.touchAndInput,detailed.content.uxAccessibilityPlan.touchAndInput);
  assert.equal(directive.designImplementationContext.webCanonicalDesign.role,'SHARED_DESIGN_WEB_APPLICATION');
  assert.equal(directive.designImplementationContext.platformExpansionPolicy.expansionLimit,'GAMEPLAY_CHANGES_REQUIRE_SHARED_ORIGINAL_REVISION');
  assert.equal(directive.designImplementationContext.narrativeDialoguePlan.questStates[0],detailed.content.narrativeDialoguePlan.questStates[0]);
  assert.notEqual(directive.qualityGapMap.find(row=>row.domain==='QUESTS').state,'NOT_APPLICABLE');
  assert.match(directivePrompt(directive),/DESIGN_IMPLEMENTATION_CONTEXT:/);
  assert.match(directivePrompt(directive),/하단 우측 공격 버튼/);
  assert.match(directivePrompt(directive),/온실 단서 조사/);
  assert.match(directivePrompt(directive),/SHARED_DESIGN_WEB_APPLICATION/);
  assert.doesNotMatch(directivePrompt(directive),/WEB_DETAILED_GAME_ORIGINAL|독립 확장/);
  assert.match(directivePrompt(directive),/GAMEPLAY_CHANGES_REQUIRE_SHARED_ORIGINAL_REVISION/);
  assert.match(directivePrompt(directive),/플랫폼별 재설계는 금지/);
  const unityDirective=buildGameSpecificBuildUpDirective({gameId:'detail-lineage',gameName:'상세 설계',platform:'UNITY',designRecord:detailed,sourceObservation,responsibleFiles:['roblox-games/detail-lineage/Game.luau']});
  assert.match(directivePrompt(unityDirective),/동일 공통 원본의 규칙과 상태를 보존/);
  assert.match(directivePrompt(unityDirective),/게임 규칙 확장은 공통 원본 개정/);
});

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
  assert.equal(second.primaryFocus,'STABILITY');
  assert.match(second.thisLoopPrimaryGoal,/현재 실패 근거/);
  assert.equal(second.autonomousContentExpansion.contentExpansionDeferredUntilRuntimeRepairPass,true);
  assert.equal(second.autonomousContentExpansion.themeCoverageAdvanced,false);
  assert.equal(second.autonomousContentExpansion.coherentContentBundle.length,0);
  assert.equal(second.autonomousContentExpansion.derivedRuleEvolution.allowed,false);
});


test('observed runtime failure overrides stale presentation focus and freezes expansion progress until repair passes',()=>{
  const visualSource={
    sourceRoot:'roblox-games/foundation-first-demo',
    sourceTreeFingerprint:'7'.repeat(64),
    fileCount:2,
    topFiles:[{file:'roblox-games/foundation-first-demo/client/Game.client.luau',score:30}],
    sourceAnchors:[{file:'roblox-games/foundation-first-demo/client/Game.client.luau',line:12,kind:'FUNCTION',symbol:'renderWorld',context:'local function renderWorld()',score:40}],
    signals:{combat:8,progression:8,ai:3,save:2,multiplayer:2,animation:0,vfx:0,camera:0,ui:5,uiFlow:3,input:3,map:6,landmark:2,interaction:4,inventory:1,equipment:1,settings:1,feedback:4,session:3,content:10,choice:3,connection:3,performance:3,lighting:0,primitive:20,todo:0,errorRecovery:3},
    observations:['CURRENT_SOURCE_FILES=2','PLACEHOLDER_OR_PRIMITIVE_USAGE_HIGH','MOTION_IMPLEMENTATION_SPARSE']
  };
  const first=buildGameSpecificBuildUpDirective({
    gameId:'foundation-first-demo',
    designRecord:design(),
    sourceObservation:visualSource,
    qualitySignals:['visual placeholder debt']
  });
  assert.equal(first.primaryFocus,'PRESENTATION');
  const second=buildGameSpecificBuildUpDirective({
    gameId:'foundation-first-demo',
    designRecord:design(),
    sourceObservation:{...visualSource,sourceTreeFingerprint:'8'.repeat(64)},
    previousDirective:first,
    previousDirectiveOutcome:'verified',
    runtimeEvidence:{
      runtimeObserved:true,
      runtimePassed:false,
      failureStage:'F4_PHYSICS_AND_MOVEMENT',
      failureSignature:'PLAYER_MOVEMENT_BLOCKED',
      blockers:['INPUT_NOT_REACHING_MOVEMENT_STATE']
    }
  });
  assert.equal(second.effectivenessMeasurement.previousGeneration.classification,'REGRESSION');
  assert.equal(second.nextActionDecision.action,'CAUSAL_REPAIR');
  assert.equal(second.primaryFocus,'STABILITY');
  assert.match(second.primaryGoalReason,/콘텐츠·그래픽 확장보다 기본 플레이 foundation/);
  assert.equal(second.autonomousContentExpansion.contentExpansionDeferredUntilRuntimeRepairPass,true);
  assert.equal(second.autonomousContentExpansion.themeCoverageAdvanced,false);
  assert.equal(second.autonomousContentExpansion.themeDepth,first.autonomousContentExpansion.themeDepth);
  assert.deepEqual(second.autonomousContentExpansion.themeCoverageLedger.counts,first.autonomousContentExpansion.themeCoverageLedger.counts);
  assert.deepEqual(second.autonomousContentExpansion.themeCoverageLedger.sequence,first.autonomousContentExpansion.themeCoverageLedger.sequence);
  assert.equal(second.autonomousContentExpansion.coherentContentBundle.length,0);
});

test('source-generation failure without runtime observation keeps the current BUILD_UP focus',()=>{
  const source={
    sourceRoot:'roblox-games/source-retry-demo',
    sourceTreeFingerprint:'5'.repeat(64),
    fileCount:1,
    topFiles:[],
    sourceAnchors:[],
    signals:{combat:8,progression:8,ai:3,save:2,multiplayer:0,animation:0,vfx:0,camera:0,ui:5,uiFlow:3,input:3,map:3,landmark:1,interaction:3,inventory:0,equipment:0,settings:1,feedback:3,session:2,content:6,choice:2,connection:2,performance:2,lighting:0,primitive:20,todo:0,errorRecovery:2},
    observations:['PLACEHOLDER_OR_PRIMITIVE_USAGE_HIGH']
  };
  const first=buildGameSpecificBuildUpDirective({
    gameId:'source-retry-demo',designRecord:design(),sourceObservation:source,qualitySignals:['visual placeholder debt']
  });
  assert.equal(first.primaryFocus,'PRESENTATION');
  const retry=buildGameSpecificBuildUpDirective({
    gameId:'source-retry-demo',
    designRecord:design(),
    sourceObservation:source,
    previousDirective:first,
    previousDirectiveOutcome:'failed'
  });
  assert.equal(retry.effectivenessMeasurement.previousGeneration.classification,'REGRESSION');
  assert.equal(retry.nextActionDecision.action,'CAUSAL_REPAIR');
  assert.equal(retry.primaryFocus,'PRESENTATION');
  assert.equal(retry.autonomousContentExpansion.contentExpansionDeferredUntilRuntimeRepairPass,false);
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
  assert.equal(directive.primaryFocus,'STABILITY');
  assert.match(directive.thisLoopPrimaryGoal,/현재 실패 근거/);
  assert.match(directive.primaryGoalReason,/runtime 실패/);
  assert.equal(directive.autonomousContentExpansion.contentExpansionDeferredUntilRuntimeRepairPass,true);
  assert.equal(directive.autonomousContentExpansion.themeCoverageAdvanced,false);
  assert.equal(directive.autonomousContentExpansion.coherentContentBundle.length,0);
  assert.ok(directive.autonomousContentExpansion.completionAcceptance.includes('RUNTIME_FAILURE_CAUSAL_REPAIR_PASS_REQUIRED_BEFORE_CONTENT_EXPANSION'));
  assert.match(directive.nextActionDecision.reason,/failure|regression/i);
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
  assert.equal(second.autonomousContentExpansion.themeDepth,first.autonomousContentExpansion.themeDepth);
  assert.deepEqual(second.autonomousContentExpansion.themeCoverageLedger.counts,first.autonomousContentExpansion.themeCoverageLedger.counts);
  assert.deepEqual(second.autonomousContentExpansion.themeCoverageLedger.sequence,first.autonomousContentExpansion.themeCoverageLedger.sequence);
  assert.equal(second.autonomousContentExpansion.contentExpansionDeferredUntilRuntimeRepairPass,true);
  assert.equal(second.autonomousContentExpansion.themeCoverageAdvanced,false);
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
  assert.equal(d.primaryFocus,'STABILITY');
  assert.equal(d.autonomousContentExpansion.executionMode,'CAUSAL_REPAIR_FIRST_KEEP_EXPANSION_CONTEXT');
  assert.equal(d.autonomousContentExpansion.contentExpansionDeferredUntilRuntimeRepairPass,true);
  assert.equal(d.autonomousContentExpansion.coherentContentBundle.length,0);
  assert.equal(d.autonomousContentExpansion.derivedRuleEvolution.allowed,false);
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


test('the one approved design binds MAIN, A, B, c and @ to three real native source roots without runtime PASS',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-to-native-coding-'));
  const gameId='design-native-example';
  const robloxServer='roblox-games/'+gameId+'/server/Game.server.luau';
  const robloxClient='roblox-games/'+gameId+'/client/Game.client.luau';
  const unityCore='unity-games/'+gameId+'/Assets/Scripts/GameCore.cs';
  const unityVisual='unity-games/'+gameId+'/Assets/Scripts/GameVisuals.cs';
  const create=(file,body)=>{const full=path.join(root,file);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,body);};
  const roles=['MAIN','A','B','c','DELVE'];
  const signedDesign={
    identity:'검사 게임의 하나의 공통 원본',
    coreFun:'전투와 탐험을 통한 공동 상태변화',
    coreLoop:['준비','협동 전투','보상·재시도'],
    multiplayerMode:'COOP',
    signatureSystems:roles.map((role,index)=>({
      grammarRole:role,id:'rule-'+index,name:'실제 설계 역할 '+role,
      purpose:'이 역할은 공통 원본에서 연결된 상태를 바꾸는 규칙이다',
      playerChoice:'현재 입력과 타인의 상태를 비교하여 다음 행동을 선택한다',
      stateInputs:['WorldState'],stateOutputs:['WorldState']
    })),
    systemInterconnections:roles.map((role,index)=>({
      fromId:'rule-'+index,toId:'rule-'+((index+1)%roles.length),stateKeys:['WorldState'],
      fromSystem:role,toSystem:roles[(index+1)%roles.length],
      trigger:'상태가 변경되었을 때',stateChange:'두 시스템이 같은 값으로 이어진다'
    })),
    platformProfiles:{
      ROBLOX:{platform:'ROBLOX'},
      UNITY:{platform:'UNITY',unityWebSpatialPresentation:{
        dimension:'3D',worldDepth:'실제 3D 메시 캐릭터와 배경 지형이 고도와 깊이를 가진 Unity 월드에 놓인다',
        cameraAndOcclusion:'월드 높이별 카메라 오클루전과 캐릭터 앞뒤 물체 가림을 구현한다',
        lightingAndMaterials:'게임 월드 재질과 방향 광원을 사용해 캐릭터 발밑의 접지 그림자와 배경 높이차를 실제 장면에 구현한다',
        mobileWebglEvidence:'모바일 Unity WebGL 두 클라이언트에서 조명·깊이·공동 전투·재접속을 실행하여 촬영한다'
      }}
    }
  };
  try{
    create(robloxServer,'local function AttackEnemy(player, enemy) enemy.Health -= 3 end\n');
    create(robloxClient,'local function InputAction() return true end\n');
    create(unityCore,'public class GameCore { public int Health=10; public void Attack(){ Health--; } }\n');
    create(unityVisual,'public class GameVisuals { public void Render(){} }\n');
    const roots=[
      ['ROBLOX','roblox-games/'+gameId,[robloxServer,robloxClient]],
      ['UNITY_WEB','unity-games/'+gameId,[unityCore,unityVisual]],
      ['UNITY_APP','unity-games/'+gameId,[unityCore,unityVisual]]
    ];
    for(const [platform,sourceRoot,expectedFiles] of roots){
      const observed=inspectGameSources({repoRoot:root,sourceRoots:[sourceRoot]});
      const trace=buildDesignToPlatformCodingTrace({
        gameId,design:signedDesign,platform,repoRoot:root,sourceRoot,
        sourceObservation:observed,responsibleFiles:expectedFiles,multiplayerRequired:true
      });
      assert.equal(trace.activePlatform,platform);
      assert.equal(trace.platformCodingPlans.length,3);
      assert.equal(trace.platformCodingPlans.find(x=>x.platform==='UNITY_WEB').canonicalGameSourceRoot,
        trace.platformCodingPlans.find(x=>x.platform==='UNITY_APP').canonicalGameSourceRoot);
      assert.equal(trace.minimumParticipants,2);
      assert.ok(trace.platformCodingPlans.every(row=>row.minimumRenderedDimension==='3D'));
      assert.equal(trace.sourceImplementationPassed,false);
      assert.equal(trace.actualTwoClientPassed,false);
      assert.equal(trace.independentQaPassed,false);
      assert.equal(trace.codingReviewState,'SOURCE_CANDIDATES_PRESENT_NOT_IMPLEMENTATION_PASS');
      assert.deepEqual(trace.roleBindings.map(x=>x.role),['MAIN','A','B','c','@']);
      assert.deepEqual(trace.roleBindings.map(x=>x.systemId),roles.map((_,i)=>'rule-'+i));
      assert.ok(trace.roleBindings.every(x=>x.suggestedExistingOwnerFiles.every(file=>expectedFiles.includes(file))));
      assert.ok(trace.roleBindings.every(x=>x.codingStatus==='SOURCE_OWNER_CANDIDATE_UNVERIFIED'));
      const directive=buildGameSpecificBuildUpDirective({
        gameId,gameName:'원본 테스트',platform,repoRoot:root,sourceRoot,
        designRecord:{content:signedDesign},sourceObservation:observed,responsibleFiles:expectedFiles
      });
      const grammar=directive.identityReinforcement.causalGrammarEvidence.existingGameGrammarMap;
      assert.equal(grammar.roleSystemIds.A,'rule-1','the first authored system is MAIN, not A');
      assert.equal(grammar.roleSystemIds.B,'rule-2','the second authored system is A, not B');
      assert.equal(grammar.majorAxes[0].name,'실제 설계 역할 A');
      assert.equal(grammar.majorAxes[1].name,'실제 설계 역할 B');
      assert.equal(directive.designToPlatformCodingTrace.activePlatform,platform);
      assert.equal(directive.designToPlatformCodingTrace.designFingerprint,directive.designFingerprint);
      assert.match(directivePrompt(directive),/DESIGN_TO_PLATFORM_CODING_CHECK:/);
      assert.match(directivePrompt(directive),/CODING_IMPLEMENTATION_VERDICT:/);
      assert.equal(directive.designToPlatformCodingTrace.sourceImplementationPassed,false);
    }
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('design-to-native trace is fail-closed for absent owners, incomplete roles and flat Unity WebGL',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'native-coding-missing-'));
  try{
    const gameId='missing-coding-test';
    const sourceRoot='unity-games/'+gameId;
    const pathToMarker='Assets/Scripts/Marker.cs';
    const target=path.join(root,sourceRoot,pathToMarker);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,'// MAIN A B c @ MULTIPLAYER PASS 3D\n');
    const d={multiplayerMode:'SINGLE',signatureSystems:[{id:'fake',grammarRole:'MAIN',
      name:'메인',stateInputs:['input'],stateOutputs:['output']}],platformProfiles:{UNITY:{
      unityWebSpatialPresentation:{dimension:'2D',worldDepth:'3D'}
    }}};
    const observation=inspectGameSources({repoRoot:root,sourceRoots:[sourceRoot]});
    const trace=buildDesignToPlatformCodingTrace({gameId,design:d,platform:'UNITY_WEB',
      sourceRoot,sourceObservation:observation,responsibleFiles:[sourceRoot+'/'+pathToMarker],
      repoRoot:root,multiplayerRequired:true});
    assert.ok(trace.gapReasons.includes('MULTIPLAYER_DESIGN_MODE_MISSING'));
    assert.ok(trace.gapReasons.includes('UNITY_WEB_DESIGN_SPATIAL_DEPTH_MISSING'));
    assert.ok(trace.gapReasons.includes('DESIGN_MAIN_A_B_c_AT_INCOMPLETE'));
    assert.ok(trace.gapReasons.includes('EXECUTABLE_GAMEPLAY_SOURCE_NOT_FOUND'));
    assert.deepEqual(trace.executableCodeCandidateFiles,[]);
    assert.ok(trace.roleBindings.every(row=>row.codingStatus==='SOURCE_OWNER_ONLY_DECLARATIVE_OR_COMMENT'));
    assert.equal(trace.sourceImplementationPassed,false,'decorative markers are never implementation evidence');
    assert.equal(trace.actualWebglRenderPassed,false);
    const wrongGame=buildDesignToPlatformCodingTrace({gameId:'different-game',design:d,
      platform:'ROBLOX',sourceObservation:observation,responsibleFiles:[sourceRoot+'/'+pathToMarker],
      repoRoot:root,multiplayerRequired:true});
    assert.ok(wrongGame.gapReasons.includes('NATIVE_GAME_CODE_OWNER_MISSING'));
    assert.equal(wrongGame.observedGameCodeFiles.length,0);
    const other='unity-games/other-game/Assets/Scripts/GameCore.cs';
    fs.mkdirSync(path.dirname(path.join(root,other)),{recursive:true});
    fs.writeFileSync(path.join(root,other),'class Remote { void Attack(){} }\\n');
    const escaped=sourceRoot+'/../other-game/Assets/Scripts/GameCore.cs';
    const swapped=buildDesignToPlatformCodingTrace({
      gameId,design:d,platform:'UNITY_WEB',repoRoot:root,sourceRoot,
      sourceObservation:{sourceRoot,sourceTreeFingerprint:'fake',topFiles:[{file:escaped}],sourceAnchors:[]},
      responsibleFiles:[escaped],multiplayerRequired:true
    });
    assert.equal(swapped.observedGameCodeFiles.length,0,'another game cannot count as this game code');
    if(process.platform!=='win32'){
      const shortcut=path.join(root,sourceRoot,'Assets','Scripts','Remote.cs');
      fs.symlinkSync(path.join(root,other),shortcut);
      const linked=buildDesignToPlatformCodingTrace({
        gameId,design:d,platform:'UNITY_WEB',repoRoot:root,sourceRoot,
        sourceObservation:{sourceRoot,sourceTreeFingerprint:'fake',topFiles:[{file:sourceRoot+'/Assets/Scripts/Remote.cs'}],sourceAnchors:[]},
        responsibleFiles:[sourceRoot+'/Assets/Scripts/Remote.cs'],multiplayerRequired:true
      });
      assert.equal(linked.observedGameCodeFiles.length,0,'cross-game symlink cannot count as current game code');
    }
    const worker=fs.readFileSync('tools/vibe2-source-worker.mjs','utf8');
    assert.match(worker,/designCodeRole=/);
    assert.match(worker,/designCodeVerification=/);
    assert.match(worker,/KEEP EVERY MAIN\/A\/B\/c\/@ ROLE/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('focused and oversized Vibe source prompt retains all five designer-to-code roles',()=>{
  const worker=fs.readFileSync('tools/vibe2-source-worker.mjs','utf8');
  const start=worker.indexOf('function gameSpecificBuildUpDirectiveGuidance(');
  const finish=worker.indexOf('export function buildRobloxNativeSourceInspection',start);
  assert.ok(start>=0&&finish>start);
  const {guide,compact}=runInNewContext(worker.slice(start,finish)
    +'\n({guide:gameSpecificBuildUpDirectiveGuidance,compact:buildUpDirectiveBlockFromPrompt})',{
      clean:v=>String(v??'').trim(),posix:v=>String(v??'').replaceAll('\\\\','/'),
      unique:v=>[...new Set(v)],robloxProductionPromptLines:()=>[],
      boundedPromptText:(v,max)=>String(v).slice(0,Math.max(256,Number(max)||768)),
      COMPACT_DIRECTIVE_LINE_BYTES:768,SOURCE_REPAIR_DIRECTIVE_PREFIXES:[],
      Buffer,console:{log(){}}
    });
  const owner='roblox-games/demo/server/Game.server.luau';
  const roles=['MAIN','A','B','c','@'];
  const row={directiveId:'demo',gameId:'demo',generation:1,
    gameIdentityAndNonNegotiables:{identity:'공통 원본'},
    thisLoopPrimaryGoal:'CODE_OWNER_REPAIR '.repeat(2400),
    designToPlatformCodingTrace:{
      activePlatform:'ROBLOX',multiplayerMode:'COOP',minimumParticipants:2,
      platformCodingPlans:[{platform:'ROBLOX',canonicalGameSourceRoot:'roblox-games/demo'}],
      roleBindings:roles.map((role,index)=>({
        role,systemId:'system-'+index,stateInputs:['CurrentState'],
        stateOutputs:['NextState'],suggestedExistingOwnerFiles:[owner],
        codingStatus:'SOURCE_OWNER_CANDIDATE_UNVERIFIED'
      }))
    }
  };
  const original=guide({target:'roblox',gameId:'demo',buildUpDirective:row},[owner]);
  for(const variant of [
    original,
    compact(original,{compact:true,responsiblePaths:[owner]}),
    compact(original,{compact:true,focusedRobloxVisual:true,selectedPath:owner})
  ]){
    for(const role of roles)assert.ok(variant.includes('designCodeRole='+role+';'),
      role+' source requirement must survive focused/oversized recovery');
    assert.match(variant,/designCodePlatform=ROBLOX/);
    assert.match(variant,/designCodeBinding=design:/);
    assert.match(variant,/designCodeVerification=/);
  }
});

// 설계 → 콘텐츠 분량 → 실제 구현의 항목별 연결은 수량만으로 PASS가 될 수 없다.
test('design volume tracks every authored system, region, encounter, ability and milestone without pretending runtime PASS',()=>{
  const approved=design();
  approved.content.signatureSystems[0].id='habitat-rule';
  approved.content.signatureSystems[0].stateInputs=['wave'];
  approved.content.signatureSystems[0].stateOutputs=['habitat'];
  approved.content.systemInterconnections=[{
    fromId:'habitat-rule',toId:'predator-rule',fromSystem:'서식지 상성',toSystem:'포식 관계',
    stateKeys:['habitat'],trigger:'웨이브 시작',stateChange:'배치 상성 상태 변경'
  }];
  approved.content.contentExpansionPlan=[
    {milestone:'온실 해금',newGameplay:'북쪽 경로와 온실 전투가 이어진다',systemImpact:'서식지 선택과 다음 웨이브 상태 연결'}
  ];
  approved.content.contentVarietyPlan={
    regions:[{id:'north-greenhouse',name:'북쪽 온실',traversal:'우회 통로',riskReward:'위험 지역',
      landmark:'온실 지붕',encounterPattern:'매복 해충',resourcePressure:'회복 자원',storyContext:'곤충 침입'}],
    enemiesOrChallenges:[
      {name:'매복 해충',behavior:'은신 후 돌진',counterplay:'행동 전조 때 이동',positioning:'온실 가장자리',
        timing:'전조 시간',mobility:'빠른 돌진',groupRole:'선봉',identity:'유리창 해충',rewardMeaning:'온실 열쇠'}
    ],
    objectives:[{role:'온실 조사',variation:'방어 완료 뒤 조사 가능'}],
    abilities:[{id:'sting',name:'침 공격',cooldownSeconds:5,cost:2,trigger:'적 접근',
      effect:'해충 이동 정지',playerChoice:'사용 시점 선택'}],
    roleTransitions:[{humanId:'keeper',humanTool:'채집 도구',changedChoice:'감염 후 경로 선택'}],
    antiMonotonyRule:'반복 웨이브마다 위치와 적 역할 차이가 있어야 한다.'
  };
  approved.content.narrativeDialoguePlan={applicable:true,questStates:['온실 조사 완료 후 다음 단서 노출'],plotBeats:[],sceneBeats:[]};
  approved.content.implementationTraceability=[
    {designElement:'북쪽 온실',responsibleSystem:'기존 지역 상태',validationEvidence:'실제 온실 지역 진입·보상·다음 목표 상태 검수'}
  ];
  const owner='roblox-games/volume-demo/server/Game.server.luau';
  const sourceObservation={
    sourceRoot:'roblox-games/volume-demo',sourceTreeFingerprint:'c'.repeat(64),fileCount:1,
    sourceAnchors:[{file:owner,line:24,symbol:'north-greenhouse',kind:'STATE',context:'north-greenhouse',score:18}],
    topFiles:[{file:owner,score:20}],observations:[],
    signals:{progression:1,content:1,map:1,combat:1,interaction:1,save:1}
  };
  const d=buildGameSpecificBuildUpDirective({
    gameId:'volume-demo',gameName:'정원 방어',platform:'ROBLOX',
    designRecord:approved,sourceObservation,responsibleFiles:[owner]
  });
  const volume=d.designedGameVolume;
  assert.equal(volume.mode,'APPROVED_DESIGN_TO_NATIVE_CONTENT_IMPLEMENTATION');
  assert.equal(volume.authoredCounts.CORE_LOOP,5);
  assert.equal(volume.authoredCounts.SIGNATURE_SYSTEM,2);
  assert.equal(volume.authoredCounts.SYSTEM_CONNECTION,1);
  assert.equal(volume.authoredCounts.CONTENT_MILESTONE,1);
  assert.equal(volume.authoredCounts.VARIETY_REGIONS,1);
  assert.equal(volume.authoredCounts.VARIETY_ENEMIESORCHALLENGES,1);
  assert.equal(volume.authoredCounts.VARIETY_OBJECTIVES,1);
  assert.equal(volume.authoredCounts.VARIETY_ABILITIES,1);
  assert.equal(volume.authoredCounts.VARIETY_ROLETRANSITIONS,1);
  assert.equal(volume.authoredCounts.NARRATIVE_QUESTSTATES,1);
  assert.equal(volume.authoredCounts.IMPLEMENTATION_TRACE,1);
  assert.equal(volume.authoredItemCount,Object.values(volume.authoredCounts).reduce((a,b)=>a+b,0));
  assert.equal(volume.implementationVerifiedCount,0);
  assert.equal(volume.runtimeVerifiedCount,0);
  assert.equal(volume.noArbitraryContentQuota,true);
  assert.ok(volume.items.every(row=>row.implementationVerified===false&&row.runtimeVerified===false));
  const region=volume.items.find(row=>row.family==='VARIETY_REGIONS');
  assert.equal(region.sourceEvidenceState,'EXACT_NAME_SOURCE_CANDIDATE_UNVERIFIED');
  assert.equal(region.sourceCandidates[0].file,owner);
  assert.ok(region.requiredBehavior.includes('NATIVE_3D_REGION_ENTRY_EXIT_AND_ROUTE_REACHABLE'));
  assert.equal(region.buildUpStatus,'AUTHORED_REQUIREMENTS_NOT_YET_NATIVE_IMPLEMENTATION_VERIFIED');
  assert.match(region.observableAcceptance,/온실 지역 진입/);
  const enemy=volume.items.find(row=>row.family==='VARIETY_ENEMIESORCHALLENGES');
  assert.equal(enemy.sourceEvidenceState,'EXACT_SOURCE_OWNER_REVIEW_REQUIRED');
  assert.equal(enemy.playerChoice,'행동 전조 때 이동');
  assert.ok(enemy.requiredBehavior.includes('TELEGRAPH_AND_PLAYER_COUNTERPLAY_OBSERVABLE'));
  const ability=volume.items.find(row=>row.family==='VARIETY_ABILITIES');
  assert.equal(ability.designDetail.cooldownSeconds,5,'authored combat balance must stay unchanged');
  assert.equal(ability.designDetail.cost,2);
  assert.ok(ability.requiredBehavior.includes('EXACT_APPROVED_OWNER_TRIGGER_RANGE_RESOURCE_COST_COOLDOWN_PRESERVED'));
  assert.equal(volume.coverageState,'DESIGN_CONTENT_INDEXED_NATIVE_IMPLEMENTATION_AND_RUNTIME_PENDING');
  const prompt=directivePrompt(d);
  assert.match(prompt,/DESIGNED_GAME_VOLUME:.*countsAreNotPass=true/);
  assert.match(prompt,/VARIETY_REGIONS\[0\] 북쪽 온실/);
  assert.match(prompt,/NARRATIVE_QUESTSTATES\[0\]/);
  assert.ok(d.acceptanceEvidence.includes('DESIGNED_SYSTEM_CONTENT_VOLUME_TRACED_TO_EXACT_SOURCE_AND_PLAY_EVIDENCE'));
});

test('source-safe designless build-up never invents volume and 2.5D Unity Web design fails the 3D gate',()=>{
  const owner='unity-games/volume-demo/Assets/Scripts/GameCore.cs';
  const obs={sourceRoot:'unity-games/volume-demo',sourceTreeFingerprint:'d'.repeat(64),
    fileCount:1,sourceAnchors:[],topFiles:[{file:owner,score:10}],observations:[],signals:{ui:3}};
  const safe=buildGameSpecificBuildUpDirective({
    gameId:'volume-demo',platform:'UNITY_WEB',requestedFocus:'USABILITY',safeDesignlessMode:true,
    designRecord:design(),sourceObservation:obs,responsibleFiles:[owner]
  });
  assert.equal(safe.designedGameVolume.mode,'SOURCE_SAFE_NO_DESIGN_CONTENT_EXPANSION');
  assert.deepEqual(safe.designedGameVolume.items,[]);
  const detailed=design().content;
  detailed.platformProfiles.UNITY.unityWebSpatialPresentation={
    dimension:'2.5D',worldDepth:'real depth needs verification '.repeat(2),
    cameraAndOcclusion:'perspective requires proper evidence '.repeat(2),
    lightingAndMaterials:'mesh materials need evidence '.repeat(2),
    mobileWebglEvidence:'mobile mesh evidence required '.repeat(2)
  };
  const flat=buildDesignToPlatformCodingTrace({
    gameId:'volume-demo',platform:'UNITY_WEB',design:detailed,
    sourceRoot:'unity-games/volume-demo',sourceObservation:obs,responsibleFiles:[owner],multiplayerRequired:false
  });
  assert.ok(flat.gapReasons.includes('UNITY_WEB_DESIGN_SPATIAL_DEPTH_MISSING'));
  assert.equal(flat.platformCodingPlans.find(row=>row.platform==='UNITY_WEB').minimumRenderedDimension,'3D');
  detailed.platformProfiles.UNITY.unityWebSpatialPresentation.dimension='3D';
  const spatial=buildDesignToPlatformCodingTrace({
    gameId:'volume-demo',platform:'UNITY_WEB',design:detailed,
    sourceRoot:'unity-games/volume-demo',sourceObservation:obs,responsibleFiles:[owner],multiplayerRequired:false
  });
  assert.ok(!spatial.gapReasons.includes('UNITY_WEB_DESIGN_SPATIAL_DEPTH_MISSING'));
  assert.equal(spatial.sourceImplementationPassed,false,'authored 3D design is not executable runtime proof');
});

test('focused game worker keeps one exact approved content item in compact source instructions',()=>{
  const worker=fs.readFileSync('tools/vibe2-source-worker.mjs','utf8');
  const start=worker.indexOf('function gameSpecificBuildUpDirectiveGuidance(');
  const finish=worker.indexOf('export function buildRobloxNativeSourceInspection',start);
  const {guide,compact}=runInNewContext(worker.slice(start,finish)
    +'\n({guide:gameSpecificBuildUpDirectiveGuidance,compact:buildUpDirectiveBlockFromPrompt})',{
      clean:v=>String(v??'').trim(),posix:v=>String(v??'').replaceAll('\\','/'),
      unique:v=>[...new Set(v)],robloxProductionPromptLines:()=>[],
      boundedPromptText:(v,max)=>String(v).slice(0,Math.max(256,Number(max)||768)),
      COMPACT_DIRECTIVE_LINE_BYTES:768,SOURCE_REPAIR_DIRECTIVE_PREFIXES:[],
      Buffer,console:{log(){}}
    });
  const owner='roblox-games/game-one/server/Game.server.luau';
  const row={directiveId:'content-one',gameId:'game-one',generation:1,primaryFocus:'PROGRESSION',
    gameIdentityAndNonNegotiables:{identity:'정원 방어'},
    designedGameVolume:{version:1,mode:'APPROVED_DESIGN_TO_NATIVE_CONTENT_IMPLEMENTATION',
      authoredItemCount:2,namedSourceCandidateCount:1,sourceReviewRequiredCount:1,runtimeVerifiedCount:0,
      items:[{ref:'VARIETY_REGIONS[0]',family:'VARIETY_REGIONS',title:'북쪽 온실',
        sourceCandidates:[{file:owner}],sourceEvidenceState:'EXACT_NAME_SOURCE_CANDIDATE_UNVERIFIED',
        designDetail:{id:'north',name:'북쪽 온실',traversal:'우회 경로',landmark:'온실 지붕',encounterPattern:'매복 해충'},
        requiredBehavior:['NATIVE_3D_REGION_ENTRY_EXIT_AND_ROUTE_REACHABLE','DISCOVERY_NEXT_OBJECTIVE_AND_RETURN_REASON_CONNECTED'],
        trigger:'우회로 개방',playerChoice:'새 경로 선택',stateChange:'새 전투 개방',
        observableAcceptance:'실제 지역 이동 후 상태 저장 검증'}]}
  };
  const original=guide({target:'roblox',gameId:'game-one',buildUpDirective:row},[owner]);
  assert.match(original,/contentVolume=authored:2/);
  assert.match(original,/volumeImplementation=ref:VARIETY_REGIONS\[0\]/);
  assert.match(original,/flat 2D or 2.5D cannot be a final PASS/);
  const compacted=compact(original,{compact:true,responsiblePaths:[owner]});
  assert.match(compacted,/volumeImplementation=ref:VARIETY_REGIONS\[0\]/);
  assert.match(compacted,/contentVolume=authored:2/);
  assert.match(compacted,/volumeSpec=WORLD:/);
  assert.match(compacted,/encounterPattern/);
  assert.match(compacted,/volumeRequiredBehavior=NATIVE_3D_REGION_ENTRY_EXIT_AND_ROUTE_REACHABLE/);
});

test('large authored game content volume keeps all entries without cloning a full implementation prompt per item',()=>{
  const d=design();
  d.content.contentVarietyPlan={
    regions:[],enemiesOrChallenges:[],objectives:[],antiMonotonyRule:'기존 규칙을 보존한다',
    abilities:Array.from({length:64},(_,index)=>({
      id:'ability-'+index,name:'전용 행동 '+index,kind:'ACTIVE',
      trigger:'입력 후 기존 조건 확인',cooldownSeconds:index+1,cost:index,
      effect:'현재 플레이어 행동과 기존 상태를 연결한다'
    }))
  };
  const sourceObservation={
    sourceRoot:'roblox-games/volume-large',sourceTreeFingerprint:'e'.repeat(64),
    sourceAnchors:[],topFiles:[{file:'roblox-games/volume-large/server/Game.server.luau',score:10}],
    observations:[],signals:{combat:1,progression:1,content:1,session:1}
  };
  const directive=buildGameSpecificBuildUpDirective({
    gameId:'volume-large',platform:'ROBLOX',designRecord:d,sourceObservation,
    responsibleFiles:['roblox-games/volume-large/server/Game.server.luau']
  });
  const abilities=directive.designedGameVolume.items.filter(row=>row.family==='VARIETY_ABILITIES');
  assert.equal(abilities.length,64);
  assert.equal(abilities[63].ref,'VARIETY_ABILITIES[63]');
  assert.equal(abilities[63].designDetail.cooldownSeconds,64);
  assert.ok(abilities.every(row=>row.runtimeVerified===false));
  assert.equal(directive.designedGameVolume.noArbitraryContentQuota,true);
  const prompt=directivePrompt(directive);
  assert.match(prompt,/VARIETY_ABILITIES\[0\] 전용 행동 0/);
  assert.match(prompt,/VARIETY_ABILITIES\[63\] 전용 행동 63/);
  assert.ok(prompt.length<75000,'content index should not repeat the full implementation blueprint for every item');
});


test('volume index retains every approved item beyond existing compact context budgets',()=>{
  const approved=design();
  approved.content.coreLoop=Array.from({length:15},(_,index)=>'단계 '+index);
  approved.content.signatureSystems=Array.from({length:18},(_,index)=>({
    id:'system-'+index,name:'게임 시스템 '+index,
    purpose:'현재 상태로 동작',playerChoice:'현재 선택 보존'
  }));
  approved.content.systemInterconnections=Array.from({length:27},(_,index)=>({
    fromId:'system-'+(index%18),toId:'system-'+((index+1)%18),
    fromSystem:'시스템 '+index,toSystem:'시스템 '+(index+1),
    trigger:'기존 상태 전환',stateChange:'연결된 상태 전환'
  }));
  approved.content.contentExpansionPlan=Array.from({length:14},(_,index)=>({
    milestone:'구간 '+index,newGameplay:'기존 조건에 연결된 구간',
    systemImpact:'기존 목표 이어가기'
  }));
  approved.content.implementationTraceability=Array.from({length:20},(_,index)=>({
    designElement:'게임 시스템 '+index,responsibleSystem:'기존 상태 책임',
    validationEvidence:'실제 행동 결과와 재접속 확인'
  }));
  const owner='roblox-games/volume-full/server/Game.server.luau';
  const sourceObservation={sourceRoot:'roblox-games/volume-full',sourceTreeFingerprint:'f'.repeat(64),
    fileCount:1,sourceAnchors:[],topFiles:[{file:owner,score:10}],observations:[],
    signals:{combat:1,progression:1,content:1,save:1}};
  const directive=buildGameSpecificBuildUpDirective({
    gameId:'volume-full',platform:'ROBLOX',designRecord:approved,
    sourceObservation,responsibleFiles:[owner]
  });
  const volume=directive.designedGameVolume;
  assert.equal(volume.authoredCounts.CORE_LOOP,15);
  assert.equal(volume.authoredCounts.SIGNATURE_SYSTEM,18);
  assert.equal(volume.authoredCounts.SYSTEM_CONNECTION,27);
  assert.equal(volume.authoredCounts.CONTENT_MILESTONE,14);
  assert.equal(volume.authoredCounts.IMPLEMENTATION_TRACE,20);
  assert.equal(volume.items.find(row=>row.ref==='CORE_LOOP[14]').title,'단계 14');
  assert.equal(volume.items.find(row=>row.ref==='IMPLEMENTATION_TRACE[19]').title,'게임 시스템 19');
  assert.ok(volume.items.every(row=>row.implementationVerified===false&&row.runtimeVerified===false));
  assert.ok(directivePrompt(directive).includes('CONTENT_MILESTONE[13]'));
  assert.ok(directivePrompt(directive).includes('IMPLEMENTATION_TRACE[19]'));
});

test('preservation-only approved design keeps all volume entries but forbids new gameplay',()=>{
  const approved=design();
  approved.content.preservationContract={
    mode:'PRESERVATION_PRESENTATION_UPGRADE',
    lockedSemantics:['SAVE_KEY_AND_SCHEMA_MEANING','COMBAT_RULES','PROGRESSION','DROPS_AND_REWARDS']
  };
  approved.content.contentExpansionPlan=[
    {milestone:'모션 보정',newGameplay:'새 게임플레이를 추가하지 않고 기존 공격 애니메이션만 개선',
      systemImpact:'기존 타격 데미지·쿨다운·보상을 유지하면서 모션을 개선한다'}
  ];
  const sourceObservation={sourceRoot:'roblox-games/preserve-demo',sourceTreeFingerprint:'a'.repeat(64),
    fileCount:1,sourceAnchors:[],topFiles:[{file:'roblox-games/preserve-demo/client/Game.client.luau',score:20}],
    signals:{animation:1,progression:1,combat:1,content:1},observations:[]};
  const d=buildGameSpecificBuildUpDirective({
    gameId:'preserve-demo',platform:'ROBLOX',designRecord:approved,sourceObservation,
    responsibleFiles:['roblox-games/preserve-demo/client/Game.client.luau']
  });
  assert.equal(d.designedGameVolume.mode,'PRESERVATION_PRESENTATION_MILESTONES_ONLY');
  assert.equal(d.designImplementationContext.preservationContract.mode,'PRESERVATION_PRESENTATION_UPGRADE');
  const milestone=d.designedGameVolume.items.find(row=>row.family==='CONTENT_MILESTONE');
  assert.ok(milestone.requiredBehavior.includes('NO_NEW_GAMEPLAY_RULE_PROGRESSION_BALANCE_SAVE_OR_NETWORK_SEMANTIC'));
  assert.ok(!milestone.requiredBehavior.includes('NEW_GAMEPLAY_CONNECTED_TO_EXISTING_ACTION_REWARD_AND_NEXT_GOAL'));
  assert.equal(d.designedGameVolume.runtimeVerifiedCount,0);

  const worker=fs.readFileSync('tools/vibe2-source-worker.mjs','utf8');
  const start=worker.indexOf('function gameSpecificBuildUpDirectiveGuidance(');
  const finish=worker.indexOf('export function buildRobloxNativeSourceInspection',start);
  const {guide}=runInNewContext(worker.slice(start,finish)
    +'\n({guide:gameSpecificBuildUpDirectiveGuidance})',{
      clean:v=>String(v??'').trim(),posix:v=>String(v??'').replaceAll('\\','/'),
      unique:v=>[...new Set(v)],robloxProductionPromptLines:()=>[],
      boundedPromptText:(v,max)=>String(v).slice(0,Math.max(256,Number(max)||768)),
      COMPACT_DIRECTIVE_LINE_BYTES:768,SOURCE_REPAIR_DIRECTIVE_PREFIXES:[],
      Buffer,console:{log(){}}
    });
  const lines=guide({target:'roblox',gameId:'preserve-demo',
    buildUpDirective:{...d,primaryFocus:'PROGRESSION'}},['roblox-games/preserve-demo/client/Game.client.luau']);
  assert.match(lines,/contentVolume=authored:/);
  assert.doesNotMatch(lines,/volumeImplementation=ref:/,
    'presentation-only preservation must not be executed as a new progression mechanic');
});

 
// 설계 항목별 실제 구현 대기열은 일반적인 런타임 성공이나 세대 변경만으로 건너뛰지 않는다.
test('merged design volume keeps 17 systems 18 connections 3 milestones and 10 elements while scoped runtime evidence controls handoff',()=>{
  const approved=design();
  approved.content.coreLoop=['진입','탐색','선택','판정','다음 목표'];
  approved.content.signatureSystems=Array.from({length:17},(_,i)=>({
    id:'sys-'+i,name:'설계 시스템 '+i,purpose:'권위 상태에 의한 선택',
    playerChoice:'선택 '+i,stateInputs:['world'],stateOutputs:['battle']
  }));
  approved.content.systemInterconnections=Array.from({length:18},(_,i)=>({
    fromId:'sys-'+(i%17),toId:'sys-'+((i+1)%17),
    trigger:'실제 행동',stateChange:'연결 상태 갱신'
  }));
  approved.content.contentExpansionPlan=Array.from({length:3},(_,i)=>({
    milestone:'해금 '+i,newGameplay:'전투 구간 '+i,systemImpact:'다음 목표 '+i
  }));
  approved.content.contentVarietyPlan={
    regions:Array.from({length:9},(_,i)=>({id:'area-'+i,name:'지역 '+i})),
    enemiesOrChallenges:[{name:'지휘관',counterplay:'공격 전조에 회피'}]
  };
  approved.content.implementationTraceability=Array.from({length:10},(_,i)=>({
    designElement:'설계 시스템 '+i,responsibleSystem:'기존 권위 상태',
    validationEvidence:'실제 플레이 입력과 저장 재접속 검증'
  }));
  const owner='roblox-games/volume-scope/server/Game.server.luau';
  const obs={sourceRoot:'roblox-games/volume-scope',sourceTreeFingerprint:'a'.repeat(64),
    topFiles:[{file:owner,score:15}],sourceAnchors:[],observations:[],
    signals:{combat:1,progression:1,save:1,content:1}};
  const create=(previousDirective=null,previousDirectiveOutcome='',fingerprint='a'.repeat(64),runtimeEvidence={})=>
    buildGameSpecificBuildUpDirective({
      gameId:'volume-scope',platform:'ROBLOX',designRecord:approved,
      sourceObservation:{...obs,sourceTreeFingerprint:fingerprint},
      responsibleFiles:[owner],previousDirective,previousDirectiveOutcome,runtimeEvidence
    });
  const first=create();
  const volume=first.designedGameVolume;
  assert.equal(first.designImplementationContext.signatureSystems.length,12,
    'compressed ordinary prompt context is intentionally bounded even when full volume is preserved');
  assert.equal(first.designImplementationContext.systemInterconnections.length,18);
  assert.equal(first.designImplementationContext.contentExpansionPlan.length,3);
  assert.equal(first.designImplementationContext.implementationTraceability.length,8);
  assert.equal(volume.authoredCounts.SIGNATURE_SYSTEM,17);
  assert.equal(volume.authoredCounts.SYSTEM_CONNECTION,18);
  assert.equal(volume.authoredCounts.CONTENT_MILESTONE,3);
  assert.equal(volume.authoredCounts.IMPLEMENTATION_TRACE,10);
  assert.equal(volume.authoredCounts.VARIETY_REGIONS+volume.authoredCounts.VARIETY_ENEMIESORCHALLENGES,10);
  assert.equal(volume.authoredCounts.CORE_LOOP,5);
  assert.equal(volume.selectionVersion,2);
  assert.equal(volume.activeItem.ref,'CORE_LOOP[0]');
  assert.ok(volume.items.every(row=>!row.implementationVerified&&!row.runtimeVerified));
  assert.match(directivePrompt(first),/DESIGNED_GAME_UNIT_SELECTION: active=CORE_LOOP\[0\]/);
  const worker=fs.readFileSync('tools/vibe2-source-worker.mjs','utf8');
  const start=worker.indexOf('function gameSpecificBuildUpDirectiveGuidance(');
  const finish=worker.indexOf('export function buildRobloxNativeSourceInspection',start);
  const {guide,compact}=runInNewContext(worker.slice(start,finish)
    +'\n({guide:gameSpecificBuildUpDirectiveGuidance,compact:buildUpDirectiveBlockFromPrompt})',{
      clean:v=>String(v??'').trim(),posix:v=>String(v??'').replaceAll('\\','/'),
      unique:v=>[...new Set(v)],robloxProductionPromptLines:()=>[],
      boundedPromptText:(v,max)=>String(v).slice(0,Math.max(256,Number(max)||768)),
      COMPACT_DIRECTIVE_LINE_BYTES:768,SOURCE_REPAIR_DIRECTIVE_PREFIXES:[],
      Buffer,console:{log(){}}
    });
  const activePrompt=guide({target:'roblox',gameId:'volume-scope',buildUpDirective:first},[owner]);
  assert.match(activePrompt,/contentUnitSelection=active:CORE_LOOP\[0\]/);
  assert.match(activePrompt,/volumeImplementation=ref:CORE_LOOP\[0\]/);
  const compactPrompt=compact(activePrompt,{compact:true,responsiblePaths:[owner]});
  assert.match(compactPrompt,/contentUnitSelection=active:CORE_LOOP\[0\]/);
  assert.match(compactPrompt,/volumeImplementation=ref:CORE_LOOP\[0\]/);
 
  const generic=create(first,'verified','b'.repeat(64),{runtimeObserved:true,runtimePassed:true});
  assert.equal((generic.designedGameVolume.activeItem||generic.designedGameVolume.deferredItem).ref,volume.activeItem.ref,
    'general runtime success without content-specific replay does not advance the unit');
  assert.equal(generic.designedGameVolume.scopedAdvancementObserved,false);
 
  const failed=create(generic,'failed','c'.repeat(64),{
    runtimeObserved:true,runtimePassed:false,failureStage:'F3',failureSignature:'state-regression'
  });
  assert.equal(failed.primaryFocus,'STABILITY');
  assert.equal(failed.designedGameVolume.activeItem,null);
  assert.equal(failed.designedGameVolume.deferredItem.ref,volume.activeItem.ref);
 
  const restored=create(failed,'verified','d'.repeat(64),{runtimeObserved:true,runtimePassed:true});
  assert.equal(restored.designedGameVolume.activeItem.ref,volume.activeItem.ref,
    'repair of an unrelated foundation error cannot close pending content');
  const scoped=create(restored,'verified','e'.repeat(64),{
    runtimeObserved:true,runtimePassed:true,independentQaPassed:true,regressionPassed:true,
    contentUnitVerification:{
      ref:restored.designedGameVolume.activeItem.ref,directiveId:restored.directiveId,
      gameId:'volume-scope',platform:'ROBLOX',sourceTreeFingerprint:'e'.repeat(64),
      sourceFile:owner,sourceDeltaVerified:true,nativeRuntimeObserved:true,nativeRuntimePassed:true,
      independentQaPassed:true,playerActionStateResultPassed:true,saveReconnectRegressionPassed:true,
      runtimeRunId:'37936660265',evidenceArtifactId:'sha256:'+'7'.repeat(64)
    }
  });
  assert.notEqual((scoped.designedGameVolume.activeItem||scoped.designedGameVolume.deferredItem).ref,volume.activeItem.ref,
    'only a scoped successful native replay may change the selected content item');
  assert.equal(scoped.designedGameVolume.scopedAdvancementObserved,true);
  assert.equal(scoped.designedGameVolume.runtimeVerifiedCount,0,
    'directive planning must not write authoritative runtime PASS');
  assert.ok(scoped.designedGameVolume.items.every(row=>row.runtimeVerified===false));
 
  const wrongSource=create(restored,'verified','f'.repeat(64),{
    runtimeObserved:true,runtimePassed:true,independentQaPassed:true,regressionPassed:true,
    contentUnitVerification:{
      ref:restored.designedGameVolume.activeItem.ref,directiveId:restored.directiveId,
      gameId:'volume-scope',platform:'ROBLOX',sourceTreeFingerprint:'f'.repeat(64),
      sourceFile:'roblox-games/volume-scope/server/Fake.server.luau',
      sourceDeltaVerified:true,nativeRuntimeObserved:true,nativeRuntimePassed:true,
      independentQaPassed:true,playerActionStateResultPassed:true,saveReconnectRegressionPassed:true,
      runtimeRunId:'37936660265',evidenceArtifactId:'sha256:'+'8'.repeat(64)
    }
  });
  assert.equal((wrongSource.designedGameVolume.activeItem||wrongSource.designedGameVolume.deferredItem).ref,volume.activeItem.ref);

  const siblingOwner='roblox-games/volume-scope/client/Other.client.luau';
  const siblingScope=buildGameSpecificBuildUpDirective({
    gameId:'volume-scope',platform:'ROBLOX',designRecord:approved,
    sourceObservation:{...obs,sourceTreeFingerprint:'e'.repeat(64)},
    responsibleFiles:[siblingOwner],
    previousDirective:restored,previousDirectiveOutcome:'verified',
    runtimeEvidence:{
      runtimeObserved:true,runtimePassed:true,independentQaPassed:true,regressionPassed:true,
      contentUnitVerification:{
        ref:restored.designedGameVolume.activeItem.ref,directiveId:restored.directiveId,
        gameId:'volume-scope',platform:'ROBLOX',sourceTreeFingerprint:'e'.repeat(64),
        sourceFile:owner,sourceDeltaVerified:true,nativeRuntimeObserved:true,nativeRuntimePassed:true,
        independentQaPassed:true,playerActionStateResultPassed:true,saveReconnectRegressionPassed:true,
        runtimeRunId:'37936660265',evidenceArtifactId:'sha256:'+'9'.repeat(64)
      }
    }
  });
  assert.equal(siblingScope.designedGameVolume.scopedAdvancementObserved,false,
    'sibling source candidates must not expand the current worker responsible-file authority');
  assert.equal((siblingScope.designedGameVolume.activeItem||siblingScope.designedGameVolume.deferredItem).ref,
    volume.activeItem.ref);
 
  const malformedProof=create(restored,'verified','e'.repeat(64),{
    runtimeObserved:true,runtimePassed:true,independentQaPassed:true,regressionPassed:true,
    contentUnitVerification:{
      ref:restored.designedGameVolume.activeItem.ref,directiveId:restored.directiveId,
      gameId:'volume-scope',platform:'ROBLOX',sourceTreeFingerprint:'e'.repeat(64),
      sourceFile:owner,sourceDeltaVerified:true,nativeRuntimeObserved:true,nativeRuntimePassed:true,
      independentQaPassed:true,playerActionStateResultPassed:true,saveReconnectRegressionPassed:true,
      runtimeRunId:'invented-run',evidenceArtifactId:'verified-by-name'
    }
  });
  assert.equal((malformedProof.designedGameVolume.activeItem||malformedProof.designedGameVolume.deferredItem).ref,volume.activeItem.ref,
    'a free-form marker cannot pass the scoped evidence gate');

  const unassigned='roblox-games/volume-scope/server/Unassigned.server.luau';
  const unassignedProof=buildGameSpecificBuildUpDirective({
    gameId:'volume-scope',platform:'ROBLOX',designRecord:approved,
    sourceObservation:{...obs,sourceTreeFingerprint:'1'.repeat(64),
      topFiles:[{file:owner,score:15},{file:unassigned,score:10}]},
    responsibleFiles:[owner],previousDirective:restored,previousDirectiveOutcome:'verified',
    runtimeEvidence:{
      runtimeObserved:true,runtimePassed:true,independentQaPassed:true,regressionPassed:true,
      contentUnitVerification:{
        ref:restored.designedGameVolume.activeItem.ref,directiveId:restored.directiveId,
        gameId:'volume-scope',platform:'ROBLOX',sourceTreeFingerprint:'1'.repeat(64),
        sourceFile:unassigned,sourceDeltaVerified:true,nativeRuntimeObserved:true,
        nativeRuntimePassed:true,independentQaPassed:true,playerActionStateResultPassed:true,
        saveReconnectRegressionPassed:true,runtimeRunId:'1234567890123',
        evidenceArtifactId:'sha256:'+'9'.repeat(64)
      }
    }
  });
  assert.equal(unassignedProof.designedGameVolume.scopedAdvancementObserved,false,
    'a source-search candidate is not an authorized assigned file');

  approved.content.signatureSystems[16].name='changed late design system';
  const changedDesign=create(scoped,'verified','f'.repeat(64),{
    runtimeObserved:true,runtimePassed:true,independentQaPassed:true,regressionPassed:true
  });
  assert.notEqual(changedDesign.designedGameVolume.authoredDesignFingerprint,
    scoped.designedGameVolume.authoredDesignFingerprint);
  assert.equal(changedDesign.designedGameVolume.scopedAdvancementObserved,false,
    'a changed design cannot inherit previously verified unit progression');
  const restartedRef=(changedDesign.designedGameVolume.activeItem||changedDesign.designedGameVolume.deferredItem).ref;
  const firstForCurrentFocus=changedDesign.primaryFocus==='PROGRESSION'?'CONTENT_MILESTONE[0]':'CORE_LOOP[0]';
  assert.equal(restartedRef,firstForCurrentFocus,
    'changing a late design system resets to the first approved item for the current quality focus');
});
 
test('preservation-only approved design never schedules novel gameplay from the content inventory',()=>{
  const approved=design();
  approved.content.preservationContract={mode:'PRESERVATION_PRESENTATION_UPGRADE'};
  const owner='roblox-games/volume-preserve/client/Game.client.luau';
  const directive=buildGameSpecificBuildUpDirective({
    gameId:'volume-preserve',platform:'ROBLOX',designRecord:approved,
    sourceObservation:{sourceRoot:'roblox-games/volume-preserve',sourceTreeFingerprint:'b'.repeat(64),
      topFiles:[{file:owner,score:10}],sourceAnchors:[],observations:[],
      signals:{combat:0,progression:0,content:1}},
    responsibleFiles:[owner]
  });
  assert.equal(directive.designedGameVolume.mode,'PRESERVATION_PRESENTATION_MILESTONES_ONLY');
  assert.equal(directive.designedGameVolume.activeItem,null);
  assert.equal(directive.designedGameVolume.deferredItem,null);
  assert.equal(directive.designedGameVolume.runtimeVerifiedCount,0);
});
