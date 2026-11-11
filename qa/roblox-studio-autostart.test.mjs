import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sup = fs.readFileSync('tools/roblox-studio-autostart-supervisor.ps1', 'utf8').replace(/^\uFEFF/, '');
const ins = fs.readFileSync('tools/install-roblox-studio-autostart.ps1', 'utf8').replace(/^\uFEFF/, '');
const balanced = s => { let a = 0, b = 0, c = 0; for (const ch of s.replace(/'[^'\n]*'/g, '').replace(/#.*$/gm, '')) { if (ch === '{') a++; if (ch === '}') a--; if (ch === '(') b++; if (ch === ')') b--; if (ch === '@') c += 0; } return a === 0 && b === 0; };

test('PowerShell 스크립트: UTF-8 BOM(5.1 이 한글 주석을 바로 읽도록), 괄호 균형, 5.1 호환 문법', () => {
  for (const f of ['tools/roblox-studio-autostart-supervisor.ps1', 'tools/install-roblox-studio-autostart.ps1']) {
    const b = fs.readFileSync(f);
    assert.deepEqual([b[0], b[1], b[2]], [0xef, 0xbb, 0xbf], f + ' BOM');
  }
  assert.equal(balanced(sup), true);
  assert.equal(balanced(ins), true);
  assert.doesNotMatch(sup + ins, /\?\?|\?\.|&&|\|\|/, '5.1 에서 안 되는 연산자');
});

test('감독 스크립트: 로그온 데스크톱 전용, 중복 실행 방지, 서명 확인, 실패 시 쉬기, 멈춤 파일', () => {
  assert.match(sup, /SessionId/);
  assert.match(sup, /STUDIO_AUTOSTART_INTERACTIVE_SESSION_REQUIRED/);
  assert.match(sup, /System\.Threading\.Mutex/);
  assert.match(sup, /O=Roblox Corporation/);
  assert.match(sup, /Get-AuthenticodeSignature/);
  assert.match(sup, /AddMinutes\(\$\(if \(\$studioFails -ge 5\) \{ 30 \}/);
  assert.match(sup, /AddMinutes\(\$\(if \(\$runnerFails -ge 5\) \{ 30 \}/);
  assert.match(sup, /STOP/);
  assert.match(sup, /hans1177\/jaewoon-games/);
  assert.match(sup, /Runner\.Listener/);
  assert.match(sup, /run\.cmd/);
});

test('감독 스크립트는 비밀번호·토큰·쿠키를 읽거나 저장하지 않는다', () => {
  assert.doesNotMatch(sup + ins, /Read-Host|SecureString|\.ROBLOSECURITY|ConvertTo-SecureString|-Password/i);
});

test('설치 스크립트: 현재 사용자 로그온 작업(관리자 불필요), 등록된 러너만, 5분 재시작 안전망, 제거 옵션, 자동 로그인은 설정하지 않음', () => {
  assert.match(ins, /New-ScheduledTaskTrigger -AtLogOn/);
  assert.match(ins, /-LogonType Interactive -RunLevel Limited/);
  assert.match(ins, /-RepetitionInterval \(New-TimeSpan -Minutes 5\)/);
  assert.match(ins, /-MultipleInstances IgnoreNew/);
  assert.match(ins, /-ExecutionTimeLimit \(\[TimeSpan\]::Zero\)/);
  assert.match(ins, /Unregister-ScheduledTask/);
  assert.match(ins, /\[switch\]\$CheckOnly/);
  assert.match(ins, /hans1177\/jaewoon-games/);
  assert.match(ins, /STUDIO_AUTOSTART_REGISTERED_RUNNER_NOT_FOUND/);
  assert.doesNotMatch(ins, /Winlogon|DefaultPassword|AutoAdminLogon/i);
});
