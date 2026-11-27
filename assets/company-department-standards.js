// 파일명: assets/company-department-standards.js
// 역할: 재운컴퍼니 각 부서가 PASS를 내기 전에 반드시 확보해야 하는 최소 검증 증거를 정의한다.
// 원칙: 말로만 평가하지 않고 실제 파일/빌드/실행 증거와 자기 부서 전문 근거가 부족하면 REVISE로 남긴다.

const clean = (value) => String(value ?? '').trim();
const freezeList = (value) => Object.freeze(Array.isArray(value) ? [...value] : []);

const COMMON_GENERIC_PRAISE = Object.freeze([
  'well-structured', 'well structured', 'solid foundation', 'no major issues',
  'no clear issues', 'good structure', 'properly designed', 'efficient',
  '잘 구성', '구조가 좋', '문제 없음', '큰 문제 없', '기반이 좋'
]);

export const COMPANY_DEPARTMENT_STANDARDS = Object.freeze({
  planning: Object.freeze({
    name: '기획·성장마케팅',
    minEvidence: 2,
    minSpecificEvidence: 2,
    buildRequired: false,
    runtimeRequired: false,
    domainKeywords: freezeList([
      'core loop','gameplay loop','play loop','core fun','story','quest','progression path','game identity',
      'monetization','revenue','pricing','paid item','bundle','subscription','advertising','marketing','promotion','acquisition','retention','conversion','store discovery','target player','launch timing',
      '핵심 루프','플레이 루프','핵심 재미','스토리','퀘스트','진행 흐름','게임 정체성',
      '수익화','매출','가격','판매 아이템','유료 아이템','번들','구독','광고','마케팅','홍보','유입','유지율','전환','스토어 노출','타깃 플레이어','출시 시기',
      '밸런스','난이도','보상','성장 속도','경제 수치','드롭률'
    ]),
    requiredChecks: freezeList([
      '핵심 재미와 핵심 루프가 수정 전후 동일한지 확인',
      '스토리/퀘스트/지역 진행이 의도와 충돌하지 않는지 확인',
      '수익화/가격/광고/홍보 제안이 플레이어 가치·경제·밸런스·플랫폼 정책과 충돌하지 않는지 확인',
      '적용 범위·적용 시기·측정 지표·중단 또는 롤백 조건이 근거와 함께 정의됐는지 확인',
      '유료 광고비 등 외부 재무 집행이 owner 승인 경계를 우회하지 않는지 확인',
      '수정 범위 밖의 기획 변경을 임의로 만들지 않았는지 확인',
      '기존 난이도·보상·성장·재화·드롭률 수치가 변경되었는지 원본과 비교하고 임의 밸런스 조정을 금지'
    ])
  }),
  development: Object.freeze({
    name: '개발',
    minEvidence: 2,
    minSpecificEvidence: 2,
    buildRequired: true,
    runtimeRequired: false,
    domainKeywords: freezeList([
      '.cs','.js','.mjs','.html','compile','build','dependency','serialization','save','load','null','exception','stack trace','run id',
      '컴파일','빌드','의존성','직렬화','세이브','로드','예외','스택','파일'
    ]),
    requiredChecks: freezeList([
      '실제 수정 파일과 구현 범위를 확인',
      '컴파일 또는 빌드 성공 증거를 확인',
      '저장/데이터/의존성/확장성 회귀 위험을 확인'
    ])
  }),
  qa: Object.freeze({
    name: 'QA',
    minEvidence: 2,
    minSpecificEvidence: 2,
    buildRequired: true,
    runtimeRequired: true,
    domainKeywords: freezeList([
      'test','smoke','launch','restart','reproduce','reproduction','expected','actual','bug','crash','touch','input','save','load','run id',
      '테스트','스모크','실행','재시작','재현','기대 결과','실제 결과','버그','크래시','터치','입력','세이브','로드',
      '밸런스','데미지','체력','보상','드롭률','난이도','쿨다운'
    ]),
    requiredChecks: freezeList([
      '빌드 또는 컴파일 성공 여부 확인',
      '게임 실행 또는 플레이 스모크 테스트 증거 확인',
      '이동/전투/진행/저장/재시작 중 수정 영향 범위 회귀 확인',
      '발견 오류의 재현 조건과 수정 후 재검증 여부 확인',
      '모바일 대상이면 터치/UI/화면 비율 문제 확인',
      '기존 전투 수치·난이도·성장·보상·드롭률과 저장 키가 수정 전후 보존되는지 검증'
    ])
  }),
  graphics: Object.freeze({
    name: '그래픽',
    minEvidence: 1,
    minSpecificEvidence: 1,
    buildRequired: false,
    runtimeRequired: false,
    domainKeywords: freezeList([
      'ui','layout','readability','asset','vfx','animation','motion','artbook','sprite','texture','screen','visual','resolution',
      '가독성','화면 구성','에셋','애니메이션','모션','아트북','스프라이트','텍스처','시각','해상도','그래픽 영향 없음'
    ]),
    requiredChecks: freezeList([
      '가독성/화면 구성/아트북 정체성 영향 확인',
      '에셋 라이선스와 모션/성능 규칙 영향 확인',
      '영향이 없다면 실제 수정 범위를 근거로 무영향 판정'
    ])
  }),
  // [현행 정식 오디오부] 다른 부서가 오디오 작업 근거를 대신 승인하지 않는다.
  audio: Object.freeze({
    name: '오디오',
    minEvidence: 1,
    minSpecificEvidence: 1,
    buildRequired: false,
    runtimeRequired: false,
    domainKeywords: freezeList([
      'audio','sfx','bgm','music','sound','mixer','volume','mute','playback','audiosource',
      'audio event','spatial audio','.wav','.ogg','.mp3',
      '오디오','효과음','배경음','배경음악','음악','사운드','음소거','음량','재생','소리','공간음향','오디오 영향 없음'
    ]),
    requiredChecks: freezeList([
      '실제 수정 파일과 사운드 이벤트·음원·재생 책임 함수의 연결 상태 확인',
      '게임 행동·입력·피격 시점에 대응하는 SFX/BGM 타이밍과 중복 재생·음량·음소거 확인',
      '모바일 오디오 재생 제한·성능·파일 라이선스/권리·플랫폼 호환성 확인',
      '오디오 소스 변경 시 실제 재생/스모크 근거를 확보하고 없으면 미검증으로 기록',
      '오디오 영향이 없다면 수정한 파일·범위를 근거로 무영향을 확인'
    ])
  }),
  // [과거 기록 호환] balance는 더 이상 독립 실행 부서가 아니며 기존 검증 자료만 읽는다.
  balance: Object.freeze({
    name: '밸런스',
    minEvidence: 1,
    minSpecificEvidence: 1,
    buildRequired: false,
    runtimeRequired: false,
    domainKeywords: freezeList([
      'damage','health','hp','reward','xp','gold','difficulty','growth','economy','cooldown','drop rate','stat','balance impact',
      '데미지','체력','보상','경험치','골드','난이도','성장','경제','쿨다운','드롭률','수치','밸런스 영향 없음'
    ]),
    requiredChecks: freezeList([
      '전투 수치/성장 속도/보상 구조 변경 여부 확인',
      '밸런스 영향이 없다면 수정 범위를 근거로 무영향 판정',
      '영향이 있으면 이전 값과 변경 값을 비교'
    ])
  }),
  director: Object.freeze({
    name: '총괄',
    minEvidence: 0,
    minSpecificEvidence: 0,
    buildRequired: false,
    runtimeRequired: false,
    domainKeywords: freezeList([]),
    requiredChecks: freezeList([
      '5개 부서 결과가 모두 제출됐는지 확인',
      '각 부서의 증거 게이트 통과 여부 확인',
      '하나라도 DROP이면 DROP, 하나라도 REVISE면 REVISE 적용'
    ])
  })
});

