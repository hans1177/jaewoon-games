// 파일명: qa/ocean-voyage.test.mjs
// 메인: 독립 항해게임의 거래, 항로, 전투, 저장, 외부 3D 에셋 회귀검사
import test from 'node:test';
import * as engineExports from '../web-games/ocean-voyage/engine.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {PORTS,GOODS,SAVE_KEY,newGame,serializeGame,restoreGame,priceAt,marketQuote,marketBaseStock,marketEvent,advancePortEconomy,PORT_MARKETS,cargoWeight,canDock,trade,buyUpgrade,contractOffer,takeContract,fulfillContracts,navigationRoute,setDestination,stepSea,fireCannons,CREW,EQUIPMENT,recruitCompanion,CAPTAINS,SITES,JOBS,talkCompanion,assignCrew,crewStats,resolveSeaEvent,reportDiscoveries,startExpedition,exploreChoice,investPort,portStatus,collectDividend,exportSave,importSave,SHIP_TYPES,refitShip,landAction,landEnemyTurn,finishLandBattle,CANNON_TYPES,buyCannon,PERSONAL_SKILLS,LAND_EVENTS,resolveLandEvent,revealCells,buyShipEquipment,refineShip,talkContact,giveGift,premiumInformation,relationStatus,expressBond,benchCompanion,isLand} from '../web-games/ocean-voyage/engine.mjs';

