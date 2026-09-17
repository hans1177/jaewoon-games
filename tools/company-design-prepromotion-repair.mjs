import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadSeedState,activeSeedForGame} from './game-seed-state.mjs';
import {classifyRobloxGenre} from './roblox-genre-profile.mjs';

const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clip=(value,max)=>clean(value).slice(0,max);
const MODES=new Set(['SINGLE','COOP','COMPETITIVE','HYBRID']);
const MULTIPLAYER_MODE_CONTRACT_DATE='2026-09-15';

function cloneObject(value){
  if(!value||Array.isArray(value)||typeof value!=='object')return {};
  return JSON.parse(JSON.stringify(value));
}
function firstText(...values){for(const value of values){const text=clean(value);if(text)return text;}return '';}
function factText(factPack,...keys){
  for(const key of keys){
    const direct=factPack?.[key];if(clean(direct))return clean(direct);
    const game=factPack?.game?.[key];if(clean(game))return clean(game);
    const design=factPack?.design?.[key];if(clean(design))return clean(design);
  }
  return '';
}
function seedLoop(seed){
  if(Array.isArray(seed?.CORE_LOOP))return seed.CORE_LOOP.map(clean).filter(Boolean).slice(0,8);
  const raw=clean(seed?.CORE_LOOP);if(!raw)return [];
  const split=raw.split(/(?:->|→|>|\||;|\n)/).map(clean).filter(Boolean);
  return split.length>=3?split.slice(0,8):[];
}
function seedMode(seed){
  const explicit=clean(seed?.MULTIPLAYER_DESIGN_MODE).toUpperCase();if(MODES.has(explicit))return explicit;
  const initial=clean(seed?.INITIAL_PLAY_MODE).toUpperCase();if(MODES.has(initial))return initial;
  return '';
}
function legacyDesignDate(date){
  const value=clean(date);
  return /^\d{4}-\d{2}-\d{2}$/.test(value)&&value<MULTIPLAYER_MODE_CONTRACT_DATE;
}
function designSignalText(value){
  const out=cloneObject(value);
  const signature=Array.isArray(out.signatureSystems)?out.signatureSystems.flatMap(row=>[row?.name,row?.purpose,row?.playerChoice]):[];
  return [out.identity,out.playerFantasy,out.coreFun,...(Array.isArray(out.coreLoop)?out.coreLoop:[]),...signature].map(clean).filter(Boolean).join(' ').toLowerCase();
}
function matchedSignals(text,patterns){
  return patterns.filter(([pattern])=>pattern.test(text)).map(([,name])=>name);
}
export function inferLegacyMultiplayerMode(value,{date=''}={}){
  const explicit=clean(value?.multiplayerMode).toUpperCase();
  if(MODES.has(explicit))return {mode:explicit,source:'EXPLICIT_DESIGN_MODE',signals:[]};
  if(!legacyDesignDate(date))return {mode:'',source:'',signals:[]};
  const text=designSignalText(value);
  const multiplayerContext=/\b(multiplayer|party|players?|peers?|opponents?|co-?op|cooperative|team)\b/i.test(text);
  if(!multiplayerContext)return {mode:'',source:'',signals:[]};
  const competitive=matchedSignals(text,[
    [/\brace\b/i,'race'],[/\bposition\b/i,'position'],[/\brank(?:ing)?\b/i,'rank'],[/\bleaderboard\b/i,'leaderboard'],
    [/\bversus\b|\bvs\.?\b/i,'versus'],[/\bwinner\b/i,'winner'],[/\bpvp\b/i,'pvp'],
  ]);
  const cooperative=matchedSignals(text,[
    [/\bco-?op\b|\bcooperative\b/i,'cooperative'],[/\bshared objective\b/i,'shared-objective'],
    [/\bwork together\b/i,'work-together'],[/\bteam objective\b/i,'team-objective'],[/\bteam up\b/i,'team-up'],
  ]);
  if(competitive.length>=2&&cooperative.length===0)return {mode:'COMPETITIVE',source:'LEGACY_DESIGN.COMPETITIVE_LOOP_SIGNALS',signals:competitive};
  if(cooperative.length>=2&&competitive.length===0)return {mode:'COOP',source:'LEGACY_DESIGN.COOPERATIVE_LOOP_SIGNALS',signals:cooperative};
  if(competitive.length>=2&&cooperative.length>=2)return {mode:'HYBRID',source:'LEGACY_DESIGN.HYBRID_LOOP_SIGNALS',signals:[...competitive,...cooperative]};
  return {mode:'',source:'',signals:[...competitive,...cooperative]};
}
function setMissing(out,key,value,max,repairs,source){
  if(clean(out?.[key])||value===undefined||value===null)return;
  const text=clip(value,max);if(!text)return;
  out[key]=text;repairs.push({field:key,source});
}
function setMissingArray(out,key,value,repairs,source,{min=0,max=8}={}){
  if(Array.isArray(out?.[key]))return;
  const items=Array.isArray(value)?value.map(clean).filter(Boolean).slice(0,max):[];
  if(items.length<min)return;
  out[key]=items;repairs.push({field:key,source});
}
function robloxBuildProfile(out,seed,mode){
  if(!MODES.has(mode))return null;
  const classified=classifyRobloxGenre({
    category:clean(seed?.GAME_CATEGORY),
    identity:firstText(out?.identity,seed?.DISTINCT_IDENTITY),
    coreLoop:Array.isArray(out?.coreLoop)?out.coreLoop:seedLoop(seed),
    designText:JSON.stringify(out||{}),
    multiplayerMode:mode
  });
  const multiplayerRequired=mode!=='SINGLE';
  return {
    version:1,
    targetPlatform:'ROBLOX',
    taxonomy:classified.taxonomy,
    declaredGameCategory:clean(seed?.GAME_CATEGORY),
    genre:classified.genre,
    genreLabelKo:classified.genreLabelKo,
    subgenre:classified.subgenre,
    subgenreLabelKo:classified.subgenreLabelKo,
    playMode:mode,
    playModeLabelKo:classified.playModeLabelKo,
    multiplayerRequired,
    coopImplementationRequired:mode==='COOP'||mode==='HYBRID',
    competitiveImplementationRequired:mode==='COMPETITIVE'||mode==='HYBRID',
    networkingRequired:multiplayerRequired,
    multiplayerQaRequired:multiplayerRequired,
    minimumParticipantsForRequiredQa:multiplayerRequired?2:1,
    displayLabelKo:classified.displayLabelKo
  };
}
function validRobloxBuildProfile(profile,mode){
  if(!profile||Array.isArray(profile)||typeof profile!=='object')return false;
  if(profile.targetPlatform!=='ROBLOX'||clean(profile.playMode).toUpperCase()!==mode)return false;
  if(!clean(profile.genre)||clean(profile.genre)==='Utility & other')return false;
  const multi=mode!=='SINGLE';
  if(profile.multiplayerRequired!==multi||profile.networkingRequired!==multi||profile.multiplayerQaRequired!==multi)return false;
  if(profile.coopImplementationRequired!==(mode==='COOP'||mode==='HYBRID'))return false;
  if(profile.competitiveImplementationRequired!==(mode==='COMPETITIVE'||mode==='HYBRID'))return false;
  return Number(profile.minimumParticipantsForRequiredQa)===(multi?2:1);
}

