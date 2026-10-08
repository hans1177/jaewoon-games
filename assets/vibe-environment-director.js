// 파일명: assets/vibe-environment-director.js
// 역할: 세계관/맵/사물/배경/날씨를 사실적 원인-반응과 제한된 물리·화학 상호작용으로 표현하는 결정론적 환경 Director
// 절대 규칙: 개발/디자인 AI 사용 금지. 게임 런타임 AI만 허용. 물리·화학 표현은 기존 충돌/데미지/스폰/진행/밸런스/저장 규칙을 임의 변경하지 않음.

const clamp=n=>Math.max(0,Math.min(100,Math.round(n)));
const uniq=a=>[...new Set((a||[]).filter(Boolean))];
const textOf=files=>files.map(x=>`${x.path||''}\n${x.source??x.current??''}`).join('\n').toLowerCase();
const SIGNALS=Object.freeze({far:['sky','far','horizon','backdrop'],mid:['parallax','midground','mountain','building','tree'],gameplay:['ground','tilemap','arena','platform','path'],foreground:['foreground','foliage','grass','debris','frame'],atmosphere:['fog','dust','rain','snow','mist','ambient','weather'],lighting:['light','shadow','glow','shader','gradient','modulate'],variation:['random','variant','scatter','seed','noise'],life:['bird','insect','leaf','cloud','wind','water','ambient']});
const WORLD_DOMAINS=Object.freeze(['geography','climate','ecology','faction','culture','economy','technology','history','danger','resource','architecture','ritual']);
export function auditVibeEnvironment(files=[]){const text=textOf(files),rows=[];for(const[name,hints]of Object.entries(SIGNALS)){const hits=hints.filter(x=>text.includes(x)).length,score=clamp(hits/hints.length*100);rows.push(Object.freeze({layer:name,score,debt:100-score,priority:score<25?'critical':score<50?'high':score<75?'medium':'low'}))}rows.sort((a,b)=>b.debt-a.debt);const overall=clamp(rows.reduce((n,x)=>n+x.score,0)/(rows.length||1));return Object.freeze({score:overall,grade:overall>=85?'A':overall>=70?'B':overall>=50?'C':'D',layers:Object.freeze(rows),priority:Object.freeze(rows.slice(0,4).map(x=>x.layer))})}
export function createVibeWorldDNA(world={}){const values={};for(const d of WORLD_DOMAINS)values[d]=world[d]||'';return Object.freeze({name:world.name||'world',premise:world.premise||'',domains:Object.freeze(values),laws:Object.freeze(uniq(world.laws||[])),visualAnchors:Object.freeze(uniq(world.visualAnchors||[])),materialAnchors:Object.freeze(uniq(world.materials||[])),protected:Object.freeze(['game-rules','stats','save','progression','spawn-rules'])})}
export function createVibeRegionWorldProfile(region={},world={}){const dna=createVibeWorldDNA(world);return Object.freeze({name:region.name||'region',world:dna.name,biome:region.biome||dna.domains.geography,climate:region.climate||dna.domains.climate,faction:region.faction||'',resources:Object.freeze(uniq(region.resources||[])),danger:region.danger||dna.domains.danger,historyMark:region.history||dna.domains.history,architecture:region.architecture||dna.domains.architecture,ecology:region.ecology||dna.domains.ecology,landmark:region.landmark||''})}
export function createVibeWorldConsistencyGraph({world={},regions=[],factions=[],species=[]}={}){const dna=createVibeWorldDNA(world),nodes=[{type:'world',id:dna.name}],edges=[];for(const r of regions)nodes.push({type:'region',id:r.name,world:dna.name});for(const f of factions)nodes.push({type:'faction',id:f.name,region:f.region||'',world:dna.name});for(const s of species)nodes.push({type:'species',id:s.name,habitat:s.habitat||'',world:dna.name});for(const n of nodes.slice(1))edges.push({from:dna.name,to:n.id,relation:'world-dna'});return Object.freeze({nodes:Object.freeze(nodes),edges:Object.freeze(edges),rule:'every-visible-element-needs-world-or-game-cause'})}
export function createVibeWorldVisualRules(world={}){const dna=createVibeWorldDNA(world);return Object.freeze({materials:dna.materialAnchors,anchors:dna.visualAnchors,propRules:Object.freeze(['local-material-or-explanation','wear-reflects-history','technology-matches-world']),ecologyRules:Object.freeze(['species-match-habitat','resources-have-source','danger-has-evidence'])})}
export function scoreVibeWorldConsistency({elements=[],world={}}={}){const dna=createVibeWorldDNA(world),anchors=[...dna.visualAnchors,...dna.materialAnchors,...Object.values(dna.domains).filter(Boolean)].map(x=>String(x).toLowerCase()),rows=elements.map(e=>{const text=JSON.stringify(e).toLowerCase(),matches=anchors.filter(a=>a&&text.includes(a)).length,score=clamp(35+Math.min(45,matches*10)+(e.reason||e.gameplayReason||e.worldReason?20:0));return Object.freeze({id:e.id||e.name||'element',score,pass:score>=65})});return Object.freeze({score:clamp(rows.reduce((n,x)=>n+x.score,0)/Math.max(1,rows.length)),rows:Object.freeze(rows),pass:rows.every(x=>x.pass)})}
const REFERENCE_MAP_SOURCE_TYPES=Object.freeze(['USER_PROVIDED_OR_OWNED_IMAGE','PUBLIC_DOMAIN_IMAGE','CLEARLY_LICENSED_REFERENCE','VERIFIED_INTERNAL_GAME_RUNTIME','ABSTRACTED_MULTI_REFERENCE_ANALYSIS']);
const REFERENCE_STRUCTURE_FIELDS=Object.freeze(['RIDGE_AND_VALLEY_FLOW','ROAD_AND_PATH_GRAPH','OPEN_SPACE_DENSITY','OBSTACLE_CLUSTERING','LANDMARK_HIERARCHY','VEGETATION_DENSITY','URBAN_BLOCK_RHYTHM','CHOKE_AND_RELEASE','SAFE_DANGER_ZONE_RELATION','SIGHTLINE_AND_REVEAL']);
const REFERENCE_ASSET_FIELDS=Object.freeze(['SILHOUETTE','PROPORTIONS','MATERIAL_REGIONS','PALETTE','CONSTRUCTION_DETAILS','STYLE_LANGUAGE','IDENTITY_ANCHORS','UNSEEN_REGIONS','MOTION_DESIGN']);
const MAP_DNA_FIELDS=Object.freeze(['BIOME','ELEVATION_STYLE','ROAD_STYLE','LANDMARK_STYLE','DENSITY','COMBAT_OPENNESS','RESOURCE_DISTRIBUTION','DANGER_CURVE','VISUAL_MOOD','SETTLEMENT_PATTERN','WATER_PATTERN','RUIN_LEVEL','ROUTE_BRANCHING','VERTICALITY','TRAVERSAL_LANGUAGE','STORY_CONTEXT']);
export function createVibeReferenceImageStudyRequest({sourceId='',sourceType='ABSTRACTED_MULTI_REFERENCE_ANALYSIS',imageRef='',sourceHash='',rights={},purpose='MAP_STRUCTURE'}={}){
  const type=String(sourceType||'').toUpperCase(),id=String(sourceId||'').trim(),ref=String(imageRef||'').trim();
  const sourceAllowed=REFERENCE_MAP_SOURCE_TYPES.includes(type);
  const rightsVerified=type==='USER_PROVIDED_OR_OWNED_IMAGE'||type==='PUBLIC_DOMAIN_IMAGE'||type==='VERIFIED_INTERNAL_GAME_RUNTIME'||(type==='CLEARLY_LICENSED_REFERENCE'&&rights.licenseVerified===true)||(type==='ABSTRACTED_MULTI_REFERENCE_ANALYSIS'&&rights.sourceSetVerified===true);
  const assetCreation=['ASSET_CREATION','MAP_RECONSTRUCTION'].includes(String(purpose).toUpperCase());
  const mapReconstruction=String(purpose).toUpperCase()==='MAP_RECONSTRUCTION';
  const ready=Boolean(id&&sourceAllowed&&rightsVerified&&(!assetCreation||ref));
  return Object.freeze({
    sourceId:id||null,sourceType:type,imageRef:ref||null,purpose:String(purpose||'MAP_STRUCTURE').toUpperCase(),
    sourceHash:String(sourceHash||'').trim()||null,
    ready,blockedReason:ready?null:!id?'SOURCE_ID_REQUIRED':assetCreation&&!ref?'IMAGE_REF_REQUIRED':!sourceAllowed?'SOURCE_TYPE_NOT_ALLOWED':'RIGHTS_OR_PROVENANCE_NOT_VERIFIED',
    requestedFields:mapReconstruction?Object.freeze([...REFERENCE_ASSET_FIELDS,...REFERENCE_STRUCTURE_FIELDS]):assetCreation?REFERENCE_ASSET_FIELDS:REFERENCE_STRUCTURE_FIELDS,
    observationMode:assetCreation?'VISIBLE_ASSET_FEATURES_WITH_SEPARATE_CREATIVE_COMPLETION':'STRUCTURAL_ONLY',
    pixelObservationRequired:assetCreation,
    unseenGeometryAndMotionAreDesignProposals:assetCreation,
    rawImagePersistentLearningAllowed:false,
    directMapLayoutCopyAllowed:false,
    directLandmarkCopyAllowed:false,
    sourceRightsAndProvenanceRequired:true,
    modelObservationAuthority:'PROPOSAL_UNTIL_VERIFIED_AGAINST_SOURCE'
  });
}
export function bindVibeReferenceImageObservation({request={},observation={},verifiedAgainstSource=false}={}){
  const requested=new Set(request.requestedFields||REFERENCE_STRUCTURE_FIELDS),features={};
  const map={
    RIDGE_AND_VALLEY_FLOW:'ridgeValleyFlow',ROAD_AND_PATH_GRAPH:'roadPathGraph',OPEN_SPACE_DENSITY:'openSpaceDensity',
    OBSTACLE_CLUSTERING:'obstacleClustering',LANDMARK_HIERARCHY:'landmarkHierarchy',VEGETATION_DENSITY:'vegetationDensity',
    URBAN_BLOCK_RHYTHM:'urbanBlockRhythm',CHOKE_AND_RELEASE:'chokeRelease',SAFE_DANGER_ZONE_RELATION:'safeDangerRelation',
    SIGHTLINE_AND_REVEAL:'sightlineReveal'
  };
  const assetCreation=['ASSET_CREATION','MAP_RECONSTRUCTION'].includes(request.purpose);
  if(assetCreation)for(const key of REFERENCE_ASSET_FIELDS)map[key]=key;
  for(const [key,target] of Object.entries(map))if(requested.has(key)&&typeof observation[key]==='string')features[target]=observation[key].trim();
  const sourceBound=Boolean(request?.sourceId)&&(!assetCreation||(observation.sourceId===request.sourceId&&observation.imageRef===request.imageRef&&Boolean(request.sourceHash)&&observation.sourceHash===request.sourceHash));
  const observationCount=Object.values(features).filter(Boolean).length,valid=Boolean(request?.ready&&sourceBound&&(assetCreation?REFERENCE_ASSET_FIELDS.every(key=>features[key]):observationCount>=3));
  return Object.freeze({
    sourceId:request.sourceId||null,sourceType:request.sourceType||null,valid,verifiedAgainstSource:valid&&verifiedAgainstSource===true,
    observationCount,features:Object.freeze(features),
    sourceHash:request.sourceHash||null,imageRef:request.imageRef||null,
    creativeCompletion:assetCreation?Object.freeze({unseenRegions:features.UNSEEN_REGIONS||'',motionDesign:features.MOTION_DESIGN||'',observedGeometry:false,observedAnimation:false}):null,
    usableForGenerationProposal:valid,
    positiveLearningEligible:valid&&verifiedAgainstSource===true,
    rawImageStored:false,directLayoutCopyAllowed:false,directLandmarkCopyAllowed:false,
    learningUnit:'VERIFIED_ABSTRACT_STRUCTURAL_TECHNIQUE_ONLY'
  });
}
export function createVibeGenreWorldGrammar({genre='ADAPTIVE'}={}){
  const g=String(genre||'ADAPTIVE').toUpperCase();
  const profiles={
    SURVIVAL:['SAFE_START','RESOURCE_RING','RISK_GRADIENT','REVISIT_ROUTE','SHELTER_EXPANSION','DANGER_LANDMARK'],
    RPG:['HUB','FIELD_ROUTE','OPTIONAL_BRANCH','DUNGEON_GATE','SHORTCUT','BOSS_APPROACH','RETURN_PATH'],
    ACTION_RPG:['COMBAT_ARENA','FLANK_ROUTE','VERTICAL_OPTION','SHORTCUT','BOSS_APPROACH','RECOVERY_SPACE'],
    ROGUELIKE:['BRANCH','RISK_REWARD_DETOUR','RECONNECT','SAFE_BREAK','ELITE_SPACE','BOSS_GATE'],
    DEFENSE:['SPAWN_LANE','CHOKE','BUILD_ZONE','CROSS_LANE_OPTION','DEFENSE_DEPTH','CORE_APPROACH'],
    TYCOON:['ENTRY','PRIMARY_PATH_LOOP','SERVICE_BRANCH','QUEUE_SPACE','EXPANSION_PARCEL','EXIT_OR_RETURN'],
    OPEN_WORLD:['LANDMARK_NETWORK','MULTIPLE_APPROACHES','REGION_GATE','TRAVEL_CORRIDOR','DISCOVERY_DETOUR','FAST_RETURN'],
    DUNGEON:['ENTRY','KEY_GATE','COMBAT_ROOM','PUZZLE_OR_INTERACTION','SHORTCUT','BOSS_ROOM','EXIT'],
    PUZZLE:['READABLE_ENTRY','CLUE_SPACE','GATED_PATH','EXPERIMENT_SPACE','SOLUTION_REVEAL','RETURN_OR_EXIT'],
    CASUAL:['CLEAR_MAIN_PATH','OPTIONAL_REWARD','LOW_FRICTION_LOOP','VISIBLE_GOAL','SHORT_RETURN'],
    HORROR:['SAFE_ENTRY','LIMITED_SIGHTLINE','FALSE_BRANCH','KEY_GATE','ESCAPE_LOOP','REVEAL_SPACE','SAFE_RETURN'],
    SIMULATION:['FUNCTIONAL_ZONE','SERVICE_ROUTE','WORKFLOW_LOOP','EXPANSION_ZONE','OBSERVATION_SPACE']
  };
  const matched=Object.keys(profiles).sort((a,b)=>b.length-a.length).find(key=>g===key||g.includes(key))||'RPG';
  return Object.freeze({
    genre:g,
    family:matched,
    routeRoles:Object.freeze(profiles[matched]),
    channels:Object.freeze(['MAIN_ROUTE','OPTIONAL_ROUTE','SAFE_ZONE','DANGER_ZONE','RESOURCE_ZONE','ENCOUNTER_SPACE','LANDMARK','SETTLEMENT','DUNGEON','SHORTCUT','REVISIT','SIGHTLINE','VERTICALITY']),
    sameMacroPatternAcrossGenresForbidden:true,
    lockedGameRulesWin:true,
    gameplayAuthority:false
  });
}
export function summarizeVibeVerifiedWorldLearning({events=[]}={}){
  const stats={routeUsage:0,navigationFailures:0,softlocks:0,encounterOutcomes:0,landmarkDiscoveries:0,routeAbandonments:0,revisits:0,streamingHitches:0,mobileBudgetFailures:0,verifiedPasses:0,verifiedFailures:0};
  const reasons=new Set();
  for(const event of events||[]){
    const type=String(event.type||'').toUpperCase(),verified=event.verified===true||event.verifiedRuntimePass===true||event.verifiedRuntimeFailure===true;
    if(!verified)continue;
    if(type.includes('ROUTE_USAGE'))stats.routeUsage+=Math.max(1,Number(event.count)||1);
    if(type.includes('NAVIGATION_FAILURE'))stats.navigationFailures++;
    if(type.includes('SOFTLOCK'))stats.softlocks++;
    if(type.includes('ENCOUNTER_SPACE'))stats.encounterOutcomes++;
    if(type.includes('LANDMARK_DISCOVERY'))stats.landmarkDiscoveries++;
    if(type.includes('ROUTE_ABANDON'))stats.routeAbandonments++;
    if(type.includes('REVISIT'))stats.revisits++;
    if(type.includes('STREAMING_HITCH'))stats.streamingHitches++;
    if(type.includes('MOBILE_FRAME')||type.includes('MOBILE_BUDGET'))stats.mobileBudgetFailures++;
    if(event.verifiedRuntimePass===true)stats.verifiedPasses++;
    if(event.verifiedRuntimeFailure===true){stats.verifiedFailures++;if(event.failureReason)reasons.add(String(event.failureReason).toUpperCase());}
  }
  return Object.freeze({
    stats:Object.freeze(stats),
    failureReasons:Object.freeze([...reasons]),
    positiveLearningEligible:stats.verifiedPasses>0,
    negativeLearningEligible:stats.verifiedFailures>0,
    rawTelemetryDirectTrainingAllowed:false,
    existingCanonicalLearningChainOnly:true
  });
}

