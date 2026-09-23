// 파일명: tools/company-system-ai-learning.mjs
// 역할: 검증·승인된 일반 System AI 및 마케팅 작업 결과만 Vibe verified experience/code-pattern으로 승격한다.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { applyVerifiedKnowledgeOutcomes } from './vibe2-learning-motor.mjs';

const clean=v=>String(v??'').trim();
const upper=v=>clean(v).toUpperCase();
const uniq=xs=>[...new Set((xs||[]).map(clean).filter(Boolean))];
const hash=s=>crypto.createHash('sha256').update(String(s)).digest('hex').slice(0,24);
function readJson(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}
function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)out[body]=true;else out[body.slice(0,at)]=body.slice(at+1);}return out;}
function changedFiles(task={}){return uniq((task.evidence||[]).filter(x=>clean(x).startsWith('changed-file:')).map(x=>clean(x).slice('changed-file:'.length)));}
function sourceRevision(task={}){
  const ev=uniq(task.evidence);
  const mutation=[...ev].reverse().find(x=>x.startsWith('source-mutation-sha:'));
  if(mutation)return clean(mutation.slice('source-mutation-sha:'.length));
  const pr=clean(task.pullRequestUrl);
  if(pr)return 'pr:'+pr;
  return null;
}
function verificationEvidence(task={}){
  return uniq(task.evidence).filter(x=>
    /^(actions-run:|verification:success|deterministic-current-main-satisfied|primary-ai-review:PASS|primary-ai-vibe-joint-accept:YES|source-mutation-sha:|changed-file:)/.test(x)
  );
}
function classification(task={}){
  const marketing=clean(task.department).toLowerCase()==='planning-growth-marketing'||clean(task.id).startsWith('marketing-');
  const outcome=upper(task.lastOutcome);
  if(clean(task.status).toLowerCase()!=='done')return{eligible:false,reason:'not-done',marketing};
  if(marketing){
    const accepted=outcome==='PRIMARY_AI_VIBE_JOINT_ACCEPTED'&&(task.evidence||[]).includes('primary-ai-vibe-joint-accept:YES');
    return{eligible:accepted,reason:accepted?'verified-marketing-joint-accept':'marketing-joint-accept-required',marketing:true};
  }
  const primaryAccepted=outcome==='PRIMARY_AI_ACCEPTED'&&(task.evidence||[]).includes('primary-ai-review:PASS');
  const deterministic=outcome==='DETERMINISTIC_CURRENT_MAIN_SATISFIED'&&(task.evidence||[]).includes('deterministic-current-main-satisfied');
  return{eligible:primaryAccepted||deterministic,reason:primaryAccepted?'primary-ai-accepted':deterministic?'deterministic-current-main-satisfied':'verified-acceptance-required',marketing:false};
}
function generalizedSystem(task={}){
  const text=[task.taskType,task.department,task.goal,...(task.responsibleFiles||[]),...(task.acceptanceCriteria||[])].join(' ');
  if(/workflow|github|actions|dispatch|queue|orchestrat|scheduler|fan.?in/i.test(text))return'ORCHESTRATION';
  if(/security|quarantine|credential|secret/i.test(text))return'SECURITY';
  if(/marketing|growth|store|creator|retention|acquisition/i.test(text))return'MARKETING';
  if(/test|qa|verify|regression|gate/i.test(text))return'QA_VERIFICATION';
  if(/web-games|roblox-games|unity-games|unreal-games|godot-games/i.test(text))return'GAME_IMPLEMENTATION';
  return'SYSTEM_ENGINEERING';
}

