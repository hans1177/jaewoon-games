import * as pc from 'playcanvas';
import {SLIME_GLB_BASE64} from './assets/slime-data.mjs';

const $=id=>document.getElementById(id);
const canvas=$('app');
const app=new pc.Application(canvas,{graphicsDeviceOptions:{alpha:false,antialias:true}});
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.start();

app.scene.ambientLight=new pc.Color(.22,.24,.30);
app.scene.exposure=1.18;
app.scene.gammaCorrection=pc.GAMMA_SRGB;

const mat=(r,g,b,metal=0,gloss=.35)=>{
  const m=new pc.StandardMaterial();
  m.diffuse=new pc.Color(r,g,b);m.metalness=metal;m.gloss=gloss;m.update();return m;
};
const M={
 grass:mat(.20,.46,.23,0,.15),stone:mat(.36,.39,.43,0,.28),wood:mat(.35,.20,.10,0,.18),roof:mat(.38,.12,.10,0,.22),
 hero:mat(.15,.35,.78,.12,.5),slime:mat(.16,.65,.30,0,.25),blue:mat(.18,.48,.78,0,.3),boar:mat(.42,.24,.12,0,.18),
 wolf:mat(.35,.39,.46,0,.22),orc:mat(.25,.48,.19,0,.18),redwolf:mat(.55,.17,.15,0,.22),knight:mat(.28,.31,.38,.25,.48),
 demon:mat(.48,.18,.58,.12,.45),snow:mat(.68,.82,.90,0,.2),jungle:mat(.08,.27,.13,0,.16),sand:mat(.48,.35,.19,0,.15),
 chief:mat(.72,.48,.18,0,.28),merchant:mat(.58,.28,.12,0,.32),armor:mat(.55,.58,.64,.45,.58),cloth:mat(.18,.48,.62,0,.22),gold:mat(.92,.65,.18,.35,.7)
};
const portalMats=[mat(.24,.60,1,.18,.72),mat(.55,.30,1,.18,.72),mat(.15,.85,.66,.18,.72),mat(1,.48,.22,.18,.72),mat(.92,.25,.64,.18,.72),mat(.66,.75,.95,.18,.72),mat(.32,.95,.35,.18,.72)];
function primitive(name,type,pos,scale,material,parent=app.root){
  const e=new pc.Entity(name);e.addComponent('model',{type});
  parent.addChild(e);e.setLocalPosition(...pos);e.setLocalScale(...scale);
  if(e.model)e.model.material=material;
  return e;
}
function destroyChildren(root){while(root.children.length)root.children[0].destroy()}

const sun=new pc.Entity('Sun');
sun.addComponent('light',{type:'directional',color:new pc.Color(1,.78,.62),intensity:1.55,castShadows:true,shadowBias:.16,shadowDistance:70});
sun.setEulerAngles(52,-38,0);app.root.addChild(sun);
const fill=new pc.Entity('MoonFill');
fill.addComponent('light',{type:'directional',color:new pc.Color(.28,.42,.65),intensity:.42,castShadows:false});
fill.setEulerAngles(35,145,0);app.root.addChild(fill);

const zoneRoot=new pc.Entity('ZoneRoot');app.root.addChild(zoneRoot);
const actorRoot=new pc.Entity('ActorRoot');app.root.addChild(actorRoot);

const CARTOON={
  warrior:null,ranger:null,wizard:null,slime:null,ready:false,slimeUrl:null
};
const cartoonAssetPromises=new Map();
function base64BlobUrl(base64,type='model/gltf-binary'){
  const raw=atob(base64),bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes],{type}));
}
function loadContainer(url,filename){
  if(cartoonAssetPromises.has(url))return cartoonAssetPromises.get(url);
  const pending=new Promise(resolve=>app.assets.loadFromUrlAndFilename(url,filename,'container',(err,asset)=>{
    if(err){console.warn('cartoon asset fallback',filename,err);resolve(null);return}
    resolve(asset);
  }));
  cartoonAssetPromises.set(url,pending);return pending;
}
function mountAsset(parent,asset,key,{scale=1,y=0,rotY=180}={}){
  if(!asset?.resource?.instantiateRenderEntity||parent.__cartoonVisual)return null;
  const visual=asset.resource.instantiateRenderEntity();
  visual.name='CartoonVisual-'+key;parent.addChild(visual);
  visual.setLocalPosition(0,y,0);visual.setLocalEulerAngles(0,rotY,0);visual.setLocalScale(scale,scale,scale);
  parent.__cartoonVisual=visual;if(parent.model)parent.model.enabled=false;
  if(Array.isArray(parent.__fallbackVisual))parent.__fallbackVisual.forEach(v=>{if(v)v.enabled=false});
  visual.findComponents?.('render').forEach(r=>{r.castShadows=true;r.receiveShadows=true});
  return visual;
}
function applyNpcAsset(n){
  const asset=n.role==='trainer-archer'?CARTOON.ranger:n.role==='trainer-mage'?CARTOON.wizard:CARTOON.warrior;
  return mountAsset(n,asset,n.role,{scale:.72,y:0,rotY:180});
}
function applyEnemyAsset(e){
  const name=e.enemyName||'';
  let asset=null,scale=.72,y=-.85,key='enemy';
  if(/슬라임/.test(name)){asset=CARTOON.slime;scale=.82;key='slime'}
  else if(/마법|악마|망령|심연|주술|마물/.test(name)){asset=CARTOON.wizard;scale=e.isBoss?1.05:.72;key='dark-mage'}
  else if(/오크|기사|해골|고블린|수호|병사|추종자|대장|군주|왕/.test(name)){asset=CARTOON.warrior;scale=e.isBoss?1.12:.74;key='fighter'}
  if(!asset)return null;
  return mountAsset(e,asset,key,{scale,y,rotY:180});
}
function applyAiAsset(a){
  const asset=a.role==='궁수'?CARTOON.ranger:a.role==='힐러'?CARTOON.wizard:CARTOON.warrior;
  return mountAsset(a,asset,'ai-'+a.role,{scale:.68,y:-1.1,rotY:180});
}
function applyCartoonVisuals(){
  const pv=mountAsset(player,CARTOON.warrior,'player',{scale:.72,y:-1.1,rotY:180});
  if(pv){if(sword.model)sword.model.enabled=false;if(armorPlate.model)armorPlate.model.enabled=false;if(helmet.model)helmet.model.enabled=false}
  npcs.forEach(applyNpcAsset);enemies.forEach(applyEnemyAsset);aiUsers.forEach(applyAiAsset);
}
async function loadCartoonAssets(){
  CARTOON.slimeUrl=base64BlobUrl(SLIME_GLB_BASE64);
  const [warrior,ranger,wizard,slime]=await Promise.all([
    loadContainer('./assets/Warrior.gltf','Warrior.gltf'),
    loadContainer('./assets/Ranger.gltf','Ranger.gltf'),
    loadContainer('./assets/Wizard.gltf','Wizard.gltf'),
    loadContainer(CARTOON.slimeUrl,'Slime.glb')
  ]);
  CARTOON.warrior=warrior;CARTOON.ranger=ranger;CARTOON.wizard=wizard;CARTOON.slime=slime;
  CARTOON.ready=Boolean(warrior||ranger||wizard||slime);
  applyCartoonVisuals();
  if(CARTOON.ready)toast('카툰 RPG 에셋 적용 완료');
}

