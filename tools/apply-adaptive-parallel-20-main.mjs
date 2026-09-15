import fs from 'node:fs';

function replaceExact(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`PATCH_TARGET_NOT_FOUND:${label}`);
  return text.replace(from, to);
}

const flowFile='COMPANY_FLOW.md';
let flow=fs.readFileSync(flowFile,'utf8');
flow=replaceExact(flow,`  developmentConcurrency:\n    scope: DEVELOPMENT_CONFIRMED_SELECTED_PLATFORM_GAME_IMPLEMENTATION\n    concurrentGameWipTarget: 6\n    concurrentGameWipMax: 6\n    globalAcrossConfiguredSelectedPlatformExecutors: true\n    parallelExecutionDefault: true\n    webValidationParallelismTarget: 6\n    webValidationParallelismMax: 6\n    independentGamesMustRunInParallelWhenCapacityExists: true\n    sharedRuntimeStatePersistedBySingleAggregationStep: true\n    validationTiers:\n      - MICRO_TARGETED_CHECK\n      - FAST_INITIAL_INTEGRATION\n      - FULL_FINAL_VALIDATION\n    qualityAndEvidenceGatesUnchanged: true\n    representativeCanaryMayTemporarilyReduceActiveWorkers: true\n    runtimeRunnerCapacityMayReduceActualConcurrencyWithoutChangingParallelFirstPolicy: true`, `  developmentConcurrency:\n    scope: DEVELOPMENT_CONFIRMED_SELECTED_PLATFORM_GAME_IMPLEMENTATION\n    concurrentGameWipTarget: 20\n    concurrentGameWipMax: 20\n    globalAcrossConfiguredSelectedPlatformExecutors: true\n    parallelExecutionDefault: true\n    webValidationParallelismTarget: 20\n    webValidationParallelismMax: 20\n    adaptiveBackpressureSteps: [20, 16, 12, 8, 4]\n    independentGamesMustRunInParallelWhenCapacityExists: true\n    sameSourceRootParallelAllowedWhenResponsibleFilesExplicitAndDisjoint: true\n    sameResponsibleFileParallelForbidden: true\n    sharedSaveSchemaWritesExclusive: true\n    centralPolicyWritesExclusive: true\n    parallelismContractGateRequired: true\n    sharedRuntimeStatePersistedBySingleAggregationStep: true\n    validationTiers:\n      - MICRO_TARGETED_CHECK\n      - FAST_INITIAL_INTEGRATION\n      - FULL_FINAL_VALIDATION\n    qualityAndEvidenceGatesUnchanged: true\n    representativeCanaryMayTemporarilyReduceActiveWorkers: true\n    runtimeRunnerCapacityMayReduceActualConcurrencyWithoutChangingParallelFirstPolicy: true`, 'COMPANY_FLOW developmentConcurrency');
fs.writeFileSync(flowFile,flow,'utf8');

