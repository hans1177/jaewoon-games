// 파일명: tools/vibe2-web-game-study.mjs
// 역할: 실제 Chrome AUTO PLAYER 실행 결과를 GAME STUDY로 증류하고 선택적으로 기존 Experience Memory에 학습시킨다.

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { runWebAutoPlayer } from './vibe2-web-auto-player.mjs';
import { createVerifiedGameStudy, persistGameStudy, promoteGameStudyToExperience, OBSERVATION_ONLY_ACCESS } from './vibe2-game-study.mjs';

const clean = (value) => String(value ?? '').trim();
function argsOf(argv = process.argv.slice(2)) { const out = {}; for (const raw of argv) { if (!raw.startsWith('--')) continue; const body = raw.slice(2); const at = body.indexOf('='); if (at < 0) out[body] = true; else out[body.slice(0, at)] = body.slice(at + 1); } return out; }
function readJson(file, fallback = {}) { if (!clean(file) || !fs.existsSync(file)) return fallback; return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.mkdirSync(new URL('.', `file://${fs.realpathSync.native ? '' : ''}`)); return value; }
function persistMemory(file, memory) { const pathModule = await import('node:path'); fs.mkdirSync(pathModule.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(memory, null, 2)}\n`, 'utf8'); }

export async function runWebGameStudy({
  gameId = '', root = '', url = '', scenarioFile = '', scenario = null, autoPlayerOutputFile = '', studyOutputFile = '',
  sourceRoot = '', sourceAccess = OBSERVATION_ONLY_ACCESS, tags = [], chromePath = '', experienceMemory = null
} = {}) {
  const autoPlayer = await runWebAutoPlayer({ root, url, scenarioFile, scenario, outputFile: autoPlayerOutputFile, chromePath });
  const study = createVerifiedGameStudy({
    gameId: clean(gameId) || 'web-reference-game',
    engine: 'web',
    autoPlayerResult: autoPlayer,
    sourceRoot: clean(sourceRoot) || clean(root),
    sourceAccess,
    tags
  });
  if (studyOutputFile) persistGameStudy(studyOutputFile, study);
  const promotion = experienceMemory == null ? null : promoteGameStudyToExperience(experienceMemory, study);
  return Object.freeze({ version: 1, engine: 'web', autoPlayer, study, promotion, authorityExpanded: false });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = argsOf();
  const memoryFile = clean(args.memory);
  const learn = String(args.learn || '').toLowerCase() === 'true';
  const experienceMemory = learn && memoryFile ? readJson(memoryFile, { records: [] }) : null;
  const result = await runWebGameStudy({
    gameId: clean(args['game-id']),
    root: clean(args.root),
    url: clean(args.url),
    scenarioFile: clean(args.scenario),
    autoPlayerOutputFile: clean(args['play-output']),
    studyOutputFile: clean(args.output),
    sourceRoot: clean(args['source-root']),
    sourceAccess: clean(args['source-access']) || OBSERVATION_ONLY_ACCESS,
    chromePath: clean(args.chrome),
    experienceMemory
  });
  if (learn && memoryFile && result.promotion?.promoted) {
    const path = await import('node:path');
    fs.mkdirSync(path.dirname(memoryFile), { recursive: true });
    fs.writeFileSync(memoryFile, `${JSON.stringify(result.promotion.memory, null, 2)}\n`, 'utf8');
  }
  console.log(`VIBE2_GAME_STUDY_ENGINE=${result.engine}`);
  console.log(`VIBE2_GAME_STUDY_VERIFIED=${result.study.verified ? 'YES' : 'NO'}`);
  console.log(`VIBE2_GAME_STUDY_PATTERNS=${result.study.distilledPatterns.length}`);
  console.log(`VIBE2_GAME_STUDY_SOURCE_SCANNED=${result.study.sourceAnalysis.scanned ? 'YES' : 'NO'}`);
  console.log(`VIBE2_GAME_STUDY_LEARNED=${result.promotion?.promoted ? 'YES' : 'NO'}`);
  if (!result.study.verified) process.exitCode = 1;
}
