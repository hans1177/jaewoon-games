// Awards small XP only after a failure has a verified root cause, fix, and prevention note.
import fs from 'node:fs';

const key=String(process.argv[2]||'').trim();
if(!key)throw new Error('bug id/signature required');
const bugPath='company-learning/bug-memory.json';
const xpPath='department-experience.json';
const bugs=JSON.parse(fs.readFileSync(bugPath,'utf8'));
const ledger=JSON.parse(fs.readFileSync(xpPath,'utf8'));
const bug=(bugs.bugs||[]).find(x=>x.id===key||x.signature===key);
if(!bug)throw new Error(`bug not found: ${key}`);
if(bug.xpAwarded){console.log('POSTMORTEM_XP_ALREADY_AWARDED');process.exit(0);}
if(!bug.learningVerified||!bug.rootCause||!bug.fix||!bug.prevention)throw new Error('verified rootCause/fix/prevention required before learning XP');

const departments=bug.scope==='build-infrastructure'?['development','release','qa']:['qa','development'];
const amount=8;
const thresholds=[0,100,250,500,900,1400,2100,3000,4200,6000];
const levelFor=xp=>{let level=1;thresholds.forEach((t,i)=>{if(xp>=t)level=i+1;});return Math.min(10,level);};
for(const id of departments){
  const current=ledger.departments[id]||{xp:0,level:1,verifiedCompletions:0,learningEvents:0,lastEvidence:null};
  const xp=(Number(current.xp)||0)+amount;
  ledger.departments[id]={...current,xp,level:levelFor(xp),learningEvents:(Number(current.learningEvents)||0)+1,lastEvidence:`postmortem:${bug.signature}`};
}
ledger.history=Array.isArray(ledger.history)?ledger.history:[];
ledger.history.push({type:'verified-postmortem-learning',bugId:bug.id,signature:bug.signature,departments,xpPerDepartment:amount,evidence:{rootCause:bug.rootCause,fix:bug.fix,prevention:bug.prevention},recordedAt:new Date().toISOString()});
ledger.history=ledger.history.slice(-300);
ledger.updatedAt=new Date().toISOString().slice(0,10);
bug.xpAwarded=true;
bug.xpAwardedAt=new Date().toISOString();
bugs.updatedAt=new Date().toISOString();
fs.writeFileSync(xpPath,JSON.stringify(ledger,null,2)+'\n');
fs.writeFileSync(bugPath,JSON.stringify(bugs,null,2)+'\n');

const ids=['planning','development','qa','graphics','balance','homepage','release','director'];
const lines=ids.map(id=>{const d=ledger.departments[id]||{};return `    ${id}: Object.freeze({ xp: ${Number(d.xp)||0}, level: ${Number(d.level)||1}, verifiedCompletions: ${Number(d.verifiedCompletions)||0}, learningEvents: ${Number(d.learningEvents)||0}, lastEvidence: ${d.lastEvidence?JSON.stringify(d.lastEvidence):'null'} })`;});
const state=`// AUTO-GENERATED FROM department-experience.json. Do not hand-edit.\nexport const DEFAULT_DEPARTMENT_EXPERIENCE_STATE = Object.freeze({\n  version: 1,\n  departments: Object.freeze({\n${lines.join(',\n')}\n  })\n});\n`;
fs.writeFileSync('assets/department-experience-state.js',state);
console.log(`POSTMORTEM_XP_AWARDED=${departments.join(',')} XP=${amount}`);
