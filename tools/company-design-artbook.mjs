import fs from 'node:fs';
import path from 'node:path';
import {PRODUCTION_CLASSES,productionClassOf,tierAliasForProductionClass} from './production-classification.mjs';

const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const uniq=v=>[...new Set((v||[]).map(clean).filter(Boolean))];
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clip=(value,max=14000)=>{const text=typeof value==='string'?value:JSON.stringify(value);return text.length>max?text.slice(0,max):text;};
function kstDate(){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return`${g('year')}-${g('month')}-${g('day')}`;}
function hash(value){let h=2166136261;for(const ch of String(value)){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;}

const gameId=clean(process.env.ARTBOOK_GAME_ID||process.env.GAME_ID||process.argv.find(x=>x.startsWith('--game='))?.split('=')[1]);
const date=clean(process.env.ARTBOOK_DATE||process.env.DESIGN_DATE||kstDate());
if(!gameId)throw new Error('ARTBOOK_GAME_ID or GAME_ID is required');
const directive=readJson('company-directive.json',{});
const ai=directive.ai||{};
const pool=uniq(ai.modelPool||[]);
if(pool.length===0)throw new Error('ARTBOOK_MODEL_POOL_EMPTY');
const numericLabels=directive.production?.numericLabels||{};
const catalog=readJson('game-catalog.json',{games:[]});
const game=(catalog.games||[]).find(x=>x.id===gameId);
if(!game)throw new Error(`Unknown game:${gameId}`);
const productionClass=productionClassOf({},game,{numericLabels});
if(productionClass!==PRODUCTION_CLASSES.DESIGN_ONLY)throw new Error(`DESIGN_ONLY_REQUIRED:${productionClass}`);
const tierAlias=tierAliasForProductionClass(productionClass,{numericLabels})??3;
const base=path.join('design',gameId,date);
const statusPath=path.join(base,'cycle-status.json');
const status=readJson(statusPath,null);
if(!status)throw new Error(`cycle-status missing:${statusPath}`);
if(status.baselineGate?.state!=='DESIGN_BASELINE_READY'||status.baselineGate?.ready!==true){
  console.log(`DESIGN_ARTBOOK_SKIPPED=${status.baselineGate?.state||'BASELINE_NOT_READY'}`);
  console.log('DESIGN_ONLY_VIBE2_USED=NO');
  process.exit(0);
}
const revisedPath=path.join(base,'design-revised.json');
const revised=readJson(revisedPath,null);
if(!revised?.content)throw new Error(`design-revised missing:${revisedPath}`);
const editorModel=pool[(hash(`${gameId}:artbook-editor`))%pool.length];
const SHORT={type:'string',maxLength:320};
const ARTBOOK={type:'object',required:['identity','playerFantasy','coreLoop','signatureSystems','progressionDirection','visualDirection','implementationDirection'],properties:{identity:{type:'string',maxLength:900},playerFantasy:{type:'string',maxLength:900},coreLoop:{type:'array',maxItems:7,items:SHORT},signatureSystems:{type:'array',maxItems:5,items:SHORT},progressionDirection:{type:'string',maxLength:900},visualDirection:{type:'string',maxLength:900},implementationDirection:{type:'array',maxItems:7,items:SHORT}},additionalProperties:false};
async function callModel(model,system,user,schema){
  let lastError=null;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,format:schema,messages:[{role:'system',content:system},{role:'user',content:`${user}\n유효한 JSON 객체만 반환한다.`}],options:{temperature:attempt===1?0.15:0,num_ctx:8192,num_predict:Math.min(3000,900*attempt)}})});
      if(!response.ok)throw new Error(`ollama ${response.status}:${await response.text()}`);
      const body=await response.json();const text=clean(body?.message?.content);if(!text)throw new Error('empty model response');return JSON.parse(text);
    }catch(error){lastError=error;if(attempt<3)await new Promise(resolve=>setTimeout(resolve,500*attempt));}
  }
  throw new Error(`MODEL_CALL_FAILED ${model}:${clean(lastError?.message)}`);
}
const artbook=await callModel(editorModel,
  '너는 이 프로젝트의 단일 Artbook Editor AI다. DESIGN_BASELINE_READY 이후 확정된 상세 설계의 핵심 전략만 압축한다. 새 설정, 새 수치, 새 시스템, 새 스토리를 발명하지 않는다. Vibe2가 아니며 설계 검증 역할도 하지 않는다.',
  `수정된 상세 설계만 근거로 게임 정체성, 플레이어 판타지, 핵심 루프, 시그니처 시스템, 성장 방향, 비주얼 방향, 구현 방향을 압축하라. 원문에 없는 내용을 추가하지 마라.\nREVISED_DESIGN=${clip(revised.content,14000)}`,
  ARTBOOK);
const artbookPath=path.join(base,'core-artbook.json');
const artifact={version:5,gameId,date,productionClass,tierAlias,tier:tierAlias,editorRole:'ARTBOOK_EDITOR_AI',editorModel,singleEditor:true,sourceDesign:revisedPath.replaceAll('\\','/'),sourceBaseline:path.join(base,'design-baseline.json').replaceAll('\\','/'),baselineRequired:true,baselineState:'DESIGN_BASELINE_READY',departmentPageAuthorship:false,newClaimsAllowed:false,vibe2Used:false,content:artbook};
writeJson(artbookPath,artifact);
const publicPath=path.join('artbook-submissions',gameId,'current.json');
writeJson(publicPath,{...artifact,gameName:game.name,status:'completed-artbook',lifecycleState:'DESIGN_BASELINE',published:true,homepageVisible:true,format:'core-strategy',sourceFile:artbookPath.replaceAll('\\','/'),publication:{policyDocument:'COMPANY_FLOW.md',baselineGateState:'DESIGN_BASELINE_READY',baselineReady:true,publishedAt:new Date().toISOString()}});
const publicStatusPath=path.join('artbook-submissions',gameId,'status.json');
writeJson(publicStatusPath,{version:3,gameId,gameName:game.name,date,productionClass,tierAlias,tier:tierAlias,uiStatus:'COMPLETE',uiLabel:'완료',baselineGateState:'DESIGN_BASELINE_READY',baselineReady:true,artbookPublished:true,currentPublicationRetained:true,updatedAt:new Date().toISOString()});
status.artbook={created:true,singleEditor:true,editorModel,sourceDesign:revisedPath.replaceAll('\\','/'),afterBaseline:true,vibe2Used:false};
status.artbookPublication={published:true,path:publicPath.replaceAll('\\','/'),baselineGateState:'DESIGN_BASELINE_READY'};
status.artbookUi={status:'COMPLETE',label:'완료',path:publicStatusPath.replaceAll('\\','/')};
writeJson(statusPath,status);
console.log('DESIGN_ARTBOOK=COMPLETE');
console.log(`ARTBOOK_EDITOR_MODEL=${editorModel}`);
console.log('ARTBOOK_AFTER_DESIGN_BASELINE=YES');
console.log('DESIGN_ONLY_VIBE2_USED=NO');
