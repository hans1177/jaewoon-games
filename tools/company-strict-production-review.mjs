import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {loadSeedState,saveSeedState,normalizeSeedState,activeSeedForGame} from './game-seed-state.mjs';

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
const commonImplementationWeights={coreGameplayLoop:15,systemConnectivity:10,controlsGameFeel:8,functionalUiUx:7,progressionReward:7,riskFailureRetry:5,feedback:4,stabilityPerformance:4};
const categoryWeights={
  SURVIVAL:{worldMovement:8,resourceGathering:7,craftingPreparation:7,threatEnemySystem:7,survivalPressure:6,explorationVariety:5},
  TOWER_DEFENSE:{placementRoute:8,enemyWaves:7,towerVariety:7,upgrades:6,economy:6,strategicChoice:6},
  RPG:{combat:8,questNpc:7,exploration:6,equipmentGrowth:7,enemyBoss:6,storyWorldState:6},
  SIMULATOR_TYCOON:{productionChain:9,upgrades:7,automation:7,economy:7,areaUnlock:5,manualAutomaticChoice:5},
  PUZZLE:{puzzleRules:9,solvability:7,difficultyCurve:7,boardState:6,gimmickVariety:6,puzzleFeedback:5},
  OBBY_PLATFORMER:{movementFeel:9,levelDesign:8,obstacleVariety:7,failureRetry:6,difficultyCurve:6,checkpoints:4},
  BATTLE_SHOOTER:{movement:7,attackHit:8,enemyAi:7,skillCooldown:6,combatObjective:6,combatFeedback:6},
  STORY_ADVENTURE:{exploration:7,quest:7,npcDialogue:6,eventWorldState:6,combatOrPuzzle:6,branchObjective:8},
  ROLEPLAY_LIFE:{worldSpace:7,interaction:7,npc:6,lifeActivities:7,characterState:6,freedomChoice:7}
};
function scoreFlag(pass,weight,partial=0){return pass?weight:partial;}
function significantTokens(value){return [...new Set(clean(value).toLowerCase().split(/[^a-z0-9가-힣]+/).filter(x=>x.length>=3))];}
function sourceBundle(root){if(!root||!fs.existsSync(root))return '';const chunks=[];const walk=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory()){if(!['node_modules','.git'].includes(e.name))walk(p);continue;}if(/\.(html|js|mjs|css|json|lua|luau|cs|verse)$/i.test(e.name)){try{chunks.push(fs.readFileSync(p,'utf8'));}catch{}}}};walk(root);return chunks.join('\n').slice(0,4_000_000);}
function improvementTargets(scores={},scoreWeights={}){return Object.entries(scoreWeights).map(([dimension,maxScore])=>({dimension,current:Number(scores?.[dimension]||0),maxScore,gap:Math.max(0,maxScore-Number(scores?.[dimension]||0))})).filter(x=>x.gap>0).sort((a,b)=>b.gap-a.gap||b.maxScore-a.maxScore||a.dimension.localeCompare(b.dimension)).slice(0,3);}
function finalResult({scores,hardFailures,evidence,reviewStage,passThreshold,rebuildBelow,scoreWeights=designWeights}){const total=Object.values(scores).reduce((a,b)=>a+b,0);let verdict='PASS';if(hardFailures.length||total<passThreshold)verdict=total<rebuildBelow?'REBUILD':'REVISE';const targets=improvementTargets(scores,scoreWeights);return{version:4,gameId,reviewStage,scoreScale:100,passThreshold,excellentThreshold:EXCELLENT_THRESHOLD,excellent:reviewStage==='DESIGN_STRICT_REVIEW'&&total>=EXCELLENT_THRESHOLD&&hardFailures.length===0,totalScore:total,scores,weights:scoreWeights,improvementTargets:targets,hardFailures:[...new Set(hardFailures)],verdict,evidence,policyDocument:'COMPANY_FLOW.md',rules:{scoreCannotOverrideHardGate:true,correctableRejectAction:'FIX_AND_REVALIDATE',structuralRejectAction:'REBUILD_CANDIDATE',officialCardBeforePassForbidden:true,testShelfBeforePassOnly:true,learningRecordRequired:true,improvementPriority:'TOP_3_SCORE_GAPS',implementationScoreComposition:'COMMON_60_PLUS_CATEGORY_40'},reviewedAt:new Date().toISOString()};}
function designReview(){const hard=[];const loops=Array.isArray(seed.CORE_LOOP)?seed.CORE_LOOP:[];const identity=clean(seed.DISTINCT_IDENTITY);const sessionOk=Number(seed.TARGET_SESSION_MINUTES)===30&&/0\s*[~\-]\s*5|30분|30\s*min/i.test(clean(seed.TARGET_SESSION_DIRECTION));const multiplayer=['SINGLE','COOP','COMPETITIVE','HYBRID'].includes(clean(seed.MULTIPLAYER_DESIGN_MODE).toUpperCase());const materials=Array.isArray(seed.SEED_MATERIAL_IDS)?seed.SEED_MATERIAL_IDS:[];const generation=clean(seed.generation).toUpperCase();const materialComposed=generation.includes('MATERIAL')||generation.includes('COMPOSED');const materialContractOk=!materialComposed||(materials.length>=2&&materials.length<=4);const categoryOk=clean(seed.GAME_CATEGORY).length>0;const platformOk=['ROBLOX','UNITY','FORTNITE_UEFN'].includes(clean(seed.INITIAL_TARGET_PLATFORM).toUpperCase());const ideaOk=identity.length>=80&&loops.length>=3&&materialContractOk;if(!sessionOk)hard.push('30MIN_CONTENT_FAIL');if(!multiplayer)hard.push('MULTIPLAYER_MISSING');if(!categoryOk)hard.push('CATEGORY_MISMATCH');if(!ideaOk)hard.push('CORE_FUN_WEAK');const designPath=date?path.join('design',gameId,date,'design-revised.json'):'';const design=readJson(designPath,null);const designText=JSON.stringify(design||{});const storyBearing=/STORY|RPG|ADVENTURE/i.test(clean(seed.GAME_CATEGORY));const storyOk=!storyBearing||/(story|quest|goal|consequence|스토리|퀘스트|목표|결과)/i.test(designText);if(!storyOk)hard.push('STORY_INCOHERENT');const scores={ideaDistinctness:scoreFlag(ideaOk,15,6),categoryFit:scoreFlag(categoryOk&&loops.length>=3,10,4),platformFit:scoreFlag(platformOk,10,0),designFidelity:scoreFlag(Boolean(design),15,8),session30Quality:scoreFlag(sessionOk,15,0),implementationCompleteness:15,storyCausality:scoreFlag(storyOk,10,3),progressionBalance:scoreFlag(/progress|growth|reward|econom|성장|보상|경제/i.test(designText),5,2),artDirectionFidelity:5};return finalResult({scores,hardFailures:hard,evidence:{seedId:seed.seedId,seedGeneration:seed.generation||null,materialContractApplied:materialComposed,materialIds:materials,designPath:designPath||null,multiplayerDesignMode:seed.MULTIPLAYER_DESIGN_MODE,targetSessionMinutes:seed.TARGET_SESSION_MINUTES,reviewContextSource},reviewStage:'DESIGN_STRICT_REVIEW',passThreshold:DESIGN_PASS_THRESHOLD,rebuildBelow:60,scoreWeights:designWeights});}

