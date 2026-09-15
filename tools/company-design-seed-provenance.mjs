import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadSeedState,activeSeedForGame} from './game-seed-state.mjs';

const clean=value=>String(value??'').trim();
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};

export function seedRevisionOf(seed){
  return clean(seed?.ownerResetRevision||seed?.seedRevision||seed?.revision);
}

export function designArtifactsMatchSeed({root='.',gameId,date,seed}={}){
  const id=clean(gameId||seed?.gameId);
  const expectedSeedId=clean(seed?.seedId);
  const expectedRevision=seedRevisionOf(seed);
  if(!id||!date||!expectedSeedId)return {match:false,reason:'EXPECTED_SEED_PROVENANCE_MISSING'};
  const base=path.join(root,'design',id,date);
  const status=readJson(path.join(base,'cycle-status.json'),null);
  const revised=readJson(path.join(base,'design-revised.json'),null);
  if(!status||!revised)return {match:false,reason:'DESIGN_PROVENANCE_FILES_MISSING'};
  const statusSeedId=clean(status?.gameSeed?.seedId);
  const revisedSeedId=clean(revised?.gameSeedId);
  if(statusSeedId!==expectedSeedId||revisedSeedId!==expectedSeedId){
    return {match:false,reason:'DESIGN_SEED_ID_MISMATCH',expectedSeedId,statusSeedId,revisedSeedId,expectedRevision};
  }
  const statusRevision=clean(status?.gameSeed?.revision||status?.gameSeed?.ownerResetRevision);
  const revisedRevision=clean(revised?.gameSeedRevision||revised?.ownerResetRevision);
  if(expectedRevision&&(statusRevision!==expectedRevision||revisedRevision!==expectedRevision)){
    return {match:false,reason:'DESIGN_SEED_REVISION_MISMATCH',expectedSeedId,statusSeedId,revisedSeedId,expectedRevision,statusRevision,revisedRevision};
  }
  return {match:true,reason:'MATCH',expectedSeedId,statusSeedId,revisedSeedId,expectedRevision,statusRevision,revisedRevision,status,revised};
}

export function stampDesignSeedProvenance({root='.',gameId,date,seed}={}){
  const id=clean(gameId||seed?.gameId);
  const expectedSeedId=clean(seed?.seedId);
  const revision=seedRevisionOf(seed);
  if(!id||!date||!expectedSeedId)throw new Error('DESIGN_SEED_PROVENANCE_EXPECTED_SEED_REQUIRED');
  const base=path.join(root,'design',id,date);
  const statusPath=path.join(base,'cycle-status.json');
  const revisedPath=path.join(base,'design-revised.json');
  const draftPath=path.join(base,'design-draft.json');
  const status=readJson(statusPath,null);
  const revised=readJson(revisedPath,null);
  const draft=readJson(draftPath,null);
  if(!status||!revised)throw new Error(`DESIGN_SEED_PROVENANCE_FILES_MISSING ${id} ${date}`);
  if(clean(status?.gameSeed?.seedId)!==expectedSeedId||clean(revised?.gameSeedId)!==expectedSeedId){
    throw new Error(`DESIGN_SEED_PROVENANCE_GENERATION_MISMATCH ${id}`);
  }
  status.gameSeed={...(status.gameSeed||{}),seedId:expectedSeedId};
  revised.gameSeedId=expectedSeedId;
  if(draft)draft.gameSeedId=expectedSeedId;
  if(revision){
    status.gameSeed.revision=revision;
    status.gameSeed.ownerResetRevision=revision;
    revised.gameSeedRevision=revision;
    revised.ownerResetRevision=revision;
    if(draft){draft.gameSeedRevision=revision;draft.ownerResetRevision=revision;}
  }else{
    delete status.gameSeed.revision;
    delete status.gameSeed.ownerResetRevision;
    delete revised.gameSeedRevision;
    delete revised.ownerResetRevision;
    if(draft){delete draft.gameSeedRevision;delete draft.ownerResetRevision;}
  }
  status.gameSeed.provenanceBound=true;
  revised.gameSeedProvenanceBound=true;
  if(draft)draft.gameSeedProvenanceBound=true;
  writeJson(statusPath,status);
  writeJson(revisedPath,revised);
  if(draft)writeJson(draftPath,draft);
  return designArtifactsMatchSeed({root,gameId:id,date,seed});
}

function arg(name){const hit=process.argv.find(value=>value.startsWith(`--${name}=`));return hit?clean(hit.slice(name.length+3)):'';}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const gameId=arg('game-id')||clean(process.env.GAME_ID||process.env.ARTBOOK_GAME_ID);
  const date=arg('date')||clean(process.env.DESIGN_DATE||process.env.ARTBOOK_DATE);
  const stamp=process.argv.includes('--stamp');
  if(!gameId||!date)throw new Error('DESIGN_SEED_PROVENANCE_GAME_AND_DATE_REQUIRED');
  const state=loadSeedState();
  const seed=activeSeedForGame(state,gameId);
  if(!seed)throw new Error(`DESIGN_SEED_PROVENANCE_ACTIVE_SEED_REQUIRED ${gameId}`);
  const result=stamp?stampDesignSeedProvenance({gameId,date,seed}):designArtifactsMatchSeed({gameId,date,seed});
  console.log(`DESIGN_SEED_PROVENANCE=${result.match?'PASS':'FAIL'}`);
  console.log(`DESIGN_SEED_PROVENANCE_REASON=${result.reason}`);
  console.log(`DESIGN_SEED_ID=${clean(seed.seedId)}`);
  console.log(`DESIGN_SEED_REVISION=${seedRevisionOf(seed)||'NONE'}`);
  if(!result.match)process.exitCode=1;
}
