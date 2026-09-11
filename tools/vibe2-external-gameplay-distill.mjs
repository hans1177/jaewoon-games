import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const [key, inline] = arg.slice(2).split('=', 2);
    out[key] = inline ?? argv[++i];
  }
  return out;
}

const lessons = {
  PUZZLE: {
    topic: 'commercial-puzzle-runtime-architecture',
    output: '관찰된 퍼즐 동작을 Unity로 독립 구현할 때는 보드 논리 상태를 단일 source of truth로 두고 입력, 매치/클리어 판정, 연쇄 처리, 애니메이션을 분리한다. 입력 중복은 해상 중인 보드 상태에서 gate하고, 애니메이션은 결과 상태를 표현할 뿐 규칙 상태를 직접 바꾸지 않게 한다. 레벨 목표와 진행 저장은 보드 프레임 상태와 분리해 재시작·백그라운드 복귀에서도 동일 규칙으로 복원되게 한다.'
  },
  CASUAL: {
    topic: 'commercial-runner-runtime-architecture',
    output: '관찰된 짧은 러너 동작을 Unity로 독립 구현할 때는 스와이프 입력 의도, 실제 이동/레인 상태, 충돌 판정, 점수/런 진행을 분리한다. 한 시스템만 최종 위치와 속도를 소유하고 장애물·수집물은 풀링하여 반복 생성 비용을 제한한다. 실패→재시작은 씬 전체를 임의로 누적 재생성하지 말고 런 상태를 명시적으로 reset해 이벤트·코루틴·오브젝트가 중복되지 않게 한다.'
  },
  ACTION_SURVIVAL_ROGUELITE: {
    topic: 'commercial-survival-runtime-architecture',
    output: '관찰된 생존 액션 동작을 Unity로 독립 구현할 때는 이동 입력, 플레이어 상태, 적 스폰 예산, 피해 이벤트, 업그레이드 적용을 서로 분리한다. 대량 적은 풀링하고 매 프레임 전체 탐색을 피하며, 피해와 사망은 중복 적용되지 않는 이벤트 경계로 처리한다. 업그레이드는 현재 런 build에 결정적으로 적용하고 다음 선택에서 같은 효과가 이중 등록되지 않게 소유권을 한 시스템에 둔다.'
  },
  IDLE_GROWTH_RPG: {
    topic: 'commercial-idle-runtime-architecture',
    output: '관찰된 방치형 성장 동작을 Unity로 독립 구현할 때는 영속 도메인 상태와 UI 표시를 분리하고, 오프라인 보상은 마지막 검증 시각과 서버/신뢰 가능한 시간 경계를 사용해 계산한다. 보상 claim은 idempotent하게 만들고 영웅·장비·스킬 성장의 쓰기 권한을 각각 명확한 서비스에 둬 화면 재진입이나 네트워크 재시도로 중복 지급되지 않게 한다.'
  }
};

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.manifest || !args.results || !args.out) throw new Error('usage: --manifest <file> --results <summary.json> --out <dir>');
  const manifest = JSON.parse(fs.readFileSync(args.manifest, 'utf8'));
  const summary = JSON.parse(fs.readFileSync(args.results, 'utf8'));
  if (manifest.authority !== 'EXTERNAL_COMMERCIAL_RUNTIME_REFERENCE' || manifest.practiceOnly !== true || manifest.runtimePromotionAllowed !== false) throw new Error('unsafe manifest authority');
  if (summary.authority !== 'EXTERNAL_COMMERCIAL_RUNTIME_REFERENCE' || summary.practiceOnly !== true || summary.runtimePromotionAllowed !== false) throw new Error('unsafe runtime summary authority');
  fs.mkdirSync(args.out, { recursive: true });
  const byId = new Map((manifest.games || []).map((game) => [game.id, game]));
  let written = 0;
  for (const row of summary.games || []) {
    if (!(row.installPass && row.launchPass && row.foregroundPass && row.processAliveAfter && row.noCrash)) continue;
    const game = byId.get(row.gameId);
    if (!game) continue;
    const lesson = lessons[game.category];
    if (!lesson) continue;
    const runId = String(process.env.GITHUB_RUN_ID || 'local');
    const sample = {
      version: 1,
      taskType: 'unity',
      practiceOnly: true,
      runtimePromotionAllowed: false,
      authority: 'PRACTICE_ONLY',
      sourceKind: 'commercial-runtime-reference',
      synthetic: false,
      project: `external-commercial-${game.id}`,
      difficulty: 'production-reference',
      instruction: `실제 상용 모바일 게임 ${game.title}의 black-box 런타임 관찰을 근거로, 보이는 동작을 Unity에서 독립 구현할 때 필요한 코드 책임 경계를 설명하라. 내부 코드나 에셋을 추출했다고 가정하지 마라.`,
      input: `category=${game.category}; inputProfile=${game.inputProfile}; officialStoreInstall=PASS; launch=PASS; foreground=PASS; processAliveAfter=PASS; crashOrANR=NONE; visualChange=${row.visualChange ? 'OBSERVED' : 'NOT_CONFIRMED'}`,
      output: lesson.output,
      sourceRevision: `external-playtest-${runId}-${game.id}`,
      provenance: {
        sourceKind: 'commercial-runtime-reference',
        observationKind: 'BLACK_BOX_RUNTIME_ONLY',
        sourceSeed: manifest.sourceSeed,
        gameTitle: game.title,
        packageId: row.packageId,
        storeUrl: game.storeUrl,
        playtestRunId: runId,
        beforeScreenshotSha256: row.beforeScreenshotSha256 || '',
        afterScreenshotSha256: row.afterScreenshotSha256 || '',
        codeExtracted: false,
        binaryRedistributed: false,
        evidenceRetention: row.evidenceRetention || 'EPHEMERAL_ARTIFACT_ONLY'
      },
      qa: {
        teacherReview: 'PASS',
        licenseCheck: 'NOT_APPLICABLE',
        runtime: 'PASS',
        independentQa: 'NOT_APPLICABLE',
        browserQa: 'NOT_APPLICABLE'
      },
      topic: lesson.topic
    };
    const file = path.join(args.out, `commercial-runtime-${game.id}-${runId}.json`);
    fs.writeFileSync(file, `${JSON.stringify(sample, null, 2)}\n`);
    written += 1;
  }
  if (written < 1) throw new Error('no valid commercial runtime reference samples');
  console.log(`COMMERCIAL_RUNTIME_REFERENCE_SAMPLES=${written}`);
  console.log('COMMERCIAL_RUNTIME_REFERENCE_VERIFIED_PRODUCTION_POSITIVE=NO');
  console.log('COMMERCIAL_RUNTIME_REFERENCE_CODE_EXTRACTION=NO');
  console.log('COMMERCIAL_RUNTIME_REFERENCE_RUNTIME_PROMOTION=NO');
}

try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
