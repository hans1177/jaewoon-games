// [흥정 미니게임] 1 저울 2 표정 3 동전 6 퀴즈 · 강제 아님 · 서버 판정 · 원화 지시서 (2026-11-28)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root = 'roblox-games/mare-essentia';
const trade = fs.readFileSync(`${root}/src/ServerScriptService/Services/Trade.luau`, 'utf8');
const game = fs.readFileSync(`${root}/src/StarterPlayer/Game.client.luau`, 'utf8');
const view = fs.readFileSync(`${root}/src/ServerScriptService/Services/View.luau`, 'utf8');
test('서버 판정·한 번·4~12%', () => {
  assert.match(trade, /function handlers\.HaggleStart\(state, p, ctx\)/);
  assert.match(trade, /function handlers\.HagglePlay\(state, p, ctx\)/);
  assert.match(trade, /local HAGGLE_GAMES = \{ "face", "coin", "quiz" \}/);
  assert.match(trade, /pct = math\.clamp\(pct, 0, 12\)/);
  assert.match(trade, /h\.tried\[pend\.goodId\] = true/);
});
test('화면에 정답을 보내지 않음(퀴즈 답·판정)', () => {
  const pend = view.split('pending = (function()')[1].split('end)(),\n\t\t\t}')[0];
  assert.doesNotMatch(pend, /answer|limit =/);
});
test('교역소 버튼·4가지 화면·그냥 사기', () => {
  assert.match(game, /"흥정 게임"/);
  assert.match(game, /function H\.openHaggle\(goodId, goodName\)/);
  for (const g of ['scale', 'face', 'coin']) assert.match(game, new RegExp(`pend\\.game == "${g}"`));
  assert.match(game, /"그냥 사기"/);
  assert.match(game, /ui_haggle_merchant_sheet/);
  assert.ok(fs.existsSync(`${root}/docs/HAGGLE_MINIGAME_BRIEF.md`));
});

test('상인 말풍선은 화면 폭에 맞고 동작 줄이기에서 반복을 중단', () => {
  const face = game.split('local function merchantFace(parent, mood)')[1].split('function H.openHaggle(')[0];
  assert.match(face, /stageWidth - 8/);
  assert.match(face, /holder\.Say\.TextWrapped = true/);
  assert.match(face, /while holder:IsDescendantOf\(game\) and not game:GetService\("GuiService"\)\.ReducedMotionEnabled/);
  assert.match(face, /holder:SetAttribute\("Animating", false\)/);
  assert.match(face, /ImageRectSize = Vector2\.new\(256, 256\)/);
});

test('흥정 저울·고정 동전 슬롯·서버 응답 결과 표시', () => {
  const haggle = game.split('function H.openHaggle(goodId, goodName)')[1].split('-- [퀘스트 대화 연출')[0];
  assert.match(haggle, /track\.SliceCenter = Rect\.new\(64, 24, 960, 104\)/);
  assert.match(haggle, /needle\.BackgroundTransparency = 1/);
  assert.match(haggle, /slot\.Name = "CoinSlot"/);
  assert.match(haggle, /local c = coin\(slot, look, coinSize\)/);
  assert.match(haggle, /c\.AnchorPoint = Vector2\.new\(0\.5, 0\.5\)/);
  assert.match(haggle, /ok and deal and deal\.goodId == goodId then tonumber\(deal\.pct\)/);
  assert.match(haggle, /if not res then "결과 확인 불가"/);
  assert.match(haggle, /finish\(\{ t = os\.clock\(\) - t0 \}\)/);
  assert.match(haggle, /finish\(\{ pick = i \}\)/);
});
