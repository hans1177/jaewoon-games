import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
const games=Array.isArray(catalog.games)?catalog.games:[];

assert.match(html,/id="metricAll"/);
assert.match(html,/id="metricRoblox"/);
assert.match(html,/id="metricUnity"/);
assert.match(html,/id="metricFortnite"/);
assert.match(html,/id="metricWeb"/);
assert.match(html,/function platformCounts\(\)/);
assert.match(html,/function renderPlatformCounts\(\)/);
assert.match(html,/normalizePublicPlatform\(platformFilter\)===v\.platformKey/);
assert.doesNotMatch(html,/platformFilter==='web'&&v\.hasWeb/);
assert.match(html,/if\(\['WEB','HTML5','BROWSER'\]\.includes\(p\)\)return'WEB'/);
assert.match(html,/btn\.textContent=`\$\{labels\[key\]\|\|key\} \(\$\{counts\[key\]\?\?0\}\)`/);

const normalize=value=>{
  const p=String(value??'').trim().toUpperCase().replace(/[\s-]+/g,'_');
  if(p==='ROBLOX')return'ROBLOX';
  if(['UNITY','UNITY_ANDROID','ANDROID_MOBILE'].includes(p))return'UNITY';
  if(['FORTNITE','FORTNITE_UEFN','UEFN'].includes(p))return'FORTNITE_UEFN';
  if(['WEB','HTML5','BROWSER'].includes(p))return'WEB';
  return'';
};
const selected=games.map(game=>normalize(game.selectedPlatform||game.homepageInfo?.platform||game.canonical?.production?.selectedPlatform)).filter(Boolean);
const counts={
  all:games.length,
  roblox:selected.filter(value=>value==='ROBLOX').length,
  unity:selected.filter(value=>value==='UNITY').length,
  fortnite:selected.filter(value=>value==='FORTNITE_UEFN').length,
  web:selected.filter(value=>value==='WEB').length
};
assert.equal(counts.roblox+counts.unity+counts.fortnite+counts.web,selected.length);
assert(counts.all>=selected.length);
assert(counts.roblox>0);
assert(counts.unity>0);

console.log(`PASS homepage platform filter: total=${counts.all} roblox=${counts.roblox} unity=${counts.unity} fortnite=${counts.fortnite} web=${counts.web}`);
