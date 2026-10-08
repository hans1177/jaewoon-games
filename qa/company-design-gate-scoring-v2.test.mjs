// 파일명: qa/company-design-gate-scoring-v2.test.mjs
// 설계 게이트 점수와 필수 문법·멀티·공간 그래픽 회귀 검증
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DESIGN_GATE_WEIGHTS,DESIGN_DIRECT_SCORE_LEVELS,DESIGN_CRITICAL_AXIS_MINIMUM_PERCENT,scoreDesignGateV2,validateDesignAuthoringContent} from '../tools/company-design-gate-scoring-v2.mjs';

assert.equal(Object.keys(DESIGN_GATE_WEIGHTS).length,11);
assert.equal(Object.values(DESIGN_GATE_WEIGHTS).reduce((a,b)=>a+b,0),100);
assert.deepEqual([...DESIGN_DIRECT_SCORE_LEVELS],[0,20,40,60,80,100]);
assert.equal(DESIGN_CRITICAL_AXIS_MINIMUM_PERCENT,75);

const seed={
  seedId:'SEED-ROBLOX-TEST-001',generation:'MATERIAL_COMPOSED',SEED_MATERIAL_IDS:['MAT-001','MAT-002'],
  GAME_CATEGORY:'ACTION_SURVIVAL_ROGUELITE',INITIAL_TARGET_PLATFORM:'ROBLOX',MULTIPLAYER_DESIGN_MODE:'SINGLE'
};
const content={
  identity:'A distinct survival action game where every expedition changes the safe route, threat map, and equipment decision before the player commits to the next risk.',
  playerFantasy:'Read a dangerous world, prepare a build, take a calculated risk, survive the consequence, and return stronger.',
  coreFun:'Moment-to-moment survival choices connect movement, combat pressure, resources, upgrades, and recovery into one loop.',
  coreLoop:['Enter a risky region and choose a route based on visible threats and resources.','Fight or evade threats while spending limited resources and changing world state.','Convert the result into upgrades and route options before committing to another run.','Reach a milestone encounter that changes available systems and future choices.'],
  signatureSystems:[
    {name:'Threat Route',purpose:'Connect route selection to enemy pressure and resource access.',playerChoice:'Choose safety, speed, or reward before entering danger.'},
    {name:'Recovery Loadout',purpose:'Connect earned resources to the next survival plan.',playerChoice:'Spend on immediate recovery or long-term build strength.'},
    {name:'Escalation State',purpose:'Connect player success to stronger world responses.',playerChoice:'Push deeper or extract before risk overtakes reward.'}
  ],
  progressionDirection:'Runs produce resources, unlocks, and strategic options while keeping recovery costs and enemy escalation tied to player power.',
  visualDirection:'Readable silhouettes, danger zones, resource landmarks, and consistent combat feedback keep survival decisions legible on mobile.',
  mobileUx:'Touch input separates movement and actions, keeps critical threat information near the play field, and avoids overlapping controls.',
  marketTargetDirection:'Global action-survival players who prefer short readable decisions with persistent progression.',
  steamExpansionDecision:'Platform expansion is evaluated after the Roblox core loop is validated.',
  multiplayerMode:'SINGLE',
  multiplayerExpansionDecision:'Single-player is the current core; multiplayer is not attached without a new design decision.',
  technicalAssumptions:['Server-authoritative rewards are isolated from client presentation.','Core combat, progression, and retry state expose deterministic validation hooks.','Mobile input and viewport constraints are treated as first-class implementation requirements.'],
  validationQuestions:['Does a complete run connect route, threat, resource, reward, failure, and retry state?','Can the player recover from failure without invalidating progression?','Does mobile input preserve the same core decisions as desktop input?'],
  openQuestions:[],
  systemInterconnections:[
    {fromSystem:'Route selection',toSystem:'Threat director',trigger:'Player commits to a route',stateChange:'Threat density and enemy composition update for that route.'},
    {fromSystem:'Threat director',toSystem:'Resource economy',trigger:'Threat encounter resolves',stateChange:'Resource reward and recovery cost change from the result.'},
    {fromSystem:'Resource economy',toSystem:'Progression',trigger:'Player extracts or fails',stateChange:'Upgrade choices and next-run options are recalculated.'},
    {fromSystem:'Progression',toSystem:'Route selection',trigger:'New capability unlocks',stateChange:'Previously unsafe routes become viable choices.'}
  ],
  progressionEconomyBalance:{
    progressionLoop:'Run result becomes resources, resources become upgrades or recovery, and upgrades change the next route decision.',
    resourceFlow:'Rewards enter through encounters and milestones and leave through recovery, equipment, and progression choices.',
    balanceRules:'Enemy escalation, recovery cost, and upgrade strength are checked together so one system cannot erase risk.'
  },
  contentExpansionPlan:[
    {milestone:'Early route-risk foundation',newGameplay:'Introduce route risk and one recovery tradeoff.',systemImpact:'Connect movement, threats, resources, and retry.'},
    {milestone:'Mid build diversification',newGameplay:'Add enemy behavior and build choices that alter route viability.',systemImpact:'Expand progression and threat-system dependencies.'},
    {milestone:'Late extraction pressure',newGameplay:'Add milestone encounters with extraction pressure and new strategic dimensions.',systemImpact:'Change pacing, risk, rewards, and subsequent route options.'},
    {milestone:'Extended regional rule expansion',newGameplay:'Add new region rules rather than numeric-only variants.',systemImpact:'Require new cross-system choices while preserving the validated core.'}
  ],
  failureRetryRisk:{failureStates:['Player health reaches zero during an encounter.','Player exhausts recovery resources before extraction.'],retryFlow:'Failure records the result, returns the player to preparation, and preserves only approved persistent progression.',riskPressure:'Deeper routes raise threat and recovery cost while offering better strategic rewards.',recoveryRules:'Recovery spends bounded resources and cannot directly skip the next gameplay cycle.'},
  platformFitPlan:{targetPlatform:'ROBLOX',inputModel:'Touch and keyboard map to the same movement and core actions without changing rules.',performanceBudget:'Entity and effect counts have explicit caps suitable for mobile Roblox clients.',sessionConstraints:'A complete playable cycle is prioritized first; thirty-minute depth is validated only at the final content-depth gate.'},
  uxAccessibilityPlan:{hudPriorities:'Objective, health, risk, and available action state remain visible without covering the play field.',touchAndInput:'Primary touch targets remain separated and simultaneous movement plus action input is supported.',readability:'Threat, reward, and interactable states use shape, motion, and text rather than color alone.',accessibility:'Critical feedback has redundant visual and textual signals and avoids time-only information where practical.'},
  artAudioDirection:{visualIdentity:'World landmarks and enemy silhouettes reinforce route and threat decisions.',audioIdentity:'Layered cues distinguish danger escalation, reward confirmation, failure, and recovery.',gameplayFeedbackSync:'Animation, VFX, UI, and sound fire from the same gameplay state transitions.'},
  implementationTraceability:[
    {designElement:'Threat route choice',responsibleSystem:'route-and-threat state',validationEvidence:'Record route commit and resulting threat-state transition.'},
    {designElement:'Reward and recovery tradeoff',responsibleSystem:'economy-and-progression state',validationEvidence:'Record earned resources, spend choice, and next-run capability change.'},
    {designElement:'Failure and retry',responsibleSystem:'run lifecycle state',validationEvidence:'Record fail condition, retained progression, reset state, and next valid entry.'},
    {designElement:'Mobile controls',responsibleSystem:'input adapter',validationEvidence:'Validate simultaneous movement and action with no viewport overlap.'}
  ]
};
const designRecord={version:5,sameModelAsDraft:true,unresolvedConflictCount:0,heldCount:0,content};
const cycleStatus={status:'COMPLETE'};
const profile={genre:'Survival',subgenre:'',playMode:'SINGLE'};
const strong=scoreDesignGateV2({seed,designRecord,cycleStatus,robloxGenreProfile:profile});
assert.equal(strong.scoreSystem,'STAGE_GATE_SCORING_V2');
assert.equal(Object.keys(strong.evidenceLevels).length,11);
assert.equal(strong.criticalAxisFailures.length,0);
assert.equal(strong.hardFailures.includes('CRITICAL_AXIS_MINIMUM_FAIL'),false);
assert.equal(strong.hardFailures.includes('30MIN_CONTENT_FAIL'),false);
assert.equal(strong.thirtyMinuteHardGateApplied,false);
assert.ok(strong.totalScore>=80);
for(const value of Object.values(strong.evidenceLevels))assert.ok(DESIGN_DIRECT_SCORE_LEVELS.includes(value));

