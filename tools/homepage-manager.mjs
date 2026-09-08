// 파일명: tools/homepage-manager.mjs
// 역할: 공개 홈페이지의 실제 구조를 짧고 읽기 쉽게 유지하고 게임 대표 이미지/아트북 접근성을 검증한다.
// 원칙: 파일 존재만으로 PASS하지 않고 대표 이미지 고유성, 임시 이미지, 모바일 레이아웃, 아트북 접근을 검사한다.
import fs from 'node:fs';

const readJson=path=>JSON.parse(fs.readFileSync(path,'utf8'));
const readText=path=>fs.readFileSync(path,'utf8');
const exists=path=>fs.existsSync(path);
const roles=['planning','graphics','development','qa','balance'];

const catalog=readJson('game-catalog.json');
const queue=readJson('artbook-submission-queue.json');
const status=readJson('company-status.json');
const books=readJson('game-artbooks.json');
let index=readText('index.html');
const enhancements=readText('assets/homepage-enhancements.js');
const layoutJs=exists('assets/homepage-layout-v2.js')?readText('assets/homepage-layout-v2.js'):'';
const layoutCss=exists('assets/homepage-layout-v2.css')?readText('assets/homepage-layout-v2.css'):'';
const artbookPage=readText('artbook.html');

if(!index.includes('/assets/homepage-layout-v2.css'))index=index.replace('</head>','<link rel="stylesheet" href="/assets/homepage-layout-v2.css">\n</head>');
if(!index.includes('/assets/homepage-layout-v2.js'))index=index.replace('</body>','<script type="module" src="/assets/homepage-layout-v2.js"></script>\n</body>');
index=index.replace('새 게임과 새 테스트 APK는 게시 요청이 있을 때만 여기에 나타나.','다른 게임도 홈에서 확인할 수 있고, 각 게임 아트북은 별도 상세 페이지에서 진행 상태부터 볼 수 있어.');
fs.writeFileSync('index.html',index);

const games=catalog.games||[];
const catalogIds=new Set(games.map(g=>g.id));
const queueIds=new Set((queue.games||[]).map(g=>g.gameId));
const missingCatalog=[...queueIds].filter(id=>!catalogIds.has(id));
const unknownCatalog=[...catalogIds].filter(id=>!queueIds.has(id));
const visibleBooks=(books.artbooks||[]).filter(b=>b.published===true||b.homepageVisible===true);
const brokenBookRefs=visibleBooks.filter(b=>!catalogIds.has(b.gameId)).map(b=>b.id);
const tinyFontMatches=[...index.matchAll(/font-size:(\d+)px/g)].map(m=>Number(m[1])).filter(n=>n<9).length;

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
const duplicateGameImages=[...imageOwners.entries()].filter(([image,owners])=>image&&owners.length>1).map(([image,owners])=>({image,games:owners}));
const placeholderGameImages=games.filter(game=>{
  const image=String(game.image||'').trim();
  if(/(?:^|\/)(?:mock|portal|page-bg(?:-v\d+)?|monster-adventure-card)\.(?:webp|png|jpg|jpeg|svg)$/i.test(image))return true;
  if(game.id!=='daechung-rpg'&&/(?:^|\/)fantasy-rpg-v2\.webp$/i.test(image))return true;
  return false;
}).map(game=>game.id);
const validGameImages=games.filter(game=>!brokenGameImages.includes(game.id)&&!placeholderGameImages.includes(game.id)&&!duplicateGameImages.some(d=>d.games.includes(game.id))).length;

const checks={
  indexExists:exists('index.html'),
  artbookDetailExists:exists('artbook.html'),
  homepageEnhancementLoaded:index.includes('/assets/homepage-enhancements.js')||index.includes('assets/homepage-enhancements.js'),
  compactLayoutCssLoaded:index.includes('/assets/homepage-layout-v2.css')&&layoutCss.includes('.gameCard .artbookDirect'),
  compactLayoutJsLoaded:index.includes('/assets/homepage-layout-v2.js')&&layoutJs.includes('installExtrasDetails'),
  everyGameGetsArtbookLink:layoutJs.includes('/artbook.html?game=')&&layoutJs.includes("document.querySelectorAll('.gameCard')"),
  progressArtbooksMayBeViewed:layoutJs.includes('아트북 제작중')&&layoutJs.includes('sectionsReady'),
  runtimeHealthBadgeHidden:layoutJs.includes("querySelectorAll?.('.healthBadge')")&&layoutCss.includes('.healthBadge{display:none!important}'),
  mobileCardsStackVertically:layoutCss.includes('.gameCard{display:block!important}')&&layoutCss.includes('aspect-ratio:16/9!important'),
  lowPriorityHomeSectionsCollapsed:layoutJs.includes("document.querySelector('.reviews')")&&layoutJs.includes('homeExtras'),
  noSevereTinyFontExplosion:tinyFontMatches<30,
  allQueuedGamesInCatalog:missingCatalog.length===0,
  publishedBooksReferenceCatalogGames:brokenBookRefs.length===0,
  requiredArtbookRolesIntact:JSON.stringify(queue.requiredRoles||[])===JSON.stringify(roles),
  webGamesRemainReadOnly:status?.policy?.webGames==='archive-read-only',
  autoMaintenanceEnabled:status?.policy?.homepageOperations?.autoMaintenance===true,
  artbookPageSupportsGameSelection:artbookPage.includes("params.get('game')")||artbookPage.includes('params.get("game")'),
  allGameImagesPresent:games.length>0&&brokenGameImages.length===0,
  allGameImagesUnique:duplicateGameImages.length===0,
  noPlaceholderGameImages:placeholderGameImages.length===0,
  allCurrentGameImagesValid:games.length===11&&validGameImages===11
};

