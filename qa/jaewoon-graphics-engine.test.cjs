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

// [그래픽 QA] 실제 모션·화풍·거리 변경 결함을 기존 이상징후 검사에서 구분한다.
test('graphics audits articulated rig, motion contact, style, LOD and mobile frame issues',()=>{
  const found=Graphics.detectVisualAnomalies({
    rigJointMotionMissing:true,footContactSliding:true,animationTransitionPop:true,
    mobileFrameBudgetExceeded:true,lodTransitionPop:true,runtimeVisualRegression:true
  });
  assert.deepEqual(found,[
    'RIG_JOINT_MOTION_MISSING','FOOT_CONTACT_SLIDING','ANIMATION_TRANSITION_POP',
    'MOBILE_FRAME_BUDGET_EXCEEDED','LOD_TRANSITION_POP','RUNTIME_VISUAL_REGRESSION'
  ]);
  assert.ok(Graphics.inferVisualAnomalies('발 미끄러짐').includes('FOOT_CONTACT_SLIDING'));
  const plan=Graphics.planGraphicsImplementation({
    anomalies:['RIG_JOINT_MOTION_MISSING'],
    files:['GameCore.cs','Actors/HeroAnimator.cs','Assets/UI/HudView.cs'],
    goal:'관절 움직임 누락 수정'
  });
  assert.equal(plan.run,true);
  assert.deepEqual(plan.scope,['Actors/HeroAnimator.cs','Assets/UI/HudView.cs']);
  assert.ok(!plan.scope.includes('GameCore.cs'));
});

test('mobile visual budget uses only verified samples and protects readable core',()=>{
  const low=Graphics.deviceVisualBudget('LOW',{
    runtimeVerified:true,observedFps:20,targetFps:60,samples:120
  });
  assert.equal(low.validatedRuntimeSample,true);
  assert.equal(low.adaptive,true);
  assert.ok(low.decorativeParticles<Graphics.deviceVisualBudget('LOW').decorativeParticles);
  assert.equal(low.coreSilhouette,1);
  assert.equal(low.attackReadability,1);
  assert.equal(low.uiHud,1);
  assert.equal(low.playerFeedback,1);
  const untrusted=Graphics.deviceVisualBudget('LOW',{
    runtimeVerified:false,observedFps:10,targetFps:60,samples:120
  });
  assert.equal(untrusted.adaptive,false);
  assert.equal(untrusted.decorativeParticles,Graphics.deviceVisualBudget('LOW').decorativeParticles);
  const plan=Graphics.planGraphicsImplementation({
    anomalies:['MOBILE_FRAME_BUDGET_EXCEEDED'],files:['Assets/Vfx/Particles.cs'],
    goal:'모바일 프레임 저하 개선',deviceTier:'LOW',
    deviceTelemetry:{runtimeVerified:true,observedFps:20,targetFps:60,samples:120}
  });
  assert.equal(plan.run,true);
  assert.equal(plan.deviceBudget.uiHud,1);
  assert.equal(plan.deviceBudget.adaptive,true);
});

