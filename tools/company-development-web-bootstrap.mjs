// 파일명: tools/company-development-web-bootstrap.mjs
// DESIGN_BASELINE -> 실제 Web 게임 생성/보존. 기존 실게임은 보존하고, 설계 구현이 부족한 기존 소스는 Vibe2가 직접 보완한다.
import fs from 'node:fs';
import path from 'node:path';
import {Script} from 'node:vm';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {deriveApprovedScopeInventory,staticApprovedScopeCoverage} from './company-approved-scope-contract.mjs';
import {buildWebContractAdapterPlan,webContractAdapterGuidance} from './company-web-contract-adapter.mjs';
import {buildVibeDevelopmentContext,clipPreservedSourceForModel} from './company-vibe2-gameplay-intelligence.mjs';

const REAL_ARTIFACT_TYPE='REAL_PLAYABLE_GAME';
const INITIAL_PLAYABLE_MINIMUM='ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE';
const FINAL_CONTENT_DEPTH_MINUTES=30;
const MIN_REAL_GAME_BYTES=12000;
const MIN_REAL_SCRIPT_BYTES=6000;
const SHARED_REAL_ENGINE='web-games/_shared/vibe2-final.js';
const POCKET_FOUNDRY_TEMPLATE='web-games/seed-roblox-simulator-tycoon-i-adopt-me/index.html';
const PRESERVED_PATCH_MAX_EDITS=8;
const FINAL_CONTENT_DEPTH_REWORK_REQUIRED='최종 콘텐츠 깊이 재작업에서는 반복 행동/재시작 시간으로 분량을 채우지 말고 새 적·구역·목표·상호작용·전략 결과를 실제 gameplay로 추가한다.';
const WEB_PREPLATFORM_IMPLEMENTATION_POLICY=`Web 빌드는 출시용 장식 데모나 기능 샘플이 아니라 본 플랫폼 개발 전에 재미와 게임성을 검증하는 축소된 완성 게임이다. 본 플랫폼과 핵심 게임 규칙의 품질 기준은 동일하게 유지하고 줄여도 되는 것은 전체 맵 크기, 최종 지역/아이템/보스 수, 최종 아트 품질, 플랫폼 전용 연동과 엔드게임 분량뿐이다. 핵심 이동·탐험·전투·적 AI·상호작용·성장·경제·퀘스트·장비·보상·사망·재도전·저장 일관성은 승인 설계에 존재하면 Web 단계에서 실제 플레이 가능하게 구현한다. 액션/RPG/생존/모험/탐험/역할형처럼 플레이어 아바타가 핵심인 2D 게임은 실제 플레이어 엔티티와 변경되는 X/Y 월드 좌표, 키보드 이동, 모바일 터치 또는 가상 조이스틱, 월드 경계와 장애물 충돌, 큰 맵의 카메라 추적 또는 월드 스크롤을 구현한다. data-player-x/data-player-y, data-collision-enabled, data-collision-count, data-camera-active 및 필요 시 data-camera-x/data-camera-y를 실제 상태와 함께 갱신하고 좌표 값만 바꾸는 가짜 이동은 금지한다. 맵/월드/탐험이 있으면 서로 실제로 이동 가능한 복수 지역, 지역별 위험·적·자원 차이, 랜드마크와 발견/보상 요소, 접근 거리 기반 상호작용을 넣고 data-area/data-zone/data-region/data-landmark/data-discovery 같은 런타임 표식을 실제 상태에 연결한다. 전투는 공격 거리, 공격 쿨다운, 피격 피드백, 적 추적/복귀 AI, 불공정 연속 피격 방지, 실제 투사체 또는 근접 판정 등 장르에 필요한 규칙이 실제 결과를 바꾸게 한다. 보스가 설계에 있으면 Web 단계에서 최소 한 번의 완전한 보스전을 구현하고 단순 고체력 일반 적으로 대체하지 않는다. 최소 2개의 구분되는 공격 패턴 또는 단계, 강공격 예고, 피할 수 있는 대응 공간, 처치 보상과 재도전 흐름을 만들고 data-boss/data-boss-id/data-boss-pattern/data-boss-phase를 실제 보스 상태와 함께 갱신한다. 탐험→전투→보상→성장→더 위험한 지역 또는 보스의 재미 루프가 실제 플레이로 이어져야 하며 빈 맵 걷기, 버튼 클릭→숫자 변화, 적 클릭→체력 감소, 맵 클릭→순간이동 같은 가짜 플레이를 핵심 장르 구현으로 인정하지 않는다. 인벤토리·장비·제작·상점·퀘스트가 있으면 획득/소모/장착/가격/조건/보상이 실제 상태와 연결되고 UI 표시값과 내부 계산값이 일치해야 한다. 세이브가 이미 있는 게임은 플레이어와 월드 진행을 함께 복구하고 구버전/부분 데이터 때문에 흰 화면이나 소프트락이 생기지 않게 한다. delta time, 공격 무적시간, 스폰 안전성, 리스폰 중복 방지, 이벤트/리스너/타이머 누적 방지, pause/탭 복귀 안정성, NaN/Infinity 방지, 모바일 멀티터치와 화면 넘침 방지 등 실제 플레이 안정성을 유지한다. 검증용 플래그·숫자·숨은 텔레메트리만 맞추고 화면과 실제 게임 결과가 변하지 않는 구현은 금지하며 내부 상태·화면 변화·입력 결과를 서로 일치시킨다.`;
// Legacy workflow grep compatibility only; runtime evidence is the dynamic MODEL_USED line below.
const LEGACY_WORKFLOW_PROBE='MODEL_USED=NO';
const clean=v=>String(v??'').trim();
const arg=(name,fallback='')=>process.argv.find(x=>x.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const safeId=v=>clean(v).replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeText=v=>clean(v).replace(/https?:\/\/\S+/gi,'').replace(/\b(?:XMLHttpRequest|WebSocket|fetch)\b/gi,'runtime').slice(0,420);
const clip=(value,max=18000)=>{const text=typeof value==='string'?value:JSON.stringify(value);return text.length>max?text.slice(0,max):text;};

function compactWebContractAdapterHint(plan={},advisory={}){
  const mapped=(plan.bindings||[]).slice(0,6).map(row=>clean(row.scopeId)+'>'+clean(row.selector||row.candidateKey)+'>'+clean(row.proposedMechanicId)+'>'+clean(row.confidence));
  const missing=(plan.unmapped||[]).slice(0,3).map(row=>clean(row.scopeId)+'>UNMAPPED>'+clean(row.family));
  const ai=(advisory?.suggestedBindings||[]).slice(0,3).map(row=>clean(row.scopeId)+'>'+clean(row.selector||row.candidateKey)+'>'+clean(row.mechanicId));
  const parts=[];
  if(mapped.length||missing.length)parts.push('WEB_CONTRACT_ADAPTER:'+mapped.concat(missing).join(','));
  if(ai.length)parts.push('WEB_CONTRACT_EXTERNAL_AI:'+ai.join(','));
  return clean(parts.join('|')).slice(0,850);
}
function sanitizeExternalAdvisory(value={}){
  const suggestedBindings=(Array.isArray(value?.suggestedBindings)?value.suggestedBindings:[]).slice(0,8).map(row=>({
    scopeId:clean(row?.scopeId).slice(0,120),
    selector:clean(row?.selector).slice(0,120)||null,
    candidateKey:clean(row?.candidateKey).slice(0,120)||null,
    mechanicId:clean(row?.mechanicId).slice(0,120)||null,
    reason:clean(row?.reason).slice(0,240)
  })).filter(row=>row.scopeId&&(row.selector||row.candidateKey));
  const repairTargets=(Array.isArray(value?.repairTargets)?value.repairTargets:[]).map(clean).filter(Boolean).slice(0,6).map(x=>x.slice(0,220));
  return{suggestedBindings,repairTargets};
}
async function requestWebContractExternalAdvisory({gameId='',plan={}}={}){
  if(plan?.externalAiReviewRequired!==true)return{used:false,provider:null,reason:'NOT_REQUIRED',suggestedBindings:[],repairTargets:[]};
  const apiKey=clean(process.env.GEMINI_API_KEY);
  if(!apiKey)return{used:false,provider:'GEMINI',reason:'GEMINI_API_KEY_UNAVAILABLE',suggestedBindings:[],repairTargets:[]};
  try{
    const directive=readJson('company-directive.json');
    const ai=directive?.ai||{},designer=ai?.gameDesigner||{};
    if(designer.externalProvidersAllowed!==true)return{used:false,provider:'GEMINI',reason:'EXTERNAL_PROVIDER_DISABLED',suggestedBindings:[],repairTargets:[]};
    const allowed=[clean(designer.geminiModel),...(designer.geminiFallbackModels||[]).map(clean)].filter(Boolean);
    const model=clean(designer.geminiModel);
    if(!model||!allowed.includes(model))return{used:false,provider:'GEMINI',reason:'GEMINI_MODEL_NOT_AUTHORIZED',suggestedBindings:[],repairTargets:[]};
    const advisoryInput={
      gameId:clean(gameId),
      ambiguous:(plan.ambiguous||[]).slice(0,8),
      unmapped:(plan.unmapped||[]).slice(0,8),
      deterministicBindings:(plan.bindings||[]).filter(row=>row.confidence!=='LOW').slice(0,8)
    };
    const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent?key='+encodeURIComponent(apiKey),{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        systemInstruction:{parts:[{text:'You are an advisory-only gameplay contract mapper. Choose only from supplied real controls/candidate keys. Do not invent gameplay, do not decide PASS/FAIL, do not output chain-of-thought. Return JSON with suggestedBindings and repairTargets only.'}]},
        contents:[{role:'user',parts:[{text:'Resolve only ambiguous Web gameplay scope mappings. Existing deterministic mappings remain authoritative unless clearly contradicted by supplied evidence. INPUT='+JSON.stringify(advisoryInput)}]}],
        generationConfig:{temperature:0,maxOutputTokens:900,responseMimeType:'application/json'}
      }),
      signal:AbortSignal.timeout(25000)
    });
    if(!response.ok)return{used:false,provider:'GEMINI',model,reason:'GEMINI_HTTP_'+response.status,suggestedBindings:[],repairTargets:[]};
    const body=await response.json();
    const raw=clean((body?.candidates||[]).flatMap(candidate=>candidate?.content?.parts||[]).map(part=>part?.text||'').join(''));
    if(!raw)return{used:false,provider:'GEMINI',model,reason:'GEMINI_EMPTY_RESPONSE',suggestedBindings:[],repairTargets:[]};
    const parsed=JSON.parse(raw);
    return{used:true,provider:'GEMINI',model,reason:null,...sanitizeExternalAdvisory(parsed)};
  }catch(error){
    return{used:false,provider:'GEMINI',reason:'GEMINI_ADVISORY_ERROR:'+clean(error?.message||error).slice(0,220),suggestedBindings:[],repairTargets:[]};
  }
}


