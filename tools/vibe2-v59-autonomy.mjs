// Vibe5.9: bounded, source-grounded autonomous coding capabilities.
// No source writes, asset fabrication, runtime attestation, or release authority.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {applyExactEdits} from './autonomous-safe-edit.mjs';
import {synthesizeVibe59RobloxServerAction,inspectVibe59RobloxCoding,synthesizeVibe59RobloxDomainAction,verifyVibe59RobloxDomainScenarios} from './vibe59-roblox-coding.mjs';
import {buildVibe59CreativityPlan} from './vibe59-creative-engine.mjs';
import {retrieveVerifiedAlgorithmConcepts,preferVerifiedAlgorithmStrategy} from './vibe2-learning-motor.mjs';
import {VIBE59_LUAU_CODING_SKILLS_109,synthesizeVibe59LuauSkill,verifyVibe59LuauSkillScenarios} from './vibe59-luau-skills109.mjs';
import {VIBE59_QUALITY_GAMEPLAY_ACTIONS,synthesizeVibe59QualityGameplay,verifyVibe59QualityScenarios} from './vibe59-quality-gameplay.mjs';
import {synthesizeVibe59Pathfinding,verifyVibe59PathfindingScenarios} from './vibe59-pathfinding.mjs';
import {synthesizeVibe59CraftingTransaction,verifyVibe59CraftingScenarios} from './vibe59-crafting-transaction.mjs';
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

// [메인] 동일 Vibe5.9 수치 합성기의 AST 진화 탐색. 소스 실행 없이 제한된 AST만 평가한다.
// 기존 열거 탐색과 반례 루프를 공유한다. 외부 코드/논문 원문은 실행하거나 복제하지 않는다.
function evolveVibe59NumericAST({params,constants,rows,active,maxDepth,spec}){
  const valid=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1e9;
  const close=(a,b)=>valid(a)&&Math.abs(a-b)<=1e-7*Math.max(1,Math.abs(b));
  const operators=['+','-','*','/','%','min','max','gt','lt'];
  const unary=['abs','floor','round','neg'];
  const terms=[...params.map((_,i)=>['param',i]),...constants.map(n=>['const',n])];
  const maxGenerations=Math.max(2,Math.min(48,Number.isInteger(spec.maxGenerations)?spec.maxGenerations:24));
  const maxNodes=Math.max(7,Math.min(39,Number.isInteger(spec.maxNodes)?spec.maxNodes:25));
  let seed=Number.parseInt(sha(JSON.stringify([params,constants,spec.seed||'VIBE59'])).slice(0,8),16)>>>0;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const pick=list=>list[Math.floor(rand()*list.length)];
  const depth=node=>node[0]==='param'||node[0]==='const'?0:1+Math.max(...node.slice(1).filter(Array.isArray).map(depth),0);
  const size=node=>1+node.slice(1).filter(Array.isArray).reduce((n,x)=>n+size(x),0);
  // Reject malformed/cyclic external knowledge before recursion, rendering or execution.
  function safe(node){
    const stack=[{node,depth:0,ancestors:[]}];
    let count=0;
    while(stack.length){
      const frame=stack.pop(),part=frame.node,op=part?.[0];
      if(!Array.isArray(part)||frame.ancestors.includes(part)||frame.depth>maxDepth||++count>maxNodes)
        return false;
      if(op==='param'||op==='const'){
        if(part.length!==2||!(op==='param'?Number.isInteger(part[1])&&part[1]>=0&&part[1]<params.length:
          typeof part[1]==='number'&&Number.isFinite(part[1])&&Math.abs(part[1])<=1000))return false;
        continue;
      }
      const arity=unary.includes(op)?2:operators.includes(op)?3:op==='select'?4:0;
      if(!arity||part.length!==arity)return false;
      for(let i=1;i<arity;i++)stack.push({node:part[i],depth:frame.depth+1,
        ancestors:[...frame.ancestors,part]});
    }
    return true;
  }
  function evaluate(node,args){
    const [op,a,b,c]=node;
    if(op==='param')return args[a];
    if(op==='const')return a;
    const x=evaluate(a,args);
    if(!valid(x))return NaN;
    // Branch semantics are lazy: an unused arm may contain an undefined operation.
    if(op==='select')return evaluate(x>0?b:c,args);
    if(op==='abs')return Math.abs(x);
    if(op==='floor')return Math.floor(x);
    if(op==='round')return Math.round(x);
    if(op==='neg')return -x;
    const y=evaluate(b,args);
    if(!valid(y))return NaN;
    switch(op){
      case '+':return x+y;case '-':return x-y;case '*':return x*y;
      case '/':return Math.abs(y)<1e-9?NaN:x/y;
      case '%':return Math.abs(y)<1e-9?NaN:x%y;
      case 'min':return Math.min(x,y);case 'max':return Math.max(x,y);
      case 'gt':return x>y?1:0;case 'lt':return x<y?1:0;
      default:return NaN;
    }
  }
  function render(node,target='web'){
    const [op,a,b,c]=node;
    if(op==='param')return params[a];
    if(op==='const')return String(a);
    const x=render(a,target),math=target==='roblox'?'math.':'Math.';
    if(op==='neg')return '(-'+x+')';
    if(unary.includes(op))return math+op+'('+x+')';
    const y=render(b,target);
    if(op==='min'||op==='max')return math+op+'('+x+','+y+')';
    if(op==='gt'||op==='lt')return target==='roblox'
      ?'(('+x+op.replace('gt','>').replace('lt','<')+y+') and 1 or 0)'
      :'('+x+(op==='gt'?'>':'<')+y+'?1:0)';
    if(op==='select'){
      const z=render(c,target);
      return target==='roblox'?'(('+x+'>0) and ('+y+') or ('+z+'))'
        :'('+x+'>0?'+y+':'+z+')';
    }
    return '('+x+op+y+')';
  }
  // Verified knowledge is a *candidate seed*, never an authority. Re-evaluate every sample.
  const knowledge=Array.isArray(spec.verifiedConcepts)?spec.verifiedConcepts.slice(0,16):[];
  const verifiedSeeds=knowledge.filter(row=>row?.verified===true
    &&row?.proof?.independentQa==='PASS'&&row?.proof?.regression==='PASS'
    &&row?.proof?.runtime==='PASS'&&row?.proof?.actualPlatformRuntime===true
    &&Array.isArray(row.ast)).map(row=>row.ast);
  const seen=new Set(),population=[],all=[],semantic=new Set();
  let candidatesConsidered=0,found=null,generation=0;
  const activeRows=[...active];
  function add(ast,gen){
    if(!safe(ast))return;
    const key=JSON.stringify(ast);
    if(seen.has(key))return;seen.add(key);
    const values=rows.map(row=>{try{return evaluate(ast,row.args)}catch{return NaN}});
    const error=activeRows.reduce((sum,i)=>sum+
      (valid(values[i])?Math.min(1000,Math.abs(values[i]-rows[i].output)/Math.max(1,Math.abs(rows[i].output))):1000),0);
    const risk=(key.match(/"\/"|"%"|"select"/g)||[]).length;
    const signature=activeRows.map(i=>valid(values[i])?Number(values[i].toPrecision(8)):'invalid').join('|');
    const novelty=semantic.has(signature)?0:1;
    semantic.add(signature);candidatesConsidered++;
    const row={ast,values,expr:render(ast),cost:size(ast),variables:key.includes('"param"')?1:0,
      depth:depth(ast),error,risk,novelty,generation:gen};
    all.push(row);
    if(row.variables&&activeRows.every(i=>close(values[i],rows[i].output))){
      if(!found||row.cost<found.cost||(row.cost===found.cost&&row.risk<found.risk))
        found=row;
    }
  }
  for(const term of [...terms,...verifiedSeeds])add(term,0);
  const primitives=terms.slice(0,12);
  for(const a of primitives){
    for(const op of unary)add([op,a],0);
    for(const b of primitives)for(const op of operators)add([op,a,b],0);
  }
  function nextGeneration(gen){
    const best=[...all].sort((a,b)=>a.error-b.error||a.risk-b.risk||a.cost-b.cost||a.expr.localeCompare(b.expr));
    const chosen=new Map();
    for(const row of best){
      const signature=activeRows.map(i=>valid(row.values[i])?Number(row.values[i].toPrecision(8)):'x').join(',');
      if(chosen.has(signature)&&chosen.size>=16)continue;
      chosen.set(signature,row);
      if(chosen.size>=56)break;
    }
    population.splice(0,population.length,...chosen.values());
    const elite=population.slice(0,32).map(row=>row.ast);
    if(!elite.length)return;
    const source=[...elite,...primitives,...verifiedSeeds].slice(0,72);
    function substitute(tree,part){
      if(tree.length<=2||rand()<0.3)return part;
      const children=tree.slice(1).map((node,i)=>Array.isArray(node)&&i===Math.floor(rand()*(tree.length-1))
        ?substitute(node,part):node);
      return [tree[0],...children];
    }
    for(let i=0;i<480;i++){
      const a=pick(source),b=pick(source),mode=i%6;
      let candidate;
      if(mode===0)candidate=[pick(unary),a];
      else if(mode===1)candidate=[pick(operators),a,b];
      else if(mode===2)candidate=substitute(a,b);
      else if(mode===3)candidate=[pick(operators),substitute(a,b),pick(primitives)];
      else if(mode===4)candidate=['select',[pick(['gt','lt']),pick(primitives),pick(primitives)],a,b];
      else candidate=[pick(operators),a,substitute(b,pick(primitives))];
      add(candidate,gen);
    }
  }
  for(let gen=1;gen<=maxGenerations;gen++){
    generation=gen;
    nextGeneration(gen);
    if(found&&gen>=2)break;
    if(seen.size>20000)break;
  }
  if(!found)return null;
  return {...found,candidatesConsidered,generations:generation,
    novelty:found.novelty,regressionRisk:found.risk,
    ast:Object.freeze(found.ast)};
}