const grammarSeed=structuredClone(seed);
grammarSeed.GAMEPLAY_SKETCH={version:4,novelGameGrammar:{
  newPrimaryVerb:'오해를 설득해 현실로 만든다',
  worldRule:'공동 믿음이 공간 규칙이 된다.',
  causalDNAs:[{id:'COMEDIC_MISUNDERSTANDING'},{id:'TESTIMONY_CONSENSUS_REALITY'}],
  gameplaySystemFusion:{
    formula:'MAIN × A × B × c',
    main:{name:'설득'},
    majorAxes:[{key:'A',name:'증언 네트워크'},{key:'B',name:'공간 퍼즐'}],
    subElements:[{name:'평판'},{name:'시간대'}]
  },
  delveLayer:{elements:[{name:'거짓말 연쇄'},{name:'권위자 역이용'}]},
  emergentGenre:{name:'합의현실 소문 퍼즐극',categoryRole:'SEED_DISCOVERY_HINT_ONLY_NOT_FINAL_GENRE'}
}};
const grammarDesign=structuredClone(designRecord);
grammarDesign.content.identity+=' 합의현실 소문 퍼즐극 오해를 설득해 현실로 만든다 COMEDIC_MISUNDERSTANDING TESTIMONY_CONSENSUS_REALITY 설득 증언 네트워크 공간 퍼즐 평판 거짓말 연쇄';
const grammarPass=scoreDesignGateV2({seed:grammarSeed,designRecord:grammarDesign,cycleStatus,robloxGenreProfile:profile});
assert.equal(grammarPass.hardFailures.includes('NOVEL_GRAMMAR_DILUTED'),false);
assert.equal(grammarPass.grammarCarryEvidence.formula,'MATERIAL_CAUSAL_GRAMMAR × (MAIN × A × B × c) + @');
assert.deepEqual(grammarPass.grammarCarryEvidence.carriedMajorAxes,['증언 네트워크','공간 퍼즐']);
assert.ok(grammarPass.grammarCarryEvidence.carriedSubElements.includes('평판'));
assert.ok(grammarPass.grammarCarryEvidence.carriedDelveElements.includes('거짓말 연쇄'));
assert.equal(grammarPass.grammarCarryEvidence.emergentGenreCarried,true);
const grammarDiluted=scoreDesignGateV2({seed:grammarSeed,designRecord,cycleStatus,robloxGenreProfile:profile});
assert.ok(grammarDiluted.hardFailures.includes('NOVEL_GRAMMAR_DILUTED'));
assert.ok(grammarDiluted.rejectionReasons.some(reason=>reason.code==='NOVEL_GRAMMAR_DILUTED'));

