// 단일 Homepage Manager가 company-runtime의 검증된 Web 후보 중 상위 20개만 main 테스트 선반 자산으로 동기화한다.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const runtimeRef=String(process.env.COMPANY_RUNTIME_REF||'origin/company-runtime').trim();
const manifestFile=String(process.env.HOMEPAGE_TEST_CANDIDATE_OUTPUT||'test-game-candidates.json').trim();
const limit=20;
const clean=v=>String(v??'').trim();
const readJson=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const showText=file=>execFileSync('git',['show',`${runtimeRef}:${file}`],{encoding:'utf8',maxBuffer:32*1024*1024});
const showJson=(file,fallback=null)=>{try{return JSON.parse(showText(file));}catch{return fallback;}};
const existsRuntime=file=>{try{execFileSync('git',['cat-file','-e',`${runtimeRef}:${file}`],{stdio:'ignore'});return true;}catch{return false;}};
const checkoutRuntime=file=>execFileSync('git',['checkout',runtimeRef,'--',file],{stdio:'inherit'});
const scoreOf=evidence=>Number(evidence?.strictReview?.totalScore);
const strictPass=evidence=>evidence?.homepageTestEligible===true&&evidence?.strictReview?.verdict==='PASS'&&Number.isFinite(scoreOf(evidence))&&scoreOf(evidence)>=90&&Array.isArray(evidence?.strictReview?.hardFailures)&&evidence.strictReview.hardFailures.length===0;

const queue=showJson('development-queue.json',{items:[]});
const runtimeCatalog=showJson('game-catalog.json',{games:[]});
const catalogById=new Map((runtimeCatalog.games||[]).map(game=>[clean(game.id),game]));
const candidates=[];
for(const item of queue.items||[]){
  const gameId=clean(item.gameId);if(!gameId)continue;
  if(clean(item.productionClass).toUpperCase()!=='DEVELOPMENT_CONFIRMED')continue;
  if(!item.webValidationPassedAt||item.musicValidationPassed!==true)continue;
  const webSourcePath=clean(item.webSourcePath||`web-games/${gameId}`);
  const artbookSource=clean(item.artbookSource||`artbook-submissions/${gameId}/current.json`);
  const evidencePath=clean(item.webValidationEvidencePath);
  if(!evidencePath||!existsRuntime(evidencePath)||!existsRuntime(`${webSourcePath}/index.html`)||!existsRuntime(artbookSource))continue;
  const evidence=showJson(evidencePath,null);if(!strictPass(evidence))continue;
  const game=catalogById.get(gameId)||{};
  candidates.push({
    id:gameId,
    gameId,
    name:clean(game.name||item.gameName||gameId),
    score:scoreOf(evidence),
    strictScore:scoreOf(evidence),
    reviewScore:scoreOf(evidence),
    homepageReviewState:'TEST',
    homepageTestCandidate:true,
    homepageOfficialCard:false,
    productionClass:'DEVELOPMENT_CONFIRMED',
    testUrl:`/${webSourcePath.replace(/^\/+|\/+$/g,'')}/`,
    webPath:`/${webSourcePath.replace(/^\/+|\/+$/g,'')}/`,
    artbookUrl:`/artbook-viewer.html?game=${encodeURIComponent(gameId)}`,
    artbookPath:`/artbook-viewer.html?game=${encodeURIComponent(gameId)}`,
    artbookSource,
    evidencePath,
    strictReviewVerdict:'PASS',
    strictReviewHardFailures:[],
    validatedAt:evidence.checkedAt||item.webValidationPassedAt,
  });
}
candidates.sort((a,b)=>b.score-a.score||String(b.validatedAt||'').localeCompare(String(a.validatedAt||''))||a.id.localeCompare(b.id));
const selected=candidates.slice(0,limit);

for(const candidate of selected){
  const webDir=clean(candidate.webPath).replace(/^\/+|\/+$/g,'');
  checkoutRuntime(webDir);
  checkoutRuntime(candidate.artbookSource);
}

const registry=readJson('game-artbooks.json',{version:1,artbooks:[],dailySubmissions:[]});
registry.artbooks=Array.isArray(registry.artbooks)?registry.artbooks.filter(row=>row?.homepageTestCandidate!==true):[];
for(const candidate of selected){
  const artbook=readJson(candidate.artbookSource,{});
  registry.artbooks.push({
    id:`${candidate.gameId}-test-current`,gameId:candidate.gameId,gameName:candidate.name,edition:Number(artbook.edition||1),
    status:'completed-artbook',published:true,homepageVisible:true,productionApproval:false,homepageTestCandidate:true,
    createdAt:clean(artbook.createdAt||artbook.date||candidate.validatedAt).slice(0,10),format:clean(artbook.format||'core-strategy'),sourceFile:candidate.artbookSource,
  });
}
registry.updatedAt=new Date().toISOString();
fs.writeFileSync('game-artbooks.json',JSON.stringify(registry,null,2)+'\n');

const manifest={
  version:3,updatedAt:new Date().toISOString(),policyDocument:'COMPANY_FLOW.md',officialCardRegistrationRequiresPromotionPass:true,
  homepageTestShelf:{limit,order:'STRICT_REVIEW_SCORE_DESC',requiresScore:true,requiresWebGame:true,requiresArtbook:true,requiresStrictPass:true,officialCard:false,promotionRequiredForOfficialCard:true},
  candidates:selected,
};
fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
console.log(`HOMEPAGE_TEST_CANDIDATE_COUNT=${selected.length}`);
console.log(`HOMEPAGE_TEST_CANDIDATE_IDS=${selected.map(x=>x.gameId).join(',')}`);
console.log('HOMEPAGE_TEST_CANDIDATE_LIMIT=20');
console.log('HOMEPAGE_TEST_ORDER=STRICT_REVIEW_SCORE_DESC');
console.log('HOMEPAGE_TEST_REQUIRES=WEB+ARTBOOK+STRICT_PASS');
