const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const uniq=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const upper=v=>clean(v).toUpperCase();

const SYSTEM_RULES=Object.freeze([
  ['SAVE',/save|load|restore|storage|localstorage|sessionstorage|persist|serialize|checkpoint/i],
  ['PLACEMENT',/place|placement|tower|build|deploy|slot|grid/i],
  ['WORLD',/world|map|area|zone|region|route|path|collision|raycast|nav/i],
  ['INTERACTION',/interact|npc|dialog|door|chest|switch|pickup|target/i],
  ['COMBAT',/combat|attack|damage|weapon|skill|enemy|boss|cooldown|hit/i],
  ['AI',/enemy|agent|intent|ai|pathfind|targeting/i],
  ['ECONOMY',/econom|currency|gold|coin|resource|price|cost|shop|buy|sell|craft|reward/i],
  ['PROGRESSION',/progress|objective|quest|unlock|level|xp|reward|stage/i],
  ['INPUT',/input|pointer|touch|click|keydown|keyup|control/i],
  ['GOAL_STATE',/victory|defeat|win|lose|gameover|goal|retry|runstate/i],
  ['PRESENTATION',/render|draw|paint|ui|hud|textcontent|innerhtml|style|classlist/i],
  ['CORE_STATE',/state|phase|clock|seed|reset|init|start|update/i],
]);

