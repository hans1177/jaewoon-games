// 파일명: qa/company-design-cycle-deepseek-fallback.test.mjs
// 임포트
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 메인: 현재 단일 디자이너·구조화 검증 계약만 확인한다. 구버전 모델 풀/시간 제한을 재강제하지 않는다.
const design=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));

test('structured local design calls retain schema validation and recover rejected slices',()=>{
  for(const token of [
    'think:false',
    'normalizeSchemaValue(parsed,schema',
    'assertSchemaValue(normalized,schema)',
    'DESIGN_SLICE_CONTENT_REPAIR=',
    'DESIGN_CONTENT_REPAIR_REQUIRED',
    'slicePartialResults',
    'sliceDependencies',
    'wrap-required-object:',
    'drop-extra:',
    'repairStructureContract(requestedFields)'
  ])assert.ok(design.includes(token),token);
  assert.match(design,/for\(let attempt=0;attempt<2;attempt\+\+\)/);
  assert.match(design,/const callSchema=designSliceSchema\(requestedFields\)/);
  assert.doesNotMatch(design,/DESIGNER_DRAFT_ONE_CALL_FALLBACK=SPLIT/);
});

test('DeepSeek is excluded and lead models follow the current central pool',()=>{
  const banned=new Set(directive.ai?.bannedModels||[]);
  const pool=directive.ai?.modelPool||[];
  const leads=Object.values(directive.ai?.departmentLeadModels||{});
  assert.ok(banned.has('deepseek-r1:1.5b'));
  assert.ok(!pool.includes('deepseek-r1:1.5b'));
  assert.equal(leads.length,5);
  for(const lead of leads)assert.ok(pool.includes(lead),'department lead must be in the current approved model pool');
  assert.ok(!leads.some(model=>banned.has(model)));
  assert.match(design,/const localDesignerModel=clean\(process\.env\.COMPANY_VIBE_LOCAL_MODEL\|\|'qwen3:1\.7b'\)/);
});

test('one local Game Designer authors the full source without a parallel external review lane',()=>{
  for(const token of [
    "const designerRoute={provider:'VIBE_LOCAL_OLLAMA',model:localDesignerModel",
    "console.log('DESIGN_EXTERNAL_AI_ALLOWED=NO')",
    "console.log('DESIGN_AI_REVIEW_LANES=NONE')",
    'const designerModel=designerRoute.id',
    'designCheckpoint.effectiveDesignerModel=designerRoute.id',
    "authorRole:'GAME_DESIGNER_AI'",
    'singleAuthor:true'
  ])assert.ok(design.includes(token),token);
  assert.match(design,/async function authorDesignInCheckpointedSlices/);
  assert.match(design,/phase:'designer_draft'/);
});

test('strict design failures reach targeted revision without PASS fabrication',()=>{
  for(const token of [
    'const strictDesignerFeedback=',
    "source:'PRIOR_STRICT_DESIGN_REVIEW'",
    'bypassAllowed:false',
    'strictGateBypassAllowed:false',
    'DESIGNER_SEED_REPAIR_REQUIRED',
    'DESIGN_DETERMINISTIC_PRE_GATE=',
    'REPAIR_PACKET=',
    'hardFailures:Array.isArray(latestDesignFeedbackEvent?.hardFailures)',
    'rejectionReasons:Array.isArray(latestDesignFeedbackEvent?.rejectionReasons)'
  ])assert.ok(design.includes(token),token);
  assert.match(design,/STRICT_GATE_FEEDBACK=\$\{clip\(strictDesignerFeedback,6500\)\}/);
  assert.ok(design.includes('기존 검증·보안·저장·네트워크 권한을 바꾸지 않는다'));
});

test('five connected MAIN/A/B/c/@ roles and 2+ multiplayer remain required at design authoring',()=>{
  assert.match(design,/signatureSystems:\{type:'array',minItems:5/);
  assert.match(design,/systemInterconnections:\{type:'array',minItems:5/);
  assert.match(design,/required:\['name','purpose','playerChoice','id','grammarRole','stateInputs','stateOutputs'\]/);
  assert.ok(design.includes('signatureSystems:value.signatureSystems'),'preservation must retain designer-authored roles');
  assert.ok(design.includes('systemInterconnections:value.systemInterconnections'));
  assert.match(design,/allGamesMultiplayerRequired\?\['COOP','COMPETITIVE','HYBRID'\]/);
  assert.equal(policy.directNativeDualPlatformDevelopment.multiplayerImplementation.minimumParticipants,2);
  assert.equal(policy.directNativeDualPlatformDevelopment.multiplayerImplementation.staticCodeEvidenceIsActualMultiplayerPlay,false);
});

test('Unity WebGL 2.5D+ has a structured design contract with runtime evidence still required',()=>{
  assert.match(design,/const UNITY_WEB_SPATIAL_PRESENTATION=/);
  assert.match(design,/dimension:\{type:'string',enum:\['2.5D','3D'\]\}/);
  for(const token of ['worldDepth','cameraAndOcclusion','lightingAndMaterials','mobileWebglEvidence'])assert.ok(design.includes(token),token);
  assert.equal(policy.livingMotionVisualQualityContract.minimumSpatialPresentation.minimumFinalGameplayDimension,'2.5D');
  assert.equal(policy.livingMotionVisualQualityContract.minimumSpatialPresentation.runtimeEvidenceRequired,true);
  assert.equal(policy.livingMotionVisualQualityContract.minimumSpatialPresentation.flat2DFinalGameplayForbidden,true);
});

test('the same checkpointed designer preserves causal gameplay depth under the current local timeout contract',()=>{
  for(const token of [
    'const DESIGN_AUTHORING_SLICES=Object.freeze([',
    'DESIGN_AUTHORING_SLICE_CONTRACT_MISMATCH',
    'runCheckpointTask(`${phase}_slices`,slice.id',
    'const schema=designSliceSchema(slice.fields)',
    'const timeoutMs=localDesignerCallTimeoutMs',
    'requestLocalDesignerRaw(requestPrompt,{predict,temperature,numCtx,timeoutMs,schema})',
    'assertSchemaValue(complete,DESIGN)',
    'DESIGN_CHECKPOINTED_SLICES_COMPLETE=',
    'MAIN은 입력→즉시 피드백→상태 변화→위험/보상→다음 선택',
    'A와 B는 각각 독립된 대축',
    'c는 최소 3개 이상의 서브요소',
    '@는 해금 조건·발견 단서·숙련 보상·재방문 가치·고급 조합',
    '실제 플레이 5분·15분·30분 흐름'
  ])assert.ok(design.includes(token),token);
  assert.match(design,/num_ctx:Math\.min\(24576,Math\.max\(4096,Number\(numCtx\|\|8192\)\)\)/);
});
