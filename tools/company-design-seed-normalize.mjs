import {loadSeedState,saveSeedState,activeSeedForGame} from './game-seed-state.mjs';
import {GAME_SEED_POLICY,assertGameSeed} from './company-game-seed-contract.mjs';

const clean=value=>String(value??'').trim();
const uniq=value=>[...new Set((Array.isArray(value)?value:[]).map(clean).filter(Boolean))];
const gameId=clean(process.env.GAME_ID||process.env.ARTBOOK_GAME_ID||process.argv.find(arg=>arg.startsWith('--game-id='))?.split('=')[1]);
if(!gameId)throw new Error('DESIGN_SEED_NORMALIZE_GAME_ID_REQUIRED');

const state=loadSeedState();
const seed=activeSeedForGame(state,gameId);
if(!seed)throw new Error(`DESIGN_SEED_NORMALIZE_ACTIVE_SEED_REQUIRED: ${gameId}`);
const changes=[];
const allowedPlatforms=new Set(GAME_SEED_POLICY.allowedTargetPlatforms||['ROBLOX','UNITY','FORTNITE_UEFN']);
const allowedModes=new Set(GAME_SEED_POLICY.multiplayerModes||['SINGLE','COOP','COMPETITIVE','HYBRID']);

function setIfChanged(key,value,reason){
  if(JSON.stringify(seed[key])===JSON.stringify(value))return;
  seed[key]=value;
  changes.push({field:key,reason});
}

setIfChanged('REFERENCE_GAMES',uniq(seed.REFERENCE_GAMES).slice(0,4),'NORMALIZE_OPTIONAL_REFERENCE_GAMES');

const materialIds=uniq(seed.SEED_MATERIAL_IDS).slice(0,4);
if(Array.isArray(seed.SEED_MATERIAL_IDS)&&materialIds.length>=2)setIfChanged('SEED_MATERIAL_IDS',materialIds,'NORMALIZE_MATERIAL_IDS');
if(!Array.isArray(seed.SEED_MATERIAL_IDS))delete seed.SEED_MATERIAL_IDS;
if(!Array.isArray(seed.REFERENCE_INPUTS)||seed.REFERENCE_INPUTS.length===0){
  const materialMap=new Map((state.seedMaterials||[]).map(row=>[clean(row?.materialId),row]));
  const materialInputs=materialIds.map(id=>materialMap.get(id)).filter(Boolean).map(row=>({
    type:'SEED_MATERIAL',
    id:clean(row.materialId),
    sourceFamily:clean(row.sourceFamily)||null,
    value:clean(row.concept)||clean(row.value)||clean(row.materialId)
  }));
  setIfChanged('REFERENCE_INPUTS',materialInputs.length?materialInputs:[{type:'ORIGINAL_MATERIAL',value:'original non-game seed material composition'}],'ENSURE_REFERENCE_INPUTS_WITHOUT_INVENTING_REFERENCE_GAME');
}

let platform=clean(seed.INITIAL_TARGET_PLATFORM).toUpperCase().replaceAll('-','_');
if(platform==='ANDROID_MOBILE'||platform==='UNITY_ANDROID')platform='UNITY';
if(platform==='UEFN'||platform==='FORTNITE')platform='FORTNITE_UEFN';
if(!allowedPlatforms.has(platform))platform=GAME_SEED_POLICY.initialTargetPlatform||'ROBLOX';
setIfChanged('INITIAL_TARGET_PLATFORM',platform,'NORMALIZE_SELECTED_PLATFORM');

let mode=clean(seed.MULTIPLAYER_DESIGN_MODE||seed.INITIAL_PLAY_MODE).toUpperCase();
if(!allowedModes.has(mode))mode=String(seed.INITIAL_PLAY_MODE||'').toUpperCase().includes('MULTI')?'HYBRID':'SINGLE';
setIfChanged('MULTIPLAYER_DESIGN_MODE',mode,'NORMALIZE_DESIGN_PLAY_MODE');
if(!clean(seed.INITIAL_PLAY_MODE))setIfChanged('INITIAL_PLAY_MODE',GAME_SEED_POLICY.initialPlayMode||'SINGLE','ENSURE_INITIAL_PLAY_MODE');
if(Number(seed.TARGET_SESSION_MINUTES||0)!==30)setIfChanged('TARGET_SESSION_MINUTES',30,'NORMALIZE_DESIGN_SESSION_TARGET');
if(seed.MULTIPLAYER_DESIGN_REQUIRED_AT_DESIGN!==true)setIfChanged('MULTIPLAYER_DESIGN_REQUIRED_AT_DESIGN',true,'DESIGN_MODE_REQUIRED');
setIfChanged('MULTIPLAYER_QA_REQUIRED',mode!=='SINGLE','ALIGN_MULTIPLAYER_QA_REQUIREMENT');

assertGameSeed(seed);
if(changes.length)saveSeedState(state);
console.log('DESIGN_SEED_NORMALIZE=PASS');
console.log(`DESIGN_SEED_NORMALIZE_GAME=${gameId}`);
console.log(`DESIGN_SEED_NORMALIZE_CHANGED=${changes.length?'YES':'NO'}`);
console.log(`DESIGN_SEED_NORMALIZE_FIELDS=${changes.map(item=>item.field).join(',')||'NONE'}`);
console.log(`DESIGN_SEED_REFERENCE_GAMES=${Array.isArray(seed.REFERENCE_GAMES)?seed.REFERENCE_GAMES.length:0}`);
console.log(`DESIGN_SEED_REFERENCE_GAMES_OPTIONAL_EMPTY=${Array.isArray(seed.REFERENCE_GAMES)&&seed.REFERENCE_GAMES.length===0?'YES':'NO'}`);
console.log(`DESIGN_SEED_TARGET_PLATFORM=${seed.INITIAL_TARGET_PLATFORM}`);
console.log(`DESIGN_SEED_MULTIPLAYER_MODE=${seed.MULTIPLAYER_DESIGN_MODE}`);
