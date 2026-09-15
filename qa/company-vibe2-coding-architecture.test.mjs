import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCodingArchitecture,evaluateCodingArchitecture,resolveDevelopmentMode,DEVELOPMENT_MODES} from '../tools/company-vibe2-coding-architecture.mjs';
import {deriveGameplaySketch,analyzeExistingGameSource,buildVibeDevelopmentContext} from '../tools/company-vibe2-gameplay-intelligence.mjs';
import {buildApprovedScopeGenerationPrompt} from '../tools/company-development-web-bootstrap.mjs';

const inventory=[
  {id:'map',path:'world.map',label:'explore map routes'},
  {id:'npc',path:'world.npc',label:'interact with npc objects'},
  {id:'combat',path:'combat.enemy',label:'fight enemy boss weapon'},
  {id:'economy',path:'economy.shop',label:'gold shop buy resource'},
  {id:'progress',path:'progression.quest',label:'quest reward unlock'},
];

function sketch(gameId='coding',genre='STORY_COMPLETE_RPG',baseline={content:{coreLoop:['enter','explore','fight','reward']}}){
  return deriveGameplaySketch({gameId,genre,baseline,inventory});
}

test('development mode defaults to GREENFIELD without existing source',()=>{
  const sourceAnalysis=analyzeExistingGameSource('');
  assert.equal(resolveDevelopmentMode({baseline:{content:{}},sourceAnalysis}),'GREENFIELD');
  assert.deepEqual(DEVELOPMENT_MODES,['GREENFIELD','PRESERVE_PATCH','RECOMPOSE']);
  const architecture=buildCodingArchitecture({gameId:'new-game',genre:'STORY_COMPLETE_RPG',baseline:{content:{}},gameplaySketch:sketch(),sourceAnalysis});
  const review=evaluateCodingArchitecture(architecture);
  assert.equal(architecture.developmentMode,'GREENFIELD');
  assert.equal(architecture.modeContract.primaryRule,'DESIGN_ARCHITECTURE_AND_CONTRACTS_BEFORE_WRITING_FEATURE_CODE');
  assert.ok(architecture.sourceLayout.logicalModules.length>=5);
  assert.ok(architecture.stateOwnership.length>=5);
  assert.ok(architecture.apiContracts.length>=4);
  assert.ok(architecture.implementationUnits.length>=5);
  assert.ok(architecture.microRuntimeTests.length>=5);
  assert.ok(architecture.invariants.length>=7);
  assert.ok(architecture.regressionPlan.length>=5);
  assert.ok(architecture.codingLoop.includes('PREDICT_IMPACT'));
  assert.ok(architecture.codingLoop.includes('ADD_OR_UPDATE_REGRESSION_CASE'));
  assert.equal(review.pass,true);
});

test('existing game selects PRESERVE_PATCH and protects source/save behavior',()=>{
  const sourceAnalysis=analyzeExistingGameSource(`<main><script>function saveGame(){} localStorage.setItem('save-v7','{}'); let gold=5;</script></main>`);
  const architecture=buildCodingArchitecture({gameId:'existing',genre:'STORY_COMPLETE_RPG',baseline:{content:{}},gameplaySketch:sketch('existing'),sourceAnalysis});
  assert.equal(architecture.developmentMode,'PRESERVE_PATCH');
  assert.equal(architecture.modeContract.sourcePolicy,'PRESERVE_WORKING_SOURCE_STRUCTURE_SAVE_KEYS_MEANINGS_AND_GAME_RULES');
  assert.equal(architecture.sourceLayout.physicalPolicy,'PRESERVE_EXISTING_PHYSICAL_LAYOUT');
  assert.equal(architecture.changeBudget.preserveWorkingCode,true);
  assert.match(architecture.refactorPolicy.behaviorContract,/PRESERVE_OBSERVABLE_GAMEPLAY_AND_SAVE_BEHAVIOR/);
  assert.equal(evaluateCodingArchitecture(architecture).pass,true);
});

