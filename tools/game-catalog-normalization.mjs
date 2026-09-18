import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import {
  homepageCategoryForProductionClass,
  normalizeProductionClass,
  PRODUCTION_CLASSES
} from './production-classification.mjs';

export const CATALOG_CANONICAL_SCHEMA_VERSION=1;
const ROADMAP_PATH='company-learning/platform-release-roadmap.json';
const clean=value=>String(value??'').trim();
const bool=value=>value===true;
const list=value=>[...new Set((Array.isArray(value)?value:[]).map(clean).filter(Boolean))];
const numericRank=(table,key,fallback=999)=>Number.isFinite(Number(table?.[key]))?Number(table[key]):fallback;

function normalizationPolicy(){
  try{
    const roadmap=JSON.parse(fs.readFileSync(ROADMAP_PATH,'utf8'));
    return roadmap?.catalogNormalization||{};
  }catch{
    return{};
  }
}

export function normalizePlatform(value){
  const raw=clean(value).toUpperCase().replace(/[\s-]+/g,'_');
  if(raw==='ROBLOX')return 'ROBLOX';
  if(['UNITY','UNITY_ANDROID','ANDROID_MOBILE'].includes(raw))return 'UNITY';
  if(['FORTNITE','FORTNITE_UEFN','UEFN'].includes(raw))return 'FORTNITE_UEFN';
  return '';
}
function normalizedProductionClass(value){
  return normalizeProductionClass(value)||PRODUCTION_CLASSES.DESIGN_ONLY;
}
function lifecycleStateOf(game={}){
  const raw=clean(game.lifecycleState||game.lifecycle?.state||'ACTIVE').toUpperCase();
  return ['ACTIVE','REBUILD','PAUSED','RETIRED','REMOVED'].includes(raw)?raw:'ACTIVE';
}
function selectedPlatformOf(game={}){
  const runtime=game.homepageInfo&&typeof game.homepageInfo==='object'?game.homepageInfo:{};
  for(const value of [runtime.platform,game.selectedPlatform,game.targetPlatform,game.preferredPlatform,game.productionTarget]){
    const platform=normalizePlatform(value);
    if(platform)return platform;
  }
  return '';
}
function historicalDisplayMode(game={}){
  const explicit=clean(game.homepageDisplayMode).toUpperCase();
  if(explicit)return explicit;
  const legacy=clean(game.homepageCategory).toLowerCase();
  const target=game.robloxPublicationTarget&&typeof game.robloxPublicationTarget==='object'?game.robloxPublicationTarget:{};
  const evidence=game.robloxReleaseEvidence&&typeof game.robloxReleaseEvidence==='object'?game.robloxReleaseEvidence:{};
  if(legacy==='historical-deployed'||(target.historical===true&&target.verified===true&&evidence.historicalPublicationTargetVerified===true)){
    return 'ROBLOX_HISTORICAL_DEPLOYMENT';
  }
  return '';
}

