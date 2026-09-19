import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  normalizeSeedState,
  markSeedDiscarded,
  createPortfolioSeedRequest,
  pendingPortfolioSeedRequests,
  evaluatePortfolioDepartmentScores,
  portfolioDecisionBand,
  platformRepresentativeGaps,
  ensureSeedMaterialPool,
} from '../tools/game-seed-state.mjs';
import {GAME_SEED_POLICY,GAME_SEED_REQUIRED_FIELDS} from '../tools/company-game-seed-contract.mjs';

const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const flow=fs.readFileSync('COMPANY_FLOW.md','utf8');
const stateTool=fs.readFileSync('tools/game-seed-state.mjs','utf8');
const platformProfileTool=fs.readFileSync('tools/game-seed-platform-profile.mjs','utf8');
const bootstrap=fs.readFileSync('tools/company-game-seed-bootstrap.mjs','utf8');
const semanticNormalize=fs.readFileSync('tools/company-game-seed-semantic-normalize.mjs','utf8');
const designSeedNormalize=fs.readFileSync('tools/company-design-seed-normalize.mjs','utf8');
const qualityGate=fs.readFileSync('tools/company-game-seed-quality-gate.mjs','utf8');
const seedWorkflow=fs.readFileSync('.github/workflows/company-game-seed-bootstrap.yml','utf8');
const seedDesignWorkflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
const statusWorkflow=fs.readFileSync('.github/workflows/company-status-sync.yml','utf8');
const design=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
const gate=fs.readFileSync('tools/company-baseline-gate.mjs','utf8');
const artbook=fs.readFileSync('tools/company-design-artbook.mjs','utf8');
const pipeline=fs.readFileSync('tools/artbook-production-pipeline.mjs','utf8');
const devDisposition=fs.readFileSync('tools/company-development-disposition-gate.mjs','utf8');

const scores=value=>({planning:value,graphics:value,development:value,qa:value,balance:value});
const ROBLOX_CATEGORIES=['ROLEPLAY_LIFE_AVATAR','SIMULATOR_TYCOON_INCREMENTAL','BATTLEGROUND_FIGHTING_SHOOTER','SURVIVAL_HORROR_ESCAPE','OBBY_PARTY_MINIGAME','STORY_RPG_ADVENTURE_RPG'];

