// Removed roadmap is no longer an executable policy contract.
// Keep explicit owner-deletion and retained security-document integrity checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateSharedWorkerContext} from '../tools/company-shared-context.mjs';
import {enforceConstitution} from '../tools/company-constitution-enforcer.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const obsolete='company-learning/platform-release-roadmap.json';
const directive=JSON.parse(fs.readFileSync(path.join(root,'company-directive.json'),'utf8'));

test('owner-deleted central roadmap stays removed',()=>{
  assert.equal(fs.existsSync(path.join(root,obsolete)),false);
  assert.equal(directive.policyDocument,null);
  assert.equal(directive.documentationSynchronization?.centralPolicyPath,null);
  assert.equal(directive.legacyCentralPolicyReferenceCleanup?.removedPolicyPath,obsolete);
  assert.equal(directive.legacyCentralPolicyReferenceCleanup?.replacementPolicyNotAsserted,true);
  assert.equal(directive.legacyCentralPolicyReferenceCleanup?.executionContractChangeNotAuthorized,true);
});

test('existing architecture, log and security documents remain validated',()=>{
  const result=validateSharedWorkerContext({root});
  assert.equal(result.pass,true);
  assert.equal(result.policyAuthorityVerified,false);
});

test('removed policy must never imply constitutional PASS',()=>{
  const result=enforceConstitution({root,phase:'test'});
  assert.equal(result.pass,false);
  assert.ok(result.errors.includes('CONSTITUTION_AUTHORITY_UNAVAILABLE'));
});
