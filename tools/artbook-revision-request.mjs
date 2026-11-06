import fs from 'node:fs';
import path from 'node:path';
import { ARTBOOK_REVISION_TRIGGERS } from '../assets/artbook-lifecycle.js';

const readJson=(file,fallback={})=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clean=value=>String(value??'').trim();
const getArg=name=>{
  const prefix=`--${name}=`;
  return clean(process.argv.find(x=>x.startsWith(prefix))?.slice(prefix.length));
};
const todayKst=()=>{
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const pick=type=>parts.find(x=>x.type===type)?.value||'';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
};

const gameId=clean(process.env.ARTBOOK_GAME_ID||getArg('game'));
const trigger=clean(process.env.ARTBOOK_REVISION_TRIGGER||getArg('trigger')).toUpperCase();
const reason=clean(process.env.ARTBOOK_REVISION_REASON||getArg('reason'));
const requestedBy=clean(process.env.ARTBOOK_REVISION_REQUESTED_BY||getArg('by'))||'system';
const departments=clean(process.env.ARTBOOK_REVISION_DEPARTMENTS||getArg('departments')).split(',').map(clean).filter(Boolean);
const evidence=clean(process.env.ARTBOOK_REVISION_EVIDENCE||getArg('evidence')).split(',').map(clean).filter(Boolean);
const dueDate=clean(process.env.ARTBOOK_REVISION_DUE||getArg('due'))||todayKst();

if(!gameId)throw new Error('ARTBOOK_GAME_ID or --game is required');
if(!ARTBOOK_REVISION_TRIGGERS.includes(trigger)||['DEVELOPMENT_CONFIRMED','RELEASE_CONFIRMED'].includes(trigger)){
  throw new Error(`manual revision trigger must be one of: ${ARTBOOK_REVISION_TRIGGERS.filter(x=>!['DEVELOPMENT_CONFIRMED','RELEASE_CONFIRMED'].includes(x)).join(',')}`);
}
if(!reason)throw new Error('ARTBOOK_REVISION_REASON or --reason is required');

const registry=readJson('game-artbooks.json',{artbooks:[]});
const completed=(registry.artbooks||[]).filter(x=>x.gameId===gameId&&String(x.status||'')==='completed-artbook').sort((a,b)=>(Number(b.edition)||0)-(Number(a.edition)||0));
const baseline=completed.find(x=>x.lifecycle?.currentBaseline===true)||completed[0]||null;
if(!baseline)throw new Error(`completed artbook baseline required before revision: ${gameId}`);

const queueFile='artbook-revision-queue.json';
const queue=readJson(queueFile,{version:1,tasks:[]});
const sequence=(queue.tasks||[]).filter(x=>x.gameId===gameId).length+1;
const id=`${gameId}-${todayKst()}-revision-${String(sequence).padStart(2,'0')}`;
const task={
  id,
  type:'ARTBOOK_REVISION_REQUEST',
  gameId,
  status:'SCHEDULED',
  requestedAt:new Date().toISOString(),
  requestedBy,
  trigger,
  reason,
  evidence,
  selectedDepartments:departments.length?departments:['planning','graphics','development','qa','balance'],
  dueDate,
  sourceArtbookId:baseline.id,
  sourceEdition:Number(baseline.edition)||0,
  sourceLifecycleState:baseline.lifecycle?.state||'DESIGN_BASELINE',
  createsNewVersion:true,
  overwriteApprovedVersion:false
};
queue.version=Math.max(1,Number(queue.version)||0);
queue.updatedAt=todayKst();
queue.tasks=[...(queue.tasks||[]),task];
writeJson(queueFile,queue);
console.log(`ARTBOOK_REVISION_REQUEST=${id}`);
console.log(`ARTBOOK_REVISION_GAME=${gameId}`);
console.log(`ARTBOOK_REVISION_TRIGGER=${trigger}`);
console.log(`ARTBOOK_REVISION_SOURCE=${baseline.id}`);
console.log('ARTBOOK_REVISION_CREATES_NEW_VERSION=YES');
