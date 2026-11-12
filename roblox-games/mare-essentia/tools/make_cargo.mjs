// 파일명: roblox-games/mare-essentia/tools/make_cargo.mjs
// Vibe 5.9: 사용자 지정 44개 교역품 3D 메시 원본 제작. 게임 바인딩·권한 인증·게시 없음.
// 임포트
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// 메인: 기존 Mare Essentia Cargo 등록 inbox의 미존재 항목만 작성한다.
const root = 'roblox-games/mare-essentia/assets/inbox/Cargo';
const items = `amber ambergris brazilwood camphor carpet cinnamon cloves coal cochineal cocoa coral dates ebony feathers fur ginseng gold guano gum_arabic incense indigo ivory jade kauri lacquer leather linen logwood mahogany marble nitrate nutmeg palm_oil pearl_shell pearls raisins saffron sandalwood sandalwood_hi sealskin spice tin vanilla whale_oil`.split(' ');
const colors = {
 amber:'bd782b e9af53 714722 493321', ambergris:'8b887b bdb5a3 666761 dcd4b8', brazilwood:'733b2e af603f cb9861 372621', camphor:'c5b18e f1e8ca 8c7253 fff0db',
 carpet:'872d46 bd5240 d2aa67 38496c', cinnamon:'965b32 c18a52 533322 ddb788', cloves:'633827 a06843 d2ae87 39291f', coal:'26292d 484a50 161a1c 707276',
 cochineal:'a22c37 d9575d 67383b 76985a', cocoa:'804d36 b5764a 553123 d7b18b', coral:'b96654 e19073 f0bd9c 91454b', dates:'874c31 c18751 613e2e 78995c',
 ebony:'292423 543c36 996f56 ccb99b', feathers:'ede3c7 b39d7b 505b58 323a3d', fur:'947354 b59a79 604637 d6c0a4', ginseng:'c5b18f e2ccb2 765e49 537d48',
 gold:'dcb043 ffe089 946d22 edce75', guano:'a2a295 d0c8b7 787b78 efebdd', gum_arabic:'bd782b e9b554 945c2d ffdfa1', incense:'7b4b34 b48a65 554033 e0ba8c',
 indigo:'244584 5675b1 192d62 6b83a3', ivory:'e3d8b9 faf2db c3b395 9d8d70', jade:'4c987b 83c5a0 286b55 b7d7bc', kauri:'8d684b c5a073 5b4332 d5be99',
 lacquer:'292022 624038 aa6b43 d8ad7a', leather:'8b5b3d b98a5a 5e3a28 d6b088', linen:'b9ab90 e9dcc3 948771 dacdb4', logwood:'50313f 805264 a66c6e 362630',
 mahogany:'75342a a3503a c88457 412a21', marble:'c3c7c9 edeee8 80898d f9f8f4', nitrate:'d0cbbd f5eedf aaa797 e9deca', nutmeg:'875336 c18c54 5b3b2b d7ad80',
 palm_oil:'aa5b28 dd8d40 70743b e9c46b', pearl_shell:'9d9181 dacdb9 efe5d9 a6c3c5', pearls:'e4ddce faf6ec adbec5 d9d6da', raisins:'603941 86565f ad8061 626047',
 saffron:'b84637 ef9a3c 853b4a 997eac', sandalwood:'a98762 d6b187 74533b e7d0ad', sandalwood_hi:'966947 c5a075 6a4b35 e4d0b1',
 sealskin:'778180 a7aca8 525c5b c6c7c1', spice:'7b5238 c08c52 633f2d dec496', tin:'9da7ac d2d5d5 798286 e9ebea', vanilla:'40382f 6e593e a18a68 e7dfbb', whale_oil:'b9a46a e4ce90 766346 b5ae96'
};
if (items.length !== 44 || new Set(items).size !== 44 || Object.keys(colors).length !== 44) throw Error('TRADE_CARGO_COUNT_MISMATCH');

