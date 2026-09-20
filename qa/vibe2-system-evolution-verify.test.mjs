import test from 'node:test';
import assert from 'node:assert/strict';
import { verifySystemEvolutionCandidate } from '../tools/vibe2-system-evolution-verify.mjs';

test('system evolution verifier requires exact safe files and changed regression test',()=>{
  const manifest={
    target:'system',sourceRoot:'.',directMainWrite:false,baseMainSha:'HEAD',
    changedFiles:['tools/vibe2-system-steward.mjs','qa/vibe2-system-steward.test.mjs'],
    compiledWorkContract:{writableScope:{exactResponsibleFiles:['tools/vibe2-system-steward.mjs','qa/vibe2-system-steward.test.mjs']},invariants:{authorityMustRemainUnchanged:true,qualityEvidenceAndSecurityGatesMustRemainUnchanged:true}}
  };
  const result=verifySystemEvolutionCandidate({root:process.cwd(),manifest,baseSha:'HEAD'});
  assert.equal(result.pass,true);
  assert.deepEqual(result.changedTests,['qa/vibe2-system-steward.test.mjs']);
  const escaped=verifySystemEvolutionCandidate({root:process.cwd(),manifest:{...manifest,changedFiles:['web-games/demo/index.html']},baseSha:'HEAD'});
  assert.equal(escaped.pass,false);
  assert(escaped.errors.some(e=>e.startsWith('FORBIDDEN_PATH:')));
});
