// 파일명: qa/school-tycoon-game.test.mjs
// 메인: 학교 타이쿤 정식 Roblox 소스의 핵심 불변조건 확인
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.join(process.cwd(),'roblox-games/school-tycoon');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const server=read('server/Game.server.luau');
const client=read('client/Game.client.luau');
const config=read('shared/GameConfig.luau');
const project=JSON.parse(read('default.project.json'));
const bootstrap=JSON.parse(read('roblox-source-bootstrap.json'));
test('학교 타이쿤은 기존 정식 Roblox Rojo 경로를 사용한다',()=>{
 assert.equal(project.name,'school-tycoon');
 assert.equal(project.tree.ReplicatedStorage.Shared.$path,'shared');
 assert.equal(project.tree.ServerScriptService.GameServer.$path,'server');
 assert.equal(project.tree.StarterPlayer.StarterPlayerScripts.GameClient.$path,'client');
 assert.equal(bootstrap.releaseClaim,false);
 assert.equal(bootstrap.runtimePassed,false);
});
test('서버만 건설·운영·경제·저장 결정을 내린다',()=>{
 for(const value of ['remote.OnServerEvent','perform(player,session','pathNetwork(state)','connected(x,y,network)','state.tiles','DataStoreService','GetAsync','SetAsync','Players.PlayerRemoving','game:BindToClose','Config.TeacherCost'])
  assert.ok(server.includes(value),value);
 assert.ok(!client.includes('DataStoreService'));
 assert.ok(!client.includes('coins+='));
});
test('모바일 건설·업그레이드·철거·고용·운영 화면이 존재한다',()=>{
 for(const value of ['Activated','학교 건설','selectedX','selectedY','Config.GridSize','send("build")','send("upgrade")','send("remove")','send("hire")','send("toggle")','OnClientEvent'])
  assert.ok(client.includes(value),value);
});
test('교문·교실·교사·복도와 확장 시설이 게임 규칙에 명시된다',()=>{
 for(const value of ['school-tycoon-v1','classroom=','library=','cafeteria=','gym=','lab=','garden=','path=','MaxTeachers','MaxStudentActors','TeacherSalary'])
  assert.ok(config.includes(value),value);
});
