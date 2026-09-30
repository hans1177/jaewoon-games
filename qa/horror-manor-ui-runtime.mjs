// 파일명: qa/horror-manor-ui-runtime.mjs
// Roblox 클라이언트 코드를 Luau에서 실행해 메뉴와 로딩의 실제 이벤트 연결을 검사한다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const source=fs.readFileSync('roblox-games/horror-escape-room/client/ManorLobby.client.luau','utf8');
const server=fs.readFileSync('roblox-games/horror-escape-room/server/Game.server.luau','utf8');
const gameClient=fs.readFileSync('roblox-games/horror-escape-room/client/Game.client.luau','utf8');
const loadingStart=gameClient.indexOf('task.spawn(function()\n -- 음악은');
const loadingStop=gameClient.indexOf('task.spawn(function()\n for _=1,20',loadingStart);
if(loadingStart<0||loadingStop<=loadingStart)throw Error('Loading flow source not found');
const loading=gameClient.slice(loadingStart,loadingStop);
const startAt=server.indexOf('local function startRoomMatch(p)'),stopAt=server.indexOf('local function leaveReservedRoom(p)');
if(startAt<0||stopAt<=startAt)throw Error('Room start source not found');
const start=server.slice(startAt,stopAt);
const leave=server.slice(stopAt,server.indexOf('-- 모든 맵 공통 중앙 통로',stopAt));
const spawnAt=server.indexOf('local function onCharacter(p)');
const character=server.slice(spawnAt,server.indexOf('Players.PlayerAdded:Connect',spawnAt));
const wait=server.slice(server.indexOf('  elseif not roomStartRequested then')+'  elseif not roomStartRequested then'.length,server.indexOf('  else\n   roomStartRequested=false;workspace:SetAttribute(\"RoomStartRequested\",false)'));
if(!start||!wait)throw Error('Room flow source not found');
const harness=fs.readFileSync('qa/horror-manor-ui-harness.luau','utf8');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'manor-ui-qa-'));
const file=path.join(dir,'run.luau');
try{
 fs.writeFileSync(file,harness.replace('-- __MANOR_CLIENT_SOURCE__',()=>`do\n${source}\nend`).replace('-- __ROOM_START_SOURCE__',()=>start).replace('-- __ROOM_WAIT_SOURCE__',()=>wait).replace('-- __LOADING_SOURCE__',()=>loading).replace('-- __ROOM_LEAVE_SOURCE__',()=>leave).replace('-- __CHARACTER_SOURCE__',()=>character));
 const result=spawnSync(process.env.LUAU_BIN||'luau',[file],{encoding:'utf8'});
 if(result.error)throw result.error;
 process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');
 process.exitCode=result.status??1;
}finally{fs.rmSync(dir,{recursive:true,force:true});}
