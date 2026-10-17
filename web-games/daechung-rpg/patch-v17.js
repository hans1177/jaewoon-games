(()=>{
if(window.__RPG_V17_PATCHED)return;window.__RPG_V17_PATCHED=true;

const GRAVE_PORTAL={x:1260,y:820};
if(!F.f9)F.f9={n:'9번 공동묘지',l:'Lv.16~20',bg:'#11141a',m:[]};
// 기존 일반 포탈 목록의 f9는 제거하고 아래 독립 석문으로 직접 처리
for(let i=P.length-1;i>=0;i--)if(P[i][0]==='f9')P.splice(i,1);

function drawGraveGate17(x,y){
 const t=performance.now()/220,pulse=.5+.5*Math.sin(t);
 ctx.save();ctx.translate(x,y);
 ctx.fillStyle='#050408cc';ctx.beginPath();ctx.ellipse(0,40,78,25,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#8f42d8';ctx.lineWidth=5;ctx.shadowColor='#b84cff';ctx.shadowBlur=20+pulse*14;ctx.beginPath();ctx.ellipse(0,37,61+pulse*4,19,0,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;
 ctx.fillStyle='#24242b';ctx.fillRect(-70,-80,25,122);ctx.fillRect(45,-80,25,122);
 ctx.fillStyle='#494651';ctx.fillRect(-64,-74,10,110);ctx.fillRect(54,-74,10,110);
 ctx.fillStyle='#292832';ctx.beginPath();ctx.arc(0,-72,60,Math.PI,0);ctx.lineTo(60,37);ctx.lineTo(-60,37);ctx.closePath();ctx.fill();
 ctx.fillStyle='#030106';ctx.beginPath();ctx.arc(0,-66,44,Math.PI,0);ctx.lineTo(44,35);ctx.lineTo(-44,35);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#a14cff';ctx.lineWidth=4;ctx.shadowColor='#c45cff';ctx.shadowBlur=16;ctx.beginPath();ctx.moveTo(-13,-57);ctx.lineTo(5,-38);ctx.lineTo(-4,-17);ctx.lineTo(16,5);ctx.moveTo(19,-54);ctx.lineTo(9,-33);ctx.lineTo(21,-9);ctx.stroke();ctx.shadowBlur=0;
 ctx.fillStyle='#d8d1c2';ctx.beginPath();ctx.arc(0,-95,14,0,Math.PI*2);ctx.fill();ctx.fillRect(-8,-89,16,10);
 ctx.fillStyle='#17151a';ctx.beginPath();ctx.arc(-5,-97,3,0,Math.PI*2);ctx.arc(5,-97,3,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#963dff';ctx.shadowColor='#b44cff';ctx.shadowBlur=10;ctx.fillRect(-6,-98,3,2);ctx.fillRect(3,-98,3,2);ctx.shadowBlur=0;
 ctx.fillStyle='#4e4853';ctx.fillRect(-5,-136,10,30);ctx.fillRect(-18,-126,36,8);
 ctx.strokeStyle='#69636f';ctx.lineWidth=4;for(const s of [-1,1]){ctx.beginPath();ctx.moveTo(s*55,-58);ctx.quadraticCurveTo(s*24,-28,s*47,12);ctx.stroke()}
 for(const s of [-1,1]){ctx.save();ctx.translate(s*74,-21+Math.sin(t+s)*5);ctx.fillStyle='#8f42ff';ctx.shadowColor='#8f42ff';ctx.shadowBlur=18;ctx.beginPath();ctx.moveTo(0,-18);ctx.bezierCurveTo(13,-4,10,11,0,15);ctx.bezierCurveTo(-11,9,-12,-5,0,-18);ctx.fill();ctx.restore()}
 ctx.shadowBlur=0;ctx.textAlign='center';ctx.font='900 16px sans-serif';ctx.fillStyle='#f1ddff';ctx.fillText('9번 공동묘지',0,66);ctx.font='900 12px sans-serif';ctx.fillStyle='#ffd08f';ctx.fillText('Lv.16~20 · 사신',0,84);ctx.textAlign='left';ctx.restore();
}

const draw17=draw;draw=function(){
 draw17();
 if(zone==='town'){
  ctx.save();ctx.translate(-cam.x,-cam.y);drawGraveGate17(GRAVE_PORTAL.x,GRAVE_PORTAL.y);ctx.restore();
 }
};

// 기존 P 배열과 무관하게 포탈 충돌 직접 처리
const portals17=portals;portals=function(){
 if(zone==='town'&&pc<=0&&Math.hypot(p.x-GRAVE_PORTAL.x,p.y-GRAVE_PORTAL.y)<70){
  pc=.8;enter('f9');sfx('portalEnter');toastMsg('9번 공동묘지 · 사신의 영역');return;
 }
 portals17();
};

toastMsg('9번 공동묘지 사신 포탈 수정 적용');
})();