const WORLD_PATTERN_TECHNIQUE_FIELDS=Object.freeze(['GENRE_FAMILY','ROUTE_GRAMMAR','ENCOUNTER_RHYTHM','LANDMARK_REVEAL','SAFE_DANGER_RELATION','REVISIT_PATTERN','STREAMING_STRATEGY','CHOKE_OPEN_SPACE_RHYTHM']);
function safeWorldTechniqueValue(value){
  const text=String(value??'').trim();
  if(!text||text.length>120)return null;
  if(/\b(?:x|y|z|lat|lon|lng|latitude|longitude)\s*[:=]\s*-?\d+(?:\.\d+)?/i.test(text))return null;
  if(/-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?/.test(text))return null;
  const numbers=text.match(/-?\d+(?:\.\d+)?/g)||[];
  if(numbers.length>3)return null;
  if(/[\[\]{}]/.test(text)&&numbers.length>0)return null;
  if(/terrain.?mesh|vertex|vertices|exact.?layout|node.?coordinates?|world.?position/i.test(text))return null;
  return text;
}
export function distillVibeVerifiedWorldPatterns({events=[],minimumIndependentGames=2}={}){
  const groups=new Map();
  const min=Math.max(2,Number(minimumIndependentGames)||2);
  for(const event of events||[]){
    const gameId=String(event.gameId||'').trim();
    const verified=event.verified===true||event.verifiedRuntimePass===true||event.verifiedRuntimeFailure===true;
    if(!gameId||!verified)continue;
    const source=event.technique||event.pattern||{};
    const technique={};
    for(const field of WORLD_PATTERN_TECHNIQUE_FIELDS){
      const camel=field.toLowerCase().replace(/_([a-z])/g,(_,m)=>m.toUpperCase());
      const value=source[field]??source[camel]??event[field]??event[camel];
      const safe=safeWorldTechniqueValue(value);
      if(safe)technique[field]=safe;
    }
    const suppliedCount=WORLD_PATTERN_TECHNIQUE_FIELDS.filter(field=>{
      const camel=field.toLowerCase().replace(/_([a-z])/g,(_,m)=>m.toUpperCase());
      return source[field]!=null||source[camel]!=null||event[field]!=null||event[camel]!=null;
    }).length;
    const rejectedFieldCount=Math.max(0,suppliedCount-Object.keys(technique).length);
    if(Object.keys(technique).length<2)continue;
    const signature=JSON.stringify(Object.fromEntries(Object.entries(technique).sort(([a],[b])=>a.localeCompare(b))));
    if(!groups.has(signature))groups.set(signature,{technique,passGames:new Set(),failGames:new Set(),failureReasons:new Set(),rejectedFieldCount:0});
    groups.get(signature).rejectedFieldCount=Math.max(groups.get(signature).rejectedFieldCount,rejectedFieldCount);
    const row=groups.get(signature);
    if(event.verifiedRuntimeFailure===true){
      row.failGames.add(gameId);
      if(event.failureReason)row.failureReasons.add(String(event.failureReason).toUpperCase());
    }else if(event.verifiedRuntimePass===true||event.outcome==='PASS'){
      row.passGames.add(gameId);
    }
  }
  const candidates=[];
  for(const [signature,row] of groups.entries()){
    const passGames=[...row.passGames],failGames=[...row.failGames];
    const reusable=passGames.length>=min&&failGames.length===0;
    const avoidCandidate=failGames.length>=min;
    candidates.push(Object.freeze({
      signature,
      technique:Object.freeze({...row.technique}),
      sourceGameCount:new Set([...passGames,...failGames]).size,
      verifiedPassGameCount:passGames.length,
      verifiedFailureGameCount:failGames.length,
      scope:reusable||avoidCandidate?'CROSS_GAME_CANDIDATE':'GAME_SCOPED_ONLY',
      crossGameReuseEligible:reusable,
      avoidCandidate,
      failureReasons:Object.freeze([...row.failureReasons]),
      exactCoordinatesStored:false,
      exactLayoutStored:false,
      rawTelemetryStored:false,
      rejectedFieldCount:row.rejectedFieldCount,
      exactCoordinateLikeValuesRejected:row.rejectedFieldCount>0,
      directMasteryCredit:false
    }));
  }
  return Object.freeze({
    minimumIndependentGames:min,
    fields:WORLD_PATTERN_TECHNIQUE_FIELDS,
    candidates:Object.freeze(candidates),
    reusable:Object.freeze(candidates.filter(row=>row.crossGameReuseEligible)),
    avoid:Object.freeze(candidates.filter(row=>row.avoidCandidate)),
    singleGamePatternsRemainGameScoped:true,
    exactMapSpecificValuesReusable:false,
    existingCanonicalLearningChainOnly:true
  });
}

