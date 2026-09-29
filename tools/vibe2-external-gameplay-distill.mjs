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
    tags: ['board-state','goal-loop','combo-feedback','level-progression','touch-input'],
    output: '관찰된 퍼즐 동작을 Unity로 독립 구현할 때는 보드 논리 상태를 단일 source of truth로 두고 입력, 매치/클리어 판정, 연쇄 처리, 애니메이션을 분리한다. 입력 중복은 해상 중인 보드 상태에서 gate하고, 애니메이션은 결과 상태를 표현할 뿐 규칙 상태를 직접 바꾸지 않게 한다. 레벨 목표와 진행 저장은 보드 프레임 상태와 분리해 재시작·백그라운드 복귀에서도 동일 규칙으로 복원되게 한다.'
  },
  CASUAL: {
    topic: 'commercial-casual-runtime-architecture',
    tags: ['short-session','simple-input','fast-retry','score-loop','mobile-feedback'],
    output: '관찰된 짧은 캐주얼 동작을 Unity로 독립 구현할 때는 입력 의도, 실제 이동/행동 상태, 충돌 또는 목표 판정, 점수/런 진행을 분리한다. 한 시스템만 최종 상태를 소유하고 반복 생성 요소는 풀링하여 비용을 제한한다. 실패→재시작은 런 상태를 명시적으로 reset해 이벤트·코루틴·오브젝트가 중복되지 않게 한다.'
  },
  ACTION_SURVIVAL_ROGUELITE: {
    topic: 'commercial-survival-runtime-architecture',
    tags: ['horde-pressure','upgrade-choice','run-build','damage-events','enemy-budget'],
    output: '관찰된 생존 액션 동작을 Unity로 독립 구현할 때는 이동 입력, 플레이어 상태, 적 스폰 예산, 피해 이벤트, 업그레이드 적용을 서로 분리한다. 대량 적은 풀링하고 매 프레임 전체 탐색을 피하며, 피해와 사망은 중복 적용되지 않는 이벤트 경계로 처리한다. 업그레이드는 현재 런 build에 결정적으로 적용하고 다음 선택에서 같은 효과가 이중 등록되지 않게 소유권을 한 시스템에 둔다.'
  },
  IDLE_GROWTH_RPG: {
    topic: 'commercial-idle-runtime-architecture',
    tags: ['idle-reward','offline-progress','upgrade-layer','claim-idempotency','persistent-growth'],
    output: '관찰된 방치형 성장 동작을 Unity로 독립 구현할 때는 영속 도메인 상태와 UI 표시를 분리하고, 오프라인 보상은 마지막 검증 시각과 서버/신뢰 가능한 시간 경계를 사용해 계산한다. 보상 claim은 idempotent하게 만들고 영웅·장비·스킬 성장의 쓰기 권한을 각각 명확한 서비스에 둬 화면 재진입이나 네트워크 재시도로 중복 지급되지 않게 한다.'
  },
  ACTION_PVP: {
    topic: 'commercial-action-pvp-runtime-architecture',
    tags: ['short-match','arena-positioning','ability-cooldown','team-role','combat-feedback'],
    output: '관찰된 모바일 PvP 동작을 독립 구현할 때는 이동 입력, 조준/능력 입력, 전투 상태, 쿨다운, 점수 및 매치 상태를 분리한다. 짧은 매치에서 네트워크 권한과 로컬 피드백을 구분하고, 능력 효과와 판정은 한 책임 계층에서 소유하도록 설계한다.'
  },
  STRATEGY_BASE: {
    topic: 'commercial-base-strategy-runtime-architecture',
    tags: ['base-layout','resource-loop','upgrade-queue','unit-composition','attack-defense-cycle'],
    output: '관찰된 기지 전략 동작을 독립 구현할 때는 기지 배치 상태, 자원 원장, 업그레이드 큐, 유닛 편성, 공격/방어 결과를 분리한다. 자원 차감과 업그레이드 완료는 중복 적용되지 않게 하고, 전투 결과와 영속 기지 상태의 쓰기 경계를 명확히 둔다.'
  },
  CASUAL_BOARD: {
    topic: 'commercial-casual-board-runtime-architecture',
    tags: ['board-progression','dice-or-step-loop','reward-cycle','collection','event-layer'],
    output: '관찰된 캐주얼 보드 진행 동작을 독립 구현할 때는 이동 결과, 보드 칸 효과, 보상 원장, 수집 진행, 이벤트 상태를 분리한다. 보상은 결과 이벤트를 통해 한 번만 반영하고 보드 이동 애니메이션이 실제 경제 상태를 직접 변경하지 않도록 한다.'
  },
  LOCATION_COLLECTION_RPG: {
    topic: 'commercial-location-collection-runtime-architecture',
    tags: ['map-exploration','collection-loop','encounter-state','location-context','progression'],
    output: '관찰된 위치 기반 수집 동작을 독립 구현할 때는 위치 컨텍스트, 지도 표현, 조우 상태, 수집 인벤토리, 성장 상태를 분리한다. 위치 입력과 게임 상태를 직접 결합하지 말고 검증 계층을 두며, 수집/보상 반영은 재시도에도 중복되지 않게 한다.'
  },
  CARD_COLLECTION: {
    topic: 'commercial-card-collection-runtime-architecture',
    tags: ['collection','deck-or-loadout','pack-flow','battle-state','rarity-presentation'],
    output: '관찰된 카드 수집 동작을 독립 구현할 때는 보유 컬렉션, 덱/로드아웃, 획득 연출, 전투 상태, 메타 진행을 분리한다. 카드 데이터와 UI 연출을 분리하고 획득/소모 원장은 idempotent하게 처리한다.'
  },
  STRATEGY_SURVIVAL: {
    topic: 'commercial-survival-strategy-runtime-architecture',
    tags: ['settlement-growth','survival-resource','hero-or-unit-growth','event-pressure','alliance-layer'],
    output: '관찰된 생존 전략 동작을 독립 구현할 때는 정착지 상태, 생존 자원, 유닛/영웅 성장, 이벤트 압력, 소셜 또는 동맹 상태를 분리한다. 생산과 소비를 원장형으로 관리하고 장기 진행과 일시 이벤트가 서로 덮어쓰지 않게 한다.'
  },
  IDLE_TYCOON: {
    topic: 'commercial-idle-tycoon-runtime-architecture',
    tags: ['service-loop','queue-flow','income-cycle','station-upgrade','capacity-growth'],
    output: '관찰된 방치형 타이쿤 동작을 독립 구현할 때는 고객/작업 큐, 생산 또는 서비스 상태, 수익 원장, 시설 업그레이드, 수용량 성장을 분리한다. 반복 지급은 단일 경제 서비스가 소유하고 화면 애니메이션과 실제 수익 반영을 분리한다.'
  },
  RACING: {
    topic: 'commercial-racing-runtime-architecture',
    tags: ['vehicle-control','race-progress','speed-feedback','track-pressure','upgrade-loop'],
    output: '관찰된 모바일 레이싱 동작을 독립 구현할 때는 조향·가속 입력, 차량 물리 상태, 트랙 진행, 체크포인트/순위, 업그레이드 상태를 분리한다. 입력 보조와 실제 물리 권한을 구분하고 속도 연출이 판정 상태를 직접 변경하지 않게 하며, 재시작 시 차량·트랙·타이머 상태를 명시적으로 초기화한다.'
  },
  SPORTS_FOOTBALL: {
    topic: 'commercial-football-runtime-architecture',
    tags: ['team-control','possession-state','match-clock','formation','action-feedback'],
    output: '관찰된 모바일 축구 동작을 독립 구현할 때는 선수 선택/이동 입력, 공 소유권, 패스·슛 행동, 포메이션 상태, 경기 시간과 점수를 분리한다. 시각적 공 이동과 실제 소유권 판정을 한 책임 계층에서 일관되게 관리하고 경기 재개·교체·득점 이벤트가 중복 적용되지 않게 한다.'
  },
  FPS_TACTICAL: {
    topic: 'commercial-tactical-fps-runtime-architecture',
    tags: ['aim-input','movement-state','weapon-state','round-loop','combat-feedback'],
    output: '관찰된 전술 FPS 동작을 독립 구현할 때는 이동, 시점/조준, 무기 상태, 피해 판정, 라운드 상태를 분리한다. 발사·재장전·무기교체의 상태 전이를 명시적으로 소유하고 네트워크 권한과 로컬 피드백을 구분하며, 라운드 종료 후 전투 상태가 다음 라운드로 누적되지 않게 한다.'
  },
  TOWER_DEFENSE: {
    topic: 'commercial-tower-defense-runtime-architecture',
    tags: ['lane-pressure','placement','wave-state','upgrade-path','enemy-counter'],
    output: '관찰된 타워 디펜스 동작을 독립 구현할 때는 배치 가능 위치, 타워 상태, 적 경로/웨이브 상태, 자원 원장, 업그레이드 경로를 분리한다. 공격 대상 선정과 피해 판정은 결정적인 책임 계층이 소유하고 웨이브 전환·판매·업그레이드에서 비용과 효과가 중복 반영되지 않게 한다.'
  },
  CITY_BUILDER_SIMULATION: {
    topic: 'commercial-city-builder-runtime-architecture',
    tags: ['city-layout','resource-production','population-demand','upgrade-timer','service-coverage'],
    output: '관찰된 도시 건설 동작을 독립 구현할 때는 도시 배치, 생산/소비 자원, 인구와 수요, 건설·업그레이드 타이머, 서비스 범위를 분리한다. 생산과 비용은 원장형 상태가 소유하고 건물 애니메이션과 실제 경제 상태를 분리하며 장기 타이머의 재접속 계산을 일관되게 처리한다.'
  },
  FARM_COZY: {
    topic: 'commercial-farm-cozy-runtime-architecture',
    tags: ['crop-cycle','production-chain','order-loop','inventory','expansion'],
    output: '관찰된 농장·코지 동작을 독립 구현할 때는 작물/생산 타이머, 재고, 주문/요청, 시설 상태, 확장 진행을 분리한다. 수확과 납품 보상은 한 번만 반영하고 생산 큐와 화면 연출을 분리하며, 오프라인 경과 시간이 동일한 규칙으로 복원되게 한다.'
  },
  SOCIAL_PARTY: {
    topic: 'commercial-social-party-runtime-architecture',
    tags: ['lobby-flow','role-state','round-objective','player-interaction','vote-or-result'],
    output: '관찰된 소셜 파티 동작을 독립 구현할 때는 로비, 플레이어 역할, 라운드 목표, 상호작용, 투표/결과 상태를 분리한다. 비공개 역할 정보와 공개 UI를 분리하고 서버 권한 상태가 라운드 전환을 소유하며 재접속이나 중복 입력으로 결과가 두 번 반영되지 않게 한다.'
  },
  SANDBOX_SOCIAL: {
    topic: 'commercial-social-sandbox-runtime-architecture',
    tags: ['avatar-state','world-interaction','social-space','collection','session-persistence'],
    output: '관찰된 소셜 샌드박스 동작을 독립 구현할 때는 아바타 상태, 월드 상호작용, 소셜 공간 상태, 수집/꾸미기 진행, 세션 영속성을 분리한다. 로컬 표현과 서버 권한 데이터를 구분하고 여러 공간 이동과 재접속에서도 소유·진행 상태가 중복되거나 유실되지 않게 한다.'
  },
  RHYTHM: {
    topic: 'commercial-rhythm-runtime-architecture',
    tags: ['timing-window','note-stream','input-judgement','combo-state','audio-visual-sync'],
    output: '관찰된 리듬 게임 동작을 독립 구현할 때는 오디오 시간축, 노트 스케줄, 입력 시각, 판정 윈도우, 콤보/점수 상태를 분리한다. 렌더 프레임보다 일관된 시간 기준으로 판정하고 시각 이펙트가 실제 타이밍 판정을 바꾸지 않게 하며 일시정지·재개에서 시간축 드리프트를 방지한다.'
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
      topic: lesson.topic,
      tags: lesson.tags || []
    };
    const file = path.join(args.out, `commercial-runtime-${game.id}.json`);
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
