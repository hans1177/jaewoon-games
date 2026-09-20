const clean=v=>String(v??'').trim();
const posix=v=>clean(v).replaceAll('\\\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const uniq=xs=>[...new Set((xs||[]).map(posix).filter(Boolean))];

export const SYSTEM_ARCHITECTURE_ALLOWED_PREFIXES=Object.freeze([
  'tools/','qa/','assets/','.github/workflows/','company-learning/'
]);
export const SYSTEM_ARCHITECTURE_ALLOWED_EXACT=Object.freeze(['vibe2-runtime.json']);

export function isAllowedSystemArchitecturePath(value=''){
  const p=posix(value);
  if(!p||p==='.'||p.includes('..'))return false;
  return SYSTEM_ARCHITECTURE_ALLOWED_EXACT.includes(p)||SYSTEM_ARCHITECTURE_ALLOWED_PREFIXES.some(prefix=>p.startsWith(prefix));
}
export function assertSystemArchitectureTask(task={}){
  const evidence=new Set((task.evidence||[]).map(clean));
  if(clean(task.target).toLowerCase()!=='system')throw new Error('SYSTEM_ARCHITECTURE_TARGET_REQUIRED');
  if(clean(task.department).toLowerCase()!=='system-architecture')throw new Error('SYSTEM_ARCHITECTURE_DEPARTMENT_REQUIRED');
  if(task.systemSteward!==true)throw new Error('SYSTEM_ARCHITECTURE_STEWARD_REQUIRED');
  if(!evidence.has('vibe-self-architecture-evolution'))throw new Error('SYSTEM_ARCHITECTURE_EVOLUTION_EVIDENCE_REQUIRED');
  if(!evidence.has('architecture-authority-expansion:NO'))throw new Error('SYSTEM_ARCHITECTURE_AUTHORITY_GUARD_REQUIRED');
  if(!evidence.has('architecture-gate-weakening:NO'))throw new Error('SYSTEM_ARCHITECTURE_GATE_GUARD_REQUIRED');
  if(!evidence.has('architecture-neural-expansion-phase:LAST_STAGE_ONLY'))throw new Error('SYSTEM_ARCHITECTURE_NEURAL_EXPANSION_PHASE_GUARD_REQUIRED');
  if(!evidence.has('architecture-neural-expansion-mode:EVIDENCE_GATED_SELF_EXPANSION'))throw new Error('SYSTEM_ARCHITECTURE_NEURAL_EXPANSION_MODE_REQUIRED');
  if(!evidence.has('architecture-rule5-atomization-required:YES'))throw new Error('SYSTEM_ARCHITECTURE_RULE5_ATOMIZATION_REQUIRED');
  if(!evidence.has('architecture-rule5-neuronization-required:YES'))throw new Error('SYSTEM_ARCHITECTURE_RULE5_NEURONIZATION_REQUIRED');
  if(!evidence.has('architecture-rule5-central-code-sync-required:YES'))throw new Error('SYSTEM_ARCHITECTURE_RULE5_CENTRAL_CODE_SYNC_REQUIRED');
  const neuralReady=evidence.has('architecture-neural-expansion-readiness:PASS');
  const neuralAllowedYes=evidence.has('architecture-neural-expansion-allowed:YES');
  const neuralAllowedNo=evidence.has('architecture-neural-expansion-allowed:NO');
  if(neuralReady!==neuralAllowedYes)throw new Error('SYSTEM_ARCHITECTURE_NEURAL_EXPANSION_READINESS_MISMATCH');
  if(neuralAllowedYes===neuralAllowedNo)throw new Error('SYSTEM_ARCHITECTURE_NEURAL_EXPANSION_GUARD_REQUIRED');
  const responsible=uniq(task.responsibleFiles||[]);
  if(!responsible.length||responsible.length>4)throw new Error('SYSTEM_ARCHITECTURE_RESPONSIBLE_FILE_COUNT_INVALID');
  for(const file of responsible)if(!isAllowedSystemArchitecturePath(file))throw new Error('SYSTEM_ARCHITECTURE_PATH_FORBIDDEN:'+file);
  return Object.freeze({
    valid:true,responsibleFiles:Object.freeze(responsible),
    systemConstructionAllowed:evidence.has('architecture-system-construction-allowed'),
    neuralExpansionPhase:'LAST_STAGE_ONLY',
    neuralExpansionMode:'EVIDENCE_GATED_SELF_EXPANSION',
    neuralExpansionReadiness:neuralReady?'PASS':'PENDING',
    neuralExpansionAllowed:neuralReady&&neuralAllowedYes,
    neuralExecutionAuthorityExpansionAllowed:false,
    rule5AtomicArchitectureRequired:true,
    rule5NeuronizationRequired:true,
    rule5CentralCodeSyncRequired:true,
    authorityExpanded:false,gateWeakening:false
  });
}
export function systemArchitectureGuidance(task={}){
  const contract=assertSystemArchitectureTask(task);
  return [
    '[VIBE SYSTEM ARCHITECTURE EVOLUTION CONTRACT]',
    'Vibe is the implementation actor for this internal architecture upgrade.',
    'Read the current responsible systems and structural evidence before changing code.',
    'Compare at least two alternatives, choose the smallest causal architecture change, and modify the existing responsible system directly.',
    contract.systemConstructionAllowed?'A new internal helper/system file is allowed only when its exact path is already listed in responsibleFiles and the existing architecture truly lacks the capability.':'New files are not authorized by this task.',
    'Do not create wrapper/shadow duplicate systems merely to bypass the current responsibility.',
    'Rule 5 requires this structure to be decomposed into atomic responsibility nodes, mapped to neuron types and causal/dependency edges, then synchronized across central policy, company architecture map, responsible code, and contract tests before activation.',
    'Do not expand authority, lower gates or thresholds, fabricate PASS, delete verified learning, weaken security, or change game design/balance.',
    contract.neuralExpansionAllowed
      ?'Neural expansion is evidence-gated and authorized for this task because final-stage readiness evidence passed. Vibe may expand internal neural nodes, edges, routing, memory, or learning structure when the structural cause justifies it, but neural execution authority MUST remain unchanged.'
      :'Neural expansion remains unavailable for this task because final-stage readiness evidence has not passed. Continue normal self-architecture evolution without neural expansion.',
    'The candidate must pass same-failure recheck, related regression, security verification, before/after metric comparison, and Rule 5 central-architecture-code-test consistency. No verified improvement or consistency means no adoption.',
    'Exact writable files='+contract.responsibleFiles.join(', ')
  ].join('\n');
}