test('native graphics comparisons require exact before-after captures and style locks when requested',()=>{
  const conditions={sameDevice:true,sameScene:true,sameCharacter:true,sameInput:true,
    samePerformanceLimit:true,requireRuntimeEvidence:true,requireStyleLock:true};
  const baseline={evidence:fullEvidence(.55),styleDnaHash:'style-v1',
    runtimeCapture:{id:'before',sourceRevision:'revision-1',sceneId:'boss-room',
      deviceId:'android-low',cameraId:'boss-camera',viewportWidth:393,viewportHeight:852,sha256:'a'.repeat(64)}};
  const ready={id:'candidate',target:'candidate',evidence:fullEvidence(.8),
    styleDnaHash:'style-v1',runtimeVerified:true,independentQaPassed:true,
    beforeAfterVisualRegressionPass:true,
    runtimeCapture:{id:'after',sourceRevision:'revision-2',sceneId:'boss-room',
      deviceId:'android-low',cameraId:'boss-camera',viewportWidth:393,viewportHeight:852,sha256:'b'.repeat(64)}};
  const valid=Graphics.evaluateGraphicsExperiment({baseline,candidates:[ready],conditions});
  assert.equal(valid.pass,true);
  assert.equal(valid.winner.runtimeVerified,true);
  assert.equal(valid.winner.evidenceScope,'EXACT_NATIVE_CAPTURE_COMPARISON');
  for(const candidate of [
    {...ready,runtimeVerified:false},{...ready,independentQaPassed:false},
    {...ready,beforeAfterVisualRegressionPass:false},
    {...ready,styleDnaHash:'other'},
    {...ready,runtimeCapture:{...ready.runtimeCapture,id:'before'}},
    {...ready,runtimeCapture:{...ready.runtimeCapture,sha256:''}},
    {...ready,runtimeCapture:{...ready.runtimeCapture,deviceId:'android-high'}},
    {...ready,runtimeCapture:{...ready.runtimeCapture,cameraId:'different-angle'}},
    {...ready,runtimeCapture:{...ready.runtimeCapture,viewportWidth:390}},
    {...ready,runtimeCapture:{...ready.runtimeCapture,viewportHeight:780}},
    {...ready,runtimeCapture:{...ready.runtimeCapture,cameraId:''}},
    {...ready,runtimeCapture:{...ready.runtimeCapture,viewportHeight:NaN}}
  ]){
    const blocked=Graphics.evaluateGraphicsExperiment({baseline,candidates:[candidate],conditions});
    assert.equal(blocked.pass,false);
  }
  const advisory=Graphics.evaluateGraphicsExperiment({baseline,candidates:[ready],
    conditions:{sameDevice:true,sameScene:true,sameCharacter:true,sameInput:true,samePerformanceLimit:true}});
  assert.equal(advisory.winner.runtimeVerified,false,'non-strict score cannot claim native runtime validation');
});

// [모바일 계측 회귀] 평균 FPS가 좋아도 긴 프레임 지연을 감추지 않는다.
test('graphics visual budget uses observed p90 frame-time rather than optimistic FPS',()=>{
  const frameTimesMs=[...Array(26).fill(16),...Array(4).fill(100)];
  const budget=Graphics.deviceVisualBudget('LOW',{
    runtimeVerified:true,targetFps:60,observedFps:120,
    samples:frameTimesMs.length,frameTimesMs
  });
  assert.equal(budget.validatedRuntimeSample,true);
  assert.equal(budget.telemetryMethod,'P90_FRAME_TIME');
  assert.equal(budget.p90FrameMs,100);
  assert.equal(budget.measuredFps,10);
  assert.equal(budget.performanceRatio,.35);
  assert.equal(budget.adaptive,true);
  assert.equal(budget.coreSilhouette,1);
  assert.equal(budget.attackReadability,1);
  assert.equal(budget.uiHud,1);
  assert.equal(budget.playerFeedback,1);
  assert.equal(budget.telemetryEvidence,'CALLER_REPORTED_NOT_INDEPENDENTLY_VERIFIED');
});

test('graphics visual budget rejects incomplete or manipulated runtime frame traces',()=>{
  const valid=Array(30).fill(20),base=Graphics.deviceVisualBudget('LOW');
  const candidates=[
    {frameTimesMs:[...valid.slice(0,29)],samples:29},
    {frameTimesMs:[...valid.slice(0,29),NaN],samples:30},
    {frameTimesMs:[...valid.slice(0,29),Infinity],samples:30},
    {frameTimesMs:[...valid.slice(0,29),-1],samples:30},
    {frameTimesMs:[...valid.slice(0,29),0],samples:30},
    {frameTimesMs:valid,samples:999},
    {frameTimesMs:'not samples',samples:30},
    {frameTimesMs:valid,samples:30,runtimeVerified:false}
  ];
  for(const input of candidates){
    const result=Graphics.deviceVisualBudget('LOW',{
      runtimeVerified:true,targetFps:60,observedFps:1,...input
    });
    assert.equal(result.validatedRuntimeSample,false);
    assert.equal(result.adaptive,false);
    assert.equal(result.decorativeParticles,base.decorativeParticles);
    assert.equal(result.telemetryMethod,'NONE');
    assert.equal(result.measuredFps,null);
  }
  const legacy=Graphics.deviceVisualBudget('MID',{
    runtimeVerified:true,targetFps:60,observedFps:30,samples:60
  });
  assert.equal(legacy.telemetryMethod,'AGGREGATE_FPS');
  assert.equal(legacy.performanceRatio,.5);
});