const player=primitive('Player','capsule',[0,1.1,8],[1.05,1.05,1.05],M.hero,actorRoot);
const sword=primitive('Sword','box',[.75,1.15,0],[.12,1.2,.18],M.stone,player);sword.setLocalEulerAngles(0,0,-18);
const armorPlate=primitive('ArmorPlate','box',[0,.28,.02],[1.15,.85,.72],M.armor,player);armorPlate.enabled=false;
const helmet=primitive('Helmet','sphere',[0,1.1,0],[.72,.42,.72],M.armor,player);helmet.enabled=false;

const state={zone:'town',active:false,portalCd:0,attackCd:0,damageCd:0,toastT:0,walkT:0,quest:0,questKills:0,partyKills:0,stunT:0};
const hero={hp:100,maxHp:100,baseAttack:10,attack:10,speed:7.2,lv:1,xp:0,nextXp:100,gold:0,kills:0,weapon:'맨손',armor:'없음',job:'미전직',skillCd:0};
const WEAPONS={
  '낡은 돌검':{price:100,attack:15,scale:[.14,1.3,.2],material:M.stone},
  '철 도끼':{price:500,attack:40,scale:[.2,1.5,.26],material:M.armor},
  '철 쌍검':{price:700,attack:30,scale:[.12,1.05,.16],material:M.armor}
};
const ARMORS={
  '나무 갑옷':{price:50,hp:50,material:M.wood},
  '철 갑옷':{price:200,hp:200,material:M.armor}
};
const inventory={weapons:new Set(),armors:new Set()};
const AI_ROLES=['무직업','무직업','힐러','힐러','전사','전사','전사','궁수','궁수','궁수'];
const aiUsers=[];
const party={members:new Set(),active:false,contrib:{player:0},goal:15};
const MULTI_SUPABASE_URL='https://njpexgqvituaxrjpnqsi.supabase.co';
const MULTI_SUPABASE_KEY='sb_publishable_ybAF71npJQz6PJVpnwsQ4g_rsyzlkFQ';
const multiplayer={client:null,channel:null,room:'',connected:false,playerId:sessionStorage.getItem('daechung-rpg-multi-id')||('r'+Math.random().toString(36).slice(2,10)),joinedAt:Date.now(),remote:new Map(),presenceIds:new Set(),sendAt:0};
sessionStorage.setItem('daechung-rpg-multi-id',multiplayer.playerId);


const camera=new pc.Entity('Camera');camera.addComponent('camera',{clearColor:new pc.Color(.055,.065,.085),fov:52});app.root.addChild(camera);

const ZONES={
  f1:{name:'1번 사냥터',ground:M.grass,reward:[6,3],enemy:['초록 슬라임',35,4,2.9,M.slime,5]},
  f2:{name:'2번 사냥터',ground:M.grass,reward:[9,5],enemy:['파란 슬라임',56,6,3.0,M.blue,5]},
  f3:{name:'3번 사냥터',ground:M.grass,reward:[18,10],enemy:['회색 늑대',136,12,3.5,M.wolf,6]},
  f4:{name:'4번 사냥터',ground:M.sand,reward:[24,14],enemy:['오크',200,15,2.8,M.orc,6]},
  f5:{name:'5번 사냥터',ground:M.stone,reward:[42,25],enemy:['균열 기사',380,24,3.0,M.knight,6]},
  f6:{name:'6번 사냥터',ground:M.stone,reward:[65,38],enemy:['해골 전사',650,32,3.1,M.knight,7]},
  f7:{name:'7번 정글',ground:M.jungle,reward:[125,72],enemy:['정글 호랑이',1250,48,3.8,M.redwolf,7]},
  f8:{name:'8번 폐허 마을',ground:M.stone,reward:[180,45],enemy:['폐허 기사',1250,28,3.0,M.knight,7]},
  f9:{name:'9번 공동묘지',ground:M.stone,reward:[220,60],enemy:['망령',1500,34,3.1,M.demon,7]},
  f10:{name:'10번 빙결 설산',ground:M.snow,reward:[260,120],enemy:['빙설 늑대',2800,72,3.7,M.wolf,7]},
  f11:{name:'11번 저주받은 성',ground:M.stone,reward:[430,210],enemy:['저주받은 기사',4300,92,3.2,M.knight,7]},
  cliff:{name:'절벽 지대',ground:M.sand,reward:[140,72],enemy:['절벽 늑대',950,38,3.8,M.wolf,7]},
  amazon:{name:'아마존',ground:M.jungle,reward:[150,80],enemy:['늪 악어',1000,40,3.2,M.jungle,7]},
  d1:{name:'던전 1 · 고블린 동굴',ground:M.stone,reward:[80,35],enemy:['동굴 고블린',500,20,3.1,M.orc,7],boss:['고블린 대장',1800,45,M.orc]},
  d2:{name:'던전 2 · 검은 광산',ground:M.stone,reward:[130,60],enemy:['광산 수호병',900,32,3.0,M.knight,7],boss:['철갑 수호자',2800,65,M.armor]},
  d3:{name:'던전 3 · 붉은 제단',ground:M.sand,reward:[210,100],enemy:['붉은 마물',1400,48,3.3,M.demon,7],boss:['붉은 제단주',4200,90,M.redwolf]},
  d4:{name:'던전 4 · 빙결 성채',ground:M.snow,reward:[320,160],enemy:['빙결 병사',2200,70,3.1,M.knight,7],boss:['빙결 군주',6800,120,M.snow]},
  d5:{name:'던전 5 · 심연의 문',ground:M.stone,reward:[520,260],enemy:['심연 추종자',3600,95,3.2,M.demon,7],boss:['심연의 왕',11000,170,M.demon]}
};

