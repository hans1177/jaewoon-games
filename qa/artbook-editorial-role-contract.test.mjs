import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GAME_SEED_REQUIRED_FIELDS,GAME_SEED_POLICY,validateGameSeed} from '../tools/company-game-seed-contract.mjs';

const flow=fs.readFileSync('COMPANY_FLOW.md','utf8');
const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const cycle=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
const devCycle=fs.readFileSync('tools/company-development-validation-cycle.mjs','utf8');
const releaseCycle=fs.readFileSync('tools/company-release-production-cycle.mjs','utf8');
const pipeline=fs.readFileSync('tools/artbook-production-pipeline.mjs','utf8');
const workflow=fs.readFileSync('.github/workflows/artbook-free-department-bots.yml','utf8');
const candidateRelease=fs.readFileSync('.github/workflows/vibe2-candidate-release.yml','utf8');
const unityReleaseResult=fs.readFileSync('.github/workflows/vibe2-unity-release-result.yml','utf8');
const vibeRunner=fs.readFileSync('.github/workflows/vibe2-24h-runner.yml','utf8');
const roles=['planning','graphics','development','qa','balance'];

test('one central policy source owns class, design, meeting and artbook rules',()=>{
  assert.equal(directive.policyDocument,'COMPANY_FLOW.md');
  assert.match(flow,/sourceOfTruth: COMPANY_FLOW\.md/);
  assert.match(flow,/format: MACHINE_ORIENTED_POLICY_SPEC/);
  assert.match(flow,/evidenceFilesCannotCreatePolicy: true/);
});

test('DESIGN_ONLY begins with GAME_SEED before Game Designer draft',()=>{
  const design=directive.classes.DESIGN_ONLY;
  assert.equal(design.requiredFlow[0],'GAME_SEED');
  assert.equal(design.requiredFlow[1],'GAME_DESIGNER_DRAFT');
  assert.equal(directive.gameSeed.requiredBeforeDesignerDraft,true);
  assert.deepEqual(directive.gameSeed.requiredFields,GAME_SEED_REQUIRED_FIELDS);
  assert.equal(directive.gameSeed.initialTargetPlatform,GAME_SEED_POLICY.initialTargetPlatform);
  assert.equal(directive.gameSeed.initialPlayMode,GAME_SEED_POLICY.initialPlayMode);
  assert.match(flow,/GAME_SEED:\n  stage: BEFORE_GAME_DESIGNER_DRAFT/);
  assert.match(flow,/requiredFlow:\n      - GAME_SEED\n      - GAME_DESIGNER_DRAFT/);
});

test('DESIGN_ONLY baseline requires seed identity market mobile and expansion decisions',()=>{
  const required=directive.classes.DESIGN_ONLY.baselineReadyRequires||[];
  for(const token of [
    'GAME_SEED_COMPLETE',
    'DISTINCT_GAME_IDENTITY',
    'CORE_FUN_CLEAR',
    'CORE_LOOP_ACTION_FEEDBACK_CHOICE_REWARD',
    'MARKET_TARGET_DIRECTION_RECORDED',
    'MOBILE_UX_DIRECTION_DEFINED',
    'STEAM_EXPANSION_DECISION_RECORDED',
    'MULTIPLAYER_EXPANSION_DECISION_RECORDED',
    'FIVE_DISTINCT_LEAD_MODELS',
    'PER_DEPARTMENT_MULTIMODEL_REVIEW_PASS',
    'NO_HIDDEN_FATAL_CONFLICT'
  ])assert.ok(required.includes(token),`missing DESIGN_ONLY baseline requirement: ${token}`);
  assert.equal(directive.classes.DESIGN_ONLY.readyState,'DESIGN_BASELINE_READY');
});

test('GAME_SEED validator permits UNKNOWN market numbers but rejects unsourced numeric claims',()=>{
  const base={
    GAME_CATEGORY:'CASUAL',
    REFERENCE_GAMES:['Released successful reference'],
    CORE_FUN_TO_LEARN:'clear repeatable interaction pattern',
    CORE_LOOP:['action','feedback','choice','reward'],
    DISTINCT_IDENTITY:'original world visual identity characters and system combination',
    MARKET_EVIDENCE_SUMMARY:'UNKNOWN numeric fields; qualitative benchmark only',
    TARGET_AUDIENCE:'mobile players',
    TARGET_SESSION_DIRECTION:'short repeatable sessions',
    INITIAL_TARGET_PLATFORM:'ANDROID_MOBILE',
    INITIAL_PLAY_MODE:'SINGLE_PLAYER',
    STEAM_EXPANSION_POSSIBLE:'POSSIBLE',
    MULTIPLAYER_EXPANSION_POSSIBLE:'NOT_RECOMMENDED',
    MULTIPLAYER_EXPANSION_VALUE:'LOW'
  };
  assert.equal(validateGameSeed(base).pass,true);
  const invalid=validateGameSeed({...base,MARKET_EVIDENCE_SUMMARY:{numericClaims:[{metric:'rating',value:4.8}]}});
  assert.equal(invalid.pass,false);
  assert.ok(invalid.errors.some(x=>x.includes('.source is required')));
  assert.ok(invalid.errors.some(x=>x.includes('.observedAt is required')));
});

