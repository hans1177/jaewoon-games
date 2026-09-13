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

const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const flow=fs.readFileSync('COMPANY_FLOW.md','utf8');
const stateTool=fs.readFileSync('tools/game-seed-state.mjs','utf8');
const platformProfileTool=fs.readFileSync('tools/game-seed-platform-profile.mjs','utf8');
const bootstrap=fs.readFileSync('tools/company-game-seed-bootstrap.mjs','utf8');
const semanticNormalize=fs.readFileSync('tools/company-game-seed-semantic-normalize.mjs','utf8');
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

test('central mirror preserves historical bootstrap while latest owner production contract supersedes scheduling',()=>{
  assert.equal(directive.policyDocument,'COMPANY_FLOW.md');
  assert.equal(directive.portfolioGovernance.mode,'FIVE_DEPARTMENT_SCORE_GUIDED_DYNAMIC_PORTFOLIO');
  assert.equal(directive.portfolioGovernance.fixedGameSlots,false);
  assert.equal(directive.portfolioGovernance.oneForOneReplacementRule,false);
  assert.equal(directive.gameSeed.bootstrap.mode,'HISTORICAL_SINGLE_BOOTSTRAP_BATCH');
  assert.equal(directive.gameSeed.bootstrap.historicalInitialSeedBatchOnly,true);
  assert.equal(directive.gameSeed.bootstrap.productionQuota,false);
  assert.match(flow,/poolTarget: 100/);
  assert.match(flow,/materialIsGame: false/);
  assert.match(flow,/legacySixRepresentativeSetsAreHistoricalOnlyForScheduling: true/);
  assert.match(flow,/fixedSixCategoryProductionQuotaForbidden: true/);
  assert.match(flow,/concurrentGameWipMax: 3/);
  assert.match(flow,/meaningfulMinutesRequired: 60/);
  assert.match(flow,/passMinimum: 80/);
  assert.match(flow,/implementationPassMinimum: 90/);
  assert.match(flow,/excellentDesignMinimum: 90/);
  assert.match(flow,/designOnlyArtbookForbidden: true/);
  assert.match(flow,/preWebArtbookForbidden: true/);
  assert.match(flow,/createOnlyAfterWebStrictReview: true/);
  assert.match(flow,/blockingBudgetMinutes: 10/);
  assert.equal(directive.strictReview.designPassMinimum,80);
  assert.equal(directive.strictReview.implementationPassMinimum,90);
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
  assert.equal(request.decisionBand,'EXPAND');
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
  assert.match(bootstrap,/TARGET_SESSION_MINUTES:60/);
  assert.match(bootstrap,/MULTIPLAYER_DESIGN_MODE/);
  assert.match(bootstrap,/GAME_SEED_CONCEPT_DUPLICATE/);
  assert.match(platformProfileTool,/ANDROID_MOBILE.*UNITY/s);
});

test('workflow uses canonical trigger for 24h idle unlimited-total production with bounded WIP',()=>{
  assert.match(seedWorkflow,/IDLE_24H_AUTONOMOUS_PRODUCTION/);
  assert.match(seedWorkflow,/GAME_SEED_IDLE_TARGET_COUNT/);
  assert.match(seedWorkflow,/SEED_MATERIAL_POOL_TARGET=100/);
  assert.match(seedWorkflow,/TARGET_SESSION_MINUTES=60/);
  assert.match(seedWorkflow,/request_count=\$count|request_count=/);
  assert.doesNotMatch(seedWorkflow,/PLATFORM_REPRESENTATIVE_SET_FILL/);
  const cronMatches=seedWorkflow.match(/cron:/g)||[];
  assert.equal(cronMatches.length,1);
});

test('semantic normalization preserves platform choice multiplayer decision and 60-minute contract',()=>{
  assert.doesNotMatch(semanticNormalize,/original global mobile single-player/i);
  assert.doesNotMatch(semanticNormalize,/short touch sessions/i);
  assert.match(semanticNormalize,/TARGET_SESSION_MINUTES=60|TARGET_SESSION_MINUTES=60;/);
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
  assert.match(qualityGate,/TARGET_SESSION_MINUTES=60/);
  assert.match(qualityGate,/MULTIPLAYER_DESIGN_MODE/);
});

test('autonomous runtime remains on company-runtime caps WIP and bounds slow design model work',()=>{
  for(const text of [seedWorkflow,seedDesignWorkflow,statusWorkflow]){
    assert.match(text,/COMPANY_RUNTIME_BRANCH: company-runtime/);
    assert.doesNotMatch(text,/gh pr create/);
    assert.match(text,/PUBLIC_MAIN_WRITE=NO/);
  }
  assert.match(seedWorkflow,/git push origin "HEAD:refs\/heads\/\$COMPANY_RUNTIME_BRANCH"/);
  assert.match(seedWorkflow,/gh workflow run company-seed-design-runtime\.yml --ref main/);
  assert.match(seedDesignWorkflow,/game-seed-state\.json/);
  assert.match(seedDesignWorkflow,/max-parallel: 3/);
  assert.match(seedDesignWorkflow,/GAME_DESIGN_WIP_MAX=3/);
  assert.match(seedDesignWorkflow,/timeout-minutes: 45/);
  assert.match(seedDesignWorkflow,/COMPANY_MODEL_CALL_TIMEOUT_MS: '75000'/);
  assert.match(design,/AbortSignal\.timeout\(modelCallTimeoutMs\)/);
});

test('DESIGN_ONLY requires seed same designer revision and repeated five-lead fatal review',()=>{
  assert.match(design,/GAME_SEED_REQUIRED/);
  assert.match(design,/sameModelAsDraft:true/);
  assert.match(design,/repeatedFiveDepartmentReview:true/);
  assert.match(design,/discardVotes\.length===ROLES\.length&&commonFatal\.length>0/);
  assert.match(design,/marketMetricAloneUsedForDiscard:false/);
  assert.match(design,/vibe2Used:false/);
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
