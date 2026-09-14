const clean=value=>String(value??'').trim();
const uniq=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const TRACE_LIMIT=48;

const esc=value=>String(value??'').replace(/\\/g,'\\\\').replace(/"/g,'\\"');

async function criticalSnapshot(page){
  return page.evaluate(()=>{
    const clean=value=>String(value??'').replace(/\s+/g,' ').trim().toLowerCase();
    const uniq=values=>[...new Set(values.map(clean).filter(Boolean))];
    const attr=(el,names)=>{for(const name of names){const value=el?.getAttribute?.(name);if(value!==null&&value!==undefined&&String(value)!=='')return String(value);}return'';};
    const root=document.querySelector('[data-playable-cycle-contract]')||document.body;
    const seed=attr(root,['data-replay-seed','data-rng-seed','data-world-seed'])||attr(document.body,['data-replay-seed','data-rng-seed','data-world-seed'])||String(window.__GAME_REPLAY_SEED__??window.__GAME_SEED__??'');
    const values={};
    for(const id of ['ore','ingot','coins','factory','drones','zone','heat','score','hp','health','core','gold','wave','level','stage','day','wood','food','mana','pop','power','chapter','towers']){
      const el=document.getElementById(id),n=Number(el?.textContent??NaN);if(Number.isFinite(n))values[id]=n;
    }
    const enemyCount=[...document.querySelectorAll('.enemy,.foe,[data-enemy],[data-enemy-type]')].length;
    const towerCount=[...document.querySelectorAll('.tower,[data-tower],[data-tower-type]')].length;
    const areas=uniq([...document.querySelectorAll('[data-area],[data-zone],[data-region],[data-biome]')].map(el=>attr(el,['data-area','data-zone','data-region','data-biome'])));
    const objectives=uniq([...document.querySelectorAll('[data-objective],[data-goal],[data-quest],[data-mission]')].map(el=>attr(el,['data-objective','data-goal','data-quest','data-mission'])));
    const interactions=uniq([...document.querySelectorAll('[data-interactable],[data-interaction-target],[data-npc],[data-object-id],[data-world-entity]')].map(el=>{
      const id=attr(el,['data-interaction-target','data-object-id','data-npc','data-world-entity','data-interactable']);
      const state=['data-state','data-interaction-state','data-open','data-collected','data-active','data-hp','data-dialogue-state','data-quest-state'].map(name=>`${name}:${clean(el.getAttribute(name))}`).filter(x=>!x.endsWith(':')).join('|');
      return `${id}|${state}`;
    }));
    const player=document.querySelector('[data-player-x],[data-player-y],[data-player-z],[data-player]')||root;
    const num=name=>{const n=Number(player?.getAttribute?.(name));return Number.isFinite(n)?n:null;};
    const playerPosition={x:num('data-player-x')??num('data-world-x'),y:num('data-player-y')??num('data-world-y'),z:num('data-player-z')??num('data-world-z')};
    const routeId=attr(root,['data-route-id','data-path-node','data-path-id'])||attr(player,['data-route-id','data-path-node','data-path-id']);
    const runResult=clean(document.body?.getAttribute('data-run-result')||root?.getAttribute('data-run-result'));
    return {seed:clean(seed),values,enemyCount,towerCount,areas,objectives,interactions,playerPosition,routeId:clean(routeId),runResult};
  });
}

function positionChanged(before,after){
  for(const key of ['x','y','z']){const a=Number(before?.playerPosition?.[key]),b=Number(after?.playerPosition?.[key]);if(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)>0.0001)return true;}
  return false;
}
function deltaSignature(before,after){
  const keys=new Set([...Object.keys(before?.values||{}),...Object.keys(after?.values||{})]),values={};
  for(const key of keys){const a=Number(before?.values?.[key]),b=Number(after?.values?.[key]);if(Number.isFinite(a)&&Number.isFinite(b)&&a!==b)values[key]=Number((b-a).toFixed(3));}
  return JSON.stringify({values,enemyDelta:Number(after?.enemyCount||0)-Number(before?.enemyCount||0),towerDelta:Number(after?.towerCount||0)-Number(before?.towerCount||0),positionChanged:positionChanged(before,after),interactionChanged:JSON.stringify(before?.interactions||[])!==JSON.stringify(after?.interactions||[]),routeChanged:clean(before?.routeId)!==clean(after?.routeId),runResult:after?.runResult||''});
}