export function createVibeReferenceMapAbstraction({sourceType='ABSTRACTED_MULTI_REFERENCE_ANALYSIS',sourceId='',features={},verifiedAgainstSource=false}={}){const type=String(sourceType||'').toUpperCase(),allowed=REFERENCE_MAP_SOURCE_TYPES.includes(type),safeFeatures={ridgeValleyFlow:features.ridgeValleyFlow||'',roadPathGraph:features.roadPathGraph||'',openSpaceDensity:features.openSpaceDensity||'',obstacleClustering:features.obstacleClustering||'',landmarkHierarchy:features.landmarkHierarchy||'',vegetationDensity:features.vegetationDensity||'',urbanBlockRhythm:features.urbanBlockRhythm||'',chokeRelease:features.chokeRelease||'',safeDangerRelation:features.safeDangerRelation||'',sightlineReveal:features.sightlineReveal||''};return Object.freeze({sourceId:String(sourceId||'').trim()||null,sourceType:type,allowed,features:Object.freeze(safeFeatures),verifiedAgainstSource:verifiedAgainstSource===true,rawReferenceStored:false,directLayoutCopyAllowed:false,directLandmarkCopyAllowed:false,learningUnit:verifiedAgainstSource===true?'VERIFIED_ABSTRACT_STRUCTURAL_TECHNIQUE_ONLY':'ABSTRACT_STRUCTURAL_TECHNIQUE_PROPOSAL_ONLY'})}
export function createVibeMapDNA({map={},region={},concept={},reference={}}={}){const ref=reference.features||reference,values={BIOME:map.biome||region.biome||'',ELEVATION_STYLE:map.elevationStyle||ref.ridgeValleyFlow||'adaptive',ROAD_STYLE:map.roadStyle||ref.roadPathGraph||'gameplay-led',LANDMARK_STYLE:map.landmarkStyle||ref.landmarkHierarchy||region.landmark||'region-identity',DENSITY:map.density||ref.openSpaceDensity||'adaptive',COMBAT_OPENNESS:map.combatOpenness||'mixed',RESOURCE_DISTRIBUTION:map.resourceDistribution||'world-causal',DANGER_CURVE:map.dangerCurve||ref.safeDangerRelation||'progressive',VISUAL_MOOD:map.visualMood||concept.mood||'',SETTLEMENT_PATTERN:map.settlementPattern||ref.urbanBlockRhythm||'contextual',WATER_PATTERN:map.waterPattern||'',RUIN_LEVEL:map.ruinLevel||'contextual',ROUTE_BRANCHING:map.routeBranching||ref.chokeRelease||'branch-with-return',VERTICALITY:map.verticality||'adaptive',TRAVERSAL_LANGUAGE:map.traversalLanguage||'gameplay-readable',STORY_CONTEXT:map.storyContext||region.history||''};return Object.freeze({name:map.name||'map',fields:Object.freeze(values),fieldNames:MAP_DNA_FIELDS,protected:Object.freeze(['collision','navigation','spawn-points','wave-path','objective-position','quest-requirements','save-meaning','balance'])})}
export function createVibeRouteGraph({mapDna={},nodes=[],edges=[]}={}){const safeNodes=(nodes.length?nodes:[{id:'START',role:'spawn'},{id:'LANDMARK',role:'landmark'},{id:'OBJECTIVE',role:'objective'},{id:'EXIT',role:'transition'}]).map((n,i)=>Object.freeze({id:String(n.id||'NODE_'+i),role:String(n.role||'route'),required:n.required!==false}));const ids=new Set(safeNodes.map(n=>n.id)),startNode=safeNodes.find(n=>/spawn|start|entry/i.test(n.role))||safeNodes[0],defaultEdges=[{from:'START',to:'LANDMARK',kind:'main'},{from:'LANDMARK',to:'OBJECTIVE',kind:'main'},{from:'OBJECTIVE',to:'EXIT',kind:'main'},{from:'START',to:'OBJECTIVE',kind:'alternate'}],safeEdges=(edges.length?edges:defaultEdges).filter(e=>ids.has(String(e.from))&&ids.has(String(e.to))).map(e=>Object.freeze({from:String(e.from),to:String(e.to),kind:String(e.kind||'route'),oneWay:e.oneWay===true}));const required=safeNodes.filter(n=>n.required).map(n=>n.id),reachable=new Set(startNode?[startNode.id]:[]);let changed=true;while(changed){changed=false;for(const e of safeEdges){if(reachable.has(e.from)&&!reachable.has(e.to)){reachable.add(e.to);changed=true}if(!e.oneWay&&reachable.has(e.to)&&!reachable.has(e.from)){reachable.add(e.from);changed=true}}}const unreachable=required.filter(id=>!reachable.has(id));return Object.freeze({startNodeId:startNode?.id||null,nodes:Object.freeze(safeNodes),edges:Object.freeze(safeEdges),unreachable:Object.freeze(unreachable),pass:unreachable.length===0,rules:Object.freeze(['main-objective-connectivity','alternate-route-when-genre-allows','shortcut-loop-support','choke-open-rhythm','terrain-aware-width-slope-curvature'])})}
export function createVibeWorldStreamingPlan({mobile=true,initialPlayableRadius=1,activeChunkBudget=null,lodDistances=null}={}){const budget=activeChunkBudget??(mobile?9:25);return Object.freeze({perceivedSeamlessStreamingTarget:true,literalZeroLoadingClaim:false,initialPlayableZonePrewarm:true,initialPlayableRadius:Math.max(1,Number(initialPlayableRadius)||1),activeChunkBudget:Math.max(4,Number(budget)||9),lodDistances:Object.freeze(lodDistances||{near:1,mid:2,far:4}),objectPoolingPreferred:true,backgroundGenerationBudgeted:true,criticalGameplayStateBeforePresentationChunk:true,unloadMayNotDiscardSaveOrAuthoritativeWorldState:true,mobileBudget:Boolean(mobile)})}
// 단순 지도에서 읽은 동선을 보존하고 구역별 세부 자산 요구를 만드는 기존 월드 제작 입력.
export function createVibeMapDetailReconstruction({sketch={},assets=[],styleFamily='STYLIZED_FANTASY',seed='map'}={}){
  const issues=[],nodes=Array.isArray(sketch.nodes)?sketch.nodes:[],edges=Array.isArray(sketch.edges)?sketch.edges:[];
  const ids=new Set(nodes.map(node=>node?.id));
  if(!nodes.length||ids.size!==nodes.length||nodes.some(node=>!node?.id))issues.push('ROUTE_NODES_REQUIRED_OR_DUPLICATED');
  if(!edges.length||edges.some(edge=>!edge||!ids.has(edge.from)||!ids.has(edge.to)||edge.from===edge.to))issues.push('ROUTE_EDGES_REQUIRED_OR_INVALID');
  const routes=createVibeRouteGraph({nodes,edges});
  if(!routes.pass)issues.push('UNREACHABLE_REQUIRED_ROUTE:'+routes.unreachable.join('|'));
  const districts=Array.isArray(sketch.districts)?sketch.districts:[];
  if(!districts.length)issues.push('DISTRICT_INTERPRETATION_REQUIRED');
  if(districts.some(row=>!row?.id||!ids.has(row.anchorNodeId)||!row.function)||new Set(districts.map(row=>row?.id)).size!==districts.length)issues.push('DISTRICT_ANCHOR_OR_FUNCTION_REQUIRED');

  const layerRules=[
    ['TERRAIN','ENVIRONMENT','elevation drainage ground strata and traversable shoulders',
      ['MACRO_ELEVATION','TRAVERSABLE_SLOPES','DRAINAGE_CHANNELS','SOIL_ROCK_STRATA','ROUTE_SHOULDERS','GROUND_MATERIAL_BLEND','EROSION_AND_USAGE_WEAR']],
    ['STRUCTURE','BUILDING','plot roof facade doorway window supports joints and back-side construction',
      ['MASSING_AND_FOOTPRINT','FOUNDATION_FRAME','WALLS_OPENINGS','DOORS_WINDOWS_DEPTH','ROOF_AND_DRAINAGE','INTERIOR_SHELL','TRIM_FASTENERS_JOINTS','FUNCTIONAL_FIXTURES']],
    ['VEGETATION','ENVIRONMENT','species clusters age variation root-soil contact and canopy gaps',
      ['SPECIES_SELECTION','AGE_SCALE_VARIANTS','TRUNK_BRANCH_FORM','ROOT_SOIL_CONTACT','CANOPY_CLUSTERING','UNDERSTORY','DEAD_FALLEN_VARIANTS','WIND_RESPONSE']],
    ['FUNCTIONAL_PROPS','PROP','district-specific work storage seating signs tools and human use',
      ['FUNCTION_INVENTORY','PRIMARY_PROP_FORMS','ASSEMBLY_AND_SUPPORT','HANDLES_HINGES_LIDS','PLACEMENT_BY_USE','INTERACTION_CLEARANCE','WEAR_BY_CONTACT']],
    ['SURFACE_HISTORY','MATERIAL','edge wear runoff cracks mud repair patches and contact dirt',
      ['MATERIAL_REGION_SPLIT','EDGE_BEVEL_RESPONSE','RUNOFF_AND_DRAINAGE','FOOT_HAND_TOOL_CONTACT','CRACK_REPAIR_PATCH','MUD_DUST_WETNESS','AGE_VARIATION']],
    ['AMBIENT_LIFE','VFX','wind cloth leaves water light and restrained background movement',
      ['WIND_LAYER','LEAF_GRASS_RESPONSE','CLOTH_SIGN_RESPONSE','WATER_SURFACE_MOTION','LIGHT_FLICKER_OR_CYCLE','DISTANT_AMBIENT_ACTIVITY']]
  ];

  const distanceDetail=Object.freeze({
    GAME_CAMERA:Object.freeze(['REGION_SILHOUETTE','LANDMARK_HIERARCHY','ROUTE_READABILITY','DISTRICT_VALUE_AND_COLOR_BLOCKS']),
    MID_RANGE:Object.freeze(['BUILDING_MODULES','VEGETATION_CLUSTERS','FUNCTIONAL_PROP_GROUPS','SECONDARY_PATHS']),
    CLOSEUP:Object.freeze(['JOINTS_FASTENERS','SURFACE_WEAR','ROOT_SOIL_CONTACT','GUTTERS_TRIM','SIGNS_TOOLS_STORAGE']),
    CONTACT:Object.freeze(['DOOR_STAIR_HANDLE','INTERACTION_ANCHOR','GROUND_FOOTING','RESOURCE_CLEARANCE','WALL_FLOOR_OBJECT_CONTACT'])
  });

  let hash=2166136261;for(const char of String(seed)){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}hash>>>=0;
  const regions=districts.filter(row=>row?.id&&ids.has(row.anchorNodeId)).map((district,index)=>({
    id:district.id,anchorNodeId:district.anchorNodeId,function:district.function,
    landmark:district.landmark||null,styleFamily,
    productionSequence:['BLOCKOUT','STRUCTURAL_AUTHORING','FUNCTIONAL_DETAIL','MATERIAL_AND_HISTORY','AMBIENT_MOTION','PLATFORM_VARIANTS','APPLY_TO_WORLD'],
    detailByDistance:distanceDetail,
    layers:layerRules.map(([layer,family,detail,authoringPasses],layerIndex)=>{
      const candidates=assets.filter(asset=>String(asset.family||asset.category).toUpperCase()===family&&(asset.sourceHash||asset.contentHash||asset.sha256)&&Array.isArray(asset.mapDetailRoles)&&asset.mapDetailRoles.includes(layer)&&(!asset.districtFunctions?.length||asset.districtFunctions.includes(district.function)));
      const selected=candidates.length?candidates[(hash+index*7+layerIndex*3)%candidates.length]:null;
      return{
        layer,family,detail,authoringPasses:Object.freeze(authoringPasses),cause:district.function,
        assetId:selected?.id||null,sourceHash:selected?.sourceHash||selected?.contentHash||selected?.sha256||null,
        status:selected?'REUSE_AND_REAUTHOR':'AUTHORING_REQUIRED',
        productionAction:selected?'ADAPT_EXISTING_ASSET_TO_DISTRICT_AND_STYLE':'CREATE_EDITABLE_NATIVE_ASSET',
        applyAction:'BIND_TO_EXISTING_WORLD_REGION_AND_NAVIGATION_SAFE_PLACEMENT',
        runtimeVerified:false
      };
    }),
    placementRules:['PRESERVE_ROAD_INTERSECTIONS_AND_ONE_WAY_LINKS','BUILDING_ENTRANCES_FACE_ACCESS_ROUTE','KEEP_LANDMARK_SIGHTLINE','CLUSTER_BY_FUNCTION_NOT_UNIFORM_SCATTER','KEEP_NAVIGATION_AND_INTERACTION_CLEARANCE','WEAR_FOLLOWS_WATER_CONTACT_AND_USAGE','DETAIL_DENSITY_FOLLOWS_PLAYER_DWELL_TIME_AND_GAMEPLAY_IMPORTANCE'],
    detailScale:['PRIMARY_MASSES_FROM_GAME_CAMERA','SECONDARY_CONSTRUCTION_AT_MID_RANGE','TERTIARY_SURFACE_AT_CLOSEUP','CONTACT_DETAIL_AT_INTERACTION_RANGE'],
    causalDetailRules:['NO_RANDOM_CLUTTER_FOR_DETAIL_SCORE','PROPS_REQUIRE_FUNCTION_OR_WORLD_CAUSE','WEAR_REQUIRES_CONTACT_WEATHER_OR_DAMAGE_CAUSE','FASTENERS_AND_JOINTS_APPEAR_WHERE_PARTS_CONNECT','DRAINAGE_MARKS_FOLLOW_GRAVITY_AND_WATER_PATHS']
  }));
  const productionChain=Object.freeze({
    sequence:Object.freeze(['INSPECT_MAP_AND_RUNTIME','DEFINE_REGION_REPAIR_SCOPE','AUTHOR_REGION_ASSETS_AND_MATERIALS','APPLY_TO_EXISTING_WORLD','REINSPECT_ROUTE_AND_GAME_CAMERA']),
    automaticAdvance:true,
    inspect:Object.freeze(['SOURCE_MAP_TOPOLOGY','CURRENT_RUNTIME_CAMERA','LANDMARK_VISIBILITY','ROUTE_AND_INTERACTION_CLEARANCE','CURRENT_REGION_ASSET_BINDINGS']),
    repair:Object.freeze(['KEEP_VALID_TOPOLOGY','TARGET_ONLY_WEAK_REGIONS','PRESERVE_SPAWN_OBJECTIVE_INTERACTION_COLLISION_SAVE_MEANING']),
    author:Object.freeze(['EDITABLE_TERRAIN_OR_WORLD_SOURCE','MODULAR_BUILDING_KITS','VEGETATION_VARIANTS','FUNCTIONAL_PROP_KITS','MATERIAL_HISTORY_PASSES','AMBIENT_MOTION_VARIANTS']),
    apply:Object.freeze(['USE_EXISTING_WORLD_RESPONSIBILITY','NO_SHADOW_MAP','BIND_NAV_COLLISION_WITHOUT_CHANGING_GAMEPLAY_MEANING','MOBILE_LOD_AND_STREAMING_VARIANTS']),
    reinspect:Object.freeze(['TOP_DOWN_ROUTE_OVERLAY','EYE_LEVEL_WALKTHROUGH','LANDMARK_REVEAL','INTERACTION_RANGE_CLOSEUP','GAME_CAMERA_DETAIL_READABILITY']),
    failedRegionOnlyLoops:true,
    reportOnlyCompletionForbidden:true
  });
  return Object.freeze({
    version:2,status:issues.length?'MAP_INTERPRETATION_REQUIRED':'DETAIL_AUTHORING_PLAN',issues:Object.freeze(issues),seed:String(seed),styleFamily,
    sourceId:sketch.sourceId||null,sourceHash:sketch.sourceHash||null,
    topology:issues.length?null:routes,regions:Object.freeze(issues.length?[]:regions),
    productionChain,
    detailByDistance:distanceDetail,
    spatialScale:typeof sketch.metersPerUnit==='number'&&Number.isFinite(sketch.metersPerUnit)&&sketch.metersPerUnit>0?{metersPerUnit:sketch.metersPerUnit,measured:false}:{status:'SCALE_AUTHORING_REQUIRED',measured:false},
    preserve:Object.freeze(['ROUTE_CONNECTIVITY','JUNCTION_ORDER','LANDMARK_ANCHORS','SPAWN_OBJECTIVE_AND_INTERACTION_AREAS','COLLISION_AND_SAVE_MEANING']),
    comparison:Object.freeze(['SOURCE_MAP_ROUTE_OVERLAY','TOP_DOWN_GENERATED_LAYOUT','EYE_LEVEL_ROUTE_WALKTHROUGH','LANDMARK_SIGHTLINES','CLOSEUP_MATERIAL_CONSTRUCTION','PLATFORM_NATIVE_SAME_SEED_AND_MOBILE_LOD']),
    unseenArchitectureIsCreativeProposal:true,assetCountIsNotDetailQuality:true,sourceMutationPerformed:false,runtimeVerified:false
  });
}