test('RECOMPOSE uses abstract mechanics for reference-only external games',()=>{
  const baseline={developmentMode:'RECOMPOSE',recomposition:{enabled:true,sources:[{name:'Reference A',rights:'REFERENCE_ONLY'},{name:'Reference B',rights:'REFERENCE_ONLY'}]},content:{coreLoop:['explore','fight','trade']}};
  const architecture=buildCodingArchitecture({gameId:'recompose',genre:'ACTION_SURVIVAL_ROGUELITE',baseline,gameplaySketch:sketch('recompose','ACTION_SURVIVAL_ROGUELITE',baseline),sourceAnalysis:analyzeExistingGameSource('')});
  assert.equal(architecture.developmentMode,'RECOMPOSE');
  assert.equal(architecture.modeContract.referenceCount,2);
  assert.equal(architecture.modeContract.sourceRightsMode,'ABSTRACT_MECHANICS_AND_FLOW_ONLY');
  assert.match(architecture.modeContract.sourcePolicy,/DO_NOT_COPY_EXTERNAL_CODE_ASSETS_TEXT_LEVEL_LAYOUT/);
  assert.ok(architecture.forbidden.includes('UNAUTHORIZED_EXTERNAL_SOURCE_OR_ASSET_COPY'));
  assert.equal(evaluateCodingArchitecture(architecture).pass,true);
});

test('RECOMPOSE recognizes explicitly owned or authorized source references',()=>{
  const baseline={developmentMode:'RECOMPOSE',recomposition:{enabled:true,sources:[{name:'Owned A',rights:'OWNED_OR_AUTHORIZED'},{name:'Owned B',rights:'AUTHORIZED'}]},content:{coreLoop:['build','defend','expand']}};
  const architecture=buildCodingArchitecture({gameId:'owned-recompose',genre:'SINGLE_DEFENSE_STRATEGY',baseline,gameplaySketch:sketch('owned-recompose','SINGLE_DEFENSE_STRATEGY',baseline),sourceAnalysis:analyzeExistingGameSource('')});
  assert.equal(architecture.modeContract.sourceRightsMode,'AUTHORIZED_SOURCE_LEVEL_ANALYSIS_ALLOWED');
  assert.match(architecture.modeContract.sourcePolicy,/PROVENANCE_MUST_REMAIN_CLEAR/);
});

test('coding architecture enforces state ownership APIs events invariants and micro runtime tests',()=>{
  const architecture=buildCodingArchitecture({gameId:'systems',genre:'STORY_COMPLETE_RPG',baseline:{content:{}},gameplaySketch:sketch('systems'),sourceAnalysis:analyzeExistingGameSource('')});
  const ownerSystems=new Set(architecture.stateOwnership.map(x=>x.system));
  assert.ok(ownerSystems.has('PLAYER'));
  assert.ok(ownerSystems.has('WORLD'));
  assert.ok(ownerSystems.has('COMBAT'));
  assert.ok(ownerSystems.has('ECONOMY'));
  assert.ok(architecture.apiContracts.some(x=>x.api.startsWith('resolveCombatAction')));
  assert.ok(architecture.eventContracts.every(x=>x.idempotency.includes('DUPLICATE_CAUSAL_EVENT')));
  assert.ok(architecture.invariants.some(x=>x.id==='ECONOMY_NO_UNDECLARED_NEGATIVE_BALANCE'));
  assert.ok(architecture.invariants.some(x=>x.id==='NO_DUPLICATE_CAUSAL_REWARD'));
  assert.ok(architecture.microRuntimeTests.every(x=>x.cannotSubstituteFor==='FULL_CANONICAL_PROMOTION_VALIDATION'));
  assert.ok(architecture.impactPrediction.some(x=>x.system==='COMBAT'&&x.likelyAffected.includes('PROGRESSION')));
});

