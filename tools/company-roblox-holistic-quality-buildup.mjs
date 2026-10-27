// Source-grounded Roblox quality BUILD_UP planner. Advisory; does not modify game files.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const clean=v=>String(v??'').trim();
const norm=v=>clean(v).replaceAll('\\','/').replace(/^\.\/+/,'');
const digest=v=>crypto.createHash('sha256').update(v).digest('hex');
const unique=rows=>[...new Set(rows)].sort();
const families=[
  ['SERVER_AUTHORITY','source','server remote authority','Keep gameplay, rewards and Remote validation server-authoritative.','Exact server-client authority tests.'],
  ['SOURCE_STABILITY','source','script module init','Repair Luau errors, duplicate listeners and lifecycle cleanup.','Native compile and same-source regression evidence.'],
  ['SAVE_RECOVERY','system','save data persist','Preserve save keys, retry/rejoin and anti-duplication behavior.','Exact save-rejoin roundtrip.'],
  ['MULTIPLAYER_SYNC','system','remote player network','Validate replicated state, joins, disconnects and late joins.','Two observed clients agree on server-authoritative state.'],
  ['WORLD_TERRAIN','asset','terrain ground map world','Improve readable biome transitions and existing walkable collision.','Ground support and reachable spawn-to-goal route.'],
  ['REGIONS_LANDMARKS','asset','region biome landmark zone','Improve unique, navigable region silhouettes and wayfinding.','Goal paths and landmarks are reachable and legible.'],
  ['ENVIRONMENT_FOLIAGE','asset','environment tree foliage grass','Increase environmental detail without unbounded instances.','Actual frame performance and correct visual density.'],
  ['BUILDINGS_PROPS','asset','building prop house structure','Improve proportions, entrance clearances and usable interactions.','Physical entry and interaction checks.'],
  ['CHARACTERS_RIGS','asset','character avatar rig','Improve character identity, joints and combat silhouette.','Rig and model appear correctly in exact Studio frame.'],
  ['MONSTERS_NPCS','asset','monster enemy npc mob creature','Improve species-specific AI, anatomy and attacks without stat-only clones.','Behavior, collision, state and visual identity observed.'],
  ['WEAPONS_EQUIPMENT','asset','weapon armor equip tool','Attach verified models to real equip/attack states.','Equipped appearance and authoritative weapon effects agree.'],
  ['ITEMS_LOOT','asset','item loot pickup resource','Improve item identity, rarity clarity and pickup feedback.','Inventory state and shown reward match.'],
  ['MATERIALS_TEXTURES','asset','material texture surface','Improve tile scale and contrast; verify asset bytes and licensing.','Texture and material render in actual scene.'],
  ['ICONS_IMAGES','asset','icon image sprite','Improve contrast and semantic identity of owned icons.','Real bytes, rights and on-screen readability verified.'],
  ['UI_HUD_MENUS','asset','ui hud menu button panel','Improve modal navigation, 44px target size and responsive bounds.','Real Studio input triggers correct UI and gameplay effect.'],
  ['MOBILE_TOUCH','system','touch mobile input joystick','Implement responsive viewport layout and authorized Studio touch simulation.','Studio-simulated input only; real hardware touch separately.'],
  ['ANIMATION_MOTION','asset','motion animation animator motor6d','Repair rig-driven idle/walk/run/turn/jump/land/attack/hit/death transitions.','Motion changes observed in actual game, not CFrame-only.'],
  ['ACTION_IMPACT','system','attack hit combo recoil anticipation','Link attack anticipation, impact, recovery, hitbox and sound to real server result.','Observed server hit matches on-screen timing and reaction.'],
  ['ACTION_TRAVERSAL','system','move dash jump climb dodge','Improve action input, movement state, stamina and collision when designed.','Observed movement distance, contact and allowed action transitions.'],
  ['VFX_PARTICLES','asset','vfx particle trail effect','Synchronize attack and environment effects, cap particle lifetimes.','Rendered impact and particle budget observed.'],
  ['LIGHTING_SKY','asset','light sky atmosphere shadow','Improve brightness, weather and navigability while preserving mood.','Actual representative day/night capture.'],
  ['CAMERA_COMPOSITION','system','camera fov viewport','Avoid camera occlusion and motion sickness in movement/combat.','Camera remains clear in target device aspect ratios.'],
  ['AUDIO_BGM','asset','music bgm ambient audio','Improve authored state transitions, volume control and no overlap.','Authorized audio playback and state transitions observed.'],
  ['AUDIO_SFX','asset','sound sfx footstep','Improve hit, footstep and ambient spatial timing and cleanup.','Exactly one appropriate sound per real gameplay event.'],
  ['PERFORMANCE_BUDGET','system','performance lod pool streaming','Tune particle, instance, streaming and network budgets.','Measured device/Studio performance not guessed from source.'],
  ['COMBAT_BALANCE','system','combat damage cooldown enemy','Verify cooldowns, dodge windows and damage without arbitrary rebalance.','Damage, health and outcomes match approved data.'],
  ['AI_NAVIGATION','system','ai path target chase','Improve attack/retreat/return states and unreachable navigation.','Observed AI path and state-machine correctness.'],
  ['QUEST_PROGRESSION','system','quest level goal unlock','Connect existing quests to rewards, accessible map and progression.','Exact approved quest path and reward are completable.'],
  ['CRAFTING_ECONOMY','system','craft recipe shop currency','Prevent duplicate rewards and invalid costs; preserve balance.','Crafting/transaction state is server-authoritative.'],
  ['SPAWN_RESPAWN','system','spawn checkpoint respawn','Fix actual grounded spawn, death and checkpoint restore.','Observed collision support and recovery.'],
  ['ACCESSIBILITY','system','settings scale contrast accessibility','Improve safe-area UI, input readability, reduced effects and volume.','Accessible interaction on tested target layouts.'],
  ['PROMOTIONAL_MEDIA','asset','thumbnail cover marketing','Separate licensed promo visuals from actual runtime screenshot evidence.','Media integrity and rights; never claims runtime rendered proof.']
];
export const ROBLOX_QUALITY_FAMILIES=Object.freeze(families.map(([id,kind,words,improvement,acceptance])=>Object.freeze({id,kind,tokens:Object.freeze(words.split(' ')),improvement,acceptance})));
export const ROBLOX_MOTION_STATES=Object.freeze([
  'IDLE','WALK','RUN','START','STOP','TURN','JUMP','LAND',
  'ATTACK_ANTICIPATION','ATTACK_IMPACT','ATTACK_RECOVERY',
  'HIT_REACTION','DEATH','RESPAWN'
]);
export const ROBLOX_OFFICIAL_STUDIO_FIVE_PLAYBOT_SCENARIOS=Object.freeze([
  {id:'BASIC',actions:['START_PLAY','CHARACTER_MOVE','JUMP','CAMERA'],needs:'ACTUAL_STUDIO_CLIENT'},
  {id:'COMBAT',actions:['TARGET_NAVIGATION','ATTACK_INPUT','AUTHORITATIVE_DAMAGE','HIT_REACTION'],needs:'ACTUAL_STUDIO_CLIENT_AND_SERVER'},
  {id:'CONTENT',actions:['INTERACT','ITEM_AND_REWARD','PROGRESSION'],needs:'GAME_SPECIFIC_STUDIO_CONTRACT'},
  {id:'MOBILE',actions:['DEVICE_VIEWPORT','SAFE_AREA','SIMULATED_TOUCH_INPUT','UI_RESULT'],needs:'SUPPORTED_OFFICIAL_STUDIO_SIMULATOR'},
  {id:'STABILITY',actions:['DEATH','RESPAWN','SAVE_REJOIN_IF_APPLICABLE','ERROR_LOG'],needs:'ACTUAL_STUDIO_AND_EXACT_SAVE_CONTRACT'}
].map(x=>Object.freeze({...x,actions:Object.freeze(x.actions),status:'PLANNED_UNEXECUTED',realDeviceTouchVerified:false})));

