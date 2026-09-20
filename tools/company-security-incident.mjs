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
const POLICY_REVIEW_RULE='CENTRAL_AUTHORITY_MUTATION_REQUIRES_REVIEW';
const PRIMARY_AI_DIRECT_REVIEW_PASS='PRIMARY_AI_DIRECT_REVIEW=PASS';
const PRIMARY_AI_SECURITY_REVIEW_PASS='PRIMARY_AI_SECURITY_REVIEW: PASS';
const POLICY_REVIEW_PASS_MARKERS=new Set([PRIMARY_AI_DIRECT_REVIEW_PASS,PRIMARY_AI_SECURITY_REVIEW_PASS]);
const severityRank={HIGH:3,CRITICAL:4};
const boundedUniq=(xs,max=512)=>uniq(xs).slice(-Math.max(1,Number(max)||512));
function readJson(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}
function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)out[body]=true;else out[body.slice(0,at)]=body.slice(at+1);}return out;}
function normalizeStore(input={}){
  return{version:2,kind:'company-security-incidents',policy:'QUARANTINE_PRESERVE_REDACTED_EVIDENCE_VERIFY_RECOVERY_THEN_DISTILL',incidents:Array.isArray(input.incidents)?input.incidents:[]};
}
function findingDisposition(finding={}){return clean(finding.disposition).toUpperCase()==='REVIEW'?'REVIEW':'QUARANTINE';}
function isPolicyReviewFinding(finding={}){
  return findingDisposition(finding)==='REVIEW'
    &&clean(finding.rule)===POLICY_REVIEW_RULE
    &&clean(finding.file);
}
function reviewEvidence(finding={}){
  const hashes=Array.isArray(finding?.reviewEvidenceSha256)&&finding.reviewEvidenceSha256.length
    ?finding.reviewEvidenceSha256
    :[finding?.evidenceSha256];
  return boundedUniq(hashes).sort();
}
function policyReviewBatchId({file='',evidenceHashes=[]}={}){
  return 'sec_review_'+hash([POLICY_REVIEW_RULE,clean(file),...boundedUniq(evidenceHashes).sort()].join('|')).slice(0,20);
}
function incidentId(finding={}){
  return 'sec_'+hash([finding.rule,finding.file,finding.evidenceSha256].map(clean).join('|')).slice(0,24);
}
function earlierTimestamp(a,b){return [clean(a),clean(b)].filter(Boolean).sort()[0]||null;}
function laterTimestamp(a,b){return [clean(a),clean(b)].filter(Boolean).sort().at(-1)||null;}
function higherSeverity(values=[]){
  return values.map(v=>clean(v).toUpperCase()).filter(Boolean).sort((a,b)=>(severityRank[b]||0)-(severityRank[a]||0))[0]||'HIGH';
}
function aggregatePolicyReviewRows(rows=[],existing=null){
  const all=[...(existing?[existing]:[]),...rows].filter(Boolean);
  const file=clean(rows[0]?.file)||clean(existing?.file);
  const evidenceHashes=boundedUniq(all.flatMap(row=>reviewEvidence(row))).sort();
  const reviewLines=boundedUniq(all.flatMap(row=>[
    ...(row?.reviewLines||[]),
    Number(row?.line||0)>0?String(Number(row.line)):null
  ])).map(Number).sort((a,b)=>a-b);
  const legacyIncidentIds=boundedUniq(all.flatMap(row=>[
    ...(row?.legacyIncidentIds||[]),
    clean(row?.id)&&!clean(row.id).startsWith('sec_review_')?clean(row.id):null
  ]));
  const id=policyReviewBatchId({file,evidenceHashes});
  const resolvedSameBatch=existing&&clean(existing.id)===id&&clean(existing.status)==='RESOLVED_VERIFIED';
  const stamp=now();
  const firstDetectedAt=all.map(row=>clean(row?.firstDetectedAt)).filter(Boolean).sort()[0]||stamp;
  const lastDetectedAt=all.map(row=>clean(row?.lastDetectedAt)).filter(Boolean).sort().at(-1)||stamp;
  const priorDetections=Math.max(0,...all.map(row=>Number(row?.detections||0)));
  const base={
    ...(existing||{}),
    id,
    status:resolvedSameBatch?'RESOLVED_VERIFIED':'REVIEW_REQUIRED',
    disposition:'REVIEW',
    rule:POLICY_REVIEW_RULE,
    severity:higherSeverity(all.map(row=>row?.severity)),
    category:clean(rows[0]?.category)||clean(existing?.category)||'policy-integrity',
    file:file||null,
    line:0,
    evidenceSha256:hash(evidenceHashes.join('|')),
    snippet:'AGGREGATED_POLICY_REVIEW_FINDINGS',
    rawSecretStored:false,
    rawMalwareStored:false,
    detections:Math.max(1,priorDetections),
    reviewFindingCount:evidenceHashes.length,
    reviewEvidenceSha256:evidenceHashes,
    reviewLines,
    legacyIncidentIds,
    firstDetectedAt,
    lastDetectedAt,
    containment:'AFFECTED_CHANGE_HELD_FOR_REVIEW',
    reviewUnit:'SECURITY_SCAN_AND_FILE',
    compactedPolicyReview:true
  };
  if(resolvedSameBatch)return base;
  return{
    ...base,
    rootCause:null,
    remediation:null,
    verificationEvidence:[],
    primaryAiReview:'PENDING',
    learningPromotion:'PENDING',
    resolvedAt:null,
    verificationMode:null
  };
}
function legacyReviewGroupKey(row={}){
  if(clean(row.id).startsWith('sec_review_'))return clean(row.id);
  const second=(clean(row.firstDetectedAt)||clean(row.lastDetectedAt)).slice(0,19);
  return [POLICY_REVIEW_RULE,clean(row.file),second||clean(row.evidenceSha256)].join('|');
}
export function compactPolicyReviewIncidents(storeInput={}){
  const store=normalizeStore(storeInput),groups=new Map(),preserved=[];
  let reviewBefore=0;
  for(const row of store.incidents){
    const target=clean(row?.status)==='REVIEW_REQUIRED'
      &&clean(row?.disposition).toUpperCase()==='REVIEW'
      &&clean(row?.rule)===POLICY_REVIEW_RULE
      &&clean(row?.file);
    if(!target){preserved.push(row);continue;}
    reviewBefore++;
    const key=legacyReviewGroupKey(row);
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(row);
  }
  const compactedRows=[...groups.values()].map(rows=>aggregatePolicyReviewRows(rows));
  const incidents=[...preserved,...compactedRows].sort((a,b)=>String(b.lastDetectedAt||'').localeCompare(String(a.lastDetectedAt||'')));
  return{
    store:{...store,incidents},
    stats:{
      before:store.incidents.length,
      after:incidents.length,
      reviewBefore,
      reviewAfter:compactedRows.length,
      compacted:Math.max(0,reviewBefore-compactedRows.length)
    }
  };
}
export function recordSecurityReport(storeInput={},report={}){
  const compacted=compactPolicyReviewIncidents(storeInput),store=compacted.store;
  const byId=new Map(store.incidents.map(x=>[clean(x.id),x]));let added=0;
  const reviewGroups=new Map(),otherFindings=[];
  for(const finding of report.findings||[]){
    if(!['HIGH','CRITICAL'].includes(clean(finding.severity).toUpperCase()))continue;
    if(isPolicyReviewFinding(finding)){
      const key=[POLICY_REVIEW_RULE,clean(finding.file)].join('|');
      if(!reviewGroups.has(key))reviewGroups.set(key,[]);
      reviewGroups.get(key).push(finding);
    }else otherFindings.push(finding);
  }

  for(const findings of reviewGroups.values()){
    const file=clean(findings[0]?.file);
    const evidenceHashes=boundedUniq(findings.map(row=>row.evidenceSha256)).sort();
    const id=policyReviewBatchId({file,evidenceHashes}),existing=byId.get(id),stamp=now();
    const rows=findings.map(finding=>({
      id:null,status:'REVIEW_REQUIRED',disposition:'REVIEW',rule:POLICY_REVIEW_RULE,
      severity:clean(finding.severity).toUpperCase(),category:clean(finding.category)||'policy-integrity',
      file,line:Number(finding.line||0),evidenceSha256:clean(finding.evidenceSha256),
      snippet:clean(finding.snippet).slice(0,240),rawSecretStored:false,rawMalwareStored:false,
      detections:1,firstDetectedAt:stamp,lastDetectedAt:stamp,containment:'AFFECTED_CHANGE_HELD_FOR_REVIEW'
    }));
    const row=aggregatePolicyReviewRows(rows,existing);
    row.detections=Math.max(1,Number(existing?.detections||0)+(existing?1:0));
    row.lastDetectedAt=stamp;
    if(!existing)added++;
    byId.set(id,row);
  }

  for(const finding of otherFindings){
    const id=incidentId(finding),existing=byId.get(id),stamp=now();
    const disposition=findingDisposition(finding);
    const row={
      id,status:disposition==='REVIEW'?'REVIEW_REQUIRED':'QUARANTINED',disposition,rule:clean(finding.rule),severity:clean(finding.severity).toUpperCase(),
      category:clean(finding.category)||'security',file:clean(finding.file)||null,line:Number(finding.line||0),
      evidenceSha256:clean(finding.evidenceSha256),snippet:clean(finding.snippet).slice(0,240),
      rawSecretStored:false,rawMalwareStored:false,
      detections:Math.max(1,Number(existing?.detections||0)+1),
      firstDetectedAt:clean(existing?.firstDetectedAt)||stamp,lastDetectedAt:stamp,
      containment:disposition==='REVIEW'?'AFFECTED_CHANGE_HELD_FOR_REVIEW':'AFFECTED_CHANGE_QUARANTINED',
      rootCause:clean(existing?.rootCause)||null,remediation:clean(existing?.remediation)||null,
      verificationEvidence:uniq(existing?.verificationEvidence),
      primaryAiReview:clean(existing?.primaryAiReview)||'PENDING',
      learningPromotion:clean(existing?.learningPromotion)||'PENDING'
    };
    if(!existing)added++;
    byId.set(id,{...existing,...row});
  }
  return{
    store:{...store,incidents:[...byId.values()].sort((a,b)=>String(b.lastDetectedAt||'').localeCompare(String(a.lastDetectedAt||'')))},
    added,
    compacted:compacted.stats
  };
}
export function resolveSecurityIncident(storeInput={},{
  id,rootCause,remediation,evidence=[],securityCheckPass=false,regressionPass=false,primaryAiReview='',verificationMode='RESCAN_PASS',
  policyReviewApproval=null
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
    let approval=null;
    if(authorizedPolicyReview){
      if(clean(row.rule)!==POLICY_REVIEW_RULE)throw new Error('SECURITY_AUTHORIZED_POLICY_REVIEW_RULE_MISMATCH');
      if(clean(row.status)!=='REVIEW_REQUIRED')throw new Error('SECURITY_AUTHORIZED_POLICY_REVIEW_STATUS_INVALID');
      const input=policyReviewApproval&&typeof policyReviewApproval==='object'?policyReviewApproval:{};
      const decision=clean(input.decision).toUpperCase();
      const prNumber=Number(input.prNumber||0),securityRunId=Number(input.securityRunId||0),securityArtifactId=Number(input.securityArtifactId||0);
      const sourceUrl=clean(input.sourceUrl),scanDetectedAt=clean(input.scanDetectedAt),expectedFindingCount=Number(input.findingCount||0);
      if(!POLICY_REVIEW_PASS_MARKERS.has(decision))throw new Error('SECURITY_POLICY_REVIEW_EXPLICIT_PASS_REQUIRED');
      if(!Number.isInteger(prNumber)||prNumber<1||!Number.isInteger(securityRunId)||securityRunId<1||!Number.isInteger(securityArtifactId)||securityArtifactId<1){
        throw new Error('SECURITY_POLICY_REVIEW_IDENTITY_REQUIRED');
      }
      const sourceUrlPattern=new RegExp('^https://github\\.com/hans1177/jaewoon-games/pull/'+prNumber+'(?:#pullrequestreview-[0-9]+)?
      const scanKey=scanDetectedAt.slice(0,19),rowScanKey=(clean(row.firstDetectedAt)||clean(row.lastDetectedAt)).slice(0,19);
      if(scanKey.length!==19||rowScanKey!==scanKey)throw new Error('SECURITY_POLICY_REVIEW_SCAN_MISMATCH');
      const scanRows=store.incidents.filter(candidate=>clean(candidate.rule)===POLICY_REVIEW_RULE
        &&(clean(candidate.firstDetectedAt)||clean(candidate.lastDetectedAt)).slice(0,19)===scanKey);
      const actualFindingCount=scanRows.reduce((sum,candidate)=>sum+Math.max(1,Number(candidate.reviewFindingCount||reviewEvidence(candidate).length||1)),0);
      if(!Number.isInteger(expectedFindingCount)||expectedFindingCount<1||actualFindingCount!==expectedFindingCount){
        throw new Error('SECURITY_POLICY_REVIEW_FINDING_COUNT_MISMATCH:'+actualFindingCount+':'+expectedFindingCount);
      }
      approval={
        decision,canonicalDecision:PRIMARY_AI_DIRECT_REVIEW_PASS,source:'GITHUB_PR_REVIEW',prNumber,sourceUrl,
        securityRunId,securityArtifactId,scanDetectedAt,findingCount:actualFindingCount
      };
    }
    const modeEvidence=authorizedPolicyReview?'authorized-policy-review:PASS':'security-rescan:PASS';
    return{...row,status:'RESOLVED_VERIFIED',rootCause:clean(rootCause),remediation:clean(remediation),
      verificationMode:mode,
      verificationEvidence:uniq([...(row.verificationEvidence||[]),...evidence,modeEvidence,'regression:PASS','primary-ai-security-review:PASS']),
      policyReviewApproval:approval||row.policyReviewApproval||null,
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
    console.log('SECURITY_POLICY_REVIEWS_COMPACTED='+(result.compacted?.compacted||0));
  }else if(cmd==='compact-policy-review'){
    const result=compactPolicyReviewIncidents(store);store=result.store;writeJson(file,store);
    console.log('SECURITY_POLICY_REVIEW_BEFORE='+result.stats.reviewBefore);
    console.log('SECURITY_POLICY_REVIEW_AFTER='+result.stats.reviewAfter);
    console.log('SECURITY_POLICY_REVIEWS_COMPACTED='+result.stats.compacted);
  }else if(cmd==='resolve'){
    store=resolveSecurityIncident(store,{
      id:args.id,rootCause:args['root-cause'],remediation:args.remediation,
      evidence:clean(args.evidence).split(','),securityCheckPass:clean(args['security-check-pass']).toUpperCase()==='YES',
      regressionPass:clean(args['regression-pass']).toUpperCase()==='YES',primaryAiReview:args['primary-ai-review'],verificationMode:args['verification-mode'],
      policyReviewApproval:{
        decision:args['policy-review-decision'],prNumber:args['policy-review-pr'],sourceUrl:args['policy-review-url'],
        securityRunId:args['policy-review-security-run'],securityArtifactId:args['policy-review-security-artifact'],
        scanDetectedAt:args['policy-review-scan-at'],findingCount:args['policy-review-finding-count']
      }
    });
    writeJson(file,store);console.log('SECURITY_INCIDENT_RESOLVED='+clean(args.id));
  }else throw new Error('SECURITY_INCIDENT_COMMAND_UNKNOWN:'+cmd);
}
);
      if(!sourceUrlPattern.test(sourceUrl))throw new Error('SECURITY_POLICY_REVIEW_SOURCE_MISMATCH');
      const scanKey=scanDetectedAt.slice(0,19),rowScanKey=(clean(row.firstDetectedAt)||clean(row.lastDetectedAt)).slice(0,19);
      if(scanKey.length!==19||rowScanKey!==scanKey)throw new Error('SECURITY_POLICY_REVIEW_SCAN_MISMATCH');
      const scanRows=store.incidents.filter(candidate=>clean(candidate.rule)===POLICY_REVIEW_RULE
        &&(clean(candidate.firstDetectedAt)||clean(candidate.lastDetectedAt)).slice(0,19)===scanKey);
      const actualFindingCount=scanRows.reduce((sum,candidate)=>sum+Math.max(1,Number(candidate.reviewFindingCount||reviewEvidence(candidate).length||1)),0);
      if(!Number.isInteger(expectedFindingCount)||expectedFindingCount<1||actualFindingCount!==expectedFindingCount){
        throw new Error('SECURITY_POLICY_REVIEW_FINDING_COUNT_MISMATCH:'+actualFindingCount+':'+expectedFindingCount);
      }
      approval={
        decision,canonicalDecision:PRIMARY_AI_DIRECT_REVIEW_PASS,source:'GITHUB_PR_REVIEW',prNumber,sourceUrl,
        securityRunId,securityArtifactId,scanDetectedAt,findingCount:actualFindingCount
      };
    }
    const modeEvidence=authorizedPolicyReview?'authorized-policy-review:PASS':'security-rescan:PASS';
    return{...row,status:'RESOLVED_VERIFIED',rootCause:clean(rootCause),remediation:clean(remediation),
      verificationMode:mode,
      verificationEvidence:uniq([...(row.verificationEvidence||[]),...evidence,modeEvidence,'regression:PASS','primary-ai-security-review:PASS']),
      policyReviewApproval:approval||row.policyReviewApproval||null,
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
    console.log('SECURITY_POLICY_REVIEWS_COMPACTED='+(result.compacted?.compacted||0));
  }else if(cmd==='compact-policy-review'){
    const result=compactPolicyReviewIncidents(store);store=result.store;writeJson(file,store);
    console.log('SECURITY_POLICY_REVIEW_BEFORE='+result.stats.reviewBefore);
    console.log('SECURITY_POLICY_REVIEW_AFTER='+result.stats.reviewAfter);
    console.log('SECURITY_POLICY_REVIEWS_COMPACTED='+result.stats.compacted);
  }else if(cmd==='resolve'){
    store=resolveSecurityIncident(store,{
      id:args.id,rootCause:args['root-cause'],remediation:args.remediation,
      evidence:clean(args.evidence).split(','),securityCheckPass:clean(args['security-check-pass']).toUpperCase()==='YES',
      regressionPass:clean(args['regression-pass']).toUpperCase()==='YES',primaryAiReview:args['primary-ai-review'],verificationMode:args['verification-mode'],
      policyReviewApproval:{
        decision:args['policy-review-decision'],prNumber:args['policy-review-pr'],sourceUrl:args['policy-review-url'],
        securityRunId:args['policy-review-security-run'],securityArtifactId:args['policy-review-security-artifact'],
        scanDetectedAt:args['policy-review-scan-at'],findingCount:args['policy-review-finding-count']
      }
    });
    writeJson(file,store);console.log('SECURITY_INCIDENT_RESOLVED='+clean(args.id));
  }else throw new Error('SECURITY_INCIDENT_COMMAND_UNKNOWN:'+cmd);
}
