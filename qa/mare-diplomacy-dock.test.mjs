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
  assert.match(client, /H\.reserveIconAtlas = \{ AssetIds\["CardArt\/ui_reserve_icons"\], AssetIds\["CardArt\/ui_reserve_icons_2"\], AssetIds\["CardArt\/ui_menu_icons_3"\] \}/, '예비 청동 시트');
  for (const key of ['tavern', 'deck', 'journal', 'gear', 'status', 'view', 'help']) {
    assert.match(client, new RegExp('[{ ,\\t]' + key + ' = \\d+'), '시설 시트 칸 누락: ' + key);
  }
  assert.match(renderer, /icon\.Name = "MenuArt"/, '기존 메뉴 표시 흐름 유지');
});
