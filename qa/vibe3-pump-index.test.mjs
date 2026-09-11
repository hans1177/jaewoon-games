import assert from 'node:assert/strict';
import { buildVibeVerifiedMemoryIndex, retrieveVibeVerifiedPatterns, createVibeTaskPlaybook, createVibePumpModeContract } from '../assets/vibe-v3-engine.js';
import { createVibePumpCandidatePlan } from '../assets/vibe-development-ai.js';
import { buildPumpArtifacts } from '../tools/vibe3-pump-index.mjs';

const ordinary={sampleId:'s-code',instruction:'fix inventory save bug',output:'verified patch',taskType:'bugfix',lifecycle:'active',project:'game-a',sourceRevision:'abc1234',provenance:{sourceKind:'vibe2',sourceRevision:'abc1234'},qa:{independentQa:'PASS',browserQa:'PASS',runtime:'PASS'}};
const unity={sampleId:'s-unity',instruction:'fix Android build',output:'verified unity patch',taskType:'unity',lifecycle:'active',project:'game-b',sourceRevision:'def5678',provenance:{sourceKind:'vibe2',sourceRevision:'def5678'},qa:{independentQa:'PASS',browserQa:'NOT_APPLICABLE',runtime:'PASS'}};
const external={sampleId:'s-blackbox',instruction:'verify black box input',output:'bounded observation',taskType:'qa',lifecycle:'active',project:'block-blast',sourceRevision:'sha256:abc',provenance:{sourceKind:'external-black-box',sourceRevision:'sha256:abc'},qa:{independentQa:'BLACK_BOX_EVIDENCE_PASS',browserQa:'NOT_APPLICABLE',runtime:'PASS'}};
const unverified={sampleId:'bad',instruction:'guess',output:'bad',taskType:'coding',lifecycle:'active',project:'x',sourceRevision:'z',provenance:{sourceKind:'vibe2',sourceRevision:'z'},qa:{independentQa:'PASS',browserQa:'FAIL',runtime:'PASS'}};
const trajectory={trajectoryId:'traj-ok',request:'repair inventory save runtime',outcome:'VERIFIED_WINNER',metadata:{taskType:'bugfix',project:'game-a'},finalEvidence:{runtimePass:true,qaPassed:true,regressionPassed:true,exactRevision:true,protectedStatePreserved:true,sourceRevision:'fff1111'},candidates:[{id:'c1',eligible:false,failure:'runtime crash'},{id:'c2',eligible:true,score:.9}]};

const index=buildVibeVerifiedMemoryIndex({trainingSamples:[ordinary,unity,external,unverified],trajectories:[trajectory]});
assert.equal(index.positive.length,4);
assert(!index.positive.some(x=>x.id==='bad'));
assert(index.failureWarnings.some(x=>x.id==='c1'));
assert(index.failureWarnings.every(x=>x.positiveTrainingAllowed===false));
const retrieval=retrieveVibeVerifiedPatterns({index,request:'inventory save bug repair',taskType:'bugfix',project:'game-a'});
assert(retrieval.successes.length>0);
assert.equal(retrieval.successes[0].entry.taskType,'bugfix');
const playbook=createVibeTaskPlaybook({taskType:'bugfix',retrieval});
assert(playbook.checklist.includes('reproduce-or-bind-failure-evidence'));
assert(playbook.reuse.length>0);

const pump=createVibePumpModeContract();
assert.equal(pump.enabled,true);
assert.equal(pump.candidateTournament.default,5);
assert.equal(pump.candidateTournament.min,3);
assert.equal(pump.candidateTournament.max,5);
assert.equal(pump.repairLoop.maxAttempts,3);
assert.equal(pump.experiencePump.benchmarkCountsAsTrainingSample,false);
assert.equal(pump.weights.localWeightsRequiredForPump,false);
assert.equal(pump.weights.githubHostedModelTrainingAllowed,false);

const candidatePlan=createVibePumpCandidatePlan({environment:'chatgpt',candidateCount:5,teacherCandidateMax:2,groq:{available:true},mistral:{available:true}});
assert.equal(candidatePlan.candidateCount,5);
assert.equal(candidatePlan.teachers.length,2);
assert(candidatePlan.teachers.every(x=>x.authoritative===false&&x.completionAuthority===false));
assert.equal(candidatePlan.paidFallback,false);

const artifacts=buildPumpArtifacts({trainingSamples:[ordinary,unity,external,unverified],trajectories:[trajectory]});
assert.equal(Object.keys(artifacts.playbooks.taskTypes).length,7);
assert(artifacts.benchmark.cases.length>0);
assert(artifacts.benchmark.cases.every(x=>x.countsAsTrainingSample===false));
assert(artifacts.benchmark.cases.every(x=>x.candidateCount===5&&x.maxRepairAttempts===3));
console.log('PASS Vibe3 Pump verified RAG/playbook/benchmark contract');