// [메인] Vibe5.9 범용 수치 함수 무모델 합성.
// 문법 기반 유한 후보 탐색 + 입출력 의미 서명 중복 제거 + 반례 유도 재탐색.
// 수치 예시로만 검증되는 순수 함수 후보이며 실제 게임 플레이 검증을 대체하지 않는다.
export function synthesizeVibe59NumericAlgorithm({spec={}}={}){
  const params=spec?.parameters,examples=spec?.examples,holdouts=spec?.holdouts;
  const legal=/^[A-Za-z_$][\w$]*$/,forbidden=new Set([
    '__proto__','constructor','prototype','arguments','eval','Function','process',
    'globalThis','window','document','this','NaN','Infinity','undefined'
  ]);
  if(!spec||!Array.isArray(params)||params.length<1||params.length>3
    ||params.some(p=>typeof p!=='string'||!legal.test(p)||forbidden.has(p))
    ||new Set(params).size!==params.length
    ||!Array.isArray(examples)||examples.length<3||examples.length>18
    ||!Array.isArray(holdouts)||holdouts.length<2||holdouts.length>12)
    throw Error('VIBE59_ALGORITHM_EXPLICIT_EXAMPLES_REQUIRED');
  const rows=[...examples,...holdouts],keys=new Set();
  for(const row of rows){
    if(!row||!Array.isArray(row.args)||row.args.length!==params.length
      ||row.args.some(x=>typeof x!=='number'||!Number.isFinite(x)||Math.abs(x)>1e6)
      ||typeof row.output!=='number'||!Number.isFinite(row.output)||Math.abs(row.output)>1e7)
      throw Error('VIBE59_ALGORITHM_INVALID_ORACLE');
    const key=JSON.stringify(row.args);
    if(keys.has(key))throw Error('VIBE59_ALGORITHM_DUPLICATE_INPUT');
    keys.add(key);
  }
  const constants=[0,1,-1,2,...(Array.isArray(spec.constants)?spec.constants:[])];
  if(constants.length>12||constants.some(x=>typeof x!=='number'||!Number.isFinite(x)||Math.abs(x)>1000))
    throw Error('VIBE59_ALGORITHM_CONSTANTS_INVALID');
  const fixed=[...new Set(constants)];
  const valid=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1e9;
  const close=(a,b)=>valid(a)&&Math.abs(a-b)<=1e-7*Math.max(1,Math.abs(b));
  const original=new Set(rows.map((row,i)=>i));
  const active=new Set(examples.map((_,i)=>i));
  const seenCounterexamples=[],maxDepth=Math.max(1,Math.min(4,Number.isInteger(spec.maxDepth)?spec.maxDepth:3));
  let searched=0,passes=0,selected=null;
  function attempt(){
    const candidates=[],semantic=new Map();
    const normalized=value=>valid(value)?Number(value.toPrecision(10)).toString():'invalid';
    const signature=values=>[...active].map(i=>normalized(values[i])).join('|');
    const error=values=>[...active].reduce((sum,i)=>sum+Math.min(100000,
      valid(values[i])?Math.abs(values[i]-rows[i].output)/Math.max(1,Math.abs(rows[i].output)):100000),0);
    function add(expr,values,cost,variables,depth,ast){
      if(expr.length>170||values.some(v=>!valid(v)))return;
      const key=signature(values),prev=semantic.get(key);
      if(prev&&prev.cost<=cost)return;
      const row={expr,values,cost,variables,depth,ast,error:error(values)};
      semantic.set(key,row);
      candidates.push(row);searched++;
    }
    for(const [j,p] of params.entries())add(p,rows.map(row=>row.args[j]),1,1,0,{kind:'reference',name:p});
    for(const c of fixed)add(String(c),rows.map(()=>c),1,0,0,{kind:'constant',value:c});
    const operators=[
      ['+', (a,b)=>a+b],['-',(a,b)=>a-b],['*',(a,b)=>a*b],
      ['/',(a,b)=>b===0?NaN:a/b],['min',(a,b)=>Math.min(a,b)],
      ['max',(a,b)=>Math.max(a,b)]
    ];
    function best(){
      const eligible=[...semantic.values()].filter(x=>x.variables&&[...active].every(i=>close(x.values[i],rows[i].output)))
        .sort((a,b)=>a.cost-b.cost||a.expr.localeCompare(b.expr));
      return eligible[0]||null;
    }
    let winner=best();
    if(winner)return winner;
    for(let d=1;d<=maxDepth;d++){
      const prior=[...semantic.values()].filter(x=>x.depth<d)
        .sort((a,b)=>a.error-b.error||a.cost-b.cost||a.expr.localeCompare(b.expr));
      const pool=[...new Map([...prior.filter(x=>x.depth===0).slice(0,14),
        ...prior.slice(0,64)].map(x=>[x.expr,x])).values()].slice(0,76);
      const newer=pool.filter(x=>x.depth===d-1);
      for(const a of newer){
        for(const [label,operation] of [['abs',Math.abs],['floor',Math.floor],['round',Math.round],['neg',n=>-n]]){
          const vals=a.values.map(operation);
          add(label==='neg'?'(-'+a.expr+')':'Math.'+label+'('+a.expr+')',vals,a.cost+1,a.variables,d,
            {kind:'mutation',operator:label,operand:a.ast});
        }
      }
      for(const a of pool){
        for(const b of pool){
          if(Math.max(a.depth,b.depth)!==d-1||a.cost+b.cost>12)continue;
          for(const [op,fn] of operators){
            if(['+','*','min','max'].includes(op)&&a.expr>b.expr)continue;
            const values=a.values.map((v,i)=>fn(v,b.values[i]));
            const expr=['min','max'].includes(op)?'Math.'+op+'('+a.expr+','+b.expr+')':
              '('+a.expr+op+b.expr+')';
            add(expr,values,a.cost+b.cost+1,a.variables+b.variables,d,
              {kind:'crossover',operator:op,left:a.ast,right:b.ast});
          }
        }
      }
      winner=best();
      if(winner)return winner;
      if(searched>150000)break;
    }
    return null;
  }
  // 반례를 찾을 때마다 탐색 제약에 넣는다. 검증 예시는 탐색 초기 학습에 사용하지 않는다.
  for(let round=0;round<=holdouts.length;round++){
    const evolved=spec.strategy==='evolution'||spec.astEvolution===true
      ?evolveVibe59NumericAST({params,constants:fixed,rows,active,maxDepth,spec}):null;
    const candidate=evolved||attempt()||evolveVibe59NumericAST({params,constants:fixed,rows,active,maxDepth,spec});
    if(evolved)searched+=evolved.candidatesConsidered;
    else if(Array.isArray(candidate?.ast)&&Number.isSafeInteger(candidate.candidatesConsidered))
      searched+=candidate.candidatesConsidered;
    if(!candidate)break;
    const mismatch=[...original].find(i=>!close(candidate.values[i],rows[i].output));
    if(mismatch===undefined){selected=candidate;passes=rows.length;break;}
    if(active.has(mismatch))break;
    active.add(mismatch);seenCounterexamples.push(mismatch-examples.length);
  }
  if(!selected)throw Error('VIBE59_ALGORITHM_NO_VERIFIED_CANDIDATE');
  return Object.freeze({expression:selected.expr,
    inventionOperators:Object.freeze(['MUTATION','CROSSOVER','SEMANTIC_DEDUPLICATION','COUNTEREXAMPLE_REFINEMENT']),
    parameters:Object.freeze([...params]),
    source:'return '+selected.expr+';',complexity:selected.cost,
    casesPassed:passes,trainingCases:examples.length,heldOutCases:holdouts.length,
    counterexamples:Object.freeze(seenCounterexamples),
    candidatesConsidered:searched,
    search:Array.isArray(selected.ast)?'BOUNDED_AST_EVOLUTION_CEGIS':'BOUNDED_ENUMERATIVE_CEGIS',
    ast:selected.ast||null,
    fitness:Object.freeze({accuracy:passes/rows.length,
      complexity:selected.cost,novelty:selected.novelty??0,
      regressionRisk:selected.regressionRisk??0,generations:selected.generations??0}),
    modelUsed:false,sourceWrite:false,runtimeVerified:false,
    exactGameQaRequired:true,authority:'owner-example-constrained-candidate-only'});
}


