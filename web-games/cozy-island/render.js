// 파일명: web-games/cozy-island/render.js
// 역할: 포근섬 캔버스 그래픽 전용 렌더러

export class IslandRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.resize();
  }

  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.width = Math.max(1, window.innerWidth);
    this.height = Math.max(1, window.innerHeight);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  draw(game) {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);

    const camX = game.player.x - this.width / 2;
    const camY = game.player.y - this.height / 2;
    ctx.save();
    ctx.translate(-camX, -camY);

    this.drawSea(ctx, game);
    this.drawIsland(ctx, game);
    this.drawWorldObjects(ctx, game);
    this.drawUnits(ctx, game);
    this.drawPlayer(ctx, game.player);
    ctx.restore();

    this.drawLight(ctx, game);
    if (game.weather === '비') this.drawRain(ctx);
  }

  drawSea(ctx, game) {
    ctx.fillStyle = '#82cadd';
    ctx.fillRect(0, 0, game.world.w, game.world.h);
    ctx.strokeStyle = 'rgba(255,255,255,.24)';
    ctx.lineWidth = 2;
    for (let y = 28; y < game.world.h; y += 54) {
      ctx.beginPath();
      for (let x = 0; x < game.world.w; x += 80) {
        ctx.moveTo(x + ((y / 54) % 2) * 20, y);
        ctx.quadraticCurveTo(x + 18, y - 7, x + 36, y);
      }
      ctx.stroke();
    }
  }

  drawIsland(ctx, game) {
    const islandW = game.state.expanded ? 1570 : 1260;
    ctx.fillStyle = '#f2dfa8';
    this.roundRect(ctx, 100, 90, islandW, 1010, 110);
    ctx.fill();
    ctx.fillStyle = '#9fd18f';
    this.roundRect(ctx, 145, 135, islandW - 90, 920, 90);
    ctx.fill();

    ctx.fillStyle = '#e6d3a6';
    ctx.beginPath();
    ctx.ellipse(660, 610, 330, 85, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#72bdd3';
    ctx.beginPath();
    ctx.ellipse(390, 370, 145, 105, -.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d6f2f7';
    ctx.lineWidth = 7;
    ctx.stroke();

    ctx.fillStyle = '#c7b282';
    ctx.fillRect(900, 890, 290, 36);
    for (let x = 916; x < 1180; x += 38) {
      ctx.strokeStyle = '#9a835d';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, 890); ctx.lineTo(x, 926); ctx.stroke();
    }

    if (!game.state.expanded) {
      ctx.fillStyle = '#6e826e';
      ctx.fillRect(1360, 470, 16, 250);
      ctx.fillStyle = '#f5e9c6';
      ctx.font = '700 16px system-ui';
      ctx.fillText('섬 확장', 1318, 452);
    }
  }

  drawWorldObjects(ctx, game) {
    this.drawHouse(ctx, game);
    this.drawFarm(ctx, game);
    this.drawBarracks(ctx, game);

    for (const node of game.nodes) {
      if (node.lockedByExpansion && !game.state.expanded) continue;
      if (node.kind === 'tree') this.drawTree(ctx, node, game.timeNow);
      if (node.kind === 'flower') this.drawFlower(ctx, node, game.timeNow);
      if (node.kind === 'rock') this.drawRock(ctx, node, game.timeNow);
    }

    for (const npc of game.npcs) this.drawNpc(ctx, npc);

    ctx.font = '30px system-ui';
    ctx.fillText('🧺', 760, 760);
    ctx.font = '12px system-ui';
    ctx.fillStyle = '#315748';
    ctx.fillText('출하 바구니', 742, 785);

    ctx.font = '31px system-ui';
    ctx.fillText('🎣', 520, 430);
    ctx.fillStyle = '#315748';
    ctx.font = '12px system-ui';
    ctx.fillText('낚시터', 516, 458);

    if (!game.state.expanded) {
      ctx.font = '34px system-ui';
      ctx.fillText('🔐', 1320, 600);
    }

    if (game.raidActive) {
      ctx.fillStyle = '#8f3131';
      ctx.font = '800 18px system-ui';
      ctx.fillText('⚠ 습격 중', 1350, 520);
    }
  }

  drawHouse(ctx, game) {
    ctx.fillStyle = '#f5d9a8';
    ctx.fillRect(660, 250, 210, 145);
    ctx.fillStyle = '#d98265';
    ctx.beginPath();
    ctx.moveTo(635, 270); ctx.lineTo(765, 175); ctx.lineTo(895, 270); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#82583b';
    ctx.fillRect(746, 325, 42, 70);
    ctx.fillStyle = '#bce4e8';
    ctx.fillRect(690, 292, 42, 36);
    ctx.fillRect(805, 292, 42, 36);
    ctx.fillStyle = '#fff';
    ctx.font = '700 13px system-ui';
    ctx.fillText(`우리 집 · 꾸미기 ${game.state.decor.length}/3`, 700, 235);
  }

  drawFarm(ctx, game) {
    ctx.fillStyle = '#b4875d';
    ctx.fillRect(910, 350, 260, 190);
    game.state.plots.forEach((plot, i) => {
      const x = 930 + (i % 3) * 78;
      const y = 375 + Math.floor(i / 3) * 78;
      ctx.fillStyle = plot.watered ? '#6b5549' : '#815f46';
      ctx.fillRect(x, y, 58, 58);
      ctx.strokeStyle = '#d3ad79'; ctx.lineWidth = 2; ctx.strokeRect(x, y, 58, 58);
      if (plot.state === 'growing') {
        ctx.font = '24px system-ui';
        ctx.fillText(plot.ready ? '🥕' : '🌱', x + 16, y + 37);
      }
    });
    ctx.fillStyle = '#315748';
    ctx.font = '700 13px system-ui';
    ctx.fillText('작은 텃밭', 995, 340);
  }

  drawBarracks(ctx, game) {
    const { x, y } = game.barracks;
    if (!game.state.barracksBuilt) {
      ctx.save();
      ctx.setLineDash([8,7]);
      ctx.strokeStyle = '#6d725d';
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 58, y - 46, 116, 92);
      ctx.setLineDash([]);
      ctx.fillStyle = '#315748';
      ctx.font = '700 13px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('병영 건설터', x, y + 65);
      ctx.font = '24px system-ui';
      ctx.fillText('🏗️', x, y + 8);
      ctx.restore();
      return;
    }

    ctx.fillStyle = '#8c6d49';
    ctx.fillRect(x - 58, y - 30, 116, 76);
    ctx.fillStyle = '#646348';
    ctx.beginPath();
    ctx.moveTo(x - 72, y - 30); ctx.lineTo(x, y - 82); ctx.lineTo(x + 72, y - 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#433b31';
    ctx.fillRect(x - 16, y + 8, 32, 38);
    ctx.fillStyle = '#fff';
    ctx.font = '700 13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('병영', x, y - 92);
    ctx.textAlign = 'start';
  }

  drawUnits(ctx, game) {
    const t = performance.now() / 1000;
    for (const unit of game.allies || []) {
      if (game.raidActive) this.drawUnit(ctx, unit);
      else {
        const phase = t * .65 + unit.id * 1.37;
        this.drawUnit(ctx, { ...unit, x: unit.x + Math.cos(phase) * 85, y: unit.y + Math.sin(phase * .8) * 55 });
      }
    }
    for (const unit of game.enemies || []) this.drawUnit(ctx, unit);
  }

  drawUnit(ctx, unit) {
    if (unit.hp <= 0) return;
    const icon = unit.boss ? '👹' : unit.kind === 'archer' ? '🏹' : '⚔️';
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = unit.boss ? '42px system-ui' : '29px system-ui';
    ctx.fillText(icon, unit.x, unit.y + 10);

    const w = unit.boss ? 58 : 42;
    const pct = Math.max(0, unit.hp / unit.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(unit.x - w/2, unit.y - 30, w, 5);
    ctx.fillStyle = unit.enemy ? '#c14f4f' : '#4f9a5d';
    ctx.fillRect(unit.x - w/2, unit.y - 30, w * pct, 5);

    ctx.font = '700 10px system-ui';
    ctx.fillStyle = unit.enemy ? '#7d2222' : '#244d2d';
    ctx.fillText(unit.enemy ? (unit.boss ? '보스' : '적') : (unit.kind === 'archer' ? '궁수' : '병사'), unit.x, unit.y + 29);
    ctx.restore();
  }

  drawTree(ctx, node, now) {
    const available = node.readyAt <= now;
    ctx.fillStyle = available ? '#6f9f62' : '#90aa87';
    ctx.beginPath(); ctx.arc(node.x, node.y - 22, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#795c3e'; ctx.fillRect(node.x - 6, node.y + 4, 12, 34);
  }

  drawFlower(ctx, node, now) {
    ctx.font = '25px system-ui';
    ctx.globalAlpha = node.readyAt <= now ? 1 : .32;
    ctx.fillText(node.icon || '🌼', node.x - 12, node.y + 10);
    ctx.globalAlpha = 1;
  }

  drawRock(ctx, node, now) {
    ctx.font = '28px system-ui';
    ctx.globalAlpha = node.readyAt <= now ? 1 : .38;
    ctx.fillText('🪨', node.x - 14, node.y + 12);
    ctx.globalAlpha = 1;
  }

  drawNpc(ctx, npc) {
    ctx.font = '31px system-ui';
    ctx.fillText(npc.icon, npc.x - 15, npc.y + 8);
    ctx.fillStyle = '#315748';
    ctx.font = '700 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(npc.name, npc.x, npc.y + 29);
    ctx.textAlign = 'start';
  }

  drawPlayer(ctx, player) {
    ctx.fillStyle = 'rgba(31,68,56,.15)';
    ctx.beginPath(); ctx.ellipse(player.x, player.y + 18, 18, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.font = '37px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('🧑‍🌾', player.x, player.y + 14);
    ctx.textAlign = 'start';
  }

  drawLight(ctx, game) {
    const minutes = game.state.minutes;
    const night = minutes < 360 || minutes > 1200;
    const dusk = (minutes > 1050 && minutes <= 1200) || (minutes >= 360 && minutes < 450);
    if (!night && !dusk) return;
    ctx.fillStyle = night ? 'rgba(32,51,87,.38)' : 'rgba(151,89,103,.16)';
    ctx.fillRect(0, 0, this.width, this.height);
  }

  drawRain(ctx) {
    ctx.strokeStyle = 'rgba(228,245,255,.68)';
    ctx.lineWidth = 2;
    const t = performance.now() * .22;
    for (let i = 0; i < 42; i++) {
      const x = (i * 97 + t) % (this.width + 70) - 35;
      const y = (i * 53 + t * 1.45) % (this.height + 80) - 40;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 8, y + 18); ctx.stroke();
    }
  }

  roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
}
