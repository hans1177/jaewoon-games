// 파일명: web-games/cozy-island/game.js
// 역할: 포근섬 게임 로직·입력·저장

import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRenderer } from './render.js';

const GAME_ID = 'cozy-island';
const TOOLS = [
  { id: 'hand', label: '손', icon: '🤲' },
  { id: 'rod', label: '낚싯대', icon: '🎣' },
  { id: 'seed', label: '씨앗', icon: '🌱' },
  { id: 'water', label: '물뿌리개', icon: '💧' }
];

const DEFAULT_STATE = {
  version: 1,
  day: 1,
  minutes: 480,
  coins: 40,
  weather: '맑음',
  expanded: false,
  decor: [],
  inventory: { wood: 0, stone: 0, flower: 0, fish: 0, crop: 0, seeds: 3 },
  plots: Array.from({ length: 6 }, () => ({ state: 'empty', plantedAt: 0, watered: false, ready: false })),
  player: { x: 730, y: 640 },
  playMinutes: 0
};

const world = { w: 1800, h: 1200 };
const runtime = new JaewoonVibeRuntime({ gameId: GAME_ID, autosaveDelay: 350 }).boot({
  errorReporter: (error) => console.error('[포근섬 오류]', error)
});

const saved = runtime.loadProgress(DEFAULT_STATE);
const state = normalizeState(saved);
const canvas = document.querySelector('#game');
const renderer = new IslandRenderer(canvas);
const player = { x: state.player.x, y: state.player.y, speed: 180 };
const pressed = new Set();
let selectedTool = 0;
let lastFrame = performance.now();
let gameClockCarry = 0;
let toastTimer = 0;
let fishing = null;
let fishingFrame = 0;

const ui = {
  day: document.querySelector('#dayText'),
  time: document.querySelector('#timeText'),
  weather: document.querySelector('#weatherText'),
  coins: document.querySelector('#coinText'),
  hint: document.querySelector('#hint'),
  toast: document.querySelector('#toast'),
  tool: document.querySelector('#toolButton'),
  action: document.querySelector('#actionButton'),
  inventory: document.querySelector('#inventoryButton'),
  panel: document.querySelector('#panel'),
  panelTitle: document.querySelector('#panelTitle'),
  panelBody: document.querySelector('#panelBody'),
  panelClose: document.querySelector('#panelClose'),
  fishing: document.querySelector('#fishing'),
  fishMarker: document.querySelector('#fishMarker'),
  catch: document.querySelector('#catchButton'),
  cancelFishing: document.querySelector('#cancelFishing')
};

const nodes = [
  ...[[260,220],[330,760],[515,835],[590,205],[1120,220],[1225,720],[300,940],[1040,790],[1460,260],[1540,850]].map((p,i) => ({ id:`tree${i}`, kind:'tree', x:p[0], y:p[1], readyAt:0, lockedByExpansion:i>7 })),
  ...[[460,650],[570,700],[855,675],[1185,650],[420,930],[1280,300],[1510,580]].map((p,i) => ({ id:`flower${i}`, kind:'flower', x:p[0], y:p[1], readyAt:0, icon:i%2?'🌷':'🌼', lockedByExpansion:i>5 })),
  ...[[250,555],[600,920],[1180,820],[1260,190],[1510,390]].map((p,i) => ({ id:`rock${i}`, kind:'rock', x:p[0], y:p[1], readyAt:0, lockedByExpansion:i>3 }))
];

const npcs = [
  { id:'sky', name:'하늘', icon:'🧑‍🦰', x:610, y:555, line:'오늘 바람이 참 좋다. 텃밭에 씨앗이 모자라면 나한테 와.' },
  { id:'momo', name:'모모', icon:'👩‍🦱', x:805, y:600, line:'연못에는 아침이랑 저녁에 물고기가 잘 보여.' },
  { id:'danbi', name:'단비', icon:'🧒', x:960, y:700, line:'비 오는 날엔 텃밭에 물을 따로 안 줘도 돼.' }
];

const game = { world, state, player, nodes, npcs, weather: state.weather, timeNow: Date.now() };

