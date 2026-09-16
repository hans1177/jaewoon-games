// 파일명: tools/vibe2-development-execution-policy.mjs
// 역할: 플랫폼 결정 이후 개발 실행기를 deterministic-only로 선택하고 AI 호출을 금지한다.

const clean=value=>String(value??'').trim();
const unique=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const SUPPORTED_TARGETS=new Set(['roblox','web','unity','unreal','godot']);

function evidence(task={}){return unique(Array.isArray(task.evidence)?task.evidence:[]);}
function evidenceValue(task={},prefix=''){
  const row=evidence(task).find(value=>value.startsWith(prefix));
  return row?clean(row.slice(prefix.length)):'';
}
function explicitRecipe(task={}){
  return clean(task.deterministicRecipe||task.implementationRecipe||evidenceValue(task,'deterministic-recipe:'));
}
function isPath(file,suffix){
  return file===suffix||file.endsWith(`/${suffix}`);
}
function robloxObbyWorldCoreRecipe(task={},target=''){
  if(target!=='roblox'||task.ownerDirective!==true)return'';
  const files=unique(task.responsibleFiles||[]);
  const hasServer=files.some(file=>isPath(file,'server/Game.server.luau'));
  const onlySupported=files.length>=1&&files.every(file=>isPath(file,'server/Game.server.luau')||isPath(file,'client/Game.client.luau'));
  if(!hasServer||!onlySupported)return'';
  const rows=evidence(task);
  const rebuild=clean(task.rebuildMode).toUpperCase()==='FULL_REBUILD'||task.fullRebuild===true||rows.includes('owner-directive:full-roblox-game-rebuild');
  const worldCore=rows.includes('rebuild-phase:world-core')||/WORLD[- _]?CORE|checkpoint|obby|obstacle/i.test(clean(task.goal));
  if(!rebuild||!worldCore)return'';
  return'roblox-obby-world-core-v1';
}
export function resolveDeterministicRecipe({task={},target=''}={}){
  const normalized=clean(target||task.target).toLowerCase();
  return explicitRecipe(task)||robloxObbyWorldCoreRecipe(task,normalized)||null;
}

export function resolveVibeDevelopmentExecution({task={},target='',route='text-source-worker'}={}){
  const normalized=clean(target||task.target).toLowerCase();
  const platformDecisionResolved=SUPPORTED_TARGETS.has(normalized);
  const aiRequested=task.aiRequired===true||evidence(task).includes('ai-required:true');
  const recipe=platformDecisionResolved?resolveDeterministicRecipe({task,target:normalized}):null;
  if(route!=='text-source-worker'){
    return Object.freeze({
      version:2,
      platformDecisionResolved,
      deterministicFirst:platformDecisionResolved,
      aiRequested,
      aiAllowed:false,
      aiRequired:false,
      aiAssist:false,
      aiFallbackAvailable:false,
      executor:route,
      recipe:null,
      reason:`non-text-route:${clean(route)||'unknown'}`
    });
  }
  if(recipe){
    return Object.freeze({
      version:2,
      platformDecisionResolved,
      deterministicFirst:true,
      aiRequested,
      aiAllowed:false,
      aiRequired:false,
      aiAssist:false,
      aiFallbackAvailable:false,
      executor:'deterministic-source-worker',
      recipe,
      reason:aiRequested?'ai-request-ignored-deterministic-recipe-available':'deterministic-recipe-available'
    });
  }
  return Object.freeze({
    version:2,
    platformDecisionResolved,
    deterministicFirst:true,
    aiRequested,
    aiAllowed:false,
    aiRequired:false,
    aiAssist:false,
    aiFallbackAvailable:false,
    executor:'deterministic-capability-gap',
    recipe:null,
    reason:aiRequested?'ai-disabled-by-central-policy':'deterministic-recipe-required'
  });
}