const weak=structuredClone(designRecord);
delete weak.content.uxAccessibilityPlan;
const weakResult=scoreDesignGateV2({seed,designRecord:weak,cycleStatus,robloxGenreProfile:profile});
assert.ok(weakResult.criticalAxisFailures.includes('UX_AND_ACCESSIBILITY_PLAN'));
assert.ok(weakResult.hardFailures.includes('CRITICAL_AXIS_MINIMUM_FAIL'));
assert.ok(weakResult.totalScore<=79||weakResult.hardFailures.length>0);

assert.ok(Array.isArray(weakResult.rejectionReasons));
assert.ok(weakResult.rejectionReasons.length>=1);
for(const reason of weakResult.rejectionReasons){
  assert.equal(reason.kind,'HARD_GATE');
  assert.equal(reason.bypassAllowed,false);
  assert.equal(reason.source,'STAGE_GATE_SCORING_V2');
  assert.equal(typeof reason.code,'string');
  assert.equal(typeof reason.requiredAction,'string');
}
const uxReject=weakResult.rejectionReasons.find(reason=>reason.code==='CRITICAL_AXIS_MINIMUM_FAIL'&&reason.axis==='UX_AND_ACCESSIBILITY_PLAN');
assert.ok(uxReject);
assert.equal(uxReject.evidenceLevel,0);
assert.equal(uxReject.minimumRequired,75);


const strictReviewSource=fs.readFileSync('tools/company-strict-production-review.mjs','utf8');
assert.match(strictReviewSource,/scoreDesignGateV2/);
assert.match(strictReviewSource,/designContent\.identity\|\|seed\.DISTINCT_IDENTITY/);
assert.match(strictReviewSource,/designContent\.coreLoop/);
assert.match(strictReviewSource,/thirtyMinuteHardGateApplied/);
const designReviewBlock=strictReviewSource.slice(strictReviewSource.indexOf('function designReview(){'),strictReviewSource.indexOf('function implementationReview(){'));
assert.doesNotMatch(designReviewBlock,/hard\.push\('30MIN_CONTENT_FAIL'\)/);
assert.doesNotMatch(designReviewBlock,/identity\.length>=80/);

console.log('COMPANY_DESIGN_GATE_SCORING_V2_TEST=PASS');


for(const platform of ['UNITY','ROBLOX','FORTNITE_UEFN']){
  const platformSeed={...seed,INITIAL_TARGET_PLATFORM:platform};
  const platformRecord=structuredClone(designRecord);
  platformRecord.content.platformFitPlan={...platformRecord.content.platformFitPlan,targetPlatform:platform};
  const platformResult=scoreDesignGateV2({seed:platformSeed,designRecord:platformRecord,cycleStatus,robloxGenreProfile:profile});
  assert.ok(platformResult.evidenceLevels.PLATFORM_FIT_DESIGN>=80,`${platform} platform fit should be connected`);
  assert.ok(!platformResult.criticalAxisFailures.includes('PLATFORM_FIT_DESIGN'),`${platform} must not fail solely because identifier is shorter than prose fields`);
}


