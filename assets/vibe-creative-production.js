const clean=value=>String(value??'').trim();
const upper=value=>clean(value).toUpperCase();
const freeze=value=>Object.freeze(value);
const unique=values=>[...new Set((values||[]).map(clean).filter(Boolean))];

export const VIBE_CREATIVE_POLICY=freeze({
  version:1,
  generation:'V3-PUMP-CREATIVE',
  vibeBaselineRequired:true,
  externalAiRequired:false,
  externalAiFreeOnly:true,
  paidFallback:false,
  externalCandidateMax:2,
  directSourceWriteByExternalAi:false,
  externalCompletionAuthority:false,
  deliveryMode:'STRUCTURED_MANIFEST_FIRST',
  binaryAssetMayRemainPending:true,
  authority:'vibe-integrates-qa-verifies'
});

const TASKS=freeze({
  STORY_DRAFT:freeze({owner:'planning',format:'narrative-manifest',required:['premise','playerContext','beats','endingOrSessionClose']}),
  INTRO_STORYBOARD:freeze({owner:'graphics',format:'intro-timeline',required:['shots','duration','text','transition','audioCue']}),
  DIALOGUE_DRAFT:freeze({owner:'planning',format:'dialogue-manifest',required:['speaker','line','trigger','next']}),
  QUEST_NARRATIVE_DRAFT:freeze({owner:'planning',format:'quest-narrative-manifest',required:['setup','objectiveContext','progressBeat','completionBeat']}),
  BGM_CUE_SHEET:freeze({owner:'graphics',format:'audio-cue-manifest',required:['scene','mood','intensity','loop','transition']}),
  SFX_CUE_SHEET:freeze({owner:'graphics',format:'audio-cue-manifest',required:['event','category','priority','variation','cooldown']}),
  MUSIC_DIRECTION_PROMPT:freeze({owner:'graphics',format:'music-direction-manifest',required:['mood','tempoRange','instrumentation','loopIntent','forbiddenReferences']}),
  ART_DIRECTION_BRIEF:freeze({owner:'graphics',format:'art-direction-manifest',required:['styleDna','silhouette','paletteIntent','mobileReadability']}),
  LOCALIZATION_DRAFT:freeze({owner:'planning',format:'localization-manifest',required:['sourceText','locale','context','characterLimit']})
});

const FREE_PROVIDERS=freeze([
  freeze({id:'mistral',freeOnly:true,capabilities:freeze(['STORY_DRAFT','INTRO_STORYBOARD','DIALOGUE_DRAFT','QUEST_NARRATIVE_DRAFT','BGM_CUE_SHEET','SFX_CUE_SHEET','MUSIC_DIRECTION_PROMPT','ART_DIRECTION_BRIEF','LOCALIZATION_DRAFT'])}),
  freeze({id:'groq',freeOnly:true,capabilities:freeze(['STORY_DRAFT','INTRO_STORYBOARD','DIALOGUE_DRAFT','QUEST_NARRATIVE_DRAFT','BGM_CUE_SHEET','SFX_CUE_SHEET','MUSIC_DIRECTION_PROMPT','ART_DIRECTION_BRIEF','LOCALIZATION_DRAFT'])})
]);

export function createVibeCreativeBaseline({task='STORY_DRAFT',gameId='',brief='',styleDna={},storyContext={}}={}){
  const type=upper(task),definition=TASKS[type];
  if(!definition)throw new Error(`unsupported creative task: ${type}`);
  return freeze({
    version:1,
    candidateId:`vibe-baseline-${type.toLowerCase()}`,
    source:'VIBE_INTERNAL_BASELINE',
    task:type,
    gameId:clean(gameId),
    brief:clean(brief),
    styleDna:freeze({...styleDna}),
    storyContext:freeze({...storyContext}),
    owner:definition.owner,
    format:definition.format,
    requiredFields:definition.required,
    authoritative:false,
    directSourceWrite:false,
    completionAuthority:false,
    assetState:type.includes('BGM')||type.includes('SFX')||type.includes('MUSIC')?'CUE_MANIFEST_READY_BINARY_ASSET_MAY_BE_PENDING':'CONTENT_MANIFEST_READY'
  });
}

