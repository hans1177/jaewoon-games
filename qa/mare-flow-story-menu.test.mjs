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
  assert.match(trade, /local specimenPx = if shortScreen then 56 else 96/);
  assert.match(trade, /local infoTop = specimenPx \+ 14/);
  assert.match(trade, /local narrow = width < 640/);
  assert.match(trade, /math\.floor\(availableW \* 0\.43\)/);
  assert.match(trade, /artTap\.Activated:Connect\(openSelectedGoodEncyclopedia\)/);
  assert.doesNotMatch(trade, /TradeEncyclopediaGallery|TradeBookPage/);
  assert.match(trade, /row\.Size = UDim2\.new\(1, -8, 0, 116\)/);
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
  assert.match(layout, /local compactLandscape = width >= 600 and width > height and height < 440/);
  assert.match(layout, /local rail = tabs and \(compactLandscape or \(width >= 700 and width > height and not facilityDetail and currentTab ~= "route" and currentTab ~= "tech"\)\)/);
  assert.match(layout, /local bottomInset = if tabs and not rail then tabH \+ 10 else 6/);
  assert.match(layout, /H\.menuRecentButton\.Visible = not not showRecent/);
  assert.match(layout, /icon\.Size = UDim2\.fromOffset\(32, 32\)/);
  assert.match(layout, /Enum\.ScrollingDirection\.Y else Enum\.ScrollingDirection\.X/);
  assert.match(layout, /local tabH, gap = if rail and not compactLandscape then 50 else 62, 4/);
  assert.match(layout, /tabBar\.Position = if rail then UDim2\.fromOffset\(6, headerH \+ 4\) else UDim2\.new\(0, 6, 1, -tabH - 6\)/);
  assert.match(layout, /content\.Size = UDim2\.new\(1, -bodyX - 6, 1, -bodyY - bottomInset\)/);
  assert.doesNotMatch(game, /function H\.renderFacilityGallery|H\.facilityGallery|H\.menuFocusBanner|H\.menuActionDock/);
  const render = game.split("function render()")[1].split("-- [단일 시작 화면]")[0];
  assert.ok(render.indexOf("RENDERERS[currentTab]()") < render.indexOf("H.menuHomeStrip()"));
  assert.ok(render.indexOf("RENDERERS[currentTab]()") < render.indexOf("H.firstTimeCoach(currentTab)"));
});

test('항해·연구 선택과 상세를 분리하고 실제 서버 행동을 하단에 둔다', () => {
  const route = game.split('function RENDERERS.route()')[1].split('local openYardHall')[0];
  const tech = game.split('function RENDERERS.tech()')[1].split('function RENDERERS.quest()')[0];
  for (const [body, prefix, list] of [[route, 'Route', 'RouteDestinationList'], [tech, 'Research', 'ResearchTechnologyList']]) {
    assert.ok(body.includes('"' + list + '"'));
    for (const suffix of ['Decision', 'ActionBar', 'Select']) assert.ok(body.includes('"' + prefix + suffix + '"'));
    assert.match(body, /root\.AbsoluteSize\.X >= 640/);
    assert.match(body, /list\.Visible = wide or selected == nil/);
    assert.match(body, /detail\.Visible = wide or selected ~= nil/);
    assert.match(body, /footer\.Size = UDim2\.new\(if wide then 0\.57 else 1, if wide then -5 else 0, 0, 48\)/);
    assert.match(body, /root\.Destroying:Connect\(function\(\) resize:Disconnect\(\) end\)/);
    assert.match(body, /bookmark\.Name = "SelectedBookmark"/);
    assert.match(body, /ReducedMotionEnabled/);
    assert.match(body, /Scale = 1\.08/);
  }
  for (const name of ['RouteMiniChartMap', 'RouteSupplyMeter', 'RouteCoalMeter', 'RouteCargoProfit']) assert.ok(route.includes(name));
  assert.match(route, /confirmSail\(selected\)/);
  assert.match(route, /call\("WaitDay", \{\}\)/);
  assert.match(route, /if selected and not selected\.locked then/);
  assert.match(route, /H\.routeListScroll = list\.CanvasPosition\.Y/);
  assert.match(tech, /ResearchProgress/);
  assert.match(tech, /previous < completed/);
  assert.match(tech, /ResearchBudgetMeter/);
  assert.match(tech, /not selected\.owned and selected\.blocked == nil and \(selected\.cost or 0\) <= coins/);
  assert.match(tech, /call\("Research", \{ techId = selected\.id \}\)/);
});

