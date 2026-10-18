import {advancedGenreBlueprints} from './vibe-advanced-genre-blueprints.mjs';
const limit=(n,a,b)=>Math.max(a,Math.min(b,n));
export function createSurvivalSimulation(initial={}){
 const s={hunger:100,thirst:100,energy:100,temperature:22,health:100,...initial};
 const rules=advancedGenreBlueprints.survival;
 return {state:()=>({...s}),tick(seconds,{sprinting=false,ambientTemperature=22,resting=false}={}){
  if(!Number.isFinite(seconds)||seconds<0||seconds>3600)throw Error('Invalid simulation interval');
  const minutes=seconds/60;s.hunger=limit(s.hunger-rules.meters.hunger.drainPerMinute*minutes*(sprinting?1.5:1),0,100);
  s.thirst=limit(s.thirst-rules.meters.thirst.drainPerMinute*minutes*(sprinting?2:1),0,100);
  s.energy=limit(s.energy+(resting?8:-(sprinting?.6:.3))*minutes,0,100);
  s.temperature=limit(s.temperature+(ambientTemperature-s.temperature)*Math.min(1,seconds/240),-40,60);
  if(s.hunger===0||s.thirst===0||s.temperature<32&&s.temperature<0||s.temperature>42)s.health=limit(s.health-seconds/60*2,0,100);
  return this.state()},
  consume(type){if(type==='water')s.thirst=limit(s.thirst+30,0,100);else if(type==='food')s.hunger=limit(s.hunger+25,0,100);else throw Error('Unknown consumable');return this.state()},
  modifiers(){return {staminaRegen:s.thirst<15?.35:1,healing:s.hunger<15?.25:1,canSprint:s.energy>=10&&s.thirst>0}}
 };
}
export function createActionCombat(){
 const s={stamina:100,mode:'grounded',guardBreaks:0};
 const cfg=advancedGenreBlueprints.actionAdventure.combat;
 return {state:()=>({...s}),tick(dt){if(!Number.isFinite(dt)||dt<0||dt>10)throw Error('Invalid dt');s.stamina=limit(s.stamina+cfg.staminaRegenPerSecond*dt,0,100);if(s.mode==='climb')s.stamina=limit(s.stamina-cfg.staminaCosts.climbPerSecond*dt,0,100);if(s.stamina===0&&s.mode==='climb')s.mode='drop';return this.state()},
  parry(attackTimingSeconds,{unblockable=false}={}){if(s.stamina<cfg.staminaCosts.parry)return {result:'exhausted'};s.stamina-=cfg.staminaCosts.parry;if(unblockable)return {result:'unblockable'};const timing=Math.abs(attackTimingSeconds);return {result:timing<=cfg.perfectParryWindowSeconds?'perfect':timing<=cfg.parryWindowSeconds?'parry':'miss'}},
  dodge(){if(s.stamina<cfg.staminaCosts.dodge)return false;s.stamina-=cfg.staminaCosts.dodge;return true},
  climb(ledgeHeight){if(s.stamina<9||ledgeHeight<.8||ledgeHeight>2.4)return false;s.mode='climb';return true},
  mantle(){if(s.mode!=='climb')return false;s.mode='grounded';return true}
 };
}
export function createStrategyCity({name='New City',owner='player'}={}){
 const city={name,owner,population:2,stock:{food:15,production:0,gold:20,science:0,culture:0},buildings:[],queue:[]};
 const specs=advancedGenreBlueprints.strategy4x.buildings;
 return {state:()=>JSON.parse(JSON.stringify(city)),queue(id){if(!specs[id])throw Error('Unknown building');city.queue.push(id)},
  turn(){const income={food:city.population*2,production:city.population*2,gold:city.population,science:1,culture:1};for(const id of city.buildings)for(const [key,value] of Object.entries(specs[id].yield))income[key]+=value;
   income.food-=city.population*2;for(const [key,value] of Object.entries(income))city.stock[key]+=value;
   if(city.queue.length&&city.stock.production>=specs[city.queue[0]].cost){const id=city.queue.shift();city.stock.production-=specs[id].cost;city.buildings.push(id)}
   if(city.stock.food>=20+city.population*5){city.stock.food-=20+city.population*5;city.population++}
   return this.state()}
 };
}
export function decideStrategyAi({food=10,threat=0,science=0,production=0,relations=0}={}){
 if(food<5)return {priority:'avoidStarvation',action:'farm'};
 if(threat>70)return {priority:'defendThreat',action:'fortify'};
 if(relations< -50)return {priority:'negotiate',action:'offerPeace'};
 if(science<10)return {priority:'research',action:'library'};
 return {priority:'growEconomy',action:production<15?'workshop':'market'};
}
