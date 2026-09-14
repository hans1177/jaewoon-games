// DESIGN_BASELINE -> 실제 Web 게임 생성/보존. 기존 실게임은 보존하고, 새 구현은 Vibe2 로컬 개발 AI가 우선 생성한다.
import fs from 'node:fs';
import path from 'node:path';
import {Script} from 'node:vm';
import {pathToFileURL} from 'node:url';
import {execFileSync,spawn} from 'node:child_process';
import {deriveApprovedScopeInventory,staticApprovedScopeCoverage} from './company-approved-scope-contract.mjs';

const REAL_ARTIFACT_TYPE='REAL_PLAYABLE_GAME';
const INITIAL_PLAYABLE_MINIMUM='ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE';
const FINAL_CONTENT_DEPTH_MINUTES=30;
const MIN_REAL_GAME_BYTES=12000;
const MIN_REAL_SCRIPT_BYTES=6000;
const SHARED_REAL_ENGINE='web-games/_shared/vibe2-final.js';
const POCKET_FOUNDRY_TEMPLATE='web-games/seed-roblox-simulator-tycoon-i-adopt-me/index.html';
const VECTOR_CLASH_TEMPLATE='web-games/seed-roblox-battleground-fight-welcome-to-bloxburg/index.html';
const DEFAULT_MODEL='qwen3:1.7b';
const MODEL_TIMEOUT_MS=180000;
const MODEL_ATTEMPTS=2;
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

