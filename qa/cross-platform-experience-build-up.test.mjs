// Cross-platform perceptible experience build-up contract.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  BUILD_UP_DOMAINS,
  buildPerceptibleExperienceDirective,
  directivePrompt,
} from '../tools/company-build-up-directive.mjs';

const policy=JSON.parse(fs.readFileSync('company-learning/cross-platform-experience-build-up.json','utf8'));
const planner=fs.readFileSync('tools/vibe2-auto-planner.mjs','utf8');
const buildUpSource=fs.readFileSync('tools/company-build-up-directive.mjs','utf8');
const sourceWorker=fs.readFileSync('tools/vibe2-source-worker.mjs','utf8');

test('cross-platform build-up covers all major player-facing surfaces',()=>{
  assert.equal(policy.status,'ACTIVE_EXECUTABLE_CONTRACT');
  assert.deepEqual(policy.appliesTo,['WEB','ROBLOX','UNITY']);
  const surfaces=new Set(policy.surfaces.map(x=>x.id));
  for(const id of [
    'MOTION_ACTING','UI_HUD','INVENTORY_EQUIPMENT','AUDIO_MUSIC_SFX','VFX_TELEGRAPH','CAMERA',
    'LIGHTING_MATERIALS','WORLD_DENSITY_LANDMARKS','INTERACTION_FEEDBACK','ONBOARDING_GOALS',
    'MOBILE_TOUCH','PERFORMANCE_FRAME_PACING','SAVE_RECOVERY','MULTIPLAYER_FEEDBACK','GAME_FEEL_TIMING','VISUAL_IDENTITY'
  ])assert.ok(surfaces.has(id),id);
  assert.equal(policy.commonCycle.perceptiblePlayerEffectRequired,true);
  assert.equal(policy.commonCycle.existenceOnlyPassForbidden,true);
  assert.equal(policy.commonCycle.bindOnlyPassForbidden,true);
  assert.equal(policy.commonCycle.beforeAfterComparisonRequired,true);
  assert.equal(policy.commonCycle.runtimeReplayRequired,true);
});

test('existing BUILD_UP domain model explicitly includes inventory, audio, UI and motion',()=>{
  for(const id of ['INVENTORY','INVENTORY_USABILITY','EQUIPMENT_LOADOUT','AUDIO_MUSIC_SFX','UI_DESIGN_SYSTEM','UI_HUD','ANIMATION','SECONDARY_MOTION','VFX','CAMERA','LIGHTING']){
    assert.ok(BUILD_UP_DOMAINS.includes(id),id);
  }
  assert.match(buildUpSource,/DESIGNLESS_SAFE_BUILD_UP_DOMAINS[\s\S]*AUDIO_MUSIC_SFX/);
  assert.match(buildUpSource,/DESIGNLESS_SAFE_BUILD_UP_DOMAINS[\s\S]*INVENTORY_USABILITY/);
});

test('Roblox profile is stricter and requires native runtime motion UI inventory audio and presentation evidence',()=>{
  const web=buildPerceptibleExperienceDirective({platform:'WEB'});
  const unity=buildPerceptibleExperienceDirective({platform:'UNITY'});
  const roblox=buildPerceptibleExperienceDirective({platform:'ROBLOX'});
  assert.equal(web.platform,'WEB');
  assert.equal(unity.platform,'UNITY');
  assert.equal(roblox.platform,'ROBLOX');
  assert.equal(roblox.strictness,'STRICTEST');
  assert.equal(roblox.runtime,'OFFICIAL_ROBLOX_STUDIO_MCP_ACTUAL_PLAY');
  const text=roblox.platformRequirements.join('\n');
  assert.match(text,/Animator\/AnimationTrack/);
  assert.match(text,/Motor6D\/Bone/);
  assert.match(text,/Root-only CFrame/);
  assert.match(text,/Inventory\/equipment|inventory\/equipment/i);
  assert.match(text,/SoundService\/SoundGroup/);
  assert.match(text,/state-adaptive BGM/i);
  assert.match(text,/Lighting\/Atmosphere\/ColorCorrection\/Bloom/);
  assert.match(text,/Static source markers.*binding alone cannot prove perceptible quality/i);
  for(const code of ['CHARACTER_MOTION_MANNEQUIN','PLAYER_FACING_DELTA_NOT_OBSERVED','AUDIO_STATE_TRANSITION_NOT_OBSERVED']){
    assert.ok(roblox.hardFailures.includes(code),code);
  }
});

