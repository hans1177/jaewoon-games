// 파일명: tools/vibe3-roblox-learning-context.mjs
// 역할: Roblox 작업에 검증된 외부 블랙박스 관찰을 일반 원칙으로만 전달하고,
// 게임별 의미 매핑을 통해 실제 Roblox-native 소스 변경으로 연결한다.
// 원본 코드·바이너리·에셋 표현은 전달하지 않으며 QA/Android 원칙은 게임 소스에 주입하지 않는다.

const clean=value=>String(value??'').trim();
const unique=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const stableHash=value=>{let h=2166136261;for(const ch of String(value??'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(36);};

export const ROBLOX_SEMANTIC_MAPPING_VERSION=1;

const PROFILE_BY_GAME=Object.freeze({
  'amusement-tycoon':{genre:'Simulation',subgenre:'Tycoon',playMode:'SINGLE'},
  'bug-defense':{genre:'Strategy',subgenre:'Tower Defense',playMode:'SINGLE'},
  'cozy-island':{genre:'Simulation',subgenre:'Life sim',playMode:'SINGLE'},
  'daechung-rpg':{genre:'RPG',subgenre:'Action RPG',playMode:'SINGLE'},
  'fantasy-survival':{genre:'Survival',subgenre:'Fantasy survival',playMode:'SINGLE'},
  'horror-escape-room':{genre:'Party & casual',subgenre:'Horror escape',playMode:'HYBRID'},
  'line-defense':{genre:'Strategy',subgenre:'Tower Defense',playMode:'SINGLE'},
  'monster-adventure':{genre:'Action',subgenre:'Creature adventure',playMode:'SINGLE'},
  'seed-action-survival-rogu-echoes-of-the-lost-star':{genre:'Survival',subgenre:'Action roguelite',playMode:'SINGLE'},
  'seed-casual-realm-weaver':{genre:'Party & casual',subgenre:'Realm objective',playMode:'SINGLE'},
  'seed-idle-growth-rpg-crystal-bloom':{genre:'RPG',subgenre:'Idle growth',playMode:'SINGLE'},
  'seed-puzzle-chromatic-cascade':{genre:'Puzzle',subgenre:'Match puzzle',playMode:'SINGLE'},
  'seed-roblox-roleplay-life-avat-brookhaven-rp':{genre:'Roleplay & avatar sim',subgenre:'Social roleplay',playMode:'HYBRID'},
  'seed-roblox-simulator-tycoon-i-adopt-me':{genre:'Simulation',subgenre:'Tycoon',playMode:'SINGLE'},
  'seed-roblox-story-rpg-adventur-blox-fruits':{genre:'RPG',subgenre:'Adventure RPG',playMode:'SINGLE'},
  'seed-roblox-survival-horror-es-doors':{genre:'Survival',subgenre:'Survival horror',playMode:'SINGLE'},
  'seed-single-defense-strat-celestial-bastion':{genre:'Strategy',subgenre:'Tower Defense',playMode:'SINGLE'},
  'seed-story-complete-rpg-chronicles-of-eldoria':{genre:'RPG',subgenre:'Story RPG',playMode:'SINGLE'},
  'star-frontier':{genre:'Adventure',subgenre:'Exploration',playMode:'SINGLE'},
  'survival':{genre:'Survival',subgenre:'Survival',playMode:'SINGLE'},
  'territory-war':{genre:'Strategy',subgenre:'Territory combat',playMode:'HYBRID'},
  'village-dungeons':{genre:'RPG',subgenre:'Dungeon RPG',playMode:'SINGLE'}
});

export function existingRobloxGameLearningProfile(gameId=''){
  const profile=PROFILE_BY_GAME[clean(gameId)]||{genre:'Adventure',subgenre:'Objective adventure',playMode:'SINGLE'};
  const playMode=clean(profile.playMode).toUpperCase()||'SINGLE';
  return Object.freeze({
    platform:'ROBLOX',
    genre:profile.genre,
    subgenre:profile.subgenre,
    playMode,
    multiplayerRequired:playMode!=='SINGLE'
  });
}

function coreKind(profile={}){
  const genre=clean(profile.genre),sub=clean(profile.subgenre);
  if(genre==='Puzzle')return'PUZZLE';
  if(genre==='Obby & platformer'||genre==='Sports & racing')return'MOVEMENT';
  if(genre==='Shooter'||genre==='Action')return'COMBAT';
  if(genre==='Strategy'&&sub==='Tower Defense')return'DEFENSE';
  if(genre==='Strategy'||genre==='Adventure'||genre==='Party & casual')return'OBJECTIVE';
  if(genre==='RPG')return'PROGRESSION';
  if(genre==='Survival')return'SURVIVAL';
  if(genre==='Simulation')return sub==='Tycoon'?'ECONOMY':'PROGRESSION';
  if(genre==='Roleplay & avatar sim'||genre==='Social')return'SOCIAL';
  return'OBJECTIVE';
}

function selectDistilled(records=[],{gameId='',terms=[],profileText=''}={}){
  const eligible=(Array.isArray(records)?records:[]).filter(row=>
    row?.retrievalEligible===true
    &&row?.engine==='roblox'
    &&row?.rawCodeStored===false
    &&row?.rawAssetStored===false
    &&row?.rawBinaryStored===false
    &&(
      row?.sourceKind==='internal-roblox-source-runtime'
        ? row?.authority==='VERIFIED_INTERNAL_ROBLOX_DISTILLATION'&&row?.verified===true
        : row?.sourceKind==='external-roblox-runtime-reference'&&row?.authority==='PRACTICE_ONLY'&&row?.observationKind==='BLACK_BOX_RUNTIME_ONLY'
    )
  );
  const scored=eligible.map(row=>{
    const patterns=unique(row.patterns||[]),principles=unique(row.principles||[]);
    const haystack=[...patterns,...principles,...(row.observations||[])].join(' ').toLowerCase();
    let score=terms.reduce((sum,term)=>sum+(haystack.includes(term)?2:0),0);
    score+=patterns.reduce((sum,pattern)=>sum+(profileText.includes(pattern.toLowerCase())?2:0),0);
    if(clean(row.gameId)===clean(gameId)&&row.sourceKind==='internal-roblox-source-runtime')score+=12;
    if(row.sourceKind==='internal-roblox-source-runtime')score+=3;
    return{row,score,tie:stableHash(clean(gameId)+'|'+clean(row.id))};
  }).filter(x=>x.score>0||clean(x.row.gameId)===clean(gameId))
    .sort((a,b)=>b.score-a.score||a.tie.localeCompare(b.tie));
  const selected=scored.map(x=>x.row);
  return Object.freeze({
    ids:Object.freeze(selected.map(row=>clean(row.id)).filter(Boolean)),
    patterns:Object.freeze(unique(selected.flatMap(row=>row.patterns||[]))),
    principles:Object.freeze(unique(selected.flatMap(row=>row.principles||[]))),
    externalIds:Object.freeze(selected.filter(row=>row.sourceKind==='external-roblox-runtime-reference').map(row=>clean(row.id)).filter(Boolean)),
    externalAdvisoryUsed:selected.some(row=>row.sourceKind==='external-roblox-runtime-reference'),
    crossGameUsed:selected.some(row=>clean(row.gameId)!==clean(gameId)),
    freshQaRequired:selected.length>0
  });
}

export function verifiedExternalBlackBoxPlaybookContract(playbooks={}, {required=false,requiredTaskTypes=['roblox','coding']}={}){
  const taskTypes=playbooks?.taskTypes&&typeof playbooks.taskTypes==='object'?playbooks.taskTypes:{};
  const allRows=[];
  for(const task of Object.values(taskTypes))for(const row of task?.reuse||[])if(clean(row?.id).startsWith('external-black-box-'))allRows.push(row);
  const byId=new Map();
  for(const row of allRows){
    const id=clean(row?.id);
    if(!id)continue;
    const previous=byId.get(id)||{id,project:clean(row?.project),sourceRevision:clean(row?.sourceRevision),distilledApplicationPrinciples:[],distilledAvoidancePrinciples:[],distilledLearningUseAllowed:[],distilledLearningUseForbidden:[]};
    previous.distilledApplicationPrinciples=unique([...previous.distilledApplicationPrinciples,...(row?.distilledApplicationPrinciples||[])]);
    previous.distilledAvoidancePrinciples=unique([...previous.distilledAvoidancePrinciples,...(row?.distilledAvoidancePrinciples||[])]);
    previous.distilledLearningUseAllowed=unique([...previous.distilledLearningUseAllowed,...(row?.distilledLearningUseAllowed||[])]);
    previous.distilledLearningUseForbidden=unique([...previous.distilledLearningUseForbidden,...(row?.distilledLearningUseForbidden||[])]);
    byId.set(id,previous);
  }
  const rows=[...byId.values()].sort((a,b)=>a.id.localeCompare(b.id));
  const ids=rows.map(row=>row.id);
  const contentIds=rows.filter(row=>row.distilledApplicationPrinciples.length>0).map(row=>row.id);
  const complete=ids.length>0&&contentIds.length===ids.length;
  const coveragePct=ids.length?Math.floor((contentIds.length/ids.length)*100):0;
  if(required){
    if(playbooks?.policy?.verifiedExternalBlackBoxAllTaskTypesRequired!==true||playbooks?.policy?.verifiedExternalBlackBoxTruncationForbidden!==true)throw new Error('ROBLOX_VERIFIED_EXTERNAL_LEARNING_POLICY_REQUIRED');
    if(!ids.length)throw new Error('ROBLOX_VERIFIED_EXTERNAL_LEARNING_REQUIRED');
    for(const taskType of requiredTaskTypes){
      const task=taskTypes?.[taskType]||{};
      const taskIds=unique((task?.reuse||[]).filter(row=>clean(row?.id).startsWith('external-black-box-')).map(row=>row.id)).sort();
      if(clean(task?.authority)!=='verified-task-playbook'||taskIds.length!==ids.length||!ids.every(id=>taskIds.includes(id)))throw new Error('ROBLOX_VERIFIED_EXTERNAL_LEARNING_TASK_SET_INVALID:'+taskType);
    }
    if(!complete)throw new Error('ROBLOX_VERIFIED_EXTERNAL_LEARNING_CONTENT_INCOMPLETE');
  }
  return Object.freeze({
    rows:Object.freeze(rows.map(row=>Object.freeze({...row}))),
    ids:Object.freeze([...ids]),
    contentIds:Object.freeze([...contentIds]),
    retrievedCount:ids.length,
    appliedCount:contentIds.length,
    coveragePct,
    distilledContentComplete:complete,
    truncationForbidden:playbooks?.policy?.verifiedExternalBlackBoxTruncationForbidden===true,
    fingerprint:ids.length?stableHash(JSON.stringify(rows)):null
  });
}

const ALL_KINDS=Object.freeze(['PUZZLE','MOVEMENT','COMBAT','DEFENSE','PROGRESSION','SURVIVAL','ECONOMY','SOCIAL','OBJECTIVE']);

const GAME_DEVELOPMENT_RULES=Object.freeze([
  {
    id:'compact-tactical-state-with-immediate-feedback',
    match:'compact-tactical-state-with-immediate-feedback',
    kinds:ALL_KINDS,
    domains:['CORE_GAMEPLAY_FEEL','PLAYER_INPUT_AND_TOUCH','VISIBLE_ACTION_FEEDBACK','HUD_AND_CONTEXTUAL_GUIDANCE','MOBILE_READABILITY_AND_RESPONSE'],
    mapping:kind=>kind==='DEFENSE'?'Keep wave and placement state beside the active tower action and acknowledge the server-confirmed action immediately.':kind==='PUZZLE'?'Keep board state beside the active puzzle action and acknowledge the server-confirmed move immediately.':'Keep the primary game state beside the active action and acknowledge the server-confirmed action immediately.',
    implementation:kind=>kind==='DEFENSE'?'variant-specific wave/base cue bound to LastApprovedScope':kind==='PUZZLE'?'variant-specific puzzle-chain cue bound to LastApprovedScope':'variant-specific action cue bound to LastApprovedScope'
  },
  {
    id:'persistent-primary-rpg-navigation',
    match:'persistent-primary-rpg-navigation',
    kinds:['PROGRESSION','ECONOMY','OBJECTIVE','SOCIAL'],
    domains:['HUD_AND_CONTEXTUAL_GUIDANCE','PROGRESSION_RISK_READABILITY','REWARD_AND_EVENT_PRESENTATION'],
    mapping:kind=>kind==='ECONOMY'?'Keep resource and upgrade context visible around the primary economy action.':kind==='SOCIAL'?'Keep shared role and session context visible around the primary social action.':'Keep level, progression, and next-step context visible around the primary action.',
    implementation:kind=>'persistent context cue uses existing Config.Actions and replicated player attributes'
  },
  {
    id:'danger-and-level-gating-visible-before-commitment',
    match:'danger-and-level-gating-visible-before-commitment',
    kinds:['PROGRESSION','SURVIVAL','DEFENSE','COMBAT','OBJECTIVE'],
    domains:['PROGRESSION_RISK_READABILITY','HUD_AND_CONTEXTUAL_GUIDANCE','VISIBLE_ACTION_FEEDBACK'],
    mapping:kind=>kind==='DEFENSE'?'Show wave and base-health risk before tower placement is committed.':kind==='SURVIVAL'?'Show health and threat risk before the next survival action is committed.':'Show level and risk context before the next action is committed.',
    implementation:kind=>'pre-action risk cue reads existing replicated state; it never grants authority'
  },
  {
    id:'touch-look-produces-immediate-spatial-feedback',
    match:'touch-look-produces-immediate-spatial-feedback',
    kinds:['MOVEMENT','COMBAT','SURVIVAL','OBJECTIVE','SOCIAL'],
    domains:['PLAYER_INPUT_AND_TOUCH','CAMERA_RESPONSE','VISIBLE_ACTION_FEEDBACK','MOBILE_READABILITY_AND_RESPONSE'],
    mapping:kind=>kind==='COMBAT'?'Give attack direction and target-space feedback at the moment the action is confirmed.':kind==='SURVIVAL'?'Give threat-space feedback at the moment the survival action is confirmed.':'Give spatial feedback at the moment the touch action is confirmed.',
    implementation:kind=>'variant-specific camera or spatial cue follows LastApprovedScope'
  },
  {
    id:'persistent-core-state-around-world-view',
    match:'persistent-core-state-around-world-view',
    kinds:ALL_KINDS,
    domains:['WORLD_AND_BACKGROUND_PRESENTATION','HUD_AND_CONTEXTUAL_GUIDANCE','CORE_GAMEPLAY_FEEL'],
    mapping:kind=>kind==='PUZZLE'?'Keep board progress visible while the puzzle world remains readable.':kind==='ECONOMY'?'Keep resource progress visible while the economy world remains readable.':'Keep the core state visible while the game world remains readable.',
    implementation:kind=>'world-view cue reuses the existing HUD state and does not replace the game camera'
  },
  {
    id:'movement-needs-immediate-visible-response',
    match:'movement-needs-immediate-visible-response',
    kinds:['MOVEMENT','COMBAT','SURVIVAL','OBJECTIVE'],
    domains:['CHARACTER_NPC_CREATURE_ANIMATION','MOTION_AND_TRANSITIONS','PLAYER_INPUT_AND_TOUCH','VISIBLE_ACTION_FEEDBACK'],
    mapping:kind=>kind==='MOVEMENT'?'Show movement direction and transition response immediately after input.':kind==='COMBAT'?'Show attack motion transition immediately after input.':'Show the player action transition immediately after input.',
    implementation:kind=>'variant-specific motion response is client feedback only and follows authoritative state'
  },
  {
    id:'persistent-contextual-action-controls',
    match:'persistent-contextual-action-controls',
    kinds:ALL_KINDS,
    domains:['HUD_AND_CONTEXTUAL_GUIDANCE','PLAYER_INPUT_AND_TOUCH','MOBILE_READABILITY_AND_RESPONSE'],
    mapping:kind=>kind==='PUZZLE'?'Keep contextual puzzle actions anchored beside the active board region.':'Keep contextual actions anchored beside the active game state.',
    implementation:kind=>'touch-sized contextual buttons remain bound to existing RemoteEvent action ids'
  },
  {
    id:'immediate-spatially-anchored-input-feedback',
    match:'immediate-spatially-anchored-input-feedback',
    kinds:ALL_KINDS,
    domains:['PLAYER_INPUT_AND_TOUCH','VISIBLE_ACTION_FEEDBACK','CAMERA_RESPONSE'],
    mapping:kind=>kind==='PUZZLE'?'Anchor move feedback to the active puzzle control.':'Anchor input feedback to the active game control.',
    implementation:kind=>'control-local motion cue is separate from server authority and save state'
  },
  {
    id:'touch-instruction-near-first-play-state',
    match:'touch-instruction-near-first-play-state',
    kinds:ALL_KINDS,
    domains:['CONTEXTUAL_ONBOARDING','HUD_AND_CONTEXTUAL_GUIDANCE','MOBILE_READABILITY_AND_RESPONSE'],
    mapping:kind=>kind==='PUZZLE'?'Place the first-move instruction beside the first puzzle action.':'Place the first-play instruction beside the first game action.',
    implementation:kind=>'contextual instruction is rendered in the game-specific HUD variant'
  }
]);

function parsePrinciple(raw='',sourceLearningId=''){
  const text=clean(raw);
  const read=key=>text.match(new RegExp('(?:^|;)\\s*'+key+'=([^;]+)','i'))?.[1]?.trim()||'';
  const id=read('id')||('principle-'+stableHash(text));
  return Object.freeze({id,scope:read('scope')||'unspecified',lesson:read('lesson')||text,apply:read('apply')||text,raw:text,sourceLearningId});
}

function validationOnlyPrinciple(principle){
  const text=[principle.id,principle.scope,principle.lesson,principle.apply].join(' ').toLowerCase();
  return /android|apk|abi|artifact|hosted|emulator|ci[- ]?qa|qa[- ]?evidence|runtime[- ]?survival|automation|install|load window|before-after|separate from (the )?game entry|gameplay state distinct from selection|semantic-gameplay-input-plus-survival/.test(text);
}

function ruleForPrinciple(principle){
  const text=[principle.id,principle.scope,principle.lesson,principle.apply].join(' ').toLowerCase();
  return GAME_DEVELOPMENT_RULES.find(rule=>text.includes(rule.match))
    ||( /feedback|immediate visible response|visible response follows input/.test(text)
      ? Object.freeze({
          id:principle.id,
          kinds:ALL_KINDS,
          domains:['PLAYER_INPUT_AND_TOUCH','VISIBLE_ACTION_FEEDBACK','MOBILE_READABILITY_AND_RESPONSE'],
          mapping:kind=>kind==='PUZZLE'?'Keep the active puzzle control visibly responsive after input.':'Keep the active game control visibly responsive after input.',
          implementation:kind=>'game-specific local feedback follows the existing authoritative action',
          match:principle.id
        })
      : null);
}

function variantForKind(kind){
  return ({
    PUZZLE:'PUZZLE_STATE',
    DEFENSE:'DEFENSE_WAVE',
    COMBAT:'COMBAT_IMPACT',
    PROGRESSION:'PROGRESSION_RISK',
    ECONOMY:'ECONOMY_RESOURCE',
    SURVIVAL:'SURVIVAL_RISK',
    MOVEMENT:'MOVEMENT_SPATIAL',
    SOCIAL:'SOCIAL_CONTEXT',
    OBJECTIVE:'OBJECTIVE_GOAL'
  })[kind]||'OBJECTIVE_GOAL';
}
function colorForKind(kind){
  return ({
    PUZZLE:[255,205,92],
    DEFENSE:[255,148,74],
    COMBAT:[255,102,92],
    PROGRESSION:[156,132,255],
    ECONOMY:[92,214,166],
    SURVIVAL:[255,112,112],
    MOVEMENT:[92,190,255],
    SOCIAL:[238,170,255],
    OBJECTIVE:[255,220,124]
  })[kind]||[255,220,124];
}

function buildSemanticApplication({gameId='',profile={},rows=[]}={}){
  const kind=coreKind(profile);
  const byId=new Map();
  for(const row of rows)for(const raw of row.distilledApplicationPrinciples||[]){
    const parsed=parsePrinciple(raw,row.id);
    const previous=byId.get(parsed.id);
    if(previous){
      previous.sourceLearningIds=unique([...previous.sourceLearningIds,row.id]);
    }else{
      byId.set(parsed.id,{...parsed,sourceLearningIds:[row.id]});
    }
  }
  const dispositions=[];
  const mappings=[];
  for(const principle of byId.values()){
    if(validationOnlyPrinciple(principle)){
      dispositions.push(Object.freeze({
        principleId:principle.id,sourceLearningId:principle.sourceLearningIds[0],sourceLearningIds:Object.freeze([...principle.sourceLearningIds]),
        disposition:'VALIDATION_ONLY',scope:principle.scope,domains:Object.freeze([]),mapping:'',implementation:'QA/Android/runtime validation only; not emitted into Roblox game source.',reason:'QA_OR_PLATFORM_INFRASTRUCTURE'
      }));
      continue;
    }
    const rule=ruleForPrinciple(principle);
    if(!rule){
      dispositions.push(Object.freeze({
        principleId:principle.id,sourceLearningId:principle.sourceLearningIds[0],sourceLearningIds:Object.freeze([...principle.sourceLearningIds]),
        disposition:'FAIL_CLOSED',scope:principle.scope,domains:Object.freeze([]),mapping:'',implementation:'',reason:'NO_GAME_SPECIFIC_SEMANTIC_RULE'
      }));
      continue;
    }
    if(!rule.kinds.includes(kind)){
      dispositions.push(Object.freeze({
        principleId:principle.id,sourceLearningId:principle.sourceLearningIds[0],sourceLearningIds:Object.freeze([...principle.sourceLearningIds]),
        disposition:'NOT_APPLICABLE',scope:principle.scope,domains:Object.freeze([]),mapping:'',implementation:'',reason:'CORE_KIND_NOT_APPLICABLE'
      }));
      continue;
    }
    const mapping=Object.freeze({
      principleId:principle.id,
      sourceLearningId:principle.sourceLearningIds[0],
      sourceLearningIds:Object.freeze([...principle.sourceLearningIds]),
      coreKind:kind,
      disposition:'APPLIED_GAME_SOURCE',
      scope:principle.scope,
      domains:Object.freeze(unique(rule.domains)),
      domain:rule.domains[0],
      mapping:rule.mapping(kind),
      implementation:rule.implementation(kind),
      variant:variantForKind(kind),
      raw:principle.raw
    });
    mappings.push(mapping);
    dispositions.push(mapping);
  }
  const failClosed=dispositions.filter(row=>row.disposition==='FAIL_CLOSED');
  return Object.freeze({
    kind,
    mappings:Object.freeze(mappings),
    dispositions:Object.freeze(dispositions),
    failClosed:Object.freeze(failClosed),
    validationOnly:Object.freeze(dispositions.filter(row=>row.disposition==='VALIDATION_ONLY')),
    notApplicable:Object.freeze(dispositions.filter(row=>row.disposition==='NOT_APPLICABLE')),
    variant:variantForKind(kind),
    color:Object.freeze(colorForKind(kind)),
    mappingFingerprint:stableHash(JSON.stringify({version:ROBLOX_SEMANTIC_MAPPING_VERSION,gameId,kind,mappings}))
  });
}

export function createRobloxVibe3LearningContext({gameId='',profile={},artbook={},playbooks={},recombination={},distillation={}}={}){
  const roblox=playbooks?.taskTypes?.roblox||{};
  const coding=playbooks?.taskTypes?.coding||{};
  const checklist=unique([...(roblox.checklist||[]),...(coding.checklist||[])]);
  const reuseRows=[...(roblox.reuse||[]),...(coding.reuse||[])];
  const reuseProjects=unique(reuseRows.map(row=>row?.project));
  const verifiedExternalContract=verifiedExternalBlackBoxPlaybookContract(playbooks);
  const verifiedExternalReuseRows=[...verifiedExternalContract.rows];
  const verifiedExternalPlaybookIds=[...verifiedExternalContract.ids];
  const verifiedExternalContentIds=[...verifiedExternalContract.contentIds];
  const verifiedExternalDistilledContentComplete=verifiedExternalContract.distilledContentComplete;
  const verifiedExternalLearningCoveragePct=verifiedExternalContract.coveragePct;
  const effectiveProfile=profile?.genre?profile:existingRobloxGameLearningProfile(gameId);
  const kind=coreKind(effectiveProfile);
  const semantic=buildSemanticApplication({gameId,profile:effectiveProfile,rows:verifiedExternalReuseRows});
  const verifiedExternalLearningPrinciples=Object.freeze(semantic.mappings.map(row=>row.raw));
  const verifiedExternalGameDevelopmentPrinciples=Object.freeze([...verifiedExternalLearningPrinciples]);
  const verifiedExternalAvoidancePrinciples=unique(verifiedExternalReuseRows.flatMap(row=>row.distilledAvoidancePrinciples||[]));
  const verifiedExternalLearningUseAllowed=unique(verifiedExternalReuseRows.flatMap(row=>row.distilledLearningUseAllowed||[]));
  const verifiedExternalLearningUseForbidden=unique(verifiedExternalReuseRows.flatMap(row=>row.distilledLearningUseForbidden||[]));
  const recipes=(Array.isArray(recombination?.recipes)?recombination.recipes:[])
    .filter(recipe=>Array.isArray(recipe?.sourceProjects)&&new Set(recipe.sourceProjects.map(clean).filter(Boolean)).size>=2)
    .filter(recipe=>!(recipe.sourceProjects||[]).map(clean).includes(clean(gameId)));

  const terms={
    PUZZLE:['board','grid','combo','goal','puzzle','match','touch'],
    COMBAT:['combat','attack','damage','enemy','combo','cooldown','arena','server'],
    MOVEMENT:['movement','input','touch','position','session','checkpoint'],
    DEFENSE:['tower','wave','defense','resource','placement','progression'],
    PROGRESSION:['progression','level','upgrade','save','reward','growth'],
    SURVIVAL:['survival','wave','health','risk','session','enemy','save'],
    ECONOMY:['economy','resource','income','upgrade','progression','save'],
    SOCIAL:['social','shared','session','input','reward','progression','multiplayer'],
    OBJECTIVE:['goal','objective','session','progression','reward','input']
  }[kind]||['session','progression','input','reward'];

  const artbookText=JSON.stringify(artbook?.content||artbook||{}).toLowerCase();
  const profileText=[effectiveProfile?.genre,effectiveProfile?.subgenre,effectiveProfile?.playMode,artbookText].map(clean).join(' ').toLowerCase();
  const scored=recipes.map(recipe=>{
    const features=(recipe.featureBlend||[]).map(clean).filter(Boolean);
    const haystack=features.join(' ').toLowerCase();
    let score=terms.reduce((sum,term)=>sum+(haystack.includes(term)?2:0),0);
    score+=features.reduce((sum,feature)=>sum+(profileText.includes(feature.toLowerCase())?3:0),0);
    return{recipe,score,tie:stableHash(gameId+'|'+clean(recipe.id))};
  }).sort((a,b)=>b.score-a.score||a.tie.localeCompare(b.tie));
  const selected=scored[0]?.recipe||null;
  const featureBlend=unique(selected?.featureBlend||[]).slice(0,12);
  const sourceProjects=unique(selected?.sourceProjects||[]).slice(0,6);
  const distilled=selectDistilled(distillation?.records||[],{gameId,terms,profileText});
  const verifiedExternalLearningIds=unique(verifiedExternalPlaybookIds);
  const externalBlackBoxAdvisoryIds=unique(distilled.externalIds||[]);
  const verifiedExternalLearningApplyAxes=Object.freeze(unique(semantic.mappings.flatMap(row=>row.domains)));
  const verifiedExternalLearningDispositions=Object.freeze(semantic.dispositions.map(row=>Object.freeze({...row})));
  const verifiedExternalValidationOnlyPrinciples=Object.freeze(semantic.validationOnly.map(row=>row.raw||row.principleId));
  const verifiedExternalNotApplicablePrinciples=Object.freeze(semantic.notApplicable.map(row=>row.raw||row.principleId));
  const applied=verifiedExternalLearningIds.length>0
    &&verifiedExternalContentIds.length===verifiedExternalLearningIds.length
    &&semantic.mappings.length>0
    &&semantic.failClosed.length===0
    &&verifiedExternalLearningDispositions.length>0;

  return Object.freeze({
    applied,
    coreKind:kind,
    gameId:clean(gameId),
    profile:Object.freeze({...effectiveProfile}),
    playbookAuthority:clean(roblox.authority)||null,
    checklist:Object.freeze(checklist),
    reuseProjects:Object.freeze(reuseProjects),
    recipeId:clean(selected?.id)||null,
    transformationOperator:clean(selected?.transformationOperator)||null,
    featureBlend:Object.freeze(featureBlend),
    sourceProjects:Object.freeze(sourceProjects),
    distilledSourceIds:distilled.ids,
    distilledPatterns:distilled.patterns,
    distilledPrinciples:distilled.principles,
    verifiedExternalLearningIds:Object.freeze(verifiedExternalLearningIds),
    verifiedExternalLearningFingerprint:verifiedExternalContract.fingerprint,
    verifiedExternalLearningRetrievedCount:verifiedExternalLearningIds.length,
    verifiedExternalLearningAppliedCount:verifiedExternalContentIds.length,
    verifiedExternalLearningCoveragePct,
    verifiedExternalDistilledContentIds:Object.freeze(verifiedExternalContentIds),
    verifiedExternalDistilledContentComplete,
    verifiedExternalLearningApplyAxes,
    verifiedExternalLearningPrinciples,
    verifiedExternalGameDevelopmentPrinciples,
    verifiedExternalGameDevelopmentPrincipleCount:verifiedExternalGameDevelopmentPrinciples.length,
    verifiedExternalLearningSemanticMappingVersion:ROBLOX_SEMANTIC_MAPPING_VERSION,
    semanticMappingVersion:ROBLOX_SEMANTIC_MAPPING_VERSION,
    semanticMappingFingerprint:semantic.mappingFingerprint,
    semanticVariant:semantic.variant,
    semanticColor:Object.freeze({r:semantic.color[0],g:semantic.color[1],b:semantic.color[2]}),
    gameSpecificSemanticMappings:Object.freeze(semantic.mappings.map(row=>Object.freeze({...row}))),
    verifiedExternalLearningDispositions,
    verifiedExternalLearningDispositionCount:verifiedExternalLearningDispositions.length,
    verifiedExternalLearningRetrievedPrincipleCount:verifiedExternalLearningDispositions.length,
    verifiedExternalLearningGameDevelopmentAppliedCount:semantic.mappings.length,
    verifiedExternalValidationOnlyPrinciples,
    verifiedExternalValidationOnlyPrincipleCount:verifiedExternalValidationOnlyPrinciples.length,
    verifiedExternalNotApplicablePrinciples,
    verifiedExternalNotApplicablePrincipleCount:verifiedExternalNotApplicablePrinciples.length,
    allRetrievedPrinciplesHaveExplicitDisposition:verifiedExternalLearningDispositions.length>0&&semantic.failClosed.length===0,
    verifiedExternalRobloxNativeUseRequired:true,
    verifiedExternalAvoidancePrinciples:Object.freeze(verifiedExternalAvoidancePrinciples),
    verifiedExternalLearningUseAllowed:Object.freeze(verifiedExternalLearningUseAllowed),
    verifiedExternalLearningUseForbidden:Object.freeze(verifiedExternalLearningUseForbidden),
    verifiedExternalLearningFirst:true,
    verifiedExternalLearningTruncationForbidden:true,
    externalBlackBoxAdvisoryIds:Object.freeze(externalBlackBoxAdvisoryIds),
    externalBlackBoxAdvisoryUsed:distilled.externalAdvisoryUsed,
    crossGameDistillationUsed:distilled.crossGameUsed,
    freshQaRequiredForDistilledTransfer:distilled.freshQaRequired,
    originalModifierRequired:selected?.internalCreationRequirement==='ADD_PROJECT_SPECIFIC_ORIGINAL_MECHANIC_OR_CONSTRAINT',
    rawSourceOutputAllowed:false,
    rawAssetOutputAllowed:false,
    externalExpressionCopyAllowed:false,
    qaInfrastructurePrinciplesNotAppliedToGameSource:true,
    serverAuthorityChanged:false,
    sourceMutationRequired:true,
    artbookIdentity:clean(artbook?.content?.identity||artbook?.gameName)||null,
    authority:applied?'vibe3-roblox-learning-context':'roblox-baseline-only'
  });
}

export function decorateRobloxActionsWithLearning(actions=[],learning={}){
  const patterns=unique([
    ...(learning?.verifiedExternalLearningPrinciples||[]),
    ...(learning?.featureBlend||[]),
    ...(learning?.distilledPatterns||[])
  ]);
  return actions.map((action,index)=>Object.freeze({
    ...action,
    learningPattern:clean(patterns[index%Math.max(1,patterns.length)])||null
  }));
}