export function compareCatalogGames(a={},b={},policy=normalizationPolicy()){
  const ordering=policy?.ordering||{};
  const lifecycleRank=ordering.lifecycleRank||{ACTIVE:0,REBUILD:1,PAUSED:2,RETIRED:3,REMOVED:4};
  const classRank=ordering.productionClassRank||{RELEASE_CONFIRMED:0,DEVELOPMENT_CONFIRMED:1,DESIGN_ONLY:2};
  const featuredRank=ordering.featuredRank||{'true':0,'false':1};
  const platformRank=ordering.platformRank||{ROBLOX:0,UNITY:1,FORTNITE_UEFN:2,UNSELECTED:3};
  const aClass=normalizedProductionClass(a?.canonical?.production?.class||a.productionClass);
  const bClass=normalizedProductionClass(b?.canonical?.production?.class||b.productionClass);
  const aLifecycle=clean(a?.canonical?.lifecycle?.state||lifecycleStateOf(a)).toUpperCase();
  const bLifecycle=clean(b?.canonical?.lifecycle?.state||lifecycleStateOf(b)).toUpperCase();
  const aFeatured=a?.canonical?.homepage?.featured===true||a.featured===true;
  const bFeatured=b?.canonical?.homepage?.featured===true||b.featured===true;
  const aPlatform=normalizePlatform(a?.canonical?.production?.selectedPlatform||selectedPlatformOf(a))||'UNSELECTED';
  const bPlatform=normalizePlatform(b?.canonical?.production?.selectedPlatform||selectedPlatformOf(b))||'UNSELECTED';
  const aId=clean(a?.canonical?.identity?.gameId||a.id||a.gameId);
  const bId=clean(b?.canonical?.identity?.gameId||b.id||b.gameId);
  return numericRank(lifecycleRank,aLifecycle)-numericRank(lifecycleRank,bLifecycle)
    ||numericRank(classRank,aClass)-numericRank(classRank,bClass)
    ||numericRank(featuredRank,String(aFeatured))-numericRank(featuredRank,String(bFeatured))
    ||numericRank(platformRank,aPlatform)-numericRank(platformRank,bPlatform)
    ||aId.localeCompare(bId,'en');
}

export function canonicalizeGameRecord(game={}){
  const runtime=game.homepageInfo&&typeof game.homepageInfo==='object'?game.homepageInfo:{};
  const selectedPlatform=selectedPlatformOf(game);
  const robloxTarget=game.robloxPublicationTarget&&typeof game.robloxPublicationTarget==='object'?game.robloxPublicationTarget:{};
  const robloxEvidence=game.robloxReleaseEvidence&&typeof game.robloxReleaseEvidence==='object'?game.robloxReleaseEvidence:{};
  const webPath=clean(game.webPath);
  const productionClass=normalizedProductionClass(runtime.productionClass||game.productionClass);
  const lifecycleState=lifecycleStateOf(game);
  const genres=list(game.genre);
  const displayMode=historicalDisplayMode(game);
  return {
    schemaVersion:CATALOG_CANONICAL_SCHEMA_VERSION,
    catalogOrder:Number(game.catalogOrder)||null,
    authority:'company-runtime',
    identity:{
      gameId:clean(game.id||game.gameId),
      name:clean(game.name),
      description:clean(game.description),
      genres,
      image:clean(game.image)||'assets/pwa-icon-512.png',
      aliases:list(game.aliases)
    },
    lifecycle:{
      state:lifecycleState,
      reason:clean(game.lifecycleReason),
      ownerExistingGame:bool(game.ownerExistingGame)
    },
    production:{
      class:productionClass,
      classSource:clean(game.productionClassSource),
      target:clean(game.productionTarget),
      handling:clean(game.developmentHandling),
      selectedPlatform,
      stage:clean(game.homepageStage)
    },
    sources:{
      web:{
        path:webPath,
        archive:bool(game.hasWebArchive),
        playable:bool(game.homepageWebPlayable),
        purpose:clean(game.webPurpose)
      },
      unity:{
        projectPath:clean(game.unityProjectPath)
      },
      roblox:{
        projectPath:clean(game.robloxProjectPath)
      }
    },
    publication:{
      roblox:{
        universeId:clean(robloxTarget.universeId),
        placeId:clean(robloxTarget.placeId),
        verified:bool(robloxTarget.verified),
        historical:bool(robloxTarget.historical),
        currentReleaseClaim:bool(robloxTarget.currentReleaseClaim),
        displayName:clean(robloxTarget.displayName),
        observedFrom:clean(robloxTarget.observedFrom),
        observedAt:clean(robloxTarget.observedAt),
        published:bool(robloxEvidence.published),
        historicalPublicationTargetVerified:bool(robloxEvidence.historicalPublicationTargetVerified),
        actualStudioRuntime:bool(robloxEvidence.actualStudioRuntime),
        postRuntimeIndependentQa:bool(robloxEvidence.postRuntimeIndependentQa),
        regression:bool(robloxEvidence.regression),
        multiplayerQa:bool(robloxEvidence.multiplayerQa),
        sourceRevision:clean(robloxEvidence.sourceRevision),
        artifactIdentity:clean(robloxEvidence.artifactIdentity)
      }
    },
    homepage:{
      featured:bool(game.featured),
      category:homepageCategoryForProductionClass(productionClass)||'design-only',
      displayMode,
      artbookPath:clean(game.homepageArtbookPath),
      stage:clean(game.homepageStage),
      recentWork:clean(game.homepageRecentWork),
      runtime:{
        authority:clean(runtime.authority)||'company-runtime',
        platform:selectedPlatform,
        platformLabel:clean(runtime.platformLabel),
        score:runtime.score??null,
        scoreLabel:clean(runtime.scoreLabel)||'점수 미평가',
        scoreCurrent:bool(runtime.scoreCurrent),
        scoreSource:clean(runtime.scoreSource)||'SERVER_RUNTIME',
        validationSchemaVersion:Number(runtime.validationSchemaVersion)||null,
        genre:list(runtime.genre).length?list(runtime.genre):genres,
        genreLabel:clean(runtime.genreLabel)||genres.join(' · '),
        subgenre:clean(runtime.subgenre),
        playMode:clean(runtime.playMode),
        playModeLabel:clean(runtime.playModeLabel)||'플레이 방식 미평가',
        latestWork:clean(runtime.latestWork||game.homepageRecentWork)||'개발 작업 정보 없음',
        updatedAt:runtime.updatedAt||null,
        status:clean(runtime.status||game.lifecycleState)||'ACTIVE',
        productionClass
      }
    }
  };
}

