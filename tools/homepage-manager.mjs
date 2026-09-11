// 파일명: tools/homepage-manager.mjs
// 역할: 홈페이지를 수정하지 않고 현재 홈 구조와 게임 데이터만 진단한다.
// 원칙: 자동 배치 변경 금지. index.html, company-status.json 등 운영 파일에 쓰지 않는다.
// 현재 game-catalog만 활성 멤버십으로 보고 과거 artbook queue 항목은 이력으로 보존한다.
import fs from 'node:fs';

const readJson=path=>JSON.parse(fs.readFileSync(path,'utf8'));
const readText=path=>fs.readFileSync(path,'utf8');
const exists=path=>fs.existsSync(path);
const roles=['planning','graphics','development','qa','balance'];

const catalog=readJson('game-catalog.json');
const queue=readJson('artbook-submission-queue.json');
const status=readJson('company-status.json');
const books=readJson('game-artbooks.json');
const index=readText('index.html');

const games=catalog.games||[];
const catalogIds=new Set(games.map(g=>g.id));
const historicalQueueGames=(queue.games||[]).filter(g=>g.source!=='INCUBATOR_METADATA_ONLY'&&g.currentStage!=='incubator-concept-redesign');
const historicalQueueIds=new Set(historicalQueueGames.map(g=>g.gameId));
const legacyQueueEntries=[...historicalQueueIds].filter(id=>!catalogIds.has(id));
const visibleBooks=(books.artbooks||[]).filter(b=>b.published===true||b.homepageVisible===true);
const brokenBookRefs=visibleBooks.filter(b=>!catalogIds.has(b.gameId)).map(b=>b.id);

const imageOwners=new Map();
for(const game of games){
  const image=String(game.image||'').trim();
  if(!imageOwners.has(image))imageOwners.set(image,[]);
  imageOwners.get(image).push(game.id);
}

const brokenGameImages=games.filter(game=>{
  const image=String(game.image||'').trim();
  if(!image||!exists(image))return true;
  try{return fs.statSync(image).size<256;}catch{return true;}
}).map(game=>game.id);

const duplicateGameImages=[...imageOwners.entries()]
  .filter(([image,owners])=>image&&owners.length>1)
  .map(([image,owners])=>({image,games:owners}));

const placeholderGameImages=games.filter(game=>{
  const image=String(game.image||'').trim();
  if(/(?:^|\/)(?:mock|portal|page-bg(?:-v\d+)?|monster-adventure-card)\.(?:webp|png|jpg|jpeg|svg)$/i.test(image))return true;
  if(game.id!=='daechung-rpg'&&/(?:^|\/)fantasy-rpg-v2\.webp$/i.test(image))return true;
  return false;
}).map(game=>game.id);

const checks={
  indexExists:exists('index.html'),
  homepageEnhancementLoaded:index.includes('/assets/homepage-enhancements.js')||index.includes('assets/homepage-enhancements.js'),
  automaticLayoutInjectionAbsent:!index.includes('/assets/homepage-layout-v2.css')&&!index.includes('/assets/homepage-layout-v2.js'),
  activeCatalogNonEmpty:games.length>0,
  publishedBooksReferenceCatalogGames:brokenBookRefs.length===0,
  requiredArtbookRolesIntact:JSON.stringify(queue.requiredRoles||[])===JSON.stringify(roles),
  existingWebMaintenancePolicyAligned:status?.policy?.webGames==='existing-maintenance-allowed'&&status?.policy?.existingWebMaintenance===true&&status?.policy?.newWebGameProduction===false,
  activeCatalogUsesSemanticProductionClasses:games.every(game=>['DESIGN_ONLY','DEVELOPMENT_CONFIRMED','RELEASE_CONFIRMED'].includes(String(game.productionClass||''))),
  allGameImagesPresent:brokenGameImages.length===0,
  allGameImagesUnique:duplicateGameImages.length===0,
  noPlaceholderGameImages:placeholderGameImages.length===0
};

const failures=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);

console.log(`HOMEPAGE_DIAGNOSTICS=${failures.length?'ATTENTION':'PASS'}`);
console.log(`HOMEPAGE_CHECKS=${Object.keys(checks).length-failures.length}/${Object.keys(checks).length}`);
console.log(`HOMEPAGE_CATALOG=${games.length}`);
console.log(`HOMEPAGE_VISIBLE_ARTBOOKS=${visibleBooks.length}`);
console.log(`HOMEPAGE_LEGACY_QUEUE_ENTRIES=${legacyQueueEntries.length}`);
console.log(`HOMEPAGE_BROKEN_GAME_IMAGES=${brokenGameImages.length}`);
console.log(`HOMEPAGE_DUPLICATE_GAME_IMAGES=${duplicateGameImages.length}`);
console.log(`HOMEPAGE_PLACEHOLDER_GAME_IMAGES=${placeholderGameImages.length}`);
console.log('HOMEPAGE_CATALOG_COUNT_POLICY=DYNAMIC');
console.log('HOMEPAGE_LEGACY_QUEUE_POLICY=HISTORY_ONLY');
console.log(`HOMEPAGE_AUTO_LAYOUT_WRITE=DISABLED`);
if(failures.length){
  console.error(`HOMEPAGE_FAILURES=${failures.join(',')}`);
  process.exitCode=1;
}
