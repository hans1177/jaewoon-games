import fs from 'node:fs';
import path from 'node:path';
import {PRODUCTION_CLASSES,productionClassOf,tierAliasForProductionClass} from './production-classification.mjs';
import {normalizeSeedRegistry,recordVacancy,validateSeed} from './game-seed-bootstrap.mjs';

const clean=v=>String(v??'').trim();
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
function kstDate(){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return`${g('year')}-${g('month')}-${g('day')}`;}

const gameId=clean(process.env.ARTBOOK_GAME_ID||process.env.GAME_ID||process.argv.find(x=>x.startsWith('--game='))?.split('=')[1]);
const date=clean(process.env.ARTBOOK_DATE||process.env.DESIGN_DATE||kstDate());
if(!gameId)throw new Error('ARTBOOK_GAME_ID or GAME_ID is required');
const directive=readJson('company-directive.json',{});
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
if(status.flow!=='GAME_SEED_TO_DESIGN_BASELINE')throw new Error(`DESIGN_FLOW_INVALID:${status.flow||'EMPTY'}`);

const seedPath=clean(status.gameSeed?.path||game.gameSeedPath||path.join(base,'game-seed.json'));
const seed=readJson(seedPath,null);
const revisedPath=path.join(base,'design-revised.json');
const revised=readJson(revisedPath,null);
const content=revised?.content||{};
const blockers=[];
const seedCheck=validateSeed(seed||{});
if(!status.gameSeed?.complete||!seedCheck.pass)blockers.push(`game-seed-incomplete:${seedCheck.missing.join('|')}`);
if(!clean(content.identity))blockers.push('distinct-game-identity-required');
if(!Array.isArray(content.coreLoop)||content.coreLoop.length<4)blockers.push('core-loop-action-feedback-choice-reward-required');
if(!clean(content.mobileUx))blockers.push('mobile-ux-direction-required');
if(!clean(seed?.targetAudience)||!clean(seed?.targetSessionDirection))blockers.push('market-target-direction-required');
if(!['POSSIBLE','NOT_RECOMMENDED'].includes(clean(seed?.steamExpansionPossible)))blockers.push('steam-expansion-decision-required');
if(!['POSSIBLE','NOT_RECOMMENDED'].includes(clean(seed?.multiplayerExpansionPossible)))blockers.push('multiplayer-expansion-decision-required');
if(status.departments?.count!==5||status.departments?.leadModelsDistinct!==true)blockers.push('five-distinct-department-leads-required');
for(const [role,audit] of Object.entries(status.departments?.modelAudit||{}))if(audit?.pass!==true)blockers.push(`department-multimodel-review-failed:${role}`);
const conflicts=Number(status.meeting?.conflictCount||0);
const holds=Number(status.meeting?.holdCount||0);
if(conflicts>0)blockers.push(`meeting-conflicts:${conflicts}`);
if(holds>0)blockers.push(`meeting-holds:${holds}`);

const lifecycle=clean(status.designHealth?.lifecycleOutcome||'ACTIVE').toUpperCase();
let state='DESIGN_BASELINE_PENDING';
let ready=false;
if(lifecycle==='DISCARDED'){
  state='DESIGN_DISCARDED';
  blockers.push('fatal-design-blocker-remains-after-redesign-and-five-department-rereview');
  const registryPath='game-seed-registry.json';
  const registry=normalizeSeedRegistry(readJson(registryPath,{}));
  const recorded=recordVacancy(registry,{gameId,category:seed?.gameCategory,reason:'DISCARDED',evidence:{cycleStatus:statusPath.replaceAll('\\','/'),fatalAssessment:status.meeting?.fatalAssessment||null}},new Date().toISOString());
  writeJson(registryPath,recorded.state);
  status.seedVacancy={created:true,id:recorded.vacancy.id,category:recorded.vacancy.category,reason:'DISCARDED'};
}else if(lifecycle==='REDESIGN'){
  state='DESIGN_BASELINE_REDESIGN_REQUIRED';
  blockers.push('fatal-design-issue-requires-redesign');
}else if(blockers.length===0){
  state='DESIGN_BASELINE_READY';
  ready=true;
}else if(conflicts>0){
  state='DESIGN_BASELINE_PENDING_CONFLICT_RESOLUTION';
}else if(holds>0){
  state='DESIGN_BASELINE_PENDING_MEETING_HOLD';
}

status.baselineGate={
  policyDocument:'COMPANY_FLOW.md',productionClass,tierAlias,tier:tierAlias,state,ready,blockers,
  gameSeed:{required:true,pass:seedCheck.pass,path:seedPath.replaceAll('\\','/')},
  meeting:{conflictCount:conflicts,holdCount:holds,allResolved:conflicts===0&&holds===0},
  lifecycleOutcome:lifecycle,
  contracts:{gameSeedFirst:true,marketEvidenceTargetReferenceOnly:true,designOnlyVibe2Used:false,artbookRequiresBaselineReady:true},
  checkedAt:new Date().toISOString()
};
status.status=lifecycle==='DISCARDED'?'DISCARDED':lifecycle==='REDESIGN'?'REDESIGN_REQUIRED':'COMPLETE';
status.artbook=ready?{created:false,reason:'DESIGN_BASELINE_READY_FOR_ARTBOOK'}:{created:false,reason:'DESIGN_BASELINE_NOT_READY'};
if(ready){
  writeJson(path.join(base,'design-baseline.json'),{version:1,gameId,date,productionClass,tierAlias,status:'DESIGN_BASELINE_READY',sourceSeed:seedPath.replaceAll('\\','/'),sourceDesign:revisedPath.replaceAll('\\','/'),createdAt:new Date().toISOString()});
}
writeJson(statusPath,status);
console.log(`DESIGN_BASELINE_STATE=${state}`);
console.log(`DESIGN_BASELINE_READY=${ready?'YES':'NO'}`);
console.log(`DESIGN_LIFECYCLE_OUTCOME=${lifecycle}`);
console.log('DESIGN_ONLY_VIBE2_USED=NO');
console.log(`ARTBOOK_ALLOWED=${ready?'YES':'NO'}`);
