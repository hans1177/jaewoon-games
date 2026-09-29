import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const Graphics=require('../assets/jaewoon-graphics-engine.js');

test('graphics engine v2 infers concrete mobile visual anomalies',()=>{
  assert.equal(Graphics.version,2);
  const anomalies=Graphics.inferVisualAnomalies('모바일에서 HUD가 safe area 밖으로 넘침');
  assert.ok(anomalies.includes('UI_OUTSIDE_SAFE_AREA'));
});

test('graphics implementation planner selects presentation files and excludes gameplay core',()=>{
  const plan=Graphics.planGraphicsImplementation({
    anomalies:['UI_OUTSIDE_SAFE_AREA'],
    files:['GameCore.cs','Assets/Scripts/RuntimeBootstrap.cs','Assets/Scripts/UI/HudView.cs','style.css'],
    goal:'모바일 HUD 안전 영역을 수정한다',
    deviceTier:'LOW'
  });
  assert.equal(plan.run,true);
  assert.ok(plan.scope.includes('Assets/Scripts/UI/HudView.cs')||plan.scope.includes('style.css'));
  assert.equal(plan.scope.includes('GameCore.cs'),false);
  assert.equal(plan.scope.includes('Assets/Scripts/RuntimeBootstrap.cs'),false);
  assert.equal(plan.maxChangedFiles,2);
  assert.equal(plan.deviceBudget.uiHud,1);
});

test('leased graphics files are skipped rather than forcing a collision',()=>{
  const plan=Graphics.planGraphicsImplementation({
    anomalies:['VFX_HIDES_TELEGRAPH'],
    files:['effects/combat-vfx.css','ui/hud.css'],
    leasedFiles:['effects/combat-vfx.css'],
    goal:'VFX가 공격 전조를 가리는 문제를 수정한다'
  });
  assert.equal(plan.run,true);
  assert.deepEqual(plan.scope,['ui/hud.css']);
});

test('review-only prose without a concrete visual defect does not manufacture graphics work',()=>{
  const plan=Graphics.planGraphicsImplementation({files:['style.css'],goal:'현재 그래픽을 검토하고 다음 라운드 기준을 제안한다'});
  assert.equal(plan.run,false);
  assert.equal(plan.reason,'NO_ACTIONABLE_VISUAL_EVIDENCE');
});

test('graphics implementation impact refuses metadata and gameplay authority files',()=>{
  assert.equal(Graphics.graphicsImplementationImpact({changedFiles:['company-status.json']}).implementationCredit,false);
  assert.equal(Graphics.graphicsImplementationImpact({changedFiles:['GameCore.cs']}).pass,false);
  const visual=Graphics.graphicsImplementationImpact({changedFiles:['ui/hud.css','Assets/Scripts/Vfx/HitEffect.cs']});
  assert.equal(visual.pass,true);
  assert.equal(visual.implementationCredit,true);
});
