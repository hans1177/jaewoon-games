// [이벤트·카드 연출] 2026-11-28 오너 지시: 세계 사건 원화 알림·역사 사건 원화·원더 첫 습득·화려한 카드 습득·부채꼴·+1·세트 완성·영화 띠·촬영 점검.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root = 'roblox-games/mare-essentia';
const game = fs.readFileSync(`${root}/src/StarterPlayer/Game.client.luau`, 'utf8');
const world = fs.readFileSync(`${root}/src/ServerScriptService/Services/World.luau`, 'utf8');
test('세계 사건이 원화 알림씬으로 연결', () => {
  assert.match(world, /index = i, id = a\.id, title = a\.title/);
  assert.match(game, /if H\.checkWorldEvents then H\.checkWorldEvents\(\) end/);
  assert.match(game, /function H\.showWorldEventScene\(a\)/);
  assert.match(game, /local first = H\.seenWorldEvents == nil/, '첫 화면은 기준선(재접속 중복 방지)');
});
test('역사 사건 창 원화·영화 띠', () => {
  assert.match(game, /banner\.Name = "HistoryEventArt"/);
  assert.match(game, /function H\.eventArtFor\(id, tag, title, kind\)/);
  assert.match(game, /function H\.cinemaBars\(layer, dur\)/);
  assert.match(game, /function H\.typewrite\(label, text, speed\)/);
});
test('카드 습득: 화려한 효과·부채꼴·+1·세트·원더 첫 습득', () => {
  assert.match(game, /pcall\(H\.cardGainFlair, \{/);
  for (const n of ['CardGainFlash', 'CardHoloSheen', 'CardConfetti', 'CardRarityStamp', 'CardRarityPulse', 'LegendRaySpin']) assert.match(game, new RegExp(`Name = "${n}"`), n);
  assert.match(game, /if freshCount >= 3 and H\.showCardFan then/);
  assert.match(game, /found\.card\.isDuplicate and H\.showCardPlusOne/);
  assert.match(game, /H\.checkSetComplete\(found\.card\)/);
  assert.match(game, /WS\.Scenes\[found\.card\.id\] and H\.playWonderScene/);
});
test('움직임 줄이기 존중·촬영 점검', () => {
  const flair = game.split('function H.cardGainFlair')[1].split('\n\tend\n')[0];
  assert.match(flair, /not o\.reduced/);
  assert.match(game, /fx:sub\(1, 8\) == "FxCheck:"/);
  assert.ok(fs.existsSync(`${root}/tools/devloop/studio-scripts/mare-event-card-fx.json`));
});

test('카드 습득: 세로축 양면 회전·큰 원화·기존 음향·수납 큐', () => {
  const gain = game.split('function H.showCardGain(card, moreCount)')[1].split('-- 개발 확인용: workspace 속성 DevSail')[0];
  assert.match(gain, /viewport\.Y \* \(if rarityLevel >= 3 then 0\.72 else 0\.68\)/);
  assert.match(gain, /viewport\.Y - 102/);
  assert.match(gain, /revealWidth = math\.floor\(revealHeight \* 0\.7\)/);
  assert.match(gain, /AssetIds\["CardArt\/battle_card_back"\]/);
  assert.match(gain, /local facing = math\.cos\(math\.rad\(spin\)\)/);
  assert.match(gain, /math\.max\(0\.035, math\.abs\(facing\)\)/);
  assert.match(gain, /seal\.Visible = not reducedMotion and facing < 0/);
  assert.doesNotMatch(gain, /frame\.Rotation = spin|seal:Destroy\(\)|pair\[1\]\.Rotation = revolutions/);
  assert.match(gain, /frame\.Rotation = 0/);
  assert.match(gain, /sfx_card_magic/);
  assert.match(gain, /sfx_fanfare/);
  assert.match(gain, /task\.delay\(3\.30/);
  assert.match(game, /H\.showCardGain\(found\.card, found\.extra\)\s*task\.wait\(3\.40\)/);
  for (const h of [320, 384, 720, 900]) for (const w of [320, 400, 832, 1440]) {
    const height = Math.floor(Math.max(80, Math.min(500, h * .72, h - 102, w * .72 / .7)));
    assert.ok(h * .46 - height / 2 - 41 >= 0, 'caption fits');
    assert.ok(h * .46 + height / 2 + 43 <= h, 'title fits');
  }
});
