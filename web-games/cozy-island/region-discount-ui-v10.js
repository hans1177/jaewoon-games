import { IslandRendererV3 } from './render-v3.js';

const rendererProto = IslandRendererV3.prototype;
const originalDrawIsland = rendererProto.drawIsland;
rendererProto.drawIsland = function drawIslandWithHalfPriceLabels(ctx, game) {
  originalDrawIsland.call(this, ctx, game);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '800 13px system-ui';
  ctx.fillStyle = 'rgba(245,239,215,.96)';
  if (!game.state?.northernRegion?.unlocked) {
    ctx.fillRect(2050, 98, 240, 29);
    ctx.fillStyle = '#315748';
    ctx.fillText('북쪽 지역 · 100골드', 2170, 118);
    ctx.fillStyle = 'rgba(245,239,215,.96)';
  }
  if (!game.state?.cozyExpansionV4?.west?.unlocked) {
    ctx.fillRect(35, 430, 220, 28);
    ctx.fillStyle = '#315748';
    ctx.fillText('서쪽 지역 · 150골드', 145, 450);
  }
  ctx.restore();
};
