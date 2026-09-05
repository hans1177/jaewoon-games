(()=>{
if(window.__RPG_V17_PATCHED)return;window.__RPG_V17_PATCHED=true;

// 9번 사신 포탈이 마을 우측 끝에 묻히는 문제 수정
const GRAVE_PORTAL={x:1260,y:820};
if(!F.f9)F.f9={n:'9번 공동묘지',l:'Lv.16~20',bg:'#11141a',m:[]};
let p9=P.find(a=>a[0]==='f9');
if(p9){p9[1]=GRAVE_PORTAL.x;p9[2]=GRAVE_PORTAL.y;p9[3]='9번 사신 포탈';p9[4]='Lv.16~20'}
else P.push(['f9',GRAVE_PORTAL.x,GRAVE_PORTAL.y,'9번 사신 포탈','Lv.16~20']);

function drawGraveGate17(x,y){
 const t=performance.now()/220,pulse=.5+.5*Math.sin(t);
 ctx.save();ctx.translate(x,y);
 // 바닥 그림자/보라 오라
 ctx.fillStyle='#050408aa';ctx.beginPath();ctx.ellipse(0,38,74,24,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#8f42d8';ctx.lineWidth=5;ctx.shadowColor='#b84cff';ctx.shadowBlur=18+pulse*12;ctx.beginPath();ctx.ellipse(0,35,58+pulse*4,18,0,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;
 // 검은 석문
 ctx.fillStyle='#24242b';ctx.fillRect(-68,-78,24,118);ctx.fillRect(44,-78,24,118);
 ctx.fillStyle='#44424d';ctx.fillRect(-62,-72,10,106);ctx.fillRect(52,-72,10,106);
 ctx.fillStyle='#292832';ctx.beginPath();ctx.arc(0,-70,58,Math.PI,0);ctx.lineTo(58,35);ctx.lineTo(-58,35);ctx.closePath();ctx.fill();
 // 내부 암흑
 ctx.fillStyle='#040207';ctx.beginPath();ctx.arc(0,-64,42,Math.PI,0);ctx.lineTo(42,34);ctx.lineTo(-42,34);ctx.closePath();ctx.fill();
 // 균열 빛
 ctx.strokeStyle='#a14cff';ctx.lineWidth=3;ctx.shadowColor='#c45cff';ctx.shadowBlur=14;ctx.beginPath();ctx.moveTo(-12,-55);ctx.lineTo(4,-37);ctx.lineTo(-3,-18);ctx.lineTo(15,3);ctx.moveTo(18,-52);ctx.lineTo(8,-32);ctx.lineTo(20,-10);ctx.stroke();ctx.shadowBlur=0;
 // 해골
 ctx.fillStyle='#d4cec0';ctx.beginPath();ctx.arc(0,-92,13,0,Math.PI*2);ctx.fill();ctx.fillRect(-8,-87,16,9);
 ctx.fillStyle='#17151a';ctx.beginPath();ctx.arc(-5,-94,3,0,Math.PI*2);ctx.arc(5,-94,3,0,Math.PI*2);ctx.fill();
 // 십자가와 쇠사슬
 ctx.fillStyle='#4e4853';ctx.fillRect(-4,-130,8,27);ctx.fillRect(-15,-121,30,7);
 ctx.strokeStyle='#69636f';ctx.lineWidth=4;for(const s of [-1,1]){ctx.beginPath();ctx.moveTo(s*53,-56);ctx.quadraticCurveTo(s*22,-28,s*45,10);ctx.stroke()}
 // 영혼불
 for(const s of [-1,1]){ctx.save();ctx.translate(s*72,-20+Math.sin(t+s)*5);ctx.fillStyle='#8f42ff';ctx.shadowColor='#8f42ff';ctx.shadowBlur=16;ctx.beginPath();ctx.moveTo(0,-18);ctx.bezierCurveTo(13,-4,10,11,0,15);ctx.bezierCurveTo(-11,9,-12,-5,0,-18);ctx.fill();ctx.restore()}
 ctx.shadowBlur=0;ctx.textAlign='center';ctx.font='900 15px sans-serif';ctx.fillStyle='#f1ddff';ctx.fillText('9번 사신 포탈',0,61);ctx.font='900 12px sans-serif';ctx.fillStyle='#ffc9ff';ctx.fillText('Lv.16~20',0,78);ctx.textAlign='left';ctx.restore();
}

const draw17=draw;draw=function(){
 draw17();
 if(zone==='town'){
  ctx.save();ctx.translate(-cam.x,-cam.y);drawGraveGate17(GRAVE_PORTAL.x,GRAVE_PORTAL.y);ctx.restore();
 }
};

toastMsg('9번 사신 포탈 위치 수정 적용');
})();