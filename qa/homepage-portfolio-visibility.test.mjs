import assert from 'node:assert/strict';
import fs from 'node:fs';

const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
const renderer=fs.readFileSync('assets/homepage-enhancements.js','utf8');
const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));

const webGames=(catalog.games||[]).filter(game=>
  ['ACTIVE','REBUILD'].includes(String(game.lifecycleState||'ACTIVE').toUpperCase())&&
  game.homepageWebPlayable===true&&
  game.hasWebArchive===true&&
  String(game.webPath||'').trim()
);
assert(webGames.length>0,'expected playable web games in catalog');

const vector=(catalog.games||[]).find(game=>game.id==='seed-roblox-battleground-fight-welcome-to-bloxburg');
assert(vector,'Vector Clash catalog entry missing');
assert.equal(vector.name,'Vector Clash');
assert.equal(vector.productionClass,'DESIGN_ONLY');
assert.equal(vector.robloxPublicationTarget?.placeId,'120787429678729');
assert.equal(vector.robloxPublicationTarget?.verified,true);
assert.equal(vector.robloxPublicationTarget?.historical,true);
assert.equal(vector.robloxPublicationTarget?.currentReleaseClaim,false);
assert.equal(vector.robloxReleaseEvidence?.historicalPublicationTargetVerified,true);

assert.match(renderer,/function webPublishedRows\(/);
assert.match(renderer,/function verifiedRobloxDeploymentRows\(/);
assert.match(renderer,/homeWebGameCenter/);
assert.match(renderer,/homeRobloxDeploymentCenter/);
assert.match(renderer,/Roblox 배포 기록/);
assert.match(renderer,/homepageDisplayMode==='WEB_PUBLISHED'/);
assert.match(renderer,/homepageDisplayMode==='ROBLOX_HISTORICAL_DEPLOYMENT'/);
assert.match(renderer,/https:\/\/www\.roblox\.com\/games\/\$\{placeId\}/);

const policy=roadmap.homepagePortfolioVisibility;
assert.equal(policy?.humanDocumentRequired,false);
assert.equal(policy?.webGames?.productionClassPromotionRequired,false);
assert.equal(policy?.robloxDeploymentHistory?.currentReleaseClaimRequired,false);
assert.equal(policy?.robloxDeploymentHistory?.mustNotConvertHistoricalEvidenceIntoCurrentReleaseClaim,true);
assert.equal(policy?.designOnlyMayAppearInWebOrHistoricalDeploymentShelvesWithoutPromotion,true);

console.log(`PASS homepage portfolio: webGames=${webGames.length}, verifiedRobloxDeployment=Vector Clash`);