export function planFreeCreativeAugmentation({task='STORY_DRAFT',providerStates={}}={}){
  const type=upper(task);
  if(!TASKS[type])throw new Error(`unsupported creative task: ${type}`);
  const candidates=[];
  for(const provider of FREE_PROVIDERS){
    const state=providerStates[provider.id]||{};
    if(state.available===false||state.quotaExceeded===true||state.rateLimited===true)continue;
    if(!provider.capabilities.includes(type))continue;
    candidates.push(freeze({provider:provider.id,task:type,freeOnly:true,authoritative:false,directSourceWrite:false,completionAuthority:false}));
    if(candidates.length>=VIBE_CREATIVE_POLICY.externalCandidateMax)break;
  }
  return freeze({version:1,task:type,vibeBaselineAlwaysRuns:true,externalAiRequired:false,freeOnly:true,paidFallback:false,externalCandidates:freeze(candidates),fallback:'VIBE_BASELINE_CONTINUES_WITHOUT_BLOCKING'});
}

export function createCreativeProductionPlan({task='STORY_DRAFT',gameId='',brief='',styleDna={},storyContext={},providerStates={}}={}){
  const baseline=createVibeCreativeBaseline({task,gameId,brief,styleDna,storyContext});
  const augmentation=planFreeCreativeAugmentation({task,providerStates});
  return freeze({
    version:1,
    policy:VIBE_CREATIVE_POLICY,
    task:baseline.task,
    candidates:freeze([baseline,...augmentation.externalCandidates.map((candidate,index)=>freeze({candidateId:`external-free-${candidate.provider}-${index+1}`,...candidate}))]),
    selectionRule:'VIBE_OR_INTERNAL_REVIEW_SELECTS_BEST_VALID_CANDIDATE_AFTER_RIGHTS_STYLE_AND_RUNTIME_FIT_CHECKS',
    integrationOwner:'VIBE_INTERNAL',
    qaRequired:true,
    externalFailureBlocksDevelopment:false
  });
}

export function validateCreativeManifest({task='STORY_DRAFT',manifest={},rightsVerified=false,license='',runtimeBindingReady=false,textReadable=true,audioClippingPass=true}={}){
  const type=upper(task),definition=TASKS[type];
  if(!definition)throw new Error(`unsupported creative task: ${type}`);
  const missing=definition.required.filter(field=>manifest?.[field]===undefined||manifest?.[field]===null||manifest?.[field]==='');
  const audioTask=['BGM_CUE_SHEET','SFX_CUE_SHEET','MUSIC_DIRECTION_PROMPT'].includes(type);
  const blockers=[];
  if(missing.length)blockers.push('required-fields-missing');
  if(manifest.externalBinaryAsset===true&&!rightsVerified)blockers.push('rights-unverified');
  if(manifest.externalBinaryAsset===true&&!clean(license))blockers.push('license-missing');
  if(manifest.requiresRuntimeBinding===true&&!runtimeBindingReady)blockers.push('runtime-binding-missing');
  if(!textReadable&&!audioTask)blockers.push('text-readability-failed');
  if(!audioClippingPass&&audioTask)blockers.push('audio-clipping-failed');
  return freeze({version:1,task:type,valid:blockers.length===0,missing:freeze(missing),blockedReasons:freeze(blockers),rightsVerified:Boolean(rightsVerified),license:clean(license)||null,runtimeBindingReady:Boolean(runtimeBindingReady),authority:'creative-manifest-gate'});
}

export function createAudioEventManifest({bgm=[],sfx=[]}={}){
  const requiredEvents=['BGM','ATTACK_IMPACT','PLAYER_HIT','DEATH','UI_CLICK','REWARD_OR_LEVEL_UP'];
  const rows=[...(bgm||[]),...(sfx||[])].map(item=>freeze({...item,event:upper(item.event)}));
  const present=new Set(rows.map(item=>item.event));
  return freeze({version:1,events:freeze(rows),requiredEvents:freeze(requiredEvents),missingRequired:freeze(requiredEvents.filter(event=>!present.has(event))),dataDriven:true,commonRuntimePlayerRequired:true});
}

export function createNarrativeTimeline({intro=[],storyBeats=[],ending=[]}={}){
  const normalize=(rows,phase)=>rows.map((item,index)=>freeze({id:clean(item.id)||`${phase}-${index+1}`,phase,...item}));
  return freeze({version:1,dataDriven:true,commonRuntimePlayerRequired:true,segments:freeze([...normalize(intro,'INTRO'),...normalize(storyBeats,'STORY'),...normalize(ending,'ENDING')]),skipAndResumeSafetyRequired:true,audioTimelineIntegrationRequired:true});
}

export function listVibeCreativeTasks(){return freeze(unique(Object.keys(TASKS)));}