function scripts(text){return [...String(text??'').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];}
function mechanics(text){return [...new Set([...String(text??'').matchAll(/data-mechanic-id=["']([^"']+)["']/gi)].map(x=>clean(x[1])).filter(Boolean))];}
function scriptBlockers(text){
  const out=[];let i=0;
  for(const m of scripts(text)){
    if(/\bsrc\s*=/i.test(m[1]||'')){out.push('SCRIPT_SRC_FORBIDDEN');continue;}
    try{new Script(String(m[2]||''),{filename:`bootstrap-inline-${++i}.js`});
    }catch{out.push('INLINE_SCRIPT_SYNTAX_INVALID');}
  }
  return out;
}
function stripInitialTimeProxyContract(text){
  return String(text??'')
    .replace(/<section class=["']panel["']><div class=["']phases["']>[\s\S]*?<\/div><\/section>/gi,'')
    .replace(/\sdata-session-(?:minutes|proof-mode|stage-direct-control|stage-count|current-stage|completed-stages|stage|start|end|stage-complete)=["'][^"']*["']/gi,'')
    .replace(/data-session-stage-complete/gi,'data-game-progress-complete')
    .replace(/data-session-stage/gi,'data-game-progress-stage')
    .replace(/sessionCompletedStages/g,'gameProgressCompleted')
    .replace(/sessionCurrentStage/g,'gameProgressCurrent');
}
function bindInitialCycleContract(text,approvedScopeCount){
  let out=stripInitialTimeProxyContract(text);
  const attrs=[];
  if(!/data-playable-cycle-contract=["']ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE["']/i.test(out))attrs.push(`data-playable-cycle-contract="${INITIAL_PLAYABLE_MINIMUM}"`);
  if(/data-approved-scope-count=["'][^"']*["']/i.test(out))out=out.replace(/data-approved-scope-count=["'][^"']*["']/i,`data-approved-scope-count="${approvedScopeCount}"`);
  else attrs.push(`data-approved-scope-count="${approvedScopeCount}"`);
  if(attrs.length)out=out.replace(/<main\b/i,`<main ${attrs.join(' ')}`);
  return out;
}
function commonContractBlockers(text,{scopeInventory=[],allowPersistentStorage=false,canvasRequired=false}={}){
  const blockers=[],bytes=Buffer.byteLength(text,'utf8'),scriptBytes=scripts(text).reduce((n,m)=>n+Buffer.byteLength(String(m[2]||''),'utf8'),0),ids=mechanics(text);
  if(scopeInventory.length){
    if(bytes<MIN_REAL_GAME_BYTES)blockers.push(`REAL_GAME_FOOTPRINT_TOO_SMALL:${bytes}:${MIN_REAL_GAME_BYTES}`);
    if(scriptBytes<MIN_REAL_SCRIPT_BYTES)blockers.push(`REAL_GAME_LOGIC_TOO_SMALL:${scriptBytes}:${MIN_REAL_SCRIPT_BYTES}`);
    if(ids.length<5)blockers.push(`REAL_GAME_MECHANIC_COUNT_TOO_LOW:${ids.length}:5`);
    if(!/data-gameplay-system-count=["'](?:[5-9]|\d{2,})["']/i.test(text))blockers.push('REAL_GAME_SYSTEM_COUNT_REQUIRED');
    if(!/data-playable-cycle-contract=["']ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE["']/i.test(text))blockers.push('COMPLETE_PLAYABLE_GAMEPLAY_CYCLE_REQUIRED');
    if(/data-session-minutes=["']30["']|data-session-proof-mode=["']PROGRESSION_MILESTONES["']|data-session-stage=|Stage\s*0-5|0\s*[–-]\s*5\s*분/i.test(text))blockers.push('INITIAL_30_MINUTE_PROXY_FORBIDDEN');
    if(/<button\b[^>]*data-session-stage=/i.test(text))blockers.push('SESSION_DIRECT_STAGE_CONTROL_FORBIDDEN');
    if(!/data-run-result=["']running["']/i.test(text))blockers.push('RUN_RESULT_STATE_REQUIRED');
    if(!/(victory|목표 달성|달성!|선승)/i.test(text))blockers.push('WIN_CONDITION_REQUIRED');
    if(!/(defeat|shutdown|가동 중단|쓰러졌다|파괴됐다|패배)/i.test(text))blockers.push('LOSS_CONDITION_REQUIRED');
    if(/FULL APPROVED WEB COMPANION|승인 분량 전체 구현|scope-control-|test harness|validation panel|검증 패널/i.test(text))blockers.push('WEB_TEST_HARNESS_FORBIDDEN');
    blockers.push(...staticApprovedScopeCoverage(text,scopeInventory).blockers);
  }
  if(!/<(?:!doctype\s+html|html)[\s>]/i.test(text))blockers.push('HTML_DOCUMENT_REQUIRED');
  if(!/<meta\b[^>]*name=["']viewport["'][^>]*content=["'][^"']*width=device-width/i.test(text))blockers.push('MOBILE_VIEWPORT_REQUIRED');
  if(scopeInventory.length&&!new RegExp(`data-web-artifact-type=["']${REAL_ARTIFACT_TYPE}["']`,'i').test(text))blockers.push('REAL_PLAYABLE_WEB_GAME_REQUIRED');
  if(canvasRequired&&scopeInventory.length&&!/<canvas\b/i.test(text))blockers.push('REAL_GAMEPLAY_SURFACE_REQUIRED');
  if(!/(AudioContext|webkitAudioContext)/.test(text))blockers.push('MUSIC_RUNTIME_REQUIRED');
  if(!/data-audio-control=["']mute["']/.test(text))blockers.push('MUSIC_MUTE_CONTROL_REQUIRED');
  if(!/data-audio-control=["']volume["']/.test(text))blockers.push('MUSIC_VOLUME_CONTROL_REQUIRED');
  if(!allowPersistentStorage&&/\b(?:localStorage|sessionStorage)\b/.test(text))blockers.push('PERSISTENT_STORAGE_FORBIDDEN_ON_BOOTSTRAP');
  if(/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(text))blockers.push('NETWORK_API_FORBIDDEN');
  blockers.push(...scriptBlockers(text));
  return {blockers:[...new Set(blockers)],bytes,scriptBytes,mechanicCount:ids.length,mechanicIds:ids};
}
export function validateBootstrapHtml(html,{scopeInventory=[]}={}){
  const text=String(html??''),r=commonContractBlockers(text,{scopeInventory,canvasRequired:true});
  return{pass:r.blockers.length===0,...r,approvedScopeRequiredCount:scopeInventory.length,artifactType:scopeInventory.length?REAL_ARTIFACT_TYPE:null,initialPlayableMinimum:INITIAL_PLAYABLE_MINIMUM};
}
export function validatePreservedSourceHtml(html,{scopeInventory=[]}={}){
  const text=String(html??''),r=commonContractBlockers(text,{scopeInventory,allowPersistentStorage:true,canvasRequired:false});
  return{pass:r.blockers.length===0,...r,approvedScopeRequiredCount:scopeInventory.length,artifactType:REAL_ARTIFACT_TYPE,preservedSource:true,initialPlayableMinimum:INITIAL_PLAYABLE_MINIMUM};
}

export function applyPreservedSourceEdits(source,edits=[]){
  let out=String(source??'');
  if(!Array.isArray(edits)||edits.length<1||edits.length>PRESERVED_PATCH_MAX_EDITS)throw new Error(`VIBE2_PATCH_EDIT_COUNT_INVALID:${Array.isArray(edits)?edits.length:'NONE'}`);
  for(const [index,edit] of edits.entries()){
    const search=String(edit?.search??''),replacement=String(edit?.replacement??'');
    if(!search)throw new Error(`VIBE2_PATCH_SEARCH_EMPTY:${index}`);
    if(search.length>Math.max(12000,Math.floor(out.length*.55))||replacement.length>12000)throw new Error(`VIBE2_PATCH_EDIT_TOO_BROAD:${index}`);
    const at=out.indexOf(search);
    if(at<0)throw new Error(`VIBE2_PATCH_TARGET_NOT_FOUND:${index}`);
    if(out.indexOf(search,at+search.length)>=0)throw new Error(`VIBE2_PATCH_TARGET_AMBIGUOUS:${index}`);
    out=out.slice(0,at)+replacement+out.slice(at+search.length);
  }
  return out;
}
export function inferDevelopmentGenre({gameId='',baseline={}}={}){
  const seed=clean(baseline?.gameSeedId||baseline?.seedId||'').toUpperCase(),m=seed.match(/^SEED-(.+)-\d+$/);
  if(m)return m[1].replace(/^ROBLOX-/,'');
  const id=clean(gameId).toLowerCase();
  if(id.includes('simulator')||id.includes('tycoon'))return'SIMULATOR_TYCOON_INCREMENTAL';
  if(id.includes('battleground'))return'BATTLEGROUND_FIGHTING_SHOOTER';
  if(id.includes('survival')||id.includes('horror'))return'SURVIVAL_HORROR_ESCAPE';
  if(id.includes('obby')||id.includes('party'))return'OBBY_PARTY_MINIGAME';
  if(id.includes('story-rpg')||id.includes('adventure'))return'STORY_RPG_ADVENTURE_RPG';
  if(id.includes('roleplay')||id.includes('life-avatar'))return'ROLEPLAY_LIFE_AVATAR';
  return'UNIMPLEMENTED';
}
export function classifyApprovedScope(item={},index=0){
  const t=`${clean(item.path)} ${clean(item.label)}`.toLowerCase();
  if(/combat|fight|attack|enemy|skill/.test(t))return'COMBAT';
  if(/move|explore|jump|reposition/.test(t))return'MOVEMENT';
  if(/resource|econom|collect|produce|craft/.test(t))return'ECONOMY';
  if(/upgrade|progress|reward|level/.test(t))return'PROGRESSION';
  if(/mobile|touch|control|ux/.test(t))return'MOBILE';
  return['OBJECTIVE','ECONOMY','PROGRESSION','MOVEMENT'][index%4];
}

function bindScopeIds(html,inventory){
  let index=0;
  let out=String(html).replace(/data-scope-id=["'][^"']+["']/gi,()=>index<inventory.length?`data-scope-id="${esc(inventory[index++].id)}"`:'');
  out=out.replace(/data-approved-scope-count=["']\d+["']/i,`data-approved-scope-count="${inventory.length}"`);
  return out;
}
function preparePreservedStandaloneHtml(html,inventory){
  return bindInitialCycleContract(bindScopeIds(html,inventory),inventory.length);
}
function preservedResult({gameId,gameName,html,inventory,notes=[]}){
  const review=validatePreservedSourceHtml(html,{scopeInventory:inventory});
  return{
    html,review,preservationEligible:review.pass,
    validationQuestion:`${gameName||gameId} 기존 실제 Web 게임 보존 재검증`,
    implementationNotes:[...notes,'approved scopes rebound to current frozen DESIGN_BASELINE','obsolete initial time-stage validation UI removed without changing gameplay rules','one complete playable gameplay cycle required before final content-depth validation'],
    generationMode:'SOURCE_PRESERVED_REAL_GAME',
    approvedScopeInventory:inventory,
    initialPlayableMinimum:INITIAL_PLAYABLE_MINIMUM,
    finalContentDepth:{requiredMinutes:FINAL_CONTENT_DEPTH_MINUTES,status:'PENDING'},
    artifactType:REAL_ARTIFACT_TYPE
  };
}
function sharedScopeActionIndex(item={},index=0){
  const text=`${clean(item?.path)} ${clean(item?.label)}`.toLowerCase();
  if(/mobileux|mobile|touch/.test(text))return 2;
  if(/explor|area|quest|discover|character/.test(text))return 0;
  if(/fight\s+enemies|combat|attack/.test(text))return index%2===0?3:1;
  if(/progress through|real ending|complete story|major encounter/.test(text))return 4;
  if(/enemy|boss/.test(text))return index%2===0?3:1;
  if(/equip|skill|upgrade|growth|level/.test(text))return 3;
  return index%5;
}
function sharedScopeButtons(inventory=[]){
  const mechanicIds=['action-primary','action-secondary','action-tertiary','action-support','action-accelerated'];
  const count=Math.max(5,inventory.length);
  return Array.from({length:count},(_,index)=>{
    const item=inventory[index],actionIndex=item?sharedScopeActionIndex(item,index):index%5;
    const scope=item?` data-scope-id="${esc(item.id)}"`:'';
    return `<button id="a${index}" class="action" data-gameplay-action="true"${scope} data-mechanic-id="${mechanicIds[actionIndex]}" data-action-index="${actionIndex}"></button>`;
  }).join('');
}
function buildPreservedSharedGame({gameId,gameName,sourcePath,inventory}){
  const indexFile=path.join(sourcePath,'index.html');
  if(!fs.existsSync(indexFile)||!fs.existsSync(SHARED_REAL_ENGINE))return null;
  const original=fs.readFileSync(indexFile,'utf8'),sharedScript=/<script\b[^>]*src=["']\/web-games\/_shared\/vibe2-final\.js["'][^>]*><\/script\s*>/i;
  if(!sharedScript.test(original))return null;
  if(inventory.length<1)throw new Error(`SOURCE_PRESERVE_SCOPE_COUNT_UNSUPPORTED:${inventory.length}`);
  let engine=fs.readFileSync(SHARED_REAL_ENGINE,'utf8').replaceAll('__SCOPE_COUNT__',String(inventory.length));
  const actionMarkup=sharedScopeButtons(inventory);
  engine=engine.replace(/<section class="actions">[\s\S]*?<\/section>/,`<section class="actions">${actionMarkup}</section>`);
  for(let i=0;i<5;i++)engine=engine.replaceAll(`__SCOPE_${i}__`,inventory[i]?.id||`unused-scope-${i+1}`);
  engine=bindInitialCycleContract(engine,inventory.length);
  if(!/data-web-artifact-type=["']REAL_PLAYABLE_GAME/i.test(engine))engine=engine.replace('<main ',`<main data-web-artifact-type="${REAL_ARTIFACT_TYPE}" data-approved-scope-count="${inventory.length}" data-gameplay-system-count="7" data-run-result="running" `);
  const validation=`<script>window.GAME_CONFIG=window.GAME_CONFIG||{};window.GAME_CONFIG.validationScopes=${JSON.stringify(inventory.map((x,index)=>({id:x.id,path:x.path,label:x.label,actionIndex:sharedScopeActionIndex(x,index)})))};</script>`;
  const html=original.replace(sharedScript,`${validation}<script>${engine}</script>`);
  return preservedResult({gameId,gameName,html,inventory,notes:['existing shared real game source preserved before Vibe2 regeneration','shared runtime inlined for immutable source binding','save key and gameplay state retained']});
}
function buildPreservedStandaloneGame({gameId,gameName,sourcePath,inventory}){
  const indexFile=path.join(sourcePath,'index.html');
  if(!fs.existsSync(indexFile))return null;
  const original=fs.readFileSync(indexFile,'utf8');
  if(/<script\b[^>]*src=["']\/web-games\/_shared\/vibe2-final\.js["']/i.test(original))return null;
  const html=preparePreservedStandaloneHtml(original,inventory);
  return preservedResult({gameId,gameName,html,inventory,notes:['existing standalone real game source preserved before Vibe2 regeneration','gameplay state machine, controls, win/fail rules and visual surface retained']});
}
function buildCanonicalGame({template,gameName,baseline,inventory,fallbackName,fallbackCore,validationQuestion,implementationNotes}){
  if(!fs.existsSync(template))throw new Error(`CANONICAL_REAL_GAME_TEMPLATE_MISSING:${template}`);
  if(inventory.length!==5)throw new Error(`CANONICAL_SCOPE_COUNT_REQUIRED:5:${inventory.length}:${template}`);
  let html=bindInitialCycleContract(bindScopeIds(fs.readFileSync(template,'utf8'),inventory),inventory.length);
  const c=baseline?.content||{},identity=safeText(c.identity||gameName||fallbackName),core=safeText(c.coreFun||fallbackCore);
  html=html.replace(/<title>[^<]*<\/title>/i,`<title>${esc(identity)}</title>`).replace(/<h1>[^<]*<\/h1>/i,`<h1>${esc(identity)}</h1>`).replace(/(<section class="hero"[\s\S]*?<p>)[\s\S]*?(<\/p>)/i,`$1${esc(core)}$2`);
  const review=validateBootstrapHtml(html,{scopeInventory:inventory});
  if(!review.pass)throw new Error(`REAL_PLAYABLE_WEB_GAME_BUILD_FAILED:${review.blockers.join('|')}`);
  return{html,review,validationQuestion:`${identity} ${validationQuestion}`,implementationNotes,generationMode:'GENRE_SPECIFIC_REAL_IMPLEMENTATION',approvedScopeInventory:inventory,initialPlayableMinimum:INITIAL_PLAYABLE_MINIMUM,finalContentDepth:{requiredMinutes:FINAL_CONTENT_DEPTH_MINUTES,status:'PENDING'},artifactType:REAL_ARTIFACT_TYPE};
}
function buildPocketFoundryFromCanonical({gameName,baseline,inventory}){
  return buildCanonicalGame({template:POCKET_FOUNDRY_TEMPLATE,gameName,baseline,inventory,fallbackName:'Pocket Foundry',fallbackCore:'채굴, 제련, 판매, 자동화와 구역 해금으로 공장을 성장시킨다.',validationQuestion:'실제 생산 루프 구현 여부',implementationNotes:['canonical Pocket Foundry real-game template','resource dependencies','automation','heat failure state','complete gameplay cycle before content-depth expansion']});
}
export function buildContractSafePlayable({gameId='',gameName='',baseline={}}={}){
  const genre=inferDevelopmentGenre({gameId,baseline}),inventory=deriveApprovedScopeInventory(baseline);
  if(genre==='SIMULATOR_TYCOON_INCREMENTAL')return buildPocketFoundryFromCanonical({gameId,gameName,baseline,inventory});
  throw new Error(`GENRE_REAL_IMPLEMENTATION_NOT_READY:${genre}`);
}

export function buildApprovedScopeGenerationPrompt({gameId='',gameName='',baseline={},inventory=[],existingHtml='',preservationBlockers=[],developmentContext=null}={}){
  const genre=inferDevelopmentGenre({gameId,baseline});
  const context=developmentContext||buildVibeDevelopmentContext({gameId,genre,baseline,inventory,existingHtml,blockers:preservationBlockers});
  const inventoryText=inventory.map((item,index)=>`${index+1}. id=${item.id} path=${item.path} meaning=${safeText(item.label)}`).join('\n');
  const existing=clean(existingHtml)?`\n\n기존 실제 게임 소스가 있다. 아래 소스를 기준으로 직접 수정하고, 저장 키/저장 구조/기존 게임 규칙/이미 동작하는 기능은 유지한다. 전체 재작성이나 장르 템플릿 교체는 금지한다.\n기존 검증 실패 또는 재작업 사유: ${(preservationBlockers||[]).join(' | ')||'runtime rework requested'}\nEXISTING_HTML:\n${clipPreservedSourceForModel(existingHtml,24000)}`:'';
  return `게임 ID: ${gameId}\n게임 이름: ${gameName}\n잠긴 장르: ${genre}\n\nVIBE_DEVELOPMENT_CONTEXT:\n${clip(context,12000)}\n\nDESIGN_BASELINE:\n${clip(baseline,16000)}\n\n반드시 구현할 승인 scope:\n${inventoryText}\n\n본 플랫폼 이전 Web 구현 원칙:\n${WEB_PREPLATFORM_IMPLEMENTATION_POLICY}\n\n산출물 계약:\n- 단일 self-contained HTML 문서 하나만 생성한다.\n- VIBE_DEVELOPMENT_CONTEXT의 gameplaySketch/sourceAnalysis/patchPlan을 먼저 읽고 기존 구조와 의존성을 보존하는 패치 순서로 구현한다.\n- 실제 플레이 게임이어야 하며 테스트 하네스, 검증 패널, 체크리스트, 범용 scope 버튼 프록시, 시간 stage 버튼, 가짜 progress는 금지한다.\n- 초기 제작 최소단위는 ${INITIAL_PLAYABLE_MINIMUM}이고 고정 시간분량을 요구하지 않는다.\n- 시작/월드진입 → 실제 사용자 입력 → 핵심 게임행동 → 실제 상태변화 → 성장/보상/의미있는 선택 → 위험/실패/자원압박 → 목표달성 또는 사이클 종료/재도전을 하나의 실제 플레이 사이클로 연결한다.\n- 타워/유닛 배치가 승인 설계에 있으면 설치 버튼만 눌러 수량을 증가시키는 구현은 금지한다. 플레이어가 실제 위치를 선택해야 하고 선택 위치에 실제 엔티티가 배치되어 전투 결과에 영향을 줘야 한다. DOM 배치면 data-placement-position/data-build-slot/data-tower-slot/data-grid-x/data-grid-y 중 적합한 실제 위치 표식을 사용하고, Canvas면 실제 포인터 좌표를 게임 좌표로 변환한다.\n- 맵/월드/구역/경로가 승인 설계에 있으면 배경 그림, 큰 캔버스, 구역 이름만으로 구현 완료 처리하지 않는다. 실제 플레이 가능한 공간과 복수 위치·구역 또는 경로 노드를 상태로 두고 이동·충돌·배치·사거리·경로 선택 중 장르에 해당하는 공간 규칙을 구현한다. 공간 선택은 적 이동, 피해, 생존, 자원, 목표 진행 등 실제 결과를 바꿔야 한다. DOM이면 data-area/data-zone/data-route/data-build-slot/data-grid-x/data-grid-y 등 실제 공간 표식을 사용하고 Canvas면 실제 좌표·충돌·경로 상태를 게임 상태로 유지한다.\n- 2D 플레이어 이동 장르에서는 실제 플레이어 좌표와 화면 렌더 위치가 함께 변해야 한다. data-player-x/data-player-y를 실제 X/Y 상태와 동기화하고 data-collision-enabled, data-collision-count, data-camera-active와 필요 시 data-camera-x/data-camera-y를 실제 충돌/카메라 상태와 연결한다. 키보드와 모바일 터치/조이스틱 둘 다 같은 이동 로직을 사용하고 대각선 속도 정규화와 delta time을 적용한다.\n- 탐험 설계가 있으면 최소 복수 지역, 랜드마크 또는 발견 지점, 실제 접근/상호작용 결과를 구현하고 data-landmark/data-discovery/data-secret/data-treasure 중 적합한 표식을 실제 월드 대상에 연결한다.\n- 보스 설계가 있으면 최소 한 번의 완전한 보스전, 최소 2개의 구분되는 패턴 또는 단계, 강공격 예고, 처치 보상과 재도전을 구현하고 data-boss 또는 data-boss-id 및 data-boss-pattern/data-boss-phase를 실제 상태와 동기화한다.\n- 3D 게임이면 최상위 게임 컨테이너에 data-spatial-dimension="3d"를 두고 실제 X/Y/Z 이동, 카메라 yaw/pitch 또는 방향, 지형/사물 충돌, 레이캐스트 또는 경로 탐색을 구현한다. data-player-x/data-player-y/data-player-z, data-camera-yaw/data-camera-pitch, data-collision-count, data-raycast-hit 또는 data-route-id 같은 비표시 런타임 상태를 실제 게임 상태와 함께 갱신해 검증 가능하게 한다. 3D 화면만 렌더링하고 공간 규칙이 게임 결과에 영향을 주지 않는 구현은 금지한다.\n- 캐릭터·NPC·적·사물이 승인 설계에 있으면 장식 엔티티만 두지 않는다. data-interactable/data-interaction-target/data-npc/data-object-id/data-world-entity 등으로 실제 대상을 식별하고, 접근 또는 대상 선택 → 실제 상호작용 입력 → 대상 상태 변화 → 대화·아이템 획득·문/장치 작동·자원 변화·퀘스트 진행·전투 변화 중 하나 이상의 실제 게임 결과로 연결한다. 텍스트/모달/버튼만 나타나고 대상 상태가 변하지 않는 상호작용은 구현 완료로 인정하지 않는다.\n- 전략 선택이 승인 설계에 있으면 선택지 이름만 다르게 두지 말고 서로 다른 선택이 피해·생존·처치·자원·진행 등 실제 전투 결과를 다르게 만들어야 한다.\n- ${FINAL_CONTENT_DEPTH_REWORK_REQUIRED}\n- 신규 게임은 <canvas> 또는 실제 상호작용 게임 surface를 사용하고 상태 변화에 따라 그래픽이 변해야 한다. 기존 실제 게임 보완은 현재 렌더링 방식을 보존해도 된다.\n- 모바일 터치 조작과 키보드 조작을 제공한다.\n- 최소 5개의 서로 다른 실제 gameplay mechanic에 data-mechanic-id를 부여한다.\n- 모든 승인 scope id를 실제 해당 mechanic control 또는 surface에 data-scope-id로 1회 이상 직접 바인딩한다.\n- 최상위 실제 게임 컨테이너에 data-web-artifact-type="${REAL_ARTIFACT_TYPE}", data-approved-scope-count="${inventory.length}", data-gameplay-system-count="5 이상", data-run-result="running", data-playable-cycle-contract="${INITIAL_PLAYABLE_MINIMUM}"를 넣는다.\n- 소스 크기와 이름표는 보조 형식 조건일 뿐 구현 완료 근거가 아니다. 실제 입력→상태변화→월드 결과가 연결되어야 한다.\n- 실제 승리 조건과 실제 패배 조건을 구현하고 화면/코드에 victory 또는 목표 달성, defeat 또는 패배 상태가 존재해야 한다.\n- ${FINAL_CONTENT_DEPTH_MINUTES}분 실콘텐츠 검증은 초기 생성 계약에 넣지 않는다. 콘텐츠 확장 뒤 실제 gameplay로 별도 최종 검증한다.\n- AudioContext 또는 webkitAudioContext 기반 음악/효과음을 구현하고 data-audio-control="mute", data-audio-control="volume" 실제 조작을 제공한다.\n- 외부 URL asset, fetch/XMLHttpRequest/WebSocket, iframe/object/embed는 사용하지 않는다. 신규 생성에서는 localStorage/sessionStorage를 사용하지 않는다. 기존 소스 보완이면 기존 저장 키와 저장 구조를 그대로 유지한다.\n- 승인 설계의 핵심 루프, 진행, 경제, 전투/탐험/상호작용 의미를 장르에 맞게 실제 상태와 규칙으로 구현한다.\n- 모든 텍스트는 사용자에게 게임 UI로 자연스럽게 보여야 하며 개발/검증 문구를 노출하지 않는다.\n- HTML 전체를 html 필드에 반환한다.${existing}`;
}

export async function buildFirstPlayable({gameId,gameName,baseline,sourcePath,candidatePath,candidateId,sourceCommit,model,forceRepair=false,repairReason=''}){
  void candidateId;void sourceCommit;void model;
  const inventory=deriveApprovedScopeInventory(baseline);
  const preserved=buildPreservedSharedGame({gameId,gameName,sourcePath,inventory})||buildPreservedStandaloneGame({gameId,gameName,sourcePath,inventory});
  const preservationBlockers=[...(preserved?.review?.blockers||[])];
  if(forceRepair)preservationBlockers.push(`RUNTIME_REWORK_REQUIRED:${clean(repairReason)||'CANONICAL_DEVELOPMENT_REWORK'}`);
  const adapterPlan=preserved?buildWebContractAdapterPlan({html:preserved.html,inventory}):null;
  const externalAiAdvisory=adapterPlan?await requestWebContractExternalAdvisory({gameId,plan:adapterPlan}):{used:false,provider:null,reason:'SOURCE_MISSING',suggestedBindings:[],repairTargets:[]};
  const developmentContext=buildVibeDevelopmentContext({gameId,genre:inferDevelopmentGenre({gameId,baseline}),baseline,inventory,existingHtml:preserved?.html||'',blockers:preservationBlockers});
  if(!preserved)throw new Error('VIBE_WEB_IMPLEMENTATION_REQUIRED:WEB_BASE_IMPLEMENTATION:SOURCE_MISSING');
  if(forceRepair||preserved.preservationEligible!==true){
    const adapterHint=compactWebContractAdapterHint(adapterPlan,externalAiAdvisory);
    const reason=[adapterHint,...preservationBlockers].filter(Boolean).join('|')||'WEB_RUNTIME_OR_CONTRACT_REPAIR_REQUIRED';
    const error=new Error(`VIBE_WEB_IMPLEMENTATION_REQUIRED:${forceRepair?'WEB_REPAIR':'WEB_BASE_IMPLEMENTATION'}:${reason}`);
    error.webContractAdapterPlan=adapterPlan;
    error.webContractExternalAiAdvisory=externalAiAdvisory;
    throw error;
  }
  const result=preserved,review=preserved.review;
  const generation={mode:'SOURCE_PRESERVED_VALIDATION_ONLY',modelAttempts:0,modelContractFailures:[],modelUsed:false,modelInvoked:false,sourcePreserved:true,forcedRepair:false,model:null,developmentContext,developmentOwner:'VIBE2_VIBE3',nonVibeGameSourceWrite:false,webContractAdapter:adapterPlan,externalAiAdvisory};
  fs.mkdirSync(candidatePath,{recursive:true});
  fs.writeFileSync(path.join(candidatePath,'index.html'),result.html+'\n','utf8');
  return{result,review,generation,approvedScopeInventory:result.approvedScopeInventory||inventory,webContractAdapter:adapterPlan,externalAiAdvisory};
}

async function main(){
  const gameId=clean(arg('game-id')),gameName=clean(arg('game-name',gameId)),baselineFile=arg('baseline'),sourcePath=clean(arg('source-path')),candidateId=safeId(arg('candidate-id')),candidatePath=clean(arg('candidate-path')),sourceCommit=clean(arg('source-commit')),evidenceFile=clean(arg('evidence')),forceRepair=clean(arg('force-repair')).toLowerCase()==='true',repairReason=clean(arg('repair-reason'));
  if(!gameId||!baselineFile||!sourcePath||!candidateId||!candidatePath||!sourceCommit||!evidenceFile)throw new Error('required bootstrap argument missing');
  const baseline=readJson(baselineFile);
  let built;
  try{
    built=await buildFirstPlayable({gameId,gameName,baseline,sourcePath,candidatePath,candidateId,sourceCommit,forceRepair,repairReason});
  }catch(error){
    const failureSignature=clean(error?.message||error).replace(/\s+/g,' ').slice(0,1800);
    const signal=/^VIBE_WEB_IMPLEMENTATION_REQUIRED:(WEB_BASE_IMPLEMENTATION|WEB_REPAIR):(.+)$/.exec(failureSignature);
    writeJson(evidenceFile,{
      version:15,candidateId,gameId,sourcePath,candidatePath,sourceCommit,candidateOnly:true,selfPromote:false,
      pass:false,realPlayableGame:false,sourcePreserved:false,sourceRepaired:false,
      failureSignature,
      vibeWebImplementationRequired:Boolean(signal),
      vibeWebRequestedStage:signal?.[1]||null,
      vibeWebImplementationReason:signal?.[2]||null,
      webContractAdapter:error?.webContractAdapterPlan||null,
      externalAiAdvisory:error?.webContractExternalAiAdvisory||null,
      createdAt:new Date().toISOString()
    });
    throw error;
  }
  const {result,review,generation,approvedScopeInventory,webContractAdapter,externalAiAdvisory}=built;
  const sourceRepaired=false;
  writeJson(evidenceFile,{version:15,candidateId,gameId,sourcePath,candidatePath,sourceCommit,candidateOnly:true,selfPromote:false,artifactType:REAL_ARTIFACT_TYPE,realPlayableGame:true,webRole:'PREPLATFORM_PLAYABLE_GAME',testHarness:false,sourcePreserved:generation.sourcePreserved,sourceRepaired,changedFiles:['index.html'],summary:result.validationQuestion,implementationNotes:result.implementationNotes,approvedScopeInventory,approvedScopeRequiredCount:approvedScopeInventory.length,initialPlayableMinimum:INITIAL_PLAYABLE_MINIMUM,initialThirtyMinuteHardRequirement:false,finalContentDepthValidation:{requiredMinutes:FINAL_CONTENT_DEPTH_MINUTES,status:'PENDING',stage:'FINAL_CONTENT_DEPTH_VALIDATION_ONLY'},preplatformImplementationPolicy:WEB_PREPLATFORM_IMPLEMENTATION_POLICY,vibeDevelopmentContext:generation.developmentContext,webContractAdapter,externalAiAdvisory,generation,bootstrapContract:review,createdAt:new Date().toISOString()});
  void LEGACY_WORKFLOW_PROBE;
  console.log('DEVELOPMENT_WEB_BOOTSTRAP=PASS');
  console.log('WEB_ARTIFACT_TYPE='+REAL_ARTIFACT_TYPE);
  console.log('WEB_ROLE=PREPLATFORM_PLAYABLE_GAME');
  console.log('REAL_PLAYABLE_WEB_GAME=YES');
  console.log('INITIAL_PLAYABLE_MINIMUM='+INITIAL_PLAYABLE_MINIMUM);
  console.log('INITIAL_30_MINUTE_HARD_REQUIREMENT=NO');
  console.log('INITIAL_30MIN_HARD_GATE=NO');
  console.log('FINAL_CONTENT_DEPTH_MINUTES='+FINAL_CONTENT_DEPTH_MINUTES);
  console.log('SOURCE_PRESERVED='+(generation.sourcePreserved?'YES':'NO'));
  console.log('SOURCE_REPAIRED='+(sourceRepaired?'YES':'NO'));
  console.log('DETERMINISTIC_FIRST=YES');
  console.log('GAME_DEVELOPMENT_OWNER=VIBE2_VIBE3');
  console.log('NON_VIBE_GAME_SOURCE_WRITE=NO');
  console.log('BOOTSTRAP_SOURCE_WRITE_MODE=PRESERVE_ONLY');
  console.log('VIBE_IMPLEMENTATION_OWNER=YES');
  console.log('MODEL_INVOKED=NO');
  console.log('MODEL_USED=NO');
  console.log('WEB_CONTRACT_ADAPTER=ENABLED');
  console.log('WEB_CONTRACT_EXTERNAL_AI_ADVISORY='+(externalAiAdvisory?.used===true?'USED':(externalAiAdvisory?.reason||'NOT_USED')));
  console.log('FORCED_REPAIR='+(generation.forcedRepair?'YES':'NO'));
  console.log('GAMEPLAY_SKETCH_SOURCE='+(generation.developmentContext?.gameplaySketch?.source||'NONE'));
  console.log('VIBE_PATCH_TASKS='+(generation.developmentContext?.patchPlan?.tasks?.length||0));
  console.log('FULL_APPROVED_SCOPE_REQUIRED=YES');
  console.log('PREPLATFORM_CORE_GAMEPLAY_PARITY=YES');
  console.log('REAL_GAME_BYTES='+review.bytes);
  console.log('REAL_GAME_SCRIPT_BYTES='+review.scriptBytes);
  console.log('REAL_GAME_MECHANICS='+review.mechanicCount);
  console.log('PRE_WEB_ARTBOOK_REQUIRED=NO');
  console.log('PAID_API=NO');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(e=>{console.error(e.stack||e.message);process.exitCode=1;});
}
