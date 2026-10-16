// 파일명: qa/company-shared-context-retained.test.mjs
// 임포트
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validateSharedWorkerContext} from '../tools/company-shared-context.mjs';

// 메인
const documents=[
  ['log','company-learning/company-log-map.json','MACHINE_EXECUTION_LOG_MAP'],
  ['architecture','company-learning/company-architecture-map.json','MACHINE_EXECUTION_ARCHITECTURE_MAP'],
  ['security','company-learning/security-immune-system.json','OWNER_DIRECTIVE_2026-09-19']
];
function fixture() {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'retained-context-'));
  const write=(name,content)=>{
    const p=path.join(root,name);
    fs.mkdirSync(path.dirname(p),{recursive:true});
    fs.writeFileSync(p,JSON.stringify(content));
  };
  write('company-directive.json',{
    policyDocument:null,
    documentationSynchronization:{centralPolicyPath:null},
    legacyCentralPolicyReferenceCleanup:{
      removedPolicyPath:'company-learning/platform-release-roadmap.json',
      replacementPolicyNotAsserted:true,
      executionContractChangeNotAuthorized:true
    }
  });
  for(const [,file,authority] of documents) write(file,{version:1,authority,sourceOfTruth:file,
    ...(file.endsWith('company-log-map.json')?{architectureMap:'company-learning/company-architecture-map.json'}:{}),
    ...(file.endsWith('company-architecture-map.json')?{logMap:'company-learning/company-log-map.json'}:{}),
    ...(file.endsWith('security-immune-system.json')?{policyFile:file}:{})
  });
  return {root,write};
}
test('retained documents validate without restoring or promoting deleted policy',()=>{
  const f=fixture();
  try {
    const result=validateSharedWorkerContext({root:f.root});
    assert.equal(result.pass,true);
    assert.equal(result.scope,'RETAINED_THREE_DOCUMENT_INTEGRITY_ONLY');
    assert.equal(result.policyAuthorityVerified,false);
  } finally {fs.rmSync(f.root,{force:true,recursive:true});}
});
test('missing retained document blocks validation',()=>{
  const f=fixture();
  try {
    fs.unlinkSync(path.join(f.root,'company-learning/company-log-map.json'));
    assert.throws(()=>validateSharedWorkerContext({root:f.root}),/LOG_DOCUMENT_MISSING_OR_INVALID/);
  } finally {fs.rmSync(f.root,{force:true,recursive:true});}
});
test('changed document hash blocks pinned validation',()=>{
  const f=fixture();
  try {
    assert.throws(()=>validateSharedWorkerContext({root:f.root,expectedSecuritySha256:'0'.repeat(64)}),/SECURITY_SHA_MISMATCH/);
  } finally {fs.rmSync(f.root,{force:true,recursive:true});}
});
test('restored deleted roadmap is blocked',()=>{
  const f=fixture();
  try {
    f.write('company-learning/platform-release-roadmap.json',{version:1});
    assert.throws(()=>validateSharedWorkerContext({root:f.root}),/DELETED_ROADMAP_REAPPEARED/);
  } finally {fs.rmSync(f.root,{force:true,recursive:true});}
});
