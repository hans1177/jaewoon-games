// 파일명: qa/company-policy-steward.test.mjs
// 중앙정책은 읽기 전용이며, 자동 복구는 하위 요약 메타데이터만 수정한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {reconcileFourPolicyDocuments} from '../tools/company-policy-steward.mjs';

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
test('latest owner directive is applied to all three non-authoritative mirror pointers',()=>fixture(tmp=>{
  const policyBefore=fs.readFileSync(path.join(tmp,paths[0]),'utf8');
  const file=path.join(tmp,paths[1]);
  const old=JSON.parse(fs.readFileSync(file,'utf8'));
  old.policySteward.latestOwnerDirective='OWNER_DIRECTIVE_2026-01-01';
  fs.writeFileSync(file,JSON.stringify(old));
  const before=reconcileFourPolicyDocuments({root:tmp});
  assert.deepEqual(before.drift,[paths[1]]);
  assert.deepEqual(before.corrected,[]);
  const fixed=reconcileFourPolicyDocuments({root:tmp,fixMirrors:true});
  assert.deepEqual(fixed.corrected,[paths[1]]);
  assert.equal(fs.readFileSync(path.join(tmp,paths[0]),'utf8'),policyBefore);
  assert.deepEqual(reconcileFourPolicyDocuments({root:tmp,fixMirrors:true}).corrected,[]);
}));
test('latest owner directive takes precedence when changed in canonical roadmap',()=>fixture(tmp=>{
  const file=path.join(tmp,paths[0]);
  const doc=JSON.parse(fs.readFileSync(file,'utf8'));
  doc.ownerActiveDevelopmentScope20261009.authority='OWNER_DIRECTIVE_2026-10-18_NEW_OWNER_SCOPE';
  fs.writeFileSync(file,JSON.stringify(doc));
  const result=reconcileFourPolicyDocuments({root:tmp,fixMirrors:true});
  assert.equal(result.corrected.length,3);
  for(const item of paths.slice(1))assert.equal(
    JSON.parse(fs.readFileSync(path.join(tmp,item),'utf8')).policySteward.latestOwnerDirective,
    'OWNER_DIRECTIVE_2026-10-18_NEW_OWNER_SCOPE'
  );
}));
test('invalid or missing canonical policy fails closed without modifying summaries',()=>fixture(tmp=>{
  fs.unlinkSync(path.join(tmp,paths[0]));
  assert.throws(()=>reconcileFourPolicyDocuments({root:tmp,fixMirrors:true}));
}));
test('contradictory development access is only reported; never silently changed',()=>fixture(tmp=>{
  const file=path.join(tmp,paths[0]);
  const doc=JSON.parse(fs.readFileSync(file,'utf8'));
  doc.developmentAccess.ROBLOX='OWNER_HOLD';
  fs.writeFileSync(file,JSON.stringify(doc));
  const before=fs.readFileSync(file,'utf8');
  const result=reconcileFourPolicyDocuments({root:tmp,fixMirrors:true});
  assert.ok(result.policyDiscrepancies.includes('ACTIVE:ROBLOX'));
  assert.equal(fs.readFileSync(file,'utf8'),before);
  assert.equal(result.policyModified,false);
}));
