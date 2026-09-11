import fs from 'node:fs';
import path from 'node:path';
import {PRODUCTION_CLASSES,productionClassOf,tierAliasForProductionClass} from './production-classification.mjs';
import {loadSeedState,saveSeedState,seedForGame,activeSeedForGame,markSeedDiscarded} from './game-seed-state.mjs';

const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clean=v=>String(v??'').trim();
function kstDate(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return`${g('year')}-${g('month')}-${g('day')}`;}
function explicitPass(data,gameId){if(!data||typeof data!=='object'||Array.isArray(data))return false;if(clean(data.gameId)&&clean(data.gameId)!==gameId)return false;const state=clean(data.status||data.result||data.decision).toUpperCase();return data.pass===true||data.validated===true||['PASS','PASSED','VALIDATED','READY'].includes(state);}
function latestDesignValidation(gameId,fileName){const root=path.join('design',gameId);if(!fs.existsSync(root))return{path:null,data:null,pass:false};const dates=fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isDirectory()&&/^\d{4}-\d{2}-\d{2}$/.test(e.name)).map(e=>e.name).sort().reverse();for(const date of dates){const file=path.join(root,date,fileName);if(!fs.existsSync(file))continue;const data=readJson(file,null);return{path:file.replaceAll('\\','/'),data,pass:explicitPass(data,gameId)};}return{path:null,data:null,pass:false};}
function hasValue(v){return Array.isArray(v)?v.length>0:v!==null&&v!==undefined&&clean(v)!=='';}

const gameId=clean(process.env.ARTBOOK_GAME_ID||process.env.GAME_ID||process.argv.find(x=>x.startsWith('--game='))?.split('=')[1]);
const date=clean(process.env.ARTBOOK_DATE||process.env.DESIGN_DATE||kstDate());
if(!gameId)throw new Error('ARTBOOK_GAME_ID or GAME_ID is required');
const directive=readJson('company-directive.json',{});const numericLabels=directive.production?.numericLabels||{};
const catalog=readJson('game-catalog.json',{games:[]});const catalogGame=(catalog.games||[]).find(x=>x.id===gameId)||null;
const seedState=loadSeedState();const seedAny=seedForGame(seedState,gameId);const seedActive=activeSeedForGame(seedState,gameId);
if(!catalogGame&&!seedAny)throw new Error(`Unknown game or GAME_SEED: ${gameId}`);
const productionClass=catalogGame?productionClassOf({},catalogGame,{numericLabels}):PRODUCTION_CLASSES.DESIGN_ONLY;
const derivedTier=catalogGame?tierAliasForProductionClass(productionClass,{numericLabels}):3;
const catalogTier=catalogGame?(Number(catalogGame.productionTier||0)||null):3;
const tierAlias=catalogGame?(derivedTier??catalogTier):3;
const game=catalogGame||{id:gameId,name:seedAny?.gameName||gameId,productionClass:'DESIGN_ONLY',productionTier:3,unityProjectPath:null};
const statusPath=path.join('design',gameId,date,'cycle-status.json');const status=readJson(statusPath,null);if(!status)throw new Error(`cycle-status missing: ${statusPath}`);
const runtime=readJson('company-qa-runtime-evidence.json',{games:[]});const webSmoke=(runtime.games||[]).find(x=>x.gameId===gameId&&x.target==='web')||null;const webSmokePass=Boolean(webSmoke?.runtimeSmokePassed===true&&webSmoke?.qaPassEligible===true&&(!Array.isArray(webSmoke?.blockers)||webSmoke.blockers.length===0));
const webGameplay=latestDesignValidation(gameId,'web-gameplay-validation.json');const unityTechnical=latestDesignValidation(gameId,'unity-technical-validation.json');const revalidation=latestDesignValidation(gameId,'development-revalidation.json');const unityProjectPresent=Boolean(clean(game.unityProjectPath)&&fs.existsSync(clean(game.unityProjectPath)));
const meetingConflicts=Number(status.meeting?.conflictCount||0);const meetingHolds=Number(status.meeting?.holdCount||0);const blockers=[];let state='NOT_APPLICABLE';let ready=false;
let advisoryDisposition=null;let unanimousFatalDiscard=false;

