import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {loadSeedState,saveSeedState,normalizeSeedState,activeSeedForGame} from './game-seed-state.mjs';
import {scoreWebStrictImplementation} from './company-web-validation-evidence-contract.mjs';

const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const arg=name=>{const p=process.argv.find(x=>x.startsWith(`--${name}=`));return p?clean(p.slice(name.length+3)):'';};
const mode=(arg('mode')||'design').toLowerCase();
const gameId=arg('game-id')||clean(process.env.GAME_ID||process.env.ARTBOOK_GAME_ID);
const date=arg('date')||clean(process.env.ARTBOOK_DATE||process.env.DESIGN_DATE);
if(!gameId)throw new Error('STRICT_REVIEW_GAME_ID_REQUIRED');

function runtimeState(){
  let s=loadSeedState();
  if(activeSeedForGame(s,gameId))return s;
  const branch=clean(process.env.COMPANY_RUNTIME_BRANCH);
  if(branch){try{const raw=execFileSync('git',['show',`origin/${branch}:game-seed-state.json`],{encoding:'utf8',maxBuffer:16*1024*1024});s=normalizeSeedState(JSON.parse(raw));}catch{}}
  return s;
}
function runtimeQueueRecord(seedId){
  const match=q=>(Array.isArray(q?.items)?q.items:[]).find(row=>clean(row?.gameId)===gameId&&clean(row?.seedId)===seedId)||null;
  const local=match(readJson('development-queue.json',null));
  if(local)return local;
  const branch=clean(process.env.COMPANY_RUNTIME_BRANCH);
  if(branch){
    try{
      const raw=execFileSync('git',['show',`origin/${branch}:development-queue.json`],{encoding:'utf8',maxBuffer:32*1024*1024});
      return match(JSON.parse(raw));
    }catch{}
  }
  return null;
}
function categoryFromSeedId(seedId){
  const m=clean(seedId).toUpperCase().match(/^SEED-(?:ROBLOX-)?(.+)-\d+$/);
  return clean(m?.[1]||'');
}
function frozenImplementationContext(runtime){
  const baselinePath=arg('baseline');
  if(!baselinePath)throw new Error(`STRICT_REVIEW_ACTIVE_SEED_REQUIRED ${gameId}`);
  const baseline=readJson(baselinePath,null);
  if(!baseline||clean(baseline.gameId)!==gameId)throw new Error(`STRICT_REVIEW_FROZEN_CONTEXT_GAME_MISMATCH ${gameId}`);
  const seedId=clean(baseline.gameSeedId);
  const content=baseline.content&&typeof baseline.content==='object'&&!Array.isArray(baseline.content)?baseline.content:{};
  const identity=clean(content.identity);
  const loops=Array.isArray(content.coreLoop)?content.coreLoop.map(clean).filter(Boolean):[];
  if(!seedId||!identity||!loops.length)throw new Error(`STRICT_REVIEW_FROZEN_CONTEXT_INCOMPLETE ${gameId}`);
  const cyclePath=path.join(path.dirname(baselinePath),'cycle-status.json');
  const cycle=readJson(cyclePath,null);
  if(!cycle||clean(cycle.gameId)!==gameId)throw new Error(`STRICT_REVIEW_FROZEN_CONTEXT_CYCLE_MISMATCH ${gameId}`);
  const historical=(Array.isArray(runtime?.seeds)?runtime.seeds:[]).find(row=>clean(row?.gameId)===gameId&&clean(row?.seedId)===seedId)||null;
  const queued=runtimeQueueRecord(seedId);
  const cycleSeedId=clean(cycle.gameSeed?.seedId||cycle.baselineGate?.evidence?.gameSeed?.seedId||historical?.seedId||queued?.seedId);
  const category=clean(cycle.gameSeed?.category||historical?.GAME_CATEGORY||categoryFromSeedId(seedId));
  const platform=clean(cycle.selectedPlatform||cycle.baselineGate?.evidence?.targetPlatformProject?.platform||cycle.baselineGate?.evidence?.targetPlatformTechnical?.platform||historical?.INITIAL_TARGET_PLATFORM||queued?.selectedPlatform||queued?.targetPlatform).toUpperCase();
  const platformOk=['ROBLOX','UNITY','FORTNITE_UEFN'].includes(platform);
  const canonicalMatch=Boolean(historical||queued);
  if(!canonicalMatch||!cycleSeedId||cycleSeedId!==seedId||!category||!platformOk)throw new Error(`STRICT_REVIEW_FROZEN_CONTEXT_SEED_MISMATCH ${gameId}`);
  const materialIds=Array.isArray(historical?.SEED_MATERIAL_IDS)?historical.SEED_MATERIAL_IDS.map(clean).filter(Boolean):[];
  const multiplayer=clean(historical?.MULTIPLAYER_DESIGN_MODE);
  const targetMinutes=Number(historical?.TARGET_SESSION_MINUTES);
  const targetDirection=clean(historical?.TARGET_SESSION_DIRECTION);
  const source=historical?'FROZEN_DESIGN_BASELINE+CANONICAL_SEED_RECORD':'FROZEN_DESIGN_BASELINE+CANONICAL_DEVELOPMENT_QUEUE';
  return {seed:{seedId,CORE_LOOP:loops,DISTINCT_IDENTITY:identity,GAME_CATEGORY:category,INITIAL_TARGET_PLATFORM:platform,SEED_MATERIAL_IDS:materialIds,generation:'FROZEN_DESIGN_CONTEXT',MULTIPLAYER_DESIGN_MODE:multiplayer,TARGET_SESSION_MINUTES:Number.isFinite(targetMinutes)?targetMinutes:null,TARGET_SESSION_DIRECTION:targetDirection},source,baselinePath,cyclePath};
}

