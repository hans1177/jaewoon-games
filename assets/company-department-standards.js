// 파일명: assets/company-department-standards.js
// 역할: 재운컴퍼니 각 부서가 PASS를 내기 전에 반드시 확보해야 하는 최소 검증 증거를 정의한다.
// 원칙: 말로만 평가하지 않고 실제 파일/빌드/실행 증거와 자기 부서 전문 근거가 부족하면 REVISE로 남긴다.

const clean = (value) => String(value ?? '').trim();
const freezeList = (value) => Object.freeze(Array.isArray(value) ? [...value] : []);

export const COMPANY_DEPARTMENT_ROLES = Object.freeze([
  'planning', 'graphics', 'development', 'qa', 'balance', 'music', 'intro'
]);

const COMMON_GENERIC_PRAISE = Object.freeze([
  'well-structured', 'well structured', 'solid foundation', 'no major issues',
  'no clear issues', 'good structure', 'properly designed', 'efficient',
  '잘 구성', '구조가 좋', '문제 없음', '큰 문제 없', '기반이 좋'
]);

export const COMPANY_DEPARTMENT_STANDARDS = Object.freeze({
  planning: Object.freeze({
    name: '기획', minEvidence: 2, minSpecificEvidence: 2, buildRequired: false, runtimeRequired: false,
    domainKeywords: freezeList(['core loop','gameplay loop','play loop','core fun','story','quest','progression path','game identity','핵심 루프','플레이 루프','핵심 재미','스토리','퀘스트','진행 흐름','게임 정체성']),
    requiredChecks: freezeList(['핵심 재미와 핵심 루프가 수정 전후 동일한지 확인','스토리/퀘스트/지역 진행이 의도와 충돌하지 않는지 확인','수정 범위 밖의 기획 변경을 임의로 만들지 않았는지 확인'])
  }),
  graphics: Object.freeze({
    name: '그래픽', minEvidence: 1, minSpecificEvidence: 1, buildRequired: false, runtimeRequired: false,
    domainKeywords: freezeList(['ui','layout','readability','asset','vfx','animation','motion','artbook','sprite','texture','screen','screenshot','frame','silhouette','contrast','visual','resolution','가독성','화면 구성','에셋','애니메이션','모션','아트북','스프라이트','텍스처','실루엣','대비','프레임','시각','해상도','그래픽 영향 없음']),
    requiredChecks: freezeList(['가독성/화면 구성/아트북 정체성 영향 확인','스크린샷/프레임/시각 지표가 있으면 실제 아티팩트에 결합됐는지 확인','에셋 라이선스와 모션/성능 규칙 영향 확인','영향이 없다면 실제 수정 범위를 근거로 무영향 판정'])
  }),
  development: Object.freeze({
    name: '개발', minEvidence: 2, minSpecificEvidence: 2, buildRequired: true, runtimeRequired: false,
    domainKeywords: freezeList(['.cs','.js','.mjs','.html','compile','build','dependency','serialization','save','load','null','exception','stack trace','run id','컴파일','빌드','의존성','직렬화','세이브','로드','예외','스택','파일']),
    requiredChecks: freezeList(['실제 수정 파일과 구현 범위를 확인','컴파일 또는 빌드 성공 증거를 확인','저장/데이터/의존성/확장성 회귀 위험을 확인'])
  }),
  qa: Object.freeze({
    name: 'QA', minEvidence: 2, minSpecificEvidence: 2, buildRequired: true, runtimeRequired: true,
    domainKeywords: freezeList(['test','smoke','launch','restart','reproduce','reproduction','expected','actual','bug','crash','touch','input','save','load','run id','테스트','스모크','실행','재시작','재현','기대 결과','실제 결과','버그','크래시','터치','입력','세이브','로드']),
    requiredChecks: freezeList(['빌드 또는 컴파일 성공 여부 확인','게임 실행 또는 플레이 스모크 테스트 증거 확인','이동/전투/진행/저장/재시작 중 수정 영향 범위 회귀 확인','발견 오류의 재현 조건과 수정 후 재검증 여부 확인','모바일 대상이면 터치/UI/화면 비율 문제 확인'])
  }),
  balance: Object.freeze({
    name: '밸런스', minEvidence: 1, minSpecificEvidence: 1, buildRequired: false, runtimeRequired: false,
    domainKeywords: freezeList(['damage','health','hp','reward','xp','gold','difficulty','growth','economy','cooldown','drop rate','stat','balance impact','데미지','체력','보상','경험치','골드','난이도','성장','경제','쿨다운','드롭률','수치','밸런스 영향 없음']),
    requiredChecks: freezeList(['전투 수치/성장 속도/보상 구조 변경 여부 확인','밸런스 영향이 없다면 수정 범위를 근거로 무영향 판정','영향이 있으면 이전 값과 변경 값을 비교'])
  }),
  music: Object.freeze({
    name: '음악', minEvidence: 1, minSpecificEvidence: 1, buildRequired: false, runtimeRequired: true,
    domainKeywords: freezeList(['music','bgm','audio','sound','mute','volume','mix','gesture','autoplay','license','network audio','음악','배경음','사운드','음소거','볼륨','믹스','사용자 제스처','자동재생','라이선스']),
    requiredChecks: freezeList(['첫 사용자 제스처 뒤에만 음악이 시작되는지 실제 실행으로 확인','뮤트와 볼륨 제어가 실제 런타임에서 동작하는지 확인','전투/UI 피드백을 가리지 않는 믹스인지 확인','외부 오디오는 라이선스 근거와 런타임 네트워크 비의존성을 확인'])
  }),
  intro: Object.freeze({
    name: '연출/시네마틱', minEvidence: 1, minSpecificEvidence: 1, buildRequired: false, runtimeRequired: true,
    domainKeywords: freezeList(['intro','opening','first entry','first session','skip','continue','first input','handoff','core loop','onboarding','cinematic','cutscene','scene transition','camera sequence','dialogue','story beat','presentation','intro not applicable','cutscene not applicable','인트로','오프닝','첫 진입','첫 세션','스킵','계속','첫 입력','코어 루프','온보딩','시네마틱','컷신','장면 전환','카메라 연출','대사 연출','스토리 연출','연출 없음']),
    requiredChecks: freezeList(['첫 진입에서 플레이어가 무엇을 해야 하는지 이해할 수 있고 첫 의미 있는 입력까지 막힘 없이 연결되는지 실제 실행으로 확인','인트로/오프닝/튜토리얼 진입이 존재하면 계속·스킵·종료 후 코어 루프 handoff가 정상인지 확인','컷신/시네마틱/대사/카메라/장면 전환이 존재하면 타이밍·가독성·입력 잠금·스킵·복귀가 실제 런타임에서 정상인지 확인','해당 게임에 컷신/시네마틱이 없으면 새 연출을 강제 생성하지 않고 실제 소스/런타임 근거로 NOT_APPLICABLE을 기록'])
  }),
  director: Object.freeze({
    name: '총괄', minEvidence: 0, minSpecificEvidence: 0, buildRequired: false, runtimeRequired: false,
    domainKeywords: freezeList([]),
    requiredChecks: freezeList(['7개 부서 결과가 모두 제출됐는지 확인','각 부서의 증거 게이트 통과 여부 확인','하나라도 DROP이면 DROP, 하나라도 REVISE면 REVISE 적용'])
  })
});