let portals=[],enemies=[],returnPortal=null,npcs=[];
function addTree(x,z,material=M.grass){
  const trunk=primitive('TreeTrunk','cylinder',[x,1.55,z],[.62,3.1,.62],M.wood,zoneRoot);
  trunk.setLocalEulerAngles(0,(x*17+z*11)%360,3);
  primitive('TreeCrownLow','sphere',[0,2.15,0],[2.8,2.15,2.8],material,trunk);
  primitive('TreeCrownMid','sphere',[-.7,3.15,.25],[2.15,1.75,2.15],material,trunk);
  primitive('TreeCrownHigh','sphere',[.8,3.55,-.2],[1.75,1.45,1.75],material,trunk);
}
function addHouse(x,z){
  const h=new pc.Entity('House');zoneRoot.addChild(h);h.setLocalPosition(x,0,z);
  primitive('StoneBase','box',[0,.55,0],[7.5,1.1,6.5],M.stone,h);
  primitive('PlasterBody','box',[0,2.35,0],[7,3.6,6],M.wood,h);
  const roofL=primitive('RoofL','box',[-1.75,4.55,0],[4.7,.55,7.2],M.roof,h);roofL.setLocalEulerAngles(0,0,28);
  const roofR=primitive('RoofR','box',[1.75,4.55,0],[4.7,.55,7.2],M.roof,h);roofR.setLocalEulerAngles(0,0,-28);
  primitive('Door','box',[0,1.2,-3.08],[1.35,2.35,.22],M.stone,h);
  primitive('BeamTop','box',[0,3.5,-3.09],[6.3,.22,.18],M.stone,h);
  primitive('BeamL','box',[-2.55,2.25,-3.1],[.2,2.35,.18],M.stone,h);
  primitive('BeamR','box',[2.55,2.25,-3.1],[.2,2.35,.18],M.stone,h);
  const w1=primitive('WindowL','box',[-1.85,2.35,-3.13],[1.15,1.05,.12],M.gold,h);
  const w2=primitive('WindowR','box',[1.85,2.35,-3.13],[1.15,1.05,.12],M.gold,h);
  w1.model.castShadows=false;w2.model.castShadows=false;
  primitive('Chimney','box',[2.2,5.2,1.2],[.8,2.1,.8],M.stone,h);
}
function addPortal(x,z,id,material,label){
  const base=primitive('Portal-'+label,'cylinder',[x,.22,z],[2.2,.22,2.2],material,zoneRoot);
  const glow=primitive('PortalGlow-'+label,'cylinder',[x,1.7,z],[1.35,3.2,1.35],material,zoneRoot);
  glow.model.castShadows=false;
  const light=new pc.Entity('PortalLight-'+label);light.addComponent('light',{type:'point',color:material.diffuse||new pc.Color(.4,.65,1),intensity:.65,range:7,castShadows:false});light.setLocalPosition(x,2.1,z);zoneRoot.addChild(light);
  base.portalId=id;base.label=label;return base;
}
function addNpc(name,role,x,z,material){
  const root=new pc.Entity('NPC-'+name);zoneRoot.addChild(root);root.setLocalPosition(x,0,z);
  const body=primitive('Body','capsule',[0,1.15,0],[.9,1,.9],material,root);
  const head=primitive('Head','sphere',[0,2.15,0],[.65,.65,.65],M.wood,root);
  root.__fallbackVisual=[body,head];root.npcName=name;root.role=role;npcs.push(root);if(CARTOON.ready)applyNpcAsset(root);return root;
}
function ensureAiUsers(){
  if(aiUsers.length)return;
  AI_ROLES.forEach((role,i)=>{
    const e=primitive('AI-'+(i+1),'capsule',[0,1.1,0],[.92,.92,.92],role==='힐러'?M.cloth:role==='전사'?M.armor:role==='궁수'?M.merchant:M.chief,actorRoot);
    e.aiId='ai'+(i+1);e.aiName='유저 AI '+(i+1);e.role=role;e.hp=100;e.maxHp=100;e.attack=role==='전사'?18:role==='궁수'?14:10;e.range=role==='궁수'?8:2.2;e.cool=0;e.zone='town';e.weapon='맨손';e.gold=100+i*20;e.xp=0;e.contrib=0;
    aiUsers.push(e);party.contrib[e.aiId]=0;if(CARTOON.ready)applyAiAsset(e);
  });
}
function placeAiForZone(){
  ensureAiUsers();
  aiUsers.forEach((a,i)=>{
    a.enabled=true;a.zone=state.zone;
    const ang=(i/10)*Math.PI*2,r=state.zone==='town'?10:4+(i%3)*1.2;
    const pp=player.getPosition();a.setPosition(state.zone==='town'?Math.cos(ang)*r:pp.x+Math.cos(ang)*r,1.1,state.zone==='town'?Math.sin(ang)*r+12:pp.z+Math.sin(ang)*r);
  });
}
function buildTown(){
  destroyChildren(zoneRoot);portals=[];enemies=[];returnPortal=null;npcs=[];
  primitive('Ground','box',[0,-.5,0],[72,1,72],M.grass,zoneRoot);
  for(let z=-20;z<=20;z+=4)primitive('TownPath','box',[0,.03,z],[5.4,.08,3.3],M.stone,zoneRoot);
  for(let x=-20;x<=20;x+=4)primitive('TownCrossPath','box',[x,.035,1.5],[3.3,.08,5.2],M.stone,zoneRoot);
  for(const [x,z] of [[-14,-12],[14,-12],[-14,12],[14,12],[-24,0],[24,0]])addHouse(x,z);
  for(let i=0;i<18;i++){const a=i/18*Math.PI*2,r=29+(i%3);addTree(Math.cos(a)*r,Math.sin(a)*r)}
  addNpc('촌장','chief',-4,7,M.chief);addNpc('무기상인','weapon',7,10,M.merchant);addNpc('방어구상인','armor',11,5,M.armor);addNpc('전사 전직관','trainer-warrior',-10,8,M.redwolf);
  const spots=[[-18,-5],[-12,-5],[-6,-5],[0,-5],[6,-5],[12,-5],[18,-5]];
  portals=spots.map((p,i)=>addPortal(p[0],p[1],'f'+(i+1),portalMats[i],String(i+1)));
  const extra=[['f8',-15,-12,'8'],['f9',-9,-12,'9'],['f10',-3,-12,'10'],['f11',3,-12,'11'],['cliff',9,-12,'절벽'],['amazon',15,-12,'아마존'],
    ['d1',-12,18,'D1'],['d2',-6,18,'D2'],['d3',0,18,'D3'],['d4',6,18,'D4'],['d5',12,18,'D5']];
  for(const [id,x,z,label] of extra)portals.push(addPortal(x,z,id,M.gold,label));
  player.setPosition(0,1.1,8);state.zone='town';state.portalCd=.8;placeAiForZone();
}
function spawnEnemy(i,spec){
  const [name,hp,atk,speed,material]=spec;
  const angle=(i/7)*Math.PI*2+.4,r=10+(i%3)*4;
  const e=primitive(name+'-'+i,'sphere',[Math.cos(angle)*r,.85,Math.sin(angle)*r-8],[1.3,.85,1.3],material,zoneRoot);
  e.enemyName=name;e.hp=hp;e.maxHp=hp;e.attack=atk;e.speed=speed;e.alive=true;e.hitCd=.2+Math.random()*.5;
  enemies.push(e);if(CARTOON.ready)applyEnemyAsset(e);
}
function buildHunt(id){
  destroyChildren(zoneRoot);portals=[];enemies=[];returnPortal=null;npcs=[];
  const key=String(id).startsWith('f')||String(id).startsWith('d')||id==='cliff'||id==='amazon'?String(id):'f'+id;
  const z=ZONES[key];primitive('Ground','box',[0,-.5,0],[76,1,76],z.ground,zoneRoot);
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2,r=26+(i%4)*2; if(id===7)addTree(Math.cos(a)*r,Math.sin(a)*r,M.jungle); else primitive('Rock','box',[Math.cos(a)*r,.5,Math.sin(a)*r],[1.8,.9,1.5],M.stone,zoneRoot)}
  returnPortal=addPortal(0,8,'town',portalMats[0],'귀환');
  for(let i=0;i<z.enemy[5];i++)spawnEnemy(i,z.enemy);
  if(key==='f8')addNpc('궁수 전직관','trainer-archer',-8,6,M.merchant);
  if(key==='f5')addNpc('마법사 전직관','trainer-mage',8,6,M.demon);
  if(z.boss){
    const [bn,bhp,batk,bmat]=z.boss;
    const b=primitive('Boss-'+bn,'capsule',[0,1.5,-14],[2.3,2.3,2.3],bmat,zoneRoot);
    b.enemyName=bn;b.hp=bhp;b.maxHp=bhp;b.attack=batk;b.speed=2.4;b.alive=true;b.hitCd=.5;b.isBoss=true;enemies.push(b);if(CARTOON.ready)applyEnemyAsset(b);
  }
  player.setPosition(0,1.1,13);state.zone=key;state.portalCd=1;placeAiForZone();
  toast(z.name+' 입장');
}
function enterZone(target){
  if(target==='town'){party.active=false;state.partyKills=0;buildTown();updatePartyHud();toast('마을로 귀환');return}
  buildHunt(target);
  if(party.members.size){party.active=true;state.partyKills=0;for(const k of Object.keys(party.contrib))party.contrib[k]=0;updatePartyHud();toast('파티 사냥 시작 · 몬스터 15마리')}
}

