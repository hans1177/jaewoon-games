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

const design=fs.readFileSync('tools/company-design-cycle.mjs','utf8');

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
    createHash,localDesignerFallbackReady:true,localDesignerCallTimeoutMs:300000,localDesignerModel:'local',
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
    createHash,localDesignerFallbackReady:true,localDesignerCallTimeoutMs:300000,localDesignerModel:'local',
    designerRoute:{id:'ollama:local'},designCheckpoint:checkpoint,modelCallStats:stats,console:{log(){}},
    clean:String,parseJsonObject:JSON.parse,normalizeSchemaValue:value=>value,persistDesignCheckpoint(){},
    recordModelHealth:(model,row)=>health.push(row),
    assertSchemaValue:(value,contract)=>{for(const field of contract.required)assert.equal(typeof value[field],'string');},
    requestLocalDesignerRaw:async(prompt,{schema:contract})=>{
      const fields=Object.keys(contract.properties);calls.push(fields.join(','));
      if(fields.length===4)throw new Error('OLLAMA_DESIGN_OUTPUT_TRUNCATED');
      if(fields[0]==='c'&&secondPartFails){secondPartFails=false;throw new Error('OLLAMA_DESIGN_TIMEOUT 300000ms');}
      return JSON.stringify(Object.fromEntries(fields.map(field=>[field,'authored '+field])));
    }
  });
  await assert.rejects(author('system','owner brief',schema),/OLLAMA_DESIGN_TIMEOUT/);
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
