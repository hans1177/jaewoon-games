// 파일명: assets/game-generator.js
// 역할: 자연어 게임 패키지를 독립 웹게임 HTML로 변환
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
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

export function buildGameHtml({ packageData = {}, title = '재운게임즈 바이브 게임' } = {}) {
  const data = clone(packageData) || {};
  const content = data.content || {};
  const blueprint = data.blueprint || {};
  const gameTitle = String(title || data.gameId || '재운게임즈 바이브 게임');
  const payload = escapeScriptJson({ gameId: data.gameId || 'vibe-game', blueprint, content });
  const mapWidth = Number(content.map?.width) || 1200;
  const mapHeight = Number(content.map?.height) || 760;
  const waves = Number(content.waves?.total) || 1;
  const enemyCount = Number(content.waves?.countPerSpawn) || 1;
  const interval = Number(content.waves?.spawnInterval) || 4;
  const enemyHp = Number(content.enemies?.[0]?.hp) || 20;
  const enemyDamage = Number(content.enemies?.[0]?.damage) || 5;
  return `<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<title>${gameTitle.replace(/</g, '&lt;')}</title>\n<style>\n*{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:system-ui,-apple-system,sans-serif;background:#111827;color:#fff}body{display:grid;place-items:center;padding:10px}main{width:min(100%,960px)}.top{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:10px 12px;background:#1f2937;border-radius:14px;margin-bottom:8px;font-weight:800;font-size:13px}.game{overflow:hidden;border-radius:16px;background:#0b1220}.game canvas{display:block;width:100%;height:auto;aspect-ratio:${mapWidth}/${mapHeight};touch-action:none}.controls{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px}.controls button{min-height:48px;border:0;border-radius:12px;font-size:18px;font-weight:900;background:#2563eb;color:#fff}.hint{text-align:center;font-size:11px;opacity:.7;margin:8px 0}\n</style></head>\n<body><main><div class="top"><span id="title"></span><span id="status">준비 중</span></div><div class="game"><canvas id="game" width="${mapWidth}" height="${mapHeight}"></canvas></div><div class="controls"><button id="left">←</button><button id="attack">⚔</button><button id="right">→</button></div><div class="hint">화살표/D 또는 화면 버튼으로 이동 · 공격 버튼으로 공격</div></main>\n<script>\nconst DATA=${payload};\nconst c=document.getElementById('game'),x=c.getContext('2d'),title=document.getElementById('title'),status=document.getElementById('status');title.textContent=${JSON.stringify(gameTitle)};\nconst S={hp:100,maxHp:100,damage:10,px:c.width/2,py:c.height/2,enemies:[],score:0,wave:1,lastSpawn:performance.now()/1000,spawnInterval:${interval},enemyCount:${enemyCount},enemyHp:${enemyHp},enemyDamage:${enemyDamage},speed:220};let keys=new Set(),last=performance.now();\nconst maxW=${mapWidth},maxH=${mapHeight},maxWaves=${waves};\nfunction spawn(i=0){const a=(i*1.7)%6.283;S.enemies.push({x:maxW/2+Math.cos(a)*(maxW*.38),y:maxH/2+Math.sin(a)*(maxH*.35),hp:S.enemyHp})}\nfunction target(){let t=null,d=1e9;for(const e of S.enemies){const q=Math.hypot(e.x-S.px,e.y-S.py);if(q<d){d=q;t=e}}return t}\nfunction attack(){const t=target();if(t&&Math.hypot(t.x-S.px,t.y-S.py)<120){t.hp-=S.damage;if(t.hp<=0){S.enemies.splice(S.enemies.indexOf(t),1);S.score++;if(S.score%Math.max(1,S.enemyCount)===0&&S.wave<maxWaves)S.wave++}}}\nfunction clamp(v,a,b){return Math.max(a,Math.min(b,v))}\nfunction update(dt,now){const dx=(keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0);S.px=clamp(S.px+dx*S.speed*dt,20,maxW-20);for(const e of S.enemies){const ex=S.px-e.x,ey=S.py-e.y,d=Math.hypot(ex,ey)||1;e.x+=ex/d*32*dt;e.y+=ey/d*32*dt;if(d<26)S.hp=Math.max(0,S.hp-S.enemyDamage*dt)}if(now/1000-S.lastSpawn>=S.spawnInterval&&S.wave<=maxWaves){S.lastSpawn=now/1000;for(let i=0;i<S.enemyCount;i++)spawn(i)}}\nfunction draw(){x.clearRect(0,0,c.width,c.height);x.fillStyle='#172554';x.fillRect(0,0,c.width,c.height);for(const e of S.enemies){x.fillStyle='#ef4444';x.beginPath();x.arc(e.x,e.y,16,0,6.283);x.fill()}x.fillStyle='#22c55e';x.beginPath();x.arc(S.px,S.py,18,0,6.283);x.fill();x.fillStyle='rgba(0,0,0,.45)';x.fillRect(12,12,330,68);x.fillStyle='#fff';x.font='700 18px system-ui';x.fillText('HP '+Math.ceil(S.hp)+' / '+S.maxHp,24,38);x.fillText('공격 '+S.damage+' · 점수 '+S.score+' · 웨이브 '+S.wave+' / '+maxWaves,24,64);status.textContent=S.hp>0?'플레이 중':'게임오버'}\nfunction loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(S.hp>0)update(dt,now);draw();requestAnimationFrame(loop)}\nwindow.addEventListener('keydown',e=>{keys.add(e.key);if(e.key===' ')attack()});window.addEventListener('keyup',e=>keys.delete(e.key));for(const [id,key] of [['left','ArrowLeft'],['right','ArrowRight']]){const b=document.getElementById(id);b.onpointerdown=()=>keys.add(key);b.onpointerup=()=>keys.delete(key);b.onpointercancel=()=>keys.delete(key)}document.getElementById('attack').onclick=attack;for(let i=0;i<S.enemyCount;i++)spawn(i);requestAnimationFrame(loop);\n</script></body></html>`;
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
