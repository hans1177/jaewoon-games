import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

test('cozy island expands home village and spawns five native animated bears',()=>{
  const server=read('roblox-games/cozy-island/server/Game.server.luau');
  const client=read('roblox-games/cozy-island/client/Game.client.luau');
  const style=read('roblox-games/cozy-island/shared/VisualStyle.luau');
  const factory=read('roblox-games/cozy-island/shared/WildlifeFactory.luau');
  const animator=read('roblox-games/cozy-island/shared/WildlifeAnimator.luau');

  assert.match(style,/Size=Vector3\.new\(220,10,220\)/);
  assert.match(server,/VILLAGE_BEAR_COUNT=5/);
  assert.match(server,/spawnVillageBears\(world,topY\)/);
  assert.match(server,/VillagePlaza",Vector3\.new\(104,1,92\)/);
  assert.match(server,/VillageGreen/);
  assert.match(server,/Wildlife\.Spawn\("BEAR"/);
  assert.match(server,/VillageBearCount/);
  assert.match(client,/WildlifeAnimator\.bind/);
  assert.match(client,/VibeSurvivalWildlife/);
  assert.match(factory,/AnimationController/);
  assert.match(factory,/Motor6D/);
  assert.match(animator,/stanceSample/);
  assert.match(animator,/springNumber/);
  assert.match(animator,/SPINE|spineLag/i);
  assert.doesNotMatch(factory,/BillboardGui|ImageLabel/);
});
