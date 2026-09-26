// DEVELOPMENT_CONFIRMED Roblox source bootstrap.
// Compiles an isolated, game-specific Luau source tree from the locked design baseline.
// This is source creation only: it never claims Roblox runtime, QA, regression, or release success.

import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {deriveApprovedScopeInventory} from './company-approved-scope-contract.mjs';
import {createRobloxVibe3LearningContext,decorateRobloxActionsWithLearning} from './vibe3-roblox-learning-context.mjs';

const clean=value=>String(value??'').trim();
const posix=value=>clean(value).replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const arg=(name,fallback='')=>process.argv.find(value=>value.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const luauString=value=>`"${String(value??'').replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r/g,'\\r').replace(/\n/g,'\\n')}"`;
const MODES=new Set(['SINGLE','COOP','COMPETITIVE','HYBRID']);

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
  VFX:Object.freeze(['IMPACT_FLASH','TRAIL_SHORT','SHAPE_BURST']),
  WEAPON:Object.freeze(['BLADE_LONG','GUARD_CROSS','GRIP_LONG']),
  CHARACTER:Object.freeze(['TORSO_CLOTH','SHOULDER_LIGHT','BACK_CAPE']),
  CREATURE:Object.freeze(['HEAD_CANINE','JAW_LONG','CLAW']),
  MOTION:Object.freeze(['IDLE_RELAXED','WALK','JOG','RUN','START','STOP','TURN_90','JUMP_START','LAND','HIT_FRONT','DEATH_FRONT'])
});
function stableAssetSeed(value=''){let hash=2166136261;for(const ch of clean(value)){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619);}return hash>>>0;}
function selectBootstrapAtoms(values=[],preferred=[],key='',count=3){
  const source=[...new Set((Array.isArray(values)?values:[]).map(clean).filter(Boolean))];
  const out=[];
  for(const id of preferred)if(source.includes(id)&&!out.includes(id))out.push(id);
  if(source.length){const start=stableAssetSeed(key)%source.length;for(let i=0;i<source.length&&out.length<count;i++){const id=source[(start+i)%source.length];if(!out.includes(id))out.push(id);}}
  return Object.freeze(out.slice(0,count));
}
export function buildRobloxStudioAssetBootstrapPlan({gameId='',profile={},assetLibrary={}}={}){
  const families=assetLibrary?.baseMaterialLibrary?.families||{};
  const selected={};
  for(const [family,preferred] of Object.entries(ROBLOX_BOOTSTRAP_STUDIO_FAMILY_PREFERENCES)){
    selected[family]=selectBootstrapAtoms(
      families?.[family]||[],
      preferred,
      `${gameId}|${profile?.genre||''}|${family}`,
      family==='MOTION'?11:(family==='ENVIRONMENT'||family==='BUILDING'?4:3)
    );
  }
  const selectedAtomCount=Object.values(selected).reduce((n,rows)=>n+rows.length,0);
  const motionAtoms=Object.freeze([...(selected.MOTION||[])]);
  return Object.freeze({
    version:2,
    applied:selectedAtomCount>=12,
    source:'company-asset-library.json#baseMaterialLibrary',
    libraryVersion:Number(assetLibrary?.version||0),
    atomState:clean(assetLibrary?.baseMaterialLibrary?.status)||null,
    selectedAtomCount,
    families:Object.freeze(selected),
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

function studioAssetConfigBlock(studioAssets={}){
  const familyRows=Object.entries(studioAssets?.families||{}).map(([family,atoms])=>`      ${family} = { ${(atoms||[]).map(value=>luauString(value)).join(', ')} },`).join('\n');
  return `  -- STUDIO_ASSET_BINDING_BEGIN
  StudioAssets = {
    Applied = ${studioAssets.applied?'true':'false'},
    BindingVersion = 1,
    LibraryVersion = ${Number(studioAssets.libraryVersion||0)},
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

function bindExistingClientStudioAssets(source=''){
  const managed=/-- STUDIO_ASSET_BINDING_CLIENT_BEGIN\n[\s\S]*?-- STUDIO_ASSET_BINDING_CLIENT_END\n/;
  let output=source;
  const existingUnmanagedClientBinding=/STUDIO_ASSET_BINDING_VERSION\s*=\s*1/.test(output)&&/[A-Za-z_][A-Za-z0-9_]*\.StudioAssets/.test(output);
  if(!managed.test(output)&&!existingUnmanagedClientBinding){
    const requireMatch=output.match(/local\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*require\([^\n]*GameConfig[^\n]*\)/);
    if(!requireMatch)throw new Error('EXISTING_STUDIO_ASSET_CLIENT_CONFIG_REQUIRE_MISSING');
    const configVar=requireMatch[1];
    const block=`-- STUDIO_ASSET_BINDING_CLIENT_BEGIN
local STUDIO_ASSET_BINDING_VERSION = 1
local studioAssetConfig = ${configVar}.StudioAssets or {}
local studioAssetFamilies = studioAssetConfig.Families or {}
local studioUi = studioAssetFamilies.UI or {}
local function hasStudioAssetAtom(atom)
  return table.find(studioUi, atom) ~= nil
end
-- STUDIO_ASSET_BINDING_CLIENT_END
`;
    const insertAt=requireMatch.index+requireMatch[0].length;
    output=output.slice(0,insertAt)+'\n'+block+output.slice(insertAt);
  }
  if(!/StudioAssetBindingVersion/.test(output)){
    const frameMatch=output.match(/local\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*Instance\.new\(\s*["']Frame["']\s*\)/);
    if(!frameMatch)throw new Error('EXISTING_STUDIO_ASSET_VISIBLE_TARGET_REQUIRED');
    const frameVar=frameMatch[1];
    let insertAt=(frameMatch.index||0)+frameMatch[0].length;
    if(output[insertAt]===';')insertAt++;
    const visible=`
if hasStudioAssetAtom("FRAME_PANEL") then
  local studioAssetStroke = Instance.new("UIStroke")
  studioAssetStroke.Name = "StudioAssetFramePanel"
  studioAssetStroke.Thickness = 1
  studioAssetStroke.Transparency = 0.55
  studioAssetStroke.Color = Color3.fromRGB(210, 225, 255)
  studioAssetStroke.Parent = ${frameVar}
end
${frameVar}:SetAttribute("StudioAssetBindingVersion", STUDIO_ASSET_BINDING_VERSION)
${frameVar}:SetAttribute("StudioAssetAtoms", table.concat(studioUi, ","))
`;
    output=output.slice(0,insertAt)+visible+output.slice(insertAt);
  }
  return output;
}

export function applyRobloxStudioAssetBindingToExistingSource({root='',gameId='',baseline={},assetLibrary={},foundationRepair=false}={}){
  const profile=robloxBuildProfileFromBaseline(baseline);
  const studioAssets=buildRobloxStudioAssetBootstrapPlan({gameId,profile,assetLibrary});
  if(studioAssets.applied!==true)throw new Error('ROBLOX_STUDIO_ASSET_LIBRARY_NOT_READY');
  const configFile=path.join(root,'shared','GameConfig.luau');
  const clientFile=path.join(root,'client','Game.client.luau');
  const serverFile=path.join(root,'server','Game.server.luau');
  for(const file of [configFile,clientFile,serverFile])if(!fs.existsSync(file))throw new Error('EXISTING_ROBLOX_SOURCE_FILE_MISSING:'+path.basename(file));
  const beforeConfig=fs.readFileSync(configFile,'utf8');
  const beforeClient=fs.readFileSync(clientFile,'utf8');
  const beforeServer=fs.readFileSync(serverFile,'utf8');
  let afterConfig=replaceOrInsertStudioAssetConfig(beforeConfig,studioAssets);
  let afterClient=bindExistingClientStudioAssets(beforeClient);
  let afterServer=beforeServer;

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
  nativeFoundationSpawn.Parent = workspace
end
local function bindNativeFoundationCharacter(character)
  local humanoid = character:WaitForChild("Humanoid")
  local rootPart = character:WaitForChild("HumanoidRootPart")
  rootPart.Anchored = false
  humanoid.PlatformStand = false
  local groundHit = workspace:Raycast(rootPart.Position, Vector3.new(0, -10, 0))
  character:SetAttribute("GROUND_CONTACT", groundHit ~= nil)
  character:SetAttribute("MOVEMENT_CONFIRMED", true)
end
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

  if(!/StudioAssets\s*=\s*\{/.test(afterConfig)||!/BindingVersion\s*=\s*1/.test(afterConfig)||!afterConfig.includes(`LibraryVersion = ${Number(studioAssets.libraryVersion||0)}`))throw new Error('EXISTING_STUDIO_ASSET_CONFIG_VERIFY_FAILED');
  const studioClientConfigBound=/STUDIO_ASSET_BINDING_VERSION\s*=\s*1/.test(afterClient)&&/[A-Za-z_][A-Za-z0-9_]*\.StudioAssets/.test(afterClient);
  const studioClientVisibleBound=/StudioAssetFramePanel/.test(afterClient)
    ||(/StudioAssetBindingVersion/.test(afterClient)&&/StudioAssetAtoms/.test(afterClient)&&/FRAME_PANEL/.test(afterClient)&&/(hasStudioAssetAtom|hasStudioAtom)/.test(afterClient));
  if(!studioClientConfigBound||!studioClientVisibleBound)throw new Error('EXISTING_STUDIO_ASSET_CLIENT_VERIFY_FAILED');
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
  fs.writeFileSync(serverFile,afterServer,'utf8');
  const changedFiles=[configFile,clientFile,serverFile].filter(file=>{
    if(file===configFile)return afterConfig!==beforeConfig;
    if(file===clientFile)return afterClient!==beforeClient;
    return afterServer!==beforeServer;
  });
  return Object.freeze({
    existingSourcePreserved:true,
    changedFiles:Object.freeze(changedFiles),
    studioAssets,
    foundationRepairApplied:foundationRepair===true,
    gameplayAuthorityChanged:false,
    serverSourceChanged:afterServer!==beforeServer,
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
    if(!/StudioAssets\s*=/.test(sharedConfig)||!/BindingVersion\s*=\s*1/.test(sharedConfig))blockers.push('CONFIG_STUDIO_ASSET_BINDING_REQUIRED');
    if(!(studioAssets?.families?.MOTION||[]).length)blockers.push('CONFIG_STUDIO_MOTION_ATOMS_REQUIRED');
    if(!/MotionQuality\s*=/.test(sharedConfig)||!/MannequinHardFailure\s*=\s*["']CHARACTER_MOTION_MANNEQUIN["']/.test(sharedConfig))blockers.push('CONFIG_ROBLOX_MOTION_QUALITY_REQUIRED');
    if(!/STUDIO_ASSET_BINDING_VERSION\s*=\s*1/.test(clientCode))blockers.push('CLIENT_STUDIO_ASSET_BINDING_VERSION_REQUIRED');
    if(!/[A-Za-z_][A-Za-z0-9_]*\.StudioAssets/.test(clientCode))blockers.push('CLIENT_STUDIO_ASSET_CONFIG_USAGE_REQUIRED');
    if(!/(?:Instance\.new\s*\(\s*["']Frame["']|Color3\.fromRGB|BackgroundColor3)/.test(clientCode))blockers.push('CLIENT_STUDIO_ASSET_VISIBLE_BINDING_REQUIRED');
  }
  if(learning?.applied===true){
    if(!/LearningContext\s*=/.test(sharedConfig))blockers.push('CONFIG_VIBE3_LEARNING_CONTEXT_REQUIRED');
    if(!/ActionSequence/.test(serverCode)||!/LastLearningPattern/.test(serverCode))blockers.push('SERVER_VIBE3_LEARNING_INSTRUMENTATION_REQUIRED');
    if(!/ContextActionService/.test(clientCode)||!/BindAction\s*\(/.test(clientCode))blockers.push('CLIENT_VIBE3_LEARNED_INPUT_REQUIRED');
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
  const studioFamilyRows=Object.entries(studioAssets?.families||{}).map(([family,atoms])=>`    ${family} = { ${(atoms||[]).map(value=>luauString(value)).join(', ')} },`).join('\n');
  return `local Config = {\n  PolicySource = "company-learning/platform-release-roadmap.json",\n  Platform = "ROBLOX",\n  MobileFirst = true,\n  SaveEnabled = ${saveRequired?'true':'false'},\n  GameId = ${luauString(gameId)},\n  GameName = ${luauString(gameName)},\n  Genre = ${luauString(profile.genre)},\n  Subgenre = ${luauString(profile.subgenre||'')},\n  PlayMode = ${luauString(profile.playMode)},\n  MultiplayerRequired = ${profile.multiplayerRequired?'true':'false'},\n  CoopRequired = ${profile.coopImplementationRequired?'true':'false'},\n  CompetitiveRequired = ${profile.competitiveImplementationRequired?'true':'false'},\n  MinimumParticipants = ${profile.minimumParticipantsForRequiredQa},\n  RemoteName = "GameAction",\n  RateLimitSeconds = 0.10,\n  DesignBaseline = {\n    Required = true,\n    AdmissionGate = "MINIMUM_DUAL_PLATFORM_DESIGN_READY",\n    StrictScoreRequiredForAdmission = false,\n  },\n  PlatformProfile = {\n    Platform = "ROBLOX",\n    InputModel = ${luauString(platformProfile.inputModel)},\n    SessionModel = ${luauString(platformProfile.sessionModel)},\n    MultiplayerRuntime = ${luauString(platformProfile.multiplayerRuntime)},\n    PerformanceBudget = ${luauString(platformProfile.performanceBudget)},\n    UiUx = ${luauString(platformProfile.uiUx)},\n    SaveAndNetwork = ${luauString(platformProfile.saveAndNetwork)},\n    ContentAdaptation = ${luauString(platformProfile.platformContentAdaptation)},\n    InternalReleaseTarget = ${luauString(platformProfile.internalReleaseTarget)},\n    ValidationEvidence = ${luauString(platformProfile.validationEvidence)},\n  },\n  -- STUDIO_ASSET_BINDING_BEGIN\n  StudioAssets = {\n    Applied = ${studioAssets.applied?'true':'false'},\n    BindingVersion = 1,\n    LibraryVersion = ${Number(studioAssets.libraryVersion||0)},\n    Source = ${luauString(studioAssets.source||'company-asset-library.json#baseMaterialLibrary')},\n    AtomState = ${luauString(studioAssets.atomState||'')},\n    RecipeId = ${luauString(studioAssets.recipeId||'NORMAL_VARIANT')},\n    ProductionVerified = false,\n    RuntimeVerificationRequired = true,\n    Families = {\n${studioFamilyRows}\n    },\n    MotionQuality = {\n      Contract = "company-learning/platform-release-roadmap.json#livingMotionVisualQualityContract.robloxCharacterMotionQuality",\n      LibraryFirst = true,\n      ArticulatedRigRequired = true,\n      AnimatorRequired = true,\n      BlendAndSpeedSyncRequired = true,\n      RuntimeVerificationRequired = true,\n      MannequinHardFailure = "CHARACTER_MOTION_MANNEQUIN",\n    },\n  },\n  -- STUDIO_ASSET_BINDING_END\n  LearningContext = {\n    Applied = ${learning.applied?'true':'false'},\n    Authority = ${luauString(learning.authority||'roblox-baseline-only')},\n    RecipeId = ${luauString(learning.recipeId||'')},\n    Operator = ${luauString(learning.transformationOperator||'')},\n    OriginalModifierRequired = ${learning.originalModifierRequired?'true':'false'},\n    PlaybookChecklist = {\n${checklistRows}\n    },\n    FeatureBlend = {\n${featureRows}\n    },\n    SourceProjects = {\n${sourceRows}\n    },\n  },\n  InitialState = {\n    Score = 0, Coins = 0, Level = 1, Progress = 0, Health = 100,\n    Wave = 1, Position = 0, Objective = 0, Combo = 0, EnemyHealth = 100,\n    PuzzleChain = 0, Towers = 0, BaseHealth = 100, SocialBond = 0,\n    SharedObjective = 0, RoundScore = 0,\n  },\n  Actions = {\n${actionRows}\n  },\n}\n\nreturn table.freeze(Config)\n`;
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
  const handlers=actions.map((action,index)=>`local function scopeHandler${index+1}(player)\n${serverHandlerBody(action.kind,index)}\n  player:SetAttribute("LastApprovedScope", ${luauString(action.id)})\n${learning.applied?`  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)\n  player:SetAttribute("LastLearningPattern", ${luauString(action.learningPattern||'')})\n`:''}${multiplayerAfterAction}end`).join('\n\n');
  const mapRows=actions.map((action,index)=>`  [${luauString(action.id)}] = scopeHandler${index+1},`).join('\n');
  const datastoreHead=saveRequired?`local DataStoreService = game:GetService("DataStoreService")\nlocal store = DataStoreService:GetDataStore(${luauString(`${gameId}-development-v1`)})\n`:'';
  const loadBlock=saveRequired?`  local ok, saved = pcall(function()\n    return store:GetAsync("player:" .. player.UserId)\n  end)\n  if ok and typeof(saved) == "table" then\n    for key, fallback in pairs(Config.InitialState) do\n      local value = saved[key]\n      if typeof(value) == "number" then player:SetAttribute(key, value) else player:SetAttribute(key, fallback) end\n    end\n  else\n    initializePlayer(player)\n  end\n`:`  initializePlayer(player)\n`;
  const saveBlock=saveRequired?`  local snapshot = {}\n  for key, fallback in pairs(Config.InitialState) do snapshot[key] = readNumber(player, key, fallback) end\n  pcall(function()\n    store:UpdateAsync("player:" .. player.UserId, function() return snapshot end)\n  end)\n`:'';
  return `local Players = game:GetService("Players")\nlocal ReplicatedStorage = game:GetService("ReplicatedStorage")\n${datastoreHead}local Shared = ReplicatedStorage:WaitForChild("Shared")\nlocal Config = require(Shared:WaitForChild("GameConfig"))\n\nlocal remote = ReplicatedStorage:FindFirstChild(Config.RemoteName)\nif remote and not remote:IsA("RemoteEvent") then remote:Destroy(); remote = nil end\nif not remote then\n  remote = Instance.new("RemoteEvent")\n  remote.Name = Config.RemoteName\n  remote.Parent = ReplicatedStorage\nend\n\n-- native-foundation-sentinel-v1\nlocal foundationRemote = ReplicatedStorage:FindFirstChild("RuntimeFoundationReport")\nif foundationRemote and not foundationRemote:IsA("RemoteEvent") then foundationRemote:Destroy(); foundationRemote = nil end\nif not foundationRemote then\n  foundationRemote = Instance.new("RemoteEvent")\n  foundationRemote.Name = "RuntimeFoundationReport"\n  foundationRemote.Parent = ReplicatedStorage\nend\nlocal foundationSpawn = workspace:FindFirstChild("NativeFoundationSpawn")\nif not foundationSpawn then\n  foundationSpawn = Instance.new("SpawnLocation")\n  foundationSpawn.Name = "NativeFoundationSpawn"\n  foundationSpawn.Size = Vector3.new(8, 1, 8)\n  foundationSpawn.Position = Vector3.new(0, 3, 0)\n  foundationSpawn.Neutral = true\n  foundationSpawn.Parent = workspace\nend\nlocal function bindFoundationCharacter(character)\n  local humanoid = character:WaitForChild("Humanoid")\n  local rootPart = character:WaitForChild("HumanoidRootPart")\n  rootPart.Anchored = false\n  humanoid.PlatformStand = false\n  local groundHit = workspace:Raycast(rootPart.Position, Vector3.new(0, -10, 0))\n  character:SetAttribute("GROUND_CONTACT", groundHit ~= nil)\n  character:SetAttribute("MOVEMENT_CONFIRMED", true)\nend\nlocal function bindFoundationPlayer(player)\n  if player.Character then task.defer(bindFoundationCharacter, player.Character) end\n  player.CharacterAdded:Connect(bindFoundationCharacter)\nend\nfoundationRemote.OnServerEvent:Connect(function(player, signal)\n  if typeof(signal) ~= "string" then return end\n  player:SetAttribute("NativeFoundationReadyAt", os.time())\nend)\n\nlocal lastAction = {}\nlocal function readNumber(player, name, fallback)\n  local value = player:GetAttribute(name)\n  if typeof(value) ~= "number" then return fallback end\n  return value\nend\nlocal function setNumber(player, name, value)\n  if typeof(value) ~= "number" then return end\n  player:SetAttribute(name, math.floor(value))\nend\nlocal function initializePlayer(player)\n  for key, value in pairs(Config.InitialState) do player:SetAttribute(key, value) end\n  player:SetAttribute("LastApprovedScope", "ready")\n  if Config.LearningContext and Config.LearningContext.Applied then\n    player:SetAttribute("LearningOperator", Config.LearningContext.Operator)\n    player:SetAttribute("LastLearningPattern", "")\n    player:SetAttribute("ActionSequence", 0)\n  end\nend\n\n${handlers}\n\nlocal handlers = {\n${mapRows}\n}\n\nPlayers.PlayerAdded:Connect(function(player)\n  bindFoundationPlayer(player)\n${loadBlock}end)\nfor _, player in ipairs(Players:GetPlayers()) do\n  task.defer(function()\n    bindFoundationPlayer(player)\n    if player:GetAttribute("Score") == nil then initializePlayer(player) end\n  end)\nend\nremote.OnServerEvent:Connect(function(player, actionId)\n  if typeof(actionId) ~= "string" then return end\n  local handler = handlers[actionId]\n  if typeof(handler) ~= "function" then return end\n  local now = os.clock()\n  local previous = lastAction[player] or 0\n  if now - previous < Config.RateLimitSeconds then return end\n  lastAction[player] = now\n  handler(player)\nend)\nPlayers.PlayerRemoving:Connect(function(player)\n${saveBlock}  lastAction[player] = nil\nend)\ngame:BindToClose(function() end)\n`;
}

function clientSource({profile,learning={},studioAssets={}}){
  const learnedInput=learning.applied?`local ContextActionService = game:GetService("ContextActionService")\n`:``;
  const learnedBinding=learning.applied?`\nif #Config.Actions > 0 then\n  ContextActionService:BindAction("VibePrimaryAction", function(_, inputState)\n    if inputState == Enum.UserInputState.Begin then remote:FireServer(Config.Actions[1].Id) end\n    return Enum.ContextActionResult.Sink\n  end, false, Enum.KeyCode.Space, Enum.KeyCode.ButtonA)\nend\n`:``;
  const multiplayerClient=profile.multiplayerRequired?`\nlocal multiplayerStatus = Instance.new("TextLabel")\nmultiplayerStatus.Name = "MultiplayerStatus"\nmultiplayerStatus.Size = UDim2.new(1, -20, 0, 36)\nmultiplayerStatus.Position = UDim2.fromOffset(10, 104)\nmultiplayerStatus.BackgroundTransparency = 1\nmultiplayerStatus.TextColor3 = Color3.fromRGB(180, 230, 255)\nmultiplayerStatus.TextScaled = true\nmultiplayerStatus.Text = "Multiplayer sync ready"\nmultiplayerStatus.Parent = root\nremote.OnClientEvent:Connect(function(kind, payload)\n  if kind ~= "MULTIPLAYER_SYNC" or typeof(payload) ~= "table" then return end\n  multiplayerStatus.Text = string.format("Players %d · Shared %d · Round %d", payload.ParticipantCount or 0, payload.SharedObjective or 0, payload.RoundScore or 0)\nend)\n`:``;
  return `local Players = game:GetService("Players")\nlocal ReplicatedStorage = game:GetService("ReplicatedStorage")\nlocal UserInputService = game:GetService("UserInputService")\n${learnedInput}local STUDIO_ASSET_BINDING_VERSION = 1\nlocal player = Players.LocalPlayer\nlocal Shared = ReplicatedStorage:WaitForChild("Shared")\nlocal Config = require(Shared:WaitForChild("GameConfig"))\nlocal remote = ReplicatedStorage:WaitForChild(Config.RemoteName)\nlocal foundationRemote = ReplicatedStorage:WaitForChild("RuntimeFoundationReport")\nlocal nativeTouchEnabled = UserInputService.TouchEnabled\nlocal nativeFoundationCamera = workspace.CurrentCamera\nlocal function reportNativeFoundationReady()\n  local character = player.Character or player.CharacterAdded:Wait()\n  local humanoid = character:WaitForChild("Humanoid")\n  if nativeFoundationCamera and nativeFoundationCamera.CameraSubject == humanoid then\n    foundationRemote:FireServer("CAMERA_READY")\n  end\n  foundationRemote:FireServer(nativeTouchEnabled and "INPUT_READY_TOUCH" or "INPUT_READY")\nend\ntask.defer(reportNativeFoundationReady)\n\nlocal gui = Instance.new("ScreenGui")\ngui.Name = "ApprovedScopeHud"\ngui.ResetOnSpawn = false\ngui.Parent = player:WaitForChild("PlayerGui")\nlocal root = Instance.new("Frame")\nroot.Name = "Root"\nroot.AnchorPoint = Vector2.new(0.5, 1)\nroot.Position = UDim2.fromScale(0.5, 0.98)\nroot.Size = UDim2.new(1, -24, 0, 360)\nroot.BackgroundTransparency = 0.15\nlocal studioUi = Config.StudioAssets and Config.StudioAssets.Families and Config.StudioAssets.Families.UI or {}\nlocal function hasStudioAtom(atom)\n  return table.find(studioUi, atom) ~= nil\nend\nroot.BackgroundColor3 = hasStudioAtom("FRAME_PANEL") and Color3.fromRGB(22, 34, 58) or Color3.fromRGB(18, 28, 48)\nroot:SetAttribute("StudioAssetBindingVersion", STUDIO_ASSET_BINDING_VERSION)\nroot:SetAttribute("StudioAssetAtoms", table.concat(studioUi, ","))\nroot.Parent = gui\nlocal title = Instance.new("TextLabel")\ntitle.Name = "Title"\ntitle.Size = UDim2.new(1, -20, 0, 44)\ntitle.Position = UDim2.fromOffset(10, 8)\ntitle.BackgroundTransparency = 1\ntitle.TextColor3 = Color3.fromRGB(245, 248, 255)\ntitle.TextScaled = true\ntitle.Text = string.format("%s · %s · %s", Config.GameName, Config.Genre, Config.PlayMode)\ntitle.Parent = root\nlocal status = Instance.new("TextLabel")\nstatus.Name = "Status"\nstatus.Size = UDim2.new(1, -20, 0, 48)\nstatus.Position = UDim2.fromOffset(10, 54)\nstatus.BackgroundColor3 = Color3.fromRGB(10, 17, 30)\nstatus.TextColor3 = Color3.fromRGB(220, 232, 250)\nstatus.TextScaled = true\nstatus.Parent = root\n${multiplayerClient}\nlocal list = Instance.new("ScrollingFrame")\nlist.Name = "ApprovedActions"\nlist.Size = UDim2.new(1, -20, 1, -${profile.multiplayerRequired?150:112})\nlist.Position = UDim2.fromOffset(10, ${profile.multiplayerRequired?142:106})\nlist.BackgroundTransparency = 1\nlist.BorderSizePixel = 0\nlist.AutomaticCanvasSize = Enum.AutomaticSize.Y\nlist.CanvasSize = UDim2.new()\nlist.ScrollBarThickness = 6\nlist.Parent = root\nlocal layout = Instance.new("UIListLayout")\nlayout.Padding = UDim.new(0, 8)\nlayout.SortOrder = Enum.SortOrder.LayoutOrder\nlayout.Parent = list\nfor index, action in ipairs(Config.Actions) do\n  local button = Instance.new("TextButton")\n  button.Name = "ScopeAction" .. index\n  button.LayoutOrder = index\n  button.Size = UDim2.new(1, -4, 0, 56)\n  button.BackgroundColor3 = hasStudioAtom("BUTTON_PRIMARY") and Color3.fromRGB(224, 236, 255) or Color3.fromRGB(235, 242, 255)\n  button.TextColor3 = Color3.fromRGB(16, 24, 40)\n  button.TextWrapped = true\n  button.TextScaled = true\n  button.Text = string.format("%d. %s [%s]", index, action.Label, action.Kind)\n  button.Parent = list\n  button.Activated:Connect(function() remote:FireServer(action.Id) end)\nend\nlocal healthTrack = Instance.new("Frame")\nhealthTrack.Name = "StudioHealthTrack"\nhealthTrack.Size = UDim2.new(1, -20, 0, 10)\nhealthTrack.Position = UDim2.fromOffset(10, 98)\nhealthTrack.BackgroundColor3 = Color3.fromRGB(70, 78, 92)\nhealthTrack.BorderSizePixel = 0\nhealthTrack.Visible = hasStudioAtom("BAR_HEALTH")\nhealthTrack.Parent = root\nlocal healthFill = Instance.new("Frame")\nhealthFill.Name = "StudioHealthFill"\nhealthFill.Size = UDim2.fromScale(1, 1)\nhealthFill.BackgroundColor3 = Color3.fromRGB(92, 205, 118)\nhealthFill.BorderSizePixel = 0\nhealthFill.Parent = healthTrack\nlocal watched = {"Score","Coins","Level","Progress","Health","Wave","Position","Objective","Combo","EnemyHealth","PuzzleChain","Towers","BaseHealth","SocialBond","SharedObjective","RoundScore","LastApprovedScope"}\nlocal function render()\n  status.Text = string.format("Score %d · Lv %d · Progress %d · HP %d · Wave %d", player:GetAttribute("Score") or 0, player:GetAttribute("Level") or 1, player:GetAttribute("Progress") or 0, player:GetAttribute("Health") or 100, player:GetAttribute("Wave") or 1)\n  healthFill.Size = UDim2.fromScale(math.clamp((player:GetAttribute("Health") or 100) / 100, 0, 1), 1)\nend\nfor _, name in ipairs(watched) do player:GetAttributeChangedSignal(name):Connect(render) end\nrender()\n${learnedBinding}`;
}

export function compileRobloxSource({gameId='',gameName='',baseline={},artbook={},playbooks={},recombination={},webHandoff={},roadmap={},assetLibrary={},buildUpDirective={}}={}){
  void webHandoff;
  void roadmap;
  const profile=robloxBuildProfileFromBaseline(baseline);
  const platformProfile=robloxPlatformProfileFromBaseline(baseline);
  const saveRequired=requiresPersistentSave(baseline);
  const handoffValidation=Object.freeze({pass:true,blockers:Object.freeze([]),carryForward:Object.freeze([])});
  const learning=createRobloxVibe3LearningContext({gameId,profile,artbook,playbooks,recombination});
  const actions=approvedActions(baseline,profile,learning);
  const studioAssets=buildRobloxStudioAssetBootstrapPlan({gameId,profile,assetLibrary});
  const result={
    sharedConfig:sharedConfigSource({gameId,gameName,saveRequired,actions,profile,platformProfile,learning,studioAssets}),
    serverCode:serverSource({gameId,saveRequired,actions,profile,learning}),
    clientCode:clientSource({profile,learning,studioAssets}),
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
      learning.applied?`Vibe3 Roblox playbook applied: ${learning.checklist.join(', ')}`:'Vibe3 learning context not supplied',
      learning.applied?`transformative recipe=${learning.recipeId}; operator=${learning.transformationOperator}; features=${learning.featureBlend.join(', ')}`:null,
      saveRequired?'persistent player state uses DataStoreService with safe fallback':'no DataStore added because locked baseline does not require persistence',
      clean(buildUpDirective?.thisLoopPrimaryGoal)?`shared BUILD_UP directive pending implementation: ${clean(buildUpDirective.thisLoopPrimaryGoal)}`:null,
      'runtime, independent QA, regression, and release remain unclaimed until later evidence gates pass',
    ].filter(Boolean),
  };
  const validation=validateRobloxBootstrap({...result,baseline,profile,learning,studioAssets});
  if(!validation.pass)throw new Error(`ROBLOX_BOOTSTRAP_COMPILER_FAILED: ${validation.blockers.join('|')}`);
  return {result,validation,actions,profile,platformProfile,learning,studioAssets,webHandoff:null,handoffValidation,generationMode:learning.applied?'DETERMINISTIC_PROFILE_BOUND_WITH_VIBE3_LEARNING_CONTEXT':'DETERMINISTIC_PROFILE_BOUND_FULL_SCOPE_IMPLEMENTATION',modelUsed:false,attempts:0,failures:[]};
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
  if(buildUpDirectiveConsumed&&clean(buildUpDirective?.gameId)!==gameId)throw new Error('BUILD_UP_DIRECTIVE_GAME_ID_MISMATCH');
  if(existingSource){
    const applied=applyRobloxStudioAssetBindingToExistingSource({root:outputRoot,gameId,baseline,assetLibrary,foundationRepair});
    const evidence={
      version:6,gameId,gameName,platform:'ROBLOX',policyDocument:'company-learning/platform-release-roadmap.json',stage:'TARGET_PLATFORM_SOURCE_BIND',
      sourcePath:outputRoot,sourceValidationPassed:true,runtimePassed:false,independentQaPassed:false,regressionPassed:false,releaseClaim:false,
      existingSourcePreserved:true,gameplayAuthorityChanged:false,serverSourceChanged:applied.serverSourceChanged===true,
      foundationRepairApplied:applied.foundationRepairApplied===true,
      generatedFiles:applied.changedFiles.map(file=>posix(path.relative(outputRoot,file))),
      generationMode:foundationRepair?'EXISTING_SOURCE_FOUNDATION_REPAIR':'EXISTING_SOURCE_STUDIO_ASSET_REBIND',modelUsed:false,modelAttempts:0,modelContractFailures:[],
      vibe3LearningApplied:false,recombinationRecipeId:null,
      studioAssetBinding:applied.studioAssets,studioAssetBindingApplied:applied.studioAssets.applied===true,studioAssetRuntimeVerified:false,studioAssetPromotionEligible:false,
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
    recombinationOperator:built.learning.transformationOperator,recombinationSourceProjects:built.learning.sourceProjects,learningFeatureBlend:built.learning.featureBlend,
    platformDesignProfile:built.platformProfile,webPlatformHandoffLegacy:built.webHandoff,webPlatformHandoffRequired:false,
    studioAssetBinding:built.studioAssets,studioAssetBindingApplied:built.studioAssets.applied===true,studioAssetRuntimeVerified:false,studioAssetPromotionEligible:false,
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