test('directive prompt sends the experience matrix and platform requirements to Vibe implementation',()=>{
  const experience=buildPerceptibleExperienceDirective({platform:'ROBLOX'});
  const prompt=directivePrompt({
    directiveId:'g-build-up-g1-test',
    generation:1,developmentDepth:1,escalationStage:'INITIAL',primaryFocus:'PRESENTATION',
    gameIdentityAndNonNegotiables:{identity:'테스트 게임'},
    thisLoopPrimaryGoal:'체감 품질을 높인다',
    primaryGoalReason:'runtime gap',
    responsibleSystemsAndFiles:{sourceAnchors:[]},
    effectivenessMeasurement:{previousGeneration:{classification:'NO_PREVIOUS_GENERATION',reason:''}},
    nextActionDecision:{action:'CONTINUE_BUILD_UP_CURRENT_SYSTEM',reason:'gap remains'},
    autonomousContentExpansion:{coherentContentBundle:[],continuityAndCausality:{questions:[]}},
    platform:'ROBLOX',
    platformAdaptationDirectives:{ROBLOX:'native roblox guidance'},
    gameplayImplementationDirectives:[],
    progressionContentWorldDirectives:[],
    allDomainImplementationDirectives:[],
    visualBuildUpDirective:{domains:{}},
    uxInputDirectives:[],
    preserveConstraints:[],
    acceptanceEvidence:[],
    nextEscalationCandidates:[],
    perceptibleExperienceBuildUp:experience,
  });
  assert.match(prompt,/EXPERIENCE_BUILD_UP:/);
  assert.match(prompt,/EXPERIENCE_SURFACE_MATRIX:/);
  assert.match(prompt,/MOTION_ACTING/);
  assert.match(prompt,/INVENTORY_EQUIPMENT/);
  assert.match(prompt,/AUDIO_MUSIC_SFX/);
  assert.match(prompt,/PLATFORM_EXPERIENCE_REQUIREMENTS:/);
  assert.match(prompt,/STRICTEST/);
});

test('auto planner regenerates legacy v2 directives instead of silently reusing them',()=>{
  assert.match(planner,/Number\(activeDirectiveTask\.buildUpDirective\.version\|\|0\)>=3/);
  assert.match(planner,/perceptibleExperienceBuildUp\?\.perceptiblePlayerEffectRequired===true/);
  assert.match(planner,/game-specific-build-up-directive:v3/);
  assert.match(planner,/build-up-perceptible-player-effect-required:YES/);
});

test('platform-native guidance gives Roblox extra attention without cloning Web or Unity implementation',()=>{
  assert.match(buildUpSource,/Roblox는 가장 엄격하게 본다/);
  assert.match(buildUpSource,/root-only CFrame/);
  assert.match(buildUpSource,/SoundService\/SoundGroup/);
  assert.match(buildUpSource,/사용자가 꺼둔 효과음을 임의로 되살리지 않는다/);
  assert.match(buildUpSource,/Unity WebGL과 앱은 같은 gameplay\/UI 책임 소스를 공유/);
  assert.match(buildUpSource,/정상 플레이 배율에서 체감되지 않는 미세 bob\/회전/);
});

test('Roblox perceptible v3 work bypasses shallow deterministic cosmetic presentation patches',()=>{
  assert.match(sourceWorker,/perceptibleV3/);
  assert.match(sourceWorker,/&&\s*!perceptibleV3/);
  assert.match(sourceWorker,/experienceBuildUp=version:/);
  assert.match(sourceWorker,/experienceSurfaces=/);
  assert.match(sourceWorker,/experienceRequirements=/);
  assert.match(sourceWorker,/Do not close a player-facing quality gap with source markers, asset binding, style constants/);
});


test('queued legacy BUILD_UP work is upgraded to v3 before reservation, including source-safe Web quality work',()=>{
  assert.match(planner,/Number\(directive\?\.version\|\|0\)>=3/);
  assert.match(planner,/experience\?\.perceptiblePlayerEffectRequired===true/);
  assert.match(planner,/experience\?\.existenceOnlyPassForbidden===true/);
  assert.match(planner,/experience\?\.bindOnlyPassForbidden===true/);
  assert.match(planner,/currentDirectiveNeedsContractMigration/);
  assert.match(planner,/build-up-directive-contract-migration:PERCEPTIBLE_EXPERIENCE_V3/);
  assert.match(planner,/MIGRATED_LEGACY_DIRECTIVE_TO_PERCEPTIBLE_EXPERIENCE_V3_SAME_GENERATION/);
  assert.match(planner,/sourceSafeNoDesign=Boolean[\s\S]*project\.engine[\s\S]*PRESENTATION[\s\S]*USABILITY[\s\S]*STABILITY/);
  assert.match(planner,/PERCEPTIBLE_EXPERIENCE_V3_CONTRACT_BACKFILL/);
});
