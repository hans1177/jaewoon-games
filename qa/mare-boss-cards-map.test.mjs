// [보스·카드배틀 궨트급·지시서 지도] 2026-11-28 오너
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root = 'roblox-games/mare-essentia';
const sh = `${root}/src/ReplicatedStorage/Shared`;
const field = fs.readFileSync(`${sh}/FieldScene.luau`, 'utf8');
const ac = fs.readFileSync(`${sh}/ActionCombat.luau`, 'utf8');
const bosses = fs.readFileSync(`${sh}/Bosses.luau`, 'utf8');
test('지상 두목: 체력 720, 단계 4, 스킬 4종 예고 후 발동, 4단계 단단해짐', () => {
  assert.match(ac, /name = "거인 두목", hp = 720/);
  for (const id of ['wave', 'charge', 'roar', 'frenzy']) assert.ok(field.includes(`id = "${id}"`), id);
  assert.match(field, /if e\.boss then bossSkillTick\(e, now, hrp, dist\) end/);
  assert.match(field, /e\.boss and os\.clock\(\) < \(e\.armorUntil or 0\) then 0\.6 else 1/);
  assert.match(field, /SetAttribute\("FieldBossSkill", sk\.id\)/);
});
test('해상 신화 괴물: 선체 ×1.5, 스킬 4종 이상', () => {
  assert.match(bosses, /hull = 428/);
  const skillLines = [...bosses.matchAll(/skills = \{([^}]*)\}/g)].slice(1);
  for (const m of skillLines) assert.ok(m[1].split(',').length >= 4, m[1]);
});
test('지시서: 궨트급·보스·지도, 읽기 입구 연결', () => {
  for (const f of ['card_battle/MOBILE_GRADE_BRIEF.md', 'BOSS_BRIEF.md', 'BRIEF_MAP.md']) assert.ok(fs.existsSync(`${root}/docs/${f}`), f);
  const g = fs.readFileSync(`${root}/docs/card_battle/MOBILE_GRADE_BRIEF.md`, 'utf8');
  assert.ok(g.includes('Do NOT imitate Gwent'));
  const rf = fs.readFileSync(`${root}/docs/READ_FIRST.md`, 'utf8');
  for (const f of ['BRIEF_MAP.md', 'BOSS_BRIEF.md', 'MOBILE_GRADE_BRIEF.md']) assert.ok(rf.includes(f), f);
  assert.ok(fs.readFileSync('START_HERE.md', 'utf8').includes('BRIEF_MAP.md'));
});
