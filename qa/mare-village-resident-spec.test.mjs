// [마을·주민 상세 규격] 2026-11-28 오너: "마을 구획·구도·건물 배치·주민 복장·헤어 — 구현? 프롬프트? 더 디테일하게"
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root = 'roblox-games/mare-essentia';
const pose = fs.readFileSync(`${root}/src/ReplicatedStorage/Shared/Pose.luau`, 'utf8');
const scene = fs.readFileSync(`${root}/src/ReplicatedStorage/Shared/PortScene.luau`, 'utf8');
const readFirst = fs.readFileSync(`${root}/docs/READ_FIRST.md`, 'utf8');
test('문화권 전용 옷·머리 이름이면 자동으로 입힌다', () => {
  assert.match(pose, /alt = "outfit_" \.\. culture \.\. "_" \.\. slot/);
  assert.match(pose, /alt = "hair_" \.\. culture \.\. "_" \.\. gender/);
  assert.match(pose, /model:SetAttribute\("NpcCultureOutfit", culture\)/);
});
test('규격 문서: 코드 실측 좌표·판정 기준·파일 이름', () => {
  const lay = fs.readFileSync(`${root}/docs/VILLAGE_LAYOUT_SPEC.md`, 'utf8');
  assert.match(scene, /local CENTRAL_PLAZA_RADIUS = 26/);
  assert.ok(lay.includes('(−6, 0, 0)') && lay.includes('반지름 26'));
  assert.ok(lay.includes('PropOverlapHidden') && lay.includes('NpcRouteBlocked'));
  const out = fs.readFileSync(`${root}/docs/residents/OUTFIT_SPEC.md`, 'utf8');
  for (const c of ['brick','britain','china','colonial','creole','desert','france','hanse','iberia','italy','japan','korea','malabar','med','nordic','ottoman','pacific','seasia','stone','swahili','tropic','wafrica']) assert.ok(out.includes(`| ${c}`) || out.includes(`| ${c}(`), c);
  assert.ok(readFirst.includes('VILLAGE_LAYOUT_SPEC.md') && readFirst.includes('OUTFIT_SPEC.md'));
});
