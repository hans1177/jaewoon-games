// 파일명: assets/game-generator.js
// 역할: 자연어 게임 패키지를 공통 런타임을 사용하는 독립 웹게임 HTML로 변환
// 규칙: 기존 게임 자동 변경 금지, 공통 런타임 상대경로 재사용, 생성 결과는 독립 파일

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function safeSlug(value) {
  const slug = String(value || 'vibe-game').toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  return slug || 'vibe-game';
}

function escapeScriptJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

function safeTitle(value) {
  return String(value || '재운게임즈 바이브 게임').replace(/[<&>"']/g, (char) => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function pickNumber(value, fallback, min = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min ? parsed : fallback;
}

function hasAction(actions, name) {
  return Array.isArray(actions) && actions.includes(name);
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
  const enemies = Array.isArray(content.enemies) ? content.enemies : [];
  const bosses = Array.isArray(content.bosses) ? content.bosses : [];
  const defaultEnemy = enemies[0] || {};
  const defaultBoss = bosses[0] || {};
  const saveGameId = String(data.gameId || 'vibe-game');
  const runtimePath = '../../assets/vibe-runtime.js';
  const enemyTypes = JSON.stringify(enemies.map((enemy) => ({
    name: String(enemy.name || '적'),
    hp: Math.max(1, pickNumber(enemy.hp, 20, 1)),
    damage: Math.max(0, pickNumber(enemy.damage, 5, 0)),
    range: Math.max(26, pickNumber(enemy.range, 28, 0)),
    speed: Math.max(4, pickNumber(enemy.speed, 32, 0)),
    actions: Array.isArray(enemy.actions) ? enemy.actions : [],
  }))).replace(/</g, '\\u003c');
  const bossTypes = JSON.stringify(bosses.map((boss) => ({
    name: String(boss.name || '보스'),
    hp: Math.max(1, pickNumber(boss.hp, 500, 1)),
    damage: Math.max(0, pickNumber(boss.damage, 20, 0)),
    actions: Array.isArray(boss.actions) ? boss.actions : [],
  }))).replace(/</g, '\\u003c');
  const rewards = {
    enemy: Math.max(0, pickNumber(content.rewards?.perEnemy, 0, 0)),
    boss: Math.max(0, pickNumber(content.rewards?.boss, 0, 0)),
  };
  const itemCount = Array.isArray(content.items) ? content.items.length : 0;
  const craftingCount = Array.isArray(content.crafting) ? content.crafting.length : 0;

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${safeTitle(gameTitle)}</title>
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}html,body{margin:0;min-height:100%;font-family:system-ui,-apple-system,sans-serif;background:#111827;color:#fff}body{display:grid;place-items:center;padding:10px}main{width:min(100%,960px)}.top{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:10px 12px;background:#1f2937;border-radius:14px;margin-bottom:8px;font-weight:800;font-size:13px;flex-wrap:wrap}.top span:last-child{opacity:.85}.game{overflow:hidden;border-radius:16px;background:#0b1220}.game canvas{display:block;width:100%;height:auto;aspect-ratio:${mapWidth}/${mapHeight};touch-action:none}.controls{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px}.controls button,.tools button{min-height:48px;border:0;border-radius:12px;font-size:17px;font-weight:900;background:#2563eb;color:#fff}.tools{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px}.tools button{background:#374151;font-size:13px}.hint{text-align:center;font-size:11px;opacity:.7;margin:8px 0}.toast{min-height:22px;text-align:center;font-size:11px;opacity:.85;margin-top:4px}@media(max-width:520px){.top{font-size:12px}.controls button{min-height:52px}.tools button{min-height:46px}}
</style></head>
<body><main><div class="top"><span id="title"></span><span id="status">준비 중</span></div><div class="game"><canvas id="game" width="${mapWidth}" height="${mapHeight}"></canvas></div><div class="controls"><button id="left">←</button><button id="attack">⚔</button><button id="right">→</button></div><div class="tools"><button id="pause">일시정지</button><button id="restart">재시작</button><button id="save">저장</button></div><div class="toast" id="toast"></div><div class="hint">키보드: A/D 또는 ←/→ · 스페이스 공격 · 모바일: 화면 버튼 · 저장/불러오기 · 아이템 ${itemCount}개 · 제작 ${craftingCount}개</div></main>
<script type="module">
import { JaewoonVibeRuntime } from '${runtimePath}';
const DATA=${payload};
const c=document.getElementById('game'),x=c.getContext('2d'),title=document.getElementById('title'),status=document.getElementById('status'),toast=document.getElementById('toast');
const ENEMY_TYPES=${enemyTypes};
const BOSS_TYPES=${bossTypes};
const enemyFallback={name:'적',hp:${Math.max(1,pickNumber(defaultEnemy.hp,20,1))},damage:${Math.max(0,pickNumber(defaultEnemy.damage,5,0))},range:${Math.max(26,pickNumber(defaultEnemy.range,28,0))},speed:${Math.max(4,pickNumber(defaultEnemy.speed,32,0))},actions:[]};
const bossFallback={name:'보스',hp:${Math.max(1,pickNumber(defaultBoss.hp,500,1))},damage:${Math.max(0,pickNumber(defaultBoss.damage,20,0))},actions:[]};
const runtime=new JaewoonVibeRuntime({gameId:${JSON.stringify(saveGameId)}});
const initial={hp:100,maxHp:100,damage:10,px:c.width/2,py:c.height/2,enemies:[],projectiles:[],score:0,gold:0,wave:1,lastSpawn:performance.now()/1000,spawnInterval:${interval},enemyCount:${enemyCount},enemyTypes:ENEMY_TYPES.length?ENEMY_TYPES:[enemyFallback],bossTypes:BOSS_TYPES.length?BOSS_TYPES:[bossFallback],speed:220,attackRange:120,attackCooldown:.45,lastAttack:0,totalWaves:${waves}};
const S={...initial,enemies:[],projectiles:[]};
const maxW=${mapWidth},maxH=${mapHeight},maxWaves=${waves},rewardEnemy=${rewards.enemy},rewardBoss=${rewards.boss};
let keys=new Set(),last=performance.now(),running=true,raf=0;
title.textContent=${JSON.stringify(gameTitle)};
function cloneState(){return JSON.parse(JSON.stringify({hp:S.hp,maxHp:S.maxHp,damage:S.damage,px:S.px,py:S.py,enemies:S.enemies,projectiles:[],score:S.score,gold:S.gold,wave:S.wave,lastSpawn:S.lastSpawn}))}
function restoreState(saved){if(!saved||typeof saved!=='object')return false;S.hp=Number.isFinite(Number(saved.hp))?Number(saved.hp):initial.hp;S.maxHp=Number.isFinite(Number(saved.maxHp))?Number(saved.maxHp):initial.maxHp;S.damage=Number.isFinite(Number(saved.damage))?Number(saved.damage):initial.damage;S.px=Number.isFinite(Number(saved.px))?Number(saved.px):initial.px;S.py=Number.isFinite(Number(saved.py))?Number(saved.py):initial.py;S.enemies=Array.isArray(saved.enemies)?saved.enemies.map((e)=>({...e})).filter((e)=>Number.isFinite(Number(e.x))&&Number.isFinite(Number(e.y))&&Number.isFinite(Number(e.hp))&&e.hp>0):[];S.score=Math.max(0,Number(saved.score)||0);S.gold=Math.max(0,Number(saved.gold)||0);S.wave=Math.max(1,Math.min(maxWaves,Number(saved.wave)||1));S.lastSpawn=Number.isFinite(Number(saved.lastSpawn))?Number(saved.lastSpawn):performance.now()/1000;return true}
function showToast(message){toast.textContent=String(message||'');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>{toast.textContent=''},1800)}
function saveGame(){runtime.flushSaveProgress({version:1,gameId:${JSON.stringify(saveGameId)},state:cloneState()});status.textContent='저장 완료'}
function loadGame(){const saved=runtime.loadProgress(null);const payload=saved?.data?.gameId===${JSON.stringify(saveGameId)}?saved.data.state:saved?.gameId===${JSON.stringify(saveGameId)}?saved.state:null;return payload&&restoreState(payload)}
function reset(){S.hp=initial.hp;S.maxHp=initial.maxHp;S.damage=initial.damage;S.px=initial.px;S.py=initial.py;S.enemies=[];S.projectiles=[];S.score=0;S.gold=0;S.wave=1;S.lastSpawn=performance.now()/1000;running=true;runtime.setPaused(false,'restart');status.textContent='재시작했어'}
function chooseType(isBoss){const list=isBoss?S.bossTypes:S.enemyTypes;return list[Math.floor(Math.random()*Math.max(1,list.length))]||(isBoss?bossFallback:enemyFallback)}
function spawn(i=0,isBoss=false){const type=chooseType(isBoss);const a=(i*1.7)%6.283;S.enemies.push({x:maxW/2+Math.cos(a)*(maxW*.38),y:maxH/2+Math.sin(a)*(maxH*.35),hp:type.hp,maxHp:type.hp,damage:type.damage,range:type.range||28,speed:type.speed||32,actions:[...(type.actions||[])],name:type.name||'적',boss:Boolean(isBoss),stunUntil:0,slowUntil:0,shotAt:0})}
function target(){let t=null,d=Infinity;for(const e of S.enemies){if(e.hp<=0)continue;const q=Math.hypot(e.x-S.px,e.y-S.py);if(q<d){d=q;t=e}}return t}
function areaAttack(targetEnemy){const radius=90;for(const e of S.enemies){if(e===targetEnemy||e.hp<=0)continue;if(Math.hypot(e.x-targetEnemy.x,e.y-targetEnemy.y)<=radius)e.hp-=Math.max(1,Math.floor(S.damage*.6))}targetEnemy.hp-=S.damage}
function attack(now=performance.now()){if(!running||runtime.paused)return;const timestamp=now/1000;if(timestamp-S.lastAttack<S.attackCooldown)return;S.lastAttack=timestamp;const t=target();if(!t||Math.hypot(t.x-S.px,t.y-S.py)>S.attackRange)return;const effects=t.actions||[];if(hasAction(effects,'area-effect'))areaAttack(t);else t.hp-=S.damage;if(hasAction(effects,'knockback')){const dx=t.x-S.px,dy=t.y-S.py,d=Math.hypot(dx,dy)||1;t.x=clamp(t.x+dx/d*70,20,maxW-20);t.y=clamp(t.y+dy/d*70,20,maxH-20)}if(hasAction(effects,'stun'))t.stunUntil=timestamp+1.5;if(hasAction(effects,'slow'))t.slowUntil=timestamp+2;cleanup()}
function cleanup(){for(let i=S.enemies.length-1;i>=0;i--){const e=S.enemies[i];if(e.hp<=0){S.enemies.splice(i,1);S.score++;S.gold+=e.boss?rewardBoss:rewardEnemy;if(e.boss)showToast('보스 처치! +' + rewardBoss + ' 골드');else if(rewardEnemy>0)showToast('처치 보상 +' + rewardEnemy + ' 골드')}}}
function fireEnemyProjectile(e,now){if(now-e.shotAt<1100)return;e.shotAt=now;const dx=S.px-e.x,dy=S.py-e.y,d=Math.hypot(dx,dy)||1;S.projectiles.push({x:e.x,y:e.y,vx:dx/d,vy:dy/d,speed:180,damage:Math.max(1,e.damage),life:3})}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function update(dt,now){const timestamp=now/1000;const dx=(keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0);const dy=(keys.has('ArrowDown')||keys.has('s')?1:0)-(keys.has('ArrowUp')||keys.has('w')?1:0);const len=Math.hypot(dx,dy)||1;if(dx||dy){S.px+=dx/len*S.speed*dt;S.py+=dy/len*S.speed*dt}S.px=clamp(S.px,20,maxW-20);S.py=clamp(S.py,20,maxH-20);for(const e of S.enemies){if(e.hp<=0||timestamp<e.stunUntil)continue;const ex=S.px-e.x,ey=S.py-e.y,d=Math.hypot(ex,ey)||1;const slowFactor=timestamp<e.slowUntil?.5:1;const ranged=hasAction(e.actions,'ranged')||e.range>140;if(ranged){if(d>e.range){e.x+=ex/d*e.speed*slowFactor*dt;e.y+=ey/d*e.speed*slowFactor*dt}else fireEnemyProjectile(e,now)}else{e.x+=ex/d*e.speed*slowFactor*dt;e.y+=ey/d*e.speed*slowFactor*dt;if(d<e.range)S.hp=Math.max(0,S.hp-e.damage*dt)}}for(let i=S.projectiles.length-1;i>=0;i--){const p=S.projectiles[i];p.x+=p.vx*p.speed*dt;p.y+=p.vy*p.speed*dt;p.life-=dt;if(Math.hypot(p.x-S.px,p.y-S.py)<18){S.hp=Math.max(0,S.hp-p.damage);S.projectiles.splice(i,1);continue}if(p.life<=0)S.projectiles.splice(i,1)}if(timestamp-S.lastSpawn>=S.spawnInterval&&S.wave<=maxWaves){S.lastSpawn=timestamp;const bossWave=S.wave%Math.max(5,Math.ceil(maxWaves/2))===0&&S.bossTypes.length>0;for(let i=0;i<S.enemyCount;i++)spawn(i,bossWave&&i===0);if(bossWave&&S.wave<maxWaves)S.wave++}if(S.hp<=0){running=false;status.textContent='게임오버'}else if(S.wave>=maxWaves&&S.enemies.length===0){status.textContent='클리어'}}
function draw(){x.clearRect(0,0,c.width,c.height);x.fillStyle='#172554';x.fillRect(0,0,c.width,c.height);for(const e of S.enemies){x.fillStyle=e.boss?'#f59e0b':'#ef4444';x.beginPath();x.arc(e.x,e.y,e.boss?22:16,0,6.283);x.fill();if(e.boss){x.fillStyle='#fff';x.font='700 12px system-ui';x.fillText('BOSS',e.x-18,e.y-28)}}for(const p of S.projectiles){x.fillStyle='#fde047';x.beginPath();x.arc(p.x,p.y,6,0,6.283);x.fill()}x.fillStyle='#22c55e';x.beginPath();x.arc(S.px,S.py,18,0,6.283);x.fill();x.fillStyle='rgba(0,0,0,.5)';x.fillRect(12,12,390,90);x.fillStyle='#fff';x.font='700 18px system-ui';x.fillText('HP '+Math.ceil(S.hp)+' / '+S.maxHp,24,38);x.fillText('공격 '+S.damage+' · 골드 '+S.gold+' · 점수 '+S.score,24,64);x.fillText('웨이브 '+S.wave+' / '+maxWaves,24,88)}
function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(running&&!runtime.paused)update(dt,now);draw();raf=requestAnimationFrame(loop)}
window.addEventListener('keydown',e=>{keys.add(e.key);if(e.key===' ')attack();if(e.key==='Escape')runtime.setPaused(!runtime.paused,'keyboard')});window.addEventListener('keyup',e=>keys.delete(e.key));
function holdButton(id,key){const b=document.getElementById(id);const down=(e)=>{e.preventDefault();keys.add(key)},up=()=>keys.delete(key);b.addEventListener('pointerdown',down,{passive:false});b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up)}
holdButton('left','ArrowLeft');holdButton('right','ArrowRight');document.getElementById('attack').onclick=()=>attack(performance.now());document.getElementById('pause').onclick=()=>{runtime.setPaused(!runtime.paused,'button');status.textContent=runtime.paused?'일시정지':'플레이 중'};document.getElementById('restart').onclick=reset;document.getElementById('save').onclick=saveGame;
runtime.boot({visibilityPause:true,errorReporter:(error)=>{status.textContent='오류를 감지했어. 게임은 계속할게.';console.error(error)}});
const restored=loadGame();if(restored){status.textContent='저장된 게임 불러옴'}else for(let i=0;i<S.enemyCount;i++)spawn(i);
last=performance.now();raf=requestAnimationFrame(loop);window.addEventListener('beforeunload',saveGame);
</script></body></html>`;
}

export function buildGeneratedGame({ packageData = {}, title = null } = {}) {
  const resolvedTitle = title || packageData?.blueprint?.gameId || packageData?.gameId || 'vibe-game';
  return Object.freeze({ slug: safeSlug(resolvedTitle), filename: 'index.html', html: buildGameHtml({ packageData, title: resolvedTitle }), gameId: packageData?.gameId || 'vibe-game' });
}

if (typeof window !== 'undefined') window.buildJaewoonGeneratedGame = buildGeneratedGame;