if(productionClass===PRODUCTION_CLASSES.DESIGN_ONLY){
  if(status.status!=='COMPLETE')throw new Error('DESIGN_ONLY cycle must complete before baseline gate');
  advisoryDisposition=clean(status.disposition?.state).toUpperCase()||'MISSING';
  unanimousFatalDiscard=status.disposition?.unanimousFatalDiscard===true;
  if(advisoryDisposition==='DISCARDED'&&unanimousFatalDiscard){
    if(seedAny){markSeedDiscarded(seedState,gameId,{reason:'DESIGN_ONLY_FATAL_REVIEW',timestamp:new Date().toISOString()});saveSeedState(seedState);}
    state='DISCARDED';blockers.push('design-discarded-after-revision-and-five-department-rereview');
  }
  const requiredSeedFields=directive.gameSeed?.requiredFields||[];
  if(!seedActive)blockers.push('active-game-seed-required');
  for(const field of requiredSeedFields)if(!hasValue(seedActive?.[field]))blockers.push(`game-seed-field-required:${field}`);
  const revised=readJson(path.join('design',gameId,date,'design-revised.json'),null)?.content||null;
  if(!clean(revised?.identity))blockers.push('distinct-game-identity-required');
  if(!clean(revised?.coreFun))blockers.push('core-fun-required');
  if(!Array.isArray(revised?.coreLoop)||revised.coreLoop.length<3)blockers.push('core-loop-action-feedback-choice-reward-required');
  if(!clean(revised?.marketTargetDirection))blockers.push('market-target-direction-required');
  if(!clean(revised?.mobileUx))blockers.push('mobile-ux-direction-required');
  if(!clean(revised?.steamExpansionDecision))blockers.push('steam-expansion-decision-required');
  if(!clean(revised?.multiplayerExpansionDecision))blockers.push('multiplayer-expansion-decision-required');
  if(Number(status.departments?.distinctLeadModelCount||0)<5)blockers.push('five-distinct-lead-models-required');
  const audits=Object.values(status.departments?.modelAudit||{});if(audits.length!==5||audits.some(a=>a?.pass!==true))blockers.push('per-department-multimodel-review-pass-required');
  if(status.departments?.repeatedFatalReview!==true||status.disposition?.repeatedFiveDepartmentReview!==true)blockers.push('post-revision-five-department-review-required');
  if(meetingConflicts>0)blockers.push(`meeting-conflicts:${meetingConflicts}`);if(meetingHolds>0)blockers.push(`meeting-holds:${meetingHolds}`);
  if(state==='NOT_APPLICABLE'&&blockers.length===0){state='DESIGN_BASELINE_READY';ready=true;}
  else if(state==='NOT_APPLICABLE')state=meetingConflicts>0?'DESIGN_BASELINE_PENDING_CONFLICT_RESOLUTION':meetingHolds>0?'DESIGN_BASELINE_PENDING_MEETING_HOLD':'DESIGN_BASELINE_REDESIGN_REQUIRED';
}else if(productionClass===PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED){
  const declared=clean(status.state).toUpperCase();const allowed=new Set([...(directive.classes?.DEVELOPMENT_CONFIRMED?.waitingStates||[]),...(directive.classes?.DEVELOPMENT_CONFIRMED?.terminalStates||[])]);if(!allowed.has(declared))throw new Error(`Invalid DEVELOPMENT_CONFIRMED direct state: ${declared||'EMPTY'}`);state=declared;if(!webGameplay.pass)blockers.push('web-gameplay-validation-required');if(!unityProjectPresent)blockers.push('unity-project-required-for-technical-validation');if(!unityTechnical.pass)blockers.push('unity-technical-validation-required');for(const blocker of status.blockers||[])if(!blockers.includes(blocker))blockers.push(blocker);ready=state==='DEVELOPMENT_BASELINE_READY'&&webGameplay.pass&&unityProjectPresent&&unityTechnical.pass&&blockers.length===0;if(state==='DEVELOPMENT_BASELINE_READY'&&!ready)throw new Error(`False DEVELOPMENT_BASELINE_READY: ${blockers.join(',')}`);
}else if(productionClass===PRODUCTION_CLASSES.RELEASE_CONFIRMED){state='RELEASE_BASELINE_MANAGED_BY_RELEASE_PIPELINE';ready=false;}

