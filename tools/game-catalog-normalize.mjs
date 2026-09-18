import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { homepageCategoryForProductionClass, normalizeProductionClass, PRODUCTION_CLASSES } from './production-classification.mjs';

const POLICY_PATH='company-learning/catalog-homepage-normalization.json';
const clean=value=>String(value??'').trim();
const bool=value=>value===true;
const uniqueStrings=values=>[...new Set((Array.isArray(values)?values:[]).map(clean).filter(Boolean))];
const rank=(map,key,fallback=999)=>Number.isFinite(Number(map?.[key]))?Number(map[key]):fallback;

export function normalizeCatalogPlatform(value){
  const raw=clean(value).toUpperCase().replace(/[\s-]+/g,'_');
  if(raw==='ROBLOX')return'ROBLOX';
  if(['UNITY','UNITY_ANDROID','ANDROID_MOBILE'].includes(raw))return'UNITY';
  if(['FORTNITE','FORTNITE_UEFN','UEFN'].includes(raw))return'FORTNITE_UEFN';
  return'';
}

function lifecycleOf(game={}){
  const raw=clean(game.lifecycleState||game.lifecycle?.state||'ACTIVE').toUpperCase();
  return ['ACTIVE','REBUILD','PAUSED','RETIRED','REMOVED'].includes(raw)?raw:'ACTIVE';
}
function platformOf(game={}){
  for(const candidate of [
    game.homepageInfo?.platform,
    game.selectedPlatform,
    game.targetPlatform,
    game.preferredPlatform,
    game.productionTarget
  ]){
    const p=normalizeCatalogPlatform(candidate);
    if(p)return p;
  }
  return'';
}
function classOf(game={}){
  return normalizeProductionClass(game.productionClass)||PRODUCTION_CLASSES.DESIGN_ONLY;
}
function displayModeOf(game={}){
  const explicit=clean(game.homepageDisplayMode).toUpperCase();
  if(explicit)return explicit;
  const legacy=clean(game.homepageCategory).toLowerCase();
  const target=game.robloxPublicationTarget||{};
  const evidence=game.robloxReleaseEvidence||{};
  if(legacy==='historical-deployed'||(target.historical===true&&target.verified===true&&evidence.historicalPublicationTargetVerified===true)){
    return'ROBLOX_HISTORICAL_DEPLOYMENT';
  }
  return'';
}

export function compareCatalogGames(a={},b={},policy={}){
  const order=policy?.catalog?.ordering||{};
  const lifecycleRank=order.lifecycleRank||{ACTIVE:0,REBUILD:1,PAUSED:2,RETIRED:3,REMOVED:4};
  const classRank=order.productionClassRank||{RELEASE_CONFIRMED:0,DEVELOPMENT_CONFIRMED:1,DESIGN_ONLY:2};
  const featuredRank=order.featuredRank||{'true':0,'false':1};
  const platformRank=order.platformRank||{ROBLOX:0,UNITY:1,FORTNITE_UEFN:2,UNSELECTED:3};
  return rank(lifecycleRank,lifecycleOf(a))
    -rank(lifecycleRank,lifecycleOf(b))
    ||rank(classRank,classOf(a))-rank(classRank,classOf(b))
    ||rank(featuredRank,String(bool(a.featured)))-rank(featuredRank,String(bool(b.featured)))
    ||rank(platformRank,platformOf(a)||'UNSELECTED')-rank(platformRank,platformOf(b)||'UNSELECTED')
    ||clean(a.id).localeCompare(clean(b.id),'en');
}

