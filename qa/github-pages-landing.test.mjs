// 파일명: qa/github-pages-landing.test.mjs
// 기존 공식 홈페이지 보존, 32개 원본 게임·멀티 서버·Pages PWA 연결 검증.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildPagesLanding} from '../tools/github-pages-landing.mjs';

const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('_site/web-games/publish-manifest.json','utf8'));
const exposure=JSON.parse(fs.readFileSync('homepage-platform-exposure.json','utf8'));
const official='https://hans1177.github.io/jaewoon-games/';
const pagesRoot='/jaewoon-games/';

test('game source and homepage media changes trigger the existing automatic main Pages deployment',()=>{
  const workflow=fs.readFileSync('.github/workflows/magic-forest-pages.yml','utf8');
  const push=workflow.split('  push:')[1]?.split('  workflow_dispatch:')[0]||'';
  assert.match(push,/branches:\s*\[main\]/);
  assert.match(push,/- "web-games\/\*\*"/);
  assert.match(push,/- "game-catalog\.json"/);
  assert.match(push,/- "assets\/\*\*"/);
  assert.doesNotMatch(push,/- "!assets\/homepage-(?:media|covers)\/\*\*"/);
  assert.match(workflow,/group: magic-forest-pages-\$\{\{ github\.event_name == 'pull_request'/);
  assert.match(workflow,/cancel-in-progress: false/);
  // Original work automatically republishes without an extra homepage-only deployment approval.
  assert.match(workflow,/name: Publish gh-pages without force or deleting earlier games/);
  assert.match(workflow,/name: Verify every published game route and the canonical official homepage/);
  assert.match(workflow,/name: Publish GitHub Pages|name: Deploy to GitHub Pages|uses: actions\/deploy-pages@v4/);
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

test('game home button points back to project homepage instead of github.io host root',()=>{
  const forest=fs.readFileSync('_site/web-games/fantasy-survival/index.html','utf8');
  assert.match(forest,/class="home"\s+href="\/jaewoon-games\/"/);
  assert.doesNotMatch(forest,/class="home"\s+href="\/"/);
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