export function getDepartmentStandard(role = '') {
  const key = clean(role).toLowerCase();
  const standard = COMPANY_DEPARTMENT_STANDARDS[key];
  if (!standard) throw new Error(`unsupported department role: ${key || 'unknown'}`);
  return standard;
}

export function normalizeDepartmentEvidence(value, max = 12) {
  return Array.isArray(value)
    ? [...new Set(value.map(clean).filter(Boolean))].slice(0, Math.max(0, max))
    : [];
}

function isGenericPraiseOnly(text = '') {
  const normalized = clean(text).toLowerCase();
  if (!normalized) return true;
  return COMMON_GENERIC_PRAISE.some((phrase) => normalized.includes(phrase));
}

export function isDomainSpecificEvidence(role = '', evidence = '') {
  const standard = getDepartmentStandard(role);
  const text = clean(evidence).toLowerCase();
  if (!text || isGenericPraiseOnly(text)) return false;
  if (standard.domainKeywords.some((keyword) => text.includes(keyword.toLowerCase()))) return true;
  // 실제 경로/파일/실행 식별자가 있으면 개발·QA에서 구체 근거로 인정한다.
  if (['development','qa'].includes(clean(role).toLowerCase())) {
    if (/\b[a-z0-9_.-]+\.(?:cs|js|mjs|html|json)\b/i.test(text)) return true;
    if (/\b(?:run|build|test)[ #:=_-]*\d+\b/i.test(text)) return true;
  }
  return false;
}

export function extractRuntimeEvidence(request = {}) {
  const evidence = [];
  evidence.push(...normalizeDepartmentEvidence(request.playTestEvidence));
  evidence.push(...normalizeDepartmentEvidence(request.runtimeEvidence));
  evidence.push(...normalizeDepartmentEvidence(request.deviceTestEvidence));

  const addConclusion = (label, value) => {
    const normalized = clean(value).toLowerCase();
    if (['pass', 'passed', 'success', 'successful'].includes(normalized)) evidence.push(`${label}=${normalized}`);
  };
  if (request.runtimeSmokePassed === true) evidence.push('runtimeSmokePassed=true');
  addConclusion('runtimeTestConclusion', request.runtimeTestConclusion);
  addConclusion('deviceTestConclusion', request.deviceTestConclusion);
  addConclusion('apkLaunchConclusion', request.apkLaunchConclusion);

  return normalizeDepartmentEvidence(evidence);
}

export function evaluateDepartmentEvidence({ role = '', evidence = [], request = {} } = {}) {
  const standard = getDepartmentStandard(role);
  const normalizedEvidence = normalizeDepartmentEvidence(evidence);
  const specificEvidence = normalizedEvidence.filter((item) => isDomainSpecificEvidence(role, item));
  const runtimeEvidence = extractRuntimeEvidence(request);
  const buildConclusion = clean(request.buildConclusion).toLowerCase();
  const buildPassed = ['pass', 'passed', 'success', 'successful'].includes(buildConclusion);
  const blockers = [];
  const blockerCodes = [];

  if (normalizedEvidence.length < standard.minEvidence) {
    blockerCodes.push('INSUFFICIENT_DEPARTMENT_EVIDENCE');
    blockers.push(`${standard.name} PASS 근거가 부족함: 최소 ${standard.minEvidence}개, 현재 ${normalizedEvidence.length}개`);
  }
  if (specificEvidence.length < standard.minSpecificEvidence) {
    blockerCodes.push('DOMAIN_SPECIFIC_EVIDENCE_REQUIRED');
    blockers.push(`${standard.name} PASS에는 자기 부서 업무와 직접 연결된 구체 근거가 최소 ${standard.minSpecificEvidence}개 필요함 (현재: ${specificEvidence.length})`);
  }
  if (standard.buildRequired && !buildPassed) {
    blockerCodes.push('BUILD_EVIDENCE_REQUIRED');
    blockers.push(`${standard.name} PASS에는 성공한 컴파일/빌드 증거가 필요함 (현재: ${buildConclusion || 'unknown'})`);
  }
  // [오디오 증거] 일반 실행 성공과 실제 음성 출력 관측은 별개로 판정한다.
  const changedFiles = normalizeDepartmentEvidence([
    ...(Array.isArray(request.changedFiles) ? request.changedFiles : []),
    ...(Array.isArray(request.modificationFiles) ? request.modificationFiles : [])
  ]);
  const audioChange = clean(role).toLowerCase() === 'audio' &&
    (/(?:audio|sound|sfx|music|bgm|\.wav|\.ogg|\.mp3|효과음|오디오|사운드|배경음악|음악)/i
      .test([clean(request.scope), ...changedFiles].join(' ')) ||
      normalizedEvidence.some(item => /(?:\.(?:wav|ogg|mp3)|\baudio[\w./-]*\.(?:js|mjs|ts|cs)\b)/i.test(item) &&
        !/(?:영향 없음|no audio impact)/i.test(item)));
  // 게임·수정 리비전·실행 ID·이벤트·비무음 프레임·캡처 해시가 일치해야 한다.
  // 단순 '재생 확인' 설명 또는 일반 스모크 PASS는 오디오 재생 증거가 아니다.
  const audioPlaybackEvidence = Array.isArray(request.audioPlaybackEvidence)
    ? request.audioPlaybackEvidence.filter(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
      const artifact = clean(item.captureArtifact);
      return clean(item.gameId) === clean(request.gameId) && !!clean(request.gameId) &&
        /^[0-9a-f]{40}$/i.test(clean(request.modificationCommit)) &&
        clean(item.sourceRevision).toLowerCase() === clean(request.modificationCommit).toLowerCase() &&
        Number.isSafeInteger(item.runId) && item.runId > 0 &&
        !!clean(item.eventId) && item.eventId.length <= 160 &&
        Number.isSafeInteger(item.playbackCount) && item.playbackCount > 0 &&
        Number.isSafeInteger(item.nonSilentFrames) && item.nonSilentFrames > 0 &&
        artifact.length > 0 && artifact.length <= 500 &&
        !artifact.includes('..') && !artifact.startsWith('/') &&
        /^[0-9a-f]{64}$/i.test(clean(item.artifactSha256)) &&
        clean(item.result).toUpperCase() === 'PASS';
    }) : [];
  if (standard.runtimeRequired && runtimeEvidence.length === 0) {
    blockerCodes.push('RUNTIME_PLAY_EVIDENCE_REQUIRED');
    blockers.push('QA PASS에는 실제 게임 실행/플레이 스모크 테스트 증거가 최소 1개 필요함');
  }
  if (audioChange && audioPlaybackEvidence.length === 0) {
    blockerCodes.push('AUDIO_PLAYBACK_CAPTURE_REQUIRED');
    blockers.push('오디오 변경에는 동일 게임·리비전의 실행 ID, 사운드 이벤트, 비무음 재생 캡처 및 해시 근거가 필요함');
  }

  return Object.freeze({
    role: clean(role).toLowerCase(),
    passed: blockers.length === 0,
    evidenceCount: normalizedEvidence.length,
    minEvidence: standard.minEvidence,
    specificEvidence: freezeList(specificEvidence),
    specificEvidenceCount: specificEvidence.length,
    minSpecificEvidence: standard.minSpecificEvidence,
    buildRequired: standard.buildRequired,
    buildPassed,
    runtimeRequired: standard.runtimeRequired || audioChange,
    runtimeEvidence,
    audioPlaybackCaptureCount: audioPlaybackEvidence.length,
    blockerCodes: freezeList(blockerCodes),
    blockers: freezeList(blockers),
    requiredChecks: standard.requiredChecks
  });
}
