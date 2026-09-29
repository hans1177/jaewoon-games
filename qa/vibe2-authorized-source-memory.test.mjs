import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeAuthorizedSummary, validateAuthorizedSummary } from '../tools/vibe2-authorized-source-memory.mjs';

const summary=()=>({
  version:1,
  gameId:'block-blast',
  packageId:'com.block.juggle',
  authority:'OWNER_ASSERTED_REUSE_REINTERPRETATION',
  packageFingerprint:'a'.repeat(64),
  generatedAt:'2026-09-18T00:00:00.000Z',
  learningDomains:['board-grid-placement','input-drag-touch'],
  reusablePatterns:['AUTHORIZED_SOURCE:board-grid-placement','AUTHORIZED_SOURCE:input-drag-touch'],
  sourceCorpus:{documents:42,totalChars:12345},
  runtimeEvidenceRequiredForPositiveRuntimeClaims:true
});

test('authorized Block Blast summary becomes one reusable Vibe2 experience',()=>{
  const first=mergeAuthorizedSummary({version:3,records:[]},summary());
  assert.equal(first.added,true);
  assert.equal(first.memory.version,3);
  assert.equal(first.memory.records.length,1);
  const row=first.memory.records[0];
  assert.equal(row.gameId,'block-blast');
  assert.equal(row.verified,true);
  assert.equal(row.reusable,true);
  assert.equal(row.authority,'retrieval-context-only-no-automatic-gameplay-mutation');
  assert.ok(row.evidence.some(x=>x.startsWith('PACKAGE_FINGERPRINT:')));
  assert.ok(row.avoidPatterns.includes('do-not-treat-static-analysis-as-runtime-pass'));

  const second=mergeAuthorizedSummary(first.memory,summary());
  assert.equal(second.added,false);
  assert.equal(second.reason,'authorized-source-snapshot-current');
  assert.equal(second.memory.records.length,1);
});

test('authorized source memory rejects missing owner authority and invalid fingerprints',()=>{
  assert.throws(()=>validateAuthorizedSummary({...summary(),authority:'PRACTICE_ONLY_MIXED_EVIDENCE'}),/AUTHORITY_MISSING/);
  assert.throws(()=>validateAuthorizedSummary({...summary(),packageFingerprint:'bad'}),/FINGERPRINT_INVALID/);
  assert.throws(()=>validateAuthorizedSummary({...summary(),runtimeEvidenceRequiredForPositiveRuntimeClaims:false}),/RUNTIME_BOUNDARY_MISSING/);
});
