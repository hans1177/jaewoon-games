import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
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
  const result=assessExistingWebSource({html,baseline:{},approvedDesign:true,validationScore:84,sourceExists:true});
  assert.equal(result.strategy,'KEEP_AND_CONTINUE');
  assert.equal(result.preserveExistingSource,true);
  assert.equal(result.fullRewriteAllowed,false);
});

test('working but incomplete Web is classified as PARTIAL_REPAIR',()=>{
  const html=`<!doctype html><html><body><button id="play">Play</button><script>
  let score=0,wave=1;
  addEventListener('keydown',()=>{score+=1});
  function update(){requestAnimationFrame(update)} update();
  const victory='victory', defeat='defeat', upgrade='upgrade';
  </script></body></html>`;
  const result=assessExistingWebSource({html,baseline:{},approvedDesign:true,sourceExists:true});
  assert.equal(result.strategy,'PARTIAL_REPAIR');
  assert.equal(result.preserveExistingSource,true);
  assert.equal(result.fullRewriteAllowed,false);
});

test('limited but reusable Web is classified as MAJOR_REWORK instead of rebuild',()=>{
  const html=`<!doctype html><html><body><button id="play">Play</button><script>
  let score=0;
  addEventListener('keydown',()=>{score+=1});
  function update(){requestAnimationFrame(update)} update();
  const victory='victory', defeat='defeat';
  </script></body></html>`;
  const result=assessExistingWebSource({html,baseline:{},approvedDesign:true,sourceExists:true});
  assert.equal(result.strategy,'MAJOR_REWORK');
  assert.equal(result.preserveExistingSource,true);
  assert.equal(result.fullRewriteAllowed,false);
});


test('existing source cannot full rebuild until approved design baseline is proven',()=>{
  const html='<!doctype html><html><body><h1>검증 패널</h1><button data-session-stage="1">다음</button></body></html>';
  const result=assessExistingWebSource({html,baseline,approvedDesign:false,sourceExists:true});
  assert.equal(result.strategy,'MAJOR_REWORK');
  assert.equal(result.fullRewriteAllowed,false);
  assert.ok(result.reasons.includes('FULL_REBUILD_BLOCKED_WITHOUT_APPROVED_DESIGN')||result.reasons.includes('INSUFFICIENT_EVIDENCE_FOR_SAFE_FULL_REBUILD'));
});

test('stale high validation does not hide current approved scope gaps',()=>{
  const scopedBaseline={content:{coreFun:'방어 유닛 배치',coreLoop:['배치','전투','보상'],progression:{early:'초기 방어',mid:'상성 강화',late:'다중 경로 방어'},mobileUx:{primaryControls:['위치 선택','유닛 배치']}}};
  const html=`<!doctype html><html><body><canvas></canvas><script>
  let hp=10,wave=2,gold=30,playerX=1,playerY=1,enemy={hp:3};
  addEventListener('touchstart',()=>{enemy.hp-=1}); function update(){requestAnimationFrame(update)}update();
  function restart(){wave=1} const victory='victory',defeat='defeat'; localStorage.setItem('save','1'); new AudioContext();
  </script></body></html>`;
  const result=assessExistingWebSource({html,baseline:scopedBaseline,approvedDesign:true,validationScore:84,sourceExists:true});
  assert.notEqual(result.strategy,'FULL_REBUILD');
  if(result.evidence.approvedScopeRequiredCount>0&&result.evidence.approvedScopeCoveragePct<55){
    assert.equal(result.strategy,'PARTIAL_REPAIR');
    assert.ok(result.reasons.includes('CURRENT_APPROVED_SCOPE_GAPS_REMAIN'));
  }
});


test('development-confirmed Web entries have parseable startup code and no missing local script entry',()=>{
  const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
  const checked=[];
  for(const game of catalog.games||[]){
    if(String(game.productionClass||'').toUpperCase()!=='DEVELOPMENT_CONFIRMED')continue;
    const root=path.join('web-games',String(game.id||''));
    const index=path.join(root,'index.html');
    if(!fs.existsSync(index))continue;
    const html=fs.readFileSync(index,'utf8');
    assert.doesNotMatch(html,/task-local exploration handoff|placeholder for the actual implementation|Approved Web Bootstrap/i,game.id);
    const scriptTag=/<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    for(const match of html.matchAll(scriptTag)){
      const attrs=match[1]||'',body=match[2]||'';
      const srcMatch=attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
      if(srcMatch){
        const src=srcMatch[1].split(/[?#]/)[0];
        if(/^(?:https?:)?\/\//i.test(src)||src.startsWith('data:')||src.startsWith('blob:'))continue;
        const local=src.startsWith('/')?src.slice(1):path.join(root,src);
        assert.equal(fs.existsSync(local),true,`${game.id}: missing local script ${src}`);
        const isModule=/\btype\s*=\s*["']module["']/i.test(attrs);
        if(!isModule&&/\.js$/i.test(local)){
          const localSource=fs.readFileSync(local,'utf8');
          assert.doesNotThrow(()=>new vm.Script(localSource,{filename:local}),`${game.id}: local startup syntax ${src}`);
        }
        continue;
      }
      if(!body.trim())continue;
      assert.doesNotThrow(()=>new vm.Script(body,{filename:index}),`${game.id}: inline startup syntax`);
    }
    if(/\bbuildUrl\s*=\s*["']Build["']|\/[^"'\s]+\.loader\.js["']/i.test(html)){
      assert.equal(fs.existsSync(path.join(root,'Build')),true,`${game.id}: Unity Web Build directory missing`);
    }
    checked.push(game.id);
  }
  assert.ok(checked.length>=10,'expected current development-confirmed Web games to be checked');
});