test('항구·선장·동료·탐험 기능별 장부와 실제 상태 연결', () => {
  const harbor = game.split('function RENDERERS.harbor()')[1].split('function RENDERERS.recruit()')[0];
  const crew = game.split('function RENDERERS.crew()')[1].split('function RENDERERS.status()')[0];
  const captain = game.split('function RENDERERS.status()')[1].split('function intelName')[0];
  const explore = game.split('function RENDERERS.explore()')[1].split('-- 학자 방문')[0];
  for (const key of ['HarborFacilityIndex', 'HarborConstructionProgress', 'BankEntry']) assert.ok(harbor.includes(key), key);
  for (const key of ['Deposit','Withdraw','Borrow','Repay','BuildStage','BuyLicense','BuyInsurance','Audience','Invest','Resupply','Rumor']) assert.ok(harbor.includes('call("' + key + '"'), key);
  assert.match(harbor, /H\.bankVisitPending then H\.harborPage = "finance"/);
  for (const key of ['CaptainSectionIndex', 'CaptainFullBody', 'CaptainApprovedPortrait', 'WeaponMasteryStages', 'CareerExperienceMeter','SpecialtyExperienceMeter']) assert.ok(captain.includes(key), key);
  assert.match(captain, /character:Clone\(\)/);
  assert.match(captain, /view\.weaponPractice/);
  assert.match(captain, /local thresholds = \{ 0, 8, 26, 55, 100, 170, 260, 380, 530, 720 \}/);
  assert.match(captain, /WeaponMasteryExperience/);
  assert.match(captain, /Weapons\.actionDesign\(weapon\)/);
  assert.match(captain, /stage:SetAttribute\("MasteryUnlocked", i <= rank\)/);
  assert.match(captain, /stage\.Activated:Connect/);
  assert.match(captain, /MasteryMotionPreview/);
  assert.match(captain, /if activePreview then activePreview:Destroy\(\) end/);
  assert.match(captain, /fm\.weaponCombo\(profile, i\)/);
  assert.match(captain, /fm\.new\(model, false\)/);
  assert.match(captain, /model:GetAttribute\("FieldJointReady"\)/);
  assert.match(captain, /fm\.sample\(combo, math\.min\(elapsed, duration\), rig\.canon\)/);
  assert.match(captain, /while panel\.Parent and main\.Visible and elapsed < duration do/);
  assert.match(captain, /fm\.destroy\(rig\)/);
  assert.match(captain, /local reduced = game:GetService\("GuiService"\)\.ReducedMotionEnabled/);
  assert.match(captain, /if rank >= 8 then "필살기 해금/);
  assert.match(captain, /local cols = math\.clamp\(math\.floor\(\(width \+ 4\) \/ 48\), 1, 5\)/);
  assert.match(captain, /local height = math\.ceil\(10 \/ cols\) \* 48 - 4/);
  assert.match(captain, /grid\.CellSize = UDim2\.new\(1 \/ cols, -4 \* \(cols - 1\) \/ cols, 0, 44\)/);
  assert.match(captain, /view\.fieldStreakBest/);
  assert.match(captain, /gearDefs\[g\.id\]\.perk/);
  for (const key of ['ToggleGear','BuyGear','SetSpecialty','SetSubSpecialty']) assert.ok(captain.includes('call("' + key + '"'), key);
  assert.match(crew, /CrewSectionIndex/);
  assert.match(crew, /H\.openCabin\(\)/);
  assert.match(crew, /call\("Station",/);
  assert.match(explore, /ExploreFilterIndex/);
  assert.match(explore, /ExploreDifficultyMeter/);
  assert.match(explore, /enabled = site\.unlocked and site\.left > 0/);
  assert.match(explore, /H\.startField\(site\)/);
});

test('의뢰 선택 시 실제 상세만 노출하고 탐험 경로를 단서와 목적지로 표시한다', () => {
  const quest = game.split('function RENDERERS.quest()')[1].split('-- 주점의 지식 카드 배틀')[0];
  assert.match(quest,/JournalVisualSections/);
  assert.match(quest,/for _, q in \(if selected then \{ selected \} else active\) do/);
  assert.match(quest,/H\.questDetailId = nil; content\.CanvasPosition = Vector2\.zero; render\(\)/);
  assert.match(quest,/FieldRoutePath/);
  assert.match(quest,/route\.leadSource or "현지 탐험"/);
  assert.match(quest,/route\.port/);
  assert.match(quest,/openTab\(targetTab\)/);
});


test('숙련 시연은 기존 실전 무기 장착 책임 함수와 실제 단계 해금 연출을 재사용한다',()=>{
  const game=fs.readFileSync('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau','utf8');
  const field=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/FieldScene.luau','utf8');
  assert.equal((field.match(/function FieldScene\.equipFieldWeapon\(/g)||[]).length,1);
  assert.match(field,/FieldScene\.equipFieldWeapon\(player\.Character, wpn\)/);
  assert.match(game,/pcall\(sceneModule\.equipFieldWeapon, model, weapon\)/);
  assert.match(game,/equipped and source == "registered"/);
  assert.match(game,/MasterySelectionRim/);
  assert.match(field,/showCombo\(string.format\("%s 숙련 %d단! · %s 해금", wpn.name, rank, unlocked\), true/);
});


test('선장실 직책판은 실제 직책·적합 후보와 지상 지원 순서를 표시한다',()=>{
  const start=game.indexOf('function H.openCabin()');
  const cabin=game.slice(start,game.indexOf('-- [방문 단일화]',start));
  assert.ok(start>=0 && cabin.length>1000);
  for(const name of ['CabinStationBoard','CabinCompanionRoster','StationMatched','SelectedCompanionFits','FieldSupportOrder','CurrentStation','CabinSupportSkills']) assert.ok(cabin.includes(name),name);
  assert.match(cabin,/c\.joined and supportCount < 2/);
  assert.match(cabin,/jobs\.Categories\[c\.role or ""\]/);
  assert.match(cabin,/skill\.name \.\. " " \.\. tostring\(skill\.cooldown\)/);
  assert.match(cabin,/call\("Station", \{ companionId = id, station = stationId \}\)/);
  assert.match(cabin,/call\("AutoStations"\)/);
  assert.match(cabin,/root\.ScrollingEnabled = true/);
  assert.match(cabin,/local slotColumns = if availableWidth >= 338 then 2 else 1/);
  for(const width of [320,375,568,760,1024]){
    const wide=width>=760;
    const available=wide?width*.58-12:width-16;
    const slots=available>=338?2:1;
    const columns=Math.max(1,Math.floor((available-4)/150));
    assert.ok((available-12)/slots-10>120);
    assert.ok(Math.ceil(6/slots)*112+42>Math.ceil(6/slots)*104+34);
    assert.ok((available-12)/columns-8>=130);
  }
});