runtime.bindKeyboard({
  KeyW:{down:()=>pressed.add('up'),up:()=>pressed.delete('up')}, ArrowUp:{down:()=>pressed.add('up'),up:()=>pressed.delete('up')},
  KeyS:{down:()=>pressed.add('down'),up:()=>pressed.delete('down')}, ArrowDown:{down:()=>pressed.add('down'),up:()=>pressed.delete('down')},
  KeyA:{down:()=>pressed.add('left'),up:()=>pressed.delete('left')}, ArrowLeft:{down:()=>pressed.add('left'),up:()=>pressed.delete('left')},
  KeyD:{down:()=>pressed.add('right'),up:()=>pressed.delete('right')}, ArrowRight:{down:()=>pressed.add('right'),up:()=>pressed.delete('right')},
  Space:{down:(event)=>{ event.preventDefault(); interact(); }},
  KeyE:{down:()=>cycleTool()}
});

for (const button of document.querySelectorAll('.move')) {
  const dir = button.dataset.dir;
  const start = (event) => { event.preventDefault(); pressed.add(dir); button.classList.add('active'); };
  const stop = () => { pressed.delete(dir); button.classList.remove('active'); };
  button.addEventListener('pointerdown', start, { passive:false });
  button.addEventListener('pointerup', stop);
  button.addEventListener('pointercancel', stop);
  button.addEventListener('pointerleave', stop);
}

runtime.bindTouchButton(ui.action, interact);
runtime.bindTouchButton(ui.tool, cycleTool);
runtime.bindTouchButton(ui.inventory, openInventory);
runtime.bindTouchButton(ui.panelClose, () => ui.panel.close());
runtime.bindTouchButton(ui.catch, catchFish);
runtime.bindTouchButton(ui.cancelFishing, stopFishing);
window.addEventListener('resize', () => renderer.resize());
window.addEventListener('jaewoon:pause', (event) => { if (event.detail.paused) pressed.clear(); });

function normalizeState(raw) {
  const inventory = { ...DEFAULT_STATE.inventory, ...(raw?.inventory || {}) };
  const plots = Array.isArray(raw?.plots) && raw.plots.length === 6
    ? raw.plots.map(p => ({ state:'empty', plantedAt:0, watered:false, ready:false, ...p }))
    : structuredClone(DEFAULT_STATE.plots);
  return {
    ...structuredClone(DEFAULT_STATE),
    ...(raw || {}),
    inventory,
    plots,
    decor: Array.isArray(raw?.decor) ? raw.decor.slice(0,3) : [],
    player: { ...DEFAULT_STATE.player, ...(raw?.player || {}) }
  };
}

function saveSoon() {
  state.player = { x: Math.round(player.x), y: Math.round(player.y) };
  runtime.queueSaveProgress(state);
}

function toast(message) {
  clearTimeout(toastTimer);
  ui.toast.textContent = message;
  ui.toast.classList.add('show');
  toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 1700);
}

function cycleTool() {
  if (ui.panel.open || ui.fishing.open) return;
  selectedTool = (selectedTool + 1) % TOOLS.length;
  updateToolUI();
  toast(`${TOOLS[selectedTool].icon} ${TOOLS[selectedTool].label}`);
}

function updateToolUI() {
  const tool = TOOLS[selectedTool];
  ui.tool.innerHTML = `${tool.icon}<small>${tool.label}</small>`;
}

function openInventory() {
  if (ui.fishing.open) return;
  ui.panelTitle.textContent = '가방';
  const inv = state.inventory;
  ui.panelBody.innerHTML = `
    <div class="inventory-grid">
      ${itemCard('🪵 나뭇가지', inv.wood)}${itemCard('🪨 돌', inv.stone)}
      ${itemCard('🌼 꽃', inv.flower)}${itemCard('🐟 물고기', inv.fish)}
      ${itemCard('🥕 수확물', inv.crop)}${itemCard('🌱 씨앗', inv.seeds)}
    </div>
    <p class="panel-note">출하 바구니에 물고기·꽃·수확물을 넣으면 골드를 벌 수 있어. 진행은 자동 저장돼.</p>`;
  ui.panel.showModal();
}

function itemCard(name, count) { return `<div class="item-card">${name}<span>${Number(count)||0}개</span></div>`; }

