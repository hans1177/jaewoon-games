import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileOwnerCanonicalConstitution,compileCentralArchitectureProjection,validateSharedWorkerContext}
  from '../tools/company-shared-context.mjs';
import {loadCentralPolicySnapshot,compileVibeCentralWorkContract}
  from '../tools/vibe2-central-work-contract.mjs';
import {enforceConstitution} from '../tools/company-constitution-enforcer.mjs';
import {isTrustedDistilledExternalAiEntry} from '../tools/vibe2-external-ai-distillation.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const policyPath=path.join(ROOT,'company-learning/platform-release-roadmap.json');
test('real Vibe policy compiles owner rules and worker topology, not an always-fail stub',()=>{
  const policy=JSON.parse(fs.readFileSync(policyPath,'utf8'));
  const canonical=compileOwnerCanonicalConstitution(policy);
  const topology=compileCentralArchitectureProjection(policy);
  assert.equal(canonical.valid,true,canonical.errors.join(','));
  assert.equal(topology.valid,true,topology.errors.join(','));
  assert.ok(canonical.rules.length>=4);
  assert.match(canonical.fingerprint,/^[a-f0-9]{64}$/);
  assert.match(topology.fingerprint,/^[a-f0-9]{64}$/);
  const snap=loadCentralPolicySnapshot({repoRoot:ROOT,required:true});
  assert.equal(snap.valid,true,(snap.errors||[]).join(','));
  const request=compileVibeCentralWorkContract({
    snapshot:snap,
    task:{id:'vibe-restoration-smoke',gameId:'simple-rpg',target:'roblox'},
    plan:{target:'roblox'},
    route:{route:'text-source-worker'},
    responsibleFiles:['roblox-games/simple-rpg/server/Game.server.luau']
  });
  assert.equal(request.validAtCompile,true);
  assert.equal(request.constitution.rules.length,canonical.rules.length);
  assert.equal(request.architectureProjection.fingerprint,topology.fingerprint);
});
test('current directive, compact companions, and policy QA can be read together',()=>{
  const ctx=validateSharedWorkerContext({root:ROOT});
  assert.equal(ctx.pass,true);
  assert.equal(ctx.canonicalRoadmapPresent,true);
  assert.equal(ctx.documentFormats.directive,'FULL_MACHINE_DIRECTIVE');
  const result=enforceConstitution({root:ROOT,phase:'vibe-restoration-smoke'});
  assert.equal(result.pass,true,result.errors.join(','));
});
test('external AI distilled knowledge is available to Vibe as advisory, not fake model execution',()=>{
  const knowledge=JSON.parse(fs.readFileSync(path.join(ROOT,'.vibe2/external-ai-distilled-knowledge.json'),'utf8'));
  const trusted=(knowledge.entries||[]).filter(isTrustedDistilledExternalAiEntry);
  assert.ok(trusted.length>0,'no independently verified external AI knowledge available');
  assert.ok(trusted.every(x=>x.advisoryOnly===true&&x.directSourceWrite===false));
  const worker=fs.readFileSync(path.join(ROOT,'tools/vibe2-continuous-runner.mjs'),'utf8');
  assert.match(worker,/externalAiDistilledInput:externalAiDistilled/);
  assert.match(worker,/external-ai-distilled-knowledge\.json/);
});
test('missing policy compilers cannot grant work permission',()=>{
  assert.equal(compileOwnerCanonicalConstitution({}).valid,false);
  assert.equal(compileCentralArchitectureProjection({}).valid,false);
  const result=enforceConstitution({policy:{},root:ROOT,phase:'vibe-restoration-smoke'});
  assert.equal(result.pass,false);
});
