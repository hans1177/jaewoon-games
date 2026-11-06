// 파일명: assets/vibe-diagnostics.js
// 역할: 웹/Godot 게임 오류 증상을 자연어 진단 항목으로 정규화
// 규칙: 증상만 덮지 않고 재현→원인 특정→직접 수정→회귀 QA

// 임포트: 검증된 기존 경험 메모리를 읽기 전용으로 재사용한다.
import { searchVibeExperience } from './vibe-experience-memory.js';

const SIGNATURES = Object.freeze([
  ['로딩', ['로딩', '안 열려', '빈 화면', '흰 화면', '검은 화면'], ['entry', 'asset-path', 'module'] ],
  ['입력', ['버튼', '터치', '조이스틱', '안 눌러', '이동 안', '공격 안'], ['input-binding', 'pointer-event', 'layout'] ],
  ['렌더링', ['화면', '안 보여', '잘려', '깨져', '크기', '여백'], ['canvas', 'viewport', 'safe-area', 'responsive'] ],
  ['전투', ['공격', '피해', '데미지', '죽지', '무적', '쿨타임'], ['target', 'range', 'cooldown', 'vitals'] ],
  ['스폰', ['적이 안 나와', '스폰', '웨이브', '보스'], ['spawn-condition', 'timer', 'wave-state'] ],
  ['세이브', ['저장', '불러오기', '세이브', '진행도'], ['game-id', 'save-version', 'migration', 'state'] ],
  ['성능', ['느려', '버벅', '렉', '프레임', '멈춰'], ['loop', 'catch-up', 'allocation', 'spawn-volume'] ],
  ['모션', ['문워크', '가만히', '발 미끄', '다리', '쓰러', '회피 동작', '애니메이션'], ['motion-state', 'retarget-foot-contact', 'idle-transition', 'pose-and-root-motion'] ],
  ['장면', ['추격', '퇴로', '카메라', '시선', '거미', '장면 전환'], ['scene-intent', 'navigation-reachability', 'camera-focus', 'control-return'] ],
  ['에셋', ['에셋', '재질', '텍스처', '라이브러리', '모델'], ['license-origin', 'role-style-match', 'runtime-binding', 'retarget-motion'] ],
  ['Godot', ['godot', '고도', '씬', 'gdscript', 'project.godot'], ['scene-reference', 'script-reference', 'project-config'] ],
]);

function clean(value) { return String(value ?? '').trim(); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function hasAny(value, words) { const source = clean(value).toLowerCase(); return words.some((word) => source.includes(String(word).toLowerCase())); }

export function diagnoseVibeFailure({ request = '', runtimeError = '', consoleLog = '', target = 'auto', gameId = '', experienceMemory = null } = {}) {
  const prompt = clean(request);
  const evidence = `${prompt}\n${clean(runtimeError)}\n${clean(consoleLog)}`;
  const matches = [];
  for (const [area, words, checks] of SIGNATURES) {
    if (hasAny(evidence, words)) matches.push({ area, checks });
  }
  const requestedTarget=clean(target).toLowerCase();
  const resolvedTarget=['web','godot','roblox','unity'].includes(requestedTarget)?requestedTarget:
    hasAny(evidence,['roblox','luau','로블록스'])?'roblox':
    hasAny(evidence,['unity','유니티'])?'unity':
    hasAny(evidence,['godot','고도','project.godot','gdscript'])?'godot':'web';
  // 검증되지 않은 과거 시도는 읽기 전용 권장 사례조차 되지 않는다.
  const learned = experienceMemory
    ? searchVibeExperience(experienceMemory,{
        gameId,engine:resolvedTarget,taskType:'bugfix',problem:evidence,
        text:matches.map(row=>row.area).join(' '),
      },{limit:3,minimumScore:2})
    : null;
  const verifiedRepairs=Object.freeze((learned?.matches||[])
    .filter(row=>row.record?.verified===true&&row.record?.reusable===true&&
      (row.record?.failureCause||row.record?.outcome==='PASS'))
    .map(row=>Object.freeze({
      experienceId:row.record.id,
      sourceRevision:row.record.sourceRevision||null,
      failureCause:row.record.failureCause||null,
      relevantScore:row.score,
      provenPatternIds:Object.freeze([...(row.record.reusablePatterns||[])]),
      avoidPatterns:Object.freeze([...(row.record.avoidPatterns||[])]),
      automaticSourceWrite:false,
    })));
  if (!matches.length) matches.push({ area: '일반 런타임', checks: ['재현 조건', '최초 오류 위치', '상태/참조'] });
  const steps = [
    '오류를 같은 조건으로 재현',
    '최초 발생한 오류와 호출 지점 확인',
    `대상: ${resolvedTarget}`,
    ...matches.flatMap((match) => match.checks.map((check) => `검사: ${check}`)),
    ...(verifiedRepairs.length ? ['검증된 과거 원인과 이번 런타임 증거를 대조'] : []),
    '원인 책임 파일 직접 수정',
    '같은 증상으로 재현 테스트',
    '모바일 터치/조이스틱 확인',
    '저장/불러오기 확인',
    '정식 회귀 QA',
  ];
  return Object.freeze({
    version:2, request:prompt,target:resolvedTarget,
    areas:Object.freeze(matches.map(m=>m.area)),
    checks:Object.freeze(unique(matches.flatMap(m=>m.checks))),
    verifiedRepairCandidates:verifiedRepairs,
    learningAuthority:'VERIFIED_ADVISORY_ONLY',
    steps:Object.freeze(unique(steps))
  });
}

if (typeof window !== 'undefined') window.diagnoseJaewoonVibeFailure = diagnoseVibeFailure;
