// [주민 머리색] 2026-11-29 오너: "주민들 헤어 색은 왜 다 흰색이냐"
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const pose = fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/Pose.luau', 'utf8');
test('흰 머리 텍스처는 정한 색을 그대로, 비유럽은 검은~짙은 갈색', () => {
  assert.equal((pose.match(/hairTint:Lerp\(Color3\.new\(1, 1, 1\), 0\.12\)/g) || []).length, 2);
  assert.match(pose, /local palette = if EUROPEAN_DETAIL_CULTURES\[outfit\.culture\] then hairPalette else darkPalette/);
});
