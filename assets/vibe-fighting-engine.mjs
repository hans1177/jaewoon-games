// Vibe reusable fighting engine. Fixed-step friendly, independent of renderer.
export const fighters=[
 {id:'jin',name:'진우',height:1.82,weight:78,face:'sharp',skin:0xe2b18c,hair:0x181a22,outfit:0x2d405e,accent:0xff635e,speed:4.6,power:1,weapon:'gauntlet'},
 {id:'ara',name:'아라',height:1.67,weight:54,face:'oval',skin:0xf2c6a5,hair:0x4b2731,outfit:0x6e315a,accent:0xffd2e1,speed:5.5,power:.86,weapon:'staff'},
 {id:'tae',name:'태산',height:1.98,weight:116,face:'square',skin:0xb77b56,hair:0x171717,outfit:0x40483c,accent:0xe5ae58,speed:3.4,power:1.35,weapon:'hammer'},
 {id:'seo',name:'서리',height:1.74,weight:63,face:'heart',skin:0xecc5ad,hair:0xd6dbe8,outfit:0x244a62,accent:0x84eaff,speed:5,power:.95,weapon:'blade'},
 {id:'ryu',name:'류건',height:1.89,weight:92,face:'broad',skin:0xd3a17c,hair:0x39302d,outfit:0x60352b,accent:0xffa74b,speed:4.1,power:1.18,weapon:'axe'},
 {id:'mina',name:'미나',height:1.59,weight:49,face:'round',skin:0xf0c9ac,hair:0x292334,outfit:0x3b5470,accent:0x7bf0ba,speed:5.8,power:.82,weapon:'dagger'},
 {id:'noel',name:'노엘',height:1.91,weight:85,face:'long',skin:0xd6b2a1,hair:0xd4a86c,outfit:0x353650,accent:0xc2a0ff,speed:4.4,power:1.07,weapon:'spear'},
 {id:'han',name:'한별',height:1.71,weight:69,face:'angular',skin:0xc99b74,hair:0x101f28,outfit:0x27605b,accent:0xffe086,speed:4.9,power:1.02,weapon:'tonfa'}
];
export const weapons={
 gauntlet:{name:'권갑',reach:1.4,damage:1.05,speed:1.1},staff:{name:'봉',reach:2.15,damage:.82,speed:1.05},
 hammer:{name:'망치',reach:1.65,damage:1.4,speed:.72},blade:{name:'검',reach:1.9,damage:1.1,speed:.95},
 axe:{name:'도끼',reach:1.7,damage:1.26,speed:.8},dagger:{name:'단검',reach:1.35,damage:.9,speed:1.32},
 spear:{name:'창',reach:2.35,damage:.93,speed:.88},tonfa:{name:'톤파',reach:1.5,damage:1,speed:1.16}
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createFightingMatch({player='jin',opponent='ara',roundSeconds=75,roundsToWin=2}={}){
 const get=id=>{const f=fighters.find(x=>x.id===id);if(!f)throw Error('Unknown fighter: '+id);return f};
 const base=[get(player),get(opponent)];
 let time=roundSeconds,round=1,finished=false;const events=[];
 const actors=base.map((fighter,i)=>({fighter,weapon:fighter.weapon,x:i?-3.2:3.2,hp:100,guard:false,crouch:false,stun:0,attack:null,cooldown:0,wins:0,face:i?1:-1,invuln:0}));
 function startRound(){time=roundSeconds;actors.forEach((a,i)=>{a.x=i?-3.2:3.2;a.hp=100;a.stun=0;a.attack=null;a.cooldown=0;a.guard=false;a.crouch=false;a.invuln=0})}
 function finishRound(){if(finished)return;const winner=actors[0].hp===actors[1].hp?-1:actors[0].hp>actors[1].hp?0:1;if(winner>=0)actors[winner].wins++;events.push({type:'round',winner,round});if(actors.some(a=>a.wins>=roundsToWin)){finished=true;events.push({type:'matchEnd',winner})}else{round++;startRound()}}
 function attack(index,kind='light'){const a=actors[index];if(finished||a.hp<=0||a.stun>0||a.attack||a.cooldown>0)return false;
  const w=weapons[a.weapon],heavy=kind==='heavy';a.attack={kind,time:0,impact:heavy?.42/w.speed:.18/w.speed,duration:heavy?.78/w.speed:.4/w.speed,hit:false};a.cooldown=a.attack.duration+(heavy?.2:.09);events.push({type:'attack',index,kind});return true}
 function step(dt,inputs=[{},{}]){if(finished)return snapshot();dt=clamp(dt,0,.05);time=Math.max(0,time-dt);
  actors.forEach((a,i)=>{a.face=actors[1-i].x>a.x?1:-1;a.cooldown=Math.max(0,a.cooldown-dt);a.stun=Math.max(0,a.stun-dt);a.invuln=Math.max(0,a.invuln-dt);a.guard=!!inputs[i]?.guard&&!a.attack&&a.stun<=0;a.crouch=!!inputs[i]?.crouch&&!a.attack;
   if(a.stun<=0&&!a.attack){const movement=clamp(Number(inputs[i]?.move)||0,-1,1);a.x=clamp(a.x+movement*a.fighter.speed*dt,-7.5,7.5)}
   if(a.attack){const hit=a.attack;a.attack.time+=dt;if(!hit.hit&&hit.time>=hit.impact){hit.hit=true;const target=actors[1-i],w=weapons[a.weapon],reach=w.reach+(hit.kind==='heavy'?.25:0),dist=Math.abs(target.x-a.x);
    if(dist<=reach&&target.invuln<=0){const raw=(hit.kind==='heavy'?19:10)*a.fighter.power*w.damage,blocked=target.guard&&(!target.crouch||hit.kind==='light'),damage=Math.max(1,Math.round(raw*(blocked?.16:1)));
     target.hp=clamp(target.hp-damage,0,100);target.stun=blocked?.09:hit.kind==='heavy'?.42:.21;target.x=clamp(target.x+a.face*(blocked?.12:.32),-7.5,7.5);
     events.push({type:blocked?'block':'hit',index:i,target:1-i,damage,x:target.x,kind:hit.kind});}}
    if(hit.time>=hit.duration)a.attack=null}
  });
  if(inputs[0]?.light)attack(0,'light');if(inputs[0]?.heavy)attack(0,'heavy');
  if(inputs[1]?.light)attack(1,'light');if(inputs[1]?.heavy)attack(1,'heavy');
  if(time<=0||actors.some(a=>a.hp<=0))finishRound();return snapshot()}
 function snapshot(){return {actors:actors.map(a=>({id:a.fighter.id,weapon:a.weapon,x:a.x,hp:a.hp,guard:a.guard,crouch:a.crouch,stun:a.stun,attack:a.attack?{...a.attack}:null,wins:a.wins,face:a.face})),time,round,finished}}
 return {step,snapshot,attack,events,drainEvents(){return events.splice(0)},switchWeapon(index,id){const a=actors[index];if(finished||a.attack||a.stun>0||!weapons[id])return false;a.weapon=id;a.cooldown=Math.max(a.cooldown,.3);events.push({type:'weapon',index,weapon:id});return true},reset(){round=1;finished=false;actors.forEach(a=>a.wins=0);events.length=0;startRound()}};
}
