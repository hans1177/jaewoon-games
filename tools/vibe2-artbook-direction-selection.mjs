import fs from 'node:fs';
import path from 'node:path';

const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const date=clean(process.env.ARTBOOK_DATE),gameId=clean(process.env.ARTBOOK_GAME_ID);
if(!date||!gameId)throw new Error('ARTBOOK_DATE/GAME_ID missing for planning direction selection');

const workOrderPath=`artbook-work-orders/${date}-${gameId}.json`;
const workOrder=readJson(workOrderPath,null);
if(!workOrder)throw new Error(`work order missing: ${workOrderPath}`);
const draftPath=clean(workOrder.vibe2FirstDraftPath)||path.join('artbook-submissions',gameId,date,'vibe2-first-draft.json');
const draft=readJson(draftPath,null);
if(!draft)throw new Error(`Vibe2 first draft missing: ${draftPath}`);

const ids=['A','B','C'];
const directions=(Array.isArray(draft.creativeDirections)?draft.creativeDirections:Array.isArray(draft.storySpine?.creativeDirections)?draft.storySpine.creativeDirections:[])
  .slice(0,3)
  .map((row,index)=>({id:ids[index],focus:clean(row?.focus),playerExperience:clean(row?.playerExperience),signatureMoment:clean(row?.signatureMoment)}));
if(directions.length!==3||directions.some(row=>!row.focus||!row.playerExperience||!row.signatureMoment))throw new Error('creative directions A/B/C are incomplete');

const gameName=clean(draft.gameFactPack?.gameName||workOrder.gameName||gameId);
const terms=(Array.isArray(draft.gameFactPack?.gameSpecificTerms)?draft.gameFactPack.gameSpecificTerms:[]).map(clean).filter(Boolean).slice(0,12);
const model=clean(process.env.ARTBOOK_LOCAL_MODEL||'qwen3:0.6b');
const allowedChoices=new Set(['A','B','C','A+B','A+C','B+C']);
function normalizeChoice(value){
  const parts=clean(value).toUpperCase().replace(/\s+/g,'').split('+').filter(Boolean);
  const unique=[...new Set(parts.filter(x=>ids.includes(x)))].sort((a,b)=>ids.indexOf(a)-ids.indexOf(b));
  if(unique.length<1||unique.length>2)return'';
  const out=unique.join('+');
  return allowedChoices.has(out)?out:'';
}
function textOf(row){return `${row.focus} ${row.playerExperience} ${row.signatureMoment}`.toLowerCase();}
function fallbackSelection(reason){
  const scored=directions.map(row=>{
    const text=textOf(row);
    const matched=terms.filter(term=>text.includes(term.toLowerCase()));
    return {row,score:matched.length,matched};
  }).sort((a,b)=>b.score-a.score||ids.indexOf(a.row.id)-ids.indexOf(b.row.id));
  const best=scored[0];
  const anchor=best.matched.slice(0,2).join('·')||terms[0]||gameName;
  return {choice:best.row.id,reason:`${best.row.id} 방향이 ${anchor} 근거를 가장 직접적으로 살려 5개 부서의 공통 기준으로 쓰기 적합하다.`,fallbackUsed:true,fallbackReason:clean(reason||'planning selector fallback')};
}