export function evaluateDeterministicReplayEvidence({usesRandomness=false,referenceSeed='',replaySeed='',expectedOutcomeSignatures=[],observedOutcomeSignatures=[],traceLength=0,executedCount=0}={}){
  const expected=(expectedOutcomeSignatures||[]).map(clean).filter(Boolean),observed=(observedOutcomeSignatures||[]).map(clean).filter(Boolean);
  const sameSeed=usesRandomness?Boolean(clean(referenceSeed))&&clean(referenceSeed)===clean(replaySeed):true;
  const sameInputTrace=Number(traceLength)>=3&&Number(executedCount)===Number(traceLength);
  const criticalStateMatch=sameInputTrace&&expected.length===observed.length&&expected.every((value,index)=>value===observed[index]);
  const pass=sameSeed&&sameInputTrace&&criticalStateMatch;
  let status='PASS';
  if(Number(traceLength)<3)status='INSUFFICIENT_REPLAY_TRACE';
  else if(usesRandomness&&!clean(referenceSeed))status='REPLAY_SEED_NOT_EXPOSED';
  else if(!sameSeed)status='SEED_REPLAY_NOT_REPRODUCED';
  else if(!sameInputTrace)status='INPUT_TRACE_REPLAY_FAILED';
  else if(!criticalStateMatch)status='CRITICAL_STATE_DIVERGED';
  return {required:true,pass,status,independentRun:true,sameSeed,sameInputTrace,criticalStateMatch,usesRandomness,referenceSeed:clean(referenceSeed)||null,replaySeed:clean(replaySeed)||null,traceLength:Number(traceLength)||0,executedCount:Number(executedCount)||0,comparedStateCount:Math.min(expected.length,observed.length)};
}

async function clickReplayAction(page,row,index){
  const selectors=[];
  if(clean(row?.scopeId))selectors.push(`[data-scope-id="${esc(row.scopeId)}"]`);
  if(clean(row?.mechanicId))selectors.push(`[data-mechanic-id="${esc(row.mechanicId)}"]`);
  let target=null;
  for(const selector of selectors){const locator=page.locator(selector).first();if(await locator.count()&&await locator.isVisible().catch(()=>false)){target=locator;break;}}
  if(!target&&clean(row?.label)){
    const locator=page.locator('[data-gameplay-action],button,[role="button"]').filter({hasText:clean(row.label)}).first();
    if(await locator.count()&&await locator.isVisible().catch(()=>false))target=locator;
  }
  if(!target)return null;
  const before=await criticalSnapshot(page);
  try{await target.click({timeout:2500});await page.waitForTimeout(90);}catch{return null;}
  const placement=page.locator('[data-placement-position],[data-build-slot],[data-tower-slot],[data-grid-x][data-grid-y]').filter({visible:true}).first();
  if(await placement.count()){
    try{await placement.click({timeout:1800});await page.waitForTimeout(90);}catch{}
  }else{
    const active=await page.locator('[data-placement-mode="active"],[data-build-mode="active"],body[data-placement-mode="active"]').count();
    if(active){const surface=page.locator('canvas,[data-gameplay-surface]').first();try{const box=await surface.boundingBox();if(box){await surface.click({position:{x:Math.max(1,box.width*(.25+(.1*(index%4)))),y:Math.max(1,box.height*.55)},timeout:1800});await page.waitForTimeout(90);}}catch{}}
  }
  const after=await criticalSnapshot(page);
  return {before,after,outcomeSignature:deltaSignature(before,after)};
}

export async function runDeterministicReplay({browser,url,referencePage,actionEvidence=[],usesRandomness=false,traceLimit=TRACE_LIMIT}={}){
  const trace=(actionEvidence||[]).filter(row=>clean(row?.mechanicId)||clean(row?.scopeId)||clean(row?.label)).slice(0,Math.max(3,Number(traceLimit)||TRACE_LIMIT));
  const referenceSeedView=referencePage?await criticalSnapshot(referencePage):{seed:''};
  const referenceSeed=clean(referenceSeedView.seed);
  if(trace.length<3)return evaluateDeterministicReplayEvidence({usesRandomness,referenceSeed,traceLength:trace.length,executedCount:0});
  if(usesRandomness&&!referenceSeed)return evaluateDeterministicReplayEvidence({usesRandomness,referenceSeed,traceLength:trace.length,executedCount:0});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const replayPage=await context.newPage();
  try{
    const replayUrl=new URL(url);
    replayUrl.searchParams.set('replayRegression','1');
    if(usesRandomness)replayUrl.searchParams.set('replaySeed',referenceSeed);
    await replayPage.goto(replayUrl.toString(),{waitUntil:'domcontentloaded',timeout:30000});
    await replayPage.waitForTimeout(300);
    const replaySeed=(await criticalSnapshot(replayPage)).seed;
    const observed=[];
    let executed=0;
    for(let i=0;i<trace.length;i++){
      const result=await clickReplayAction(replayPage,trace[i],i);if(!result)break;executed++;observed.push(result.outcomeSignature);
    }
    return evaluateDeterministicReplayEvidence({usesRandomness,referenceSeed,replaySeed,expectedOutcomeSignatures:trace.map(row=>row.outcomeSignature),observedOutcomeSignatures:observed,traceLength:trace.length,executedCount:executed});
  }catch(error){
    return {...evaluateDeterministicReplayEvidence({usesRandomness,referenceSeed,traceLength:trace.length,executedCount:0}),status:`REPLAY_RUNTIME_ERROR:${clean(error?.message||error).slice(0,180)}`};
  }finally{await context.close();}
}

export const DETERMINISTIC_REPLAY_TRACE_LIMIT=TRACE_LIMIT;
