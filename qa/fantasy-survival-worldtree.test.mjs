// 파일명: qa/fantasy-survival-worldtree.test.mjs
// 임포트 · 세계수 3D 내부/지하, 몬스터, 서버권한 및 저장/모바일 정적 회귀 검증
// 참고: 이 검사는 실제 Roblox 모바일 런타임·배포 증거를 대신하지 않는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server = fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau', 'utf8');
const client = fs.readFileSync('roblox-games/fantasy-survival/client/Game.client.luau', 'utf8');
const config = fs.readFileSync('roblox-games/fantasy-survival/shared/GameConfig.luau', 'utf8');
const has = (source, ...keys) => keys.forEach(key => assert.ok(source.includes(key), key));

test('세계수 지상 입구·6.8배 내부·거대 꽃·지하·양방향 출입은 기존 서버 3D 파트다', () => {
  has(server, 'WorldTreeExterior','TrunkInterior','WorldTreeUnderground','EnterTheWorldTree','BackToSurface','DescentPortal','ReturnToTrunk','AncientRootAltar','HeartwoodFloor','MossPatch','GiantFlowerPetal');
  has(server, 'setWorldArea(player, "interior"','setWorldArea(player, "underground"','setWorldArea(player, "surface"');
  has(config, 'InteriorSizeScale = 6.8', 'InteriorRadius = 102', 'GiantFlowers = 10');
  assert.match(server, /for i = 1, worldTreeSpec\.GiantFlowers do/);
  has(server, 'p.Size = Vector3.new(size.Y, size.X, size.Z)', 'prompt.Triggered:Connect');
  assert.doesNotMatch(server, /_G\.WorldTree|loadstring\(/);
});

test('기존 세계수 곰·녹스바르의 원본 체력/공격/이동을 보존한다', () => {
  has(config, 'Name="세계수 곰", HP=380, Damage=28, Speed=70',
     'Name="근원포식자 녹스바르", HP=4500, Damage=150, Speed=186');
  has(server, '"BearClaws", "BearHides", "BearFangs"','worldBossReward()');
});

test('세계수 골렘은 중립 3티어·586/48, 뿌리 네 개 2초/50%, 피해 없이 3초 이동만 속박', () => {
  has(config, 'GolemCount = 4', 'Name="세계수 골렘", HP=586, Damage=48',
    'Aggressive=false, Tier=3','GolemRootCount = 4','GolemRootInterval = 2',
    'GolemRootProbability = 0.5','GolemRootLockSeconds = 3');
  const attack = server.slice(server.indexOf('local function worldRootProjectiles('),server.indexOf('local function worldEnemyStrike('));
  has(attack, 'for i = 1, worldTreeSpec.GolemRootCount do','rootSnare(player)');
  assert.doesNotMatch(attack, /TakeDamage|SetAttribute\("Health"/);
  has(server, 'humanoid.WalkSpeed = 0','humanoid.JumpPower = 0','humanoid.JumpHeight = 0',
    'if nearest.kind == "golem" then nearest.aggro = true');
  has(client, 'worldTreeAttackButton.Activated:Connect','WorldTreeRooted','속박 중 · 공격');
});

test('세계수 뱀은 250/39, 3초/67% 환각만 클라이언트 시야 속 뿌리에 적용한다', () => {
  has(config, 'Name="세계수 뱀", HP=250, Damage=39',
    'SnakeIllusionInterval = 3','SnakeIllusionProbability = 0.67');
  has(server, 'math.random() < worldTreeSpec.SnakeIllusionProbability',
    'remote:FireClient(closest, "WORLD_TREE_HALLUCINATION"');
  has(client, 'camera:WorldToViewportPoint(part.Position)',
    'root.LocalTransparencyModifier = 1',
    'root.LocalTransparencyModifier = transparency',
    'part.CanCollide = false','part.CanTouch = false','part.CanQuery = false');
  const hallucination = client.slice(client.indexOf('elseif kind == "WORLD_TREE_HALLUCINATION"'),client.indexOf('local list = Instance.new'));
  assert.doesNotMatch(hallucination, /TakeDamage|SovereignCores|remote:FireServer/);
});

test('제단은 뿌리 한 개로 소환하고 원본 보상과 전투 중 탈출 제한을 보존한다', () => {
  has(server,'worldPrompt(altar, "고대 뿌리 1개로 보스 소환"',
    'WorldTreeRoots") or 0) < 1','worldTreeBoss = makeWorldEnemy(worldTreeSpec.Monsters.Boss',
    'if worldTreeBoss and worldTreeBoss.hp > 0 then',
    'SovereignCores','ForestWoodenSwords','worldBossReward()');
  has(server,'rootRespawns[i][player.UserId] = os.clock() + 60');
});

test('기존 저장키, 서버 통신, 멀티, 기존 조작과 Roblox 모바일 입력을 유지한다', () => {
  has(server,'GetDataStore("fantasy-survival-development-v1")',
    'store:GetAsync("player:" .. player.UserId)',
    'store:UpdateAsync("player:" .. player.UserId',
    'local handlers = {','remote.OnServerEvent:Connect',
    'remote:FireAllClients("MULTIPLAYER_SYNC", snapshot)',
    'if actionId == "worldtree-attack" then worldTreeAttack(player) return end');
  for(const key of ['WorldTreeRoots','WorldTreeBossClears','SovereignCores','ForestWoodenSwords'])
    has(config,key + ' = 0');
  has(client, 'if kind == "MULTIPLAYER_SYNC"', 'WorldTreeMiniMap',
    'worldTreeMiniMap.Visible = inside','Enum.KeyCode.ButtonR2',
    'worldTreeAttackButton.Activated:Connect');
  assert.equal((client.match(/remote\.OnClientEvent:Connect/g) || []).length, 1);
  assert.equal((client.match(/local worldTreeAttackButton =/g) || []).length, 1);
});

test('서버 엔진 캐릭터/월드 충돌 흐름에 nil 속박·원통 형상 회귀가 없다', () => {
  has(server, 'if owner then clearWorldSnare(owner) end',
    'p.Size = Vector3.new(size.Y, size.X, size.Z)',
    'worldTreeRegions[owner] = "surface"',
    'nativeFoundationSpawn','NativeFoundationReadyAt');
  assert.doesNotMatch(server, /clearWorldSnare\(Players:GetPlayerFromCharacter\(character\)\)/);
});
