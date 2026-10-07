// DEVELOPMENT_CONFIRMED Roblox source bootstrap.
// Compiles an isolated, game-specific Luau source tree from the locked design baseline.
// This is source creation only: it never claims Roblox runtime, QA, regression, or release success.

import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {deriveApprovedScopeInventory} from './company-approved-scope-contract.mjs';
import {createRobloxVibe3LearningContext,decorateRobloxActionsWithLearning,ROBLOX_SEMANTIC_MAPPING_VERSION} from './vibe3-roblox-learning-context.mjs';

const clean=value=>String(value??'').trim();
const posix=value=>clean(value).replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const arg=(name,fallback='')=>process.argv.find(value=>value.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const luauString=value=>`"${String(value??'').replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r/g,'\\r').replace(/\n/g,'\\n')}"`;
function luauSemanticMappingRows(mappings=[],indent='      '){
  return (mappings||[]).map(row=>indent+'{ PrincipleId = '+luauString(row.principleId)+', SourceLearningId = '+luauString(row.sourceLearningId)+', CoreKind = '+luauString(row.coreKind||'')+', Disposition = '+luauString(row.disposition||'')+', Scope = '+luauString(row.scope||'')+', Domain = '+luauString(row.domain||'')+', Domains = { '+(row.domains||[]).map(luauString).join(', ')+' }, Mapping = '+luauString(row.mapping||'')+', Implementation = '+luauString(row.implementation||'')+', Variant = '+luauString(row.variant||'')+' },').join('\n');
}
function luauLearningDispositionRows(dispositions=[],indent='      '){
  return (dispositions||[]).map(row=>indent+'{ PrincipleId = '+luauString(row.principleId)+', SourceLearningId = '+luauString(row.sourceLearningId)+', Disposition = '+luauString(row.disposition||'')+', Scope = '+luauString(row.scope||'')+', Domains = { '+(row.domains||[]).map(luauString).join(', ')+' }, Mapping = '+luauString(row.mapping||'')+', Implementation = '+luauString(row.implementation||'')+', Reason = '+luauString(row.reason||'')+' },').join('\n');
}
const MODES=new Set(['SINGLE','COOP','COMPETITIVE','HYBRID']);
export const ROBLOX_VERIFIED_EXTERNAL_NATIVE_BINDING_VERSION=6;
export const ROBLOX_STUDIO_ASSET_REQUIRED_FAMILIES=Object.freeze([
  'CHARACTER','CREATURE','BUILDING','ENVIRONMENT','WEAPON','SKILL','MATERIAL','AUDIO','VFX','UI','MOTION','PROP'
]);
export const ROBLOX_STUDIO_ASSET_NATIVE_PATTERNS=Object.freeze({
  CHARACTER:/(?:Instance\.new\(["'](?:Model|MeshPart|Accessory|Attachment)["']\)|:\s*IsA\(["'](?:Humanoid|Accessory|Model|MeshPart|Attachment)["']\)|\bHumanoid\b|\bCharacter\b)/i,
  CREATURE:/(?:Instance\.new\(["'](?:Model|Part|MeshPart|Attachment|Bone|Motor6D)["']\)|:\s*IsA\(["'](?:Model|BasePart|Part|MeshPart|Attachment|Bone|Motor6D|Humanoid|AnimationController)["']\)|\bHumanoid\b|\bAnimationController\b)/i,
  BUILDING:/(?:Instance\.new\(["'](?:Model|Part|MeshPart|Attachment)["']\)|:\s*IsA\(["'](?:Model|BasePart|Part|MeshPart|Attachment)["']\)|\bClone\s*\()/i,
  ENVIRONMENT:/(?:\bTerrain\b|\bLighting\b|\bAtmosphere\b|Instance\.new\(["'](?:Model|Part|MeshPart|Atmosphere|Sky|Clouds)["']\)|:\s*IsA\(["'](?:Terrain|Atmosphere|Sky|Clouds|Model|BasePart|Part|MeshPart)["']\))/i,
  WEAPON:/(?:Instance\.new\(["'](?:Tool|Model|Part|MeshPart|Attachment|WeldConstraint)["']\)|:\s*IsA\(["'](?:Tool|Model|BasePart|Part|MeshPart|Attachment|WeldConstraint)["']\)|\bWeldConstraint\b)/i,
  SKILL:/(?:ParticleEmitter|Beam|Trail|Attachment|PointLight|SpotLight|SurfaceLight|Instance\.new\(["']Model["']\)|:\s*IsA\(["'](?:ParticleEmitter|Beam|Trail|Attachment|PointLight|SpotLight|SurfaceLight|Model)["']\))/i,
  MATERIAL:/(?:Enum\.Material|SurfaceAppearance|MaterialVariant|TextureID|\.Material\s*=|:\s*IsA\(["'](?:SurfaceAppearance|MaterialVariant)["']\))/i,
  AUDIO:/(?:SoundService|SoundId|Instance\.new\(["']Sound["']\)|:\s*IsA\(["'](?:Sound|SoundGroup)["']\))/i,
  VFX:/(?:ParticleEmitter|Beam|Trail|PointLight|SpotLight|SurfaceLight|:\s*IsA\(["'](?:ParticleEmitter|Beam|Trail|PointLight|SpotLight|SurfaceLight)["']\))/i,
  UI:/(?:ScreenGui|Frame|TextLabel|TextButton|ImageLabel|ImageButton|UIStroke|UICorner|UIGradient|:\s*IsA\(["'](?:GuiObject|LayerCollector|ScreenGui|Frame|TextLabel|TextButton|ImageLabel|ImageButton|UIStroke|UICorner|UIGradient)["']\))/i,
  MOTION:/(?:Animator|AnimationTrack|Animation|TweenService|Motor6D|Bone|RenderStepped|Heartbeat|:\s*IsA\(["'](?:Animator|Animation|Motor6D|Bone)["']\))/i,
  PROP:/(?:Instance\.new\(["'](?:Model|Part|MeshPart|ProximityPrompt|Attachment)["']\)|:\s*IsA\(["'](?:Model|BasePart|Part|MeshPart|ProximityPrompt|Attachment)["']\)|\bClone\s*\()/i
});

function stripManagedRobloxStudioAssetDetectionSource(text=''){
  return String(text||'')
    .replace(/-- VERIFIED_EXTERNAL_LEARNING_CLIENT_CONTEXT_BEGIN[\s\S]*?-- VERIFIED_EXTERNAL_LEARNING_CLIENT_CONTEXT_END/g,' ')
    .replace(/-- VERIFIED_EXTERNAL_LEARNING_CLIENT_RUNTIME_BEGIN[\s\S]*?-- VERIFIED_EXTERNAL_LEARNING_CLIENT_RUNTIME_END/g,' ')
    .replace(/-- VERIFIED_EXTERNAL_LEARNING_ROBLOX_NATIVE_BEGIN[\s\S]*?-- VERIFIED_EXTERNAL_LEARNING_ROBLOX_NATIVE_END/g,' ')
    .replace(/-- native-foundation-sentinel-v1 client readiness[\s\S]*?task\.defer\(reportNativeFoundationReady\)/g,' ')
    .replace(/-- native-foundation-sentinel-v1[\s\S]*?game:BindToClose\(function\(\) end\)/g,' ')
    .replace(/-- STUDIO_ASSET_DYNAMIC_BINDING_BEGIN[\s\S]*?-- STUDIO_ASSET_DYNAMIC_BINDING_END/g,' ')
    .replace(/-- STUDIO_ASSET_BINDING_CLIENT_BEGIN[\s\S]*?-- STUDIO_ASSET_BINDING_CLIENT_END/g,' ')
    .replace(/\bSTUDIO_ASSET_FAMILY_STATUS\s*=\s*\{[\s\S]*?\n\}/g,' ')
    .replace(/\bSTUDIO_ASSET_SELECTION\s*=\s*\{[\s\S]*?\n\}/g,' ')
    .replace(/--[^\n]*/g,' ');
}
export function robloxStudioAssetDetectionSourceFromRoot(root=''){
  const base=path.resolve(root),rows=[],stack=[base];
  while(stack.length){
    const current=stack.pop();
    let entries=[];
    try{entries=fs.readdirSync(current,{withFileTypes:true});}catch{continue;}
    for(const entry of entries){
      if(entry.isDirectory()){
        if(['.git','Packages','Binaries','Intermediate','Saved'].includes(entry.name))continue;
        stack.push(path.join(current,entry.name));
        continue;
      }
      if(!/\.(?:lua|luau)$/i.test(entry.name))continue;
      const absolute=path.join(current,entry.name);
      const relative=path.relative(base,absolute).replaceAll('\\','/');
      if(/(?:^|\/)GameConfig\.luau$/i.test(relative))continue;
      rows.push({relative,text:fs.readFileSync(absolute,'utf8')});
    }
  }
  return stripManagedRobloxStudioAssetDetectionSource(
    rows.sort((a,b)=>a.relative.localeCompare(b.relative)).map(row=>row.text).join('\n')
  );
}

function robloxStudioAssetSystemNearby(source='',semanticPattern,nativePattern,window=1200){
  const flags=semanticPattern.flags.includes('i')?'ig':'g';
  const matcher=new RegExp(semanticPattern.source,flags);
  for(const match of source.matchAll(matcher)){
    const index=Number(match.index||0);
    const slice=source.slice(Math.max(0,index-window),Math.min(source.length,index+String(match[0]||'').length+window));
    if(nativePattern.test(slice))return true;
  }
  return false;
}
export function detectRobloxStudioAssetSystems({sourceText='',clientSource='',serverSource=''}={}){
  const source=stripManagedRobloxStudioAssetDetectionSource([sourceText,clientSource,serverSource].filter(Boolean).join('\n'));
  const has=pattern=>pattern.test(source);
  const near=(semantic,native)=>robloxStudioAssetSystemNearby(source,semantic,native);
  const systems={
    CHARACTER:near(/\b(?:HumanoidDescription|avatar|npc|companion|character(?:Model|Visual|Appearance|Skin|Outfit|Rig)|outfit|armor)\b/i,ROBLOX_STUDIO_ASSET_NATIVE_PATTERNS.CHARACTER),
    CREATURE:near(/\b(?:enemy|enemies|monster|boss|creature|mob|wildlife|beetle|spider|wolf|bear|golem)\b/i,ROBLOX_STUDIO_ASSET_NATIVE_PATTERNS.CREATURE),
    BUILDING:near(/\b(?:building|house|shop|school|temple|castle|dungeon|interior|wall|roof|foundation|settlement|village|tower|gate)\b/i,ROBLOX_STUDIO_ASSET_NATIVE_PATTERNS.BUILDING),
    ENVIRONMENT:has(/(?:game:GetService\(["']Lighting["']\)|workspace\.Terrain\b|Instance\.new\(["'](?:Atmosphere|Sky|Clouds)["']\)|\bTerrain:)/i)
      ||near(/\b(?:biome|forest|desert|snow|swamp|cave|environment|landmark|tree|rock|road|path|water)\b/i,ROBLOX_STUDIO_ASSET_NATIVE_PATTERNS.ENVIRONMENT),
    WEAPON:near(/\b(?:weapon|sword|blade|spear|axe|hammer|bow|gun|staff|shield|loadout)\b/i,ROBLOX_STUDIO_ASSET_NATIVE_PATTERNS.WEAPON),
    SKILL:near(/\b(?:skill|ability|cast|projectile|beam|aoe|spell|ultimate|telegraph|summon|buff|debuff)\b/i,ROBLOX_STUDIO_ASSET_NATIVE_PATTERNS.SKILL),
    MATERIAL:has(ROBLOX_STUDIO_ASSET_NATIVE_PATTERNS.MATERIAL),
    AUDIO:has(ROBLOX_STUDIO_ASSET_NATIVE_PATTERNS.AUDIO),
    VFX:has(ROBLOX_STUDIO_ASSET_NATIVE_PATTERNS.VFX),
    UI:has(ROBLOX_STUDIO_ASSET_NATIVE_PATTERNS.UI),
    MOTION:has(ROBLOX_STUDIO_ASSET_NATIVE_PATTERNS.MOTION),
    PROP:near(/\b(?:prop|chest|crate|barrel|lamp|workbench|furniture|sign|pickup|resource|tree|rock)\b/i,ROBLOX_STUDIO_ASSET_NATIVE_PATTERNS.PROP),
  };
  return Object.freeze(Object.fromEntries(ROBLOX_STUDIO_ASSET_REQUIRED_FAMILIES.map(family=>[family,systems[family]===true])));
}
export function robloxStudioAssetFamilyStatusFromSource(source={}){
  const systems=detectRobloxStudioAssetSystems(source);
  return Object.freeze(Object.fromEntries(ROBLOX_STUDIO_ASSET_REQUIRED_FAMILIES.map(family=>[
    family,systems[family]===true?'APPLIED':'NOT_APPLICABLE'
  ])));
}

function robloxStudioAssetFamilyRefPattern(family=''){
  const value=clean(family);
  const legacyUiAtom=value==='UI'
    ?'|hasStudio(?:Asset)?Atom\\s*\\(\\s*["\\\'][^"\\\']+["\\\']\\s*\\)'
    :'';
  return new RegExp(
    '(?:studioAssetFamily\\s*\\(\\s*["\\\']'+value+'["\\\']'
      +'|hasStudio(?:Asset)?Atom\\s*\\(\\s*["\\\']'+value+'["\\\']'
      +legacyUiAtom
      +'|STUDIO_ASSET_SELECTION\\s*\\.\\s*'+value
      +'|STUDIO_ASSET_SELECTION\\s*\\[\\s*["\\\']'+value+'["\\\']\\s*\\])',
    'ig'
  );
}
function stripRobloxStudioAssetBindingDeclarations(text=''){
  return String(text||'')
    .replace(/-- STUDIO_ASSET_BINDING_CLIENT_BEGIN[\s\S]*?-- STUDIO_ASSET_BINDING_CLIENT_END/g,' ')
    .replace(/-- STUDIO_ASSET_DYNAMIC_BINDING_BEGIN[\s\S]*?-- STUDIO_ASSET_DYNAMIC_BINDING_END/g,' ')
    .replace(/\bSTUDIO_ASSET_FAMILY_STATUS\s*=\s*\{[\s\S]*?\n\}/g,' ')
    .replace(/\bSTUDIO_ASSET_SELECTION\s*=\s*\{[\s\S]*?\n\}/g,' ');
}
export function robloxStudioAssetFamilyBoundInText(text='',family=''){
  const raw=stripRobloxStudioAssetBindingDeclarations(text);
  const nativePattern=ROBLOX_STUDIO_ASSET_NATIVE_PATTERNS[family];
  if(!nativePattern)return false;
  const renderSink=/(?:\.(?:Color|BackgroundColor3|TextColor3|ImageColor3|Material|MaterialVariant|TextureID|MeshId|Transparency|Size|CFrame|Position|Orientation|Rotation|LightEmission|Rate|Volume|PlaybackSpeed|AnimationId|Transform|Thickness|CornerRadius)\s*=|TweenService\s*:\s*Create\s*\(|:\s*Create\s*\([^\n]*(?:TweenInfo|Position|Rotation|Transform)|Instance\.new\s*\(\s*["'](?:UIStroke|UICorner|UIGradient|SurfaceAppearance|ParticleEmitter|Beam|Trail|PointLight|SpotLight|SurfaceLight)["']\s*\))/i;
  const statements=raw.split(/[;\n]/);
  for(const ref of raw.matchAll(robloxStudioAssetFamilyRefPattern(family))){
    const index=Number(ref.index||0);
    const statementStart=Math.max(raw.lastIndexOf(';',index),raw.lastIndexOf('\n',index))+1;
    const statementEndCandidates=[raw.indexOf(';',index),raw.indexOf('\n',index)].filter(value=>value>=0);
    const statementEnd=statementEndCandidates.length?Math.min(...statementEndCandidates):raw.length;
    const statement=raw.slice(statementStart,statementEnd);
    if(renderSink.test(statement)&&nativePattern.test(raw.slice(Math.max(0,index-500),Math.min(raw.length,index+1200))))return true;

    const lineStart=raw.lastIndexOf('\n',index)+1;
    const lineEnd=raw.indexOf('\n',index);
    const line=raw.slice(lineStart,lineEnd<0?raw.length:lineEnd);
    if(/\b(?:if|elseif)\b[\s\S]*\bthen\b/.test(line)){
      const after=raw.slice(lineEnd<0?raw.length:lineEnd+1,Math.min(raw.length,(lineEnd<0?raw.length:lineEnd+1)+1800));
      const blockEnd=after.search(/\n\s*end\b/);
      const block=blockEnd>=0?after.slice(0,blockEnd):after;
      const guardedBlock=line+'\n'+block;
      if(renderSink.test(guardedBlock)&&nativePattern.test(guardedBlock))return true;
    }

    const assignmentPrefix=raw.slice(statementStart,index).match(/\b(?:local\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*$/);
    if(!assignmentPrefix)continue;
    const aliases=new Set([assignmentPrefix[1]]);
    for(let pass=0;pass<statements.length;pass++){
      let changed=false;
      for(const row of statements){
        if(![...aliases].some(alias=>new RegExp('\\b'+alias+'\\b').test(row)))continue;
        if(renderSink.test(row)&&nativePattern.test(row))return true;
        const derived=row.match(/\b(?:local\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*[^=]/);
        if(derived&&!aliases.has(derived[1])){aliases.add(derived[1]);changed=true;}
      }
      if(!changed)break;
    }
  }
  return false;
}

const SHA256=/^[a-f0-9]{64}$/i;
export function validateWebPlatformHandoff({handoff={},roadmap={},gameId=''}={}){
  const policy=roadmap?.developmentLifecycleMachine?.webToPlatformHandoff||{};
  const required=Array.isArray(policy.carryForward)?policy.carryForward:[];
  const got=Array.isArray(handoff.carryForward)?handoff.carryForward.map(clean):[];
  const blockers=[];
  if(policy.required!==true)blockers.push('CENTRAL_WEB_HANDOFF_POLICY_REQUIRED');
  if(Number(handoff.version||0)!==Number(policy.manifestVersion||1))blockers.push('WEB_HANDOFF_VERSION_MISMATCH');
  if(clean(handoff.gameId)!==clean(gameId))blockers.push('WEB_HANDOFF_GAME_ID_MISMATCH');
  if(clean(handoff.stage)!=='WEB_DEVELOPMENT_BASELINE_READY')blockers.push('WEB_HANDOFF_STAGE_INVALID');
  const firstGateAdmission=handoff.firstGatePassed===true&&handoff.secondGateRequired===true&&clean(handoff.secondGateCriteriaAuthority).toUpperCase()==='OWNER_DIRECTIVE';
  if(!clean(handoff.sourcePath)||!clean(handoff.baselineSource))blockers.push('WEB_HANDOFF_PATH_BINDING_MISSING');
  if(!SHA256.test(clean(handoff.sourceIndexSha256)))blockers.push('WEB_HANDOFF_SOURCE_SHA_INVALID');
  if(!SHA256.test(clean(handoff.designBaselineSha256)))blockers.push('WEB_HANDOFF_BASELINE_SHA_INVALID');
  if(Number(handoff.validationSchemaVersion||0)<=0)blockers.push('WEB_HANDOFF_SCHEMA_INVALID');
  if(!firstGateAdmission){
    if(!clean(handoff.evidencePath))blockers.push('WEB_HANDOFF_EVIDENCE_PATH_MISSING');
    if(Number(handoff.strictScore||0)<90)blockers.push('WEB_HANDOFF_STRICT_SCORE_BELOW_90');
    if(handoff.promotionRevalidationPassed!==true)blockers.push('WEB_HANDOFF_PROMOTION_REVALIDATION_REQUIRED');
  }
  if(handoff.nativeRuntimePassTransferred!==false)blockers.push('WEB_HANDOFF_NATIVE_PASS_TRANSFER_FORBIDDEN');
  const presentation=handoff.presentationContract||null;
  if(!firstGateAdmission){
    if(presentation?.ready!==true)blockers.push('WEB_HANDOFF_PRESENTATION_READY_REQUIRED');
    if(clean(presentation?.kind)!=='WEB_TO_NATIVE_PRESENTATION_CONTRACT')blockers.push('WEB_HANDOFF_PRESENTATION_KIND_INVALID');
    if(!clean(presentation?.styleLock?.id))blockers.push('WEB_HANDOFF_STYLE_LOCK_REQUIRED');
    if(presentation?.commercialReadiness?.pass!==true)blockers.push('WEB_HANDOFF_COMMERCIAL_READINESS_REQUIRED');
    if(presentation?.webAssetBinaryCopyRequired!==false)blockers.push('WEB_HANDOFF_PLATFORM_NATIVE_ADAPTATION_REQUIRED');
  }
  for(const field of required)if(!got.includes(clean(field)))blockers.push('WEB_HANDOFF_CARRY_FORWARD_MISSING:'+clean(field));
  return Object.freeze({pass:blockers.length===0,blockers:Object.freeze(blockers),carryForward:Object.freeze(got),presentation:Object.freeze(presentation||{})});
}

function baselineContent(baseline={}){
  return baseline?.content&&typeof baseline.content==='object'&&!Array.isArray(baseline.content)?baseline.content:baseline;
}
function baselineText(baseline={}){
  return JSON.stringify(baselineContent(baseline)).toLowerCase();
}

function robloxPlatformProfileFromBaseline(baseline={}){
  const profile=baselineContent(baseline)?.platformProfiles?.ROBLOX;
  if(!profile||Array.isArray(profile)||typeof profile!=='object')throw new Error('ROBLOX_PLATFORM_PROFILE_REQUIRED');
  if(clean(profile.platform).toUpperCase()!=='ROBLOX')throw new Error('ROBLOX_PLATFORM_PROFILE_TARGET_MISMATCH');
  const required=['inputModel','sessionModel','multiplayerRuntime','performanceBudget','uiUx','saveAndNetwork','platformContentAdaptation','internalReleaseTarget','validationEvidence'];
  for(const field of required)if(clean(profile[field]).length<8)throw new Error('ROBLOX_PLATFORM_PROFILE_FIELD_REQUIRED:'+field);
  return Object.freeze({...profile,platform:'ROBLOX'});
}
export function robloxPlatformDesignFromBaseline(baseline={}){
  const profile=baselineContent(baseline)?.platformProfiles?.ROBLOX;
  if(!profile||Array.isArray(profile)||typeof profile!=='object')throw new Error('ROBLOX_PLATFORM_DESIGN_PROFILE_REQUIRED');
  const required=['inputModel','sessionModel','multiplayerRuntime','performanceBudget','uiUx','saveAndNetwork','platformContentAdaptation','internalReleaseTarget','validationEvidence'];
  if(clean(profile.platform).toUpperCase()!=='ROBLOX')throw new Error('ROBLOX_PLATFORM_DESIGN_TARGET_MISMATCH');
  for(const field of required)if(clean(profile[field]).length<8)throw new Error('ROBLOX_PLATFORM_DESIGN_FIELD_REQUIRED:'+field);
  return Object.freeze({...profile,platform:'ROBLOX'});
}

export function requiresPersistentSave(baseline={}){
  return /(persistent|persistence|save|long-term progression|long term progression|영구|저장)/i.test(baselineText(baseline));
}

export function robloxBuildProfileFromBaseline(baseline={}){
  const content=baselineContent(baseline);
  let profile=content?.robloxBuildProfile;
  if(!profile||Array.isArray(profile)||typeof profile!=='object'){
    robloxPlatformDesignFromBaseline(baseline);
    const playMode=clean(content?.multiplayerMode||'SINGLE').toUpperCase();
    const source=clean(baseline?.gameCategory||content?.identity||'Adventure');
    const genre=/puzzle|퍼즐/i.test(source)?'Puzzle':/defen|strategy|디펜스|전략/i.test(source)?'Strategy':/surviv|생존|horror|공포/i.test(source)?'Survival':/rpg|role|역할/i.test(source)?'RPG':/sim|tycoon|시뮬|타이쿤/i.test(source)?'Simulation':/action|combat|fight|액션|전투/i.test(source)?'Action':'Adventure';
    const multiplayerRequired=playMode!=='SINGLE';
    profile={version:2,targetPlatform:'ROBLOX',taxonomy:'DIRECT_NATIVE_DESIGN_PROFILE',declaredGameCategory:clean(baseline?.gameCategory)||null,genre,subgenre:null,playMode,multiplayerRequired,coopImplementationRequired:playMode==='COOP'||playMode==='HYBRID',competitiveImplementationRequired:playMode==='COMPETITIVE'||playMode==='HYBRID',networkingRequired:multiplayerRequired,multiplayerQaRequired:multiplayerRequired,minimumParticipantsForRequiredQa:multiplayerRequired?2:1,displayLabelKo:genre};
  }
  const playMode=clean(profile.playMode).toUpperCase();
  const genre=clean(profile.genre);
  const subgenre=clean(profile.subgenre);
  if(clean(profile.targetPlatform).toUpperCase()!=='ROBLOX')throw new Error('ROBLOX_BUILD_PROFILE_TARGET_MISMATCH');
  if(!genre||genre==='Utility & other')throw new Error('ROBLOX_BUILD_PROFILE_GENRE_REQUIRED');
  if(!MODES.has(playMode))throw new Error('ROBLOX_BUILD_PROFILE_PLAY_MODE_REQUIRED');
  const multiplayerRequired=playMode!=='SINGLE';
  const coopRequired=playMode==='COOP'||playMode==='HYBRID';
  const competitiveRequired=playMode==='COMPETITIVE'||playMode==='HYBRID';
  if(profile.multiplayerRequired!==multiplayerRequired)throw new Error('ROBLOX_BUILD_PROFILE_MULTIPLAYER_MISMATCH');
  if(profile.networkingRequired!==multiplayerRequired)throw new Error('ROBLOX_BUILD_PROFILE_NETWORKING_MISMATCH');
  if(profile.multiplayerQaRequired!==multiplayerRequired)throw new Error('ROBLOX_BUILD_PROFILE_QA_MISMATCH');
  if(profile.coopImplementationRequired!==coopRequired)throw new Error('ROBLOX_BUILD_PROFILE_COOP_MISMATCH');
  if(profile.competitiveImplementationRequired!==competitiveRequired)throw new Error('ROBLOX_BUILD_PROFILE_COMPETITIVE_MISMATCH');
  if(Number(profile.minimumParticipantsForRequiredQa)!==(multiplayerRequired?2:1))throw new Error('ROBLOX_BUILD_PROFILE_PARTICIPANT_MISMATCH');
  return Object.freeze({
    version:Number(profile.version||1),targetPlatform:'ROBLOX',taxonomy:clean(profile.taxonomy)||null,
    declaredGameCategory:clean(profile.declaredGameCategory)||null,genre,subgenre:subgenre||null,playMode,
    multiplayerRequired,coopImplementationRequired:coopRequired,competitiveImplementationRequired:competitiveRequired,
    networkingRequired:multiplayerRequired,multiplayerQaRequired:multiplayerRequired,minimumParticipantsForRequiredQa:multiplayerRequired?2:1,
    displayLabelKo:clean(profile.displayLabelKo)||[genre,subgenre,playMode].filter(Boolean).join(' · '),
  });
}
function genreCoreKind(profile){
  const genre=profile.genre;
  const sub=profile.subgenre||'';
  if(genre==='Puzzle')return 'PUZZLE';
  if(genre==='Obby & platformer')return 'MOVEMENT';
  if(genre==='Shooter'||genre==='Action')return 'COMBAT';
  if(genre==='Strategy'&&sub==='Tower Defense')return 'DEFENSE';
  if(genre==='Strategy')return 'OBJECTIVE';
  if(genre==='RPG')return 'PROGRESSION';
  if(genre==='Survival')return 'SURVIVAL';
  if(genre==='Simulation')return sub==='Tycoon'?'ECONOMY':'PROGRESSION';
  if(genre==='Adventure')return 'OBJECTIVE';
  if(genre==='Roleplay & avatar sim'||genre==='Social')return 'SOCIAL';
  if(genre==='Sports & racing')return 'MOVEMENT';
  if(genre==='Party & casual')return 'OBJECTIVE';
  return 'OBJECTIVE';
}

export function projectJsonForGame(gameId=''){
  return {
    name:clean(gameId)||'jaewoon-roblox-game',
    tree:{
      $className:'DataModel',
      Lighting:{
        $properties:{
          Technology:'Voxel',
          LightingStyle:'Soft',
          PrioritizeLightingQuality:false,
        },
        CompatibilityToneMap:{
          $className:'ColorGradingEffect',
          $properties:{TonemapperPreset:'Retro'},
        },
      },
      ReplicatedStorage:{Shared:{$path:'shared'}},
      ServerScriptService:{GameServer:{$path:'server'}},
      StarterPlayer:{StarterPlayerScripts:{GameClient:{$path:'client'}}},
    },
  };
}

const ROBLOX_BOOTSTRAP_STUDIO_FAMILY_PREFERENCES=Object.freeze({
  UI:Object.freeze(['FRAME_PANEL','BUTTON_PRIMARY','BAR_HEALTH']),
  ENVIRONMENT:Object.freeze(['TREE_TRUNK_THICK','TREE_CROWN_ROUND','ROCK_MEDIUM','ROAD_DIRT']),
  BUILDING:Object.freeze(['FOUNDATION_RECT','WALL_SOLID','DOOR_SINGLE','ROOF_GABLE']),
  PROP:Object.freeze(['CHEST','CRATE','LAMP','WORKBENCH']),
  MATERIAL:Object.freeze(['WOOD','STONE','METAL','CLOTH']),
  AUDIO:Object.freeze(['ENV_WIND','ENV_WATER','UI_CONFIRM','ATTACK_SWING_LIGHT']),
  VFX:Object.freeze(['IMPACT_FLASH','TRAIL_SHORT','SHAPE_BURST']),
  SKILL:Object.freeze(['CAST_HAND','TELEGRAPH_CIRCLE','IMPACT_SMALL']),
  WEAPON:Object.freeze(['BLADE_LONG','GUARD_CROSS','GRIP_LONG']),
  CHARACTER:Object.freeze(['TORSO_CLOTH','SHOULDER_LIGHT','BACK_CAPE']),
  CREATURE:Object.freeze(['HEAD_CANINE','JAW_LONG','CLAW']),
  MOTION:Object.freeze(['IDLE_RELAXED','WALK','JOG','RUN','START','STOP','TURN_90','JUMP_START','LAND','HIT_FRONT','DEATH_FRONT'])
});
function stableAssetSeed(value=''){let hash=2166136261;for(const ch of clean(value)){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619);}return hash>>>0;}
function studioAssetSelectionFingerprint({gameId='',profile={},libraryVersion=0,families={}}={}){
  const normalized=Object.fromEntries(Object.entries(families||{}).sort(([a],[b])=>a.localeCompare(b)).map(([family,atoms])=>[
    family,[...new Set((atoms||[]).map(clean).filter(Boolean))].sort()
  ]));
  return crypto.createHash('sha256').update(JSON.stringify({
    version:2,gameId:clean(gameId),
    libraryVersion:Number(libraryVersion||0),families:normalized
  })).digest('hex');
}
function selectBootstrapAtoms(values=[],preferred=[],key=''){
  const source=[...new Set((Array.isArray(values)?values:[]).map(clean).filter(Boolean))];
  const out=[];
  for(const id of preferred)if(source.includes(id)&&!out.includes(id))out.push(id);
  if(source.length){
    const start=stableAssetSeed(key)%source.length;
    for(let i=0;i<source.length;i++){
      const id=source[(start+i)%source.length];
      if(!out.includes(id))out.push(id);
    }
  }
  return Object.freeze(out);
}
export function robloxStudioAssetSourceUsageIdentity({assetLibrary={}}={}){
  const source='company-asset-library.json#baseMaterialLibrary';
  const libraryVersion=Math.max(0,Math.floor(Number(assetLibrary?.version)||0));
  const sourceSha256=crypto.createHash('sha256')
    .update(JSON.stringify(assetLibrary?.baseMaterialLibrary||{}))
    .digest('hex');
  const selectedSourceContentHashes=Object.freeze([
    Object.freeze({source,sha256:sourceSha256})
  ]);
  const fingerprint=crypto.createHash('sha256').update(JSON.stringify({
    version:1,libraryVersion,selectedSourceContentHashes
  })).digest('hex');
  return Object.freeze({
    version:1,source,libraryVersion,selectedSourceContentHashes,fingerprint
  });
}
export function buildRobloxStudioAssetBootstrapPlan({gameId='',profile={},assetLibrary={}}={}){
  const families=assetLibrary?.baseMaterialLibrary?.families||{};
  const selected={};
  for(const [family,preferred] of Object.entries(ROBLOX_BOOTSTRAP_STUDIO_FAMILY_PREFERENCES)){
    selected[family]=selectBootstrapAtoms(
      families?.[family]||[],
      preferred,
      `${gameId}|${family}`
    );
  }
  const selectedAtomCount=Object.values(selected).reduce((n,rows)=>n+rows.length,0);
  const requiredFamilies=ROBLOX_STUDIO_ASSET_REQUIRED_FAMILIES;
  const missingFamilies=requiredFamilies.filter(family=>!(selected[family]||[]).length);
  const motionAtoms=Object.freeze([...(selected.MOTION||[])]);
  const selectionFingerprint=studioAssetSelectionFingerprint({
    gameId,profile,libraryVersion:Number(assetLibrary?.version||0),families:selected
  });
  const sourceUsage=robloxStudioAssetSourceUsageIdentity({assetLibrary});
  return Object.freeze({
    version:3,
    bindingVersion:2,
    applied:selectedAtomCount>=12&&missingFamilies.length===0,
    source:'company-asset-library.json#baseMaterialLibrary',
    libraryVersion:Number(assetLibrary?.version||0),
    selectionFingerprint,
    buildUpAssetSourceUsageFingerprint:sourceUsage.fingerprint,
    buildUpAssetSourceUsageLibraryVersion:sourceUsage.libraryVersion,
    selectedSourceContentHashes:sourceUsage.selectedSourceContentHashes,
    synchronization:Object.freeze({
      mode:'VERSION_AND_SELECTION_FINGERPRINT_INCREMENTAL',
      fullLibraryReplicationForbidden:true,
      selectedSubsetOnly:true,
      allPreparedBaseMaterialAtomsEligible:true,
      noArtificialAtomCountCap:true,
      unchangedFingerprintMayReuseExistingBinding:true,
      changedFamiliesOnlyMayRebind:true
    }),
    atomState:clean(assetLibrary?.baseMaterialLibrary?.status)||null,
    selectedAtomCount,
    families:Object.freeze(selected),
    universalAssetFirst:Object.freeze({
      required:true,
      allFamilies:requiredFamilies,
      allFamiliesEvaluated:true,
      missingFamilies:Object.freeze(missingFamilies),
      familyResultRequired:'APPLIED_OR_EXPLICIT_NOT_APPLICABLE',
      actualSourceBindingRequired:true,
      markerOnlyApplicationForbidden:true,
      noArtificialAtomCountCap:true,
      allPreparedBaseMaterialAtomsEvaluated:true,
      mapEnvironmentBuildingPropRequired:true
    }),
    recipeId:'NORMAL_VARIANT',
    motionQuality:Object.freeze({
      contract:'company-learning/platform-release-roadmap.json#livingMotionVisualQualityContract.robloxCharacterMotionQuality',
      motionAtoms,
      libraryFirst:true,
      semanticAtomsAreNotAnimationClips:true,
      nativeAnimationClipRuntimeVerificationRequired:true,
      actorClasses:Object.freeze(['PLAYER','HUMANOID_NPC','CREATURE']),
      articulatedRigRequired:true,
      animatorRequired:true,
      blendAndSpeedSyncRequired:true,
      ikAndProceduralCorrectionPreferred:true,
      mannequinHardFailure:'CHARACTER_MOTION_MANNEQUIN'
    }),
    productionVerified:false,
    runtimeVerificationRequired:true,
    verifiedPromotionAllowed:false,
    gameplayAuthority:false
  });
}

function requireRobloxVerifiedExternalLearning(learning={}){
  const ids=Array.isArray(learning?.verifiedExternalLearningIds)?learning.verifiedExternalLearningIds:[];
  const principles=Array.isArray(learning?.verifiedExternalLearningPrinciples)?learning.verifiedExternalLearningPrinciples:[];
  const mappings=Array.isArray(learning?.gameSpecificSemanticMappings)?learning.gameSpecificSemanticMappings:[];
  const dispositions=Array.isArray(learning?.verifiedExternalLearningDispositions)?learning.verifiedExternalLearningDispositions:[];
  if(learning?.applied!==true||!ids.length||!principles.length||!mappings.length||!dispositions.length)throw new Error('ROBLOX_VERIFIED_EXTERNAL_LEARNING_REQUIRED');
  if(Number(learning?.semanticMappingVersion||0)!==ROBLOX_SEMANTIC_MAPPING_VERSION)throw new Error('ROBLOX_SEMANTIC_MAPPING_VERSION_REQUIRED');
  if(learning?.allRetrievedPrinciplesHaveExplicitDisposition!==true||dispositions.some(row=>row?.disposition==='FAIL_CLOSED'))throw new Error('ROBLOX_VERIFIED_EXTERNAL_LEARNING_DISPOSITION_REQUIRED');
  return learning;
}

function verifiedExternalGameDevelopmentProfile(learning={}){
  requireRobloxVerifiedExternalLearning(learning);
  const principles=[...(learning?.verifiedExternalLearningPrinciples||[])];
  const mappings=[...(learning?.gameSpecificSemanticMappings||[])];
  if(!principles.length||!mappings.length)throw new Error('ROBLOX_VERIFIED_EXTERNAL_LEARNING_PRINCIPLES_REQUIRED');
  return Object.freeze({
    principles:Object.freeze(principles),
    mappings:Object.freeze(mappings),
    semanticMappingVersion:Number(learning.semanticMappingVersion||0),
    semanticVariant:clean(learning.semanticVariant||'OBJECTIVE_GOAL'),
    environmentBackground:mappings.some(row=>(row.domains||[]).includes('WORLD_AND_BACKGROUND_PRESENTATION')||(row.domains||[]).includes('ENVIRONMENTAL_FEEDBACK')),
    characterAnimationMotion:mappings.some(row=>(row.domains||[]).includes('CHARACTER_NPC_CREATURE_ANIMATION')||(row.domains||[]).includes('MOTION_AND_TRANSITIONS')),
    skillVfxImpact:mappings.some(row=>(row.domains||[]).includes('SKILL_AND_COMBAT_PRESENTATION')||(row.domains||[]).includes('VFX_AND_IMPACT_EFFECTS')),
    cameraVisualFeedback:mappings.some(row=>(row.domains||[]).includes('CAMERA_RESPONSE')),
    uiUxTouchControls:mappings.some(row=>(row.domains||[]).includes('PLAYER_INPUT_AND_TOUCH')||(row.domains||[]).includes('HUD_AND_CONTEXTUAL_GUIDANCE')),
    gameplayStateProgression:mappings.some(row=>(row.domains||[]).includes('CORE_GAMEPLAY_FEEL')||(row.domains||[]).includes('PROGRESSION_RISK_READABILITY')),
    runtimeQaReliability:false
  });
}
function robloxNativeLearningRuntimeBlock({frameVar='root',configVar='Config',learning={}}={}){
  const semanticProfile=verifiedExternalGameDevelopmentProfile(learning);
  const semanticVariant=clean(learning.semanticVariant||'OBJECTIVE_GOAL');
  const semanticDomain=clean(learning.gameSpecificSemanticMappings?.[0]?.domain||'CORE_GAMEPLAY_FEEL');
  const semanticColor=learning.semanticColor||{r:255,g:220,b:124};
  const semanticMood=learning.semanticMood||{id:'READABLE_EXPLORATION',saturation:0.07,contrast:0.05,brightness:0.01};
  return `-- VERIFIED_EXTERNAL_LEARNING_ROBLOX_NATIVE_BEGIN
local verifiedLearningPlayers = game:GetService("Players")
local verifiedLearningTweenService = game:GetService("TweenService")
local verifiedLearningLighting = game:GetService("Lighting")
local verifiedLearningPlayer = verifiedLearningPlayers.LocalPlayer
local verifiedLearningContext = ${configVar}.VerifiedExternalLearning or ${configVar}.LearningContext or {}
local verifiedLearningPrinciples = verifiedLearningContext.ApplicationPrinciples or {}
local verifiedLearningAxes = verifiedLearningContext.ApplyAxes or {}
local VERIFIED_EXTERNAL_LEARNING_NATIVE_BINDING_VERSION = ${ROBLOX_VERIFIED_EXTERNAL_NATIVE_BINDING_VERSION}
local verifiedLearningRoot = ${frameVar}
local verifiedLearningSemanticVariant = ${luauString(semanticVariant)}
local verifiedLearningSemanticDomain = ${luauString(semanticDomain)}
local verifiedLearningSemanticColor = Color3.fromRGB(${semanticColor.r}, ${semanticColor.g}, ${semanticColor.b})
local verifiedLearningSemanticMood = ${luauString(semanticMood.id)}
verifiedLearningRoot:SetAttribute("VerifiedExternalLearningNativeBindingVersion", VERIFIED_EXTERNAL_LEARNING_NATIVE_BINDING_VERSION)
verifiedLearningRoot:SetAttribute("VerifiedExternalLearningPrincipleCount", #verifiedLearningPrinciples)
verifiedLearningRoot:SetAttribute("VerifiedExternalLearningAxisCount", #verifiedLearningAxes)
verifiedLearningRoot:SetAttribute("VerifiedExternalLearningFingerprint", verifiedLearningContext.MemoryFingerprint or "")
verifiedLearningRoot:SetAttribute("VerifiedLearningSemanticMappingVersion", verifiedLearningContext.SemanticMappingVersion or 0)
verifiedLearningRoot:SetAttribute("VerifiedLearningSemanticMappingFingerprint", verifiedLearningContext.SemanticMappingFingerprint or "")
verifiedLearningRoot:SetAttribute("VerifiedLearningSemanticVariant", verifiedLearningSemanticVariant)
verifiedLearningRoot:SetAttribute("VerifiedLearningSemanticDomain", verifiedLearningSemanticDomain)
verifiedLearningRoot:SetAttribute("VerifiedLearningSemanticMood", verifiedLearningSemanticMood)
verifiedLearningRoot:SetAttribute("VerifiedLearningGameSpecificMappingCount", #(verifiedLearningContext.GameSpecificSemanticMappings or {}))

-- Game-specific color and atmosphere response, authored locally in Roblox.
local verifiedLearningColorGrade = verifiedLearningLighting:FindFirstChild("VerifiedLearningColorGrade")
if not verifiedLearningColorGrade then
  verifiedLearningColorGrade = Instance.new("ColorCorrectionEffect")
  verifiedLearningColorGrade.Name = "VerifiedLearningColorGrade"
  verifiedLearningColorGrade.Parent = verifiedLearningLighting
end
verifiedLearningColorGrade.Saturation = ${semanticMood.saturation}
verifiedLearningColorGrade.Contrast = ${semanticMood.contrast}
verifiedLearningColorGrade.Brightness = ${semanticMood.brightness}
verifiedLearningColorGrade:SetAttribute("VerifiedLearningSemanticMood", verifiedLearningSemanticMood)
if verifiedLearningSemanticVariant == "SURVIVAL_RISK" then
-- Survival alone receives atmospheric depth and threat haze.
local verifiedLearningBloom = verifiedLearningLighting:FindFirstChild("VerifiedLearningBloom")
if not verifiedLearningBloom then
  verifiedLearningBloom = Instance.new("BloomEffect")
  verifiedLearningBloom.Name = "VerifiedLearningBloom"
  verifiedLearningBloom.Parent = verifiedLearningLighting
end
verifiedLearningBloom.Intensity = 0.22
verifiedLearningBloom.Size = 18
verifiedLearningBloom.Threshold = 1.1
local verifiedLearningAtmosphere = verifiedLearningLighting:FindFirstChild("VerifiedLearningAtmosphere")
if not verifiedLearningAtmosphere then
  verifiedLearningAtmosphere = Instance.new("Atmosphere")
  verifiedLearningAtmosphere.Name = "VerifiedLearningAtmosphere"
  verifiedLearningAtmosphere.Parent = verifiedLearningLighting
end
verifiedLearningAtmosphere.Density = 0.22
verifiedLearningAtmosphere.Haze = 1.1
verifiedLearningAtmosphere.Glare = 0.08
local verifiedLearningDepth = verifiedLearningLighting:FindFirstChild("VerifiedLearningDepthOfField")
if not verifiedLearningDepth then
  verifiedLearningDepth = Instance.new("DepthOfFieldEffect")
  verifiedLearningDepth.Name = "VerifiedLearningDepthOfField"
  verifiedLearningDepth.Parent = verifiedLearningLighting
end
verifiedLearningDepth.FarIntensity = 0.08
verifiedLearningDepth.NearIntensity = 0.02
verifiedLearningDepth.FocusDistance = 28
verifiedLearningDepth.InFocusRadius = 24

end

if verifiedLearningSemanticVariant == "MOVEMENT_SPATIAL" or verifiedLearningSemanticVariant == "COMBAT_IMPACT" or verifiedLearningSemanticVariant == "SURVIVAL_RISK" then
-- Roblox character animation / motion adaptation.
local function syncVerifiedLearningCharacterMotion(character)
  local humanoid = character:FindFirstChildOfClass("Humanoid") or character:WaitForChild("Humanoid", 5)
  if not humanoid then return end
  local animator = humanoid:FindFirstChildOfClass("Animator") or humanoid:WaitForChild("Animator", 5)
  if not animator then return end
  humanoid.Running:Connect(function(speed)
    local ratio = speed > 0.1 and math.clamp(speed / math.max(humanoid.WalkSpeed, 1), 0.82, 1.25) or 1
    for _, track in ipairs(animator:GetPlayingAnimationTracks()) do
      if track.Priority == Enum.AnimationPriority.Movement or track.Priority == Enum.AnimationPriority.Core then
        track:AdjustSpeed(ratio)
      end
    end
  end)
end
if verifiedLearningPlayer.Character then task.defer(syncVerifiedLearningCharacterMotion, verifiedLearningPlayer.Character) end
verifiedLearningPlayer.CharacterAdded:Connect(syncVerifiedLearningCharacterMotion)

end

-- Roblox UI / touch / progression guidance.
local verifiedLearningGuidance = Instance.new("TextLabel")
verifiedLearningGuidance.Name = "VerifiedLearningGuidance"
verifiedLearningGuidance.Size = UDim2.new(1, -20, 0, 30)
verifiedLearningGuidance.Position = UDim2.fromOffset(10, 8)
verifiedLearningGuidance.BackgroundTransparency = 1
verifiedLearningGuidance.TextWrapped = true
verifiedLearningGuidance.TextScaled = true
verifiedLearningGuidance.TextColor3 = verifiedLearningSemanticColor
verifiedLearningGuidance:SetAttribute("VerifiedLearningSemanticMood", verifiedLearningSemanticMood)
if verifiedLearningSemanticVariant == "PUZZLE_STATE" then
  verifiedLearningGuidance.Text = "퍼즐 보드와 현재 이동을 함께 확인"
elseif verifiedLearningSemanticVariant == "DEFENSE_WAVE" then
  verifiedLearningGuidance.Text = "웨이브와 기지 상태를 보며 배치"
elseif verifiedLearningSemanticVariant == "COMBAT_IMPACT" then
  verifiedLearningGuidance.Text = "공격 방향과 타격 응답을 확인"
elseif verifiedLearningSemanticVariant == "PROGRESSION_RISK" then
  verifiedLearningGuidance.Text = "레벨과 다음 성장 조건을 확인"
elseif verifiedLearningSemanticVariant == "ECONOMY_RESOURCE" then
  verifiedLearningGuidance.Text = "자원과 업그레이드 상태를 확인"
elseif verifiedLearningSemanticVariant == "SURVIVAL_RISK" then
  verifiedLearningGuidance.Text = "체력과 위협 상태를 확인"
elseif verifiedLearningSemanticVariant == "MOVEMENT_SPATIAL" then
  verifiedLearningGuidance.Text = "이동 방향과 공간 응답을 확인"
elseif verifiedLearningSemanticVariant == "SOCIAL_CONTEXT" then
  verifiedLearningGuidance.Text = "공유 세션과 내 역할을 확인"
else
  verifiedLearningGuidance.Text = "현재 목표와 다음 행동을 확인"
end
verifiedLearningGuidance.Parent = verifiedLearningRoot
local verifiedLearningRiskCue = Instance.new("TextLabel")
verifiedLearningRiskCue.Name = "VerifiedLearningProgressionRiskCue"
verifiedLearningRiskCue.Size = UDim2.new(1, -20, 0, 26)
verifiedLearningRiskCue.Position = UDim2.fromOffset(10, 40)
verifiedLearningRiskCue.BackgroundTransparency = 1
verifiedLearningRiskCue.TextWrapped = true
verifiedLearningRiskCue.TextScaled = true
verifiedLearningRiskCue.TextColor3 = verifiedLearningSemanticColor
if verifiedLearningSemanticVariant == "DEFENSE_WAVE" then
  verifiedLearningRiskCue.Text = "배치 전 웨이브·기지 위험 확인"
elseif verifiedLearningSemanticVariant == "SURVIVAL_RISK" then
  verifiedLearningRiskCue.Text = "행동 전 체력·위협 위험 확인"
elseif verifiedLearningSemanticVariant == "PROGRESSION_RISK" then
  verifiedLearningRiskCue.Text = "행동 전 레벨·성장 조건 확인"
else
  verifiedLearningRiskCue.Text = "현재 상태와 다음 행동 확인"
end
verifiedLearningRiskCue.Visible = verifiedLearningSemanticVariant == "DEFENSE_WAVE" or verifiedLearningSemanticVariant == "SURVIVAL_RISK" or verifiedLearningSemanticVariant == "PROGRESSION_RISK"
verifiedLearningRiskCue.Parent = verifiedLearningRoot

-- Roblox skill VFX / camera / motion feedback.
local function playVerifiedLearningActionFeedback(control)
  verifiedLearningRoot:SetAttribute("VerifiedExternalLearningLastControl", control and control.Name or "GAMEPLAY_STATE")
  verifiedLearningRoot:SetAttribute("VerifiedExternalLearningInputRespondedAt", os.clock())
  verifiedLearningGuidance.Visible = false

  if control then
    local scale = control:FindFirstChild("VerifiedLearningMotionScale")
    if not scale then
      scale = Instance.new("UIScale")
      scale.Name = "VerifiedLearningMotionScale"
      scale.Parent = control
    end
    scale.Scale = 0.94
    verifiedLearningTweenService:Create(scale, TweenInfo.new(0.16, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {Scale = 1}):Play()
  end

  if verifiedLearningSemanticVariant == "MOVEMENT_SPATIAL" or verifiedLearningSemanticVariant == "DEFENSE_WAVE" or verifiedLearningSemanticVariant == "OBJECTIVE_GOAL" or verifiedLearningSemanticVariant == "SOCIAL_CONTEXT" then
  local camera = workspace.CurrentCamera
  if camera then
    local baseFov = camera.FieldOfView
    verifiedLearningTweenService:Create(camera, TweenInfo.new(0.08, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {FieldOfView = math.clamp(baseFov + 3, 40, 100)}):Play()
    task.delay(0.09, function()
      if camera then verifiedLearningTweenService:Create(camera, TweenInfo.new(0.12, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {FieldOfView = baseFov}):Play() end
    end)
  end
  end

  if verifiedLearningSemanticVariant == "COMBAT_IMPACT" then
  local character = verifiedLearningPlayer.Character
  local rootPart = character and character:FindFirstChild("HumanoidRootPart")
  if character and rootPart then
    local highlight = Instance.new("Highlight")
    highlight.Name = "VerifiedLearningSkillImpact"
    highlight.FillTransparency = 0.35
    highlight.OutlineTransparency = 0.12
    highlight.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop
    highlight.Parent = character
    verifiedLearningTweenService:Create(highlight, TweenInfo.new(0.20), {FillTransparency = 1, OutlineTransparency = 1}):Play()
    local sparkles = Instance.new("Sparkles")
    sparkles.Name = "VerifiedLearningSkillSparkles"
    sparkles.SparkleColor = Color3.fromRGB(170, 220, 255)
    sparkles.Parent = rootPart
    local impactAttachment = Instance.new("Attachment")
    impactAttachment.Name = "VerifiedLearningSkillAttachment"
    impactAttachment.Parent = rootPart
    local particles = Instance.new("ParticleEmitter")
    particles.Name = "VerifiedLearningSkillParticles"
    particles.Rate = 0
    particles.Lifetime = NumberRange.new(0.18, 0.32)
    particles.Speed = NumberRange.new(5, 9)
    particles.SpreadAngle = Vector2.new(45, 45)
    particles.LightEmission = 0.7
    particles.Parent = impactAttachment
    particles:Emit(18)
    local impactLight = Instance.new("PointLight")
    impactLight.Name = "VerifiedLearningSkillLight"
    impactLight.Color = Color3.fromRGB(160, 215, 255)
    impactLight.Brightness = 2.2
    impactLight.Range = 10
    impactLight.Parent = rootPart
    verifiedLearningTweenService:Create(impactLight, TweenInfo.new(0.18), {Brightness = 0, Range = 4}):Play()
    task.delay(0.24, function()
      if impactAttachment then impactAttachment:Destroy() end
      if impactLight then impactLight:Destroy() end
      if sparkles then sparkles:Destroy() end
      if highlight then highlight:Destroy() end
    end)
  end
  end

  if verifiedLearningSemanticVariant == "ECONOMY_RESOURCE" or verifiedLearningSemanticVariant == "PUZZLE_STATE" or verifiedLearningSemanticVariant == "PROGRESSION_RISK" then
    verifiedLearningRiskCue.Visible = true
    verifiedLearningRiskCue.TextColor3 = verifiedLearningSemanticColor
  end
end

local verifiedLearningLastControl = nil
local function bindVerifiedLearningControl(control)
  if not control:IsA("GuiButton") then return end
  if not control:FindFirstChild("VerifiedLearningTouchTarget") then
    local size = Instance.new("UISizeConstraint")
    size.Name = "VerifiedLearningTouchTarget"
    size.MinSize = Vector2.new(0, 52)
    size:SetAttribute("SemanticTouchTarget", verifiedLearningSemanticVariant)
    size.Parent = control
  end
  control.Activated:Connect(function()
    verifiedLearningLastControl = control
    verifiedLearningRoot:SetAttribute("VerifiedExternalLearningInputSubmittedAt", os.clock())
    playVerifiedLearningActionFeedback(control)
  end)
end
for _, descendant in ipairs(verifiedLearningRoot:GetDescendants()) do bindVerifiedLearningControl(descendant) end
verifiedLearningRoot.DescendantAdded:Connect(bindVerifiedLearningControl)
verifiedLearningPlayer:GetAttributeChangedSignal("LastApprovedScope"):Connect(function()
  verifiedLearningRoot:SetAttribute("VerifiedExternalLearningGameplayState", verifiedLearningPlayer:GetAttribute("LastApprovedScope") or "")
  verifiedLearningRoot:SetAttribute("VerifiedExternalLearningServerConfirmedAt", os.clock())
  playVerifiedLearningActionFeedback(verifiedLearningLastControl)
  verifiedLearningLastControl = nil
end)
-- VERIFIED_EXTERNAL_LEARNING_ROBLOX_NATIVE_END
`;
}

function verifiedExternalLearningConfigBlock(learning={}){
  requireRobloxVerifiedExternalLearning(learning);
  const rows=values=>(values||[]).map(value=>`      ${luauString(value)},`).join('\n');
  const mappingRows=luauSemanticMappingRows(learning.gameSpecificSemanticMappings||[],'      ');
  const dispositionRows=luauLearningDispositionRows(learning.verifiedExternalLearningDispositions||[],'      ');
  const validationRows=rows(learning.verifiedExternalValidationOnlyPrinciples||[]);
  const notApplicableRows=rows(learning.verifiedExternalNotApplicablePrinciples||[]);
  return `  -- VERIFIED_EXTERNAL_LEARNING_BINDING_BEGIN
  VerifiedExternalLearning = {
    Applied = true,
    Authority = ${luauString(learning.authority||'vibe3-roblox-learning-context')},
    GameId = ${luauString(learning.gameId||'')},
    CoreKind = ${luauString(learning.coreKind||'')},
    SemanticVariant = ${luauString(learning.semanticVariant||'')},
    SemanticMood = ${luauString(learning.semanticMood?.id||'READABLE_EXPLORATION')},
    SemanticMappingVersion = ${Number(learning.semanticMappingVersion||0)},
    SemanticMappingFingerprint = ${luauString(learning.semanticMappingFingerprint||'')},
    MemoryFingerprint = ${luauString(learning.verifiedExternalLearningFingerprint||'')},
    NativeBindingVersion = ${ROBLOX_VERIFIED_EXTERNAL_NATIVE_BINDING_VERSION},
    CoveragePct = ${Number(learning.verifiedExternalLearningCoveragePct||0)},
    ContentComplete = ${learning.verifiedExternalDistilledContentComplete?'true':'false'},
    RetrievedCount = ${Number(learning.verifiedExternalLearningRetrievedCount||0)},
    AppliedCount = ${Number(learning.verifiedExternalLearningAppliedCount||0)},
    AppliedGameDevelopmentPrincipleCount = ${Number(learning.verifiedExternalLearningGameDevelopmentAppliedCount||0)},
    RetrievedPrincipleCount = ${Number(learning.verifiedExternalLearningRetrievedPrincipleCount||0)},
    ValidationOnlyPrincipleCount = ${Number(learning.verifiedExternalValidationOnlyPrincipleCount||0)},
    NotApplicablePrincipleCount = ${Number(learning.verifiedExternalNotApplicablePrincipleCount||0)},
    TruncationForbidden = true,
    VerifiedExternalLearningIds = {
${rows(learning.verifiedExternalLearningIds||[])}
    },
    ApplyAxes = {
${rows(learning.verifiedExternalLearningApplyAxes||[])}
    },
    ApplicationPrinciples = {
${rows(learning.verifiedExternalLearningPrinciples||[])}
    },
    GameDevelopmentPrinciples = {
${rows(learning.verifiedExternalGameDevelopmentPrinciples||[])}
    },
    GameSpecificSemanticMappings = {
${mappingRows}
    },
    LearningDispositions = {
${dispositionRows}
    },
    ValidationOnlyPrinciples = {
${validationRows}
    },
    NotApplicablePrinciples = {
${notApplicableRows}
    },
    AvoidancePrinciples = {
${rows(learning.verifiedExternalAvoidancePrinciples||[])}
    },
    LearningUseAllowed = {
${rows(learning.verifiedExternalLearningUseAllowed||[])}
    },
    LearningUseForbidden = {
${rows(learning.verifiedExternalLearningUseForbidden||[])}
    },
  },
  -- VERIFIED_EXTERNAL_LEARNING_BINDING_END
`;
}
function replaceOrInsertVerifiedExternalLearningConfig(source='',learning={}){
  const block=verifiedExternalLearningConfigBlock(learning);
  const managed=/  -- VERIFIED_EXTERNAL_LEARNING_BINDING_BEGIN\n[\s\S]*?  -- VERIFIED_EXTERNAL_LEARNING_BINDING_END\n/;
  if(managed.test(source))return source.replace(managed,block);
  const returnIndex=source.lastIndexOf('\nreturn ');
  const closeIndex=returnIndex>=0?source.lastIndexOf('\n}',returnIndex):-1;
  if(closeIndex<0)throw new Error('EXISTING_VERIFIED_EXTERNAL_LEARNING_CONFIG_INSERT_POINT_MISSING');
  return source.slice(0,closeIndex+1)+block+source.slice(closeIndex+1);
}

function bindExistingClientVerifiedExternalLearning(source='',learning={}){
  let output=source;
  let requireMatch=output.match(/local\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*require\([^\n]*GameConfig[^\n]*\)/);
  if(!requireMatch){
    const configRequire='local VerifiedExternalLearningConfig = require(game:GetService("ReplicatedStorage"):WaitForChild("Shared"):WaitForChild("GameConfig"))\n';
    const commentHeader=output.match(/^(?:(?:--[^\n]*\n)|\s*\n)*/)?.[0]||'';
    output=commentHeader+configRequire+output.slice(commentHeader.length);
    requireMatch=output.match(/local\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*require\([^\n]*GameConfig[^\n]*\)/);
  }
  if(!requireMatch)throw new Error('EXISTING_VERIFIED_EXTERNAL_LEARNING_CLIENT_CONFIG_REQUIRE_MISSING');
  const configVar=requireMatch[1];
  const contextBlock=`-- VERIFIED_EXTERNAL_LEARNING_CLIENT_CONTEXT_BEGIN
local verifiedExternalLearningContext = ${configVar}.VerifiedExternalLearning or ${configVar}.LearningContext or {}
local verifiedExternalLearningIds = verifiedExternalLearningContext.VerifiedExternalLearningIds or {}
local verifiedExternalLearningPrinciples = verifiedExternalLearningContext.ApplicationPrinciples or {}
local verifiedExternalGameDevelopmentPrinciples = verifiedExternalLearningContext.GameDevelopmentPrinciples or {}
local verifiedExternalLearningMappings = verifiedExternalLearningContext.GameSpecificSemanticMappings or {}
local verifiedExternalLearningDispositions = verifiedExternalLearningContext.LearningDispositions or {}
-- VERIFIED_EXTERNAL_LEARNING_CLIENT_CONTEXT_END
`;
  const managedContext=/-- VERIFIED_EXTERNAL_LEARNING_CLIENT_CONTEXT_BEGIN\n[\s\S]*?-- VERIFIED_EXTERNAL_LEARNING_CLIENT_CONTEXT_END\n/;
  if(managedContext.test(output))output=output.replace(managedContext,contextBlock);
  else{
    const at=requireMatch.index+requireMatch[0].length;
    output=output.slice(0,at)+'\n'+contextBlock+output.slice(at);
  }
  // Prefer a persistent ScreenGui. Existing games can create a temporary loading Frame first;
  // binding generated runtime code to that frame can place later code outside its lexical scope
  // and stop the whole LocalScript before combat HUD / visual setup runs.
  const frameMatch=output.match(/local\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*Instance\.new\(\s*["']ScreenGui["']\s*\)/)
    ||output.match(/local\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*Instance\.new\(\s*["']Frame["']\s*\)/);
  if(!frameMatch)throw new Error('EXISTING_VERIFIED_EXTERNAL_LEARNING_VISIBLE_TARGET_REQUIRED');
  const frameVar=frameMatch[1];
  const runtimeBlock=`-- VERIFIED_EXTERNAL_LEARNING_CLIENT_RUNTIME_BEGIN
${frameVar}:SetAttribute("VerifiedExternalLearningCoveragePct", verifiedExternalLearningContext.CoveragePct or 0)
${frameVar}:SetAttribute("VerifiedExternalLearningContentComplete", verifiedExternalLearningContext.ContentComplete == true)
${frameVar}:SetAttribute("VerifiedExternalLearningCount", #verifiedExternalLearningIds)
${frameVar}:SetAttribute("VerifiedExternalLearningPrincipleCount", #verifiedExternalLearningPrinciples)
${frameVar}:SetAttribute("VerifiedExternalLearningFingerprint", verifiedExternalLearningContext.MemoryFingerprint or "")
${frameVar}:SetAttribute("VerifiedExternalGameDevelopmentPrincipleCount", #verifiedExternalGameDevelopmentPrinciples)
${frameVar}:SetAttribute("VerifiedExternalLearningSemanticMappingVersion", verifiedExternalLearningContext.SemanticMappingVersion or 0)
${frameVar}:SetAttribute("VerifiedExternalLearningSemanticMappingFingerprint", verifiedExternalLearningContext.SemanticMappingFingerprint or "")
${frameVar}:SetAttribute("VerifiedExternalLearningDispositionCount", #verifiedExternalLearningDispositions)
${frameVar}:SetAttribute("VerifiedExternalLearningMappingCount", #verifiedExternalLearningMappings)
${frameVar}:SetAttribute("VerifiedLearningSemanticVariant", verifiedExternalLearningContext.SemanticVariant or "")
-- VERIFIED_EXTERNAL_LEARNING_CLIENT_RUNTIME_END
`;
  const managedRuntime=/-- VERIFIED_EXTERNAL_LEARNING_CLIENT_RUNTIME_BEGIN\n[\s\S]*?-- VERIFIED_EXTERNAL_LEARNING_CLIENT_RUNTIME_END\n/;
  if(managedRuntime.test(output))output=output.replace(managedRuntime,runtimeBlock);
  else{
    let at=(frameMatch.index||0)+frameMatch[0].length;
    if(output[at]===';')at++;
    output=output.slice(0,at)+'\n'+runtimeBlock+output.slice(at);
  }
  const behavior=robloxNativeLearningRuntimeBlock({frameVar,configVar,learning});
  const behaviorRe=/-- VERIFIED_EXTERNAL_LEARNING_ROBLOX_NATIVE_BEGIN\n[\s\S]*?-- VERIFIED_EXTERNAL_LEARNING_ROBLOX_NATIVE_END\n/;
  const currentNativeVersion=Number(output.match(/VERIFIED_EXTERNAL_LEARNING_NATIVE_BINDING_VERSION\s*=\s*(\d+)/)?.[1]||0);
  // Asset refresh may update context, but must preserve newer game-owned behavior.
  // Both callers still validate all required native and semantic binding signals.
  if(currentNativeVersion>ROBLOX_VERIFIED_EXTERNAL_NATIVE_BINDING_VERSION&&behaviorRe.test(output))return output;
  if(behaviorRe.test(output))output=output.replace(behaviorRe,behavior);
  else{
    let at=(frameMatch.index||0)+frameMatch[0].length;
    if(output[at]===';')at++;
    output=output.slice(0,at)+'\n'+behavior+output.slice(at);
  }
  return output;
}
export function applyVerifiedExternalLearningToExistingRobloxSource({root='',learning={}}={}){
  requireRobloxVerifiedExternalLearning(learning);
  const configFile=path.join(root,'shared','GameConfig.luau');
  const clientFile=path.join(root,'client','Game.client.luau');
  for(const file of [configFile,clientFile])if(!fs.existsSync(file))throw new Error('EXISTING_ROBLOX_LEARNING_SOURCE_FILE_MISSING:'+file);
  const beforeConfig=fs.readFileSync(configFile,'utf8');
  const beforeClient=fs.readFileSync(clientFile,'utf8');
  const afterConfig=replaceOrInsertVerifiedExternalLearningConfig(beforeConfig,learning);
  const afterClient=bindExistingClientVerifiedExternalLearning(beforeClient,learning);
  const requiredClientSignals=[
    'VERIFIED_EXTERNAL_LEARNING_ROBLOX_NATIVE_BEGIN',
    'VerifiedLearningSemanticVariant',
    'VerifiedLearningSemanticDomain',
    'VerifiedLearningSemanticMappingFingerprint',
    'VerifiedLearningGameSpecificMappingCount',
    'VerifiedLearningTouchTarget',
    'VerifiedExternalLearningGameplayState',
    'FieldOfView',
    'UISizeConstraint'
  ];
  for(const signal of requiredClientSignals)if(!afterClient.includes(signal))throw new Error('ROBLOX_NATIVE_LEARNING_SIGNAL_MISSING:'+signal);
  if(!afterConfig.includes('GameSpecificSemanticMappings')||!afterConfig.includes('LearningDispositions')||!afterConfig.includes(`SemanticMappingVersion = ${Number(learning.semanticMappingVersion||0)}`))throw new Error('ROBLOX_SEMANTIC_MAPPING_CONFIG_MISSING');
  const changedFiles=[];
  if(afterConfig!==beforeConfig){fs.writeFileSync(configFile,afterConfig);changedFiles.push(configFile);}
  if(afterClient!==beforeClient){fs.writeFileSync(clientFile,afterClient);changedFiles.push(clientFile);}
  return Object.freeze({
    changed:changedFiles.length>0,
    changedFiles:Object.freeze(changedFiles),
    serverTouched:false,
    serverInspection:'AFFECTED_SCOPE_ONLY_PRESENTATION_BINDING',
    semanticMappingVersion:Number(learning.semanticMappingVersion||0),
    semanticMappingFingerprint:learning.semanticMappingFingerprint||null,
    semanticVariant:learning.semanticVariant||null,
    gameSpecificSemanticMappings:Object.freeze([...(learning.gameSpecificSemanticMappings||[])]),
    verifiedExternalLearningDispositions:Object.freeze([...(learning.verifiedExternalLearningDispositions||[])]),
    verifiedExternalLearningIds:Object.freeze([...(learning.verifiedExternalLearningIds||[])]),
    verifiedExternalLearningFingerprint:learning.verifiedExternalLearningFingerprint||null,
    verifiedExternalLearningApplyAxes:Object.freeze([...(learning.verifiedExternalLearningApplyAxes||[])])
  });
}
function studioAssetConfigBlock(studioAssets={}){
  const familyRows=Object.entries(studioAssets?.families||{}).map(([family,atoms])=>`      ${family} = { ${(atoms||[]).map(value=>luauString(value)).join(', ')} },`).join('\n');
  return `  -- STUDIO_ASSET_BINDING_BEGIN
  StudioAssets = {
    Applied = ${studioAssets.applied?'true':'false'},
    BindingVersion = 2,
    LibraryVersion = ${Number(studioAssets.libraryVersion||0)},
    SelectionFingerprint = ${luauString(studioAssets.selectionFingerprint||'')},
    SourceUsageFingerprint = ${luauString(studioAssets.buildUpAssetSourceUsageFingerprint||'')},
    SourceUsageLibraryVersion = ${Number(studioAssets.buildUpAssetSourceUsageLibraryVersion||studioAssets.libraryVersion||0)},
    Source = ${luauString(studioAssets.source||'company-asset-library.json#baseMaterialLibrary')},
    AtomState = ${luauString(studioAssets.atomState||'')},
    RecipeId = ${luauString(studioAssets.recipeId||'NORMAL_VARIANT')},
    ProductionVerified = false,
    RuntimeVerificationRequired = true,
    Families = {
${familyRows}
    },
    MotionQuality = {
      Contract = "company-learning/platform-release-roadmap.json#livingMotionVisualQualityContract.robloxCharacterMotionQuality",
      LibraryFirst = true,
      ArticulatedRigRequired = true,
      AnimatorRequired = true,
      BlendAndSpeedSyncRequired = true,
      RuntimeVerificationRequired = true,
      MannequinHardFailure = "CHARACTER_MOTION_MANNEQUIN",
    },
  },
  -- STUDIO_ASSET_BINDING_END
`;
}

function replaceOrInsertStudioAssetConfig(source='',studioAssets={}){
  const block=studioAssetConfigBlock(studioAssets);
  const managed=/  -- STUDIO_ASSET_BINDING_BEGIN\n[\s\S]*?  -- STUDIO_ASSET_BINDING_END\n/;
  if(managed.test(source))return source.replace(managed,block);
  if(/\bStudioAssets\s*=\s*\{/.test(source))throw new Error('EXISTING_STUDIO_ASSET_BINDING_UNMANAGED');
  const returnIndex=source.lastIndexOf('\nreturn ');
  const closeIndex=returnIndex>=0?source.lastIndexOf('\n}',returnIndex):-1;
  if(closeIndex<0)throw new Error('EXISTING_STUDIO_ASSET_CONFIG_INSERT_POINT_MISSING');
  return source.slice(0,closeIndex+1)+block+source.slice(closeIndex+1);
}

function studioAssetDynamicBindingBlock({familyStatus={},configVar='Config'}={}){
  const statusRows=ROBLOX_STUDIO_ASSET_REQUIRED_FAMILIES.map(family=>`  ${family} = "${familyStatus[family]==='APPLIED'?'APPLIED':'NOT_APPLICABLE'}",`).join('\n');
  const selectionRows=ROBLOX_STUDIO_ASSET_REQUIRED_FAMILIES.map(family=>`  ${family} = studioAssetFamily("${family}"),`).join('\n');
  return `-- STUDIO_ASSET_BINDING_CLIENT_BEGIN
local STUDIO_ASSET_BINDING_VERSION = 2
local studioAssetConfig = ${configVar}.StudioAssets or {}
local studioAssetFamilies = studioAssetConfig.Families or {}
local studioAssetSelectionFingerprint = studioAssetConfig.SelectionFingerprint or ""
local function studioAssetFamily(family)
  local atoms = studioAssetFamilies[family]
  return type(atoms) == "table" and atoms or {}
end
local function hasStudioAssetAtom(familyOrAtom, atom)
  local family = atom == nil and "UI" or familyOrAtom
  local assetAtom = atom == nil and familyOrAtom or atom
  return table.find(studioAssetFamily(family), assetAtom) ~= nil
end
local STUDIO_ASSET_SELECTION = {
${selectionRows}
}
local STUDIO_ASSET_FAMILY_STATUS = {
${statusRows}
}
-- STUDIO_ASSET_BINDING_CLIENT_END
`;
}

function bindExistingClientStudioAssets(source='',familyStatus={}){
  const managed=/-- STUDIO_ASSET_BINDING_CLIENT_BEGIN\n[\s\S]*?-- STUDIO_ASSET_BINDING_CLIENT_END\n?/;
  const dynamicManaged=/-- STUDIO_ASSET_DYNAMIC_BINDING_BEGIN\n[\s\S]*?-- STUDIO_ASSET_DYNAMIC_BINDING_END\n?/;
  const selectionRe=/local\s+STUDIO_ASSET_SELECTION\s*=\s*\{[\s\S]*?\n\}\n?/;
  const statusRe=/local\s+STUDIO_ASSET_FAMILY_STATUS\s*=\s*\{[\s\S]*?\n\}\n?/;
  let output=source
    .replace(managed,'')
    .replace(dynamicManaged,'')
    .replace(selectionRe,'')
    .replace(statusRe,'')
    .replace(/^\s*local\s+STUDIO_ASSET_BINDING_VERSION\s*=\s*[12]\s*\n/m,'');
  const requireMatch=output.match(/local\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*require\([^\n]*GameConfig[^\n]*\)/);
  if(!requireMatch)throw new Error('EXISTING_STUDIO_ASSET_CLIENT_CONFIG_REQUIRE_MISSING');
  const configVar=requireMatch[1];
  const block=studioAssetDynamicBindingBlock({familyStatus,configVar});
  const learningContext=output.match(/-- VERIFIED_EXTERNAL_LEARNING_CLIENT_CONTEXT_BEGIN\n[\s\S]*?-- VERIFIED_EXTERNAL_LEARNING_CLIENT_CONTEXT_END\n?/);
  const insertAt=learningContext
    ?Number(learningContext.index||0)+learningContext[0].length
    :requireMatch.index+requireMatch[0].length;
  const tail=output.slice(insertAt).replace(/^\n*/,'');
  const prefix=output.slice(0,insertAt).replace(/\n*$/,'');
  output=prefix+(learningContext?'\n\n':'\n')+block+tail;
  const studioUiVisualMissing=!/StudioAssetFramePanel/.test(output);
  const studioUiTraceMissing=!/SetAttribute\s*\(\s*["']StudioAssetBindingVersion["']/.test(output);
  if(studioUiVisualMissing||studioUiTraceMissing){
    const frameMatch=output.match(/local\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*Instance\.new\(\s*["']Frame["']\s*\)/);
    if(!frameMatch)throw new Error('EXISTING_STUDIO_ASSET_VISIBLE_TARGET_REQUIRED');
    const frameVar=frameMatch[1];
    let frameInsertAt=(frameMatch.index||0)+frameMatch[0].length;
    if(output[frameInsertAt]===';')frameInsertAt++;
    const visual=studioUiVisualMissing?`
if hasStudioAssetAtom("UI", "FRAME_PANEL") then
  local studioAssetStroke = Instance.new("UIStroke")
  studioAssetStroke.Name = "StudioAssetFramePanel"
  studioAssetStroke.Thickness = 1
  studioAssetStroke.Transparency = 0.55
  studioAssetStroke.Color = Color3.fromRGB(210, 225, 255)
  studioAssetStroke.Parent = ${frameVar}
end
`:'';
    const trace=studioUiTraceMissing?`
${frameVar}:SetAttribute("StudioAssetBindingVersion", STUDIO_ASSET_BINDING_VERSION)
${frameVar}:SetAttribute("StudioAssetSelectionFingerprint", studioAssetSelectionFingerprint)
${frameVar}:SetAttribute("StudioAssetAtoms", table.concat(studioAssetFamily("UI"), ","))
`:'';
    output=output.slice(0,frameInsertAt)+visual+trace+output.slice(frameInsertAt);
  }
  output=output.replace(/\btable\.concat\(\s*studioUi\s*,/g,'table.concat(studioAssetFamily("UI"),');
  return output;
}

function foundationCharacterSource(name,spawn){
  return `local function ${name}(character)
  local humanoid = character:WaitForChild("Humanoid", 10)
  local rootPart = character:WaitForChild("HumanoidRootPart", 10)
  if not humanoid or not rootPart then character:SetAttribute("FoundationFailure", "CHARACTER_FOUNDATION_FAILURE"); return end
  character:SetAttribute("GROUND_CONTACT", false)
  character:SetAttribute("MOVEMENT_CONFIRMED", false)
  rootPart.Anchored = false
  humanoid.PlatformStand = false
  for _, bodyPart in ipairs(character:GetDescendants()) do
    if bodyPart:IsA("BasePart") and not bodyPart:FindFirstAncestorOfClass("Tool") then bodyPart.Anchored = false end
  end
  local params = RaycastParams.new()
  params.ExcludeInstances = {character, ${spawn}}
  params.RespectCanCollide = true
  params.IgnoreWater = true
  params.CollisionGroup = rootPart.CollisionGroup
  local leg = humanoid.RigType == Enum.HumanoidRigType.R6 and character:FindFirstChild("Left Leg") or nil
  local clearance = humanoid.HipHeight + rootPart.Size.Y * 0.5 + (leg and leg.Size.Y or 0)
  local groundHit = workspace:Raycast(rootPart.Position + Vector3.new(0, 4, 0), Vector3.new(0, -512, 0), params)
  if not groundHit or groundHit.Normal.Y < 0.55 then
    groundHit = workspace:Raycast(${spawn}.Position + Vector3.new(0, 64, 0), Vector3.new(0, -576, 0), params)
  end
  if not groundHit or groundHit.Normal.Y < 0.55 then
    character:SetAttribute("FoundationFailure", "SPAWN_GROUND_MISSING")
    return
  end
  -- The existing spawn rests on verified world geometry; it cannot be its own ground proof.
  local spawnHit = workspace:Raycast(${spawn}.Position + Vector3.new(0, 64, 0), Vector3.new(0, -576, 0), params)
  if spawnHit and spawnHit.Normal.Y >= 0.55 then
    ${spawn}.Position = Vector3.new(${spawn}.Position.X, spawnHit.Position.Y - ${spawn}.Size.Y * 0.5 + 0.05, ${spawn}.Position.Z)
  end
  local target = groundHit.Position + Vector3.new(0, clearance + 0.1, 0)
  character:PivotTo(character:GetPivot() + (target - rootPart.Position))
  rootPart.AssemblyLinearVelocity = Vector3.zero
  rootPart.AssemblyAngularVelocity = Vector3.zero
  local movementOrigin = rootPart.Position
  humanoid.Running:Connect(function(speed)
    if not rootPart.Parent or humanoid.FloorMaterial == Enum.Material.Air then return end
    local displacement = (rootPart.Position - movementOrigin) * Vector3.new(1, 0, 1)
    if speed > 0.1 and displacement.Magnitude > 0.5 then character:SetAttribute("MOVEMENT_CONFIRMED", true) end
  end)
  local deadline = os.clock() + 5
  repeat
    if not character.Parent or not rootPart.Parent then return end
    local contact = workspace:Raycast(rootPart.Position, Vector3.new(0, -(clearance + 0.75), 0), params)
    if contact and contact.Normal.Y >= 0.55 and humanoid.FloorMaterial ~= Enum.Material.Air and math.abs(rootPart.AssemblyLinearVelocity.Y) < 3 then
      character:SetAttribute("GROUND_CONTACT", true)
      character:SetAttribute("FoundationFailure", nil)
      character:SetAttribute("NativeFoundationGroundingVersion", 2)
      return
    end
    task.wait(0.1)
  until os.clock() >= deadline
  character:SetAttribute("FoundationFailure", "GROUND_CONTACT_FAILURE")
end`;
}

export function applyRobloxStudioAssetBindingToExistingSource({root='',gameId='',baseline={},assetLibrary={},foundationRepair=false,learning={}}={}){
  const verifiedLearning=requireRobloxVerifiedExternalLearning(learning);
  const profile=robloxBuildProfileFromBaseline(baseline);
  const studioAssets=buildRobloxStudioAssetBootstrapPlan({gameId,profile,assetLibrary});
  if(studioAssets.applied!==true)throw new Error('ROBLOX_STUDIO_ASSET_LIBRARY_NOT_READY');
  const configFile=path.join(root,'shared','GameConfig.luau');
  const clientFile=path.join(root,'client','Game.client.luau');
  const serverFile=path.join(root,'server','Game.server.luau');
  const projectFile=path.join(root,'default.project.json');
  for(const file of [configFile,clientFile,projectFile])if(!fs.existsSync(file))throw new Error('EXISTING_ROBLOX_SOURCE_FILE_MISSING:'+path.basename(file));
  if(foundationRepair===true&&!fs.existsSync(serverFile))throw new Error('EXISTING_ROBLOX_SOURCE_FILE_MISSING:'+path.basename(serverFile));
  const beforeConfig=fs.readFileSync(configFile,'utf8');
  const beforeClient=fs.readFileSync(clientFile,'utf8');
  const beforeServer=fs.existsSync(serverFile)?fs.readFileSync(serverFile,'utf8'):'';
  const beforeProject=fs.readFileSync(projectFile,'utf8');
  const studioAssetFamilyStatus=robloxStudioAssetFamilyStatusFromSource({sourceText:robloxStudioAssetDetectionSourceFromRoot(root)});
  const project=JSON.parse(beforeProject.replace(/^\uFEFF/,''));
  if(!project.tree||project.tree.$className!=='DataModel')throw new Error('EXISTING_ROBLOX_PROJECT_DATAMODEL_REQUIRED');
  const existingLighting=project.tree.Lighting&&typeof project.tree.Lighting==='object'?project.tree.Lighting:{};
  const existingLightingProperties=existingLighting.$properties&&typeof existingLighting.$properties==='object'?existingLighting.$properties:{};
  const currentTechnology=clean(existingLightingProperties.Technology);
  const supportedTechnology=['Voxel','ShadowMap','Future'].includes(currentTechnology)?currentTechnology:null;
  const migratedFromCompatibility=!supportedTechnology;
  const lightingProfile=supportedTechnology==='Future'
    ?{Technology:'Future',LightingStyle:clean(existingLightingProperties.LightingStyle)||'Realistic',PrioritizeLightingQuality:existingLightingProperties.PrioritizeLightingQuality??true}
    :supportedTechnology==='ShadowMap'
      ?{Technology:'ShadowMap',LightingStyle:clean(existingLightingProperties.LightingStyle)||'Soft',PrioritizeLightingQuality:existingLightingProperties.PrioritizeLightingQuality??true}
      :{Technology:'Voxel',LightingStyle:clean(existingLightingProperties.LightingStyle)||'Soft',PrioritizeLightingQuality:existingLightingProperties.PrioritizeLightingQuality??false};
  project.tree.Lighting={
    ...existingLighting,
    $properties:{...existingLightingProperties,...lightingProfile},
  };
  if(migratedFromCompatibility){
    const existingTone=existingLighting.CompatibilityToneMap&&typeof existingLighting.CompatibilityToneMap==='object'?existingLighting.CompatibilityToneMap:{};
    project.tree.Lighting.CompatibilityToneMap={
      ...existingTone,
      $className:'ColorGradingEffect',
      $properties:{...(existingTone.$properties||{}),TonemapperPreset:'Retro'},
    };
  }
  const afterProject=`${JSON.stringify(project,null,2)}\n`;
  let afterConfig=replaceOrInsertStudioAssetConfig(beforeConfig,studioAssets);
  let afterClient=bindExistingClientStudioAssets(beforeClient,studioAssetFamilyStatus);
  let afterServer=beforeServer;
  afterConfig=replaceOrInsertVerifiedExternalLearningConfig(afterConfig,verifiedLearning);
  afterClient=bindExistingClientVerifiedExternalLearning(afterClient,verifiedLearning);

  if(foundationRepair===true){
    if(!/MobileFirst\s*=\s*true/.test(afterConfig)){
      if(!/Platform\s*=\s*["']ROBLOX["']\s*,?/.test(afterConfig))throw new Error('EXISTING_FOUNDATION_CONFIG_PLATFORM_ANCHOR_MISSING');
      afterConfig=afterConfig.replace(/(Platform\s*=\s*["']ROBLOX["']\s*,?)/, '$1\n  MobileFirst = true,');
    }

    if(!/native-foundation-sentinel-v1/.test(afterServer)){
      afterServer += `

-- native-foundation-sentinel-v1
local nativeFoundationRemote = ReplicatedStorage:FindFirstChild("RuntimeFoundationReport")
if nativeFoundationRemote and not nativeFoundationRemote:IsA("RemoteEvent") then
  nativeFoundationRemote:Destroy()
  nativeFoundationRemote = nil
end
if not nativeFoundationRemote then
  nativeFoundationRemote = Instance.new("RemoteEvent")
  nativeFoundationRemote.Name = "RuntimeFoundationReport"
  nativeFoundationRemote.Parent = ReplicatedStorage
end
local nativeFoundationSpawn = workspace:FindFirstChild("NativeFoundationSpawn")
if not nativeFoundationSpawn then
  nativeFoundationSpawn = Instance.new("SpawnLocation")
  nativeFoundationSpawn.Name = "NativeFoundationSpawn"
  nativeFoundationSpawn.Size = Vector3.new(8, 1, 8)
  nativeFoundationSpawn.Position = Vector3.new(0, 3, 0)
  nativeFoundationSpawn.Neutral = true
  nativeFoundationSpawn.Anchored = true
  nativeFoundationSpawn.CanCollide = true
  nativeFoundationSpawn.Parent = workspace
end
${foundationCharacterSource("bindNativeFoundationCharacter","nativeFoundationSpawn")}
local function bindNativeFoundationPlayer(player)
  if player.Character then task.defer(bindNativeFoundationCharacter, player.Character) end
  player.CharacterAdded:Connect(bindNativeFoundationCharacter)
end
Players.PlayerAdded:Connect(bindNativeFoundationPlayer)
for _, nativeFoundationPlayer in ipairs(Players:GetPlayers()) do
  task.defer(bindNativeFoundationPlayer, nativeFoundationPlayer)
end
nativeFoundationRemote.OnServerEvent:Connect(function(player, signal)
  if typeof(signal) ~= "string" then return end
  player:SetAttribute("NativeFoundationReadyAt", os.time())
end)
game:BindToClose(function() end)
`;
    }

    // Upgrade only the known faulty foundation owner, preserving custom gameplay functions.
    afterServer=afterServer.replace(/local function (bind(?:Native)?FoundationCharacter)\(character\)\n[\s\S]*?\nend(?=\s*local function bind(?:Native)?FoundationPlayer)/g,(body,name)=>{
      const legacy=`local function ${name}(character)
  local humanoid = character:WaitForChild("Humanoid")
  local rootPart = character:WaitForChild("HumanoidRootPart")
  rootPart.Anchored = false
  humanoid.PlatformStand = false
  local groundHit = workspace:Raycast(rootPart.Position, Vector3.new(0, -10, 0))
  character:SetAttribute("GROUND_CONTACT", groundHit ~= nil)
  character:SetAttribute("MOVEMENT_CONFIRMED", true)
end`;
      if(body.replace(/\s+/g,' ').trim()!==legacy.replace(/\s+/g,' ').trim())return body;
      return foundationCharacterSource(name,name==='bindNativeFoundationCharacter'?'nativeFoundationSpawn':'foundationSpawn');
    });

    if(!/RuntimeFoundationReport/.test(afterClient)||!/CameraSubject/.test(afterClient)||!/TouchEnabled/.test(afterClient)){
      afterClient += `

-- native-foundation-sentinel-v1 client readiness
local nativeFoundationInput = game:GetService("UserInputService")
local nativeTouchEnabled = nativeFoundationInput.TouchEnabled
local nativeFoundationRemote = ReplicatedStorage:WaitForChild("RuntimeFoundationReport")
local nativeFoundationCamera = workspace.CurrentCamera
local function reportNativeFoundationReady()
  local character = player.Character or player.CharacterAdded:Wait()
  local humanoid = character:WaitForChild("Humanoid")
  if nativeFoundationCamera and nativeFoundationCamera.CameraSubject == humanoid then
    nativeFoundationRemote:FireServer("CAMERA_READY")
  end
  nativeFoundationRemote:FireServer(nativeTouchEnabled and "INPUT_READY_TOUCH" or "INPUT_READY")
end
task.defer(reportNativeFoundationReady)
`;
    }
  }

  if(!/StudioAssets\s*=\s*\{/.test(afterConfig)||!/BindingVersion\s*=\s*2/.test(afterConfig)||!afterConfig.includes(`LibraryVersion = ${Number(studioAssets.libraryVersion||0)}`)||!afterConfig.includes(`SelectionFingerprint = ${luauString(studioAssets.selectionFingerprint||'')}`))throw new Error('EXISTING_STUDIO_ASSET_CONFIG_VERIFY_FAILED');
  const studioClientConfigBound=/STUDIO_ASSET_BINDING_VERSION\s*=\s*2/.test(afterClient)&&/[A-Za-z_][A-Za-z0-9_]*\.StudioAssets/.test(afterClient);
  const studioClientVisibleBound=/StudioAssetFramePanel/.test(afterClient)
    ||(/StudioAssetBindingVersion/.test(afterClient)&&/StudioAssetAtoms/.test(afterClient)&&/FRAME_PANEL/.test(afterClient)&&/(hasStudioAssetAtom|hasStudioAtom)/.test(afterClient));
  const studioSelectionBlock=afterClient.match(/\bSTUDIO_ASSET_SELECTION\s*=\s*\{([\s\S]*?)\n\}/)?.[1]||'';
  const studioStatusBlock=afterClient.match(/\bSTUDIO_ASSET_FAMILY_STATUS\s*=\s*\{([\s\S]*?)\n\}/)?.[1]||'';
  const studioFamilyTraceComplete=ROBLOX_STUDIO_ASSET_REQUIRED_FAMILIES.every(family=>
    new RegExp('\\b'+family+'\\s*=').test(studioSelectionBlock)
    &&new RegExp('\\b'+family+'\\s*=\\s*["\\\'](?:APPLIED|NOT_APPLICABLE)["\\\']','i').test(studioStatusBlock)
  );
  if(!studioClientConfigBound||!studioClientVisibleBound||!studioFamilyTraceComplete)throw new Error('EXISTING_STUDIO_ASSET_CLIENT_VERIFY_FAILED');
  if(!/VERIFIED_EXTERNAL_LEARNING_BINDING_BEGIN/.test(afterConfig)    ||!/ContentComplete\s*=\s*true/.test(afterConfig)    ||!/GameSpecificSemanticMappings\s*=\s*\{/.test(afterConfig)    ||!/LearningDispositions\s*=\s*\{/.test(afterConfig)    ||!afterConfig.includes(`SemanticMappingVersion = ${Number(verifiedLearning.semanticMappingVersion||0)}`)    ||!afterConfig.includes(`MemoryFingerprint = ${luauString(verifiedLearning.verifiedExternalLearningFingerprint||'')}`))throw new Error('EXISTING_VERIFIED_EXTERNAL_LEARNING_CONFIG_VERIFY_FAILED');
  if(!/VERIFIED_EXTERNAL_LEARNING_CLIENT_CONTEXT_BEGIN/.test(afterClient)    ||!/VerifiedExternalLearningContentComplete/.test(afterClient)    ||!/VerifiedExternalLearningSemanticMappingVersion/.test(afterClient)    ||!/VerifiedExternalLearningSemanticMappingFingerprint/.test(afterClient)    ||!/VerifiedLearningSemanticVariant/.test(afterClient)    ||!/VerifiedLearningSemanticMappingFingerprint/.test(afterClient)    ||!/VerifiedLearningTouchTarget/.test(afterClient)    ||!/VERIFIED_EXTERNAL_LEARNING_ROBLOX_NATIVE_BEGIN/.test(afterClient)    ||!/FieldOfView/.test(afterClient)    ||Number(afterClient.match(/VERIFIED_EXTERNAL_LEARNING_NATIVE_BINDING_VERSION\s*=\s*(\d+)/)?.[1]||0)<ROBLOX_VERIFIED_EXTERNAL_NATIVE_BINDING_VERSION)throw new Error('EXISTING_VERIFIED_EXTERNAL_LEARNING_CLIENT_VERIFY_FAILED');
  if(foundationRepair===true){
    const combined=afterServer+'\n'+afterClient;
    for(const [token,re] of Object.entries({
      sentinel:/native-foundation-sentinel-v1/,
      foundationRemote:/RuntimeFoundationReport/,
      spawn:/SpawnLocation/,
      rootPart:/HumanoidRootPart/,
      ground:/GROUND_CONTACT/,
      movement:/MOVEMENT_CONFIRMED/,
      physics:/\.Anchored\s*=\s*false[\s\S]*PlatformStand\s*=\s*false/,
      raycast:/Raycast\s*\(/,
      camera:/CameraSubject/,
      touch:/TouchEnabled/,
      bindClose:/BindToClose\s*\(/,
    }))if(!re.test(combined))throw new Error('EXISTING_FOUNDATION_REPAIR_VERIFY_FAILED:'+token);
  }

  fs.writeFileSync(configFile,afterConfig,'utf8');
  fs.writeFileSync(clientFile,afterClient,'utf8');
  if(afterProject!==beforeProject)fs.writeFileSync(projectFile,afterProject,'utf8');
  if(foundationRepair===true&&afterServer!==beforeServer)fs.writeFileSync(serverFile,afterServer,'utf8');
  const changedFiles=[configFile,clientFile];
  if(afterProject!==beforeProject)changedFiles.push(projectFile);
  if(foundationRepair===true&&afterServer!==beforeServer)changedFiles.push(serverFile);
  return Object.freeze({
    existingSourcePreserved:true,
    changedFiles:Object.freeze(changedFiles),
    studioAssets,
    studioAssetFamilyStatus,
    verifiedExternalLearningApplied:true,
    verifiedExternalLearningFingerprint:verifiedLearning.verifiedExternalLearningFingerprint||null,
    verifiedExternalLearningIds:Object.freeze([...(verifiedLearning.verifiedExternalLearningIds||[])]),
    foundationRepairApplied:foundationRepair===true,
    gameplayAuthorityChanged:false,
    serverSourceChanged:foundationRepair===true&&afterServer!==beforeServer,
  });
}
function sourceBlockers(text,{kind,saveRequired=false,profile=null}={}){
  const value=String(text??'');
  const blockers=[];
  const minBytes=kind==='config'?500:kind==='server'?1600:1200;
  if(Buffer.byteLength(value,'utf8')<minBytes)blockers.push(`${kind.toUpperCase()}_SOURCE_TOO_SMALL`);
  if(/\b(TODO|FIXME|NotImplemented|PLACEHOLDER|placeholder)\b/.test(value))blockers.push(`${kind.toUpperCase()}_PLACEHOLDER_FORBIDDEN`);
  if(/loadstring\s*\(/.test(value))blockers.push(`${kind.toUpperCase()}_LOADSTRING_FORBIDDEN`);
  if(/require\s*\(\s*\d+\s*\)/.test(value))blockers.push(`${kind.toUpperCase()}_ASSET_REQUIRE_FORBIDDEN`);
  if(kind==='config'){
    if(!/PolicySource\s*=\s*["']company-learning\/platform-release-roadmap\.json["']/.test(value))blockers.push('CONFIG_POLICY_SOURCE_REQUIRED');
    if(!/Platform\s*=\s*["']ROBLOX["']/.test(value))blockers.push('CONFIG_ROBLOX_PLATFORM_REQUIRED');
    if(!/MobileFirst\s*=\s*true/.test(value))blockers.push('CONFIG_MOBILE_FIRST_REQUIRED');
    if(profile){
      if(!value.includes(`Genre = ${luauString(profile.genre)}`))blockers.push('CONFIG_GENRE_PROFILE_REQUIRED');
      if(!value.includes(`PlayMode = ${luauString(profile.playMode)}`))blockers.push('CONFIG_PLAY_MODE_PROFILE_REQUIRED');
      if(!value.includes(`MultiplayerRequired = ${profile.multiplayerRequired?'true':'false'}`))blockers.push('CONFIG_MULTIPLAYER_PROFILE_REQUIRED');
    }
  }
  if(kind==='server'){
    if(!/game:GetService\(["']Players["']\)/.test(value))blockers.push('SERVER_PLAYERS_SERVICE_REQUIRED');
    if(!/game:GetService\(["']ReplicatedStorage["']\)/.test(value))blockers.push('SERVER_REPLICATED_STORAGE_REQUIRED');
    if(!/RemoteEvent/.test(value)||!/OnServerEvent/.test(value))blockers.push('SERVER_REMOTE_BOUNDARY_REQUIRED');
    if(!/(typeof\s*\(|type\s*\()/.test(value))blockers.push('SERVER_REMOTE_INPUT_VALIDATION_REQUIRED');
    if(!/(cooldown|rateLimit|rate_limit|lastAction|lastRequest)/i.test(value))blockers.push('SERVER_REMOTE_RATE_LIMIT_REQUIRED');
    if(!/SetAttribute\s*\(/.test(value))blockers.push('SERVER_OBSERVABLE_STATE_REQUIRED');
    if(saveRequired){
      if(!/DataStoreService/.test(value))blockers.push('SERVER_DATASTORE_REQUIRED');
      if(!/GetAsync\s*\(/.test(value))blockers.push('SERVER_DATASTORE_LOAD_REQUIRED');
      if(!/(UpdateAsync|SetAsync)\s*\(/.test(value))blockers.push('SERVER_DATASTORE_SAVE_REQUIRED');
    }
    if(profile?.multiplayerRequired){
      if(!/FireAllClients\s*\(/.test(value))blockers.push('SERVER_MULTIPLAYER_BROADCAST_REQUIRED');
      if(!/Players:GetPlayers\s*\(\)/.test(value))blockers.push('SERVER_MULTIPLAYER_PARTICIPANT_STATE_REQUIRED');
      if(profile.coopImplementationRequired&&!/SharedObjective/.test(value))blockers.push('SERVER_COOP_SHARED_OBJECTIVE_REQUIRED');
      if(profile.competitiveImplementationRequired&&!/RoundScore/.test(value))blockers.push('SERVER_COMPETITIVE_SCORE_REQUIRED');
    }
  }
  if(kind==='client'){
    if(!/game:GetService\(["']UserInputService["']\)/.test(value)&&!/game:GetService\(["']ContextActionService["']\)/.test(value))blockers.push('CLIENT_MOBILE_INPUT_SERVICE_REQUIRED');
    if(!/(TouchEnabled|ContextActionService|TouchTap|Activated)/.test(value))blockers.push('CLIENT_TOUCH_INPUT_REQUIRED');
    if(!/FireServer\s*\(/.test(value))blockers.push('CLIENT_SERVER_ACTION_REQUIRED');
    if(!/(ScreenGui|TextButton|ImageButton)/.test(value))blockers.push('CLIENT_MOBILE_UI_REQUIRED');
    if(!/GetAttributeChangedSignal|GetAttribute\s*\(/.test(value))blockers.push('CLIENT_OBSERVABLE_STATE_BIND_REQUIRED');
    if(profile?.multiplayerRequired&&!/OnClientEvent/.test(value))blockers.push('CLIENT_MULTIPLAYER_SYNC_REQUIRED');
  }
  return blockers;
}

export function validateRobloxBootstrap({sharedConfig='',serverCode='',clientCode='',baseline={},profile=null,learning={},studioAssets={}}={}){
  const buildProfile=profile||robloxBuildProfileFromBaseline(baseline);
  const saveRequired=requiresPersistentSave(baseline);
  const blockers=[
    ...sourceBlockers(sharedConfig,{kind:'config',saveRequired,profile:buildProfile}),
    ...sourceBlockers(serverCode,{kind:'server',saveRequired,profile:buildProfile}),
    ...sourceBlockers(clientCode,{kind:'client',saveRequired,profile:buildProfile}),
  ];
  if(studioAssets?.applied===true){
    if(!/StudioAssets\s*=/.test(sharedConfig)||!/BindingVersion\s*=\s*2/.test(sharedConfig))blockers.push('CONFIG_STUDIO_ASSET_BINDING_REQUIRED');
    if(!(studioAssets?.families?.MOTION||[]).length)blockers.push('CONFIG_STUDIO_MOTION_ATOMS_REQUIRED');
    if(!/MotionQuality\s*=/.test(sharedConfig)||!/MannequinHardFailure\s*=\s*["']CHARACTER_MOTION_MANNEQUIN["']/.test(sharedConfig))blockers.push('CONFIG_ROBLOX_MOTION_QUALITY_REQUIRED');
    if(!/STUDIO_ASSET_BINDING_VERSION\s*=\s*2/.test(clientCode))blockers.push('CLIENT_STUDIO_ASSET_BINDING_VERSION_REQUIRED');
    if(!/[A-Za-z_][A-Za-z0-9_]*\.StudioAssets/.test(clientCode))blockers.push('CLIENT_STUDIO_ASSET_CONFIG_USAGE_REQUIRED');
    if(!/(?:Instance\.new\s*\(\s*["']Frame["']|Color3\.fromRGB|BackgroundColor3)/.test(clientCode))blockers.push('CLIENT_STUDIO_ASSET_VISIBLE_BINDING_REQUIRED');
    const selectionBlock=clientCode.match(/\bSTUDIO_ASSET_SELECTION\s*=\s*\{([\s\S]*?)\n\}/)?.[1]||'';
    const statusBlock=clientCode.match(/\bSTUDIO_ASSET_FAMILY_STATUS\s*=\s*\{([\s\S]*?)\n\}/)?.[1]||'';
    for(const family of ROBLOX_STUDIO_ASSET_REQUIRED_FAMILIES){
      if(!new RegExp('\\b'+family+'\\s*=').test(selectionBlock))blockers.push('CLIENT_STUDIO_ASSET_SELECTION_REQUIRED:'+family);
      if(!new RegExp('\\b'+family+'\\s*=\\s*["\\\'](?:APPLIED|NOT_APPLICABLE)["\\\']','i').test(statusBlock))blockers.push('CLIENT_STUDIO_ASSET_FAMILY_STATUS_REQUIRED:'+family);
    }
  }
  if(learning?.applied===true){
    if(!/LearningContext\s*=/.test(sharedConfig))blockers.push('CONFIG_VIBE3_LEARNING_CONTEXT_REQUIRED');
    if(!/VerifiedExternalLearningFirst\s*=\s*true/.test(sharedConfig)||!/ContentComplete\s*=\s*true/.test(sharedConfig))blockers.push('CONFIG_VERIFIED_EXTERNAL_LEARNING_CONTENT_REQUIRED');
    const semanticVersion=Number(learning.semanticMappingVersion||1);
    if(!sharedConfig.includes(`SemanticMappingVersion = ${semanticVersion}`))blockers.push('CONFIG_ROBLOX_SEMANTIC_MAPPING_VERSION_REQUIRED');
    if(!/GameSpecificSemanticMappings\s*=\s*\{/.test(sharedConfig))blockers.push('CONFIG_ROBLOX_GAME_SPECIFIC_SEMANTIC_MAPPING_REQUIRED');
    if(!/LearningDispositions\s*=\s*\{/.test(sharedConfig))blockers.push('CONFIG_ROBLOX_LEARNING_DISPOSITION_REQUIRED');
    if(learning.allRetrievedPrinciplesHaveExplicitDisposition!==true)blockers.push('CONFIG_ROBLOX_LEARNING_DISPOSITION_INCOMPLETE');
    for(const axis of learning.verifiedExternalLearningApplyAxes||[])if(!sharedConfig.includes(axis))blockers.push('CONFIG_ROBLOX_SEMANTIC_DOMAIN_MISSING:'+axis);
    if(/ROBLOX_RUNTIME_QA_AND_RELIABILITY|APK_INSTALLATION|ANDROID_ABI|HOSTED_EMULATOR/.test(sharedConfig))blockers.push('CONFIG_QA_INFRASTRUCTURE_PRINCIPLE_IN_GAME_SOURCE');
    if(!/VERIFIED_EXTERNAL_LEARNING_ROBLOX_NATIVE_BEGIN/.test(clientCode))blockers.push('CLIENT_VERIFIED_EXTERNAL_ROBLOX_NATIVE_BINDING_REQUIRED');
    if(!/VerifiedLearningSemanticVariant/.test(clientCode)||!/VerifiedLearningSemanticDomain/.test(clientCode)||!/VerifiedLearningSemanticMappingFingerprint/.test(clientCode))blockers.push('CLIENT_VERIFIED_EXTERNAL_SEMANTIC_BINDING_REQUIRED');
    if(!/VerifiedLearningTouchTarget/.test(clientCode)||!/ContextActionService/.test(clientCode)||!/BindAction\s*\(/.test(clientCode))blockers.push('CLIENT_VERIFIED_EXTERNAL_TOUCH_CONTROL_REQUIRED');
    if(!/VerifiedExternalLearningGameplayState/.test(clientCode))blockers.push('CLIENT_VERIFIED_EXTERNAL_GAMEPLAY_STATE_REQUIRED');
  }
  return Object.freeze({pass:blockers.length===0,blockers:Object.freeze([...new Set(blockers)]),saveRequired,profile:buildProfile,learningApplied:learning?.applied===true});
}

export function classifyRobloxScope(item={},index=0){
  const text=`${clean(item.path).toLowerCase()} ${clean(item.label).toLowerCase()}`;
  if(/puzzle|match|merge|word|퍼즐|매치|머지|단어/.test(text))return 'PUZZLE';
  if(/tower.?defen|defense|디펜스/.test(text))return 'DEFENSE';
  if(/combat|fight|attack|damage|enemy|opponent|skill|cooldown|aim|combo|전투|공격|적|스킬|쿨다운/.test(text))return 'COMBAT';
  if(/move|movement|reposition|explore|navigate|travel|dodge|evade|obby|checkpoint|이동|탐색|회피|위치|오비|체크포인트/.test(text))return 'MOVEMENT';
  if(/reward|progress|upgrade|loadout|level|mastery|grow|unlock|보상|성장|강화|레벨|해금/.test(text))return 'PROGRESSION';
  if(/resource|economy|craft|collect|produce|income|tycoon|자원|경제|제작|수집|생산|수익/.test(text))return 'ECONOMY';
  if(/social|roleplay|party|team|shared|교류|협동|팀/.test(text))return 'SOCIAL';
  if(/quest|objective|story|goal|round|escape|목표|퀘스트|스토리|탈출/.test(text))return 'OBJECTIVE';
  if(/survive|health|danger|threat|horror|생존|체력|위협|공포/.test(text))return 'SURVIVAL';
  if(/mobile|touch|control|interface|ux|모바일|터치|조작|인터페이스/.test(text))return 'MOBILE';
  if(/^coreloop\[(\d+)\]/.test(clean(item.path).toLowerCase()))return ['MOVEMENT','COMBAT','PROGRESSION'][index%3];
  return ['OBJECTIVE','ECONOMY','PROGRESSION','MOVEMENT'][index%4];
}

function approvedActions(baseline={},profile,learning={}){
  const inventory=deriveApprovedScopeInventory(baseline);
  const actions=inventory.length?inventory.map((item,index)=>({
    id:item.id,label:clean(item.label)||`Approved action ${index+1}`,path:clean(item.path),kind:classifyRobloxScope(item,index),
  })):[{id:'scope-core-fallback',label:'Core gameplay action',path:'coreFun',kind:'OBJECTIVE'}];
  const requiredKind=genreCoreKind(profile);
  if(!actions.some(action=>action.kind===requiredKind)){
    actions.unshift({id:'genre-core',label:`${profile.genre}${profile.subgenre?` / ${profile.subgenre}`:''} core gameplay`,path:'robloxBuildProfile',kind:requiredKind});
  }
  return decorateRobloxActionsWithLearning(actions,learning);
}

function sharedConfigSource({gameId,gameName,saveRequired,actions,profile,platformProfile,learning={},studioAssets={}}){
  const actionRows=actions.map((action,index)=>`    { Id = ${luauString(action.id)}, Label = ${luauString(action.label)}, Kind = ${luauString(action.kind)}, Order = ${index+1}, LearningPattern = ${luauString(action.learningPattern||'')} },`).join('\n');
  const checklistRows=(learning.checklist||[]).map(value=>`    ${luauString(value)},`).join('\n');
  const featureRows=(learning.featureBlend||[]).map(value=>`    ${luauString(value)},`).join('\n');
  const sourceRows=(learning.sourceProjects||[]).map(value=>`    ${luauString(value)},`).join('\n');
  const verifiedExternalLearningRows=(learning.verifiedExternalLearningIds||[]).map(value=>`    ${luauString(value)},`).join('\n');
  const verifiedExternalLearningAxisRows=(learning.verifiedExternalLearningApplyAxes||[]).map(value=>`    ${luauString(value)},`).join('\n');
  const verifiedExternalLearningPrincipleRows=(learning.verifiedExternalLearningPrinciples||[]).map(value=>`      ${luauString(value)},`).join('\n');
  const verifiedExternalAvoidanceRows=(learning.verifiedExternalAvoidancePrinciples||[]).map(value=>`      ${luauString(value)},`).join('\n');
  const verifiedExternalAllowedRows=(learning.verifiedExternalLearningUseAllowed||[]).map(value=>`      ${luauString(value)},`).join('\n');
  const verifiedExternalForbiddenRows=(learning.verifiedExternalLearningUseForbidden||[]).map(value=>`      ${luauString(value)},`).join('\n');
  const semanticMappingRows=luauSemanticMappingRows(learning.gameSpecificSemanticMappings||[],'      ');
  const semanticDispositionRows=luauLearningDispositionRows(learning.verifiedExternalLearningDispositions||[],'      ');
  const validationRows=(learning.verifiedExternalValidationOnlyPrinciples||[]).map(value=>`      ${luauString(value)},`).join('\n');
  const notApplicableRows=(learning.verifiedExternalNotApplicablePrinciples||[]).map(value=>`      ${luauString(value)},`).join('\n');
  const studioFamilyRows=Object.entries(studioAssets?.families||{}).map(([family,atoms])=>`    ${family} = { ${(atoms||[]).map(value=>luauString(value)).join(', ')} },`).join('\n');
  return `local Config = {\n  PolicySource = "company-learning/platform-release-roadmap.json",\n  Platform = "ROBLOX",\n  MobileFirst = true,\n  SaveEnabled = ${saveRequired?'true':'false'},\n  GameId = ${luauString(gameId)},\n  GameName = ${luauString(gameName)},\n  Genre = ${luauString(profile.genre)},\n  Subgenre = ${luauString(profile.subgenre||'')},\n  PlayMode = ${luauString(profile.playMode)},\n  MultiplayerRequired = ${profile.multiplayerRequired?'true':'false'},\n  CoopRequired = ${profile.coopImplementationRequired?'true':'false'},\n  CompetitiveRequired = ${profile.competitiveImplementationRequired?'true':'false'},\n  MinimumParticipants = ${profile.minimumParticipantsForRequiredQa},\n  RemoteName = "GameAction",\n  RateLimitSeconds = 0.10,\n  DesignBaseline = {\n    Required = true,\n    AdmissionGate = "MINIMUM_DUAL_PLATFORM_DESIGN_READY",\n    StrictScoreRequiredForAdmission = false,\n  },\n  PlatformProfile = {\n    Platform = "ROBLOX",\n    InputModel = ${luauString(platformProfile.inputModel)},\n    SessionModel = ${luauString(platformProfile.sessionModel)},\n    MultiplayerRuntime = ${luauString(platformProfile.multiplayerRuntime)},\n    PerformanceBudget = ${luauString(platformProfile.performanceBudget)},\n    UiUx = ${luauString(platformProfile.uiUx)},\n    SaveAndNetwork = ${luauString(platformProfile.saveAndNetwork)},\n    ContentAdaptation = ${luauString(platformProfile.platformContentAdaptation)},\n    InternalReleaseTarget = ${luauString(platformProfile.internalReleaseTarget)},\n    ValidationEvidence = ${luauString(platformProfile.validationEvidence)},\n  },\n  -- STUDIO_ASSET_BINDING_BEGIN\n  StudioAssets = {\n    Applied = ${studioAssets.applied?'true':'false'},\n    BindingVersion = 2,\n    LibraryVersion = ${Number(studioAssets.libraryVersion||0)},\n    SelectionFingerprint = ${luauString(studioAssets.selectionFingerprint||'')},\n    SourceUsageFingerprint = ${luauString(studioAssets.buildUpAssetSourceUsageFingerprint||'')},\n    SourceUsageLibraryVersion = ${Number(studioAssets.buildUpAssetSourceUsageLibraryVersion||studioAssets.libraryVersion||0)},\n    Source = ${luauString(studioAssets.source||'company-asset-library.json#baseMaterialLibrary')},\n    AtomState = ${luauString(studioAssets.atomState||'')},\n    RecipeId = ${luauString(studioAssets.recipeId||'NORMAL_VARIANT')},\n    ProductionVerified = false,\n    RuntimeVerificationRequired = true,\n    Families = {\n${studioFamilyRows}\n    },\n    MotionQuality = {\n      Contract = "company-learning/platform-release-roadmap.json#livingMotionVisualQualityContract.robloxCharacterMotionQuality",\n      LibraryFirst = true,\n      ArticulatedRigRequired = true,\n      AnimatorRequired = true,\n      BlendAndSpeedSyncRequired = true,\n      RuntimeVerificationRequired = true,\n      MannequinHardFailure = "CHARACTER_MOTION_MANNEQUIN",\n    },\n  },\n  -- STUDIO_ASSET_BINDING_END\n  LearningContext = {\n    Applied = ${learning.applied?'true':'false'},\n    Authority = ${luauString(learning.authority||'roblox-baseline-only')},\n    RecipeId = ${luauString(learning.recipeId||'')},\n    Operator = ${luauString(learning.transformationOperator||'')},\n    OriginalModifierRequired = ${learning.originalModifierRequired?'true':'false'},\n    PlaybookChecklist = {\n${checklistRows}\n    },\n    FeatureBlend = {\n${featureRows}\n    },\n    SourceProjects = {\n${sourceRows}\n    },\n    VerifiedExternalLearningFirst = ${learning.verifiedExternalLearningFirst?'true':'false'},\n    MemoryFingerprint = ${luauString(learning.verifiedExternalLearningFingerprint||'')},\n    NativeBindingVersion = ${ROBLOX_VERIFIED_EXTERNAL_NATIVE_BINDING_VERSION},\n    CoveragePct = ${Number(learning.verifiedExternalLearningCoveragePct||0)},\n    ContentComplete = ${learning.verifiedExternalDistilledContentComplete?'true':'false'},\n    RetrievedCount = ${Number(learning.verifiedExternalLearningRetrievedCount||0)},\n    AppliedCount = ${Number(learning.verifiedExternalLearningAppliedCount||0)},\n    TruncationForbidden = ${learning.verifiedExternalLearningTruncationForbidden?'true':'false'},
    SemanticMappingVersion = ${Number(learning.semanticMappingVersion||0)},
    SemanticMappingFingerprint = ${luauString(learning.semanticMappingFingerprint||'')},
    SemanticVariant = ${luauString(learning.semanticVariant||'')},
    SemanticMood = ${luauString(learning.semanticMood?.id||'READABLE_EXPLORATION')},
    CoreKind = ${luauString(learning.coreKind||'')},
    AppliedGameDevelopmentPrincipleCount = ${Number(learning.verifiedExternalLearningGameDevelopmentAppliedCount||0)},
    RetrievedPrincipleCount = ${Number(learning.verifiedExternalLearningRetrievedPrincipleCount||0)},
    ValidationOnlyPrincipleCount = ${Number(learning.verifiedExternalValidationOnlyPrincipleCount||0)},
    NotApplicablePrincipleCount = ${Number(learning.verifiedExternalNotApplicablePrincipleCount||0)},\n    ApplyAxes = {\n${verifiedExternalLearningAxisRows}\n    },\n    VerifiedExternalLearningIds = {\n${verifiedExternalLearningRows}\n    },\n    ApplicationPrinciples = {\n${verifiedExternalLearningPrincipleRows}\n    },\n    GameDevelopmentPrinciples = {\n${verifiedExternalLearningPrincipleRows}\n    },\n    GameSpecificSemanticMappings = {
${semanticMappingRows}
    },
    LearningDispositions = {
${semanticDispositionRows}
    },
    ValidationOnlyPrinciples = {
${validationRows}
    },
    NotApplicablePrinciples = {
${notApplicableRows}
    },
    AvoidancePrinciples = {\n${verifiedExternalAvoidanceRows}\n    },\n    LearningUseAllowed = {\n${verifiedExternalAllowedRows}\n    },\n    LearningUseForbidden = {\n${verifiedExternalForbiddenRows}\n    },\n  },\n  InitialState = {\n    Score = 0, Coins = 0, Level = 1, Progress = 0, Health = 100,\n    Wave = 1, Position = 0, Objective = 0, Combo = 0, EnemyHealth = 100,\n    PuzzleChain = 0, Towers = 0, BaseHealth = 100, SocialBond = 0,\n    SharedObjective = 0, RoundScore = 0,\n  },\n  Actions = {\n${actionRows}\n  },\n}\n\nreturn table.freeze(Config)\n`;
}

function serverHandlerBody(kind,index){
  const n=index+1;
  const bodies={
    COMBAT:`  local enemy = math.max(0, readNumber(player, "EnemyHealth", 100) - ${10+n})\n  setNumber(player, "EnemyHealth", enemy)\n  setNumber(player, "Combo", readNumber(player, "Combo", 0) + 1)\n  setNumber(player, "Score", readNumber(player, "Score", 0) + ${8+n})\n  setNumber(player, "Progress", readNumber(player, "Progress", 0) + ${4+n})\n  if enemy <= 0 then\n    setNumber(player, "EnemyHealth", 100)\n    setNumber(player, "Wave", readNumber(player, "Wave", 1) + 1)\n    setNumber(player, "Coins", readNumber(player, "Coins", 0) + 3)\n  end`,
    MOVEMENT:`  setNumber(player, "Position", (readNumber(player, "Position", 0) + ${1+(index%3)}) % 12)\n  setNumber(player, "Score", readNumber(player, "Score", 0) + ${2+n})\n  setNumber(player, "Progress", readNumber(player, "Progress", 0) + ${5+n})`,
    PROGRESSION:`  setNumber(player, "Level", readNumber(player, "Level", 1) + 1)\n  setNumber(player, "Progress", readNumber(player, "Progress", 0) + ${7+n})\n  setNumber(player, "Score", readNumber(player, "Score", 0) + ${5+n})\n  setNumber(player, "Coins", readNumber(player, "Coins", 0) + ${2+n})`,
    ECONOMY:`  setNumber(player, "Coins", readNumber(player, "Coins", 0) + ${6+n})\n  setNumber(player, "Score", readNumber(player, "Score", 0) + ${3+n})\n  setNumber(player, "Progress", readNumber(player, "Progress", 0) + ${4+n})`,
    OBJECTIVE:`  setNumber(player, "Objective", readNumber(player, "Objective", 0) + 1)\n  setNumber(player, "Score", readNumber(player, "Score", 0) + ${6+n})\n  setNumber(player, "Progress", readNumber(player, "Progress", 0) + ${8+n})`,
    SURVIVAL:`  setNumber(player, "Health", math.clamp(readNumber(player, "Health", 100) - ${1+(index%3)}, 0, 100))\n  setNumber(player, "Wave", readNumber(player, "Wave", 1) + 1)\n  setNumber(player, "Progress", readNumber(player, "Progress", 0) + ${5+n})`,
    PUZZLE:`  local chain = readNumber(player, "PuzzleChain", 0) + 1\n  setNumber(player, "PuzzleChain", chain)\n  setNumber(player, "Score", readNumber(player, "Score", 0) + chain * ${2+n})\n  setNumber(player, "Progress", readNumber(player, "Progress", 0) + ${5+n})`,
    DEFENSE:`  setNumber(player, "Towers", readNumber(player, "Towers", 0) + 1)\n  setNumber(player, "Wave", readNumber(player, "Wave", 1) + 1)\n  setNumber(player, "BaseHealth", math.max(0, readNumber(player, "BaseHealth", 100) - ${1+(index%2)}))\n  setNumber(player, "Progress", readNumber(player, "Progress", 0) + ${6+n})`,
    SOCIAL:`  setNumber(player, "SocialBond", readNumber(player, "SocialBond", 0) + 1)\n  setNumber(player, "Objective", readNumber(player, "Objective", 0) + 1)\n  setNumber(player, "Progress", readNumber(player, "Progress", 0) + ${4+n})`,
    MOBILE:`  setNumber(player, "Position", (readNumber(player, "Position", 0) + 1) % 12)\n  setNumber(player, "Score", readNumber(player, "Score", 0) + ${2+n})\n  setNumber(player, "Progress", readNumber(player, "Progress", 0) + ${3+n})`,
  };
  return bodies[kind]||bodies.OBJECTIVE;
}

function serverSource({gameId,saveRequired,actions,profile,learning={}}){
  const multiplayerAfterAction=profile.multiplayerRequired?`\n  local participants = Players:GetPlayers()\n  if Config.CoopRequired then\n    local shared = 0\n    for _, participant in ipairs(participants) do\n      shared += readNumber(participant, "Progress", 0)\n    end\n    for _, participant in ipairs(participants) do participant:SetAttribute("SharedObjective", shared) end\n  end\n  if Config.CompetitiveRequired then\n    setNumber(player, "RoundScore", readNumber(player, "RoundScore", 0) + 1)\n  end\n  local snapshot = {ActorUserId = player.UserId, ParticipantCount = #participants, SharedObjective = readNumber(player, "SharedObjective", 0), RoundScore = readNumber(player, "RoundScore", 0)}\n  remote:FireAllClients("MULTIPLAYER_SYNC", snapshot)\n`:``;
  const handlers=actions.map((action,index)=>`local function scopeHandler${index+1}(player)\n${serverHandlerBody(action.kind,index)}\n  player:SetAttribute("LastApprovedScope", ${luauString(action.id)})\n${`  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)\n  player:SetAttribute("LastLearningPattern", ${luauString(action.learningPattern||'')})\n`}${multiplayerAfterAction}end`).join('\n\n');
  const mapRows=actions.map((action,index)=>`  [${luauString(action.id)}] = scopeHandler${index+1},`).join('\n');
  const datastoreHead=saveRequired?`local DataStoreService = game:GetService("DataStoreService")\nlocal store = nil\nlocal storeOk, storeResult = pcall(function()\n  return DataStoreService:GetDataStore(${luauString(`${gameId}-development-v1`)})\nend)\nif storeOk then store = storeResult end\n`:'';
  const loadBlock=saveRequired?`  local ok, saved = pcall(function()\n    return store:GetAsync("player:" .. player.UserId)\n  end)\n  if ok and typeof(saved) == "table" then\n    for key, fallback in pairs(Config.InitialState) do\n      local value = saved[key]\n      if typeof(value) == "number" then player:SetAttribute(key, value) else player:SetAttribute(key, fallback) end\n    end\n  else\n    initializePlayer(player)\n  end\n`:`  initializePlayer(player)\n`;
  const saveBlock=saveRequired?`  local snapshot = {}\n  for key, fallback in pairs(Config.InitialState) do snapshot[key] = readNumber(player, key, fallback) end\n  pcall(function()\n    store:UpdateAsync("player:" .. player.UserId, function() return snapshot end)\n  end)\n`:'';
  return `local Players = game:GetService("Players")\nlocal ReplicatedStorage = game:GetService("ReplicatedStorage")\n${datastoreHead}local Shared = ReplicatedStorage:WaitForChild("Shared")\nlocal Config = require(Shared:WaitForChild("GameConfig"))\n\nlocal remote = ReplicatedStorage:FindFirstChild(Config.RemoteName)\nif remote and not remote:IsA("RemoteEvent") then remote:Destroy(); remote = nil end\nif not remote then\n  remote = Instance.new("RemoteEvent")\n  remote.Name = Config.RemoteName\n  remote.Parent = ReplicatedStorage\nend\n\n-- native-foundation-sentinel-v1\nlocal foundationRemote = ReplicatedStorage:FindFirstChild("RuntimeFoundationReport")\nif foundationRemote and not foundationRemote:IsA("RemoteEvent") then foundationRemote:Destroy(); foundationRemote = nil end\nif not foundationRemote then\n  foundationRemote = Instance.new("RemoteEvent")\n  foundationRemote.Name = "RuntimeFoundationReport"\n  foundationRemote.Parent = ReplicatedStorage\nend\nlocal foundationSpawn = workspace:FindFirstChild("NativeFoundationSpawn")\nif not foundationSpawn then\n  foundationSpawn = Instance.new("SpawnLocation")\n  foundationSpawn.Name = "NativeFoundationSpawn"\n  foundationSpawn.Size = Vector3.new(8, 1, 8)\n  foundationSpawn.Position = Vector3.new(0, 3, 0)\n  foundationSpawn.Neutral = true\n  foundationSpawn.Anchored = true\n  foundationSpawn.CanCollide = true\n  foundationSpawn.Parent = workspace\nend\n${foundationCharacterSource("bindFoundationCharacter","foundationSpawn")}\nlocal function bindFoundationPlayer(player)\n  if player.Character then task.defer(bindFoundationCharacter, player.Character) end\n  player.CharacterAdded:Connect(bindFoundationCharacter)\nend\nfoundationRemote.OnServerEvent:Connect(function(player, signal)\n  if typeof(signal) ~= "string" then return end\n  player:SetAttribute("NativeFoundationReadyAt", os.time())\nend)\n\nlocal lastAction = {}\nlocal function readNumber(player, name, fallback)\n  local value = player:GetAttribute(name)\n  if typeof(value) ~= "number" then return fallback end\n  return value\nend\nlocal function setNumber(player, name, value)\n  if typeof(value) ~= "number" then return end\n  player:SetAttribute(name, math.floor(value))\nend\nlocal function initializePlayer(player)\n  for key, value in pairs(Config.InitialState) do player:SetAttribute(key, value) end\n  player:SetAttribute("LastApprovedScope", "ready")\n  player:SetAttribute("LearningOperator", Config.LearningContext.Operator)
  player:SetAttribute("LastLearningPattern", "")
  player:SetAttribute("ActionSequence", 0)\nend\n\n${handlers}\n\nlocal handlers = {\n${mapRows}\n}\n\nPlayers.PlayerAdded:Connect(function(player)\n  bindFoundationPlayer(player)\n${loadBlock}end)\nfor _, player in ipairs(Players:GetPlayers()) do\n  task.defer(function()\n    bindFoundationPlayer(player)\n    if player:GetAttribute("Score") == nil then initializePlayer(player) end\n  end)\nend\nremote.OnServerEvent:Connect(function(player, actionId)\n  if typeof(actionId) ~= "string" then return end\n  local handler = handlers[actionId]\n  if typeof(handler) ~= "function" then return end\n  local now = os.clock()\n  local previous = lastAction[player] or 0\n  if now - previous < Config.RateLimitSeconds then return end\n  lastAction[player] = now\n  handler(player)\nend)\nPlayers.PlayerRemoving:Connect(function(player)\n${saveBlock}  lastAction[player] = nil\nend)\ngame:BindToClose(function() end)\n`;
}

function clientSource({profile,learning={},studioAssets={},studioAssetFamilyStatus={}}){
  requireRobloxVerifiedExternalLearning(learning);
  const studioAssetTrace=studioAssetDynamicBindingBlock({familyStatus:studioAssetFamilyStatus,configVar:'Config'});
  const nativeLearningRuntime=robloxNativeLearningRuntimeBlock({frameVar:'root',configVar:'Config',learning});
  const learnedInput=`local ContextActionService = game:GetService("ContextActionService")\n`;
  const learnedBinding=`\nif #Config.Actions > 0 then\n  ContextActionService:BindAction("VibePrimaryAction", function(_, inputState)\n    if inputState == Enum.UserInputState.Begin then remote:FireServer(Config.Actions[1].Id) end\n    return Enum.ContextActionResult.Sink\n  end, false, Enum.KeyCode.Space, Enum.KeyCode.ButtonA)\nend\n`;
  const multiplayerClient=profile.multiplayerRequired?`\nlocal multiplayerStatus = Instance.new("TextLabel")\nmultiplayerStatus.Name = "MultiplayerStatus"\nmultiplayerStatus.Size = UDim2.new(1, -20, 0, 36)\nmultiplayerStatus.Position = UDim2.fromOffset(10, 104)\nmultiplayerStatus.BackgroundTransparency = 1\nmultiplayerStatus.TextColor3 = Color3.fromRGB(180, 230, 255)\nmultiplayerStatus.TextScaled = true\nmultiplayerStatus.Text = "Multiplayer sync ready"\nmultiplayerStatus.Parent = root\nremote.OnClientEvent:Connect(function(kind, payload)\n  if kind ~= "MULTIPLAYER_SYNC" or typeof(payload) ~= "table" then return end\n  multiplayerStatus.Text = string.format("Players %d · Shared %d · Round %d", payload.ParticipantCount or 0, payload.SharedObjective or 0, payload.RoundScore or 0)\nend)\n`:``;
  return `local Players = game:GetService("Players")\nlocal ReplicatedStorage = game:GetService("ReplicatedStorage")\nlocal UserInputService = game:GetService("UserInputService")\n${learnedInput}local STUDIO_ASSET_BINDING_VERSION = 2\nlocal player = Players.LocalPlayer\nlocal Shared = ReplicatedStorage:WaitForChild("Shared")\nlocal Config = require(Shared:WaitForChild("GameConfig"))\nlocal remote = ReplicatedStorage:WaitForChild(Config.RemoteName)\nlocal foundationRemote = ReplicatedStorage:WaitForChild("RuntimeFoundationReport")\nlocal nativeTouchEnabled = UserInputService.TouchEnabled\nlocal nativeFoundationCamera = workspace.CurrentCamera\nlocal function reportNativeFoundationReady()\n  local character = player.Character or player.CharacterAdded:Wait()\n  local humanoid = character:WaitForChild("Humanoid")\n  if nativeFoundationCamera and nativeFoundationCamera.CameraSubject == humanoid then\n    foundationRemote:FireServer("CAMERA_READY")\n  end\n  foundationRemote:FireServer(nativeTouchEnabled and "INPUT_READY_TOUCH" or "INPUT_READY")\nend\ntask.defer(reportNativeFoundationReady)\n\nlocal gui = Instance.new("ScreenGui")\ngui.Name = "ApprovedScopeHud"\ngui.ResetOnSpawn = false\ngui.Parent = player:WaitForChild("PlayerGui")\nlocal root = Instance.new("Frame")\nroot.Name = "Root"\nroot.AnchorPoint = Vector2.new(0.5, 1)\nroot.Position = UDim2.fromScale(0.5, 0.98)\nroot.Size = UDim2.new(1, -24, 0, 360)\nroot.BackgroundTransparency = 0.15\nlocal studioAssetFamilies = Config.StudioAssets and Config.StudioAssets.Families or {}\nlocal function studioAssetFamily(family)\n  local atoms = studioAssetFamilies[family]\n  return type(atoms) == "table" and atoms or {}\nend\nlocal function hasStudioAtom(familyOrAtom, atom)\n  local family = atom == nil and "UI" or familyOrAtom\n  local assetAtom = atom == nil and familyOrAtom or atom\n  return table.find(studioAssetFamily(family), assetAtom) ~= nil\nend\n${studioAssetTrace}local studioUi = STUDIO_ASSET_SELECTION.UI\nroot.BackgroundColor3 = hasStudioAtom("UI", "FRAME_PANEL") and Color3.fromRGB(22, 34, 58) or Color3.fromRGB(18, 28, 48)\nroot:SetAttribute("StudioAssetBindingVersion", STUDIO_ASSET_BINDING_VERSION)\nroot:SetAttribute("StudioAssetSelectionFingerprint", Config.StudioAssets and Config.StudioAssets.SelectionFingerprint or "")\nroot:SetAttribute("StudioAssetAtoms", table.concat(studioUi, ","))\nroot.Parent = gui\nlocal title = Instance.new("TextLabel")\ntitle.Name = "Title"\ntitle.Size = UDim2.new(1, -20, 0, 44)\ntitle.Position = UDim2.fromOffset(10, 8)\ntitle.BackgroundTransparency = 1\ntitle.TextColor3 = Color3.fromRGB(245, 248, 255)\ntitle.TextScaled = true\ntitle.Text = string.format("%s · %s · %s", Config.GameName, Config.Genre, Config.PlayMode)\ntitle.Parent = root\nlocal status = Instance.new("TextLabel")\nstatus.Name = "Status"\nstatus.Size = UDim2.new(1, -20, 0, 48)\nstatus.Position = UDim2.fromOffset(10, 54)\nstatus.BackgroundColor3 = Color3.fromRGB(10, 17, 30)\nstatus.TextColor3 = Color3.fromRGB(220, 232, 250)\nstatus.TextScaled = true\nstatus.Parent = root\n${multiplayerClient}\nlocal list = Instance.new("ScrollingFrame")\nlist.Name = "ApprovedActions"\nlist.Size = UDim2.new(1, -20, 1, -${profile.multiplayerRequired?150:112})\nlist.Position = UDim2.fromOffset(10, ${profile.multiplayerRequired?142:106})\nlist.BackgroundTransparency = 1\nlist.BorderSizePixel = 0\nlist.AutomaticCanvasSize = Enum.AutomaticSize.Y\nlist.CanvasSize = UDim2.new()\nlist.ScrollBarThickness = 6\nlist.Parent = root\nlocal layout = Instance.new("UIListLayout")\nlayout.Padding = UDim.new(0, 8)\nlayout.SortOrder = Enum.SortOrder.LayoutOrder\nlayout.Parent = list\nfor index, action in ipairs(Config.Actions) do\n  local button = Instance.new("TextButton")\n  button.Name = "ScopeAction" .. index\n  button.LayoutOrder = index\n  button.Size = UDim2.new(1, -4, 0, 56)\n  button.BackgroundColor3 = hasStudioAtom("UI", "BUTTON_PRIMARY") and Color3.fromRGB(224, 236, 255) or Color3.fromRGB(235, 242, 255)\n  button.TextColor3 = Color3.fromRGB(16, 24, 40)\n  button.TextWrapped = true\n  button.TextScaled = true\n  button.Text = string.format("%d. %s [%s]", index, action.Label, action.Kind)\n  button.Parent = list\n  button.Activated:Connect(function() remote:FireServer(action.Id) end)\nend\nlocal healthTrack = Instance.new("Frame")\nhealthTrack.Name = "StudioHealthTrack"\nhealthTrack.Size = UDim2.new(1, -20, 0, 10)\nhealthTrack.Position = UDim2.fromOffset(10, 98)\nhealthTrack.BackgroundColor3 = Color3.fromRGB(70, 78, 92)\nhealthTrack.BorderSizePixel = 0\nhealthTrack.Visible = hasStudioAtom("UI", "BAR_HEALTH")\nhealthTrack.Parent = root\nlocal healthFill = Instance.new("Frame")\nhealthFill.Name = "StudioHealthFill"\nhealthFill.Size = UDim2.fromScale(1, 1)\nhealthFill.BackgroundColor3 = Color3.fromRGB(92, 205, 118)\nhealthFill.BorderSizePixel = 0\nhealthFill.Parent = healthTrack\nlocal watched = {"Score","Coins","Level","Progress","Health","Wave","Position","Objective","Combo","EnemyHealth","PuzzleChain","Towers","BaseHealth","SocialBond","SharedObjective","RoundScore","LastApprovedScope"}\nlocal function render()\n  status.Text = string.format("Score %d · Lv %d · Progress %d · HP %d · Wave %d", player:GetAttribute("Score") or 0, player:GetAttribute("Level") or 1, player:GetAttribute("Progress") or 0, player:GetAttribute("Health") or 100, player:GetAttribute("Wave") or 1)\n  healthFill.Size = UDim2.fromScale(math.clamp((player:GetAttribute("Health") or 100) / 100, 0, 1), 1)\nend\nfor _, name in ipairs(watched) do player:GetAttributeChangedSignal(name):Connect(render) end\nrender()\n${nativeLearningRuntime}\n${learnedBinding}`;
}

export function compileRobloxSource({gameId='',gameName='',baseline={},artbook={},playbooks={},recombination={},webHandoff={},roadmap={},assetLibrary={},buildUpDirective={}}={}){
  void webHandoff;
  void roadmap;
  const profile=robloxBuildProfileFromBaseline(baseline);
  const platformProfile=robloxPlatformProfileFromBaseline(baseline);
  const saveRequired=requiresPersistentSave(baseline);
  const handoffValidation=Object.freeze({pass:true,blockers:Object.freeze([]),carryForward:Object.freeze([])});
  const learning=requireRobloxVerifiedExternalLearning(createRobloxVibe3LearningContext({gameId,profile,artbook,playbooks,recombination}));
  const actions=approvedActions(baseline,profile,learning);
  const studioAssets=buildRobloxStudioAssetBootstrapPlan({gameId,profile,assetLibrary});
  const generatedServerCode=serverSource({gameId,saveRequired,actions,profile,learning});
  const studioAssetFamilyStatus=robloxStudioAssetFamilyStatusFromSource({
    serverSource:generatedServerCode,
    clientSource:'local root = Instance.new("Frame")'
  });
  const result={
    sharedConfig:sharedConfigSource({gameId,gameName,saveRequired,actions,profile,platformProfile,learning,studioAssets}),
    serverCode:generatedServerCode,
    clientCode:clientSource({profile,learning,studioAssets,studioAssetFamilyStatus}),
    implementationNotes:[
      `approved scope count=${actions.length}`,
      `roblox genre=${profile.genre}${profile.subgenre?`/${profile.subgenre}`:''}`,
      `play mode=${profile.playMode}`,
      `multiplayer required=${profile.multiplayerRequired?'yes':'no'}`,
      'genre core action is compiled from the approved Roblox build profile',
      'minimum dual-platform design contract carried forward',
      `Roblox platform session: ${platformProfile.sessionModel}`,
      `Roblox internal release target: ${platformProfile.internalReleaseTarget}`,
      profile.multiplayerRequired?'server-authoritative actions broadcast synchronized participant state to all clients':'single-player source does not claim multiplayer implementation',
      profile.coopImplementationRequired?'co-op source maintains SharedObjective across current participants':null,
      profile.competitiveImplementationRequired?'competitive source maintains per-player RoundScore and broadcasts it':null,
      'mobile-first ScreenGui exposes approved gameplay actions',
      studioAssets.applied?`Studio base material binding applied: ${studioAssets.selectedAtomCount} semantic atoms; runtime verification still required`:'Studio base material binding unavailable',
      `Vibe3 Roblox playbook applied: ${learning.checklist.join(', ')}`,
      'verified APK principles are always adapted into Roblox environment/background, character animation/motion, skill VFX, camera feedback, UI/touch controls, gameplay state, and runtime QA',
      `transformative recipe=${learning.recipeId}; operator=${learning.transformationOperator}; features=${learning.featureBlend.join(', ')}`,
      saveRequired?'persistent player state uses DataStoreService with safe fallback':'no DataStore added because locked baseline does not require persistence',
      clean(buildUpDirective?.thisLoopPrimaryGoal)?`shared BUILD_UP directive pending implementation: ${clean(buildUpDirective.thisLoopPrimaryGoal)}`:null,
      'runtime, independent QA, regression, and release remain unclaimed until later evidence gates pass',
    ].filter(Boolean),
  };
  const validation=validateRobloxBootstrap({...result,baseline,profile,learning,studioAssets});
  if(!validation.pass)throw new Error(`ROBLOX_BOOTSTRAP_COMPILER_FAILED: ${validation.blockers.join('|')}`);
  return {result,validation,actions,profile,platformProfile,learning,studioAssets,studioAssetFamilyStatus,webHandoff:null,handoffValidation,generationMode:'DETERMINISTIC_PROFILE_BOUND_WITH_VIBE3_LEARNING_CONTEXT',modelUsed:false,attempts:0,failures:[]};
}

export async function buildRobloxSource({gameId,gameName,baseline,artbook,playbooks,recombination,webHandoff,roadmap,assetLibrary,model,buildUpDirective}){
  void model;
  return compileRobloxSource({gameId,gameName,baseline,artbook,playbooks,recombination,webHandoff,roadmap,assetLibrary,buildUpDirective});
}
function writeSourceTree(root,{sharedConfig,serverCode,clientCode},gameId){
  fs.mkdirSync(path.join(root,'shared'),{recursive:true});
  fs.mkdirSync(path.join(root,'server'),{recursive:true});
  fs.mkdirSync(path.join(root,'client'),{recursive:true});
  fs.writeFileSync(path.join(root,'shared','GameConfig.luau'),sharedConfig.endsWith('\n')?sharedConfig:`${sharedConfig}\n`,'utf8');
  fs.writeFileSync(path.join(root,'server','Game.server.luau'),serverCode.endsWith('\n')?serverCode:`${serverCode}\n`,'utf8');
  fs.writeFileSync(path.join(root,'client','Game.client.luau'),clientCode.endsWith('\n')?clientCode:`${clientCode}\n`,'utf8');
  fs.writeFileSync(path.join(root,'default.project.json'),`${JSON.stringify(projectJsonForGame(gameId),null,2)}\n`,'utf8');
}

async function main(){
  const gameId=clean(arg('game-id'));
  const gameName=clean(arg('game-name',gameId));
  const baselineFile=clean(arg('baseline'));
  const artbookFile=clean(arg('artbook'));
  const outputRoot=posix(arg('output-root'));
  const evidenceFile=clean(arg('evidence'));
  const playbooksFile=clean(arg('playbooks'));
  const recombinationFile=clean(arg('recombination'));
  const webHandoffFile=clean(arg('web-handoff'));
  const roadmapFile=clean(arg('roadmap','company-learning/platform-release-roadmap.json'));
  const assetLibraryFile=clean(arg('asset-library','company-asset-library.json'));
  const model=clean(arg('model',process.env.ROBLOX_DEV_MODEL||'none'));
  const foundationRepair=clean(arg('foundation-repair','false')).toLowerCase()==='true';
  const buildUpDirectiveFile=clean(arg('build-up-directive'));
  if(!gameId||!baselineFile||!artbookFile||!outputRoot||!evidenceFile||!playbooksFile||!recombinationFile||!roadmapFile)throw new Error('required Roblox bootstrap argument missing');
  if(outputRoot!==`roblox-games/${gameId}`)throw new Error(`invalid Roblox output root: ${outputRoot}`);
  const existingSource=fs.existsSync(outputRoot)&&fs.readdirSync(outputRoot).length>0;
  const baseline=readJson(baselineFile);
  const artbook=readJson(artbookFile);
  const playbooks=readJson(playbooksFile);
  const recombination=readJson(recombinationFile);
  const webHandoff=webHandoffFile&&fs.existsSync(webHandoffFile)?readJson(webHandoffFile):{};
  const roadmap=readJson(roadmapFile);
  const assetLibrary=fs.existsSync(assetLibraryFile)?readJson(assetLibraryFile):{};
  const buildUpDirective=buildUpDirectiveFile&&fs.existsSync(buildUpDirectiveFile)?readJson(buildUpDirectiveFile):null;
  const buildUpDirectiveConsumed=Boolean(clean(buildUpDirective?.directiveId));
  const existingLearning=requireRobloxVerifiedExternalLearning(createRobloxVibe3LearningContext({gameId,profile:robloxBuildProfileFromBaseline(baseline),artbook,playbooks,recombination}));
  if(buildUpDirectiveConsumed&&clean(buildUpDirective?.gameId)!==gameId)throw new Error('BUILD_UP_DIRECTIVE_GAME_ID_MISMATCH');
  if(existingSource){
    const applied=applyRobloxStudioAssetBindingToExistingSource({root:outputRoot,gameId,baseline,assetLibrary,foundationRepair,learning:existingLearning});
    const evidence={
      version:6,gameId,gameName,platform:'ROBLOX',policyDocument:'company-learning/platform-release-roadmap.json',stage:'TARGET_PLATFORM_SOURCE_BIND',
      sourcePath:outputRoot,sourceValidationPassed:true,runtimePassed:false,independentQaPassed:false,regressionPassed:false,releaseClaim:false,
      existingSourcePreserved:true,gameplayAuthorityChanged:false,serverSourceChanged:applied.serverSourceChanged===true,
      foundationRepairApplied:applied.foundationRepairApplied===true,
      generatedFiles:applied.changedFiles.map(file=>posix(path.relative(outputRoot,file))),
      generationMode:foundationRepair?'EXISTING_SOURCE_FOUNDATION_REPAIR':'EXISTING_SOURCE_STUDIO_ASSET_REBIND',modelUsed:false,modelAttempts:0,modelContractFailures:[],
      vibe3LearningApplied:true,recombinationRecipeId:existingLearning.recipeId||null,
      verifiedExternalLearningAppliedToExistingSource:applied.verifiedExternalLearningApplied===true,
      verifiedExternalLearningFirst:existingLearning.verifiedExternalLearningFirst===true,
      verifiedExternalLearningCoveragePct:Number(existingLearning.verifiedExternalLearningCoveragePct||0),
      verifiedExternalLearningRetrievedCount:Number(existingLearning.verifiedExternalLearningRetrievedCount||0),
      verifiedExternalLearningAppliedCount:Number(existingLearning.verifiedExternalLearningAppliedCount||0),
      verifiedExternalLearningIds:existingLearning.verifiedExternalLearningIds||[],
      verifiedExternalLearningFingerprint:existingLearning.verifiedExternalLearningFingerprint||null,
      verifiedExternalLearningApplyAxes:existingLearning.verifiedExternalLearningApplyAxes||[],
      studioAssetBinding:applied.studioAssets,studioAssetFamilyStatus:applied.studioAssetFamilyStatus,studioAssetBindingApplied:applied.studioAssets.applied===true,studioAssetRuntimeVerified:false,studioAssetPromotionEligible:false,
      implementationNotes:foundationRepair?['existing Roblox gameplay source preserved','native foundation/input/runtime readiness scaffolding repaired without changing gameplay balance save schema or network authority','runtime, independent QA, regression, and release remain unclaimed until later evidence gates pass']:['existing Roblox gameplay source preserved','company library Studio asset binding updated in existing config and client presentation','runtime, independent QA, regression, and release remain unclaimed until later evidence gates pass'],
      buildUpDirectiveId:buildUpDirectiveConsumed?buildUpDirective.directiveId:null,buildUpGeneration:buildUpDirectiveConsumed?buildUpDirective.generation:null,
      buildUpGoal:buildUpDirectiveConsumed?buildUpDirective.thisLoopPrimaryGoal:null,buildUpDirectiveFingerprint:buildUpDirectiveConsumed?buildUpDirective.directiveFingerprint:null,
      buildUpDirectiveConsumed,buildUpDirectiveCompletionClaim:false,
      nextRequiredStage:'TARGET_PLATFORM_RUNTIME',createdAt:new Date().toISOString(),
    };
    fs.mkdirSync(path.dirname(evidenceFile),{recursive:true});
    fs.writeFileSync(evidenceFile,`${JSON.stringify(evidence,null,2)}\n`,'utf8');
    fs.copyFileSync(evidenceFile,path.join(outputRoot,'roblox-source-bootstrap.json'));
    console.log('ROBLOX_SOURCE_BOOTSTRAP=PASS');
    console.log(`ROBLOX_GAME_ID=${gameId}`);
    console.log('ROBLOX_EXISTING_SOURCE_PRESERVED=YES');
    console.log('ROBLOX_GAMEPLAY_AUTHORITY_CHANGED=NO');
    console.log(`ROBLOX_FOUNDATION_REPAIR=${foundationRepair?'APPLIED':'NOT_REQUESTED'}`);
    console.log(`ROBLOX_STUDIO_ASSET_BINDING=${applied.studioAssets.applied?'APPLIED_UNVERIFIED':'NOT_APPLIED'}`);
    console.log(`ROBLOX_STUDIO_ASSET_ATOMS=${applied.studioAssets.selectedAtomCount}`);
    console.log(`ROBLOX_VERIFIED_EXTERNAL_LEARNING_CONTENT_COMPLETE=${existingLearning.verifiedExternalDistilledContentComplete?'YES':'NO'}`);
    console.log(`ROBLOX_VERIFIED_EXTERNAL_LEARNING_COUNT=${Number(existingLearning.verifiedExternalLearningAppliedCount||0)}`);
    console.log(`ROBLOX_VERIFIED_EXTERNAL_LEARNING_FINGERPRINT=${existingLearning.verifiedExternalLearningFingerprint||'NONE'}`);
    console.log(`ROBLOX_BUILD_UP_DIRECTIVE=${buildUpDirectiveConsumed?buildUpDirective.directiveId:'NONE_BASELINE_ONLY'}`);
  console.log('ROBLOX_BUILD_UP_COMPLETION_CLAIM=NO');
    console.log('ROBLOX_RUNTIME_PASS=NO');
    console.log('ROBLOX_RELEASE_CLAIM=NO');
    return;
  }
  const built=await buildRobloxSource({gameId,gameName,baseline,artbook,playbooks,recombination,webHandoff,roadmap,assetLibrary,model,buildUpDirective});
  if(built.learning.applied!==true)throw new Error('ROBLOX_VIBE3_LEARNING_CONTEXT_REQUIRED');
  writeSourceTree(outputRoot,built.result,gameId);
  const evidence={
    version:4,gameId,gameName,platform:'ROBLOX',policyDocument:'company-learning/platform-release-roadmap.json',stage:'TARGET_PLATFORM_SOURCE_BIND',
    sourcePath:outputRoot,sourceValidationPassed:true,runtimePassed:false,independentQaPassed:false,regressionPassed:false,releaseClaim:false,
    saveRequired:built.validation.saveRequired,approvedScopeCount:built.actions.length,
    robloxBuildProfile:built.profile,robloxPlatformProfile:built.platformProfile,minimumDesignContractRequired:true,genreImplementationRequired:true,multiplayerImplementationRequired:built.profile.multiplayerRequired,
    generatedFiles:['shared/GameConfig.luau','server/Game.server.luau','client/Game.client.luau','default.project.json'],
    generationMode:built.generationMode,model,modelUsed:built.modelUsed,modelAttempts:built.attempts,modelContractFailures:built.failures,
    vibe3LearningApplied:built.learning.applied,robloxPlaybookChecklist:built.learning.checklist,recombinationRecipeId:built.learning.recipeId,
    verifiedExternalLearningFirst:built.learning.verifiedExternalLearningFirst===true,
    verifiedExternalLearningCoveragePct:Number(built.learning.verifiedExternalLearningCoveragePct||0),
    verifiedExternalLearningRetrievedCount:Number(built.learning.verifiedExternalLearningRetrievedCount||0),
    verifiedExternalLearningAppliedCount:Number(built.learning.verifiedExternalLearningAppliedCount||0),
    verifiedExternalLearningIds:built.learning.verifiedExternalLearningIds||[],
    verifiedExternalLearningFingerprint:built.learning.verifiedExternalLearningFingerprint||null,
    verifiedExternalLearningApplyAxes:built.learning.verifiedExternalLearningApplyAxes||[],
    recombinationOperator:built.learning.transformationOperator,recombinationSourceProjects:built.learning.sourceProjects,learningFeatureBlend:built.learning.featureBlend,
    platformDesignProfile:built.platformProfile,webPlatformHandoffLegacy:built.webHandoff,webPlatformHandoffRequired:false,
    studioAssetBinding:built.studioAssets,studioAssetFamilyStatus:built.studioAssetFamilyStatus,studioAssetBindingApplied:built.studioAssets.applied===true,studioAssetRuntimeVerified:false,studioAssetPromotionEligible:false,
    implementationNotes:built.result.implementationNotes,
    buildUpDirectiveId:buildUpDirectiveConsumed?buildUpDirective.directiveId:null,buildUpGeneration:buildUpDirectiveConsumed?buildUpDirective.generation:null,
    buildUpGoal:buildUpDirectiveConsumed?buildUpDirective.thisLoopPrimaryGoal:null,buildUpDirectiveFingerprint:buildUpDirectiveConsumed?buildUpDirective.directiveFingerprint:null,
    buildUpDirectiveConsumed,buildUpDirectiveCompletionClaim:false,
    nextRequiredStage:'TARGET_PLATFORM_RUNTIME',createdAt:new Date().toISOString(),
  };
  fs.mkdirSync(path.dirname(evidenceFile),{recursive:true});
  fs.writeFileSync(evidenceFile,`${JSON.stringify(evidence,null,2)}\n`,'utf8');
  fs.copyFileSync(evidenceFile,path.join(outputRoot,'roblox-source-bootstrap.json'));
  console.log('ROBLOX_SOURCE_BOOTSTRAP=PASS');
  console.log(`ROBLOX_GAME_ID=${gameId}`);
  console.log(`ROBLOX_SOURCE_ROOT=${outputRoot}`);
  console.log(`ROBLOX_GENRE=${built.profile.genre}`);
  console.log(`ROBLOX_PLAY_MODE=${built.profile.playMode}`);
  console.log(`ROBLOX_MULTIPLAYER_REQUIRED=${built.profile.multiplayerRequired?'YES':'NO'}`);
  console.log(`ROBLOX_APPROVED_SCOPE_COUNT=${built.actions.length}`);
  console.log(`ROBLOX_SAVE_REQUIRED=${evidence.saveRequired?'YES':'NO'}`);
  console.log(`ROBLOX_GENERATION_MODE=${built.generationMode}`);
  console.log(`ROBLOX_VIBE3_LEARNING_APPLIED=${built.learning.applied?'YES':'NO'}`);
  console.log(`ROBLOX_VIBE3_RECIPE=${built.learning.recipeId||'NONE'}`);
  console.log(`ROBLOX_VIBE3_FEATURES=${built.learning.featureBlend.join(',')||'NONE'}`);
  console.log(`ROBLOX_VERIFIED_EXTERNAL_LEARNING_FIRST=${built.learning.verifiedExternalLearningFirst?'YES':'NO'}`);
  console.log(`ROBLOX_VERIFIED_EXTERNAL_LEARNING_CONTENT_COMPLETE=${built.learning.verifiedExternalDistilledContentComplete?'YES':'NO'}`);
  console.log(`ROBLOX_VERIFIED_EXTERNAL_LEARNING_COUNT=${Number(built.learning.verifiedExternalLearningAppliedCount||0)}`);
  console.log(`ROBLOX_VERIFIED_EXTERNAL_LEARNING_AXES=${(built.learning.verifiedExternalLearningApplyAxes||[]).join(',')||'NONE'}`);
  console.log('ROBLOX_WEB_HANDOFF=LEGACY_DISABLED');
  console.log('ROBLOX_PLATFORM_DESIGN=PASS');
  console.log(`ROBLOX_STUDIO_ASSET_BINDING=${built.studioAssets.applied?'APPLIED_UNVERIFIED':'NOT_APPLIED'}`);
  console.log(`ROBLOX_STUDIO_ASSET_ATOMS=${built.studioAssets.selectedAtomCount}`);
  console.log(`ROBLOX_WEB_HANDOFF_CARRY=${built.handoffValidation.carryForward.join(',')}`);
  console.log('MODEL_USED=NO');
  console.log(`ROBLOX_BUILD_UP_DIRECTIVE=${buildUpDirectiveConsumed?buildUpDirective.directiveId:'NONE_BASELINE_ONLY'}`);
  console.log('ROBLOX_BUILD_UP_COMPLETION_CLAIM=NO');
    console.log('ROBLOX_RUNTIME_PASS=NO');
  console.log('ROBLOX_RELEASE_CLAIM=NO');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
}

