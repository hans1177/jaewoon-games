import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const games=['fantasy-survival','mare-scientia'];
const run=(game,...a)=>spawnSync('node',['tools/vibe-visual-ladder.mjs','--game',game,...a],{encoding:'utf8'});

test('비주얼 래더 상태 파일과 생성 Luau 모듈이 두 게임 모두 일치한다', () => {
  for(const g of games){const r=run(g,'--check');assert.equal(r.status,0,g+' '+r.stderr)}
});

test('마레 스키엔티아 공용 환경 연출 스크립트가 공용 원본과 같다', () => {
  assert.equal(
    fs.readFileSync('roblox-games/mare-scientia/src/StarterPlayer/VisualLadder.client.luau','utf8'),
    fs.readFileSync('assets/roblox/common-ambience-v1/VisualLadder.client.luau','utf8'));
});

test('승인 자산이 필요한 단계는 승인 키 없이는 올리지 않는다(파츠·임의 생성물 금지)', () => {
  for(const g of games) checkApproved(`roblox-games/${g}`);
});
function checkApproved(dir){
  const spec=JSON.parse(fs.readFileSync(`${dir}/visual-ladder.json`,'utf8'));
  const approved=JSON.parse(fs.readFileSync(`${dir}/approved-assets.json`,'utf8'));
  const state=JSON.parse(fs.readFileSync(`${dir}/visual-ladder-state.json`,'utf8'));
  for(const [cat,def] of Object.entries(spec.categories)){
    for(const t of def.tiers){
      if(t.tier<=state.tiers[cat]){
        for(const key of t.requires||[]) assert.equal(approved[key],true,`${cat} ${t.tier}단계는 승인 키 ${key} 없이 올라가 있다`);
      }
    }
  }
}

test('게임 코드는 래더 단계를 읽고 새 도형 파츠를 만들지 않는다', () => {
  const dir='roblox-games/fantasy-survival';
  const server=fs.readFileSync(`${dir}/server/Game.server.luau`,'utf8');
  const client=fs.readFileSync(`${dir}/client/Game.client.luau`,'utf8');
  assert.match(server,/VisualLadderState/);
  assert.match(client,/VisualLadderWorld/);
  assert.doesNotMatch(client.slice(client.indexOf('[비주얼 래더 · 배경]')),/Instance\.new\("Part"\)/);
});