export function normalizeCatalog(catalog={}){
  if(!Array.isArray(catalog.games))throw new Error('catalog.games must be an array');
  const policy=normalizationPolicy();
  const ids=new Set();
  for(const game of catalog.games){
    const id=clean(game.id||game.gameId);
    if(!id)throw new Error('catalog game id missing');
    if(ids.has(id))throw new Error('duplicate catalog game id: '+id);
    ids.add(id);
    game.productionClass=normalizedProductionClass(game.productionClass);
    const legacyHistorical=clean(game.homepageCategory).toLowerCase()==='historical-deployed';
    game.homepageCategory=homepageCategoryForProductionClass(game.productionClass)||'design-only';
    if(legacyHistorical&&!clean(game.homepageDisplayMode))game.homepageDisplayMode='ROBLOX_HISTORICAL_DEPLOYMENT';
    game.canonical=canonicalizeGameRecord(game);
  }
  catalog.games.sort((a,b)=>compareCatalogGames(a,b,policy));
  catalog.games.forEach((game,index)=>{
    const order=index+1;
    game.catalogOrder=order;
    game.canonical=canonicalizeGameRecord({...game,catalogOrder:order});
    game.canonical.catalogOrder=order;
  });
  catalog.catalogSchemaVersion=2;
  catalog.normalization={
    version:2,
    sourceOfTruth:policy?.sourceOfTruth||ROADMAP_PATH,
    canonicalRecordPath:'games[].canonical',
    legacyFlatFields:'COMPATIBILITY_MIRROR',
    canonicalFirst:true,
    homepageReadsCanonicalFirst:true,
    companyStatusSyncRegeneratesCanonical:true,
    duplicateGameIdsForbidden:true,
    publicationIdentityMustStayBoundToGameId:true,
    ordering:policy?.ordering?.mode||'CANONICAL_STABLE',
    orderField:policy?.ordering?.outputField||'catalogOrder',
    orderContiguous:true
  };
  catalog.runtimeCounts={
    ...(catalog.runtimeCounts||{}),
    canonicalGames:catalog.games.length,
    normalizedGames:catalog.games.filter(game=>game.canonical?.schemaVersion===CATALOG_CANONICAL_SCHEMA_VERSION).length
  };
  return catalog;
}

