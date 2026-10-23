// 파일명: qa/github-pages-landing.test.mjs
// 기존 공식 홈페이지 보존, 32개 원본 게임·멀티 서버·Pages PWA 연결 검증.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildPagesLanding,isSafePagesRemovalAsset} from '../tools/github-pages-landing.mjs';

const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('_site/web-games/publish-manifest.json','utf8'));
const exposure=JSON.parse(fs.readFileSync('homepage-platform-exposure.json','utf8'));
const official='https://hans1177.github.io/jaewoon-games/';
const pagesRoot='/jaewoon-games/';

test('OWNER LOCK: every main merge triggers the existing Pages publisher without paths or approval gates',()=>{
  const workflow=fs.readFileSync('.github/workflows/magic-forest-pages.yml','utf8');
  const push=workflow.split('  push:')[1]?.split('  workflow_dispatch:')[0]||'';
  assert.match(push,/branches:\s*\[main\]/);
  assert.doesNotMatch(push,/^\s*(?:paths|paths-ignore|if):/m,'main merge publication must not be filtered or gated');
  const deployHeader=workflow.split('  deploy:')[1]?.split('    steps:')[0]||'';
  const publishHeader=workflow.split('  publish-pages:')[1]?.split('    steps:')[0]||'';
  assert.doesNotMatch(deployHeader,/\s+if:/,'build job cannot depend on QA or director preapproval');
  assert.match(publishHeader,/needs: deploy/);
  assert.match(publishHeader,/if: github\.event_name != 'pull_request'/);
  assert.doesNotMatch(publishHeader,/needs: \[|success\(\)|result ==|approval|qa_pass/i);
  assert.doesNotMatch(workflow.split('jobs:')[0],/^concurrency:/m,
    'slow post-publication browser QA must never retain the global Pages publication lock');
  assert.match(publishHeader,/group: magic-forest-pages-main-publish/);
  assert.match(publishHeader,/cancel-in-progress: false/);
  assert.match(workflow,/id: latest_main/);
  assert.match(workflow,/if: steps.latest_main.outputs.publish == 'true'/);
  assert.match(workflow,/id: live_revision/);
  assert.match(workflow,/post-publication-3d-smoke:/);
  assert.match(workflow,/PAGES_SMOKE_EXACT_SHA=PASS|POST_PUBLISH_SMOKE_EXACT_SHA=PASS/);
  assert.match(workflow,/name: Register post-publication WebGL smoke failure/);
  const assemble=workflow.indexOf('      - name: Assemble existing canonical homepage for automatic static publication');
  const prCheck=workflow.indexOf('      - name: Verify every published game route and the canonical official homepage');
  const publication=workflow.indexOf('      - name: Publish gh-pages without force or deleting earlier games');
  assert.ok(assemble>0&&prCheck>assemble&&publication>prCheck);
  assert.match(workflow.slice(assemble,prCheck),/node tools\/github-pages-landing\.mjs/);
  assert.doesNotMatch(workflow.slice(assemble,prCheck),/node --test/,'post-merge assembly is not an extra QA gate');
  assert.match(workflow.slice(prCheck,publication),/if: github\.event_name == 'pull_request'/);
  assert.match(workflow,/name: Publish gh-pages without force or deleting earlier games/);
  assert.match(workflow,/uses: actions\/deploy-pages@v4/);
});

test('OWNER LOCK: Director tests published game routes and files issues without blocking Pages deployment',()=>{
  const workflow=fs.readFileSync('.github/workflows/magic-forest-pages.yml','utf8');
  const published=workflow.indexOf('uses: actions/deploy-pages@v4');
  const live=workflow.indexOf('      - name: Verify live GitHub Pages source and game routes');
  const issue=workflow.indexOf('      - name: Director register issues after live game testing');
  assert.ok(published>0&&live>published&&issue>live,'post-deploy checking and issue registration must follow actual deployment');
  const liveSection=workflow.slice(live,issue);
  assert.match(liveSection,/id: director_live_qa/);
  assert.match(liveSection,/continue-on-error: true/);
  assert.match(liveSection,/WEB_PAGES_ROUTE_NOT_LIVE=/);
  assert.match(liveSection,/DIRECTOR_POST_DEPLOY_GAME_TEST=PASS/);
  const issueSection=workflow.slice(issue);
  assert.match(issueSection,/steps\.director_live_qa\.outcome == 'failure'/);
  assert.match(issueSection,/gh issue create/);
  assert.match(issueSection,/gh issue list/);
  assert.match(workflow,/issues: write/);
  assert.doesNotMatch(workflow,/gh issue create[\s\S]*uses: actions\/deploy-pages@v4/,'issue filing cannot be a precondition for publication');
});

test('published asset manifest excludes owner-retired assets while retaining live source files',()=>{
  assert.ok(Array.isArray(manifest.sharedAssets)&&manifest.sharedAssets.length>0);
  assert.ok(manifest.sharedAssets.every(asset=>asset.startsWith('assets/')
    &&!asset.split('/').some(segment=>segment.startsWith('.'))),
    'Git hidden dotfiles must not be advertised as live HTTP assets');
  const retired=catalog.permanentRemovalPolicy?.removedAssetFiles||[];
  for(const asset of retired){
    assert.ok(isSafePagesRemovalAsset(asset),'owner-retired path must remain safely bounded: '+asset);
    assert.ok(!manifest.sharedAssets.includes(asset),'removed asset must not be advertised as live: '+asset);
    assert.ok(!fs.existsSync('_site/'+asset),'removed asset must not remain staged: '+asset);
  }
  const required='assets/homepage-enhancements.js';
  assert.ok(manifest.sharedAssets.includes(required),'retained homepage runtime must be advertised');
  assert.ok(fs.existsSync('_site/'+required),'retained homepage runtime must be staged');
});

test('asset removal path guard permits exact owner nested paths, never traversal or executable paths',()=>{
  for(const valid of [
    'assets/homepage-covers/ant-simulator.webp',
    'assets/roblox/horror-lore-v1/README.md',
    'assets/roblox/monster-adventure-v1/hornbull.obj',
    'assets/shared/humanoid-traveler.glb'
  ])assert.equal(isSafePagesRemovalAsset(valid),true,valid);
  for(const invalid of [
    '../assets/shared/creature-wolf.glb','assets/../company-status.json',
    'assets/roblox/../../index.html','assets/.git/config','assets//shared/model.glb',
    'assets/shared/evil.sh','web-games/survival/index.html','assets/shared/forest/../../foo.glb'
  ])assert.equal(isSafePagesRemovalAsset(invalid),false,invalid);
});

test('GitHub Pages publishes the exact existing homepage markup, not a Cloudflare redirect',()=>{
  const index=fs.readFileSync('_site/index.html','utf8');
  const source=fs.readFileSync('index.html','utf8');
  const {html,webRoutes,robloxLinks}=buildPagesLanding({catalog,manifest,exposure});
  assert.equal(index,html);
  assert.equal(html,source.replace(/(["'\x60])\/(?!\/)/g,'$1'+pagesRoot));
  assert.match(html,/data-homepage-version="SAMPLE_FRONT_DOOR_V1"/);
  assert.match(html,/id="gameHub"/);
  assert.match(html,/class="mobileDock"/);
  assert.ok(html.includes('src="'+pagesRoot+'assets/homepage-enhancements.js"'));
  assert.ok(html.includes('href="'+pagesRoot+'manifest.webmanifest"'));
  assert.doesNotMatch(html,/data-jaewoon-pages-redirect|http-equiv="refresh"/i);
  assert.ok(!html.includes('url=https://jaewoon-games.pages.dev/'));
  assert.equal(webRoutes.length,manifest.gameCount);
  assert.ok(webRoutes.length>=32,'previously published 32 games must be retained');
  assert.ok(official.startsWith('https://hans1177.github.io/'));
  for(const route of webRoutes){
    assert.ok(fs.existsSync('_site/'+route+'index.html'),'published original route missing: '+route);
  }
  const expectedRoblox=exposure.games.flatMap(row=>(row.platforms||[]).filter(p=>
    p.platform==='ROBLOX'&&p.historicalInternalRelease===true&&
    /^https:\/\/www\.roblox\.com\/games\/[1-9][0-9]*$/.test(p.internalUrl||'')&&
    String(p.internalUrl).endsWith('/'+String(p.placeId))).map(p=>p.internalUrl));
  assert.deepEqual(robloxLinks.sort(),expectedRoblox.sort());
});

test('homepage uses canonical runtime data and links without separate availability gate',()=>{
  const script=fs.readFileSync('_site/assets/homepage-enhancements.js','utf8');
  for(const file of [
    'game-catalog.json','company-status.json','homepage-platform-exposure.json',
    'homepage-portfolio-status.json','manifest.webmanifest','sw.js',
    'multiplayer/multiplayer-client.js'
  ])assert.ok(fs.statSync('_site/'+file).size>50,file+' should be published');
  assert.ok(script.includes("getJson('"+pagesRoot+"game-catalog.json')"));
  assert.ok(script.includes("getJson('"+pagesRoot+"company-status.json')"));
  assert.ok(script.includes("getJson('"+pagesRoot+"homepage-platform-exposure.json')"));
  assert.ok(script.includes('function sourceWebHref(row)'));
  // 페이지 prefix 변환은 /web-games/ URL만 바꾸고 카탈로그 경로 정규화는 보존해야 한다.
  assert.ok(script.includes(".split('/').filter(Boolean).join('/')"));
  assert.ok(!script.includes(".split('/jaewoon-games/')"));
  assert.ok(script.includes("(index+1)+'/'+total"));
  assert.ok(script.includes("(target+1)+'/'+total"));
  assert.ok(script.includes('links.web||links.webSource'));
  assert.ok(script.includes(official));
  const pwa=JSON.parse(fs.readFileSync('_site/manifest.webmanifest','utf8'));
  assert.equal(pwa.start_url,pagesRoot);
  assert.equal(pwa.scope,pagesRoot);
  assert.ok(pwa.icons.every(row=>row.src.startsWith(pagesRoot)));
  const pwaScript=fs.readFileSync('_site/sw.js','utf8');
  assert.ok(pwaScript.includes(pagesRoot+'command.html'));
  const client=fs.readFileSync('_site/multiplayer/multiplayer-client.js','utf8');
  assert.ok(client.includes('https://jaewoon-multiplayer.anyanguy12.workers.dev'));
  assert.ok(client.includes('new WebSocket(url)'));
});

test('game home button resolves to official homepage on both GitHub Pages and Cloudflare',()=>{
  const forest=fs.readFileSync('_site/web-games/fantasy-survival/index.html','utf8');
  const homeLink=forest.match(/<a\s+class="home"\s+href="([^"]+)"/);
  assert.ok(homeLink,'game home link is required');
  const href=homeLink[1];
  const gitHubGame='https://hans1177.github.io/jaewoon-games/web-games/fantasy-survival/';
  const cloudflareGame='https://jaewoon-games.pages.dev/web-games/fantasy-survival/';
  assert.equal(new URL(href,gitHubGame).href,'https://hans1177.github.io/jaewoon-games/',
    'game home must keep GitHub Pages project root');
  assert.equal(new URL(href,cloudflareGame).href,'https://jaewoon-games.pages.dev/',
    'game home must keep Cloudflare Pages site root');
  assert.ok(fs.existsSync('_site/tier.html'));
});

test('unpublished game is never added to the published route list',()=>{
  const extra={...catalog,games:[...catalog.games,{id:'hidden-rogue',name:'Hidden'}]};
  const output=buildPagesLanding({catalog:extra,manifest,exposure});
  assert.equal(output.webRoutes.length,manifest.gameCount);
  assert.ok(!output.webRoutes.includes('web-games/hidden-rogue/'));
  assert.equal(output.html.includes('hidden-rogue'),false);
});

test('invalid manifest and mismatched canonical paths fail closed',()=>{
  assert.throws(()=>buildPagesLanding({catalog,manifest:{...manifest,routes:['web-games/../evil/'],gameCount:1},exposure}),/PAGES_HOME_ROUTE_INVALID/);
  assert.throws(()=>buildPagesLanding({catalog,manifest:{...manifest,routes:[...manifest.routes,manifest.routes[0]],gameCount:manifest.gameCount+1},exposure}),/PAGES_HOME_MANIFEST_ROUTES_INVALID/);
  const target=manifest.routes[0]?.split('/')[1];
  const games=catalog.games.map(g=>g.id===target?{...g,canonical:{...g.canonical,sources:{...g.canonical.sources,web:{path:'/web-games/another-one/'}}}}:g);
  assert.throws(()=>buildPagesLanding({catalog:{...catalog,games},manifest,exposure}),/PAGES_HOME_CANONICAL_ROUTE_MISMATCH/);
});

test('catalog text and unverified external addresses are never injected into static home markup',()=>{
  const target=manifest.routes[0]?.split('/')[1];
  const games=catalog.games.map(g=>g.id===target?{...g,canonical:{...g.canonical,identity:{...g.canonical.identity,name:'<script>alert(1)</script>'}}}:g);
  const injected={...exposure,games:[...exposure.games,{gameId:'fake',platforms:[{platform:'ROBLOX',historicalInternalRelease:true,placeId:'123',internalUrl:'https://attacker.invalid/x'}]}]};
  const output=buildPagesLanding({catalog:{...catalog,games},manifest,exposure:injected});
  assert.equal(output.html.includes('<script>alert(1)</script>'),false);
  assert.equal(output.html.includes('https://attacker.invalid/x'),false);
});