// 절차적 배경: 게임 소스와 독립된 결정론적 설계 제안만 생성한다. 게임 규칙·기존 좌표는 변경하지 않는다.
function proceduralCellHash(seed,x,z){
  let v=(seed^Math.imul(x,374761393)^Math.imul(z,668265263))>>>0;
  v=Math.imul(v^(v>>>13),1274126177);
  return(v^(v>>>16))>>>0;
}
function proceduralGradientNoise(seed,x,z){
  const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz;
  const fade=t=>t*t*t*(t*(t*6-15)+10);
  const dot=(a,b,dx,dz)=>{
    const i=proceduralCellHash(seed,a,b)&7;
    return([1,1,-1,-1,1,-1,0,0][i]*dx+[1,-1,1,-1,0,0,1,-1][i]*dz)*.70710678;
  };
  const u=fade(fx),v=fade(fz),lerp=(a,b,t)=>a+(b-a)*t;
  return lerp(lerp(dot(ix,iz,fx,fz),dot(ix+1,iz,fx-1,fz),u),lerp(dot(ix,iz+1,fx,fz-1),dot(ix+1,iz+1,fx-1,fz-1),u),v);
}
export function createVibeProceduralWorldLayout({seed='world',width=24,height=24,cellSize=3,dimension='3D',biome='TEMPERATE',climate='TEMPERATE',buildingStyle='LOCAL',density=.25,mobile=true,approvedDesign=false,reservedCells=[],maxSlopeDegrees=35,fovDegrees=95}={}){
  const noMutation={sourceMutationPerformed:false,nativeAssetInstancingPerformed:false,runtimeVerified:false,gameplayRuleMutation:false,saveMeaningMutation:false};
  if(approvedDesign!==true)return Object.freeze({status:'APPROVED_DESIGN_REQUIRED',issues:Object.freeze(['APPROVED_WORLD_DESIGN_REQUIRED']),...noMutation});
  const maximum=mobile?48:72,validNumber=n=>typeof n==='number'&&Number.isFinite(n);
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<12||height<12||width>maximum||height>maximum||!validNumber(cellSize)||cellSize<=0||!['2D','3D'].includes(dimension)||!validNumber(density)||density<0||density>1||!validNumber(maxSlopeDegrees)||maxSlopeDegrees<=0||maxSlopeDegrees>=90||!validNumber(fovDegrees)||fovDegrees<=0||fovDegrees>180){
    return Object.freeze({status:'INVALID_GENERATION_INPUT',issues:Object.freeze(['DIMENSIONS_OR_BUDGET_INVALID']),...noMutation});
  }
  const w=width,h=height,hash=String(seed).split('').reduce((v,c)=>Math.imul(v^c.charCodeAt(0),16777619)>>>0,2166136261);
  const at=(x,z)=>z*w+x,within=(x,z)=>x>=0&&x<w&&z>=0&&z<h;
  const blocked=new Set(),issues=[];
  if(!Array.isArray(reservedCells))return Object.freeze({status:'INVALID_GENERATION_INPUT',issues:Object.freeze(['RESERVED_CELLS_INVALID']),...noMutation});
  for(const cell of reservedCells){
    if(!Number.isInteger(cell?.x)||!Number.isInteger(cell?.z)||!within(cell.x,cell.z))return Object.freeze({status:'INVALID_GENERATION_INPUT',issues:Object.freeze(['RESERVED_CELLS_INVALID']),...noMutation});
    blocked.add(at(cell.x,cell.z));
  }
  const octave=(x,z,salt)=>{let sum=0,amp=1,weight=0,freq=1;for(let i=0;i<4;i++){sum+=proceduralGradientNoise(hash^salt,x*freq,z*freq)*amp;weight+=amp;freq*=2;amp*=.5;}return sum/weight;};
  const terrain=[];
  for(let z=0;z<h;z++)for(let x=0;x<w;x++){
    const nx=x/w,nz=z/h,ridge=Math.abs(octave(nx*3,nz*3,0x102a));
    const elevation=Math.max(.05,Math.min(.95,.48+.5*octave(nx*4,nz*4,0x22bb)+.16*ridge));
    const moisture=Math.max(0,Math.min(1,.52+.58*octave(nx*3+11,nz*3-7,0x397a)+(String(climate).toUpperCase().includes('WET')?.2:0)));
    const type=elevation<.26?'WATER':elevation>.77?'RIDGE':moisture>.66?'FOREST':moisture<.28?'DRY':'PLAIN';
    terrain.push({x,z,elevation:+elevation.toFixed(4),moisture:+moisture.toFixed(4),biome:type});
  }
  for(const tile of terrain){
    const {x,z}=tile,diffs=[[x-1,z],[x+1,z],[x,z-1],[x,z+1]].filter(([a,b])=>within(a,b));
    const rise=Math.max(0,...diffs.map(([a,b])=>Math.abs(tile.elevation-terrain[at(a,b)].elevation)*8));
    tile.slopeDegrees=+(Math.atan2(rise,cellSize)*180/Math.PI).toFixed(2);
    tile.drainageTo=diffs.map(([a,b])=>terrain[at(a,b)]).filter(other=>other.elevation<tile.elevation).sort((a,b)=>a.elevation-b.elevation||a.z-b.z||a.x-b.x)[0]?.x===undefined?null:null;
    const lower=diffs.map(([a,b])=>terrain[at(a,b)]).filter(t=>t.elevation<tile.elevation).sort((a,b)=>a.elevation-b.elevation||a.z-b.z||a.x-b.x)[0];
    tile.drainageTo=lower?{x:lower.x,z:lower.z}:null;
  }
  const passable=(x,z)=>within(x,z)&&!blocked.has(at(x,z))&&terrain[at(x,z)].biome!=='WATER';
  const nearest=(x,z)=>{
    for(let radius=0;radius<Math.max(w,h);radius++)for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++){
      if(Math.abs(dx)+Math.abs(dz)!==radius)continue;
      if(passable(x+dx,z+dz))return{x:x+dx,z:z+dz};
    }
    return null;
  };
  const entry=nearest(1,Math.floor(h/2)),hub=nearest(Math.floor(w/2),Math.floor(h/2)),landmark=nearest(w-2,Math.floor(h/2)),branch=nearest(Math.floor(w/2),2);
  const routeNodes=[['ENTRY',entry,'spawn'],['HUB',hub,'settlement'],['LANDMARK',landmark,'landmark'],['BRANCH',branch,'optional']].filter(row=>row[1]);
  const routeEdges=[['ENTRY','HUB'],['HUB','LANDMARK'],['HUB','BRANCH']];
  const points=Object.fromEntries(routeNodes.map(([id,pos])=>[id,pos]));
  const routes=[],roadSet=new Set();
  function route(a,b){
    if(!a||!b)return null;
    const start=at(a.x,a.z),goal=at(b.x,b.z),cost=new Float64Array(w*h).fill(Infinity),from=new Int32Array(w*h).fill(-1),closed=new Set(),open=[{id:start,score:0}];
    cost[start]=0;
    while(open.length){
      open.sort((p,q)=>p.score-q.score||p.id-q.id);
      const current=open.shift().id;
      if(closed.has(current))continue;
      if(current===goal){const path=[];let cursor=goal;while(cursor!==-1){path.push({x:cursor%w,z:Math.floor(cursor/w)});cursor=from[cursor];}return path.reverse();}
      closed.add(current);
      const x=current%w,z=Math.floor(current/w),neighbors=[[x+1,z],[x,z+1],[x-1,z],[x,z-1]];
      for(const [xx,zz] of neighbors){
        if(!passable(xx,zz))continue;
        const next=at(xx,zz),rise=Math.abs(terrain[current].elevation-terrain[next].elevation)*8;
        if(Math.atan2(rise,cellSize)*180/Math.PI>maxSlopeDegrees)continue;
        const nextCost=cost[current]+1+rise*4+(terrain[next].biome==='RIDGE'?1:0);
        if(nextCost>=cost[next])continue;
        cost[next]=nextCost;from[next]=current;
        open.push({id:next,score:nextCost+Math.abs(xx-b.x)+Math.abs(zz-b.z)});
      }
    }
    return null;
  }
  for(const [from,to] of routeEdges){
    if(!points[from]||!points[to]){issues.push('REQUIRED_ROUTE_ANCHOR_MISSING:'+from+'-'+to);continue;}
    const cells=route(points[from],points[to]);
    if(!cells){issues.push('REQUIRED_ROUTE_BLOCKED:'+from+'-'+to);continue;}
    for(const cell of cells)roadSet.add(at(cell.x,cell.z));
    routes.push({id:from+'-'+to,from,to,cells});
  }
  const routeGraph=createVibeRouteGraph({nodes:routeNodes.map(([id,,role])=>({id,role,required:id!=='BRANCH'})),edges:routes.map(r=>({from:r.from,to:r.to,kind:'main'}))});
  if(!routeGraph.pass)issues.push('REQUIRED_OBJECTIVE_UNREACHABLE');
  const sightCells=new Set();
  if(hub&&landmark){
    const steps=Math.max(Math.abs(hub.x-landmark.x),Math.abs(hub.z-landmark.z))*2;
    for(let i=0;i<=steps;i++){const t=steps?i/steps:0;sightCells.add(at(Math.round(hub.x+(landmark.x-hub.x)*t),Math.round(hub.z+(landmark.z-hub.z)*t)));}
  }
  const buildings=[],occupied=new Set([...roadSet,...blocked]),instanceGroups=new Map();
  const maxBuildings=mobile?22:56,style=String(buildingStyle||'LOCAL').toUpperCase();
  const addInstance=(name,x,z,rotation=0)=>{
    const key=style+':'+name,group=instanceGroups.get(key)||{module:key,count:0,transforms:[]};
    group.transforms.push({x:x*cellSize,z:z*cellSize,rotation});group.count++;instanceGroups.set(key,group);
  };
  for(const id of [...roadSet].sort((a,b)=>a-b)){
    if(buildings.length>=maxBuildings)break;
    const rx=id%w,rz=Math.floor(id/w);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const x=rx+dx-(dx<0?1:0),z=rz+dz-(dz<0?1:0),footprint=[];
      for(let d=0;d<2;d++)for(let e=0;e<2;e++)footprint.push({x:x+d,z:z+e});
      if(footprint.some(c=>!within(c.x,c.z)||occupied.has(at(c.x,c.z))||sightCells.has(at(c.x,c.z))||terrain[at(c.x,c.z)].biome==='WATER'||terrain[at(c.x,c.z)].slopeDegrees>maxSlopeDegrees))continue;
      const roll=proceduralCellHash(hash,x,z)/4294967296;
      if(roll>density)continue;
      footprint.forEach(c=>occupied.add(at(c.x,c.z)));
      const distance=Math.hypot(x-(hub?.x??w/2),z-(hub?.z??h/2));
      const zone=distance<Math.min(w,h)*.23?'COMMERCIAL':x>w*.75?'WORKSHOP':'RESIDENTIAL';
      const roof=String(climate).toUpperCase().includes('WET')?'PITCHED_ROOF':'ROOF';
      const pivot={x:x*cellSize,z:z*cellSize},doorFacing=dx!==0?(dx>0?'WEST':'EAST'):(dz>0?'NORTH':'SOUTH');
      const building={id:'LOT_'+buildings.length,zone,style,footprint,position:pivot,modules:[style+':FOUNDATION',style+':WALL',style+':DOOR',style+':'+roof],doorFacing,roadAccess:{x:rx,z:rz},gridSnap:cellSize,sourceBindingRequired:true};
      buildings.push(building);
      addInstance('FOUNDATION',x,z);
      addInstance('DOOR',x,z);
      addInstance(roof,x,z);
      for(const [ox,oz,rot] of [[0,0,0],[1,0,90],[1,1,180],[0,1,270]])addInstance('WALL',x+ox,z+oz,rot);
      break;
    }
  }
  let sightline={from:hub,to:landmark,fovDegrees,withinFov:false,visible:false,terrainObstructed:false,buildingObstructed:false};
  if(hub&&landmark){
    const ax=landmark.x-hub.x,az=landmark.z-hub.z,length=Math.hypot(ax,az);
    const withinFov=length===0||ax/length>=Math.cos(fovDegrees*Math.PI/360);
    const seen=[...sightCells].some(id=>!roadSet.has(id)&&buildings.some(b=>b.footprint.some(cell=>at(cell.x,cell.z)===id)));
    const startY=terrain[at(hub.x,hub.z)].elevation*8+1.7,endY=terrain[at(landmark.x,landmark.z)].elevation*8+12;
    let terrainObstructed=false;
    for(const id of sightCells){const x=id%w,z=Math.floor(id/w),t=length?Math.hypot(x-hub.x,z-hub.z)/length:0;
      if(t>.03&&t<.95&&terrain[id].elevation*8>startY+(endY-startY)*t)terrainObstructed=true;
    }
    sightline={from:hub,to:landmark,fovDegrees,withinFov,visible:withinFov&&!seen&&!terrainObstructed,terrainObstructed,buildingObstructed:seen};
    if(!sightline.visible)issues.push('LANDMARK_VISIBILITY_REQUIRES_CAMERA_REVIEW');
  }
  const result={
    version:1,status:issues.length?'LAYOUT_REVIEW_REQUIRED':'STATIC_LAYOUT_PROPOSED',issues:Object.freeze(issues),
    seed:String(seed),dimension,coordinateSystem:dimension==='3D'?'Y_UP_HEIGHTFIELD':'XY_TOP_DOWN',
    size:{width:w,height:h,cellSize},terrain:Object.freeze(terrain),roads:Object.freeze(routes),roadCells:Object.freeze([...roadSet].sort((a,b)=>a-b).map(id=>({x:id%w,z:Math.floor(id/w)}))),
    routeGraph,buildings:Object.freeze(buildings),instancingPlan:Object.freeze([...instanceGroups.values()]),landmark:Object.freeze({cell:landmark,reason:'VISIBLE_NAVIGATION_ANCHOR'}),
    sightline:Object.freeze(sightline),drainage:'EIGHT_NEIGHBOR_DOWNHILL',noise:'SEEDED_2D_GRADIENT_FBM',snapRules:Object.freeze({moduleGrid:cellSize,entrancesFaceConnectedRoad:true,foundationsFollowTerrain:true}),
    mobileBudget:Object.freeze({cellCount:terrain.length,buildingLimit:maxBuildings,instanceGroupCount:instanceGroups.size,actualDrawCallsMeasured:false}),
    protected:Object.freeze(['existing-transforms','spawns','objective-rules','collision','navigation','economy','save','network-authority']),
    ...noMutation
  };
  return Object.freeze(result);
}

