// tools/homepage-manager.mjs
// Verifies that the public homepage stays compact, accurate, mobile-oriented, and aligned with current company policy.
import fs from 'node:fs';

const readJson = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const readText = path => fs.readFileSync(path, 'utf8');
const exists = path => fs.existsSync(path);
const roles = ['planning', 'graphics', 'development', 'qa', 'balance'];

const catalog = readJson('game-catalog.json');
const queue = readJson('artbook-submission-queue.json');
const status = readJson('company-status.json');
const books = readJson('game-artbooks.json');
const index = readText('index.html');
const enhancements = readText('assets/homepage-enhancements.js');

const catalogIds = new Set((catalog.games || []).map(g => g.id));
const queueIds = new Set((queue.games || []).map(g => g.gameId));
const missingCatalog = [...queueIds].filter(id => !catalogIds.has(id));
const unknownCatalog = [...catalogIds].filter(id => !queueIds.has(id));
const publishedBooks = (books.artbooks || []).filter(b => b.published === true);
const brokenBookRefs = publishedBooks.filter(b => !catalogIds.has(b.gameId)).map(b => b.id);

const checks = {
  indexExists: exists('index.html'),
  artbookDetailExists: exists('artbook.html'),
  homepageEnhancementLoaded: index.includes('/assets/homepage-enhancements.js') || index.includes('assets/homepage-enhancements.js'),
  compactArtbookUiPresent: enhancements.includes('preArtbook') && enhancements.includes('artbook.html?id='),
  allQueuedGamesInCatalog: missingCatalog.length === 0,
  publishedBooksReferenceCatalogGames: brokenBookRefs.length === 0,
  requiredArtbookRolesIntact: JSON.stringify(queue.requiredRoles || []) === JSON.stringify(roles),
  webGamesRemainReadOnly: status?.policy?.webGames === 'archive-read-only',
  autoMaintenanceEnabled: status?.policy?.homepageOperations?.autoMaintenance === true,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const now = new Date();
const kstDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(now);
const kstTime = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
}).format(now);

const managerStatus = {
  version: 1,
  checkedAtKst: kstTime,
  dateKst: kstDate,
  manager: 'homepage',
  status: failures.length ? 'attention' : 'running',
  policy: {
    otherGamesMayAppearOnHomepage: true,
    homepageMustStayCompact: true,
    preferredPattern: 'short-cards -> dedicated-artbook-detail-page',
    artbookVisibilityIsProductionApproval: false,
    webArchiveWriteBack: false,
  },
  counts: {
    catalogGames: catalog.games?.length || 0,
    artbookQueueGames: queue.games?.length || 0,
    publishedArtbooks: publishedBooks.length,
  },
  checks,
  findings: {
    missingCatalog,
    unknownCatalog,
    brokenBookRefs,
  },
};

fs.writeFileSync('homepage-manager-status.json', JSON.stringify(managerStatus, null, 2) + '\n');

status.policy ||= {};
status.policy.homepageOperations ||= {};
Object.assign(status.policy.homepageOperations, {
  manager: 'homepage',
  autoMaintenance: true,
  otherGamesMayAppearOnHomepage: true,
  homepageLengthControl: 'compact-cards-and-dedicated-artbook-detail-pages',
  publicationVisibilityIsProductionApproval: false,
  statusFile: 'homepage-manager-status.json',
  workflow: '.github/workflows/homepage-manager.yml',
});
status.operations ||= {};
status.operations.homepage ||= {};
Object.assign(status.operations.homepage, {
  manager: 'homepage',
  status: failures.length ? 'attention' : 'running',
  task: '게임 카드·아트북·상태·링크·모바일 UX를 짧고 정확하게 상시 관리',
  lastReviewedAt: kstDate,
  lastCheckResult: failures.length ? `ATTENTION:${failures.join(',')}` : 'PASS',
  execution: 'github-actions',
  workflow: '.github/workflows/homepage-manager.yml',
  statusFile: 'homepage-manager-status.json',
});

fs.writeFileSync('company-status.json', JSON.stringify(status, null, 2) + '\n');

console.log(`HOMEPAGE_MANAGER=${managerStatus.status.toUpperCase()}`);
console.log(`HOMEPAGE_CHECKS=${Object.keys(checks).length - failures.length}/${Object.keys(checks).length}`);
console.log(`HOMEPAGE_CATALOG=${managerStatus.counts.catalogGames}`);
console.log(`HOMEPAGE_ARTBOOKS=${managerStatus.counts.publishedArtbooks}`);
if (failures.length) {
  console.error(`HOMEPAGE_FAILURES=${failures.join(',')}`);
  process.exitCode = 1;
}
