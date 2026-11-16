// 파일명: tools/company-roblox-holistic-quality-buildup.mjs
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
// [자동 개선 판단] BUILD_UP의 승인 설계 GAP 명칭과 실제 Roblox 책임 영역을 직접 연결한다.
// 단어 출현만으로 기능 결함이나 수정 완료를 인정하지 않는다.
const QUALITY_DOMAIN_BY_FAMILY=Object.freeze({
  SERVER_AUTHORITY:['SYSTEM_CONNECTION','ECONOMY','REWARDS'],
  SOURCE_STABILITY:['RUNTIME_STABILITY','ERROR_RECOVERY'],
  SAVE_RECOVERY:['SAVE_AND_RECOVERY','SAVE_COMPLETENESS','RECONNECT_RECOVERY'],
  MULTIPLAYER_SYNC:['MULTIPLAYER_AND_SYNC'],
  WORLD_TERRAIN:['TERRAIN','WORLD_MAP_TOPOLOGY','WORLD_NAVIGATION'],
  REGIONS_LANDMARKS:['REGIONS','MAP_EXPANSION','WORLD_DENSITY','LANDMARKS','CONTENT_DISCOVERY'],
  ENVIRONMENT_FOLIAGE:['ENVIRONMENT','ENVIRONMENTAL_MOTION'],
  BUILDINGS_PROPS:['BUILDINGS_AND_PROPS','INTERACTION_DISCOVERABILITY'],
  CHARACTERS_RIGS:['CHARACTER_VISUALS','PLAYER_ACTIONS'],
  MONSTERS_NPCS:['ENEMY_VISUALS','ENEMY_AI','NPC_SOCIAL_BEHAVIOR','SPAWN_ENCOUNTER_DIRECTOR'],
  WEAPONS_EQUIPMENT:['WEAPONS_AND_EQUIPMENT','EQUIPMENT_LOADOUT'],
  ITEMS_LOOT:['INVENTORY','INVENTORY_USABILITY','REWARDS','CONTENT_VARIETY'],
  MATERIALS_TEXTURES:['MATERIALS','PALETTE'],
  ICONS_IMAGES:['UI_DESIGN_SYSTEM','FEEDBACK_CLARITY'],
  UI_HUD_MENUS:['UI_HUD','MENU_FLOW','UI_INFORMATION_PRIORITY','FIRST_10_MINUTES','TUTORIAL_ONBOARDING'],
  MOBILE_TOUCH:['MOBILE_UX','INPUT','CONVENIENCE'],
  ANIMATION_MOTION:['ANIMATION','SECONDARY_MOTION','GAME_FEEL'],
  ACTION_IMPACT:['CORE_FUN','COMBAT_OR_PRIMARY_INTERACTION','PLAYER_AGENCY','AUDIO_VISUAL_TIMING'],
  ACTION_TRAVERSAL:['TRAVERSAL','PLAYER_ACTIONS'],
  VFX_PARTICLES:['VFX','AUDIO_VISUAL_TIMING'],
  LIGHTING_SKY:['LIGHTING'],
  CAMERA_COMPOSITION:['CAMERA'],
  AUDIO_BGM:['AUDIO_MUSIC_SFX'],
  AUDIO_SFX:['AUDIO_MUSIC_SFX','FEEDBACK_CLARITY'],
  PERFORMANCE_BUDGET:['PERFORMANCE','PERFORMANCE_BUDGET'],
  COMBAT_BALANCE:['DIFFICULTY_PACING','ANTI_GRIND'],
  AI_NAVIGATION:['ENEMY_AI','BOSS_AND_SIGNATURE_MOMENTS'],
  QUEST_PROGRESSION:['PROGRESSION','GOALS','UNLOCKS','QUESTS','MID_LATE_GAME_DEPTH','NARRATIVE_STORY','REPLAYABILITY_VARIATION','SESSION_FLOW'],
  CRAFTING_ECONOMY:['CRAFTING','ECONOMY','SYSTEM_CONNECTION'],
  SPAWN_RESPAWN:['FAILURE_RESPAWN_CHECKPOINTS','SESSION_FLOW'],
  ACCESSIBILITY:['ACCESSIBILITY','SETTINGS_ACCESSIBILITY','UI_DESIGN_SYSTEM'],
  PROMOTIONAL_MEDIA:[]
});
const QUALITY_PLAYER_IMPACT_ORDER=Object.freeze([
  'SOURCE_STABILITY','SERVER_AUTHORITY','SAVE_RECOVERY','SPAWN_RESPAWN','MOBILE_TOUCH',
  'UI_HUD_MENUS','ACTION_IMPACT','QUEST_PROGRESSION','MULTIPLAYER_SYNC','PERFORMANCE_BUDGET',
  'MONSTERS_NPCS','AI_NAVIGATION','ACTION_TRAVERSAL','CHARACTERS_RIGS','WEAPONS_EQUIPMENT',
  'ITEMS_LOOT','CRAFTING_ECONOMY','REGIONS_LANDMARKS','WORLD_TERRAIN','ANIMATION_MOTION',
  'ACCESSIBILITY','BUILDINGS_PROPS','MATERIALS_TEXTURES','ICONS_IMAGES','AUDIO_SFX',
  'LIGHTING_SKY','CAMERA_COMPOSITION','VFX_PARTICLES','AUDIO_BGM','ENVIRONMENT_FOLIAGE',
  'COMBAT_BALANCE','PROMOTIONAL_MEDIA'
]);
const playerImpactRank=id=>{const index=QUALITY_PLAYER_IMPACT_ORDER.indexOf(id);return index<0?999:index;};
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

