// 파일명: tools/vibe3-roblox-distillation.mjs
// 역할: 내부 Roblox의 검증된 source+runtime 패턴과 외부 Roblox의 black-box 관찰 원리를 기존 학습 fabric용 ledger로 정규화한다.
// 규칙: 외부 코드/바이너리/에셋 추출·저장 금지, 내부도 raw code 저장 금지, 전이 시 fresh QA 필수.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { selectRobloxStudioLessons, studioLessonMetadata } from './vibe3-roblox-studio-lessons.mjs';

const clean=value=>String(value??'').trim();
const upper=value=>clean(value).toUpperCase();
const unique=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const safeId=value=>clean(value).toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'')||'unknown';
const sha=value=>crypto.createHash('sha256').update(String(value??'')).digest('hex');
const isCommit=value=>/^[0-9a-f]{40}$/i.test(clean(value));
const isArtifact=value=>/^sha256:[0-9a-f]{64}$/i.test(clean(value));

const PRINCIPLES=Object.freeze({
  SERVER_AUTHORITATIVE_REMOTE_BOUNDARY:'Keep gameplay authority on the server and validate client remote requests before state mutation.',
  SAVE_DATASTORE_REJOIN:'Persist durable progression through a versioned server-owned save path and verify rejoin compatibility.',
  MOBILE_NATIVE_INPUT:'Bind mobile/touch input to the same real gameplay actions used by the authoritative game state.',
  MULTIPLAYER_SHARED_STATE:'Replicate shared session state from one server-owned source of truth instead of per-client simulation.',
  COMBAT_SERVER_AUTHORITY:'Resolve damage, cooldowns and combat outcomes on the server while clients present feedback.',
  AI_NAVIGATION_RESPONSIBILITY:'Keep navigation and target-selection responsibility explicit so AI repair does not leak into unrelated systems.',
  RIG_ANIMATION_BINDING:'Bind authored rig animation to gameplay state transitions and impact timing rather than decorative playback only.',
  VFX_GAMEPLAY_BINDING:'Drive bounded VFX from real gameplay events while preserving readability and mobile performance.',
  MESH_ASSET_BINDING:'Use explicit Roblox-native asset bindings for primary presentation instead of treating primitive placeholders as final art.'
});

