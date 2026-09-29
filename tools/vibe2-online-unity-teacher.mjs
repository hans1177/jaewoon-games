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
  movement: ['다중 이동 권한으로 인한 떨림 또는 이중 이동', 'FPS 변화에 따른 이동감 변화'],
  velocity: ['넉백·대시·기본 이동의 속도 권한 충돌', '상태 전환 뒤 속도 누수'],
  camera: ['카메라 효과 종료 뒤 위치/FOV 복귀 실패', '여러 효과의 transform 경쟁'],
  animation: ['Animator와 gameplay 상태 불일치', 'transition 증가로 인한 입력 지연'],
  graphics: ['모바일 오버드로우·파티클·셰이더 비용 증가', '시각 효과로 gameplay 가독성 저하'],
  transfer: ['이전 프로젝트의 소유권·씬 참조를 잘못 재사용', '검증 패턴을 현재 구조에 재바인딩하지 못함'],
});

function lessonScore(lesson, text) {
  const hay = text.toLowerCase();
  const terms = `${lesson.id} ${lesson.topic} ${lesson.rule} ${lesson.badPattern} ${lesson.mastery}`.toLowerCase().split(/[^a-z0-9가-힣]+/).filter((x) => x.length >= 3);
  return terms.reduce((score, term) => score + (hay.includes(term) ? 1 : 0), 0);
}

function selectLessons(lessons, text) {
  const ranked = lessons.map((lesson) => ({ lesson, score: lessonScore(lesson, text) })).sort((a,b) => b.score - a.score || a.lesson.id.localeCompare(b.lesson.id));
  const positive = ranked.filter((item) => item.score > 0).slice(0, 6).map((item) => item.lesson);
  if (positive.length) return positive;
  return lessons.filter((lesson) => ['repair-01','evidence-01','verified-target-01','transfer-01','transfer-02'].includes(lesson.id)).slice(0, 5);
}

function risksForLessons(lessons) {
  const out = [];
  for (const lesson of lessons) {
    const key = Object.keys(RISK_BY_TOPIC).find((topic) => `${lesson.id} ${lesson.topic}`.toLowerCase().includes(topic));
    for (const risk of key ? RISK_BY_TOPIC[key] : []) if (!out.includes(risk)) out.push(risk);
  }
  if (!out.length) out.push('책임 경계 밖의 동작 변경', '검증된 기존 게임 규칙 회귀');
  return out.slice(0, 6);
}

export function loadTeacherLessons(primaryFile, extraFiles = []) {
  const primary = readJson(primaryFile);
  if (primary.scope !== 'UNITY_CODING_ONLY' || !Array.isArray(primary.lessons) || primary.lessons.length < 10) throw new Error('Unity core lessons contract mismatch');
  const files = [...extraFiles];
  const specialist = path.join(path.dirname(primaryFile), 'graphics-motion-lessons.json');
  if (fs.existsSync(specialist) && !files.includes(specialist)) files.push(specialist);
  const lessons = [...primary.lessons];
  const seen = new Set(lessons.map((lesson) => lesson.id));
  for (const file of files) {
    if (!file || !fs.existsSync(file)) continue;
    const doc = readJson(file);
    if (doc.scope !== 'UNITY_CODING_ONLY' || doc.authority === 'CODE_AUTHORITY' || !Array.isArray(doc.lessons)) throw new Error(`Unity lesson pack contract mismatch: ${file}`);
    for (const lesson of doc.lessons) {
      if (!lesson?.id || seen.has(lesson.id)) continue;
      lessons.push(lesson);
      seen.add(lesson.id);
    }
  }
  return lessons;
}

export function loadTeacherPracticeDrills(file) {
  if (!file || !fs.existsSync(file)) return [];
  const doc = readJson(file);
  if (doc.scope !== 'UNITY_CODING_ONLY' || doc.sourceKind !== 'teacher' || doc.synthetic !== true || doc.authority !== 'PRACTICE_ONLY' || doc.runtimePromotionAllowed !== false || !Array.isArray(doc.drills)) {
    throw new Error('Unity practice drill contract mismatch');
  }
  const seen = new Set();
  return doc.drills.filter((drill) => {
    if (!drill?.id || !drill?.scenario || !drill?.answer || seen.has(drill.id)) return false;
    seen.add(drill.id);
    return true;
  });
}