test('central machine policy preserves historical bootstrap while latest owner production contract supersedes scheduling',()=>{
  assert.equal(directive.policyDocument,'company-learning/platform-release-roadmap.json');
  assert.equal(roadmap.authority,'MACHINE_EXECUTION_CONTRACT');
  assert.equal(roadmap.machineSourceOfTruth,'company-learning/platform-release-roadmap.json');
  assert.equal(roadmap.legacyPolicyMirror.authoritative,false);
  assert.equal(directive.portfolioGovernance.mode,'FIVE_DEPARTMENT_SCORE_GUIDED_DYNAMIC_PORTFOLIO');
  assert.equal(directive.portfolioGovernance.fixedGameSlots,false);
  assert.equal(directive.portfolioGovernance.oneForOneReplacementRule,false);
  assert.equal(directive.gameSeed.bootstrap.mode,'HISTORICAL_SINGLE_BOOTSTRAP_BATCH');
  assert.equal(directive.gameSeed.bootstrap.historicalInitialSeedBatchOnly,true);
  assert.equal(directive.gameSeed.bootstrap.productionQuota,false);
  assert.equal(directive.gameSeed.selectionMode,GAME_SEED_POLICY.selectionMode);
  assert.deepEqual(directive.gameSeed.transformationModes,[...GAME_SEED_POLICY.transformationModes]);
  assert.equal(directive.gameSeed.seedMaterialPoolTarget,GAME_SEED_POLICY.seedMaterialPoolTarget);
  assert.equal(directive.gameSeed.seedMaterialCombineMin,GAME_SEED_POLICY.seedMaterialCombineMin);
  assert.equal(directive.gameSeed.seedMaterialCombineMax,GAME_SEED_POLICY.seedMaterialCombineMax);
  assert.equal(directive.gameSeed.materialMustBeExistingGame,GAME_SEED_POLICY.materialMustBeExistingGame);
  assert.equal(directive.gameSeed.targetSessionMinutes,GAME_SEED_POLICY.targetSessionMinutes);
  assert.equal(directive.gameSeed.gameplaySketchRequired,GAME_SEED_POLICY.gameplaySketchRequired);
  assert.deepEqual(directive.gameSeed.multiplayerModes,[...GAME_SEED_POLICY.multiplayerModes]);
  assert.equal(directive.gameSeed.requiredFieldsSource,'tools/company-game-seed-contract.mjs#GAME_SEED_REQUIRED_FIELDS');
  assert.deepEqual(directive.gameSeed.requiredFields,[...GAME_SEED_REQUIRED_FIELDS]);
  assert.ok(directive.gameSeed.requiredFields.includes('REFERENCE_INPUTS'));
  assert.ok(!directive.gameSeed.requiredFields.includes('REFERENCE_GAMES'));
  assert.match(flow,/poolTarget: 100/);
  assert.match(flow,/materialIsGame: false/);
  assert.match(flow,/legacySixRepresentativeSetsAreHistoricalOnlyForScheduling: true/);
  assert.match(flow,/fixedSixCategoryProductionQuotaForbidden: true/);
  assert.match(flow,/concurrentGameWipMax: 20/);
  assert.match(flow,/initialImplementationMinimumUnit: ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE/);
  assert.match(flow,/thirtyMinuteRequirementStage: FINAL_CONTENT_DEPTH_VALIDATION_ONLY/);
  assert.match(flow,/finalContentDepthMinutesRequired: 30/);
  assert.match(flow,/passMinimum: 80/);
  assert.match(flow,/TARGET_PLATFORM_IMPLEMENTATION_GATE:[\s\S]*?passMinimum: 90/);
  assert.match(flow,/designOnlyArtbookForbidden: true/);
  assert.match(flow,/preWebArtbookForbidden: true/);
  assert.match(flow,/createOnlyAfterWebStrictReview: true/);
  assert.match(flow,/blockingBudgetMinutes: 10/);
  assert.match(flow,/singleModelCallTimeoutSeconds: 150/);
  assert.match(flow,/designSchemaAttemptsMax: 2/);
  assert.equal(directive.productionThroughput.concurrentGameWipMax,20);
  assert.equal(directive.productionThroughput.webValidationParallelismControlledSeparately,true);
  assert.equal(directive.stageGateScoringV2.currentThresholds.design,80);
  assert.equal(directive.stageGateScoringV2.currentThresholds.web,80);
  assert.equal(directive.stageGateScoringV2.currentThresholds.webPlatformPromotion,90);
  assert.equal(directive.stageGateScoringV2.currentThresholds.targetPlatformCompletion,90);
  assert.equal(directive.stageGateScoringV2.currentThresholds.release,90);
  assert.equal(directive.stageGateScoringV2.liveVersionUpdate.passMinimum,80);
  assert.equal(directive.stageGateScoringV2.expansionPack.passMinimum,85);
  assert.equal(directive.productionThroughput.modelExecutionBudget.designWorkflowTimeoutMinutes,45);
});

test('five department scores drive expansion bands exactly as central policy defines',()=>{
  assert.equal(portfolioDecisionBand(100),'EXPAND');
  assert.equal(portfolioDecisionBand(80),'EXPAND');
  assert.equal(portfolioDecisionBand(79),'MAINTAIN');
  assert.equal(portfolioDecisionBand(60),'MAINTAIN');
  assert.equal(portfolioDecisionBand(59),'REVISE_OR_HOLD');
  assert.equal(portfolioDecisionBand(40),'REVISE_OR_HOLD');
  assert.equal(portfolioDecisionBand(39),'REDUCE_REVIEW');
  assert.equal(portfolioDecisionBand(0),'REDUCE_REVIEW');
  const result=evaluatePortfolioDepartmentScores(scores(90));
  assert.equal(result.pass,true);
  assert.equal(result.aggregateScore,90);
  assert.equal(result.decisionBand,'EXPAND');
});

