import { IslandRendererV3 } from './render-v3.js';

const proto = IslandRendererV3.prototype;
const originalDraw = proto.draw;
const TARGET_FRAME_MS = 1000 / 32;
const SC = 1/36;

// 모바일 3D 전용 크기 갱신. 기존 포인터 입력용 캔버스 버퍼는 1픽셀만 유지한다.
proto.resize = function optimizedResize() {
  const mobile = navigator.maxTouchPoints > 0 || window.innerWidth < 900;
  this.dpr = 1;
  this.width = Math.max(1, window.innerWidth);
  this.height = Math.max(1, window.innerHeight);
  this.canvas.width = 1;
  this.canvas.height = 1;
  this.canvas.style.width = `${this.width}px`;
  this.canvas.style.height = `${this.height}px`;
  this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (this.native3d) {
    this.gl.setPixelRatio(Math.min(mobile ? 1.25 : 1.5, window.devicePixelRatio || 1));
    this.gl.setSize(this.width, this.height, false);
    this.camera3.left = -this.width * SC / 2;
    this.camera3.right = this.width * SC / 2;
    this.camera3.top = this.height * SC / 2;
    this.camera3.bottom = -this.height * SC / 2;
    this.camera3.updateProjectionMatrix();
  }
};

// 2D 바다 배경 제거: 확장 렌더 메서드는 유지하지만 그림은 오직 WebGL 장면에 둔다.
proto.drawSea = function optimizedSea() {};

let lastPaintAt = 0;
proto.draw = function optimizedDraw(game) {
  const now = performance.now();
  // 전역 32FPS 스케줄러와 겹쳐 16FPS로 떨어지지 않도록 여유값을 둔다.
  if (now - lastPaintAt < TARGET_FRAME_MS - 2) return;
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
