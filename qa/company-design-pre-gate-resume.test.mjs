import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';

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


test('initial design authoring keeps expanded context, output budget, grammar, and UI detail',()=>{
  assert.match(design,/uiInteractionPlan:seedGameplaySketch\?\.uiInteractionPlan/);
  assert.match(design,/582dffc82fea152c4f7727b3746e071c6a180d2cb0c90806d0caefc464532baa/);
  assert.match(design,/num_ctx:Math\.min\(24576/);
  assert.match(design,/predict:8192,temperature:0\.28,numCtx:24576/);
  assert.match(design,/GAME_SEED_DESIGN_DEPTH=\$\{clip\(seedDesignDepthContext,18000\)\}/);
  assert.match(design,/EVIDENCE=\$\{clip\(evidence,14000\)\}/);
  assert.match(design,/MAIN\/A\/B\/c\/@/);
  assert.match(design,/메뉴와 버튼도 게임 설계다/);
  assert.match(design,/기본·눌림·비활성·로딩·오류·확인 상태/);
  assert.match(design,/platformProfiles\.ROBLOX\.uiUx와 UNITY\.uiUx/);
  assert.match(design,/DESIGN_BASE,\{predict:2600,temperature:0\.3,numCtx:16384/);
  assert.match(design,/DESIGN_GATE,\{predict:5600,temperature:0\.2,numCtx:24576/);
});
