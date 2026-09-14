// 단일 Homepage Manager가 company-runtime의 검증된 실제 플레이 Web 게임 중 80점 이상 상위 30개만 main Top30 자산으로 동기화한다.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {WEB_VALIDATION_SCHEMA_VERSION,WEB_HOMEPAGE_MINIMUM,evaluateWebValidationEvidence} from './company-web-validation-evidence-contract.mjs';

const runtimeRef=String(process.env.COMPANY_RUNTIME_REF||'origin/company-runtime').trim();
const manifestFile=String(process.env.HOMEPAGE_TEST_CANDIDATE_OUTPUT||'test-game-candidates.json').trim();
const limit=30;
const minimumScore=WEB_HOMEPAGE_MINIMUM;
const minimumValidationSchema=WEB_VALIDATION_SCHEMA_VERSION;
const requiredArtifactType='REAL_PLAYABLE_GAME';
const clean=v=>String(v??'').trim();
const readJson=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const showText=file=>execFileSync('git',['show',`${runtimeRef}:${file}`],{encoding:'utf8',maxBuffer:32*1024*1024});
const showJson=(file,fallback=null)=>{try{return JSON.parse(showText(file));}catch{return fallback;}};
const existsRuntime=file=>{try{execFileSync('git',['cat-file','-e',`${runtimeRef}:${file}`],{stdio:'ignore'});return true;}catch{return false;}};
const checkoutRuntime=file=>execFileSync('git',['checkout',runtimeRef,'--',file],{stdio:'inherit'});
const sha256Text=value=>crypto.createHash('sha256').update(String(value??'')).digest('hex');
const scoreOf=evidence=>Number(evidence?.webStrictScore??evidence?.strictReview?.totalScore);
const realPlayableGamePass=html=>{
  const text=String(html??'');
  return new RegExp(`data-web-artifact-type=["']${requiredArtifactType}["']`,'i').test(text)&&/(?:<canvas\b|data-gameplay-surface=)/i.test(text)&&/(victory|승리|목표 달성|달성!)/i.test(text)&&/(defeat|game over|패배|게임 오버|쓰러졌다|파괴됐다)/i.test(text)&&!/FULL APPROVED WEB COMPANION/i.test(text)&&!/<h2[^>]*>\s*30분 플레이 구조\s*<\/h2>/i.test(text)&&!/<h2[^>]*>\s*승인 분량 전체 구현\s*<\/h2>/i.test(text)&&!/data-session-stage=|data-session-proof-mode=["']PROGRESSION_MILESTONES["']/i.test(text);
};
const semanticJson=value=>{
  const copy=JSON.parse(JSON.stringify(value??{}));
  delete copy.updatedAt;
  return JSON.stringify(copy);
};
const writeJsonIfSemanticChanged=(file,previous,next)=>{
  if(semanticJson(previous)===semanticJson(next)){
    console.log(`HOMEPAGE_TEST_SYNC_NOOP=${file}`);
    return false;
  }
  const output={...next,updatedAt:new Date().toISOString()};
  fs.writeFileSync(file,JSON.stringify(output,null,2)+'\n');
  return true;
};

const previousManifest=readJson(manifestFile,{candidates:[]});
const previousRank=new Map((previousManifest.candidates||[]).map((row,index)=>[clean(row.gameId||row.id),index]));
const queue=showJson('development-queue.json',{items:[]});
const runtimeCatalog=showJson('game-catalog.json',{games:[]});
const catalogById=new Map((runtimeCatalog.games||[]).map(game=>[clean(game.id),game]));
const candidates=[];
let staleEvidenceCount=0,nonPlayableRejectedCount=0,substanceRejectedCount=0,postWebArtbookRejectedCount=0;
for(const item of queue.items||[]){
  const gameId=clean(item.gameId);if(!gameId)continue;
  if(clean(item.productionClass).toUpperCase()!=='DEVELOPMENT_CONFIRMED')continue;
  if(!item.webValidationPassedAt||item.musicValidationPassed!==true)continue;
  if(item.postWebArtbookPassed!==true||item.homepageTestCandidate!==true||clean(item.homepageTestVerdict).toUpperCase()!=='PASS'){postWebArtbookRejectedCount++;continue;}
  const webSourcePath=clean(item.webSourcePath||`web-games/${gameId}`);
  const artbookSource=clean(item.artbookSource||`artbook-submissions/${gameId}/current.json`);
  const evidencePath=clean(item.webValidationEvidencePath);
  const baselineSource=clean(item.designBaselineSource);
  if(!evidencePath||!baselineSource||!existsRuntime(evidencePath)||!existsRuntime(`${webSourcePath}/index.html`)||!existsRuntime(baselineSource)||!existsRuntime(artbookSource))continue;
  const evidence=showJson(evidencePath,null);if(!evidence)continue;
  const webHtml=showText(`${webSourcePath}/index.html`);
  if(!realPlayableGamePass(webHtml)){nonPlayableRejectedCount++;continue;}
  const currentWebHash=sha256Text(webHtml);
  const currentBaselineHash=sha256Text(showText(baselineSource));
  const evaluation=evaluateWebValidationEvidence(evidence,{minimumScore,requireFinalContentDepth:true,currentSourceSha256:currentWebHash,currentBaselineSha256:currentBaselineHash});
  if(!evaluation.pass){
    if(evaluation.blockers.includes('WEB_REAL_GAME_SUBSTANCE_NOT_PASS'))substanceRejectedCount++;
    if(evaluation.blockers.some(x=>['WEB_VALIDATION_SCHEMA_STALE','WEB_FINAL_CONTENT_DEPTH_NOT_PASS','WEB_EVIDENCE_HASH_MISSING','WEB_SOURCE_HASH_STALE','WEB_BASELINE_HASH_STALE'].includes(x)))staleEvidenceCount++;
    continue;
  }
  const artbook=showJson(artbookSource,null);
  if(artbook?.postWebStrictReview!==true||Number(artbook?.webStrictScore)!==scoreOf(evidence)||clean(artbook?.webValidationEvidencePath)!==evidencePath){postWebArtbookRejectedCount++;continue;}
  const game=catalogById.get(gameId)||{};
  candidates.push({
    id:gameId,
    gameId,
    name:clean(game.name||item.gameName||gameId),
    score:scoreOf(evidence),
    webStrictScore:scoreOf(evidence),
    strictScore:scoreOf(evidence),
    reviewScore:scoreOf(evidence),
    homepageReviewState:'TEST',
    homepageTestCandidate:true,
    homepageOfficialCard:false,
    productionClass:'DEVELOPMENT_CONFIRMED',
    webArtifactType:requiredArtifactType,
    realPlayableWebGame:true,
    realGameSubstancePassed:evaluation.realGameSubstancePass===true,
    finalContentDepthPassed:evaluation.finalContentDepthPass===true,
    testUrl:`/${webSourcePath.replace(/^\/+|\/+$/g,'')}/`,
    webPath:`/${webSourcePath.replace(/^\/+|\/+$/g,'')}/`,
    artbookUrl:`/artbook-viewer.html?game=${encodeURIComponent(gameId)}`,
    artbookPath:`/artbook-viewer.html?game=${encodeURIComponent(gameId)}`,
    artbookSource,
    evidencePath,
    validationSchemaVersion:evaluation.schema||null,
    sourceIndexSha256:clean(evidence?.sourceIndexSha256)||null,
    designBaselineSha256:clean(evidence?.designBaselineSha256)||null,
    promotionRevalidationPassed:evidence?.promotionRevalidation?.pass===true,
    strictReviewVerdict:clean(evidence?.strictReview?.verdict||''),
    homepageTestVerdict:'PASS',
    formalImplementationPassed:evidence?.formalImplementationPassed===true,
    strictReviewHardFailures:[],
    validatedAt:evidence.checkedAt||item.webValidationPassedAt,
  });
}

candidates.sort((a,b)=>{
  if(b.score!==a.score)return b.score-a.score;
  const ar=previousRank.has(a.gameId)?previousRank.get(a.gameId):Number.POSITIVE_INFINITY;
  const br=previousRank.has(b.gameId)?previousRank.get(b.gameId):Number.POSITIVE_INFINITY;
  if(ar!==br)return ar-br;
  if(a.promotionRevalidationPassed!==b.promotionRevalidationPassed)return Number(b.promotionRevalidationPassed)-Number(a.promotionRevalidationPassed);
  const time=String(b.validatedAt||'').localeCompare(String(a.validatedAt||''));
  return time||a.id.localeCompare(b.id);
});
const selected=candidates.slice(0,limit);
const cutlineScore=selected.length===limit?Number(selected[selected.length-1].score):null;

for(const candidate of selected){
  const webDir=clean(candidate.webPath).replace(/^\/+|\/+$/g,'');
  checkoutRuntime(webDir);
  checkoutRuntime(candidate.artbookSource);
}

const previousRegistry=readJson('game-artbooks.json',{version:1,artbooks:[],dailySubmissions:[]});
const registry={
  ...previousRegistry,
  artbooks:Array.isArray(previousRegistry.artbooks)?previousRegistry.artbooks.filter(row=>row?.homepageTestCandidate!==true):[],
};
for(const candidate of selected){
  const artbook=readJson(candidate.artbookSource,{});
  registry.artbooks.push({
    id:`${candidate.gameId}-test-current`,gameId:candidate.gameId,gameName:candidate.name,edition:Number(artbook.edition||1),
    status:'completed-artbook',published:true,homepageVisible:true,productionApproval:false,homepageTestCandidate:true,
    createdAt:clean(artbook.createdAt||artbook.date||candidate.validatedAt).slice(0,10),format:clean(artbook.format||'core-strategy'),sourceFile:candidate.artbookSource,
  });
}
const registryChanged=writeJsonIfSemanticChanged('game-artbooks.json',previousRegistry,registry);

const manifest={
  version:8,policyDocument:'COMPANY_FLOW.md',officialCardRegistrationRequiresPromotionPass:true,
  homepageTestShelf:{
    limit,minimumScore,minimumValidationSchema,order:'STRICT_IMPLEMENTATION_SCORE_DESC',requiresScore:true,requiresWebGame:true,requiresRealPlayableGame:true,requiresRealGameSubstance:true,requiredWebArtifactType:requiredArtifactType,requiresArtbook:true,requiresFreshSourceHash:true,requiresFreshDesignBaselineHash:true,requiresFinal30MinuteContentDepth:true,requiredContentDepthValidationMode:'REAL_ELAPSED_GAMEPLAY',hardGatesRequired:true,officialCard:false,promotionRequiredForOfficialCard:true,
    cutlineScore,replacementPolicy:'STRICTLY_HIGHER_SCORE_REPLACES_CUTLINE;TIE_PRESERVES_VALID_INCUMBENT',tieBreak:['EXISTING_TOP30_RANK','PROMOTION_REVALIDATION_PASS','LATEST_VALIDATION','GAME_ID'],
  },
  candidates:selected,
};
const manifestChanged=writeJsonIfSemanticChanged(manifestFile,previousManifest,manifest);
const semanticChanged=registryChanged||manifestChanged;
console.log(`HOMEPAGE_TEST_CANDIDATE_COUNT=${selected.length}`);
console.log(`HOMEPAGE_TEST_CANDIDATE_IDS=${selected.map(x=>x.gameId).join(',')}`);
console.log(`HOMEPAGE_TEST_STALE_EVIDENCE_REJECTED=${staleEvidenceCount}`);
console.log(`HOMEPAGE_TEST_NON_PLAYABLE_REJECTED=${nonPlayableRejectedCount}`);
console.log(`HOMEPAGE_TEST_SUBSTANCE_REJECTED=${substanceRejectedCount}`);
console.log(`HOMEPAGE_TEST_POST_WEB_ARTBOOK_REJECTED=${postWebArtbookRejectedCount}`);
console.log('HOMEPAGE_TEST_CANDIDATE_LIMIT=30');
console.log(`HOMEPAGE_TEST_MINIMUM_SCORE=${minimumScore}`);
console.log(`HOMEPAGE_TEST_MINIMUM_VALIDATION_SCHEMA=${minimumValidationSchema}`);
console.log(`HOMEPAGE_TEST_REQUIRED_ARTIFACT_TYPE=${requiredArtifactType}`);
console.log(`HOMEPAGE_TEST_CUTLINE_SCORE=${cutlineScore??'OPEN'}`);
console.log('HOMEPAGE_TEST_REPLACEMENT=STRICTLY_HIGHER_SCORE;TIE_PRESERVES_INCUMBENT');
console.log('HOMEPAGE_TEST_ORDER=STRICT_IMPLEMENTATION_SCORE_DESC');
console.log('HOMEPAGE_TEST_REQUIRES=REAL_PLAYABLE_WEB_GAME+REAL_GAME_SUBSTANCE+POST_WEB_ARTBOOK+80_SCORE+NO_HARD_FAILURE+FRESH_HASHES+REAL_ELAPSED_30MIN');
console.log(`HOMEPAGE_TEST_SYNC_CHANGED=${semanticChanged?'YES':'NO'}`);