function distanceTo(x,y) { return Math.hypot(player.x-x, player.y-y); }

function nearestInteraction() {
  const candidates = [];
  for (const node of nodes) {
    if (node.lockedByExpansion && !state.expanded) continue;
    candidates.push({ type:'node', item:node, d:distanceTo(node.x,node.y) });
  }
  npcs.forEach(npc => candidates.push({ type:'npc', item:npc, d:distanceTo(npc.x,npc.y) }));
  state.plots.forEach((plot,i) => {
    const x = 959 + (i%3)*78, y = 404 + Math.floor(i/3)*78;
    candidates.push({ type:'plot', item:{plot,index:i,x,y}, d:distanceTo(x,y) });
  });
  candidates.push({ type:'house', item:null, d:distanceTo(765,350) });
  candidates.push({ type:'ship', item:null, d:distanceTo(775,760) });
  candidates.push({ type:'fish', item:null, d:distanceTo(520,430) });
  if (!state.expanded) candidates.push({ type:'expand', item:null, d:distanceTo(1325,600) });
  candidates.sort((a,b)=>a.d-b.d);
  return candidates[0]?.d <= 82 ? candidates[0] : null;
}

function interactionHint(target) {
  if (!target) return '섬을 천천히 둘러봐';
  const tool = TOOLS[selectedTool].id;
  if (target.type === 'node') {
    if (target.item.kind === 'tree') return '행동: 나뭇가지 줍기';
    if (target.item.kind === 'flower') return '행동: 꽃 꺾기';
    return '행동: 작은 돌 줍기';
  }
  if (target.type === 'npc') return `행동: ${target.item.name}와 이야기`;
  if (target.type === 'house') return '행동: 집 꾸미기';
  if (target.type === 'ship') return '행동: 출하하기';
  if (target.type === 'fish') return tool === 'rod' ? '행동: 낚시하기' : '낚싯대를 골라봐';
  if (target.type === 'expand') return '행동: 섬 확장하기 · 120골드';
  if (target.type === 'plot') {
    const plot = target.item.plot;
    if (plot.state === 'empty') return tool === 'seed' ? '행동: 씨앗 심기' : '씨앗을 골라봐';
    if (plot.ready) return '행동: 수확하기';
    if (!plot.watered) return state.weather === '비' ? '비가 텃밭에 물을 주고 있어' : '물뿌리개를 골라봐';
    return '작물이 자라는 중이야';
  }
  return '행동';
}

function interact() {
  if (runtime.paused || ui.panel.open || ui.fishing.open) return;
  const target = nearestInteraction();
  if (!target) { toast('가까이 가서 행동해봐'); return; }
  const tool = TOOLS[selectedTool].id;

  if (target.type === 'node') collectNode(target.item);
  else if (target.type === 'npc') talkTo(target.item);
  else if (target.type === 'house') openDecor();
  else if (target.type === 'ship') shipGoods();
  else if (target.type === 'fish') tool === 'rod' ? startFishing() : toast('낚싯대를 선택해');
  else if (target.type === 'expand') expandIsland();
  else if (target.type === 'plot') usePlot(target.item.index, tool);
}

function collectNode(node) {
  const now = Date.now();
  if (node.readyAt > now) { toast('조금 뒤에 다시 자라'); return; }
  if (node.kind === 'tree') { state.inventory.wood++; toast('🪵 나뭇가지 +1'); }
  if (node.kind === 'flower') { state.inventory.flower++; toast('🌼 꽃 +1'); }
  if (node.kind === 'rock') { state.inventory.stone++; toast('🪨 작은 돌 +1'); }
  node.readyAt = now + 30000;
  runtime.vibrate(14);
  saveSoon();
}

function talkTo(npc) {
  ui.panelTitle.textContent = npc.name;
  let extra = '';
  if (npc.id === 'sky') {
    extra = `<button class="choice" data-buy-seed><span>🌱 씨앗 3개 사기</span><b>15골드</b></button>`;
  }
  ui.panelBody.innerHTML = `<p class="panel-note">${npc.line}</p><div class="choice-grid">${extra}</div>`;
  ui.panel.showModal();
  const buy = ui.panelBody.querySelector('[data-buy-seed]');
  if (buy) buy.addEventListener('click', () => {
    if (state.coins < 15) { toast('골드가 부족해'); return; }
    state.coins -= 15; state.inventory.seeds += 3; saveSoon(); updateHUD(); toast('🌱 씨앗 +3');
  });
}

