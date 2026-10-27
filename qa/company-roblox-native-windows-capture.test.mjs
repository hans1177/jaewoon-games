import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const worker=fs.readFileSync('tools/company-roblox-native-windows-capture.mjs','utf8');
const director=fs.readFileSync('assets/roblox/runtime-capture/InternalGameplayDirector.luau','utf8');

test('Windows-only native capture recorder has no player automation or GUI macros',()=>{
 assert.match(worker,/process\.platform!=='win32'/);
 assert.match(worker,/ROBLOX_CAPTURE_AUTHORIZED/);
 assert.match(worker,/ROBLOX_CAPTURE_SUBMIT/);
 assert.match(worker,/gdigrab/);
 assert.match(worker,/hwnd=/);
 assert.match(worker,/RobloxPlayerBeta/);
 assert.match(worker,/observedNativeNpc\(target\)/);
 assert.match(worker,/sha256\(file\)/);
 assert.match(worker,/client_payload\[game_id\]/);
 assert.match(worker,/clientLogObserved/);
 assert.match(worker,/captureSource:'ROBLOX_NATIVE_SCRIPTED_ACTOR_CAPTURE'/);
 assert.match(worker,/pass:true,actualGameplay:true,actualNativeEngine:true/);
 assert.match(worker,/uploadVerified:false,videoPublished:false/);
 assert.match(worker,/publishedPlaceRevisionChecked:false/);
 assert.match(worker,/releaseApprovalRequired:true/);
 assert.match(worker,/videoFrameAuditPassed:true/);
 assert.match(worker,/ageSeconds<=7/);
 assert.match(worker,/NATIVE_CAPTURE_LOCAL_FILE_PENDING_UPLOAD/);
 assert.match(worker,/ROBLOX_CAPTURE_REUSED_EXISTING_VIDEO_AFTER_UPLOAD_FAILURE/);
 assert.match(worker,/NATIVE_CAPTURE_RUNTIME_PUSH_RETRY_EXHAUSTED/);
 assert.match(worker,/ROBLOX_NATIVE_CAPTURE_DISPATCH_PENDING_DAILY_RECOVERY/);
 assert.doesNotMatch(worker,/SendInput\s*\(|pyautogui|xdotool|\.SendKeys\s*\(/i);
 assert.doesNotMatch(worker,/\b-i\s*,\s*'desktop'|\bdesktop capture\b/i);
});

test('private in-engine camera follows real existing NPC with native client video capture',()=>{
 assert.match(director,/game\.PrivateServerId==""/);
 assert.match(director,/JAEWOON_NATIVE_CAPTURE_/);
 assert.match(director,/local deadline=os\.clock\(\)\+10/);
 assert.match(director,/Players:GetPlayerFromCharacter\(item\)/);
 assert.match(director,/FindFirstChildOfClass\("Humanoid"\)/);
 assert.match(director,/not root\.Anchored/);
 assert.match(director,/movement>2\.5/);
 assert.match(director,/StartVideoCaptureAsync/);
 assert.match(director,/StopVideoCapture/);
 assert.match(director,/CameraType\.Scriptable/);
 assert.match(director,/JAEWOON_NATIVE_CAPTURE_READY/);
 assert.match(director,/NPC_NOT_MOVING/);
 assert.doesNotMatch(director,/VirtualInputManager|VirtualUser|SendKeyEvent|SendMouseButtonEvent|Humanoid:MoveTo/);
});

for(const id of ['cozy-island','daechung-rpg','horror-escape-room']){
 test(id+' uses exact gated common native capture module without changing normal gameplay',()=>{
  const project=JSON.parse(fs.readFileSync(path.join('roblox-games',id,'default.project.json'),'utf8'));
  const shared=project.tree.ReplicatedStorage.Shared;
  assert.equal(shared.InternalGameplayDirector.$path,'../../assets/roblox/runtime-capture/InternalGameplayDirector.luau');
  const client=fs.readFileSync(path.join('roblox-games',id,'client','Game.client.luau'),'utf8');
  assert.ok(client.includes('director.install("'+id+'")'));
  assert.ok(client.includes('FindFirstChild("InternalGameplayDirector")'));
 });
}

test('Windows watcher and bootstrap never drive Roblox Player input and use bounded close-range polling',()=>{
 const watcher=fs.readFileSync('tools/watch-roblox-native-capture-windows.ps1','utf8');
 const setup=fs.readFileSync('tools/setup-roblox-native-capture-windows.ps1','utf8');
 assert.match(watcher,/\[int\]\$PollSeconds = 3/);
 assert.match(watcher,/RegisterWatcher|ROBLOX_CAPTURE_SUBMIT/);
 assert.match(watcher,/ROBLOX_CAPTURE_AUTHORIZED/);
 assert.match(watcher,/Start-ApprovedPrivateCaptureSession/);
 assert.match(watcher,/Import-Clixml/);
 assert.match(watcher,/private-capture-join\.xml/);
 assert.match(watcher,/JAEWOON_CAPTURE_PRIVATE_LINK_CODE/);
 assert.match(watcher,/JAEWOON_CAPTURE_GAME_ID/);
 assert.match(watcher,/&linkCode=/);
 assert.match(watcher,/&launchData=/);
 assert.match(watcher,/Start-Process -FilePath \$uri/);
 assert.match(watcher,/Get-Date\).AddMinutes\(5\)/);
 assert.match(watcher,/target\.verified -ne \$true/);
 assert.doesNotMatch(watcher,/SendKeys|SendInput|pyautogui|Start-Process Roblox|mouse_event/i);
 assert.match(setup,/New-ScheduledTaskTrigger -AtLogOn/);
 assert.match(setup,/Export-Clixml/);
 assert.match(setup,/Security\.SecureString/);
 assert.match(setup,/CAPTURE_GAME_ID_NOT_ALLOWLISTED/);
 assert.match(setup,/LogonType Interactive/);
 assert.match(setup,/RobloxPlayerBeta[.]exe/);
 assert.match(setup,/winget install -e --id Roblox[.]Roblox/);
 assert.match(setup,/ROBLOX_NATIVE_PLAYER_BINARY_INSTALLED=YES/);
 assert.match(setup,/ROBLOX_CAPTURE_WATCHER_POWERSHELL_PARSE_FAILED/);
 assert.match(setup,/HKCU:\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run/);
 assert.match(setup,/ROBLOX_WINDOWS_CAPTURE_WATCHER=STARTED_AND_REGISTERED_WITH_CURRENT_USER_RUN/);
 assert.doesNotMatch(setup,/Get-ChildItem -LiteralPath \$NativePlayerVersions -Directory/);
 assert.doesNotMatch(setup,/auto-login|ROBLOSECURITY=/i);
});

test('capture watcher has one uninterrupted loop and preserves all three secured join configurations',()=>{
 const watcher=fs.readFileSync('tools/watch-roblox-native-capture-windows.ps1','utf8');
 const setup=fs.readFileSync('tools/setup-roblox-native-capture-windows.ps1','utf8');
 assert.equal((watcher.match(/while \(\$true\)/g)||[]).length,1);
 assert.equal((watcher.match(/function Start-ApprovedPrivateCaptureSession\b/g)||[]).length,1);
 assert.match(watcher,/Update-CaptureCheckouts/);
 assert.match(watcher,/git -C \$directory pull --ff-only/);
 assert.match(watcher,/Get-ApprovedJoinEntries/);
 assert.match(watcher,/\$GameIds = @\('cozy-island', 'daechung-rpg', 'horror-escape-room'\)/);
 assert.match(watcher,/PRIVATE_DEDICATED_TARGET_UNVERIFIED/);
 assert.match(watcher,/Write-CaptureDiagnostic/);
 assert.match(setup,/\$entries \+= \[pscustomobject\]@\{GameId=\$CaptureGameId; LinkCode=\$PrivateLinkCode\}/);
 assert.match(setup,/\$entries = @\(\$entries \| Where-Object/);
 assert.doesNotMatch(watcher,/\)\) \{ return \}/);
});