const imageMap={'.png':'ICONS_IMAGES','.jpg':'ICONS_IMAGES','.jpeg':'ICONS_IMAGES','.webp':'ICONS_IMAGES','.gif':'ICONS_IMAGES','.svg':'ICONS_IMAGES'};
const assetMap={...imageMap,'.glb':'BUILDINGS_PROPS','.gltf':'BUILDINGS_PROPS','.obj':'BUILDINGS_PROPS','.fbx':'BUILDINGS_PROPS','.rbxm':'BUILDINGS_PROPS','.rbxmx':'BUILDINGS_PROPS','.mtl':'MATERIALS_TEXTURES','.ogg':'AUDIO_SFX','.wav':'AUDIO_SFX','.mp3':'AUDIO_BGM','.mp4':'PROMOTIONAL_MEDIA','.webm':'PROMOTIONAL_MEDIA','.ase':'ICONS_IMAGES','.aseprite':'ICONS_IMAGES'};
const sourceExt=new Set(['.luau','.lua','.json','.md','.toml']);
function integrity(file,buf){
  if(!buf.length)return 'INVALID_EMPTY';
  const ext=path.extname(file).toLowerCase(),len=buf.length;
  if(ext==='.png')return len>=24&&buf.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))?'HEADER_VALID':'INVALID_SIGNATURE';
  if(ext==='.webp')return len>=12&&buf.toString('ascii',0,4)==='RIFF'&&buf.toString('ascii',8,12)==='WEBP'?'HEADER_VALID':'INVALID_SIGNATURE';
  if(ext==='.glb')return len>=12&&buf.toString('ascii',0,4)==='glTF'&&buf.readUInt32LE(4)===2&&buf.readUInt32LE(8)===len?'HEADER_VALID':'INVALID_SIGNATURE';
  if(ext==='.ogg')return len>=4&&buf.toString('ascii',0,4)==='OggS'?'HEADER_VALID':'INVALID_SIGNATURE';
  if(ext==='.wav')return len>=12&&buf.toString('ascii',0,4)==='RIFF'&&buf.toString('ascii',8,12)==='WAVE'?'HEADER_VALID':'INVALID_SIGNATURE';
  if(ext==='.jpg'||ext==='.jpeg')return len>=4&&buf[0]===255&&buf[1]===216&&buf[len-2]===255&&buf[len-1]===217?'HEADER_VALID':'INVALID_SIGNATURE';
  if(ext==='.gltf'){try{return JSON.parse(buf.toString('utf8')).asset?.version?'JSON_VALID':'INVALID_SIGNATURE';}catch{return 'INVALID_SIGNATURE';}}
  return 'NOT_DECODED';
}
function getScope(repoRoot,gameId,sourceRoot){
  if(!/^[a-z0-9][a-z0-9-]{1,68}$/.test(clean(gameId)))throw new Error('ROBLOX_QUALITY_INVALID_GAME_ID');
  const repo=fs.realpathSync(repoRoot),relative=norm(sourceRoot||('roblox-games/'+gameId));
  if(relative!=='roblox-games/'+gameId&&!relative.startsWith('roblox-games/'+gameId+'/'))throw new Error('ROBLOX_QUALITY_WRONG_SOURCE_ROOT');
  const root=path.resolve(repo,relative);
  if(!fs.existsSync(root))return {repo,root:null,relative};
  const real=fs.realpathSync(root);
  if(!real.startsWith(repo+path.sep)||!fs.statSync(real).isDirectory())throw new Error('ROBLOX_QUALITY_OUTSIDE_REPO');
  return {repo,root:real,relative};
}
function sourceFiles(root){
  if(!root)return {files:[],complete:false,reason:'GAME_SOURCE_MISSING'};
  const files=[],todo=[root];let count=0,total=0,complete=true,reason='';
  while(todo.length){
    const folder=todo.shift();
    for(const entry of fs.readdirSync(folder,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      if(entry.isSymbolicLink())continue;
      const file=path.join(folder,entry.name);
      if(entry.isDirectory()){if(!['node_modules','.git','.rojo','dist','temp','build'].includes(entry.name.toLowerCase()))todo.push(file);continue;}
      if(!entry.isFile())continue;
      const st=fs.statSync(file);count++;total+=st.size;
      if(count>3500||total>96*1024*1024){complete=false;reason='INVENTORY_BUDGET_REACHED';todo.length=0;break;}
      files.push({file,ext:path.extname(file).toLowerCase(),bytes:st.size});
    }
  }
  return {files,complete,reason};
}
function assetRefs(texts,repo){
  const found=new Map();
  for(const row of texts){
    const refs=row.text.match(/assets\/roblox\/[A-Za-z0-9._/-]+\.(?:png|jpe?g|webp|glb|gltf|obj|fbx|ogg|wav|mp3|rbxm|rbxmx)/gi)||[];
    for(const value of refs){const ref=norm(value);if(!found.has(ref))found.set(ref,new Set());found.get(ref).add(row.file);}
  }
  return [...found].sort((a,b)=>a[0].localeCompare(b[0])).map(([ref,owners])=>{
    const full=path.resolve(repo,ref),inside=full.startsWith(repo+path.sep);
    const exists=inside&&fs.existsSync(full)&&fs.statSync(full).isFile();
    return {path:ref,owners:unique([...owners]),exists,licenseVerified:false,visualVerified:false,
      status:exists?'REFERENCE_EXISTS_RIGHTS_AND_RUNTIME_UNVERIFIED':'MISSING_SOURCE_ASSET'};
  });
}
function motionChecks(text){
  const keys={
    IDLE:/\bidle\b/,WALK:/\bwalk\b/,RUN:/\brun\b/,START:/\bstart\b/,
    STOP:/\bstop\b/,TURN:/\bturn\b/,JUMP:/\bjump\b/,LAND:/\bland\b/,
    ATTACK_ANTICIPATION:/anticipat|wind.?up/,ATTACK_IMPACT:/impact|hitbox/,
    ATTACK_RECOVERY:/recover|follow.?through/,HIT_REACTION:/hit.?reaction|stagger|flinch/,
    DEATH:/\bdeath\b|\bdied\b/,RESPAWN:/respawn/
  };
  return ROBLOX_MOTION_STATES.map(id=>({
    id,sourceMentioned:keys[id].test(text),
    sourceState:keys[id].test(text)?'TOKEN_ONLY_NOT_ANIMATION_PROOF':'NOT_FOUND_IN_INSPECTED_SOURCE',
    actualAnimatorVerified:false,realMovementVerified:false,actionHitTimingVerified:false,
    verdict:'UNVERIFIED'
  }));
}
export function buildRobloxHolisticQualityPlan({
  repoRoot=process.cwd(),gameId='',sourceRoot='',sourceObservation={},qualityGaps=[],
  previousPlan=null,runtimeEvidence={},sourceRevision=''
}={}){
  const scope=getScope(repoRoot,gameId,sourceRoot);
  const scan=sourceFiles(scope.root),texts=[],assets=[],hashes=[];
  for(const row of scan.files){
    const relative=norm(path.relative(scope.repo,row.file));
    if(sourceExt.has(row.ext)&&row.bytes<=2*1024*1024){
      const content=fs.readFileSync(row.file);
      texts.push({file:relative,text:content.toString('utf8')});
      hashes.push(relative+':'+digest(content));
    }else if(assetMap[row.ext]&&row.bytes<=40*1024*1024){
      const bytes=fs.readFileSync(row.file);
      assets.push({path:relative,bytes:bytes.length,sha256:'sha256:'+digest(bytes),
        familyCandidate:assetMap[row.ext],integrity:integrity(relative,bytes),
        rightsVerified:false,visualVerified:false,runtimeVerified:false});
    }
  }
  const combined=texts.map(row=>row.text.toLowerCase()).join('\n');
  const known=unique([...scan.files.map(row=>norm(path.relative(scope.repo,row.file))),...(sourceObservation?.topFiles||[]).map(row=>clean(row.file)).filter(Boolean)]);
  const gaps=new Set((Array.isArray(qualityGaps)?qualityGaps:[]).map(row=>clean(row?.domain||row).toUpperCase()));
  const refs=assetRefs(texts,scope.repo);
  const broken=assets.filter(row=>row.integrity.startsWith('INVALID'));
  const missing=refs.filter(row=>!row.exists);
  const rows=ROBLOX_QUALITY_FAMILIES.map(def=>{
    const files=known.filter(file=>def.tokens.some(token=>file.toLowerCase().includes(token))).slice(0,6);
    const mentioned=def.tokens.some(token=>combined.includes(token));
    const ownAssets=assets.filter(asset=>asset.familyCandidate===def.id);
    const ownRefs=refs.filter(ref=>def.tokens.some(token=>ref.path.toLowerCase().includes(token)));
    const issues=[...ownAssets.filter(row=>row.integrity.startsWith('INVALID')).map(row=>'INVALID_ASSET_BYTES:'+row.path),
      ...ownRefs.filter(row=>!row.exists).map(row=>'MISSING_ASSET_REFERENCE:'+row.path)];
    const candidate=files.length>0||mentioned||ownAssets.length>0||ownRefs.length>0;
    return {id:def.id,kind:def.kind,priority:issues.length?'P0':gaps.has(def.id)?'P1':candidate?'P2':'P3',
      sourceFiles:files,sourceSignalOnly:mentioned,assetCount:ownAssets.length,
      sourceState:!scan.complete?'PARTIAL_SOURCE':candidate?'CANDIDATE_NOT_VERIFIED':'NOT_OBSERVED',
      issues,improvement:def.improvement,acceptance:def.acceptance,
      implementationStatus:'NOT_IMPLEMENTED_BY_PLAN',verified:false,actualPlayVerified:false};
  }).sort((a,b)=>a.priority.localeCompare(b.priority)||b.issues.length-a.issues.length||a.id.localeCompare(b.id));
  const studio=runtimeEvidence?.studioPlayEvidence||{};
  const exactStudio=Boolean(studio.authority==='roblox-official-studio-mcp-runtime'
    &&studio.actualPlay===true&&studio.runtimeVerified===true
    &&studio.gameId===gameId&&/^[0-9a-f]{40}$/i.test(clean(sourceRevision))
    &&studio.sourceRevision===sourceRevision&&/^sha256:[a-f0-9]{64}$/i.test(clean(studio.artifactIdentity))
    &&studio.capabilities?.officialStudioMcp===true&&studio.capabilities?.playMode===true);
  // Exact Studio evidence only permits subsequent per-scenario evaluation; it never backfills scenario PASS.
  const scenarios=ROBLOX_OFFICIAL_STUDIO_FIVE_PLAYBOT_SCENARIOS.map(row=>({
    ...row,sourceRevision:clean(sourceRevision)||null,
    evidenceState:exactStudio?'EXACT_STUDIO_AVAILABLE_SCENARIO_PASS_NOT_ASSUMED':'STUDIO_NOT_OBSERVED',
    verified:false,realDeviceTouchVerified:false
  }));
  const observedAssetCount=assets.length,issues=[
    ...broken.map(row=>({id:'ASSET_SIGNATURE_INVALID',path:row.path,reason:row.integrity,priority:'P0'})),
    ...missing.map(row=>({id:'SOURCE_ASSET_REFERENCE_MISSING',path:row.path,reason:'FILE_ABSENT',priority:'P0'}))
  ];
  const fingerprint=sourceObservation?.sourceTreeFingerprint||digest(hashes.sort().join('\n'));
  return Object.freeze({
    version:1,authority:'EXISTING_BUILD_UP_SOURCE_ONLY',
    gameId,sourceRoot:scope.relative,sourceTreeFingerprint:fingerprint,
    sourceRevision:clean(sourceRevision)||null,
    scan:{complete:scan.complete,reason:scan.reason||null,sourceCount:texts.length,assetCount:observedAssetCount,assetReferences:refs.length,missingReferences:missing.length},
    sourceChangedSincePrevious:Boolean(previousPlan?.sourceTreeFingerprint&&previousPlan.sourceTreeFingerprint!==fingerprint),
    sourceOnly:true,qualityComplete:false,
    evidenceScope:{staticSource:true,cloudEngine:false,realStudioPlay:false,realScreen:false,realTouch:false,
      thumbnailIsNotRuntimeScreenshot:true,simulatedTouchIsNotHardwareTouch:true},
    assets,assetReferences:refs,issues,
    motion:{states:motionChecks(combined),requiredRealAnimatorStateCheck:true,
      requireStateInputToStateToFeedbackTrace:true,
      enforceAttackAnticipationImpactRecovery:true,
      onlySourceTokensSeen:true,actualActionVerified:false,actualMotionVerified:false},
    families:rows,priorityWork:rows.filter(row=>row.priority==='P0'||row.priority==='P1').concat(rows.filter(row=>row.priority==='P2').slice(0,6)).slice(0,12),
    officialStudioScenarios:scenarios,officialStudioHarnessRequired:true,
    externalGuiAutomationForbidden:true,robloxPlayerAutomationForbidden:true,
    sourceOnlyCannotSatisfyF0F9OrPlaybot:true,
    instructions:{
      scope:'EXISTING_BUILD_UP_ONLY_NO_NEW_PIPELINE',
      sourceMutation:'APPLY_TO_APPROVED_RESPONSIBLE_GAME_SOURCE_NOT_THIS_PLAN',
      preserve:['GAME_IDENTITY','APPROVED_BALANCE','ECONOMY','SAVE_KEYS','SERVER_AUTHORITY','F0_F9_SEQUENCE'],
      assetRights:'EXISTING_VERIFIED_LICENSE_AND_SOURCE_HASH_REQUIRED_FOR_NEW_USE',
      replaceRule:'NO_RANDOM_SWAP_NO_FAKE_ASSET_ID_NO_PLACEHOLDER_NO_ASSET_COUNT_AS_QUALITY',
      nextAction:'REPAIR_P0_OBSERVED_DEFECTS_THEN_APPROVED_GAME_SPECIFIC_P1_THEN_VERIFIED_P2',
      regressions:'RERUN_EXISTING_COMPILE_STATIC_QA_CLOUD_EXACT_ARTIFACT_AND_STUDIO_WHEN_AVAILABLE',
      noFalseClaims:'STATIC_SOURCE_OR_THUMBNAIL_NEVER_EVIDENCE_OF_REAL_MOTION_TOUCH_SCREEN_OR_GAMEPLAY',
      missingStudio:'UNVERIFIED_DO_NOT_PROMOTE_AS_ACTUAL_PLAY'
    }
  });
}
export function robloxHolisticQualityPromptLines(plan={},maxFamilies=10){
  if(!plan?.gameId)return [];
  const top=(plan.priorityWork||[]).slice(0,Math.max(1,Math.min(16,Number(maxFamilies)||10)));
  const states=(plan.motion?.states||[]).filter(row=>row.sourceMentioned!==true).map(row=>row.id);
  return [
    'ROBLOX_HOLISTIC_QUALITY_BUILD_UP: game='+plan.gameId+' sourceTree='+plan.sourceTreeFingerprint+' scanComplete='+plan.scan?.complete+' assets='+plan.scan?.assetCount+' sourceOnly=true',
    'QUALITY_FAMILY_REPAIR_TARGETS: '+top.map(row=>row.id+'['+row.priority+']:'+row.improvement+' @ '+(row.sourceFiles?.join('|')||'LOCATE_OWNING_SOURCE')).join(' ; '),
    'MOTION_ACTION_BUILD_UP: cover Animator/Motor6D/Bone idle-walk-run-start-stop-turn-jump-land, anticipation-impact-recovery, hit-death-respawn; bind every transition to input, server state, VFX/SFX and observed hit; candidate missing source tokens='+states.join('|')+'; tokens are not proof.',
    'FIVE_OFFICIAL_STUDIO_SCENARIOS: '+(plan.officialStudioScenarios||[]).map(row=>row.id+'='+row.status).join('|')+'; Studio unavailable => PENDING, NEVER PASS; virtual touch != physical mobile touch.',
    'QUALITY_PROOF_RULE: source edits and asset files are proposals; require verified licenses/hashes, source-specific QA, exact build engine evidence and real Studio rendered/action evidence for claims. Do not modify approved saves, economy, combat values or server authority.'
  ];
}
function main(){
  const arg=key=>process.argv.find(row=>row.startsWith('--'+key+'='))?.slice(key.length+3)||'';
  const root=arg('root')||process.cwd(),gameId=arg('game-id');
  const plan=buildRobloxHolisticQualityPlan({repoRoot:root,gameId,sourceRoot:arg('source-root')});
  const out=arg('output');
  if(out){fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(out,JSON.stringify(plan,null,2)+'\n');}
  console.log('ROBLOX_HOLISTIC_QUALITY_GAME='+plan.gameId);
  console.log('ROBLOX_HOLISTIC_QUALITY_SOURCE_SCOPE='+plan.sourceRoot);
  console.log('ROBLOX_HOLISTIC_QUALITY_ASSETS='+plan.scan.assetCount);
  console.log('ROBLOX_HOLISTIC_QUALITY_P0='+plan.issues.length);
  console.log('ROBLOX_HOLISTIC_STUDIO_SCENARIOS=0/5_PENDING_REAL_STUDIO');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main();