test('hotfix engine exports match main browser entry and merchant interaction is usable',()=>{
 const entry=fs.readFileSync('web-games/ocean-voyage/main.mjs','utf8');
 const list=entry.match(/import\s*\{([^}]+)\}\s*from ['"]\.\/engine\.mjs['"]/);
 assert.ok(list,'browser entry must import engine from existing path');
 const names=list[1].split(',').map(x=>x.trim());
 assert.deepEqual(names.filter(name=>!(name in engineExports)),[]);
 const s=engineExports.newGame(),merchant=s.merchants[0];
 assert.equal(engineExports.hailMerchant(s,merchant.id).ok,false,'cannot hail a distant vessel');
 const pos=engineExports.merchantPosition(merchant);
 s.ship.x=pos.x;s.ship.z=pos.z;
 const hail=engineExports.hailMerchant(s,merchant.id);
 assert.equal(hail.ok,true);assert.equal(hail.state.event.id,'merchant_meeting');
 const talked=engineExports.resolveMerchantEncounter(hail.state,1);
 assert.equal(talked.ok,true);assert.equal(talked.state.scene.kind,'merchant');
 const closed=engineExports.dismissStoryScene(talked.state);
 assert.equal(closed.ok,true);assert.equal(closed.state.scene,null);
 assert.equal(engineExports.dismissStoryScene(closed.state).ok,false);
 assert.equal(engineExports.restoreGame(engineExports.serializeGame(closed.state)).merchants[0].met,1);
});
test('separate save key, valid round trip, invalid save stays isolated',()=>{
 const s=newGame();
 assert.equal(SAVE_KEY,'jg-ocean-voyage-v1');
 assert.equal(s.version,1);
 assert.deepEqual(restoreGame(serializeGame(s)),s);
 assert.equal(restoreGame('not-json').ship.hull,100);
 assert.equal(restoreGame('{"version":999}').coins,3400);
});
test('European ports and specialty goods have finite independent prices',()=>{
 assert.equal(PORTS.length,13);assert.equal(new Set(PORTS.map(p=>p.id)).size,PORTS.length);
 assert.equal(GOODS.length,13);
 for(const p of PORTS)for(const g of GOODS){
  const buy=priceAt(p.id,g.id,2,'buy'),sell=priceAt(p.id,g.id,2,'sell');
  assert.ok(buy>sell&&sell>0);
 }
 assert.notEqual(priceAt('dawn','grain',2,'buy'),priceAt('north','grain',2,'buy'));
});
test('trade preserves economy, cargo capacity and port boundaries',()=>{
 const s=newGame();
 assert.equal(canDock(s).id,'dawn');
 const purchased=trade(s,'dawn','grain',5,'buy');
 assert.equal(purchased.ok,true);assert.equal(purchased.state.cargo.grain,5);
 assert.ok(purchased.state.coins<s.coins);assert.equal(s.cargo.grain,undefined);
 const sold=trade(purchased.state,'dawn','grain',2,'sell');
 assert.equal(sold.ok,true);assert.equal(sold.state.cargo.grain,3);
 assert.ok(sold.state.coins>purchased.state.coins);
 assert.equal(trade(s,'dawn','grain',1000,'buy').ok,false);
 assert.equal(trade(s,'dawn','grain',999,'buy').ok,false);
 assert.equal(trade(s,'dawn','grain',1,'sell').ok,false);
 assert.ok(cargoWeight(purchased.state)>0);
 const away=newGame();away.ship.x=55;assert.equal(trade(away,'dawn','grain',1,'buy').ok,false);
});
test('each European market has limited regional stock and real sale pressure',()=>{
 const s=newGame(),p='dawn',g='grain',other='porcelain';
 assert.equal(Object.keys(PORT_MARKETS).length,PORTS.length);
 assert.ok(marketBaseStock('dawn',g)>0);
 assert.equal(marketBaseStock('dawn',other),0);
 assert.equal(trade(s,p,other,1,'buy').ok,false);
 const initial=marketQuote(s,p,g),buy=trade(s,p,g,5,'buy');
 assert.equal(buy.ok,true);
 assert.equal(initial.stock-buy.state.economy[p].stock[g],5);
 assert.ok(marketQuote(buy.state,p,g).buy>initial.buy);
 const sold=trade(buy.state,p,g,2,'sell');
 assert.equal(sold.ok,true);assert.equal(sold.state.economy[p].stock[g],initial.stock-3);
 assert.equal(trade(s,p,g,60,'buy').ok,false);
 assert.deepEqual(restoreGame(serializeGame(sold.state)).economy,sold.state.economy);
});
test('economic ticks, merchant disruption and price shocks stay bounded',()=>{
 let s=newGame();s.coins=50000;
 s=trade(s,'dawn','wood',12,'buy').state;
 assert.equal(s.marketShocks.dawn.kind,'품귀');
 const expensive=marketQuote(s,'dawn','wood').buy;
 for(let n=0;n<10;n++){s.day++;advancePortEconomy(s);}
 assert.equal(s.marketShocks.dawn,undefined);
 assert.equal(s.economy.dawn.history.wood.length,7);
 assert.ok(marketQuote(s,'dawn','wood').buy<expensive);
 assert.ok(PORTS.some(p=>GOODS.some(g=>marketEvent({...s,day:4},p.id,g.id,4))));
 assert.ok(Object.values(s.economy).every(c=>Object.values(c.history).every(h=>h.length<=7)));
 assert.deepEqual(restoreGame(serializeGame(s)),s);
});
test('dock upgrades are paid, non-destructive and fleet bounded',()=>{
 const s=newGame();
 const next=buyUpgrade(s,'ship');
 assert.equal(next.ok,true);assert.equal(next.state.fleet,2);assert.equal(s.fleet,1);
 assert.equal(next.state.coins,100);
 assert.equal(buyUpgrade(next.state,'ship').ok,false);
 const away=newGame();away.ship.x=48;assert.equal(buyUpgrade(away,'provisions').ok,false);
});
test('A star route targets exact harbor and auto navigation makes progress',()=>{
 const start=newGame();
 const p=PORTS.find(x=>x.id==='coral'),route=navigationRoute(start.ship,p);
 assert.ok(route.length>=1&&route.length<=121);
 assert.deepEqual(route.at(-1),{x:p.x,z:p.z});
 let s=setDestination(start,'coral');
 assert.equal(s.destination,'coral');
 const before=Math.hypot(s.ship.x-p.x,s.ship.z-p.z);
 for(let i=0;i<45;i++)s=stepSea(s,{},1);
 assert.ok(Math.hypot(s.ship.x-p.x,s.ship.z-p.z)<before);
});
test('port discoverability, provisions and periodic economy remain stable',()=>{
 let s=newGame();
 const harbor=PORTS.find(p=>p.id==='coral');s.ship.x=harbor.x;s.ship.z=harbor.z;
 s=stepSea(s,{manual:true},.1);
 assert.ok(s.discovered.includes('coral'));
 const day=s.day;for(let i=0;i<20;i++)s=stepSea(s,{manual:true},1);
 assert.ok(s.day>day);assert.ok(s.ship.provisions<80);
});
test('broadside fire needs lateral alignment and reload; pirates damage only near',()=>{
 const s=newGame();s.ship.x=s.pirates[0].x-12;s.ship.z=s.pirates[0].z;s.ship.heading=0;
 const shot=fireCannons(s);
 assert.equal(shot.ok,true);
 assert.ok(shot.state.pirates[0].hull<s.pirates[0].hull);
 assert.ok(shot.state.ship.cooldown>0);
 assert.equal(fireCannons(shot.state).ok,false);
 const forward=newGame();forward.ship.x=forward.pirates[0].x;forward.ship.z=forward.pirates[0].z-11;forward.ship.heading=0;
 assert.equal(fireCannons(forward).ok,false);
});
test('delivery contracts require matching port and enough cargo',()=>{
 const initial=newGame();
 const accepted=takeContract(initial,'dawn');
 assert.equal(accepted.ok,true);
 const q=contractOffer(initial,'dawn');
 assert.equal(accepted.state.quests[0].target,q.target);
 const at=structuredClone(accepted.state),p=PORTS.find(x=>x.id===q.target);
 at.ship.x=p.x;at.ship.z=p.z;at.cargo[q.good]=q.count;
 const done=fulfillContracts(at);
 assert.equal(done.ok,true);assert.equal(done.state.quests.length,0);
 assert.equal(done.state.cargo[q.good],0);
 assert.equal(done.state.coins,at.coins+q.reward);
});
test('legacy Kenney GLB sources are preserved while pixel renderer uses geography',()=>{
 const names=['ship-medium','ship-small','ship-large','ship-pirate-medium','ship-pirate-small','structure-platform-dock','structure','palm-detailed-straight','patch-sand','cannon','chest'];
 for(const name of names){
  const filename='web-games/ocean-voyage/assets/'+name+'.glb';
  assert.ok(fs.existsSync(filename),filename);
  const data=fs.readFileSync(filename);
  assert.equal(data.subarray(0,4).toString(),'glTF',filename);
  assert.ok(data.length>10000,filename);
 }
 const html=fs.readFileSync('web-games/ocean-voyage/index.html','utf8');
 const render=fs.readFileSync('web-games/ocean-voyage/ocean3d.mjs','utf8');
 assert.match(html,/viewport-fit=cover/);
 assert.match(html,/id="joystickRim"/);
 assert.match(html,/id="joystickHandle"/);
 assert.match(render,/drawGeography/);assert.match(render,/drawFog/);
 assert.doesNotMatch(render,/new THREE\.BoxGeometry/);
});


test('European story starts London with captain and event-recruited companions',()=>{
 const s=newGame();
 assert.equal(PORTS[0].name,'런던');
 assert.equal(PORTS[1].name,'플리머스');
 assert.equal(canDock(s).name,'런던');
 assert.equal(s.captain,'엘리너 그레이');
 assert.deepEqual(s.crewRoster,['eleanor']);assert.equal(CAPTAINS.length,8);
 assert.equal(s.equipment.telescope,1);
 assert.ok(CREW.length>=6);
 assert.ok(EQUIPMENT.length>=5);
 assert.deepEqual(restoreGame(serializeGame(s)),s);
});
test('regional officers only join through their home-port tavern and persist',()=>{
 const start=newGame();
 assert.equal(recruitCompanion(start,'isabel').ok,false);
 const lisbon=structuredClone(start),p=PORTS.find(p=>p.id==='gold');
 lisbon.ship.x=p.x;lisbon.ship.z=p.z;
 lisbon.cargo.spice=2;const talked=talkCompanion(talkCompanion(lisbon,'isabel').state,'isabel').state;const joined=recruitCompanion(talked,'isabel');
 assert.equal(joined.ok,true);assert.ok(joined.state.crewRoster.includes('isabel'));
 assert.equal(joined.state.crewRoster.length,2);
 assert.equal(lisbon.crewRoster.length,1);
 assert.equal(recruitCompanion(joined.state,'isabel').ok,false);
 assert.ok(restoreGame(serializeGame(joined.state)).crewRoster.includes('isabel'));
});
test('analogue helm changes heading and inertia persists after stick release',()=>{
 const s=newGame(),moved=stepSea(s,{turn:.7,throttle:1,manual:true},.6);
 assert.ok(moved.ship.heading>s.ship.heading);
 assert.ok(moved.ship.velocity>0);
 assert.ok(moved.ship.x!==s.ship.x||moved.ship.z!==s.ship.z);
 const release=stepSea(moved,{turn:0,throttle:0,manual:true},.2);
 assert.ok(release.ship.velocity>0&&release.ship.velocity<moved.ship.velocity);
 assert.equal(s.ship.velocity,0);
});
test('mobile pixel interface has inventory, joystick and independent scene audio',()=>{
 const html=fs.readFileSync('web-games/ocean-voyage/index.html','utf8'),main=fs.readFileSync('web-games/ocean-voyage/main.mjs','utf8');
 for(const id of ['joystickRim','joystickHandle','captains','seaEvent','townbar'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(html,/data-panel="inventory"/);assert.match(main,/joystick.setPointerCapture/);assert.match(main,/createOscillator/);
 assert.doesNotMatch(html,/cdn.jsdelivr.net/);
});

test('all 15 imported CC0 media files are original SHA1-verified real binaries, not placeholders',()=>{
 const manifest=JSON.parse(fs.readFileSync('web-games/ocean-voyage/assets/cc0/manifest.json','utf8'));
 assert.equal(manifest.license,'CC0-1.0');
 assert.equal(manifest.assets.length,15);
 const paths=new Set();
 for(const item of manifest.assets){
  assert.ok(!paths.has(item.path),'duplicate '+item.path);paths.add(item.path);
  const file='web-games/ocean-voyage/assets/cc0/'+item.path;
  assert.ok(fs.existsSync(file),file);
  const bytes=fs.readFileSync(file);
  assert.equal(bytes.length,item.bytes,file);
  const gitHash=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  assert.equal(gitHash,item.gitBlobSha1,file);
  if(file.endsWith('.png'))assert.equal(bytes.subarray(1,4).toString(),'PNG',file);
  if(file.endsWith('.ogg'))assert.equal(bytes.subarray(0,4).toString(),'OggS',file);
  assert.equal(item.license,'CC0-1.0');
  assert.ok(item.sourceUrl.startsWith('https://'));
 }
 const portraits=fs.readFileSync('web-games/ocean-voyage/assets/cc0/portraits/rpgportraits.png');
 assert.equal(portraits.readUInt32BE(16),328);
 assert.equal(portraits.readUInt32BE(20),112);
});
test('geography and original portrait atlases are local and valid',()=>{
 for(const name of ['captains','crew','harbor','innkeepers']){const b=fs.readFileSync('web-games/ocean-voyage/assets/'+name+'.webp');assert.equal(b.subarray(0,4).toString(),'RIFF');assert.equal(b.subarray(8,12).toString(),'WEBP');assert.ok(b.length>20000);}
 const land=fs.readFileSync('web-games/ocean-voyage/assets/world.mjs','utf8');assert.match(land,/Natural Earth/);assert.ok(land.length>100000);
});

test('푸른항로 has no inherited asset launcher; game-authored scripts can be deployed unchanged',()=>{
 const ocean=fs.readFileSync('web-games/ocean-voyage/index.html','utf8');
 const builder=fs.readFileSync('.github/workflows/magic-forest-pages.yml','utf8');
 const owner=fs.readFileSync('.github/workflows/owner-fast-pages-publish.yml','utf8');

 // Original game HTML does not request the developer inspector.
 assert.doesNotMatch(ocean,/vibe-runtime-panel\.js/);
 // No build-time injection or silent removal of game-authored functionality.
 assert.doesNotMatch(builder,/const tag='<script defer src="\/jaewoon-games\/assets\/vibe-runtime-panel\.js"/);
 assert.doesNotMatch(builder,/withoutInspector=html\.replace/);
 assert.doesNotMatch(owner,/const clean=html\.replace|PUBLIC_ASSET_INSPECTOR_STILL_PRESENT/);
 assert.match(owner,/OWNER_PAGES_GAME_OWNED_HTML=UNCHANGED/);

 // Ship, port, and pirate assets are real GLB models bound to a 3D scene.
 const scene=fs.readFileSync('web-games/ocean-voyage/ocean3d.mjs','utf8');
 assert.match(scene,/createOceanView/);assert.match(scene,/state.charted/);
});

test('CC0 sea music checkout retains the actual Git binary without LFS pointer conversion',()=>{
 const rules=fs.readFileSync('.gitattributes','utf8').split(/\r?\n/);
 assert.ok(rules.includes('*.ogg filter=lfs diff=lfs merge=lfs -text'),'generic audio LFS policy remains');
 assert.ok(rules.includes('web-games/ocean-voyage/assets/cc0/music/pirate_ship_in_game.ogg -filter -diff -merge -text'),'original Git OGG remains exempt from LFS');
});


test('eight regional protagonists retain all five origin regions and start in distinct European ports',()=>{
 assert.equal(new Set(CAPTAINS.map(c=>c.region)).size,5);assert.equal(new Set(CAPTAINS.map(c=>c.port)).size,8);
 for(const c of CAPTAINS){const s=newGame(c.id);assert.equal(canDock(s).id,c.port);assert.equal(restoreGame(serializeGame(s)).captainId,c.id);}
});
test('fog survives save copy and damaged export is rejected',()=>{
 let s=setDestination(newGame(),'coral');s.pirates=[];
 for(let i=0;i<2000&&s.destination;i++){if(s.event)s=resolveSeaEvent(s,1).state;s=stepSea(s,{},.1);}
 assert.equal(s.destination,null);assert.ok(s.exploreTarget==='coral');for(const point of navigationRoute(newGame().ship,PORTS.find(p=>p.id==='coral'))){s.ship.x=point.x;s.ship.z=point.z;s=stepSea(s,{manual:true},.001);}assert.equal(canDock(s).id,'coral');assert.ok(s.charted.length>9);assert.deepEqual(importSave(exportSave(s)).charted,s.charted);assert.equal(importSave(exportSave(s)+'x'),null);
});
test('relic report reward is paid once and discovery stays in inventory',()=>{
 let s=newGame('amani');s.clearedCamps.push('roman');s=startExpedition(s,'roman').state;const site=SITES.find(t=>t.id==='roman');for(const choice of site.answers){if(s.expedition.event)s=resolveLandEvent(s,1).state;s=exploreChoice(s,choice).state;}
 const before=s.coins,r=reportDiscoveries(s);assert.equal(r.ok,true);assert.equal(r.state.coins,before+site.reward);assert.equal(reportDiscoveries(r.state).ok,false);assert.equal(r.state.equipment.roman,1);
});
test('companion scenes and objective precede recruitment; role assignment is unique and grows',()=>{
 let s=newGame();assert.equal(recruitCompanion(s,'thomas').ok,false);s.discovered.push('coral');s=talkCompanion(talkCompanion(s,'thomas').state,'thomas').state;s=recruitCompanion(s,'thomas').state;
 s=assignCrew(s,'sailing','thomas').state;s=assignCrew(s,'navigator','thomas').state;assert.equal(s.assignments.sailing,'');assert.equal(s.assignments.navigator,'thomas');s.xp+=360;assert.equal(crewStats(s,'thomas').level,3);assert.equal(restoreGame(serializeGame(s)).assignments.navigator,'thomas');
});
test('port investment is bounded by funds and duplicate dividends are rejected',()=>{
 let s=newGame();const original=s.coins;s=investPort(s,1000).state;assert.equal(s.coins,original-1000);assert.equal(portStatus(s,'dawn').invested,1000);assert.equal(collectDividend(s).ok,false);s.day+=7;s=collectDividend(s).state;assert.ok(s.coins>original-1000);assert.equal(collectDividend(s).ok,false);
});
test('equipment upgrade caps preserve ship economy',()=>{
 let s=newGame();s.coins=100000;for(const kind of ['plating','hold','rudder','hull']){for(let i=0;i<3;i++){const r=buyUpgrade(s,kind);assert.equal(r.ok,true);s=r.state;}assert.equal(buyUpgrade(s,kind).ok,false);}assert.equal(s.ship.armor,3);assert.equal(s.ship.cargoLimit,96);assert.equal(s.ship.maxHull,190);assert.equal(s.ship.rudderLevel,3);
});

test('national ship traditions require local shipyard and have distinct cargo and combat designs',()=>{
 const national=SHIP_TYPES.filter(t=>t.nation);assert.equal(national.length,6);let s=newGame();s.coins=100000;assert.equal(refitShip(s,'portugal-caravel').ok,false);const p=PORTS.find(p=>p.id==='gold');s.ship.x=p.x;s.ship.z=p.z;const bought=refitShip(s,'portugal-caravel');assert.equal(bought.ok,true);assert.equal(bought.state.shipType,'portugal-caravel');assert.ok(SHIP_TYPES.find(t=>t.id==='dutch-fluyt').cargo>SHIP_TYPES.find(t=>t.id==='french-frigate').cargo);assert.ok(SHIP_TYPES.find(t=>t.id==='iberian-galleon').hull>SHIP_TYPES.find(t=>t.id==='portugal-caravel').hull);
});

test('sustained raids can change port control while preserving facilities and investments',()=>{
 let s=newGame();s.pirates=[];const owners=Object.fromEntries(PORTS.map(p=>[p.id,p.faction]));for(let day=1;day<=50;day++){s.day=day;s.elapsed=15.99;s=stepSea(s,{},.02);}assert.ok(PORTS.some(p=>portStatus(s,p.id).owner!==owners[p.id]));assert.equal(s.worldLog.length<=20,true);assert.equal(PORTS.length,13);
});

test('land battle alternates party and enemy turns and unlocks exploration without duplicate reward',()=>{
 let s=newGame('amani');s=startExpedition(s,'roman').state;assert.equal(s.landBattle.phase,'player');assert.equal(exploreChoice(s,0).ok,false);assert.equal(fireCannons(s).ok,false);let guard=0;for(let i=0;i<50&&s.landBattle.phase!=='won';i++){if(s.landBattle.phase==='enemy')s=landEnemyTurn(s).state;else s=landAction(s,'attack',s.landBattle.enemies.findIndex(e=>e.hp>0)).state;guard++;}assert.ok(guard>0);assert.equal(s.landBattle.phase,'won');assert.ok(s.clearedCamps.includes('roman'));const before=s.coins;assert.equal(landAction(s,'attack',0).ok,false);s=finishLandBattle(s).state;assert.equal(s.landBattle,null);assert.equal(s.coins,before);assert.equal(exploreChoice(s,0).ok,true);
});
test('land battle retreat preserves crew, items and resumable save phase',()=>{
 let s=newGame('samira');s=startExpedition(s,'lagoon').state;const saved=restoreGame(serializeGame(s));assert.equal(saved.landBattle.siteId,'lagoon');s=landAction(saved,'retreat').state;assert.equal(s.landBattle.phase,'retreated');assert.equal(s.expedition,null);assert.deepEqual(s.crewRoster,['samira']);s=finishLandBattle(s).state;assert.equal(s.landBattle,null);
});

test('cannon grades change range, reload and projectile identity without losing port count',()=>{
 let s=newGame();s.coins=10000;const before=s.ship.cannons;s=buyCannon(s,'culverin').state;assert.equal(s.ship.cannons,before);s.pirates=[{id:1,x:s.ship.x+38,z:s.ship.z,hull:500,maxHull:500,cooldown:8}];const hit=fireCannons(s);assert.equal(hit.ok,true);assert.equal(hit.state.ship.cooldown,4.3);assert.equal(hit.state.combatFx.gun,'culverin');assert.equal(hit.state.combatFx.speed,200);s.ship.cannonType='bronze';assert.equal(fireCannons(s).ok,false);assert.equal(CANNON_TYPES.length,4);
});
test('personal skill names are distinct and land consumables are actually spent',()=>{
 assert.equal(new Set(Object.values(PERSONAL_SKILLS).map(s=>s.name)).size,12);let s=startExpedition(newGame('samira'),'lagoon').state;s.landBattle.party[0].hp=15;const count=s.supplies.medicine;s=landAction(s,'medicine',0).state;assert.equal(s.supplies.medicine,count-1);assert.ok(s.landBattle.party[0].hp>15);let next=startExpedition(newGame('samira'),'lagoon').state;next.landBattle.party[0].focus=0;next=landAction(next,'rations',0).state;assert.equal(next.supplies.rations,2);assert.equal(next.landBattle.party[0].focus,12);
});

test('charted sea routes sail automatically while unknown routes stop at exploration frontier',()=>{
 const start=newGame(),p=PORTS.find(p=>p.id==='coral');let first=setDestination(start,p.id);assert.equal(first.autoMode,'frontier');assert.equal(first.exploreTarget,p.id);let known=structuredClone(start);known.discovered.push(p.id);for(const point of navigationRoute(start.ship,p))known.charted=revealCells(known.charted,point.x,point.z);known=setDestination(known,p.id);assert.equal(known.autoMode,'known');assert.equal(known.exploreTarget,null);for(let i=0;i<2000&&known.destination;i++){if(known.event)known=resolveSeaEvent(known,1).state;known=stepSea(known,{},.1);}assert.equal(canDock(known).id,p.id);
});
test('land event requires a choice and resolves once without blocking the next exploration step',()=>{
 let s=newGame('amani');s.clearedCamps.push('roman');s=startExpedition(s,'roman').state;s=exploreChoice(s,0).state;s=exploreChoice(s,0).state;assert.ok(LAND_EVENTS.some(e=>e.id===s.expedition.event));assert.equal(exploreChoice(s,1).ok,false);s=resolveLandEvent(s,1).state;assert.equal(s.expedition.eventResolved,true);assert.equal(resolveLandEvent(s,1).ok,false);assert.equal(exploreChoice(s,1).ok,true);
});

test('regional equipment and custom shipyard upgrades preserve capacity when refitting',()=>{
 let s=newGame('amani');s.coins=50000;assert.equal(buyShipEquipment(s,'sail','broadcloth').ok,false);s=buyShipEquipment(s,'sail','lateen').state;s=buyShipEquipment(s,'figurehead','dolphin').state;assert.equal(s.ship.gear.sail,'lateen');assert.equal(s.ship.gear.figurehead,'dolphin');const p=PORTS.find(p=>p.id==='jade');s.ship.x=p.x;s.ship.z=p.z;s=refineShip(s,'dutch-hold').state;assert.equal(s.ship.cargoLimit,54);assert.equal(refineShip(s,'dutch-hold').ok,false);s=refitShip(s,'cog').state;assert.equal(s.ship.cargoLimit,97);assert.equal(restoreGame(serializeGame(s)).ship.gear.figurehead,'dolphin');
});
test('tavern dialogue and gifts have daily limits and high-trust information is saved once',()=>{
 let s=newGame('samira');const coins=s.coins;s=talkContact(s,'florence').state;s=giveGift(s,'florence','book').state;assert.equal(s.coins,coins-140);assert.equal(relationStatus(s,'florence').trust,16);assert.equal(giveGift(s,'florence','brooch').ok,false);assert.equal(talkContact(s,'florence').ok,false);for(let i=0;i<2;i++){s.day++;s=talkContact(s,'florence').state;s=giveGift(s,'florence','book').state;}assert.equal(relationStatus(s,'florence').trust,48);s=premiumInformation(s,'florence').state;assert.equal(s.treasureClues.length,1);assert.equal(premiumInformation(s,'florence').ok,false);assert.equal(restoreGame(serializeGame(s)).tavernRelations.florence.trust,48);
});
test('rare city companion requires trust, discovery and story; reserve keeps growth',()=>{
 let s=newGame('samira');s=talkCompanion(talkCompanion(s,'florence').state,'florence').state;assert.equal(recruitCompanion(s,'florence').ok,false);s.reported.push('lagoon');s.tavernRelations.florence={trust:40};s=recruitCompanion(s,'florence').state;assert.ok(s.crewRoster.includes('florence'));s=assignCrew(s,'doctor','florence').state;s.xp+=360;const level=crewStats(s,'florence').level;s=benchCompanion(s,'florence').state;assert.ok(s.reserveCrew.includes('florence'));assert.equal(s.assignments.doctor,'');s=recruitCompanion(s,'florence').state;assert.equal(crewStats(s,'florence').level,level);s.tavernRelations.florence.trust=80;assert.equal(expressBond(s,'florence').ok,false);s.completedStories.push('samira-0');s=expressBond(s,'florence').state;assert.equal(s.tavernRelations.florence.bond,true);
});
test('new and restored national patrols stay on water and imported relation markup is normalized',()=>{
 const s=newGame('samira');assert.ok(s.pirates.every(p=>!isLand(p.x,p.z)));s.pirates.find(p=>p.id===12).x=39;s.pirates.find(p=>p.id===12).z=-546;s.tavernRelations.florence={trust:'<img src=x>',lastTalk:'bad'};s.portState.venice={prosperity:'<script>',owner:'bad'};s.captain='<img>';const r=restoreGame(serializeGame(s));assert.ok(!isLand(r.pirates.find(p=>p.id===12).x,r.pirates.find(p=>p.id===12).z));assert.equal(r.tavernRelations.florence.trust,0);assert.equal(typeof r.portState.venice.prosperity,'number');assert.equal(r.captain,'사미라 알자흐라');
});
