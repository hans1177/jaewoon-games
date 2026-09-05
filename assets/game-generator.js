// 파일명: assets/game-generator.js
// 역할: 자연어 게임 패키지를 공통 런타임을 사용하는 독립 웹게임 HTML로 변환
// 입력: 모바일 터치 + 가상 조이스틱 전용
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

function normalizeEnemy(enemy, fallbackName = '적') {
  return {
    name: String(enemy?.name || fallbackName),
    hp: Math.max(1, pickNumber(enemy?.hp, 20, 1)),
    damage: Math.max(0, pickNumber(enemy?.damage, 5, 0)),
    range: Math.max(26, pickNumber(enemy?.range, 28, 0)),
    speed: Math.max(4, pickNumber(enemy?.speed, 32, 0)),
    actions: Array.isArray(enemy?.actions) ? enemy.actions : []
  };
}

function normalizeBoss(boss) {
  return {
    name: String(boss?.name || '보스'),
    hp: Math.max(1, pickNumber(boss?.hp, 500, 1)),
    damage: Math.max(0, pickNumber(boss?.damage, 20, 0)),
    range: Math.max(26, pickNumber(boss?.range, 60, 0)),
    speed: Math.max(4, pickNumber(boss?.speed, 24, 0)),
    actions: Array.isArray(boss?.actions) ? boss.actions : []
  };
}

