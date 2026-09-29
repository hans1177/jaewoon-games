import test from 'node:test';
import assert from 'node:assert/strict';
import { departmentInformationProblems, ROLE_SECTION_KEYS } from '../tools/artbook-semantic-quality.mjs';

const roles=Object.keys(ROLE_SECTION_KEYS);
function rich(role){
  const section=Object.fromEntries(ROLE_SECTION_KEYS[role].map((k,i)=>[k,`${role} ${k} 항목은 실제 근거와 구현 경계를 구분하고 ${i+1}번째 검증 포인트를 구체적으로 기록한다.`]));
  return {section,conceptPlan:{creativeIdeas:[`${role} 창작 제안은 현재 근거와 분리해 사용자 경험 개선 가설로 기록한다.`],implementationPlan:[`${role} 구현 계획은 기존 책임 시스템을 재사용하고 저장 의미와 규칙을 보존한다.`],demoValidation:[`${role} 검증은 모바일 입력과 재시작을 포함한 실제 플레이 시나리오로 확인한다.`]}};
}

test('all five departments reject placeholder-only output',()=>{
  for(const role of roles){
    const section=Object.fromEntries(ROLE_SECTION_KEYS[role].map(k=>[k,'none']));
    const problems=departmentInformationProblems(role,{section,conceptPlan:{creativeIdeas:['1'],implementationPlan:['true'],demoValidation:['none']}});
    assert.ok(problems.length>0,`${role} should reject shallow output`);
  }
});

test('all five departments accept differentiated meaningful output',()=>{
  for(const role of roles)assert.deepEqual(departmentInformationProblems(role,rich(role)),[],role);
});
