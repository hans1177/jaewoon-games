import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const clean=value=>String(value??'').trim();
const arg=(name,fallback='')=>process.argv.find(x=>x.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clip=(value,max=18000)=>{const text=typeof value==='string'?value:JSON.stringify(value);return text.length>max?text.slice(0,max):text;};
const safeId=value=>clean(value).replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120);
const htmlEscape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const safeDesignText=value=>clean(value).replace(/https?:\/\/\S+/gi,'').replace(/\b(?:localStorage|sessionStorage|XMLHttpRequest|WebSocket|fetch)\b/gi,'runtime').slice(0,260);

export function validateBootstrapHtml(html){
  const text=String(html??'');
  const blockers=[];
  if(Buffer.byteLength(text,'utf8')<1800)blockers.push('HTML_TOO_SMALL');
  if(Buffer.byteLength(text,'utf8')>220000)blockers.push('HTML_TOO_LARGE');
  if(!/<(?:!doctype\s+html|html)[\s>]/i.test(text))blockers.push('HTML_DOCUMENT_REQUIRED');
  if(!/<script[\s>]/i.test(text))blockers.push('SCRIPT_REQUIRED');
  if(!/(<button\b|<canvas\b|role=["']button["'])/i.test(text))blockers.push('INTERACTIVE_SURFACE_REQUIRED');
  if(!/(addEventListener\s*\(|onclick\s*=)/i.test(text))blockers.push('INPUT_HANDLER_REQUIRED');
  if(!/(score|health|hp|turn|wave|resource|progress|energy|state|status|combo|level)/i.test(text))blockers.push('VISIBLE_GAME_STATE_REQUIRED');
  if(/\b(?:localStorage|sessionStorage)\b/.test(text))blockers.push('PERSISTENT_STORAGE_FORBIDDEN_ON_BOOTSTRAP');
  if(/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(text))blockers.push('NETWORK_API_FORBIDDEN');
  if(/<(?:iframe|object|embed)\b/i.test(text))blockers.push('EMBED_FORBIDDEN');
  if(/(?:src|href)\s*=\s*["']https?:\/\//i.test(text))blockers.push('EXTERNAL_ASSET_FORBIDDEN');
  return {pass:blockers.length===0,blockers,bytes:Buffer.byteLength(text,'utf8')};
}

const OUTPUT_SCHEMA={
  type:'object',
  required:['html','validationQuestion','implementationNotes'],
  additionalProperties:false,
  properties:{
    html:{type:'string'},
    validationQuestion:{type:'string'},
    implementationNotes:{type:'array',items:{type:'string'},maxItems:8}
  }
};

async function callModel({model,prompt,repair=''}){
  const response=await fetch('http://127.0.0.1:11434/api/chat',{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({
      model,stream:false,think:false,format:OUTPUT_SCHEMA,
      messages:[
        {role:'system',content:'너는 재운컴퍼니 2분류 개발 AI다. 잠긴 DESIGN_BASELINE을 재기획하지 않고 Unity 이전 실제 플레이 검증용 Web vertical slice를 만든다. 외부 네트워크/외부 에셋/저장소를 사용하지 않는다.'},
        {role:'user',content:`${prompt}${repair?`\n이전 출력 검증 실패를 반드시 수정하라: ${repair}`:''}`}
      ],
      options:{temperature:repair?0:0.15,num_ctx:16384,num_predict:7000}
    })
  });
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
    ACTION_SURVIVAL_ROGUELITE:{tag:'생존 전투',accent:'위협을 피하고 공격해 웨이브를 버틴다',buttons:['회피','공격','강화'],initial:{score:0,hp:100,wave:1,resource:0,progress:0},step:(s,i)=>{if(i===0){s.hp=Math.max(1,s.hp-3);s.progress+=8;}else if(i===1){s.score+=12;s.resource+=5;s.progress+=12;}else{s.resource=Math.max(0,s.resource-3);s.hp=Math.min(100,s.hp+6);s.score+=3;}if(s.progress>=36){s.wave++;s.progress=0;s.score+=20;} }},
    SINGLE_DEFENSE_STRATEGY:{tag:'방어 전략',accent:'자원을 배치와 강화에 써서 다음 웨이브를 막는다',buttons:['수비 배치','수비 강화','웨이브 진행'],initial:{score:0,hp:100,wave:1,resource:30,progress:0},step:(s,i)=>{if(i===0){if(s.resource>=5){s.resource-=5;s.score+=6;s.progress+=10;}}else if(i===1){if(s.resource>=3){s.resource-=3;s.score+=9;s.progress+=7;}}else{s.wave++;s.resource+=12;s.hp=Math.max(1,s.hp-Math.max(2,10-Math.floor(s.score/20)));s.progress+=14;} }},
    PUZZLE:{tag:'퍼즐',accent:'제한된 수 안에서 색 조합을 만들고 콤보를 이어간다',buttons:['색 맞추기','연쇄 만들기','보드 정리'],initial:{score:0,hp:12,wave:1,resource:0,progress:0},step:(s,i)=>{s.hp=Math.max(0,s.hp-1);if(i===0){s.score+=10;s.resource+=1;s.progress+=9;}else if(i===1){s.score+=18+s.resource*2;s.resource++;s.progress+=13;}else{s.score+=6;s.resource=0;s.progress+=6;}if(s.progress>=40){s.wave++;s.progress=0;s.hp+=4;} }},
    IDLE_GROWTH_RPG:{tag:'성장 RPG',accent:'보상을 회수하고 성장시킨 뒤 더 높은 스테이지에 도전한다',buttons:['보상 회수','레벨 강화','스테이지 도전'],initial:{score:0,hp:100,wave:1,resource:20,progress:0},step:(s,i)=>{if(i===0){s.resource+=12;s.score+=4;}else if(i===1){if(s.resource>=8){s.resource-=8;s.progress+=16;s.score+=8;}}else{s.wave++;s.score+=15+Math.floor(s.progress/4);s.hp=Math.max(10,s.hp-8);s.resource+=5;}if(s.progress>=48){s.progress=0;s.hp=Math.min(100,s.hp+20);} }},
    STORY_COMPLETE_RPG:{tag:'스토리 RPG',accent:'탐험과 선택, 전투를 통해 한 장면의 목표를 완수한다',buttons:['탐험','선택','전투'],initial:{score:0,hp:100,wave:1,resource:3,progress:0},step:(s,i)=>{if(i===0){s.progress+=10;s.resource++;s.score+=5;}else if(i===1){s.progress+=8;s.score+=8;s.resource=Math.max(0,s.resource-1);}else{s.hp=Math.max(1,s.hp-7);s.progress+=15;s.score+=15;}if(s.progress>=45){s.wave++;s.progress=0;s.hp=Math.min(100,s.hp+12);s.score+=20;} }},
    CASUAL:{tag:'캐주얼',accent:'짧은 입력으로 점수와 진행도를 올리고 즉시 다음 선택을 한다',buttons:['탭','도전','보상'],initial:{score:0,hp:100,wave:1,resource:0,progress:0},step:(s,i)=>{if(i===0){s.score+=7;s.progress+=9;}else if(i===1){s.score+=12;s.hp=Math.max(1,s.hp-4);s.progress+=14;}else{s.resource+=5;s.score+=4;s.progress+=6;}if(s.progress>=42){s.wave++;s.progress=0;s.hp=Math.min(100,s.hp+8);} }}
  };
  return configs[genre]||configs.CASUAL;
}

export function buildContractSafePlayable({gameId='',gameName='',baseline={}}={}){
  const genre=inferDevelopmentGenre({gameId,baseline});
  const config=genreConfig(genre);
  const content=baseline?.content||{};
  const identity=safeDesignText(content.identity||gameName||gameId||'Development Validation');
  const coreFun=safeDesignText(content.coreFun||config.accent);
  const loop=safeDesignText(Array.isArray(content.coreLoop)?content.coreLoop[0]:'')||config.accent;
  const title=htmlEscape(identity||gameName||gameId);
  const subtitle=htmlEscape(coreFun);
  const loopText=htmlEscape(loop);
  const buttons=config.buttons.map((label,index)=>`<button class="action" data-action="${index}" type="button">${htmlEscape(label)}</button>`).join('');
  const runtime={genre,initial:config.initial,labels:config.buttons};
  const html=`<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${title}</title>
<style>
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#0d1220;color:#f4f7fb;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}body{display:flex;justify-content:center;overflow-x:hidden}.game{width:min(100%,430px);min-height:100vh;padding:18px 16px 30px;background:linear-gradient(180deg,#141d32,#0b1020 62%,#070b14)}.eyebrow{font-size:12px;letter-spacing:.08em;color:#9db5df;font-weight:800}.hero{margin-top:8px;padding:18px;border:1px solid #293753;border-radius:22px;background:rgba(23,33,55,.92);box-shadow:0 18px 50px rgba(0,0,0,.25)}h1{font-size:26px;line-height:1.1;margin:6px 0 10px}.desc{font-size:14px;line-height:1.45;color:#c6d2e7;margin:0}.arena{position:relative;margin:16px 0;height:238px;border-radius:22px;border:1px solid #31415f;overflow:hidden;background:radial-gradient(circle at 50% 35%,#25385e,#111a2d 56%,#090f1b)}.orb{position:absolute;border-radius:50%;filter:drop-shadow(0 8px 12px rgba(0,0,0,.35))}.player{width:62px;height:62px;left:calc(50% - 31px);top:88px;background:linear-gradient(145deg,#dbeafe,#60a5fa);border:5px solid rgba(255,255,255,.35)}.enemy{width:42px;height:42px;background:linear-gradient(145deg,#fca5a5,#ef4444)}.e1{left:34px;top:42px}.e2{right:32px;top:62px}.e3{left:70px;bottom:28px}.pulse{position:absolute;inset:auto 18px 16px 18px;height:8px;border-radius:9px;background:#1f2b45;overflow:hidden}.pulse>span{display:block;height:100%;width:0;background:linear-gradient(90deg,#60a5fa,#a78bfa);transition:width .2s}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.stat{padding:10px 7px;border-radius:14px;background:#111a2d;border:1px solid #283652;text-align:center}.stat b{display:block;font-size:18px}.stat small{font-size:10px;color:#9db0cf}.controls{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:14px}.action{min-height:56px;border:0;border-radius:16px;background:#eef4ff;color:#111827;font-weight:850;font-size:14px;box-shadow:0 6px 0 #8398bc;touch-action:manipulation}.action:active{transform:translateY(3px);box-shadow:0 3px 0 #8398bc}.log{margin-top:12px;padding:12px 14px;border-radius:14px;background:#0a1020;border:1px solid #273653;font-size:12px;color:#b8c7e0;min-height:42px}.rule{margin-top:13px;font-size:12px;line-height:1.45;color:#8fa5c8}.status-ok{color:#86efac}@media(max-width:350px){.game{padding-left:10px;padding-right:10px}.stats{grid-template-columns:repeat(2,1fr)}.controls{grid-template-columns:1fr}.arena{height:210px}}
</style></head><body><main class="game"><section class="hero"><div class="eyebrow">DEVELOPMENT_CONFIRMED · ${htmlEscape(config.tag)}</div><h1>${title}</h1><p class="desc">${subtitle}</p></section><section class="arena" aria-label="gameplay arena"><div class="orb player"></div><div class="orb enemy e1"></div><div class="orb enemy e2"></div><div class="orb enemy e3"></div><div class="pulse"><span id="meter"></span></div></section><section class="stats" id="state" data-state="ready" data-score="0" data-health="100" data-resource="0" data-progress="0"><div class="stat"><b id="score">0</b><small>SCORE</small></div><div class="stat"><b id="health">100</b><small>HP</small></div><div class="stat"><b id="wave">1</b><small>WAVE / LEVEL</small></div><div class="stat"><b id="resource">0</b><small>RESOURCE</small></div></section><section class="controls">${buttons}</section><div class="log" id="status" aria-live="polite">STATUS: 준비 · 버튼을 눌러 핵심 루프를 시작하세요.</div><p class="rule">검증 루프: ${loopText}</p></main>
<script>
const cfg=${JSON.stringify(runtime)};
const state={...cfg.initial,turn:0};
const scoreEl=document.querySelector('#score'),healthEl=document.querySelector('#health'),waveEl=document.querySelector('#wave'),resourceEl=document.querySelector('#resource'),statusEl=document.querySelector('#status'),meter=document.querySelector('#meter'),stateEl=document.querySelector('#state');
function applyAction(index){
 state.turn+=1;
 const genre=cfg.genre;
 if(genre==='ACTION_SURVIVAL_ROGUELITE'){if(index===0){state.hp=Math.max(1,state.hp-3);state.progress+=8;}else if(index===1){state.score+=12;state.resource+=5;state.progress+=12;}else{state.resource=Math.max(0,state.resource-3);state.hp=Math.min(100,state.hp+6);state.score+=3;}if(state.progress>=36){state.wave++;state.progress=0;state.score+=20;}}
 else if(genre==='SINGLE_DEFENSE_STRATEGY'){if(index===0&&state.resource>=5){state.resource-=5;state.score+=6;state.progress+=10;}else if(index===1&&state.resource>=3){state.resource-=3;state.score+=9;state.progress+=7;}else if(index===2){state.wave++;state.resource+=12;state.hp=Math.max(1,state.hp-Math.max(2,10-Math.floor(state.score/20)));state.progress+=14;}}
 else if(genre==='PUZZLE'){state.hp=Math.max(0,state.hp-1);if(index===0){state.score+=10;state.resource+=1;state.progress+=9;}else if(index===1){state.score+=18+state.resource*2;state.resource++;state.progress+=13;}else{state.score+=6;state.resource=0;state.progress+=6;}if(state.progress>=40){state.wave++;state.progress=0;state.hp+=4;}}
 else if(genre==='IDLE_GROWTH_RPG'){if(index===0){state.resource+=12;state.score+=4;}else if(index===1&&state.resource>=8){state.resource-=8;state.progress+=16;state.score+=8;}else if(index===2){state.wave++;state.score+=15+Math.floor(state.progress/4);state.hp=Math.max(10,state.hp-8);state.resource+=5;}if(state.progress>=48){state.progress=0;state.hp=Math.min(100,state.hp+20);}}
 else if(genre==='STORY_COMPLETE_RPG'){if(index===0){state.progress+=10;state.resource++;state.score+=5;}else if(index===1){state.progress+=8;state.score+=8;state.resource=Math.max(0,state.resource-1);}else{state.hp=Math.max(1,state.hp-7);state.progress+=15;state.score+=15;}if(state.progress>=45){state.wave++;state.progress=0;state.hp=Math.min(100,state.hp+12);state.score+=20;}}
 else{if(index===0){state.score+=7;state.progress+=9;}else if(index===1){state.score+=12;state.hp=Math.max(1,state.hp-4);state.progress+=14;}else{state.resource+=5;state.score+=4;state.progress+=6;}if(state.progress>=42){state.wave++;state.progress=0;state.hp=Math.min(100,state.hp+8);}}
 render(index);
}
function render(index){scoreEl.textContent=state.score;healthEl.textContent=state.hp;waveEl.textContent=state.wave;resourceEl.textContent=state.resource;meter.style.width=Math.min(100,state.progress*2.1)+'%';stateEl.dataset.state='turn-'+state.turn;stateEl.dataset.score=String(state.score);stateEl.dataset.health=String(state.hp);stateEl.dataset.resource=String(state.resource);stateEl.dataset.progress=String(state.progress);statusEl.innerHTML='STATUS: <span class="status-ok">'+cfg.labels[index]+'</span> · TURN '+state.turn+' · PROGRESS '+state.progress;}
document.querySelectorAll('.action').forEach(button=>button.addEventListener('click',()=>applyAction(Number(button.dataset.action))));
document.addEventListener('keydown',event=>{if(['ArrowRight','ArrowUp','Space'].includes(event.code)||['ArrowRight','ArrowUp',' '].includes(event.key)){applyAction(state.turn%3);}});
render(0);
</script></body></html>`;
  return {
    html,
    validationQuestion:`${identity||gameName||gameId}의 잠긴 핵심 루프가 모바일 입력 후 SCORE/HP/WAVE/RESOURCE/PROGRESS 상태 변화로 실제 검증되는가?`,
    implementationNotes:[
      `locked DESIGN_BASELINE genre=${genre}`,
      'model output contract recovery: deterministic self-contained vertical slice',
      'no external assets, persistence, or network dependencies',
      `baseline core loop reference: ${loop||config.accent}`
    ],
    generationMode:'DETERMINISTIC_CONTRACT_RECOVERY'
  };
}

export async function buildFirstPlayable({gameId,gameName,baseline,artbook,sourcePath,candidatePath,candidateId,sourceCommit,model}){
  const prompt=`게임 ID: ${gameId}\n게임명: ${gameName}\n\nDESIGN_BASELINE:\n${clip(baseline)}\n\nARTBOOK:\n${clip(artbook,12000)}\n\n요구사항:\n- 단일 index.html 하나로 완전히 동작하는 모바일 Web 테스트베드를 만든다. CSS/JS를 파일 안에 포함한다.\n- 최종 Web 제품이 아니라 Unity 전 핵심 루프 검증용 작은 vertical slice다.\n- DESIGN_BASELINE의 핵심 판타지/루프/시그니처 시스템 중 실제 상호작용으로 검증 가능한 최소 1개를 플레이 가능하게 만든다.\n- 첫 화면에 명확한 시작 또는 핵심행동 버튼이 보여야 하며 버튼/터치 입력 뒤 점수·체력·자원·턴·진행도 등 보이는 게임 상태가 실제로 변해야 한다.\n- 390x844 모바일 화면에서 가로 넘침 없이 동작한다.\n- 외부 URL, CDN, fetch, iframe, localStorage/sessionStorage 사용 금지.\n- 텍스트 설명만 있는 목업 금지. 실제 상태·규칙·성공/실패 또는 진행 변화가 있어야 한다.\n- 자동 검증이 최소 3회 버튼 클릭을 해도 예외 없이 상태가 계속 바뀌게 한다.\n- 기존 설계에 없는 대규모 시스템이나 새로운 세계관을 추가하지 않는다.\n- HTML 전체를 html 필드에 반환한다.`;
  let result=null,last=[],modelAttempts=0;
  const modelContractFailures=[];
  for(let attempt=1;attempt<=2;attempt++){
    modelAttempts=attempt;
    try{
      result=await callModel({model,prompt,repair:last.join('|')});
      const review=validateBootstrapHtml(result.html);
      if(review.pass){
        fs.mkdirSync(candidatePath,{recursive:true});
        fs.writeFileSync(path.join(candidatePath,'index.html'),result.html.endsWith('\n')?result.html:`${result.html}\n`,'utf8');
        return {result:{...result,generationMode:'MODEL_GENERATED'},review,generation:{mode:'MODEL_GENERATED',modelAttempts,modelContractFailures}};
      }
      last=review.blockers;
      modelContractFailures.push({attempt,blockers:[...review.blockers]});
    }catch(error){
      last=['MODEL_OUTPUT_ERROR'];
      modelContractFailures.push({attempt,error:clean(error?.message||error).slice(0,500)});
    }
  }
  const fallback=buildContractSafePlayable({gameId,gameName,baseline});
  const review=validateBootstrapHtml(fallback.html);
  if(!review.pass)throw new Error(`BOOTSTRAP_RECOVERY_CONTRACT_FAILED: ${review.blockers.join('|')}`);
  fs.mkdirSync(candidatePath,{recursive:true});
  fs.writeFileSync(path.join(candidatePath,'index.html'),fallback.html.endsWith('\n')?fallback.html:`${fallback.html}\n`,'utf8');
  return {result:fallback,review,generation:{mode:fallback.generationMode,modelAttempts,modelContractFailures}};
}

async function main(){
  const gameId=clean(arg('game-id'));
  const gameName=clean(arg('game-name',gameId));
  const baselineFile=arg('baseline');
  const artbookFile=arg('artbook');
  const sourcePath=clean(arg('source-path'));
  const candidateId=safeId(arg('candidate-id'));
  const candidatePath=clean(arg('candidate-path'));
  const sourceCommit=clean(arg('source-commit'));
  const model=clean(arg('model',process.env.AUTONOMOUS_LOCAL_MODEL||'llama3.2:1b'));
  const evidenceFile=clean(arg('evidence'));
  if(!gameId||!baselineFile||!artbookFile||!sourcePath||!candidateId||!candidatePath||!sourceCommit||!evidenceFile)throw new Error('required bootstrap argument missing');
  if(!sourcePath.startsWith('web-games/')||!candidatePath.startsWith('web-games/.autonomous-candidates/'))throw new Error('invalid source/candidate path');
  const baseline=readJson(baselineFile),artbook=readJson(artbookFile);
  const {result,review,generation}=await buildFirstPlayable({gameId,gameName,baseline,artbook,sourcePath,candidatePath,candidateId,sourceCommit,model});
  const evidence={
    version:2,candidateId,gameId,sourcePath,candidatePath,sourceCommit,
    candidateOnly:true,selfPromote:false,publicStableModified:false,paidApi:false,
    newProject:true,changedFiles:['index.html'],
    summary:`DEVELOPMENT_CONFIRMED first playable: ${result.validationQuestion}`,
    expectedEffect:'DESIGN_BASELINE 핵심 루프를 모바일 실제 상호작용으로 검증할 수 있는 첫 Web vertical slice 생성',
    tests:['company-development-web-bootstrap-contract','company-development-web-gameplay-validation','independent-candidate-browser-qa'],
    validationQuestion:result.validationQuestion,implementationNotes:result.implementationNotes,
    model,generationMode:generation.mode,modelAttempts:generation.modelAttempts,modelContractFailures:generation.modelContractFailures,
    bootstrapContract:review,createdAt:new Date().toISOString()
  };
  writeJson(evidenceFile,evidence);
  console.log('DEVELOPMENT_WEB_BOOTSTRAP=PASS');
  console.log(`GAME_ID=${gameId}`);
  console.log(`CANDIDATE_ID=${candidateId}`);
  console.log(`BOOTSTRAP_MODEL=${model}`);
  console.log(`BOOTSTRAP_GENERATION_MODE=${generation.mode}`);
  console.log(`BOOTSTRAP_MODEL_ATTEMPTS=${generation.modelAttempts}`);
  console.log('PAID_API=NO');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});}
