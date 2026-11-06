import {test} from 'node:test';import assert from 'node:assert/strict';
import {createGenreGameplay} from '../assets/vibe-genre-gameplay.mjs';
test('crafting consumes exact materials',()=>{const g=createGenreGameplay();g.craft('plank',2);assert.equal(g.snapshot().items.wood,26);assert.equal(g.snapshot().items.plank,2)});
test('martial arts training consumes points and increases level',()=>{const g=createGenreGameplay();g.train('swordArt');assert.equal(g.snapshot().arts.swordArt,1);assert.equal(g.snapshot().points,18)});
test('construction checks overlap before consuming materials',()=>{const g=createGenreGameplay();g.build('campfire',1,1);const before=g.snapshot();assert.throws(()=>g.build('shelter',1,1));assert.deepEqual(g.snapshot(),before)});
test('equipment upgrade costs gold and iron',()=>{const g=createGenreGameplay();g.upgrade();assert.equal(g.snapshot().upgrades.sword,1);assert.equal(g.snapshot().gold,360);assert.equal(g.snapshot().items.iron,8)});
test('saved state round-trips',()=>{const g=createGenreGameplay();g.build('workbench',2,2);const next=createGenreGameplay();assert.equal(next.restore(g.serialize()),true);assert.deepEqual(next.snapshot(),g.snapshot());assert.equal(next.restore('bad-json'),false)});