export function getDepartmentStandard(role = '') {
  const key = clean(role).toLowerCase();
  const standard = COMPANY_DEPARTMENT_STANDARDS[key];
  if (!standard) throw new Error(`unsupported department role: ${key || 'unknown'}`);
  return standard;
}

export function normalizeDepartmentEvidence(value, max = 12) {
  return Array.isArray(value) ? [...new Set(value.map((item) => typeof item === 'string' ? clean(item) : clean(item?.text || item?.evidence || item?.detail)).filter(Boolean))].slice(0, Math.max(0, max)) : [];
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
  if (['development','qa'].includes(clean(role).toLowerCase())) {
    if (/\b[a-z0-9_.-]+\.(?:cs|js|mjs|html|json|lua|luau)\b/i.test(text)) return true;
    if (/\b(?:run|build|test)[ #:=_-]*\d+\b/i.test(text)) return true;
  }
  return /\[(?:source|runtime|artifact|screenshot|frame):[^\]]+\]/i.test(text) && !isGenericPraiseOnly(text);
}

function addPassingConclusion(evidence, label, value) {
  const normalized = clean(value).toLowerCase();
  if (['pass','passed','success','successful','true'].includes(normalized)) evidence.push(`${label}=${normalized}`);
}

export function extractRuntimeEvidence(request = {}) {
  const evidence = [];
  evidence.push(...normalizeDepartmentEvidence(request.playTestEvidence));
  evidence.push(...normalizeDepartmentEvidence(request.runtimeEvidence));
  evidence.push(...normalizeDepartmentEvidence(request.deviceTestEvidence));
  if (request.runtimeSmokePassed === true) evidence.push('runtimeSmokePassed=true');
  addPassingConclusion(evidence, 'runtimeTestConclusion', request.runtimeTestConclusion);
  addPassingConclusion(evidence, 'deviceTestConclusion', request.deviceTestConclusion);
  addPassingConclusion(evidence, 'apkLaunchConclusion', request.apkLaunchConclusion);
  return normalizeDepartmentEvidence(evidence);
}

export function extractDepartmentRuntimeEvidence(role = '', request = {}) {
  const key = clean(role).toLowerCase();
  if (key === 'music') {
    const evidence = [...normalizeDepartmentEvidence(request.musicEvidence), ...normalizeDepartmentEvidence(request.audioRuntimeEvidence)];
    if (request.musicStartedAfterGesture === true) evidence.push('musicStartedAfterGesture=true');
    if (request.musicMuteControlPassed === true) evidence.push('musicMuteControlPassed=true');
    if (request.musicVolumeControlPassed === true) evidence.push('musicVolumeControlPassed=true');
    addPassingConclusion(evidence, 'musicRuntimeConclusion', request.musicRuntimeConclusion);
    return normalizeDepartmentEvidence(evidence);
  }
  if (key === 'intro') {
    const evidence = [
      ...normalizeDepartmentEvidence(request.introEvidence),
      ...normalizeDepartmentEvidence(request.introRuntimeEvidence),
      ...normalizeDepartmentEvidence(request.cinematicEvidence),
      ...normalizeDepartmentEvidence(request.cutsceneEvidence),
    ];
    if (request.introVisible === true) evidence.push('introVisible=true');
    if (request.introSkipPassed === true) evidence.push('introSkipPassed=true');
    if (request.introContinuePassed === true) evidence.push('introContinuePassed=true');
    if (request.firstMeaningfulInputPassed === true) evidence.push('firstMeaningfulInputPassed=true');
    if (request.introCoreLoopHandoffPassed === true) evidence.push('introCoreLoopHandoffPassed=true');
    if (request.cutscenePlaybackPassed === true) evidence.push('cutscenePlaybackPassed=true');
    if (request.cutsceneSkipPassed === true) evidence.push('cutsceneSkipPassed=true');
    if (request.sceneTransitionPassed === true) evidence.push('sceneTransitionPassed=true');
    if (request.dialogueAdvancePassed === true) evidence.push('dialogueAdvancePassed=true');
    if (request.cameraSequencePassed === true) evidence.push('cameraSequencePassed=true');
    if (request.cinematicApplicable === false) evidence.push('cutsceneNotApplicable=true');
    addPassingConclusion(evidence, 'introRuntimeConclusion', request.introRuntimeConclusion);
    addPassingConclusion(evidence, 'cinematicRuntimeConclusion', request.cinematicRuntimeConclusion);
    return normalizeDepartmentEvidence(evidence);
  }
  return extractRuntimeEvidence(request);
}

export function evaluateDepartmentEvidence({ role = '', evidence = [], request = {} } = {}) {
  const standard = getDepartmentStandard(role);
  const normalizedEvidence = normalizeDepartmentEvidence(evidence);
  const specificEvidence = normalizedEvidence.filter((item) => isDomainSpecificEvidence(role, item));
  const runtimeEvidence = extractDepartmentRuntimeEvidence(role, request);
  const buildConclusion = clean(request.buildConclusion).toLowerCase();
  const buildPassed = ['pass','passed','success','successful'].includes(buildConclusion);
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
  if (standard.runtimeRequired && runtimeEvidence.length === 0) {
    blockerCodes.push('RUNTIME_DOMAIN_EVIDENCE_REQUIRED');
    blockers.push(`${standard.name} PASS에는 실제 ${clean(role).toLowerCase()} 런타임 증거가 최소 1개 필요함`);
  }

  return Object.freeze({
    role: clean(role).toLowerCase(), passed: blockers.length === 0,
    evidenceCount: normalizedEvidence.length, minEvidence: standard.minEvidence,
    specificEvidence: freezeList(specificEvidence), specificEvidenceCount: specificEvidence.length, minSpecificEvidence: standard.minSpecificEvidence,
    buildRequired: standard.buildRequired, buildPassed, runtimeRequired: standard.runtimeRequired, runtimeEvidence,
    blockerCodes: freezeList(blockerCodes), blockers: freezeList(blockers), requiredChecks: standard.requiredChecks
  });
}
