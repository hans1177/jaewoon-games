import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validateSharedWorkerContext,RETAINED_DOCUMENTS} from '../tools/company-shared-context.mjs';
import {enforceConstitution} from '../tools/company-constitution-enforcer.mjs';

const repoRoot=path.resolve(import.meta.dirname,'..');
function temporary(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'retained-four-docs-'));
  for(const [,rel] of RETAINED_DOCUMENTS){
    const target=path.join(root,rel);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.copyFileSync(path.join(repoRoot,rel),target);
  }
  return root;
}
function check(root,fn){
  try {return fn();}finally{fs.rmSync(root,{recursive:true,force:true});}
}
test('the four shrunk documents are syntactically valid, under 1000 chars and integrity only',()=>{
  const r=validateSharedWorkerContext({root:repoRoot});
  assert.equal(r.pass,true);
  assert.equal(r.scope,'RETAINED_FOUR_DOCUMENT_INTEGRITY_ONLY');
  assert.equal(r.policyAuthorityVerified,false);
  assert.equal(r.sourceWriteAuthorized,false);
  assert.equal(r.releaseAuthorized,false);
  assert.equal(Object.keys(r.hashes).length,4);
});
test('missing or malformed retained document is rejected',()=>{
  check(temporary(),root=>{
    fs.rmSync(path.join(root,'company-learning/company-log-map.json'));
    assert.throws(()=>validateSharedWorkerContext({root}),/LOG_DOCUMENT_MISSING_OR_INVALID/);
  });
  check(temporary(),root=>{
    fs.writeFileSync(path.join(root,'company-directive.json'),'{broken');
    assert.throws(()=>validateSharedWorkerContext({root}),/DIRECTIVE_DOCUMENT_MISSING_OR_INVALID/);
  });
});
test('oversize and unexpected legacy schemas are rejected, never silently accepted',()=>{
  check(temporary(),root=>{
    const p=path.join(root,'company-learning/company-architecture-map.json');
    fs.appendFileSync(p,' '.repeat(1100));
    assert.throws(()=>validateSharedWorkerContext({root}),/ARCHITECTURE_DOCUMENT_TOO_LARGE/);
  });
  check(temporary(),root=>{
    const p=path.join(root,'company-learning/company-log-map.json');
    const doc=JSON.parse(fs.readFileSync(p,'utf8'));
    doc.status='LEGACY_EXECUTABLE_CONTRACT';
    fs.writeFileSync(p,JSON.stringify(doc));
    assert.throws(()=>validateSharedWorkerContext({root}),/LOG_DOCUMENT_CONTRACT_INVALID/);
  });
});
test('a hash mismatch and attempted restoration of deleted roadmap are blocked',()=>{
  check(temporary(),root=>{
    assert.throws(()=>validateSharedWorkerContext({root,expectedSecuritySha256:'0'.repeat(64)}),/SECURITY_SHA_MISMATCH/);
  });
  check(temporary(),root=>{
    const p=path.join(root,'company-learning/platform-release-roadmap.json');
    fs.writeFileSync(p,'{}');
    assert.throws(()=>validateSharedWorkerContext({root}),/DELETED_ROADMAP_REAPPEARED/);
  });
});
test('passing four-document integrity does not grant source write or deployment',()=>{
  const ctx=validateSharedWorkerContext({root:repoRoot});
  const gate=enforceConstitution({root:repoRoot,phase:'policy-qa'});
  assert.equal(ctx.pass,true);
  assert.equal(ctx.policyAuthorityVerified,false);
  assert.equal(gate.pass,false);
  assert.ok(gate.errors.includes('CONSTITUTION_AUTHORITY_UNAVAILABLE'));
});