// 유틸: 항목별 유기적 메시의 삼각면·법선·색 재질을 직접 구성한다. Roblox 기본 Part 미사용.
const TAU=2*Math.PI;
let seed=20611112;
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
const between=(a,b)=>a+(b-a)*random();
const add=(a,b)=>a.map((n,i)=>n+b[i]);
const sub=(a,b)=>a.map((n,i)=>n-b[i]);
const mul=(a,n)=>a.map(x=>x*n);
const norm=a=>mul(a,1/(Math.hypot(...a)||1));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
class Art {
 constructor(id){this.id=id;this.palette=colors[id].split(' ').map(hex=>[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255));this.m=this.palette.map(()=>({p:[],n:[]}));}
 tri(t,a,b,c){const n=cross(sub(b,a),sub(c,a));if(Math.hypot(...n)<1e-9)return;const g=this.m[t%this.m.length],v=norm(n);g.p.push(...a,...b,...c);g.n.push(...v,...v,...v);}
 quad(t,a,b,c,d){this.tri(t,a,b,c);this.tri(t,a,c,d);}
 tube(t,points,r=.025,sides=7){for(let j=0;j<points.length-1;j++){const a=points[j],b=points[j+1],d=norm(sub(b,a)),ref=Math.abs(d[1])>.85?[1,0,0]:[0,1,0],u=norm(cross(d,ref)),v=norm(cross(d,u));const ring=(p,R,k)=>add(p,add(mul(u,R*Math.cos(k*TAU/sides)),mul(v,R*Math.sin(k*TAU/sides))));const r0=typeof r==='function'?r(j/(points.length-1)):r,r1=typeof r==='function'?r((j+1)/(points.length-1)):r*.92;for(let k=0;k<sides;k++)this.quad(t,ring(a,r0,k),ring(a,r0,k+1),ring(b,r1,k+1),ring(b,r1,k));}}
 orb(t,c,s,l=7){const N=l*2,rows=[];for(let j=0;j<=l;j++){let theta=Math.PI*j/l;rows.push(Array.from({length:N},(_,k)=>{const a=k*TAU/N,r=1+.065*Math.cos(3*a+4*theta);return [c[0]+s[0]*Math.sin(theta)*Math.cos(a)*r,c[1]+s[1]*Math.cos(theta),c[2]+s[2]*Math.sin(theta)*Math.sin(a)*r];}));}for(let j=0;j<l;j++)for(let k=0;k<N;k++)this.quad(t,rows[j][k],rows[j][(k+1)%N],rows[j+1][(k+1)%N],rows[j+1][k]);}
 shard(t,c,s){const N=9,rows=[];for(let j=0;j<=6;j++){const theta=Math.PI*j/6;rows.push(Array.from({length:N},(_,k)=>{const a=k*TAU/N,r=between(.76,1.15);return [c[0]+s[0]*Math.sin(theta)*Math.cos(a)*r,c[1]+s[1]*Math.cos(theta)*r,c[2]+s[2]*Math.sin(theta)*Math.sin(a)*r];}));}for(let j=0;j<6;j++)for(let k=0;k<N;k++)this.quad((k+j)%11===0?(t+1)%this.m.length:t,rows[j][k],rows[j][(k+1)%N],rows[j+1][(k+1)%N],rows[j+1][k]);}
 leaf(t,a,b,w=.12){const d=sub(b,a),u=norm(cross(d,[0,1,.1])),rows=[];for(let j=0;j<=10;j++){const f=j/10,c=add(a,add(mul(d,f),[0,.035*Math.sin(Math.PI*f),0])),r=w*Math.sin(Math.PI*f);rows.push([add(c,mul(u,-r)),c,add(c,mul(u,r))]);}for(let j=0;j<10;j++)for(let k=0;k<2;k++)this.quad(t,rows[j][k],rows[j+1][k],rows[j+1][k+1],rows[j][k+1]);this.tube((t+1)%this.m.length,rows.map(q=>q[1]),.005,4);}
 cloth(t=0,y=.13,w=.66,d=.43,trim=2){const rows=[];for(let j=0;j<=10;j++){const arr=[];for(let k=0;k<=16;k++){let u=k/16,v=j/10;arr.push([(u-.5)*w*2,y+.036*Math.sin(2*TAU*u+v*4),(v-.5)*2*d]);}rows.push(arr);}for(let j=0;j<10;j++)for(let k=0;k<16;k++)this.quad(j<2||j>7||k<2||k>13?trim:(j+k)%17===0?(trim+1)%this.m.length:t,rows[j][k],rows[j][k+1],rows[j+1][k+1],rows[j+1][k]);for(let k=0;k<16;k++)this.tube(trim,[rows[0][k],rows[0][k+1]],.009,4);return rows;}
 lumber(p,q,rad=.12){this.tube(0,[p,q],rad,12);this.orb(2,q,[rad,.014,rad],5);this.orb(3,p,[rad*.95,.014,rad*.95],5);for(let k=0;k<6;k++){let h=add(p,mul(sub(q,p),(k+.5)/7));this.tube(1,[h,add(h,[.024,.03,.018])],.01,4);}}
 jar(h=1.06){const spec=[[0,.20],[.12,.28],[.24,.37],[.45,.42],[.63,.34],[.78,.25],[.90,.18],[1,.23]],N=24;for(let j=0;j<spec.length-1;j++)for(let k=0;k<N;k++){let a=k*TAU/N,b=(k+1)*TAU/N,p=(idx,x)=>[spec[idx][1]*Math.cos(x),h*spec[idx][0],spec[idx][1]*Math.sin(x)];this.quad(j%4===0?1:0,p(j,a),p(j,b),p(j+1,b),p(j+1,a));}for(let j of [1,3,6,7])this.tube(2,Array.from({length:N+1},(_,k)=>[spec[j][1]*Math.cos(k*TAU/N),h*spec[j][0],spec[j][1]*Math.sin(k*TAU/N)]),.012,5);}
 flower(p){this.orb(2,p,[.052,.05,.05],6);for(let j=0;j<6;j++){let a=j*TAU/6;this.leaf(j%2,p,add(p,[.24*Math.cos(a),.05,.23*Math.sin(a)]),.1);}}
}

