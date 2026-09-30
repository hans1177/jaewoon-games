// Roblox 클라이언트 코드를 Luau에서 실행해 메뉴의 실제 이벤트 연결을 검사한다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const source=fs.readFileSync('roblox-games/horror-escape-room/client/ManorLobby.client.luau','utf8');
const server=fs.readFileSync('roblox-games/horror-escape-room/server/Game.server.luau','utf8');
const startAt=server.indexOf('local function startRoomMatch(p)'),stopAt=server.indexOf('local function leaveReservedRoom(p)');
if(startAt<0||stopAt<=startAt)throw Error('Room start source not found');
const start=server.slice(startAt,stopAt);
const wait=server.slice(server.indexOf('  elseif not roomStartRequested then')+'  elseif not roomStartRequested then'.length,server.indexOf('  else\n   roomStartRequested=false;workspace:SetAttribute(\"RoomStartRequested\",false)'));
if(!start||!wait)throw Error('Room flow source not found');
const harness=fs.readFileSync('qa/horror-manor-ui-harness.luau','utf8');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'manor-ui-qa-'));
const file=path.join(dir,'run.luau');
try{
 fs.writeFileSync(file,harness.replace('-- __MANOR_CLIENT_SOURCE__',()=>`do\n${source}\nend`).replace('-- __ROOM_START_SOURCE__',()=>start).replace('-- __ROOM_WAIT_SOURCE__',()=>wait));
 const result=spawnSync(process.env.LUAU_BIN||'luau',[file],{encoding:'utf8'});
 if(result.error)throw result.error;
 process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');
 process.exitCode=result.status??1;
}finally{fs.rmSync(dir,{recursive:true,force:true});}
