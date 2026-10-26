import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');

test('Cozy Roblox village keeps existing actors while unverified CC0 bears remain blocked',()=>{
 const server=read('roblox-games/cozy-island/server/Game.server.luau');
 const client=read('roblox-games/cozy-island/client/Game.client.luau');
 const style=read('roblox-games/cozy-island/shared/VisualStyle.luau');
 const factory=read('roblox-games/cozy-island/shared/WildlifeFactory.luau');
 const animator=read('roblox-games/cozy-island/shared/WildlifeAnimator.luau');
 assert.match(style,/Size=Vector3\\.new\\(220,10,220\\)/);
 assert.match(server,/VillagePlaza",Vector3\\.new\\(104,1,92\\)/);
 assert.match(server,/VillageGreen/);
 assert.match(server,/spawnMob\\("BOAR"/);
 assert.match(server,/spawnMob\\("RAIDER"/);
 // Owner CC0 policy: do not synthesize, place or declare bears verified when
 // the exact source license and digest are absent from the registered library.
 assert.match(server,/CozyBearCC0Status","BLOCKED_UNVERIFIED_SOURCE"/);
 assert.match(server,/VillageBearCount",0/);
 assert.doesNotMatch(server,/Wildlife\\.Spawn\\("BEAR"/);
 assert.doesNotMatch(server,/spawnVillageBears\\(/);
 // Native animation support may remain available; it is not runtime proof
 // for a bear that was not legally sourced or spawned.
 assert.match(client,/WildlifeAnimator\\.bind/);
 assert.match(client,/VibeSurvivalWildlife/);
 assert.match(factory,/AnimationController/);
 assert.match(factory,/Motor6D/);
 assert.match(animator,/stanceSample/);
 assert.match(animator,/springNumber/);
 assert.match(animator,/SPINE|spineLag/i);
 assert.doesNotMatch(factory,/BillboardGui|ImageLabel/);
});
