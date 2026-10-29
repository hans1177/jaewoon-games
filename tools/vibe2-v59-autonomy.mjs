// Vibe5.9: bounded, source-grounded autonomous coding capabilities.
// No source writes, asset fabrication, runtime attestation, or release authority.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {synthesizeVibe59RobloxServerAction,inspectVibe59RobloxCoding,synthesizeVibe59RobloxDomainAction,verifyVibe59RobloxDomainScenarios} from './vibe59-roblox-coding.mjs';
import {buildVibe59CreativityPlan} from './vibe59-creative-engine.mjs';
import {VIBE59_LUAU_CODING_SKILLS_109,synthesizeVibe59LuauSkill,verifyVibe59LuauSkillScenarios} from './vibe59-luau-skills109.mjs';
import {VIBE59_QUALITY_GAMEPLAY_ACTIONS,synthesizeVibe59QualityGameplay,verifyVibe59QualityScenarios} from './vibe59-quality-gameplay.mjs';
import {synthesizeVibe59Pathfinding,verifyVibe59PathfindingScenarios} from './vibe59-pathfinding.mjs';
import {buildVibeVerifiedMemoryIndex,retrieveVibeVerifiedPatterns,classifyVibeRepairFailure} from '../assets/vibe-v3-engine.js';
const sha=x=>crypto.createHash('sha256').update(String(x)).digest('hex');
const clean=x=>String(x??'').trim();
const identifier=/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/;
const validName=x=>typeof x==='string'&&identifier.test(x)
  &&!x.split('.').some(k=>['prototype','constructor','__proto__'].includes(k));
const operators={eq:'===',ne:'!==',gt:'>',gte:'>=',lt:'<',lte:'<='};
const systems={
  combat:/전투|공격|피격|combat|attack|damage/i,
  inventory:/인벤토리|가방|inventory|item/i,
  building:/건축|설치|building|placement|blueprint/i,
  bestiary:/도감|bestiary|encyclopedia/i,
  saving:/저장|세이브|save|load|persist/i,
  world:/맵|지역|월드|map|biome|world/i,
  ai:/몬스터|추격|enemy|npc|boss/i,
  ui:/화면|버튼|ui|hud|button/i
};
function finite(n,label){if(typeof n!=='number'||!Number.isFinite(n)||Math.abs(n)>1e9)
  throw Error('VIBE59_INVALID_NUMBER:'+label);return n}