// Concrete source references remain hashes/symbols in the ledger. Only the source worker
// reads a bounded excerpt from its current responsible files; source review is not runtime proof.
const SOURCE_LESSONS=Object.freeze([
  {id:'BOOTSTRAP_SPAWN',level:'BASIC',symbols:['bootstrapLobbyCharacter','bindBootstrapLobbySpawn','spawnPlayer'],terms:'spawn 스폰 로비',principle:'Make the first character appear over an existing safe floor before the larger world is ready.',apply:'Keep one engine bootstrap spawn; choose later destinations through the existing server placement owner.',failure:'Competing SpawnLocations or removing bootstrap support can drop a new character before initialization.',check:'Cold join, slow world creation and repeated respawn must reach visible supported ground.'},
  {id:'CHARACTER_LIFECYCLE',level:'BASIC',symbols:['onCharacter','bindCharacter','initializeCharacter'],terms:'character 캐릭터 리스폰',principle:'A player and its replaceable character have different lifetimes.',apply:'Bind CharacterAdded and already-present characters; after each wait, confirm the same character is still current.',failure:'A delayed callback can move an obsolete character or reset the new one twice.',check:'Respawn during loading and during a round; old callbacks must stop without modifying the replacement.'},
  {id:'GROUND_CONTACT',level:'APPLIED',symbols:['groundedRootTarget','validateCharacterFoundation','teleport'],terms:'ground floor 접지 바닥 낙하',principle:'A plausible spawn coordinate does not prove physical ground contact.',apply:'Use the current ground query and character clearance, then observe live support after placement.',failure:'Markers, decorative geometry, anchored roots and stale grounding sequences can produce false readiness.',check:'Inspect floor contact, live root anchoring, boundary spawns and ground that appears late.'},
  {id:'NPC_CONSTRUCTION',level:'BASIC',symbols:['createBotAvatar','spawnNPC','spawnEnemy','createMonster','bot'],terms:'mob monster npc 몹 생성 제작',principle:'Create one coherent NPC model with an explicit root, body, rig and owner.',apply:'Reuse the existing model factory and configure role, position and native visual binding before exposing the actor.',failure:'A decorative model without the actual actor binding does not become a working enemy.',check:'Confirm the visible model and authoritative actor are the same spawn, with one root and valid cleanup.'},
  {id:'NPC_MOVEMENT',level:'APPLIED',symbols:['moveBotDirection','steerBotAroundObstacle','moveEnemy'],terms:'move movement path 이동 추적 장애물',principle:'Separate movement intent, obstacle response and the final authoritative transform.',apply:'Use delta time once, preserve arena bounds, and apply existing separation before one movement write.',failure:'Double movement writes, unbounded dt and normalizing a zero vector cause jumps or invalid positions.',check:'Compare different frame rates, dense groups, corners and blocked paths without changing configured speed.'},
  {id:'TARGET_SELECTION',level:'KNOW_HOW',symbols:['distributedSurvivorTarget','distributedMonsterTarget','findNearestTarget','nearestMonsterSource'],terms:'target chase ai 시야 타깃 추적',principle:'Target selection should consider validity, visibility and crowd distribution, not distance alone.',apply:'Keep target memory and reevaluation with the existing AI owner; invalidate departed or eliminated targets.',failure:'Rapid target switching and every mob choosing one target create jitter and pileups.',check:'Test lost line of sight, a removed target, multiple players and return-to-patrol behavior.'},
  {id:'SERVER_ATTACK',level:'APPLIED',symbols:['infectAttack','purify','applyDamage','performAttack'],terms:'attack damage hit 공격 피격 피해',principle:'The server decides whether an attack is valid and applies its outcome once.',apply:'Keep phase, role, cooldown, range, facing, energy and valid-target checks before the existing state mutation; bind visual feedback to its result.',failure:'Client-declared damage, spending resources before finding a target, or duplicate hits break authority and feedback.',check:'Exercise no target, out of range, cooldown spam, target removal and two simultaneous players.'},
  {id:'ELIMINATION_AND_REMOVAL',level:'APPLIED',symbols:['eliminateMonsterPlayer','removeBot','onDied'],terms:'death died eliminate 사망 제거 정화',principle:'Elimination is an authoritative lifecycle transition with a visible result and cleanup.',apply:'Preserve the game-specific eliminated/dead/infected distinction and stop further actions through the current state owner.',failure:'Hiding a model alone leaves a live attacker; treating infection as death changes the game rules.',check:'Confirm the actor cannot attack after removal, feedback appears once and the next round resets correctly.'},
  {id:'ROUND_RESPAWN',level:'KNOW_HOW',symbols:['configure','startRound','endRound'],terms:'round respawn 라운드 재스폰 리셋',principle:'Round setup, active play and reset must share a consistent lifecycle boundary.',apply:'Wait for the map and role assignment before placement, then reset per-round movement and cooldown state through the existing owner.',failure:'Joining or respawning during a phase change can apply a lobby destination to an active-round character.',check:'Join mid-transition, respawn at round end, and start another round without stale actors or roles.'},
  {id:'LIFETIME_CLEANUP',level:'KNOW_HOW',symbols:['clearBots','cleanupCharacter','disconnectCharacter','destroyNPC'],terms:'cleanup leak clear 정리 중복',principle:'Every spawned actor, connection and temporary visual has a bounded lifetime.',apply:'Destroy owned instances, disconnect owned signals and remove entries from the authoritative collection together.',failure:'Destroying visuals while retaining references or callbacks leaks work into later rounds.',check:'Repeat creation/removal and multiple rounds; actor and callback counts must return to baseline.'},
  {id:'SAVE_REJOIN',level:'APPLIED',symbols:['load','save','loadPlayerData','savePlayerData'],terms:'save datastore load 저장 재접속',principle:'Persistent progression and temporary match state need separate meanings.',apply:'Reuse the existing versioned server save path; preserve defaults, migration and the current retry/error policy.',failure:'Saving a transient role or overwriting a failed load with defaults can erase valid progression.',check:'Rejoin after progression, test unavailable storage and preserve an older compatible save.'},
  {id:'RIG_STATE_BINDING',level:'APPLIED',symbols:['bindCharacterMotion','bindAuthoredCombatMotion','applyMotionJoint'],terms:'animation rig motion 모션 리그 관절',principle:'Animate real bound joints using the current actor state and existing rest transforms.',apply:'Bind once per actor and unbind on replacement; preserve locomotion root authority and action timing.',failure:'Invented joints, resetting the root or stacking rest transforms causes invisible motion and drift.',check:'Observe idle/walk/action transitions, actor replacement and repeated loops on the actual rig.'},
  {id:'ACTION_FEEDBACK',level:'KNOW_HOW',symbols:['playMonsterAttackEffect','playMonsterAbilityEffect','playHumanAbilityEffect','playVerifiedLearningActionFeedback'],terms:'feedback effect vfx 액션 효과 타격감',principle:'Client feedback presents a real server-approved outcome; it does not grant damage authority.',apply:'Use the existing event identity, position and actor binding; bound the visual lifetime and preserve mobile readability.',failure:'Decorative attacks without an outcome or duplicate feedback from repeated events mislead the player.',check:'Match action, target and impact timing in two clients; verify effect cleanup and a no-hit case.'},
  {id:'ASYNC_GENERATION_FENCE',level:'STUDIO',symbols:['validateCharacterFoundation','onCharacter','bootstrapLobbyCharacter'],terms:'async race sequence 비동기 경쟁 스폰',principle:'A delayed operation belongs to one actor generation and one lifecycle phase.',apply:'Capture the current character and generation/sequence before yielding; revalidate both and phase ownership before each final mutation. Abort superseded work through the existing owner.',failure:'Checking identity only before a wait permits a stale teleport, readiness flag or role write after respawn.',check:'Force two rapid respawns and a map transition during delayed loading; only the newest generation may reach ready.'},
  {id:'CROWD_STEERING_COMPOSITION',level:'STUDIO',symbols:['botSeparationVector','steerBotAroundObstacle','moveBotDirection'],terms:'crowd steering avoidance separation 군집 회피 분리',principle:'Crowd separation, obstacle avoidance and goal seeking must compose into one bounded movement decision.',apply:'Normalize only nonzero vectors, bound the separation contribution, preserve wall checks and map bounds, and make one final movement write with dt.',failure:'Unbounded repulsion or competing controllers create oscillation, wall penetration and frame-dependent speed.',check:'Use the same crowd seed at a bottleneck and arena edge; compare overlaps, stuck time and frame cost against the unchanged baseline.'},
  {id:'PREDICTIVE_TARGET_MEMORY',level:'STUDIO',symbols:['predictedTargetPosition','rememberTarget','distributedSurvivorTarget'],terms:'prediction memory hysteresis 예측 기억 추적',principle:'Prediction and target memory should stabilize pursuit while respecting current visibility and validity.',apply:'Bound look-ahead by observed motion and distance; retain a valid target through small score changes and expire stale observations through the existing AI state.',failure:'Unbounded prediction overshoots; memory without expiry tracks absent actors; instant reselection causes target thrashing.',check:'Compare sharp direction changes, occlusion, teleport and player departure; record overshoot and target-switch frequency.'},
  {id:'ACTION_EVENT_DEDUPLICATION',level:'STUDIO',symbols:['markCombatSkinAttack','playMonsterAttackEffect','broadcastMultiplayerSync'],terms:'network event sync duplicate 네트워크 동기화 중복',principle:'One authoritative action should produce one bounded visual event per receiving actor.',apply:'Use the existing event stamp/identity and current actor binding, reject stale or duplicate presentation events, and align the action clock without moving hit timing.',failure:'Late events animate replacement actors, repeated messages duplicate impact, and client visual timing accidentally changes damage authority.',check:'Replay duplicate and delayed events across two clients; verify one impact, correct actor and unchanged server outcome.'},
  {id:'ANIMATION_LAYER_OWNERSHIP',level:'STUDIO',symbols:['bindAuthoredCombatMotion','applyMotionJoint','bindCharacterMotion'],terms:'blend layer rig joint 애니메이션 블렌딩 레이어',principle:'Each joint needs a deliberate composition order between rest, locomotion, action and secondary offsets.',apply:'Read the current rest transform and existing joint writer, compose bounded local offsets once, then blend action entry/recovery while leaving root authority and impact timing intact.',failure:'Multiple writers, multiplying last-frame transforms, or lerping the gameplay root produces drift and fighting animations.',check:'Repeat walk-to-attack-to-idle transitions, interruption and actor replacement; inspect seam velocity, grip stability and root drift.'},
  {id:'FRAME_BUDGET_AND_LIFETIME',level:'STUDIO',symbols:['render','clearBots','bindFootsteps'],terms:'performance budget memory pooling lod 성능 메모리 최적화',principle:'Performance improvements require a measured hot path and complete resource lifetimes.',apply:'Measure the current update/effect cost; reduce repeated searches and allocations only in the observed hot path. Reuse or distance-throttle visuals only when reset and cancellation are correct.',failure:'Blind pooling retains stale state, throttling gameplay changes outcomes, and fast average frames hide transition spikes.',check:'Measure median and tail frame times plus live instances/connections over repeated rounds on the target mobile budget; compare identical scenes.'},
  {id:'SOURCE_BOUND_RUNTIME_REGRESSION',level:'STUDIO',symbols:['foundationCheckpoint','validateCharacterFoundation','verifiedLearningMotionFailureReason'],terms:'qa regression evidence runtime 검증 회귀 증거',principle:'A studio quality claim needs the exact changed artifact and repeatable observable acceptance criteria.',apply:'Bind source revision and artifact identity to the existing runtime observation; keep the same camera, actor, state and scenario for before/after review.',failure:'A declaration, mock fixture, green wrapper job or stale screenshot can pass while the live behavior is unchanged.',check:'Require source delta, exact-artifact execution, negative cases and same-condition captures; preserve missing evidence as unverified.'}
]);

