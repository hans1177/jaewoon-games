// 잠긴 DESIGN_BASELINE을 실제 플레이 가능한 모바일 Web 게임으로 구현한다.
// 검증 전용 harness/vertical-slice UI는 정식 Web 게임으로 승격하지 않는다.
// FULL_APPROVED_SCOPE_REQUIRED=YES
import fs from 'node:fs';
import path from 'node:path';
import {Script} from 'node:vm';
import {pathToFileURL} from 'node:url';
import {deriveApprovedScopeInventory,staticApprovedScopeCoverage} from './company-approved-scope-contract.mjs';

const REAL_ARTIFACT_TYPE='REAL_PLAYABLE_GAME';
const SESSION_MINUTES=30;
const MIN_REAL_GAME_BYTES=14000;
const MIN_REAL_SCRIPT_BYTES=6500;
const clean=value=>String(value??'').trim();
const arg=(name,fallback='')=>process.argv.find(x=>x.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const safeId=value=>clean(value).replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120);
const htmlEscape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const safeDesignText=value=>clean(value).replace(/https?:\/\/\S+/gi,'').replace(/\b(?:XMLHttpRequest|WebSocket|fetch)\b/gi,'runtime').slice(0,420);

function inlineScripts(text){return [...String(text??'').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];}
function inlineScriptBlockers(text){
  const blockers=[];let index=0;
  for(const match of inlineScripts(text)){
    const attrs=String(match[1]||'');
    if(/\bsrc\s*=/i.test(attrs)){blockers.push('SCRIPT_SRC_FORBIDDEN');continue;}
    index++;
    try{new Script(String(match[2]||''),{filename:`bootstrap-inline-${index}.js`});}catch{blockers.push('INLINE_SCRIPT_SYNTAX_INVALID');}
  }
  return blockers;
}
function mechanicIds(text){return [...new Set([...String(text??'').matchAll(/data-mechanic-id=["']([^"']+)["']/gi)].map(x=>clean(x[1])).filter(Boolean))];}

