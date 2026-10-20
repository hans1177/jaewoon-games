import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createVibeGameUi,vibeGenrePanels,validateVibeUiSettings} from '../assets/vibe-genre-game-ui.mjs';
test('all genres provide five distinct functional menu slots',()=>{
 assert.equal(Object.keys(vibeGenrePanels).length,10);
 for(const panels of Object.values(vibeGenrePanels))assert.equal(panels.length,5);
});
test('switching genre replaces available panels',()=>{
 const ui=createVibeGameUi({genre:'wuxia'});assert.ok(ui.panels().some(x=>x.id==='martialArts'));
 ui.selectGenre('voxel');assert.ok(ui.panels().some(x=>x.id==='crafting'));
 assert.throws(()=>ui.open('martialArts'));
});
test('settings clamp volume and persist safe values',()=>{
 const ui=createVibeGameUi();ui.setSettings({masterVolume:8,textScale:.2,reducedMotion:true});
 assert.equal(ui.settings.masterVolume,1);assert.equal(ui.settings.textScale,.8);
 const restored=createVibeGameUi();assert.ok(restored.restore(ui.serialize()));assert.equal(restored.settings.reducedMotion,true);
 assert.equal(restored.restore('invalid-json'),false);
});
