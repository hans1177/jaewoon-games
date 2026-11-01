// 파일명: qa/horror-escape-room-release.test.mjs
// 영구 삭제 게임에는 소스 복구나 이전 기능 검증을 요구하지 않는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const gameId='horror-escape-room';

test('삭제된 공포 탈출방은 정본 정책과 게임 목록에서 영구 제거 상태를 유지한다',()=>{
  const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
  assert.ok(roadmap.permanentProjectRemoval.ids.includes(gameId),'central permanent removal missing');
  assert.ok(roadmap.developmentLifecycleMachine.permanentProjectRemoval.ids.includes(gameId),'development hard-exclusion missing');
  assert.ok(catalog.permanentRemovalPolicy.ids.includes(gameId),'catalog permanent removal missing');
  assert.equal(catalog.games.some(game=>game.id===gameId),false,'deleted game must not be registered again');
  for(const policy of [roadmap.permanentProjectRemoval,catalog.permanentRemovalPolicy]){
    assert.equal(policy.reentryAllowed,false);
    assert.equal(policy.automaticRecoveryAllowed,false);
    assert.equal(policy.automaticMaintenanceAllowed,false);
  }
});
