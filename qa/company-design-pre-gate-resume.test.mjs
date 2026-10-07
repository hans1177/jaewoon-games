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

const design=fs.readFileSync('tools/company-design-cycle.mjs','utf8');

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
  const end=design.indexOf("for(const [rawModel,row]",start);
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


test('Gemini daily quota quarantine precedes minute-rate retry handling',()=>{
  const dailyIndex=design.indexOf('if(status===429&&isDailyGeminiQuotaError(error))');
  const retryIndex=design.indexOf('const minuteRetryMs=geminiMinuteRetryDelayMs(error,candidateModel)',dailyIndex);
  const waitIndex=design.indexOf('GEMINI_RATE_LIMIT_WAIT=',retryIndex);
  assert.ok(dailyIndex>0&&retryIndex>dailyIndex&&waitIndex>retryIndex);
  assert.match(design,/GEMINI_DAILY_QUOTA_EXHAUSTED=.*retry=NO/);
  assert.match(design,/minuteRateRetries<2/);
  assert.match(design,/attempt-=1;\s*continue;/);
  assert.match(design,/2ee13c831a912a1446b625b0b30f5e2fd64a6acf6fa19754420ecde80b0abc5f/);
  assert.match(design,/84ba02b00c0f6c91c9731f1ecabc12b55accadd2f2673cabdf5badc742e64dbf/);
  assert.match(design,/9aae351acc02880ef280b371a21ead70b013c820010af4eeb88e23fe059d71b3/);
});


test('local design starts without external credentials or a five-model reviewer roster',async()=>{
  const selection=design.slice(design.indexOf('const geminiApiKey='),design.indexOf('const geminiUnavailableModels='));
  const routing=design.slice(design.indexOf('async function callDesignerModel('),design.indexOf('async function generateDesignerDraft('));
  const cases=[
    {env:{},external:false},
    {env:{GEMINI_API_KEY:'test-only'},external:false},
    {env:{COMPANY_EXTERNAL_AI_ENABLED:'true'},external:false},
    {env:{COMPANY_EXTERNAL_AI_ENABLED:'true',GEMINI_API_KEY:'test-only'},external:true},
    {env:{COMPANY_EXTERNAL_AI_ENABLED:'true',GEMINI_API_KEY:'test-only',COMPANY_GEMINI_DESIGNER_MODEL:'unapproved'},external:false}
  ];
  for(const scenario of cases){
    const calls=[],checkpoint={};
    const call=runInNewContext(selection+'\n'+routing+'\ncallDesignerModel',{
      process:{env:scenario.env},ai:{gameDesigner:{geminiModel:'gemini-3.8-flash',geminiFallbackModels:[]}},
      clean:value=>String(value??'').trim(),uniq:values=>[...new Set(values.filter(Boolean))],
      clip:value=>String(value),console:{log(){}},designCheckpoint:checkpoint,
      designerRoute:{id:'gemini:test',provider:'GEMINI'},activeDesignerRoute:null,persistDesignCheckpoint(){},
      callExternalDesignerModel:async()=>{calls.push('external');return {draft:'external'};},
      callLocalDesignerModel:async()=>{calls.push('local');return {draft:'local'};}
    });
    const value=await call('system','user',{});
    assert.deepEqual(calls,[scenario.external?'external':'local']);
    assert.equal(value.draft,scenario.external?'external':'local');
    assert.equal(checkpoint.effectiveDesignerProvider,scenario.external?'GEMINI':'VIBE_LOCAL_OLLAMA');
  }
  assert.doesNotMatch(design,/GEMINI_(?:POLICY_LEAD|LEAD_MODEL_GATE|DISTINCT_LEAD_GATE|LEAD_FAILOVER_COLLISION)/);
});

