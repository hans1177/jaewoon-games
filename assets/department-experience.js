// 파일명: assets/department-experience.js
// 역할: 재운컴퍼니 부서별 경험치를 검증된 실무 경험으로 누적하고, 레벨이 오를수록 더 강한 품질 절차를 작업 지시에 적용한다.
// 원칙: 경험치는 권한을 늘리지 않는다. 검증/대안/회귀/재사용 깊이만 강화한다.

const clean = (value) => String(value ?? '').trim();
const clampInt = (value, min = 0) => Math.max(min, Math.floor(Number(value) || 0));

export const COMPANY_DEPARTMENTS = Object.freeze([
  'planning',
  'development',
  'qa',
  'graphics',
  'balance',
  'homepage',
  'release',
  'director'
]);

export const DEPARTMENT_LEVEL_THRESHOLDS = Object.freeze([
  0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 6000
]);

export const VERIFIED_XP_REWARDS = Object.freeze({
  qaPass: 40,
  verifiedBuild: 60,
  regressionPass: 35,
  acceptedPrototype: 50,
  shippedFix: 30,
  verifiedResearch: 25,
  postmortemLearning: 8
});

const FOCUS = Object.freeze({
  planning: ['요구 누락 방지', '핵심 루프 명확화', '콘티-시스템 연결', '이전 기획 실패 패턴 재사용'],
  development: ['구현 대안 비교', '회귀 최소화', '구조 재사용', '성능/빌드 위험 조기 검증'],
  qa: ['경계조건 확대', '재현성', '회귀 범위 확대', '실패 패턴 재시험'],
  graphics: ['가독성', '에셋 일관성', '애니메이션 검증', '모바일 성능/화면 구성'],
  balance: ['수치 근거', '성장곡선', '전투 압력', '경제/보상 회귀'],
  homepage: ['공개 게이트', '링크 안정성', '모바일 접근성', '게시 회귀'],
  release: ['빌드 재현성', '해시/산출물 검증', '배포 실패 복구', '게시 승인 분리'],
  director: ['부서 충돌 조정', '증거 기반 우선순위', '리스크 분류', '핵심결정 게이트 보호']
});

