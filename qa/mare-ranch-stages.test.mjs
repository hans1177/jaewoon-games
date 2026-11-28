// [단계별·가축별 방목] 2026-11-29 오너: "목장 목축업 단계별 방목, 가축별로 다르고"
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const scene = fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/PortScene.luau', 'utf8');
test('단계별 크기·울타리·시설, 가축별 땅·무리', () => {
  assert.match(scene, /local stageScale = \(\{ 0\.4, 0\.55, 0\.7, 0\.85, 1 \}\)\[stage\]/);
  assert.match(scene, /local fenceAsset = if stage <= 1 then nil elseif stage == 2 then "fence_post"/);
  assert.match(scene, /local SPECIES_GROUND = \{/);
  assert.match(scene, /local herdMul = \(\{ sheep = 1\.7, cow = 1\.0, horse = 0\.7, pig = 1\.2, donkey = 0\.6, llama = 1\.1 \}\)\[sp\] or 1/);
  assert.match(scene, /"village-stable"/);
});