test('optional external failure falls back locally while a real local authoring failure remains a failure',async()=>{
  const routing=design.slice(design.indexOf('async function callDesignerModel('),design.indexOf('async function generateDesignerDraft('));
  for(const localFails of [false,true]){
    const calls=[],checkpoint={};
    const call=runInNewContext(routing+'\ncallDesignerModel',{
      externalAiEnabled:true,geminiApiKey:'test-only',externalDesignerConfigured:true,
      localDesignerModel:'local',designerRoute:{id:'gemini:test'},activeDesignerRoute:null,
      designCheckpoint:checkpoint,persistDesignCheckpoint(){},clean:String,clip:String,console:{log(){}},
      callExternalDesignerModel:async()=>{calls.push('external');throw new Error('HTTP_429');},
      callLocalDesignerModel:async()=>{calls.push('local');if(localFails)throw new Error('local unavailable');return {draft:'local'};}
    });
    if(localFails)await assert.rejects(call('system','user',{}),/DESIGN_AUTHORING_PROVIDERS_FAILED.*local unavailable/);
    else assert.equal((await call('system','user',{})).draft,'local');
    assert.deepEqual(calls,['external','local']);
    assert.equal(checkpoint.effectiveDesignerProvider,localFails?undefined:'VIBE_LOCAL_OLLAMA');
  }
});

