// 파일명: qa/ocean-voyage.test.mjs
// 메인: 독립 항해게임의 거래, 항로, 전투, 저장, 외부 3D 에셋 회귀검사
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PORTS,GOODS,SAVE_KEY,newGame,serializeGame,restoreGame,priceAt,cargoWeight,canDock,trade,buyUpgrade,contractOffer,takeContract,fulfillContracts,navigationRoute,setDestination,stepSea,fireCannons,CREW,EQUIPMENT,recruitCompanion} from '../web-games/ocean-voyage/engine.mjs';

test('separate save key, valid round trip, invalid save stays isolated',()=>{
 const s=newGame();
 assert.equal(SAVE_KEY,'jg-ocean-voyage-v1');
 assert.equal(s.version,1);
 assert.deepEqual(restoreGame(serializeGame(s)),s);
 assert.equal(restoreGame('not-json').ship.hull,100);
 assert.equal(restoreGame('{"version":999}').coins,3400);
});
test('eight distinct ports and six independently priced goods',()=>{
 assert.equal(PORTS.length,8);assert.equal(new Set(PORTS.map(p=>p.id)).size,PORTS.length);
 assert.equal(GOODS.length,6);
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
 s.ship.x=70;s.ship.z=-45;
 s=stepSea(s,{manual:true},.1);
 assert.ok(s.discovered.includes('coral'));
 const day=s.day;for(let i=0;i<20;i++)s=stepSea(s,{manual:true},1);
 assert.ok(s.day>day);assert.ok(s.ship.provisions<80);
});
test('broadside fire needs lateral alignment and reload; pirates damage only near',()=>{
 const s=newGame();s.ship.x=51;s.ship.z=4;s.ship.heading=0;
 const shot=fireCannons(s);
 assert.equal(shot.ok,true);
 assert.ok(shot.state.pirates[0].hull<s.pirates[0].hull);
 assert.ok(shot.state.ship.cooldown>0);
 assert.equal(fireCannons(shot.state).ok,false);
 const forward=newGame();forward.ship.x=63;forward.ship.z=-7;forward.ship.heading=0;
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
test('all rendered ship, dock and harbor GLB assets are real Kenney CC0 sources',()=>{
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
 assert.match(html,/data-hold="left"/);
 assert.match(html,/data-hold="right"/);
 assert.match(render,/GLTFLoader/);
 assert.doesNotMatch(render,/new THREE\.BoxGeometry/);
});


test('Britain 1590 campaign starts London with two officers and separated inventory',()=>{
 const s=newGame();
 assert.equal(PORTS[0].name,'런던');
 assert.equal(PORTS[1].name,'플리머스');
 assert.equal(canDock(s).name,'런던');
 assert.equal(s.captain,'엘리너 그레이');
 assert.deepEqual(s.crewRoster,['eleanor','thomas']);
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
 const joined=recruitCompanion(lisbon,'isabel');
 assert.equal(joined.ok,true);assert.ok(joined.state.crewRoster.includes('isabel'));
 assert.equal(joined.state.crewRoster.length,3);
 assert.equal(lisbon.crewRoster.length,2);
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
test('CC0-only external asset references and functional UK-era voyage UI',()=>{
 const html=fs.readFileSync('web-games/ocean-voyage/index.html','utf8');
 const main=fs.readFileSync('web-games/ocean-voyage/main.mjs','utf8');
 assert.match(html,/id="joystickRim"/);
 assert.match(html,/id="joystickHandle"/);
 assert.match(html,/Kenney CC0/);
 assert.match(html,/data-panel="inventory"/);
 assert.match(html,/data-panel="crew"/);
 assert.match(html,/data-panel="port"/);
 assert.match(html,/opengameart\.org\/sites\/default\/files\/pirate_ship_in_game\.ogg/);
 assert.match(main,/recruitCompanion/);
 assert.match(main,/music\.play\(\)/);
 assert.match(main,/crowded_pub_2025\.ogg/);
 assert.match(main,/joystick\.setPointerCapture/);
 assert.match(html,/opengameart\.org\/sites\/default\/files\/rpgportraits\.png/);
});
