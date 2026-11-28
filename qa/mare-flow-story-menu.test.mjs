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
  assert.match(game, /setPortrait\(facilityGroup\.name\)/);
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
  assert.match(view, /prevEnding = previous and select\(2, S\.Quest\.storyOf\(previous\)\)/);
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

test('제2~4장 분기 결말이 다음 장의 기존 퀘스트에 연결된다', () => {
  for (let n = 2; n <= 4; n++) {
    assert.ok(ch.includes('afterAny = { "ch' + (n-1) + '_5a", "ch' + (n-1) + '_5b" }'));
    for (const suffix of ['1','2','3','4','5a','5b']) assert.ok(ch.includes('id = "ch'+n+'_'+suffix+'"'));
  }
  assert.match(questSvc, /if quest\.afterAny then/);
  assert.match(questSvc, /if quest\.chapter and not a and countActive\(state\) < MAX_ACTIVE then/);
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

test('탐험 재개는 완료된 기록 수호 두목만 제거하고 다른 전투와 보상을 유지한다', () => {
  const field = fs.readFileSync(`${root}/src/ReplicatedStorage/Shared/FieldScene.luau`, 'utf8');
  const resume = field.split('-- [보스전 재개]')[1].split('-- [전투 목표')[0];
  assert.match(resume, /found > 0 and isBoss and i == enemyCount \+ 1 and targetCard and not isWildlife/);
  assert.match(resume, /and bossRole ~= "giant" then/);
  assert.match(resume, /if fm then FM\.destroy\(fm\) end/);
  assert.match(resume, /table\.remove\(enemies\)/);
  assert.match(resume, /model:Destroy\(\)/);
  assert.match(resume, /FieldBossCheckpointRestored", true/);
  assert.doesNotMatch(resume, /onFinish\(|onCheckpoint\(|grantCard\(|gainXp\(/);
});

test('위험 3단계 유적은 깊은 경계 구역과 실제 입구 탈출을 순서대로 저장한다', () => {
  const field = fs.readFileSync(`${root}/src/ReplicatedStorage/Shared/FieldScene.luau`, 'utf8');
  const route = field.split('-- [구역 경로]')[1].split('-- [탐험 지역변수 한도]')[0];
  const checks = [/nodeCount == 3 and \(opts\.danger or 1\) >= 3/,
    /and not isWildlife/,
    /if guardedTransit then pos = ORIGIN \+ Vector3\.new\([^]*?-half \+ 40\) end/,
    /if extraction then pos = ORIGIN \+ Vector3\.new\(0, 0, half - 14\) end/,
    /elseif not extraction then/,
    /currentRoot\.Position - anchor\.Position\)\.Magnitude > 16/,
    /not enemy\.ac\.dead/,
    /enemy\.root\.Position - currentRoot\.Position\)\.Magnitude < 16/,
    /opts\.onCheckpoint\(i, recordCard\)/,
    /if not recorded then/,
    /if nextKind == "escape"/];
  for (const check of checks) assert.match(route, check);
  assert.ok(route.indexOf('if guardedTransit or extraction then') < route.indexOf('opts.onCheckpoint(i, recordCard)'));
  assert.ok(route.indexOf('if not recorded then') < route.indexOf('found += 1'));
  assert.doesNotMatch(route, /grantCard\(|gainXp\(|finish\("clear"\)/);
});

test('미스터리 탐험은 기존 척후병 추적을 실제 이동과 격파에 연결하고 재개 단계는 보존한다', () => {
  const field = fs.readFileSync(`${root}/src/ReplicatedStorage/Shared/FieldScene.luau`, 'utf8');
  for (const check of [/elseif type\(opts\.fieldStory\) == "table" and table\.find\(availableCards, opts\.fieldStory\.cardId\)/,
    /FieldPursuitRoute", folder:GetAttribute\("FieldEscapeRoute"\) == true/,
    /guardedTransit and folder:GetAttribute\("FieldPursuitPending"\)/,
    /found < 2 and not isBoss and ac\.kind == "archer"/,
    /not folder:GetAttribute\("FieldPursuitAssigned"\)/,
    /model:SetAttribute\("FieldPursuitTarget", true\)/,
    /found == 1 and e\.model:GetAttribute\("FieldPursuitTarget"\)/,
    /folder:SetAttribute\("FieldPursuitPending", false\)/,
    /local destination = folder:FindFirstChild\("Discovery2"\)/,
    /desired = route\.Unit \* math\.min\(e\.ac\.def\.speed \* 0\.85/]) assert.match(field, check);
  assert.ok(field.indexOf('if observedCardId and table.find(availableCards, observedCardId)') < field.indexOf('elseif type(opts.fieldStory) == "table"'));
  assert.ok(field.indexOf('if guardedTransit and folder:GetAttribute("FieldPursuitPending")') < field.indexOf('opts.onCheckpoint(i, recordCard)'));
});

test('고립 조사원은 실제 주민 모델로 구출 후 동행하며 안전한 지면과 기존 단계 저장을 사용한다', () => {
  const field = fs.readFileSync(`${root}/src/ReplicatedStorage/Shared/FieldScene.luau`, 'utf8');
  for (const check of [/table.find\(\{ "pompeii_ruins", "auto_site_naples_high", "alexandria_library" \}, opts.siteId\)/,
    /local ok, resident = pcall\(Pose.createR15, folder, hit.Position/,
    /resident.Name = "FieldRescueResident"/,
    /folder:SetAttribute\("FieldRescueRoute", true\)/,
    /if found == 2 then/,
    /not enemy.ac.dead and enemy.root and enemy.root.Parent and \(enemy.root.Position - residentRoot.Position\).Magnitude < 10/,
    /delta.Magnitude > 5 and delta.Magnitude < 30/,
    /floor.Material ~= Enum.Material.Water and floor.Normal.Y >= 0.8 and not blocked/,
    /resident:PivotTo\(CFrame.lookAt\(position, position \+ delta.Unit\)\)/,
    /Pose.walkR15\(resident, phase, moving\)/,
    /survivorRoot.Position - currentRoot.Position\).Magnitude > 16/,
    /if not folder:GetAttribute\("FieldRescueRoute"\) then warn/]) assert.match(field, check);
  assert.ok(field.indexOf('survivorRoot.Position - currentRoot.Position).Magnitude > 16') < field.indexOf('opts.onCheckpoint(i, recordCard)'));
});

test('두목 능력 및 기술 단계는 공용 전투 상태로 계산하고 필드에서는 연출만 수행한다', () => {
  const field = fs.readFileSync(`${root}/src/ReplicatedStorage/Shared/FieldScene.luau`, 'utf8');
  const ac = fs.readFileSync(`${root}/src/ReplicatedStorage/Shared/ActionCombat.luau`, 'utf8');
  const block = field.split('-- [두목 능력 변화]')[1].split('\n\t\te.hp =')[0];
  assert.match(block, /AC\.advanceBossAbilities\(e\.ac, e\.maxHp\)/);
  assert.match(block, /if faster then/);
  assert.match(block, /if reach then/);
  assert.match(block, /if rage then/);
  assert.doesNotMatch(block, /FieldBossPhase|\.def\.\w+\s*\*=/);
  assert.match(field, /AC\.bossPhase\(e\.ac\.hp, e\.maxHp\)/);
  for (const check of [/ratio < 0\.66/, /ratio < 0\.33/, /ratio <= 0\.5/, /e\.def\.speed \*= 1\.25/, /e\.def\.windup \*= 0\.85/, /e\.def\.range \*= 1\.2/, /e\.def\.recover \*= 1\.6/]) assert.match(ac, check);
});

test('두목 HUD는 공용 기술 단계와 실제 체력을 표시하며 대기 중인 연속 두목을 제외한다', () => {
  const field = fs.readFileSync(`${root}/src/ReplicatedStorage/Shared/FieldScene.luau`, 'utf8');
  const setup = field.split('-- [두목 체력 HUD]')[1].split('-- [상호작용 안내]')[0];
  const update = field.split('-- [두목 HUD 갱신]')[1].split('local attackers = AC.attackersCount(enemies)')[0];
  assert.match(setup, /panel.Parent = gui/);
  assert.match(setup, /panel.Visible = false/);
  assert.match(setup, /0\.70, 0\.40, 0\.15/);
  assert.match(update, /now \+ 0\.1/);
  assert.match(update, /enemy.bossIntroduced and not enemy.ac.dead/);
  assert.match(update, /order == folder:GetAttribute\("FieldBossRushNext"\)/);
  assert.match(update, /AC.bossPhase\(hp, target.maxHp\)/);
  assert.match(update, /hud.fill.Size = UDim2.fromScale\(ratio, 1\)/);
  assert.match(update, /hud.hp ~= hp/);
  assert.match(update, /hud.panel.Visible = false/);
  assert.doesNotMatch(update, /\.ac\.hp\s*=|onCheckpoint\(|grantCard\(|gainXp\(/);
});


test('해상 일지는 기존 전투 원화와 정확한 작전 진입 버튼을 제공한다', () => {
  const sea = game.split('elseif section == "sea" then')[1].split('elseif section == "done" then')[0];
  assert.match(game, /text = "해상 전투", color = if section == "sea"/);
  assert.match(sea, /kind = "FacilityArt", icon = if q\.kind == "war_clear" then "war" else "battle"/);
  assert.match(sea, /targetId = "war_" \.\. q\.regionId/);
  assert.match(sea, /candidate\.id == targetId/);
  assert.match(sea, /w\.id == targetId[\s\S]*?w\.next == true, function\(\) call\("WarNext"\)/);
  assert.match(sea, /operation\.blocked == nil, function\(\) call\("WarStart", \{ id = operation\.id \}\)/);
  assert.match(sea, /elseif w then[\s\S]*?caption, enabled = "함대전 진행 중", false/);
  assert.match(sea, /view\.ship\.hull < view\.ship\.maxHull \* 0\.3/);
  assert.match(sea, /function\(\) call\("Hunt"\) end/);
  assert.match(sea, /if seen\[q\.id\]/);
  assert.match(sea, /for _, q in view\.quests\.active do navalTile\(q, true\) end/);
  assert.match(sea, /for _, q in view\.quests\.available do navalTile\(q, false\) end/);
  assert.match(sea, /H\.tileGrid\(tiles, content, 176, 210\)/);
  assert.match(view, /exploreSite = q\.exploreSite, warId = q\.warId, regionId = q\.regionId/);
  assert.match(view, /auto = S\.Quest\.isAuto\(q\), kind = q\.kind, warId = q\.warId, regionId = q\.regionId/);
});
