// 파일명: tools/award-department-experience.mjs
// 역할: Vibe QA PASS가 확인된 source commit의 변경 경로를 부서에 매핑해 검증 XP를 1회만 누적한다.

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const sourceCommit = String(process.argv[2] || '').trim();
const runId = String(process.argv[3] || '').trim();
if (!sourceCommit) throw new Error('source commit required');

const ledgerPath = 'department-experience.json';
const runtimeStatePath = 'assets/department-experience-state.js';
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
ledger.history = Array.isArray(ledger.history) ? ledger.history : [];
ledger.departments = ledger.departments || {};

if (ledger.history.some((event) => event.sourceCommit === sourceCommit)) {
  console.log(`XP_ALREADY_RECORDED=${sourceCommit}`);
  process.exit(0);
}

const changed = execFileSync('git', ['diff-tree', '--no-commit-id', '--name-only', '-r', sourceCommit], { encoding: 'utf8' })
  .split(/\r?\n/)
  .map((value) => value.trim())
  .filter(Boolean)
  .filter((path) => path !== ledgerPath && path !== runtimeStatePath);

const matchers = {
  planning: [
    /^COMPANY_FLOW\.md$/,
    /^assets\/vibe-company-development-flow\.js$/,
    /^assets\/game-blueprint\.js$/,
    /^\.github\/agents\/planning\.agent\.md$/
  ],
  development: [
    /^unity-games\//,
    /^godot-games\//,
    /^assets\/.*\.js$/,
    /^tools\/.*\.(mjs|js|ps1)$/,
    /^\.github\/agents\/development\.agent\.md$/
  ],
  qa: [
    /^qa\//,
    /^\.github\/workflows\/vibe-(qa|regression)\.yml$/,
    /^\.github\/agents\/qa\.agent\.md$/
  ],
  graphics: [
    /(^|\/)(graphics|visual|ui|animation|animated|asset|art)(-|_|\/|\.)/i,
    /^ASSET_RULES\.md$/,
    /^\.github\/agents\/graphics\.agent\.md$/
  ],
  balance: [
    /(^|\/)(balance|progression|economy|d20|game-content)(-|_|\/|\.)/i,
    /^\.github\/agents\/balance\.agent\.md$/
  ],
  homepage: [
    /^index\.html$/,
    /^company\.html$/,
    /^game-catalog\.json$/,
    /^HOMEPAGE_OPERATIONS\.md$/,
    /^\.github\/agents\/homepage\.agent\.md$/
  ],
  release: [
    /^\.build-requests\//,
    /^\.github\/workflows\/unity-cloud-android-test\.yml$/,
    /^\.github\/agents\/release\.agent\.md$/
  ],
  director: [
    /^company-directive\.json$/,
    /^company-status\.json$/,
    /^assets\/vibe-company-orchestration-bridge\.js$/,
    /^\.github\/agents\/director\.agent\.md$/
  ]
};

const departments = Object.entries(matchers)
  .filter(([, patterns]) => changed.some((path) => patterns.some((pattern) => pattern.test(path))))
  .map(([department]) => department);

if (!departments.length) {
  console.log(`XP_NO_DEPARTMENT_MATCH=${sourceCommit}`);
  process.exit(0);
}

const thresholds = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 6000];
const levelForXp = (xp) => {
  let level = 1;
  thresholds.forEach((threshold, index) => {
    if (xp >= threshold) level = index + 1;
  });
  return Math.min(10, level);
};

const XP_PER_VERIFIED_QA_PASS = 40;
for (const department of departments) {
  const current = ledger.departments[department] || { xp: 0, level: 1, verifiedCompletions: 0, learningEvents: 0, lastEvidence: null };
  const xp = Math.max(0, Number(current.xp) || 0) + XP_PER_VERIFIED_QA_PASS;
  ledger.departments[department] = {
    ...current,
    xp,
    level: levelForXp(xp),
    verifiedCompletions: Math.max(0, Number(current.verifiedCompletions) || 0) + 1,
    learningEvents: Math.max(0, Number(current.learningEvents) || 0) + 1,
    lastEvidence: `Vibe QA run ${runId || 'unknown'} PASS · ${sourceCommit}`
  };
}

ledger.updatedAt = new Date().toISOString().slice(0, 10);
ledger.history.push({
  type: 'verified-qa-pass',
  sourceCommit,
  runId: runId || null,
  xpPerDepartment: XP_PER_VERIFIED_QA_PASS,
  departments,
  changedFilesCount: changed.length,
  evidence: `Vibe QA PASS for ${sourceCommit}`,
  recordedAt: new Date().toISOString()
});
if (ledger.history.length > 300) ledger.history = ledger.history.slice(-300);

function jsValue(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(String(value));
}

const orderedDepartments = ['planning','development','qa','graphics','balance','homepage','release','director'];
const runtimeLines = orderedDepartments.map((id) => {
  const item = ledger.departments[id] || { xp:0, level:1, verifiedCompletions:0, learningEvents:0, lastEvidence:null };
  return `    ${id}: Object.freeze({ xp: ${Number(item.xp)||0}, level: ${Number(item.level)||1}, verifiedCompletions: ${Number(item.verifiedCompletions)||0}, learningEvents: ${Number(item.learningEvents)||0}, lastEvidence: ${jsValue(item.lastEvidence)} })`;
});
const runtimeState = `// AUTO-GENERATED FROM department-experience.json. Do not hand-edit.\nexport const DEFAULT_DEPARTMENT_EXPERIENCE_STATE = Object.freeze({\n  version: 1,\n  departments: Object.freeze({\n${runtimeLines.join(',\n')}\n  })\n});\n`;

fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
fs.writeFileSync(runtimeStatePath, runtimeState);
console.log(`XP_AWARDED=${departments.join(',')} XP=${XP_PER_VERIFIED_QA_PASS} SOURCE=${sourceCommit}`);
