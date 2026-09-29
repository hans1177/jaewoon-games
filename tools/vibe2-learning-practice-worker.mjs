// 파일명: tools/vibe2-learning-practice-worker.mjs
// 역할: 고정 학습 슬롯에서 검증 실패 복습과 격리된 실행 과제를 수행한다.
// 안전: 게임 소스 write 0, production PASS 0, 배포/승격 증거로 사용할 수 없다.

import fs from 'node:fs';
import crypto from 'node:crypto';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
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

export function buildPracticePrompt(order={}, {drill=null}={}){
  const route=clean(order?.executionRoute);
  if(!['analysis-only','learning-web-artifact'].includes(route))throw new Error('practice worker requires analysis-only or learning-web-artifact work order');
  if(!/\[VIBE_LEARNING_PRACTICE\]/.test(clean(order.goal)))throw new Error('practice marker missing');
  const webArtifact=route==='learning-web-artifact';
  const unityDrill=drill?.platform==='unity';
  return [
    'You are the Vibe learning practice worker. This is PRACTICE_ONLY.',
    webArtifact
      ? 'Create one self-contained runnable Web practice artifact. It must be original, interactive, mobile-friendly, and require no external network or assets.'
      : drill?`Return repaired ${unityDrill?'C# class Practice':'Luau module'} source in the code field. Do not edit repository files.`:'Do not edit files.',
    'Do not claim production pass. Do not invent runtime evidence.',
    'Your answer is untrusted practice knowledge until independently verified and distilled; do not claim it is reusable canonical knowledge.',
    webArtifact
      ? 'Return JSON only with keys: diagnosis, strategy, tests, avoidPatterns, reusablePatterns, artifactHtml. artifactHtml must be a complete self-contained HTML document with inline CSS and JavaScript.'
      : drill?'Return JSON only with keys: diagnosis, strategy, tests, avoidPatterns, reusablePatterns, code. code must implement exactly the requested function or class.':'Solve the drill by returning JSON only with keys: diagnosis, strategy, tests, avoidPatterns, reusablePatterns.',
    'tests must contain at least 3 concrete verification checks; avoidPatterns/reusablePatterns are short generalized lessons.',
    webArtifact?'The artifact must have visible state change from a tappable button, clear text feedback in [data-practice-value] or #score, responsive viewport, and no fetch/WebSocket/external http(s) URLs. Mark the primary button with data-practice-action. A real mobile browser will tap it and rotate the viewport.':'',
    previousArtifactScoreFromOrder(order)!==null?`Previous verified artifact score=${previousArtifactScoreFromOrder(order)}. Improve the artifact beyond this score while keeping the drill goal.`:'',
    'WORK ORDER:',
    drill?JSON.stringify({id:drill.id,level:drill.level,scenario:drill.scenario,brokenCode:drill.broken}):clean(order.goal).slice(0,12000)
  ].filter(Boolean).join('\n');
}