export function buildRobloxSourceCurriculum({gameId='',sourceFiles={}}={}){
  const files=Object.entries(sourceFiles).map(([file,code])=>({file,code:String(code),lines:String(code).split(/\r?\n/),sha256:sha(code)}));
  const lessons=[];
  for(const lesson of SOURCE_LESSONS){
    let reference=null;
    for(const symbol of lesson.symbols){
      for(const file of files){
        const start=file.lines.findIndex(line=>{
          const name=line.match(/^\s*(?:local\s+)?function\s+([\w.:]+)\s*\(/)?.[1];
          return name&&(name===symbol||name.endsWith('.'+symbol)||name.endsWith(':'+symbol));
        });
        if(start<0)continue;
        reference={path:file.file,sha256:file.sha256,symbol,startLine:start+1};break;
      }
      if(reference)break;
    }
    if(reference)lessons.push({id:lesson.id,level:lesson.level,terms:lesson.terms,principle:lesson.principle,application:lesson.apply,failureMode:lesson.failure,transferCheck:lesson.check,sourceReference:reference});
  }
  return {version:1,kind:'roblox-source-curriculum',gameId:clean(gameId),lessons,missingTopics:SOURCE_LESSONS.filter(row=>!lessons.some(x=>x.id===row.id)).map(row=>row.id),sourceReviewedOnly:true,runtimeVerified:false,weightTraining:false,rawCodeStored:false,freshTransferQaRequired:true};
}

export function buildRobloxSourceCoaching({cwd=process.cwd(),order={},responsibleFiles=[]}={}){
  const empty={block:'',evidence:{retrieved:false,sourceReviewedOnly:true,runtimeVerified:false,weightTraining:false}};
  if(clean(order.target).toLowerCase()!=='roblox'||order.source?.internalAssetMotion===true)return empty;
  const relative=clean(order.source?.root).replaceAll('\\','/');
  if(!/^roblox-games\/[a-z0-9-]+$/.test(relative))return empty;
  try{
    const root=fs.realpathSync(path.resolve(cwd,relative)),sourceFiles={};
    for(const file of responsibleFiles){
      if(!/\.luau$/.test(file)||file.includes('..')||path.isAbsolute(file))continue;
      try{
        const absolute=fs.realpathSync(path.join(root,file));
        if(!absolute.startsWith(root+path.sep)||!fs.statSync(absolute).isFile()||fs.statSync(absolute).size>800000)continue;
        sourceFiles[relative+'/'+file]=fs.readFileSync(absolute,'utf8');
      }catch{continue;}
    }
    if(!Object.keys(sourceFiles).length)return empty;
    const curriculum=buildRobloxSourceCurriculum({gameId:order.gameId,sourceFiles});
    const goal=(clean(order.selectedTask?.goal)||clean(order.originalGoal)||clean(order.goal)).slice(0,2000).toLowerCase();
    const ranked=curriculum.lessons.map((row,index)=>({row,index,score:row.terms.split(' ').filter(term=>/^[a-z]+$/.test(term)?new RegExp('\\b'+term+'\\b').test(goal):goal.includes(term)).length})).sort((a,b)=>b.score-a.score||a.index-b.index);
    const studio=selectRobloxStudioLessons(goal);
    const selected=ranked.filter(x=>!studio.length||x.score>0).slice(0,studio.length?1:3).map(x=>x.row);
    if(!selected.length&&!studio.length)return empty;
    const evidence={retrieved:true,kind:'ROBLOX_SOURCE_CURRICULUM',sourceReviewedOnly:true,applicationVerified:false,runtimeVerified:false,weightTraining:false,lessonIds:selected.map(row=>row.id),references:selected.map(row=>row.sourceReference),missingTopics:curriculum.missingTopics,studioLessons:studio.map(studioLessonMetadata),studioAdvisoryOnly:true};
    const block=['[ROBLOX SOURCE COACHING BEGIN]',JSON.stringify(evidence),'Distilled source-reading lessons, applied code excerpts and transfer exercises. These are current implementation observations, not approved runtime outcomes. Preserve the current responsible paths and gameplay authority.'];
    for(const row of selected){
      const ref=row.sourceReference,lines=sourceFiles[ref.path].split(/\r?\n/);
      const excerptLines=[];let excerptBytes=0;
      for(const line of lines.slice(ref.startLine-1,ref.startLine+15)){
        const size=Buffer.byteLength(line+'\n','utf8');if(excerptBytes+size>1200)break;
        excerptLines.push(line);excerptBytes+=size;
      }
      const excerpt=excerptLines.join('\n');
      block.push(JSON.stringify(row),'READ-ONLY SOURCE EXCERPT (partial function; do not paste as a complete replacement): '+ref.path+':'+ref.startLine+'\n'+excerpt);
    }
    for(const row of studio){
      block.push('ORIGINAL TEACHING EXAMPLE '+row.id+' (adaptation function, not a complete subsystem; not native-verified):\n'+row.exampleCode);
    }
    block.push('Adapt only the assigned responsibility. Use exact current editable anchors and independently verify the result; a retrieved lesson is not successful application.','[ROBLOX SOURCE COACHING END]');
    return {block:block.join('\n'),evidence};
  }catch{return empty;}
}

export function extractRobloxSourcePatterns({serverSource='',clientSource='',sharedSource=''}={}){
  const server=String(serverSource||''),client=String(clientSource||''),shared=String(sharedSource||''),all=[server,client,shared].join('\n');
  const patterns=[];
  if(/RemoteEvent/.test(all)&&/OnServerEvent/.test(server))patterns.push('SERVER_AUTHORITATIVE_REMOTE_BOUNDARY');
  if(/DataStoreService/.test(server)&&/GetAsync/.test(server)&&/(?:SetAsync|UpdateAsync)/.test(server))patterns.push('SAVE_DATASTORE_REJOIN');
  if(/(?:UserInputService|ContextActionService|\.Activated\b)/.test(client))patterns.push('MOBILE_NATIVE_INPUT');
  if(/Players/.test(server)&&/(?:FireAllClients|FireClient|OnServerEvent)/.test(server))patterns.push('MULTIPLAYER_SHARED_STATE');
  if(/(?:TakeDamage|damage|Damage)/.test(server)&&/OnServerEvent/.test(server))patterns.push('COMBAT_SERVER_AUTHORITY');
  if(/(?:PathfindingService|MoveTo\s*\(|Humanoid:MoveTo)/.test(server))patterns.push('AI_NAVIGATION_RESPONSIBILITY');
  if(/(?:Animator|LoadAnimation|AnimationTrack|AnimationId)/.test(all))patterns.push('RIG_ANIMATION_BINDING');
  if(/(?:ParticleEmitter|Trail|Beam|TweenService)/.test(all))patterns.push('VFX_GAMEPLAY_BINDING');
  if(/(?:MeshPart|SpecialMesh|SurfaceAppearance|AnimationId)/.test(all))patterns.push('MESH_ASSET_BINDING');
  return Object.freeze(unique(patterns));
}

export function buildInternalRobloxDistillation({
  gameId='',sourceRevision='',artifactIdentity='',artifactRunId=0,
  runtimeEvidence={},postRuntimeQaEvidence={},multiplayerQaEvidence={},publicationTarget={},source={}
}={}){
  const id=clean(gameId),revision=clean(sourceRevision),artifact=clean(artifactIdentity);
  if(!id)throw new Error('ROBLOX_INTERNAL_GAME_ID_REQUIRED');
  if(!isCommit(revision))throw new Error('ROBLOX_INTERNAL_EXACT_REVISION_REQUIRED');
  if(!isArtifact(artifact))throw new Error('ROBLOX_INTERNAL_ARTIFACT_REQUIRED');
  if(runtimeEvidence?.runtimePassed!==true)throw new Error('ROBLOX_INTERNAL_RUNTIME_PASS_REQUIRED');
  if(postRuntimeQaEvidence?.exactRevision!==true)throw new Error('ROBLOX_INTERNAL_EXACT_RUNTIME_REVISION_REQUIRED');
  if(postRuntimeQaEvidence?.regressionPassed!==true)throw new Error('ROBLOX_INTERNAL_REGRESSION_PASS_REQUIRED');
  if(multiplayerQaEvidence&&Object.keys(multiplayerQaEvidence).length&&multiplayerQaEvidence.multiplayerQaPassed!==true)throw new Error('ROBLOX_INTERNAL_MULTIPLAYER_QA_REQUIRED_WHEN_EVIDENCE_PRESENT');
  const patterns=extractRobloxSourcePatterns(source);
  if(!patterns.length)throw new Error('ROBLOX_INTERNAL_DISTILLABLE_PATTERN_MISSING');
  const sourceCurriculum=buildRobloxSourceCurriculum({gameId:id,sourceFiles:{
    [`roblox-games/${id}/server/Game.server.luau`]:source.serverSource||'',
    [`roblox-games/${id}/client/Game.client.luau`]:source.clientSource||'',
    [`roblox-games/${id}/shared/GameConfig.luau`]:source.sharedSource||''
  }});
  const principles=unique([...patterns.map(pattern=>PRINCIPLES[pattern]).filter(Boolean),...sourceCurriculum.lessons.map(row=>`${row.id}: ${row.principle} Apply: ${row.application} Avoid: ${row.failureMode} Verify: ${row.transferCheck}`)]);
  return Object.freeze({
    version:1,
    id:`roblox-internal-${safeId(id)}-${revision.slice(0,12)}`,
    sourceKind:'internal-roblox-source-runtime',
    authority:'VERIFIED_INTERNAL_ROBLOX_DISTILLATION',
    practiceOnly:false,
    runtimePromotionAllowed:false,
    gameId:id,
    engine:'roblox',
    sourceRevision:revision,
    artifactIdentity:artifact,
    artifactRunId:Number(artifactRunId)||null,
    observationKind:'SOURCE_PLUS_RUNTIME_VERIFIED',
    patterns:Object.freeze(patterns),
    principles:Object.freeze(principles),
    sourceCurriculum:Object.freeze(sourceCurriculum),
    evidence:Object.freeze(unique([
      `source-revision:${revision}`,
      `artifact:${artifact}`,
      'runtime:PASS','exact-revision:PASS','regression:PASS',
      multiplayerQaEvidence&&Object.keys(multiplayerQaEvidence).length?'multiplayer-qa:PASS':''
    ])),
    publicationTarget:Object.freeze({
      universeId:clean(publicationTarget?.universeId)||null,
      placeId:clean(publicationTarget?.placeId)||null
    }),
    verified:true,
    retrievalEligible:true,
    advisoryOnly:false,
    freshTransferQaRequired:true,
    rawCodeStored:false,
    rawAssetStored:false,
    rawBinaryStored:false,
    hiddenReasoningStored:false,
    directSourceWriteAuthority:false,
    automaticCapabilityPromotion:false
  });
}

export function normalizeExternalRobloxBlackBoxObservation(record={}){
  const provenance=record?.provenance||{},qa=record?.qa||{};
  if(record.sourceKind!=='external-roblox-runtime-reference')throw new Error('ROBLOX_EXTERNAL_SOURCE_KIND_INVALID');
  if(record.authority!=='PRACTICE_ONLY'||record.practiceOnly!==true||record.runtimePromotionAllowed!==false)throw new Error('ROBLOX_EXTERNAL_AUTHORITY_INVALID');
  if(upper(provenance.observationKind)!=='BLACK_BOX_RUNTIME_ONLY')throw new Error('ROBLOX_EXTERNAL_BLACK_BOX_ONLY_REQUIRED');
  if(provenance.codeExtracted!==false||provenance.binaryRedistributed!==false||provenance.assetExtracted!==false)throw new Error('ROBLOX_EXTERNAL_EXTRACTION_BOUNDARY_INVALID');
  if(upper(qa.runtime)!=='PASS'||upper(qa.teacherReview)!=='PASS')throw new Error('ROBLOX_EXTERNAL_RUNTIME_REVIEW_REQUIRED');
  if(record.rawCode||record.rawAsset||record.binaryPayload)throw new Error('ROBLOX_EXTERNAL_RAW_PAYLOAD_FORBIDDEN');
  const project=clean(record.project||record.gameId);
  const sourceRevision=clean(record.sourceRevision);
  const observations=unique(Array.isArray(record.observations)?record.observations:Object.entries(record.observations||{}).filter(([,v])=>Boolean(v)).map(([k,v])=>`${k}:${String(v)}`)).slice(0,32);
  const principles=unique(record.principles||record.reusablePrinciples||[]).slice(0,24);
  const patterns=unique(record.patterns||record.tags||[]).slice(0,24);
  if(!project||!sourceRevision)throw new Error('ROBLOX_EXTERNAL_IDENTITY_REQUIRED');
  if(!observations.length||!principles.length)throw new Error('ROBLOX_EXTERNAL_DISTILLED_CONTENT_REQUIRED');
  return Object.freeze({
    version:1,
    id:clean(record.id)||`roblox-external-${safeId(project)}-${sha(sourceRevision+'|'+principles.join('|')).slice(0,12)}`,
    sourceKind:'external-roblox-runtime-reference',
    authority:'PRACTICE_ONLY',
    practiceOnly:true,
    runtimePromotionAllowed:false,
    gameId:project,
    engine:'roblox',
    sourceRevision,
    observationKind:'BLACK_BOX_RUNTIME_ONLY',
    observations:Object.freeze(observations),
    patterns:Object.freeze(patterns),
    principles:Object.freeze(principles),
    evidence:Object.freeze(unique(['runtime:PASS','teacher-review:PASS',...(record.evidence||[])]).slice(0,24)),
    verified:false,
    retrievalEligible:true,
    advisoryOnly:true,
    freshTransferQaRequired:true,
    codeExtracted:false,
    assetExtracted:false,
    binaryRedistributed:false,
    rawCodeStored:false,
    rawAssetStored:false,
    rawBinaryStored:false,
    hiddenReasoningStored:false,
    directSourceWriteAuthority:false,
    automaticCapabilityPromotion:false
  });
}

export function normalizeRobloxDistillationRecord(record={}){
  if(record?.sourceKind==='internal-roblox-source-runtime'){
    if(record.authority!=='VERIFIED_INTERNAL_ROBLOX_DISTILLATION'||record.verified!==true||record.retrievalEligible!==true)throw new Error('ROBLOX_INTERNAL_NORMALIZED_AUTHORITY_INVALID');
    if(!isCommit(record.sourceRevision)||!isArtifact(record.artifactIdentity))throw new Error('ROBLOX_INTERNAL_NORMALIZED_IDENTITY_INVALID');
    if(record.rawCodeStored!==false||record.rawAssetStored!==false||record.rawBinaryStored!==false)throw new Error('ROBLOX_INTERNAL_RAW_STORAGE_FORBIDDEN');
    return Object.freeze({...record,patterns:Object.freeze(unique(record.patterns||[])),principles:Object.freeze(unique(record.principles||[])),evidence:Object.freeze(unique(record.evidence||[]))});
  }
  return normalizeExternalRobloxBlackBoxObservation(record);
}

export function mergeRobloxDistillationLedger(ledgerInput={},records=[]){
  const map=new Map();
  for(const raw of Array.isArray(ledgerInput?.records)?ledgerInput.records:[]){
    try{const row=normalizeRobloxDistillationRecord(raw);map.set(row.id,row);}catch{}
  }
  let added=0,replaced=0,rejected=0;
  for(const raw of records||[]){
    try{
      const row=normalizeRobloxDistillationRecord(raw);
      if(map.has(row.id))replaced+=1;else added+=1;
      map.set(row.id,row);
    }catch{rejected+=1;}
  }
  const rows=[...map.values()].sort((a,b)=>clean(a.id).localeCompare(clean(b.id)));
  return Object.freeze({
    version:1,
    kind:'vibe3-roblox-distillation-ledger',
    policy:Object.freeze({
      unifiedLearningFabricOnly:true,
      externalBlackBoxOnly:true,
      externalCodeAssetExtractionForbidden:true,
      internalExactRevisionRuntimeEvidenceRequired:true,
      rawCodeOrAssetStorageForbidden:true,
      freshQaRequiredOnTransfer:true,
      automaticCapabilityPromotion:false
    }),
    records:Object.freeze(rows),
    stats:Object.freeze({added,replaced,rejected,total:rows.length,internal:rows.filter(x=>x.sourceKind==='internal-roblox-source-runtime').length,external:rows.filter(x=>x.sourceKind==='external-roblox-runtime-reference').length})
  });
}

function gitShow(repoRoot,revision,relative){
  return execFileSync('git',['-C',repoRoot,'show',`${revision}:${relative}`],{encoding:'utf8',stdio:['ignore','pipe','ignore'],maxBuffer:8*1024*1024});
}

export function distillKnownGoodRobloxRecords({knownGood={},repoRoot='.',sourceLoader=gitShow}={}){
  const records=[],skipped=[];
  for(const row of Array.isArray(knownGood?.records)?knownGood.records:[]){
    const gameId=clean(row?.gameId),revision=clean(row?.sourceRevision),root=`roblox-games/${gameId}`;
    try{
      const source={
        sharedSource:sourceLoader(repoRoot,revision,`${root}/shared/GameConfig.luau`),
        serverSource:sourceLoader(repoRoot,revision,`${root}/server/Game.server.luau`),
        clientSource:sourceLoader(repoRoot,revision,`${root}/client/Game.client.luau`)
      };
      records.push(buildInternalRobloxDistillation({
        gameId,sourceRevision:revision,artifactIdentity:row.artifactIdentity,artifactRunId:row.artifactRunId,
        runtimeEvidence:row.runtimeEvidence||{},postRuntimeQaEvidence:row.postRuntimeQaEvidence||{},
        multiplayerQaEvidence:row.multiplayerQaEvidence||{},publicationTarget:row.publicationTarget||{},source
      }));
    }catch(error){skipped.push({gameId:gameId||'unknown',sourceRevision:revision||null,reason:String(error?.message||error)});}
  }
  return Object.freeze({records:Object.freeze(records),skipped:Object.freeze(skipped)});
}

function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i+=1){
    const raw=argv[i];if(!raw.startsWith('--'))continue;
    const body=raw.slice(2),at=body.indexOf('=');
    if(at>=0)out[body.slice(0,at)]=body.slice(at+1);else out[body]=argv[++i]??true;
  }
  return out;
}
function readJson(file,fallback={}){if(!file||!fs.existsSync(file))return fallback;return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}

