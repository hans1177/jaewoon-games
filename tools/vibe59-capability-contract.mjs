// Vibe5.9 capability contract: no claimed autonomous completion without evidence.
export const VIBE59_CAPABILITIES=Object.freeze([
 ['game-design-compiler','requirements to explicit system specification'],
 ['program-synthesis','generate novel candidate functions and transitions'],
 ['system-architecture','cross-system dependency design'],
 ['candidate-search','compare multiple candidate implementations'],
 ['runtime-observation','collect real execution evidence'],
 ['failure-repair','trace failures and revise candidate'],
 ['test-generation','derive tests from requirements'],
 ['verified-learning','reuse proven patterns with provenance'],
 ['completion-audit','check every requested acceptance criterion'],
 ['local-code-model','owner-approved local inference only']
].map(([id,goal])=>Object.freeze({id,goal})));
export function planVibe59Development({requirements=[],evidence={}}={}){
 if(!Array.isArray(requirements)||requirements.length>100)throw Error('VIBE59_REQUIREMENTS_INVALID');
 const tasks=requirements.map((row,index)=>{
  if(!row||typeof row!=='object'||typeof row.description!=='string'||!row.description.trim())
   throw Error('VIBE59_REQUIREMENT_MISSING:'+index);
  const id=String(row.id||'requirement-'+(index+1));
  if(!/^[a-zA-Z0-9_-]{1,90}$/.test(id))throw Error('VIBE59_REQUIREMENT_ID_INVALID');
  const dependencies=Array.isArray(row.dependencies)?row.dependencies:[];
  if(dependencies.some(x=>typeof x!=='string'))throw Error('VIBE59_DEPENDENCIES_INVALID');
  return {id,description:row.description.trim(),dependencies,acceptance:Array.isArray(row.acceptance)?row.acceptance.filter(x=>typeof x==='string'&&x.trim()).slice(0,20):[],verified:false};
 });
 const ids=new Set(tasks.map(x=>x.id));
 if(ids.size!==tasks.length)throw Error('VIBE59_DUPLICATE_REQUIREMENT');
 for(const task of tasks)if(task.dependencies.some(x=>!ids.has(x)||x===task.id))throw Error('VIBE59_INVALID_DEPENDENCY:'+task.id);
 const ordered=[],remaining=new Map(tasks.map(x=>[x.id,x]));
 while(remaining.size){
  const ready=[...remaining.values()].filter(t=>t.dependencies.every(d=>ordered.some(x=>x.id===d)));
  if(!ready.length)throw Error('VIBE59_CYCLIC_DEPENDENCY');
  for(const item of ready){ordered.push(item);remaining.delete(item.id)}
 }
 const proof=ordered.map(t=>{
  const item=evidence&&typeof evidence==='object'?evidence[t.id]:null;
  const passed=Boolean(item&&item.runtimeVerified===true&&item.testsPassed===true&&item.ownerAcceptance===true);
  return {id:t.id,verified:passed,missing:passed?[]:['runtimeVerified','testsPassed','ownerAcceptance'].filter(k=>item?.[k]!==true)};
 });
 return Object.freeze({version:'5.9',authority:'planning-and-evidence-only',codeGenerated:false,runtimeVerified:proof.length>0&&proof.every(x=>x.verified),tasks:ordered,proof,capabilities:VIBE59_CAPABILITIES});
}
