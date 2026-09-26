import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import crypto from 'node:crypto';
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
const LEGACY_DEVELOPMENT_FREEZE_FIELDS=Object.freeze(['newFeatureExpansionFrozen']);

const platformLabel=platform=>platform==='ROBLOX'?'Roblox':platform==='UNITY'?'Unity Android':platform==='FORTNITE_UEFN'?'Fortnite UEFN':'';
function autoClassificationPolicy(){
  try{
    const roadmap=JSON.parse(fs.readFileSync(ROADMAP_PATH,'utf8'));
    return roadmap?.catalogNormalization?.autoClassification||{};
  }catch{
    return{};
  }
}
function webSourcePresent(game={}){
  return Boolean(clean(game.webPath)||game.hasWebArchive===true||game.homepageWebPlayable===true);
}
function webSourceText(game={}){
  const raw=clean(game.webPath).replace(/^\/+|\/+$/g,'');
  if(!raw||!fs.existsSync(raw))return '';
  const files=[];
  try{
    const stat=fs.statSync(raw);
    if(stat.isFile())files.push(raw);
    else if(stat.isDirectory()){
      const preferred=['index.html','index.js','game.js','main.js','script.js','app.js','config.json','game.json'];
      for(const name of preferred){
        const file=raw+'/'+name;
        if(fs.existsSync(file))files.push(file);
      }
      if(files.length<8){
        for(const entry of fs.readdirSync(raw,{withFileTypes:true})){
          if(files.length>=8)break;
          if(!entry.isFile()||!/[.](?:html?|m?js|json)$/i.test(entry.name))continue;
          const file=raw+'/'+entry.name;
          if(!files.includes(file))files.push(file);
        }
      }
    }
  }catch{return '';}
  let text='';
  for(const file of files.slice(0,8)){
    try{text+='\n'+fs.readFileSync(file,'utf8').slice(0,24000);}catch{}
    if(text.length>=96000)break;
  }
  return text.slice(0,96000);
}
function classificationText(game={}){
  const runtime=game.homepageInfo&&typeof game.homepageInfo==='object'?game.homepageInfo:{};
  return [
    game.id,game.name,game.description,game.productionTarget,game.homepageStage,game.homepageRecentWork,
    ...(Array.isArray(game.genre)?game.genre:[]),
    ...(Array.isArray(runtime.genre)?runtime.genre:[]),
    webSourceText(game)
  ].map(clean).filter(Boolean).join(' ').toLowerCase();
}
function addGenres(out,...values){for(const value of values){const v=clean(value);if(v&&!out.includes(v))out.push(v);}}

export function inferHomepageGenres(game={}){
  const policy=autoClassificationPolicy();
  const max=Math.max(1,Math.min(8,Number(policy?.genre?.maximumLabels)||4));
  const text=classificationText(game);
  const out=[];
  if(/(tower.?defen|tower defense|타워.?디펜|라인.?디펜|defense|디펜스)/i.test(text))addGenres(out,'디펜스','전략');
  if(/(rpg|role.?play|dungeon|던전|quest|퀘스트|레벨업|boss|보스)/i.test(text))addGenres(out,'RPG');
  if(/(survival|생존|horde|웨이브|wave|roguelite|로그라이트|roguelike|로그라이크)/i.test(text))addGenres(out,'생존','액션');
  if(/(fps|tps|shooter|shooting|gun|총기|사격|슈팅)/i.test(text))addGenres(out,'슈팅');
  if(/(racing|race|레이싱|경주|driving|운전)/i.test(text))addGenres(out,'레이싱');
  if(/(football|soccer|basketball|baseball|sport|축구|농구|야구|스포츠)/i.test(text))addGenres(out,'스포츠');
  if(/(tycoon|타이쿤|management|경영|shop|restaurant|restaurant|놀이공원|theme.?park)/i.test(text))addGenres(out,'경영','시뮬레이션');
  if(/(sandbox|샌드박스|world.?build|building|건설|건축)/i.test(text))addGenres(out,'샌드박스');
  if(/(farm|farming|농장|cozy|힐링|생활)/i.test(text))addGenres(out,'생활');
  if(/(fish|fishing|낚시)/i.test(text))addGenres(out,'낚시');
  if(/(puzzle|퍼즐|match.?3|매치|merge|머지|block.?puzzle|grid.?puzzle)/i.test(text))addGenres(out,'퍼즐');
  if(/(rhythm|리듬|music.?game|음악.?게임|piano|피아노)/i.test(text))addGenres(out,'리듬','음악');
  if(/(board|card|chess|보드|카드|체스)/i.test(text))addGenres(out,'보드','전략');
  if(/(strategy|strategic|전략|tactical|전술)/i.test(text))addGenres(out,'전략');
  if(/(collect|collection|수집|pet|펫|동료|도감)/i.test(text))addGenres(out,'수집');
  if(/(adventure|explor|모험|탐험)/i.test(text))addGenres(out,'모험');
  if(/(platformer|platform game|obby|오비|플랫포머|runner|러너)/i.test(text))addGenres(out,'플랫폼');
  if(/(social|소셜|party|파티|multiplayer|멀티플레이|co-?op|협동)/i.test(text))addGenres(out,'소셜');
  if(/(idle|방치|afk)/i.test(text))addGenres(out,'방치형');
  if(/(combat|fight|battle|전투|격투|action|액션)/i.test(text))addGenres(out,'액션');
  if(/(casual|캐주얼|minigame|미니게임)/i.test(text))addGenres(out,'캐주얼');
  const fallback=list(policy?.genre?.fallback).length?list(policy.genre.fallback):['기타'];
  return (out.length?out:fallback).slice(0,max);
}

