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
// [미술감독] 장르별 미술 목표는 기존 세계/카메라 사양과 일치해야 한다.
test('art direction combines ten genre profiles without changing gameplay',()=>{
 for(const [name,base] of Object.entries(vibeGenreCatalog)){
  const genre=resolveVibeGenre(name);
  assert.equal(genre.artDirection.world,base.world);
  assert.equal(genre.artDirection.lighting,base.lighting);
  assert.equal(genre.artDirection.audioCue,base.audio.ambience);
  assert.equal(genre.movement.speed,base.movement.speed);
  assert.equal(genre.artDirection.review,'observed-pixels-only');
  assert.equal(genre.artDirection.protected.includes('save'),true);
  assert.equal(Object.isFrozen(genre.artDirection),true);
 }
 const action=resolveVibeGenre('action');
 assert.equal(action.artDirection.cameraFocus,'action-wide');
 const horror=resolveVibeGenre('horror');
 assert.equal(horror.artDirection.mood,'tension');
});

test('genre switching and serialization preserve chosen profile',()=>{
 const director=createVibeGenreDirector();director.select('voxel');
 assert.equal(director.current.id,'voxel');
 assert.equal(JSON.parse(director.serialize()).genre,'voxel');
});
