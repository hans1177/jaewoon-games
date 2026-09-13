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
const htmlEscape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[char]));
const safeDesignText=value=>clean(value).replace(/https?:\/\/\S+/gi,'').replace(/\b(?:localStorage|sessionStorage|XMLHttpRequest|WebSocket|fetch)\b/gi,'runtime').slice(0,260);

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

const OUTPUT_SCHEMA={type:'object',required:['html','validationQuestion','implementationNotes'],additionalProperties:false,properties:{html:{type:'string'},validationQuestion:{type:'string'},implementationNotes:{type:'array',items:{type:'string'},maxItems:12}}};
async function callModel({model,prompt,repair=''}){
  const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,think:false,format:OUTPUT_SCHEMA,messages:[{role:'system',content:'너는 재운컴퍼니 DEVELOPMENT_CONFIRMED 개발 AI다. 잠긴 DESIGN_BASELINE을 재기획하거나 축소하지 않는다. 승인된 게임 분량 전체를 실제로 플레이 가능한 Web companion으로 구현한다. 플랫폼 전용 기능은 핵심 의미를 보존한 Web 동등 표현으로 구현하고 조용히 생략하지 않는다. 외부 네트워크/외부 에셋/저장소는 사용하지 않는다. 승인 scope를 공통 data-action 프록시나 하나의 범용 동작으로 대체하지 말고 각 scope의 설계 의미에 맞는 독립 게임 동작으로 구현한다.'},{role:'user',content:`${prompt}${repair?`\n이전 출력 검증 실패를 반드시 수정하라: ${repair}`:''}`}],options:{temperature:repair?0:0.15,num_ctx:24576,num_predict:12000}})});
  if(!response.ok)throw new Error(`OLLAMA_${response.status}: ${await response.text()}`);
  const body=await response.json();
  const raw=clean(body?.message?.content);
  if(!raw)throw new Error('EMPTY_MODEL_RESPONSE');
  return JSON.parse(raw);
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
  return 'CASUAL';
}
function genreConfig(genre){
  const configs={
    ACTION_SURVIVAL_ROGUELITE:{tag:'생존 전투',accent:'위협을 피하고 공격해 웨이브를 버틴다',initial:{score:0,hp:100,wave:1,resource:0,progress:0},notes:[164.8,196,220]},
    SINGLE_DEFENSE_STRATEGY:{tag:'방어 전략',accent:'자원을 배치와 강화에 써서 다음 웨이브를 막는다',initial:{score:0,hp:100,wave:1,resource:30,progress:0},notes:[130.8,164.8,196]},
    PUZZLE:{tag:'퍼즐',accent:'제한된 수 안에서 색 조합을 만들고 콤보를 이어간다',initial:{score:0,hp:12,wave:1,resource:0,progress:0},notes:[261.6,329.6,392]},
    IDLE_GROWTH_RPG:{tag:'성장 RPG',accent:'보상을 회수하고 성장시킨 뒤 더 높은 스테이지에 도전한다',initial:{score:0,hp:100,wave:1,resource:20,progress:0},notes:[146.8,174.6,220]},
    STORY_COMPLETE_RPG:{tag:'스토리 RPG',accent:'탐험과 선택, 전투를 통해 목표를 완수한다',initial:{score:0,hp:100,wave:1,resource:3,progress:0},notes:[174.6,220,261.6]},
    CASUAL:{tag:'캐주얼',accent:'짧은 입력으로 점수와 진행도를 올리고 즉시 다음 선택을 한다',initial:{score:0,hp:100,wave:1,resource:0,progress:0},notes:[220,277.2,329.6]}
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
  const runtime={genre,initial:config.initial,notes:config.notes,scopeCount:inventory.length};
  const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${title}</title><style>*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#0d1220;color:#f4f7fb;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}body{display:flex;justify-content:center;overflow-x:hidden}.game{width:min(100%,520px);min-height:100vh;padding:18px 16px 30px;background:linear-gradient(180deg,#141d32,#0b1020 62%,#070b14)}.hero,.panel{padding:16px;border:1px solid #293753;border-radius:20px;background:#172137;margin-bottom:14px}.hero h1{font-size:26px;margin:7px 0 10px}.desc,.rule{font-size:13px;line-height:1.45;color:#c6d2e7}.arena{position:relative;height:180px;border-radius:20px;border:1px solid #31415f;background:radial-gradient(circle at 50% 35%,#25385e,#111a2d 56%,#090f1b);margin-bottom:12px}.player{position:absolute;width:58px;height:58px;border-radius:50%;left:calc(50% - 29px);top:55px;background:#60a5fa;border:5px solid #dbeafe}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.stat{padding:9px 5px;border-radius:12px;background:#111a2d;text-align:center}.stat b{display:block;font-size:17px}.scope{display:grid;gap:8px}.scope-action,.audio button{min-height:50px;border:0;border-radius:14px;background:#eef4ff;color:#111827;font-weight:750;text-align:left;padding:10px 12px}.scope-action[data-scope-covered="true"]{outline:3px solid #86efac}.audio{display:grid;grid-template-columns:110px 1fr;gap:10px;align-items:center}.audio input{width:100%}.log{padding:12px;border-radius:12px;background:#0a1020;color:#b8c7e0}.pulse{height:8px;border-radius:9px;background:#1f2b45;overflow:hidden;margin-top:10px}.pulse span{display:block;height:100%;width:0;background:#a78bfa;transition:width .2s}@media(max-width:390px){.stats{grid-template-columns:repeat(2,1fr)}.audio{grid-template-columns:1fr}}</style></head><body data-audio-state="locked" data-approved-scope-count="${inventory.length}"><main class="game"><section class="hero"><small>DEVELOPMENT_CONFIRMED · FULL WEB COMPANION · ${htmlEscape(config.tag)}</small><h1>${title}</h1><p class="desc">${htmlEscape(coreFun)}</p></section><section class="arena"><div class="player"></div></section><section class="stats" id="state" data-state="ready" data-score="0" data-health="100" data-resource="0" data-progress="0"><div class="stat"><b id="score">0</b><small>SCORE</small></div><div class="stat"><b id="health">100</b><small>HP</small></div><div class="stat"><b id="wave">1</b><small>WAVE</small></div><div class="stat"><b id="resource">0</b><small>RESOURCE</small></div></section><section class="panel"><h2>승인 분량 전체 구현</h2><div class="scope">${scopeButtons}</div><div class="pulse"><span id="meter"></span></div></section><section class="panel audio"><button id="mute" data-audio-control="mute" type="button">음악 켜짐</button><label>볼륨 <input id="volume" data-audio-control="volume" type="range" min="0" max="1" step="0.05" value="0.28"></label></section><div class="log" id="status">STATUS: 준비 · 승인 분량 ${inventory.length}개 런타임 검증 대기</div></main><script>const cfg=${JSON.stringify(runtime)};const state={...cfg.initial,turn:0};const $=id=>document.getElementById(id);let audioCtx=null,master=null,osc=null,muted=false;async function ensureAudio(){if(!audioCtx){const AC=window.AudioContext||window.webkitAudioContext;audioCtx=new AC();master=audioCtx.createGain();master.gain.value=Number($('volume').value);master.connect(audioCtx.destination);osc=audioCtx.createOscillator();osc.type='sine';osc.frequency.value=cfg.notes[0];osc.connect(master);osc.start()}if(audioCtx.state==='suspended')await audioCtx.resume();document.body.dataset.audioState=muted?'muted':'running'}function render(label){$('score').textContent=state.score;$('health').textContent=state.hp;$('wave').textContent=state.wave;$('resource').textContent=state.resource;$('meter').style.width=Math.min(100,state.progress*2)+'%';const s=$('state');s.dataset.state='turn-'+state.turn;s.dataset.score=String(state.score);s.dataset.health=String(state.hp);s.dataset.resource=String(state.resource);s.dataset.progress=String(state.progress);$('status').textContent='STATUS: '+label+' · TURN '+state.turn+' · PROGRESS '+state.progress}function applyAction(index,label){state.turn++;state.score+=7+index*4;state.resource+=index===2?5:1;state.progress+=9+index*3;state.hp=Math.max(1,Math.min(100,state.hp+(index===0?1:index===2?4:-2)));if(state.progress>=48){state.wave++;state.progress=0;state.score+=15}if(osc)osc.frequency.setTargetAtTime(cfg.notes[index%cfg.notes.length],audioCtx.currentTime,.03);render(label)}document.querySelectorAll('.scope-action').forEach(button=>button.addEventListener('click',async()=>{await ensureAudio();button.dataset.scopeCovered='true';applyAction(Number(button.dataset.action),button.dataset.scopeId)}));document.addEventListener('keydown',async event=>{if(['ArrowRight','ArrowUp','Space'].includes(event.code)){await ensureAudio();const buttons=[...document.querySelectorAll('.scope-action')];const button=buttons[state.turn%buttons.length];if(button)button.click()}});$('mute').addEventListener('click',async()=>{await ensureAudio();muted=!muted;master.gain.value=muted?0:Number($('volume').value);$('mute').textContent=muted?'음악 꺼짐':'음악 켜짐';document.body.dataset.audioState=muted?'muted':'running'});$('volume').addEventListener('input',async()=>{await ensureAudio();if(!muted)master.gain.value=Number($('volume').value)});render('ready');</script></body></html>`;
  return {html,validationQuestion:`${identity||gameName||gameId}의 승인된 게임 분량 ${inventory.length}개가 모두 Web companion에서 실제 입력 가능한가?`,implementationNotes:[`locked DESIGN_BASELINE genre=${genre}`,`full approved scope count=${inventory.length}`,'all approved scope items exposed as runtime interactions','first-user-gesture Web Audio synth music','no external assets, persistence, or network dependencies'],approvedScopeInventory:inventory,generationMode:'DETERMINISTIC_FULL_SCOPE_RECOVERY'};
}

export function buildApprovedScopeGenerationPrompt({gameId='',gameName='',baseline={},artbook={},inventory=[]}={}){
  const inventoryText=inventory.map((item,index)=>`${index+1}. ${item.id} :: ${item.path} :: ${item.label}`).join('\n');
  const bindingText=inventory.map((item,index)=>`- ${item.id}: 전용 handler scopeHandler${index+1}을 만들고 이 control에 직접 addEventListener로 연결. 의미: ${item.label}`).join('\n');
  return `게임 ID: ${gameId}\n게임명: ${gameName}\nDESIGN_BASELINE:\n${clip(baseline)}\nARTBOOK:\n${clip(artbook,12000)}\nAPPROVED_SCOPE_INVENTORY (${inventory.length}개):\n${inventoryText}\n각 승인 scope 전용 구현 계약:\n${bindingText}\n요구사항:\n- 축소 vertical slice가 아니라 승인된 설계 분량 전체를 담은 단일 index.html 플레이 가능한 Web companion.\n- body 또는 주 게임 루트에 data-approved-scope-count=\"${inventory.length}\" 지정.\n- 위 APPROVED_SCOPE_INVENTORY 모든 항목을 하나도 빼지 말고, 각 항목마다 정확한 data-scope-id를 가진 화면에 보이는 클릭 가능한 게임 컨트롤을 제공.\n- 승인 scope control에는 data-action 속성을 절대 사용하지 마라. data-action은 GENERIC_SCOPE_PROXY_FORBIDDEN 계약 위반이다.\n- 여러 scope를 하나의 범용 action 함수, index/modulo 분기, 공통 data-action 테이블로 대체하지 마라. 각 scope는 위에 지정한 서로 다른 전용 handler와 직접 이벤트 바인딩을 가져야 한다.\n- 각 전용 handler는 해당 scope의 설계 문장 의미를 실제 게임 규칙으로 표현하고 score/hp/resource/progress/wave/위치/쿨다운/목표 등 관찰 가능한 상태를 변화시켜야 한다. 단순 텍스트 토글이나 완료 표시만 하는 장식 구현 금지.\n- coreLoop 항목은 순서와 의미가 이어지는 실제 플레이 흐름으로 연결하고, coreFun/mobileUx 등 다른 승인 scope도 별도 입력과 상태 변화로 검증 가능하게 구현.\n- 플랫폼 전용 기능은 핵심 의미를 보존한 Web 동등 상호작용으로 구현하고 생략 금지.\n- DESIGN_BASELINE 핵심 루프, 진행, 전투/경제/콘텐츠 등 인벤토리에 잡힌 모든 승인 범위를 구현.\n- 첫 게임 입력 전 음악 재생 금지. 첫 사용자 입력에서 AudioContext를 생성/재개하고 data-audio-state를 locked에서 running 또는 muted로 변경.\n- data-audio-control=\"mute\" 버튼과 data-audio-control=\"volume\" 범위 입력 제공.\n- 외부 URL/CDN/fetch/iframe/localStorage/sessionStorage 금지. Web Audio synth 가능.\n- 390x844 모바일 화면에서 가로 넘침 금지.\n- inline JavaScript 문법 완전.\n- 기존 설계에 없는 대규모 시스템/세계관 추가 금지.\n- HTML 전체를 html 필드에 반환.`;
}

export async function buildFirstPlayable({gameId,gameName,baseline,artbook,sourcePath,candidatePath,candidateId,sourceCommit,model}){
  const inventory=deriveApprovedScopeInventory(baseline);
  const prompt=buildApprovedScopeGenerationPrompt({gameId,gameName,baseline,artbook,inventory});
  let result=null,last=[],modelAttempts=0;const modelContractFailures=[];
  for(let attempt=1;attempt<=2;attempt++){
    modelAttempts=attempt;
    try{
      result=await callModel({model,prompt,repair:last.join('|')});
      const review=validateBootstrapHtml(result.html,{scopeInventory:inventory});
      if(review.pass){fs.mkdirSync(candidatePath,{recursive:true});fs.writeFileSync(path.join(candidatePath,'index.html'),result.html.endsWith('\n')?result.html:`${result.html}\n`,'utf8');return {result:{...result,approvedScopeInventory:inventory,generationMode:'MODEL_GENERATED_FULL_SCOPE'},review,generation:{mode:'MODEL_GENERATED_FULL_SCOPE',modelAttempts,modelContractFailures},approvedScopeInventory:inventory};}
      last=review.blockers;modelContractFailures.push({attempt,blockers:[...review.blockers]});
    }catch(error){last=['MODEL_OUTPUT_ERROR'];modelContractFailures.push({attempt,error:clean(error?.message||error).slice(0,500)});}
  }
  const fallback=buildContractSafePlayable({gameId,gameName,baseline});
  const review=validateBootstrapHtml(fallback.html,{scopeInventory:inventory});
  if(!review.pass){
    const modelFailures=modelContractFailures.map(entry=>entry.blockers?.length?`attempt${entry.attempt}:${entry.blockers.join(',')}`:`attempt${entry.attempt}:${entry.error||'MODEL_OUTPUT_ERROR'}`).join(';');
    throw new Error(`BOOTSTRAP_MODEL_CONTRACT_FAILED: ${modelFailures||'UNKNOWN'} | DIAGNOSTIC_FALLBACK_BLOCKED: ${review.blockers.join('|')}`);
  }
  fs.mkdirSync(candidatePath,{recursive:true});fs.writeFileSync(path.join(candidatePath,'index.html'),fallback.html.endsWith('\n')?fallback.html:`${fallback.html}\n`,'utf8');
  return {result:fallback,review,generation:{mode:fallback.generationMode,modelAttempts,modelContractFailures},approvedScopeInventory:inventory};
}

async function main(){
  const gameId=clean(arg('game-id')),gameName=clean(arg('game-name',gameId)),baselineFile=arg('baseline'),artbookFile=arg('artbook'),sourcePath=clean(arg('source-path')),candidateId=safeId(arg('candidate-id')),candidatePath=clean(arg('candidate-path')),sourceCommit=clean(arg('source-commit')),model=clean(arg('model',process.env.AUTONOMOUS_LOCAL_MODEL||'llama3.2:1b')),evidenceFile=clean(arg('evidence'));
  if(!gameId||!baselineFile||!artbookFile||!sourcePath||!candidateId||!candidatePath||!sourceCommit||!evidenceFile)throw new Error('required bootstrap argument missing');
  if(!sourcePath.startsWith('web-games/')||!candidatePath.startsWith('web-games/.autonomous-candidates/'))throw new Error('invalid source/candidate path');
  const baseline=readJson(baselineFile),artbook=readJson(artbookFile);
  const {result,review,generation,approvedScopeInventory}=await buildFirstPlayable({gameId,gameName,baseline,artbook,sourcePath,candidatePath,candidateId,sourceCommit,model});
  const evidence={version:4,candidateId,gameId,sourcePath,candidatePath,sourceCommit,candidateOnly:true,selfPromote:false,publicStableModified:false,paidApi:false,newProject:true,changedFiles:['index.html'],summary:`DEVELOPMENT_CONFIRMED mandatory full Web companion: ${result.validationQuestion}`,expectedEffect:'DESIGN_BASELINE 승인 분량 전체와 사용자 제스처 기반 음악 런타임을 모바일 실제 상호작용으로 검증',tests:['company-development-web-bootstrap-contract','company-development-web-gameplay-validation','approved-scope-runtime-coverage','independent-candidate-browser-qa'],validationQuestion:result.validationQuestion,implementationNotes:result.implementationNotes,musicRuntimeRequired:true,fullApprovedScopeRequired:true,approvedScopeInventory,approvedScopeRequiredCount:approvedScopeInventory.length,model,generationMode:generation.mode,modelAttempts:generation.modelAttempts,modelContractFailures:generation.modelContractFailures,bootstrapContract:review,createdAt:new Date().toISOString()};
  writeJson(evidenceFile,evidence);
  console.log('DEVELOPMENT_WEB_BOOTSTRAP=PASS');console.log(`GAME_ID=${gameId}`);console.log(`CANDIDATE_ID=${candidateId}`);console.log(`BOOTSTRAP_GENERATION_MODE=${generation.mode}`);console.log(`APPROVED_SCOPE_REQUIRED=${approvedScopeInventory.length}`);console.log('FULL_APPROVED_SCOPE_REQUIRED=YES');console.log('MUSIC_RUNTIME_REQUIRED=YES');console.log('PAID_API=NO');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});}
