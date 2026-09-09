import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateDepartmentEvidence,
  extractRuntimeEvidence,
  getDepartmentStandard
} from '../assets/company-department-standards.js';

test('QA cannot PASS without runtime play evidence even after a successful build', () => {
  const result = evaluateDepartmentEvidence({
    role: 'qa',
    evidence: ['APK produced', 'build log checked'],
    request: { buildConclusion: 'success' }
  });
  assert.equal(result.passed, false);
  assert.ok(result.blockerCodes.includes('RUNTIME_PLAY_EVIDENCE_REQUIRED'));
});

test('QA evidence gate passes with successful build and runtime evidence', () => {
  const result = evaluateDepartmentEvidence({
    role: 'qa',
    evidence: ['APK produced', 'movement and combat regression checked'],
    request: {
      buildConclusion: 'success',
      playTestEvidence: ['launch -> move -> combat -> restart smoke sequence PASS']
    }
  });
  assert.equal(result.passed, true);
  assert.equal(result.runtimeEvidence.length, 1);
});

test('development requires successful build evidence', () => {
  const result = evaluateDepartmentEvidence({
    role: 'development',
    evidence: ['changed file inspected', 'dependency boundary checked'],
    request: { buildConclusion: 'failure' }
  });
  assert.equal(result.passed, false);
  assert.ok(result.blockerCodes.includes('BUILD_EVIDENCE_REQUIRED'));
});

test('planning requires concrete evidence instead of generic opinion', () => {
  const result = evaluateDepartmentEvidence({
    role: 'planning',
    evidence: ['core loop unchanged'],
    request: {}
  });
  assert.equal(result.passed, false);
  assert.ok(result.blockerCodes.includes('INSUFFICIENT_DEPARTMENT_EVIDENCE'));
});

test('graphics and balance can PASS with scoped no-impact evidence', () => {
  for (const role of ['graphics', 'balance']) {
    const result = evaluateDepartmentEvidence({
      role,
      evidence: ['modified scope does not touch this department domain'],
      request: {}
    });
    assert.equal(result.passed, true);
  }
});

test('runtime evidence recognizes supported deterministic request fields', () => {
  assert.deepEqual(
    extractRuntimeEvidence({ runtimeSmokePassed: true, apkLaunchConclusion: 'success' }),
    ['runtimeSmokePassed=true', 'apkLaunchConclusion=success']
  );
});

test('department standards expose role-specific checks', () => {
  assert.ok(getDepartmentStandard('qa').requiredChecks.length >= 5);
  assert.ok(getDepartmentStandard('planning').requiredChecks.length >= 3);
});