const developmentRequired=productionClass===PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED;
status.baselineGate={policyDocument:'COMPANY_FLOW.md',productionClass,tierAlias,tier:tierAlias,state,ready,blockers,advisoryDisposition,unanimousFatalDiscard,meeting:{conflictCount:meetingConflicts,holdCount:meetingHolds,allResolved:meetingConflicts===0&&meetingHolds===0},evidence:{gameSeed:{required:productionClass===PRODUCTION_CLASSES.DESIGN_ONLY,present:Boolean(seedActive),seedId:seedActive?.seedId||null,source:seedActive?'game-seed-state.json':null},webSmoke:{supportingOnly:true,pass:webSmokePass,source:webSmoke?'company-qa-runtime-evidence.json':null},webGameplay:{required:developmentRequired,pass:webGameplay.pass,source:webGameplay.path},unityProject:{required:developmentRequired,present:unityProjectPresent,path:clean(game.unityProjectPath)||null},unityTechnical:{required:developmentRequired,pass:unityTechnical.pass,source:unityTechnical.path},revalidation:{conditional:true,pass:revalidation.pass,source:revalidation.path}},contracts:{aiMeetingCompletionDoesNotEqualBaselineApproval:true,gameSeedRequiredBeforeDesignBaseline:true,marketEvidenceIsTargetReferenceNotHardGate:true,meetingHoldBlocksDesignBaseline:true,meetingConflictBlocksDesignBaseline:true,minorityLeadRedesignOrDiscardIsAdvisoryOnly:true,unanimousFatalDiscardRequiredToDiscard:true,postRevisionFiveDepartmentReviewRequiredBeforeDiscard:true,designArtbookOnlyAfterBaselineReady:true,designOnlyVibe2Forbidden:true,webSmokeDoesNotEqualGameplayValidation:true,developmentConfirmedIsGatedDirect:true,developmentConfirmedResumesFromLatestEvidence:true,developmentConfirmedRequiresExplicitWebGameplayValidation:true,developmentConfirmedRequiresUnityTechnicalValidation:true,developmentArtbookOnlyAfterBaselineReady:true,releaseConfirmedBaselineOwnedByReleasePipeline:true,numericTierIsCompatibilityAliasOnly:true},checkedAt:new Date().toISOString()};

let uiStatus='WAITING';if(productionClass===PRODUCTION_CLASSES.DESIGN_ONLY&&ready)uiStatus='WRITING';else if(productionClass===PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED&&ready&&status.artbook)uiStatus='COMPLETE';
const uiLabel={WRITING:'작성중',WAITING:'대기중',COMPLETE:'완료'}[uiStatus];const publicStatusPath=path.join('artbook-submissions',gameId,'status.json');writeJson(publicStatusPath,{version:3,gameId,gameName:game.name,date,productionClass,tierAlias,tier:tierAlias,uiStatus,uiLabel,baselineGateState:state,baselineReady:ready,meeting:{conflictCount:meetingConflicts,holdCount:meetingHolds},artbookPublished:Boolean(status.artbookPublication?.published),currentPublicationRetained:true,nextAction:status.nextAction||null,updatedAt:new Date().toISOString()});
status.artbookUi={status:uiStatus,label:uiLabel,path:publicStatusPath.replaceAll('\\','/')};
if(productionClass===PRODUCTION_CLASSES.DESIGN_ONLY)status.artbookPublication={published:false,path:null,baselineGateState:state,reason:ready?'awaiting-post-baseline-artbook-editor':'baseline-not-ready'};
writeJson(statusPath,status);
console.log(`BASELINE_GATE_CLASS=${productionClass}`);console.log(`BASELINE_GATE_TIER_ALIAS=${tierAlias??'NONE'}`);console.log(`BASELINE_GATE_STATE=${state}`);console.log(`BASELINE_GATE_READY=${ready?'YES':'NO'}`);console.log(`ARTBOOK_UI_STATUS=${uiStatus}`);if(productionClass===PRODUCTION_CLASSES.DESIGN_ONLY){console.log(`DESIGN_ADVISORY_DISPOSITION=${advisoryDisposition||'NONE'}`);console.log(`DESIGN_UNANIMOUS_FATAL_DISCARD=${unanimousFatalDiscard?'YES':'NO'}`);console.log('DESIGN_ARTBOOK_CREATED_BY_GATE=NO');console.log(`GAME_SEED_GATE=${seedActive?'PASS':'FAIL'}`);}console.log(`WEB_SMOKE_SUPPORT=${webSmokePass?'PASS':'NO_PASS_EVIDENCE'}`);if(developmentRequired){console.log(`WEB_GAMEPLAY_VALIDATION=${webGameplay.pass?'PASS':'PENDING'}`);console.log(`UNITY_PROJECT=${unityProjectPresent?'PRESENT':'PENDING'}`);console.log(`UNITY_TECHNICAL_VALIDATION=${unityTechnical.pass?'PASS':'PENDING'}`);console.log(`DEVELOPMENT_DIRECT_STATE=${state}`);}