test('five departments have five distinct lead model ids and remappable assignments',()=>{
  assert.equal(directive.ai.departmentLeadModelsMustBeDistinct,true);
  assert.equal(directive.ai.departmentLeadAssignmentRemappable,true);
  assert.ok(directive.ai.minDistinctLeadModelsAcrossDepartments>=5);
  const leadModels=roles.map(role=>directive.ai.departmentLeadModels?.[role]);
  assert.ok(leadModels.every(Boolean));
  assert.equal(new Set(leadModels).size,5);
  assert.ok(leadModels.every(model=>directive.ai.modelPool.includes(model)));
  assert.match(flow,/fiveDistinctLeadModelIdsRequiredPerCycle: true/);
  assert.match(flow,/leadModelAssignmentRemappable: true/);
  assert.match(cycle,/DEPARTMENT_LEAD_GATE/);
  assert.match(devCycle,/DEPARTMENT_LEAD_GATE/);
  assert.match(releaseCycle,/DEPARTMENT_LEAD_GATE/);
});

test('each department uses lead plus assistants with at least three distinct real models',()=>{
  const models=[...new Set(directive.ai.modelPool)];
  assert.ok(models.length>=5);
  assert.ok(directive.ai.minDistinctModelsPerDepartment>=3);
  assert.ok(directive.ai.departmentReviewModelCount>=3);
  assert.equal(directive.ai.assistantModelsMayOverlapAcrossDepartments,true);
  assert.equal(directive.ai.modelIdentityFixed,false);
  assert.match(flow,/assistantMinCount: 2/);
  assert.match(flow,/allModelsWithinDepartmentMustBeDistinct: true/);
  assert.match(cycle,/reviewModelsFor/);
  assert.match(devCycle,/reviewModelsFor/);
  assert.match(releaseCycle,/reviewModelsFor/);
  assert.match(workflow,/Pull configured free department models/);
});

