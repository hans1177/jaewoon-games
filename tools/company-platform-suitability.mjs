import fs from 'node:fs';
import path from 'node:path';

const clean=v=>String(v??'').trim();
const upper=v=>clean(v).toUpperCase();
const readJson=(file,fallback={})=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');};
const clamp=n=>Math.max(0,Math.min(100,Math.round(n)));
const label=n=>n>=90?'VERY_HIGH':n>=80?'HIGH':n>=65?'MEDIUM':'LOW';
function args(argv=process.argv.slice(2)){return Object.fromEntries(argv.filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{const [k,...v]=x.slice(2).split('=');return[k,v.join('=')]}));}

function readDesign(item={},root='.'){
  const rel=clean(item.designBaselineSource);
  return rel?readJson(path.join(root,rel),{}):{};
}
function profileOf(design={}){
  const content=design.content&&typeof design.content==='object'?design.content:design;
  return content.robloxBuildProfile||content.platformProfile||{};
}
function genreText(design={},item={}){
  const p=profileOf(design);
  return clean(p.genre||design.genre||item.genre||item.gameName||'');
}
function playMode(design={}){
  return upper(profileOf(design).playMode||design.playMode||'');
}
function multiplayer(design={}){
  const p=profileOf(design);
  return p.multiplayerRequired===true||['COOP','COMPETITIVE','HYBRID','MULTIPLAYER'].includes(playMode(design));
}
function deepGenre(text=''){
  return /RPG|SURVIVAL|ADVENTURE|STORY|SIM|TYCOON|STRATEGY|PUZZLE/i.test(text);
}
function socialGenre(text=''){
  return /SOCIAL|ROLEPLAY|SIMULATOR|TYCOON|DEFENSE|PARTY|PVP|COOP/i.test(text);
}
function departmentScores({design,item}){
  const genre=genreText(design,item),multi=multiplayer(design),deep=deepGenre(genre),social=socialGenre(genre);
  const roblox={
    planning:70+(multi?15:0)+(social?8:0),
    development:68+(multi?15:0),
    graphics:68,
    audio:70,
    qa:72+(multi?5:0),
    balance:70+(multi?8:0),
    growthMarketing:72+(social?10:0)+(multi?5:0)
  };
  const unity={
    planning:72+(deep?8:0),
    development:72+(multi?-2:5),
    graphics:82+(deep?5:0),
    audio:80+(deep?4:0),
    qa:72,
    balance:74+(deep?6:0),
    growthMarketing:70+(deep?5:0)
  };
  return {ROBLOX:roblox,UNITY:unity,signals:{genre,playMode:playMode(design)||'UNSPECIFIED',multiplayer:multi,deepSystemGenre:deep,socialGenre:social}};
}
function summarize(scores={}){
  const vals=Object.values(scores).map(Number).filter(Number.isFinite);
  const score=clamp(vals.reduce((a,b)=>a+b,0)/(vals.length||1));
  return{score,label:label(score),departments:Object.fromEntries(Object.entries(scores).map(([k,v])=>[k,clamp(v)]))};
}
export function buildPlatformSuitability({catalog={},developmentQueue={},repoRoot='.'}={}){
  const catalogById=new Map((catalog.games||[]).map(x=>[clean(x.id||x?.canonical?.identity?.gameId),x]));
  const games=[];
  for(const item of developmentQueue.items||[]){
    const gameId=clean(item.gameId);
    if(!gameId||upper(item.productionClass)!=='DEVELOPMENT_CONFIRMED')continue;
    const design=readDesign(item,repoRoot),raw=departmentScores({design,item}),game=catalogById.get(gameId)||{};
    games.push({
      gameId,
      gameName:clean(item.gameName||game.name||gameId),
      executionMode:'ROBLOX_UNITY_CONCURRENT',
      suitabilityPurpose:'DISPLAY_AND_WORK_DIRECTION_ONLY',
      ROBLOX:{...summarize(raw.ROBLOX),adaptationProfile:'SOCIAL_FAST_SESSION',
        direction:['FAST_ENTRY','MOBILE_FIRST','SOCIAL_AND_MULTIPLAYER','SHORT_REPEATABLE_GOALS','SERVER_AUTHORITATIVE_SYNC','ROBLOX_NATIVE_SERVICES']},
      UNITY:{...summarize(raw.UNITY),adaptationProfile:'DEEP_IMMERSIVE_SESSION',
        direction:['DEEP_SYSTEM_PRESENTATION','RICHER_VISUALS','CAMERA_AND_CINEMATIC_LANGUAGE','LONGER_SESSION_SUPPORT','DETAILED_CONTROLS','PERFORMANCE_SCALING','IMMERSIVE_AUDIO']},
      signals:raw.signals,
      lowerSuitabilityDoesNotDisableDevelopment:true
    });
  }
  return{
    version:1,kind:'platform-suitability',
    authority:'PRIMARY_AI_AND_VIBE_JOINT_WITH_DEPARTMENT_EVIDENCE',
    policy:'ROBLOX_UNITY_CONCURRENT_SUITABILITY_DISPLAY_ONLY',
    generatedAt:new Date().toISOString(),
    games
  };
}
if(process.argv[1]===new URL(import.meta.url).pathname){
  const a=args();
  const result=buildPlatformSuitability({
    catalog:readJson(a.catalog,{games:[]}),
    developmentQueue:readJson(a['development-queue'],{items:[]}),
    repoRoot:clean(a.root)||'.'
  });
  writeJson(a.output||'.vibe2/platform-suitability.json',result);
  console.log('PLATFORM_SUITABILITY_GAMES='+result.games.length);
  console.log('PLATFORM_SUITABILITY_MODE=DISPLAY_ONLY');
}
