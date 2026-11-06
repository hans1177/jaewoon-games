// 파일명: assets/vibe-company-experiment.js
// 역할: 재운컴퍼니 Vibe2의 게임별 프로필, 위험분류, A/B 실험, 중반붕괴, 정체성/보스, 성공·실패 학습 계약
// 원칙: 작은 실험과 증거를 만들 뿐 공개판 자동승격/게임규칙 무단변경은 하지 않는다.

const clean=v=>String(v??'').trim();
const list=v=>Array.isArray(v)?v:[];
const uniq=v=>[...new Set(list(v).map(clean).filter(Boolean))];
const freeze=v=>Object.freeze(v);
const freezeList=v=>freeze([...v]);
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number(n)||0));

export const VIBE_COMPANY_RISKS=freezeList(['SAFE','NORMAL','MAJOR']);
export const VIBE_EXPERIMENT_VERDICTS=freezeList(['ADOPT','REVISE','HOLD','REJECT','REDESIGN']);
export const REQUIRED_PROFILE_FIELDS=freezeList(['gameId','repository','path','saveKeys','protectedValues','coreSystems','protectedFiles','mobileTargets','performanceTargets']);
export const AB_CONDITION_FIELDS=freezeList(['device','resolution','playtime','segment','input']);

function filledArray(v){return Array.isArray(v)}
function normalizedTerms(value){
  const source=Array.isArray(value)?value.join(' '):clean(value);
  return [...new Set(source.toLowerCase().split(/[^\p{L}\p{N}_-]+/u).filter(x=>x.length>1))];
}
function jaccard(a,b){
  const A=new Set(normalizedTerms(a)),B=new Set(normalizedTerms(b));
  if(!A.size&&!B.size)return 0;
  let intersection=0;for(const x of A)if(B.has(x))intersection++;
  return intersection/(new Set([...A,...B]).size||1);
}

export function classifyVibeCompanyRisk(input={}){
  const reasons=[];
  const protectedChanges=uniq(input.protectedChanges);
  const majorFlags=[
    ['save-schema',input.saveSchemaChange],['save-key',input.saveKeyChange],['core-loop',input.coreLoopChange],
    ['progression-model',input.progressionChange],['economy-model',input.economyChange],['public-route',input.publicRouteChange],
    ['project-structure',input.projectStructureChange],['mass-content',input.massContentChange]
  ];
  for(const [name,on] of majorFlags)if(on===true)reasons.push(name);
  if(protectedChanges.length)reasons.push(`protected:${protectedChanges.join(',')}`);
  const normalFlags=[
    ['balance',input.balanceChange],['enemy-ai',input.enemyAIChange],['new-feature',input.newFeature],
    ['asset-replacement',input.assetReplacement],['motion-engine',input.motionEngineChange],['ui-flow',input.uiFlowChange]
  ];
  const normalReasons=[];for(const [name,on] of normalFlags)if(on===true)normalReasons.push(name);
  const risk=reasons.length?'MAJOR':normalReasons.length?'NORMAL':'SAFE';
  return freeze({risk,reasons:freezeList([...reasons,...normalReasons]),requiresJay:risk==='MAJOR',stableAMustRemain:true});
}

export function createVibeGameProfile(input={}){
  const profile={
    version:1,
    gameId:clean(input.gameId),
    gameName:clean(input.gameName),
    repository:clean(input.repository),
    path:clean(input.path),
    saveKeys:freezeList(uniq(input.saveKeys)),
    protectedValues:freezeList(uniq(input.protectedValues)),
    coreSystems:freezeList(uniq(input.coreSystems)),
    protectedFiles:freezeList(uniq(input.protectedFiles)),
    mobileTargets:freezeList(uniq(input.mobileTargets)),
    performanceTargets:freeze({...input.performanceTargets}),
    identitySentence:clean(input.identitySentence),
    forbiddenPatterns:freezeList(uniq(input.forbiddenPatterns)),
    status:clean(input.status)||'NEEDS_AUDIT',
    evidence:freezeList(uniq(input.evidence)),
  };
  const missing=[];
  if(!profile.gameId)missing.push('gameId');
  if(!profile.repository)missing.push('repository');
  if(!profile.path)missing.push('path');
  for(const key of ['saveKeys','protectedValues','coreSystems','protectedFiles','mobileTargets'])if(!filledArray(input[key]))missing.push(key);
  if(!input.performanceTargets||typeof input.performanceTargets!=='object'||Array.isArray(input.performanceTargets))missing.push('performanceTargets');
  return freeze({...profile,valid:missing.length===0,missing:freezeList(missing)});
}