function toast(msg){
  const el=$('toast');el.textContent=msg;el.style.opacity='1';state.toastT=1.5;
}
function addXp(v){
  hero.xp+=v;
  while(hero.xp>=hero.nextXp){hero.xp-=hero.nextXp;hero.lv++;hero.nextXp=hero.lv*100;hero.maxHp+=10;hero.hp=hero.maxHp;hero.baseAttack+=10;recalcStats();toast('레벨 '+hero.lv+'! 체력/공격 +10')}
}
function refreshHud(){
  const z=state.zone==='town'?'마을':ZONES[state.zone]?.name||state.zone;
  $('area').textContent=z;$('lv').textContent='Lv.'+hero.lv;$('hp').textContent='HP '+Math.ceil(hero.hp)+'/'+hero.maxHp;
  $('atk').textContent='공격 '+hero.attack;$('gold').textContent=hero.gold+' G';$('xp').textContent='EXP '+hero.xp+'/'+hero.nextXp;
  $('jobText').textContent=hero.job;$('skillBtn').textContent=skillLabel();
  $('quest').textContent=state.quest===0?'퀘스트: 촌장에게 말을 걸어라.':state.quest===1?'퀘스트: 1번 사냥터 슬라임 5마리 처치 ('+Math.min(5,state.questKills)+'/5)':state.quest===2?'완료: 촌장에게 돌아가 보상 받기':'퀘스트 완료 · 자유 사냥';
}
function playerDamage(v){
  if(state.damageCd>0)return;state.damageCd=.65;hero.hp=Math.max(0,hero.hp-v);refreshHud();
  if(hero.hp<=0){hero.gold=Math.max(0,hero.gold-Math.ceil(hero.gold*.2));hero.hp=hero.maxHp;enterZone('town');toast('쓰러졌다 · 마을에서 부활')}
}
function registerPartyKill(killer,rewardXp,rewardGold){
  if(!party.active)return;
  state.partyKills++;party.contrib[killer]=(party.contrib[killer]||0)+1;
  if(state.partyKills>=party.goal){
    const total=Math.max(1,Object.values(party.contrib).reduce((a,b)=>a+b,0));
    const share=(party.contrib.player||0)/total;
    hero.xp+=Math.round(rewardXp*(1+share*2));hero.gold+=Math.round(rewardGold*(1+share*2));
    party.active=false;toast('파티 사냥 완료! 기여도 '+Math.round(share*100)+'% 보너스 지급');
  }
  updatePartyHud();
}
function killEnemy(e,killer='player'){
  if(!e.alive)return;e.alive=false;e.enabled=false;hero.kills++;
  const z=ZONES[state.zone];
  if(killer==='player'&&z){addXp(z.reward[0]);hero.gold+=z.reward[1]}
  if(z)registerPartyKill(killer,z.reward[0],z.reward[1]);
  if(state.zone==='f1'&&state.quest===1&&killer==='player'){state.questKills++;if(state.questKills>=5){state.quest=2;toast('퀘스트 완료! 촌장에게 돌아가라')}}
  refreshHud();
}

