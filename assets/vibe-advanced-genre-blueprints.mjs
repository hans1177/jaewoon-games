// Data-driven advanced genre design: deterministic state rules and AI priorities.
export const advancedGenreBlueprints={
 strategy4x:{
  turnPhases:['income','upkeep','production','research','diplomacy','ai','victory'],
  resources:['food','production','gold','science','culture'],
  buildings:{farm:{cost:35,yield:{food:3}},workshop:{cost:50,yield:{production:3}},market:{cost:55,yield:{gold:4}},library:{cost:65,yield:{science:4}},monument:{cost:40,yield:{culture:2}}},
  diplomacy:{relationsRange:[-100,100],states:['peace','war','alliance'],actions:['trade','gift','denounce','declareWar','offerPeace','alliance']},
  ai:{priorities:['avoidStarvation','defendThreat','growEconomy','research','expand','negotiate'],difficulty:{easy:.7,normal:1,hard:1.3}},
  ui:['turnSummary','cityProduction','citizenAssignment','technologyTree','diplomacyTable','militaryOverview','eventLog'],
  vfx:['tileClaim','constructionComplete','borderPulse','diplomacyShift','battleImpact']
 },
 survival:{
  meters:{hunger:{min:0,max:100,drainPerMinute:.65},thirst:{min:0,max:100,drainPerMinute:1.1},energy:{min:0,max:100,drainPerMinute:.3},temperature:{min:-40,max:60}},
  actions:{sprint:{hungerMultiplier:1.5,thirstMultiplier:2,energyMultiplier:2},rest:{energyRecoveryPerMinute:8},drink:{thirstRestore:30},eat:{hungerRestore:25}},
  conditions:{dehydrated:{threshold:15,staminaRegenMultiplier:.35},starving:{threshold:15,healingMultiplier:.25},exhausted:{threshold:10,sprintDisabled:true}},
  ui:['survivalMeters','conditionDetails','consumableQuickbar','environmentForecast','shelterStatus'],
  vfx:['heatHaze','coldBreath','lowHydrationVignette','rainWetness','restRecovery']
 },
 actionAdventure:{
  combat:{parryWindowSeconds:.18,perfectParryWindowSeconds:.085,guardBreakStamina:0,dodgeIFrames:[.12,.34],staminaCosts:{parry:12,dodge:22,climbPerSecond:9},staminaRegenPerSecond:15},
  climbing:{states:['grounded','grab','hang','climb','mantle','drop'],required:{ledgeHeight:[.8,2.4],maxReach:1.5},mantleSeconds:.65},
  enemyTelegraphs:{light:.32,heavy:.7,unblockable:.85},
  ui:['staminaRing','lockOnTarget','attackTelegraph','parryFeedback','climbPrompt','combatLog'],
  vfx:['perfectParryFlash','weaponTrail','dodgeAfterimage','ledgeDust','guardBreakShockwave']
 }
};
export function describeAdvancedGenre(id){const entry=advancedGenreBlueprints[id];if(!entry)throw Error('Unknown advanced genre');return JSON.parse(JSON.stringify(entry))}
export function combineAdvancedGenres(ids){if(!Array.isArray(ids)||!ids.length||ids.length>3||ids.some(id=>!advancedGenreBlueprints[id]))throw Error('Invalid genre selection');return {genres:[...new Set(ids)],ui:[...new Set(ids.flatMap(id=>advancedGenreBlueprints[id].ui))],vfx:[...new Set(ids.flatMap(id=>advancedGenreBlueprints[id].vfx))]}}
