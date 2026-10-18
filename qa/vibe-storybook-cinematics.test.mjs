import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createVibePerformanceTiming,vibeStorybookPresets} from '../assets/vibe-storybook-cinematics.mjs';
test('storybook environments include four original moods',()=>{
 assert.deepEqual(Object.keys(vibeStorybookPresets),['enchantedForest','sunsetVillage','moonlitRuins','emberVolcano']);
});
test('anticipation, action and settle phases preserve continuity',()=>{
 const t=createVibePerformanceTiming();
 assert.equal(t.sample(0).phase,'anticipation');
 assert.equal(t.sample(.2).phase,'action');
 assert.equal(t.sample(.5).phase,'settle');
 assert.equal(t.sample(1).phase,'done');
 assert.equal(t.sample(1).weight,1);
});