function expression(node,target,depth=0){
  if(!node||typeof node!=='object'||depth>8)throw Error('VIBE59_INVALID_EXPRESSION');
  if(node.kind==='ref'){if(!validName(node.name))throw Error('VIBE59_INVALID_IDENTIFIER');return node.name}
  if(node.kind==='number')return String(finite(node.value,'value'));
  if(node.kind==='boolean'){if(typeof node.value!=='boolean')throw Error('VIBE59_INVALID_BOOLEAN');return String(node.value)}
  if(node.kind==='compare'){
    if(!Object.hasOwn(operators,node.op))throw Error('VIBE59_INVALID_OPERATOR');
    const op=target==='roblox'?({eq:'==',ne:'~='}[node.op]||operators[node.op]):operators[node.op];
    return '('+expression(node.left,target,depth+1)+' '+op+' '+expression(node.right,target,depth+1)+')';
  }
  if(node.kind==='and'||node.kind==='or'){
    if(!Array.isArray(node.items)||node.items.length<2||node.items.length>6)
      throw Error('VIBE59_BOOLEAN_ARGS');
    const sep=target==='roblox'?(node.kind==='and'?' and ':' or '):(node.kind==='and'?' && ':' || ');
    return '('+node.items.map(x=>expression(x,target,depth+1)).join(sep)+')';
  }
  if(node.kind==='not')return (target==='roblox'?'not ':'!')+'('+expression(node.value,target,depth+1)+')';
  throw Error('VIBE59_EXPRESSION_KIND');
}
function action(item,target){
  if(!item||!validName(item.output)||!['assign','add','subtract','multiply','clamp'].includes(item.action))
    throw Error('VIBE59_ACTION_INVALID');
  const value=expression(item.value,target),out=item.output;
  let rhs=value;
  if(item.action==='add')rhs=out+' + '+value;
  if(item.action==='subtract')rhs=out+' - '+value;
  if(item.action==='multiply')rhs=out+' * '+value;
  if(item.action==='clamp'){
    const min=finite(item.minimum,'minimum'),max=finite(item.maximum,'maximum');
    if(min>=max)throw Error('VIBE59_CLAMP_RANGE');
    rhs=target==='roblox'?'math.clamp('+value+', '+min+', '+max+')':
      'Math.min('+max+', Math.max('+min+', '+value+'))';
  }
  return out+' = '+rhs+(target==='roblox'?'':';');
}
export function compileVibe59Requirements({order={},target='web'}={}){
  const spec=order.vibe59Spec??order.selectedTask?.vibe59Spec??{};
  if(!spec||typeof spec!=='object'||Array.isArray(spec))throw Error('VIBE59_SPEC_REQUIRED');
  const raw=Array.isArray(spec.systems)?spec.systems:[];
  if(raw.length>20)throw Error('VIBE59_TOO_MANY_SYSTEMS');
  const explicit=raw.map(x=>typeof x==='string'?x:x?.id);
  if(explicit.some(x=>!Object.hasOwn(systems,x))||new Set(explicit).size!==explicit.length)
    throw Error('VIBE59_SYSTEM_NOT_APPROVED');
  const goal=clean(order.originalGoal||order.goal);
  const suggestions=Object.entries(systems).filter(([k,v])=>v.test(goal)&&!explicit.includes(k)).map(([k])=>k);
  return Object.freeze({version:'5.9',target,goal,explicitSystems:explicit,
    suggestedOnly:suggestions,ownerApproved:spec.ownerApproved===true,
    missingDetails:explicit.length?[]:['explicit-system-spec'],
    sourceWrite:false,authority:'requirements-plan-only'});
}
export function composeVibe59Systems({systems:chosen=[],bindings=[]}={}){
  if(!Array.isArray(chosen)||!Array.isArray(bindings)||chosen.length>20||bindings.length>60)
    throw Error('VIBE59_ASSEMBLY_BOUNDS');
  const nodes=new Set(chosen);
  if(nodes.size!==chosen.length||chosen.some(x=>!Object.hasOwn(systems,x)))
    throw Error('VIBE59_ASSEMBLY_SYSTEM_UNKNOWN');
  const links=[],graph=new Map(chosen.map(x=>[x,[]]));
  for(const b of bindings){
    if(!nodes.has(b.from)||!nodes.has(b.to)||b.from===b.to||!validName(b.event))
      throw Error('VIBE59_BINDING_UNAPPROVED');
    if(links.some(x=>x.from===b.from&&x.to===b.to&&x.event===b.event))
      throw Error('VIBE59_BINDING_DUPLICATE');
    links.push({from:b.from,to:b.to,event:b.event,runtimeVerified:false});
    graph.get(b.from).push(b.to);
  }
  const seen=new Set(),active=new Set(),cycles=[];
  const walk=x=>{if(active.has(x)){cycles.push(x);return}if(seen.has(x))return;
    active.add(x);for(const y of graph.get(x))walk(y);active.delete(x);seen.add(x)};
  for(const x of chosen)walk(x);
  return Object.freeze({systems:chosen,bindings:links,cycleWarnings:[...new Set(cycles)],
    runtimeVerified:false,authority:'assembly-plan-only'});
}
export function synthesizeVibe59StateLogic({rule={},target='web'}={}){
  if(!['web','roblox'].includes(target))throw Error('VIBE59_TARGET_UNSUPPORTED');
  if(!rule.when||!Array.isArray(rule.then)||!rule.then.length||rule.then.length>8)
    throw Error('VIBE59_RULE_INCOMPLETE');
  const condition=expression(rule.when,target),yes=rule.then.map(x=>action(x,target));
  const no=rule.otherwise??[];
  if(!Array.isArray(no)||no.length>8)throw Error('VIBE59_OTHERWISE_INVALID');
  const negative=no.map(x=>action(x,target)),indent=a=>a.map(x=>'  '+x).join('\n');
  const source=target==='roblox'
    ?'if '+condition+' then\n'+indent(yes)+(negative.length?'\nelse\n'+indent(negative):'')+'\nend'
    :'if ('+condition+') {\n'+indent(yes)+'\n}'+(negative.length?' else {\n'+indent(negative)+'\n}':'');
  return Object.freeze({source,condition,actionCount:yes.length+negative.length,
    runtimeVerified:false,target,authority:'synthesized-candidate-only'});
}
export function generateVibe59Tests({rule={},target='web',scenarios=[]}={}){
  const compiled=synthesizeVibe59StateLogic({rule,target});
  if(!Array.isArray(scenarios)||scenarios.length>12)throw Error('VIBE59_TEST_BOUNDS');
  const cases=scenarios.map((row,i)=>{
    if(!row||!clean(row.name)||!row.initialState||!row.expectedState
      ||typeof row.initialState!=='object'||typeof row.expectedState!=='object')
      throw Error('VIBE59_EXPLICIT_EXPECTATION_REQUIRED:'+i);
    for(const value of Object.values({...row.initialState,...row.expectedState}))
      if(typeof value!=='boolean'&&!(typeof value==='number'&&Number.isFinite(value)))
        throw Error('VIBE59_TEST_INPUT_INVALID');
    return {name:clean(row.name).slice(0,80),initialState:row.initialState,
      expectedState:row.expectedState};
  });
  return Object.freeze({cases,sourceDigest:sha(compiled.source),
    coverage:cases.length?'provided-expectations':'no-expectations-yet',
    runnableAgainstRealGame:false,requiresExistingTestHarness:true,
    authority:'test-cases-only'});
}
export function planVibe59Repairs({failures=[],attempts=[],maxAttempts=3}={}){
  if(!Array.isArray(failures)||!Array.isArray(attempts))throw Error('VIBE59_REPAIR_INPUT');
  const limit=Math.max(1,Math.min(5,Math.floor(Number(maxAttempts)||3)));
  const observations=failures.slice(-16).map(x=>clean(typeof x==='string'?x:x?.message||x?.failure)).filter(Boolean);
  const classes=[...new Set(observations.map(classifyVibeRepairFailure))];
  const prior=new Set(attempts.map(x=>clean(x?.fingerprint)).filter(Boolean));
  const mapping={
    SYNTAX:['fix-target-parser-error','regenerate-minimal-expression'],
    RUNTIME:['reproduce-observed-stack','trace-state-event-cause'],
    TEST:['isolate-failed-expectation','compare-before-after-state'],
    SCOPE:['restore-authorized-file-scope','regenerate-scoped-patch']
  };
  const strategies=classes.flatMap(c=>(mapping[c]||['collect-more-causal-evidence'])
    .map(strategy=>({failureClass:c,strategy,fingerprint:sha(c+'|'+strategy)}))
    .filter(x=>!prior.has(x.fingerprint)));
  const remaining=Math.max(0,limit-attempts.length);
  return Object.freeze({budget:limit,remaining,strategies:strategies.slice(0,remaining),
    failuresObserved:observations.length,automaticRetryPerformed:false});
}
export function recallVibe59VerifiedSolutions({samples=[],trajectories=[],failures=[],
  request='',project='',sourcePaths=[]}={}){
  const index=buildVibeVerifiedMemoryIndex({
    trainingSamples:samples.slice(0,64),trajectories:trajectories.slice(0,64),
    failures:failures.slice(0,64)});
  const result=retrieveVibeVerifiedPatterns({index,request,project,
    taskType:'coding',sourcePaths,topKSuccess:5,topKFailure:3});
  return Object.freeze({positiveCount:index.positive.length,
    verifiedIds:result.successes.map(x=>x.entry.id),
    avoidIds:result.failureWarnings.map(x=>x.entry.id),
    persistedByThisCall:false,authority:'existing-vibe3-verified-memory'});
}
export function evaluateVibe59Completion({requirements=[],evidence=[]}={}){
  if(!Array.isArray(requirements)||!Array.isArray(evidence))throw Error('VIBE59_COMPLETION_INPUTS');
  const covered=new Set(evidence.filter(x=>x?.syntaxPass===true&&x?.testsPass===true
    &&x?.runtimePass===true&&x?.exactRevision===true&&x?.sourcePass===true)
    .map(x=>clean(x.id)));
  const required=[...new Set(requirements.map(clean).filter(Boolean))];
  return Object.freeze({required:required.length,verified:required.filter(x=>covered.has(x)),
    missing:required.filter(x=>!covered.has(x)),
    complete:required.length>0&&required.every(x=>covered.has(x)),
    runtimeVerifiedByThisCall:false,authority:'evidence-only'});
}
export function planVibe59SafeRefactor({source='',target='web'}={}){
  if(target!=='web')return Object.freeze({available:false,edits:[]});
  const re=/if\s*\(\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\)\s*\{\s*([A-Za-z_$][\w$]*)\s*=\s*true\s*;\s*\}\s*else\s*\{\s*\2\s*=\s*false\s*;\s*\}/g;
  const matches=[...String(source).matchAll(re)];
  if(matches.length!==1||matches[0][1]===matches[0][2])
    return Object.freeze({available:false,edits:[]});
  return Object.freeze({available:true,
    edits:[{find:matches[0][0],replace:matches[0][2]+' = Boolean('+matches[0][1]+');'}],
    runtimeEquivalentVerified:false,requiresExistingValidation:true,authority:'refactor-candidate-only'});
}
export function createVibe59CodeCandidate({order={},sourceRoot='',responsibleFiles=[],target=''}={}){
  const creativeRequest=order.selectedTask?.vibe59CreativeRequest??order.vibe59CreativeRequest;
  const creativePlan=creativeRequest&&target==='roblox'?buildVibe59CreativityPlan({
    goal:creativeRequest.goal||order.goal||'',approvedOperations:creativeRequest.approvedOperations,
    existingMechanics:creativeRequest.existingMechanics,verifiedPatterns:creativeRequest.verifiedPatterns,
    feedback:creativeRequest.feedback,seed:creativeRequest.seed||order.gameId||'vibe59',
    maxIdeas:creativeRequest.maxIdeas??12,maxIterations:creativeRequest.maxIterations??2,
    ownerApproved:creativeRequest.ownerApproved===true}):null;
  const creativeChosen=creativePlan?.selectedApprovedSpec;
  const explicit=order.selectedTask?.vibe59CodeRequest??order.vibe59CodeRequest;
  const req=explicit??(creativeChosen?{...creativeRequest,robloxDomainAction:creativeChosen.spec,
    scenarios:creativeChosen.scenarios}:null);
  if(req==null)return null;
  const specialized=[req?.robloxDomainAction,req?.robloxSkill109,req?.robloxQualityAction,req?.robloxPathfindingAction].filter(Boolean);
  if(!req||req.ownerApproved!==true||!req.path||!req.find
    ||(specialized.length?(specialized.length!==1||Boolean(req.rule)||Boolean(req.machine)||target!=='roblox'):
       Boolean(req.rule)===Boolean(req.machine)))
    throw Error('VIBE59_OWNER_EXPLICIT_CODING_SPEC_REQUIRED');
  const relative=clean(req.path).replaceAll('\\','/');
  if(!relative||relative.startsWith('/')||relative.includes('//')
    ||relative.split('/').some(x=>!x||x==='.'||x==='..')
    ||!responsibleFiles.includes(relative))throw Error('VIBE59_UNAPPROVED_SOURCE');
  if(!(target==='web'?/\.(?:js|mjs|cjs)$/:target==='roblox'?/\.(?:lua|luau)$/:/^$/).test(relative))
    throw Error('VIBE59_SOURCE_TARGET_MISMATCH');
  const root=fs.realpathSync(path.resolve(sourceRoot)),full=path.resolve(root,relative);
  const real=fs.realpathSync(full);
  if(!real.startsWith(root+path.sep)||!fs.lstatSync(full).isFile()
    ||fs.lstatSync(full).isSymbolicLink())throw Error('VIBE59_SOURCE_SCOPE_ESCAPE');
  const content=fs.readFileSync(full,'utf8'),find=req.find;
  if(content.length>260000||typeof find!=='string'||!find||find.length>1024
    ||content.indexOf(find)<0||content.indexOf(find,content.indexOf(find)+find.length)>=0)
    throw Error('VIBE59_ANCHOR_NOT_UNIQUE');
  if(req.sourceSha256!=null&&sha(content)!==req.sourceSha256)throw Error('VIBE59_STALE_SOURCE');
  if(req.robloxPathfindingAction){
    const generated=synthesizeVibe59Pathfinding({spec:req.robloxPathfindingAction,
      source:content,sourcePath:relative,replaceAnchor:find});
    const proof=verifyVibe59PathfindingScenarios({spec:req.robloxPathfindingAction,
      scenarios:req.scenarios});
    if(!proof.pass)throw Error('VIBE59_PATHFINDING_SCENARIO_COUNTEREXAMPLE:'+
      proof.cases.filter(x=>!x.pass).map(x=>x.name).join(','));
    return Object.freeze({summary:'Vibe5.9 obstacle-aware Roblox AI pathfinding',
      expectedEffect:'Compute one PathfindingService waypoint per bounded AI tick',
      edits:[{path:relative,find,replace:generated.source}],newFiles:[],replaceFiles:[],
      tests:[],vibe59CodeKind:'ROBLOX_PATHFINDING',
      vibe59GameplayMechanic:generated.operation,vibe59GameplaySafety:generated.safety,
      vibe59TestPlan:proof,ruleDigest:sha(JSON.stringify(req.robloxPathfindingAction)),
      sourceWrite:false,modelUsed:false,runtimeVerified:false});
  }
  if(req.robloxQualityAction){
    const compiled=synthesizeVibe59QualityGameplay({spec:req.robloxQualityAction,
      source:content,replaceAnchor:find,sourcePath:relative});
    const proof=verifyVibe59QualityScenarios({spec:req.robloxQualityAction,
      scenarios:req.scenarios});
    if(!proof.pass)throw Error('VIBE59_QUALITY_SCENARIO_COUNTEREXAMPLE:'+
      proof.cases.filter(x=>!x.pass).map(x=>x.name).join(','));
    if(compiled.source===find)throw Error('VIBE59_NOOP');
    return Object.freeze({summary:'Vibe5.9 advanced Roblox gameplay implementation',
      expectedEffect:'Source-grounded server gameplay mechanic with independent bounded scenarios',
      edits:[{path:relative,find,replace:compiled.source}],newFiles:[],replaceFiles:[],
      tests:[],vibe59CodeKind:'ROBLOX_ADVANCED_GAMEPLAY',
      vibe59GameplayMechanic:compiled.operation,vibe59GameplaySafety:compiled.safety,
      vibe59TestPlan:proof,ruleDigest:sha(JSON.stringify(req.robloxQualityAction)),
      sourceWrite:false,modelUsed:false,runtimeVerified:false});
  }
  if(req.robloxSkill109){
    const compiled=synthesizeVibe59LuauSkill({spec:req.robloxSkill109,
      source:content,replaceAnchor:find,sourcePath:relative});
    const verified=verifyVibe59LuauSkillScenarios({spec:req.robloxSkill109,
      scenarios:req.scenarios});
    if(!verified.pass)throw Error('VIBE59_SKILL_SCENARIO_COUNTEREXAMPLE:'+
      verified.cases.filter(x=>!x.pass).map(x=>x.name).join(','));
    if(compiled.source===find)throw Error('VIBE59_NOOP');
    return Object.freeze({summary:'Vibe5.9 source-grounded Luau coding skill',
      expectedEffect:'One of 109 bounded approved server state changes',
      edits:[{path:relative,find,replace:compiled.source}],newFiles:[],replaceFiles:[],
      tests:[],vibe59CodeKind:'ROBLOX_SKILL_109',vibe59Skill:compiled.operation,
      vibe59SkillSystem:compiled.system,vibe59SkillSafety:compiled.safety,
      vibe59TestPlan:verified,ruleDigest:sha(JSON.stringify(req.robloxSkill109)),
      sourceWrite:false,modelUsed:false,runtimeVerified:false});
  }
  if(req.robloxDomainAction){
    const compiled=synthesizeVibe59RobloxDomainAction({spec:req.robloxDomainAction,
      source:content,replaceAnchor:find,sourcePath:relative});
    const cases=verifyVibe59RobloxDomainScenarios({spec:req.robloxDomainAction,
      scenarios:req.scenarios});
    if(!cases.pass)throw Error('VIBE59_DOMAIN_TEST_COUNTEREXAMPLE:'+
      cases.cases.filter(x=>!x.pass).map(x=>x.name).join(','));
    if(find===compiled.source)throw Error('VIBE59_NOOP');
    return Object.freeze({summary:'Vibe5.9 Roblox offline direct domain coding',
      expectedEffect:'Source-grounded existing server function behavior',
      edits:[{path:relative,find,replace:compiled.source}],newFiles:[],replaceFiles:[],
      tests:[],vibe59CodeKind:'ROBLOX_DOMAIN_OPERATION',vibe59DomainPattern:compiled.operation,
      vibe59DomainSafety:compiled.safety,vibe59DomainOracle:cases,
      vibe59TestPlan:cases,ruleDigest:sha(JSON.stringify(req.robloxDomainAction)),
      ...(creativePlan?{vibe59Creativity:{capabilityCount:creativePlan.capabilityCount,
        chosenOperation:creativePlan.chosenOperation,steps:creativePlan.steps,
        modelUsed:false,runtimeVerified:false}}:{}),
      sourceWrite:false,modelUsed:false,runtimeVerified:false});
  }
  const codeKind=req.robloxServerAction?'ROBLOX_SERVER_ACTION':req.machine?'STATE_MACHINE':'STATE_RULE';
  if(req.robloxServerAction&&(target!=='roblox'||!req.machine||!Array.isArray(req.scenarios)||!req.scenarios.length))
    throw Error('VIBE59_ROBLOX_AUTHORITY_AND_SCENARIOS_REQUIRED');
  // Owner supplied expectations are interpreted independently of emitted code.
  const tests=verifyVibe59GameScenarios({rule:req.rule,machine:req.machine,
    scenarios:req.scenarios||[]});
  if(!tests.pass)throw Error('VIBE59_SCENARIO_COUNTEREXAMPLE:'+
    tests.counterexamples.map(x=>x.name).join(','));
  if(!req.machine&&req.codegenVariant)
    throw Error('VIBE59_STRATEGY_REQUIRES_STATE_MACHINE');
  const ownerScenarios=req.scenarios||[];
  const generatedProbes=generateVibe59AutonomousProbes({rule:req.rule,machine:req.machine,
    maxCases:Math.max(0,Math.min(10,20-ownerScenarios.length))});
  const probeCases=generatedProbes.cases;
  const variants=req.machine&&target==='web'&&!req.codegenVariant
    ?['chain','switch']:[clean(req.codegenVariant)||'chain'];
  const candidates=variants.map(variant=>{
    const result=req.robloxServerAction
      ?synthesizeVibe59RobloxServerAction({machine:req.machine,binding:req.robloxServerAction,
          source:content,replaceAnchor:find,sourcePath:relative})
      :req.machine?synthesizeVibe59StateMachine({machine:req.machine,target,variant})
      :synthesizeVibe59StateLogic({rule:req.rule,target});
    const replay=target==='web'?verifyVibe59GeneratedJavaScript({
      source:result.source,rule:req.rule,machine:req.machine,scenarios:[...ownerScenarios,...probeCases]
    }):null;
    return {variant,compiled:result,replay};
  });
  const selected=candidates.find(row=>row.replay?.pass!==false);
  if(!selected)throw Error('VIBE59_ALL_GENERATED_STRATEGIES_REJECTED:'+
    candidates.map(row=>row.variant+':'+(row.replay?.reason||row.replay?.counterexamples?.map(x=>x.name).join(','))).join('|'));
  const {compiled}=selected;
  if(compiled.source===find)throw Error('VIBE59_NOOP');
  const codeReplay=selected.replay;
  return Object.freeze({summary:'Vibe5.9 composed offline code',
    expectedEffect:'Source-grounded, explicitly approved state transition',
    edits:[{path:relative,find,replace:compiled.source}],newFiles:[],replaceFiles:[],
    tests:[],vibe59TestPlan:tests,vibe59CodeKind:codeKind,
    vibe59AutoTestPlan:generatedProbes,
    vibe59JsReplay:codeReplay,vibe59Strategy:req.robloxServerAction?selected.compiled.strategy:selected.variant,
    ...(req.robloxServerAction?{vibe59RobloxSafety:selected.compiled.safety,
      vibe59RobloxInspection:inspectVibe59RobloxCoding({files:[{path:relative,source:content}],responsiblePaths:[relative]})}:{}),
    vibe59StrategiesChecked:candidates.map(row=>({variant:row.variant,pass:row.replay?.pass??null})),
    ruleDigest:sha(JSON.stringify(req.rule||req.machine)),
    sourceWrite:false,modelUsed:false,runtimeVerified:false});
}
export function buildVibe59AutonomyPlan({order={},target='web',codeFlow=null,sourceImpact=null}={}){
  const requirement=compileVibe59Requirements({order,target});
  const spec=order.vibe59Spec??order.selectedTask?.vibe59Spec??{};
  const assembly=composeVibe59Systems({systems:requirement.explicitSystems,
    bindings:Array.isArray(spec.bindings)?spec.bindings:[]});
  const repair=planVibe59Repairs({failures:order.workPackage?.sharedContext?.diagnosticEvidence||[]});
  const memory=recallVibe59VerifiedSolutions({samples:order.vibe59VerifiedSamples||[],
    failures:order.vibe59ObservedFailures||[],request:requirement.goal,
    project:order.gameId||'',sourcePaths:order.source?.responsibleFiles||[]});
  const completion=evaluateVibe59Completion({requirements:requirement.explicitSystems,
    evidence:order.vibe59VerifiedImplementationEvidence||[]});
  const creativeInput=order.selectedTask?.vibe59CreativeRequest??order.vibe59CreativeRequest??{};
  const creativity=target==='roblox'?buildVibe59CreativityPlan({
    goal:clean(creativeInput.goal||requirement.goal),approvedOperations:creativeInput.approvedOperations,
    existingMechanics:creativeInput.existingMechanics,verifiedPatterns:creativeInput.verifiedPatterns,
    feedback:creativeInput.feedback,seed:clean(order.gameId)||'vibe59',
    ownerApproved:false}):null;
  return Object.freeze({version:'5.9',sourceWrite:false,runtimeVerified:false,
    requirement,assembly,repair,memory,completion,creativity,
    skillCatalog:{total:VIBE59_LUAU_CODING_SKILLS_109.length,
      systems:[...new Set(VIBE59_LUAU_CODING_SKILLS_109.map(x=>x.system))],
      codegen:'existing-owner-approved-server-state-only',runtimeVerified:false},
    advancedGameplay:{mechanics:[...VIBE59_QUALITY_GAMEPLAY_ACTIONS.map(x=>x.id),'ai-pathfinding-chase'],
      count:VIBE59_QUALITY_GAMEPLAY_ACTIONS.length+1,verification:'offline-scenario-only',
      requiresExistingAuthorizedServerBindings:true,runtimeVerified:false},
    sourceFlowCount:codeFlow?.sources?.length||0,
    sourceImpactCount:sourceImpact?.impactedSources?.length||0,
    synthesisCandidateAvailable:Boolean(order.vibe59CodeRequest||order.selectedTask?.vibe59CodeRequest
      ||order.vibe59CreativeRequest||order.selectedTask?.vibe59CreativeRequest),
    testStrategy:'explicit-scenarios-needing-existing-harness',
    refactorStrategy:'bounded-candidates-needing-existing-validation',
    localModel:'Vibe4 loopback adapter available, inference unverified',
    authority:'read-only-development-plan'});
}