const selectionSchema={
  type:'object',required:['choice','reason'],additionalProperties:false,
  properties:{choice:{type:'string',enum:[...allowedChoices]},reason:{type:'string',minLength:16,maxLength:140}}
};
async function selectDirection(){
  try{
    const system='/no_think\n너는 재운컴퍼니 기획부의 초안 방향 선택 담당이다. Vibe2가 만든 A/B/C 세 방향 중 하나를 선택하거나 최대 두 개만 혼합한다. 새 세계관이나 새 기능을 창작하지 않는다. 실제 게임 고유 용어와 현재 플레이 동기에 가장 잘 맞고, 그래픽·개발·QA·밸런스가 같은 기준으로 구체화하기 쉬운 방향을 고른다. 다른 게임에도 그대로 적용될 일반론은 피한다. choice는 A, B, C, A+B, A+C, B+C 중 하나만 쓴다. 짧은 한국어 JSON만 출력한다.';
    const payload={gameId,gameName,gameSpecificTerms:terms,playerMotivation:clean(draft.playerMotivation),centralConflict:clean(draft.centralConflict),directions};
    const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,think:false,format:selectionSchema,messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(payload)}],options:{temperature:0.08,seed:9209,num_ctx:2048,num_predict:180}})});
    if(!response.ok)throw new Error(`ollama ${response.status}: ${await response.text()}`);
    const packet=await response.json(),raw=clean(packet?.message?.content).replace(/^```json\s*/i,'').replace(/```$/,'');
    const parsed=JSON.parse(raw),choice=normalizeChoice(parsed.choice),reason=clean(parsed.reason);
    if(!choice||reason.length<16)throw new Error('planning selector output invalid');
    return {choice,reason,fallbackUsed:false,fallbackReason:null};
  }catch(error){
    console.error(`ARTBOOK_DIRECTION_SELECTOR_FALLBACK=${clean(error?.message)}`);
    return fallbackSelection(error?.message);
  }
}

const picked=await selectDirection();
const selectedIds=picked.choice.split('+');
const selected=selectedIds.map(id=>directions.find(row=>row.id===id)).filter(Boolean);
const selection={
  version:1,status:'SELECTED',gameId,date,choice:picked.choice,selectedDirectionIds:selectedIds,
  focus:selected.map(row=>row.focus).join(' + '),
  playerExperience:selected.map(row=>row.playerExperience).join(' + '),
  signatureMoment:selected.map(row=>row.signatureMoment).join(' + '),
  reason:picked.reason,
  selectedBy:picked.fallbackUsed?'planning-deterministic-fallback':'planning-local-open-model',
  model:picked.fallbackUsed?null:model,localInference:true,paidApi:false,apiKeyRequired:false,
  fallbackUsed:picked.fallbackUsed,fallbackReason:picked.fallbackReason
};

const sharedInstruction=`[PLANNING_DIRECTION:${selection.choice}] 기획부 선행 방향 확정: ${selection.focus} 대표 장면: ${selection.signatureMoment} 선택 이유: ${selection.reason} 모든 부서는 이 방향을 공통 기준으로 삼아 자기 전문 범위에서 구체화한다. A/B/C를 다시 고르거나 다른 방향으로 교체하지 않는다.`;
workOrder.version=Math.max(14,Number(workOrder.version)||0);
workOrder.planningDirectionSelection=selection;
workOrder.vibe2FirstDraft={...(workOrder.vibe2FirstDraft||{}),planningDirectionSelection:selection};
workOrder.departmentTasks=workOrder.departmentTasks||{};
for(const role of ['planning','graphics','development','qa','balance']){
  workOrder.departmentTasks[role]=workOrder.departmentTasks[role]||{};
  const existing=clean(workOrder.departmentTasks[role].scope);
  workOrder.departmentTasks[role].scope=`${existing} ${sharedInstruction}`.trim();
}
writeJson(workOrderPath,workOrder);

draft.planningDirectionSelection=selection;
draft.storySpine={...(draft.storySpine||{}),planningDirectionSelection:selection};
draft.qualityContract={...(draft.qualityContract||{}),planningDirectionSelectedBeforeDepartmentRound:true,departmentRoundUsesSharedDirection:true};
writeJson(draftPath,draft);

const dailyPath='artbook-daily-context.json',daily=readJson(dailyPath,{});
writeJson(dailyPath,{...daily,planningDirectionSelection:selection});
console.log(`ARTBOOK_PLANNING_DIRECTION=${selection.choice}`);
console.log(`ARTBOOK_PLANNING_DIRECTION_SELECTED_BY=${selection.selectedBy}`);
console.log(`ARTBOOK_PLANNING_DIRECTION_FALLBACK=${selection.fallbackUsed?'YES':'NO'}`);
console.log('ARTBOOK_DEPARTMENT_SHARED_DIRECTION=YES');
