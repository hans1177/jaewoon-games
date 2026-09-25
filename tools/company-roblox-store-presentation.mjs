import fs from 'node:fs';

const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const hasEnglish=v=>/[A-Za-z]/.test(clean(v));
const hasKorean=v=>/[\u3131-\u318E\uAC00-\uD7A3]/.test(clean(v));
const readJson=(f,fallback={})=>{try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch{return fallback;}};
const args=(argv=process.argv.slice(2))=>Object.fromEntries(argv.filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{const [k,...v]=x.slice(2).split('=');return[k,v.join('=')]}));
const uniq=a=>[...new Set(a.map(clean).filter(Boolean))];

export function resolveRobloxBilingualTitle({launch={},catalogEntry={},maxCodepoints=50}={}){
  const english=uniq([
    launch.robloxTitleEnglish,launch.gameTitleEn,launch.gameNameEnglish,
    catalogEntry.nameEnglish,catalogEntry.internationalTitle
  ]).find(hasEnglish)||'';
  const korean=uniq([
    launch.robloxTitleKorean,launch.gameTitleKo,launch.gameName,
    catalogEntry.name,catalogEntry?.canonical?.identity?.name
  ]).find(hasKorean)||'';
  if(!english)throw new Error('ROBLOX_BILINGUAL_TITLE_ENGLISH_MISSING');
  if(!korean)throw new Error('ROBLOX_BILINGUAL_TITLE_KOREAN_MISSING');

  const candidates=uniq([
    `${english} | ${korean}`,
    `${clean(launch.gameTitleEn)} | ${clean(launch.gameTitleKo)}`,
    `${clean(launch.gameNameEnglish)} | ${clean(launch.gameName)}`,
    `${clean(catalogEntry.nameEnglish||catalogEntry.internationalTitle)} | ${clean(catalogEntry.name||catalogEntry?.canonical?.identity?.name)}`
  ]).filter(x=>!x.startsWith(' | ')&&!x.endsWith(' | '));
  const displayName=candidates.find(x=>Array.from(x).length<=maxCodepoints);
  if(!displayName)throw new Error('ROBLOX_BILINGUAL_TITLE_TOO_LONG_NEEDS_EXPLICIT_SHORT_TITLE');
  if(!hasEnglish(displayName)||!hasKorean(displayName))throw new Error('ROBLOX_BILINGUAL_TITLE_SCRIPT_MISMATCH');
  return{displayName,english,korean,maxCodepoints,verifiedBilingual:true};
}

export function resolveRobloxStoreCreativeSpec({launch={},catalogEntry={},marketing={},gameId=''}={}){
  const title=resolveRobloxBilingualTitle({launch,catalogEntry});
  const identity=clean(
    launch.designContract?.graphicsConcept||
    launch.artDirection||
    catalogEntry.visualArtPass||
    catalogEntry?.canonical?.identity?.name||
    catalogEntry.name||
    gameId
  );
  const thumbnailDirection=clean(marketing?.creative?.thumbnailDirection);
  const shotList=uniq(marketing?.creative?.screenshotShotList||[]);
  return{
    version:1,gameId:clean(gameId||launch.gameId||catalogEntry.id),
    title,
    sourcePolicy:'ACTUAL_GAMEPLAY_FRAME_FIRST_NO_SHARED_PLACEHOLDER',
    identity,
    thumbnailDirection:thumbnailDirection||'Use a verified gameplay frame that clearly shows the game core action, main subject and environment.',
    preferredShotList:shotList,
    outputs:{
      homepageThumbnail:{width:1920,height:1080,aspect:'16:9',format:'PNG'},
      icon:{width:512,height:512,aspect:'1:1',format:'PNG'}
    },
    composition:{
      actualGameplayRequired:true,
      sharedGenericBackgroundForbidden:true,
      unrelatedHomepageImageForbidden:true,
      misleadingAddedGameplayForbidden:true,
      mildBrightnessContrastSharpnessAllowed:true,
      subjectScale:'LARGE_CLEAR_AT_SMALL_CARD_SIZE',
      actionReadability:'CORE_ACTION_VISIBLE',
      bottomCriticalContentForbidden:true,
      textOverlay:'MINIMAL_BRAND_ONLY'
    }
  };
}

if(process.argv[1]===new URL(import.meta.url).pathname){
  const a=args();
  const launch=readJson(a.launch,{});
  const catalog=readJson(a.catalog,{games:[]});
  const gameId=clean(a['game-id']||launch.gameId);
  const catalogEntry=(catalog.games||[]).find(x=>clean(x.id||x.gameId)===gameId)||{};
  const marketing=readJson(a.marketing,{});
  const result=resolveRobloxStoreCreativeSpec({launch,catalogEntry,marketing,gameId});
  const text=JSON.stringify(result,null,2)+'\n';
  if(a.output)fs.writeFileSync(a.output,text,'utf8');else process.stdout.write(text);
}
