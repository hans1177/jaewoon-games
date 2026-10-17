// 파일명: qa/fantasy-survival-worldtree.test.mjs
// 임포트 · 세계수 내부를 기존 Roblox 원본 게임에 직접 연결했는지 확인하는 소스 회귀 검사
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const server = fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau', 'utf8');
const client = fs.readFileSync('roblox-games/fantasy-survival/client/Game.client.luau', 'utf8');
const config = fs.readFileSync('roblox-games/fantasy-survival/shared/GameConfig.luau', 'utf8');

test('세계수 원본 루프, 지상 입구, 내부, 지하, 귀환과 제단이 이어진다', () => {
  assert.match(server, /local worldTreeCenter = Vector3\.new\(650, 2, 600\)/);
  assert.match(server, /Name = "MagicForestWorldTree"/);
  for (const name of ['EnterTheWorldTree', 'TrunkInterior', 'DownToRoots', 'WorldTreeUnderground', 'ReturnToTrunk', 'AncientRootAltar']) {
    assert.ok(server.includes(name), name);
  }
  assert.match(server, /setWorldArea\(player, "interior"/);
  assert.match(server, /setWorldArea\(player, "underground"/);
  assert.match(server, /setWorldArea\(player, "surface"/);
  assert.match(server, /WorldTreeArea/);
  assert.match(server, /if worldTreeBoss and worldTreeBoss\.hp > 0 then/);
});

test('세계수 규모와 거대 꽃/고정 지형은 기존 별도 3D Roblox 월드에 배치', () => {
  assert.match(config, /InteriorSizeScale = 6\.8/);
  assert.match(config, /GiantFlowers = 10/);
  assert.match(server, /for i = 1, worldTreeSpec\.GiantFlowers do/);
  assert.match(server, /HeartwoodFloor/);
  assert.match(server, /AncientRoot/);
  assert.match(server, /MossPatch/);
  assert.doesNotMatch(server, /_G\.WorldTree|loadstring\(/);
});

test('세계수 곰과 녹스바르 원본 체력/피해/이동 수치를 유지한다', () => {
  assert.match(config, /Name="세계수 곰", HP=380, Damage=28, Speed=70,/);
  assert.match(config, /Name="근원포식자 녹스바르", HP=4500, Damage=150, Speed=186,/);
  assert.match(server, /"ForestWoodenSwords"/);
  assert.match(server, /"SovereignCores"/);
  assert.match(server, /"BearClaws", "BearHides", "BearFangs"/);
  assert.match(server, /worldBossReward\(\)/);
});

test('골렘은 중립 586/48/3티어이고 2초에 50%로 4뿌리, 무피해 3초 이동 봉쇄만 적용', () => {
  assert.match(config, /GolemCount = 4/);
  assert.match(config, /Name="세계수 골렘", HP=586, Damage=48,[^\n]*Aggressive=false, Tier=3/);
  assert.match(config, /GolemRootInterval = 2/);
  assert.match(config, /GolemRootProbability = 0\.5/);
  assert.match(config, /GolemRootCount = 4/);
  assert.match(config, /GolemRootLockSeconds = 3/);
  const roots = server.slice(server.indexOf('local function worldRootProjectiles('), server.indexOf('local function worldEnemyStrike('));
  assert.match(roots, /for i = 1, worldTreeSpec\.GolemRootCount do/);
  assert.match(roots, /rootSnare\(player\)/);
  assert.doesNotMatch(roots, /TakeDamage|setNumber\(player, "Health"/);
  assert.match(server, /humanoid\.WalkSpeed = 0/);
  assert.match(server, /while worldTreeSnares\[player\] == state do/);
  assert.match(server, /if nearest\.kind == "golem" then nearest\.aggro = true/);
  assert.match(client, /속박 · 공격 가능/);
});

test('뱀 환각은 확률적이고 화면 연출 전용이며 250/39를 유지한다', () => {
  assert.match(config, /Name="세계수 뱀", HP=250, Damage=39/);
  assert.match(config, /SnakeIllusionInterval = 3/);
  assert.match(config, /SnakeIllusionProbability = 0\.67/);
  assert.match(server, /WORLD_TREE_HALLUCINATION/);
  assert.match(client, /WORLD_TREE_HALLUCINATION/);
  assert.match(client, /illusion\.CanCollide = false/);
  assert.match(client, /illusion\.CanTouch = false/);
  assert.match(client, /illusion\.CanQuery = false/);
  assert.match(client, /Debris"\):AddItem\(illusion/);
});

test('기존 저장키·통신·조작 흐름을 보존하고 신규 진행도는 기존 저장 루프에서만 추가한다', () => {
  assert.match(server, /GetDataStore\("fantasy-survival-development-v1"\)/);
  assert.match(server, /remote\.OnServerEvent:Connect/);
  assert.match(server, /if actionId == "worldtree-attack" then worldTreeAttack\(player\) return end/);
  assert.match(server, /for key, fallback in pairs\(Config\.InitialState\) do snapshot\[key\]/);
  for (const key of ['WorldTreeRoots', 'WorldTreeBossClears', 'SovereignCores', 'ForestWoodenSwords']) {
    assert.match(config, new RegExp(key + ' = 0'));
  }
  assert.match(client, /worldTreeAttackButton\.Activated:Connect/);
  assert.match(client, /worldTreeMapButton\.Activated:Connect/);
  assert.match(client, /refreshWorldTreeHud/);
});
