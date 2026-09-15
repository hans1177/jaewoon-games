// 파일명: tools/company-approved-scope-contract.mjs
import crypto from 'node:crypto';
import {reviewSeniorSourceQuality} from './company-vibe2-expert-development.mjs';

const clean=value=>String(value??'').trim().replace(/\s+/g,' ');
const slug=value=>clean(value).toLowerCase().replace(/[^a-z0-9가-힣]+/g,'-').replace(/^-+|-+$/g,'').slice(0,42)||'scope';
const gameplayKey=/^(coreFun|coreLoop|mobileUx|mechanics?|systems?|features?|contentScope|progression|combat|economy|quests?|levels?|modes?|story|world|bosses?|enemies?|items?|skills?|characters?|objectives?|stages?|waves?)$/i;
const excludedKey=/market|reference|audience|sessionDirection|steamExpansion|multiplayerExpansion|platformSelection|targetPlatform|evidence|score|review|identity/i;

function pushItem(items,seen,{path,text}){
  const value=clean(text);
  if(!value)return;
  const fingerprint=`${path}|${value}`;
  if(seen.has(fingerprint))return;
  seen.add(fingerprint);
  const digest=crypto.createHash('sha256').update(fingerprint).digest('hex').slice(0,10);
  items.push({id:`scope-${slug(path)}-${digest}`,path,label:value.slice(0,180),required:true,status:'APPROVED'});
}

function walkGameplay(value,path,items,seen,depth=0){
  if(depth>5||value===null||value===undefined)return;
  if(typeof value==='string'||typeof value==='number'||typeof value==='boolean'){
    pushItem(items,seen,{path,text:value});return;
  }
  if(Array.isArray(value)){
    value.forEach((entry,index)=>walkGameplay(entry,`${path}[${index}]`,items,seen,depth+1));return;
  }
  if(typeof value!=='object')return;
  for(const [key,entry] of Object.entries(value)){
    if(excludedKey.test(key))continue;
    if(gameplayKey.test(key))walkGameplay(entry,path?`${path}.${key}`:key,items,seen,depth+1);
    else if(depth>0&&typeof entry==='object'&&entry!==null)walkGameplay(entry,path?`${path}.${key}`:key,items,seen,depth+1);
  }
}

export function deriveApprovedScopeInventory(baseline={}){
  const content=baseline?.content&&typeof baseline.content==='object'?baseline.content:baseline;
  const items=[],seen=new Set();
  if(clean(content?.coreFun))pushItem(items,seen,{path:'coreFun',text:content.coreFun});
  if(Array.isArray(content?.coreLoop))content.coreLoop.forEach((entry,index)=>pushItem(items,seen,{path:`coreLoop[${index}]`,text:entry}));
  for(const [key,value] of Object.entries(content||{})){
    if(key==='coreFun'||key==='coreLoop'||excludedKey.test(key)||!gameplayKey.test(key))continue;
    walkGameplay(value,key,items,seen,0);
  }
  if(items.length===0)pushItem(items,seen,{path:'coreGameplay',text:'approved core gameplay loop'});
  return items.slice(0,80);
}

