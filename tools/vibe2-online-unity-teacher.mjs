import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDistilledStructuralSample, discoverStructuralCandidates, isVerifiedStructuralSource } from './vibe2-structural-repair-distillation.mjs';

const clean = (value) => String(value ?? '').trim();
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); };

const RISK_BY_TOPIC = Object.freeze({
  lifecycle: ['재활성화 뒤 이벤트 중복 등록', '비활성화 뒤 남은 구독 또는 코루틴'],
  event: ['동일 입력 또는 공격의 중복 실행', '해제 누락으로 인한 재진입 회귀'],
  save: ['기존 세이브 의미 변경', '런타임 상태와 영속 상태 불일치'],
  null: ['초기화 순서 회귀', '필수 참조 누락을 조용히 숨기는 회귀'],
  combat: ['이중 데미지 적용', '보상 또는 사망 처리 중복'],
  physics: ['Update/FixedUpdate 경계 붕괴', '프레임률 의존 이동 회귀'],
  scene: ['씬/프리팹 직렬화 참조 손실', '런타임 탐색 의존 증가'],
  performance: ['Android 프레임당 할당 증가', '반복 Find/GetComponent 또는 Instantiate/Destroy 비용'],
  state: ['권한 없는 계층의 상태 직접 변경', 'UI와 gameplay 상태 불일치'],
});

function lessonScore(lesson, text) {
  const hay = text.toLowerCase();
  const terms = `${lesson.id} ${lesson.topic} ${lesson.rule} ${lesson.badPattern} ${lesson.mastery}`.toLowerCase().split(/[^a-z0-9가-힣]+/).filter((x) => x.length >= 3);
  return terms.reduce((score, term) => score + (hay.includes(term) ? 1 : 0), 0);
}

function selectLessons(lessons, text) {
  const ranked = lessons.map((lesson) => ({ lesson, score: lessonScore(lesson, text) })).sort((a,b) => b.score - a.score || a.lesson.id.localeCompare(b.lesson.id));
  const positive = ranked.filter((item) => item.score > 0).slice(0, 4).map((item) => item.lesson);
  if (positive.length) return positive;
  return lessons.filter((lesson) => ['repair-01','evidence-01','verified-target-01'].includes(lesson.id));
}

function risksForLessons(lessons) {
  const out = [];
  for (const lesson of lessons) {
    const key = Object.keys(RISK_BY_TOPIC).find((topic) => `${lesson.id} ${lesson.topic}`.toLowerCase().includes(topic));
    for (const risk of key ? RISK_BY_TOPIC[key] : []) if (!out.includes(risk)) out.push(risk);
  }
  if (!out.length) out.push('책임 경계 밖의 동작 변경', '검증된 기존 게임 규칙 회귀');
  return out.slice(0, 5);
}

export function buildOnlineTeacherAnalysis(record, lessons) {
  if (!isVerifiedStructuralSource(record)) throw new Error('verified Unity source required');
  const sample = record?.trainingSample && typeof record.trainingSample === 'object' ? record.trainingSample : record;
  const taskType = clean(sample.taskType ?? record.taskType).toLowerCase();
  if (taskType !== 'unity') throw new Error('online Unity teacher accepts taskType=unity only');
  const text = `${clean(sample.instruction)}\n${clean(sample.input)}\n${clean(sample.output)}`;
  const selected = selectLessons(lessons, text);
  const mastery = selected.map((lesson) => clean(lesson.mastery)).filter(Boolean);
  const topics = selected.map((lesson) => clean(lesson.topic)).filter(Boolean);
  return {
    structuralRepair: true,
    rootCause: `검증된 Unity 수정 사례의 문제를 ${topics.join(', ') || 'responsibility boundary'} 관점에서 추적해야 하며, 증상만 막는 수정이 아니라 실제 상태/수명주기 책임 위치가 원인 범위다.`,
    responsibilityBoundary: topics.join(' + ') || 'Unity component responsibility and lifecycle boundary',
    patchScope: mastery.length ? mastery : ['기존 책임 시스템 안에서 최소한의 올바른 책임 수리를 적용한다.'],
    whyNotSmallerPatch: '한 호출이나 null guard만 바꾸면 동일 책임의 다른 등록·상태쓰기·수명주기 경로가 남을 수 있으므로, 검증된 주변 책임 경계를 확인한 뒤 최소 안전 범위를 정해야 한다.',
    regressionRisks: risksForLessons(selected),
    evidence: [
      `verified taskType=${taskType}`,
      `sourceRevision=${clean(record?.provenance?.sourceRevision ?? record?.sourceRevision ?? record?.sourceCommit)}`,
      'verification trace: CI PASS + independent QA PASS + runtime PASS',
      ...selected.map((lesson) => `lesson=${lesson.id}:${lesson.topic}`),
    ],
  };
}

export function buildOnlineTeacherSamples({ sampleDir, lessonsFile, outDir, maxCandidates = 96 }) {
  const lessonsDoc = readJson(lessonsFile);
  if (lessonsDoc.scope !== 'UNITY_CODING_ONLY' || !Array.isArray(lessonsDoc.lessons) || lessonsDoc.lessons.length < 10) throw new Error('Unity core lessons contract mismatch');
  const candidates = discoverStructuralCandidates(sampleDir, { maxCandidates }).filter((item) => item.taskType === 'unity');
  fs.mkdirSync(outDir, { recursive: true });
  let written = 0;
  for (const item of candidates) {
    const record = readJson(item.sourceFile);
    const analysis = buildOnlineTeacherAnalysis(record, lessonsDoc.lessons);
    const enriched = buildDistilledStructuralSample(record, analysis, { teacherModel: 'GPT-5.6-Sol-authored-online-curriculum-v1' });
    if (!enriched) continue;
    writeJson(path.join(outDir, `${item.candidateId.replace(/[^A-Za-z0-9._-]/g, '_')}.json`), enriched);
    written += 1;
  }
  return { version: 1, learningFocus: 'UNITY_CODING_ONLY', teacherRoute: 'GPT_AUTHORED_CURRICULUM_ON_GITHUB_HOSTED_RUNNER', paidApi: false, candidateCount: candidates.length, written };
}

function parseArgs(argv) { const out = {}; for (let i=0;i<argv.length;i+=1) { const arg=argv[i]; if (!arg.startsWith('--')) continue; const [key,inline] = arg.slice(2).split('=',2); out[key] = inline ?? argv[++i]; } return out; }
function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = buildOnlineTeacherSamples({
    sampleDir: args['sample-dir'] || 'company-learning/training-samples',
    lessonsFile: args.lessons || 'company-learning/unity-teacher-materials/core-lessons.json',
    outDir: args['out-dir'] || 'tmp/unity-online-teacher-samples',
    maxCandidates: Number(args.max ?? 96),
  });
  console.log(JSON.stringify(result));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
