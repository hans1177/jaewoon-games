// 파일명: qa/artbook-demo-feedback-contract.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDemoFeedback } from '../tools/artbook-demo-concept-gate.mjs';

const feedback=(DECISION,ROOT_CAUSE_CLASS)=>({
  DECISION,
  ROOT_CAUSE_CLASS,
  ROOT_CAUSE:'검증 결과에서 확인된 구체 원인을 기록한다.',
  EVIDENCE:'재현 가능한 플레이/도구/게이트 근거를 기록한다.',
  UNITY_IMPLEMENTATION_NOTE:'Unity 본제작에서 반영할 구현 경계를 기록한다.',
  UNITY_ART_NOTE:'Unity 본제작에서 반영할 시각/가독성 기준을 기록한다.'
});

test('system defects cannot be hidden as DROP',()=>{
  for(const root of ['VIBE2','ARTBOOK_GENERATION','VALIDATION_GATE','PROMPT_ASSEMBLY','DATA_BINDING','TOOL_CODE','TEST_GAP','IMPLEMENTATION_DEFECT','RUNTIME_DEFECT']){
    assert.throws(()=>validateDemoFeedback('P0002',feedback('DROP',root)),/DROP|CHANGE\/FIX_REQUIRED/);
    assert.doesNotThrow(()=>validateDemoFeedback('P0002',feedback('FIX_REQUIRED',root)));
  }
});

test('DROP is reserved for redundant design or goal conflict',()=>{
  assert.doesNotThrow(()=>validateDemoFeedback('P0004',feedback('DROP','DESIGN_REDUNDANT')));
  assert.doesNotThrow(()=>validateDemoFeedback('P0004',feedback('DROP','GOAL_CONFLICT')));
});

test('feedback always carries Unity implementation and art notes',()=>{
  const bad=feedback('CHANGE','TOOL_CODE');
  bad.UNITY_ART_NOTE='';
  assert.throws(()=>validateDemoFeedback('P0009',bad),/UNITY_ART_NOTE missing/);
});
