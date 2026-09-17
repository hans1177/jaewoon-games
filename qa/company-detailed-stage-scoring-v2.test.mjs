import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WEB_VALIDATION_SCHEMA_VERSION,WEB_COMMON_SCORE_WEIGHTS,WEB_CATEGORY_SCORE_WEIGHTS,WEB_PLATFORM_SCORE_WEIGHTS,WEB_HOMEPAGE_MINIMUM,WEB_PLATFORM_PROMOTION_MINIMUM} from '../tools/company-web-validation-evidence-contract.mjs';
const flow=fs.readFileSync('COMPANY_FLOW.md','utf8');
const sum=o=>Object.values(o).reduce((a,b)=>a+b,0);
test('detailed stage scoring policy preserves current flow thresholds and forbids bonus penalties',()=>{assert.match(flow,/stageGateScoringV2:/);assert.match(flow,/bonusPointsForbidden: true/);assert.match(flow,/penaltyPointsForbidden: true/);assert.equal(WEB_HOMEPAGE_MINIMUM,80);assert.equal(WEB_PLATFORM_PROMOTION_MINIMUM,90);assert.equal(WEB_VALIDATION_SCHEMA_VERSION,15);});
test('web strict score is exactly common55 category25 platform20',()=>{assert.equal(sum(WEB_COMMON_SCORE_WEIGHTS),55);assert.equal(sum(WEB_PLATFORM_SCORE_WEIGHTS),20);for(const [profile,weights] of Object.entries(WEB_CATEGORY_SCORE_WEIGHTS))assert.equal(sum(weights),25,profile);});
test('released games have version and expansion scoring without replacing release score',()=>{assert.match(flow,/LIVE_VERSION_UPDATE_GATE:/);assert.match(flow,/EXPANSION_PACK_GATE:/);assert.match(flow,/updateScoreMustNotReplaceReleaseScore: true/);assert.match(flow,/releasedGamesRemainEligibleForContinuousContentExpansion: true/);});