export function createVibeExperimentBundle(input={}){
  const safe=uniq(input.safeImprovements),risky=uniq(input.riskyIdeas);
  const conditions={};for(const key of AB_CONDITION_FIELDS)conditions[key]=clean(input.conditions?.[key]);
  const invalidConditions=AB_CONDITION_FIELDS.filter(key=>!conditions[key]);
  const profile=createVibeGameProfile(input.profile||{});
  const baselineRef=clean(input.baselineRef),candidateRef=clean(input.candidateRef);
  const errors=[];
  if(safe.length<2)errors.push('SAFE_EXPERIMENTS_LT_2');
  if(risky.length<1)errors.push('RISKY_EXPERIMENT_LT_1');
  if(!baselineRef)errors.push('BASELINE_REF_MISSING');
  if(!candidateRef)errors.push('CANDIDATE_REF_MISSING');
  if(invalidConditions.length)errors.push('AB_CONDITIONS_INCOMPLETE');
  if(!profile.valid)errors.push('GAME_PROFILE_INVALID');
  return freeze({
    version:1,gameId:profile.gameId,profile,baselineRef,candidateRef,
    safeImprovements:freezeList(safe),riskyIdeas:freezeList(risky),conditions:freeze(conditions),
    expected:freeze({...input.expected}),risk:classifyVibeCompanyRisk(input.risk||{}),
    ready:errors.length===0,errors:freezeList(errors),stableAProtected:true,publicAutoApply:false,
  });
}

export function evaluateVibeABResult(input={}){
  const before=Number(input.baselineScore),after=Number(input.candidateScore),delta=after-before;
  const categoryDeltas=freeze({...input.categoryDeltas});
  const regressions=uniq(input.regressions);
  let verdict='HOLD';
  if(Number.isFinite(delta)){
    if(regressions.length)verdict='REJECT';
    else if(delta>0)verdict='ADOPT';
    else if(delta===0)verdict='REVISE';
    else verdict='REJECT';
  }
  return freeze({baselineScore:before,candidateScore:after,delta,categoryDeltas,regressions:freezeList(regressions),verdict,mayPromote:verdict==='ADOPT',companyGateStillRequired:true});
}

function checkpoint(row={}){
  return {
    repetition:clamp(row.repetition),storyStall:clamp(row.storyStall),growthStall:clamp(row.growthStall),
    contentDepletion:clamp(row.contentDepletion),difficultySpike:clamp(row.difficultySpike),rewardMeaninglessness:clamp(row.rewardMeaninglessness),
    noveltyShortage:clamp(row.noveltyShortage),
  };
}
export function evaluateMidgameCollapse(input={}){
  const points={30:checkpoint(input.progress30),50:checkpoint(input.progress50),70:checkpoint(input.progress70)};
  const rows=Object.entries(points).map(([progress,data])=>{
    const values=Object.values(data),average=values.reduce((a,b)=>a+b,0)/(values.length||1),severe=values.filter(v=>v>=70).length;
    return freeze({progress:Number(progress),score:Math.round(average),severe,collapsed:average>=55||severe>=2,signals:freeze(data)});
  });
  const worst=[...rows].sort((a,b)=>b.score-a.score)[0];
  return freeze({pass:rows.every(r=>!r.collapsed),rows:freezeList(rows),worstProgress:worst?.progress??null,worstScore:worst?.score??0});
}

export function auditVibeIdentity(input={}){
  const sentence=clean(input.identitySentence),signatureSystems=uniq(input.signatureSystems),signatureScenes=uniq(input.signatureScenes);
  const otherGames=list(input.otherGames);
  const comparisons=otherGames.map(game=>{
    const similarity=Math.max(jaccard(signatureSystems,game.signatureSystems),jaccard(input.coreLoop,game.coreLoop),jaccard(input.progression,game.progression),jaccard(input.combat,game.combat));
    return freeze({gameId:clean(game.gameId),name:clean(game.name),similarity:Number(similarity.toFixed(3))});
  }).sort((a,b)=>b.similarity-a.similarity);
  const maxSimilarity=comparisons[0]?.similarity??0;
  const problems=[];
  if(!sentence.includes('때문에')||!sentence.includes('다르다'))problems.push('IDENTITY_SENTENCE_WEAK');
  if(signatureSystems.length<1)problems.push('SIGNATURE_SYSTEM_MISSING');
  if(signatureScenes.length<3)problems.push('SIGNATURE_SCENES_LT_3');
  if(maxSimilarity>=0.72)problems.push('COMPANY_GAME_SIMILARITY_HIGH');
  return freeze({pass:problems.length===0,problems:freezeList(problems),maxSimilarity,comparisons:freezeList(comparisons)});
}