export function createVibeAdaptiveWorldGenerationPlan({map={},region={},concept={},reference={},referenceImage=null,mobile=true,nodes=[],edges=[],genre='ADAPTIVE',learningEvents=[],procedural=null}={}){const imageRequest=referenceImage?createVibeReferenceImageStudyRequest(referenceImage):null,bound=imageRequest&&referenceImage?.observation?bindVibeReferenceImageObservation({request:imageRequest,observation:referenceImage.observation,verifiedAgainstSource:referenceImage.verifiedAgainstSource===true}):null,referenceInput=bound?.valid?{sourceId:bound.sourceId,sourceType:bound.sourceType,features:bound.features,verifiedAgainstSource:bound.verifiedAgainstSource}:reference,abstraction=createVibeReferenceMapAbstraction(referenceInput),dna=createVibeMapDNA({map,region,concept,reference:abstraction}),routes=createVibeRouteGraph({mapDna:dna,nodes,edges}),streaming=createVibeWorldStreamingPlan({mobile}),genreGrammar=createVibeGenreWorldGrammar({genre}),learning=summarizeVibeVerifiedWorldLearning({events:learningEvents}),patternDistillation=distillVibeVerifiedWorldPatterns({events:learningEvents}),proceduralLayout=(procedural||map.proceduralWorld)?createVibeProceduralWorldLayout({...map.proceduralWorld,...procedural,mobile}):null;return Object.freeze({version:4,proceduralLayout,referenceImageStudy:imageRequest?Object.freeze({request:imageRequest,observation:bound}):null,reference:abstraction,mapDna:dna,routes,streaming,genreGrammar,learning,patternDistillation,generationOrder:Object.freeze(['concept-world-lock','reference-image-study-request','reference-abstraction','map-dna','macro-terrain-region-landmark','route-graph-shortcuts','zone-placement','mid-scale-paths','biome-props-nav-clearance','initial-zone-prewarm','nearby-chunk-streaming-lod','reachability-mobile-cohesion-qa']),policy:Object.freeze({deterministicSeedSupported:true,directReferenceLayoutCopyForbidden:true,rawReferencePersistentLearningForbidden:true,gameplayRuleMutation:false,saveMeaningMutation:false,multiplayerAuthorityMutation:false,mobileFirst:Boolean(mobile)})})}

