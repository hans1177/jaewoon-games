import { pathToFileURL } from 'node:url';
import fs from 'node:fs';

export const CATALOG_CANONICAL_SCHEMA_VERSION=1;
const clean=value=>String(value??'').trim();
const bool=value=>value===true;
const list=value=>Array.isArray(value)?value.map(clean).filter(Boolean):[];

export function normalizePlatform(value){
  const raw=clean(value).toUpperCase().replace(/[\s-]+/g,'_');
  if(raw==='ROBLOX')return 'ROBLOX';
  if(['UNITY','UNITY_ANDROID','ANDROID_MOBILE'].includes(raw))return 'UNITY';
  if(['FORTNITE','FORTNITE_UEFN','UEFN'].includes(raw))return 'FORTNITE_UEFN';
  return '';
}

export function canonicalizeGameRecord(game={}){
  const runtime=game.homepageInfo&&typeof game.homepageInfo==='object'?game.homepageInfo:{};
  const selectedPlatform=normalizePlatform(runtime.platform||game.selectedPlatform||game.targetPlatform||game.preferredPlatform||game.productionTarget);
  const robloxTarget=game.robloxPublicationTarget&&typeof game.robloxPublicationTarget==='object'?game.robloxPublicationTarget:{};
  const robloxEvidence=game.robloxReleaseEvidence&&typeof game.robloxReleaseEvidence==='object'?game.robloxReleaseEvidence:{};
  const webPath=clean(game.webPath);
  const productionClass=clean(runtime.productionClass||game.productionClass||'DESIGN_ONLY').toUpperCase();
  const lifecycleState=clean(game.lifecycleState||'ACTIVE').toUpperCase();
  return {
    schemaVersion:CATALOG_CANONICAL_SCHEMA_VERSION,
    authority:'company-runtime',
    identity:{
      gameId:clean(game.id||game.gameId),
      name:clean(game.name),
      description:clean(game.description),
      genres:list(game.genre),
      image:clean(game.image)||'assets/pwa-icon-512.png',
      aliases:list(game.aliases)
    },
    lifecycle:{
      state:lifecycleState||'ACTIVE',
      reason:clean(game.lifecycleReason),
      ownerExistingGame:bool(game.ownerExistingGame)
    },
    production:{
      class:productionClass||'DESIGN_ONLY',
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
      category:clean(game.homepageCategory),
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
        genre:list(runtime.genre).length?list(runtime.genre):list(game.genre),
        genreLabel:clean(runtime.genreLabel)||list(game.genre).join(' · '),
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
  const ids=new Set();
  for(const game of catalog.games){
    const id=clean(game.id||game.gameId);
    if(!id)throw new Error('catalog game id missing');
    if(ids.has(id))throw new Error('duplicate catalog game id: '+id);
    ids.add(id);
    game.canonical=canonicalizeGameRecord(game);
  }
  catalog.catalogSchemaVersion=2;
  catalog.normalization={
    version:1,
    canonicalRecordPath:'games[].canonical',
    legacyFlatFields:'COMPATIBILITY_MIRROR',
    canonicalFirst:true,
    homepageReadsCanonicalFirst:true,
    companyStatusSyncRegeneratesCanonical:true,
    duplicateGameIdsForbidden:true,
    publicationIdentityMustStayBoundToGameId:true
  };
  catalog.runtimeCounts={...(catalog.runtimeCounts||{}),canonicalGames:catalog.games.length,normalizedGames:catalog.games.filter(game=>game.canonical?.schemaVersion===CATALOG_CANONICAL_SCHEMA_VERSION).length};
  return catalog;
}

export function validateNormalizedCatalog(catalog={}){
  const errors=[];
  if(catalog.catalogSchemaVersion!==2)errors.push('CATALOG_SCHEMA_VERSION');
  if(catalog.normalization?.canonicalRecordPath!=='games[].canonical')errors.push('NORMALIZATION_POLICY');
  const ids=new Set(),robloxPlaces=new Map(),robloxUniverses=new Map();
  for(const game of Array.isArray(catalog.games)?catalog.games:[]){
    const id=clean(game.id),canonical=game.canonical;
    if(!id||!canonical||canonical.schemaVersion!==CATALOG_CANONICAL_SCHEMA_VERSION){errors.push('CANONICAL_MISSING:'+id);continue;}
    if(canonical.identity?.gameId!==id)errors.push('IDENTITY_MISMATCH:'+id);
    if(ids.has(id))errors.push('DUPLICATE_GAME_ID:'+id);ids.add(id);
    if(canonical.production?.class!==clean(game.productionClass||'DESIGN_ONLY').toUpperCase())errors.push('PRODUCTION_MIRROR_MISMATCH:'+id);
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
  const catalog=normalizeCatalog(JSON.parse(fs.readFileSync(file,'utf8')));
  const validation=validateNormalizedCatalog(catalog);
  if(!validation.pass)throw new Error(validation.errors.join(','));
  fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n');
  console.log('GAME_CATALOG_NORMALIZATION=PASS');
  console.log('GAME_CATALOG_NORMALIZED='+validation.gameCount);
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  try{main();}catch(error){console.error(error.stack||error.message);process.exitCode=1;}
}
