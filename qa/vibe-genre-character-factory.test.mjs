import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../tools/vibe_genre_character_factory.py',import.meta.url),'utf8');
test('Blender generator includes ten genres and source exports',()=>{
 for(const name of ['storybook','illustration','wuxia','action','voxel','fantasy','horror','sciFi','cozy','platformer'])assert.ok(src.includes("'"+name+"'"));
 assert.match(src,/save_as_mainfile/);assert.match(src,/export_scene\.gltf/);
});
test('six animation clips and facial shape keys authored',()=>{
 for(const name of ['Idle_Breath','Walk_Contact','Run_PushOff','Attack_Anticipate_Impact','Dodge_Recover','Wave_Gesture'])assert.ok(src.includes(name));
 for(const name of ['jawOpen','eyeBlinkLeft','eyeBlinkRight','mouthSmileLeft','mouthSmileRight'])assert.ok(src.includes(name));
});
