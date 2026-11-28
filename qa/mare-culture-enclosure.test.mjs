// [문화권별 마을 경계] 2026-11-29 오너: "마을 구조 항구마다 달라야 하는데 다 똑같다"
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const scene = fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/PortScene.luau', 'utf8');
test('성벽·감시탑은 유럽 석조 문화권만, 나머지는 흙벽·담장·나무 울타리·숲 경계', () => {
  assert.match(scene, /local ENCLOSURE = \{/);
  assert.match(scene, /ottoman = "mud", desert = "mud", korea = "earth", china = "earth", japan = "open",/);
  assert.match(scene, /local enclosure = ENCLOSURE\[key\] or "palisade"/);
  assert.match(scene, /if lvl >= 2 and enclosure == "stone" then/);
  assert.match(scene, /folder:SetAttribute\("CityEnclosure", enclosure\)/);
});