export function createVibeMapComposition({map={},region={},mobile=true}={}){return Object.freeze({name:map.name||'map',region:region.name||'',type:map.type||map.gameplay||'exploration',layoutRules:Object.freeze(['gameplay-route-before-decoration','landmark-visible-from-decision-point','resources-have-world-source','danger-has-visual-warning','dense-detail-away-from-critical-action']),mobileBudget:Object.freeze({maxSimultaneousLandmarks:mobile?2:4,foregroundDensity:mobile?'low':'medium'})})}
export function createVibeMapPlacementGrammar(){return Object.freeze({avoid:Object.freeze(['uniform-grid-decoration','random-props-without-cause','foreground-over-hit-area','resource-without-source','hazard-without-warning']),protected:Object.freeze(['collision','navigation','spawn-points','wave-path','objective-position','interaction-range'])})}
export function createVibeMapVariationPlan({maps=[]}={}){return Object.freeze({maps:Object.freeze(maps.map((m,i)=>Object.freeze({map:m.name||`map-${i+1}`,macroShape:['corridor','hub','ring','branch','open-pocket'][i%5],routeRhythm:['short-long-short','branch-return','loop','progressive-open','choke-release'][i%5]}))),rule:'vary-composition-not-only-palette'})}
export function scoreVibeMapPlacement({placements=[]}={}){let score=100,issues=[];for(const p of placements){if(!p.reason){score-=12;issues.push('no-reason')}if(p.blocksCriticalPlay){score-=30;issues.push('blocks-play')}if(p.worldMismatch){score-=15;issues.push('world-mismatch')}}return Object.freeze({score:clamp(score),issues:Object.freeze(issues),pass:score>=70})}
export function planVibeMapAutopilot({maps=[],regions=[],mobile=true,concept={},referencesByMap={},referenceImagesByMap={},genre='ADAPTIVE',learningEventsByMap={}}={}){return Object.freeze({version:7,variation:createVibeMapVariationPlan({maps}),plans:Object.freeze(maps.map(m=>{const region=regions.find(x=>x.name===m.region)||{};return Object.freeze({map:m.name,composition:createVibeMapComposition({map:m,region,mobile}),placement:createVibeMapPlacementGrammar(),adaptiveWorld:createVibeAdaptiveWorldGenerationPlan({map:m,region,concept,reference:referencesByMap[m.name]||{},referenceImage:referenceImagesByMap[m.name]||null,mobile,nodes:m.routeNodes||[],edges:m.routeEdges||[],genre,learningEvents:learningEventsByMap[m.name]||[]})})})),policy:Object.freeze({developmentAI:false,serverAI:'game-runtime-only',deterministic:true,gameplayFirst:true,noGameplayMutation:true,directReferenceLayoutCopyForbidden:true,rawReferencePersistentLearningForbidden:true,referenceImagesSourceBound:true,perceivedSeamlessStreamingTarget:true})})}
export function createVibeSceneContext({game={},region={},situation={}}={}){return Object.freeze({gameplay:situation.gameplay||game.gameplay||'',world:game.world||'',region:region.name||'',biome:region.biome||'',time:situation.time||'',weather:situation.weather||'',danger:situation.danger||'',recentEvent:situation.recentEvent||'',faction:situation.faction||region.faction||'',mood:situation.mood||'',playerState:situation.playerState||''})}
export function createVibePropRecreationBlueprint(prop={},context={}){return Object.freeze({id:prop.id||prop.name||'prop',cause:Object.freeze({function:prop.function||prop.use||'environmental',material:prop.material||'world-derived',history:prop.history||context.recentEvent||'normal-use'}),form:Object.freeze({primaryMass:'function-derived-main-volume',secondaryMass:'supporting-structure',contact:'ground-or-wall-contact',wear:'use-specific'}),depth:Object.freeze({sideFace:'volume-cue',castShadow:'grounding',contactShadow:'attachment',overlap:'layered-parts'}),protected:Object.freeze(['collision','interaction-range','gameplay-size','function'])})}
export function createVibeSceneRecreationPlan({game={},region={},situation={},props=[]}={}){const context=createVibeSceneContext({game,region,situation});return Object.freeze({version:3,context,objects:Object.freeze(props.map(p=>createVibePropRecreationBlueprint(p,context))),policy:Object.freeze({developmentAI:false,serverAI:'game-runtime-only',noBlindAssetReuse:true,noGameplayMutation:true})})}
export function scoreVibeSceneDimensionality({objects=[]}={}){let score=100,issues=[];for(const o of objects){if(!o.sideOrDepthCue){score-=10;issues.push('flat')}if(!o.contactShadow){score-=8;issues.push('floating')}if(!o.overlap){score-=8;issues.push('no-overlap')}}return Object.freeze({score:clamp(score),issues:Object.freeze(issues),pass:score>=72})}
export function createVibeAssetRecreationGate({original={},candidate={}}={}){const changed=['silhouette','mass','parts','material','wear','attachment','depth','lighting'].filter(k=>JSON.stringify(original[k])!==JSON.stringify(candidate[k])),issues=[];if(changed.length<3)issues.push('too-close-to-reuse');if(candidate.collisionChanged)issues.push('collision-change');return Object.freeze({safe:!issues.length,issues:Object.freeze(issues),changedDimensions:Object.freeze(changed)})}
export function planVibeAssetRecreationAutopilot({scenes=[]}={}){return Object.freeze({version:3,scenes:Object.freeze(scenes.map(s=>createVibeSceneRecreationPlan(s))),policy:Object.freeze({developmentAI:false,serverAI:'game-runtime-only',target:'re-creation-not-recycling',noRuleMutation:true})})}

