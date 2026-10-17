import { IslandRendererV3 } from './render-v3.js';

const HALL_COST = { wood: 5, stone: 5 };
let currentGame = null;
let boosted = false;

function toast(message) {
  const el = document.querySelector('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2000);
}

function hallUnbuilt() {
  return Boolean(currentGame && !currentGame.state?.villageDevelopment?.townHallBuilt);
}

function prepareHallCost(event) {
  const button = event.target?.closest?.('#villageBuildButton');
  if (!button || button.dataset.kind !== 'hall' || !hallUnbuilt() || boosted) return;
  const inv = currentGame.state.inventory || (currentGame.state.inventory = {});
  const wood = Number(inv.wood) || 0;
  const stone = Number(inv.stone) || 0;
  if (wood < HALL_COST.wood || stone < HALL_COST.stone) {
    event.preventDefault();
    event.stopImmediatePropagation();
    toast('🏛️ 마을회관 재료 부족 · 나무5 돌5');
    return;
  }

  // 기존 world-upgrade-v3는 코어 비용 12/10을 6/5로 보정한다.
  // 여기서 나무 1개를 선지급하면 최종 실결제는 정확히 5/5가 된다.
  boosted = true;
  inv.wood = wood + 1;
  queueMicrotask(() => {
    const built = Boolean(currentGame?.state?.villageDevelopment?.townHallBuilt);
    if (!built && currentGame?.state?.inventory) {
      currentGame.state.inventory.wood = Math.max(0, (Number(currentGame.state.inventory.wood) || 0) - 1);
    }
    boosted = false;
  });
}

document.addEventListener('click', prepareHallCost, true);

function patchHallUi() {
  if (!currentGame || !hallUnbuilt()) return;
  const button = document.querySelector('#villageBuildButton');
  if (button?.dataset.kind === 'hall') button.textContent = '🏛️ 마을회관 건설 · 나무5 돌5';
  const hint = document.querySelector('#hint');
  if (hint?.textContent?.includes('마을회관') && hint.textContent.includes('나무6')) {
    hint.textContent = hint.textContent.replace('나무6 돌5', '나무5 돌5');
  }
}

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
rendererProto.draw = function drawWithTownHallFiveFive(game) {
  currentGame = game;
  const result = originalDraw.call(this, game);
  queueMicrotask(patchHallUi);
  return result;
};
