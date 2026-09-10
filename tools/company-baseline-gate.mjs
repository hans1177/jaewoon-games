import fs from 'node:fs';
import path from 'node:path';
import {PRODUCTION_CLASSES,productionClassOf,tierAliasForProductionClass} from './production-classification.mjs';

const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clean=v=>String(v??'').trim();
function kstDate(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return`${g('year')}-${g('month')}-${g('day')}`;}
function explicitPass(data,gameId){
  if(!data||typeof data!=='object'||Array.isArray(data))return false;
  if(clean(data.gameId)&&clean(data.gameId)!==gameId)return false;
  const state=clean(data.status||data.result||data.decision).toUpperCase();
  return data.pass===true||data.validated===true||['PASS','PASSED','VALIDATED','READY'].includes(state);
}
function latestDesignValidation(gameId,fileName){
  const root=path.join('design',gameId);
  if(!fs.existsSync(root))return {path:null,data:null,pass:false};
  const dates=fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isDirectory()&&/^\d{4}-\d{2}-\d{2}$/.test(e.name)).map(e=>e.name).sort().reverse();
  for(const date of dates){
    const file=path.join(root,date,fileName);
    if(!fs.existsSync(file))continue;
    const data=readJson(file,null);
    return {path:file.replaceAll('\\','/'),data,pass:explicitPass(data,gameId)};
  }
  return {path:null,data:null,pass:false};
}

const gameId=clean(process.env.ARTBOOK_GAME_ID||process.env.GAME_ID||process.argv.find(x=>x.startsWith('--game='))?.split('=')[1]);
const date=clean(process.env.ARTBOOK_DATE||process.env.DESIGN_DATE||kstDate());
if(!gameId)throw new Error('ARTBOOK_GAME_ID or GAME_ID is required');
const directive=readJson('company-directive.json',{});
const numericLabels=directive.production?.numericLabels||{};
const catalog=readJson('game-catalog.json',{games:[]});
const game=(catalog.games||[]).find(x=>x.id===gameId);
if(!game)throw new Error(`Unknown game: ${gameId}`);
const productionClass=productionClassOf({},game,{numericLabels});
const tierAlias=tierAliasForProductionClass(productionClass,{numericLabels})??(Number(game.productionTier||0)||null);
const statusPath=path.join('design',gameId,date,'cycle-status.json');
const status=readJson(statusPath,null);
if(!status||status.status!=='COMPLETE')throw new Error(`Completed cycle-status missing: ${statusPath}`);

const runtime=readJson('company-qa-runtime-evidence.json',{games:[]});
const webSmoke=(runtime.games||[]).find(x=>x.gameId===gameId&&x.target==='web')||null;
const webSmokePass=Boolean(webSmoke?.runtimeSmokePassed===true&&webSmoke?.qaPassEligible===true&&(!Array.isArray(webSmoke?.blockers)||webSmoke.blockers.length===0));
const webGameplay=latestDesignValidation(gameId,'web-gameplay-validation.json');
const unityTechnical=latestDesignValidation(gameId,'unity-technical-validation.json');
const unityProjectPresent=Boolean(clean(game.unityProjectPath)&&fs.existsSync(clean(game.unityProjectPath)));
const blockers=[];
const meetingConflicts=Number(status.meeting?.conflictCount||0);
const meetingHolds=Number(status.meeting?.holdCount||0);
let state='NOT_APPLICABLE';
let ready=false;

if(productionClass===PRODUCTION_CLASSES.DESIGN_ONLY){
  ready=meetingConflicts===0&&meetingHolds===0;
  if(ready){
    state='DESIGN_BASELINE_READY';
  }else if(meetingConflicts>0){
    state='DESIGN_BASELINE_PENDING_CONFLICT_RESOLUTION';
  }else{
    state='DESIGN_BASELINE_PENDING_MEETING_HOLD';
  }
  if(meetingConflicts>0)blockers.push(`meeting-conflicts:${meetingConflicts}`);
  if(meetingHolds>0)blockers.push(`meeting-holds:${meetingHolds}`);
}else if(productionClass===PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED){
  if(!webGameplay.pass)blockers.push('web-gameplay-validation-required');
  if(!unityProjectPresent)blockers.push('unity-project-required-for-technical-validation');
  if(!unityTechnical.pass)blockers.push('unity-technical-validation-required');
  ready=webGameplay.pass&&unityProjectPresent&&unityTechnical.pass;
  state=ready?'DEVELOPMENT_BASELINE_READY':'DEVELOPMENT_BASELINE_PENDING_VALIDATION';
}else if(productionClass===PRODUCTION_CLASSES.RELEASE_CONFIRMED){
  state='RELEASE_BASELINE_MANAGED_BY_RELEASE_PIPELINE';
  ready=false;
}