const archFile='VIBE2_PARALLEL_ARCHITECTURE.md';
let arch=fs.readFileSync(archFile,'utf8');
const reps=[
  ['- 같은 source root 또는 같은 책임 파일은 동시에 수정하지 않는다.','- 같은 source root도 책임 파일이 명시되고 서로 겹치지 않을 때만 병렬 허용하며, 같은 책임 파일은 동시에 수정하지 않는다.'],
  ['- 운영 최대 동시 게임 작업 수: `4`','- 운영 최대 동시 게임 작업 수: `20`'],
  ['운영 최대 동시성은 현재 `4`이며 하드 상한은 큐 코드에서 `8`로 제한한다.','운영 최대 동시성은 `20`이며 runner·runtime·queue·planner·worker matrix의 하드 상한도 모두 `20`으로 통일한다.'],
  ['| `unity` | Unity 작업 | 1 |\n| `web` | Web 테스트베드/웹 작업 | 1 |\n| `verification` | QA, inspect, research | 1 |\n| `support` | 기타 지원 작업 | 1 |','| `unity` | Unity 작업 | 3 |\n| `web` | Web 테스트베드/웹 작업 | 7 |\n| `verification` | QA, inspect, research | 5 |\n| `support` | 기타 지원 작업 | 5 |'],
  ['동시에 실행할 수 없는 경우:\n\n- 같은 `sourceRoot`\n- 같은 `responsibleFiles`\n- 1분류 Unity feature 작업이 이미 집중 슬롯을 점유한 경우\n\n핵심 규칙:\n\n```text\n같은 source root  = 병렬 금지\n같은 책임 파일    = 병렬 금지\n다른 source root  = 조건 충족 시 병렬 허용\n1분류 Unity feature = 항상 집중 슬롯 1개\n```','동시에 실행할 수 없는 경우:\n\n- 같은 `sourceRoot`이면서 책임 파일이 없거나 겹치는 경우\n- 같은 `responsibleFiles`\n- 같은 세이브 스키마 또는 중앙 정책 파일을 동시에 쓰려는 경우\n- 1분류 Unity feature 작업이 이미 집중 슬롯을 점유한 경우\n\n핵심 규칙:\n\n```text\n같은 source root + 명시된 disjoint 책임 파일 = 병렬 허용\n같은 source root + 책임 파일 미지정/중복      = 병렬 금지\n같은 책임 파일                               = 병렬 금지\n세이브 스키마/중앙 정책 동시 쓰기             = 병렬 금지\n다른 source root                             = 조건 충족 시 병렬 허용\n1분류 Unity feature                          = 항상 집중 슬롯 1개\n```'],
  ['즉 전체 동시성은 4지만 1분류 Unity 본개발을 4개 동시에 돌리는 구조가 아니다.','즉 전체 최대 동시성은 20이지만 1분류 Unity 본개발은 집중 슬롯 1개만 유지한다.'],
  ['무조건 4개 worker를 유지하지 않는다.','무조건 20개 worker를 유지하지 않는다.'],
  ['현재 규칙:\n\n- QA 대기 작업이 2개 이상이면 최대 3\n- QA 대기 작업이 3개 이상이면 최대 2\n- 최근 재시도 실패가 3개 이상이면 최대 2','현재 규칙:\n\n- QA 대기 또는 최근 재시도 실패가 2개 이상이면 최대 16\n- 4개 이상이면 최대 12\n- 6개 이상이면 최대 8\n- 8개 이상이면 최대 4\n\n즉 정상 최대치는 20이며 압력이 커질수록 `20 → 16 → 12 → 8 → 4`로 자동 축소한다.'],
  ['10. paid resource 금지 유지 여부','10. paid resource 금지 유지 여부\n11. `COMPANY_FLOW.md`의 병렬 목표/최대값이 20인지\n12. runtime·queue·planner·runner 숫자가 모두 20으로 일치하는지\n13. `PARALLELISM_CONTRACT_GATE`가 불일치를 BLOCKER로 잡는지'],
  ['- 동일 source root 동시 수정 금지\n- 동일 책임 파일 동시 수정 금지','- 동일 source root는 책임 파일이 명시되고 서로 겹치지 않을 때만 병렬 허용\n- 동일 책임 파일 동시 수정 금지\n- 세이브 스키마·중앙 정책 파일 동시 쓰기 금지\n- 병렬 설정 불일치는 `PARALLELISM_CONTRACT_GATE` BLOCKER']
];
for(const [from,to] of reps) arch=replaceExact(arch,from,to,`ARCH:${from.slice(0,32)}`);
fs.writeFileSync(archFile,arch,'utf8');

const testFile='qa/vibe2-parallelism-main-contract.test.mjs';
const testLines=[
  "import test from 'node:test';",
  "import assert from 'node:assert/strict';",
  "import fs from 'node:fs';",
  '',
  "const flow=fs.readFileSync('COMPANY_FLOW.md','utf8');",
  "const runner=fs.readFileSync('.github/workflows/vibe2-24h-runner.yml','utf8');",
  "const arch=fs.readFileSync('VIBE2_PARALLEL_ARCHITECTURE.md','utf8');",
  '',
  "test('PARALLELISM_CONTRACT_GATE keeps main policy and runner unified at 20',()=>{",
  '  for(const token of [',
  "    'concurrentGameWipTarget: 20',",
  "    'concurrentGameWipMax: 20',",
  "    'webValidationParallelismTarget: 20',",
  "    'webValidationParallelismMax: 20',",
  "    'adaptiveBackpressureSteps: [20, 16, 12, 8, 4]',",
  "    'sameSourceRootParallelAllowedWhenResponsibleFilesExplicitAndDisjoint: true',",
  "    'sameResponsibleFileParallelForbidden: true',",
  "    'sharedSaveSchemaWritesExclusive: true',",
  "    'centralPolicyWritesExclusive: true',",
  "    'parallelismContractGateRequired: true'",
  '  ]) assert.ok(flow.includes(token),token);',
  '  assert.ok(runner.includes("VIBE2_MAX_CONCURRENT_GAME_TASKS: \'20\'"));',
  "  assert.ok(runner.includes('Math.min(20, Number(process.env.VIBE2_MAX_CONCURRENT_GAME_TASKS) || 20)'));",
  "  assert.ok(arch.includes('운영 최대 동시 게임 작업 수: `20`'));",
  "  assert.ok(arch.includes('20 → 16 → 12 → 8 → 4'));",
  "  assert.ok(arch.includes('PARALLELISM_CONTRACT_GATE'));",
  '});',
  ''
];
fs.writeFileSync(testFile,testLines.join('\n'),'utf8');

console.log('ADAPTIVE_PARALLEL_20_MAIN_MIGRATION=PASS');
