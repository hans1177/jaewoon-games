import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const client = fs.readFileSync('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau', 'utf8');

test('외교는 기존 승인 손그림 서신 원화를 사용하고 알현 3D 모델은 유지한다', () => {
  // [2026-11-28 메뉴 5묶음] 외교는 '항해' 묶음 탭. 건물(시설) 이름·초상은 H.FACILITY_GROUPS 에 보존.
  assert.match(client, /\{ name = "항해", keeper = "항만 관리관", tabs = \{ "route", "map", "diplomacy" \} \}/, '외교는 항해 묶음');
  assert.match(client, /\{ name = "외교", keeper = "외교관", tabs = \{ "diplomacy" \} \}/, '외교 시설 이름 보존');
  assert.match(client, /H\.diplomacyIconAtlas = AssetIds\["CardArt\/ui_reserve_icons_2"\]/, '외교용 기존 승인 손그림 서신 원화');
  assert.match(client, /diplomacy = 5, close = 15/, '외교 원화의 올바른 칸 선택');
  assert.match(client, /modelIcon\(button, "FacilityArt", key, nil, artSize, label\)/, '시설 아이콘 렌더러와 동일 화풍');
  assert.doesNotMatch(client, /modelIcon\(button, "Castle", "flag-banner-short"/, '외교 도크 3D 깃발 혼용 금지');
  assert.match(client, /\{ "알현", "Castle", "flag-banner-short" \}/, '원래 알현 모델 보존');
});

test('주 메뉴 5개와 보조 도구 4개는 기존 기능을 유지한 채 두 줄로 정렬한다', () => {
  assert.match(client, /dockGrid = Instance\.new\("UIGridLayout"\)/, '정규 격자');
  assert.match(client, /dockGrid\.FillDirectionMaxCells = 5/, '한 줄에 주 메뉴 5개');
  assert.match(client, /local dockH = CH \* 2 \+ GAP/, '두 줄 높이');
  assert.match(client, /local sysOrder = \{ "JournalButton", "DeckButton", "OptionsButton" \}/,
    '묶음 5개 + 걷기 + 시스템 3개');
  assert.match(client, /walkBtn\.LayoutOrder = #H\.DOCK \+ 1/, '걷기는 2줄 맨 앞');
  assert.match(client, /b\.LayoutOrder = #H\.DOCK \+ 1 \+ i/, '같은 격자 안에 9개');
  assert.match(client, /CW = math\.min\(64, math\.floor\(\(width - 16 - GAP \* 4\) \/ 5\)\)/,
    '모바일 5개 폭 맞춤');
  assert.match(client, /help\.Visible = false/, '별도 도움말 아이콘만 숨김');
  assert.match(client, /section\("📖 도움말"\)/, '설정창 도움말 유지');
  assert.match(client, /row\("게임 방법"/, '설정에서 도움말 열기');
});

test('알림은 반짝이 없이 청동 느낌표 배지와 아이콘 맥동만 쓴다 (2026-11-24 오너)', () => {
  assert.match(client, /notice = Instance\.new\("ImageLabel"\)/, '배지는 투명 이미지');
  assert.match(client, /notice\.ImageRectOffset = Vector2\.new\(3 \* 192, 1 \* 189\)/, '청동 느낌표 깃발 칸');
  assert.match(client, /H\.dockSignalTweens = H\.dockSignalTweens or \{\}/, '시설당 단일 트윈');
  assert.match(client, /oldTween:Cancel\(\)/, '이전 트윈 중단');
  assert.match(client, /button:SetAttribute\("IconAlert", alert ~= nil\)/, '알림 때만 맥동');
  assert.doesNotMatch(client, /halo\.Name = "SignalHalo"|bloom\.Name = "SignalBloom_/, '숨은 색광 객체도 생성하지 않음');
  assert.doesNotMatch(client, /spark\.Name = "SignalSpark"/, '반짝이 파편 제거');
  assert.doesNotMatch(client, /flare\.Name = "GuidePulse"/, '안내 반짝이 제거');
  assert.doesNotMatch(client, /notice\.Text = alert or ""/, '문자 알림 제거');
  assert.doesNotMatch(client, /H\.dockStatus\.Text/, '문자 요약 알림 제거');
  assert.match(client, /price <= average \* 0\.9/, '저가 판정 규칙 유지');
});

test('HUD 아이콘은 도형보다 기존 청동 원화 시트를 우선한다', () => {
  const start = client.indexOf('function H.hudShortcut(');
  const end = client.indexOf('\n\tif dockItem then', start);
  assert.ok(start >= 0 && end > start, '기존 메뉴 생성 함수 확인');
  const renderer = client.slice(start, end);
  assert.match(renderer, /if H\.hasIconArt\(key\) then/, '청동 원화 우선');
  assert.match(client, /H\.reserveIconAtlas = \{ AssetIds\["CardArt\/ui_reserve_icons"\], AssetIds\["CardArt\/ui_reserve_icons_2"\], AssetIds\["CardArt\/ui_menu_icons_3"\], AssetIds\["CardArt\/ui_menu_icons_4"\] \}/, '예비 청동 시트');
  for (const key of ['tavern', 'deck', 'journal', 'gear', 'status', 'view', 'help']) {
    assert.match(client, new RegExp('[{ ,\\t]' + key + ' = \\d+'), '시설 시트 칸 누락: ' + key);
  }
  assert.match(renderer, /icon\.Name = "MenuArt"/, '기존 메뉴 표시 흐름 유지');
});

test('책 프레임과 가로 탭 및 인과 카드에 승인 원화만 연결', () => {
  assert.match(client, /surfaceTexture = if AssetIds\["CardArt\/ui_frame_book"\]/);
  assert.match(client, /Rect\.new\(64, 64, 448, 448\)/);
  const tabs = client.split('function H.renderTabs()')[1];
  assert.match(tabs, /local tabSkins = tabOn ~= nil and tabOff ~= nil/);
  assert.match(tabs, /grain\.SliceCenter = Rect\.new\(24, 24, 232, 72\)/);
  assert.match(tabs, /grain\.Image = "rbxassetid:\/\/" \.\. tostring\(if selected then tabOn else tabOff\)/);
  const cause = client.split('function H.questCauseCard(q)')[1].split('function H.showQuestResult(d)')[0];
  assert.match(cause, /Instance\.new\(if frameArt then "ImageLabel" else "Frame"\)/);
  assert.match(cause, /card\.SliceCenter = Rect\.new\(24, 24, 232, 232\)/);
  assert.match(cause, /\{ "problem", "cause", "todo", "result" \}/);
  assert.match(cause, /card\.AutomaticSize = Enum\.AutomaticSize\.Y/);
  assert.match(cause, /openTab\(step\.tab\)/);
});


test('추가 청동 아이콘 시트 16칸과 메뉴 수치 표시 연결', () => {
  assert.match(client, /if H\.reserveIconAtlas\[4\] then/);
  assert.match(client, /H\.reserveIconRowH = \{ 184, 189, 192, 192 \}/);
  assert.ok(client.includes('{ "quest", "shipyard", "lock", "war", "gift", "star", "profit_up", "profit_down", "cargo", "supply", "hull", "crew", "coin", "fame", "map_pin", "close" }'));
  assert.ok(client.includes('H.reserveIconCells[key] = { 4, i - 1 }'));
  const stat = client.split('function H.statStrip(items)')[1].split('\nend')[0];
  assert.ok(stat.includes('H.reserveIconAtlas[4] and H.hasIconArt(key)'));
  assert.ok(stat.includes('modelIcon(chip, "FacilityArt", key, nil, 20, it[1])'));
  assert.ok(stat.includes('vl.Text = it[2]'));
});


test('시설 전용 가로 원화는 기존 시설표 기준 첫 화면 우선, 기존 선택과 순환 유지', () => {
  const gallery = client.split('function H.renderFacilityGallery()')[1].split('-- [자동 넘김]')[0];
  assert.ok(gallery.includes('AssetIds["CardArt/ui_strip_" .. facility.tabs[1]]'));
  assert.ok(gallery.includes('if stripId then 1 else math.random(1, #matches)'));
  assert.ok(gallery.includes('card.found == true'));
  assert.ok(gallery.includes('if selection and selection.tab == tab then'));
  assert.ok(gallery.includes('if chartName and not selection then matched = nil end'));
  assert.ok(gallery.includes('H.galleryCard.Visible = H.galleryCleanStrip == true or portraitCard'));
  assert.ok(gallery.includes('if H.galleryCleanStrip then'));
  assert.ok(client.includes('H.galleryCard.Visible = cleanStrip or H.galleryPortraitCard == true'));
  assert.ok(client.includes('H.galleryImage.Activated:Connect(function()'));
});