export function buildGameHtml({ packageData = {}, title = '재운게임즈 바이브 게임' } = {}) {
  const data = clone(packageData) || {};
  const content = data.content || {};
  const blueprint = data.blueprint || {};
  const gameTitle = String(title || data.gameId || '재운게임즈 바이브 게임');
  const payload = escapeScriptJson({ gameId: data.gameId || 'vibe-game', blueprint, content });
  const mapWidth = Math.max(320, Number(content.map?.width) || 1200);
  const mapHeight = Math.max(240, Number(content.map?.height) || 760);
  const totalWaves = Math.max(1, Number(content.waves?.total) || 10);
  const enemyCount = Math.max(1, Number(content.waves?.countPerSpawn) || 1);
  const spawnInterval = Math.max(0.25, Number(content.waves?.spawnInterval) || 4);
  const enemyTypes = (Array.isArray(content.enemies) ? content.enemies : []).map(normalizeEnemy);
  const bossTypes = (Array.isArray(content.bosses) ? content.bosses : []).map(normalizeBoss);
  const enemyFallback = normalizeEnemy({}, '적');
  const bossFallback = normalizeBoss({});
  const rewardEnemy = Math.max(0, pickNumber(content.rewards?.perEnemy, 0, 0));
  const rewardBoss = Math.max(0, pickNumber(content.rewards?.boss, 0, 0));
  const itemCount = Array.isArray(content.items) ? content.items.length : 0;
  const craftingCount = Array.isArray(content.crafting) ? content.crafting.length : 0;
  const saveGameId = String(data.gameId || 'vibe-game');
  const runtimePath = '../../assets/vibe-runtime.js';

  const enemyJson = escapeScriptJson(enemyTypes);
  const bossJson = escapeScriptJson(bossTypes);

  return `<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">\n<title>${safeTitle(gameTitle)}</title>\n<style>\n*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}html,body{margin:0;min-height:100%;background:#111827;color:#fff;font-family:system-ui,-apple-system,'Noto Sans KR',sans-serif;touch-action:manipulation}body{display:grid;place-items:center;padding:8px;overscroll-behavior:none}main{width:min(100%,960px)}.top{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:9px 11px;background:#1f2937;border-radius:14px;margin-bottom:7px;font-size:13px;font-weight:900;flex-wrap:wrap}.game{overflow:hidden;border-radius:16px;background:#0b1220}.game canvas{display:block;width:100%;height:auto;aspect-ratio:${mapWidth}/${mapHeight};touch-action:none}.mobileControls{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:center;margin-top:8px;padding:3px 0}.joystick{position:relative;width:min(34vw,150px);height:min(34vw,150px);min-width:118px;min-height:118px;border-radius:50%;background:rgba(255,255,255,.1);border:2px solid rgba(255,255,255,.18);touch-action:none;user-select:none;-webkit-user-select:none}.joystickKnob{position:absolute;left:50%;top:50%;width:42%;height:42%;transform:translate(-50%,-50%);border-radius:50%;background:#3b82f6;border:3px solid rgba(255,255,255,.55);box-shadow:0 6px 18px rgba(0,0,0,.28);pointer-events:none}.actionPad{display:grid;grid-template-columns:1fr 1fr;gap:7px}.actionPad button,.tools button{min-height:52px;border:0;border-radius:12px;color:#fff;background:#2563eb;font-size:15px;font-weight:900;touch-action:manipulation}.actionPad #attack{background:#dc4c4c;font-size:18px}.tools{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:7px}.tools button{background:#374151;font-size:13px}.hint{text-align:center;font-size:10px;color:#9fb0c2;margin:7px 0 0;line-height:1.4}.toast{min-height:20px;text-align:center;font-size:11px;margin-top:3px}@media(max-width:520px){body{padding:6px}.top{font-size:12px}.mobileControls{grid-template-columns:43% 57%;gap:6px}.joystick{width:120px;height:120px;min-width:120px;min-height:120px}.actionPad button{min-height:56px}.tools button{min-height:48px}}\n</style></head>\n<body><main><div class="top"><span id="title"></span><span id="status">준비 중</span></div><div class="game"><canvas id="game" width="${mapWidth}" height="${mapHeight}"></canvas></div><div class="mobileControls"><div class="joystick" id="joystick" aria-label="이동 조이스틱"><div class="joystickKnob" id="joystickKnob"></div></div><div class="actionPad"><button id="attack">⚔ 공격</button><button id="pause">⏸ 일시정지</button><button id="restart">↻ 재시작</button><button id="save">💾 저장</button></div></div><div class="tools"><button id="craft">🛠 제작 ${craftingCount}개</button><button id="load">📂 불러오기</button></div><div class="toast" id="toast"></div><div class="hint">왼쪽 조이스틱으로 이동 · 모든 조작은 터치 · 아이템 ${itemCount}개 · 제작 ${craftingCount}개</div></main>\n<script type="module">\nimport { JaewoonVibeRuntime } from '${runtimePath}';\nconst DATA=${payload};\nconst canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),titleNode=document.getElementById('title'),statusNode=document.getElementById('status'),toastNode=document.getElementById('toast');\nconst ENEMY_TYPES=${enemyJson};\nconst BOSS_TYPES=${bossJson};\nconst enemyFallback=${escapeScriptJson(enemyFallback)};\nconst bossFallback=${escapeScriptJson(bossFallback)};\nconst runtime=new JaewoonVibeRuntime({gameId:${JSON.stringify(saveGameId)}});\nconst state={hp:100,maxHp:100,damage:10,px:canvas.width/2,py:canvas.height/2,enemies:[],projectiles:[],score:0,gold:0,wave:1,lastSpawn:performance.now()/1000,spawnInterval:${spawnInterval},enemyCount:${enemyCount},enemyTypes:ENEMY_TYPES.length?ENEMY_TYPES:[enemyFallback],bossTypes:BOSS_TYPES.length?BOSS_TYPES:[bossFallback],speed:220,attackRange:130,attackCooldown:.45,lastAttack:0,totalWaves:${totalWaves}};\nconst maxW=${mapWidth},maxH=${mapHeight},maxWaves=${totalWaves},rewardEnemy=${rewardEnemy},rewardBoss=${rewardBoss};\nlet lastTime=performance.now(),running=true,joystickX=0,joystickY=0;\ntitleNode.textContent=${JSON.stringify(gameTitle)};\nconst cloneState=()=>JSON.parse(JSON.stringify({hp:state.hp,maxHp:state.maxHp,damage:state.damage,px:state.px,py:state.py,enemies:state.enemies,score:state.score,gold:state.gold,wave:state.wave,lastSpawn:state.lastSpawn}));\nfunction showToast(message){toastNode.textContent=String(message||'');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toastNode.textContent='',1500)}\nfunction saveGame(){runtime.flushSaveProgress({version:1,gameId:${JSON.stringify(saveGameId)},state:cloneState()});statusNode.textContent='저장 완료';showToast('저장했어')}\nfunction restoreState(saved){if(!saved||typeof saved!=='object')return false;state.hp=Number.isFinite(Number(saved.hp))?Number(saved.hp):100;state.maxHp=Number.isFinite(Number(saved.maxHp))?Number(saved.maxHp):100;state.damage=Number.isFinite(Number(saved.damage))?Number(saved.damage):10;state.px=Number.isFinite(Number(saved.px))?Number(saved.px):maxW/2;state.py=Number.isFinite(Number(saved.py))?Number(saved.py):maxH/2;state.enemies=Array.isArray(saved.enemies)?saved.enemies.filter(e=>Number.isFinite(Number(e.x))&&Number.isFinite(Number(e.y))&&Number(e.hp)>0):[];state.score=Math.max(0,Number(saved.score)||0);state.gold=Math.max(0,Number(saved.gold)||0);state.wave=Math.max(1,Math.min(maxWaves,Number(saved.wave)||1));state.lastSpawn=Number.isFinite(Number(saved.lastSpawn))?Number(saved.lastSpawn):performance.now()/1000;return true}\nfunction loadGame(){const saved=runtime.loadProgress(null);const candidate=saved?.data?.gameId===${JSON.stringify(saveGameId)}?saved.data.state:saved?.gameId===${JSON.stringify(saveGameId)}?saved.state:null;return candidate&&restoreState(candidate)}\nfunction reset(){state.hp=100;state.maxHp=100;state.damage=10;state.px=maxW/2;state.py=maxH/2;state.enemies=[];state.projectiles=[];state.score=0;state.gold=0;state.wave=1;state.lastSpawn=performance.now()/1000;running=true;runtime.setPaused(false,'restart');statusNode.textContent='플레이 중';showToast('새 게임 시작')}\nfunction clamp(value,min,max){return Math.max(min,Math.min(max,value))}\nfunction chooseType(isBoss){const list=isBoss?state.bossTypes:state.enemyTypes;return list[Math.floor(Math.random()*list.length)]||(isBoss?bossFallback:enemyFallback)}\nfunction spawn(index,isBoss=false){const type=chooseType(isBoss),angle=(index*1.73+Math.random()*.8)%6.283;state.enemies.push({x:maxW/2+Math.cos(angle)*(maxW*.38),y:maxH/2+Math.sin(angle)*(maxH*.32),hp:type.hp,maxHp:type.hp,damage:type.damage,range:type.range||28,speed:type.speed||32,actions:[...(type.actions||[])],name:type.name||'적',boss:isBoss,stunUntil:0,slowUntil:0,shotAt:0})}\nfunction hasAction(actions,name){return Array.isArray(actions)&&actions.includes(name)}\nfunction cleanup(){for(let i=state.enemies.length-1;i>=0;i--){const enemy=state.enemies[i];if(enemy.hp<=0){state.enemies.splice(i,1);state.score++;state.gold+=enemy.boss?rewardBoss:rewardEnemy}}}\nfunction attack(now=performance.now()){if(!running||runtime.paused)return;const time=now/1000;if(time-state.lastAttack<state.attackCooldown)return;let target=null,distance=Infinity;for(const enemy of state.enemies){if(enemy.hp<=0)continue;const d=Math.hypot(enemy.x-state.px,enemy.y-state.py);if(d<distance){distance=d;target=enemy}}if(!target||distance>state.attackRange)return;state.lastAttack=time;target.hp-=state.damage;if(hasAction(target.actions,'area-effect'))for(const other of state.enemies){if(other!==target&&other.hp>0&&Math.hypot(other.x-target.x,other.y-target.y)<90)other.hp-=Math.max(1,Math.floor(state.damage*.6))}if(hasAction(target.actions,'knockback')){const dx=target.x-state.px,dy=target.y-state.py,d=Math.hypot(dx,dy)||1;target.x=clamp(target.x+dx/d*65,20,maxW-20);target.y=clamp(target.y+dy/d*65,20,maxH-20)}if(hasAction(target.actions,'stun'))target.stunUntil=performance.now()/1000+1.5;if(hasAction(target.actions,'slow'))target.slowUntil=performance.now()/1000+2;cleanup()}\nfunction fireProjectile(enemy,now){if(now-enemy.shotAt<1100)return;enemy.shotAt=now;const dx=state.px-enemy.x,dy=state.py-enemy.y,d=Math.hypot(dx,dy)||1;state.projectiles.push({x:enemy.x,y:enemy.y,vx:dx/d,vy:dy/d,speed:180,damage:Math.max(1,enemy.damage),life:3})}\nfunction update(dt,now){if(!running||runtime.paused)return;const nx=joystickX,ny=joystickY,len=Math.hypot(nx,ny)||1;if(nx||ny){state.px=clamp(state.px+nx/len*state.speed*dt,20,maxW-20);state.py=clamp(state.py+ny/len*state.speed*dt,20,maxH-20)}const time=now/1000;for(const enemy of state.enemies){if(enemy.hp<=0||time<enemy.stunUntil)continue;const dx=state.px-enemy.x,dy=state.py-enemy.y,d=Math.hypot(dx,dy)||1,slow=time<enemy.slowUntil?.5:1;const ranged=hasAction(enemy.actions,'ranged')||enemy.range>140;if(ranged){if(d>enemy.range){enemy.x+=dx/d*enemy.speed*slow*dt;enemy.y+=dy/d*enemy.speed*slow*dt}else fireProjectile(enemy,now)}else{enemy.x+=dx/d*enemy.speed*slow*dt;enemy.y+=dy/d*enemy.speed*slow*dt;if(d<enemy.range)state.hp=Math.max(0,state.hp-enemy.damage*dt)}}for(let i=state.projectiles.length-1;i>=0;i--){const p=state.projectiles[i];p.x+=p.vx*p.speed*dt;p.y+=p.vy*p.speed*dt;p.life-=dt;if(Math.hypot(p.x-state.px,p.y-state.py)<20){state.hp=Math.max(0,state.hp-p.damage);state.projectiles.splice(i,1);continue}if(p.life<=0)state.projectiles.splice(i,1)}if(time-state.lastSpawn>=state.spawnInterval&&state.wave<=maxWaves){state.lastSpawn=time;const bossWave=state.bossTypes.length>0&&state.wave%Math.max(5,Math.ceil(maxWaves/2))===0;for(let i=0;i<state.enemyCount;i++)spawn(i,bossWave&&i===0);if(state.wave<maxWaves)state.wave++}if(state.hp<=0){state.hp=0;running=false;statusNode.textContent='게임오버'}else if(state.wave>=maxWaves&&state.enemies.length===0)statusNode.textContent='클리어';else statusNode.textContent='플레이 중'}\nfunction draw(){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#172554';ctx.fillRect(0,0,canvas.width,canvas.height);for(const enemy of state.enemies){ctx.fillStyle=enemy.boss?'#f59e0b':'#ef4444';ctx.beginPath();ctx.arc(enemy.x,enemy.y,enemy.boss?22:16,0,6.283);ctx.fill();ctx.fillStyle='#111827';ctx.fillRect(enemy.x-18,enemy.y-27,36,5);ctx.fillStyle='#4ade80';ctx.fillRect(enemy.x-18,enemy.y-27,36*Math.max(0,enemy.hp/enemy.maxHp),5)}for(const p of state.projectiles){ctx.fillStyle='#fde047';ctx.beginPath();ctx.arc(p.x,p.y,6,0,6.283);ctx.fill()}ctx.fillStyle='#22c55e';ctx.beginPath();ctx.arc(state.px,state.py,18,0,6.283);ctx.fill();ctx.fillStyle='rgba(0,0,0,.48)';ctx.fillRect(10,10,410,92);ctx.fillStyle='#fff';ctx.font='700 17px system-ui';ctx.fillText('HP '+Math.ceil(state.hp)+' / '+state.maxHp,22,36);ctx.fillText('공격 '+state.damage+' · 골드 '+state.gold+' · 점수 '+state.score,22,61);ctx.fillText('웨이브 '+state.wave+' / '+maxWaves,22,86)}\nfunction updateJoystick(event){const rect=document.getElementById('joystick').getBoundingClientRect(),max=rect.width*.35,cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;let dx=event.clientX-cx,dy=event.clientY-cy,d=Math.hypot(dx,dy);if(d>max){dx=dx/d*max;dy=dy/d*max}joystickX=dx/max;joystickY=dy/max;document.getElementById('joystickKnob').style.left=`calc(50% + ${dx}px)`;document.getElementById('joystickKnob').style.top=`calc(50% + ${dy}px)`}\nfunction resetJoystick(){joystickX=0;joystickY=0;const knob=document.getElementById('joystickKnob');knob.style.left='50%';knob.style.top='50%'}\nconst joystick=document.getElementById('joystick');joystick.addEventListener('pointerdown',e=>{e.preventDefault();joystick.setPointerCapture?.(e.pointerId);updateJoystick(e)},{passive:false});joystick.addEventListener('pointermove',e=>{if(e.pressure>0||e.buttons>0){e.preventDefault();updateJoystick(e)}},{passive:false});['pointerup','pointercancel','lostpointercapture'].forEach(type=>joystick.addEventListener(type,e=>{e.preventDefault();resetJoystick()},{passive:false}));\ndocument.getElementById('attack').onclick=()=>attack(performance.now());document.getElementById('pause').onclick=()=>{if(runtime.paused){runtime.setPaused(false,'button');lastTime=performance.now();statusNode.textContent='플레이 중';showToast('계속 진행')}else{runtime.setPaused(true,'button');resetJoystick();statusNode.textContent='일시정지';showToast('일시정지')}};document.getElementById('restart').onclick=reset;document.getElementById('save').onclick=saveGame;document.getElementById('load').onclick=()=>{if(loadGame()){running=true;statusNode.textContent='저장된 게임 불러옴';showToast('불러왔어')}else showToast('저장된 게임이 없어')};document.getElementById('craft').onclick=()=>showToast(craftingCount?'제작 메뉴 '+craftingCount+'개':'제작할 아이템이 없어');\nfunction loop(now){const dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;update(dt,now);draw();requestAnimationFrame(loop)}\nruntime.boot({visibilityPause:true,errorReporter:()=>{statusNode.textContent='오류가 감지됐어'}});if(!loadGame())for(let i=0;i<state.enemyCount;i++)spawn(i);requestAnimationFrame(loop);\n</script></body></html>`;
}

export function buildGeneratedGame({ packageData = {}, title = null } = {}) {
  const resolvedTitle = title || packageData?.blueprint?.gameId || packageData?.gameId || 'vibe-game';
  return Object.freeze({
    slug: safeSlug(resolvedTitle),
    filename: 'index.html',
    html: buildGameHtml({ packageData, title: resolvedTitle }),
    gameId: packageData?.gameId || 'vibe-game'
  });
}

if (typeof window !== 'undefined') window.buildJaewoonGeneratedGame = buildGeneratedGame;