const state=runtimeState();
const activeSeed=activeSeedForGame(state,gameId);
let seed=activeSeed;
let reviewContextSource='ACTIVE_SEED';
let reviewContextBaselinePath=null;
let reviewContextCyclePath=null;
if(!seed){
  if(mode!=='web'&&mode!=='implementation')throw new Error(`STRICT_REVIEW_ACTIVE_SEED_REQUIRED ${gameId}`);
  const frozen=frozenImplementationContext(state);
  seed=frozen.seed;reviewContextSource=frozen.source;reviewContextBaselinePath=frozen.baselinePath;reviewContextCyclePath=frozen.cyclePath;
}

const DESIGN_PASS_THRESHOLD=80;
const IMPLEMENTATION_PASS_THRESHOLD=90;
const EXCELLENT_THRESHOLD=90;
const designWeights={ideaDistinctness:15,categoryFit:10,platformFit:10,designFidelity:15,session30Quality:15,implementationCompleteness:15,storyCausality:10,progressionBalance:5,artDirectionFidelity:5};
function scoreFlag(pass,weight,partial=0){return pass?weight:partial;}
function significantTokens(value){return [...new Set(clean(value).toLowerCase().split(/[^a-z0-9가-힣]+/).filter(x=>x.length>=3))];}
function sourceBundle(root){if(!root||!fs.existsSync(root))return '';const chunks=[];const walk=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory()){if(!['node_modules','.git'].includes(e.name))walk(p);continue;}if(/\.(html|js|mjs|css|json|lua|luau|cs|verse)$/i.test(e.name)){try{chunks.push(fs.readFileSync(p,'utf8'));}catch{}}}};walk(root);return chunks.join('\n').slice(0,4_000_000);}
function improvementTargets(scores={},scoreWeights=designWeights){return Object.entries(scoreWeights).map(([dimension,maxScore])=>({dimension,current:Number(scores?.[dimension]||0),maxScore,gap:Math.max(0,maxScore-Number(scores?.[dimension]||0))})).filter(x=>x.gap>0).sort((a,b)=>b.gap-a.gap||b.maxScore-a.maxScore||a.dimension.localeCompare(b.dimension)).slice(0,3);}
function finalResult({scores,hardFailures,evidence,reviewStage,passThreshold,rebuildBelow,scoreWeights=designWeights}){const total=Object.values(scores).reduce((a,b)=>a+Number(b||0),0);let verdict='PASS';if(hardFailures.length||total<passThreshold)verdict=total<rebuildBelow?'REBUILD':'REVISE';const targets=improvementTargets(scores,scoreWeights);return{version:4,gameId,reviewStage,scoreScale:100,passThreshold,excellentThreshold:EXCELLENT_THRESHOLD,excellent:reviewStage==='DESIGN_STRICT_REVIEW'&&total>=EXCELLENT_THRESHOLD&&hardFailures.length===0,totalScore:total,scores,weights:scoreWeights,improvementTargets:targets,hardFailures:[...new Set(hardFailures)],verdict,evidence,policyDocument:'COMPANY_FLOW.md',rules:{scoreCannotOverrideHardGate:true,correctableRejectAction:'FIX_AND_REVALIDATE',structuralRejectAction:'REBUILD_CANDIDATE',officialCardBeforePassForbidden:true,testShelfBeforePassOnly:true,learningRecordRequired:true,improvementPriority:'TOP_3_SCORE_GAPS',implementationScoreComposition:reviewStage==='IMPLEMENTATION_STRICT_REVIEW'?'COMMON_60_PLUS_CATEGORY_40':'LEGACY_DESIGN_100',initialWebStrictRequires30Minutes:false,final30MinuteContentDepthValidationOnly:true},reviewedAt:new Date().toISOString()};}
function designReview(){const hard=[];const loops=Array.isArray(seed.CORE_LOOP)?seed.CORE_LOOP:[];const identity=clean(seed.DISTINCT_IDENTITY);const sessionOk=Number(seed.TARGET_SESSION_MINUTES)===30&&/0\s*[~\-]\s*5|30분|30\s*min/i.test(clean(seed.TARGET_SESSION_DIRECTION));const multiplayer=['SINGLE','COOP','COMPETITIVE','HYBRID'].includes(clean(seed.MULTIPLAYER_DESIGN_MODE).toUpperCase());const materials=Array.isArray(seed.SEED_MATERIAL_IDS)?seed.SEED_MATERIAL_IDS:[];const generation=clean(seed.generation).toUpperCase();const materialComposed=generation.includes('MATERIAL')||generation.includes('COMPOSED');const materialContractOk=!materialComposed||(materials.length>=2&&materials.length<=4);const categoryOk=clean(seed.GAME_CATEGORY).length>0;const platformOk=['ROBLOX','UNITY','FORTNITE_UEFN'].includes(clean(seed.INITIAL_TARGET_PLATFORM).toUpperCase());const ideaOk=identity.length>=80&&loops.length>=3&&materialContractOk;if(!sessionOk)hard.push('30MIN_CONTENT_FAIL');if(!multiplayer)hard.push('MULTIPLAYER_MISSING');if(!categoryOk)hard.push('CATEGORY_MISMATCH');if(!ideaOk)hard.push('CORE_FUN_WEAK');const designPath=date?path.join('design',gameId,date,'design-revised.json'):'';const design=readJson(designPath,null);const designText=JSON.stringify(design||{});const storyBearing=/STORY|RPG|ADVENTURE/i.test(clean(seed.GAME_CATEGORY));const storyOk=!storyBearing||/(story|quest|goal|consequence|스토리|퀘스트|목표|결과)/i.test(designText);if(!storyOk)hard.push('STORY_INCOHERENT');const scores={ideaDistinctness:scoreFlag(ideaOk,15,6),categoryFit:scoreFlag(categoryOk&&loops.length>=3,10,4),platformFit:scoreFlag(platformOk,10,0),designFidelity:scoreFlag(Boolean(design),15,8),session30Quality:scoreFlag(sessionOk,15,0),implementationCompleteness:15,storyCausality:scoreFlag(storyOk,10,3),progressionBalance:scoreFlag(/progress|growth|reward|econom|성장|보상|경제/i.test(designText),5,2),artDirectionFidelity:5};return finalResult({scores,hardFailures:hard,evidence:{seedId:seed.seedId,seedGeneration:seed.generation||null,materialContractApplied:materialComposed,materialIds:materials,designPath:designPath||null,multiplayerDesignMode:seed.MULTIPLAYER_DESIGN_MODE,targetSessionMinutes:seed.TARGET_SESSION_MINUTES,reviewContextSource},reviewStage:'DESIGN_STRICT_REVIEW',passThreshold:DESIGN_PASS_THRESHOLD,rebuildBelow:60,scoreWeights:designWeights});}
function implementationReview(){
  const hard=[];const source=arg('source');const evidenceFile=arg('evidence');const runtime=readJson(evidenceFile,{});const text=sourceBundle(source);const lower=text.toLowerCase();const baseline=arg('baseline')?readJson(arg('baseline'),{}):{};const artbook=arg('artbook')?readJson(arg('artbook'),{}):{};const designText=JSON.stringify(baseline||{});const artText=JSON.stringify(artbook||{});const coreTokens=significantTokens([...(seed.CORE_LOOP||[]),seed.DISTINCT_IDENTITY].join(' ')).slice(0,24);const matched=coreTokens.filter(t=>lower.includes(t.toLowerCase()));const fidelity=coreTokens.length?matched.length/coreTokens.length:0;const normalizedSource=String(source).replaceAll('\\','/');const isWeb=clean(runtime?.target).toLowerCase()==='web'||normalizedSource.startsWith('web-games/');const scopeOk=runtime?.approvedScopeFullyImplemented===true&&runtime?.scopeCoverage?.pass===true;const runtimeEvidencePresent=Boolean(evidenceFile&&runtime&&typeof runtime==='object'&&Object.keys(runtime).length);const generic=/contract-safe|generic shell|vibe2-final\.js/i.test(text);const multiMode=clean(seed.MULTIPLAYER_DESIGN_MODE).toUpperCase();const multiKnown=['SINGLE','COOP','COMPETITIVE','HYBRID'].includes(multiMode);const multiRequired=multiKnown&&multiMode!=='SINGLE';const multiplayerOk=!multiRequired||(Number(runtime?.multiplayer?.participants)>=2&&runtime?.multiplayer?.meaningfulLoopPassed===true);const storyBearing=/STORY|RPG|ADVENTURE/i.test(clean(seed.GAME_CATEGORY));const storyTokens=significantTokens(designText).slice(0,20);const storyMatch=!storyBearing||storyTokens.filter(t=>lower.includes(t)).length>=Math.min(3,storyTokens.length);const artTokens=significantTokens(artText).slice(0,20);const artMatch=!artTokens.length||artTokens.filter(t=>lower.includes(t)).length>=Math.min(2,artTokens.length);
  if(isWeb){
    const webScore=scoreWebStrictImplementation({category:seed.GAME_CATEGORY,sourceText:text,evidence:runtime});
    hard.push(...webScore.hardFailures);
    if(!scopeOk)hard.push('IMPLEMENTATION_INCOMPLETE');
    if(!runtimeEvidencePresent)hard.push('QA_EVIDENCE_MISSING');
    if(generic)hard.push('GENERIC_TEMPLATE');
    if(!multiplayerOk)hard.push('MULTIPLAYER_MISSING');
    if(fidelity<0.2)hard.push('DESIGN_MISMATCH');
    if(!storyMatch)hard.push('STORY_INCOHERENT');
    if(!artMatch)hard.push('ARTBOOK_MISMATCH');
    const runtimePass=webScore.hardFailures.length===0&&scopeOk&&runtimeEvidencePresent;
    return finalResult({scores:webScore.scores,hardFailures:hard,evidence:{source,evidenceFile,runtimePass,runtimeTarget:clean(runtime?.target)||'web',designTokenCoverage:fidelity,multiplayerDesignMode:multiMode||'UNKNOWN',multiplayerEvidence:runtime?.multiplayer||null,realGameHardGates:webScore.hardGates,initialPlayableCyclePassed:webScore.hardGates.COMPLETE_PLAYABLE_CYCLE_REQUIRED===true,implementationMetrics:webScore.metrics,commonScore:webScore.commonScore,categoryScore:webScore.categoryScore,categoryProfile:webScore.categoryProfile,observedCategoryProfile:webScore.observedCategoryProfile,categoryMatchPassed:webScore.categoryMatchPassed,categoryCandidates:webScore.categoryCandidates,categorySignals:webScore.categorySignals,harnessIndicators:webScore.harnessIndicators,finalContentDepthRequiredAtTop30:true,finalContentDepthPassed:runtime?.contentDepthValidation?.pass===true,initialStrict30MinuteHardGate:false,reviewContextSource,reviewContextBaselinePath,reviewContextCyclePath},reviewStage:'IMPLEMENTATION_STRICT_REVIEW',passThreshold:IMPLEMENTATION_PASS_THRESHOLD,rebuildBelow:65,scoreWeights:webScore.weights});
  }
  const runtimeOk=runtime?.pass===true;const legacySessionMarker=/30\s*(minute|min|분)|data-session-minutes=["']30/i.test(text)||Number(runtime?.sessionDepthMinutes)>=30;const sessionOk=legacySessionMarker;const nativeHard=[...hard];if(!scopeOk)nativeHard.push('IMPLEMENTATION_INCOMPLETE');if(!runtimeOk)nativeHard.push('QA_EVIDENCE_MISSING');if(!sessionOk)nativeHard.push('30MIN_CONTENT_FAIL');if(generic)nativeHard.push('GENERIC_TEMPLATE');if(!multiplayerOk)nativeHard.push('MULTIPLAYER_MISSING');if(fidelity<0.2)nativeHard.push('DESIGN_MISMATCH');if(!storyMatch)nativeHard.push('STORY_INCOHERENT');if(!artMatch)nativeHard.push('ARTBOOK_MISMATCH');
  const scores={ideaDistinctness:scoreFlag(!generic,15,3),categoryFit:scoreFlag(fidelity>=0.2,10,4),platformFit:scoreFlag(runtime?.mobileViewport?.touch===true,10,5),designFidelity:Math.round(15*Math.min(1,fidelity*2)),session30Quality:scoreFlag(sessionOk,15,0),implementationCompleteness:scoreFlag(scopeOk&&runtimeOk,15,4),storyCausality:scoreFlag(storyMatch,10,3),progressionBalance:scoreFlag(/progress|reward|econom|growth|wave|level|성장|보상|경제/i.test(lower),5,2),artDirectionFidelity:scoreFlag(artMatch,5,1)};
  return finalResult({scores,hardFailures:nativeHard,evidence:{source,evidenceFile,runtimePass:runtime?.pass===true,runtimeTarget:clean(runtime?.target)||null,designTokenCoverage:fidelity,multiplayerDesignMode:multiMode||'UNKNOWN',multiplayerEvidence:runtime?.multiplayer||null,sessionDepthMinutes:runtime?.sessionDepthMinutes||null,structuredWebSessionRequired:false,structuredWebSessionPassed:sessionOk,sessionContract:runtime?.sessionContract||null,reviewContextSource,reviewContextBaselinePath,reviewContextCyclePath},reviewStage:'IMPLEMENTATION_STRICT_REVIEW',passThreshold:IMPLEMENTATION_PASS_THRESHOLD,rebuildBelow:65,scoreWeights:designWeights});
}
function updateLearning(result){
  state.seedMaterialLearning=state.seedMaterialLearning&&typeof state.seedMaterialLearning==='object'?state.seedMaterialLearning:{};
  const learning=state.seedMaterialLearning;
  learning.events=Array.isArray(learning.events)?learning.events:[];
  learning.causeCounts=learning.causeCounts&&typeof learning.causeCounts==='object'?learning.causeCounts:{};
  const rows=(state.seedMaterials||[]).filter(row=>(seed.SEED_MATERIAL_IDS||[]).includes(row.materialId));
  const families=[...new Set(rows.map(row=>row.sourceFamily).filter(Boolean))];
  const validated=result.reviewStage==='IMPLEMENTATION_STRICT_REVIEW'&&result.evidence?.runtimePass===true;
  const previous=[...learning.events].reverse().find(e=>e.gameId===gameId&&e.reviewStage===result.reviewStage&&e.validatedRealEvidence===true);
  const previousScore=Number.isFinite(Number(previous?.totalScore))?Number(previous.totalScore):null;
  const scoreDelta=previousScore==null?null:result.totalScore-previousScore;
  const previousHard=new Set(Array.isArray(previous?.hardFailures)?previous.hardFailures:[]);
  const currentHard=new Set(result.hardFailures||[]);
  const resolvedHardFailures=[...previousHard].filter(x=>!currentHard.has(x));
  const addedHardFailures=[...currentHard].filter(x=>!previousHard.has(x));
  const learningSignal=!validated?'UNVALIDATED':result.verdict==='PASS'?'POSITIVE_SUCCESS':result.totalScore>=80&&result.totalScore<90&&result.hardFailures.length===0?'IMPROVEMENT_80_89':'NEGATIVE_OR_REBUILD';
  learning.events.push({gameId,seedId:seed.seedId,reviewStage:result.reviewStage,runtimeTarget:result.evidence?.runtimeTarget||null,verdict:result.verdict,totalScore:result.totalScore,previousScore,scoreDelta,hardFailures:result.hardFailures,resolvedHardFailures,addedHardFailures,improvementTargets:result.improvementTargets||[],learningSignal,materialFamilies:families,validatedRealEvidence:validated,reviewContextSource,recordedAt:result.reviewedAt});
  learning.events=learning.events.slice(-500);
  for(const cause of result.hardFailures)learning.causeCounts[cause]=Number(learning.causeCounts[cause]||0)+1;
  const passCounts={},rebuildCounts={};
  for(const e of learning.events){if(!e.validatedRealEvidence)continue;for(const f of e.materialFamilies||[]){if(e.learningSignal==='POSITIVE_SUCCESS')passCounts[f]=(passCounts[f]||0)+1;if(e.learningSignal==='NEGATIVE_OR_REBUILD'||e.verdict==='REBUILD')rebuildCounts[f]=(rebuildCounts[f]||0)+1;}}
  learning.preferSeedMaterialFamilies=Object.keys(passCounts).filter(f=>passCounts[f]>=2&&passCounts[f]>Number(rebuildCounts[f]||0)).sort();
  learning.avoidSeedMaterialFamilies=Object.keys(rebuildCounts).filter(f=>rebuildCounts[f]>=2&&rebuildCounts[f]>Number(passCounts[f]||0)).sort();
  learning.rules={designOpinionDoesNotBecomeTrainingSuccess:true,validatedRuntimeRequiredForPreferenceSignals:true,failuresAndFixesRetained:true,scoreDeltaAndFixOutcomeRetained:true,partial80To89IsImprovementSignalNotPositiveSuccess:true,positiveSuccessRequires90PlusAndHardGateClear:true,copyOriginalExpressionForbidden:true,signalsGuideSelectionButDoNotForceCopy:true};
  learning.updatedAt=new Date().toISOString();
  try{const stateOutput=clean(process.env.COMPANY_STRICT_STATE_OUTPUT);saveSeedState(state,stateOutput||undefined);}catch{}
}
const result=mode==='web'||mode==='implementation'?implementationReview():designReview();
const output=arg('output')||(date?path.join('design',gameId,date,mode==='design'?'strict-design-review.json':'strict-implementation-review.json'):`strict-${mode}-review.json`);
writeJson(output,result);updateLearning(result);
console.log(`STRICT_REVIEW_STAGE=${result.reviewStage}`);console.log(`STRICT_REVIEW_SCORE=${result.totalScore}`);console.log(`STRICT_REVIEW_PASS_THRESHOLD=${result.passThreshold}`);console.log(`STRICT_REVIEW_EXCELLENT=${result.excellent?'YES':'NO'}`);console.log(`STRICT_REVIEW_VERDICT=${result.verdict}`);console.log(`STRICT_REVIEW_HARD_FAILURES=${result.hardFailures.join(',')||'NONE'}`);console.log(`STRICT_REVIEW_IMPROVEMENT_TARGETS=${(result.improvementTargets||[]).map(x=>`${x.dimension}:${x.gap}`).join(',')||'NONE'}`);console.log(`STRICT_REVIEW_CONTEXT=${reviewContextSource}`);console.log('STRICT_REVIEW_LEARNING_RECORDED=YES');
if(result.verdict!=='PASS')process.exitCode=3;