// [증명 대기 개념 추출] 기존 수치 AST의 부분식을 재사용 후보로 만든다.
// 오라클 검증만으로 실제 게임 QA, 지속 학습 승격 또는 소스 변경을 승인하지 않는다.
export function extractVibe59AlgorithmConceptCandidates({search={},maxConcepts=8}={}){
  const empty=reason=>Object.freeze({concepts:Object.freeze([]),reason,
    verification:'ORACLE_ONLY',verified:false,persisted:false,
    promotionAuthorized:false,sourceWrite:false,modelUsed:false});
  const params=search?.parameters;
  if(search?.modelUsed!==false||search?.sourceWrite!==false||search?.runtimeVerified!==false
    ||!Array.isArray(params)||params.length<1||params.length>3
    ||params.some(p=>typeof p!=='string'||!/^[A-Za-z_$][\w$]*$/.test(p))
    ||new Set(params).size!==params.length||!Number.isSafeInteger(search.trainingCases)
    ||search.trainingCases<3||!Number.isSafeInteger(search.heldOutCases)
    ||search.heldOutCases<2||search.casesPassed!==search.trainingCases+search.heldOutCases)
    return empty('INDEPENDENT_ORACLE_REQUIRED');
  const unary=new Set(['neg','abs','floor','round']);
  const binary=new Set(['+','-','*','/','%','min','max','gt','lt']);
  const budget={nodes:0};
  function normalize(node,depth,ancestors){
    if(!node||typeof node!=='object'||ancestors.has(node)
      ||depth>4||++budget.nodes>39)throw Error('VIBE59_UNSAFE_CONCEPT_AST');
    const next=new Set(ancestors);next.add(node);
    if(Array.isArray(node)){
      const op=node[0];
      if(op==='param'&&node.length===2&&Number.isInteger(node[1])
        &&node[1]>=0&&node[1]<params.length)return ['param',node[1]];
      if(op==='const'&&node.length===2&&Number.isFinite(node[1])
        &&Math.abs(node[1])<=1000)return ['const',node[1]];
      if(unary.has(op)&&node.length===2)
        return [op,normalize(node[1],depth+1,next)];
      if(binary.has(op)&&node.length===3)
        return [op,normalize(node[1],depth+1,next),normalize(node[2],depth+1,next)];
      if(op==='select'&&node.length===4)
        return [op,normalize(node[1],depth+1,next),normalize(node[2],depth+1,next),
          normalize(node[3],depth+1,next)];
    }else if(Object.getPrototypeOf(node)===Object.prototype){
      if(node.kind==='reference'){
        const index=params.indexOf(node.name);
        if(index>=0)return ['param',index];
      }
      if(node.kind==='constant'&&Number.isFinite(node.value)
        &&Math.abs(node.value)<=1000)return ['const',node.value];
      if(node.kind==='mutation'&&unary.has(node.operator))
        return [node.operator,normalize(node.operand,depth+1,next)];
      if(node.kind==='crossover'&&binary.has(node.operator))
        return [node.operator,normalize(node.left,depth+1,next),
          normalize(node.right,depth+1,next)];
    }
    throw Error('VIBE59_UNSAFE_CONCEPT_AST');
  }
  let ast;
  try{ast=normalize(search.ast,0,new Set());}catch{return empty('AST_REJECTED');}
  const extracted=new Map();
  function visit(node){
    let size=1;
    for(const child of node.slice(1))if(Array.isArray(child))size+=visit(child);
    if(size>1){
      const serialized=JSON.stringify(node);
      if(serialized.includes('"param"')&&!extracted.has(serialized))
        extracted.set(serialized,{ast:node,size});
    }
    return size;
  }
  visit(ast);
  const bound=Math.max(1,Math.min(8,Number.isInteger(maxConcepts)?maxConcepts:8));
  const entries=[...extracted].sort((a,b)=>b[1].size-a[1].size
    ||a[0].localeCompare(b[0])).slice(0,bound);
  const freeze=node=>Object.freeze(node.map(v=>Array.isArray(v)?freeze(v):v));
  const concepts=entries.map(([serialized,row])=>Object.freeze({
    fingerprint:sha(serialized),ast:freeze(row.ast),complexity:row.size,
    parameters:Object.freeze([...params]),verified:false,verification:'ORACLE_ONLY',
    reusableAfterGameProofOnly:true,exactSourceRevisionRequired:true,
    freshCrossPlatformHoldoutsRequired:true,sourceWriteAuthorized:false
  }));
  return Object.freeze({concepts:Object.freeze(concepts),
    reason:concepts.length?'CANDIDATE_ONLY':'NO_PARAMETRIC_SUBEXPRESSION',
    verification:'ORACLE_ONLY',verified:false,persisted:false,
    promotionAuthorized:false,sourceWrite:false,modelUsed:false});
}

