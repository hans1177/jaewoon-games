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

test('basic grammar admission stays in the designer promotion flow without globally blocking repeat planning',async()=>{
  const fs=await import('node:fs');
  const scheduler=fs.readFileSync('.github/workflows/vibe2-24h-runner.yml','utf8');
  const promotion=fs.readFileSync('.github/workflows/company-design-promotion-sync.yml','utf8');
  const start=scheduler.indexOf('            git -C /tmp/vibe2-main fetch origin \'+refs/heads/company-runtime:refs/remotes/origin/company-runtime\' --depth=2 --no-tags --quiet',scheduler.indexOf('vibe3-roblox-distillation.mjs \\'));
  const snapshot=scheduler.indexOf('            runtime_design_sha=',start);
  const end=scheduler.indexOf("            echo 'VIBE2_RUNTIME_DESIGN_OVERLAY=",start);
  const overlay=scheduler.slice(snapshot,end);
  assert.ok(start>=0&&snapshot>start&&end>snapshot);
  assert.match(overlay,/show "\$runtime_design_sha:development-queue\.json"/);
  assert.match(overlay,/cat-file -e "\$runtime_design_sha:\$runtime_design_path"/);
  assert.match(overlay,/checkout "\$runtime_design_sha" -- "\$runtime_design_path"/);
  assert.doesNotMatch(overlay,/COZY_DESIGN_REVALIDATION|cozy-island-v5|vibe2-verified-design-handoff\.mjs|exit 1/);
  const verify=promotion.indexOf('node tools/vibe2-verified-design-handoff.mjs --runtime-sha=');
  const dispatch=promotion.indexOf('gh workflow run company-development-confirmed-runtime.yml',verify);
  assert.ok(verify>=0&&dispatch>verify,'exact design handoff still gates canonical promotion');
  assert.match(promotion,/VIBE2_VERIFIED_DESIGN_INTAKE=PASS/);
});
