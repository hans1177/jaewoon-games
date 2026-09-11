import fs from 'node:fs';
import path from 'node:path';
import {loadSeedState,seedForGame} from './game-seed-state.mjs';

const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clean=v=>String(v??'').trim();
const clip=(v,n=14000)=>{const s=typeof v==='string'?v:JSON.stringify(v);return s.length>n?s.slice(0,n):s;};
const uniq=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
function kstDate(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return`${g('year')}-${g('month')}-${g('day')}`;}
function hash(value){let h=2166136261;for(const ch of String(value)){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;}

const gameId=clean(process.env.ARTBOOK_GAME_ID||process.env.GAME_ID||process.argv.find(x=>x.startsWith('--game='))?.split('=')[1]);
const date=clean(process.env.ARTBOOK_DATE||process.env.DESIGN_DATE||kstDate());
if(!gameId)throw new Error('ARTBOOK_GAME_ID or GAME_ID is required');
const base=path.join('design',gameId,date);
const statusPath=path.join(base,'cycle-status.json');
const revisedPath=path.join(base,'design-revised.json');
const status=readJson(statusPath,null);const revised=readJson(revisedPath,null);
if(!status||!revised?.content)throw new Error('DESIGN_ARTBOOK_SOURCE_MISSING');
if(status.baselineGate?.state!=='DESIGN_BASELINE_READY'||status.baselineGate?.ready!==true)throw new Error('DESIGN_ARTBOOK_REQUIRES_DESIGN_BASELINE_READY');
if(clean(status.disposition?.state).toUpperCase()!=='ACTIVE')throw new Error(`DESIGN_ARTBOOK_DISPOSITION_NOT_ACTIVE: ${status.disposition?.state||'MISSING'}`);
const directive=readJson('company-directive.json',{});const pool=uniq(directive.ai?.modelPool||[]);if(!pool.length)throw new Error('MODEL_POOL_EMPTY');
const editorModel=pool[hash(`${gameId}:design-artbook-editor`)%pool.length];
const ARTBOOK={type:'object',required:['identity','playerFantasy','coreLoop','signatureSystems','progressionDirection','visualDirection'],properties:{identity:{type:'string',maxLength:800},playerFantasy:{type:'string',maxLength:800},coreLoop:{type:'array',maxItems:7,items:{type:'string',maxLength:320}},signatureSystems:{type:'array',maxItems:6,items:{type:'string',maxLength:420}},progressionDirection:{type:'string',maxLength:800},visualDirection:{type:'string',maxLength:800}},additionalProperties:false};
async function callModel(model,system,user,schema){
  const started=Date.now();
  let lastError=null;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,think:false,keep_alive:'0s',format:schema,messages:[{role:'system',content:system},{role:'user',content:user}],options:{temperature:attempt===1?0.1:0,num_ctx:8192,num_predict:Math.min(2800,1400*attempt)}})});
      if(!response.ok)throw new Error(`ollama ${response.status}: ${await response.text()}`);
      const body=await response.json();const text=clean(body?.message?.content);if(!text)throw new Error('empty model response');
      const parsed=JSON.parse(text);console.log(`ARTBOOK_MODEL_CALL_MS=${model}|${Date.now()-started}|attempt=${attempt}`);return parsed;
    }catch(error){lastError=error;if(attempt<3)await new Promise(r=>setTimeout(r,800*attempt));}
  }
  throw new Error(`ARTBOOK_MODEL_CALL_FAILED ${model}: ${clean(lastError?.message)}`);
}
const artbook=await callModel(editorModel,'너는 이 프로젝트의 단일 Artbook Editor AI다. DESIGN_BASELINE_READY가 확정된 수정 상세설계에서 핵심 전략만 압축한다. 원문에 없는 설정·수치·시스템·스토리·시장주장을 추가하지 않는다.',`다음 수정 상세설계의 정체성, 플레이어 판타지, 핵심 루프, 시그니처 시스템, 성장 방향, 비주얼 방향만 압축하라.\nREVISED_DESIGN=${clip(revised.content,16000)}`,ARTBOOK);
const artbookPath=path.join(base,'core-artbook.json');const output={version:5,gameId,date,productionClass:'DESIGN_ONLY',tierAlias:3,tier:3,editorRole:'ARTBOOK_EDITOR_AI',editorModel,singleEditor:true,sourceDesign:revisedPath.replaceAll('\\','/'),baselineGateState:'DESIGN_BASELINE_READY',departmentPageAuthorship:false,newClaimsAdded:false,vibe2Used:false,content:artbook};writeJson(artbookPath,output);
const seed=seedForGame(loadSeedState(),gameId);const catalog=readJson('game-catalog.json',{games:[]});const catalogGame=(catalog.games||[]).find(x=>x.id===gameId);const gameName=clean(catalogGame?.name||seed?.gameName||gameId);
const publicPath=path.join('artbook-submissions',gameId,'current.json');writeJson(publicPath,{...output,gameName,createdAt:date,status:'completed-artbook',lifecycleState:'DESIGN_BASELINE',published:true,homepageVisible:true,format:'core-strategy',sourceFile:artbookPath.replaceAll('\\','/'),publication:{policyDocument:'COMPANY_FLOW.md',baselineGateState:'DESIGN_BASELINE_READY',baselineReady:true,publishedAt:new Date().toISOString()}});
const publicStatusPath=path.join('artbook-submissions',gameId,'status.json');writeJson(publicStatusPath,{version:3,gameId,gameName,date,productionClass:'DESIGN_ONLY',uiStatus:'COMPLETE',uiLabel:'완료',baselineGateState:'DESIGN_BASELINE_READY',baselineReady:true,artbookPublished:true,currentPublicationRetained:true,updatedAt:new Date().toISOString()});
status.artbook={singleEditor:true,editorModel,sourceDesign:revisedPath.replaceAll('\\','/'),createdAfterBaselineReady:true,vibe2Used:false,path:artbookPath.replaceAll('\\','/')};status.artbookPublication={published:true,path:publicPath.replaceAll('\\','/'),baselineGateState:'DESIGN_BASELINE_READY'};status.artbookUi={status:'COMPLETE',label:'완료',path:publicStatusPath.replaceAll('\\','/')};writeJson(statusPath,status);
console.log('DESIGN_ARTBOOK=CREATED');console.log('DESIGN_ARTBOOK_AFTER_BASELINE=YES');console.log('DESIGN_ARTBOOK_VIBE2_USED=NO');console.log(`ARTBOOK_EDITOR_MODEL=${editorModel}`);
