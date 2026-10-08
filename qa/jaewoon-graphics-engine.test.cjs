const test = require('node:test');
const assert = require('node:assert/strict');
const Graphics = require('../assets/jaewoon-graphics-engine.js');

function fullEvidence(value=1){
  return {
    readability:value, identity:value, actors:value, environment:value, uiHud:value,
    combatVfx:value, signatureScene:value, motionStyleMatch:value,
    mobilePerformance:value, licenseRegressionSafety:value,
  };
}

test('Graphics Score weights total 100', () => {
  const result=Graphics.graphicsScore(fullEvidence(1));
  assert.equal(result.total,100);
  assert.equal(Object.values(Graphics.SCORE_WEIGHTS).reduce((a,b)=>a+b,0),100);
});

test('candidate cannot mutate gameplay authority or stable/main directly', () => {
  assert.equal(Graphics.validateVisualCandidate({ palette:'ice', damage:99 }).pass,false);
  assert.equal(Graphics.validateVisualCandidate({ target:'stable', palette:'ice' }).pass,false);
  assert.equal(Graphics.validateVisualCandidate({ target:'candidate', palette:'ice', selfPromote:true }).pass,false);
  assert.equal(Graphics.validateVisualCandidate({ target:'candidate', palette:'ice' }).pass,true);
});

test('asset license gate blocks unknown/NC and accepts verified commercial modification', () => {
  assert.equal(Graphics.validateAssetLicense({source:'x',author:'a',license:'UNKNOWN',checkedAt:'2026-09-09',gameId:'P1',use:'enemy'}).pass,false);
  assert.equal(Graphics.validateAssetLicense({source:'x',author:'a',license:'CC-BY-NC',checkedAt:'2026-09-09',gameId:'P1',use:'enemy'}).pass,false);
  assert.equal(Graphics.validateAssetLicense({source:'x',author:'a',license:'CC0',checkedAt:'2026-09-09',gameId:'P1',use:'enemy',commercialUse:true,modificationUse:true,modified:true}).pass,true);
});

test('LOW tier cuts decoration before core readability/UI/player feedback', () => {
  const low=Graphics.deviceVisualBudget('LOW');
  assert.ok(low.decorativeParticles < low.coreSilhouette);
  assert.ok(low.postFx < low.attackReadability);
  assert.equal(low.uiHud,1);
  assert.equal(low.playerFeedback,1);
});

test('visual anomaly detection covers telegraph/performance/mobile failures', () => {
  const found=Graphics.detectVisualAnomalies({vfxHidesTelegraph:true,particleExplosion:true,mobileEnemyUnreadable:true});
  assert.deepEqual(found,['VFX_HIDES_TELEGRAPH','PARTICLE_EXPLOSION','MOBILE_ENEMY_UNREADABLE']);
});

test('A/B/C winner must improve score under same conditions with no regression', () => {
  const result=Graphics.evaluateGraphicsExperiment({
    baseline:{ evidence:fullEvidence(0.65) },
    candidates:[
      {id:'B',variant:'B',target:'candidate',evidence:fullEvidence(0.75),performancePass:true,inputPass:true},
      {id:'C',variant:'C',target:'candidate',evidence:fullEvidence(0.90),performancePass:false,inputPass:true},
    ],
    conditions:{sameDevice:true,sameScene:true,sameCharacter:true,sameInput:true,samePerformanceLimit:true},
  });
  assert.equal(result.pass,true);
  assert.equal(result.winner.id,'B');
});

test('single game cannot become company graphics DNA; 3 games and 2 contexts can become candidate', () => {
  let promotion=Graphics.graphicsDnaPromotion([{gameId:'P1',context:'survival',verified:true,regressionPass:true,performancePass:true}]);
  assert.equal(promotion.companyStandardEligible,false);
  promotion=Graphics.graphicsDnaPromotion([
    {gameId:'P1',context:'survival',verified:true,regressionPass:true,performancePass:true},
    {gameId:'P2',context:'defense',verified:true,regressionPass:true,performancePass:true},
    {gameId:'P3',context:'survival',verified:true,regressionPass:true,performancePass:true},
  ]);
  assert.equal(promotion.companyStandardEligible,true);
  assert.equal(promotion.selfPromoteAllowed,false);
  assert.equal(promotion.requiresJayVerdict,true);
});

test('asset strategy preserves usable originals instead of replacing by default', () => {
  assert.equal(Graphics.classifyAsset({currentQuality:.9,readability:.9,identityFit:.9}), 'KEEP');
  assert.equal(Graphics.classifyAsset({currentQuality:.6,readability:.6,identityFit:.7}), 'ENHANCE');
  assert.equal(Graphics.classifyAsset({currentQuality:.6,readability:.6,identityFit:.7,needsParts:true}), 'COMBINE');
});

// 메인: 렌더링 후보 파일 권한과 저장소 경로 경계를 검사한다.
test('graphics candidate scoping rejects traversal, absolute paths and URLs while retaining local rendering', () => {
  const unsafe = ['../assets/render.js', '../../game/ui.css', '/etc/shaders/screen.css', 'C:\\\\private\\\\ui.css', 'https://example.com/ui.css', 'assets/legit/../../tools/render.js'];
  for (const file of unsafe) {
    const authority = Graphics.visualFileAuthority(file);
    assert.equal(authority.safe, false, file);
    assert.equal(authority.reason, 'UNSAFE_VISUAL_PATH', file);
  }
  const local = 'web-games/demo/assets/ui/panel.css';
  assert.equal(Graphics.visualFileAuthority(local).safe, true);
  const plan = Graphics.planGraphicsImplementation({ goal: '모바일 화면 수정', anomalies: ['UI_OUTSIDE_SAFE_AREA'], files: [unsafe[0], local] });
  assert.deepEqual(plan.scope, [local]);
  assert.equal(Graphics.graphicsImplementationImpact({ changedFiles: [local, unsafe[0]] }).pass, false);
});

// 메인: 잘못된 렌더 계측값은 그래픽 품질 승격의 성공 증거가 아니다.
test('nonfinite rendering measurements cannot turn failed A/B candidates into passing scores', () => {
  const baseline=fullEvidence(.9);
  const invalid={...baseline,readability:Infinity};
  assert.equal(Graphics.graphicsScore(baseline).total,90);
  assert.equal(Graphics.graphicsScore(invalid).total,76.5);
  assert.equal(Graphics.graphicsScore({...baseline,mobilePerformance:NaN}).total,81);
  const result=Graphics.evaluateGraphicsExperiment({
    baseline:{evidence:baseline},
    candidates:[{id:'invalid-telemetry',target:'candidate',evidence:invalid}],
    conditions:{sameDevice:true,sameScene:true,sameCharacter:true,sameInput:true,samePerformanceLimit:true}
  });
  assert.equal(result.pass,false);
  assert.equal(result.winner,null);
});
