// 파일명: qa/company-policy-steward.test.mjs
// 임포트
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditFourPolicyDocuments} from '../tools/company-policy-steward.mjs';

// 메인
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const paths=[
  'company-learning/platform-release-roadmap.json',
  'company-learning/company-log-map.json',
  'company-learning/company-architecture-map.json',
  'company-learning/security-immune-system.json'
];
function fixture(fn){
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'four-policy-steward-'));
  try{
    for(const file of paths){
      fs.mkdirSync(path.dirname(path.join(tmp,file)),{recursive:true});
      fs.copyFileSync(path.join(root,file),path.join(tmp,file));
    }
    return fn(tmp);
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
test('four canonical files stay immutable during steward audit',()=>fixture(tmp=>{
  const original=paths.map(p=>fs.readFileSync(path.join(tmp,p),'utf8'));
  const result=auditFourPolicyDocuments({root:tmp});
  assert.equal(result.managedDocuments.length,4);
  assert.equal(result.writesAllowed,false);
  assert.equal(result.nonBlockingAudit,true);
  assert.equal(result.securityAndReleaseChecksUnchanged,true);
  assert.deepEqual(paths.map(p=>fs.readFileSync(path.join(tmp,p),'utf8')),original);
}));
test('latest approved owner scope resolves conflicting old development access in memory only',()=>fixture(tmp=>{
  const file=path.join(tmp,paths[0]);
  const doc=JSON.parse(fs.readFileSync(file,'utf8'));
  doc.developmentAccess.ROBLOX='OWNER_HOLD';
  fs.writeFileSync(file,JSON.stringify(doc));
  const before=fs.readFileSync(file,'utf8');
  const result=auditFourPolicyDocuments({root:tmp});
  assert.equal(result.effectiveDevelopmentAccess.ROBLOX,'ALWAYS_ALLOWED');
  assert.ok(result.staleLegacyPolicyFields.includes('ROBLOX'));
  assert.equal(fs.readFileSync(file,'utf8'),before);
}));
test('newer approved owner directive wins when changed in canonical roadmap',()=>fixture(tmp=>{
  const file=path.join(tmp,paths[0]);
  const doc=JSON.parse(fs.readFileSync(file,'utf8'));
  doc.ownerActiveDevelopmentScope20261009.authority='OWNER_DIRECTIVE_2026-10-18_NEW_SCOPE';
  doc.ownerActiveDevelopmentScope20261009.activeTargets=['WEB'];
  doc.ownerActiveDevelopmentScope20261009.ownerHeldTargets=['ROBLOX','UNITY_WEB'];
  fs.writeFileSync(file,JSON.stringify(doc));
  const result=auditFourPolicyDocuments({root:tmp});
  assert.equal(result.ownerDirective,'OWNER_DIRECTIVE_2026-10-18_NEW_SCOPE');
  assert.equal(result.effectiveDevelopmentAccess.ROBLOX,'OWNER_HOLD');
  assert.equal(result.effectiveDevelopmentAccess.WEB,'ALWAYS_ALLOWED');
}));
test('invalid policy, missing source, conflicting owner scope fail closed',()=>fixture(tmp=>{
  const file=path.join(tmp,paths[0]);
  const doc=JSON.parse(fs.readFileSync(file,'utf8'));
  doc.ownerActiveDevelopmentScope20261009.activeTargets=['WEB'];
  doc.ownerActiveDevelopmentScope20261009.ownerHeldTargets=['WEB'];
  fs.writeFileSync(file,JSON.stringify(doc));
  assert.throws(()=>auditFourPolicyDocuments({root:tmp}),/OWNER_SCOPE_INVALID/);
  fs.unlinkSync(file);
  assert.throws(()=>auditFourPolicyDocuments({root:tmp}));
}));