test('strict before-after graphics evidence rejects identical frame hashes',()=>{
  const conditions={sameDevice:true,sameScene:true,sameCharacter:true,sameInput:true,
    samePerformanceLimit:true,requireRuntimeEvidence:true,requireStyleLock:true};
  const capture={id:'before',sourceRevision:'revision-1',sceneId:'room',
    deviceId:'mobile',cameraId:'room-camera',viewportWidth:393,viewportHeight:852,sha256:'a'.repeat(64)};
  const baseline={evidence:{
    readability:.5,identity:.5,actors:.5,environment:.5,uiHud:.5,
    combatVfx:.5,signatureScene:.5,motionStyleMatch:.5,mobilePerformance:.5,
    licenseRegressionSafety:.5
  },styleDnaHash:'style',runtimeCapture:capture};
  const candidate={id:'changed',target:'candidate',
    evidence:Object.fromEntries(Object.keys(baseline.evidence).map(key=>[key,.8])),
    styleDnaHash:'style',runtimeVerified:true,independentQaPassed:true,
    beforeAfterVisualRegressionPass:true,
    runtimeCapture:{...capture,id:'after',sourceRevision:'revision-2'}
  };
  const unchanged=Graphics.evaluateGraphicsExperiment({baseline,candidates:[candidate],conditions});
  assert.equal(unchanged.pass,false);
  assert.equal(unchanged.comparisons[0].runtimeEvidencePass,false);
  const changed=Graphics.evaluateGraphicsExperiment({baseline,candidates:[{
    ...candidate,runtimeCapture:{...candidate.runtimeCapture,sha256:'b'.repeat(64)}
  }],conditions});
  assert.equal(changed.pass,true);
  assert.equal(changed.winner.runtimeVerified,true);
});