function openDecor() {
  const options = [
    { id:'rug', name:'포근 러그', icon:'🟩', cost:30 },
    { id:'plant', name:'화분', icon:'🪴', cost:45 },
    { id:'lamp', name:'작은 조명', icon:'🏮', cost:60 }
  ];
  ui.panelTitle.textContent = '우리 집 꾸미기';
  ui.panelBody.innerHTML = `<div class="choice-grid">${options.map(o => {
    const owned = state.decor.includes(o.id);
    return `<button class="choice" data-decor="${o.id}" ${owned?'disabled':''}><span>${o.icon} ${o.name}</span><b>${owned?'배치됨':`${o.cost}골드`}</b></button>`;
  }).join('')}</div><p class="panel-note">꾸미기는 최대 3개까지 저장돼.</p>`;
  ui.panel.showModal();
  ui.panelBody.querySelectorAll('[data-decor]').forEach(button => button.addEventListener('click', () => {
    const option = options.find(o => o.id === button.dataset.decor);
    if (!option || state.decor.includes(option.id)) return;
    if (state.coins < option.cost) { toast('골드가 부족해'); return; }
    state.coins -= option.cost; state.decor.push(option.id); saveSoon(); updateHUD(); openDecor(); toast(`${option.icon} 꾸미기 완료`);
  }));
}

function shipGoods() {
  const inv = state.inventory;
  const earned = inv.fish * 12 + inv.flower * 4 + inv.crop * 18;
  if (earned <= 0) { toast('출하할 물건이 없어'); return; }
  inv.fish = 0; inv.flower = 0; inv.crop = 0;
  state.coins += earned;
  saveSoon(); updateHUD();
  toast(`🪙 출하 수익 +${earned}`);
}

function usePlot(index, tool) {
  const plot = state.plots[index];
  if (plot.ready) {
    plot.state = 'empty'; plot.plantedAt = 0; plot.watered = false; plot.ready = false;
    state.inventory.crop++;
    saveSoon(); toast('🥕 수확물 +1'); return;
  }
  if (plot.state === 'empty') {
    if (tool !== 'seed') { toast('씨앗을 선택해'); return; }
    if (state.inventory.seeds <= 0) { toast('씨앗이 없어. 하늘에게 사봐'); return; }
    state.inventory.seeds--;
    plot.state = 'growing'; plot.plantedAt = totalGameMinutes(); plot.watered = state.weather === '비';
    saveSoon(); toast('🌱 씨앗을 심었어'); return;
  }
  if (!plot.watered) {
    if (state.weather === '비') { plot.watered = true; saveSoon(); toast('🌧️ 빗물이 충분해'); return; }
    if (tool !== 'water') { toast('물뿌리개를 선택해'); return; }
    plot.watered = true; saveSoon(); runtime.vibrate(10); toast('💧 물을 줬어'); return;
  }
  toast('🌱 천천히 자라는 중이야');
}

function expandIsland() {
  if (state.coins < 120) { toast(`섬 확장에는 120골드가 필요해 · 현재 ${state.coins}`); return; }
  state.coins -= 120; state.expanded = true; saveSoon(); updateHUD();
  toast('🏝️ 동쪽 작은 섬이 열렸어!');
}

function startFishing() {
  if (fishing) return;
  fishing = { pos: 0, dir: 1, speed: .58 + Math.random() * .18 };
  pressed.clear();
  ui.fishing.showModal();
  const tick = () => {
    if (!fishing) return;
    fishing.pos += fishing.dir * fishing.speed * 1.6;
    if (fishing.pos >= 100) { fishing.pos = 100; fishing.dir = -1; }
    if (fishing.pos <= 0) { fishing.pos = 0; fishing.dir = 1; }
    ui.fishMarker.style.left = `${fishing.pos}%`;
    fishingFrame = requestAnimationFrame(tick);
  };
  fishingFrame = requestAnimationFrame(tick);
}