// [유틸] AST -> Luau. Roblox 런타임이나 서버 권한으로 간주하지 않는다.
function renderVibe59NumericLuaAST(node,params){
  if(!Array.isArray(node))throw Error('VIBE59_ALGORITHM_LUA_AST_REQUIRED');
  const [op,a,b,c]=node;
  if(op==='param')return params[a];
  if(op==='const')return String(a);
  const x=renderVibe59NumericLuaAST(a,params);
  if(op==='neg')return '(-'+x+')';
  if(['abs','floor'].includes(op))return 'math.'+op+'('+x+')';
  if(op==='round')return 'math.floor(('+x+')+0.5)';
  const y=renderVibe59NumericLuaAST(b,params);
  if(['min','max'].includes(op))return 'math.'+op+'('+x+','+y+')';
  if(op==='gt'||op==='lt')return '(('+x+(op==='gt'?'>':'<')+y+') and 1 or 0)';
  if(op==='select')return '(('+x+'>0) and ('+y+') or ('+renderVibe59NumericLuaAST(c,params)+'))';
  if(op==='%')return '('+x+'-math.modf('+x+'/'+y+')*'+y+')';
  if(['+','-','*','/'].includes(op))return '('+x+op+y+')';
  throw Error('VIBE59_ALGORITHM_LUA_OPERATOR_REJECTED');
}

