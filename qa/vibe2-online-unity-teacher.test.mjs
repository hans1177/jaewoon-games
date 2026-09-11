import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOnlineTeacherAnalysis } from '../tools/vibe2-online-unity-teacher.mjs';

const lessons = [
  { id:'events-01', topic:'event ownership', rule:'one owner', badPattern:'duplicate listener', mastery:'keep registration ownership symmetric' },
  { id:'repair-01', topic:'minimum safe repair', rule:'repair responsibility', badPattern:'one-line symptom patch', mastery:'inspect equivalent responsibility paths' },
  { id:'evidence-01', topic:'evidence discipline', rule:'use bound evidence', badPattern:'invent unseen architecture', mastery:'base claims on observed evidence' },
  { id:'verified-target-01', topic:'learning target authority', rule:'verified diff only', badPattern:'teacher-generated code target', mastery:'bind analysis to verified final patches only' },
  { id:'lifecycle-01', topic:'MonoBehaviour lifecycle ownership', rule:'one lifecycle owner', badPattern:'duplicate subscribe', mastery:'keep lifecycle subscribe/unsubscribe symmetric' },
  { id:'state-01', topic:'state authority', rule:'one writer', badPattern:'multiple writers', mastery:'keep authoritative mutation in gameplay owner' },
  { id:'save-01', topic:'save/load boundary', rule:'preserve save meaning', badPattern:'change save key', mastery:'preserve persistent semantics' },
  { id:'null-01', topic:'reference initialization', rule:'fix ownership first', badPattern:'silent null guard', mastery:'trace dependency acquisition and lifetime' },
  { id:'combat-01', topic:'combat authority', rule:'single combat owner', badPattern:'UI applies damage', mastery:'keep combat mutation in combat system' },
  { id:'perf-01', topic:'mobile Update cost', rule:'justify per-frame work', badPattern:'Find in Update', mastery:'cache stable references' },
];

function verifiedUnity() {
  return {
    instruction: 'OnEnable에서 이벤트가 중복 등록되어 공격이 두 번 적용되는 문제를 고쳐',
    input: 'MonoBehaviour lifecycle과 기존 저장 의미는 유지한다.',
    output: 'verified patch summary only',
    taskType: 'unity', sourceRevision: 'u1', independentQa: 'PASS', browserQa: 'PASS',
    quality: { codeQuality: 1, playImprovement: 1, ruleCompliance: 1, noRegression: true },
    provenance: { sourceRevision: 'u1', candidateId: 'u1', gameId: 'fixture' },
    verification: { trace: { state:'PASS', ci:'PASS', independentQa:'PASS', runtime:'PASS', sourceRevision:'u1', stale:false, flaky:false } },
  };
}

test('online teacher는 Unity verified sample만 분석하고 코드 권한을 갖지 않는다', () => {
  const result = buildOnlineTeacherAnalysis(verifiedUnity(), lessons);
  assert.equal(result.structuralRepair, true);
  assert.match(result.responsibilityBoundary, /event|lifecycle/i);
  assert.ok(result.patchScope.length >= 1);
  assert.ok(result.regressionRisks.length >= 1);
  assert.match(result.evidence.join(' '), /taskType=unity/);
});

test('online teacher는 non-Unity source를 거부한다', () => {
  assert.throws(() => buildOnlineTeacherAnalysis({ ...verifiedUnity(), taskType: 'bugfix' }, lessons), /taskType=unity only/);
});
