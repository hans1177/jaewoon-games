// Vibe5.9: bounded, source-grounded autonomous coding capabilities.
// No source writes, asset fabrication, runtime attestation, or release authority.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
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
  const req=order.selectedTask?.vibe59CodeRequest??order.vibe59CodeRequest;
  if(req==null)return null;
  if(!req||req.ownerApproved!==true||!req.path||!req.find||!req.rule)
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
  const compiled=synthesizeVibe59StateLogic({rule:req.rule,target});
  if(compiled.source===find)throw Error('VIBE59_NOOP');
  const tests=generateVibe59Tests({rule:req.rule,target,scenarios:req.scenarios||[]});
  return Object.freeze({summary:'Vibe5.9 composed offline code',
    expectedEffect:'Source-grounded, explicitly approved state transition',
    edits:[{path:relative,find,replace:compiled.source}],newFiles:[],replaceFiles:[],
    tests:[],vibe59TestPlan:tests,ruleDigest:sha(JSON.stringify(req.rule)),
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
  return Object.freeze({version:'5.9',sourceWrite:false,runtimeVerified:false,
    requirement,assembly,repair,memory,completion,
    sourceFlowCount:codeFlow?.sources?.length||0,
    sourceImpactCount:sourceImpact?.impactedSources?.length||0,
    synthesisCandidateAvailable:Boolean(order.vibe59CodeRequest||order.selectedTask?.vibe59CodeRequest),
    testStrategy:'explicit-scenarios-needing-existing-harness',
    refactorStrategy:'bounded-candidates-needing-existing-validation',
    localModel:'Vibe4 loopback adapter available, inference unverified',
    authority:'read-only-development-plan'});
}
