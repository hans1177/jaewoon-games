// 파일명: qa/primary-three-world-visual-qa.test.mjs
// 유지 중인 마력숲·보석 생존전 원본의 실제 입력·저장·렌더링 계약 검사.
// 이 정적 검사는 Studio·온라인 서버 플레이 또는 F9 승인의 대체 근거가 아니다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const serverPath='roblox-games/fantasy-survival/server/Game.server.luau';
const clientPath='roblox-games/fantasy-survival/client/Game.client.luau';
const gemPath='web-games/gem-survivor/gem3d.mjs';

test('현재 운영 게임 원본이 존재하고 삭제된 공포게임은 복원하지 않는다',()=>{
  const catalog=JSON.parse(read('game-catalog.json'));
  for(const gameId of ['fantasy-survival','gem-survivor'])
    assert.ok(catalog.games.some(game=>game.id===gameId&&game.lifecycleState==='ACTIVE'),gameId);
  for(const file of [serverPath,clientPath,gemPath,'web-games/gem-survivor/index.html'])
    assert.ok(fs.statSync(file).size>0,file);
  assert.equal(fs.existsSync('roblox-games/horror-escape-room'),false);
});

test('마력숲 서버는 플레이어·전투 체력·저장 책임을 유지한다',()=>{
  const source=read(serverPath);
  for(const marker of ['PlayerAdded','CharacterAdded','Humanoid','DataStoreService'])
    assert.ok(source.includes(marker),marker);
});

test('마력숲 클라이언트는 실제 캐릭터 입력과 UI 흐름을 유지한다',()=>{
  const source=read(clientPath);
  for(const marker of ['UserInputService','CharacterAdded','Humanoid'])
    assert.ok(source.includes(marker),marker);
});

test('보석 생존전은 실제 WebGL 프레임으로 3D 장면을 렌더링한다',()=>{
  const page=read('web-games/gem-survivor/index.html');
  const renderer=read(gemPath);
  assert.match(page,/gem3d\.mjs/);
  assert.match(renderer,/new THREE\.WebGLRenderer\(/);
  assert.match(renderer,/renderer\.render\(scene,camera\)/);
  assert.match(renderer,/createGem3d/);
});
