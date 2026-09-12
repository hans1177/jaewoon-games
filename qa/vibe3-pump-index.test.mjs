import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildVibeVerifiedMemoryIndex, retrieveVibeVerifiedPatterns, createVibeTaskPlaybook, createVibePumpModeContract } from '../assets/vibe-v3-engine.js';
import { createVibePumpCandidatePlan } from '../assets/vibe-development-ai.js';
import { buildPumpArtifacts } from '../tools/vibe3-pump-index.mjs';

const ordinary={sampleId:'s-code',instruction:'fix inventory save bug',output:'verified patch',taskType:'bugfix',lifecycle:'active',project:'game-a',sourceRevision:'abc1234',provenance:{sourceKind:'vibe2',sourceRevision:'abc1234'},qa:{independentQa:'PASS',browserQa:'PASS',runtime:'PASS'}};
const web={sampleId:'s-web',instruction:'fix webgame mobile touch save load responsive regression',output:'verified web patch',taskType:'coding',lifecycle:'active',project:'web-game',sourceRevision:'web1234',sourcePaths:['web-games/web-game/index.html'],tags:['webgame','touch-input','mobile-ui','save-load','responsive','regression'],provenance:{sourceKind:'vibe2',sourceRevision:'web1234'},qa:{independentQa:'PASS',browserQa:'PASS',runtime:'PASS'}};
const unity={sampleId:'s-unity',instruction:'fix Android build',output:'verified unity patch',taskType:'unity',lifecycle:'active',project:'game-b',sourceRevision:'def5678',provenance:{sourceKind:'vibe2',sourceRevision:'def5678'},qa:{independentQa:'PASS',browserQa:'NOT_APPLICABLE',runtime:'PASS'}};
const roblox={sampleId:'s-roblox',instruction:'fix Roblox save and rejoin',output:'verified roblox patch',taskType:'roblox',lifecycle:'active',project:'game-r',sourceRevision:'abc9876',provenance:{sourceKind:'vibe2',sourceRevision:'abc9876'},qa:{independentQa:'PASS',browserQa:'NOT_APPLICABLE',runtime:'PASS'}};
const external={sampleId:'s-blackbox',instruction:'verify black box input',output:'bounded observation',taskType:'qa',lifecycle:'active',project:'block-blast',sourceRevision:'sha256:abc',provenance:{sourceKind:'external-black-box',sourceRevision:'sha256:abc'},qa:{independentQa:'BLACK_BOX_EVIDENCE_PASS',browserQa:'NOT_APPLICABLE',runtime:'PASS'}};
const unverified={sampleId:'bad',instruction:'guess',output:'bad',taskType:'coding',lifecycle:'active',project:'x',sourceRevision:'z',provenance:{sourceKind:'vibe2',sourceRevision:'z'},qa:{independentQa:'PASS',browserQa:'FAIL',runtime:'PASS'}};
const trajectory={trajectoryId:'traj-ok',request:'repair inventory save runtime',outcome:'VERIFIED_WINNER',metadata:{taskType:'bugfix',project:'game-a',sourcePaths:['web-games/game-a/index.html']},finalEvidence:{runtimePassed:true,qaPassed:true,regressionPassed:true,exactRevision:true,protectedStatePreserved:true,sourceRevision:'fff1111'},candidates:[{id:'c1',eligible:false,failure:'runtime crash'},{id:'c2',eligible:true,score:.9}]};

const index=buildVibeVerifiedMemoryIndex({trainingSamples:[ordinary,web,unity,roblox,external,unverified],trajectories:[trajectory]});
assert.equal(index.version,2);
assert.equal(index.positive.length,6);
assert(!index.positive.some(x=>x.id==='bad'));
assert(index.positive.some(x=>x.id==='s-roblox'));
const webMemory=index.positive.find(x=>x.id==='s-web');
assert(webMemory.tags.includes('webgame'));
assert(webMemory.tags.includes('touch-input'));
assert(index.failureWarnings.some(x=>x.id==='c1'));
assert(index.failureWarnings.every(x=>x.positiveTrainingAllowed===false));
assert.equal(index.policy.portableContextMayCrossPlatforms,true);
assert.equal(index.policy.platformEvidenceMayNotTransfer,true);

const retrieval=retrieveVibeVerifiedPatterns({index,request:'inventory save bug repair',taskType:'bugfix',project:'game-a'});
assert(retrieval.successes.length>0);
assert.equal(retrieval.successes[0].entry.taskType,'bugfix');
const playbook=createVibeTaskPlaybook({taskType:'bugfix',retrieval});
assert(playbook.checklist.includes('reproduce-or-bind-failure-evidence'));
assert(playbook.reuse.length>0);