function nearestNpc(){
  const pp=player.getPosition();let best=null,dist=3.4;
  for(const n of npcs){const d=n.getPosition().distance(pp);if(d<dist){dist=d;best=n}}return best;
}
function openDialog(title,text){$('dialogTitle').textContent=title;$('dialogText').innerHTML=text;$('dialog').style.display='flex'}
function closeOverlay(id){$(id).style.display='none'}
function recalcStats(){
  const w=WEAPONS[hero.weapon],jobAtk=hero.job==='궁수'?1.5:1;hero.attack=Math.round((hero.baseAttack+(w?.attack||0))*jobAtk);
  const a=ARMORS[hero.armor],bonus=a?.hp||0,jobHp=hero.job==='궁수'?.7:1;hero.maxHp=Math.max(1,Math.floor((100+(hero.lv-1)*10+bonus)*jobHp));hero.hp=Math.min(hero.hp,hero.maxHp);
  sword.enabled=hero.weapon!=='맨손';
  if(w){sword.setLocalScale(...w.scale);sword.model.material=w.material}
  armorPlate.enabled=hero.armor!=='없음';helmet.enabled=hero.armor==='철 갑옷';
  if(a&&armorPlate.model)armorPlate.model.material=a.material;
  refreshHud();
}
function equipWeapon(name){if(!inventory.weapons.has(name))return;hero.weapon=name;recalcStats();toast(name+' 장착')}
function equipArmor(name){if(!inventory.armors.has(name))return;hero.armor=name;hero.hp=hero.maxHp;recalcStats();toast(name+' 착용')}
function renderBag(){
  const weapons=[...inventory.weapons].map(n=>`<div class="slot"><span><b>${n}</b><br>공격 +${WEAPONS[n].attack}</span><button data-w="${n}" ${hero.weapon===n?'disabled':''}>${hero.weapon===n?'장착중':'장착'}</button></div>`).join('');
  const armors=[...inventory.armors].map(n=>`<div class="slot"><span><b>${n}</b><br>최대 HP +${ARMORS[n].hp}</span><button data-a="${n}" ${hero.armor===n?'disabled':''}>${hero.armor===n?'착용중':'착용'}</button></div>`).join('');
  $('bagList').innerHTML=`<div class="slot"><span>무기</span><b>${hero.weapon}</b></div><div class="slot"><span>방어구</span><b>${hero.armor}</b></div>${weapons||'<div class="slot">보유 무기 없음</div>'}${armors||'<div class="slot">보유 방어구 없음</div>'}`;
  $('bagList').querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>{equipWeapon(b.dataset.w);renderBag()});
  $('bagList').querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{equipArmor(b.dataset.a);renderBag()});
}
function renderShop(role){
  const table=role==='weapon'?WEAPONS:ARMORS,owned=role==='weapon'?inventory.weapons:inventory.armors;
  $('shopTitle').textContent=role==='weapon'?'무기상인':'방어구상인';
  $('shopList').innerHTML=Object.entries(table).map(([name,item])=>`<div class="slot"><span><b>${name}</b><br>${role==='weapon'?'공격 +'+item.attack:'최대 HP +'+item.hp}</span><button data-buy="${name}" ${owned.has(name)?'disabled':''}>${owned.has(name)?'보유중':item.price+'G 구매'}</button></div>`).join('');
  $('shopList').querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{
    const item=table[b.dataset.buy];if(hero.gold<item.price){toast('골드가 부족하다');return}
    hero.gold-=item.price;owned.add(b.dataset.buy);role==='weapon'?equipWeapon(b.dataset.buy):equipArmor(b.dataset.buy);renderShop(role);refreshHud();
  });
  $('shop').style.display='flex';
}
function becomeJob(job){
  if(hero.lv<5){openDialog('전직관','Lv.5부터 전직할 수 있다.');return}
  if(hero.job!=='미전직'){openDialog('전직관','이미 '+hero.job+'로 전직했다.');return}
  hero.job=job;hero.skillCd=0;recalcStats();hero.hp=hero.maxHp;refreshHud();openDialog('전직관',job+' 전직 완료!');
}
function interact(){
  const n=nearestNpc();if(!n){toast('가까운 NPC가 없다');return}
  if(n.role?.startsWith('trainer-')){const job=n.role==='trainer-warrior'?'전사':n.role==='trainer-archer'?'궁수':'마법사';becomeJob(job);return}
  if(n.role==='chief'){
    if(state.quest===0){state.quest=1;state.questKills=0;openDialog('촌장','1번 사냥터에서 <b>슬라임 5마리</b>를 잡아라.<br>보상: 50골드 + 50 EXP');refreshHud();return}
    if(state.quest===1){openDialog('촌장','아직 슬라임을 더 잡아야 한다. ('+state.questKills+'/5)');return}
    if(state.quest===2){state.quest=3;hero.gold+=50;addXp(50);openDialog('촌장','잘했다. <b>50골드 + 50 EXP</b> 보상이다.');refreshHud();return}
    openDialog('촌장','이제 자유롭게 사냥하고 장비를 맞춰라.');return
  }
  if(n.role==='weapon')renderShop('weapon');else if(n.role==='armor')renderShop('armor');
}
function updatePartyHud(){
  const box=$('partyHud');if(!box)return;
  if(!party.members.size&&!party.active){box.style.display='none';return}
  box.style.display='block';
  const names=[...party.members].map(id=>{const a=aiUsers.find(x=>x.aiId===id);return a?'<div>'+a.aiName+' · '+a.role+' · 기여 '+(party.contrib[id]||0)+'</div>':''}).join('');
  box.innerHTML='<b>파티 '+state.partyKills+'/'+party.goal+'</b><div>내 기여 '+(party.contrib.player||0)+'</div>'+names;
}
function togglePartyAi(ai){
  if(party.members.has(ai.aiId)){party.members.delete(ai.aiId);toast(ai.aiName+' 파티 제외')}
  else{party.members.add(ai.aiId);toast(ai.aiName+' 파티 참가')}
  party.active=party.members.size>0&&state.zone!=='town';updatePartyHud();
}
canvas.addEventListener('dblclick',e=>{
  if(!state.active)return;
  let best=null,bd=70;
  for(const a of aiUsers){
    if(!a.enabled)continue;const p=camera.camera.worldToScreen(a.getPosition());const dx=e.clientX-p.x,dy=e.clientY-p.y,d=Math.hypot(dx,dy);
    if(d<bd){bd=d;best=a}
  }
  if(best)togglePartyAi(best);
});
let supabaseLoadPromise=null;
function ensureSupabase(){
  if(window.supabase?.createClient)return Promise.resolve(true);
  if(supabaseLoadPromise)return supabaseLoadPromise;
  supabaseLoadPromise=new Promise(resolve=>{
    const sc=document.createElement('script');sc.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.91.1';
    sc.onload=()=>resolve(!!window.supabase?.createClient);sc.onerror=()=>resolve(false);document.head.appendChild(sc);
  });
  return supabaseLoadPromise;
}
function validMultiRoom(v){const room=String(v||'').trim();return /^([1-9]|10)$/.test(room)?room:''}
function updateMultiStatus(extra=''){
  const count=Math.max(1,multiplayer.presenceIds.size||1);
  $('multiStatus').textContent=multiplayer.connected?'방 '+multiplayer.room+' · '+count+'명'+(extra?' · '+extra:''):'오프라인';
  $('multiBtn').textContent=multiplayer.connected?'멀티 '+multiplayer.room:'멀티';
}
function syncMultiPresence(){
  if(!multiplayer.channel)return;
  const rows=Object.values(multiplayer.channel.presenceState()||{}).flat().filter(Boolean);
  const ids=new Set(rows.map(x=>x.id).filter(Boolean));ids.add(multiplayer.playerId);multiplayer.presenceIds=ids;
  for(const [id,r] of multiplayer.remote)if(!ids.has(id)){r.entity?.destroy();multiplayer.remote.delete(id)}
  updateMultiStatus();
}
function multiSend(event,payload){if(multiplayer.connected&&multiplayer.channel)multiplayer.channel.send({type:'broadcast',event,payload}).catch(()=>{})}
function ensureRemoteEntity(id){
  const old=multiplayer.remote.get(id);if(old?.entity)return old.entity;
  const e=primitive('Remote-'+id,'capsule',[0,1.1,0],[1,1,1],M.gold,actorRoot);
  primitive('RemoteHead-'+id,'sphere',[0,1.15,0],[.62,.62,.62],M.cloth,e);
  if(CARTOON.ready)mountAsset(e,CARTOON.warrior,'remote',{scale:.68,y:-1.1,rotY:180});
  return e;
}
function remotePlayerState(payload){
  if(!payload||payload.id===multiplayer.playerId)return;
  let r=multiplayer.remote.get(payload.id);
  if(!r){r={entity:ensureRemoteEntity(payload.id),x:Number(payload.x)||0,z:Number(payload.z)||0};multiplayer.remote.set(payload.id,r)}
  r.tx=Number(payload.x)||0;r.tz=Number(payload.z)||0;r.zone=String(payload.zone||'town');r.lv=Number(payload.lv)||1;
  r.hp=Math.max(0,Number(payload.hp)||0);r.maxHp=Math.max(1,Number(payload.maxHp)||100);r.weapon=String(payload.weapon||'맨손');r.seenAt=performance.now();
}
async function leaveMultiplayer(){
  if(multiplayer.channel){try{await multiplayer.channel.untrack()}catch{}try{await multiplayer.channel.unsubscribe()}catch{}}
  for(const r of multiplayer.remote.values())r.entity?.destroy();
  multiplayer.channel=null;multiplayer.client=null;multiplayer.connected=false;multiplayer.room='';multiplayer.remote.clear();multiplayer.presenceIds.clear();updateMultiStatus();
}
async function connectMultiplayer(rawRoom){
  const room=validMultiRoom(rawRoom);if(!room){toast('방 번호는 1~10 중 하나만 입력해');return}
  const ready=await ensureSupabase();if(!ready){toast('멀티 서버 모듈 로딩 실패');return}
  await leaveMultiplayer();multiplayer.room=room;multiplayer.joinedAt=Date.now();
  multiplayer.client=window.supabase.createClient(MULTI_SUPABASE_URL,MULTI_SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  multiplayer.channel=multiplayer.client.channel('daechung-rpg:'+room,{config:{broadcast:{self:false,ack:false},presence:{key:multiplayer.playerId}}});
  multiplayer.channel.on('presence',{event:'sync'},syncMultiPresence).on('broadcast',{event:'player-state'},({payload})=>remotePlayerState(payload)).subscribe(async status=>{
    if(status==='SUBSCRIBED'){multiplayer.connected=true;$('multiRoom').value=room;await multiplayer.channel.track({id:multiplayer.playerId,joinedAt:multiplayer.joinedAt});syncMultiPresence();updateMultiStatus('연결됨');toast('멀티 방 '+room+' 참가')}
    else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){updateMultiStatus('연결 오류');toast('멀티 연결 오류')}
  });
}
function createMultiplayerRoom(){const room=String(1+Math.floor(Math.random()*10));$('multiRoom').value=room;connectMultiplayer(room)}
function updateMultiplayer(dt){
  const now=performance.now();
  if(multiplayer.connected&&now>=multiplayer.sendAt){
    multiplayer.sendAt=now+120;const p=player.getPosition();
    multiSend('player-state',{id:multiplayer.playerId,x:p.x,z:p.z,zone:state.zone,lv:hero.lv,weapon:hero.weapon,hp:hero.hp,maxHp:hero.maxHp});
  }
  for(const [id,r] of multiplayer.remote){
    if(now-(r.seenAt||0)>5000){r.entity?.destroy();multiplayer.remote.delete(id);continue}
    const k=Math.min(1,dt*12);r.x+=(r.tx-r.x)*k;r.z+=(r.tz-r.z)*k;
    if(r.entity){r.entity.enabled=r.zone===state.zone;r.entity.setPosition(r.x,1.1,r.z)}
  }
}
$('multiBtn').onpointerdown=e=>{e.preventDefault();$('multi').style.display='flex'};
$('multiClose').onclick=()=>closeOverlay('multi');$('multiCreate').onclick=()=>createMultiplayerRoom();$('multiJoin').onclick=()=>connectMultiplayer($('multiRoom').value);$('multiLeave').onclick=()=>leaveMultiplayer();