function escapeRegex(value){return String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function scopeControlTag(text,id){
  const escaped=escapeRegex(id);
  const matcher=new RegExp(`<([a-z0-9-]+)\\b([^>]*\\bdata-scope-id=["']${escaped}["'][^>]*)>`,'i');
  const match=String(text??'').match(matcher);
  return match?{tag:match[1].toLowerCase(),attrs:match[2]}:null;
}
function attribute(attrs,name){return clean(String(attrs||'').match(new RegExp(`\\b${name}=["']([^"']+)["']`,'i'))?.[1]);}
function interactiveScopeControl(control){
  if(!control)return false;
  if(['button','input','select','textarea','canvas'].includes(control.tag))return true;
  return /\brole=["']button["']/i.test(control.attrs)||/\btabindex=["']?0["']?/i.test(control.attrs)||/\bdata-gameplay-action\s*=/i.test(control.attrs);
}
export function approvedScopeRequirement(item={}){
  const path=clean(item.path),text=`${path} ${clean(item.label)}`.toLowerCase();
  if(!/^corefun$/i.test(path)&&/(place\s+(?:a\s+)?(?:tower|defender)|tower\s+placement|position\s+(?:a\s+)?tower|배치|설치\s*위치|타워\s*위치)/i.test(text))return'TOWER_PLACEMENT';
  if(/adapt|tactical\s+change|strategic\s+choice|different\s+choice|선택에\s*따른|전략\s*선택|전술\s*변경|대응\s*선택/i.test(text))return'STRATEGIC_CHOICE';
  if(!/^corefun$/i.test(path)&&/(interact|interaction|talk|speak|npc|object|pickup|pick\s*up|open|activate|use\s+(?:the\s+)?(?:object|item)|상호작용|대화|엔피시|npc|사물|오브젝트|줍|열기|작동|사용)/i.test(text))return'ENTITY_INTERACTION';
  if(!/^corefun$/i.test(path)&&/(map|world|area|zone|route|path|explor|move|reposition|collision|맵|월드|세계|구역|지역|경로|탐험|이동|위치|충돌)/i.test(text))return'SPATIAL_WORLD';
  return'STATE_CHANGE';
}
function realPlacementInputExists(text){
  const source=String(text??'');
  const explicitPosition=/(?:data-(?:placement-position|build-slot|tower-slot|grid-x|grid-y)|dataset\.(?:placementPosition|buildSlot|towerSlot|gridX|gridY))/i.test(source);
  const coordinateInput=/(?:offsetX|offsetY|clientX|clientY|getBoundingClientRect\s*\()/i.test(source)&&/(?:pointerdown|pointerup|touchstart|touchend|addEventListener\s*\(\s*["']click|\.onclick\s*=)/i.test(source);
  const raycastInput=/(?:raycast|raycaster|screenToWorld|unproject|worldPosition|groundHit)/i.test(source)&&/(?:pointer|touch|click)/i.test(source);
  return explicitPosition||coordinateInput||raycastInput;
}
function realEntityInteractionExists(text){
  const source=String(text??'');
  const explicitTarget=/(?:data-(?:interactable|interaction-target|npc|object-id)|dataset\.(?:interactable|interactionTarget|npc|objectId))/i.test(source);
  const explicitlyInteractableWorldEntity=/<[a-z0-9-]+\b(?=[^>]*\bdata-world-entity\b)(?=[^>]*\bdata-interactable\b)[^>]*>/i.test(source);
  const action=/(?:interact|talk|pickup|open|activate|use|상호작용|대화|줍|열기|작동)/i.test(source)&&/(?:addEventListener|onclick|pointerdown|keydown|touchstart)/i.test(source);
  return (explicitTarget||explicitlyInteractableWorldEntity)&&action;
}
function realSpatialStateExists(text){
  const source=String(text??'');
  const domSpace=/(?:data-(?:area|zone|region|biome|route|path-node|player-x|player-y|player-z|world-x|world-y|world-z)|dataset\.(?:area|zone|region|biome|route|pathNode|playerX|playerY|playerZ|worldX|worldY|worldZ))/i.test(source);
  const coordinateSpace=/(?:position\.(?:x|y|z)|player(?:X|Y|Z)|world(?:X|Y|Z)|velocity|collision|collider|raycast|raycaster|pathfinding|navmesh|getBoundingClientRect)/i.test(source);
  return domSpace||coordinateSpace;
}
function threeDContractBlockers(text){
  const source=String(text??'');
  const detected=/(?:data-spatial-dimension=["']3d["']|WebGLRenderingContext|WebGL2RenderingContext|THREE\.|BABYLON\.|PerspectiveCamera|OrthographicCamera|requestPointerLock)/i.test(source);
  if(!detected)return [];
  const blockers=[];
  if(!/(?:position\.x|position\.y|position\.z|data-player-x|data-player-y|data-player-z|playerX|playerY|playerZ|worldX|worldY|worldZ)/i.test(source))blockers.push('REAL_3D_XYZ_STATE_REQUIRED');
  if(!/(?:camera|PerspectiveCamera|OrthographicCamera|cameraYaw|cameraPitch|data-camera)/i.test(source))blockers.push('REAL_3D_CAMERA_STATE_REQUIRED');
  if(!/(?:collision|collider|intersect|raycast|raycaster|groundHit|physics|rigidbody)/i.test(source))blockers.push('REAL_3D_COLLISION_OR_RAYCAST_REQUIRED');
  if(!/(?:route|path|navmesh|pathfind|waypoint|data-route|data-path-node|raycast|raycaster)/i.test(source))blockers.push('REAL_3D_ROUTE_OR_SPATIAL_SELECTION_REQUIRED');
  return blockers;
}

export function staticApprovedScopeCoverage(html,inventory=[]){
  const text=String(html??'');
  const blockers=[];
  const declared=Number(text.match(/data-approved-scope-count=["'](\d+)["']/i)?.[1]??-1);
  if(declared!==inventory.length)blockers.push(`APPROVED_SCOPE_COUNT_MISMATCH:${declared}:${inventory.length}`);
  const mechanicIds=[];
  for(const item of inventory){
    const control=scopeControlTag(text,item.id);
    if(!control){blockers.push(`APPROVED_SCOPE_ITEM_MISSING:${item.id}`);continue;}
    if(!interactiveScopeControl(control))blockers.push(`APPROVED_SCOPE_CONTROL_NOT_INTERACTIVE:${item.id}`);
    if(/\bdata-action\s*=/i.test(control.attrs))blockers.push(`GENERIC_SCOPE_PROXY_FORBIDDEN:${item.id}`);
    const mechanicId=attribute(control.attrs,'data-mechanic-id');
    if(!mechanicId)blockers.push(`APPROVED_SCOPE_MECHANIC_BINDING_MISSING:${item.id}`);
    else{
      mechanicIds.push(mechanicId);
      if(mechanicId===item.id||/^scope(?:-|$)/i.test(mechanicId))blockers.push(`APPROVED_SCOPE_GENERIC_MECHANIC_ID:${item.id}`);
    }
    if(/\bid=["']scope-control-\d+["']/i.test(control.attrs))blockers.push(`TEST_HARNESS_SCOPE_CONTROL_ID_FORBIDDEN:${item.id}`);
    const requirement=approvedScopeRequirement(item);
    if(requirement==='TOWER_PLACEMENT'&&!realPlacementInputExists(text))blockers.push(`APPROVED_SCOPE_TOWER_POSITION_INPUT_REQUIRED:${item.id}`);
    if(requirement==='ENTITY_INTERACTION'&&!realEntityInteractionExists(text))blockers.push(`APPROVED_SCOPE_REAL_ENTITY_INTERACTION_REQUIRED:${item.id}`);
    if(requirement==='SPATIAL_WORLD'&&!realSpatialStateExists(text))blockers.push(`APPROVED_SCOPE_REAL_SPATIAL_STATE_REQUIRED:${item.id}`);
  }
  blockers.push(...threeDContractBlockers(text));
  const seniorReview=reviewSeniorSourceQuality(text);
  blockers.push(...seniorReview.hardBlockers);
  const uniqueMechanics=[...new Set(mechanicIds)];
  const minimumMechanics=Math.min(4,Math.max(1,inventory.length));
  if(inventory.length&&uniqueMechanics.length<minimumMechanics)blockers.push(`APPROVED_SCOPE_MECHANIC_DIVERSITY_TOO_LOW:${uniqueMechanics.length}:${minimumMechanics}`);
  return {pass:blockers.length===0,requiredCount:inventory.length,mechanicCount:uniqueMechanics.length,mechanicIds:uniqueMechanics,seniorReview,blockers};
}

export function runtimeApprovedScopeCoverage({declaredCount=0,visibleScopeIds=[],interactedScopeIds=[],mechanicBindings=[],inventory=[],interactionResults=[],spatialEvidence={}}={}){
  const visible=[...new Set((visibleScopeIds||[]).map(clean).filter(Boolean))];
  const interacted=[...new Set((interactedScopeIds||[]).map(clean).filter(Boolean))];
  const mechanics=[...new Set((mechanicBindings||[]).map(clean).filter(Boolean))];
  const results=Array.isArray(interactionResults)?interactionResults:[];
  const blockers=[];
  if(Number(declaredCount)<=0)blockers.push('APPROVED_SCOPE_DECLARATION_REQUIRED');
  if(visible.length!==Number(declaredCount))blockers.push(`APPROVED_SCOPE_VISIBLE_COUNT_MISMATCH:${visible.length}:${declaredCount}`);
  const missingInteraction=visible.filter(id=>!interacted.includes(id));
  if(missingInteraction.length)blockers.push(`APPROVED_SCOPE_NOT_INTERACTED:${missingInteraction.join(',')}`);
  for(const scopeId of visible){
    const rows=results.filter(row=>clean(row?.scopeId)===scopeId&&row?.clicked===true);
    if(!rows.some(row=>row?.stateChanged===true))blockers.push(`APPROVED_SCOPE_NO_GAMEPLAY_RESULT:${scopeId}`);
    const item=(inventory||[]).find(row=>clean(row?.id)===scopeId);
    const requirement=approvedScopeRequirement(item||{});
    if(requirement==='TOWER_PLACEMENT'){
      const placementPass=rows.some(row=>row?.positionSelected===true&&(row?.placementResult===true||Number(row?.towerEntityDelta||0)>0));
      if(!placementPass)blockers.push(`APPROVED_SCOPE_TOWER_PLACEMENT_RESULT_REQUIRED:${scopeId}`);
    }
    if(requirement==='STRATEGIC_CHOICE'&&!rows.some(row=>row?.strategicOutcomeObserved===true))blockers.push(`APPROVED_SCOPE_STRATEGIC_OUTCOME_REQUIRED:${scopeId}`);
    if(requirement==='ENTITY_INTERACTION'){
      const interactionPass=rows.some(row=>row?.targetSelected===true&&row?.interactionResult===true&&row?.targetStateChanged===true);
      if(!interactionPass)blockers.push(`APPROVED_SCOPE_ENTITY_INTERACTION_RESULT_REQUIRED:${scopeId}`);
    }
    if(requirement==='SPATIAL_WORLD'){
      const spatialPass=rows.some(row=>row?.spatialInputObserved===true&&row?.spatialStateChanged===true&&row?.spatialOutcomeObserved===true);
      if(!spatialPass)blockers.push(`APPROVED_SCOPE_SPATIAL_WORLD_RESULT_REQUIRED:${scopeId}`);
    }
  }
  if(spatialEvidence?.detected3D===true){
    if(spatialEvidence.xyzMoved!==true)blockers.push('REAL_3D_XYZ_MOVEMENT_REQUIRED');
    if(spatialEvidence.cameraObserved!==true)blockers.push('REAL_3D_CAMERA_RUNTIME_REQUIRED');
    if(spatialEvidence.collisionObserved!==true)blockers.push('REAL_3D_COLLISION_RUNTIME_REQUIRED');
    if(spatialEvidence.raycastOrRouteObserved!==true)blockers.push('REAL_3D_RAYCAST_OR_ROUTE_RUNTIME_REQUIRED');
    if(spatialEvidence.spatialOutcomeObserved!==true)blockers.push('REAL_3D_SPATIAL_OUTCOME_REQUIRED');
  }
  const minimumMechanics=Math.min(4,Math.max(1,Number(declaredCount)||0));
  if(Number(declaredCount)>0&&mechanics.length<minimumMechanics)blockers.push(`APPROVED_SCOPE_RUNTIME_MECHANIC_DIVERSITY_TOO_LOW:${mechanics.length}:${minimumMechanics}`);
  return {pass:blockers.length===0,declaredCount:Number(declaredCount)||0,visibleScopeIds:visible,interactedScopeIds:interacted,mechanicBindings:mechanics,blockers};
}