// 메인: 이름이 같은 교역품의 개별 실물 외형만 제작. 무관한 상자·동물 임의 대체 없음.
function model(id){const m=new Art(id);
 switch(id){
 case 'amber':case 'ambergris':case 'camphor':case 'coal':case 'guano':case 'gum_arabic':case 'jade':case 'nitrate':
  for(let i=0;i<24;i++){let a=between(0,TAU),r=between(.03,.57);m.shard(i%5===0?1:0,[r*Math.cos(a),between(.08,.28),r*Math.sin(a)],[between(.08,.19),between(.07,.2),between(.08,.18)]);}break;
 case 'brazilwood':case 'ebony':case 'kauri':case 'logwood':case 'mahogany':case 'sandalwood':case 'sandalwood_hi':
  for(let j=0;j<6;j++){let a=j*TAU/6,p=[.28*Math.cos(a),.08,.28*Math.sin(a)];m.lumber(p,add(p,[between(-.08,.08),between(.55,.82),between(-.1,.1)]),between(.09,.14));}break;
 case 'carpet':{const rows=m.cloth(0,.15,.7,.50,2);for(let k=0;k<=16;k+=2)for(let j of [0,10])m.tube(3,[rows[j][k],add(rows[j][k],[0,-.13,.03])],.006,4);for(let k=0;k<12;k++){let a=k*TAU/12;m.tube(1,[[.27*Math.cos(a),.19,.23*Math.sin(a)],[.31*Math.cos(a+.32),.19,.28*Math.sin(a+.32)]],.011,4);}break;}
 case 'cinnamon':for(let j=0;j<12;j++){let x=(j%4-1.5)*.2,z=(Math.floor(j/4)-1)*.22,pts=[];for(let k=0;k<=24;k++){let t=k/24,a=t*TAU*1.7,r=.09*(1-.78*t);pts.push([x+r*Math.cos(a),.06+.60*t,z+r*Math.sin(a)]);}m.tube(j%3===0?2:0,pts,.023,7);m.tube(1,pts.map(p=>add(p,[.007,0,.008])),.005,4);}break;
 case 'cloves':for(let i=0;i<26;i++){let a=between(0,TAU),r=between(0,.5),p=[r*Math.cos(a),.06,r*Math.sin(a)],q=add(p,[between(-.05,.05),between(.28,.51),between(-.05,.05)]);m.tube(0,[p,q],.02,6);m.orb(1,q,[.045,.05,.045],5);for(let k=0;k<4;k++){let t=k*TAU/4;m.tube(2,[q,add(q,[.05*Math.cos(t),.025,.05*Math.sin(t)])],.011,4);}}break;
 case 'cochineal':for(let j=0;j<5;j++){let a=j*TAU/5;m.leaf(3,[0,.06,0],[.65*Math.cos(a),.23,.52*Math.sin(a)],.26);}for(let i=0;i<29;i++){let a=between(0,TAU),r=between(.02,.4);m.orb(i%4===0?2:0,[r*Math.cos(a),between(.22,.34),r*Math.sin(a)],[.048,.03,.036],6);}break;
 case 'cocoa':for(let j=0;j<7;j++){let a=j*TAU/7,c=[.36*Math.cos(a),.21,.30*Math.sin(a)];m.orb(j%3===0?1:0,c,[.2,.27,.16],8);for(let k=0;k<7;k++){let b=k*TAU/7;m.tube(2,[add(c,[0,-.23,0]),add(c,[.14*Math.cos(b),0,.12*Math.sin(b)]),add(c,[0,.23,0])],.006,4);}}break;
 case 'coral':for(let j=0;j<7;j++){let a=j*TAU/7,p=[0,.04,0];for(let k=0;k<4;k++){const q=[Math.cos(a+k*.18)*(.13+k*.14),.17+k*.22,Math.sin(a+k*.18)*(.14+k*.14)];m.tube(j%3===0?1:0,[p,q],.07-k*.015,7);if(k>1)m.tube(2,[q,add(q,[.18*Math.cos(a+.8),.18,.17*Math.sin(a+.8)])],.02,6);p=q;}}break;
 case 'dates':for(let j=0;j<8;j++){let a=j*TAU/8,p=[0,.8,0],q=[.48*Math.cos(a),.1,.44*Math.sin(a)];m.tube(3,[p,add(q,[0,.32,0]),q],.023,6);for(let k=0;k<5;k++){let f=(k+1)/7;m.orb((j+k)%4===0?1:0,add(p,mul(sub(q,p),f)),[.082,.125,.076],7);}}break;
 case 'feathers':for(let j=0;j<11;j++){let a=j*TAU/11,p=[.19*Math.cos(a),.03,.16*Math.sin(a)],q=[.50*Math.cos(a),between(.9,1.28),.28*Math.sin(a)],pts=[];for(let k=0;k<=20;k++){let f=k/20,c=add(p,mul(sub(q,p),f));c[0]+=.07*Math.sin(f*Math.PI);pts.push(c);if(k>2&&k<18){let w=.17*Math.sin(f*Math.PI);for(let side of [-1,1]){let z=add(c,[w*side,.015,.02]);m.quad((j+k)%4,c,z,add(z,[0,.03,0]),add(c,[0,.03,0]));}}}m.tube(2,pts,.01,5);}break;
 case 'fur':case 'sealskin':m.cloth(0,.14,.67,.45,2);for(let i=0;i<32;i++){let p=[between(-.55,.55),.16,between(-.35,.35)];m.tube(i%3,[p,add(p,[.03,.07,.05]),add(p,[between(-.03,.03),.10,.13])],.014,5);}break;
 case 'ginseng':m.tube(1,[[0,.72,0],[0,.44,0],[0,.22,0]],t=>.038+.12*Math.sin((1-t)*Math.PI*.7),9);for(let j=0;j<9;j++){let a=j*TAU/9;m.tube(j%2,[[0,.26,0],[.10*Math.cos(a),.13,.09*Math.sin(a)],[between(.25,.5)*Math.cos(a),-.16,between(.25,.5)*Math.sin(a)]],t=>.06*(1-t)+.004,8);}for(let j=0;j<5;j++){let a=j*TAU/5;m.leaf(3,[0,.71,0],[.40*Math.cos(a),.95,.36*Math.sin(a)],.12);}break;
 case 'gold':case 'tin':for(let j=0;j<9;j++){let x=(j%3-1)*.28,z=(Math.floor(j/3)-1)*.27,y=.04+(j%2)*.04,b=[[x-.14,y,z-.12],[x+.14,y,z-.12],[x+.14,y,z+.12],[x-.14,y,z+.12]],t=b.map(p=>[x+(p[0]-x)*.76,y+.16,z+(p[2]-z)*.76]);for(let k=0;k<4;k++)m.quad(0,b[k],b[(k+1)%4],t[(k+1)%4],t[k]);m.quad(1,t[0],t[1],t[2],t[3]);m.tube(3,[...t,t[0]],.009,4);}break;
 case 'incense':for(let j=0;j<18;j++){let a=j*TAU/18,p=[.18*Math.cos(a),.05,.17*Math.sin(a)],q=[.28*Math.cos(a),between(.73,.95),.27*Math.sin(a)];m.tube(j%3===0?1:0,[p,q],.023,6);m.tube(3,[add(p,[0,.25,0]),add(q,[0,-.25,0])],.007,4);}break;
 case 'indigo':for(let j=0;j<10;j++){let a=j*TAU/10,c=[.35*Math.cos(a),.13,.32*Math.sin(a)];m.shard(j%3===0?1:0,c,[.18,.12,.15]);m.leaf(3,[0,.12,0],[.43*Math.cos(a),.65,.35*Math.sin(a)],.072);}break;
 case 'ivory':for(let j=0;j<5;j++){let a=j*TAU/5,pts=[];for(let k=0;k<=18;k++){let f=k/18;pts.push([Math.cos(a)*(.22+.42*f)+.12*Math.sin(f*Math.PI),.07+.87*f,Math.sin(a)*(.16+.26*f)]);}m.tube(j%3===0?1:0,pts,t=>.10*(1-t)**.7+.004,12);for(let k=3;k<12;k+=3)m.tube(2,[pts[k],add(pts[k],[.007,.01,.004])],.005,4);}break;
 case 'lacquer':m.jar(.93);for(let j=0;j<8;j++){let a=j*TAU/8;m.tube(2,[[.38*Math.cos(a),.27,.38*Math.sin(a)],[.34*Math.cos(a),.53,.34*Math.sin(a)]],.01,4);}m.tube(3,[[-.49,.1,.2],[.16,.79,.12]],.035,8);break;
 case 'leather':case 'linen':for(let j=0;j<4;j++){m.cloth(j%2,.14+j*.10,.67-j*.06,.43-j*.04,2);for(let k=0;k<8;k++){let x=(k/7-.5)*.96;m.tube(3,[[x,.15+j*.1,-.33],[x+.02,.16+j*.1,.33]],.006,4);}}break;
 case 'marble':for(let j=0;j<6;j++){let x=(j%3-1)*.35,z=(Math.floor(j/3)-.5)*.48,b=[[x-.16,.03,z-.2],[x+.16,.03,z-.2],[x+.16,.03,z+.2],[x-.16,.03,z+.2]],t=b.map(p=>add(p,[0,.16,0]));for(let k=0;k<4;k++)m.quad(0,b[k],b[(k+1)%4],t[(k+1)%4],t[k]);m.quad(1,t[0],t[1],t[2],t[3]);for(let k=0;k<6;k++){let zz=z-.16+.056*k;m.tube(2,[[x-.15,.197,zz],[x+between(-.08,.08),.198,zz+.04],[x+.15,.197,zz+.07]],.006,4);}}break;
 case 'nutmeg':for(let j=0;j<19;j++){let a=between(0,TAU),r=between(.08,.54),c=[r*Math.cos(a),between(.14,.27),r*Math.sin(a)];m.orb(j%4===0?1:0,c,[.083,.13,.083],8);for(let k=0;k<6;k++){let th=k*TAU/6;m.tube(2,[add(c,[.03*Math.cos(th),-.11,.03*Math.sin(th)]),add(c,[.062*Math.cos(th),0,.06*Math.sin(th)]),add(c,[.025*Math.cos(th),.11,.02*Math.sin(th)])],.006,4);}}break;
 case 'palm_oil':m.jar(.85);for(let j=0;j<21;j++){let a=j*TAU/21,r=between(.44,.65);m.orb(j%3===0?1:0,[r*Math.cos(a),.15,r*Math.sin(a)],[.08,.12,.075],6);}for(let j=0;j<5;j++){let a=j*TAU/5;m.leaf(2,[0,.85,0],[.63*Math.cos(a),1.15,.5*Math.sin(a)],.075);}break;
 case 'pearl_shell':case 'pearls':for(let j=0;j<4;j++){let x=(j%2-.5)*.53,z=(Math.floor(j/2)-.5)*.46,p=[x,.1,z],rim=[];for(let k=0;k<=24;k++){let a=k*TAU/24;rim.push([x+.25*Math.cos(a),.08+.02*Math.sin(a*5),z+.19*Math.sin(a)]);}for(let k=0;k<24;k++){m.tri(j%2===0?1:3,p,rim[k],rim[k+1]);if(k%2===0)m.tube(2,[p,rim[k]],.006,4);}m.tube(0,rim,.01,5);m.orb(1,[x,.19,z],[.09,.09,.09],8);}if(id==='pearls')for(let j=0;j<11;j++)m.orb(j%3,[between(-.55,.55),.12,between(-.45,.45)],[.07,.07,.07],8);break;
 case 'raisins':for(let j=0;j<50;j++){let a=between(0,TAU),r=between(.04,.56),p=[r*Math.cos(a),between(.08,.36),r*Math.sin(a)];m.orb(j%3,p,[.06,.07,.06],6);for(let k=0;k<3;k++)m.tube(3,[add(p,[.025*Math.cos(k*TAU/3),-.04,0]),add(p,[.035*Math.cos(k*TAU/3),.05,.01])],.004,4);}break;
 case 'saffron':for(let j=0;j<30;j++){let a=between(0,TAU),r=between(.03,.45),p=[r*Math.cos(a),.06,r*Math.sin(a)];m.tube(j%2,[p,add(p,[between(-.08,.08),between(.25,.54),between(-.05,.05)])],.011,5);}m.flower([0,.42,0]);break;
 case 'spice':for(let j=0;j<12;j++){let a=j*TAU/12,p=[.35*Math.cos(a),.13,.34*Math.sin(a)];for(let k=0;k<7;k++){let ph=k*TAU/7,q=add(p,[.14*Math.cos(ph),.06,.14*Math.sin(ph)]);m.leaf(k%3,p,q,.04);m.orb(3,q,[.03,.03,.03],5);}}for(let j=0;j<27;j++)m.orb(j%3,[between(-.46,.46),.08,between(-.4,.4)],[.03,.03,.03],5);break;
 case 'vanilla':for(let j=0;j<18;j++){let a=j*TAU/18,r=between(.08,.4),p=[r*Math.cos(a),.12,r*Math.sin(a)],q=[.52*Math.cos(a+.8),between(.48,.80),.39*Math.sin(a+.8)];m.tube(j%2,[p,[(p[0]+q[0])*.5,.33,(p[2]+q[2])*.5],q],.027,8);}for(let j=0;j<3;j++){let a=j*TAU/3;m.flower([.36*Math.cos(a),.76,.3*Math.sin(a)]);}break;
 case 'whale_oil':m.jar(1.18);m.orb(1,[0,1.18,0],[.21,.03,.21],7);for(let j=0;j<13;j++){let a=j*TAU/13;m.tube(3,[[.29*Math.cos(a),.85,.29*Math.sin(a)],[.34*Math.cos(a),.36,.34*Math.sin(a)]],.01,5);}break;
 default:throw Error('NO_MODEL_SPEC:'+id);
 }
 return m;
}

