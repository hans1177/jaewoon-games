// Reconcile Roblox DEVELOPMENT source that already exists on an exact main revision.
// This validates source only. It never claims Roblox runtime, independent QA, regression, or release success.

import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {buildRobloxStudioAssetBootstrapPlan,validateRobloxBootstrap,robloxBuildProfileFromBaseline,ROBLOX_VERIFIED_EXTERNAL_NATIVE_BINDING_VERSION} from './company-development-roblox-bootstrap.mjs';
import {platformDevelopmentEligible} from './company-selected-platform-router.mjs';
import {createRobloxVibe3LearningContext,existingRobloxGameLearningProfile,verifiedExternalBlackBoxPlaybookContract,ROBLOX_SEMANTIC_MAPPING_VERSION} from './vibe3-roblox-learning-context.mjs';

const clean=value=>String(value??'').trim();
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const arg=(name,fallback='')=>process.argv.find(value=>value.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const sha40=value=>/^[0-9a-f]{40}$/i.test(clean(value));

export const ROBLOX_INTERNAL_ASSET_FAMILIES=Object.freeze(['CHARACTER','CREATURE','BUILDING','ENVIRONMENT','WEAPON','SKILL','MATERIAL','AUDIO','VFX','UI','MOTION','PROP']);

function robloxSourceTreeText(root=''){
  const rows=[];
  const visit=dir=>{
    if(!fs.existsSync(dir)||!fs.statSync(dir).isDirectory())return;
    for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      const file=path.join(dir,entry.name);
      if(entry.isDirectory()){visit(file);continue;}
      if(entry.isFile()&&/\.lua[u]?$/i.test(entry.name))rows.push(fs.readFileSync(file,'utf8'));
    }
  };
  visit(root);
  return rows.join('\n');
}