async function requestModel(prompt,{model=DEFAULT_MODEL,responseFile='',timeoutMs=DEFAULT_TIMEOUT,maxPredict=1200}={}){
  const fake=clean(responseFile||process.env.VIBE2_MODEL_RESPONSE_FILE);
  if(fake)return fs.readFileSync(fake,'utf8');
  const body=JSON.stringify({model,prompt,stream:false,think:false,options:{num_predict:maxPredict,temperature:.12}});
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

export function evaluatePracticeAnswer(value={}, {drill=null,luauBinary=process.env.VIBE2_LUAU_BINARY||'luau'}={}){
  const tests=Array.isArray(value.tests)?value.tests.map(clean).filter(Boolean):[];
  const reusable=Array.isArray(value.reusablePatterns)?value.reusablePatterns.map(clean).filter(Boolean):[];
  const avoid=Array.isArray(value.avoidPatterns)?value.avoidPatterns.map(clean).filter(Boolean):[];
  const diagnosis=clean(value.diagnosis),strategy=clean(value.strategy);
  let pass=diagnosis.length>=12&&strategy.length>=12&&tests.length>=3&&(reusable.length+avoid.length)>=1;
  let codeVerification=null;
  if(drill?.platform==='unity'){
    const code=String(value.code||'');
    codeVerification={scope:'STANDALONE_CSHARP_LOGIC_ONLY',nativeRuntimeVerified:false,productionPromotionAllowed:false,passedTests:0,totalTests:drill.tests.length,baselineRejected:false,referencePassed:false,candidateSha256:sha256(code),drillSha256:sha256(JSON.stringify(drill)),pass:false};
    if(!code.trim()||Buffer.byteLength(code,'utf8')>24000||/\b(?:System|Console|Environment|Process|File|Directory|Reflection|Assembly|DllImport|unsafe|extern|dynamic)\b/.test(code)){
      codeVerification.reason='INVALID_OR_UNSAFE_PRACTICE_MODULE';
    }else{
      const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-csharp-'));
      try{
        execFileSync('docker',['image','inspect','mcr.microsoft.com/dotnet/sdk:8.0'],{timeout:10000,stdio:'ignore'});
        const outcomes={};
        fs.writeFileSync(path.join(dir,'Practice.csproj'),'<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net8.0</TargetFramework><EnableDefaultCompileItems>true</EnableDefaultCompileItems></PropertyGroup></Project>');
        fs.writeFileSync(path.join(dir,'NuGet.Config'),'<configuration><packageSources><clear /></packageSources></configuration>');
        for(const [kind,source] of Object.entries({baseline:drill.broken,reference:drill.reference,candidate:code})){
          fs.chmodSync(dir,0o755);
          const proof=crypto.randomBytes(16).toString('hex');
          fs.writeFileSync(path.join(dir,'Candidate.cs'),source);
          fs.writeFileSync(path.join(dir,'Program.cs'),'public class PracticeState { public bool Active,InputEnabled,Paused; public int Subscriptions,LiveObjects,Score,SavedScore; } public class Program { static void Check(bool ok){if(!ok)throw new System.Exception("assert");} static void Main(){'+drill.tests.map(body=>'{'+body+'}').join('')+'System.Console.WriteLine("'+proof+'");}}');
          const container='vibe-practice-'+crypto.randomBytes(8).toString('hex');
          try{
            const output=execFileSync('docker',['run','--rm','--name',container,'--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--pids-limit','128','--memory','768m','--cpus','1','--user','65534:65534','--tmpfs','/tmp:rw,exec,size=384m,mode=1777','-e','DOTNET_CLI_HOME=/tmp','-e','DOTNET_CLI_TELEMETRY_OPTOUT=1','-e','DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1','--mount','type=bind,src='+dir+',dst=/input,readonly','mcr.microsoft.com/dotnet/sdk:8.0','sh','-c','cp /input/* /tmp/; cd /tmp; dotnet run --project Practice.csproj --verbosity quiet'],{timeout:45000,maxBuffer:131072,encoding:'utf8',stdio:['ignore','pipe','pipe']});
            outcomes[kind]=output.trim().split(/\r?\n/).includes(proof);
          }catch{outcomes[kind]=false;}
          finally{try{execFileSync('docker',['rm','-f',container],{timeout:5000,stdio:'ignore'});}catch{}}
        }
        codeVerification.baselineRejected=!outcomes.baseline;
        codeVerification.referencePassed=outcomes.reference;
        codeVerification.passedTests=outcomes.candidate?drill.tests.length:0;
        codeVerification.pass=!outcomes.baseline&&outcomes.reference&&outcomes.candidate;
        codeVerification.reason=codeVerification.pass?'VERIFIED_LOGIC_ONLY':'REGRESSION_OR_FIXTURE_FAILED';
      }catch{codeVerification.reason='CSHARP_EXECUTOR_UNAVAILABLE';}
      finally{fs.rmSync(dir,{recursive:true,force:true});}
    }
    pass=pass&&codeVerification.pass;
  }else if(drill&&drill.platform!=='web'){
    const code=String(value.code||'');
    codeVerification={scope:'STANDALONE_LUAU_LOGIC_ONLY',nativeRuntimeVerified:false,productionPromotionAllowed:false,passedTests:0,totalTests:drill.tests.length,baselineRejected:false,referencePassed:false,candidateSha256:sha256(code),drillSha256:sha256(JSON.stringify(drill)),pass:false};
    if(!code.trim()||Buffer.byteLength(code,'utf8')>24000||/\b(?:require|loadstring|getfenv|setfenv|debug)\b/.test(code)){
      codeVerification.reason='INVALID_OR_UNSAFE_PRACTICE_MODULE';
    }else{
      const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-luau-'));
      try{
        const outcomes={};
        for(const [kind,source] of Object.entries({baseline:drill.broken,reference:drill.reference,candidate:code})){
          fs.writeFileSync(path.join(dir,'candidate.luau'),source,'utf8');
          outcomes[kind]=[];
          for(const testBody of drill.tests){
            fs.writeFileSync(path.join(dir,'check.luau'),testBody,'utf8');
            try{execFileSync(luauBinary,['check.luau'],{cwd:dir,timeout:3000,maxBuffer:131072,stdio:['ignore','pipe','pipe']});outcomes[kind].push(true);}
            catch(error){if(error.code==='ENOENT'||error.code==='EACCES')throw error;outcomes[kind].push(false);}
          }
        }
        codeVerification.baselineRejected=outcomes.baseline.some(value=>!value);
        codeVerification.referencePassed=outcomes.reference.every(Boolean);
        codeVerification.passedTests=outcomes.candidate.filter(Boolean).length;
        codeVerification.pass=codeVerification.baselineRejected&&codeVerification.referencePassed&&outcomes.candidate.every(Boolean);
        codeVerification.reason=codeVerification.pass?'VERIFIED_LOGIC_ONLY':'REGRESSION_OR_FIXTURE_FAILED';
      }catch(error){codeVerification.reason='LUAU_EXECUTOR_UNAVAILABLE';}
      finally{fs.rmSync(dir,{recursive:true,force:true});}
    }
    pass=pass&&codeVerification.pass;
  }
  return {pass,diagnosis,strategy,tests:tests.slice(0,8),reusablePatterns:reusable.slice(0,8),avoidPatterns:avoid.slice(0,8),...(codeVerification?{codeVerification}:{})};
}

export async function evaluateWebPracticeArtifact(html='',previousScore=null,{drill=null,browserModule=process.env.VIBE2_PLAYWRIGHT_MODULE||'playwright'}={}){
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
  const staticPass=checks.document&&checks.inlineScript&&checks.interactiveElement&&checks.eventBinding&&javascriptSyntax&&!forbiddenNetwork&&score>=70&&Buffer.byteLength(source,'utf8')<=240000;
  const runtime={scope:'ISOLATED_MOBILE_BROWSER',executed:false,pass:false,baselineRejected:drill?false:null,referencePassed:drill?false:null,variants:[],candidateSha256:sha256(source),fixtureSha256:drill?sha256(JSON.stringify(drill)):null,reason:'STATIC_CHECK_FAILED'};
  if(staticPass){
    let browser;
    try{
      const {chromium}=await import(browserModule);
      browser=await chromium.launch({headless:true});
      const outcomes={};
      const seed=crypto.randomInt(11,97),counts=[2,5];
      runtime.variantFingerprint=sha256(JSON.stringify({seed,counts}));
      for(const [kind,document] of Object.entries(drill?{baseline:drill.broken,reference:drill.reference,candidate:source}:{candidate:source})){
        outcomes[kind]=true;
        for(const [index,taps] of counts.entries()){
          const context=await browser.newContext({viewport:{width:360+index*30,height:780},hasTouch:true,isMobile:true,serviceWorkers:'block',acceptDownloads:false});
          let contextPass=false;
          try{
            const errors=[];let forbiddenRequest=false;
            await context.route('**/*',route=>route.request().url()==='http://practice.invalid/'&&route.request().isNavigationRequest()?route.fulfill({status:200,contentType:'text/html',body:document}):(forbiddenRequest=true,route.abort()));
            await context.routeWebSocket('**/*',socket=>{forbiddenRequest=true;socket.close();});
            if(drill)await context.addInitScript(({seed})=>{if(localStorage.getItem('practice-score-v1')===null)localStorage.setItem('practice-score-v1',String(seed));},{seed});
            const page=await context.newPage();page.on('pageerror',error=>errors.push(String(error)));
            page.setDefaultTimeout(2000);
            await page.goto('http://practice.invalid/',{waitUntil:'load',timeout:5000});
            const action=page.locator('[data-practice-action],button').first();
            const value=page.locator('[data-practice-value],#score').first();
            if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw new Error('PORTRAIT_OVERFLOW');
            const before=await value.innerText();
            if(drill&&Number(before)!==seed)throw new Error('RESTORE_INITIAL_VALUE');
            for(let n=0;n<taps;n++)await action.tap();
            const after=await value.innerText();
            if(after===before)throw new Error('INPUT_FEEDBACK_UNCHANGED');
            if(drill&&Number(after)!==seed+taps)throw new Error('DUPLICATE_OR_LOST_INPUT');
            await page.setViewportSize({width:780,height:360+index*30});
            if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw new Error('VIEWPORT_OVERFLOW');
            await action.tap();
            if((await value.innerText())===after)throw new Error('ROTATION_INPUT_UNCHANGED');
            if(drill){
              if(Number(await value.innerText())!==seed+taps+1)throw new Error('ROTATION_INPUT');
              await page.reload({waitUntil:'load',timeout:5000});
              if(Number(await value.innerText())!==seed+taps+1)throw new Error('RELOAD_STATE_LOSS');
              await action.tap();
              if(Number(await value.innerText())!==seed+taps+2)throw new Error('RELOAD_INPUT');
            }
            if(errors.length||forbiddenRequest)throw new Error('BROWSER_ERROR_OR_NETWORK');
            contextPass=true;
          }catch(error){if(kind==='candidate')runtime.reason=clean(error.message).slice(0,180);}
          finally{await context.close();}
          outcomes[kind]=outcomes[kind]&&contextPass;
          if(kind==='candidate')runtime.variants.push({id:'mobile-'+index,pass:contextPass});
        }
      }
      runtime.executed=true;
      if(drill){runtime.baselineRejected=!outcomes.baseline;runtime.referencePassed=outcomes.reference;}
      runtime.pass=outcomes.candidate&&(!drill||runtime.baselineRejected&&runtime.referencePassed);
      if(runtime.pass)runtime.reason='VERIFIED_BROWSER_PRACTICE';
    }catch(error){runtime.reason='BROWSER_EXECUTOR_UNAVAILABLE';runtime.error=clean(error.message).slice(0,180);}
    finally{if(browser)await browser.close();}
  }
  const pass=staticPass&&runtime.pass;
  const improved=pass&&(previous===null||score>previous);
  return {
    pass,score,previousScore:previous,improved,
    checks,javascriptSyntax,syntaxError,forbiddenNetwork,runtime,
    byteLength:Buffer.byteLength(source,'utf8'),
    nextPracticeSignal:pass&&drill?'NEXT_CAUSAL_VARIATION':improved?'ESCALATE_DIFFICULTY':'RETRY_CAUSAL_VARIATION'
  };
}

export async function runLearningPractice({workOrderFile='.vibe2/work-order.json',outputFile='/tmp/vibe2-learning-practice-result.json',artifactDir='/tmp/vibe2-practice-web-artifact',model=DEFAULT_MODEL,responseFile=''}={}){
  const order=readJson(workOrderFile);
  const drillId=clean(order?.selectedTask?.codingPracticeDrill||order?.codingPracticeDrill||order?.selectedTask?.robloxPracticeDrill||order?.robloxPracticeDrill);
  const curriculum=drillId?readJson(new URL('../company-learning/roblox-practice.json',import.meta.url)):null;
  const drill=curriculum?[...curriculum.drills,...(curriculum.platformDrills||[])].find(row=>row.id===drillId)||null:null;
  if(drillId&&!drill)throw new Error('UNKNOWN_ROBLOX_PRACTICE_DRILL');
  const raw=await requestModel(buildPracticePrompt(order,{drill}),{model,responseFile,maxPredict:drill||clean(order.executionRoute)==='learning-web-artifact'?3072:1200});
  const parsed=parseJson(raw);
  const evaluation=evaluatePracticeAnswer(parsed,{drill});
  const webArtifact=clean(order.executionRoute)==='learning-web-artifact';
  const previousArtifactScore=previousArtifactScoreFromOrder(order);
  let artifact=null;
  if(webArtifact){
    const html=String(parsed.artifactHtml||'');
    const validation=await evaluateWebPracticeArtifact(html,previousArtifactScore,{drill:drill?.platform==='web'?drill:null});
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
    // 고장 카드는 만점 이후에도 새로운 실행 변형으로 복습하되 품질 점수는 떨어뜨리지 않는다.
    evaluation.pass=evaluation.pass&&validation.pass&&(!improvementRequired||(drill?.platform==='web'?validation.score>=validation.previousScore:validation.improved===true));
  }
  const rawModelOutputSha256=sha256(raw);
  const result={
    version:3,kind:'vibe2-learning-practice-result',taskId:clean(order.taskId)||null,
    practiceMode:webArtifact?'WEB_ARTIFACT':drill?.platform==='unity'?'UNITY_CODE':drill?'ROBLOX_CODE':'ANALYSIS',
    practiceDrillId:drill?.id||null,nativeRuntimeVerified:false,
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
