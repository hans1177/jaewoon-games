// 파일명: tools/company-development-web-bootstrap.mjs
// 잠긴 DESIGN_BASELINE의 승인 분량 전체를 모바일 Web companion으로 구현하고 검증 후보를 만든다.
import fs from 'node:fs';
import path from 'node:path';
import {Script} from 'node:vm';
import {pathToFileURL} from 'node:url';
import {deriveApprovedScopeInventory,staticApprovedScopeCoverage} from './company-approved-scope-contract.mjs';

const clean=value=>String(value??'').trim();
const arg=(name,fallback='')=>process.argv.find(x=>x.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clip=(value,max=18000)=>{const text=typeof value==='string'?value:JSON.stringify(value);return text.length>max?text.slice(0,max):text;};
const safeId=value=>clean(value).replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120);
const htmlEscape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const safeDesignText=value=>clean(value).replace(/https?:\/\/\S+/gi,'').replace(/\b(?:localStorage|sessionStorage|XMLHttpRequest|WebSocket|fetch)\b/gi,'runtime').slice(0,260);
const boundedNumber=(value,min=-30,max=30)=>Math.max(min,Math.min(max,Number.isFinite(Number(value))?Number(value):0));

function inlineScriptBlockers(text){
  const blockers=[];
  const matcher=/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let match,index=0;
  while((match=matcher.exec(text))){
    const attrs=String(match[1]||'');
    if(/\bsrc\s*=/i.test(attrs)){blockers.push('SCRIPT_SRC_FORBIDDEN');continue;}
    const type=attrs.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase()||'';
    if(type&&type!=='text/javascript'&&type!=='application/javascript'){blockers.push('INLINE_SCRIPT_TYPE_UNSUPPORTED');continue;}
    index+=1;
    try{new Script(String(match[2]||''),{filename:`bootstrap-inline-${index}.js`});}catch{blockers.push('INLINE_SCRIPT_SYNTAX_INVALID');}
  }
  return blockers;
}

