// 파일명: qa/company-design-pre-gate-resume.test.mjs
// 임포트
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {EventEmitter} from 'node:events';
import {createHash} from 'node:crypto';
import {buildAllGameDynamicLibraryBindingPlan,buildAssetSupplyDecisionSummary} from '../tools/vibe2-asset-production-plan.mjs';
import {validateDesignAuthoringContent,scoreDesignGateV2,designPlayabilityRequirements} from '../tools/company-design-gate-scoring-v2.mjs';

const design=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
const assertDesignSchema=runInNewContext(design.slice(design.indexOf('function assertSchemaValue('),design.indexOf('function normalizeSchemaValue('))+'\nassertSchemaValue');

// 대표 검증과 일반 배치 모두 실제 대상 수·중앙 정책 범위 안에서 병렬 실행한다.
test('design canary games run concurrently without bypassing the verified-engine gate',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
  const selection=workflow.split('\n').find(line=>line.trim().startsWith('const selected='));
  const concurrency=workflow.split('\n').find(line=>line.trim().startsWith('const parallelMax='));
  for(const [verified,preservation,count,wip,expected] of [
    [false,false,14,256,3],[true,false,14,256,14],
    [false,false,1,256,1],[false,false,0,256,1],
    [false,false,2,1,1],[false,true,14,256,1]
  ]){
    const result=runInNewContext(selection+'\nconst targets=selected;\n'+concurrency+'\n({selected:selected.length,parallelMax})',{
      pending:Array.from({length:count},(_,id)=>({id})),canaryVerified:verified,preservationOnly:preservation,designWipMax:wip
    });
    assert.equal(result.parallelMax,expected);
    if(!verified)assert.ok(result.selected<=3,'representative canary must remain required');
  }
  assert.match(workflow,/fail-fast: false/);
  assert.match(workflow,/max-parallel: \$\{\{ fromJSON\(needs\.resolve-seed-targets\.outputs\.parallel_max\) \}\}/);
  assert.match(workflow,/canary_mode == 'true' && needs\.design-cycle\.result == 'success'/);
  assert.match(workflow,/target_count: \$\{\{ steps\.targets\.outputs\.target_count \}\}/);
  assert.match(workflow,/VERIFIED_GAME_COUNT: \$\{\{ needs\.resolve-seed-targets\.outputs\.target_count \}\}/);
  assert.match(workflow,/"verifiedGameCount": \$VERIFIED_GAME_COUNT/);
});

// 내부 모델 시간 제한·준비·재개 회귀 검증
test('local authoring owns a bounded five-minute budget independently of external timeout',async()=>{
  const config=design.split('\n').filter(line=>/^const (?:modelCallTimeoutMs|localDesignerCallTimeoutMs)=/.test(line)).join('\n');
  for(const [value,expected] of [[undefined,300000],['300000',300000],['900000',300000],['1',30000],['invalid',300000]]){
    const budgets=runInNewContext(config+'\n({local:localDesignerCallTimeoutMs})',{process:{env:{COMPANY_MODEL_CALL_TIMEOUT_MS:'90000',COMPANY_LOCAL_DESIGN_CALL_TIMEOUT_MS:value}}});
    assert.equal(budgets.local,expected);
  }
  const source=design.slice(design.indexOf('async function callLocalDesignerModel('),design.indexOf('async function callDesignerModel('));
  const calls=[],stats=[];
  const author=runInNewContext(source+'\ncallLocalDesignerModel',{
    createHash,designAssetLibraryContext:{status:'UNAVAILABLE'},localDesignerFallbackReady:true,localDesignerCallTimeoutMs:300000,localDesignerModel:'local',
    designerRoute:{id:'external'},designCheckpoint:{},modelCallStats:stats,console:{log(){}},
    requestLocalDesignerRaw:async(prompt,options)=>{calls.push(options);return '{"identity":"4v4 infection"}';},
    parseJsonObject:JSON.parse,normalizeSchemaValue:value=>value,assertSchemaValue(){},recordModelHealth(){},persistDesignCheckpoint(){}
  });
  for(const timeoutMs of [90000,120000])assert.equal((await author('system','user',{}, {timeoutMs})).identity,'4v4 infection');
  assert.deepEqual(calls.map(row=>row.timeoutMs),[300000,300000]);
  assert.deepEqual(stats.map(row=>row.timeoutMs),[300000,300000]);
});

test('local transport accepts a late completed response and rejects incomplete output without a false success',async()=>{
  const source=design.slice(design.indexOf('async function requestLocalDesignerRaw('),design.indexOf('async function callLocalDesignerModel('));
  const schema={type:'object',required:['identity'],properties:{identity:{type:'string'}},additionalProperties:false};
  for(const mode of ['complete','incomplete','timeout','truncated']){
    let timer,delay,requestBody,destroyed=false;
    const logs=[];
    const request=runInNewContext(source+'\nrequestLocalDesignerRaw',{
      localDesignerCallTimeoutMs:300000,localDesignerModel:'local',Buffer,
      clean:value=>String(value??'').trim(),clip:value=>String(value),console:{log:value=>logs.push(value)},
      setTimeout:(fn,ms)=>{timer=fn;delay=ms;return 1;},clearTimeout(){},
      http:{request:(options,onResponse)=>{
        assert.equal(options.hostname,'127.0.0.1');
        const req=new EventEmitter();
        req.destroy=()=>{req.destroyed=true;destroyed=true;};
        req.end=body=>{
          requestBody=JSON.parse(body);
          queueMicrotask(()=>{
            if(mode==='timeout'){timer();return;}
            const res=new EventEmitter();res.statusCode=200;res.setEncoding=()=>{};onResponse(res);
            res.emit('data',JSON.stringify({done:mode==='complete'||mode==='truncated',done_reason:mode==='truncated'?'length':'stop',response:'{"identity":"4v4 infection"}',load_duration:1000000,prompt_eval_count:800,prompt_eval_duration:95000000000,eval_count:1000,eval_duration:65000000000}));
            res.emit('end');
          });
        };
        return req;
      }}
    });
    if(mode==='complete')assert.equal(await request('private design input',{schema}),'{"identity":"4v4 infection"}');
    else await assert.rejects(request('private design input',{schema}),mode==='timeout'?/OLLAMA_DESIGN_TIMEOUT 300000ms/:mode==='truncated'?/OLLAMA_DESIGN_OUTPUT_TRUNCATED/:/OLLAMA_DESIGN_INCOMPLETE_RESPONSE/);
    assert.equal(delay,300000);assert.equal(destroyed,true);
    assert.equal(requestBody.keep_alive,'10m');assert.equal(requestBody.think,false);
    assert.deepEqual(requestBody.format,schema);
    assert.equal(logs.some(row=>row.includes('private design input')),false);
    assert.equal(logs.some(row=>row.includes('DESIGN_LOCAL_TIMING=')),mode==='complete'||mode==='truncated');
  }
});