const authoredSpatialDesign=()=>{
  const roles=['MAIN','A','B','c','DELVE'];
  return {
    multiplayerMode:'COOP',
    signatureSystems:roles.map((grammarRole,index)=>({
      id:'AUTHORED_ROLE_'+index,grammarRole,
      name:'기존 중심 규칙 '+grammarRole,
      purpose:'플레이어의 기존 행동과 선택이 실제 게임 상태를 바꾸고 다음 선택으로 이어지는 역할을 기술한다.',
      playerChoice:'플레이어가 기존 게임에서 원래 허용된 선택을 수행한 뒤 결과를 확인한다.',
      stateInputs:['WorldState'],stateOutputs:['WorldState']
    })),
    platformProfiles:{
      UNITY:{
        unityWebSpatialPresentation:{
          dimension:'2.5D',
          worldDepth:'실제 월드 오브젝트를 전경·중경·후경에 분리하고 깊이 정렬과 시차를 지역·이동 반응에 연동한다.',
          cameraAndOcclusion:'등각 투영 카메라가 깊이 좌표를 사용하고 앞쪽 물체가 뒤 캐릭터를 가리는 실제 가림 판정을 적용한다.',
          lightingAndMaterials:'기존 월드 오브젝트의 표면별 재질과 방향 광원, 지면 접지 그림자를 유지해 명암과 높이를 인식시킨다.',
          mobileWebglEvidence:'실제 모바일 브라우저에서 같은 유니티 웹 빌드를 실행하고 깊이·가림·조명·터치·프레임과 변경 전후를 비교한다.'
        }
      }
    }
  };
};
const requiredAuthoringFields=['multiplayerMode','signatureSystems','platformProfiles'];
const forcedDesignSeed={MULTIPLAYER_DESIGN_MODE:'SINGLE'};
const authoredRejections=(candidate)=>validateDesignAuthoringContent({
  seed:forcedDesignSeed,design:candidate,fields:requiredAuthoringFields,multiplayerRequired:true
});
const validSpatial=authoredSpatialDesign();
assert.deepEqual(
  authoredRejections(validSpatial).filter(row=>[
    'DESIGN_MULTIPLAYER_CONTRADICTION','DESIGN_MAIN_A_B_c_DELVE_REQUIRED','DESIGN_UNITY_WEB_SPATIAL_DEPTH_REQUIRED'
  ].includes(row.code)),[],
  'structured design evidence does not imply actual multiplayer or browser runtime PASS'
);
const singleOnly=authoredSpatialDesign();
singleOnly.multiplayerMode='SINGLE';
assert.ok(authoredRejections(singleOnly).some(row=>row.code==='DESIGN_MULTIPLAYER_CONTRADICTION'));
const noDelve=authoredSpatialDesign();
noDelve.signatureSystems.pop();
assert.ok(authoredRejections(noDelve).some(row=>row.code==='DESIGN_MAIN_A_B_c_DELVE_REQUIRED'));
const duplicateAxis=authoredSpatialDesign();
duplicateAxis.signatureSystems[2].grammarRole='A';
assert.ok(authoredRejections(duplicateAxis).some(row=>row.code==='DESIGN_MAIN_A_B_c_DELVE_REQUIRED'));
const flatWorld=authoredSpatialDesign();
flatWorld.platformProfiles.UNITY.unityWebSpatialPresentation.dimension='2D';
assert.ok(authoredRejections(flatWorld).some(row=>row.code==='DESIGN_UNITY_WEB_SPATIAL_DEPTH_REQUIRED'));
const markerOnly=authoredSpatialDesign();
markerOnly.platformProfiles.UNITY.unityWebSpatialPresentation.worldDepth='2.5D';
assert.ok(authoredRejections(markerOnly).some(row=>row.code==='DESIGN_UNITY_WEB_SPATIAL_DEPTH_REQUIRED'));
const true3d=authoredSpatialDesign();
true3d.platformProfiles.UNITY.unityWebSpatialPresentation.dimension='3D';
assert.equal(authoredRejections(true3d).some(row=>row.code==='DESIGN_UNITY_WEB_SPATIAL_DEPTH_REQUIRED'),false);
console.log('DESIGN_REQUIRED_GRAMMAR_MULTIPLAYER_UNITY_WEB_DEPTH=PASS');
