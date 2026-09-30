// 파일명: qa/amusement-tycoon-direct-buildup.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('amusement tycoon direct seed exposes a real park operating loop',()=>{
  const config=fs.readFileSync('roblox-games/amusement-tycoon/shared/GameConfig.luau','utf8');
  const server=fs.readFileSync('roblox-games/amusement-tycoon/server/Game.server.luau','utf8');
  const client=fs.readFileSync('roblox-games/amusement-tycoon/client/Game.client.luau','utf8');

  for(const token of ['Score = 0','Coins = 0','Level = 1','Progress = 0','Towers = 0'])assert.ok(config.includes(token),token);
  for(const token of ['ParkOpen = 0','GuestCount = 0','Satisfaction = 70','QueueLength = 0','TrashCount = 0','Janitors = 0','PathTiles = 0','RideCount = 0','EntryFee = 10'])assert.ok(config.includes(token),token);
  for(const token of ['MaxJanitors = 3','MaxFacilityUpgrade = 3','RideDurationSeconds = 45','FoodServiceSeconds = 45','ToiletDurationSeconds = 15','FoodCapacityPerUpgrade = 4'])assert.ok(config.includes(token),token);

  for(const token of ['local function recomputePark(player)','ParkOpen','GuestCount','Satisfaction','QueueLength','EntranceCounter','RideBuildPad','ride-placement-needs-path','ride-upgrade-needs-revenue'])assert.ok(server.includes(token),token);
  assert.ok(client.includes('운영중'));
  assert.ok(client.includes('만족 %d%%'));
});

test('Roblox source edits automatically wake the canonical runtime buildup pipeline',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime.yml','utf8');
  assert.ok(workflow.includes("'roblox-games/**'"));
  assert.ok(workflow.includes('company-development-roblox-source-reconcile.mjs'));
  assert.ok(workflow.includes('technical-plan:'));
});
