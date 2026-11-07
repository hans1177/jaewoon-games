import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const dir = 'roblox-games/fantasy-survival/skilltree-icons/';
test('스킬트리 아이콘 시트: CC0 출처·해시가 기록돼 있고 파일과 일치한다', () => {
  const m = JSON.parse(fs.readFileSync(dir + 'files.json', 'utf8'));
  assert.equal(m.license, 'CC0-1.0');
  assert.match(m.sourcePage, /opengameart\.org/);
  assert.equal(Object.keys(m.files).length, 4);
  for (const [name, info] of Object.entries(m.files)) {
    const bytes = fs.readFileSync(dir + name);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), info.sha256);
    assert.equal(bytes.length, info.bytes);
  }
});
test('클라이언트는 ID가 없으면 기존 아이콘으로 되돌아간다', () => {
  const src = fs.readFileSync('roblox-games/fantasy-survival/client/Game.client.luau', 'utf8');
  assert.match(src, /applySkillTreeIcon\(icon\)\s+then meadowArt\.skill|not applySkillTreeIcon\(icon\) then meadowArt\.skill/);
});
