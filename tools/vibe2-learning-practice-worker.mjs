// 파일명: tools/vibe2-learning-practice-worker.mjs
// 역할: 생산 작업이 없는 빈 슬롯에서 검증 실패 복습/미니 시스템 드릴을 수행한다.
// 안전: 게임 소스 write 0, production PASS 0, 배포/승격 증거로 사용할 수 없다.

import fs from 'node:fs';
import crypto from 'node:crypto';
import http from 'node:http';
import { pathToFileURL } from 'node:url';

const clean=v=>String(v??'').trim();
const DEFAULT_MODEL=process.env.VIBE2_LOCAL_MODEL||'qwen3:1.7b';
const DEFAULT_TIMEOUT=Math.max(10000,Math.min(300000,Number(process.env.VIBE2_MODEL_TIMEOUT_MS||240000)));
const MAX_ATTEMPTS=2;
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const writeJson=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');

function parseJson(raw=''){
  const text=clean(raw).replace(/^\`\`\`(?:json)?/i,'').replace(/\`\`\`$/,'').trim();
  const a=text.indexOf('{'),b=text.lastIndexOf('}');
  if(a<0||b<a)throw new Error('practice response JSON missing');
  return JSON.parse(text.slice(a,b+1));
}

export function buildPracticePrompt(order={}){
  if(order?.executionRoute!=='analysis-only')throw new Error('practice worker requires analysis-only work order');
  if(!/\[VIBE_LEARNING_PRACTICE\]/.test(clean(order.goal)))throw new Error('practice marker missing');
  return [
    'You are the Vibe learning practice worker. This is PRACTICE_ONLY.',
    'Do not edit files. Do not claim production pass. Do not invent runtime evidence.',
    'Your answer is untrusted practice knowledge until independently verified and distilled; do not claim it is reusable canonical knowledge.',
    'Return one strict JSON object only. No markdown and no prose outside JSON.',
    'Required keys: diagnosis, strategy, tests, avoidPatterns, reusablePatterns.',
    'diagnosis and strategy must each be specific enough to exceed 12 characters.',
    'tests must contain at least 3 concrete verification checks.',
    'At least one generalized lesson must exist across avoidPatterns or reusablePatterns.',
    'All array items must be non-empty strings. Do not fabricate runtime observations.',
    'WORK ORDER:',
    clean(order.goal).slice(0,12000)
  ].join('\n');
}

async function requestModel(prompt,{model=DEFAULT_MODEL,responseFile='',timeoutMs=DEFAULT_TIMEOUT}={}){
  const fake=clean(responseFile||process.env.VIBE2_MODEL_RESPONSE_FILE);
  if(fake)return fs.readFileSync(fake,'utf8');
  const body=JSON.stringify({model,prompt,stream:false,think:false,format:'json',options:{num_predict:1200,temperature:.08}});
  return await new Promise((resolve,reject)=>{
    const req=http.request({hostname:'127.0.0.1',port:11434,path:'/api/generate',method:'POST',headers:{'content-type':'application/json','content-length':Buffer.byteLength(body)}},res=>{
      let data='';res.setEncoding('utf8');res.on('data',x=>data+=x);res.on('end',()=>{
        try{const row=JSON.parse(data);if(row?.error)throw new Error(row.error);resolve(String(row?.response||''));}catch(e){reject(e);}
      });res.on('error',reject);
    });
    req.setTimeout(timeoutMs,()=>req.destroy(new Error('practice model timeout')));
    req.on('error',reject);req.end(body);
  });
}

export function evaluatePracticeAnswer(value={}){
  const tests=Array.isArray(value.tests)?value.tests.map(clean).filter(Boolean):[];
  const reusable=Array.isArray(value.reusablePatterns)?value.reusablePatterns.map(clean).filter(Boolean):[];
  const avoid=Array.isArray(value.avoidPatterns)?value.avoidPatterns.map(clean).filter(Boolean):[];
  const diagnosis=clean(value.diagnosis),strategy=clean(value.strategy);
  const reasons=[];
  if(diagnosis.length<12)reasons.push('DIAGNOSIS_TOO_SHORT');
  if(strategy.length<12)reasons.push('STRATEGY_TOO_SHORT');
  if(tests.length<3)reasons.push('TESTS_MINIMUM_NOT_MET');
  if((reusable.length+avoid.length)<1)reasons.push('GENERALIZED_LESSON_REQUIRED');
  const pass=reasons.length===0;
  return {pass,reasons,diagnosis,strategy,tests:tests.slice(0,8),reusablePatterns:reusable.slice(0,8),avoidPatterns:avoid.slice(0,8)};
}

export function buildPracticeRetryPrompt(prompt,evaluation={}){
  const reasons=Array.isArray(evaluation.reasons)&&evaluation.reasons.length?evaluation.reasons.join(','):'STRUCTURAL_GATE_FAILED';
  return [
    prompt,
    '',
    'CORRECTION RETRY: the previous answer failed the unchanged practice structure gate.',
    `Failure reasons: ${reasons}`,
    'Regenerate the complete JSON object from scratch. Keep the same drill meaning.',
    'Do not weaken verification checks, invent evidence, edit source, or claim any production/QA/release pass.'
  ].join('\n');
}

export async function runLearningPractice({workOrderFile='.vibe2/work-order.json',outputFile='/tmp/vibe2-learning-practice-result.json',model=DEFAULT_MODEL,responseFile=''}={}){
  const order=readJson(workOrderFile);
  const basePrompt=buildPracticePrompt(order);
  let evaluation=null,attempts=0,lastError=null,rawModelOutputSha256='';
  for(let attempt=1;attempt<=MAX_ATTEMPTS;attempt++){
    attempts=attempt;
    const prompt=attempt===1?basePrompt:buildPracticeRetryPrompt(basePrompt,evaluation||{});
    try{
      const raw=await requestModel(prompt,{model,responseFile});
      rawModelOutputSha256=crypto.createHash('sha256').update(String(raw)).digest('hex');
      evaluation=evaluatePracticeAnswer(parseJson(raw));
      if(evaluation.pass)break;
      lastError=new Error(`practice evaluation failed: ${evaluation.reasons.join(',')}`);
    }catch(error){
      lastError=error;
      if(responseFile)break;
    }
  }
  evaluation=evaluation||evaluatePracticeAnswer({});
  const result={
    version:3,kind:'vibe2-learning-practice-result',taskId:clean(order.taskId)||null,
    practiceOnly:true,productionPass:false,sourceWrite:false,model,
    knowledgeState:'UNTRUSTED_PRACTICE_OUTPUT',rawModelOutputSha256,rawModelOutputStored:false,
    candidateLessonsVerified:false,retrievalEligible:false,masteryCreditEligible:false,canonicalTrainingEligible:false,
    independentVerificationRequired:true,distillationRequiredBeforeReuse:true,
    attempts,recoveryUsed:attempts>1,
    evaluation:evaluation.pass?'PASS':'FAIL',...evaluation,
    authority:'practice-only-no-production-promotion'
  };
  writeJson(outputFile,result);
  if(!evaluation.pass)throw lastError||new Error(`practice evaluation failed: ${evaluation.reasons.join(',')}`);
  return result;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{const [k,...v]=x.slice(2).split('=');return[k,v.join('=')]}));
  const result=await runLearningPractice({workOrderFile:clean(args.order)||'.vibe2/work-order.json',outputFile:clean(args.output)||'/tmp/vibe2-learning-practice-result.json',model:clean(args.model)||DEFAULT_MODEL,responseFile:clean(args.response)});
  console.log('VIBE2_LEARNING_PRACTICE=PASS');
  console.log('VIBE2_PRACTICE_SOURCE_WRITE=NO');
  console.log('VIBE2_PRACTICE_PRODUCTION_PASS=NO');
  console.log(`VIBE2_PRACTICE_REUSABLE=${result.reusablePatterns.length}`);
}
