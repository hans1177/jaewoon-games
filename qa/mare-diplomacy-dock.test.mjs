import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const client = fs.readFileSync('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau', 'utf8');

test('외교는 항만청 탭이 아니라 도크의 별도 시설 아이콘이며 알현 깃발 모델을 쓴다', () => {
  assert.match(client, /\{ name = "항만청", keeper = "항만 관리관", tabs = \{ "route", "map" \} \}/, '항만청에서 외교 탭 분리');
  assert.match(client, /\{ name = "외교", keeper = "외교관", tabs = \{ "diplomacy" \} \}/, '외교 시설 그룹');
  assert.match(client, /\{ "diplomacy", "외교", "diplomacy" \}/, '도크 외교 아이콘');
  assert.match(client, /modelIcon\(button, "Castle", "flag-banner-short", nil, artSize, label\)/, '알현과 같은 기존 깃발 모델');
  assert.match(client, /\{ "알현", "Castle", "flag-banner-short" \}/, '알현 아이콘은 그대로');
});