test('portfolio expansion requires all five scores and evidence; 79 does not auto-expand',()=>{
  const state=normalizeSeedState({seeds:[],portfolioSeedRequests:[]});
  assert.throws(()=>createPortfolioSeedRequest(state,{category:'PUZZLE',departmentScores:scores(79),evidenceRefs:['review:a']}),/EXPAND_REQUIRES_SCORE_80_OR_OWNER_OVERRIDE/);
  assert.throws(()=>createPortfolioSeedRequest(state,{category:'PUZZLE',departmentScores:{planning:90,graphics:90,development:90,qa:90},evidenceRefs:['review:a']}),/INVALID_BALANCE_SCORE/);
  assert.throws(()=>createPortfolioSeedRequest(state,{category:'PUZZLE',departmentScores:scores(90),evidenceRefs:[]}),/MISSING_PORTFOLIO_EVIDENCE/);
  const request=createPortfolioSeedRequest(state,{category:'PUZZLE',targetPlatform:'ROBLOX',departmentScores:scores(90),evidenceRefs:['review:a']});
  assert.equal(request.aggregateScore,90);
  assert.equal(request.decisionBand,'EXPAND');
  assert.equal(request.targetPlatform,'ROBLOX');
  assert.equal(pendingPortfolioSeedRequests(state).length,1);
});

test('platform representative gaps remain readable as historical evidence but no longer drive scheduling',()=>{
  const state=normalizeSeedState({bootstrapCompletedAt:'2026-09-11T00:00:00Z',seeds:ROBLOX_CATEGORIES.slice(0,5).map((category,index)=>({seedId:`R${index}`,gameId:`R${index}`,GAME_CATEGORY:category,INITIAL_TARGET_PLATFORM:'ROBLOX',status:'ACTIVE'}))});
  state.seeds.push({seedId:'U1',gameId:'U1',GAME_CATEGORY:'STORY_RPG_ADVENTURE_RPG',INITIAL_TARGET_PLATFORM:'UNITY',status:'ACTIVE'});
  assert.deepEqual(platformRepresentativeGaps(state,'ROBLOX',ROBLOX_CATEGORIES),['STORY_RPG_ADVENTURE_RPG']);
  assert.doesNotMatch(bootstrap,/platformRepresentativeGaps/);
  assert.doesNotMatch(seedWorkflow,/PLATFORM_REPRESENTATIVE_SET_FILL/);
});