export function repairDesignRequiredFields(value,{seed={},factPack={},phase='UNKNOWN',designDate='',allowLegacyMultiplayerInference=false}={}){
  const out=cloneObject(value);const repairs=[];
  const loop=seedLoop(seed);let mode=seedMode(seed);
  const identity=firstText(seed?.DISTINCT_IDENTITY,factText(factPack,'distinctIdentity','description'));
  const coreFun=firstText(seed?.CORE_FUN_TO_LEARN,loop.join(' → '),identity);
  const targetAudience=firstText(seed?.TARGET_AUDIENCE,factText(factPack,'targetAudience'));
  const targetPlatform=firstText(seed?.INITIAL_TARGET_PLATFORM,factText(factPack,'targetPlatform'));
  const market=firstText(seed?.MARKET_EVIDENCE_SUMMARY,factText(factPack,'marketEvidenceSummary'));
  const session=firstText(seed?.TARGET_SESSION_DIRECTION,factText(factPack,'targetSessionDirection'));
  const expansion=firstText(seed?.CROSS_PLATFORM_EXPANSION_VALUE,factText(factPack,'crossPlatformExpansionValue'));

  setMissing(out,'identity',identity,1000,repairs,'GAME_SEED.DISTINCT_IDENTITY');
  setMissing(out,'playerFantasy',firstText(seed?.CORE_FUN_TO_LEARN,identity),900,repairs,'GAME_SEED.CORE_FUN_TO_LEARN_OR_IDENTITY');
  setMissing(out,'coreFun',coreFun,900,repairs,'GAME_SEED.CORE_FUN_TO_LEARN_OR_CORE_LOOP');
  if((!Array.isArray(out.coreLoop)||out.coreLoop.length<3)&&loop.length>=3){out.coreLoop=loop;repairs.push({field:'coreLoop',source:'GAME_SEED.CORE_LOOP'});}
  setMissingArray(out,'signatureSystems',[],repairs,'STRUCTURAL_EMPTY_ALLOWED',{min:0,max:6});
  setMissing(out,'progressionDirection',session,900,repairs,'GAME_SEED.TARGET_SESSION_DIRECTION');
  setMissing(out,'visualDirection',firstText(factText(factPack,'visualDirection','artDirection'),identity&&`GAME_SEED 정체성 '${identity}'을 유지하는 시각 방향`),900,repairs,'FACT_PACK_OR_GAME_SEED_IDENTITY');
  setMissing(out,'mobileUx',targetPlatform&&`선택 플랫폼 ${targetPlatform}에서 핵심 조작과 정보 우선순위를 유지한다${targetAudience?`; 대상 ${targetAudience}`:''}`,900,repairs,'GAME_SEED.INITIAL_TARGET_PLATFORM_AND_TARGET_AUDIENCE');
  setMissing(out,'marketTargetDirection',firstText([market,targetAudience].filter(Boolean).join(' / '),targetAudience),900,repairs,'GAME_SEED.MARKET_EVIDENCE_SUMMARY_AND_TARGET_AUDIENCE');
  setMissing(out,'steamExpansionDecision',firstText(expansion,targetPlatform&&`선택 플랫폼 ${targetPlatform} 검증을 우선하고 추가 PC 확장은 검증 후 결정한다`),500,repairs,'GAME_SEED.CROSS_PLATFORM_EXPANSION_VALUE_OR_TARGET_PLATFORM');
  if(!MODES.has(clean(out.multiplayerMode).toUpperCase())&&mode){out.multiplayerMode=mode;repairs.push({field:'multiplayerMode',source:'GAME_SEED.MULTIPLAYER_DESIGN_MODE_OR_INITIAL_PLAY_MODE'});}
  if(!MODES.has(clean(out.multiplayerMode).toUpperCase())&&allowLegacyMultiplayerInference){
    const inferred=inferLegacyMultiplayerMode(out,{date:designDate});
    if(inferred.mode){mode=inferred.mode;out.multiplayerMode=mode;repairs.push({field:'multiplayerMode',source:inferred.source,signals:inferred.signals});}
  }
  if(!mode&&MODES.has(clean(out.multiplayerMode).toUpperCase()))mode=clean(out.multiplayerMode).toUpperCase();
  setMissing(out,'multiplayerExpansionDecision',mode&&firstText(expansion,`${mode} 코어루프를 보존하며 확장은 별도 검증 후 결정한다`),500,repairs,'GAME_SEED_OR_LEGACY_MULTIPLAYER_MODE_AND_CROSS_PLATFORM_VALUE');
  if(MODES.has(mode)){
    const profile=robloxBuildProfile(out,seed,mode);
    if(JSON.stringify(out.robloxBuildProfile||null)!==JSON.stringify(profile)){out.robloxBuildProfile=profile;repairs.push({field:'robloxBuildProfile',source:'GAME_SEED+REVISED_DESIGN+ROBLOX_GENRE_TAXONOMY'});}
  }
  setMissingArray(out,'technicalAssumptions',[],repairs,'STRUCTURAL_EMPTY_ALLOWED',{min:0,max:8});
  setMissingArray(out,'validationQuestions',[],repairs,'STRUCTURAL_EMPTY_ALLOWED',{min:0,max:8});
  setMissingArray(out,'openQuestions',[],repairs,'STRUCTURAL_EMPTY_ALLOWED',{min:0,max:8});

  const required=['identity','playerFantasy','coreFun','coreLoop','signatureSystems','progressionDirection','visualDirection','mobileUx','marketTargetDirection','steamExpansionDecision','multiplayerMode','multiplayerExpansionDecision','robloxBuildProfile','technicalAssumptions','validationQuestions','openQuestions'];
  const unresolved=required.filter(key=>{
    if(key==='coreLoop')return !Array.isArray(out[key])||out[key].length<3;
    if(['signatureSystems','technicalAssumptions','validationQuestions','openQuestions'].includes(key))return !Array.isArray(out[key]);
    if(key==='multiplayerMode')return !MODES.has(clean(out[key]).toUpperCase());
    if(key==='robloxBuildProfile')return !validRobloxBuildProfile(out[key],clean(out.multiplayerMode).toUpperCase());
    return !clean(out[key]);
  });
  return {value:out,repairs,unresolved,phase};
}

