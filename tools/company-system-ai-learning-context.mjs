// 파일명: tools/company-system-ai-learning-context.mjs
// 역할: System AI 작업 전에 Vibe의 검증된 experience/code-pattern에서 관련 지식만 retrieval한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { retrieveUnifiedLearning, learningGuidance } from './vibe2-learning-motor.mjs';

const clean=v=>String(v??'').trim();
function readJson(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}
function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const at=raw.indexOf('=');if(at<0)out[raw.slice(2)]=true;else out[raw.slice(2,at)]=raw.slice(at+1);}return out;}

export function buildSystemAiLearningContext({task={},experienceInput={},codePatternsInput={},masteryInput={}}={}){
  const retrieval=retrieveUnifiedLearning({
    task:{...task,target:clean(task.target)||'system',taskType:clean(task.taskType)||'system-ai'},
    experienceInput,codePatternsInput,masteryInput,
    playbooksInput:{},practiceDistilledInput:{entries:[]},externalAiDistilledInput:{entries:[]}
  });
  return {
    version:1,
    kind:'company-system-ai-verified-learning-context',
    taskId:clean(task.id),
    exactKnowledgeIds:(retrieval.exactKnowledgeIds||[]).slice(0,20),
    guidance:learningGuidance(retrieval),
    rawModelOutputIncluded:false,
    verifiedOnly:true,
    advisoryOnly:true,
    authorityExpanded:false
  };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const a=parseArgs();
  const result=buildSystemAiLearningContext({
    task:readJson(clean(a.task),{}),
    experienceInput:readJson(clean(a.experience),{records:[]}),
    codePatternsInput:readJson(clean(a.patterns),{patterns:[]}),
    masteryInput:readJson(clean(a.mastery),{})
  });
  writeJson(clean(a.output)||'/tmp/company-system-ai-learning-context.json',result);
  console.log('SYSTEM_AI_VERIFIED_LEARNING_CONTEXT=PASS');
  console.log('SYSTEM_AI_VERIFIED_LEARNING_IDS='+result.exactKnowledgeIds.join(','));
}