function systemsFor(text=''){
  const source=String(text||'');
  return SYSTEM_RULES.filter(([,re])=>re.test(source)).map(([name])=>name);
}
function scriptsFromHtml(source=''){
  const raw=String(source||''),matches=[...raw.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)];
  return matches.length?matches.map(m=>m[1]||'').join('\n'):raw;
}
function matchingBrace(text,start){
  let depth=0,quote='',escape=false;
  for(let i=start;i<text.length;i++){
    const ch=text[i];
    if(quote){if(escape){escape=false;continue;}if(ch==='\\'){escape=true;continue;}if(ch===quote)quote='';continue;}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
    if(ch==='{')depth++;
    else if(ch==='}'&&--depth===0)return i;
  }
  return -1;
}
function extractNamedFunctions(source=''){
  const raw=scriptsFromHtml(source),rows=[],seen=new Set();
  const patterns=[
    /(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/g,
    /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{/g,
  ];
  for(const pattern of patterns){
    for(const match of raw.matchAll(pattern)){
      const name=match[1];if(seen.has(name))continue;
      const open=(match.index||0)+match[0].lastIndexOf('{'),close=matchingBrace(raw,open);
      if(close<0)continue;
      seen.add(name);rows.push({name,body:raw.slice(open+1,close),start:match.index||0,end:close+1});
    }
  }
  return rows.sort((a,b)=>a.start-b.start).slice(0,160);
}
function declaredStateNames(source=''){
  const raw=scriptsFromHtml(source),names=[];
  for(const match of raw.matchAll(/\b(?:let|var|const)\s+([A-Za-z_$][\w$]*)\s*(?:=|;)/g))names.push(match[1]);
  return uniq(names).slice(0,240);
}
function stateAccess(body,stateNames){
  const writes=[],reads=[],source=String(body||'');
  for(const state of stateNames){
    const escaped=state.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const writeRe=new RegExp(`\\b${escaped}\\s*(?:\\+\\+|--|[+\\-*/%]?=)`);
    const propWriteRe=new RegExp(`\\b${escaped}\\s*\\.[A-Za-z_$][\\w$]*\\s*(?:\\+\\+|--|[+\\-*/%]?=)`);
    const readRe=new RegExp(`\\b${escaped}\\b`);
    if(writeRe.test(source)||propWriteRe.test(source))writes.push(state);
    if(readRe.test(source))reads.push(state);
  }
  return{writes:uniq(writes),reads:uniq(reads)};
}
function storageUsage(body=''){
  const keys=[];
  for(const m of String(body||'').matchAll(/(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\s*\(\s*['"]([^'"]+)['"]/g))keys.push(m[1]);
  return uniq(keys);
}
function eventUsage(body=''){
  const events=[];
  for(const m of String(body||'').matchAll(/addEventListener\s*\(\s*['"]([^'"]+)['"]/g))events.push(m[1]);
  return uniq(events);
}
function timerSignals(body=''){
  const source=String(body||'');
  return{
    animationFrame:/requestAnimationFrame\s*\(/.test(source),
    interval:/setInterval\s*\(/.test(source),
    timeout:/setTimeout\s*\(/.test(source),
  };
}
function exactEventRegistrations(source=''){
  const raw=scriptsFromHtml(source),rows=[];
  for(const m of raw.matchAll(/addEventListener\s*\(\s*['"]([^'"]+)['"]\s*,\s*([A-Za-z_$][\w$]*)\s*\)/g))rows.push(`${m[1]}::${m[2]}`);
  return rows;
}

export function buildResponsibilityGraph({source='',sourceAnalysis={}}={}){
  const raw=scriptsFromHtml(source),functions=extractNamedFunctions(raw),names=functions.map(row=>row.name),known=new Set(names),states=declaredStateNames(raw),nodes=[];
  for(const fn of functions){
    const calls=[];
    for(const m of fn.body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)){const name=m[1];if(name!==fn.name&&known.has(name))calls.push(name);}
    const access=stateAccess(fn.body,states),storageKeys=storageUsage(fn.body),events=eventUsage(fn.body),systems=uniq([...systemsFor(fn.name),...systemsFor(fn.body),...(storageKeys.length?['SAVE']:[]),...(events.length?['INPUT']:[])]);
    nodes.push({name:fn.name,systems,calls:uniq(calls),calledBy:[],stateReads:access.reads,stateWrites:access.writes,storageKeys,events,timers:timerSignals(fn.body),bodyBytes:Buffer.byteLength(fn.body,'utf8')});
  }
  const byName=new Map(nodes.map(node=>[node.name,node]));
  for(const node of nodes)for(const target of node.calls){const called=byName.get(target);if(called)called.calledBy.push(node.name);}
  for(const node of nodes)node.calledBy=uniq(node.calledBy);
  const edges=[];for(const node of nodes)for(const target of node.calls)edges.push({from:node.name,to:target,type:'CALL'});
  const stateWriters=[];for(const state of states){const writers=nodes.filter(node=>node.stateWrites.includes(state)).map(node=>node.name);if(writers.length)stateWriters.push({state,writers});}
  const storageOwners=[];for(const key of uniq([...(sourceAnalysis.storageKeys||[]),...nodes.flatMap(node=>node.storageKeys)])){const owners=nodes.filter(node=>node.storageKeys.includes(key)).map(node=>node.name);storageOwners.push({key,owners});}
  const entrypoints=nodes.filter(node=>node.events.length||node.calledBy.length===0&&node.timers.animationFrame).map(node=>node.name);
  return{version:1,nodeCount:nodes.length,nodes,edges,stateWriters,storageOwners,entrypoints:uniq(entrypoints),rule:'TRACE_FAILURE_TO_STATE_WRITER_THEN_CALLERS_AND_DEPENDENTS_BEFORE_PATCH'};
}

function failureSystems(failure=''){
  const value=upper(failure),systems=[];
  const add=(system,re)=>{if(re.test(value))systems.push(system);};
  add('SAVE',/SAVE|STORAGE|RESTORE|LOAD/);add('PLACEMENT',/PLACEMENT|TOWER|BUILD|GRID/);add('WORLD',/WORLD|MAP|AREA|ZONE|ROUTE|PATH|COLLISION|SPATIAL|3D/);add('INTERACTION',/INTERACTION|NPC|OBJECT|DOOR|QUEST/);add('COMBAT',/COMBAT|ATTACK|DAMAGE|ENEMY|BOSS|WEAPON/);add('AI',/AI|ENEMY_INTENT|PATHFIND/);add('ECONOMY',/ECONOM|CURRENCY|PRICE|COST|RESOURCE|REWARD/);add('PROGRESSION',/PROGRESS|OBJECTIVE|QUEST|UNLOCK|LEVEL/);add('INPUT',/INPUT|MOBILE|TOUCH|POINTER|CONTROL/);add('GOAL_STATE',/WIN|FAIL|SOFTLOCK|GOAL|RETRY|TERMINAL/);add('PRESENTATION',/UI|VIEW|RENDER|CLIP/);add('CORE_STATE',/STATE|PHASE|REPLAY|DETERMIN|SEED/);
  return uniq(systems.length?systems:['CORE_STATE']);
}
function tokenOverlap(left='',right=''){
  const a=new Set(clean(left).toLowerCase().split(/[^a-z0-9_$]+/).filter(x=>x.length>2)),b=new Set(clean(right).toLowerCase().split(/[^a-z0-9_$]+/).filter(x=>x.length>2));
  let hits=0;for(const token of a)if(b.has(token))hits++;return hits;
}

export function traceFailureResponsibility({failure='',responsibilityGraph={}}={}){
  const systems=failureSystems(failure),nodes=Array.isArray(responsibilityGraph.nodes)?responsibilityGraph.nodes:[];
  const ranked=nodes.map(node=>{
    let score=0;for(const system of systems)if((node.systems||[]).includes(system))score+=5;
    score+=Math.min(4,tokenOverlap(failure,[node.name,...(node.stateWrites||[]),...(node.storageKeys||[])].join(' ')));
    if(systems.includes('SAVE')&&(node.storageKeys||[]).length)score+=3;
    if(systems.includes('INPUT')&&(node.events||[]).length)score+=2;
    if((node.stateWrites||[]).length)score+=1;
    return{function:node.name,score,systems:node.systems,stateWrites:node.stateWrites,stateReads:node.stateReads,callers:node.calledBy,callees:node.calls,storageKeys:node.storageKeys,events:node.events};
  }).filter(row=>row.score>0).sort((a,b)=>b.score-a.score||a.function.localeCompare(b.function)).slice(0,6);
  const primary=ranked[0]||null;
  return{failure:clean(failure),failureSystems:systems,primaryTarget:primary?.function||null,candidates:ranked,causalChain:primary?['FAILURE_EVIDENCE',...(primary.events?.length?['INPUT_OR_EVENT_ENTRY']:[]),`RESPONSIBLE_FUNCTION:${primary.function}`,...(primary.stateWrites||[]).slice(0,4).map(x=>`STATE_WRITE:${x}`),...(primary.callees||[]).slice(0,4).map(x=>`DOWNSTREAM:${x}`)]:['FAILURE_EVIDENCE','RESPONSIBILITY_NOT_RESOLVED'],rule:'PATCH_PRIMARY_RESPONSIBILITY_THEN_REPLAY_ORIGINAL_FAILURE'};
}

export function buildCausalDebugPlan({failures=[],responsibilityGraph={}}={}){
  const traces=uniq(failures).map(failure=>traceFailureResponsibility({failure,responsibilityGraph}));
  return{version:1,mode:'CAUSAL_FAILURE_DEBUG',traces,responsibleTargets:uniq(traces.map(x=>x.primaryTarget)),loop:['REPRODUCE_FAILURE','CAPTURE_OBSERVED_BAD_STATE','TRACE_TO_STATE_WRITER','TRACE_CALLERS_AND_DEPENDENTS','PATCH_PRIMARY_RESPONSIBILITY','REPLAY_ORIGINAL_FAILURE','RUN_FOCUSED_REGRESSION'],stopCondition:'ORIGINAL_FAILURE_CLEARED_AND_DEPENDENT_REGRESSION_GREEN'};
}

export function reviewSeniorSourceQuality(source='',{responsibilityGraph=null}={}){
  const raw=scriptsFromHtml(source),graph=responsibilityGraph||buildResponsibilityGraph({source:raw}),issues=[];
  const push=(code,severity,detail)=>issues.push({code,severity,detail});
  const registrationCounts=new Map();for(const key of exactEventRegistrations(raw))registrationCounts.set(key,(registrationCounts.get(key)||0)+1);
  for(const [key,count] of registrationCounts)if(count>1)push('DUPLICATE_EVENT_HANDLER_REGISTRATION','HARD',`${key}:${count}`);
  for(const node of graph.nodes||[]){
    if(node.bodyBytes>9000&&(node.systems||[]).length>=5)push('GOD_FUNCTION_MULTI_SYSTEM_RESPONSIBILITY','WARN',`${node.name}:${node.bodyBytes}:${node.systems.join(',')}`);
    if((node.stateWrites||[]).length>=14&&(node.systems||[]).length>=4)push('BROAD_STATE_MUTATION_RESPONSIBILITY','WARN',`${node.name}:${node.stateWrites.length}`);
    if(node.timers?.animationFrame&&node.timers?.interval)push('REPEATED_LOOP_CREATES_INTERVAL','HARD',node.name);
    if((node.storageKeys||[]).length&& !/(save|load|restore|persist|storage|checkpoint|serialize)/i.test(node.name))push('STORAGE_ACCESS_OUTSIDE_EXPLICIT_SAVE_BOUNDARY','WARN',`${node.name}:${node.storageKeys.join(',')}`);
  }
  for(const row of graph.stateWriters||[])if(row.writers.length>=5)push('STATE_HAS_TOO_MANY_WRITERS','WARN',`${row.state}:${row.writers.join(',')}`);
  const hardBlockers=uniq(issues.filter(x=>x.severity==='HARD').map(x=>`SENIOR_REVIEW_${x.code}`)),warningCount=issues.filter(x=>x.severity==='WARN').length,score=Math.max(0,100-hardBlockers.length*35-warningCount*5);
  return{version:1,pass:hardBlockers.length===0&&score>=80,score,hardBlockers,issues,questions:['IS_THE_PATCH_AT_THE_TRUE_RESPONSIBILITY_BOUNDARY','CAN_ONE_INPUT_APPLY_EFFECT_TWICE','ARE_STATE_WRITERS_INTENTIONALLY_BOUNDED','DO_TIMERS_OR_EVENTS_ACCUMULATE_ACROSS_RETRY','ARE_SAVE_SEMANTICS_PRESERVED','DO_DEPENDENT_SYSTEMS_HAVE_FOCUSED_REGRESSION']};
}

export function buildBehaviorChainContracts({gameplaySketch={}}={}){
  const chains=[{id:'CORE_ACTION_CHAIN',required:true,steps:['REAL_INPUT','RESPONSIBLE_FUNCTION','OWNED_STATE_CHANGE','OBSERVABLE_GAME_RESULT']}];
  if(gameplaySketch?.placementModel?.required)chains.push({id:'PLACEMENT_CHAIN',required:true,steps:['POSITION_SELECTION','COST_OR_VALIDATION','ENTITY_MATERIALIZED_AT_POSITION','WORLD_OR_COMBAT_EFFECT']});
  if(gameplaySketch?.interactionGraph?.required)chains.push({id:'INTERACTION_CHAIN',required:true,steps:['TARGET_SELECTION_OR_APPROACH','REAL_INPUT','TARGET_STATE_CHANGE','QUEST_ITEM_WORLD_OR_COMBAT_RESULT']});
  if(gameplaySketch?.combatModel?.required)chains.push({id:'COMBAT_CHAIN',required:true,steps:['ATTACK_INTENT','HIT_OR_REJECT_RESULT','HP_OR_COMBAT_STATE_CHANGE','TERMINAL_OR_CONTINUED_COMBAT_RESULT']});
  if(gameplaySketch?.progressionModel?.required)chains.push({id:'PROGRESSION_CHAIN',required:true,steps:['OBJECTIVE_EVENT','PROGRESS_DELTA','REWARD_OR_UNLOCK','NEXT_GAMEPLAY_OPTION_CHANGED']});
  if(gameplaySketch?.combatModel?.strategicOutcomeDifferenceRequired)chains.push({id:'STRATEGY_DIVERGENCE_CHAIN',required:true,steps:['CHOICE_A_AND_CHOICE_B','SAME_OR_EQUIVALENT_START_STATE','DIFFERENT_STATE_TRANSITIONS','DIFFERENT_OBSERVED_OUTCOME']});
  return{version:1,mode:'END_TO_END_BEHAVIOR_RESULT_CONTRACTS',chains,completionRule:'NO_FEATURE_IS_COMPLETE_FROM_BUTTON_LABEL_OR_FUNCTION_EXISTENCE_ALONE'};
}

export function buildExpertDevelopmentAnalysis({source='',sourceAnalysis={},gameplaySketch={},failures=[]}={}){
  const responsibilityGraph=buildResponsibilityGraph({source,sourceAnalysis}),causalDebug=buildCausalDebugPlan({failures,responsibilityGraph}),seniorCodeReview=reviewSeniorSourceQuality(source,{responsibilityGraph}),behaviorChains=buildBehaviorChainContracts({gameplaySketch});
  return{version:1,responsibilityGraph,causalDebug,seniorCodeReview,behaviorChains,authority:'EXPERT_DEVELOPMENT_ANALYSIS_INSIDE_EXISTING_CANONICAL_PIPELINE'};
}
