// [항구-국가 연결] 2026-11-29 오너: "항구별 국가별 연결" — 발전 공유·마을 국가 표시·국가별 건축·국가 경제
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root = 'roblox-games/mare-essentia/src';
const econ = fs.readFileSync(`${root}/ServerScriptService/Services/Econ.luau`, 'utf8');
const village = fs.readFileSync(`${root}/ServerScriptService/Services/Village.luau`, 'utf8');
const scene = fs.readFileSync(`${root}/ReplicatedStorage/Shared/PortScene.luau`, 'utf8');
test('국가 경제 연동: 항구 시뮬에 주인 나라·식민·전쟁·불안 요약', () => {
  assert.match(econ, /function X\.portNation\(state: any, w: any, portId: any\): any/);
  assert.match(econ, /nationLink = X\.portNation\(state, w, portId\),/);
});
test('국가 발전 공유: 같은 나라 다른 항구 건축·연구·상징물 개당 0.5, 최대 12', () => {
  assert.match(village, /national = math\.min\(12, national\)/);
  assert.match(village, /\+ marks \* 4 \+ national/);
});
test('마을 국가 표시와 국가별 건축 차이', () => {
  for (const k of ['"PortNationOwner"', '"PortNationAudit"', '"NationFlag_"', '"WarBanner"']) assert.ok(scene.includes(k), k);
  for (const c of ['china = { lot', 'japan = { lot', 'ottoman = { lot', 'brazil = { lot', 'morocco = { lot']) assert.ok(scene.includes(c), c);
});
