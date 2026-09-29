import { IslandRendererV3 } from './render-v3.js';

const HEAVY_BASE_ATTACK = 50;
const HEAVY_UPGRADE_FACTOR = 1.5;

function syncHeavyDamage(game) {
  const level = Math.max(0, Math.min(3, Math.floor(Number(game?.state?.darknessFlameV19?.heavyUpgrade) || 0)));
  const attack = Math.round(HEAVY_BASE_ATTACK * Math.pow(HEAVY_UPGRADE_FACTOR, level) * 100) / 100;
  for (const unit of game?.allies || []) {
    if (!unit || unit.enemy || unit.kind !== 'heavy' || unit.hp <= 0) continue;
    unit.attack = attack;
  }
}

const proto = IslandRendererV3.prototype;
const originalDraw = proto.draw;
proto.draw = function drawWithHeavyDamageV21(game) {
  const result = originalDraw.call(this, game);
  syncHeavyDamage(game);
  return result;
};
