// Vibe5.9: 109 deterministic Luau coding recipes; existing owner-approved server state only.
// Source-grounded candidate generation and offline scenario proofs are NOT Studio/runtime QA.
const GROUPS=[
 ['ai','patrol-advance:add,aggro-enter:near-on,aggro-exit:far-off,chase-tick:add,return-home:confirm-off,attack-cooldown:cooldown,attack-telegraph:confirm-on,stun-reduce:spend,flee-health:near-on,enrage-health:near-on,summon-budget:spend,boss-phase:milestone'],
 ['combat','health-damage:damage,health-heal:add,stamina-spend:spend,stamina-regen:add,mana-spend:spend,mana-regen:add,shield-absorb:spend,shield-restore:add,crit-charge:add,dodge-cooldown:cooldown,combo-stack:add,hit-confirm:confirm-on'],
 ['building','placed-count:add,removed-count:spend,wood-cost:spend,stone-cost:spend,repair-progress:add,blueprint-unlock:confirm-on,placement-ack:confirm-on,owner-ack:confirm-on,structure-damage:damage,construction-stage:milestone'],
 ['inventory','pickup:add,consume:spend,split-stack:transfer,merge-stack:transfer,equip-owned:has-on,unequip:off,stack-limit:add,repair-kit-use:spend,reload-ammo:add,sort-revision:add'],
 ['bestiary','sighting:add,discovery:confirm-on,confirmed-kill:confirm-add,confirmed-boss-kill:confirm-add,rare-discovery:confirm-on,research-progress:add,biome-seen:confirm-on,drop-observation:add'],
 ['saving','mark-dirty:on,clear-dirty:confirm-off,checkpoint:milestone,retry-budget:add,retry-spend:spend,sync-counter:add,version-milestone:milestone,save-lock:confirm-on,save-unlock:confirm-off,inflight-counter:add'],
 ['world','weather-step:add,day-timer:add,season-step:add,biome-unlock:confirm-on,hazard-damage:damage,temperature-decay:damage,region-discover:confirm-on,spawn-budget:spend,event-counter:add,fog-clear:confirm-on'],
 ['crafting','recipe-unlock:confirm-on,material-spend:spend,product-add:add,queue-advance:add,queue-decrement:spend,station-progress:add,fuel-use:spend,quality-progress:add,craft-experience:add,recipe-counter:add'],
 ['quests','accept-quest:confirm-on,objective-progress:add,kill-progress:confirm-add,item-progress:confirm-add,quest-finish:confirm-on,reward-confirm:confirm-on,fail-counter:add,journal-checkpoint:milestone,reputation-progress:add,daily-remaining:spend'],
 ['economy','earn-currency:add,spend-currency:spend,trade-transfer:transfer,shop-purchase:spend,shop-refund:add,tax-charge:spend,bounty-credit:confirm-add,discount-progress:damage,bid-milestone:milestone'],
 ['ui','notice-counter:add,tooltip-open:confirm-on,tooltip-close:confirm-off,marker-show:confirm-on,marker-hide:confirm-off,score-counter:add,hud-revision:add,tutorial-checkpoint:milestone']
];
export const VIBE59_LUAU_CODING_SKILLS_109=Object.freeze(GROUPS.flatMap(([system,rows])=>
 rows.split(',').map(row=>{const [id,kind]=row.split(':');return Object.freeze({
   id:system+'-'+id,system,kind,sourceScope:'existing-server-state-only',runtimeVerified:false});
 })));
const catalog=new Map(VIBE59_LUAU_CODING_SKILLS_109.map(x=>[x.id,x]));
const boolKinds=new Set(['near-on','far-off','confirm-on','confirm-off','on','off','has-on']);
const condKinds=new Set(['near-on','far-off','confirm-on','confirm-off','confirm-add','cooldown','has-on']);
const confirmKinds=new Set(['confirm-on','confirm-off','confirm-add']);
const amountKinds=new Set(['add','spend','damage','milestone','cooldown','transfer','confirm-add']);
const capKinds=new Set(['add','transfer','confirm-add']);
const banned=new Set(['__proto__','prototype','constructor','state','player','game','workspace',
 'script','local','function','return','if','then','else','end','nil','true','false','self']);