function levelForXp(xp) {
  const score = clampInt(xp);
  let level = 1;
  for (let i = 0; i < DEPARTMENT_LEVEL_THRESHOLDS.length; i += 1) {
    if (score >= DEPARTMENT_LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return Math.min(10, level);
}

export function createDepartmentExperienceState(seed = {}) {
  const source = seed && typeof seed === 'object' ? seed : {};
  const sourceDepartments = source.departments && typeof source.departments === 'object' ? source.departments : {};
  const departments = {};

  for (const id of COMPANY_DEPARTMENTS) {
    const item = sourceDepartments[id] || {};
    const xp = clampInt(item.xp);
    departments[id] = Object.freeze({
      id,
      xp,
      level: levelForXp(xp),
      verifiedCompletions: clampInt(item.verifiedCompletions),
      learningEvents: clampInt(item.learningEvents),
      lastEvidence: clean(item.lastEvidence) || null
    });
  }

  return Object.freeze({
    version: 1,
    policy: Object.freeze({
      verifiedEvidenceRequired: true,
      noXpForUnverifiedAttempts: true,
      authorityNeverExpandsWithLevel: true,
      qualityProcessStrengthensWithLevel: true,
      maxLevel: 10
    }),
    departments: Object.freeze(departments)
  });
}

export function getDepartmentExperience(state, department) {
  const normalized = createDepartmentExperienceState(state);
  const id = COMPANY_DEPARTMENTS.includes(clean(department)) ? clean(department) : 'director';
  return normalized.departments[id];
}

export function createDepartmentQualityProfile(department, state = {}) {
  const experience = getDepartmentExperience(state, department);
  const level = experience.level;
  const candidateAlternatives = level >= 8 ? 3 : level >= 4 ? 2 : 1;
  const regressionDepth = level >= 9 ? 'adversarial' : level >= 6 ? 'expanded' : level >= 3 ? 'targeted' : 'baseline';
  const evidenceMinimum = Math.min(6, 1 + Math.floor((level - 1) / 2));

  return Object.freeze({
    department: experience.id,
    xp: experience.xp,
    level,
    focus: Object.freeze([...(FOCUS[experience.id] || [])]),
    evidenceMinimum,
    candidateAlternatives,
    historicalPatternRecall: level >= 3,
    peerReviewRequired: level >= 5,
    regressionDepth,
    reuseVerifiedPatterns: level >= 3,
    crossProjectTransfer: level >= 7,
    experimentBeforeRiskyChange: level >= 8,
    adversarialSelfReview: level >= 9,
    expertChecklist: level >= 10,
    authority: 'unchanged-by-experience',
    qualityRule: 'higher-level-means-more-evidence-more-alternatives-more-regression-not-more-authority'
  });
}

export function createExperienceAwareInstruction({ department, baseInstruction = '', state = {} } = {}) {
  const profile = createDepartmentQualityProfile(department, state);
  const requirements = [
    `부서 경험치 LV${profile.level} (${profile.xp} XP) 기준 적용`,
    `최소 근거 ${profile.evidenceMinimum}개 확보`,
    `구현/판정 후보 ${profile.candidateAlternatives}개 이상 검토`,
    `회귀 검증 깊이: ${profile.regressionDepth}`
  ];
  if (profile.historicalPatternRecall) requirements.push('이전 성공/실패 패턴을 먼저 회상해 재사용');
  if (profile.peerReviewRequired) requirements.push('다른 관련 부서 관점의 교차검토 포함');
  if (profile.crossProjectTransfer) requirements.push('다른 프로젝트의 검증된 패턴을 적용 가능성 검토');
  if (profile.experimentBeforeRiskyChange) requirements.push('위험 변경은 작은 기술 실험 후 본적용');
  if (profile.adversarialSelfReview) requirements.push('반례/실패 시나리오를 스스로 만들어 검증');
  if (profile.expertChecklist) requirements.push('전문가 체크리스트로 최종 산출물 누락 검사');

  return Object.freeze({
    profile,
    instruction: `${clean(baseInstruction)}\n[부서 경험치 품질 강화]\n- ${requirements.join('\n- ')}`.trim()
  });
}

export function awardDepartmentExperience(state, {
  department = '',
  reward = 'shippedFix',
  evidence = '',
  verified = false,
  outcome = 'PASS'
} = {}) {
  const normalized = createDepartmentExperienceState(state);
  const id = clean(department);
  if (!COMPANY_DEPARTMENTS.includes(id)) throw new Error(`unknown department: ${id}`);

  const proof = clean(evidence);
  const isLearningOnly = clean(outcome).toUpperCase() !== 'PASS';
  const rewardKey = isLearningOnly ? 'postmortemLearning' : clean(reward);
  const amount = clampInt(VERIFIED_XP_REWARDS[rewardKey]);

  if (!verified || !proof || amount <= 0) {
    return Object.freeze({
      awarded: false,
      reason: 'verified-evidence-required',
      state: normalized,
      department: normalized.departments[id]
    });
  }

  const current = normalized.departments[id];
  const xp = current.xp + amount;
  const nextDepartments = {};
  for (const departmentId of COMPANY_DEPARTMENTS) {
    const item = normalized.departments[departmentId];
    nextDepartments[departmentId] = departmentId === id
      ? {
          ...item,
          xp,
          level: levelForXp(xp),
          verifiedCompletions: item.verifiedCompletions + (isLearningOnly ? 0 : 1),
          learningEvents: item.learningEvents + 1,
          lastEvidence: proof
        }
      : { ...item };
  }

  const nextState = createDepartmentExperienceState({ departments: nextDepartments });
  return Object.freeze({
    awarded: true,
    amount,
    levelUp: nextState.departments[id].level > current.level,
    previous: current,
    department: nextState.departments[id],
    state: nextState
  });
}

if (typeof window !== 'undefined') {
  window.JaewoonDepartmentExperience = Object.freeze({
    createDepartmentExperienceState,
    getDepartmentExperience,
    createDepartmentQualityProfile,
    createExperienceAwareInstruction,
    awardDepartmentExperience
  });
}
