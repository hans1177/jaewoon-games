import assert from 'node:assert/strict';
import {
  createVibeSourceGraph,
  rankVibeResponsibleSources,
  runVibeCandidateTournament,
  createVibeRepairLoop,
  createVibeTrajectoryRecord,
  createVibeV3ExecutionContract,
} from '../assets/vibe-v3-engine.js';
import {
  createVibeAssetReconstructionContract,
  createVibeAssetVariantPlan,
  selectVibeAssetVariant,
  createVibeArtPipeline,
} from '../assets/vibe-art-pipeline.js';
import { createVibeDevelopmentPipeline } from '../assets/vibe-development-ai.js';

const graph=createVibeSourceGraph({files:[
  {path:'game/player.js',symbols:['attackPlayer','playerState'],imports:['game/combat.js'],tests:['qa/player.test.mjs'],tags:['player','attack']},
  {path:'game/combat.js',symbols:['resolveDamage','hitTarget'],tests:['qa/combat.test.mjs'],tags:['combat','damage']},
  {path:'game/ui.js',symbols:['renderHud'],tags:['ui','hud']},
]});
assert.equal(graph.nodes.length,3);
const ranked=rankVibeResponsibleSources({graph,request:'공격 데미지 combat damage 수정',hints:['game/combat.js']});
assert.equal(ranked.candidates[0].path,'game/combat.js');

const passEvidence={syntaxPass:true,testsPass:true,runtimePass:true,regressionPass:true,protectedStatePreserved:true,exactRevision:true,responsibleSource:true,checkpoint:true,rollbackReady:true};
const tournament=runVibeCandidateTournament({candidates:[
  {id:'a',changedFiles:4,diffBytes:8000,evidence:{...passEvidence,qualityScore:.82,performanceScore:.8}},
  {id:'b',changedFiles:1,diffBytes:1500,evidence:{...passEvidence,qualityScore:.96,performanceScore:.92}},
  {id:'c',changedFiles:1,diffBytes:1200,evidence:{...passEvidence,runtimePass:false,qualityScore:1,performanceScore:1},failure:'runtime crash'},
]});
assert.equal(tournament.ready,true);
assert.equal(tournament.winner.id,'b');
assert.equal(tournament.evaluations.find(item=>item.id==='c').eligible,false);

const repair=createVibeRepairLoop({attempts:[{candidateId:'c',state:'FAIL',failure:'runtime exception'}],maxAttempts:3});
assert.equal(repair.state,'REPAIR_REQUIRED');
assert.equal(repair.failureClass,'RUNTIME');
assert.equal(repair.attemptsRemaining,2);
const trajectory=createVibeTrajectoryRecord({request:'combat fix',sourceGraph:graph,tournament,repairLoop:repair,finalEvidence:{runtime:'PASS'}});
assert.equal(trajectory.outcome,'VERIFIED_WINNER');
assert.equal(trajectory.learningUse.failedCandidatesPreserved,true);

const execution=createVibeV3ExecutionContract();
assert.equal(execution.version,3);
assert.equal(execution.candidateTournament.count,3);
assert.equal(execution.integration.parallelPipeline,false);
const dev=createVibeDevelopmentPipeline({environment:'chatgpt',request:'기존 전투 코드 오류 수정',responsibleFiles:['game/combat.js']});
assert.equal(dev.generation,'V3');
assert.equal(dev.v3.candidateTournament.required,true);
assert(dev.steps.includes('build-source-dependency-graph'));
assert(dev.steps.includes('deterministic-candidate-tournament'));
assert(dev.steps.includes('persist-success-and-failure-trajectory'));

const owned=createVibeAssetReconstructionContract({asset:{id:'hero',path:'game/assets/hero.png',license:'project-original'}});
assert.equal(owned.derivativesAllowed,true);
assert.equal(owned.ownedOriginal,true);
assert.equal(owned.provenance.originalOverwriteForbidden,true);
const blocked=createVibeAssetReconstructionContract({asset:{id:'nd',path:'game/assets/nd.png',license:'CC-BY-ND-4.0'}});
assert.equal(blocked.derivativesAllowed,false);

const plan=createVibeAssetVariantPlan({asset:{id:'hero',path:'game/assets/hero.png',license:'project-original'},variantCount:3});
assert.equal(plan.ready,true);
assert.equal(plan.variants.length,3);
assert(plan.variants.every(item=>item.outputPath.includes('/derived/')));
assert(plan.variants.every(item=>item.sourceOverwrite===false));
const results=plan.variants.map((variant,index)=>({id:variant.id,provenanceRecorded:true,referenceIntegrity:true,mobilePerformancePass:true,styleConsistency:.8+index*.05,silhouetteReadability:.82+index*.04,visualQuality:.81+index*.05,animationReadiness:.8,performanceScore:.9-index*.03}));
const selected=selectVibeAssetVariant({plan,results});
assert.equal(selected.ready,true);
assert(selected.winner);
assert.equal(selected.originalImmutable,true);
const incomplete=selectVibeAssetVariant({plan,results:results.slice(0,2)});
assert.equal(incomplete.ready,false);
assert(incomplete.blockedReasons.includes('all-variants-must-be-observed'));
const art=createVibeArtPipeline({request:'기존 캐릭터 그래픽 고퀄 개선',target:'web'});
assert.equal(art.generation,'V3');
assert.equal(art.art.selfTransformExistingAssets,true);
assert.equal(art.art.originalOverwriteForbidden,true);
assert.equal(art.art.variantTournament,true);

console.log('PASS Vibe3 candidate tournament, repair loop, trajectory and asset variants');