$('dialogClose').onclick=()=>closeOverlay('dialog');$('shopClose').onclick=()=>closeOverlay('shop');$('bagClose').onclick=()=>closeOverlay('bag');
$('talk').onpointerdown=e=>{e.preventDefault();interact()};
$('bagBtn').onpointerdown=e=>{e.preventDefault();renderBag();$('bag').style.display='flex'};
function skillLabel(){
  if(hero.job==='전사')return hero.skillCd>0?'슬래시 '+Math.ceil(hero.skillCd)+'초':'슬래시';
  if(hero.job==='마법사')return hero.skillCd>0?'회복 '+Math.ceil(hero.skillCd)+'초':'자가회복';
  if(hero.job==='궁수')return '패시브';
  return '스킬';
}
function slashWave(){
  const pp=player.getPosition();
  for(const m of enemies){if(!m.alive)continue;if(m.getPosition().distance(pp)<5.2){m.hp-=hero.attack*3;if(m.hp<=0)killEnemy(m,'player')}}
}
function useJobSkill(){
  if(!state.active||hero.skillCd>0||state.stunT>0)return;
  if(hero.job==='전사'){
    hero.skillCd=10;slashWave();setTimeout(()=>{if(state.active)slashWave()},180);toast('슬래시! 3배 공격 ×2');
  }else if(hero.job==='마법사'){
    hero.skillCd=30;hero.hp=Math.min(hero.maxHp,hero.hp+100);refreshHud();toast('자가회복 +100');
  }else if(hero.job==='궁수')toast('궁수 패시브: 공격력 ×1.5 / 최대 HP ×0.7');
  else toast('Lv.5 이후 전직관에게 전직 가능');
}
$('skillBtn').onpointerdown=e=>{e.preventDefault();useJobSkill()};

