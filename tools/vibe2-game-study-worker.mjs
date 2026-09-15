// 파일명: tools/vibe2-game-study-worker.mjs
// 역할: 예약된 GAME STUDY 대상 하나를 실제 AUTO PLAYER로 관찰하고 immutable study 결과만 만든다.
// 원칙: worker는 queue/experience/control을 직접 수정하지 않는다. Experience Memory 승격은 fan-in에서만 한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadGameStudyTargets } from './vibe2-game-study-queue.mjs';
import { runWebGameStudy } from './vibe2-web-game-study.mjs';
import { runRobloxGameStudy } from './vibe2-roblox-game-study.mjs';

const clean = (value) => String(value ?? '').trim();
function readJson(file, fallback = {}) { if (!file || !fs.existsSync(file)) return fallback; return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function parseArgs(argv = process.argv.slice(2)) { const args = {}; for (const raw of argv) { if (!raw.startsWith('--')) continue; const body = raw.slice(2); const at = body.indexOf('='); if (at < 0) args[body] = true; else args[body.slice(0, at)] = body.slice(at + 1); } return args; }

function resolveTarget(targetsFile, targetId) {
  const registry = loadGameStudyTargets(readJson(targetsFile, { targets: [] }));
  const target = registry.targets.find((row) => row.id === clean(targetId));
  if (!target) throw new Error(`GAME STUDY target not found: ${targetId}`);
  if (!target.valid) throw new Error(`GAME STUDY target invalid: ${target.issues.join(',')}`);
  return target;
}

function autoPlayerDiagnostics(autoPlayer = {}) {
  const playLog = autoPlayer?.playLog || {};
  const telemetry = autoPlayer?.telemetry?.metrics || {};
  return Object.freeze({
    verified: autoPlayer?.verified === true,
    runId: clean(autoPlayer?.runId) || null,
    page: clean(playLog?.page) || null,
    inputActionCount: Number(telemetry?.inputActionCount || 0),
    checkpointPassCount: Number(telemetry?.checkpointPassCount || 0),
    checkpointCount: Number(telemetry?.checkpointCount || 0),
    runtimeErrorCount: Number(telemetry?.runtimeErrorCount || 0),
    actions: Object.freeze((playLog?.actions || []).slice(0, 24).map((row) => Object.freeze({
      id: clean(row?.id),
      type: clean(row?.type),
      dispatched: row?.dispatched === true,
      ok: row?.ok === true,
      error: clean(row?.error) || null
    }))),
    checkpoints: Object.freeze((playLog?.checkpoints || []).slice(0, 24).map((row) => Object.freeze({
      id: clean(row?.id),
      name: clean(row?.name) || null,
      required: row?.required !== false,
      pass: row?.pass === true
    }))),
    errors: Object.freeze((playLog?.errors || []).slice(0, 12).map((row) => typeof row === 'string' ? row : Object.freeze({
      type: clean(row?.type) || 'runtime-error',
      actionId: clean(row?.actionId) || null,
      message: clean(row?.message) || 'runtime error'
    }))),
    authority: 'vibe2-game-study-worker-diagnostics'
  });
}

function blockedResult(taskId, target, blocker) {
  return Object.freeze({
    version: 1,
    taskId: clean(taskId) || target.taskId,
    targetId: target.id,
    engine: target.engine,
    gameId: target.gameId,
    outcome: 'BLOCKED',
    blocker: clean(blocker),
    reason: clean(blocker),
    evidence: Object.freeze([`game-study-target:${target.id}`, `game-study-engine:${target.engine}`]),
    study: null,
    runtimeDiagnostics: null,
    authorityExpanded: false
  });
}

export async function runGameStudyWorker({ taskId = '', targetId = '', targetsFile = '.vibe2/game-study-targets.json', outputFile = '', chromePath = '' } = {}) {
  const target = resolveTarget(targetsFile, targetId);
  if (target.engine === 'roblox' && target.runnerReady !== true) {
    const result = blockedResult(taskId, target, 'roblox-real-studio-runner-not-ready');
    if (outputFile) writeJson(outputFile, result);
    return result;
  }
  const command = clean(target.command) || clean(process.env.VIBE2_ROBLOX_AUTO_PLAYER_COMMAND);
  if (target.engine === 'roblox' && !command) {
    const result = blockedResult(taskId, target, 'roblox-runtime-command-not-configured');
    if (outputFile) writeJson(outputFile, result);
    return result;
  }

  try {
    const execution = target.engine === 'web'
      ? await runWebGameStudy({
          gameId: target.gameId,
          root: target.root || '',
          url: target.url || '',
          scenarioFile: target.scenarioFile,
          sourceRoot: target.sourceRoot || target.root || '',
          sourceAccess: target.sourceAccess,
          tags: target.tags,
          chromePath,
          experienceMemory: null
        })
      : await runRobloxGameStudy({
          gameId: target.gameId,
          scenarioFile: target.scenarioFile,
          command,
          commandArgs: target.commandArgs,
          cwd: target.cwd || process.cwd(),
          sourceRoot: target.sourceRoot || '',
          sourceAccess: target.sourceAccess,
          tags: target.tags,
          timeoutMs: target.timeoutMs,
          experienceMemory: null
        });
    const study = execution.study;
    const outcome = study?.verified === true ? 'PASS' : 'FAIL';
    const blocker = outcome === 'PASS' ? null : `game-study-verification-failed:${(study?.runtimeValidation?.issues || []).join('|') || 'unknown'}`;
    const result = Object.freeze({
      version: 1,
      taskId: clean(taskId) || target.taskId,
      targetId: target.id,
      engine: target.engine,
      gameId: target.gameId,
      outcome,
      blocker,
      reason: outcome === 'PASS' ? 'verified-game-study-complete' : blocker,
      evidence: Object.freeze([
        `game-study-target:${target.id}`,
        study?.id ? `game-study:${study.id}` : '',
        execution?.autoPlayer?.runId ? `auto-player-run:${execution.autoPlayer.runId}` : ''
      ].filter(Boolean)),
      study,
      runtimeDiagnostics: autoPlayerDiagnostics(execution?.autoPlayer),
      authorityExpanded: false
    });
    if (outputFile) writeJson(outputFile, result);
    return result;
  } catch (error) {
    const message = clean(error?.message || error);
    const result = Object.freeze({
      version: 1,
      taskId: clean(taskId) || target.taskId,
      targetId: target.id,
      engine: target.engine,
      gameId: target.gameId,
      outcome: 'FAIL',
      blocker: `game-study-worker-error:${message}`,
      reason: message,
      evidence: Object.freeze([`game-study-target:${target.id}`]),
      study: null,
      runtimeDiagnostics: null,
      authorityExpanded: false
    });
    if (outputFile) writeJson(outputFile, result);
    return result;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs();
  const result = await runGameStudyWorker({
    taskId: clean(args['task-id']),
    targetId: clean(args['target-id']),
    targetsFile: clean(args.targets) || '.vibe2/game-study-targets.json',
    outputFile: clean(args.output),
    chromePath: clean(args.chrome)
  });
  console.log(`VIBE2_GAME_STUDY_WORKER=${result.outcome}`);
  console.log(`VIBE2_GAME_STUDY_ENGINE=${result.engine}`);
  console.log(`VIBE2_GAME_STUDY_TARGET=${result.targetId}`);
  console.log(`VIBE2_GAME_STUDY_VERIFIED=${result.study?.verified === true ? 'YES' : 'NO'}`);
  if (result.runtimeDiagnostics?.errors?.length) console.log(`VIBE2_GAME_STUDY_ERRORS=${JSON.stringify(result.runtimeDiagnostics.errors)}`);
  if (result.outcome === 'FAIL') process.exitCode = 1;
}