test('service session hands native Player setup to a signed-in Windows desktop only',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-roblox-runner-pwsh-bootstrap.yml','utf8');
 assert.match(workflow,/\[Diagnostics[.]Process\]::GetCurrentProcess\(\)[.]SessionId/);
 assert.match(workflow,/SERVICE_SESSION_REQUIRES_INTERACTIVE_LAUNCH/);
 assert.match(workflow,/WAITING_FOR_WINDOWS_USER_LOGON/);
 assert.match(workflow,/Win32_ComputerSystem/);
 assert.match(workflow,/BLOCKED_NATIVE_GPU_MISSING/);
 assert.match(workflow,/WindowsIdentity\]::GetCurrent\(\)/);
 assert.match(workflow,/NTAccount\]::new\(\$consoleUser\)/);
 assert.match(workflow,/SERVICE_ACCOUNT_DIFFERS_FROM_CONSOLE_USER/);
 assert.match(workflow,/HKCU:\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run/);
 assert.match(workflow,/INTERACTIVE_LOGON_AUTORUN_REGISTERED/);
 assert.match(workflow,/USER_SIGNIN_REQUIRED_TO_RUN_PLAYER/);
 assert.match(workflow,/Get-ItemProperty -Path \$runKey/);
 assert.doesNotMatch(workflow,/Register-ScheduledTask -TaskName 'JaewoonRobloxNativeMediaBootstrap'/);
 assert.match(workflow,/ROBLOX_ACTUAL_CLIENT_RECORDING_NOT_YET_ATTESTED=YES/);
 assert.doesNotMatch(workflow,/ROBLOSECURITY=|SendKeys|pyautogui/);
});

test('Windows worker fails closed on unsupported Linux GitHub runner, instead of faking footage',()=>{
 if(process.platform==='win32')return;
 const result=spawnSync(process.execPath,
  ['tools/company-roblox-native-windows-capture.mjs','--game-id=cozy-island','--mode=check'],
  {encoding:'utf8'});
 assert.equal(result.status,1);
 assert.match(result.stderr,/ROBLOX_CAPTURE_BLOCKED=WINDOWS_SESSION_REQUIRED/);
});

test('Windows native capture worker parses as valid Node ESM',()=>{
 const proc=spawnSync(process.execPath,['--check','tools/company-roblox-native-windows-capture.mjs'],{encoding:'utf8'});
 assert.equal(proc.status,0,proc.stderr);
});