function knowledgeRefs(task={}){
  return uniq((task.evidence||[])
    .map(clean)
    .filter(x=>x.startsWith('learning-knowledge-id:'))
    .map(x=>clean(x.slice('learning-knowledge-id:'.length))));
}
function inferredTarget(task={}){
  const files=(task.responsibleFiles||[]).map(x=>clean(x).replaceAll('\\','/'));
  if(files.some(x=>x.startsWith('web-games/')))return'web';
  if(files.some(x=>x.startsWith('roblox-games/')))return'roblox';
  if(files.some(x=>x.startsWith('unity-games/')))return'unity';
  if(files.some(x=>x.startsWith('unreal-games/')))return'unreal';
  if(files.some(x=>x.startsWith('godot-games/')))return'godot';
  if(clean(task.department).toLowerCase()==='planning-growth-marketing'||clean(task.id).startsWith('marketing-'))return'marketing';
  return'system';
}
function verifiedKnowledgeOutcomeTasks(tasks=[]){
  return (tasks||[]).flatMap(task=>{
    const gate=classification(task);
    const refs=knowledgeRefs(task);
    if(!gate.eligible||!refs.length)return[];
    const evidence=uniq([
      ...(task.evidence||[]),
      'learning-knowledge-ids:'+encodeURIComponent(JSON.stringify(refs)),
      'role-result:regression:PASS',
      'role-result:review:PASS',
      'candidate-identity:PASS',
      ...(Number(task.retries||0)===0?['coding-candidate-first-attempt:YES']:[]),
      ...(clean(task.failureSignature)?['coding-failure-fingerprint:'+clean(task.failureSignature)]:[])
    ]);
    return[{...task,target:inferredTarget(task),evidence}];
  });
}
export function promoteVerifiedSystemAiLearning({systemAiInput={},experienceInput={},libraryInput={},masteryInput={}}={}){
  const queue={...systemAiInput,tasks:(systemAiInput.tasks||[]).map(x=>({...x}))};
  const experience={version:Number(experienceInput.version||3),policy:{...(experienceInput.policy||{}),verifiedEvidenceRequired:true,rawExternalModelOutputForbidden:true,systemAiSelfAcceptanceForbidden:true},records:[...(experienceInput.records||[])]};
  const library={version:Number(libraryInput.version||1),kind:'vibe2-verified-code-pattern-library',policy:{...(libraryInput.policy||{}),rawCodeStored:false,systemAiPatternRequiresVerifiedAcceptance:true},patterns:[...(libraryInput.patterns||[])]};
  const expIds=new Set(experience.records.map(x=>clean(x.id)));
  const patIds=new Set(library.patterns.map(x=>clean(x.id)));
  const stamp=new Date().toISOString();
  let experienceAdded=0,patternsAdded=0;
  queue.tasks=queue.tasks.map(task=>{
    if(upper(task.learningPromotion)==='PROMOTED')return task;
    const gate=classification(task);
    if(!gate.eligible)return task;
    const files=changedFiles(task),evidence=verificationEvidence(task),revision=sourceRevision(task);
    const mutationRequired=task.sourceMutationRequired===true;
    if(mutationRequired&&(!files.length||!revision))return task;
    if(!evidence.length)return task;
    const system=generalizedSystem(task);
    const fingerprint='system_ai_'+hash([task.id,task.lastOutcome,system,...evidence.sort()].join('|'));
    const expId='exp_'+fingerprint;
    if(!expIds.has(expId)){
      experience.records.push({
        version:3,id:expId,fingerprint,gameId:clean(task.gameId)||null,engine:'system-ai',
        departments:uniq([clean(task.department)||'system-ai','qa','learning']),
        taskType:gate.marketing?'verified-marketing-system-ai':'verified-system-ai',
        problem:clean(task.blocker||task.goal).slice(0,500),
        goal:clean(task.goal).slice(0,1200),
        change:files.length?'verified changes: '+files.join(', '):'deterministic current-main contract verified',
        outcome:'PASS',failureCause:null,qa:uniq(task.verificationCommands),
        build:null,evidence:uniq([...evidence,'system-ai-learning-gate:'+gate.reason]),
        reusablePatterns:[`VERIFIED_SYSTEM_AI_${system}_SCOPED_EXECUTION_WITH_DETERMINISTIC_VERIFICATION`],
        avoidPatterns:['SYSTEM_AI_SELF_ACCEPTANCE','RAW_MODEL_OUTPUT_REUSE_WITHOUT_VERIFICATION'],
        verified:true,reusable:true,independentlyVerified:true,
        authority:gate.marketing?'VERIFIED_SYSTEM_AI_MARKETING_LEARNING':'VERIFIED_SYSTEM_AI_LEARNING',
        sourceSystemAiTaskId:clean(task.id),sourceRevision:revision,
        rawModelOutputStored:false,createdAt:stamp,lastVerifiedAt:stamp
      });
      expIds.add(expId);experienceAdded++;
    }
    if(files.length){
      const patId='pat_system_ai_'+hash([task.id,system,revision||fingerprint].join('|'));
      if(!patIds.has(patId)){
        library.patterns.push({
          id:patId,gameId:clean(task.gameId)||null,engine:'system-ai',taskType:gate.marketing?'marketing':'system-ai',
          system,problem:clean(task.goal).slice(0,220),
          pattern:`VERIFIED_SYSTEM_AI_${system}_SCOPED_CHANGE_VERIFY_REVIEW_REUSE`,
          tags:uniq(['system-ai','verified','distilled',gate.marketing?'marketing':'engineering',system]),
          verified:true,sourceRevision:revision||('sha256:'+hash(evidence.join('|')).padEnd(64,'0').slice(0,64)),
          evidencePath:'vibe2-unreal-core:.vibe2/system-ai-queue.json',
          rawCodeStored:false,independentQa:'PASS',browserQa:'NOT_APPLICABLE',
          retrievalEligible:true,masteryEligible:true,
          authority:gate.marketing?'VERIFIED_SYSTEM_AI_MARKETING_PATTERN':'VERIFIED_SYSTEM_AI_CODE_PATTERN'
        });
        patIds.add(patId);patternsAdded++;
      }
    }
    return{...task,learningPromotion:'PROMOTED',learningFingerprint:fingerprint,learningPromotedAt:stamp};
  });
  library.patterns=library.patterns.slice(-2500);
  const knowledgeOutcomeTasks=verifiedKnowledgeOutcomeTasks(queue.tasks);
  const knowledgeOutcome=applyVerifiedKnowledgeOutcomes(masteryInput,{tasks:knowledgeOutcomeTasks});
  return{queue,experience,library,mastery:knowledgeOutcome.state,experienceAdded,patternsAdded,knowledgeOutcomesAdded:knowledgeOutcome.added||0,knowledgePositiveApplications:knowledgeOutcome.positive||0,knowledgeNegativeApplications:knowledgeOutcome.negative||0};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs();
  const queueFile=clean(args.queue)||'.vibe2/system-ai-queue.json';
  const experienceFile=clean(args.experience)||'.vibe2/experience.json';
  const patternsFile=clean(args.patterns)||'.vibe2/code-pattern-library.json';
  const stateFile=clean(args.state)||'.vibe2/learning-motor-state.json';
  const result=promoteVerifiedSystemAiLearning({
    systemAiInput:readJson(queueFile,{tasks:[]}),
    experienceInput:readJson(experienceFile,{version:3,records:[]}),
    libraryInput:readJson(patternsFile,{patterns:[]}),
    masteryInput:readJson(stateFile,{})
  });
  writeJson(queueFile,result.queue);
  writeJson(experienceFile,result.experience);
  writeJson(patternsFile,result.library);
  if(result.knowledgeOutcomesAdded>0)writeJson(stateFile,result.mastery);
  console.log('SYSTEM_AI_LEARNING_EXPERIENCE_ADDED='+result.experienceAdded);
  console.log('SYSTEM_AI_LEARNING_PATTERNS_ADDED='+result.patternsAdded);
  console.log('SYSTEM_AI_LEARNING_KNOWLEDGE_OUTCOMES_ADDED='+result.knowledgeOutcomesAdded);
  console.log('SYSTEM_AI_LEARNING_KNOWLEDGE_POSITIVE='+result.knowledgePositiveApplications);
}
