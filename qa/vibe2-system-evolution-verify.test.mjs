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


test('neural expansion candidate requires verified readiness while keeping execution authority unchanged',()=>{
  const base={
    target:'system',sourceRoot:'.',directMainWrite:false,baseMainSha:'HEAD',
    changedFiles:['tools/vibe2-system-steward.mjs','qa/vibe2-system-steward.test.mjs'],
    developmentAuthority:{
      neuralExpansionAllowed:true,
      neuralExpansionMode:'EVIDENCE_GATED_SELF_EXPANSION',
      neuralExpansionReadiness:'PASS',
      neuralExecutionAuthorityExpansionAllowed:false,
      authorityExpanded:false,
      gateWeakening:false
    },
    compiledWorkContract:{
      writableScope:{exactResponsibleFiles:['tools/vibe2-system-steward.mjs','qa/vibe2-system-steward.test.mjs']},
      invariants:{authorityMustRemainUnchanged:true,qualityEvidenceAndSecurityGatesMustRemainUnchanged:true}
    }
  };
  const pass=verifySystemEvolutionCandidate({root:process.cwd(),manifest:base,baseSha:'HEAD'});
  assert.equal(pass.pass,true);
  assert.equal(pass.neuralExpansionAllowed,true);
  assert.equal(pass.neuralExpansionRequiresVerifiedReadiness,true);

  const noReadiness=verifySystemEvolutionCandidate({
    root:process.cwd(),
    manifest:{...base,developmentAuthority:{...base.developmentAuthority,neuralExpansionReadiness:'PENDING'}},
    baseSha:'HEAD'
  });
  assert.equal(noReadiness.pass,false);
  assert.ok(noReadiness.errors.includes('NEURAL_EXPANSION_READINESS_REQUIRED'));

  const authorityLeak=verifySystemEvolutionCandidate({
    root:process.cwd(),
    manifest:{...base,developmentAuthority:{...base.developmentAuthority,neuralExecutionAuthorityExpansionAllowed:true}},
    baseSha:'HEAD'
  });
  assert.equal(authorityLeak.pass,false);
  assert.ok(authorityLeak.errors.includes('NEURAL_EXECUTION_AUTHORITY_EXPANSION_FORBIDDEN'));
});
