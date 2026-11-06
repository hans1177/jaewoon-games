// 파일명: tools/company-recovery-learning.mjs
// 역할: 직접 검수까지 끝난 복구/병목 해결만 canonical experience에 승격한다.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const clean=v=>String(v??'').trim();
const uniq=xs=>[...new Set((xs||[]).map(clean).filter(Boolean))];
function readJson(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}
function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)out[body]=true;else out[body.slice(0,at)]=body.slice(at+1);}return out;}
function hash(text){return crypto.createHash('sha256').update(String(text)).digest('hex');}

export function promoteVerifiedRecoveryLearning({recoveryInput={},experienceInput={}}={}){
  const queue={...recoveryInput,tasks:Array.isArray(recoveryInput.tasks)?recoveryInput.tasks.map(x=>({...x})):[]};
  const experience={
    version:Number(experienceInput.version||3),
    policy:{
      verifiedEvidenceRequired:true,verifiedFailureMayTeach:true,unverifiedAttemptReusable:false,
      exactDuplicateSuppressed:true,duplicateVerificationReinforces:true,repeatedVerificationRaisesConfidence:true,
      mayExpandAuthority:false,mayAutoCopyGameplayValues:false,...(experienceInput.policy||{})
    },
    records:Array.isArray(experienceInput.records)?[...experienceInput.records]:[]
  };
  const fingerprints=new Set(experience.records.map(x=>clean(x.fingerprint)).filter(Boolean));
  let added=0;
  const stamp=new Date().toISOString();
  queue.tasks=queue.tasks.map(task=>{
    const eligible=clean(task.status)==='verified'
      &&clean(task.primaryAiReview).toUpperCase()==='PASS'
      &&clean(task.learningPromotion).toUpperCase()!=='PROMOTED'
      &&Array.isArray(task.deterministicEvidence)&&task.deterministicEvidence.length>0
      &&clean(task.failureSignature)&&clean(task.recoveryStrategy);
    if(!eligible)return task;
    const fingerprint='recovery_'+hash([
      clean(task.failureStage),clean(task.failureSignature),clean(task.recoveryStrategy),
      ...uniq(task.deterministicEvidence).sort()
    ].join('|')).slice(0,24);
    if(!fingerprints.has(fingerprint)){
      const id='exp_'+fingerprint;
      experience.records.push({
        version:3,id,fingerprint,gameId:null,engine:'system',
        departments:['infrastructure','qa','learning'],taskType:'recovery-bottleneck',
        problem:clean(task.failureSignature),
        goal:'recover exact failed stage without bypassing canonical gates',
        change:clean(task.recoveryStrategy),
        outcome:'PASS',
        failureCause:clean(task.failureSignature),
        qa:uniq(task.verificationPlan),
        build:null,
        evidence:uniq([...(task.evidence||[]),...(task.deterministicEvidence||[]),'primary-ai-recovery-review:PASS']),
        reusablePatterns:[clean(task.recoveryStrategy)],
        avoidPatterns:['avoid-repeat:'+clean(task.failureSignature)],
        verified:true,reusable:true,independentlyVerified:true,
        authority:'VERIFIED_RECOVERY_LEARNING',
        sourceRecoveryId:clean(task.id),
        createdAt:stamp,lastVerifiedAt:stamp
      });
      fingerprints.add(fingerprint);added+=1;
    }
    return{...task,learningPromotion:'PROMOTED',learningExperienceFingerprint:fingerprint,learningPromotedAt:stamp};
  });
  return{queue,experience,added};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs();
  const recoveryFile=clean(args.recovery)||'.vibe2/recovery-queue.json';
  const experienceFile=clean(args.experience)||'.vibe2/experience.json';
  const result=promoteVerifiedRecoveryLearning({
    recoveryInput:readJson(recoveryFile,{tasks:[]}),
    experienceInput:readJson(experienceFile,{version:3,records:[]})
  });
  writeJson(recoveryFile,result.queue);
  writeJson(experienceFile,result.experience);
  console.log('RECOVERY_LEARNING_ADDED='+result.added);
}
