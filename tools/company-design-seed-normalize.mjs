import {loadSeedState,activeSeedForGame} from './game-seed-state.mjs';
import {assertGameSeed} from './company-game-seed-contract.mjs';
const clean=v=>String(v??'').trim();const gameId=clean(process.env.GAME_ID||process.env.ARTBOOK_GAME_ID||process.argv.find(arg=>arg.startsWith('--game-id='))?.split('=')[1]);
if(!gameId)throw new Error('DESIGN_SEED_NORMALIZE_GAME_ID_REQUIRED');
const seed=activeSeedForGame(loadSeedState(),gameId);
if(!seed){console.log('DESIGN_SEED_NORMALIZE=PASS');console.log('DESIGN_SEED_PRESENT=NO');console.log('DESIGN_SEED_REQUIRED=NO');console.log('DESIGN_CREATIVE_AUTHORITY=VIBE_SELF_COMPOSITION');process.exit(0);}
assertGameSeed(seed);console.log('DESIGN_SEED_NORMALIZE=PASS');console.log('DESIGN_SEED_PRESENT=YES');console.log('DESIGN_SEED_ROLE=OPTIONAL_GUIDANCE_ONLY');console.log('DESIGN_SEED_CREATIVE_REWRITE=NO');console.log('DESIGN_CREATIVE_AUTHORITY=VIBE_SELF_COMPOSITION');console.log(`DESIGN_SEED_REFERENCE_GAMES=${Array.isArray(seed.REFERENCE_GAMES)?seed.REFERENCE_GAMES.length:0}`);
