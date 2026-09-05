// 파일명: assets/game-generator.js
// 역할: 자연어 게임 패키지를 공통 런타임을 사용하는 독립 웹게임 HTML로 변환
// 규칙: 기존 게임 자동 변경 금지, 공통 런타임 상대경로 재사용, 생성 결과는 독립 파일

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function safeSlug(value) {
  const slug = String(value || 'vibe-game')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || 'vibe-game';
}

function escapeScriptJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function safeTitle(value) {
  return String(value || '재운게임즈 바이브 게임')
    .replace(/[<&>"']/g, (char) => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

export function buildGameHtml({ packageData = {}, title = '재운게임즈 바이브 게임' } = {}) {
  const data = clone(packageData) || {};
  const content = data.content || {};
  const blueprint = data.blueprint || {};
  const gameTitle = String(title || data.gameId || '재운게임즈 바이브 게임');
  const payload = escapeScriptJson({ gameId: data.gameId || 'vibe-game', blueprint, content });
  const mapWidth = Math.max(320, Number(content.map?.width) || 1200);
  const mapHeight = Math.max(240, Number(content.map?.height) || 760);
  const waves = Math.max(1, Number(content.waves?.total) || 1);
  const enemyCount = Math.max(1, Number(content.waves?.countPerSpawn) || 1);
  const interval = Math.max(0.25, Number(content.waves?.spawnInterval) || 4);
  const enemyHp = Math.max(1, Number(content.enemies?.[0]?.hp) || 20);
  const enemyDamage = Math.max(0, Number(content.enemies?.[0]?.damage) || 5);
  const saveGameId = String(data.gameId || 'vibe-game');
  const runtimePath = '../../assets/vibe-runtime.js';

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${safeTitle(gameTitle)}</title>
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}html,body{margin:0;min-height:100%;font-family:system-ui,-apple-system,sans-serif;background:#111827;color:#fff}body{display:grid;place-items:center;padding:10px}main{width:min(100%,960px)}.top{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:10px 12px;background:#1f2937;border-radius:14px;margin-bottom:8px;font-weight:800;font-size:13px;flex-wrap:wrap}.top span:last-child{opacity:.85}.game{overflow:hidden;border-radius:16px;background:#0b1220}.game canvas{display:block;width:100%;height:auto;aspect-ratio:${mapWidth}/${mapHeight};touch-action:none}.controls{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px}.controls button,.tools button{min-height:48px;border:0;border-radius:12px;font-size:17px;font-weight:900;background:#2563eb;color:#fff}.tools{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px}.tools button{background:#374151;font-size:13px}.hint{text-align:center;font-size:11px;opacity:.7;margin:8px 0}@media(max-width:520px){.top{font-size:12px}.controls button{min-height:52px}.tools button{min-height:46px}}
</style></head>
<body><main><div class="top"><span id="title"></span><span id="status">준비 중</span></div><div class="game"><canvas id="game" width="${mapWidth}" height="${mapHeight}"></canvas></div><div class="controls"><button id="left">←</button><button id="attack">⚔</button><button id="right">→</button></div><div class="tools"><button id="pause">일시정지</button><button id="restart">재시작</button><button id="save">저장</button></div><div class="hint">키보드: A/D 또는 ←/→ · 스페이스 공격 · 모바일: 화면 버튼 · 저장/불러오기는 공통 런타임 사용</div></main>
<script type="module">
import { JaewoonVibeRuntime } from '${runtimePath}';

const DATA=${payload};
const c=document.getElementById('game'),x=c.getContext('2d'),title=document.getElementById('title'),status=document.getElementById('status');
const runtime=new JaewoonVibeRuntime({gameId:${JSON.stringify(saveGameId)}});
const initial={hp:100,maxHp:100,damage:10,px:c.width/2,py:c.height/2,enemies:[],score:0,wave:1,lastSpawn:performance.now()/1000,spawnInterval:${interval},enemyCount:${enemyCount},enemyHp:${enemyHp},enemyDamage:${enemyDamage},speed:220};
const S={...initial,enemies:[]};
const maxW=${mapWidth},maxH=${mapHeight},maxWaves=${waves};
let keys=new Set(),last=performance.now(),running=true,raf=0;

title.textContent=${JSON.stringify(gameTitle)};

function cloneState(){return JSON.parse(JSON.stringify({hp:S.hp,maxHp:S.maxHp,px:S.px,py:S.py,enemies:S.enemies,score:S.score,wave:S.wave,lastSpawn:S.lastSpawn}))}
function restoreState(saved){if(!saved||typeof saved!=='object')return false;S.hp=Number.isFinite(Number(saved.hp))?Number(saved.hp):initial.hp;S.maxHp=Number.isFinite(Number(saved.maxHp))?Number(saved.maxHp):initial.maxHp;S.px=Number.isFinite(Number(saved.px))?Number(saved.px):initial.px;S.py=Number.isFinite(Number(saved.py))?Number(saved.py):initial.py;S.enemies=Array.isArray(saved.enemies)?saved.enemies.map((e)=>({...e})).filter((e)=>Number.isFinite(Number(e.x))&&Number.isFinite(Number(e.y))&&Number.isFinite(Number(e.hp))):[];S.score=Math.max(0,Number(saved.score)||0);S.wave=Math.max(1,Math.min(maxWaves,Number(saved.wave)||1));S.lastSpawn=Number.isFinite(Number(saved.lastSpawn))?Number(saved.lastSpawn):performance.now()/1000;return true}
function saveGame(){runtime.saveProgress({version:1,gameId:${JSON.stringify(saveGameId)},state:cloneState()});status.textContent='저장 완료'}
function loadGame(){const saved=runtime.loadProgress(null);const payload=saved?.data?.gameId===${JSON.stringify(saveGameId)}?saved.data.state:saved?.gameId===${JSON.stringify(saveGameId)}?saved.state:null;if(payload&&restoreState(payload)){status.textContent='저장된 게임 불러옴';return true}return false}
function reset(){S.hp=initial.hp;S.maxHp=initial.maxHp;S.px=initial.px;S.py=initial.py;S.enemies=[];S.score=0;S.wave=1;S.lastSpawn=performance.now()/1000;running=true;status.textContent='재시작했어'}
function spawn(i=0){const a=(i*1.7)%6.283;S.enemies.push({x:maxW/2+Math.cos(a)*(maxW*.38),y:maxH/2+Math.sin(a)*(maxH*.35),hp:S.enemyHp})}
function target(){let t=null,d=1e9;for(const e of S.enemies){const q=Math.hypot(e.x-S.px,e.y-S.py);if(q<d){d=q;t=e}}return t}
function attack(){if(!running)return;const t=target();if(t&&Math.hypot(t.x-S.px,t.y-S.py)<120){t.hp-=S.damage;if(t.hp<=0){S.enemies.splice(S.enemies.indexOf(t),1);S.score++;if(S.score%Math.max(1,S.enemyCount)===0&&S.wave<maxWaves)S.wave++}}}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function update(dt,now){const dx=(keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0);const dy=(keys.has('ArrowDown')||keys.has('s')?1:0)-(keys.has('ArrowUp')||keys.has('w')?1:0);const len=Math.hypot(dx,dy)||1;if(dx||dy){S.px+=dx/len*S.speed*dt;S.py+=dy/len*S.speed*dt}S.px=clamp(S.px,20,maxW-20);S.py=clamp(S.py,20,maxH-20);for(const e of S.enemies){const ex=S.px-e.x,ey=S.py-e.y,d=Math.hypot(ex,ey)||1;e.x+=ex/d*32*dt;e.y+=ey/d*32*dt;if(d<26)S.hp=Math.max(0,S.hp-S.enemyDamage*dt)}if(now/1000-S.lastSpawn>=S.spawnInterval&&S.wave<=maxWaves){S.lastSpawn=now/1000;for(let i=0;i<S.enemyCount;i++)spawn(i)}if(S.hp<=0){running=false;status.textContent='게임오버'}}
function draw(){x.clearRect(0,0,c.width,c.height);x.fillStyle='#172554';x.fillRect(0,0,c.width,c.height);for(const e of S.enemies){x.fillStyle='#ef4444';x.beginPath();x.arc(e.x,e.y,16,0,6.283);x.fill()}x.fillStyle='#22c55e';x.beginPath();x.arc(S.px,S.py,18,0,6.283);x.fill();x.fillStyle='rgba(0,0,0,.45)';x.fillRect(12,12,360,68);x.fillStyle='#fff';x.font='700 18px system-ui';x.fillText('HP '+Math.ceil(S.hp)+' / '+S.maxHp,24,38);x.fillText('공격 '+S.damage+' · 점수 '+S.score+' · 웨이브 '+S.wave+' / '+maxWaves,24,64)}
function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(running&&!runtime.paused)update(dt,now);draw();raf=requestAnimationFrame(loop)}

window.addEventListener('keydown',e=>{keys.add(e.key);if(e.key===' ')attack();if(e.key==='Escape')runtime.setPaused(!runtime.paused,'keyboard')});window.addEventListener('keyup',e=>keys.delete(e.key));
function holdButton(id,key){const b=document.getElementById(id);const down=()=>keys.add(key),up=()=>keys.delete(key);b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up)}
holdButton('left','ArrowLeft');holdButton('right','ArrowRight');document.getElementById('attack').onclick=attack;
document.getElementById('pause').onclick=()=>{runtime.setPaused(!runtime.paused,'button');status.textContent=runtime.paused?'일시정지':'플레이 중'};document.getElementById('restart').onclick=reset;document.getElementById('save').onclick=saveGame;

runtime.boot({visibilityPause:true,errorReporter:(error)=>{status.textContent='오류를 감지했어. 게임은 계속할게.';console.error(error)}});
loadGame();
for(let i=0;i<S.enemyCount;i++)spawn(i);
last=performance.now();raf=requestAnimationFrame(loop);
window.addEventListener('beforeunload',saveGame);
</script></body></html>`;
}

export function buildGeneratedGame({ packageData = {}, title = null } = {}) {
  const resolvedTitle = title || packageData?.blueprint?.gameId || packageData?.gameId || 'vibe-game';
  return Object.freeze({
    slug: safeSlug(resolvedTitle),
    filename: 'index.html',
    html: buildGameHtml({ packageData, title: resolvedTitle }),
    gameId: packageData?.gameId || 'vibe-game',
  });
}

if (typeof window !== 'undefined') window.buildJaewoonGeneratedGame = buildGeneratedGame;
