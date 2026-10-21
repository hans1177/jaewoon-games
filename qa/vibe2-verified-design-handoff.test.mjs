import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyVibeDesignHandoff,classifyVerifiedDesignPlannerAdmission} from '../tools/vibe2-verified-design-handoff.mjs';

const SHA='a'.repeat(40);
const SOURCE='design/accepted-game/2026-10-17/design-revised.json';
const ROADMAP={authority:'MACHINE_EXECUTION_CONTRACT',developmentAccess:{ROBLOX:'ALWAYS_ALLOWED',UNITY:'OWNER_HOLD'},
  continuousGameplaySystemEvolutionContract:{gameIdentityConceptContract:{novelCausalGameGrammar:{ownerBasicDesignMethod:{formula:'MAIN = A + B + C + D + @'}}}}};
const seed={gameId:'accepted-game',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',GAMEPLAY_SKETCH:{version:5}};
const item={gameId:'accepted-game',productionClass:'DEVELOPMENT_CONFIRMED',
  selectedPlatform:'ROBLOX',concurrentTargetPlatforms:['ROBLOX'],
  designBaselineSource:SOURCE,minimumDesignContract:{pass:true,source:SOURCE},
  platformDesignProfiles:{ROBLOX:{source:SOURCE,jsonPointer:'/content/platformProfiles/ROBLOX'}}};
const design={gameId:'accepted-game',content:{identity:'Preserved original game design'}};
const verify=({seedState={seeds:[seed]},queue={items:[item]},record=design,policy=ROADMAP,gate={pass:true},runtimeSha=SHA}={})=>{
  const files={'game-seed-state.json':seedState,'development-queue.json':queue,[SOURCE]:record};
  return verifyVibeDesignHandoff({runtimeSha,roadmap:policy,readJsonAt:path=>{
    if(!(path in files))throw new Error('missing');
    return files[path];
  },verifyDesign:()=>gate});
};
test('exact runtime and matching Roblox ABCD+@ design bind to Vibe without inventing QA or F9',()=>{
  const value=verify();
  assert.equal(value.pass,true);
  assert.equal(value.verified.length,1);
  assert.equal(value.verified[0].contractPass,true);
  assert.equal(value.verified[0].strictQaPassClaimed,false);
  assert.equal(value.verified[0].releasePassClaimed,false);
  assert.match(value.verified[0].designSha256,/^[a-f0-9]{64}$/);
});
test('missing, stale and duplicated runtime design evidence blocks Vibe intake',()=>{
  assert.equal(verify({queue:{items:[{...item,minimumDesignContract:{pass:false,source:SOURCE}}]}}).pass,false);
  assert.equal(verify({queue:{items:[{...item,designBaselineSource:'design/older/design-revised.json'}]}}).pass,false);
  assert.equal(verify({queue:{items:[item,item]}}).pass,false);
  assert.equal(verify({record:{gameId:'wrong-game'}}).pass,false);
  assert.equal(verify({gate:{pass:false}}).pass,false);
  assert.equal(verify({runtimeSha:'not-a-commit'}).pass,false);
});
test('owner-held Unity and noncanonical grammar cannot be silently admitted',()=>{
  assert.equal(verify({queue:{items:[{...item,concurrentTargetPlatforms:['ROBLOX','UNITY']}]}}).pass,false);
  assert.equal(verify({queue:{items:[{...item,selectedPlatform:'UNITY'}]}}).pass,false);
  assert.equal(verify({policy:{...ROADMAP,developmentAccess:{ROBLOX:'ALWAYS_ALLOWED',UNITY:'ALWAYS_ALLOWED'}}}).pass,false);
  assert.equal(verify({policy:{...ROADMAP,continuousGameplaySystemEvolutionContract:{gameIdentityConceptContract:{novelCausalGameGrammar:{ownerBasicDesignMethod:{formula:'MAIN × A × B × C + @'}}}}}}).pass,false);
});
test('no active development-confirmed seed creates no fabricated promotion or release proof',()=>{
  const result=verify({seedState:{seeds:[{...seed,productionClass:'DESIGN_ONLY'}]},queue:{items:[]}});
  assert.equal(result.pass,true);
  assert.deepEqual(result.verified,[]);
});


test('approved game design stays usable for planning when a separate game design is pending',()=>{
  const pendingId='pending-game',pendingSource='design/pending-game/2026-10-21/design-revised.json';
  const pendingSeed={...seed,gameId:pendingId};
  const pendingItem={...item,gameId:pendingId,designBaselineSource:pendingSource,
    minimumDesignContract:{pass:true,source:pendingSource},
    platformDesignProfiles:{ROBLOX:{source:pendingSource,jsonPointer:'/content/platformProfiles/ROBLOX'}}};
  const docs={'game-seed-state.json':{seeds:[seed,pendingSeed]},
    'development-queue.json':{items:[item,pendingItem]},
    [SOURCE]:design,[pendingSource]:{gameId:pendingId,content:{identity:'Pending original gameplay'}}};
  const result=verifyVibeDesignHandoff({runtimeSha:SHA,roadmap:ROADMAP,
    readJsonAt:source=>docs[source],verifyDesign:record=>({pass:record.gameId==='accepted-game'})});
  assert.equal(result.pass,false,'strict design promotion must not pass with pending game');
  assert.deepEqual(result.verified.map(x=>x.gameId),['accepted-game']);
  assert.deepEqual(result.failures,['pending-game:DESIGN_CONTRACT_NOT_PASSED']);
  assert.equal(classifyVerifiedDesignPlannerAdmission(result),'BLOCKED');
  assert.equal(classifyVerifiedDesignPlannerAdmission(result,{allowPendingDesigns:true}),'PARTIAL');
  assert.equal(classifyVerifiedDesignPlannerAdmission({pass:false,verified:[],failures:result.failures},
    {allowPendingDesigns:true}),'BLOCKED','empty verified subset cannot start development');
  assert.equal(classifyVerifiedDesignPlannerAdmission({pass:false,verified:result.verified,
    failures:['pending-game:AUTHORED_DESIGN_MISSING_AT_RUNTIME_SHA']},{allowPendingDesigns:true}),'BLOCKED',
    'missing design file is not a safe pending design status');
  assert.equal(classifyVerifiedDesignPlannerAdmission({pass:false,verified:result.verified,
    failures:['pending-game:RUNTIME_PROMOTION_QUEUE_BINDING_MISSING_OR_DUPLICATED']},
    {allowPendingDesigns:true}),'BLOCKED');
  assert.equal(classifyVerifiedDesignPlannerAdmission({pass:false,verified:result.verified,
    failures:['CANONICAL_ABCD_PLUS_AT_DESIGN_POLICY_REQUIRED']},{allowPendingDesigns:true}),'BLOCKED');
});
