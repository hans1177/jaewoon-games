// Original monster RPG turn rules inspired by classic Japanese command-based monster RPGs.
// No third-party characters, artwork, or proprietary game data.
export const TYPE_CHART={
 '불꽃':{'풀':1.6,'물':.65,'땅':.8},
 '물':{'불꽃':1.6,'땅':1.5,'풀':.65},
 '풀':{'물':1.6,'땅':1.5,'불꽃':.65},
 '바람':{'풀':1.4,'땅':1.25},
 '땅':{'불꽃':1.5,'바람':.75},
 '어둠':{'바람':1.3}
};
export function typeMultiplier(attack,defense){return TYPE_CHART[attack]?.[defense]??1;}
export function speedFor(mon){return 10+mon.lv*2+Math.floor((mon.atk||10)/6);}
export function moveFor(mon,species,special=false){
 const s=species[mon.id];
 return {name:special?s.skill:'기본 공격',type:special?s.type:'일반',power:special?1.2:1,priority:0,accuracy:special?.9:1};
}
export function resolveOrder(player,enemy,playerMove,enemyMove,random=Math.random){
 const a={side:'player',speed:speedFor(player),priority:playerMove.priority||0};
 const b={side:'enemy',speed:speedFor(enemy),priority:enemyMove.priority||0};
 if(a.priority!==b.priority)return a.priority>b.priority?['player','enemy']:['enemy','player'];
 if(a.speed!==b.speed)return a.speed>b.speed?['player','enemy']:['enemy','player'];
 return random()<.5?['player','enemy']:['enemy','player'];
}
export function calculateMoveDamage(attacker,defender,attackerSpecies,defenderSpecies,move,random=Math.random){
 if(random()>move.accuracy)return {damage:0,miss:true,effectiveness:1,critical:false};
 const effectiveness=typeMultiplier(move.type,defenderSpecies[defender.id].type);
 const critical=random()<.08;
 const base=Math.max(4,Math.floor(attacker.atk+(random()*5)));
 const damage=Math.max(1,Math.floor(base*move.power*effectiveness*(critical?1.45:1)));
 return {damage,miss:false,effectiveness,critical};
}
export function enemyMoveChoice(enemy,player,species,random=Math.random){
 const weakness=typeMultiplier(species[enemy.id].type,species[player.id].type);
 const special=weakness>1||enemy.hp/enemy.maxHp<.45||random()<.35;
 return moveFor(enemy,species,special);
}
