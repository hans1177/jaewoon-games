// [쉬운 흐름·이야기 인과·메뉴 5묶음] 2026-11-28 오너 지시 '모두 적용'.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root = 'roblox-games/mare-essentia';
const game = fs.readFileSync(`${root}/src/StarterPlayer/Game.client.luau`, 'utf8');
const view = fs.readFileSync(`${root}/src/ServerScriptService/Services/View.luau`, 'utf8');
const questSvc = fs.readFileSync(`${root}/src/ServerScriptService/Services/Quest.luau`, 'utf8');
const ch = fs.readFileSync(`${root}/src/ReplicatedStorage/Shared/StoryChapters.luau`, 'utf8');
test('메뉴 5묶음·하단 5버튼·건물 이름 보존', () => {
  const groups = game.match(/local GROUPS = \{([\s\S]*?)\n\}/)[1];
  assert.equal([...groups.matchAll(/\{ name = "/g)].length, 5);
  const all = [...groups.matchAll(/"([a-z]+)"/g)].map(m => m[1]);
  for (const t of ['board','quest','route','trade','market','status','harbor','crew','recruit','scholar','yard','codex','encyclopedia','tech','map','diplomacy','explore','battle','gwent','war']) assert.ok(all.includes(t), t);
  assert.match(game, /H\.FACILITY_GROUPS = \{/);
  assert.match(game, /H\.pageDetails\.Text = p\.portName/);
  assert.match(game, /\{ "route", "항해", if H\.reserveIconAtlas\[3\] then "nav" else "route" \}/);
  assert.match(game, /\{ "trade", "교역", if H\.reserveIconAtlas\[3\] then "tradeg" else "trade" \}/);
  assert.match(game, /\{ "board", "모험", if H\.reserveIconAtlas\[3\] then "adventure" else "battle" \}/);
});
test('다음 할 일 띠·건물 표시·메뉴 첫 줄', () => {
  for (const f of ['nextStep', 'markFacility', 'refreshNextStep', 'menuHomeStrip']) assert.match(game, new RegExp(`function H\\.${f}\\(`));
  assert.match(game, /chip\.Name = "NextStepChip"/);
  assert.match(game, /d:GetAttribute\("FacilityIdentity"\) == target/);
  assert.match(view, /portId = q\.portId, portName =/);
});
test('인과 카드·결과·장 완료·지난 이야기', () => {
  for (const f of ['questCauseCard', 'showQuestResult', 'checkQuestResults', 'showRecap']) assert.match(game, new RegExp(`function H\\.${f}\\(`));
  assert.match(view, /chapterEnd = chapterName ~= nil and D\.Quests\.NextOf\[dq\.id\] == nil/);
  assert.match(view, /prevEnding = q\.after/);
  assert.match(questSvc, /quest\.afterPrologue and not state\.quests\.done\["pr_"/);
});
test('제1장: 교역 → 탐험 → 해전 → 선택 → 결과', () => {
  const kinds = [...ch.matchAll(/id = "(ch1_[0-9a-z]+)"[\s\S]*?kind = "([a-z_]+)"/g)].map(m => m[2]);
  assert.deepEqual(kinds.slice(0, 4), ['deliver', 'discover_card', 'win', 'choice']);
  for (const k of ['problem', 'cause', 'result']) assert.ok((ch.match(new RegExp(`${k} = "`, 'g')) || []).length >= 6, k);
  assert.match(ch, /needChoice = "ch1_captain=law"/);
  assert.match(ch, /needChoice = "ch1_captain=crew"/);
  assert.ok(fs.existsSync(`${root}/docs/STORY_CAUSALITY.md`));
});
test('첫 경험·패배 이유·교역 이익·막대 현황', () => {
  for (const f of ['firstTimeCoach', 'showDefeatAdvice', 'visualStatus']) assert.match(game, new RegExp(`function H\\.${f}\\(`));
  assert.match(game, /finalWinner == "b" and H\.showDefeatAdvice/);
  assert.match(view, /cargoProfit = \(function\(\)/);
  assert.match(game, /mode == "profit"/);
});

test('작은 화면은 안내를 세로 배치하고 교역 판단과 실행을 먼저 보여 준다', () => {
  const home = game.split('function H.menuHomeStrip()')[1].split('-- [이야기 흐름')[0];
  assert.match(home, /grid\.FillDirectionMaxCells = if compact then 1 else 3/);
  assert.match(home, /d\.TextWrapped = true/);
  const trade = game.split('local function openTradeHall()')[1].split('H.tradeHall = openTradeHall')[0];
  assert.match(trade, /local infoTop = 80/);
  assert.match(trade, /big\.Position = UDim2\.new\(0\.5, 0, 0, articleTop \+ 8\)/);
  assert.match(trade, /hg = mkButton\(desk,/);
  assert.match(trade, /hg\.Position = UDim2\.new\(1\/3,/);
  const qty = trade.split('local function setQuantity(value)')[1].split('local function quantityButton')[0];
  assert.match(qty, /refreshReceipt\(\)/);
  assert.doesNotMatch(qty, /build\(\)/);
});

test('등록된 청동 안내 원화와 9분할 프레임만 선택적으로 연결한다', () => {
  const chip = game.split('function H.refreshNextStep()')[1].split('function H.menuHomeStrip()')[0];
  assert.match(chip, /local chipArt = AssetIds\["CardArt\/ui_frame_chip"\]/);
  assert.match(chip, /if chipArt then/);
  assert.match(chip, /art\.SliceCenter = Rect\.new\(24, 24, 488, 104\)/);
  assert.match(chip, /H\.hasIconArt\("nextstep"\)/);
  assert.match(chip, /chip\.Activated:Connect/);
  const home = game.split('function H.menuHomeStrip()')[1].split('-- [이야기 흐름')[0];
  assert.match(home, /local frameArt = AssetIds\["CardArt\/ui_frame_card"\]/);
  assert.match(home, /art\.SliceCenter = Rect\.new\(24, 24, 232, 232\)/);
  assert.match(home, /\{ "nextstep", "recommend", "reward" \}/);
  assert.match(home, /if frameArt then INK else/);
  assert.match(home, /b\.Activated:Connect/);
  assert.match(home, /grid\.FillDirectionMaxCells = if compact then 1 else 3/);
});

test("전면 재구성 메뉴: 가로 기능 레일, 세로 탭, 장식 전시장 제거, 실제 기능 본문 우선", () => {
  const layout = game.split("function H.layoutBook()")[1].split("mainInner:GetPropertyChangedSignal")[0];
  assert.match(layout, /local rail = tabs and width >= 700 and width > height and not facilityDetail/);
  assert.match(layout, /Enum\.ScrollingDirection\.Y else Enum\.ScrollingDirection\.X/);
  assert.match(layout, /local tabH, gap = 44, 4/);
  assert.match(layout, /content\.Size = UDim2\.new\(1, -bodyX - 6, 1, -bodyY - 6\)/);
  assert.doesNotMatch(game, /function H\.renderFacilityGallery|H\.facilityGallery|H\.menuFocusBanner|H\.menuActionDock/);
  const render = game.split("function render()")[1].split("-- [단일 시작 화면]")[0];
  assert.ok(render.indexOf("RENDERERS[currentTab]()") < render.indexOf("H.menuHomeStrip()"));
  assert.ok(render.indexOf("RENDERERS[currentTab]()") < render.indexOf("H.firstTimeCoach(currentTab)"));
});
