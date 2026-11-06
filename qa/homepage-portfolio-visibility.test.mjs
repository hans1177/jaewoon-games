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
assert.equal(webGames.length,0,'legacy HTML games are archived, not marked as verified Unity WebGL');
assert((catalog.games||[]).some(game=>game.id==='ant-simulator'&&game.hasWebArchive===true&&game.homepageWebPlayable===false),'preserve legacy game source and catalog identity');

// 영구 제거된 게임은 과거 배포 기록이 있어도 카탈로그에 되살리지 않는다.
const removed=new Set(catalog.permanentRemovalPolicy?.ids||[]);
assert(removed.has('seed-roblox-battleground-fight-welcome-to-bloxburg'));
assert(removed.has('seed-roblox-obby-party-minigam-tower-of-hell'));
for(const id of removed)assert(!(catalog.games||[]).some(game=>game.id===id),'removed game reappeared: '+id);
// 일반 웹 아카이브는 남기지만 3D Unity WebGL QA 없이는 노출하지 않는다.
assert(renderer.includes('return Boolean(internalReleaseLinks(game).unityWeb);'));
assert(renderer.includes('manifest.homepageVerified!==true'));
assert(!renderer.includes("button(links.web,'웹 플레이'"));

assert.match(renderer,/function webPublishedRows\(/);
assert.match(renderer,/function verifiedRobloxDeploymentRows\(/);
assert.match(renderer,/homeWebGameCenter/);
assert.match(renderer,/homeRobloxDeploymentCenter/);
assert.match(renderer,/Roblox 배포 기록/);
assert.match(renderer,/game\.unityWebAvailable===true/);
assert.match(renderer,/ROBLOX_HISTORICAL_DEPLOYMENT/);
assert(renderer.includes('historicalPublicationTargetVerified===true'));

const policy=roadmap.homepagePortfolioVisibility;
assert.equal(policy?.humanDocumentRequired,false);
assert.equal(policy?.webGames?.productionClassPromotionRequired,false);
assert.equal(policy?.robloxDeploymentHistory?.currentReleaseClaimRequired,false);
assert.equal(policy?.robloxDeploymentHistory?.mustNotConvertHistoricalEvidenceIntoCurrentReleaseClaim,true);
assert.equal(policy?.designOnlyMayAppearInWebOrHistoricalDeploymentShelvesWithoutPromotion,true);

console.log(`PASS homepage portfolio: legacyWebPublished=${webGames.length}, permanentRemovalPreserved=${removed.size}`);
