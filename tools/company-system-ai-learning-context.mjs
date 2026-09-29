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
function failureSignature(task={}){
  if(clean(task.failureSignature))return clean(task.failureSignature);
  const evidence=(task.evidence||[]).map(clean);
  for(const prefix of ['system-ai-failure-signature:','shared-signature:','system-steward:failure-signature:','failure-cause:']){
    const row=[...evidence].reverse().find(x=>x.startsWith(prefix));
    if(row)return clean(row.slice(prefix.length));
  }
  return clean(task.blocker||task.lastOutcome)||null;
}
function failedStrategyFingerprints(task={}){
  return [...new Set([
    ...(task.failedStrategyFingerprints||[]).map(clean),
    ...(task.evidence||[]).map(clean).filter(x=>x.startsWith('failed-strategy-fingerprint:')).map(x=>clean(x.slice('failed-strategy-fingerprint:'.length)))
  ].filter(Boolean))];
}
function inferLearningTarget(task={}){
  const explicit=clean(task.target).toLowerCase();
  if(explicit&&explicit!=='system')return explicit;
  const files=(task.responsibleFiles||[]).map(x=>clean(x).replaceAll('\\','/'));
  if(files.some(x=>x.startsWith('web-games/')))return'web';
  if(files.some(x=>x.startsWith('roblox-games/')))return'roblox';
  if(files.some(x=>x.startsWith('unity-games/')))return'unity';
  if(files.some(x=>x.startsWith('unreal-games/')))return'unreal';
  if(files.some(x=>x.startsWith('godot-games/')))return'godot';
  const department=clean(task.department).toLowerCase();
  if(department==='planning-growth-marketing'||clean(task.id).startsWith('marketing-'))return'marketing';
  return explicit||'system';
}

export function buildSystemAiLearningContext({task={},experienceInput={},codePatternsInput={},masteryInput={}}={}){
  const retrieval=retrieveUnifiedLearning({
    task:{...task,target:inferLearningTarget(task),taskType:clean(task.taskType)||'system-ai'},
    experienceInput,codePatternsInput,masteryInput,
    playbooksInput:{},practiceDistilledInput:{entries:[]},externalAiDistilledInput:{entries:[]}
  });
  const exactKnowledgeIds=(retrieval.exactKnowledgeIds||[]).slice(0,20);
  const signature=failureSignature(task);
  const failedStrategies=failedStrategyFingerprints(task);
  const gameId=clean(task.gameId)||null;
  return {
    version:2,
    kind:'company-system-ai-verified-learning-context',
    taskId:clean(task.id),
    gameId,
    failureSignature:signature,
    resolvedTarget:inferLearningTarget(task),
    exactKnowledgeIds,
    domainClassification:retrieval.domainClassification||{primary:[],secondary:[],all:[],ranked:[]},
    priorityOrder:retrieval.priority||[],
    sameGameSameFailurePriority:true,
    crossGameTransformativeAdaptationRequired:true,
    rawCrossGameCopyForbidden:true,
    failedStrategyFingerprints:failedStrategies,
    failedStrategyReuseForbiddenWithoutNewCausalEvidence:true,
    outcomeAttributionRequired:true,
    freshQaRequiredOnReuse:true,
    knowledgeTraceRequired:exactKnowledgeIds.length>0,
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