function orderedHomepageInfo(info={},game={}){
  const cls=classOf(game),genres=uniqueStrings(game.genre);
  const platform=normalizeCatalogPlatform(info.platform||platformOf(game));
  const known={
    authority:clean(info.authority)||'company-runtime',
    platform,
    platformLabel:clean(info.platformLabel),
    score:info.score??null,
    scoreLabel:clean(info.scoreLabel),
    scoreCurrent:info.scoreCurrent===true,
    scoreSource:clean(info.scoreSource),
    validationSchemaVersion:info.validationSchemaVersion??null,
    genre:genres,
    genreLabel:clean(info.genreLabel)||genres.join(' · '),
    subgenre:clean(info.subgenre),
    playMode:clean(info.playMode).toUpperCase(),
    playModeLabel:clean(info.playModeLabel),
    latestWork:clean(info.latestWork),
    updatedAt:info.updatedAt??null,
    status:clean(info.status)||lifecycleOf(game),
    productionClass:cls
  };
  const extra={};
  for(const key of Object.keys(info).sort()){
    if(Object.hasOwn(known,key))continue;
    extra[key]=info[key];
  }
  return{...known,...extra};
}

function orderedGame(game={},order=0){
  const cls=classOf(game);
  const displayMode=displayModeOf(game);
  const platform=platformOf(game);
  const known={
    id:clean(game.id),
    name:clean(game.name),
    description:clean(game.description),
    genre:uniqueStrings(game.genre),
    image:clean(game.image),
    webPath:clean(game.webPath),
    hasWebArchive:game.hasWebArchive===true,
    featured:game.featured===true,
    homepageWebPlayable:game.homepageWebPlayable===true,
    homepageCategory:homepageCategoryForProductionClass(cls)||'design-only',
    productionClass:cls,
    productionClassSource:clean(game.productionClassSource),
    productionTarget:clean(game.productionTarget),
    lifecycleState:lifecycleOf(game),
    lifecycleReason:clean(game.lifecycleReason),
    ownerExistingGame:game.ownerExistingGame===true,
    developmentHandling:clean(game.developmentHandling),
    homepageStage:clean(game.homepageStage),
    homepageRecentWork:clean(game.homepageRecentWork),
    webPurpose:clean(game.webPurpose),
    selectedPlatform:platform,
    homepageDisplayMode:displayMode,
    catalogOrder:order,
    homepageInfo:orderedHomepageInfo(game.homepageInfo||{},game)
  };
  const extra={};
  for(const key of Object.keys(game).sort()){
    if(Object.hasOwn(known,key))continue;
    extra[key]=game[key];
  }
  const output={};
  for(const [key,value] of Object.entries({...known,...extra})){
    if(value===''&&['selectedPlatform','homepageDisplayMode','webPurpose'].includes(key))continue;
    output[key]=value;
  }
  return output;
}

export function normalizeGameCatalog(catalog={},policy={}){
  if(!catalog||!Array.isArray(catalog.games))throw new Error('CATALOG_GAMES_REQUIRED');
  const ids=new Set();
  for(const game of catalog.games){
    const id=clean(game?.id);
    if(!id)throw new Error('CATALOG_GAME_ID_REQUIRED');
    if(ids.has(id))throw new Error(`CATALOG_DUPLICATE_ID:${id}`);
    ids.add(id);
    if(!normalizeProductionClass(game?.productionClass))throw new Error(`CATALOG_PRODUCTION_CLASS_INVALID:${id}`);
  }
  const sorted=[...catalog.games].sort((a,b)=>compareCatalogGames(a,b,policy));
  const games=sorted.map((game,index)=>orderedGame(game,index+1));
  const known={
    version:Number(catalog.version)||1,
    updatedAt:catalog.updatedAt??null,
    catalogSchemaVersion:Number(policy?.catalog?.schemaVersion||1),
    normalization:{
      authority:'MACHINE_EXECUTION_CONTRACT',
      policy:policy?.machineSourceOfTruth||POLICY_PATH,
      normalized:true,
      mode:policy?.catalog?.ordering?.mode||'CANONICAL_STABLE',
      orderField:policy?.catalog?.ordering?.outputField||'catalogOrder'
    },
    classificationPolicy:catalog.classificationPolicy||{},
    runtimeAuthority:catalog.runtimeAuthority,
    runtimeInfoAuthority:catalog.runtimeInfoAuthority,
    runtimeSupportedPlatforms:Array.isArray(catalog.runtimeSupportedPlatforms)?catalog.runtimeSupportedPlatforms:undefined,
    runtimeCounts:catalog.runtimeCounts,
    games
  };
  const extra={};
  for(const key of Object.keys(catalog).sort()){
    if(Object.hasOwn(known,key))continue;
    extra[key]=catalog[key];
  }
  const output={};
  for(const [key,value] of Object.entries({...known,...extra}))if(value!==undefined)output[key]=value;
  return output;
}

