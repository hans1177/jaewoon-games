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
  const style={palette:[[20,30,40],[110,130,150],[235,220,205]],pixelGrid:1};
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
    style:{palette:[[10,20,30],[225,225,220]],pixelGrid:2}});
  assert.deepEqual([...transformed.pixels.slice(0,3)],[...transformed.pixels.slice(4,7)]);
  assert.equal(transformed.pixels[11],0);
  assert.equal(transformed.visiblePixels,3);
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
