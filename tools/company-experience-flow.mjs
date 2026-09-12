import crypto from 'node:crypto';

const clean=value=>String(value??'').trim();
const upper=value=>clean(value).toUpperCase();
const unique=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));

export const EXPERIENCE_COMPANY_POLICY=Object.freeze({
  maintainedGameSlots:6,
  maxHeavyDevelopmentWip:3,
  portfolioSlots:Object.freeze({PRIMARY:1,ACTIVE:2,MAINTENANCE_VALIDATION:2,INCUBATION_HOLD:1}),
  validationClasses:Object.freeze(['FAST','STANDARD','FULL']),
  repeatedFailureRegressionThreshold:3,
  crossProjectCompanyPatternMinDistinctProjects:2,
  parentChildParallelismPreserved:true,
  sameRevisionSameConfigurationBuildOnce:true,
  freeCreativeOutsourceOnly:true,
  paidCreativeFallback:false,
  audioMinimumEvents:Object.freeze(['BGM','ATTACK_IMPACT','PLAYER_HIT','DEATH','UI_CLICK','REWARD_OR_LEVEL_UP']),
  narrativeMinimum:Object.freeze(['INTRO_OR_TITLE_SEQUENCE','PLAYER_CONTEXT','TUTORIAL_CONTEXT','ENDING_OR_SESSION_CLOSE'])
});