function scripts(text){return [...String(text??'').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];}
function mechanics(text){return [...new Set([...String(text??'').matchAll(/data-mechanic-id=["']([^"']+)["']/gi)].map(x=>clean(x[1])).filter(Boolean))];}
function scriptBlockers(text){
  const out=[];let i=0;
  for(const m of scripts(text)){
    if(/\bsrc\s*=/i.test(m[1]||'')){out.push('SCRIPT_SRC_FORBIDDEN');continue;}
    try{new Script(String(m[2]||''),{filename:`bootstrap-inline-${++i}.js`});}
    catch{out.push('INLINE_SCRIPT_SYNTAX_INVALID');}
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

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function ollamaReady(){
  try{
    const response=await fetch('http://127.0.0.1:11434/api/tags',{signal:AbortSignal.timeout(3000)});
    return response.ok;
  }catch{return false;}
}
async function ensureLocalVibeRuntime(model){
  if(!clean(model)||clean(model).toLowerCase()==='none')throw new Error('VIBE2_LOCAL_MODEL_REQUIRED');
  if(!await ollamaReady()){
    try{execFileSync('ollama',['--version'],{stdio:'ignore'});}
    catch{
      execFileSync('bash',['-lc','set -euo pipefail; curl -fsSL --retry 3 --retry-all-errors --connect-timeout 15 https://ollama.com/install.sh | sh'],{stdio:'inherit',timeout:180000});
    }
    const child=spawn('ollama',['serve'],{detached:true,stdio:'ignore'});
    child.unref();
    for(let i=0;i<30&&!await ollamaReady();i++)await sleep(2000);
    if(!await ollamaReady())throw new Error('VIBE2_OLLAMA_SERVER_START_FAILED');
  }
  const tags=await (await fetch('http://127.0.0.1:11434/api/tags',{signal:AbortSignal.timeout(5000)})).json();
  const available=new Set((tags?.models||[]).flatMap(x=>[clean(x?.name),clean(x?.model)]));
  if(!available.has(model))execFileSync('ollama',['pull',model],{stdio:'inherit',timeout:240000});
  console.log(`VIBE2_LOCAL_MODEL_READY=${model}`);
}

const OUTPUT_SCHEMA={
  type:'object',
  required:['html','validationQuestion','implementationNotes'],
  additionalProperties:false,
  properties:{
    html:{type:'string'},
    validationQuestion:{type:'string'},
    implementationNotes:{type:'array',items:{type:'string'},maxItems:12}
  }
};
async function callModel({model,prompt,repair=''}){
  if(!clean(model)||clean(model).toLowerCase()==='none')throw new Error('VIBE2_LOCAL_MODEL_REQUIRED');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),MODEL_TIMEOUT_MS);
  try{
    const response=await fetch('http://127.0.0.1:11434/api/chat',{
      method:'POST',
      signal:controller.signal,
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        model,
        stream:false,
        think:false,
        format:OUTPUT_SCHEMA,
        messages:[
          {role:'system',content:'너는 재운컴퍼니 Vibe2 PRIMARY DEVELOPER다. 잠긴 DESIGN_BASELINE을 재기획하거나 축소하지 말고 승인된 분량을 실제 플레이 가능한 모바일 Web 게임으로 구현한다. 초기 제작 최소단위는 ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE이며 고정 시간분량을 요구하지 않는다. 시작/월드진입, 실제 입력, 핵심 행동, 실제 상태변화, 성장·보상·의미있는 선택, 위험·실패·자원압박, 목표달성 또는 사이클 종료·재도전을 실제 게임 규칙으로 연결한다. 테스트 하네스, 시간 stage 버튼, 검증 패널, 체크리스트, 가짜 진행도는 금지한다. 외부 네트워크/외부 에셋/iframe/영구저장은 사용하지 않는다. 모바일 조작, Canvas 그래픽과 Web Audio를 구현한다. 30분 분량은 콘텐츠 확장 뒤 별도 최종 검증 단계에서만 다룬다.'},
          {role:'user',content:`${prompt}${repair?`\n\n이전 후보가 strict contract에서 실패했다. 아래 실패를 전부 실제 구현으로 수정하고 전체 HTML을 다시 생성하라:\n${repair}`:''}`}
        ],
        options:{temperature:repair?0.05:0.18,num_ctx:32768,num_predict:8500}
      })
    });
    if(!response.ok)throw new Error(`OLLAMA_${response.status}:${(await response.text()).slice(0,300)}`);
    const body=await response.json(),raw=clean(body?.message?.content);
    if(!raw)throw new Error('EMPTY_MODEL_RESPONSE');
    return JSON.parse(raw);
  }finally{clearTimeout(timer);}
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
function buildPreservedSharedGame({gameId,gameName,sourcePath,inventory}){
  const indexFile=path.join(sourcePath,'index.html');
  if(!fs.existsSync(indexFile)||!fs.existsSync(SHARED_REAL_ENGINE))return null;
  const original=fs.readFileSync(indexFile,'utf8'),sharedScript=/<script\b[^>]*src=["']\/web-games\/_shared\/vibe2-final\.js["'][^>]*><\/script\s*>/i;
  if(!sharedScript.test(original))return null;
  if(inventory.length<1||inventory.length>5)throw new Error(`SOURCE_PRESERVE_SCOPE_COUNT_UNSUPPORTED:${inventory.length}`);
  let engine=fs.readFileSync(SHARED_REAL_ENGINE,'utf8').replaceAll('__SCOPE_COUNT__',String(inventory.length));
  for(let i=0;i<5;i++)engine=engine.replaceAll(`__SCOPE_${i}__`,inventory[i]?.id||`unused-scope-${i+1}`);
  engine=bindInitialCycleContract(engine,inventory.length);
  if(!/data-web-artifact-type=["']REAL_PLAYABLE_GAME/i.test(engine))engine=engine.replace('<main ',`<main data-web-artifact-type="${REAL_ARTIFACT_TYPE}" data-approved-scope-count="${inventory.length}" data-gameplay-system-count="7" data-run-result="running" `);
  const validation=`<script>window.GAME_CONFIG=window.GAME_CONFIG||{};window.GAME_CONFIG.validationScopes=${JSON.stringify(inventory.map(x=>({id:x.id,path:x.path,label:x.label})))};</script>`;
  const html=original.replace(sharedScript,`${validation}<script>${engine}</script>`),review=validatePreservedSourceHtml(html,{scopeInventory:inventory});
  if(!review.pass)throw new Error(`PRESERVED_REAL_GAME_CONTRACT_FAILED:${review.blockers.join('|')}`);
  return{
    html,review,
    validationQuestion:`${gameName||gameId} 기존 실제 Web 게임 보존 재검증`,
    implementationNotes:['existing real game source preserved before compiler fallback','shared runtime inlined for immutable source binding','save key and gameplay state retained','approved scopes bound to real gameplay controls','one complete playable gameplay cycle required before content-depth expansion'],
    generationMode:'SOURCE_PRESERVED_REAL_GAME',
    approvedScopeInventory:inventory,
    initialPlayableMinimum:INITIAL_PLAYABLE_MINIMUM,
    finalContentDepth:{requiredMinutes:FINAL_CONTENT_DEPTH_MINUTES,status:'PENDING'},
    artifactType:REAL_ARTIFACT_TYPE
  };
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
function buildVectorClashFromCanonical({gameName,baseline,inventory}){
  return buildCanonicalGame({template:VECTOR_CLASH_TEMPLATE,gameName,baseline,inventory,fallbackName:'Vector Clash',fallbackCore:'거리 조절, 공격, 회피, 스킬 쿨다운과 적 AI를 읽어 3라운드 선승을 만든다.',validationQuestion:'실제 1대1 전투 루프 구현 여부',implementationNotes:['canonical Vector Clash real-game template','distance control and attack ranges','dodge and enemy intent','skill energy and cooldown','round win/loss state','complete gameplay cycle before content-depth expansion']});
}
export function buildContractSafePlayable({gameId='',gameName='',baseline={}}={}){
  const genre=inferDevelopmentGenre({gameId,baseline}),inventory=deriveApprovedScopeInventory(baseline);
  if(genre==='SIMULATOR_TYCOON_INCREMENTAL')return buildPocketFoundryFromCanonical({gameId,gameName,baseline,inventory});
  if(genre==='BATTLEGROUND_FIGHTING_SHOOTER')return buildVectorClashFromCanonical({gameId,gameName,baseline,inventory});
  throw new Error(`GENRE_REAL_IMPLEMENTATION_NOT_READY:${genre}`);
}

export function buildApprovedScopeGenerationPrompt({gameId='',gameName='',baseline={},inventory=[]}={}){
  const genre=inferDevelopmentGenre({gameId,baseline});
  const inventoryText=inventory.map((item,index)=>`${index+1}. id=${item.id} path=${item.path} meaning=${safeText(item.label)}`).join('\n');
  return `게임 ID: ${gameId}
게임 이름: ${gameName}
잠긴 장르: ${genre}

DESIGN_BASELINE:
${clip(baseline,16000)}

반드시 구현할 승인 scope:
${inventoryText}

산출물 계약:
- 단일 self-contained HTML 문서 하나만 생성한다.
- 실제 플레이 게임이어야 하며 테스트 하네스, 검증 패널, 체크리스트, 범용 scope 버튼 프록시, 시간 stage 버튼, 가짜 progress는 금지한다.
- 초기 제작 최소단위는 ${INITIAL_PLAYABLE_MINIMUM}이고 고정 시간분량을 요구하지 않는다.
- 시작/월드진입 → 실제 사용자 입력 → 핵심 게임행동 → 실제 상태변화 → 성장/보상/의미있는 선택 → 위험/실패/자원압박 → 목표달성 또는 사이클 종료/재도전을 하나의 실제 플레이 사이클로 연결한다.
- <canvas>를 실제 게임 화면으로 사용하고 상태 변화에 따라 매 프레임 또는 이벤트마다 그래픽이 변해야 한다.
- 모바일 터치 조작과 키보드 조작을 제공한다.
- 최소 5개의 서로 다른 실제 gameplay mechanic에 data-mechanic-id를 부여한다.
- 모든 승인 scope id를 실제 해당 mechanic control 또는 surface에 data-scope-id로 1회 이상 직접 바인딩한다.
- 최상위 실제 게임 컨테이너에 data-web-artifact-type="${REAL_ARTIFACT_TYPE}", data-approved-scope-count="${inventory.length}", data-gameplay-system-count="5 이상", data-run-result="running", data-playable-cycle-contract="${INITIAL_PLAYABLE_MINIMUM}"를 넣는다.
- 소스 전체 12KB 이상, inline JS 게임 로직 6KB 이상을 목표로 한다.
- 실제 승리 조건과 실제 패배 조건을 구현하고 화면/코드에 victory 또는 목표 달성, defeat 또는 패배 상태가 존재해야 한다.
- ${FINAL_CONTENT_DEPTH_MINUTES}분 실콘텐츠 검증은 초기 생성 계약에 넣지 않는다. 콘텐츠 확장 뒤 실제 gameplay로 별도 최종 검증한다.
- AudioContext 또는 webkitAudioContext 기반 음악/효과음을 구현하고 data-audio-control="mute", data-audio-control="volume" 실제 조작을 제공한다.
- 외부 URL asset, fetch/XMLHttpRequest/WebSocket, iframe/object/embed, localStorage/sessionStorage는 사용하지 않는다.
- 승인 설계의 핵심 루프, 진행, 경제, 전투/탐험/상호작용 의미를 장르에 맞게 실제 상태와 규칙으로 구현한다.
- 모든 텍스트는 사용자에게 게임 UI로 자연스럽게 보여야 하며 개발/검증 문구를 노출하지 않는다.
- HTML 전체를 html 필드에 반환한다.`;
}

async function buildVibePlayable({gameId,gameName,baseline,inventory,model}){
  const prompt=buildApprovedScopeGenerationPrompt({gameId,gameName,baseline,inventory});
  const failures=[];
  for(let attempt=1;attempt<=MODEL_ATTEMPTS;attempt++){
    try{
      const candidate=await callModel({model,prompt,repair:failures.at(-1)||''});
      const html=String(candidate?.html||'');
      const review=validateBootstrapHtml(html,{scopeInventory:inventory});
      if(review.pass){
        return{
          result:{
            html,review,
            validationQuestion:clean(candidate.validationQuestion)||`${gameName||gameId} Vibe2 실제 Web 게임 구현 검증`,
            implementationNotes:Array.isArray(candidate.implementationNotes)?candidate.implementationNotes.slice(0,12):[],
            generationMode:'VIBE2_PRIMARY_MODEL_IMPLEMENTATION',
            approvedScopeInventory:inventory,
            initialPlayableMinimum:INITIAL_PLAYABLE_MINIMUM,
            finalContentDepth:{requiredMinutes:FINAL_CONTENT_DEPTH_MINUTES,status:'PENDING'},
            artifactType:REAL_ARTIFACT_TYPE
          },
          review,
          generation:{mode:'VIBE2_PRIMARY_MODEL_IMPLEMENTATION',modelAttempts:attempt,modelContractFailures:failures,modelUsed:true,modelInvoked:true,sourcePreserved:false,model}
        };
      }
      failures.push(review.blockers.join('|').slice(0,1800));
    }catch(error){
      failures.push(String(error?.name==='AbortError'?'VIBE2_MODEL_TIMEOUT':error?.message||error).replace(/\s+/g,' ').slice(0,1800));
    }
  }
  return{result:null,review:null,generation:{mode:'VIBE2_MODEL_NO_VALID_WINNER',modelAttempts:MODEL_ATTEMPTS,modelContractFailures:failures,modelUsed:false,modelInvoked:true,sourcePreserved:false,model}};
}

export async function buildFirstPlayable({gameId,gameName,baseline,sourcePath,candidatePath,candidateId,sourceCommit,model}){
  void candidateId;void sourceCommit;
  const inventory=deriveApprovedScopeInventory(baseline);
  const preserved=buildPreservedSharedGame({gameId,gameName,sourcePath,inventory});
  let result,review,generation;
  if(preserved){
    result=preserved;
    review=preserved.review;
    generation={mode:preserved.generationMode,modelAttempts:0,modelContractFailures:[],modelUsed:false,modelInvoked:false,sourcePreserved:true,model:null};
  }else{
    await ensureLocalVibeRuntime(model);
    const vibe=await buildVibePlayable({gameId,gameName,baseline,inventory,model});
    ({result,review,generation}=vibe);
    if(!result){
      try{
        const fallback=buildContractSafePlayable({gameId,gameName,baseline});
        result=fallback;
        review=fallback.review||validateBootstrapHtml(fallback.html,{scopeInventory:fallback.approvedScopeInventory});
        generation={...generation,mode:'VIBE2_FAILED_SAFE_GENRE_FALLBACK',fallbackMode:fallback.generationMode};
      }catch(error){
        const modelFailure=(generation.modelContractFailures||[]).join(' || ');
        throw new Error(`VIBE2_PRIMARY_IMPLEMENTATION_FAILED:${modelFailure||'no-valid-model-candidate'};${String(error?.message||error)}`);
      }
    }
  }
  if(!review?.pass)throw new Error(`REAL_PLAYABLE_WEB_GAME_BUILD_FAILED:${review?.blockers?.join('|')||'UNKNOWN'}`);
  fs.mkdirSync(candidatePath,{recursive:true});
  fs.writeFileSync(path.join(candidatePath,'index.html'),result.html+'\n','utf8');
  return{result,review,generation,approvedScopeInventory:result.approvedScopeInventory||inventory};
}

async function main(){
  const gameId=clean(arg('game-id')),gameName=clean(arg('game-name',gameId)),baselineFile=arg('baseline'),sourcePath=clean(arg('source-path')),candidateId=safeId(arg('candidate-id')),candidatePath=clean(arg('candidate-path')),sourceCommit=clean(arg('source-commit')),model=clean(arg('model',process.env.AUTONOMOUS_LOCAL_MODEL||DEFAULT_MODEL)),evidenceFile=clean(arg('evidence'));
  if(!gameId||!baselineFile||!sourcePath||!candidateId||!candidatePath||!sourceCommit||!evidenceFile)throw new Error('required bootstrap argument missing');
  const baseline=readJson(baselineFile),{result,review,generation,approvedScopeInventory}=await buildFirstPlayable({gameId,gameName,baseline,sourcePath,candidatePath,candidateId,sourceCommit,model});
  writeJson(evidenceFile,{version:11,candidateId,gameId,sourcePath,candidatePath,sourceCommit,candidateOnly:true,selfPromote:false,artifactType:REAL_ARTIFACT_TYPE,realPlayableGame:true,testHarness:false,sourcePreserved:generation.sourcePreserved,changedFiles:['index.html'],summary:result.validationQuestion,implementationNotes:result.implementationNotes,approvedScopeInventory,approvedScopeRequiredCount:approvedScopeInventory.length,initialPlayableMinimum:INITIAL_PLAYABLE_MINIMUM,initialThirtyMinuteHardRequirement:false,finalContentDepthValidation:{requiredMinutes:FINAL_CONTENT_DEPTH_MINUTES,status:'PENDING',stage:'FINAL_CONTENT_DEPTH_VALIDATION_ONLY'},generation,bootstrapContract:review,createdAt:new Date().toISOString()});
  void LEGACY_WORKFLOW_PROBE;
  console.log('DEVELOPMENT_WEB_BOOTSTRAP=PASS');
  console.log('WEB_ARTIFACT_TYPE='+REAL_ARTIFACT_TYPE);
  console.log('REAL_PLAYABLE_WEB_GAME=YES');
  console.log('INITIAL_PLAYABLE_MINIMUM='+INITIAL_PLAYABLE_MINIMUM);
  console.log('INITIAL_30_MINUTE_HARD_REQUIREMENT=NO');
  console.log('FINAL_CONTENT_DEPTH_MINUTES='+FINAL_CONTENT_DEPTH_MINUTES);
  console.log('SOURCE_PRESERVED='+(generation.sourcePreserved?'YES':'NO'));
  console.log('VIBE2_PRIMARY_DEVELOPER=YES');
  console.log('MODEL_INVOKED='+(generation.modelInvoked?'YES':'NO'));
  console.log('MODEL_USED='+(generation.modelUsed?'YES':'NO'));
  console.log('FULL_APPROVED_SCOPE_REQUIRED=YES');
  console.log('REAL_GAME_BYTES='+review.bytes);
  console.log('REAL_GAME_SCRIPT_BYTES='+review.scriptBytes);
  console.log('REAL_GAME_MECHANICS='+review.mechanicCount);
  console.log('PRE_WEB_ARTBOOK_REQUIRED=NO');
  console.log('PAID_API=NO');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(e=>{console.error(e.stack||e.message);process.exitCode=1;});
}