export function inferHomepagePlatform(game={}){
  const explicit=selectedPlatformOf(game);
  if(explicit)return explicit;
  if(clean(game.uefnProjectPath||game.fortniteProjectPath))return 'FORTNITE_UEFN';
  const robloxTarget=game.robloxPublicationTarget&&typeof game.robloxPublicationTarget==='object'?game.robloxPublicationTarget:{};
  if(clean(game.robloxProjectPath)||clean(robloxTarget.placeId)||clean(robloxTarget.universeId))return 'ROBLOX';
  if(clean(game.unityProjectPath))return 'UNITY';
  const text=classificationText(game);
  if(/(fortnite|uefn|\bverse\b|battle.?royale|배틀.?로얄|fortnite.?island)/i.test(text))return 'FORTNITE_UEFN';
  if(/(roblox|obby|오비|tycoon|타이쿤|role.?play|롤플레이|hangout|소셜|party|파티|pet|펫|sandbox|샌드박스|minigame|미니게임)/i.test(text))return 'ROBLOX';
  if(/(unity|android|mobile|모바일|3d|rpg|던전|survival|생존|fps|tps|shooter|슈팅|racing|레이싱|sport|스포츠|simulation|시뮬|management|경영|fishing|낚시|puzzle|퍼즐|rhythm|리듬)/i.test(text))return 'UNITY';
  const policy=autoClassificationPolicy();
  return normalizePlatform(policy?.platform?.centralDefault)||'ROBLOX';
}

export function applyHomepageAutoClassification(game={}){
  const policy=autoClassificationPolicy();
  if(policy?.enabled!==true||!webSourcePresent(game))return game;
  const runtime=game.homepageInfo&&typeof game.homepageInfo==='object'?game.homepageInfo:{};
  game.homepageInfo=runtime;

  let platform=selectedPlatformOf(game);
  if(!platform){
    platform=inferHomepagePlatform(game);
    if(platform)game.selectedPlatform=platform;
  }else if(!normalizePlatform(game.selectedPlatform)){
    game.selectedPlatform=platform;
  }
  if(platform&&!normalizePlatform(runtime.platform))runtime.platform=platform;
  if(platform&&!clean(runtime.platformLabel))runtime.platformLabel=platformLabel(platform);

  let genres=list(game.genre);
  const runtimeGenres=list(runtime.genre);
  if(!genres.length&&runtimeGenres.length)genres=runtimeGenres;
  if(!genres.length)genres=inferHomepageGenres(game);
  if(!list(game.genre).length)game.genre=genres;
  if(!runtimeGenres.length)runtime.genre=genres;
  if(!clean(runtime.genreLabel))runtime.genreLabel=genres.join(' · ');
  return game;
}

function normalizationPolicy(){
  try{
    const roadmap=JSON.parse(fs.readFileSync(ROADMAP_PATH,'utf8'));
    return roadmap?.catalogNormalization||{};
  }catch{
    return{};
  }
}

