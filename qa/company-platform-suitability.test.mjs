import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPlatformSuitability} from '../tools/company-platform-suitability.mjs';

test('suitability never removes Roblox or Unity concurrent execution',()=>{
 const result=buildPlatformSuitability({
  catalog:{games:[{id:'g',name:'Game'}]},
  developmentQueue:{items:[{gameId:'g',gameName:'Game',productionClass:'DEVELOPMENT_CONFIRMED'}]}
 });
 const row=result.games[0];
 assert.equal(row.executionMode,'ROBLOX_UNITY_CONCURRENT');
 assert.equal(row.lowerSuitabilityDoesNotDisableDevelopment,true);
 assert.ok(Number.isFinite(row.ROBLOX.score));
 assert.ok(Number.isFinite(row.UNITY.score));
 assert.equal(row.ROBLOX.adaptationProfile,'SOCIAL_FAST_SESSION');
 assert.equal(row.UNITY.adaptationProfile,'DEEP_IMMERSIVE_SESSION');
});
