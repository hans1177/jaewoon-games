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
function parseJsonObject(text){
  const raw=String(text??'').trim();
  if(!raw)throw new Error('empty model response');
  const unfenced=raw.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
  try{return JSON.parse(unfenced);}catch{}
  const first=unfenced.indexOf('{');const last=unfenced.lastIndexOf('}');
  if(first>=0&&last>first)return JSON.parse(unfenced.slice(first,last+1));
  throw new Error('model response is not a JSON object');
}
function normalizeSchemaValue(value,schema,label='root',repairs=[]){
  if(!schema||typeof schema!=='object')return value;
  if(schema.type==='object'){
    if(!value||Array.isArray(value)||typeof value!=='object')return value;
    const normalized={};
    for(const [key,child] of Object.entries(schema.properties||{}))if(Object.prototype.hasOwnProperty.call(value,key))normalized[key]=normalizeSchemaValue(value[key],child,`${label}.${key}`,repairs);
    if(schema.additionalProperties!==false)for(const [key,childValue] of Object.entries(value))if(!Object.prototype.hasOwnProperty.call(normalized,key))normalized[key]=childValue;
    else for(const key of Object.keys(value))if(!Object.prototype.hasOwnProperty.call(schema.properties||{},key))repairs.push(`drop-extra:${label}.${key}`);
    return normalized;
  }
  if(schema.type==='array'){
    if(!Array.isArray(value))return value;
    let normalized=value.map((item,index)=>normalizeSchemaValue(item,schema.items,`${label}[${index}]`,repairs));
    if(Number.isFinite(schema.maxItems)&&normalized.length>schema.maxItems){repairs.push(`trim-array:${label}:${normalized.length}->${schema.maxItems}`);normalized=normalized.slice(0,schema.maxItems);}
    return normalized;
  }
  if(schema.type==='string'&&typeof value==='string'&&Number.isFinite(schema.maxLength)&&value.length>schema.maxLength){repairs.push(`trim-string:${label}:${value.length}->${schema.maxLength}`);return value.slice(0,schema.maxLength);}
  return value;
}
function assertSchemaValue(value,schema,label='root'){
  if(!schema||typeof schema!=='object')return;
  if(schema.type==='object'){
    if(!value||Array.isArray(value)||typeof value!=='object')throw new Error(`schema object mismatch: ${label}`);
    for(const key of schema.required||[])if(!(key in value))throw new Error(`schema required missing: ${label}.${key}`);
    if(schema.additionalProperties===false)for(const key of Object.keys(value))if(!Object.prototype.hasOwnProperty.call(schema.properties||{},key))throw new Error(`schema additional property: ${label}.${key}`);
    for(const [key,child] of Object.entries(schema.properties||{}))if(key in value)assertSchemaValue(value[key],child,`${label}.${key}`);
    return;
  }
  if(schema.type==='array'){
    if(!Array.isArray(value))throw new Error(`schema array mismatch: ${label}`);
    if(Number.isFinite(schema.maxItems)&&value.length>schema.maxItems)throw new Error(`schema maxItems mismatch: ${label}`);
    for(let i=0;i<value.length;i++)assertSchemaValue(value[i],schema.items,`${label}[${i}]`);
    return;
  }
  if(schema.type==='string'){
    if(typeof value!=='string')throw new Error(`schema string mismatch: ${label}`);
    if(Number.isFinite(schema.maxLength)&&value.length>schema.maxLength)throw new Error(`schema maxLength mismatch: ${label}`);
  }
}
async function callModel(model,system,user,schema){
  const started=Date.now();
  const deepSeek=model.startsWith('deepseek-r1');
  let lastError=null;
  for(let attempt=1;attempt<=2;attempt++){
    const mode=deepSeek?'json':(attempt===1?'schema':'json');
    try{
      const schemaPrompt=(deepSeek||attempt>1)?`\nJSON_SCHEMA=${JSON.stringify(schema)}\n사고 과정이나 설명 없이 위 스키마를 만족하는 JSON 객체만 반환한다.`:'';
      const correction=attempt>1&&lastError?`\nPREVIOUS_VALIDATION_ERROR=${clean(lastError?.message)}\n이 오류를 정확히 수정하고 모든 필수 필드를 포함하라.`:'';
      const payload={model,stream:false,think:false,keep_alive:'0s',messages:[{role:'system',content:system},{role:'user',content:user+'\n출력은 JSON 객체만 반환한다.'+schemaPrompt+correction}],options:{temperature:attempt===1?0.1:0,num_ctx:8192,num_predict:deepSeek?2800:Math.min(2800,1400*attempt)}};
      if(!deepSeek&&attempt===1)payload.format=schema;
      else payload.format='json';
      const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      if(!response.ok)throw new Error(`ollama ${response.status}: ${await response.text()}`);
      const body=await response.json();const parsed=parseJsonObject(body?.message?.content);const repairs=[];const normalized=normalizeSchemaValue(parsed,schema,'root',repairs);if(repairs.length)console.log(`ARTBOOK_SCHEMA_NORMALIZED=${model}|attempt=${attempt}|${repairs.join(',')}`);assertSchemaValue(normalized,schema);console.log(`ARTBOOK_MODEL_CALL_MS=${model}|${Date.now()-started}|attempt=${attempt}|mode=${mode}`);return normalized;
    }catch(error){lastError=error;if(attempt<2){console.log(`ARTBOOK_MODEL_FALLBACK=${model}|attempt=${attempt}|next=json|reason=${clean(error?.message)}`);await new Promise(r=>setTimeout(r,800*attempt));}}
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
