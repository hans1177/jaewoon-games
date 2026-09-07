// Validates real department-owned artbook submissions without authoring content.
// It never edits web-games/ and never creates missing department sections.
import fs from 'node:fs';
import path from 'node:path';

const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const queue=readJson('artbook-submission-queue.json',{requiredRoles:['planning','graphics','development','qa','balance'],currentDailyTarget:null,games:[]});
const requiredRoles=Array.isArray(queue.requiredRoles)&&queue.requiredRoles.length?queue.requiredRoles:['planning','graphics','development','qa','balance'];
const gameId=String(process.env.ARTBOOK_GAME_ID||queue.currentDailyTarget||'').trim();
const targetGame=(queue.games||[]).find(x=>x.gameId===gameId)||null;
const date=String(process.env.ARTBOOK_DATE||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())).trim();

if(!gameId)throw new Error('ARTBOOK_GAME_ID is empty and queue has no currentDailyTarget.');

const base=path.join('artbook-submissions',gameId,date);
const ready=[];
const missing=[];
const invalid=[];

for(const role of requiredRoles){
  const file=path.join(base,`${role}.json`);
  if(!fs.existsSync(file)){
    missing.push({role,file,reason:'missing-file'});
    continue;
  }
  const raw=fs.readFileSync(file,'utf8');
  const data=readJson(file,null);
  const problems=[];
  if(!data||typeof data!=='object'||Array.isArray(data))problems.push('invalid-json-object');
  else{
    if(String(data.gameId||'')!==gameId)problems.push('gameId-mismatch');
    if(String(data.date||'')!==date)problems.push('date-mismatch');
    if(String(data.department||data.role||'')!==role)problems.push('department-mismatch');
    if(String(data.status||'').toUpperCase()!=='SUBMITTED')problems.push('status-not-SUBMITTED');
    if(!Array.isArray(data.evidence)||data.evidence.length===0)problems.push('evidence-required');
    if(!data.section||typeof data.section!=='object'||Array.isArray(data.section)||Object.keys(data.section).length===0)problems.push('non-empty-section-required');
    if(/NO_CHANGE/i.test(raw))problems.push('initial-artbook-NO_CHANGE-forbidden');
  }
  if(problems.length)invalid.push({role,file,problems});
  else ready.push({role,file});
}

const readyForDirectorAssembly=ready.length===requiredRoles.length&&missing.length===0&&invalid.length===0;
const status={
  version:1,
  checkedAt:new Date().toISOString(),
  date,
  gameId,
  gameName:targetGame?.name||gameId,
  requiredRoles,
  readyRoles:ready.map(x=>x.role),
  readyCount:ready.length,
  requiredCount:requiredRoles.length,
  missing,
  invalid,
  readyForDirectorAssembly,
  directorMayAuthorMissingSections:false,
  formalProductionGate:readyForDirectorAssembly?'SECTION_GATE_COMPLETE_DIRECTOR_ASSEMBLY_ALLOWED':'BLOCKED_WAITING_FOR_REAL_DEPARTMENT_SUBMISSIONS'
};
writeJson('artbook-gate-status.json',status);
console.log(`ARTBOOK_GAME_ID=${gameId}`);
console.log(`ARTBOOK_DATE=${date}`);
console.log(`ARTBOOK_SECTION_READY=${ready.length}/${requiredRoles.length}`);
console.log(`ARTBOOK_DIRECTOR_ASSEMBLY=${readyForDirectorAssembly?'YES':'NO'}`);
if(missing.length)console.log(`ARTBOOK_MISSING=${missing.map(x=>x.role).join(',')}`);
if(invalid.length)console.log(`ARTBOOK_INVALID=${invalid.map(x=>x.role).join(',')}`);