test('truncated local output splits required fields and resumes only the unfinished part',async()=>{
  const source=design.slice(design.indexOf('async function callLocalDesignerModel('),design.indexOf('async function callDesignerModel('));
  const taskSource=design.slice(design.indexOf('async function runCheckpointTask('),design.indexOf('function isParallelPressure('));
  const schema={type:'object',required:['a','b','c','d'],properties:Object.fromEntries(['a','b','c','d'].map(field=>[field,{type:'string'}])),additionalProperties:false};
  const checkpoint={tasks:{}},calls=[],stats=[],health=[];
  let secondPartFails=true;
  const author=runInNewContext(taskSource+'\n'+source+'\ncallLocalDesignerModel',{
    createHash,designAssetLibraryContext:{status:'UNAVAILABLE'},localDesignerFallbackReady:true,localDesignerCallTimeoutMs:300000,localDesignerModel:'local',
    designerRoute:{id:'ollama:local'},designCheckpoint:checkpoint,modelCallStats:stats,console:{log(){}},
    clean:String,parseJsonObject:JSON.parse,normalizeSchemaValue:value=>value,persistDesignCheckpoint(){},
    recordModelHealth:(model,row)=>health.push(row),
    assertSchemaValue:(value,contract)=>{for(const field of contract.required)assert.equal(typeof value[field],'string');},
    requestLocalDesignerRaw:async(prompt,{schema:contract})=>{
      const fields=Object.keys(contract.properties);calls.push(fields.join(','));
      if(fields.length===4)throw new Error('OLLAMA_DESIGN_OUTPUT_TRUNCATED');
      if(fields[0]==='c'&&secondPartFails){secondPartFails=false;throw new Error('OLLAMA_DESIGN_HTTP_503');}
      return JSON.stringify(Object.fromEntries(fields.map(field=>[field,'authored '+field])));
    }
  });
  await assert.rejects(author('system','owner brief',schema),/OLLAMA_DESIGN_HTTP_503/);
  assert.equal(Object.keys(checkpoint.tasks).length,1,'only the completed half may be saved');
  const value=await author('system','owner brief',schema);
  assert.deepEqual(JSON.parse(JSON.stringify(value)),{a:'authored a',b:'authored b',c:'authored c',d:'authored d'});
  assert.deepEqual(calls,['a,b,c,d','a,b','c,d','c,d']);
  assert.equal(stats.length,2,'assembling checkpointed parts is not another model call');
  assert.equal(health.filter(row=>row.success===false).length,2);
});

test('workflow warms the same local context before declaring authoring ready and fails closed',async()=>{
  const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
  const start=workflow.indexOf('      - name: Prepare Vibe local design fallback');
  const end=workflow.indexOf('      - name: Run seed-backed DESIGN_ONLY pipeline',start);
  const step=workflow.slice(start,end);
  const script=step.match(/<<'NODE'\n([\s\S]*?)\n          NODE/)[1].replace(/^          /gm,'');
  assert.ok(step.indexOf('DESIGN_LOCAL_WARMUP=READY')<step.indexOf("echo 'ready=true'"));
  assert.match(workflow,/COMPANY_LOCAL_DESIGN_CALL_TIMEOUT_MS: '300000'/);
  for(const scenario of ['ready','http','incomplete','error','timeout']){
    const logs=[];
    const run=runInNewContext('(async()=>{'+script+'})',{
      process:{env:{COMPANY_VIBE_LOCAL_MODEL:'local'}},console:{log:value=>logs.push(value)},
      AbortSignal:{timeout:ms=>{assert.equal(ms,120000);return 'warmup-budget';}},
      fetch:async(url,options)=>{
        assert.equal(url,'http://127.0.0.1:11434/api/generate');
        const body=JSON.parse(options.body);
        assert.equal(body.model,'local');assert.equal(body.prompt,'');assert.equal(body.options.num_ctx,8192);assert.equal(body.options.num_predict,0);
        if(scenario==='timeout')throw new Error('warmup timeout');
        return {ok:scenario!=='http',status:503,json:async()=>({done:scenario!=='incomplete',error:scenario==='error'?'model missing':undefined})};
      }
    });
    if(scenario==='ready')await run();else await assert.rejects(run(),/DESIGN_LOCAL_WARMUP|warmup timeout/);
    assert.equal(logs.length,scenario==='ready'?1:0);
  }
});

test('a local timeout preserves finished slices and resumes only the failed slice',async()=>{
  const source=design.slice(design.indexOf('async function runCheckpointTask('),design.indexOf('function isParallelPressure('));
  const checkpoint={tasks:{'designer_draft_slices::identity-core':{identity:'4v4 infection'}}};
  let saves=0,calls=0;
  const run=runInNewContext(source+'\nrunCheckpointTask',{designCheckpoint:checkpoint,persistDesignCheckpoint:()=>saves++,console:{log(){}},clean:String});
  assert.equal((await run('designer_draft_slices','identity-core',()=>{throw new Error('must not replay');})).identity,'4v4 infection');
  await assert.rejects(run('designer_draft_slices','systems-progression',async()=>{calls++;throw new Error('OLLAMA_DESIGN_TIMEOUT 300000ms');}),/OLLAMA_DESIGN_TIMEOUT/);
  assert.equal(checkpoint.failedTask,'systems-progression');
  assert.equal(Object.keys(checkpoint.tasks).length,1);
  await run('designer_draft_slices','systems-progression',async()=>{calls++;return {progression:'preserved'};});
  assert.equal(calls,2);assert.equal(saves,2);assert.equal(checkpoint.failedTask,null);
  assert.equal(checkpoint.tasks['designer_draft_slices::identity-core'].identity,'4v4 infection');
  assert.match(design,/81b77ec5e350f8737109235df27ddb3a375a99cf53bfce58e356fcdea285920b/);
});

test('PRE_GATE_BLOCKED resume regenerates only targeted repair checkpoints',()=>{
  assert.match(design,/const priorCheckpointStatus=clean\(designCheckpoint\?\.status\)\.toUpperCase\(\)/);
  assert.match(design,/priorCheckpointStatus==='PRE_GATE_BLOCKED'/);
  for(const phase of [
    'designer_pre_gate_repair_1',
    'deterministic_pre_gate_after_repair_1',
    'designer_pre_gate_repair_2',
    'deterministic_pre_gate_after_repair_2'
  ]) assert.match(design,new RegExp(phase));
  assert.match(design,/delete designCheckpoint\.phases\[phase\]/);
  assert.match(design,/preGateRepairGeneration=Math\.max\(0,Number\(designCheckpoint\.preGateRepairGeneration\|\|0\)\)\+1/);
  assert.match(design,/DESIGN_PRE_GATE_REPAIR_RETRY_GENERATION=/);
  assert.match(design,/fullCycleRestart=NO/);
  assert.match(design,/Object\.prototype\.hasOwnProperty\.call\(designCheckpoint\.phases\|\|\{\},'designer_draft'\)/);
});

test('blocked resume preserves the current designer draft and gate threshold',()=>{
  const start=design.indexOf("if(priorCheckpointStatus==='PRE_GATE_BLOCKED'");
  const end=design.indexOf('const PROGRESS_STAGE_ORDER=',start);
  assert.ok(start>0&&end>start);
  const section=design.slice(start,end);
  assert.doesNotMatch(section,/delete designCheckpoint\.phases\.designer_draft/);
  assert.doesNotMatch(section,/designCheckpoint\.phases\s*=\s*\{\}/);
  assert.doesNotMatch(section,/DESIGN_GATE_PASS_MINIMUM\s*=/);
  assert.match(design,/if\(!preGatePass\(preGate\)\)[\s\S]*status='PRE_GATE_BLOCKED'/);
});

test('current blocked checkpoint engine remains compatible with targeted resume migration',()=>{
  assert.match(design,/24c3c41118092b683ffd377cd948df67544a935d6871fa290e985263cf5f3c03/);
  assert.match(design,/checkpointV3CompatibleEngineMigrationEligible/);
  assert.match(design,/QUOTA_VIBE_REPAIR_COMPATIBLE_ENGINE_CHANGE_NO_REPLAY/);
});


test('design runtime replaces stale push work while preserving manual and scheduled continuation',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
  assert.match(workflow,/group: company-seed-design-runtime/);
  assert.match(workflow,/cancel-in-progress: \$\{\{ github\.event_name == 'push' \}\}/);
  assert.doesNotMatch(workflow,/cancel-in-progress: true/);
  assert.match(workflow,/push:[\s\S]*tools\/company-design-cycle\.mjs/);
  assert.match(workflow,/workflow_dispatch:/);
  assert.match(workflow,/schedule:/);
});


