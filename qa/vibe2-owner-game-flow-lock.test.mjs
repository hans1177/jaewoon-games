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
    'OWNER_HELD_UNITY_DISPATCH=NO',
    'VIBE2_VERIFIED_DESIGN_INTAKE=PASS'
  ]);
  const planner=workflow('vibe2-24h-runner.yml');
  contains(planner,[
    'runtime_design_sha=',
    'git -C /tmp/vibe2-main show "$runtime_design_sha:development-queue.json"',
    'for runtime_design_path in design game-seed-state.json; do',
    'git -C /tmp/vibe2-main checkout "$runtime_design_sha" -- "$runtime_design_path"',
    'VIBE2_RUNTIME_DESIGN_OVERLAY=company-runtime:design,game-seed-state.json'
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

test('lock Roblox and general Web as concurrent Vibe source-development platforms in one canonical stage flow',()=>{
  const scope=policy.directNativeDualPlatformDevelopment.ownerActiveDevelopmentScope20261009;
  assert.deepEqual(scope.activeTargets,['ROBLOX','WEB']);
  assert.equal(policy.developmentAccess.ROBLOX,'ALWAYS_ALLOWED');
  assert.equal(policy.developmentAccess.WEB,'ALWAYS_ALLOWED');
  assert.equal(scope.independentGameExecution,true);
  assert.equal(scope.sameResponsibleFileWriteConflictSerializes,true);
  const planner=read('tools/vibe2-auto-planner.mjs');
  contains(planner,[
    "if(project.engine==='roblox')return",
    "access.ROBLOX!=='OWNER_HOLD'",
    "if(project.engine!=='web')return false;",
    "return access.WEB==='ALWAYS_ALLOWED'&&ownerScope.activeTargets.includes('WEB')",
    "engine:'web'",
    "engine:'roblox'"
  ]);
  const core=workflow('vibe2-continuous-core.yml');
  // Different platform work orders, one source worker and one guarded fan-in.
  contains(core,[
    'tools/vibe2-source-worker.mjs',
    'tools/vibe2-fan-in-review.mjs',
    'VIBE2_GAME_SOURCE_PROVIDER: GEMINI_API',
    'Acquire shared Work Lock before source write'
  ]);
  const fanIn=read('tools/vibe2-fan-in-review.mjs');
  contains(fanIn,[
    "if(platformTarget==='web')",
    "evidence.add('web-f0-f9-verified')",
    "evidence.add('web-f9-verified')",
    'releaseCandidates.push('
  ]);
  const release=workflow('vibe2-candidate-release.yml');
  ordered(release,[
    'web-release:',
    'Confirm Web F9 fan-in handoff before deployment',
    'Confirm playable Web deployment authority',
    'Promote approved web source root through reviewed PR',
    'Settle web result and continue correct source queue'
  ]);
  contains(release,[
    'WEB_F9_VERIFIED=YES',
    'VIBE2_WEB_CURRENT_DEPLOYMENT_CHECK=SUCCESS',
    'VIBE2_WEB_AUTO_DEPLOY=PASS',
    'AUTONOMOUS_NEXT_EVOLUTION_CYCLE=DISPATCHED_AFTER_WEB_DEPLOY',
    'ROBLOX_PRE_F9_CANONICAL_PUBLISH=FORBIDDEN',
    'ROBLOX_F0_F9_RUNTIME_HANDOFF=PASS'
  ]);
  const flow=policy.developmentLifecycleMachine.verifiedF0F9PublicationLoop;
  for(const platform of ['ROBLOX','WEB']){
    assert.ok(flow.appliesTo.includes(platform),platform+':F0_F9_POLICY_MISSING');
    assert.ok(flow.platformBindings[platform]?.f9Authority,platform+':F9_AUTHORITY_MISSING');
    assert.ok(flow.platformBindings[platform]?.deployRoute,platform+':RELEASE_ROUTE_MISSING');
    assert.equal(flow.platformBindings[platform].nextCycleRoute,'vibe2-fanin-refill',platform+':NEXT_CYCLE_ROUTE_MISMATCH');
  }
});

test('lock F0 to F9 real verification and pre-F9 publication restrictions',()=>{
  const f=policy.developmentLifecycleMachine.verifiedF0F9PublicationLoop;
  assert.equal(f.f9Terminal,false);
  assert.equal(f.f10Forbidden,true);
  assert.equal(f.publishBeforeF9Forbidden,true);
  assert.equal(f.developmentGamePublicationAllowed,true);
  assert.equal(f.canonicalServerPublicationEligibility,'EXACT_F9_AND_CURRENT_CANDIDATE_QA');
  assert.equal(policy.fixedAutonomousDevelopmentOperatingContract.serverDeployment.numericalScoreBlocksVerifiedDeployment,false);
  assert.equal(policy.roblox.deploymentControl.verifiedCyclePublication.publicationDispatchRequirementScope,'ALL_GAMES_AFTER_VERIFIED_F9');
  assert.equal(policy.changeRecord.ownerEveryGameF9Publish20261018.publicationClassificationGate,false);
  const exactPublication=policy.roblox.deploymentControl.verifiedCyclePublication;
  assert.deepEqual(exactPublication.sequence,[
    'EVOLUTION_SOURCE_MUTATION','F0_SOURCE_INTEGRITY','F1_TO_F8_CODE_AND_STATIC_QA',
    'F9_EXACT_FINAL_REVIEW','DISPATCH_EXACT_F9_ARTIFACT',
    'CONFIRM_CANONICAL_PLACE_VERSION_PUBLISHED',
    'POST_PUBLISH_EXACT_PLACE_VERSION_HEADLESS_QA',
    'PERSIST_SAME_CYCLE_POST_PUBLISH_QA',
    'DISPATCH_NEXT_GAME_F0_FROM_CURRENT_MAIN_AFTER_QA_PASS'
  ]);
  assert.equal(exactPublication.postPublishQaRequiredForNextF0,true);
  assert.equal(exactPublication.nextCycleMayStartOnlyAfterCanonicalPublishSuccess,true);
  assert.ok(!policy.roblox.deploymentControl.verifiedCyclePublication.sequence.includes('DISPATCH_EXACT_F9_ARTIFACT_ONLY_IF_RELEASED_ELSE_SKIP_CANONICAL_PUBLISH'));
  assert.equal(policy.developmentSpeedExecution.candidateReleasePromotionChecks.webRequiredDeploymentCheck,'GitHub Pages');
  assert.deepEqual(f.sequence,[
    'GAME_SOURCE_MUTATION','F0','F1','F2','F3','F4','F5','F6','F7','F8','F9',
    'PUBLISH_EVERY_F9_VERIFIED_GAME','IMMEDIATE_NEXT_EVOLUTION_CYCLE'
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
