// [백과사전 시각화] 2026-11-28 오너: 한눈에 보기·분포 지도·연표·크기 비교·관련 카드·수집률·원고 확장 칸
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root = 'roblox-games/mare-essentia';
const game = fs.readFileSync(`${root}/src/StarterPlayer/Game.client.luau`, 'utf8');
const view = fs.readFileSync(`${root}/src/ServerScriptService/Services/View.luau`, 'utf8');
test('백과 시각화 블록 연결', () => {
  for (const f of ['encyHeader', 'encyFacts', 'encyMap', 'encyTimeline', 'encySize', 'encyRelated', 'encyCollection']) {
    assert.match(game, new RegExp(`function H\\.${f}\\(`), f);
    assert.match(game, new RegExp(`H\\.${f}\\(sheet, order`), f + ' 호출');
  }
  assert.match(view, /mapPoints = \(function\(\)/);
});
test('원고 확장 칸(학명·요약·생김새·재미·출처)', () => {
  for (const k of ['article.latin', 'article.summary', 'article.looks', 'article.trivia', 'article.sources']) assert.ok(game.includes(k), k);
  assert.ok(fs.existsSync(`${root}/docs/ENCYCLOPEDIA_BRIEF.md`));
});