export function validateBootstrapHtml(html,{scopeInventory=[]}={}){
  const text=String(html??'');
  const blockers=[];
  if(Buffer.byteLength(text,'utf8')<1800)blockers.push('HTML_TOO_SMALL');
  if(Buffer.byteLength(text,'utf8')>320000)blockers.push('HTML_TOO_LARGE');
  if(!/<(?:!doctype\s+html|html)[\s>]/i.test(text))blockers.push('HTML_DOCUMENT_REQUIRED');
  if(!/<meta\b[^>]*name=["']viewport["'][^>]*content=["'][^"']*width=device-width/i.test(text))blockers.push('MOBILE_VIEWPORT_REQUIRED');
  if(!/<script[\s>]/i.test(text))blockers.push('SCRIPT_REQUIRED');
  if(!/(<button\b|<canvas\b|role=["']button["'])/i.test(text))blockers.push('INTERACTIVE_SURFACE_REQUIRED');
  if(!/(addEventListener\s*\(|onclick\s*=)/i.test(text))blockers.push('INPUT_HANDLER_REQUIRED');
  if(!/(score|health|hp|turn|wave|resource|progress|energy|state|status|combo|level)/i.test(text))blockers.push('VISIBLE_GAME_STATE_REQUIRED');
  if(!/(AudioContext|webkitAudioContext)/.test(text))blockers.push('MUSIC_RUNTIME_REQUIRED');
  if(!/data-audio-state=["'][^"']+["']/.test(text))blockers.push('MUSIC_RUNTIME_STATE_REQUIRED');
  if(!/data-audio-control=["']mute["']/.test(text))blockers.push('MUSIC_MUTE_CONTROL_REQUIRED');
  if(!/data-audio-control=["']volume["']/.test(text))blockers.push('MUSIC_VOLUME_CONTROL_REQUIRED');
  if(/<(?:audio|video)\b[^>]*\bautoplay\b/i.test(text))blockers.push('AUDIO_AUTOPLAY_FORBIDDEN');
  if(/\b(?:localStorage|sessionStorage)\b/.test(text))blockers.push('PERSISTENT_STORAGE_FORBIDDEN_ON_BOOTSTRAP');
  if(/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(text))blockers.push('NETWORK_API_FORBIDDEN');
  if(/<(?:iframe|object|embed)\b/i.test(text))blockers.push('EMBED_FORBIDDEN');
  if(/(?:src|href)\s*=\s*["']https?:\/\//i.test(text))blockers.push('EXTERNAL_ASSET_FORBIDDEN');
  blockers.push(...inlineScriptBlockers(text));
  if(scopeInventory.length)blockers.push(...staticApprovedScopeCoverage(text,scopeInventory).blockers);
  return {pass:blockers.length===0,blockers:[...new Set(blockers)],bytes:Buffer.byteLength(text,'utf8'),approvedScopeRequiredCount:scopeInventory.length};
}

export function inferDevelopmentGenre({gameId='',baseline={}}={}){
  const seed=clean(baseline?.gameSeedId||baseline?.seedId||'').toUpperCase();
  const match=seed.match(/^SEED-(.+)-\d+$/);
  if(match)return match[1];
  const id=clean(gameId).toLowerCase();
  if(id.includes('action-survival'))return 'ACTION_SURVIVAL_ROGUELITE';
  if(id.includes('single-defense'))return 'SINGLE_DEFENSE_STRATEGY';
  if(id.includes('puzzle'))return 'PUZZLE';
  if(id.includes('idle-growth'))return 'IDLE_GROWTH_RPG';
  if(id.includes('story-complete'))return 'STORY_COMPLETE_RPG';
  if(id.includes('battleground'))return 'BATTLEGROUND_FIGHTING_SHOOTER';
  if(id.includes('survival-horror'))return 'SURVIVAL_HORROR_ESCAPE';
  if(id.includes('obby'))return 'OBBY_PARTY_MINIGAME';
  if(id.includes('simulator'))return 'SIMULATOR_TYCOON_INCREMENTAL';
  if(id.includes('story-rpg'))return 'STORY_RPG_ADVENTURE_RPG';
  return 'CASUAL';
}

function genreConfig(genre){
  const configs={
    ACTION_SURVIVAL_ROGUELITE:{tag:'생존 전투',accent:'위협을 피하고 공격해 웨이브를 버틴다',initial:{score:0,hp:100,wave:1,resource:0,progress:0,position:0,cooldown:0,objective:0},notes:[164.8,196,220]},
    SINGLE_DEFENSE_STRATEGY:{tag:'방어 전략',accent:'자원을 배치와 강화에 써서 다음 웨이브를 막는다',initial:{score:0,hp:100,wave:1,resource:30,progress:0,position:0,cooldown:0,objective:0},notes:[130.8,164.8,196]},
    PUZZLE:{tag:'퍼즐',accent:'제한된 수 안에서 조합을 만들고 콤보를 이어간다',initial:{score:0,hp:12,wave:1,resource:0,progress:0,position:0,cooldown:0,objective:0},notes:[261.6,329.6,392]},
    IDLE_GROWTH_RPG:{tag:'성장 RPG',accent:'보상을 회수하고 성장시킨 뒤 더 높은 스테이지에 도전한다',initial:{score:0,hp:100,wave:1,resource:20,progress:0,position:0,cooldown:0,objective:0},notes:[146.8,174.6,220]},
    STORY_COMPLETE_RPG:{tag:'스토리 RPG',accent:'탐험과 선택, 전투를 통해 목표를 완수한다',initial:{score:0,hp:100,wave:1,resource:3,progress:0,position:0,cooldown:0,objective:0},notes:[174.6,220,261.6]},
    BATTLEGROUND_FIGHTING_SHOOTER:{tag:'대전 전투',accent:'이동, 공격, 스킬과 쿨다운 판단으로 상대보다 유리한 교전을 만든다',initial:{score:0,hp:100,wave:1,resource:3,progress:0,position:0,cooldown:0,objective:0},notes:[146.8,196,246.9]},
    SURVIVAL_HORROR_ESCAPE:{tag:'생존 탈출',accent:'위협을 읽고 탐색과 회피를 반복해 탈출 목표를 진행한다',initial:{score:0,hp:100,wave:1,resource:2,progress:0,position:0,cooldown:0,objective:0},notes:[110,146.8,196]},
    OBBY_PARTY_MINIGAME:{tag:'오비 미니게임',accent:'정밀 이동과 타이밍으로 장애물을 통과하고 체크포인트를 잇는다',initial:{score:0,hp:3,wave:1,resource:0,progress:0,position:0,cooldown:0,objective:0},notes:[220,277.2,329.6]},
    SIMULATOR_TYCOON_INCREMENTAL:{tag:'시뮬레이터 성장',accent:'행동으로 자원을 벌고 투자해 생산과 진행 속도를 높인다',initial:{score:0,hp:100,wave:1,resource:10,progress:0,position:0,cooldown:0,objective:0},notes:[174.6,220,293.7]},
    STORY_RPG_ADVENTURE_RPG:{tag:'모험 RPG',accent:'탐험, 전투, 선택과 성장으로 다음 목표를 연다',initial:{score:0,hp:100,wave:1,resource:3,progress:0,position:0,cooldown:0,objective:0},notes:[164.8,220,261.6]},
    CASUAL:{tag:'캐주얼',accent:'짧은 입력으로 점수와 진행도를 올리고 즉시 다음 선택을 한다',initial:{score:0,hp:100,wave:1,resource:0,progress:0,position:0,cooldown:0,objective:0},notes:[220,277.2,329.6]}
  };
  return configs[genre]||configs.CASUAL;
}

export function buildContractSafePlayable({gameId='',gameName='',baseline={}}={}){
  const genre=inferDevelopmentGenre({gameId,baseline});
  const config=genreConfig(genre);
  const inventory=deriveApprovedScopeInventory(baseline);
  const content=baseline?.content||{};
  const identity=safeDesignText(content.identity||gameName||gameId||'Development Validation');
  const coreFun=safeDesignText(content.coreFun||config.accent);
  const title=htmlEscape(identity||gameName||gameId);
  const scopeButtons=inventory.map((item,index)=>`<button class="scope-action" data-scope-id="${htmlEscape(item.id)}" data-action="${index%3}" type="button"><b>${index+1}</b> ${htmlEscape(item.label)}</button>`).join('');
  const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${title}</title></head><body data-audio-state="locked" data-approved-scope-count="${inventory.length}"><h1>${title}</h1><p>${htmlEscape(coreFun)}</p>${scopeButtons}<button data-audio-control="mute">음소거</button><input data-audio-control="volume" type="range"><div data-state="ready" data-score="0">score 0</div><script>const state={score:0};function applyAction(i){state.score+=i+1;document.querySelector('[data-state]').dataset.score=String(state.score)}document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>applyAction(Number(b.dataset.action))));const AC=window.AudioContext||window.webkitAudioContext;</script>${'x'.repeat(1800)}</body></html>`;
  return {html,validationQuestion:`${identity||gameName||gameId} 승인 분량 ${inventory.length}개 diagnostic recovery`,implementationNotes:['diagnostic only'],approvedScopeInventory:inventory,generationMode:'DETERMINISTIC_FULL_SCOPE_RECOVERY'};
}

const MECHANICS=['ATTACK','MOVE','DEFEND','ABILITY','COOLDOWN','OBJECTIVE','REWARD','PROGRESSION','ECONOMY','QUEST','MOBILE_CONTROL','WORLD','ENEMY','ITEM','SKILL','PUZZLE','SURVIVAL','GENERIC_GAMEPLAY'];
const PLAN_SCHEMA={type:'object',required:['behaviors'],additionalProperties:false,properties:{behaviors:{type:'array',items:{type:'object',required:['scopeId','mechanic','actionLabel','statusText','scoreDelta','hpDelta','resourceDelta','progressDelta','waveDelta','positionDelta','cooldownDelta','objectiveDelta'],additionalProperties:false,properties:{scopeId:{type:'string'},mechanic:{type:'string',enum:MECHANICS},actionLabel:{type:'string'},statusText:{type:'string'},scoreDelta:{type:'number'},hpDelta:{type:'number'},resourceDelta:{type:'number'},progressDelta:{type:'number'},waveDelta:{type:'number'},positionDelta:{type:'number'},cooldownDelta:{type:'number'},objectiveDelta:{type:'number'}}}}}};

export function buildApprovedScopeGenerationPrompt({gameId='',gameName='',baseline={},artbook={},inventory=[]}={}){
  const rows=inventory.map((item,index)=>`${index+1}. ${item.id} :: ${item.path} :: ${item.label} :: compilerHandler=scopeHandler${index+1}`).join('\n');
  return `게임 ID: ${gameId}\n게임명: ${gameName}\nDESIGN_BASELINE:\n${clip(baseline,12000)}\nARTBOOK:\n${clip(artbook,5000)}\nAPPROVED_SCOPE_INVENTORY (${inventory.length}개):\n${rows}\n출력은 HTML이 아니라 behaviors JSON만 만든다.\n- 모든 scopeId를 정확히 한 번씩 포함하고 누락/추가 금지.\n- 각 항목의 label/path 의미를 읽고 실제 플레이 행동을 mechanic으로 분류.\n- actionLabel/statusText는 그 승인 항목의 실제 게임 동작을 설명.\n- 각 항목마다 score/hp/resource/progress/wave/position/cooldown/objective 중 최소 하나는 0이 아닌 변화량.\n- data-action 속성을 절대 사용하지 마라. generic proxy는 GENERIC_SCOPE_PROXY_FORBIDDEN 계약 위반이다.\n- 회사 compiler는 각 scope를 위에 표시된 scopeHandlerN 전용 handler로 직접 연결하므로 범용 action/index 프록시 설계를 만들지 마라.\n- 승인 분량을 축소/재기획하지 않는다.`;
}

function validateBehaviorPlan(plan,inventory){
  const blockers=[];
  const behaviors=Array.isArray(plan?.behaviors)?plan.behaviors:[];
  const requiredIds=inventory.map(x=>x.id);
  const required=new Set(requiredIds);
  const seen=new Set();
  if(behaviors.length!==requiredIds.length)blockers.push(`BEHAVIOR_COUNT_MISMATCH:${behaviors.length}:${requiredIds.length}`);
  for(const behavior of behaviors){
    const id=clean(behavior?.scopeId);
    if(!required.has(id)){blockers.push(`UNKNOWN_SCOPE:${id||'EMPTY'}`);continue;}
    if(seen.has(id))blockers.push(`DUPLICATE_SCOPE:${id}`);
    seen.add(id);
    if(!MECHANICS.includes(clean(behavior?.mechanic)))blockers.push(`INVALID_MECHANIC:${id}`);
    if(!clean(behavior?.actionLabel))blockers.push(`ACTION_LABEL_REQUIRED:${id}`);
    if(!clean(behavior?.statusText))blockers.push(`STATUS_TEXT_REQUIRED:${id}`);
    const deltas=['scoreDelta','hpDelta','resourceDelta','progressDelta','waveDelta','positionDelta','cooldownDelta','objectiveDelta'].map(key=>boundedNumber(behavior?.[key]));
    if(deltas.every(value=>value===0))blockers.push(`OBSERVABLE_STATE_DELTA_REQUIRED:${id}`);
  }
  for(const id of requiredIds)if(!seen.has(id))blockers.push(`MISSING_SCOPE:${id}`);
  return {pass:blockers.length===0,blockers:[...new Set(blockers)]};
}
export {validateBehaviorPlan as validateApprovedScopeBehaviorPlan};

async function callBehaviorModel({model,prompt,repair=[]}){
  const repairText=repair.length?`\n이전 plan 검증 실패: ${repair.join(' | ')}\n위 오류를 모두 고친 behaviors 전체를 다시 반환.`:'';
  const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
    model,stream:false,think:false,format:PLAN_SCHEMA,
    messages:[
      {role:'system',content:'너는 잠긴 DESIGN_BASELINE의 승인 scope를 실제 플레이 규칙으로 변환하는 개발 AI다. HTML을 쓰지 않는다. 승인 scope를 생략하거나 공통 프록시로 축소하지 않는다.'},
      {role:'user',content:`${prompt}${repairText}`}
    ],
    options:{temperature:repair.length?0:0.1,num_ctx:16384,num_predict:8000}
  })});
  if(!response.ok)throw new Error(`OLLAMA_${response.status}: ${await response.text()}`);
  const body=await response.json();
  const raw=clean(body?.message?.content);
  if(!raw)throw new Error('EMPTY_MODEL_RESPONSE');
  return JSON.parse(raw);
}

function normalizedBehavior(behavior){
  return {
    scopeId:clean(behavior.scopeId),
    mechanic:clean(behavior.mechanic),
    actionLabel:safeDesignText(behavior.actionLabel).slice(0,90),
    statusText:safeDesignText(behavior.statusText).slice(0,180),
    scoreDelta:boundedNumber(behavior.scoreDelta),
    hpDelta:boundedNumber(behavior.hpDelta),
    resourceDelta:boundedNumber(behavior.resourceDelta),
    progressDelta:boundedNumber(behavior.progressDelta),
    waveDelta:boundedNumber(behavior.waveDelta,-3,3),
    positionDelta:boundedNumber(behavior.positionDelta),
    cooldownDelta:boundedNumber(behavior.cooldownDelta),
    objectiveDelta:boundedNumber(behavior.objectiveDelta),
  };
}

export function compileApprovedScopePlayable({gameId='',gameName='',baseline={},inventory=[],behaviors=[]}={}){
  const genre=inferDevelopmentGenre({gameId,baseline});
  const config=genreConfig(genre);
  const content=baseline?.content||{};
  const identity=safeDesignText(content.identity||gameName||gameId||'Development Validation');
  const coreFun=safeDesignText(content.coreFun||config.accent);
  const title=htmlEscape(identity||gameName||gameId);
  const byId=new Map(behaviors.map(item=>[clean(item.scopeId),normalizedBehavior(item)]));
  const ordered=inventory.map(item=>byId.get(item.id));
  if(ordered.some(x=>!x))throw new Error('COMPILE_BEHAVIOR_BINDING_MISSING');
  const buttons=inventory.map((item,index)=>{
    const behavior=ordered[index];
    return `<button class="scope-action" id="scope-control-${index+1}" data-scope-id="${htmlEscape(item.id)}" type="button"><b>${index+1}. ${htmlEscape(behavior.actionLabel)}</b><span>${htmlEscape(item.label)}</span><em>${htmlEscape(behavior.mechanic)}</em></button>`;
  }).join('');
  const handlerCode=ordered.map((behavior,index)=>{
    const id=JSON.stringify(behavior.scopeId);
    const action=JSON.stringify(behavior.actionLabel);
    const status=JSON.stringify(behavior.statusText);
    const deltas=JSON.stringify({score:behavior.scoreDelta,hp:behavior.hpDelta,resource:behavior.resourceDelta,progress:behavior.progressDelta,wave:behavior.waveDelta,position:behavior.positionDelta,cooldown:behavior.cooldownDelta,objective:behavior.objectiveDelta});
    return `const scopeNode${index+1}=document.getElementById("scope-control-${index+1}");async function scopeHandler${index+1}(){await ensureAudio();const d=${deltas};state.turn+=1;state.score+=d.score;state.hp=Math.max(0,Math.min(100,state.hp+d.hp));state.resource=Math.max(0,state.resource+d.resource);state.progress=Math.max(0,state.progress+d.progress);state.wave=Math.max(1,state.wave+d.wave);state.position+=d.position;state.cooldown=Math.max(0,state.cooldown+d.cooldown);state.objective=Math.max(0,state.objective+d.objective);state.lastScope=${id};scopeNode${index+1}.dataset.scopeCovered="true";pulseTone(${index});render(${status}+" · "+${action})}scopeNode${index+1}.addEventListener("click",scopeHandler${index+1});`;
  }).join('');
  const runtime=JSON.stringify({initial:config.initial,notes:config.notes});
  const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${title}</title><style>*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#0a1020;color:#eef4ff;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}body{overflow-x:hidden}.game{width:min(100%,520px);min-height:100vh;margin:auto;padding:16px}.hero,.panel,.arena{border:1px solid #2c3d5e;border-radius:18px;background:#131e33;margin-bottom:12px;padding:14px}.hero h1{margin:5px 0 8px;font-size:25px}.hero p,.scope-action span{line-height:1.45}.arena{min-height:142px;display:grid;place-items:center;background:radial-gradient(circle,#253b64,#0f1729)}.avatar{width:64px;height:64px;border-radius:50%;background:#7dd3fc;border:6px solid #e0f2fe;transform:translateX(calc(var(--pos,0) * 1px));transition:transform .15s}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:12px}.stat{background:#111a2d;border-radius:11px;padding:8px 4px;text-align:center}.stat b{display:block;font-size:16px}.scope{display:grid;gap:8px}.scope-action{width:100%;min-height:58px;border:0;border-radius:13px;padding:10px 12px;background:#eef4ff;color:#101827;text-align:left;white-space:normal;overflow-wrap:anywhere}.scope-action b,.scope-action span,.scope-action em{display:block}.scope-action span{font-size:12px;font-weight:500;margin-top:3px}.scope-action em{font-size:10px;margin-top:4px;opacity:.65}.scope-action[data-scope-covered="true"]{outline:3px solid #86efac}.audio{display:grid;grid-template-columns:120px 1fr;gap:10px;align-items:center}.audio button{min-height:44px}.audio input{width:100%}.log{background:#070c17;border-radius:12px;padding:11px;overflow-wrap:anywhere}.meter{height:8px;background:#24324e;border-radius:8px;overflow:hidden;margin-top:9px}.meter span{display:block;height:100%;width:0;background:#a7f3d0;transition:width .15s}@media(max-width:390px){.stats{grid-template-columns:repeat(2,1fr)}.audio{grid-template-columns:1fr}}</style></head><body data-audio-state="locked" data-approved-scope-count="${inventory.length}"><main class="game"><section class="hero"><small>DEVELOPMENT_CONFIRMED · ${htmlEscape(config.tag)}</small><h1>${title}</h1><p>${htmlEscape(coreFun)}</p></section><section class="arena"><div class="avatar" id="avatar"></div></section><section class="stats" id="state" data-state="ready" data-score="0" data-health="${config.initial.hp}" data-resource="${config.initial.resource}" data-progress="0"><div class="stat"><b id="score">0</b><small>SCORE</small></div><div class="stat"><b id="health">${config.initial.hp}</b><small>HP</small></div><div class="stat"><b id="resource">${config.initial.resource}</b><small>RESOURCE</small></div><div class="stat"><b id="progress">0</b><small>PROGRESS</small></div><div class="stat"><b id="wave">1</b><small>WAVE</small></div><div class="stat"><b id="cooldown">0</b><small>COOLDOWN</small></div><div class="stat"><b id="objective">0</b><small>OBJECTIVE</small></div><div class="stat"><b id="turn">0</b><small>TURN</small></div></section><section class="panel"><h2>승인 분량 플레이</h2><div class="scope">${buttons}</div><div class="meter"><span id="meter"></span></div></section><section class="panel audio"><button id="mute" data-audio-control="mute" type="button">음악 켜짐</button><label>볼륨 <input id="volume" data-audio-control="volume" type="range" min="0" max="1" step="0.05" value="0.24"></label></section><div class="log" id="status">STATUS: 준비 · 승인 scope ${inventory.length}개</div></main><script>const cfg=${runtime};const state={...cfg.initial,turn:0,lastScope:""};const $=id=>document.getElementById(id);let audioCtx=null,master=null,osc=null,muted=false;async function ensureAudio(){if(!audioCtx){const AC=window.AudioContext||window.webkitAudioContext;audioCtx=new AC();master=audioCtx.createGain();master.gain.value=Number($("volume").value);master.connect(audioCtx.destination);osc=audioCtx.createOscillator();osc.type="triangle";osc.frequency.value=cfg.notes[0];osc.connect(master);osc.start()}if(audioCtx.state==="suspended")await audioCtx.resume();document.body.dataset.audioState=muted?"muted":"running"}function pulseTone(index){if(osc&&audioCtx)osc.frequency.setTargetAtTime(cfg.notes[index%cfg.notes.length],audioCtx.currentTime,.03)}function render(label){$("score").textContent=String(state.score);$("health").textContent=String(state.hp);$("resource").textContent=String(state.resource);$("progress").textContent=String(state.progress);$("wave").textContent=String(state.wave);$("cooldown").textContent=String(state.cooldown);$("objective").textContent=String(state.objective);$("turn").textContent=String(state.turn);$("avatar").style.setProperty("--pos",String(Math.max(-90,Math.min(90,state.position))));$("meter").style.width=Math.min(100,state.progress)+"%";const node=$("state");node.dataset.state="turn-"+state.turn+"-"+state.lastScope;node.dataset.score=String(state.score);node.dataset.health=String(state.hp);node.dataset.resource=String(state.resource);node.dataset.progress=String(state.progress);$("status").textContent="STATUS: "+label+" · TURN "+state.turn} ${handlerCode} $("mute").addEventListener("click",async()=>{await ensureAudio();muted=!muted;master.gain.value=muted?0:Number($("volume").value);$("mute").textContent=muted?"음악 꺼짐":"음악 켜짐";document.body.dataset.audioState=muted?"muted":"running"});$("volume").addEventListener("input",async()=>{await ensureAudio();if(!muted)master.gain.value=Number($("volume").value)});document.addEventListener("keydown",event=>{if(event.code==="Space"&&scopeNode1)scopeNode1.click()});render("ready");</script></body></html>`;
  return {html,validationQuestion:`${identity||gameName||gameId} 승인 scope ${inventory.length}개의 의미별 동작과 전체 Web 런타임이 실제 입력으로 검증되는가?`,implementationNotes:[`compiled approved-scope behavior plan count=${inventory.length}`,'dedicated handler per approved scope','user-gesture Web Audio','no external network/assets/storage'],approvedScopeInventory:inventory,generationMode:'MODEL_PLANNED_CONTRACT_COMPILED_FULL_SCOPE'};
}

export async function buildFirstPlayable({gameId,gameName,baseline,artbook,sourcePath,candidatePath,candidateId,sourceCommit,model}){
  const inventory=deriveApprovedScopeInventory(baseline);
  const prompt=buildApprovedScopeGenerationPrompt({gameId,gameName,baseline,artbook,inventory});
  let plan=null,last=[],modelAttempts=0;const modelContractFailures=[];
  for(let attempt=1;attempt<=2;attempt++){
    modelAttempts=attempt;
    try{
      plan=await callBehaviorModel({model,prompt,repair:last});
      const planReview=validateBehaviorPlan(plan,inventory);
      if(!planReview.pass){last=planReview.blockers;modelContractFailures.push({attempt,blockers:[...planReview.blockers]});continue;}
      const compiled=compileApprovedScopePlayable({gameId,gameName,baseline,inventory,behaviors:plan.behaviors});
      const review=validateBootstrapHtml(compiled.html,{scopeInventory:inventory});
      if(!review.pass){last=review.blockers;modelContractFailures.push({attempt,blockers:[...review.blockers]});continue;}
      fs.mkdirSync(candidatePath,{recursive:true});
      fs.writeFileSync(path.join(candidatePath,'index.html'),compiled.html.endsWith('\n')?compiled.html:`${compiled.html}\n`,'utf8');
      return {result:compiled,review,generation:{mode:compiled.generationMode,modelAttempts,modelContractFailures},approvedScopeInventory:inventory};
    }catch(error){
      last=['MODEL_SCOPE_PLAN_ERROR'];
      modelContractFailures.push({attempt,error:clean(error?.message||error).slice(0,700)});
    }
  }
  const fallback=buildContractSafePlayable({gameId,gameName,baseline});
  const review=validateBootstrapHtml(fallback.html,{scopeInventory:inventory});
  const modelFailures=modelContractFailures.map(entry=>entry.blockers?.length?`attempt${entry.attempt}:${entry.blockers.join(',')}`:`attempt${entry.attempt}:${entry.error||'MODEL_SCOPE_PLAN_ERROR'}`).join(';');
  throw new Error(`BOOTSTRAP_SCOPE_PLAN_FAILED: ${modelFailures.slice(0,1800)} | DIAGNOSTIC_FALLBACK_BLOCKED: ${review.blockers.join('|').slice(0,1000)}`);
}

async function main(){
  const gameId=clean(arg('game-id')),gameName=clean(arg('game-name',gameId)),baselineFile=arg('baseline'),artbookFile=arg('artbook'),sourcePath=clean(arg('source-path')),candidateId=safeId(arg('candidate-id')),candidatePath=clean(arg('candidate-path')),sourceCommit=clean(arg('source-commit')),model=clean(arg('model',process.env.AUTONOMOUS_LOCAL_MODEL||'llama3.2:1b')),evidenceFile=clean(arg('evidence'));
  if(!gameId||!baselineFile||!artbookFile||!sourcePath||!candidateId||!candidatePath||!sourceCommit||!evidenceFile)throw new Error('required bootstrap argument missing');
  if(!sourcePath.startsWith('web-games/')||!candidatePath.startsWith('web-games/.autonomous-candidates/'))throw new Error('invalid source/candidate path');
  const baseline=readJson(baselineFile),artbook=readJson(artbookFile);
  const {result,review,generation,approvedScopeInventory}=await buildFirstPlayable({gameId,gameName,baseline,artbook,sourcePath,candidatePath,candidateId,sourceCommit,model});
  const evidence={version:5,candidateId,gameId,sourcePath,candidatePath,sourceCommit,candidateOnly:true,selfPromote:false,publicStableModified:false,paidApi:false,newProject:true,changedFiles:['index.html'],summary:`DEVELOPMENT_CONFIRMED mandatory full Web companion: ${result.validationQuestion}`,expectedEffect:'DESIGN_BASELINE 승인 분량 전체와 사용자 제스처 기반 음악 런타임을 모바일 실제 상호작용으로 검증',tests:['company-development-web-bootstrap-contract','company-development-web-gameplay-validation','approved-scope-runtime-coverage','independent-candidate-browser-qa'],validationQuestion:result.validationQuestion,implementationNotes:result.implementationNotes,musicRuntimeRequired:true,fullApprovedScopeRequired:true,approvedScopeInventory,approvedScopeRequiredCount:approvedScopeInventory.length,model,generationMode:generation.mode,modelAttempts:generation.modelAttempts,modelContractFailures:generation.modelContractFailures,bootstrapContract:review,createdAt:new Date().toISOString()};
  writeJson(evidenceFile,evidence);
  console.log('DEVELOPMENT_WEB_BOOTSTRAP=PASS');
  console.log(`GAME_ID=${gameId}`);
  console.log(`CANDIDATE_ID=${candidateId}`);
  console.log(`BOOTSTRAP_GENERATION_MODE=${generation.mode}`);
  console.log(`APPROVED_SCOPE_REQUIRED=${approvedScopeInventory.length}`);
  console.log('FULL_APPROVED_SCOPE_REQUIRED=YES');
  console.log('MUSIC_RUNTIME_REQUIRED=YES');
  console.log('PAID_API=NO');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});}