// Vibe5.9 extension: event-driven state machines and owner-scenario counterexamples.
// The interpreter checks only isolated state transitions, NOT game runtime.
function state59Name(v){
  if(typeof v!=='string'||!/^[A-Za-z][\w-]{0,47}$/.test(v))throw Error('VIBE59_STATE_NAME');
  return v;
}
function machine59Spec(machine){
  // Event handlers and state variables must map to a single directly tracked
  // binding. Dotted paths would otherwise diverge from the independent oracle.
  const plain=/^[A-Za-z_$][\w$]*$/;
  const reserved=new Set(['function','if','else','return','while','for','switch','case',
    'local','end','then','nil','true','false','eventName',
    'game','workspace','script','process','globalThis','window','document']);
  if(!machine||typeof machine!=='object'||Array.isArray(machine)
    ||!plain.test(machine.handlerName)||!plain.test(machine.stateVariable)
    ||!validName(machine.handlerName)||!validName(machine.stateVariable)
    ||reserved.has(machine.handlerName)||reserved.has(machine.stateVariable)
    ||machine.handlerName===machine.stateVariable)
    throw Error('VIBE59_MACHINE_IDENTIFIERS');
  const states=machine.states,events=machine.events,transitions=machine.transitions;
  if(!Array.isArray(states)||states.length<2||states.length>20
    ||!Array.isArray(events)||!events.length||events.length>24
    ||!Array.isArray(transitions)||!transitions.length||transitions.length>64)
    throw Error('VIBE59_MACHINE_BOUNDS');
  for(const group of [states,events]){
    group.forEach(state59Name);
    if(new Set(group).size!==group.length)throw Error('VIBE59_MACHINE_DUPLICATE');
  }
  const seen=new Set();
  for(const row of transitions){
    if(!row||!states.includes(row.from)||!states.includes(row.to)
      ||!events.includes(row.event))throw Error('VIBE59_MACHINE_UNKNOWN_TRANSITION');
    const key=row.from+'|'+row.event;
    if(seen.has(key))throw Error('VIBE59_MACHINE_AMBIGUOUS_TRANSITION');
    seen.add(key);
    if(row.when)expression(row.when,'web');
    if(row.when&&!['boolean','compare','and','or','not'].includes(row.when.kind))
      throw Error('VIBE59_MACHINE_GUARD_NOT_BOOLEAN');
    if(!Array.isArray(row.actions??[])||(row.actions||[]).length>8)
      throw Error('VIBE59_MACHINE_ACTION_LIMIT');
    for(const item of row.actions||[]){
      if(!item||item.output===machine.stateVariable||item.output==='eventName')
        throw Error('VIBE59_MACHINE_PROTECTED_STATE');
      action(item,'web');
    }
  }
  return machine;
}
export function synthesizeVibe59StateMachine({machine={},target='web',variant='chain'}={}){
  if(!['web','roblox'].includes(target)||!['chain','switch'].includes(variant)
    ||target==='roblox'&&variant==='switch')throw Error('VIBE59_MACHINE_TARGET_VARIANT');
  const m=machine59Spec(machine),lines=[];
  const assignment=row=>[m.stateVariable+' = '+JSON.stringify(row.to)+(target==='web'?';':''),
    ...(row.actions||[]).map(item=>action(item,target)),
    target==='web'?'return true;':'return true'];
  const predicate=(row,stateCheck=true)=>{
    const e=target==='web'?' === ':' == ',and=target==='web'?' && ':' and ';
    return (stateCheck?m.stateVariable+e+JSON.stringify(row.from)+and:'')
      +'eventName'+e+JSON.stringify(row.event)
      +(row.when?and+expression(row.when,target):'');
  };
  if(target==='roblox'){
    lines.push('local function '+m.handlerName+'(eventName)');
    for(const row of m.transitions){
      lines.push('  if '+predicate(row)+' then',
        ...assignment(row).map(x=>'    '+x),'  end');
    }
    lines.push('  return false','end');
  }else if(variant==='chain'){
    lines.push('function '+m.handlerName+'(eventName) {');
    for(const row of m.transitions){
      lines.push('  if ('+predicate(row)+') {',
        ...assignment(row).map(x=>'    '+x),'  }');
    }
    lines.push('  return false;','}');
  }else{
    lines.push('function '+m.handlerName+'(eventName) {','  switch ('+m.stateVariable+') {');
    for(const state of m.states){
      const rows=m.transitions.filter(x=>x.from===state);
      if(!rows.length)continue;
      lines.push('    case '+JSON.stringify(state)+':');
      for(const row of rows)lines.push('      if ('+predicate(row,false)+') {',
        ...assignment(row).map(x=>'        '+x),'      }');
      lines.push('      break;');
    }
    lines.push('  }','  return false;','}');
  }
  return Object.freeze({source:lines.join('\n'),target,variant,
    eventCount:m.transitions.length,runtimeVerified:false,sourceWrite:false,
    authority:'synthesized-event-handler-only'});
}
function eval59Expression(node,state,depth=0){
  if(!node||typeof node!=='object'||depth>8)throw Error('VIBE59_ORACLE_EXPRESSION');
  const recurse=n=>eval59Expression(n,state,depth+1);
  if(node.kind==='ref'){
    if(!validName(node.name))throw Error('VIBE59_ORACLE_REFERENCE');
    let value=state;
    for(const part of node.name.split('.')){
      if(!value||typeof value!=='object'||!Object.hasOwn(value,part))
        throw Error('VIBE59_ORACLE_MISSING_STATE:'+node.name);
      value=value[part];
    }
    return value;
  }
  if(node.kind==='number')return finite(node.value,'oracle');
  if(node.kind==='boolean')return Boolean(node.value);
  if(node.kind==='compare'){
    const x=recurse(node.left),y=recurse(node.right);
    if(node.op==='eq')return x===y;if(node.op==='ne')return x!==y;
    if(typeof x!=='number'||typeof y!=='number')throw Error('VIBE59_ORACLE_COMPARE_TYPES');
    if(node.op==='gt')return x>y;if(node.op==='gte')return x>=y;
    if(node.op==='lt')return x<y;if(node.op==='lte')return x<=y;
    throw Error('VIBE59_ORACLE_COMPARE_OP');
  }
  if(node.kind==='and'||node.kind==='or'){
    if(!Array.isArray(node.items)||node.items.length<2||node.items.length>6)
      throw Error('VIBE59_ORACLE_BOOLEAN_ARGS');
    return node.kind==='and'?node.items.every(x=>Boolean(recurse(x))):
      node.items.some(x=>Boolean(recurse(x)));
  }
  if(node.kind==='not')return !Boolean(recurse(node.value));
  throw Error('VIBE59_ORACLE_EXPRESSION_KIND');
}
function eval59Actions(items,state){
  for(const a of items){
    action(a,'web');
    const value=eval59Expression(a.value,state),old=state[a.output];
    let result=value;
    if(a.action!=='assign'&&a.action!=='clamp'){
      if(typeof old!=='number'||typeof value!=='number')throw Error('VIBE59_ORACLE_NUMERIC_STATE');
      result=a.action==='add'?old+value:a.action==='subtract'?old-value:old*value;
    }
    if(a.action==='clamp'){
      if(typeof value!=='number')throw Error('VIBE59_ORACLE_CLAMP_NUMBER');
      result=Math.min(a.maximum,Math.max(a.minimum,value));
    }
    if(typeof result==='number')finite(result,'oracle-result');
    state[a.output]=result;
  }
}
function oracle59State(initial){
  if(!initial||typeof initial!=='object'||Array.isArray(initial))throw Error('VIBE59_ORACLE_STATE');
  const state=Object.create(null);
  for(const [key,value] of Object.entries(initial)){
    if(!validName(key)||!(typeof value==='boolean'||typeof value==='string'&&value.length<=120
      ||typeof value==='number'&&Number.isFinite(value)))
      throw Error('VIBE59_ORACLE_STATE_VALUE');
    state[key]=value;
  }
  return state;
}
function oracle59Result(row,state,consumed){
  if(!row.expectedState||typeof row.expectedState!=='object'||Array.isArray(row.expectedState))
    throw Error('VIBE59_ORACLE_EXPLICIT_EXPECTATION');
  const diffs=Object.entries(row.expectedState).filter(([key,value])=>{
    if(!validName(key)||!['boolean','number','string'].includes(typeof value))
      throw Error('VIBE59_ORACLE_EXPECTED_VALUE');
    return !Object.hasOwn(state,key)||state[key]!==value;
  }).map(([key,value])=>({field:key,expected:value,actual:state[key]??null}));
  if(row.expectedConsumed!==undefined){
    if(!Array.isArray(row.expectedConsumed)||row.expectedConsumed.length!==consumed.length
      ||row.expectedConsumed.some(x=>typeof x!=='boolean'))
      throw Error('VIBE59_ORACLE_EXPECTED_EVENTS');
    if(row.expectedConsumed.some((x,i)=>x!==consumed[i]))
      diffs.push({field:'events',expected:row.expectedConsumed,actual:consumed});
  }
  return {name:clean(row.name)||'scenario',pass:diffs.length===0,
    differences:diffs,actualState:{...state},consumed};
}
export function verifyVibe59GameScenarios({rule=null,machine=null,scenarios=[]}={}){
  if(Boolean(rule)===Boolean(machine))throw Error('VIBE59_ORACLE_KIND_REQUIRED');
  if(!Array.isArray(scenarios)||scenarios.length>20)throw Error('VIBE59_ORACLE_CASE_LIMIT');
  const m=machine?machine59Spec(machine):null;
  if(rule)synthesizeVibe59StateLogic({rule,target:'web'});
  const cases=scenarios.map(row=>{
    if(!row||typeof row!=='object')throw Error('VIBE59_ORACLE_CASE');
    const state=oracle59State(row.initialState),consumed=[];
    if(m){
      if(!m.states.includes(state[m.stateVariable])||!Array.isArray(row.events)
        ||row.events.length>32||row.events.some(x=>typeof x!=='string'))
        throw Error('VIBE59_ORACLE_EVENT_CASE');
      for(const event of row.events){
        const t=m.transitions.find(t=>t.from===state[m.stateVariable]&&t.event===event
          &&(!t.when||Boolean(eval59Expression(t.when,state))));
        if(t){state[m.stateVariable]=t.to;eval59Actions(t.actions||[],state);consumed.push(true)}
        else consumed.push(false);
      }
    }else{
      const items=Boolean(eval59Expression(rule.when,state))?rule.then:(rule.otherwise||[]);
      eval59Actions(items,state);
    }
    return oracle59Result(row,state,consumed);
  });
  return Object.freeze({cases,counterexamples:cases.filter(x=>!x.pass),
    pass:cases.every(x=>x.pass),explicitCases:cases.length,
    sourceWrite:false,runtimeVerified:false,runnableAgainstRealGame:false,
    authority:'isolated-semantic-oracle-only'});
}

