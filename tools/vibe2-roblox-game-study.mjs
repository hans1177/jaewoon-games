// 파일명: tools/vibe2-roblox-game-study.mjs
// 역할: 검증된 Roblox Studio AUTO PLAYER 결과를 GAME STUDY로 증류하고, 허가된 로컬 Studio 소스만 read-only 분석한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runRobloxAutoPlayer } from './vibe2-roblox-auto-player.mjs';
import { parseCommandArgs } from './vibe2-engine-auto-player.mjs';
import { createVerifiedGameStudy, persistGameStudy, promoteGameStudyToExperience, OBSERVATION_ONLY_ACCESS } from './vibe2-game-study.mjs';

const clean = (value) => String(value ?? '').trim();
function argsOf(argv = process.argv.slice(2)) { const out = {}; for (const raw of argv) { if (!raw.startsWith('--')) continue; const body = raw.slice(2); const at = body.indexOf('='); if (at < 0) out[body] = true; else out[body.slice(0, at)] = body.slice(at + 1); } return out; }
function readJson(file, fallback = {}) { if (!clean(file) || !fs.existsSync(file)) return fallback; return JSON.parse(fs.readFileSync(file, 'utf8')); }
function persistMemory(file, memory) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(memory, null, 2)}\n`, 'utf8'); }

export async function runRobloxGameStudy({
  gameId = '', scenarioFile = '', command = '', commandArgs = [], cwd = process.cwd(), autoPlayerOutputFile = '', studyOutputFile = '',
  sourceRoot = '', sourceAccess = OBSERVATION_ONLY_ACCESS, tags = [], experienceMemory = null, timeoutMs = 180000
} = {}) {
  const autoPlayer = await runRobloxAutoPlayer({ scenarioFile, command, commandArgs, cwd, outputFile: autoPlayerOutputFile, timeoutMs });
  const study = createVerifiedGameStudy({
    gameId: clean(gameId) || 'roblox-reference-game',
    engine: 'roblox',
    autoPlayerResult: autoPlayer,
    sourceRoot,
    sourceAccess,
    tags
  });
  if (studyOutputFile) persistGameStudy(studyOutputFile, study);
  const promotion = experienceMemory == null ? null : promoteGameStudyToExperience(experienceMemory, study);
  return Object.freeze({ version: 1, engine: 'roblox', autoPlayer, study, promotion, authorityExpanded: false });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = argsOf();
  const memoryFile = clean(args.memory);
  const learn = String(args.learn || '').toLowerCase() === 'true';
  const experienceMemory = learn && memoryFile ? readJson(memoryFile, { records: [] }) : null;
  const result = await runRobloxGameStudy({
    gameId: clean(args['game-id']),
    scenarioFile: clean(args.scenario),
    command: clean(args.command),
    commandArgs: parseCommandArgs(clean(args['args-json']) || '[]'),
    cwd: clean(args.cwd) || process.cwd(),
    autoPlayerOutputFile: clean(args['play-output']),
    studyOutputFile: clean(args.output),
    sourceRoot: clean(args['source-root']),
    sourceAccess: clean(args['source-access']) || OBSERVATION_ONLY_ACCESS,
    experienceMemory,
    timeoutMs: Number(args.timeout) || 180000
  });
  if (learn && memoryFile && result.promotion?.promoted) persistMemory(memoryFile, result.promotion.memory);
  console.log(`VIBE2_GAME_STUDY_ENGINE=${result.engine}`);
  console.log(`VIBE2_GAME_STUDY_VERIFIED=${result.study.verified ? 'YES' : 'NO'}`);
  console.log(`VIBE2_GAME_STUDY_PATTERNS=${result.study.distilledPatterns.length}`);
  console.log(`VIBE2_GAME_STUDY_SOURCE_SCANNED=${result.study.sourceAnalysis.scanned ? 'YES' : 'NO'}`);
  console.log(`VIBE2_GAME_STUDY_LEARNED=${result.promotion?.promoted ? 'YES' : 'NO'}`);
  if (!result.study.verified) process.exitCode = 1;
}
