import {test} from 'node:test';
import assert from 'node:assert/strict';
import {vibeGenreCatalog,resolveVibeGenre,createVibeGenreDirector} from '../assets/vibe-genre-director.mjs';
test('ten distinct genre styles available',()=>{assert.equal(Object.keys(vibeGenreCatalog).length,10);for(const id of ['storybook','illustration','wuxia','action','voxel'])assert.ok(vibeGenreCatalog[id])});
test('genre overrides preserve unrelated settings and clamp unsafe intensity',()=>{
 const preset=resolveVibeGenre('wuxia',{movement:{speed:9},fx:{shake:3}});
 assert.equal(preset.movement.speed,9);assert.equal(preset.fx.shake,1);
 assert.equal(preset.camera.fov,vibeGenreCatalog.wuxia.camera.fov);
 assert.throws(()=>resolveVibeGenre('not-a-genre'));
});
test('genre switching and serialization preserve chosen profile',()=>{
 const director=createVibeGenreDirector();director.select('voxel');
 assert.equal(director.current.id,'voxel');
 assert.equal(JSON.parse(director.serialize()).genre,'voxel');
});