test('discard records never create one-for-one replacement state or a GAME_SEED request by themselves',()=>{
  const state=normalizeSeedState({seeds:[{seedId:'SEED-PUZZLE-001',gameId:'old-game',GAME_CATEGORY:'PUZZLE',status:'ACTIVE'}],portfolioSeedRequests:[],vacancies:[{id:'legacy'}]});
  const result=markSeedDiscarded(state,'old-game',{reason:'DISCARDED',timestamp:'2026-09-12T00:00:00Z'});
  assert.equal(result.seed.status,'DISCARDED');
  assert.equal('vacancies' in state,false);
  assert.equal(pendingPortfolioSeedRequests(state).length,0);
  assert.doesNotMatch(stateTool,/export function (?:createSeedVacancy|unfilledVacancies|fillVacancy)\b/);
  assert.doesNotMatch(stateTool,/createPortfolioSeedRequest\(state,\{[^}]*linkedVacancyId/s);
  assert.doesNotMatch(bootstrap,/fillVacancy|linkedVacancy|state\.vacancies|replacementVacancyId|replacementOfSeedId/);
});

test('owner may explicitly override portfolio expansion without restoring one-for-one replacement',()=>{
  const state=normalizeSeedState({seeds:[],portfolioSeedRequests:[]});
  const request=createPortfolioSeedRequest(state,{category:'CASUAL',departmentScores:scores(20),evidenceRefs:['owner:2026-09-12'],ownerOverride:true});
  assert.equal(request.decisionBand,'OWNER_OVERRIDE_EXPAND');
  assert.equal(pendingPortfolioSeedRequests(state).length,1);
});

test('seed material pool is fixed at 100 and composed seeds use mixed material inputs',()=>{
  const state=normalizeSeedState({seeds:[]});
  ensureSeedMaterialPool(state,{timestamp:'2026-09-13T00:00:00Z'});
  assert.equal(state.seedMaterials.length,100);
  assert.match(bootstrap,/ensureSeedMaterialPool/);
  assert.match(bootstrap,/composeSeedMaterials/);
  assert.match(bootstrap,/consumeSeedMaterials/);
  assert.match(bootstrap,/SEED_MATERIAL_IDS/);
  assert.match(bootstrap,/TARGET_SESSION_MINUTES:30/);
  assert.match(bootstrap,/MULTIPLAYER_DESIGN_MODE/);
  assert.match(bootstrap,/GAME_SEED_CONCEPT_DUPLICATE/);
  assert.match(platformProfileTool,/ANDROID_MOBILE.*UNITY/s);
});

test('owner preservation pilots materialize through canonical GAME_SEED bootstrap',()=>{
  assert.match(seedWorkflow,/owner-design-reset-queue\.json/);
  assert.match(seedDesignWorkflow,/owner-design-reset-queue\.json/);
  assert.match(bootstrap,/OWNER_DESIGN_RESET_QUEUE_FILE/);
  assert.match(bootstrap,/PRESERVATION_PRESENTATION_UPGRADE/);
  assert.match(bootstrap,/REUSE_EXISTING_GAMEPLAY_IMPLEMENTATION===true/);
  assert.match(bootstrap,/materializeOwnerPreservationSeeds/);
  assert.match(bootstrap,/assertGameSeed\(seed\)/);
  assert.match(bootstrap,/OWNER_PRESERVATION_ACTIVE_SEED_CONFLICT/);
  assert.match(bootstrap,/ownerPreservationIntake/);
  assert.equal(roadmap.vibeExecutionLaneContract.ownerPreservationDesignLane.mayRunDuringGamePrimary,true);
  assert.equal(roadmap.vibeExecutionLaneContract.ownerPreservationDesignLane.maxConcurrent,1);
  assert.equal(roadmap.vibeExecutionLaneContract.ownerPreservationDesignLane.consumesGamePrimaryWorkerSlot,false);
  assert.match(seedDesignWorkflow,/preservation_only/);
  assert.match(seedDesignWorkflow,/RUN_OWNER_PRESERVATION_AUX/);
  assert.match(seedDesignWorkflow,/PRESERVATION_PRESENTATION_UPGRADE/);
  assert.match(seedDesignWorkflow,/OWNER_PRESERVATION_DESIGN_LANE=/);
  assert.match(seedDesignWorkflow,/preservationOnly\?1:designWipMax/);
});

test('workflow uses canonical trigger for 24h idle unlimited-total production with bounded WIP',()=>{
  assert.match(seedWorkflow,/IDLE_24H_AUTONOMOUS_PRODUCTION/);
  assert.match(seedWorkflow,/GAME_SEED_IDLE_TARGET_COUNT/);
  assert.match(seedWorkflow,/SEED_MATERIAL_POOL_TARGET=100/);
  assert.match(seedWorkflow,/TARGET_SESSION_MINUTES=30/);
  assert.match(seedWorkflow,/request_count=\$count|request_count=/);
  assert.doesNotMatch(seedWorkflow,/PLATFORM_REPRESENTATIVE_SET_FILL/);
  assert.doesNotMatch(seedWorkflow,/vacancy\/discard alone/i);
  const cronMatches=seedWorkflow.match(/cron:/g)||[];
  assert.equal(cronMatches.length,1);
});

test('semantic normalization preserves platform choice multiplayer decision and 30-minute contract',()=>{
  assert.doesNotMatch(semanticNormalize,/original global mobile single-player/i);
  assert.doesNotMatch(semanticNormalize,/short touch sessions/i);
  assert.match(semanticNormalize,/TARGET_SESSION_MINUTES/);
  assert.match(semanticNormalize,/MULTIPLAYER_DESIGN_MODE/);
  assert.match(semanticNormalize,/GAME_SEED_POLICY\.initialPlayMode/);
  assert.match(semanticNormalize,/ANDROID_MOBILE.*UNITY/s);
  assert.match(semanticNormalize,/FORTNITE_UEFN/);
});

test('quality gate applies material count only to material-composed seeds and leaves duplicate detection at creation time',()=>{
  assert.match(qualityGate,/MATERIAL_COMPOSED_GENERATIONS/);
  assert.match(qualityGate,/isMaterialComposed\(seed\)&&\(materialIds\.length<2\|\|materialIds\.length>4\)/);
  assert.match(qualityGate,/LEGACY_SEED_MATERIAL_RETROACTIVE_GATE=NO/);
  assert.match(qualityGate,/CONCEPT_DUPLICATE_GATE=CREATION_TIME_ONLY/);
  assert.doesNotMatch(qualityGate,/concept-duplicate:/);
  assert.match(bootstrap,/GAME_SEED_CONCEPT_DUPLICATE/);
  assert.match(qualityGate,/GAME_SEED_MARKET_EVIDENCE_HARD_GATE=NO/);
  assert.match(qualityGate,/GAME_SEED_FIXED_CATEGORY_SLOT_QUOTA=NO/);
  assert.match(qualityGate,/TARGET_SESSION_MINUTES/);
  assert.match(qualityGate,/MULTIPLAYER_DESIGN_MODE/);
});

test('autonomous runtime pins verified design engines, canaries two games, then expands to central WIP without weakening gates',()=>{
  for(const text of [seedWorkflow,seedDesignWorkflow,statusWorkflow]){
    assert.match(text,/COMPANY_RUNTIME_BRANCH: company-runtime/);
    assert.doesNotMatch(text,/gh pr create/);
    assert.match(text,/PUBLIC_MAIN_WRITE=NO/);
  }
  assert.match(seedWorkflow,/git push origin "HEAD:refs\/heads\/\$COMPANY_RUNTIME_BRANCH"/);
  assert.match(seedWorkflow,/gh workflow run company-seed-design-runtime\.yml --ref main/);
  assert.match(seedWorkflow,/ACTIVE_DESIGN_ONLY_CURRENT_HEAD_RUNS=/);
  assert.match(seedWorkflow,/ACTIVE_DESIGN_ONLY_STALE_HEAD_RUNS=/);
  assert.match(seedWorkflow,/GAME_SEED_STALE_DESIGN_RUN_POLICY=FINISH_PINNED_ENGINE/);
  assert.match(seedWorkflow,/GAME_SEED_DESIGN_RUNNING_BATCH_CANCELLED=NO/);
  assert.doesNotMatch(seedWorkflow,/actions\/runs\/\$run_id\/cancel/);

  assert.match(seedDesignWorkflow,/group: company-seed-design-runtime/);
  assert.match(seedDesignWorkflow,/cancel-in-progress: \$\{\{ github\.event_name == 'push' \}\}/);
  assert.match(seedDesignWorkflow,/tools\/company-design-seed-normalize\.mjs/);
  assert.match(seedDesignWorkflow,/design-engine-canary\.json/);
  assert.match(seedDesignWorkflow,/canary_mode=/);
  assert.match(seedDesignWorkflow,/engine_digest=/);
  assert.match(seedDesignWorkflow,/pending_total=/);
  assert.match(seedDesignWorkflow,/pending\.slice\(0,2\)/);
  assert.match(seedDesignWorkflow,/const selected=canaryVerified\?pending:pending\.slice\(0,2\)/);
  assert.match(seedDesignWorkflow,/Math\.min\(canaryVerified\?designWipMax:1/);
  assert.match(seedDesignWorkflow,/GAME_DESIGN_GATE_BYPASS=NO/);
  assert.match(seedDesignWorkflow,/mark-design-engine-canary:/);
  assert.match(seedDesignWorkflow,/DESIGN_ENGINE_CANARY=VERIFIED/);
  assert.match(seedDesignWorkflow,/max-parallel:\s*\$\{\{ fromJSON\(needs\.resolve-seed-targets\.outputs\.parallel_max\) \}\}/);
  assert.match(seedDesignWorkflow,/DESIGN_PROGRESS_RUNTIME_PERSIST=YES/);
  assert.match(seedDesignWorkflow,/sleep 15/);
  assert.match(seedDesignWorkflow,/GAME_SEED_CONTINUATION_SCOPE=BATCH_ONCE_AFTER_MATRIX/);
  assert.ok((seedDesignWorkflow.match(/ref: \$\{\{ github\.sha \}\}/g)||[]).length>=5);
  assert.match(seedDesignWorkflow,/GAME_DESIGN_WIP_SOURCE=CANONICAL_ROADMAP/);
  assert.match(seedDesignWorkflow,/GAME_DESIGN_SCHEDULING_MODE=/);
  assert.match(seedDesignWorkflow,/GAME_DESIGN_ROBLOX_FIRST=/);
  assert.match(seedDesignWorkflow,/GAME_DESIGN_FORCE_PROMOTION=NO/);
  assert.match(seedDesignWorkflow,/GAME_DESIGN_PORTFOLIO_WIDE_PASS_REQUIRED=NO/);
  assert.match(seedDesignWorkflow,/platformPriority=seed=>/);
  assert.match(seedDesignWorkflow,/INITIAL_TARGET_PLATFORM/);
  assert.match(seedDesignWorkflow,/Dispatch per-game promotion reconciliation on own strict PASS/);
  assert.match(seedDesignWorkflow,/PER_GAME_PROMOTION_DISPATCH=YES/);
  assert.match(seedDesignWorkflow,/PER_GAME_PROMOTION_FORCE=NO/);
  assert.match(seedDesignWorkflow,/PORTFOLIO_WIDE_PASS_WAIT=NO/);
  assert.match(seedDesignWorkflow,/WEB_DEVELOPMENT_START=NO/);
  assert.match(seedDesignWorkflow,/timeout-minutes: 45/);
  assert.match(seedDesignWorkflow,/COMPANY_MODEL_PHASE_CONCURRENCY: '2'/);
  assert.match(seedDesignWorkflow,/COMPANY_MODEL_CALL_TIMEOUT_MS: '90000'/);
  assert.match(seedDesignWorkflow,/GEMINI_API_KEY: \$\{\{ secrets\.GEMINI_API_KEY \}\}/);
  assert.match(seedDesignWorkflow,/DESIGN_AI_PROVIDER=GEMINI_PRIMARY_VIBE_LOCAL_FALLBACK/);
  assert.match(seedDesignWorkflow,/COMPANY_GEMINI_DESIGNER_MODEL: 'gemini-3\.5-flash-lite'/);
  assert.match(seedDesignWorkflow,/gemini-3\.5-flash-lite/);
  assert.match(seedDesignWorkflow,/GEMINI_API_KEY_REQUIRED_FOR_GATE=NO/);

  assert.match(designSeedNormalize,/DESIGN_SEED_REFERENCE_GAMES_OPTIONAL_EMPTY=/);
  assert.match(designSeedNormalize,/ENSURE_REFERENCE_INPUTS_WITHOUT_INVENTING_REFERENCE_GAME/);
  assert.match(designSeedNormalize,/assertGameSeed\(seed\)/);
  assert.match(gate,/GAME_SEED_REQUIRED_FIELDS/);
  assert.doesNotMatch(gate,/directive\.gameSeed\?\.requiredFields/);

  assert.match(design,/DESIGN_CHECKPOINT_CONTRACT_VERSION=3/);
  assert.match(design,/DESIGN_CHECKPOINT_MIGRATED=\$\{previousContractVersion===2\?'V2_TO_V3':'V3_COMPATIBLE_ENGINE'\}/);
  assert.match(design,/PERSIST_GEMINI_DAILY_QUARANTINE_WITHOUT_REPLAY/);
  assert.match(design,/engineDigest/);
  assert.match(design,/design-progress\.json/);
  assert.match(design,/phaseBudgetMs/);
  assert.match(design,/modelHealthPenalty/);
  assert.match(design,/scoreDesignGateV2/);
  assert.match(design,/deterministic_pre_gate/);
  assert.match(design,/DETERMINISTIC_PRE_GATE_V2/);
  assert.match(design,/designer_pre_gate_repair_/);
  assert.match(design,/repairAttempt<=2/);
  assert.match(design,/function scoreCurrentDesign/);
  assert.match(design,/Deterministic scoring is intentionally never served from checkpoint cache/);
  assert.match(design,/DESIGN_PRE_GATE_BLOCKED/);
  assert.match(design,/DESIGNER_DRAFT_GENERATION=ONE_CALL/);
  assert.match(design,/DESIGNER_DRAFT_ONE_CALL_FALLBACK=SPLIT/);
  assert.match(design,/DESIGN_ONLY_REVIEW_MODE=DETERMINISTIC_DEPARTMENT_EVIDENCE/);
  assert.match(design,/DESIGN_ONLY_MEETING=DISABLED/);
  assert.match(design,/DESIGN_ONLY_REBUTTAL=DISABLED/);
  assert.match(design,/deterministicDepartmentReview/);
  assert.match(design,/runPhase\('deterministic_department_evidence'/);
  assert.match(design,/DETERMINISTIC_REVALIDATION/);
  assert.match(design,/actualLeadModel:'DETERMINISTIC_EVIDENCE_ENGINE'/);
  assert.match(design,/fiveDepartmentLeadReviewCompleted:false/);
  assert.match(design,/meetingRequired:false/);
  assert.match(design,/rebuttalRounds:0/);
  assert.match(design,/AbortSignal\.timeout\(effectiveTimeoutMs\)/);
  assert.match(design,/const geminiUnavailableModels=new Map\(\)/);
  assert.match(design,/function quarantineGeminiModel/);
  assert.match(design,/GEMINI_MODEL_QUARANTINED=/);
  assert.match(design,/GEMINI_DISTINCT_LEAD_FAILOVER_LANES=/);
  assert.match(design,/AI_PROVIDER=\$\{designCheckpoint\.effectiveDesignerProvider\|\|'GEMINI_PRIMARY_VIBE_LOCAL_FALLBACK'\}/);
  assert.match(design,/generativelanguage\.googleapis\.com/);
  assert.match(design,/responseJsonSchema:schema/);
  assert.match(design,/VIBE_LOCAL_OLLAMA/);
  assert.match(design,/OLLAMA_DESIGN_TIMEOUT/);
  assert.equal(directive.ai.providerMode,'GEMINI_PRIMARY_VIBE_LOCAL_FALLBACK');
  assert.equal(directive.ai.providerSecret,'GEMINI_API_KEY');
  assert.equal(directive.ai.openAiProviderAllowed,false);
  assert.equal(directive.ai.ollamaProviderAllowed,true);
  assert.equal(directive.ai.localModelFallbackAllowed,true);
  assert.deepEqual(directive.ai.gameDesigner.providerPriority,['GEMINI','VIBE_LOCAL_OLLAMA']);
  assert.equal(directive.ai.gameDesigner.cloudFailureFallsBackToLocal,true);
  assert.deepEqual(directive.ai.gameDesigner.localFallbackModels,['qwen3:1.7b']);
  assert.doesNotMatch(design,/Math\.max\(900,Math\.ceil\(1400\*roles\.length\/ROLES\.length\)\)/);
});

test('DESIGN_ONLY uses one designer plus deterministic department evidence without AI meetings',()=>{
  assert.match(design,/GAME_SEED_REQUIRED/);
  assert.match(design,/sameModelAsDraft:false/);
  assert.match(design,/fiveDepartmentLeadReviewCompleted:false/);
  assert.match(design,/DESIGN_ONLY_REVIEW_MODE=DETERMINISTIC_DEPARTMENT_EVIDENCE/);
  assert.match(design,/reviewMode:'DETERMINISTIC_DEPARTMENT_EVIDENCE'/);
  assert.match(design,/automaticDiscardAllowed:false/);
  assert.match(design,/meetingRequired:false/);
  assert.match(design,/rebuttalRounds:0/);
  assert.match(design,/marketMetricAloneUsedForDiscard:false/);
  assert.match(design,/vibe2Used:false/);
  assert.doesNotMatch(design,/cross_department_meeting|lead_rebuttals|department_representatives/);
  assert.doesNotMatch(design,/vibe2-validator|VIBE2_VALIDATION_LEARNING/);
});

test('DESIGN_ONLY stops at design baseline; artbook is post-Web strict review only',()=>{
  const designCall=pipeline.search(/await run(?:WithRetry)?\('tools\/company-design-cycle\.mjs'/);
  const gateCall=pipeline.indexOf("await run('tools/company-baseline-gate.mjs')",designCall);
  const artbookCall=pipeline.indexOf("await run('tools/company-design-artbook.mjs')",gateCall);
  assert.ok(designCall>=0&&gateCall>designCall);
  assert.equal(artbookCall,-1,'DESIGN_ONLY must not create artbook before promotion');
  assert.match(pipeline,/DESIGN_ONLY_ARTBOOK_BEFORE_PROMOTION=NO/);
  assert.match(pipeline,/DESIGN_ONLY_ARTBOOK_SKIPPED=WAIT_FOR_PROMOTION/);
  assert.match(pipeline,/DESIGN_ONLY_VIBE2_USED=NO/);
  assert.match(pipeline,/terminalDesignFailure=.*DESIGN_PRE_GATE_BLOCKED/);
  assert.match(pipeline,/if\(terminalDesignFailure\)return false/);
  assert.match(gate,/designOnlyVibe2Forbidden:true/);
  assert.match(artbook,/postWebStrictReview:true/);
  assert.match(artbook,/POST_WEB_ARTBOOK_REQUIRES_WEB_STRICT_80_NO_HARD_FAILURE/);
  assert.match(artbook,/ARTBOOK_MODEL_CALL_TIMEOUT_MS/);
});

test('development discard or demotion still requires real evidence fix revalidation and five-lead agreement',()=>{
  assert.match(devDisposition,/realEvidenceExists:data\.realEvidenceExists===true/);
  assert.match(devDisposition,/targetedFixAttempted/);
  assert.match(devDisposition,/targetedRevalidationPerformed/);
  assert.match(devDisposition,/structuralFatalBlockerRemains/);
  assert.match(devDisposition,/uniq\(Object\.values\(leadModels\)\)\.length!==5/);
  assert.match(devDisposition,/unanimous&&commonFatal\.length/);
  assert.match(devDisposition,/DEMOTE_TO_DESIGN_ONLY/);
  assert.match(devDisposition,/markSeedDiscarded/);
});

test('obsolete free-concept and direct prototype entrypoints remain removed',()=>{
  for(const file of [
    'tools/autonomous-new-game-incubator.mjs','tools/autonomous-prototype-worker.mjs',
    '.github/workflows/autonomous-new-game-incubator.yml','.github/workflows/autonomous-prototype-worker.yml',
    'qa/autonomous-new-game-incubator.test.mjs','qa/autonomous-prototype-worker.test.mjs','qa/autonomous-new-game-closed-loop.test.mjs'
  ])assert.equal(fs.existsSync(file),false,`obsolete path still exists: ${file}`);
  assert.equal(fs.existsSync('.github/workflows/company-game-seed-bootstrap.yml'),true);
});

test('DESIGN_ONLY Gemini workflow uses only centrally authorized lead and designer model pools',()=>{
  const leadMatch=seedDesignWorkflow.match(/COMPANY_GEMINI_LEAD_MODELS:\s*'([^']+)'/);
  const fallbackMatch=seedDesignWorkflow.match(/COMPANY_GEMINI_FALLBACK_MODELS:\s*'([^']+)'/);
  assert.ok(leadMatch&&fallbackMatch);
  const workflowLeads=leadMatch[1].split(',').map(v=>v.trim()).filter(Boolean);
  const workflowFallbacks=fallbackMatch[1].split(',').map(v=>v.trim()).filter(Boolean);
  const roles=['planning','graphics','development','qa','balance'];
  const policyLeads=roles.map(role=>directive.ai.departmentLeadModels[role]);
  assert.deepEqual(workflowLeads,policyLeads);
  assert.equal(new Set(workflowLeads).size,5);
  for(const model of workflowLeads)assert.ok(directive.ai.modelPool.includes(model),`unauthorized lead model: ${model}`);
  const authorizedDesigner=new Set([directive.ai.gameDesigner.geminiModel,...directive.ai.gameDesigner.geminiFallbackModels]);
  for(const model of workflowFallbacks)assert.ok(authorizedDesigner.has(model),`unauthorized designer fallback: ${model}`);
  assert.match(design,/GEMINI_UNAUTHORIZED_LEAD_MODEL/);
  assert.match(design,/GEMINI_UNAUTHORIZED_DESIGNER_MODEL/);
  assert.match(design,/GEMINI_UNAUTHORIZED_DESIGNER_FALLBACK_MODEL/);
  assert.match(seedDesignWorkflow,/GEMINI_QUOTA_GOVERNOR_UNAUTHORIZED_LEAD_MODEL/);
});
