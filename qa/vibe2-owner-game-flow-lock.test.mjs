// Owner's existing designer -> game-development -> validated F0..F9 -> release route.
// Structure-only CI lock. Individual causal bug fixes and source repairs remain allowed.
// This does not grant design, deployment, branch administration, or QA-pass authority.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const policy=JSON.parse(read('company-learning/platform-release-roadmap.json'));
const workflow=path=>read('.github/workflows/'+path);
const contains=(source,fragments)=>fragments.forEach(fragment=>assert.ok(source.includes(fragment),'OWNER_FLOW_LOCK_MISSING:'+fragment));
const ordered=(source,parts)=>{
  let prior=-1;
  for(const part of parts){
    const index=source.indexOf(part);
    assert.ok(index>prior,'OWNER_FLOW_LOCK_MISSING_OR_REORDERED:'+part);
    prior=index;
  }
};

test('lock sole canonical design grammar, designer authority, and Roblox/Web owner scope',()=>{
  const method=policy.continuousGameplaySystemEvolutionContract.gameIdentityConceptContract.novelCausalGameGrammar.ownerBasicDesignMethod;
  assert.equal(policy.authority,'MACHINE_EXECUTION_CONTRACT');
  assert.equal(method.formula,'MAIN = A + B + C + D + @');
  assert.equal(policy.developmentAccess.ROBLOX,'ALWAYS_ALLOWED');
  assert.equal(policy.developmentAccess.WEB,'ALWAYS_ALLOWED');
  for(const platform of ['UNITY','UNITY_WEB','UNITY_ANDROID','FORTNITE_UEFN'])
    assert.equal(policy.developmentAccess[platform],'OWNER_HOLD',platform);
  const scope=policy.directNativeDualPlatformDevelopment.ownerActiveDevelopmentScope20261009;
  assert.deepEqual(scope.activeTargets,['ROBLOX','WEB']);
  assert.equal(scope.unityWebDevelopmentAllowed,false);
  assert.equal(scope.unityAndroidDevelopmentAllowed,false);
  const designer=workflow('company-seed-design-runtime.yml');
  contains(designer,[
    'DESIGN_AI_PROVIDER=VIBE_NATIVE_FUNCTION',
    'DESIGN_EXTERNAL_AI_ALLOWED=NO',
    'Run seed-backed DESIGN_ONLY pipeline without artbook'
  ]);
  ordered(designer,[
    'Prepare target routing input for designer self-seeding',
    'Run seed-backed DESIGN_ONLY pipeline without artbook',
    'Apply strict 30-minute design review',
    'Persist validated design evidence to company runtime branch'
  ]);
});

test('lock original seed -> verified design -> promotion -> exact Vibe2 handoff',()=>{
  const seed=workflow('company-game-seed-bootstrap.yml');
  contains(seed,['Compute GAME_SEED from canonical Vibe design grammar']);
  const promotion=workflow('company-design-promotion-sync.yml');
  ordered(promotion,[
    'Promote verified Roblox minimum design to native development',
    'Persist promoted state to company runtime branch',
    'Verify exact promoted runtime design handoff for Vibe',
    'Dispatch native development and immediate Vibe planner refill'
  ]);
  contains(promotion,[
    'node tools/vibe2-verified-design-handoff.mjs --runtime-sha="$runtime_sha"',
    'gh workflow run company-development-confirmed-runtime.yml',
    'gh workflow run vibe2-24h-runner.yml',
    'OWNER_HELD_UNITY_DISPATCH=NO'
  ]);
  const planner=workflow('vibe2-24h-runner.yml');
  contains(planner,[
    'runtime_design_sha=',
    'node tools/vibe2-verified-design-handoff.mjs --runtime-sha="$runtime_design_sha"',
    'VIBE2_VERIFIED_DESIGN_INTAKE=PASS'
  ]);
  const handoff=read('tools/vibe2-verified-design-handoff.mjs');
  contains(handoff,['evaluateMinimumDesignContract','strictQaPassClaimed:false,releasePassClaimed:false']);
});

test('lock external Gemini development as Vibe source worker, never as designer or local fallback',()=>{
  const core=workflow('vibe2-continuous-core.yml');
  const model=read('tools/vibe2-gemini-free-rotation.mjs');
  contains(core,[
    'VIBE2_GAME_SOURCE_PROVIDER: GEMINI_API',
    'VIBE2_GEMINI_MODEL: gemini-3.8-flash',
    'VIBE2_GEMINI_BACKUP_MODEL: gemini-3.5-flash-lite',
    'VIBE2_LOCAL_AI_ENABLED=NO',
    'VIBE2_WORKER_PROVIDER=GEMINI_API'
  ]);
  contains(model,[
    "gemini-3.8-flash",
    "gemini-3.5-flash-lite",
    'GEMINI_API_KEY_MISSING_NO_LOCAL_FALLBACK'
  ]);
  ordered(core,[
    'Synchronize worker with Vibe before work',
    'Enforce canonical constitution before source write',
    'Build reserved task work order',
    'Hand non-ABCD design request to canonical Game Designer',
    'Acquire shared Work Lock before source write'
  ]);
  contains(core,['tools/vibe2-fan-in-review.mjs']);
});

test('lock F0 to F9 real verification and pre-F9 publication restrictions',()=>{
  const f=policy.developmentLifecycleMachine.verifiedF0F9PublicationLoop;
  assert.equal(f.f9Terminal,false);
  assert.equal(f.f10Forbidden,true);
  assert.equal(f.publishBeforeF9Forbidden,true);
  assert.equal(f.developmentGamePublicationAllowed,false);
  assert.deepEqual(f.sequence,[
    'GAME_SOURCE_MUTATION','F0','F1','F2','F3','F4','F5','F6','F7','F8','F9',
    'RELEASE_CLASSIFICATION','PUBLISH_ONLY_IF_RELEASED','IMMEDIATE_NEXT_EVOLUTION_CYCLE'
  ]);
  assert.equal(f.platformBindings.ROBLOX.f9Authority,'.github/workflows/company-development-roblox-final-review-revalidation.yml');
  const roblox=workflow('company-development-roblox-runtime.yml');
  contains(roblox,['Run fused F0 from the same exact package','Route F0-passed artifacts to private runtime validation without Studio']);
  const f9=workflow('company-development-roblox-final-review-revalidation.yml');
  ordered(f9,[
    'Persist F9 internal release state',
    'Dispatch exact F9-verified artifact to canonical Roblox game target',
    'Immediately continue each successfully persisted Roblox F9 game'
  ]);
  contains(f9,[
    'row.finalReviewPassed!==true||row.f9ReleaseRegressionPassed!==true',
    'publish_stage=final'
  ]);
  const release=workflow('company-development-roblox-release-promotion.yml');
  contains(release,['Publish exact package to validation target or F9-verified canonical target','Ensure Roblox universe is private before runtime candidate publish']);
});