// [코드 실험실] 기존 수치 합성기를 반복 사용한다. 새 실행기나 별도 후보 쓰기는 없다.
// 실패 기록은 증거로 보존하지만 게임 QA·보안·런타임 PASS로 바꾸지 않는다.
export function runVibe59CodeLaboratory({spec={},verifiedHistory=[]}={}){
  if(!Array.isArray(verifiedHistory)||verifiedHistory.length>128)
    throw Error('VIBE59_LAB_HISTORY_BOUNDS');
  const maxDepth=Number.isInteger(spec?.maxDepth)?Math.max(1,Math.min(4,spec.maxDepth)):3;
  const maxExperiments=Number.isInteger(spec?.maxExperiments)
    ?Math.max(1,Math.min(3,spec.maxExperiments)):3;
  const profiles=[
    {id:'lean',depth:Math.min(2,maxDepth)},
    {id:'balanced',depth:Math.min(3,maxDepth)},
    {id:'deep',depth:maxDepth}
  ].filter((row,i,all)=>all.findIndex(other=>other.depth===row.depth)===i)
    .slice(0,maxExperiments);
  const eligibleHistory=verifiedHistory.filter(row=>row&&
    row.modelUsed===false&&row.sourceChanged===true&&
    row.independentQa==='PASS'&&row.regression==='PASS'&&
    row.security==='PASS'&&row.runtime==='PASS'&&
    /^[a-f0-9]{40}$/i.test(clean(row.sourceRevision))&&
    profiles.some(p=>p.id===row.strategy));
  const experiments=[];
  for(const profile of profiles){
    const measured=eligibleHistory.filter(row=>row.strategy===profile.id);
    const successes=measured.filter(row=>row.outcome==='PASS').length;
    const failures=measured.filter(row=>row.outcome==='FAIL').length;
    try{
      const result=synthesizeVibe59NumericAlgorithm({spec:{...spec,maxDepth:profile.depth}});
      experiments.push({strategy:profile.id,searchDepth:profile.depth,
        status:'EXAMPLES_AND_HOLDOUTS_PASS',sourceChanged:false,
        candidatesConsidered:result.candidatesConsidered,
        counterexampleCount:result.counterexamples.length,
        complexity:result.complexity,verifiedHistoryWins:successes,
        verifiedHistoryFailures:failures,result});
    }catch(error){
      if(!/^VIBE59_ALGORITHM_NO_VERIFIED_CANDIDATE$/.test(clean(error.message)))throw error;
      experiments.push({strategy:profile.id,searchDepth:profile.depth,
        status:'NO_VERIFIED_CANDIDATE',sourceChanged:false,
        failureSignature:'VIBE59_ALGORITHM_NO_VERIFIED_CANDIDATE',
        verifiedHistoryWins:successes,verifiedHistoryFailures:failures});
    }
  }
  const successful=experiments.filter(x=>x.result).sort((a,b)=>
    (a.complexity-b.complexity)||
    ((b.verifiedHistoryWins-b.verifiedHistoryFailures)-
      (a.verifiedHistoryWins-a.verifiedHistoryFailures))||
    (a.candidatesConsidered-b.candidatesConsidered)||
    a.strategy.localeCompare(b.strategy));
  if(!successful.length)throw Error('VIBE59_ALGORITHM_NO_VERIFIED_CANDIDATE');
  const chosen=successful[0];
  const trail=experiments.map(({result,...row})=>row);
  return Object.freeze({
    winner:chosen.result,selectedStrategy:chosen.strategy,
    experiments:Object.freeze(trail),
    bottleneckDiagnosis:experiments.some(x=>x.status==='NO_VERIFIED_CANDIDATE')
      ?'SEARCH_DEPTH_OR_OPERATOR_COVERAGE':'NONE_OBSERVED',
    nextStrategy:chosen.strategy,
    strategyEvidenceCount:eligibleHistory.length,
    strategyLearning:'VERIFIED_HISTORY_RANKING_ONLY',
    independentQa:'NOT_RUN',security:'NOT_RUN',regression:'NOT_RUN',
    runtime:'NOT_RUN',sourceWrite:false,modelUsed:false,
    authority:'bounded-offline-candidate-experiment-only'
  });
}

