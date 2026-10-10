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
export function createVibeMapDetailReconstruction({sketch={},assets=[],styleFamily='STYLIZED_FANTASY',seed='map',gameId='',target='UNITY'}={}){
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
  const layerAssetUsage=new Map();
  const regions=districts.filter(row=>row?.id&&ids.has(row.anchorNodeId)).map((district,index)=>({
    id:district.id,anchorNodeId:district.anchorNodeId,function:district.function,
    landmark:district.landmark||null,styleFamily,
    productionSequence:['BLOCKOUT','STRUCTURAL_AUTHORING','FUNCTIONAL_DETAIL','MATERIAL_AND_HISTORY','AMBIENT_MOTION','PLATFORM_VARIANTS','APPLY_TO_WORLD'],
    detailByDistance:distanceDetail,
    layers:layerRules.map(([layer,family,detail,authoringPasses],layerIndex)=>{
      // 공개된 공용 원본을 모두 검사한다. 권리·3D 형식·지역 역할이 맞지 않으면 적용 자격이 아니다.
      const spatial=['TERRAIN','STRUCTURE','VEGETATION','FUNCTIONAL_PROPS'].includes(layer);
      const candidates=(Array.isArray(assets)?assets:[]).filter(asset=>{
        const paths=[asset?.path,asset?.masterGlb,asset?.meshArtifact,...(asset?.sourceFiles||[]),...(asset?.nativeArtifacts||[])].map(value=>String(value||''));
        const native3d=paths.some(value=>/\.(?:glb|gltf|fbx|obj|mesh|prefab)$/i.test(value));
        const roles=Array.isArray(asset?.mapDetailRoles)?asset.mapDetailRoles:[];
        const license=String(asset?.license||'').toUpperCase();
        const restricted=asset?.rightsPass===false||asset?.securityBlocked===true||asset?.quarantined===true||/NON.?COMMERCIAL|\bNC\b|NO.DERIVATIVES|FORBIDDEN|UNKNOWN|UNVERIFIED/.test(license);
        return !restricted&&String(asset?.family||asset?.category).toUpperCase()===family
          &&Boolean(asset?.id||asset?.assetId)&&Boolean(asset?.sourceHash||asset?.contentHash||asset?.sha256)
          &&(!asset?.districtFunctions?.length||asset.districtFunctions.includes(district.function))
          &&(roles.length?roles.includes(layer):(!spatial||native3d));
      }).sort((a,b)=>String(a.id||a.assetId).localeCompare(String(b.id||b.assetId)));
      const scored=candidates.map(asset=>{
        const paths=[asset.path,asset.masterGlb,asset.meshArtifact,...(asset.sourceFiles||[]),...(asset.nativeArtifacts||[])].map(value=>String(value||''));
        const native3d=paths.some(value=>/\.(?:glb|gltf|fbx|obj|mesh|prefab)$/i.test(value));
        const assetId=String(asset.id||asset.assetId),usage=layerAssetUsage.get(family+':'+assetId)||0;
        const exact=Array.isArray(asset.mapDetailRoles)&&asset.mapDetailRoles.includes(layer);
        const sameGame=Array.isArray(asset.consumerGameIds)&&asset.consumerGameIds.includes(gameId);
        const matchStyle=!asset.styleFamily||String(asset.styleFamily)===String(styleFamily);
        const jitter=proceduralCellHash(hash^index,layerIndex,assetId.split('').reduce((n,c)=>n+c.charCodeAt(0),0))%11;
        return {asset,assetId,native3d,score:(exact?50:0)+(native3d?25:0)+(sameGame?18:0)+(matchStyle?8:0)-usage*35+jitter};
      }).sort((a,b)=>b.score-a.score||a.assetId.localeCompare(b.assetId));
      const chosen=scored[0]||null,selected=chosen?.asset||null;
      if(chosen)layerAssetUsage.set(family+':'+chosen.assetId,(layerAssetUsage.get(family+':'+chosen.assetId)||0)+1);
      const license=String(selected?.license||'').toUpperCase();
      const rightsVerified=selected?.rightsPass===true||/^(?:CC0|CC-BY|MIT|APACHE|PUBLIC_DOMAIN|OWNED)/.test(license);
      const nativeReady=Boolean(selected&&(!spatial||chosen.native3d)&&rightsVerified);
      return{
        layer,family,detail,authoringPasses:Object.freeze(authoringPasses),cause:district.function,
        assetId:chosen?.assetId||null,sourceHash:selected?.sourceHash||selected?.contentHash||selected?.sha256||null,
        eligibleCandidateCount:candidates.length,
        candidateAssetIds:Object.freeze(candidates.map(asset=>String(asset.id||asset.assetId))),
        selectionAlgorithm:'DETERMINISTIC_ROLE_FIT_REUSE_PENALTY',
        binding:Object.freeze({gameId:String(gameId),target:String(target).toUpperCase(),nativeReady,rightsVerified,sourceIs3d:chosen?.native3d===true,actualGameSourceBinding:false}),
        status:nativeReady?'REUSE_AND_REAUTHOR':selected?'NATIVE_SOURCE_OR_RIGHTS_REVIEW_REQUIRED':'AUTHORING_REQUIRED',
        productionAction:nativeReady?'ADAPT_EXISTING_ASSET_TO_DISTRICT_AND_STYLE':'VERIFY_RIGHTS_AND_CREATE_EDITABLE_NATIVE_3D_ASSET',
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
export function createVibeProceduralWorldLayout({seed='world',width=24,height=24,cellSize=3,dimension='3D',biome='TEMPERATE',climate='TEMPERATE',buildingStyle='LOCAL',density=.25,mobile=true,approvedDesign=false,reservedCells=[],maxSlopeDegrees=35,fovDegrees=95,cameraForward={x:1,z:0},libraryAssets=[],gameId='',target='UNITY',styleFamily='STYLIZED_FANTASY',season='ANNUAL',ecosystemFeedback=null,era='AUTO',eraByZone={},waterMode='AUTO',ecologyActors=[],authoredDungeonSites=[]}={}){
  const noMutation={sourceMutationPerformed:false,nativeAssetInstancingPerformed:false,runtimeVerified:false,gameplayRuleMutation:false,saveMeaningMutation:false};
  if(approvedDesign!==true)return Object.freeze({status:'APPROVED_DESIGN_REQUIRED',issues:Object.freeze(['APPROVED_WORLD_DESIGN_REQUIRED']),...noMutation});
  const maximum=mobile?48:72,validNumber=n=>typeof n==='number'&&Number.isFinite(n);
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<12||height<12||width>maximum||height>maximum||!validNumber(cellSize)||cellSize<=0||!['2D','3D'].includes(dimension)||!validNumber(density)||density<0||density>1||!validNumber(maxSlopeDegrees)||maxSlopeDegrees<=0||maxSlopeDegrees>=90||!validNumber(fovDegrees)||fovDegrees<=0||fovDegrees>180||!validNumber(cameraForward?.x)||!validNumber(cameraForward?.z)||Math.hypot(cameraForward.x,cameraForward.z)<1e-6){
    return Object.freeze({status:'INVALID_GENERATION_INPUT',issues:Object.freeze(['DIMENSIONS_OR_BUDGET_INVALID']),...noMutation});
  }
  const seasonKey=String(season).toUpperCase();
  if(!['ANNUAL','SPRING','SUMMER','AUTUMN','WINTER'].includes(seasonKey))
    return Object.freeze({status:'INVALID_GENERATION_INPUT',issues:Object.freeze(['SEASON_INVALID']),...noMutation});
  const requestedEra=String(era).toUpperCase(),requestedWater=String(waterMode).toUpperCase();
  const worldWords=String(biome+' '+climate).toUpperCase(),buildingWords=String(buildingStyle).toUpperCase();
  // 사용자가 옵션을 설정할 필요 없이 승인된 세계관·지리·건축 정보를 읽어 자동 선택한다.
  const inferredEra=/HYBRID|MIXED|COMPOSITE|복합/.test(buildingWords)?'HYBRID'
    :/FUTURE|SCI.?FI|CYBER|SPACE|미래/.test(buildingWords)?'FUTURE'
    :/MODERN|URBAN|CONTEMPORARY|현대/.test(buildingWords)?'MODERN'
    :/ANCIENT|ROMAN|GREEK|EGYPT|고대/.test(buildingWords)?'ANCIENT'
    :/MEDIEVAL|CASTLE|FEUDAL|GOTHIC|중세/.test(buildingWords)?'MEDIEVAL':'LOCAL';
  const inferredWater=/ARCHIPELAGO|군도/.test(worldWords)?'ARCHIPELAGO'
    :/ISLAND|섬/.test(worldWords)?'ISLAND'
    :/LAKE|호수/.test(worldWords)?'LAKES'
    :/COAST|BEACH|SEASHORE|해안/.test(worldWords)?'COASTAL'
    :/OCEAN|SEA|MARINE|바다|해양/.test(worldWords)?'OCEAN':'AUTO';
  const eraKey=requestedEra==='AUTO'?inferredEra:requestedEra;
  const waterKey=requestedWater==='AUTO'?inferredWater:requestedWater;
  const supportedEras=['AUTO','LOCAL','ANCIENT','MEDIEVAL','MODERN','FUTURE','HYBRID'];
  const supportedWaters=['AUTO','OCEAN','COASTAL','ISLAND','ARCHIPELAGO','LAKES'];
  if(!supportedEras.includes(requestedEra)||!supportedWaters.includes(requestedWater)||
    !eraByZone||typeof eraByZone!=='object'||Array.isArray(eraByZone)||
    Object.entries(eraByZone).some(([key,value])=>!['RESIDENTIAL','COMMERCIAL','WORKSHOP'].includes(key)||!supportedEras.includes(String(value).toUpperCase()))||
    !Array.isArray(ecologyActors)||!Array.isArray(authoredDungeonSites)){
    return Object.freeze({status:'INVALID_GENERATION_INPUT',issues:Object.freeze(['ERA_WATER_OR_ACTOR_INPUT_INVALID']),...noMutation});
  }
  const w=width,h=height,hash=String(seed).split('').reduce((v,c)=>Math.imul(v^c.charCodeAt(0),16777619)>>>0,2166136261);
  const objectNamespace='WORLD_'+hash.toString(36).toUpperCase();
  // 공용 자산은 게임에 통째로 복사하지 않는다. 실제 3D 원본+권리 확인 후보만 구조물에 매핑한다.
  const pool=(Array.isArray(libraryAssets)?libraryAssets:[]).filter(asset=>{
    const files=[asset?.path,asset?.masterGlb,asset?.meshArtifact,...(asset?.sourceFiles||[]),...(asset?.nativeArtifacts||[])];
    const license=String(asset?.license||'').toUpperCase();
    const family=String(asset?.family||asset?.category).toUpperCase();
    const hasNativeMesh=files.some(file=>/\.(?:glb|gltf|fbx|obj|mesh|prefab)$/i.test(String(file||'')));
    const hasNativeMaterial=files.some(file=>/\.(?:png|jpe?g|webp|tga|ktx2|mat|shader)$/i.test(String(file||'')));
    return Boolean(asset?.id||asset?.assetId)&&Boolean(asset?.sourceHash||asset?.contentHash||asset?.sha256)
      &&(family==='MATERIAL'?hasNativeMaterial||hasNativeMesh:hasNativeMesh)
      &&asset?.rightsPass!==false&&asset?.quarantined!==true&&asset?.securityBlocked!==true
      &&!/NON.?COMMERCIAL|\bNC\b|NO.DERIVATIVES|FORBIDDEN|UNKNOWN|UNVERIFIED/.test(license)
      &&(asset?.rightsPass===true||/^(?:CC0|CC-BY|MIT|APACHE|PUBLIC_DOMAIN|OWNED)/.test(license))
      &&['BUILDING','ENVIRONMENT','PROP','MATERIAL','CREATURE','CHARACTER'].includes(family);
  }).sort((a,b)=>String(a.id||a.assetId).localeCompare(String(b.id||b.assetId)));
  const poolByFamily=new Map(['BUILDING','ENVIRONMENT','PROP','MATERIAL','CREATURE','CHARACTER'].map(family=>[family,pool.filter(row=>String(row.family||row.category).toUpperCase()===family)]));
  const sourceUsage=new Map();
  const pickSource=(family,kind,x,z)=>{
    const candidates=poolByFamily.get(family)||[];
    const salt=[gameId,styleFamily,kind].join(':').split('').reduce((n,c)=>Math.imul(n^c.charCodeAt(0),16777619)>>>0,2166136261);
    const ranked=candidates.map(asset=>{
      const identity=String(asset.id||asset.assetId),words=[asset.role,asset.subfamily,asset.title,asset.name,...(asset.tags||[])].join(' ').toUpperCase();
      const match=words.includes(String(kind).toUpperCase());
      const sameGame=(asset.consumerGameIds||[]).includes(gameId);
      const sameStyle=!asset.styleFamily||String(asset.styleFamily).toUpperCase()===String(styleFamily).toUpperCase();
      const stableIdHash=identity.split('').reduce((n,c)=>Math.imul(n^c.charCodeAt(0),16777619)>>>0,2166136261);
      const variation=proceduralCellHash(hash^salt^stableIdHash,x,z)%17;
      return{asset,identity,score:(match?70:0)+(sameGame?16:0)+(sameStyle?10:0)+variation-(sourceUsage.get(identity)||0)*12};
    }).sort((a,b)=>b.score-a.score||a.identity.localeCompare(b.identity));
    const chosen=ranked[0]?.asset||null;
    if(chosen){const id=String(chosen.id||chosen.assetId);sourceUsage.set(id,(sourceUsage.get(id)||0)+1);}
    return Object.freeze({status:chosen?'SOURCE_SELECTED_NATIVE_APPLICATION_REQUIRED':'NATIVE_ASSET_AUTHORING_REQUIRED',
      assetId:chosen?.id||chosen?.assetId||null,sourceHash:chosen?.sourceHash||chosen?.contentHash||chosen?.sha256||null,
      sourceFiles:Object.freeze(chosen?[...new Set([chosen.path,chosen.masterGlb,chosen.meshArtifact,...(chosen.sourceFiles||[]),...(chosen.nativeArtifacts||[])].filter(Boolean))]:[]),
      family,kind,gameId:String(gameId),target:String(target).toUpperCase(),styleFamily:String(styleFamily),
      originalImmutable:true,appliedToNativeGame:false,runtimeVerified:false});
  };
  const at=(x,z)=>z*w+x,within=(x,z)=>x>=0&&x<w&&z>=0&&z<h;
  // 좌표는 동일한 격자 X/Z에서 계산하고 2D 최종 배치 위치만 X/Y로 변환한다.
  const worldPosition=(x,z,elevationY=0)=>dimension==='2D'?{x:x*cellSize,y:z*cellSize}:{x:x*cellSize,y:elevationY,z:z*cellSize};
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
    const regionalBiome=String(biome).toUpperCase(),wet=/WET|SWAMP|JUNGLE|RAIN/.test(regionalBiome+' '+climate),dry=/DESERT|ARID|DRY/.test(regionalBiome+' '+climate),mountain=/MOUNTAIN|ALPINE|RIDGE/.test(regionalBiome);
    const elevation=Math.max(.05,Math.min(.95,.48+.5*octave(nx*4,nz*4,0x22bb)+.16*ridge+(mountain?.12:0)));
    const moisture=Math.max(0,Math.min(1,.52+.58*octave(nx*3+11,nz*3-7,0x397a)+(wet?.2:0)-(dry?.25:0)));
    let type=elevation<(dry?.25:mountain?.31:.38)?'WATER':elevation>(mountain?.66:.68)?'RIDGE':moisture>.66?'FOREST':moisture<.28?'DRY':'PLAIN';
    // 해양·섬·호수는 승인된 맵에서만 생성하며, 기본 AUTO는 과거 지형을 그대로 보존한다.
    if(waterKey!=='AUTO'){
      const sx=(x+.5)/w,sz=(z+.5)/h,radial=Math.hypot((sx-.5)*1.32,(sz-.5)*1.32);
      const coastNoise=octave(sx*5,sz*5,0xc0a57)*.13;
      const sea=waterKey==='COASTAL'?(sx<.27+coastNoise)
        :waterKey==='OCEAN'?(sx<.43+coastNoise)
        :waterKey==='ISLAND'?(radial>.54+coastNoise)
        :waterKey==='ARCHIPELAGO'?(Math.min(Math.hypot(sx-.36,sz-.42),Math.hypot(sx-.69,sz-.6))>.2+coastNoise*.35)
        :false;
      const lake=waterKey==='LAKES'&&(Math.hypot((sx-.73)*1.5,(sz-.32)*1.5)<.115+coastNoise*.1);
      if(sea||lake)type='WATER';
      else if(waterKey==='LAKES'||waterKey==='OCEAN'||waterKey==='COASTAL'||waterKey==='ISLAND'||waterKey==='ARCHIPELAGO')
        type=elevation>(mountain?.66:.68)?'RIDGE':moisture>.66?'FOREST':moisture<.28?'DRY':'PLAIN';
    }
    terrain.push({x,z,elevation:+elevation.toFixed(4),moisture:+moisture.toFixed(4),biome:type});
  }
  for(const tile of terrain){
    const {x,z}=tile,diffs=[[x-1,z],[x+1,z],[x,z-1],[x,z+1]].filter(([a,b])=>within(a,b));
    const rise=Math.max(0,...diffs.map(([a,b])=>Math.abs(tile.elevation-terrain[at(a,b)].elevation)*8));
    tile.slopeDegrees=+(Math.atan2(rise,cellSize)*180/Math.PI).toFixed(2);
    const lower=diffs.map(([a,b])=>terrain[at(a,b)]).filter(t=>t.elevation<tile.elevation).sort((a,b)=>a.elevation-b.elevation||a.z-b.z||a.x-b.x)[0];
    tile.drainageTo=lower?{x:lower.x,z:lower.z}:null;
  }
  // 수체 연결요소: 가장자리 바다와 내륙 호수를 별도 분류하고 염분·연안 생태계를 구분한다.
  const waterComponents=[],waterComponentByCell=new Int32Array(w*h).fill(-1),visitWater=new Uint8Array(w*h);
  for(const tile of terrain){
    const start=at(tile.x,tile.z);
    if(tile.biome!=='WATER'||visitWater[start])continue;
    const queue=[start],cells=[];visitWater[start]=1;let touchesBoundary=false;
    for(let i=0;i<queue.length;i++){
      const id=queue[i],x=id%w,z=Math.floor(id/w);cells.push(id);
      if(x===0||z===0||x===w-1||z===h-1)touchesBoundary=true;
      for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]){
        const xx=x+dx,zz=z+dz;if(!within(xx,zz))continue;
        const ni=at(xx,zz);
        if(visitWater[ni]||terrain[ni].biome!=='WATER')continue;
        visitWater[ni]=1;queue.push(ni);
      }
    }
    const type=touchesBoundary?'OCEAN':'LAKE';
    const index=waterComponents.length;
    for(const id of cells)waterComponentByCell[id]=index;
    waterComponents.push(Object.freeze({id:'WATER_BODY_'+index,kind:type,cellCount:cells.length,
      salinityPpt:type==='OCEAN'?35:0,source:'SEEDED_WATER_BODY_CONNECTED_COMPONENT',
      nativeWaterShaderVerified:false,gameplaySwimmingRulesChanged:false}));
  }
  const coastDistance=new Int16Array(w*h).fill(32767),coastQueue=[];
  for(const tile of terrain){
    const id=at(tile.x,tile.z);
    const isWater=tile.biome==='WATER';
    const adjacent=[[-1,0],[1,0],[0,-1],[0,1]].some(([dx,dz])=>within(tile.x+dx,tile.z+dz)&&
      (terrain[at(tile.x+dx,tile.z+dz)].biome==='WATER')!==isWater);
    if(adjacent){coastDistance[id]=0;coastQueue.push(id);}
  }
  for(let i=0;i<coastQueue.length;i++){
    const id=coastQueue[i],x=id%w,z=Math.floor(id/w);
    for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]){
      const xx=x+dx,zz=z+dz;if(!within(xx,zz))continue;
      const ni=at(xx,zz);
      if(coastDistance[ni]>coastDistance[id]+1){coastDistance[ni]=coastDistance[id]+1;coastQueue.push(ni);}
    }
  }
  // 유역 유출량은 높은 셀부터 하류로 누적한다. 높이·충돌·하천 연결은 바꾸지 않는다.
  const runoff=Float64Array.from(terrain,tile=>.15+tile.moisture*.85);
  for(const tile of [...terrain].sort((a,b)=>b.elevation-a.elevation||a.z-b.z||a.x-b.x)){
    if(tile.drainageTo)runoff[at(tile.drainageTo.x,tile.drainageTo.z)]+=runoff[at(tile.x,tile.z)];
  }
  for(const tile of terrain){
    const accumulated=runoff[at(tile.x,tile.z)];
    tile.catchment=Object.freeze({runoffUnits:+accumulated.toFixed(3),erosionRisk:+Math.min(1,Math.log1p(accumulated)*tile.slopeDegrees/65).toFixed(3),
      model:'DOWNSLOPE_FLOW_ACCUMULATION',terrainEroded:false,actualFloodSimulation:false});
  }
  // 침식으로 고도를 바꾸지 않고, 경사가 낮아지는 기존 셀만 잇는 하천 후보를 만든다.
  const river=[],sources=terrain.filter(t=>t.elevation>.57&&t.biome!=='WATER').sort((a,b)=>b.elevation-a.elevation||a.z-b.z||a.x-b.x);
  const riverStart=sources[Math.floor((proceduralCellHash(hash,4,7)/4294967296)*Math.min(18,sources.length))];
  const riverVisited=new Set();let downstream=riverStart;
  while(downstream&&river.length<Math.max(w,h)&&!riverVisited.has(at(downstream.x,downstream.z))){
    river.push({x:downstream.x,z:downstream.z});riverVisited.add(at(downstream.x,downstream.z));
    const next=downstream.drainageTo;downstream=next?terrain[at(next.x,next.z)]:null;
  }
  const riverType=/ARID|DRY|DESERT/.test(String(climate).toUpperCase()+' '+String(biome).toUpperCase())?'SEASONAL_DRY_CHANNEL':'PERENNIAL_FLOW_CANDIDATE';
  const waterway=new Set(riverType==='SEASONAL_DRY_CHANNEL'?[]:river.map(c=>at(c.x,c.z)));
  // 지형 셀의 하천·지질·토양·서식지를 결정론적으로 연결한다. 게임 충돌·경제·스폰은 수정하지 않는다.
  const wetDistance=new Int16Array(w*h).fill(32767),waterQueue=[];
  for(const tile of terrain){
    const id=at(tile.x,tile.z);
    if(tile.biome==='WATER'||waterway.has(id)){wetDistance[id]=0;waterQueue.push(id);}
  }
  for(let head=0;head<waterQueue.length;head++){
    const current=waterQueue[head],x=current%w,z=Math.floor(current/w);
    for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]){
      const xx=x+dx,zz=z+dz;if(!within(xx,zz))continue;
      const next=at(xx,zz),distance=wetDistance[current]+1;
      if(distance<wetDistance[next]){wetDistance[next]=distance;waterQueue.push(next);}
    }
  }
  const climateTag=String(climate+' '+biome).toUpperCase(),coldRegion=/SNOW|ICE|COLD|POLAR|ALPINE/.test(climateTag),aridRegion=/ARID|DESERT|DRY/.test(climateTag);
  const volcanicRegion=/VOLCAN|LAVA|BASALT/.test(climateTag),seasonalThermal=seasonKey==='WINTER'?'COLD':seasonKey==='SUMMER'?'WARM':'NEUTRAL';
  const clamp01=n=>Math.max(0,Math.min(1,n));
  const materialCounts=new Map(),habitatCounts=new Map(),geologyRegions=new Map();
  for(const tile of terrain){
    const {x,z}=tile,id=at(x,z),waterDistance=wetDistance[id]===32767?null:wetDistance[id];
    // Worley/Voronoi 최근접 구역: 지질·토양 경계가 픽셀 잡음처럼 끊어지지 않게 유도한다.
    const scale=6,cx=Math.floor(x/scale),cz=Math.floor(z/scale);let nearest=null;
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const gx=cx+dx,gz=cz+dz,noise=proceduralCellHash(hash^0x62b4,gx,gz);
      const sx=(gx+.2+.6*(noise/4294967296))*scale,sz=(gz+.2+.6*(proceduralCellHash(hash^0xfbe1,gx,gz)/4294967296))*scale;
      const distance=(x-sx)**2+(z-sz)**2;
      if(!nearest||distance<nearest.distance)nearest={gx,gz,distance};
    }
    const stratum=['GRANITE','LIMESTONE','SHALE','BASALT'][volcanicRegion?3:proceduralCellHash(hash^0x977d,nearest.gx,nearest.gz)%3];
    const geologyId=nearest.gx+':'+nearest.gz;
    const annualTemperature=clamp01((coldRegion?.27:aridRegion?.77:.58)-(tile.elevation-.45)*.38+
      .08*proceduralGradientNoise(hash^0xbeef,x/8,z/8));
    const temperature=clamp01(annualTemperature+(seasonKey==='WINTER'?-0.2:seasonKey==='SUMMER'?.12:0));
    const humidity=clamp01(tile.moisture+(waterDistance!==null?.24*Math.exp(-waterDistance/3):0)-(aridRegion?.2:0));
    const slope=tile.slopeDegrees,rocky=tile.biome==='RIDGE'||slope>22;
    const waterIndex=waterComponentByCell[id],body=waterIndex>=0?waterComponents[waterIndex]:null;
    const shoreline=coastDistance[id]===32767?null:coastDistance[id];
    // Whittaker 기후-강수 원리를 이용해 육상과 해양의 생태 영역을 구분한다. 실측 기후로 주장하지 않는다.
    const annualRainIndex=clamp01(humidity*.8+(waterDistance!==null?.06:0));
    const isMarine=body?.kind==='OCEAN',isFresh=body?.kind==='LAKE';
    const depthEstimate=body?+(Math.max(.5,(shoreline||0)*1.65+Math.max(0,.42-tile.elevation)*10)).toFixed(2):null;
    const waterEnvironment=isMarine
      ?annualTemperature>.64&&depthEstimate<8?'CORAL_REEF':annualTemperature<.52&&depthEstimate<12?'KELP_FOREST':
        depthEstimate>=26?'DEEP_OCEAN':'OPEN_OCEAN'
      :isFresh?'FRESHWATER_LAKE':null;
    const earthBiome=body?waterEnvironment
      :rocky&&annualTemperature<.35?'ALPINE'
      :annualTemperature<.18?'TUNDRA':annualTemperature<.35?(annualRainIndex>.38?'BOREAL_FOREST':'COLD_STEPPE')
      :annualTemperature>.69?(annualRainIndex>.72?'TROPICAL_RAINFOREST':annualRainIndex>.38?'SAVANNA':'HOT_DESERT')
      :annualRainIndex<.25?'TEMPERATE_DESERT':annualRainIndex>.72?'TEMPERATE_RAINFOREST':
        annualRainIndex>.42?'TEMPERATE_FOREST':'TEMPERATE_GRASSLAND';
    const shoreBiome=!body&&shoreline!==null&&shoreline<=2
      ?annualTemperature>.64&&annualRainIndex>.65?'MANGROVE':annualRainIndex>.67?'FRESHWATER_WETLAND':'COASTAL_MARGIN'
      :null;
    const habitat=body?waterEnvironment
      :shoreBiome==='MANGROVE'?'MANGROVE':shoreBiome==='FRESHWATER_WETLAND'?'WETLAND'
      :rocky?'ROCKY_RIDGE':aridRegion||humidity<.27?'DRY_SCRUB'
      :temperature<.3?'COLD_UPLAND':waterDistance!==null&&waterDistance<=2?'RIPARIAN'
      :tile.biome==='FOREST'?'CANOPY_FOREST':'GRASSLAND';
    const primary=body?(isMarine?'COASTAL_SAND_SEABED':'FRESHWATER_SEDIMENT')
      :shoreBiome==='MANGROVE'?'PEAT_AND_SILT':shoreBiome==='FRESHWATER_WETLAND'?'WET_SILT'
      :rocky?stratum:temperature<.19&&tile.elevation>.5?'SNOW_COVER'
      :aridRegion?'SAND_AND_GRAVEL':habitat==='RIPARIAN'?'FLOODPLAIN_SILT'
      :tile.biome==='FOREST'?'MOSS_LOAM':'GRASS_SOIL';
    const secondary=primary==='RIVER_SEDIMENT'?'WET_SILT':primary==='SAND_AND_GRAVEL'?'DRY_SOIL'
      :rocky?'STONE_GRAVEL':humidity>.6?'MOSS_LOAM':'DRY_SOIL';
    const soilDepth=+(clamp01(.58+.22*humidity-slope/85-tile.catchment.erosionRisk*.23)).toFixed(3);
    const substrateStability=+(clamp01(.93-.4*(slope/90)-.2*tile.catchment.erosionRisk+
      (stratum==='GRANITE'?.07:stratum==='SHALE'?-.13:0))).toFixed(3);
    const blend=+(clamp01(.1+humidity*.27+(slope/90)*.13)).toFixed(3);
    const carryingCapacity=tile.biome==='WATER'?0:+(clamp01(
      (.18+humidity*.72)*(1-Math.min(.85,slope/65))*(habitat==='ROCKY_RIDGE'?.35:1)*
      (annualTemperature<.18?.55:1))).toFixed(3);
    tile.aquatic=body?Object.freeze({bodyId:body.id,kind:body.kind,visualZone:waterEnvironment,estimatedDepthMeters:depthEstimate,
      salinityPpt:body.salinityPpt,tidalInfluence:isMarine&&shoreline!==null&&shoreline<=2,
      openWater:depthEstimate>=12,sourceNative3dWaterMeshRequired:true,realHydrologyMeasured:false,
      swimmingAndFishingAuthority:false,actualNativeWaterVerified:false}):null;
    tile.earthBiome=Object.freeze({name:shoreBiome||earthBiome,climateClass:earthBiome,coastalTransition:shoreBiome||null,
      wetnessIndex:+annualRainIndex.toFixed(3),meanTemperatureProxy:+annualTemperature.toFixed(3),
      abioticDrivers:Object.freeze(['TEMPERATURE','PRECIPITATION','ALTITUDE','SOIL','FRESHWATER','SALINITY']),
      ecologicalSuccessionIsVisualPlanningOnly:true,worldGameplayAuthority:false});
    tile.surface=Object.freeze({primary,secondary,secondaryBlend:blend,geologyId,stratum,waterDistanceCells:waterDistance,
      temperature: +temperature.toFixed(3),annualTemperature:+annualTemperature.toFixed(3),humidity:+humidity.toFixed(3),soilDepth,substrateStability,season:seasonKey,materialModel:'SEEDED_VORONOI_GEOLOGY_AND_FBM_HYDROLOGY',
      nativeShaderAnd3dTerrainBindingRequired:true,nativeMaterialApplied:false});
    tile.ecology=Object.freeze({habitat,carryingCapacity,visualCover:0,scenicOnly:true,
      spawnRateAuthority:false,gameplayResourcesUnchanged:true});
    materialCounts.set(primary,(materialCounts.get(primary)||0)+1);
    habitatCounts.set(habitat,(habitatCounts.get(habitat)||0)+1);
    geologyRegions.set(geologyId,(geologyRegions.get(geologyId)||0)+1);
  }
  const earthBiomeCounts=new Map();
  for(const tile of terrain)earthBiomeCounts.set(tile.earthBiome.name,(earthBiomeCounts.get(tile.earthBiome.name)||0)+1);
  const terrainMaterialGroups=[...materialCounts].sort(([a],[b])=>a.localeCompare(b)).map(([kind,count])=>Object.freeze({
    kind,count,sourceBinding:pickSource('MATERIAL',kind,0,0),worldTerrainMaterialApplied:false
  }));
  const passable=(x,z)=>within(x,z)&&!blocked.has(at(x,z))&&!waterway.has(at(x,z))&&terrain[at(x,z)].biome!=='WATER';
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
    routes.push({id:from+'-'+to,from,to,cells,worldPath:cells.map(cell=>worldPosition(cell.x,cell.z,terrain[at(cell.x,cell.z)].elevation*8))});
  }
  const routeGraph=createVibeRouteGraph({nodes:routeNodes.map(([id,,role])=>({id,role,required:id!=='BRANCH'})),edges:routes.map(r=>({from:r.from,to:r.to,kind:'main'}))});
  if(!routeGraph.pass)issues.push('REQUIRED_OBJECTIVE_UNREACHABLE');
  const sightCells=new Set();
  if(hub&&landmark){
    const steps=Math.max(Math.abs(hub.x-landmark.x),Math.abs(hub.z-landmark.z))*2;
    for(let i=0;i<=steps;i++){const t=steps?i/steps:0;sightCells.add(at(Math.round(hub.x+(landmark.x-hub.x)*t),Math.round(hub.z+(landmark.z-hub.z)*t)));}
  }
  // 도시계획: 실제 길 그래프 위 보행 도달 거리, 간선 위계, 대지 홍수·경사 위험을 계산한다.
  const pedestrianDistance=new Int32Array(w*h).fill(-1),arterial=new Set(),collector=new Set(),roadDegree=new Map();
  for(const line of routes){
    const traffic=line.id==='ENTRY-HUB'||line.id==='HUB-LANDMARK'?arterial:collector;
    for(const cell of line.cells)traffic.add(at(cell.x,cell.z));
  }
  const hubRoad=hub?at(hub.x,hub.z):-1;
  if(roadSet.has(hubRoad)){
    const queue=[hubRoad];pedestrianDistance[hubRoad]=0;
    for(let i=0;i<queue.length;i++){
      const id=queue[i],x=id%w,z=Math.floor(id/w);
      for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]){
        if(!within(x+dx,z+dz))continue;
        const next=at(x+dx,z+dz);
        if(!roadSet.has(next)||pedestrianDistance[next]!==-1)continue;
        pedestrianDistance[next]=pedestrianDistance[id]+1;queue.push(next);
      }
    }
  }
  for(const id of roadSet){
    const x=id%w,z=Math.floor(id/w),neighbors=[[-1,0],[1,0],[0,-1],[0,1]].filter(([dx,dz])=>within(x+dx,z+dz)&&roadSet.has(at(x+dx,z+dz))).length;
    roadDegree.set(id,neighbors);
  }
  const streetCategory=id=>arterial.has(id)?'ARTERIAL':collector.has(id)?'COLLECTOR':'LOCAL';
  const buildings=[],occupied=new Set([...roadSet,...blocked]),instanceGroups=new Map();
  const maxBuildings=mobile?22:56,style=String(buildingStyle||'LOCAL').toUpperCase();
  const addInstance=(name,x,z,rotation=0,levelY=terrain[at(x,z)].elevation*8)=>{
    const key=style+':'+name,group=instanceGroups.get(key)||{module:key,count:0,transforms:[]};
    group.transforms.push({...worldPosition(x,z,levelY),rotation});group.count++;instanceGroups.set(key,group);
  };
  for(const id of [...roadSet].sort((a,b)=>a-b)){
    if(buildings.length>=maxBuildings)break;
    const rx=id%w,rz=Math.floor(id/w);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const x=rx+dx-(dx<0?1:0),z=rz+dz-(dz<0?1:0),footprint=[];
      for(let d=0;d<2;d++)for(let e=0;e<2;e++)footprint.push({x:x+d,z:z+e});
      if(footprint.some(c=>!within(c.x,c.z)||occupied.has(at(c.x,c.z))||waterway.has(at(c.x,c.z))||sightCells.has(at(c.x,c.z))||terrain[at(c.x,c.z)].biome==='WATER'||terrain[at(c.x,c.z)].slopeDegrees>maxSlopeDegrees))continue;
      const footing=footprint.map(c=>terrain[at(c.x,c.z)].elevation*8);
      const maxAccessibleRise=Math.tan(maxSlopeDegrees*Math.PI/180)*cellSize;
      if(Math.max(...footing)-Math.min(...footing)>maxAccessibleRise)continue;
      const roadSurfaceY=terrain[id].elevation*8;
      const riseToFoundationY=Math.max(...footing)-roadSurfaceY;
      if(Math.abs(riseToFoundationY)>maxAccessibleRise)continue;
      // 대지 선정에 실제 지질·배수 적합도를 반영한다. 기존 게임 구조물은 수정하지 않는다.
      const foundationStability=Math.min(...footprint.map(c=>terrain[at(c.x,c.z)].surface.substrateStability));
      const floodBuffer=Math.min(...footprint.map(c=>terrain[at(c.x,c.z)].surface.waterDistanceCells??999));
      const erosionRisk=Math.max(...footprint.map(c=>terrain[at(c.x,c.z)].catchment.erosionRisk));
      const siteSuitability=Math.max(.65,1-(1-foundationStability)*.2-erosionRisk*.1-(floodBuffer<=1?.12:floodBuffer<=3?.05:0));
      const roll=proceduralCellHash(hash,x,z)/4294967296;
      if(roll>density*siteSuitability)continue;
      footprint.forEach(c=>occupied.add(at(c.x,c.z)));
      const distance=Math.hypot(x-(hub?.x??w/2),z-(hub?.z??h/2));
      const zone=distance<Math.min(w,h)*.23?'COMMERCIAL':x>w*.75?'WORKSHOP':'RESIDENTIAL';
      // 시대·기술 수준은 건축 모델과 문화층에만 적용한다. 전투·기술 해금·경제 단계는 바꾸지 않는다.
      const eraRequest=String(eraByZone[zone]||eraKey).toUpperCase();
      const localEra=eraRequest==='AUTO'?inferredEra:eraRequest;
      const eras=['ANCIENT','MEDIEVAL','MODERN','FUTURE'];
      const eraResolved=localEra==='HYBRID'
        ?eras[proceduralCellHash(hash^0xe2a,x,z)%eras.length]:localEra;
      const climateText=String(climate).toUpperCase(),biomeText=String(biome).toUpperCase();
      const roof=/WET|RAIN|SNOW|COLD/.test(climateText)?'PITCHED_ROOF':
        eraResolved==='ANCIENT'||eraResolved==='MODERN'||eraResolved==='FUTURE'||/ARID|DESERT/.test(climateText+' '+biomeText)?'FLAT_ROOF':'ROOF';
      const levelY=Math.max(...footing),pivot=worldPosition(x,z,levelY),doorFacing=dx!==0?(dx>0?'WEST':'EAST'):(dz>0?'NORTH':'SOUTH');
      // 문 위치와 길 연결은 월드 배치의 검증된 제안이며 실제 네비/충돌 권한은 게임 런타임이 가진다.
      const doorGrid=doorFacing==='WEST'?{x:x-.5,z:z+.5}:doorFacing==='EAST'?{x:x+1.5,z:z+.5}:doorFacing==='NORTH'?{x:x+.5,z:z-.5}:{x:x+.5,z:z+1.5};
      const stableObjectId=objectNamespace+':LOT:'+x+':'+z;
      const doorway={facing:doorFacing,position:worldPosition(doorGrid.x,doorGrid.z,levelY),roadCell:{x:rx,z:rz},roadAdjacencyVerified:roadSet.has(id),roadSlopeVerified:true,roadSurfaceY,riseToFoundationY:+riseToFoundationY.toFixed(4),runtimeNavigationVerified:false};
      const shapeSeed=proceduralCellHash(hash^0xb17d,x,z)/4294967296;
      const storeys=zone==='WORKSHOP'?1:1+(proceduralCellHash(hash^0x512, x,z)%(zone==='COMMERCIAL'?3:2));
      const floorHeight=+(cellSize*(1.3+shapeSeed*.9)).toFixed(3);
      const wallHeight=+(floorHeight*storeys).toFixed(3);
      const roofRise=roof==='FLAT_ROOF'?0:+(wallHeight*(.24+shapeSeed*.15)).toFixed(3);
      const sourceBinding=pickSource('BUILDING',eraResolved==='LOCAL'?zone:eraResolved+':'+zone,x,z);
      const baseMaterial=eraResolved==='ANCIENT'?'STONE':eraResolved==='MEDIEVAL'?
        (/GOTHIC|CASTLE/.test(style)?'STONE':'TIMBER_STONE'):
        eraResolved==='MODERN'?'STEEL_GLASS':eraResolved==='FUTURE'?'ENGINEERED_COMPOSITE':
        /GOTHIC|CASTLE/.test(style)?'STONE':/MODERN/.test(style)?'METAL_GLASS':/ARID|DESERT/.test(climateText+' '+biomeText)?'CLAY':'TIMBER';
      const eraModules=eraResolved==='ANCIENT'?['COLUMN','COURT','STONE_ARCH','ROOF_DRAIN']
        :eraResolved==='MEDIEVAL'?['TIMBER_FRAME','WALL_INFILL','LOAD_BEAM','BATTLEMENT_OR_PITCHED_ROOF']
        :eraResolved==='MODERN'?['REINFORCED_FRAME','GLAZED_FACADE','SERVICE_CORE','ELEVATOR_ACCESS']
        :eraResolved==='FUTURE'?['MODULAR_STRUCTURAL_FRAME','SMART_ENVELOPE','SKYBRIDGE_SOCKET','SERVICE_SHAFT']
        :['FOUNDATION','WALL','DOOR','ROOF'];
      const eraArchitecture=Object.freeze({era:eraResolved,eraSelection:eraRequest,
        structuralGrammar:Object.freeze(eraModules),constructionLayer:'ARCHITECTURAL_VISUAL_AUTHORING_ONLY',
        gameTechnologyOrProgressionUnlockChanged:false,periodMixSupported:eraRequest==='HYBRID',
        cultureIdentityPreserved:true,native3dComponentsRequired:true,nativeArchitectureVerified:false});
      const materialBindings=Object.freeze({
        foundation:pickSource('MATERIAL',terrain[at(x,z)].surface?.stratum||'STONE',x,z),
        wall:pickSource('MATERIAL',baseMaterial,x,z),
        roof:pickSource('MATERIAL',roof,x,z)
      });
      const minFloodBuffer=Math.min(...footprint.map(cell=>terrain[at(cell.x,cell.z)].surface?.waterDistanceCells??999));
      const maxGroundSlope=Math.max(...footprint.map(cell=>terrain[at(cell.x,cell.z)].slopeDegrees));
      const weakGround=Math.min(...footprint.map(cell=>terrain[at(cell.x,cell.z)].surface?.substrateStability??1));
      const accessSteps=pedestrianDistance[id]>=0?pedestrianDistance[id]:null;
      const accessScore=accessSteps===null?0:Math.max(0,1-accessSteps/Math.max(w,h));
      const floodScore=minFloodBuffer<=1?0:minFloodBuffer<=3?.5:1;
      const terrainScore=Math.max(0,1-maxGroundSlope/Math.max(1,maxSlopeDegrees));
      const landUseScore=+(accessScore*.5+floodScore*.25+terrainScore*.15+weakGround*.1).toFixed(3);
      const planning=Object.freeze({districtId:zone+':'+Math.floor(x/6)+':'+Math.floor(z/6),
        landUse:zone,streetClass:streetCategory(id),roadIntersectionDegree:roadDegree.get(id)||0,
        pedestrianStepsToHub:accessSteps,frontageRoadCell:{x:rx,z:rz},floodBufferCells:minFloodBuffer===999?null:minFloodBuffer,
        maxGroundSlopeDegrees:maxGroundSlope,minimumSubstrateStability:weakGround,landUseScore,
        stormwaterDrainage:terrain[at(x,z)].drainageTo||null,streetNetworkVerified:false,
        zoningAlgorithm:'GRAPH_PEDESTRIAN_ACCESS_AND_MULTICRITERIA_TERRAIN_RISK',runtimeBuildingPermitted:false});
      const building={id:'LOT_'+buildings.length,stableObjectId,doorway,planning,era:eraResolved,interactionBinding:{stableObjectId,kind:'ENTER',status:'GAMEPLAY_BINDING_REQUIRED',authoritativeState:false},zone,style,footprint,position:pivot,foundation:{terrainMinY:Math.min(...footing),terrainMaxY:Math.max(...footing),levelY},construction:{climate:climateText,primaryMaterial:baseMaterial,materialBindings,eraArchitecture,verifiedStructuralEngineering:false,
        structure3d:dimension==='3D'?Object.freeze({footprintWidthMeters:cellSize*2,footprintDepthMeters:cellSize*2,wallHeightMeters:wallHeight,wallThicknessMeters:+Math.max(.12,cellSize*.08).toFixed(3),foundationThicknessMeters:+Math.max(.15,cellSize*.12).toFixed(3),
          roofRiseMeters:roofRise,storeys,floorHeightMeters:floorHeight,structuralFloorSlabsRequired:storeys>1,doorOpeningWidthMeters:+(cellSize*.46).toFixed(3),doorOpeningHeightMeters:+(wallHeight*.7).toFixed(3),
          geometryRoles:Object.freeze(['FOUNDATION','WALL_OPENINGS','STRUCTURAL_JOINTS','DOOR_DEPTH','ROOF_GEOMETRY','INTERIOR_SHELL']),realNative3dMeshRequired:true,geometryGenerated:false}):null},
        modules:[style+':FOUNDATION',style+':WALL',style+':DOOR',style+':'+roof],doorFacing,roadAccess:{x:rx,z:rz},gridSnap:cellSize,sourceBindingRequired:true,sourceBinding};
      buildings.push(building);
      addInstance('FOUNDATION',x,z,0,levelY);
      addInstance('DOOR',x,z,0,levelY);
      addInstance(roof,x,z,0,levelY);
      for(const [ox,oz,rot] of [[0,0,0],[1,0,90],[1,1,180],[0,1,270]])addInstance('WALL',x+ox,z+oz,rot,levelY);
      break;
    }
  }
  // 해시 우선순위 + 근접 금지(블루 노이즈 근사). 단순 격자 순회로 특정 구역만 채우지 않는다.
  const vegetation=[],natureGroups=new Map(),maxVegetation=mobile?64:160,placedNatureCells=new Set();
  const climateHint=String(climate).toUpperCase(),biomeHint=String(biome).toUpperCase();
  const feedbackAccepted=ecosystemFeedback?.verifiedAgainstRuntime===true
    &&String(ecosystemFeedback.gameId||'')===String(gameId)
    &&Boolean(ecosystemFeedback.sourceRevision)
    &&ecosystemFeedback.visualDensityDeltaByHabitat&&typeof ecosystemFeedback.visualDensityDeltaByHabitat==='object';
  const visualDensityDelta=habitat=>{
    const value=feedbackAccepted?ecosystemFeedback.visualDensityDeltaByHabitat[habitat]:0;
    return Number.isFinite(value)?Math.max(-.2,Math.min(.2,value)):0;
  };
  const natureCandidates=terrain.filter(tile=>{
    const key=at(tile.x,tile.z);
    if(occupied.has(key)||waterway.has(key)||sightCells.has(key)||tile.biome==='WATER'||tile.slopeDegrees>maxSlopeDegrees)return false;
    const chance=tile.biome==='FOREST'?.44:tile.biome==='PLAIN'?.1:tile.biome==='RIDGE'?.05:tile.biome==='DRY'?.04:0;
    const capacity=tile.ecology?.carryingCapacity||0;
    // 서식지의 부양 능력과 검증된 시각 관찰값으로 *배경 식생만* 조정한다.
    const habitatChance=Math.max(.01,Math.min(.62,chance+capacity*.16+visualDensityDelta(tile.ecology?.habitat)));
    return proceduralCellHash(hash^0x10face,tile.x,tile.z)/4294967296<=habitatChance;
  }).sort((a,b)=>
    proceduralCellHash(hash^0x71eeb,a.x,a.z)-proceduralCellHash(hash^0x71eeb,b.x,b.z)
    ||a.z-b.z||a.x-b.x);
  for(const tile of natureCandidates){
    if(vegetation.length>=maxVegetation)break;
    let tooClose=false;
    for(let dz=-1;dz<=1&&!tooClose;dz++)for(let dx=-1;dx<=1;dx++){
      if(within(tile.x+dx,tile.z+dz)&&placedNatureCells.has(at(tile.x+dx,tile.z+dz))){tooClose=true;break;}
    }
    if(tooClose)continue;
    const kind=tile.biome==='RIDGE'?'ROCK':/DRY|ARID|DESERT/.test(climateHint+' '+biomeHint)?'SCRUB':/COLD|SNOW|ALPINE|MOUNTAIN/.test(climateHint+' '+biomeHint)?'PINE':tile.biome==='FOREST'?'BROADLEAF':'BUSH';
    const size=+(0.75+(proceduralCellHash(hash^0x992,tile.x,tile.z)/4294967296)*.7).toFixed(2);
    const stableObjectId=objectNamespace+':NATURE:'+kind+':'+tile.x+':'+tile.z;
    const sourceBinding=pickSource(kind==='ROCK'?'PROP':'ENVIRONMENT',kind,tile.x,tile.z);
    const surfaceMaterialBinding=pickSource('MATERIAL',tile.surface?.primary||'GRASS_SOIL',tile.x,tile.z);
    const placement={id:'NATURE_'+vegetation.length,stableObjectId,interactionBinding:{stableObjectId,kind:kind==='ROCK'?'MINE':'GATHER',status:'GAMEPLAY_BINDING_REQUIRED',authoritativeState:false},kind,biome:tile.biome,x:tile.x,z:tile.z,position:worldPosition(tile.x,tile.z,tile.elevation*8),elevationY:tile.elevation*8,scale:size,physicsColliderGenerated:false,sourceBinding,surfaceMaterialBinding,habitat:tile.ecology?.habitat||null};
    vegetation.push(placement);placedNatureCells.add(at(tile.x,tile.z));
    const group=natureGroups.get(kind)||{module:'NATURE:'+kind,count:0,transforms:[]};
    group.transforms.push({...placement.position,scale:size});group.count++;natureGroups.set(kind,group);
  }
  // 생태학: 로지스틱 부양량·생태 틈새·계절 적응을 시각적 자산 수요로만 모델링한다.
  const observedCoverByHabitat=new Map(),habitatCapacityByType=new Map();
  for(const tile of terrain){
    const type=tile.ecology.habitat;
    const data=habitatCapacityByType.get(type)||{cells:0,capacity:0,waterCells:0};
    data.cells++;data.capacity+=tile.ecology.carryingCapacity;
    if(tile.surface.waterDistanceCells!==null&&tile.surface.waterDistanceCells<=2)data.waterCells++;
    habitatCapacityByType.set(type,data);
  }
  for(const plant of vegetation){
    observedCoverByHabitat.set(plant.habitat,(observedCoverByHabitat.get(plant.habitat)||0)+1);
    const tile=terrain[at(plant.x,plant.z)];
    tile.ecology=Object.freeze({...tile.ecology,visualCover:1});
    const leafBehavior=plant.kind==='PINE'||plant.kind==='ROCK'?'EVERGREEN_OR_NONLIVING'
      :seasonKey==='WINTER'?'DORMANT':seasonKey==='AUTUMN'?'SEASONAL_COLOR_CHANGE':'ACTIVE_GROWTH';
    plant.seasonalAppearance=Object.freeze({season:seasonKey,leafBehavior,geometryChangeRequiresNativeAuthoring:true,
      productionSeasonAffectsGameDrops:false});
  }
  const habitatBalance=[...habitatCapacityByType].sort(([a],[b])=>a.localeCompare(b)).map(([habitat,row])=>{
    const current=observedCoverByHabitat.get(habitat)||0,usableCapacity=row.capacity;
    const desired=Math.min(row.cells,usableCapacity*.32),growthRate=.24;
    // 공간 점유 제한을 고려한 로지스틱 균형(다음 화면 제작 목표, 실게임 생물 개체수 아님).
    const nextVisualCover=usableCapacity>0?Math.max(0,Math.min(row.cells,
      current+growthRate*current*(1-current/Math.max(1,desired)))):0;
    const cue=habitat==='AQUATIC'?'RIPPLE_AND_WETLAND_AMBIENCE'
      :habitat==='CANOPY_FOREST'?'CANOPY_SHADE_AND_BIRDCALL'
      :habitat==='RIPARIAN'?'RIVERBANK_REEDS_AND_INSECT_AMBIENCE'
      :habitat==='DRY_SCRUB'?'WIND_SCRUB_AND_DRY_SOIL'
      :habitat==='ROCKY_RIDGE'?'CLIFF_SHADOW_AND_ROCK_DEBRIS'
      :habitat==='COLD_UPLAND'?'SPARSE_CONIFER_AND_WIND':'GRASS_WIND_AND_SOIL_LIFE';
    return Object.freeze({habitat,cellCount:row.cells,visualPlantCount:current,
      carryingCapacitySum:+usableCapacity.toFixed(3),averageHabitatCapacity:+(usableCapacity/Math.max(1,row.cells)).toFixed(3),
      idealVisualCover:+desired.toFixed(3),nextVisualCover:+nextVisualCover.toFixed(3),
      validatedVisualDensityFeedbackApplied:feedbackAccepted,visualDensityFeedback:visualDensityDelta(habitat),
      ambientCue:cue,producerGuild:'VEGETATION',consumerGuild:'SCENIC_WILDLIFE_CUE_ONLY',
      decomposerGuild:'SOIL_AND_FALLEN_MATTER_CUE_ONLY',actualCreatureSpawnCount:0,
      actualHarvestableResourceCount:0,actualNativeVisualsVerified:false});
  });
  // 도시공학: 통행 가능한 도로 이웃만 활용하는 광장/공공시설 후보. 길·저장 영역을 점유하지 않는다.
  const civicCandidates=[...roadSet].filter(id=>(roadDegree.get(id)||0)>=2&&pedestrianDistance[id]>=0)
    .map(id=>({id,importance:(roadDegree.get(id)||0)*4+(arterial.has(id)?3:0)-pedestrianDistance[id]*.08}))
    .sort((a,b)=>b.importance-a.importance||a.id-b.id);
  const civicSpaces=[],reservedPublic=new Set();
  for(const road of civicCandidates){
    if(civicSpaces.length>=(mobile?4:10))break;
    const rx=road.id%w,rz=Math.floor(road.id/w);
    for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]){
      const x=rx+dx,z=rz+dz;
      if(!within(x,z))continue;
      const id=at(x,z),tile=terrain[id];
      if(occupied.has(id)||waterway.has(id)||reservedPublic.has(id)||sightCells.has(id)||
        tile.biome==='WATER'||tile.slopeDegrees>maxSlopeDegrees||tile.surface?.waterDistanceCells===0)continue;
      if(tile.ecology?.habitat==='ROCKY_RIDGE'||tile.surface?.substrateStability<.35)continue;
      reservedPublic.add(id);
      civicSpaces.push(Object.freeze({id:objectNamespace+':CIVIC:'+x+':'+z,worldPosition:worldPosition(x,z,tile.elevation*8),
        proposalType:streetCategory(road.id)==='ARTERIAL'?'NEIGHBORHOOD_SQUARE':'POCKET_GREEN',
        adjacentRoadCell:{x:rx,z:rz},roadClass:streetCategory(road.id),
        sourceBinding:pickSource('PROP','CIVIC',x,z),status:'VISUAL_PROPOSAL_NOT_INSTALLED',
        blocksRoad:false,requiresActualNative3dAndPedestrianQa:true}));
      break;
    }
  }
  const cityDistricts=new Map();
  for(const building of buildings){
    const districtId=building.planning.districtId;
    const row=cityDistricts.get(districtId)||{districtId,landUse:building.zone,buildingCount:0,
      sumWalk:0,connectedCount:0,highFloodRiskCount:0};
    row.buildingCount++;
    if(building.planning.pedestrianStepsToHub!==null){
      row.connectedCount++;row.sumWalk+=building.planning.pedestrianStepsToHub;
    }
    if(building.planning.floodBufferCells!==null&&building.planning.floodBufferCells<=1)row.highFloodRiskCount++;
    cityDistricts.set(districtId,row);
  }
  const urbanDistricts=[...cityDistricts.values()].sort((a,b)=>a.districtId.localeCompare(b.districtId))
    .map(row=>Object.freeze({districtId:row.districtId,landUse:row.landUse,buildingCount:row.buildingCount,
      connectedBuildingCount:row.connectedCount,
      meanWalkingStepsToHub:row.connectedCount?+(row.sumWalk/row.connectedCount).toFixed(2):null,
      floodBufferReviewCount:row.highFloodRiskCount,planningOnly:true}));

  // 게임이 승인한 개체만 원본 ID로 계획한다. 없는 몬스터·NPC를 직접 생성하지 않는다.
  const rosterIds=new Set(),rosterIssues=[],lifeAndEncounterSites=[];
  const supportedTiers=['NORMAL','ELITE','BOSS','RARE_BOSS','LEGENDARY'];
  const supportedKinds=['NPC','MONSTER','CREATURE','BOSS'];
  const actorActionSet=['WORK','REST','TALK','TRADE','PATROL','SCOUT','FORAGE','HUNT','DEFEND','RAID','VILLAGE_BUILD','DUNGEON_GUARD','MIGRATE'];
  const candidateBudget=mobile?48:128;
  for(const [rosterIndex,actor] of ecologyActors.entries()){
    const actorId=String(actor?.id||''),kind=String(actor?.kind||'CREATURE').toUpperCase();
    const tier=String(actor?.tier||'NORMAL').toUpperCase();
    if(!/^[a-zA-Z0-9_-]{1,80}$/.test(actorId)||rosterIds.has(actorId)||
       !supportedKinds.includes(kind)||!supportedTiers.includes(tier)){
      rosterIssues.push('INVALID_AUTHORED_ACTOR_AT_INDEX:'+rosterIndex);continue;
    }
    rosterIds.add(actorId);
    if(rosterIndex>=candidateBudget){rosterIssues.push('ACTOR_PLANNING_BUDGET_EXCEEDED');continue;}
    const aquatic=actor?.aquatic===true||(actor?.allowedHabitats||[]).some(name=>
      /OCEAN|LAKE|AQUATIC|REEF|KELP|RIVER/.test(String(name).toUpperCase()));
    const allowedHabitatSet=new Set((Array.isArray(actor.allowedHabitats)?actor.allowedHabitats:[])
      .map(value=>String(value).toUpperCase()));
    const playerRelevant=kind==='NPC',bossTier=['BOSS','RARE_BOSS','LEGENDARY'].includes(tier);
    const authoredDungeon=authoredDungeonSites.find(row=>String(row?.id||'')===String(actor.dungeonId||'')&&row?.approved===true);
    const authoredRank=actor?.approved===true&&actor?.tierAuthorized===true;
    const homeAnchor=playerRelevant&&buildings.length?buildings[proceduralCellHash(hash^0xa773,rosterIndex,7)%buildings.length]:null;
    let placements=terrain.filter(tile=>{
      const id=at(tile.x,tile.z),isWater=tile.biome==='WATER';
      if(blocked.has(id)||tile.slopeDegrees>maxSlopeDegrees)return false;
      if(playerRelevant)return !isWater&&roadSet.has(id);
      if(occupied.has(id)||aquatic!==isWater)return false;
      if(!isWater&&(roadSet.has(id)||sightCells.has(id)))return false;
      if(allowedHabitatSet.size&&!allowedHabitatSet.has(tile.ecology.habitat)&&
         !allowedHabitatSet.has(tile.earthBiome.name)&&!allowedHabitatSet.has(tile.earthBiome.climateClass))return false;
      return true;
    });
    // 거리·서식지 적합도·권리 있는 자산을 우선하면서 해시 안정성으로 개체별 영역을 나눈다.
    const rosterSalt=actorId.split('').reduce((value,char)=>
      Math.imul(value^char.charCodeAt(0),16777619)>>>0,2166136261);
    const housing=homeAnchor?homeAnchor.roadAccess:null;
    const sorted=placements.map(tile=>{
      const id=at(tile.x,tile.z),distance=hub?Math.hypot(tile.x-hub.x,tile.z-hub.z):0;
      const habitatScore=(tile.ecology.carryingCapacity||0)*20;
      const ownTerritory=allowedHabitatSet.size?17:0;
      const roadScore=playerRelevant?(housing?Math.max(0,15-Math.hypot(tile.x-housing.x,tile.z-housing.z)*3):5):0;
      const safeDistance=playerRelevant?0:bossTier?Math.min(24,distance*1.5):Math.min(12,distance);
      const aquaticBonus=aquatic&&tile.aquatic?.kind==='OCEAN'?3:0;
      return{tile,id,score:habitatScore+ownTerritory+roadScore+safeDistance+aquaticBonus+
        (proceduralCellHash(hash^rosterSalt,tile.x,tile.z)%19)};
    }).sort((a,b)=>b.score-a.score||a.id-b.id);
    const tile=sorted[0]?.tile||null,site=tile?worldPosition(tile.x,tile.z,tile.elevation*8):null;
    const acceptedActions=Array.isArray(actor.allowedActions)?
      [...new Set(actor.allowedActions.map(v=>String(v).toUpperCase()).filter(v=>actorActionSet.includes(v)))]:[];
    const raidAuthorized=actor.raidApproved===true&&Boolean(actor.raidTargetId)&&
      buildings.some(b=>b.stableObjectId===actor.raidTargetId);
    const dungeonAuthorized=Boolean(authoredDungeon&&tile&&bossTier);
    const utilities=acceptedActions.map(action=>{
      let score=20+(proceduralCellHash(hash^rosterSalt,rosterIndex,action.length)%9);
      if(playerRelevant&&['WORK','TRADE','VILLAGE_BUILD','TALK'].includes(action)&&buildings.length)score+=28;
      if(kind!=='NPC'&&['FORAGE','HUNT','PATROL','SCOUT'].includes(action)&&tile)score+=tile.ecology.carryingCapacity*32;
      if(['REST','DEFEND'].includes(action))score+=9;
      if(action==='RAID')score=raidAuthorized?score+18:-1000;
      if(action==='DUNGEON_GUARD')score=dungeonAuthorized?score+45:-1000;
      if(action==='HUNT'&&aquatic&&tile?.aquatic)score+=8;
      return{action,score:+score.toFixed(3)};
    }).filter(row=>row.score>=0).sort((a,b)=>b.score-a.score||a.action.localeCompare(b.action));
    const proposedIntent=utilities[0]?.action||null;
    // 등급 변화는 기존 전투/드랍/저장 권한을 우회할 수 없고 승인된 전이 후보만 나온다.
    const authoredLadder=(Array.isArray(actor.authorizedTierTransitions)?actor.authorizedTierTransitions:[])
      .filter(row=>row&&String(row.from||'').toUpperCase()===tier&&supportedTiers.includes(String(row.to||'').toUpperCase())
        &&row.ownerApproved===true);
    const nextTier=authoredRank?String(authoredLadder[0]?.to||'').toUpperCase():null;
    const physiologicalPressure=tile?+(1-(tile.ecology.carryingCapacity||0)).toFixed(3):null;
    const adaptation=Object.freeze({currentTier:tier,nextTierProposal:nextTier||null,
      trigger:nextTier?'OWNER_AUTHORED_ECOLOGICAL_EVOLUTION_GUARD':'NOT_AUTHORIZED',
      phenotypeCue:tile?.ecology.habitat||null,ecologicalPressure:physiologicalPressure,
      adaptiveVariation:'VISUAL_PHENOTYPE_AND_BEHAVIOR_PRIORITY_ONLY',
      aiMayChangeCombatRank:false,aiMayChangeStats:false,aiMayChangeLoot:false,
      ownerApprovedTierTransitionCandidate:!!nextTier,requiresAuthoritativeEngineRuleAndRuntimeQa:!!nextTier,
      tierMutationPerformed:false});
    const renderAsset=pickSource(playerRelevant?'CHARACTER':'CREATURE',String(actor.species||kind),tile?.x||0,tile?.z||0);
    lifeAndEncounterSites.push(Object.freeze({actorId,kind,tier,species:String(actor.species||''),faction:String(actor.faction||''),
      gameId:String(gameId),position:site,cell:tile?{x:tile.x,z:tile.z}:null,
      homeSettlementId:homeAnchor?.stableObjectId||null,
      habitat:tile?.ecology.habitat||null,earthBiome:tile?.earthBiome.name||null,
      aquatic:!!tile?.aquatic,encounterTierAuthorized:authoredRank,
      authoredDungeonId:dungeonAuthorized?String(authoredDungeon.id):null,
      proposedIntent,behaviorUtilities:Object.freeze(utilities),
      raidTargetAuthorized:raidAuthorized,blueprint:renderAsset,evolution:adaptation,
      status:actor.approved===true&&site?'DESIGN_MAPPED_NATIVE_BINDING_REQUIRED':'UNAPPROVED_OR_NO_VALID_SITE',
      exactActorSourceIdRequired:true,actualNpcOrMonsterSpawned:false,engineActionExecuted:false,
      sourceRevisionAndAuthoritativeAiValidationRequired:true,saveSchemaChanged:false}));
  }
  // 없는 생명체를 만들지 않는 대신, 부족한 바이옴 역할을 다음 설계 입력에 제안한다.
  const habitatDesignGaps=habitatBalance.filter(row=>row.cellCount>0&&!lifeAndEncounterSites.some(site=>site.habitat===row.habitat))
    .map(row=>Object.freeze({habitat:row.habitat,suggestedRole:
      /OCEAN|LAKE|REEF|KELP/.test(row.habitat)?'AQUATIC_CREATURE':
      /FOREST|MANGROVE|WETLAND/.test(row.habitat)?'WILDLIFE_AND_SCOUT':'REGIONAL_WILDLIFE',
      action:'DESIGN_AND_SOURCE_REVIEW_ONLY',generatedActorId:null,spawnPermission:false}));

  let sightline={from:hub,to:landmark,fovDegrees,cameraForward,withinFov:false,visible:false,terrainObstructed:false,buildingObstructed:false};
  if(hub&&landmark){
    const ax=landmark.x-hub.x,az=landmark.z-hub.z,length=Math.hypot(ax,az);
    const norm=Math.hypot(cameraForward.x,cameraForward.z),dot=(ax*cameraForward.x+az*cameraForward.z)/(Math.max(length,1e-9)*norm);
    const withinFov=length===0||dot>=Math.cos(fovDegrees*Math.PI/360);
    const seen=[...sightCells].some(id=>!roadSet.has(id)&&buildings.some(b=>b.footprint.some(cell=>at(cell.x,cell.z)===id)));
    const startY=terrain[at(hub.x,hub.z)].elevation*8+1.7,endY=terrain[at(landmark.x,landmark.z)].elevation*8+12;
    let terrainObstructed=false;
    for(const id of sightCells){const x=id%w,z=Math.floor(id/w),t=length?Math.hypot(x-hub.x,z-hub.z)/length:0;
      if(t>.03&&t<.95&&terrain[id].elevation*8>startY+(endY-startY)*t)terrainObstructed=true;
    }
    sightline={from:hub,to:landmark,fovDegrees,cameraForward,withinFov,visible:withinFov&&!seen&&!terrainObstructed,terrainObstructed,buildingObstructed:seen,exactCameraAndOcclusionRuntimeVerified:false};
    if(!sightline.visible)issues.push('LANDMARK_VISIBILITY_REQUIRES_CAMERA_REVIEW');
  }
  const result={
    version:1,status:issues.length?'LAYOUT_REVIEW_REQUIRED':'STATIC_LAYOUT_PROPOSED',issues:Object.freeze(issues),
    seed:String(seed),dimension,regionalBiome:String(biome).toUpperCase(),climate:String(climate).toUpperCase(),coordinateSystem:dimension==='3D'?'Y_UP_HEIGHTFIELD':'GRID_XZ_TO_TOP_DOWN_XY_PROPOSED',
    size:{width:w,height:h,cellSize},terrain:Object.freeze(terrain),river:Object.freeze(river),riverType,roads:Object.freeze(routes),roadCells:Object.freeze([...roadSet].sort((a,b)=>a-b).map(id=>({x:id%w,z:Math.floor(id/w)}))),
    routeGraph,buildings:Object.freeze(buildings),vegetation:Object.freeze(vegetation),instancingPlan:Object.freeze([...instanceGroups.values(),...natureGroups.values()]),landmark:Object.freeze({cell:landmark,reason:'VISIBLE_NAVIGATION_ANCHOR'}),
    livingBiomePopulation:Object.freeze({algorithm:'DETERMINISTIC_HABITAT_FIT_AND_AUTHORED_UTILITY_AI_ADVISORY',
      inputActorCount:ecologyActors.length,plannedActorCount:lifeAndEncounterSites.length,issues:Object.freeze(rosterIssues),
      actorPlacements:Object.freeze(lifeAndEncounterSites),habitatDesignGaps:Object.freeze(habitatDesignGaps),
      tierVocabulary:Object.freeze(supportedTiers),existingActorAiOwner:'assets/vibe-ai-role-director.js',
      approvedDesignGameActorsOnly:true,autonomousNativeRuntimeActionRequired:true,
      actualAiActorSpawns:0,actualMonsterRankChanges:0,actualNpcDungeonsCreated:0,actualRaidsLaunched:0,
      noBossMonsterStatsLootSaveBalanceMutation:true}),
    oceansAndLakes:Object.freeze({algorithm:'FLOOD_FILL_WATER_BODY_SALINITY_COASTAL_BIOME_CLASSIFICATION',
      requestedWaterMode:requestedWater,selectedWaterMode:waterKey,
      waterSelectionMode:requestedWater==='AUTO'?'WORLD_GEOGRAPHY_AUTO':'EXPLICIT_APPROVED_DESIGN',
      waterBodies:Object.freeze(waterComponents),
      oceanCount:waterComponents.filter(row=>row.kind==='OCEAN').length,lakeCount:waterComponents.filter(row=>row.kind==='LAKE').length,
      coastlineCells:terrain.filter(tile=>tile.aquatic?.tidalInfluence).length,
      nativeWaterAndMarineCreatureRuntimeQaRequired:true,actualOceanLakeRenderingVerified:false,
      authoredSwimmingFishingMechanicsPreserved:true,waterWorldGameRulesChanged:false}),
    earthBiomes:Object.freeze({algorithm:'WHITTAKER_INSPIRED_CLIMATE_MOISTURE_WITH_AQUATIC_SUCCESSION',
      categories:Object.freeze(Object.fromEntries([...earthBiomeCounts].sort(([a],[b])=>a.localeCompare(b)))),
      climaticClassificationIsApproximate:true,gameplaySpeciesAndSpawnUnaffected:true,actualEcologicalSimulationVerified:false}),
    geologyAndMaterials:Object.freeze({algorithm:'SEEDED_VORONOI_FBM_CATCHMENT_RUNOFF',
      geologyRegionCount:geologyRegions.size,materialDistribution:Object.freeze(Object.fromEntries([...materialCounts].sort(([a],[b])=>a.localeCompare(b)))),
      surfaceMaterialGroups:Object.freeze(terrainMaterialGroups),nativeMaterialAndTerrainQaRequired:true,actualMaterialRuntimeVerified:false}),
    ecologyBalance:Object.freeze({algorithm:'CARRYING_CAPACITY_HABITAT_SUITABILITY_LOGISTIC_VISUAL_TARGET',
      season:seasonKey,seasonalThermal,habitatDistribution:Object.freeze(Object.fromEntries([...habitatCounts].sort(([a],[b])=>a.localeCompare(b)))),
      habitats:Object.freeze(habitatBalance),feedbackAccepted,resourceAndCreatureSpawnAuthority:false,
      originalGameplaySpeciesAndPopulationPreserved:true,realBiologySimulationClaimed:false,nativeVisualsVerified:false}),
    eraAndCulture:Object.freeze({requestedEra,selectedEra:eraKey,eraSelectionMode:requestedEra==='AUTO'?'WORLD_DESIGN_AUTO':'EXPLICIT_APPROVED_DESIGN',eraByZone:Object.freeze({...eraByZone}),
      supportedEras:Object.freeze(supportedEras),usedEras:Object.freeze([...new Set(buildings.map(row=>row.era))].sort()),
      buildingCountByEra:Object.freeze(Object.fromEntries([...new Set(buildings.map(row=>row.era))].sort().map(period=>
        [period,buildings.filter(row=>row.era===period).length]))),
      structuralGrammarsAreNativeAuthoringInputs:true,noTechnologyEconomyOrGameplayProgressionMutation:true,
      perBuildingEraAndStyleSynchronizationRequired:true,nativeEraWorldRuntimeVerified:false}),
    urbanPlanning:Object.freeze({algorithm:'ROAD_GRAPH_BFS_WEIGHTED_LAND_USE_STORMWATER_AND_LOT_STRUCTURAL_GRAMMAR',
      roadCellCount:roadSet.size,roadIntersections:[...roadDegree.values()].filter(degree=>degree>=3).length,
      arterialRoadCells:arterial.size,walkableHubRoadCells:pedestrianDistance.filter(value=>value>=0).length,
      districts:Object.freeze(urbanDistricts),civicSpaceProposals:Object.freeze(civicSpaces),
      noNewPhysicalRoadsOrGameplayBuildingsCreated:true,actualCivilEngineeringVerified:false,
      actualNativeUrbanWorldVerified:false}),
    sharedLibraryBinding:Object.freeze({gameId:String(gameId),target:String(target).toUpperCase(),sourceCandidateCount:pool.length,
      eligibleFamilies:Object.freeze(Object.fromEntries([...poolByFamily].map(([family,rows])=>[family,rows.length]))),
      selectedAssetIds:Object.freeze([...new Set([...buildings,...vegetation,...terrainMaterialGroups,...civicSpaces].flatMap(row=>[row.sourceBinding?.assetId,row.surfaceMaterialBinding?.assetId,...Object.values(row.construction?.materialBindings||{}).map(binding=>binding?.assetId)]).filter(Boolean))].sort()),
      originalAssetsCopied:false,actualRuntimeBindingsVerified:false,missingNativeAssetRequiresExistingAuthoring:true}),
    placementDiversity:Object.freeze({algorithm:'SEEDED_HASH_PRIORITY_SPATIAL_REJECTION_BLUE_NOISE_APPROXIMATION',minimumVegetationSeparationCells:2,
      candidatesEvaluated:natureCandidates.length,selectedVegetation:vegetation.length,stableGameObjectIds:true,
      spatialDepthMetersRequired:dimension==='3D',slopeAndNavClearancePreserved:true}),
    sightline:Object.freeze(sightline),drainage:'FOUR_NEIGHBOR_DOWNHILL',noise:'SEEDED_2D_GRADIENT_FBM',snapRules:Object.freeze({moduleGrid:cellSize,entrancesFaceConnectedRoad:true,foundationsFollowTerrain:true}),
    mobileBudget:Object.freeze({cellCount:terrain.length,buildingLimit:maxBuildings,vegetationLimit:maxVegetation,instanceGroupCount:instanceGroups.size+natureGroups.size,actualDrawCallsMeasured:false}),
    // 안정 식별자는 오브젝트 이름/생성 순서에 의존하지 않는다. 보상·피해·저장은 기존 게임 규칙만 따른다.
    worldObjectBinding:Object.freeze({namespace:objectNamespace,idScheme:'WORLD_SEED_KIND_GRID_CELL',status:'GAMEPLAY_BINDING_REQUIRED',runtimeInteractionVerified:false,existingSaveSchemaRequired:true,gameplayDamageAndLootContractRequired:true,serverAuthorityValidationRequired:true,duplicateRewardGuardRequired:true,mobileActionBindingRequired:true}),
    native2DWorldCoordinateMappingRequired:dimension==='2D',native2DPositionProjectionProvided:dimension==='2D',
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
