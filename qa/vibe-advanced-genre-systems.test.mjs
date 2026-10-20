import {test} from 'node:test';import assert from 'node:assert/strict';
import {combineAdvancedGenres,describeAdvancedGenre} from '../assets/vibe-advanced-genre-blueprints.mjs';
import {createSurvivalSimulation,createActionCombat,createStrategyCity,decideStrategyAi} from '../assets/vibe-advanced-genre-systems.mjs';
test('advanced genre composition combines UI and VFX',()=>{const x=combineAdvancedGenres(['strategy4x','survival']);assert.ok(x.ui.includes('cityProduction'));assert.ok(x.vfx.includes('rainWetness'));assert.ok(describeAdvancedGenre('actionAdventure').combat.parryWindowSeconds>0)});
test('survival drains vitals and consuming water restores thirst',()=>{const sim=createSurvivalSimulation();sim.tick(600,{sprinting:true});assert.ok(sim.state().thirst<90);const before=sim.state().thirst;sim.consume('water');assert.ok(sim.state().thirst>before)});
test('action perfect parry and climbing consume stamina',()=>{const game=createActionCombat();assert.equal(game.parry(.04).result,'perfect');assert.equal(game.climb(1.5),true);game.tick(1);assert.equal(game.state().mode,'climb');assert.equal(game.mantle(),true)});
test('city production queue and strategy AI',()=>{const city=createStrategyCity();city.queue('farm');for(let i=0;i<20;i++)city.turn();assert.ok(city.state().buildings.includes('farm'));assert.equal(decideStrategyAi({food:1}).action,'farm')});
