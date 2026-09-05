// 파일명: qa/vibe-regression.mjs
// 역할: 웹/Godot 바이브 개발 공통 기능 통합 회귀검사
// 규칙: 기존 게임 규칙/세이브를 변경하지 않고 공통 API와 신규 기능 연결만 검증

import assert from 'node:assert/strict';
import { JaewoonCommonAI, JaewoonAISquad } from '../assets/common-ai.js';
import { createAnimationState } from '../assets/animation-state.js';
import { planAssetApplication } from '../assets/asset-selector.js';
import { createAIPartyConfig, createDefaultAIEntries, validateAIPartyConfig } from '../assets/ai-party.js';
import { buildGameContent } from '../assets/game-content.js';
import { createVibeProject, exportVibeProject, importVibeProject, cloneVibeProject } from '../assets/vibe-project.js';
import { createVibeBuildPlan } from '../assets/vibe-build-plan.js';
import { buildGodotProject } from '../assets/godot-game-generator.js';
import { auditGodotProjectFiles } from '../assets/godot-project-qa.js';

function pass(name) { console.log(`PASS ${name}`); }

const squad = new JaewoonAISquad({ members: [
  { id: 'tank', role: 'tank' },
  { id: 'healer', role: 'healer' },
  { id: 'ranged', role: 'ranged' },
] });
assert.equal(squad.list().length, 3);
squad.command('focus', 'boss');
const squadDecision = squad.decide({
  members: [
    { id: 'tank', hpRatio: 1, ownerDistance: 2 },
    { id: 'healer', hpRatio: .9, ownerDistance: 2, canHeal: true },
    { id: 'ranged', hpRatio: .9, ownerDistance: 2 },
  ],
  enemies: [{ id: 'boss', distance: 3, hpRatio: .5, threat: 5 }],
  now: 1000,
}, 1000);
assert.equal(squadDecision.length, 3);
pass('AI squad command and shared decisions');

const animation = createAnimationState({ states: ['idle', 'move', 'attack', 'hit', 'skill', 'death'], frameCounts: { idle: 4, move: 8, attack: 6, hit: 4, skill: 6, death: 8 } });
animation.play('attack', { restart: true, once: true });
assert.equal(animation.frameCount('attack'), 6);
animation.update(1);
assert.equal(animation.frame, 5);
assert.equal(animation.playing, false);
pass('animation multi-frame playback');

const manifest = { assets: [
  { id: 'hero-a', name: '카툰 영웅', tags: ['캐릭터', '카툰'], path: 'assets/hero-a.svg', license: 'CC0', source: 'local' },
  { id: 'bad', name: '배경', tags: ['배경'], path: 'assets/bad.png', license: 'unknown', source: 'unknown' },
] };
const assetPlan = planAssetApplication({ prompt: '카툰 캐릭터와 배경 애니메이션을 넣어줘', manifest });
assert(assetPlan.matched.some(item => item.id === 'hero-a'));
assert(!assetPlan.matched.some(item => item.id === 'bad'));
assert(assetPlan.missingTypes.includes('background'));
pass('asset selection and license policy');

const party = createAIPartyConfig({ request: '플레이어 2명과 AI 동료 2명 탱커 힐러로 협동', humanPlayers: 2 });
assert.equal(party.humanPlayers, 2);
assert.equal(party.aiCount, 2);
assert.deepEqual(party.aiRoles, ['tank', 'healer']);
assert.equal(validateAIPartyConfig(party).valid, true);
assert.equal(createDefaultAIEntries(party).length, 2);
pass('human + AI party configuration');

const content = buildGameContent({
  prompt: '모바일 디펜스 게임. 플레이어 1명과 AI 동료 3명이 협동. AI 탱커 궁수 힐러. 제작과 재료 추가.',
  blueprint: { gameId: 'qa-defense', intent: { playerCount: 1, rules: { waves: 10, interval: 3, count: 3 }, entityRules: {}, objectSpecs: [], presentation: { mobileFirst: true } } },
});
assert.equal(content.waves.total, 10);
assert.equal(content.party.humanPlayers, 1);
assert.equal(content.party.aiCount, 3);
assert.equal(content.party.mixedHumanAi, true);
pass('content generation with AI party');

const project = createVibeProject({ gameId: 'qa-project', title: 'QA Project', target: 'web', packageData: { version: 1 }, source: '<html></html>' });
const imported = importVibeProject(exportVibeProject(project));
const cloned = cloneVibeProject(imported);
assert.equal(imported.gameId, 'qa-project');
assert.equal(cloned.gameId, 'qa-project');
pass('editable project export/import/clone');

const buildPlan = createVibeBuildPlan({ request: '이 디펜스 게임을 카툰 스타일로 고퀄리티 리빌드하고 Godot 버전도 만들어줘', target: 'godot', gameId: 'qa-defense', rebuild: true });
assert.equal(buildPlan.animation.required, true);
assert.equal(buildPlan.visual.required, true);
assert.equal(buildPlan.mobile.touchFirst, true);
assert(buildPlan.phases.some(step => step.includes('애니메이션')));
assert(buildPlan.phases.some(step => step.includes('Godot') || step.includes('코드/씬/에셋 연결')));
pass('integrated build plan');

const godotProject = buildGodotProject({
  packageData: {
    gameId: 'qa-godot',
    blueprint: { sourcePrompt: '모바일 디펜스', intent: { rules: { hp: 100, damage: 10, waves: 10 } } },
    content: { players: [{ hp: 100, damage: 10 }], waves: { total: 10 } },
  },
  title: 'QA Godot',
  slug: 'qa-godot',
});
const godotQa = auditGodotProjectFiles(godotProject.files);
assert(godotQa.valid, JSON.stringify(godotQa));
assert(godotProject.files['project.godot'].includes('[display]'));
assert(godotProject.files['main.tscn'].includes('SafeArea'));
assert(godotProject.files['main.gd'].includes('InputEventScreenTouch'));
pass('Godot project structure QA');

console.log('PASS integrated vibe regression suite');