function identifier(x){
 if(typeof x!=='string'||!/^[A-Za-z_][A-Za-z0-9_]*$/.test(x)||banned.has(x))
  throw Error('VIBE59_SKILL_BAD_IDENTIFIER');
 return x;
}
function number(x){
 if(typeof x!=='number'||!Number.isFinite(x)||Math.abs(x)>1e9)
   throw Error('VIBE59_SKILL_BAD_NUMBER');
 return x;
}
function parse(spec){
 const skill=catalog.get(spec?.operation);
 if(!skill)throw Error('VIBE59_SKILL_UNKNOWN_OPERATION');
 // Reject unsafe numeric work orders even when the chosen skill does not use
 // that optional field; otherwise malformed parameters silently pass the oracle.
 for(const key of ['amount','cap','threshold']){
  if(spec[key]!==undefined)number(spec[key]);
 }
 const kind=skill.kind,collection=identifier(spec.collection),field=identifier(spec.field);
 const conditionField=condKinds.has(kind)?identifier(spec.conditionField):null;
 const toField=kind==='transfer'?identifier(spec.toField):null;
 if((conditionField&&conditionField===field)||(toField&&(toField===field||toField===conditionField)))
   throw Error('VIBE59_SKILL_FIELD_COLLISION');
 const amount=amountKinds.has(kind)?number(spec.amount):null;
 const cap=capKinds.has(kind)?number(spec.cap):null;
 const threshold=['near-on','far-off'].includes(kind)?number(spec.threshold):null;
 if(amount!==null&&amount<=0||cap!==null&&cap<=0||threshold!==null&&threshold<0)
   throw Error('VIBE59_SKILL_NUMBER_RANGE');
 return {skill,kind,collection,field,conditionField,toField,amount,cap,threshold,
   functionName:identifier(spec.functionName)};
}
function emit(p){
 const base='state.'+p.collection,f=base+'.'+p.field,c=p.conditionField?base+'.'+p.conditionField:null;
 const to=p.toField?base+'.'+p.toField:null,k=p.kind;
 const lines=['-- Vibe5.9 skill: '+p.skill.id,
   'if type(state) ~= "table" then return false end',
   'if type('+base+') ~= "table" then return false end',
   'if type('+f+') ~= "'+(boolKinds.has(k)?'boolean':'number')+'" then return false end'];
 if(c)lines.push('if type('+c+') ~= "'+(confirmKinds.has(k)?'boolean':'number')+'" then return false end');
 if(to)lines.push('if type('+to+') ~= "number" then return false end');
 if(!boolKinds.has(k))lines.push('if '+f+' ~= '+f+' or '+f+' == math.huge or '+f+' == -math.huge then return false end');
 if(c&&!confirmKinds.has(k))lines.push('if '+c+' ~= '+c+' or '+c+' == math.huge or '+c+' == -math.huge then return false end');
 if(to)lines.push('if '+to+' ~= '+to+' or '+to+' == math.huge or '+to+' == -math.huge then return false end');
 let guard,actions;
 switch(k){
  case 'add':guard=f+' >= 0 and '+f+' < '+p.cap;
    actions=[f+' = math.min('+p.cap+', '+f+' + '+p.amount+')'];break;
  case 'spend':guard=f+' >= '+p.amount;actions=[f+' = '+f+' - '+p.amount];break;
  case 'damage':guard=f+' > 0';actions=[f+' = math.max(0, '+f+' - '+p.amount+')'];break;
  case 'milestone':guard=f+' < '+p.amount;actions=[f+' = '+p.amount];break;
  case 'cooldown':guard=c+' >= '+f;actions=[f+' = '+c+' + '+p.amount];break;
  case 'confirm-add':guard=c+' and '+f+' >= 0 and '+f+' < '+p.cap;
    actions=[f+' = math.min('+p.cap+', '+f+' + '+p.amount+')'];break;
  case 'confirm-on':guard=c+' and not '+f;actions=[f+' = true'];break;
  case 'confirm-off':guard=c+' and '+f;actions=[f+' = false'];break;
  case 'on':guard='not '+f;actions=[f+' = true'];break;
  case 'off':guard=f;actions=[f+' = false'];break;
  case 'has-on':guard=c+' > 0 and not '+f;actions=[f+' = true'];break;
  case 'near-on':guard=c+' <= '+p.threshold+' and not '+f;actions=[f+' = true'];break;
  case 'far-off':guard=c+' > '+p.threshold+' and '+f;actions=[f+' = false'];break;
  case 'transfer':guard=f+' >= '+p.amount+' and '+to+' >= 0 and '+to+' + '+p.amount+' <= '+p.cap;
    actions=[f+' = '+f+' - '+p.amount,to+' = '+to+' + '+p.amount];break;
  default:throw Error('VIBE59_SKILL_UNKNOWN_KIND');
 }
 lines.push('if not ('+guard+') then return false end',...actions,'return true');
 return lines.join('\n');
}
function nonCodeMasked(text){
 let out='',i=0;const blank=c=>c==='\n'||c==='\r'?c:' ';
 while(i<text.length){
  const c=text[i],next=text[i+1];
  if(c==='"'||c==="'"){
   const q=c;out+=' ';i++;
   while(i<text.length){const v=text[i++];out+=blank(v);
    if(v==='\\'&&i<text.length){out+=blank(text[i++]);continue}
    if(v===q)break}
  }else if(c==='-'&&next==='-'){
   const open=/^\[(=*)\[/.exec(text.slice(i+2,i+16));
   if(open){const terminator=']'+open[1]+']',end=text.indexOf(terminator,i+2+open[0].length);
    const until=end<0?text.length:end+terminator.length;while(i<until)out+=blank(text[i++]);
   }else{while(i<text.length&&text[i]!=='\n')out+=blank(text[i++])}
  }else if(c==='['){
   const open=/^\[(=*)\[/.exec(text.slice(i,i+16));
   if(open){const terminator=']'+open[1]+']',end=text.indexOf(terminator,i+open[0].length);
    const until=end<0?text.length:end+terminator.length;while(i<until)out+=blank(text[i++]);
   }else{out+=c;i++}
  }else{out+=c;i++}
 }
 return out;
}
function verifyScope(p,{source,replaceAnchor,sourcePath}){
 if(typeof sourcePath!=='string'||!(
  /(?:^|\/)(?:server|ServerScriptService|ServerStorage)\//i.test(sourcePath)
  ||/\.server\.lua(?:u)?$/i.test(sourcePath))||!/\.(?:lua|luau)$/i.test(sourcePath))
   throw Error('VIBE59_SKILL_SERVER_ONLY');
 if(typeof source!=='string'||source.length>260000||typeof replaceAnchor!=='string'
  ||!replaceAnchor||replaceAnchor.length>1024||source.split(replaceAnchor).length!==2)
  throw Error('VIBE59_SKILL_UNIQUE_ANCHOR');
 const prefix=nonCodeMasked(source.slice(0,source.indexOf(replaceAnchor)));
 const func=new RegExp('(?:^|\\n)\\s*(?:local\\s+)?function\\s+'+p.functionName+'\\s*\\(','g');
 const definitions=[...prefix.matchAll(func)];
 if(!definitions.length)throw Error('VIBE59_SKILL_EXISTING_FUNCTION');
 const body=prefix.slice(definitions.at(-1).index);
 if(!/(?:^|[\n;])\s*(?:local\s+)?state\s*=/.test(body))
  throw Error('VIBE59_SKILL_EXISTING_STATE');
 for(const field of [p.field,p.conditionField,p.toField].filter(Boolean))
  if(!new RegExp('\\bstate\\.'+p.collection+'\\.'+field+'\\b').test(body))
   throw Error('VIBE59_SKILL_EXISTING_FIELD:'+field);
}
export function synthesizeVibe59LuauSkill({spec={},source='',replaceAnchor='',sourcePath=''}={}){
 const p=parse(spec);verifyScope(p,{source,replaceAnchor,sourcePath});
 return Object.freeze({source:emit(p),operation:p.skill.id,system:p.skill.system,
  safety:{existingFunction:true,existingFields:true,serverOnly:true,
   noNewSaveKeys:true,noNewAssets:true,studioRuntimeVerified:false},
  sourceWrite:false,modelUsed:false,runtimeVerified:false});
}
function copyState(value,collection){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('VIBE59_SKILL_SCENARIO_OBJECT');
 const json=JSON.stringify(value);if(!json||json.length>12000)throw Error('VIBE59_SKILL_SCENARIO_SIZE');
 const result=JSON.parse(json),obj=result[collection];
 if(!obj||typeof obj!=='object'||Array.isArray(obj)||Object.values(obj).some(v=>
  typeof v!=='boolean'&&!(typeof v==='number'&&Number.isFinite(v))))
  throw Error('VIBE59_SKILL_SCENARIO_FIELDS');
 return result;
}
function oracleStep(p,state){
 const obj=state[p.collection],v=obj[p.field],c=obj[p.conditionField],to=obj[p.toField],k=p.kind;
 if(typeof v!==(boolKinds.has(k)?'boolean':'number')||typeof v==='number'&&!Number.isFinite(v))
  return false;
 if(p.conditionField&&(typeof c!==(confirmKinds.has(k)?'boolean':'number')
  ||typeof c==='number'&&!Number.isFinite(c)))return false;
 if(p.toField&&(typeof to!=='number'||!Number.isFinite(to)))return false;
 switch(k){
  case 'add':if(v<0||v>=p.cap)return false;obj[p.field]=Math.min(p.cap,v+p.amount);break;
  case 'spend':if(v<p.amount)return false;obj[p.field]=v-p.amount;break;
  case 'damage':if(v<=0)return false;obj[p.field]=Math.max(0,v-p.amount);break;
  case 'milestone':if(v>=p.amount)return false;obj[p.field]=p.amount;break;
  case 'cooldown':if(c<v)return false;obj[p.field]=c+p.amount;break;
  case 'confirm-add':if(!c||v<0||v>=p.cap)return false;obj[p.field]=Math.min(p.cap,v+p.amount);break;
  case 'confirm-on':if(!c||v)return false;obj[p.field]=true;break;
  case 'confirm-off':if(!c||!v)return false;obj[p.field]=false;break;
  case 'on':if(v)return false;obj[p.field]=true;break;
  case 'off':if(!v)return false;obj[p.field]=false;break;
  case 'has-on':if(c<=0||v)return false;obj[p.field]=true;break;
  case 'near-on':if(c>p.threshold||v)return false;obj[p.field]=true;break;
  case 'far-off':if(c<=p.threshold||!v)return false;obj[p.field]=false;break;
  case 'transfer':if(v<p.amount||to<0||to+p.amount>p.cap)return false;
   obj[p.field]=v-p.amount;obj[p.toField]=to+p.amount;break;
  default:throw Error('VIBE59_SKILL_UNKNOWN_KIND');
 }
 return true;
}
export function verifyVibe59LuauSkillScenarios({spec={},scenarios=[]}={}){
 const p=parse(spec);
 if(!Array.isArray(scenarios)||scenarios.length<2||scenarios.length>16)
  throw Error('VIBE59_SKILL_POSITIVE_NEGATIVE_SCENARIOS_REQUIRED');
 let positive=0,negative=0;
 const cases=scenarios.map((row,index)=>{
  if(typeof row?.expectedApplied!=='boolean')throw Error('VIBE59_SKILL_EXPECTATION:'+index);
  const state=copyState(row.initialState,p.collection),expected=copyState(row.expectedState,p.collection);
  const applied=oracleStep(p,state);
  if(row.expectedApplied)positive++;else negative++;
  return {name:String(row.name??index).slice(0,60),
   pass:applied===row.expectedApplied&&JSON.stringify(state)===JSON.stringify(expected),applied};
 });
 if(!positive||!negative)throw Error('VIBE59_SKILL_BOTH_BOUNDARIES_REQUIRED');
 return Object.freeze({pass:cases.every(x=>x.pass),cases,modelUsed:false,
  sourceWrite:false,runtimeVerified:false,authority:'offline-skill-scenario-oracle'});
}
