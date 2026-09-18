import test from 'node:test';
import assert from 'node:assert/strict';
import { assessExistingWebSource } from '../tools/vibe2-existing-web-assessment.mjs';

const baseline={content:{coreFun:'위치를 선택해 방어 유닛을 배치하고 적의 경로를 막는다',coreLoop:['위치 선택','유닛 배치','적 이동과 전투','보상으로 강화']}};

test('prototype marker alone cannot force a rebuild when real gameplay exists',()=>{
  const html=`<!doctype html><html><body><canvas></canvas><div>검증 패널</div><script>
  let playerX=0,playerY=0,hp=10,wave=1,gold=20,enemy={hp:5};
  addEventListener('pointerdown',e=>{playerX=e.clientX;playerY=e.clientY;enemy.hp-=1;});
  function update(){if(enemy.hp<=0){gold+=5;wave+=1;}requestAnimationFrame(update)} update();
  function restart(){hp=10;wave=1} const victory='victory', defeat='defeat';
  localStorage.setItem('save',JSON.stringify({hp,wave,gold})); const ac=new AudioContext();
  </script></body></html>`;
  const result=assessExistingWebSource({html,baseline,approvedDesign:true,sourceExists:true});
  assert.notEqual(result.strategy,'FULL_REBUILD');
  assert.ok(result.evidence.gameplaySignalCount>=5);
  assert.ok(result.reasons.includes('PROTOTYPE_MARKER_PRESENT_BUT_NOT_DECISIVE'));
});

test('thin validation shell with no gameplay can be rebuilt',()=>{
  const html='<!doctype html><html><body><h1>검증 패널</h1><button data-session-stage="1">다음</button></body></html>';
  const result=assessExistingWebSource({html,baseline,approvedDesign:true,sourceExists:true});
  assert.equal(result.strategy,'FULL_REBUILD');
  assert.equal(result.fullRewriteAllowed,true);
});

test('validated playable web is kept and continued',()=>{
  const html=`<!doctype html><html><body><canvas></canvas><script>
  let hp=10,wave=2,gold=30,playerX=1,playerY=1,enemy={hp:3};
  addEventListener('touchstart',()=>{enemy.hp-=1}); function update(){requestAnimationFrame(update)}update();
  function restart(){wave=1} const victory='victory',defeat='defeat'; localStorage.setItem('save','1'); new AudioContext();
  </script></body></html>`;
  const result=assessExistingWebSource({html,baseline,approvedDesign:true,validationScore:84,sourceExists:true});
  assert.equal(result.strategy,'KEEP_AND_CONTINUE');
  assert.equal(result.preserveExistingSource,true);
  assert.equal(result.fullRewriteAllowed,false);
});
