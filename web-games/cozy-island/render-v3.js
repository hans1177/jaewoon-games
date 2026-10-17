export class IslandRendererV3 {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
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
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
  }
  camera(game) { return { x: game.player.x - this.width/2, y: game.player.y - this.height/2 }; }
  screenToWorld(game, sx, sy) { const c=this.camera(game); return {x:sx+c.x,y:sy+c.y}; }
  draw(game) {
    const ctx=this.ctx; ctx.setTransform(this.dpr,0,0,this.dpr,0,0); ctx.clearRect(0,0,this.width,this.height);
    const cam=this.camera(game); ctx.save(); ctx.translate(-cam.x,-cam.y);
    this.drawSea(ctx,game); this.drawIsland(ctx,game); this.drawObjects(ctx,game); this.drawUnits(ctx,game); this.drawPlayer(ctx,game.player); ctx.restore();
    this.drawLight(ctx,game); if(game.weather==='비') this.drawRain(ctx);
  }
  drawSea(ctx,g){ctx.fillStyle='#82cadd';ctx.fillRect(0,0,g.world.w,g.world.h);ctx.strokeStyle='rgba(255,255,255,.22)';for(let y=30;y<g.world.h;y+=55){ctx.beginPath();for(let x=0;x<g.world.w;x+=85){ctx.moveTo(x,y);ctx.quadraticCurveTo(x+20,y-6,x+40,y)}ctx.stroke()}}
  rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,h,r):(ctx.rect(x,y,w,h));}
  drawIsland(ctx,g){
    const w=g.state.expanded?2810:1260; ctx.fillStyle='#f2dfa8';this.rr(ctx,100,90,w,1010,110);ctx.fill();ctx.fillStyle='#9fd18f';this.rr(ctx,145,135,w-90,920,90);ctx.fill();
    ctx.fillStyle='#e6d3a6';ctx.beginPath();ctx.ellipse(660,610,330,85,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#72bdd3';ctx.beginPath();ctx.ellipse(390,370,145,105,-.12,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#d6f2f7';ctx.lineWidth=7;ctx.stroke();
    if(g.state.expanded){ctx.fillStyle='rgba(72,112,69,.18)';ctx.fillRect(1390,155,1450,880);ctx.fillStyle='#315748';ctx.font='800 18px system-ui';ctx.fillText('동쪽 야생지대',1460,190)}
    else {ctx.fillStyle='#6e826e';ctx.fillRect(1360,470,16,250);ctx.fillStyle='#315748';ctx.font='700 16px system-ui';ctx.fillText('동쪽 지역 해금',1295,452);ctx.font='34px system-ui';ctx.fillText('🔐',1320,600)}
  }
  drawObjects(ctx,g){
    this.drawHouse(ctx,g);this.drawFarm(ctx,g);this.drawBarracks(ctx,g);this.drawWorkerShop(ctx,g);
    for(const n of g.nodes){if(n.lockedByExpansion&&!g.state.expanded)continue;if(n.kind==='tree')this.drawTree(ctx,n,g.timeNow);else if(n.kind==='rock')this.drawRock(ctx,n,g.timeNow);else this.drawFlower(ctx,n,g.timeNow)}
    for(const n of g.npcs){ctx.font='30px system-ui';ctx.fillText(n.icon,n.x-15,n.y+8);ctx.fillStyle='#315748';ctx.font='12px system-ui';ctx.fillText(n.name,n.x-10,n.y+30)}
    ctx.font='31px system-ui';ctx.fillText('🧺',760,760);ctx.font='12px system-ui';ctx.fillStyle='#315748';ctx.fillText('출하',752,785);ctx.font='31px system-ui';ctx.fillText('🎣',520,430);ctx.font='12px system-ui';ctx.fillText('낚시터',510,458);
    if(g.state.expanded) for(const w of g.wolves) this.drawWolf(ctx,w,g.selectedWolfId===w.id);
  }
  drawHouse(ctx,g){ctx.fillStyle='#f5d9a8';ctx.fillRect(660,250,210,145);ctx.fillStyle='#d98265';ctx.beginPath();ctx.moveTo(635,270);ctx.lineTo(765,175);ctx.lineTo(895,270);ctx.closePath();ctx.fill();ctx.fillStyle='#82583b';ctx.fillRect(746,325,42,70);ctx.fillStyle='#315748';ctx.font='700 13px system-ui';ctx.fillText(`우리 집 · 꾸미기 ${g.state.decor.length}/3`,700,235)}
  drawFarm(ctx,g){ctx.fillStyle='#b4875d';ctx.fillRect(910,350,260,190);g.state.plots.forEach((p,i)=>{const x=930+(i%3)*78,y=375+Math.floor(i/3)*78;ctx.fillStyle=p.watered?'#6b5549':'#815f46';ctx.fillRect(x,y,58,58);ctx.strokeStyle='#d3ad79';ctx.strokeRect(x,y,58,58);if(p.state==='growing'){ctx.font='24px system-ui';ctx.fillText(p.ready?'🥕':'🌱',x+16,y+37)}});ctx.fillStyle='#315748';ctx.font='700 13px system-ui';ctx.fillText('작은 텃밭',995,340)}
  drawBarracks(ctx,g){const{x,y}=g.barracks;if(!g.state.barracksBuilt){ctx.setLineDash([8,7]);ctx.strokeStyle='#6d725d';ctx.strokeRect(x-58,y-46,116,92);ctx.setLineDash([]);ctx.font='24px system-ui';ctx.fillText('🏗️',x-14,y+8);ctx.fillStyle='#315748';ctx.font='12px system-ui';ctx.fillText('병영 건설터',x-35,y+65);return}ctx.fillStyle='#8c6d49';ctx.fillRect(x-58,y-30,116,76);ctx.fillStyle='#646348';ctx.beginPath();ctx.moveTo(x-72,y-30);ctx.lineTo(x,y-82);ctx.lineTo(x+72,y-30);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.font='700 13px system-ui';ctx.fillText('병영',x-14,y-92)}
  drawWorkerShop(ctx,g){const{x,y}=g.workerShop;ctx.fillStyle='#b78458';ctx.fillRect(x-55,y-35,110,72);ctx.fillStyle='#7e6042';ctx.beginPath();ctx.moveTo(x-68,y-35);ctx.lineTo(x,y-78);ctx.lineTo(x+68,y-35);ctx.closePath();ctx.fill();ctx.font='25px system-ui';ctx.fillText('🧑‍🌾',x-13,y+12);ctx.fillStyle='#315748';ctx.font='700 12px system-ui';ctx.fillText(`노비 판매소 ${g.state.workers}/3`,x-48,y-88)}
  drawUnits(ctx,g){for(const u of g.allies)this.drawUnit(ctx,u);for(const u of g.enemies)this.drawUnit(ctx,u);for(let i=0;i<g.state.workers;i++){const a=performance.now()/1000+i*2.1;ctx.font='25px system-ui';ctx.fillText('🧑‍🌾',1020+Math.cos(a)*50+i*12,505+Math.sin(a*.8)*35)}}
  drawUnit(ctx,u){if(u.hp<=0)return;const icon=u.boss?'👹':u.kind==='archer'?'🏹':'⚔️';ctx.textAlign='center';ctx.font=u.boss?'42px system-ui':'29px system-ui';ctx.fillText(icon,u.x,u.y+10);const w=u.boss?58:42,p=Math.max(0,u.hp/u.maxHp);ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(u.x-w/2,u.y-30,w,5);ctx.fillStyle=u.enemy?'#c14f4f':'#4f9a5d';ctx.fillRect(u.x-w/2,u.y-30,w*p,5);ctx.textAlign='start'}
  drawWolf(ctx,w,selected){if(!w.alive)return;ctx.textAlign='center';ctx.font='34px system-ui';ctx.fillText('🐺',w.x,w.y+10);ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(w.x-25,w.y-30,50,5);ctx.fillStyle=selected?'#f0a43b':'#b54d4d';ctx.fillRect(w.x-25,w.y-30,50*Math.max(0,w.hp/w.maxHp),5);if(selected){ctx.strokeStyle='#f0a43b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(w.x,w.y,30,0,Math.PI*2);ctx.stroke()}ctx.textAlign='start'}
  drawTree(ctx,n,now){ctx.fillStyle=n.readyAt<=now?'#6f9f62':'#90aa87';ctx.beginPath();ctx.arc(n.x,n.y-22,34,0,Math.PI*2);ctx.fill();ctx.fillStyle='#795c3e';ctx.fillRect(n.x-6,n.y+4,12,34)}
  drawRock(ctx,n,now){ctx.globalAlpha=n.readyAt<=now?1:.38;ctx.font='28px system-ui';ctx.fillText('🪨',n.x-14,n.y+12);ctx.globalAlpha=1}
  drawFlower(ctx,n,now){ctx.globalAlpha=n.readyAt<=now?1:.32;ctx.font='25px system-ui';ctx.fillText(n.icon||'🌼',n.x-12,n.y+10);ctx.globalAlpha=1}
  drawPlayer(ctx,p){ctx.textAlign='center';ctx.font='36px system-ui';ctx.fillText('🧑',p.x,p.y+10);ctx.fillStyle='#315748';ctx.font='700 11px system-ui';ctx.fillText('나',p.x,p.y+32);ctx.textAlign='start'}
  drawLight(ctx,g){const h=g.state.minutes/60;let a=0;if(h<6)a=.36;else if(h<8)a=.18*(8-h)/2;else if(h>18)a=Math.min(.38,(h-18)*.07);if(a){ctx.fillStyle=`rgba(30,44,76,${a})`;ctx.fillRect(0,0,this.width,this.height)}}
  drawRain(ctx){ctx.strokeStyle='rgba(220,245,255,.55)';ctx.lineWidth=2;for(let i=0;i<45;i++){const x=(i*83+performance.now()*.18)%this.width,y=(i*47+performance.now()*.32)%this.height;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-7,y+17);ctx.stroke()}}
}