// Bounded JS syntax + replay checks for *generated* AST-backed code, not game runtime.
// Run only owner-supplied scenarios in an isolated context with no external APIs.
export function verifyVibe59GeneratedJavaScript({source='',rule=null,machine=null,scenarios=[]}={}){
  if(typeof source!=='string'||!source||source.length>131072
    ||Boolean(rule)===Boolean(machine)
    ||!Array.isArray(scenarios)||scenarios.length>20)
    throw Error('VIBE59_JS_REPLAY_INPUT');
  if(machine)machine59Spec(machine);
  else synthesizeVibe59StateLogic({rule,target:'web'});
  let script;
  try{script=new vm.Script(source,{filename:'vibe59-generated-source.js'});}
  catch(error){return Object.freeze({pass:false,cases:[],reason:'SYNTAX:'+clean(error.message).slice(0,160),
    syntaxPass:false,testsPass:false,runtimeVerified:false,sourceWrite:false,
    authority:'isolated-generated-js-only'});}
  const outcomes=[];
  for(const row of scenarios){
    if(!row||typeof row!=='object')throw Error('VIBE59_JS_REPLAY_SCENARIO');
    const input=oracle59State(row.initialState);
    // Code originates from a constrained AST, not arbitrary model-supplied source.
    const sandbox=vm.createContext(input,{codeGeneration:{strings:false,wasm:false}});
    const consumed=[];
    try{
      script.runInContext(sandbox,{timeout:250});
      if(machine){
        if(!Array.isArray(row.events)||row.events.length>32
          ||row.events.some(x=>typeof x!=='string'||x.length>100))
          throw Error('VIBE59_JS_REPLAY_EVENTS');
        for(const event of row.events){
          const invocation=new vm.Script(machine.handlerName+'('+JSON.stringify(event)+')');
          consumed.push(Boolean(invocation.runInContext(sandbox,{timeout:250})));
        }
      }
      const result=oracle59Result(row,sandbox,consumed);
      outcomes.push(result);
    }catch(error){
      outcomes.push({name:clean(row.name)||'scenario',pass:false,
        differences:[{field:'execution',reason:clean(error.message).slice(0,180)}]});
    }
  }
  const failed=outcomes.filter(row=>!row.pass);
  return Object.freeze({pass:failed.length===0,syntaxPass:true,testsPass:failed.length===0,
    cases:outcomes,counterexamples:failed,sourceWrite:false,runtimeVerified:false,
    authority:'isolated-generated-js-only'});
}


