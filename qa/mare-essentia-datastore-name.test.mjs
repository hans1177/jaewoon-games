import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

// [윈도우 러너 이식성] 체크아웃 줄바꿈(CRLF)과 무관하게 동일한 원문 내용을 검사한다.
const readText=(file)=>fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');

// [시설 탭 최초 배치 회귀] 모바일 첫 렌더와 화면 크기 갱신이 같은 배치 규칙을 사용한다.
test('시설 탭 아이콘과 글자는 첫 생성부터 모바일 규격으로 배치된다',()=>{
  const game=readText('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau');
  assert.match(game,/icon\.Position = if compactTabs then UDim2\.new\(0\.5, -13, 0, 3\) else UDim2\.new\(0, 7, 0\.5, -13\)/);
  assert.match(game,/caption\.TextXAlignment = if compactTabs then Enum\.TextXAlignment\.Center else Enum\.TextXAlignment\.Left/);
  assert.match(game,/textLimit\.MaxTextSize = if compactTabs then 14 else 17/);
});

// DataStore 이름이 개명·유니버스 변경 중에 조용히 바뀌어 플레이어 저장이 초기화되는 사고를 막는다.
// (2026-11-08: 새 유니버스에서 MareEssentia_v2로 저장이 시작됨.) 바꿔야 한다면 기존 저장 이전(마이그레이션)을 먼저 구현하고 이 테스트를 의도적으로 갱신한다.
const core=readText('roblox-games/mare-essentia/src/ServerScriptService/Core.server.luau');

// [시작 로딩 회귀] 저장을 건드리지 않는 진단만 노출하고, 실제 서버/클라이언트 어느 단계에서 멈췄는지 증명한다.
test('스튜디오 실제 로딩 대기에서 서버·클라이언트 원인 증거를 남긴다',()=>{
  const capture=JSON.parse(readText('roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-qa-click.json'));
  assert.equal(capture.length,1000);
  // [지상맵 실입력] 비차단 카드 획득 알림은 대기 대상에서 제외하되, 실제 입력 가림막은 계속 검사한다.
  const entry=capture[236];
  assert.equal(entry.type,'click_from_luau');
  assert.equal(entry.label,'field_entry');
  assert.match(entry.code,/gain\.Enabled and gain:GetAttribute\('NonBlockingCardNotice'\)~=true/);
  assert.match(entry.code,/FIELD_ENTRY_CARD_GAIN_STILL_BLOCKING/);
  assert.match(entry.code,/GetGuiObjectsAtPosition\(x,y\)/);
  assert.match(entry.code,/FIELD_ENTRY_TOPMOST_BLOCKER/);
  assert.match(entry.code,/FIELD_ENTRY_BUTTON_HITBOX_HIDDEN/);
  assert.match(entry.code,/FIELD_ENTRY_BUTTON_INPUT_DISABLED/);
  assert.match(entry.code,/btn\.InputBegan:Connect/);
  assert.match(entry.code,/btn\.Activated:Connect/);
  assert.match(capture[239].code,/FieldEntryStage/);
  // [장시간 검증] 실제 입장·모션 확인 뒤 Studio 임시 생존 보호를 켜고 최종에 반드시 해제한다.
  assert.match(capture[246].code,/FIELD_QA_GOD_MODE_STUDIO_ONLY/);
  assert.match(capture[246].code,/FIELD_QA_ALIVE_BEFORE_HOLD/);
  assert.match(capture[246].code,/workspace:SetAttribute\("DevGod",true\)/);
  assert.match(capture[999].code,/FIELD_QA_GOD_MODE_LOST/);
  assert.match(capture[999].code,/workspace:SetAttribute\("DevGod",nil\)/);
  const fieldSource=readText('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/FieldScene.luau');
  assert.match(fieldSource,/if workspace:GetAttribute\("DevGod"\) then pl\.hp = pl\.maxHp end/,'기존 개발 촬영 보호만 재사용');

  // [270단계 확장] 기존 246개 실제 플레이 검사 인덱스·클릭·판정을 보존하고 신규 24단계를 뒤에 추가한다.
  assert.equal(capture[245].name,'field_actor_after_motion');
  const extra=capture.slice(246,270);
  assert.equal(extra.length,24,'기존 246단계 삭제·중간 삽입 금지');
  const captures=extra.filter(row=>row.type==='capture').map(row=>row.name);
  assert.deepEqual(captures,[
    'field_registry_181','field_palette_variants','field_ground_visible_extra',
    'field_camera_normal','field_hud_touch_bounds','field_hud_hitbox',
    'field_notice_overlap','field_runtime_fps_sample'
  ],'8개 추가 실화면 캡처 유지');
  const verifies=extra.filter(row=>row.type==='luau');
  assert.equal(verifies.length,8,'8개 런타임 검사 유지');
  assert.equal(extra.filter(row=>row.type==='wait').length,8,'24단계의 대기·촬영 흐름 유지');
  for(const marker of [
    'PORT_181_RUNTIME_PALETTES_PASS','PORT_181_VARIANTS_PASS',
    'FIELD_EXT_WORLD_PASS','FIELD_EXT_CAMERA_PASS',
    'FIELD_EXT_TOUCH_LAYOUT_PASS','FIELD_EXT_POINTER_HITBOX_PASS',
    'FIELD_EXT_NONBLOCKING_NOTICE_PASS','FIELD_EXT_RENDER_OBSERVED'
  ])assert.ok(verifies.some(row=>row.code.includes(marker)),'실제 검증 단계 누락: '+marker);
  assert.ok(verifies.some(row=>row.code.includes('actual181Screenshots=false')),'181개 항구 전체 실화면 촬영으로 과대 표기 금지');
  assert.ok(verifies.some(row=>row.code.includes('notPerformancePass=true')),'관측 FPS를 성능 통과로 과대 표기 금지');
  // [전수 회귀] 전체 181개 항구 각각 위치·교역·문화권·외형 4종 검사.
  const perPort=capture.slice(270,994);
  assert.equal(perPort.length,724,'181개 항구 각각 네 가지 개별 검증 유지');
  assert.ok(perPort.every(row=>row.type==='luau'&&row.ctx==='Client'),'항구 검사는 기존 Studio 실제 Client에서 실행');
  const portIds=new Set();
  const expectedKinds=['PORT_GEO_PASS:','PORT_TRADE_PASS:','PORT_CULTURE_PASS:','PORT_APPEARANCE_PASS:'];
  for(let i=0;i<perPort.length;i+=4){
    const group=perPort.slice(i,i+4);
    const names=group.map((row,j)=>{
      const match=row.code.match(/PORT_(?:GEO|TRADE|CULTURE|APPEARANCE)_PASS:([a-z0-9_]+)/);
      assert.ok(match,'항구 개별 검사 기록 누락: '+(270+i+j));
      assert.ok(row.code.includes(expectedKinds[j]),'항구 개별 검증 분야 순서 변경');
      return match[1];
    });
    assert.ok(names.every(name=>name===names[0]),'항구 4종 검사가 다른 항구에 적용됨');
    assert.ok(!portIds.has(names[0]),'동일 항구 검사 중복: '+names[0]);
    portIds.add(names[0]);
  }
  assert.equal(portIds.size,181,'등록 181개 항구 검사 유지');
  const aggregate=capture.slice(994);
  assert.equal(aggregate.length,6,'전체 카탈로그/상징물/다양성/실플레이 최종 검증');
  for(const marker of [
    'NATION_START_PORT_PASS','TRADE_GOODS_PASS','LANDMARKS_PASS',
    'PORT_CULTURE_COVERAGE_PASS','PORT_PALETTE_DIVERSITY_PASS',
    'STUDIO_1000_FINAL_STATE_PASS'
  ])assert.ok(aggregate.some(row=>row.code.includes(marker)),'1000단계 종합 검증 누락: '+marker);
  assert.ok(aggregate.at(-1).code.includes('real_screen_port_visits=UNVERIFIED'),'항구 전수 데이터 검사를 181개 실제 화면 촬영으로 허위 보고 금지');
  // [통합 표지 QA] 실제 시작 화면과 클릭 순서를 검사해 이전 버튼명 회귀를 차단한다.
  assert.match(capture[4].code,/FindFirstChild\('TitleBackdrop'\)/);
  assert.match(capture[4].code,/FindFirstChild\('TitlePanel'\)/);
  assert.match(capture[6].code,/local pref=\{"프랑스"\}/);
  assert.match(capture[9].code,/local pref=\{"상인 집안"\}/);
  assert.match(capture[11].code,/local pref=\{"상인 집안"\}/);
  assert.match(capture[16].code,/local pref=\{"출항하기"\}/);
  // [모바일 큰 원화] 실제 전시 원화의 높이를 반영해 겹침을 검사한다.
  assert.match(capture[87].code,/FindFirstChild\('FacilityGallery'\)/);
  assert.match(capture[87].code,/expectedTop=gallery\.Position\.Y\.Offset\+gallery\.AbsoluteSize\.Y\+8/);
  assert.match(capture[87].code,/content\.Position\.Y\.Offset==expectedTop/);
  assert.match(capture[4].code,/MARE_TITLE_NOT_READY_AFTER_50S;LOADING=/);
  assert.match(capture[4].code,/MareCoreStartStage/);
  assert.match(capture[4].code,/StartupStage/);
  assert.match(capture[4].code,/MareAssetsReady/);
  assert.match(capture[4].code,/MarePortSceneStage/);
  assert.match(capture[4].code,/PortSceneLoadState/);
  assert.match(client,/local PortScene = nil/);
  assert.match(client,/gui:SetAttribute\("PortSceneLoadState", "loading"\)/);
  assert.match(client,/gui:SetAttribute\("PortSceneLoadState", "ready"\)/);
  assert.match(client,/if not PortScene then return end/);
  assert.match(client,/return require\(Shared:WaitForChild\("PortScene"\)\)/);
  assert.match(client,/gui:SetAttribute\("StartupStage", "server-state-request"\)/);
  assert.match(client,/gui:SetAttribute\("StartupStage", "title-ready"\)/);
  assert.match(core,/MareCoreStartStage", "require-services"/);
  assert.match(core,/MareCoreStartStage", "remote-ready"/);
  assert.match(core,/MareCoreStartStage", "session-ready"/);
  assert.match(core,/local STORE_NAME = "MareEssentia_v2"/);
  assert.match(core,/return "P_" \.\. player.UserId/);
});

test('서재 백과 책 판면·모바일 넘기기·시설 내 교역 평균가 회귀', () => {
  const source=readText('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau');
  const capture=JSON.parse(readText('roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-qa-click.json'));
  // 시설 원화 카드(7:10)는 모든 탭에 표시한다(9d6ab6fcf8). 예전 지도·서재 제외 조건 대신 카드 존재를 확인.
  assert.match(source,/FacilityArtCard7x10/);
  assert.match(source,/CodexQuickNavigation/);
  assert.match(source,/ScholarTradeEncyclopediaBook/);
  assert.match(source,/CodexBookLeftPage/);
  assert.match(source,/CodexBookRightPage/);
  assert.match(source,/CodexBookSpine/);
  assert.match(source,/책 펼치기/);
  assert.match(source,/showingNotes = not showingNotes/);
  // 서재의 발견 현황은 백과 표지에만, 최근 메뉴는 다른 시설에서만 보여 준다.
  assert.match(source,/H\.menuActionButton\.Text = actionText\n\s*-- \[서재 중복 제거\]/);
  assert.match(source,/H\.menuRecentButton\.Name = "RecentFacilityShortcut"/);
  assert.match(source,/recentBtn\.Name = "TradeRecentFacility"/);
  assert.match(source,/recentBtn\.Name = "YardRecentFacility"/);
  assert.doesNotMatch(source,/mkButton\(content, "↶ 최근 메뉴:/);
  // [탭 본문 복구] 기존 교역·조선 상세 렌더러를 새 창 없이 같은 책의 탭에 배치한다.
  assert.match(source,/local facilityDetail = currentTab == "trade" or currentTab == "yard"/);
  assert.match(source,/root\.Name = "FacilityDetail"/);
  assert.match(source,/detail\.Position = content\.Position/);
  assert.match(source,/detail\.Size = content\.Size/);
  assert.match(source,/if currentTab == "trade" then\s*if not mainInner:FindFirstChild\("FacilityDetail"\) then H\.tradeHall\(\) end/);
  assert.match(source,/elseif currentTab == "yard" then\s*if not mainInner:FindFirstChild\("FacilityDetail"\) then H\.yardHall\(\) end/);
  assert.doesNotMatch(source,/overlayGui\("TradeHallGui"/);
  assert.match(source,/call\("Buy", \{ goodId = sel\.id, amount = qty \}\)/);
  assert.match(source,/call\("Sell", \{ goodId = sel\.id, amount = math\.min\(qty, maxSell\) \}\)/);
  assert.match(source,/root:GetPropertyChangedSignal\("AbsoluteSize"\)/);
  assert.match(source,/chart\.Name = "ShipComparisonBars"/);
  assert.match(source,/sortBar\.Name = "TradeSort"/);
  assert.match(source,/H\.tradeProfit\(g, 1\)/);
  // 게시판과 우편, 시장 소식은 거래 장부 바로 옆 '거래소·우편' 탭에서 유지한다.
  assert.match(source,/id = "market", name = "거래소·우편"/);
  assert.match(source,/tabs = \{ "trade", "market", "harbor" \}/);
  assert.match(source,/function RENDERERS\.market\(\)/);
  for(const action of ['MarketList','MarketPost','MarketBuy','MarketCancel','MailInbox','MailClaim','MailSend']){
    assert.match(source,new RegExp('call\\("'+action+'"'));
  }
  // [서재] 보고·지식 백과·연구·세계 백과가 동일 탭창에서 전환되어야 한다.
  assert.match(source,/tabs = \{ "scholar", "codex", "tech", "encyclopedia" \}/);
  assert.match(source,/function RENDERERS\.scholar\(\)/);
  assert.match(source,/function RENDERERS\.codex\(\)/);
  assert.match(source,/function RENDERERS\.tech\(\)/);
  assert.match(source,/function RENDERERS\.encyclopedia\(\)/);
  assert.equal(capture.length,1000);
  assert.match(capture[39].code,/TRADE_TAB_DETAIL_NOT_VISIBLE/);
  assert.match(capture[122].code,/TRADE_TAB_MENU_PASS/);
  assert.match(capture[123].code,/TRADE_TAB_PRICES_AND_ACTIONS_PASS/);
  assert.match(capture[127].code,/YARD_MAINTENANCE_PASS/);
  assert.match(capture[131].code,/SHIP_INLINE_COMPARISON_PASS/);
});

// [공통 시설 메뉴 회귀] 기존 게임 기능·본문 유지, 상단 오른쪽 가로탭과 모바일 전체폭을 확인한다.
test('모든 시설 아이콘 탭을 오른쪽 상단에 배치하고 왼쪽 본문 공간을 복구한다', () => {
  const source=readText('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau');
  const layout=source.slice(source.indexOf('function H.layoutBook()'),source.indexOf('mainInner:GetPropertyChangedSignal("AbsoluteSize"):Connect(H.layoutBook)'));
  const tabs=source.slice(source.indexOf('function H.renderTabs()'),source.indexOf('-- 모든 시설 창 오른쪽 위 모서리의 × 닫기 버튼'));
  const capture=JSON.parse(readText('roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-qa-click.json'));
  assert.match(source,/tabBar\.Name = "FacilityTabBar"/);
  assert.match(source,/tabBar\.AnchorPoint = Vector2\.new\(1, 0\)/);
  assert.match(source,/H\.tabStrip\.Name = "FacilityTabStrip"/);
  assert.match(source,/H\.tabStrip\.ScrollingDirection = Enum\.ScrollingDirection\.X/);
  assert.match(layout,/local sectionTop = if compactTabs and not facilityDetail then 112 else 68/);
  assert.match(layout,/tabBar\.Position = UDim2\.new\(1, -8, 0, sectionTop\)/);
  assert.match(layout,/local bodyTop = if headerTabs then 68 else sectionTop \+ \(if tabs then tabHeight \+ 8 else 0\)/);
  assert.match(layout,/H\.tabWidth = tabWidth/);
  assert.match(layout,/H\.tabStrip\.CanvasSize = UDim2\.fromOffset\(allTabsWidth, 0\)/);
  assert.match(source,/local tabLayout = Instance\.new\("UIListLayout"\)/);
  assert.match(source,/tabLayout\.FillDirection = Enum\.FillDirection\.Horizontal/);
  assert.match(source,/tabLayout\.Wraps = false/);
  assert.doesNotMatch(source,/local tabLayout = Instance\.new\("UIGridLayout"\)/);
  assert.match(layout,/content\.Position = UDim2\.fromOffset\(8, bodyTop\)/);
  assert.match(layout,/content\.Size = UDim2\.new\(1, -16, 1, -bodyTop - 8\)/);
  assert.match(layout,/H\.facilityGallery\.Position = UDim2\.fromOffset\(8, bodyTop\)/);
  assert.match(layout,/content\.Position = UDim2\.fromOffset\(8, contentY\)/,'원화 배너 아래 본문 전체 폭');
  assert.doesNotMatch(layout,/local navW\s*=/);
  assert.match(tabs,/mkButton\(H\.tabStrip, TAB_NAME\[id\]/);
  assert.equal(capture.length,1000);
  assert.equal(capture[88].name,'ui_mobile_tabs_topright');
  for(const claim of ['MOBILE_TABS_NOT_ONE_ROW','MOBILE_TABS_NOT_TOP_RIGHT','MOBILE_LEFT_SPACE_NOT_RECLAIMED','MOBILE_TABS_WRAPPED_TO_SECOND_ROW','MOBILE_LAST_TAB_NOT_REACHABLE']){
    assert.ok(capture[87].code.includes(claim),claim);
  }
});

test('새 항해 첫 카드 창 오발동 차단과 가죽·양피지 버튼 계약', () => {
  const source=readText('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau');
  const capture=JSON.parse(readText('roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-qa-click.json'));
  const buttonCode=source.slice(source.indexOf('local function mkButton('),source.indexOf('local function mkRow('));
  assert.match(source,/pickBefore ~= pickKey/);
  assert.match(source,/action ~= "State" and action ~= "NewGame" and action ~= "CardPick"/);
  assert.match(source,/and not H.titleMenuOpen and not H.openingPending/);
  assert.match(capture[29].code,/INTRO_UNEXPECTED_DECK_WINDOW/);
  assert.doesNotMatch(buttonCode,/Color3\.fromRGB\(183, 226, 177\)/);
  assert.doesNotMatch(buttonCode,/Color3\.fromRGB\(183, 215, 236\)/);
  assert.match(buttonCode,/elseif good or travel then Color3\.fromRGB\(251, 237, 208\)/);
  assert.match(source,/local groupWidth = statusWidth \+ recentWidth \+ 8/);
  assert.equal(capture.length,1000);
});

test('항구 장면의 소품 선택은 Luau 복수 반환 조건식 없이 실행된다', () => {
  const port=read('ReplicatedStorage/Shared/PortScene.luau');
  assert.doesNotMatch(port,/local propGroup, propName\s*=\s*if/);
  assert.match(port,/local propGroup, propName\s*\n\s*if family == "fishery" then/);
  assert.match(port,/propGroup, propName = "Cargo", "box-open"/);
});

// [시작 캐릭터 실증 회귀] 항구가 없는 공중 스폰은 숨기고, 바닥·카메라가 준비된 뒤에만 원복한다.
test('항구 시작과 재생성에서 공중 캐릭터가 노출되지 않는다', () => {
  const client=read('StarterPlayer/Game.client.luau');
  const spawn=client.slice(client.indexOf('function H.placeCharacterOnSpawn(character)'),client.indexOf('player.CharacterAdded:Connect(H.placeCharacterOnSpawn)'));
  assert.match(spawn,/root.Anchored = true/);
  assert.match(spawn,/character:PivotTo\(groundedSpawn\)/);
  assert.match(spawn,/workspace:Raycast\(sceneSpawn.Position/);
  assert.match(spawn,/root.Size.Y \* 0.5 \+ humanoid.HipHeight/);
  assert.match(spawn,/humanoid.RigType == Enum.HumanoidRigType.R6/);
  assert.match(spawn,/rootHeight \+= leg.Size.Y/);
  assert.match(spawn,/workspace:FindFirstChild\("FieldScene"\) or workspace:GetAttribute\("VoyageActive"\)/);
  assert.match(client,/H.placeCharacterOnSpawn\(char\)/);
  assert.match(spawn,/part.LocalTransparencyModifier = if sceneSpawn then 0 else 1/);
  assert.match(client,/player.CharacterAppearanceLoaded:Connect\(H.placeCharacterOnSpawn\)/);
  assert.match(client,/titleGui.Enabled = on or H.titleMenuOpen or waitingPort/);
  assert.match(client,/if H.portLoadingLabel then H.portLoadingLabel.Visible = waitingPort and not H.titleMenuOpen end/);
  assert.match(client,/if H.setTitleMode then H.setTitleMode\(not view or newGameMode\) end/);
  assert.match(client,/H.setTitleMode\(false\)/);
});

test('게임 시작 메뉴는 PortScene 정본을 기다리지 않고 서버 상태를 표시한다', () => {
  const port=read('ReplicatedStorage/Shared/PortScene.luau');
  assert.ok(client.indexOf('gui:SetAttribute("StartupStage", "server-state-request")')>client.indexOf('gui:SetAttribute("PortSceneLoadState", "loading")'));
  assert.ok(client.indexOf('gui:SetAttribute("PortSceneLoadState", "loading")')>client.indexOf('local PortScene = nil'));
  assert.match(port,/MarePortSceneStage", "require-Pose"/);
  assert.match(port,/MarePortSceneStage", "port-signatures"/);
  assert.match(port,/MarePortSceneStage", "ready"/);
  assert.match(client,/if not PortScene then[\s\S]*?return[\s\S]*?end[\s\S]*?sailingNow = true/);
  assert.match(client,/if not PortScene then return end/);
});

test('Mare Essentia 저장소 이름은 MareEssentia_v2로 고정된다', () => {
  const m=core.match(/^local STORE_NAME = "([^"]+)"/m);
  assert.ok(m,'STORE_NAME 선언을 찾지 못함');
  assert.equal(m[1],'MareEssentia_v2');
});

test('플레이어 저장 키는 UserId 기반 P_ 접두를 유지한다', () => {
  assert.match(core,/return "P_" \.\. player\.UserId/);
});


// [탐험 숙련 회귀] 기존 DataStore 확장·서버 정산·2~3타 무기별 순수 시각 연출을 점검한다.
const read=(p)=>readText('roblox-games/mare-essentia/src/'+p);
const state=read('ServerScriptService/Services/State.luau');
const discovery=read('ServerScriptService/Services/Discovery.luau');
const view=read('ServerScriptService/Services/View.luau');
const field=read('ReplicatedStorage/Shared/FieldScene.luau');
const client=read('StarterPlayer/Game.client.luau');

test('무기별 숙련은 기존 저장소에 호환 추가되고 구버전 저장을 읽는다',()=>{
  assert.match(state,/weaponPractice = \{\}/);
  assert.match(state,/type\(saved\.weaponPractice\) == "table"/);
  assert.match(state,/D\.Weapons\.get\(id\)\.id == id/);
  assert.match(state,/weaponPractice = state\.weaponPractice/);
  assert.match(view,/view\.weaponPractice = table\.clone/);
});

test('탐험 숙련은 서버 유효 무기·시간 상한·중복 재전송 검사 후 정산한다',()=>{
  assert.match(discovery,/handlers\.FieldPracticeBegin/);
  assert.match(discovery,/handlers\.FieldPracticeCommit/);
  assert.match(discovery,/fieldRuns\[state\] = nil/);
  assert.match(discovery,/math\.min\(120,/);
  assert.match(client,/call\("FieldPracticeBegin"/);
  assert.match(client,/call\("FieldPracticeCommit"/);
  // 탐험 종료의 기존 3개 반환값을 유지하고, 검증 대상인 연타 기록만 마지막 인자로 추가 전달한다.
  assert.match(field,/pcall\(opts\.onFinish, result, observedCardId, earnedPractice, fieldStreakResult\)/);
  assert.match(client,/onFinish = function\(result, observedCardId, gainedPractice, streakRecord\)/);
  assert.match(client,/record = streakRecord and streakRecord\.hits or 0/);
  assert.match(discovery,/local recordLimit = math\.min\(500,/);
  assert.match(field,/local rank = practiceRank\(practice\.xp\)/);
});

test('2·3연타 막타는 무기별 시각 연출만 재생하고 실제 타격은 추가하지 않는다',()=>{
  assert.match(field,/stage < 2 or stage > 3/);
  assert.match(field,/if stage == chain then\s*masteryCinema\(hrp, stage, defeatedAt\)/);
  assert.match(field,/if visualMobile then 0\.14 else 0\.19/);
  assert.doesNotMatch(field,/slowMotionUntil/);
  assert.match(field,/local finishName = if family == "fist" then "훅"/);
  for (const feature of ['"급습"','"분쇄"','"관통"','"충격"','"속사"','"관통 사격"','"반동 사격"','"교차 베기"']) {
    assert.ok(field.includes(feature), '무기별 마무리 누락: '+feature);
  }
  assert.match(field,/elseif wpn\.ranged then[\s\S]*?pulseAt\("SHAPE_BURST", hrp\.CFrame/);
  assert.match(field,/elseif family == "bow" then[\s\S]*?Color3\.fromRGB\(165, 231, 165\)/);
  assert.match(field,/-- 추가 공격은 R15 무기 자세와 이펙트뿐이다/);
  assert.match(client,/call\("Explore", \{ siteId = s\.id, observedCardId = observedCardId \}\)/);
  assert.doesNotMatch(discovery,/state\.coins\s*\+=\s*earned/);
});


test('연타 1단 봉인·무기별 낮은 확률·공용 7초 제한·최대 3타를 유지한다',()=>{
  assert.match(field,/local comboRng = Random\.new\(\)/);
  assert.match(field,/local lastMasteryComboAt = -100/);
  assert.match(field,/local baseChance = if rank == 2 then 0\.07 elseif rank == 3 then 0\.10/);
  assert.match(field,/rank == 4 then 0\.13 elseif rank == 5 then 0\.16 else 0/);
  assert.match(field,/local weaponChance = if wpn\.family == "dagger" then 0\.02/);
  assert.match(field,/elseif wpn\.id == "crossbow" then -0\.025/);
  assert.match(field,/local battleBonus = math\.min\(0\.02,/);
  assert.match(field,/if rank > 1 and comboNow - lastMasteryComboAt >= 7/);
  assert.match(field,/local threeHitBase = if rank == 2 then 0 elseif rank == 3 then 0\.16/);
  assert.match(field,/chain = if rank == 2 then 2[\s\S]*?then 3 else 2/);
  assert.match(field,/for stage = 2, chain do/);
  assert.match(field,/chain = if rank == 2 then 2[\s\S]{0,210}then 3 else 2/);
});

// [탐험 상용 버튼 회귀] 공격·회피 2개만 표시하고 5타 자동 강타는 실제 명중에서만 발생한다.
test('탐험 공격·회피 두 메달은 실제 터치와 무기별 5타 자동 강타에 연결된다',()=>{
  assert.match(field,/local iconOnly = button\.Name == "FieldAttack" or button\.Name == "FieldDodge"/);
  assert.match(field,/medallion\.Position = UDim2\.fromScale\(0\.5, if iconOnly then 0\.5 else 0\.385\)/);
  assert.match(field,/img\.Position = UDim2\.fromScale\(0\.5, if iconOnly then 0\.5 else 0\.385\)/);
  assert.match(field,/attackBtn\.Name = "FieldAttack"/);
  assert.match(field,/b\.Name = "FieldDodge"/);
  // [세 원형 버튼·파티 HUD] 실제 터치 사각형은 가장자리까지 클릭되므로 12가지 화면 크기에서
  // 버튼끼리, 파티창·미니맵·조이스틱·카메라와 겹치지 않아야 한다. 실제 명중/스킬 판정은 보존한다.
  assert.ok(field.includes('addIcon(wbtn, "Menu/field_weapon")'));
  assert.ok(field.includes('map.Name = "FieldMiniMap"'));
  assert.ok(field.includes('map.Position = UDim2.fromOffset(226, 74)'));
  assert.ok(field.includes('if compactTouch then UDim2.new(1, -68, 1, -315)'));
  assert.ok(field.includes('if compactTouch then UDim2.new(1, -62, 1, -202)'));
  assert.ok(field.includes('status.Size = UDim2.fromOffset(heroPanel.Size.X.Offset, if visualMobile then 44 else 52)'));
  assert.ok(field.includes('heroPanel.Position.Y.Offset + heroPanel.Size.Y.Offset + 6'));
  assert.ok(field.includes('lastTouchEnded = os.clock()'));
  assert.ok(field.includes('touchActive = true'));
  assert.ok(field.includes('if touchActive or os.clock() - lastTouchEnded < 0.45 then return end'));
  assert.doesNotMatch(field,/b\.Activated:Connect\(go\)/,'같은 터치가 교체를 두 번 실행하면 안 됨');
  const rect=(cx,cy,d,extra=0)=>({left:cx-d/2-extra,top:cy-d/2-extra,
    right:cx+d/2+extra,bottom:cy+d/2+extra});
  const box=(x,y,w,h)=>({left:x,top:y,right:x+w,bottom:y+h});
  const overlaps=(a,b)=>a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  for(const [width,height] of [
    [320,540],[320,640],[360,780],[384,832],[428,926],[600,280],
    [640,320],[680,380],[720,320],[720,384],[832,384],[960,440],
  ]){
    const portrait=width<520 || width<=height,short=height<330;
    const attack=rect(width-(portrait?76:short&&width<650?76:95),
      height-(portrait?85:short?70:88),portrait||short?104:116,10);
    const dodge=rect(width-(portrait?62:235),
      height-(portrait?202:short?67:106),portrait?86:short?88:96);
    const weapon=rect(width-(portrait?68:175),
      height-(portrait?315:short?181:225),portrait?76:short?72:80);
    const mapSize=width<520?92:short?82:106;
    const map=box(226,74,mapSize,mapSize);
    const landscape=width>height;
    const padSize=landscape?Math.min(150,Math.max(44,height-272)):150;
    const pad=box(landscape&&height<316?226:28,height-(padSize<150?12:28)-padSize,padSize,padSize);
    const allies=[box(12,162,202,44),box(12,210,202,44)];
    assert.equal(overlaps(pad,allies[1]),false,width+'×'+height+' 동료/이동패드 HUD 겹침');
    const rest=[
      ['이동패드',pad],
      ['미니맵',map],['주인공',box(12,74,202,82)],
      ['카메라',box(width-120,12,108,44)],
      ['동료1',allies[0]],['동료2',allies[1]],
    ];
    const buttons=[['공격',attack],['회피',dodge],['교체',weapon]];
    for(const [name,a] of buttons){
      for(const [other,b] of [...rest,...buttons.filter(([n])=>n!==name)]){
        assert.equal(overlaps(a,b),false, width+'×'+height+' '+name+'/'+other+' HUD 겹침');
      }
    }
  }
  assert.match(field,/attackCaption\.Name = "FieldAttackCaption"/);
  assert.match(field,/dodgeCaption\.Name = "FieldDodgeCaption"/);
  assert.match(field,/addIcon\(attackBtn, "Menu\/cc0_sword"\)/);
  assert.match(field,/addIcon\(b, "Menu\/chart_compass"\)/);
  for(const key of ['field_attack','field_dodge','field_weapon'])
    assert.ok(field.includes('"Menu/'+key+'"'), '지상 버튼 이미지 등록키 누락: '+key);
  assert.ok(field.includes('attackBtn:GetAttribute("IconArtKey") ~= "Menu/field_attack"'),'무기교체가 새 공격 원화를 덮어쓰면 안 됨');
  assert.match(field,/bindPress\(attackBtn, useAttack\)/);
  assert.match(field,/bindHold\(attackBtn\)/);
  assert.match(field,/hit\.Size = attackBtn\.Size \+ UDim2\.fromOffset\(20, 20\)/);
  assert.match(field,/combatBtns\.dodge = \{ btn = b, label = "회피" \}/);
  assert.equal((field.match(/bindPress\(b, function\(\) useMove\("dodge"\) end\)/g)||[]).length,1,'회피 입력 중복 금지');
  assert.doesNotMatch(field,/FieldSkillCaption|Name = "FieldSkill_|local function mkSkill\(/);
  assert.match(field,/if timer and timer\.Visible then timer\.Visible = false end/);
  assert.match(field,/local shadeAlpha = 0\.24 \+ \(1 - fraction\) \* 0\.68\s+if shade\.BackgroundTransparency ~= shadeAlpha then shade\.BackgroundTransparency = shadeAlpha end/);
  assert.match(field,/equipped\.heavy, equipped\.sweep = true, false/);
  assert.match(field,/pl\.autoHeavyFire == pl\.autoNormalHits/);
  // [빠른 연타] 0.14초 지연된 이전 평타도 명중 당시 새 입력 여부와 관계없이 충전해야 한다.
  assert.match(field,/if basicAttack == true then[\s\S]*?pl\.autoNormalHits = \(pl\.autoNormalHits or 0\) \+ 1/);
  assert.match(field,/local autoHeavyReady = basicAttack == true/);
  assert.match(field,/local basicHit = basicAttack == true/);
  assert.match(field,/hitActionSeq, nil, moveId == "rush", basicBeat\)/);
  assert.match(field,/basicAttack: boolean\?, impactBeat: number\?\)/);
  assert.doesNotMatch(field,/pl\.basicAttackSeq/);
  assert.match(field,/FieldAutoSkillPending/);
  assert.match(field,/if useMove\("heavy"\) then[\s\S]*?comboCinema\(streakN, record, true\)/);
  assert.match(field,/sb\.btn:GetAttribute\("IconArtKey"\) ~= iconKey/);
  assert.match(field,/pl\.cd\[key\] = now \+ 8/);
});

test('영입 동료는 지상전투에 출전하지 않고 기존 파티 명단과 초상만 유지한다',()=>{
  assert.match(field,/local party = if type\(opts\.allies\) == "table" then opts\.allies else \{\}/);
  assert.match(field,/for _, member in party do/);
  assert.match(field,/status:SetAttribute\("CompanionId", member\.id\)/);
  assert.match(field,/status:SetAttribute\("CombatEnabled", false\)/);
  assert.match(field,/ui\.portrait = opts\.allyPortraits and opts\.allyPortraits\[member\.id\]/);
  assert.match(field,/ui\.statusText\.Name = "FieldAllyPartyRole"/);
  assert.doesNotMatch(field,/local function prepareAllyDefs\(\)/,'지상전투 동료 리그 생성 제거');
  assert.doesNotMatch(field,/m\.Name = "FieldAlly"/,'전투 지역 동료 모델 금지');
  assert.doesNotMatch(field,/equipFieldWeapon\(m, ad\.weapon\)/,'동료 무기 생성 금지');
  assert.match(field,/무기 숙련 시 2~3연타 확률 발동/);
  assert.doesNotMatch(field,/무기 숙련 시 2~5단 확률 발동/);
});

// [실물 무기 회귀] 승인된 해적 키트 원본만 사용하고 저장·전투 수치를 변경하지 않는다.
test('실물 해적 선상도·쌍날도끼·권총은 CC0 원본과 병종에 연결된다',()=>{
  const weaponDefs=read('ReplicatedStorage/Shared/Weapons.luau');
  const required=[
    {id:'cutlass',name:'weapon-cutlass',role:'선상도 검병'},
    {id:'doubleaxe',name:'weapon-doubleaxe',role:'쌍날도끼 돌격병'},
    {id:'ship_pistol',name:'weapon-pirate-pistol',role:'해적 권총병'},
  ];
  for(const item of required){
    const file='roblox-games/mare-essentia/assets/relics/'+item.name+'.glb';
    assert.ok(fs.existsSync(file),'원본 메시 누락: '+item.name);
    const proof=JSON.parse(readText(file+'.license.json'));
    assert.equal(proof.license,'CC0-1.0',item.name+' 사용 허가');
    assert.equal(proof.author,'Quaternius',item.name+' 원저작자');
    assert.match(proof.source,/^https:\/\/quaternius\.com\/packs\/piratekit\.html$/);
    assert.ok(proof.sourceSha256 && /^[a-f0-9]{64}$/.test(proof.sourceSha256),'해시 누락: '+item.name);
    assert.ok(weaponDefs.includes('"'+item.id+'"') && weaponDefs.includes('"'+item.name+'"'),'장비 명세 누락: '+item.id);
    assert.ok(field.includes('"'+item.role+'"'),'적 병종 누락: '+item.role);
    assert.ok(field.includes('AssetIds["Relics/'+item.name+'"]'),'미등록 무기 차단 누락: '+item.name);
  }
  assert.match(field,/style\[4\] == "ship_pistol"\) then/);
  assert.match(field,/equipFieldWeapon\(enemy\.model, enemy\.weapon, enemy\.shieldModel, enemy\.throwAsset\)/);
  assert.match(field,/local shieldBlocked = not quiet and e\.shieldModel and e\.ac\.def\.frontGuard/);
  assert.match(field,/e\.root\.CFrame\.LookVector:Dot\(approach\.Unit\) > 0\.35/);
  assert.match(field,/e\.model:FindFirstChild\("FieldShield"\) ~= nil/);
  assert.match(field,/e\.bombAim = hrp\.Position/);
  assert.match(field,/hit = diff\.Magnitude <= 6/);
});

// [무기 사실성 회귀] R15 관절·재질 표현만 보강하고 전투 수치·저장 구조는 변경하지 않는다.
test('적 무기 모션과 비전투 파티 표시는 R15 전투 및 원본 PBR을 보존한다',()=>{
  const fieldMotion=read('ReplicatedStorage/Shared/FieldMotion.luau');
  for(const weapon of ['PISTOL','RIFLE','BOW','LONGBOW','CROSSBOW','SPEAR','DAGGER','WAR_AXE','MACE','RAPIER','SABRE','SCIMITAR','KATANA']){
    assert.ok(fieldMotion.includes('grip == "'+weapon+'"'),'무기 동작 구분 누락: '+weapon);
  }
  for(const name of ['prepare','strike','returnGrip','hold','HandR','ForearmR','UpperArmL','ThighL','FootR']){
    assert.ok(fieldMotion.includes(name),'R15 관절 단계 누락: '+name);
  }
  assert.match(field,/bp:FindFirstChildOfClass\("SurfaceAppearance"\)/);
  assert.match(field,/Enum\.Material\.Metal/);
  assert.match(field,/Enum\.Material\.Wood/);
  // [실물 재질] 원본 PBR/텍스처는 건드리지 않으며 미등록 표면의 소재별 반사율만 적용한다.
  assert.match(field,/local preservedPbr = bp:FindFirstChildOfClass\("SurfaceAppearance"\) ~= nil/);
  assert.match(field,/local preservedTexture = bp:IsA\("MeshPart"\) and bp.TextureID ~= ""/);
  assert.match(field,/if not preservedPbr and not preservedTexture then/);
  assert.match(field,/material, tint, reflectance = Enum\.Material\.Metal, Color3\.fromRGB\(172, 182, 187\), 0\.055/);
  assert.match(field,/bp\.Material, bp\.Reflectance = material, reflectance/);
  // [완벽 회피 매트릭스] 적 모션만 둔화하고 주인공/스킬 쿨타임은 정상 시간으로 유지한다.
  assert.match(field,/local enemyDt = dtc \* \(if now < \(pl\.matrixSlowUntil or 0\) then 0\.24 else 1\)/);
  assert.match(field,/AC\.stepEnemy\(e\.ac, enemyDt,/);
  assert.match(field,/e\.visualElapsed = math\.min\(0\.15, \(e\.visualElapsed or 0\) \+ enemyDt\)/);
  assert.match(field,/local visualDt = if farVisual and not visualChanged then e\.visualElapsed else enemyDt/);
  assert.match(field,/FM\.actor\(e\.fm, st, ph, visualDt, e\.boss/);
  // [파티 전용 회귀] 기존 영입·초상·직업 데이터는 표시하고, 필드 동료 공격·치유·3D 소환은 모두 제외한다.
  const party = field.slice(field.indexOf('-- [비전투 파티]'),field.indexOf('-- 폰: 기본 터치'));
  assert.ok(party.length>1000,'파티 UI 코드 누락');
  assert.match(party,/local party = if type\(opts\.allies\) == "table"/);
  assert.match(party,/if count >= 2 then break end/);
  assert.match(party,/status:SetAttribute\("CompanionId", member\.id\)/);
  assert.match(party,/status:SetAttribute\("CombatEnabled", false\)/);
  assert.match(party,/FieldAllyPortrait/);
  assert.match(party,/FieldAllyName/);
  assert.match(party,/FieldAllyPartyRole/);
  assert.doesNotMatch(party,/Pose\.createR15|equipFieldWeapon|FM\.actor|strikeEnemy|castEffect/);
  assert.doesNotMatch(field,/local activeHealers = \{\}/,'파티 치유 보정 제거');
  assert.match(field,/pl\.hp = math\.min\(pl\.maxHp, pl\.hp \+ 0\.12 \* math\.min\(dt, 0\.1\)\)/);
  assert.match(field,/local companionRows: \{ any \} = \{\}/,'지상 대화 연출은 독립 유지');
  assert.match(field,/if not quiet then/);
  assert.match(field,/local thrust = family == "spear" or family == "dagger"/);
  assert.match(field,/local heavy = family == "axe" or family == "blunt"/);
  assert.match(field,/local range = family == "bow" or family == "firearm"/);
  assert.match(field,/canon\.HandR = \(canon\.HandR or id\)/);
  assert.match(field,/canon\.FootL = \(canon\.FootL or id\)/);
});

 
// [원거리 사격 회귀] 근접 판정에 묶이던 원거리 스킬과 석궁 견착을 기존 R15/전투 경로에서 검사한다.
test('원거리 공격은 무기 사거리로 조준·발사하며 석궁 R15 양손 견착을 사용한다',()=>{
  const fieldMotion=read('ReplicatedStorage/Shared/FieldMotion.luau');
  const weapons=read('ReplicatedStorage/Shared/Weapons.luau');
  assert.match(weapons,/id = "crossbow"[^\n]+ranged = true, range = 26/);
  assert.match(weapons,/id = "bow"[^\n]+ranged = true, range = 26/);
  assert.match(weapons,/id = "gun"[^\n]+ranged = true, range = 22/);
  assert.match(field,/local STUD = 2/);
  assert.match(field,/local near, nd = nil, if wpn\.ranged then wpn\.range \* STUD \+ 3 else 40/);
  assert.match(field,/local rangeR = if wpn\.ranged or moveId == "rush" then wpn\.range else mv\.range/);
  assert.match(field,/local rangedShot = wpn\.ranged/);
  assert.match(field,/if rangedShot and shots >= 1 then break end/);
  assert.match(field,/if wpn\.ranged then return CFrame\.new\(0, -0\.12 \* bell\(p\), 0\)/);
  assert.match(field,/local crossbow = wpn\.motion == "CROSSBOW"/);
  assert.match(field,/canon\.ForearmL = \(canon\.ForearmL or id\)/);
  assert.match(fieldMotion,/elseif crossbow then[\s\S]*?bend\("UpperArmL",[\s\S]*?bend\("ForearmL"/);
  assert.match(field,/arrowTrail\(a0, b0, nil, nil, wpn\.motion, moveId ~= "rush"\)/);
  assert.match(field,/if not wpn\.ranged and nd > reach - 2 then/);
  // 원거리 공격은 눌렀을 때 이미 발사됐으므로 길게 누른 뒤 떼어도 근접 돌진을 발동하지 않는다.
  assert.match(field,/if held >= 0\.5 and not wpn\.ranged then/);
  assert.match(field,/say\(if wpn\.ranged then "원거리 조준 중"/);
});


// [원거리 원본 자세·투사체·명중 공정성] 무료 기본 Trail과 등록 무기를 유지, 피해·숙련 정산은 적중 때만.
test('원거리 화살 석궁은 실제 긴 축을 바로 세우고 3D 탄도·거리별 빗나감을 쓴다',()=>{
  const scene=read('ReplicatedStorage/Shared/FieldScene.luau');
  const motion=read('ReplicatedStorage/Shared/FieldMotion.luau');
  const projectile=scene.slice(scene.indexOf('local function arrowTrail('),scene.indexOf('-- 바닥 범위 예고:'));
  assert.ok(projectile.length>2000,'투사체 실제 탄도 생성 구간 누락');
  assert.doesNotMatch(projectile,/Instance\.new\("Beam"\)/,'넓은 네모 Beam이 복구되지 않아야 한다');
  for(const snippet of [
    'shaft.Shape = if gun then Enum.PartType.Ball else Enum.PartType.Cylinder',
    'shaft.Name = "FieldProjectile"', 'tip.Name = "FieldArrowTip"',
    'local trail = Instance.new("Trail")', 'trail.WidthScale = NumberSequence.new',
    'CFrame.lookAt(p, p + aim)', 'trail.Enabled = false',
    'if finished or not shaft.Parent then'
  ]) assert.ok(projectile.includes(snippet),'실물형 화살/볼트·잔광 회귀: '+snippet);
  for(const snippet of [
    'hand = if weapon.family == "bow" then leftHand else rightHand',
    'local bowHold = weapon.family == "bow"',
    'local crossbowHold = weapon.motion == "CROSSBOW"',
    'local targetAxis = if bowHold then Vector3.yAxis else forward',
    'CFrame.fromRotationBetweenVectors(sourceAxis, targetAxis)',
    '[전방 활시위]', '[기본 사격 팔 역전 보정]',
    'local shotLanded = true', 'local baseAccuracy = if wpn.motion == "CROSSBOW"',
    '- (if shooterMoving then 0.10 else 0)',
    '- (if targetMoving then 0.085 else 0)',
    '(e.dodgeUntil or 0) > os.clock()',
    'if shotLanded then strikeEnemy(', 'else false',
    'if landed then hits += 1 end', 'shots += 1',
    'if not shotLanded then', 'if rangedShot and shots == 0 then'
  ]) assert.ok(scene.includes(snippet),'활·석궁/확률 판정 회귀: '+snippet);
  assert.ok(scene.includes('canon.UpperArmR = (canon.UpperArmR or id):Lerp('),'활/석궁 어깨 절대 견착 보간 누락');
  assert.doesNotMatch(scene,/\(canon\.UpperArmR or id\) \* CFrame\.Angles\(-0\.72 \* poseWeight/,'기존 석궁 어깨 중복 회전이 다시 나타남');
  assert.doesNotMatch(scene,/\(canon\.UpperArmL or id\) \* CFrame\.Angles\(-1\.03 \* poseWeight/,'기존 활 어깨 중복 회전이 다시 나타남');
  assert.ok(motion.includes('[궁수 실제 활대]'));
  assert.ok(motion.includes('[석궁 사수 수평 지지]'));
  const chance=(range,moving,target,dodging,base=0.92)=>Math.max(.35,Math.min(.98,
    base-.27*range-(moving?.10:0)-(target?.085:0)-(dodging?.20:0)));
  assert.ok(chance(0,false,false,false)>chance(1,false,false,false),'거리가 멀수록 명중률 감소');
  assert.ok(chance(1,true,true,true)<chance(1,false,false,false),'이동·회피 시 명중률 추가 감소');
  assert.ok(chance(1,true,true,true)>=.35,'빗나감 하한 유효');
});

// [유적 탐험] 모바일 HUD와 충돌하지 않도록 조사 알림만 펼치고 등록 원더 이미지가 원본을 표시한다.
test('유적 상호작용과 발견 화면의 모바일 잘림·조사 키 충돌을 방지한다',()=>{
  assert.ok(field.includes('note.Name = "FieldInteractionNote"'));
  assert.ok(field.includes('local expanded = duration ~= nil and duration > 2.2'));
  assert.ok(field.includes('note.Size = if expanded then UDim2.fromOffset(if compactTouch then 206 elseif narrowLandscape then math.min(244, screen.X - 404) elseif visualMobile then 244 else 256, 64)'));
  assert.ok(field.includes('elseif narrowLandscape then UDim2.fromOffset(226, screen.Y - 108)'));
  assert.ok(field.includes('elseif visualMobile then UDim2.fromOffset(226, 210)'));
  assert.ok(field.includes('if questHud then questHud.Visible = not expanded end'));
  assert.ok(field.includes('if weatherHud then weatherHud.Visible = not expanded end'));
  assert.ok(field.includes('if questHud and questHud.Parent then questHud.Visible = true end'));
  assert.ok(field.includes('if weatherHud and weatherHud.Parent then weatherHud.Visible = true end'));
  // [모바일 가로] 유적 설명 3줄이 실제 공격/회피 터치 영역과 겹치지 않는지 확인한다.
  for(const [width,height] of [[600,340],[720,384],[832,384],[960,540]]){
    const narrow = width < 740;
    const x = 226, y = narrow ? height - 108 : 210, w = narrow ? Math.min(244,width-404) : 244, h = 64;
    const rect=(left,top,rw,rh)=>({left,top,right:left+rw,bottom:top+rh});
    const note=rect(x,y,w,h);
    const dodge=rect(width-98-146-53,height-98-66-53,106,106);
    const attack=rect(width-98-74,height-98-74,148,148);
    const pad=rect(28,height-178,150,150);
    const overlap=(a,b)=>a.left<b.right && b.left<a.right && a.top<b.bottom && b.top<a.bottom;
    for(const other of [dodge,attack,pad]){
      assert.equal(overlap(note,other),false,'유적 안내가 전투 터치 영역과 겹침: '+width+'x'+height);
    }
    assert.ok(!narrow || y >= dodge.bottom+2,'좁은 가로에서 회피 버튼이 보이도록 아래쪽에 배치');
  }
  assert.ok(field.includes('note.TextWrapped = expanded'));
  assert.ok(field.includes('say(clueText[theme] or clueText.plains, 4.5)'));
  assert.ok(field.includes('prompt.KeyboardKeyCode = Enum.KeyCode.T'));
  assert.ok(field.includes('math.min(extent.X * 0.55 + 4, 16)'));
  assert.ok(field.includes('math.min(extent.Z * 0.55 + 4, 16)'));
  assert.ok(client.includes('local image = "rbxassetid://" .. tostring(assetId)'));
  assert.doesNotMatch(client,/local image = "rbxthumb:\/\//);
  // [모바일 원더 화면] 제목·자막·16:9 액자 사이의 실제 화면 높이 여백을 확보한다.
  assert.ok(client.includes('local function fitWonderArt()'));
  assert.ok(client.includes('screen.X * 0.94 * 9 / 16, screen.Y - 180'));
  assert.ok(client.includes('root:GetPropertyChangedSignal("AbsoluteSize"):Connect(fitWonderArt)'));
  assert.ok(client.includes('artResize:Disconnect()'));
  assert.ok(client.includes('ttl.TextScaled = true'));
  assert.ok(client.includes('ttl.Position = UDim2.new(0.5, 0, 0, 32)'));
  assert.ok(client.includes('cap.Position = UDim2.new(0.5, 0, 1, -8)'));
  for(const [w,h] of [[320,240],[832,384],[384,832],[1280,720]]){
    const height=Math.max(1,Math.min(w*0.94*9/16,h-180));
    const artWidth=Math.floor(height*16/9);
    const artHeight=Math.floor(height);
    const top=(h-artHeight)/2,bottom=(h+artHeight)/2;
    assert.ok(artWidth<=w*0.94+1,'원더 원화 가로 넘침 '+w+'x'+h);
    assert.ok(top>=72,'원더 제목 겹침 '+w+'x'+h);
    assert.ok(bottom<=h-82,'원더 자막 겹침 '+w+'x'+h);
  }
  const scenes=read('ReplicatedStorage/Shared/WonderScenes.luau');
  const assets=read('ReplicatedStorage/Shared/AssetIds.luau');
  for(const match of scenes.matchAll(/art = "(event_[a-z_]+)"/g)){
    assert.ok(assets.includes('["CardArt/'+match[1]+'"]'),'미등록 유적 원더 그림 '+match[1]);
  }
});

// [스튜디오 실제 실패 복구] 초급 20마리에서 체형 2종으로 수렴했던 R15 실루엣을 검사한다.
test('1단 검병·궁수 편성은 유지하면서 승인된 R15 체형 3종 이상을 실제 배정한다',()=>{
  assert.ok(field.includes('local kinds = if danger0 <= 1 then { "grunt", "grunt", "archer", "grunt" }'));
  assert.ok(field.includes('local enemyCount = math.clamp(20 + (danger0 - 1) * 6, 20, 100 - bossCount)'));
  const grunt=field.match(/\t\tgrunt = \{([\s\S]*?)\n\t\t\},/);
  assert.ok(grunt,'실제 검병 복식 정의 누락');
  const profiles=[...grunt[1].matchAll(/\{ ".*?", "(.*?)", Color3/g)].map(x=>x[1]);
  assert.ok(profiles.length>=5,'기존 검병 5종 복식 보존');
  const expect=[
    ['Barbarian','heavy'],
    ['Knight','athletic'],
    ['Rogue_Hooded','slim']
  ];
  for(const [style,physique] of expect){
    assert.ok(field.includes('elseif ac.kind == "grunt" and style[2] == "'+style+'" then "'+physique+'"'),
      '검병 실물 복식과 체형 매칭 누락: '+style);
  }
  const kinds=['grunt','grunt','archer','grunt'],physiques=new Set();
  for(let i=1;i<=20;i++){
    const role=kinds[(i-1)%kinds.length];
    const style=profiles[Math.floor((i-1)/4)%profiles.length];
    const physique=role==='archer'?'slim':style==='Barbarian'?'heavy':
      style==='Knight'?'athletic':style==='Rogue_Hooded'?'slim':'average';
    physiques.add(physique);
  }
  assert.ok(physiques.size>=3,'실제 1단 적 20마리 체형 3종 확보 실패: '+[...physiques]);
  assert.ok(field.includes('{ bodyType = bodyType, motionStyle = motionStyle, trousers = trousers, persona = styleN'),
    '기존 R15 몸체 생성 연결 보존');
});

// [스튜디오 실증 회귀] 실제 탐험 2메달 HUD와 자동검사 스크립트가 같은 버튼을 검사해야 한다.
test('스튜디오 탐험 실증은 현재 공격·회피 메달과 집안별 두 무기를 검사한다',()=>{
  const path='roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-qa-click.json';
  const script=JSON.parse(readText(path));
  assert.equal(script.length,1000,'기존 전체 스튜디오 검사 순서 유지');
  // [실제 카드 대전 종료] 접힌 메뉴를 화면에서 먼저 클릭한 후 그 안의 건너뛰기를 실제 터치한다.
  assert.equal(script[155].label,'card_practice_menu_open');
  assert.match(script[155].code,/CARD_PRACTICE_MENU_REAL_CLICK/);
  assert.equal(script[156].type,'wait');
  assert.equal(script[157].label,'card_practice_exit');
  assert.match(script[157].code,/actions\.Visible/);
  assert.match(script[157].code,/for _,child in actions:GetChildren\(\)/);
  // [실제 화면 대기] 고정시간을 넘기는 PC 시작 로딩에서 아무 버튼을 잘못 누르지 않는다.
  assert.equal(script[4].type,'luau');
  assert.equal(script[4].timeoutMs,85000);
  assert.match(script[4].code,/MARE_TITLE_NOT_READY_AFTER_50S/);
  assert.match(script[4].code,/FindFirstChild\('StartLoading'\)/);
  assert.match(script[4].code,/task\.wait\(0\.5\)/);
  assert.match(script[6].code,/if not best or bs<=0 then return 'NONE' end/);

  const entry=script[239].code;
  const motion=script[241].code;
  const live=script[244].code;
  assert.ok(entry.includes('FIELD_QA_ENTRY_FAIL:'),'실제 UI로 탐험 입장 검증 필수');
  assert.ok(entry.includes('FieldCombatReady'),'실제 전투 준비 검증 필수');
  // [승인 원화 회귀] 새 공격 원화는 완성형 PNG를 검증하고, 구형 아이콘만 메달 테두리를 검증한다.
  assert.ok(entry.includes('FIELD_APPROVED_ATTACK_ART_INVALID'),'승인 원화·출처 이미지 검사 필수');
  // [실물 실패 회귀] 최초 무기 선정·교체가 승인 공격 원화를 덮어쓰지 않으며 회피도 승인된 두 원화만 허용한다.
  const init=field.slice(field.indexOf('local reserveWeapon = Weapons.get('),field.indexOf('local function char3()',field.indexOf('local reserveWeapon = Weapons.get(')));
  assert.match(init,/if attackIcon and attackBtn:GetAttribute\("IconArtKey"\) ~= "Menu\/field_attack" then/,'시작 무기 설정이 완성형 공격 원화를 덮어쓰면 안 된다');
  assert.ok(entry.includes('local dodgeKey=dodge:GetAttribute("IconArtKey")'),'입장 검사도 실제 등록 회피 원화의 키를 사용해야 한다');
  assert.ok(motion.includes('"Menu/field_attack","Menu/cc0_sword"'),'모션 검사에서도 승인 공격 원화를 정상 인식해야 한다');
  assert.ok(motion.includes('local dodgeKey=dodge:GetAttribute("IconArtKey")'),'모션 검사에서 승인 회피 원화를 정상 인식해야 한다');
  assert.ok(entry.includes('FIELD_GOLD_BUTTON_BORDER_INVALID'),'실제 공격 버튼의 금색 테두리 활성화·색상·두께 검증 필수');
  assert.ok(field.includes('if outline then outline.Enabled = button.Name == "FieldAttack" end'),'승인 공격 원화에서도 금색 테두리 유지 필수');
  assert.ok(entry.includes('FIELD_PREMIUM_RIM_MISSING'),'기존 메달 원화의 링 검증 유지');
  assert.ok(field.includes('if string.sub(key, 1, 11) == "Menu/field_" then'),'승인 완성형 아이콘 전용 렌더 경로 유지');
  assert.ok(entry.includes('FIELD_DODGE_ICON_UNAPPROVED'),'회피 원화 실증 검증 필수');
  assert.ok(entry.includes('FIELD_WEAPON_CHOICES_NOT_TWO'),'두 무기 교체 검증 필수');
  assert.ok(motion.includes('FIELD_ATTACK_WEAPON_ICON_UNAPPROVED'),'선택 무기별 원화 실증 검증 필수');
  assert.ok(motion.includes('FIELD_MOTION_ACTOR_SAMPLE_TOO_SMALL'),'적·동료의 실제 모션 검증 유지');
  // [난이도별 실증] 초급 필드의 미출현 3~4단 병종을 요구하지 않되 현재 출현 직군 전체를 검사한다.
  assert.ok(live.includes('field:GetAttribute("FieldDifficultyGrade")'),'실제 난이도 참조 필수');
  assert.ok(live.includes('grade<=1 then {"grunt","archer"}'),'1단 편성 검증 필수');
  assert.ok(live.includes('grade==2 then {"grunt","archer","shield"}'),'2단 편성 검증 필수');
  assert.ok(live.includes('{"grunt","archer","shield","charger"}'),'3단 이상 편성 검증 필수');
  assert.ok(live.includes('for _,role in expectedRoles do'),'실존 병종 R15 모션 모두 검사');
  assert.ok(live.includes('{"thrower","boss"}'),'투척병·두목 별도 모션 역할도 실제 생성 시 검사');
  assert.ok(live.includes('if grade>=3 then assert(roles.boss'),'상위 난이도 두목 실증 필수');
  assert.ok(field.includes('elseif throwAsset then "thrower" else ac.kind'),
    '기존 투척 무기 전용 모션 역할과 검사 일치 필수');
  assert.ok(live.includes('distinct>=math.min(3,#expectedRoles)'),'난이도에 맞는 다른 전신 자세 검증');
  assert.ok(live.includes('FIELD_SURVEY_PROMPTS_MISSING'),'현장 조사 지점 실제 생성 검사');
  assert.ok(live.includes('FIELD_SURVEY_KEY_CONFLICT'),'전투 E와 조사 T 분리 검증');
  assert.ok(live.includes('FIELD_SURVEY_REACH_BLOCKED'),'유적 조사 가시거리·접근성 검증');
  assert.doesNotMatch(entry+motion,/FieldSkill_parry|FieldSkill_dodge/,'사라진 구 스킬 버튼을 요구하면 안 된다');
  assert.ok(field.includes('b.Name = "FieldDodge"'));
  assert.ok(field.includes('wbtn.Name = "FieldWeapon"'));
  assert.ok(field.includes('wbtn:SetAttribute("WeaponChoiceCount", 2)'));
});

// [재생기/날씨 음향 회귀] 최초 지연 로드와 권한 실패가 모든 음악·효과음을 영구 음소거하지 않도록 한다.
test('음악 효과음 환경음은 기본 믹서 크기·지연 로딩·자동 재시도 경로를 유지한다',()=>{
  const audio=read('ReplicatedStorage/Shared/Sfx.luau');
  const fieldScene=read('ReplicatedStorage/Shared/FieldScene.luau');
  const ids=read('ReplicatedStorage/Shared/AudioIds.luau');
  for(const name of ['music_harbor','music_battle','sfx_wind','sfx_waves','sfx_rope_release','sfx_card_fire']){
    assert.ok(ids.includes(name+'="rbxassetid://'),'필수 등록 음원 누락: '+name);
  }
  for(const snippet of [
    'group.Volume = 1',
    'local broken: { [string]: number } = {}',
    'broken[name] = os.clock() + 20',
    'task.delay(math.max(34, s.TimeLength + 1)',
    's.Ended:Once(',
    'if currentName == name and currentMusic and currentMusic.Parent',
    'currentName = nil', 'Sfx.music(name)',
    'if ambientKey == key and #ambient > 0 then',
    'Sfx.ambient(names, gain)',
    'local priority = { "music_harbor"',
    's.Loaded:Once(function()',
    'group:SetAttribute("AudioLastFailed", name)',
    'group:SetAttribute("AudioLastLoaded", name)',
    'if s.Parent and sfxOn and not s.Playing then s:Play() end',
    'if s.Parent and ambientKey == key and not s.Playing then s:Play() end',
  ]) assert.ok(audio.includes(snippet),'음향 복원 경로 누락: '+snippet);
  // [첫 모바일 터치] 지연 효과음을 12초에 잘라버리지 않고, 로딩 중인 복제본만 제한한다.
  assert.match(audio,/local loadingEffects = \{\}/,'미로딩 효과음 관리 누락');
  assert.ok(audio.includes('if waiting and waiting.Parent and not waiting.IsLoaded then return end'),'미로딩 효과음 중복 생성 방지 누락');
  assert.ok(audio.includes('if loadingEffects[name] == s then loadingEffects[name] = nil end'),'효과음 종료·로딩 후 상태 해제 누락');
  assert.doesNotMatch(audio,/task\.delay\(math\.max\(12, s\.TimeLength \+ 1\)/,'모바일 첫 효과음 12초 조기 삭제 금지');
  // 12초 로딩 실패 → 20초 유예 중 22초 재요청이 버려져 영구 무음이 되던 문제 방지.
  assert.match(audio,/local retryAfter = math\.max\(0, \(broken\[name\] or 0\) - os\.clock\(\)\) \+ 0\.2/,'배경음 재요청은 로딩 실패 유예 종료 뒤에만 실행');
  assert.match(audio,/task\.delay\(retryAfter, function\(\)[\s\S]*?if currentMusic == s and currentName == name and s\.Parent and not s\.IsLoaded then[\s\S]*?Sfx\.music\(name\)/,'화면 전환·늦은 로딩 이후의 중복 재생 금지');
  assert.doesNotMatch(audio,/broken\[name\] = true/,'오디오 로딩 실패 영구 봉인 금지');
  assert.doesNotMatch(audio,/local first = probe\(all\)/,'모바일 전체 음원 100개 동시 프리로드 금지');
  assert.ok(fieldScene.includes('Sfx.ambient({ "sfx_wind" }, 0.60)'));
  assert.ok(fieldScene.includes('if weather == "소나기" then 0.88 else 0.68'));
  assert.ok(fieldScene.includes('elseif phase == "밤" then 0.43 else 0.58'));
  // [무음 근본 원인] 100개 영수증의 granted=true만 믿고 다른 Universe를 건너뛰면 실게임에서 소리가 나지 않는다.
  const upload=readText('tools/mare-audio-upload.mjs');
  const receipts=JSON.parse(readText('roblox-games/mare-essentia/audio/uploaded.json'));
  const audioIds=read('ReplicatedStorage/Shared/AudioIds.luau');
  assert.ok(upload.includes("process.env.MARE_UNIVERSE_ID||'10775310508'"));
  assert.ok(upload.includes("if(universeId!=='10775310508')"));
  assert.ok(upload.includes('if(rec.grantedUniverseId!==universeId)'));
  assert.ok(upload.includes("grant.errors[0].code==='AlreadyHasAccess'"));
  assert.ok(upload.includes('rec.grantedUniverseId=universeId'));
  assert.ok(upload.includes('if(provenance&&!(rec.sha256===sha'));
  assert.ok(upload.includes('receipts[t.name]?.grantedUniverseId===universeId'));
  assert.ok(Object.keys(receipts).length >= 100,'기존 오디오 100종 영수증 보존');
  for(const [name, receipt] of Object.entries(receipts)) {
    assert.equal(audioIds.includes(name+'="rbxassetid://'+receipt.assetId+'"'),true,'등록 음원 ID 원본 보존: '+name);
  }
});

// [몹 상태이상 회귀] 정예 둔화/두목 독은 방어·회피한 공격에서 발동하지 않고 전투·저장 흐름에 섞이지 않는다.
test('정예 감속과 두목 맹독은 명중에만 발동하고 중첩·이동속도 누출을 막는다',()=>{
  assert.match(field,/local eliteSlowUntil, bossPoisonUntil, bossPoisonNextAt = 0, 0, math\.huge/);
  assert.match(field,/local slowedHumanoid, originalFieldWalkSpeed = nil, nil/);
  assert.match(field,/debuffLabel\.Name = "FieldHeroDebuff"/);
  assert.match(field,/if hit and pl\.ward then[\s\S]*?elseif hit then[\s\S]*?if parried then[\s\S]*?elseif dealt > 0 then/);
  // 일반 막기로 감소한 피해만 받았을 때도 둔화는 붙지 않는다.
  assert.match(field,/if not pl\.guarding and e\.elite and not e\.boss and now >= \(e\.nextSlowAt or 0\) then/);
  assert.match(field,/e\.nextSlowAt = now \+ 8/);
  assert.match(field,/eliteSlowUntil = math\.max\(eliteSlowUntil, now \+ 3\)/);
  assert.match(field,/if os\.clock\(\) < eliteSlowUntil then/);
  assert.match(field,/local targetSpeed = math\.max\(7, \(originalFieldWalkSpeed or 18\) \* 0\.65\)/);
  assert.match(field,/if slowedHumanoid == h2 and originalFieldWalkSpeed then[\s\S]*?h2\.WalkSpeed = originalFieldWalkSpeed/);
  assert.match(field,/elseif not pl\.guarding and e\.boss and now >= \(e\.nextPoisonAt or 0\) and now >= bossPoisonUntil then/);
  assert.match(field,/e\.nextPoisonAt = now \+ 10/);
  assert.match(field,/bossPoisonUntil, bossPoisonNextAt = now \+ 4, now \+ 1/);
  assert.match(field,/if pl\.hp > 0 and bossPoisonNextAt <= bossPoisonUntil and now >= bossPoisonNextAt then/);
  assert.match(field,/bossPoisonNextAt \+= 1/);
  // 특수공격은 미리 알아볼 수 있게 기존 예고 색/글자만 사용한다.
  assert.match(field,/e\.telegraphStatus = if e\.boss and now >= \(e\.nextPoisonAt or 0\)/);
  assert.match(field,/elseif e\.elite and not e\.boss and now >= \(e\.nextSlowAt or 0\) then "slow"/);
  assert.match(field,/wl\.Text = if e\.telegraphStatus == "poison" then "독"/);
  assert.match(field,/elseif e\.telegraphStatus == "slow" then "둔" else "!"/);
  assert.match(field,/local debuff = if poisoned and slowed then "독" \..*math\.ceil\(bossPoisonUntil - now\)/);
  assert.match(field,/shards\(poisonedRoot\.Position \+ Vector3\.new\(0, 1\.5, 0\), if visualMobile then 2 else 5/);
  assert.match(field,/pl\.hp = math\.max\(0, pl\.hp - 2\)/);
  // 정상·비정상 철수에서 모두 속도를 원복해야 저장/항구 제어가 깨지지 않는다.
  assert.equal((field.match(/slowedHumanoid\.WalkSpeed = originalFieldWalkSpeed/g)||[]).length, 3);
  assert.match(field,/task\.defer\(function\(\) finish\("defeat"\) end\)/);
});


// [전투 소리 회귀] 이미 승인된 음원만 쓰면서 무기별 발사/장전/명중을 분리한다.
test('무기별 실제 발사음과 원거리 스킬 이펙트가 등록된 음원으로 구분된다',()=>{
  const audio=read('ReplicatedStorage/Shared/AudioIds.luau');
  for(const sound of [
    'sfx_rope_pull','sfx_rope_release','sfx_equipment_wear','sfx_cannon_reload',
    'sfx_card_chain','sfx_card_volley','sfx_card_fire','sfx_cannon',
    'sfx_boarding_draw','sfx_boarding_slash','sfx_card_blade','sfx_card_swing',
    'sfx_metal_clash','sfx_card_ring',
  ]){
    assert.ok(audio.includes(sound+'="rbxassetid://'),'승인 음원 누락: '+sound);
  }
  // 기본 무기는 각기 다른 타격 종류, 지역 무기는 기존 모션 그룹별 소리를 그대로 사용한다.
  for(const motion of ['CROSSBOW','RIFLE','PISTOL','LONGBOW','RAPIER','SABRE','SCIMITAR','KATANA']){
    assert.ok(field.includes('wpn.motion == "'+motion+'"'),'무기 동작음 누락: '+motion);
  }
  for(const family of ['dagger','spear','axe','blunt','fist','bow']){
    assert.ok(field.includes('family == "'+family+'"'),'무기군별 분기 누락: '+family);
  }
  assert.match(field,/local impactWeapon = attackerWeapon or wpn/);
  assert.match(field,/local family = impactWeapon\.family/);
  // [동료 지상전투 제외] 동료 공격자(aw) 타격 경로는 제거됨: 잔존 금지로 고정.
  assert.doesNotMatch(field,/aw\.family == "axe", true, false, nil, aw/,'동료 공격 경로 잔존 금지');
  assert.match(field,/local rangedImpact = impactWeapon\.ranged and \(family == "bow" or family == "firearm"\)/);
  assert.match(field,/local rangedShot = wpn\.ranged[\s\S]*?sfx\("sfx_rope_release", 0\.49/);
  assert.doesNotMatch(field,/sfx\(if wpn\.family == "firearm" and wpn\.id ~= "crossbow"/);
  assert.match(field,/shotMotion: string\?, charged: boolean\?/);
  // [화살 볼트 3D] 과거 사각 Beam이 아닌 가는 실제 투사체와 짧은 Trail을 검사한다.
  assert.match(field,/shaft\.Name = "FieldProjectile"/);
  assert.match(field,/tip\.Name = "FieldArrowTip"/);
  assert.match(field,/local trail = Instance\.new\("Trail"\)/);
  assert.match(field,/shaft\.CFrame = CFrame\.lookAt\(p, p \+ aim\)/);
  assert.doesNotMatch(field.slice(field.indexOf('local function arrowTrail('),field.indexOf('-- 바닥 범위 예고:')),/Instance\.new\("Beam"\)/);
  // 집중 사격/견제 사격과 카드 저격/일제사격은 무기별 색과 적중 이펙트를 갖는다.
  assert.match(field,/if kind ~= "slash" then[\s\S]*?pulseAt\(if kind == "heavy" then "CRITICAL_BURST"/);
  assert.match(field,/local equippedId = ch and ch:GetAttribute\("EquippedWeaponId"\)/);
  assert.match(field,/arrowTrail\(pos, hitPos, nil, nil, motion, sk == "snipe"\)/);
  assert.doesNotMatch(field,/arrowTrail\(a0, b0, nil, nil, aw\.motion\)/,'동료 사격 경로 잔존 금지');
  assert.match(field,/nil, nil, if e\.weapon then e\.weapon\.motion else "BOW"/);
});


// [연타 무기별 10단 시각 동작] 공용 R15 원자와 기존 명중·숙련·저장 계약을 유지한다.
test('근접·원거리 10단 전신 모션과 마무리 이펙트는 기존 피해 판정을 유지한다',()=>{
  const motion=read('ReplicatedStorage/Shared/FieldMotion.luau');
  const common=read('ReplicatedStorage/Shared/CommonMotion.luau');
  const weapons=read('ReplicatedStorage/Shared/Weapons.luau');
  const chains={
    CROSSBOW:['FIREARM_RECOIL','FIREARM_BURST','FIREARM_RECOIL','FIREARM_BURST','FIREARM_RECOIL','FIREARM_BURST','FIREARM_RECOIL','FIREARM_BURST','FIREARM_BURST','FIREARM_RECOIL'],
    PISTOL:['FIREARM_RECOIL','FIREARM_BURST','FIREARM_RECOIL','FIREARM_BURST','FIREARM_RECOIL','FIREARM_BURST','FIREARM_RECOIL','FIREARM_BURST','FIREARM_BURST','FIREARM_RECOIL'],
    RIFLE:['FIREARM_RECOIL','FIREARM_BURST','FIREARM_RECOIL','FIREARM_BURST','FIREARM_RECOIL','FIREARM_BURST','FIREARM_RECOIL','FIREARM_BURST','FIREARM_BURST','FIREARM_RECOIL'],
    BOW:['BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE'],
    LONGBOW:['BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE'],
    RAPIER:['BLADE_THRUST','BLADE_RIPOSTE','BLADE_SLASH_L'],
  };
  const family={CROSSBOW:'FIREARM',PISTOL:'FIREARM',RIFLE:'FIREARM',
    BOW:'BOW',LONGBOW:'BOW',RAPIER:'BLADE'};
  for(const [weapon,atoms] of Object.entries(chains)){
    assert.ok(motion.includes(weapon+' = { '+atoms.map(x=>'"W:'+x+'"').join(', ')+' }'),weapon+' 등록 연계 누락');
    for(const atom of atoms){
      assert.ok(common.includes('{id="'+atom+'",family="'+family[weapon]+'"'),weapon+' 승인 원자 누락: '+atom);
    }
  }
  for(const weapon of ['DAGGER','SWORD','KATANA','SABRE','SCIMITAR','WAR_AXE','SPEAR','MACE']){
    assert.ok(common.includes(weapon+'={id="'+weapon+'"'),weapon+' 기본 모션 프로필 누락');
  }
  assert.match(motion,/local actorBeat = if rangedActor then 1 else \(h\.weaponBeat or 1\)/);
  // [연타 상태 검사] 예전 선언문의 정확한 끝 위치를 강제하지 않고 원래 계약 필드를 개별 확인한다.
  // 예약 타격·입력 버퍼가 추가돼도 기존 10타 시각 연결과 명중 중복 방지 계약은 유지해야 한다.
  const bridge = field.match(/local swingBridge = \{[^\r\n]*\}/)?.[0];
  assert.ok(bridge,'R15 공격 전신 연결 상태 누락');
  for(const key of [
    'last = {}','lastAt = -100','from = nil','rootLast = nil','rootFrom = nil',
    'at = 0','duration = 0','basicBeat = 0','basicAt = -100','impactSeq = -1',
  ]){
    assert.ok(bridge.includes(key),'R15 연타 필수 상태 누락: '+key);
  }
  // [모션/폰트 회귀] 강타·필살도 관절 시계를 멈추지 않으며 표시 글자 크기는 고정한다.
  assert.doesNotMatch(field,/hitStopUntil|hitStopLast|swingT0 \+= elapsed/);
  assert.match(field,/comboPopScale = Instance\.new\("UIScale"\)/);
  assert.match(field,/comboLabel\.TextSize = targetSize/);
  assert.match(field,/swingBridge\.impactSeq = actionSeq/);
  assert.match(field,/swingBridge\.from = table\.clone\(swingBridge\.last\)/);
  assert.match(field,/canon\[joint\] = old:Lerp\(canon\[joint\] or CFrame\.identity, weight\)/);
  assert.match(field,/weight = weight \* weight \* \(3 - 2 \* weight\)/);
  assert.match(field,/table\.clear\(swingBridge\.last\)/);
  assert.match(field,/if swingKind and swingCombo and slashIdx >= 2 then/);
  assert.match(field,/local stageDelay = if stage == 2 then 0\.20/);
  assert.match(field,/elseif wpn\.family == "axe" or wpn\.family == "blunt" then 0\.53/);
  assert.match(field,/elseif wpn\.ranged then 0\.41 else 0\.49/);
  assert.match(field,/local firing = actionPose/);
  // 시각 2~3단은 공격·피해·보상·쿨타임을 중복 발생시키지 않는다.
  const start=field.indexOf('if chain > 1 then');
  const stop=field.indexOf('elseif hits == 0 and moveId == "rush" then',start);
  assert.ok(start>0 && stop>start,'순수 시각 연타 블록 범위 누락');
  const visualOnly=field.slice(start,stop);
  assert.match(visualOnly,/startSwing\(finishKind,/);
  assert.doesNotMatch(visualOnly,/strikeEnemy\(|AC\.damageEnemy\(|AC\.takeHit\(/);
  assert.match(field,/if rank > 1 and comboNow - lastMasteryComboAt >= 7/);
  // [무기별 10연타] 연속 입력 1~10은 원래 공격당 피해 1회씩이며 추가 연출은 비타격이다.
  assert.match(field,/if moveId == "rush" then\s*-- \[연속 공격 10박자\]/);
  assert.match(field,/basicBeat = if pressedAt - swingBridge\.basicAt <= 1\.1 then swingBridge\.basicBeat % maxBeat \+ 1 else 1/);
  assert.match(field,/local nextStage = math\.clamp\(math\.floor\(stage or 1\), 1, 10\)/);
  assert.match(motion,/local stage = math\.clamp\(math\.floor\(idx\), 1, 10\)/);
  assert.match(motion,/local action = if stances and stances\[stage\] then stances\[stage\]/);
  assert.match(field,/startSwing\(kind, if kind == "spin" then 0\.6 elseif kind == "heavy" then 0\.7 else 0\.4, basicBeat\)/);
  assert.match(field,/local rapidPose = moveId == "rush" and basicBeat >= 2/);
  assert.match(field,/if basicBeat == 3 then[\s\S]*?auraOn\(ch0, aimColor/);
  assert.match(field,/if not visualMobile then afterimage\(ch0, aimColor, 2, 0\.06\) end/);
  assert.match(field,/return CFrame\.new\(-sidestep \* kick, -\(if longGun then 0\.24 else 0\.34\) \* kick, -0\.12 \* release\)/);
  assert.match(field,/return CFrame\.new\(slide \* kick, -crouch \* kick, -0\.18 \* release\)/);
  assert.match(field,/canon\.ThighL = \(canon\.ThighL or id\) \* CFrame\.Angles\(-0\.61 \* drop \* plant/);
  assert.match(field,/canon\.ShinR = \(canon\.ShinR or id\) \* CFrame\.Angles\(-0\.31 \* drop \* plant/);
  assert.match(field,/local shotVolume = 0\.31/);
  // [시네마틱 전신] 동일한 팔 흔들기가 아니라 1타 무기별 실루엣, 2타 스텝, 3타 낮은 격발이다.
  assert.match(field,/local sidestep = if bow then 0\.76 elseif crossbow then 0\.52 elseif longGun then 0\.43 else 0\.92/);
  assert.match(field,/local crouch = if bow then 0\.66 elseif crossbow then 0\.44 elseif longGun then 0\.58 else 0\.82/);
  assert.match(field,/local plant = math\.sin\(math\.clamp\(p \/ 0\.58, 0, 1\) \* math\.pi\)/);
  assert.match(field,/local shoulder = math\.sin\(math\.clamp\(\(p - 0\.08\) \/ 0\.72, 0, 1\) \* math\.pi\)/);
  assert.match(field,/local trigger = math\.sin\(math\.clamp\(\(p - 0\.26\) \/ 0\.55, 0, 1\) \* math\.pi\)/);
  assert.match(field,/canon\.Head = \(canon\.Head or id\) \* CFrame\.Angles\(0\.12 \* trigger/);
  assert.match(field,/canon\.UpperArmR = \(canon\.UpperArmR or id\) \* CFrame\.Angles\(-0\.38 \* shoulder \+ 0\.30 \* trigger/);
  assert.match(field,/canon\.HandR = \(canon\.HandR or id\) \* CFrame\.Angles\(0\.45 \* trigger/);
  assert.match(field,/arrowTrail\(shootFrom, shootTo, nil, nil, wpn\.motion, stage == 3\)/);
  assert.match(field,/if visualMobile then 2 else 7\)/);
  assert.doesNotMatch(motion,/CROSSBOW = \{ "W:FIREARM_RECOIL", "W:FIREARM_CYCLE"/);
  assert.doesNotMatch(motion,/BOW = \{ "W:BOW_RELEASE", "W:BOW_RENOCK"/);
  // 10타 마무리의 자연스러운 전신 관절 연결, 무기별 시각 차별화와 모바일 축약.
  assert.match(field,/local flourish = if slashIdx == 10 then 1\.90/);
  assert.match(field,/if basicBeat == 10 then[\s\S]*?auraOn\(ch0, trailColor/);
  assert.match(field,/if not visualMobile and basicBeat >= 7 then afterimage/);
  assert.match(field,/if slashIdx >= 4 then[\s\S]*?local turn = if slashIdx % 2 == 0/);
  assert.match(field,/swingBridge\.lastAt = os\.clock\(\)/);
  assert.match(field,/elseif os\.clock\(\) - swingBridge\.lastAt > 1\.1 then/);
  assert.doesNotMatch(field,/sfx\("sfx_cannon_reload", 0\.23, 1\.62\)/);
  assert.match(weapons,/cadence = "스냅사격·측면스텝·낮은선회/);
  // [10타 피날레 검증] 시각 연출만 확장하고 평타·5타 강타 권한은 원본에 남겨둔다.
  for(const marker of [
    '[창술 실루엣]', '[무게 중심 반작용]', '[무기 개성]', '[격투술]',
    '[10타 연속 사격 착지]', '[시각적 여운]', '[10타 무기별 2박 피날레]',
    '[7직업 회피 궤적]', '[직업별 접지]'
  ]){
    assert.ok(field.includes(marker),'신규 모션 연출 누락: '+marker);
  }
  const finaleStart=field.indexOf('-- [10타 무기별 2박 피날레]');
  const finaleEnd=field.indexOf('if not visualMobile and basicBeat >= 7 then afterimage',finaleStart);
  assert.ok(finaleStart>0 && finaleEnd>finaleStart,'10타 시각 전용 피날레 영역 누락');
  const finale=field.slice(finaleStart,finaleEnd);
  for(const action of ['strikeEnemy(', 'AC.damageEnemy(', 'AC.tryMove(', 'pl.autoNormalHits +=']){
    assert.ok(!finale.includes(action),'피날레에서 전투 권한 변경 금지: '+action);
  }
  assert.match(finale,/swingBridge\.basicAt ~= finishAt/);
  assert.match(finale,/wpn\.id ~= finishWeapon/);
  assert.match(field,/task\.delay\(0\.22, function\(\)/);
  assert.match(field,/task\.delay\(0\.27, function\(\)/);
  assert.match(field,/if visualMobile then 2 else 6/);
  assert.match(field,/if not mobile and \(dodgeStyle == "warrior" or dodgeStyle == "gunner" or dodgeStyle == "navigator"\)/);
  assert.match(field,/if basicAttack == true then[\s\S]*?pl\.autoNormalHits = \(pl\.autoNormalHits or 0\) \+ 1/);
  assert.match(field,/if chanceNow > 0 and hitAt - \(pl\.lastAutoSkillAt or -100\) >= 4 and comboRng:NextNumber\(\) < chanceNow then/);
  // [5타 강타 시네마] 기존 10박자/숙련 추가 동작이 강타와 겹치지 않는다.
  assert.match(field,/local function comboCinema\(n: number, isRecord: boolean, autoHeavy: boolean\?\)/);
  assert.match(field,/if moveId == "heavy" then[\s\S]{0,250}chainMotionSerial \+= 1/);
  assert.match(field,/chainMotionSerial ~= visualSerial/);
  assert.match(field,/local reach = math\.max\(7, wpn\.range \* 2\)/);
  assert.match(field,/if useMove\("heavy"\) then[\s\S]*?comboCinema\(streakN, record, true\)/);
  assert.match(field,/AC\.tryMove\(pl, moveId, now\)/);
});



// [6종 곡예 회피와 고속 연타 검무] 시각 관절만 변경하며 전투 판정은 기존 그대로다.
test('탐험 0.4초 회피 6종 및 무기별 10타 공중 검무 유지',()=>{
  const field=read('ReplicatedStorage/Shared/FieldScene.luau');
  for(const marker of [
    '[0.4초 댄스 회피 6종]', '[6종 회피 전신 관절]', '[전투 무용 4~9박]', '[4~9박 전신 곡예 관절]',
    '[옆구르기]', '[백덤블링]', '[높은 점프]', '[슬라이딩]', '[한손 짚고 돌기]', '[측면 공중회전]'
  ]) assert.ok(field.includes(marker),'곡예 모션 누락: '+marker);
  assert.match(field,/FieldDodgeTrick", \(ch0:GetAttribute\("FieldDodgeTrick"\) or 0\) % 6 \+ 1/);
  assert.match(field,/startSwing\("dash", 0\.4\)/);
  assert.match(field,/if kind == "dash" then\s+dur = 0\.4/);
  assert.match(field,/elseif kind == "slash" and beat >= 2 then\s+dur = math\.clamp\(dur, 0\.33, 0\.44\)/);
  assert.match(field,/local spin = t \* t \* \(3 - 2 \* t\) \* math\.pi \* 2/);
  assert.match(field,/elseif trick == 5 then[\s\S]*?canon\.HandL/);
  assert.match(field,/local spin = spinPhase \* spinPhase \* \(3 - 2 \* spinPhase\) \* math\.pi \* 2/);
  assert.ok(field.includes('[활·권총 공중 연사]'),'원거리 연속사격 곡예 누락');
  assert.ok(field.includes('[원거리 공중연사 발놀림]'),'원거리 공중 자세 누락');
  assert.match(field,/local agile = not crossbow and not longGun/);
  for(const i of [4,5,6,7,8,9]) assert.ok(field.includes('slashIdx == '+i),'10연타 곡예 단계 누락: '+i);
  assert.match(field,/if basicAttack == true then[\s\S]*?pl\.autoNormalHits = \(pl\.autoNormalHits or 0\) \+ 1/);
  assert.match(field,/if chanceNow > 0 and hitAt - \(pl\.lastAutoSkillAt or -100\) >= 4 and comboRng:NextNumber\(\) < chanceNow then/);
  assert.match(field,/hrp\.CFrame = hrp\.CFrame \+ look\.Unit \* 14/);
  assert.match(field,/pl\.matrixDodgeUntil = now \+ \(mv\.invuln or 0\.35\)/);
});

// [무기별 1~10타 섬광·잔상 안전 회귀] 효과는 실제 공격 시간에 맞추되 전투 권한과 분리한다.
test('탐험 무기별 검광·창끝·중량 충격파·활석궁총 타격 시각 연출',()=>{
  const field=read('ReplicatedStorage/Shared/FieldScene.luau');
  for(const marker of [
    '[원거리 무기별 10단 발사 섬광]', '[원거리 손목별 잔광]',
    '[근접 무기별 2~10타 도장 잔광]', '[무기별 2~9타 접촉 섬광]',
    '[3·6·9타 무기별 2박]', '[1타 무기별 첫칼]', '[10타 무기별 2박 피날레]'
  ]) assert.ok(field.includes(marker),'무기별 연타 효과 누락: '+marker);
  assert.match(field,/local rangedTrail = if wpn\.family == "bow" then/);
  assert.match(field,/elseif wpn\.motion == "CROSSBOW" then \{ "LeftHand", "RightHand", "RightLowerArm" \}/);
  assert.match(field,/elseif wpn\.motion == "RIFLE" then \{ "LeftHand", "LeftLowerArm", "RightHand" \}/);
  for(const family of ['dagger','spear','axe','blunt','fist']){
    assert.ok(field.includes('wpn.family == "'+family+'"'),'무기별 궤적 구분 누락: '+family);
  }
  const ranged=field.slice(field.indexOf('-- [원거리 무기별 10단 발사 섬광]'),field.indexOf('-- [영화식 연속 사격]',field.indexOf('-- [원거리 무기별 10단 발사 섬광]')));
  const melee=field.slice(field.indexOf('-- [무기별 2~9타 접촉 섬광]'),field.indexOf('if basicBeat == 10 then',field.indexOf('-- [무기별 2~9타 접촉 섬광]')));
  for(const region of [ranged,melee]){
    assert.ok(region.length>200,'무기별 효과 범위 누락');
    assert.match(region,/task\.delay\(0\.14, function\(\)/);
    assert.match(region,/swingBridge\.basicAt ~= fxAt or wpn\.id ~= fxWeapon/);
    assert.match(region,/if visualMobile and fxBeat/);
    for(const forbidden of ['AC.damageEnemy(', 'AC.tryMove(', 'strikeEnemy(', 'pl.autoNormalHits =']){
      assert.ok(!region.includes(forbidden),'연출이 전투 판정을 건드림: '+forbidden);
    }
  }
  assert.match(field,/if chanceNow > 0 and hitAt - \(pl\.lastAutoSkillAt or -100\) >= 4 and comboRng:NextNumber\(\) < chanceNow then/);
  assert.match(field,/task\.delay\(if kind == "slash" then 0\.14/);
  assert.match(field,/startSwing\("dash", 0\.4\)/);
});

// [실제 적중 1회만 정밀 검광] 공격 전 연출과 피해 판정은 기존 소유권을 유지한다.
test('탐험 무기별 실물 메시 축·피격 부위 절삭 관통 둔격 이펙트·모바일 절제',()=>{
  const field=read('ReplicatedStorage/Shared/FieldScene.luau');
  const common=read('ReplicatedStorage/Shared/CommonVFX.luau');
  for(const marker of [
    '[실제 칼날 축]', '[실물 무기날 선택]', '[실제 적중 1회당 1번]',
    '[3·6·9타 잔흔]', '[맞는 재질감]', '[원거리 무기별 10단 발사 섬광]'
  ]) assert.ok(field.includes(marker),'무기별 정밀 타격 효과 누락: '+marker);
  for(const atom of ['IMPACT_FLASH','SHAPE_BURST','CRITICAL_BURST']){
    assert.ok(common.includes('"'+atom+'"'),'승인된 공용 효과 누락: '+atom);
  }
  assert.match(field,/axis = if size\.X >= size\.Y and size\.X >= size\.Z/);
  assert.match(field,/elseif size\.Z >= size\.Y then Vector3\.new\(0, 0, 1\)/);
  assert.match(field,/for _, part in sword:GetDescendants\(\) do/);
  assert.match(field,/if trail.Parent then trail.Enabled = false end/);
  assert.match(field,/task.delay\(trail.Lifetime \+ 0\.04, function\(\) pcall\(ctl.Destroy\) end\)/);
  assert.match(field,/local detailedContact = basicAttack == true and ownerAttack ~= false and not quiet/);
  assert.match(field,/and not shieldBlocked and not weaponParry and actionSeq ~= nil and actionSeq > 0/);
  assert.match(field,/and impactBeat ~= nil and swingBridge\.impactSeq ~= actionSeq/);
  assert.match(field,/swingBridge\.impactSeq = actionSeq/);
  assert.match(field,/nil, nil, hitActionSeq, nil, moveId == "rush", basicBeat\)/);
  assert.match(field,/local beat = math\.clamp\(math\.floor\(impactBeat\), 1, 10\)/);
  assert.match(field,/if not rangedImpact and not detailedContact then/);
  assert.match(field,/if rangedImpact and not shieldBlocked and not detailedContact then/);
  assert.match(field,/if not visualMobile and sharp and beat % 3 == 0 then/);
  assert.match(field,/task\.delay\(0\.055, function\(\)/);
  assert.match(field,/or swingBridge\.impactSeq ~= hitSeq then return end/);
  const start=field.indexOf('-- [실제 적중 1회당 1번]');
  const stop=field.indexOf('-- [맞는 재질감]',start);
  assert.ok(start>0&&stop>start,'정밀 적중 효과 범위 누락');
  const effect=field.slice(start,stop);
  for(const item of ['axe','blunt','dagger','spear','fist','bow','RIFLE','CROSSBOW','KATANA']){
    assert.ok(effect.includes('"'+item+'"'),'무기별 충돌 효과 누락: '+item);
  }
  for(const forbidden of ['AC.damageEnemy(', 'AC.tryMove(', 'strikeEnemy(', 'pl.autoNormalHits =','Instance.new(']){
    assert.ok(!effect.includes(forbidden),'효과에서 전투 판정 또는 임의 파츠 생성: '+forbidden);
  }
  assert.match(effect,/count = if visualMobile then 2 elseif heavy then 6 else 3/);
  assert.match(field,/if chanceNow > 0 and hitAt - \(pl\.lastAutoSkillAt or -100\) >= 4 and comboRng:NextNumber\(\) < chanceNow then/);
});

// [쓰시마식 검술 1~10타 단계별 전신 연계] 실제 피해 판정·회피·저장 권한과 분리한다.
test('탐험 단계별 검술 발놀림과 골반 회전의 부드러운 전환 보호',()=>{
  const field=read('ReplicatedStorage/Shared/FieldScene.luau');
  const sword=field.slice(field.indexOf('local function rootFor('),field.indexOf('elseif kind == "heavy" then',field.indexOf('local function rootFor(')));
  for(const marker of [
    '[쓰시마 1·2·3단]', '[쓰시마식 1~3타]', '[4타]', '[5타]', '[6타]', '[8타]', '[9타]',
    '[5단 축발 선회]', '[6단 중량 차별화]', '[9단 반대축]', '[전신 연속 보간]'
  ]) assert.ok(field.includes(marker),'단계별 검술 관절/회전 연결 누락: '+marker);
  for(let beat=1;beat<=10;beat++){
    assert.ok(sword.includes('slashIdx == '+beat),'검술 '+beat+'타 루트 동작 누락');
  }
  assert.match(field,/rootFrom = swingBridge\.rootLast/);
  assert.match(field,/rootRot = swingBridge\.rootFrom:Lerp\(rootRot or CFrame\.identity, blend\)/);
  assert.match(field,/if swingKind == "slash" and slashIdx <= 3 and not wpn\.ranged then/);
  for(const beat of [4,5,6,7,8,9]) assert.ok(field.includes('not wpn.ranged and slashIdx == '+beat),'근접 검무가 원거리 견착과 충돌: '+beat);
  assert.match(field,/if kind == "dash" then\s+dur = 0\.4/);
  assert.match(field,/elseif kind == "slash" and beat >= 2 then\s+dur = math\.clamp\(dur, 0\.33, 0\.44\)/);
  assert.match(field,/task\.delay\(if kind == "slash" then 0\.14/);
  assert.match(field,/if basicAttack == true then[\s\S]*?pl\.autoNormalHits = \(pl\.autoNormalHits or 0\) \+ 1/);
  assert.match(field,/if chanceNow > 0 and hitAt - \(pl\.lastAutoSkillAt or -100\) >= 4 and comboRng:NextNumber\(\) < chanceNow then/);
  assert.match(field,/pl\.matrixDodgeUntil = now \+ \(mv\.invuln or 0\.35\)/);
  assert.match(field,/local featureList = landforms/);
});

// [탐험 지도 다양성] 승인된 외부 메시와 기존 퀘스트/전투 계약만 사용한다.
test('탐험 현장별 10종 3차원 지형, 주야·기상·실물 동물 및 단서 조사 연결',()=>{
  const field=read('ReplicatedStorage/Shared/FieldScene.luau');
  const assets=read('ReplicatedStorage/Shared/AssetIds.luau');
  const start=field.indexOf('local landforms = {');
  const end=field.indexOf('local featureList = landforms',start);
  assert.ok(start>0 && end>start,'현장 지형 모델 선택 구간 누락');
  const scenery=field.slice(start,end);
  for(const theme of ['coast','forest','highland','mine','ruins','fort','desert','farm','lake','plains']){
    assert.match(scenery,new RegExp('\\b'+theme+' = \\{'),'퀘스트 지형 모델 목록 누락: '+theme);
  }
  for(const [,kind,name] of scenery.matchAll(/\{"(Terrain|Town|Castle|Naval)","([^"]+)",/g)){
    assert.ok(assets.includes('["'+kind+'/'+name+'"]'),'승인되지 않은 지형 에셋: '+kind+'/'+name);
  }
  assert.match(field,/FieldQuestTerrainTheme/);
  assert.match(field,/FieldTerrainFeatureCount/);
  // [배경 디테일] 모바일 지형 수 제한, 승인 에셋 통합 배치, 지연 복제 및 철수 정리.
  assert.match(field,/for index, entry in featureList do/);
  assert.match(field,/local function placeFeature\(entry\)/);
  assert.match(field,/local function stageFeature\(entry\)/);
  assert.ok(field.includes('if not AssetIds[entry[1] .. "/" .. entry[2]] then return nil end'));
  assert.match(field,/if not placed then table\.insert\(pending, entry\) end/);
  assert.match(field,/\{ "Terrain", "Town", "Castle", "Naval", "Cargo" \}/);
  // [층별 고도 보존] 성탑·지붕 수직 오프셋을 무시하지 않고 XZ 원위치도 유지한다.
  assert.match(field,/entry\.position = c \+ Vector3\.new\(e\[4\], e\[8\] or 0, e\[5\]\)/);
  assert.match(field,/FieldTerrainSurvey/);
  assert.match(field,/anchorPart:FindFirstChild\("FieldTerrainSurveyPoint"\)/);
  assert.match(field,/surveyPoint\.WorldPosition = Vector3\.new/);
  assert.match(field,/prompt\.Parent = surveyPoint/);
  assert.match(field,/local function retryPending\(groupName, modelName\)/);
  assert.match(field,/group\.ChildAdded:Connect\(function\(child\)/);
  assert.match(field,/if not needed then return end/);
  assert.match(field,/folder\.Destroying:Connect\(function\(\)/);
  assert.match(field,/folder\.ChildAdded:Connect\(function\(landmark\)/);
  assert.match(field,/FieldTerrainLandmark/);
  assert.match(field,/FieldTerrainClue/);
  assert.match(field,/FieldTerrainClues/);
  assert.match(field,/FieldTimePhase/);
  assert.match(field,/FieldWeatherClock/);
  assert.match(field,/FieldPrecipitation/);
  assert.match(field,/FieldAmbientAnimal/);
  assert.match(field,/FieldAmbientObservations/);
  assert.match(field,/local function spawnWildlife/);
  assert.match(field,/weatherNext = now \+ climateRng:NextNumber/);
  assert.match(field,/local clock = \(biome\.clock \+ \(now - clockStart\)/);
  assert.doesNotMatch(field.slice(field.indexOf('[자연 관찰]'),field.indexOf('-- 미니맵:',field.indexOf('[자연 관찰]'))),/AC\.damageEnemy|rewardGold|saveState/);
});


// [지역 기후·사계절 배경] 계절은 시각적 요소로 한정하고 승인된 환경 모델을 재사용한다.
test('탐험 지역 기후·사계절 배경과 바람 입자 디테일',()=>{
  const field=read('ReplicatedStorage/Shared/FieldScene.luau');
  const assets=read('ReplicatedStorage/Shared/AssetIds.luau');
  for (const marker of [
    'month = os.date("!*t").month', 'FieldSeason', 'FieldSeasonLabel', 'FieldClimateZone',
    'FieldSeasonMonth', 'local winterScene =', 'local monsoon =', 'foliageTint',
    'local detailAssets =', 'FieldSeasonalDrift', 'local driftType =', 'local weatherOptions = if snowy'
  ]) assert.ok(field.includes(marker),'계절/기후 묘사 연결 누락: '+marker);
  assert.match(field,/local detailCount = math\.max\(24, math\.floor\(24 \* math\.sqrt\(AREA\)\)\)/);
  assert.match(field,/local arid = not tropical and/);
  assert.match(field,/local climateZone = if northern then "북방"/);
  // [지역 지면 재질] 퀘스트 지형이 문화권 기본 풀밭을 잘못 물려받지 않는다.
  for(const pair of [
    ['desert','Enum.Material.Sand'],['coast','Enum.Material.Sand'],
    ['highland','Enum.Material.Slate'],['mine','Enum.Material.Slate'],
    ['ruins','Enum.Material.Ground'],['glacier','Enum.Material.Snow'],
    ['swamp','Enum.Material.Mud'],['volcanic','Enum.Material.Slate']]){
    assert.ok(field.includes('questTerrain == "'+pair[0]+'"'),'지형 인식 누락 '+pair[0]);
    assert.ok(field.includes('biome.mat = '+pair[1]),'지면 재질 미설정 '+pair[0]);
  }
  assert.match(field,/string\.find\(questName, "해적 소굴", 1, true\)(?:\s+or string\.find\(questName, "[^"]+", 1, true\))* then "coast"/,'해적 은신처 해안 지형');
  assert.ok(field.includes('mat ~= Enum.Material.Snow and mat ~= Enum.Material.Ground'),'복셀 언덕의 눈·흙 재질 보존');
  assert.match(field,/elseif questTerrain == "coast" then[\s\S]*?if winterScene then\s+biome\.mat = Enum\.Material\.Snow/,'북방 해안의 겨울 눈 보존');
  assert.match(field,/local weatherOptions = if snowy then/);
  assert.match(field,/drift\.Rate = \(if visualMobile then 4 else 8\) \* \(if weather == "소나기" then 0\.45 else 1\)/,'모바일 바람 입자 절반·소나기 감쇠');
  assert.match(field,/timeLabel\.Text = string\.format\("%s %s %02d:%02d/);
  assert.match(field,/placeModel\(folder, entry\[1\], entry\[2\], pos, entry\[3\], entry\[6\], entry\.tint, entry\.band\)/);
  for (const name of [
    'coast-grass-patch','Grass_Small','river-stone-bank','debris','Rock_2','log-stack',
    'forest-bush-detailed','forest-flower-purple','north-pine-fall','crops-wheatstageb',
    'forest-flower-yellow','arid-cactus-short','east-bamboo-grove'
  ]) assert.ok(assets.includes('["Terrain/'+name+'"]'),'미등록 계절 배경 모델: '+name);
  const start=field.indexOf('-- [지역 원근·계절 디테일]');
  const end=field.indexOf('-- 생산지·탐험 지역',start);
  assert.ok(start>0 && end>start,'계절 환경 배치 블록 누락');
  assert.doesNotMatch(field.slice(start,end),/Instance\.new\("(?:Part|MeshPart|WedgePart)"\)/);
  // 전투/적 자동 재출현은 장면의 계절 연출과 무관하다.
  assert.doesNotMatch(field,/FieldEnemyRespawn|spawnReinforcement/);
});


// [탐험 흰 건물·바닥 회귀] 승인된 메시의 색상 유실과 층 겹침만 바로잡고 전투·퀘스트 판정은 보존한다.
test('대항해시대 탐험의 흰 건물·바닥과 성탑 층 겹침 방지',()=>{
  const field=read('ReplicatedStorage/Shared/FieldScene.luau');
  const start=field.indexOf('local function placeModel(');
  const end=field.indexOf('local function label(',start);
  assert.ok(start>=0 && end>start,'기존 필드 모델 배치 책임 함수 누락');
  const placement=field.slice(start,end);
  for(const marker of [
    'local named = (kind == "Town"', 'kind == "Castle"',
    'kind == "Terrain"', 'kind == "Naval"',
    'd.TextureID ~= ""', 'or sa ~= nil', 'ch.TextureId ~= ""',
    'light >= 0.80 and chroma <= 0.13',
    'Enum.Material.Cobblestone', 'Enum.Material.WoodPlanks',
    'Enum.Material.Slate', 'Enum.Material.Ground',
    'd.Material, d.Color, d.Reflectance = mat, color, 0',
    'm:ScaleTo(m:GetScale() * ratio)',
  ]) assert.ok(placement.includes(marker),'건축 메시 색상·배율 복구 누락: '+marker);
  assert.ok(field.includes('"tower-hexagon-mid", 12, -30, -26, true, nil, 8'));
  assert.ok(field.includes('"tower-hexagon-roof", 12, 30, -26, true, nil, 16'));
  assert.ok(field.includes('entry.position = c + Vector3.new(e[4], e[8] or 0, e[5])'));
  // [실게임 권한 회귀] Studio 도구 권한으로 통과해도 클라이언트 RenderFidelity 쓰기는 탐험 입장을 중단시킨다.
  assert.doesNotMatch(placement,/\.RenderFidelity\s*=/,'게임 클라이언트의 제한된 메시 정밀도 변경 금지');
  assert.doesNotMatch(placement,/Instance\.new\("(?:Part|MeshPart|WedgePart)"\)/,'건물 복구에 임시 도형 금지');
  assert.match(field,/local enemyCount = math\.clamp\(20 \+ \(danger0 - 1\) \* 6/);
  assert.match(field,/AC\.stepEnemy\(e\.ac, enemyDt, dist, not e\.waiting\)/);
});

// [탐험 연타 사물과 병종 전술·방어·기상] 기존 플레이 규칙과 승인된 R15 모델로만 구현한다.
test('디아블로식 사물 연타·병종 협동 AI·피격 기상 및 사망 모션',()=>{
  const field=read('ReplicatedStorage/Shared/FieldScene.luau');
  const motion=read('ReplicatedStorage/Shared/FieldMotion.luau');
  const pose=read('ReplicatedStorage/Shared/Pose.luau');
  const combat=read('ReplicatedStorage/Shared/ActionCombat.luau');
  const assets=read('ReplicatedStorage/Shared/AssetIds.luau');
  for(const marker of [
    'local fieldObjects = {}', 'FieldCombatObject', 'FieldObjectHits',
    'for _, obj in fieldObjects do', 'FieldObjectMaxHp', 'FieldObjectHp',
    'local sceneryHit = false', 'local visualObjectHits = 0',
    'local function breakCrate(c, strikePower: number?)',
    'local function explodeBarrel(b, hrp: BasePart, hitActionSeq: number?, strikePower: number?)',
    'if isBoss then 2.75 elseif ac.kind == "shield" or ac.kind == "charger" then 2.55 else 2.35',
    'e.knockUntil, e.riseUntil', 'e.ac.stagger = math.max(e.ac.stagger, 1.57)',
    'local knocked = now < (e.riseUntil or 0)', 'st, ph = "KNOCKDOWN"',
    'st, ph = "GETUP"', 'st, ph = "BLOCK"', 'st, ph = "PARRY"',
    'FieldEnemyReaction', 'FieldHitVariant', 'FieldTacticalIntent',
    'intent, goal = "frontline"', 'intent, goal = "flank"',
    'intent, goal = "ambush"', '"retreat" else "strafe"',
    'e.waiting = e.ac.state == "chase" and (others >= AC.MELEE_TOKENS',
    'pl.nextEnemyTurnAt = now + math.max(0.80',
    'e.nextDuelAt = now + math.max(2.2',
    'local ring = math.clamp(e.ac.def.range * STUD + 5',
    'RunService.PreSimulation:Connect(function(dt)',
    'not e.waiting)',
    'e.tacticAt = now + 0.65',
    'Pose.dieR15(dying, p, deathVariant)'
  ]) assert.ok(field.includes(marker),'탐험 전술/전투 연결 누락: '+marker);
  for(const marker of [
    'state == "KNOCKDOWN"', 'state == "GETUP"', 'state == "BLOCK"',
    'state == "PARRY"', 'local fallSide =',
    'bend("UpperArmL", -1.36', 'bend("UpperArmR", -1.44',
    'local hitStyle = h.model:GetAttribute("FieldHitVariant")'
  ]) assert.ok(motion.includes(marker),'R15 적 모션 누락: '+marker);
  // [적 인형 움직임 회귀] 전투 AI와 피해 수치를 바꾸지 않고, 기존 R15 관절로 발놀림·무게중심을 완성한다.
  for(const marker of [
    '[적 경계 동작]', '[적 보행 접지]', '[적 검무 발놀림]',
    '[쓰러짐 관성]', '[기상 3단]', '[피격 충격 전달]'
  ]) assert.ok(motion.includes(marker),'적 R15 전신 연계 누락: '+marker);
  for(const marker of ['state == "ANTICIPATION"', 'state == "ATTACK"', 'state == "RECOVERY"',
                       'state == "BLOCK" or state == "PARRY"', 'bend("FootL"', 'bend("FootR"',
                       'bend("ShinL"', 'bend("ShinR"', 'bend("Spine"', 'bend("Head"']) {
    assert.ok(motion.includes(marker),'적 검무 관절 동작 누락: '+marker);
  }
  const enemyFootwork=motion.slice(motion.indexOf('-- [적 검무 발놀림]'),motion.indexOf('-- [실제 타격 발동작]'));
  assert.ok(enemyFootwork.length > 1000,'적 전신 발놀림 블록 누락');
  for(const disallowed of ['AC.damageEnemy(', 'AC.stepEnemy(', 'Instance.new(', ':PivotTo(']) {
    assert.ok(!enemyFootwork.includes(disallowed),'R15 모션 전용 구간에서 실제 전투·위치 조작 금지: '+disallowed);
  }
  // [개떼 공격·관절 렌더 회귀] 모든 병종이 같은 2개 공격권을 쓰며 대기 중 겹치지 않는다.
  assert.match(combat,/A\.MELEE_TOKENS = 2/);
  assert.match(field,/e\.waiting = e\.ac\.state == "chase" and \(others >= AC\.MELEE_TOKENS[\s\S]*?e\.nextDuelAt/);
  assert.match(field,/AC\.stepEnemy\(e\.ac, enemyDt, dist, not e\.waiting\)/);
  // [협동 AI 회귀] 3인 무리는 방패·검병 중 한 명만 정면을 맡고, 측면·원거리 지원과 반격 순서를 유지한다.
  assert.match(field,/for mateIndex, mate in enemies do[\s\S]*?mate\.ac\.kind == "shield"/);
  assert.match(field,/mateIndex < index/);
  assert.match(field,/intent, goal = "flank"/);
  assert.match(field,/intent, goal = "frontline"/);
  assert.match(field,/nextCounter\.counterUntil/);
  assert.match(field,/not nextCounter or/);
  assert.match(field,/guardReadUntil, e\.nextGuardReadAt = now \+ 1\.05, now \+ 5\.5/);
  assert.match(field,/intent = if readingCombo then "counter-flank" elseif readingGuard then "guard-flank"/);
  assert.match(field,/local evadeSide = e\.model:GetAttribute\("FieldEnemyDodgeSide"\)/);
  assert.match(field,/evadeSide \* 0\.20 \* math\.sin\(ph \* math\.pi\)/);
  assert.doesNotMatch(field,/AC\.stepEnemy\(e\.ac, enemyDt, dist, if e\.ac\.def\.keepAway or e\.ac\.def\.boss then true/);
  assert.match(field,/local band = math\.clamp\(\(flat\.Magnitude - ring\) \/ 6/);
  assert.match(field,/desired = \(tangent \* 0\.44 \+ flat\.Unit \* band\)/);
  assert.match(field,/pl\.nextEnemyTurnAt = now \+ math\.max\(0\.80/);
  assert.match(field,/RunService\.PreSimulation:Connect\(function\(dt\)/);
  assert.match(motion,/model:SetAttribute\("FieldJointChannels", nj\)/);
  assert.match(motion,/model:SetAttribute\("FieldJointReady", if r6 then nj >= 6 else nj >= 12\)/);
  assert.match(pose,/function Pose\.dieR15\(model, alpha, variant\)/);
  assert.match(pose,/local fade = math\.clamp\(\(a - 0\.78\) \/ 0\.22/);
  assert.match(field,/local duration = if visualMobile then 1\.35 else 1\.70/);
  assert.match(field,/if hits == 0 and not sceneryHit and hitActionSeq >= streakCountedSeq then endStreak/);
  assert.match(field,/if result == "exploded" then hits \+= 1 end/);
  assert.match(field,/if breakCrate\(c, if moveId == "heavy" then 2 else 1\) then sceneryHit = true end/);
  assert.match(field,/if rangedShot and shots >= 1 then break end/);
  assert.match(field,/local frozen = knocked or now < \(e\.holdUntil or 0\)[\s\S]{0,120}or now < \(e\.guardUntil or 0\)/);
  assert.match(field,/for index, entry in featureList do/);
  assert.match(field,/local function placeFeature\(entry\)/);
  assert.match(field,/if not AssetIds\[entry\[1\] \.\. "\/" \.\. entry\[2\]\] then return nil end/);
  assert.match(combat,/A\.MELEE_TOKENS = 2/);
  // 새 피격 시스템은 기존 등록 모델을 재사용한다. 신규 사물 도형이나 새 몬스터 자산 없음.
  assert.ok(assets.includes('["Cargo/bucket"]'));
  assert.ok(assets.includes('["Naval/barrel"]'));
  const section=field.slice(field.indexOf('-- [디아블로식 사물 군집]'),field.indexOf('local function breakCrate('));
  assert.doesNotMatch(section,/Instance\.new\("(?:Part|MeshPart|WedgePart)"\)/);
  assert.doesNotMatch(field,/FieldEnemyRespawn|spawnReinforcement/);
});


test('탐험 1~10타·회피 전환은 실제 배율이 적용된 R15 자세를 끊김 없이 연결한다', () => {
  const scale = field.indexOf('FM.scale(canon, if swingKind == "dash" then');
  const blend = field.indexOf('if swingKind and swingBridge.from then');
  const root = field.indexOf('rootRot = rootFor(swingKind');
  const cache = field.indexOf('if swingKind and (swingCombo or swingKind == "dash") then');
  const step = field.indexOf('FM.step(pfm, dt, rootRot');
  assert.ok(scale >= 0 && scale < blend && blend < root && root < cache && cache < step,
    '배율 적용 → 관절·루트 연결 → 최종 자세 캐시 → 관절 전송 순서가 유지되어야 한다');
  assert.match(field, /weight = weight \* weight \* \(3 - 2 \* weight\)/);
  assert.match(field, /blend = blend \* blend \* \(3 - 2 \* blend\)/);
  assert.match(field, /swingBridge\.from, swingBridge\.rootFrom, swingBridge\.rootLast = nil, nil, nil/);
  assert.match(field, /local settle = math\.sin\(math\.clamp\(\(p - 0\.57\) \/ 0\.43, 0, 1\) \* math\.pi\)/);
  assert.match(field, /elseif os\.clock\(\) - swingBridge\.lastAt > 1\.1 then/);
  for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
    const eased = t * t * (3 - 2 * t);
    assert.ok(eased >= 0 && eased <= 1);
  }
  assert.match(field, /pl\.autoHeavyFire == pl\.autoNormalHits/);
  assert.match(field, /if rank > 1 and comboNow - lastMasteryComboAt >= 7/);
});


test('무기별 정밀 R15 동작은 타격 전후 영점 복귀와 기존 전투 권한을 지킨다', () => {
  const a=field.indexOf('-- [무기별 정밀 동작]');
  const b=field.indexOf('-- [쓰시마식 1~3타]',a);
  assert.ok(a>0 && b>a,'기존 주인공 관절 합성 블록을 직접 수정해야 한다');
  const fine=field.slice(a,b);
  for(const family of ['dagger','fist','spear','axe','blunt','blade']){
    assert.ok(fine.includes('family == "'+family+'"'),'무기 세부 동작 누락: '+family);
  }
  for(const variant of ['RAPIER','KATANA','SABRE','SCIMITAR']){
    assert.ok(fine.includes('wpn.motion == "'+variant+'"'),'검종별 정밀 자세 누락: '+variant);
  }
  assert.match(fine,/local prepare = math\.sin\(math\.clamp\(p \/ 0\.34, 0, 1\) \* math\.pi\) \^ 2/);
  assert.match(fine,/local contact = math\.sin\(math\.clamp\(\(p - 0\.11\) \/ 0\.60, 0, 1\) \* math\.pi\) \^ 2/);
  assert.match(fine,/local recover = math\.sin\(math\.clamp\(\(p - 0\.43\) \/ 0\.57, 0, 1\) \* math\.pi\) \^ 2/);
  for(const forbidden of ['AC.tryMove(', 'strikeEnemy(', 'hrp.CFrame =', 'pl.autoNormalHits +=']){
    assert.ok(!fine.includes(forbidden),'시각 모션에 전투 권한이 혼입됨: '+forbidden);
  }
  const rangeStart=field.indexOf('-- [사격 곡선]');
  const rangeEnd=field.indexOf('-- [연타 관성]',rangeStart);
  assert.ok(rangeStart>0 && rangeEnd>rangeStart,'기존 원거리 견착 보정 블록 누락');
  const range=field.slice(rangeStart,rangeEnd);
  assert.match(range,/local press = if firing then math\.sin\(progress \* math\.pi\) \^ 2 else 0/);
  assert.match(range,/local recoil = if firing then math\.sin\(math\.clamp\(\(progress - 0\.26\) \/ 0\.42, 0, 1\) \* math\.pi\) \^ 2 else 0/);
  assert.match(range,/local recover = if firing then math\.sin\(math\.clamp\(\(progress - 0\.56\) \/ 0\.44, 0, 1\) \* math\.pi\) \^ 2 else 0/);
  for(const variant of ['crossbow','bow','longGun','pistol']){
    assert.ok(range.includes(variant),'원거리 무기 고유 반동 누락: '+variant);
  }
  for(const [start,end] of [[0,0.34],[0.11,0.71],[0.43,1],[0.26,0.68],[0.56,1]]){
    const pulse=p=>Math.sin(Math.max(0,Math.min(1,(p-start)/(end-start)))*Math.PI)**2;
    assert.ok(Math.abs(pulse(0))<1e-10 && Math.abs(pulse(1))<1e-10,'시작·끝 관절 흔들림 잔존');
    assert.ok(pulse((start+end)/2)>0.999,'무기별 파형이 실제로 움직여야 한다');
  }
  assert.match(field,/elseif swingKind and swingCombo and \(wpn\.family == "dagger" or wpn\.family == "fist"\) then 1\.12/);
  assert.match(field,/elseif swingKind and swingCombo and \(wpn\.family == "axe" or wpn\.family == "blunt"\) then 0\.96/);
  assert.match(field,/elseif swingKind and swingCombo and wpn\.family == "spear" then 1\.06 else nil/);
  assert.match(field,/pl\.autoHeavyFire == pl\.autoNormalHits/);
  assert.match(field,/if rank > 1 and comboNow - lastMasteryComboAt >= 7/);
});

// [R15 주민·동료 실물복식] 남녀 네 계열과 기존 15관절/저장키 보존 회귀.
test('항구 주민·동료 남녀 4계열은 등록된 실제 3D 의상 메시를 사용한다',()=>{
  const pose=read('ReplicatedStorage/Shared/Pose.luau');
  const port=read('ReplicatedStorage/Shared/PortScene.luau');
  for(const profile of ['citizen_male','citizen_female','companion_male','companion_female']) {
    assert.ok(pose.includes(profile+' = {'),'복식 계열 누락: '+profile);
  }
  for(const asset of ['male_peasant_body','female_peasant_body','male_ranger_body','female_ranger_body','hair_simpleparted','hair_buns','hair_long']) {
    assert.ok(pose.includes('"'+asset+'"'),'기존 등록 3D 복장 누락: '+asset);
  }
  assert.match(pose,/Pose\.applyRegisteredMobOutfit\(model\)/);
  assert.match(pose,/model:SetAttribute\("NpcAssetProfile"/);
  assert.match(pose,/pcall\(drawFace, headPart\)/);
  assert.match(port,/extra\.female = female/);
  assert.match(port,/c\.id == "c_merian"/);
  assert.match(port,/people\.ChildAdded:Connect\(function\(asset\)/);
  assert.match(port,/outfitConn:Disconnect\(\)/);
  assert.match(pose,/part\.Massless = true/);
  assert.match(pose,/part\.CanCollide, part\.CanTouch, part\.CanQuery = false, false, false, false/);
  assert.match(pose,/model:SetAttribute\("RigType", "R15"\)/);
});

// [주민·동료 실물복식 2차] 직업군과 탐험 현장 동료 복식을 기존 R15·자산 인입 책임 안에서 검증한다.
test('직업별 주민과 남녀 탐험 동료의 실제 메시 복식은 등록 자산과 R15 결합을 재사용한다',()=>{
  const pose=read('ReplicatedStorage/Shared/Pose.luau');
  const port=read('ReplicatedStorage/Shared/PortScene.luau');
  const field=read('ReplicatedStorage/Shared/FieldScene.luau');
  for(const profile of ['citizen_worker_male','citizen_worker_female','citizen_guard_male','citizen_guard_female',
    'citizen_official_male','citizen_official_female','companion_clergy_male','companion_clergy_female']) {
    assert.ok(pose.includes(profile+' = {'), '직업 복식 누락: '+profile);
  }
  for(const name of ['hair_buzzed','hair_buzzedfemale','male_ranger_acc_pauldron','female_ranger_acc_pauldrons',
    'male_ranger_head_hood','female_ranger_head_hood']) {
    assert.ok(pose.includes('"'+name+'"'), '기등록 복식 자산 누락: '+name);
  }
  assert.match(pose,/NPC_PROFESSION_LOOK\[outfit\.profession\]/);
  assert.match(pose,/look = "companion_clergy"/);
  assert.match(pose,/model:SetAttribute\("NpcAssetProfile", look \.\. "_" \.\. outfit\.gender\)/);
  // [오너 파티 전용] 복식 원본은 Pose·항구에 보존하고 탐험에는 3D 동료를 만들지 않는다.
  assert.match(field,/local party = if type\(opts\.allies\) == "table"/);
  assert.match(field,/ui\.portrait = opts\.allyPortraits and opts\.allyPortraits\[member\.id\]/);
  assert.doesNotMatch(field,/local knownFemale = id == "c_merian"|Pose\.createR15\(folder, pos0/);
  assert.match(field,/for _, subject in folder:GetChildren\(\) do[\s\S]*?subject:GetAttribute\("NpcAppearanceState"\) ~= "ready"/);
  assert.match(port,/profession = c\.role/);
  assert.match(port,/c\.id == "t_nun" or c\.id == "t_bhikkhuni"/);
  assert.match(pose,/skin:ScaleTo\(ratio\)/);
  assert.match(pose,/weld\.Part0, weld\.Part1, weld\.Parent = target, part, part/);
});

// [주민·동료 복식 3차] 선원/장인과 기존 헤어 스타일 일치·초기 로딩·성별 오분류 방지.
test('선원·장인 직업별 실물 복장과 여성 헤어 스타일을 원본 R15 메시에서 선택한다',()=>{
  const pose=read('ReplicatedStorage/Shared/Pose.luau');
  const loader=read('ServerScriptService/AssetLoader.server.luau');
  const port=read('ReplicatedStorage/Shared/PortScene.luau');
  const field=read('ReplicatedStorage/Shared/FieldScene.luau');
  for(const name of ['citizen_sailor_male','citizen_sailor_female','citizen_artisan_male','citizen_artisan_female']) {
    assert.ok(pose.includes(name+' = {'),'선원/장인 3D 복식 누락: '+name);
  }
  for(const career of ['fisher = "sailor"','sailor = "sailor"','smith = "artisan"','tailor = "artisan"','shipwright = "artisan"']) {
    assert.ok(pose.includes(career),'직업별 복식 연결 누락: '+career);
  }
  assert.match(pose,/model:SetAttribute\("NpcHairStyle", outfit\.hair\)/);
  assert.match(pose,/model:SetAttribute\("NpcHairTint", outfit\.hairColor\)/);
  assert.match(pose,/elseif femaleLong and hairstyle == "long" then/);
  assert.match(pose,/elseif femaleLong and hairstyle == "bun" then/);
  assert.match(pose,/if hair and faded then 0\.90/, '무채색 헤어만 복구');
  assert.doesNotMatch(pose,/elseif hair and model:GetAttribute\("NpcHairTint"\) then 0\.45/, '유색 원본 헤어 중복 착색 금지');
  for(const mesh of ['hair_long','hair_simpleparted','hair_buzzed','hair_buzzedfemale']) {
    assert.ok(loader.includes('["People/'+mesh+'"] = true'),'로더 우선순위 누락: '+mesh);
  }
  assert.doesNotMatch(port,/or c\.id == "t_purser"/);
  assert.doesNotMatch(field,/or id == "t_purser"/);
  assert.match(pose,/model:SetAttribute\("RigType", "R15"\)/);
  assert.match(pose,/part\.CanCollide, part\.CanTouch, part\.CanQuery = false, false, false, false/);
});

// [항구 7구획 확장] 기존 경제/자산 정본을 유지하며 왕궁 경기병/창고/식료품/직업 모션을 검사한다.
test('왕궁 경기병 2명과 지역별 창고·식료품·직업 모션은 순수 시각화로 유지된다',()=>{
 const port=read('ReplicatedStorage/Shared/PortScene.luau');
 const pose=read('ReplicatedStorage/Shared/Pose.luau');
 assert.match(port,/for i, side in \{ -1, 1 \} do[\s\S]*?RoyalLightCavalry_/);
 assert.match(port,/if AssetIds\["Animals\/horse"\] then importedModel\(folder, "Animals", "horse"/);
 assert.match(port,/folder:SetAttribute\("RoyalLightCavalryVisible", cavalryVisible\)/);
 assert.match(port,/folder:SetAttribute\("RoyalLightCavalryMounted", mountedVisible\)/);
 assert.match(port,/elseif w\.mode == "royal_rider" then/);
 assert.match(port,/MarketFoodShop_/);
 assert.match(port,/HarborWarehouseGoods_/);
 assert.match(port,/cargo:SetAttribute\("ShowcaseOnly", true\)/);
 assert.match(port,/key == "japan" or key == "china" or key == "korea"/);
 for(const name of ['harvest','weigh','milk','kneel','fold']){
  assert.ok(pose.includes('elseif kind == "'+name+'" then'),'새 작업 모션 누락: '+name);
  assert.ok(port.includes('"'+name+'"'),'항구 작업 배치 누락: '+name);
 }
 assert.match(port,/local visibleCap = if game:GetService\("UserInputService"\)\.TouchEnabled then 6 else 12/);
 assert.match(port,/local courtStaff = PortBuildings\.royalPopulation/);
});

// [경제-건축 연결] 기존 SimCity형 예산/수요 엔진과 시각 필지 키를 연결한다. 구매·저장 기능은 아직 미도입.
test('자동 경제발전 건축 필지는 기존 경제 수요를 읽고 미래 수동 건축 키를 보존한다',()=>{
  const port=read('ReplicatedStorage/Shared/PortScene.luau');
  const econ=read('ReplicatedStorage/Shared/Economy.luau');
  assert.match(econ,/function E\.buildingTargets\(t\)/);
  assert.match(econ,/function E\.stepBuildings\(t, budget\)/);
  assert.match(econ,/E\.stepBuildings\(t, math\.min\(t\.treasury, tax \* 0\.5\)\)/);
  assert.match(port,/CityBuildingMode", "AUTO_VISUAL_READ_ONLY"/);
  assert.match(port,/CityConstructionCanPurchase", false/);
  assert.match(port,/SetAttribute\("BuildPlotId"/);
  assert.match(port,/SetAttribute\("BuildState", "vacant"\)/);
  assert.match(port,/SetAttribute\("BuildState", "constructing"\)/);
  assert.match(port,/SetAttribute\("BuildState", "complete"\)/);
  assert.match(port,/SetAttribute\("BuildEconomicCount", count\)/);
  assert.match(port,/info\.portId \.\. ":harbor:" \.\. plot\.id/);
  assert.match(port,/info\.portId \.\. ":royal:main"/);
  assert.match(port,/local function fillRow\(z, t, xStart, side, laneIndex, rowIndex\)/);
  assert.match(port,/SetAttribute\("BuildAuthority", "VISUAL_ONLY"\)/);
});

// [대형 농업 구획] 경제 건설량과 가축 수는 그대로 두고 대형 농촌 부지만 렌더링한다.
test('실제 농장 320x220과 목장 260x208은 도로·왕궁을 피해 분리되고 모바일 가벼운 에셋으로 제한된다',()=>{
  const port=read('ReplicatedStorage/Shared/PortScene.luau');
  const buildings=read('ReplicatedStorage/Shared/PortBuildings.luau');
  assert.match(buildings,/B\.RuralPlots = \{/);
  for (const property of ['pastureHalfX = 130','pastureHalfZ = 104','pigHalfX = 88','pigHalfZ = 72',
    'cropWidth = 320','cropDepth = 220','penSpacing = 280','groundWidth = 700',
    'maxCropRowsTouch = 6','cropColumnsTouch = 7']) assert.ok(buildings.includes(property),property);
  assert.match(port,/local rural = PortBuildings\.RuralPlots/);
  assert.match(port,/grass:SetAttribute\("BuildPlotId", info\.portId \.\. ":pasture:" \.\. i\)/);
  assert.match(port,/soil:SetAttribute\("BuildPlotId", info\.portId \.\. ":farmland:" \.\. i\)/);
  assert.match(port,/local xSections = math\.ceil\(halfX \* 2 \/ rural\.fenceSegmentMax\)/);
  assert.match(port,/local zSections = math\.ceil\(halfZ \* 2 \/ rural\.fenceSegmentMax\)/);
  assert.match(port,/local grazeCount = if farmCount then math\.clamp\(2 \+ math\.floor\(math\.sqrt\(math\.max\(0, farmCount\)\) \/ 5\), 2, 7\)/);
  assert.match(port,/local columns = if touch then rural\.cropColumnsTouch else rural\.cropColumnsDesktop/);
  assert.match(port,/FarmIrrigationChannel/);
  assert.match(port,/EconomicFarmCount/);
  assert.match(port,/BuildAuthority", "VISUAL_ONLY"/);
});

// [경제 연동 자동 공사 + 단계 장식] 기존 경제 지출·시설 수가 있을 때만 시각 공사/장식을 만든다.
test('경제 공사 종류·건축자 모션·도시 장식 성장 모두 기존 경제 원본을 읽는다',()=>{
 const scene=read('ReplicatedStorage/Shared/PortScene.luau');
 const plan=read('ReplicatedStorage/Shared/PortBuildings.luau');
 const server=read('ServerScriptService/Services/Econ.luau');
 assert.match(server,/construction\.active = construction\.spending > 0\.01 and needed > 0\.01/);
 assert.match(scene,/local liveConstruction = info\.sim and info\.sim\.construction/);
 assert.match(scene,/if \(tonumber\(liveConstruction\[id\]\) or 0\) > 0\.01 then/);
 assert.match(scene,/local i = activeSites\[slot\]/);
 assert.match(scene,/mark:SetAttribute\("EconomicConstructionSpending"/);
 assert.match(scene,/mark:SetAttribute\("EconomicConstructionNeed"/);
 assert.match(scene,/"stoop" else "hammer"/);
 assert.match(scene,/"carry", 1\.7, \{ role = "Barbarian", hat = "cap" \}/);
 const carryPose=read('ReplicatedStorage/Shared/Pose.luau');
 const carryBlock=carryPose.slice(carryPose.indexOf('if kind == "carry" then'),carryPose.indexOf('elseif kind == "look" then',carryPose.indexOf('if kind == "carry" then')));
 assert.ok(carryBlock.includes('set(m.waist, A(if moving then 0.16 else 0.10, 0, 0))'));
 assert.ok(carryBlock.includes('set(m.neck, A(if moving then -0.08 else -0.04, 0, 0))'));
 assert.doesNotMatch(carryBlock,/set\(m\.(?:leftLeg|rightLeg|leftKnee|rightKnee|leftAnkle|rightAnkle|root),/);
 assert.match(plan,/function B\.decorativeVisual\(level, buildings, prosperity\)/);
 assert.match(plan,/count >= 12 and healthy/);
 for(const kind of ['market','religious','farm','industry','civic']) assert.ok(plan.includes(kind + ' = grade('),kind);
 assert.match(scene,/local decor = PortBuildings\.decorativeVisual\(lvl, info\.sim and info\.sim\.buildings, info\.sim and info\.sim\.prosperity\)/);
 assert.match(scene,/local decorLimit = if identity then \(if touchDecor then 4 else 6\) else \(if touchDecor then 7 else 13\)/);
 assert.match(scene,/CityGrowthDecoration_/);
 assert.match(scene,/CityDecorationGrowthMode", "ECONOMY_READ_ONLY"/);
 assert.match(scene,/obj:SetAttribute\("BuildAuthority", "VISUAL_ONLY"\)/);
});

// [자동 발전 3D 설치 모션] 경제 건축 시공 단계, 새 장식 설치, 기존 필지/저장 불변 보장.
test('발전도 해금 장식은 단계적으로 설치되고 기존 완공물은 입항 때마다 재시공하지 않는다',()=>{
 const scene=read('ReplicatedStorage/Shared/PortScene.luau');
 const config=read('ReplicatedStorage/Shared/PortBuildings.luau');
 assert.match(scene,/local TweenService = game:GetService\("TweenService"\)/);
 assert.match(scene,/local lastDecorationGrowth = \{\}/);
 assert.match(scene,/local function importedModel\(parent, kind, asset, bottomPosition, desiredSize, solid, tint, buildDelay\)/);
 assert.match(scene,/piece\.part\.CFrame = piece\.final \+ Vector3\.new\(0, -drop, 0\)/);
 assert.match(scene,/TweenService:Create\(piece\.part, timing, \{ CFrame = piece\.final, Transparency = piece\.alpha \}\):Play\(\)/);
 assert.match(scene,/piece\.part\.CanCollide = piece\.solid/);
 assert.match(scene,/if not m\.Parent or not parent\.Parent then return end/);
 assert.match(scene,/phase >= 1 then importedModel\(folder, "Town", "floor_base", at, 13, false, nil, 0\.14\)/);
 assert.match(scene,/phase >= 2 then importedModel\(folder, "Town", "kenney_wood_wall_01",/);
 assert.match(scene,/phase >= 3 then importedModel\(folder, "Town", "kenney_roof_straight_red_01",/);
 assert.match(scene,/local newGrade = previousDecor and tier > \(previousDecor\[d\.kind\] or 0\)/);
 assert.match(scene,/if info\.sim and info\.sim\.buildings then lastDecorationGrowth\[info\.portId\] = decor end/);
 assert.match(scene,/CityDecorationScaffold/);
 assert.match(scene,/worker:SetAttribute\("Job", profession\)/);
 assert.match(scene,/duty\.kind = "inspect"/);
 for(const tier of ['residential','harbor'])assert.match(config,new RegExp(tier+' = grade\\('));
 assert.match(scene,/CityGrowthDecoration_residential/);
 assert.match(scene,/CityGrowthDecoration_harbor/);
 assert.match(scene,/CityDecorationInstalledThisVisit/);
 assert.match(scene,/CityDecorationBuilders/);
 assert.match(scene,/local animationLimit = if touchDecor then 3 else 6/);
 assert.match(scene,/local builderLimit = math\.min\(availableBuilders,/);
 assert.match(scene,/BuildAuthority", "VISUAL_ONLY"/);
});



// [장식 시공 생명주기] 모든 구역의 신규 해금 장식에 동일한 임시 작업 현장을 적용한다.
test('주거·항만·공방·행정·시장 장식은 실제 신규 단계에서만 시공하고 목수·비계를 정리한다',()=>{
 const scene=read('ReplicatedStorage/Shared/PortScene.luau');
 const start=scene.indexOf('local function stageDecoration(item, site, buildDelay)');
 const end=scene.indexOf('-- 도시마다 고정된 지형 시드',start);
 assert.ok(start>0&&end>start,'기존 densify 내부의 단일 장식 시공 책임 함수');
 const stage=scene.slice(start,end);
 assert.match(stage,/item:GetAttribute\("BuildVisualState"\) ~= "installing"/);
 assert.match(stage,/item:SetAttribute\("BuildState", "constructing"\)/);
 assert.match(stage,/item:SetAttribute\("BuildState", "complete"\)/);
 assert.match(stage,/scaffold.Name = "CityDecorationScaffold"/);
 assert.match(stage,/scaffold:SetAttribute\("BuildAuthority", "VISUAL_ONLY"\)/);
 assert.match(stage,/worker:SetAttribute\("Activity", kind\)/);
 assert.match(stage,/for index = 1, teamSize do/);
 assert.match(stage,/member\.duty\.kind = "inspect"/);
 assert.match(stage,/member\.model:Destroy\(\)/);
 assert.match(stage,/scaffold:Destroy\(\)/);
 assert.match(stage,/while item.Parent and not folder.Parent/);
 for(const call of [
  'stageDecoration(prop, at + Vector3.new(13, 0, face * 11), delay)',
  'stageDecoration(detail, placeAt, delay)',
  'stageDecoration(obj, Vector3.new(cx + row[4], 0, cz + row[5]), delay)',
  'stageDecoration(warehouseDisplay, Vector3.new(-31, 0, 222), delay)',
 ]) assert.ok(scene.includes('if newGrade then '+call) || scene.includes(call),'신규 해금 장식 미연결: '+call);
 assert.equal((scene.match(/stageDecoration\(/g)||[]).length,5,'4개 배치 경로+단일 책임 함수');
 assert.match(scene,/local decorLimit = if identity then \(if touchDecor then 4 else 6\) else \(if touchDecor then 7 else 13\)/);
 assert.match(scene,/local builderLimit = math\.min\(availableBuilders,/);
 assert.match(scene,/if info\.sim and info\.sim\.buildings then lastDecorationGrowth\[info\.portId\] = decor end/);
});

// [마을 시설 건물 정체성] 학자·주점·서고 등 동일 주택 외형 회귀를 차단한다.
test('마을 7개 시설은 승인된 건축물과 업종별 실물 구조로 구분한다',()=>{
 const scene=read('ReplicatedStorage/Shared/PortScene.luau');
 const ids=read('ReplicatedStorage/Shared/AssetIds.luau');
 const client=read('StarterPlayer/Game.client.luau');
 const start=scene.indexOf('-- 시설 건물: { 이름, 탭, 위치, 크기, 벽색 }');
 const end=scene.indexOf('-- 조선소:', start);
 assert.ok(start>=0&&end>start,'기존 시설 건물 배치 영역');
 const facilities=scene.slice(start,end);
 for(const [name,tab] of [
  ['교역소','trade'],['주점','board'],['항만청','route'],['은행','harbor'],
  ['상인 길드','market'],['학자의 서재','tech'],['도서관 (도감)','codex']
 ]) {
  assert.ok(facilities.includes('name = "'+name+'", tab = "'+tab+'"'),name+' 현재 시설 탭');
  assert.ok(client.includes('{ id = "'+tab+'", name = '),name+' 연결 탭이 실제 메뉴에 존재해야 함');
  assert.ok(facilities.includes('f.name == "'+name+'"'),name+' 독립된 건축 외관');
 }
 assert.match(facilities,/signatureAsset = if localArchitecture then nil/);
 assert.match(facilities,/signature:SetAttribute\("FacilityIdentity", f.tab\)/);
 assert.match(facilities,/local body = \(signature and signature:FindFirstChildWhichIsA\("BasePart", true\)\)/);
 assert.match(facilities,/or house\(folder, f.pos, f.w \* grow, f.d \* grow, visualFloors, style, rng, tone\)/);
 assert.match(facilities,/style.kit == "eastasia"/);
 assert.match(facilities,/localArchitecture/);
 for(const [group,asset] of [
  ['Town','quaternius_large_square_tower'],['Town','temple-stone'],['Town','overhang'],
  ['Town','chimney'],['Town','quaternius_watch_tower_wroof'],['Naval','flag-high'],
  ['Town','kenney_grey_arch_01'],['Town','kenney_wood_arch_01'],
  ['Town','quaternius_wall_entrance_bricks'],['Interior','bookcaseclosed'],
  ['Interior','bookcaseopenlow'],['Relics','journal-open'],['Relics','magnifying-glass']
 ])assert.ok(ids.includes('["'+group+'/'+asset+'"]'),group+'/'+asset+' 기존 등록 자산');
 assert.match(facilities,/prompt\(folder, Vector3.new\(f.pos.X, 3, doorZ\), f.name, "들어가기", f.tab, onFacility\)/);
 assert.match(facilities,/villager\(folder, Vector3.new\(f.pos.X \+ 3, 0, doorZ\)/);
 assert.doesNotMatch(facilities,/Instance\.new\("(?:Part|MeshPart|WedgePart)"\)/);
});

 
// [시설별 실제 경제-건축 발전] 건축 수량과 항구 단계에 따른 1~5단계 자동 증축.
test('마을 7개 시설은 실제 건설 수량·번영도·항구 발전도에 따라 독립 증축된다',()=>{
 const scene=read('ReplicatedStorage/Shared/PortScene.luau');
 const client=read('StarterPlayer/Game.client.luau');
 const economy=read('ReplicatedStorage/Shared/Economy.luau');
 const begin=scene.indexOf('-- 시설 건물: { 이름, 탭, 위치, 크기, 벽색 }');
 const end=scene.indexOf('-- 조선소:', begin);
 assert.ok(begin>=0&&end>begin);
 const facilities=scene.slice(begin,end);
 for(const [name,key] of [
  ['교역소','market'],['주점','tavern'],['항만청','dock'],['은행','market'],
  ['상인 길드','warehouse'],['학자의 서재','school'],['도서관 (도감)','school']
 ]) {
  const line=facilities.split('\n').find(x=>x.includes('name = "'+name+'", tab = '));
  assert.ok(line&&line.includes('economy = "'+key+'"'),name+' 경제 시설 연계');
  assert.ok(economy.includes('id = "'+key+'"'),key+' 기존 세계경제 건축물');
 }
 // [오너 지시] 외형은 시뮬 발전 단계가 정하고, 플레이어 투자는 시뮬 단계보다 높을 때만 최대 +1 보조한다.
 assert.match(scene,/local simStage = math\.clamp\(math\.floor\(info\.sim\.stage\), 1, 5\)/);
 assert.match(scene,/local investBonus = if sceneLevel > simStage then 1 else 0/);
 assert.match(scene,/sceneLevel = math\.clamp\(simStage \+ investBonus, 1, 5\)/);
 for(const threshold of ['count >= 16 then 5','count >= 9 then 4','count >= 4 then 3','count >= 1 then 2']) {
  assert.ok(facilities.includes(threshold),'실제 수량 증축 경계 '+threshold);
 }
 assert.match(facilities,/local facilityTier = math\.min\(sceneLevel, builtTier\)/);
 assert.match(facilities,/if info\.sim and \(tonumber\(info\.sim\.prosperity\) or 100\) < 90 then/);
 assert.match(facilities,/facilityTier = math\.min\(facilityTier, 4\)/);
 assert.match(facilities,/local lv = facilityTier/);
 assert.match(facilities,/local visualFloors = math\.min\(3, f\.floors/);
 assert.match(facilities,/body:SetAttribute\("FacilityVisualTier", facilityTier\)/);
 assert.match(facilities,/body:SetAttribute\("FacilityEconomyKind", f\.economy\)/);
 assert.match(facilities,/body:SetAttribute\("FacilityEconomicCount", count or 0\)/);
 assert.match(facilities,/body:SetAttribute\("BuildAuthority", "VISUAL_ONLY"\)/);
 assert.match(client,/bld\.tavern or 0/);
 assert.match(client,/if \(tonumber\(sim and sim\.prosperity\) or 100\) >= 90 then "P1" else "P0"/);
 assert.match(facilities,/prompt\(folder, Vector3\.new\(f\.pos\.X, 3, doorZ\), f\.name, "들어가기", f\.tab, onFacility\)/);
 assert.doesNotMatch(facilities,/Instance\.new\("(?:Part|MeshPart|WedgePart)"\)/);
});

// [시설 발전 자동 시공] 실제 경제 건설로 외형 단계가 상승했을 때 한 번만 비계/주민 모션을 표시한다.
test('경제 시설 증축 연출은 발전 시에만 실행되고 재입항과 모바일 한도를 존중한다',()=>{
 const scene=read('ReplicatedStorage/Shared/PortScene.luau');
 const ids=read('ReplicatedStorage/Shared/AssetIds.luau');
 const begin=scene.indexOf('-- [자동 증축 작업] 기존 경제 정본에서 단계가 처음 올라갈 때만 승인된 공사용 실물 메시');
 const end=scene.indexOf('-- 조선소:',begin);
 assert.ok(begin>=0&&end>begin,'시설 시공은 기존 PortScene.build 안');
 const region=scene.slice(begin,end);
 assert.match(scene,/local lastFacilityGrowth = \{\}/);
 assert.match(region,/local previousFacilityGrowth = lastFacilityGrowth\[info\.portId\]/);
 assert.match(region,/currentFacilityGrowth\[f\.name\] = facilityTier/);
 assert.match(region,/facilityTier > previousFacilityGrowth\[f\.name\]/);
 assert.match(region,/and facilityUpgradeAnimations < facilityAnimationCap/);
 assert.match(region,/local facilityAnimationCap = if touchFacility then 1 else 3/);
 assert.match(region,/local facilityBuilderCap = math\.min\(facilityWorkers,/);
 assert.match(region,/if upgrade then/);
 assert.ok(ids.includes('["Terrain/wood-structure"]'),'기등록 실제 시공 비계');
 assert.match(region,/importedModel\(folder, "Terrain", "wood-structure", at\(-14, 4\), 6\.5, false, nil, delay\)/);
 assert.match(region,/scaffold:SetAttribute\("BuildState", "constructing"\)/);
 assert.match(region,/scaffold:SetAttribute\("BuildAuthority", "VISUAL_ONLY"\)/);
 assert.match(region,/local hasWorkers = facilityBuilderCap > facilityUpgradeBuilders/);
 assert.match(region,/builder:SetAttribute\("Job", "construction_worker"\)/);
 assert.match(region,/kind = taskKind, phase = rng:NextNumber\(0, 5\)/);
 assert.match(region,/while builder\.Parent and not folder\.Parent/);
 assert.match(region,/if builder\.Parent then builder:Destroy\(\) end/);
 assert.match(region,/if scaffold\.Parent then scaffold:Destroy\(\) end/);
 assert.match(region,/if info\.sim and info\.sim\.buildings then lastFacilityGrowth\[info\.portId\] = currentFacilityGrowth end/);
 assert.match(region,/folder:SetAttribute\("FacilityUpgradesThisVisit", facilityUpgradeAnimations\)/);
 assert.match(region,/folder:SetAttribute\("FacilityUpgradeMode", "ECONOMY_VISUAL_ONLY"\)/);
 assert.match(region,/if f\.key == "bank" then\s+if facilityTier >= 3 then/);
 assert.match(region,/if facilityTier >= 5 then/);
 assert.match(region,/prompt\(folder, Vector3\.new\(f\.pos\.X, 3, doorZ\), f\.name, "들어가기", f\.tab, onFacility\)/);
 assert.doesNotMatch(region,/Instance\.new\("(?:Part|MeshPart|WedgePart)"\)/);
});

 
// [주민 일과·복식] 기존 R15/경제 소스에 직업별 개인 스케줄과 복식 보정이 적용됐는지 확인.
test('항구 주민은 실제 고용을 넘지 않고 개인별 출퇴근·점심·야경과 등록 복장을 갖는다',()=>{
 const scene=read('ReplicatedStorage/Shared/PortScene.luau');
 const pose=read('ReplicatedStorage/Shared/Pose.luau');
 const ids=read('ReplicatedStorage/Shared/AssetIds.luau');
 for(const key of ['merchant','sailor','guard','craftsman','farmer','fisher','official','laborer','clergy']){
  assert.match(scene,new RegExp('job = "'+key+'"'));
 }
 for(const marker of [
  'remainingJobs[candidate.job] -= 1','wakeAt = duty.wake + shift','marketAt = marketAt',
  'marketEnd = marketEnd','homeAt = homeAt','breakAt = math.min(',
  'routine = if hour >= (w.breakAt or 13)','"night_watch"','"commute"',
  'w.home or w.morning','if t.home then t.home += lift end',
  'w.lastPos = where','SocialInteraction', 'travelOffset'
 ]) assert.ok(scene.includes(marker),'개별 시간표 연결 누락: '+marker);
 for(const marker of ['NPC_PROFESSION_ACCESSORY','NpcClothTint','NpcTrouserTint',
  'clothPersonality','outfit_apron','outfit_sash','Enum.Material.Fabric',
  'NPC_PROFESSION_GEAR[profession]','surface.Color = surface.Color:Lerp(dye:Lerp(Color3.new(1, 1, 1), 0.70), if assetName == "outfit_stole" then 0.16 else 0.27)']){
   assert.ok(pose.includes(marker),'기등록 재단복 디테일 누락: '+marker);
 }
 for(const accessory of ['acc_sailor_headband','acc_guild_badge','acc_feather_hat','acc_pearl_hairpin']){
  assert.ok(ids.includes('["People/'+accessory+'"]'),'허용되지 않은 장신구: '+accessory);
 }
 assert.match(scene,/local livingCount = math\.min\(residents, dayJobCount,/);
 assert.match(scene,/local facilityBuilderCap = math\.min\(facilityWorkers,/);
 assert.match(scene,/local builderLimit = math\.min\(availableBuilders,/);
 assert.match(scene,/facilityBuilderCap - facilityUpgradeBuilders/);
 assert.match(scene,/for index = 1, teamSize do/);
});

// [주민 직업 실물 소지품] 35개 실사용 직업 각각 등록된 입체 도구 1개와 모바일 거리 해제를 검증한다.
test('항구 35개 직업은 등록된 실물 장비를 직접 R15에 착용하고 저상세에서만 숨긴다',()=>{
 const pose=read('ReplicatedStorage/Shared/Pose.luau');
 const assetIds=read('ReplicatedStorage/Shared/AssetIds.luau');
 const loader=read('ServerScriptService/AssetLoader.server.luau');
 const port=read('ReplicatedStorage/Shared/PortScene.luau');
 const professions=pose.match(/local NPC_PROFESSION_LOOK = \{([\s\S]*?)\n\}/)?.[1];
 const equipment=pose.match(/local NPC_PROFESSION_GEAR = \{([\s\S]*?)\n\}/)?.[1];
 assert.ok(professions && equipment,'기존 직업과 원본 장비 직결');
 const jobs=[...professions.matchAll(/\b([a-z_]+)\s*=\s*"(?:worker|artisan|sailor|guard|official)"/g)].map(match=>match[1]);
 const tools=[...equipment.matchAll(/\b([a-z_]+)\s*=\s*\{\s*"((?:Relics|Cargo)\/[^"]+)"/g)]
  .map(match=>({job:match[1],asset:match[2]}));
 assert.equal(jobs.length,35,'기존 직업 35종 보존');
 assert.equal(tools.length,jobs.length,'35직업 장비 누락 불가');
 assert.equal(new Set(tools.map(row=>row.job)).size,35,'중복 직업 장비 매핑 금지');
 assert.ok(new Set(tools.map(row=>row.asset)).size>=21,'실물 원본 모델 다양성');
 for(const job of jobs)assert.ok(tools.some(row=>row.job===job),'장비 없는 주민 직업: '+job);
 for(const {asset} of tools){
  assert.ok(assetIds.includes('["'+asset+'"]'),'등록되지 않은 장비: '+asset);
  assert.ok(loader.includes('["'+asset+'"] = true'),'기존 인입 큐에서 누락: '+asset);
 }
 assert.match(pose,/NPC_PROFESSION_GEAR\[profession\]/);
 // [외부 무료 R15 25종] 등록된 후보만 선택하며 모바일 거리 제한·원본 재질을 유지한다.
 assert.match(pose,/NPC_CC0_WARDROBE\[profession\]/);
 assert.match(pose,/AssetIds\["People\/" \.\. selected\[1\]\]/);
 assert.match(pose,/NpcExternalAccessorySelected/);
 assert.match(pose,/outfit\.profession == "clergy" then/);
 assert.match(pose,/look = "companion_clergy"/);
 assert.match(pose,/AssetIds\[jobGear\[1\]\]/);
 assert.match(pose,/sourceGroup = if jobProp then shelf and shelf:FindFirstChild\(propGroup\) else people/);
 assert.match(pose,/model:FindFirstChild\(slotName\)/);
 assert.match(pose,/if jobProp and UserInputService\.TouchEnabled and detailLimit == 3 then/);
 assert.match(pose,/LocalTransparencyModifier = 1/);
 assert.match(pose,/if string\.sub\(assetName, 1, 7\) == "outfit_" or string\.sub\(assetName, 1, 4\) == "cc0_"/);
 assert.ok(pose.includes('or string.sub(assetName, 1, 4) == "acc_" or string.sub(assetName, 1, 5) == "hair_" or jobProp then'),
  '거리 LOD 복구 시 기존 헤어와 장신구도 다시 표시한다');
 assert.match(pose,/LocalTransparencyModifier = 0/);
 assert.match(pose,/math\.rad\(spec\[9\] or 0\)/);
 assert.match(pose,/elseif not textured and not jobProp and string\.sub\(assetName, 1, 4\) ~= "cc0_" then/);
 assert.match(pose,/if npcOutfit and surface and surfaceHasColorMap\(surface\) then/);
 assert.match(pose,/weld\.Part0, weld\.Part1, weld\.Parent = target, part, part/);
 assert.match(port,/GetAttributeChangedSignal\("MareAssetsReady"\)/);
 assert.match(port,/readyConn:Disconnect\(\)/);
 assert.doesNotMatch(equipment,/Instance\.new\(/,'임시 파트로 도구 대체 금지');
});
// [항구 지리적 빈땅] 기존 주택/경제/저장 키를 유지하면서 지역별 입체 원본만 배치한다.
test('항구 지리적 미개발 필지는 등록된 18종 실물 에셋과 8종 생태 지형으로 채운다',()=>{
 const port=read('ReplicatedStorage/Shared/PortScene.luau');
 const ids=read('ReplicatedStorage/Shared/AssetIds.luau');
 const terrain=port.match(/local openLandAssets = \{([\s\S]*?)\n\t\}/)?.[1];
 assert.ok(terrain,'기존 항구 배치 함수의 원본 지형 팔레트');
 for(const biome of ['arid','wetland','coastal','hillside','bamboo','orchard','fallow','woodland'])
  assert.ok(terrain.includes(biome+' = {'),'지역 생태 누락: '+biome);
 const assets=[...terrain.matchAll(/\{\s*"(Terrain|Naval)"\s*,\s*"([^"]+)"/g)]
  .map(match=>match[1]+'/'+match[2]);
 assert.ok(new Set(assets).size>=18,'항구별 독립 입체 에셋 부족');
 for(const asset of assets)assert.ok(ids.includes('["'+asset+'"]'),'미등록 지형 에셋: '+asset);
 assert.match(port,/local wildernessQuota = math\.min\(/,'모바일·PC 고정 예산');
 assert.match(port,/wildernessTouch then \(\{ 22, 19, 16, 13, 9 \}\)\[lvl\]/);
 assert.match(port,/local fringeBudget = if wildernessTouch then 7 else 13/);
 assert.match(port,/local plotRng = seeded\(plotId \.\. ":geographic-land"\)/);
 assert.match(port,/local fringeRng = seeded\(fringeId \.\. ":geographic-land"\)/);
 assert.match(port,/if not onStreet\(x, half\) and not reserved\(x, z0, half\) then/);
 assert.match(port,/if not onStreet\(x, half\) and not reserved\(x, z, half\) then/);
 assert.match(port,/model:SetAttribute\("BuildType", "house"\)/,'기존 미개발 주택 필지 식별자 보존');
 assert.match(port,/model:SetAttribute\("BuildState", "vacant"\)/,'경제 시공 금지');
 assert.match(port,/model:SetAttribute\("BuildAuthority", "VISUAL_ONLY"\)/);
 assert.match(port,/model:SetAttribute\("CityOpenLandBiome", biome\)/);
 for(const key of ['CityOpenLandBaseBiome','CityOpenLandTerrain','CityOpenLandPlots',
 'CityOpenLandDetails','CityOpenLandFringe','CityOpenLandRejected','CityOpenLandMode'])
  assert.ok(port.includes('folder:SetAttribute("'+key+'"'),'지리 QA 누락: '+key);
 assert.match(port,/UndevelopedFringe_/,'도시 외곽 미개발지 실제 피복');
 assert.match(port,/model\.Name = "Undeveloped_" \.\. spec\[2\]/);
 assert.doesNotMatch(terrain,/Instance\.new\("Part"\)/,'임시 도형 자산 금지');
 assert.ok(!port.slice(port.indexOf('-- [지리적 미개발지]'),port.indexOf('-- [도시 전체 외곽')).includes('SetAsync('),
  '경제/저장 쓰기 금지');
});
// [원본 머리 6종 + 액세서리 5종] 실제 3D 원본 증빙, 등록 후 역할별 장착, R15 관절·저장 불변.
test('주민·동료 새 머리와 액세서리는 원본 11종이 검증되고 등록된 경우에만 정밀 장착된다',async()=>{
 const pose=read('ReplicatedStorage/Shared/Pose.luau');
 const loader=read('ServerScriptService/AssetLoader.server.luau');
 const port=read('ReplicatedStorage/Shared/PortScene.luau');
 const field=read('ReplicatedStorage/Shared/FieldScene.luau');
 const names=[
  'hair_braided_crown','hair_low_bun','hair_sailor_ponytail',
  'hair_side_braid','hair_shoulder_waves','hair_court_curls',
  'acc_sailor_headband','acc_pearl_hairpin','acc_ribbon_bow',
  'acc_feather_hat','acc_guild_badge'
 ];
 const crypto=await import('node:crypto');
 for(const name of names){
  const f='roblox-games/mare-essentia/assets/people/'+name+'.glb';
  assert.ok(fs.existsSync(f),'원본 GLB 누락: '+name);
  const raw=fs.readFileSync(f);
  const license=JSON.parse(readText(f+'.license.json'));
  const gitSha=crypto.createHash('sha1').update('blob '+raw.length+String.fromCharCode(0)).update(raw).digest('hex');
  assert.equal(license.license,'CC0-1.0',name+' 무료 사용 승인');
  assert.equal(license.sourceSizeBytes,raw.length,name+' 원본 크기');
  assert.equal(license.sourceGitBlobSha1,gitSha,name+' 원본 해시 증빙');
  assert.equal(raw.subarray(0,4).toString('ascii'),'glTF',name+' GLB 형식');
  assert.ok(loader.includes('["People/'+name+'"] = true'),name+' 기존 자산 선적 우선순위');
  assert.ok(pose.includes('"'+name+'"'),name+' 역할별 복식 연결');
 }
 for(const role of [
  'citizen_male','citizen_female','citizen_guard_female','citizen_official_male','citizen_official_female',
  'citizen_sailor_female','citizen_artisan_female','companion_male','companion_female'
 ])assert.ok(pose.includes(role+' = {'),role+' 남녀·직업 원본 보존');
 assert.match(pose,/local NPC_REGISTERED_HAIR = \{/);
 assert.match(pose,/local NPC_REGISTERED_ACCESSORY = \{/);
 // [런타임 실물 로드] 등록번호만 있는 헤어를 장착하면 공백 머리/중복 머리가 발생한다.
 assert.ok(pose.includes('if candidate and AssetIds["People/" .. candidate] and people and people:FindFirstChild(candidate) then'),
  "등록번호뿐 아니라 실제 선적된 헤어가 선택되어야 한다");
 assert.ok(pose.includes('slotName = "R15Asset_" .. string.gsub(assetName, "/", "_") .. "_" .. boneName'),
  "선택된 최종 실물 헤어 ID로 슬롯을 정해야 한다");
 assert.ok(pose.includes('previous.Name ~= slotName then previous:Destroy()'),
  "교체 실물 헤어 장착 후 구형 메시를 정리해야 한다");
 assert.ok(pose.includes('local mounted = model:FindFirstChild("R15Asset_" .. wanted .. "_UpperTorso")'),
  "현재 시즌 겉옷 준비 전 기존 복식 제거 금지");
 assert.match(pose,/-- \[주민 기본복 유지\] 원본 peasant\/ranger 몸체 GLB는 팔 소매와 등·옆면까지 포함한다\./);
 assert.match(pose,/if accessory and AssetIds\["People\/" \.\. accessory\[1\]\] then/);
 assert.match(pose,/specs = table\.clone\(specs\)/);
 assert.match(pose,/target\.Size\.X \* \(spec\[7\] or 0\)/);
 assert.match(pose,/local hairOffsetZ = spec\[8\] or 0/, '기존 액세서리 깊이 오프셋 기본값 보존');
 assert.match(pose,/target\.Size\.Z \* \(if beard then -0\.42 else hairOffsetZ\)/, '수염 전방 위치와 보정된 헤어 오프셋 적용');
 assert.match(pose,/if hairStyle == "short" and crownY - ext\.Y \/ target\.Size\.Y < 0\.20 then[\s\S]*?hairOffsetZ \+= math\.clamp\(frontOverlap, 0, 0\.18\)/, '눈을 가리는 짧은 헤어에만 깊이 보정');
 assert.match(pose,/skin:ScaleTo\(ratio\)/);
 assert.match(pose,/weld\.Part0, weld\.Part1, weld\.Parent = target, part, part/);
 assert.match(pose,/part\.Anchored, part\.CanCollide, part\.CanTouch, part\.CanQuery = false, false, false, false/);
 assert.match(pose,/model:SetAttribute\(if npcOutfit then "NpcAppearanceState" else "MobAppearanceState"/);
 assert.match(port,/string\.sub\(asset\.Name, 1, 4\) == "acc_"/);
 assert.match(field,/peopleGroup\.ChildAdded:Connect\(function\(asset\)/);
 assert.doesNotMatch(pose,/rbxassetid:\/\/[0-9]+/);
});


// [실제 빌드] 저장소 원본은 절대 변형하지 않고 임시 작업장에 26종을 복사해 GLB/PNG/UV를 완전 생성한다.
test('대항해시대 26종 PBR은 실제 원본에서 안전하게 제작되고 재실행해도 바뀌지 않는다',async()=>{
  const os=await import('node:os'),path=await import('node:path');
  const {prepareCharacterFinishes}=await import('../tools/mare-essentia-character-finish.mjs');
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'mare-character-finish-'));
  const originals=path.join(folder,'assets','people');
  fs.mkdirSync(originals,{recursive:true});
  const names=[
    'outfit_vest','outfit_coat','outfit_guard','outfit_apron','outfit_sash','outfit_belt',
    'outfit_cuff','outfit_boot','outfit_stole',
    'hair_beard','hair_braided_crown','hair_buns','hair_buzzed','hair_buzzedfemale',
    'hair_court_curls','hair_long','hair_low_bun','hair_sailor_ponytail',
    'hair_shoulder_waves','hair_side_braid','hair_simpleparted',
    'acc_feather_hat','acc_guild_badge','acc_pearl_hairpin','acc_ribbon_bow','acc_sailor_headband',
  ];
  try{
    for(const name of names){
      const original='roblox-games/mare-essentia/assets/people/'+name+'.glb';
      fs.copyFileSync(original,path.join(originals,name+'.glb'));
      if(fs.existsSync(original+'.license.json'))
        fs.copyFileSync(original+'.license.json',path.join(originals,name+'.glb.license.json'));
    }
    const first=await prepareCharacterFinishes(folder);
    assert.equal(first.generated+first.verified,26,'원본 26종 재질 빌드 누락');
    const uniqueColorMaps=new Set();
    for(const name of names){
      const file=path.join(originals,name+'.glb'),bytes=fs.readFileSync(file);
      const proof=JSON.parse(readText(file+'.license.json'));
      const scene=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
      assert.equal(proof.pbrVersion,5,'재질 제작기 강화 누락: '+name);
      assert.equal(proof.pbrDesignProfile,name,'실제 의상별 재질 디자인 누락: '+name);
      assert.equal(proof.sourceSha256,crypto.createHash('sha256').update(bytes).digest('hex'),'해시 오류: '+name);
      assert.ok(scene.images?.length>=3&&scene.textures?.length>=3,'PBR 세 맵 누락: '+name);
      const art=scene.images.find(image=>/^mare_.*_color_256$/.test(image.name));
      assert.ok(art,'고유 컬러맵 이미지 누락: '+name);
      const imageView=scene.bufferViews[art.bufferView],binStart=20+bytes.readUInt32LE(12)+8;
      const colorHash=crypto.createHash('sha256').update(bytes.subarray(
        binStart+imageView.byteOffset,binStart+imageView.byteOffset+imageView.byteLength)).digest('hex');
      assert.ok(!uniqueColorMaps.has(colorHash),'서로 다른 주민 의상이 동일한 컬러맵을 사용함: '+name);
      uniqueColorMaps.add(colorHash);
      for(const primitive of scene.meshes.flatMap(mesh=>mesh.primitives||[])){
        const material=scene.materials[primitive.material];
        assert.ok(Number.isInteger(primitive.attributes.TEXCOORD_0),'UV 누락: '+name);
        assert.ok(material?.normalTexture&&material?.pbrMetallicRoughness?.baseColorTexture
          && material?.pbrMetallicRoughness?.metallicRoughnessTexture,'PBR 바인딩 오류: '+name);
      }
      if(name.startsWith('outfit_')){
        const source=fs.readFileSync('roblox-games/mare-essentia/assets/people/'+name+'.glb');
        const oldStart=20+source.readUInt32LE(12)+8,nowStart=20+bytes.readUInt32LE(12)+8;
        const originalSize=proof.originalGeometryByteLength;
        assert.ok(source.subarray(oldStart,oldStart+originalSize)
          .equals(bytes.subarray(nowStart,nowStart+originalSize)),'원본 복식 삼각형 변경: '+name);
      }
    }
    assert.equal(uniqueColorMaps.size,26,'26종 독립 색상 지도 제작 실패');
    const second=await prepareCharacterFinishes(folder);
    assert.equal(second.generated,0,'PBR 재실행이 중복 생성됨');
    assert.equal(second.verified,26,'PBR 재실행 원본 불일치');
  } finally {fs.rmSync(folder,{recursive:true,force:true});}
});

// [재질 식별] 제작기가 구형 회백색 PBR이 아니라 직조·가죽·금속·모발 각자의 표면 지도를 유지한다.
test('대항해시대 주민 재질은 PBR 금속 채널과 거칠기 차이를 실제 제작 단계에서 구분한다',()=>{
  const generator=readText('tools/mare-essentia-character-finish.mjs');
  assert.match(generator,/const MAP_SIZE = 256;/);
  assert.match(generator,/kind==='fabric'\?238:kind==='leather'\?172:kind==='metal'\?94/);
  assert.match(generator,/kind==='hair'\?169:kind==='feather'\?219:113/);
  assert.match(generator,/kind==='metal'\?255:0/);
  assert.match(generator,/retouchPbr\(original,name,maps,proof\)/);
  assert.match(generator,/\[2,3,4\]\.includes\(proof\.pbrVersion\)/);
  assert.match(generator,/textureSet\(role,name\)/);
  assert.match(generator,/proof\.pbrVersion=5/);
  assert.match(generator,/outfit_guard:'heraldry'/);
  assert.match(generator,/outfit_stole:'brocade'/);
  assert.match(generator,/roughVariation=kind==='fabric'\?20:kind==='leather'\?42:kind==='metal'\?37/);
  assert.match(generator,/kind==='hair'\?31:kind==='feather'\?19:8/);
  assert.match(generator,/MARE_CHARACTER_V3_GEOMETRY_CHANGED/);
  const workflow=readText('.github/workflows/owner-mare-essentia-assets.yml');
  assert.match(workflow,/roblox-games\/mare-essentia\/assets\/people\/\{outfit_\*,hair_\*,acc_\*\}\.glb\*/);
  assert.match(workflow,/SKIP_UNREGISTERED_CHARACTER_PBR/);
});
// [실물 PBR 보존] 기존 26종 재질 업그레이드는 전종 승인·실물 증빙이 함께 반영되어야 한다.
test('대항해시대 의상·헤어·장신구 26종은 UV/PBR 원본과 등록 경로가 일치한다',()=>{
  const names=[
    'outfit_vest','outfit_coat','outfit_guard','outfit_apron','outfit_sash','outfit_belt',
    'outfit_cuff','outfit_boot','outfit_stole','hair_beard','hair_braided_crown','hair_buns',
    'hair_buzzed','hair_buzzedfemale','hair_court_curls','hair_long','hair_low_bun',
    'hair_sailor_ponytail','hair_shoulder_waves','hair_side_braid','hair_simpleparted',
    'acc_feather_hat','acc_guild_badge','acc_pearl_hairpin','acc_ribbon_bow','acc_sailor_headband',
  ];
  const upload=readText('tools/mare-essentia-upload-assets.mjs');
  const maker=readText('tools/mare-essentia-character-finish.mjs');
  assert.match(upload,/await prepareCharacterFinishes\(ROOT\)/);
  assert.match(upload,/characterPbrUpgrade/);
  assert.match(maker,/MARE_CHARACTER_PBR_TOTAL=26/);
  const upgraded=[];
  for(const name of names){
    const base='roblox-games/mare-essentia/assets/people/'+name+'.glb';
    const bytes=fs.readFileSync(base);
    let proof=null;
    try{proof=JSON.parse(readText(base+'.license.json'));}catch{}
    if(![2,3,4,5].includes(proof?.pbrVersion))continue;
    upgraded.push(name);
    const json=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
    assert.equal(proof.sourceSizeBytes,bytes.length,'PBR 원본 크기 불일치: '+name);
    assert.equal(proof.sourceSha256,crypto.createHash('sha256').update(bytes).digest('hex'),'PBR 원본 SHA256 불일치: '+name);
    assert.equal(proof.sourceGitBlobSha1,crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),'PBR 원본 Git SHA1 불일치: '+name);
    assert.ok(proof.pbrColorMap&&proof.pbrNormalMap&&proof.pbrRoughnessMetallicMap,'실제 3중 PBR 맵 누락: '+name);
    assert.equal(json.meshes.flatMap(m=>m.primitives||[]).filter(p=>Number.isInteger(p.attributes.TEXCOORD_0)).length,
      json.meshes.flatMap(m=>m.primitives||[]).length,'UV0 없는 부품: '+name);
    for(const primitive of json.meshes.flatMap(m=>m.primitives||[])){
      const material=json.materials[primitive.material];
      assert.ok(material?.pbrMetallicRoughness?.baseColorTexture && material.pbrMetallicRoughness.metallicRoughnessTexture
        && material.normalTexture,'실제 메시 PBR 누락: '+name);
    }
    assert.ok(json.images?.length>=3,'표면 이미지 누락: '+name);
    for(const image of json.images)assert.equal(image.mimeType,'image/png','표면 형식: '+name);
  }
  // 최초 등록 전 원본 26종은 기존 게임에서 그대로 쓰며, 일부만 바뀐 채 게시되면 실패한다.
  assert.ok(upgraded.length===0||upgraded.length===names.length,
    '캐릭터 재질 26종 일부만 main에 반영됨: '+upgraded.length);
});

// [직접 제작 복식 QA] 실제 GLB 원본·무료 증거·기존 관절 연결 및 모바일 한도 검증.
test('실물 재단복 9종은 실제 GLB 메시와 무료 원본·문화권 R15 장착 근거를 갖는다',()=>{
  const names=['outfit_vest','outfit_coat','outfit_guard','outfit_apron','outfit_sash','outfit_belt','outfit_cuff','outfit_boot','outfit_stole'];
  const pose=read('ReplicatedStorage/Shared/Pose.luau');
  const loader=read('ServerScriptService/AssetLoader.server.luau');
  const field=read('ReplicatedStorage/Shared/FieldScene.luau');
  for(const name of names){
    const file='roblox-games/mare-essentia/assets/people/'+name+'.glb';
    const bytes=fs.readFileSync(file);
    assert.equal(bytes.toString('ascii',0,4),'glTF','3D 원본 바이너리 누락: '+name);
    assert.equal(bytes.readUInt32LE(4),2,'GLB 버전 오류: '+name);
    assert.equal(bytes.readUInt32LE(8),bytes.length,'GLB 크기 오류: '+name);
    assert.equal(bytes.readUInt32LE(16),0x4e4f534a,'GLB JSON 청크 누락: '+name);
    const gltf=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
    assert.equal(gltf.asset.version,'2.0');
    assert.ok(gltf.meshes[0].primitives.length>0 && gltf.meshes[0].primitives.length<=12,'모바일 모델 부품 초과: '+name);
    assert.ok(gltf.materials.length>=4,'원본 복식 소재 구분 누락: '+name);
    // [UV 원본 보존 검증] 원본 메시/법선/인덱스 바이너리는 전부 동일하고, 재질별 UV0만 뒤에 더했다.
    const uvProof=JSON.parse(readText(file+'.license.json'));
    const binOffset=20+bytes.readUInt32LE(12)+8;
    assert.equal(uvProof.uvVersion,1,'UV 갱신 누락: '+name);
    assert.equal(bytes.readUInt32LE(binOffset-4),0x004e4942,'GLB 바이너리 누락: '+name);
    assert.equal(uvProof.sourceSha256,crypto.createHash('sha256').update(bytes).digest('hex'),'UV 원본 해시 오류: '+name);
    assert.equal(uvProof.sourceSizeBytes,bytes.length,'원본 갱신 크기 오류: '+name);
    assert.equal(gltf.accessors.length,uvProof.originalAccessorCount+gltf.meshes[0].primitives.length);
    assert.equal(gltf.bufferViews.length,uvProof.originalBufferViewCount+gltf.meshes[0].primitives.length+(gltf.images?.length||0));
    if([2,3,4,5].includes(uvProof.pbrVersion)){
      assert.ok(gltf.images?.length>=3,'직물·가죽·금속 실제 PNG PBR 맵 누락: '+name);
      for(const source of gltf.images){
        assert.equal(source.mimeType,'image/png','PBR 표면 PNG 형식: '+name);
        assert.ok(gltf.bufferViews[source.bufferView]?.byteOffset>=uvProof.originalGeometryByteLength,'원본 지오메트리 침범: '+name);
      }
      for(const primitive of gltf.meshes[0].primitives){
        const material=gltf.materials[primitive.material];
        assert.ok(material.pbrMetallicRoughness.baseColorTexture&&material.pbrMetallicRoughness.metallicRoughnessTexture
          && material.normalTexture,'복식 부위별 PBR 미적용: '+name);
      }
    }
    assert.equal(crypto.createHash('sha256').update(bytes.subarray(binOffset,binOffset+uvProof.originalGeometryByteLength)).digest('hex'),
      uvProof.originalGeometrySha256,'기존 정점·인덱스·법선 변경 감지: '+name);
    for(const primitive of gltf.meshes[0].primitives){
      const uvIndex=primitive.attributes.TEXCOORD_0;
      assert.ok(Number.isInteger(uvIndex),'원본 재질별 UV0 누락: '+name);
      const uv=gltf.accessors[uvIndex],position=gltf.accessors[primitive.attributes.POSITION];
      assert.equal(uv.type,'VEC2','UV 좌표 형식 오류: '+name);
      assert.equal(uv.componentType,5126,'UV 정밀도 오류: '+name);
      assert.equal(uv.count,position.count,'UV 정점 개수 오류: '+name);
      const view=gltf.bufferViews[uv.bufferView];
      assert.ok(view.byteOffset>=uvProof.originalGeometryByteLength,'원본 메시 바이너리 덮어쓰기: '+name);
      for(let v=0;v<uv.count;v++){
        const at=binOffset+view.byteOffset+v*8;
        const u=bytes.readFloatLE(at),t=bytes.readFloatLE(at+4);
        assert.ok(Number.isFinite(u)&&Number.isFinite(t)&&u>=0&&u<=1&&t>=0&&t<=1,'UV 범위 오류: '+name);
      }
    }
    // [재질 복원 근거] 실제 GLB 프리미티브에 무광 직물·가죽·황동/강철이 구분돼 있어야 한다.
    const sourceMaterials=gltf.meshes[0].primitives.map(p=>gltf.materials[p.material].pbrMetallicRoughness);
    assert.ok(sourceMaterials.some(m=>m.metallicFactor>=0.65),'GLB 원본 금속 재질 누락: '+name);
    assert.ok(sourceMaterials.some(m=>m.metallicFactor<0.1),'GLB 원본 비금속 재질 누락: '+name);
    const proof=JSON.parse(readText(file+'.license.json'));
    const actualSha=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
    assert.equal(proof.sourceGitBlobSha1,actualSha,'원본 메시 SHA-1 오류: '+name);
    assert.equal(proof.license,'CC0-1.0','상업 이용 무료 사용권 누락: '+name);
    assert.ok(proof.triangles>=100 && proof.parts<=12,'3D 지오메트리 부족: '+name);
    assert.ok(pose.includes('"'+name+'"'),'NPC 프로필 실물 복식 누락: '+name);
    assert.ok(loader.includes('["People/'+name+'"] = true'),'기존 People 로더 연결 누락: '+name);
  }
  for(const profile of ['citizen_male','citizen_female','citizen_worker_male','citizen_worker_female',
    'citizen_guard_male','citizen_guard_female','citizen_official_male','citizen_official_female',
    'citizen_sailor_male','citizen_sailor_female','citizen_artisan_male','citizen_artisan_female',
    'companion_male','companion_female','companion_clergy_male','companion_clergy_female'])
    assert.ok(pose.includes(profile+' = {'),'NPC 16종 복식 프로필 누락: '+profile);
  // [재질 회귀] 임포트된 GLB PBR 색상 보존, 실물 색 누락만 보정하고 검게 덮어쓰지 않는다.
  assert.match(pose,/local OUTFIT_SOURCE_MATERIALS = \{/);
  assert.match(pose,/local OUTFIT_PRIMARY_MATERIALS = \{/);
  for(const name of names)
    assert.ok(pose.includes(name+' = { Color3.new('),'원본 주색 누락: '+name);
  assert.match(pose,/if not textured and string\.sub\(assetName, 1, 7\) == "outfit_"/);
  // [선형·감마 색상] 원본 금속/직물은 엄격하게 대조하고 임의 수입색은 덮지 않는다.
  assert.match(pose,/for colorIndex = 1, 3, 2 do/);
  assert.match(pose,/local sourceColor = candidate\[colorIndex\]/);
  assert.match(pose,/if bestError < 0\.0064 then/);
  assert.match(pose,/elseif fallback and \(defaultImportGray or \(color\.R > 0\.80 and color\.G > 0\.80 and color\.B > 0\.80/);
  assert.match(pose,/math\.max\(color\.R, color\.G, color\.B\) - math\.min\(color\.R, color\.G, color\.B\) < 0\.09/);
  // [실물 스크린샷 회귀] 얼굴·치마·허리띠·중첩 상의가 다시 원통/흰 갑옷으로 돌아가지 않도록 고정.
  assert.doesNotMatch(pose,/MareFaceSurface/);
  assert.match(pose,/scalp\.Name = "HairScalp"/);
  // [모자 원본 교체] 헤어는 예비 장식을 숨기고, 깃털모자는 기존 윗면만 남겨 정수리 구멍을 막는다.
  assert.match(pose,/if piece:IsA\("BasePart"\) and piece\.Name == "Hat" then/, '깃털모자 원형만 교체');
  assert.match(pose,/piece\.Transparency = if piece:GetAttribute\("NpcHatCrown"\) == true then 0 else 1/, '모자 정수리 보존');
  assert.match(pose,/hairOffsetY = math\.max\(hairOffsetY, 0\.30 \+ ext\.Y \* 0\.5 \/ target\.Size\.Y\)/, "머리띠 아래 경계가 이마 위에 위치");
  assert.match(pose,/local featherHat = model:FindFirstChild\("R15Asset_acc_feather_hat_Head"\)/);
  assert.match(pose,/if featherVisible then\s+piece\.Transparency = if piece:GetAttribute\("NpcHatCrown"\) == true then 0 else 1\s+else\s+piece\.Transparency = 0/, "실물 모자가 숨겨지거나 교체되면 기존 모자 복원");
  for (const height of [0.1, 0.2, 0.4, 0.8]) {
    const center = Math.max(0.14, 0.30 + height * 0.5);
    assert.ok(center - height * 0.5 >= 0.30 - 1e-9);
  }
  assert.match(pose,/piece\.Transparency = if wornHair or hoodVisible then 1 else 0/, '실물 헤어와 성직자 두건 착용 시 보조모발 숨김');
  // [모델 후보 안전범위] 원래 시각 기준 대신 중앙정책에 허용된 정확한 숫자 범위와 수정을 검증한다.
  const skirt=pose.match(/q\.Size = Vector3\.new\(len, lower\.Size\.X \* ([0-9.]+), lower\.Size\.X \* ([0-9.]+)\)/);
  assert.ok(skirt,'실제 주민 치마 비율 존재');
  assert.ok(Number(skirt[1])>=0.94 && Number(skirt[1])<=1.24,'치마 가로 범위');
  assert.ok(Number(skirt[2])>=0.90 && Number(skirt[2])<=1.18,'치마 깊이 범위');
  assert.match(pose,/local belt = npcOutfit and assetName == "outfit_belt"/);
  // [손목·장화] 허리띠 한도는 보존하고 커프/장화만 별도 비율로 맞춘다.
  const belt=pose.match(/if belt then ([0-9.]+) elseif cuff then 0\.36 elseif boot then 0\.94 elseif beard then 0\.58 else spec\[4\]/);
  assert.ok(belt,'주민 허리띠 스케일 존재');
  assert.ok(Number(belt[1])>=0.24 && Number(belt[1])<=0.50,'허리띠 시각 범위');
  assert.match(pose,/-- \[복식 레이어\] 원본 전신복은 소매·등판·다리천을 담당한다\./);
  assert.doesNotMatch(pose,/if fittedUpperReady and boneName == "UpperTorso"/, "전신복 임의 삭제 금지");
  assert.match(pose,/surfaceHasMaps\(surface\)/);
  assert.match(pose,/s\.MetalnessMap ~= ""/);
  assert.match(pose,/part\.MaterialVariant ~= ""/);
  // [실제 로블록스 Studio 입력 검증] 자산 로더는 9개 복식의 흰색 유실/원본 재질 개수를 계측한다.
  assert.match(loader,/MareOutfitMaterialAudit/);
  assert.match(loader,/outfitWhite == 0/);
  assert.match(loader,/outfitColorMaps >= 9 and outfitNormalMaps >= 9 and outfitRoughnessMaps >= 9/);
  assert.match(loader,/outfitMetalnessMaps >= 1 and outfitMapUnreadable == 0 and #outfitMissing == 0/);
  assert.match(loader,/if not readable then\s+outfitMapUnreadable \+= 1/);
  assert.match(loader,/unreadableMapReads = outfitMapUnreadable, perAsset = outfitMaterialDetails/);
  assert.match(loader,/elseif present then\s+if map == "ColorMap" then outfitColorMaps \+= 1/);
  assert.match(loader,/local importedPeople = library:FindFirstChild\("People"\)/);
  assert.match(pose,/elseif hair or pearlWhite then Enum\.Material\.SmoothPlastic/);
  assert.match(pose,/part\.Material = fallback\[2\]/);
  assert.doesNotMatch(pose,/else Color3\.fromRGB\(96, 79, 65\)/);
  assert.match(pose,/EUROPEAN_DETAIL_CULTURES\[culture\] == true/);
  assert.match(pose,/year >= 1500 and year < 1800/);
  // [모바일 정밀 복식] 모든 남녀 직업은 4종 이상, 고성능 근접 인물은 전체 상세 메시를 유지한다.
  for(const profile of ['citizen_male','citizen_female','citizen_worker_male','citizen_worker_female',
    'citizen_guard_male','citizen_guard_female','citizen_official_male','citizen_official_female',
    'citizen_sailor_male','citizen_sailor_female','citizen_artisan_male','citizen_artisan_female',
    'companion_male','companion_female','companion_clergy_male','companion_clergy_female']){
    const section=pose.match(new RegExp('\\t'+profile+' = \\{\\n([\\s\\S]*?)\\n\\t\\},'));
    assert.ok(section,'복식 프로필 누락: '+profile);
    const kinds=new Set([...section[1].matchAll(/"outfit_([^"]+)"/g)].map(m=>m[1]));
    assert.ok(kinds.size>=4,'모바일 기본 상세 복식 4종 미만: '+profile);
  }
  assert.match(pose,/local detailLimit = 99/);
  assert.match(pose,/mobileDetailFps >= 52 and distance <=/);
  assert.match(pose,/detailLimit = 4/);
  assert.match(pose,/detailLimit = 3/);
  assert.match(pose,/mobileEssentials = \{ outfit_vest = true, outfit_apron = true, outfit_cuff = true \}/);
  assert.match(pose,/part\.LocalTransparencyModifier = 1/);
  assert.match(pose,/part\.LocalTransparencyModifier = 0/);
  assert.match(pose,/Pose\.applyRegisteredMobOutfit\(model, true\)/);
  assert.match(pose,/NpcOutfitNextCheckAt/);
  const port=read('ReplicatedStorage/Shared/PortScene.luau');
  assert.match(port,/string\.sub\(asset\.Name, 1, 7\) == "outfit_"/);
  assert.ok(pose.includes('local slotName = "R15Asset_" .. string.gsub(assetName, "/", "_") .. "_" .. boneName'),'R15 직업 소지품 경로 충돌 방지 슬롯');
  assert.match(pose,/if not textured and string\.sub\(assetName, 1, 7\) == "outfit_"/);
  assert.match(field,/ui\.portrait = opts\.allyPortraits and opts\.allyPortraits\[member\.id\]/);
  assert.match(pose,/weld\.Part0, weld\.Part1, weld\.Parent = target, part, part/);
  assert.match(pose,/part\.CanCollide, part\.CanTouch, part\.CanQuery = false, false, false, false/);
});

// [항구별 3D 랜드마크] 현재 Ports 원본의 모든 항구에 개별 대표경관을 연결한다.
test('모든 항구가 항구별 역사 경관 메시 배치를 갖고 발전도 단계가 유지된다',()=>{
 const scene=read('ReplicatedStorage/Shared/PortScene.luau');
 const ports=read('ReplicatedStorage/Shared/Ports.luau');
 const portSection=ports.slice(ports.indexOf('local Ports:'),ports.indexOf('local Nations:'));
 const portIds=[...portSection.matchAll(/^\t([a-z][a-z0-9_]*)\s*=\s*\{\s*\n\s*id = /gm)].map(row=>row[1]);
 const sigIds=new Set([...scene.matchAll(/\bSIG\.([a-z][a-z0-9_]*)\s*=/g)].map(row=>row[1]));
 assert.ok(portIds.length>=181,'기존 항구 데이터가 유지돼야 한다');
 assert.deepEqual(portIds.filter(id=>!sigIds.has(id)),[],'개별 랜드마크가 없는 항구');
 assert.match(scene,/local list = SIG\[info\.portId\]/);
 assert.match(scene,/if sceneLevel < 3 then/);
 assert.match(scene,/if sceneLevel == 2 then/);
 assert.match(scene,/if list then/);
 assert.match(scene,/local function placeSignature\(folder, info\)/);
 assert.match(scene,/SIG\.tainan = cat\(one\("Town", "eastasia-base"/);
 assert.match(scene,/one\("Town", "eastasia-roof", 28, -9, 0, 11\)/);
});

// [건축·가축 재질] 원본 색상맵이 있을 때 색을 한 번만 반영하고 무텍스처 모델만 재질을 보완한다.
test('항구·탐험 가축은 양털·가죽·피부를 구별하고 원본 PBR 색 중복을 막는다',()=>{
 const port=read('ReplicatedStorage/Shared/PortScene.luau');
 const field=read('ReplicatedStorage/Shared/FieldScene.luau');
 const cultures=read('ReplicatedStorage/Shared/PortCultures.luau');
 for(const [name,scene] of [['항구',port],['탐험',field]]){
  const start=scene.indexOf('if textured and not detail then');
  const stop=scene.indexOf('elseif not textured and not sa',start);
  assert.ok(start>0&&stop>start,name+' 가축 자연 재질 처리 경로');
  const block=scene.slice(start,stop);
  assert.match(block,/if sa and surfaceHasColorMap\(sa\) then/);
  // [원본 맵 불변] 색상지도/PBR은 재착색하지 않고, 색 유실된 무텍스처 몸통만 복구한다.
  assert.doesNotMatch(block,/if sa and surfaceHasColorMap\(sa\) then\s+sa\.Color\s*=/,'원본 PBR 색상지도 변경 금지');
  assert.match(block,/elseif not textured and not detail then/);
  assert.match(block,/local faded = high - low <= 0\.14 and high >= 0\.58/);
  assert.match(block,/if not sa then\s+[pd]\.Material =/);
  assert.match(block,/Enum\.Material\.Fabric/);
  assert.match(block,/Enum\.Material\.Leather/);
  assert.match(block,/Enum\.Material\.Concrete/);
  assert.match(block,/Enum\.Material\.SmoothPlastic/);
  assert.match(block,/if not sa then/);
  assert.doesNotMatch(block,/Lerp\(tint, 0\.24\)/,'PBR 색 중복 혼합 복원 금지');
 }
 assert.match(port,/local textured = sa ~= nil or p\.MaterialVariant ~= ""/);
 assert.match(port,/if not textured then[\s\S]*?p\.Material = selected/);
 for(const name of ['Plaster','ClayRoofTiles','RoofShingles','WoodPlanks','Limestone']){
  assert.ok(port.includes('Enum.Material.'+name)||cultures.includes('Enum.Material.'+name),'건축 재질 누락 '+name);
 }
 assert.match(cultures,/STYLE\.iberia\.mat, STYLE\.italy\.mat/);
 assert.match(cultures,/Enum\.Material\.ClayRoofTiles/);
 assert.match(cultures,/Enum\.Material\.Plaster/);
 assert.match(cultures,/Enum\.Material\.RoofShingles/);
 // [동물 발바닥/목초지] 충돌 없는 표면도 접지 질의에만 사용하고 원본 높이·애니메이션 정보를 보존한다.
 assert.match(port,/animalGround\.FilterType = Enum\.RaycastFilterType\.Include/);
 assert.match(port,/animalGround\.FilterDescendantsInstances = animalFloors/);
 assert.match(port,/grass\.CanQuery = true/);
 assert.match(port,/local visibleBottomY = math\.huge/);
 assert.match(field,/local visibleBottomY = math\.huge/);
 assert.match(port,/AnimalMotionRig/);
 // [실제 사지 보행] 한 다리의 무릎·발목을 별개 다리로 세지 않는다.
 assert.match(port,/local legGroups, legCount = \{\}, 0/);
 assert.match(port,/if limb\.group and not legGroups\[limb\.group\] then/);
 // 전체 가축의 좌우 본 축, 다리 수, 분리된 정강이/발굽 공통 회전점 회귀.
 assert.match(port,/rigRight = rigForward:Cross\(Vector3.yAxis\).Unit/);
 assert.match(port,/if limb.legChild then 0 else pitch \* legSwingScale/);
 assert.match(port,/local biped = species == "chicken" or species == "duck"/);
 assert.match(port,/local requiredLegs = if biped then 2 else 4/);
 assert.match(field,/local requiredLegs = if biped then 2 else 4/);
 assert.match(port,/local canWalk = legCount == requiredLegs/);
 assert.match(field,/local canWalk = facingKnown and legCount == requiredLegs/);
 assert.match(port,/pivot \* CFrame.new\(limb.legHinge\) \* limb.pose \* CFrame.new\(-limb.legHinge\) \* limb.base/);
 assert.match(field,/pitch = if limb.legChild then 0 else math.sin\(a.step \+ limb.phase\)/);
 assert.match(field,/pivot \* CFrame.new\(limb.legHinge\) \* CFrame.fromAxisAngle\(limb.legAxis, pitch\)/);
 assert.match(field,/local occupiedParts, drivenParts, legGroups = \{\}, \{\}, \{\}/);
 assert.match(field,/node:IsA\("Motor6D"\)/);
 assert.match(field,/node:IsA\("AnimationConstraint"\)/);
 assert.match(field,/RunService\.PreSimulation:Connect\(function\(dt\)/);
 assert.match(port,/if k and AssetIds\["Animals\/" \.\. asset\]/);
 assert.match(port,/local lastDecorationGrowth = \{\}/);
 assert.match(port,/CityDecorationGrowthMode", "ECONOMY_READ_ONLY"/);
});

// [주민 개별 복장·소품] 직업마다 실제 승인 모델을 한 번만 장착하고 근무 중에만 보이게 한다.
test('개인별 직업 소품·복장·퇴근 표시가 기존 R15 일정에 연결된다',()=>{
 const scene=read('ReplicatedStorage/Shared/PortScene.luau');
 const assets=read('ReplicatedStorage/Shared/AssetIds.luau');
 for(const key of ['Cargo/box-open','Relics/rope-bundle-a','Relics/weapon-sword',
  'Relics/hammer','Naval/tool-shovel','Naval/fishing-net','Relics/map-rolled']){
  assert.ok(assets.includes('["'+key+'"]'),'미등록 직업 소품: '+key);
 }
 for(const token of [
  't.mode == "schedule" and t.job == "sailor"',
  't.mode == "schedule" and t.job == "guard"',
  't.mode == "schedule" and t.job == "craftsman"',
  't.mode == "schedule" and t.job == "farmer"',
  't.mode == "schedule" and t.job == "fisher"',
  't.mode == "schedule" and t.job == "official"',
  't.workProp = held',
  'mesh:SetAttribute("WorkPropOriginalTransparency", mesh.Transparency)',
  'local showWorkProp = routine == "work" or routine == "trade" or routine == "commute"',
  'if w.workProp and w.workProp.Parent and w.workPropVisible ~= showWorkProp then',
  'mesh.Transparency = if showWorkProp then (mesh:GetAttribute("WorkPropOriginalTransparency") or 0) else 1',
  'attire.hat = "straw"',
  'attire.age = "elder"',
  'outfit.age = if job == "clergy" and districtResidents == 0 then "elder" else "adult"'
 ]) assert.ok(scene.includes(token),'직업·복장 실체 빠짐: '+token);
 assert.doesNotMatch(scene,/local fig = person\(work, faceTo\(work, market\), \{ role = duty.role, profession = duty.job, hat = "cap" \}/,
  '모든 직업이 같은 모자를 사용하면 안 된다');
 assert.ok(scene.includes('if #parts == 0 or #parts > 12 then error("NPC_PROP_PART_LIMIT") end'),
  '모바일 직업 소품 12파트 초과 보호 유지');
});

// [주민 경로 안전] 집까지 4개 생활 구간 검사·교대근무·현재 시각 초기위치의 실제 코드 유지.
test('주민 귀가 안전과 시설 업무 종료 시각을 함께 검증한다',()=>{
 const scene=read('ReplicatedStorage/Shared/PortScene.luau');
 const from=scene.indexOf('-- [마을 주민·건축물 간섭]');
 const to=scene.indexOf('-- [주민 직업 실물 장비]',from);
 assert.ok(from>=0 && to>from,'기존 NPC 경로 검사 유지');
 const routes=scene.slice(from,to);
 for(const token of [
  'local home = (walker.home or walker.morning) + offset',
  'not blocked(CFrame.new(home), 0, walker.model)',
  'clearSegment(home, morning)',
  'clearSegment(morning, market)',
  'clearSegment(market, evening)',
  'clearSegment(evening, home)',
  'walker.home, walker.morning, walker.market, walker.evening = home, morning, market, evening',
  'if walker.mode == "schedule" then',
  'walker.model:PivotTo(CFrame.new(startAt) * (safe - safe.Position))',
  'walker.lastPos = startAt',
 ]) assert.ok(routes.includes(token),'주민 실제 귀갓길 검사/초기화 누락: '+token);
 const district=scene.slice(scene.indexOf('local function npc(dx, dz, yaw, kind, mode, spec)'));
 assert.ok(district.includes('w.districtDuty = true'),'구역 근무자 근무시간 공통 계약 누락');
 for(const token of [
  'local offShift = w.districtDuty and (hour < (w.shiftStart or 6) or hour >= (w.shiftEnd or 20))',
  'local roster = if offShift then NIGHT_REST',
  'local routine = if offShift then "rest"',
 ]) assert.ok(scene.includes(token),'퇴근 후 작업 중단 누락: '+token);
 assert.ok(!routes.includes('clearSegment(evening, morning)'),'집을 무시한 기존 귀가 동선 재발');
});

// [주민 하루 생활] 유령 인구를 방지하고 구역별 출퇴근과 미개발 녹지를 회귀 검증한다.
test('항구는 실제 거주민과 시설 근무표를 따르고 추가 소품 없이 원본 풀·관목을 재사용한다',()=>{
 const scene=read('ReplicatedStorage/Shared/PortScene.luau');
 for(const token of [
  'math.floor(math.max(0, tonumber(info.sim.residents) or 0) / 12), 0, 4',
  'w.districtJob = job',
  'w.shiftStart = (if job == "farmer" then 5 elseif job == "merchant" then 7 else 6)',
  'w.shiftEnd = (if job == "farmer" then 18 elseif job == "merchant" then 20 else 21)',
  'local offDuty = (w.goodId and (hour < 6 or hour >= 20))',
  'w.model:SetAttribute("DailyRoutine", "rest")',
  'w.model:SetAttribute("DailyRoutine", "work")',
  '"Terrain", "Bush_Small", 3.6',
  '"Terrain", "Grass_Small", 2.5'
 ]) assert.ok(scene.includes(token),'도시 생활 검증 누락: '+token);
 assert.ok(!scene.includes('local plazaResidents = if info.sim then math.clamp(math.floor((info.sim.residents or 6) / 12), 1, 4)'),
  '거주민 0명에도 주민을 강제로 배치하면 안 된다');
 const woodland=scene.match(/woodland = \{ \{ "Terrain", "tree-oak"[\s\S]*?\} \},/);
 assert.ok(woodland,'미개발 구획 기존 녹지 팔레트');
 assert.equal((woodland[0].match(/\{ "Terrain",/g)||[]).length,4,'구획 내 추가 장식 폭증 금지');
});

// [도시 실체] 구획 표시 밀도가 실제 경제 시설과 발전도에 비례하고 중복 물체가 돌아오지 않는지 검사.
test('시장·농경·종교 구획은 시설과 인력에 따라 달라지고 불필요한 중복 장식을 배제한다',()=>{
 const scene=read('ReplicatedStorage/Shared/PortScene.luau');
 const start=scene.indexOf('-- [실제 도시 구획] 경제의 건물·주민·고용을 읽기만 한다.');
 const end=scene.indexOf('-- [항만 창고 장식]',start);
 assert.ok(start>=0&&end>start,'기존 densify 단일 구획 책임 함수 유지');
 const district=scene.slice(start,end);
 for(const key of [
  'local marketBuilt = if districtBuildings then',
  'local warehouseBuilt = if districtBuildings then',
  'local stalls = math.min(if districtTouch then 4 else 6',
  'if stalls >= 2 and warehouseBuilt > 0 then',
  'folder:SetAttribute("CityMarketStalls", stalls)',
  'local stallRowZ = 11',
  'local festivalRowZ = 22',
  'local cargoEdgeZ = cz - 33',
  'local displayEdgeZ = cz + 33',
  'cx - 14, cargoEdgeZ, false',
  'cx + 13, cargoEdgeZ, false',
  'cx + (i - (#marketGoods + 1) / 2) * 18, displayEdgeZ, false',
  'local farmsBuilt = if districtBuildings then',
  'local cropRows = if farmsBuilt <= 0 or not farmAsset then 0 else math.min(2, lvl, math.max(1, math.floor(math.sqrt(farmsBuilt) / 2)))',
  'if farmsBuilt > 0 then',
  'if lvl >= 3 and farmsBuilt >= 5 then',
  'folder:SetAttribute("CityFarmRows"',
  'local clergyAvailable = not districtJobs',
  'local workersLimit = math.min(employed, if districtTouch then 3 else 5',
  'm:SetAttribute("Job", job)',
  'm:SetAttribute("Workplace", d.kind)',
  'w.workKinds, w.tradeKinds, w.leisureKinds = activity, activity, leisure',
 ]) assert.ok(district.includes(key),'도시 시설·주민 연동 누락: '+key);
 assert.ok(!district.includes('for k = -2, 2 do'),'도시 시장의 일괄 가판대 복구 금지');
 assert.ok(!district.includes('for k = -8, 8 do'),'농장 고정 119개 작물 복구 금지');
 assert.ok(!district.includes('put("Town", "fountain-round", 7, cx'),'중복 시장 분수 금지');
 assert.match(district,/if lvl >= 3 and clergyAvailable then/);
 assert.match(district,/districtResidents >= workersLimit/);
});

// [181개 항구 구역 재배치] 현재 랜드마크 8개를 항구별 이동 좌표로 검사한다.
test('모든 항구 시장·종교·농장에 경계 검사와 안전 재배치 후보가 있다',()=>{
  const scene=read('ReplicatedStorage/Shared/PortScene.luau');
  const identity=read('ReplicatedStorage/Shared/PortIdentity.luau');
  const ports=read('ReplicatedStorage/Shared/Ports.luau');
  const section=ports.slice(ports.indexOf('local Ports:'),ports.indexOf('local Nations:'));
  const ids=[...section.matchAll(/^\t([a-z][a-z0-9_]*)\s*=\s*\{\s*\n\s*id = /gm)].map(x=>x[1]);
  assert.equal(ids.length,181,'등록된 181개 항구 모두 적용');
  assert.equal(new Set(ids).size,181,'항구 중복 없음');
  // [실제 3D 충돌 경로] 고정 LM_SITES가 아니라 항구별 이동 후 landmarkSites를 대조해야 한다.
  for(const token of [
   'seeded(info.portId .. ":district-collision-reposition-v2")',
   'local districtKinds = { "religious", "market", "farm" }',
   'for candidateIndex, at in candidates do',
   'if clear and isRoyalCity',
   'for _, sx in streetsX do',
   'for _, sx in streetsOuter do',
   'for _, site in facilityLocations do',
   'typeof(plazaLocation) == "Vector3"',
   'for _, landmark in landmarkSites do',
   'for _, other in districts do',
   'hx + other.hx + 6','hz + other.hz + 6',
   'math.abs(z) + hz <= 440',
   'CityDistrictLayoutMode", "WHOLE_PORT_REPOSITION_COLLISION_CHECK"',
   'CityDistrictPlaced", #districts',
   'CityDistrictMoved", districtMoved',
   'CityDistrictRejectedCandidates", districtRejected',
   'd.hx + halfX','d.hz + halfZ',
   'CityBuildingMode", "AUTO_VISUAL_READ_ONLY"'
  ]) assert.ok(scene.includes(token),'항구별 구역 안전 검사 누락: '+token);
  assert.match(scene,/landmarkSites\[i\] = Vector3\.new\(oldSite\.X \+ shiftX/);
  assert.match(scene,/local shiftX = if reflow then reflow\.landmarkX else landmarkRng/);
  assert.match(scene,/local shiftZ = if reflow then reflow\.landmarkZ else landmarkRng/);
  // [항구별 이동 범위] 전체 주거·종교·시장·농촌의 새 실제 좌표 범위를 계산한다.
  const sitesSection=scene.match(/local LM_SITES = \{([\s\S]*?)\n\}/)?.[1] ?? '';
  const marks=[...sitesSection.matchAll(/Vector3\.new\((-?\d+), 0, (-?\d+)\)/g)]
    .map(m=>[Number(m[1]),Number(m[2])]);
  assert.equal(marks.length,8,'기존 승인 랜드마크 8개 필지');
  assert.match(scene,/local districtZ = 358 \+ dz:NextInteger\(0, 14\)/);
  assert.match(scene,/local farmZ = 379 \+ dz:NextInteger\(0, 9\)/);
  const manual=new Map([...identity.matchAll(/\n\t([a-z_]+) = \{ landmark = ([\s\S]*?)\n\t\treflow = \{ lane = (-?\d+), plaza = (-?\d+), side = (-?\d+), landmarkX = (-?\d+), landmarkZ = (-?\d+), district = (-?\d+), facility = (\d+) \}/g)]
    .map(m=>[m[1],{x:Number(m[8]),lx:Number(m[6]),lz:Number(m[7])}]));
  assert.equal(manual.size,181,'지시서별 개별 재배치 항구 181개');
  for(const id of ids){
    const reflow=manual.get(id);
    const districtX= reflow ? -138+reflow.x : -138;
    const farmX= reflow ? -357+reflow.x : -357;
    assert.ok(districtX-41>-215,id+' 시장·종교와 왕궁 분리');
    assert.ok(farmX+82 < -215,id+' 농촌과 도심 구역 분리');
    for(const side of [-1,1]){
      for(const z of [358,372]){
        assert.ok(Math.abs(side*z)+43<=440,id+' 시장·종교 구역 경계');
        for(const [,lz] of marks){
          const shifted=Math.abs(lz)+(reflow ? Math.abs(reflow.lz) : 5);
          assert.ok(z-shifted>=43+35,id+' 이동 랜드마크와 시장·종교 분리');
        }
      }
      for(const z of [379,388]){
        assert.ok(Math.abs(side*z)+51<=440,id+' 농촌 경계');
        for(const [lx] of marks){
          const shifted=lx-(reflow ? Math.abs(reflow.lx) : 5);
          assert.ok(shifted-(farmX+82)>=35,id+' 이동 랜드마크와 농촌 분리');
        }
      }
    }
  }
});

// [주택 배치] 실제 수입 건물의 처마·별채 점유 폭까지 보수적으로 계산하며 등급은 필지별로 고정한다.
test('마을 주택은 5개 크기 등급을 발전도별로 혼합하고 도로·시설·이웃 주택을 피한다',()=>{
 const port=read('ReplicatedStorage/Shared/PortScene.luau');
 const buildings=read('ReplicatedStorage/Shared/PortBuildings.luau');
 const start=port.indexOf('local houseSizeBands = {');
 const end=port.indexOf('-- 한 줄 채우기: z = 줄의 중심',start);
 assert.ok(start>0&&end>start,'기존 주거 생성 함수에 등급표가 있어야 한다');
 const bands=port.slice(start,end);
 for(const tier of [
  '{ 0.62, 0.73, 0.84, 0.94, 1.02 }',
  '{ 0.66, 0.79, 0.92, 1.08, 1.18 }',
  '{ 0.69, 0.84, 1.00, 1.19, 1.36 }',
  '{ 0.71, 0.88, 1.07, 1.31, 1.53 }',
  '{ 0.73, 0.92, 1.14, 1.42, 1.72 }'
 ])assert.ok(bands.includes(tier),'발전 단계별 작은 집~큰 집의 크기 혼합');
 const home=port.slice(port.indexOf('local function fillRow('),port.indexOf('for _, side in { 1, -1 } do',port.indexOf('local function fillRow(')));
 assert.match(home,/seeded\(plotId \.\. ":house-size"\)/,'다른 랜덤 흐름을 소비하지 않는 고정 필지 규모');
 assert.match(home,/sizeScale = houseSizeBands\[lvl\]\[sizeClass\] \* sizeJitter/);
 assert.match(home,/roofFactor = if style\.kit == "eastasia" then 1\.62 else 1\.46/);
 assert.match(home,/projectedHalf <= rowClearance/,'도로 침범 전 등급 축소 또는 생략');
 assert.match(home,/while sizeClass > 1 and projectedHalf > rowClearance do/);
 assert.match(home,/math\.max\(sz \* 0\.62, projectedHalf\)/,'기존 점유 반경을 축소하지 않음');
 assert.match(home,/not onStreet\(at\.X, half\)/);
 assert.match(home,/not reserved\(at\.X, at\.Z, half\)/);
 assert.match(home,/table\.insert\(placedLots, \{ X = pos\.X, Z = pos\.Z,/);
 assert.match(home,/HX = actualHalfX, HZ = actualHalfZ/);
 assert.match(home,/BuildingSizeClass", sizeClass/);
 assert.match(home,/BuildingSizeScale", sizeScale/);
 assert.match(home,/BuildingClearance", math\.max\(actualHalfX, actualHalfZ\)/);
 assert.match(home,/math\.clamp\(fl, 1, P\.flMax\)/,'문화권별 최대 층수 유지');
 assert.match(port,/local roof = importedModel\(parent, "Town", "eastasia-roof"/);
  // [마을 5단계 필지] 원본 건물은 보존하고 주거 간격·도시 면적과 실제 땅 크기만 축소한다.
  const standard=buildings.match(/B\.CityPlots = \{ plotScale = \{ ([^}]+) \}, areaScale = \{ ([^}]+) \} \}/);
  const royal=buildings.match(/B\.RoyalCityPlots = \{ plotScale = \{ ([^}]+) \}, districtScale = \{ ([^}]+) \} \}/);
  assert.ok(standard && royal,'마을/왕궁 1~5단계 공통 토지 규격');
  const factors=pair=>pair.slice(1).map(group=>group.split(',').map(Number));
  const [plot,area]=factors(standard), [royalPlot,royalArea]=factors(royal);
  for(const sizes of [plot,area,royalPlot,royalArea]){
    assert.equal(sizes.length,5,'기존 5단계 발전도 유지');
    assert.ok(sizes.every((v,i)=>Number.isFinite(v)&&v>0&&(i===0||v>sizes[i-1])),
      '발전 단계별 땅 크기는 단계가 높을수록 증가');
  }
  assert.ok(plot[0]<1.5&&plot[4]<2.2&&area[0]<1.5&&area[4]<6,
    '기존 과대 주택 필지·시가지 면적 축소');
  assert.ok(royalPlot[4]<1.4&&royalArea[4]<1.3,'왕궁 구획 중복 확대 완화');
  assert.ok(port.includes('local S = P.S * (countryPlan and countryPlan.lot or 1) * lotGrowth * lotVariance'),
    '실제 주택 간격·골목 생성에 표준 필지 적용');
  assert.ok(port.includes('local X_END = -math.min(490, 190 + math.floor(110 * math.sqrt(areaGrowth))'),
    '실제 외곽 도로·주택 배치 범위에 단계별 축소 적용');
  assert.ok(port.includes('townFloor.Size = Vector3.new(townRight - townLeft, townFloor.Size.Y, 2 * townHalfZ)'),
    'Roblox 실물 TownFloor 크기도 변경');
  assert.ok(port.includes('plate.Size = Vector3.new(farLandWidth, plate.Size.Y, farLandDepth)'),
    '기본 Baseplate 실제 크기 변경');
  assert.ok(port.includes('local farLandLeft = -1380 - (cityTier - 1) * 25'),
    '6단계 실제 마을 지면 왼쪽 경계');
  assert.ok(port.includes('local farLandDepth = 2 * (CITY_LIMIT_Z + 180)'),
    '과대 지면 깊이 축소');
  assert.ok(port.includes('TownPlotSpacing", S'),'실물 필지 간격 단계 진단');
  const rural=buildings.match(/groundCenterX = (-?\d+), groundWidth = (\d+)/);
  assert.ok(rural && -1380 < Number(rural[1])-Number(rural[2])/2,
    '축소해도 기존 농촌 토지 전체를 덮도록 Roblox Baseplate 보호');
 assert.match(port,/CityBuildingMode", "AUTO_VISUAL_READ_ONLY"/);
 assert.match(port,/SetAttribute\("BuildAuthority", "VISUAL_ONLY"\)/);
});

// [181개 항구 배치 진단] 필지별 재배치 실패를 추적하며 불필요한 임시 모델 생성 없이 검사한다.
test('항구별 주거 생성은 인접 빈자리 재시도와 실제 크기 결과를 읽기 전용으로 집계한다',()=>{
 const port=read('ReplicatedStorage/Shared/PortScene.luau');
 const ports=read('ReplicatedStorage/Shared/Ports.luau');
 const section=ports.slice(ports.indexOf('local Ports:'),ports.indexOf('local Nations:'));
 const ids=[...section.matchAll(/^\t([a-z][a-z0-9_]*)\s*=\s*\{\s*\n\s*id = /gm)].map(x=>x[1]);
 assert.equal(ids.length,181,'항구 전역 동일 배치 경로');
 const start=port.indexOf('local function fillRow('),end=port.indexOf('for _, side in { 1, -1 } do',start);
 const fill=port.slice(start,end);
 for(const needle of [
  'local homeShifts = { Vector3.zero',
  'for _, shift in homeShifts do',
  'for _, direction in homeShifts do',
  'local at = pos + Vector3.new(shift.X, 0, shift.Z * side)',
  'if not onStreet(at.X, half) and not reserved(at.X, at.Z, half) then',
  'if canFitPlot then',
  'local bounds, dimensions = staged:GetBoundingBox()',
  'if chosenShift then',
  'homeCandidates += 1','homePlaced += 1','homeShifted += 1',
  'homeSizeCounts[sizeClass] += 1',
  'homeModelRejected += 1','homePlotRejected += 1',
  'staged:Destroy()'
 ])assert.ok(port.includes(needle),'주거 생성 진단 조건 누락: '+needle);
 const idxPre=fill.indexOf('if canFitPlot then'),idxBuild=fill.indexOf('local staged = Instance.new("Model")');
 assert.ok(idxPre>=0&&idxBuild>idxPre,'사전 빈자리 검사가 주택 모델 복제보다 먼저 실행');
 const result=port.slice(port.indexOf('CityHousingPort", info.portId')-28);
 for(const name of [
  'CityHousingPort','CityHousingCulture','CityHousingCandidates','CityHousingPlaced',
  'CityHousingShifted','CityHousingPlotRejected','CityHousingModelRejected',
  'CityHousingPlacedPercent',
  'CityHousingLayoutState','CityHousingSize'
 ])assert.ok(result.includes(name),'항구별 읽기 전용 진단 누락: '+name);
 assert.match(result,/NO_ECONOMIC_CANDIDATE/);
 assert.match(result,/NO_SAFE_HOUSING_PLOT/);
 assert.match(result,/COMPUTED_NOT_VISUALLY_VERIFIED/,'런타임 확인 전 합격 표시 금지');
 assert.match(port,/CityBuildingMode", "AUTO_VISUAL_READ_ONLY"/);
});

// [문화권 23종×발전도 5단계] 어떤 지역도 사전 필지 판정에서 최소 주택까지 무조건 배제하지 않는다.
test('모든 문화권과 발전도에 최소 주택 배치 공간이 남는다',()=>{
 const port=read('ReplicatedStorage/Shared/PortScene.luau');
 const cultures=read('ReplicatedStorage/Shared/PortCultures.luau');
 const begin=port.indexOf('local houseSizeBands = {'),end=port.indexOf('-- [항구별 진단]',begin);
 assert.ok(begin>=0&&end>begin,'주택 등급표와 진단 연결');
 const bands=[...port.slice(begin,end).matchAll(/\{ ([\d.]+), ([\d.]+), ([\d.]+), ([\d.]+), ([\d.]+) \}/g)]
  .map(m=>m.slice(1).map(Number));
 assert.equal(bands.length,5,'발전도 5단계');
 const profiles=[...cultures.matchAll(/^\t([a-z]+) = \{ S = ([\d.]+).*?wMul = ([\d.]+), dAdd = (-?[\d.]+).*sizeWeights = \{ (\d+), (\d+), (\d+), (\d+), (\d+) \}/gm)]
  .map(m=>({name:m[1],size:Number(m[2]),width:Number(m[3]),depth:Number(m[4]),weights:m.slice(5).map(Number)}));
 assert.equal(profiles.length,23,'문화권 23종을 모두 검사');
 const lotGrowth=[1.5,1.65,1.8,2,2.2];
 let count=0;
 for(const p of profiles){
  assert.equal(p.weights.reduce((a,b)=>a+b,0),100,p.name+' 크기 비율');
  for(let i=0;i<5;i++){
   // 기존 최소 구획 배율(0.94)과 최대 처마 보정(동아시아 1.62)을 준수하는 보수적 크기 검사.
   const clear=p.size*lotGrowth[i]*0.94*0.5+4;
   const width=p.size/(1.28*1.08)*p.width;
   const depth=Math.max(width*0.72,width+p.depth);
   const roof=['japan','china','korea'].includes(p.name)?1.62:1.46;
   const projected=Math.max(width,depth)*bands[i][0]*1.28*roof*0.5+3.5;
   assert.ok(projected<=clear,p.name+' 발전 '+(i+1)+'단계: 최소 주택 공간 부족');
   count++;
  }
 }
 assert.equal(count,115,'전체 지역·발전도 조합');
 assert.match(port,/CityHousingPlacedPercent", if homeCandidates > 0/,'항구별 배치율 진단');
});

// [항구 181곳 지역 발전도 실루엣] 옛 도시·신도시·서민층·부유층 구획과 원본 건축 재질을 재사용한다.
test('항구별 구시가지와 신시가지는 문화권 지붕·외벽·시장 성장에 따라 구분된다',()=>{
 const source=read('ReplicatedStorage/Shared/PortScene.luau');
 const culture=read('ReplicatedStorage/Shared/PortCultures.luau');
 const ports=read('ReplicatedStorage/Shared/Ports.luau');
 const portData=ports.slice(ports.indexOf('local Ports:'),ports.indexOf('local Nations:'));
 const ids=[...portData.matchAll(/^\t([a-z][a-z0-9_]*)\s*=\s*\{\s*\n\s*id = /gm)].map(x=>x[1]);
 assert.equal(ids.length,181,'181개 항구 모두 기존 정본 마을 생성 함수를 공유');
 const start=source.indexOf('local function fillRow(');
 const end=source.indexOf('for _, side in { 1, -1 } do',start);
 const row=source.slice(start,end);
 assert.match(row,/local quarter = if laneIndex == 0 then "old" elseif lvl >= 3 then "new" else "edge"/);
 assert.match(row,/local merchantGrowth = built and/);
 assert.match(row,/\(built\.market or 0\) >= 3/);
 assert.match(row,/\(built\.warehouse or 0\) >= 4/);
 assert.match(row,/sizeClass == 3 and roll % 3 == 0 then sizeClass = 4/);
 assert.match(row,/CityQuarter", quarter/);
 assert.match(row,/CityResidenceType"/);
 assert.match(row,/CityMerchantGrowth", merchantGrowth == true/);
 assert.match(row,/painted = appearance ~= nil or/,'원본 PBR·텍스처를 건드리지 않아야 함');
 assert.match(source,/CityOldTownHomes", oldTownHomes/);
 assert.match(source,/CityNewTownHomes", newTownHomes/);
 assert.match(source,/local roofSpan = if currentKey == "china" then 1\.32 elseif currentKey == "japan" then 1\.15 else 1\.22/);
 for(const part of ['STYLE.japan','STYLE.korea','STYLE.china','HOUSE_ARCH','HOUSE_FORM']){
  assert.ok(culture.includes(part),'기존 지역 건축 형식 복구 누락: '+part);
 }
 assert.match(source,/CityBuildingMode", "AUTO_VISUAL_READ_ONLY"/,'기존 경제/저장 흐름 유지');
});

// [생산품별 건축] 어업·산업·농산품·교역의 현물 구조를 기존 항구 생산 목록만 읽어서 선택한다.
test('항구 특산품 공방은 생산품별 7가지 형태를 쓰고 랜드마크·주택과 실측 충돌을 검사한다',()=>{
 const source=read('ReplicatedStorage/Shared/PortScene.luau');
 const start=source.indexOf('local SPECIAL_NAME = {');
 const end=source.indexOf('-- 문화권 소품:',start);
 assert.ok(start>=0&&end>start,'기존 특산품 전시 구역');
 const block=source.slice(start,end);
 assert.match(block,/Chains\.showcaseGoods\(info\.portId, made,/);
 for(const family of ['fishery','textile','mineral','timber','craft','farm','trade']){
  assert.ok(block.includes('"'+family+'"'),'생산품 건축 종류 누락 '+family);
 }
 assert.match(block,/local candidates = \{/);
 assert.match(block,/not onStreet\(candidate\.X, 27\) and not reserved\(candidate\.X, candidate\.Z, 27\)/);
 assert.match(block,/local bounds, ext = staged:GetBoundingBox\(\)/);
 assert.match(block,/not reserved\(candidate\.X, candidate\.Z, hx, hz\)/);
 assert.match(block,/local industryLimitZ = 360 \+ lvl \* 80 - 8/);
 assert.match(block,/math\.abs\(candidate\.Z\) \+ 27 <= industryLimitZ/);
 assert.match(block,/math\.abs\(candidate\.Z\) \+ hz <= industryLimitZ/);
 assert.match(block,/local safeSite/);
 assert.match(block,/for _, candidate in candidates do[\s\S]*?safeSite = candidate/);
 assert.match(block,/staged:PivotTo\(CFrame\.new\(safeSite - chosen\) \* staged:GetPivot\(\)\)/);
 assert.match(block,/specialtyReflowed \+= 1/);
 assert.match(block,/CitySpecialtyReflowed", specialtyReflowed/);
 assert.match(block,/CitySpecialtyBoundaryZ", industryLimitZ/);
 assert.match(block,/BuildPhase", 4/);
 assert.match(block,/BuildState", "complete"/);
 assert.match(block,/BuildingFootprintX", hx \* 2/);
 assert.match(block,/BuildingFootprintZ", hz \* 2/);
 assert.match(block,/staged:Destroy\(\)/);
 assert.match(block,/IndustryGood", good/);
 assert.match(block,/IndustryFamily", family/);
 assert.match(block,/CitySpecialtyBuildingMode", "PRODUCTION_VISUAL_READ_ONLY"/);
 assert.match(block,/CitySpecialtyPlaced", specialtyPlaced/);
 assert.match(block,/CitySpecialtyRejected", specialtyRejected/);
 assert.match(source,/MarketSpecialtyDisplay_/,'시장에 지역 생산품 전시 연결');
 assert.match(source,/if game:GetService\("UserInputService"\)\.TouchEnabled then 1 else 2/);
 assert.match(source,/CityBuildingMode", "AUTO_VISUAL_READ_ONLY"/,'경제 시스템 불변');
});

// [특산품 전체 재배치] 제철소/목재소/어시장 등 실측 지붕과 시가지 경계를 함께 보호한다.
test('181개 항구의 1~5단계 특산품 후보는 외곽 경계와 실제 크기로 재검사한다',()=>{
 const scene=read('ReplicatedStorage/Shared/PortScene.luau');
 const ports=read('ReplicatedStorage/Shared/Ports.luau');
 const ids=[...ports.slice(ports.indexOf('local Ports:'),ports.indexOf('local Nations:'))
  .matchAll(/^\t([a-z][a-z0-9_]*)\s*=\s*\{\s*\n\s*id = /gm)].map(m=>m[1]);
 assert.equal(ids.length,181);
 const block=scene.slice(scene.indexOf('local SPECIAL_NAME = {'),scene.indexOf('-- 문화권 소품:'));
 assert.match(block,/local industryLimitZ = 360 \+ lvl \* 80 - 8/);
 assert.match(block,/if safeSite ~= chosen then/);
 assert.match(block,/local safeSite/);
 assert.match(block,/specialtyReflowed \+= 1/);
 assert.match(block,/CitySpecialtyReflowed", specialtyReflowed/);
 assert.match(block,/CitySpecialtyBoundaryZ", industryLimitZ/);
 let samples=0;
 for(const id of ids)for(let lvl=1;lvl<=5;lvl++)for(let k=1;k<=3;k++){
  const bound=360+lvl*80-8;
  const candidates=[
   [-178+(k-2)*30,-86],
   [-90-(k-1)*58,-234],
   [-90-(k-1)*58,234],
   [-101,-317-(k-1)*54],
   [-101,317+(k-1)*54],
   [-172,-345],[-172,345],
  ];
  assert.equal(candidates.length,7);
  assert.ok(candidates.some(([,z])=>Math.abs(z)+27<=bound),id+' 최소 후보 미확보');
  assert.ok(candidates.every(([x])=>x>=-615&&x<=35),id+' 후보 마을 바닥판 이탈');
  samples++;
 }
 assert.equal(samples,2715,'181항구 × 발전5 × 특산품 최대3');
 assert.match(scene,/CityBuildingMode", "AUTO_VISUAL_READ_ONLY"/);
});

// [주야·겨울·지형·모바일] 기존 조명과 해안선 시스템을 재사용하고 새 갱신 루프를 만들지 않는다.
test('도시 골목·눈 지붕·밤 창문은 기존 기후·해안 분류와 모바일 예산을 공유한다',()=>{
 const s=read('ReplicatedStorage/Shared/PortScene.luau');
 assert.match(s,/local coastForm = folder:GetAttribute\("CoastForm"\) or "plain"/);
 assert.match(s,/local terrainLaneShift = if coastForm == "hill"/);
 assert.match(s,/CityRoadTerrain", coastForm/);
 assert.match(s,/CityTerrainStreetEdge/);
 assert.match(s,/edge\.CanCollide, edge\.CanQuery, edge\.CanTouch = false, false, false/);
 assert.match(s,/folder:SetAttribute\("CitySeasonIndex", index\)/);
 assert.match(s,/folder:SetAttribute\("CityWinterRoofTone"/);
 assert.match(s,/folder:GetAttribute\("CitySeasonIndex"\) == 1/);
 assert.match(s,/surface\.Material = Enum\.Material\.Snow/);
 assert.match(s,/surface:SetAttribute\("CityWinterRoof", true\)/);
 assert.match(s,/if not painted then/,'원본 PBR 무손상 보호');
 assert.match(s,/local nightWindowLimit = if touchHousing then 5 else 11/);
 assert.match(s,/if lvl >= 2 and nightWindows < nightWindowLimit/);
 assert.match(s,/window\.CanCollide, window\.CanTouch, window\.CanQuery, window\.CastShadow = false, false, false, false/);
 assert.match(s,/glow\.Parent = window/);
 assert.match(s,/CityNightWindowCount", nightWindows/);
 assert.match(s,/bounds\.Position\.Z \+ streetFront \* \(dimensions\.Z \* 0\.5 \+ 0\.15\)/,'빛나는 창은 외벽 바깥');
 assert.match(s,/window\.Transparency = 0\.92/,'낮에는 창문 빛 약화');
 assert.match(s,/entry\.light\.Enabled = night > 0\.15/,'밤에만 창문 조명 켬');
 assert.match(s,/window\.Transparency = math\.clamp\(0\.92 - night \* 0\.78, 0\.14, 0\.92\)/);
 assert.match(s,/local lightConn = folder\.DescendantAdded:Connect\(registerLight\)/);
 assert.match(s,/entry\.light\.Brightness = entry\.brightness \* \(0\.16 \+ 2\.15 \* night\)/);
 // [스튜디오 실물 회귀] Model.LevelOfDetail은 실행 중 쓰기 권한이 없어 항구 장면을 중단한다.
 assert.doesNotMatch(s,/m\.LevelOfDetail\s*=/,'런타임 금지 LOD 쓰기 복귀 금지');
 assert.match(s,/m:SetAttribute\("ArchitectureCulture", currentKey\)/,'원본 지역 건축 설정 유지');
 assert.match(s,/folder\.Destroying:Connect\(function\(\)/,'갱신 연결 정리');
});

// [지역 주택 실측] 모든 문화권은 소형~대형 5종 비율을 가지며 실제 메시 외곽으로 배치한다.
test('항구별 주택은 지역 비율과 실제 외곽 측정 후 겹침 없는 자리만 사용한다',()=>{
 const port=read('ReplicatedStorage/Shared/PortScene.luau');
 const cultures=read('ReplicatedStorage/Shared/PortCultures.luau');
 const ports=read('ReplicatedStorage/Shared/Ports.luau');
 const section=ports.slice(ports.indexOf('local Ports:'),ports.indexOf('local Nations:'));
 const ids=[...section.matchAll(/^\t([a-z][a-z0-9_]*)\s*=\s*\{\s*\n\s*id = /gm)].map(x=>x[1]);
 assert.equal(ids.length,181,'181개 항구에 동일한 정본 배치 함수 적용');
 const sizes=[...cultures.matchAll(/^\t([a-z]+) = \{ S = .*sizeWeights = \{ (\d+), (\d+), (\d+), (\d+), (\d+) \}/gm)];
 assert.equal(sizes.length,23,'모든 문화권에 고유 주택 크기 비율');
 for(const [row,key,...weightStrings] of sizes){
  const weights=weightStrings.map(Number);
  assert.equal(weights.reduce((a,b)=>a+b,0),100,key+' 지역별 비율 총합');
  assert.ok(weights.every(x=>x>0),key+' 작은 집과 큰 집 모두 남겨야 함');
 }
 assert.notDeepEqual(sizes.find(x=>x[1]==='nordic')?.slice(2),sizes.find(x=>x[1]==='italy')?.slice(2),'지역 비율 차별화');
 const start=port.indexOf('local function fillRow(');
 const end=port.indexOf('for _, side in { 1, -1 } do',start);
 const home=port.slice(start,end);
 assert.match(home,/local mix = P\.sizeWeights/);
 assert.match(home,/local widthBase = fw \* \(sz \/ S\) \* \(P\.wMul or 1\)/);
 assert.match(home,/local depthBase = math\.max\(widthBase \* 0\.72, widthBase \+ \(P\.dAdd or 0\)\)/);
 assert.match(home,/local staged = Instance\.new\("Model"\)/);
 assert.match(home,/local body = house\(staged, pos, ww, dd, fl, style, rng\)/);
 assert.match(home,/local bounds, dimensions = staged:GetBoundingBox\(\)/);
 assert.match(home,/measuredHalfX = math\.abs\(bounds\.Position\.X - pos\.X\)/);
 assert.match(home,/measuredHalfZ = math\.abs\(bounds\.Position\.Z - pos\.Z\)/);
 assert.match(home,/actualHalfX = math\.max\(half, measuredHalfX\)/);
 assert.match(home,/actualHalfZ = math\.max\(half, measuredHalfZ\)/);
 assert.match(home,/local worldHalfX = \(math\.abs\(bounds\.RightVector\.X\) \* dimensions\.X/);
 assert.match(home,/local worldHalfZ = \(math\.abs\(bounds\.RightVector\.Z\) \* dimensions\.X/);
 assert.match(home,/measuredHalfX = math\.abs\(bounds\.Position\.X - pos\.X\) \+ worldHalfX \+ 2\.5/);
 assert.match(home,/measuredHalfZ = math\.abs\(bounds\.Position\.Z - pos\.Z\) \+ worldHalfZ \+ 2\.5/);
 assert.match(home,/local signedZ = at\.Z \* side/);
 assert.match(home,/clearRoad = signedZ - measuredHalfZ > laneNear \+ laneWidth \* 0\.5 \+ 1\.5/);
 assert.match(home,/signedZ \+ measuredHalfZ < laneFar - laneWidth \* 0\.5 - 1\.5/);
 assert.match(port,/local nextLaneZ = 152 \+ laneOffset \+ \(p \+ 1\) \* laneL \+ nextBend/);
 assert.match(port,/fillRow\(side \* \(nextLaneZ - laneWidth \/ 2 - 6 - S \/ 2\)/);
 const project=(axis,dims)=>axis.reduce((sum,v,i)=>sum+Math.abs(v)*dims[i],0)/2;
 assert.equal(project([1,0,0],[8,6,20]),4);
 assert.equal(project([0,0,-1],[8,6,20]),10);
 const fits=(z,side,half)=>z*side-half>105.5 && z*side+half<144.5;
 assert.equal(fits(125,1,10),true);
 assert.equal(fits(-125,-1,10),true);
 assert.equal(fits(160,1,10),false);
 assert.equal(fits(109,1,10),false);
 assert.match(home,/laneNear = 152 \+ laneOffset \+ laneIndex \* laneL/);
 assert.match(home,/clearRoad and not onStreet\(at\.X, measuredHalfX\)/);
 assert.match(home,/not reserved\(at\.X, at\.Z, actualHalfX, actualHalfZ\)/);
 assert.match(home,/if chosenShift then[\s\S]*?for _, object in staged:GetChildren\(\) do object\.Parent = folder end/);
 assert.match(home,/staged:Destroy\(\)/,'실패한 후보 자산 삭제');
 assert.match(home,/BuildingFootprintX", actualHalfX \* 2/);
 assert.match(home,/BuildingFootprintZ", actualHalfZ \* 2/);
 assert.match(home,/HX = actualHalfX, HZ = actualHalfZ/);
 assert.match(port,/local function reserved\(x, z, halfX, halfZ\)/);
 assert.match(port,/halfZ = halfZ or halfX/);
 assert.match(port,/lot\.HX or lot\.H/);
 assert.match(port,/lot\.HZ or lot\.H/);
 assert.match(port,/CityBuildingMode", "AUTO_VISUAL_READ_ONLY"/);
});

// [가축 PBR 자연 색] 기존 원본 코·귀·얼룩과 색상지도 없는 표면 중복 착색 회귀 방지.
test('항구·탐험 가축의 PBR 단일 채널과 눈·코·얼룩 보호',()=>{
 for(const name of ['PortScene.luau','FieldScene.luau']){
  const scene=read('ReplicatedStorage/Shared/'+name);
  const start=scene.indexOf('if textured and not detail then');
  const end=scene.indexOf('elseif not textured and not sa',start);
  assert.ok(start>0&&end>start,name+' 기존 가축 처리 경로');
  const block=scene.slice(start,end);
  for(const role of ['muzzle','nose','snout','ear','udder','tusk','patch','spot','stripe','whisker']){
   assert.ok(scene.includes('partName:find("'+role+'", 1, true)'),name+'의 '+role+' 보호');
  }
  assert.match(block,/if sa and surfaceHasColorMap\(sa\) then/,'원본 색상 지도 보호');
  assert.match(block,/if sa and not surfaceHasColorMap\(sa\) then\s+sa\.Color = sa\.Color:Lerp\(tint,/,'색상 지도 없는 PBR만 단일 채널 보정');
  assert.doesNotMatch(block,/sa\.Color = [pd]\.Color/,'PBR/파츠 중복 착색 금지');
  assert.match(block,/if not sa then\s+[pd]\.Material =/,'원본 재질 보존');
  for(const material of ['Fabric','Leather','Concrete','SmoothPlastic'])assert.ok(block.includes('Enum.Material.'+material),material+' 가축 재질');
 }
});

// [가축 실물 비율·자연 품종색] 목장/동물원/왕궁 기마병/탐험 현장 공통 규격 회귀.
test('성체 말과 주요 가축의 크기·품종색은 항구와 탐험이 공유하고 원본 텍스처를 보존한다',()=>{
 const scene=read('ReplicatedStorage/Shared/PortScene.luau');
 const field=read('ReplicatedStorage/Shared/FieldScene.luau');
 const config=read('ReplicatedStorage/Shared/PortBuildings.luau');
 const assets=read('ReplicatedStorage/Shared/AssetIds.luau');
 const species=['horse','cow','donkey','llama','sheep','pig','elephant','dog-pug','cat','chicken'];
 for(const sp of species){
  assert.ok(assets.includes('["Animals/'+sp+'"]'),'승인된 실물 동물 모델: '+sp);
  assert.ok(config.includes(sp+' = { size = ')||config.includes('["'+sp+'"] = { size = '),'단일 실물 크기 규격: '+sp);
 }
 assert.match(config,/horse = \{ size = 8\.8,/);
 assert.doesNotMatch(config,/Color3\.fromRGB/,'공유 설정에서 Roblox 전용 Color3 생성 금지');
 assert.match(config,/coats = \{ \{ 132, 78, 45 \},/,'원래 말 RGB 팔레트 보존');
 assert.match(config,/cow = \{ size = 7\.3,/);
 assert.match(config,/donkey = \{ size = 6\.5,/);
 assert.match(config,/sheep = \{ size = 3\.8,/);
 assert.match(config,/pig = \{ size = 4\.1,/);
 assert.match(config,/elephant = \{ size = 13\.5,/);
 assert.match(scene,/local animalVisual = PortBuildings\.AnimalVisual/);
 assert.match(scene,/horse = \{ animalVisual\.horse\.size, "graze" \}/);
 assert.match(scene,/local cavalryHorse = PortBuildings\.AnimalVisual\.horse/);
 assert.match(scene,/cavalryHorse\.size, false, coat/);
 assert.match(scene,/Color3\.fromRGB\(table\.unpack\(cavalryHorse\.coats\[/);
 assert.match(scene,/Color3\.fromRGB\(table\.unpack\(visual\.coats\[/);
 assert.match(scene,/horse:SetAttribute\("AnimalVisualSize", cavalryHorse\.size\)/);
 assert.match(scene,/if horse then mountedVisible \+= 1 end/);
 assert.match(scene,/local coatIndex = if skin then 1 \+ math\.floor/);
 assert.match(scene,/m:SetAttribute\("AnimalCoatIndex", coatIndex\)/);
 assert.match(scene,/local textured = \(p:IsA\("MeshPart"\) and p\.TextureID ~= ""\) or surfaceHasColorMap\(sa\)/);
 assert.match(scene,/if not textured and not detail then/);
 assert.match(scene,/local scale = if isAnimal or distantBackdrop then m:GetScale\(\) \* ratio else ratio/);
 assert.match(scene,/if math\.abs\(actualAxis - desiredSize\) > desiredSize \* 0\.2 then/);
 assert.match(field,/local PortBuildings = require\(script\.Parent:WaitForChild\("PortBuildings"\)\)/);
 assert.match(field,/local sizes = PortBuildings\.AnimalVisual/);
 assert.match(field,/placeModel\(folder, "Animals", species, pos, visual\.size, false, Color3\.fromRGB\(table\.unpack\(visual\.coats\[coatIndex\]\)\)\)/);
 assert.match(read('ReplicatedStorage/Shared/DiscoveryStage.luau'),/Color3\.fromRGB\(table\.unpack\(coats\[1\]\)\)/,'탐험 동물 품종색(발견물 연출)');
 assert.match(field,/if not textured and not detail then/);
 assert.match(read('ReplicatedStorage/Shared/DiscoveryStage.luau'),/m:SetAttribute\("ObservedSpecies", card\.id\)/,'관찰 동물 표시(발견물 연출)');
 assert.match(scene,/for k = 1, grazeCount do/);
 assert.match(scene,/for i = 1, lay\.pens do/);
 assert.match(scene,/horse:SetAttribute\("ShowcaseOnly", true\)/);
 assert.doesNotMatch(config,/DataStoreService/);
});



// [건물 흰색 복원] 텍스처 있는 실물은 유지하고 지역·부위별로 흰 기본 메시만 재질을 복구한다.
test('항구와 탐험의 흰 수입 건물은 문화권 지붕·석재·목재 재질로 복구되고 저장·진행도를 보존한다',()=>{
 const port=read('ReplicatedStorage/Shared/PortScene.luau');
 const field=read('ReplicatedStorage/Shared/FieldScene.luau');
 const start=port.indexOf('local function importedModel(parent, kind, asset, bottomPosition');
 const stop=port.indexOf('-- 등불:',start);
 assert.ok(start>0&&stop>start,'기존 단일 수입 모델 책임 함수');
 const block=port.slice(start,stop);
 assert.ok(port.indexOf('local currentKey = "north"') < start,'문화권은 기존 importer에서 유효해야 한다');
 for(const selector of ['asset:find("house"','asset:find("kenney_"','asset:find("quaternius_"',
  'asset:find("wall"','asset:find("roof"','asset:find("stall"',
  'kind == "Castle"','kind == "Terrain"','kind == "Naval"']){
  assert.ok(block.includes(selector),'건물 유형별 복원 선택 누락: '+selector);
 }
 assert.match(block,/local importedWhite = low >= 0\.78 and high - low <= 0\.14/);
 assert.match(block,/local east = currentKey == "japan"/);
 assert.match(block,/local sandy = currentKey == "desert"/);
 assert.match(block,/local mediterranean = currentKey == "iberia"/);
 assert.match(block,/local textured = \(p:IsA\("MeshPart"\) and p\.TextureID ~= ""\)/);
 assert.match(block,/surfaceHasMaps\(sa\)/);
 assert.match(block,/child:IsA\("SpecialMesh"\) and child\.TextureId ~= ""/);
 assert.match(block,/if architecture and \(importedWhite or importedGray or \(distantHills and high - low <= 0\.14\s+and \(p\.Material == Enum\.Material\.Plastic or p\.Material == Enum\.Material\.SmoothPlastic\)\)\)/);
 assert.match(block,/local distantHills = kind == "Castle" and asset == "ground-hills" and not solid and desiredSize >= 80/);
 assert.match(block,/local role = p\.Name:lower\(\)/);
 assert.match(block,/if role:find\(key, 1, true\) then name = role; break end/);
 assert.match(port,/local painted = appearance ~= nil or surface\.MaterialVariant ~= ""/);
 assert.match(block,/if not textured then/);
 assert.match(block,/Enum\.Material\.Brick, wallColor/);
 assert.match(block,/Enum\.Material\.Slate, roofColor/);
 assert.match(block,/Enum\.Material\.WoodPlanks/);
 assert.match(block,/Enum\.Material\.Cobblestone/);
 assert.match(block,/m:SetAttribute\("ArchitectureRestoredSurfaces", restoredSurfaces\)/);
 assert.match(block,/m:SetAttribute\("ArchitectureCulture", currentKey\)/);
 assert.match(port,/houseTier = sceneLevel/);
 assert.match(port,/local tintColor = wallColor or style\.walls\[1\]/);
 assert.match(field,/asset:find\("kenney_", 1, true\)/);
 assert.match(field,/asset:find\("eastasia", 1, true\)/);
 assert.match(field,/local textured = \(d:IsA\("MeshPart"\) and d\.TextureID ~= ""\)/);
 assert.match(field,/if not textured and d\.MaterialVariant == "" and \(light >= 0\.80 and chroma <= 0\.13 or gray\)/);
 assert.match(block,/local importedGray = low >= 0\.35 and high - low <= 0\.10/);
 assert.match(field,/local gray = light >= 0\.35 and chroma <= 0\.10/);
 assert.match(field,/local textured = \(d:IsA\("MeshPart"\) and d\.TextureID ~= ""\) or sa ~= nil/);
 for(const role of ["windowpane","glazing","hinge","awning","canvas","cloth","door","frame","branch","fence"]){
   assert.ok(field.includes('name:find("'+role+'", 1, true)'),"탐험 소재 분류 누락: "+role);
 }
 for (const [rgb,plastic,expected] of [[[163,163,163],true,true],[[100,100,100],true,true],[[163,163,163],false,false],[[160,100,70],true,false]]) {
   const low=Math.min(...rgb)/255, high=Math.max(...rgb)/255;
   assert.equal(low>=0.35 && high-low<=0.10 && plastic,expected);
 }
 assert.match(field,/status:SetAttribute\("CombatEnabled", false\)/);
});


test('무료 CC0 건축 재질 3종 9맵은 원본 해시·승인·기존 Roblox 등록기 연결을 지킨다',()=>{
  const root='roblox-games/mare-essentia/assets/materials/';
  const approvals=JSON.parse(readText('roblox-games/mare-essentia/assets/APPROVED_IMAGES.json')).approved;
  const names=['mat_wall_plaster_beige','mat_wood_planks_worn','mat_stone_paving_historic'];
  for(const base of names)for(const suffix of ['bc','n','r']){
    const name=base+'_'+suffix;
    const file=root+name+'.jpg';
    const data=fs.readFileSync(file);
    assert.ok(data.length>=30000,'실제 CC0 지도 파일 누락: '+name);
    assert.equal(data[0],0xff,'JPEG 파일 형식 오류: '+name);
    assert.equal(data[1],0xd8,'JPEG 파일 형식 오류: '+name);
    const meta=JSON.parse(readText(file+'.license.json'));
    const hash=crypto.createHash('sha256').update(data).digest('hex');
    assert.equal(meta.sourceSha256,hash,'재질 원본 해시 오류: '+name);
    assert.equal(meta.license,'CC0-1.0','무료 상업 이용 라이선스 누락: '+name);
    assert.ok(meta.source.startsWith('https://'),'원본 공식 주소 누락: '+name);
    assert.equal(approvals['Materials/'+name],hash,'바이브 이미지 검수 해시 불일치: '+name);
  }
  const uploader=readText('tools/mare-essentia-upload-assets.mjs');
  const loader=read('ServerScriptService/AssetLoader.server.luau');
  assert.match(uploader,/\['materials', 'Materials'\]/);
  assert.match(uploader,/kind === 'Materials'/);
  assert.match(uploader,/CC0_MATERIAL_SOURCE_METADATA_REQUIRED/);
  assert.match(loader,/local MATERIAL_FINISHES = \{/);
  for(const name of ['Town/house','Town/bench_A','Town/bench_B','Town/cobblestones','Terrain/bridge-stone'])
    assert.ok(loader.includes('["'+name+'"] = {'),'UV 확인된 건축물에만 재질 적용: '+name);
  assert.match(loader,/model:SetAttribute\("PBRFinishPending"/);
  assert.doesNotMatch(loader,/surface\.(?:ColorMap|NormalMap|RoughnessMap|MetalnessMap)\s*=/,
    '서버 실행 중 PBR 맵에 쓰지 않는다');
  assert.match(loader,/and kind ~= "Materials"/);
  assert.match(uploader,/R15_OUTFIT_UV_AND_SOURCE_PROOF_REQUIRED/);
  assert.match(uploader,/const outfitUvUpgrade = item.kind === 'People'/);
  assert.match(uploader,/ORIGINAL_MODEL_SOURCE_CHANGED_REUPLOAD/);
});


// 주민의 원본 얼굴 데칼을 보존하고 덧붙인 가면을 금지한다.
test('R15 주민 얼굴은 공식 Studio 흰 얼굴 회귀를 막도록 기본 데칼을 보존한다',()=>{
  const source=readText('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/Pose.luau');
  const start=source.indexOf('local function drawFace(');
  const end=source.indexOf('local function addHat(',start);
  assert.ok(start>=0 && end>start,'기존 책임 함수 확인');
  const face=source.slice(start,end);
  assert.doesNotMatch(face,/MareFaceSurface|SurfaceGui|WeldConstraint|Enum\.PartType\.Ball/);
  assert.match(face,/if not decal then[\s\S]*Instance\.new\("Decal"\)/);
  assert.match(face,/decal\.Face\s*=\s*Enum\.NormalId\.Front/);
  assert.match(face,/decal\.Texture\s*=\s*"rbxasset:\/\/textures\/face\.png"/);
  assert.match(face,/decal\.Transparency\s*=\s*0/);
  assert.doesNotMatch(face,/decal:Destroy\(\)/);
  assert.match(face,/child:IsA\("Decal"\) and child.Face == Enum.NormalId.Front/);
  assert.match(face,/child ~= decal and child:IsA\("Decal"\) and child.Face == Enum.NormalId.Front then\s+child.Transparency = 1/);
  assert.doesNotMatch(face,/head\.TextureID\s*=/);
  const generated=source.slice(source.indexOf("function Pose.createR15("),source.indexOf("local headPart = model:FindFirstChild"));
  assert.match(generated,/if citizenCloth and not parent:IsA\("WorldModel"\) and descendant:IsA\("MeshPart"\) then\s+descendant.TextureID = ""\s+end\s+descendant.Color = skin/);
  assert.equal((generated.match(/descendant\.TextureID = ""/g)||[]).length,1);
  assert.match(source,/hairStyle == "short" and crownY - ext.Y \/ target.Size.Y < 0.20/);
  assert.match(source,/hairOffsetZ \+= math.clamp\(frontOverlap, 0, 0.18\)/);
  const shift=(style, height, depth, original=0)=>style==='short'&&0.65-height<0.20
    ?original+Math.max(0,Math.min(0.18,depth/2-original-0.42)):original;
  assert.ok(Math.abs(shift('short',1,1.1)-0.13)<1e-9);
  assert.equal(shift('short',1,0.8),0);
  assert.equal(shift('short',1,2),0.18);
  assert.equal(shift('short',0.3,1.1),0);
  assert.equal(shift('long',1.8,1.1),0);
  assert.equal(shift('bun',1.4,1.1),0);
});

// [무료 네모트론 디자인 검증] Studio 사진과 책임 코드에서 전 시각 범주를 안전하게 수정한다.
test('네모트론 전체 시각 범주: 공식 Studio 증거·격리 브랜치·다중 파일 소스 변경', async () => {
  const {validateReview, visualEditLooksSafe, applyVisualReplacements,
    authorizedCandidateBranch, verifiedStudioCapture} =
    await import('../tools/company-nemotron-design-review.mjs');
  const contract = JSON.parse(readText('company-learning/external-ai-distillation-policy.json')).directVisualDesign;
  const workflow = readText('.github/workflows/devloop-studio.yml');
  const pose = 'roblox-games/mare-essentia/src/ReplicatedStorage/Shared/Pose.luau';
  const port = 'roblox-games/mare-essentia/src/ReplicatedStorage/Shared/PortScene.luau';
  assert.equal(contract.enabled, true);
  assert.equal(contract.directCandidateSourceEditAllowed, true);
  assert.equal(contract.directMainWriteForbidden, true);
  assert.equal(contract.independentQaRequiredBeforePromotion, true);
  assert.ok(contract.visualCategories.length >= 20);
  assert.ok(contract.allowedSourceFiles.length >= 16);
  assert.ok(contract.allowedSourceFiles.includes(pose));
  assert.ok(contract.allowedSourceFiles.includes(port));
  assert.ok(contract.allowedSourceFiles.every(file => fs.existsSync(file)),
    '정책에 없는 파일을 모델이 상상해서 수정하면 안 된다');
  assert.equal(contract.maximumCandidateFilesPerRun, 4);
  assert.equal(contract.maximumSourceEditsPerRun, 10);
  assert.equal(contract.maximumReplacementBytes, 1800);
  assert.match(workflow, /NVIDIA_FREE_TIER_VERIFIED/);
  assert.match(workflow, /nemotron-mare-design-/);
  assert.match(workflow, /gh pr create --base main/);
  assert.match(workflow, /NEMOTRON_CANDIDATE=BLOCKED_UNAUTHORIZED_FILE_CHANGE/);
  // 부분 체크아웃의 누락 blob 대신 서버 원본 tree와 정확한 parent를 사용한다.
  assert.match(workflow, /base_tree = \[string\]\$baseCommit\.tree\.sha/);
  assert.match(workflow, /parents = @\(\$candidateSource\)/);
  assert.match(workflow, /NEMOTRON_CANDIDATE_SOURCE_IDENTITY_MISMATCH/);
  assert.match(workflow, /NEMOTRON_CANDIDATE_UNEXPECTED_STAGED_CHANGE/);
  assert.match(workflow, /NEMOTRON_CANDIDATE_REF_IDENTITY_MISMATCH/);
  assert.match(workflow, /NEMOTRON_CANDIDATE_SERVER_TREE_PUBLISHED=1/);
  assert.doesNotMatch(workflow, /git push[^\n]*\$designBranch/);
  assert.match(workflow, /node --test qa\/mare-essentia-datastore-name\.test\.mjs/);
  assert.equal(authorizedCandidateBranch('nemotron-mare-design-44238657398', '44238657398'), true);
  assert.equal(authorizedCandidateBranch('main', '44238657398'), false);
  assert.equal(authorizedCandidateBranch('nemotron-mare-design-44238657398', '44238657399'), false);
  assert.equal(authorizedCandidateBranch('nemotron-mare-design-../main', '44238657398'), false);

  // [Studio 캡처 진위] 해시/파일명만으로는 화면 실행 통과를 인정하지 않는다.
  const revision = 'a'.repeat(40);
  const images = ['harbor_npc_face_front-0.jpg', 'harbor_motion_idle-0.jpg'];
  const photos = images.map(name => ({name}));
  const studio = {sourceRevision: revision, errors: [], summary: {capturedFrames: 2},
    log: [{capture: 'harbor_npc_face_front'}, {capture: 'harbor_motion_idle'}]};
  assert.equal(verifiedStudioCapture(studio, photos, revision), true);
  assert.equal(verifiedStudioCapture({...studio, errors: ['failed']}, photos, revision), false);
  assert.equal(verifiedStudioCapture(studio, photos, 'b'.repeat(40)), false);
  assert.equal(verifiedStudioCapture({...studio, log: []}, photos, revision), false);
  assert.equal(verifiedStudioCapture({...studio, summary: {capturedFrames: 1}}, photos, revision), false);

  // [디자인 특화 AI] 정확히 존재하는 원본 한 줄을 동일 문맥의 시각 표현으로만 교체한다.
  const oldPose = '\tdecal.Transparency = 0';
  const newPose = '\tdecal.Transparency = 0.05';
  const oldPort = '\tlocal harborColor = Color3.fromRGB(51, 40, 30)';
  const newPort = '\tlocal harborColor = Color3.fromRGB(60, 45, 32)';
  const issue = (category, screenshot) => ({category, screenshot, severity: 'medium',
    evidence: 'The exact source-backed visual element is too bright and lacks contrast.'});
  const response = {issues: [issue('npc-face', images[0]), issue('environment', images[1])],
    edits: [
      {path: pose, category: 'npc-face', screenshot: images[0], before: oldPose, after: newPose},
      {path: port, category: 'environment', screenshot: images[1], before: oldPort, after: newPort}
    ]};
  const reviewed = validateReview(JSON.stringify(response), images, contract);
  assert.equal(reviewed.edits.length, 2);
  // [모델 허위 파일 차단] 원문은 모델이 다시 작성하지 않고 Studio 촬영 후 고정한 색인에서 조회.
  const pinnedAnchors = [{anchor: 0, path: pose, before: oldPose},
    {anchor: 1, path: port, before: oldPort}];
  const anchored = validateReview({issues: response.issues,
    edits: response.edits.map((row, anchor) =>
      ({anchor, category: row.category, screenshot: row.screenshot, after: row.after}))},
  images, contract, pinnedAnchors);
  assert.deepEqual(anchored.edits, reviewed.edits);
  assert.throws(() => validateReview({issues: response.issues,
    edits: [{anchor: 10, category: 'npc-face', screenshot: images[0], after: newPose}]},
  images, contract, pinnedAnchors), /EDIT_NOT_VISUAL_OR_NOT_IN_POLICY/);
  assert.throws(() => validateReview({issues: response.issues,
    edits: [{anchor: 0, path: port, category: 'npc-face', screenshot: images[0], after: newPose}]},
  images, contract, pinnedAnchors), /EDIT_NOT_VISUAL_OR_NOT_IN_POLICY/);
  assert.match(reviewed.issues[0].evidenceSha256, /^[0-9a-f]{64}$/);
  assert.equal(reviewed.issues[0].evidence, undefined);
  assert.ok(visualEditLooksSafe(oldPose, newPose));
  assert.ok(visualEditLooksSafe(oldPort, newPort));
  assert.equal(visualEditLooksSafe('\tgui.LightInfluence = 0.6',
    '\tgui.LightInfluence = 0.35; game:Shutdown()'), false);
  assert.equal(visualEditLooksSafe('\tgui.LightInfluence = 0.6',
    '\tgui.LightInfluence = 0.35\nlocal evil = true'), false);
  assert.equal(visualEditLooksSafe('\tlocal color = Color3.fromRGB(1,2,3)',
    '\tlocal color = Color3.fromRGB(1,2,3) or require(42)'), false);
  assert.equal(visualEditLooksSafe('\tq.Material = Enum.Material.Fabric',
    '\tq.Material = Enum.Material.Metal'), true);
  assert.equal(visualEditLooksSafe('\tgameGold = 100', '\tgameGold = 999'), false);
  assert.equal(visualEditLooksSafe('\tq.CanCollide = false', '\tq.CanCollide = true'), false);
  assert.equal(visualEditLooksSafe('\tlocal icon = "rbxassetid://123"',
    '\tlocal icon = "rbxassetid://456"'), false);

  const sources = {[pose]: oldPose + '\n', [port]: oldPort + '\n'};
  const candidate = applyVisualReplacements(sources, reviewed.edits, contract);
  assert.equal(candidate.files.size, 2);
  assert.equal(candidate.changes.length, 2);
  assert.equal(candidate.files.get(pose), newPose + '\n');
  assert.equal(candidate.files.get(port), newPort + '\n');
  // [회귀] 시각값 충돌도 실제 원본 기준으로 일괄 교체하며 CRLF·LF를 섞어도 훼손하지 않는다.
  const first = '\tgui.LightInfluence = 0.6';
  const second = '\tgui.LightInfluence = 0.3';
  const mixed = first + '\r\n' + second + '\n';
  const batch = applyVisualReplacements({[pose]: mixed}, [
    {path: pose, before: first, after: second, category: reviewed.edits[0].category,
      screenshot: reviewed.edits[0].screenshot},
    {path: pose, before: second, after: '\tgui.LightInfluence = 0.8',
      category: reviewed.edits[0].category, screenshot: reviewed.edits[0].screenshot}
  ], contract);
  assert.equal(batch.files.get(pose), second + '\r\n' + '\tgui.LightInfluence = 0.8\n');
  assert.throws(() => applyVisualReplacements({[pose]: mixed}, [
    {...reviewed.edits[0], before: first, after: second},
    {...reviewed.edits[0], before: first, after: '\tgui.LightInfluence = 0.4'}
  ], contract), /DUPLICATE_SOURCE_ANCHOR/);
  assert.equal(readText(pose).includes(oldPose), true,
    '원본 책임 게임 파일의 기존 기준선은 변경하지 않는다');
  assert.throws(() => validateReview({...response,
    edits: [{...response.edits[0], path: 'roblox-games/mare-essentia/src/ServerScriptService/Core.server.luau'}]},
    images, contract), /EDIT_NOT_VISUAL_OR_NOT_IN_POLICY/);
  assert.throws(() => validateReview({...response,
    edits: [response.edits[0], response.edits[0]]}, images, contract),
  /DUPLICATE_SOURCE_ANCHOR/);
  assert.throws(() => validateReview({...response,
    edits: [{...response.edits[0], before: '\tDamage = 5', after: '\tDamage = 50'}]},
    images, contract), /EDIT_NOT_VISUAL_OR_NOT_IN_POLICY/);
  assert.throws(() => applyVisualReplacements({[pose]: oldPose + '\n' + oldPose},
    [reviewed.edits[0]], contract), /SOURCE_ANCHOR_NOT_UNIQUE/);
  assert.throws(() => applyVisualReplacements({}, [reviewed.edits[0]], contract),
    /SOURCE_FILE_NOT_FOUND/);
});


// [무료 디자인 전문가 회귀] 전문 분야, 일일 한도, 쿨다운, 독립 전후 판정.
test('무료 디자인 7개 모델은 역할별·인증·일일 한도·쿨다운을 지킨다', async () => {
  const {DESIGN_FREE_MODELS, designRoleForFrames, selectFreeDesignModels, selectDesignFrameRole,
    validateVisualComparison, verifiedDesignFeedback, mergeFreeVisualUsage,
    rankVisualSourceFiles, visualEditLooksSafe} =
      await import('../tools/company-nemotron-design-review.mjs');
  const policy = JSON.parse(readText('company-learning/external-ai-distillation-policy.json'));
  const config = policy.directVisualDesign.freeSpecialistPool;
  assert.equal(config.paidFallbackForbidden, true);
  assert.equal(config.accountTierProofRequired, false);
  assert.equal(config.maxCallsPerCapture, 3);
  assert.equal(DESIGN_FREE_MODELS.length, 7);
  assert.ok(DESIGN_FREE_MODELS.every(model => config.modelIds.includes(model.id)));
  assert.ok(DESIGN_FREE_MODELS.every(model => model.provider !== 'OPENROUTER' ||
    model.model.endsWith(':free')));
  const env = {
    NVIDIA_API_KEY: 'test-key', NVIDIA_FREE_TIER_VERIFIED: 'YES',
    GEMINI_API_KEY: 'test-key', GEMINI_DESIGN_FREE_TIER_VERIFIED: 'YES',
    OPENROUTER_API_KEY: 'test-key', OPENROUTER_DESIGN_FREE_TIER_VERIFIED: 'YES'
  };
  const now = Date.parse('2026-11-18T07:00:00Z');
  const day = new Date(now).toISOString().slice(0, 10);
  assert.equal(designRoleForFrames(['npc_face-0.jpg']), 'NPC');
  assert.equal(designRoleForFrames(['ship_harbor-0.jpg']), 'WORLD');
  assert.equal(designRoleForFrames(['menu_ui-0.jpg']), 'UI');
  assert.equal(designRoleForFrames(['run_motion-0.jpg']), 'MOTION');
  const captures = JSON.parse(readText(
    'roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-qa-click.json'))
    .filter(step => step.type === 'capture').map(step => step.name + '-0.jpg');
  const roles = ['NPC', 'WORLD', 'UI', 'MOTION', 'GENERAL'];
  assert.deepEqual(roles.map(role => selectDesignFrameRole(captures, role)),
    ['WORLD', 'UI', 'MOTION', 'GENERAL', 'NPC']);
  assert.equal(selectDesignFrameRole(captures), 'NPC');
  const modelAvailability = [];
  assert.equal(selectFreeDesignModels({policy, env: {}, now, diagnostics: modelAvailability}).length, 0);
  assert.equal(modelAvailability.length, 7);
  assert.ok(modelAvailability.every(row => row.status === 'KEY_MISSING'));
  assert.ok(modelAvailability.every(row =>
    Object.keys(row).join(',') === 'modelId,provider,status'),
  '키 원문, 플래그 값, 계정 정보는 증거 파일에 노출하지 않는다');
  const keyed = [];
  const keyedModels = selectFreeDesignModels({policy, now,
    env: {NVIDIA_API_KEY: 'private-key'}, diagnostics: keyed});
  assert.ok(keyedModels.some(row => row.id === 'NVIDIA_VL'),
    '무료 허용 모델과 키가 있으면 불필요한 확인 플래그 없이 배정');
  assert.equal(keyed.find(row => row.modelId === 'NVIDIA_VL').status, 'READY');
  const files = policy.directVisualDesign.allowedSourceFiles;
  const npcSources = rankVisualSourceFiles(files, 'NPC');
  const worldSources = rankVisualSourceFiles(files, 'WORLD');
  const uiSources = rankVisualSourceFiles(files, 'UI');
  assert.match(npcSources[0], /\/Pose\.luau$/);
  assert.match(worldSources[0], /\/PortScene\.luau$/);
  assert.match(worldSources[1], /\/PortBuildings\.luau$/);
  assert.match(uiSources[0], /\/Game\.client\.luau$/);
  for (const paths of [npcSources, worldSources, uiSources]) {
    assert.ok(paths.length <= 6 && paths.every(file => files.includes(file)));
  }
  const tintBefore = '\tmineral = { building = "workshop", name = "광물 제련소", kind = "Town", asset = "workbench-anvil", tint = { 145, 133, 122 } },';
  const tintAfter = tintBefore.replace('145, 133, 122', '150, 130, 120');
  assert.equal(visualEditLooksSafe(tintBefore, tintAfter), true);
  assert.equal(visualEditLooksSafe(tintBefore,
    tintBefore.replace('145, 133, 122', '256, 130, 120')), false);
  assert.equal(visualEditLooksSafe(tintBefore,
    tintBefore.replace('workbench-anvil', 'unlicensed-new-asset')), false);
  const designSource = readText('tools/company-nemotron-design-review.mjs');
  assert.match(designSource, /visualAnchors\(contract\.allowedSourceFiles, designRuntime\.selectedRole\)/);
  assert.match(designSource, /SKIPPED_FREE_DESIGN_POOL_UNAVAILABLE[\s\S]*modelAvailability: diagnostics/);

  const models = opts => selectFreeDesignModels({policy, env, now, ...opts});
  assert.equal(models({frameNames: ['npc_face-0.jpg']})[0].id, 'NVIDIA_VL');
  assert.equal(models({frameNames: ['ship-0.jpg']})[0].id, 'GEMINI_FLASH');
  assert.equal(models({frameNames: ['menu_ui-0.jpg']})[0].id, 'OPENROUTER_GEMMA');
  assert.equal(models({frameNames: ['walk_motion-0.jpg']})[0].id, 'OPENROUTER_OMNI');
  assert.ok(!models({frameNames: ['npc_face-0.jpg'],
    previous: {usageWindow: {day, calls: {NVIDIA: 12, GEMINI: 12, OPENROUTER: 30}}}}).length);
  assert.ok(models({frameNames: ['npc_face-0.jpg'],
    previous: {usageWindow: {day, calls: {NVIDIA: 12}}}})
    .every(model => model.provider !== 'NVIDIA'));
  assert.ok(models({frameNames: ['npc_face-0.jpg'],
    previous: {cooldowns: {NVIDIA_VL: '2026-11-18T08:00:00Z'}}})
    .every(model => model.id !== 'NVIDIA_VL'));
  assert.ok(selectFreeDesignModels({policy, env: {
    NVIDIA_API_KEY: 'test-key', NVIDIA_FREE_TIER_VERIFIED: 'NO'
  }}).some(model => model.id === 'NVIDIA_VL'),
  '무료 모델은 예전 플래그가 NO여도 사용');
  assert.throws(() => selectFreeDesignModels({
    policy: {directVisualDesign: {freeSpecialistPool: {...config, paidFallbackForbidden: false}}},
    env
  }), /FREE_SPECIALIST_POLICY_DENIED/);
  const evidence = name => ({
    screenshot: name, evidence: 'Compared with the actual baseline, this visible feature has noticeably improved.'
  });
  const pass = validateVisualComparison({
    verdict: 'PASS', improvements: [evidence('npc_face-0.jpg'), evidence('npc_hair-0.jpg')],
    regressions: []
  }, ['npc_face-0.jpg', 'npc_hair-0.jpg']);
  assert.equal(pass.status, 'PASS');
  assert.match(pass.improvements[0].evidenceSha256, /^[a-f0-9]{64}$/);
  assert.equal(pass.improvements[0].evidence, undefined);
  assert.equal(validateVisualComparison({
    verdict: 'PASS', improvements: [evidence('npc_face-0.jpg')], regressions: []
  }, ['npc_face-0.jpg']).status, 'UNVERIFIED');
  assert.equal(validateVisualComparison({
    verdict: 'PASS', improvements: [evidence('npc_face-0.jpg'), evidence('npc_hair-0.jpg')],
    regressions: [evidence('npc_face-0.jpg')]
  }, ['npc_face-0.jpg', 'npc_hair-0.jpg']).status, 'UNVERIFIED');
  assert.throws(() => validateVisualComparison({
    verdict: 'PASS', improvements: [evidence('invented.jpg')], regressions: []
  }, ['npc_face-0.jpg']), /VISUAL_COMPARISON_EVIDENCE_INVALID/);
  // [검증 증거 학습] 실제 Studio 소스·이미지·다른 제공자 검증을 모두 만족한 모델만 우선 배치.
  const original = {sourceRevision: 'a'.repeat(40), status: 'CANDIDATE_EDITED',
    provider: 'GEMINI', model: 'gemini-3.8-flash', selectedRole: 'NPC'};
  const frameA = 'harbor_npc_sparring_01-0.jpg', frameB = 'harbor_npc_sparring_02-0.jpg';
  const comparison = {
    verifiedAt: new Date(now - 60000).toISOString(),
    status: 'VISUAL_BEFORE_AFTER_PASS', sourceRevision: 'b'.repeat(40),
    beforeRevision: original.sourceRevision, candidateRevision: 'b'.repeat(40),
    authorProvider: 'GEMINI', authorModel: 'gemini-3.8-flash',
    selectedRole: 'NPC', reviewerProvider: 'OPENROUTER', reviewerModel: 'google/gemma-4-31b-it:free',
    independentQaPassed: true, afterStudioPassed: true,
    comparison: {status: 'PASS', improvements: [
      {screenshot: frameA, evidenceSha256: 'c'.repeat(64)},
      {screenshot: frameB, evidenceSha256: 'd'.repeat(64)}
    ], regressions: []},
    beforeFrames: [
      {name: frameA, sha256: '1'.repeat(64)}, {name: frameB, sha256: '2'.repeat(64)}
    ],
    afterFrames: [
      {name: frameA, sha256: '3'.repeat(64)}, {name: frameB, sha256: '4'.repeat(64)}
    ]
  };
  assert.equal(verifiedDesignFeedback(original, comparison, now)?.model, original.model);
  assert.equal(models({frameNames: [frameA], previous: original, feedback: comparison})[0].id,
    'GEMINI_FLASH', '다른 제공자의 실물 전후 검증이 확인된 모델만 우선 선택');
  assert.equal(verifiedDesignFeedback(original, {
    ...comparison, verifiedAt: new Date(now - 8 * 86400000).toISOString()
  }, now), null, '7일 지난 디자인 결과 재학습 금지');
  assert.equal(verifiedDesignFeedback(original, {
    ...comparison, reviewerProvider: 'GEMINI'}, now), null,
    '동일 제공자 자기 평가만으로 긍정 학습 금지');
  assert.equal(verifiedDesignFeedback(original, {
    ...comparison, beforeRevision: 'f'.repeat(40)}, now), null,
    '과거 기준선과 다른 사진 검증을 재사용하면 안 된다');
  assert.equal(verifiedDesignFeedback(original, {
    ...comparison, afterStudioPassed: false}, now), null);
  assert.equal(verifiedDesignFeedback(original, {
    ...comparison, comparison: {...comparison.comparison, regressions: [{
      screenshot: frameA, evidenceSha256: 'e'.repeat(64)
    }]}}, now), null);
  assert.equal(verifiedDesignFeedback(original, {
    ...comparison, afterFrames: comparison.beforeFrames}, now), null,
    '사진이 모두 같으면 디자인 개선 성공이라 할 수 없다');
  const beforeCount = {...original, usageWindow: {day, calls: {GEMINI: 2, OPENROUTER: 0}}};
  const verifiedCalls = {...comparison, gameId: 'mare-essentia',
    usageWindow: {day, calls: {GEMINI: 3, OPENROUTER: 2}},
    cooldowns: {OPENROUTER_GEMMA: new Date(now + 60000).toISOString()}};
  const accounting = mergeFreeVisualUsage(beforeCount, verifiedCalls, now);
  assert.equal(accounting.usageWindow.calls.GEMINI, 3,
    '초안 생성과 독립 검수 누적 사용량을 중복 합계하지 않고 이어받는다');
  assert.equal(accounting.usageWindow.calls.OPENROUTER, 2);
  assert.ok(accounting.cooldowns.OPENROUTER_GEMMA);
  assert.equal(mergeFreeVisualUsage(beforeCount, {...verifiedCalls,
    beforeRevision: 'f'.repeat(40)}, now).usageWindow.calls.OPENROUTER, 0,
  '다른 기준선의 검증 사용량을 신뢰하면 안 된다');
  assert.equal(mergeFreeVisualUsage(beforeCount, {...verifiedCalls,
    usageWindow: {day, calls: {GEMINI: 1, OPENROUTER: 1}}}, now).usageWindow.calls.GEMINI, 2,
  '과거 사용량을 줄여 무료 호출을 늘릴 수 없다');
  assert.equal(models({frameNames: [frameA], previous: beforeCount,
    feedback: {...verifiedCalls, usageWindow: {day, calls: {GEMINI: 12, OPENROUTER: 2}}}})
    .some(model => model.provider === 'GEMINI'), false,
  '독립 검수에서 소진한 공급자는 다음 디자인 작업이 재사용할 수 없다');
  assert.deepEqual(models({frameNames: [frameA]}).slice(0, 3).map(model => model.provider),
    ['NVIDIA', 'OPENROUTER', 'GEMINI'],
    '한도 소진이나 장애에 대비해 다른 무료 공급자를 먼저 교대한다');
  assert.equal(models({frameNames: [frameA], previous: {
    ...original, attempts: [{id: 'NVIDIA_VL', status: 'REVIEW_INVALID'}]}
  })[0].id, 'OPENROUTER_NEMOTRON',
  '동일 분야에서 허위 앵커 또는 잘못된 JSON을 낸 모델은 다음 호출에 후순위');
  assert.equal(models({frameNames: [frameA], feedback: comparison, previous: {
    ...original, usageWindow: {day, calls: {GEMINI: 12}}
  }})[0].provider, 'NVIDIA', '성공 학습도 무료 사용량 상한을 해제하지 못한다');

  const workflow = readText('.github/workflows/devloop-studio.yml');
  assert.match(workflow, /--feedback=\$priorVisualFeedback/);
  assert.match(workflow, /--mode=verify/);
  assert.match(workflow, /DESIGN_AUTO_MERGE=MERGED_AFTER_STUDIO_VISUAL_SECURITY_QA/);
  assert.match(workflow, /company-roblox-source-drift-sync\.yml/);
  assert.match(workflow, /STUDIO_CANDIDATE_REF/);
});

 
// [무료 AI 관제 회귀] 기존 Studio 디자인 모델 선택기 안에서만 잔량·초기화·예비량을 검증한다.
test('무료 디자인 한도 예측은 계정 전체 잔량을 주장하지 않는다', async () => {
  const {freeDesignWindowId, forecastFreeDesignQuota, mergeFreeVisualUsage,
    selectFreeDesignModels} = await import('../tools/company-nemotron-design-review.mjs');
  const time = Date.parse('2026-11-18T08:30:00Z');
  assert.equal(freeDesignWindowId('GEMINI', Date.parse('2026-11-18T07:30:00Z')),
    '2026-11-17', '미국 태평양 자정 전에는 이전 일일 창을 유지해야 한다');
  assert.equal(freeDesignWindowId('GEMINI', time), '2026-11-18');
  assert.equal(freeDesignWindowId('OPENROUTER', time), '2026-11-18');
  assert.equal(freeDesignWindowId('GEMINI', Date.parse('2026-03-08T08:30:00Z')),
    '2026-03-08', '서머타임 전환일에도 로컬 날짜를 정확히 계산한다');
  const previous = {usageWindow: {
    day: '2026-11-18',
    windowIds: {NVIDIA: '2026-11-18', GEMINI: '2026-11-17',
      OPENROUTER: '2026-11-18'},
    calls: {NVIDIA: 5, GEMINI: 12, OPENROUTER: 20},
    firstCallAtByProvider: {NVIDIA: '2026-11-18T06:30:00Z'}
  }};
  const carried = mergeFreeVisualUsage(previous, {}, time).usageWindow;
  assert.equal(carried.calls.GEMINI, 0, '제미나이 공식 새 날짜의 내부 소비량만 갱신');
  assert.equal(carried.calls.OPENROUTER, 20, '다른 업체 소비량은 제미나이 초기화로 복구하지 않는다');
  assert.equal(carried.calls.NVIDIA, 5);
  const snapshot = forecastFreeDesignQuota(carried, time);
  assert.equal(snapshot.NVIDIA.remainingLocal, 7);
  assert.equal(snapshot.NVIDIA.regularWorkRemaining, 4);
  assert.equal(snapshot.NVIDIA.emergencyReserveRemaining, 3);
  assert.equal(snapshot.NVIDIA.estimatedCallsPerHour, 2);
  assert.equal(snapshot.NVIDIA.estimatedHoursToLocalCap, 3.5);
  assert.equal(snapshot.GEMINI.nextLocalWindowAt, '2026-11-19T08:00:00.000Z');
  assert.equal(snapshot.GEMINI.resetBasis, 'PACIFIC_DAILY');
  assert.equal(snapshot.OPENROUTER.resetBasis, 'INTERNAL_UTC_DAY_NOT_PROVIDER_CONFIRMED');
  assert.ok(Object.values(snapshot).every(row => row.accountWideBalanceVerified === false &&
    row.scope === 'STUDIO_VISUAL_ONLY'),
  '디자인 자체 제한을 전체 계정 잔량으로 표시하면 안 된다');
  const policy = JSON.parse(readText('company-learning/external-ai-distillation-policy.json'));
  const env = {
    NVIDIA_API_KEY: 'fixture', NVIDIA_FREE_TIER_VERIFIED: 'YES',
    GEMINI_API_KEY: 'fixture', GEMINI_DESIGN_FREE_TIER_VERIFIED: 'YES',
    OPENROUTER_API_KEY: 'fixture', OPENROUTER_DESIGN_FREE_TIER_VERIFIED: 'YES'
  };
  const reserveFirst = selectFreeDesignModels({policy, env, now: time,
    frameNames: ['npc_face-0.jpg'],
    previous: {usageWindow: {day: '2026-11-18', calls: {NVIDIA: 10}}}});
  assert.equal(reserveFirst[0].provider, 'OPENROUTER',
    '긴급 예비량만 남은 제공자보다 일반 작업 여유가 있는 제공자를 우선 사용');
  assert.ok(reserveFirst.some(row => row.provider === 'NVIDIA'),
    '예비량은 소진 전 차단이 아니라 후순위로 보전한다');
  assert.equal(forecastFreeDesignQuota({day: '2026-11-18', calls: {NVIDIA: 1}}, time)
    .NVIDIA.estimatedHoursToLocalCap, null,
  '호출 속도 관측이 부족하면 소진 시간을 지어내지 않는다');
});

 
// [공식 계약 회귀] OpenRouter는 무료 계정 여부를 검증하지만 무료 모델 잔량을 제공하지 않는다.
test('오픈라우터 공식 무료 계정 상태를 조회하고 미공개 호출 잔량은 추정하지 않는다', async () => {
  const {inspectOpenRouterFreeTier, forecastFreeDesignQuota, selectFreeDesignModels} =
    await import('../tools/company-nemotron-design-review.mjs');
  const secret = 'private-key-should-not-appear';
  const env = {OPENROUTER_API_KEY: secret, OPENROUTER_DESIGN_FREE_TIER_VERIFIED: 'YES'};
  let calls = 0;
  const tier = await inspectOpenRouterFreeTier({env, fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, 'https://openrouter.ai/api/v1/key');
    assert.equal(options.method, 'GET');
    assert.equal(options.headers.Authorization, 'Bearer ' + secret);
    return {ok: true, json: async () => ({data: {
      is_free_tier: true, usage_daily: 0, limit_remaining: 0
    }})};
  }});
  assert.equal(calls, 1);
  assert.equal(tier.scope, 'OPENROUTER_ACCOUNT_TIER');
  assert.equal(tier.isFreeTier, true);
  assert.ok(!JSON.stringify(tier).includes(secret), '원문 키와 계정 결제정보는 증거에서 제거');
  const now = Date.parse('2026-11-18T08:30:00Z');
  const forecast = forecastFreeDesignQuota({day: '2026-11-18',
    calls: {OPENROUTER: 1}}, now, tier);
  assert.equal(forecast.OPENROUTER.remainingLocal, 29);
  assert.equal(forecast.OPENROUTER.effectiveRemaining, 29);
  assert.equal(forecast.OPENROUTER.accountWideBalanceVerified, false);
  assert.equal(forecast.OPENROUTER.accountWideFreeRemaining, null);
  assert.equal(forecast.OPENROUTER.accountFreeTierVerified, true);
  const policy = JSON.parse(readText('company-learning/external-ai-distillation-policy.json'));
  assert.ok(selectFreeDesignModels({policy, env, now, accountQuota: tier})
    .some(model => model.provider === 'OPENROUTER'),
    '무료 인증 키와 무료 모델 고정 규칙을 함께 충족할 때만 배정');
  const paid = await inspectOpenRouterFreeTier({env,
    fetchImpl: async () => ({ok: true, json: async () => ({data: {is_free_tier: false}})})});
  const diagnostics = [];
  assert.ok(!selectFreeDesignModels({policy, env, now, accountQuota: paid, diagnostics})
    .some(model => model.provider === 'OPENROUTER'));
  assert.equal(diagnostics.find(row => row.modelId === 'OPENROUTER_GEMMA').status,
    'ACCOUNT_NOT_FREE_TIER', '계정이 유료 상태라면 요청하지 않는다');
  assert.equal(await inspectOpenRouterFreeTier({
    env: {OPENROUTER_API_KEY: secret},
    fetchImpl: async () => {throw Error('unverified account request');}
  }), null, '명시적인 무료 확인 전에는 조회하지 않는다');
  assert.equal(await inspectOpenRouterFreeTier({env,
    fetchImpl: async () => ({ok: true, json: async () => ({
      data: {free_model_daily_requests: {used: 1, limit: 50, remaining: 49}}
    })})}), null, '공식 명세에 없는 필드는 무료 잔량 증거로 사용 금지');
});

// [네모트론 빈 답변 방지] 2026-11-18 실제 무료 호출이 EMPTY_OUTPUT으로 끝난 증거에 대응한다.
// 공식 NVIDIA 추론 비활성 옵션을 실전 요청 본문에 직접 싣고, 다른 무료 제공자 요청은 보존한다.
test('네모트론 3.5 실제 이미지 API 요청은 추론 토큰 낭비 없이 JSON 본문을 받는다', async () => {
  const {DESIGN_FREE_MODELS, callFreeDesignModel} =
    await import('../tools/company-nemotron-design-review.mjs');
  const nvidia = DESIGN_FREE_MODELS.find(row => row.id === 'NVIDIA_VL');
  const router = DESIGN_FREE_MODELS.find(row => row.id === 'OPENROUTER_GEMMA');
  assert.ok(nvidia && router);
  const env = {NVIDIA_API_KEY: 'fixture-key', OPENROUTER_API_KEY: 'fixture-other-key'};
  const frame = {name: 'harbor_npc_face_front-0.jpg', url: 'data:image/jpeg;base64,YWJj'};
  let calls = 0;
  const stub = async (url, request) => {
    calls++;
    assert.equal(request.method, 'POST');
    const body = JSON.parse(request.body);
    assert.equal(body.stream, false);
    assert.equal(body.messages[0].content[1].image_url.url, frame.url);
    if (body.model === nvidia.model) {
      assert.equal(url, nvidia.endpoint);
      assert.equal(request.headers.Authorization, 'Bearer fixture-key');
      assert.deepEqual(body.chat_template_kwargs, {enable_thinking: false},
        'NVIDIA 공식 직접 답변 모드로 빈 추론 출력 차단');
      assert.equal(body.response_format.type, 'json_schema');
      assert.equal(body.response_format.json_schema.name, 'mare_visual_design');
      assert.equal(body.response_format.json_schema.strict, true);
      assert.deepEqual(body.response_format.json_schema.schema.required,
        ['issues', 'edits'], 'NVIDIA 필수 JSON 응답 키를 모델 단계부터 강제');
    } else {
      assert.equal(url, router.endpoint);
      assert.equal(request.headers.Authorization, 'Bearer fixture-other-key');
      assert.equal(body.chat_template_kwargs, undefined,
        '다른 제공자 전용 요청 구조를 임의 변경하지 않는다');
      assert.equal(body.response_format, undefined,
        '다른 제공자 응답 형식 계약을 임의 변경하지 않는다');
    }
    return {ok: true, json: async () => ({
      usage: {cost: 0},
      choices: [{finish_reason: 'stop', message: {content: '{"issues":[],"edits":[]}'}}]
    })};
  };
  const result = await callFreeDesignModel(nvidia, 'Inspect verified photo', [frame], stub, env);
  assert.equal(result.status, 'OK');
  assert.equal(JSON.parse(result.text).edits.length, 0);
  assert.equal((await callFreeDesignModel(router, 'Inspect photo', [frame], stub, env)).status, 'OK');
  assert.equal(calls, 2);
  const exceeded = await callFreeDesignModel(nvidia, 'Inspect photo', [frame],
    async () => ({ok: true, json: async () => ({
      choices: [{finish_reason: 'length', message: {content: ''}}]
    })}), env);
  assert.equal(exceeded.status, 'EMPTY_OUTPUT_TOKEN_LIMIT',
    '토큰 소진을 정상 검증이나 수정 성공으로 위장하지 않는다');
  const empty = await callFreeDesignModel(nvidia, 'Inspect photo', [frame],
    async () => ({ok: true, json: async () => ({
      choices: [{finish_reason: 'stop', message: {content: ''}}]
    })}), env);
  assert.equal(empty.status, 'EMPTY_OUTPUT');
  const paid = await callFreeDesignModel(nvidia, 'Inspect photo', [frame],
    async () => ({ok: true, json: async () => ({
      usage: {cost: 0.01}, choices: [{message: {content: '{}'}}]
    })}), env);
  assert.equal(paid.status, 'NONZERO_COST_BLOCKED',
    '유료 호출 결과는 어떤 모델의 답변이라도 후보로 수용하지 않는다');
});


// [외부 무료 AI 7종] 실제 사용자 키 없이 같은 요청 함수를 통해 요청/무료/비용 차단 회귀검사.
test('무료 디자인 7개 모델 전체는 지정 엔드포인트로만 이미지 요청하고 과금 응답을 차단한다', async () => {
  const {DESIGN_FREE_MODELS, callFreeDesignModel} =
    await import('../tools/company-nemotron-design-review.mjs');
  const env = {
    NVIDIA_API_KEY: 'test-nvidia-key',
    GEMINI_API_KEY: 'test-gemini-key',
    OPENROUTER_API_KEY: 'test-router-key'
  };
  const frame = {name: 'harbor_npc_face_front-0.jpg', url: 'data:image/jpeg;base64,YWJj'};
  assert.equal(DESIGN_FREE_MODELS.length, 7);
  const seen = new Set();
  for (const model of DESIGN_FREE_MODELS) {
    assert.ok(!seen.has(model.id), '중복 모델 배치 금지: ' + model.id);
    seen.add(model.id);
    let calls = 0;
    const fakeFetch = async (url, request) => {
      calls++;
      assert.equal(url, model.endpoint);
      assert.equal(request.method, 'POST');
      const body = JSON.parse(request.body);
      assert.ok(!request.body.includes(env[model.keyName]),
        'API 키를 본문에 포함하지 않는다: ' + model.id);
      if (model.provider === 'GEMINI') {
        assert.equal(request.headers['x-goog-api-key'], env.GEMINI_API_KEY);
        assert.equal(body.contents[0].parts[0].text, 'inspect approved image');
        assert.deepEqual(body.contents[0].parts[1].inlineData,
          {mimeType: 'image/jpeg', data: 'YWJj'});
        assert.equal(body.generationConfig.responseMimeType, 'application/json');
        return {ok: true, json: async () => ({
          candidates: [{content: {parts: [{text: '{"issues":[],"edits":[]}' }]}}]
        })};
      }
      assert.equal(request.headers.Authorization, 'Bearer ' + env[model.keyName]);
      assert.equal(body.model, model.model);
      assert.equal(body.stream, false);
      assert.equal(body.messages[0].content[1].image_url.url, frame.url);
      if (model.provider === 'OPENROUTER')
        assert.ok(model.model.endsWith(':free'), '무료 ID만 허용: ' + model.id);
      if (model.provider === 'NVIDIA') {
        assert.deepEqual(body.chat_template_kwargs, {enable_thinking: false});
        assert.equal(body.response_format.type, 'json_schema');
        assert.deepEqual(body.response_format.json_schema.schema.required,
          ['issues', 'edits']);
      }
      if (model.id === 'OPENROUTER_NEMOTRON')
        assert.deepEqual(body.reasoning, {enabled: false},
          '오픈라우터 네모트론 기본 추론의 출력 토큰 소진 방지');
      return {ok: true, json: async () => ({
        usage: {cost: 0},
        choices: [{message: {content: '{"issues":[],"edits":[]}'}}]
      })};
    };
    const response = await callFreeDesignModel(model, 'inspect approved image', [frame], fakeFetch, env);
    assert.equal(response.status, 'OK', '모델 요청 스키마: ' + model.id);
    assert.deepEqual(JSON.parse(response.text), {issues: [], edits: []});
    assert.equal(calls, 1, '중복 요청 금지: ' + model.id);
    const paymentBlocked = await callFreeDesignModel(model, 'verify cost', [frame],
      async () => ({ok: false, status: 402}), env);
    assert.equal(paymentBlocked.status, 'BILLING_BLOCKED', '결제 요구 차단: ' + model.id);
    const unexpectedCost = await callFreeDesignModel(model, 'verify usage cost', [frame],
      async () => ({ok: true, json: async () => ({
        usage: {cost: 1},
        candidates: [{content: {parts: [{text: '{}'}]}}],
        choices: [{message: {content: '{}'}}]
      })}), env);
    assert.equal(unexpectedCost.status, 'NONZERO_COST_BLOCKED',
      '유료 응답 사용 차단: ' + model.id);
  }
  assert.equal(seen.size, 7);
});


// [디자인 AI 실호출 회귀] 인증·잘못된 요청은 모델별로 교대하며 결제 요구는 무조건 차단.
test('디자인 무료 공급자별 인증 실패·형식 오류·결제 요구는 별도 처리한다', async () => {
  const {DESIGN_FREE_MODELS, callFreeDesignModel, selectFreeDesignModels} =
    await import('../tools/company-nemotron-design-review.mjs');
  const env={NVIDIA_API_KEY:'fixture-nvidia', GEMINI_API_KEY:'fixture-gemini',
    OPENROUTER_API_KEY:'fixture-router'};
  const frame={name:'harbor_npc_face_front-0.jpg',url:'data:image/jpeg;base64,YWJj'};
  for(const model of DESIGN_FREE_MODELS){
    const unauthorized=await callFreeDesignModel(model,'visual review',[frame],
      async()=>({ok:false,status:401}),env);
    assert.equal(unauthorized.status,'AUTH_BLOCKED',model.id);
    assert.equal(unauthorized.retryAfterMs,21600000,model.id);
    const malformed=await callFreeDesignModel(model,'visual review',[frame],
      async()=>({ok:false,status:400,json:async()=>({error:{message:'invalid request'}})}),env);
    assert.equal(malformed.status,'HTTP_400',model.id);
    assert.ok(malformed.retryAfterMs>=1800000,model.id);
    const billing=await callFreeDesignModel(model,'visual review',[frame],
      async()=>({ok:false,status:402}),env);
    assert.equal(billing.status,'BILLING_BLOCKED',model.id);
  }
  const policy=JSON.parse(readText('company-learning/external-ai-distillation-policy.json'));
  const previous={selectedRole:'NPC',cooldowns:{
    NVIDIA_VL:new Date(Date.now()+1800000).toISOString()
  },attempts:[{id:'NVIDIA_VL',status:'REVIEW_INVALID'}]};
  const alternatives=selectFreeDesignModels({frameNames:['harbor_npc_face_front-0.jpg'],
    policy,env,previous});
  assert.ok(alternatives.length>0);
  assert.ok(alternatives.every(model=>model.id!=='NVIDIA_VL'),
    '무효 응답 모델은 다음 회차에서 제외하고 다른 무료 모델로 교대');
  assert.ok(alternatives.some(model=>model.provider==='GEMINI'));
  assert.ok(alternatives.some(model=>model.provider==='OPENROUTER'));
});


// [공식 NVIDIA 독립 검수] 원본 디자인 스키마와 다른 전후 비교 응답 계약을 직접 요청한다.
test('네모트론 후보와 독립 검수는 동일 무료 호출에서 다른 필수 JSON 필드를 요구한다',async()=>{
  const {DESIGN_FREE_MODELS,callFreeDesignModel,validateVisualComparison} =
    await import('../tools/company-nemotron-design-review.mjs');
  const nvidia=DESIGN_FREE_MODELS.find(x=>x.id==='NVIDIA_VL');
  const env={NVIDIA_API_KEY:'fixture-free'};
  const frame={name:'harbor_npc_face_front-0.jpg',url:'data:image/jpeg;base64,YWJj'};
  let calls=0;
  const result=await callFreeDesignModel(nvidia,'Compare before after',[frame],
    async(url,request)=>{
      calls++;
      assert.equal(url,nvidia.endpoint);
      const body=JSON.parse(request.body);
      assert.equal(body.response_format.type,'json_schema');
      assert.equal(body.response_format.json_schema.name,'mare_visual_comparison');
      const schema=body.response_format.json_schema.schema;
      assert.deepEqual(schema.required,['verdict','improvements','regressions']);
      assert.equal(schema.properties.verdict.enum.includes('UNKNOWN'),true);
      assert.equal(schema.additionalProperties,false);
      return {ok:true,json:async()=>({
        choices:[{message:{content:'{"verdict":"UNKNOWN","improvements":[],"regressions":[]}'}}],
        usage:{cost:0}
      })};
    },env,'comparison');
  assert.equal(calls,1);
  assert.equal(result.status,'OK');
  assert.equal(validateVisualComparison(result.text,[frame.name]).status,'UNVERIFIED',
    'JSON 구조 성공은 시각 개선 성공과 구분');
});


// [교역 장부·조선소·시설 공통 회귀] 최신 메인의 원화·백과·거래 흐름을 보존한 상태에서 메뉴 가독성을 개선한다.
test('대항해시대 교역 원화·백과·선박 전시장과 공통 버튼 배치를 유지한다', () => {
  const source=readText('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau');
  const trade=source.slice(source.indexOf('local function openTradeHall()'),source.indexOf('H.tradeHall = openTradeHall'));
  const yard=source.slice(source.indexOf('function openYardHall()'),source.indexOf('H.yardHall = openYardHall'));
  assert.match(source,/width < math\.max\(520, left \+ btnWidth \+ 240\)/,'중간 폭 메뉴에서도 버튼과 설명 분리');
  assert.match(source,/local iconPx = if quick then 66 elseif it.portrait then 164 else 148/,'기존 모바일 한눈형은 유지하고 일반 시설 원화·초상 확대');
  assert.match(trade,/art\.Name = "TradeHighResArt"/,'승인 고화질 교역품 원화 유지');
  assert.match(trade,/local artId = AssetIds\["Goods\/" \.\. sel\.id\]/,'기존 등록 원화만 사용');
  assert.match(trade,/modelIcon\(pages, gi\[1\], gi\[2\]/,'원화가 없는 교역품은 기존 3D 렌더러 유지');
  assert.match(trade,/세계 교역 · 산업 백과/,'서재 백과사전 정보 연결 유지');
  assert.match(trade,/H\.marketPriceSignal\(sel\)/,'교역 판단 정보 연결 유지');
  // [오너 카드 규격] 조선소 원화 카드가 7:10이어도 기존 등록 선박 모델·비교는 유지한다.
  assert.match(yard,/local cardW = math\.floor\(math\.max\(34, math\.min\(heroWidth - 20, availableArtH \* 0\.7\)\)\)/,'실제 창 높이를 기준으로 7:10 너비 계산');
  assert.match(yard,/local cardH = math\.floor\(cardW \* 10 \/ 7\)/,'선박 전시 카드비 7:10');
  assert.match(yard,/model = modelIcon\(card, shipArt\[1\], shipArt\[2\]/,'기존 등록 선박 모델 재사용');
  assert.match(yard,/model\.Size = UDim2\.fromScale\(1, 1\)/,'모델은 전시 카드 안에 맞춤');
  assert.match(yard,/YardArtToCodex/,'선박 원화 누르면 백과 이동');
  // [메뉴별 원화] 발견된 지식만 연결하고 원본을 확대·자르지 않으며 기존 서버 구조를 보존한다.
  assert.match(source,/FacilityArtCard7x10/,'시설별 원화 카드 슬롯');
  assert.match(source,/H\.galleryImage = Instance\.new\("ImageButton"\)/,'왼쪽 원화 터치 반응');
  assert.match(source,/H\.FACILITY_GALLERY_TOPICS/,'시설/탭별 관련 원화 전환');
  assert.match(source,/H\.galleryImage\.Activated:Connect/,'원화 클릭 연결');
  assert.match(source,/if entry\.id == target then H\.encyclopediaPage = index; break end/,'해당 백과 장 바로 열기');
  assert.match(trade,/local heroH = math\.floor\(heroPx \* 10 \/ 7\)/,'가로 교역 원화 7:10');
  assert.match(trade,/local bigH = math\.floor\(bigPx \* 10 \/ 7\)/,'모바일 교역 원화 7:10');
  assert.match(trade,/artTap\.Activated:Connect\(openSelectedGoodEncyclopedia\)/,'선택 상품 그림 눌러 백과 이동');
  // [연속 제작] 원화 넘김·현재 지식 장·해역 선택·조선소 선택이 실제 전시 슬롯을 갱신한다.
  assert.match(source,/PreviousFacilityArt/,'왼쪽 이전 원화 조작');
  assert.match(source,/NextFacilityArt/,'왼쪽 다음 원화 조작');
  assert.match(source,/H\.galleryIndex = \(\(H\.galleryIndex or 1\) - 1 \+ direction\) % total \+ 1/,'발견 원화 순환 인덱스');
  assert.match(source,/H\.galleryMatches = matches/,'발견 원화만 사용');
  assert.match(source,/H\.gallerySelectedTab ~= tab/,'탭 변경 시 원화 순서 초기화');
  assert.match(source,/H\.galleryReadingCard = if current\.found/,'백과 현재 페이지 원화 동기화');
  assert.match(source,/AssetIds\["CardArt\/event_chart_" \.\. H\.selectedChart\]/,'지도 선택과 원화 연동');
  assert.match(source,/if chartName and not selection then matched = nil end/,'선택한 항구가 없으면 해역 지도를 우선');
  assert.match(source,/H\.galleryPrev\.Position = UDim2\.new\(1, -96, 1, -48\)/,'배너 원화 넘김 좌표');
  assert.match(source,/H\.FACILITY_GALLERY_POOL = \{/,'메뉴별 승인 원화 자동 순환 묶음');
  assert.match(source,/H\.galleryIndex = math\.random\(1, #matches\)/,'메뉴 열 때 랜덤 시작');
  assert.match(source,/FacilityArtBackdrop/,'반응형 배너 배경');
  assert.match(source,/local inYardHall = H\.yardHallActive/,'선박 클릭 시 상세장부 소속 보존');
  assert.match(source,/if inYardHall and tradeHallRefresh then tradeHallRefresh\(\) else render\(\) end/,
    '조선소 중앙 선박 원화 즉시 갱신');
  assert.match(source,/selectArea\.Size = UDim2\.new\(1, -4, 0, 78\)/,'구매 버튼과 선택 영역 분리');
  assert.match(source,/H\.galleryImage\.ScaleType = Enum\.ScaleType\.Fit/,'기존 원화 강제 잘림 금지');
  assert.match(source,/H\.galleryBookOpenRequested = H\.galleryLinkCardId/,'실제 지식 카드 ID 연결');
  assert.match(source,/H\.gallerySearchTerm or \(\(H\.FACILITY_GALLERY_TOPICS\[currentTab\]/,'선택 대상을 우선 검색하고 그 외에는 시설 주제로 연결');
  assert.match(source,/if bookCard then bookCard\.id else "search:" \.\. shipName/,'해당 선박 기록이 없으면 선박명 검색');
  assert.match(source,/string\.sub\(target, 1, 7\) == "search:"/,'서재 검색과 정확한 백과 장 분기');
  assert.match(source,/H\.codexSearchTerm = string\.sub\(target, 8\)/,'기존 지식 검색 기능 재사용');
  assert.match(source,/local showArt = gallery and bodyH >= \(if wide then 340 else 360\)/,'실행 버튼 높이를 제외한 본문이 충분할 때만 원화 표시');
  assert.match(source,/local bodyH = height - bodyTop - dockH/);
  assert.doesNotMatch(source,/local posterW =/);
  assert.match(source,/H\.galleryCard\.Visible = true\s+H\.galleryImage\.ImageTransparency = 1/);
  assert.match(source,/H\.menuActionButton\.Parent = H\.menuActionDock/);
  assert.match(source,/nav = 2, tradeg = 0, adventure = 4, growth = 6, records = 7/);
  // [선택 대상과 원화] 실제 항로/국가/항구를 눌러도 기존 출항·외교·저장 흐름은 분리한다.
  assert.match(source,/H\.gallerySelection = nil -- \[시설 변경\]/,'시설 변경 시 이전 선택 정리');
  assert.match(source,/H\.gallerySearchTerm or/,'백과 링크에 선택 대상 검색어 전달');
  assert.match(source,/H\.gallerySelection = \{ tab = "route"/,'항로 선택으로 원화 변경');
  assert.match(source,/choose\.Name = "RouteArtwork_" \.\. tostring\(r\.id\)/,'항로 원화 터치 영역');
  assert.match(source,/choose\.Size = UDim2\.new\(1, -124, 0, 42\)/,'항로 원화 터치와 실제 출항 버튼 분리');
  assert.match(source,/H\.gallerySelection = \{ tab = "diplomacy"/,'외교 국가 선택으로 원화 변경');
  assert.match(source,/choose\.Name = "DiplomacyArtwork_" \.\. tostring\(n\.id\)/,'외교 국가 터치 영역');
  assert.match(source,/H\.gallerySelection = \{ tab = "map"/,'선택 항구에 연결된 원화 갱신');
  assert.match(source,/chart = H\.chartForPort\(selectedPort\)/,'선택 항구는 기존 해역도 경로 사용');
  assert.match(source,/AssetIds\["CardArt\/event_chart_" \.\. selection\.chart\]/,'승인 해역도만 사용');
  assert.match(source,/AssetIds\["CardArt\/" \.\. selection\.art\]/,'승인 국가 관련 원화만 사용');
  assert.match(source,/england = "event_royal_charter", netherlands = "event_anglo_dutch_war"/,'국가 관련 원본 카드');
  assert.match(source,/H\.galleryArtTween:Cancel\(\)/,'원화 빠른 넘김 시 이전 효과 중복 중지');
  assert.match(source,/H\.galleryArtTween:Play\(\)/,'새 원화 페이드 유지');
  assert.match(source,/if card\.found == true and type\(card\.image\) == "string"/,'미발견 기록 원화 비공개');
  for(const action of ['Buy','Sell','BuyShip','Repair','BuySupplies'])
    assert.ok(source.includes('call("'+action+'"'),'기존 서버 호출 유지: '+action);
  assert.doesNotMatch(trade,/Instance\.new\("Part"\)/,'새 임시 3D 도형 금지');
});

// [무료 AI 디자인 검수] 실제 스튜디오 화면의 시설 UI 범위를 빠짐없이 분류한다.
test('AI 디자인이 교역·선박·서재·주점·선장실 등 방문 메뉴를 검사한다',async()=>{
  const {designRoleForFrames,selectDesignFrameRole}=await import('../tools/company-nemotron-design-review.mjs');
  const targets=['trade_goods-0.jpg','market_trade-0.jpg','cargo_inventory-0.jpg',
    'shipyard_preview-0.jpg','research_tech-0.jpg','quest_journal-0.jpg',
    'codex_book-0.jpg','recruit_crew-0.jpg','status_wallet-0.jpg',
    'tavern_board-0.jpg','palace_audience-0.jpg','guild_exchange-0.jpg',
    'museum_academy-0.jpg','diplomacy_chart-0.jpg','captain_room-0.jpg',
    'harbor_authority-0.jpg','combat_headquarters-0.jpg','library_book-0.jpg'];
  for(const name of targets)assert.equal(designRoleForFrames([name]),'UI',name);
  assert.equal(designRoleForFrames(['ship_harbor-0.jpg']),'WORLD','일반 항해는 WORLD로 유지');
  assert.equal(designRoleForFrames(['npc_face-0.jpg']),'NPC','인물은 NPC로 유지');
  for(const name of ['cb0_deck-0.jpg','card_battle-0.jpg','ui_card_duel-0.jpg',
    'uiCardGrid-0.jpg','cardPreview-0.jpg','deckPanel-0.jpg'])
    assert.equal(designRoleForFrames([name]),'EXCLUDED_CARD','외부 AI 카드 검수 금지: '+name);
  assert.equal(selectDesignFrameRole(targets),'UI','다수 UI 촬영본은 기존 UI 검수로 배정');
  const source=readText('tools/company-nemotron-design-review.mjs');
  assert.match(source,/trade goods previews, shipyard/,'무료 AI 디자인 검수 확장');
  assert.match(source,/Exclude standalone card battles, card decks, card art/,'카드 외부 AI 수정 금지');
  assert.match(source,/!\/\(\?:card\|deck\|duel\|knowledgebattle\)\/i.test\(line\)/,
    '외부 AI가 카드 그리드·덱의 모든 카멜 표기 코드도 제외한다');
  assert.match(source,/Only change visual constants on EXISTING exact source lines shown in anchors/,
    '게임 규칙 변경을 막는 기존 검수 경계 유지');
});

// [교역품 실증] 기존 공식 4장 제한을 유지하되 교역 화면을 대표 사진에서 누락하지 않는다.
test('무료 AI 디자인 리뷰가 교역품 실촬영을 우선 전송한다',()=>{
  const source=readText('tools/company-nemotron-design-review.mjs');
  const capture=JSON.parse(readText('roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-tradehall.json'));
  assert.match(source,/const ordered = selectedRole === 'UI'/);
  assert.match(source,/Number\(cargoFrame\.test\(b\)\) - Number\(cargoFrame\.test\(a\)\)/);
  assert.ok(capture.filter(row=>row.type==='capture' && /^trade_goods/.test(row.name)).length>=2,
    '실제 교역품 화면을 사전·사후로 촬영해야 한다');
  assert.match(source,/Skip cargo that is not shown/);
});

// [시설 아이콘 회귀] 최초 생성과 반응형 갱신은 같은 모바일·데스크톱 좌표를 사용한다.
test('항구 시설 아이콘은 최초 생성과 반응형 배치에서 같은 탭 내부 여백을 유지한다',()=>{
  const source=readText('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau');
  const expected='icon.Position = if compactTabs then UDim2.new(0.5, -13, 0, 3) else UDim2.new(0, 7, 0.5, -13)';
  assert.equal(source.split(expected).length-1,2);
});

// [조선소 실증 회귀] 정비와 선박 비교는 별도 페이지이며 실제 탭 클릭 후 비교를 검증한다.
test('조선소 Studio QA는 정비와 비교 페이지를 각각 실제 클릭으로 검증한다',()=>{
  const steps=JSON.parse(readText('roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-qa-click.json'));
  const maintenance=steps.find(x=>x.type==='luau' && x.code?.includes('YARD_MAINTENANCE_PASS'));
  const click=steps.find(x=>x.type==='click_from_luau' && x.label==='yard_compare_tab');
  const compare=steps.find(x=>x.type==='luau' && x.code?.includes('YARD_COMPARE_PAGE_PASS'));
  assert.ok(maintenance && click && compare);
  assert.ok(steps.indexOf(maintenance)<steps.indexOf(click) && steps.indexOf(click)<steps.indexOf(compare));
  assert.match(click.code,/YardTab_compare/);
  assert.match(compare.code,/YardSectionShips/);
});


// [스튜디오 원인 복구 회귀] 대련 애니메이션과 정밀 보행 관절 측정의 동시 쓰기를 차단한다.
test('스튜디오 R15 보행 검증은 자동 대련 루프의 관절 덮어쓰기를 차단한다', () => {
  const scene = readText('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/PortScene.luau');
  const steps = JSON.parse(readText('roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-qa-click.json'));
  assert.equal(steps.length,1000);
  assert.match(scene, /RunService:IsStudio\(\) and folder:GetAttribute\("R15MotionProbe"\) == true/);
  for (const step of [204, 208]) {
    assert.match(steps[step].code, /scene:SetAttribute\("R15MotionProbe",true\)/);
    assert.match(steps[step].code, /scene:SetAttribute\("R15MotionProbe",false\)/);
    assert.match(steps[step].code, /MOTION_SAME_SIDE_ARM_LEG_REVERSED/);
    assert.match(steps[step].code, /MOTION_WORLD_ARM_LEG_NOT_CROSSED/);
  }
  assert.match(steps[208].code, /joint:GetAttribute\("NpcPitchSign"\)/);
  assert.match(steps[208].code, /task\.wait\(0\.045\)/);
});

// [캐릭터 외형 회귀] 등록된 실물 메시와 두피 볼륨·모자·머리색·직업 장식 색상은 함께 유지한다.
test('항구 NPC 헤어 숱과 직업 모자·머리색·복식 대비가 실제 R15 장착 흐름에 연결된다',()=>{
  const pose=read('ReplicatedStorage/Shared/Pose.luau');
  const assetIds=read('ReplicatedStorage/Shared/AssetIds.luau');
  const port=read('ReplicatedStorage/Shared/PortScene.luau');
  assert.match(pose,/scalp\.Name = "HairScalp"/);
  assert.match(pose,/temple\.Name = "HairScalpSide"/);
  assert.match(pose,/h\.Y \* 0\.65, h\.Z \* 0\.84/);
  assert.match(pose,/h\.Y \* 0\.31, h\.Z \* 0\.11/);
  for(const kind of ['sailorcap','bonnet','beret','bicorne'])
    assert.ok(pose.includes('kind == "'+kind+'"'),'모자 형태 누락: '+kind);
  assert.match(pose,/EUROPEAN_DETAIL_CULTURES\[outfit\.culture\]/,
    '기존 지역·시대 허용 체계를 보존한다');
  assert.match(pose,/model:SetAttribute\("NpcHairTint", outfit\.hairColor\)/);
  assert.match(pose,/local hairPalette = \{/);
  assert.match(pose,/if pale then\s+local softTint = hairTint:Lerp\(Color3\.new\(1, 1, 1\), 0\.85\)\s+surface\.Color = surface\.Color:Lerp\(softTint, 0\.35\)/,
    '텍스처/원본 PBR을 유지하면서 밝게 로드된 머리색만 복구한다');
  assert.match(pose,/model:SetAttribute\("NpcAccentTint", accentTint\)/);
  assert.match(pose,/surface\.Color = surface\.Color:Lerp\(accent:Lerp\(/);
  assert.match(pose,/if not textured and string\.sub\(assetName, 1, 7\) == "outfit_"/);
  assert.match(pose,/-- \[복식 레이어\] 원본 전신복은 소매·등판·다리천을 담당한다\./);
  assert.match(pose,/-- \[주민 기본복 유지\] 원본 peasant\/ranger 몸체 GLB는 팔 소매와 등·옆면까지 포함한다\./);
  assert.match(pose,/model:SetAttribute\("OutfitMissing"/);

  // [R15 실물 준비] LOD 숨김과 실제 장착을 섞으면 모바일에서 의복이 사라져도 ready로 오진한다.
  assert.ok(pose.includes('local activeRequired = #specs - lodHidden'), '거리 숨김은 실물 장착 성공 수에서 제외');
  assert.ok(pose.includes('local fullyMounted = attached == activeRequired and #missing == 0'),
    '실물 장착 및 누락 여부 모두 통과해야 ready');
  assert.doesNotMatch(pose,/attached \+= 1\s+lodHidden \+= 1/,
    '의도적으로 숨긴 복식을 실제 착용 완료로 잘못 집계하지 않는다');
  assert.ok(pose.includes('local equippedVisible = false'), '장착 슬롯이 있어도 투명 모델은 성공 아님');
  assert.ok(pose.includes('if visibleHeadwearParts == 0 then'), '투명한 헤어·의상·장신구는 실물 오류로 기록');
  assert.ok(port.includes('local function refreshOutfits(includeReady)'), '완성 주민도 승인된 외형 모델 도착 시 다시 검사');
  assert.ok(port.includes('refreshOutfits(string.sub(asset.Name, 1, 5) == "hair_"'),
    '실물 헤어 지연 입고 후 재장착');
  assert.ok(port.includes('for kind in { Cargo = true, Relics = true } do'), '직업 소지품도 자산 도착 후 장착 복구');
  assert.ok(port.includes('if ReplicatedStorage:GetAttribute("MareAssetsReady") then refreshOutfits(true) end'),
    '항구 장면 생성보다 먼저 자산 인입 완료되면 다시 확인');

  // [헤어 다양성] 8개 모델별 변형은 기존 공간 좌표로 안정적이며 AssetIds가 실제 등록한 후보만 선택한다.
  assert.match(pose,/model:SetAttribute\("NpcHairVariant", variant\)/);
  assert.match(pose,/for offset = 0, #options - 1 do/);
  assert.match(pose,/loaded and loaded:IsA\("Model"\)/);
  for(const name of ['hair_shoulder_waves','hair_side_braid','hair_low_bun',
    'hair_braided_crown','hair_sailor_ponytail','hair_buzzedfemale','hair_court_curls'])
    assert.ok(pose.includes('"'+name+'"'),'헤어 스타일 누락: '+name);
  assert.match(pose,/regionalHairDyes/,'기존 지역·연령 팔레트를 보존한 머리색 차별화');
  assert.match(pose,/piece\(Enum.PartType.Ball, Vector3.new\(h.X \* 0.33/,'실물 머리 로드 전 롱헤어 뒤쪽 실루엣');
  // [의복 재질] PBR ColorMap/금속을 보존하며 천 소매·스톨·가죽장화만 물성·색조를 바꾼다.
  assert.match(pose,/or assetName == "outfit_stole" or assetName == "outfit_cuff"/);
  assert.match(pose,/if assetName == "outfit_cuff" then npcClothTint/);
  assert.match(pose,/if npcOutfit and assetName == "outfit_boot" and part.Material == Enum.Material.Leather/);
  assert.match(pose,/if not textured and string.sub\(assetName, 1, 7\) == "outfit_"/);
  for(const asset of ['hair_simpleparted','hair_long','hair_buns','acc_feather_hat','acc_sailor_headband'])
    assert.ok(assetIds.includes('["People/'+asset+'"]'),'등록 원본 누락: '+asset);
});

// [주민 복장·재질 회귀] PBR 컬러맵 보존, 금속 단추·가죽 보호, 계절별 상의 1벌만 유효 판정.
test('주민 복장 천·피혁·금속 재질과 계절 상의 교체는 원본 GLB를 보존한다',()=>{
  const pose=read('ReplicatedStorage/Shared/Pose.luau');
  const ids=read('ReplicatedStorage/Shared/AssetIds.luau');
  for(const item of ['outfit_vest','outfit_coat','outfit_guard','outfit_apron','outfit_sash','outfit_stole']){
    assert.ok(ids.includes('["People/'+item+'"]'), '기존 승인 복장만 사용: '+item);
  }
  assert.ok(pose.includes('local bestMaterial, bestError = nil, math.huge'), '원본 선형·감마 색상으로 재질 분리');
  assert.ok(pose.includes('or (bestError < 0.0064 and bestMaterial == Enum.Material.Metal)'), '황동/갑옷 금속 원재질 보존');
  assert.ok(pose.includes('or (bestError < 0.0064 and bestMaterial == Enum.Material.Leather)'), '가죽 장식 보존');
  assert.ok(pose.includes('if not metalTrim and not leatherTrim then'), '천 이외 재질 일괄 염색 금지');
  assert.match(pose,/local paleOutfitSurface = sourceTint\.R >= 0\.90 and sourceTint\.G >= 0\.90 and sourceTint\.B >= 0\.90/);
  assert.match(pose,/elseif detailAllowed and paleOutfitSurface and \(assetName == "outfit_vest"/);
  assert.match(pose,/assetName == "outfit_cuff" and typeof\(npcClothTint\) == "Color3"\s+and paleOutfitSurface then/);
  assert.match(pose,/assetName == "outfit_boot" and typeof\(npcTrouserTint\) == "Color3"\s+and paleOutfitSurface then/);
  // 어두운 개인색에서도 PBR 색상 배율의 각 채널은 0.73 이상을 유지한다.
  for (const strength of [0.16,0.27,0.47,0.75,0.78,0.83]) {
    const outfitMultiplier=0.90*(1-strength)+0.70*strength;
    assert.ok(outfitMultiplier>=0.73);
  }
  assert.ok(pose.includes('surface.Color = surface.Color:Lerp(dye:Lerp(Color3.new(1, 1, 1), 0.70), if assetName == "outfit_stole" then 0.16 else 0.27)'), 'PBR 천은 원본 텍스처 유지');
  assert.ok(pose.includes('elseif pale and assetName ~= "outfit_guard" then'), '갑옷의 은색 부분을 흰색으로 오진하지 않음');
  assert.ok(pose.includes('surface.Color = surface.Color:Lerp(dye:Lerp(Color3.new(1, 1, 1), 0.70), 0.75)'), '실제 순백으로 유실된 직물만 복구');
  assert.ok(!pose.includes('surface.Color = surface.Color:Lerp(dye, 0.26)'), '옷 전체 파스텔 일괄 염색 금지');
  assert.ok(pose.includes('if not trim:find("button", 1, true) and not trim:find("buckle", 1, true)'), '무텍스처 직물에서도 단추는 보호');
  assert.ok(pose.includes('for _, spec in specs do'), '현재 직업/계절 의상 기준으로 검사');
  assert.ok(pose.includes('local mounted = model:FindFirstChild("R15Asset_" .. wanted .. "_UpperTorso")'), '현재 계절 상의끼리만 정리');
  assert.ok(!pose.includes('local fittedUpperReady = false'), '단면 겉옷 장착 시 전신복 삭제 금지');
  assert.ok(pose.includes('if visible then'), '현재 상의가 실제 보일 때만 이전 상의 정리');
  assert.ok(pose.includes('weld.Part0, weld.Part1, weld.Parent = target, part, part'), 'R15 관절 유지');
});

// [계절·날씨 충돌 회귀] 비옷 선택과 항구 겨울 플래그가 달라도 실제 요청된 상의를 남긴다.
test('주민 계절 외투와 개별 비옷은 현재 착용 목록을 기준으로 교체한다',()=>{
  const pose=read('ReplicatedStorage/Shared/Pose.luau');
  const from=pose.indexOf('-- [계절·날씨 상의 정리]');
  const to=pose.indexOf('-- [한 주민 한 장신구]',from);
  assert.ok(from>=0 && to>from,'기존 상의 교체 책임 구간');
  const cleanup=pose.slice(from,to);
  assert.ok(cleanup.includes('for _, spec in specs do'),'날씨·겨울 선택이 끝난 현재 specs만 사용');
  assert.ok(cleanup.includes('wanted = spec[1]'),'현재 필요 상의를 기준으로 판정');
  assert.ok(!cleanup.includes('if winterCoat then'),'항구 겨울 플래그로 개별 비옷을 제거하는 오류 방지');
  assert.ok(cleanup.includes('part.Transparency < 0.95'),'숨겨진/투명 상의를 착용 성공으로 오판하지 않음');
  assert.ok(cleanup.includes('part.LocalTransparencyModifier < 0.95'),'모바일 LOD 숨김 상의를 성공으로 오판하지 않음');
  assert.ok(cleanup.includes('if visible then'),'실제 보이는 상의가 확인된 뒤만 옛 상의 제거');
  assert.ok(!cleanup.includes('male_peasant_body'),'원본 전신복 보존');
  assert.ok(pose.includes('model:GetAttribute("NpcWeatherLayer") == "outer_coat"'),'개별 날씨 외투 선택 보존');
  assert.ok(pose.includes('model.Parent:GetAttribute("PortWinterCoat") == true'),'항구 겨울 외투 선택 보존');
});

// [실제 런타임 실패 회귀] GetBoundingBox는 CFrame(위치)와 Vector3(크기)을 각각 반환한다.
// 이전 위치 CFrame.Size 접근은 pcall에 가려져 모든 실물 헤어가 조용히 fit_failed가 됐다.
test('주민 의상·헤어 메시 부착은 실제 경계 크기를 사용하고 실패 원인을 남긴다',()=>{
  const pose=read('ReplicatedStorage/Shared/Pose.luau');
  assert.match(pose,/local bounds, ext = skin:GetBoundingBox\(\)/, '첫 반환값은 위치 CFrame, 둘째는 실제 크기');
  assert.match(pose,/if npcOutfit and not jobProp then ratio \*= skin:GetScale\(\) end\s+if ratio <= 0/, '수입 원본의 절대 배율을 반영하고 전투와 도구는 유지');
  const fit=(originalScale, originalSize, wanted)=>originalScale*wanted/originalSize;
  assert.equal(fit(2,4,1.5),0.75);
  assert.equal(fit(0.5,1,1.5),0.75);
  assert.equal(fit(1,2,1.5),0.75);
  assert.match(pose,/skin:ScaleTo\(ratio\)\s*--[^\n]*\n\s*--[^\n]*\n\s*bounds, ext = skin:GetBoundingBox\(\)/, '스케일 후에는 두 반환값을 다시 받는다');
  assert.match(pose,/hairOffsetY = crownY - ext\.Y \* 0\.5 \/ target\.Size\.Y/, '두상 배치를 크기 Vector3 기준으로 한다');
  assert.doesNotMatch(pose,/bounds\.Size/, 'CFrame에는 Size 속성이 없음');
  assert.match(pose,/local ok, fitError = pcall\(function\(\)/, '복장·헤어 조립 실패 원인 포착');
  assert.match(pose,/assetName \.\. ":fit_failed:" \.\. string\.sub\(reason, 1, 72\)/, '기존 OutfitMissing에 실제 원인 기록');
  assert.match(pose,/model:SetAttribute\("OutfitMissing", if #missing > 0 then table\.concat\(missing, ","\) else nil\)/, '오류 코드는 기존 진단 속성 재사용');
  assert.match(pose,/local skin = source:Clone\(\)/, '기존 승인 자산 재사용');
  assert.match(pose,/weld\.Part0, weld\.Part1, weld\.Parent = target, part, part/, 'R15 기존 용접 유지');
});

// [실제 화면 원인 회귀] 기존 의상 GLB는 전신, 신규 vest/coat/guard GLB는 전면 외피이므로 둘 다 필요.
test('겉조끼·외투·경비복 추가 시 승인 전신복의 소매·등판을 삭제하지 않는다',()=>{
  const pose=read('ReplicatedStorage/Shared/Pose.luau');
  for(const name of ['male_peasant_body','female_peasant_body','male_ranger_body','female_ranger_body']){
    assert.ok(pose.includes('"'+name+'", "UpperTorso"'), '기등록 전신복 유지 '+name);
  }
  assert.doesNotMatch(pose,/fittedUpperReady/, '겉옷이 있으면 전신복을 생략하던 이전 로직 금지');
  assert.doesNotMatch(pose,/local old = model:FindFirstChild\("R15Asset_" \.\. oldName \.\. "_UpperTorso"\)/,
    '겉옷 장착으로 전신복 전체 파괴 금지');
  assert.match(pose,/-- \[주민 기본복 유지\] 원본 peasant\/ranger 몸체 GLB는 팔 소매와 등·옆면까지 포함한다\./);
  assert.match(pose,/-- \[복식 레이어\] 원본 전신복은 소매·등판·다리천을 담당한다\./);
  assert.ok(pose.includes('local mounted = model:FindFirstChild("R15Asset_" .. wanted .. "_UpperTorso")'),
    '계절별 겉옷끼리만 중복 정리한다');
  assert.ok(pose.includes('hairOffsetY = crownY - ext.Y * 0.5 / target.Size.Y'), '헤어 실제 크기 수정 유지');
  assert.ok(pose.includes('NpcBeardFitVersion'), '수염 수정 유지');
});

// [헤어 실물 품질 회귀] 단순 메시 숫자 대신 실제 두상 폭·두피·텍스처별 색상 경로를 검사한다.
test('R15 모발 장착은 길이 있는 헤어를 두상 높이에 억지로 압축하지 않는다',()=>{
  const pose=read('ReplicatedStorage/Shared/Pose.luau');
  assert.ok(pose.includes('local hairHeightAllowance = if hairStyle == "long" then 2.20'));
  assert.ok(pose.includes('elseif hairStyle == "bun" then 1.68 else 1.42'));
  assert.ok(pose.includes('ratio = math.min(target.Size.X * spec[3] / ext.X,'));
  assert.ok(pose.includes('target.Size.Y * hairHeightAllowance / ext.Y,'));
  assert.ok(pose.includes('target.Size.Z * spec[5] / ext.Z)'));
  assert.ok(pose.includes('if npcOutfit and not surface and part:IsA("MeshPart") and part.TextureID ~= ""'));
  assert.match(pose,/if pale then\s+local softTint = hairTint:Lerp\(Color3\.new\(1, 1, 1\), 0\.85\)\s+part\.Color = part\.Color:Lerp\(softTint, 0\.35\)/, '텍스처 머리 원본 색상 보존');
  assert.ok(pose.includes('if npcOutfit and surface and surfaceHasColorMap(surface) then'));
  assert.match(pose,/if pale then\s+local softTint = hairTint:Lerp\(Color3\.new\(1, 1, 1\), 0\.85\)\s+surface\.Color = surface\.Color:Lerp\(softTint, 0\.35\)/, 'PBR 머리 원본 색상 보존');
  assert.match(pose,/local textured = surfaceHasMaps\(surface\) or part\.MaterialVariant ~= ""/);
  const fitting=pose.slice(pose.indexOf('local textured = surfaceHasMaps(surface)'),pose.indexOf('local weld = Instance.new("WeldConstraint")',pose.indexOf('local textured = surfaceHasMaps(surface)')));
  assert.ok(fitting.includes('child:IsA("SpecialMesh") and child.TextureId ~= ""'));
  assert.ok(fitting.includes('child:IsA("Decal") or child:IsA("Texture")'));
  assert.ok(fitting.includes('local defaultImportGray = npcOutfit and not textured'));
  assert.ok(fitting.includes('math.abs(part.Color.R - 163 / 255) <= 1 / 255'));
  assert.ok(fitting.includes('elseif fallback and (defaultImportGray or'));
  assert.ok(fitting.includes('(hair and defaultImportGray)'));
  assert.match(pose,/and part\.MaterialVariant == "" and string\.sub\(assetName, 1, 5\) == "hair_" then/);
  assert.match(pose,/local pale = part\.Color\.R >= 0\.90 and part\.Color\.G >= 0\.90 and part\.Color\.B >= 0\.90/);
  assert.match(pose,/local pale = base\.R >= 0\.90 and base\.G >= 0\.90 and base\.B >= 0\.90/);
  assert.doesNotMatch(pose,/if faded or \(hair and npcOutfit and model:GetAttribute\("NpcHairTint"\)\)/);
  assert.match(pose,/if faded or \(npcOutfit and not hair and \(ribbon or headwear\)\) then/);
  for (const hair of [0, 0.1, 0.3, 0.8, 1]) {
    const multiplier = 0.90 * 0.65 + (hair * 0.15 + 0.85) * 0.35;
    assert.ok(multiplier >= 0.8825 - 1e-9 && multiplier <= 1, '밝은 머리 배율에 과도한 암부가 생기지 않는다');
  }
  assert.ok(pose.includes('scalp.Name = "HairScalp"'));
  assert.ok(pose.includes('temple.Name = "HairScalpSide"'));
  // [사진 회귀] 실물 헤어가 부분 메시일 때 목덜미·묶은 머리 볼륨을 보존한다.
  assert.ok(pose.includes('rearLock.Name = "HairBack"'));
  assert.ok(pose.includes('nape.Name = "HairBack"'));
  assert.ok(pose.includes('knot.Name = "HairBack"'));
  assert.ok(pose.includes('visibleHeadwearParts == 0'));
  assert.ok(pose.includes('assetName .. ":invisible"'));
  assert.ok(pose.includes('local crownY = if hairStyle == "bun" then 0.79 elseif hairStyle == "long" then 0.67 else 0.65'), '헤어 정수리 위로 부착');
  assert.ok(pose.includes('hairOffsetY = crownY - ext.Y * 0.5 / target.Size.Y'), 'GetBoundingBox의 크기 반환값으로 헤어 두상 정렬');
  assert.ok(pose.includes('model:SetAttribute("NpcHairMeshReady", wornHair ~= nil)'), '실물 머리 가시 상태 검증');
  assert.ok(pose.includes('piece.Transparency = if wornHair or hoodVisible then 1 else 0'), '실물 머리·성직자 두건 착용 시 예비 머리 겹침 제거');
  assert.ok(pose.includes('piece.Transparency = if fullCrown or hoodVisible then 1 else 0'), '두건 안쪽 두피 돌출 제거');
  assert.ok(pose.includes('profile == "companion_clergy_male" or profile == "companion_clergy_female"'), '두건 처리는 성직자 프로필에만 제한');
  assert.ok(pose.includes('R15Asset_male_ranger_head_hood_Head') && pose.includes('R15Asset_female_ranger_head_hood_Head'), '원본 등록 두건 메시만 확인');
  assert.ok(pose.includes('mesh.LocalTransparencyModifier < 0.95'), '두건이 로드되지 않았거나 숨겨졌을 때 예비 머리를 유지');
  assert.ok(pose.includes('and not string.find(worn.Name, "hair_beard", 1, true)'), '수염 머리카락과 분리 보존');
  // [모자 정수리] 실물 깃털모자가 기존 머리 보조를 모두 지우면서 뚫린 윗면을 드러내지 않도록 한다.
  assert.ok(pose.includes('crown:SetAttribute("NpcHatCrown", true)'));
  assert.ok(pose.includes('piece:GetAttribute("NpcHatCrown") == true'));
  assert.ok(pose.includes('local featherHat = model:FindFirstChild("R15Asset_acc_feather_hat_Head")'), '실제 깃털모자 슬롯으로 판정');
  const accessoryCleanup=pose.slice(pose.indexOf('local selectedSlot = "R15Asset_"'),pose.indexOf('if npcOutfit and UserInputService.TouchEnabled and detailLimit == 3 then',pose.indexOf('local selectedSlot = "R15Asset_"')));
  assert.ok(accessoryCleanup.includes('mesh.Transparency < 0.95') && accessoryCleanup.includes('mesh.LocalTransparencyModifier < 0.95'));
  assert.ok(accessoryCleanup.indexOf('if selectedVisible then') < accessoryCleanup.indexOf('worn:Destroy()'));
  assert.match(pose,/if detailAllowed then\s+local wanted = nil\s+for _, spec in specs do/);
  assert.match(pose,/if featherHat then\s+for _, mesh in featherHat:GetDescendants\(\) do\s+if mesh:IsA\("BasePart"\) and mesh.Transparency < 0.95 and mesh.LocalTransparencyModifier < 0.95 then\s+featherVisible = true/, '실물 모자의 가시성 확인 후 중첩을 정리');
  assert.ok(!pose.includes('local fittedUpperReady = false'), '기본복 삭제 조건 제거');
  assert.ok(pose.includes('(assetName == "outfit_boot" or assetName == "outfit_belt")'));
  assert.ok(pose.includes('part.Material = Enum.Material.Leather'));
  assert.ok(pose.includes('not trim:find("buckle", 1, true)'));
  for(const kind of ['tricorn','bicorne','beret','sailorcap','knit','kofia','fez'])
    assert.ok(pose.includes('kind == "'+kind+'"'), '기존 모자/재질 분류 누락: '+kind);
});

// [남성 주민 수염 액세서리 회귀] 모발과 분리하고 얼굴 중앙이 아닌 턱·얼굴 앞쪽에 고정한다.
test('항구 남성 주민 수염은 R15 Head 턱에 맞춰 1회 장착하고 흰색/중복을 방지한다',()=>{
  const pose=read('ReplicatedStorage/Shared/Pose.luau');
  const ids=read('ReplicatedStorage/Shared/AssetIds.luau');
  assert.ok(ids.includes('["People/hair_beard"]'), '수염은 이미 승인된 원본 자산만 사용');
  assert.ok(pose.includes('if detailAllowed and beardPersona == 3 and string.sub(profile, -5) == "_male"'), '기존 남성 주민 수염 선택 유지');
  assert.ok(pose.includes('and string.find(profile, "clergy", 1, true) == nil'), '성직자 수염 제외 규칙 유지');
  assert.ok(pose.includes('local beard = npcOutfit and assetName == "hair_beard"'), '몬스터 수염 비율은 변경하지 않음');
  assert.ok(pose.includes('elseif beard then 0.76 else spec[3]'), '수염이 얼굴 너비보다 넓어지지 않음');
  assert.ok(pose.includes('elseif beard then 0.58 else spec[4]'), '수염이 머리 전체를 덮지 않음');
  assert.ok(pose.includes('elseif beard then 0.74 else spec[5]'), '수염 깊이 과장 방지');
  assert.ok(pose.includes('elseif beard then -0.29 else hairOffsetY'), '수염은 정수리가 아닌 턱 아래');
  assert.ok(pose.includes('if beard then -0.42 else hairOffsetZ'), '수염은 얼굴 전방으로 장착');
  assert.ok(pose.includes('equipped:GetAttribute("NpcBeardFitVersion") ~= 1'), '기존 잘못 장착된 수염 1회 복구');
  assert.ok(pose.includes('if beard then skin:SetAttribute("NpcBeardFitVersion", 1) end'), '이미 정상 장착된 수염 재복제 방지');
  assert.ok(pose.includes('assetName == "hair_beard" or string.sub(assetName, 1, 4) == "acc_"'), '수염 액세서리 가시성 검사');
  assert.ok(pose.includes('and not string.find(worn.Name, "hair_beard", 1, true)'), '실물 머리카락 갱신 시 수염 보존');
  assert.ok(pose.includes('local hairTint = model:GetAttribute("NpcHairTint")'), '기존 주민 머리색 재사용');
  assert.ok(pose.includes('weld.Part0, weld.Part1, weld.Parent = target, part, part'), '기존 Head 용접 유지');
});

// [손목·발목·장신구 실물 회귀] 붕 뜬 흰 레이스·장화와 과대 머리핀/배지를 장착 위치에서 보정한다.
test('항구 NPC의 커프·장화·장신구는 관절에 맞고 원본 금속 및 PBR 지도를 유지한다',()=>{
  const pose=read('ReplicatedStorage/Shared/Pose.luau');
  assert.ok(pose.includes('local cuff = npcOutfit and assetName == "outfit_cuff"'));
  assert.ok(pose.includes('local boot = npcOutfit and assetName == "outfit_boot"'));
  assert.ok(pose.includes('elseif cuff then 0.36 elseif boot then 0.94'), '소매와 장화 높이를 관절 대비 축소');
  assert.ok(pose.includes('if cuff then -0.36 elseif boot then -0.15 elseif beard then -0.29 else hairOffsetY'), '손목/정강이/수염 위치를 각각 분리');
  assert.ok(pose.includes('surface.Color = surface.Color:Lerp(linen:Lerp(Color3.new(1, 1, 1), 0.70), 0.47)'), '원본 린넨 색상 보존');
  assert.ok(pose.includes('surface.Color = surface.Color:Lerp(linen:Lerp(Color3.new(1, 1, 1), 0.70), 0.78)'), 'PBR 흰 소매 밝은 무채색만 복구');
  assert.ok(pose.includes('if not metalTrim and pale then'), 'PBR 흰 장화만 보정, 금속 보호');
  assert.ok(pose.includes('surface.Color = surface.Color:Lerp(leather:Lerp(Color3.new(1, 1, 1), 0.70), 0.83)'), 'PBR 흰 장화 가죽염색');
  assert.ok(pose.includes('if assetName == "outfit_cuff" and neutral then 0.83'), '무텍스처 흰 소매 추가 보정');
  assert.ok(pose.includes('part.Color:Lerp(leather, if bright then 0.86 else 0.20)'), '무텍스처 흰 장화 추가 보정');
  assert.ok(pose.includes('linenOnly = candidate[2] ~= Enum.Material.Metal'));
  assert.ok(pose.includes('if part.Material ~= Enum.Material.Metal then'), '흰 소매 금속 재질 보호');
  assert.ok(pose.includes('if bestError < 0.0064 and linenOnly then'), '원본 린넨 후보만 기존 색 복구');
  assert.ok(pose.includes('outfit_cuff" then npcClothTint:Lerp(Color3.fromRGB(205, 192, 169), 0.42)'));
  assert.equal(pose.split('"acc_ribbon_bow", "Head", 0.56, 0.58, 0.57').length-1,2);
  assert.equal(pose.split('"acc_pearl_hairpin", "Head", 0.36, 0.39, 0.40').length-1,2);
  assert.ok((pose.match(/"acc_guild_badge", "UpperTorso", 0.36, 0.38, 0.38/g)||[]).length>=6);
  assert.ok(pose.includes('skin:ScaleTo(ratio)'));
  assert.ok(pose.includes('weld.Part0, weld.Part1, weld.Parent = target, part, part'));
  assert.ok(pose.includes('surfaceHasColorMap(surface)'));
  assert.ok(pose.includes('decal.Texture = "rbxasset://textures/face.png"'));
  assert.ok(pose.includes('decal.Color3 = Color3.new(1, 1, 1)'));
  // [기존 Studio 촬영] 검은 얼굴만 확대하지 말고 손목·배지와 의상까지 한 화면에 기록한다.
  const shot=JSON.parse(fs.readFileSync('roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-qa-click.json','utf8'));
  assert.equal(shot.length,1000);
  const focus=shot.findIndex(row=>row.type==='capture' && row.name==='harbor_npc_face_front');
  assert.ok(focus>0);
  assert.ok(shot[focus-1].code.includes('head.Position-Vector3.new(0,1.10,0)'));
  assert.ok(shot[focus-1].code.includes('head.CFrame.LookVector*14.0'));
  assert.ok(shot[focus-1].code.includes('workspace:SetAttribute("ShotFov",46)'));
  assert.ok(shot[focus-1].code.includes('BACKWARDS=0 DECAL='));
});

// [대항해시대 전장 지형 회귀] 신규 내부 CC0 원본·체험 권한과 실제 구릉/물결 연결을 기존 QA에서 확인한다.
test('대항해시대 내부 무료 숲 자산 및 지상 구릉·해상 물결 연결',()=>{
  const root='roblox-games/mare-essentia/';
  const reg=JSON.parse(readText(root+'assets-registered.json')).assets;
  const ids=readText(root+'src/ReplicatedStorage/Shared/AssetIds.luau');
  for(const [name,expectedBlob] of [
    ['tree-detailed','fb9d3a9b6d3b5dac19a6dbfd5c617ae07bab74b6'],
    ['tree-pinedefaultb','c0d4020f3ea4453801daca882314ee02cd155f3d'],
    ['rock-largea','3df13f56ceaa9da68e02a55e60a6961a33499d42'],
  ]){
    const key='Terrain/'+name;
    const record=reg[key];
    assert.ok(record && record.usePermissionGranted===true,key+' Roblox 체험 권한');
    assert.equal(record.assetType,'Model',key);
    assert.equal(record.license,'CC0-1.0',key);
    assert.ok(ids.includes('["'+key+'"] = '+record.assetId),key+' 실제 사용 번호');
    const bytes=fs.readFileSync(root+'assets/terrain/'+name+'.glb');
    assert.equal(bytes.toString('ascii',0,4),'glTF');
    const blob=crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length)).update(Buffer.from([0])).update(bytes).digest('hex');
    assert.equal(blob,expectedBlob,key+' 원본 GLB 보존');
  }
  const field=readText(root+'src/ReplicatedStorage/Shared/FieldScene.luau');
  const naval=readText(root+'src/ReplicatedStorage/Shared/NavalBattle.luau');
  assert.match(field,/FieldWalkableHillCount/);
  assert.match(field,/terrain:FillBall\(center, radius, mat\)/);
  assert.match(field,/groundRay\.FilterDescendantsInstances = \{ workspace\.Terrain, ground \}/);
  assert.match(field,/AssetIds\["Terrain\/tree-detailed"\]/);
  assert.match(field,/AssetIds\["Terrain\/rock-largea"\]/);
  assert.match(naval,/NavalOceanSurfaceType/);
  assert.match(naval,/oceanTerrain:FillBlock\(oceanFrame, oceanSize, Enum\.Material\.Water\)/);
  assert.match(naval,/oceanTerrain\.WaterWaveSize = if mode == "storm"/);
  assert.match(naval,/oceanTerrain:FillBlock\(oceanFrame, oceanSize, Enum\.Material\.Air\)/);
});

// [실물 원경 재발방지] 270단계에서 발견된 절벽·언덕 배율 오류는 원본 모델을 삭제하던 실제 렌더 결함이다.
// 일반 건물·배·충돌 모델의 기존 제한은 유지하고 멀리 있는 비충돌 지형만 실측 크기로 교정한다.
test('항구 원경 절벽과 언덕은 원본 배율로 목표 폭을 맞추고 실화면에서 존재를 검증한다',()=>{
  const source=read('ReplicatedStorage/Shared/PortScene.luau');
  const begin=source.indexOf('local function importedModel(parent, kind, asset, bottomPosition');
  const end=source.indexOf('-- 등불:',begin);
  assert.ok(begin>0&&end>begin,'기존 항구 모델 설치 책임 함수만 직접 수정');
  const importer=source.slice(begin,end);
  assert.match(importer,/local distantBackdrop = not solid and desiredSize >= 80 and \(kind == "Terrain" or kind == "Castle"\)/);
  assert.match(importer,/not isAnimal and not distantBackdrop and \(ratio < 0\.01 or ratio > 100\)/);
  assert.match(importer,/if isAnimal or distantBackdrop then m:GetScale\(\) \* ratio else ratio/);
  assert.match(importer,/distantBackdrop and kind == "Terrain" and string\.sub\(asset, 1, 6\) == "cliff-"/);
  assert.match(importer,/math\.clamp\(desiredSize \* 0\.28, 24, 52\)/);
  assert.match(importer,/desiredSize = math\.min\(desiredSize, axis \* reliefHeightLimit \/ ext\.Y\)\s+ratio = desiredSize \/ axis/);
  const cap=(width,height,wanted)=>Math.min(wanted,width*Math.max(24,Math.min(52,wanted*0.28))/height);
  assert.match(importer,/local distantHills = kind == "Castle" and asset == "ground-hills" and not solid and desiredSize >= 80/);
  assert.match(importer,/local reliefHeightLimit = cliffHeightLimit or \(if distantHills then math\.clamp\(desiredSize \* 0\.22, 28, 56\) else nil\)/);
  assert.match(importer,/if not textured then[\s\S]*?if distantHills then[\s\S]*?Enum\.Material\.Grass/);
  assert.match(source,/Vector3\.new\(-350 - depth \* 110, -2 - depth \* 2,/);
  assert.match(source,/importedModel\(folder, "Castle", "ground-hills", at, 155 \+ depth \* 35, false\)/);
  const hillCap=(width,height,wanted)=>Math.min(wanted,width*Math.max(28,Math.min(56,wanted*0.22))/height);
  assert.equal(hillCap(20,80,260),14);
  assert.equal(hillCap(100,10,190),190);
  assert.equal(cap(10,20,200),26);
  assert.equal(cap(100,10,200),200);
  assert.ok(cap(20,40,100)*40/20<=28.000001);
  assert.match(importer,/if isAnimal or distantBackdrop then/);
  assert.match(importer,/math\.abs\(actualAxis - desiredSize\) > desiredSize \* 0\.2/);
  for(const name of ['cliff-cornerlarge-stone','cliff-large-stone','cliff-cornerinnerlarge-rock','cliff-diagonal-rock','ground-hills'])
    assert.ok(source.includes('"'+name+'"'),'기존 무료 원경 자산 보존: '+name);
  const shot=JSON.parse(readText('roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-qa-click.json'));
  assert.equal(shot.length,1000,'기존 전체 1000단계 유지');
  assert.equal(shot[180].type,'luau');
  assert.match(shot[180].code,/PortCoastCliffDepthCount/);
  assert.match(shot[180].code,/PORT_COAST_CLIFF_RENDER_MISSING/);
  assert.ok(shot[999].code.includes('STUDIO_1000_FINAL_STATE_PASS'));
});

// [환경 원근 리그레션] CC0 8종의 원본·권한·전장 높이 연출이 같은 main 리비전에 함께 존재해야 한다.
test('대항해시대 생물군계 절벽·하층 식생 및 해상 연안 깊이감',()=>{
  const root='roblox-games/mare-essentia/';
  const registry=JSON.parse(readText(root+'assets-registered.json')).assets;
  const assetIds=readText(root+'src/ReplicatedStorage/Shared/AssetIds.luau');
  const originals={
    'cliff-large-rock':'0961d9bfdd7b952d152b8280f7d8d81b95828362',
    'cliff-blockslope-rock':'3536237912d55b87a3ccd009ad2aa7b6b4311b96',
    'cliff-top-rock':'11b06ca857b860dc94696daff39685405616a88d',
    'plant-bushdetailed':'77b9ff8e77d4b0d7a39918c5edb52629a0ea01db',
    'grass-large':'546a089b2a0e8f6d42ed948bad396e5169ef7c14',
    'rock-tallc':'8f3c255ad7fab4bde714b71e90cf67733a58aa37',
    'tree-pinetalla-detailed':'04b215870fabdfb428636dad8514224ab64489bf',
    'ground-pathrocks':'6a66adf9652b80eb19de76aa6b991d438123dff0',
  };
  for(const [name,sha] of Object.entries(originals)){
    const key='Terrain/'+name;
    const row=registry[key];
    assert.equal(row?.license,'CC0-1.0',key+' 검증된 무료 자산');
    assert.equal(row?.assetType,'Model',key+' 실물 모델');
    assert.equal(row?.usePermissionGranted,true,key+' Roblox Universe 권한');
    assert.ok(assetIds.includes('["'+key+'"] = '+row.assetId),key+' 로딩 경로');
    const bytes=fs.readFileSync(root+'assets/terrain/'+name+'.glb');
    assert.equal(bytes.toString('ascii',0,4),'glTF',key+' 실물 GLB');
    const gitSha=crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length))
      .update(Buffer.from([0])).update(bytes).digest('hex');
    assert.equal(gitSha,sha,key+' 원본 바이너리 해시');
  }
  const field=readText(root+'src/ReplicatedStorage/Shared/FieldScene.luau');
  const naval=readText(root+'src/ReplicatedStorage/Shared/NavalBattle.luau');
  assert.match(field,/FieldDepthRidgeCount/);
  assert.match(field,/FieldDepthFeatureCount/);
  assert.match(field,/terrain:FillBall\(center, radius, mat\)/);
  assert.match(field,/groundRay\.FilterDescendantsInstances = \{ workspace\.Terrain, ground \}/);
  assert.match(field,/AssetIds\["Terrain\/tree-pinetalla-detailed"\]/);
  assert.match(field,/local depthLandforms = if folder:GetAttribute\("FieldSiteComposition"\) == "shallow-reef-shore"[\s\S]*?\} elseif questTerrain == "glacier" then \{/);
  assert.match(naval,/NavalCoastFoamSources/);
  assert.match(naval,/NavalDepthCoastCount/);
  assert.match(naval,/NavalDepthCliff/);
  assert.match(naval,/local seaMood = if opts\.cardOnly/);
  assert.match(naval,/local depthCoast = if coast\.id/);
  assert.match(naval,/spray\.Rate = if MOBILE_VFX/);
});

// [지상전/해상전 3차 입체감] 공개 CC0 원본 10종, Roblox 사용권한, 모바일 엔진 항적을 하나의 회귀검사로 묶는다.
test('대항해시대 3차 원근·계절 숲·선박 항적 CC0 자산 실물 검증',()=>{
  const root='roblox-games/mare-essentia/';
  const registry=JSON.parse(readText(root+'assets-registered.json')).assets;
  const ids=readText(root+'src/ReplicatedStorage/Shared/AssetIds.luau');
  const originals={
    'tree-detailed-fall':'1d39f5584e2ae459c2b812b1cb7f91349dc46de0',
    'tree-oak-dark':'84a0b4364de35b0c2056aea0d8a1de1b3300e167',
    'tree-pinetallb-detailed':'31a663c2bc895b34564ee1bae8699d46cca93231',
    'plant-bushlarge':'6ca5d5cb789507ee647c969b7bd8e6d2c4526b8b',
    'rock-talli':'a8e2a0670e2bd60fdb548cd6684df42af1c8f5b7',
    'cliff-cornerlarge-rock':'49300019c18ffdfabd181b674a1c297dc6278c24',
    'ground-riverrocks':'fd64e00165a23742a17de9b59832f88fefbd8b1b',
    'cliff-waterfall-stone':'09c790a07b93c09cab0dd34a4e928cc042c79867',
    'tree-palmdetailedtall':'4b8a5138d0cad20ae512c914caa9854df3954b5a',
    'cliff-blockdiagonal-rock':'d5573d35456d0d1a545004a9297aa8664c5992e6',
  };
  for(const [name,expected] of Object.entries(originals)){
    const key='Terrain/'+name,row=registry[key];
    assert.equal(row?.license,'CC0-1.0',key+' 원본 CC0');
    assert.equal(row?.assetType,'Model',key+' 실제 모델');
    assert.equal(row?.usePermissionGranted,true,key+' 체험권한');
    assert.ok(/^[1-9][0-9]*$/.test(String(row?.assetId||'')),key+' 실제 자산번호');
    assert.ok(ids.includes('["'+key+'"] = '+row.assetId),key+' AssetIds 정본');
    const bytes=fs.readFileSync(root+'assets/terrain/'+name+'.glb');
    assert.equal(bytes.toString('ascii',0,4),'glTF',key+' 바이너리 실물');
    const sha=crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length))
      .update(Buffer.from([0])).update(bytes).digest('hex');
    assert.equal(sha,expected,key+' 공개 원본 해시 보존');
  }
  const field=readText(root+'src/ReplicatedStorage/Shared/FieldScene.luau');
  const naval=readText(root+'src/ReplicatedStorage/Shared/NavalBattle.luau');
  assert.match(field,/FieldElevatedTerraceCount/);
  assert.match(field,/FieldNearDepthBandCount/);
  assert.match(field,/local nearBands = if folder:GetAttribute\("FieldSiteComposition"\) == "shallow-reef-shore"[\s\S]*?\} elseif questTerrain == "archive" then \{[\s\S]*?\} elseif tropical and \(questTerrain == "coast" or questTerrain == "forest" or questTerrain == "jungle" or questTerrain == "plains" or questTerrain == "lake"\) then \{/,'기관 정원 우선·열대 지형 전용 근경');
  assert.match(field,/groundRay\.FilterDescendantsInstances = \{ workspace\.Terrain, ground \}/);
  assert.match(field,/AssetIds\["Terrain\/tree-detailed-fall"\]/);
  assert.match(field,/AssetIds\["Terrain\/tree-palmdetailedtall"\]/);
  assert.match(field,/if visualMobile then 1 else 3/);
  assert.match(naval,/NavalWakeSourceCount/);
  assert.match(naval,/wakeCount < \(if MOBILE_VFX then 2 else 6\)/);
  assert.match(naval,/local enabled = \(sh\.speed or 0\) > 2 and not sink/);
  assert.match(naval,/if sh\.wakeFx\.Enabled ~= enabled then sh\.wakeFx\.Enabled = enabled end/);
  assert.match(naval,/local rate = math\.clamp\(\(sh\.speed or 0\) \* \(if MOBILE_VFX then 0\.42 else 0\.75\), 1\.5, if MOBILE_VFX then 8 else 16\)/);
  assert.match(naval,/if sh\.wakeRate ~= rate then\s+sh\.wakeFx\.Rate = rate\s+sh\.wakeRate = rate\s+end/);
  assert.match(naval,/if #crews.me == 0 and #crews.foe == 0 then return end[\s\S]*?local mePivot, foePivot = me\.model:GetPivot\(\), foe\.model:GetPivot\(\)/);
  assert.match(naval,/local shipPivot = if side == "me" then mePivot else foePivot\s+local otherPosition = if side == "me" then foePivot.Position else mePivot.Position\s+for _, c in list do\s+local pos = \(shipPivot \* c\.off\)\.Position\s+local look = Vector3\.new\(otherPosition\.X, pos\.Y, otherPosition\.Z\)/);
  for(const token of ['last.pos, last.t, last.frame = sh.pos, now, (last.frame or 0) + 1','FX.wakeAt[key] = last','if moved <= 0.35 or (sh.speed or 0) <= 1.5 then return end','local step = if MOBILE_VFX then 0.31 else 0.22','local crossCos = if seaMood == "card" then 0 else math.cos(crossTime)','crossCos * 0.27','crossCos * 0.038','poseShip(me, now, meSink, seaMood)','poseShip(foe, now, foeSink, seaMood)','poseShip(e, now, nil, seaMood)','poseShip(al, now, nil, seaMood)']) assert.ok(naval.includes(token),token);
  assert.match(naval,/local stern = ORIGIN \+ sh\.pos - heading \* sh\.length \* 0\.40/);
  assert.match(naval,/cliff-cornerlarge-rock/);
  assert.match(naval,/cliff-waterfall-stone/);
});

// [입체감 4차] 무료 실물 원본·로블록스 체험권한·모바일 시각 예산·복원 경로를 기존 테스트에서 검증한다.
test('대항해시대 4차 하천·절벽·수관 CC0 등록 및 지형 시차 검사',()=>{
  const root='roblox-games/mare-essentia/';
  const registry=JSON.parse(readText(root+'assets-registered.json')).assets;
  const ids=readText(root+'src/ReplicatedStorage/Shared/AssetIds.luau');
  const originals={
    'cliff-large-stone':'e93d0635a9bc566f5a13843f9ef1f9df09c5437c',
    'cliff-cornerlarge-stone':'5f73fd650e8c63d9f943a0846c8f805156e8eca3',
    'ground-riverbendbank':'3493554fdeeec1c8409478d7e61c0e0338a31556',
    'ground-riverside':'7fb71bbd881c3a1b5c5c540a4c139ef2963877f7',
    'plant-bushsmall':'de5e7840512f0ca9d465eab5bc7c078bf1d613b0',
    'grass-leafslarge':'662b40110f7f45ae508632dce3e8f69e45bd27a9',
    'tree-oak-fall':'b14f0de44be30815bfeb91026f41869160cc22ce',
    'tree-palmbend':'f1ce81e92c48c980fca2de9f0605702e415efb30',
  };
  for(const [name,expected] of Object.entries(originals)){
    const key='Terrain/'+name,asset=registry[key];
    assert.equal(asset?.license,'CC0-1.0',key+' 무료 라이선스');
    assert.equal(asset?.assetType,'Model',key+' 3D Model');
    assert.equal(asset?.usePermissionGranted,true,key+' Universe 권한 확인');
    assert.ok(/^[1-9][0-9]*$/.test(String(asset?.assetId||'')),key+' Roblox ID');
    assert.ok(ids.includes('["'+key+'"] = '+asset.assetId),key+' Luau 실물 경로');
    const bytes=fs.readFileSync(root+'assets/terrain/'+name+'.glb');
    assert.equal(bytes.toString('ascii',0,4),'glTF',key+' 원본 GLB');
    const sha=crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length))
      .update(Buffer.from([0])).update(bytes).digest('hex');
    assert.equal(sha,expected,key+' 공개 원본 SHA');
  }
  const field=readText(root+'src/ReplicatedStorage/Shared/FieldScene.luau');
  const naval=readText(root+'src/ReplicatedStorage/Shared/NavalBattle.luau');
  assert.match(field,/AssetIds\["Terrain\/tree-oak-fall"\]/);
  assert.match(field,/AssetIds\["Terrain\/tree-palmbend"\]/);
  assert.match(field,/AssetIds\["Terrain\/ground-riverbendbank"\]/);
  assert.match(field,/AssetIds\["Terrain\/ground-riverside"\]/);
  assert.match(field,/AssetIds\["Terrain\/plant-bushsmall"\]/);
  assert.match(field,/AssetIds\["Terrain\/grass-leafslarge"\]/);
  assert.match(field,/local depthLandforms = if folder:GetAttribute\("FieldSiteComposition"\) == "shallow-reef-shore"[\s\S]*?\} elseif questTerrain == "glacier" then \{/);
  assert.match(field,/FieldNearDepthBandCount/);
  assert.match(field,/local detailCount = math\.max\(24, math\.floor\(24 \* math\.sqrt\(AREA\)\)\)/);
  assert.match(naval,/NavalDepthShoreBreakCount/);
  assert.match(naval,/shoreBreakCount < \(if MOBILE_VFX then 1 else 2\)/);
  assert.match(naval,/NavalCliffShoreWash/);
  assert.match(naval,/table.insert\(oceanNodes, surf\)/);
  assert.match(naval,/for _, anchor in oceanNodes do anchor:Destroy\(\) end/);
  assert.match(naval,/NavalWakeSourceCount/);
  assert.match(naval,/cliff-large-stone/);
});

test('Mare naval weather and distant merchants preserve cadence and restore the scene',()=>{
  const naval=read('ReplicatedStorage/Shared/NavalBattle.luau');
  const env=naval.slice(naval.indexOf('local envConnection'),naval.indexOf('-- [후미 흰 포말]'));
  for(const token of ['if tickSum < (if MOBILE_VFX then 0.20 else 0.10) then return end','elapsed += tickSum','tickSum = 0','local driftTime, bobTime = elapsed * 0.055, elapsed * 1.2','math.sin(driftTime + merchant.speed) * 50','math.sin(bobTime + merchant.speed) * 0.27','if merchant.model:GetPivot() ~= pivot then merchant.model:PivotTo(pivot) end','0.035 + math.sin(elapsed * (if mode == "storm" then 1.5 else 0.6)) * 0.012','if sea.Color ~= waterColor then sea.Color = waterColor end','local flash = math.sin(elapsed * 0.47 + sceneSeed) > 0.994','local brightness = (if phase == "night" then -0.12 else 0.025) + (if flash then 0.23 else 0)','if colorGrade.Brightness ~= brightness then colorGrade.Brightness = brightness end','for _, anchor in oceanNodes do anchor:Destroy() end','for _, anchor in weatherNodes do anchor:Destroy() end','lighting.ClockTime, lighting.FogColor = savedLighting.clock, savedLighting.fogColor','bloom:Destroy()','sunRays:Destroy()','colorGrade:Destroy()']) assert.ok(env.includes(token),token);
  assert.equal(env.split('envConnection:Disconnect()').length-1,2);
});

// [4차 추가 원본 8종] Kenney CC0 실물 지형의 원본 해시·등록 권한·기존 모바일 예산을 함께 검증한다.
test('대항해시대 4차 원경 능선·자연 메시 8종·해안 시각 모델 검증',()=>{
  const root='roblox-games/mare-essentia/';
  const registry=JSON.parse(readText(root+'assets-registered.json')).assets;
  const ids=readText(root+'src/ReplicatedStorage/Shared/AssetIds.luau');
  const originals={
    'tree-plateau':'f71ffc832f57211786833401e5e5a980f3b9188e',
    'tree-pinetallc-detailed':'db0568ca14d97917aa0c0fccc17f8feddb0e21e4',
    'plant-flattall':'892506b42f756ce42a0c0d7dbdadd8c29c07ecc0',
    'cliff-cornerinnerlarge-rock':'eb7e85430f5a74a1405bfaea14ed1da062a65046',
    'cliff-cornertop-rock':'2d6be6c8feb0c42d697d48d888fd0c45e996865f',
    'ground-riverbendbank':'3493554fdeeec1c8409478d7e61c0e0338a31556',
    'rock-largec':'2cdf83e8a9e681a0b1c6aef4d9933d772d3ebc65',
    'tree-palmbend':'f1ce81e92c48c980fca2de9f0605702e415efb30',
  };
  for(const [name,sha] of Object.entries(originals)){
    const key='Terrain/'+name, row=registry[key];
    assert.equal(row?.license,'CC0-1.0',key+' 무료 원본');
    assert.equal(row?.assetType,'Model',key+' 실물 메시');
    assert.equal(row?.usePermissionGranted,true,key+' 체험 권한');
    assert.ok(/^[1-9][0-9]*$/.test(String(row?.assetId||'')),key+' Roblox ID');
    assert.ok(ids.includes('["'+key+'"] = '+row.assetId),key+' AssetIds 연결');
    const bytes=fs.readFileSync(root+'assets/terrain/'+name+'.glb');
    assert.equal(bytes.toString('ascii',0,4),'glTF',key+' 원본 GLB');
    const actual=crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length))
      .update(Buffer.from([0])).update(bytes).digest('hex');
    assert.equal(actual,sha,key+' 원본 해시 동일');
  }
  const field=readText(root+'src/ReplicatedStorage/Shared/FieldScene.luau');
  const naval=readText(root+'src/ReplicatedStorage/Shared/NavalBattle.luau');
  assert.match(field,/FieldBackdropCrestCount/);
  assert.match(field,/local backdropCount = if visualMobile then 2 else 4/);
  assert.match(field,/terrain:FillBall\(center, r, mat\)/);
  assert.match(field,/table.insert\(hills, \{ center, r \}\)/);
  assert.match(field,/AssetIds\["Terrain\/tree-plateau"\]/);
  assert.match(field,/AssetIds\["Terrain\/tree-pinetallc-detailed"\]/);
  assert.match(field,/AssetIds\["Terrain\/plant-flattall"\]/);
  assert.match(field,/AssetIds\["Terrain\/rock-largec"\]/);
  assert.match(naval,/cliff-cornerinnerlarge-rock/);
  assert.match(naval,/cliff-cornertop-rock/);
  assert.match(naval,/local originalCoastCount = #shoreModels/);
  assert.match(naval,/if \(not MOBILE_VFX or index <= 1\) and AssetIds/);
  assert.match(naval,/NavalDepthShoreBreakCount/);
});


// [지상전 지리 다양화 회귀] 대륙·항구·개별 탐험지 배경은 기존 실물만 사용하고
// 게임 전투 RNG/보상/저장과 독립이다. 신규 모델은 자산번호 없으면 참조하지 않는다.
test('지상전 21종 무료 자연 모델과 대륙·항구·퀘스트별 환경 구분',()=>{
  const uploader=readText('tools/mare-essentia-upload-assets.mjs');
  const workflow=readText('.github/workflows/owner-mare-essentia-assets.yml');
  const field=readText('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/FieldScene.luau');
  const client=readText('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau');
  const approved=[...uploader.matchAll(/\{original:'([^']+)', name:'(kenney_[^']+)'\}/g)];
  assert.equal(approved.length,21,'기존 등록기에 CC0 자연 원본 21종');
  assert.equal(new Set(approved.map(x=>x[1])).size,21,'원본 이름 중복 금지');
  assert.equal(new Set(approved.map(x=>x[2])).size,21,'등록 대상 이름 중복 금지');
  for(const entry of approved){
    assert.ok(workflow.includes("'"+entry[2]+"'"),'원본 검증·권한 확인 누락 '+entry[2]);
  }
  assert.match(uploader,/natureArchiveSha = '[0-9a-f]{64}'/);
  assert.match(uploader,/digest !== natureArchiveSha/,'외부 보관본도 동일 해시만 허용');
  assert.match(uploader,/if \(!archive\) throw new Error\('MARE_CC0_NATURE_OFFICIAL_ARCHIVE_HASH_INVALID'\)/);
  assert.match(uploader,/MARE_CC0_NATURE_DUPLICATE_MESH/);
  assert.match(uploader,/tools\/devloop\/register_asset\.py/,'기존 정본 등록기 유지');
  assert.match(workflow,/usePermissionGranted'\) is not True/);
  assert.match(workflow,/if len\(confirmed\)!=21/);
  assert.match(field,/local PORT_NATURE = \{/,'항구 고유 지형 입력');
  assert.match(field,/local PORT_NATURE_MODELS = \{/,'항구별 등록 실물 배치 표');
  const ids=readText('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/AssetIds.luau');
  const portModels=field.split('local PORT_NATURE_MODELS = {')[1]?.split('-- [지역별 생태]')[0]||'';
  const scenery=[...portModels.matchAll(/\{"(Terrain|Town|Castle|Naval)","([^"]+)"/g)];
  assert.ok(scenery.length>=35,'항구별 실물 지형 모델 편성');
  for(const row of scenery){
    assert.ok(ids.includes('["'+row[1]+'/'+row[2]+'"] ='),'미등록 항구 배경 자산 '+row[1]+'/'+row[2]);
  }
  for(const port of ['venice','amsterdam','bergen','cape_town','zanzibar','goa','busan',
    'calcutta','new_orleans','san_francisco','rio','sydney','honolulu','guam']){
    assert.match(field,new RegExp('\\b'+port+'='),'고유 지리 정체성: '+port);
  }
  for(const geo of ['europe','africa','asia','north_america','south_america','oceania']){
    assert.ok(field.includes('"'+geo+'"'),'대륙 분류 '+geo);
  }
  for(const terrain of ['forest','jungle','swamp','coast','glacier','volcanic','highland',
    'mine','desert','farm','ruins','fort','lake','plains']){
    assert.ok(field.includes('questTerrain == "'+terrain+'"'),'퀘스트 지형 '+terrain);
  }
  for(const attr of ['FieldContinent','FieldPortId','FieldSiteId','FieldPortNature',
    'FieldVisualSeed','FieldQuestTerrainTheme','FieldSeasonLabel']){
    assert.ok(field.includes('"'+attr+'"'),'현장 실측 표지 '+attr);
  }
  assert.match(client,/siteId = s\.id/,'기존 탐험 지점 ID를 FieldScene에 전달');
  assert.match(client,/portId = s\.portId/,'기존 항구 ID 유지');
  assert.match(field,/local visualKey = portId \.\. "\/" \.\. \(opts\.siteId or opts\.name or ""\)/);
  assert.match(field,/portVisualSeed \* 31 \+ string\.byte\(visualKey, index\)/);
  assert.match(field,/if index == 3 and variants then/,'기존 문화권 대표 건물 2개 유지');
  assert.match(field,/AssetIds\[candidate\[1\] \.\. "\/" \.\. candidate\[2\]\]/,'등록된 모델만 사용');
  assert.match(field,/local visualTreeCount = treeCount/);
  assert.match(field,/local visualRockCount = rockCount/);
  assert.match(field,/local detailCount = math\.max\(24, math\.floor\(24 \* math\.sqrt\(AREA\)\)\)/);
  // [등록 후 실제 사용] 신규 21종을 기존 자연·암석·바닥 후보만으로 사용한다.
  // [정확한 신규 범위] 기존 항구 건물(kenney_wood_arch_01 등)은 등록된 별도 모델이다.
  // 이번 21종 자연 모델을 선택하는 세 원본 책임 블록만 검사해 기존 Town 건물을 오탐하지 않는다.
  const treeStart=field.indexOf('local trees = if winterScene or northern then');
  const rockStart=field.indexOf('local rocks = if questTerrain == "glacier" or questTerrain == "ruins" then');
  const detailStart=field.indexOf('local natureDetail = if questTerrain == "forest" then');
  assert.ok(treeStart>0 && rockStart>treeStart && detailStart>rockStart,'세 자연 모델 책임 배치 누락');
  const natureSource=[
    field.slice(treeStart,field.indexOf('for _, name in trees do',treeStart)),
    field.slice(rockStart,field.indexOf('for _, name in rocks do',rockStart)),
    field.slice(detailStart,field.indexOf('for index = #natureDetail',detailStart)),
  ].join('\n');
  const sceneryIds=[...natureSource.matchAll(/"kenney_[A-Za-z0-9_]+"/g)].map(x=>x[0].slice(1,-1));
  assert.ok(sceneryIds.length>=21,'대륙·항구·퀘스트 신규 자연 자산 선택 누락');
  const allowed=new Set(approved.map(x=>x[2]));
  for(const name of sceneryIds)assert.ok(allowed.has(name),'승인표에 없는 외부 자연 자산 '+name);
  for(const name of ['kenney_tree_fat','kenney_rock_largeB','kenney_mushroom_red',
    'kenney_mushroom_redGroup','kenney_stump_roundDetailed','kenney_ground_riverCorner']){
    assert.ok(sceneryIds.includes(name),'등록 후 탐험 배치 후보 누락 '+name);
  }
  assert.match(field,/local trees = if winterScene or northern then/);
  assert.match(field,/local rocks = if questTerrain == "glacier" or questTerrain == "ruins" then/);
  assert.match(field,/local natureDetail = if questTerrain == "forest" then/);
  assert.match(field,/if AssetIds\["Terrain\/" \.\. name\]/,'미등록 모델은 자동 생략');
  assert.match(field,/if AssetIds\["Terrain\/" \.\. name\] and not table\.find\(detailAssets, name\)/);
  assert.match(field,/local detailCount = math\.max\(24, math\.floor\(24 \* math\.sqrt\(AREA\)\)\)/,'기기별 고정 모델 상한 제거');
  // [지상전 모델 수 상한 해제] 승인 모델만 쓰고 거리별 장면을 전체 배치한다.
  assert.match(field,/local AREA = \(SIZE \/ 200\) \^ 2/,'맵 면적별 밀도 제한 해제');
  // 기존 반복 행 대신 실제 군락 책임 함수와 중앙 통로 경계를 검사한다.
  const layoutStart=field.indexOf('local function sceneryPosition(');
  const layoutEnd=field.indexOf('local pending = {}',layoutStart);
  assert.ok(layoutStart>0 && layoutEnd>layoutStart,'군락 배치 책임 함수 누락');
  const layout=field.slice(layoutStart,layoutEnd);
  assert.match(layout,/local group = math\.floor\(\(index - 1\) \/ groupSize\)/,'군락별 중심');
  assert.match(layout,/local near = lane < nearLanes/,'근경 군락 분리');
  assert.match(layout,/local depth = if near then half - 34/,'진입점 가까운 실제 깊이');
  assert.match(layout,/local corridor = math\.max\(24, half \*/,'중앙 통로 최소 폭');
  assert.match(layout,/math\.clamp\(lateral \+ math\.cos\(angle\) \* radius \+ biasX, corridor, edge\)/,'군락 중앙 통로·외곽 제한');
  assert.match(layout,/math\.clamp\(depth \+ math\.sin\(angle\) \* radius \+ biasZ, -half \* 0\.86, half - 26\)/,'스폰과 전장 경계 보존');
  assert.match(field,/sceneryPosition\(index, visualTreeCount, 5, 11, 0,/,'수목 5개 군락');
  const siteProfile=field.slice(field.indexOf('local exact = {'),field.indexOf('local selected = exact'));
  const sitesSource=readText('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/Sites.luau');
  const profiles=[...siteProfile.matchAll(/([a-z_0-9]+) = "([a-z]+)"/g)];
  const sourceIds=[...sitesSource.matchAll(/\{\s*id = "([^"]+)", name = "([^"]+)", portId = "([^"]+)"/g)].map(row=>row[1]);
  assert.equal(sourceIds.length,592,'원본 탐험지 총수');
  assert.equal(new Set(sourceIds).size,sourceIds.length,'원본 탐험지 중복 금지');
  assert.deepEqual(profiles.map(row=>row[1]).sort(),sourceIds.sort(),'전체 탐험지 ID 정확히 일치');
  const validThemes=new Set(["archive","coast","swamp","ruins","fort","highland","mine","volcanic","plains","lake","forest","jungle","desert","farm","glacier"]);
  for(const [,id,theme] of profiles) assert.ok(validThemes.has(theme),'지원하지 않는 지형 '+id);
  assert.equal(new Set(profiles.map(row=>row[1])).size,profiles.length,'탐험지 ID 중복 금지');
  for(const [,id] of profiles) assert.ok(sitesSource.includes('id = "'+id+'"'),'존재하지 않는 지점 '+id);
  for(const [id,theme] of Object.entries({london_chalk:'coast',bergen_cliffs:'coast',amsterdam_canals:'lake',carrara_quarry:'mine',vesuvius_slopes:'volcanic',edo_fuji:'highland',royal_archive:'archive',genoa_olive:'farm'})){
    assert.ok(siteProfile.includes(id+' = "'+theme+'"'),'지점 지형 불일치 '+id);
  }
  for(const [id,theme] of Object.entries({"halifax_citadel":"fort","louisbourg_fort":"fort","stjohns_banks":"coast","quebec_wilds":"forest","survey_am_d":"plains","boston_church":"archive","boston_whalers":"coast","newyork_harbor":"lake","niagara_trip":"lake","philadelphia_hall":"archive","charleston_rice":"farm","survey_am_b":"farm","neworleans_delta":"swamp","nassau_pirates":"coast","veracruz_road":"highland","survey_am_c":"mine","veracruz_battlefield":"plains","campeche_maya":"ruins","kingston_royal":"fort","hurricane_sea":"coast","survey_am_a":"coast","sanjuan_morro":"fort","bridgetown_sugar":"farm","trinidad_pitch":"lake","laguaira_coast":"coast","cartagena_walls":"fort","portobelo_fair":"archive","paramaribo_jungle":"jungle","belem_amazon":"swamp","recife_reef":"coast","salvador_church":"archive","rio_sugarloaf":"highland","rio_gold":"mine","montevideo_plata":"lake","horn_trip":"coast","buenosaires_pampas":"plains","andes_route":"highland","potosi_trip":"mine","auto_mystery_mys_sargasso":"archive","auto_lostland_el_dorado":"archive","santodomingo_amber":"mine","auto_mystery_mys_bermuda":"archive","auto_lostland_cibola":"archive","havana_fort":"fort","havana_orchard":"farm"})){
    assert.ok(siteProfile.includes(id+' = "'+theme+'"'),'미주 지점 지형 불일치 '+id);
  }
  assert.match(field,/FieldSiteComposition", "colonial-fort-ground"/,'미주 역사 요새의 중세 성 대체 금지');
  for(const [id,theme] of Object.entries({"pac_survey_00":"forest","pac_survey_01":"forest","pac_survey_02":"coast","pac_survey_03":"swamp","pac_survey_04":"forest","pac_survey_05":"jungle","pac_survey_06":"jungle","pac_survey_07":"coast","pac_survey_08":"volcanic","pac_survey_09":"coast","pac_survey_10":"archive","pac_survey_11":"archive","pac_survey_12":"archive","pac_survey_13":"coast","pac_survey_14":"archive","pac_survey_15":"coast","pac_survey_16":"coast","pac_survey_17":"coast","pac_survey_18":"coast","pac_survey_19":"coast","pac_survey_20":"coast"})){
    assert.ok(siteProfile.includes(id+' = "'+theme+'"'),'태평양 지점 지형 불일치 '+id);
  }
  assert.match(field,/FieldSiteComposition", "low-sandy-shore"/,'낮은 모래 해안');
  assert.match(field,/regionalFeatures = PORT_NATURE_MODELS\[portNature or ""\]/,'태평양 탐사에서 외국 랜드마크 제거');
  for(const [id,theme] of Object.entries({"auto_relic_london_low":"archive","auto_relic_amsterdam_low":"archive","auto_relic_lisbon_low":"archive","auto_zoology_bergen_low":"coast","auto_zoology_hamburg_low":"coast","auto_zoology_marseille_low":"coast","auto_zoology_gdansk_low":"swamp","auto_physics_genoa_low":"archive","auto_physics_amsterdam_low":"archive","auto_physics_venice_low":"archive","auto_physics_london_mid":"archive","auto_site_naples_mid":"ruins","auto_site_naples_high":"ruins","auto_site_lisbon_low":"fort","auto_site_stockholm_mid":"fort","auto_site_copenhagen_mid":"fort","auto_site_bergen_low":"coast","auto_site_marseille_mid":"ruins","auto_site_london_low":"ruins","auto_geography_london_low":"coast","auto_geography_bergen_low":"coast","auto_geography_stockholm_low":"coast","auto_geography_genoa_low":"coast","auto_geography_hamburg_low":"coast","auto_geography_lisbon_low":"coast","auto_astronomy_copenhagen_low":"archive","auto_astronomy_gothenburg_low":"archive","auto_astronomy_edinburgh_low":"archive","auto_astronomy_gdansk_mid":"archive","auto_astronomy_bergen_low":"archive","auto_astronomy_amsterdam_low":"archive","auto_astronomy_london_mid":"archive","auto_mineral_edinburgh_low":"highland","auto_mineral_dublin_low":"mine","auto_mineral_bergen_low":"highland","auto_mineral_london_low":"mine","auto_mineral_genoa_mid":"mine","auto_mineral_naples_low":"volcanic","auto_mineral_livorno_mid":"mine","auto_myth_bergen_high":"archive","auto_myth_edinburgh_low":"coast","auto_myth_copenhagen_mid":"coast","auto_myth_genoa_mid":"coast","auto_myth_naples_high":"archive","auto_myth_rouen_mid":"coast","auto_myth_london_mid":"coast","auto_myth_dublin_high":"archive","auto_mystery_mys_green_children":"plains","auto_mystery_mys_stone_circle":"ruins","auto_mystery_mys_roanoke":"archive","auto_mystery_mys_voynich":"archive","auto_mystery_mys_oak_island":"archive","auto_mystery_mys_piri_reis":"archive","auto_mystery_mys_gevaudan":"archive","auto_mystery_mys_greenland_norse":"archive","auto_mystery_mys_rongorongo":"archive","auto_mystery_mys_mary_celeste":"archive","auto_mystery_mys_franklin":"archive","auto_mystery_mys_antikythera":"archive","auto_mystery_mys_flannan":"archive","auto_mystery_lost_terra_incognita":"archive","auto_mystery_lost_edge_dragons":"archive","auto_mystery_lost_thule":"archive","auto_mystery_lost_antillia":"archive","auto_lostland_hy_brasil":"archive","auto_lostland_blessed_isles":"archive","auto_lostland_terra_australis":"archive","auto_lostland_lemuria":"archive","auto_lostland_prester_john":"archive","auto_lostland_hyperborea":"archive","auto_lostland_astheria_shore":"coast","auto_lostland_astheria_ruins":"ruins","auto_lostland_astheria_heart":"archive","auto_myth_gdansk_low":"coast","auto_chemistry_rouen_low":"archive","auto_chemistry_bordeaux_low":"archive","auto_chemistry_london_low":"archive","auto_chemistry_antwerp_low":"archive","auto_chemistry_amsterdam_low":"archive","auto_chemistry_hamburg_low":"archive","auto_chemistry_venice_low":"archive","auto_chemistry_marseille_low":"archive","auto_chemistry_london_mid":"archive","auto_chemistry_seville_mid":"archive","auto_chemistry_dublin_low":"archive","auto_philosophy_amsterdam_low":"archive","auto_philosophy_london_mid":"archive","auto_philosophy_edinburgh_low":"archive","auto_philosophy_naples_low":"archive","auto_philosophy_rouen_low":"archive","auto_philosophy_bordeaux_low":"archive","auto_philosophy_antwerp_low":"archive","auto_philosophy_hamburg_mid":"archive","auto_philosophy_hamburg_high":"archive","auto_philosophy_edinburgh_high":"archive","auto_medicine_marseille_low":"archive","auto_medicine_rouen_low":"archive","auto_medicine_venice_low":"archive","auto_medicine_london_mid":"archive","auto_medicine_antwerp_low":"archive","auto_medicine_edinburgh_low":"archive","auto_medicine_lisbon_low":"archive","auto_medicine_amsterdam_low":"archive","auto_medicine_genoa_low":"archive","auto_medicine_gothenburg_low":"archive","auto_navigation_genoa_low":"archive","auto_navigation_venice_mid":"archive","auto_navigation_lisbon_low":"archive","auto_navigation_london_low":"archive","auto_navigation_amsterdam_low":"archive","auto_navigation_seville_low":"archive","auto_navigation_edinburgh_mid":"archive","auto_navigation_london_high":"archive","auto_navigation_antwerp_mid":"archive","auto_navigation_gothenburg_low":"archive","auto_navigation_hamburg_low":"archive","auto_navigation_bergen_mid":"archive","auto_weather_london_low":"archive","auto_weather_dublin_low":"archive","auto_weather_edinburgh_low":"archive","auto_weather_marseille_low":"archive","auto_weather_bordeaux_low":"archive","auto_weather_naples_mid":"archive","auto_weather_seville_high":"archive","auto_weather_lisbon_low":"archive","auto_weather_hamburg_low":"archive","auto_weather_gothenburg_low":"archive","auto_weather_gdansk_mid":"archive","auto_weather_stockholm_low":"archive","auto_weather_london_high":"archive","auto_architecture_rouen_low":"archive","auto_architecture_antwerp_low":"archive","auto_architecture_amsterdam_low":"lake","auto_architecture_gdansk_low":"archive","auto_architecture_antwerp_mid":"fort","auto_architecture_naples_low":"archive","auto_architecture_rouen_mid":"archive","auto_architecture_bergen_mid":"archive","auto_architecture_edinburgh_low":"fort","auto_architecture_venice_low":"coast","auto_architecture_hamburg_low":"lake","auto_architecture_livorno_high":"archive","auto_art_antwerp_low":"archive","auto_art_amsterdam_low":"archive","auto_art_hamburg_low":"archive","auto_art_venice_mid":"archive","auto_art_gdansk_low":"archive","auto_art_london_low":"archive","auto_art_amsterdam_mid":"archive","auto_art_rouen_low":"archive","auto_art_gdansk_mid":"archive","auto_art_venice_high":"archive","auto_goods_lisbon_low":"archive","auto_goods_amsterdam_low":"archive","auto_goods_seville_low":"archive","auto_goods_amsterdam_mid":"archive","auto_goods_venice_low":"archive","auto_goods_seville_mid":"archive","auto_goods_genoa_low":"archive","auto_goods_bordeaux_low":"archive","auto_goods_hamburg_low":"archive","auto_goods_gothenburg_low":"archive","auto_goods_gdansk_low":"archive","auto_goods_bergen_low":"archive","auto_goods_marseille_low":"archive","auto_shipbuilding_amsterdam_low":"coast","auto_shipbuilding_gothenburg_low":"coast","auto_shipbuilding_stockholm_low":"coast","auto_shipbuilding_genoa_low":"coast","auto_shipbuilding_bergen_low":"coast","auto_shipbuilding_antwerp_low":"coast","auto_shipbuilding_rouen_low":"coast","auto_shipbuilding_copenhagen_low":"coast","auto_shipbuilding_london_mid":"coast","auto_shipbuilding_bergen_mid":"coast","auto_shipbuilding_seville_low":"coast","auto_shipbuilding_venice_mid":"coast","auto_shipbuilding_hamburg_high":"archive","auto_language_gothenburg_low":"archive","auto_language_rouen_low":"archive","auto_language_hamburg_low":"archive","auto_language_marseille_mid":"archive","auto_language_london_low":"archive","auto_language_antwerp_mid":"archive","auto_language_dublin_low":"archive","auto_language_bergen_low":"archive","auto_language_copenhagen_low":"archive","auto_language_livorno_high":"archive","auto_language_dublin_mid":"archive","auto_language_genoa_low":"archive","auto_language_seville_low":"archive","auto_language_venice_mid":"archive"})){
    assert.ok(siteProfile.includes(id+' = "'+theme+'"'),'학문·유물 지점 지형 불일치 '+id);
  }
  for(const composition of ["shipyard-workspace","study-work-court","medical-garden","observation-court","artisan-court","records-court"]){
    assert.ok(field.includes('FieldSiteComposition", "'+composition+'"'),'학문 장소 구성 누락 '+composition);
  }
  for(const [id,theme] of Object.entries({"survey_00":"coast","survey_01":"coast","survey_02":"coast","survey_03":"lake","survey_04":"coast","survey_05":"swamp","survey_06":"coast","survey_07":"lake","survey_08":"archive","survey_09":"coast","survey_10":"coast","survey_11":"highland","survey_12":"archive","survey_13":"jungle","survey_14":"coast","survey_15":"lake","survey_16":"coast","survey_17":"coast","survey_18":"coast","survey_19":"archive","survey_20":"coast","survey_21":"fort","survey_22":"forest","survey_23":"volcanic","survey_24":"archive","survey_25":"mine","survey_26":"archive","survey_27":"swamp","survey_28":"mine","survey_29":"ruins","survey_30":"coast","survey_31":"coast","survey_32":"coast"})){
    assert.ok(siteProfile.includes(id+' = "'+theme+'"'),'일반 조사 지형 불일치 '+id);
  }
  assert.match(field,/FieldSiteTerrainSource/,'지점 ID 사용 여부 진단');
  for(const [id,theme] of Object.entries({marseille_salt:'swamp',valencia_albufera:'swamp',valletta_bastions:'fort',athens_acropolis:'ruins',istanbul_bazaar:'archive',las_palmas_volcano:'volcanic',helsinki_gulf:'glacier',cyprus_copper:'mine'})){
    assert.ok(siteProfile.includes(id+' = "'+theme+'"'),'지중해·발트해 지점 분류 불일치 '+id);
  }
  assert.match(field,/FieldSiteComposition", "salt-work-waterway"/,'염전 수로 배치');
  assert.match(field,/FieldSiteComposition", "market-street"/,'시장 거리 실물 배치');
  for(const [id,theme] of Object.entries({bissau_mangrove:'swamp',calcutta_delta:'swamp',mombasa_reef:'coast',basra_canals:'lake',brunei_water:'lake',ningbo_temple:'ruins',osaka_castle:'fort',silver_mine:'mine',borneo_rainforest:'jungle',ternate_volcano:'volcanic'})){
    assert.ok(siteProfile.includes(id+' = "'+theme+'"'),'아프리카·아시아 지형 불일치 '+id);
  }
  for(const composition of ['delta-waterway','shallow-reef-shore','east-asian-temple-court','japanese-stone-fort']){
    assert.ok(field.includes('FieldSiteComposition", "'+composition+'"'),'지역별 실물 배치 누락 '+composition);
  }
  assert.match(field,/local depthLandforms = if folder:GetAttribute\("FieldSiteComposition"\) == "shallow-reef-shore"/,'얕은 해안의 중경 암벽 제거');
  assert.match(field,/local nearBands = if folder:GetAttribute\("FieldSiteComposition"\) == "shallow-reef-shore"/,'얕은 해안의 근경 암벽 제거');
  assert.match(field,/FieldSiteSpecialOriginalMissing/,'미확보 역사·자연 원본 명시');
  for(const [id,theme] of Object.entries({bergen_fjord:'coast',amsterdam_flats:'coast',stockholm_runes:'ruins',rotterdam_dike:'lake',bergen_ice_edge:'glacier',edinburgh_colliery:'mine',edinburgh_castle_rock:'fort',dublin_cranberry:'swamp'})){
    assert.ok(siteProfile.includes(id+' = "'+theme+'"'),'북해·발트 지점 지형 불일치 '+id);
  }
  for(const composition of ['tidal-flat','fjord','rocky-shore','working-wharf','megalithic-stone','lowland-waterway']){
    assert.ok(field.includes('"'+composition+'"'),'지형별 실제 배치 구분 누락 '+composition);
  }
  assert.match(field,/if tidal then[\s\S]*?featureList\[4\] = \{ "Terrain", "kenney_rock_smallFlatA"/,'갯벌은 높은 암벽 대신 낮은 암초');
  assert.match(field,/elseif wharf then[\s\S]*?featureList\[7\] = \{ "Cargo", "food-barrel-fish"/,'작업 부두 실물');
  assert.match(field,/FieldSiteComposition", "megalithic-stone"/,'거석 유적 석재 배치');
  assert.match(field,/FieldSiteComposition", "lowland-waterway"/,'저지대 수로 배치');
  assert.match(field,/Enum\.Material\.Limestone/,'백악 및 대리석 바닥');
  assert.match(field,/FieldCropOriginalMissing/,'원본 없는 작물 표시 금지');
  assert.match(field,/not nautical or questTerrain == "coast" or questTerrain == "lake" or questTerrain == "swamp"/,'내륙 카누 배치 금지');
  assert.match(field,/sceneryPosition\(index, visualRockCount, 4, 7, 1,/,'암석 4개 군락');
  assert.match(field,/distance >= 400 then "far" elseif distance >= 120 then "mid" else "near"/,'진입 위치 기준 실제 거리 분류');
  assert.match(field,/local signature = opts\.portScenery/,'항구별 기존 대표 경관 정본');
  assert.match(field,/FieldPortLandmarkOriginalMissing/,'실제 역사 원본 누락을 별도로 기록');
  assert.match(field,/archive = \{/,'기관 정원 실물 배치');
  assert.match(field,/terrain:FillBlock\(waterCF, waterSize, Enum\.Material\.Water\)/,'해안 실제 외곽 물');
  assert.match(field,/terrain:FillBlock\(waterCF, waterSize, Enum\.Material\.Air\)/,'퇴장시 해안 물 정리');
  assert.ok(!field.includes('else 0.34 end)'), 'Luau if 조건식에 잘못된 end 금지');
  assert.match(field,/sceneryPosition\(index, detailCount, 6, 4\.8, 2,/,'하층 식생 6개 군락');
  assert.match(layout,/lane \* 0\.61803398875/,'반복 행 대신 깊이별 군락 위상');
  assert.match(layout,/local angle = slot \* math\.pi \* 2 \/ groupSize/,'군락 내부 분산');
  assert.match(field,/local visualLayoutRng = Random\.new\(/,'전경 난수는 전투 시드에서 분리');
  assert.match(field,/local visualTreeCount = treeCount/,'수목 모바일 제한 해제');
  assert.match(field,/local visualRockCount = rockCount/,'암석 모바일 제한 해제');
  assert.match(field,/local detailCount = math\.max\(24, math\.floor\(24 \* math\.sqrt\(AREA\)\)\)/,'상세소품 수량 자동 확장');
  assert.match(field,/for index, entry in featureList do/,'전체 지형 랜드마크 사용');
  assert.match(field,/for _, spec in depthLandforms do/,'전체 절벽층 사용');
  assert.match(field,/if AssetIds\["Terrain\/" \.\. spec\[1\]\] then/,'승인 근경 모델 사용');
  assert.match(field,/for index, feature in regionalFeatures do/,'지역 대표 모델');
  assert.match(field,/math\.floor\(pr\[3\] \* math\.sqrt\(AREA\)\)/,'문화권 소품 수량 자동 확장');
  assert.match(field,/for index, e in lm\[2\] do/,'퀘스트 건축 전체 사용');
  for(const cap of ['math.min(treeCount, 44)','math.min(rockCount, 36)',
    'if not visualMobile or index <= 9 then','if not visualMobile or index <= 3 then',
    'if not visualMobile or index <= 22 then','local detailCount = if visualMobile then 10 else 24']){
    assert.ok(!field.includes(cap),'남은 모델 하드캡: '+cap);
  }
  assert.match(field,/local visualTreeCount = treeCount/);
  assert.match(field,/local visualRockCount = rockCount/);
  // [무제한 경관 프레임 안정성] 기존 배치·자산만 사용하고 한 프레임에 몰리는 복제를 분산.
  assert.match(field,/local sceneryBatch = 0/,'기존 장면 배치에 프레임 분산');
  assert.match(field,/sceneryBatch \+= 1/,'실제 로드된 모델만 분산 계수');
  assert.match(field,/if sceneryBatch >= 12 then/,'프레임별 배치 분산');
  assert.match(field,/if solid ~= true then d\.CanQuery = false end/,'비충돌 장식만 물리 쿼리에서 제외');
  // [저폴리 자산 권한 보호] RenderFidelity 쓰기는 클라이언트 진입 실패 원인이라 제거됨: 쓰기 금지로 고정.
  assert.doesNotMatch(field,/d\.RenderFidelity\s*=/,'RenderFidelity 쓰기 금지(권한 오류)');
  assert.match(field,/if distance >= 400 and not arid then/,'실제 400스터드 밖 수목만 승인 간결 모델로 선택');
  assert.match(field,/if distance >= 400 and AssetIds\["Terrain\/kenney_rock_smallFlatA"\]/,'실거리 원경 암석');
  assert.match(field,/entry\.band, entry\.horizon, entry\.horizonNature = "far", true, true/,'실제 원경 자연층은 전투 대상 아님');
  assert.match(field,/if entry\.horizonNature then[\s\S]*?else[\s\S]*?FieldHorizonPlaced/,'자연층은 항구 실물 등록 수치와 분리');
  assert.match(field,/horizonZ \+ 12 \+ index \* 4/,'전장 바깥 자연층 실제 좌표');
  assert.ok(field.includes('AssetIds["Terrain/" .. simpler]'),'지역에 맞는 기등록 자연 메시만 선택');
  assert.ok(field.includes('AssetIds["Terrain/kenney_rock_smallFlatA"]'),'원경 암석의 기등록 간결 메시만 선택');
  assert.match(field,/m:SetAttribute\("FieldSceneryLowPolyVariant", true\)/,'실제 배치된 원경 경량 모델 기록');
  assert.match(field,/FieldSceneryLowPolyPlaced/,'원경 간결 모델 배치 수 기록');
  assert.match(field,/d\.CanCollide = solid == true/,'원본 실물 충돌 유지');
  assert.match(field,/if scenicBand == "far" or \(solid ~= true/,'충돌 실물 포함 원경 그림자 생략');
  assert.match(field,/scenicBand == "mid" and desired <= 9/,'작은 중경 장식 그림자 절제');
  assert.match(field,/or desired <= 4\.5\)\) then/,'초소형 장식 그림자 절제');
  assert.match(field,/p\.CastShadow = false -- 보이지 않는 필드 경계/,'투명 전장 경계 그림자 제거');
  assert.match(field,/safetyFloor\.CastShadow = false/,'투명 낙사 방지판 그림자 제거');
  assert.match(field,/entry\.tint, entry\.band\)/,'기존 승인 모델 배치에 거리 계층 연결');
  assert.match(field,/local maxReach = rangeR \* STUD \+ 3 \+ obj\.radius/,'기존 무기 사거리·장식 반경 유지');
  assert.match(field,/if dx \* dx \+ dz \* dz > maxReach \* maxReach then continue end/,'먼 실물 장식의 공격 판정 조기 제외');
  assert.match(field,/if AC\.inReach\(rangeR \* STUD \+ 3, arcR, nearDist, angle\) then/,'기존 공격 사거리·각도 최종 판정 보존');
  for(const attr of ['FieldSceneryNearPlaced','FieldSceneryMidPlaced','FieldSceneryFarPlaced']){
    assert.ok(field.includes('"'+attr+'"'),'거리별 실제 배치 기록 '+attr);
  }
  // [기존 Studio QA] 메인 필드 소스 변경을 전용 촬영기에 연결해 스튜디오 실화면까지 확인한다.
  const autoQa=readText('.github/workflows/studio-autoqa.yml');
  const script=JSON.parse(readText('roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-field.json'));
  assert.match(autoQa,/candidate=FIELD/,'지상전 변경 전용 검사 라우팅');
  assert.ok(autoQa.includes('FIELD) script=roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-field.json'),'기존 Studio 실행기 사용');
  assert.deepEqual(script.filter(row=>row.type==='capture').map(row=>row.name),
    ['f0_environment','f1_start','f2_later'],'실제 캐릭터 근경 포함한 3회 촬영');
  assert.ok(script.some(row=>row.code?.includes("workspace:SetAttribute('DevGod',true)")),'Studio 전경 촬영 중 적 공격에 따른 장면 조기 종료 방지');
  assert.ok(script.some(row=>row.code?.includes('FIELD_SCENERY_NEAR_MISSING')),'근경 실물 생성 검사');
  assert.ok(script.some(row=>row.code?.includes('FIELD_SCENERY_MID_MISSING')),'중경 실물 생성 검사');
  assert.ok(script.some(row=>row.code?.includes('studioFPS=')),'실측 스튜디오 FPS 로그');
  assert.ok(script.some(row=>row.code?.includes('FIELD_LOW_POLY_VARIANT_MISSING')),'스튜디오 기등록 원경 간결 메시 실제 생성 검사');
  assert.ok(script.some(row=>row.code?.includes('FIELD_LOW_POLY_COUNT_MISMATCH')),'스튜디오 원경 간결 메시 집계 대조');
  assert.ok(script.some(row=>row.code?.includes('lowPolyModels=')),'스튜디오 원경 간결 실물 수 계측');
  assert.ok(!script.some(row=>row.code?.includes('FIELD_LOW_POLY_MESH_MISSING')),'RenderFidelity 쓰기 검사는 제거됨');
  assert.ok(script.some(row=>row.code?.includes('lowPolyMeshes=')),'스튜디오 성능형 메시 적용 수 계측');
  assert.ok(script.some(row=>row.code?.includes('hiddenSceneryFPS=')),'스튜디오 배경 렌더 병목 단독 계측');
  assert.ok(script.some(row=>row.code?.includes('pair[1].LocalTransparencyModifier=pair[2]')),'진단 직후 장식 화면 표시 원복');
  assert.ok(script.some(row=>row.code?.includes('FIELD_SCENERY_PROFILE_EMPTY')),'장식 표시 변경이 실제 있었는지 검증');
  assert.ok(!field.includes('LocalTransparencyModifier=1'),'게임 실행 시 모델 임의 숨김 금지');
  assert.ok(script.some(row=>row.code?.includes('FIELD_GROUND_MATERIAL_MISMATCH')),'스튜디오 해안 모래 실측');
  assert.ok(script.some(row=>row.code?.includes("FieldQuestTerrainTheme')=='coast")),'해적 소굴의 해안 퀘스트 지형 검사');
});


// [항구 실제 화면 QA] 1,000단계 기존 플레이 검사는 유지하고 항구 13곳의 상공·거리 장면을 별도 실촬영한다.
test('13 representative port Studio captures fail closed on build and retain both real viewpoints', () => {
  const script=JSON.parse(readText('roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-startports.json'));
  const ports=['london','amsterdam','rouen','lisbon','istanbul','zanzibar','calicut','nagasaki','veracruz','busan','canton','sydney','cartagena_indias'];
  assert.equal(script.length,80,'기존 9곳 56단계 보존 + 4곳 촬영 24단계');
  const scenes=script.filter(row=>row.type==='luau'&&row.code?.includes('PORT_CAPTURE_READY:'));
  assert.equal(scenes.length,ports.length);
  const names=script.filter(row=>row.type==='capture').map(row=>row.name);
  assert.equal(names.length,26,'13개 항구 각각 실화면 2장');
  assert.equal(script.filter(row=>row.type==='wait').length,27);
  for(const id of ports){
    const scene=scenes.find(row=>row.code.includes("portId='"+id+"'"));
    assert.ok(scene,'실제 항구 장면 생성 누락: '+id);
    assert.match(scene.code,/return PS\.build\(/,'생성 결과 누락 금지');
    assert.ok(scene.code.includes('PORT_CAPTURE_BUILD_FAILED:'+id),'생성 실패를 숨기지 않는다');
    assert.ok(scene.code.includes('PORT_CAPTURE_MISSING_GEOMETRY:'+id),'빈 장면을 촬영 성공으로 처리하지 않는다');
    assert.ok(scene.code.includes('built.folder.Parent==workspace'),'실제 Workspace 장면 연결 확인');
    assert.ok(!scene.code.includes('return tostring(ok)..tostring(err)'),'오류 문자열을 성공으로 위장 금지');
    assert.ok(names.includes(id+'_L3_top') && names.includes(id+'_L3_street'),'두 실화면 프레임 누락: '+id);
  }
  const workflow=readText('.github/workflows/studio-autoqa.yml');
  assert.match(workflow,/candidate=PORTS/,'기존 Studio 자동 선택기의 항구 장면 분기');
  assert.match(workflow,/PORTS\) script=roblox-games\/mare-essentia\/tools\/devloop\/studio-scripts\/mare-startports\.json/,'항구 실화면 스크립트 전송');
  assert.match(workflow,/\*\) scope=FULL ;;\s*esac/,'기존 복합 변경 시 전체 회귀 폴백 유지');
  const core=JSON.parse(readText('roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-qa-click.json'));
  assert.equal(core.length,1000,'기존 실제 플레이 검증 1,000단계는 별도로 유지');
});

// [항구 지시서 자동 배치] 기존 필지의 승인된 현지 모델만 선택하고 미로딩이면 기존 표현을 유지한다.
test('지역별 공방·우물·종교·시장·제분 시설은 해당 항구 정식 자산만 자동 선택한다',()=>{
 const scene=readText('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/PortScene.luau');
 for(const token of [
  'info.portId .. (if n % 2 == 0 then "_bld_carpenter" else "_bld_smithy")',
  'if portWorkshop and not AssetIds["Town/" .. portWorkshop] then portWorkshop = nil end',
  'ground = importedModel(folder, "Town", "floor_base", at, 21, false, c[6])',
  'local originalWell = PortScene.cultureSlot(info.portId .. "_bld_well")',
  'if not detail and itemName == originalWell then',
  'local originalReligious = info.portId .. (if lvl <= 2 then "_bld_chapel" else "_bld_temple")',
  'local placedOriginal = AssetIds["Town/" .. originalReligious]',
  'if not placedOriginal then put("Town", "church"',
  'local localMarket = PortScene.cultureSlot(info.portId .. "_bld_market_stalls")',
  'if not originalStall and stallAsset == localMarket then',
  'AssetIds["Town/" .. PortScene.cultureSlot(info.portId .. "_bld_mill")]',
  'if not building and workshop == PortScene.cultureSlot(info.portId .. "_bld_mill") then'
 ]) assert.ok(scene.includes(token),token);
 for(const port of ['london','acapulco','edo']){
  const brief=readText('roblox-games/mare-essentia/docs/ports/'+port+'.md');
  for(const role of ['well','chapel','temple','market_stalls','mill','smithy','carpenter'])
   assert.ok(brief.includes(port+'_bld_'+role),port+':'+role);
 }
});

test('Mare naval HUD avoids duplicate writes without changing cooldown and health conditions',()=>{
  const naval=read('ReplicatedStorage/Shared/NavalBattle.luau');
  for(const token of ["local meSize, foeSize = UDim2.fromScale(meHp, 1), UDim2.fromScale(foeHp, 1)","if meFill.Size ~= meSize then meFill.Size = meSize end","if foeFill.Size ~= foeSize then foeFill.Size = foeSize end","local reloadSize = UDim2.new(prog, -8 * prog, 0, 3)","if reloadFill.Size ~= reloadSize then reloadFill.Size = reloadSize end","if reloadFill.BackgroundColor3 ~= reloadColor then reloadFill.BackgroundColor3 = reloadColor end","if remaining > 0 and sk.id ~= \"fire\" then","if buffFill.Visible ~= buffVisible then buffFill.Visible = buffVisible end","if b.Text ~= sk.text then b.Text = sk.text end","local interactable = ready and phase == \"duel\" and not opts.cardOnly and not opts.card","if b.Interactable ~= interactable then b.Interactable = interactable end","if b.Active ~= interactable then b.Active = interactable end","if b.AutoButtonColor ~= interactable then b.AutoButtonColor = interactable end"]) assert.ok(naval.includes(token),token);
  assert.ok(naval.includes('b:SetAttribute("NavalReadyPulseUntil", now + 0.55)'));
  assert.ok(naval.includes('local reloadCaption = if not inRange then "사거리 밖"'));
  for(const token of ['if reloadText.Text ~= reloadCaption then reloadText.Text = reloadCaption end','if distLabel.Text ~= distanceText then distLabel.Text = distanceText end','if distLabel.TextColor3 ~= distanceColor then distLabel.TextColor3 = distanceColor end','if tactic.Visible ~= visible then tactic.Visible = visible end','if foeArrow.Visible ~= not onScr then foeArrow.Visible = not onScr end','if foeArrowTag.Visible ~= not onScr then foeArrowTag.Visible = not onScr end','if foeArrowTag.Text ~= arrowText then foeArrowTag.Text = arrowText end','if mePct.Text ~= meText then mePct.Text = meText end','if foePct.Text ~= foeText then foePct.Text = foeText end','if meFill.BackgroundColor3 ~= meColor then meFill.BackgroundColor3 = meColor end','if foeFill.BackgroundColor3 ~= foeColor then foeFill.BackgroundColor3 = foeColor end','math.ceil(meHp * rt.meMax)','math.ceil(foeHp * rt.foeMax)','math.ceil(meHp * 100)','math.ceil(foeHp * 100)']) assert.ok(naval.includes(token),token);
});

test('Mare naval support and music retries release ended scene references',()=>{
  const naval=read('ReplicatedStorage/Shared/NavalBattle.luau');
  const audio=read('ReplicatedStorage/Shared/Sfx.luau');
  for(const token of ['if not gui.Parent then return end','CH.popTimers[l] = task.delay(1.7, function()','CH.popTimers[l] = nil','CH.introThread = task.delay(1.2, function()','if not gui.Parent then break end','task.cancel(CH.introThread)','for _, timer in CH.popTimers do task.cancel(timer) end','table.clear(CH.popTimers)','table.clear(CH.chips)','table.clear(CH.shown)']) assert.ok(naval.includes(token),token);
  for(const token of ['if musicRetry then task.cancel(musicRetry); musicRetry = nil end','musicRetry = task.delay(22, function()','musicRetry = task.delay(retryAfter, function()']) assert.ok(audio.includes(token),token);
});

test('Mare naval skill and mast timers and live projectile connections release scene references',()=>{
  const naval=read('ReplicatedStorage/Shared/NavalBattle.luau');
  const skill=naval.slice(naval.indexOf('function FX.skill(sh, id, dur)'),naval.indexOf('function FX.shipFire'));
  const mast=naval.slice(naval.indexOf('local function dismast(sh)'),naval.indexOf('local function shoot(fromPos'));
  const shot=naval.slice(naval.indexOf('local function shoot(fromPos'),naval.indexOf('local function forward(theta)'));
  for(const token of ['FX.effectTimers[at] = task.delay(dur, function()','FX.effectTimers[at] = task.delay(2, function()','if finished or not at.Parent or not lt.Parent then return end']) assert.ok(skill.includes(token),token);
  assert.equal(skill.split('FX.effectTimers[at] = nil').length-1,2);
  for(const token of ['FX.effectTimers[pole] = task.delay(2.5, function()','FX.effectTimers[pole] = nil','if pole.Parent then pole:Destroy() end','if sail.Parent then sail:Destroy() end']) assert.ok(mast.includes(token),token);
  for(const block of [mast,shot]){
    assert.ok(block.includes('conns[conn] = conn'));
    assert.equal(block.split('conn:Disconnect()').length-1,2);
    assert.equal(block.split('conns[conn] = nil').length-1,2);
  }
  assert.ok(naval.includes('for _, timer in FX.effectTimers do task.cancel(timer) end'));
  assert.ok(naval.includes('table.clear(FX.effectTimers)'));
  assert.ok(shot.includes('local hit = hullHit and (not hitTest or hitTest())'));
  for(const token of ['local flightDelta = to - from','FX.muzzle(from, flightDelta.Unit, style, nc)','local u = math.clamp((os.clock() - t0) / dur, 0, 1)','local angle = u * math.pi','from:Lerp(to, u) + Vector3.new(0, math.sin(angle) * nc.arc, 0)','flightDelta + Vector3.new(0, math.cos(angle) * nc.arc * math.pi, 0)','if ball.CFrame ~= frame then ball.CFrame = frame end','struck.impactSide = if broadside:Dot(flightDelta) >= 0 then 1 else -1','local timer = task.delay(0.15, function()','if not finished and folder.Parent then Sfx.play("sfx_splash", 0.22, 0.85) end']) assert.ok(shot.includes(token),token);
  assert.equal(shot.split('conns[timer] = timer').length-1,4);
  assert.equal(shot.split('conns[coroutine.running()] = nil').length-1,4);
  assert.ok(shot.includes('if hit then\n\t\t\t\t\tfx()'));
});

test('Mare naval pickups reuse display calculations and preserve collection rules',()=>{
  const naval=read('ReplicatedStorage/Shared/NavalBattle.luau');
  const items=naval.slice(naval.indexOf('function FX.itemsStep(now)'),naval.indexOf('local function dismast(sh)'));
  for(const token of ['local pickupRadius = math.max(12, me.length * 0.25)','local bobTime = now * 1.9','(me.pos - item.pos).Magnitude <= pickupRadius','math.sin(bobTime + item.phase) * 0.42','math.sin(now + item.phase) * 0.10','local courseUnit = if nearestDist > 0.1 then course.Unit else Vector3.zero','local front = if nearestDist > 0.1 then courseUnit:Dot(heading) else 1','local side = courseUnit:Dot(right)','if pickupCue.Visible ~= visible then pickupCue.Visible = visible end','if pickupCue.Text ~= text then pickupCue.Text = text end','if pickupCue.TextColor3 ~= color then pickupCue.TextColor3 = color end','FX.pickupCueAt = now + 0.20','FX.nextItemAt = now + (if MOBILE_VFX then 13 else 11)','#FX.items < 3','expires = now + 30','FX.mineCharges = math.min(2, FX.mineCharges + 1)','skillReady[sk.id] = math.max(now, skillReady[sk.id] - 5)','table.remove(FX.items, i)','if dist < nearestDist then closest, nearestDist = entry, dist end']) assert.ok(items.includes(token),token);
  assert.equal(items.split('course.Unit').length-1,1);
  assert.ok(items.indexOf('local pickupRadius =') < items.indexOf('for i = #FX.items, 1, -1 do'));
});

test('Mare naval finish releases connection references and cancels pending timeout without cancelling itself',()=>{
  const naval=read('ReplicatedStorage/Shared/NavalBattle.luau');
  const finish=naval.slice(naval.indexOf('local function finish(replay)'),naval.indexOf('-- [해전 원형 버튼]'));
  assert.match(finish,/finished = true/);
  assert.match(finish,/for _, c in conns do\s+local ok, err = pcall\(function\(\)/);
  assert.match(finish,/if type\(c\) == "thread" then\s+if c ~= coroutine.running\(\) and coroutine.status\(c\) ~= "dead" then task.cancel\(c\) end\s+else\s+c:Disconnect\(\)/);
  assert.match(finish,/table\.clear\(conns\)\s+gui:Destroy\(\)\s+folder:Destroy\(\)/);
  assert.ok(finish.includes('opts.onDone(math.floor(flair), replay == true)'));
  const timeout=naval.slice(naval.indexOf('local timeout = task.delay(130'),naval.lastIndexOf('return { finish = finish }'));
  assert.match(timeout,/while cardBusy and not finished do/);
  assert.match(timeout,/if not finished then\s+finish\(\)/);
  assert.match(timeout,/timeout ~= coroutine.running\(\) and coroutine.status\(timeout\) ~= "dead" then\s+task.cancel\(timeout\)/);
});

// [전투 지시서 원본 연결] 등록 키와 실제 배치 증거를 분리하고 잘못 분류된 항구는 보류한다.
test('해역·탐험 지시서 원본은 기존 시각 배치에서 정확한 승인 키만 사용한다',()=>{
 const root='roblox-games/mare-essentia/';
 const naval=readText(root+'src/ReplicatedStorage/Shared/NavalBattle.luau');
 const field=readText(root+'src/ReplicatedStorage/Shared/FieldScene.luau');
 const map=naval.match(/local briefPorts = \{([\s\S]*?)\n\s*\}/)[1];
 const held=new Set(["acapulco","san_francisco","buenos_aires","st_helena","genoa","venice","ancona","split","trieste","honolulu","guam","perth","darwin"]);
 const used=new Set();
 for(const [,sea,ports] of map.matchAll(/([a-z_]+) = "([^"]*)"/g)){
  const brief=readText(root+'docs/battle_backdrops/naval/'+sea+'.md');
  const line=brief.split('\n').find(x=>x.startsWith('- 이 해역 항구:'));
  const expected=[...line.matchAll(/\x60([a-z0-9_]+)\x60/g)].map(m=>m[1]).filter(p=>!held.has(p));
  assert.deepEqual(ports.split(' ').filter(Boolean),expected);
  for(const p of expected){assert.ok(!used.has(p),p);used.add(p);}
 }
 assert.equal([...map.matchAll(/([a-z_]+) = "/g)].length,27);
 for(const token of ['"sea_" .. briefSea .. "_" .. layer[1]','AssetIds["Naval/" .. asset]','AssetIds[kind .. "/" .. spec[1]]','NavalBriefAssetKey','NavalBriefPlaced_','node.CanCollide, node.CanTouch, node.CanQuery = false, false, false'])assert.ok(naval.includes(token),token);
 for(const token of ['local asset = "field_" .. siteId','AssetIds["Terrain/" .. asset]','entry.band, entry.horizon, entry.briefBackdrop = "far", true, true','FieldBriefBackdropPlaced','FieldBriefAssetKey','stageFeature(entry)'])assert.ok(field.includes(token),token);
});

// [동물 지상 보행] 수입 회전축을 덮지 않고 실제 해부 방향·종별 보폭·발밑 지형을 사용한다.
test('마레 지상 동물은 실제 전방과 종별 보폭으로 움직이며 바닥에서 벗어나지 않는다',()=>{
  const field=read('ReplicatedStorage/Shared/FieldScene.luau');
  const wild=field.slice(field.indexOf('[자연 관찰]'),field.indexOf('-- 미니맵:',field.indexOf('[자연 관찰]')));
  for(const name of ['horse','cow','donkey','llama','sheep','pig','elephant','dog-pug','cat','chicken']) assert.ok(wild.includes(name));
  assert.ok(wild.includes('ANATOMICAL_FORWARD')&&wild.includes('UNVERIFIED_STATIC'));
  assert.match(wild,/local requiredLegs = if biped then 2 else 4/);
  assert.match(wild,/local canWalk = facingKnown and legCount == requiredLegs/);
  assert.ok(wild.includes('local delta = target - a.travel'));
  assert.ok(wild.includes('math.abs(remainingTurn) < 0.12'));
  assert.ok(wild.includes('a.forward * proposed'));
  assert.ok(wild.includes('a.center.Rotation'));
  assert.ok(wild.includes('a.profile[1]')&&wild.includes('a.profile[3]'));
  assert.ok(wild.includes('a.homeFloor + a.groundOffset - low'));
  assert.ok(!wild.includes('PivotTo(upright'));
  assert.ok(!wild.includes('CFrame.new(0, 0, -a.travel)'));
});

test('Mare mobile distant regular enemies restore only original casting shadows before active combat',()=>{
  const field=read('ReplicatedStorage/Shared/FieldScene.luau');
  const shadow=field.slice(field.indexOf('[모바일 원거리 그림자]'),field.indexOf('멀리서 자고 있는 적은 계산을 쉰다'));
  assert.match(shadow,/if visualMobile and not e\.elite and not e\.ac\.dead then/);
  assert.match(shadow,/e\.ac\.state == "idle" or e\.ac\.state == "chase"/);
  for(const token of ['e.hurtAt','e.riseUntil','e.guardUntil','e.parryUntil','e.dodgeUntil','e.kbUntil']) assert.ok(shadow.includes(token),token);
  assert.match(shadow,/if not quiet or flat\.Magnitude <= 80 then/);
  assert.match(shadow,/elseif quiet and flat\.Magnitude > 100 then/);
  assert.match(shadow,/part:IsA\("BasePart"\) and part\.CastShadow then\s+table\.insert\(e\.shadowParts, part\)\s+part\.CastShadow = false/);
  assert.match(shadow,/if part:IsDescendantOf\(e\.model\) then part\.CastShadow = true end/);
  assert.ok(shadow.includes('e.shadowParts = nil'));
  assert.doesNotMatch(shadow,/CanCollide|CanQuery|Transparency|RenderFidelity|:Destroy\(/);
});

test('Mare limits only distant idle and chase joint sampling under frame pressure',()=>{
  const field=read('ReplicatedStorage/Shared/FieldScene.luau');
  const loop=field.slice(field.indexOf('[적 R15 관절·전술 통합 루프]'),field.indexOf('[비전투 파티]'));
  const visual=loop.slice(loop.indexOf('local constrainedVisual'),loop.indexOf('FM.actor(e.fm'));
  assert.ok(loop.indexOf('AC.stepEnemy(e.ac, enemyDt')<loop.indexOf('local constrainedVisual'));
  const moveWrite=loop.indexOf('e.model:PivotTo(nextPivot)');
  assert.ok(moveWrite>=0 && moveWrite<loop.indexOf('local constrainedVisual'));
  assert.match(loop,/if targetRot ~= rot then\s+rot = rot:Lerp\(/);
  assert.match(loop,/local nextPivot = CFrame\.new\(nextPos\) \* rot\s+if nextPivot ~= pv then\s+e\.model:PivotTo\(nextPivot\)/);
  assert.ok(loop.includes('e.model:PivotTo(e.model:GetPivot() + lunge)'));
  assert.ok(loop.includes('e.model:PivotTo(e.model:GetPivot() + e.kbVel'));
  for(const token of ['not e.boss','e.ac.state == "idle" or e.ac.state == "chase"','e.hurtAt','e.knockUntil','e.riseUntil','e.guardUntil','e.parryUntil','e.dodgeUntil','not farVisual or visualChanged','math.min(0.15','e.visualElapsed = 0']) assert.ok(visual.includes(token),token);
  assert.ok(loop.includes('FM.actor(e.fm, st, ph, visualDt, e.boss'));
  assert.ok(field.includes('if staminaNumber.Text ~= staminaText'));
  assert.ok(field.includes('if magicAmount.Text ~= magicText'));
  for(const token of ['if staminaFill.Size ~= staminaSize','if magicFill.Size ~= magicSize','if shade.Visible ~= shadeVisible','if shade.Size ~= shadeSize','if shade.BackgroundTransparency ~= shadeAlpha','if timer and timer.Visible','if track and track.Visible']) assert.ok(field.includes(token),token);
  assert.ok(field.includes('local style = Weapons.actionDesign(wpn)\n\t\tfor key, sb in combatBtns do'));
  assert.ok(field.includes('elseif sb.wasCooling then'));
  assert.ok(field.includes('if sb.btn:GetAttribute("CooldownRemaining") ~= remaining'));
});

test('Mare naval camera reuses interpolation state and fleet health only changes when needed',()=>{
  const naval=read('ReplicatedStorage/Shared/NavalBattle.luau');
  for(const token of ["local v = 1 - (1 - meHp) * mc.share","local v = 1 - (1 - foeHp) * fc.share","local size = UDim2.fromScale(math.clamp(v, 0, 1), 1)","if mc.c.fill.Size ~= size then mc.c.fill.Size = size end","if fc.c.fill.Size ~= size then fc.c.fill.Size = size end","if mc.c.fill.BackgroundColor3 ~= color then mc.c.fill.BackgroundColor3 = color end","FX.cam.pos = FX.cam.pos:Lerp(camPos, a)","FX.cam.focus = FX.cam.focus:Lerp(focus, a)","FX.cam = { pos = camPos, focus = focus }","local a = 1 - math.exp(-dt * (if cardBusy then 6 else 2.6))"]) assert.ok(naval.includes(token),token);
  assert.ok(naval.includes('local closePos = ORIGIN + mid + perp * (if MOBILE_VFX then 69 else 58)'));
  assert.doesNotMatch(naval,/FX\.cam = if FX\.cam then/);
  const camera=naval.slice(naval.indexOf('-- [접현 시네마] 포격 중에는'),naval.indexOf('-- 일정 시간 안에 끝나지 않으면 자동으로 마무리한다'));
  for(const token of ['local cameraFov = (if opts.cardOnly then (if MOBILE_VFX then 73 else 75) else (if MOBILE_VFX then 69 else 71)) - kick * 0.6 + math.min(shake, 2.5) * 2 + (me.speed / myTop) * 5 + killZoom - FX.boardZoom * (17 + math.clamp(me.fx.stage or 2, 1, 6) * 0.6)','cameraFov = 66 - (if showingSinking then 7 else 3) * math.clamp((now - endAt) / 1.5, 0, 1)','if cam.FieldOfView ~= cameraFov then cam.FieldOfView = cameraFov end','local cameraFrame = CFrame.lookAt(FX.cam.pos + Vector3.new((math.random() - 0.5) * shake, (math.random() - 0.5) * shake, 0), FX.cam.focus)','if cam.CFrame ~= cameraFrame then cam.CFrame = cameraFrame end','shake = math.max(0, shake - 3.6 * dt)','kick *= 0.86 ^ (dt * 60)','FX.boardZoom += ((if boardingView then 1 else 0) - FX.boardZoom) * (1 - math.exp(-dt * 4.2))']) assert.ok(camera.includes(token),token);
  assert.equal(camera.split('cam.FieldOfView = ').length-1,1);
  assert.equal(camera.split('cam.CFrame = ').length-1,1);
  assert.equal(camera.split('math.random()').length-1,2);
  assert.ok(camera.indexOf('cameraFov = 66 -') < camera.indexOf('if cam.FieldOfView ~= cameraFov'));
});

test('Mare naval announcements and damage cues release scheduled scene references',()=>{
  const naval=read('ReplicatedStorage/Shared/NavalBattle.luau');
  const pop=naval.slice(naval.indexOf('local function popText(text, color)'),naval.indexOf('-- [맵 보급 안내]'));
  for(const token of ['local fadeTimer = task.delay(0.92, function()','local removeTimer = task.delay(1.28, function()','local fadeTimer = task.delay(1.8, function()','local hideTimer = task.delay(0.26, function()','local removeTimer = task.delay(1.2, function()','if finished or navalHitCueSerial ~= cueSerial or not navalHitCue.Parent then return end','if not finished and navalHitCue.Parent and navalHitCueSerial == cueSerial then navalHitCue.Visible = false end','if currentAnnouncement == l then currentAnnouncement = nil end','navalHitStreak = if nowHit - navalHitAt <= 3.2 then navalHitStreak + 1 else 1','TweenInfo.new(1.1, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)']) assert.ok(pop.includes(token),token);
  assert.equal(pop.split('conns[coroutine.running()] = nil').length-1,5);
  assert.equal(pop.split('conns[fadeTimer] = fadeTimer').length-1,2);
  assert.equal(pop.split('conns[removeTimer] = removeTimer').length-1,2);
  assert.equal(pop.split('conns[hideTimer] = hideTimer').length-1,1);
});

test('Mare actor motion reuses sample options without changing role or state selection',()=>{
  const motion=read('ReplicatedStorage/Shared/FieldMotion.luau');
  const actor=motion.slice(motion.indexOf('function FM.actor('),motion.indexOf('local comboCache'));
  for(const role of ['BOSS','NPC','ENEMY']){
    assert.ok(motion.includes(role+' = { bodyPlan = "BIPED", actorClass = "'+role+'", availableJoints = AVAILABLE, secondary = 0.65 }'));
  }
  assert.equal([...actor.matchAll(/GetAttribute\("MotionRole"\)/g)].length,1);
  assert.match(actor,/if isBoss then "BOSS" elseif role == "ally-ranged" or role == "ally-melee" then "NPC" else "ENEMY"/);
  assert.match(actor,/if state == "EVADE" then "RUN"\s+elseif state == "KNOCKDOWN" or state == "GETUP" then "HIT"\s+elseif state == "BLOCK" or state == "PARRY" then "ANTICIPATION" else state, phase, ACTOR_OPTIONS\[actorClass\], h.canon/);
  assert.ok(motion.includes('for jn, cn in R6_MAP do'));
  assert.ok(actor.includes('FM.step(h, dt, rootRot, response)'));
});
 
test('Mare naval warning splash and shot sound timers leave the existing scene cleanup collection',()=>{
  const naval=read('ReplicatedStorage/Shared/NavalBattle.luau');
  const warning=naval.slice(naval.indexOf('local function warnRing'),naval.indexOf('-- [해전 이펙트]'));
  const splash=naval.slice(naval.indexOf('function FX.splash'),naval.indexOf('do -- 입자 연출용'));
  const sound=naval.slice(naval.indexOf('local function shoot(fromPos'),naval.indexOf('-- [발사 펄스]'));
  for(const [block,count] of [[warning,1],[splash,2],[sound,3]]){
    assert.equal(block.split('conns[timer] = timer').length-1,count);
    assert.equal(block.split('conns[coroutine.running()] = nil').length-1,count);
  }
  for(const token of ['conns[conn] = conn','conns[conn] = nil','local radius = if os.clock() < skillUntil.evade then 11 else 20','onLand((me.pos - center).Magnitude <= radius)','flair += 10 + combo * 2']) assert.ok(warning.includes(token),token);
  assert.ok(splash.includes('FX.waterColumn(surface, style, strength)'));
  assert.ok(sound.includes('Sfx.play("sfx_cannon_reload", 0.34, 0.95 + math.random() * 0.1)'));
});

test('Mare naval burst timers release external terrain effects on scene destruction',()=>{
  const naval=read('ReplicatedStorage/Shared/NavalBattle.luau');
  assert.match(naval,/folder\.Destroying:Connect\(function\(\)\s+for anchor, timer in FX\.burstTimers do\s+task\.cancel\(timer\)\s+anchor:Destroy\(\)\s+end\s+table\.clear\(FX\.burstTimers\)/);
  assert.match(naval,/function FX\.burst\(pos, dir, list, light\)\s+if finished or not folder\.Parent then return end/);
  assert.match(naval,/FX\.burstTimers\[anchor\] = task\.delay\(longest, function\(\)\s+FX\.burstTimers\[anchor\] = nil/);
  for(const token of ['for _, node in FX.burstPool do node.anchor:Destroy() end','table.clear(FX.burstPool)','if #FX.burstPool[i].emitters == #list then','node = table.remove(FX.burstPool, i)','local pe = existing or Instance.new("ParticleEmitter")','local l = existing or Instance.new("PointLight")','local pe = emitterOn(anchor, e, node.emitters[i])','pe:Emit(math.min(e.n or 8, if MOBILE_VFX then 12 else 26))','if lightTween then lightTween:Cancel(); lightTween:Destroy() end','if finished or not folder.Parent or #FX.burstPool >= (if MOBILE_VFX then 8 else 16) then','pe.Enabled = false','pe.Rate = 0','pe:Clear()','if node.light then node.light.Enabled = false; node.light.Brightness = 0 end','anchor.Parent = nil','table.insert(FX.burstPool, node)']) assert.ok(naval.includes(token),token);
  const burst=naval.slice(naval.indexOf('function FX.burst('),naval.indexOf('local ORANGE, YELLOW, RED'));
  assert.ok(burst.indexOf('FX.burstTimers[anchor] = task.delay(longest') < burst.indexOf('table.insert(FX.burstPool, node)'));
  assert.ok(burst.indexOf('anchor.Parent = nil') < burst.indexOf('table.insert(FX.burstPool, node)'));
  assert.match(burst,/if not node then\s+node = \{ anchor = Instance\.new\("Attachment"\), emitters = \{\} \}/);
  assert.match(naval,/longest = math\.max\(longest, e\.life \+ 0\.2\)/);
  assert.match(naval,/if finished or not at\.Parent or not lt\.Parent then return end/);
  assert.match(naval,/if not finished and folder\.Parent then Sfx\.play\(name, vol \* q, speed, fb\) end/);
});

test('Mare port construction audit records shared imported assets and separates attempted scenery failures',()=>{
  const source=readText('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/PortScene.luau');
  assert.match(source,/if RunService:IsStudio\(\) and AssetIds\[kind \.\. "\/" \.\. asset\] then/);
  assert.match(source,/m:SetAttribute\("PortPlacedAssetKey", kind \.\. "\/" \.\. asset\)/);
  assert.match(source,/sceneryExpected \+= 1/);
  assert.match(source,/CityPortSceneryFailedCount", sceneryExpected - sceneryCount/);
  assert.match(source,/CityPortSceneryFailedKeys/);
  assert.match(source,/PortAssetObservedImportKeys/);
  assert.match(source,/PortAssetObservedImportCount/);
  assert.match(source,/IMPORTED_MODEL_SCENE_CONSTRUCTION_ONLY/);
  assert.match(source,/PortAssetAuditScope", "STUDIO_SCENE_CONSTRUCTION_ONLY"/);
  assert.match(source,/CityPortMissingLandmark/);
});

test('Mare voyage camera stays outside the scaled ship envelope without changing navigation',()=>{
  const voyage=read('ReplicatedStorage/Shared/VoyageScene.luau');
  const fit=voyage.slice(voyage.indexOf('local cameraFit'),voyage.indexOf('local heel = 0'));
  assert.match(fit,/local boundsCF, boundsSize = ship:GetBoundingBox\(\)/);
  // [2026-11-28 돛줄 안 카메라 수정] 늦게 도착한 배 부품까지 다시 재고, 경계는 줄지 않는다.
  assert.match(fit,/local radius = \(boundsCF\.Position - ship:GetPivot\(\)\.Position\)\.Magnitude \+ boundsSize\.Magnitude \* 0\.5/);
  assert.match(fit,/back = math\.max\(36, radius \+ 14\)/);
  assert.match(fit,/height = math\.max\(13, baseY \+ boundsSize\.Y \* 0\.75 \+ 8, baseY \+ radius \* 0\.6 \+ 10\)/);
  assert.match(fit,/nextFit\.back = math\.max\(nextFit\.back, cameraFit\.back\)/);
  assert.match(fit,/ship\.DescendantAdded:Connect/);
  assert.match(fit,/ahead = math\.max\(46, radius \* 2\.5\)/);
  assert.ok(voyage.indexOf('ship:ScaleTo(1.7)') < voyage.indexOf('local cameraFit'));
  assert.ok(voyage.indexOf('local cameraFit') < voyage.indexOf('while not skipped and dist < total'));
  const camera=voyage.slice(voyage.indexOf('-- [항해 카메라] 실제 선박 경계 밖'),voyage.indexOf('ui(k, t)',voyage.indexOf('-- [항해 카메라] 실제 선박 경계 밖')));
  assert.match(camera,/CFrame\.new\(-cameraFit\.back, cameraFit\.height, 0\)/);
  assert.match(camera,/CFrame\.new\(cameraFit\.ahead, 6 \+/);
  assert.match(camera,/CFrame\.lookAt\(back\.Position \+ shakeOff/);
  assert.match(camera,/bankRoll \* 0\.55/);
  assert.match(voyage,/Rings\.hit\(r, lat\)/);
  // 실제 메시가 아닌 보수적인 가상 경계로 수학적 안전 여유를 검사한다.
  for(const [length,width,height,offset] of [[20,8,15,0],[80,24,65,4],[180,60,110,15],[400,120,260,35]]){
    const radius=Math.hypot(length,width,height)*0.5+offset;
    const back=Math.max(36,radius+14);
    assert.ok(back-2.2>radius+8,'선박 회전 및 최대 흔들림 후에도 선체 경계 밖');
  }
});

test('Mare voyage avoids repeated emitter and parent writes and destroys detached gulls',()=>{
  const voyage=read('ReplicatedStorage/Shared/VoyageScene.luau');
  for(const [property,value] of [['jet.emitter.Rate','jetRate'],['sternEm.Rate','sternRate'],['wake.trail.Enabled','trailEnabled'],['g.model.Parent','gullParent'],['precip.Rate','precipRate'],['hailBurst.Rate','hailRate']]){
    assert.ok(voyage.includes('if '+property+' ~= '+value+' then '+property+' = '+value+' end'),property);
  }
  assert.match(voyage,/local jetRate = math\.floor\(flow \* \(15 \+ 10 \* roughness\)\)/);
  assert.match(voyage,/local precipRate = math\.floor\(weather\.rate \* weatherLevel \* \(if mobile then 0\.60 else 1\)\)/);
  assert.match(voyage,/if breakWave then\s+jet\.emitter:Emit\(math\.ceil\(3 \+ 5 \* flow \+ 4 \* roughness\)\)/);
  assert.match(voyage,/table\.clear\(helmConns\)\s+--[^\n]*\n\s+for _, g in gulls do\s+if not g\.model\.Parent then g\.model:Destroy\(\) end\s+end\s+folder:Destroy\(\)/);
});

test('Mare naval outro releases scene visual state and ignores late card result presentation',()=>{
  const naval=read('ReplicatedStorage/Shared/NavalBattle.luau');
  const crew=naval.slice(naval.indexOf('local function crewAct'),naval.indexOf('local function updateCrews'));
  const end=naval.slice(naval.indexOf('-- 백병전: 남은 기록을 차례로 보여 준다'),naval.indexOf('elseif phase == "end" then',naval.indexOf('-- 백병전: 남은 기록을 차례로 보여 준다')));
  assert.equal(crew.split('FX.effectTimers[timer] = timer').length-1,1);
  assert.equal(end.split('FX.effectTimers[timer] = timer').length-1,2);
  assert.equal(end.split('FX.effectTimers[coroutine.running()] = nil').length-1,2);
  assert.ok(crew.includes('FX.effectTimers[coroutine.running()] = nil'));
  assert.ok(naval.includes('FX.cam, FX.sink = nil, nil'));
  const reply=naval.slice(naval.indexOf('okCards, res, rewardId = pcall(opts.onCards'),naval.indexOf('if opts.cardOnly and not finished then',naval.indexOf('okCards, res, rewardId = pcall(opts.onCards')));
  assert.ok(reply.includes('if finished or not gui.Parent or not folder.Parent then return end'));
  assert.ok(naval.includes('duration = if sunk.length >= 48 then 6.6 elseif sunk.length >= 38 then 5.2 else 3.9'));
  assert.ok(naval.includes('local showingSinking = FX.sink and sinkingTime < 0.91'));
});

test('Mare naval radar reuses fixed directions and unchanged visual state',()=>{
  const naval=read('ReplicatedStorage/Shared/NavalBattle.luau');
  for(const token of ["local count = if MOBILE_VFX then 28 else 40","local angle = (i - 1) * (math.pi * 2) / count","rangeRing.radials[i] = Vector3.new(math.cos(angle), 0, math.sin(angle))","local radial = rangeRing.radials[i]","local sideY = heading:Cross(radial).Y","local sideArc = math.abs(sideY) > 0.5","local readyArc = sideArc and sideY * enemySide > 0","if seg.Color ~= tint then seg.Color = tint end","if radar.beam.Enabled ~= enabled then radar.beam.Enabled = enabled end","if radar.ready ~= ready then","radar.ready = ready","local transparency = if opts.cardOnly then 1 else 1 - rangeRing.fade * (1 - alpha)","if seg.Transparency ~= transparency then seg.Transparency = transparency end","rangeRing.angles[i] = angle","local angle = rangeRing.angles[i]","local ringMoved = rangeRing.lastPos ~= me.pos or rangeRing.lastRange ~= cannon.range","rangeRing.lastPos, rangeRing.lastRange = me.pos, cannon.range","if dot.Transparency ~= alpha then dot.Transparency = alpha end","if dot.Color ~= tint then dot.Color = tint end","elseif dot.Transparency ~= 1 then"]) assert.ok(naval.includes(token),token);
  assert.match(naval,/local scanAngle = \(now \* 2\.45\) % tau/);
  assert.match(naval,/if ringMoved then\s+local tangent = Vector3.new\(-radial.Z, 0, radial.X\)[\s\S]*?seg.CFrame = CFrame.lookAt\(at, at \+ tangent\)\s+end/);
  assert.match(naval,/local charged = \(\(angle - me\.theta \+ tau\) % tau\) \/ tau <= reloadProgress/);
});

test('Mare boarding scene cancels pending visual and audio callbacks on destruction',()=>{
  const naval=read('ReplicatedStorage/Shared/NavalBattle.luau');
  const cards=naval.slice(naval.indexOf('g.Name = "BoardingGui"'),naval.indexOf('-- 적 포탄 낙하 경고'));
  assert.equal(cards.split('cardTimers[task.delay(').length-1,11);
  assert.equal(cards.split('cardTimers[coroutine.running()] = nil').length-1,11);
  for(const token of ['for timer in cardTimers do task.cancel(timer) end','table.clear(cardTimers)','if scorePulse then scorePulse:Cancel(); scorePulse = nil end','if finished or not g.Parent then return end','onEnd(m, actions)']) assert.ok(cards.includes(token),token);
  const roundAudio=cards.slice(cards.indexOf('task.delay(0.5, function()',cards.indexOf('local function afterAction')),cards.indexOf('local before, order = previousBoard'));
  assert.ok(roundAudio.indexOf('if finished or not g.Parent then return end') < roundAudio.indexOf('Sfx.play('));
  assert.ok(roundAudio.includes('Sfx.play(if res.winner == "me"'));
});

test('Mare naval damage fire reuses per-ship emission values and preserves thresholds and timing',()=>{
  const naval=read('ReplicatedStorage/Shared/NavalBattle.luau');
  const fire=naval.slice(naval.indexOf('function FX.shipFire'),naval.indexOf('-- [접현 충돌]'));
  assert.ok(fire.indexOf('if not state and hp >= 0.62 then return end') < fire.indexOf('local profile = sh.fx or DEFAULT_FX'));
  assert.ok(fire.indexOf('if state and now < state.next then return end') < fire.indexOf('local profile = sh.fx or DEFAULT_FX'));
  for(const token of ['state.next = now + 0.14','local rootFrame = root.CFrame','vent.Position = rootFrame:PointToObjectSpace(origin)','if MOBILE_VFX then 1 elseif stage <= 2 then 1 elseif stage <= 4 then 2 else 3','local severity = math.clamp((0.62 - hp) / 0.62, 0, 1)','local sootRate = math.floor(severity * (if MOBILE_VFX then 10 else (7 + stage * 3)))','local fireRate = if hp < 0.42 then math.floor((0.42 - hp) * (if MOBILE_VFX then 46 else (38 + stage * 9))) else 0','local brightness = if hp < 0.42 then severity * (if MOBILE_VFX then 1.1 else (1.0 + stage * 0.2)) * (0.85 + 0.15 * math.sin(now * 13)) else 0','if vent.soot.Rate ~= sootRate then vent.soot.Rate = sootRate end','if vent.fire.Rate ~= fireRate then vent.fire.Rate = fireRate end','if vent.soot.Enabled ~= sootEnabled then vent.soot.Enabled = sootEnabled end','if vent.fire.Enabled ~= fireEnabled then vent.fire.Enabled = fireEnabled end','if vent.glow.Brightness ~= brightness then vent.glow.Brightness = brightness end']) assert.ok(fire.includes(token),token);
  assert.ok(fire.indexOf('local brightness =') < fire.indexOf('for _, vent in state.vents do'));
});

test('Mare naval queued volleys release their timers and preserve the last-shot hit',()=>{
  const naval=read('ReplicatedStorage/Shared/NavalBattle.luau');
  const volley=naval.slice(naval.indexOf('-- 내 포격: 사정거리 안에서'),naval.indexOf('-- 두 배가 맞닿으면 바로 접현'));
  assert.equal(volley.split('local volleyTimer = task.delay(k * 0.08, function()').length-1,3);
  assert.equal(volley.split('conns[coroutine.running()] = nil').length-1,3);
  assert.equal(volley.split('conns[volleyTimer] = volleyTimer').length-1,3);
  assert.equal(volley.split('if k == volley - 1 then').length-1,3);
  for(const token of ['if finished or rt.ended then','rtDamage(false, base * acc)','rt.hits += 1','applyHit(false, e)','applyHit(true, e)','math.clamp(math.floor((e and e.hull or 8) / 8) + 1, 1, 4)','nextMeFire = now + cannon.cd * (if now < skillUntil.rapid then 0.4 else 1)','nextFoeFire = now + 1.45']) assert.ok(volley.includes(token),token);
  assert.ok(naval.includes('if c ~= coroutine.running() and coroutine.status(c) ~= "dead" then task.cancel(c) end'));
  assert.ok(naval.includes('table.clear(conns)'));
});

test('Mare naval skill icons compose readiness glow once and skip identical writes',()=>{
  const naval=read('ReplicatedStorage/Shared/NavalBattle.luau');
  const start=naval.indexOf('local art = b:FindFirstChild("NavalButtonArtwork")',naval.indexOf('-- [전투 HUD] 실제 표시'));
  const skill=naval.slice(start,naval.indexOf('-- 배 카드:',start));
  assert.equal(skill.split('b:FindFirstChild("NavalButtonArtwork")').length-1,1);
  assert.equal(skill.split('art.ImageColor3 =').length-1,1);
  for(const token of ['if shade.Visible ~= visible then shade.Visible = visible end','if shade.BackgroundTransparency ~= transparency then shade.BackgroundTransparency = transparency end','if art.ImageTransparency ~= transparency then art.ImageTransparency = transparency end','if art.ImageColor3 ~= color then art.ImageColor3 = color end','if pulse > 0 then color = color:Lerp(Color3.fromRGB(255, 232, 143), pulse * 0.9) end','if rim.Color ~= color then rim.Color = color end','if rim.Thickness ~= thickness then rim.Thickness = thickness end','if rim.Transparency ~= transparency then rim.Transparency = transparency end','b:SetAttribute("NavalReadyPulseUntil", now + 0.55)','TweenInfo.new(0.47','TweenInfo.new(0.42','local interactable = ready and phase == "duel" and not opts.cardOnly and not opts.card']) assert.ok(skill.includes(token),token);
});


test('Mare naval boarding transition and async crew creation respect scene lifetime',()=>{
  const naval=read('ReplicatedStorage/Shared/NavalBattle.luau');
  const crew=naval.slice(naval.indexOf('local crews = { me = {}, foe = {} }'),naval.indexOf('local function crewAct('));
  for(const token of ['folder.Destroying:Connect(function()','table.clear(crews.me)','table.clear(crews.foe)','table.clear(crewMode)','if finished or not folder.Parent or not sh.model.Parent then return end','for i = 1, (if MOBILE_VFX then 2 else 4) do','if ok and rig then rig:Destroy() end','Pose.createR15, folder, Vector3.zero, 0, coat, Random.new(seed), role, 5','table.insert(crews[side], { rig = rig, off = pivot:ToObjectSpace(CFrame.new(world)), idx = i })']) assert.ok(crew.includes(token),token);
  const create=crew.indexOf('local ok, rig = pcall(Pose.createR15');
  assert.ok(crew.indexOf('if finished or not folder.Parent then',create)>create);
  const board=naval.slice(naval.indexOf('local boardingTimer = task.delay(1.0, function()'),naval.indexOf('conns[boardingTimer] = boardingTimer'));
  for(const token of ['conns[coroutine.running()] = nil','if finished or not gui.Parent or not folder.Parent then return end','startBoarding(opts.card, function(m, acts)','pcall(opts.onCards, acts)','rewardCard and w == "a"','cardBusy, cardDone = false, true','crewAct(side, card)']) assert.ok(board.includes(token),token);
  assert.ok(naval.includes('conns[boardingTimer] = boardingTimer'));
  assert.ok(board.indexOf('conns[coroutine.running()] = nil')<board.indexOf('startBoarding(opts.card'));
});

test('Mare naval tracking reuses trajectory appearance and skips unchanged coordinates',()=>{
  const naval=read('ReplicatedStorage/Shared/NavalBattle.luau');
  const tracking=naval.slice(naval.indexOf('-- [해전 사거리 레이더]'),naval.indexOf('-- [선체 숫자 선명도]'));
  for(const token of ['if radar.origin.Position ~= originPosition then radar.origin.Position = originPosition end','if radar.edge.Position ~= edgePosition then radar.edge.Position = edgePosition end','local dotDivisor = #trajDots + 1','local u = i / dotDivisor','if dot.CFrame ~= frame then dot.CFrame = frame end','if foeArrow.Position ~= arrowPosition then foeArrow.Position = arrowPosition end','if foeArrow.Rotation ~= arrowRotation then foeArrow.Rotation = arrowRotation end','if foeArrowTag.Position ~= tagPosition then foeArrowTag.Position = tagPosition end','local aim = phase == "duel" and not opts.card and dd < cannon.range * 1.25','math.sin(u * math.pi) * cannon.arc','elseif dot.Transparency ~= 1 then']) assert.ok(tracking.includes(token),token);
  const loop=tracking.indexOf('for i, dot in trajDots do');
  assert.ok(tracking.indexOf('local alpha = if not aligned then 0.88 elseif inRange then 0.3 else 0.78') < loop);
  assert.ok(tracking.indexOf('local tint = if inRange and aligned then Color3.fromRGB(130, 235, 150) else Color3.fromRGB(255, 166, 106)') < loop);
  assert.ok(loop > 0);
});


test('Mare card drag and flight release scene work without changing card play',()=>{
  const naval=read('ReplicatedStorage/Shared/NavalBattle.luau');
  const drag=naval.slice(naval.indexOf('local dragSuppressUntil = 0'),naval.indexOf('-- 부채꼴 손패'));
  for(const token of ['if os.clock() < dragSuppressUntil then dragSuppressUntil = 0 return end','dragSuppressUntil = os.clock() + 0.25','for _, cn in dragConns do cn:Disconnect() end','table.clear(dragConns)','if ghost then ghost:Destroy() ghost = nil end','if not pos or not wasDragging or not b.Parent or finished or not g.Parent then return end','delta.Y > -18 or math.abs(delta.Y) < math.abs(delta.X)','if inside and not reason then','playChosenCard()','if ghost.Position ~= position then ghost.Position = position end','b.Destroying:Connect(function() endDrag(nil) end)']) assert.ok(drag.includes(token),token);
  assert.ok(!drag.includes('task.delay('));
  const flight=naval.slice(naval.indexOf('local function playChosenCard()'),naval.indexOf('local function blockedReason()'));
  for(const token of ['TweenInfo.new(0.34, Enum.EasingStyle.Quart','activeFlightTween = flightTween','local playbackState = flightTween.Completed:Wait()','flightTween:Destroy()','playbackState ~= Enum.PlaybackState.Completed','afterAction(mine(BC.play(m, "me", i)))']) assert.ok(flight.includes(token),token);
  assert.ok(naval.includes('if activeFlightTween then activeFlightTween:Cancel(); activeFlightTween = nil end'));
});

test('Mare naval fleet wake shares weather and alternation without changing particle cadence',()=>{
  const naval=read('ReplicatedStorage/Shared/NavalBattle.luau');
  const wake=naval.slice(naval.indexOf('function FX.wake('),naval.indexOf('function FX.damage('));
  assert.ok(!wake.includes('GetAttribute("NavalWeatherMode")'));
  for(const token of ['function FX.wake(sh, key, now, waveBoost)','local step = if MOBILE_VFX then 0.31 else 0.22','if moved <= 0.35 or (sh.speed or 0) <= 1.5 then return end','local evenFrame = last.frame % 2 == 0','local spraySide = if evenFrame then 1 else -1','if not MOBILE_VFX or side == spraySide then','if rowing and not MOBILE_VFX and evenFrame then','n = if MOBILE_VFX then 5 else 9']) assert.ok(wake.includes(token),token);
  const fleet=naval.slice(naval.indexOf('-- [함대 항적]'),naval.indexOf('FX.damage(me, "me", now)'));
  assert.equal(fleet.split('GetAttribute("NavalWeatherMode")').length-1,1);
  for(const token of ['local waveBoost = if wakeMood == "storm" then 1.45 elseif wakeMood == "rain" then 1.18 else 1','FX.wake(me, "me", now, waveBoost)','FX.wake(foe, "foe", now, waveBoost)','FX.wake(e, "e" .. i, now, waveBoost)','FX.wake(al, "a" .. i, now, waveBoost)','local wakePhase = math.floor(now * 3)','if not MOBILE_VFX or (i + wakePhase) % 2 == 0 then']) assert.ok(fleet.includes(token),token);
  assert.ok(naval.includes('if sh.wake.WorldCFrame ~= wakeFrame then sh.wake.WorldCFrame = wakeFrame end'));
  assert.ok(naval.includes('sh.wakeNext = t + (if MOBILE_VFX then 0.20 else 0.11)'));
});

test('Mare card guidance and temporary advice share a reserved non-overlapping slot',()=>{
  const naval=read('ReplicatedStorage/Shared/NavalBattle.luau');
  const cards=naval.slice(naval.indexOf('local function startBoarding('),naval.indexOf('-- 적 포탄 낙하 경고'));
  for(const token of ['local guidanceSize = UDim2.new(0.96, if opts.cardOnly then (if compactCards then -100 else -116) else 0, 0.05, 0)','info.Size = guidanceSize','adviceTag.Position = info.Position','adviceTag.Size = guidanceSize','adviceTag.BackgroundTransparency = 0','adviceTag.Visible = false','seconds or 7','adviceToken == mine and adviceTag.Parent and info.Parent']) assert.ok(cards.includes(token),token);
  assert.match(cards,/adviceTag\.Text = text\s+info\.Visible = false\s+adviceTag\.Visible = true/);
  assert.match(cards,/adviceTag\.Visible = false\s+info\.Visible = true/);
  for(const [width,button] of [[320,96],[360,96],[667,96],[720,112],[1280,112]]) {
    const right=width*0.98-(button+4);
    const menuLeft=width*0.98-button;
    assert.ok(right<menuLeft && right>width*0.02);
  }
});


test('Mare building trim preserves original roof and window materials and fits details before scene parenting',()=>{
  const scene=read('ReplicatedStorage/Shared/PortScene.luau');
  const importer=scene.slice(scene.indexOf('local function importedModel('),scene.indexOf('-- 등불:'));
  assert.match(importer,/if tint and not architecture and not preserveArchitectureTexture then/);
  assert.match(importer,/local groundArchitecture = kind == "Town" and/);
  assert.match(importer,/solid == true and \(asset:find\("house", 1, true\) ~= nil or asset == "eastasia-base"\)/);
  assert.match(importer,/or asset == "eastasia-stairs" or asset == "eastasia-column-base"/);
  assert.match(importer,/if isAnimal or groundArchitecture then/);
  assert.match(importer,/piece:IsA\("BasePart"\) and piece.Transparency < 0\.98/);
  assert.match(importer,/if visibleBottomY < math\.huge then visibleBottomY else center\.Position\.Y - size\.Y \/ 2/);
  assert.match(importer,/CFrame\.new\(bottomPosition - bottom\) \* m:GetPivot\(\)/);
  const lower=(y,axis,half)=>y-axis.reduce((v,n,i)=>v+Math.abs(n)*half[i],0);
  assert.equal(lower(7,[0,1,0],[2,3,4]),4);
  assert.equal(lower(7,[1,0,0],[2,3,4]),5);
  assert.equal(Math.min(lower(7,[0,1,0],[2,3,4]),lower(4,[0,1,0],[1,1,1])),3);
  assert.match(importer,/if tint and asset:find\("roof", 1, true\) and not asset:find\("house", 1, true\) then/);
  const uniform=scene.slice(scene.indexOf('local function uniformMaterial('),scene.indexOf('local vacancyRate'));
  assert.match(uniform,/if not textured and \(p\.Material == Enum\.Material\.Plastic or p\.Material == Enum\.Material\.SmoothPlastic\)\s+and low >= 0\.78 and high - low <= 0\.14 then/);
  const house=scene.slice(scene.indexOf('-- [건축 장식 접합]'),scene.indexOf('-- [유럽·지중해·남아시아]'));
  for(const name of ['roof','trim','doorway','chim','bal']) assert.ok(house.includes('model = '+name),name);
  assert.match(house,/piece\.Transparency < 0\.98/);
  assert.match(house,/piece\.CFrame:PointToObjectSpace\(origin\)/);
  assert.match(house,/piece\.CFrame:VectorToObjectSpace\(direction\)/);
  assert.match(house,/if enter <= exit then nearest = math\.min\(nearest, enter\) end/);
  assert.match(house,/local target = contact - direction \* math\.max\(0, halfDepth - 0\.08\)/);
  assert.doesNotMatch(house,/workspace:Raycast/);
  for(const name of ['roof','chim']) assert.ok(house.includes('model = '+name+', top = true, multi = true'));
  assert.ok(house.includes('model = bal, multi = true'));
  assert.match(house,/local origins = \{ centerOrigin \}/);
  assert.match(house,/supported >= 3/);
  assert.match(house,/farthest - closest <= maxEmbed/);
  assert.match(house,/elseif item.multi and supported == 0 and #visibleParts > 0 then\s+--[^\n]+\s+detail:Destroy\(\)/);
  const contact=(samples,halfDepth)=>{
    const hits=samples.filter(Number.isFinite);
    if(hits.length===0)return null;
    if(hits.length>=3 && Math.max(...hits)-Math.min(...hits)<=Math.min(0.35,halfDepth*0.30))return Math.max(...hits);
    return samples[0];
  };
  assert.equal(contact([10,10.05,10.1,10,10.15],1),10.15);
  assert.equal(contact([10,10.1,13,10,10],1),10);
  assert.equal(contact([10,Infinity,10.1],1),10);
  assert.equal(contact([Infinity,Infinity,Infinity],1),null);
  for(const [o,v,h,expected] of [[12,-1,2,10],[-12,1,2,10],[0,1,2,0]]){
    const lo=(-h-o)/v,hi=(h-o)/v;
    assert.equal(Math.max(0,Math.min(lo,hi)),expected);
  }
});

// [시장 통행축] 기존 목표 폭 기준의 중앙·장날·외곽 진열 간격을 검증한다. 실제 모델 외곽은 Studio에서 검사한다.
test('시장 가판대와 외곽 진열물이 중앙 보행축을 공유하지 않는다',()=>{
 const scene=read('ReplicatedStorage/Shared/PortScene.luau');
 const market=scene.slice(scene.indexOf('elseif d.kind == "market" then'),scene.indexOf('else -- farm',scene.indexOf('elseif d.kind == "market" then')));
 assert.match(market,/cz \+ side \* stallRowZ/);
 assert.match(market,/cz \+ side \* festivalRowZ/);
 assert.doesNotMatch(market,/cx - 14, cz, false|cx \+ 13, cz, false/);
 assert.ok(11-7/2>=7);
 assert.ok(22-11-7>=4);
 assert.ok(33-22-7/2-4/2>=5);
 assert.ok(33+4/2<43);
});

// [광장·시장 동선] 실제 모델 경계 후보와 비충돌 가판대 검사를 기존 생성 시점에 수행한다.
test('광장 가장자리 장식과 시장 가판대의 보행 간섭을 검사한다',()=>{
 const scene=read('ReplicatedStorage/Shared/PortScene.luau');
 const plaza=scene.slice(scene.indexOf('-- [광장 실제 점유]'),scene.indexOf('sliceMark("beforeDestroyOld")'));
 assert.match(plaza,/local ok, box, ext = pcall\(obj.GetBoundingBox, obj\)/);
 assert.match(plaza,/nearX \* nearX \+ nearZ \* nearZ < radius2/);
 assert.match(plaza,/CentralPlazaEdgeCandidates", plazaEdgeBlocked/);
 assert.match(plaza,/else\s+plazaEdgeBlocked \+= 1/);
 const intersects=(dx,dz,hx,hz)=>Math.max(0,Math.abs(dx)-hx)**2+Math.max(0,Math.abs(dz)-hz)**2<26**2;
 assert.equal(intersects(30,0,6,2),true);
 assert.equal(intersects(30,0,3,2),false);
 assert.equal(intersects(28,28,5,5),false);
 assert.match(scene,/originalStall.Name = "CityMarketStall"/);
 assert.match(scene,/extra.Name = "CityMarketStall"/);
 assert.match(scene,/hit:FindFirstAncestor\("CityMarketStall"\)/);
 assert.match(scene,/\(hit.CanCollide or visualMarket or visualSolid\)/);
});

 
// [주민 발 접지] 승인 지면만 사용하고 일과·동선의 기준 좌표에 높이가 누적되지 않는다.
test('항구 주민 최초 발바닥과 이동 지면 높이를 분리하여 보정한다',()=>{
 const scene=read('ReplicatedStorage/Shared/PortScene.luau');
 assert.match(scene,/walker\.mode ~= "royal_rider" and walker\.kind ~= "sit"/);
 assert.match(scene,/math\.abs\(cf\.RightVector\.Y\) \* half\.X/);
 assert.match(scene,/math\.abs\(ground\.Position\.Y - bottom\) <= 0\.75/);
 assert.match(scene,/walker\.contactOffset, walker\.contactTarget = 0, 0/);
 assert.match(scene,/w\.contactCheckAt = now \+ 0\.20 \+ \(w\.phase % 0\.10\)/);
 assert.match(scene,/Vector3\.new\(0, -6, 0\), animalGround/);
 assert.match(scene,/w\.contactTarget = ground\.Position\.Y - w\.contactFloorY/);
 assert.match(scene,/CFrame\.lookAt\(where \+ contact, where \+ forward \+ contact\)\)\s+w\.lastPos = where/);
 assert.match(scene,/local floorY = w\.base\.Position\.Y \+ \(w\.contactOffset or 0\)/);
 assert.match(scene,/local bob = w\.contactOffset or 0/);
 const initial=(floor,bottom)=>Math.abs(floor-bottom)<=0.75?floor-bottom+0.015:0;
 assert.ok(Math.abs(initial(0.17,0)-0.185)<1e-9);
 assert.equal(initial(0,2),0);
 const target=(floor,baseline,old)=>Math.abs(floor-baseline)<=1.25?floor-baseline:old;
 assert.ok(Math.abs(target(0.42,0.17,0)-0.25)<1e-9);
 assert.equal(target(8,0.17,0.25),0.25);
});

// [메뉴 실수치 시각화] 가격·적재·보급은 원본 서버 수치만 사용한다.
test('교역과 항해의 승인 아이콘 및 실제 수치 막대 유지',()=>{
 const source=readText('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau');
 for(const key of ['TradeIndexPriceMeter','TradeBuyMeter','TradeSellMeter','TradeCargoMeter','RouteSupplyMeter','RouteCoalMeter']) assert.ok(source.includes(key),key);
 assert.match(source,/math\.clamp\(ship\.cargoUsed \/ math\.max\(1, ship\.cargoCapacity\), 0, 1\)/);
 assert.match(source,/local priceMax = math\.max\(1, unitBuy, sel\.sell\)/);
 assert.match(source,/math\.clamp\(data\[3\] \/ math\.max\(1, data\[2\]\), 0, 1\)/);
 assert.match(source,/Create\(H\.galleryBackdrop,/);
});

test('선장 현황 및 진행 일지는 문자 그림 대신 등록 아이콘과 실제 진행 막대를 표시한다',()=>{
 const source=readText('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau');
 assert.match(source,/icon\.Name = "StatusMetricArt"/);
 assert.match(source,/meter\.Name = "QuestProgressMeter"/);
 assert.match(source,/math\.clamp\(done \/ total, 0, 1\)/);
 assert.doesNotMatch(source,/string\.rep\("▰", filled\)/);
});

test('전체 메뉴 탭은 승인 청동 아이콘과 짧은 한글 이름으로 선택 상태를 구별한다',()=>{
 const source=readText('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau');
 const caps=source.slice(source.indexOf('H.TAB_CAPTION = {'),source.indexOf('function H.renderTabs()'));
 for(const id of ['route','map','diplomacy','trade','market','harbor','board','quest','explore','battle','war','gwent','status','yard','crew','recruit','tech','scholar','codex','encyclopedia']) assert.ok(caps.includes(id+' ='),id);
 assert.match(source,/caption\.Text = H\.TAB_CAPTION\[id\] or TAB_NAME\[id\]/);
 assert.match(source,/if caption then caption\.TextColor3 = b\.TextColor3 end/);
});

test('공통 안내는 묶음 첫 화면에만 두고 초보 안내는 승인 원화로 보여 준다',()=>{
 const source=readText('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau');
 assert.match(source,/currentTab == grp\.tabs\[1\] or currentTab == "market"/);
 assert.match(source,/icon\.Name = "CoachStepArt"/);
 assert.ok(!source.includes('실제 진행 상태와 조건을 아래에서 확인해.'));
});
