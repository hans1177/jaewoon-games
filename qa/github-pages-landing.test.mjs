// 파일명: qa/github-pages-landing.test.mjs
// GitHub Pages 두 번째 홈페이지 제거, 기존 배포 경로 및 등록된 로블록스 주소 보존 검증.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildPagesLanding} from '../tools/github-pages-landing.mjs';

const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('_site/web-games/publish-manifest.json','utf8'));
const exposure=JSON.parse(fs.readFileSync('homepage-platform-exposure.json','utf8'));
const official='https://jaewoon-games.pages.dev/';

test('project Pages root redirects only to the existing official homepage while retaining every game file',()=>{
  const index=fs.readFileSync('_site/index.html','utf8');
  const {html,webRoutes,robloxLinks}=buildPagesLanding({catalog,manifest,exposure});
  assert.equal(index,html);
  assert.match(index,/data-jaewoon-pages-redirect="1"/);
  assert.ok(index.includes('<meta http-equiv="refresh" content="0;url='+official+'">'));
  assert.ok(index.includes('<link rel="canonical" href="'+official+'">'));
  assert.ok(index.includes('href="'+official+'"'));
  assert.doesNotMatch(index,/id="web-grid"|id="game-search"|data-web-card|data-jaewoon-pages-home=/);
  assert.equal(webRoutes.length,manifest.gameCount);
  for(const route of webRoutes){
    assert.ok(fs.existsSync('_site/'+route+'index.html'),'original game route missing: '+route);
  }
  const expectedRoblox=exposure.games.flatMap(row=>(row.platforms||[]).filter(p=>
    p.platform==='ROBLOX'&&p.historicalInternalRelease===true&&
    /^https:\/\/www\.roblox\.com\/games\/[1-9][0-9]*$/.test(p.internalUrl||'')&&
    String(p.internalUrl).endsWith('/'+String(p.placeId))).map(p=>p.internalUrl));
  assert.deepEqual(robloxLinks.sort(),expectedRoblox.sort());
});

test('unpublished game is never added to the validated published game route list',()=>{
  const extra={...catalog,games:[...catalog.games,{id:'hidden-rogue',name:'Hidden'}]};
  const output=buildPagesLanding({catalog:extra,manifest,exposure});
  assert.equal(output.webRoutes.length,manifest.gameCount);
  assert.ok(!output.webRoutes.includes('web-games/hidden-rogue/'));
  assert.equal(output.html.includes('hidden-rogue'),false);
});

test('invalid manifest and mismatch against canonical game paths still fail closed',()=>{
  assert.throws(()=>buildPagesLanding({catalog,manifest:{...manifest,routes:['web-games/../evil/'],gameCount:1},exposure}),/PAGES_HOME_ROUTE_INVALID/);
  assert.throws(()=>buildPagesLanding({catalog,manifest:{...manifest,routes:[...manifest.routes,manifest.routes[0]],gameCount:manifest.gameCount+1},exposure}),/PAGES_HOME_MANIFEST_ROUTES_INVALID/);
  const target=manifest.routes[0]?.split('/')[1];
  const games=catalog.games.map(g=>g.id===target?{...g,canonical:{...g.canonical,sources:{...g.canonical.sources,web:{path:'/web-games/another-one/'}}}}:g);
  assert.throws(()=>buildPagesLanding({catalog:{...catalog,games},manifest,exposure}),/PAGES_HOME_CANONICAL_ROUTE_MISMATCH/);
});

test('catalog text and unverified external addresses never appear on the redirect page',()=>{
  const target=manifest.routes[0]?.split('/')[1];
  const games=catalog.games.map(g=>g.id===target?{...g,canonical:{...g.canonical,identity:{...g.canonical.identity,name:'<script>alert(1)</script>'}}}:g);
  const injected={...exposure,games:[...exposure.games,{gameId:'fake',platforms:[{platform:'ROBLOX',historicalInternalRelease:true,placeId:'123',internalUrl:'https://attacker.invalid/x'}]}]};
  const output=buildPagesLanding({catalog:{...catalog,games},manifest,exposure:injected});
  assert.equal(output.html.includes('<script>alert(1)</script>'),false);
  assert.equal(output.html.includes('https://attacker.invalid/x'),false);
  assert.equal(output.html.includes(official),true);
});
