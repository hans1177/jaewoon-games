// Transactional system integration for combat, inventory, quests and world state.
// Existing authoritative services own persistence; this module only coordinates commands.
const copy=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
export function makeCommandRouter({authorize,handlers={},maxRecent=2048}={}){
 if(typeof authorize!=='function')throw Error('authorization callback required');
 const recent=new Map(),observers=new Map();
 return{
  on(type,fn){const fns=observers.get(type)||new Set();fns.add(fn);observers.set(type,fns);return()=>fns.delete(fn);},
  async execute(command,context={}){
   if(!command||typeof command.id!=='string'||!command.id||!command.type||!command.actorId)return{ok:false,reason:'MALFORMED'};
   if(recent.has(command.id))return recent.get(command.id);
   if(!await authorize(command,context))return{ok:false,reason:'UNAUTHORIZED'};
   const handler=handlers[command.type];if(typeof handler!=='function')return{ok:false,reason:'UNKNOWN_COMMAND'};
   let result;
   try{result=await handler(command,context);}catch(error){return{ok:false,reason:'HANDLER_ERROR',message:String(error.message||error)};}
   if(!result||result.ok!==true)return{ok:false,reason:result?.reason||'REJECTED'};
   const accepted={ok:true,id:command.id,value:result.value??null};
   recent.set(command.id,accepted);
   while(recent.size>maxRecent)recent.delete(recent.keys().next().value);
   for(const listener of observers.get(command.type)||[])await listener(accepted,command);
   return accepted;
  },
  clear(){recent.clear();observers.clear();}
 };
}
export function makeTransactionCoordinator({capture,restore,validate}={}){
 if(typeof capture!=='function'||typeof restore!=='function')throw Error('transaction snapshots required');
 let locked=false;
 return{
  async run(steps,context){
   if(locked)return{ok:false,reason:'BUSY'};
   locked=true;const snapshot=await capture(context),results=[];
   try{
    for(const step of steps){
     const result=await step(context);
     if(!result||result.ok!==true)throw Error(result?.reason||'STEP_FAILED');
     results.push(result);
    }
    if(validate&&!await validate(context))throw Error('INVARIANT_FAILED');
    return{ok:true,results};
   }catch(error){
    try{await restore(snapshot,context);}catch(restoreError){return{ok:false,reason:'ROLLBACK_FAILED',error:String(error),restoreError:String(restoreError)};}
    return{ok:false,reason:'ROLLED_BACK',error:String(error)};
   }finally{locked=false;}
  }
 };
}
export function makeEventJournal({capacity=4096}={}){
 const events=[],ids=new Set();
 return{
  append(event){
   if(!event?.id||!event?.type||!Number.isFinite(event.tick)||ids.has(event.id))return false;
   events.push(copy(event));ids.add(event.id);
   while(events.length>capacity){const old=events.shift();ids.delete(old.id);}
   return true;
  },
  since(tick){return events.filter(e=>e.tick>tick).map(copy);},
  replay(reducer,state,{fromTick=-Infinity,toTick=Infinity}={}){
   let current=copy(state);
   for(const event of events)if(event.tick>=fromTick&&event.tick<=toTick)current=reducer(current,copy(event));
   return current;
  },
  snapshot(){return events.map(copy);}
 };
}
export function makeStateInvariantGuard({checks=[]}={}){
 return{
  check(state){
   const errors=[];
   for(const rule of checks){
    try{const outcome=rule.check(state);if(outcome!==true)errors.push({id:rule.id,reason:typeof outcome==='string'?outcome:'FAILED'});}
    catch(error){errors.push({id:rule.id,reason:String(error.message||error)});}
   }
   return{ok:errors.length===0,errors};
  }
 };
}
export function makeInventoryLedger({capacity=100,stackLimit=99}={}){
 const items=new Map();
 return{
  add(id,quantity=1){
   if(!id||!Number.isInteger(quantity)||quantity<=0)return false;
   const total=[...items.values()].reduce((a,b)=>a+b,0);
   if(total+quantity>capacity||(items.get(id)||0)+quantity>stackLimit)return false;
   items.set(id,(items.get(id)||0)+quantity);return true;
  },
  remove(id,quantity=1){if(!Number.isInteger(quantity)||quantity<=0||(items.get(id)||0)<quantity)return false;const next=items.get(id)-quantity;if(next)items.set(id,next);else items.delete(id);return true;},
  count(id){return items.get(id)||0;},
  snapshot(){return Object.fromEntries(items);},
  restore(data){items.clear();for(const [id,n] of Object.entries(data||{}))if(Number.isInteger(n)&&n>0&&n<=stackLimit)items.set(id,n);}
 };
}
export function makeQuestTracker({definitions=[]}={}){
 const quests=new Map(definitions.map(q=>[q.id,{...q,progress:0,completed:false}]));
 return{
  record(type,amount=1){
   const changed=[];
   for(const q of quests.values()){
    if(q.completed||q.event!==type)continue;
    q.progress=Math.min(q.target,q.progress+amount);
    if(q.progress>=q.target)q.completed=true;
    changed.push({id:q.id,progress:q.progress,completed:q.completed});
   }
   return changed;
  },
  get(id){const q=quests.get(id);return q?{...q}:null;},
  snapshot(){return[...quests.values()].map(q=>({...q}));}
 };
}
export function makeCausalTrace({limit=500}={}){
 const spans=[];
 return{
  begin({id,parentId=null,type,time}){if(!id||spans.some(s=>s.id===id))return false;spans.push({id,parentId,type,start:time,end:null,outcome:'RUNNING'});if(spans.length>limit)spans.shift();return true;},
  end(id,{time,outcome}){const span=spans.find(s=>s.id===id);if(!span||span.end!==null)return false;span.end=time;span.outcome=outcome;return true;},
  chain(id){const out=[],seen=new Set();let row=spans.find(s=>s.id===id);while(row&&!seen.has(row.id)){out.unshift({...row});seen.add(row.id);row=spans.find(s=>s.id===row.parentId);}return out;},
  snapshot(){return spans.map(s=>({...s}));}
 };
}
export function makeRevisionedState({initial={},revision=0}={}){
 let state=copy(initial),version=revision;
 return{
  read(){return{revision:version,state:copy(state)};},
  commit({expectedRevision,update}){
   if(expectedRevision!==version)return{ok:false,reason:'REVISION_CONFLICT',actualRevision:version};
   const next=copy(state);
   const outcome=update(next);
   if(outcome===false)return{ok:false,reason:'REJECTED'};
   state=next;version++;return{ok:true,revision:version};
  }
 };
}
export function makeNetworkAuthorityGate({resolveOwner,allowedCommands=[]}={}){
 const allow=new Set(allowedCommands);
 return(command,context)=>{
  if(!command||!allow.has(command.type)||!context?.authenticatedPlayerId)return false;
  return resolveOwner(command.actorId)===context.authenticatedPlayerId;
 };
}
export function makeCrossSystemScenario({router,assertions=[]}={}){
 return{
  async run({commands,context}){
   const results=[];
   for(const command of commands){const outcome=await router.execute(command,context);results.push(outcome);if(!outcome.ok)return{ok:false,stage:'COMMAND',results};}
   for(const assertion of assertions){if(!await assertion(context))return{ok:false,stage:'INVARIANT',results};}
   return{ok:true,results};
  }
 };
}
