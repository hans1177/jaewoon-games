// Original genre-composition planner. Reference games are inspiration only; no borrowed assets.
export const vibeGenreSystems=Object.freeze({
 rpg:{label:'오픈월드 RPG',systems:['quests','loot','skills','factions','crafting','equipment','combat'],ui:['questLog','inventory','skillTree','characterSheet','worldMap'],vfx:['lootGlow','skillBurst','weather'],camera:'thirdPerson'},
 survival:{label:'생존 제작',systems:['gathering','crafting','building','hunger','thirst','durability','combat'],ui:['hotbar','craftingGrid','buildPalette','survivalMeters','map'],vfx:['dust','chopping','campfire'],camera:'thirdPerson'},
 actionAdventure:{label:'액션 어드벤처',systems:['combat','dodge','parry','stealth','climbing','quests','equipment'],ui:['abilityWheel','combatHud','questTracker','map','gear'],vfx:['impact','trail','perfectDodge'],camera:'cinematic'},
 strategy4x:{label:'턴제 4X 전략',systems:['hexMap','turns','cities','research','production','diplomacy','combat'],ui:['turnBar','cityPanel','techTree','diplomacy','minimap'],vfx:['tileHighlight','construction','battle'],camera:'isometric'},
 cozy:{label:'생활 힐링',systems:['farming','crafting','relationships','decorating','calendar','quests'],ui:['calendar','inventory','craftingGrid','relationships','home'],vfx:['sparkle','harvest','weather'],camera:'thirdPerson'},
 platformer:{label:'캐주얼 점프',systems:['jump','collectibles','checkpoints','abilities','timeTrials'],ui:['score','lives','levelSelect','abilities'],vfx:['jumpDust','pickup','landing'],camera:'sideView'},
 roguelite:{label:'로그라이트',systems:['proceduralRooms','combat','loot','perks','metaProgression'],ui:['perkChoice','runStats','map','inventory'],vfx:['critical','pickup','portal'],camera:'topDown'},
 puzzle:{label:'퍼즐',systems:['puzzleGrid','undo','hints','levelSelect','progress'],ui:['puzzleBoard','hintPanel','levelSelect'],vfx:['success','hint','selection'],camera:'isometric'},
 rhythm:{label:'리듬',systems:['beatClock','judgement','combo','score','difficulty'],ui:['noteLane','combo','accuracy','songSelect'],vfx:['hitPulse','comboBurst','miss'],camera:'fixed'},
 towerDefense:{label:'타워 디펜스',systems:['waves','towerPlacement','upgrades','resources','pathfinding'],ui:['towerPalette','waveInfo','upgradePanel','minimap'],vfx:['projectile','explosion','rangePreview'],camera:'isometric'}
});
export const vibeCasualFive=Object.freeze(['cozy','platformer','roguelite','puzzle','towerDefense']);
export function planVibeGame({primary='rpg',secondary=[],casualFive=false,preferences={}}={}){
 if(casualFive&&primary==='auto')primary=vibeCasualFive[0];
 if(primary==='auto')primary=preferences.strategy?'strategy4x':preferences.fastCombat?'actionAdventure':preferences.survival?'survival':'rpg';
 if(!vibeGenreSystems[primary])throw Error('Unknown primary genre');
 if(!Array.isArray(secondary)||secondary.length>3||secondary.some(id=>!vibeGenreSystems[id]))throw Error('Invalid secondary genres');
 const weights=[{id:primary,weight:1},...secondary.filter(id=>id!==primary).map((id,i)=>({id,weight:.4/(i+1)}))];
 const unique=field=>[...new Set(weights.flatMap(({id})=>vibeGenreSystems[id][field]))];
 const systems=unique('systems'),ui=unique('ui'),vfx=unique('vfx');
 const priority=['combat','crafting','building','quests','turns','research','farming','puzzleGrid','waves'];
 return {primary,blend:weights,systems,ui,vfx,camera:vibeGenreSystems[primary].camera,implementationOrder:[...systems].sort((a,b)=>priority.indexOf(a)<0?1:priority.indexOf(b)<0?-1:priority.indexOf(a)-priority.indexOf(b)),casualFive:vibeCasualFive};
}
