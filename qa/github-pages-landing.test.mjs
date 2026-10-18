// Regression for live GitHub Pages front-door links and escaped names.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildPagesLanding} from '../tools/github-pages-landing.mjs';

const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('_site/web-games/publish-manifest.json','utf8'));
const exposure=JSON.parse(fs.readFileSync('homepage-platform-exposure.json','utf8'));

test('built project Pages index contains each canonical game link without JavaScript dependency',()=>{
  const index=fs.readFileSync('_site/index.html','utf8');
  const {html,webRoutes,robloxLinks}=buildPagesLanding({catalog,manifest,exposure});
  assert.equal(index,html);
  assert.ok(index.length>2500);
  assert.match(index,/data-jaewoon-pages-home="1"/);
  assert.match(index,/<html lang="ko"/);
  assert.match(index,/name="viewport"/);
  assert.match(index,/id="game-search"/);
  assert.match(index,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.equal(webRoutes.length,manifest.gameCount);
  for(const route of webRoutes){
    assert.ok(fs.existsSync('_site/'+route+'index.html'),'page source missing '+route);
    assert.ok(index.includes('href="./'+route+'"'),'visible static anchor missing '+route);
  }
  assert.equal((index.match(/data-web-card/g)||[]).length,manifest.gameCount+1);
  const expectedRoblox=exposure.games.flatMap(row=>(row.platforms||[]).filter(p=>
    p.platform==='ROBLOX'&&p.historicalInternalRelease===true&&
    /^https:\/\/www\.roblox\.com\/games\/[1-9][0-9]*$/.test(p.internalUrl||'')&&
    String(p.internalUrl).endsWith('/'+String(p.placeId))).map(p=>p.internalUrl));
  assert.deepEqual(robloxLinks.sort(),expectedRoblox.sort());
  for(const url of robloxLinks)assert.ok(index.includes('href="'+url+'"'));
  assert.ok(index.includes('href="./web-games/publish-manifest.json"'));
});

test('new games never enter the static home directory without published manifest route',()=>{
  const rogue={...catalog,games:[...catalog.games,{id:'hidden-rogue',name:'Hidden'}]};
  const same=buildPagesLanding({catalog:rogue,manifest,exposure});
  assert.equal(same.webRoutes.length,manifest.gameCount);
  assert.ok(!same.html.includes('href="./web-games/hidden-rogue/"'));
});

test('bad manifest route and catalog path mismatch fail closed',()=>{
  assert.throws(()=>buildPagesLanding({catalog,manifest:{...manifest,routes:['web-games/../evil/'],gameCount:1},exposure}),/PAGES_HOME_ROUTE_INVALID/);
  assert.throws(()=>buildPagesLanding({catalog,manifest:{...manifest,routes:[...manifest.routes,manifest.routes[0]],gameCount:manifest.gameCount+1},exposure}),/PAGES_HOME_MANIFEST_ROUTES_INVALID/);
  const target=manifest.routes[0]?.split('/')[1];
  const games=catalog.games.map(g=>g.id===target?{...g,canonical:{...g.canonical,sources:{...g.canonical.sources,web:{path:'/web-games/another-one/'}}}}:g);
  assert.throws(()=>buildPagesLanding({catalog:{...catalog,games},manifest,exposure}),/PAGES_HOME_CANONICAL_ROUTE_MISMATCH/);
});

test('homepage escapes potentially malicious catalog fields and excludes unknown Roblox URLs',()=>{
  const target=manifest.routes[0]?.split('/')[1];
  const games=catalog.games.map(g=>g.id===target?{
    ...g,canonical:{...g.canonical,identity:{...g.canonical.identity,name:'<script>alert(1)</script>',description:'" onclick="attack()'}}
  }:g);
  const spoof={...exposure,games:[...exposure.games,{gameId:'fake',platforms:[{platform:'ROBLOX',historicalInternalRelease:true,placeId:'123',internalUrl:'https://attacker.invalid/x'}]}]};
  const output=buildPagesLanding({catalog:{...catalog,games},manifest,exposure:spoof});
  assert.ok(output.html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!output.html.includes('<script>alert(1)</script>'));
  assert.ok(!output.html.includes('https://attacker.invalid/x'));
});