export function validateNormalizedGameCatalog(catalog={},policy={}){
  const failures=[];
  if(!Array.isArray(catalog.games)||!catalog.games.length)failures.push('CATALOG_EMPTY');
  if(catalog.normalization?.normalized!==true)failures.push('NORMALIZATION_METADATA_MISSING');
  if(Number(catalog.catalogSchemaVersion)!==Number(policy?.catalog?.schemaVersion||1))failures.push('SCHEMA_VERSION_MISMATCH');
  const ids=new Set();
  const expected=[...(catalog.games||[])].sort((a,b)=>compareCatalogGames(a,b,policy)).map(x=>clean(x.id));
  for(let index=0;index<(catalog.games||[]).length;index+=1){
    const game=catalog.games[index]||{},id=clean(game.id);
    if(!id)failures.push(`ID_MISSING:${index}`);
    if(ids.has(id))failures.push(`DUPLICATE_ID:${id}`);else ids.add(id);
    if(Number(game.catalogOrder)!==index+1)failures.push(`ORDER_NOT_CONTIGUOUS:${id}`);
    const cls=normalizeProductionClass(game.productionClass);
    if(!cls)failures.push(`PRODUCTION_CLASS_INVALID:${id}`);
    if(homepageCategoryForProductionClass(cls)!==game.homepageCategory)failures.push(`HOMEPAGE_CATEGORY_MISMATCH:${id}`);
    if(game.homepageInfo?.productionClass!==cls)failures.push(`HOMEPAGE_INFO_CLASS_MISMATCH:${id}`);
    if(JSON.stringify(uniqueStrings(game.genre))!==JSON.stringify(game.homepageInfo?.genre||[]))failures.push(`HOMEPAGE_GENRE_MISMATCH:${id}`);
    if(expected[index]!==id)failures.push(`CANONICAL_SORT_MISMATCH:${id}`);
  }
  return{pass:failures.length===0,failures,count:(catalog.games||[]).length};
}

function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i+=1){
    const raw=argv[i];if(!raw.startsWith('--'))continue;
    const [key,inline]=raw.slice(2).split('=',2);
    out[key]=inline??true;
  }
  return out;
}
function main(){
  const args=parseArgs(process.argv.slice(2));
  const file=clean(args.file)||'game-catalog.json';
  const policyFile=clean(args.policy)||POLICY_PATH;
  const policy=JSON.parse(fs.readFileSync(policyFile,'utf8'));
  const source=JSON.parse(fs.readFileSync(file,'utf8'));
  if(args.check===true||args.check==='true'){
    const result=validateNormalizedGameCatalog(source,policy);
    console.log(JSON.stringify({version:1,state:result.pass?'PASS':'FAIL',...result}));
    if(!result.pass)process.exitCode=1;
    return;
  }
  const normalized=normalizeGameCatalog(source,policy);
  fs.writeFileSync(file,JSON.stringify(normalized,null,2)+'\n');
  const result=validateNormalizedGameCatalog(normalized,policy);
  console.log(JSON.stringify({version:1,state:result.pass?'PASS':'FAIL',...result}));
  if(!result.pass)process.exitCode=1;
}
const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain)main();