function robloxInternalAssetFamilySignals(text=''){
  const source=String(text||'');
  return Object.freeze({
    CHARACTER:/(?:CharacterAdded|player\.Character|Instance\.new\s*\(\s*["']Humanoid["']|Name\s*=\s*["'](?:Player|Character|NPC|Npc|Villager|Resident))/i.test(source),
    CREATURE:/(?:Name\s*=\s*["'](?:Enemy|Monster|Boss|Creature|Zombie|Goblin|Wolf|Spider|Beetle|Ant|Bear|Shark|Boar|Deer)|create\w*(?:Enemy|Monster|Boss|Creature)\s*\()/i.test(source),
    BUILDING:/(?:Name\s*=\s*["'](?:Village|House|School|Shop|Building|Temple|Castle|Dungeon|Wall|Roof|Door|Warehouse|Hospital|PoliceStation)|create\w*(?:Building|House|School|Shop|Village)\s*\()/i.test(source),
    ENVIRONMENT:/(?:workspace\.Terrain|Terrain:|Lighting|Atmosphere|Sky|Name\s*=\s*["'](?:Tree|Rock|Ground|Terrain|Environment|Forest|Jungle|Snow|Water|Lake|Road|Path))/i.test(source),
    WEAPON:/(?:Instance\.new\s*\(\s*["']Tool["']|Name\s*=\s*["'](?:Weapon|Sword|Axe|Spear|Hammer|Bow|Crossbow|Gun|Staff|Shield))/i.test(source),
    SKILL:/(?:Name\s*=\s*["'](?:Skill|Spell|Projectile|Telegraph|Cast|Ability)|create\w*(?:Skill|Spell|Projectile|Ability)\s*\()/i.test(source),
    MATERIAL:/(?:\.Material\s*=|SurfaceAppearance|TextureID|MeshId|MaterialVariant|Color3\.(?:fromRGB|new)\s*\()/i.test(source),
    AUDIO:/(?:Instance\.new\s*\(\s*["']Sound["']|\.SoundId\s*=|\bSoundService\b)/i.test(source),
    VFX:/(?:ParticleEmitter|Trail|Beam|PointLight|SpotLight|SurfaceLight|BloomEffect|ColorCorrectionEffect)/i.test(source),
    UI:/(?:ScreenGui|BillboardGui|SurfaceGui|TextButton|ImageButton|ImageLabel|TextLabel|ScrollingFrame|UIStroke|UIGradient|UICorner)/i.test(source),
    MOTION:/(?:Animator|AnimationTrack|LoadAnimation|Motor6D|\bBone\b|TweenService|RenderStepped|Heartbeat)/i.test(source),
    PROP:/(?:Name\s*=\s*["'](?:Chest|Crate|Barrel|Chair|Table|Bed|Shelf|Bench|Lamp|Lantern|Sign|Signpost|Torch|Banner|Rug|Book|Workbench|Furnace|Anvil|Cart))/i.test(source)
  });
}

function studioAssetFamilyAtoms(config='',family=''){
  const block=String(config||'').match(new RegExp('\\b'+family+'\\s*=\\s*\\{([\\s\\S]*?)\\}','m'))?.[1]||'';
  return [...new Set([...block.matchAll(/["']([A-Z][A-Z0-9_]{2,})["']/g)].map(match=>clean(match[1])).filter(Boolean))];
}

function studioAssetFamilyStatus(source=''){
  const body=String(source||'').match(/\bSTUDIO_ASSET_FAMILY_STATUS\s*=\s*\{([\s\S]*?)\}/)?.[1]||'';
  const status={};
  for(const match of body.matchAll(/\b([A-Z][A-Z0-9_]*)\s*=\s*["'](APPLIED|NOT_APPLICABLE)["']/g))status[clean(match[1])]=clean(match[2]);
  return status;
}

export function validateRobloxInternalAssetSourceBinding({root='',gameId='',baseline={},assetLibrary={}}={}){
  if(!assetLibrary?.baseMaterialLibrary?.families)return Object.freeze({required:false,pass:true,blockers:Object.freeze([]),familyCount:0,appliedFamilyCount:0,primitiveOnly:false});
  const profile=robloxBuildProfileFromBaseline(baseline);
  const expected=buildRobloxStudioAssetBootstrapPlan({gameId,profile,assetLibrary});
  const blockers=[];
  const configFile=path.join(root,'shared','GameConfig.luau');
  const clientFile=path.join(root,'client','Game.client.luau');
  if(!fs.existsSync(configFile))blockers.push('ROBLOX_INTERNAL_ASSET_CONFIG_REQUIRED');
  if(!fs.existsSync(clientFile))blockers.push('ROBLOX_INTERNAL_ASSET_CLIENT_REQUIRED');
  if(blockers.length)return Object.freeze({required:true,pass:false,blockers:Object.freeze(blockers),familyCount:0,appliedFamilyCount:0,primitiveOnly:true,expected});
  const config=fs.readFileSync(configFile,'utf8');
  const client=fs.readFileSync(clientFile,'utf8');
  const fullSource=robloxSourceTreeText(root);
  const libraryVersion=Number(config.match(/\bLibraryVersion\s*=\s*(\d+)/)?.[1]||0);
  const selectionFingerprint=clean(config.match(/\bSelectionFingerprint\s*=\s*["']([^"']+)["']/)?.[1]);
  const bindingVersion=Number(config.match(/\bBindingVersion\s*=\s*(\d+)/)?.[1]||0);
  if(expected.applied!==true)blockers.push('ROBLOX_INTERNAL_ASSET_LIBRARY_ALL_FAMILIES_REQUIRED');
  if(!/StudioAssets\s*=\s*\{[\s\S]*?Applied\s*=\s*true/.test(config))blockers.push('ROBLOX_INTERNAL_ASSET_APPLIED_REQUIRED');
  if(bindingVersion!==Number(expected.bindingVersion||2))blockers.push('ROBLOX_INTERNAL_ASSET_BINDING_VERSION_MISMATCH');
  if(libraryVersion!==Number(expected.libraryVersion||0))blockers.push('ROBLOX_INTERNAL_ASSET_LIBRARY_VERSION_MISMATCH');
  if(selectionFingerprint!==clean(expected.selectionFingerprint))blockers.push('ROBLOX_INTERNAL_ASSET_SELECTION_FINGERPRINT_MISMATCH');
  const selectedByFamily={};
  for(const family of ROBLOX_INTERNAL_ASSET_FAMILIES){
    const expectedAtoms=[...(expected.families?.[family]||[])].map(clean).filter(Boolean);
    const selected=studioAssetFamilyAtoms(config,family);
    selectedByFamily[family]=selected;
    if(!expectedAtoms.length)blockers.push('ROBLOX_INTERNAL_ASSET_FAMILY_LIBRARY_EMPTY_'+family);
    if(!selected.length||expectedAtoms.some(atom=>!selected.includes(atom)))blockers.push('ROBLOX_INTERNAL_ASSET_FAMILY_SELECTION_MISSING_'+family);
  }
  const status=studioAssetFamilyStatus(fullSource);
  for(const family of ROBLOX_INTERNAL_ASSET_FAMILIES)if(!['APPLIED','NOT_APPLICABLE'].includes(status[family]))blockers.push('ROBLOX_INTERNAL_ASSET_FAMILY_STATUS_MISSING_'+family);
  const signals=robloxInternalAssetFamilySignals(fullSource);
  for(const family of ROBLOX_INTERNAL_ASSET_FAMILIES){
    if(status[family]==='APPLIED'&&signals[family]!==true)blockers.push('ROBLOX_INTERNAL_ASSET_SOURCE_BINDING_MISSING_'+family);
    if(status[family]==='NOT_APPLICABLE'&&signals[family]===true)blockers.push('ROBLOX_INTERNAL_ASSET_FALSE_NOT_APPLICABLE_'+family);
  }
  if(status.ENVIRONMENT!=='APPLIED'||signals.ENVIRONMENT!==true)blockers.push('ROBLOX_INTERNAL_ASSET_ENVIRONMENT_REQUIRED');
  if(status.PROP!=='APPLIED'||signals.PROP!==true)blockers.push('ROBLOX_INTERNAL_ASSET_PROP_REQUIRED');
  if(signals.BUILDING===true&&status.BUILDING!=='APPLIED')blockers.push('ROBLOX_INTERNAL_ASSET_BUILDING_BINDING_REQUIRED');
  if(!/STUDIO_ASSET_BINDING_VERSION\s*=\s*2/.test(client))blockers.push('ROBLOX_INTERNAL_ASSET_CLIENT_BINDING_VERSION_REQUIRED');
  if(!/[A-Za-z_][A-Za-z0-9_]*\.StudioAssets/.test(client))blockers.push('ROBLOX_INTERNAL_ASSET_CLIENT_CONFIG_USAGE_REQUIRED');
  const runtimeTrace=/SetAttribute\s*\(\s*["']StudioAssetBindingVersion["']/.test(client)&&/StudioAssetAtoms/.test(client);
  if(!runtimeTrace)blockers.push('ROBLOX_INTERNAL_ASSET_RUNTIME_TRACE_REQUIRED');
  const detailAxes={
    mesh:/(?:MeshPart|SpecialMesh|SurfaceAppearance|MeshId|TextureID)/i.test(fullSource),
    material:/(?:\.Material\s*=|MaterialVariant|SurfaceAppearance)/i.test(fullSource),
    vfx:/(?:ParticleEmitter|Trail|Beam|BloomEffect|ColorCorrectionEffect|Atmosphere|Sky)/i.test(fullSource),
    audio:/(?:Instance\.new\s*\(\s*["']Sound["']|SoundService|\.SoundId\s*=)/i.test(fullSource),
    motion:/(?:Animator|AnimationTrack|LoadAnimation|Motor6D|TweenService|RenderStepped|Heartbeat)/i.test(fullSource),
    ui:/(?:UIStroke|UIGradient|UICorner|ImageLabel|ImageButton|ScreenGui)/i.test(fullSource)
  };
  const detailAxisCount=Object.values(detailAxes).filter(Boolean).length;
  const primitiveCount=(fullSource.match(/Instance\.new\s*\(\s*["']Part["']\s*\)/gi)||[]).length;
  const primitiveOnly=primitiveCount>0&&detailAxisCount<3;
  if(detailAxisCount<3)blockers.push('ROBLOX_INTERNAL_ASSET_NATIVE_DETAIL_AXES_REQUIRED');
  if(primitiveOnly)blockers.push('ROBLOX_PRIMITIVE_ONLY_PRESENTATION_FORBIDDEN');
  return Object.freeze({
    required:true,pass:blockers.length===0,blockers:Object.freeze([...new Set(blockers)]),
    familyCount:ROBLOX_INTERNAL_ASSET_FAMILIES.length,
    appliedFamilyCount:ROBLOX_INTERNAL_ASSET_FAMILIES.filter(family=>status[family]==='APPLIED').length,
    selectedByFamily:Object.freeze(selectedByFamily),familyStatus:Object.freeze(status),familySignals:signals,
    detailAxes:Object.freeze(detailAxes),detailAxisCount,primitiveCount,primitiveOnly,expected
  });
}

function studioAssetRefreshState({root='',assetLibrary={},gameId='',baseline={}}={}){
  const expected=buildRobloxStudioAssetBootstrapPlan({gameId:'library-refresh-probe',profile:{genre:''},assetLibrary});
  if(expected.applied!==true)return {required:false,refreshRequired:false,libraryVersion:Number(assetLibrary?.version||0)};
  const configFile=path.join(root,'shared','GameConfig.luau');
  const clientFile=path.join(root,'client','Game.client.luau');
  if(!fs.existsSync(configFile))return {required:true,refreshRequired:true,libraryVersion:Number(expected.libraryVersion||0),reason:'CONFIG_MISSING'};
  if(!fs.existsSync(clientFile))return {required:true,refreshRequired:true,libraryVersion:Number(expected.libraryVersion||0),reason:'CLIENT_MISSING'};
  const config=fs.readFileSync(configFile,'utf8');
  const client=fs.readFileSync(clientFile,'utf8');
  const libraryVersion=Number(config.match(/LibraryVersion\s*=\s*(\d+)/)?.[1]||0);
  const bindingVersion=Number(config.match(/BindingVersion\s*=\s*(\d+)/)?.[1]||0);
  const clientBindingVersion=Number(client.match(/STUDIO_ASSET_BINDING_VERSION\s*=\s*(\d+)/)?.[1]||0);
  const expectedBindingVersion=Number(expected.bindingVersion||0);
  const applied=/StudioAssets\s*=\s*\{[\s\S]*?Applied\s*=\s*true/.test(config);
  const clientConfigBound=/[A-Za-z_][A-Za-z0-9_]*\.StudioAssets/.test(client);
  const clientVisibleBound=/StudioAssetFramePanel/.test(client)
    ||(/StudioAssetBindingVersion/.test(client)&&/StudioAssetAtoms/.test(client)&&/FRAME_PANEL/.test(client)&&/(hasStudioAssetAtom|hasStudioAtom)/.test(client));
  const internalAssetBinding=validateRobloxInternalAssetSourceBinding({root,gameId,baseline,assetLibrary});
  const refreshRequired=!applied
    ||bindingVersion!==expectedBindingVersion
    ||libraryVersion!==Number(expected.libraryVersion||0)
    ||clientBindingVersion!==expectedBindingVersion
    ||!clientConfigBound
    ||!clientVisibleBound
    ||internalAssetBinding.pass!==true;
  return {required:true,refreshRequired,libraryVersion:Number(expected.libraryVersion||0),currentLibraryVersion:libraryVersion,bindingVersion,clientBindingVersion,expectedBindingVersion,applied,clientConfigBound,clientVisibleBound,internalAssetBinding,reason:refreshRequired?'STALE_OR_MISSING_STUDIO_ASSET_BINDING':null};
}

function verifiedExternalLearningRefreshState({root='',playbooks={},gameId='',profile=null}={}){
  const expectedContract=verifiedExternalBlackBoxPlaybookContract(playbooks);
  const expectedLearning=createRobloxVibe3LearningContext({gameId,profile:profile||existingRobloxGameLearningProfile(gameId),playbooks});
  if(!expectedContract.ids.length)return {required:false,refreshRequired:false,expectedIds:[],fingerprint:null};
  const configFile=path.join(root,'shared','GameConfig.luau');
  const clientFile=path.join(root,'client','Game.client.luau');
  if(!fs.existsSync(configFile)||!fs.existsSync(clientFile)){
    return {required:true,refreshRequired:true,expectedIds:[...expectedContract.ids],fingerprint:expectedContract.fingerprint,semanticMappingVersion:ROBLOX_SEMANTIC_MAPPING_VERSION,semanticMappingFingerprint:expectedLearning.semanticMappingFingerprint,reason:'CONFIG_OR_CLIENT_MISSING'};
  }
  const config=fs.readFileSync(configFile,'utf8');
  const client=fs.readFileSync(clientFile,'utf8');
  const managed=config.match(/-- VERIFIED_EXTERNAL_LEARNING_BINDING_BEGIN\n([\s\S]*?)-- VERIFIED_EXTERNAL_LEARNING_BINDING_END/);
  const full=config.match(/LearningContext\s*=\s*\{([\s\S]*?)\n\s*\},\n\s*InitialState\s*=/);
  const block=managed?.[1]||full?.[1]||'';
  const ids=[...new Set([...block.matchAll(/["'](external-black-box-[^"']+)["']/g)].map(match=>match[1]))].sort();
  const expectedIds=[...expectedContract.ids].sort();
  const coverage=Number(block.match(/CoveragePct\s*=\s*(\d+)/)?.[1]||0);
  const retrieved=Number(block.match(/RetrievedCount\s*=\s*(\d+)/)?.[1]||0);
  const applied=Number(block.match(/AppliedCount\s*=\s*(\d+)/)?.[1]||0);
  const nativeBindingVersion=Number(block.match(/NativeBindingVersion\s*=\s*(\d+)/)?.[1]||0);
  const clientNativeBindingVersion=Number(client.match(/VERIFIED_EXTERNAL_LEARNING_NATIVE_BINDING_VERSION\s*=\s*(\d+)/)?.[1]||0);
  const semanticMappingVersion=Number(block.match(/SemanticMappingVersion\s*=\s*(\d+)/)?.[1]||0);
  const semanticMappingFingerprint=clean(block.match(/SemanticMappingFingerprint\s*=\s*["']([^"']+)["']/)?.[1]);
  const semanticVariant=clean(block.match(/SemanticVariant\s*=\s*["']([^"']+)["']/)?.[1]);
  const mappingCount=Number(block.match(/AppliedGameDevelopmentPrincipleCount\s*=\s*(\d+)/)?.[1]||0);
  const gameSpecificMappingsPresent=/GameSpecificSemanticMappings\s*=\s*\{/.test(block);
  const learningDispositionsPresent=/LearningDispositions\s*=\s*\{/.test(block);
  const truncation=/TruncationForbidden\s*=\s*true/.test(block);
  const fingerprint=clean(block.match(/MemoryFingerprint\s*=\s*["']([^"']+)["']/)?.[1]);
  const exactIds=ids.length===expectedIds.length&&expectedIds.every(id=>ids.includes(id));
  const fullNativeClient=
    /VERIFIED_EXTERNAL_LEARNING_ROBLOX_NATIVE_BEGIN/.test(client)
    &&/VerifiedExternalLearningSemanticMappingVersion/.test(client)
    &&/VerifiedExternalLearningSemanticMappingFingerprint/.test(client)
    &&/VerifiedLearningSemanticVariant/.test(client)
    &&/VerifiedLearningSemanticMappingFingerprint/.test(client)
    &&/VerifiedLearningTouchTarget/.test(client)
    &&/VerifiedExternalLearningGameplayState/.test(client);
  const refreshRequired=
    !block
    ||coverage!==100
    ||retrieved!==expectedIds.length
    ||applied!==expectedIds.length
    ||!truncation
    ||!exactIds
    ||fingerprint!==clean(expectedContract.fingerprint)
    ||nativeBindingVersion!==ROBLOX_VERIFIED_EXTERNAL_NATIVE_BINDING_VERSION
    ||clientNativeBindingVersion!==ROBLOX_VERIFIED_EXTERNAL_NATIVE_BINDING_VERSION
    ||semanticMappingVersion!==ROBLOX_SEMANTIC_MAPPING_VERSION
    ||semanticMappingFingerprint!==clean(expectedLearning.semanticMappingFingerprint)
    ||!semanticVariant
    ||mappingCount<=0
    ||!gameSpecificMappingsPresent
    ||!learningDispositionsPresent
    ||!fullNativeClient;
  return {
    required:true,
    refreshRequired,
    expectedIds,
    currentIds:ids,
    fingerprint:expectedContract.fingerprint,
    currentFingerprint:fingerprint,
    semanticMappingVersion:ROBLOX_SEMANTIC_MAPPING_VERSION,
    currentSemanticMappingVersion:semanticMappingVersion,
    semanticMappingFingerprint:expectedLearning.semanticMappingFingerprint,
    currentSemanticMappingFingerprint:semanticMappingFingerprint,
    semanticVariant,
    mappingCount,
    gameSpecificMappingsPresent,
    learningDispositionsPresent,
    coverage,
    retrieved,
    applied,
    expectedNativeBindingVersion:ROBLOX_VERIFIED_EXTERNAL_NATIVE_BINDING_VERSION,
    nativeBindingVersion,
    clientNativeBindingVersion,
    fullNativeClient,
    reason:refreshRequired?'STALE_OR_MISSING_VERIFIED_EXTERNAL_LEARNING':'NOT_REQUIRED'
  };
}

export function hasVerifiedVibe2SourceHandoff(item={}){
  const handoff=item.robloxVibe2VerifiedHandoff;
  return Boolean(
    handoff?.verified===true
    &&clean(handoff.gameId)===clean(item.gameId)
    &&sha40(handoff.sourceRevision)
    &&sha40(handoff.candidateSha)
    &&sha40(handoff.sourceTreeSha)
    &&Number.isInteger(Number(handoff.qaRunId))
    &&Number(handoff.qaRunId)>0
  );
}

export function eligibleForRobloxSourceReconciliation(item={}){
  if(!clean(item.gameId))return false;
  const step=clean(item.currentStep).toUpperCase();
  if(step==='TARGET_PLATFORM_SOURCE_BIND')return platformDevelopmentEligible(item,'ROBLOX');
  if(clean(item.productionClass).toUpperCase()!=='DEVELOPMENT_CONFIRMED')return false;
  if(!['ACTIVE','PENDING'].includes(clean(item.status).toUpperCase()))return false;
  if(clean(item.canonicalState).toUpperCase()==='DEVELOPMENT_BLOCKED')return false;
  if(!sha40(item.robloxSourceCommit))return false;
  const explicitTargets=(Array.isArray(item.concurrentTargetPlatforms)?item.concurrentTargetPlatforms:[]).map(x=>clean(x).toUpperCase());
  if(explicitTargets.length&&!explicitTargets.includes('ROBLOX'))return false;
  return true;
}

export function validateExistingRobloxSourceTree({root='',gameId='',baseline={},assetLibrary={}}={}){
  const blockers=[];
  const required={
    project:path.join(root,'default.project.json'),
    config:path.join(root,'shared','GameConfig.luau'),
    server:path.join(root,'server','Game.server.luau'),
    client:path.join(root,'client','Game.client.luau'),
  };
  for(const [kind,file] of Object.entries(required)){
    if(!fs.existsSync(file))blockers.push(`SOURCE_${kind.toUpperCase()}_MISSING`);
  }
  if(blockers.length)return {pass:false,blockers,saveRequired:false};

  let project={};
  try{project=readJson(required.project);}catch{blockers.push('SOURCE_PROJECT_JSON_INVALID');}
  if(project?.tree?.ReplicatedStorage?.Shared?.$path!=='shared')blockers.push('SOURCE_PROJECT_SHARED_MAPPING_REQUIRED');
  if(project?.tree?.ServerScriptService?.GameServer?.$path!=='server')blockers.push('SOURCE_PROJECT_SERVER_MAPPING_REQUIRED');
  if(project?.tree?.StarterPlayer?.StarterPlayerScripts?.GameClient?.$path!=='client')blockers.push('SOURCE_PROJECT_CLIENT_MAPPING_REQUIRED');

  const verdict=validateRobloxBootstrap({
    sharedConfig:fs.readFileSync(required.config,'utf8'),
    serverCode:fs.readFileSync(required.server,'utf8'),
    clientCode:fs.readFileSync(required.client,'utf8'),
    baseline,
  });
  blockers.push(...verdict.blockers);
  const internalAssetBinding=validateRobloxInternalAssetSourceBinding({root,gameId,baseline,assetLibrary});
  if(internalAssetBinding.required===true)blockers.push(...internalAssetBinding.blockers);
  return {pass:blockers.length===0,blockers:[...new Set(blockers)],saveRequired:verdict.saveRequired,internalAssetBinding};
}

function currentSourceTreeSha({repoRoot='.',sourcePath=''}){
  try{
    return clean(execFileSync('git',['rev-parse',`HEAD:${sourcePath}`],{cwd:repoRoot,encoding:'utf8'}));
  }catch{
    return '';
  }
}

export function evaluateExistingRobloxSources({queue={},repoRoot='.',sourceRevision='',loadBaseline,assetLibrary={},playbooks={}}={}){
  if(typeof loadBaseline!=='function')throw new Error('loadBaseline callback required');
  const results=[];
  for(const item of queue.items||[]){
    if(!eligibleForRobloxSourceReconciliation(item))continue;
    const sourcePath=`roblox-games/${item.gameId}`;
    const root=path.join(repoRoot,sourcePath);
    const sourceBind=clean(item.currentStep).toUpperCase()==='TARGET_PLATFORM_SOURCE_BIND';
    const currentRevision=clean(sourceRevision);
    const sourceTreeSha=fs.existsSync(root)?currentSourceTreeSha({repoRoot,sourcePath}):'';
    let baseline=null;
    let baselineLoadError=null;
    try{baseline=loadBaseline(item);}catch(error){baselineLoadError=error;}
    const learningProfile=baseline?robloxBuildProfileFromBaseline(baseline):null;
    const studioState=fs.existsSync(root)?studioAssetRefreshState({root,assetLibrary,gameId:item.gameId,baseline:baseline||{}}):{required:false,refreshRequired:false,libraryVersion:Number(assetLibrary?.version||0)};
    const learningState=fs.existsSync(root)?verifiedExternalLearningRefreshState({root,playbooks,gameId:item.gameId,profile:learningProfile}):{required:false,refreshRequired:false,expectedIds:[],fingerprint:null};
    if(learningState.refreshRequired===true){
      results.push({gameId:item.gameId,pass:false,sourcePath,sourceRevision:currentRevision,sourceTreeSha,sourceDrift:!sourceBind,saveRequired:false,blockers:['ROBLOX_VERIFIED_EXTERNAL_LEARNING_REFRESH_REQUIRED'],failure:'existing-source-verified-external-learning-required',verifiedExternalLearningRefreshRequired:true,verifiedExternalLearningExpectedIds:learningState.expectedIds,verifiedExternalLearningCurrentIds:learningState.currentIds||[],verifiedExternalLearningFingerprint:learningState.fingerprint,verifiedExternalLearningCurrentFingerprint:learningState.currentFingerprint||null});
      continue;
    }
    if(studioState.refreshRequired===true){
      results.push({
        gameId:item.gameId,
        pass:false,
        sourcePath,
        sourceRevision:currentRevision,
        sourceTreeSha,
        sourceDrift:!sourceBind,
        saveRequired:false,
        blockers:['ROBLOX_STUDIO_ASSET_BINDING_REFRESH_REQUIRED'],
        failure:'existing-source-studio-asset-binding-required',
        studioAssetBindingRequired:true,
        studioAssetBindingRefreshRequired:true,
        studioAssetLibraryVersion:studioState.libraryVersion,
      });
      continue;
    }
    const boundRevision=clean(item.robloxSourceCommit);
    if(sha40(boundRevision)&&sha40(currentRevision)){
      if(boundRevision===currentRevision){
        if(!sourceBind)continue;
      }else{
        try{
          execFileSync('git',['diff','--quiet',boundRevision,currentRevision,'--',`${sourcePath}/default.project.json`,`${sourcePath}/shared`,`${sourcePath}/server`,`${sourcePath}/client`],{cwd:repoRoot,stdio:'ignore'});
          if(!sourceBind)continue;
          const exactBuildReusable=item.robloxBuildOrPackagePassed===true
            &&item.robloxBuildSourceRevision===boundRevision
            &&/^sha256:[0-9a-f]{64}$/i.test(clean(item.robloxBuildArtifactIdentity));
          if(exactBuildReusable){
            results.push({
              gameId:item.gameId,
              pass:true,
              sourcePath,
              sourceRevision:boundRevision,
              sourceTreeSha,
              sourceDrift:false,
              preserveDownstreamEvidence:true,
              sourceBindDebtResolved:true,
              saveRequired:false,
              blockers:[],
              failure:null,
              authority:'unchanged-game-source-revalidation',
            });
            continue;
          }
        }catch(error){
          if(Number(error?.status)!==1){
            results.push({
              gameId:item.gameId,
              pass:false,
              sourcePath,
              sourceRevision:currentRevision,
              sourceTreeSha,
              sourceDrift:true,
              saveRequired:false,
              blockers:['SOURCE_DRIFT_DETECTION_UNAVAILABLE'],
              failure:'source-drift-detection-unavailable',
            });
            continue;
          }
        }
      }
    }
    if(!fs.existsSync(root)){
      results.push({
        gameId:item.gameId,
        pass:false,
        sourcePath,
        sourceRevision:currentRevision,
        sourceTreeSha:'',
        sourceDrift:!sourceBind,
        saveRequired:false,
        blockers:['SOURCE_TREE_MISSING'],
        failure:'existing-source-tree-missing',
      });
      continue;
    }
    const handoffVerified=hasVerifiedVibe2SourceHandoff(item);
    if(handoffVerified){
      const expectedTree=clean(item.robloxVibe2VerifiedHandoff.sourceTreeSha);
      const actualTree=currentSourceTreeSha({repoRoot,sourcePath});
      if(!actualTree||actualTree!==expectedTree){
        results.push({
          gameId:item.gameId,
          pass:false,
          sourcePath,
          sourceRevision:clean(sourceRevision),
          sourceTreeSha:actualTree,
          sourceDrift:!sourceBind,
          saveRequired:false,
          blockers:['VIBE2_VERIFIED_HANDOFF_SOURCE_TREE_MISMATCH'],
          failure:'verified-vibe2-source-handoff-mismatch',
        });
        continue;
      }
      results.push({
        gameId:item.gameId,
        pass:true,
        sourcePath,
        sourceRevision:clean(sourceRevision),
        sourceTreeSha:actualTree,
        sourceDrift:!sourceBind,
        saveRequired:false,
        blockers:[],
        failure:null,
        authority:'verified-vibe2-source-handoff',
      });
      continue;
    }
    try{
      if(baselineLoadError)throw baselineLoadError;
      if(!baseline)throw new Error(`design baseline unavailable: ${item.gameId}`);
      const verdict=validateExistingRobloxSourceTree({root,gameId:item.gameId,baseline,assetLibrary});
      results.push({
        gameId:item.gameId,
        pass:verdict.pass,
        sourcePath,
        sourceRevision:clean(sourceRevision),
        sourceTreeSha,
        sourceDrift:!sourceBind,
        saveRequired:verdict.saveRequired,
        blockers:verdict.blockers,
        failure:verdict.pass?null:'existing-source-static-revalidation-failed',
      });
    }catch(error){
      results.push({
        gameId:item.gameId,
        pass:false,
        sourcePath,
        sourceRevision:clean(sourceRevision),
        sourceTreeSha,
        sourceDrift:!sourceBind,
        saveRequired:false,
        blockers:['SOURCE_BASELINE_OR_VALIDATION_UNAVAILABLE'],
        failure:'existing-source-static-revalidation-unavailable',
        detail:String(error?.message||error),
      });
    }
  }
  return results;
}

function runCli(){
  const queueFile=arg('queue');
  const runtimeRef=arg('runtime-ref');
  const repoRoot=arg('repo-root','.');
  const sourceRevision=arg('source-revision');
  const resultsFile=arg('results','/tmp/roblox-source-reconciliation.json');
  const playbooksFile=arg('playbooks');
  if(!queueFile||!runtimeRef||!sourceRevision)throw new Error('required: --queue, --runtime-ref, --source-revision');
  const queue=readJson(queueFile);
  const assetLibrary=readJson(path.join(repoRoot,'company-asset-library.json'));
  const playbooks=playbooksFile&&fs.existsSync(playbooksFile)?readJson(playbooksFile):{};
  const results=evaluateExistingRobloxSources({
    queue,
    repoRoot,
    sourceRevision,
    assetLibrary,
    playbooks,
    loadBaseline:item=>{
      const baselinePath=clean(item.designBaselineSource);
      if(!baselinePath)throw new Error(`designBaselineSource missing: ${item.gameId}`);
      const text=execFileSync('git',['show',`${runtimeRef}:${baselinePath}`],{encoding:'utf8',maxBuffer:8*1024*1024});
      return JSON.parse(text.replace(/^\uFEFF/,''));
    },
  });
  fs.writeFileSync(resultsFile,JSON.stringify(results,null,2)+'\n');
  const passCount=results.filter(x=>x.pass===true).length;
  const failCount=results.length-passCount;
  console.log(`ROBLOX_SOURCE_RECONCILIATION_COUNT=${results.length}`);
  console.log(`ROBLOX_SOURCE_RECONCILIATION_PASS=${passCount}`);
  console.log(`ROBLOX_SOURCE_RECONCILIATION_FAIL=${failCount}`);
  console.log(`ROBLOX_SOURCE_RECONCILIATION_REVISION=${sourceRevision}`);
  if(process.env.GITHUB_OUTPUT){
    fs.appendFileSync(process.env.GITHUB_OUTPUT,`count=${results.length}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT,`results_json=${JSON.stringify(results)}\n`);
  }
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href)runCli();
