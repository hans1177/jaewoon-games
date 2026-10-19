// Wild Forest: 17 wildlife species adapted from the company's survival-wildlife semantic pack.
// This is shared browser gameplay data; original Roblox Luau geometry is NOT a web GLB.
export const SPECIES=Object.freeze({
 rabbit:{name:'산토끼',kind:'prey',habitat:'forest',count:9,hp:28,speed:139,r:13,meat:1,hide:0,bone:0,alert:210,scale:.55,color:'#b7ae9e',rarity:'흔함'},
 deer:{name:'꽃사슴',kind:'prey',habitat:'forest',count:7,hp:90,speed:121,r:24,meat:4,hide:2,bone:1,alert:300,scale:1.03,color:'#ae7f51',rarity:'흔함'},
 boar:{name:'멧돼지',kind:'charge',habitat:'forest',count:5,hp:115,speed:88,r:30,meat:3,hide:2,bone:1,alert:90,damage:14,scale:1.22,color:'#59483c',rarity:'흔함'},
 bear:{name:'불곰',kind:'predator',habitat:'highland',count:2,hp:290,speed:95,r:43,meat:8,hide:4,bone:3,alert:270,damage:25,scale:1.85,color:'#584035',rarity:'매우 위험'},
 elk:{name:'엘크',kind:'prey',habitat:'meadow',count:3,hp:170,speed:126,r:36,meat:7,hide:3,bone:2,alert:370,scale:1.45,color:'#8c6145',rarity:'드묾'},
 moose:{name:'무스',kind:'charge',habitat:'river',count:2,hp:240,speed:112,r:43,meat:9,hide:4,bone:2,alert:140,damage:22,scale:1.85,color:'#5f5044',rarity:'위험'},
 bison:{name:'들소',kind:'charge',habitat:'meadow',count:3,hp:340,speed:94,r:48,meat:11,hide:5,bone:3,alert:140,damage:31,scale:2.05,color:'#4c3c33',rarity:'매우 위험'},
 wolf:{name:'늑대',kind:'predator',habitat:'forest',count:6,hp:125,speed:132,r:25,meat:3,hide:2,bone:1,alert:350,damage:12,scale:1.02,color:'#767773',rarity:'위험'},
 coyote:{name:'코요테',kind:'predator',habitat:'meadow',count:4,hp:84,speed:136,r:20,meat:2,hide:1,bone:1,alert:280,damage:8,scale:.80,color:'#a28a65',rarity:'위험'},
 fox:{name:'붉은여우',kind:'prey',habitat:'forest',count:5,hp:52,speed:144,r:17,meat:1,hide:1,bone:0,alert:290,scale:.72,color:'#b97641',rarity:'보통'},
 raccoon:{name:'너구리',kind:'prey',habitat:'river',count:5,hp:48,speed:95,r:15,meat:1,hide:1,bone:0,alert:195,scale:.65,color:'#787066',rarity:'보통'},
 squirrel:{name:'청설모',kind:'prey',habitat:'forest',count:7,hp:19,speed:151,r:9,meat:0,hide:0,bone:0,alert:178,scale:.37,color:'#a76b43',rarity:'흔함'},
 beaver:{name:'비버',kind:'prey',habitat:'river',count:4,hp:77,speed:70,r:20,meat:2,hide:2,bone:0,alert:180,scale:.80,color:'#755642',rarity:'보통'},
 badger:{name:'오소리',kind:'charge',habitat:'forest',count:4,hp:78,speed:81,r:18,meat:1,hide:1,bone:0,alert:78,damage:7,scale:.75,color:'#51514d',rarity:'보통'},
 mountain_goat:{name:'산양',kind:'prey',habitat:'highland',count:4,hp:120,speed:131,r:25,meat:4,hide:2,bone:1,alert:340,scale:1.0,color:'#ddd8c6',rarity:'드묾'},
 turkey:{name:'칠면조',kind:'prey',habitat:'meadow',count:5,hp:45,speed:103,r:16,meat:2,hide:0,bone:0,alert:235,scale:.68,color:'#645044',rarity:'흔함'},
 crow:{name:'까마귀',kind:'prey',habitat:'forest',count:6,hp:20,speed:140,r:11,meat:0,hide:0,bone:0,alert:275,scale:.40,color:'#262a30',rarity:'흔함'}
});
export const SPECIES_KEYS=Object.freeze(Object.keys(SPECIES));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function wildlifeSpawnPoint(type,world,random=Math.random){
  const spec=SPECIES[type];
  if(!spec)return{x:world.w*.5,y:world.h*.5};
  const r=(lo,hi)=>lo+(hi-lo)*random();
  if(spec.habitat==='river'){
    const side=random()<.5?-1:1;
    return{x:r(170,world.w-170),y:clamp(world.riverY+(side<0?-r(100,400):world.riverH+r(85,350)),60,world.h-60)};
  }
  if(spec.habitat==='highland')return{x:r(2350,world.w-155),y:r(145,980)};
  if(spec.habitat==='meadow')return{x:r(300,world.w-250),y:r(120,world.riverY-180)};
  let x=r(180,world.w-180),y=r(160,world.h-160);
  // Ground animals never spawn in the middle of the river.
  if(y>world.riverY-25&&y<world.riverY+world.riverH+25)y=world.riverY-125;
  return{x,y};
}
export function wildlifeNames(){return SPECIES_KEYS.map(key=>({key,...SPECIES[key]}))}