export function auditBossDesign(input={}){
  const testAbility=clean(input.testAbility),features=uniq(input.features),allowed=['unique-pattern','space-use','phase-change','story-meaning','environment-change','new-judgement'];
  const present=features.filter(x=>allowed.includes(x));
  const problems=[];
  if(!testAbility)problems.push('TEST_ABILITY_MISSING');
  if(present.length<2)problems.push('BOSS_FEATURES_LT_2');
  if(input.hpMultiplierOnly===true)problems.push('HP_MULTIPLIER_ONLY');
  if(input.unavoidableAttack===true)problems.push('UNAVOIDABLE_ATTACK');
  return freeze({pass:problems.length===0,testAbility,features:freezeList(present),problems:freezeList(problems)});
}

export function classifyPlayLogSignals(input={}){
  const signals=[];
  if(Number(input.earlyExitRate)>=0.35)signals.push('EARLY_EXIT_HIGH');
  if(Number(input.deathClusterRatio)>=0.4)signals.push('DEATH_CLUSTER');
  if(Number(input.repeatActionRatio)>=0.65)signals.push('REPETITIVE_ACTION');
  if(Number(input.unusedSystemRatio)>=0.5)signals.push('SYSTEM_UNUSED');
  if(Number(input.uiMisclickRate)>=0.12)signals.push('UI_FRICTION');
  if(Number(input.longIdleRatio)>=0.25)signals.push('GOAL_UNCLEAR_OR_WAITING');
  return freeze({signals:freezeList(signals),needsReview:signals.length>0});
}

export function createVibeLearningRecord(input={}){
  const expected=clean(input.expected),actual=clean(input.actual),verdict=clean(input.verdict).toUpperCase()||'HOLD';
  const success=['ADOPT','ADVANCE','VERIFIED'].includes(verdict);
  return freeze({
    version:1,id:clean(input.id),gameId:clean(input.gameId),ideaId:clean(input.ideaId),department:clean(input.department),
    expected,actual,verdict,success,
    why:clean(input.why),failureReason:clean(input.failureReason),retryConditions:freezeList(uniq(input.retryConditions)),
    reusableWhen:freezeList(uniq(input.reusableWhen)),doNotUseWhen:freezeList(uniq(input.doNotUseWhen)),
    evidence:freezeList(uniq(input.evidence)),knowledgeState:success?'VERIFIED':'ANTI_PATTERN_CANDIDATE',
  });
}

export function createDepartmentPredictionRecord(input={}){
  const predicted=Number(input.predictedDelta),actual=Number(input.actualDelta);
  const error=Number.isFinite(predicted)&&Number.isFinite(actual)?Math.abs(predicted-actual):null;
  const directionCorrect=Number.isFinite(predicted)&&Number.isFinite(actual)?Math.sign(predicted)===Math.sign(actual):false;
  return freeze({
    version:1,department:clean(input.department),domain:clean(input.domain),gameId:clean(input.gameId),prediction:clean(input.prediction),
    predictedDelta:predicted,actualDelta:actual,error,directionCorrect,evidence:freezeList(uniq(input.evidence)),
    use:'domain-reference-only-not-ranking',
  });
}

export function createVibeCompanyExperimentPlan(input={}){
  const profile=createVibeGameProfile(input.profile||{});
  const identity=auditVibeIdentity(input.identity||{});
  const boss=input.boss?auditBossDesign(input.boss):null;
  const midgame=input.midgame?evaluateMidgameCollapse(input.midgame):null;
  const playLogs=input.playLogs?classifyPlayLogSignals(input.playLogs):null;
  const bundle=createVibeExperimentBundle({...input.experiment,profile});
  const blockers=[];
  if(!profile.valid)blockers.push('GAME_PROFILE_INVALID');
  if(!identity.pass)blockers.push(...identity.problems);
  if(boss&&!boss.pass)blockers.push(...boss.problems);
  if(midgame&&!midgame.pass)blockers.push('MIDGAME_COLLAPSE');
  return freeze({version:1,profile,identity,boss,midgame,playLogs,bundle,ready:bundle.ready&&blockers.length===0,blockers:freezeList(uniq(blockers)),stableAProtected:true,jayGateRequired:true});
}

if(typeof window!=='undefined'){
  window.JaewoonVibeCompanyExperiment=freeze({
    classifyVibeCompanyRisk,createVibeGameProfile,createVibeExperimentBundle,evaluateVibeABResult,evaluateMidgameCollapse,
    auditVibeIdentity,auditBossDesign,classifyPlayLogSignals,createVibeLearningRecord,createDepartmentPredictionRecord,createVibeCompanyExperimentPlan
  });
}
