// 파일명: qa/vibe-regression.mjs
// 역할: 웹/Godot 바이브 개발 공통 기능 통합 회귀검사
// 규칙: 기존 게임 규칙/세이브를 변경하지 않고 공통 API와 신규 기능 연결만 검증

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JaewoonCommonAI, JaewoonAISquad } from '../assets/common-ai.js';
import { createAnimationState } from '../assets/animation-state.js';
import { planAssetApplication } from '../assets/asset-selector.js';
import { createAIPartyConfig, createDefaultAIEntries, validateAIPartyConfig } from '../assets/ai-party.js';
import { buildGameContent } from '../assets/game-content.js';
import { createVibeProject, exportVibeProject, importVibeProject, cloneVibeProject } from '../assets/vibe-project.js';
import { createVibeBuildPlan } from '../assets/vibe-build-plan.js';
import { createVibeEditBrief, planVibeWorkbenchTask } from '../assets/vibe-workbench.js';
import { buildGodotProject } from '../assets/godot-game-generator.js';
import { auditGodotProjectFiles } from '../assets/godot-project-qa.js';
import { diffVibeText, findProtectedVibeChanges, isProtectedVibeChangeAuthorized } from '../web-games/vibe-maker/workbench.js';

function pass(name) { console.log(`PASS ${name}`); }

const squad = new JaewoonAISquad({ members: [
  { id: 'tank', role: 'tank' },
  { id: 'healer', role: 'healer' },
  { id: 'ranged', role: 'ranged' },
] });
assert.equal(squad.list().length, 3);
squad.command('focus', 'boss');
const squadDecision = squad.decide({ members: [{ id: 'tank', hpRatio: 1, ownerDistance: 2 }, { id: 'healer', hpRatio: .9, ownerDistance: 2, canHeal: true }, { id: 'ranged', hpRatio: .9, ownerDistance: 2 }], enemies: [{ id: 'boss', distance: 3, hpRatio: .5, threat: 5 }], now: 1000 }, 1000);
assert.equal(squadDecision.length, 3);
pass('AI squad command and shared decisions');

const animation = createAnimationState({ states: ['idle', 'move', 'attack', 'hit', 'skill', 'death'], frameCounts: { idle: 4, move: 8, attack: 6, hit: 4, skill: 6, death: 8 } });
animation.play('attack', { restart: true, once: true });
assert.equal(animation.frameCount('attack'), 6); animation.update(1); assert.equal(animation.frame, 5); assert.equal(animation.playing, false);
pass('animation multi-frame playback');

const manifest = { assets: [{ id: 'hero-a', name: '카툰 영웅', tags: ['캐릭터', '카툰'], path: 'assets/hero-a.svg', license: 'CC0', source: 'local' }, { id: 'bad', name: '배경', tags: ['배경'], path: 'assets/bad.png', license: 'unknown', source: 'unknown' }] };
const assetPlan = planAssetApplication({ prompt: '카툰 캐릭터와 배경 애니메이션을 넣어줘', manifest });
assert(assetPlan.matched.some(item => item.id === 'hero-a')); assert(!assetPlan.matched.some(item => item.id === 'bad')); assert(assetPlan.missingTypes.includes('background'));
pass('asset selection and license policy');

const party = createAIPartyConfig({ request: '플레이어 2명과 AI 동료 2명 탱커 힐러로 협동', humanPlayers: 2 });
assert.equal(party.humanPlayers, 2); assert.equal(party.aiCount, 2); assert.deepEqual(party.aiRoles, ['tank', 'healer']); assert.equal(validateAIPartyConfig(party).valid, true); assert.equal(createDefaultAIEntries(party).length, 2);
pass('human + AI party configuration');

const content = buildGameContent({ prompt: '모바일 디펜스 게임. 플레이어 1명과 AI 동료 3명이 협동. AI 탱커 궁수 힐러. 제작과 재료 추가.', blueprint: { gameId: 'qa-defense', intent: { playerCount: 1, rules: { waves: 10, interval: 3, count: 3 }, entityRules: {}, objectSpecs: [], presentation: { mobileFirst: true } } } });
assert.equal(content.waves.total, 10); assert.equal(content.party.humanPlayers, 1); assert.equal(content.party.aiCount, 3); assert.equal(content.party.mixedHumanAi, true);
pass('content generation with AI party');

const project = createVibeProject({ gameId: 'qa-project', title: 'QA Project', target: 'web', packageData: { version: 1 }, source: '<html></html>' });
const imported = importVibeProject(exportVibeProject(project)); const cloned = cloneVibeProject(imported); assert.equal(imported.gameId, 'qa-project'); assert.equal(cloned.gameId, 'qa-project');
pass('editable project export/import/clone');

