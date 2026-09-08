// Assembles a final artbook from five validated department-owned submissions.
// It copies submitted material only: no department content, setting, or claim is invented here.
import fs from 'node:fs';
import path from 'node:path';

const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const todayKst=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

const queue=readJson('artbook-submission-queue.json',null);
const gate=readJson('artbook-gate-status.json',null);
const styles=readJson('artbook-style-profiles.json',{games:{}});
if(!queue||!gate)throw new Error('artbook queue/gate status missing');

const roles=Array.isArray(queue.requiredRoles)&&queue.requiredRoles.length?queue.requiredRoles:['planning','graphics','development','qa','balance'];
const gameId=String(process.env.ARTBOOK_GAME_ID||gate.gameId||queue.currentDailyTarget||'').trim();
const date=String(process.env.ARTBOOK_DATE||gate.date||todayKst()).trim();
const game=(queue.games||[]).find(x=>x.gameId===gameId)||null;
const base=path.join('artbook-submissions',gameId,date);
const output=path.join(base,'artbook.json');

if(!gameId)throw new Error('gameId missing');
if(gate.gameId!==gameId||gate.date!==date)throw new Error('gate target/date mismatch');
if(gate.readyForDirectorAssembly!==true||Number(gate.readyCount)!==roles.length)throw new Error(`section gate is not complete: ${gate.readyCount||0}/${roles.length}`);
if(gate.directorMayAuthorMissingSections!==false)throw new Error('director ghostwriting guard missing');

// Company-wide hard cap: one final combined artbook per KST date.
const submissionsRoot='artbook-submissions';
if(fs.existsSync(submissionsRoot)){
  for(const entry of fs.readdirSync(submissionsRoot,{withFileTypes:true})){
    if(!entry.isDirectory())continue;
    const candidate=path.join(submissionsRoot,entry.name,date,'artbook.json');
    if(fs.existsSync(candidate)&&path.normalize(candidate)!==path.normalize(output)){
      throw new Error(`daily final artbook limit reached by ${candidate}`);
    }
  }
}

const departments={};
const sourceFiles=[];
const cuts=[];
for(const role of roles){
  const file=path.join(base,`${role}.json`);
  const submission=readJson(file,null);
  if(!submission)throw new Error(`${role} submission missing after gate`);
  if(String(submission.gameId||'')!==gameId||String(submission.date||'')!==date)throw new Error(`${role} target mismatch`);
  if(String(submission.department||submission.role||'')!==role)throw new Error(`${role} ownership mismatch`);
  if(String(submission.status||'').toUpperCase()!=='SUBMITTED')throw new Error(`${role} not SUBMITTED`);
  if(!Array.isArray(submission.evidence)||submission.evidence.length===0)throw new Error(`${role} evidence missing`);
  if(!submission.section||typeof submission.section!=='object'||Array.isArray(submission.section)||Object.keys(submission.section).length===0)throw new Error(`${role} section missing`);

  sourceFiles.push(file);
  departments[role]={
    status:'SUBMITTED',
    sourceFile:file,
    headline:submission.headline||null,
    evidence:submission.evidence,
    section:submission.section,
    unverified:Array.isArray(submission.unverified)?submission.unverified:[]
  };

  const submittedCuts=Array.isArray(submission.cuts)?submission.cuts:[];
  for(const cut of submittedCuts){
    if(cuts.length>=10)break;
    if(!cut||!cut.title||!cut.body||!cut.image)continue;
    cuts.push({
      no:cuts.length+1,
      kind:cut.kind||role,
      title:cut.title,
      body:cut.body,
      image:cut.image,
      sourceDepartment:role
    });
  }
}

const style=styles?.games?.[gameId]||{};
const final={
  version:1,
  gameId,
  gameName:game?.name||style.name||gameId,
  date,
  status:'SUBMITTED',
  initialArtbook:true,
  productionApproval:false,
  styleProfile:game?.styleProfile||style.identity||null,
  departments,
  directorSummary:{
    assemblyMode:'verbatim-department-material-plus-metadata-only',
    sourceDepartments:roles,
    sourceFiles,
    newClaimsAdded:false,
    productionDecisionMade:false
  },
  cuts,
  publication:{
    automaticProductionApproval:false,
    homepageVisibilityMayBeEnabledSeparately:true,
    displayReady:cuts.length>0
  }
};
writeJson(output,final);

const nextGate={
  ...gate,
  checkedAt:new Date().toISOString(),
  assembled:true,
  assembledFile:output,
  assemblyAddsNewClaims:false,
  formalProductionGate:'INITIAL_ARTBOOK_ASSEMBLED_AWAITING_OWNER_PRODUCTION_DECISION'
};
writeJson('artbook-gate-status.json',nextGate);

console.log(`ARTBOOK_ASSEMBLED=YES`);
console.log(`ARTBOOK_FILE=${output}`);
console.log(`ARTBOOK_DEPARTMENTS=${roles.length}/${roles.length}`);
console.log(`ARTBOOK_CUTS=${cuts.length}/10`);
console.log('PRODUCTION_APPROVAL=NO');
