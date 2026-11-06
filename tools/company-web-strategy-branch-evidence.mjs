const clean=value=>String(value??'').trim();
const STRATEGY_PATTERN=/(?:tower|turret|place|build|deploy|upgrade|skill|weapon|route|choice|strategy|loadout|stance|tactic|spell|unit|타워|배치|건설|강화|스킬|무기|경로|선택|전략|전술)/i;
const esc=value=>String(value??'').replace(/\\/g,'\\\\').replace(/"/g,'\\"');

async function branchSnapshot(page){
  return page.evaluate(()=>{
    const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)>0;};
    const values={};for(const id of ['hp','health','core','score','wave','gold','coins','resource','res','level','stage','power','ore','ingot','wood','food','mana']){const el=document.getElementById(id),n=Number(el?.textContent??NaN);if(Number.isFinite(n))values[id]=n;}
    const enemies=[...document.querySelectorAll('.enemy,.foe,[data-enemy],[data-enemy-type]')].filter(visible);
    const root=document.querySelector('[data-playable-cycle-contract]')||document.body;
    const runResult=String(document.body?.getAttribute('data-run-result')||root?.getAttribute('data-run-result')||'').trim().toLowerCase();
    return{values,enemyCount:enemies.length,runResult};
  });
}
function combatSignature(view={}){
  const values={};for(const key of ['hp','health','core','score','wave','gold','coins','resource','res','level','stage','power']){const n=Number(view?.values?.[key]);if(Number.isFinite(n))values[key]=n;}
  return JSON.stringify({values,enemyCount:Number(view?.enemyCount||0),runResult:clean(view?.runResult).toLowerCase()});
}
function distinctRows(rows=[]){const seen=new Set(),out=[];for(const row of rows){const mechanic=clean(row?.mechanicId);if(!mechanic||seen.has(mechanic))continue;seen.add(mechanic);out.push(row);}return out;}
export function strategyCandidateRows(actionEvidence=[],declaredChoices=[]){
  const declared=new Set((declaredChoices||[]).map(clean).filter(Boolean));
  const rows=distinctRows(actionEvidence).filter(row=>declared.has(clean(row?.mechanicId))||STRATEGY_PATTERN.test(`${row?.mechanicId||''} ${row?.label||''}`));
  return rows.slice(0,6);
}
export function evaluateIndependentStrategyEvidence({required=false,branches=[]}={}){
  if(required!==true)return{required:false,pass:true,status:'NOT_APPLICABLE',independentContexts:0,choiceCount:0,outcomeCount:0,branches:[]};
  const completed=(branches||[]).filter(row=>row?.executed===true&&clean(row?.choiceMechanic));
  const choices=new Set(completed.map(row=>clean(row.choiceMechanic))),outcomes=new Set(completed.map(row=>clean(row.combatOutcomeSignature)).filter(Boolean));
  const pass=choices.size>=2&&outcomes.size>=2;
  let status='PASS';if(choices.size<2)status='INSUFFICIENT_DISTINCT_STRATEGY_CHOICES';else if(outcomes.size<2)status='STRATEGY_BRANCH_OUTCOMES_NOT_DIVERGENT';
  return{required:true,pass,status,independentContexts:completed.length,choiceCount:choices.size,outcomeCount:outcomes.size,branches:completed.map(row=>({choiceMechanic:row.choiceMechanic,executed:true,followupExecuted:Number(row.followupExecuted||0),combatOutcomeSignature:row.combatOutcomeSignature}))};
}
async function clickMechanic(page,row,index=0){
  const mechanic=clean(row?.mechanicId);if(!mechanic)return false;
  const target=page.locator(`[data-mechanic-id="${esc(mechanic)}"]`).first();if(!await target.count()||!await target.isVisible().catch(()=>false))return false;
  try{await target.click({timeout:2500});await page.waitForTimeout(100);}catch{return false;}
  if(row?.placementFollowupRequired===true){
    const placements=page.locator('[data-placement-position],[data-build-slot],[data-tower-slot],[data-grid-x][data-grid-y]'),count=await placements.count();let picked=false;
    for(let i=0;i<count;i++){const candidate=placements.nth((Math.abs(Number(row?.placementIndex??index))+i)%Math.max(1,count));if(await candidate.isVisible().catch(()=>false)){try{await candidate.click({timeout:1800});await page.waitForTimeout(100);picked=true;break;}catch{}}}
    if(!picked){const surface=page.locator('canvas,[data-gameplay-surface]').first();try{const box=await surface.boundingBox();if(box){await surface.click({position:{x:Math.max(1,box.width*.35),y:Math.max(1,box.height*.55)},timeout:1800});await page.waitForTimeout(100);}}catch{}}
  }
  return true;
}
export async function runIndependentStrategyBranches({browser,url,actionEvidence=[],declaredChoices=[],required=false,followupLimit=8}={}){
  if(required!==true)return evaluateIndependentStrategyEvidence({required:false});
  const candidates=strategyCandidateRows(actionEvidence,declaredChoices);if(candidates.length<2)return evaluateIndependentStrategyEvidence({required:true,branches:[]});
  const candidateMechanics=new Set(candidates.map(row=>clean(row.mechanicId))),commonTrace=distinctRows(actionEvidence).filter(row=>!candidateMechanics.has(clean(row.mechanicId))).slice(0,Math.max(2,Number(followupLimit)||8));
  const branches=await Promise.all(candidates.slice(0,2).map(async(candidate,index)=>{
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage();
    try{
      const branchUrl=new URL(url);branchUrl.searchParams.set('strategyBranch',clean(candidate.mechanicId));await page.goto(branchUrl.toString(),{waitUntil:'domcontentloaded',timeout:30000});await page.waitForTimeout(300);
      const executed=await clickMechanic(page,candidate,index);let followupExecuted=0;
      if(executed){for(const row of commonTrace){if(await clickMechanic(page,row,followupExecuted))followupExecuted++;}}
      const outcome=await branchSnapshot(page);return{choiceMechanic:clean(candidate.mechanicId),executed,followupExecuted,combatOutcomeSignature:combatSignature(outcome)};
    }catch{return{choiceMechanic:clean(candidate.mechanicId),executed:false,followupExecuted:0,combatOutcomeSignature:''};}
    finally{await context.close();}
  }));
  return evaluateIndependentStrategyEvidence({required:true,branches});
}