export function buildPracticeTeacherSamples({ drillsFile, outDir, maxPractice = 96 }) {
  const drills = loadTeacherPracticeDrills(drillsFile).slice(0, Math.max(0, maxPractice));
  fs.mkdirSync(outDir, { recursive: true });
  let written = 0;
  for (const drill of drills) {
    const sample = {
      version: 1,
      instruction: `Unity 실전 판단 연습: ${clean(drill.scenario)}`,
      input: JSON.stringify({ topic: clean(drill.topic), avoid: drill.avoid ?? [], verify: drill.verify ?? [] }, null, 2),
      output: [
        clean(drill.answer),
        Array.isArray(drill.avoid) && drill.avoid.length ? `피해야 할 접근: ${drill.avoid.join(' / ')}` : '',
        Array.isArray(drill.verify) && drill.verify.length ? `검증 포인트: ${drill.verify.join(' / ')}` : '',
      ].filter(Boolean).join('\n'),
      taskType: 'unity',
      difficulty: clean(drill.difficulty) || 'unity-build',
      lifecycle: 'active',
      teacher: true,
      synthetic: true,
      practiceOnly: true,
      sourceKind: 'teacher',
      runtimePromotionAllowed: false,
      project: 'unity-teacher-practice',
      teacherId: 'GPT-5.6-Sol-practice-v1',
      sourceRevision: `teacher-practice-v1:${clean(drill.id)}`,
      provenance: {
        sourceKind: 'teacher',
        sourceRevision: `teacher-practice-v1:${clean(drill.id)}`,
        teacherId: 'GPT-5.6-Sol-practice-v1',
        drillId: clean(drill.id),
      },
      qa: {
        teacherReview: 'PASS',
        independentQa: 'NOT_APPLICABLE',
        browserQa: 'NOT_APPLICABLE',
        runtime: 'NOT_APPLICABLE',
      },
      verification: {
        practiceOnly: true,
        productionEvidence: false,
        note: 'Teacher-authored reasoning drill. Never treat as verified production positive or runtime promotion evidence.',
      },
    };
    writeJson(path.join(outDir, `${clean(drill.id).replace(/[^A-Za-z0-9._-]/g, '_')}.json`), sample);
    written += 1;
  }
  return { practiceCandidateCount: drills.length, practiceWritten: written };
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
    rootCause: `검증된 Unity 수정 사례를 ${topics.join(', ') || 'responsibility boundary'} 관점에서 분석하고, 코드 문장을 외우지 않고 원인·판단·책임경계·효과 관계를 추출한다.`,
    responsibilityBoundary: topics.join(' + ') || 'Unity component responsibility and lifecycle boundary',
    patchScope: mastery.length ? mastery : ['기존 책임 시스템 안에서 최소한의 올바른 책임 수리를 적용한다.'],
    whyNotSmallerPatch: '한 호출이나 보간값만 바꾸면 동일 책임의 다른 상태쓰기·이동권한·수명주기·표현 경로가 남을 수 있으므로, 검증된 주변 책임 경계를 확인하고 현재 프로젝트에 다시 바인딩해야 한다.',
    regressionRisks: risksForLessons(selected),
    evidence: [
      `verified taskType=${taskType}`,
      `sourceRevision=${clean(record?.provenance?.sourceRevision ?? record?.sourceRevision ?? record?.sourceCommit)}`,
      'verification trace: CI PASS + independent QA PASS + runtime PASS',
      'transfer mode: verified knowhow may be replicated, rearranged, varied, and recombined inside the current project responsibility graph',
      ...selected.map((lesson) => `lesson=${lesson.id}:${lesson.topic}`),
    ],
  };
}

export function buildOnlineTeacherSamples({ sampleDir, lessonsFile, outDir, maxCandidates = 96, extraLessonFiles = [] }) {
  const lessons = loadTeacherLessons(lessonsFile, extraLessonFiles);
  const candidates = discoverStructuralCandidates(sampleDir, { maxCandidates }).filter((item) => item.taskType === 'unity');
  fs.mkdirSync(outDir, { recursive: true });
  let written = 0;
  for (const item of candidates) {
    const record = readJson(item.sourceFile);
    const analysis = buildOnlineTeacherAnalysis(record, lessons);
    const enriched = buildDistilledStructuralSample(record, analysis, { teacherModel: 'GPT-5.6-Sol-authored-online-curriculum-v2' });
    if (!enriched) continue;
    writeJson(path.join(outDir, `${item.candidateId.replace(/[^A-Za-z0-9._-]/g, '_')}.json`), enriched);
    written += 1;
  }
  return { version: 3, learningFocus: 'UNITY_CODING_ONLY', teacherRoute: 'GPT_AUTHORED_CURRICULUM_ON_GITHUB_HOSTED_RUNNER', paidApi: false, lessonCount: lessons.length, candidateCount: candidates.length, written };
}

function parseArgs(argv) { const out = {}; for (let i=0;i<argv.length;i+=1) { const arg=argv[i]; if (!arg.startsWith('--')) continue; const [key,inline] = arg.slice(2).split('=',2); out[key] = inline ?? argv[++i]; } return out; }
function main() {
  const args = parseArgs(process.argv.slice(2));
  const extraLessonFiles = clean(args['extra-lessons']).split(',').map((x) => x.trim()).filter(Boolean);
  const verified = buildOnlineTeacherSamples({
    sampleDir: args['sample-dir'] || 'company-learning/training-samples',
    lessonsFile: args.lessons || 'company-learning/unity-teacher-materials/core-lessons.json',
    extraLessonFiles,
    outDir: args['out-dir'] || 'tmp/unity-online-teacher-samples',
    maxCandidates: Number(args.max ?? 96),
  });
  const practice = buildPracticeTeacherSamples({
    drillsFile: args['practice-drills'] || 'company-learning/unity-teacher-materials/gpt-practice-drills.json',
    outDir: args['practice-out-dir'] || 'tmp/unity-practice-teacher-samples',
    maxPractice: Number(args['max-practice'] ?? 96),
  });
  console.log(JSON.stringify({ ...verified, ...practice }));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