// Generate bounded boundary/transition probes automatically from explicit AST.
// Their expectations are structural, never substituted for owner acceptance.
export function generateVibe59AutonomousProbes({rule=null,machine=null,maxCases=10}={}){
  if(Boolean(rule)===Boolean(machine))throw Error('VIBE59_PROBES_REQUIRE_ONE_SCHEMA');
  const limit=Math.max(0,Math.min(12,Math.floor(Number(maxCases)||0))),probes=[];
  function refs(node,into){
    if(!node||typeof node!=='object'||Array.isArray(node))return;
    if(node.kind==='ref'&&validName(node.name)&&!node.name.includes('.'))into.add(node.name);
    for(const [key,value] of Object.entries(node)){
      if(key==='ref'||key==='name')continue;
      if(Array.isArray(value))value.forEach(x=>refs(x,into));
      else if(value&&typeof value==='object')refs(value,into);
    }
  }
  const referenceState=(guard,actions)=>{
    const used=new Set();
    refs(guard,used);
    for(const item of actions||[]){refs(item.value,used);if(validName(item.output))used.add(item.output)}
    return Object.fromEntries([...used].map(name=>[name,1]));
  };
  if(machine){
    const m=machine59Spec(machine);
    for(const [index,t] of m.transitions.entries()){
      if(probes.length>=limit)break;
      if(t.when)continue; // dynamic guards need owner-provided inputs
      const initialState={...referenceState(null,t.actions||[]),[m.stateVariable]:t.from};
      const result=oracle59State(initialState);
      result[m.stateVariable]=t.to;
      try{eval59Actions(t.actions||[],result)}catch{continue}
      probes.push({name:'automatic-transition-'+index,
        initialState,events:[t.event],expectedState:{...result},expectedConsumed:[true]});
    }
    if(probes.length<limit&&m.transitions.length){
      const first=m.transitions[0];
      const initialState={...referenceState(null,first.actions||[]),[m.stateVariable]:first.from};
      probes.push({name:'automatic-unknown-event',initialState,
        events:['__VIBE59_UNDECLARED_EVENT__'],expectedState:{...initialState},expectedConsumed:[false]});
    }
  }else{
    synthesizeVibe59StateLogic({rule,target:'web'});
    const condition=rule.when;
    if(condition.kind==='compare'){
      const ref=condition.left?.kind==='ref'&&condition.right?.kind==='number'
        ?condition.left.name:condition.right?.kind==='ref'&&condition.left?.kind==='number'
        ?condition.right.name:null;
      const threshold=condition.left?.kind==='number'?condition.left.value:condition.right?.value;
      if(ref&&validName(ref)&&!ref.includes('.')&&typeof threshold==='number'&&Number.isFinite(threshold)){
        const state=referenceState(rule.when,[...rule.then,...(rule.otherwise||[])]);
        for(const [index,v] of [threshold-1,threshold,threshold+1].entries()){
          if(probes.length>=limit||Math.abs(v)>1e9)break;
          const initialState={...state,[ref]:v},expected=oracle59State(initialState);
          try{
            const chosen=Boolean(eval59Expression(rule.when,expected))?rule.then:(rule.otherwise||[]);
            eval59Actions(chosen,expected);
          }catch{continue}
          probes.push({name:'automatic-boundary-'+index,
            initialState,expectedState:{...expected}});
        }
      }
    }
  }
  return Object.freeze({cases:probes,generatedCaseCount:probes.length,
    sourceWrite:false,runtimeVerified:false,ownerExpectationVerified:false,
    authority:'generated-structural-probes-only'});
}