const buildPlan = createVibeBuildPlan({ request: '이 디펜스 게임을 카툰 스타일로 고퀄리티 리빌드하고 Godot 버전도 만들어줘', target: 'godot', gameId: 'qa-defense', rebuild: true });
assert.equal(buildPlan.animation.required, true); assert.equal(buildPlan.visual.required, true); assert.equal(buildPlan.mobile.touchFirst, true); assert(buildPlan.phases.some(step => step.includes('애니메이션'))); assert(buildPlan.phases.some(step => step.includes('Godot') || step.includes('코드/씬/에셋 연결')));
pass('integrated build plan');

const editBrief = createVibeEditBrief({ request: 'Godot 게임 그래픽, 애니메이션, 모바일 UI를 고퀄로 개선해줘', target: 'godot', gameId: 'qa-defense', files: ['godot-games/qa-defense/main.gd', 'godot-games/qa-defense/main.tscn'] });
assert.deepEqual(editBrief.responsibleFiles, ['godot-games/qa-defense/main.gd', 'godot-games/qa-defense/main.tscn']);
assert(editBrief.directives.some(step => step.includes('idle/move/attack/hit/skill/death')));
assert(editBrief.directives.some(step => step.includes('safe area')));
assert(editBrief.protectedTargets.includes('체력'));
assert(editBrief.protectedTargets.includes('저장 구조'));
assert.equal(editBrief.outputContract.returnCompleteFiles, true);
assert.equal(editBrief.outputContract.noWrapperPatch, true);
assert.equal(editBrief.outputContract.atomicApply, true);
assert.equal(editBrief.outputContract.rollbackOnFailure, true);
const workbenchTask = planVibeWorkbenchTask({ request: 'Godot 게임 그래픽을 개선해줘', target: 'godot', gameId: 'qa-defense', file: 'godot-games/qa-defense/main.gd' });
assert.equal(workbenchTask.version, 3);
assert.equal(workbenchTask.applyPolicy.directSourceEditPreferred, true);
assert.equal(workbenchTask.applyPolicy.atomicApply, true);
assert.equal(workbenchTask.editBrief.responsibleFiles[0], 'godot-games/qa-defense/main.gd');
pass('executable edit brief and protected output contract');

const godotProject = buildGodotProject({ packageData: { gameId: 'qa-godot', blueprint: { sourcePrompt: '모바일 디펜스', intent: { rules: { hp: 100, damage: 10, waves: 10 } } }, content: { players: [{ hp: 100, damage: 10 }], waves: { total: 10 } } }, title: 'QA Godot', slug: 'qa-godot' });
const godotQa = auditGodotProjectFiles(godotProject.files); assert.equal(godotQa.passed, true, JSON.stringify(godotQa)); assert(godotProject.files['project.godot'].includes('[display]')); assert(godotProject.files['main.tscn'].includes('SafeArea')); assert(godotProject.files['main.gd'].includes('InputEventScreenTouch'));
pass('Godot project structure QA');

assert.equal(diffVibeText('var hp = 100','var hp = 100').length,0);
assert.deepEqual(findProtectedVibeChanges('var hp = 100','var hp = 120'),['체력']);
assert.equal(isProtectedVibeChangeAuthorized('체력','그래픽과 게임성을 개선해줘'),false);
assert.equal(isProtectedVibeChangeAuthorized('체력','플레이어 체력을 120으로 변경해줘'),true);
assert.equal(isProtectedVibeChangeAuthorized('공격력','밸런스를 개선해줘'),false);
assert.equal(isProtectedVibeChangeAuthorized('공격력','공격력 데미지를 15로 변경해줘'),true);
assert.equal(isProtectedVibeChangeAuthorized('웨이브','게임 재미를 개선해줘'),false);
assert.equal(isProtectedVibeChangeAuthorized('웨이브','웨이브를 20으로 변경해줘'),true);
assert.equal(isProtectedVibeChangeAuthorized('보상','게임성을 고도화해줘'),false);
assert.equal(isProtectedVibeChangeAuthorized('보상','보상 골드를 5로 변경해줘'),true);
assert.equal(isProtectedVibeChangeAuthorized('저장','저장 기능을 개선해줘'),false);
assert.equal(isProtectedVibeChangeAuthorized('저장','저장키 마이그레이션을 해줘'),true);
pass('explicit protected rule authorization');

const workspaceSource = fs.readFileSync(new URL('../assets/vibe-workspace.js', import.meta.url), 'utf8');
const workbenchSource = fs.readFileSync(new URL('../web-games/vibe-maker/workbench.js', import.meta.url), 'utf8');
assert(workspaceSource.includes('async writeManyAtomic(changes)'));
assert(workspaceSource.includes('적용 파일 자동 rollback 완료'));
assert(workbenchSource.includes('const PROTECTED='));
assert(workbenchSource.includes('protectionViolations(item)'));
assert(workbenchSource.includes('writeManyAtomic(changed)'));
assert(workbenchSource.includes('변경 세트에 연결돼 있어'));
assert(workbenchSource.includes('PROTECTED_INTENT'));
pass('workbench protected diff and atomic rollback contract');

console.log('PASS integrated vibe regression suite');