function categoryProfile(category=''){
  const c=clean(category).toUpperCase();
  if(/ACTION_SURVIVAL|SURVIVAL_HORROR/.test(c))return'SURVIVAL';
  if(/SINGLE_DEFENSE|TOWER_DEFENSE/.test(c))return'TOWER_DEFENSE';
  if(c==='PUZZLE'||/PUZZLE/.test(c))return'PUZZLE';
  if(/SIMULATOR|TYCOON|IDLE_GROWTH/.test(c))return'SIMULATOR_TYCOON';
  if(/STORY_COMPLETE_RPG|STORY_RPG|ADVENTURE_RPG/.test(c))return c.includes('STORY')?'STORY_ADVENTURE':'RPG';
  if(/OBBY|PLATFORM/.test(c))return'OBBY_PLATFORMER';
  if(/BATTLEGROUND|FIGHTING|SHOOTER/.test(c))return'BATTLE_SHOOTER';
  if(/ROLEPLAY|LIFE_AVATAR|CASUAL/.test(c))return'ROLEPLAY_LIFE';
  return'RPG';
}
function categorySignals(profile,lower,metrics={}){
  const has=re=>re.test(lower),m=Number(metrics.uniqueMechanicCount||0),entities=Number(metrics.enemyOrWorldEntityCount||0),deps=Number(metrics.systemDependencyCount||0),retry=Number(metrics.retryPathCount||0)>0;
  const defs={
    SURVIVAL:{worldMovement:has(/move|explor|world|map|position|day|이동|탐험|맵|위치|일차/),resourceGathering:has(/wood|food|stone|ore|resource|collect|gather|채집|자원|식량|광석/),craftingPreparation:has(/craft|build|camp|tool|recipe|제작|건설|야영|도구/),threatEnemySystem:entities>0||has(/enemy|threat|attack|combat|wolf|spider|적|위협|공격|전투/),survivalPressure:has(/hp|health|hunger|damage|surviv|체력|허기|피해|생존/),explorationVariety:entities>=2||has(/zone|region|biome|area|지역|구역|바이옴/)},
    TOWER_DEFENSE:{placementRoute:has(/tower|place|lane|route|grid|타워|배치|경로/),enemyWaves:has(/wave|웨이브/),towerVariety:m>=5&&has(/tower|타워/),upgrades:has(/upgrade|강화|레벨업/),economy:has(/gold|coin|cost|resource|골드|코인|비용|자원/),strategicChoice:deps>=4&&has(/range|damage|slow|choice|전략|선택|사거리|데미지/)},
    RPG:{combat:has(/combat|attack|skill|battle|전투|공격|스킬/),questNpc:has(/quest|npc|dialog|퀘스트|대화|주민/),exploration:has(/explor|world|region|map|탐험|세계|지역|맵/),equipmentGrowth:has(/equip|weapon|armor|level|xp|growth|장비|무기|방어구|레벨|성장/),enemyBoss:entities>0||has(/enemy|boss|monster|적|보스|몬스터/),storyWorldState:has(/story|chapter|event|world state|스토리|챕터|사건|세계/)},
    SIMULATOR_TYCOON:{productionChain:has(/produce|production|mine|smelt|factory|생산|채굴|제련|공장/),upgrades:has(/upgrade|강화|레벨업/),automation:has(/auto|drone|worker|automation|자동|드론|직원/),economy:has(/coin|gold|sell|buy|cost|income|코인|골드|판매|구매|수익/),areaUnlock:has(/unlock|zone|area|region|해금|구역|지역/),manualAutomaticChoice:has(/manual|auto|직접|자동/)||deps>=4},
    PUZZLE:{puzzleRules:has(/puzzle|match|grid|board|gem|퍼즐|매치|보드|블록/),solvability:has(/goal|clear|victory|solve|목표|클리어|해결/),difficultyCurve:has(/difficulty|level|stage|난이도|레벨|스테이지/),boardState:has(/board|grid|cell|tile|보드|그리드|칸|타일/),gimmickVariety:m>=5,puzzleFeedback:has(/combo|score|effect|sound|콤보|점수|효과|사운드/)},
    OBBY_PLATFORMER:{movementFeel:has(/move|jump|velocity|speed|이동|점프|속도/),levelDesign:has(/level|stage|course|레벨|스테이지|코스/),obstacleVariety:has(/obstacle|hazard|platform|장애물|위험|발판/),failureRetry:retry&&has(/fail|death|defeat|실패|죽|패배/),difficultyCurve:has(/difficulty|hard|난이도|어려/),checkpoints:has(/checkpoint|체크포인트/)},
    BATTLE_SHOOTER:{movement:has(/move|distance|position|이동|거리|위치/),attackHit:has(/attack|hit|damage|shoot|공격|타격|데미지|사격/),enemyAi:has(/enemyplan|enemy ai|ai|intent|적 ai|행동 패턴/),skillCooldown:has(/skill|cooldown|energy|스킬|쿨다운|에너지/),combatObjective:has(/round|win|victory|kill|라운드|승리|처치/),combatFeedback:has(/hit|damage|effect|sound|타격|피해|효과|사운드/)},
    STORY_ADVENTURE:{exploration:has(/explor|world|region|map|탐험|세계|지역|맵/),quest:has(/quest|mission|objective|퀘스트|임무|목표/),npcDialogue:has(/npc|dialog|conversation|대화|주민/),eventWorldState:has(/event|chapter|state|사건|챕터|상태/),combatOrPuzzle:has(/combat|attack|puzzle|battle|전투|공격|퍼즐/),branchObjective:has(/branch|choice|objective|선택|분기|목표/)},
    ROLEPLAY_LIFE:{worldSpace:has(/world|room|house|town|area|세계|방|집|마을|지역/),interaction:has(/interact|use|talk|work|상호작용|사용|대화|일/),npc:entities>0||has(/npc|resident|주민|npc/),lifeActivities:has(/job|home|shop|eat|sleep|work|직업|집|상점|먹|잠|일/),characterState:has(/character|avatar|mood|need|money|캐릭터|아바타|기분|욕구|돈/),freedomChoice:has(/choice|free|select|선택|자유/)||m>=5}
  };
  return defs[profile]||defs.RPG;
}
function scoreCategory(profile,lower,metrics={}){
  const weights=categoryWeights[profile]||categoryWeights.RPG,signals=categorySignals(profile,lower,metrics),scores={};
  for(const [key,weight] of Object.entries(weights))scores[`category_${profile}_${key}`]=scoreFlag(Boolean(signals[key]),weight,0);
  const scoreWeights=Object.fromEntries(Object.entries(weights).map(([key,weight])=>[`category_${profile}_${key}`,weight]));
  const total=Object.values(scores).reduce((a,b)=>a+b,0);
  return{profile,scores,scoreWeights,total,matchPass:total>=20,signals};
}
function implementationReview(){
  const hard=[];const source=arg('source');const evidenceFile=arg('evidence');const runtime=readJson(evidenceFile,{});const text=sourceBundle(source);const lower=text.toLowerCase();const baseline=arg('baseline')?readJson(arg('baseline'),{}):{};const artbook=arg('artbook')?readJson(arg('artbook'),{}):{};const designText=JSON.stringify(baseline||{});const artText=JSON.stringify(artbook||{});const coreTokens=significantTokens([...(seed.CORE_LOOP||[]),seed.DISTINCT_IDENTITY].join(' ')).slice(0,24);const matched=coreTokens.filter(t=>lower.includes(t.toLowerCase()));const fidelity=coreTokens.length?matched.length/coreTokens.length:0;const scopeOk=runtime?.pass===true&&runtime?.approvedScopeFullyImplemented!==false&&runtime?.scopeCoverage?.pass!==false;const runtimeOk=runtime?.pass===true;const normalizedSource=String(source).replaceAll('\\','/');const isWeb=clean(runtime?.target).toLowerCase()==='web'||normalizedSource.startsWith('web-games/');const contentDepthOk=!isWeb||runtime?.contentDepthValidation?.pass===true;const playCycleOk=!isWeb||runtime?.initialPlayableCycle?.pass===true;const generic=/contract-safe|generic shell|FULL APPROVED WEB COMPANION|scope-control-/i.test(text);const multiMode=clean(seed.MULTIPLAYER_DESIGN_MODE).toUpperCase();const multiKnown=['SINGLE','COOP','COMPETITIVE','HYBRID'].includes(multiMode);const multiRequired=multiKnown&&multiMode!=='SINGLE';const multiplayerOk=!multiRequired||(Number(runtime?.multiplayer?.participants)>=2&&runtime?.multiplayer?.meaningfulLoopPassed===true);const storyBearing=/STORY|RPG|ADVENTURE/i.test(clean(seed.GAME_CATEGORY));const storyTokens=significantTokens(designText).slice(0,20);const storyMatch=!storyBearing||storyTokens.filter(t=>lower.includes(t)).length>=Math.min(3,storyTokens.length);const artTokens=significantTokens(artText).slice(0,20);const artMatch=!artTokens.length||artTokens.filter(t=>lower.includes(t)).length>=Math.min(2,artTokens.length);const metrics=runtime?.implementationMetrics&&typeof runtime.implementationMetrics==='object'?runtime.implementationMetrics:{};const profile=categoryProfile(seed.GAME_CATEGORY);const category=scoreCategory(profile,lower,metrics);
  if(!scopeOk)hard.push('IMPLEMENTATION_INCOMPLETE');if(!runtimeOk)hard.push('QA_EVIDENCE_MISSING');if(!playCycleOk)hard.push('CORE_FUN_WEAK');if(!contentDepthOk)hard.push('30MIN_CONTENT_FAIL');if(generic)hard.push('GENERIC_TEMPLATE');if(!multiplayerOk)hard.push('MULTIPLAYER_MISSING');if(fidelity<0.2)hard.push('DESIGN_MISMATCH');if(!storyMatch)hard.push('STORY_INCOHERENT');if(!artMatch)hard.push('ARTBOOK_MISMATCH');if(!category.matchPass)hard.push('CATEGORY_MISMATCH');
  const transitions=Number(metrics.meaningfulStateTransitionCount||0),deps=Number(metrics.systemDependencyCount||0),functionalUi=Number(metrics.uniqueFunctionalUiCount||0),actions=Number(metrics.gameplayActionCount||0),retry=Number(metrics.retryPathCount||0),win=Number(metrics.winPathCount||0),fail=Number(metrics.failPathCount||0),screen=Number(metrics.gameplayScreenRatio||0),duplicate=Number(metrics.duplicateActionRatio||1);
  const commonScores={
    coreGameplayLoop:scoreFlag(playCycleOk,15,4),
    systemConnectivity:Math.min(10,Math.round(10*Math.min(1,deps/5))),
    controlsGameFeel:scoreFlag(runtime?.mobileViewport?.touch===true&&actions>=8&&transitions>=6,8,3),
    functionalUiUx:Math.min(7,Math.round(7*Math.min(1,functionalUi/5))),
    progressionReward:scoreFlag(transitions>=8&&/progress|reward|econom|growth|wave|level|성장|보상|경제|웨이브|레벨/i.test(lower),7,2),
    riskFailureRetry:scoreFlag(win>=1&&fail>=1&&retry>=1,5,1),
    feedback:scoreFlag(runtime?.musicRuntime?.pass===true&&transitions>=6,4,1),
    stabilityPerformance:scoreFlag(runtime?.runtimeSmokePassed===true&&screen>=0.18&&duplicate<=0.8,4,1)
  };
  const scores={...commonScores,...category.scores};const scoreWeights={...commonImplementationWeights,...category.scoreWeights};
  return finalResult({scores,hardFailures:hard,evidence:{source,evidenceFile,runtimePass:runtime?.pass===true,runtimeTarget:clean(runtime?.target)||null,designTokenCoverage:fidelity,multiplayerDesignMode:multiMode||'UNKNOWN',multiplayerEvidence:runtime?.multiplayer||null,initialPlayableCyclePassed:playCycleOk,contentDepthValidation:runtime?.contentDepthValidation||null,implementationMetrics:metrics,categoryProfile:profile,categoryScore:category.total,categorySignals:category.signals,reviewContextSource,reviewContextBaselinePath,reviewContextCyclePath},reviewStage:'IMPLEMENTATION_STRICT_REVIEW',passThreshold:IMPLEMENTATION_PASS_THRESHOLD,rebuildBelow:65,scoreWeights});
}
function updateLearning(result){
  state.seedMaterialLearning=state.seedMaterialLearning&&typeof state.seedMaterialLearning==='object'?state.seedMaterialLearning:{};
  const learning=state.seedMaterialLearning;
  learning.events=Array.isArray(learning.events)?learning.events:[];learning.causeCounts=learning.causeCounts&&typeof learning.causeCounts==='object'?learning.causeCounts:{};
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