test('department lead owns representative opinion and rebuttal',()=>{
  assert.equal(directive.ai.departmentRepresentativeAuthoredByLead,true);
  assert.equal(directive.ai.departmentRebuttalAuthoredByLead,true);
  assert.equal(directive.ai.meeting.internalRepresentativeOwner,'DEPARTMENT_LEAD_MODEL');
  assert.equal(directive.ai.meeting.rebuttalOwner,'DEPARTMENT_LEAD_MODEL');
  assert.match(flow,/representativeAuthor: DEPARTMENT_LEAD/);
  assert.match(flow,/rebuttalAuthor: SAME_DEPARTMENT_LEAD/);
  assert.match(cycle,/representativeAuthoredByLead:true/);
  assert.match(cycle,/rebuttalAuthoredByDepartmentLeads:true/);
  assert.match(devCycle,/representatives\[role\]=await callModel\(lead/);
  assert.match(devCycle,/rebuttals\[role\]=await callModel\(leadModels\[role\]/);
});

test('detailed design keeps one game designer role for revision',()=>{
  assert.equal(directive.ai.gameDesigner.singleAuthorPerRevisionCycle,true);
  assert.equal(directive.ai.gameDesigner.sameModelRevisesAfterMeeting,true);
  assert.match(flow,/onePrimaryAuthorPerProjectRevisionCycle: true/);
  assert.match(flow,/sameDesignerRevisesAfterMeeting: true/);
  assert.match(cycle,/authorRole:'GAME_DESIGNER_AI'/);
  assert.match(cycle,/sameModelAsDraft:true/);
  assert.match(devCycle,/authorRole:'GAME_DESIGNER_AI'/);
});

test('design only runs directly through artbook',()=>{
  assert.equal(directive.classes.DESIGN_ONLY.directResultMode,true);
  assert.ok(directive.classes.DESIGN_ONLY.requiredFlow.includes('ARTBOOK_EDITOR_CORE_STRATEGY'));
  assert.equal(directive.classes.DESIGN_ONLY.requiredFlow.includes('VIBE2_VALIDATION_LEARNING'),false);
  assert.match(flow,/DESIGN_ONLY:[\s\S]*?directResultMode: true/);
  assert.match(flow,/ARTBOOK_EDITOR_CORE_STRATEGY/);
  assert.match(cycle,/DESIGN_ONLY_ARTBOOK_DIRECT=YES/);
  assert.match(pipeline,/DESIGN_ONLY_ARTBOOK_DIRECT=YES/);
});

test('Vibe2 starts at DEVELOPMENT_CONFIRMED and is inactive in DESIGN_ONLY',()=>{
  assert.equal(directive.ai.vibe2.startsAtClass,'DEVELOPMENT_CONFIRMED');
  assert.equal(directive.ai.vibe2.designOnlyActive,false);
  assert.equal(Object.hasOwn(directive.ai.vibe2.roleByClass,'DESIGN_ONLY'),false);
  assert.equal(directive.ai.vibe2.roleByClass.DEVELOPMENT_CONFIRMED,'VALIDATION_TEST_ANALYSIS_AND_DEVELOPMENT_SUPPORT');
  assert.equal(directive.ai.vibe2.roleByClass.RELEASE_CONFIRMED,'PRIMARY_DEVELOPMENT_ENGINE');
  assert.match(flow,/Vibe2:\n  startsAt: DEVELOPMENT_CONFIRMED/);
});

test('development confirmed is gated direct and resumable',()=>{
  const dev=directive.classes.DEVELOPMENT_CONFIRMED;
  assert.equal(dev.executionMode,'GATED_DIRECT');
  assert.equal(dev.resumeFromLatestEvidence,true);
  assert.equal(dev.aiMayInventValidationPass,false);
  assert.equal(dev.artbookOnlyAfterBaselineReady,true);
  for(const state of ['WAITING_WEB_VALIDATION','WAITING_WEB_REVALIDATION','WAITING_UNITY_VALIDATION','WAITING_UNITY_REVALIDATION','WAITING_REVALIDATION'])assert.ok(dev.waitingStates.includes(state));
  assert.match(flow,/DEVELOPMENT_CONFIRMED:[\s\S]*?executionMode: GATED_DIRECT/);
  assert.match(flow,/webPurpose: GAMEPLAY_VALIDATION_TESTBED/);
  assert.match(flow,/unityPurpose: ANDROID_TECHNICAL_VALIDATION_PROTOTYPE/);
  assert.match(devCycle,/DEVELOPMENT_DIRECT_STATE=/);
  assert.match(pipeline,/DEVELOPMENT_EXECUTION_MODE=GATED_DIRECT/);
});

test('development artbook is created only after baseline ready',()=>{
  assert.match(devCycle,/DEVELOPMENT_BASELINE_READY/);
  assert.match(devCycle,/ARTBOOK_REVISION=CREATED_AFTER_BASELINE_READY/);
  const firstArtbookWrite=devCycle.indexOf("writeJson(artbookPath");
  const firstWaiting=devCycle.indexOf("WAITING_WEB_VALIDATION");
  assert.ok(firstArtbookWrite>firstWaiting);
});

test('artbook remains single-editor core strategy and Vibe2 is not its primary author in development',()=>{
  assert.equal(directive.ai.artbookEditor.singleEditor,true);
  assert.equal(directive.ai.artbookEditor.departmentPageAuthorship,false);
  assert.equal(directive.ai.artbookEditor.mayInventNewClaims,false);
  assert.equal(directive.ai.vibe2.designOrArtbookPrimaryAuthorInDevelopmentClass,false);
  assert.match(flow,/ArtbookEditor:[\s\S]*?singleEditor: true/);
  assert.match(flow,/mayInventNewClaims: false/);
  assert.match(pipeline,/DEPARTMENT_ARTBOOK_AUTHORSHIP=NO/);
});

test('development and release responsibilities use semantic production classes',()=>{
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.webPurpose,'GAMEPLAY_VALIDATION_TESTBED');
  assert.equal(directive.classes.RELEASE_CONFIRMED.vibe2PrimaryDeveloper,true);
  assert.equal(directive.classes.RELEASE_CONFIRMED.departmentDefaultRole,'ERROR_AND_RELEASE_RISK_REVIEW');
  assert.equal(directive.classes.RELEASE_CONFIRMED.executionMode,'GATED_DIRECT_RELEASE_PRODUCTION');
  assert.match(flow,/webPurpose: GAMEPLAY_VALIDATION_TESTBED/);
  assert.match(flow,/unityPurpose: ANDROID_TECHNICAL_VALIDATION_PROTOTYPE/);
  assert.match(flow,/RELEASE_CONFIRMED: PRIMARY_DEVELOPMENT_ENGINE/);
  assert.match(flow,/RELEASE_CONFIRMED:[\s\S]*?coreDesignLock: true/);
  assert.match(releaseCycle,/vibe2PrimaryDeveloper:true/);
  assert.match(releaseCycle,/currentBuildEvidenceBindingRequired:true/);
  assert.match(pipeline,/RELEASE_EXECUTION_MODE=GATED_DIRECT_RELEASE_PRODUCTION/);
});

test('release current Unity source tree binds implementation build runtime and QA evidence',()=>{
  const release=directive.classes.RELEASE_CONFIRMED;
  assert.equal(release.currentSourceTreeBindingRequired,true);
  assert.equal(release.currentBuildEvidenceBindingRequired,true);
  assert.equal(release.revalidationRequiredAfterSourceChange,true);
  assert.ok(release.requiredFlow.includes('BIND_CURRENT_UNITY_SOURCE_TREE'));
  assert.match(releaseCycle,/currentUnitySourceTreeSha/);
  assert.match(releaseCycle,/sourceTreeSha/);
  assert.match(releaseCycle,/boundToCurrentSource/);
  assert.match(releaseCycle,/boundToImplementation/);
  assert.match(releaseCycle,/SOURCE_TO_BUILD_BINDING=PASS/);
  assert.match(workflow,/'unity-games\/\*\*'/);
  assert.match(workflow,/file\.startsWith\(`\$\{project\}\//);
});

test('final five-department release review requires current build runtime and independent QA evidence',()=>{
  assert.match(releaseCycle,/finalDepartmentRiskWatchUsesBuildRuntimeQaEvidence:true/);
  assert.match(releaseCycle,/FINAL_RELEASE_REVIEW/);
  assert.match(releaseCycle,/FINAL_RISK_WATCH_REQUIRES_CURRENT_BUILD_RUNTIME_PASS/);
  assert.match(releaseCycle,/FINAL_RISK_WATCH_REQUIRES_CURRENT_BUILD_INDEPENDENT_QA_PASS/);
  assert.match(releaseCycle,/release-risk-watch-preflight\.json/);
  assert.match(releaseCycle,/release-risk-watch\.json/);
  assert.match(releaseCycle,/androidRuntimeValidation:runtime\?\.data/);
  assert.match(releaseCycle,/independentReleaseQa:qa\?\.data/);
  assert.match(releaseCycle,/allFinalEvidenceBound/);
  assert.match(releaseCycle,/FINAL_DEPARTMENT_REVIEW_BUILD_RUNTIME_QA_BINDING=PASS/);
});

test('release-confirmed Unity candidate cannot bypass Development Baseline',()=>{
  assert.match(candidateRelease,/productionClass/);
  assert.match(candidateRelease,/RELEASE_CONFIRMED/);
  assert.match(candidateRelease,/DEVELOPMENT_BASELINE_READY/);
  assert.match(candidateRelease,/development-baseline-required/);
  assert.match(candidateRelease,/webGameplay\?\.pass===true/);
  assert.match(candidateRelease,/unityTechnical\?\.pass===true/);
});

test('APK build evidence never impersonates independent release QA or full implementation completion',()=>{
  assert.match(unityReleaseResult,/PARTIAL_BUILD_VERIFIED/);
  assert.match(unityReleaseResult,/developmentBaselineImplemented:false/);
  assert.match(unityReleaseResult,/INDEPENDENT_RELEASE_QA=NOT_ASSERTED/);
  assert.match(unityReleaseResult,/DEVICE_VALIDATION=NOT_ASSERTED/);
  assert.match(unityReleaseResult,/gh run download/);
  assert.match(unityReleaseResult,/apk_sha256/);
  assert.doesNotMatch(unityReleaseResult,/--independent-qa=PASS/);
});

test('Vibe2 runner feeds central release-baseline implementation gaps before generic autoplan',()=>{
  assert.match(vibeRunner,/tools\/vibe2-release-baseline-queue\.mjs/);
  assert.match(vibeRunner,/design\/\*\*\/release-production-request\.json/);
  assert.match(vibeRunner,/unity-games\/\*\*/);
  const releasePlan=vibeRunner.indexOf('node tools/vibe2-release-baseline-queue.mjs');
  const genericPlan=vibeRunner.indexOf('node tools/vibe2-auto-planner.mjs');
  assert.ok(releasePlan>=0&&genericPlan>releasePlan);
});