const DOMAIN_RULES=Object.freeze([
  {domain:'BUILD_SYSTEM',patterns:[/\.github\/workflows\//i,/ProjectSettings\//i,/Packages\/(manifest|packages-lock)\.json/i,/gradle/i,/android.*(sdk|ndk)/i]},
  {domain:'SAVE_COMPAT',patterns:[/save/i,/persist/i,/serialization/i,/inventory/i,/progress/i]},
  {domain:'ANDROID_LIFECYCLE',patterns:[/android/i,/pause/i,/resume/i,/application/i]},
  {domain:'AUDIO',patterns:[/audio/i,/sound/i,/music/i,/bgm/i,/sfx/i,/mixer/i]},
  {domain:'NARRATIVE',patterns:[/story/i,/dialog/i,/quest/i,/intro/i,/cutscene/i,/narrative/i]},
  {domain:'GRAPHICS',patterns:[/sprite/i,/texture/i,/material/i,/shader/i,/vfx/i,/animation/i,/art/i]},
  {domain:'GAMEPLAY',patterns:[/combat/i,/enemy/i,/player/i,/weapon/i,/skill/i,/spawn/i,/balance/i]}
]);

const DOMAIN_DEPARTMENTS=Object.freeze({
  BUILD_SYSTEM:['development','qa'],SAVE_COMPAT:['development','qa'],ANDROID_LIFECYCLE:['development','qa'],
  AUDIO:['graphics','development','qa'],NARRATIVE:['planning','graphics','development','qa'],
  GRAPHICS:['graphics','development','qa'],GAMEPLAY:['planning','development','qa','balance'],GENERAL:['development','qa']
});

export function classifyCompanyImpact({changedFiles=[],missionType='STANDARD',materialDirectionChange=false,release=false}={}){
  const files=unique(changedFiles),domains=[];
  for(const rule of DOMAIN_RULES)if(files.some(file=>rule.patterns.some(pattern=>pattern.test(file))))domains.push(rule.domain);
  if(!domains.length)domains.push('GENERAL');
  const forcedFull=release||materialDirectionChange||domains.some(domain=>['BUILD_SYSTEM','SAVE_COMPAT','ANDROID_LIFECYCLE'].includes(domain));
  const requested=upper(missionType);
  const validationClass=forcedFull?'FULL':requested==='FAST'&&files.length<=3?'FAST':'STANDARD';
  const affectedDepartments=unique(domains.flatMap(domain=>DOMAIN_DEPARTMENTS[domain]||DOMAIN_DEPARTMENTS.GENERAL));
  const staleEvidence=unique(domains.flatMap(domain=>{
    if(domain==='AUDIO')return['AUDIO_EVENT_BINDING','AUDIO_MIX_QA'];
    if(domain==='NARRATIVE')return['NARRATIVE_RUNTIME','TEXT_READABILITY','CUTSCENE_SKIP_RESUME'];
    if(domain==='GRAPHICS')return['VISUAL_RUNTIME','STYLE_DNA','MOBILE_RENDER_COST'];
    if(domain==='SAVE_COMPAT')return['SAVE_LOAD_UPDATE_COMPATIBILITY','REGRESSION'];
    if(domain==='ANDROID_LIFECYCLE')return['APP_PAUSE_RESUME','ANDROID_RUNTIME'];
    if(domain==='BUILD_SYSTEM')return['BUILD','ANDROID_RUNTIME','INDEPENDENT_QA'];
    return['AFFECTED_RUNTIME','REGRESSION'];
  }));
  return Object.freeze({version:1,files:Object.freeze(files),domains:Object.freeze(domains),validationClass,affectedDepartments:Object.freeze(affectedDepartments),staleEvidence:Object.freeze(staleEvidence),unaffectedVerifiedEvidenceReusable:true,authority:'impact-routing-only'});
}

export function createBuildFingerprint({sourceTreeSha='',unityVersion='',packagesDigest='',platform='ANDROID',buildConfig='DEV'}={}){
  const payload={sourceTreeSha:clean(sourceTreeSha),unityVersion:clean(unityVersion),packagesDigest:clean(packagesDigest),platform:upper(platform),buildConfig:upper(buildConfig)};
  if(!payload.sourceTreeSha)throw new Error('sourceTreeSha required');
  const digest=crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  return Object.freeze({...payload,fingerprint:`sha256:${digest}`});
}

export function resolveBuildReuse({fingerprint,artifacts=[]}={}){
  const key=clean(fingerprint?.fingerprint||fingerprint),match=(artifacts||[]).find(item=>clean(item?.fingerprint)===key&&item?.buildPass===true&&clean(item?.artifactDigest));
  return Object.freeze(match?{action:'REUSE_EXACT_ARTIFACT',buildRequired:false,artifactDigest:clean(match.artifactDigest),buildRunId:match.buildRunId??null}:{action:'BUILD_ONCE',buildRequired:true,artifactDigest:null,buildRunId:null});
}

export function createCreativeOutsourcePlan({task='story',freeProviders=[]}={}){
  const type=upper(task),providers=(freeProviders||[]).filter(p=>p&&p.available!==false&&p.freeOnly===true&&p.quotaExceeded!==true&&p.rateLimited!==true);
  const allowed=new Set(['STORY','INTRO','DIALOGUE','AUDIO_DIRECTION','BGM_CUE_SHEET','SFX_CUE_SHEET','ART_DIRECTION','LOCALIZATION']);
  if(!allowed.has(type))return Object.freeze({outsource:false,task:type,reason:'core-development-or-unsupported-task',provider:null});
  const preferred=providers.find(p=>Array.isArray(p.capabilities)&&p.capabilities.map(upper).includes(type))||providers[0]||null;
  return Object.freeze({outsource:Boolean(preferred),task:type,provider:preferred?clean(preferred.id):null,freeOnly:true,paidFallback:false,directSourceWrite:false,completionAuthority:false,deliverable:'STRUCTURED_CREATIVE_MANIFEST',fallback:preferred?null:'INTERNAL_V3_OR_ASSET_PENDING'});
}

export function createExperienceHarvest({missionId='',project='',taskType='general',request='',sourceRevision='',sourcePaths=[],winner={},evidence={},failureClass='',distinctProjects=1}={}){
  const required={runtimePass:evidence.runtimePass===true,qaPassed:evidence.qaPassed===true,regressionPassed:evidence.regressionPassed===true,exactRevision:evidence.exactRevision===true,responsibleSource:evidence.responsibleSource===true};
  const verified=Object.values(required).every(Boolean),quality=clamp01((Object.values(required).filter(Boolean).length/5)*0.65+clamp01(evidence.qualityScore??0.5)*0.2+clamp01(evidence.reuseValue??0.5)*0.15);
  return Object.freeze({version:1,missionId:clean(missionId),project:clean(project),taskType:clean(taskType)||'general',request:clean(request),sourceRevision:clean(sourceRevision)||null,sourcePaths:Object.freeze(unique(sourcePaths)),winner:Object.freeze({candidateId:clean(winner.candidateId||winner.id)||null,patchRef:clean(winner.patchRef)||null}),evidence:Object.freeze(required),verified,experienceQualityScore:Number(quality.toFixed(6)),patternScope:verified&&Number(distinctProjects)>=EXPERIENCE_COMPANY_POLICY.crossProjectCompanyPatternMinDistinctProjects?'COMPANY_PATTERN':'PROJECT_PATTERN',failureClass:clean(failureClass)||null,hiddenReasoningStored:false,positiveLearningEligible:verified,authority:'observable-evidence-harvest'});
}

export function repeatedFailurePromotion({occurrences=0,failureClass=''}={}){
  const count=Math.max(0,Math.floor(Number(occurrences)||0));
  return Object.freeze({failureClass:clean(failureClass)||'UNKNOWN',occurrences:count,promoteToPermanentRegressionTest:count>=EXPERIENCE_COMPANY_POLICY.repeatedFailureRegressionThreshold,threshold:EXPERIENCE_COMPANY_POLICY.repeatedFailureRegressionThreshold});
}