export function repairPersistedDesignForPromotion({root='.',designRoot='design',gameId,date,phase='PRE_REVIEW'}={}){
  const resolvedDesignRoot=path.isAbsolute(designRoot)?designRoot:path.join(root,designRoot);
  const base=path.join(resolvedDesignRoot,gameId,date);const revisedPath=path.join(base,'design-revised.json');
  const revised=readJson(revisedPath,null);if(!revised?.content)return {changed:false,repairs:[],unresolved:['design-revised.json'],reason:'DESIGN_REVISED_MISSING',robloxBuildProfile:null};
  const state=loadSeedState(path.join(root,'game-seed-state.json'));const seed=activeSeedForGame(state,gameId);
  const legacyEligible=legacyDesignDate(date)&&!MODES.has(clean(revised.content.multiplayerMode).toUpperCase());
  if(!seed&&!legacyEligible)return {changed:false,repairs:[],unresolved:['active-game-seed'],reason:'ACTIVE_SEED_MISSING',robloxBuildProfile:revised.content.robloxBuildProfile||null};
  const factPack=readJson(path.join(root,'artbook-submissions',gameId,date,'fact-pack.json'),{});
  const strictPath=path.join(base,'strict-design-review.json');const strictBefore=readJson(strictPath,null);
  if(phase==='REVIEW_FEEDBACK'&&strictBefore?.verdict==='PASS'&&Number(strictBefore?.totalScore)>=80&&Array.isArray(strictBefore?.hardFailures)&&strictBefore.hardFailures.length===0)return {changed:false,repairs:[],unresolved:[],reason:'STRICT_ALREADY_PASS',robloxBuildProfile:revised.content.robloxBuildProfile||null};
  const repaired=repairDesignRequiredFields(revised.content,{seed:seed||{},factPack,phase,designDate:date,allowLegacyMultiplayerInference:legacyEligible});
  const changed=repaired.repairs.length>0;
  if(changed){revised.content=repaired.value;revised.prePromotionRepair={phase,repairs:repaired.repairs,groundedOnly:true,legacyMultiplayerNormalization:repaired.repairs.some(row=>String(row.source||'').startsWith('LEGACY_DESIGN.')),strictScoreOrVerdictModified:false,repairedAt:new Date().toISOString()};writeJson(revisedPath,revised);}
  const strictAfter=readJson(strictPath,null);
  if(JSON.stringify(strictBefore)!==JSON.stringify(strictAfter))throw new Error('STRICT_REVIEW_MUTATION_FORBIDDEN');
  return {changed,repairs:repaired.repairs,unresolved:repaired.unresolved,reason:changed?'GROUNDED_DESIGN_FIELDS_REPAIRED':'NO_SAFE_REPAIR_REQUIRED',robloxBuildProfile:repaired.value.robloxBuildProfile||null};
}