// [실제 화면] 동일 장면·기기라도 서로 다른 시점·해상도는 A/B 증거로 혼용 금지.
test('native graphics cannot validate missing camera or nonmatching viewport even with perfect score',()=>{
  const evidence=fullEvidence(.5),improved=fullEvidence(.95);
  const baseCapture={id:'before',sourceRevision:'one',sceneId:'arena',deviceId:'phone',
    cameraId:'follow-camera',viewportWidth:390,viewportHeight:844,sha256:'a'.repeat(64)};
  const baseline={evidence,runtimeCapture:baseCapture};
  const afterCapture={...baseCapture,id:'after',sourceRevision:'two',sha256:'b'.repeat(64)};
  const candidate={id:'after',target:'candidate',evidence:improved,
    runtimeVerified:true,independentQaPassed:true,beforeAfterVisualRegressionPass:true,
    runtimeCapture:afterCapture};
  const conditions={sameDevice:true,sameScene:true,sameCharacter:true,sameInput:true,
    samePerformanceLimit:true,requireRuntimeEvidence:true};
  assert.equal(Graphics.evaluateGraphicsExperiment({baseline,candidates:[candidate],conditions}).pass,true);
  for(const badCapture of [
    {...afterCapture,cameraId:'side-camera'},
    {...afterCapture,cameraId:''},
    {...afterCapture,viewportWidth:391},
    {...afterCapture,viewportHeight:0},
    {...afterCapture,viewportWidth:Infinity}
  ]){
    const trial=Graphics.evaluateGraphicsExperiment({
      baseline,candidates:[{...candidate,runtimeCapture:badCapture}],conditions});
    assert.equal(trial.pass,false);
    assert.equal(trial.comparisons[0].runtimeEvidencePass,false);
  }
  assert.equal(Graphics.evaluateGraphicsExperiment({
    baseline:{...baseline,runtimeCapture:{...baseCapture,cameraId:''}},
    candidates:[candidate],conditions
  }).pass,false);
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


test('commercial web HUD uses confirmed read-only state, safe mobile reflow and bounded motion',()=>{
  class FakeNode{
    constructor(tag='div'){
      this.tag=tag;this.style={};this.children=[];this.attributes={};this.parentNode=null;
      this.textContent='';this.clientWidth=393;this.clientHeight=852;
    }
    setAttribute(key,value){this.attributes[key]=String(value);}
    appendChild(node){this.children.push(node);node.parentNode=this;return node;}
    removeChild(node){const at=this.children.indexOf(node);if(at>=0)this.children.splice(at,1);node.parentNode=null;return node;}
    get firstChild(){return this.children[0]||null;}
  }
  const host=new FakeNode(),doc={createElement:tag=>new FakeNode(tag)};
  const ui=Graphics.createWebPresentationController({host,documentRef:doc,reducedMotion:true,
    maxToasts:3,safeInsets:{top:18,right:12,left:12,bottom:24}});
  assert.equal(ui.ready,true);
  assert.equal(ui.updateBossHud({id:'forest-boss',current:90,max:100}),false,'unconfirmed boss data must not be displayed');
  assert.equal(ui.updateBossHud({id:'forest-boss',current:90,max:0,confirmed:true}),false);
  assert.equal(ui.updateBossHud({id:'forest-boss',name:'World Tree Serpent',current:90,max:100,phase:1,confirmed:true}),true);
  assert.equal(ui.stats().bossVisible,true);
  const stage=host.children[0];
  const boss=stage.children.find(n=>n.attributes['data-vibe-boss-hud']==='true');
  assert.ok(boss);
  assert.equal(boss.children[1].children[0].style.width,'90.00%');
  assert.equal(ui.updateBossHud({id:'forest-boss',current:50,max:100,phase:2,confirmed:true}),true);
  assert.equal(boss.attributes['data-vibe-boss-phase'],'2');
  assert.equal(boss.children[1].children[0].style.width,'50.00%');
  assert.equal(stage.children.filter(n=>n.attributes['data-vibe-boss-hud']).length,1);
  assert.equal(ui.updateObjectiveHud({id:'quest',title:'Collect fragments',completed:2,total:4,confirmed:true}),true);
  assert.equal(ui.stats().objectiveVisible,true);
  const quest=stage.children.find(n=>n.attributes['data-vibe-objective-hud']==='true');
  assert.equal(quest.children[2].children[0].style.width,'50.0%');
  assert.equal(ui.updateObjectiveHud({id:'quest',completed:NaN,total:4,confirmed:true}),false);
  const effects=Array.from({length:9},(_,i)=>({id:'buff-'+i,name:'Buff '+i,remaining:9-i,total:10,stacks:i+1}));
  assert.equal(ui.updateStatusTray({effects,confirmed:false}),false);
  assert.equal(ui.updateStatusTray({effects,confirmed:true}),true);
  assert.equal(ui.stats().activeStatusEffects,6,'phone status badges remain bounded');
  assert.equal(ui.updateStatusTray({effects:[{id:'expired',remaining:0,total:10}],confirmed:true}),true);
  assert.equal(ui.stats().activeStatusEffects,0);
  assert.equal(ui.showDirectionWarning({eventId:'hit-0',angle:90}),false,'threat display requires confirmed event');
  for(let i=0;i<4;i++)assert.equal(ui.showDirectionWarning({eventId:'hit-'+i,angle:i*90,confirmed:true}),true);
  assert.equal(ui.showDirectionWarning({eventId:'hit-0',angle:90,confirmed:true}),false,'threat events are deduplicated');
  assert.equal(ui.showDirectionWarning({eventId:'hit-5',angle:90,confirmed:true}),false,'active warning budget is capped');
  assert.equal(ui.stats().activeWarnings,4);
  assert.equal(ui.notify({id:'loot',text:'Craft complete'}),true);
  const toast=stage.children.find(n=>n.textContent==='Craft complete');
  assert.ok(parseInt(toast.style.top,10)>18,'small screens stack notifications after vital HUD');
  assert.equal(ui.updateBossHud({id:'forest-boss',confirmed:true,visible:false}),true);
  assert.equal(ui.stats().bossVisible,false);
  assert.equal(ui.updateObjectiveHud({id:'quest',confirmed:true,visible:false}),true);
  assert.equal(ui.stats().objectiveVisible,false);
  ui.destroy();
  assert.equal(ui.stats().destroyed,true);
  assert.equal(host.children.length,0,'destroy removes the original overlay and registered timers');
  assert.equal(ui.showDirectionWarning({eventId:'after',angle:0,confirmed:true}),false);
});

test('model-free graphics harmonizes real CC0 RGBA without mutating original or alpha',()=>{
  const source={license:'CC0-1.0',sha256:'a'.repeat(64)};
  const original=new Uint8ClampedArray([255,22,10,255,4,12,20,0,12,40,90,240,220,200,170,255]);
  const before=[...original];
  const style={palette:[[20,30,40],[110,130,150],[235,220,205]],pixelGrid:1,detailRetention:0};
  const transformed=Graphics.harmonizeSourceRaster({width:2,height:2,pixels:original,source,style});
  assert.deepEqual([...original],before,'original must remain immutable');
  assert.deepEqual([...transformed.pixels].filter((_,i)=>i%4===3),[255,0,240,255]);
  assert.equal(transformed.pixels[4],0,'transparent color must not leak from source');
  for(let i=0;i<transformed.pixels.length;i+=4)if(transformed.pixels[i+3])
    assert.ok(style.palette.some(rgb=>rgb.every((v,k)=>v===transformed.pixels[i+k])));
  assert.equal(transformed.modelFree,true);
  assert.equal(transformed.runtimeVerified,false);
  assert.equal(transformed.productionVerified,false);
});

test('model-free palette grid enforces shared color blocks while preserving silhouette',()=>{
  const source={license:'CC0',sourceSha256:'b'.repeat(64)};
  const original=new Uint8Array([12,28,40,255,235,230,220,128,45,60,80,0,130,120,110,255]);
  const transformed=Graphics.harmonizeSourceRaster({width:2,height:2,pixels:original,source,
    style:{palette:[[10,20,30],[225,225,220]],pixelGrid:2,detailRetention:0}});
  assert.deepEqual([...transformed.pixels.slice(0,3)],[...transformed.pixels.slice(4,7)]);
  assert.equal(transformed.pixels[11],0);
  assert.equal(transformed.visiblePixels,3);
});

test('high-quality source raster preserves light/shadow details without generating meshes or changing alpha',()=>{
  const source={license:'CC0',sha256:'c'.repeat(64)};
  const pixels=new Uint8Array([
    25,25,25,255,
    215,215,215,255,
    50,50,50,0,
    115,115,115,128
  ]);
  const unchanged=[...pixels];
  const options={width:2,height:2,pixels,source,
    style:{palette:[[85,95,105],[160,175,185]],pixelGrid:2}};
  const modern=Graphics.harmonizeSourceRaster(options);
  const flat=Graphics.harmonizeSourceRaster({...options,
    style:{...options.style,detailRetention:0}});
  assert.ok(modern.pixels[0]<modern.pixels[4],'original texture relief remains visible');
  assert.equal(flat.pixels[0],flat.pixels[4],'legacy flat style is still available');
  assert.deepEqual([...modern.pixels].filter((_,i)=>i%4===3),[255,255,0,128]);
  assert.equal(modern.pixels[8],0,'fully transparent source stays visually empty');
  assert.deepEqual([...pixels],unchanged);
  assert.notEqual(modern.styleKey,flat.styleKey,'different detail levels cannot share an atlas style key');
  assert.equal(modern.materialDetailSource,'ORIGINAL_CC0_PIXEL_LUMINANCE');
  assert.equal(modern.runtimeVerified,false);
  assert.throws(()=>Graphics.composeSourceSpriteAtlas({frames:[modern,flat]}),
    /GRAPHICS_ATLAS_SOURCE_OR_STYLE_MISMATCH/);
  for(const detailRetention of [-0.01,1.01,NaN,Infinity,'0.5'])
    assert.throws(()=>Graphics.harmonizeSourceRaster({...options,
      style:{...options.style,detailRetention}}),/GRAPHICS_DETAIL_RETENTION_INVALID/);
});

test('model-free atlas composes only matching source-derived styles and rejects fake assets',()=>{
  const source={license:'CC0',sha256:'a'.repeat(64)};
  const base={width:1,height:1,source,style:{palette:[[0,0,0],[255,255,255]]}};
  const white=Graphics.harmonizeSourceRaster({...base,pixels:new Uint8Array([250,250,250,255])});
  const black=Graphics.harmonizeSourceRaster({...base,pixels:new Uint8Array([5,5,5,255])});
  const atlas=Graphics.composeSourceSpriteAtlas({frames:[white,black],columns:2,padding:1});
  assert.deepEqual([atlas.width,atlas.height],[6,3]);
  assert.equal(atlas.pixels[(1*6+1)*4+3],255);
  assert.equal(atlas.pixels[(1*6+4)*4+3],255);
  assert.equal(atlas.pixels[3],0,'padding remains transparent');
  assert.deepEqual(atlas.frames.map(frame=>frame.x),[1,4]);
  assert.equal(atlas.runtimeVerified,false);
  assert.throws(()=>Graphics.composeSourceSpriteAtlas({frames:[white,{...black,styleKey:'other'}]}),
    /GRAPHICS_ATLAS_SOURCE_OR_STYLE_MISMATCH/);
  assert.throws(()=>Graphics.composeSourceSpriteAtlas({frames:[{...white,modelFree:false}]}),
    /GRAPHICS_ATLAS_SOURCE_OR_STYLE_MISMATCH/);
});

test('sprite atlas prevents dark GPU edge seams without painting transparent pixels',()=>{
  const source={license:'CC0',sha256:'d'.repeat(64)};
  const pixels=new Uint8Array([240,140,90,255]);
  const frame=Graphics.harmonizeSourceRaster({
    width:1,height:1,pixels,source,style:{palette:[[10,20,30],[225,155,95]]}
  });
  const bleed=Graphics.composeSourceSpriteAtlas({frames:[frame],columns:1,padding:2});
  const raw=Graphics.composeSourceSpriteAtlas({frames:[frame],columns:1,padding:2,edgeBleed:false});
  const padIndex=(2*bleed.width+1)*4,centerIndex=(2*bleed.width+2)*4;
  assert.equal(bleed.pixels[padIndex],bleed.pixels[centerIndex]);
  assert.equal(bleed.pixels[padIndex+1],bleed.pixels[centerIndex+1]);
  assert.equal(bleed.pixels[padIndex+2],bleed.pixels[centerIndex+2]);
  assert.equal(bleed.pixels[padIndex+3],0,'bleeding RGB cannot create new visible geometry');
  assert.equal(raw.pixels[padIndex],0,'legacy transparent black padding remains selectable');
  assert.equal(raw.pixels[padIndex+3],0);
  assert.equal(bleed.transparentPaddingRgbBleed,true);
  assert.deepEqual([...pixels],[240,140,90,255],'original texture never changes');
  assert.throws(()=>Graphics.composeSourceSpriteAtlas({frames:[frame],edgeBleed:'yes'}),
    /GRAPHICS_ATLAS_LAYOUT_INVALID/);
});

test('sprite atlas inherits real edge color across transparent source margins without changing alpha',()=>{
  const source={license:'CC0',sha256:'e'.repeat(64)},pixels=new Uint8Array(3*3*4);
  pixels.set([160,90,40,255],16);
  const original=[...pixels];
  const frame=Graphics.harmonizeSourceRaster({width:3,height:3,pixels,source,
    style:{palette:[[10,20,30],[160,90,40]],detailRetention:0}});
  const atlas=Graphics.composeSourceSpriteAtlas({frames:[frame],padding:2});
  const pad=(3*atlas.width+1)*4,center=(3*atlas.width+3)*4;
  assert.deepEqual([...atlas.pixels.slice(pad,pad+3)],[...atlas.pixels.slice(center,center+3)]);
  assert.equal(atlas.pixels[pad+3],0);
  assert.deepEqual([...pixels],original);
  assert.equal(atlas.runtimeVerified,false);
});

test('model-free graphics fails closed on licenses, invalid source pixels and unverifiable source hash',()=>{
  const valid={width:1,height:1,pixels:new Uint8Array([10,20,30,255]),
    style:{palette:[[0,0,0],[255,255,255]]}};
  for(const license of ['CC-BY','NC','UNKNOWN','project-original'])
    assert.throws(()=>Graphics.harmonizeSourceRaster({...valid,
      source:{license,sha256:'a'.repeat(64)}}),/GRAPHICS_VERIFIED_CC0_SOURCE_REQUIRED/);
  assert.throws(()=>Graphics.harmonizeSourceRaster({...valid,source:{license:'CC0',sha256:'bad'}}),
    /GRAPHICS_VERIFIED_CC0_SOURCE_REQUIRED/);
  assert.throws(()=>Graphics.harmonizeSourceRaster({...valid,width:2,source:{license:'CC0',sha256:'a'.repeat(64)}}),
    /GRAPHICS_SOURCE_RGBA_INVALID/);
  assert.throws(()=>Graphics.harmonizeSourceRaster({...valid,pixels:new Uint8Array([0,0,0,0]),
    source:{license:'CC0',sha256:'a'.repeat(64)}}),/GRAPHICS_SOURCE_FULLY_TRANSPARENT/);
});


// [바이브 5.9 전문 그래픽] 실제 화면 증거에 묶인 결함만 기존 그래픽 책임 파일로 배정한다.
test('professional graphic defects route exact screenshot-bound source and reject forged findings',()=>{
  const rev='graphic-rev-1',hash='a'.repeat(64),sourceHash='b'.repeat(64);
  const finding={id:'uv-shading',sourcePath:'assets/vibe-visual-autopilot.js',
    imageSha256:hash,sourceHash,candidateRevision:rev,observed:true,reviewed:true,
    severity:'BLOCKER',observation:'real UV seam visible',targetId:'hero',property:'material',
    region:{x:.1,y:.2,width:.4,height:.3}};
  const files=['assets/vibe-visual-autopilot.js','web-games/demo/ui/hud.css'];
  const planned=Graphics.planGraphicsImplementation({files,observedFindings:[finding],candidateRevision:rev});
  assert.equal(planned.run,true);
  assert.equal(planned.scope[0],finding.sourcePath);
  assert.equal(planned.tasks[0].findings[0].id,finding.id);
  assert.equal(planned.tasks[0].recaptureRequired,true);
  assert.equal(planned.visualRuntimePass,false);
  assert.equal(planned.productionVerified,false);
  for(const broken of [
    {...finding,candidateRevision:'stale'}, {...finding,sourcePath:'../save.js'},
    {...finding,sourcePath:'GameCore.cs'}, {...finding,imageSha256:'fake'},
    {...finding,region:{x:.8,y:.5,width:.4,height:.6}},
    {...finding,observed:false},{...finding,reviewed:false}
  ]){
    const result=Graphics.planGraphicsImplementation({files,observedFindings:[broken],candidateRevision:rev});
    assert.equal(result.run,false);
    assert.equal(result.acceptedFindings.length,0);
    assert.equal(result.rejectedFindings.length,1);
  }
  assert.ok(Graphics.inferVisualAnomalies('재질 플라스틱 광택 과도').includes('PBR_SURFACE_MISMATCH'));
  assert.ok(Graphics.inferVisualAnomalies('카메라 시야 차단').includes('CAMERA_SUBJECT_OCCLUDED'));
});

test('professional visual budget responds to measured GPU resources without hiding gameplay',()=>{
  const frames=Array(60).fill(16),hash='a'.repeat(64);
  const base=Graphics.deviceVisualBudget('HIGH',{runtimeVerified:true,targetFps:60,observedFps:60,
    samples:frames.length,frameTimesMs:frames});
  const pressured=Graphics.deviceVisualBudget('HIGH',{runtimeVerified:true,targetFps:60,
    observedFps:60,samples:frames.length,frameTimesMs:frames,
    resources:{observed:true,source:'native-runtime-telemetry',captureHash:hash,deviceId:'phone',
      memoryPeakMb:1024,drawCalls:600,visibleTriangles:600000}});
  assert.equal(pressured.resourceObserved,true);
  assert.equal(pressured.adaptive,true);
  assert.ok(pressured.postFx<base.postFx);
  assert.ok(pressured.distantEffects<base.distantEffects);
  assert.equal(pressured.coreSilhouette,1);
  assert.equal(pressured.attackReadability,1);
  assert.equal(pressured.uiHud,1);
  assert.equal(pressured.playerFeedback,1);
  assert.equal(pressured.actualRendererMutationPerformed,false);
  const forged=Graphics.deviceVisualBudget('HIGH',{runtimeVerified:true,targetFps:60,
    observedFps:60,samples:frames.length,frameTimesMs:frames,
    resources:{observed:true,source:'native-runtime-telemetry',captureHash:'bad',deviceId:'phone',
      memoryPeakMb:10000,drawCalls:10000,visibleTriangles:10000000}});
  assert.equal(forged.resourceObserved,false);
  assert.equal(forged.postFx,base.postFx);
});
