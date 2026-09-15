import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const BARRACKS_BATCH = 10;
const BARRACKS_COOLDOWN_MS = 30000;
const BOUNTY_FAR_FUTURE = 4102444800000; // 2100-01-01: 자동 랜덤 갱신 비활성화
const BOARD = { x: 520, y: 1035, radius: 92 };
const BOUNTIES = {
  wolf: { label: '🐺 늑대 3마리 처치', target: 3, reward: 120 },
  bear: { label: '🐻 곰 2마리 처치', target: 2, reward: 180 },
  snake: { label: '🐍 뱀 2마리 처치', target: 2, reward: 150 }
};

let currentGame = null;
let activeRuntime = null;
let knownAllies = null;

const originalLoadProgress = JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress = JaewoonVibeRuntime.prototype.queueSaveProgress;

function ensureRules(state) {
  if (!state || typeof state !== 'object') return null;
  const old = state.rulesV7 && typeof state.rulesV7 === 'object' ? state.rulesV7 : {};
  state.rulesV7 = old;
  old.barracks ||= {};
  old.barracks.recruits = Math.max(0, Math.min(BARRACKS_BATCH - 1, Math.floor(Number(old.barracks.recruits) || 0)));
  old.barracks.cooldownUntil = Math.max(0, Number(old.barracks.cooldownUntil) || 0);
  old.bounty ||= {};
  old.bounty.initialized = Boolean(old.bounty.initialized);
  old.bounty.selected = ['wolf', 'bear', 'snake'].includes(old.bounty.selected) ? old.bounty.selected : '';

  state.bountyTaxV6 ||= {};
  state.bountyTaxV6.bounty ||= {};
  const bounty = state.bountyTaxV6.bounty;
  if (!old.bounty.initialized) {
    const existing = ['wolf', 'bear', 'snake'].includes(bounty.type) && !bounty.completed ? bounty.type : '';
    old.bounty.selected = existing;
    old.bounty.initialized = true;
    if (!existing) {
      bounty.type = 'wolf';
      bounty.progress = 0;
      bounty.completed = true;
    }
  }
  bounty.refreshAt = BOUNTY_FAR_FUTURE;
  return old;
}

JaewoonVibeRuntime.prototype.loadProgress = function loadWithRulesV7(fallback = {}) {
  const state = originalLoadProgress.call(this, fallback);
  activeRuntime = this;
  ensureRules(state);
  return state;
};

JaewoonVibeRuntime.prototype.queueSaveProgress = function saveWithRulesV7(state, delay) {
  activeRuntime = this;
  ensureRules(state);
  return originalQueueSaveProgress.call(this, state, delay);
};

function save() {
  if (!currentGame?.state) return;
  ensureRules(currentGame.state);
  activeRuntime?.queueSaveProgress(currentGame.state);
}