function main(){
  const args=parseArgs(process.argv.slice(2)),root=clean(args.root)||process.cwd();
  const existing=readJson(clean(args.existing),{version:1,records:[]});
  const incoming=[];
  let knownGoodSkipped=[];
  if(clean(args['known-good'])){
    const distilled=distillKnownGoodRobloxRecords({knownGood:readJson(clean(args['known-good']),{}),repoRoot:root});
    incoming.push(...distilled.records);knownGoodSkipped=distilled.skipped;
  }
  if(clean(args['external-dir'])&&fs.existsSync(clean(args['external-dir']))){
    for(const name of fs.readdirSync(clean(args['external-dir'])).filter(x=>/^roblox-black-box-.*\.json$/i.test(x)).sort()){
      incoming.push(readJson(path.join(clean(args['external-dir']),name),{}));
    }
  }
  const ledger=mergeRobloxDistillationLedger(existing,incoming);
  if(!clean(args.output))throw new Error('usage: --output <ledger.json> [--existing <ledger>] [--known-good <json>] [--external-dir <dir>] [--root <repo>]');
  writeJson(clean(args.output),ledger);
  console.log(`VIBE3_ROBLOX_DISTILLATION_TOTAL=${ledger.stats.total}`);
  console.log(`VIBE3_ROBLOX_DISTILLATION_INTERNAL=${ledger.stats.internal}`);
  console.log(`VIBE3_ROBLOX_DISTILLATION_EXTERNAL=${ledger.stats.external}`);
  console.log(`VIBE3_ROBLOX_DISTILLATION_KNOWN_GOOD_SKIPPED=${knownGoodSkipped.length}`);
}
const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){try{main();}catch(error){console.error(error.stack||error.message);process.exitCode=1;}}
