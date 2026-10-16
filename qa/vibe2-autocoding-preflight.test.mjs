// The canonical reserve and 24H scheduler validate the real owner-bound source contract here.
// Full historical/model-transport fixtures stay in Vibe2 Core QA; they are not a queue admission gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  loadCentralPolicySnapshot,
  compileVibeCentralWorkContract,
  assertCompiledWorkContractFresh
} from '../tools/vibe2-central-work-contract.mjs';
import {assertOwnerDevelopmentAvailable} from '../tools/vibe2-source-worker.mjs';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file='roblox-games/simple-rpg/server/Game.server.luau';

function compiledRobloxWork(){
  const snapshot=loadCentralPolicySnapshot({repoRoot,required:true});
  assert.equal(snapshot.valid,true,snapshot.errors.join('|'));
  const task={id:'autocoding-admission-smoke',gameId:'simple-rpg',target:'ROBLOX',department:'development'};
  const contract=compileVibeCentralWorkContract({
    snapshot,task,plan:{target:'ROBLOX',qa:['CODE_QA','STATIC_QA']},
    route:{route:'text-source-worker'},responsibleFiles:[file]
  });
  return {snapshot,contract,task};
}

test('source worker admission compiles the current owner policy and verifies exact writable scope',()=>{
  const {snapshot,contract,task}=compiledRobloxWork();
  assert.equal(contract.required,true);
  assert.equal(contract.validAtCompile,true);
  assert.equal(contract.policy.executionFingerprint,snapshot.executionFingerprint);
  assert.equal(contract.policy.fingerprint,snapshot.fingerprint);
  assert.equal(contract.workLock.requiredBeforeSourceWrite,true);
  assert.deepEqual(contract.workLock.files,[file]);
  assert.equal(contract.workLock.authority,'EDIT_EXCLUSIVITY_ONLY_NO_OWNER_GATE_EXPANSION');
  assert.doesNotThrow(()=>assertOwnerDevelopmentAvailable({
    cwd:repoRoot,order:{...task,source:{root:'roblox-games/simple-rpg'}}
  }));
  const result=assertCompiledWorkContractFresh({cwd:repoRoot,contract,phase:'PRE_SOURCE_GENERATION'});
  assert.equal(result.fresh,true);
});

test('uncompiled source worker orders cannot bypass central policy validation',()=>{
  assert.throws(
    ()=>assertCompiledWorkContractFresh({cwd:repoRoot,contract:{},phase:'PRE_SOURCE_GENERATION'}),
    /CENTRAL_POLICY_INVALID_AT_COMPILE:PRE_SOURCE_GENERATION/
  );
});

test('stale execution policy fingerprint rejects source generation',()=>{
  const {contract}=compiledRobloxWork();
  const stale={...contract,policy:{...contract.policy,executionFingerprint:'0'.repeat(64)}};
  assert.throws(
    ()=>assertCompiledWorkContractFresh({cwd:repoRoot,contract:stale,phase:'PRE_SOURCE_GENERATION'}),
    /CENTRAL_POLICY_STALE:PRE_SOURCE_GENERATION/
  );
});
