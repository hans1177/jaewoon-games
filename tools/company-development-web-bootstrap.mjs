// 파일명: tools/company-development-web-bootstrap.mjs
// DESIGN_BASELINE을 보존한 모바일 Web 플레이/음악/연출 검증 후보를 만든다.
import fs from 'node:fs';
import path from 'node:path';
import {Script} from 'node:vm';
import {pathToFileURL} from 'node:url';

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

export function hasCinematicIntent(baseline={}){
  const content=baseline?.content||baseline||{};
  const text=JSON.stringify(content).toLowerCase();
  return /(cinematic|cutscene|opening sequence|intro sequence|story scene|dialogue scene|camera sequence|시네마틱|컷신|오프닝 연출|인트로 연출|대사 연출|카메라 연출|장면 전환)/i.test(text);
}

export function validateBootstrapHtml(html){
  const text=String(html??'');
  const blockers=[];
  if(Buffer.byteLength(text,'utf8')<1800)blockers.push('HTML_TOO_SMALL');
  if(Buffer.byteLength(text,'utf8')>220000)blockers.push('HTML_TOO_LARGE');
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
  if(!/data-cinematic-applicable=["'](?:true|false)["']/.test(text))blockers.push('CINEMATIC_APPLICABILITY_STATE_REQUIRED');
  const cinematicApplicable=/data-cinematic-applicable=["']true["']/.test(text);
  if(cinematicApplicable){
    if(!/data-intro-state=["']visible["']/.test(text))blockers.push('CINEMATIC_FIRST_ENTRY_STATE_REQUIRED');
    if(!/data-intro-handoff=["']pending["']/.test(text))blockers.push('CINEMATIC_HANDOFF_STATE_REQUIRED');
    if(!/data-intro-screen=["']visible["']/.test(text))blockers.push('CINEMATIC_SCREEN_REQUIRED');
    if(!/data-intro-control=["'](?:continue|skip)["']/.test(text))blockers.push('CINEMATIC_SKIP_OR_CONTINUE_CONTROL_REQUIRED');
    if(!/(introState|intro-state)/.test(text)||!/(introHandoff|intro-handoff)/.test(text))blockers.push('CINEMATIC_RUNTIME_TRANSITION_REQUIRED');
  }
  if(/<(?:audio|video)\b[^>]*\bautoplay\b/i.test(text))blockers.push('AUDIO_AUTOPLAY_FORBIDDEN');
  if(/\b(?:localStorage|sessionStorage)\b/.test(text))blockers.push('PERSISTENT_STORAGE_FORBIDDEN_ON_BOOTSTRAP');
  if(/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(text))blockers.push('NETWORK_API_FORBIDDEN');
  if(/<(?:iframe|object|embed)\b/i.test(text))blockers.push('EMBED_FORBIDDEN');
  if(/(?:src|href)\s*=\s*["']https?:\/\//i.test(text))blockers.push('EXTERNAL_ASSET_FORBIDDEN');
  blockers.push(...inlineScriptBlockers(text));
  return {pass:blockers.length===0,blockers:[...new Set(blockers)],bytes:Buffer.byteLength(text,'utf8'),cinematicApplicable};
}

const OUTPUT_SCHEMA={type:'object',required:['html','validationQuestion','implementationNotes'],additionalProperties:false,properties:{html:{type:'string'},validationQuestion:{type:'string'},implementationNotes:{type:'array',items:{type:'string'},maxItems:8}}};
async function callModel({model,prompt,repair=''}){
  const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,think:false,format:OUTPUT_SCHEMA,messages:[{role:'system',content:'너는 재운컴퍼니 DEVELOPMENT_CONFIRMED 개발 AI다. 잠긴 DESIGN_BASELINE을 재기획하지 않고 실제 플레이, 음악 런타임, 연출/시네마틱 검증용 Web vertical slice를 만든다. 인트로·컷신·시네마틱은 DESIGN_BASELINE에 실제 의도가 있을 때만 구현하고, 없으면 새로 만들지 않는다. 외부 네트워크/외부 에셋/저장소를 사용하지 않는다.'},{role:'user',content:`${prompt}${repair?`\n이전 출력 검증 실패를 반드시 수정하라: ${repair}`:''}`}],options:{temperature:repair?0:0.15,num_ctx:16384,num_predict:7000}})});
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
    ACTION_SURVIVAL_ROGUELITE:{tag:'생존 전투',accent:'위협을 피하고 공격해 웨이브를 버틴다',buttons:['회피','공격','강화'],initial:{score:0,hp:100,wave:1,resource:0,progress:0},notes:[164.8,196,220]},
    SINGLE_DEFENSE_STRATEGY:{tag:'방어 전략',accent:'자원을 배치와 강화에 써서 다음 웨이브를 막는다',buttons:['수비 배치','수비 강화','웨이브 진행'],initial:{score:0,hp:100,wave:1,resource:30,progress:0},notes:[130.8,164.8,196]},
    PUZZLE:{tag:'퍼즐',accent:'제한된 수 안에서 색 조합을 만들고 콤보를 이어간다',buttons:['색 맞추기','연쇄 만들기','보드 정리'],initial:{score:0,hp:12,wave:1,resource:0,progress:0},notes:[261.6,329.6,392]},
    IDLE_GROWTH_RPG:{tag:'성장 RPG',accent:'보상을 회수하고 성장시킨 뒤 더 높은 스테이지에 도전한다',buttons:['보상 회수','레벨 강화','스테이지 도전'],initial:{score:0,hp:100,wave:1,resource:20,progress:0},notes:[146.8,174.6,220]},
    STORY_COMPLETE_RPG:{tag:'스토리 RPG',accent:'탐험과 선택, 전투를 통해 한 장면의 목표를 완수한다',buttons:['탐험','선택','전투'],initial:{score:0,hp:100,wave:1,resource:3,progress:0},notes:[174.6,220,261.6]},
    CASUAL:{tag:'캐주얼',accent:'짧은 입력으로 점수와 진행도를 올리고 즉시 다음 선택을 한다',buttons:['탭','도전','보상'],initial:{score:0,hp:100,wave:1,resource:0,progress:0},notes:[220,277.2,329.6]}
  };
  return configs[genre]||configs.CASUAL;
}

export function buildContractSafePlayable({gameId='',gameName='',baseline={}}={}){
  const genre=inferDevelopmentGenre({gameId,baseline});
  const config=genreConfig(genre);
  const content=baseline?.content||{};
  const cinematicApplicable=hasCinematicIntent(baseline);
  const identity=safeDesignText(content.identity||gameName||gameId||'Development Validation');
  const coreFun=safeDesignText(content.coreFun||config.accent);
  const loop=safeDesignText(Array.isArray(content.coreLoop)?content.coreLoop[0]:'')||config.accent;
  const title=htmlEscape(identity||gameName||gameId);
  const subtitle=htmlEscape(coreFun);
  const loopText=htmlEscape(loop);
  const buttons=config.buttons.map((label,index)=>`<button class="action" data-action="${index}" type="button">${htmlEscape(label)}</button>`).join('');
  const runtime={genre,initial:config.initial,labels:config.buttons,notes:config.notes};
  const cinematicCss=cinematicApplicable?'.intro{position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(5,9,18,.94)}.intro[hidden]{display:none}.intro-card{width:min(100%,390px);padding:24px;border:1px solid #354968;border-radius:24px;background:#172137}.intro-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}.intro-actions button{min-height:50px;border:0;border-radius:15px;font-weight:850}':'';
  const cinematicMarkup=cinematicApplicable?`<section class="intro" id="intro" data-intro-screen="visible"><div class="intro-card"><div class="eyebrow">OPENING</div><h1>${title}</h1><p class="desc">${subtitle}</p><p class="rule">${loopText}</p><div class="intro-actions"><button data-intro-control="continue" type="button">시작</button><button data-intro-control="skip" type="button">건너뛰기</button></div></div></section>`:'';
  const bodyState=cinematicApplicable?'data-cinematic-applicable="true" data-intro-state="visible" data-intro-handoff="pending"':'data-cinematic-applicable="false" data-intro-state="not-applicable" data-intro-handoff="ready"';
  const html=`<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${title}</title>
<style>*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#0d1220;color:#f4f7fb;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}body{display:flex;justify-content:center;overflow-x:hidden}.game{width:min(100%,430px);min-height:100vh;padding:18px 16px 30px;background:linear-gradient(180deg,#141d32,#0b1020 62%,#070b14)}.hero{padding:18px;border:1px solid #293753;border-radius:22px;background:#172137}.eyebrow{font-size:12px;color:#9db5df;font-weight:800}.hero h1{font-size:26px;margin:7px 0 10px}.desc,.rule{font-size:13px;line-height:1.45;color:#c6d2e7}${cinematicCss}.arena{position:relative;margin:16px 0;height:220px;border-radius:22px;border:1px solid #31415f;overflow:hidden;background:radial-gradient(circle at 50% 35%,#25385e,#111a2d 56%,#090f1b)}.orb{position:absolute;border-radius:50%}.player{width:62px;height:62px;left:calc(50% - 31px);top:80px;background:#60a5fa;border:5px solid #dbeafe}.enemy{width:42px;height:42px;background:#ef4444}.e1{left:34px;top:42px}.e2{right:32px;top:62px}.e3{left:70px;bottom:28px}.pulse{position:absolute;left:18px;right:18px;bottom:16px;height:8px;border-radius:9px;background:#1f2b45;overflow:hidden}.pulse span{display:block;height:100%;width:0;background:#a78bfa;transition:width .2s}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.stat{padding:10px 7px;border-radius:14px;background:#111a2d;border:1px solid #283652;text-align:center}.stat b{display:block;font-size:18px}.stat small{font-size:10px;color:#9db0cf}.controls{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:14px}.action,.audio button{min-height:52px;border:0;border-radius:16px;background:#eef4ff;color:#111827;font-weight:850;font-size:14px}.audio{display:grid;grid-template-columns:110px 1fr;gap:10px;align-items:center;margin-top:12px;padding:10px;border:1px solid #283652;border-radius:14px}.audio input{width:100%}.log{margin-top:12px;padding:12px 14px;border-radius:14px;background:#0a1020;border:1px solid #273653;font-size:12px;color:#b8c7e0;min-height:42px}.status-ok{color:#86efac}@media(max-width:350px){.stats{grid-template-columns:repeat(2,1fr)}.controls{grid-template-columns:1fr}.audio{grid-template-columns:1fr}}</style></head>
<body data-audio-state="locked" ${bodyState}>${cinematicMarkup}<main class="game"><section class="hero"><div class="eyebrow">DEVELOPMENT_CONFIRMED · ${htmlEscape(config.tag)}</div><h1>${title}</h1><p class="desc">${subtitle}</p></section><section class="arena"><div class="orb player"></div><div class="orb enemy e1"></div><div class="orb enemy e2"></div><div class="orb enemy e3"></div><div class="pulse"><span id="meter"></span></div></section><section class="stats" id="state" data-state="ready" data-score="0" data-health="100" data-resource="0" data-progress="0"><div class="stat"><b id="score">0</b><small>SCORE</small></div><div class="stat"><b id="health">100</b><small>HP</small></div><div class="stat"><b id="wave">1</b><small>WAVE</small></div><div class="stat"><b id="resource">0</b><small>RESOURCE</small></div></section><section class="controls">${buttons}</section><section class="audio"><button id="mute" data-audio-control="mute" type="button">음악 켜짐</button><label>볼륨 <input id="volume" data-audio-control="volume" type="range" min="0" max="1" step="0.05" value="0.28"></label></section><div class="log" id="status">STATUS: 준비 · 첫 게임 입력에서 음악이 시작됩니다.</div><p class="rule">검증 루프: ${loopText}</p></main>
<script>
const cfg=${JSON.stringify(runtime)};const state={...cfg.initial,turn:0};const $=id=>document.getElementById(id);let audioCtx=null,master=null,osc=null,muted=false;const cinematicApplicable=document.body.dataset.cinematicApplicable==='true';
function dismissIntro(mode){const intro=$('intro');if(!intro)return;intro.hidden=true;intro.dataset.introScreen='hidden';document.body.dataset.introState=mode;document.body.dataset.introHandoff='ready';document.querySelector('.action')?.focus()}
function markPresentationHandoff(){if(!cinematicApplicable||(document.body.dataset.introState!=='visible'&&document.body.dataset.introHandoff==='ready'))document.body.dataset.introHandoff='gameplay-input'}
async function ensureAudio(){if(!audioCtx){const AC=window.AudioContext||window.webkitAudioContext;audioCtx=new AC();master=audioCtx.createGain();master.gain.value=Number($('volume').value);master.connect(audioCtx.destination);osc=audioCtx.createOscillator();osc.type='sine';osc.frequency.value=cfg.notes[0];osc.connect(master);osc.start()}if(audioCtx.state==='suspended')await audioCtx.resume();document.body.dataset.audioState=muted?'muted':'running'}
function applyAction(index){markPresentationHandoff();state.turn++;osc&&osc.frequency.setTargetAtTime(cfg.notes[index%cfg.notes.length],audioCtx.currentTime,.03);if(cfg.genre==='ACTION_SURVIVAL_ROGUELITE'){if(index===0){state.hp=Math.max(1,state.hp-3);state.progress+=8}else if(index===1){state.score+=12;state.resource+=5;state.progress+=12}else{state.hp=Math.min(100,state.hp+6);state.score+=3}}else if(cfg.genre==='SINGLE_DEFENSE_STRATEGY'){if(index===0&&state.resource>=5){state.resource-=5;state.score+=6;state.progress+=10}else if(index===1&&state.resource>=3){state.resource-=3;state.score+=9;state.progress+=7}else{state.wave++;state.resource+=12;state.hp=Math.max(1,state.hp-5)}}else if(cfg.genre==='PUZZLE'){state.hp=Math.max(0,state.hp-1);state.score+=index===1?18:10;state.resource+=index===2?0:1;state.progress+=8+index*4}else if(cfg.genre==='IDLE_GROWTH_RPG'){if(index===0){state.resource+=12}else if(index===1&&state.resource>=8){state.resource-=8;state.progress+=16}else{state.wave++;state.score+=15;state.hp=Math.max(10,state.hp-8)}}else if(cfg.genre==='STORY_COMPLETE_RPG'){state.progress+=8+index*3;state.score+=5+index*5;state.hp=Math.max(1,state.hp-(index===2?7:0))}else{state.score+=7+index*4;state.progress+=9+index*3;state.resource+=index===2?5:0}if(state.progress>=42){state.wave++;state.progress=0;state.score+=15}render(index)}
function render(index){$('score').textContent=state.score;$('health').textContent=state.hp;$('wave').textContent=state.wave;$('resource').textContent=state.resource;$('meter').style.width=Math.min(100,state.progress*2.1)+'%';const s=$('state');s.dataset.state='turn-'+state.turn;s.dataset.score=String(state.score);s.dataset.health=String(state.hp);s.dataset.resource=String(state.resource);s.dataset.progress=String(state.progress);$('status').innerHTML='STATUS: <span class="status-ok">'+cfg.labels[index]+'</span> · TURN '+state.turn+' · PROGRESS '+state.progress}
document.querySelectorAll('[data-intro-control]').forEach(button=>button.addEventListener('click',()=>dismissIntro(button.dataset.introControl==='skip'?'skipped':'continued')));
document.querySelectorAll('.action').forEach(button=>button.addEventListener('click',async()=>{if(cinematicApplicable&&document.body.dataset.introState==='visible')return;await ensureAudio();applyAction(Number(button.dataset.action))}));
document.addEventListener('keydown',async event=>{if(cinematicApplicable&&document.body.dataset.introState==='visible')return;if(['ArrowRight','ArrowUp','Space'].includes(event.code)||['ArrowRight','ArrowUp',' '].includes(event.key)){await ensureAudio();applyAction(state.turn%3)}});
$('mute').addEventListener('click',async()=>{if(cinematicApplicable&&document.body.dataset.introState==='visible')return;await ensureAudio();muted=!muted;master.gain.value=muted?0:Number($('volume').value);$('mute').textContent=muted?'음악 꺼짐':'음악 켜짐';document.body.dataset.audioState=muted?'muted':'running'});
$('volume').addEventListener('input',async()=>{if(cinematicApplicable&&document.body.dataset.introState==='visible')return;await ensureAudio();if(!muted)master.gain.value=Number($('volume').value)});render(0);
</script></body></html>`;
  return {html,validationQuestion:`${identity||gameName||gameId}의 잠긴 핵심 루프와 음악 런타임, 그리고 설계에 존재하는 연출/시네마틱의 첫 플레이 handoff가 모바일에서 정상 동작하는가?`,implementationNotes:[`locked DESIGN_BASELINE genre=${genre}`,cinematicApplicable?'baseline cinematic/intro intent preserved for runtime review':'no cinematic intent detected: presentation content not invented','first-gameplay-gesture Web Audio synth music','mute and volume runtime controls','no external assets, persistence, or network dependencies',`baseline core loop reference: ${loop||config.accent}`],cinematicApplicable,generationMode:'DETERMINISTIC_CONTRACT_RECOVERY'};
}

export async function buildFirstPlayable({gameId,gameName,baseline,artbook,sourcePath,candidatePath,candidateId,sourceCommit,model}){
  const cinematicApplicable=hasCinematicIntent(baseline);
  const prompt=`게임 ID: ${gameId}\n게임명: ${gameName}\nDESIGN_BASELINE:\n${clip(baseline)}\nARTBOOK:\n${clip(artbook,12000)}\n요구사항:\n- 단일 index.html 모바일 Web vertical slice.\n- DESIGN_BASELINE 핵심 루프를 실제 버튼/터치 입력과 보이는 상태 변화로 검증.\n- body에 data-cinematic-applicable=\"${cinematicApplicable?'true':'false'}\"를 기록.\n- DESIGN_BASELINE에 인트로/오프닝/컷신/시네마틱 의도가 있을 때만 해당 연출을 구현하고 continue 또는 skip과 첫 게임 입력 handoff 상태를 제공.\n- DESIGN_BASELINE에 연출 의도가 없으면 인트로/컷신을 새로 만들지 말고 첫 게임 입력으로 바로 진입.\n- 첫 게임 입력 전 음악 재생 금지. 첫 게임 입력에서 AudioContext를 생성/재개하고 data-audio-state를 locked에서 running 또는 muted로 바꿀 것.\n- data-audio-control=\"mute\" 버튼과 data-audio-control=\"volume\" 범위 입력을 제공.\n- 외부 URL/CDN/fetch/iframe/localStorage/sessionStorage 금지. Web Audio synth 사용 가능.\n- 390x844 모바일 화면에서 가로 넘침 금지.\n- inline JavaScript 문법 완전.\n- 최소 3회 게임 입력에도 상태가 계속 변화해야 함.\n- 기존 설계에 없는 대규모 시스템/세계관/연출 추가 금지.\n- HTML 전체를 html 필드에 반환.`;
  let result=null,last=[],modelAttempts=0;const modelContractFailures=[];
  for(let attempt=1;attempt<=2;attempt++){
    modelAttempts=attempt;
    try{result=await callModel({model,prompt,repair:last.join('|')});const review=validateBootstrapHtml(result.html);if(review.pass&&review.cinematicApplicable===cinematicApplicable){fs.mkdirSync(candidatePath,{recursive:true});fs.writeFileSync(path.join(candidatePath,'index.html'),result.html.endsWith('\n')?result.html:`${result.html}\n`,'utf8');return {result:{...result,cinematicApplicable,generationMode:'MODEL_GENERATED'},review,generation:{mode:'MODEL_GENERATED',modelAttempts,modelContractFailures}};}last=review.pass?['CINEMATIC_APPLICABILITY_MISMATCH']:review.blockers;modelContractFailures.push({attempt,blockers:[...last]});}
    catch(error){last=['MODEL_OUTPUT_ERROR'];modelContractFailures.push({attempt,error:clean(error?.message||error).slice(0,500)});}
  }
  const fallback=buildContractSafePlayable({gameId,gameName,baseline});const review=validateBootstrapHtml(fallback.html);if(!review.pass)throw new Error(`BOOTSTRAP_RECOVERY_CONTRACT_FAILED: ${review.blockers.join('|')}`);fs.mkdirSync(candidatePath,{recursive:true});fs.writeFileSync(path.join(candidatePath,'index.html'),fallback.html.endsWith('\n')?fallback.html:`${fallback.html}\n`,'utf8');return {result:fallback,review,generation:{mode:fallback.generationMode,modelAttempts,modelContractFailures}};
}

async function main(){
  const gameId=clean(arg('game-id')),gameName=clean(arg('game-name',gameId)),baselineFile=arg('baseline'),artbookFile=arg('artbook'),sourcePath=clean(arg('source-path')),candidateId=safeId(arg('candidate-id')),candidatePath=clean(arg('candidate-path')),sourceCommit=clean(arg('source-commit')),model=clean(arg('model',process.env.AUTONOMOUS_LOCAL_MODEL||'llama3.2:1b')),evidenceFile=clean(arg('evidence'));
  if(!gameId||!baselineFile||!artbookFile||!sourcePath||!candidateId||!candidatePath||!sourceCommit||!evidenceFile)throw new Error('required bootstrap argument missing');
  if(!sourcePath.startsWith('web-games/')||!candidatePath.startsWith('web-games/.autonomous-candidates/'))throw new Error('invalid source/candidate path');
  const baseline=readJson(baselineFile),artbook=readJson(artbookFile);
  const {result,review,generation}=await buildFirstPlayable({gameId,gameName,baseline,artbook,sourcePath,candidatePath,candidateId,sourceCommit,model});
  const evidence={version:5,candidateId,gameId,sourcePath,candidatePath,sourceCommit,candidateOnly:true,selfPromote:false,publicStableModified:false,paidApi:false,newProject:true,changedFiles:['index.html'],summary:`DEVELOPMENT_CONFIRMED required Web gameplay/music/cinematic-direction candidate: ${result.validationQuestion}`,expectedEffect:'DESIGN_BASELINE 핵심 루프와 사용자 제스처 기반 음악 런타임을 검증하고, 기존 설계에 연출이 있을 때만 시네마틱/컷신 handoff를 검증',tests:['company-development-web-bootstrap-contract','company-development-web-gameplay-validation','independent-candidate-browser-qa'],validationQuestion:result.validationQuestion,implementationNotes:result.implementationNotes,musicRuntimeRequired:true,cinematicDepartmentReviewRequired:true,cinematicContentRequired:false,cinematicApplicable:result.cinematicApplicable===true,model,generationMode:generation.mode,modelAttempts:generation.modelAttempts,modelContractFailures:generation.modelContractFailures,bootstrapContract:review,createdAt:new Date().toISOString()};
  writeJson(evidenceFile,evidence);
  console.log('DEVELOPMENT_WEB_BOOTSTRAP=PASS');console.log(`GAME_ID=${gameId}`);console.log(`CANDIDATE_ID=${candidateId}`);console.log(`BOOTSTRAP_GENERATION_MODE=${generation.mode}`);console.log('MUSIC_RUNTIME_REQUIRED=YES');console.log('CINEMATIC_DEPARTMENT_REVIEW_REQUIRED=YES');console.log(`CINEMATIC_CONTENT_APPLICABLE=${result.cinematicApplicable===true?'YES':'NO'}`);console.log('PAID_API=NO');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});}
