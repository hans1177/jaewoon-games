import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPANY_DEPARTMENT_ROLES,
  evaluateDepartmentEvidence,
  extractDepartmentRuntimeEvidence,
  extractRuntimeEvidence,
  getDepartmentStandard,
  isDomainSpecificEvidence
} from '../assets/company-department-standards.js';

test('canonical department roles include music and intro', () => {
  assert.deepEqual(COMPANY_DEPARTMENT_ROLES, ['planning','graphics','development','qa','balance','music','intro']);
});

test('QA cannot PASS without runtime play evidence even after a successful build', () => {
  const result = evaluateDepartmentEvidence({ role:'qa', evidence:['test build run 123 success','restart regression test passed'], request:{buildConclusion:'success'} });
  assert.equal(result.passed, false);
  assert.ok(result.blockerCodes.includes('RUNTIME_DOMAIN_EVIDENCE_REQUIRED'));
});

test('QA evidence gate passes with successful build and runtime evidence', () => {
  const result = evaluateDepartmentEvidence({ role:'qa', evidence:['build run 123 verified','restart regression test passed'], request:{buildConclusion:'success',playTestEvidence:['launch -> move -> combat -> restart smoke sequence PASS']} });
  assert.equal(result.passed, true);
  assert.equal(result.runtimeEvidence.length, 1);
});

test('development requires successful build evidence', () => {
  const result = evaluateDepartmentEvidence({ role:'development', evidence:['GameCore.cs null guard inspected','dependency boundary checked in RuntimeBootstrap.cs'], request:{buildConclusion:'failure'} });
  assert.equal(result.passed, false);
  assert.ok(result.blockerCodes.includes('BUILD_EVIDENCE_REQUIRED'));
});

test('planning requires enough concrete domain evidence', () => {
  const result = evaluateDepartmentEvidence({ role:'planning', evidence:['core loop unchanged'], request:{} });
  assert.equal(result.passed, false);
  assert.ok(result.blockerCodes.includes('INSUFFICIENT_DEPARTMENT_EVIDENCE'));
});

test('generic code praise cannot satisfy domain gates', () => {
  for (const role of ['planning','graphics','balance','music','intro']) {
    const result = evaluateDepartmentEvidence({ role, evidence:['The code is well-structured and provides a solid foundation.','No major issues identified.'], request:{} });
    assert.equal(result.passed, false, role);
    assert.ok(result.blockerCodes.includes('DOMAIN_SPECIFIC_EVIDENCE_REQUIRED'), role);
  }
});

test('graphics and balance can PASS with explicit scoped no-impact evidence', () => {
  assert.equal(evaluateDepartmentEvidence({ role:'graphics', evidence:['그래픽 영향 없음: 수정 범위가 GameCore.cs 세이브 null guard에 한정됨'], request:{} }).passed, true);
  assert.equal(evaluateDepartmentEvidence({ role:'balance', evidence:['밸런스 영향 없음: 데미지/체력/보상 수치 변경이 없음'], request:{} }).passed, true);
});

test('music and intro require their own runtime-domain evidence', () => {
  const musicFail=evaluateDepartmentEvidence({role:'music',evidence:['[source:index.html] music BGM controls exist'],request:{}});
  const introFail=evaluateDepartmentEvidence({role:'intro',evidence:['[source:index.html] intro opening markup exists'],request:{}});
  assert.equal(musicFail.passed,false);
  assert.equal(introFail.passed,false);
  assert.ok(musicFail.blockerCodes.includes('RUNTIME_DOMAIN_EVIDENCE_REQUIRED'));
  assert.ok(introFail.blockerCodes.includes('RUNTIME_DOMAIN_EVIDENCE_REQUIRED'));

  const musicPass=evaluateDepartmentEvidence({role:'music',evidence:['[artifact:audio-1] music BGM starts after user gesture'],request:{musicStartedAfterGesture:true}});
  const introPass=evaluateDepartmentEvidence({role:'intro',evidence:['[artifact:intro-1] intro first entry reaches core loop'],request:{introVisible:true,introCoreLoopHandoffPassed:true}});
  assert.equal(musicPass.passed,true);
  assert.equal(introPass.passed,true);
});

test('domain-specific detector separates professional evidence from generic praise', () => {
  assert.equal(isDomainSpecificEvidence('graphics','UI readability checked at mobile resolution'),true);
  assert.equal(isDomainSpecificEvidence('balance','damage and reward values unchanged'),true);
  assert.equal(isDomainSpecificEvidence('planning','core loop and quest progression unchanged'),true);
  assert.equal(isDomainSpecificEvidence('music','BGM mute and volume runtime pass'),true);
  assert.equal(isDomainSpecificEvidence('intro','intro skip and core loop handoff pass'),true);
  assert.equal(isDomainSpecificEvidence('planning','The code is well-structured.'),false);
});

test('runtime evidence recognizes generic and role-specific deterministic fields', () => {
  assert.deepEqual(extractRuntimeEvidence({runtimeSmokePassed:true,apkLaunchConclusion:'success'}),['runtimeSmokePassed=true','apkLaunchConclusion=success']);
  assert.ok(extractDepartmentRuntimeEvidence('music',{musicMuteControlPassed:true}).includes('musicMuteControlPassed=true'));
  assert.ok(extractDepartmentRuntimeEvidence('intro',{introSkipPassed:true}).includes('introSkipPassed=true'));
});

test('department standards expose role-specific checks', () => {
  assert.ok(getDepartmentStandard('qa').requiredChecks.length>=5);
  assert.ok(getDepartmentStandard('planning').requiredChecks.length>=3);
  assert.equal(getDepartmentStandard('qa').minSpecificEvidence,2);
  assert.equal(getDepartmentStandard('music').runtimeRequired,true);
  assert.equal(getDepartmentStandard('intro').runtimeRequired,true);
});
