import assert from 'node:assert/strict';
import fs from 'node:fs';

const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
const renderer=fs.readFileSync('assets/homepage-enhancements.js','utf8');
const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const maintenance=JSON.parse(fs.readFileSync('company-learning/roblox-sustained-maintenance.json','utf8'));

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

const skyline=(catalog.games||[]).find(game=>game.id==='seed-roblox-obby-party-minigam-tower-of-hell');
assert(skyline,'Skyline Rush catalog entry missing');
assert.equal(skyline.name,'Skyline Rush');
assert.equal(skyline.productionClass,'DESIGN_ONLY');
assert.equal(skyline.robloxProjectPath,'roblox-games/seed-roblox-obby-party-minigam-tower-of-hell');
assert.equal(skyline.robloxPublicationTarget?.universeId,'10766723635');
assert.equal(skyline.robloxPublicationTarget?.placeId,'129342889720619');
assert.equal(skyline.robloxPublicationTarget?.verified,true);
assert.equal(skyline.robloxPublicationTarget?.historical,true);
assert.equal(skyline.robloxPublicationTarget?.currentReleaseClaim,false);
assert.equal(skyline.robloxReleaseEvidence?.historicalPublicationTargetVerified,true);
assert.equal(skyline.robloxReleaseEvidence?.actualStudioRuntime,true);
assert.equal(skyline.robloxReleaseEvidence?.postRuntimeIndependentQa,true);
assert.equal(skyline.robloxReleaseEvidence?.regression,true);
assert.equal(skyline.robloxReleaseEvidence?.multiplayerQa,true);
assert.notEqual(skyline.robloxPublicationTarget?.placeId,vector.robloxPublicationTarget?.placeId);

const skylineMaintenance=(maintenance.assets||[]).find(asset=>asset.gameId===skyline.id);
assert(skylineMaintenance,'Skyline Rush sustained maintenance entry missing');
assert.equal(skylineMaintenance.gameName,'Skyline Rush');
assert.equal(skylineMaintenance.maintenanceEligible,true);
assert.equal(skylineMaintenance.currentReleaseClaim,false);
assert.equal(skylineMaintenance.maintenanceMode,'SUSTAINED_POST_DEPLOYMENT_SOURCE_DEVELOPMENT');
assert.equal(skylineMaintenance.evidence?.placeId,'129342889720619');
assert.equal(skylineMaintenance.evidence?.publicationTargetObserved,true);

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

console.log(`PASS homepage portfolio: webGames=${webGames.length}, verifiedRobloxDeployment=Vector Clash+Skyline Rush`);
