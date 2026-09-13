import { IslandRendererV3 } from './render-v3.js';

const proto = IslandRendererV3.prototype;
const originalDraw = proto.draw;

// 모바일에서 2x DPR 전체 월드를 매 프레임 그리던 비용을 낮춘다.
proto.resize = function optimizedResize() {
  const mobile = navigator.maxTouchPoints > 0 || window.innerWidth < 900;
  this.dpr = Math.min(mobile ? 1.5 : 2, window.devicePixelRatio || 1);
  this.width = Math.max(1, window.innerWidth);
  this.height = Math.max(1, window.innerHeight);
  this.canvas.width = Math.round(this.width * this.dpr);
  this.canvas.height = Math.round(this.height * this.dpr);
  this.canvas.style.width = `${this.width}px`;
  this.canvas.style.height = `${this.height}px`;
  this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
};

// 3100x2200 월드 전체 바다 파도를 그리지 않고 카메라 주변만 그린다.
proto.drawSea = function optimizedSea(ctx, game) {
  const cam = this.camera(game);
  const pad = 90;
  const left = cam.x - pad;
  const top = cam.y - pad;
  const right = cam.x + this.width + pad;
  const bottom = cam.y + this.height + pad;

  ctx.fillStyle = '#82cadd';
  ctx.fillRect(left, top, right - left, bottom - top);
  ctx.strokeStyle = 'rgba(255,255,255,.22)';

  const startY = Math.floor(top / 55) * 55;
  const startX = Math.floor(left / 85) * 85;
  for (let y = startY; y <= bottom; y += 55) {
    ctx.beginPath();
    for (let x = startX; x <= right; x += 85) {
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 20, y - 6, x + 40, y);
    }
    ctx.stroke();
  }
};

let lastPaintAt = 0;
proto.draw = function optimizedDraw(game) {
  const now = performance.now();
  if (now - lastPaintAt < 32) return;
  lastPaintAt = now;

  // 예전 저장에 기사 4명 이상이 남아 있어도 새 최대치 3명을 강제한다.
  let knightCount = 0;
  let trimmed = false;
  for (let i = 0; i < (game.allies || []).length; i++) {
    const unit = game.allies[i];
    if (unit?.kind !== 'knight' || unit.hp <= 0) continue;
    knightCount++;
    if (knightCount <= 3) continue;
    game.allies.splice(i, 1);
    i--;
    trimmed = true;
  }
  const livingKnights = (game.allies || []).filter(unit => unit?.kind === 'knight' && unit.hp > 0).length;
  if (game.state.knightCount !== livingKnights) game.state.knightCount = livingKnights;
  if (trimmed && Array.isArray(game.state.army)) {
    game.state.army = (game.allies || []).filter(unit => unit?.hp > 0).map(unit => ({ kind: unit.kind }));
  }

  return originalDraw.call(this, game);
};
