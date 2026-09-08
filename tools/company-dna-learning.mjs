import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DNA_STAGES = Object.freeze(['PROPOSED','EXPERIMENTING','GAME_VERIFIED','MULTI_GAME_VERIFIED','COMPANY_STANDARD','RETIRED']);
export const DNA_TYPES = Object.freeze(['MOTION','GRAPHICS','VIBE2','BUDGET','QA','GAMEPLAY']);

const unique=(values=[])=>[...new Set((values||[]).filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim()))];
const finite=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;

export function validateDnaEvidence(e={}){
  const missing=[];
  if(!String(e.id||'').trim())missing.push('id');
  if(!DNA_TYPES.includes(e.type))missing.push('type');
  if(!String(e.patternId||'').trim())missing.push('patternId');
  if(!String(e.gameId||'').trim())missing.push('gameId');
  if(!['SUCCESS','FAILURE'].includes(e.outcome))missing.push('outcome');
  if(e.verified!==true)missing.push('verified=true');
  if(!String(e.sourceRevision||'').trim())missing.push('sourceRevision');
  if(!Array.isArray(e.evidence)||e.evidence.length===0)missing.push('evidence');
  return{pass:missing.length===0,missing};
}

export function createDnaStore(){return{version:1,updatedAt:null,items:[],evidenceIds:[],antiPatterns:[]};}

function keyFor(e){return`${e.type}:${e.patternId}`;}

export function recordDnaEvidence(store,e,timestamp=new Date().toISOString()){
  const v=validateDnaEvidence(e);if(!v.pass)throw new Error(`DNA evidence 불완전: ${v.missing.join(', ')}`);
  store.version??=1;store.items??=[];store.evidenceIds??=[];store.antiPatterns??=[];
  if(store.evidenceIds.includes(e.id))return{added:false,reason:'DUPLICATE_ID'};
  const key=keyFor(e);
  let item=store.items.find(x=>x.key===key);
  if(!item){item={key,type:e.type,patternId:e.patternId,title:e.title||e.patternId,stage:'PROPOSED',jayApproved:false,evidence:[],createdAt:timestamp,updatedAt:timestamp};store.items.push(item);}
  const row={id:e.id,gameId:e.gameId,genre:e.genre||'UNKNOWN',conditionKey:e.conditionKey||'UNKNOWN',outcome:e.outcome,delta:finite(e.delta),blockers:unique(e.blockers),sourceRevision:String(e.sourceRevision),evidence:unique(e.evidence),verifiedAt:e.verifiedAt||timestamp};
  item.evidence.push(row);item.updatedAt=timestamp;store.evidenceIds.push(e.id);store.updatedAt=timestamp;
  recomputeDnaItem(item,store);
  return{added:true,item};
}

export function recomputeDnaItem(item,store=null){
  const rows=item.evidence||[],success=rows.filter(x=>x.outcome==='SUCCESS'&&x.blockers.length===0),failure=rows.filter(x=>x.outcome==='FAILURE'||x.blockers.length>0);
  const games=new Set(success.map(x=>x.gameId)),genres=new Set(success.map(x=>x.genre).filter(x=>x&&x!=='UNKNOWN')),conditions=new Set(success.map(x=>x.conditionKey).filter(x=>x&&x!=='UNKNOWN'));
  const avg=success.length?success.reduce((s,x)=>s+finite(x.delta),0)/success.length:0;
  const criticalFailures=failure.filter(x=>x.blockers.some(b=>/^CRITICAL_|^SAVE_|^CONTROL_|^LEGAL_/.test(b))).length;
  const multiEligible=games.size>=3&&genres.size>=2&&conditions.size>=2&&avg>=3&&criticalFailures===0;
  let stage='PROPOSED';
  if(rows.length)stage='EXPERIMENTING';
  if(games.size>=1)stage='GAME_VERIFIED';
  if(multiEligible)stage='MULTI_GAME_VERIFIED';
  if(item.jayApproved===true&&multiEligible)stage='COMPANY_STANDARD';
  if(item.retired===true)stage='RETIRED';
  item.stage=stage;
  item.summary={successEvidence:success.length,failureEvidence:failure.length,distinctGames:games.size,distinctGenres:genres.size,distinctConditions:conditions.size,averageDelta:avg,criticalFailures,multiGameEligible:multiEligible,selfPromote:false,jayDecisionRequired:multiEligible&&item.jayApproved!==true};
  if(store){
    const antiKey=`${item.type}:${item.patternId}`;
    const isAnti=failure.length>=2&&success.length===0;
    store.antiPatterns=(store.antiPatterns||[]).filter(x=>x.key!==antiKey);
    if(isAnti)store.antiPatterns.push({key:antiKey,type:item.type,patternId:item.patternId,failureEvidence:failure.length,games:unique(failure.map(x=>x.gameId)),reason:'REPEATED_VERIFIED_FAILURE'});
  }
  return item;
}

export function jayApproveCompanyStandard(store,key,timestamp=new Date().toISOString()){
  const item=store.items.find(x=>x.key===key);if(!item)throw new Error(`DNA item 없음: ${key}`);
  recomputeDnaItem(item,store);if(item.summary?.multiGameEligible!==true)throw new Error('다중게임 검증 전 회사표준 승격 금지');
  item.jayApproved=true;item.approvedAt=timestamp;item.updatedAt=timestamp;recomputeDnaItem(item,store);store.updatedAt=timestamp;return item;
}

export function retireDnaItem(store,key,reason,timestamp=new Date().toISOString()){
  const item=store.items.find(x=>x.key===key);if(!item)throw new Error(`DNA item 없음: ${key}`);if(!String(reason||'').trim())throw new Error('폐기 이유 필요');
  item.retired=true;item.retiredReason=String(reason).trim();item.updatedAt=timestamp;recomputeDnaItem(item,store);store.updatedAt=timestamp;return item;
}

export function ingestEvidenceDirectory(store,dir='company-learning/evidence'){
  if(!fs.existsSync(dir))return{files:0,added:0,rejected:[]};
  const files=fs.readdirSync(dir).filter(f=>f.endsWith('.json')).sort();let added=0;const rejected=[];
  for(const file of files){try{const raw=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));const rows=Array.isArray(raw)?raw:raw.items||[raw];for(const row of rows){const r=recordDnaEvidence(store,row);if(r.added)added++;}}catch(error){rejected.push({file,error:error.message});}}
  return{files:files.length,added,rejected};
}

function main(){
  const storePath='company-learning/company-dna.json';const store=fs.existsSync(storePath)?JSON.parse(fs.readFileSync(storePath,'utf8')):createDnaStore();
  const result=ingestEvidenceDirectory(store);store.updatedAt=new Date().toISOString();fs.writeFileSync(storePath,JSON.stringify(store,null,2)+'\n');console.log(JSON.stringify({result,items:store.items.length,antiPatterns:store.antiPatterns.length,selfPromote:false},null,2));
}
if(import.meta.url===pathToFileURL(process.argv[1]).href)main();
