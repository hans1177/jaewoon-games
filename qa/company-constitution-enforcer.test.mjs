// 파일명: qa/company-constitution-enforcer.test.mjs
// 임포트
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {enforceConstitution} from '../tools/company-constitution-enforcer.mjs';

// 메인: 소유자가 삭제한 중앙 헌법을 복원하거나 PASS로 가장하지 않는다.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('owner removal leaves constitutional verification blocked, never PASS', () => {
  const directive = JSON.parse(fs.readFileSync(path.join(root, 'company-directive.json'), 'utf8'));
  assert.equal(directive.policyDocument, null);
  assert.equal(directive.documentationSynchronization.centralPolicyPath, null);
  assert.equal(fs.existsSync(path.join(root, 'company-learning/platform-release-roadmap.json')), false);
  const result = enforceConstitution({root, phase: 'test'});
  assert.equal(result.pass, false);
  assert.ok(result.errors.includes('CONSTITUTION_AUTHORITY_UNAVAILABLE'));
  assert.equal(result.constitutionFingerprint, null);
});

test('caller cannot silently supply replacement constitutional policy', () => {
  const result = enforceConstitution({root, phase: 'test', policy: {ownerCanonicalRules: {}}});
  assert.equal(result.pass, false);
  assert.ok(result.errors.includes('DELETED_CONSTITUTION_CANNOT_BE_REINSTATED_BY_CALLER'));
});

test('missing owner directive is a hard failure, not implicit approval', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'constitution-fail-closed-'));
  try {
    const result = enforceConstitution({root: temp, phase: 'test'});
    assert.equal(result.pass, false);
    assert.ok(result.errors.includes('OWNER_DIRECTIVE_UNAVAILABLE'));
  } finally {
    fs.rmSync(temp, {recursive: true, force: true});
  }
});

test('reintroduced deleted policy file requires owner review instead of passing', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'constitution-reappearance-'));
  try {
    fs.mkdirSync(path.join(temp, 'company-learning'), {recursive: true});
    fs.copyFileSync(path.join(root, 'company-directive.json'), path.join(temp, 'company-directive.json'));
    fs.writeFileSync(path.join(temp, 'company-learning/platform-release-roadmap.json'), '{}');
    const result = enforceConstitution({root: temp, phase: 'test'});
    assert.equal(result.pass, false);
    assert.ok(result.errors.includes('DELETED_POLICY_REAPPEARED_REQUIRES_OWNER_REVIEW'));
  } finally {
    fs.rmSync(temp, {recursive: true, force: true});
  }
});

test('tampered minimal directive fails closed without synthesizing legacy deletion records', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'constitution-minimal-directive-'));
  try {
    const directive = JSON.parse(fs.readFileSync(path.join(root, 'company-directive.json'), 'utf8'));
    directive.execution.centralPolicyMissing = 'PASS';
    fs.writeFileSync(path.join(temp, 'company-directive.json'), JSON.stringify(directive));
    const result = enforceConstitution({root: temp, phase: 'test'});
    assert.equal(result.pass, false);
    assert.ok(result.errors.includes('OWNER_DIRECTIVE_MINIMAL_CONTRACT_INVALID'));
    assert.ok(result.errors.includes('CONSTITUTION_AUTHORITY_UNAVAILABLE'));
  } finally {
    fs.rmSync(temp, {recursive: true, force: true});
  }
});
