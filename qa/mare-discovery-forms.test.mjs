// [발견물 외형] 매핑표가 쓰는 모델은 모두 등록 자산이어야 하고, 금빛 공 표식(기본 도형)은 없어야 한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root = 'roblox-games/mare-essentia';
const df = fs.readFileSync(`${root}/src/ReplicatedStorage/Shared/DiscoveryForms.luau`, 'utf8');
const stage = fs.readFileSync(`${root}/src/ReplicatedStorage/Shared/DiscoveryStage.luau`, 'utf8');
const field = fs.readFileSync(`${root}/src/ReplicatedStorage/Shared/FieldScene.luau`, 'utf8');
const reg = JSON.parse(fs.readFileSync(`${root}/assets-registered.json`, 'utf8')).assets;

test('매핑표 모델은 전부 등록 자산', () => {
  const arch = df.slice(df.indexOf('DF.ARCHETYPES = {'), df.indexOf('-- 분류 규칙'));
  const pairs = [...arch.matchAll(/\{ "([A-Za-z]+)", "([\w\-\.]+)" \}/g)].map(m => `${m[1]}/${m[2]}`);
  assert.ok(pairs.length > 60, '모델 후보 수');
  const missing = pairs.filter(k => !reg[k]);
  assert.deepEqual(missing, [], '미등록 모델');
  for (const k of ['Terrain/campfire-stones', 'Relics/journal-open', 'Terrain/tent-detailedopen', 'Terrain/plant-bushsmall']) {
    assert.ok(reg[k], '관찰 기록 현장 소품 ' + k);
  }
});

test('금빛 공 표식 제거·실물 연출 연결', () => {
  assert.match(field, /anchor\.Transparency = 1/);
  assert.doesNotMatch(field, /clue\.Shape = Enum\.PartType\.Ball/);
  assert.match(field, /DiscoveryStage\.setup\(\{/);
  assert.match(field, /folder:SetAttribute\("FieldWeather", weather\)/);
  assert.match(stage, /DiscoverySilhouette/);
  assert.match(stage, /놀라 달아났다/);
  assert.match(df, /DF\.EXACT_ANIMALS = \{/);
});
