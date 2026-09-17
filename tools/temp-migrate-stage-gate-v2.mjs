import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');
const write=(file,text)=>fs.writeFileSync(file,text);
const replaceOne=(text,pattern,replacement,label)=>{
  let count=0;
  const out=text.replace(pattern,(...args)=>{count+=1;return typeof replacement==='function'?replacement(...args):replacement;});
  if(count!==1)throw new Error(`${label}:${count}`);
  return out;
};

{
  const file='tools/company-design-cycle.mjs';
  let s=read(file);
  const schema=`const V2_TEXT={type:'string',maxLength:420};
const DESIGN={type:'object',required:['identity','playerFantasy','coreFun','coreLoop','signatureSystems','progressionDirection','visualDirection','mobileUx','marketTargetDirection','steamExpansionDecision','multiplayerMode','multiplayerExpansionDecision','technicalAssumptions','validationQuestions','openQuestions','systemInterconnections','progressionEconomyBalance','contentExpansionPlan','failureRetryRisk','platformFitPlan','uxAccessibilityPlan','artAudioDirection','implementationTraceability'],properties:{identity:{type:'string',maxLength:1000},playerFantasy:{type:'string',maxLength:900},coreFun:{type:'string',maxLength:900},coreLoop:{type:'array',minItems:3,maxItems:8,items:{type:'string',maxLength:340}},signatureSystems:{type:'array',minItems:2,maxItems:6,items:{type:'object',required:['name','purpose','playerChoice'],properties:{name:{type:'string',maxLength:130},purpose:{type:'string',maxLength:440},playerChoice:{type:'string',maxLength:440}},additionalProperties:false}},progressionDirection:{type:'string',maxLength:900},visualDirection:{type:'string',maxLength:900},mobileUx:{type:'string',maxLength:900},marketTargetDirection:{type:'string',maxLength:900},steamExpansionDecision:{type:'string',maxLength:500},multiplayerMode:{type:'string',enum:MULTIPLAYER_MODES},multiplayerExpansionDecision:{type:'string',maxLength:500},technicalAssumptions:{type:'array',minItems:2,maxItems:8,items:{type:'string',maxLength:340}},validationQuestions:{type:'array',minItems:2,maxItems:8,items:{type:'string',maxLength:340}},openQuestions:{type:'array',maxItems:8,items:{type:'string',maxLength:340}},systemInterconnections:{type:'array',minItems:3,maxItems:8,items:{type:'object',required:['fromSystem','toSystem','trigger','stateChange'],properties:{fromSystem:V2_TEXT,toSystem:V2_TEXT,trigger:V2_TEXT,stateChange:V2_TEXT},additionalProperties:false}},progressionEconomyBalance:{type:'object',required:['progressionLoop','resourceFlow','balanceRules'],properties:{progressionLoop:V2_TEXT,resourceFlow:V2_TEXT,balanceRules:V2_TEXT},additionalProperties:false},contentExpansionPlan:{type:'array',minItems:3,maxItems:8,items:{type:'object',required:['milestone','newGameplay','systemImpact'],properties:{milestone:V2_TEXT,newGameplay:V2_TEXT,systemImpact:V2_TEXT},additionalProperties:false}},failureRetryRisk:{type:'object',required:['failureStates','retryFlow','riskPressure','recoveryRules'],properties:{failureStates:{type:'array',minItems:2,maxItems:6,items:V2_TEXT},retryFlow:V2_TEXT,riskPressure:V2_TEXT,recoveryRules:V2_TEXT},additionalProperties:false},platformFitPlan:{type:'object',required:['targetPlatform','inputModel','performanceBudget','sessionConstraints'],properties:{targetPlatform:V2_TEXT,inputModel:V2_TEXT,performanceBudget:V2_TEXT,sessionConstraints:V2_TEXT},additionalProperties:false},uxAccessibilityPlan:{type:'object',required:['hudPriorities','touchAndInput','readability','accessibility'],properties:{hudPriorities:V2_TEXT,touchAndInput:V2_TEXT,readability:V2_TEXT,accessibility:V2_TEXT},additionalProperties:false},artAudioDirection:{type:'object',required:['visualIdentity','audioIdentity','gameplayFeedbackSync'],properties:{visualIdentity:V2_TEXT,audioIdentity:V2_TEXT,gameplayFeedbackSync:V2_TEXT},additionalProperties:false},implementationTraceability:{type:'array',minItems:3,maxItems:8,items:{type:'object',required:['designElement','responsibleSystem','validationEvidence'],properties:{designElement:V2_TEXT,responsibleSystem:V2_TEXT,validationEvidence:V2_TEXT},additionalProperties:false}}},additionalProperties:false};`;
  s=replaceOne(s,/^const DESIGN=.*$/m,schema,'DESIGN_SCHEMA');
  for(const [oldText,newText,label] of [
    ["writeJson(path.join(base,'design-draft.json'),{version:4,","writeJson(path.join(base,'design-draft.json'),{version:5,",'DRAFT_VERSION'],
    ["writeJson(path.join(base,'design-revised.json'),{version:4,","writeJson(path.join(base,'design-revised.json'),{version:5,",'REVISED_VERSION'],
    ["writeJson(path.join(base,'cycle-status.json'),{version:5,","writeJson(path.join(base,'cycle-status.json'),{version:6,",'CYCLE_VERSION'],
  ]){
    if(!s.includes(oldText))throw new Error(label);
    s=s.replace(oldText,newText);
  }
  write(file,s);
}