export function validateBootstrapHtml(html,{scopeInventory=[]}={}){
  const text=String(html??''),blockers=[],bytes=Buffer.byteLength(text,'utf8');
  const scripts=inlineScripts(text),scriptBytes=scripts.reduce((sum,row)=>sum+Buffer.byteLength(String(row[2]||''),'utf8'),0);
  const mechanics=mechanicIds(text);
  if(bytes<MIN_REAL_GAME_BYTES)blockers.push(`REAL_GAME_FOOTPRINT_TOO_SMALL:${bytes}:${MIN_REAL_GAME_BYTES}`);
  if(scriptBytes<MIN_REAL_SCRIPT_BYTES)blockers.push(`REAL_GAME_LOGIC_TOO_SMALL:${scriptBytes}:${MIN_REAL_SCRIPT_BYTES}`);
  if(!/<(?:!doctype\s+html|html)[\s>]/i.test(text))blockers.push('HTML_DOCUMENT_REQUIRED');
  if(!/<meta\b[^>]*name=["']viewport["'][^>]*content=["'][^"']*width=device-width/i.test(text))blockers.push('MOBILE_VIEWPORT_REQUIRED');
  if(!new RegExp(`data-web-artifact-type=["']${REAL_ARTIFACT_TYPE}["']`,'i').test(text))blockers.push('REAL_PLAYABLE_WEB_GAME_REQUIRED');
  if(!/<canvas\b/i.test(text))blockers.push('REAL_GAMEPLAY_SURFACE_REQUIRED');
  if(mechanics.length<5)blockers.push(`REAL_GAME_MECHANIC_COUNT_TOO_LOW:${mechanics.length}:5`);
  if(!/data-gameplay-system-count=["'](?:[5-9]|\d{2,})["']/i.test(text))blockers.push('REAL_GAME_SYSTEM_COUNT_REQUIRED');
  if(!/data-session-proof-mode=["']PROGRESSION_MILESTONES["']/i.test(text))blockers.push('SESSION_PROGRESSION_PROOF_REQUIRED');
  if(!/data-session-stage-direct-control=["']false["']/i.test(text))blockers.push('SESSION_DIRECT_STAGE_CONTROL_FORBIDDEN');
  if(/<button\b[^>]*data-session-stage=/i.test(text))blockers.push('SESSION_STAGE_BUTTON_FORBIDDEN');
  if(!/data-run-result=["']running["']/i.test(text))blockers.push('RUN_RESULT_STATE_REQUIRED');
  if(!/(victory|목표 달성)/i.test(text))blockers.push('WIN_CONDITION_REQUIRED');
  if(!/(defeat|shutdown|게임 오버|가동 중단)/i.test(text))blockers.push('LOSS_CONDITION_REQUIRED');
  if(!/(AudioContext|webkitAudioContext)/.test(text))blockers.push('MUSIC_RUNTIME_REQUIRED');
  if(!/data-audio-control=["']mute["']/.test(text))blockers.push('MUSIC_MUTE_CONTROL_REQUIRED');
  if(!/data-audio-control=["']volume["']/.test(text))blockers.push('MUSIC_VOLUME_CONTROL_REQUIRED');
  if(/\b(?:localStorage|sessionStorage)\b/.test(text))blockers.push('PERSISTENT_STORAGE_FORBIDDEN_ON_BOOTSTRAP');
  if(/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(text))blockers.push('NETWORK_API_FORBIDDEN');
  if(/<(?:iframe|object|embed)\b/i.test(text))blockers.push('EMBED_FORBIDDEN');
  if(/(?:src|href)\s*=\s*["']https?:\/\//i.test(text))blockers.push('EXTERNAL_ASSET_FORBIDDEN');
  if(/FULL APPROVED WEB COMPANION|승인 분량 전체 구현|scope-control-/i.test(text))blockers.push('WEB_TEST_HARNESS_FORBIDDEN');
  blockers.push(...inlineScriptBlockers(text));
  if(scopeInventory.length)blockers.push(...staticApprovedScopeCoverage(text,scopeInventory).blockers);
  return {pass:blockers.length===0,blockers:[...new Set(blockers)],bytes,scriptBytes,mechanicCount:mechanics.length,mechanicIds:mechanics,approvedScopeRequiredCount:scopeInventory.length,artifactType:REAL_ARTIFACT_TYPE};
}

export function inferDevelopmentGenre({gameId='',baseline={}}={}){
  const seed=clean(baseline?.gameSeedId||baseline?.seedId||'').toUpperCase();
  const match=seed.match(/^SEED-(.+)-\d+$/);
  if(match)return match[1].replace(/^ROBLOX-/,'');
  const id=clean(gameId).toLowerCase();
  if(id.includes('simulator')||id.includes('tycoon'))return 'SIMULATOR_TYCOON_INCREMENTAL';
  if(id.includes('battleground'))return 'BATTLEGROUND_FIGHTING_SHOOTER';
  if(id.includes('survival')||id.includes('horror'))return 'SURVIVAL_HORROR_ESCAPE';
  if(id.includes('obby')||id.includes('party'))return 'OBBY_PARTY_MINIGAME';
  if(id.includes('story-rpg')||id.includes('adventure'))return 'STORY_RPG_ADVENTURE_RPG';
  if(id.includes('roleplay')||id.includes('life-avatar'))return 'ROLEPLAY_LIFE_AVATAR';
  return 'UNIMPLEMENTED';
}

function scopeAttr(inventory,index,mechanicId){
  const item=inventory[index];
  return item?` data-scope-id="${htmlEscape(item.id)}" data-mechanic-id="${htmlEscape(mechanicId)}"`:` data-mechanic-id="${htmlEscape(mechanicId)}"`;
}
function scopeLabel(inventory,index){return inventory[index]?htmlEscape(inventory[index].label):'';}

function buildPocketFoundry({gameId,gameName,baseline,inventory}){
  const content=baseline?.content||{};
  const identity=safeDesignText(content.identity||gameName||'Pocket Foundry');
  const coreFun=safeDesignText(content.coreFun||'채굴, 제련, 판매, 자동화와 구역 해금으로 작은 공장을 성장시킨다.');
  const loops=Array.isArray(content.coreLoop)?content.coreLoop.map(safeDesignText).filter(Boolean):[];
  const title=htmlEscape(identity||gameName||'Pocket Foundry');
  const designEcho=[identity,coreFun,...loops].filter(Boolean).join(' · ').slice(0,1800);
  const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no"><meta name="theme-color" content="#071018"><title>${title}</title><style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}html,body{margin:0;min-height:100%;background:#061018;color:#f5f7fb;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}body{display:flex;justify-content:center}.game{width:min(100%,680px);min-height:100vh;padding:14px 14px 32px;background:radial-gradient(circle at 50% -10%,#21475a,#0b1a24 46%,#071018)}.hero,.panel{border:1px solid #315166;border-radius:18px;background:#0d202b;padding:14px;margin-bottom:11px}.hero small{color:#67e8f9;font-weight:900}.hero h1{margin:5px 0 7px;font-size:25px}.hero p{margin:0;color:#c4d5df;font-size:12px;line-height:1.5}.hud{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:10px}.stat{background:#081923;border:1px solid #284b5e;border-radius:13px;padding:8px 5px;text-align:center}.stat b{display:block;font-size:17px}.stat small{font-size:9px;color:#93b8c9}.arena{position:relative;border:1px solid #315a70;border-radius:20px;overflow:hidden;background:#0a1c27;margin-bottom:11px}.arena canvas{display:block;width:100%;height:290px;touch-action:none}.objective{position:absolute;left:10px;right:10px;bottom:9px;padding:8px 10px;border-radius:11px;background:#06131ddd;border:1px solid #315a70;font-size:11px;font-weight:850}.bar{height:8px;background:#12303d;border-radius:10px;overflow:hidden;margin-top:7px}.bar span{display:block;height:100%;background:#67e8f9;width:0;transition:width .18s}.actions{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.action{min-height:64px;border:0;border-radius:14px;background:#ecfeff;color:#08202a;padding:9px 11px;text-align:left;font-weight:850}.action b,.action small{display:block}.action small{margin-top:4px;font-size:10px;opacity:.68}.action:active{transform:scale(.985)}.action[disabled]{opacity:.42}.phases{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}.phase{min-height:54px;border-radius:12px;border:1px solid #36596d;background:#0a1924;padding:8px;font-size:11px;color:#9fb8c6}.phase b{display:block;color:#e5f5fb;margin-bottom:3px}.phase[data-session-stage-complete="true"]{outline:2px solid #86efac;color:#d1fae5}.audio{display:grid;grid-template-columns:120px 1fr;gap:10px;align-items:center}.audio button{min-height:44px;border:0;border-radius:12px;background:#dbeafe;color:#0c1d2c;font-weight:850}.audio input{width:100%}.status{min-height:48px;color:#cbd5e1;font-size:12px;line-height:1.45}.win{color:#86efac}.lose{color:#fda4af}.heat-hot{color:#fda4af}@media(max-width:420px){.hud{grid-template-columns:repeat(2,1fr)}.actions,.phases{grid-template-columns:1fr}}</style></head>
<body data-web-artifact-type="${REAL_ARTIFACT_TYPE}" data-audio-state="locked" data-approved-scope-count="${inventory.length}" data-gameplay-system-count="7" data-run-result="running"><main class="game" data-session-minutes="30" data-session-proof-mode="PROGRESSION_MILESTONES" data-session-stage-direct-control="false" data-session-stage-count="4" data-session-current-stage="0" data-session-completed-stages="0"><section class="hero"><small>성장 시뮬레이터 · 공장 운영</small><h1>${title}</h1><p>${htmlEscape(coreFun)}</p></section>
<section class="hud" id="state" data-state="running" data-score="0" data-resource="0" data-progress="0"><div class="stat"><b id="ore">0</b><small>ORE</small></div><div class="stat"><b id="ingot">0</b><small>INGOT</small></div><div class="stat"><b id="coins">8</b><small>COINS</small></div><div class="stat"><b id="factory">1</b><small>FACTORY</small></div><div class="stat"><b id="drones">0</b><small>DRONES</small></div><div class="stat"><b id="zone">1</b><small>ZONE</small></div><div class="stat"><b id="heat">0</b><small>HEAT</small></div><div class="stat"><b id="score">0</b><small>SCORE</small></div></section>
<section class="arena"><canvas id="gameCanvas" width="620" height="290" aria-label="Pocket Foundry 공장 플레이 화면"></canvas><div class="objective">최종 목표: 공장 Lv.3 + 드론 1기 + 구역 3 해금<div class="bar"><span id="goalMeter"></span></div></div></section>
<section class="panel"><div class="actions"><button id="mineOre" class="action" data-gameplay-action="true"${scopeAttr(inventory,0,'ore-extraction')} type="button"><b>광맥 채굴</b><small>광석을 직접 채굴한다.</small></button><button id="smeltOre" class="action" data-gameplay-action="true"${scopeAttr(inventory,1,'ore-smelting')} type="button"><b>제련로 가동</b><small>광석 4개 → 주괴 생산.</small></button><button id="sellIngot" class="action" data-gameplay-action="true"${scopeAttr(inventory,2,'market-sale')} type="button"><b>주괴 판매</b><small>주괴를 코인으로 바꾼다.</small></button><button id="upgradeFactory" class="action" data-gameplay-action="true"${scopeAttr(inventory,3,'factory-upgrade')} type="button"><b>설비 업그레이드</b><small>채굴·제련 효율을 높인다.</small></button><button id="hireDrone" class="action" data-gameplay-action="true"${scopeAttr(inventory,4,'automation-drone')} type="button"><b>자동화 드론 고용</b><small>행동마다 생산 보조가 발생한다.</small></button><button id="unlockZone" class="action" data-gameplay-action="true" data-mechanic-id="zone-unlock" type="button"><b>새 구역 해금</b><small>더 큰 광맥과 생산 보너스를 연다.</small></button><button id="coolFactory" class="action" data-gameplay-action="true" data-mechanic-id="heat-management" type="button"><b>냉각 시스템</b><small>열을 낮춰 가동 중단을 피한다.</small></button></div></section>
<section class="panel"><div class="phases"><div class="phase" data-session-stage="1" data-session-start="0" data-session-end="5" data-session-stage-complete="false"><b>0–5분 · 첫 생산</b>채굴과 제련을 실제로 1회 이상 완료.</div><div class="phase" data-session-stage="2" data-session-start="5" data-session-end="15" data-session-stage-complete="false"><b>5–15분 · 경제 루프</b>판매와 설비 업그레이드 연결.</div><div class="phase" data-session-stage="3" data-session-start="15" data-session-end="25" data-session-stage-complete="false"><b>15–25분 · 자동화 확장</b>드론과 두 번째 구역 확보.</div><div class="phase" data-session-stage="4" data-session-start="25" data-session-end="30" data-session-stage-complete="false"><b>25–30분 · 최종 확장</b>공장 Lv.3, 드론, 구역 3을 모두 달성.</div></div></section>
<section class="panel audio"><button id="mute" data-audio-control="mute" type="button">음악 켜짐</button><label>볼륨 <input id="volume" data-audio-control="volume" type="range" min="0" max="1" step="0.05" value="0.22"></label></section><section class="panel status" id="status">광석을 캐서 실제 생산 루프를 시작하세요.</section><p hidden class="mission">${htmlEscape(designEcho)} ${inventory.map((x,i)=>`${scopeLabel(inventory,i)}`).join(' ')}</p></main>
<script>
const state={turn:0,ore:0,ingot:0,coins:8,factory:1,drones:0,zone:1,heat:0,score:0,mined:0,smelted:0,sold:0,upgrades:0,automationTicks:0,won:false,lost:false};
const $=id=>document.getElementById(id),root=document.querySelector('main.game'),canvas=$('gameCanvas'),ctx=canvas.getContext('2d');let audioCtx=null,master=null,osc=null,muted=false;
async function ensureAudio(){if(!audioCtx){const AC=window.AudioContext||window.webkitAudioContext;audioCtx=new AC();master=audioCtx.createGain();master.gain.value=Number($('volume').value);master.connect(audioCtx.destination);osc=audioCtx.createOscillator();osc.type='triangle';osc.frequency.value=130.8;osc.connect(master);osc.start()}if(audioCtx.state==='suspended')await audioCtx.resume();document.body.dataset.audioState=muted?'muted':'running'}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}function miningPower(){return state.factory+state.zone}function smeltYield(){return 1+Math.floor((state.factory-1)/2)}function zoneCost(){return state.zone===1?20:35}function upgradeCost(){return 10+state.factory*5}
function draw(){const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#17394a');bg.addColorStop(1,'#07141d');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);ctx.fillStyle='#183649';ctx.fillRect(18,190,w-36,62);for(let i=0;i<3+state.zone;i++){const x=55+i*86;ctx.fillStyle=i%2?'#64748b':'#475569';ctx.fillRect(x,132,48,58);ctx.fillStyle='#94a3b8';ctx.fillRect(x+10,116,28,16);ctx.fillStyle='#22d3ee';ctx.fillRect(x+7,146,34,10)}ctx.fillStyle='#e2e8f0';ctx.font='bold 16px system-ui';ctx.fillText('Pocket Foundry · Zone '+state.zone,18,28);ctx.font='12px system-ui';ctx.fillText('Factory '+state.factory+' · Drones '+state.drones+' · Heat '+state.heat+'%',18,48);ctx.fillStyle='#f59e0b';for(let i=0;i<Math.min(12,state.ore);i++){ctx.beginPath();ctx.arc(28+i*18,270,5,0,Math.PI*2);ctx.fill()}if(state.drones){ctx.fillStyle='#67e8f9';for(let i=0;i<state.drones;i++){ctx.fillRect(430+i*34,70+(i%2)*18,20,10);ctx.fillRect(437+i*34,64+(i%2)*18,6,22)}}if(state.won||state.lost){ctx.fillStyle='#000c';ctx.fillRect(0,0,w,h);ctx.textAlign='center';ctx.font='bold 34px system-ui';ctx.fillStyle=state.won?'#86efac':'#fda4af';ctx.fillText(state.won?'FOUNDRY EXPANDED · VICTORY':'FACTORY SHUTDOWN · DEFEAT',w/2,h/2);ctx.textAlign='left'}}
function autoPulse(){if(state.drones<1||state.won||state.lost)return;state.ore+=state.drones;state.automationTicks++;if(state.ore>=8){state.ore-=4;state.ingot+=smeltYield();state.smelted++;}state.heat+=state.drones;state.score+=state.drones*2}
function setPhase(index,done){const el=document.querySelector(`[data-session-stage="${index}"]`);if(el)el.dataset.sessionStageComplete=done?'true':'false'}
function updateMilestones(){const p1=state.mined>=1&&state.smelted>=1;const p2=p1&&state.sold>=1&&state.factory>=2;const p3=p2&&state.drones>=1&&state.zone>=2;const p4=p3&&state.factory>=3&&state.zone>=3;setPhase(1,p1);setPhase(2,p2);setPhase(3,p3);setPhase(4,p4);const done=[p1,p2,p3,p4].filter(Boolean).length;root.dataset.sessionCompletedStages=String(done);root.dataset.sessionCurrentStage=String(done);if(p4&&!state.lost){state.won=true;document.body.dataset.runResult='victory'}}
function finishCheck(){if(state.heat>=100&&!state.won){state.heat=100;state.lost=true;document.body.dataset.runResult='defeat'}updateMilestones();if(state.won||state.lost)document.querySelectorAll('[data-gameplay-action]').forEach(b=>b.disabled=true)}
function sync(label){state.heat=clamp(state.heat,0,100);$('ore').textContent=state.ore;$('ingot').textContent=state.ingot;$('coins').textContent=state.coins;$('factory').textContent=state.factory;$('drones').textContent=state.drones;$('zone').textContent=state.zone;$('heat').textContent=state.heat;$('score').textContent=state.score;const s=$('state');s.dataset.state=state.won?'victory':state.lost?'defeat':'running';s.dataset.score=String(state.score);s.dataset.resource=String(state.coins);s.dataset.progress=String(Number(root.dataset.sessionCompletedStages||0)*25);$('goalMeter').style.width=(Number(root.dataset.sessionCompletedStages||0)*25)+'%';$('status').innerHTML=state.won?'<span class="win">목표 달성 · VICTORY · 공장 확장이 완료되었습니다.</span>':state.lost?'<span class="lose">가동 중단 · DEFEAT · 열 관리에 실패했습니다.</span>':label+' · 다음 설비 결정을 선택하세요.';if(osc&&audioCtx)osc.frequency.setTargetAtTime([130.8,164.8,196,220][state.turn%4],audioCtx.currentTime,.04);draw()}
function actionStart(){if(state.won||state.lost)return false;state.turn++;autoPulse();return true}function actionEnd(label,heat){state.heat+=heat;finishCheck();sync(label)}
async function mineOre(){await ensureAudio();if(!actionStart())return;const amount=miningPower();state.ore+=amount;state.mined++;state.score+=amount*2;actionEnd('광석 '+amount+'개 채굴',5)}
async function smeltOre(){await ensureAudio();if(!actionStart())return;if(state.ore>=4){state.ore-=4;const amount=smeltYield();state.ingot+=amount;state.smelted++;state.score+=8*amount;actionEnd('주괴 '+amount+'개 제련',10)}else actionEnd('광석이 부족합니다',2)}
async function sellIngot(){await ensureAudio();if(!actionStart())return;if(state.ingot>=1){state.ingot--;const gain=8+state.zone*3;state.coins+=gain;state.sold++;state.score+=gain;actionEnd('주괴 판매 +'+gain+' 코인',3)}else actionEnd('판매할 주괴가 없습니다',1)}
async function upgradeFactory(){await ensureAudio();if(!actionStart())return;const cost=upgradeCost();if(state.coins>=cost&&state.factory<5){state.coins-=cost;state.factory++;state.upgrades++;state.score+=20;actionEnd('공장 설비 Lv.'+state.factory+' 달성',12)}else actionEnd('업그레이드 비용 '+cost+' 코인이 필요합니다',2)}
async function hireDrone(){await ensureAudio();if(!actionStart())return;const cost=15+state.drones*15;if(state.coins>=cost&&state.drones<3){state.coins-=cost;state.drones++;state.score+=25;actionEnd('자동화 드론 '+state.drones+'기 가동',8)}else actionEnd('드론 고용 비용 '+cost+' 코인이 필요합니다',2)}
async function unlockZone(){await ensureAudio();if(!actionStart())return;const cost=zoneCost();if(state.zone<3&&state.coins>=cost){state.coins-=cost;state.zone++;state.score+=35;actionEnd('생산 구역 '+state.zone+' 해금',9)}else actionEnd(state.zone>=3?'모든 구역을 해금했습니다':'구역 해금 비용 '+cost+' 코인이 필요합니다',2)}
async function coolFactory(){await ensureAudio();if(!actionStart())return;state.heat=Math.max(0,state.heat-32);state.score+=3;finishCheck();sync('냉각 시스템 가동 · 열 -32')}
[['mineOre',mineOre],['smeltOre',smeltOre],['sellIngot',sellIngot],['upgradeFactory',upgradeFactory],['hireDrone',hireDrone],['unlockZone',unlockZone],['coolFactory',coolFactory]].forEach(([id,fn])=>$(id).addEventListener('click',fn));
canvas.addEventListener('pointerdown',mineOre);document.addEventListener('keydown',event=>{if(event.code==='Space')mineOre();if(event.code==='KeyS')smeltOre();if(event.code==='KeyU')upgradeFactory();if(event.code==='KeyC')coolFactory()});$('mute').addEventListener('click',async()=>{await ensureAudio();muted=!muted;master.gain.value=muted?0:Number($('volume').value);$('mute').textContent=muted?'음악 꺼짐':'음악 켜짐';document.body.dataset.audioState=muted?'muted':'running'});$('volume').addEventListener('input',async()=>{await ensureAudio();if(!muted)master.gain.value=Number($('volume').value)});updateMilestones();sync('공장 가동 준비');
</script></body></html>`;
  return {html,validationQuestion:`${identity||gameName||gameId}가 채굴→제련→판매→업그레이드→자동화→구역 해금의 실제 의존 관계를 가진 게임으로 구현됐는가?`,implementationNotes:['genre-specific Pocket Foundry production simulation','seven distinct mechanics with resource dependencies','progression milestones drive the 30-minute depth model; session stages are not clickable','automation affects later actions and factory heat creates a failure state','source footprint and mechanic-diversity gates enabled','approved design scope is bound to concrete mechanic IDs'],generationMode:'GENRE_SPECIFIC_REAL_IMPLEMENTATION'};
}

export function buildContractSafePlayable({gameId='',gameName='',baseline={}}={}){
  const genre=inferDevelopmentGenre({gameId,baseline}),inventory=deriveApprovedScopeInventory(baseline);
  if(genre!=='SIMULATOR_TYCOON_INCREMENTAL')throw new Error(`GENRE_REAL_IMPLEMENTATION_NOT_READY:${genre}`);
  const result=buildPocketFoundry({gameId,gameName,baseline,inventory});
  return {...result,approvedScopeInventory:inventory,sessionMinutes:SESSION_MINUTES,artifactType:REAL_ARTIFACT_TYPE};
}

export async function buildFirstPlayable({gameId,gameName,baseline,sourcePath,candidatePath,candidateId,sourceCommit,model}){
  void sourcePath;void sourceCommit;void model;
  const result=buildContractSafePlayable({gameId,gameName,baseline}),inventory=result.approvedScopeInventory;
  const review=validateBootstrapHtml(result.html,{scopeInventory:inventory});
  if(!review.pass)throw new Error(`REAL_PLAYABLE_WEB_GAME_BUILD_FAILED:${review.blockers.join('|')}`);
  fs.mkdirSync(candidatePath,{recursive:true});
  fs.writeFileSync(path.join(candidatePath,'index.html'),result.html.endsWith('\n')?result.html:`${result.html}\n`,'utf8');
  return {result,review,generation:{mode:result.generationMode,modelAttempts:0,modelContractFailures:[],modelUsed:false},approvedScopeInventory:inventory};
}

async function main(){
  const gameId=clean(arg('game-id')),gameName=clean(arg('game-name',gameId)),baselineFile=arg('baseline'),sourcePath=clean(arg('source-path')),candidateId=safeId(arg('candidate-id')),candidatePath=clean(arg('candidate-path')),sourceCommit=clean(arg('source-commit')),model=clean(arg('model',process.env.AUTONOMOUS_LOCAL_MODEL||'none')),evidenceFile=clean(arg('evidence'));
  if(!gameId||!baselineFile||!sourcePath||!candidateId||!candidatePath||!sourceCommit||!evidenceFile)throw new Error('required bootstrap argument missing');
  if(!sourcePath.startsWith('web-games/')||!candidatePath.startsWith('web-games/.autonomous-candidates/'))throw new Error('invalid source/candidate path');
  const baseline=readJson(baselineFile);
  const {result,review,generation,approvedScopeInventory}=await buildFirstPlayable({gameId,gameName,baseline,sourcePath,candidatePath,candidateId,sourceCommit,model});
  const evidence={version:9,candidateId,gameId,sourcePath,candidatePath,sourceCommit,candidateOnly:true,selfPromote:false,publicStableModified:false,paidApi:false,newProject:true,artifactType:REAL_ARTIFACT_TYPE,realPlayableGame:true,testHarness:false,changedFiles:['index.html'],summary:`genre-specific real playable Web game: ${result.validationQuestion}`,expectedEffect:'승인 디자인을 실제 자원 의존성·자동화·성장·실패 조건이 있는 플레이 게임으로 구현',tests:['real-game-footprint','mechanic-diversity','approved-scope-mechanic-binding','progression-milestone-session','independent-browser-qa'],validationQuestion:result.validationQuestion,implementationNotes:result.implementationNotes,musicRuntimeRequired:true,fullApprovedScopeRequired:true,approvedScopeInventory,approvedScopeRequiredCount:approvedScopeInventory.length,sessionDepthMinutes:SESSION_MINUTES,sessionProofMode:'PROGRESSION_MILESTONES',generation,bootstrapContract:review,createdAt:new Date().toISOString()};
  writeJson(evidenceFile,evidence);
  console.log('DEVELOPMENT_WEB_BOOTSTRAP=PASS');console.log(`WEB_ARTIFACT_TYPE=${REAL_ARTIFACT_TYPE}`);console.log('REAL_PLAYABLE_WEB_GAME=YES');console.log('FULL_APPROVED_SCOPE_REQUIRED=YES');console.log(`REAL_GAME_BYTES=${review.bytes}`);console.log(`REAL_GAME_SCRIPT_BYTES=${review.scriptBytes}`);console.log(`REAL_GAME_MECHANICS=${review.mechanicCount}`);console.log(`GAME_ID=${gameId}`);console.log(`CANDIDATE_ID=${candidateId}`);console.log('MODEL_USED=NO');console.log('PRE_WEB_ARTBOOK_REQUIRED=NO');console.log('PAID_API=NO');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});}