function arg(name){const hit=process.argv.find(value=>value.startsWith(`--${name}=`));return hit?clean(hit.slice(name.length+3)):'';}
function kstDate(){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=type=>parts.find(x=>x.type===type)?.value||'';return `${get('year')}-${get('month')}-${get('day')}`;}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const gameId=arg('game-id')||clean(process.env.GAME_ID||process.env.ARTBOOK_GAME_ID);const date=arg('date')||clean(process.env.DESIGN_DATE||process.env.ARTBOOK_DATE)||kstDate();const phase=(arg('phase')||'PRE_REVIEW').toUpperCase();
  if(!gameId)throw new Error('PREPROMOTION_REPAIR_GAME_ID_REQUIRED');
  const result=repairPersistedDesignForPromotion({gameId,date,phase});
  const build=result.robloxBuildProfile||{};
  console.log(`PREPROMOTION_REPAIR_CHANGED=${result.changed?'YES':'NO'}`);
  console.log(`PREPROMOTION_REPAIR_REASON=${result.reason}`);
  console.log(`PREPROMOTION_REPAIR_FIELDS=${result.repairs.map(x=>x.field).join(',')}`);
  console.log(`PREPROMOTION_REPAIR_UNRESOLVED=${result.unresolved.join(',')}`);
  console.log(`ROBLOX_BUILD_GENRE=${clean(build.genre)||'MISSING'}`);
  console.log(`ROBLOX_BUILD_SUBGENRE=${clean(build.subgenre)||'NONE'}`);
  console.log(`ROBLOX_BUILD_PLAY_MODE=${clean(build.playMode)||'MISSING'}`);
  console.log(`ROBLOX_BUILD_MULTIPLAYER_REQUIRED=${build.multiplayerRequired===true?'YES':'NO'}`);
  console.log(`ROBLOX_BUILD_COOP_REQUIRED=${build.coopImplementationRequired===true?'YES':'NO'}`);
  console.log(`ROBLOX_BUILD_COMPETITIVE_REQUIRED=${build.competitiveImplementationRequired===true?'YES':'NO'}`);
  console.log(`ROBLOX_BUILD_MIN_QA_PARTICIPANTS=${Number(build.minimumParticipantsForRequiredQa||0)}`);
  console.log('PREPROMOTION_REPAIR_GROUNDED_ONLY=YES');
  console.log('PREPROMOTION_REPAIR_STRICT_SCORE_SYNTHESIZED=NO');
  console.log('PREPROMOTION_REPAIR_STRICT_VERDICT_SYNTHESIZED=NO');
  console.log('DESIGN_ONLY_ARTBOOK_BEFORE_PROMOTION=NO');
}