{
  const file='tools/company-design-prepromotion-repair.mjs';
  let s=read(file);
  s=replaceOne(s,/const required=\['identity'.*?'openQuestions'\];/,"const required=['identity','playerFantasy','coreFun','coreLoop','signatureSystems','progressionDirection','visualDirection','mobileUx','marketTargetDirection','steamExpansionDecision','multiplayerMode','multiplayerExpansionDecision','technicalAssumptions','validationQuestions','openQuestions','systemInterconnections','progressionEconomyBalance','contentExpansionPlan','failureRetryRisk','platformFitPlan','uxAccessibilityPlan','artAudioDirection','implementationTraceability'];",'REQUIRED_FIELDS');
  s=replaceOne(s,/if\(\['signatureSystems','technicalAssumptions','validationQuestions','openQuestions'\]\.includes\(key\)\)return !Array\.isArray\(out\[key\]\)(?:\|\|out\[key\]\.length<1)?;/,`if(['signatureSystems','technicalAssumptions','validationQuestions','openQuestions'].includes(key))return !Array.isArray(out[key]);
    if(['systemInterconnections','contentExpansionPlan','implementationTraceability'].includes(key))return !Array.isArray(out[key])||out[key].length<3;
    if(['progressionEconomyBalance','failureRetryRisk','platformFitPlan','uxAccessibilityPlan','artAudioDirection'].includes(key))return !out[key]||Array.isArray(out[key])||typeof out[key]!=='object';`,'UNRESOLVED_FIELDS');
  s=replaceOne(s,/if\(phase==='REVIEW_FEEDBACK'&&strictBefore\?\.verdict==='PASS'/,"if(phase==='REVIEW_FEEDBACK'&&strictBefore?.scoreSystem==='STAGE_GATE_SCORING_V2'&&strictBefore?.verdict==='PASS'",'V2_PASS_GUARD');
  write(file,s);
}

{
  const file='tools/company-strict-production-review.mjs';
  let s=read(file);
  const anchor="import {classifyRobloxGenre} from './roblox-genre-profile.mjs';";
  if(!s.includes("company-design-gate-scoring-v2.mjs")){
    if(!s.includes(anchor))throw new Error('V2_IMPORT_ANCHOR');
    s=s.replace(anchor,`${anchor}\nimport {DESIGN_GATE_WEIGHTS,scoreDesignGateV2} from './company-design-gate-scoring-v2.mjs';`);
  }
  s=replaceOne(s,/^const designWeights=\{.*\};$/m,'const designWeights=DESIGN_GATE_WEIGHTS;','WEIGHTS');
  if(!s.includes('LEGACY_DESIGN_100'))throw new Error('LEGACY_MARKER');
  s=s.replace("implementationScoreComposition:reviewStage==='IMPLEMENTATION_STRICT_REVIEW'?'COMMON_60_PLUS_CATEGORY_40':'LEGACY_DESIGN_100'","implementationScoreComposition:reviewStage==='IMPLEMENTATION_STRICT_REVIEW'?'COMMON_60_PLUS_CATEGORY_40':'STAGE_GATE_SCORING_V2_DESIGN_11_AXIS'");
  const designFn=`function designReview(){
  const loops=Array.isArray(seed.CORE_LOOP)?seed.CORE_LOOP:[];
  const identity=clean(seed.DISTINCT_IDENTITY);
  const materials=Array.isArray(seed.SEED_MATERIAL_IDS)?seed.SEED_MATERIAL_IDS:[];
  const generation=clean(seed.generation).toUpperCase();
  const materialComposed=generation.includes('MATERIAL')||generation.includes('COMPOSED');
  const designPath=date?path.join('design',gameId,date,'design-revised.json'):'';
  const cyclePath=date?path.join('design',gameId,date,'cycle-status.json'):'';
  const design=readJson(designPath,null);
  const cycleStatus=readJson(cyclePath,{});
  const designContent=design?.content&&typeof design.content==='object'?design.content:{};
  const robloxGenreProfile=classifyRobloxGenre({category:seed.GAME_CATEGORY,identity,coreLoop:loops,designText:JSON.stringify(designContent),multiplayerMode:designContent.multiplayerMode||seed.MULTIPLAYER_DESIGN_MODE});
  const v2=scoreDesignGateV2({seed,designRecord:design||{},cycleStatus,robloxGenreProfile});
  const base=finalResult({scores:v2.scores,hardFailures:v2.hardFailures,evidence:{seedId:seed.seedId,seedGeneration:seed.generation||null,materialContractApplied:materialComposed,materialIds:materials,designPath:designPath||null,cyclePath:cyclePath||null,multiplayerDesignMode:designContent.multiplayerMode||seed.MULTIPLAYER_DESIGN_MODE,robloxGenreProfile,scoreSystem:v2.scoreSystem,directScoreLevels:v2.directScoreLevels,axisEvidenceLevels:v2.evidenceLevels,criticalAxisMinimumPercent:v2.criticalAxisMinimumPercent,criticalAxisFailures:v2.criticalAxisFailures,revalidated:v2.revalidated,thirtyMinuteHardGateApplied:false,reviewContextSource},reviewStage:'DESIGN_STRICT_REVIEW',passThreshold:DESIGN_PASS_THRESHOLD,rebuildBelow:60,scoreWeights:DESIGN_GATE_WEIGHTS});
  return {...base,version:5,scoreSystem:v2.scoreSystem,directScoreLevels:v2.directScoreLevels,axisEvidenceLevels:v2.evidenceLevels,criticalAxisMinimumPercent:v2.criticalAxisMinimumPercent,criticalAxisFailures:v2.criticalAxisFailures,rules:{...base.rules,designScoreComposition:'STAGE_GATE_SCORING_V2_DESIGN_11_AXIS',sourceKeywordOnlyScoringForbidden:true,allApplicableDesignAxesCritical:true,thirtyMinuteHardGateAtDesign:false}};
}
`;
  s=replaceOne(s,/function designReview\(\)\{.*?\nfunction implementationReview\(\)\{/s,`${designFn}function implementationReview(){`,'DESIGN_REVIEW');
  write(file,s);
}

{
  const file='tools/artbook-production-pipeline.mjs';
  let s=read(file);
  const oldText="const d=date||kstDate();\n  return fs.existsSync(path.join('design',gameId,d,'design-revised.json'));";
  const newText="const d=date||kstDate();\n  const revised=readJson(path.join('design',gameId,d,'design-revised.json'),null);\n  return Number(revised?.version||0)>=5&&Array.isArray(revised?.content?.systemInterconnections)&&revised.content.systemInterconnections.length>=3;";
  if(!s.includes(oldText))throw new Error('REUSE_GUARD');
  s=s.replace(oldText,newText);
  write(file,s);
}

console.log('MIGRATE_STAGE_GATE_V2=APPLIED');
