import fs from 'node:fs';
import {validateGameSeed} from './company-game-seed-contract.mjs';
import {normalizeSeedState} from './game-seed-state.mjs';
const stateFile=process.env.GAME_SEED_STATE_FILE||'game-seed-state.json';
const clean=v=>String(v??'').trim();const readJson=(file,fallback={})=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
if(!fs.existsSync(stateFile))throw new Error('GAME_SEED_QUALITY_STATE_MISSING');
const state=normalizeSeedState(readJson(stateFile,{seeds:[]}));const active=(state.seeds||[]).filter(seed=>clean(seed.status).toUpperCase()==='ACTIVE');const failures=[],advisories=[];
for(const seed of active){const id=clean(seed.seedId||seed.gameId||'unknown'),result=validateGameSeed(seed);for(const error of result.errors)failures.push(`${id}:${error}`);for(const advisory of result.advisories)advisories.push(`${id}:${advisory}`);}
if(failures.length){console.error('GAME_SEED_INTEGRITY_GATE=FAIL');for(const failure of failures)console.error(`- ${failure}`);process.exit(1);}
console.log('GAME_SEED_INTEGRITY_GATE=PASS');console.log('GAME_SEED_GUIDANCE_ONLY=YES');console.log('GAME_SEED_CREATIVE_QUALITY_HARD_GATE=NO');console.log('GAME_SEED_MATERIAL_POOL_LIMIT=NONE');console.log('GAME_SEED_MATERIAL_COMBINE_LIMIT=NONE');console.log('GAME_SEED_SESSION_DURATION_LIMIT=NONE');console.log('GAME_SEED_MULTIPLAYER_FORM_LIMIT=NONE_AT_SEED_STAGE');console.log(`GAME_SEED_ACTIVE_SEED_COUNT=${active.length}`);console.log(`GAME_SEED_ADVISORY_COUNT=${advisories.length}`);console.log('GAME_SEED_HARD_GATE_SCOPE=SECURITY_LEGAL_COPY_PROTECTION_EVIDENCE_INTEGRITY');