function toast(message) {
  const el = document.querySelector('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2200);
}

function livingAllyIds() {
  return new Set((currentGame?.allies || []).filter(unit => unit && !unit.enemy && unit.hp > 0).map(unit => unit.id));
}

function syncBarracks() {
  if (!currentGame) return;
  const rules = ensureRules(currentGame.state);
  const tracker = rules.barracks;
  const oldTracker = currentGame.state.cozyExpansionV4?.barracks;
  const now = Date.now();
  const ids = livingAllyIds();

  if (!knownAllies) {
    knownAllies = ids;
  } else {
    let added = 0;
    for (const id of ids) if (!knownAllies.has(id)) added++;
    knownAllies = ids;
    if (added > 0) {
      const total = tracker.recruits + added;
      tracker.recruits = total % BARRACKS_BATCH;
      if (total >= BARRACKS_BATCH) {
        tracker.cooldownUntil = now + BARRACKS_COOLDOWN_MS;
        toast('🏕️ 병력 10명 모집 완료 · 병영 30초 쿨타임');
      } else {
        const el = document.querySelector('#toast');
        if (el?.textContent?.includes('병력 5명 모집 완료')) {
          el.textContent = `🏕️ 병영 모집 ${tracker.recruits}/10 · 10명마다 30초 쿨타임`;
        }
      }
      save();
    }
  }

  if (tracker.cooldownUntil <= now) tracker.cooldownUntil = 0;
  // 기존 5명 단위 쿨타임을 제거하고 10명 단위 쿨타임만 코어 차단값으로 사용한다.
  if (oldTracker) oldTracker.cooldownUntil = tracker.cooldownUntil;
}

function patchBarracksPanel() {
  if (!currentGame || document.querySelector('#panelTitle')?.textContent !== '병영') return;
  const body = document.querySelector('#panelBody');
  if (!body) return;
  const tracker = ensureRules(currentGame.state).barracks;
  const remain = Math.max(0, tracker.cooldownUntil - Date.now());
  let note = body.querySelector('[data-barracks-cadence]');
  if (!note) {
    note = document.createElement('p');
    note.className = 'panel-note';
    note.dataset.barracksCadence = '1';
    body.appendChild(note);
  }
  note.textContent = remain > 0
    ? `병영 쿨타임 ${Math.ceil(remain / 1000)}초 · 10명 모집할 때마다 30초 대기`
    : `병영 모집 ${tracker.recruits}/10 · 10명 모집하면 30초 쿨타임`;
}

function bountyEligible(type) {
  if (type === 'wolf') return true;
  if (type === 'snake') return Boolean(currentGame?.state?.northernRegion?.unlocked);
  if (type === 'bear') return Boolean(currentGame?.state?.cozyExpansionV4?.west?.unlocked);
  return false;
}

function selectBounty(type) {
  if (!currentGame || !BOUNTIES[type]) return;
  if (!bountyEligible(type)) {
    toast(type === 'snake' ? '🐍 북쪽 지역을 먼저 해금해야 해' : '🐻 서쪽 지역을 먼저 해금해야 해');
    return;
  }
  const rules = ensureRules(currentGame.state);
  const bounty = currentGame.state.bountyTaxV6.bounty;
  if (rules.bounty.selected === type && !bounty.completed) {
    toast('📜 이미 진행 중인 현상금이야');
    return;
  }
  rules.bounty.selected = type;
  bounty.type = type;
  bounty.progress = 0;
  bounty.completed = false;
  bounty.refreshAt = BOUNTY_FAR_FUTURE;
  save();
  patchBountyPanel();
  toast(`📜 현상금 선택 · ${BOUNTIES[type].label}`);
}

function patchBountyPanel() {
  if (!currentGame || document.querySelector('#panelTitle')?.textContent !== '현상금 게시판') return;
  const body = document.querySelector('#panelBody');
  if (!body) return;
  const state = ensureRules(currentGame.state);
  const bounty = currentGame.state.bountyTaxV6.bounty;
  const selected = state.bounty.selected;
  const def = BOUNTIES[selected];
  const taxEarned = Math.max(0, Math.floor(Number(currentGame.state.bountyTaxV6.taxEarned) || 0));
  const signature = `${selected}:${bounty.progress}:${bounty.completed}:${bountyEligible('snake')}:${bountyEligible('bear')}:${taxEarned}`;
  if (body.dataset.v7Signature === signature) return;

  body.innerHTML = `<div class="inventory-grid">
    <div class="item-card">📜 선택 의뢰<span>${def ? (bounty.completed ? '완료' : '진행중') : '없음'}</span></div>
    <div class="item-card">🎯 진행도<span>${def ? `${Math.min(Number(bounty.progress)||0, def.target)}/${def.target}` : '-'}</span></div>
    <div class="item-card">🪙 보상<span>${def ? `${def.reward}골드` : '-'}</span></div>
    <div class="item-card">🏘️ 세금<span>20초마다 +10</span></div>
    <div class="item-card">💰 누적 세금<span>${taxEarned}골드</span></div>
  </div>
  <p class="panel-note" style="margin-top:10px">원하는 현상금을 직접 골라.</p>
  <div class="choice-grid" data-bounty-choice-grid>
    ${Object.entries(BOUNTIES).map(([type, item]) => {
      const eligible = bountyEligible(type);
      const active = selected === type && !bounty.completed;
      const lockedText = !eligible ? (type === 'snake' ? '북쪽 해금 필요' : '서쪽 해금 필요') : active ? '진행 중' : `${item.reward}골드`;
      return `<button class="choice" data-bounty-choice="${type}" ${!eligible ? 'disabled' : ''}><span>${item.label}</span><b>${lockedText}</b></button>`;
    }).join('')}
  </div>
  <p class="panel-note">다른 의뢰를 고르면 기존 진행도는 사라지고 새 의뢰가 0부터 시작해.</p>`;
  body.dataset.v7Signature = signature;
  body.querySelectorAll('[data-bounty-choice]').forEach(button => {
    button.addEventListener('click', () => selectBounty(button.dataset.bountyChoice));
  });
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function patchBountyHint() {
  if (!currentGame?.player || distance(currentGame.player, BOARD) > BOARD.radius) return;
  const hint = document.querySelector('#hint');
  if (!hint) return;
  const rules = ensureRules(currentGame.state);
  const bounty = currentGame.state.bountyTaxV6.bounty;
  const def = BOUNTIES[rules.bounty.selected];
  hint.textContent = def
    ? `행동: 현상금 게시판 · ${def.label} ${Math.min(Number(bounty.progress)||0, def.target)}/${def.target}`
    : '행동: 현상금 게시판 · 원하는 의뢰 선택';
}

function maintainManualBounty() {
  if (!currentGame) return;
  const rules = ensureRules(currentGame.state);
  const bounty = currentGame.state.bountyTaxV6.bounty;
  bounty.refreshAt = BOUNTY_FAR_FUTURE;
  if (!rules.bounty.selected) {
    bounty.type = 'wolf';
    bounty.progress = 0;
    bounty.completed = true;
  }
}

function tick() {
  if (!currentGame) return;
  syncBarracks();
  maintainManualBounty();
  patchBarracksPanel();
  patchBountyPanel();
  patchBountyHint();
}

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
rendererProto.draw = function drawWithRulesV7(game) {
  currentGame = game;
  ensureRules(game.state);
  const result = originalDraw.call(this, game);
  syncBarracks();
  maintainManualBounty();
  patchBarracksPanel();
  patchBountyPanel();
  patchBountyHint();
  return result;
};

setInterval(tick, 100);
