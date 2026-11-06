// 파일명: tools/company-security-learning.mjs
// 역할: 직접 검수까지 끝난 보안사고에서 공격 원문 없이 면역 서명·탐지·격리·복구 패턴만 기존 학습 구조로 증류한다.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const clean=v=>String(v??'').trim();
const uniq=xs=>[...new Set((xs||[]).map(clean).filter(Boolean))];
const hash=s=>crypto.createHash('sha256').update(String(s)).digest('hex').slice(0,24);
function readJson(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}
function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)out[body]=true;else out[body.slice(0,at)]=body.slice(at+1);}return out;}
function systemFor(rule=''){
  const r=clean(rule);
  if(/SECRET|TOKEN|CREDENTIAL/i.test(r))return'SECRET_PROTECTION';
  if(/PIPE|SUPPLY|INSTALL|BINARY/i.test(r))return'SUPPLY_CHAIN_SECURITY';
  if(/WORKFLOW|OIDC|MAIN_PUSH|AUTHORITY/i.test(r))return'WORKFLOW_INTEGRITY';
  if(/PROMPT/i.test(r))return'PROMPT_INJECTION_DEFENSE';
  if(/MALWARE|COMMAND|PERSISTENCE/i.test(r))return'MALWARE_DETECTION';
  if(/EXFILTRATION|NETWORK/i.test(r))return'EXFILTRATION_DEFENSE';
  return'SECURITY_PERIMETER';
}
export function distillSecurityLearning({incidentsInput={},experienceInput={},codePatternsInput={}}={}){
  const incidents={...incidentsInput,incidents:(incidentsInput.incidents||[]).map(x=>({...x}))};
  const experience={version:Number(experienceInput.version||3),policy:{...(experienceInput.policy||{})},records:[...(experienceInput.records||[])]};
  const library={version:1,kind:'vibe2-verified-code-pattern-library',patterns:[...(codePatternsInput.patterns||[])],policy:{...(codePatternsInput.policy||{})}};
  const expIds=new Set(experience.records.map(x=>clean(x.id))),patIds=new Set(library.patterns.map(x=>clean(x.id)));
  let experienceAdded=0,patternsAdded=0;const stamp=new Date().toISOString();
  incidents.incidents=incidents.incidents.map(incident=>{
    const eligible=clean(incident.status)==='RESOLVED_VERIFIED'&&clean(incident.primaryAiReview).toUpperCase()==='PASS'
      &&clean(incident.learningPromotion).toUpperCase()==='PENDING'&&(incident.verificationEvidence||[]).length>=3;
    if(!eligible)return incident;
    const reviewMode=clean(incident.verificationMode).toUpperCase()==='AUTHORIZED_POLICY_REVIEW_PASS';
    const sig='security_'+hash([incident.rule,incident.category,incident.rootCause,incident.remediation,incident.verificationMode].join('|'));
    const expId='exp_'+sig,patId='pat_'+sig;
    if(!expIds.has(expId)){
      experience.records.push({
        version:3,id:expId,fingerprint:sig,gameId:null,engine:'system',departments:['security','infrastructure','qa','learning'],
        taskType:'security-recovery',problem:clean(incident.rule),goal:'detect contain recover and prevent recurrence without storing attack payload',
        change:clean(incident.remediation),outcome:'PASS',failureCause:clean(incident.rootCause),
        qa:uniq(incident.verificationEvidence),build:null,
        evidence:uniq([...(incident.verificationEvidence||[]),'security-evidence-sha256:'+clean(incident.evidenceSha256)]),
        reusablePatterns:reviewMode?['SECURITY_REVIEW_REQUIRED:'+clean(incident.rule),'SECURITY_PRESERVE_GATE:NO_BYPASS','SECURITY_AUTHORIZED_REVIEW:'+clean(incident.remediation)]:['SECURITY_DETECT:'+clean(incident.rule),'SECURITY_CONTAIN:'+clean(incident.containment),'SECURITY_RECOVER:'+clean(incident.remediation)],
        avoidPatterns:reviewMode?['SECURITY_AVOID:POLICY_REVIEW_BYPASS']:['SECURITY_AVOID:'+clean(incident.rule)],
        verified:true,reusable:true,independentlyVerified:true,authority:'VERIFIED_SECURITY_IMMUNE_LEARNING',
        rawSecretStored:false,rawMalwareStored:false,sourceSecurityIncidentId:clean(incident.id),createdAt:stamp,lastVerifiedAt:stamp
      });expIds.add(expId);experienceAdded++;
    }
    if(!patIds.has(patId)){
      const system=systemFor(incident.rule);
      library.patterns.push({
        id:patId,gameId:null,engine:'system',taskType:'security',system,
        problem:clean(incident.rule),pattern:reviewMode?'VERIFIED_SECURITY_'+system+'_REVIEW_AUTHORIZATION_PRESERVE_GATE':'VERIFIED_SECURITY_'+system+'_DETECT_QUARANTINE_REMEDIATE_RESCAN',
        tags:['security','immune-system','verified',system],verified:true,
        sourceRevision:'sha256:'+clean(incident.evidenceSha256).padEnd(64,'0').slice(0,64),
        evidencePath:'vibe2-unreal-core:.vibe2/security-incidents.json',rawCodeStored:false,
        independentQa:'PASS',browserQa:'NOT_APPLICABLE',retrievalEligible:true,masteryEligible:true,
        authority:'VERIFIED_SECURITY_IMMUNE_PATTERN'
      });patIds.add(patId);patternsAdded++;
    }
    return{...incident,learningPromotion:'PROMOTED',learningPromotedAt:stamp,learningFingerprint:sig};
  });
  library.patterns=library.patterns.slice(-2500);
  library.policy={...library.policy,rawUnauthorizedExternalCodeForbidden:true,rawSecurityPayloadForbidden:true,verifiedSecurityPatternsAllowed:true};
  return{incidents,experience,library,experienceAdded,patternsAdded};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs(),incidentsFile=clean(args.incidents)||'.vibe2/security-incidents.json',
    experienceFile=clean(args.experience)||'.vibe2/experience.json',patternsFile=clean(args.patterns)||'.vibe2/code-pattern-library.json';
  const result=distillSecurityLearning({
    incidentsInput:readJson(incidentsFile,{}),experienceInput:readJson(experienceFile,{version:3,records:[]}),
    codePatternsInput:readJson(patternsFile,{patterns:[]})
  });
  writeJson(incidentsFile,result.incidents);writeJson(experienceFile,result.experience);writeJson(patternsFile,result.library);
  console.log('SECURITY_LEARNING_EXPERIENCE_ADDED='+result.experienceAdded);
  console.log('SECURITY_LEARNING_PATTERNS_ADDED='+result.patternsAdded);
}