const keys=new Set();addEventListener('keydown',e=>keys.add(e.key.toLowerCase()));addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
const joy={x:0,y:0,id:null},joyEl=$('joy'),knob=$('knob');
function applyJoy(x,y){const r=joyEl.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=x-cx,dy=y-cy,l=Math.hypot(dx,dy),m=42;if(l>m){dx=dx/l*m;dy=dy/l*m}joy.x=dx/m;joy.y=dy/m;knob.style.transform=`translate(${dx}px,${dy}px)`}
function stopJoy(){joy.id=null;joy.x=joy.y=0;knob.style.transform='translate(0,0)'}
joyEl.addEventListener('pointerdown',e=>{e.preventDefault();joy.id=e.pointerId;try{joyEl.setPointerCapture(e.pointerId)}catch{}applyJoy(e.clientX,e.clientY)},{passive:false});
joyEl.addEventListener('pointermove',e=>{if(e.pointerId!==joy.id)return;e.preventDefault();applyJoy(e.clientX,e.clientY)},{passive:false});
joyEl.addEventListener('pointerup',e=>{if(e.pointerId===joy.id)stopJoy()},{passive:false});joyEl.addEventListener('pointercancel',stopJoy);

$('startBtn').onclick=()=>{state.active=true;$('start').remove();refreshHud()};
$('attack').onpointerdown=e=>{
  e.preventDefault();if(!state.active||state.attackCd>0)return;state.attackCd=.42;sword.setLocalEulerAngles(0,0,-80);
  const pp=player.getPosition();let target=null,bd=3.3;
  for(const m of enemies){if(!m.alive)continue;const d=m.getPosition().distance(pp);if(d<bd){bd=d;target=m}}
  if(target){target.hp-=hero.attack;target.setLocalScale(1.55,.65,1.55);setTimeout(()=>{if(target.alive)target.setLocalScale(1.3,.85,1.3)},100);if(target.hp<=0)killEnemy(target,'player')}
  setTimeout(()=>sword.setLocalEulerAngles(0,0,-18),150);
};