function catchFish() {
  if (!fishing) return;
  const success = fishing.pos >= 42 && fishing.pos <= 62;
  if (success) {
    state.inventory.fish++;
    saveSoon(); runtime.vibrate([18,25,18]);
    stopFishing(); toast('🐟 물고기를 잡았어!');
  } else {
    stopFishing(); toast('물고기가 빠져나갔어');
  }
}

function stopFishing() {
  if (!fishing) { if (ui.fishing.open) ui.fishing.close(); return; }
  fishing = null;
  cancelAnimationFrame(fishingFrame);
  fishingFrame = 0;
  if (ui.fishing.open) ui.fishing.close();
}

function totalGameMinutes() { return (state.day - 1) * 1440 + state.minutes; }

function updateCrops() {
  const total = totalGameMinutes();
  let changed = false;
  for (const plot of state.plots) {
    if (plot.state !== 'growing' || plot.ready || !plot.watered) continue;
    if (total - plot.plantedAt >= 240) { plot.ready = true; changed = true; }
  }
  if (changed) saveSoon();
}

function advanceClock(realSeconds) {
  gameClockCarry += realSeconds;
  if (gameClockCarry < .5) return;
  const ticks = Math.floor(gameClockCarry / .5);
  gameClockCarry -= ticks * .5;
  state.minutes += ticks * 5;
  state.playMinutes += ticks * 2.5 / 60;
  while (state.minutes >= 1440) {
    state.minutes -= 1440;
    state.day++;
    state.weather = seededWeather(state.day);
    game.weather = state.weather;
    if (state.weather === '비') state.plots.forEach(p => { if (p.state === 'growing') p.watered = true; });
    toast(`${state.day}일차 아침 · ${state.weather === '비' ? '비가 내려' : '맑은 날이야'}`);
  }
  updateCrops();
  updateHUD();
  saveSoon();
}

function seededWeather(day) {
  const n = Math.abs(Math.sin(day * 91.731) * 10000) % 1;
  return n < .28 ? '비' : '맑음';
}

function updateHUD() {
  const h = Math.floor(state.minutes / 60);
  const m = Math.floor(state.minutes % 60);
  const isPm = h >= 12;
  const h12 = ((h + 11) % 12) + 1;
  ui.day.textContent = `${state.day}일차`;
  ui.time.textContent = `${isPm ? '오후' : '오전'} ${h12}:${String(m).padStart(2,'0')}`;
  ui.weather.textContent = state.weather === '비' ? '🌧️ 비' : '☀️ 맑음';
  ui.coins.textContent = String(state.coins);
}

function canMoveTo(x, y) {
  const maxX = state.expanded ? 1620 : 1305;
  if (x < 165 || x > maxX || y < 160 || y > 1025) return false;
  const pond = Math.pow((x - 390) / 150, 2) + Math.pow((y - 370) / 112, 2) < 1;
  if (pond) return false;
  if (x > 635 && x < 900 && y > 170 && y < 415) return false;
  return true;
}

function updateMovement(dt) {
  let dx = (pressed.has('right') ? 1 : 0) - (pressed.has('left') ? 1 : 0);
  let dy = (pressed.has('down') ? 1 : 0) - (pressed.has('up') ? 1 : 0);
  if (!dx && !dy) return;
  const mag = Math.hypot(dx,dy) || 1;
  dx /= mag; dy /= mag;
  const nextX = player.x + dx * player.speed * dt;
  const nextY = player.y + dy * player.speed * dt;
  if (canMoveTo(nextX, player.y)) player.x = nextX;
  if (canMoveTo(player.x, nextY)) player.y = nextY;
}

function updateHint() { ui.hint.textContent = interactionHint(nearestInteraction()); }

function frame(now) {
  const dt = Math.min(.05, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  game.timeNow = Date.now();
  if (!runtime.paused && !ui.panel.open && !ui.fishing.open) {
    updateMovement(dt);
    advanceClock(dt);
  }
  updateHint();
  renderer.draw(game);
  requestAnimationFrame(frame);
}

updateToolUI();
updateHUD();
updateCrops();
requestAnimationFrame(frame);
