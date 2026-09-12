import assert from 'node:assert/strict';
import { COMPANY_DEPARTMENT_ROLES, evaluateDepartmentEvidence } from '../assets/company-department-standards.js';
import { extractGroundedDepartmentEvidence } from '../tools/vibe3-department-evidence-extract.mjs';

assert.deepEqual(COMPANY_DEPARTMENT_ROLES, ['planning','graphics','development','qa','balance','music','intro']);

const request = {
  sourceRevision: 'abc123',
  changedFiles: ['web-games/demo/game.js','web-games/demo/ui.css'],
  buildConclusion: 'PASS',
  buildRunId: 'build-77',
  runtimeSmokePassed: true,
  visualEvidence: [{ text: 'screenshot frame shows readable UI contrast', artifact: 'shot-1' }],
  balanceEvidence: [{ text: 'damage 20 -> 18 and health 100 unchanged', source: 'web-games/demo/game.js' }],
  planningEvidence: [{ text: 'core loop remains move-combat-reward', source: 'design/demo.json' }, { text: 'progression path remains stage based', source: 'design/demo.json' }],
  musicEvidence: [{ text: 'BGM begins after user gesture and UI feedback remains audible', artifact: 'audio-run-9' }],
  musicStartedAfterGesture: true,
  musicMuteControlPassed: true,
  musicVolumeControlPassed: true,
  musicRuntimeConclusion: 'PASS',
  audioLicenseVerified: true,
  runtimeNetworkAudioDependency: false,
  introEvidence: [{ text: 'intro first entry presents game identity before play', artifact: 'intro-run-3' }],
  introVisible: true,
  introSkipPassed: true,
  firstMeaningfulInputPassed: true,
  introCoreLoopHandoffPassed: true,
  introRuntimeConclusion: 'PASS',
  playTestEvidence: [{ text: 'runtime test movement and core input pass', artifact: 'runtime-1' }],
  qaEvidence: [{ text: 'smoke test restart pass', artifact: 'runtime-1' }],
  developmentEvidence: [{ text: 'game.js build dependency path verified', source: 'web-games/demo/game.js' }]
};

const result = extractGroundedDepartmentEvidence({ request });
assert.equal(result.groundedOnly, true);
assert.equal(result.modelInventedEvidenceAllowed, false);
for (const role of COMPANY_DEPARTMENT_ROLES) assert.ok(result.evidence[role].length > 0, `${role} evidence missing`);
assert.ok(result.evidence.music.every((x) => /\[(?:source|runtime|artifact):/.test(x)));
assert.ok(result.evidence.intro.every((x) => /\[(?:source|runtime|artifact):/.test(x)));

const musicGate = evaluateDepartmentEvidence({ role: 'music', evidence: result.evidence.music, request });
const introGate = evaluateDepartmentEvidence({ role: 'intro', evidence: result.evidence.intro, request });
assert.equal(musicGate.passed, true);
assert.equal(introGate.passed, true);

const missingMusicRuntime = evaluateDepartmentEvidence({ role: 'music', evidence: ['[source:index.html] music BGM element exists'], request: {} });
const missingIntroRuntime = evaluateDepartmentEvidence({ role: 'intro', evidence: ['[source:index.html] intro opening markup exists'], request: {} });
assert.equal(missingMusicRuntime.passed, false);
assert.ok(missingMusicRuntime.blockerCodes.includes('RUNTIME_DOMAIN_EVIDENCE_REQUIRED'));
assert.equal(missingIntroRuntime.passed, false);
assert.ok(missingIntroRuntime.blockerCodes.includes('RUNTIME_DOMAIN_EVIDENCE_REQUIRED'));

const ungrounded = extractGroundedDepartmentEvidence({ request: { musicEvidence: ['looks great'], introEvidence: ['nice intro'] } });
assert.equal(ungrounded.evidence.music.length, 1);
assert.equal(ungrounded.evidence.intro.length, 1);
assert.equal(evaluateDepartmentEvidence({ role: 'music', evidence: ungrounded.evidence.music, request: {} }).passed, false);
assert.equal(evaluateDepartmentEvidence({ role: 'intro', evidence: ungrounded.evidence.intro, request: {} }).passed, false);

console.log(JSON.stringify({ pass: true, departments: COMPANY_DEPARTMENT_ROLES.length, musicRuntimeRequired: true, introRuntimeRequired: true }));
