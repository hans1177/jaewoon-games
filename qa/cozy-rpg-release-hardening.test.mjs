import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p));

const cozyConfig=read('roblox-games/cozy-island/shared/GameConfig.luau');
const cozyClient=read('roblox-games/cozy-island/client/Game.client.luau');
const cozyServer=read('roblox-games/cozy-island/server/Game.server.luau');
const cozyLaunch=json('roblox-games/cozy-island/launch-mvp.json');

const rpgConfig=read('roblox-games/daechung-rpg/shared/GameConfig.luau');
const rpgClient=read('roblox-games/daechung-rpg/client/Game.client.luau');
const rpgServer=read('roblox-games/daechung-rpg/server/Game.server.luau');
const rpgLaunch=json('roblox-games/daechung-rpg/launch-mvp.json');

test('포근섬은 검증된 Creator Store BGM과 전투/승리 효과음을 런타임에 연결한다',()=>{
  for(const id of ['1837169004','1847075059','7171761940','1839321582'])assert.match(cozyConfig,new RegExp(id));
  assert.match(cozyClient,/SoundService/);
  assert.match(cozyClient,/CozyBackground/);
  assert.match(cozyClient,/CozyBattle/);
  assert.match(cozyClient,/victorySfx:Play\(\)/);
  assert.ok(cozyLaunch.releaseGates.includes('Creator Store BGM and gameplay SFX'));
  assert.equal(cozyLaunch.evidencePolicy.audioFeedbackPassRequired,true);
});

test('Whatever RPG는 필드 음악 액션음 보스 승리음을 런타임에 연결한다',()=>{
  for(const id of ['1839010065','1837821768','7171761940','1839321582'])assert.match(rpgConfig,new RegExp(id));
  assert.match(rpgClient,/SoundService/);
  assert.match(rpgClient,/RPGBackground/);
  assert.match(rpgClient,/actionSfx:Play\(\)/);
  assert.match(rpgClient,/victorySfx:Play\(\)/);
  assert.ok(rpgLaunch.releaseGates.includes('Creator Store BGM and gameplay SFX'));
  assert.equal(rpgLaunch.evidencePolicy.audioFeedbackPassRequired,true);
});

test('포근섬 Remote는 한 서버 핸들러에서 허용 액션만 처리한다',()=>{
  assert.equal((cozyServer.match(/remote\.OnServerEvent:Connect/g)||[]).length,1);
  assert.match(cozyServer,/typeof\(a\)~="string"or not H\[a\]then return/);
  assert.match(cozyServer,/C\.RateLimitSeconds/);
  assert.match(cozyServer,/broadcastMultiplayerSync\(p\)/);
  assert.ok(cozyLaunch.releaseGates.includes('remote action allowlist and spam rejection'));
  assert.equal(cozyLaunch.evidencePolicy.abuseResistancePassRequired,true);
});

test('Whatever RPG Remote는 allowlist와 rate limit 뒤에만 게임 액션과 동기화를 실행한다',()=>{
  assert.equal((rpgServer.match(/remote\.OnServerEvent:Connect/g)||[]).length,1);
  assert.match(rpgServer,/local allowedActions=\{\}/);
  assert.match(rpgServer,/allowedActions\[a\]~=true then return/);
  assert.match(rpgServer,/C\.RemoteMinInterval/);
  assert.match(rpgServer,/broadcastMultiplayerSync\(p\)/);
  assert.doesNotMatch(rpgServer,/if typeof\(action\)=="string" then broadcastMultiplayerSync/);
  assert.ok(rpgLaunch.releaseGates.includes('remote action allowlist and spam rejection'));
  assert.equal(rpgLaunch.evidencePolicy.abuseResistancePassRequired,true);
});


test('포근섬 모바일 UI는 자원/성장/정복을 분리한다',()=>{
  for(const marker of ['TopHUD','ActionDock','채집','마을 성장','정복','기지공격','병영강화'])assert.match(cozyClient,new RegExp(marker));
  assert.match(cozyClient,/Size=UDim2\.new\(1,-16,0,210\)/);
  assert.match(cozyClient,/Size=UDim2\.new\(\.305,0,0,50\)/);
  assert.match(cozyClient,/AnchorPoint=Vector2\.new\(\.5,1\)/);
});

test('Whatever RPG 모바일 UI는 전투 우선과 보조 메뉴를 분리한다',()=>{
  for(const marker of ['RPGTopHUD','CombatDock','PartyMenuButton','PartyMenu','공격','스킬','회피','파티/장비'])assert.match(rpgClient,new RegExp(marker));
  assert.match(rpgClient,/Size=UDim2\.new\(\.31,0,0,80\)/);
  assert.match(rpgClient,/secondary\.Visible=not secondary\.Visible/);
  assert.match(rpgClient,/AnchorPoint=Vector2\.new\(\.5,1\)/);
});