// 물질의 상태와 외부 힘을 분리해, 시각적 사실성과 게임 판정의 권한을 섞지 않는다.
export function createVibeMaterialBehavior(material='generic'){const m=String(material).toLowerCase(),base={material:m,density:'medium',elasticity:'low',friction:'medium',porosity:'medium',conductivity:'low',heatCapacity:'medium',wetResponse:'darken-and-specular-shift',impactResponse:'material-specific',heatResponse:'state-specific'};if(/wood|나무/.test(m))Object.assign(base,{density:'low-medium',elasticity:'medium',friction:'medium',porosity:'medium-high',conductivity:'very-low',wetResponse:'darken-grain',impactResponse:'splinter-dust',heatResponse:'char-smoke'});else if(/metal|철|금속/.test(m))Object.assign(base,{density:'high',elasticity:'low-medium',friction:'low-medium',porosity:'very-low',conductivity:'high',wetResponse:'water-bead-highlight',impactResponse:'ring-spark-if-valid',heatResponse:'heat-tint'});else if(/cloth|천|leaf|잎/.test(m))Object.assign(base,{density:'very-low',elasticity:'high',friction:'medium',porosity:'high',conductivity:'very-low',wetResponse:'sag-darken',impactResponse:'fold-sway',heatResponse:'curl-char-if-authorized'});else if(/stone|rock|돌/.test(m))Object.assign(base,{density:'high',elasticity:'very-low',friction:'high',porosity:'low-medium',conductivity:'low',wetResponse:'darken-crevice',impactResponse:'chip-dust'});else if(/mud|soil|흙/.test(m))Object.assign(base,{density:'medium',elasticity:'plastic',friction:'high',porosity:'high',wetResponse:'soften-puddle',impactResponse:'splash-or-dust'});return Object.freeze(base)}
export function createVibeForceResponse({material='generic',mass='medium',force='small',anchored=false}={}){const behavior=createVibeMaterialBehavior(material);return Object.freeze({material:behavior.material,mass,force,anchored,response:anchored?'deform-vibrate-or-transfer-force':'engine-validated-motion',secondary:Object.freeze(['inertia-before-settle','friction-dependent-slide','material-specific-impact','contact-shadow-follow']),rule:'visual inertia follows authoritative transform; never invent collision result'})}
export function createVibeFluidInteraction({fluid='water',surface='stone',slope='flat',temperature='normal'}={}){return Object.freeze({fluid,surface,slope,temperature,behavior:Object.freeze(['flow-toward-valid-low-area','spread-limited-by-surface-and-volume','surface-wetness','edge-drip-if-supported','ripple-from-contact','evaporation-or-freezing-only-if-world-state-authorizes']),rule:'use bounded visual approximation, not expensive full fluid simulation'})}
export function createVibeThermalInteraction({material='generic',source='heat',intensity='low'}={}){return Object.freeze({material,source,intensity,sequence:Object.freeze(['local-temperature-cue','material-specific-expansion-or-softening-cue','color-or-moisture-change','smoke-steam-only-if-material-and-state-support','cooldown-gradient']),protected:Object.freeze(['damage','hp','durability','combustion-state']),rule:'engine authorizes gameplay state; director renders physically plausible transition'})}
export function createVibeChemistryInteraction({a='material-a',b='material-b',environment={}}={}){return Object.freeze({reactants:Object.freeze([a,b]),environment:Object.freeze({wet:Boolean(environment.wet),heat:Boolean(environment.heat),air:Boolean(environment.air),contained:Boolean(environment.contained)}),allowedPresentation:Object.freeze(['color-shift','bubbles-or-foam-if-reaction-defined','precipitate-or-residue-if-defined','gas-or-vapor-visual-if-defined','temperature-cue-if-defined','corrosion-or-surface-change-if-defined']),requirements:Object.freeze(['reaction-must-exist-in-game-reaction-table','products-must-be-predefined-game-materials-or-visual-states','rate-must-be-bounded','mass-or-volume-change-must-be-authored','hazard-result-must-be-engine-authorized']),forbidden:Object.freeze(['freeform-real-world-chemical-recipe-generation','invent-unknown-reaction','unbounded-chain-reaction','ai-decides-damage','ai-creates-new-hazard-rule']),rule:'chemistry is data-driven game simulation with plausible presentation, not an unrestricted chemistry solver'})}
export function createVibeReactionTableContract({reactions=[]}={}){return Object.freeze({reactions:Object.freeze(reactions.map(r=>Object.freeze({id:r.id||`${r.a||'a'}+${r.b||'b'}`,reactants:Object.freeze([r.a,r.b].filter(Boolean)),conditions:Object.freeze(r.conditions||[]),visualStages:Object.freeze(r.visualStages||['contact','reaction','settle']),products:Object.freeze(r.products||[]),engineEffectId:r.engineEffectId||null}))),validation:Object.freeze(['known-reactants-only','known-products-only','explicit-condition-match','bounded-rate','engine-effect-id-for-gameplay-consequence']),fallback:'no-reaction-plus-material-contact-response'})}
export function createVibeStructuralPhysics({object={}}={}){return Object.freeze({id:object.id||object.name||'structure',loadPath:Object.freeze(['support','joint','main-mass','contact-ground']),responses:Object.freeze(['small-force-vibration','authorized-damage-crack-location','support-loss-collapse-only-if-engine-state-says-so','debris-follows-gravity-and-collision-budget']),protected:Object.freeze(['collision','navigation','destruction-threshold','loot','damage']),rule:'visual structural failure follows engine state and plausible load path'})}
export function createVibeEnvironmentalCoupling({event='impact',targets=[]}={}){return Object.freeze({event,targets:Object.freeze(targets.map(t=>Object.freeze({id:t.id||t.name||'target',channels:Object.freeze(uniq(t.channels||['force','heat','wetness','sound','light'])),attenuation:t.attenuation||'distance-and-material',delay:t.delay||'physical-propagation-order'}))),limits:Object.freeze(['bounded-radius','bounded-depth','no-infinite-loop','no-authoritative-gameplay-write']),rule:'one event may affect several systems, but energy/state must attenuate rather than duplicate infinitely'})}
export function createVibeWeatherInteractionProfile({weather='clear',intensity=.5,mobile=true}={}){const w=String(weather).toLowerCase(),effects=[];if(/rain|비/.test(w))effects.push('surface-wetness','puddles-in-valid-low-areas','roof-occlusion','edge-drip','water-ripple','reduced-dust');else if(/snow|눈/.test(w))effects.push('upward-surface-accumulation','foot-disturbance','wind-drift');else if(/wind|바람|storm|폭풍/.test(w))effects.push('foliage-bend','cloth-flutter','loose-debris-drift');else if(/fog|안개/.test(w))effects.push('distance-contrast-falloff','layered-haze');else effects.push('subtle-air-motion');return Object.freeze({weather:w,intensity:Math.max(0,Math.min(1,intensity)),effects:Object.freeze(effects),propagation:Object.freeze(['sky','light','ground','props','foliage','water','particles','ambient-sound','character-contact']),budget:Object.freeze({particles:mobile?'low-medium':'medium-high',fullScreenBlur:false})})}
export function createVibePhysicalInteractionContract(object={}){return Object.freeze({id:object.id||object.name||'object',responses:Object.freeze({touch:object.touch||'small-contact-response',push:object.pushable?'engine-validated-displacement':'visual-contact-only',hit:object.breakable?'engine-authorized-damage-state':'material-impact-only',wind:object.flexible?'anchored-secondary-motion':'none',water:'material-wet-response',fire:object.flammable?'engine-authorized-state-plus-visual-response':'visual-proximity-response'}),protected:Object.freeze(['collision-shape','damage-rule','interaction-range','reward','drop','navigation'])})}
export function createVibeEnvironmentReactionChain({event='',targets=[]}={}){return createVibeEnvironmentalCoupling({event,targets})}
export function createVibeWeatherTransition({from='clear',to='rain',duration='adaptive'}={}){return Object.freeze({from,to,duration,phases:Object.freeze(['sky-light-shift','air-change','first-particles','surface-response','accumulation','ambient-settle'])})}
export function createVibeEnvironmentalEvidence({state={}}={}){return Object.freeze({source:state.event||state.weather||state.activity||'world-state',evidence:Object.freeze(['surface-state','object-displacement-or-wear','tracks-if-supported','residue','lighting-change','ambient-sound-change'])})}
export function scoreVibeEnvironmentalRealism({elements=[]}={}){let score=100,issues=[];for(const e of elements){if(!e.cause){score-=12;issues.push('effect-without-cause')}if(e.weatherOverlayOnly){score-=18;issues.push('weather-overlay-only')}if(e.materialGeneric){score-=10;issues.push('generic-material-response')}if(e.noContactResponse){score-=8;issues.push('dead-contact')}if(e.energyGain){score-=20;issues.push('nonphysical-energy-gain')}if(e.unboundedReaction){score-=25;issues.push('unbounded-reaction')}if(e.gameplayObscured){score-=25;issues.push('gameplay-obscured')}}return Object.freeze({score:clamp(score),issues:Object.freeze(issues),pass:score>=72})}
export function planVibeEnvironmentalInteractionAutopilot({objects=[],weather={},reactions=[],mobile=true}={}){return Object.freeze({version:2,weather:createVibeWeatherInteractionProfile({...weather,mobile}),reactionTable:createVibeReactionTableContract({reactions}),objects:Object.freeze(objects.map(o=>Object.freeze({id:o.id||o.name,material:createVibeMaterialBehavior(o.material),interaction:createVibePhysicalInteractionContract(o),structure:createVibeStructuralPhysics({object:o})}))),stages:Object.freeze(['read-authoritative-world-state','classify-material-properties','bind-force-and-contact','bind-fluid-surface-response','bind-thermal-cues','load-authored-reaction-table','bind-bounded-chemical-presentation','couple-force-heat-wetness-light-sound','attenuate-propagation','mobile-budget','engine-rule-guard','regression-check']),policy:Object.freeze({developmentAI:false,serverAI:'game-runtime-only',deterministic:true,engineAuthoritative:true,noGameplayMutation:true,physics:'bounded-plausible-approximation',chemistry:'authored-reaction-table-only',noFreeformChemistry:true})})}
export function createVibeDepthStack({genre='adaptive',mobile=true}={}){return Object.freeze([{layer:'far',parallax:.08,density:'low'},{layer:'mid',parallax:.28,density:'medium'},{layer:'gameplay',parallax:1,density:'controlled'},{layer:'foreground',parallax:1.12,density:mobile?'low':'medium'},{layer:'atmosphere',parallax:.55,density:mobile?'low':'medium'}])}
export function createVibeEnvironmentGrammar({theme='adaptive'}={}){return Object.freeze({theme,rules:Object.freeze(['preserve-player-silhouette','reserve-combat-negative-space','repeat-with-variation']),protected:Object.freeze(['collision','navigation','spawn-points','wave-path','interaction-range'])})}
export function createVibeAtmosphereProfile({mood='adaptive',mobile=true}={}){return Object.freeze({mood,budget:Object.freeze({persistentParticles:mobile?24:60,dynamicLights:mobile?3:8,blur:false})})}
export function planVibeWorldAutopilot({world={},regions=[],factions=[],species=[]}={}){return Object.freeze({version:5,dna:createVibeWorldDNA(world),graph:createVibeWorldConsistencyGraph({world,regions,factions,species}),visualRules:createVibeWorldVisualRules(world),propagation:Object.freeze(['background','map','props','weather','materials','physics','fluid','thermal','authored-chemistry','interactions','npc','mob','vfx','ambient-sound']),policy:Object.freeze({developmentAI:false,serverAI:'game-runtime-only',noGameplayMutation:true,physicalCausalityRequired:true})})}
export function planVibeEnvironmentAutopilot({files=[],theme='adaptive',mood='adaptive',mobile=true,request=''}={}){return Object.freeze({version:6,request:String(request),audit:auditVibeEnvironment(files),depth:createVibeDepthStack({genre:theme,mobile}),grammar:createVibeEnvironmentGrammar({theme}),atmosphere:createVibeAtmosphereProfile({mood,mobile}),policy:Object.freeze({developmentAI:false,serverAI:'game-runtime-only',mobileFirst:mobile,noGameplayMutation:true,physicalCausalityRequired:true})})}
export function scoreVibeBackgroundReadability({playerContrast=1,enemyContrast=1,projectileContrast=1,foregroundOcclusion=0,visualNoise=0}={}){let score=100;score-=Math.max(0,.65-playerContrast)*60;score-=Math.max(0,.65-enemyContrast)*60;score-=Math.max(0,.7-projectileContrast)*70;score-=foregroundOcclusion*45;score-=visualNoise*30;score=clamp(score);return Object.freeze({score,safe:score>=70})}
export function createVibeEnvironmentVariation({seed=1,count=12,mobile=true}={}){const density=Math.min(count,mobile?16:32),items=[];for(let i=0;i<density;i++){const n=Math.abs((Math.sin((seed+i)*12.9898)*43758.5453)%1);items.push(Object.freeze({index:i,scale:+(.82+n*.34).toFixed(2),flip:n>.5,depth:i%3,rotation:+((n-.5)*8).toFixed(1)}))}return Object.freeze({seed,count:density,items:Object.freeze(items)})}
if(typeof window!=='undefined'){Object.assign(window,{auditJaewoonVibeEnvironment:auditVibeEnvironment,createJaewoonVibeWorldDNA:createVibeWorldDNA,createJaewoonVibeMapComposition:createVibeMapComposition,planJaewoonVibeMapAutopilot:planVibeMapAutopilot,createJaewoonVibeGenreWorldGrammar:createVibeGenreWorldGrammar,summarizeJaewoonVibeVerifiedWorldLearning:summarizeVibeVerifiedWorldLearning,distillJaewoonVibeVerifiedWorldPatterns:distillVibeVerifiedWorldPatterns,createJaewoonVibeReferenceImageStudyRequest:createVibeReferenceImageStudyRequest,bindJaewoonVibeReferenceImageObservation:bindVibeReferenceImageObservation,createJaewoonVibeReferenceMapAbstraction:createVibeReferenceMapAbstraction,createJaewoonVibeMapDNA:createVibeMapDNA,createJaewoonVibeProceduralWorldLayout:createVibeProceduralWorldLayout,createJaewoonVibeRouteGraph:createVibeRouteGraph,createJaewoonVibeWorldStreamingPlan:createVibeWorldStreamingPlan,createJaewoonVibeAdaptiveWorldGenerationPlan:createVibeAdaptiveWorldGenerationPlan,createJaewoonVibeSceneContext:createVibeSceneContext,createJaewoonVibePropRecreationBlueprint:createVibePropRecreationBlueprint,createJaewoonVibeSceneRecreationPlan:createVibeSceneRecreationPlan,planJaewoonVibeAssetRecreationAutopilot:planVibeAssetRecreationAutopilot,createJaewoonVibeMaterialBehavior:createVibeMaterialBehavior,createJaewoonVibeForceResponse:createVibeForceResponse,createJaewoonVibeFluidInteraction:createVibeFluidInteraction,createJaewoonVibeThermalInteraction:createVibeThermalInteraction,createJaewoonVibeChemistryInteraction:createVibeChemistryInteraction,createJaewoonVibeReactionTableContract:createVibeReactionTableContract,createJaewoonVibeStructuralPhysics:createVibeStructuralPhysics,createJaewoonVibeEnvironmentalCoupling:createVibeEnvironmentalCoupling,createJaewoonVibeWeatherInteractionProfile:createVibeWeatherInteractionProfile,createJaewoonVibePhysicalInteractionContract:createVibePhysicalInteractionContract,scoreJaewoonVibeEnvironmentalRealism:scoreVibeEnvironmentalRealism,planJaewoonVibeEnvironmentalInteractionAutopilot:planVibeEnvironmentalInteractionAutopilot,planJaewoonVibeWorldAutopilot:planVibeWorldAutopilot,planJaewoonVibeEnvironmentAutopilot:planVibeEnvironmentAutopilot})}