function updatePortals(){
  if(state.portalCd>0)return;
  const pp=player.getPosition();
  if(state.zone==='town'){
    for(const p of portals)if(p.getPosition().distance(pp)<2.6){enterZone(p.portalId);return}
  }else if(returnPortal&&returnPortal.getPosition().distance(pp)<2.6){enterZone('town')}
}
function updateEnemies(dt){
  if(state.zone==='town')return;
  const pp=player.getPosition();
  for(const m of enemies){
    if(!m.alive)continue;m.hitCd=Math.max(0,m.hitCd-dt);m.specialCd=Math.max(0,(m.specialCd||0)-dt);
    const mp=m.getPosition(),dx=pp.x-mp.x,dz=pp.z-mp.z,d=Math.hypot(dx,dz);
    if(d<10&&d>1.8){m.translate((dx/d)*m.speed*dt,0,(dz/d)*m.speed*dt)}
    if(m.isBoss&&d<4.6&&m.specialCd<=0){
      m.specialCd=5.2;toast(m.enemyName+' · 강타 준비');
      setTimeout(()=>{if(m.alive&&state.active&&m.getPosition().distance(player.getPosition())<4.8){playerDamage(m.attack*2);toast('보스 강타!')}} ,650);
    }else if(d<=1.9&&m.hitCd<=0){m.hitCd=.9;playerDamage(m.attack)}
  }
}
function nearestAliveEnemy(pos,max=999){
  let best=null,bd=max;for(const m of enemies){if(!m.alive)continue;const d=m.getPosition().distance(pos);if(d<bd){bd=d;best=m}}return best;
}
function updateAiUsers(dt){
  for(const a of aiUsers){
    if(!a.enabled)continue;a.cool=Math.max(0,a.cool-dt);
    const inParty=party.members.has(a.aiId);
    if(state.zone==='town'){
      if(a.gold>=100&&a.weapon==='맨손'){a.weapon=a.role==='전사'?'낡은 돌검':a.role==='궁수'?'철 쌍검':'낡은 돌검';a.gold-=100}
      continue;
    }
    if(!inParty)continue;
    const pp=player.getPosition(),ap=a.getPosition();
    if(a.role==='힐러'){
      const d=ap.distance(pp);if(d>3){const dx=pp.x-ap.x,dz=pp.z-ap.z,l=Math.hypot(dx,dz)||1;a.translate(dx/l*4.2*dt,0,dz/l*4.2*dt)}
      if(hero.hp<hero.maxHp&&a.cool<=0){hero.hp=Math.min(hero.maxHp,hero.hp+18);a.cool=2;party.contrib[a.aiId]=(party.contrib[a.aiId]||0)+.5;refreshHud();updatePartyHud()}
      continue;
    }
    const target=nearestAliveEnemy(ap,12);if(!target)continue;
    const tp=target.getPosition(),dx=tp.x-ap.x,dz=tp.z-ap.z,d=Math.hypot(dx,dz)||1;
    if(d>a.range*.85)a.translate(dx/d*(a.role==='전사'?4.8:4.2)*dt,0,dz/d*(a.role==='전사'?4.8:4.2)*dt);
    if(d<=a.range&&a.cool<=0){a.cool=a.role==='궁수'?.85:.65;target.hp-=a.attack;party.contrib[a.aiId]=(party.contrib[a.aiId]||0)+1;if(target.hp<=0)killEnemy(target,a.aiId);updatePartyHud()}
  }
}
function clampPlayer(){
  const p=player.getPosition();player.setPosition(Math.max(-34,Math.min(34,p.x)),1.1,Math.max(-34,Math.min(34,p.z)));
}

buildTown();recalcStats();refreshHud();loadCartoonAssets().catch(()=>{});

app.on('update',dt=>{
  state.attackCd=Math.max(0,state.attackCd-dt);state.damageCd=Math.max(0,state.damageCd-dt);state.portalCd=Math.max(0,state.portalCd-dt);state.stunT=Math.max(0,state.stunT-dt);hero.skillCd=Math.max(0,hero.skillCd-dt);
  if(state.toastT>0){state.toastT-=dt;if(state.toastT<=0)$('toast').style.opacity='0'}
  if(state.active&&state.stunT<=0){
    let x=joy.x+(keys.has('a')?-1:0)+(keys.has('d')?1:0),z=joy.y+(keys.has('w')?-1:0)+(keys.has('s')?1:0),l=Math.hypot(x,z);
    if(l>1){x/=l;z/=l}
    if(Math.hypot(x,z)>.05){
      player.translate(x*hero.speed*dt,0,z*hero.speed*dt);player.setEulerAngles(0,Math.atan2(x,z)*180/Math.PI,0);
      state.walkT+=dt*10;player.setLocalScale(1.05,1.05+Math.sin(state.walkT)*.035,1.05);
    }else{player.setLocalScale(1.05,1.05,1.05)}
    clampPlayer();updatePortals();updateEnemies(dt);updateAiUsers(dt);updateMultiplayer(dt);
  }
  for(const p of portals)p.rotate(0,55*dt,0);if(returnPortal)returnPortal.rotate(0,55*dt,0);
  if(hero.skillCd>0)$('skillBtn').textContent=skillLabel();
  const pp=player.getPosition(),desired=new pc.Vec3(pp.x,11.5,pp.z+13.2);
  camera.setPosition(camera.getPosition().lerp(camera.getPosition(),desired,Math.min(1,dt*6)));camera.lookAt(pp.x,1.2,pp.z-1.2);
});
function resetTouchState(){stopJoy()}
addEventListener('resize',()=>app.resizeCanvas());
addEventListener('orientationchange',()=>setTimeout(()=>app.resizeCanvas(),120));
document.addEventListener('visibilitychange',()=>{if(document.hidden)resetTouchState()});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();resetTouchState();toast('그래픽 복구 중...')});
if(app.graphicsDevice&&'maxPixelRatio' in app.graphicsDevice)app.graphicsDevice.maxPixelRatio=Math.min(devicePixelRatio||1,2);
