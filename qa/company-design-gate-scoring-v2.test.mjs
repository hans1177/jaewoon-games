import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DESIGN_GATE_WEIGHTS,DESIGN_DIRECT_SCORE_LEVELS,DESIGN_CRITICAL_AXIS_MINIMUM_PERCENT,scoreDesignGateV2} from '../tools/company-design-gate-scoring-v2.mjs';

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
const designCycleSource=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
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


assert.match(designCycleSource,/conceptBlueprint:CONCEPT_BLUEPRINT/);
assert.match(designCycleSource,/designAlternatives:\{type:'array',minItems:2/);
assert.match(designCycleSource,/contentDiversityPlan:CONTENT_DIVERSITY_PLAN/);
assert.match(designCycleSource,/creativeChallenge:CREATIVE_CHALLENGE/);
assert.match(designCycleSource,/narrativeDirection:NARRATIVE_DIRECTION/);
assert.match(designCycleSource,/PLAN_A와 PLAN_B/);
assert.match(designCycleSource,/숫자\/색만 바꾼 복제를 피하고/);
assert.match(designCycleSource,/장르 혼합·장르 전환/);
assert.match(designCycleSource,/캐릭터별 어휘·격식·문장리듬/);
assert.match(designCycleSource,/PUBLIC_DOMAIN/);
assert.match(designCycleSource,/OWNER_REQUEST_EVENT_ID=/);
console.log('CONTINUOUS_DESIGN_SCHEMA_CONTRACT=PASS');