export function validateNormalizedCatalog(catalog={}){
  const policy=normalizationPolicy();
  const errors=[];
  if(catalog.catalogSchemaVersion!==2)errors.push('CATALOG_SCHEMA_VERSION');
  if(catalog.normalization?.canonicalRecordPath!=='games[].canonical')errors.push('NORMALIZATION_POLICY');
  if(catalog.normalization?.ordering!==(policy?.ordering?.mode||'CANONICAL_STABLE'))errors.push('ORDERING_POLICY');
  if(catalog.normalization?.orderField!==(policy?.ordering?.outputField||'catalogOrder'))errors.push('ORDER_FIELD_POLICY');
  const ids=new Set(),robloxPlaces=new Map(),robloxUniverses=new Map();
  const expected=[...(Array.isArray(catalog.games)?catalog.games:[])].sort((a,b)=>compareCatalogGames(a,b,policy)).map(game=>clean(game.id));
  for(let index=0;index<(Array.isArray(catalog.games)?catalog.games:[]).length;index+=1){
    const game=catalog.games[index];
    const id=clean(game.id),canonical=game.canonical;
    if(!id||!canonical||canonical.schemaVersion!==CATALOG_CANONICAL_SCHEMA_VERSION){errors.push('CANONICAL_MISSING:'+id);continue;}
    if(canonical.identity?.gameId!==id)errors.push('IDENTITY_MISMATCH:'+id);
    if(ids.has(id))errors.push('DUPLICATE_GAME_ID:'+id);ids.add(id);
    const cls=normalizedProductionClass(game.productionClass);
    if(canonical.production?.class!==cls)errors.push('PRODUCTION_MIRROR_MISMATCH:'+id);
    if(game.homepageCategory!==(homepageCategoryForProductionClass(cls)||'design-only'))errors.push('HOMEPAGE_CATEGORY_MISMATCH:'+id);
    if(canonical.homepage?.category!==game.homepageCategory)errors.push('CANONICAL_HOMEPAGE_CATEGORY_MISMATCH:'+id);
    if(Number(game.catalogOrder)!==index+1||Number(canonical.catalogOrder)!==index+1)errors.push('CATALOG_ORDER_NOT_CONTIGUOUS:'+id);
    if(expected[index]!==id)errors.push('CATALOG_SORT_MISMATCH:'+id);
    const pub=canonical.publication?.roblox||{};
    if(pub.verified&&pub.placeId){
      const old=robloxPlaces.get(pub.placeId);if(old&&old!==id)errors.push('DUPLICATE_ROBLOX_PLACE:'+pub.placeId);else robloxPlaces.set(pub.placeId,id);
    }
    if(pub.verified&&pub.universeId){
      const old=robloxUniverses.get(pub.universeId);if(old&&old!==id)errors.push('DUPLICATE_ROBLOX_UNIVERSE:'+pub.universeId);else robloxUniverses.set(pub.universeId,id);
    }
  }
  return {pass:errors.length===0,errors,gameCount:Array.isArray(catalog.games)?catalog.games.length:0};
}

function main(){
  const file=process.argv.find(x=>x.startsWith('--file='))?.slice(7)||'game-catalog.json';
  const check=process.argv.includes('--check');
  const catalog=JSON.parse(fs.readFileSync(file,'utf8'));
  if(!check)normalizeCatalog(catalog);
  const validation=validateNormalizedCatalog(catalog);
  if(!validation.pass)throw new Error(validation.errors.join(','));
  if(!check)fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n');
  console.log('GAME_CATALOG_NORMALIZATION=PASS');
  console.log('GAME_CATALOG_NORMALIZED='+validation.gameCount);
  console.log('GAME_CATALOG_ORDER=CANONICAL_STABLE');
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  try{main();}catch(error){console.error(error.stack||error.message);process.exitCode=1;}
}
