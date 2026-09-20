// 파일명: tools/company-security-incident.mjs
// 역할: Security Steward 보고서를 비밀값/악성 원문 없이 보안사고 상태로 영속화하고 검증된 해결을 표시한다.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const clean=v=>String(v??'').trim();
const uniq=xs=>[...new Set((xs||[]).map(clean).filter(Boolean))];
const hash=s=>crypto.createHash('sha256').update(String(s)).digest('hex');
const now=()=>new Date().toISOString();
function readJson(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}
function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)out[body]=true;else out[body.slice(0,at)]=body.slice(at+1);}return out;}
function normalizeStore(input={}){
  return{version:1,kind:'company-security-incidents',policy:'QUARANTINE_PRESERVE_REDACTED_EVIDENCE_VERIFY_RECOVERY_THEN_DISTILL',incidents:Array.isArray(input.incidents)?input.incidents:[]};
}
function incidentId(finding={}){return 'sec_'+hash([finding.rule,finding.file,finding.evidenceSha256].map(clean).join('|')).slice(0,24);}
export function recordSecurityReport(storeInput={},report={}){
  const store=normalizeStore(storeInput),byId=new Map(store.incidents.map(x=>[clean(x.id),x]));let added=0;
  for(const finding of report.findings||[]){
    if(!['HIGH','CRITICAL'].includes(clean(finding.severity).toUpperCase()))continue;
    const id=incidentId(finding),existing=byId.get(id);
    const disposition=clean(finding.disposition).toUpperCase()==='REVIEW'?'REVIEW':'QUARANTINE';
    const row={
      id,status:disposition==='REVIEW'?'REVIEW_REQUIRED':'QUARANTINED',disposition,rule:clean(finding.rule),severity:clean(finding.severity).toUpperCase(),
      category:clean(finding.category)||'security',file:clean(finding.file)||null,line:Number(finding.line||0),
      evidenceSha256:clean(finding.evidenceSha256),snippet:clean(finding.snippet).slice(0,240),
      rawSecretStored:false,rawMalwareStored:false,
      detections:Math.max(1,Number(existing?.detections||0)+1),
      firstDetectedAt:clean(existing?.firstDetectedAt)||now(),lastDetectedAt:now(),
      containment:disposition==='REVIEW'?'AFFECTED_CHANGE_HELD_FOR_REVIEW':'AFFECTED_CHANGE_QUARANTINED',
      rootCause:clean(existing?.rootCause)||null,remediation:clean(existing?.remediation)||null,
      verificationEvidence:uniq(existing?.verificationEvidence),
      primaryAiReview:clean(existing?.primaryAiReview)||'PENDING',
      learningPromotion:clean(existing?.learningPromotion)||'PENDING'
    };
    if(!existing)added++;
    byId.set(id,{...existing,...row});
  }
  return{store:{...store,incidents:[...byId.values()].sort((a,b)=>String(b.lastDetectedAt).localeCompare(String(a.lastDetectedAt)))},added};
}
export function resolveSecurityIncident(storeInput={},{
  id,rootCause,remediation,evidence=[],securityCheckPass=false,regressionPass=false,primaryAiReview='',verificationMode='RESCAN_PASS'
}={}){
  const store=normalizeStore(storeInput),target=clean(id),mode=clean(verificationMode).toUpperCase()||'RESCAN_PASS';let found=false;
  const incidents=store.incidents.map(row=>{
    if(clean(row.id)!==target)return row;found=true;
    if(!clean(rootCause)||!clean(remediation))throw new Error('SECURITY_RESOLUTION_CAUSE_AND_REMEDIATION_REQUIRED');
    if(!regressionPass||clean(primaryAiReview).toUpperCase()!=='PASS')throw new Error('SECURITY_RESOLUTION_VERIFICATION_REQUIRED');
    const authorizedPolicyReview=mode==='AUTHORIZED_POLICY_REVIEW_PASS';
    const rescanPass=mode==='RESCAN_PASS';
    if(!authorizedPolicyReview&&!rescanPass)throw new Error('SECURITY_RESOLUTION_MODE_INVALID:'+mode);
    if(rescanPass&&!securityCheckPass)throw new Error('SECURITY_RESOLUTION_VERIFICATION_REQUIRED');
    if(authorizedPolicyReview&&clean(row.rule)!=='CENTRAL_AUTHORITY_MUTATION_REQUIRES_REVIEW')throw new Error('SECURITY_AUTHORIZED_POLICY_REVIEW_RULE_MISMATCH');
    const modeEvidence=authorizedPolicyReview?'authorized-policy-review:PASS':'security-rescan:PASS';
    return{...row,status:'RESOLVED_VERIFIED',rootCause:clean(rootCause),remediation:clean(remediation),
      verificationMode:mode,
      verificationEvidence:uniq([...(row.verificationEvidence||[]),...evidence,modeEvidence,'regression:PASS','primary-ai-security-review:PASS']),
      primaryAiReview:'PASS',resolvedAt:now(),learningPromotion:authorizedPolicyReview?'HOLD_POLICY_REVIEW_ONLY':'PENDING'};
  });
  if(!found)throw new Error('SECURITY_INCIDENT_NOT_FOUND:'+target);
  return{...store,incidents};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs(),file=clean(args.store)||'.vibe2/security-incidents.json',cmd=clean(args.command||'record').toLowerCase();
  let store=normalizeStore(readJson(file,{}));
  if(cmd==='record'){
    const report=readJson(clean(args.report),{});
    const result=recordSecurityReport(store,report);store=result.store;writeJson(file,store);
    console.log('SECURITY_INCIDENTS_ADDED='+result.added);
  }else if(cmd==='resolve'){
    store=resolveSecurityIncident(store,{
      id:args.id,rootCause:args['root-cause'],remediation:args.remediation,
      evidence:clean(args.evidence).split(','),securityCheckPass:clean(args['security-check-pass']).toUpperCase()==='YES',
      regressionPass:clean(args['regression-pass']).toUpperCase()==='YES',primaryAiReview:args['primary-ai-review'],verificationMode:args['verification-mode']
    });
    writeJson(file,store);console.log('SECURITY_INCIDENT_RESOLVED='+clean(args.id));
  }else throw new Error('SECURITY_INCIDENT_COMMAND_UNKNOWN:'+cmd);
}
