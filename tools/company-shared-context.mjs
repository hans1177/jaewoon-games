// 파일명: tools/company-shared-context.mjs
// 임포트
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

// 메인: 삭제된 로드맵 대신 정책 권한을 만들지 않고 유지된 세 문서의 무결성만 검사한다.
const DOCUMENTS = Object.freeze([
  ['log','company-learning/company-log-map.json','MACHINE_EXECUTION_LOG_MAP'],
  ['architecture','company-learning/company-architecture-map.json','MACHINE_EXECUTION_ARCHITECTURE_MAP'],
  ['security','company-learning/security-immune-system.json','OWNER_DIRECTIVE_2026-09-19']
]);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function readJson(root, rel) {
  const data = fs.readFileSync(path.join(root,rel),'utf8');
  return {document:JSON.parse(data),sha256:hash(data)};
}
export function validateSharedWorkerContext({root=process.cwd(),expectedLogSha256,expectedArchitectureSha256,expectedSecuritySha256}={}) {
  const errors=[];
  let directive=null;
  try {
    directive=readJson(root,'company-directive.json').document;
    const removal=directive.legacyCentralPolicyReferenceCleanup;
    if(directive.policyDocument!==null || directive.documentationSynchronization?.centralPolicyPath!==null ||
      removal?.removedPolicyPath!=='company-learning/platform-release-roadmap.json' ||
      removal?.replacementPolicyNotAsserted!==true || removal?.executionContractChangeNotAuthorized!==true) {
      errors.push('OWNER_POLICY_REMOVAL_CONTRACT_INVALID');
    }
  } catch { errors.push('OWNER_DIRECTIVE_MISSING_OR_INVALID'); }
  if(fs.existsSync(path.join(root,'company-learning/platform-release-roadmap.json'))) {
    errors.push('DELETED_ROADMAP_REAPPEARED');
  }
  const docs={};
  const hashes={};
  for(const [key,rel,authority] of DOCUMENTS) {
    try {
      const {document,sha256}=readJson(root,rel);
      docs[key]=document;
      hashes[key+'Sha256']=sha256;
      if(!Number.isInteger(document.version) || document.version<=0 || document.authority!==authority ||
         (document.sourceOfTruth!==undefined && document.sourceOfTruth!==null && document.sourceOfTruth!==rel)) {
        errors.push(key.toUpperCase()+'_DOCUMENT_CONTRACT_INVALID');
      }
    } catch { errors.push(key.toUpperCase()+'_DOCUMENT_MISSING_OR_INVALID'); }
  }
  if(docs.log && docs.architecture && docs.log.architectureMap!=='company-learning/company-architecture-map.json') {
    errors.push('LOG_ARCHITECTURE_REFERENCE_INVALID');
  }
  if(docs.architecture && docs.architecture.logMap!=='company-learning/company-log-map.json') {
    errors.push('ARCHITECTURE_LOG_REFERENCE_INVALID');
  }
  if(docs.security && docs.security.policyFile!=='company-learning/security-immune-system.json') {
    errors.push('SECURITY_DOCUMENT_REFERENCE_INVALID');
  }
  const expected={log:expectedLogSha256,architecture:expectedArchitectureSha256,security:expectedSecuritySha256};
  for(const [key,value] of Object.entries(expected)) {
    if(value!==undefined && value!==hashes[key+'Sha256']) errors.push(key.toUpperCase()+'_SHA_MISMATCH');
  }
  if(errors.length) throw new Error('WORKER_CONTEXT_SYNC_FAILED:'+errors.join(','));
  return {
    pass:true,
    scope:'RETAINED_THREE_DOCUMENT_INTEGRITY_ONLY',
    policyAuthorityVerified:false,
    deletedRoadmapRestored:false,
    hashes,
    documentVersions:Object.fromEntries(DOCUMENTS.map(([key])=>[key,docs[key].version]))
  };
}
export function verifyPinnedSharedWorkerContext(options={}) {
  return validateSharedWorkerContext(options);
}

// 로그
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  try {
    const result=validateSharedWorkerContext();
    const output=process.argv.slice(2).find(v=>v.startsWith('--output='));
    if(output) fs.writeFileSync(output.slice('--output='.length),JSON.stringify(result,null,2)+'\n');
    console.log('WORKER_CONTEXT_SCOPE='+result.scope);
    console.log('WORKER_CONTEXT_POLICY_AUTHORITY=UNVERIFIED');
    console.log('WORKER_CONTEXT_LOG_MAP_SHA256='+result.hashes.logSha256);
    console.log('WORKER_CONTEXT_ARCHITECTURE_SHA256='+result.hashes.architectureSha256);
    console.log('WORKER_CONTEXT_SECURITY_POLICY_SHA256='+result.hashes.securitySha256);
    console.log('WORKER_CONTEXT_SYNC=PASS');
  } catch(error) {
    console.error('WORKER_CONTEXT_SYNC=FAIL');
    console.error(String(error.message));
    process.exitCode=1;
  }
}
