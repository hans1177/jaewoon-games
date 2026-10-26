// 파일명: tools/company-build-up-directive.mjs
// Game-specific BUILD_UP directive generator.
// Produces one common game goal per loop, then platform-native execution guidance for Unity Web, Roblox, and Unity app.

// 임포트
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {normalizeWebCanonicalAndExpansionPolicy} from './company-design-prepromotion-repair.mjs';
import {resolveActiveOwnerPolicy} from './company-policy-steward.mjs';
import {buildRobloxProductionPlan,robloxProductionPromptLines} from './company-roblox-production-plan.mjs';

const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const uniq=v=>[...new Set((Array.isArray(v)?v:[]).map(clean).filter(Boolean))];
const sha=v=>crypto.createHash('sha256').update(String(v??'')).digest('hex');
const posix=v=>clean(v).replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));}catch{return fallback;}};

export const BUILD_UP_DOMAINS=Object.freeze([
  'CORE_FUN','COMBAT_OR_PRIMARY_INTERACTION','PLAYER_ACTIONS','PLAYER_AGENCY','ANTI_GRIND','ENEMY_AI','BOSS_AND_SIGNATURE_MOMENTS',
  'PROGRESSION','GOALS','REWARDS','UNLOCKS','QUESTS','CONTENT_VARIETY','CONTENT_DENSITY','CONTENT_DISCOVERY','MID_LATE_GAME_DEPTH',
  'WORLD_MAP_TOPOLOGY','MAP_EXPANSION','REGIONS','WORLD_DENSITY','WORLD_NAVIGATION','LANDMARKS','TRAVERSAL','INTERACTION_DISCOVERABILITY',
  'ECONOMY','INVENTORY','INVENTORY_USABILITY','EQUIPMENT_LOADOUT','CRAFTING','SYSTEM_CONNECTION',
  'SESSION_FLOW','FIRST_10_MINUTES','FAILURE_RESPAWN_CHECKPOINTS','SAVE_AND_RECOVERY','SAVE_COMPLETENESS','RECONNECT_RECOVERY','MULTIPLAYER_AND_SYNC',
  'INPUT','MOBILE_UX','ACCESSIBILITY','SETTINGS_ACCESSIBILITY','MENU_FLOW','CONVENIENCE','UI_DESIGN_SYSTEM','UI_INFORMATION_PRIORITY','FEEDBACK_CLARITY',
  'TUTORIAL_ONBOARDING','DIFFICULTY_PACING','GAME_FEEL','SPAWN_ENCOUNTER_DIRECTOR','NPC_SOCIAL_BEHAVIOR','NARRATIVE_STORY',
  'AUDIO_MUSIC_SFX','REPLAYABILITY_VARIATION','CHARACTER_VISUALS','ENEMY_VISUALS','WEAPONS_AND_EQUIPMENT',
  'BUILDINGS_AND_PROPS','ENVIRONMENT','TERRAIN','MATERIALS','PALETTE','LIGHTING','ANIMATION',
  'SECONDARY_MOTION','VFX','CAMERA','UI_HUD','AUDIO_VISUAL_TIMING','ENVIRONMENTAL_MOTION',
  'PERFORMANCE','PERFORMANCE_BUDGET','RUNTIME_STABILITY','ERROR_RECOVERY'
]);

export const HOLISTIC_CORE_DOMAINS=Object.freeze([
  'CORE_FUN','PLAYER_ACTIONS','PLAYER_AGENCY','PROGRESSION','CONTENT_VARIETY','CONTENT_DENSITY',
  'WORLD_MAP_TOPOLOGY','MAP_EXPANSION','REGIONS','WORLD_DENSITY','WORLD_NAVIGATION','INTERACTION_DISCOVERABILITY',
  'INVENTORY','INVENTORY_USABILITY','EQUIPMENT_LOADOUT','SYSTEM_CONNECTION',
  'SESSION_FLOW','FIRST_10_MINUTES','MID_LATE_GAME_DEPTH','SAVE_COMPLETENESS',
  'INPUT','MOBILE_UX','SETTINGS_ACCESSIBILITY','MENU_FLOW','CONVENIENCE','UI_DESIGN_SYSTEM','UI_INFORMATION_PRIORITY','FEEDBACK_CLARITY',
  'ANTI_GRIND','CONTENT_DISCOVERY','PERFORMANCE_BUDGET','RUNTIME_STABILITY'
]);

const DESIGNLESS_SAFE_BUILD_UP_FOCI=Object.freeze(['PRESENTATION','USABILITY','STABILITY']);
const DESIGNLESS_SAFE_BUILD_UP_DOMAINS=Object.freeze({
  PRESENTATION:Object.freeze([
    'CHARACTER_VISUALS','ENEMY_VISUALS','WEAPONS_AND_EQUIPMENT','BUILDINGS_AND_PROPS','ENVIRONMENT','TERRAIN','MATERIALS','PALETTE',
    'LIGHTING','ANIMATION','SECONDARY_MOTION','VFX','CAMERA','UI_HUD','AUDIO_MUSIC_SFX','AUDIO_VISUAL_TIMING','ENVIRONMENTAL_MOTION',
    'INVENTORY_USABILITY','EQUIPMENT_LOADOUT','MENU_FLOW','CONVENIENCE','UI_DESIGN_SYSTEM','UI_INFORMATION_PRIORITY','FEEDBACK_CLARITY',
    'GAME_FEEL','MOBILE_UX','PERFORMANCE_BUDGET'
  ]),
  USABILITY:Object.freeze([
    'INPUT','MOBILE_UX','ACCESSIBILITY','SETTINGS_ACCESSIBILITY','MENU_FLOW','CONVENIENCE','UI_DESIGN_SYSTEM','UI_INFORMATION_PRIORITY',
    'FEEDBACK_CLARITY','INVENTORY_USABILITY','EQUIPMENT_LOADOUT','AUDIO_MUSIC_SFX','FIRST_10_MINUTES','SESSION_FLOW','ERROR_RECOVERY','PERFORMANCE_BUDGET'
  ]),
  STABILITY:Object.freeze([
    'RUNTIME_STABILITY','ERROR_RECOVERY','SAVE_AND_RECOVERY','SAVE_COMPLETENESS','RECONNECT_RECOVERY',
    'FAILURE_RESPAWN_CHECKPOINTS','SESSION_FLOW','PERFORMANCE','PERFORMANCE_BUDGET'
  ])
});

export const VISUAL_DOMAINS=Object.freeze([
  'CHARACTER','ENEMY_CREATURE','WEAPON_EQUIPMENT','BUILDING_PROP','ENVIRONMENT_TERRAIN',
  'MATERIAL_SURFACE','PALETTE','LIGHTING','ANIMATION','SECONDARY_MOTION','VFX','CAMERA',
  'UI_HUD','INVENTORY_EQUIPMENT_UI','AUDIO_MUSIC','AUDIO_VISUAL_SYNC',
  'ENVIRONMENTAL_MOTION','SCENE_DENSITY','LANDMARK_READABILITY'
]);

export const EXPERIENCE_BUILD_UP_TRACKS=Object.freeze([
  'MOTION_AND_ACTING',
  'COMBAT_AND_PRIMARY_ACTION_FEEL',
  'UI_HUD_AND_MENU',
  'INVENTORY_AND_EQUIPMENT',
  'AUDIO_MUSIC_AND_FEEDBACK',
  'VFX_CAMERA_AND_IMPACT_SYNC',
  'WORLD_VISUAL_COHESION',
  'MOBILE_TOUCH_AND_ACCESSIBILITY',
  'PERFORMANCE_AND_RUNTIME_STABILITY'
]);

export const DEVELOPMENT_IMPACT_CATEGORIES=Object.freeze(['GRAPHICS','MAP','UI','GAMEPLAY','SAVE','MULTIPLAYER_SERVER']);

const IMPACT_DOMAINS=Object.freeze({
  GRAPHICS:Object.freeze(['CHARACTER_VISUALS','ENEMY_VISUALS','WEAPONS_AND_EQUIPMENT','BUILDINGS_AND_PROPS','ENVIRONMENT','TERRAIN','MATERIALS','PALETTE','LIGHTING','ANIMATION','SECONDARY_MOTION','VFX','CAMERA','AUDIO_VISUAL_TIMING','ENVIRONMENTAL_MOTION']),
  MAP:Object.freeze(['WORLD_MAP_TOPOLOGY','MAP_EXPANSION','REGIONS','WORLD_DENSITY','WORLD_NAVIGATION','LANDMARKS','TRAVERSAL','SPAWN_ENCOUNTER_DIRECTOR','ENVIRONMENT','TERRAIN']),
  UI:Object.freeze(['INPUT','MOBILE_UX','ACCESSIBILITY','SETTINGS_ACCESSIBILITY','MENU_FLOW','INVENTORY_USABILITY','EQUIPMENT_LOADOUT','UI_DESIGN_SYSTEM','UI_INFORMATION_PRIORITY','FEEDBACK_CLARITY','UI_HUD']),
  GAMEPLAY:Object.freeze(['CORE_FUN','COMBAT_OR_PRIMARY_INTERACTION','PLAYER_ACTIONS','PLAYER_AGENCY','ENEMY_AI','BOSS_AND_SIGNATURE_MOMENTS','PROGRESSION','GOALS','REWARDS','UNLOCKS','QUESTS','ECONOMY','INVENTORY','EQUIPMENT_LOADOUT','CRAFTING','DIFFICULTY_PACING','GAME_FEEL']),
  SAVE:Object.freeze(['SAVE_AND_RECOVERY','SAVE_COMPLETENESS','RECONNECT_RECOVERY']),
  MULTIPLAYER_SERVER:Object.freeze(['MULTIPLAYER_AND_SYNC'])
});

export function classifyDevelopmentImpact({platform='COMMON',responsibleFiles=[],qualityGapMap=[]}={}){
  const gaps=new Set((Array.isArray(qualityGapMap)?qualityGapMap:[]).filter(row=>clean(row?.state).toUpperCase()==='GAP').map(row=>clean(row?.domain).toUpperCase()));
  const fileText=(Array.isArray(responsibleFiles)?responsibleFiles:[]).map(posix).join(' ').toLowerCase();
  const categories=[];
  const add=name=>{if(!categories.includes(name))categories.push(name);};
  const domainHit=name=>(IMPACT_DOMAINS[name]||[]).some(domain=>gaps.has(domain));
  if(domainHit('GRAPHICS')||/(visual|render|animation|vfx|camera|lighting|material|asset)/.test(fileText))add('GRAPHICS');
  if(domainHit('MAP')||/(world|map|terrain|region|spawn|environment|landmark)/.test(fileText))add('MAP');
  if(domainHit('UI')||/(ui|hud|menu|inventory|touch|input)/.test(fileText))add('UI');
  if(domainHit('GAMEPLAY')||/(combat|enemy|quest|progression|economy|gameplay)/.test(fileText))add('GAMEPLAY');
  if(domainHit('SAVE')||/(save|datastore|persist|migration)/.test(fileText))add('SAVE');
  if(domainHit('MULTIPLAYER_SERVER')||/(remoteevent|remotefunction|network|multiplayer|replication)/.test(fileText))add('MULTIPLAYER_SERVER');
  if(!categories.length)add('GAMEPLAY');

  const target=clean(platform).toUpperCase()||'COMMON';
  const requiredQa=['CHANGED_RESPONSIBILITY_STATIC_QA'];
  if(target==='ROBLOX')requiredQa.push('ROBLOX_LUAU_COMPILE');
  if(categories.includes('MAP'))requiredQa.push('MAP_PROTECTED_ANCHOR_QA');
  if(categories.includes('UI'))requiredQa.push('MOBILE_TOUCH_UI_QA');
  if(categories.includes('GAMEPLAY'))requiredQa.push('GAMEPLAY_STATE_DELTA_QA');
  if(categories.includes('SAVE'))requiredQa.push('SAVE_LOAD_MIGRATION_QA','SECURITY_AUTHORITY_QA');
  if(categories.includes('MULTIPLAYER_SERVER'))requiredQa.push('REMOTE_AUTHORITY_AND_SYNC_QA','SECURITY_AUTHORITY_QA');
  if(categories.includes('GRAPHICS'))requiredQa.push('VISUAL_BINDING_QA');
  if(target==='ROBLOX'&&categories.includes('MAP'))requiredQa.push('ROBLOX_OPEN_CLOUD_WORLD_EVIDENCE');

  const conditionalQa=[];
  if(categories.some(name=>['GRAPHICS','UI'].includes(name)))conditionalQa.push('STUDIO_MCP_ONLY_IF_RENDER_TOUCH_CAMERA_UNPROVABLE');
  if(categories.includes('MULTIPLAYER_SERVER'))conditionalQa.push('STUDIO_MCP_ONLY_IF_ACTUAL_MULTI_CLIENT_REQUIRED');

  return Object.freeze({
    version:1,
    platform:target,
    categories:Object.freeze(categories),
    requiredQa:Object.freeze(uniq(requiredQa)),
    conditionalQa:Object.freeze(uniq(conditionalQa)),
    securityRelevant:categories.some(name=>['SAVE','MULTIPLAYER_SERVER'].includes(name)),
    openCloudWorldChecks:Object.freeze(target==='ROBLOX'&&categories.includes('MAP')?[
      'SERVER_BOOT','FINITE_WORLD_BOUNDS','SPAWN_IN_PLAYABLE_BOUNDS','LANDMARK_AND_OBJECTIVE_COUNTS',
      'WORLD_GEOMETRY','TERRAIN_BINDING','LIGHTING_ATMOSPHERE','STREAMING_CONFIGURATION'
    ]:[])
  });
}

export function buildDevelopmentDryRun(directive={}){
  const files=directive?.responsibleSystemsAndFiles?.files||directive?.responsibleFiles||[];
  const impact=directive?.developmentImpact||classifyDevelopmentImpact({
    platform:directive?.platform,responsibleFiles:files,qualityGapMap:directive?.qualityGapMap||[]
  });
  return Object.freeze({
    version:1,
    mode:'DRY_RUN_NO_SOURCE_MUTATION',
    gameId:clean(directive?.gameId),
    platform:clean(directive?.platform).toUpperCase()||'COMMON',
    plannedFiles:Object.freeze(uniq(files.map(posix))),
    impact,
    protectedSemantics:Object.freeze(['CORE_RULES','BALANCE','PROGRESSION','SAVE_MEANING','ECONOMY','NETWORK_AUTHORITY']),
    requiredQa:impact.requiredQa,
    conditionalQa:impact.conditionalQa,
    openCloudWorldChecks:impact.openCloudWorldChecks,
    sourceMutationPerformed:false,
    newWorkflowOrQueueRequired:false,
    nextStep:'EXISTING_WORK_ORDER_EXECUTION'
  });
}

export const PLATFORM_EXPERIENCE_PROFILES=Object.freeze({
  COMMON:Object.freeze({
    attention:'STANDARD',
    presenceOnlyPassForbidden:true,
    weakestTrackBatchSize:3,
    beforeAfterSameSceneRequired:true,
    repeatedBuildUpUntilCriticalGapsClosed:true
  }),
  WEB:Object.freeze({
    attention:'STANDARD',
    runtimeSurface:'BROWSER_TOUCH_RUNTIME',
    requirements:Object.freeze([
      'REAL_POINTER_OR_TOUCH_INPUT',
      'DOM_OR_CANVAS_RENDERED_DELTA',
      'MOBILE_SAFE_AREA_AND_SCROLL_FLOW',
      'WEB_AUDIO_STATE_TRANSITION_WHEN_AUDIO_APPLICABLE',
      'FRAME_AND_MEMORY_BUDGET'
    ])
  }),
  UNITY:Object.freeze({
    attention:'HIGH',
    runtimeSurface:'UNITY_EDITOR_AND_ANDROID_RUNTIME',
    requirements:Object.freeze([
      'ANIMATOR_OR_EQUIVALENT_STATEFUL_MOTION',
      'CANVAS_SAFE_AREA_AND_MENU_STACK',
      'INVENTORY_EQUIP_FLOW_WHEN_APPLICABLE',
      'AUDIOMIXER_OR_EQUIVALENT_MIX_CONTROL_WHEN_AUDIO_APPLICABLE',
      'ANDROID_TOUCH_RUNTIME_EVIDENCE',
      'FRAME_MEMORY_AND_THERMAL_BUDGET'
    ])
  }),
  ROBLOX:Object.freeze({
    attention:'EXTRA',
    runtimeSurface:'EXACT_REMOTE_ROBLOX_CANDIDATE_F0_F9',
    requirements:Object.freeze([
      'ARTICULATED_ACTOR_MOTION_WITH_ANIMATOR_MOTOR6D_OR_BONES',
      'ROOT_ONLY_MOTION_CANNOT_PASS',
      'IDLE_WALK_JOG_RUN_START_STOP_TURN_JUMP_LAND_HIT_DEATH_COVERAGE_WHEN_APPLICABLE',
      'ANTICIPATION_IMPACT_RECOVERY_FOR_PRIMARY_ACTIONS',
      'TOUCH_FIRST_UI_WITH_MINIMUM_44PX_EQUIVALENT_TARGETS',
      'INVENTORY_COMPARE_EQUIP_UNEQUIP_REPLACE_FEEDBACK_WHEN_APPLICABLE',
      'SOUNDSERVICE_SOUNDGROUP_MIXING_AND_SPATIAL_ROLLOFF_WHEN_AUDIO_APPLICABLE',
      'REGION_OR_STATE_BGM_TRANSITION_WHEN_MULTIPLE_CONTEXTS_EXIST',
      'VFX_CAMERA_AUDIO_SHARE_AUTHORITATIVE_IMPACT_EVENT',
      'EXACT_SOURCE_ARTIFACT_CLOUD_RUNTIME_BEFORE_AFTER_AND_POST_PUBLISH_VERSION_QA'
    ]),
    ownerDisabledAudioCategoriesMustRemainDisabled:true,
    nativeRuntimeEvidenceRequired:true,
    mobileRuntimeEvidenceRequired:true
  })
});

const AUTONOMOUS_CONTENT_EXPANSION_POLICY_PATH='company-learning/vibe-autonomous-content-expansion-policy.json';
const AUTONOMOUS_CONTENT_EXPANSION_DEFAULT=Object.freeze({
  status:'ACTIVE',
  scope:Object.freeze({
    lifecycle:'EXISTING_BUILD_UP_ONLY',
    newWorkflowForbidden:true,
    newStageForbidden:true,
    newApprovalGateForbidden:true,
    separateIdeaProposalStageForbidden:true,
    platforms:Object.freeze(['WEB','ROBLOX','UNITY'])
  }),
  autonomy:Object.freeze({decisionOwner:'VIBE'}),
  dataCapacityBudget:Object.freeze({
    limits:Object.freeze({
      savePersistedDataBytes:2*1024*1024,
      webDownloadBytes:100*1024*1024,
      singleFileBytes:25*1024*1024,
      mobileMemoryTargetBytes:300*1024*1024,
      mobileMinimumFps:30
    }),
    warningRatio:0.8,
    contentCountLimit:null,
    buildUpGenerationLimit:null
  }),
  completenessEvolution:Object.freeze({
    eachIterationMustCheckExistingContentToo:true,
    quantityOnlyExpansionForbidden:true,
    cosmeticRenameOnlyVariationForbidden:true,
    statOnlyCloneVariationForbidden:true,
    disconnectedContentDumpForbidden:true,
    preserveCoherence:true,
    preserveCausality:true,
    preserveProgressionFlow:true,
    preserveWorldLogic:true,
    preserveEstablishedIdentity:true,
    improveWeakExistingContentWhenHigherValueThanAddingNewContent:true
  })
});

const TEXT_SOURCE_EXTENSIONS=new Set([
  '.js','.mjs','.ts','.tsx','.html','.htm','.css','.cs','.lua','.luau','.verse','.json','.uxml','.uss',
  '.unity','.prefab','.mat','.anim','.controller','.asset','.shader','.compute','.svg','.gltf','.obj','.rbxmx','.rbxlx'
]);
const BINARY_GAME_ASSET_EXTENSIONS=new Set(['.png','.jpg','.jpeg','.webp','.gif','.ogg','.mp3','.wav','.fbx','.glb']);
const GAME_SOURCE_EXTENSIONS=new Set([...TEXT_SOURCE_EXTENSIONS,...BINARY_GAME_ASSET_EXTENSIONS]);
const NON_EVOLUTION_BASENAMES=new Set([
  'roblox-source-bootstrap.json','prototype-source.json','unity-web-floor-source.json',
  'upper-platform-development-readiness.json','web-development-validation.json',
  'web-final-content-depth.json','web-runtime-evidence.json','web-actual-play.json',
  'web-independent-qa.json','web-regression.json'
]);

function evolutionFileEligible(file){
  const base=path.basename(file).toLowerCase();
  if(NON_EVOLUTION_BASENAMES.has(base))return false;
  return GAME_SOURCE_EXTENSIONS.has(path.extname(base).toLowerCase());
}

function walkSource(root){
  if(!root||!fs.existsSync(root))return[];
  const rows=[],stack=[root];
  while(stack.length){
    const current=stack.pop();
    let entries=[];try{entries=fs.readdirSync(current,{withFileTypes:true});}catch{continue;}
    for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))){
      if(['node_modules','Library','Temp','Logs','build','dist','.git','Binaries','Intermediate','Saved','Packages','ProjectSettings'].includes(entry.name))continue;
      const full=path.join(current,entry.name);
      if(entry.isDirectory()){stack.push(full);continue;}
      if(!entry.isFile()||!evolutionFileEligible(full))continue;
      rows.push(full);
    }
  }
  return rows.slice(0,300);
}

function measureSourceData(root){
  if(!root||!fs.existsSync(root))return{totalBytes:0,largestFileBytes:0,fileCount:0};
  let totalBytes=0,largestFileBytes=0,fileCount=0;
  const stack=[root],skip=new Set(['node_modules','.git','Library','Temp','Logs','Binaries','Intermediate','Saved','DerivedDataCache']);
  while(stack.length&&fileCount<20000){
    const current=stack.pop();
    let entries=[];try{entries=fs.readdirSync(current,{withFileTypes:true});}catch{continue;}
    for(const entry of entries){
      if(skip.has(entry.name))continue;
      const full=path.join(current,entry.name);
      if(entry.isDirectory()){stack.push(full);continue;}
      if(!entry.isFile())continue;
      let bytes=0;try{bytes=fs.statSync(full).size;}catch{}
      totalBytes+=Math.max(0,Number(bytes)||0);
      largestFileBytes=Math.max(largestFileBytes,Math.max(0,Number(bytes)||0));
      fileCount+=1;
      if(fileCount>=20000)break;
    }
  }
  return{totalBytes,largestFileBytes,fileCount};
}

function tokenCount(text,re){return (String(text).match(re)||[]).length;}

const CONTROL_FLOW_SYMBOLS=new Set(['if','for','while','switch','catch','with']);
function sourceAnchorCandidates(text='',file=''){
  const anchors=[],lines=String(text).split('\n');
  const patterns=[
    ['CLASS',/^\s*(?:export\s+)?(?:(?:public|private|protected|internal|abstract|sealed|static|partial)\s+)*class\s+([A-Za-z_$][\w$]*)/],
    ['FUNCTION',/^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$.:]*)\s*\(/],
    ['FUNCTION',/^\s*(?:local\s+)?function\s+([A-Za-z_$][\w$.:]*)\s*\(/],
    ['FUNCTION',/^\s*([A-Za-z_][\w]*)\s*(?:<[^>]+>)?\s*\([^)]*\)\s*(?:<[^>]+>)?\s*:[^=]+=/],
    ['FUNCTION',/^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/],
    ['METHOD',/^\s*(?:(?:public|private|protected|internal|static|async|virtual|override|sealed|partial)\s+)+(?:[A-Za-z_$][\w$<>,.?\[\]]*\s+)+([A-Za-z_$][\w$]*)\s*\(/],
    ['METHOD',/^\s*([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/]
  ];
  for(let index=0;index<lines.length;index++){
    const line=lines[index],trimmed=line.trim();
    if(!trimmed||trimmed.startsWith('//')||trimmed.startsWith('#'))continue;
    let matched=false;
    for(const [kind,re] of patterns){
      const match=line.match(re);
      if(!match)continue;
      const symbol=clean(match[1]);
      if(!symbol||CONTROL_FLOW_SYMBOLS.has(symbol.toLowerCase()))continue;
      const nearby=lines.slice(Math.max(0,index-2),Math.min(lines.length,index+4)).join(' ');
      const score=20
        +tokenCount(nearby,/attack|damage|combat|enemy|boss|player|input|progress|reward|unlock|quest|save|spawn|camera|animation|vfx|ui|touch|state|phase|mode|map|region|terrain|landmark|inventory|equip|item|menu|settings|interact|prompt|session|checkpoint|craft/gi)*8
        +(kind==='CLASS'?8:kind==='FUNCTION'?6:4);
      anchors.push({file,line:index+1,kind,symbol,context:clean(trimmed).slice(0,180),score});
      matched=true;break;
    }
    if(matched)continue;
    const state=line.match(/\b(?:state|phase|mode|status)\s*(?:=|:)\s*["']([A-Za-z0-9_-]{3,})["']/i);
    if(state)anchors.push({file,line:index+1,kind:'STATE',symbol:'STATE:'+clean(state[1]),context:clean(trimmed).slice(0,180),score:18});
  }
  return anchors.sort((a,b)=>b.score-a.score||a.file.localeCompare(b.file)||a.line-b.line).slice(0,24);
}

function selectPrimarySourceAnchors(source={},responsibleFiles=[],limit=6){
  const preferred=new Set((responsibleFiles||[]).map(posix).filter(Boolean));
  const anchors=[...(source?.sourceAnchors||[])];
  anchors.sort((a,b)=>(preferred.has(posix(b.file))?1:0)-(preferred.has(posix(a.file))?1:0)
    ||Number(b.score||0)-Number(a.score||0)
    ||String(a.file).localeCompare(String(b.file))
    ||Number(a.line||0)-Number(b.line||0));
  return anchors.slice(0,Math.max(1,Number(limit)||6));
}

function classifyPreviousEffectiveness({previousDirective=null,previousOutcome='',depthInfo={},runtimeEvidence={}}={}){
  const outcome=clean(previousOutcome).toLowerCase();
  const failed=['failed','error','rejected','repair_required'].includes(outcome);
  const verified=['verified','done','completed','pass','passed'].includes(outcome);
  const runtimeObserved=runtimeEvidence?.runtimeObserved===true;
  const runtimePassed=runtimeEvidence?.runtimePassed===true;
  const failure=clean(runtimeEvidence?.failureSignature)||clean(runtimeEvidence?.failureStage);
  const observedRuntimeFailure=runtimeObserved&&!runtimePassed&&Boolean(failure);
  if(failed||observedRuntimeFailure)return Object.freeze({classification:'REGRESSION',reason:failure||('previous generation outcome='+outcome),runtimeObserved});
  if(!previousDirective)return Object.freeze({classification:'NO_PREVIOUS_GENERATION',reason:'initial build-up generation',runtimeObserved:false});
  if(verified&&!depthInfo?.sourceChangedSincePrevious)return Object.freeze({classification:'NO_MEANINGFUL_EFFECT',reason:'verified status without real game source delta',runtimeObserved});
  if(verified&&depthInfo?.sourceChangedSincePrevious&&runtimeObserved&&runtimePassed)return Object.freeze({classification:'EFFECT_CONFIRMED',reason:'verified generation changed game source and current runtime observation passed',runtimeObserved});
  if(verified&&depthInfo?.sourceChangedSincePrevious&&runtimeObserved)return Object.freeze({classification:'PARTIAL_EFFECT',reason:'game source changed but runtime evidence is not a full pass',runtimeObserved});
  if(verified&&depthInfo?.sourceChangedSincePrevious)return Object.freeze({classification:'PARTIAL_EFFECT',reason:'all required generation work verified with source delta; runtime effect remains unobserved',runtimeObserved:false});
  return Object.freeze({classification:'UNKNOWN_RUNTIME_EFFECT',reason:'previous generation lacks sufficient verified effect evidence',runtimeObserved});
}

function depthStage(depth=1){
  const value=Math.max(1,Number(depth)||1);
  return value===1?'FOUNDATION_COMPLETENESS'
    :value===2?'ROLE_DIFFERENTIATION'
    :value===3?'SYSTEM_CONNECTION'
    :value===4?'DECISION_DENSITY'
    :value===5?'SIGNATURE_DEPTH'
    :`SIGNATURE_MASTERY_${value}`;
}

function expectedPlayerEffect({focus='CORE_FUN',identity='',anchor='',secondary=''}={}){
  const byFocus={
    CORE_FUN:identity+'에서 '+anchor+'의 선택 결과가 더 분명해지고 같은 입력 반복보다 상황 판단이 유리해진다.',
    PROGRESSION:identity+'에서 '+(secondary||anchor)+'의 목표·보상·해금이 다음 플레이 선택을 실제로 넓힌다.',
    PRESENTATION:identity+'에서 '+anchor+'의 위험·행동·정체성이 모션·VFX·카메라·UI를 통해 더 빠르게 읽힌다.',
    USABILITY:identity+'에서 핵심 행동과 다음 목표를 모바일에서 더 적은 오입력과 탐색 비용으로 수행한다.',
    STABILITY:identity+'에서 동일 입력과 상태가 반복 가능한 결과를 만들고 진행 차단·복구 실패가 사라진다.'
  };
  return byFocus[focus]||byFocus.CORE_FUN;
}

function decideNextVibeAction({previousEffectiveness={},previousOutcome='',focus='CORE_FUN'}={}){
  const classification=clean(previousEffectiveness?.classification).toUpperCase();
  const failed=['failed','error','rejected','repair_required'].includes(clean(previousOutcome).toLowerCase());
  if(failed||classification==='REGRESSION')return Object.freeze({action:'CAUSAL_REPAIR',reason:'verified failure/regression evidence has higher player value than unrelated build-up'});
  if(classification==='NO_MEANINGFUL_EFFECT')return Object.freeze({action:'CONTINUE_BUILD_UP_CURRENT_SYSTEM',reason:'previous verified status did not create a meaningful source/player-value delta; change strategy at the same depth'});
  if(classification==='UNKNOWN_RUNTIME_EFFECT')return Object.freeze({action:'REQUEST_REQUIRED_RUNTIME_OBSERVATION',reason:'effect cannot be promoted until relevant runtime or deterministic gameplay evidence is observed'});
  if(classification==='EFFECT_CONFIRMED')return Object.freeze({action:'MOVE_TO_NEXT_HIGHER_VALUE_GAP',reason:'previous generation effect is confirmed; advance to the next highest-value deferred gap'});
  if(classification==='PARTIAL_EFFECT')return Object.freeze({action:'CONTINUE_BUILD_UP_CURRENT_SYSTEM',reason:'source/QA progress exists but the player-value effect is not fully confirmed'});
  return Object.freeze({action:'CONTINUE_BUILD_UP_CURRENT_SYSTEM',reason:'initial '+focus+' build-up has no previous generation effect to compare'});
}

export function inspectGameSource({repoRoot=process.cwd(),sourceRoot=''}={}){
  // 파일명: tools/company-build-up-directive.mjs — 소스 범위 검증
  // 빈 경로나 저장소 루트를 게임 소스로 해석하지 않는다. 누락은 누락으로 반환한다.
  const repository=path.resolve(repoRoot);
  const requested=clean(sourceRoot);
  const resolved=requested?path.resolve(repository,requested):null;
  const relative=resolved?path.relative(repository,resolved):'';
  let absolute=null;
  if(relative&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative)){
    try{
      const realRepository=fs.realpathSync(repository);
      const realSource=fs.realpathSync(resolved);
      // 심볼릭 링크가 다른 게임이나 저장소 전체의 근거를 빌려오지 못하게 한다.
      if(path.relative(realRepository,realSource)===relative&&fs.statSync(realSource).isDirectory())absolute=resolved;
    }catch{}
  }
  const capacityMeasure=measureSourceData(absolute);
  const files=walkSource(absolute);
  const rows=files.map(file=>{
    let buffer=Buffer.alloc(0);try{buffer=fs.readFileSync(file);}catch{}
    const extension=path.extname(file).toLowerCase();
    const text=TEXT_SOURCE_EXTENSIONS.has(extension)?buffer.toString('utf8'):'';
    const relative=posix(path.relative(repoRoot,file));
    return{file:relative,text,buffer,bytes:buffer.length,sourceAnchors:TEXT_SOURCE_EXTENSIONS.has(extension)?sourceAnchorCandidates(text,relative):[]};
  });
  // 원형 교체 조사: 정적 발견은 삭제 명령이나 실제 렌더링 증거가 아니다.
  // 부품 생성 책임 파일을 F0부터 전달하고 숨은 충돌체·리그 루트는 작업자가 구분한다.
  const primitiveSourceFiles=rows.filter(row=>/\.luau?$/i.test(row.file)).flatMap(row=>{
    const lines=row.text.split(/\r?\n/);
    const sites=lines.flatMap((line,index)=>{
      const code=line.replace(/--.*$/,'');
      return /Instance\.new\s*\(\s*["'](?:Part|WedgePart|CornerWedgePart|TrussPart)["']/.test(code)
        ?[{line:index+1,source:clean(code)}]:[];
    });
    return sites.length?[{file:row.file,sites,classification:'REVIEW_VISIBLE_PRIMITIVE_OR_GAMEPLAY_SUPPORT'}]:[];
  });
  const joined=rows.map(row=>row.text).join('\n');
  const fingerprint=crypto.createHash('sha256');
  for(const row of rows){fingerprint.update(row.file);fingerprint.update('\0');fingerprint.update(row.buffer);fingerprint.update('\0');}
  const signals={
    combat:tokenCount(joined,/attack|damage|combat|hitbox|weapon|enemy|health|hp\b/gi),
    progression:tokenCount(joined,/progress|level|xp|reward|unlock|quest|wave|economy|gold|inventory|craft/gi),
    ai:tokenCount(joined,/state.?machine|aggro|target|pathfind|navmesh|steer|behavior|enemy.?ai/gi),
    save:tokenCount(joined,/datastore|playerprefs|save|load|serialize|persist/gi),
    multiplayer:tokenCount(joined,/remoteevent|serverrpc|clientrpc|network|multiplayer|playeradded|netcode/gi),
    animation:tokenCount(joined,/animator|animation|animationtrack|loadanimation|blend.?tree|tween|heartbeat|renderstepped|lerp|slerp|coroutine|motor6d|bone\b|transform\.rotate/gi),
    motionStates:tokenCount(joined,/\bidle\b|\bwalk\b|\bjog\b|\brun\b|start|stop|turn|jump|land|attack|hit.?reaction|death|anticipation|impact|recovery/gi),
    gameFeel:tokenCount(joined,/hit.?stop|recoil|anticipation|impact|recovery|screen.?shake|camera.?kick|weapon.?trail|attack.?windup|attack.?follow.?through/gi),
    vfx:tokenCount(joined,/particle|trail|vfx|effect|flash|shake|afterimage/gi),
    camera:tokenCount(joined,/camera|fieldofview|fov|cinemachine/gi),
    audio:tokenCount(joined,/soundservice|soundgroup|sound\b|audio\b|music|bgm|sfx|audioclip|audiosource|audiomixer|webaudio|audiocontext/gi),
    audioDynamics:tokenCount(joined,/crossfade|fade.?in|fade.?out|duck|soundgroup|audiomixer|rolloff|spatial|ambient|region.?music|battle.?music|combat.?music|music.?state|bgm.?state/gi),
    ui:tokenCount(joined,/screenui|screengui|canvas|button|hud|label|uitoolkit|ongui/gi),
    uiFlow:tokenCount(joined,/menu|panel|modal|popup|tab|scroll|backbutton|closebutton|navigation|screen.?stack|page.?stack/gi),
    entryFlow:tokenCount(joined,/main.?menu|lobby|entry.?hub|start.?game|play.?button|session.?ready|first.?play/gi),
    loadingFlow:tokenCount(joined,/loading.?screen|loading.?overlay|preloadasync|loadsceneasync|load.?progress|asset.?readiness|session.?join.?status/gi),
    input:tokenCount(joined,/userinputservice|contextactionservice|touch|mousebutton|keycode|inputaction|onclick|activated/gi),
    map:tokenCount(joined,/world|map|region|biome|zone|terrain|dungeon|village|town|island|forest|jungle|snow|desert|lake|room|floor|portal/gi),
    landmark:tokenCount(joined,/landmark|checkpoint|spawnpoint|waypoint|signpost|tower|temple|castle|school|shop|hospital|station/gi),
    interaction:tokenCount(joined,/interact|proximityprompt|clickdetector|pickup|collect|open|useitem|activate|trigger|prompt/gi),
    inventory:tokenCount(joined,/inventory|itemslot|slot|stack|hotbar|backpack|itemdata|itemid/gi),
    equipment:tokenCount(joined,/equip|unequip|equipment|weapon.?slot|armor|loadout|equipped/gi),
    settings:tokenCount(joined,/settings|volume|musicvolume|sfxvolume|camera.?shake|sensitivity|accessibility|ui.?scale|graphics.?quality/gi),
    feedback:tokenCount(joined,/toast|notification|feedback|tooltip|floating.?text|damage.?number|message|success|failed|complete|reward.?popup/gi),
    session:tokenCount(joined,/restart|result|gameover|victory|defeat|respawn|checkpoint|return.?menu|start.?game|end.?game|session/gi),
    content:tokenCount(joined,/enemy|monster|boss|item|weapon|quest|region|biome|event|building|npc|recipe|skill|ability/gi),
    choice:tokenCount(joined,/choice|select|option|branch|build|loadout|strategy|upgrade.?choice|choose/gi),
    connection:tokenCount(joined,/inventory.*equip|equip.*inventory|reward.*unlock|unlock.*region|quest.*reward|drop.*craft|craft.*equip|map.*quest|region.*resource|resource.*craft/gi),
    performance:tokenCount(joined,/pool|objectpool|debounce|throttle|debri|destroy\s*\(|disconnect\s*\(|cleanup|dispose|lod|cull|streaming|budget|fps|memory|gc\b/gi),
    lighting:tokenCount(joined,/lighting|light\b|colorcorrection|postprocess|ambient|shadow/gi),
    primitive:tokenCount(joined,/createprimitive|primitivetype|instance\.new\(["']Part["']|shape\s*=|capsule|sphere|cube/gi),
    todo:tokenCount(joined,/TODO|FIXME|NotImplementedException/g),
    errorRecovery:tokenCount(joined,/try\s*\{|catch\s*\(|pcall|xpcall|fallback|retry|recover/gi)
  };
  const topFiles=rows.map(row=>({
    file:row.file,
    score:
      tokenCount(row.text,/attack|damage|combat|enemy|player|progress|quest|save|ui|camera|animation|motion|particle|vfx|sound|audio|music|bgm|sfx|map|region|terrain|landmark|inventory|equip|item|menu|settings|interact|prompt|session|checkpoint|craft/gi)
  })).sort((a,b)=>b.score-a.score||a.file.localeCompare(b.file)).slice(0,12);
  const sourceAnchors=rows.flatMap(row=>row.sourceAnchors||[]).sort((a,b)=>Number(b.score||0)-Number(a.score||0)||a.file.localeCompare(b.file)||Number(a.line||0)-Number(b.line||0)).slice(0,48);
  return Object.freeze({
    sourceRoot:posix(sourceRoot),
    sourceTreeFingerprint:files.length?fingerprint.digest('hex'):sha('missing:'+sourceRoot),
    fileCount:files.length,
    dataFileCount:capacityMeasure.fileCount,
    sourceBytes:capacityMeasure.totalBytes,
    largestFileBytes:capacityMeasure.largestFileBytes,
    topFiles,
    sourceAnchors:Object.freeze(sourceAnchors),
    primitiveSourceFiles:Object.freeze(primitiveSourceFiles),
    signals,
    observations:uniq([
      files.length===0?'CURRENT_SOURCE_MISSING_OR_UNREADABLE':'CURRENT_SOURCE_FILES='+files.length,
      signals.primitive>8?'PLACEHOLDER_OR_PRIMITIVE_USAGE_HIGH':null,
      signals.animation<2?'MOTION_IMPLEMENTATION_SPARSE':null,
      signals.motionStates<5?'MOTION_STATE_COVERAGE_SPARSE':null,
      signals.gameFeel<3?'GAME_FEEL_SPARSE':null,
      signals.vfx<2?'VFX_IMPLEMENTATION_SPARSE':null,
      signals.camera<1?'CAMERA_LANGUAGE_SPARSE':null,
      signals.audio<2?'AUDIO_IMPLEMENTATION_SPARSE':null,
      signals.audio>0&&signals.audioDynamics<2?'AUDIO_STATE_TRANSITION_SPARSE':null,
      signals.progression<4?'PROGRESSION_IMPLEMENTATION_SPARSE':null,
      signals.ai<2?'AI_BEHAVIOR_DEPTH_SPARSE':null,
      signals.map<3?'WORLD_MAP_IMPLEMENTATION_SPARSE':null,
      signals.inventory>0&&signals.equipment<2?'INVENTORY_EQUIPMENT_FLOW_SPARSE':null,
      signals.ui>0&&(signals.uiFlow<2||signals.entryFlow<1||signals.loadingFlow<1)?'UI_MENU_FLOW_SPARSE':null,
      signals.interaction<2?'INTERACTION_DISCOVERABILITY_SPARSE':null,
      signals.session<2?'SESSION_FLOW_SPARSE':null,
      signals.settings<1?'SETTINGS_ACCESSIBILITY_SPARSE':null,
      signals.performance<2?'PERFORMANCE_BUDGET_SPARSE':null,
      signals.todo>0?'EXPLICIT_TODO_OR_NOT_IMPLEMENTED_PRESENT':null
    ])
  });
}

export function inspectGameSources({repoRoot=process.cwd(),sourceRoots=[]}={}){
  const roots=uniq(sourceRoots).filter(root=>root&&fs.existsSync(path.resolve(repoRoot,root)));
  if(!roots.length)return inspectGameSource({repoRoot,sourceRoot:clean(sourceRoots?.[0])});
  const parts=roots.map(sourceRoot=>inspectGameSource({repoRoot,sourceRoot}));
  const signals={};
  for(const part of parts)for(const [key,value] of Object.entries(part.signals||{}))signals[key]=(signals[key]||0)+Number(value||0);
  const combinedFingerprint=sha(parts.map(part=>part.sourceTreeFingerprint).sort().join('|'));
  const topFiles=parts.flatMap(part=>part.topFiles||[]).sort((a,b)=>Number(b.score||0)-Number(a.score||0)||a.file.localeCompare(b.file)).slice(0,20);
  const sourceAnchors=parts.flatMap(part=>part.sourceAnchors||[]).sort((a,b)=>Number(b.score||0)-Number(a.score||0)||a.file.localeCompare(b.file)||Number(a.line||0)-Number(b.line||0)).slice(0,64);
  return Object.freeze({
    sourceRoot:roots.join('|'),
    sourceRoots:Object.freeze(roots),
    sourceTreeFingerprint:combinedFingerprint,
    fileCount:parts.reduce((n,part)=>n+Number(part.fileCount||0),0),
    dataFileCount:parts.reduce((n,part)=>n+Number(part.dataFileCount||0),0),
    sourceBytes:parts.reduce((n,part)=>n+Number(part.sourceBytes||0),0),
    largestFileBytes:parts.reduce((n,part)=>Math.max(n,Number(part.largestFileBytes||0)),0),
    topFiles:Object.freeze(topFiles),
    sourceAnchors:Object.freeze(sourceAnchors),
    primitiveSourceFiles:Object.freeze(parts.flatMap(part=>part.primitiveSourceFiles||[])),
    signals:Object.freeze(signals),
    observations:Object.freeze(uniq(parts.flatMap(part=>part.observations||[]))),
    platformSourceFingerprints:Object.freeze(Object.fromEntries(parts.map(part=>[part.sourceRoot,part.sourceTreeFingerprint])))
  });
}


export function extractDesignContext(record={}){
  const d=record?.content&&typeof record.content==='object'?record.content:record;
  const asObject=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  const projection={...d};
  normalizeWebCanonicalAndExpansionPolicy(projection,{},clean(d?.multiplayerMode),[]);
  const systems=(Array.isArray(d?.signatureSystems)?d.signatureSystems:[]).map(system=>({
    ...system,
    name:clean(system?.name),
    purpose:clean(system?.purpose),
    playerChoice:clean(system?.playerChoice)
  })).filter(x=>x.name||x.purpose||x.playerChoice).slice(0,12);
  return Object.freeze({
    identity:clean(d?.identity),
    creativeGrammar:d?.creativeGrammar&&typeof d.creativeGrammar==='object'?d.creativeGrammar:{},
    playerFantasy:clean(d?.playerFantasy),
    genre:clean(d?.robloxBuildProfile?.genre||d?.genre),
    subgenre:clean(d?.robloxBuildProfile?.subgenre||d?.subgenre),
    ownerFeatureChanges:Array.isArray(d?.ownerFeatureChanges)?d.ownerFeatureChanges:[],
    detailedDesign:asObject(d?.detailedDesign),
    ...((record?.detailedAssetLibraryHandoff||d?.detailedAssetLibraryHandoff)?.platformSelection?{detailedAssetLibraryHandoff:asObject(record?.detailedAssetLibraryHandoff||d?.detailedAssetLibraryHandoff)}:{}),
    tutorialPlan:asObject(d?.tutorialPlan),
    presentationPlan:asObject(d?.presentationPlan),
    interfacePlan:asObject(d?.interfacePlan),
    verificationPlan:asObject(d?.verificationPlan),
    spatialLayout:asObject(d?.spatialLayout),
    spatialDimension:clean(d?.spatialLayout?.dimension||d?.spatialDimension),
    coreFun:clean(d?.coreFun),
    coreLoop:uniq(d?.coreLoop).slice(0,10),
    signatureSystems:systems,
    systemInterconnections:(Array.isArray(d?.systemInterconnections)?d.systemInterconnections:[]).map(row=>({...row,fromSystem:clean(row?.fromSystem),toSystem:clean(row?.toSystem),trigger:clean(row?.trigger),stateChange:clean(row?.stateChange)})).filter(row=>row.fromSystem||row.toSystem).slice(0,24),
    progressionEconomyBalance:asObject(d?.progressionEconomyBalance),
    contentExpansionPlan:(Array.isArray(d?.contentExpansionPlan)?d.contentExpansionPlan:[]).map(row=>({...row,milestone:clean(row?.milestone),newGameplay:clean(row?.newGameplay),systemImpact:clean(row?.systemImpact)})).slice(0,8),
    failureRetryRisk:asObject(d?.failureRetryRisk),
    platformFitPlan:asObject(d?.platformFitPlan),
    webCanonicalDesign:projection.webCanonicalDesign,
    platformExpansionPolicy:projection.platformExpansionPolicy,
    visualDirection:clean(d?.visualDirection),
    mobileUx:clean(d?.mobileUx),
    uxAccessibilityPlan:asObject(d?.uxAccessibilityPlan),
    artAudioDirection:asObject(d?.artAudioDirection),
    selectedDesignPlan:asObject(d?.selectedDesignPlan),
    contentVarietyPlan:asObject(d?.contentVarietyPlan),
    narrativeDialoguePlan:asObject(d?.narrativeDialoguePlan),
    narrativeWorldRules:uniq(d?.narrativeDialoguePlan?.worldRules).slice(0,8),
    referenceCausalInspirations:(Array.isArray(d?.referenceHomagePlan?.inspirations)?d.referenceHomagePlan.inspirations:[]).map(row=>({titleOrTradition:clean(row?.titleOrTradition),rightsBasis:clean(row?.rightsBasis),borrowedTechnique:clean(row?.borrowedTechnique),transformation:clean(row?.transformation)})).slice(0,8),
    designIntegrityNotes:uniq(d?.designIntegrityPlan?.notes).slice(0,12),
    implementationTraceability:(Array.isArray(d?.implementationTraceability)?d.implementationTraceability:[]).slice(0,8),
    stabilityPriorityPlan:asObject(d?.stabilityPriorityPlan),
    preservationContract:asObject(d?.preservationContract),
    progressionDirection:clean(d?.progressionDirection),
    multiplayerMode:clean(d?.multiplayerMode),
    platformProfiles:d?.platformProfiles&&typeof d.platformProfiles==='object'?d.platformProfiles:{}
  });
}

// 설계 후 볼륨·완성도: 승인 설계의 개별 항목과 기존 소스 후보를 추적한다.
// 정적 이름 일치만으로 실제 구현·플랫폼 런타임 완료를 판정하지 않는다.
function buildDesignedGameVolume({design={},source={},safeDesignlessMode=false}={}){
  const items=[],seen=new Set();
  const preservationOnly=clean(design?.preservationContract?.mode).toUpperCase()==='PRESERVATION_PRESENTATION_UPGRADE';
  const anchors=Array.isArray(source?.sourceAnchors)?source.sourceAnchors:[];
  const traces=Array.isArray(design?.implementationTraceability)?design.implementationTraceability:[];
  const add=(family,index,value)=>{
    const detail=value&&typeof value==='object'&&!Array.isArray(value)?value:{step:clean(value)};
    const title=clean(detail.name||detail.milestone||detail.designElement||detail.role||detail.humanId
      ||(detail.fromSystem&&detail.toSystem&&clean(detail.fromSystem)+' → '+clean(detail.toSystem))
      ||detail.step||detail.phase||detail.id)||family+' #'+(index+1);
    const authoredId=clean(detail.id||detail.ruleId||detail.humanId);
    const names=uniq([authoredId,detail.name,detail.milestone,detail.designElement,title])
      .filter(name=>name.length>=3).map(name=>name.toLowerCase());
    const namedAnchors=anchors.filter(row=>clean(row?.file)&&names.some(name=>
      clean(row?.symbol).toLowerCase()===name||clean(row?.context).toLowerCase().includes(name)
    )).map(row=>Object.freeze({file:posix(row.file),line:Number(row.line)||null,symbol:clean(row.symbol),kind:clean(row.kind)}));
    const trace=traces.find(row=>{
      const element=clean(row?.designElement).toLowerCase();
      return element&&names.some(name=>element===name||element.includes(name));
    });
    const playerChoice=clean(detail.playerChoice||detail.counterplay||detail.riskReward||detail.changedChoice||detail.variation);
    const trigger=clean(detail.trigger||detail.entryState||detail.encounterPattern||detail.traversal||detail.milestone);
    const stateChange=clean(detail.stateChange||detail.actionAndResponse||detail.effect||detail.systemImpact||detail.rewardMeaning||detail.newGameplay);
    const identity=family+':'+title.toLowerCase();
    const review=[];
    if(family==='SIGNATURE_SYSTEM'&&!playerChoice)review.push('PLAYER_CHOICE_UNSPECIFIED');
    if(family==='CONTENT_MILESTONE'&&!trigger)review.push('MILESTONE_TRIGGER_UNSPECIFIED');
    if(['SYSTEM_CONNECTION','CONTENT_MILESTONE'].includes(family)&&!stateChange)review.push('STATE_CHANGE_UNSPECIFIED');
    if(seen.has(identity))review.push('DUPLICATE_DESIGN_TITLE_REVIEW');
    seen.add(identity);
    const linkedRuleIds=uniq([
      ...(Array.isArray(detail.ruleIds)?detail.ruleIds:[]),detail.fromId,detail.toId,detail.ruleId,
      ...((design.systemInterconnections||[]).filter(row=>authoredId&&
        (clean(row?.fromId)===authoredId||clean(row?.toId)===authoredId)).flatMap(row=>[row.fromId,row.toId]))
    ]);
    // 개수 확보가 아니라 실제 플레이 연결·실패 복귀·기존 시스템 책임에 대한 구현 조건.
    const requiredBehavior=family==='PLAYTHROUGH'?[
      'ENTRY_FIRST_INPUT_CONDITION_FEEDBACK_RESULT_NEXT_CHOICE_CONNECTED',
      'CANCEL_FAILURE_AND_RETRY_PRESERVE_EXISTING_STATE_AND_SAVE',
      'PLANNED_BEFORE_AFTER_VALUES_ARE_NOT_RUNTIME_EVIDENCE'
    ]:family==='CORE_LOOP'?[
      'CURRENT_STEP_IS_REACHABLE_FROM_PREVIOUS_SESSION_OR_LOOP_STATE',
      'PLAYER_ACTION_TRANSITIONS_TO_NEXT_AUTHORED_LOOP_STEP',
      'SUCCESS_FAILURE_AND_RETRY_FEEDBACK_OBSERVABLE'
    ]:family==='SIGNATURE_SYSTEM'?[
      'DESIGNED_RULE_ID_INPUT_OUTPUT_STATE_KEYS_BOUND_TO_EXISTING_GAME_SYSTEM',
      'ALTERNATIVE_PLAYER_CHOICES_CHANGE_AUTHORED_STATE_OR_CONSEQUENCE',
      'CORE_LOOP_AND_OTHER_SIGNATURE_SYSTEMS_SHARE_AUTHORITATIVE_STATE'
    ]:family==='SYSTEM_CONNECTION'?[
      'FROM_SYSTEM_EMITS_DECLARED_STATE_KEYS',
      'TO_SYSTEM_CONSUMES_SAME_STATE_KEYS_WITHOUT_DUPLICATE_SHADOW_STATE',
      'TRIGGER_AND_RESULT_VERIFIED_BOTH_SIDES',
      'SUCCESS_ALTERNATIVE_CANCEL_AND_REVERSE_HANDOFF_USE_EXISTING_STATE'
    ]:family==='CONTENT_MILESTONE'&&preservationOnly?[
      'PRESENTATION_MILESTONE_BINDS_ONLY_TO_EXISTING_GAME_STATE',
      'NO_NEW_GAMEPLAY_RULE_PROGRESSION_BALANCE_SAVE_OR_NETWORK_SEMANTIC',
      'NATIVE_RENDER_MOTION_VFX_AUDIO_UI_AND_MOBILE_REPLAY_ONLY_WHEN_APPLICABLE'
    ]:family==='CONTENT_MILESTONE'?[
      'MILESTONE_UNLOCK_CONDITION_AND_PREVIOUS_PROGRESS_REACHABLE',
      'NEW_GAMEPLAY_CONNECTED_TO_EXISTING_ACTION_REWARD_AND_NEXT_GOAL',
      'NEW_PLAYER_CHOICE_AND_PREVIOUS_MILESTONE_STATE_LINKED_TO_EXISTING_OWNER',
      'MILESTONE_FAILURE_RETRY_AND_SAVED_PROGRESS_PRESERVED'
    ]:family==='VARIETY_REGIONS'?[
      'NATIVE_3D_REGION_ENTRY_EXIT_AND_ROUTE_REACHABLE',
      'TRAVERSAL_LANDMARK_RISK_RESOURCE_AND_ENCOUNTER_ROLES_DISTINCT',
      'DISCOVERY_NEXT_OBJECTIVE_AND_RETURN_REASON_CONNECTED'
    ]:family==='VARIETY_ENEMIESORCHALLENGES'?[
      'ENEMY_BEHAVIOR_POSITIONING_TIMING_MOBILITY_AND_GROUP_ROLE_APPLIED',
      'TELEGRAPH_AND_PLAYER_COUNTERPLAY_OBSERVABLE',
      'REWARD_AND_ENCOUNTER_PROGRESS_CONNECTED_WITHOUT_BALANCE_CHANGE'
    ]:family==='VARIETY_ABILITIES'?[
      'EXACT_APPROVED_OWNER_TRIGGER_RANGE_RESOURCE_COST_COOLDOWN_PRESERVED',
      'SERVER_OWNED_EFFECT_STATE_VALIDATION_AND_PRESENTATION_FEEDBACK',
      'CANCEL_FAIL_RETRY_AND_MULTIPLAYER_STATE_CONSISTENCY'
    ]:family==='VARIETY_OBJECTIVES'?[
      'OBJECTIVE_ACTIVATION_AND_PROGRESS_CONDITIONS_REACHABLE',
      'RESULT_REWARD_OR_NEXT_GOAL_CONNECTED_TO_EXISTING_FLOW',
      'DUPLICATE_COMPLETION_AND_RECONNECT_PROTECTED'
    ]:family==='VARIETY_ROLETRANSITIONS'?[
      'AUTHORITATIVE_PRE_POST_ROLE_STATES_AND_RETENTION_RULES_PRESERVED',
      'ROLE_CHANGE_PLAYER_CHOICE_AND_ABILITY_USAGE_PLAYABLE',
      'SAVE_NETWORK_AND_RESPAWN_RECOVERY_VERIFIED'
    ]:family.startsWith('NARRATIVE_')?[
      'STORY_BEAT_OR_QUEST_STATE_TRIGGERED_BY_REAL_GAME_ACTION',
      'WORLD_OR_OBJECTIVE_STATE_AND_NEXT_BEAT_CHANGE_OBSERVABLE',
      'REPLAY_RECONNECT_AND_NARRATIVE_CAUSAL_ORDER_PRESERVED'
    ]:family==='IMPLEMENTATION_TRACE'?[
      'EXACT_DESIGN_ELEMENT_BOUND_TO_EXISTING_RESPONSIBLE_SOURCE',
      'DESIGN_VALIDATION_EVIDENCE_REPLAYED_IN_NATIVE_GAME_RUNTIME',
      'QA_RESULT_LINKED_TO_EXACT_SOURCE_REVISION'
    ]:[
      'EXISTING_SYSTEM_OR_SOURCE_OWNER_REVIEW_REQUIRED',
      'DESIGNED_BEHAVIOR_APPLIED_WITH_OBSERVABLE_PLAYER_CHOICE',
      'PLATFORM_RUNTIME_AND_PRESERVATION_REGRESSION_REQUIRED'
    ];
    items.push(Object.freeze({
      ref:family+'['+index+']',family,index,title,authoredId:authoredId||null,
      designDetail:Object.freeze({...detail}),playerChoice:playerChoice||null,trigger:trigger||null,
      stateChange:stateChange||null,linkedRuleIds:Object.freeze(linkedRuleIds),
      designResponsibleSystem:clean(trace?.responsibleSystem)||null,
      sourceCandidates:Object.freeze(namedAnchors),
      sourceEvidenceState:namedAnchors.length?'EXACT_NAME_SOURCE_CANDIDATE_UNVERIFIED':'EXACT_SOURCE_OWNER_REVIEW_REQUIRED',
      implementationVerified:false,runtimeVerified:false,
      designReviewNeeded:Object.freeze(review),
      requiredBehavior:Object.freeze(requiredBehavior),
      buildUpStatus:'AUTHORED_REQUIREMENTS_NOT_YET_NATIVE_IMPLEMENTATION_VERIFIED',
      observableAcceptance:clean(detail.validationEvidence||trace?.validationEvidence)
        ||'실제 '+title+' 입력/조건→권위 상태 변화→피드백→다음 선택의 정상·실패·재시도 경로를 검증',
      requiredStages:Object.freeze([
        'INSPECT_EXISTING_RESPONSIBLE_FUNCTION','IMPLEMENT_AUTHORED_BEHAVIOR_AND_CONNECTED_STATE',
        'VERIFY_ACTUAL_PLAYER_ACTION_AND_RESULT','REPLAY_PLATFORM_QA_SAVE_AND_RUNTIME'
      ])
    }));
  };
  if(!safeDesignlessMode){
    const groups=[['PLAYTHROUGH',design.selectedDesignPlan?.playthrough],['CORE_LOOP',design.coreLoop],['SIGNATURE_SYSTEM',design.signatureSystems],
      ['SYSTEM_CONNECTION',design.systemInterconnections],['CONTENT_MILESTONE',design.contentExpansionPlan]];
    for(const [name,rows] of Object.entries(design.contentVarietyPlan||{}).sort(([a],[b])=>a.localeCompare(b))){
      if(Array.isArray(rows))groups.push(['VARIETY_'+name.toUpperCase(),rows]);
    }
    if(design.narrativeDialoguePlan?.applicable===true){
      for(const name of ['questStates','plotBeats','sceneBeats']){
        const rows=design.narrativeDialoguePlan[name];
        if(Array.isArray(rows))groups.push(['NARRATIVE_'+name.toUpperCase(),rows]);
      }
    }
    if(design.creativeGrammar?.a)groups.push(['CREATIVE_A_SYSTEM_AND_SOURCE',[{name:design.creativeGrammar.a.system+' × '+design.creativeGrammar.a.material,trigger:design.creativeGrammar.a.system,stateChange:design.creativeGrammar.a.stateChange}]]);
    if(design.creativeGrammar?.b)groups.push(['CREATIVE_B_SYSTEM_AND_SOURCE',[{name:design.creativeGrammar.b.system+' × '+design.creativeGrammar.b.material,trigger:design.creativeGrammar.b.system,stateChange:design.creativeGrammar.b.stateChange}]]);
    if(Number(design.creativeGrammar?.standardVersion||0)<1&&Array.isArray(design.creativeGrammar?.cThemes))groups.push(['CREATIVE_C_THEME_FUSION',design.creativeGrammar.cThemes.map(row=>({name:row.name,trigger:row.kind,stateChange:row.gameplayEffect}))]);
    if(Array.isArray(design.creativeGrammar?.dCreations))groups.push(['CREATIVE_D_CREATIONS',design.creativeGrammar.dCreations.map(row=>({
      id:row.id,name:row.creation,trigger:row.action,stateChange:row.gameplayEffect,
      materialPath:row.materialPath,sourceFeature:row.sourceFeature,condition:row.condition,
      consequence:row.consequence,risk:row.risk,genreRoles:row.genreRoles,
      linkedElements:row.linkedElements,observableAcceptance:row.consequence
    }))]);
    if(Array.isArray(design.creativeGrammar?.cGenres))groups.push(['CREATIVE_C_PRIMARY_SECONDARY_GENRE',design.creativeGrammar.cGenres.map(row=>({name:row.role+' '+row.name,trigger:row.role,stateChange:row.gameplayEffect}))]);
    if(design.creativeGrammar?.cGenreInterlock)groups.push(['CREATIVE_C_GENRE_INTERLOCK',[{name:'메인·보조 장르 플레이 인과',trigger:'두 장르 동시 발동',stateChange:design.creativeGrammar.cGenreInterlock}]]);
    if(Array.isArray(design.creativeGrammar?.delveDiscoveries))groups.push(['CREATIVE_AT_DELVE',design.creativeGrammar.delveDiscoveries.map(row=>
      Number(design.creativeGrammar?.standardVersion||0)>=1?{
        name:row.discovery,trigger:row.experiment||row.clue,stateChange:row.newChoice,
        sourceDId:row.sourceDId,clue:row.clue,nextQuestion:row.nextQuestion,
        observableAcceptance:row.nextQuestion
      }:{name:row.discovery,trigger:row.clue,stateChange:row.newChoice}
    )]);
    groups.push(['IMPLEMENTATION_TRACE',traces]);
    for(const [family,rows] of groups)if(Array.isArray(rows))rows.forEach((row,index)=>add(family,index,row));
  }
  const authoredCounts=Object.fromEntries([...new Set(items.map(row=>row.family))].map(family=>[
    family,items.filter(row=>row.family===family).length
  ]));
  return Object.freeze({
    version:1,boundary:'EXISTING_GAME_SPECIFIC_BUILD_UP_DIRECTIVE_ONLY',
    sourceTreeFingerprint:clean(source?.sourceTreeFingerprint)||null,
    mode:safeDesignlessMode?'SOURCE_SAFE_NO_DESIGN_CONTENT_EXPANSION':preservationOnly?'PRESERVATION_PRESENTATION_MILESTONES_ONLY':'APPROVED_DESIGN_TO_NATIVE_CONTENT_IMPLEMENTATION',
    authoredItemCount:items.length,authoredCounts:Object.freeze(authoredCounts),
    namedSourceCandidateCount:items.filter(row=>row.sourceCandidates.length>0).length,
    sourceReviewRequiredCount:items.filter(row=>row.sourceCandidates.length===0).length,
    implementationVerifiedCount:0,runtimeVerifiedCount:0,
    authoredCountsAreNotImplementedOrPlayableCounts:true,noArbitraryContentQuota:true,
    coverageState:'DESIGN_CONTENT_INDEXED_NATIVE_IMPLEMENTATION_AND_RUNTIME_PENDING',
    absenceOfNameMatchIsNotProofOfMissingImplementation:true,
    existingSaveBalanceEconomyNetworkAuthorityPreserved:true,
    action:preservationOnly?'IMPROVE_EXISTING_RENDER_MOTION_UI_AUDIO_ONLY_AND_PRESERVE_GAMEPLAY_MEANING':'BIND_EACH_APPROVED_ITEM_TO_EXISTING_RESPONSIBLE_SOURCE_AND_PROVE_CONNECTED_PLAYER_FACING_RESULT',
    acceptance:Object.freeze([
      'EACH_AUTHORED_ITEM_REQUIRES_EXACT_DESIGN_SOURCE_AND_PLAYER_EVIDENCE',
      'CONTENT_REQUIRES_TRIGGER_STATE_PLAYER_CHOICE_NEXT_GOAL_CONNECTION_WHEN_APPLICABLE',
      'SOURCE_NAMES_OR_SYMBOLS_ARE_NOT_IMPLEMENTATION_PASS',
      'NATIVE_ACTION_STATE_RESULT_FAILURE_AND_RETRY_QA_REQUIRED',
      'SPATIAL_CONTENT_REQUIRES_REAL_NATIVE_3D_AND_MOBILE_RUNTIME_QA',
      'PRESERVE_EXISTING_BALANCE_SAVE_ECONOMY_AND_NETWORK_AUTHORITY'
    ]),
    items:Object.freeze(items)
  });
}

// 단일 디자이너 원본의 MAIN/A/B/C/@를 실제 플랫폼 소스에 연결한다. 과거 c는 존재할 때만 보존한다.
// 파일/함수 발견은 '구현 완료' 증거가 아니며 BUILD_UP/독립 런타임 QA의 책임을 바꾸지 않는다.
export function buildDesignToPlatformCodingTrace({
  gameId='',design={},platform='COMMON',sourceRoot='',sourceObservation={},
  responsibleFiles=[],repoRoot=process.cwd(),multiplayerRequired=true
}={}){
  const id=clean(gameId);
  if(!/^[a-z0-9][a-z0-9-]*$/.test(id))throw new Error('DESIGN_CODING_GAME_ID_INVALID');
  const roots=Object.freeze({
    ROBLOX:`roblox-games/${id}`,
    UNITY_WEB:`unity-games/${id}`,
    UNITY_APP:`unity-games/${id}`
  });
  const declared=clean(platform).toUpperCase();
  const observedRoot=posix(clean(sourceRoot||sourceObservation?.sourceRoot));
  const selected=declared==='ROBLOX'?'ROBLOX':
    declared==='UNITY_WEB'?'UNITY_WEB':
    declared==='UNITY_APP'||declared==='UNITY'?'UNITY_APP':
    declared==='WEB'&&(observedRoot.split('|').includes(roots.UNITY_WEB))?'UNITY_WEB':
    declared==='COMMON'&&observedRoot.split('|').includes(roots.ROBLOX)?'ROBLOX':
    declared==='COMMON'&&observedRoot.split('|').includes(roots.UNITY_WEB)?'UNITY_APP':
    'NOT_SELECTED_NATIVE_PLATFORM';
  const designRoles=Array.isArray(design.signatureSystems)?design.signatureSystems:[];
  const connections=Array.isArray(design.systemInterconnections)?design.systemInterconnections:[];
  // V5의 C는 두 소재·두 장르의 인과 계약이다. 원본에 없는 예전 c 기계축을 요구하지 않는다.
  const creativeGrammar=design.creativeGrammar&&typeof design.creativeGrammar==='object'&&!Array.isArray(design.creativeGrammar)?design.creativeGrammar:null;
  const hasCreativeGrammar=Boolean(creativeGrammar&&Object.keys(creativeGrammar).length);
  const standardGrammar=Number(creativeGrammar?.standardVersion||0)>=1;
  const cThemes=Array.isArray(creativeGrammar?.cThemes)?creativeGrammar.cThemes:[];
  const cGenres=Array.isArray(creativeGrammar?.cGenres)?creativeGrammar.cGenres:[];
  const dCreations=Array.isArray(creativeGrammar?.dCreations)?creativeGrammar.dCreations:[];
  const delveDiscoveries=Array.isArray(creativeGrammar?.delveDiscoveries)?creativeGrammar.delveDiscoveries:[];
  const sourcedAB=['a','b'].every(key=>clean(creativeGrammar?.[key]?.system)&&clean(creativeGrammar?.[key]?.material)
    &&clean(creativeGrammar?.[key]?.materialDomain)&&clean(creativeGrammar?.[key]?.stateChange));
  const genreReady=cGenres.length===2
    &&['PRIMARY','SECONDARY'].every(role=>cGenres.some(row=>row?.role===role&&clean(row?.name)&&clean(row?.gameplayEffect)))
    &&new Set(cGenres.map(row=>clean(row?.name).toLowerCase())).size===2;
  const themesReady=cThemes.length===2
    &&new Set(cThemes.map(row=>clean(row?.name).toLowerCase())).size===2
    &&cThemes.every(row=>clean(row?.name)&&clean(row?.gameplayEffect));
  // [기본설계] 신문법 C는 작품 장르 두 개다. 예전 C 소재 두 개는 기존 설계 호환에만 적용한다.
  const creativeCReady=Boolean(hasCreativeGrammar&&sourcedAB&&clean(creativeGrammar?.abCausality)
    &&(standardGrammar||themesReady)&&genreReady
    &&clean(creativeGrammar?.cGenreInterlock)&&clean(creativeGrammar?.cWorldAndGameplayEffect));
  const dIds=new Set(dCreations.map(row=>clean(row?.id)).filter(Boolean));
  const creativeDReady=!standardGrammar||(dCreations.length>0&&dIds.size===dCreations.length
    &&dCreations.every(row=>Array.isArray(row?.materialPath)&&row.materialPath.length===3
      &&clean(row?.creation)&&clean(row?.gameplayEffect)
      &&['PRIMARY','SECONDARY'].every(role=>(row.genreRoles||[]).includes(role))
      &&['A','B'].every(role=>(row.linkedElements||[]).includes(role))));
  const creativeAtReady=!standardGrammar||(delveDiscoveries.length>=4
    &&delveDiscoveries.every(row=>dIds.has(clean(row?.sourceDId))
      &&clean(row?.clue)&&clean(row?.experiment)&&clean(row?.discovery)
      &&clean(row?.newChoice)&&clean(row?.nextQuestion)));
  const includeLegacyC=!hasCreativeGrammar||designRoles.some(row=>row?.grammarRole==='c');
  const roles=['MAIN','A','B',...(includeLegacyC?['c']:[]),'DELVE'];
  const roleByName=new Map(roles.map(role=>[role,designRoles.filter(row=>row?.grammarRole===role)]));
  const mode=clean(design.multiplayerMode).toUpperCase();
  const modeReady=['COOP','COMPETITIVE','HYBRID'].includes(mode);
  const selectedRoot=roots[selected]||'';
  const rootReal=path.resolve(repoRoot);
  const safeSourcePath=value=>{
    const raw=posix(clean(value));
    if(!selectedRoot||!raw)return'';
    const candidate=raw.startsWith(selectedRoot+'/')?raw:`${selectedRoot}/${raw}`;
    if(!candidate.startsWith(selectedRoot+'/')||!['.lua','.luau','.cs'].some(ext=>candidate.toLowerCase().endsWith(ext)))return'';
    const full=path.resolve(rootReal,candidate);
    const canonicalOwnerRoot=path.resolve(rootReal,selectedRoot);
    if(!full.startsWith(canonicalOwnerRoot+path.sep)||!full.startsWith(rootReal+path.sep))return'';
    try{
      if(!fs.statSync(full).isFile())return'';
      const real=fs.realpathSync(full);
      const realOwnerRoot=fs.realpathSync(canonicalOwnerRoot);
      if(!real.startsWith(realOwnerRoot+path.sep)||!real.startsWith(rootReal+path.sep))return'';
      return candidate;
    }catch{return'';}
  };
  const observedFiles=uniq([
    ...(sourceObservation?.topFiles||[]).map(row=>row?.file),
    ...(sourceObservation?.sourceAnchors||[]).map(row=>row?.file),
    ...responsibleFiles
  ].map(safeSourcePath).filter(Boolean));
  // 정적 함수/행동 증거는 최소 소스 후보만 의미한다. 코멘트·태그·설정 파일만으로는 구현을 인정하지 않는다.
  // 임포트/주석/문구의 상태 키는 실행 증거가 아니다. 기존 소스 파일 한 번만 읽어 추적에 재사용한다.
  const nativeCodeByFile=new Map();
  const codeSignalFiles=observedFiles.filter(file=>{
    try{
      const original=fs.readFileSync(path.resolve(rootReal,file),'utf8');
      const withoutStrings=original.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,' ');
      const source=withoutStrings.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/--\[\[[\s\S]*?\]\]/g,' ')
        .split('\n').map(line=>{
          const comment=file.endsWith('.cs')?'//':'--';
          const at=line.indexOf(comment);
          return at<0?line:line.slice(0,at);
        }).join('\n');
      nativeCodeByFile.set(file,source);
      if(file.endsWith('.cs')){
        return /\b(?:void|Task|IEnumerator|bool|int|float|string|GameObject|Coroutine)\s+\w+\s*\(/.test(source);
      }
      return /\bfunction\s*[\w.:(]|\b(?:Instance\.new|FireAllClients|FireServer|UpdateAsync)\s*\(/.test(source);
    }catch{return false;}
  });
  const symbols=(sourceObservation?.sourceAnchors||[]).map(row=>({
    file:safeSourcePath(row?.file),symbol:clean(row?.symbol),kind:clean(row?.kind)
  })).filter(row=>row.file&&row.symbol).slice(0,24);
  const priority=(file,role)=>{
    const name=file.toLowerCase();
    if(selected==='ROBLOX'){
      if(role==='c')return name.includes('/client/')?6:name.includes('/shared/')?3:0;
      if(role==='DELVE')return name.includes('/server/')?6:name.includes('/shared/')?4:0;
      return name.includes('/server/')?6:name.includes('/shared/')?4:name.includes('/client/')?1:0;
    }
    if(role==='c')return /visual|render|anim|present|camera|vfx/.test(name)?6:/runtime|bootstrap/.test(name)?3:1;
    if(role==='DELVE')return /gamecore|save|progress|session/.test(name)?6:/runtime/.test(name)?4:1;
    return /gamecore|floor|combat|gameplay/.test(name)?6:/runtime|bootstrap/.test(name)?5:1;
  };
  const bindings=roles.map(role=>{
    const rows=roleByName.get(role)||[];
    const system=rows[0]||{};
    const everySystemAuthored=rows.length>0&&rows.every(row=>clean(row?.id)&&uniq(row?.stateInputs||[]).length&&uniq(row?.stateOutputs||[]).length);
    const candidates=observedFiles
      .map(file=>({file,score:priority(file,role)}))
      .sort((a,b)=>b.score-a.score||a.file.localeCompare(b.file))
      .slice(0,3).map(row=>row.file);
    const inputKeys=uniq(rows.flatMap(row=>row?.stateInputs||[]));
    const outputKeys=uniq(rows.flatMap(row=>row?.stateOutputs||[]));
    const id=clean(system.id);
    const roleIds=new Set(rows.map(row=>clean(row.id)).filter(Boolean));
    const connected=connections.filter(edge=>roleIds.has(clean(edge?.fromId))||roleIds.has(clean(edge?.toId))).map(edge=>({
      fromId:clean(edge.fromId),toId:clean(edge.toId),stateKeys:uniq(edge.stateKeys||[])
    })).slice(0,12);
    // 소스의 식별자 참조/대입만 후보로 추적한다. 정적 발견은 실제 규칙·밸런스·런타임 검증이 아니다.
    const executableOwnerFiles=candidates.filter(file=>codeSignalFiles.includes(file));
    const ownerProgram=executableOwnerFiles.map(file=>nativeCodeByFile.get(file)||'').join('\n');
    const stateIdentifier=key=>/^[A-Za-z_$][\w$]*$/.test(key);
    const stateReferenced=key=>stateIdentifier(key)
      &&new RegExp('\\b'+key+'\\b').test(ownerProgram);
    const stateWritten=key=>stateIdentifier(key)
      &&new RegExp('\\b'+key+'\\s*(?:\\+\\+|--|[+*\\/%-]?=(?!=))').test(ownerProgram);
    const foundInputs=inputKeys.filter(stateReferenced);
    const foundOutputs=outputKeys.filter(stateWritten);
    const missingInputs=inputKeys.filter(key=>!foundInputs.includes(key));
    const missingOutputs=outputKeys.filter(key=>!foundOutputs.includes(key));
    const nativeStateMapping=Object.freeze({
      state:!rows.length||!inputKeys.length||!outputKeys.length?'DESIGN_STATE_KEYS_INCOMPLETE'
        :!executableOwnerFiles.length?'EXECUTABLE_SOURCE_REQUIRED'
          :missingInputs.length||missingOutputs.length?'SOURCE_STATE_KEYS_NOT_MAPPED'
            :'STATIC_STATE_WRITE_CANDIDATE_UNVERIFIED',
      matchedInputKeys:Object.freeze(foundInputs),
      matchedWrittenOutputKeys:Object.freeze(foundOutputs),
      missingInputKeys:Object.freeze(missingInputs),
      missingWrittenOutputKeys:Object.freeze(missingOutputs),
      inspectedExecutableFiles:Object.freeze(executableOwnerFiles),
      exactRuntimeStateTransitionVerified:false,
      rule:'IDENTIFIER_REFERENCE_AND_ASSIGNMENT_ARE_DIAGNOSTIC_CANDIDATES_NOT_GAMEPLAY_PARITY_PASS'
    });
    return Object.freeze({
      role:role==='DELVE'?'@':role,grammarRole:role,systemId:id||null,
      systemIds:[...roleIds],names:rows.map(row=>clean(row.name)).filter(Boolean),
      name:clean(system.name)||null,
      stateInputs:inputKeys,stateOutputs:outputKeys,connections:connected,
      nativeStateMapping,
      suggestedExistingOwnerFiles:candidates,
      inspectedSymbols:symbols.filter(row=>candidates.includes(row.file)).slice(0,5),
      designStatus:everySystemAuthored&&(['MAIN','A','B'].includes(role)?rows.length===1:rows.length>=1)?'AUTHORED':'DESIGN_REPAIR_REQUIRED',
      codingStatus:!selectedRoot?'PLATFORM_NOT_SELECTED':!candidates.length?'SOURCE_OWNER_MISSING':
        !candidates.some(file=>codeSignalFiles.includes(file))?'SOURCE_OWNER_ONLY_DECLARATIVE_OR_COMMENT':'SOURCE_OWNER_CANDIDATE_UNVERIFIED',
      executableBehaviorVerified:false,
      actualRuntimeVerified:false,
      evidenceNeeded:'EXACT_RESPONSIBLE_FUNCTION_AND_STATE_CHANGE + ACTUAL_PLATFORM_ACTION_RESULT_QA'
    });
  });
  // 연결된 두 설계 시스템은 동일한 상태 키의 생산/소비 계약을 공유해야 한다.
  const systemById=new Map(designRoles.filter(row=>clean(row?.id)).map(row=>[clean(row.id),row]));
  const edgeStateMismatches=connections.flatMap(edge=>{
    const from=systemById.get(clean(edge?.fromId)),to=systemById.get(clean(edge?.toId));
    if(!from||!to)return[];
    const keys=uniq(edge?.stateKeys||[]);
    const mismatched=keys.filter(key=>!uniq(from.stateOutputs||[]).includes(key)||!uniq(to.stateInputs||[]).includes(key));
    return mismatched.length?[Object.freeze({
      fromId:clean(edge.fromId),toId:clean(edge.toId),
      mismatchedStateKeys:Object.freeze(mismatched),
      cause:'FROM_OUTPUT_AND_TO_INPUT_MUST_SHARE_DECLARED_STATE_KEY'
    })]:[];
  });
  const authoredRolesComplete=roles.every(role=>['MAIN','A','B'].includes(role)?(roleByName.get(role)||[]).length===1:(roleByName.get(role)||[]).length>=1)
    &&bindings.every(row=>row.designStatus==='AUTHORED')
    &&(!hasCreativeGrammar||creativeCReady);
  const mandatory=multiplayerRequired===true;
  // Unity Web의 같은 게임 C# 원본을 Roblox 코딩에 읽기 전용으로 인계한다.
  // 공통 설계 원본을 벗어나 소스 파일을 복제하거나 Unity 실행 결과를 Roblox 통과로 승계하지 않는다.
  const unityWebSourceSync=selected==='ROBLOX'?(()=>{
    const scriptsRoot=`${roots.UNITY_WEB}/Assets/Scripts`;
    const inspected=inspectGameSource({repoRoot:rootReal,sourceRoot:scriptsRoot});
    const candidates=(inspected?.topFiles||[]).filter(row=>clean(row?.file).startsWith(scriptsRoot+'/')
      &&clean(row?.file).toLowerCase().endsWith('.cs'));
    // 일반 WebGL 기술 틀만 존재하면 Roblox의 게임 규칙 원본이라고 주장하지 않는다.
    // 다른 소스 워커와 동일한 범용 틀 서명을 검사하며 권한은 기존 디자인과 Roblox 원본에 둔다.
    let genericFloorCount=0;
    const gameplaySources=candidates.filter(row=>{
      try{
        const full=path.resolve(rootReal,posix(row.file));
        const original=fs.realpathSync(full);
        const ownerRoot=fs.realpathSync(path.resolve(rootReal,scriptsRoot));
        if(!original.startsWith(ownerRoot+path.sep)||!fs.statSync(original).isFile()
          ||fs.statSync(original).size>1024*1024)return false;
        const text=fs.readFileSync(original,'utf8');
        const generic=/\bclass\s+UnityWebFloorGame\b/.test(text)
          &&/\bprivate\s+int\s+progress\s*;/.test(text)
          &&/\bprivate\s+void\s+PerformAction\s*\(\s*bool\s+mobile\s*\)/.test(text)
          &&/\bconst\s+string\s+CoreLoop\s*=/.test(text);
        if(generic)genericFloorCount+=1;
        return !generic;
      }catch{return false;}
    });
    const acceptedFiles=new Set(gameplaySources.map(row=>posix(row.file)));
    const anchors=(inspected?.sourceAnchors||[]).filter(row=>acceptedFiles.has(posix(row?.file))
      &&['METHOD','FUNCTION'].includes(row?.kind))
      .slice(0,16).map(row=>Object.freeze({
        file:posix(row.file),line:Number(row.line)||0,symbol:clean(row.symbol),
        signature:clean(row.context).slice(0,180)
      }));
    const available=gameplaySources.length>0;
    const genericOnly=!available&&genericFloorCount>0&&genericFloorCount===candidates.length;
    return Object.freeze({
      version:1,kind:'UNITY_WEB_TO_ROBLOX_NATIVE_SOURCE_SYNC',
      canonicalGameId:id,canonicalDesignFingerprint:sha(JSON.stringify(design)),
      unityWebProjectRoot:roots.UNITY_WEB,
      unityWebBuildOutputRoot:`web-games/${id}`,
      unityWebSourceAvailable:available,
      unityWebScriptsFingerprint:available?clean(inspected.sourceTreeFingerprint):null,
      unityWebScriptCount:available?gameplaySources.length:0,
      sourceFiles:Object.freeze(available?gameplaySources.slice(0,8).map(row=>posix(row.file)):[]),
      sourceMethods:Object.freeze(available?anchors:[]),
      referenceStatus:available?'SOURCE_READ_ONLY_UNVERIFIED':
        genericOnly?'GENERIC_WEB_FLOOR_NOT_GAMEPLAY_AUTHORITY':'SOURCE_NOT_AVAILABLE',
      verificationTransferred:false,sourceImplementationPassed:false,robloxRuntimeVerified:false,
      ruleOwner:'COMMON_APPROVED_DESIGN_MAIN_A_B_C_AT',
      codeConversion:'IMPLEMENT_APPROVED_DESIGN_IN_ORIGINAL_ROBLOX_LUAU_OWNER_FUNCTIONS',
      originalSourcePlatform:'ROBLOX',originalSourceLanguage:'LUAU',unitySourceIsOriginal:false,
      optimizationTarget:'ROBLOX_NATIVE_SERVER_CLIENT_MOBILE_STREAMING_ANIMATION_UI_PERFORMANCE',
      protectedState:'SAVE_KEYS_BALANCE_REWARDS_HIT_TIMING_MULTIPLAYER_SERVER_AUTHORITY',
      sourceReferenceOnly:true,directCsCopyForbidden:true,shadowPipelineForbidden:true,
      nextAction:available
        ?'OPTIONAL_COMPATIBILITY_COMPARISON_ONLY_ROBLOX_LUAU_REMAINS_ORIGINAL'
        :'CONTINUE_ORIGINAL_ROBLOX_LUAU_DESIGN_SYSTEM_AND_CONTENT_IMPLEMENTATION'
    });
  })():null;
  const unityDepth=design?.platformProfiles?.UNITY?.unityWebSpatialPresentation||{};
  const spatialReady=clean(unityDepth.dimension)==='3D'
    &&['worldDepth','cameraAndOcclusion','lightingAndMaterials','mobileWebglEvidence']
      .every(field=>clean(unityDepth[field]).length>=32);
  const platforms=['ROBLOX','UNITY_WEB','UNITY_APP'].map(name=>Object.freeze({
    platform:name,canonicalGameSourceRoot:roots[name],
    sharedUnitySource:name!=='ROBLOX',
    gameCodePlatformProfile:name==='ROBLOX'?'ROBLOX':'UNITY',
    requiresSameServerTwoClientPlay:mandatory,
    requiresNativeRuntimeResult:true,
    minimumRenderedDimension:'3D',
    ...(name==='UNITY_WEB'?{spatialDesignReady:spatialReady}:{}),
    inspectedInThisDirective:name===selected
  }));
  const observedCode=selectedRoot&&observedFiles.length>0;
  const gapReasons=[
    ...(!authoredRolesComplete?[hasCreativeGrammar?'DESIGN_MAIN_A_B_C_AT_INCOMPLETE':'DESIGN_MAIN_A_B_c_AT_INCOMPLETE']:[]),
    ...(hasCreativeGrammar&&!creativeCReady?['DESIGN_CREATIVE_C_CAUSAL_LINK_MISSING']:[]),
    ...(standardGrammar&&!creativeDReady?['DESIGN_CREATIVE_D_CREATIONS_MISSING']:[]),
    ...(standardGrammar&&!creativeAtReady?['DESIGN_CREATIVE_AT_D_RESEARCH_LINK_MISSING']:[]),
    ...(mandatory&&!modeReady?['MULTIPLAYER_DESIGN_MODE_MISSING']:[]),
    ...(selected==='UNITY_WEB'&&!spatialReady?['UNITY_WEB_DESIGN_SPATIAL_DEPTH_MISSING']:[]),
    ...(!selectedRoot?['PLATFORM_SOURCE_NOT_SELECTED']:!observedCode?['NATIVE_GAME_CODE_OWNER_MISSING']:[]),
    ...(observedCode&&!codeSignalFiles.length?['EXECUTABLE_GAMEPLAY_SOURCE_NOT_FOUND']:[]),
    ...bindings.filter(row=>row.designStatus==='AUTHORED'&&row.nativeStateMapping.state==='SOURCE_STATE_KEYS_NOT_MAPPED')
      .map(row=>'DESIGN_TO_CODE_STATE_KEYS_NOT_MAPPED:'+row.role),
    ...edgeStateMismatches.map(row=>'DESIGN_EDGE_STATE_KEYS_INCONSISTENT:'+row.fromId+'->'+row.toId),
    ...bindings.filter(row=>row.designStatus!=='AUTHORED').map(row=>'DESIGN_ROLE_NOT_AUTHORED:'+row.role),
    ...bindings.filter(row=>row.codingStatus==='SOURCE_OWNER_MISSING').map(row=>'GAME_CODE_OWNER_MISSING:'+row.role)
  ];
  // 메인: Unity Web에만 적용하는 외부 공학 알고리즘 원리(의존성 위상 정렬 + 가중 탐욕 집합 덮개).
  // 설계 역할과 실제 C# 책임 경로 후보를 정렬하며, 이 정적 결과는 구현/런타임 PASS가 아니다.
  const unityWebDevelopmentAlgorithm=selected==='UNITY_WEB'?(()=>{
    const designRoleId=new Map(designRoles.filter(row=>clean(row?.id)).map(row=>[clean(row.id),clean(row.grammarRole)]));
    const activeRoles=bindings.map(row=>row.role);
    const roleForId=id=>{const role=designRoleId.get(clean(id));return role==='DELVE'?'@':role||null;};
    const dependencyEdges=connections.map(edge=>({
      fromId:clean(edge?.fromId),toId:clean(edge?.toId),
      fromRole:roleForId(edge?.fromId),toRole:roleForId(edge?.toId),
      stateKeys:uniq(edge?.stateKeys||[])
    })).filter(row=>row.fromRole&&row.toRole&&row.fromRole!==row.toRole);
    const orderWeight=role=>{
      const row=bindings.find(item=>item.role===role);
      if(!row)return 0;
      if(row.designStatus!=='AUTHORED')return 120;
      if(row.codingStatus==='SOURCE_OWNER_MISSING')return 110;
      if(row.nativeStateMapping?.state==='SOURCE_STATE_KEYS_NOT_MAPPED')return 95;
      return 55;
    };
    // 위상 정렬(Kahn): 생산/소비 선행 규칙을 먼저 구현한다. 순환 설계는 억지로 선형 PASS시키지 않는다.
    const incoming=new Map(activeRoles.map(role=>[role,0]));
    const outgoing=new Map(activeRoles.map(role=>[role,new Set()]));
    for(const edge of dependencyEdges){
      if(!outgoing.get(edge.fromRole).has(edge.toRole)){
        outgoing.get(edge.fromRole).add(edge.toRole);
        incoming.set(edge.toRole,incoming.get(edge.toRole)+1);
      }
    }
    const ready=[...activeRoles].filter(role=>incoming.get(role)===0);
    const sorted=[];
    while(ready.length){
      ready.sort((a,b)=>orderWeight(b)-orderWeight(a)||a.localeCompare(b));
      const role=ready.shift();
      sorted.push(role);
      for(const next of outgoing.get(role)){
        incoming.set(next,incoming.get(next)-1);
        if(incoming.get(next)===0)ready.push(next);
      }
    }
    const cycleRoles=activeRoles.filter(role=>!sorted.includes(role));
    const steps=[...sorted,...cycleRoles];
    // 소스 책임 후보를 단일 파일 또는 정확한 의존 파일 집합으로 묶는다.
    // 일치하지 않는 파일명/설계 이름을 실제 구현의 증거로 승격하지 않는다.
    const requirements=new Map();
    for(const row of bindings)requirements.set('ROLE:'+row.role,{
      id:'ROLE:'+row.role,kind:'DESIGN_ROLE',role:row.role,
      weight:orderWeight(row.role),sourceOwnerCandidates:row.suggestedExistingOwnerFiles,
      missingInputs:row.nativeStateMapping?.missingInputKeys||[],
      missingWrites:row.nativeStateMapping?.missingWrittenOutputKeys||[],
      expectedNativeBehavior:'PLAYER_INPUT_TO_STATE_CHANGE_TO_FEEDBACK_AND_RETRY'
    });
    for(const edge of dependencyEdges){
      const id='EDGE:'+edge.fromId+'->'+edge.toId;
      const mismatch=edgeStateMismatches.some(row=>row.fromId===edge.fromId&&row.toId===edge.toId);
      requirements.set(id,{id,kind:'DESIGN_DEPENDENCY',role:edge.fromRole+'->'+edge.toRole,
        weight:mismatch?110:75,stateKeys:edge.stateKeys,
        expectedNativeBehavior:'PRODUCER_WRITE_TO_CONSUMER_READ_TO_PLAYER_CONSEQUENCE'});
    }
    // 콘텐츠/그래픽도 설계 목표에 남겨 게임 시스템만 반복하는 편향을 막는다.
    const coreOwnerFiles=uniq(bindings.flatMap(row=>row.suggestedExistingOwnerFiles));
    const contentOwnerFiles=coreOwnerFiles.filter(file=>/core|gameplay|quest|progress|world|region|content|inventory|save/i.test(file));
    const contentOwners=contentOwnerFiles.length?contentOwnerFiles:coreOwnerFiles;
    const graphicsOwners=uniq([
      ...coreOwnerFiles.filter(file=>/visual|render|anim|camera|scene|world|bootstrap|gamecore/i.test(file)),
      ...(sourceObservation?.topFiles||[]).map(row=>posix(row?.file)).filter(file=>
        file.startsWith(roots.UNITY_WEB+'/Assets/')
        &&/\.(?:unity|prefab|mat|anim|controller|fbx|obj|glb|gltf)$/i.test(file))
    ]);
    const spatialOwners=graphicsOwners.length?graphicsOwners:coreOwnerFiles;
    const loop=Array.isArray(design?.coreLoop)?design.coreLoop:[];
    loop.forEach((row,index)=>{
      const step=clean(typeof row==='string'?row:row?.name||row?.step||row?.action);
      if(!step)return;
      const id='LOOP:'+index;
      requirements.set(id,{id,kind:'CORE_LOOP',title:step,weight:85,
        sourceOwnerCandidates:contentOwners,
        expectedNativeBehavior:'PLAYER_ACTION_CAUSES_AUTHORED_LOOP_STATE_AND_NEXT_CHOICE'});
    });
    const milestones=Array.isArray(design?.contentExpansionPlan)?design.contentExpansionPlan:[];
    milestones.forEach((row,index)=>{
      const title=clean(row?.milestone||row?.name||row?.id);
      if(!title)return;
      const id='CONTENT:'+index;
      requirements.set(id,{id,kind:'DESIGNED_CONTENT_MILESTONE',title,weight:80,
        designedGameplay:clean(row?.newGameplay),designedSystemImpact:clean(row?.systemImpact),
        sourceOwnerCandidates:contentOwners,
        expectedNativeBehavior:'REAL_UNLOCK_OR_CONTENT_STATE_REACHABLE_AND_PLAYER_CONSEQUENCE'});
    });
    if(hasCreativeGrammar){
      requirements.set('CREATIVE_C_CAUSALITY',{id:'CREATIVE_C_CAUSALITY',
        kind:'DESIGN_CREATIVE_INTERLOCK',title:'A_B_C_PRIMARY_SECONDARY_GAMEPLAY_EFFECT',
        weight:creativeCReady?75:115,sourceOwnerCandidates:contentOwners,
        expectedNativeBehavior:'ACTUAL_GAMEPLAY_STATE_AND_PLAYER_DECISION_CHANGE_FROM_CREATIVE_C'});
    }
    requirements.set('NATIVE_3D_VISUAL',{id:'NATIVE_3D_VISUAL',kind:'UNITY_WEB_SPATIAL_PRESENTATION',
      weight:spatialReady?65:125,sourceOwnerCandidates:spatialOwners,
      expectedNativeBehavior:'REAL_NATIVE_UNITY_3D_MESH_CAMERA_MOTION_MATERIAL_AND_MOBILE_BROWSER_PIXELS'});
    if(mandatory)requirements.set('MULTIPLAYER_SYNC',{id:'MULTIPLAYER_SYNC',kind:'NATIVE_MULTIPLAYER',
      weight:110,sourceOwnerCandidates:coreOwnerFiles,
      expectedNativeBehavior:'TWO_REAL_BROWSER_CLIENTS_SHARED_AUTHORITATIVE_SESSION_AND_RECONNECT_QA'});
    const ownerSets=new Map();
    const offer=(files,covered)=>{
      const nativeFiles=uniq(files).filter(file=>file.startsWith(roots.UNITY_WEB+'/')).sort();
      if(!nativeFiles.length)return;
      const key=nativeFiles.join('|');
      const set=ownerSets.get(key)||new Set();
      for(const ref of covered)if(requirements.has(ref))set.add(ref);
      ownerSets.set(key,set);
    };
    for(const row of bindings){
      for(const file of row.suggestedExistingOwnerFiles)offer([file],['ROLE:'+row.role]);
    }
    for(const edge of dependencyEdges){
      const from=bindings.find(row=>row.role===edge.fromRole);
      const to=bindings.find(row=>row.role===edge.toRole);
      const fromOwner=from?.suggestedExistingOwnerFiles?.[0];
      const toOwner=to?.suggestedExistingOwnerFiles?.[0];
      offer([fromOwner,toOwner].filter(Boolean),['EDGE:'+edge.fromId+'->'+edge.toId]);
    }
    for(const requirement of requirements.values()){
      if(requirement.kind==='DESIGN_ROLE'||requirement.kind==='DESIGN_DEPENDENCY')continue;
      for(const file of requirement.sourceOwnerCandidates||[])offer([file],[requirement.id]);
    }
    // 가중 탐욕 집합 덮개: 이번 반복에서 빠진 설계 계약을 가장 많이 해소할 파일 묶음부터 선택한다.
    // 전체 볼륨 상한을 뜻하지 않으며 한 번에 동일한 파일을 중복 수정하지 않는다.
    const unselected=new Set(requirements.keys());
    const scoredOwners=[...ownerSets.entries()].map(([key,covered])=>({
      files:key.split('|'),covered:[...covered]
    }));
    const selectedPackages=[];
    while(unselected.size){
      const next=scoredOwners.map(row=>{
        const coverage=row.covered.filter(ref=>unselected.has(ref));
        const score=coverage.reduce((sum,ref)=>sum+requirements.get(ref).weight,0)/(row.files.length||1);
        return {...row,coverage,score};
      }).filter(row=>row.score>0).sort((a,b)=>b.score-a.score
        ||a.files.length-b.files.length||a.files.join('|').localeCompare(b.files.join('|')))[0];
      if(!next)break;
      const ids=next.coverage.slice().sort((a,b)=>
        requirements.get(b).weight-requirements.get(a).weight||a.localeCompare(b));
      selectedPackages.push(Object.freeze({
        sequence:selectedPackages.length+1,
        responsibleFiles:Object.freeze([...next.files]),
        designRequirementIds:Object.freeze(ids),
        priorityWeight:ids.reduce((sum,ref)=>sum+requirements.get(ref).weight,0),
        method:'DIRECT_EDIT_EXISTING_CSHARP_OR_UNITY_ASSET_OWNER',
        acceptance:'REAL_NATIVE_SOURCE_DIFF_THEN_EXACT_WEBGL_MOBILE_BROWSER_PLAY_AND_STATE_REGRESSION',
        sourceEvidenceOnly:true,runtimeVerified:false
      }));
      for(const id of ids)unselected.delete(id);
    }
    return Object.freeze({
      version:1,platform:'UNITY_WEB',sourceRoot:roots.UNITY_WEB,
      algorithms:Object.freeze(['DEPENDENCY_GRAPH_KAHN_TOPOLOGICAL_ORDER',
        'WEIGHTED_GREEDY_SET_COVER_FOR_RESPONSIBLE_SOURCE_FILES',
        'PREVIOUS_VERIFIED_RUNTIME_DIFFERENTIAL_GROWTH']),
      roleImplementationOrder:Object.freeze(steps),
      cyclicRoleDependencies:Object.freeze(cycleRoles),
      dependencyEdges:Object.freeze(dependencyEdges),
      designRequirements:Object.freeze([...requirements.values()]),
      developmentPackages:Object.freeze(selectedPackages),
      unresolvedRequirements:Object.freeze([...unselected]),
      sequence:Object.freeze([
        'LOAD_LATEST_VERIFIED_DESIGN_AND_CURRENT_CANONICAL_UNITY_SOURCE',
        'TRACE_DESIGN_STATE_INPUT_OUTPUT_AND_DEPENDENCY_GRAPH',
        'RANK_UNRESOLVED_PLAYER_VALUE_GAPS_WITH_WEIGHTED_COVERAGE',
        'DIRECTLY_EDIT_EXISTING_RESPONSIBLE_UNITY_SCRIPTS_SCENES_PREFABS_AND_ASSET_BINDINGS',
        'RUN_EXISTING_FOCUSED_SOURCE_AND_PRESERVATION_QA',
        'FOLLOW_LOCKED_F0_THROUGH_F9_CANONICAL_WEBGL_VALIDATION',
        'REPLAY_REAL_WEBGL_MOBILE_TOUCH_STATE_REWARD_3D_SAVE_AND_INDEPENDENT_REGRESSION',
        'DIFF_AGAINST_PREVIOUS_MAIN_VERIFIED_UNITY_WEB_GROWTH_EVIDENCE',
        'REPAIR_FIRST_FAILED_CAUSAL_RESPONSIBILITY_OR_CONTINUE_NEXT_BUILD_UP'
      ]),
      designItemsNeverCountAsImplementation:true,sourceCandidatesNeverCountAsRuntimePass:true,
      unlimitedGenerations:true,existingF0F9SequencePreserved:true,
      existingSaveBalanceEconomyNetworkAuthorityPreserved:true
    });
  })():null;
  return Object.freeze({
    version:1,authority:'GAME_DESIGN_TO_EXISTING_PLATFORM_BUILD_UP_LINK',
    gameId:id,requestedPlatform:declared,activePlatform:selected,
    originalSourcePlatform:'ROBLOX',originalSourceLanguage:'LUAU',
    unityWebSourceSync,
    designFingerprint:sha(JSON.stringify(design)),sourceTreeFingerprint:clean(sourceObservation?.sourceTreeFingerprint)||null,
    multiplayerMode:mode||null,multiplayerRequired:mandatory,minimumParticipants:mandatory?2:1,
    platformCodingPlans:Object.freeze(platforms),
    roleBindings:Object.freeze(bindings),
    ...(unityWebDevelopmentAlgorithm?{unityWebDevelopmentAlgorithm}:{}),
    edgeStateMismatches:Object.freeze(edgeStateMismatches),
    nativeStateMappingSummary:Object.freeze({
      authoredRoles:bindings.filter(row=>row.designStatus==='AUTHORED').length,
      mappedStaticCandidates:bindings.filter(row=>row.nativeStateMapping.state==='STATIC_STATE_WRITE_CANDIDATE_UNVERIFIED').length,
      unmappedRoles:bindings.filter(row=>row.nativeStateMapping.state==='SOURCE_STATE_KEYS_NOT_MAPPED').map(row=>row.role),
      edgeMismatches:edgeStateMismatches.length,
      staticSourceMappingIsNotRuntimeParity:true
    }),
    creativeCBinding:hasCreativeGrammar?Object.freeze({
      themes:Object.freeze(cThemes.map(row=>Object.freeze({name:clean(row?.name),gameplayEffect:clean(row?.gameplayEffect)}))),
      genres:Object.freeze(cGenres.map(row=>Object.freeze({role:clean(row?.role),name:clean(row?.name),gameplayEffect:clean(row?.gameplayEffect)}))),
      genreInterlock:clean(creativeGrammar?.cGenreInterlock),
      abGameplayEffect:clean(creativeGrammar?.cWorldAndGameplayEffect),
      standardVersion:standardGrammar?Number(creativeGrammar.standardVersion):null,
      dCreations:Object.freeze(dCreations.map(row=>Object.freeze({
        id:clean(row?.id),materialPath:Object.freeze(row?.materialPath||[]),
        creation:clean(row?.creation),gameplayEffect:clean(row?.gameplayEffect),
        genreRoles:Object.freeze(row?.genreRoles||[]),linkedElements:Object.freeze(row?.linkedElements||[])
      }))),
      delveDLinks:Object.freeze(delveDiscoveries.map(row=>Object.freeze({
        sourceDId:clean(row?.sourceDId),discovery:clean(row?.discovery),
        experiment:clean(row?.experiment),nextQuestion:clean(row?.nextQuestion)
      }))),
      designAuthored:Boolean(creativeCReady&&creativeDReady&&creativeAtReady),
      runtimeVerified:false
    }):null,
    observedGameCodeFiles:Object.freeze(observedFiles),
    executableCodeCandidateFiles:Object.freeze(codeSignalFiles),
    gapReasons:Object.freeze(uniq(gapReasons)),
    codingReviewState:gapReasons.length?'GAME_STAGE_LOCAL_REPAIR_REQUIRED':'SOURCE_CANDIDATES_PRESENT_NOT_IMPLEMENTATION_PASS',
    sourceImplementationPassed:false,actualTwoClientPassed:false,actualWebglRenderPassed:false,independentQaPassed:false,
    stageLocalAction:'IMPLEMENT_IN_EXISTING_GAME_SOURCE_THEN_VALIDATE_WITH_EXISTING_F0_TO_F9_AND_PLATFORM_RUNTIME',
    schemaAndMarkersAloneCannotPass:true,newPipeline:false,changesDevelopmentAdmission:false,
    saveBalanceAndExistingMultiplayerMeaningPreserved:true
  });
}

function qualitySignalText(values=[]){return uniq(values).join(' | ').toLowerCase();}
function focusFromSignals({signals=[],source={}}={}){
  const text=qualitySignalText(signals);
  if(/crash|runtime|error|softlock|save|desync|broken|exception/.test(text))return'STABILITY';
  if(/combat|core.?fun|interaction|enemy|boss|gameplay|feel|decision/.test(text))return'CORE_FUN';
  if(/progress|reward|unlock|quest|goal|economy|content/.test(text))return'PROGRESSION';
  if(/mobile|touch|input|ui|hud|inventory|equipment|equip|menu|readability|navigation|accessib/.test(text))return'USABILITY';
  if(/visual|graphic|render|animation|motion|vfx|camera|lighting|material|silhouette|environment|placeholder|audio|music|bgm|sfx|sound|game.?feel/.test(text))return'PRESENTATION';
  const s=source?.signals||{};
  if(Number(s.ai||0)<2||Number(s.combat||0)<5)return'CORE_FUN';
  if(Number(s.progression||0)<4)return'PROGRESSION';
  if(Number(s.primitive||0)>8||Number(s.animation||0)<2||Number(s.vfx||0)<2)return'PRESENTATION';
  return'USABILITY';
}

function nextFocus({preferred='CORE_FUN',previous={}}={}){
  const order=['CORE_FUN','PROGRESSION','USABILITY','PRESENTATION','STABILITY'];
  const prior=clean(previous?.primaryFocus).toUpperCase();
  if(!prior||prior!==preferred)return preferred;
  const index=order.indexOf(prior);
  return order[(index+1+Math.max(0,Number(previous?.generation||0)))%order.length];
}

function primaryDesignAnchor(design={}){
  const system=design.signatureSystems?.[0];
  return clean(system?.name)||clean(system?.purpose)||clean(design.coreFun)||clean(design.identity)||'현재 게임의 핵심 플레이';
}
function secondaryDesignAnchor(design={}){
  const system=design.signatureSystems?.[1];
  return clean(system?.name)||clean(system?.playerChoice)||clean(design.progressionDirection)||design.coreLoop?.[0]||'핵심 루프';
}

function domainState(domain,{design={},source={},multiplayerRequired=false}={}){
  const s=source?.signals||{};
  const detailedDesignText=JSON.stringify({
    progressionEconomyBalance:design.progressionEconomyBalance,
    contentExpansionPlan:design.contentExpansionPlan,
    failureRetryRisk:design.failureRetryRisk,
    platformFitPlan:design.platformFitPlan,
    platformProfiles:design.platformProfiles,
    webCanonicalDesign:design.webCanonicalDesign,
    platformExpansionPolicy:design.platformExpansionPolicy,
    visualDirection:design.visualDirection,
    mobileUx:design.mobileUx,
    uxAccessibilityPlan:design.uxAccessibilityPlan,
    artAudioDirection:design.artAudioDirection,
    selectedDesignPlan:design.selectedDesignPlan,
    contentVarietyPlan:design.contentVarietyPlan,
    narrativeDialoguePlan:design.narrativeDialoguePlan,
    implementationTraceability:design.implementationTraceability
  });
  const relevantByText=qualitySignalText([
    design.identity,design.coreFun,design.progressionDirection,...(design.coreLoop||[]),
    ...(design.signatureSystems||[]).flatMap(x=>[x.name,x.purpose,x.playerChoice]),
    detailedDesignText
  ]);
  const no=(reason)=>({domain,state:'NOT_APPLICABLE',reason});
  const gap=(reason)=>({domain,state:'GAP',reason});
  const pass=(reason='current source and approved design provide sufficient implementation signal')=>({domain,state:'PASS',reason});
  const hasWorld=/world|map|region|biome|zone|terrain|dungeon|village|town|island|forest|jungle|snow|desert|lake|room|floor|portal|지역|맵|마을|던전|섬|숲/.test(relevantByText)||Number(s.map||0)>0;
  const hasInventory=/inventory|item|equipment|equip|weapon|armor|loot|craft|인벤|아이템|장비|무기|방어구|전리품|제작/.test(relevantByText)||Number(s.inventory||0)>0||Number(s.equipment||0)>0;
  const hasEquipment=/equipment|equip|weapon|armor|loadout|장비|무기|방어구|장착/.test(relevantByText)||Number(s.equipment||0)>0;
  const hasProgression=Boolean(clean(design.progressionDirection))||Number(s.progression||0)>0;
  const hasMultiplayer=multiplayerRequired||/multi|coop|co-op|pvp|player/.test(clean(design.multiplayerMode).toLowerCase())||/multiplayer|coop|pvp/.test(relevantByText)||Number(s.multiplayer||0)>0;
  const hasSave=Number(s.save||0)>0||/save|persist|저장/.test(relevantByText);

  if(domain==='MULTIPLAYER_AND_SYNC'){
    if(!hasMultiplayer)return no('approved design and current source do not require multiplayer');
    if(Number(s.multiplayer||0)<3||Number(s.errorRecovery||0)<2)return gap('required multiplayer implementation or reconnect recovery is incomplete; continue existing BUILD_UP');
    return pass('multiplayer source signals found; actual multi-client gameplay remains unverified by source inspection');
  }
  if(domain==='CRAFTING'&&!/craft|제작|recipe/.test(relevantByText)&&Number(s.progression||0)>0)return no('no crafting signal in approved design');
  if(domain==='QUESTS'&&!/quest|퀘스트|story|npc/.test(relevantByText))return no('no quest/story objective signal in approved design');
  if(domain==='NPC_SOCIAL_BEHAVIOR'&&!/npc|villager|resident|social|주민|상인|대화/.test(relevantByText))return no('no NPC or social behavior signal in approved design');
  if(domain==='NARRATIVE_STORY'&&!/story|narrative|lore|quest|스토리|세계관|대사/.test(relevantByText))return no('no narrative or story signal in approved design');
  if(domain==='REPLAYABILITY_VARIATION'&&!/rogue|wave|random|procedural|replay|런|웨이브|랜덤/.test(relevantByText))return no('no explicit replay variation signal in approved design');
  if(['WORLD_MAP_TOPOLOGY','MAP_EXPANSION','REGIONS','WORLD_DENSITY','WORLD_NAVIGATION','LANDMARKS','TRAVERSAL','CONTENT_DISCOVERY'].includes(domain)&&!hasWorld)return no('approved design and current source do not expose a world/map surface requiring expansion');
  if(['INVENTORY','INVENTORY_USABILITY'].includes(domain)&&!hasInventory)return no('game has no current inventory/item ownership system');
  if(domain==='EQUIPMENT_LOADOUT'&&!hasEquipment)return no('game has no current equipment/loadout system');
  if(domain==='RECONNECT_RECOVERY'&&!hasMultiplayer&&!hasSave)return no('game has no multiplayer or persistent reconnect state');
  if(domain==='SAVE_COMPLETENESS'&&!hasSave)return no('game has no persistent save system yet');
  if(domain==='MID_LATE_GAME_DEPTH'&&!hasProgression)return no('approved design has no multi-stage progression direction');

  const weakByDomain={
    ANIMATION:Number(s.animation||0)<2||Number(s.motionStates||0)<5,
    SECONDARY_MOTION:Number(s.animation||0)<2||Number(s.motionStates||0)<4,
    GAME_FEEL:Number(s.gameFeel||0)<3,
    VFX:Number(s.vfx||0)<2,
    CAMERA:Number(s.camera||0)<1,
    AUDIO_MUSIC_SFX:Number(s.audio||0)<2||(Number(s.audio||0)>0&&Number(s.audioDynamics||0)<2),
    AUDIO_VISUAL_TIMING:Number(s.audio||0)<1||Number(s.vfx||0)<1||Number(s.feedback||0)<2,
    UI_HUD:Number(s.ui||0)<4,
    LIGHTING:Number(s.lighting||0)<2,
    PROGRESSION:Number(s.progression||0)<4,
    ENEMY_AI:Number(s.ai||0)<2,
    ERROR_RECOVERY:Number(s.errorRecovery||0)<2,
    WORLD_MAP_TOPOLOGY:hasWorld&&Number(s.map||0)<5,
    MAP_EXPANSION:hasWorld&&(Number(s.map||0)<8||Number(s.landmark||0)<2),
    REGIONS:hasWorld&&Number(s.map||0)<6,
    WORLD_DENSITY:hasWorld&&(Number(s.content||0)<8||Number(s.landmark||0)<2),
    WORLD_NAVIGATION:hasWorld&&(Number(s.landmark||0)<2||Number(s.uiFlow||0)<1),
    LANDMARKS:hasWorld&&Number(s.landmark||0)<2,
    TRAVERSAL:hasWorld&&Number(s.input||0)<2,
    INTERACTION_DISCOVERABILITY:Number(s.interaction||0)<3,
    INVENTORY:hasInventory&&Number(s.inventory||0)<3,
    INVENTORY_USABILITY:hasInventory&&(Number(s.inventory||0)<5||Number(s.uiFlow||0)<2),
    EQUIPMENT_LOADOUT:hasEquipment&&Number(s.equipment||0)<4,
    SYSTEM_CONNECTION:(hasInventory||hasWorld||hasProgression)&&Number(s.connection||0)<2,
    SESSION_FLOW:Number(s.session||0)<4,
    FIRST_10_MINUTES:Number(s.session||0)<3||Number(s.progression||0)<3||Number(s.interaction||0)<2,
    MID_LATE_GAME_DEPTH:hasProgression&&(Number(s.progression||0)<8||Number(s.content||0)<10),
    SAVE_AND_RECOVERY:hasSave&&Number(s.save||0)<3,
    SAVE_COMPLETENESS:hasSave&&(Number(s.save||0)<5||(hasInventory&&Number(s.inventory||0)<3)),
    RECONNECT_RECOVERY:(hasMultiplayer||hasSave)&&Number(s.errorRecovery||0)<2,
    INPUT:Number(s.input||0)<3,
    MOBILE_UX:Number(s.input||0)<3||Number(s.ui||0)<3,
    SETTINGS_ACCESSIBILITY:Number(s.settings||0)<2,
    MENU_FLOW:Number(s.ui||0)>0&&(Number(s.uiFlow||0)<3||Number(s.entryFlow||0)<1||Number(s.loadingFlow||0)<1),
    CONVENIENCE:(Number(s.ui||0)+Number(s.interaction||0)+Number(s.progression||0))>0&&Number(s.uiFlow||0)<3,
    UI_DESIGN_SYSTEM:Number(s.ui||0)<4,
    UI_INFORMATION_PRIORITY:Number(s.ui||0)<4||Number(s.feedback||0)<2,
    FEEDBACK_CLARITY:Number(s.feedback||0)<3,
    PLAYER_AGENCY:(Number(s.combat||0)+Number(s.progression||0))>3&&Number(s.choice||0)<2,
    ANTI_GRIND:hasProgression&&Number(s.content||0)<8,
    CONTENT_DENSITY:Number(s.content||0)<8,
    CONTENT_DISCOVERY:(hasWorld||hasProgression)&&Number(s.interaction||0)<3,
    PERFORMANCE:Number(s.performance||0)<2,
    PERFORMANCE_BUDGET:Number(s.performance||0)<3,
    RUNTIME_STABILITY:Number(s.errorRecovery||0)<2
  };
  if(['CHARACTER_VISUALS','ENEMY_VISUALS','ENVIRONMENT','TERRAIN','MATERIALS'].includes(domain)&&Number(s.primitive||0)>8)return gap('placeholder or primitive-heavy implementation remains');
  if(weakByDomain[domain]===true)return gap('current source signals indicate shallow, missing, disconnected, or placeholder-heavy implementation');
  return pass();
}

function escalationDepthInfo({previousDirective=null,previousOutcome='',currentSourceTreeFingerprint=''}={}){
  const priorDepth=Math.max(0,Number(previousDirective?.developmentDepth||0));
  const outcome=clean(previousOutcome).toLowerCase();
  const verified=['verified','done','completed','pass','passed'].includes(outcome);
  const failed=['failed','error','rejected','repair_required'].includes(outcome);
  const previousTree=clean(previousDirective?.sourceTreeFingerprint);
  const currentTree=clean(currentSourceTreeFingerprint);
  const sourceChangedSincePrevious=Boolean(previousDirective&&previousTree&&currentTree&&previousTree!==currentTree);
  const verifiedEvolution=verified&&sourceChangedSincePrevious;
  const depth=Math.max(1,priorDepth+(verifiedEvolution?1:priorDepth?0:1));
  const stage=depth===1?'FOUNDATION_COMPLETENESS'
    :depth===2?'ROLE_DIFFERENTIATION'
    :depth===3?'SYSTEM_CONNECTION'
    :depth===4?'DECISION_DENSITY'
    :depth===5?'SIGNATURE_DEPTH'
    :`SIGNATURE_MASTERY_${depth}`;
  return Object.freeze({
    developmentDepth:depth,
    escalationStage:stage,
    escalationMode:failed?'DEEPER_CAUSAL_REPAIR'
      :verified&&!sourceChangedSincePrevious?'VERIFIED_STATUS_WITHOUT_GAME_SOURCE_DELTA_RETRY'
      :verifiedEvolution?'ESCALATE_AFTER_VERIFIED_GAME_SOURCE_DELTA'
      :previousDirective?'CONTINUE_UNVERIFIED_DEPTH'
      :'INITIAL_GAME_SPECIFIC_BUILD_UP',
    previousOutcome:outcome||null,
    sourceChangedSincePrevious,
    verifiedEvolution,
    advanceAllowed:verifiedEvolution
  });
}

function buildAllDomainDirectives({states=[],design={},focus='CORE_FUN',depthInfo={}}={}){
  const identity=design.identity||'현재 게임';
  const anchor=primaryDesignAnchor(design);
  const secondary=secondaryDesignAnchor(design);
  const progression=design.progressionDirection||'승인된 진행 방향';
  const depth=Number(depthInfo.developmentDepth||1);
  const focusDomains={
    CORE_FUN:new Set(['CORE_FUN','COMBAT_OR_PRIMARY_INTERACTION','PLAYER_ACTIONS','PLAYER_AGENCY','ANTI_GRIND','ENEMY_AI','BOSS_AND_SIGNATURE_MOMENTS','CONTENT_VARIETY','CONTENT_DENSITY','SESSION_FLOW','FIRST_10_MINUTES']),
    PROGRESSION:new Set(['PROGRESSION','GOALS','REWARDS','UNLOCKS','QUESTS','ECONOMY','INVENTORY','INVENTORY_USABILITY','EQUIPMENT_LOADOUT','CRAFTING','SYSTEM_CONNECTION','MID_LATE_GAME_DEPTH','CONTENT_DISCOVERY','MAP_EXPANSION','REGIONS']),
    PRESENTATION:new Set(['CHARACTER_VISUALS','ENEMY_VISUALS','WEAPONS_AND_EQUIPMENT','BUILDINGS_AND_PROPS','ENVIRONMENT','TERRAIN','MATERIALS','PALETTE','LIGHTING','ANIMATION','SECONDARY_MOTION','GAME_FEEL','VFX','CAMERA','UI_HUD','MENU_FLOW','INVENTORY_USABILITY','EQUIPMENT_LOADOUT','UI_DESIGN_SYSTEM','UI_INFORMATION_PRIORITY','FEEDBACK_CLARITY','AUDIO_MUSIC_SFX','AUDIO_VISUAL_TIMING','ENVIRONMENTAL_MOTION','LANDMARKS','WORLD_DENSITY']),
    USABILITY:new Set(['INPUT','MOBILE_UX','ACCESSIBILITY','SETTINGS_ACCESSIBILITY','MENU_FLOW','CONVENIENCE','INVENTORY_USABILITY','EQUIPMENT_LOADOUT','UI_INFORMATION_PRIORITY','FEEDBACK_CLARITY','INTERACTION_DISCOVERABILITY','WORLD_NAVIGATION','TUTORIAL_ONBOARDING','TRAVERSAL','UI_HUD','GOALS','GAME_FEEL','AUDIO_MUSIC_SFX']),
    STABILITY:new Set(['SAVE_AND_RECOVERY','SAVE_COMPLETENESS','RECONNECT_RECOVERY','MULTIPLAYER_AND_SYNC','FAILURE_RESPAWN_CHECKPOINTS','PERFORMANCE','PERFORMANCE_BUDGET','RUNTIME_STABILITY','ERROR_RECOVERY'])
  };
  const instructions={
    CORE_FUN:`${anchor}가 단순 반복 입력이 아니라 상황을 읽고 선택을 바꾸는 핵심 재미가 되게 한다. 같은 선택의 반복 이득을 줄이고 성공/실패 이유가 즉시 보이게 한다.`,
    COMBAT_OR_PRIMARY_INTERACTION:`${anchor}의 입력→전조/준비→판정→결과→회복 흐름을 실제 상태 머신에 연결하고 타이밍·거리·위험/보상 중 게임에 맞는 최소 두 축에서 선택 차이를 만든다.`,
    PLAYER_ACTIONS:`플레이어의 주요 행동마다 사용 조건, 취소/실패 조건, 상태 변화, 쿨다운 또는 후딜, 화면/음향 피드백을 일관되게 연결하고 무의미한 중복 행동은 정리한다.`,
    ENEMY_AI:`적 역할이 이동·타이깃 선택·공격 전조·공격 패턴·후퇴/회복 또는 특수상태에서 구별되게 하고 ${anchor}에 대한 카운터플레이가 실제 플레이에서 가능하게 한다.`,
    BOSS_AND_SIGNATURE_MOMENTS:`${identity}의 보스/시그니처 순간은 일반 적의 체력만 키운 형태를 금지하고 단계 변화, 공간 압박, 전조, 대응 선택, 보상 연출을 핵심 시스템 ${secondary}와 연결한다.`,
    PROGRESSION:`${progression}을 짧은 목표→보상→해금→새 선택→다음 난도로 연결하고 성장 수치만 오르는 대신 플레이 방식이 실제로 넓어지게 한다.`,
    GOALS:`현재 목표·다음 목표·실패 조건을 플레이 중 확인 가능하게 하고, 목표가 ${anchor}와 직접 연결되어 플레이어가 왜 행동하는지 분명하게 한다.`,
    REWARDS:`보상은 행동 난도·위험·시간·희소성과 연결하고, 획득 순간의 상태 변화와 피드백을 명확히 하며 다음 선택에 실제 영향을 주게 한다.`,
    UNLOCKS:`해금은 새 시스템/지역/행동/조합 중 의미 있는 선택을 열어야 하며 단순 아이콘 공개나 숫자 증가만으로 해금 완료를 주장하지 않는다.`,
    QUESTS:`퀘스트가 적용되는 게임이면 목표·진행 추적·완료 판정·보상·세계/캐릭터 반응까지 연결하고, 핵심 루프와 무관한 심부름 반복을 줄인다.`,
    CONTENT_VARIETY:`콘텐츠 변형은 이름/색/수치 복제 대신 행동 규칙·공간·자원·적 조합·진행 조건 중 최소 한 축을 바꾸어 새로운 판단을 만들게 한다.`,
    WORLD_MAP_TOPOLOGY:`월드 구조는 시작점·안전/위험 구역·주요 동선·우회 경로·보상 지점·잠금/해금 연결을 읽을 수 있게 하고 막다른 빈 공간을 줄인다.`,
    REGIONS:`지역마다 지형, 적/상호작용, 자원, 위험, 조명/색, 이동 방식 중 여러 축이 달라 실제 플레이 역할이 구별되게 한다.`,
    LANDMARKS:`주요 랜드마크는 거리에서도 실루엣과 기능이 구별되고 탐색·방향 판단·목표 기억에 쓰이도록 배치하며 단순 장식물로 끝내지 않는다.`,
    TRAVERSAL:`이동은 속도만이 아니라 지형·장애물·경로 선택·위험 회피와 연결하고 모바일 입력에서 의도한 방향/행동이 안정적으로 유지되게 한다.`,
    ECONOMY:`재화의 획득원·사용처·가격 단계·손실/회수 규칙을 ${progression}과 연결하고 무한 축적 또는 의미 없는 구매가 생기지 않게 한다. 승인 없는 기존 수치 변경은 금지한다.`,
    INVENTORY:`인벤토리는 획득·정렬/표시·장착/사용·교체·버리기/보존 상태를 명확히 하고 실제 캐릭터/전투/진행 상태와 동기화한다.`,
    CRAFTING:`제작이 적용되는 게임이면 재료 발견→레시피 이해→제작 조건→대기/완료→인벤토리 반영→실제 사용까지 끊김 없이 연결하고 중복 레시피를 줄인다.`,
    SAVE_AND_RECOVERY:`기존 저장 키·구조·의미를 보존하고 진행·장비·해금을 재접속 후 복구한다. 불러오기 실패를 신규 사용자로 처리하거나 기본값으로 덮어쓰지 말고 재시도·안전 복귀를 제공한다.`,
    MULTIPLAYER_AND_SYNC:`모든 게임은 멀티 구현이 필수다. 기존 SINGLE 원본은 디자이너가 COOP/COMPETITIVE/HYBRID 중 게임에 맞는 확장을 작성하며 기존 멀티 규칙은 보존한다. 기존 방 생성·참가·준비·시작·이탈을 서버 판정으로 연결한다. 참가자·준비·기존 모드를 표시하고 대기 중 안전한 공동 연습을 제공한다. 결과 화면에 각자 재도전 의사를 표시하고 기존 참가 규칙으로 인원을 유지하되 이탈자 때문에 무한 대기하지 않게 한다. 방장 이탈·late join·재접속을 기존 규칙으로 복구하고 실제 2인 이상의 행동·목표·승패·보상 일치와 중복 지급 방지를 검수한다.`,
    INPUT:`핵심 행동마다 터치 우선 입력과 키보드/패드 대체 입력을 동일 게임 상태에 연결하고 중복 입력·길게 누름·드래그·취소 경계를 명확히 한다.`,
    MOBILE_UX:`작은 화면에서 핵심 행동 버튼을 크게, 설정·도움말을 접어서 배치하고 HUD·위험 경고가 손가락에 가리지 않게 한다. safe area·스크롤·가로/세로를 검수하고 팝업 닫기 터치가 뒤쪽 이동·공격으로 전달되지 않게 입력을 소비한다.`,
    ACCESSIBILITY:`색만으로 상태를 구분하지 않고 형태/아이콘/텍스트/모션을 함께 쓰며, 중요한 피드백은 크기·대비·지속시간을 확보해 정보 누락을 줄인다.`,
    TUTORIAL_ONBOARDING:`${anchor}의 첫 입력·결과·목표를 필요한 순간 한 줄과 실습으로 안내한다. 같은 실패 반복 시 목표 확인→관련 위치→행동 예시의 선택형 힌트를 단계적으로 제공하되 정답 자동 처리·난이도 변경은 금지한다. 설명 닫기는 학습 완료가 아니며 건너뛰기·도움말 다시 열기를 제공한다. 재접속은 초기 설명 대신 현재 목표를 보여준다.`,
    DIFFICULTY_PACING:`초반 진입, 중반 선택 압박, 후반 숙련 요구가 갑자기 튀지 않게 적/자원/목표/보상의 복잡도를 단계적으로 올리고 실패 원인이 학습 가능한 형태로 보이게 한다.`,
    GAME_FEEL:`핵심 입력의 반응 지연, anticipation, impact, hit-stop/반동/화면 반응, recovery를 장르와 ${anchor}에 맞춰 조정해 버튼 입력과 결과 사이의 손맛을 강화한다.`,
    SPAWN_ENCOUNTER_DIRECTOR:`적·자원·이벤트·조우의 생성 위치/빈도/조합/안전거리/재생성 규칙을 지역 역할과 난이도에 맞추고 불공정한 즉시 피격·과밀·공백을 줄인다.`,
    FAILURE_RESPAWN_CHECKPOINTS:`사망/실패/런 종료 시 기존 손실·보존·체크포인트·리스폰 규칙을 유지하고 빠르게 재시작하게 한다. 실제 기록에 있는 원인만 시각화한다: 퍼즐의 잘못된 연결, 방어의 뚫린 경로, 생존의 사망 원인 등 해당 장르에 맞게 표시하며 근거가 없으면 추측하지 않는다.`,
    NPC_SOCIAL_BEHAVIOR:`NPC가 적용되는 게임이면 idle 순환뿐 아니라 이동 목적, 상호작용 반응, 시간/지역/퀘스트 상태에 따른 행동 변화가 세계 역할과 연결되게 한다.`,
    NARRATIVE_STORY:`스토리가 적용되는 게임이면 세계 설정·NPC 대사·환경 단서·퀘스트 결과가 서로 모순되지 않고 플레이 행동으로 드러나며 긴 설명이 핵심 루프를 끊지 않게 한다.`,
    AUDIO_MUSIC_SFX:`배경음악은 지역/상태/전투 강도 전환과 연결하고, 핵심 행동·위험 전조·피격·보상·UI SFX를 서로 구별해 화면을 보지 않아도 중요한 사건을 인지할 수 있게 한다.`,
    REPLAYABILITY_VARIATION:`반복 플레이가 적용되는 게임이면 조우 조합·지역 경로·보상 선택·빌드/전략·이벤트 중 게임에 맞는 변주를 제공해 같은 정답만 반복되지 않게 한다.`,
    PLAYER_AGENCY:`핵심 루프에서 최소 두 개 이상의 의미 있는 선택축을 유지하고 하나의 정답 버튼 반복보다 상황·자원·위험에 따라 선택이 달라지게 한다.`,
    ANTI_GRIND:`같은 행동을 반복해서 숫자만 채우는 구간을 줄이고 반복이 필요하면 새로운 위험·조합·선택·단축 해금 중 하나가 주기적으로 생기게 한다.`,
    CONTENT_DENSITY:`플레이 시간과 이동 거리에 비해 실제 상호작용·조우·보상·발견이 비는 구간을 줄이고 새 콘텐츠가 서로 다른 플레이 결정을 만들게 한다.`,
    CONTENT_DISCOVERY:`새 지역·아이템·시스템·퀘스트가 해금됐을 때 플레이어가 존재와 접근 방법을 자연스럽게 발견하도록 세계 신호·UI·목표·상호작용을 연결한다.`,
    MID_LATE_GAME_DEPTH:`중후반은 초반 수치 상승 반복이 아니라 새 지역·적 역할·장비 조합·시스템 연결·전략 전환 중 여러 축에서 플레이 깊이가 실제로 확장되게 한다.`,
    MAP_EXPANSION:`맵 확장은 면적만 늘리지 말고 새 지역 역할, 연결 경로, 잠금/해금, 랜드마크, 자원·적·이벤트 차이와 기존 지역으로 돌아올 이유를 함께 설계한다.`,
    WORLD_DENSITY:`넓은 공간이 비지 않게 탐색 거리마다 기능성 소품·상호작용·조우·자원·환경 이야기 중 게임에 맞는 요소를 배치하고 반복 복제 밀도를 줄인다.`,
    WORLD_NAVIGATION:`지도/미니맵/방향 표식/랜드마크/목표 추적 중 게임에 맞는 수단으로 현재 위치·목적지·잠금 경로를 읽게 하며 모바일에서도 길을 잃는 비용을 줄인다.`,
    INTERACTION_DISCOVERABILITY:`줍기·열기·대화·제작·장착·구매·사용 가능한 대상은 접근 전후에 형태/프롬프트/상태 피드백으로 구별되고 상호작용 실패 이유도 즉시 보이게 한다.`,
    INVENTORY_USABILITY:`인벤토리의 획득·스택·정렬·선택·사용·장착·교체·버리기/보존·가득 참 처리를 모바일 터치에서 끊김 없이 연결하고 현재 장착 상태를 명확히 표시한다.`,
    EQUIPMENT_LOADOUT:`장비/무기 슬롯, 교체, 비교, 장착 표시, 캐릭터 외형/스탯/행동 반영이 같은 authoritative 장착 상태를 사용하도록 연결한다.`,
    SYSTEM_CONNECTION:`드랍→인벤토리→제작/장착→전투/탐색→보상/해금처럼 현재 게임의 주요 시스템들이 실제 상태를 주고받게 하고 서로 고립된 메뉴 기능을 줄인다.`,
    SESSION_FLOW:`접속→준비→첫 행동→목표/실패→결과/보상→재시도→다음 선택을 연결한다. 확인된 실패 수리 후 첫 플레이·재도전·적용 가능한 친구 참가·연출 순으로 한 흐름씩 구현·검수한다. 결과는 달성 내용·실제 실패 원인/성공 선택·재도전/다음 단계/로비를 보여주고 서버 확정 보상만 표시한다. 재도전 연타도 한 번만 시작되며 입력·판정·상태·피드백·실패 복귀가 연결되어야 한다.`,
    FIRST_10_MINUTES:`첫 10분 안에 이동/기본 입력, 핵심 상호작용, 첫 성공 피드백, 첫 보상 또는 성장, 다음 목표를 실제 플레이로 경험하게 하고 설명문만으로 대체하지 않는다.`,
    SAVE_COMPLETENESS:`현재 게임에서 저장돼야 하는 진행·인벤토리·장비·해금·퀘스트·발견 지역·설정 상태를 기존 save 의미를 깨지 않고 재접속 후 일관되게 복구한다.`,
    RECONNECT_RECOVERY:`재접속/late join/네트워크 실패 후 권위 상태를 재동기화하고 중복 보상·장비 유실·퀘스트 되감기 없이 복구한다. 복구된 실제 진행·현재 목표·다음 행동을 짧게 안내하며 복구 전 상태를 확정해 표시하지 않는다.`,
    SETTINGS_ACCESSIBILITY:`음량·카메라/흔들림·감도·UI 크기/가독성 등 현재 게임에 필요한 설정을 접근 가능한 메뉴에 두고 설정 변경이 즉시 반영·저장되게 한다.`,
    MENU_FLOW:`${anchor}를 연습하는 로비/허브를 기존 UI에 연결한다. 승인된 장르에 맞게 퍼즐은 작은 연습판, 방어는 적 하나에 배치·회수, 생존은 안전한 채집·제작·장착을 활용한다. 연습은 건너뛸 수 있고 기존 재화·보상·저장에 영향을 주지 않는다. 로딩은 실제 월드·저장·참가 준비 단계와 실패 이유·재시도/안전 복귀를 표시한다. 시작은 준비 확인 후 한 번만 처리하고 스폰·카메라·목표까지 연결한다. 기존 메뉴의 뒤로가기·닫기·스크롤·팝업·선택 유지를 모바일에서 검수하며 중복 화면·가짜 진행률·장식용 버튼을 금지한다.`,
    CONVENIENCE:`반복 조작을 줄일 수 있는 빠른 사용/장착, 제작 가능 표시, 부족 재료 표시, 목표 추적, 비교 정보 등 현재 게임에 맞는 편의 기능을 추가하되 플레이 선택 자체를 자동화하지 않는다.`,
    UI_DESIGN_SYSTEM:`HUD와 메뉴가 공통 타이포·패널·아이콘·간격·상태 색/형태 규칙을 공유하고 게임 세계의 아트 언어와 연결되며 기능마다 제각각인 임시 UI를 줄인다.`,
    UI_INFORMATION_PRIORITY:`현재 목표, 생존/위험, 핵심 자원, 장비/쿨다운, 다음 행동 순으로 실제 플레이 중요도에 맞게 정보 위계를 정하고 작은 화면에서 비핵심 정보가 핵심 HUD를 밀어내지 않게 한다.`,
    FEEDBACK_CLARITY:`획득·구매·제작·장착·레벨업·퀘스트·실패·사용 불가 등 중요한 상태 변화에 즉시 읽히는 UI/음향/시각 피드백과 실패 이유를 연결한다.`,
    PERFORMANCE_BUDGET:`맵·에셋·NPC·VFX를 늘릴 때 객체 수명, 동시 NPC/파티클, 업데이트 빈도, 스트리밍/LOD, 메모리·모바일 프레임 예산을 함께 정의하고 초과 시 표현 비용부터 줄인다.`,
    CHARACTER_VISUALS:`${identity} 플레이어/NPC의 역할·등급·장비가 실루엣, 비율, 자세, 재질에서 구별되고 핵심 행동 모션과 연결되게 한다.`,
    ENEMY_VISUALS:`적 종류와 위험도가 색상만이 아니라 실루엣·크기·이동 리듬·공격 전조·피격/사망 반응으로 구별되게 한다.`,
    WEAPONS_AND_EQUIPMENT:`무기/장비 외형이 실제 기능·사거리·무게감·공격 궤적·장착 상태와 맞고 플레이어 손/몸에 자연스럽게 연결되게 한다.`,
    BUILDINGS_AND_PROPS:`건물·상호작용 오브젝트·장식물은 기능과 상태가 형태/배치/재질로 구별되고 플레이 동선과 충돌하지 않게 한다.`,
    ENVIRONMENT:`전경/중경/배경, 식생/소품, 위험/안전 신호, 환경 스토리텔링을 ${identity} 아트 방향 안에서 통일하고 빈 장식면을 줄인다.`,
    TERRAIN:`지형 높낮이·경계·통로·전투/상호작용 공간이 플레이 기능과 맞고 반복 평면/단일 primitive 위주 구성을 실제 지형 형태로 교체한다.`,
    MATERIALS:`재질은 이름 등록이 아니라 거칠기·광택·마모·투명/발광·빛 반응이 표면 역할과 맞게 실제 렌더에 적용되도록 한다.`,
    PALETTE:`팔레트는 지역/진영/위험/보상/상호작용 상태를 구분하면서 전체 게임 정체성을 유지하고 단순 색상 교체만으로 개선 완료를 주장하지 않는다.`,
    LIGHTING:`조명은 시간/분위기뿐 아니라 플레이 동선, 적 전조, 상호작용 대상, 랜드마크 가독성을 지원하고 캐릭터 실루엣을 배경에서 분리한다.`,
    ANIMATION:`주요 캐릭터/적 행동을 idle→locomotion→anticipation→impact→recovery→hit/death 상태와 실제 게임 이벤트에 연결하고 정지 모델 판정을 금지한다.`,
    SECONDARY_MOTION:`장비·의상·머리·꼬리·식생·기계 등 적합한 요소에 지연/관성/반동을 추가해 무게감과 생동감을 주되 판정/권한은 바꾸지 않는다.`,
    VFX:`일반 타격, 강공격, 위험 전조, 상태이상, 보상, 보스/시그니처 이벤트의 VFX 형태·강도·지속시간을 분리하고 실제 상태 변화 시점에 동기화한다.`,
    CAMERA:`기본 시야·FOV·추적을 모바일 가독성에 맞추고 강한 타격/대시/보스/탐색 포인트에 짧고 단계적인 카메라 반응을 적용해 멀미와 과도한 흔들림을 피한다.`,
    UI_HUD:`HUD는 현재 목표·체력/위험·핵심 자원·쿨다운/상태·다음 선택의 우선순위를 명확히 하고 게임 아트 언어와 일치하는 패널/아이콘/상태 피드백을 사용한다.`,
    AUDIO_VISUAL_TIMING:`핵심 action의 animation impact, damage/state change, VFX, camera, audio가 같은 사건 타임라인에 맞게 발생하도록 오프셋을 정리한다.`,
    ENVIRONMENTAL_MOTION:`세계에 맞는 바람/식생/물/빛/먼지/기계 등 미세 환경 움직임을 추가해 정적인 무대를 피하되 플레이 정보와 성능을 방해하지 않는다.`,
    PERFORMANCE:`실제 병목 근거를 기준으로 update/tick 빈도, 객체/파티클 수명, draw/instance 수, GC/할당, 네트워크 빈도, 모바일 열/메모리 비용을 줄인다.`,
    RUNTIME_STABILITY:`핵심 루프를 반복 실행해도 상태 누수·중복 이벤트·고착·크래시 없이 시작→플레이→실패/성공→재시작/복귀가 유지되게 한다.`,
    ERROR_RECOVERY:`재현된 오류는 숨기지 말고 책임 시스템에서 원인을 제거하고 실패 시 안전한 복구/재시도/사용자 피드백 경로를 제공한다.`
  };
  return states.map(state=>{
    const notApplicable=state.state==='NOT_APPLICABLE';
    const focusMatch=focusDomains[focus]?.has(state.domain)===true;
    const priority=notApplicable?'NOT_APPLICABLE':state.state==='GAP'?'FIX_NOW':focusMatch?'BUILD_UP_NOW':'MONITOR_OR_CONNECT';
    const directive=notApplicable
      ?`현재 승인 설계상 ${state.reason}. 새 설계 근거가 생기기 전에는 억지로 기능을 추가하지 않는다.`
      :instructions[state.domain]||`${identity}의 ${state.domain} 영역을 ${anchor}와 연결해 실제 플레이 변화가 생기도록 심화한다.`;
    return Object.freeze({
      domain:state.domain,
      state:state.state,
      priority,
      developmentDepth:depth,
      directive,
      implementationContract:'WHAT→TRIGGER/CONDITION→STATE_CHANGE→PLAYER_FEEDBACK→SYSTEM_CONNECTION→OBSERVABLE_ACCEPTANCE',
      acceptance:notApplicable?'DESIGN_EVIDENCE_REQUIRED_BEFORE_ACTIVATION':'REAL_GAME_SOURCE_AND_RUNTIME_OR_PLAY_EVIDENCE_REQUIRED'
    });
  });
}

// Existing BUILD_UP workers consume this through directivePrompt; this is not a new QA runner.
function buildPlayerFacingInspectionContract({gameId,platform='COMMON',source,states,responsibleFiles=[]}){
  const definitions=[
    ['UI_LAYOUT','UI_HUD','UI', 'HUD·메뉴·팝업·인벤을 작은/큰 화면과 가로/세로에서 열고 긴 한글·최대 보유량·위험 경고를 표시', '글자 잘림·겹침·safe area 침범·체력/목표 가림·초점 소실·색만으로 상태 구분', '레이아웃·텍스트·아이콘·정보 우선순위', '같은 해상도/상태 전후 화면과 핵심 정보 식별'],
    ['UI_INTERACTION','MENU_FLOW','UI', '열기→스크롤→선택→장착→닫기→다시 열기, 팝업 위 터치와 빠른 연속 입력', '장식 버튼·중복 실행·닫기 터치의 뒤쪽 공격 전달·선택 초기화·표시와 실제 장착 불일치', '입력 소비·모달·선택 상태·서버 응답 연결', '터치/마우스별 한 번의 입력에 한 번의 결과와 상태 유지'],
    ['CHARACTER_RENDER','CHARACTER_VISUALS','GRAPHICS', '정면/측면/후면, 가까이/멀리, 장비 교체와 이동·경사·착지', '누락 메시/텍스처·기본 부품 대체·장비 관통/부유·리그 찢어짐·발 미끄러짐·지면 관통', '기존 모델 바인딩·리그·장착 접점·접지', '같은 캐릭터/장비/카메라의 실제 렌더와 원본 해시/업로드 ID 연결'],
    ['MONSTER_READABILITY','ENEMY_VISUALS','GRAPHICS', '기존 적 종류를 같은 조명에서 접근→추적→공격 전조→피격→사망 순으로 관찰', '색만 다른 복제·역할 식별 불가·공격 전조 안 보임·배경에 묻힘·죽은 적이 움직이거나 남음', '적 모델·상태 표현·전조·사망 정리', '기존 종류별 역할과 위험 전조가 구별되는 화면/행동 기록'],
    ['MOTION_TRANSITIONS','ANIMATION','GRAPHICS', 'idle→start→walk/run→turn→stop→jump/land→attack→hit/death, 행동 중 취소·재시작', 'T포즈·정지 모델·전환 튐·루프 끊김·중복 트랙·사망 뒤 idle·전체 CFrame 이동만으로 모션 주장', 'Animator·관절·블렌딩·상태 전환·트랙 수명', '같은 입력 순서의 연속 프레임/동작 기록과 실제 상태 일치'],
    ['ACTION_IMPACT','GAME_FEEL','GAMEPLAY', '기존 주 행동의 준비→실행→판정→회복, 빗나감·피격·취소·연속 입력', '판정보다 먼저 데미지 표현·허공 타격 피드백·VFX/음향 지연·쿨다운 표시 불일치·연속 입력 고착', '기존 서버 판정과 클라이언트 모션/VFX/음향 사건 연결', 'authoritative impact 시점과 시각/음향 타임라인 비교; 데미지·쿨다운·히트 의미 보존'],
    ['CAMERA_COMPOSITION','CAMERA','GRAPHICS', '벽/모서리/좁은 통로·다중 적·장비 UI·큰 VFX·근접/원거리 장면', '카메라 벽 관통·캐릭터/적/목표 가림·과도한 흔들림·줌 튐·모바일 화면 이탈', '카메라 충돌·추적·FOV·오클루전·화면 구성', '같은 동선에서 플레이어·위험·다음 목표를 지속적으로 식별'],
    ['WORLD_BACKGROUND','ENVIRONMENT','MAP', '스폰→허브→주 동선→전투/상호작용 구역→지역 경계, 낮/어둠 등 기존 상태', '빈 평면·무의미한 반복 소품·전경/중경/배경 혼동·랜드마크 부재·동선과 장식 충돌', '기존 맵 배치·지형·랜드마크·조명·배경 밀도', '같은 경로의 전후 장면에서 지역 역할과 목적지 식별; 새 지역은 승인 설계에만 연결'],
    ['GRAPHICS_INTEGRITY','MATERIALS','GRAPHICS', '기존 모든 자산 계열을 가까이/멀리/이동 중, 로딩 전후와 품질 단계 전환에서 관찰', '미로드 자산·검은/투명 모델·핑크/누락 재질·UV 깨짐·z-fighting·깜빡임·LOD 갑작스런 소실', '메시/텍스처/재질 ID·로드 실패 복구·LOD', '실제 화면과 로드/바인딩 오류를 함께 확인; 썸네일 파일 정상은 렌더 합격 아님'],
    ['NAVIGATION_BLOCKERS','WORLD_NAVIGATION','MAP', '스폰부터 기존 목표/출구까지 이동, 문/포탈/경사/계단/맵 경계·리스폰', '끼임·보이지 않는 벽·낙사·부유 스폰·막힌 문·도달 불가능한 목표·안전 복귀 실패', '충돌·접지·경로 연결·문/포탈·복귀', '동일 경로의 실제 입력→도착→목표 상태, 모든 실패 지점 재통과'],
    ['PROGRESSION_BLOCKERS','SYSTEM_CONNECTION','GAMEPLAY', '첫 세션 핵심 루프와 기존 중후반 해금·퀘스트·보상·다음 지역 연결', '다음 행동 없음·퀘스트 완료 불가·보상 중복/누락·상태 불일치·다음 지역으로 진행 불가', '기존 목표·퀘스트·보상·진행 상태 책임 시스템', '성공/실패/재시도 분기의 상태 전후 및 다음 행동 연결; 승인 없는 경제/밸런스 변경 금지'],
    ['RECOVERY_SAVE','SAVE_AND_RECOVERY','SAVE', '사망→재시작→로비 복귀, 기존 저장→이탈→재접속, 로드/네트워크 실패', '세이브 초기화·아이템 소실/복제·옛 UI 상태·영구 로딩·오류 숨김·복구 버튼 무효', '기존 저장 키·세션 수명·오류 처리·재접속', '같은 저장 의미와 권한으로 복구; 기존 데이터/보상 보존'],
    ['MULTIPLAYER_CONSISTENCY','MULTIPLAYER_AND_SYNC','MULTIPLAYER_SERVER', '기존 멀티에서 두 명 이상 참가→준비→행동→이탈/재접속; 동시 상호작용', '클라이언트마다 외형/목표/피격 불일치·중복 보상·방장 이탈 무한대기·권한 이동', '서버 권한·동기화·참가/이탈·장비/모션 복제', '두 참가자의 실제 상태/장면과 서버 결과 비교; 로컬 모의 결과를 멀티 PASS로 쓰지 않음'],
    ['MOBILE_PERFORMANCE','PERFORMANCE_BUDGET','GRAPHICS', '최대 기존 전투/파티클/인벤·지역 이동·반복 세션을 승인된 모바일 예산과 대조', '입력 지연·프레임 급락·메모리/객체 누수·HUD 가림·발열 비용·무제한 효과', '실제 병목 update·객체/효과 수명·로드·네트워크', '같은 기기/장면의 전후 측정과 회귀; 예산 없으면 임의 수치 PASS 대신 미검증'],
    ['LOBBY_SPACES','MENU_FLOW','UI', '기존 로비에서 진입·파티 공간·퀘스트/이벤트 게시판·장비 전시·외형 설정·안전 연습 동선을 점검', '기능 없는 장식·구역 겹침·목적 불명·접지 불량·포탈 가림·연습이 저장/재화/판정 변경', '기존 허브 배치·상호작용·메뉴·안전 연습', '있는 기능은 연결/보존하고 없는 기능은 승인 설계 또는 오너 요청 범위 확인; 로비 없는 게임에 강제 추가 금지']
  ];
  // [원격 자동 검증] 기존 15개 장면 각각을 관찰 가능한 실패·상태·재현 증거에 연결한다.
  // 이 계약은 테스트 계획이며 원격 실행 결과가 없으면 어떤 항목도 PASS로 승격하지 않는다.
  const remoteAssertions=Object.freeze({
    UI_LAYOUT:['MOBILE_VIEWPORT_SAFE_AREA','TEXT_OVERFLOW_AND_HUD_OCCLUSION','RESIZE_AND_ORIENTATION'],
    UI_INTERACTION:['TOUCH_EVENT_TO_ONE_SERVER_OR_UI_ACTION','SCROLL_MODAL_FOCUS','CLOSE_REOPEN_SELECTION'],
    CHARACTER_RENDER:['REGISTERED_ASSET_AND_ORIGINAL_HASH','MESH_RIG_ATTACHMENT','MOVEMENT_GROUND_CONTACT'],
    MONSTER_READABILITY:['DISTINCT_ENEMY_ROLE_AND_TELEGRAPH','ATTACK_HIT_DEATH_STATE_SEQUENCE','DESPAWN_CLEANUP'],
    MOTION_TRANSITIONS:['TIME_ORDERED_IDLE_MOVE_TURN_JUMP','JOINT_ANIMATION_AND_BLEND','ATTACK_HIT_DEATH_NO_STALE_TRACK'],
    ACTION_IMPACT:['AUTHORITATIVE_HIT_EVENT_ORDER','MISS_CANCEL_COOLDOWN_REPLAY','VFX_AUDIO_DAMAGE_ALIGNMENT'],
    CAMERA_COMPOSITION:['WALL_AND_CORNER_OCCLUSION','TARGET_AND_PLAYER_READABILITY','MOBILE_CAMERA_INPUT'],
    WORLD_BACKGROUND:['SPAWN_TO_OBJECTIVE_WORLD_ROUTE','LANDMARK_AND_TERRAIN_BINDING','LIGHTING_AND_REGION_STATE'],
    GRAPHICS_INTEGRITY:['EXACT_MODEL_TEXTURE_LOAD','VISIBLE_RENDERED_DELTA','LOD_AND_RELOAD_RECOVERY'],
    NAVIGATION_BLOCKERS:['SPAWN_GROUND_CONTACT','PORTAL_DOOR_ROUTE_REACHABILITY','RESPAWN_SAFE_RECOVERY'],
    PROGRESSION_BLOCKERS:['CORE_LOOP_ACTION_TO_REWARD','UNLOCK_NEXT_OBJECTIVE','RETRY_IDEMPOTENT_REWARDS'],
    RECOVERY_SAVE:['SAVE_EXIT_REJOIN_RESTORE','OLD_SAVE_COMPATIBILITY','NO_DUPLICATION_OR_LOSS'],
    MULTIPLAYER_CONSISTENCY:['EXACT_SOURCE_F7_SERVER_AUTHORITY_CONTRACT','REPLICATION_AND_RECONNECT_SOURCE_QA','NO_UNVERIFIED_MULTI_CLIENT_PASS'],
    MOBILE_PERFORMANCE:['INPUT_LATENCY_AND_FRAME_BUDGET','PARTICLE_OBJECT_LIFETIME','MEMORY_AND_MOBILE_VIEWPORT'],
    LOBBY_SPACES:['EXISTING_LOBBY_ENTRY_AND_EXIT','SPAWN_INTERACTION_ROUTE','NO_GAMEPLAY_OR_SAVE_SIDE_EFFECT']
  });
  return{
    version:1,gameId,requiredEveryBuildUpCycle:true,executionBoundary:'EXISTING_BUILD_UP_AND_F0_F9_ONLY',
    sourceTreeFingerprint:source.sourceTreeFingerprint,checklistIsNotExecutedEvidence:true,
    evidenceState:'UNVERIFIED',technicalPassIsNotVisualQualityPass:true,thumbnailTransportIsNotRenderedQuality:true,
    validationMode:'REMOTE_AUTOMATED_EXISTING_F0_F9_AND_INDEPENDENT_QA',
    localManualInspectionRequired:false,neverTreatSourceOrThumbnailAsRuntimePass:true,
    exactCandidateBindingRequired:true,postPublishVersionMatchRequired:clean(platform).toUpperCase()==='ROBLOX',
    negativeAndRecoveryScenariosRequired:true,
    applicabilityRule:'CHECK_EXISTING_OR_APPROVED_SURFACE; NOT_APPLICABLE_REQUIRES_DESIGN_AND_SOURCE_REASON; NEVER_ADD_UNAPPROVED_GAMEPLAY',
    cases:definitions.map(([id,domain,impact,scene,failure,owner,replay])=>{
      const domainState=states.find(row=>row.domain===domain);
      return{id,domain,impact,applicability:domainState?.state==='NOT_APPLICABLE'?'REVIEW_NOT_APPLICABLE_REASON':'INSPECT_EXISTING_OR_APPROVED_SURFACE',applicabilityReason:domainState?.state==='NOT_APPLICABLE'?domainState.reason:null,scene,failureCriteria:failure,responsibility:owner,retest:replay,evidenceState:'UNVERIFIED',
        remoteAssertions:Object.freeze(remoteAssertions[id]),remoteProofState:'UNVERIFIED',
        proofOrigin:'EXACT_REMOTE_CANDIDATE_OR_EXISTING_F0_F9',localManualInspectionRequired:false,
        missingEvidenceAction:'KEEP_UNVERIFIED_AND_ROUTE_TO_EXISTING_QA'};
    }),
    responsibleSourceCandidates:uniq(responsibleFiles),
    requiredEvidenceFields:['gameId','sourceRevision','sourceTreeFingerprint','artifactIdentity','placeOrSceneId','candidateVersion','platform','viewportOrDevice','scenarioId','inputSequence','observedStateBeforeAfter','captureReferenceAndSha256','remoteRunId','runtimeOrQaStage','failureSignature','responsibleSource','negativeCaseResult','finding','retestResult'],
    evidenceRules:[
      '현재 정확한 후보의 실제 플레이 장면만 사용한다. 대표 장면은 시작/로비, 핵심 행동, 위험/다중 적, 인벤/팝업, 지역 경계와 모바일이다. 해당 없는 장면은 설계/소스 이유를 기록한다.',
      '로컬 수동 검수는 요구하지 않는다. 기존 원격 CI/F0~F9/독립 QA/Open Cloud에서 같은 sourceRevision·artifactIdentity·candidateVersion에 결속된 증거만 사용한다. 로컬 결과나 다른 버전의 증거를 합격으로 대체하지 않는다.',
      '각 장면의 remoteAssertions를 기존 검사에서 실제 실행·측정한 뒤 실패/재시도/복구 분기까지 확인한다. F7 멀티는 중앙정책대로 정확한 소스 계약을 검사하며 실측한 다중 접속으로 허위 표시하지 않는다.',
      '같은 카메라·입력·해상도·게임 상태의 전후 이미지와 상태 결과를 비교한다. 모션은 정지 이미지 한 장 대신 연속 프레임/시간 정보가 필요하다.',
      '파일 존재·크기·PNG 서명·썸네일·자산 업로드·소스 마커·테스트 개수·반복 횟수는 시각 품질 합격을 증명하지 않는다.',
      '중앙 정책에서 허용한 관찰 도구만 사용한다. 정확한 화면 관찰 수단이 없으면 시각 품질은 UNVERIFIED로 남기고 증거 수집 책임으로 반환한다. 증거 부재를 관찰된 그래픽 오류로 꾸미지 않는다.',
      '실제 결함은 재현 장면→기존 책임 함수→최소 원인 수정→영향별 QA→정확 후보 재빌드→같은 장면 재검수로 반환한다. 같은 결함이 반복되면 미세 패치 누적 대신 근본 원인을 재평가한다.',
      '검증된 개선만 다음 반복의 기준선으로 사용한다. 적용 항목 전체를 검토하되 실제 변화/실패 영향에 맞춰 검증 범위를 넓히고 다른 게임의 독립 작업을 막지 않는다.'
    ]
  };
}

// [기존 BUILD_UP] 게임 내부 구성 자동 판단: 실제 게임 코드에 이미 존재하는 기능만 연결한다.
// 분석 결과는 source signature이며 실제 동작/플랫폼 적용 증거는 아니다.
export function buildGameInternalAutoCompositionPlan({gameId='',platform='ROBLOX',repoRoot=process.cwd(),sourceRoot='',sourceObservation={},design={}}={}){
  const roots=uniq(sourceObservation?.sourceRoots?.length?sourceObservation.sourceRoots:[sourceRoot||sourceObservation?.sourceRoot])
    .map(posix).filter(Boolean);
  const repo=path.resolve(repoRoot);
  const validRoots=[];
  for(const root of roots){
    const full=path.resolve(repo,root),relative=path.relative(repo,full);
    if(!relative||relative.startsWith('..')||path.isAbsolute(relative))continue;
    try{
      const actual=fs.realpathSync(full),original=fs.realpathSync(repo);
      if(fs.statSync(actual).isDirectory()&&(actual.startsWith(original+path.sep)))validRoots.push(actual);
    }catch{}
  }
  // 메인 · 기존 source inspection 상위 20개 파일 이외의 모듈도 F0 연결 후보에서 누락하지 않는다.
  // 공통 walkSource가 수집한 실제 동일 게임 파일만 대상으로 하며, 임의 외부/교차 게임 소스는 차단한다.
  const topFiles=uniq([
    ...(sourceObservation?.topFiles||[]).map(row=>posix(row?.file)),
    ...validRoots.flatMap(root=>walkSource(root).map(file=>posix(path.relative(repo,file))))
  ]).filter(Boolean).map(file=>({file}));
  const roles=Object.freeze({
    LOBBY:/\b(lobby|hub|main.?menu|start.?game|start.?screen)\b/i,
    CUSTOMIZATION:/customiz|avatar|appearance|skintone|cosmetic|outfit|race.?select|character.?select|wardrobe/i,
    MATERIAL:/materialservice|surfaceappearance|materialvariant|textureid|pbr|roughness|metalness|\.Material\b/i,
    INVENTORY:/\binventory\b|backpack|itemslot|hotbar|item.?stack/i,
    EQUIPMENT:/\bequip(?:ped|ment)?\b|unequip|gear.?slot|armor.?slot/i,
    UI:/screengui|screenui|canvas|hud\b|ui.?layout|button|menu.?panel|\.Activated\b/i,
    WORLD:/teleport|portal|region|zone|checkpoint|waypoint|spawnpoint|destination/i,
    BIOME:/\b(?:biome|terrain|heightmap|worldGeneration|regionGeneration|generateBiome|biomeGenerator)\b|바이옴|지형생성|지역생성/i,
    HOUSING:/\b(?:housing|buildMode|housePlacement|structurePlacement|buildingPlacement|furniture|placeStructure|placeBuilding|placeFurniture|constructBuilding)\b|하우징|건축모드|가구배치/i,
    MOTION:/\b(?:Animator|AnimationTrack|AnimationMixer|LoadAnimation|motionState|motionBlend|locomotion|TweenService|SkinnedMeshRenderer)\b|모션|애니메이션/i,
    ACTION:/\b(?:attack|combat|gather|harvest|useTool|castSkill|dodge|jump|playerAction|actionState|interact)\b|공격|채집|전투|행동/i,
    NPC_AI:/\b(?:npc|companion|squad|pathfinding|behaviorTree|decisionTree|enemyAI|aiParty|agentState)\b|NPC|주민|동료|인공지능/i,
    QUEST_DIALOGUE:/\b(?:quest|dialogue|dialog|conversation|questLog|storyState)\b|퀘스트|대화|임무/i,
    CRAFTING:/\b(?:crafting|craftRecipe|craftItem|recipeBook|workbench|craftingStation)\b|제작법|제작대|아이템제작/i,
    ECONOMY:/\b(?:economy|merchant|currency|tradeOffer|marketplace|shopInventory|purchaseItem)\b|경제|거래|화폐|상점/i,
    PROGRESSION:/\b(?:experiencePoints|levelUp|progression|skillTree|techTree|unlockAbility)\b|레벨업|스킬트리|성장시스템/i,
    FARMING:/\b(?:farming|crop|harvestCrop|plantSeed|cultivation|growPlant)\b|농사|농장|작물|씨앗/i,
    WEATHER:/\b(?:weather|dayNight|timeOfDay|seasonCycle|rainfall|snowfall)\b|날씨|계절|기후/i,
    PHYSICS:/\b(?:physics|rigidbody|collisionShape|raycast|collisionResponse|constraint)\b|물리|충돌체|충돌판정/i,
    CAMERA:/\b(?:camera|cinematic|cutscene|followCamera|cameraShake)\b|카메라|시네마틱|컷신/i,
    AUDIO:/\b(?:audio|sound|music|sfx|bgm|soundscape|AudioSource|SoundService)\b|오디오|효과음|배경음악/i,
    SKILL_VFX:/\b(?:skillEffect|projectile|particleEmitter|visualEffect|spellCast|vfx)\b|스킬이펙트|마법효과|파티클/i,
    NETWORK:/\b(?:RemoteEvent|RemoteFunction|multiplayer|replication|networkSync|serverRpc|clientRpc)\b|멀티플레이|동기화|서버권한/i,
    INTERACTION:/proximityprompt|clickdetector|interact|pickup|collect|open.?chest/i,
    REWARD:/\bdrop\b|reward|loot|pickup|collect|grant.?item/i,
    SAVE:/datastore|GetAsync|UpdateAsync|SetAsync|SaveAsync|load.?data|save.?data|persist/i,
    COMBAT:/\bcombat\b|\battack\b|\bdamage\b|parry|dodge|skill.?cast/i,
    SHOP:/\bshop\b|merchant|vendor|purchase|buy.?item|trade.?request/i
  });
  const evidence=Object.fromEntries(Object.keys(roles).map(key=>[key,[]]));
  for(const entry of topFiles){
    const file=posix(entry?.file);
    if(!file||file.split('/').some(part=>part==='.'||part==='..')||file.startsWith('/'))continue;
    const full=path.resolve(repo,file);
    if(!validRoots.some(root=>full.startsWith(root+path.sep)))continue;
    try{
      const actual=fs.realpathSync(full);
      if(actual!==full||!validRoots.some(root=>actual.startsWith(root+path.sep)))continue;
      const stat=fs.statSync(actual);
      if(!stat.isFile()||stat.size>2*1024*1024||!/\.(?:luau?|js|mjs|tsx?|cs|gd|html|vue|json)$/i.test(file))continue;
      const contents=fs.readFileSync(actual,'utf8');
      for(const [key,pattern] of Object.entries(roles))
        if(pattern.test(contents))evidence[key].push(file);
    }catch{}
  }
  const found=key=>evidence[key].length>0;
  const targets=Object.fromEntries(Object.entries(evidence).map(([key,files])=>[key,Object.freeze(uniq(files).slice(0,6))]));
  const designText=JSON.stringify({
    identity:design?.identity,genre:design?.genre,coreLoop:design?.coreLoop,
    signatureSystems:design?.signatureSystems,interfacePlan:design?.interfacePlan,
    spatialLayout:design?.spatialLayout,contentExpansionPlan:design?.contentExpansionPlan,
    mobileUx:design?.mobileUx,presentationPlan:design?.presentationPlan
  }).slice(0,8000);
  const designDemand={
    LOBBY:/lobby|hub|로비|허브/i.test(designText),
    CUSTOMIZATION:/customiz|avatar|커스터마이징|외형/i.test(designText),
    INVENTORY:/inventory|인벤토리|장비창/i.test(designText),
    UI:/hud|interface|menu|메뉴|화면/i.test(designText),
    BIOME:/biome|region|terrain|world.?map|바이옴|지형|지역/i.test(designText),
    HOUSING:/housing|base.?building|player.?home|buildable|하우징|건축|집.?꾸미기/i.test(designText),
    MOTION:/animat|locomotion|motion|모션|애니메이션/i.test(designText),
    ACTION:/attack|combat|gather|harvest|player.?action|공격|채집|전투|액션/i.test(designText),
    NPC_AI:/npc|companion|enemy.?ai|주민|동료|인공지능/i.test(designText),
    QUEST_DIALOGUE:/quest|dialog|conversation|퀘스트|대화|임무/i.test(designText),
    CRAFTING:/craft|recipe|workbench|제작법|제작대|조합/i.test(designText),
    ECONOMY:/economy|merchant|currency|trade|경제|상점|거래/i.test(designText),
    PROGRESSION:/progression|level.?up|skill.?tree|성장|레벨업/i.test(designText),
    FARMING:/farm|crop|harvest|농장|농사|작물/i.test(designText),
    WEATHER:/weather|season|day.?night|날씨|계절/i.test(designText),
    PHYSICS:/physics|collision|rigidbody|물리|충돌/i.test(designText),
    CAMERA:/camera|cinematic|cutscene|카메라|컷신/i.test(designText),
    AUDIO:/audio|sound|music|sfx|오디오|효과음|음악/i.test(designText),
    SKILL_VFX:/spell|skill.?effect|projectile|particle|마법|이펙트/i.test(designText),
    NETWORK:/multiplayer|replication|network|멀티플레이|동기화/i.test(designText)
  };
  const componentIds=[
    'LOBBY','CUSTOMIZATION','MATERIAL','INVENTORY','EQUIPMENT','UI','WORLD','BIOME',
    'HOUSING','MOTION','ACTION','INTERACTION','SHOP','SAVE','COMBAT','REWARD','NPC_AI','QUEST_DIALOGUE',
    'CRAFTING','ECONOMY','PROGRESSION','FARMING','WEATHER','PHYSICS','CAMERA','AUDIO',
    'SKILL_VFX','NETWORK'
  ];
  const components=componentIds.map(key=>Object.freeze({
    id:key,
    state:found(key)?'EXISTING_SOURCE_CONNECTION_CANDIDATE':designDemand[key]?'REVIEW_REQUIRED_NO_SOURCE':'NOT_APPLICABLE_WITHOUT_SOURCE',
    responsibleFiles:targets[key],requiredByDesign:designDemand[key]===true,
    useExistingGameStateOnly:true,createPlaceholderUi:false,
    implementationProven:false,runtimeVerified:false
  }));
  // 실제 역할 소스와 승인된 설계가 있는 교차 시스템만 F0 연결 후보로 발행한다.
  // 역할 이름과 소스 시그니처는 동작·저장·멀티플레이 검증이 아니다.
  const connectionSpecs=[
    ['WORLD_BIOME_WEATHER',['WORLD','BIOME','WEATHER'],['NATIVE_TERRAIN_AND_REGION_GRAPH','APPROVED_WEATHER_STATE','MOBILE_STREAMING']],
    ['HOUSING_INVENTORY_SAVE',['HOUSING','INVENTORY','SAVE'],['ACTUAL_PLACEMENT_COLLISION','AUTHORITATIVE_COST_AND_OWNERSHIP','PERSIST_AND_REJOIN']],
    ['CUSTOMIZATION_EQUIPMENT_SAVE',['CUSTOMIZATION','EQUIPMENT','SAVE'],['REAL_RIG_AND_OUTFIT_BINDING','SAVED_AVATAR_AND_EQUIPMENT','RECONNECT_RESTORE']],
    ['NPC_AI_QUEST',['NPC_AI','QUEST_DIALOGUE'],['NPC_DECISION_TO_DIALOGUE_EVENT','QUEST_STATE_AND_SERVER_AUTHORITY']],
    ['ACTION_MOTION_COMBAT',['ACTION','MOTION','COMBAT'],['INPUT_TO_AUTHORITATIVE_HIT','EXACT_EXISTING_HIT_TIMING','RIG_PLAYBACK_AND_REACTION']],
    ['CRAFT_ECONOMY_INVENTORY',['CRAFTING','ECONOMY','INVENTORY'],['RECIPE_RESOURCE_CONSUMPTION','AUTHORITATIVE_CURRENCY_AND_ITEM_STATE','SAVE_AND_REJOIN']],
    ['FARMING_WORLD_WEATHER',['FARMING','WORLD','WEATHER'],['APPROVED_CROP_REGION_AND_SEASON','HARVEST_STATE_AND_STORAGE']],
    ['SKILL_VFX_AUDIO',['SKILL_VFX','ACTION','AUDIO'],['SKILL_ACTUAL_EVENT_TO_EFFECT','AUDIO_STATE_AND_CLEANUP','MOBILE_EFFECT_BUDGET']]
  ];
  // 교차 시스템은 해당 장르에 실제 존재하거나 승인 설계가 요구할 때만 검사한다.
  // 모든 게임에 오디오/액션/월드가 있다는 이유만으로 날씨·전투·경제·농사 등을 발명하지 않는다.
  const connectionApplies=Object.freeze({
    WORLD_BIOME_WEATHER:()=> (found('BIOME')||designDemand.BIOME)
      &&(found('WEATHER')||designDemand.WEATHER),
    HOUSING_INVENTORY_SAVE:()=>found('HOUSING')||designDemand.HOUSING,
    CUSTOMIZATION_EQUIPMENT_SAVE:()=>found('CUSTOMIZATION')||designDemand.CUSTOMIZATION,
    NPC_AI_QUEST:()=>(found('NPC_AI')||designDemand.NPC_AI)
      &&(found('QUEST_DIALOGUE')||designDemand.QUEST_DIALOGUE),
    ACTION_MOTION_COMBAT:()=>(found('COMBAT')||/combat|attack|전투|공격/i.test(designText))
      &&(found('MOTION')||designDemand.MOTION),
    CRAFT_ECONOMY_INVENTORY:()=>(found('CRAFTING')||designDemand.CRAFTING)
      &&(found('ECONOMY')||designDemand.ECONOMY),
    FARMING_WORLD_WEATHER:()=>(found('FARMING')||designDemand.FARMING)
      &&(found('WEATHER')||designDemand.WEATHER),
    SKILL_VFX_AUDIO:()=>found('SKILL_VFX')||designDemand.SKILL_VFX
  });
  const moduleConnections=Object.freeze(connectionSpecs.filter(([id,roles])=>
    connectionApplies[id]()&&roles.some(key=>found(key)||designDemand[key]))
    .map(([id,roles,checks])=>Object.freeze({
      id,roles:Object.freeze(roles),
      state:roles.every(found)?'EXISTING_SOURCE_CONNECTION_CANDIDATE':'MISSING_REQUIRED_SOURCE_REVIEW',
      missingRoles:Object.freeze(roles.filter(key=>!found(key))),
      responsibleFiles:Object.freeze(uniq(roles.flatMap(key=>targets[key]||[])).slice(0,8)),
      checks:Object.freeze(checks),
      gameSourceMutationPerformed:false,passed:false,runtimeVerified:false
    })));
  const contextualUi=Object.freeze({
    combat:found('UI')&&found('COMBAT')?Object.freeze(['HEALTH_STATUS','SKILL_AND_DODGE_FROM_EXISTING_BINDINGS','DANGER_FEEDBACK']):Object.freeze([]),
    lobby:found('UI')&&found('LOBBY')?Object.freeze(['EXISTING_GAME_ENTRY','PARTY_SHOP_PORTAL_ONLY_WHEN_IMPLEMENTED']):Object.freeze([]),
    inventory:found('UI')&&found('INVENTORY')?Object.freeze(['OWNED_ITEM_LIST','COMPARE_EQUIP_ONLY_WHEN_IMPLEMENTED','SCROLL_CLOSE_REOPEN']):Object.freeze([]),
    mobile:['SAFE_AREA','TOUCH_TARGET_CLEARANCE','NO_OVERLAPPING_ACTIONS','MODAL_INPUT_CONSUMED','LANDSCAPE_PORTRAIT_REVIEW'],
    noDeadButtons:true,noSyntheticGameplayActions:true,
    resizeValidationState:'RUNTIME_VIEWPORT_QA_PENDING'
  });
  const worldGraph=Object.freeze({
    enabled:found('WORLD')||found('BIOME'),
    nodesDiscoveredFromExactRuntime:false,
    sourceFiles:targets.WORLD,
    biomeSourceFiles:targets.BIOME,
    housingSourceFiles:targets.HOUSING,
    biomeNativeSceneBindingVerified:false,
    housingPlacementPersistenceVerified:false,
    entryFiles:targets.LOBBY,
    interactionFiles:targets.INTERACTION,
    edges:found('WORLD')&&found('LOBBY')?[Object.freeze({
      from:'EXISTING_ENTRY',to:'EXISTING_WORLD_DESTINATION',
      sourceEvidence:targets.WORLD[0],state:'SOURCE_ROUTE_CANDIDATE_NOT_WALKABILITY_PROOF'
    })]:[],
    requiredChecks:[
      'SPAWN_TO_EXISTING_DESTINATIONS','PORTAL_OR_DOOR_SERVER_AUTHORITY','RETURN_PATH','BLOCKED_PATH','RESPAWN_ROUTE',
      ...(found('BIOME')?['APPROVED_BIOME_TO_NATIVE_TERRAIN','REGION_NAVIGATION_AND_COLLISION','MOBILE_WORLD_STREAMING']:[]),
      ...(found('HOUSING')?['BUILD_PLACEMENT_COLLISION','OWNER_COST_INVENTORY_AUTHORITY','HOUSING_SAVE_REJOIN']:[])
    ],
    inaccessibleAreasNotInvented:true,runtimeTraversalVerified:false
  });
  const steps=[
    ['ACQUIRE',found('REWARD')||found('INTERACTION'),[...targets.REWARD,...targets.INTERACTION]],
    ['STORE',found('INVENTORY'),targets.INVENTORY],
    ['EQUIP',found('EQUIPMENT'),targets.EQUIPMENT],
    ['STAT_AND_APPEARANCE',found('EQUIPMENT')&&found('CUSTOMIZATION'),[...targets.EQUIPMENT,...targets.CUSTOMIZATION]],
    ['SAVE',found('SAVE'),targets.SAVE],
    ['RECONNECT_RESTORE',found('SAVE')&&found('INVENTORY'),[...targets.SAVE,...targets.INVENTORY]]
  ];
  const stateChain=Object.freeze({
    applicable:found('INVENTORY'),
    checks:steps.map(([id,exists,files])=>Object.freeze({
      id,state:exists?'SOURCE_SIGNATURE_FOUND_QA_PENDING':'MISSING_SOURCE_EVIDENCE',
      responsibleFiles:Object.freeze(uniq(files).slice(0,5)),passed:false
    })),
    needsAuthoritativeInventoryState:true,
    preserveSaveSchema:true,preserveEconomyAndCombatRules:true,
    runtimeVerified:false,qaPassed:false
  });
  return Object.freeze({
    version:1,gameId:clean(gameId),platform:clean(platform).toUpperCase(),
    sourceTreeFingerprint:clean(sourceObservation?.sourceTreeFingerprint)||null,
    sourceOnlyEvidence:true,applicableGameFeaturesOnly:true,
    components:Object.freeze(components),sourceFilesByRole:Object.freeze(targets),
    uiModeSelection:contextualUi,worldGraph,stateChain,moduleConnections,
    sharedAssetSelection:Object.freeze({
      registry:'company-asset-library.json',archives:'assets/asset-manifest.json#sharedOriginalArchives',
      ui:'assets/roblox/common-ui-v1/catalog.json',
      materials:'assets/roblox/common-materials-v1/catalog.json',
      equipment:'assets/roblox/common-character-gear-v1/catalog.json',
      originalAssetsOnly:true,sourceHashAndLicenseRequired:true,
      noNewAssetGeneration:true,roleAndTargetCompatibilityRequired:true,
      gameBindingAndNativeRuntimeQaRequired:true
    }),
    editRule:'EDIT_EXISTING_RESPONSIBLE_GAME_FILES_ONLY',
    requiredProof:[
      'SOURCE_ANCHOR','EXISTING_GAME_STATE','REAL_EVENT_HANDLER','SERVER_AUTHORITY_WHERE_APPLICABLE','NATIVE_PLATFORM_AND_MOBILE_QA',
      ...(found('MOTION')||found('ACTION')?['MOTION_ACTION_SAME_APPROVED_HIT_EVENT']:[]),
      ...(found('CUSTOMIZATION')?['ACTUAL_CHARACTER_MODEL_AND_SAVE_RESTORE']:[])
    ],
    implementationProven:false,runtimeVerified:false,passed:false
  });
}

export function playerFacingInspectionPromptLines(contract={}, {focus='',generation=1}={}){
  const cases=Array.isArray(contract.cases)?contract.cases:[];
  if(!cases.length)return[];
  const impact=({PRESENTATION:'GRAPHICS',USABILITY:'UI',PROGRESSION:'MAP',CORE_FUN:'GAMEPLAY',STABILITY:'SAVE'})[clean(focus).toUpperCase()];
  const applicable=cases.filter(row=>row.applicability!=='REVIEW_NOT_APPLICABLE_REASON');
  const preferred=applicable.filter(row=>row.impact===impact);
  const pool=preferred.length?preferred:applicable;
  const start=(Math.max(1,Number(generation)||1)-1)%Math.max(1,pool.length);
  const selected=pool.length?[pool[start],...(pool.length>1?[pool[(start+1)%pool.length]]:[])]:[];
  const lines=[];
  for(let i=0;i<cases.length;i+=5){
    const batch=cases.slice(i,i+5);
    lines.push('inspectionIndex='+batch.map(row=>row.id+':'+row.applicability).join('|'));
    lines.push('inspectionRemoteMatrix='+batch.map(row=>row.id+':'+(row.remoteAssertions||[]).join('/')).join('|'));
  }
  return[
    'inspectionContract=EVERY_CYCLE; REMOTE_AUTOMATED_F0_F9_AND_INDEPENDENT_QA_ONLY; LOCAL_MANUAL_INSPECTION_NOT_REQUIRED; CHECKLIST_NOT_EXECUTED; QUALITY_UNVERIFIED; inspect all applicable surfaces, expand current details from playerFacingInspectionContract; not-applicable needs design/source reason.',
    ...lines,
    'inspectionEvidence=EXACT_GAME_SOURCE_TREE_ARTIFACT_VERSION_SCENE_VIEWPORT_INPUT_STATE_CAPTURE_SHA256_REMOTE_RUN_STAGE_NEGATIVE_CASE_FINDING_OWNER_RETEST; compare same scene before/after; motion needs timed frames. Thumbnail/transport/static QA/counts never prove visual quality.',
    'inspectionRule=Use centrally allowed observation only. Missing exact render stays UNVERIFIED, not an invented defect/PASS. Reproduce real failure, repair existing owner, run impact QA, rebuild/replay same scene; preserve save/balance/server authority.',
    ...selected.flatMap(row=>[
      'inspectionScene='+row.id+':'+row.scene,
      'inspectionFailure='+row.id+':'+row.failureCriteria,
      'inspectionOwner='+row.id+':'+row.responsibility,
      'inspectionRetest='+row.id+':'+row.retest,
      'inspectionRemoteChecks='+row.id+':'+(row.remoteAssertions||[]).join(',')+'; result=UNVERIFIED_UNTIL_EXACT_REMOTE_PROOF'
    ])
  ];
}

function buildVisualDirective({gameId,design,source,focus,platform}){
  const identity=design.identity||gameId;
  const anchor=primaryDesignAnchor(design);
  const second=secondaryDesignAnchor(design);
  const placeholderHeavy=Number(source?.signals?.primitive||0)>8;
  return{
    // 빌드업 공통 최적화: 게임별 책임 소스에서 네 축을 함께 처리한다.
    nativeOptimization:clean(platform).toUpperCase()==='ROBLOX'?{
      enabled:true,trigger:'F0_AND_EVERY_BUILD_UP',
      axes:['RIGGING','MATERIALS','PHYSICS','COLLISION'],
      preserveExistingImplementation:false,
      existingModelRigAndCollisionGeometryReplacementAllowed:true,
      rigging:['REMOVE_UNUSED_JOINTS_ONLY_AFTER_BINDING_AUDIT','REUSE_OR_RETARGET_COMPATIBLE_MOTION','CACHE_JOINT_AND_BONE_LOOKUPS','DISTANCE_BASED_PRESENTATION_UPDATES'],
      materials:['REUSE_SHARED_MATERIALS','LIMIT_MATERIAL_VARIANTS','PRESERVE_CC0_PROVENANCE','NO_DECORATIVE_STUD_PARTS'],
      physics:['ANCHOR_STATIC_WORLD','MASSLESS_NONCOLLIDING_VISUALS','NO_REDUNDANT_CONSTRAINTS','SERVER_OWNED_GAMEPLAY'],
      collision:['SIMPLE_GAMEPLAY_COLLIDERS','ROLE_BASED_COLLISION_GROUPS','DISABLE_UNUSED_TOUCH_AND_QUERY','VERIFY_GROUND_AND_INTERACTION_QUERIES'],
      mobile:['NO_EXTRA_DECORATION_PARTS','NO_PER_FRAME_DESCENDANT_SCANS','BOUNDED_EFFECTS_AND_CONNECTIONS'],
      sourceTreeFingerprint:source?.sourceTreeFingerprint||null,
      evidence:['EXACT_BUILD_MOTION','GROUND_CONTACT','HIT_AND_INTERACTION','MOBILE_FRAME_AND_PART_BUDGET'],
      runtimeVerified:false
    }:null,
    primitiveReplacement:clean(platform).toUpperCase()==='ROBLOX'?{
      enabled:true,trigger:'F0_AND_EVERY_BUILD_UP',
      action:'REPLACE_VISIBLE_PRIMITIVES_WITH_VERIFIED_CC0_DERIVATIVES',
      preservePrimitiveAppearance:false,visiblePrimitiveFallbackAllowed:false,
      selectionMode:'NEAREST_SIMILAR_COMPATIBLE_CC0',exactVisualMatchRequired:false,
      waitForExactAssetForbidden:true,adaptation:['SCALE','COLOR','MATERIAL','RIG_COMPATIBLE_MOTION'],
      sourceTreeFingerprint:source?.sourceTreeFingerprint||null,
      sourceFiles:source?.primitiveSourceFiles||[],
      missingAssetAction:'EXISTING_ASSET_DEVELOPMENT_GAP',
      supportGeometryReplacementAllowed:true,
      protectedSupports:['INVISIBLE_COLLISION','HITBOX','RIG_ROOT','SPAWN','GAMEPLAY_TRIGGER'],
      preserve:['SAVE','BALANCE','SERVER_AUTHORITY','ANIMATION_EVENT_TIMING'],
      runtimeVerified:false
    }:null,
    artDirection:{
      identity,
      visualPurpose:`${identity}의 플레이 판단과 ${anchor}가 화면만 보고도 구별되도록 시각 언어를 통일한다.`,
      distinctnessRule:`${second}와 연결되지 않는 장식 추가보다 실루엣·동작·환경 맥락으로 게임 고유성을 강화한다.`,
      placeholderDebt:placeholderHeavy?'HIGH':'EVALUATE_AND_REPLACE_WHEN_VISIBLE',
      libraryRenewal:'기존 게임의 자산 적용 여부를 품질 합격으로 간주하지 않는다. 현재 화면의 캐릭터·몬스터·건물·가구·식생·음원·UI와 로비를 게임 설계 기준으로 다시 검토하고 낮은 품질 축은 교체한다. 품질 좋은 내부 범용 원본을 우선 선택해 원본을 보존하고 별도 플랫폼 파생본을 만든다. 공간 모델은 실제 메시·리그·재질·모션과 업로드 ID를 연결하고, 음원은 기존 오디오 처리 경로를 사용한다. 단순 부품 재조합만으로 최종 품질을 주장하지 않는다.',
      lobbyRenewal:'로비가 있는 게임은 기존 진입·파티·상점·포탈 기능과 저장·서버 권한을 보존하면서 현재 게임 컨셉에 맞게 시야·동선·상호작용 구역·배경을 재구성한다. 로비가 없는 게임에 새 로비를 강제하지 않는다. 실제 전후 화면·모바일 조작·접지·실행 확인 후에만 품질 통과로 기록한다.'
    },
    domains:{
      CHARACTER:`${identity} 플레이어의 역할이 실루엣·장비·자세에서 읽히게 만들고 idle/이동/핵심행동 사이 포즈 차이를 명확히 한다.`,
      ENEMY_CREATURE:`${anchor}의 상대 역할마다 색만 바꾸지 말고 크기·실루엣·이동 리듬·공격 전조·피격/사망 반응을 다르게 만든다.`,
      WEAPON_EQUIPMENT:`장비가 실제 기능과 연결되어 손에 쥔 형태, 공격 궤적, impact/recovery, 장착 피드백이 서로 일치하게 만든다.`,
      BUILDING_PROP:`상호작용 가능한 구조물과 장식물을 형태·배치·상태 변화로 구분하고 플레이 동선을 가리는 무의미한 소품 반복을 피한다.`,
      ENVIRONMENT_TERRAIN:`${identity}의 세계 역할을 지역별 지형·랜드마크·전경/중경/후경·높낮이·환경 움직임으로 구분한다.`,
      MATERIAL_SURFACE:`나무/돌/금속 등 이름 등록만 하지 말고 실제 표면 반응·거칠기·광택·마모·발광을 장면 조명과 맞춘다.`,
      PALETTE:`위험·안전·보상·상호작용 상태가 게임 팔레트 안에서 즉시 읽히게 하고 단순 색 교체를 정체성 개선으로 계산하지 않는다.`,
      LIGHTING:`핵심 동선·위험·랜드마크를 조명으로 유도하고 캐릭터와 적 실루엣이 배경에 묻히지 않게 한다.`,
      ANIMATION:`주요 액션을 ANTICIPATION→ACCELERATION→IMPACT→RECOVERY로 구성하고 idle/walk/run/attack/hit/death 전환을 실제 상태에 연결한다.`,
      SECONDARY_MOTION:`무기·장비·머리·의상·식생 등 해당 오브젝트에 지연/흔들림을 추가하되 판정과 충돌 권한은 바꾸지 않는다.`,
      VFX:`일반 타격·강한 타격·위험 예고·상태이상·보상 VFX의 형태와 타이밍을 분리하고 실제 impact 이벤트에 동기화한다.`,
      CAMERA:`기본 시야와 모바일 가독성을 보존하면서 핵심행동·강공격·보스/시그니처 순간에 강도가 다른 짧은 카메라 반응을 준다.`,
      UI_HUD:`${identity}의 핵심 목표·자원·위험·다음 선택이 한눈에 보이게 하고 게임 세계관과 맞는 패널/아이콘/피드백 언어를 사용한다.`,
      INVENTORY_EQUIPMENT_UI:`인벤토리와 장비 UI는 획득→비교→장착/교체→현재 장착 표시→실제 외형/행동 반영까지 같은 상태를 사용하고 모바일에서도 한 손 조작과 스크롤/닫기/선택 유지가 명확해야 한다.`,
      AUDIO_MUSIC:`BGM·환경음·행동 피드백은 현재 지역/상태/전투 강도와 연결하고, 소리가 의도적으로 비활성화된 카테고리는 되살리지 않는다. 여러 음악 맥락이 있으면 같은 한 곡 단순 반복 대신 전환·크로스페이드·믹스 변화로 상태가 들리게 한다.`,
      AUDIO_VISUAL_SYNC:`damage/VFX/animation/camera/audio가 같은 authoritative impact 순간을 공유하게 하며 소리만 먼저/늦게 나오는 불일치를 제거한다.`,
      ENVIRONMENTAL_MOTION:`정적인 배경을 피하고 식생·빛·파티클·기계/건축 요소 중 세계에 맞는 미세 움직임을 지속시킨다.`,
      SCENE_DENSITY:`빈 공간과 반복 오브젝트 밀도를 실제 플레이 동선 기준으로 조정하고 중요 영역에는 의미 있는 시각 정보가 있게 한다.`,
      LANDMARK_READABILITY:`플레이어가 지도 없이도 방향과 지역 역할을 기억할 수 있는 실루엣이 다른 랜드마크를 유지·강화한다.`
    },
    requiredActorStates:['IDLE','LOCOMOTION','ATTACK_ANTICIPATION','IMPACT','RECOVERY','HIT_REACTION','DEATH'],
    completionRules:[
      'ACTUAL_RENDERED_CHANGE_REQUIRED',
      'MARKER_CONFIG_ATOM_ONLY_FORBIDDEN',
      'COLOR_ONLY_NOT_FULL_IDENTITY_UPGRADE',
      'PRIMARY_PLACEHOLDER_PRIMITIVE_CANNOT_CLOSE_VISUAL_BUILD_UP',
      'UI_INVENTORY_AUDIO_MOTION_PRESENCE_ALONE_CANNOT_CLOSE_BUILD_UP',
      'BEFORE_AFTER_COMPARISON_REQUIRED',
      'SAME_SCENE_RUNTIME_REOBSERVATION_REQUIRED'
    ],
    focus
  };
}

function buildExperienceBuildupContract({platform='COMMON',design={},source={},focus='CORE_FUN'}={}){
  const requested=clean(platform).toUpperCase();
  const platformKey=requested==='UNITY_WEB'?'WEB':requested==='UNITY_APP'?'UNITY':requested==='ROBLOX'?'ROBLOX':requested==='UNITY'?'UNITY':requested==='WEB'?'WEB':'COMMON';
  const profile=PLATFORM_EXPERIENCE_PROFILES[platformKey]||PLATFORM_EXPERIENCE_PROFILES.COMMON;
  const signals=source?.signals||{};
  const trackStatus={
    MOTION_AND_ACTING:Number(signals.animation||0)>=2&&Number(signals.motionStates||0)>=5?'PRESENT':'WEAK_OR_MISSING',
    COMBAT_AND_PRIMARY_ACTION_FEEL:Number(signals.gameFeel||0)>=3?'PRESENT':'WEAK_OR_MISSING',
    UI_HUD_AND_MENU:Number(signals.ui||0)>=4&&Number(signals.uiFlow||0)>=2?'PRESENT':'WEAK_OR_MISSING',
    INVENTORY_AND_EQUIPMENT:Number(signals.inventory||0)>0
      ?(Number(signals.inventory||0)>=5&&Number(signals.equipment||0)>=2?'PRESENT':'WEAK_OR_MISSING')
      :'NOT_APPLICABLE_UNTIL_GAME_HAS_INVENTORY',
    AUDIO_MUSIC_AND_FEEDBACK:Number(signals.audio||0)>=2&&Number(signals.audioDynamics||0)>=2?'PRESENT':'WEAK_OR_MISSING',
    VFX_CAMERA_AND_IMPACT_SYNC:Number(signals.vfx||0)>=2&&Number(signals.camera||0)>=1&&Number(signals.feedback||0)>=2?'PRESENT':'WEAK_OR_MISSING',
    WORLD_VISUAL_COHESION:Number(signals.map||0)>=3&&Number(signals.lighting||0)>=2?'PRESENT':'WEAK_OR_MISSING',
    MOBILE_TOUCH_AND_ACCESSIBILITY:Number(signals.input||0)>=3&&Number(signals.settings||0)>=1?'PRESENT':'WEAK_OR_MISSING',
    PERFORMANCE_AND_RUNTIME_STABILITY:Number(signals.performance||0)>=2&&Number(signals.errorRecovery||0)>=2?'PRESENT':'WEAK_OR_MISSING'
  };
  const priorityOrder=platformKey==='ROBLOX'
    ?[
      'MOTION_AND_ACTING',
      'AUDIO_MUSIC_AND_FEEDBACK',
      'COMBAT_AND_PRIMARY_ACTION_FEEL',
      'UI_HUD_AND_MENU',
      'INVENTORY_AND_EQUIPMENT',
      'VFX_CAMERA_AND_IMPACT_SYNC',
      'WORLD_VISUAL_COHESION',
      'MOBILE_TOUCH_AND_ACCESSIBILITY',
      'PERFORMANCE_AND_RUNTIME_STABILITY'
    ]
    :EXPERIENCE_BUILD_UP_TRACKS;
  const weakest=priorityOrder
    .filter(track=>trackStatus[track]==='WEAK_OR_MISSING')
    .slice(0,Math.max(1,Number(profile.weakestTrackBatchSize||PLATFORM_EXPERIENCE_PROFILES.COMMON.weakestTrackBatchSize||3)));
  const commonRules=Object.freeze([
    'AUDIT_ALL_APPLICABLE_PLAYER_FACING_TRACKS_EVERY_GENERATION',
    'RANK_AND_BUILD_THE_WEAKEST_THREE_BEFORE_ADDING_DECORATIVE_EXTRAS',
    'PRESENCE_OR_MARKER_ONLY_CANNOT_PASS_QUALITY',
    'IMPLEMENT_IN_THE_EXISTING_RESPONSIBLE_SYSTEM_NOT_A_SHADOW_WRAPPER',
    'COMPARE_BEFORE_AFTER_UNDER_THE_SAME_SCENE_INPUT_AND_STATE',
    'VERIFY_INPUT_TO_STATE_TO_MOTION_UI_AUDIO_VFX_CAMERA_FEEDBACK_CAUSALITY',
    'PRESERVE_GAMEPLAY_BALANCE_SAVE_ECONOMY_AND_NETWORK_AUTHORITY',
    'OWNER_INTENTIONALLY_DISABLED_AUDIO_CATEGORIES_MUST_REMAIN_DISABLED',
    'REPEAT_BUILD_UP_UNTIL_NO_CRITICAL_PLAYER_FACING_TRACK_GAP_REMAINS'
  ]);
  const robloxExtra=platformKey==='ROBLOX'?Object.freeze({
    priority:'EXTRA_ATTENTION',
    motion:Object.freeze({
      articulatedActorsRequireJointMotion:true,
      animatorMotor6dOrBonesRequiredWhenApplicable:true,
      rootOnlyLocomotionCannotPass:true,
      requiredStateIntent:Object.freeze(['IDLE','WALK','JOG','RUN','START','STOP','TURN','JUMP','LAND','ATTACK_ANTICIPATION','IMPACT','RECOVERY','HIT_REACTION','DEATH']),
      blendAndSpeedSyncRequired:true,
      weightShiftAndSecondaryMotionRequired:true,
      ikOrProceduralGroundingPreferred:true
    }),
    uiAndInventory:Object.freeze({
      touchFirst:true,
      minimumTouchTargetPxEquivalent:44,
      safeAreaRequired:true,
      modalStackBackCloseScrollSelectionPersistenceRequired:true,
      inventoryFlowWhenApplicable:Object.freeze(['ACQUIRE','COMPARE','SELECT','EQUIP','UNEQUIP_OR_REPLACE','CURRENT_EQUIPPED_INDICATOR','WORLD_OR_CHARACTER_FEEDBACK'])
    }),
    audio:Object.freeze({
      ownerDisabledCategoriesPreserved:true,
      soundServiceLifecycleRequired:true,
      soundGroupMixingPreferred:true,
      spatialWorldAudioUsesRolloffWhenApplicable:true,
      bgmRegionStateCombatTransitionsRequiredWhenMultipleContextsExist:true,
      duplicatePlaybackOnRespawnOrResumeForbidden:true,
      singleLoopAcrossDistinctContextsCannotClaimMusicBuildUp:true
    }),
    runtimeEvidence:Object.freeze({
      officialStudioMcpRequired:false,
      localManualInspectionRequired:false,
      existingF0F9AndIndependentQaRequired:true,
      exactPrivateCandidateRemoteEvidenceRequired:true,
      exactPublishedPlaceVersionQaRequired:true,
      cloudThumbnailMetadataCannotProveRenderedScene:true,
      optionalStudioCaptureCannotReplaceCanonicalEvidence:true,
      actualInputRequired:true,
      beforeAfterCaptureRequired:true,
      mobileViewportRequired:true,
      runtimeStateObservationRequired:true,
      sourceMarkersAloneCannotPass:true
    })
  }):null;
  const webExtra=platformKey==='WEB'?Object.freeze({
    runtimeEvidence:'REAL_BROWSER_TOUCH_AND_RENDER_DELTA',
    audio:'WEBAUDIO_OR_NATIVE_MEDIA_STATE_TRANSITION_WHEN_APPLICABLE',
    ui:'SAFE_AREA_SCROLL_MODAL_AND_TOUCH_FLOW',
    motion:'VISIBLE_FRAME_DELTA_NOT_ONLY_INTERNAL_STATE'
  }):null;
  const unityExtra=platformKey==='UNITY'?Object.freeze({
    runtimeEvidence:'UNITY_EDITOR_PLUS_ANDROID_WHEN_MOBILE_TARGET',
    motion:'ANIMATOR_BLENDTREE_OR_EQUIVALENT_WITH_STATE_TRANSITIONS',
    audio:'AUDIOMIXER_OR_EQUIVALENT_MIX_AND_SPATIALIZATION_WHEN_APPLICABLE',
    ui:'CANVAS_SAFE_AREA_MENU_STACK_AND_INVENTORY_FLOW',
    performance:'MOBILE_FRAME_MEMORY_THERMAL_BUDGET'
  }):null;
  return Object.freeze({
    version:1,
    status:'ACTIVE_EXECUTABLE_BUILD_UP_CONTRACT',
    platform:platformKey,
    focus,
    attention:profile.attention||PLATFORM_EXPERIENCE_PROFILES.COMMON.attention,
    tracks:Object.freeze(EXPERIENCE_BUILD_UP_TRACKS.map(track=>Object.freeze({track,status:trackStatus[track]}))),
    priorityOrder:Object.freeze([...priorityOrder]),
    weakestTracks:Object.freeze(weakest),
    loop:Object.freeze([
      'OBSERVE_CURRENT_RUNTIME_AND_PLAYER_FLOW',
      'RANK_WEAKEST_APPLICABLE_TRACKS',
      'IMPLEMENT_EXISTING_RESPONSIBLE_SYSTEMS_DIRECTLY',
      'REPLAY_REAL_INPUTS_AND_CAPTURE_SAME_SCENE_BEFORE_AFTER',
      'VERIFY_PLAYER_FACING_EFFECT_AND_NO_SEMANTIC_REGRESSION',
      'PROMOTE_VERIFIED_BASELINE_OR_REPEAT'
    ]),
    commonRules,
    platformProfile:profile,
    robloxExtra,
    webExtra,
    unityExtra,
    ownerLocks:Object.freeze({
      gameplayBalanceSaveEconomyNetworkMeaningPreserved:true,
      intentionallyDisabledAudioCategoriesPreserved:true
    }),
    designIdentity:clean(design.identity)||null
  });
}

const AUTONOMOUS_EXPANSION_THEMES=Object.freeze([
  Object.freeze({
    id:'WORLD_ECOLOGY_STORY_CHAIN',
    domains:Object.freeze(['MAP_EXPANSION','REGIONS','WORLD_DENSITY','LANDMARKS','CONTENT_DISCOVERY','SPAWN_ENCOUNTER_DIRECTOR','NARRATIVE_STORY','NPC_SOCIAL_BEHAVIOR']),
    focuses:Object.freeze(['PROGRESSION','PRESENTATION','CORE_FUN']),
    bundle:Object.freeze([
      'BACKGROUND_ENVIRONMENT_IDENTITY: 배경·지형·조명·소품이 지역 역할과 세계 분위기를 설명해야 한다.',
      'REGION_TOPOLOGY_AND_LANDMARK: 기존 지역과 이어지는 진입 경로·랜드마크·우회/잠금 경로를 만든다.',
      'REGION_NATIVE_ENCOUNTER: 그 장소에 존재할 이유가 있는 몬스터/적/상호작용 역할과 서로 다른 행동 패턴을 만든다.',
      'REGION_RESOURCE_OR_ITEM: 지역 고유 자원·아이템·장비·보상이 탐험이나 전투 선택에 실제 의미를 갖게 한다.',
      'QUEST_EVENT_REASON_TO_ENTER: 플레이어가 왜 지금 이 지역에 가는지 목표·퀘스트·사건과 연결한다.',
      'STORY_AND_WORLD_CAUSALITY: 환경 단서·NPC·적·보상·지역 변화가 같은 세계 원인과 결과를 공유하게 한다.',
      'REGION_RULE_OR_HAZARD: 지형·날씨·시간·위험·상태·접근 조건 중 게임에 맞는 규칙을 플레이 선택과 연결한다.',
      'RETURN_OR_FORWARD_CONNECTION: 기존 지역으로 돌아올 이유 또는 다음 지역·보스·해금으로 이어지는 결과를 남긴다.'
    ])
  }),
  Object.freeze({
    id:'ENEMY_BOSS_COMBAT_ECOLOGY',
    domains:Object.freeze(['ENEMY_AI','BOSS_AND_SIGNATURE_MOMENTS','CONTENT_VARIETY','GAME_FEEL','SPAWN_ENCOUNTER_DIRECTOR','DIFFICULTY_PACING','ENEMY_VISUALS']),
    focuses:Object.freeze(['CORE_FUN','PRESENTATION']),
    bundle:Object.freeze([
      'ENEMY_ROLE_SET: 추격·견제·방어·지원·매복·지역 통제 등 서로 다른 전투 역할을 만든다.',
      'BEHAVIOR_AND_COUNTERPLAY: 이름·HP·공격력만 다른 적이 아니라 이동·전조·공격·약점·대응 선택이 달라야 한다.',
      'ENCOUNTER_COMPOSITION: 적 역할 조합과 지형·목표가 만나 새로운 판단을 만들게 한다.',
      'ELITE_OR_BOSS_SIGNATURE: 보스·엘리트는 페이즈·공간 압박·전조·대응·보상 중 여러 축에서 일반 적과 구별한다.',
      'ECOLOGICAL_WORLD_REASON: 적이 해당 지역·스토리·자원·세력 관계 안에 존재하는 이유를 연결한다.',
      'DISTINCT_REWARD_PURPOSE: 처치 보상은 다음 장비·퀘스트·제작·지역 해금 중 실제 목적을 가진다.',
      'VISUAL_TELEGRAPH: 실루엣·모션·VFX·음향·UI 전조가 행동 규칙과 일치해야 한다.'
    ])
  }),
  Object.freeze({
    id:'QUEST_STORY_PROGRESSION_CHAIN',
    domains:Object.freeze(['QUESTS','NARRATIVE_STORY','GOALS','REWARDS','UNLOCKS','PROGRESSION','NPC_SOCIAL_BEHAVIOR','CONTENT_DISCOVERY']),
    focuses:Object.freeze(['PROGRESSION','CORE_FUN']),
    bundle:Object.freeze([
      'WORLD_REASON: 퀘스트가 세계 상황·NPC 역할·지역 변화에서 자연스럽게 발생해야 한다.',
      'DISTINCT_OBJECTIVE_STRUCTURE: 단순 수집·처치 숫자 복제 대신 탐색·선택·방어·추적·전투·상호작용을 게임에 맞게 변주한다.',
      'STATEFUL_PROGRESS: 진행 단계와 선행·후속 상태가 실제 게임 상태에 연결되어야 한다.',
      'MEANINGFUL_REWARD: 보상은 다음 행동·지역·장비·능력·정보를 열어 플레이 선택을 넓혀야 한다.',
      'FOLLOWUP_CONSEQUENCE: 완료 결과가 NPC·지역·이벤트·후속 퀘스트 또는 시스템 상태에 반영되어야 한다.',
      'LORE_THROUGH_PLAY: 긴 설명만 추가하지 말고 플레이 행동·환경·대사·결과로 세계관을 보여준다.',
      'CHAIN_PACING: 초반→중반→후반의 목표 복잡도와 위험·보상 상승이 갑자기 튀지 않게 이어진다.'
    ])
  }),
  Object.freeze({
    id:'ITEM_EQUIPMENT_CRAFT_SYSTEM_CHAIN',
    domains:Object.freeze(['INVENTORY','INVENTORY_USABILITY','EQUIPMENT_LOADOUT','CRAFTING','ECONOMY','REWARDS','SYSTEM_CONNECTION','WEAPONS_AND_EQUIPMENT']),
    focuses:Object.freeze(['PROGRESSION','USABILITY','CORE_FUN']),
    bundle:Object.freeze([
      'SOURCE_AND_DISCOVERY: 아이템이 어디서 왜 나오는지 지역·몹·퀘스트·제작과 연결한다.',
      'DISTINCT_USE_CASE: 데미지 숫자만 다른 복제 장비가 아니라 사거리·타이밍·상태·위험·보상·조합 역할이 달라야 한다.',
      'INVENTORY_AND_EQUIP_FLOW: 획득→비교→장착·사용→교체→피드백이 같은 authoritative 상태를 사용한다.',
      'CRAFT_OR_UPGRADE_CONNECTION: 재료·레시피·제작·강화 결과가 실제 플레이 선택을 바꾼다.',
      'PROGRESSION_PURPOSE: 아이템이 특정 지역·적·빌드·퀘스트·해금과 연결되어 성장 경로에 의미를 가진다.',
      'SYNERGY_AND_TRADEOFF: 장비·스킬·소모품 사이에 조합 또는 선택 비용이 있어 하나의 정답만 반복되지 않게 한다.',
      'WORLD_PRESENTATION: 외형·이름·설명·획득 연출이 실제 기능과 세계 설정을 일치시킨다.'
    ])
  }),
  Object.freeze({
    id:'RULES_EVENTS_REPLAYABILITY_SYSTEM',
    domains:Object.freeze(['PLAYER_AGENCY','REPLAYABILITY_VARIATION','DIFFICULTY_PACING','SPAWN_ENCOUNTER_DIRECTOR','MULTIPLAYER_AND_SYNC','FAILURE_RESPAWN_CHECKPOINTS','SYSTEM_CONNECTION']),
    focuses:Object.freeze(['CORE_FUN','PROGRESSION','STABILITY']),
    bundle:Object.freeze([
      'DERIVED_GAMEPLAY_RULE: 승인된 기존 규칙을 깨지 않으면서 환경·적 관계·아이템 조합·퀘스트 상태·지역 접근 같은 새 상호작용 규칙을 만든다.',
      'TRIGGER_CONDITION: 규칙이 언제 발동하고 언제 끝나는지 명확히 한다.',
      'PLAYER_DECISION_EFFECT: 규칙이 실제 선택·위험·경로·장비·협동 방식 중 하나 이상을 바꾸게 한다.',
      'EVENT_VARIATION: 랜덤 숫자만 바꾸지 말고 조우·목표·경로·보상 구조를 변주한다.',
      'FAILURE_AND_RECOVERY: 실패 시 손실·복구·재도전이 이해 가능하고 진행을 무의미하게 되감지 않게 한다.',
      'MULTIPLAYER_INTERACTION_WHEN_APPLICABLE: 협동·경쟁이면 역할 분담·권한·동기화·보상 규칙을 실제 2인 이상 상태와 연결한다.',
      'SYSTEM_CONSEQUENCE: 규칙 결과가 퀘스트·지역·보상·NPC·다음 세션 중 관련 시스템에 남는다.'
    ])
  }),
  Object.freeze({
    id:'MID_LATE_ENDGAME_COMPLETION',
    domains:Object.freeze(['MID_LATE_GAME_DEPTH','PROGRESSION','UNLOCKS','BOSS_AND_SIGNATURE_MOMENTS','MAP_EXPANSION','CONTENT_VARIETY','ANTI_GRIND','REPLAYABILITY_VARIATION']),
    focuses:Object.freeze(['PROGRESSION','CORE_FUN']),
    bundle:Object.freeze([
      'MIDGAME_TRANSITION: 초반에 배운 행동을 새로운 적·지역·장비 조합·목표 압박으로 재해석한다.',
      'LATEGAME_SYSTEM_CONNECTION: 중후반은 수치만 커지지 않고 여러 시스템을 함께 사용하도록 깊어진다.',
      'SIGNATURE_CHALLENGE: 고유 보스·던전·습격·이벤트 등 게임 정체성을 압축한 고난도 목표를 만든다.',
      'MEANINGFUL_UNLOCK: 새 지역·능력·장비·전략·루트 중 플레이 방식을 실제로 넓히는 보상을 연결한다.',
      'ENDGAME_OR_LONG_TERM_GOAL: 완주 이후 반복 가치가 필요한 게임이면 변주·선택·도전 목표를 만든다.',
      'ANTI_GRIND_VARIATION: 반복 횟수만 늘리는 대신 새로운 조합·위험·경로·단축·선택이 주기적으로 열린다.',
      'EARLY_CONTENT_RELEVANCE: 후반 확장이 기존 지역·재료·시스템 일부를 다시 의미 있게 사용할 이유를 남긴다.'
    ])
  }),
  Object.freeze({
    id:'PRESENTATION_WORLD_COHESION',
    domains:Object.freeze(['ENVIRONMENT','TERRAIN','LIGHTING','ANIMATION','VFX','CHARACTER_VISUALS','ENEMY_VISUALS','UI_HUD','AUDIO_VISUAL_TIMING','ENVIRONMENTAL_MOTION']),
    focuses:Object.freeze(['PRESENTATION','USABILITY']),
    bundle:Object.freeze([
      'BACKGROUND_DEPTH: 전경·중경·후경·지형·랜드마크로 빈 무대 느낌을 줄이고 장소의 기능을 읽게 한다.',
      'CHARACTER_AND_ENEMY_IDENTITY: 역할과 위험도가 실루엣·자세·모션·재질에서 구별되어야 한다.',
      'ACTION_TIMELINE: anticipation→impact→recovery와 VFX·카메라·오디오·판정을 같은 사건에 동기화한다.',
      'ENVIRONMENTAL_MOTION: 식생·물·빛·먼지·기계 등 세계에 맞는 움직임으로 정적인 배경을 줄인다.',
      'STATE_READABILITY: 위험·보상·상호작용·퀘스트 상태를 UI와 월드 표현에서 같은 언어로 보여준다.',
      'REGION_COHESION: 배경·몹·아이템·스토리·규칙의 시각적 이유가 같은 지역 정체성을 공유한다.',
      'PERFORMANCE_BUDGET: 표현을 늘리면서 모바일·플랫폼별 객체·파티클·조명·메모리 비용을 같이 관리한다.'
    ])
  })
]);

function autonomousContentExpansionPolicy(repoRoot=process.cwd()){
  const loaded=readJson(path.join(repoRoot,AUTONOMOUS_CONTENT_EXPANSION_POLICY_PATH),null);
  if(loaded?.status==='ACTIVE'&&clean(loaded?.scope?.lifecycle)==='EXISTING_BUILD_UP_ONLY')return loaded;
  return AUTONOMOUS_CONTENT_EXPANSION_DEFAULT;
}

function capacityBudgetState({policy={},source={},runtimeEvidence={},platform='COMMON'}={}){
  const contract=policy?.dataCapacityBudget||AUTONOMOUS_CONTENT_EXPANSION_DEFAULT.dataCapacityBudget;
  const limits={
    savePersistedDataBytes:Number(contract?.limits?.savePersistedDataBytes||2*1024*1024),
    webDownloadBytes:Number(contract?.limits?.webDownloadBytes||100*1024*1024),
    singleFileBytes:Number(contract?.limits?.singleFileBytes||25*1024*1024),
    mobileMemoryTargetBytes:Number(contract?.limits?.mobileMemoryTargetBytes||300*1024*1024),
    mobileMinimumFps:Number(contract?.limits?.mobileMinimumFps||30)
  };
  const warningRatio=Math.min(0.95,Math.max(0.5,Number(contract?.warningRatio||0.8)));
  const requestedPlatform=clean(platform).toUpperCase()||'COMMON';
  const measured={
    sourceBytes:Math.max(0,Number(source?.sourceBytes||0)),
    largestFileBytes:Math.max(0,Number(source?.largestFileBytes||0)),
    savePersistedDataBytes:Math.max(0,Number(runtimeEvidence?.persistedDataBytes??runtimeEvidence?.saveBytes??0)),
    mobileMemoryBytes:Math.max(0,Number(runtimeEvidence?.mobileMemoryBytes??runtimeEvidence?.memoryBytes??0)),
    mobileFps:Math.max(0,Number(runtimeEvidence?.mobileFps??runtimeEvidence?.fps??0))
  };
  const exceeded=[],warning=[];
  const checkBytes=(name,value,limit)=>{
    if(!(value>0&&limit>0))return;
    if(value>limit)exceeded.push(name);
    else if(value>=limit*warningRatio)warning.push(name);
  };
  checkBytes('SAVE_AND_PERSISTED_DATA_BUDGET',measured.savePersistedDataBytes,limits.savePersistedDataBytes);
  checkBytes('SINGLE_FILE_BUDGET',measured.largestFileBytes,limits.singleFileBytes);
  if(requestedPlatform==='WEB')checkBytes('WEB_DOWNLOAD_BUDGET',measured.sourceBytes,limits.webDownloadBytes);
  checkBytes('MOBILE_MEMORY_BUDGET',measured.mobileMemoryBytes,limits.mobileMemoryTargetBytes);
  if(measured.mobileFps>0){
    if(measured.mobileFps<limits.mobileMinimumFps)exceeded.push('MOBILE_FRAME_BUDGET');
    else if(measured.mobileFps<limits.mobileMinimumFps/warningRatio)warning.push('MOBILE_FRAME_BUDGET');
  }
  const state=exceeded.length?'EXCEEDED':warning.length?'WARNING':'NORMAL';
  const strategy=state==='NORMAL'
    ?'CONTINUE_HIGHEST_VALUE_COHERENT_BUILD_UP'
    :state==='WARNING'
      ?'PREFER_REUSE_RECOMBINATION_COMPRESSION_STREAMING_POOLING_AND_EXISTING_SYSTEM_DEPTH'
      :'CAUSAL_CAPACITY_REPAIR_USING_REUSE_RECOMBINATION_COMPRESSION_STREAMING_POOLING_THEN_CONTINUE_BUILD_UP';
  return Object.freeze({
    state,
    limits:Object.freeze(limits),
    warningRatio,
    measured:Object.freeze(measured),
    warning:Object.freeze(warning),
    exceeded:Object.freeze(exceeded),
    strategy,
    generationLimit:null,
    contentCountLimit:null,
    buildUpMustContinue:true,
    protectedStateDeletionForbidden:true
  });
}

function buildAutonomousContentExpansion({
  repoRoot=process.cwd(),source={},states=[],focus='CORE_FUN',previousDirective=null,
  previousEffectiveness={},nextActionDecision={},platform='COMMON',runtimeEvidence={}
}={}){
  const policy=autonomousContentExpansionPolicy(repoRoot);
  const capacity=capacityBudgetState({policy,source,runtimeEvidence,platform});
  const stateByDomain=new Map(states.map(row=>[clean(row.domain),clean(row.state).toUpperCase()]));
  const previousExpansion=previousDirective?.autonomousContentExpansion||null;
  const previousTheme=clean(previousExpansion?.selectedTheme);
  const effectClass=clean(previousEffectiveness?.classification).toUpperCase();
  const continueSame=['REGRESSION','NO_MEANINGFUL_EFFECT','PARTIAL_EFFECT','UNKNOWN_RUNTIME_EFFECT'].includes(effectClass);
  const themeIds=AUTONOMOUS_EXPANSION_THEMES.map(theme=>theme.id);
  const previousLedger=previousExpansion?.themeCoverageLedger||{};
  const previousCounts=Object.fromEntries(themeIds.map(id=>[id,Math.max(0,Number(previousLedger?.counts?.[id]||0))]));
  let previousSequence=Array.isArray(previousLedger?.sequence)?previousLedger.sequence.map(clean).filter(id=>themeIds.includes(id)):[];
  if(!previousSequence.length&&previousTheme){
    previousSequence=[previousTheme];
    previousCounts[previousTheme]=Math.max(1,Number(previousCounts[previousTheme]||0));
  }
  const uncoveredThemes=themeIds.filter(id=>Number(previousCounts[id]||0)===0);
  const scored=AUTONOMOUS_EXPANSION_THEMES.map((theme,index)=>{
    const gapDomains=theme.domains.filter(domain=>stateByDomain.get(domain)==='GAP');
    const applicableDomains=theme.domains.filter(domain=>stateByDomain.get(domain)!=='NOT_APPLICABLE');
    const previousCount=Number(previousCounts[theme.id]||0);
    const recentlyUsed=previousSequence.slice(-2).includes(theme.id);
    let score=gapDomains.length*12+applicableDomains.length*2+(theme.focuses.includes(focus)?8:0);
    score-=previousCount*18;
    if(!continueSame&&uncoveredThemes.length&&previousCount>0)score-=140;
    if(!continueSame&&recentlyUsed)score-=55;
    if(previousTheme===theme.id)score+=continueSame?160:-100;
    if(theme.id==='WORLD_ECOLOGY_STORY_CHAIN'){if(Number(source?.signals?.map||0)<8)score+=5;if(Number(source?.signals?.content||0)<8)score+=5;}
    if(theme.id==='ENEMY_BOSS_COMBAT_ECOLOGY'&&Number(source?.signals?.ai||0)<4)score+=6;
    if(theme.id==='QUEST_STORY_PROGRESSION_CHAIN'&&Number(source?.signals?.progression||0)<8)score+=6;
    if(theme.id==='ITEM_EQUIPMENT_CRAFT_SYSTEM_CHAIN'&&Number(source?.signals?.connection||0)<3)score+=6;
    if(theme.id==='PRESENTATION_WORLD_COHESION'&&(Number(source?.signals?.animation||0)<3||Number(source?.signals?.vfx||0)<3))score+=5;
    return{theme,index,score,gapDomains,applicableDomains};
  }).sort((a,b)=>b.score-a.score||a.index-b.index);
  const selected=scored[0]||{theme:AUTONOMOUS_EXPANSION_THEMES[0],score:0,gapDomains:[],applicableDomains:[]};
  const selectedTheme=selected.theme;
  const repairFirst=clean(nextActionDecision?.action).toUpperCase()==='CAUSAL_REPAIR';
  const runtimeRepairFirst=repairFirst&&runtimeEvidence?.runtimeObserved===true&&runtimeEvidence?.runtimePassed!==true;
  const sameThemeDepth=runtimeRepairFirst
    ?Math.max(1,Number(previousExpansion?.themeDepth||1))
    :previousTheme===selectedTheme.id?Math.max(1,Number(previousExpansion?.themeDepth||1)+1):1;
  const nextCounts=runtimeRepairFirst
    ?{...previousCounts}
    :{...previousCounts,[selectedTheme.id]:Number(previousCounts[selectedTheme.id]||0)+1};
  const nextSequence=runtimeRepairFirst
    ?[...previousSequence]
    :[...previousSequence,selectedTheme.id].slice(-Math.max(14,themeIds.length*2));
  const missingAfterSelection=themeIds.filter(id=>Number(nextCounts[id]||0)===0);
  const minCoverageCount=Math.min(...themeIds.map(id=>Number(nextCounts[id]||0)));
  const leastCoveredThemes=themeIds.filter(id=>Number(nextCounts[id]||0)===minCoverageCount);
  return Object.freeze({
    version:2,
    policySource:AUTONOMOUS_CONTENT_EXPANSION_POLICY_PATH,
    policyStatus:clean(policy?.status)||'ACTIVE',
    executionBoundary:'EXISTING_BUILD_UP_ONLY',
    autonomousDecisionOwner:'VIBE',
    assistantManualIdeaDependencyForbidden:true,
    newWorkflowForbidden:true,
    newStageForbidden:true,
    ownerPromptPerExpansionForbidden:true,
    platformScope:Object.freeze([...(policy?.scope?.platforms||['WEB','ROBLOX','UNITY'])]),
    requestedPlatform:clean(platform).toUpperCase()||'COMMON',
    executionMode:repairFirst?'CAUSAL_REPAIR_FIRST_KEEP_EXPANSION_CONTEXT':'AUTONOMOUS_CONTENT_BUILD_UP',
    contentExpansionDeferredUntilRuntimeRepairPass:runtimeRepairFirst,
    themeCoverageAdvanced:!runtimeRepairFirst,
    dataCapacityBudget:capacity,
    existingCompletenessReview:Object.freeze({
      requiredEveryBuildUp:true,
      mode:'CHECK_EXISTING_AND_EXPAND_OR_IMPROVE_WHICHEVER_HAS_HIGHER_PLAYER_VALUE',
      dimensions:Object.freeze([
        'CORE_LOOP_COMPLETENESS','QUEST_AND_GOAL_FLOW','WORLD_AND_REGION_FLOW','MONSTER_ENEMY_ROLE_COVERAGE',
        'ITEM_EQUIPMENT_REWARD_PURPOSE','STORY_WORLD_CAUSALITY','GAMEPLAY_RULE_CONNECTIONS',
        'PROGRESSION_PACING','MID_LATE_ENDGAME_DEPTH','MULTIPLAYER_WHEN_APPLICABLE','PRESENTATION_AND_FEEDBACK'
      ]),
      weakExistingContentMayPreemptNewContent:true
    }),
    selectedTheme:selectedTheme.id,
    themeDepth:sameThemeDepth,
    selectedThemeReason:runtimeRepairFirst
      ?'Observed runtime failure requires causal foundation repair first; selected theme is retained as context only and does not advance coverage until runtime repair passes.'
      :String(selected.gapDomains.length)+' explicit GAP(s) and '+String(selected.applicableDomains.length)+' applicable domain(s); focus='+focus+'; previousTheme='+(previousTheme||'NONE')+'; previousEffect='+(effectClass||'NONE')+'; previousCoverage='+String(previousCounts[selectedTheme.id]||0)+'; uncoveredBefore='+String(uncoveredThemes.length)+'.',
    themeCoverageLedger:Object.freeze({
      version:1,
      counts:Object.freeze({...nextCounts}),
      sequence:Object.freeze([...nextSequence]),
      requiredThemes:Object.freeze([...themeIds]),
      distinctCovered:themeIds.filter(id=>Number(nextCounts[id]||0)>0).length,
      totalThemes:themeIds.length,
      breadthCycleComplete:missingAfterSelection.length===0,
      missingThemes:Object.freeze([...missingAfterSelection]),
      leastCoveredThemes:Object.freeze([...leastCoveredThemes]),
      selectionPolicy:'SUCCESSFUL_ITERATIONS_PRIORITIZE_UNCOVERED_OR_LEAST_COVERED_COHERENT_THEMES; VERIFIED_FAILURE_MAY_DEEPEN_THE_SAME_CAUSAL_THEME'
    }),
    scoredThemes:Object.freeze(scored.map(row=>Object.freeze({theme:row.theme.id,score:row.score,gapDomains:Object.freeze(row.gapDomains)}))),
    coherentContentBundle:Object.freeze(runtimeRepairFirst?[]:selectedTheme.bundle),
    bundleRule:runtimeRepairFirst
      ?'OBSERVED_RUNTIME_FAILURE_CAUSAL_REPAIR_MUST_PASS_BEFORE_CONTENT_BUNDLE_EXECUTION'
      :'MAJOR_EXPANSION_MUST_CONNECT_MULTIPLE_CONTENT_SURFACES_INTO_ONE_PLAYABLE_FLOW_NOT_ISOLATED_OBJECT_COUNT',
    antiCloneContract:Object.freeze({
      compareAgainstExistingContentBeforeAdding:true,
      nameColorOrStatOnlyCloneForbidden:true,
      repeatedTemplateExpansionForbidden:true,
      distinctionAxes:Object.freeze(['ROLE','BEHAVIOR','PLAYER_DECISION','WORLD_REASON','SOURCE_OR_TRIGGER','REWARD_OR_CONSEQUENCE','SYSTEM_CONNECTION','PRESENTATION']),
      minimumMeaningfulDistinctAxes:2
    }),
    continuityAndCausality:Object.freeze({
      required:true,
      preserveApprovedIdentity:true,
      preserveExistingCanonicalRuleMeaning:true,
      preserveProgressionFlow:true,
      questions:Object.freeze([
        'WHY_DOES_THIS_EXIST_IN_THIS_GAME','WHY_DOES_IT_EXIST_IN_THIS_LOCATION_OR_WORLD_STATE',
        'WHY_DOES_THE_PLAYER_ENCOUNTER_OR_NEED_IT_NOW','WHAT_EXISTING_CONTENT_OR_STATE_LEADS_INTO_IT',
        'WHAT_PLAYER_DECISION_DOES_IT_CHANGE','WHAT_REWARD_STATE_WORLD_OR_NEXT_GOAL_CHANGES_AFTER_IT',
        'HOW_DOES_IT_CONNECT_BACK_TO_EXISTING_SYSTEMS'
      ])
    }),
    derivedRuleEvolution:Object.freeze({
      allowed:!runtimeRepairFirst,
      rule:runtimeRepairFirst
        ?'DEFER_DERIVED_GAMEPLAY_RULE_EVOLUTION_UNTIL_OBSERVED_RUNTIME_FAILURE_CAUSAL_REPAIR_PASSES'
        :'MAY_ADD_DERIVED_GAMEPLAY_INTERACTION_RULES_WHEN_THEY_REINFORCE_APPROVED_IDENTITY_AND_DO_NOT_CONTRADICT_CANONICAL_RULES_OR_PROTECTED_VALUES',
      examples:Object.freeze(runtimeRepairFirst?[]:['ENVIRONMENTAL_RULE','ENEMY_RELATIONSHIP_RULE','BOSS_PHASE_RULE','ITEM_SYNERGY_RULE','QUEST_STATE_RULE','REGION_ACCESS_RULE','MULTIPLAYER_INTERACTION_RULE']),
      protected:Object.freeze(['EXISTING_CANONICAL_RULE_SEMANTICS','AUTHORIZED_BALANCE_VALUES','ECONOMY_MEANING','SAVE_MEANING','NETWORK_AUTHORITY'])
    }),
    completionAcceptance:Object.freeze([
      ...(runtimeRepairFirst?['RUNTIME_FAILURE_CAUSAL_REPAIR_PASS_REQUIRED_BEFORE_CONTENT_EXPANSION']:[]),
      'REAL_GAME_SOURCE_DELTA_REQUIRED','PLAYER_FACING_OR_GAMEPLAY_SYSTEM_EFFECT_REQUIRED',
      ...(runtimeRepairFirst?[]:['DISTINCT_FROM_EXISTING_CONTENT_BY_MEANING_NOT_ONLY_NAME_OR_STATS','CONNECTED_TO_EXISTING_GAME_FLOW','CONTINUITY_AND_CAUSALITY_PRESERVED']),
      'EXISTING_RELEVANT_INCREMENTAL_QA_PASSES',
      'DATA_CAPACITY_BUDGET_RESPECTED_WITHOUT_TERMINATING_BUILD_UP'
    ])
  });
}

function platformDirectives({identity,goal}){
  const web=`${identity}: "${goal}"의 기본 설계 문법은 MAIN = A + B + C + D + @다. A/B 시스템과 C 주·보조 장르, D 구체 창작물, @의 D 기반 조사·선택을 공통 승인 설계의 상태·규칙·진행과 함께 연결한다. 일반 웹게임은 기존 web-games/<gameId> 책임 소스에서 실제 메시·삼각형·깊이 테스트·카메라가 있는 네이티브 3D 월드를 구현한다. 2D·2.5D·DOM 카드·평면 캔버스·표시 문자열은 최종 3D 통과로 인정하지 않는다. 신규 웹 원본은 PlayCanvas와 WebGL2 모바일 호환을 우선 검토하되 이미 실제로 동작하는 Three.js·Babylon.js·WebGL 엔진은 기존 코드·에셋·저장 보존을 위해 재사용하고 중복 렌더 파이프라인을 만들지 않는다. 기존 등록 GLB/glTF 3D 에셋과 라이선스를 재사용하고 터치·카메라 조작·리사이즈·프레임·발열·배터리·메모리·재시작·저장 복원과 실제 WebGL 드로우를 동일 버전의 모바일 브라우저에서 검증한다. 원래 규칙·전투 수치·드랍·재화·멀티 서버 권한·저장 키를 임의로 변경하지 않는다. 플랫폼별 재설계는 금지하고 게임 규칙 확장은 승인된 공통 원본 개정으로만 반영한다. Unity Web/Android는 별도 OWNER_HOLD를 유지하며 일반 WEB 허용을 Unity 권한으로 확장하지 않는다. 새 큐·파이프라인은 생성하지 않고 기존 BUILD_UP과 F0~F9 및 독립 브라우저 QA로만 진행한다. 런타임 증거가 없으면 미검증으로 남기고 기존 2D 게임은 검증된 3D 교체 전까지 보존한다.`;
  const roblox=`${identity}: 동일 공통 목표 "${goal}"를 Roblox 네이티브 Luau/server-client/Remote/touch/3D presentation 구조로 구현한다. 게임 원본은 roblox-games/<gameId>/의 Roblox Luau다. 설계 생성부터 MAIN = A + B + C + D + @의 상태 입력·출력·시스템 연결을 기존 Luau 서버·공유·클라이언트 책임 함수에 연결한다. 유니티 웹·안드로이드는 보류이며 C#를 원본이나 필수 변환 입력으로 요구하지 않는다. 남아 있는 유니티 소스는 선택적 호환 비교 자료일 뿐 규칙 권한이 없다. 설계 문법 → 실제 시스템 구현 → 연결된 콘텐츠 확장 → 내부 자산 적용 → 원본 소스 변경 → 기존 F0~F9 검증 → 다음 빌드업으로 이어간다. 각 시스템·콘텐츠는 실제 함수와 상태 변경 및 런타임 행동 결과로 확인한다. MAIN = A + B + C + D + @·규칙·상태·진행·멀티는 공통 원본을 따른다. C는 메인·보조 장르의 인과이며 D는 출처를 가진 구체 창작, @는 D와 연결된 연구·실험·다음 선택이다. 이전 C 소재 2개는 구형 설계 호환에서만 검증하며 소문자 c도 기존 원본에 있을 때만 보존한다. 플랫폼별 재설계는 금지하고 게임 규칙 확장은 공통 원본 개정으로 돌아간다. 현재 개발 대상은 Roblox와 일반 WEB이며 Roblox 원본 언어는 Luau다. 플레이어/NPC/크리처의 관절 기반 Animator·Motor6D/Bone 모션, idle/walk/jog/run/start/stop/turn/jump/land/attack anticipation-impact-recovery/hit/death 전환, 무게 이동·보조 모션을 실제 상태에 연결하고 root/CFrame 전체 이동만으로 모션 PASS를 주장하지 않는다. HUD/메뉴/인벤은 44px 상당 터치 타깃·safe area·스크롤·닫기·선택 유지·장착 표시·교체 피드백을 검증한다. 오디오는 owner가 끈 카테고리는 되살리지 않되 SoundService/SoundGroup 수명주기, 월드 3D rolloff, 지역/상태/전투 BGM 전환과 중복 재생 방지를 실제 Roblox 클라우드 API 런타임에서 확인한다. VFX·카메라·오디오는 authoritative impact에 동기화하고 중앙 정책의 Roblox 클라우드 API 전후 증거와 실제 행동 결과가 없으면 체감 품질 완료로 계산하지 않는다. 다른 플랫폼 구현을 그대로 복사하지 않는다.`;
  const unity=`${identity}: MAIN = A + B + C + D + @ 공통 원본의 규칙과 상태를 보존하며 "${goal}"를 Unity 네이티브 코드로 구현한다. 플랫폼별 재설계는 금지하고 입력·물리 표현·카메라·애니메이션·UI·성능·저장 전송을 같은 원본에 맞게 적용한다. 게임 규칙 확장은 공통 원본 개정으로 돌아간다. Animator/BlendTree 또는 동등 상태 모션, Canvas safe area와 인벤/메뉴 흐름, AudioMixer/AudioSource 상태 전환, Android 터치 런타임과 프레임·메모리 예산을 Unity 특성에 맞게 응용한다.`;
  const fortnite=`${identity}: MAIN = A + B + C + D + @ 동일 공통 목표 "${goal}"를 Fortnite UEFN의 Verse/device/world/replication 구조와 플레이 공간에 맞게 구현한다. Roblox/Unity/Web 코드를 직역하지 말고 UEFN 네이티브 책임과 멀티플레이 권한을 사용한다.`;
  return{
    WEB:web,
    ROBLOX:roblox,
    UNITY:unity,
    FORTNITE_UEFN:fortnite,
    UNITY_WEB:web,
    UNITY_APP:unity,
    UNREAL:fortnite,
    UEFN:fortnite
  };
}
export function directivePrompt(d={}){
  if(!d?.directiveId)return'';
  const visual=Object.entries(d.visualBuildUpDirective?.domains||{}).map(([k,v])=>`- ${k}: ${v}`).join('\n');
  const domainPriority=(d.allDomainImplementationDirectives||[]).filter(row=>['FIX_NOW','BUILD_UP_NOW'].includes(row.priority)).slice(0,28).map(row=>`- ${row.domain}[${row.priority}]: ${row.directive}`).join('\n');
  const holistic=(d.allDomainImplementationDirectives||[]).filter(row=>HOLISTIC_CORE_DOMAINS.includes(row.domain)).map(row=>`- ${row.domain}=${row.state}/${row.priority}`).join('\n');
  const anchors=(d.responsibleSystemsAndFiles?.sourceAnchors||[]).slice(0,8).map(row=>`- ${row.file}:${row.line||'?'} ${row.kind||'SYMBOL'} ${row.symbol||'UNKNOWN'} | CURRENT=${row.currentBehavior||row.context||'UNKNOWN'} | INTENDED=${row.intendedBehavior||'FOLLOW_PRIMARY_GOAL'} | ACCEPT=${row.observableAcceptance||'REAL_SOURCE_AND_EFFECT_DELTA'}`).join('\n');
  const volume=d.designedGameVolume||{};
  // 전체 항목의 이름과 상태는 빠짐없이 전달하되, 상세 계약은 책임 워커가 현재 항목에만 펼친다.
  // 게임 전체의 반복 프롬프트 폭증을 막고 현재 큐·F0–F9 구조를 그대로 유지한다.
  const volumeRows=(volume.items||[]).map(row=>'- '+row.ref+' '+row.title+' | source='+row.sourceEvidenceState+' | ruleIds='+(row.linkedRuleIds||[]).join(',')+' | runtime=UNVERIFIED').join('\n');
  // 대용량 승인 콘텐츠는 원본 directive에 보존하고, 전체 게임 프롬프트에는
  // 이미 인덱싱된 상세 항목을 재출력하지 않는다. 담당 워커가 선택한 항목만 펼친다.
  const fullDesignContext=d.designImplementationContext||{};
  const variety=fullDesignContext.contentVarietyPlan;
  const indexedFamilies={regions:'VARIETY_REGIONS',enemiesOrChallenges:'VARIETY_ENEMIESORCHALLENGES',abilities:'VARIETY_ABILITIES',
    objectives:'VARIETY_OBJECTIVES',roleTransitions:'VARIETY_ROLETRANSITIONS'};
  const promptDesignContext=variety&&typeof variety==='object'&&!Array.isArray(variety)
    ?{...fullDesignContext,contentVarietyPlan:Object.fromEntries(Object.entries(variety).map(([key,entries])=>{
      const family=indexedFamilies[key];
      if(!family||!Array.isArray(entries)||entries.length<24)return[key,entries];
      const indexed=(volume.items||[]).filter(row=>row.family===family);
      if(indexed.length!==entries.length)return[key,entries];
      return[key,{authoredCount:entries.length,detailSource:'designedGameVolume.items[].designDetail',
        firstRef:indexed[0]?.ref,lastRef:indexed[indexed.length-1]?.ref,allItemsRetained:true}];
    }))}
    :fullDesignContext;
  const expansion=d.autonomousContentExpansion||{};
  const expansionBundle=(expansion.coherentContentBundle||[]).map(row=>`- ${row}`).join('\n');
  const continuityQuestions=(expansion.continuityAndCausality?.questions||[]).join(',');
  // 대형 게임 설계의 전체 소스 탐색 정보는 directive 객체에 보존하고
  // F0 작업 프롬프트에는 현재 관련 모듈만 한 번 압축해 넣는다.
  // 이 요약은 게임 소스 적용·실행·QA 증거가 아니다.
  const auto=d.gameInternalAutoComposition||{};
  const autoComponents=(auto.components||[])
    .filter(row=>row.state!=='NOT_APPLICABLE_WITHOUT_SOURCE')
    .map(row=>({id:row.id,state:row.state,
      files:row.responsibleFiles,requiredByDesign:row.requiredByDesign===true}));
  const autoConnections=(auto.moduleConnections||[])
    .filter(row=>row.state==='EXISTING_SOURCE_CONNECTION_CANDIDATE'||row.missingRoles?.length)
    .map(row=>({id:row.id,state:row.state,
      missingRoles:row.missingRoles,files:row.responsibleFiles}));
  const autoSummary={
    gameId:auto.gameId,sourceTreeFingerprint:auto.sourceTreeFingerprint,
    components:autoComponents,moduleConnections:autoConnections,
    worldGraph:{enabled:auto.worldGraph?.enabled===true,
      biomeSourceFiles:auto.worldGraph?.biomeSourceFiles||[],
      housingSourceFiles:auto.worldGraph?.housingSourceFiles||[]},
    sourceOnlyEvidence:true,implementationProven:false,runtimeVerified:false
  };
  const platformGuidance=d.platformAdaptationDirectives?.[clean(d.platform).toUpperCase()]||d.platformAdaptationDirectives?.WEB||'';
  return[
    '[GAME_SPECIFIC_BUILD_UP_DIRECTIVE]',
    `id=${d.directiveId}; generation=${d.generation}; depth=${d.developmentDepth}; stage=${d.escalationStage}; focus=${d.primaryFocus}`,
    `GAME_IDENTITY: ${d.gameIdentityAndNonNegotiables.identity}`,
    `DESIGN_IMPLEMENTATION_CONTEXT: ${JSON.stringify(promptDesignContext)}`,
    `DESIGN_SOURCE_BUILD_UP: ${JSON.stringify(d.designSourceBuildUp||{})}`,
    'DESIGN_SOURCE_BUILD_UP_RULE: 설계도 매 BUILD_UP에서 진화해야 한다. 첫 단계는 최신 승인된 MAIN/A/B/C/D/@ 설계와 직전 실제 소스·플레이 증거의 차이를 분석하고 기존 설계기에서 개정을 심사받는 것이다. 승인된 설계 규칙·상태·화면 전개·책임 함수에 추적되는 기능만 기존 소스에서 빌드업한다. 이전 설계가 그대로면 승인되지 않은 새 전투·경제·진행·저장 규칙을 코드에서 먼저 발명하지 말고 기존 설계 사이클의 설계 개정을 요청한다. 버그 수리와 승인된 설계 범위의 표현/편의 수정은 계속 진행한다. 검증된 플레이 결과는 다음 설계 개정의 입력이지 설계/런타임 PASS 자체가 아니다.',
    'A_REFERENCE_SYSTEM_DEPTH: 비슷한 유명 게임의 조작, HUD, 메뉴/화면 동선, 카메라, 전투·핵심 플레이, 장비/성장/보상, 월드·스테이지 전개, 실패/재시도, 첫 세션/후반 깊이까지 참고한다. 이름·출처·관찰된 작동 원리·우리 게임 B와의 차이·적용/기각·검증 장면을 연결하되 타 게임 고유 UI 표현·그림·캐릭터·문구·코드·에셋 복제 금지.',
    `DESIGNED_GAME_VOLUME: mode=${volume.mode||'UNKNOWN'}; authored=${volume.authoredItemCount||0}; sourceNamedCandidates=${volume.namedSourceCandidateCount||0}; sourceReview=${volume.sourceReviewRequiredCount||0}; runtimeVerified=${volume.runtimeVerifiedCount||0}; countsAreNotPass=true`,
    'DESIGNED_GAME_VOLUME_ITEMS:',
    volumeRows||'- NO_AUTHORED_CONTENT_ENTRIES_OR_SOURCE_SAFE_MODE',
    `DESIGN_TO_PLATFORM_CODING_CHECK: ${JSON.stringify(d.designToPlatformCodingTrace||{})}`,
    ...(d.designToPlatformCodingTrace?.unityWebDevelopmentAlgorithm?[`UNITY_WEB_NATIVE_DEVELOPMENT_ALGORITHMS: ${JSON.stringify({algorithms:d.designToPlatformCodingTrace.unityWebDevelopmentAlgorithm.algorithms,designRequirements:d.designToPlatformCodingTrace.unityWebDevelopmentAlgorithm.designRequirements.length,packageCount:d.designToPlatformCodingTrace.unityWebDevelopmentAlgorithm.developmentPackages.length,unresolved:d.designToPlatformCodingTrace.unityWebDevelopmentAlgorithm.unresolvedRequirements,implementationVerified:false,runtimeVerified:false})}`]:[]),
    'CODING_IMPLEMENTATION_VERDICT: SOURCE_OWNER_CANDIDATES_ONLY. Do not mark a MAIN/A/B/C/@ role, native platform or 2.5D graphics PASS from design fields or a source marker. Implement and independently replay actual input→authoritative state→result→reconnect, then rerun existing platform QA.',
    `MULTIPLAYER_IMPLEMENTATION: ${JSON.stringify(d.multiplayerImplementation||{})}`,
    ...(d.multiplayerImplementation?.required?[`전 게임 멀티 필수: 기존 서버 권한·클라이언트 입력/동기화 책임 소스에서 접속·참가·준비·시작·이탈·재접속과 목표·승패·보상 일치를 구현한다. 로컬 시뮬레이션이나 플래그만으로 구현 완료라 하지 않는다. 빠진 구현은 기존 BUILD_UP에서 계속 수정·재시도하며 다른 게임과 독립 작업은 계속 진행한다. 검사 완료는 현재 소스의 서버 권한·송수신·참가자·재접속 정적 계약 PASS로 판정한다. 실제 2인 실행은 완료 필수 조건이 아니며 정적 PASS를 실제 플레이 증거로 표기하지 않는다.`]:[]),
    `IDENTITY_ONE_LINE_FANTASY: ${d.identityReinforcement?.oneLineFantasy||d.gameIdentityAndNonNegotiables.identity}`,
    `IDENTITY_REPRESENTATIVE_ACTION: ${d.identityReinforcement?.representativeAction||'CURRENT_CORE_ACTION'}`,
    `IDENTITY_REPRESENTATIVE_CHOICE: ${d.identityReinforcement?.representativeChoice||'CURRENT_CORE_CHOICE'}`,
    `IDENTITY_SIGNATURE_WORLD_RULE: ${d.identityReinforcement?.signatureWorldRule||'CURRENT_GAME_SPECIFIC_WORLD_RULE'}`,
    `IDENTITY_SIGNATURE_SYSTEMS: ${(d.identityReinforcement?.signatureSystems||[]).join(',')||'CURRENT_SIGNATURE_SYSTEMS'}`,
    `IDENTITY_GROWTH: ${d.identityReinforcement?.growthIdentity||d.gameIdentityAndNonNegotiables.progressionDirection}`,
    `IDENTITY_THREE_SENTENCE_TEST: WHAT=${d.identityReinforcement?.threeSentenceTest?.whatGame||''} | DIFFERENT=${d.identityReinforcement?.threeSentenceTest?.whatDifferent||''} | GROWTH=${d.identityReinforcement?.threeSentenceTest?.whatGrowthUnlocks||''}`,
    `IDENTITY_BUILD_UP_RULE: ${d.identityReinforcement?.buildUpRule||'PRESERVE_AND_STRENGTHEN_GAME_IDENTITY'}`,
    `CAUSAL_GRAMMAR_EVIDENCE: ${JSON.stringify(d.identityReinforcement?.causalGrammarEvidence||{})}`,
    `CAUSAL_GRAMMAR_BUILD_UP_RULE: ${d.identityReinforcement?.causalGrammarEvidence?.rule||'PRESERVE_APPROVED_CAUSAL_GAME_GRAMMAR'}`,
    `EXISTING_GAME_MAIN_A_B_c_AT_MAP: ${JSON.stringify(d.identityReinforcement?.causalGrammarEvidence?.existingGameGrammarMap||{})}`,
    'EXISTING_GAME_GRAMMAR_ACTION: MAIN=A+B+C+D+@ 기준으로 A는 이름 있는 대표 유사 장르 게임의 실제 시스템·플레이 경험을 출처와 함께 추상화하며 B는 우리 기존 게임의 실제 시스템·원본 출처·기존 상태/규칙을 보존한다. A→B와 B→A의 새로운 플레이어 선택·상태 전이를 설계한다. C는 작품 주/보조 장르, D는 고유 장소·존재·사건·규칙, @는 D 연관 연구·실험·새 선택이다. 조작·HUD·메뉴·카메라·월드 진행·성장·실패/재도전까지 원리를 참고하되 고유 화면/그래픽/캐릭터/문구/코드를 복제하지 않는다. 먼저 최신 설계를 빌드업하고 엄격 심사를 통과한 규칙 ID만 기존 책임 소스에 구현한다. 실제 입력→서버/웹 상태→피드백→저장/재접속과 동일 빌드 검증을 수행한다. 구형 C 소재 두 개 요구로 새 기본설계를 거부하지 않는다. 설계 문서는 게임 런타임 PASS가 아니다.',
    `PRIMARY_GOAL: ${d.thisLoopPrimaryGoal}`,
    `WHY_NOW: ${d.primaryGoalReason}`,
    ...robloxProductionPromptLines(d.productionPlan||d.robloxProductionPlan),
    d.playtestRuntimeFindings?.studioQualityFailure
      ?'STUDIO_OBSERVED_FAILURES: '+JSON.stringify(d.playtestRuntimeFindings.studioQualityFailure)
      :'STUDIO_OBSERVED_FAILURES: NO_CURRENT_EXACT_ARTIFACT_EVIDENCE',
    'STUDIO_REPAIR_RULE: Treat observed failures as diagnostic data; repair their responsible systems, then replay the failing scenarios. Never infer a PASS from source edits alone.',
    'SOURCE_ANCHORS:',
    anchors||'- exact symbol unavailable; use exact responsible file plus observed runtime/state anchor',
    `EXPECTED_PLAYER_EFFECT: ${d.effectivenessMeasurement?.expectedPlayerEffect||'UNKNOWN'}`,
    `PREVIOUS_EFFECT: ${d.effectivenessMeasurement?.previousGeneration?.classification||'NO_PREVIOUS_GENERATION'} - ${d.effectivenessMeasurement?.previousGeneration?.reason||''}`,
    `NEXT_VIBE_ACTION: ${d.nextActionDecision?.action||'CONTINUE_BUILD_UP_CURRENT_SYSTEM'} - ${d.nextActionDecision?.reason||''}`,
    `AI_COLLABORATION_INTERNAL_ALGORITHM: ${d.internalAlgorithmUse?.rule||'AI_COLLABORATION_VIBE_PRIMARY_INTEGRATION_AND_LEARNING; MAXIMIZE_RELEVANT_VERIFIED_INTERNAL_ALGORITHMS; AUTHORIZED_EXTERNAL_AI_CANDIDATE_BRANCH_IMPLEMENTATION_WHEN_ENABLED; QA_SECURITY_RELEASE_UNCHANGED'}`,
    `AUTONOMOUS_CONTENT_EXPANSION: mode=${expansion.executionMode||'AUTONOMOUS_CONTENT_BUILD_UP'}; theme=${expansion.selectedTheme||'AUTO'}; themeDepth=${expansion.themeDepth||1}; decisionOwner=${expansion.autonomousDecisionOwner||'VIBE'}; boundary=${expansion.executionBoundary||'EXISTING_BUILD_UP_ONLY'}`,
    `CONTENT_BREADTH_LEDGER: covered=${expansion.themeCoverageLedger?.distinctCovered||0}/${expansion.themeCoverageLedger?.totalThemes||0}; missing=${(expansion.themeCoverageLedger?.missingThemes||[]).join(',')||'NONE'}; leastCovered=${(expansion.themeCoverageLedger?.leastCoveredThemes||[]).join(',')||'NONE'}`,
    `DATA_CAPACITY_BUDGET: state=${expansion.dataCapacityBudget?.state||'NORMAL'}; strategy=${expansion.dataCapacityBudget?.strategy||'CONTINUE_BUILD_UP'}; saveMax=${expansion.dataCapacityBudget?.limits?.savePersistedDataBytes||0}; webMax=${expansion.dataCapacityBudget?.limits?.webDownloadBytes||0}; singleFileMax=${expansion.dataCapacityBudget?.limits?.singleFileBytes||0}; mobileMemoryTarget=${expansion.dataCapacityBudget?.limits?.mobileMemoryTargetBytes||0}; mobileMinFps=${expansion.dataCapacityBudget?.limits?.mobileMinimumFps||0}; generationLimit=NONE; contentCountLimit=NONE`,
    expansion.dataCapacityBudget?.state==='NORMAL'?'DATA_CAPACITY_ACTION: 새 콘텐츠와 기존 시스템 심화 중 플레이어 가치가 높은 쪽을 선택한다.':'DATA_CAPACITY_ACTION: BUILD_UP을 멈추지 말고 새 원시 데이터 추가보다 기존 에셋/시스템 재사용·재조합, 압축, 스트리밍/LOD, 풀링, 수명 관리와 시스템 심화를 우선한다. 저장 진행/인벤토리/장비/해금/퀘스트 의미를 삭제해서 예산을 맞추지 않는다.',
    `INTERNAL_ASSET_EVOLUTION: generation=${d.internalAssetEvolution?.generation||d.generation}; mode=${d.internalAssetEvolution?.replacementMode||'COMPATIBLE_REPLACEMENT_OR_RECOMPOSITION'}; source=${d.sourceTreeFingerprint}; previousEffect=${d.internalAssetEvolution?.previousRuntimeEffect||'UNVERIFIED'}; everyCycle=REQUIRED; randomSwapOrMarkerOnly=FORBIDDEN; sourceAndContentGrowth=REQUIRED_WHEN_APPLICABLE; generationLimit=NONE`,
    'ASSET_EVOLUTION_ACTION: 매 반복에서 전체 라이브러리와 기존 책임 소스를 확인하고 누락·오래된 연결·품질 결함을 호환 자산 교체 또는 재조합으로 직접 개선한다. 이전 선택·교체 이유·실제 소스 변경·실행 결과를 남기고 기존 정체성·세이브·밸런스·권한을 보존한다. 자산 작업만 반복하며 코드 완성도와 승인된 콘텐츠 확장을 누락하지 않는다.',
    `EXISTING_COMPLETENESS_CHECK: ${expansion.existingCompletenessReview?.mode||'CHECK_EXISTING_AND_EXPAND_OR_IMPROVE'}; dimensions=${(expansion.existingCompletenessReview?.dimensions||[]).join(',')}`,
    'COHERENT_CONTENT_BUNDLE:',
    expansionBundle,
    `ANTI_CLONE: ${expansion.antiCloneContract?.nameColorOrStatOnlyCloneForbidden===true?'NAME_COLOR_STAT_ONLY_CLONE_FORBIDDEN':'DISTINCT_CONTENT_REQUIRED'}; axes=${(expansion.antiCloneContract?.distinctionAxes||[]).join(',')}`,
    `CONTINUITY_CAUSALITY: required=${expansion.continuityAndCausality?.required===true}; questions=${continuityQuestions}`,
    `DERIVED_RULE_EVOLUTION: ${expansion.derivedRuleEvolution?.rule||'PRESERVE_CANONICAL_RULES'}`,
    `PLATFORM_NATIVE_GUIDANCE: ${platformGuidance}`,
    `GAMEPLAY: ${d.gameplayImplementationDirectives.join(' | ')}`,
    `PROGRESSION_WORLD: ${d.progressionContentWorldDirectives.join(' | ')}`,
    'HOLISTIC_CORE_DOMAIN_STATUS:',
    holistic,
    'PRIORITY_DOMAIN_DIRECTIVES:',
    domainPriority,
    'VISUAL:',
    visual,
    d.visualBuildUpDirective?.nativeOptimization?.enabled
      ?'ROBLOX_BUILD_UP_OPTIMIZATION: '+JSON.stringify(d.visualBuildUpDirective.nativeOptimization)+
       ' F0와 매 빌드업에서 리깅·재질·물리·충돌을 함께 최적화한다. 기존 모델·리그·충돌 형상을 보존할 의무는 없으며 기존 책임 함수를 직접 재구성하거나 CC0 모델로 교체할 수 있다. 사용 중인 관절·애니메이션 바인딩을 확인한 뒤 불필요한 연결을 제거하고, 리그가 바뀌면 기존 행동을 호환 리타기팅한다. 정적 월드 고정, 시각 메시의 질량·충돌 제외, 간단한 판정체와 역할별 충돌 그룹, 불필요한 터치·쿼리 제거를 함께 적용한다. 채집·공격·이동·상호작용에 필요한 쿼리와 지면 접촉은 실제로 재검증한다. 브릭 재질은 기존 메시의 표면으로 표현하며 모바일 장식 파츠나 돌기 파츠를 늘리지 않는다. 서버 판정과 저장 이관을 생략하거나 소스 마커로 실행 통과를 주장하지 않는다.':'' ,
    d.visualBuildUpDirective?.primitiveReplacement?.enabled
      ?'ROBLOX_CC0_PRIMITIVE_REPLACEMENT: '+JSON.stringify(d.visualBuildUpDirective.primitiveReplacement)+
       ' F0부터 발견한 책임 파일의 실제 보이는 원형 파츠를 CC0 파생 자산으로 교체한다. 기존 외형 보존은 불필요하다. 비슷한 CC0 자산이면 우선 사용하고 정확히 같은 모델·종류·스타일을 기다리지 않는다. 크기·색·재질을 맞추고 움직임을 호환 연결한다. 기존 생성 함수를 직접 수정하고 원형 표시·재생성 fallback을 제거한다. 숨은 충돌체·판정·리그 루트·스폰·트리거는 보이는 원형과 구분해 기능을 유지한다. 대체 자산이 없으면 기존 자산 공급 GAP로 연결하며 원형 유지나 새 파츠 조립을 교체 완료로 처리하지 않는다. 책임 범위 밖 파일은 기존 후속 BUILD_UP에 남기고 모든 대상이 같은 빌드 실행 검증을 통과하기 전에는 전체 완료를 주장하지 않는다.':'' ,
    'GAME_INTERNAL_AUTO_COMPOSITION: '+JSON.stringify(autoSummary),
    'AUTO_COMPOSITION_RULE: For every present feature, edit its real game owner only. Connect existing lobby/customization/material/inventory/equipment/UI/world/biome/housing/motion/action and source-grounded NPC AI/quest/dialogue/crafting/economy/progression/farming/weather/physics/camera/audio/skill effects/network only when game source and approved design contain them. Biomes must map approved regions to real native terrain/navigation/streaming; housing must preserve placement/cost/ownership/save/rejoin; customization must use actual character model and saved identity; motion must drive existing actions and approved hit events; NPC decisions must not grant economy/save/combat authority; crafting and shopping use actual items/currency/state. Use applicable moduleConnections as source-only QA work units, never completed features. Mobile HUD must use real input/state; no dead controls. Trace acquisition→store→equip→visual/stat→save→reconnect with authoritative state; source signatures never pass QA. No new asset generation or shadow system.',
    'PLAYER_FACING_INSPECTION_CONTRACT:',
    ...playerFacingInspectionPromptLines(d.playerFacingInspectionContract,{focus:d.primaryFocus,generation:d.generation}),
    `EXPERIENCE_BUILD_UP: ${JSON.stringify(d.experienceBuildUpContract||{})}`,
    `UX_INPUT: ${d.uxInputDirectives.join(' | ')}`,
    d.robloxNativeExecution?`ROBLOX_NATIVE_RESPONSIBLE_FILES: ${(d.robloxNativeExecution.responsibleFiles||[]).join(' | ')||'CURRENT_ALLOWED_ROBLOX_FILES'}`:'',
    d.robloxNativeExecution?`ROBLOX_NATIVE_SERVER_CLIENT: ${(d.robloxNativeExecution.serverClientResponsibility||[]).map(row=>row.file+':'+row.symbol+':'+row.role).join(' | ')}`:'',
    d.robloxNativeExecution?`ROBLOX_NATIVE_FUNCTIONAL_ACCEPTANCE: ${d.robloxNativeExecution.observableAcceptanceScenario}`:'',
    d.robloxNativeExecution?`ROBLOX_NATIVE_SOURCE_INSPECTION: ${(d.robloxNativeExecution.sourceInspectionChecklist||[]).join(',')}`:'',
    d.robloxNativeExecution?`ROBLOX_NATIVE_CODE_QUALITY: ${(d.robloxNativeExecution.codeQualityChecks||[]).join(',')}`:'',
    `PRESERVE: ${d.preserveConstraints.join(' | ')}`,
    `ACCEPTANCE: ${d.acceptanceEvidence.join(' | ')}`,
    `NEXT_ESCALATION: ${d.nextEscalationCandidates.join(' | ')}`
  ].join('\n');
}

export function buildGameSpecificBuildUpDirective({
  gameId='',gameName='',platform='COMMON',designRecord={},sourceObservation=null,repoRoot=process.cwd(),sourceRoot='',
  previousDirective=null,previousDirectiveOutcome='',runtimeEvidence={},qualitySignals=[],responsibleFiles=[],
  requestedFocus='',safeDesignlessMode=false
}={}){
  const id=clean(gameId);if(!id)throw new Error('BUILD_UP_GAME_ID_REQUIRED');
  const design=extractDesignContext(designRecord||{});
  const currentDesignFingerprint=sha(JSON.stringify(design));
  const previousDesignFingerprint=clean(previousDirective?.designFingerprint);
  const sameApprovedDesign=Boolean(previousDirective&&previousDesignFingerprint&&previousDesignFingerprint===currentDesignFingerprint);
  const previousVerifiedOutcome=['verified','done','completed','pass','passed'].includes(clean(previousDirectiveOutcome).toLowerCase());
  const designSourceBuildUp=Object.freeze({
    version:1,scope:'EXISTING_DESIGN_AND_GAME_BUILD_UP_ONLY',
    currentDesignFingerprint,previousDesignFingerprint:previousDesignFingerprint||null,
    sameApprovedDesign,previousVerifiedOutcome,
    revisionRequiredForNewGameplay:sameApprovedDesign&&previousVerifiedOutcome&&!safeDesignlessMode,
    nextDesignAction:safeDesignlessMode?'REPAIR_SOURCE_WITHOUT_NEW_UNAPPROVED_GAMEPLAY':
      sameApprovedDesign&&previousVerifiedOutcome?'REQUEST_EXISTING_DESIGN_CYCLE_REVISION':
      'TRACE_CURRENT_APPROVED_DESIGN_TO_NATIVE_SOURCE',
    sourceAuthority:'LATEST_APPROVED_SAME_GAME_DESIGN_ONLY',
    referenceA:design?.creativeGrammar?.a?.referenceGame||null,
    baselineB:design?.creativeGrammar?.b?.existingSystemReference||null,
    benchmarkDimensions:Object.freeze(['INPUT_AND_PRIMARY_ACTION','HUD_AND_MENU_FLOW','CAMERA_AND_FEEDBACK',
      'COMBAT_OR_CORE_LOOP','WORLD_AND_LEVEL_PROGRESSION','EQUIPMENT_REWARDS_AND_GROWTH',
      'ONBOARDING_AND_FIRST_SESSION','FAILURE_RETRY_SAVE_RECOVERY','MID_LATE_DEPTH']),
    loop:Object.freeze(['REVIEW_GAME_AND_NAMED_REFERENCE_EVIDENCE','REVISE_MAIN_A_B_C_D_AT_DESIGN',
      'STRICT_DESIGN_REVIEW','BIND_RULE_IDS_TO_EXISTING_RESPONSIBLE_SOURCE',
      'BUILD_SOURCE','EXACT_BUILD_RUNTIME_QA','NEXT_DESIGN_REVISION_FROM_VERIFIED_GAPS']),
    provenanceRule:'NAMED_SOURCE_OBSERVED_MECHANICS_OR_UNVERIFIED; NEVER_COPY_DISTINCTIVE_UI_ART_CHAR_TEXT_CODE',
    confirmedRuntimePass:false,
    preserves:Object.freeze(['OWNER_GAME_IDENTITY','CORE_RULES','BALANCE','ECONOMY','SAVE_KEYS_AND_MEANING','NETWORK_AUTHORITY'])
  });
  const multiplayerPolicy=readJson(path.join(repoRoot,clean(process.env.COMPANY_VERIFIED_POLICY_PATH)||'__retired_policy_not_available__'),{})?.directNativeDualPlatformDevelopment?.multiplayerImplementation||{};
  const multiplayerRequired=multiplayerPolicy.required===true;
  sourceRoot=posix(sourceRoot)||posix(sourceObservation?.sourceRoot);
  const source=sourceObservation||inspectGameSource({repoRoot,sourceRoot});
  const signals=uniq([
    ...qualitySignals,
    ...(source?.observations||[]),
    ...(Array.isArray(runtimeEvidence?.blockers)?runtimeEvidence.blockers:[]),
    clean(runtimeEvidence?.failureSignature),
    clean(runtimeEvidence?.playtestFinding),
    clean(runtimeEvidence?.qualityGap)
  ]);
  const requested=clean(requestedFocus).toUpperCase();
  if(safeDesignlessMode&&!DESIGNLESS_SAFE_BUILD_UP_FOCI.includes(requested))throw new Error('BUILD_UP_DESIGNLESS_SAFE_FOCUS_REQUIRED');
  const preferred=safeDesignlessMode?requested:focusFromSignals({signals,source});
  const generation=Math.max(1,Number(previousDirective?.generation||0)+1);
  const rawDepthInfo=escalationDepthInfo({previousDirective,previousOutcome:previousDirectiveOutcome,currentSourceTreeFingerprint:source.sourceTreeFingerprint});
  const previousEffectiveness=classifyPreviousEffectiveness({previousDirective,previousOutcome:previousDirectiveOutcome,depthInfo:rawDepthInfo,runtimeEvidence});
  const effectAdvanceAllowed=clean(previousEffectiveness?.classification).toUpperCase()==='EFFECT_CONFIRMED';
  const retainedDepth=previousDirective?Math.max(1,Number(previousDirective?.developmentDepth||1)):Math.max(1,Number(rawDepthInfo.developmentDepth||1));
  const depthInfo=Object.freeze({
    ...rawDepthInfo,
    developmentDepth:rawDepthInfo.advanceAllowed&&effectAdvanceAllowed?rawDepthInfo.developmentDepth:retainedDepth,
    escalationStage:depthStage(rawDepthInfo.advanceAllowed&&effectAdvanceAllowed?rawDepthInfo.developmentDepth:retainedDepth),
    escalationMode:rawDepthInfo.advanceAllowed&&!effectAdvanceAllowed?'VERIFIED_SOURCE_DELTA_AWAITING_EFFECT':rawDepthInfo.escalationMode,
    verifiedEvolution:rawDepthInfo.verifiedEvolution&&effectAdvanceAllowed,
    advanceAllowed:rawDepthInfo.advanceAllowed&&effectAdvanceAllowed,
    sourceDeltaVerifiedButEffectPending:rawDepthInfo.advanceAllowed&&!effectAdvanceAllowed
  });
  const priorFocus=clean(previousDirective?.primaryFocus).toUpperCase();
  const previousEffectClass=clean(previousEffectiveness?.classification).toUpperCase();
  const foundationRepairRequired=previousEffectClass==='REGRESSION'
    &&runtimeEvidence?.runtimeObserved===true
    &&runtimeEvidence?.runtimePassed!==true;
  const keepPriorFocus=Boolean(previousDirective&&priorFocus&&['NO_MEANINGFUL_EFFECT','PARTIAL_EFFECT','REGRESSION','UNKNOWN_RUNTIME_EFFECT'].includes(previousEffectClass));
  const focus=foundationRepairRequired
    ?'STABILITY'
    :safeDesignlessMode
      ?requested
      :keepPriorFocus?priorFocus:previousDirective&&!depthInfo.advanceAllowed&&priorFocus?priorFocus:nextFocus({preferred,previous:previousDirective||{}});
  const anchor=primaryDesignAnchor(design),secondary=secondaryDesignAnchor(design);
  const identity=design.identity||clean(gameName)||id;
  const firstSignature=design.signatureSystems?.[0]||{};
  const firstConnection=design.systemInterconnections?.[0]||{};
  const authoredRole=role=>design.signatureSystems.find(system=>system.grammarRole===role);
  const mainSystem=authoredRole('MAIN'),aSystem=authoredRole('A'),bSystem=authoredRole('B');
  const cSystems=design.signatureSystems.filter(system=>system.grammarRole==='c');
  const delveSystems=design.signatureSystems.filter(system=>system.grammarRole==='DELVE');
  const hasOwnerCreativeGrammar=Boolean(clean(design.creativeGrammar?.mainIdentity)
    ||clean(design.creativeGrammar?.a?.system)
    ||Array.isArray(design.creativeGrammar?.cGenres)
    ||Array.isArray(design.creativeGrammar?.cThemes));
  const ownerStandardGrammar=Number(design.creativeGrammar?.standardVersion||0)>=1;
  const sourcedCreativeAxes=['a','b'].every(key=>clean(design.creativeGrammar?.[key]?.system)
    &&clean(design.creativeGrammar?.[key]?.material)
    &&clean(design.creativeGrammar?.[key]?.materialDomain)
    &&clean(design.creativeGrammar?.[key]?.stateChange));
  const cThemes=Array.isArray(design.creativeGrammar?.cThemes)?design.creativeGrammar.cThemes:[];
  const cGenres=Array.isArray(design.creativeGrammar?.cGenres)?design.creativeGrammar.cGenres:[];
  const authoredCreativeC=(ownerStandardGrammar||(cThemes.length===2
    &&new Set(cThemes.map(row=>clean(row?.name).toLowerCase())).size===2
    &&cThemes.every(row=>clean(row?.name)&&clean(row?.gameplayEffect))))
    &&cGenres.length===2
    &&['PRIMARY','SECONDARY'].every(role=>cGenres.some(row=>row?.role===role&&clean(row?.gameplayEffect)))
    &&new Set(cGenres.map(row=>clean(row?.name).toLowerCase())).size===2
    &&clean(design.creativeGrammar?.cGenreInterlock)
    &&clean(design.creativeGrammar?.cWorldAndGameplayEffect);
  const ownerDIds=new Set((design.creativeGrammar?.dCreations||[]).map(row=>clean(row?.id)).filter(Boolean));
  const ownerDReady=!ownerStandardGrammar||Boolean(ownerDIds.size
    &&(design.creativeGrammar?.dCreations||[]).every(row=>Array.isArray(row?.materialPath)
      &&row.materialPath.length===3&&clean(row?.creation)&&clean(row?.gameplayEffect)
      &&['PRIMARY','SECONDARY'].every(role=>(row.genreRoles||[]).includes(role))
      &&['A','B'].every(role=>(row.linkedElements||[]).includes(role))));
  const ownerAtReady=!ownerStandardGrammar||Boolean((design.creativeGrammar?.delveDiscoveries||[]).length>=4
    &&design.creativeGrammar.delveDiscoveries.every(row=>ownerDIds.has(clean(row?.sourceDId))
      &&clean(row?.experiment)&&clean(row?.discovery)&&clean(row?.newChoice)&&clean(row?.nextQuestion)));
  // V5는 오래된 c 태그로 C를 대신할 수 없다. V4 설계만 기존 c 호환 경로를 유지한다.
  const authorMapped=Boolean(mainSystem&&aSystem&&bSystem&&delveSystems.length
    &&(hasOwnerCreativeGrammar?(sourcedCreativeAxes&&authoredCreativeC&&ownerDReady&&ownerAtReady):cSystems.length));
  const reconstructedMain=clean(design.creativeGrammar?.mainIdentity)||clean(mainSystem?.name)||clean(design.coreLoop?.[0])||clean(design.coreFun)||anchor;
  const reconstructedMajorAxes=Object.freeze([
    Object.freeze({key:'A',systemId:clean(aSystem?.id)||null,name:clean(aSystem?.name)||clean(design.signatureSystems?.[0]?.name)||secondary,source:authorMapped?'DESIGNER_AUTHORED_ROLE_A':'LEGACY_DESIGN_FALLBACK_UNVERIFIED'}),
    Object.freeze({key:'B',systemId:clean(bSystem?.id)||null,name:clean(bSystem?.name)||clean(design.signatureSystems?.[1]?.name)||clean(design.coreLoop?.[1])||'CURRENT_SECOND_MAJOR_SYSTEM',source:authorMapped?'DESIGNER_AUTHORED_ROLE_B':'LEGACY_DESIGN_FALLBACK_UNVERIFIED'})
  ]);
  const confirmedSubElements=uniq(authorMapped
    ?cSystems.map(row=>row.name||row.purpose)
    :[...design.signatureSystems.slice(2).map(row=>row.name||row.purpose),...design.systemInterconnections.slice(0,4).map(row=>row.trigger)]
  ).slice(0,6);
  const delveEvidence=uniq([
    ...(design.creativeGrammar?.delveDiscoveries||[]).map(row=>row.discovery),
    ...delveSystems.map(row=>row.name||row.purpose),
    ...design.contentExpansionPlan.flatMap(row=>[row.milestone,row.newGameplay]),
    ...design.narrativeWorldRules,
    ...design.designIntegrityNotes
  ]).slice(0,10);
  const existingGameGrammarMap=Object.freeze({
    mode:'EXISTING_GAME_RECONSTRUCTION_FROM_CURRENT_DESIGN_AND_INSPECTED_SOURCE',
    formula:ownerStandardGrammar?'MAIN = A + B + C + D + @':'MAIN × A × B × C + @',
    main:reconstructedMain,
    source:authorMapped?'DESIGNER_AUTHORED_ROLE_IDS_AND_STATE_LINKS':'LEGACY_DESIGN_HEURISTIC_NOT_IMPLEMENTATION_EVIDENCE',
    roleSystemIds:Object.freeze({MAIN:clean(mainSystem?.id)||null,A:clean(aSystem?.id)||null,B:clean(bSystem?.id)||null,c:cSystems.map(row=>clean(row.id)).filter(Boolean),AT:delveSystems.map(row=>clean(row.id)).filter(Boolean)}),
    majorAxes:reconstructedMajorAxes,
    cSubElements:Object.freeze(confirmedSubElements),
    sourcedAxes:Object.freeze({A:design.creativeGrammar?.a||null,B:design.creativeGrammar?.b||null}),
    cGenreThemes:Object.freeze(ownerStandardGrammar?[]:(design.creativeGrammar?.cThemes||[])),
    dCreations:Object.freeze(design.creativeGrammar?.dCreations||[]),
    cPrimarySecondaryGenres:Object.freeze(design.creativeGrammar?.cGenres||[]),
    cGenreInterlock:clean(design.creativeGrammar?.cGenreInterlock),
    cCausalWorldEffect:clean(design.creativeGrammar?.cWorldAndGameplayEffect),
    atUnboundedGrowthRule:clean(design.creativeGrammar?.delveGrowthRule),
    standardGrammarVersion:ownerStandardGrammar?Number(design.creativeGrammar.standardVersion):null,
    delveAtEvidence:Object.freeze(delveEvidence),
    sourceTreeFingerprint:source.sourceTreeFingerprint,
    rule:ownerStandardGrammar?'MAIN_A_NAMED_GAME_SYSTEM_B_EXISTING_GAME_SYSTEMS; C_IS_PRIMARY_SECONDARY_STORY_GENRES; D_IS_SPECIFIC_CREATIONS; AT_RESEARCH_LINKS_TO_D; ROBLOX_LUAU_CANONICAL':'MAIN_IS_GAME_TOPIC; A_AND_B_EACH_REQUIRE_SYSTEM_AND_SOURCE_MATERIAL; C_HAS_TWO_CREATIVE_MATERIALS_AND_PRIMARY_SECONDARY_DISTINCT_GENRES_WITH_GAMEPLAY_INTERLOCK; A_B_CAUSAL_PLAY_CHANGES_WORLD_STORY; @ IS_UNBOUNDED_DISCOVERY_MASTERY_AND_REVISIT',
    identityRewriteRequired:false,
    existingBalanceSaveEconomyAndAuthorityPreserved:true
  });
  const identityReinforcement=Object.freeze({
    appliesToAllGenres:true,
    genre:design.genre||'GAME_SPECIFIC',
    oneLineFantasy:design.playerFantasy||identity,
    representativeAction:design.coreLoop?.[0]||design.coreFun||anchor,
    representativeChoice:clean(firstSignature.playerChoice)||design.coreLoop?.[1]||secondary,
    signatureWorldRule:clean(firstConnection.stateChange)||clean(firstConnection.trigger)||`${anchor}의 결과가 다음 월드·목표·위험·보상 상태를 바꾼다.`,
    signatureSystems:Object.freeze((authorMapped?design.signatureSystems:design.signatureSystems.slice(0,2)).map(row=>row.name||row.purpose).filter(Boolean)),
    growthIdentity:design.progressionDirection||'성장 후 새 행동·경로·조합·관계·발견·대응법을 연다.',
    threeSentenceTest:Object.freeze({
      whatGame:identity,
      whatDifferent:clean(firstSignature.purpose)||clean(firstConnection.stateChange)||`${anchor}와 ${secondary}의 결합 결과가 이 게임의 차별점이다.`,
      whatGrowthUnlocks:design.progressionDirection||'성장할수록 기존 핵심 시스템을 새로운 방식으로 사용할 수 있어야 한다.'
    }),
    causalGrammarEvidence:Object.freeze({
      worldRules:Object.freeze(design.narrativeWorldRules||[]),
      causalInspirations:Object.freeze(design.referenceCausalInspirations||[]),
      systemInterconnections:Object.freeze(design.systemInterconnections||[]),
      expansionPlan:Object.freeze(design.contentExpansionPlan||[]),
      integrityNotes:Object.freeze(design.designIntegrityNotes||[]),
      formula:ownerStandardGrammar?'MAIN = A + B + C + D + @':'MAIN × A × B × C + @',
      existingGameGrammarMap,
      rule:ownerStandardGrammar?'NEW_CONTENT_MUST_CONNECT_A_PRIMARY_B_SUPPORTING_C_STORY_GENRES_D_CREATIONS_AND_AT_D_RESEARCH_TO_EXACT_GAME_STATE; LUAU_OWNER_REQUIRED; DESIGN_IS_NOT_RUNTIME_PASS':'NEW_CONTENT_MUST_DEEPEN_MAIN_TOPIC_A_B_SOURCED_SYSTEMS_C_CREATIVE_THEMES_AND_PRIMARY_SECONDARY_GENRE_INTERLOCK; OPTIONAL_LEGACY_c_IS_NOT_C_OR_A_MAJOR_AXIS; @ IS_DELVE_LAYER; DECORATIVE_LORE_OR_PARALLEL_FEATURE_STACK_DOES_NOT_COUNT',
      familiarHumanConflictShouldRemainReadable:true
    }),
    buildUpRule:'EACH_BUILD_UP_MUST_STRENGTHEN_OR_PRESERVE_THE_REPRESENTATIVE_ACTION_CHOICE_WORLD_RULE_SIGNATURE_SYSTEM_OR_GROWTH_IDENTITY; GENERIC_FEATURE_COUNT_DOES_NOT_COUNT',
    genreAdaptationRule:'PRESERVE_THE_GENRE_PRIMARY_ACTION; DO_NOT_FORCE_RPG_STYLE_SYSTEMS_ON_PUZZLE_RACING_TYCOON_DEFENSE_SURVIVAL_ACTION_CARD_BOARD_STRATEGY_CASUAL_OR_OTHER_GENRES'
  });
  const goalByFocus={
    CORE_FUN:`${identity}의 ${anchor}를 입력→판단→상태 변화→피드백→다음 선택까지 실제 플레이에서 더 깊고 명확하게 만든다.`,
    PROGRESSION:`${identity}의 ${design.progressionDirection||secondary}가 짧은 목표·보상·해금·다음 선택으로 실제 플레이에 연결되도록 깊이를 높인다.`,
    PRESENTATION:`${identity}의 ${anchor}와 ${secondary}가 캐릭터·적·환경·모션·VFX·카메라·UI 전체에서 한눈에 구별되도록 비주얼 정체성을 높인다.`,
    USABILITY:`${identity}의 핵심 행동과 다음 목표를 모바일에서도 즉시 이해하고 실수 없이 조작할 수 있도록 입력·HUD·피드백 흐름을 다듬는다.`,
    STABILITY:`${identity}의 현재 실패 근거를 원인 시스템에서 제거하고 핵심 루프·저장·복구가 같은 상태에서 반복 가능하게 만든다.`
  };
  const goal=goalByFocus[focus]||goalByFocus.CORE_FUN;
  const previousFingerprint=clean(previousDirective?.directiveFingerprint);
  const fingerprint=sha(JSON.stringify({id,generation,focus,goal,source:source.sourceTreeFingerprint,design,previousDirectiveOutcome:clean(previousDirectiveOutcome),previousEffectiveness,qualitySignals:signals,runtimeEvidence,safeDesignlessMode,multiplayerPolicy}));
  const baseStates=BUILD_UP_DOMAINS.map(domain=>domainState(domain,{design,source,multiplayerRequired}));
  const designlessAllowedDomains=new Set(safeDesignlessMode?(DESIGNLESS_SAFE_BUILD_UP_DOMAINS[focus]||[]):BUILD_UP_DOMAINS);
  const states=safeDesignlessMode
    ?baseStates.map(row=>designlessAllowedDomains.has(row.domain)?row:{domain:row.domain,state:'NOT_APPLICABLE',reason:'designless source-safe BUILD_UP cannot expand gameplay/progression semantics'})
    :baseStates;
  const gaps=states.filter(x=>x.state==='GAP');
  const allDomainImplementationDirectives=buildAllDomainDirectives({states,design,focus,depthInfo});
  const topFiles=uniq([...(responsibleFiles||[]),...(source?.topFiles||[]).map(x=>x.file)]).slice(0,Math.max(16,uniq(responsibleFiles||[]).length));
  const primarySourceAnchors=selectPrimarySourceAnchors(source,responsibleFiles,8);
  const exactAnchorLabel=primarySourceAnchors.length?primarySourceAnchors.map(row=>row.file+'::'+row.symbol).join(', '):(topFiles[0]||'CURRENT_GAME_SOURCE');
  const expectedEffect=expectedPlayerEffect({focus,identity,anchor,secondary});
  const sourceResponsibilities=primarySourceAnchors.map(row=>Object.freeze({
    ...row,
    currentBehavior:clean(row.context)||`현재 ${row.kind||'SYMBOL'} ${row.symbol||'UNKNOWN'} 구현을 소스에서 관찰함`,
    intendedBehavior:`${focus} primary goal "${goal}"에 맞춰 ${row.symbol||'이 책임 영역'}의 입력/조건→상태 변화→피드백 연결을 직접 심화하고, 플레이어 관찰 결과가 "${expectedEffect}"가 되게 한다.`,
    whyThisAnchor:`${row.file}::${row.symbol||'UNKNOWN'}이 현재 소스에서 primary goal과 직접 연결된 책임 앵커로 선택됨`,
    observableAcceptance:`${row.file}에 실제 source delta가 있고 관련 QA/runtime에서 ${focus} 상태 변화와 expected player effect가 관찰되어야 함`
  }));
  // 현재 게임·플랫폼의 설계 역할을 실제 코딩 책임 파일 후보와 연결한다.
  // 여러 플랫폼을 한 파이프라인으로 합치지 않고 기존 BUILD_UP의 단계별 QA에 전달한다.
  const designToPlatformCodingTrace=buildDesignToPlatformCodingTrace({
    gameId:id,design,platform,sourceRoot,sourceObservation:source,
    responsibleFiles:topFiles,repoRoot,multiplayerRequired
  });
  // 전체 볼륨 인덱스는 기존 요약 컨텍스트의 8~24개 제한에 의해 설계 항목이 누락되지 않게 한다.
  // 다른 코딩/계획 컨텍스트의 기존 요약 예산과 원본 게임 규칙은 그대로 유지한다.
  const authoredDesign=designRecord?.content&&typeof designRecord.content==='object'
    ?designRecord.content:(designRecord||{});
  const designedGameVolume=buildDesignedGameVolume({
    design:{
      ...design,
      selectedDesignPlan:authoredDesign.selectedDesignPlan||design.selectedDesignPlan,
      coreLoop:Array.isArray(authoredDesign.coreLoop)?authoredDesign.coreLoop:design.coreLoop,
      signatureSystems:Array.isArray(authoredDesign.signatureSystems)?authoredDesign.signatureSystems:design.signatureSystems,
      systemInterconnections:Array.isArray(authoredDesign.systemInterconnections)?authoredDesign.systemInterconnections:design.systemInterconnections,
      contentExpansionPlan:Array.isArray(authoredDesign.contentExpansionPlan)?authoredDesign.contentExpansionPlan:design.contentExpansionPlan,
      implementationTraceability:Array.isArray(authoredDesign.implementationTraceability)?authoredDesign.implementationTraceability:design.implementationTraceability
    },source,safeDesignlessMode
  });
  const robloxNativeExecution=Object.freeze({
    version:1,
    required:true,
    responsibleFiles:topFiles.filter(file=>/roblox-games\/|\.lua[u]?$/i.test(file)),
    sourceSymbolsOrStateAnchors:sourceResponsibilities.map(row=>Object.freeze({
      file:row.file,
      line:row.line||null,
      kind:row.kind||'SYMBOL',
      symbol:row.symbol||'UNKNOWN',
      currentBehavior:row.currentBehavior,
      intendedBehavior:row.intendedBehavior,
      observableAcceptance:row.observableAcceptance
    })),
    serverClientResponsibility:sourceResponsibilities.map(row=>Object.freeze({
      file:row.file,
      symbol:row.symbol||'UNKNOWN',
      role:/(?:^|\/)server\/|\.server\.lua[u]?$/i.test(row.file)?'SERVER_AUTHORITY'
        :/(?:^|\/)client\/|\.client\.lua[u]?$/i.test(row.file)?'CLIENT_INPUT_OR_PRESENTATION'
        :'SHARED_MODULE_OR_STATE',
      authorityRule:'damage/reward/currency/inventory/progression/save authoritative mutation remains server-owned when applicable'
    })),
    expectedPlayerEffect:expectedEffect,
    observableAcceptanceScenario:'input/touch -> local handler -> RemoteEvent/RemoteFunction when required -> server validation -> authoritative state change -> client feedback',
    sourceInspectionChecklist:[
      'SERVER_AUTHORITY','CLIENT_PRESENTATION','REMOTE_EVENTS_AND_FUNCTIONS','TOUCH_INPUT','CHARACTER_RESPAWN',
      'DATASTORE_SAVE_LOAD','UI_STATE','CORE_STATE_MACHINE','MULTIPLAYER_SYNC'
    ],
    codeQualityChecks:[
      'NO_UNBOUNDED_WHILE_LOOP','NO_LEAKED_CONNECTIONS','NO_DUPLICATE_REMOTE_PATH',
      'NO_CLIENT_AUTHORITATIVE_GAMEPLAY_MUTATION','BOUNDED_DATASTORE_RETRY','REMOTE_INPUT_VALIDATION',
      'NO_STALE_CHARACTER_REFERENCE_AFTER_RESPAWN'
    ],
    implementationRule:'read existing Roblox responsibilities first; modify the existing responsible function/module directly; do not translate Unity/Web code literally',
    actualPlayRule:'after the changed behavior becomes executable and the existing runtime-foundation gate passes, replay the exact changed scenario through official Studio MCP and feed the observed result back into causal repair'
  });
  const nextActionDecision=decideNextVibeAction({previousEffectiveness,previousOutcome:previousDirectiveOutcome,focus});
  const autonomousContentExpansionBase=buildAutonomousContentExpansion({
    repoRoot,source,states,focus,previousDirective,previousEffectiveness,nextActionDecision,platform,runtimeEvidence
  });
  const safeTheme='SOURCE_SAFE_'+focus+'_QUALITY';
  const previousSafeExpansion=previousDirective?.autonomousContentExpansion||{};
  const safeThemeIds=autonomousContentExpansionBase.themeCoverageLedger?.requiredThemes||[];
  const safeCounts=Object.fromEntries(safeThemeIds.map(theme=>[theme,Math.max(0,Number(previousSafeExpansion?.themeCoverageLedger?.counts?.[theme]||0))]));
  const safeMissing=safeThemeIds.filter(theme=>Number(safeCounts[theme]||0)===0);
  const autonomousContentExpansion=safeDesignlessMode?Object.freeze({
    ...autonomousContentExpansionBase,
    executionMode:clean(nextActionDecision?.action).toUpperCase()==='CAUSAL_REPAIR'?'CAUSAL_REPAIR_SOURCE_SAFE_NO_DESIGN':'SOURCE_SAFE_QUALITY_BUILD_UP_NO_DESIGN',
    designlessSafeMode:true,
    selectedTheme:safeTheme,
    themeDepth:clean(previousSafeExpansion?.selectedTheme)===safeTheme?Math.max(1,Number(previousSafeExpansion?.themeDepth||1)+1):1,
    selectedThemeReason:'No verified/minimum design exists; only source-observed '+focus+' quality may evolve until design becomes available.',
    themeCoverageLedger:Object.freeze({
      version:1,
      counts:Object.freeze(safeCounts),
      sequence:Object.freeze(Array.isArray(previousSafeExpansion?.themeCoverageLedger?.sequence)?[...previousSafeExpansion.themeCoverageLedger.sequence]:[]),
      requiredThemes:Object.freeze([...safeThemeIds]),
      distinctCovered:safeThemeIds.filter(theme=>Number(safeCounts[theme]||0)>0).length,
      totalThemes:safeThemeIds.length,
      breadthCycleComplete:safeMissing.length===0,
      missingThemes:Object.freeze([...safeMissing]),
      leastCoveredThemes:Object.freeze([...safeMissing]),
      selectionPolicy:'DESIGNLESS_SAFE_MODE_DOES_NOT_ADVANCE_CONTENT_BREADTH_COVERAGE'
    }),
    scoredThemes:Object.freeze([]),
    coherentContentBundle:Object.freeze(
      focus==='PRESENTATION'
        ?['EXISTING_RENDER_BINDING_QUALITY','EXISTING_CHARACTER_ENEMY_ENVIRONMENT_READABILITY','EXISTING_MOTION_VFX_CAMERA_UI_COHERENCE']
        :focus==='USABILITY'
          ?['EXISTING_TOUCH_INPUT_AND_CONTROL_REACHABILITY','EXISTING_HUD_MENU_INFORMATION_FLOW','EXISTING_MOBILE_FEEDBACK_AND_ACCESSIBILITY']
          :['EXISTING_RUNTIME_STATE_RECOVERY','EXISTING_SAVE_RESTORE_INVARIANTS','EXISTING_PERFORMANCE_AND_ERROR_RECOVERY']
    ),
    existingCompletenessReview:Object.freeze({
      requiredEveryBuildUp:true,
      mode:'SOURCE_SAFE_EXISTING_SYSTEM_QUALITY_ONLY_UNTIL_DESIGN_AVAILABLE',
      dimensions:Object.freeze([...(DESIGNLESS_SAFE_BUILD_UP_DOMAINS[focus]||[])])
    }),
    derivedRuleEvolution:Object.freeze({
      allowed:false,
      rule:'NO_NEW_GAMEPLAY_PROGRESSION_ECONOMY_QUEST_OR_WORLD_RULE_WITHOUT_VERIFIED_OR_MINIMUM_DESIGN',
      examples:Object.freeze([]),
      protected:Object.freeze(['CORE_RULES','BALANCE','ECONOMY','SAVE_MEANING','PROGRESSION','QUEST_MEANING','NETWORK_AUTHORITY'])
    }),
    completionAcceptance:Object.freeze([
      'REAL_GAME_SOURCE_DELTA_REQUIRED','SOURCE_OBSERVED_SAFE_QUALITY_EFFECT_REQUIRED',
      'NO_NEW_GAMEPLAY_OR_PROGRESSION_SEMANTIC_WITHOUT_DESIGN','EXISTING_RELEVANT_INCREMENTAL_QA_PASSES',
      'DATA_CAPACITY_BUDGET_RESPECTED_WITHOUT_TERMINATING_BUILD_UP'
    ])
  }):designSourceBuildUp.revisionRequiredForNewGameplay?Object.freeze({
    ...autonomousContentExpansionBase,
    // 검증된 소스가 전진했지만 동일 승인 설계가 유지됐으면,
    // 기존 승인 규칙의 실제 구현·결함 복구는 계속하고 새로운 규칙 발명만 금지한다.
    executionMode:'APPROVED_DESIGN_SOURCE_BUILD_UP_WHILE_DESIGN_REVISION_PENDING',
    designRevisionRequiredForNewGameplay:true,
    derivedRuleEvolution:Object.freeze({
      ...(autonomousContentExpansionBase.derivedRuleEvolution||{}),
      allowed:false,
      rule:'NEW_GAMEPLAY_RULES_REQUIRE_REVIEWED_CURRENT_DESIGN_REVISION; CONTINUE_APPROVED_SYSTEM_SOURCE_AND_SAFE_REPAIRS'
    }),
    completionAcceptance:Object.freeze([
      ...(autonomousContentExpansionBase.completionAcceptance||[]),
      'NO_UNAPPROVED_NEW_GAMEPLAY_WHILE_DESIGN_REVISION_PENDING',
      'EXACT_SOURCE_RUNTIME_QA_AND_FEEDBACK_REQUIRED'
    ])
  }):autonomousContentExpansionBase;
  const systemNames=design.signatureSystems.map(x=>x.name).filter(Boolean);
  const gameplay=[
    `우선 책임 소스 앵커 ${exactAnchorLabel}에서 현재 행동→상태 변화→피드백 연결을 직접 수정하고 wrapper나 우회 경로를 추가하지 않는다.`,
    `${anchor}를 설명/마커가 아니라 실제 authoritative game state와 플레이어 입력에 연결하고 성공·실패·재시도 경로를 완성한다.`,
    `${secondary}가 다음 선택을 바꾸도록 상태 변화와 피드백을 연결한다.`,
    ...design.coreLoop.map((step,index)=>`기획 루프 ${index+1} "${step}": 현재 책임 함수와 실제 조작 경로를 대조한다. 누락되면 기존 구현에서 보강하고, 입력 전 조건→실제 입력→장르에 맞는 상태/화면 변화→다음 단계 연결을 같은 플랫폼에서 재현한다. 버튼 제목이나 공통 점수 증가만으로 이 단계를 구현했다고 판정하지 않는다.`),
    ...design.signatureSystems.map(system=>`고유 시스템 "${system.name||system.purpose}": 플레이어 선택 "${system.playerChoice||system.purpose}"이 실제 결과를 달리 만드는지 두 선택의 결과를 비교한다. 코드 키워드·설명·자체 PASS 로그는 증거가 아니며, 실측하지 못하면 미확인으로 남기고 완료/효과 확인에 포함하지 않는다.`),
    systemNames.length?`고유 시스템 ${systemNames.join(', ')} 중 이번 목표와 직접 연결된 시스템을 기존 책임 코드에서 심화한다.`:'현재 핵심 루프의 가장 얕은 책임 시스템을 기존 코드에서 직접 심화한다.',
    focus==='CORE_FUN'?'주요 적/대상/상호작용이 행동·타이밍·카운터플레이 중 최소 두 축에서 구별되게 한다.':'핵심 게임플레이 의미는 보존하면서 이번 품질축에 필요한 연결만 수정한다.'
  ];
  const progression=[
    `${design.progressionDirection||'승인된 진행 방향'}을 현재 루프의 실제 목표·보상·해금·콘텐츠 연결로 구현/심화한다.`,
    '새 콘텐츠는 기존 핵심 루프와 연결되어야 하며 단순 수량 복제나 색/수치만 다른 변형으로 채우지 않는다.',
    '맵/지역이 있는 게임은 면적만 늘리지 말고 새 지역 역할·연결 경로·잠금/해금·랜드마크·조우/자원 역할·발견 피드백이 구별되도록 확장한다.',
    '인벤토리/장비/제작/상점/퀘스트가 존재하면 서로 같은 authoritative 상태를 사용해 실제 플레이와 연결하고 고립된 메뉴 기능으로 남기지 않는다.',
    '초반 10분과 중후반을 각각 점검해 초반 학습·첫 보상과 중후반 전략/콘텐츠 확장이 모두 실제 소스와 플레이 흐름에 존재하게 한다.',
    '콘텐츠 확장은 배경·지역·몹·아이템·퀘스트·스토리·보상·규칙 중 관련 요소를 서로 연결된 묶음으로 설계하고, 한 요소만 고립해서 개수만 늘리는 업데이트를 피한다.',
    '이전 세대와 이름·색·수치만 다른 복제 콘텐츠를 추가하지 말고 역할·행동·플레이어 선택·세계 이유·결과/보상·시스템 연결 중 최소 두 축 이상에서 실제 차이를 만든다.',
    '새 스토리·퀘스트·지역·규칙은 이전 상태에서 왜 발생하고 완료 후 무엇이 달라지는지 게임 상태와 세계 흐름에 남겨 개연성과 진행 연결을 유지한다.',
    '승인된 인과 문법이 있으면 새 지역·몬스터·NPC·아이템·세력은 같은 법칙을 복제하지 말고 서로 다른 방식으로 전달·왜곡·상속·분산·역전시켜 새 선택 구조를 만든다.',
    '가벼운 D1 엽기/코믹 문법은 억지로 장대한 신화·정치 구조로 키우지 않는다. 단순한 농담 규칙이라도 실제 상태 변화와 후폭풍이 반복 가능하면 깊이 있는 정체성으로 인정한다.'
  ];
  const ux=[
    '핵심 행동, 위험, 현재 목표, 다음 선택을 모바일 화면에서 우선순위가 명확하게 보이게 한다.',
    '터치 입력은 실제 게임 상태 변화에 연결하고 키보드/검증용 우회 입력이 모바일 PASS를 대신하지 못하게 한다.',
    '실패/재시도/복귀 시 플레이어가 무엇이 유지되고 무엇이 초기화되는지 즉시 알 수 있게 한다.',
    'HUD·메뉴·인벤토리·장비·설정은 같은 UI 디자인 언어와 정보 우선순위를 사용하고 뒤로가기/닫기/스크롤/팝업 중첩을 모바일에서 검증한다.',
    '반복 조작은 편의 기능으로 줄이되 핵심 플레이 선택과 위험/보상 판단을 자동화하지 않는다.'
  ];
  const acceptance=[
    'CURRENT_GAME_SOURCE_CHANGED_IN_RESPONSIBLE_SYSTEM',
    'WORKFLOW_QA_HOMEPAGE_ONLY_CHANGE_DOES_NOT_COUNT',
    'GAMEPLAY_CLAIM_REQUIRES_OBSERVABLE_GAME_STATE_DELTA',
    'VISUAL_CLAIM_REQUIRES_ACTUAL_RENDERED_DELTA',
    'BEFORE_AFTER_OR_VERIFIED_BASELINE_COMPARISON',
    'NO_PROTECTED_SAVE_BALANCE_ECONOMY_NETWORK_SEMANTIC_REGRESSION',
    'FOUNDATION_ONLY_REPAIR_COUNTS_ONLY_WHEN_FOUNDATION_IS_THIS_DIRECTIVE_PRIMARY_VERIFIED_GAP',
    'HOLISTIC_CORE_DOMAINS_CLASSIFIED_PASS_GAP_OR_NOT_APPLICABLE',
    'EXISTING_APPLICABLE_GAP_CANNOT_BE_SILENTLY_SKIPPED',
    'FIRST_10_MINUTES_AND_SESSION_FLOW_REVIEWED',
    'MAP_INVENTORY_UI_CONVENIENCE_AND_SYSTEM_CONNECTION_REVIEWED_WHEN_APPLICABLE',
    'MOTION_UI_INVENTORY_AUDIO_VFX_CAMERA_WORLD_MOBILE_PERFORMANCE_TRACKS_REVIEWED',
    'PRESENCE_ONLY_OR_MARKER_ONLY_CANNOT_CLOSE_PLAYER_FACING_QUALITY',
    'SAME_SCENE_BEFORE_AFTER_RUNTIME_REOBSERVATION_REQUIRED_FOR_EXPERIENCE_BUILD_UP',
    'ROBLOX_EXPERIENCE_BUILD_UP_REQUIRES_EXACT_REMOTE_EVIDENCE_NO_LOCAL_MANUAL_INSPECTION',
    'AUTONOMOUS_CONTENT_EXPANSION_STAYS_INSIDE_EXISTING_BUILD_UP',
    'CONTENT_EXPANSION_MUST_BE_COHERENT_CONNECTED_AND_NON_CLONE',
    'GAME_IDENTITY_THREE_SENTENCE_TEST_PRESERVED_OR_STRENGTHENED',
    'REPRESENTATIVE_ACTION_CHOICE_SIGNATURE_WORLD_RULE_AND_GROWTH_IDENTITY_REVIEWED',
    'GENRE_PRIMARY_ACTION_PRESERVED_WITHOUT_FORCED_RPG_SYSTEMS',
    'APPROVED_CAUSAL_GAME_GRAMMAR_PRESERVED_OR_MUTATED_WITH_REAL_STATE_EFFECT',
    'MAIN_A_B_MAJOR_AXES_AND_c_SUB_ELEMENTS_ROLE_PRESERVED',
    'AT_DELVE_LAYER_IS_NOT_GENERAL_SYSTEM_AXIS',
    'EXISTING_GAME_GRAMMAR_DISCOVERED_FROM_CURRENT_DESIGN_AND_SOURCE_BEFORE_EXPANSION',
    'CHARACTER_MONSTER_REGION_STORY_SHARE_CAUSAL_WORLD_LAW_WHEN_APPLICABLE',
    'DESIGNED_SYSTEM_CONTENT_VOLUME_TRACED_TO_EXACT_SOURCE_AND_PLAY_EVIDENCE',
    'EXISTING_COMPLETENESS_RECHECK_REQUIRED_EVERY_BUILD_UP',
    'WEB_ROBLOX_UNITY_COMMON_EXPANSION_CONTRACT'
  ];
  const safeGameplay=[
    '현재 소스에 이미 존재하는 행동·상태·화면 연결만 읽고 수정한다. 새 핵심 규칙·밸런스·경제·퀘스트·진행 의미를 추측해 만들지 않는다.',
    'wrapper나 우회 경로를 추가하지 말고 이번 안전 품질축의 기존 책임 함수/렌더/UI/상태 복구 경로를 직접 수정한다.',
    '변경 전후를 실제 브라우저/관련 QA에서 비교하고 기존 저장·진행·전투·권한 의미가 그대로인지 확인한다.'
  ];
  const safeProgression=[
    '검증된 또는 최소 디자인이 생기기 전에는 새 목표·보상·해금·지역·퀘스트·경제·게임 규칙을 추가하지 않는다.',
    '기존 콘텐츠의 가독성·입력·표현·안정성만 개선하고 게임 의미를 확장하지 않는다.'
  ];
  const effectiveGameplay=safeDesignlessMode?safeGameplay:gameplay;
  const effectiveProgression=safeDesignlessMode?safeProgression:progression;
  const effectiveAcceptance=safeDesignlessMode?[
    'CURRENT_GAME_SOURCE_CHANGED_IN_RESPONSIBLE_SYSTEM',
    'BEFORE_AFTER_OR_VERIFIED_BASELINE_COMPARISON',
    'NO_NEW_CORE_RULE_BALANCE_ECONOMY_PROGRESSION_QUEST_OR_SAVE_MEANING',
    'NO_PROTECTED_SAVE_BALANCE_ECONOMY_NETWORK_SEMANTIC_REGRESSION',
    'DESIGNLESS_SAFE_FOCUS_ONLY_PRESENTATION_USABILITY_STABILITY',
    'EXISTING_PLAYER_FACING_MOTION_UI_INVENTORY_AUDIO_VFX_CAMERA_QUALITY_REVIEWED_WHEN_APPLICABLE',
    'OWNER_DISABLED_AUDIO_CATEGORIES_PRESERVED',
    'EXISTING_RELEVANT_INCREMENTAL_QA_PASSES'
  ]:acceptance;
  const nextCandidates=safeDesignlessMode
    ?uniq(['CONTINUE_SOURCE_SAFE_'+focus+'_QUALITY','REQUEST_MINIMUM_OR_VERIFIED_DESIGN_FOR_GAMEPLAY_EXPANSION','OPTIMIZE_MOBILE_FRAME_INPUT_RENDER_OR_STATE_BOTTLENECK_WHEN_VERIFIED'])
    :uniq([
      focus==='CORE_FUN'?'CONNECT_CORE_FUN_TO_PROGRESSION_AND_CONTENT_VARIETY':'DEEPEN_CORE_FUN_DECISION_DENSITY',
      focus==='PRESENTATION'?'CONNECT_VISUAL_LANGUAGE_TO_GAMEPLAY_TELEGRAPH_AND_WORLD_IDENTITY':'RAISE_VISUAL_ACTING_MOTION_AND_ENVIRONMENT_COHERENCE',
      'CLOSE_NEXT_HIGHEST_VALUE_GAP_FROM_RUNTIME_OR_PLAYTEST',
      'OPTIMIZE_MOBILE_FRAME_INPUT_RENDER_OR_STATE_BOTTLENECK_WHEN_VERIFIED'
    ]);
  const developmentImpact=classifyDevelopmentImpact({
    platform,responsibleFiles:topFiles,qualityGapMap:states
  });
  const preMutationDryRun=buildDevelopmentDryRun({
    gameId:id,platform,responsibleSystemsAndFiles:{files:topFiles},qualityGapMap:states,developmentImpact
  });
  const productionPlatform=clean(platform).toUpperCase()==='WEB'&&sourceRoot.split('|').some(root=>posix(root)==='unity-games/'+id)?'UNITY_WEB':platform;
  // 현재 저장소의 모든 1차 게임용 코드 라이브러리를 기존 제작 지시에서 자동 인덱싱한다.
  // 실제 게임에 없는 시스템은 추가하지 않고 외부 코드를 임의로 설치하지 않는다.
  let availableLibraryPaths=[];
  try{
    availableLibraryPaths=fs.readdirSync(path.join(repoRoot,'assets'),{withFileTypes:true})
      .filter(entry=>entry.isFile()&&/^[a-z][a-z0-9-]*\.js$/i.test(entry.name))
      .map(entry=>'assets/'+entry.name).sort();
  }catch{}
  // [플랫폼 권한] 공통 빌드업은 전 게임을 분석하지만, 자동 제작 계획은 중앙정책상 실제 허용된 플랫폼만 생성한다.
  const verifiedRoadmap=readJson(path.join(repoRoot,clean(process.env.COMPANY_VERIFIED_POLICY_PATH)||'__retired_policy_not_available__'),{});
  const ownerPlatform=clean(productionPlatform).toUpperCase()==='WEB'?'WEB':
    clean(productionPlatform).toUpperCase()==='UNITY_WEB'?'UNITY_WEB':
      ['UNITY','UNITY_APP','UNITY_ANDROID'].includes(clean(productionPlatform).toUpperCase())?'UNITY':
        clean(productionPlatform).toUpperCase()==='ROBLOX'?'ROBLOX':'';
  // [최신 소유자 권한] 폐기된 지시/원시 developmentAccess가 최신 승인 범위를 덮지 못한다.
  const approvedOwnerScope=resolveActiveOwnerPolicy(verifiedRoadmap,{allowMissing:true});
  const productionAuthorized=approvedOwnerScope
    ? approvedOwnerScope.activeTargets.includes(ownerPlatform)
      &&approvedOwnerScope.effectiveDevelopmentAccess[ownerPlatform]==='ALWAYS_ALLOWED'
    : ownerPlatform==='ROBLOX';
  const productionPlan=productionAuthorized?buildRobloxProductionPlan({
    gameId:id,platform:productionPlatform,design,source,sourceRoot,responsibleFiles:topFiles,availableLibraryPaths,
    previousPlan:previousDirective?.productionPlan||previousDirective?.robloxProductionPlan,focus,
    repair:['CAUSAL_REPAIR'].includes(clean(nextActionDecision?.action).toUpperCase())||keepPriorFocus,
    safeDesignlessMode,policy:verifiedRoadmap?.robloxStudioProductionFlowContract||{}
  }):null;
  return Object.freeze({
    version:2,
    directiveId:`${id}-build-up-g${generation}-${fingerprint.slice(0,12)}`,
    directiveFingerprint:fingerprint,
    previousDirectiveFingerprint:previousFingerprint||null,
    forbiddenRepeatFingerprint:previousFingerprint||null,
    gameId:id,
    gameName:clean(gameName)||id,
    generation,
    developmentDepth:depthInfo.developmentDepth,
    escalationStage:depthInfo.escalationStage,
    escalationMode:depthInfo.escalationMode,
    previousDirectiveOutcome:depthInfo.previousOutcome,
    designContextMode:safeDesignlessMode?'SOURCE_SAFE_NO_DESIGN':'APPROVED_OR_MINIMUM_DESIGN',
    platform:clean(platform).toUpperCase()||'COMMON',
    sourceRoot:posix(sourceRoot),
    sourceTreeFingerprint:source.sourceTreeFingerprint,
    designFingerprint:currentDesignFingerprint,
    designSourceBuildUp,
    identityReinforcement,
    designToPlatformCodingTrace,
    designedGameVolume,
    designImplementationContext:Object.freeze({
      source:'LATEST_VERIFIED_DESIGN_FIELDS',
      // 오토 바이옴의 월드 지오메트리·생태계 입력은 검증된 동일 게임 설계에서 가져온다.
      detailedDesign:design.detailedDesign,
      ...(design.detailedAssetLibraryHandoff?.platformSelection?{detailedAssetLibraryHandoff:design.detailedAssetLibraryHandoff}:{}),
      tutorialPlan:design.tutorialPlan,
      presentationPlan:design.presentationPlan,
      interfacePlan:design.interfacePlan,
      verificationPlan:design.verificationPlan,
      spatialLayout:design.spatialLayout,
      spatialDimension:design.spatialDimension,
      creativeGrammar:design.creativeGrammar,
      coreFun:design.coreFun,
      coreLoop:design.coreLoop,
      signatureSystems:design.signatureSystems,
      systemInterconnections:design.systemInterconnections,
      progressionDirection:design.progressionDirection,
      progressionEconomyBalance:design.progressionEconomyBalance,
      contentExpansionPlan:design.contentExpansionPlan,
      failureRetryRisk:design.failureRetryRisk,
      platformFitPlan:design.platformFitPlan,
      platformProfiles:design.platformProfiles,
      webCanonicalDesign:design.webCanonicalDesign,
      platformExpansionPolicy:design.platformExpansionPolicy,
      visualDirection:design.visualDirection,
      mobileUx:design.mobileUx,
      uxAccessibilityPlan:design.uxAccessibilityPlan,
      artAudioDirection:design.artAudioDirection,
      selectedDesignPlan:design.selectedDesignPlan,
      contentVarietyPlan:design.contentVarietyPlan,
      narrativeDialoguePlan:design.narrativeDialoguePlan,
      implementationTraceability:design.implementationTraceability,
      stabilityPriorityPlan:design.stabilityPriorityPlan,
      preservationContract:design.preservationContract
    }),
    gameIdentityAndNonNegotiables:{
      identity,
      coreFun:design.coreFun,
      coreLoop:design.coreLoop,
      signatureSystems:design.signatureSystems,
      progressionDirection:design.progressionDirection,
      multiplayerMode:design.multiplayerMode,
      preserve:['CORE_IDENTITY','APPROVED_RULE_SEMANTICS','BALANCE_VALUES_UNLESS_AUTHORIZED','ECONOMY_MEANING_UNLESS_AUTHORIZED','SAVE_MEANING','NETWORK_AUTHORITY']
    },
    currentImplementationFindings:{sourceObservations:source.observations,signals:source.signals,topFiles:source.topFiles,sourceAnchors:source.sourceAnchors||[]},
    previousVersionDelta:previousDirective?{previousGoal:previousDirective.thisLoopPrimaryGoal||null,previousFocus:previousDirective.primaryFocus||null,previousGeneration:previousDirective.generation||null,previousSourceTreeFingerprint:previousDirective.sourceTreeFingerprint||null,currentSourceTreeFingerprint:source.sourceTreeFingerprint,sourceChanged:depthInfo.sourceChangedSincePrevious,verifiedEvolution:depthInfo.verifiedEvolution}:{state:'NO_PREVIOUS_DIRECTIVE'},
    playtestRuntimeFindings:runtimeEvidence&&Object.keys(runtimeEvidence).length?runtimeEvidence:{state:'UNKNOWN_NOT_INVENTED'},
    multiplayerImplementation:Object.freeze({
      required:multiplayerRequired,policyVersion:multiplayerPolicy.version||0,
      developmentAdmissionGate:false,missingImplementationAction:'EXISTING_BUILD_UP_LOCAL_IMPLEMENTATION_AND_RETRY',
      otherGamesAndIndependentWorkContinue:true,actualMultiplayerPlayVerified:false,
      completionEvidence:multiplayerPolicy.completionEvidence||null
    }),
    qualityGapMap:states,
    allDomainImplementationDirectives,
    detectedGaps:gaps,
    primaryFocus:focus,
    thisLoopPrimaryGoal:goal,
    primaryGoalReason:foundationRepairRequired
      ?`실제 runtime 실패가 관찰됐다(${clean(runtimeEvidence?.failureStage)||'RUNTIME'} / ${clean(runtimeEvidence?.failureSignature)||'UNKNOWN_FAILURE'}). 콘텐츠·그래픽 확장보다 기본 플레이 foundation의 원인 시스템 복구를 먼저 완료하고 같은 실패 시나리오를 다시 검증한다. 책임 소스는 ${exactAnchorLabel}이다.`
      :safeDesignlessMode
        ?`검증된/최소 디자인이 아직 없어 ${focus}만 기존 실제 소스에서 안전하게 개선한다. 새 게임 규칙·진행·밸런스 의미는 만들지 않으며 책임 소스 ${exactAnchorLabel}의 전후 품질 차이만 검증한다.`
        :depthInfo.escalationMode==='VERIFIED_STATUS_WITHOUT_GAME_SOURCE_DELTA_RETRY'?`직전 루프가 verified 상태를 기록했지만 실제 게임 source tree가 바뀌지 않았다. ${focus} 목표를 완료로 계산하지 않고 "${anchor}" 책임 소스 ${exactAnchorLabel}에서 실제 플레이 가치 변화가 생기는 구현으로 다시 지시한다.`:`현재 검증 신호와 소스에서 ${focus}를 우선한다. 게임 고유 앵커는 "${anchor}", 현재 책임 소스는 ${exactAnchorLabel}이며 실제 source delta와 효과 증거가 다음 결정을 좌우한다.`,
    gameplayImplementationDirectives:effectiveGameplay,
    progressionContentWorldDirectives:effectiveProgression,
    autonomousContentExpansion,
    internalAssetEvolution:{
      required:true,
      generation,
      previousGeneration:Math.max(0,generation-1),
      evaluateAllLibrariesAndFamiliesEveryCycle:true,
      sourceFingerprint:source.sourceTreeFingerprint,
      priorSourceFingerprint:previousDirective?.sourceTreeFingerprint||null,
      previousRuntimeEffect:previousEffectiveness.classification,
      replacementMode:'COMPATIBLE_REPLACEMENT_OR_RECOMPOSITION_IN_EXISTING_RESPONSIBLE_SOURCE',
      currentLibrarySelectionAndSourceHashesRequired:true,
      sourceMutationRequiredWhenBindingMissingStaleOrQualityGapExists:true,
      unchangedVerifiedBindingMayBeReused:true,
      strongIdentityAndManualLocksPreserved:true,
      randomSwapOrMarkerOnlyGrowthForbidden:true,
      codeQualityAndApprovedContentExpansionMustContinue:true,
      previousFailureRequiresCausalRepairBeforeRepeatingStrategy:true,
      runtimeAndDeploymentEvidenceRequired:true,
      returnToNextBuildUpAfterF9:true,
      generationLimit:null,
      shadowPipelineForbidden:true
    },
    gameInternalAutoComposition:buildGameInternalAutoCompositionPlan({gameId:id,platform,repoRoot,sourceRoot,sourceObservation:source,design}),
    visualBuildUpDirective:buildVisualDirective({gameId:id,design,source,focus,platform}),
    playerFacingInspectionContract:buildPlayerFacingInspectionContract({gameId:id,platform,source,states,responsibleFiles:topFiles}),
    experienceBuildUpContract:buildExperienceBuildupContract({platform,design,source,focus}),
    uxInputDirectives:ux,
    platformAdaptationDirectives:platformDirectives({identity,goal}),
    robloxNativeExecution,
    productionPlan,
    robloxProductionPlan:productionPlan?.platform==='ROBLOX'?productionPlan:null,
    internalAlgorithmUse:Object.freeze({
      mode:'MAXIMIZE_TASK_RELEVANT_VERIFIED_INTERNAL_ALGORITHMS',
      priority:Object.freeze([
        'SAME_GAME_SAME_FAILURE_VERIFIED_CAUSAL_AND_CODE_PATTERN',
        'SAME_GAME_VERIFIED_IMPLEMENTATION_AND_RESPONSIBILITY',
        'EXISTING_VIBE2_VIBE3_ANALYSIS_STRATEGY_RECOMBINATION_AND_GAMEPLAY_TOOLS',
        'EXISTING_VERIFIED_GAME_MECHANICS_ASSETS_AND_SOURCE_COMPOSITION',
        'AUTHORIZED_AI_COLLABORATION_ON_DISJOINT_RESPONSIBILITY_WITH_CANDIDATE_BRANCH_QA'
      ]),
      relevantAlgorithmsOnly:true,
      aiCollaboration:Object.freeze({
        authority:'company-learning/platform-release-roadmap.json#externalAiVibeFullProcessCollaboration',
        vibePrimaryIntegrationAndLearning:true,
        approvedExternalAiMayImplementOnIsolatedCandidateBranch:true,
        existingAuthorizedAiRoles:Object.freeze(['PLANNING','DESIGN','IMPLEMENTATION','REPAIR','QA','ASSETS','PLATFORM_ADAPTATION']),
        sameResponsibleFileConflictSerialized:true,
        disjointResponsibleFilesMayRunParallel:true,
        externalAiUseRequiresExistingOptInAndAuthorization:true,
        deterministicallyVerifiedOutcomesFeedExistingLearningMotor:true,
        externalAiCannotWriteMainOrCentralPolicyOrApproveOwnWork:true
      }),
      noDuplicateSubsystemsOrNewPipeline:true,
      noUnverifiedCapabilityClaims:true,
      preserveApprovedGameplaySaveEconomyAndServerAuthority:true,
      qaReleaseSecurityGatesUnchanged:true,
      rule:'AI_COLLABORATION_VIBE_PRIMARY_INTEGRATION_AND_LEARNING; MAXIMIZE_RELEVANT_VERIFIED_INTERNAL_ALGORITHMS_AND_SAME_GAME_SAME_FAILURE_PATTERNS; AUTHORIZED_EXTERNAL_AI_MAY_DEVELOP_AND_REPAIR_ON_ISOLATED_CANDIDATE_BRANCHES_WITH_RESPONSIBLE_FILE_SCOPE_WHEN_ENABLED; PARALLEL_DISJOINT_FILES_SERIALIZE_CONFLICTS; DETERMINISTIC_QA_SECURITY_AND_CANONICAL_RELEASE_REQUIRED; FEED_VERIFIED_RESULTS_TO_EXISTING_LEARNING_MOTOR; NEVER_CREATE_SHADOW_PIPELINE_OR_FABRICATE_PASS'
    }),
    preserveConstraints:[
      '게임 제작은 Vibe와 승인된 AI 협업으로 진행한다. 검증된 내부 분석·게임 로직·전략선택·재조합·에셋 재사용 알고리즘을 과제 관련 범위에서 최대 활용한다. 외부 AI는 기존 승인·활성화 조건 아래 격리 후보 브랜치의 독립 책임 파일에 직접 구현·수리 가능하며 Vibe가 통합·학습한다. 중앙정책·QA·보안·배포 게이트를 유지하고 중복 파이프라인·미검증 주장은 금지한다.',
      '기존 세이브 키와 의미를 명시적 마이그레이션 없이 변경하지 않는다.',
      '승인 없는 밸런스/경제/보상/드랍/쿨다운/히트 의미 변경 금지.',
      '멀티플레이 권한과 authoritative state를 프레젠테이션 이유로 클라이언트로 이동하지 않는다.',
      'wrapper/shadow/temporary override 대신 기존 책임 시스템을 직접 수정한다.'
    ],
    responsibleSystemsAndFiles:{files:topFiles,sourceAnchors:sourceResponsibilities,selectionRule:'DIRECT_GAME_RESPONSIBILITY_AND_DESIGN_INTENT_FIRST',exactSourceAnchorRequired:true,currentAndIntendedBehaviorRequiredPerPrimaryAnchor:true},
    developmentImpact,
    preMutationDryRun,
    effectivenessMeasurement:{expectedPlayerEffect:expectedEffect,previousGeneration:previousEffectiveness,baseline:{sourceTreeFingerprint:source.sourceTreeFingerprint,runtimeObserved:runtimeEvidence?.runtimeObserved===true,runtimePassed:runtimeEvidence?.runtimePassed===true,failureStage:clean(runtimeEvidence?.failureStage)||null,failureSignature:clean(runtimeEvidence?.failureSignature)||null},requiredPostChangeEvidence:['CHANGED_GAME_FILES','POST_CHANGE_SOURCE_TREE_FINGERPRINT','RELEVANT_QA_OR_RUNTIME_RESULT','OBSERVED_PLAYER_VALUE_EFFECT'],sourceDeltaAloneDoesNotProvePlayerValueImprovement:true},
    nextActionDecision,
    acceptanceEvidence:[...effectiveAcceptance,'PLAYER_FACING_APPLICABLE_SCENARIOS_REVIEW_REQUIRED','THUMBNAIL_TRANSPORT_CANNOT_CLOSE_VISUAL_QUALITY','MISSING_EXACT_RENDER_EVIDENCE_REMAINS_UNVERIFIED'],
    nextEscalationCandidates:nextCandidates,
    loopEscalation:{automatic:true,nextGeneration:generation+1,currentDevelopmentDepth:depthInfo.developmentDepth,nextDevelopmentDepth:depthInfo.advanceAllowed?depthInfo.developmentDepth+1:depthInfo.developmentDepth,escalationStage:depthInfo.escalationStage,escalationMode:depthInfo.escalationMode,sourceChangedSincePrevious:depthInfo.sourceChangedSincePrevious,verifiedEvolution:depthInfo.verifiedEvolution,reuseSameGoalWithoutNewEvidence:false,completedGoalBecomesBaseline:depthInfo.verifiedEvolution},
    coverage:{
      allDomainsConsidered:true,
      domainCount:BUILD_UP_DOMAINS.length,
      visualDomainCount:VISUAL_DOMAINS.length,
      experienceTrackCount:EXPERIENCE_BUILD_UP_TRACKS.length,
      experienceBuildUpPlatform:clean(platform).toUpperCase()||'COMMON',
      robloxExtraExperienceAttention:clean(platform).toUpperCase()==='ROBLOX',
      allowedStates:['PASS','GAP','NOT_APPLICABLE'],
      holisticCoreDomains:HOLISTIC_CORE_DOMAINS,
      holisticGaps:states.filter(x=>HOLISTIC_CORE_DOMAINS.includes(x.domain)&&x.state==='GAP').map(x=>x.domain),
      notApplicable:states.filter(x=>x.state==='NOT_APPLICABLE').map(x=>x.domain),
      silentApplicableGapOmissionForbidden:true
    },
    generatedAt:new Date().toISOString()
  });
}

function parseArgs(argv=process.argv.slice(2)){
  const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const at=raw.indexOf('=');if(at<0)out[raw.slice(2)]=true;else out[raw.slice(2,at)]=raw.slice(at+1);}return out;
}
function cli(){
  const args=parseArgs();
  const gameId=clean(args['game-id']);
  const designFile=clean(args.design);
  const sourceRoot=clean(args['source-root']);
  if(!gameId||!designFile)throw new Error('required: --game-id --design');
  const repoRoot=path.resolve(clean(args.root)||process.cwd());
  const designRecord=readJson(path.resolve(repoRoot,designFile),{});
  const previousFile=clean(args.previous);
  const runtimeFile=clean(args['runtime-evidence']);
  const previousDirective=previousFile?readJson(path.resolve(repoRoot,previousFile),null):null;
  const runtimeEvidence=runtimeFile?readJson(path.resolve(repoRoot,runtimeFile),{}):{};
  const directive=buildGameSpecificBuildUpDirective({
    gameId,gameName:clean(args['game-name']),platform:clean(args.platform)||'COMMON',
    designRecord,repoRoot,sourceRoot,previousDirective,runtimeEvidence
  });
  const outputRoot=path.resolve(repoRoot,clean(args['output-root'])||'company-build-up');
  const gameRoot=path.join(outputRoot,gameId),history=path.join(gameRoot,'history');
  fs.mkdirSync(history,{recursive:true});
  fs.writeFileSync(path.join(gameRoot,'current.json'),JSON.stringify(directive,null,2)+'\n');
  fs.writeFileSync(path.join(history,`${String(directive.generation).padStart(4,'0')}-${directive.directiveId}.json`),JSON.stringify(directive,null,2)+'\n');
  console.log('BUILD_UP_DIRECTIVE_ID='+directive.directiveId);
  console.log('BUILD_UP_GENERATION='+directive.generation);
  console.log('BUILD_UP_FOCUS='+directive.primaryFocus);
  console.log('BUILD_UP_SOURCE_TREE='+directive.sourceTreeFingerprint);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)cli();


