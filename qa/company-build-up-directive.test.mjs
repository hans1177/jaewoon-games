import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {repairDesignRequiredFields} from '../tools/company-design-prepromotion-repair.mjs';
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
  assert.equal(repaired.value.webCanonicalDesign.role,'WEB_DETAILED_GAME_ORIGINAL');
  assert.equal(repaired.value.webCanonicalDesign.playerFlow.length>=4,true);
  assert.deepEqual(repaired.value.platformExpansionPolicy.sharedLargeFrame,[
    'CORE_IDENTITY',
    'CORE_FUN_AND_REPRESENTATIVE_LOOP',
    'WORLD_AND_PROGRESSION_DIRECTION',
    'SAVE_PERSISTENCE_MEANING',
    'MULTIPLAYER_INTENT'
  ]);
  assert.equal(repaired.value.platformExpansionPolicy.expansionLimit,'NO_ARTIFICIAL_PARITY_LIMIT_WITHIN_SHARED_LARGE_FRAME');
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
  assert.equal(directive.designImplementationContext.uxAccessibilityPlan.touchAndInput,detailed.content.uxAccessibilityPlan.touchAndInput);
  assert.equal(directive.designImplementationContext.webCanonicalDesign.role,'WEB_DETAILED_GAME_ORIGINAL');
  assert.equal(directive.designImplementationContext.platformExpansionPolicy.expansionLimit,'NO_ARTIFICIAL_PARITY_LIMIT_WITHIN_SHARED_LARGE_FRAME');
  assert.equal(directive.designImplementationContext.narrativeDialoguePlan.questStates[0],detailed.content.narrativeDialoguePlan.questStates[0]);
  assert.notEqual(directive.qualityGapMap.find(row=>row.domain==='QUESTS').state,'NOT_APPLICABLE');
  assert.match(directivePrompt(directive),/DESIGN_IMPLEMENTATION_CONTEXT:/);
  assert.match(directivePrompt(directive),/하단 우측 공격 버튼/);
  assert.match(directivePrompt(directive),/온실 단서 조사/);
  assert.match(directivePrompt(directive),/WEB_DETAILED_GAME_ORIGINAL/);
  assert.match(directivePrompt(directive),/NO_ARTIFICIAL_PARITY_LIMIT_WITHIN_SHARED_LARGE_FRAME/);
  assert.match(directivePrompt(directive),/세부 parity 제한을 두지 않는다/);
  const unityDirective=buildGameSpecificBuildUpDirective({gameId:'detail-lineage',gameName:'상세 설계',platform:'UNITY',designRecord:detailed,sourceObservation,responsibleFiles:['roblox-games/detail-lineage/Game.luau']});
  assert.match(directivePrompt(unityDirective),/Unity 전용 시스템·콘텐츠·지역·물리·카메라·애니메이션·세션 구조·UX·연출 확장/);
  assert.match(directivePrompt(unityDirective),/인위적 parity 제한을 두지 않는다/);
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