const failures=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
const now=new Date();
const kstDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const kstTime=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now);

const managerStatus={
  version:3,
  checkedAtKst:kstTime,
  dateKst:kstDate,
  manager:'homepage',
  status:failures.length?'attention':'running',
  policy:{otherGamesMayAppearOnHomepage:true,homepageMustStayCompact:true,preferredPattern:'short-cards -> dedicated-artbook-detail-page',artbookVisibilityIsProductionApproval:false,webArchiveWriteBack:false,runtimeGameHealthBadgeVisible:false,gameCardsRequireUniqueTitleImages:true},
  counts:{catalogGames:games.length,artbookQueueGames:queue.games?.length||0,visibleArtbooks:visibleBooks.length,tinyFontRulesBelow9px:tinyFontMatches,gameImagesValid:validGameImages,duplicateGameImages:duplicateGameImages.length,placeholderGameImages:placeholderGameImages.length,brokenGameImages:brokenGameImages.length},
  checks,
  findings:{missingCatalog,unknownCatalog,brokenBookRefs,brokenGameImages,duplicateGameImages,placeholderGameImages,failures}
};
fs.writeFileSync('homepage-manager-status.json',JSON.stringify(managerStatus,null,2)+'\n');

status.policy||={};status.policy.homepageOperations||={};
Object.assign(status.policy.homepageOperations,{manager:'homepage',autoMaintenance:true,otherGamesMayAppearOnHomepage:true,homepageLengthControl:'compact-cards-and-dedicated-artbook-detail-pages',publicationVisibilityIsProductionApproval:false,runtimeGameHealthBadgeVisible:false,gameCardsRequireUniqueTitleImages:true,statusFile:'homepage-manager-status.json',workflow:'.github/workflows/homepage-manager.yml'});
status.operations||={};status.operations.homepage||={};
Object.assign(status.operations.homepage,{manager:'homepage',status:failures.length?'attention':'running',task:'홈 길이·11개 게임 고유 대표 이미지·진행 중 아트북·링크·모바일 가독성을 실제 화면 기준으로 관리',lastReviewedAt:kstDate,lastCheckResult:failures.length?`ATTENTION:${failures.join(',')}`:'PASS',execution:'github-actions',workflow:'.github/workflows/homepage-manager.yml',statusFile:'homepage-manager-status.json'});
fs.writeFileSync('company-status.json',JSON.stringify(status,null,2)+'\n');

console.log(`HOMEPAGE_MANAGER=${managerStatus.status.toUpperCase()}`);
console.log(`HOMEPAGE_CHECKS=${Object.keys(checks).length-failures.length}/${Object.keys(checks).length}`);
console.log(`HOMEPAGE_CATALOG=${managerStatus.counts.catalogGames}`);
console.log(`HOMEPAGE_VISIBLE_ARTBOOKS=${managerStatus.counts.visibleArtbooks}`);
console.log(`HOMEPAGE_GAME_IMAGES=${validGameImages}/${games.length}`);
console.log(`HOMEPAGE_DUPLICATE_GAME_IMAGES=${duplicateGameImages.length}`);
console.log(`HOMEPAGE_PLACEHOLDER_GAME_IMAGES=${placeholderGameImages.length}`);
console.log(`HOMEPAGE_BROKEN_GAME_IMAGES=${brokenGameImages.length}`);
console.log('RUNTIME_HEALTH_BADGE=HIDDEN');
if(failures.length){console.error(`HOMEPAGE_FAILURES=${failures.join(',')}`);process.exitCode=1;}