// 유틸: 검증 가능한 glTF 2.0 GLB 바이너리와 출처 해시를 기록한다.
function encode(m){const raw=[],views=[],accessors=[],primitives=[];let offset=0;
 function write(array){while(offset%4){raw.push(0);offset++;}const start=offset,b=Buffer.allocUnsafe(4);for(const x of array){if(!Number.isFinite(x))throw Error('NONFINITE_GEOMETRY:'+m.id);b.writeFloatLE(x);raw.push(...b);offset+=4;}return {start,length:offset-start};}
 for(let i=0;i<m.m.length;i++){const group=m.m[i];if(group.p.length<9)continue;const p=write(group.p),n=write(group.n),pi=views.push({buffer:0,byteOffset:p.start,byteLength:p.length,target:34962})-1,ni=views.push({buffer:0,byteOffset:n.start,byteLength:n.length,target:34962})-1,min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let k=0;k<group.p.length;k+=3)for(let j=0;j<3;j++){min[j]=Math.min(min[j],group.p[k+j]);max[j]=Math.max(max[j],group.p[k+j]);}const pos=accessors.push({bufferView:pi,componentType:5126,count:group.p.length/3,type:'VEC3',min,max})-1,norm=accessors.push({bufferView:ni,componentType:5126,count:group.n.length/3,type:'VEC3'})-1;primitives.push({attributes:{POSITION:pos,NORMAL:norm},material:i,mode:4});}
 const gltf={asset:{version:'2.0',generator:'Vibe 5.9 goods-specific owner original mesh'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0,name:m.id}],meshes:[{name:m.id,primitives}],buffers:[{byteLength:raw.length}],bufferViews:views,accessors,materials:m.palette.map(c=>({pbrMetallicRoughness:{baseColorFactor:[...c,1],metallicFactor:['gold','tin'].includes(m.id)?.72:['pearls','pearl_shell'].includes(m.id)?.13:0,roughnessFactor:['gold','tin','jade','pearls','lacquer'].includes(m.id)?.29:.73},doubleSided:true}))};
 const json=Buffer.from(JSON.stringify(gltf)),jsonLength=(json.length+3)&~3,bin=Buffer.from(raw),binLength=(bin.length+3)&~3,out=Buffer.alloc(12+8+jsonLength+8+binLength);let index=0;const u32=x=>{out.writeUInt32LE(x,index);index+=4;};u32(0x46546c67);u32(2);u32(out.length);u32(jsonLength);u32(0x4e4f534a);json.copy(out,index);index+=jsonLength;out.fill(32,index-jsonLength+json.length,index);u32(binLength);u32(0x004e4942);bin.copy(out,index);index+=binLength;
 const tri=m.m.reduce((sum,g)=>sum+g.p.length/9,0);if(index!==out.length||tri<100||tri>20000||out.length>1900000||primitives.length<2)throw Error('INVALID_OR_TOO_HEAVY:'+m.id+':'+tri);return {out,tri};
}

