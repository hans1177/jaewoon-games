import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const client = fs.readFileSync('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau', 'utf8');

test('외교는 기존 승인 손그림 서신 원화를 사용하고 알현 3D 모델은 유지한다', () => {
  assert.match(client, /\{ name = "항만청", keeper = "항만 관리관", tabs = \{ "route", "map" \} \}/, '항만청에서 외교 분리');
  assert.match(client, /\{ name = "외교", keeper = "외교관", tabs = \{ "diplomacy" \} \}/, '외교 그룹 유지');
  assert.match(client, /\{ "diplomacy", "외교", "diplomacy" \}/, '외교 버튼 보존');
  assert.match(client, /H\.diplomacyIconAtlas = AssetIds\["CardArt\/ui_reserve_icons_2"\]/, '외교용 기존 승인 손그림 서신 원화');
  assert.match(client, /diplomacy = 5, close = 15/, '외교 원화의 올바른 칸 선택');
  assert.match(client, /modelIcon\(button, "FacilityArt", key, nil, artSize, label\)/, '시설 아이콘 렌더러와 동일 화풍');
  assert.doesNotMatch(client, /modelIcon\(button, "Castle", "flag-banner-short"/, '외교 도크 3D 깃발 혼용 금지');
  assert.match(client, /\{ "알현", "Castle", "flag-banner-short" \}/, '원래 알현 모델 보존');
});

test('메뉴 12개는 기존 기능을 유지한 채 6개씩 위아래 고정 정렬한다', () => {
  assert.match(client, /dockGrid = Instance\.new\("UIGridLayout"\)/, '정규 격자');
  assert.match(client, /dockGrid\.FillDirectionMaxCells = 6/, '한 줄에 6개');
  assert.match(client, /local dockH = CH \* 2 \+ GAP/, '두 줄 높이');
  assert.match(client, /local sysOrder = \{ "JournalButton", "DeckButton", "OptionsButton", "ViewToggle" \}/,
    '시설 8개에 시스템 4개 추가');
  assert.match(client, /b\.LayoutOrder = #H\.DOCK \+ i/, '같은 격자 안에 12개');
  assert.match(client, /CW = math\.min\(58, math\.floor\(\(width - 16 - GAP \* 5\) \/ 6\)\)/,
    '모바일 6개 폭 맞춤');
  assert.match(client, /help\.Visible = false/, '별도 도움말 아이콘만 숨김');
  assert.match(client, /section\("📖 도움말"\)/, '설정창 도움말 유지');
  assert.match(client, /row\("게임 방법"/, '설정에서 도움말 열기');
});

test('긴급 저가 알림은 글씨 대신 색 구분된 파티클과 중복 없는 반복 신호만 쓴다', () => {
  assert.match(client, /notice = Instance\.new\("ImageLabel"\)/, '텍스트 배지 대신 투명 반짝임');
  assert.match(client, /textures\/particles\/sparkles_main\.dds/, '기존 Roblox 파티클 자산');
  assert.match(client, /H\.dockSignalTweens = H\.dockSignalTweens or \{\}/, '시설당 단일 점멸');
  assert.match(client, /if changed and alert and button and hudTopGui\.Enabled/, '상태 변화 한 번에만 폭발');
  assert.match(client, /oldTween:Cancel\(\)/, '이전 점멸 중단');
  assert.match(client, /spark:Destroy\(\)/, '파티클 소멸 시 인스턴스 정리');
  assert.doesNotMatch(client, /notice\.Text = alert or ""/, '문자 알림 제거');
  assert.doesNotMatch(client, /H\.dockStatus\.Text/, '문자 요약 알림 제거');
  assert.match(client, /price <= average \* 0\.9/, '저가 판정 규칙 유지');
});

test('특수 황동 문양은 시설 아틀라스보다 우선하며 잘못된 그림 대체를 방지한다', () => {
  const start = client.indexOf('function H.hudShortcut(');
  const end = client.indexOf('\n\tif dockItem then', start);
  assert.ok(start >= 0 && end > start, '기존 메뉴 생성 함수 확인');
  const renderer = client.slice(start, end);
  for (const key of ['tavern', 'deck', 'journal', 'gear', 'status']) {
    assert.ok(renderer.includes('key == "' + key + '"'), '특수 문양 키 누락: ' + key);
  }
  assert.match(renderer, /if not specialGlyph and H\.facilityIconCells\[key\] ~= nil/,
    '특수 문양은 아틀라스 경로로 들어가면 안 됨');
  assert.match(renderer, /elseif specialGlyph then[\s\S]*?modelIcon\(button, "Glyph", specialGlyph, nil, artSize, label\)/,
    '특수 문양이 실제 황동 렌더러를 사용해야 함');
  assert.match(renderer, /symbol\.Name = "MenuArt"/, '기존 메뉴 표시/광휘 흐름 유지');
});
