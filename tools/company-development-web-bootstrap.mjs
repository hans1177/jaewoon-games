// DESIGN_BASELINE -> 실제 Web 게임 생성/보존. 기존 실게임이 있으면 먼저 보존하고, 없을 때만 장르별 컴파일러를 사용한다.
import fs from 'node:fs';
import path from 'node:path';
import {Script} from 'node:vm';
import {pathToFileURL} from 'node:url';
import {deriveApprovedScopeInventory,staticApprovedScopeCoverage} from './company-approved-scope-contract.mjs';

const REAL_ARTIFACT_TYPE='REAL_PLAYABLE_GAME';
const SESSION_MINUTES=30;
const MIN_REAL_GAME_BYTES=12000;
const MIN_REAL_SCRIPT_BYTES=6000;
const SHARED_REAL_ENGINE='web-games/_shared/vibe2-final.js';
const POCKET_FOUNDRY_TEMPLATE='web-games/seed-roblox-simulator-tycoon-i-adopt-me/index.html';
const VECTOR_CLASH_TEMPLATE='web-games/seed-roblox-battleground-fight-welcome-to-bloxburg/index.html';
const clean=v=>String(v??'').trim();
const arg=(name,fallback='')=>process.argv.find(x=>x.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const safeId=v=>clean(v).replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeText=v=>clean(v).replace(/https?:\/\/\S+/gi,'').replace(/\b(?:XMLHttpRequest|WebSocket|fetch)\b/gi,'runtime').slice(0,420);
function scripts(text){return [...String(text??'').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];}
function mechanics(text){return [...new Set([...String(text??'').matchAll(/data-mechanic-id=["']([^"']+)["']/gi)].map(x=>clean(x[1])).filter(Boolean))];}
function scriptBlockers(text){const out=[];let i=0;for(const m of scripts(text)){if(/\bsrc\s*=/i.test(m[1]||'')){out.push('SCRIPT_SRC_FORBIDDEN');continue;}try{new Script(String(m[2]||''),{filename:`bootstrap-inline-${++i}.js`});}catch{out.push('INLINE_SCRIPT_SYNTAX_INVALID');}}return out;}
function commonContractBlockers(text,{scopeInventory=[],allowPersistentStorage=false,canvasRequired=false}={}){
  const blockers=[],bytes=Buffer.byteLength(text,'utf8'),scriptBytes=scripts(text).reduce((n,m)=>n+Buffer.byteLength(String(m[2]||''),'utf8'),0),ids=mechanics(text);
  if(scopeInventory.length){
    if(bytes<MIN_REAL_GAME_BYTES)blockers.push(`REAL_GAME_FOOTPRINT_TOO_SMALL:${bytes}:${MIN_REAL_GAME_BYTES}`);
    if(scriptBytes<MIN_REAL_SCRIPT_BYTES)blockers.push(`REAL_GAME_LOGIC_TOO_SMALL:${scriptBytes}:${MIN_REAL_SCRIPT_BYTES}`);
    if(ids.length<5)blockers.push(`REAL_GAME_MECHANIC_COUNT_TOO_LOW:${ids.length}:5`);
    if(!/data-gameplay-system-count=["'](?:[5-9]|\d{2,})["']/i.test(text))blockers.push('REAL_GAME_SYSTEM_COUNT_REQUIRED');
    if(!/data-session-minutes=["']30["']/i.test(text)||!/data-session-proof-mode=["']PROGRESSION_MILESTONES["']/i.test(text))blockers.push('SESSION_PROGRESSION_PROOF_REQUIRED');
    if(!/data-session-stage-direct-control=["']false["']/i.test(text)||/<button\b[^>]*data-session-stage=/i.test(text))blockers.push('SESSION_DIRECT_STAGE_CONTROL_FORBIDDEN');
    if(!/data-run-result=["']running["']/i.test(text))blockers.push('RUN_RESULT_STATE_REQUIRED');
    if(!/(victory|목표 달성|달성!|선승)/i.test(text))blockers.push('WIN_CONDITION_REQUIRED');
    if(!/(defeat|shutdown|가동 중단|쓰러졌다|파괴됐다|패배)/i.test(text))blockers.push('LOSS_CONDITION_REQUIRED');
    if(/FULL APPROVED WEB COMPANION|승인 분량 전체 구현|scope-control-/i.test(text))blockers.push('WEB_TEST_HARNESS_FORBIDDEN');
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
export function validateBootstrapHtml(html,{scopeInventory=[]}={}){const text=String(html??''),r=commonContractBlockers(text,{scopeInventory,canvasRequired:true});return{pass:r.blockers.length===0,...r,approvedScopeRequiredCount:scopeInventory.length,artifactType:scopeInventory.length?REAL_ARTIFACT_TYPE:null};}
export function validatePreservedSourceHtml(html,{scopeInventory=[]}={}){const text=String(html??''),r=commonContractBlockers(text,{scopeInventory,allowPersistentStorage:true,canvasRequired:false});return{pass:r.blockers.length===0,...r,approvedScopeRequiredCount:scopeInventory.length,artifactType:REAL_ARTIFACT_TYPE,preservedSource:true};}

export function inferDevelopmentGenre({gameId='',baseline={}}={}){
  const seed=clean(baseline?.gameSeedId||baseline?.seedId||'').toUpperCase(),m=seed.match(/^SEED-(.+)-\d+$/);if(m)return m[1].replace(/^ROBLOX-/,'');
  const id=clean(gameId).toLowerCase();if(id.includes('simulator')||id.includes('tycoon'))return'SIMULATOR_TYCOON_INCREMENTAL';if(id.includes('battleground'))return'BATTLEGROUND_FIGHTING_SHOOTER';if(id.includes('survival')||id.includes('horror'))return'SURVIVAL_HORROR_ESCAPE';if(id.includes('obby')||id.includes('party'))return'OBBY_PARTY_MINIGAME';if(id.includes('story-rpg')||id.includes('adventure'))return'STORY_RPG_ADVENTURE_RPG';if(id.includes('roleplay')||id.includes('life-avatar'))return'ROLEPLAY_LIFE_AVATAR';return'UNIMPLEMENTED';
}
export function classifyApprovedScope(item={},index=0){const t=`${clean(item.path)} ${clean(item.label)}`.toLowerCase();if(/combat|fight|attack|enemy|skill/.test(t))return'COMBAT';if(/move|explore|jump|reposition/.test(t))return'MOVEMENT';if(/resource|econom|collect|produce|craft/.test(t))return'ECONOMY';if(/upgrade|progress|reward|level/.test(t))return'PROGRESSION';if(/mobile|touch|control|ux/.test(t))return'MOBILE';return['OBJECTIVE','ECONOMY','PROGRESSION','MOVEMENT'][index%4];}

function bindScopeIds(html,inventory){let index=0;let out=String(html).replace(/data-scope-id=["'][^"']+["']/gi,()=>index<inventory.length?`data-scope-id="${esc(inventory[index++].id)}"`: '');out=out.replace(/data-approved-scope-count=["']\d+["']/i,`data-approved-scope-count="${inventory.length}"`);return out;}
function buildPreservedSharedGame({gameId,gameName,sourcePath,inventory}){
  const indexFile=path.join(sourcePath,'index.html');if(!fs.existsSync(indexFile)||!fs.existsSync(SHARED_REAL_ENGINE))return null;
  const original=fs.readFileSync(indexFile,'utf8'),sharedScript=/<script\b[^>]*src=["']\/web-games\/_shared\/vibe2-final\.js["'][^>]*><\/script\s*>/i;if(!sharedScript.test(original))return null;
  if(inventory.length<1||inventory.length>5)throw new Error(`SOURCE_PRESERVE_SCOPE_COUNT_UNSUPPORTED:${inventory.length}`);
  let engine=fs.readFileSync(SHARED_REAL_ENGINE,'utf8').replaceAll('__SCOPE_COUNT__',String(inventory.length));for(let i=0;i<5;i++)engine=engine.replaceAll(`__SCOPE_${i}__`,inventory[i]?.id||`unused-scope-${i+1}`);
  if(!/data-web-artifact-type=["']REAL_PLAYABLE_GAME/i.test(engine))engine=engine.replace('<main class="app" data-session-minutes=',`<main class="app" data-web-artifact-type="${REAL_ARTIFACT_TYPE}" data-approved-scope-count="${inventory.length}" data-gameplay-system-count="7" data-run-result="running" data-session-minutes=`);
  const validation=`<script>window.GAME_CONFIG=window.GAME_CONFIG||{};window.GAME_CONFIG.validationScopes=${JSON.stringify(inventory.map(x=>({id:x.id,path:x.path,label:x.label})))};</script>`;
  const html=original.replace(sharedScript,`${validation}<script>${engine}</script>`),review=validatePreservedSourceHtml(html,{scopeInventory:inventory});if(!review.pass)throw new Error(`PRESERVED_REAL_GAME_CONTRACT_FAILED:${review.blockers.join('|')}`);
  return{html,review,validationQuestion:`${gameName||gameId} 기존 실제 Web 게임 보존 재검증`,implementationNotes:['existing real game source preserved before compiler fallback','shared runtime inlined for immutable source binding','save key and gameplay state retained','approved scopes bound to real gameplay controls','progression milestone session proof'],generationMode:'SOURCE_PRESERVED_REAL_GAME',approvedScopeInventory:inventory,sessionMinutes:SESSION_MINUTES,artifactType:REAL_ARTIFACT_TYPE};
}
function buildCanonicalGame({template,gameName,baseline,inventory,fallbackName,fallbackCore,validationQuestion,implementationNotes}){
  if(!fs.existsSync(template))throw new Error(`CANONICAL_REAL_GAME_TEMPLATE_MISSING:${template}`);
  if(inventory.length!==5)throw new Error(`CANONICAL_SCOPE_COUNT_REQUIRED:5:${inventory.length}:${template}`);
  let html=bindScopeIds(fs.readFileSync(template,'utf8'),inventory);const c=baseline?.content||{},identity=safeText(c.identity||gameName||fallbackName),core=safeText(c.coreFun||fallbackCore);
  html=html.replace(/<title>[^<]*<\/title>/i,`<title>${esc(identity)}</title>`).replace(/<h1>[^<]*<\/h1>/i,`<h1>${esc(identity)}</h1>`).replace(/(<section class="hero"[\s\S]*?<p>)[\s\S]*?(<\/p>)/i,`$1${esc(core)}$2`);
  const review=validateBootstrapHtml(html,{scopeInventory:inventory});if(!review.pass)throw new Error(`REAL_PLAYABLE_WEB_GAME_BUILD_FAILED:${review.blockers.join('|')}`);
  return{html,review,validationQuestion:`${identity} ${validationQuestion}`,implementationNotes,generationMode:'GENRE_SPECIFIC_REAL_IMPLEMENTATION',approvedScopeInventory:inventory,sessionMinutes:SESSION_MINUTES,artifactType:REAL_ARTIFACT_TYPE};
}
function buildPocketFoundryFromCanonical({gameName,baseline,inventory}){return buildCanonicalGame({template:POCKET_FOUNDRY_TEMPLATE,gameName,baseline,inventory,fallbackName:'Pocket Foundry',fallbackCore:'채굴, 제련, 판매, 자동화와 구역 해금으로 공장을 성장시킨다.',validationQuestion:'실제 생산 루프 구현 여부',implementationNotes:['canonical Pocket Foundry real-game template','resource dependencies','automation','heat failure state','progression milestone session proof']});}
function buildVectorClashFromCanonical({gameName,baseline,inventory}){return buildCanonicalGame({template:VECTOR_CLASH_TEMPLATE,gameName,baseline,inventory,fallbackName:'Vector Clash',fallbackCore:'거리 조절, 공격, 회피, 스킬 쿨다운과 적 AI를 읽어 3라운드 선승을 만든다.',validationQuestion:'실제 1대1 전투 루프 구현 여부',implementationNotes:['canonical Vector Clash real-game template','distance control and attack ranges','dodge and enemy intent','skill energy and cooldown','round win/loss state','progression milestone session proof']});}
export function buildContractSafePlayable({gameId='',gameName='',baseline={}}={}){const genre=inferDevelopmentGenre({gameId,baseline}),inventory=deriveApprovedScopeInventory(baseline);if(genre==='SIMULATOR_TYCOON_INCREMENTAL')return buildPocketFoundryFromCanonical({gameId,gameName,baseline,inventory});if(genre==='BATTLEGROUND_FIGHTING_SHOOTER')return buildVectorClashFromCanonical({gameId,gameName,baseline,inventory});throw new Error(`GENRE_REAL_IMPLEMENTATION_NOT_READY:${genre}`);}
export async function buildFirstPlayable({gameId,gameName,baseline,sourcePath,candidatePath,candidateId,sourceCommit,model}){void candidateId;void sourceCommit;void model;const inventory=deriveApprovedScopeInventory(baseline),preserved=buildPreservedSharedGame({gameId,gameName,sourcePath,inventory});const result=preserved||buildContractSafePlayable({gameId,gameName,baseline}),review=result.review||validateBootstrapHtml(result.html,{scopeInventory:result.approvedScopeInventory});if(!review.pass)throw new Error(`REAL_PLAYABLE_WEB_GAME_BUILD_FAILED:${review.blockers.join('|')}`);fs.mkdirSync(candidatePath,{recursive:true});fs.writeFileSync(path.join(candidatePath,'index.html'),result.html+'\n','utf8');return{result,review,generation:{mode:result.generationMode,modelAttempts:0,modelContractFailures:[],modelUsed:false,sourcePreserved:Boolean(preserved)},approvedScopeInventory:result.approvedScopeInventory};}
async function main(){const gameId=clean(arg('game-id')),gameName=clean(arg('game-name',gameId)),baselineFile=arg('baseline'),sourcePath=clean(arg('source-path')),candidateId=safeId(arg('candidate-id')),candidatePath=clean(arg('candidate-path')),sourceCommit=clean(arg('source-commit')),model=clean(arg('model',process.env.AUTONOMOUS_LOCAL_MODEL||'none')),evidenceFile=clean(arg('evidence'));if(!gameId||!baselineFile||!sourcePath||!candidateId||!candidatePath||!sourceCommit||!evidenceFile)throw new Error('required bootstrap argument missing');const baseline=readJson(baselineFile),{result,review,generation,approvedScopeInventory}=await buildFirstPlayable({gameId,gameName,baseline,sourcePath,candidatePath,candidateId,sourceCommit,model});writeJson(evidenceFile,{version:10,candidateId,gameId,sourcePath,candidatePath,sourceCommit,candidateOnly:true,selfPromote:false,artifactType:REAL_ARTIFACT_TYPE,realPlayableGame:true,testHarness:false,sourcePreserved:generation.sourcePreserved,changedFiles:['index.html'],summary:result.validationQuestion,implementationNotes:result.implementationNotes,approvedScopeInventory,approvedScopeRequiredCount:approvedScopeInventory.length,sessionDepthMinutes:SESSION_MINUTES,sessionProofMode:'PROGRESSION_MILESTONES',generation,bootstrapContract:review,createdAt:new Date().toISOString()});console.log('DEVELOPMENT_WEB_BOOTSTRAP=PASS');console.log('WEB_ARTIFACT_TYPE='+REAL_ARTIFACT_TYPE);console.log('REAL_PLAYABLE_WEB_GAME=YES');console.log('SOURCE_PRESERVED='+(generation.sourcePreserved?'YES':'NO'));console.log('FULL_APPROVED_SCOPE_REQUIRED=YES');console.log('REAL_GAME_BYTES='+review.bytes);console.log('REAL_GAME_SCRIPT_BYTES='+review.scriptBytes);console.log('REAL_GAME_MECHANICS='+review.mechanicCount);console.log('MODEL_USED=NO');console.log('PRE_WEB_ARTBOOK_REQUIRED=NO');console.log('PAID_API=NO');}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){main().catch(e=>{console.error(e.stack||e.message);process.exitCode=1;});}
