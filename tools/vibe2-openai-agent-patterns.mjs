// 파일명: tools/vibe2-openai-agent-patterns.mjs
// OpenAI Agents SDK handoff / Simple Evals-inspired deterministic verification.
// Independent implementation, no vendored SDK source or paid OpenAI API dependency.
// References: https://github.com/openai/openai-agents-js
//             https://github.com/openai/simple-evals
import {createHash} from 'node:crypto';

const clean=v=>String(v??'').trim();
const uniq=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const ROUTES=new Set(['text-source-worker','engine-editor','analysis-only','learning-web-artifact']);
const GAME_ROOTS=/^(?:web-games|roblox-games|unity-games|unreal-games|godot-games|uefn-games)\//;
const pathSafe=p=>!p.startsWith('/')&&!p.split('/').includes('..')&&!p.includes('\\');
const freezeStages=stages=>Object.freeze(stages.map(s=>Object.freeze({...s})));
export const VIBE_OPENAI_PATTERN_REFERENCES=Object.freeze([
  'https://github.com/openai/openai-agents-js',
  'https://github.com/openai/simple-evals'
]);

// Agent handoffs are data only: they never grant writes or deploy a release.
// Existing Vibe work locks, runtime/build QA and fan-in own those decisions.
export function planVibeAgentHandoff({task={},route='',target='',responsibleFiles=[],qa=[]}={}){
  const selectedRoute=clean(route?.route||route);
  if(!ROUTES.has(selectedRoute))throw new Error('VIBE_HANDOFF_UNSUPPORTED_ROUTE');
  const files=uniq(responsibleFiles).map(v=>v.replace(/^\.\//,''));
  if(files.some(p=>!pathSafe(p)))throw new Error('VIBE_HANDOFF_UNSAFE_FILE_PATH');
  const gameId=clean(task.gameId);
  const gameTarget=clean(target||task.target).toLowerCase();
  const gameScoped=files.some(p=>GAME_ROOTS.test(p));
  const writes=selectedRoute==='text-source-worker'||selectedRoute==='engine-editor';
  const stages=[
    {id:'TRIAGE',agent:'VIBE_EXISTING_PLANNER',provider:'DETERMINISTIC',output:'RESPONSIBLE_GAME_FILES_AND_TASK_GOAL'},
    ...(writes?[{id:'GENERATE',agent:selectedRoute==='engine-editor'?'VIBE_EXISTING_ENGINE_EDITOR':'VIBE_EXTERNAL_SOURCE_WORKER',
      provider:selectedRoute==='engine-editor'?'EXISTING_ENGINE_RUNTIME':'GEMINI_API',
      output:'ISOLATED_GAME_CANDIDATE'}]:[{id:'ANALYZE',agent:'VIBE_EXTERNAL_LEARNING_WORKER',provider:'GEMINI_API',
      output:'PRACTICE_OR_ANALYSIS_ONLY'}]),
    {id:'VERIFY',agent:'VIBE_EXISTING_GAME_QA',provider:'DETERMINISTIC',output:'EXACT_GAME_QA_RESULT'},
    {id:'HANDOFF',agent:'VIBE_EXISTING_FAN_IN',provider:'DETERMINISTIC',output:'VERIFIED_CANDIDATE_OR_RETRY'}
  ];
  const checks=uniq(qa);
  const input={gameId,gameTarget,selectedRoute,files,checks,taskId:clean(task.id)};
  return Object.freeze({
    version:1,pattern:'OPENAI_AGENT_HANDOFF_AND_DETERMINISTIC_EVAL',
    cost:'NO_NEW_MODEL_CALLS',openAiApiRequired:false,
    modelTransport:'EXTERNAL_GEMINI_OR_EXISTING_ENGINE',
    localAiRequired:false,executionState:'PLANNED_NOT_EXECUTED',
    taskId:input.taskId,gameId,gameTarget,gameScoped,
    responsibleFiles:Object.freeze(files),gameQa:Object.freeze(checks),
    handoffFingerprint:sha(input),stages:freezeStages(stages),
    evalContract:Object.freeze({
      exactTaskMatch:true,exactFilesOnly:true,
      gameQaEvidenceRequired:true,sourceRevisionRequired:writes,
      publishProofRequiredForPublishedClaim:true,
      selfReportedPassIsNotEvidence:true
    }),
    automaticSourceWrite:false,automaticPublication:false
  });
}

// Check the live source-worker assignment against the immutable planner handoff.
// This preflight does not grant source-write or release authority.
export function assertVibeAgentHandoffScope({plan={},task={},route='',target='',responsibleFiles=[]}={}){
  const expected=planVibeAgentHandoff({task,route,target,responsibleFiles,qa:plan.gameQa||[]});
  if(plan.handoffFingerprint!==expected.handoffFingerprint||plan.executionState!=='PLANNED_NOT_EXECUTED')
    throw new Error('VIBE_HANDOFF_WORK_ORDER_DRIFT');
  if(plan.automaticSourceWrite!==false||plan.automaticPublication!==false)
    throw new Error('VIBE_HANDOFF_AUTHORITY_EXPANSION');
  return Object.freeze({pass:true,fingerprint:expected.handoffFingerprint,authorityExpanded:false});
}

// Simple deterministic evaluator; optional independent QA evidence, never an AI self-grade.
export function evaluateVibeAgentHandoff(plan={},evidence={}){
  const failures=[];
  if(!plan?.handoffFingerprint)failures.push('HANDOFF_PLAN_MISSING');
  if(clean(evidence.taskId)!==clean(plan.taskId))failures.push('HANDOFF_TASK_MISMATCH');
  const observed=uniq(evidence.changedFiles);
  if(plan.evalContract?.sourceRevisionRequired && !observed.length)failures.push('HANDOFF_CHANGED_FILES_MISSING');
  if(clean(evidence.handoffFingerprint)&&clean(evidence.handoffFingerprint)!==clean(plan.handoffFingerprint))
    failures.push('HANDOFF_FINGERPRINT_MISMATCH');
  if(observed.some(p=>!plan.responsibleFiles?.includes(p)))failures.push('HANDOFF_OUT_OF_SCOPE_FILE');
  if(plan.evalContract?.sourceRevisionRequired && !/^[a-f0-9]{40}$/i.test(clean(evidence.sourceRevision)))
    failures.push('HANDOFF_SOURCE_REVISION_MISSING');
  const required=plan.gameQa||[];
  if(required.length && !(Array.isArray(evidence.qaEvidence)&&
    required.every(name=>evidence.qaEvidence.some(x=>x?.id===name&&x?.pass===true&&x?.independent===true))))
    failures.push('HANDOFF_GAME_QA_EVIDENCE_MISSING');
  if(evidence.publicationClaimed===true){
    if(!(evidence.publishEvidence?.verified===true&&
      /^[a-f0-9]{40}$/i.test(clean(evidence.publishEvidence?.sourceRevision))))
      failures.push('HANDOFF_PUBLICATION_PROOF_MISSING');
    else if(clean(evidence.publishEvidence.sourceRevision)!==clean(evidence.sourceRevision))
      failures.push('HANDOFF_PUBLICATION_REVISION_MISMATCH');
  }
  return Object.freeze({pass:failures.length===0,errors:Object.freeze(failures),review:'DETERMINISTIC_GAME_EVIDENCE_ONLY'});
}
export function vibeAgentHandoffGuidance(plan={}){
  const steps=(plan.stages||[]).map(s=>s.id+':'+s.agent+'['+s.provider+']').join(' -> ');
  return [
    '[VIBE GAME AGENT HANDOFF — OpenAI published patterns, not OpenAI model API]',
    'handoff-sha256='+clean(plan.handoffFingerprint),
    'task='+clean(plan.taskId)+'; game='+clean(plan.gameId)+'; provider='+clean(plan.modelTransport),
    'steps='+steps,
    'Only modify assigned game files; keep existing Vibe source locks and runtime game QA.',
    'Independent game QA and exact source revision are required before any published-claim.',
    'No local Ollama, no additional OpenAI API call, no new paid model dependency.'
  ].join('\n');
}