function webTreeFingerprint(filesystem,root){
  const files=[];
  const walk=(dir,relative='')=>{
    for(const entry of filesystem.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      const full=dir+'/'+entry.name;
      const rel=relative?relative+'/'+entry.name:entry.name;
      if(entry.isDirectory())walk(full,rel);
      else if(entry.isFile())files.push({full,rel});
    }
  };
  walk(root);
  const hash=crypto.createHash('sha256');
  for(const file of files){
    hash.update(file.rel);hash.update('\0');
    hash.update(filesystem.readFileSync(file.full));hash.update('\0');
  }
  return hash.digest('hex');
}
function ownerWebTitle(filesystem,indexFile,fallback){
  try{
    const html=filesystem.readFileSync(indexFile,'utf8');
    const title=html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.replace(/\s+/g,' ').trim();
    return title||fallback;
  }catch{return fallback;}
}
export function ingestOwnerWebGameIds(catalog={},gameIds=[],{filesystem=fs,rootDir=''}={}){
  if(!Array.isArray(catalog.games))throw new Error('catalog.games must be an array');
  const policy=normalizationPolicy()?.ownerWebAutoIngest||{};
  if(policy.enabled!==true)return{catalog,added:[],updated:[],disabled:[],ignored:[]};
  const canonicalRoot=clean(policy.root||'web-games').replace(/^\/+|\/+$/g,'');
  const diskRoot=clean(rootDir||canonicalRoot).replace(/\/+$/g,'');
  const entryFile=clean(policy.requiredEntryFile)||'index.html';
  const minBytes=Math.max(1,Number(policy.minimumEntryBytes)||512);
  const removed=new Set((catalog?.permanentRemovalPolicy?.ids||[]).map(clean));
  const byId=new Map(catalog.games.map(game=>[clean(game?.id),game]).filter(([id])=>id));
  const added=[],updated=[],disabled=[],ignored=[];
  for(const rawId of list(gameIds)){
    const id=clean(rawId);
    if(!/^[a-z0-9][a-z0-9-]*$/i.test(id)||removed.has(id)){ignored.push(id);continue;}
    const dir=diskRoot+'/'+id;
    const indexFile=dir+'/'+entryFile;
    const existing=byId.get(id)||null;
    let valid=false;
    try{valid=filesystem.existsSync(indexFile)&&filesystem.statSync(indexFile).isFile()&&filesystem.statSync(indexFile).size>=minBytes;}catch{valid=false;}
    if(!valid){
      if(existing){
        existing.homepageWebPlayable=false;
        existing.hasWebArchive=false;
        existing.ownerWebSourceState='ENTRY_MISSING_OR_INVALID';
        disabled.push(id);
      }else ignored.push(id);
      continue;
    }
    const canonicalPath=`/${canonicalRoot}/${id}/`;
    const fingerprint=webTreeFingerprint(filesystem,dir);
    if(existing){
      const prior=clean(existing.ownerWebSourceRevision);
      existing.webPath=canonicalPath;
      existing.hasWebArchive=true;
      existing.homepageWebPlayable=true;
      existing.homepageDisplayMode='WEB_PUBLISHED';
      existing.ownerDirectWebUpload=true;
      existing.ownerWebSourceState='CURRENT_OWNER_BASELINE';
      existing.ownerWebSourceRevision=fingerprint;
      existing.ownerWebEntryFile=`${canonicalRoot}/${id}/${entryFile}`;
      if(prior!==fingerprint)existing.webDevelopmentResetRequired=true;
      updated.push(id);
      continue;
    }
    const game={
      id,
      name:ownerWebTitle(filesystem,indexFile,id),
      description:'사용자 직접 업로드 웹게임',
      genre:[],
      image:'',
      webPath:canonicalPath,
      hasWebArchive:true,
      homepageWebPlayable:true,
      homepageOfficialCard:false,
      homepageTestCandidate:false,
      homepageDisplayMode:'WEB_PUBLISHED',
      lifecycleState:'ACTIVE',
      productionClass:'DESIGN_ONLY',
      productionClassSource:'OWNER_WEB_DIRECT_UPLOAD',
      homepageCategory:'design-only',
      ownerDirectWebUpload:true,
      ownerWebSourceState:'CURRENT_OWNER_BASELINE',
      ownerWebSourceRevision:fingerprint,
      ownerWebEntryFile:`${canonicalRoot}/${id}/${entryFile}`,
      webDevelopmentResetRequired:false
    };
    catalog.games.push(game);byId.set(id,game);added.push(id);
  }
  return{catalog,added,updated,disabled,ignored};
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
  const marketingImage=clean(game.marketingImage||game.image)||'assets/pwa-icon-512.png';
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
      image:marketingImage,
      marketingImage:clean(game.marketingImage)||null,
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
    for(const field of LEGACY_DEVELOPMENT_FREEZE_FIELDS)delete game[field];
    applyHomepageAutoClassification(game);
    const id=clean(game.id||game.gameId);
    if(!id)throw new Error('catalog game id missing');
    if(ids.has(id))throw new Error('duplicate catalog game id: '+id);
    ids.add(id);
    game.productionClass=normalizedProductionClass(game.productionClass);
    if(clean(game.marketingImage))game.image=clean(game.marketingImage);
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
    orderContiguous:true,
    automaticFeatureExpansionFreezeForbidden:true
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
    for(const field of LEGACY_DEVELOPMENT_FREEZE_FIELDS)if(Object.hasOwn(game,field))errors.push('LEGACY_DEVELOPMENT_FREEZE_FORBIDDEN:'+id+':'+field);
    if(!id||!canonical||canonical.schemaVersion!==CATALOG_CANONICAL_SCHEMA_VERSION){errors.push('CANONICAL_MISSING:'+id);continue;}
    if(canonical.identity?.gameId!==id)errors.push('IDENTITY_MISMATCH:'+id);
    if(clean(game.marketingImage)){
      if(clean(game.image)!==clean(game.marketingImage))errors.push('MARKETING_IMAGE_LEGACY_MIRROR_MISMATCH:'+id);
      if(clean(canonical.identity?.image)!==clean(game.marketingImage))errors.push('MARKETING_IMAGE_CANONICAL_MISMATCH:'+id);
    }
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