// 메인: 기존 원본 보존, 출처/해시 누락 시 미완료. 이전 6종은 건드리지 않는다.
fs.mkdirSync(root,{recursive:true});let created=0,total=0;
for(const id of items){const file=path.join(root,id+'.glb'),meta=file+'.license.json';if(fs.existsSync(file)||fs.existsSync(meta)){if(!fs.existsSync(file)||!fs.existsSync(meta))throw Error('INCOMPLETE_ASSET_PAIR:'+id);console.log('EXISTING_CANDIDATE '+id);continue;}
 const {out,tri}=encode(model(id));const sha256=crypto.createHash('sha256').update(out).digest('hex');const license={license:'PROJECT_ORIGINAL_ART',author:'Vibe 5.9 (owner-directed original 3D model)',source:'OWNER_DIRECTED_ORIGINAL_MODEL_2026-11-12',sourceSha256:sha256,verification:'GITHUB_CANDIDATE_ONLY_NOT_ROBLOX_APPROVED',usePermissionGranted:false,nativeRuntimeVerified:false};fs.writeFileSync(file,out,{flag:'wx'});fs.writeFileSync(meta,JSON.stringify(license,null,2)+'\n',{flag:'wx'});console.log('CREATED_CARGO '+id+' '+out.length+' '+tri+' '+sha256);created++;total+=out.length;
}
console.log('CARGO_AUTHORED='+created+' CARGO_BYTES='+total+' ROBLOX_REGISTERED=NO NATIVE_RUNTIME_QA=NO');