test('design authoring has no external model transport or secret injection',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
  assert.doesNotMatch(design,/generativelanguage|googleapis|callExternalDesignerModel|externalAiEnabled|process\.env\.GEMINI_API_KEY|async function callModel\(/);
  assert.doesNotMatch(workflow,/secrets\.GEMINI_API_KEY|COMPANY_EXTERNAL_AI_ENABLED:|COMPANY_GEMINI_/);
});

test('design always uses the internal model even if external credentials and opt-in are present',async()=>{
  const routing=design.slice(design.indexOf('async function callDesignerModel('),design.indexOf('async function generateDesignerDraft('));
  for(const localFails of [false,true]){
    const calls=[],checkpoint={};
    const call=runInNewContext(routing+'\ncallDesignerModel',{
      process:{env:{COMPANY_EXTERNAL_AI_ENABLED:'true',GEMINI_API_KEY:'test-only'}},
      designerRoute:{id:'ollama:local'},designCheckpoint:checkpoint,persistDesignCheckpoint(){},
      fetch:async()=>{throw new Error('external network forbidden');},
      callLocalDesignerModel:async()=>{calls.push('local');if(localFails)throw new Error('local unavailable');return {draft:'local'};}
    });
    if(localFails)await assert.rejects(call('system','user',{}),/local unavailable/);
    else assert.equal((await call('system','user',{})).draft,'local');
    assert.deepEqual(calls,['local']);
    assert.equal(checkpoint.effectiveDesignerProvider,localFails?undefined:'VIBE_LOCAL_OLLAMA');
    assert.equal(checkpoint.effectiveDesignerModel,localFails?undefined:'ollama:local');
  }
});

test('workflow authoring route ignores exhausted external reviewers and prepares the local provider',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
  const start=workflow.indexOf('      - name: Resolve local design authoring from the current checkpoint');
  const end=workflow.indexOf('      - name: Restore Vibe local design fallback cache',start);
  const step=workflow.slice(start,end);
  const script=step.split("<<'NODE' | tee /tmp/local-design-authoring.txt\n")[1]?.split('          NODE')[0].replace(/^          /gm,'');
  assert.ok(script);
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'optional-design-ai-'));
  try{
    const folder=path.join(root,'design','demo','2026-10-06');fs.mkdirSync(folder,{recursive:true});
    fs.writeFileSync(path.join(folder,'design-checkpoint.json'),JSON.stringify({currentPhase:'DEPARTMENT_REVIEWS',tasks:{},modelHealth:{'gemini:old':{lastError:'RESOURCE_EXHAUSTED'}},phases:{designer_draft:{identity:'preserved'}}}));
    const output=path.join(root,'output');
    const run=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd:root,encoding:'utf8',env:{...process.env,ARTBOOK_GAME_ID:'demo',ARTBOOK_DATE:'2026-10-06',GITHUB_OUTPUT:output,COMPANY_GEMINI_LEAD_MODELS:''}});
    assert.equal(run.status,0,run.stderr);
    assert.match(fs.readFileSync(output,'utf8'),/run_model_cycle=true\nquota_state=LOCAL_ONLY\nlocal_fallback_needed=true/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(folder,'design-checkpoint.json'),'utf8')).phases.designer_draft.identity,'preserved');
    assert.match(run.stdout,/DESIGN_AI_REVIEW_LANES=NONE/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
  assert.doesNotMatch(workflow,/WAITING_FOR_GEMINI_QUOTA|GEMINI_LEAD_MODELS|GEMINI_LEAD_FALLBACK_LANES|all_quota_blocked/);
  assert.match(workflow,/DESIGN_EXTERNAL_AI_ALLOWED=NO/);
});