// [메인] 생성된 수치 알고리즘은 기존 단일 책임 함수 본문을 정확히 교체한다.
// 임의 함수 실행/새 저장값/외부 모델 코드는 허용하지 않는다.
export function synthesizeVibe59NumericAlgorithmSource({spec={},source='',relative='',target=''}={}){
  const name=spec?.functionName,params=spec?.parameters;
  if(spec?.ownerApproved!==true||typeof name!=='string'
    ||!/^[A-Za-z_$][\w$]{0,59}$/.test(name)
    ||!Array.isArray(params)||!params.length
    ||typeof source!=='string'||source.length<18||source.length>260000
    ||typeof relative!=='string'||relative.startsWith('/')||relative.includes(String.fromCharCode(92))
    ||relative.split('/').some(part=>!part||part==='.'||part==='..')
    ||!/\.(?:js|mjs|cjs|lua|luau)$/i.test(relative))
    throw Error('VIBE59_ALGORITHM_SOURCE_SCOPE_REQUIRED');
  const roblox=/\.(?:lua|luau)$/i.test(relative);
  if(target&&target!==(roblox?'roblox':'web'))throw Error('VIBE59_ALGORITHM_SOURCE_SCOPE_REQUIRED');
  const declaration=roblox
    ?new RegExp('\\b(?:local\\s+)?function\\s+'+name+'\\s*\\(([^)]*)\\)\\s*\\n?\\s*return\\s+([^\\n;]+)\\s*\\n\\s*end','g')
    :new RegExp('\\bfunction\\s+'+name+'\\s*\\(([^)]*)\\)\\s*\\{\\s*return\\s+([^;{}]+);\\s*\\}','g');
  const matches=[...source.matchAll(declaration)];
  if(matches.length!==1||matches[0][1].split(',').map(x=>x.trim()).join(',')!==params.join(',')
    ||/[^A-Za-z0-9_$+\-*\/%().,\s]/.test(matches[0][2])
    ||/\b(?:eval|Function|import|require|process|this|window|globalThis|localStorage|sessionStorage|game|workspace)\b/.test(matches[0][2]))
    throw Error('VIBE59_ALGORITHM_EXISTING_PURE_FUNCTION_REQUIRED');
  // Only exact-source, reproduced game counterexamples can amend the owner's oracle.
  const observed=Array.isArray(spec.verifiedCounterexamples)?spec.verifiedCounterexamples:[];
  if(observed.length>12)throw Error('VIBE59_ALGORITHM_COUNTEREXAMPLES_LIMIT');
  const merged=[...(spec.examples||[])],holdoutKeys=new Set((spec.holdouts||[]).map(row=>JSON.stringify(row.args)));
  const observedIds=new Set();
  for(const row of observed){
    const proof=row?.proof||{},args=row?.args;
    const evidenceId=String(proof.evidenceId||'');
    if(!row||row.sourceSha256!==sha(source)||row.reproduced!==true
      ||row.gameSourceChanged!==true||row.actualGamePlaytest!==true
      ||proof.independentQa!=='PASS'||proof.regression!=='PASS'||proof.runtime!=='PASS'
      ||proof.actualPlatformRuntime!==true||!evidenceId||observedIds.has(evidenceId)
      ||!Array.isArray(args)||args.length!==params.length||args.some(n=>!Number.isFinite(n)||Math.abs(n)>1e6)
      ||!Number.isFinite(row.output)||Math.abs(row.output)>1e7
      ||holdoutKeys.has(JSON.stringify(args)))
      throw Error('VIBE59_ALGORITHM_COUNTEREXAMPLE_UNVERIFIED');
    observedIds.add(evidenceId);
    const prior=merged.find(item=>JSON.stringify(item.args)===JSON.stringify(args));
    if(prior){
      if(prior.output!==row.output)throw Error('VIBE59_ALGORITHM_ORACLE_CONFLICT');
    }else merged.push({args,output:row.output});
  }
  if(merged.length>18)throw Error('VIBE59_ALGORITHM_COUNTEREXAMPLES_LIMIT');
  const boundedSpec={...spec,examples:merged,strategy:roblox?'evolution':spec.strategy};
  const laboratory=spec.codeLab===true
    ?runVibe59CodeLaboratory({spec:boundedSpec,verifiedHistory:spec.verifiedStrategyHistory||[]}):null;
  const result=laboratory?.winner||synthesizeVibe59NumericAlgorithm({spec:boundedSpec});
  if(roblox&&!result.ast)throw Error('VIBE59_ROBLOX_AST_PROOF_REQUIRED');
  const luaExpr=roblox?renderVibe59NumericLuaAST(result.ast,params):null;
  const oldText=matches[0][0];
  const newText=roblox
    ?oldText.replace(/return\s+[^\n;]+/,'return '+luaExpr)
    :oldText.replace(/return\s+[^;{}]+;/,'return '+result.expression+';');
  if(oldText===newText)throw Error('VIBE59_ALGORITHM_NO_SOURCE_DELTA');
  return Object.freeze({oldText,newText,search:result,
    conceptCandidates:extractVibe59AlgorithmConceptCandidates({search:result}),
    acceptedRuntimeCounterexamples:observed.length,
    laboratory:laboratory?{...laboratory,winner:undefined}:null,
    sourceWrite:false,modelUsed:false,runtimeVerified:false,
    authority:'existing-exact-function-replacement-only'});
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
export function createVibe59CodeCandidate({order={},sourceRoot='',responsibleFiles=[],target='',documents=null,verifiedCodePatterns=[]}={}){
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
  const specialized=[req?.robloxDomainAction,req?.robloxSkill109,req?.robloxQualityAction,req?.robloxPathfindingAction,req?.robloxCraftingAction].filter(Boolean);
  if(!req||req.ownerApproved!==true||!req.path||!req.find
    ||(specialized.length?(specialized.length!==1||Boolean(req.rule)||Boolean(req.machine)||target!=='roblox'):
       [Boolean(req.rule),Boolean(req.machine),Boolean(req.algorithmSpec)].filter(Boolean).length!==1))
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
  const content=documents instanceof Map&&documents.has(relative)
    ?documents.get(relative):fs.readFileSync(full,'utf8'),find=req.find;
  if(content.length>260000||typeof find!=='string'||!find||find.length>1024
    ||content.indexOf(find)<0||content.indexOf(find,content.indexOf(find)+find.length)>=0)
    throw Error('VIBE59_ANCHOR_NOT_UNIQUE');
  if(req.sourceSha256!=null&&sha(content)!==req.sourceSha256)throw Error('VIBE59_STALE_SOURCE');
  if(req.algorithmSpec){
    if(!['web','roblox'].includes(target))throw Error('VIBE59_ALGORITHM_TARGET_INVALID');
    const memory=order.vibe59AlgorithmMemory||order.selectedTask?.vibe59AlgorithmMemory||{};
    const domain=clean(req.algorithmSpec.domain).toUpperCase();
    const inherited=retrieveVerifiedAlgorithmConcepts({stateInput:memory,
      platform:target,domain});
    const meta=preferVerifiedAlgorithmStrategy({stateInput:memory,platform:target,domain});
    const generated=synthesizeVibe59NumericAlgorithmSource({spec:{...req.algorithmSpec,
      verifiedConcepts:req.algorithmSpec.verifiedConcepts??order.vibe59VerifiedAlgorithmConcepts??inherited,
      strategy:req.algorithmSpec.strategy??(meta.strategy==='BOUNDED_AST_EVOLUTION_CEGIS'?'evolution':undefined),
      verifiedCounterexamples:req.algorithmSpec.verifiedCounterexamples??order.vibe59VerifiedAlgorithmFailures,
      codeLab:req.algorithmSpec.codeLab!==false,
      verifiedStrategyHistory:(Array.isArray(verifiedCodePatterns)?verifiedCodePatterns:[])
        .filter(row=>row?.verified===true&&row?.retrievalEligible!==false
          &&row?.rawCodeStored===false&&row?.independentQa==='PASS'
          &&row?.verifiedAlgorithmStrategy?.sourceRevision===row?.sourceRevision
          &&row?.verifiedAlgorithmStrategy?.modelUsed===false
          &&row?.engine===target)
        .slice(0,128).map(row=>row.verifiedAlgorithmStrategy),
      ownerApproved:req.ownerApproved===true},source:content,relative,target});
    if(find!==generated.oldText)throw Error('VIBE59_ALGORITHM_ANCHOR_MISMATCH');
    return Object.freeze({summary:'Vibe5.9 AST-evolved and counterexample-guided numeric algorithm',
      expectedEffect:'Verified owner examples and held-out cases bound the new existing-function algorithm',
      edits:[{path:relative,find,replace:generated.newText}],newFiles:[],replaceFiles:[],
      tests:[],vibe59CodeKind:target==='roblox'?'ROBLOX_SYNTHESIZED_NUMERIC_ALGORITHM':'WEB_SYNTHESIZED_NUMERIC_ALGORITHM',
      vibe59TestPlan:{pass:true,cases:[...req.algorithmSpec.examples,...req.algorithmSpec.holdouts,
        ...(Array.isArray(req.algorithmSpec.verifiedCounterexamples)?req.algorithmSpec.verifiedCounterexamples:[])
          .map(row=>({args:row.args,output:row.output}))],
        trainingCases:generated.search.trainingCases,heldOutCases:generated.search.heldOutCases},
      algorithmProof:generated.search,algorithmConceptCandidates:generated.conceptCandidates,
      codeLaboratory:generated.laboratory,
      ruleDigest:sha(JSON.stringify(req.algorithmSpec)),
      sourceWrite:false,modelUsed:false,runtimeVerified:false});
  }
  if(req.robloxCraftingAction){
    const generated=synthesizeVibe59CraftingTransaction({spec:req.robloxCraftingAction,
      source:content,sourcePath:relative,replaceAnchor:find});
    const proof=verifyVibe59CraftingScenarios({spec:req.robloxCraftingAction,
      scenarios:req.scenarios});
    if(!proof.pass)throw Error('VIBE59_CRAFTING_SCENARIO_COUNTEREXAMPLE:'+
      proof.cases.filter(x=>!x.pass).map(x=>x.name).join(','));
    return Object.freeze({summary:'Vibe5.9 server-approved transactional crafting',
      expectedEffect:'Batch crafting from existing recipe whitelist with replay and capacity guards',
      edits:[{path:relative,find,replace:generated.source}],newFiles:[],replaceFiles:[],
      tests:[],vibe59CodeKind:'ROBLOX_CRAFTING_TRANSACTION',
      vibe59GameplayMechanic:generated.operation,vibe59GameplaySafety:generated.safety,
      vibe59TestPlan:proof,ruleDigest:sha(JSON.stringify(req.robloxCraftingAction)),
      sourceWrite:false,modelUsed:false,runtimeVerified:false});
  }
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
// Structured complex designs: independent verified changes to multiple functions
// are compiled as one atomic candidate without any external model or main write.
// A dependency cycle, stale anchor, missing proof or overlapping edit fails closed.
// Structured complex designs use the existing exact-edit engine against a private
// in-memory source snapshot. Dependent steps may consume earlier generated code,
// but original files remain untouched until the canonical worker admits the batch.
export function createVibe59CodeCandidates({order={},sourceRoot='',responsibleFiles=[],target='',verifiedCodePatterns=[]}={}){
  const batch=order.selectedTask?.vibe59CodeRequests??order.vibe59CodeRequests;
  if(batch==null)return createVibe59CodeCandidate({order,sourceRoot,responsibleFiles,target,verifiedCodePatterns});
  if(!Array.isArray(batch)||batch.length<2||batch.length>12)
    throw Error('VIBE59_COMPLEX_DESIGN_STEPS_REQUIRED');
  const indexed=batch.map((step,index)=>{
    if(!step||typeof step!=='object'||Array.isArray(step)||step.ownerApproved!==true)
      throw Error('VIBE59_COMPLEX_DESIGN_OWNER_APPROVAL_REQUIRED');
    const id=clean(step.id||'step-'+(index+1));
    if(!/^[A-Za-z][A-Za-z_0-9-]{0,63}$/.test(id))
      throw Error('VIBE59_COMPLEX_DESIGN_INVALID_STEP_ID');
    const deps=step.dependsOn||[];
    if(!Array.isArray(deps)||deps.length>12||deps.some(item=>typeof item!=='string'))
      throw Error('VIBE59_COMPLEX_DESIGN_DEPENDENCY_INVALID');
    return{id,step,deps};
  });
  const byId=new Map(indexed.map(row=>[row.id,row]));
  if(byId.size!==indexed.length)throw Error('VIBE59_COMPLEX_DESIGN_DUPLICATE_STEP');
  const sorted=[],visiting=new Set(),visited=new Set();
  function visit(id){
    if(visited.has(id))return;
    if(visiting.has(id))throw Error('VIBE59_COMPLEX_DESIGN_DEPENDENCY_CYCLE');
    const row=byId.get(id);
    if(!row)throw Error('VIBE59_COMPLEX_DESIGN_UNKNOWN_DEPENDENCY');
    visiting.add(id);
    for(const dependency of row.deps)visit(dependency);
    visiting.delete(id);visited.add(id);sorted.push(row);
  }
  for(const row of indexed)visit(row.id);
  const assembled=[],ranges=new Map(),originals=new Map(),documents=new Map();
  for(const row of sorted){
    // A prior replacement must not hide reuse of an already-consumed original anchor.
    const requestedPath=clean(row.step.path).replaceAll('\\','/');
    const originalText=originals.get(requestedPath);
    const requestedFind=row.step.find;
    if(originalText!==undefined&&typeof requestedFind==='string'&&requestedFind){
      const start=originalText.indexOf(requestedFind);
      if(start>=0&&(ranges.get(requestedPath)||[]).some(range=>
        start<range.end&&start+requestedFind.length>range.start))
        throw Error('VIBE59_COMPLEX_DESIGN_OVERLAPPING_EDITS:'+row.id);
    }
    const selectedTask={...(order.selectedTask||{}),vibe59CodeRequest:row.step};
    const single=createVibe59CodeCandidate({
      order:{...order,selectedTask,vibe59CodeRequest:row.step},
      sourceRoot,responsibleFiles,target,documents,verifiedCodePatterns
    });
    if(!single?.vibe59TestPlan?.pass||!Array.isArray(single.vibe59TestPlan.cases)
      ||single.vibe59TestPlan.cases.length<2||!Array.isArray(single.edits)||!single.edits.length
      ||single.newFiles?.length||single.replaceFiles?.length)
      throw Error('VIBE59_COMPLEX_DESIGN_UNVERIFIED_STEP:'+row.id);
    for(const edit of single.edits){
      let original=originals.get(edit.path);
      if(original===undefined){
        original=fs.readFileSync(path.resolve(sourceRoot,edit.path),'utf8');
        originals.set(edit.path,original);
      }
      const current=documents.get(edit.path)??original;
      if(current.split(edit.find).length!==2)
        throw Error('VIBE59_COMPLEX_DESIGN_ANCHOR_DRIFT:'+row.id);
      const start=original.indexOf(edit.find);
      if(start>=0){
        if(original.indexOf(edit.find,start+edit.find.length)>=0)
          throw Error('VIBE59_COMPLEX_DESIGN_ANCHOR_DRIFT:'+row.id);
        const end=start+edit.find.length;
        if((ranges.get(edit.path)||[]).some(pair=>start<pair.end&&end>pair.start))
          throw Error('VIBE59_COMPLEX_DESIGN_OVERLAPPING_EDITS:'+row.id);
        ranges.set(edit.path,[...(ranges.get(edit.path)||[]),{start,end}]);
      }else if(!assembled.some(previous=>row.deps.includes(previous.id)
        &&previous.candidate.edits.some(candidateEdit=>
          candidateEdit.path===edit.path&&candidateEdit.replace.includes(edit.find)))){
        throw Error('VIBE59_COMPLEX_DESIGN_ANCHOR_DRIFT:'+row.id);
      }
      if(!documents.has(edit.path))documents.set(edit.path,original);
    }
    // Canonical edit simulation is atomic and never mutates the repository source.
    applyExactEdits(sourceRoot,single.edits,{documents});
    assembled.push({id:row.id,dependsOn:[...row.deps],candidate:single});
  }
  const edits=assembled.flatMap(row=>row.candidate.edits),cases=assembled.flatMap(row=>
    row.candidate.vibe59TestPlan.cases.map(item=>({...item,name:row.id+':'+item.name})));
  // Replay from the untouched source with the same editor the source worker uses.
  const replay=new Map([...originals]);
  applyExactEdits(sourceRoot,edits,{documents:replay});
  for(const [relative,content] of documents)
    if(replay.get(relative)!==content)throw Error('VIBE59_COMPLEX_DESIGN_REPLAY_MISMATCH');
  return Object.freeze({
    summary:'Vibe5.9 offline dependency-ordered complex design code synthesis',
    expectedEffect:'Atomically implement '+assembled.length+' owner-approved, source-grounded game-system steps',
    edits,newFiles:[],replaceFiles:[],tests:[],
    vibe59CodeKind:'COMPOSED_OFFLINE_SOURCE',vibe59TestPlan:{pass:true,cases},
    vibe59DesignSteps:assembled.map(row=>({id:row.id,dependsOn:row.dependsOn,
      operation:row.candidate.vibe59CodeKind,ruleDigest:row.candidate.ruleDigest})),
    ruleDigest:sha(JSON.stringify(assembled.map(row=>[row.id,row.dependsOn,row.candidate.ruleDigest]))),
    sourceWrite:false,modelUsed:false,runtimeVerified:false
  });
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
  // Work orders may include long owner goals. Keep the full requirement for coding,
  // but bound this read-only creativity preview to its existing 800-char budget.
  const creativeGoal=clean(creativeInput.goal||requirement.goal);
  const boundedCreativeGoal=creativeGoal.length>800
    ?creativeGoal.slice(0,560)+' '+creativeGoal.slice(-239):creativeGoal;
  const creativity=target==='roblox'?buildVibe59CreativityPlan({
    goal:boundedCreativeGoal,approvedOperations:creativeInput.approvedOperations,
    existingMechanics:creativeInput.existingMechanics,verifiedPatterns:creativeInput.verifiedPatterns,
    feedback:creativeInput.feedback,seed:clean(order.gameId)||'vibe59',
    ownerApproved:false}):null;
  return Object.freeze({version:'5.9',sourceWrite:false,runtimeVerified:false,
    requirement,assembly,repair,memory,completion,creativity,
    skillCatalog:{total:VIBE59_LUAU_CODING_SKILLS_109.length,
      systems:[...new Set(VIBE59_LUAU_CODING_SKILLS_109.map(x=>x.system))],
      codegen:'existing-owner-approved-server-state-only',runtimeVerified:false},
    advancedGameplay:{mechanics:[...VIBE59_QUALITY_GAMEPLAY_ACTIONS.map(x=>x.id),'ai-pathfinding-chase','crafting-verified-transaction'],
      count:VIBE59_QUALITY_GAMEPLAY_ACTIONS.length+2,verification:'offline-scenario-only',
      requiresExistingAuthorizedServerBindings:true,runtimeVerified:false},
    sourceFlowCount:codeFlow?.sources?.length||0,
    sourceImpactCount:sourceImpact?.impactedSources?.length||0,
    synthesisCandidateAvailable:Boolean(order.vibe59CodeRequest||order.selectedTask?.vibe59CodeRequest
      ||order.vibe59CodeRequests||order.selectedTask?.vibe59CodeRequests
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