test('workflow authoring route ignores exhausted external reviewers and prepares the local provider',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
  const start=workflow.indexOf('      - name: Resolve local design authoring from the current checkpoint');
  const end=workflow.indexOf('      - name: Restore Vibe local design fallback cache',start);
  const step=workflow.slice(start,end);
  const script=step.split("<<'NODE' | tee /tmp/gemini-quota-governor.txt\n")[1]?.split('          NODE')[0].replace(/^          /gm,'');
  assert.ok(script);
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'optional-design-ai-'));
  try{
    const folder=path.join(root,'design','demo','2026-10-06');fs.mkdirSync(folder,{recursive:true});
    fs.writeFileSync(path.join(folder,'design-checkpoint.json'),JSON.stringify({currentPhase:'DEPARTMENT_REVIEWS',tasks:{},modelHealth:{'gemini:old':{lastError:'RESOURCE_EXHAUSTED'}},phases:{designer_draft:{identity:'preserved'}}}));
    const output=path.join(root,'output');
    const run=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd:root,encoding:'utf8',env:{...process.env,ARTBOOK_GAME_ID:'demo',ARTBOOK_DATE:'2026-10-06',GITHUB_OUTPUT:output,COMPANY_GEMINI_LEAD_MODELS:''}});
    assert.equal(run.status,0,run.stderr);
    assert.match(fs.readFileSync(output,'utf8'),/run_model_cycle=true\nquota_state=EXTERNAL_AI_OPTIONAL\nlocal_fallback_needed=true/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(folder,'design-checkpoint.json'),'utf8')).phases.designer_draft.identity,'preserved');
    assert.match(run.stdout,/DESIGN_AI_REVIEW_LANES=NONE/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
  assert.doesNotMatch(workflow,/WAITING_FOR_GEMINI_QUOTA|GEMINI_LEAD_MODELS|GEMINI_LEAD_FALLBACK_LANES|all_quota_blocked/);
  assert.match(workflow,/COMPANY_EXTERNAL_AI_ENABLED:.*'false'/);
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

// 초기 설계 회귀검사: 실제 책임 함수에서 요청 인자와 분할 경로를 실행한다.
test('initial full and split design retain complete MAIN A B c @ grammar and expanded budgets',async()=>{
  const start=design.indexOf('async function generateDesignerDraft(');
  const end=design.indexOf('function scoreCurrentDesign(',start);
  assert.ok(start>0&&end>start);
  const section=design.slice(start,end);
  const grammar={causalDNAs:[{id:'cause',principle:'인과'.repeat(6500)}],gameplaySystemFusion:{formula:'MAIN × A × B × c',main:'MAIN_SENTINEL',axes:['A_SENTINEL','B_SENTINEL'],subElements:['c_SENTINEL']},delveLayer:{formulaSuffix:'+ @',elements:['DELVE_TAIL_SENTINEL']}};
  const serialized=JSON.stringify(grammar);
  assert.ok(serialized.length>12000);
  const fullSchema={required:['identity','coreLoop']},baseSchema={required:['identity']},gateSchema={required:['systemInterconnections']};
  for(const split of [false,true])for(const preservation of [false,true]){
    const calls=[];
    const sketch={version:4,novelGameGrammar:grammar,pacingPlan:{first5Minutes:'FIRST_CYCLE_SENTINEL'}};
    const seed={GAMEPLAY_SKETCH:sketch,SAVE_POLICY:'PRESERVE_EXISTING_SAVE'};
    const generate=runInNewContext(section+'\ngenerateDesignerDraft',{
      ownerPreservationDesign:preservation,seedGameplaySketch:sketch,seed,
      seedDesignDepthContext:{novelGameGrammar:grammar,pacingPlan:sketch.pacingPlan},
      evidence:{gameSeed:seed,seedDesignDepth:{novelGameGrammar:grammar}},strictDesignerFeedback:{hardFailures:['KEEP_FAILURE']},designEvolutionBrief:{},factPack:{},
      DESIGN:fullSchema,DESIGN_BASE:baseSchema,DESIGN_GATE:gateSchema,
      DESIGN_BASE_FIELDS:baseSchema.required,DESIGN_GATE_FIELDS:gateSchema.required,
      repairStructureContract:fields=>['STRUCTURE:'+fields.join(',')],
      repairDesignRequiredFields:value=>({value}),enforceOwnerPreservationDesign:value=>value,
      mergeDesignerDesign:(base,gate)=>({...base,...gate}),
      clean:value=>String(value??'').trim(),
      clip:(value,limit)=>{const text=typeof value==='string'?value:JSON.stringify(value);return text.slice(0,limit);},
      console:{log(){}},
      callDesignerModel:async(system,user,schema,options)=>{
        calls.push({system,user,schema,options});
        if(split&&calls.length===1)throw new Error('force existing split path');
        return schema===gateSchema?{systemInterconnections:['STATE_EXCHANGE']}:{identity:'IDENTITY_PRESERVED'};
      }
    });
    const result=await generate();
    assert.equal(result.identity,'IDENTITY_PRESERVED');
    assert.equal(calls.length,split?3:1);
    assert.deepEqual(calls.map(row=>row.options.predict),split?[12288,4096,12288]:[12288]);
    for(const call of calls){
      assert.equal(call.options.numCtx,32768);
      assert.equal(call.options.timeoutMs,120000);
      assert.equal(call.options.maxAttempts,2);
      const line=call.user.split('\n').find(row=>row.startsWith('GAMEPLAY_GRAMMAR='));
      assert.equal(line,'GAMEPLAY_GRAMMAR='+serialized);
      assert.match(call.user,/FIRST_CYCLE_SENTINEL/);
      assert.match(call.user,/KEEP_FAILURE/);
      assert.match(call.user,/PRE_GATE_STRUCTURE_CONTRACT=/);
      assert.equal(call.system,calls[0].system);
      assert.match(call.system,/c는 A\/B와 동급 대축으로 승격하지 말고/);
      assert.match(call.system,/A\/B\/c 게임문법과 PLAN_A\/PLAN_B\/PLAN_C 설계 대안 이름을 혼동하지 않는다/);
      assert.match(call.system,/변경 전 상태·변경 후 상태/);
      assert.match(call.system,/저장\/재입장 확인/);
      assert.match(call.system,/런타임 통과 증거로 주장하지 않는다/);
      if(preservation)assert.match(call.system,/기존 세계관·지역·스토리·퀘스트·전투·제작·진행·밸런스·드랍·세이브·hit\/cooldown 의미를 절대 재설계하지 않는다/);
    }
    if(split)assert.match(calls[2].user,/BASE_DESIGN=\{"identity":"IDENTITY_PRESERVED"\}/);
    assert.equal(seed.GAMEPLAY_SKETCH.novelGameGrammar,grammar);
  }
});

test('legacy seed without novel grammar remains authorable in the existing initial path',async()=>{
  const section=design.slice(design.indexOf('async function generateDesignerDraft('),design.indexOf('function scoreCurrentDesign('));
  let request;
  const generate=runInNewContext(section+'\ngenerateDesignerDraft',{
    ownerPreservationDesign:false,seedGameplaySketch:null,seed:{},seedDesignDepthContext:{version:1},evidence:{},strictDesignerFeedback:{},factPack:{},
    DESIGN:{required:['identity']},repairStructureContract:()=>[],repairDesignRequiredFields:value=>({value}),enforceOwnerPreservationDesign:value=>value,
    clip:(value,limit)=>JSON.stringify(value).slice(0,limit),console:{log(){}},
    callDesignerModel:async(system,user)=>{request=user;return {identity:'legacy'};}
  });
  assert.equal((await generate()).identity,'legacy');
  assert.match(request,/GAMEPLAY_GRAMMAR=null\n/);
});

test('local authoring sends expanded bounded capacities and rejects token-truncated JSON',async()=>{
  const section=design.slice(design.indexOf('async function requestLocalDesignerRaw('),design.indexOf('async function callLocalDesignerModel('));
  for(const scenario of [
    {predict:12288,numCtx:32768,wantPredict:12288,wantCtx:32768,done:'stop'},
    {predict:99999,numCtx:99999,wantPredict:16384,wantCtx:32768,done:'stop'},
    {predict:12288,numCtx:32768,wantPredict:12288,wantCtx:32768,done:'length'}
  ]){
    let payload,destroyed=false;
    const call=runInNewContext(section+'\nrequestLocalDesignerRaw',{
      localDesignerModel:'fixture-local',Buffer,setTimeout,clearTimeout,
      clean:value=>String(value??'').trim(),clip:(value,limit)=>String(value).slice(0,limit),
      http:{request(options,onResponse){
        assert.equal(options.hostname,'127.0.0.1');
        assert.equal(options.path,'/api/generate');
        const req=new EventEmitter();req.destroyed=false;
        req.destroy=()=>{req.destroyed=true;destroyed=true;};
        req.end=body=>{
          payload=JSON.parse(body);
          queueMicrotask(()=>{
            const res=new EventEmitter();res.statusCode=200;res.setEncoding=()=>{};
            onResponse(res);
            res.emit('data',JSON.stringify({response:'{"complete":true}',done:true,done_reason:scenario.done}));
            res.emit('end');
          });
        };
        return req;
      }}
    });
    const pending=call('grammar and detail',{predict:scenario.predict,numCtx:scenario.numCtx});
    if(scenario.done==='length')await assert.rejects(pending,/OLLAMA_DESIGN_OUTPUT_TRUNCATED/);
    else assert.equal(await pending,'{"complete":true}');
    assert.equal(payload.options.num_predict,scenario.wantPredict);
    assert.equal(payload.options.num_ctx,scenario.wantCtx);
    assert.equal(payload.think,false);
    assert.equal(payload.stream,false);
    assert.equal(destroyed,true);
  }
});

test('optional external authoring retains larger output budget and fails closed on truncation',async()=>{
  const section=design.slice(design.indexOf('async function callModel('),design.indexOf('async function callExternalDesignerModel('));
  const fullSchema={type:'object'};
  for(const scenario of [{predict:12288,want:12288,finish:'STOP'},{predict:99999,want:16384,finish:'STOP'},{predict:12288,want:12288,finish:'MAX_TOKENS'}]){
    let payload,normalizedCount=0;
    const call=runInNewContext(section+'\ncallModel',{
      DESIGN:fullSchema,DESIGN_BASE:{},DESIGN_GATE:{},modelCallTimeoutMs:90000,
      geminiApiKey:'fixture-only',geminiUnavailableModels:new Map(),geminiCandidatesFor:model=>[model],
      geminiThinkingConfigFor:()=>({thinkingLevel:'low'}),geminiMinuteRetryDelayMs:()=>0,isDailyGeminiQuotaError:()=>false,
      clean:value=>String(value??'').trim(),clip:(value,limit)=>String(value).slice(0,limit),
      parseJsonObject:JSON.parse,normalizeSchemaValue:value=>{normalizedCount++;return value;},assertSchemaValue(){},
      recordModelHealth(){},persistDesignCheckpoint(){},designCheckpoint:{},modelCallStats:[],console:{log(){}},AbortSignal,
      fetch:async(url,options)=>{payload=JSON.parse(options.body);return {ok:true,json:async()=>({candidates:[{finishReason:scenario.finish,content:{parts:[{text:'{"complete":true}'}]}}]})};}
    });
    const pending=call('fixture','system','user',fullSchema,{predict:scenario.predict,maxAttempts:1});
    if(scenario.finish==='MAX_TOKENS'){
      await assert.rejects(pending,/GEMINI_OUTPUT_TRUNCATED/);
      assert.equal(normalizedCount,0);
    }else{
      assert.equal((await pending).complete,true);
      assert.equal(normalizedCount,1);
    }
    assert.equal(payload.generationConfig.maxOutputTokens,scenario.want);
    assert.equal(payload.generationConfig.responseMimeType,'application/json');
  }
});

test('detailed design fields survive normalization without changing required field or array gates',()=>{
  const schemaSection=design.slice(design.indexOf('const MEMBER_TEXT='),design.indexOf('function enforceOwnerPreservationDesign('));
  const validationSection=design.slice(design.indexOf('function assertSchemaValue('),design.indexOf('function geminiMinuteRetryDelayMs('));
  const {DESIGN,normalizeSchemaValue,assertSchemaValue}=runInNewContext(schemaSection+'\n'+validationSection+'\n({DESIGN,normalizeSchemaValue,assertSchemaValue})');
  const examples=[
    [DESIGN.properties.identity,'가'.repeat(1500)],
    [DESIGN.properties.coreFun,'가'.repeat(1500)],
    [DESIGN.properties.coreLoop.items,'가'.repeat(600)],
    [DESIGN.properties.signatureSystems.items.properties.playerChoice,'가'.repeat(800)],
    [DESIGN.properties.systemInterconnections.items.properties.stateChange,'가'.repeat(800)],
    [DESIGN.properties.progressionEconomyBalance.properties.resourceFlow,'가'.repeat(1200)],
    [DESIGN.properties.contentExpansionPlan.items.properties.systemImpact,'가'.repeat(800)],
    [DESIGN.properties.implementationTraceability.items.properties.validationEvidence,'가'.repeat(800)]
  ];
  for(const [schema,value] of examples){
    const repairs=[];
    assert.equal(normalizeSchemaValue(value,schema,'field',repairs),value);
    assert.equal(repairs.length,0);
    assert.doesNotThrow(()=>assertSchemaValue(value,schema));
    assert.throws(()=>assertSchemaValue('가'.repeat(schema.maxLength+1),schema),/schema maxLength mismatch/);
  }
  assert.equal(DESIGN.additionalProperties,false);
  assert.equal(DESIGN.properties.coreLoop.minItems,3);
  assert.equal(DESIGN.properties.signatureSystems.minItems,2);
  assert.equal(DESIGN.properties.systemInterconnections.minItems,3);
  assert.equal(DESIGN.properties.contentExpansionPlan.minItems,3);
  assert.equal(DESIGN.properties.implementationTraceability.minItems,3);
  assert.ok(DESIGN.required.includes('designIntegrityPlan'));
  assert.ok(DESIGN.required.includes('stabilityPriorityPlan'));
});

test('expanded authoring keeps hard failures authoritative and repairs only requested fields',()=>{
  const start=design.indexOf('function preGatePass(');
  const end=design.indexOf('function repairPacket(',start);
  const pass=runInNewContext(design.slice(start,end)+'\npreGatePass',{DESIGN_GATE_PASS_MINIMUM:80});
  assert.equal(pass({totalScore:80,hardFailures:[]}),true);
  assert.equal(pass({totalScore:100,hardFailures:['ACTUAL_FAILURE']}),false);
  assert.equal(pass({totalScore:79,hardFailures:[]}),false);
  assert.equal(pass({totalScore:100}),false);
  const repair=design.slice(design.indexOf('for(let repairAttempt=1;'),design.indexOf('const designSemanticText='));
  assert.match(repair,/const fields=repairFields\(preGate\)/);
  assert.match(repair,/const schema=designSliceSchema\(fields\)/);
  assert.match(repair,/지정 필드 외 내용은 반환하지 않는다/);
  assert.match(repair,/GAMEPLAY_GRAMMAR=\$\{JSON\.stringify\(seedDesignDepthContext\.novelGameGrammar\|\|null\)\}/);
  assert.match(repair,/predict:Math\.min\(6144,1100\+fields\.length\*350\)/);
  assert.match(repair,/numCtx:32768/);
  assert.match(repair,/preGate=scoreCurrentDesign/);
});
