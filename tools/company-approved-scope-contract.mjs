import crypto from 'node:crypto';

const clean=value=>String(value??'').trim().replace(/\s+/g,' ');
const slug=value=>clean(value).toLowerCase().replace(/[^a-z0-9가-힣]+/g,'-').replace(/^-+|-+$/g,'').slice(0,42)||'scope';
const gameplayKey=/^(coreFun|coreLoop|mobileUx|mechanics?|systems?|features?|contentScope|progression|combat|economy|quests?|levels?|modes?|story|world|bosses?|enemies?|items?|skills?|characters?|objectives?|stages?|waves?)$/i;
const excludedKey=/market|reference|audience|sessionDirection|steamExpansion|multiplayerExpansion|platformSelection|targetPlatform|evidence|score|review|identity/i;

function pushItem(items,seen,{path,text}){
  const value=clean(text);
  if(!value)return;
  const fingerprint=`${path}|${value}`;
  if(seen.has(fingerprint))return;
  seen.add(fingerprint);
  const digest=crypto.createHash('sha256').update(fingerprint).digest('hex').slice(0,10);
  items.push({id:`scope-${slug(path)}-${digest}`,path,label:value.slice(0,180),required:true,status:'APPROVED'});
}

function walkGameplay(value,path,items,seen,depth=0){
  if(depth>5||value===null||value===undefined)return;
  if(typeof value==='string'||typeof value==='number'||typeof value==='boolean'){
    pushItem(items,seen,{path,text:value});return;
  }
  if(Array.isArray(value)){
    value.forEach((entry,index)=>walkGameplay(entry,`${path}[${index}]`,items,seen,depth+1));return;
  }
  if(typeof value!=='object')return;
  for(const [key,entry] of Object.entries(value)){
    if(excludedKey.test(key))continue;
    if(gameplayKey.test(key))walkGameplay(entry,path?`${path}.${key}`:key,items,seen,depth+1);
    else if(depth>0&&typeof entry==='object'&&entry!==null)walkGameplay(entry,path?`${path}.${key}`:key,items,seen,depth+1);
  }
}

export function deriveApprovedScopeInventory(baseline={}){
  const content=baseline?.content&&typeof baseline.content==='object'?baseline.content:baseline;
  const items=[],seen=new Set();
  if(clean(content?.coreFun))pushItem(items,seen,{path:'coreFun',text:content.coreFun});
  if(Array.isArray(content?.coreLoop))content.coreLoop.forEach((entry,index)=>pushItem(items,seen,{path:`coreLoop[${index}]`,text:entry}));
  for(const [key,value] of Object.entries(content||{})){
    if(key==='coreFun'||key==='coreLoop'||excludedKey.test(key)||!gameplayKey.test(key))continue;
    walkGameplay(value,key,items,seen,0);
  }
  if(items.length===0)pushItem(items,seen,{path:'coreGameplay',text:'approved core gameplay loop'});
  return items.slice(0,80);
}

export function staticApprovedScopeCoverage(html,inventory=[]){
  const text=String(html??'');
  const blockers=[];
  const declared=Number(text.match(/data-approved-scope-count=["'](\d+)["']/i)?.[1]??-1);
  if(declared!==inventory.length)blockers.push(`APPROVED_SCOPE_COUNT_MISMATCH:${declared}:${inventory.length}`);
  for(const item of inventory){
    const escaped=item.id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const marker=new RegExp(`data-scope-id=["']${escaped}["']`,'i');
    if(!marker.test(text))blockers.push(`APPROVED_SCOPE_ITEM_MISSING:${item.id}`);
  }
  return {pass:blockers.length===0,requiredCount:inventory.length,blockers};
}

export function runtimeApprovedScopeCoverage({declaredCount=0,visibleScopeIds=[],interactedScopeIds=[]}={}){
  const visible=[...new Set((visibleScopeIds||[]).map(clean).filter(Boolean))];
  const interacted=[...new Set((interactedScopeIds||[]).map(clean).filter(Boolean))];
  const blockers=[];
  if(Number(declaredCount)<=0)blockers.push('APPROVED_SCOPE_DECLARATION_REQUIRED');
  if(visible.length!==Number(declaredCount))blockers.push(`APPROVED_SCOPE_VISIBLE_COUNT_MISMATCH:${visible.length}:${declaredCount}`);
  const missingInteraction=visible.filter(id=>!interacted.includes(id));
  if(missingInteraction.length)blockers.push(`APPROVED_SCOPE_NOT_INTERACTED:${missingInteraction.join(',')}`);
  return {pass:blockers.length===0,declaredCount:Number(declaredCount)||0,visibleScopeIds:visible,interactedScopeIds:interacted,blockers};
}
