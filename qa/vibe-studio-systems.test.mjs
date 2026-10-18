import test from 'node:test';
import assert from 'node:assert/strict';
import {lineOfSight,makeThreatTable,makeCombatDirector,makeBossPhases,makeCombatMemory,chooseTacticalAction,predictProjectile,makeStaggerMeter,makeCooldownBook,chooseCover,makeCombatEncounter} from '../assets/vibe-studio-combat.js';
import {makeChunkIndex,makeResidencyController,makeObjectPool,makeFrameBudget,makeLodController,makeAssetBudget,makeOriginRebaser,makePerformanceHistogram} from '../assets/vibe-studio-world.js';
import {makeLocomotionGraph,makeAttackTimeline,makeAnimationEventQueue,makeFootPlant,makeLookAtRig,makeHitReaction,makeCameraResponse,makeAnimationBudget,makePoseInterpolator} from '../assets/vibe-studio-animation.js';
import {makeCommandRouter,makeTransactionCoordinator,makeEventJournal,makeStateInvariantGuard,makeInventoryLedger,makeQuestTracker,makeCausalTrace,makeRevisionedState,makeNetworkAuthorityGate,makeCrossSystemScenario} from '../assets/vibe-studio-integration.js';

test('occlusion blocks combat perception',()=>{
 assert.equal(lineOfSight({x:0,y:0},{x:10,y:0},[{a:{x:5,y:-1},b:{x:5,y:1}}]),false);
 assert.equal(lineOfSight({x:0,y:0},{x:10,y:0},[{a:{x:5,y:2},b:{x:5,y:3}}]),true);
});
test('threat ranking decays deterministically',()=>{
 const t=makeThreatTable({decayPerSecond:1});
 t.add('a',5,0);t.add('b',8,0);
 assert.equal(t.rank()[0].id,'b');
 t.decay(8);assert.deepEqual(t.rank(),[]);
});
test('combat director prevents simultaneous dogpiles',()=>{
 const d=makeCombatDirector({maxSimultaneousAttackers:2,attackReservationMs:100});
 assert.equal(d.request({attackerId:'a',targetId:'p',now:0}),true);
 assert.equal(d.request({attackerId:'b',targetId:'p',now:0}),true);
 assert.equal(d.request({attackerId:'c',targetId:'p',now:0}),false);
 assert.equal(d.request({attackerId:'c',targetId:'p',now:101}),true);
});
test('boss phase transitions use health thresholds',()=>{
 const b=makeBossPhases([{id:'one',threshold:.7},{id:'two',threshold:.3},{id:'three',threshold:0}]);
 assert.equal(b.update({health:90,maxHealth:100}).phase.id,'one');
 assert.equal(b.update({health:50,maxHealth:100}).phase.id,'two');
 assert.equal(b.update({health:10,maxHealth:100}).phase.id,'three');
 assert.equal(b.transitionCount,2);
});
test('combat memory expires old observations',()=>{
 const m=makeCombatMemory({forgetAfterSeconds:2});
 m.record({time:0,type:'HIT',target:'hero'});
 assert.equal(m.query({now:1,type:'HIT'}).length,1);
 assert.equal(m.query({now:3,type:'HIT'}).length,0);
});
test('tactical decision chooses attack or retreat',()=>{
 const self={x:0,y:0},target={id:'p',x:1,y:0};
 assert.equal(chooseTacticalAction({self,target}).action,'ATTACK');
 assert.equal(chooseTacticalAction({self,target,healthRatio:.1,retreatPoints:[{x:-5,y:0}]}).action,'RETREAT');
});
test('projectile leading is finite and bounded',()=>{
 const aim=predictProjectile({origin:{x:0,y:0},target:{x:10,y:0},targetVelocity:{x:1,y:0},speed:10});
 assert.ok(aim.time>1);assert.ok(aim.aim.x>10);
 assert.equal(predictProjectile({origin:{x:0,y:0},target:{x:10,y:0},speed:0}),null);
});
test('stagger immunity prevents repeated instant stuns',()=>{
 const s=makeStaggerMeter({threshold:10,immunitySeconds:1});
 assert.equal(s.hit({amount:10,now:0}).staggered,true);
 assert.equal(s.hit({amount:10,now:.1}).staggered,false);
 assert.equal(s.hit({amount:10,now:1.1}).staggered,true);
});
test('cooldowns reject early reuse',()=>{
 const c=makeCooldownBook();
 assert.equal(c.use('dash',0,2),true);
 assert.equal(c.use('dash',1,2),false);
 assert.equal(c.remaining('dash',1),1);
 assert.equal(c.use('dash',2,2),true);
});
test('encounter capacity remains bounded',()=>{
 const e=makeCombatEncounter({maxActive:2,reinforcementCooldown:3});
 assert.equal(e.enter('a'),true);assert.equal(e.enter('b'),true);
 assert.equal(e.enter('c'),false);e.leave('a');
 assert.equal(e.reinforce('c',3),true);
 assert.equal(e.snapshot().remaining,0);
});
test('chunk index supports negative world coordinates',()=>{
 const index=makeChunkIndex({chunkSize:10});
 assert.deepEqual(index.at({x:-1,z:-10}),{x:-1,z:-1});
 assert.equal(index.neighbors({x:0,z:0},1).length,9);
});
test('residency caps async loads and unloads far regions',async()=>{
 let unloaded=0;
 const r=makeResidencyController({chunkSize:10,loadRadius:1,unloadRadius:1,maxChunks:4,maxLoadsPerTick:2,load:async row=>row.key,unload:async()=>{unloaded++;}});
 assert.equal((await r.update({players:[{x:0,z:0}]})).started,2);
 await r.settle();assert.equal(r.activeCount,2);
 await r.update({players:[{x:100,z:100}]});await r.settle();
 assert.ok(unloaded>=2);assert.ok(r.activeCount<=4);
 await r.clear();assert.equal(r.activeCount,0);
});
test('object pool reuses released objects',()=>{
 let count=0;const p=makeObjectPool({create:()=>({id:++count})});
 const a=p.acquire();assert.equal(p.release(a),true);
 const b=p.acquire();assert.strictEqual(a,b);assert.equal(count,1);
});
test('frame budget reacts to slow frames',()=>{
 const b=makeFrameBudget({targetMs:16,smoothing:1});
 b.observe(40);assert.equal(b.quality(),'LOW');
 b.observe(10);assert.equal(b.quality(),'HIGH');
});
test('LOD hysteresis avoids threshold oscillation',()=>{
 const l=makeLodController({thresholds:[10],hysteresis:2});
 assert.equal(l.choose('npc',13),1);
 assert.equal(l.choose('npc',11),1);
 assert.equal(l.choose('npc',7),0);
});
test('asset budget evicts least recently used non-pinned asset',()=>{
 const b=makeAssetBudget({maxBytes:10});
 b.register('a',6);b.register('b',4);b.touch('a');b.register('c',4);
 assert.deepEqual(b.snapshot().assets.map(x=>x.id).sort(),['a','c']);
});
test('world origin rebase preserves global coordinates',()=>{
 const o=makeOriginRebaser({threshold:100});
 const shift=o.update({x:120,y:0,z:0});
 assert.equal(shift.shift.x,120);
 assert.equal(o.global({x:0,y:0,z:0}).x,120);
});
test('performance histogram refuses missing evidence',()=>{
 const p=makePerformanceHistogram({capacity:2});
 assert.equal(p.report().frameP99,null);
 p.frame(10);p.frame(20);p.frame(30);p.heap(100);
 assert.equal(p.report().frameP99,30);assert.equal(p.report().samples,2);
});
test('locomotion graph smooths velocity',()=>{
 const a=makeLocomotionGraph();
 const p=a.update({dt:.05,desiredSpeed:6,desiredHeading:1});
 assert.ok(p.speed>0&&p.speed<6);
 assert.ok(p.weights.run>=0);
});
test('attack timeline emits hit marker once',()=>{
 const a=makeAttackTimeline({windup:.2,active:.2,recovery:.2,hitMarkers:[.1]});
 assert.equal(a.start(0),true);
 assert.equal(a.update(.1).phase,'WINDUP');
 assert.equal(a.update(.31).events.length,1);
 assert.equal(a.update(.32).events.length,0);
 assert.equal(a.update(.61).phase,'IDLE');
});
test('animation event queue orders events and deduplicates IDs',()=>{
 const q=makeAnimationEventQueue();
 q.schedule({id:'b',at:2,type:'HIT'});q.schedule({id:'a',at:1,type:'STEP'});
 assert.deepEqual(q.drain(2).map(x=>x.id),['a','b']);
 assert.equal(q.schedule({id:'a',at:3,type:'STEP'}),false);
});
test('foot plant emits grounded contacts',()=>{
 const f=makeFootPlant();
 assert.equal(f.update({phase:.1,speed:2,grounded:false}).length,0);
 assert.equal(f.update({phase:.6,speed:2,grounded:true}).length,1);
});
test('look-at rig respects yaw and pitch limits',()=>{
 const r=makeLookAtRig({maxYaw:.5,maxPitch:.2,followRate:100});
 const p=r.update({dt:.1,origin:{x:0,y:0,z:0},target:{x:10,y:10,z:0}});
 assert.ok(Math.abs(p.yaw)<=.5);assert.ok(Math.abs(p.pitch)<=.2);
});
test('hit reaction decays after impact',()=>{
 const h=makeHitReaction({duration:.5});
 h.hit({now:1,damage:20});
 assert.equal(h.update(1.1).active,true);
 assert.equal(h.update(2).active,false);
});
test('camera trauma fades without permanent shake',()=>{
 const c=makeCameraResponse({decay:2});
 c.impulse(.8);assert.ok(c.update(.1,0).trauma>0);
 assert.equal(c.update(1,1).trauma,0);
});
test('animation budget culls distant actors',()=>{
 const b=makeAnimationBudget({maxFullRate:1,maxHalfRate:2,near:10,far:30});
 const rows=b.classify([{id:'a',x:1,z:0},{id:'b',x:20,z:0},{id:'c',x:100,z:0}],{x:0,z:0});
 assert.deepEqual(rows.map(x=>x.rate),['FULL','HALF','CULL']);
});
test('pose interpolation does not extrapolate across large gaps',()=>{
 const p=makePoseInterpolator({maxGap:.2});
 p.push({time:0,x:0,y:0,z:0,yaw:0});
 assert.equal(p.sample(.5,{time:1,x:10}).x,0);
 assert.equal(p.sample(.05,{time:.1,x:10}).x,5);
});
test('command router rejects unauthenticated calls and deduplicates accepted IDs',async()=>{
 let calls=0;
 const router=makeCommandRouter({authorize:(c,ctx)=>ctx.owner===c.actorId,handlers:{pickup:async()=>({ok:true,value:++calls})}});
 const command={id:'one',type:'pickup',actorId:'hero'};
 assert.equal((await router.execute(command,{owner:'other'})).reason,'UNAUTHORIZED');
 assert.equal((await router.execute(command,{owner:'hero'})).value,1);
 assert.equal((await router.execute(command,{owner:'hero'})).value,1);
 assert.equal(calls,1);
});
test('transaction coordinator rolls back on invariant failure',async()=>{
 let state={coins:10};
 const t=makeTransactionCoordinator({capture:()=>({...state}),restore:old=>{state=old;},validate:()=>state.coins>=0});
 const result=await t.run([()=>{state.coins=-1;return{ok:true};}]);
 assert.equal(result.ok,false);assert.equal(state.coins,10);
});
test('event journal replays only selected tick window',()=>{
 const j=makeEventJournal();
 j.append({id:'a',type:'COIN',tick:1,amount:1});
 j.append({id:'b',type:'COIN',tick:2,amount:2});
 assert.equal(j.replay((n,e)=>n+e.amount,0,{fromTick:2}),2);
});
test('state invariant guard captures failing rules',()=>{
 const g=makeStateInvariantGuard({checks:[{id:'hp',check:s=>s.hp>=0}]});
 assert.equal(g.check({hp:-1}).ok,false);
 assert.equal(g.check({hp:5}).ok,true);
});
test('inventory rejects negative quantities and overflow',()=>{
 const i=makeInventoryLedger({capacity:3,stackLimit:2});
 assert.equal(i.add('wood',2),true);assert.equal(i.add('wood',1),false);
 assert.equal(i.remove('wood',-1),false);assert.equal(i.remove('wood',1),true);
});
test('quest tracker completes after required events',()=>{
 const q=makeQuestTracker({definitions:[{id:'hunt',event:'KILL',target:2}]});
 q.record('KILL');assert.equal(q.get('hunt').completed,false);
 q.record('KILL');assert.equal(q.get('hunt').completed,true);
});
test('causal trace follows parent chain',()=>{
 const t=makeCausalTrace();
 t.begin({id:'root',type:'QUEST',time:0});t.begin({id:'child',parentId:'root',type:'LOOT',time:1});
 assert.deepEqual(t.chain('child').map(x=>x.id),['root','child']);
});
test('revisioned state rejects stale writes',()=>{
 const s=makeRevisionedState({initial:{hp:10}});
 assert.equal(s.commit({expectedRevision:0,update:state=>{state.hp=9;}}).ok,true);
 assert.equal(s.commit({expectedRevision:0,update:state=>{state.hp=100;}}).reason,'REVISION_CONFLICT');
 assert.equal(s.read().state.hp,9);
});
test('network gate enforces authenticated ownership',()=>{
 const gate=makeNetworkAuthorityGate({resolveOwner:()=> 'hero',allowedCommands:['ATTACK']});
 assert.equal(gate({type:'ATTACK',actorId:'character'},{authenticatedPlayerId:'hero'}),true);
 assert.equal(gate({type:'ATTACK',actorId:'character'},{authenticatedPlayerId:'intruder'}),false);
});
test('cross-system scenario stops on failed command',async()=>{
 const router=makeCommandRouter({authorize:()=>true,handlers:{one:async()=>({ok:true}),two:async()=>({ok:false,reason:'DENIED'})}});
 const runner=makeCrossSystemScenario({router});
 const r=await runner.run({commands:[{id:'1',type:'one',actorId:'p'},{id:'2',type:'two',actorId:'p'}]});
 assert.equal(r.ok,false);assert.equal(r.results.length,2);
});
