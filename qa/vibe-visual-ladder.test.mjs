import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const games=['fantasy-survival','mare-essentia'];
const run=(game,...a)=>spawnSync('node',['tools/vibe-visual-ladder.mjs','--game',game,...a],{encoding:'utf8'});

test('비주얼 래더 상태 파일과 생성 Luau 모듈이 두 게임 모두 일치한다', () => {
  for(const g of games){const r=run(g,'--check');assert.equal(r.status,0,g+' '+r.stderr)}
});

test('마레 스키엔티아 공용 환경 연출 스크립트가 공용 원본과 같다', () => {
  assert.equal(
    fs.readFileSync('roblox-games/mare-essentia/src/StarterPlayer/VisualLadder.client.luau','utf8'),
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

test('화면 검사기는 검은 화면을 깨진 화면으로 잡는다', (t) => {
  const tmp=fs.mkdtempSync('/tmp/ladder-frames-');
  const mk=spawnSync('python3',['-c',`from PIL import Image\nImage.new('RGB',(320,180),(0,0,0)).save('${tmp}/a.jpg')\nim=Image.effect_noise((320,180),60).convert('RGB');im.save('${tmp}/b.jpg')`],{encoding:'utf8'});
  if(mk.status!==0){t.skip('Pillow 없음');return}
  const r=spawnSync('python3',['tools/vibe-ladder-frames.py','--dir',tmp],{encoding:'utf8'});
  const out=JSON.parse(r.stdout.trim());
  assert.equal(out.checked,2);
  assert.deepEqual(out.badFiles,['a.jpg']);
});

test('성능 측정기는 키가 없으면 데이터 없음으로 정상 종료한다', () => {
  const r=spawnSync('python3',['tools/vibe-ladder-telemetry.py','--universe','1'],{encoding:'utf8',env:{...process.env,ROBLOX_OPEN_CLOUD_API_KEY:''}});
  assert.equal(r.status,0);
  assert.equal(JSON.parse(r.stdout.trim()).sessions,0);
});

test('대시보드 페이지와 전체 현황 JSON이 두 게임을 담는다', () => {
  assert.ok(fs.existsSync('vibe-ladder.html'));
  const status=JSON.parse(fs.readFileSync('vibe-ladder-status.json','utf8'));
  for(const g of games) assert.ok(status.games[g],g);
});

test('리그 키트 가족 표가 Luau 모듈과 같고 이족·사족·뱀·날개 리그를 분류한다', async () => {
  const r=spawnSync('node',['tools/vibe-rig-kit.mjs','--check'],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
  const {classify}=await import('../tools/vibe-rig-kit.mjs');
  assert.equal(classify(['UpperArm.L','UpperArm.R','UpperLeg.L','UpperLeg.R']).id,'biped');
  assert.equal(classify(['FrontUpperLeg.L','BackUpperLeg.L','Body']).id,'quadruped');
  assert.equal(classify(['Head','Tail','Chest','Body']).id,'snake');
  assert.equal(classify(['Wing1.L','Wing1.R','Torso']).id,'winged');
  assert.equal(classify(['Nothing']).id,'static');
});
