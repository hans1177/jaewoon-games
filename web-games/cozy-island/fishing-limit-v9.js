const STORAGE_KEY = 'jaewoon-games:cozy-island:fishing-v9';
const CATCH_LIMIT = 10;
const COOLDOWN_MS = 20000;

function readState() {
  let value = {};
  try { value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch {}
  const caught = Math.max(0, Math.min(CATCH_LIMIT, Math.floor(Number(value.caught) || 0)));
  const cooldownUntil = Math.max(0, Number(value.cooldownUntil) || 0);
  if (cooldownUntil && Date.now() >= cooldownUntil) return { caught: 0, cooldownUntil: 0 };
  return { caught, cooldownUntil };
}

function writeState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function toast(message) {
  const el = document.querySelector('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2100);
}

const previousShowModal = HTMLDialogElement.prototype.showModal;
const nativeShowModal = window.__cozyNativeShowModalV9 || previousShowModal;

HTMLDialogElement.prototype.showModal = function showModalFishingV9(...args) {
  if (this.id !== 'fishing') return previousShowModal.apply(this, args);

  const state = readState();
  if (state.cooldownUntil > Date.now()) {
    const remain = Math.max(1, Math.ceil((state.cooldownUntil - Date.now()) / 1000));
    toast(`🎣 10마리 잡은 뒤 휴식 중 · ${remain}초 남음`);
    return;
  }

  if (state.cooldownUntil) {
    state.caught = 0;
    state.cooldownUntil = 0;
    writeState(state);
  }

  // Bypass older 30초/1분 5회 wrappers; v9 is the single fishing limiter.
  return nativeShowModal.apply(this, args);
};

let lastFishToastAt = 0;
const toastEl = document.querySelector('#toast');
if (toastEl) {
  const observer = new MutationObserver(() => {
    if (toastEl.textContent !== '🐟 물고기 +1') return;
    const now = performance.now();
    if (now - lastFishToastAt < 250) return;
    lastFishToastAt = now;

    const state = readState();
    if (state.cooldownUntil > Date.now()) return;
    state.caught = Math.min(CATCH_LIMIT, state.caught + 1);

    if (state.caught >= CATCH_LIMIT) {
      state.cooldownUntil = Date.now() + COOLDOWN_MS;
      writeState(state);
      setTimeout(() => toast(`🎣 10마리 잡았어 · 이제 20초 쉬어`), 30);
    } else {
      writeState(state);
    }
    patchFishingText();
  });
  observer.observe(toastEl, { childList: true, characterData: true, subtree: true });
}

function patchFishingText() {
  const dialog = document.querySelector('#fishing');
  const text = dialog?.querySelector('p');
  if (!text) return;
  const state = readState();
  const caught = state.cooldownUntil > Date.now() ? CATCH_LIMIT : state.caught;
  text.textContent = `물고기가 초록 구간에 들어왔을 때 잡아! · ${caught}/${CATCH_LIMIT}마리 후 20초 휴식`;
}

patchFishingText();
setInterval(patchFishingText, 500);
