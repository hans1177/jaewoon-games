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
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const writeJson=(file,value)=>{fs.mkdirSync(new URL('.', 'file://'+file).pathname,{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');};
const sha256=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
const previousArtifactScoreFromOrder=order=>{
  const text=[order?.goal,order?.originalGoal].map(clean).join('\n');
  const match=text.match(/previousArtifactScore=(\d+(?:\.\d+)?)/i);
  return match?Math.max(0,Number(match[1])||0):null;
};

function parseJson(raw=''){
  const text=clean(raw).replace(/^\`\`\`(?:json)?/i,'').replace(/\`\`\`$/,'').trim();
  const a=text.indexOf('{'),b=text.lastIndexOf('}');
  if(a<0||b<a)throw new Error('practice response JSON missing');
  return JSON.parse(text.slice(a,b+1));
}

export function buildPracticePrompt(order={}){
  const route=clean(order?.executionRoute);
  if(!['analysis-only','learning-web-artifact'].includes(route))throw new Error('practice worker requires analysis-only or learning-web-artifact work order');
  if(!/\[VIBE_LEARNING_PRACTICE\]/.test(clean(order.goal)))throw new Error('practice marker missing');
  const webArtifact=route==='learning-web-artifact';
  return [
    'You are the Vibe learning practice worker. This is PRACTICE_ONLY.',
    webArtifact
      ? 'Create one self-contained runnable Web practice artifact. It must be original, interactive, mobile-friendly, and require no external network or assets.'
      : 'Do not edit files.',
    'Do not claim production pass. Do not invent runtime evidence.',
    'Your answer is untrusted practice knowledge until independently verified and distilled; do not claim it is reusable canonical knowledge.',
    webArtifact
      ? 'Return JSON only with keys: diagnosis, strategy, tests, avoidPatterns, reusablePatterns, artifactHtml. artifactHtml must be a complete self-contained HTML document with inline CSS and JavaScript.'
      : 'Solve the drill by returning JSON only with keys: diagnosis, strategy, tests, avoidPatterns, reusablePatterns.',
    'tests must contain at least 3 concrete verification checks; avoidPatterns/reusablePatterns are short generalized lessons.',
    webArtifact?'The artifact must have visible state change from user input, clear feedback, responsive viewport, and no fetch/WebSocket/external http(s) URLs.':'',
    previousArtifactScoreFromOrder(order)!==null?`Previous verified artifact score=${previousArtifactScoreFromOrder(order)}. Improve the artifact beyond this score while keeping the drill goal.`:'',
    'WORK ORDER:',
    clean(order.goal).slice(0,12000)
  ].filter(Boolean).join('\n');
}

async function requestModel(prompt,{model=DEFAULT_MODEL,responseFile='',timeoutMs=DEFAULT_TIMEOUT}={}){
  const fake=clean(responseFile||process.env.VIBE2_MODEL_RESPONSE_FILE);
  if(fake)return fs.readFileSync(fake,'utf8');
  const body=JSON.stringify({model,prompt,stream:false,think:false,options:{num_predict:1200,temperature:.12}});
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
  const pass=diagnosis.length>=12&&strategy.length>=12&&tests.length>=3&&(reusable.length+avoid.length)>=1;
  return {pass,diagnosis,strategy,tests:tests.slice(0,8),reusablePatterns:reusable.slice(0,8),avoidPatterns:avoid.slice(0,8)};
}

export function evaluateWebPracticeArtifact(html='',previousScore=null){
  const source=String(html||'');
  const checks={
    document:/<!doctype\s+html|<html[\s>]/i.test(source),
    viewport:/<meta[^>]+name=["']viewport["']/i.test(source),
    inlineStyle:/<style[\s>][\s\S]*?<\/style>/i.test(source),
    inlineScript:/<script[\s>][\s\S]*?<\/script>/i.test(source),
    interactiveElement:/<(button|input|canvas|select|textarea)\b/i.test(source),
    eventBinding:/addEventListener\s*\(|onclick\s*=|onpointer|ontouch/i.test(source),
    stateMutation:/\b(state|score|hp|health|level|wave|progress|count|energy|position)\b[\s\S]{0,120}(=|\+\+|--|\+=|-=)/i.test(source),
    feedback:/textContent\s*=|innerHTML\s*=|classList\.|style\.|aria-live|canvas/i.test(source),
    responsive:/@media\s*\(|min\(100vw|clamp\(|max-width\s*:/i.test(source),
    size:Buffer.byteLength(source,'utf8')>=700
  };
  const forbiddenNetwork=/https?:\/\/|fetch\s*\(|WebSocket\s*\(|EventSource\s*\(/i.test(source);
  const scripts=[...source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1]).filter(Boolean);
  let javascriptSyntax=true,syntaxError=null;
  try{for(const script of scripts)new Function(script);}catch(error){javascriptSyntax=false;syntaxError=clean(error?.message);}
  const passedChecks=Object.values(checks).filter(Boolean).length;
  const score=Math.max(0,Math.min(100,passedChecks*9+(javascriptSyntax?10:0)-(forbiddenNetwork?20:0)));
  const previous=previousScore===null?null:Math.max(0,Number(previousScore)||0);
  const pass=checks.document&&checks.inlineScript&&checks.interactiveElement&&checks.eventBinding&&javascriptSyntax&&!forbiddenNetwork&&score>=70;
  const improved=pass&&(previous===null||score>previous);
  return {
    pass,score,previousScore:previous,improved,
    checks,javascriptSyntax,syntaxError,forbiddenNetwork,
    byteLength:Buffer.byteLength(source,'utf8'),
    nextPracticeSignal:improved?'ESCALATE_DIFFICULTY':'RETRY_CAUSAL_VARIATION'
  };
}

export async function runLearningPractice({workOrderFile='.vibe2/work-order.json',outputFile='/tmp/vibe2-learning-practice-result.json',artifactDir='/tmp/vibe2-practice-web-artifact',model=DEFAULT_MODEL,responseFile=''}={}){
  const order=readJson(workOrderFile);
  const raw=await requestModel(buildPracticePrompt(order),{model,responseFile});
  const parsed=parseJson(raw);
  const evaluation=evaluatePracticeAnswer(parsed);
  const webArtifact=clean(order.executionRoute)==='learning-web-artifact';
  const previousArtifactScore=previousArtifactScoreFromOrder(order);
  let artifact=null;
  if(webArtifact){
    const html=String(parsed.artifactHtml||'');
    const validation=evaluateWebPracticeArtifact(html,previousArtifactScore);
    fs.mkdirSync(artifactDir,{recursive:true});
    const artifactFile=new URL('index.html','file://'+artifactDir.replace(/\/$/,'')+'/').pathname;
    fs.writeFileSync(artifactFile,html,'utf8');
    artifact={
      kind:'vibe2-web-practice-artifact',
      ephemeral:true,
      canonicalKnowledgeStored:false,
      repositorySourceWrite:false,
      productionPromotionAllowed:false,
      fileName:'index.html',
      sha256:sha256(html),
      score:validation.score,
      previousScore:validation.previousScore,
      improved:validation.improved,
      validation
    };
    const improvementRequired=validation.previousScore!==null;
    evaluation.pass=evaluation.pass&&validation.pass&&(!improvementRequired||validation.improved===true);
  }
  const rawModelOutputSha256=sha256(raw);
  const result={
    version:3,kind:'vibe2-learning-practice-result',taskId:clean(order.taskId)||null,
    practiceMode:webArtifact?'WEB_ARTIFACT':'ANALYSIS',
    practiceOnly:true,productionPass:false,sourceWrite:false,repositorySourceWrite:false,artifactWrite:webArtifact,model,
    knowledgeState:'UNTRUSTED_PRACTICE_OUTPUT',rawModelOutputSha256,rawModelOutputStored:false,
    candidateLessonsVerified:false,retrievalEligible:false,masteryCreditEligible:false,canonicalTrainingEligible:false,
    independentVerificationRequired:true,distillationRequiredBeforeReuse:true,
    evaluation:evaluation.pass?'PASS':'FAIL',...evaluation,artifact,
    nextPracticeSignal:webArtifact?(artifact?.validation?.nextPracticeSignal||'RETRY_CAUSAL_VARIATION'):'NEXT_CAUSAL_PRACTICE',
    authority:'practice-only-no-production-promotion'
  };
  writeJson(outputFile,result);
  if(!evaluation.pass)throw new Error(webArtifact?'web practice artifact evaluation failed':'practice evaluation failed');
  return result;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{const [k,...v]=x.slice(2).split('=');return[k,v.join('=')]}));
  const result=await runLearningPractice({workOrderFile:clean(args.order)||'.vibe2/work-order.json',outputFile:clean(args.output)||'/tmp/vibe2-learning-practice-result.json',artifactDir:clean(args['artifact-dir'])||'/tmp/vibe2-practice-web-artifact',model:clean(args.model)||DEFAULT_MODEL,responseFile:clean(args.response)});
  console.log('VIBE2_LEARNING_PRACTICE=PASS');
  console.log('VIBE2_PRACTICE_SOURCE_WRITE=NO');
  console.log('VIBE2_PRACTICE_PRODUCTION_PASS=NO');
  console.log(`VIBE2_PRACTICE_MODE=${result.practiceMode}`);
  console.log(`VIBE2_PRACTICE_ARTIFACT_SCORE=${Number(result.artifact?.score||0)}`);
  console.log(`VIBE2_PRACTICE_ARTIFACT_IMPROVED=${result.artifact?.improved===true?'YES':'NO'}`);
  console.log(`VIBE2_PRACTICE_NEXT_SIGNAL=${result.nextPracticeSignal}`);
  console.log(`VIBE2_PRACTICE_REUSABLE=${result.reusablePatterns.length}`);
}
