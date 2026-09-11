import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildOnlineTeacherAnalysis, loadTeacherLessons } from '../tools/vibe2-online-unity-teacher.mjs';

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

function verifiedUnity(overrides = {}) {
  return {
    instruction: 'OnEnable에서 이벤트가 중복 등록되어 공격이 두 번 적용되는 문제를 고쳐',
    input: 'MonoBehaviour lifecycle과 기존 저장 의미는 유지한다.',
    output: 'verified patch summary only',
    taskType: 'unity', sourceRevision: 'u1', independentQa: 'PASS', browserQa: 'PASS',
    quality: { codeQuality: 1, playImprovement: 1, ruleCompliance: 1, noRegression: true },
    provenance: { sourceRevision: 'u1', candidateId: 'u1', gameId: 'fixture' },
    verification: { trace: { state:'PASS', ci:'PASS', independentQa:'PASS', runtime:'PASS', sourceRevision:'u1', stale:false, flaky:false } },
    ...overrides,
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

test('그래픽·애니·모션 전문 노하우가 core lesson과 함께 자동 주입된다', () => {
  const loaded = loadTeacherLessons('company-learning/unity-teacher-materials/core-lessons.json');
  const ids = new Set(loaded.map((lesson) => lesson.id));
  for (const id of ['motion-01','motion-06','motion-08','graphics-01','graphics-02','transfer-02','transfer-03','transfer-04','transfer-06','transfer-07']) {
    assert.ok(ids.has(id), `missing specialist lesson: ${id}`);
  }
});

test('검증 내부 패턴은 복제 후 재배치·변형·조합하는 판단으로 증류된다', () => {
  const loaded = loadTeacherLessons('company-learning/unity-teacher-materials/core-lessons.json');
  const result = buildOnlineTeacherAnalysis(verifiedUnity({
    instruction: '캐릭터 이동과 카메라 움직임을 더 부드럽게 만들고 기존 움직임 패턴을 새 보스 이동에도 재배치해',
    input: '이동 권한은 하나로 유지하고 Android 프레임 안정성을 지켜',
  }), loaded);
  const evidence = result.evidence.join(' ');
  assert.match(evidence, /transfer mode/i);
  assert.match(result.responsibilityBoundary, /movement|camera|재배치|smooth|transfer/i);
  assert.ok(result.patchScope.some((item) => /재배치|이동|카메라|바인딩|owner/i.test(item)));
});

test('타사 독점 코드 복제 재배치는 오마주로 분류하지 않는다', () => {
  const doc = JSON.parse(fs.readFileSync('company-learning/unity-teacher-materials/graphics-motion-lessons.json', 'utf8'));
  assert.equal(doc.transferMode, 'ABSTRACT_KNOWHOW_PLUS_LICENSED_REUSE');
  const external = doc.lessons.find((lesson) => lesson.id === 'transfer-05');
  assert.match(external.rule, /독점 코드를 복제 후 재배치.*오마주나 재해석으로 취급하지 않는다/);
  assert.match(external.mastery, /새 코드를 작성/);
});

test('라이선스가 명확한 코드는 조건 안에서 복제·수정·재배치할 수 있다', () => {
  const doc = JSON.parse(fs.readFileSync('company-learning/unity-teacher-materials/graphics-motion-lessons.json', 'utf8'));
  const licensed = doc.lessons.find((lesson) => lesson.id === 'transfer-06');
  const cleanRoom = doc.lessons.find((lesson) => lesson.id === 'transfer-07');
  assert.match(licensed.rule, /라이선스 조건 안에서 복제·수정·재배치/);
  assert.match(licensed.mastery, /licensed reuse/);
  assert.match(cleanRoom.rule, /관찰 가능한 동작·문서·인터페이스/);
});

test('ingest에서 검증 샘플을 artifact로 넘기고 Actions PR 권한 실패가 학습을 막지 않는다', () => {
  const ingest = fs.readFileSync('.github/workflows/vibe2-distillation-ingest.yml', 'utf8');
  assert.match(ingest, /name: vibe2-verified-training-samples/);
  assert.match(ingest, /retention-days: 1/);
  assert.match(ingest, /DISTILLATION_MEMORY_PR=SKIPPED_ACTIONS_PR_PERMISSION/);
  assert.match(ingest, /git push origin --delete/);
});

test('24시간 Unity teacher는 ingest artifact를 우선 소비하고 없으면 main 샘플로 안전하게 fallback한다', () => {
  const workflow = fs.readFileSync('.github/workflows/vibe2-structural-repair-distillation.yml', 'utf8');
  assert.match(workflow, /actions: read/);
  assert.match(workflow, /actions\/download-artifact@v4/);
  assert.match(workflow, /name: vibe2-verified-training-samples/);
  assert.match(workflow, /run-id: \$\{\{ github\.event\.workflow_run\.id \}\}/);
  assert.match(workflow, /VERIFIED_SAMPLE_SOURCE=INGEST_ARTIFACT/);
  assert.match(workflow, /VERIFIED_SAMPLE_SOURCE=MAIN_REPOSITORY/);
  assert.match(workflow, /steps\.sample-source\.outputs\.sample_dir/);
});