const robloxRetrieval=retrieveVibeVerifiedPatterns({index,request:'Roblox mobile touch save load rejoin responsive regression webgame',taskType:'roblox',project:'game-r',topKSuccess:8,topKFailure:6});
const robloxPlaybook=createVibeTaskPlaybook({taskType:'roblox',retrieval:robloxRetrieval});
assert.equal(robloxPlaybook.taskType,'roblox');
assert(robloxPlaybook.checklist.includes('reuse-portable-web-mobile-save-regression-patterns-as-context-only'));
assert(robloxPlaybook.checklist.includes('separate-server-client-authority'));
assert(robloxPlaybook.checklist.includes('publish-only-after-exact-revision-pass'));
assert.equal(robloxPlaybook.platformEvidenceTransferAllowed,false);
const portableWebReuse=robloxPlaybook.reuse.find(item=>item.id==='s-web');
assert(portableWebReuse);
assert.equal(portableWebReuse.portableContextOnly,true);
assert.equal(portableWebReuse.sourceTaskType,'coding');
assert(portableWebReuse.tags.includes('webgame'));

const pump=createVibePumpModeContract();
assert.equal(pump.version,2);
assert.equal(pump.enabled,true);
assert.equal(pump.candidateTournament.default,5);
assert.equal(pump.candidateTournament.min,3);
assert.equal(pump.candidateTournament.max,5);
assert.equal(pump.repairLoop.maxAttempts,3);
assert.equal(pump.experiencePump.continuousMode,'24H');
assert.equal(pump.experiencePump.benchmarkCountsAsTrainingSample,false);
assert.equal(pump.weights.localWeightsRequiredForPump,false);
assert.equal(pump.weights.preferredTrainingBackend,'SERVER_SELF_HOSTED');
assert.equal(pump.weights.localTrainingBackendPreserved,true);
assert.equal(pump.weights.githubHostedModelTrainingAllowed,false);

const candidatePlan=createVibePumpCandidatePlan({environment:'chatgpt',candidateCount:5,teacherCandidateMax:2,groq:{available:true},mistral:{available:true}});
assert.equal(candidatePlan.candidateCount,5);
assert.equal(candidatePlan.teachers.length,2);
assert(candidatePlan.teachers.every(x=>x.authoritative===false&&x.completionAuthority===false));
assert.equal(candidatePlan.paidFallback,false);

const artifacts=buildPumpArtifacts({trainingSamples:[ordinary,web,unity,roblox,external,unverified],trajectories:[trajectory]});
assert.equal(Object.keys(artifacts.playbooks.taskTypes).length,9);
assert.equal(artifacts.playbooks.taskTypes.roblox.taskType,'roblox');
assert.equal(artifacts.playbooks.policy.preferredTrainingBackend,'SERVER_SELF_HOSTED');
assert.equal(artifacts.playbooks.policy.localTrainingBackendPreserved,true);
assert.equal(artifacts.playbooks.policy.platformEvidenceMayNotTransfer,true);
assert(artifacts.playbooks.taskTypes.roblox.reuse.some(item=>item.id==='s-web'&&item.portableContextOnly===true));
assert(artifacts.benchmark.cases.length>0);
assert.equal(artifacts.benchmark.continuousMode,'24H');
assert.equal(artifacts.benchmark.preferredTrainingBackend,'SERVER_SELF_HOSTED');
assert.equal(artifacts.benchmark.localTrainingBackendPreserved,true);
assert(artifacts.benchmark.cases.every(x=>x.countsAsTrainingSample===false));
assert(artifacts.benchmark.cases.every(x=>x.candidateCount===5&&x.maxRepairAttempts===3));

const ingestWorkflow=fs.readFileSync('.github/workflows/vibe2-distillation-ingest.yml','utf8');
const trainingWorkflow=fs.readFileSync('.github/workflows/vibe2-local-distillation-train.yml','utf8');
assert.match(ingestWorkflow,/VIBE2_LEARNING_RUNTIME_BRANCH:\s*vibe2-learning-runtime/);
assert.match(ingestWorkflow,/git push --force-with-lease=/);
assert(!ingestWorkflow.includes('gh pr create'));
assert((trainingWorkflow.match(/ref:\s*vibe2-learning-runtime/g)||[]).length>=2);
console.log('PASS Vibe3 Pump web portable context, Roblox evidence isolation, server-primary/local-preserved 24H contract');