test('design continuation dispatches canonical work without external quota or AI review approval',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
  const start=workflow.lastIndexOf("          echo 'DESIGN_EXTERNAL_AI_WAIT=DISABLED'");
  const end=workflow.indexOf("          echo 'DESIGN_GATE_REPAIR_LIMIT=UNLIMITED'",start);
  const script=workflow.slice(start,end).replace(/^          /gm,'');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-continuation-'));
  try{
    fs.writeFileSync(path.join(root,'gh'),'#!/bin/sh\nprintf "%s\\n" "$*" >> "$CALL_LOG"\n',{mode:0o755});
    const log=path.join(root,'calls');
    const run=spawnSync('bash',['-euo','pipefail','-c',script],{encoding:'utf8',env:{...process.env,PATH:root+path.delimiter+process.env.PATH,pending:'1',active_other:'0',GITHUB_REPOSITORY:'fixture/demo',CALL_LOG:log}});
    assert.equal(run.status,0,run.stderr);
    const calls=fs.readFileSync(log,'utf8').trim().split('\n');
    assert.deepEqual(calls,['workflow run company-game-seed-bootstrap.yml --repo fixture/demo --ref main','workflow run company-seed-design-runtime.yml --repo fixture/demo --ref main']);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('design persistence shell parses its target-seed merge heredoc',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
  const start=workflow.indexOf('      - name: Persist validated design evidence to company runtime branch');
  const end=workflow.indexOf('      - name:',start+1);
  const step=workflow.slice(start,end<0?undefined:end);
  const script=step.split('        run: |\n')[1]?.replace(/^          /gm,'').replace(/\$\{\{[\s\S]*?\}\}/g,'fixture');
  assert.ok(script);
  const result=spawnSync('bash',['-n'],{input:script,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
});

test('seed scheduler prioritizes valid resumable checkpoints within the existing platform order',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
  assert.match(workflow,/const checkpointResumePriority=seed=>/);
  assert.match(workflow,/design-checkpoint\.json/);
  assert.match(workflow,/checkpoint\.updatedAt\|\|checkpoint\.lastSuccessfulModelCallAt\|\|checkpoint\.createdAt/);
  assert.match(workflow,/if\(checkpointAt&&checkpointAt<resetAt\)continue/);
  assert.match(workflow,/if\(!checkpointAt&&date<=resetDate\)continue/);
  assert.match(workflow,/\['COMPLETE','PASS','DONE','DESIGN_BASELINE_READY'\]\.includes\(status\)/);
  const sort=workflow.match(/const pending=eligible\.filter\(seed=>designEvolutionDueFor\(seed\)\.due\)\.sort\(\(a,b\)=>[\s\S]*?\)\.slice\(0,preservationOnly\?1:designWipMax\);/)?.[0]||'';
  assert.match(sort,/Number\(strictPassFor\(a\)\)-Number\(strictPassFor\(b\)\)[\s\S]*platformPriority\(a\)-platformPriority\(b\)[\s\S]*checkpointResumePriority\(a\)-checkpointResumePriority\(b\)/);
  assert.match(workflow,/designEvolutionDueFor/);
  assert.match(workflow,/PERIODIC_DEEP_HEALTH_REVIEW/);
});


// 실제 라이브러리 사실이 컨셉 단계와 모델 요청에 전달되는지 검증한다.
test('design library facts preserve compatibility and separate audit scores from runtime verification',async()=>{
  const source=design.slice(design.indexOf("const designAssetLibraryPath="),design.indexOf('const designLearningEvents='));
  const library={version:1,assets:[
    {id:'web-character',family:'CHARACTER',role:'PLAYER',platform:'WEB',targetPlatforms:['WEB'],license:'project-original',internalAuditScore:900},
    {id:'reference-environment',family:'ENVIRONMENT',role:'SCHOOL',platform:'SHARED_REFERENCE',license:'project-original',referenceVisualAudit:{referenceUseOnly:true}},
    {id:'blocked-creature',family:'CREATURE',platform:'WEB',license:'project-original',securityBlocked:true,internalAuditScore:1000,consumerGameIds:['g']}
  ]};
  const build=registry=>runInNewContext(source+'\ndesignAssetLibraryContext',{
    readJson:()=>registry,fs:{existsSync:()=>Boolean(registry),readFileSync:()=>JSON.stringify(registry)},createHash,
    gameId:'g',seed:{DISTINCT_IDENTITY:'concept'},seedFlowAssetRequirements:[{family:'CHARACTER',role:'PLAYER'},{family:'ENVIRONMENT',role:'SCHOOL'},{family:'CREATURE',role:'GHOST'}],
    clean:value=>String(value??'').trim(),uniq:values=>[...new Set(values.filter(Boolean))],buildAllGameDynamicLibraryBindingPlan,buildAssetSupplyDecisionSummary
  });
  const before=JSON.stringify(library),context=build(library);
  const web=context.platforms.WEB.candidates.find(row=>row.assetId==='web-character');
  assert.equal(web.applicationMode,'USE_AS_IS');
  assert.equal(context.assetFacts[web.assetId].auditScore,900);assert.equal(context.assetFacts[web.assetId].productionVerified,false);assert.equal(context.assetFacts[web.assetId].runtimeState,'UNVERIFIED');
  assert.equal(context.platforms.ROBLOX.candidates.find(row=>row.assetId==='web-character').applicationMode,'NATIVE_REAUTHOR_BASE');
  assert.equal(context.assetFacts['reference-environment'].referenceOnly,true);
  assert.equal(context.platforms.WEB.candidates.find(row=>row.family==='CREATURE').action,'AUTHOR');
  assert.equal(context.platforms.WEB.evaluatedAssetCount,3);assert.equal(context.platforms.WEB.eligibleAssetCount,2);
  assert.equal(JSON.stringify(library),before,'design reads must not synchronize or mutate the registry');
  library.version=2;library.assets[0].internalAuditScore=700;
  const refreshed=build(library);
  assert.notEqual(refreshed.sha256,context.sha256);assert.equal(refreshed.version,2);
  assert.equal(build(null).status,'UNAVAILABLE');assert.equal(build(null).platforms.WEB.candidates.length,0);
  assert.equal(build({assets:{}}).status,'UNAVAILABLE');

  const authorSource=design.slice(design.indexOf('async function callLocalDesignerModel('),design.indexOf('async function callDesignerModel('));
  let sent='';
  const author=runInNewContext(authorSource+'\ncallLocalDesignerModel',{
    createHash,designAssetLibraryContext:context,localDesignerFallbackReady:true,localDesignerCallTimeoutMs:300000,localDesignerModel:'local',
    designerRoute:{id:'ollama:local'},designCheckpoint:{},modelCallStats:[],console:{log(){}},
    requestLocalDesignerRaw:async prompt=>{sent=prompt;return '{"identity":"authored"}';},
    parseJsonObject:JSON.parse,normalizeSchemaValue:value=>value,assertSchemaValue(){},recordModelHealth(){},persistDesignCheckpoint(){}
  });
  await author('system','x'.repeat(30000),{});
  const payload=JSON.parse(sent.split('DESIGN_ASSET_LIBRARY=')[1].split('\n')[0]);
  assert.deepEqual(payload,JSON.parse(JSON.stringify(context)),'library evidence must not be clipped by shared context');
  assert.match(sent,/점수는 내부 평가이며 런타임 품질 통과가 아니다/);
  assert.match(sent,/게임당 설계 원본은 하나/);
});

// 생성 실패 복구와 동일 입력 체크포인트 재사용만 검증한다.
test('local timeout subdivides required fields and never swallows an atomic timeout',async()=>{
  const source=design.slice(design.indexOf('async function callLocalDesignerModel('),design.indexOf('async function callDesignerModel('));
  const taskSource=design.slice(design.indexOf('async function runCheckpointTask('),design.indexOf('function isParallelPressure('));
  const schema={type:'object',required:['a','b'],properties:{a:{type:'string'},b:{type:'string'}},additionalProperties:false};
  const checkpoint={tasks:{}},calls=[];
  let atomicFails=true;
  const author=runInNewContext(taskSource+'\n'+source+'\ncallLocalDesignerModel',{
    createHash,designAssetLibraryContext:{sha256:'library'},localDesignerFallbackReady:true,localDesignerCallTimeoutMs:300000,localDesignerModel:'local',
    designerRoute:{id:'ollama:local'},designCheckpoint:checkpoint,modelCallStats:[],console:{log(){}},clean:String,
    parseJsonObject:JSON.parse,normalizeSchemaValue:value=>value,assertSchemaValue:assertDesignSchema,recordModelHealth(){},persistDesignCheckpoint(){},
    requestLocalDesignerRaw:async(prompt,{schema:contract})=>{
      const fields=Object.keys(contract.properties);calls.push(fields.join(','));
      if(fields.length>1||fields[0]==='b'&&atomicFails)throw new Error('OLLAMA_DESIGN_TIMEOUT 300000ms');
      return JSON.stringify(Object.fromEntries(fields.map(field=>[field,field+' complete'])));
    }
  });
  await assert.rejects(author('system','brief',schema),/OLLAMA_DESIGN_TIMEOUT/);
  assert.equal(Object.keys(checkpoint.tasks).length,1);
  atomicFails=false;
  assert.deepEqual(JSON.parse(JSON.stringify(await author('system','brief',schema))),{a:'a complete',b:'b complete'});
  assert.deepEqual(calls,['a,b','a','b','b'],'completed fields and failed oversized parent are not replayed');
  calls.length=0;
  await author('system','different request',schema,{recoverOversized:true});
  assert.deepEqual(calls,['a','b'],'a persisted oversized timeout starts with smaller requests');
});

test('nested alternatives are checkpointed as distinct complete items before oversized generation',async()=>{
  const source=design.slice(design.indexOf('async function callLocalDesignerModel('),design.indexOf('async function callDesignerModel('));
  const taskSource=design.slice(design.indexOf('async function runCheckpointTask('),design.indexOf('function isParallelPressure('));
  const fields=['label',...Array.from({length:8},(_,i)=>'detail'+i)];
  const item={type:'object',required:fields,properties:Object.fromEntries(fields.map(field=>[field,field==='label'?{type:'string',enum:['PLAN_A','PLAN_B','PLAN_C']}:{type:'string'}])),additionalProperties:false};
  const schema={type:'object',required:['designAlternatives'],properties:{designAlternatives:{type:'array',minItems:2,maxItems:3,items:item}},additionalProperties:false};
  const checkpoint={tasks:{}},calls=[];
  let failSecond=true;
  const author=runInNewContext(taskSource+'\n'+source+'\ncallLocalDesignerModel',{
    createHash,designAssetLibraryContext:{sha256:'library'},localDesignerFallbackReady:true,localDesignerCallTimeoutMs:300000,localDesignerModel:'local',
    designerRoute:{id:'ollama:local'},designCheckpoint:checkpoint,modelCallStats:[],console:{log(){}},clean:String,
    parseJsonObject:JSON.parse,normalizeSchemaValue:value=>value,assertSchemaValue:assertDesignSchema,recordModelHealth(){},persistDesignCheckpoint(){},
    requestLocalDesignerRaw:async(prompt,{schema:contract})=>{
      const props=contract.properties;calls.push({prompt,fields:Object.keys(props)});
      assert.ok(Object.keys(props).length<=6);
      assert.equal(props.designAlternatives,undefined,'array wrapper never goes to the model');
      if(props.label?.enum?.[0]==='PLAN_B'&&failSecond){failSecond=false;throw new Error('OLLAMA_DESIGN_HTTP_503');}
      return JSON.stringify(Object.fromEntries(Object.entries(props).map(([key,value])=>[key,value.enum?.[0]||key+' authored'])));
    }
  });
  await assert.rejects(author('system','brief',schema),/OLLAMA_DESIGN_HTTP_503/);
  const planACalls=calls.filter(x=>x.prompt.includes('designAlternatives[0]')).length;
  const result=await author('system','brief',schema);
  assert.deepEqual(Array.from(result.designAlternatives,x=>x.label),['PLAN_A','PLAN_B']);
  assert.ok(result.designAlternatives.every(row=>fields.every(field=>typeof row[field]==='string')));
  assert.equal(calls.filter(x=>x.prompt.includes('designAlternatives[0]')).length,planACalls);
  assert.ok(calls.some(x=>x.prompt.includes('PREVIOUS_ARRAY_ITEMS=[{"label":"PLAN_A"')),'next alternative sees the authored previous plan');
});

test('slice input keeps the owner original in a stable prefix and omits compatibility-only seed duplication',async()=>{
  const source=design.slice(design.indexOf('async function authorDesignInCheckpointedSlices('),design.indexOf('function mergeDesignerDesign('));
  const calls=[];
  const author=runInNewContext(source+'\nauthorDesignInCheckpointedSlices',{
    ownerPreservationDesign:false,designAssetLibrary:null,playableRequirements:designPlayabilityRequirements({}),currentRuleSourceContext:{},currentRuleSource:"",designAssetFamilies:[],
    seed:{designInputMode:'OWNER_BRIEF_AND_ORIGINAL_ONLY'},seedDesignDepthContext:{duplicate:'x'.repeat(9000)},
    clip:(value,n)=>{const s=typeof value==='string'?value:JSON.stringify(value);return s.slice(0,n);},
    DESIGN_AUTHORING_SLICES:[{id:'first',fields:['identity'],predict:1200},{id:'second',fields:['coreFun'],predict:1200}],
    designSliceSchema:fields=>({properties:Object.fromEntries(fields.map(field=>[field,{}]))}),repairStructureContract:fields=>fields,
    designCheckpoint:{tasks:{},failedTask:'second',lastError:'OLLAMA_DESIGN_TIMEOUT 300000ms'},
    createHash,validateDesignAuthoringContent,persistDesignCheckpoint(){},
    runCheckpointTask:async(phase,id,work)=>work(),callDesignerModel:async(system,user,schema,options)=>{
      calls.push({user,options});return Object.fromEntries(Object.keys(schema.properties).map(field=>[field,'authored']));
    },repairDesignRequiredFields:value=>({value}),factPack:{},enforceOwnerPreservationDesign:value=>value,assertSchemaValue:assertDesignSchema,DESIGN:{},console:{log(){}}
  });
  const original='OWNER_ORIGINAL_DESIGN_INPUT='+JSON.stringify({locked:'4v4 infection',source:'original'});
  const result=await author({phase:'designer_draft',system:'system',sharedContext:original});
  assert.equal(result.coreFun,'authored');
  assert.ok(calls.every(x=>x.user.startsWith('SHARED_CONTEXT='+original)));
  assert.ok(calls.every(x=>!x.user.includes('GAME_SEED_DESIGN_DEPTH=')));
  assert.equal(calls[1].options.recoverOversized,true);
  assert.ok(calls[1].user.includes('"identity":"authored"'),'later work keeps prior authored continuity');
});

// 실제 초안에서 확인된 잘못된 내용이 저장 성공만으로 통과하지 않게 한다.
test('authoring rejects observed multiplayer, platform, placeholder and duplicated-plan defects',()=>{
  const plan={label:'PLAN_A',coreLoopShift:'같은 추격 행동과 같은 판정',mapTopologyRegionRoles:'학교와 병원을 같은 방식으로 순환',enemyEcosystemCounterplay:'같은 공격과 같은 대응',progressionEconomy:'같은 보상과 같은 해금'};
  const draft={multiplayerMode:'SINGLE',platformProfiles:{UNITY:{internalReleaseTarget:'OPEN_CLOUD_PRIVATE_OR_RESTRICTED_TEST_EXPERIENCE',validationEvidence:'Exact Rojo artifact identity'}},webCanonicalDesign:{worldAndTraversal:'WEB_2_5D_HORROR_ESCAPE_ROOM'},designAlternatives:[plan,{...plan,label:'PLAN_B'}]};
  const reasons=validateDesignAuthoringContent({design:draft,seed:{MULTIPLAYER_DESIGN_MODE:'COMPETITIVE'}});
  for(const code of ['DESIGN_MULTIPLAYER_CONTRADICTION','DESIGN_PLATFORM_NATIVE_CONTRADICTION','DESIGN_PLACEHOLDER_CONTENT','DESIGN_ALTERNATIVES_DUPLICATED'])assert.ok(reasons.some(row=>row.code===code),code);
  const scored=scoreDesignGateV2({seed:{MULTIPLAYER_DESIGN_MODE:'COMPETITIVE'},designRecord:{content:draft}});
  for(const row of reasons)assert.ok(scored.hardFailures.includes(row.code));
  assert.ok(reasons.every(row=>row.fields.length&&row.bypassAllowed===false));
});

test('preservation trace identifiers stay valid while their evidence must still be prose',()=>{
  const implementationTraceability=['ASSET_ADAPTATION','LIVING_MOTION_AND_ANIMATION_FEEL','VFX_AUDIO_CAMERA_POLISH_MOBILE'].map(designElement=>({designElement,responsibleSystem:'기존 표현과 상태 이벤트 책임 함수',validationEvidence:'같은 입력에서 게임 상태를 유지하며 실제 렌더링 결과를 비교한다.'}));
  assert.deepEqual(validateDesignAuthoringContent({design:{implementationTraceability}}),[]);
  implementationTraceability[0].validationEvidence='WEB_UNVERIFIED_PLACEHOLDER';
  assert.ok(validateDesignAuthoringContent({design:{implementationTraceability}}).some(row=>row.code==='DESIGN_PLACEHOLDER_CONTENT'));
});

test('one complete playthrough preserves state continuity and needs duration evidence',()=>{
  const states=['배정된 인간과 몬스터가 각 출발 지점에서 준비한다','첫 추격을 마치고 감염으로 양쪽 인원 구성이 바뀌었다','남은 인간과 몬스터가 마지막 정화와 감염 기회를 겨룬다','승패 또는 제한시간 종료 결과를 확인하고 다음 라운드를 준비한다'];
  const playthrough=['OPENING','DEVELOPMENT','RESOLUTION'].map((phase,index)=>({phase,entryState:states[index],playerChoice:'주변의 동료와 추격자의 위치를 보고 이동 경로를 고른다',actionAndResponse:'원본 도구 조건을 확인한 뒤 입력하고 서버 판정과 적의 대응을 확인한다',exitState:states[index+1],nextDecision:'바뀐 인원과 도구 상태를 보고 다음 경로 또는 재시도를 선택한다'}));
  const selectedDesignPlan={label:'PLAN_A',playthrough,durationRationale:'기존 240초 제한은 보존한다. 첫 접촉, 인원 변화, 결판에 필요한 시간을 실제 실행에서 확인하고 여러 라운드의 세션 길이와 구분한다.'};
  assert.deepEqual(validateDesignAuthoringContent({design:{selectedDesignPlan}}),[]);
  const broken=structuredClone(selectedDesignPlan);broken.playthrough[1].entryState='앞 장면과 관계없는 새 라운드의 처음 상태로 돌아간다';
  assert.ok(validateDesignAuthoringContent({design:{selectedDesignPlan:broken}}).some(row=>row.code==='DESIGN_PLAYTHROUGH_DISCONNECTED'));
  delete broken.playthrough;
  assert.ok(validateDesignAuthoringContent({design:{selectedDesignPlan:broken}}).some(row=>row.code==='DESIGN_PLAYTHROUGH_MISSING'));
});

test('role-grounded asset selection beats an unrelated higher score without granting runtime verification',()=>{
  const registry={assets:[
    {id:'bed',family:'MOTION',role:'BED_LIE_DOWN',platform:'ROBLOX',license:'project-original',internalAuditScore:999},
    {id:'walk',family:'MOTION',role:'WALK',platform:'ROBLOX',license:'project-original',internalAuditScore:10}
  ]};
  const explicit=buildAssetSupplyDecisionSummary({gameId:'g',target:'ROBLOX',requirements:[{family:'MOTION',role:'WALK'}],registry});
  assert.equal(explicit.nextActions[0].assetId,'walk');
  assert.deepEqual([...explicit.nextActions[0].roleEvidence.matchedRoles],['walk']);
  assert.equal(explicit.runtimeVerificationGranted,false);
  const unknown=buildAssetSupplyDecisionSummary({gameId:'g',target:'ROBLOX',requirements:[{family:'MOTION'}],registry});
  assert.equal(unknown.nextActions[0].action,'HOLD');
  assert.equal(unknown.nextActions[0].reason,'ROLE_REQUIREMENT_UNRESOLVED');
  const missing=buildAssetSupplyDecisionSummary({gameId:'g',target:'ROBLOX',requirements:[{family:'MOTION',role:'RUN'}],registry});
  assert.equal(missing.nextActions[0].action,'AUTHOR');
  const current=buildAssetSupplyDecisionSummary({gameId:'g',target:'ROBLOX',requirements:[{family:'MOTION'}],registry:{assets:[{...registry.assets[0],consumerGameIds:['g']} ]}});
  assert.equal(current.nextActions[0].assetId,'bed','existing consumers remain reusable and quality work is not globally stopped');
});

test('bad cached slices refresh nested identities across retries and valid results are reused',async()=>{
  const source=design.slice(design.indexOf('async function authorDesignInCheckpointedSlices('),design.indexOf('function mergeDesignerDesign('));
  const checkpoint={tasks:{'designer_draft_slices::mode':{multiplayerMode:'SINGLE'}}};
  let calls=0;
  const localParts=new Map();
  const author=runInNewContext(source+'\nauthorDesignInCheckpointedSlices',{
    ownerPreservationDesign:false,designAssetLibrary:null,playableRequirements:designPlayabilityRequirements({}),currentRuleSourceContext:{},currentRuleSource:"",designAssetFamilies:[],
    seed:{MULTIPLAYER_DESIGN_MODE:'COMPETITIVE'},seedDesignDepthContext:{},createHash,validateDesignAuthoringContent,
    clip:(value,n)=>JSON.stringify(value).slice(0,n),clean:value=>String(value),
    DESIGN_AUTHORING_SLICES:[{id:'mode',fields:['multiplayerMode'],predict:900}],designSliceSchema:()=>({type:'object',required:['multiplayerMode'],properties:{multiplayerMode:{type:'string'}},additionalProperties:false}),
    repairStructureContract:()=>[],designCheckpoint:checkpoint,persistDesignCheckpoint(){},
    runCheckpointTask:async(phase,id,work)=>checkpoint.tasks[`${phase}::${id}`]??(checkpoint.tasks[`${phase}::${id}`]=await work()),
    callDesignerModel:async(system,user)=>{assert.match(user,/DESIGN_MULTIPLAYER_CONTRADICTION/);if(!localParts.has(user)){calls++;localParts.set(user,{multiplayerMode:calls===1?'SINGLE':'COMPETITIVE'});}return localParts.get(user);},
    repairDesignRequiredFields:value=>({value}),factPack:{},enforceOwnerPreservationDesign:value=>value,assertSchemaValue:assertDesignSchema,DESIGN:{},console:{log(){}}
  });
  await assert.rejects(author({phase:'designer_draft',system:'s',sharedContext:'c'}),/DESIGN_CONTENT_REPAIR_REQUIRED/);
  assert.equal(checkpoint.sliceRepairAttempts['designer_draft_slices::mode'],2);
  assert.equal((await author({phase:'designer_draft',system:'s',sharedContext:'c'})).multiplayerMode,'COMPETITIVE');
  assert.equal((await author({phase:'designer_draft',system:'s',sharedContext:'c'})).multiplayerMode,'COMPETITIVE');
  assert.equal(calls,2);
  assert.equal(Object.keys(checkpoint.sliceRepairFeedback).length,0);
});

test('transport repair reuses previous drafts only when every original input still matches',()=>{
  const source=design.slice(design.indexOf('const checkpointV3CompatibleEngineMigrationEligible='),design.indexOf('if(!checkpointReusable'));
  const oldEngine='cc088ad7a8676ded2864387d1c00a39b024f9e9a4e72f50308346406aea805a9';
  const checkpointInputContext={gameId:'g',date:'d',seed:{seedId:'s'},evidence:{librarySha:'unchanged'},policyDigest:'p',engineDigest:'new-engine'};
  const fingerprint=createHash('sha256').update(JSON.stringify({...checkpointInputContext,engineDigest:oldEngine})).digest('hex');
  const cp={contractVersion:4,gameId:'g',date:'d',seedId:'s',policyDigest:'p',engineDigest:oldEngine,fingerprint,phases:{},tasks:{identity:'authored'},modelHealth:{}};
  const eligible=context=>runInNewContext(source+'\ncheckpointV3CompatibleEngineMigrationEligible',{
    designCheckpoint:cp,checkpointInputContext:context,DESIGN_CHECKPOINT_CONTRACT_VERSION:4,gameId:'g',date:'d',seed:{seedId:'s'},policyDigest:'p',checkpointCompatibleEngineDigests:new Set(),clean:String,createHash
  });
  assert.equal(Boolean(eligible(checkpointInputContext)),true);
  assert.equal(Boolean(eligible({...checkpointInputContext,evidence:{librarySha:'changed'}})),false);
  assert.equal(Boolean(eligible({...checkpointInputContext,seed:{seedId:'s',newOwnerRequest:'changed'}})),false);
});

// 플레이 계약 회귀: 아래 데이터는 검사기 전용 합성 사례이며 실제 게임 설계/런타임 증거가 아니다.
function playableFixture(){
  const seed={INITIAL_PLAY_MODE:'FOUR_VS_FOUR_INFECTION_WITH_AI_FILL',originalDesignContext:{content:{technicalAssumptions:['TargetPopulation=8','SurvivorSlots=4','MonsterSlots=4','RoundSeconds=240','InfectRange=8','InfectAttackCost=30','InfectAttackCooldown=1.2','PurifyDistance=8','PurifyCooldown=5']}}};
  const keys=['HumanCount','MonsterCount','EliminatedCount','Energy'];
  const signatureSystems=['MAIN','A','B','c','DELVE'].map(grammarRole=>({id:grammarRole,grammarRole,name:`상태 규칙 ${grammarRole}`,purpose:'장면의 선택이 다음 장면의 인원과 자원 상태를 바꾼다',playerChoice:'상대 위치를 확인하고 소비와 이동의 순서를 선택한다',stateInputs:keys,stateOutputs:keys}));
  const ability=(id,kind,cost,cooldownSeconds)=>({id,name:id,kind,ownerId:'BASE',ruleId:'MAIN',trigger:'현재 진영과 자원 조건을 만족할 때 명시적으로 입력한다',range:8,rangeUnit:'stud',resource:'Energy',cost,cooldownSeconds,telegraph:'공격 방향을 먼저 보고 옆 복도로 진입해 피한다',avoidance:'전조가 보이면 사거리 밖으로 이동하고 대기한다',effect:'서버 적중 판정이 나면 해당 상대의 진영 상태를 바꾼다',stateInputs:keys,stateOutputs:keys,source:'검사 전용 원본 technicalAssumptions의 수치를 사용한다',rangeKey:kind==='INFECTION'?'InfectRange':'PurifyDistance',costKey:kind==='INFECTION'?'InfectAttackCost':'',cooldownKey:kind==='INFECTION'?'InfectAttackCooldown':'PurifyCooldown'});
  const abilities=[ability('infect','INFECTION',30,1.2),ability('purify','PURIFICATION',35,5)];
  const participants=[...Array.from({length:4},(_,i)=>({id:`h${i+1}`,role:'HUMAN',classId:'HUMAN'})),...Array.from({length:4},(_,i)=>({id:`m${i+1}`,role:'MONSTER',classId:'MONSTER'}))];
  const action=(abilityId,actorId,targetId,atSeconds,hit=true)=>({abilityId,actorId,targetId,atSeconds,distance:7,energyBefore:100,energyAfter:abilityId==='infect'?70:65,hit,response:'상대는 복도 모퉁이를 돌아 사거리 밖으로 이탈하려 한다'});
  const values=[[4,4,0],[4,4,0],[4,4,0],[3,5,0],[2,6,0],[2,5,1],[0,7,1]];
  const times=[0,10,30,50,80,120,200],texts=values.map((x,i)=>`장면 ${i}에서 인간 ${x[0]}명과 몬스터 ${x[1]}명이 남아 다음 선택을 준비한다`);
  const actions=[[],[action('infect','m1','h1',20,false)],[action('infect','m1','h1',40)],[action('infect','m2','h2',70)],[action('purify','h3','m1',100)],[action('infect','m2','h3',170),action('infect','m3','h4',180)]];
  const playthrough=designPlayabilityRequirements(seed).phases.map((phase,i)=>({phase,entryState:texts[i],playerChoice:'상대의 진영과 남은 능력을 확인하고 이동한다',actionAndResponse:'발동 조건과 사거리를 확인하고 상대의 회피에 대응한다',exitState:texts[i+1],nextDecision:'다음 장면에서 바뀐 진영과 남은 경로를 다시 확인한다',startSeconds:times[i],endSeconds:times[i+1],timeReason:'이동과 조우 뒤 재사용 대기를 포함한 검사 전용 장면 시간이다',before:values[i].map((value,j)=>({key:keys[j],value})),after:values[i+1].map((value,j)=>({key:keys[j],value})),actions:actions[i],ruleIds:['MAIN'],outcome:i===5?'MONSTER_WIN':'ONGOING'}));
  const strategy={routeEdges:[{from:'north',to:'south'}],resourceSites:[{stateKey:'Energy',regionId:'north'}],cooperation:[{ruleId:'A',regionId:'north',abilityId:'infect'}],advantage:'북쪽 자원에서 시작하여 합류 전에 충전을 확보한다',cost:'반대쪽 경로에 있는 동료의 합류를 기다려야 한다',bestSituation:'상대가 반대쪽에 집중돼 북쪽 자원이 비어 있을 때'};
  const design={signatureSystems,systemInterconnections:signatureSystems.map((row,i)=>({fromId:row.id,toId:signatureSystems[(i+1)%5].id,stateKeys:keys,fromSystem:'앞 장면을 처리하는 역할 상태 책임 시스템',toSystem:'다음 장면의 선택을 처리하는 역할 상태 시스템',trigger:'참가자의 현재 상태가 바뀌었을 때 다음 역할이 읽는다',stateChange:'인원과 자원 값이 다음 시스템의 유효 선택에 반영된다'})),contentVarietyPlan:{regions:[{id:'north',ruleIds:['A']},{id:'south',ruleIds:['B']}],abilities,roleTransitions:[]},designAlternatives:[{label:'PLAN_A',strategy,coreLoopShift:'북쪽 진입',mapTopologyRegionRoles:'북쪽 회전'},{label:'PLAN_B',strategy:{...strategy,routeEdges:[{from:'south',to:'north'}],resourceSites:[{stateKey:'Energy',regionId:'south'}]},coreLoopShift:'남쪽 진입',mapTopologyRegionRoles:'남쪽 회전'}],selectedDesignPlan:{label:'PLAN_A',participants,roundSeconds:240,sessionSeconds:1200,durationRationale:'원본의 240초 제한을 유지하고 여러 라운드로 구성한 전체 세션 시간과 구분한다',playthrough},artAudioDirection:{assetBindings:[{family:'CREATURE',role:'WEREWOLF',bodyPlan:'두 발로 추격하는 긴 팔의 늑대 체형',behavior:'복도에서 방향을 바꾸며 추격하는 행동',presentation:'돌진 방향과 종료를 읽을 수 있는 전조',ruleIds:['MAIN'],useLocation:'첫 접촉과 역전 장면의 북쪽 복도',assetId:'wolf',decision:'ADAPT',selectionReason:'추격 동작과 늑대 체형을 모두 제공하는 후보',improvement:'복도 조명에서 공격 전조를 더 구분되게 개선',platformAdaptation:'각 플랫폼의 원본 권한 이벤트에 표현만 연결',validation:'같은 사건에서 체형과 공격 전조가 읽히는지 확인'}]},designIntegrityPlan:{authoringVersion:2,flowAudit:playthrough.map((step,i)=>({phase:step.phase,reachableBy:['infect','purify'],blockedCase:'자원이 모자라면 즉시 공격을 사용할 수 없다',recovery:'엄폐 뒤 자원 회복을 기다리고 다른 경로로 합류한다',nextPhase:playthrough[i+1]?.phase||'END'}))}};
  return {seed,design,requirePlayableContract:true,assetLibrary:{assets:[{id:'wolf',family:'CREATURE',role:'WEREWOLF'}]}};
}

test('playable contract replays one infection round without changing original numbers',()=>{
  const fixture=playableFixture();
  assert.deepEqual(validateDesignAuthoringContent(fixture),[]);
  for(const [change,code] of [
    [d=>d.selectedDesignPlan.playthrough[3].before[0].value=4,'DESIGN_STATE_TRACE_BROKEN'],
    [d=>d.selectedDesignPlan.playthrough[2].actions[0].energyBefore=10,'DESIGN_ACTION_INFEASIBLE'],
    [d=>d.selectedDesignPlan.playthrough[2].actions[0].distance=20,'DESIGN_ACTION_INFEASIBLE'],
    [d=>d.selectedDesignPlan.playthrough[3].actions[0].targetId='h1','DESIGN_ROLE_ACTION_INVALID'],
    [d=>d.selectedDesignPlan.playthrough[5].actions[0].actorId='m1','DESIGN_ROLE_ACTION_INVALID'],
    [d=>d.selectedDesignPlan.playthrough[5].outcome='DRAW','DESIGN_ROUND_END_INVALID'],
    [d=>d.selectedDesignPlan.roundSeconds=200,'DESIGN_DURATION_UNGROUNDED'],
    [d=>d.contentVarietyPlan.abilities[0].cost=1,'DESIGN_ORIGINAL_NUMBER_CHANGED'],
    [d=>d.contentVarietyPlan.abilities[0].telegraph='','DESIGN_ABILITY_CONTRACT_MISSING'],
    [d=>d.systemInterconnections[0].stateKeys=['invented'],'DESIGN_STATE_EXCHANGE_BROKEN'],
    [d=>d.artAudioDirection.assetBindings[0].assetId='spider','DESIGN_ASSET_ROLE_MISMATCH'],
    [d=>d.designIntegrityPlan.flowAudit[2].recovery='','DESIGN_FULL_FLOW_AUDIT_MISSING']
  ]){
    const changed=structuredClone(fixture);change(changed.design);
    assert.ok(validateDesignAuthoringContent(changed).some(row=>row.code===code),code);
  }
});

test('paraphrased alternatives remain the same strategy and unknown identifiers cannot create novelty',()=>{
  const fixture=playableFixture(),plans=fixture.design.designAlternatives;
  plans[1].strategy=structuredClone(plans[0].strategy);
  plans[1].strategy.advantage='표현을 완전히 새롭게 써도 같은 관계를 반복한 전략이다';
  assert.ok(validateDesignAuthoringContent(fixture).some(row=>row.code==='DESIGN_STRATEGY_EQUIVALENT'));
  plans[1].strategy.routeEdges[0].to='invented-region';
  assert.ok(validateDesignAuthoringContent(fixture).some(row=>row.code==='DESIGN_STRATEGY_UNGROUNDED'));
});

test('every original human class needs its own human to infected ability connection',()=>{
  const fixture=playableFixture();
  fixture.seed.originalDesignContext.content.humanRoster=[{id:'BROADCAST',tool:'신호 송신기',infectedAbility:'가짜 경보'}];
  assert.ok(validateDesignAuthoringContent(fixture).some(row=>row.code==='DESIGN_ROLE_TRANSITION_MISSING'));
  const base=fixture.design.contentVarietyPlan.abilities[0];
  fixture.design.contentVarietyPlan.abilities.push({...base,id:'signal',name:'교란 송신',kind:'HUMAN',ownerId:'BROADCAST'},{...base,id:'alarm',name:'가짜 경보',kind:'INFECTED',ownerId:'BROADCAST'});
  fixture.design.contentVarietyPlan.roleTransitions=[{humanId:'BROADCAST',humanTool:'신호 송신기',humanAbilityId:'signal',infectedAbilityId:'alarm',retainedState:'같은 참가자 식별자와 직업 유래를 유지한다',removedState:'인간 전용 정화와 도구 입력은 더 이상 사용하지 않는다',changedChoice:'옛 동료의 이동 방향에 거짓 경보를 보내 추격한다'}];
  assert.equal(validateDesignAuthoringContent(fixture).some(row=>row.code==='DESIGN_ROLE_TRANSITION_MISSING'),false);
});

test('schema refuses string numbers and negative ability costs instead of treating them as valid',()=>{
  assert.throws(()=>assertDesignSchema('30',{type:'number',minimum:0}),/number mismatch/);
  assert.throws(()=>assertDesignSchema(-1,{type:'number',minimum:0}),/minimum mismatch/);
  assert.throws(()=>assertDesignSchema('true',{type:'boolean'}),/boolean mismatch/);
  assertDesignSchema(30,{type:'number',minimum:0});
});

test('current source fixes human and infected ability values without letting the writer rebalance them',()=>{
  const seed={INITIAL_PLAY_MODE:'INFECTION',originalDesignContext:{content:{humanRoster:[{id:'BROADCAST',tool:'신호 송신기',infectedAbility:'가짜 경보'}],monsterRoster:[{id:'MUMMY'}]}}};
  const source=`MonsterAbilityCooldown=7,AbilityCost=45,
HumanForms={
 {Id="BROADCAST",ActiveAbility="SIGNAL_JAM",InfectedAbility="FALSE_ALARM"},
},
MonsterForms={
 {Id="MUMMY",Ability="CURSE_SLOW"},
},
HumanAbilities={
 SIGNAL_JAM={Name="교란 송신",Cost=30,Cooldown=8,Radius=24},
},
InfectedAbilities={
 FALSE_ALARM={Name="가짜 경보",Radius=30,Duration=3},
},
MonsterAbilities={
 CURSE_SLOW={Name="저주의 모래",Radius=22,Duration=3},
},`;
  const facts=designPlayabilityRequirements(seed,source).abilityFacts;
  assert.deepEqual(facts.find(row=>row.id==='SIGNAL_JAM'),{id:'SIGNAL_JAM',kind:'HUMAN',ownerId:'BROADCAST',name:'교란 송신',range:24,cost:30,cooldownSeconds:8});
  assert.deepEqual(facts.find(row=>row.id==='FALSE_ALARM'),{id:'FALSE_ALARM',kind:'INFECTED',ownerId:'BROADCAST',name:'가짜 경보',range:30,cost:45,cooldownSeconds:7});
  assert.equal(facts.find(row=>row.id==='CURSE_SLOW').ownerId,'MUMMY');
  const fixture=playableFixture();fixture.sourceText=source;fixture.seed=seed;
  assert.ok(validateDesignAuthoringContent({...fixture,fields:['contentVarietyPlan']}).some(row=>row.code==='DESIGN_SOURCE_ABILITY_CHANGED'));
});

test('cooldown reuse, missing required asset family and unused matching assets fail closed',()=>{
  const fixture=playableFixture();
  fixture.design.selectedDesignPlan.playthrough[5].actions[1]={...fixture.design.selectedDesignPlan.playthrough[5].actions[1],actorId:'m2',atSeconds:170.5};
  assert.ok(validateDesignAuthoringContent(fixture).some(row=>row.code==='DESIGN_ACTION_INFEASIBLE'));
  fixture.assetFamilies=['CREATURE','MOTION'];
  assert.ok(validateDesignAuthoringContent(fixture).some(row=>row.code==='DESIGN_ASSET_FAMILY_MISSING'));
  fixture.design.artAudioDirection.assetBindings[0].decision='AUTHOR';
  fixture.design.artAudioDirection.assetBindings[0].assetId='';
  assert.ok(validateDesignAuthoringContent(fixture).some(row=>row.code==='DESIGN_ASSET_REUSE_NOT_EVALUATED'));
});

test('platform copy and embedded temporary prose are rejected where written',()=>{
  const reasons=validateDesignAuthoringContent({design:{platformProfiles:{UNITY:{inputModel:'ScreenGui 버튼으로 모바일 조작을 구성한다'}},webCanonicalDesign:{combatAndInteraction:'공격 대응 방식은 추후 작성하고 일단 이름만 표시한다'}}});
  assert.ok(reasons.some(row=>row.code==='DESIGN_PLATFORM_NATIVE_CONTRADICTION'));
  assert.ok(reasons.some(row=>row.code==='DESIGN_PLACEHOLDER_CONTENT'));
});

test('ability authoring applies infection-only instructions to infection games',()=>{
  const source=design.slice(design.indexOf('function repairStructureContract('),design.indexOf('function impactedRolesFromScores('));
  const requirementsFor=infection=>runInNewContext(source+'\nrepairStructureContract',{
    playableRequirements:{infection},seedGameplaySketchVersion:0
  })(['contentVarietyPlan']).join('\n');
  assert.doesNotMatch(requirementsFor(false),/기본 감염\/정화|roleTransitions|원본 이름 그대로의 감염 능력/);
  assert.match(requirementsFor(true),/기본 감염\/정화/);
  assert.match(requirementsFor(true),/roleTransitions/);
});

test('bound rule and ability identifiers are valid while identifier-only prose is rejected',()=>{
  const fixture=playableFixture();
  const rename={MAIN:'MAIN_INFECT_LOOP',infect:'INFECT_ATTACK_COMMAND',north:'SCHOOL_NORTH_CORRIDOR'};
  fixture.design=JSON.parse(JSON.stringify(fixture.design,(key,value)=>key!=='grammarRole'&&typeof value==='string'&&rename[value]?rename[value]:value));
  assert.deepEqual(validateDesignAuthoringContent(fixture),[]);
  fixture.design.contentVarietyPlan.abilities[0].trigger='INFECT_ATTACK_COMMAND';
  assert.ok(validateDesignAuthoringContent(fixture).some(row=>row.code==='DESIGN_PLACEHOLDER_CONTENT'&&row.evidence.path.endsWith('.trigger')));
});