test('Vibe context binds coding architecture into the existing canonical patch and repair loop',()=>{
  const baseline={content:{coreLoop:['enter','fight','reward']}};
  const existingHtml=`<main><script>function saveGame(){} localStorage.setItem('save-v5','1');const roll=Math.random()</script></main>`;
  const context=buildVibeDevelopmentContext({gameId:'g',genre:'SINGLE_DEFENSE_STRATEGY',baseline,inventory,existingHtml,blockers:['CODING_INVARIANT_VIOLATION'],runtimeEvidence:null});
  assert.equal(context.version,6);
  assert.equal(context.codingArchitecture.developmentMode,'PRESERVE_PATCH');
  assert.equal(context.codingArchitectureValidation.pass,true);
  assert.equal(context.patchPlan.mode,'PATCH_EXISTING_RESPONSIBLE_SYSTEMS');
  assert.ok(context.patchPlan.tasks.some(x=>x.id==='ESTABLISH_CODING_ARCHITECTURE'));
  assert.ok(context.patchPlan.tasks.some(x=>x.id==='PRESERVE_PATCH_CURRENT_CODEBASE'));
  assert.ok(context.patchPlan.tasks.some(x=>x.id==='IMPLEMENT_FEATURE_UNITS_WITH_MICRO_TESTS'));
  assert.ok(context.patchPlan.tasks.some(x=>x.id==='ENFORCE_STATE_OWNERSHIP_APIS_AND_INVARIANTS'));
  assert.ok(context.patchPlan.tasks.some(x=>x.id==='PREDICT_CHANGE_IMPACT_BEFORE_PATCH'));
  assert.ok(context.patchPlan.tasks.some(x=>x.id==='GENERATE_REGRESSION_CASE_PER_FEATURE_OR_BUG'));
  assert.equal(context.repairLoop.failures.find(x=>x.failure==='CODING_INVARIANT_VIOLATION')?.type,'CODING_ARCHITECTURE');
  assert.ok(context.repairLoop.retryContract.includes('RUN_RELEVANT_MICRO_RUNTIME_TEST'));
  assert.ok(context.repairLoop.retryContract.includes('CHECK_STATE_OWNERSHIP_AND_INVARIANTS'));
  assert.ok(context.repairLoop.retryContract.includes('ADD_OR_UPDATE_REGRESSION_CASE'));
  const prompt=buildApprovedScopeGenerationPrompt({gameId:'g',gameName:'Game',baseline,inventory,existingHtml,preservationBlockers:['CODING_INVARIANT_VIOLATION'],developmentContext:context});
  assert.match(prompt,/codingArchitecture/);
  assert.match(prompt,/PRESERVE_PATCH/);
  assert.match(prompt,/IMPLEMENT_FEATURE_UNITS_WITH_MICRO_TESTS/);
  assert.match(prompt,/STATE_OWNER_ONLY_WRITE/);
  assert.match(prompt,/FULL_CANONICAL_PROMOTION_VALIDATION/);
});

test('greenfield and recompose modes are visible to the existing patch planner without changing pipeline',()=>{
  const green=buildVibeDevelopmentContext({gameId:'green',genre:'STORY_COMPLETE_RPG',baseline:{content:{}},inventory,existingHtml:'',runtimeEvidence:null});
  assert.equal(green.codingArchitecture.developmentMode,'GREENFIELD');
  assert.equal(green.patchPlan.mode,'GREENFIELD_ARCHITECT_THEN_IMPLEMENT');
  assert.ok(green.patchPlan.tasks.some(x=>x.id==='IMPLEMENT_GREENFIELD_ARCHITECTURE_FIRST'));

  const baseline={developmentMode:'RECOMPOSE',recomposition:{enabled:true,sources:[{name:'A',rights:'REFERENCE_ONLY'},{name:'B',rights:'REFERENCE_ONLY'}]},content:{coreLoop:['explore','build','fight']}};
  const recomposed=buildVibeDevelopmentContext({gameId:'mix',genre:'ACTION_SURVIVAL_ROGUELITE',baseline,inventory,existingHtml:'',runtimeEvidence:null});
  assert.equal(recomposed.codingArchitecture.developmentMode,'RECOMPOSE');
  assert.equal(recomposed.patchPlan.mode,'RECOMPOSE_ALLOWED_COMPONENTS_INTO_NEW_ARCHITECTURE');
  assert.ok(recomposed.patchPlan.tasks.some(x=>x.id==='RECOMPOSE_ALLOWED_COMPONENTS_INTO_NEW_ARCHITECTURE'));
});
