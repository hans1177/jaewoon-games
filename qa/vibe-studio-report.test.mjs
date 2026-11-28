// [바이브 엔진 시각 검수] studio_report.py: 12각도 시트·항구끼리 비슷함 경고·전후 비교·REPORT.md (2026-11-29)
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('studio_report: 비슷한 항구는 경고, 다른 항구는 통과, 어두운 화면은 실패', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'srep-'));
  const frames = path.join(dir, 'frames');
  fs.mkdirSync(frames);
  execFileSync('python3', ['-c', `
from PIL import Image, ImageDraw
import random
def scene(seed, path, dark=False):
    random.seed(seed); im = Image.new('RGB', (480, 270), (10, 10, 10) if dark else (90, 140, 200)); d = ImageDraw.Draw(im)
    for _ in range(40):
        x, y = random.randint(0, 460), random.randint(0, 250)
        d.rectangle([x, y, x + 20, y + 20], fill=(random.randint(0, 255), random.randint(0, 255), random.randint(0, 255)))
    im.save(path)
scene(1, '${frames}/london_street-0.jpg'); scene(1, '${frames}/lisbon_street-0.jpg'); scene(7, '${frames}/busan_street-0.jpg')
scene(2, '${frames}/london_top-0.jpg', dark=True)
`]);
  let code = 0;
  try { execFileSync('python3', ['tools/devloop/studio_report.py', frames, '--out', path.join(dir, 'out')], { stdio: 'pipe' }); } catch (e) { code = e.status; }
  assert.equal(code, 1, '어두운 화면이 있으면 종료 코드 1');
  const rep = fs.readFileSync(path.join(dir, 'out', 'REPORT.md'), 'utf8');
  assert.match(rep, /너무 비슷/);
  assert.match(rep, /\| street \| lisbon \| london \|/);
  assert.doesNotMatch(rep, /\| street \| busan \| (lisbon|london) \| 0\.9[3-9]/);
  assert.match(rep, /너무 어두움/);
  assert.ok(fs.existsSync(path.join(dir, 'out', 'sheet_london.png')));
});

test('12각도 촬영 생성기와 규칙 문서 연결', () => {
  const shots = fs.readFileSync('roblox-games/mare-essentia/tools/devloop/studio_shots.py', 'utf8');
  for (const a of ['top', 'plaza_eye', 'street', 'houses', 'harbor', 'ranch', 'animal_side', 'animal_front', 'resident', 'edge']) assert.ok(shots.includes(`("${a}"`), a);
  const agents = fs.readFileSync('AGENTS.md', 'utf8');
  assert.match(agents, /studio_report\.py/);
  assert.match(agents, /studio_shots\.py/);
});
