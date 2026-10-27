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
 assert.match(worker,/captureSource:'ROBLOX_WINDOW_RECORDING_PENDING_RUNTIME_ATTESTATION'/);
 assert.match(worker,/pass:false,actualGameplay:false,actualNativeEngine:false/);
 assert.match(worker,/uploadVerified:false,videoPublished:false/);
 assert.doesNotMatch(worker,/SendInput\s*\(|pyautogui|xdotool|\.SendKeys\s*\(/i);
 assert.doesNotMatch(worker,/\b-i\s*,\s*'desktop'|\bdesktop capture\b/i);
});

test('private in-engine camera follows real existing NPC with native client video capture',()=>{
 assert.match(director,/game\.PrivateServerId==""/);
 assert.match(director,/JAEWOON_NATIVE_CAPTURE_/);
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
