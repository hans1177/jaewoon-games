// [특산품 단계 잠금 + 지상 전투 차별화] 2026-11-28 오너 '추천대로' (A 1·4·10, B 1·2·7·8)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root = 'roblox-games/mare-essentia/src';
const trade = fs.readFileSync(`${root}/ServerScriptService/Services/Trade.luau`, 'utf8');
const quests = fs.readFileSync(`${root}/ReplicatedStorage/Shared/Quests.luau`, 'utf8');
const questSvc = fs.readFileSync(`${root}/ServerScriptService/Services/Quest.luau`, 'utf8');
const state = fs.readFileSync(`${root}/ServerScriptService/Services/State.luau`, 'utf8');
const game = fs.readFileSync(`${root}/StarterPlayer/Game.client.luau`, 'utf8');
const ac = fs.readFileSync(`${root}/ReplicatedStorage/Shared/ActionCombat.luau`, 'utf8');
const field = fs.readFileSync(`${root}/ReplicatedStorage/Shared/FieldScene.luau`, 'utf8');
test('특산품 3단계: 일반·특산·명품 잠금 + 구매 차단', () => {
  assert.match(trade, /local SPECIAL_REP, PREMIUM_REP, PREMIUM_LEVEL = 15, 40, 2/);
  assert.match(trade, /local lock = lockOf\(state, state\.portId, goodId\)/);
  assert.match(trade, /home or permit or traded or rep >= SPECIAL_REP/);
});
test('길드 허가증 의뢰·보상·저장 복원', () => {
  assert.match(quests, /id = "permit_" \.\. portId/);
  assert.match(questSvc, /state\.stats\.permits\[quest\.rewardPermit\] = true/);
  assert.match(state, /saved\.stats\.permits/);
});
test('잠금 이유 표시', () => {
  assert.match(game, /"🔒" \.\. tostring\(g\.lock\.tierName/);
  assert.match(game, /if sel\.lock then\n\t\t\t\tstatus = "🔒 "/);
});
test('지상 전투: 약점·반격·두목 단계·전투 목표', () => {
  assert.match(ac, /function A\.weakness\(e: any, fromFront: boolean, dist: number\)/);
  assert.match(field, /pl\.counterUntil = now \+ 1\.6/);
  assert.match(field, /"두목 분노! · 2단계/);
  assert.match(field, /"최후의 일격!/);
  assert.match(field, /pl\.fieldChallenge = \{ kind = pick\.kind/);
  assert.match(field, /" · 약점: " \.\. AC\.WEAK\[ac\.kind\]\.label/);
});
