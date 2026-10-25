import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyVibeDesignHandoff} from '../tools/vibe2-verified-design-handoff.mjs';

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
test('verified general WEB design uses the same exact handoff without Unity',()=>{
  const webItem={...item,selectedPlatform:'WEB',concurrentTargetPlatforms:['WEB'],
    ownerWebIntakeEngine:'HTML_CSS_JAVASCRIPT',web3dRedevelopmentRequired:true,
    platformDesignProfiles:{WEB:{source:SOURCE,jsonPointer:'/content/webCanonicalDesign'}}};
  const result=verify({queue:{items:[webItem]}});
  assert.equal(result.pass,true,result.failures.join(','));
  assert.equal(result.verified[0].releasePassClaimed,false);
  assert.equal(verify({queue:{items:[{...webItem,concurrentTargetPlatforms:['WEB','UNITY']}]}}).pass,false);
});
test('no active development-confirmed seed creates no fabricated promotion or release proof',()=>{
  const result=verify({seedState:{seeds:[{...seed,productionClass:'DESIGN_ONLY'}]},queue:{items:[]}});
  assert.equal(result.pass,true);
  assert.deepEqual(result.verified,[]);
});

test('Vibe2 planner detects stale Cozy native design and dispatches only the existing designer without bypassing verification',async()=>{
  const wf=(await import('node:fs')).readFileSync('.github/workflows/vibe2-24h-runner.yml','utf8');
  const start=wf.indexOf('            # Preserve the exact failed design gate, then send one idempotent');
  const end=wf.indexOf('            for runtime_design_path in design game-seed-state.json;',start);
  assert.ok(start>=0&&end>start);
  const section=wf.slice(start,end);
  assert.match(section,/vibe2-verified-design-handoff\.mjs --runtime-sha/);
  assert.match(section,/VIBE2_VERIFIED_DESIGN_BLOCKER=cozy-island:DESIGN_CONTRACT_NOT_PASSED/);
  assert.match(section,/seed\.ownerRequestInstanceId==='VIBE2:'/);
  assert.match(section,/gh workflow run company-seed-design-runtime\.yml --repo/);
  assert.match(section,/-f game_id=cozy-island -f request_id=/);
  assert.match(section,/VIBE2_VERIFIED_DESIGN_GATE=BLOCKED_UNTIL_AUTHORED_REVALIDATION/);
  assert.match(section,/exit 1/);
  assert.doesNotMatch(section,/VIBE2_VERIFIED_DESIGN_INTAKE=PASS.*echo|gh workflow run vibe2-continuous-core\.yml/);
});