const developmentRequired=productionClass===PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED;
status.baselineGate={
  policyDocument:'COMPANY_FLOW.md',
  productionClass,
  tierAlias,
  tier:tierAlias,
  state,
  ready,
  blockers,
  meeting:{
    conflictCount:meetingConflicts,
    holdCount:meetingHolds,
    allResolved:meetingConflicts===0&&meetingHolds===0
  },
  evidence:{
    webSmoke:{supportingOnly:true,pass:webSmokePass,source:webSmoke?'company-qa-runtime-evidence.json':null},
    webGameplay:{required:developmentRequired,pass:webGameplay.pass,source:webGameplay.path},
    unityProject:{required:developmentRequired,present:unityProjectPresent,path:clean(game.unityProjectPath)||null},
    unityTechnical:{required:developmentRequired,pass:unityTechnical.pass,source:unityTechnical.path}
  },
  contracts:{
    aiMeetingCompletionDoesNotEqualBaselineApproval:true,
    meetingHoldBlocksDesignBaseline:true,
    meetingConflictBlocksDesignBaseline:true,
    webSmokeDoesNotEqualGameplayValidation:true,
    developmentConfirmedRequiresExplicitWebGameplayValidation:true,
    developmentConfirmedRequiresUnityTechnicalValidation:true,
    releaseConfirmedBaselineOwnedByReleasePipeline:true,
    numericTierIsCompatibilityAliasOnly:true,
    numericTierAliasOwnerRemappable:true
  },
  checkedAt:new Date().toISOString()
};

const coreArtbookPath=path.join('design',gameId,date,'core-artbook.json');
const coreArtbook=readJson(coreArtbookPath,null);
const publishable=ready&&Boolean(coreArtbook)&&[
  'DESIGN_BASELINE_READY',
  'DEVELOPMENT_BASELINE_READY'
].includes(state);
if(publishable){
  const publicPath=path.join('artbook-submissions',gameId,'current.json');
  const published={
    ...coreArtbook,
    version:Math.max(2,Number(coreArtbook.version||1)),
    gameId,
    gameName:game.name,
    date,
    createdAt:date,
    productionClass,
    tierAlias,
    tier:tierAlias,
    status:'completed-artbook',
    lifecycleState:state.replace('_READY',''),
    published:true,
    homepageVisible:true,
    format:'core-strategy',
    sourceFile:coreArtbookPath.replaceAll('\\','/'),
    publication:{
      policyDocument:'COMPANY_FLOW.md',
      baselineGateState:state,
      baselineReady:true,
      publishedAt:new Date().toISOString()
    }
  };
  writeJson(publicPath,published);
  status.artbookPublication={published:true,path:publicPath.replaceAll('\\','/'),baselineGateState:state};
}else{
  status.artbookPublication={published:false,path:null,baselineGateState:state,reason:coreArtbook?'baseline-not-ready':'core-artbook-missing'};
}

let uiStatus='WAITING';
if(publishable)uiStatus='COMPLETE';
else if(ready&&!coreArtbook)uiStatus='WRITING';
const uiLabel={MEETING:'회의중',WRITING:'작성중',WAITING:'대기중',COMPLETE:'완료'}[uiStatus];
const publicStatusPath=path.join('artbook-submissions',gameId,'status.json');
writeJson(publicStatusPath,{
  version:1,
  gameId,
  gameName:game.name,
  date,
  productionClass,
  tierAlias,
  tier:tierAlias,
  uiStatus,
  uiLabel,
  baselineGateState:state,
  baselineReady:ready,
  meeting:{conflictCount:meetingConflicts,holdCount:meetingHolds},
  artbookPublished:publishable,
  currentPublicationRetained:!publishable,
  updatedAt:new Date().toISOString()
});
status.artbookUi={status:uiStatus,label:uiLabel,path:publicStatusPath.replaceAll('\\','/')};

writeJson(statusPath,status);
console.log(`BASELINE_GATE_CLASS=${productionClass}`);
console.log(`BASELINE_GATE_TIER_ALIAS=${tierAlias??'NONE'}`);
console.log(`BASELINE_GATE_STATE=${state}`);
console.log(`BASELINE_GATE_READY=${ready?'YES':'NO'}`);
console.log(`ARTBOOK_UI_STATUS=${uiStatus}`);
console.log(`ARTBOOK_HOMEPAGE_PUBLICATION=${publishable?'PUBLISHED':'NOT_PUBLISHED'}`);
console.log(`WEB_SMOKE_SUPPORT=${webSmokePass?'PASS':'NO_PASS_EVIDENCE'}`);
if(developmentRequired){
  console.log(`WEB_GAMEPLAY_VALIDATION=${webGameplay.pass?'PASS':'PENDING'}`);
  console.log(`UNITY_PROJECT=${unityProjectPresent?'PRESENT':'PENDING'}`);
  console.log(`UNITY_TECHNICAL_VALIDATION=${unityTechnical.pass?'PASS':'PENDING'}`);
}