// Detailed checks are test specifications, not executions or automatic quality credits.
// Every check binds a concrete acceptance condition to its authorized observation environment.
const DETAIL_ROWS=String.raw`
RIG_ROOT_CHAIN|CHARACTERS_RIGS|STUDIO_ACTUAL|motor6d,bone,rig|Verify each playable actor root and connected body joints exist at play start
RIG_JOINT_BIND|CHARACTERS_RIGS|STUDIO_ACTUAL|motor6d,joint,rig|Verify limb joints remain attached through movement and attacks
RIG_ATTACHMENT_ALIGN|CHARACTERS_RIGS|STUDIO_ACTUAL|attachment,rig|Verify equipped props and effect anchors follow correct joint transforms
RIG_HUMANOID_PROPORTIONS|CHARACTERS_RIGS|STUDIO_ACTUAL|humanoid,scale|Verify actor proportions and collision bounds remain consistent in poses
RIG_SKIN_WEIGHTS|CHARACTERS_RIGS|STUDIO_ACTUAL|skin,bone,mesh|Verify animated mesh deformation does not tear or collapse
RIG_VERTEX_NORMALS|CHARACTERS_RIGS|STUDIO_ACTUAL|mesh,normals|Verify moving surfaces show continuous normals without inverted shading
RIG_EQUIPMENT_GRIP|WEAPONS_EQUIPMENT|STUDIO_ACTUAL|tool,grip,equip|Verify weapon or tool follows grip through idle and attack
RIG_NPC_VARIANT_COMPAT|MONSTERS_NPCS|STUDIO_ACTUAL|npc,rig,creature|Verify each existing actor species keeps valid animation and hitbox alignment
MOTION_IDLE_LOOP|ANIMATION_MOTION|STUDIO_ACTUAL|idle,animation|Verify idle pose loops seamlessly without bone snapping
MOTION_IDLE_VARIATION|ANIMATION_MOTION|STUDIO_ACTUAL|idle,animator|Verify authored idle variants do not interrupt core actions
MOTION_WALK_CYCLE|ANIMATION_MOTION|STUDIO_ACTUAL|walk,animation|Verify walk stride and actual movement speed are visually synchronized
MOTION_RUN_CYCLE|ANIMATION_MOTION|STUDIO_ACTUAL|run,animation|Verify run speed and leg cadence synchronize without sliding
MOTION_JOG_BLEND|ANIMATION_MOTION|STUDIO_ACTUAL|jog,run,walk|Verify walk-to-jog-to-run transitions blend without pose resets
MOTION_START_ACCEL|ANIMATION_MOTION|STUDIO_ACTUAL|start,accelerat|Verify start animation precedes sustained locomotion
MOTION_STOP_DECEL|ANIMATION_MOTION|STUDIO_ACTUAL|stop,decelerat|Verify stopping motion settles without sliding or teleporting
MOTION_TURN_IDLE|ANIMATION_MOTION|STUDIO_ACTUAL|turn,animation|Verify turning in place rotates body and feet coherently
MOTION_PIVOT_MOVE|ANIMATION_MOTION|STUDIO_ACTUAL|pivot,turn|Verify direction reversal blends and does not twist limbs
MOTION_JUMP_TAKEOFF|ANIMATION_MOTION|STUDIO_ACTUAL|jump,animation|Verify jump anticipation and takeoff synchronize with vertical velocity
MOTION_FALL_POSE|ANIMATION_MOTION|STUDIO_ACTUAL|fall,animation|Verify airborne fall state begins after upward motion ends
MOTION_LAND_CONTACT|ANIMATION_MOTION|STUDIO_ACTUAL|land,animation|Verify landing pose and sound align with collision contact
MOTION_SLOPE_ADAPT|ANIMATION_MOTION|STUDIO_ACTUAL|slope,terrain,foot|Verify character footing remains stable on approved terrain inclines
MOTION_FOOT_PLANT|ANIMATION_MOTION|STUDIO_ACTUAL|foot,ik,animation|Verify grounded feet do not visibly skate
MOTION_ROOT_TRANSLATION|ANIMATION_MOTION|STUDIO_ACTUAL|root,humanoid,animation|Verify visible motion is joint-based rather than only whole-model CFrame motion
MOTION_LOOP_EXIT|ANIMATION_MOTION|STUDIO_ACTUAL|animation,loop|Verify active loops exit on death, hit and ability transitions
MOTION_LAYER_PRIORITY|ANIMATION_MOTION|STUDIO_ACTUAL|priority,animationtrack|Verify attack and reaction tracks override locomotion at expected priority
MOTION_BLEND_WEIGHTS|ANIMATION_MOTION|STUDIO_ACTUAL|weight,animation,blend|Verify blended tracks do not cancel or freeze pose
MOTION_ATTACK_ANTICIPATION|ANIMATION_MOTION|STUDIO_ACTUAL|anticipation,windup|Verify visible windup begins before authoritative impact
MOTION_ATTACK_IMPACT|ANIMATION_MOTION|STUDIO_ACTUAL|attack,impact,hitbox|Verify attack contact pose coincides with authoritative hit
MOTION_ATTACK_RECOVERY|ANIMATION_MOTION|STUDIO_ACTUAL|attack,recovery|Verify recovery returns cleanly to appropriate locomotion
MOTION_HIT_REACTION|ANIMATION_MOTION|STUDIO_ACTUAL|hitreaction,stagger|Verify actual damage triggers correct hit reaction once
MOTION_HIT_DIRECTION|ANIMATION_MOTION|STUDIO_ACTUAL|hit,direction|Verify front or side hit response matches damage direction when designed
MOTION_DEATH|ANIMATION_MOTION|STUDIO_ACTUAL|death,died|Verify death state disables incompatible actions and plays correctly
MOTION_RESPAWN|ANIMATION_MOTION|STUDIO_ACTUAL|respawn,spawn|Verify respawn restores a playable animated rig and camera
MOTION_CREATURE_GAIT|MONSTERS_NPCS|STUDIO_ACTUAL|creature,monster,walk|Verify species gait uses grounded leg motion instead of rigid sliding
MOTION_CREATURE_ATTACK|MONSTERS_NPCS|STUDIO_ACTUAL|creature,monster,attack|Verify creature-specific attack poses match collision events
MOTION_SECONDARY_CLOTH|ANIMATION_MOTION|STUDIO_ACTUAL|secondary,cloth,bone|Verify secondary motion responds to turns without clipping
MOTION_EQUIPMENT_HOLD|WEAPONS_EQUIPMENT|STUDIO_ACTUAL|tool,equip,animation|Verify tool draw, hold and stow poses align with attachment
MOTION_ACTION_INTERRUPT|ANIMATION_MOTION|STUDIO_ACTUAL|interrupt,stun,animation|Verify interruption releases tracks and restores valid state
ACTION_INPUT_GATE|ACTION_IMPACT|STUDIO_ACTUAL|attack,input,activated|Verify attack starts only from authorized player input
ACTION_BUTTON_FEEDBACK|ACTION_IMPACT|STUDIO_ACTUAL|attack,button,hud|Verify action button visually responds and produces authoritative action
ACTION_WINDUP_WINDOW|ACTION_IMPACT|STUDIO_ACTUAL|windup,attack|Verify telegraph delay matches approved attack timing
ACTION_ACTIVE_HITBOX|ACTION_IMPACT|STUDIO_ACTUAL|hitbox,overlap|Verify hitbox is active only during approved impact interval
ACTION_HURTBOX_ALIGNMENT|ACTION_IMPACT|STUDIO_ACTUAL|hurtbox,humanoid|Verify hit target volumes follow animated rig
ACTION_DAMAGE_AUTHORITY|SERVER_AUTHORITY|SERVER_CLOUD_EXACT|damage,remote,server|Verify server calculates and clamps actual damage
ACTION_HIT_DUPLICATION|ACTION_IMPACT|SERVER_CLOUD_EXACT|hit,debounce|Verify one contact does not trigger duplicate damage or reward
ACTION_HIT_RANGE|ACTION_IMPACT|SERVER_CLOUD_EXACT|range,distance,attack|Verify out-of-range targets cannot be damaged
ACTION_HIT_LINE_OF_SIGHT|ACTION_IMPACT|SERVER_CLOUD_EXACT|raycast,attack|Verify walls block attacks where design requires line of sight
ACTION_HIT_REACTION_BIND|ACTION_IMPACT|STUDIO_ACTUAL|attack,hit,reaction|Verify visible reaction corresponds to server-confirmed hit
ACTION_RECOVERY_LOCK|ACTION_IMPACT|STUDIO_ACTUAL|recovery,attack,cooldown|Verify actions cannot bypass approved recovery frame
ACTION_COMBO_CHAIN|ACTION_IMPACT|STUDIO_ACTUAL|combo,attack|Verify approved sequence advances and resets at correct input windows
ACTION_COMBO_CANCEL|ACTION_IMPACT|STUDIO_ACTUAL|cancel,combo|Verify legal cancellation transitions and illegal cancels are rejected
ACTION_HEAVY_CHARGE|ACTION_IMPACT|STUDIO_ACTUAL|charge,heavy|Verify charge release maps to approved windup and damage
ACTION_SKILL_COOLDOWN|COMBAT_BALANCE|SERVER_CLOUD_EXACT|skill,cooldown|Verify rapid input never shortens authoritative cooldown
ACTION_STAMINA_COST|COMBAT_BALANCE|SERVER_CLOUD_EXACT|stamina,dash,attack|Verify stamina change matches approved action cost
ACTION_BLOCK_GUARD|ACTION_IMPACT|STUDIO_ACTUAL|block,guard|Verify correct block pose and approved damage mitigation
ACTION_PARRY_WINDOW|ACTION_IMPACT|STUDIO_ACTUAL|parry,guard|Verify timing window matches authoritative parry result
ACTION_DODGE_INVULN|ACTION_IMPACT|SERVER_CLOUD_EXACT|dodge,invulner|Verify only authorized dodge frames prevent hit
ACTION_DASH_DISTANCE|ACTION_TRAVERSAL|STUDIO_ACTUAL|dash,velocity|Verify actual dash distance and collision respect approved bounds
ACTION_JUMP_CONTROL|ACTION_TRAVERSAL|STUDIO_ACTUAL|jump,humanoid|Verify airborne steering and jumps obey existing game design
ACTION_CLIMB_TRANSITION|ACTION_TRAVERSAL|STUDIO_ACTUAL|climb,ladder|Verify climb input and animation transition at legitimate surfaces
ACTION_SWIM_STATE|ACTION_TRAVERSAL|STUDIO_ACTUAL|swim,water|Verify swim state and input agree with existing water rules
ACTION_INTERACT_DISTANCE|ACTION_TRAVERSAL|SERVER_CLOUD_EXACT|proximityprompt,interact|Verify interactions reject impossible distance
ACTION_ITEM_PICKUP|ITEMS_LOOT|SERVER_CLOUD_EXACT|pickup,collect|Verify authorized pickup changes authoritative inventory once
ACTION_EQUIP_SWITCH|WEAPONS_EQUIPMENT|STUDIO_ACTUAL|equip,switch,tool|Verify model and active weapon state change together
ACTION_RELOAD_TIMING|WEAPONS_EQUIPMENT|STUDIO_ACTUAL|reload,ammo|Verify reload motion follows authoritative ammo state
ACTION_PROJECTILE_ORIGIN|ACTION_IMPACT|STUDIO_ACTUAL|projectile,muzzle|Verify projectile emerges from visible muzzle at firing moment
ACTION_PROJECTILE_COLLISION|ACTION_IMPACT|SERVER_CLOUD_EXACT|projectile,collision|Verify server impact uses legitimate hit surface
ACTION_MULTI_TARGET|ACTION_IMPACT|SERVER_CLOUD_EXACT|area,aoe,multi|Verify multi-target cap and target filter match approved rules
ACTION_TARGET_SELECTION|AI_NAVIGATION|STUDIO_ACTUAL|target,enemy,aggro|Verify nearest or highest-priority target selection as designed
ACTION_ENEMY_TELEGRAPH|MONSTERS_NPCS|STUDIO_ACTUAL|enemy,telegraph,attack|Verify player has approved reaction opportunity before impact
ACTION_BOSS_PHASE|MONSTERS_NPCS|STUDIO_ACTUAL|boss,phase|Verify phase transition changes actual attack logic and presentation
ACTION_KNOCKBACK_VECTOR|ACTION_IMPACT|STUDIO_ACTUAL|knockback,velocity|Verify knockback follows approved direction and collision
ACTION_HITSTOP_TIMING|ACTION_IMPACT|STUDIO_ACTUAL|hitstop,hit|Verify hit-stop only follows a real confirmed impact
ACTION_ATTACK_VFX_SYNC|VFX_PARTICLES|STUDIO_ACTUAL|attack,vfx,effect|Verify visual hit effect is timed to authoritative impact
ACTION_ATTACK_SFX_SYNC|AUDIO_SFX|STUDIO_ACTUAL|attack,sound,sfx|Verify hit and swing sounds correspond to actual action phases
ACTION_CAMERA_RECOIL|CAMERA_COMPOSITION|STUDIO_ACTUAL|camera,recoil,shake|Verify feedback does not block view or repeat without hit
ACTION_RESYNC_LAG|MULTIPLAYER_SYNC|STUDIO_ACTUAL|replication,attack,remote|Verify server action outcomes converge between clients
ACTION_INPUT_SPAM|SERVER_AUTHORITY|SERVER_CLOUD_EXACT|remote,input,attack|Verify invalid repeated requests are rejected without state corruption
MODEL_TOPOLOGY_VALID|BUILDINGS_PROPS|ASSET_BYTES|mesh,glb,obj|Verify sourced geometry parses with no invalid faces
MODEL_UV_NON_OVERLAP|MATERIALS_TEXTURES|STUDIO_ACTUAL|uv,texture,mesh|Verify texture orientation and unintended UV overlaps visually
MODEL_NORMAL_ORIENTATION|MATERIALS_TEXTURES|STUDIO_ACTUAL|normals,mesh|Verify faces shade outward without inverted materials
MODEL_SILHOUETTE_DISTINCT|CHARACTERS_RIGS|STUDIO_ACTUAL|character,mesh|Verify player silhouette remains distinct from monsters and NPCs
MODEL_SCALE_COLLISION|BUILDINGS_PROPS|STUDIO_ACTUAL|building,collision|Verify visible prop size matches collidable bounds
MODEL_PIVOT_PLACEMENT|BUILDINGS_PROPS|STUDIO_ACTUAL|pivot,model|Verify model pivots support correct door and prop behavior
MODEL_LOD_FALLBACK|PERFORMANCE_BUDGET|STUDIO_ACTUAL|lod,streaming|Verify distance simplification preserves readable silhouettes
TEXTURE_RESOLUTION_BUDGET|MATERIALS_TEXTURES|ASSET_BYTES|texture,png,webp|Verify recorded texture size within approved device budget
TEXTURE_MIP_READABILITY|MATERIALS_TEXTURES|STUDIO_ACTUAL|texture,mip|Verify distant surfaces do not shimmer excessively
MATERIAL_BIOME_PALETTE|MATERIALS_TEXTURES|STUDIO_ACTUAL|material,biome|Verify approved region palettes distinguish materials without seams
ENVIRONMENT_DENSITY|ENVIRONMENT_FOLIAGE|STUDIO_ACTUAL|tree,foliage,forest|Verify forest and prop density remain playable and within performance budget
ENVIRONMENT_LIGHT_DAY|LIGHTING_SKY|STUDIO_ACTUAL|lighting,day|Verify day lighting makes walkable terrain and threats visible
ENVIRONMENT_LIGHT_NIGHT|LIGHTING_SKY|STUDIO_ACTUAL|lighting,night|Verify night scene balances authored darkness and gameplay readability
WORLD_SPAWN_SUPPORT|WORLD_TERRAIN|SERVER_CLOUD_EXACT|spawn,terrain,ground|Verify character spawn has existing collidable ground beneath it
WORLD_GOAL_REACHABLE|REGIONS_LANDMARKS|SERVER_CLOUD_EXACT|goal,zone,path|Verify required locations are connected by walkable world paths
WORLD_REGION_UNIQUENESS|REGIONS_LANDMARKS|STUDIO_ACTUAL|region,biome,landmark|Verify regions have distinct accessible landmarks rather than duplicated names
WORLD_INTERACTABLE_APPROACH|BUILDINGS_PROPS|STUDIO_ACTUAL|proximityprompt,door,lever|Verify player can approach and activate required world interactions
UI_TOUCH_TARGET_BOUNDS|UI_HUD_MENUS|STUDIO_ACTUAL|touch,button,guisize|Verify interactive targets meet approved minimum size in simulated mobile viewport
UI_SAFE_AREA_CLIP|MOBILE_TOUCH|STUDIO_ACTUAL|safearea,gui,viewport|Verify essential UI stays within simulated screen safe-area
UI_RESOLUTION_SCALING|UI_HUD_MENUS|STUDIO_ACTUAL|uiscale,viewport|Verify UI remains readable across authorized viewport sizes
UI_MODAL_EXIT|UI_HUD_MENUS|STUDIO_ACTUAL|modal,close,menu|Verify modal closes without trapping gameplay input
UI_TOUCH_ACTION_LINK|MOBILE_TOUCH|STUDIO_ACTUAL|touch,activated,attack|Verify simulated touch dispatch changes correct action state
UI_REAL_DEVICE_TOUCH|MOBILE_TOUCH|DEVICE_ACTUAL|touch,joystick|Verify real touchscreen action is recognized on actual supported hardware
UI_INVENTORY_SELECTION|UI_HUD_MENUS|STUDIO_ACTUAL|inventory,equip,slot|Verify equipped item and selected slot agree after click
UI_DAMAGE_FEEDBACK|UI_HUD_MENUS|STUDIO_ACTUAL|health,damage,hud|Verify health bar and damage popup match actual authoritative damage
UI_ACCESSIBILITY_CONTRAST|ACCESSIBILITY|STUDIO_ACTUAL|contrast,ui,text|Verify text and actionable controls have readable contrast
UI_CAMERA_OCCLUSION|CAMERA_COMPOSITION|STUDIO_ACTUAL|camera,occlusion|Verify player and threats remain visible near buildings
UI_GAMEPAD_KEYBOARD|MOBILE_TOUCH|STUDIO_ACTUAL|input,keycode,contextactionservice|Verify configured alternate inputs do not conflict with touch UI
AUDIO_BGM_TRANSITIONS|AUDIO_BGM|STUDIO_ACTUAL|music,bgm,soundgroup|Verify region or combat BGM transitions without overlapping tracks
AUDIO_SFX_ONCE|AUDIO_SFX|STUDIO_ACTUAL|sound,sfx,hit|Verify one sound is emitted for a single verified gameplay event
AUDIO_SPATIAL_ROLLOFF|AUDIO_SFX|STUDIO_ACTUAL|rolloff,sound|Verify positional sound attenuates with listener distance
AUDIO_MUTE_PERSIST|AUDIO_BGM|STUDIO_ACTUAL|volume,mute,settings|Verify authorized mute setting survives screen transitions
VFX_PARTICLE_BUDGET|VFX_PARTICLES|STUDIO_ACTUAL|particle,emitter,vfx|Verify effects do not exceed device particle lifetime budgets
VFX_IMPACT_POSITION|VFX_PARTICLES|STUDIO_ACTUAL|vfx,hit,impact|Verify hit effect appears at confirmed impact location
VFX_ENVIRONMENT_WEATHER|VFX_PARTICLES|STUDIO_ACTUAL|weather,rain,particle|Verify weather visuals preserve visibility and cleanup
SAVE_REJOIN_ROUNDTRIP|SAVE_RECOVERY|STUDIO_ACTUAL|datastore,save,rejoin|Verify approved inventory and progression survive genuine rejoin
NETWORK_REMOTE_SANITY|SERVER_AUTHORITY|SERVER_CLOUD_EXACT|remoteevent,server|Verify hostile client payload cannot mint rewards or bypass checks
NETWORK_TWO_CLIENT_STATE|MULTIPLAYER_SYNC|STUDIO_ACTUAL|playeradded,replicated,remote|Verify two Studio clients observe consistent shared state
PERF_INSTANCE_BUDGET|PERFORMANCE_BUDGET|STUDIO_ACTUAL|instance,streaming,pool|Verify object counts and lifetimes remain within authorized target
PERF_FRAME_DURATION|PERFORMANCE_BUDGET|STUDIO_ACTUAL|renderstepped,performance|Verify observed per-frame time stays under approved target budget
PERF_MEMORY_GROWTH|PERFORMANCE_BUDGET|STUDIO_ACTUAL|memory,cleanup,disconnect|Verify repeated play does not grow live resources without bound
CONTENT_QUEST_REWARD|QUEST_PROGRESSION|SERVER_CLOUD_EXACT|quest,reward,complete|Verify quests grant intended rewards exactly once
CONTENT_CRAFT_RECIPE|CRAFTING_ECONOMY|SERVER_CLOUD_EXACT|craft,recipe,inventory|Verify recipes consume approved input amounts and produce correct output
CONTENT_PRICE_STABILITY|CRAFTING_ECONOMY|SERVER_CLOUD_EXACT|shop,price,currency|Verify purchase and refunds preserve approved economic rules
CONTENT_MONSTER_BEHAVIOR|MONSTERS_NPCS|STUDIO_ACTUAL|monster,ai,attack|Verify newly introduced monster has distinct active attack and navigation
CONTENT_RESOURCE_RESPAWN|ITEMS_LOOT|SERVER_CLOUD_EXACT|ore,resource,respawn|Verify resource spawn and depletion obey design
CONTENT_PROGRESS_UNLOCK|QUEST_PROGRESSION|SERVER_CLOUD_EXACT|unlock,level,progress|Verify area and ability unlock depend on approved progression
`.trim().split('\n').map(line=>line.trim().split('|'));
const VERIFICATION_METHODS=new Set(['ASSET_BYTES','SOURCE_STATIC','SERVER_CLOUD_EXACT','STUDIO_ACTUAL','DEVICE_ACTUAL']);
export const ROBLOX_DETAILED_QUALITY_CHECKS=Object.freeze(DETAIL_ROWS.map(([id,family,verificationMethod,signals,acceptance])=>{
  if(!id||!ROBLOX_QUALITY_FAMILIES.some(row=>row.id===family)||!VERIFICATION_METHODS.has(verificationMethod)||!signals||!acceptance)
    throw new Error('ROBLOX_DETAILED_QUALITY_CONTRACT_INVALID:'+id);
  return Object.freeze({
    id,family,verificationMethod,sourceSignals:Object.freeze(signals.split(',').map(clean)),
    acceptance,feedback:'When measured acceptance fails, repair its existing responsible source or sourced asset and rerun the same exact check.',
    actualPlayerPlayRequired:verificationMethod==='STUDIO_ACTUAL',
    realDeviceTouchRequired:verificationMethod==='DEVICE_ACTUAL'
  });
}));
if(new Set(ROBLOX_DETAILED_QUALITY_CHECKS.map(row=>row.id)).size!==ROBLOX_DETAILED_QUALITY_CHECKS.length)
  throw new Error('ROBLOX_DETAILED_QUALITY_DUPLICATE_ID');

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
// Audit every shared library record, but select only game-relevant examples for a compact build-up directive.
// Metadata is never license verification, and downloaded/exists are never runtime-quality proof.
let libraryCache=null;
function readSharedLibrary(repo){
  const file=path.join(repo,'company-asset-library.json');
  if(!fs.existsSync(file))return {status:'NOT_AVAILABLE',rows:[]};
  const stat=fs.statSync(file),key=file+':'+stat.mtimeMs+':'+stat.size;
  if(libraryCache?.key===key)return libraryCache.value;
  let value;
  try{
    const doc=JSON.parse(fs.readFileSync(file,'utf8'));
    value={status:'METADATA_LOADED_NOT_RUNTIME_VERIFIED',rows:Array.isArray(doc.assets)?doc.assets:[]};
  }catch{value={status:'INVALID_LIBRARY_METADATA',rows:[]};}
  libraryCache={key,value};
  return value;
}
function libraryCoverage(repo,gameId,refs){
  const library=readSharedLibrary(repo),referenced=new Set(refs.map(row=>row.path));
  const counters={total:library.rows.length,recordedCc0:0,hashRecorded:0,localFilesPresent:0,
    localFilesMissing:0,ownershipOrLicenseMetadataGaps:0,gameRelevant:0,unverifiedRuntime:library.rows.length};
  const selected=[];
  for(const row of library.rows){
    const rel=norm(row?.path),full=path.resolve(repo,rel);
    const fileSafe=Boolean(rel)&&!path.isAbsolute(rel)&&full.startsWith(repo+path.sep);
    const exists=fileSafe&&fs.existsSync(full)&&fs.statSync(full).isFile();
    const cc0=/^(?:CC0(?:-1\.0)?|CC0 1\.0 Universal)$/i.test(clean(row?.license));
    const hash=/^[0-9a-f]{64}$/i.test(clean(row?.sourceHash));
    const relevant=clean(row?.targetGame)===gameId
      ||(Array.isArray(row?.targetGames)&&row.targetGames.includes(gameId))
      ||referenced.has(rel)
      ||(rel&&refs.some(x=>x.path.endsWith('/'+path.basename(rel))));
    if(cc0)counters.recordedCc0++;
    if(hash)counters.hashRecorded++;
    if(exists)counters.localFilesPresent++;else counters.localFilesMissing++;
    if(!cc0||!hash||!fileSafe)counters.ownershipOrLicenseMetadataGaps++;
    if(relevant){
      counters.gameRelevant++;
      if(selected.length<64)selected.push({
        id:clean(row.id),path:rel,recordedLicense:clean(row.license)||'UNKNOWN',
        localExists:exists,sourceHashRecorded:hash,licenseMetadataOnly:true,
        actualQualityVerified:false,sourceUsageNeedsReview:true
      });
    }
  }
  return {status:library.status,coverage:counters,examples:selected,
    licenseEvidenceVerified:false,assetRuntimeVerified:false,
    allAssetsConsidered:library.status==='METADATA_LOADED_NOT_RUNTIME_VERIFIED',
    improvementRule:'Verify full provenance, exact source integrity, visual/functionality and actual game binding before promotion.'};
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
  previousPlan=null,runtimeEvidence={},sourceRevision='',repairRequested=false,responsibleFiles=[]
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
      const sourceHash=digest(bytes);
      hashes.push(relative+':'+sourceHash);
      assets.push({path:relative,bytes:bytes.length,sha256:'sha256:'+sourceHash,
        familyCandidate:assetMap[row.ext],integrity:integrity(relative,bytes),
        rightsVerified:false,visualVerified:false,runtimeVerified:false});
    }
  }
  const combined=texts.map(row=>row.text.toLowerCase()).join('\n');
  // [파일 소유권] 모든 자동 수정 후보는 같은 게임의 실제 정규 경로여야 한다.
  // 심볼릭 링크, 상위 디렉터리 이동, 타 게임/공통 정책 파일은 작업 범위로 승격하지 않는다.
  const safeOwner=file=>{
    const candidate=norm(file);
    if(!scope.root||!candidate.startsWith(scope.relative+'/'))return '';
    const full=path.resolve(scope.repo,candidate);
    try{
      const actual=fs.realpathSync(full);
      if(!actual.startsWith(scope.root+path.sep)||!fs.statSync(actual).isFile())return '';
      if(!/\.(?:lua|luau)$/i.test(candidate))return '';
      return norm(path.relative(scope.repo,actual));
    }catch{return '';}
  };
  const observedFiles=unique((sourceObservation?.topFiles||[]).map(row=>safeOwner(row?.file)).filter(Boolean));
  const authorizedOwners=unique((Array.isArray(responsibleFiles)?responsibleFiles:[])
    .map(safeOwner).filter(Boolean));
  const known=unique([...scan.files.map(row=>norm(path.relative(scope.repo,row.file))),...observedFiles,...authorizedOwners]);
  const gaps=new Set((Array.isArray(qualityGaps)?qualityGaps:[]).map(row=>clean(row?.domain||row).toUpperCase()));
  const refs=assetRefs(texts,scope.repo);
  const broken=assets.filter(row=>row.integrity.startsWith('INVALID'));
  const missing=refs.filter(row=>!row.exists);
  // [아이템 자산 자동 진단] 실제 선언된 교역품과 등록 이미지/실물 Cargo 모델 연결을 비교한다.
  // 모델의 의미/권한을 증명하지 않은 임의 매칭과 규제 이미지 재업로드는 자동 실행 대상이 아니다.
  // 이 소스 형태가 없는 다른 게임에서는 진단을 추측하지 않고 기존 범용 품질 점검을 그대로 사용한다.
  let itemAssetCoverage={status:'NOT_APPLICABLE_UNRECOGNIZED_ITEM_SCHEMA',declared:0,covered:0,missing:[],needsVisualReview:true,runtimeVerified:false};
  const itemRegistry=texts.find(row=>row.file===scope.relative+'/assets-registered.json');
  const itemSource=texts.find(row=>/\blocal Goods\s*:[^\n]*=\s*\{/.test(row.text));
  const itemUI=texts.find(row=>/\blocal GOOD_ICON\s*=\s*\{\}/.test(row.text));
  if(itemRegistry&&itemSource&&itemUI){
    let registry;
    try{registry=JSON.parse(itemRegistry.text).assets;}catch{registry=null;}
    const declaredBlock=/\blocal Goods\s*:[^\n]*=\s*\{([\s\S]*?)\n\}/.exec(itemSource.text);
    if(registry&&typeof registry==='object'&&!Array.isArray(registry)&&declaredBlock){
      const declared=[...declaredBlock[1].matchAll(/^\s*([a-z][a-z0-9_]*)\s*=\s*\{\s*id\s*=\s*"([a-z][a-z0-9_]*)"/gm)]
        .filter(match=>match[1]===match[2]).map(match=>match[1]);
      const overrides=new Map();
      const mapBlock=/for id, spec in \{([\s\S]*?)\} do\s*GOOD_ICON\[id\] = spec/.exec(itemUI.text);
      if(mapBlock)for(const row of mapBlock[1].matchAll(/\b([a-z][a-z0-9_]*)\s*=\s*\{\s*"Cargo",\s*"([a-z0-9-]+)"/g))
        overrides.set(row[1],row[2]);
      const dynamicMap=/for goodsId, cargoAsset in \{([\s\S]*?)\} do\s*if AssetIds/.exec(itemUI.text);
      if(dynamicMap)for(const row of dynamicMap[1].matchAll(/\b([a-z][a-z0-9_]*)\s*=\s*"([a-z0-9-]+)"/g))
        overrides.set(row[1],row[2]);
      for(const row of itemUI.text.matchAll(/GOOD_ICON\.([a-z][a-z0-9_]*)\s*=\s*\{\s*"Cargo",\s*"([a-z0-9-]+)"/g))
        overrides.set(row[1],row[2]);
      if(declared.length&&new Set(declared).size===declared.length){
        const gaps=[],covered=[];
        for(const id of declared){
          const picture=registry['Goods/'+id],mesh=registry['Cargo/'+overrides.get(id)];
          const validPicture=picture?.assetType==='Image'&&picture.usePermissionGranted===true&&/^[1-9]\d*$/.test(String(picture.assetId));
          const validMesh=mesh?.assetType==='Model'&&mesh.usePermissionGranted===true&&/^[1-9]\d*$/.test(String(mesh.assetId));
          if(validPicture||validMesh)covered.push(id);
          else gaps.push({itemId:id,status:'MISSING_VERIFIED_IMAGE_AND_EXACT_3D_BINDING',
            sourceOwner:itemUI.file,registryOwner:itemRegistry.file,
            requiresLicensedSemanticMatch:true,
            contentSafety:'POLICY_REVIEW_REQUIRED_BEFORE_UPLOAD_OR_BIND',
            runtimeVerified:false});
        }
        itemAssetCoverage={status:'STATIC_ITEM_TO_VISUAL_BINDING_CROSSCHECK',declared:declared.length,
          covered:covered.length,missing:gaps,needsVisualReview:true,runtimeVerified:false};
      }
    }
  }
  const sharedLibrary=libraryCoverage(scope.repo,gameId,refs);
  const detailedChecks=ROBLOX_DETAILED_QUALITY_CHECKS.map(def=>({
    ...def,gameId,sourceRevision:clean(sourceRevision)||null,
    sourceCandidate:scan.complete&&def.sourceSignals.some(token=>combined.includes(token.toLowerCase())),
    applicability:'REVIEW_APPROVED_GAME_DESIGN_AND_EXISTING_SOURCE',
    executionStatus:'NOT_EXECUTED',verified:false,observedPass:false,
    evidenceReference:null,repairState:'AWAIT_ACTUAL_FAILURE_OR_APPROVED_QUALITY_GAP'
  }));
  const rows=ROBLOX_QUALITY_FAMILIES.map(def=>{
    const namedOwners=known.filter(file=>def.tokens.some(token=>file.toLowerCase().includes(token)));
    const mentioned=def.tokens.some(token=>combined.includes(token));
    const ownAssets=assets.filter(asset=>asset.familyCandidate===def.id);
    const ownRefs=refs.filter(ref=>def.tokens.some(token=>ref.path.toLowerCase().includes(token)));
    const files=unique([...ownRefs.flatMap(ref=>ref.owners),...namedOwners]).slice(0,6);
    const issues=[...ownAssets.filter(row=>row.integrity.startsWith('INVALID')).map(row=>'INVALID_ASSET_BYTES:'+row.path),
      ...ownRefs.filter(row=>!row.exists).map(row=>'MISSING_ASSET_REFERENCE:'+row.path)];
    const gapDomains=(QUALITY_DOMAIN_BY_FAMILY[def.id]||[]).filter(domain=>gaps.has(domain));
    if(gaps.has(def.id))gapDomains.push(def.id);
    // [자동 누락 탐지] 이미 설계된 교역품의 시각 자산만 검증된 P1 개선 대상으로 승격한다.
    if(def.id==='ITEMS_LOOT'&&itemAssetCoverage.missing.length)gapDomains.push('UNBOUND_DATA_DEFINED_ITEMS');
    const candidate=files.length>0||mentioned||ownAssets.length>0||ownRefs.length>0;
    return {id:def.id,kind:def.kind,priority:issues.length?'P0':gapDomains.length?'P1':candidate?'P2':'P3',
      sourceFiles:files,sourceSignalOnly:mentioned,assetCount:ownAssets.length,
      sourceState:!scan.complete?'PARTIAL_SOURCE':candidate?'CANDIDATE_NOT_VERIFIED':'NOT_OBSERVED',
      gapDomains:unique(gapDomains),gapEvidence:'BUILD_UP_DESIGN_SOURCE_GAP_NOT_RUNTIME_PROOF',
      issues,improvement:def.improvement,acceptance:def.acceptance,
      implementationStatus:'NOT_IMPLEMENTED_BY_PLAN',verified:false,actualPlayVerified:false};
  }).sort((a,b)=>a.priority.localeCompare(b.priority)||b.issues.length-a.issues.length
    ||playerImpactRank(a.id)-playerImpactRank(b.id)||a.id.localeCompare(b.id));
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
  // [자동 진단→수정 대상] 기존 BUILD_UP에 한 번에 한 책임 영역을 전달한다.
  // 확정된 정적 결함(P0)과 설계/소스상 의심되는 개선 영역(P1/P2)을 엄격히 구분한다.
  const sourceDefect=issues.slice().sort((a,b)=>a.id.localeCompare(b.id)||a.path.localeCompare(b.path))[0];
  const familyTarget=rows.find(row=>row.priority==='P1'&&row.sourceFiles.length)
    ||rows.find(row=>row.priority==='P1')
    ||rows.find(row=>row.priority==='P2'&&row.sourceFiles.length)||null;
  const refOwner=sourceDefect?.id==='SOURCE_ASSET_REFERENCE_MISSING'
    ?refs.find(row=>row.path===sourceDefect.path)?.owners||[]:[];
  const invalidAssetOwners=sourceDefect?.id==='ASSET_SIGNATURE_INVALID'
    ?texts.filter(row=>row.text.includes(sourceDefect.path)).map(row=>row.file):[];
  const itemVisualOwner=itemAssetCoverage.missing.length
    ?safeOwner(itemAssetCoverage.missing[0].sourceOwner):'';
  // 실제 실패 수리에는 현재 작업에서 이미 허용된 책임 파일만 우선 제시한다.
  // 추가 쓰기 권한을 생성하지 않으며 실제 실패 원인이라고 단정하지 않는다.
  const candidateOwners=repairRequested===true?authorizedOwners.slice(0,8)
    :sourceDefect?unique((sourceDefect.id==='ASSET_SIGNATURE_INVALID'?invalidAssetOwners:refOwner)
      .map(safeOwner).filter(Boolean)).slice(0,8)
    :itemVisualOwner?[itemVisualOwner]
    :familyTarget?unique(familyTarget.sourceFiles.map(safeOwner).filter(Boolean)).slice(0,8):[];
  const workScope=Object.freeze({
    authorizedSourceFiles:Object.freeze(candidateOwners.filter(file=>authorizedOwners.includes(file))),
    authorizedFileCount:authorizedOwners.length,writableScopeExpanded:false,
    directMutationAuthorized:false,exactOwnerCauseVerified:false
  });
  const autonomousWorkUnit=repairRequested===true?Object.freeze({
    id:'CURRENT_CAUSAL_FAILURE',priority:'P0',mode:'REPAIR_CURRENT_CAUSAL_FAILURE_FIRST',
    sourceFiles:candidateOwners,sourceAsset:null,ownerDiscoveryRequired:true,
    failureSignature:clean(runtimeEvidence?.failureSignature||runtimeEvidence?.playtestFinding)||null,
    evidence:'EXISTING_REPAIR_STAGE_FAILURE_NEEDS_EXACT_GAME_SOURCE_CAUSE',verifiedRuntime:false,
    workScope,action:'INSPECT_CANDIDATE_OWNERS_IDENTIFY_EXACT_CAUSE_REPAIR_AND_RERUN_FAILED_GATE'
  }):sourceDefect?Object.freeze({
    id:sourceDefect.id,priority:'P0',mode:'REPAIR_CONFIRMED_STATIC_DEFECT',
    sourceFiles:candidateOwners,sourceAsset:sourceDefect.path,ownerDiscoveryRequired:candidateOwners.length===0,
    evidence:'LOCAL_SOURCE_BYTES_OR_MISSING_REFERENCE',verifiedRuntime:false,
    workScope,action:'REPAIR_EXISTING_OWNER_OR_LICENSED_ASSET_AND_RERUN_EXACT_QUALITY_CHECK'
  }):itemAssetCoverage.missing.length?Object.freeze({
    id:'UNBOUND_DATA_DEFINED_ITEMS',priority:'P1',mode:'FILL_VERIFIED_SEMANTIC_ASSET_GAPS',
    sourceFiles:candidateOwners,sourceAsset:null,
    ownerDiscoveryRequired:candidateOwners.length===0,
    missingItemIds:itemAssetCoverage.missing.map(row=>row.itemId),
    declared:itemAssetCoverage.declared,covered:itemAssetCoverage.covered,
    gapDomains:['UNBOUND_DATA_DEFINED_ITEMS'],
    evidence:'STATIC_GAME_DATA_TO_APPROVED_IMAGE_OR_3D_BINDING_GAP',
    verifiedRuntime:false,workScope,
    action:'USE_EXISTING_LICENSED_COMPANY_ASSET_FIRST; REVIEW_EXACT_ITEM_MEANING_AND_SAFETY; REPAIR_GAME_UI_BINDING_IN_EXISTING_SOURCE; RERUN_INDEPENDENT_QA_AND_REAL_STUDIO; NEVER_INVENT_PLACEHOLDER_OR_UNAUTHORIZED_ASSET'
  }):familyTarget?Object.freeze({
    id:familyTarget.id,priority:familyTarget.priority,
    mode:familyTarget.priority==='P1'?'REVIEW_DESIGN_SOURCE_GAP_THEN_REPAIR':'INSPECT_SOURCE_CANDIDATE_THEN_REPAIR_IF_PROVEN',
    sourceFiles:candidateOwners,sourceAsset:null,
    ownerDiscoveryRequired:candidateOwners.length===0,
    gapDomains:familyTarget.gapDomains,evidence:'STATIC_CANDIDATE_NOT_RUNTIME_VERIFIED',
    verifiedRuntime:false,workScope,action:familyTarget.improvement
  }):Object.freeze({id:null,priority:'NONE',mode:'NO_SOURCE_SUPPORTED_TARGET',
    sourceFiles:[],sourceAsset:null,ownerDiscoveryRequired:true,
    evidence:'SOURCE_REVIEW_REQUIRED',verifiedRuntime:false,workScope,
    action:'INSPECT_CURRENT_GAME_BEFORE_EDIT'});
  // 공유·다른 게임 지시의 임의 fingerprint로 이 게임 소스의 변화가 증명되지 않게 한다.
  const fingerprint=digest(hashes.sort().join('\n'));
  return Object.freeze({
    version:1,authority:'EXISTING_BUILD_UP_SOURCE_ONLY',
    gameId,sourceRoot:scope.relative,sourceTreeFingerprint:fingerprint,
    sourceRevision:clean(sourceRevision)||null,
    scan:{complete:scan.complete,reason:scan.reason||null,sourceCount:texts.length,assetCount:observedAssetCount,assetReferences:refs.length,missingReferences:missing.length},
    sourceChangedSincePrevious:Boolean(previousPlan?.sourceTreeFingerprint&&previousPlan.sourceTreeFingerprint!==fingerprint),
    sourceOnly:true,qualityComplete:false,
    evidenceScope:{staticSource:true,cloudEngine:false,realStudioPlay:false,realScreen:false,realTouch:false,
      thumbnailIsNotRuntimeScreenshot:true,simulatedTouchIsNotHardwareTouch:true},
    assets,assetReferences:refs,sharedLibrary,issues,itemAssetCoverage,
    motion:{states:motionChecks(combined),requiredRealAnimatorStateCheck:true,
      requireStateInputToStateToFeedbackTrace:true,
      enforceAttackAnticipationImpactRecovery:true,
      onlySourceTokensSeen:true,actualActionVerified:false,actualMotionVerified:false},
    detailedChecks,detailedCheckCounts:{total:detailedChecks.length,motionActionRig:detailedChecks.filter(row=>/^(RIG_|MOTION_|ACTION_)/.test(row.id)).length,
      unexecuted:detailedChecks.filter(row=>row.executionStatus==='NOT_EXECUTED').length,
      actualPlayVerified:0,realTouchVerified:0},
    families:rows,priorityWork:rows.filter(row=>row.priority==='P0'||row.priority==='P1').concat(rows.filter(row=>row.priority==='P2').slice(0,6)).slice(0,12),
    autonomousWorkUnit,autonomousDecisionOwner:'VIBE_EXISTING_BUILD_UP',
    actualSourceDefects:issues.length,designSourceGapsUnverified:rows.filter(row=>row.priority==='P1').length,
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
export function robloxHolisticQualityPromptLines(plan={},maxFamilies=10,compact=false){
  if(!plan?.gameId)return [];
  // For high-volume authored content, never repeat 125 acceptance descriptions
  // inside the already-large directive prompt. The complete check definitions
  // remain in d.robloxHolisticQualityPlan for the existing source worker.
  if(compact)return [
    'ROBLOX_HOLISTIC_QUALITY_BUILD_UP: game='+plan.gameId+' sourceOnly=true COMPACT_VOLUME_INDEX; full evidence-specific source/asset plan in robloxHolisticQualityPlan.',
    'DETAILED_QUALITY_CHECKS: total='+plan.detailedCheckCounts?.total+' motionActionRig='+plan.detailedCheckCounts?.motionActionRig+' executed=0; source edits are NOT runtime PASS.',
    'MOTION_ACTION_BUILD_UP: real rig/Animator motion, anticipation-impact-recovery, hit/death, synced input/VFX/SFX, mobile LOD; only approved game-specific actor classes.',
    'QUALITY_PROOF_RULE: only exact source runtime and licensed asset evidence; Studio / real device execution remains unverified until actually observed.',
    'AUTONOMOUS_QUALITY_WORK_UNIT: '+JSON.stringify(plan.autonomousWorkUnit||{})+'; existing BUILD_UP owner must inspect and directly repair only proven defects; no standalone pipeline.',
    'ITEM_VISUAL_COVERAGE: '+(plan.itemAssetCoverage?.missing?.length||0)+'/'+(plan.itemAssetCoverage?.declared||0)+' semantic item visuals missing; review original licensed 3D/image assets, safety and verified runtime before claiming filled.'
  ];
  const top=(plan.priorityWork||[]).slice(0,Math.max(1,Math.min(16,Number(maxFamilies)||10)));
  const states=(plan.motion?.states||[]).filter(row=>row.sourceMentioned!==true).map(row=>row.id);
  const targetFamilies=new Set(top.map(row=>row.id));
  const detailed=(plan.detailedChecks||[])
    .filter(row=>row.sourceCandidate===true||targetFamilies.has(row.family))
    .sort((a,b)=>Number(b.sourceCandidate)-Number(a.sourceCandidate)||Number(targetFamilies.has(b.family))-Number(targetFamilies.has(a.family))||a.id.localeCompare(b.id))
    .slice(0,12);
  return [
    'ROBLOX_HOLISTIC_QUALITY_BUILD_UP: game='+plan.gameId+' sourceTree='+plan.sourceTreeFingerprint+' scanComplete='+plan.scan?.complete+' assets='+plan.scan?.assetCount+' sourceOnly=true',
    'SHARED_LIBRARY_QA: metadata='+plan.sharedLibrary?.status+' total='+plan.sharedLibrary?.coverage?.total+' gameRelevant='+plan.sharedLibrary?.coverage?.gameRelevant+' missingLocal='+plan.sharedLibrary?.coverage?.localFilesMissing+' ownershipGaps='+plan.sharedLibrary?.coverage?.ownershipOrLicenseMetadataGaps+' rightsProof=UNVERIFIED; evaluate all relevant library entries, keep originals, repair provenance before new use.',
    'AUTONOMOUS_QUALITY_WORK_UNIT: '+JSON.stringify(plan.autonomousWorkUnit||{})+'; automatically inspect this exact existing owner, edit responsible code/assets only for a verified defect or approved design gap, then rerun relevant existing QA. Never infer PASS from static clues.',
    'ITEM_VISUAL_COVERAGE: '+JSON.stringify({declared:plan.itemAssetCoverage?.declared||0,covered:plan.itemAssetCoverage?.covered||0,missingItemIds:(plan.itemAssetCoverage?.missing||[]).map(row=>row.itemId)})+'; repair genuinely unbound items via existing verified semantic 3D models or allowed images, keep blocked/regulated art unbound, require QA and runtime evidence.',
    'QUALITY_FAMILY_REPAIR_TARGETS: '+top.map(row=>row.id+'['+row.priority+']:'+row.improvement+' @ '+(row.sourceFiles?.join('|')||'LOCATE_OWNING_SOURCE')).join(' ; '),
    'DETAILED_QUALITY_CHECKS: total='+plan.detailedCheckCounts?.total+' motionActionRig='+plan.detailedCheckCounts?.motionActionRig+' executed=0; full definitions in robloxHolisticQualityPlan.detailedChecks; pick game-applicable checks, measure exact results before changing owning code or assets; count labels != tested gameplay.',
    'DETAILED_GAME_SOURCE_TARGETS: '+detailed.map(row=>row.id+'['+row.verificationMethod+'] '+row.acceptance+' => repair only observed failure or approved gap; sourceCandidate='+row.sourceCandidate).join(' ; ')+'. Exclude features absent from approved design; rerun same check after source/asset repair.',
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
  console.log('ROBLOX_HOLISTIC_DETAILED_CHECKS='+plan.detailedCheckCounts.total+':EXECUTED=0');
  console.log('ROBLOX_HOLISTIC_STUDIO_SCENARIOS=0/5_PENDING_REAL_STUDIO');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main();
