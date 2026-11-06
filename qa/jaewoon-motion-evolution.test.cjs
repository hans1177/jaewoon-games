const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../assets/jaewoon-motion-engine.js');
const evo = require('../assets/jaewoon-motion-evolution.js');

test('runtime consumes bounded profile without mutating input', () => {
  const profile={moveBobAmplitude:0.4,attackStrike:1.5,afterimageIntensity:0.2};
  const frozen=JSON.parse(JSON.stringify(profile));
  const base=new engine.JaewoonMotionRig({x:0,y:0});
  const tuned=new engine.JaewoonMotionRig({x:0,y:0,profile});
  base.setMotionState({moving:true,speed:220}); tuned.setMotionState({moving:true,speed:220});
  base.update(0.07); tuned.update(0.07);
  assert.ok(Math.abs(tuned.sample().y) < Math.abs(base.sample().y));
  assert.deepEqual(profile,frozen);
  assert.equal(engine.version,2);
});

test('unknown or gameplay authority keys are rejected',()=>{
  assert.equal(evo.validateMotionProfile({attackStrike:1.1}).pass,true);
  const bad=evo.validateMotionProfile({damage:999,attackStrike:1.1});
  assert.equal(bad.pass,false);
  assert.ok(bad.unknown.includes('damage'));
  assert.ok(bad.forbidden.includes('damage'));
});

test('low impact produces stronger B/C hit-feel candidates within bounds',()=>{
  const {A,B,C}=evo.createCandidateProfiles({}, {metrics:{impact:6,readability:10,controlAlignment:15,mobilePerformance:10}});
  assert.equal(A.attackStrike,1);
  assert.ok(B.attackStrike>A.attackStrike);
  assert.ok(C.attackStrike>=B.attackStrike);
  for(const p of [A,B,C]) for(const v of Object.values(p)) assert.ok(v>=0&&v<=2);
});

test('readability/performance weakness reduces decorative motion',()=>{
  const {B,C}=evo.createCandidateProfiles({}, {metrics:{impact:15,readability:4,controlAlignment:15,mobilePerformance:4}});
  assert.ok(B.afterimageIntensity<1);
  assert.ok(C.afterimageIntensity<B.afterimageIntensity);
});

test('A/B/C requires identical experiment conditions and actual score gain',()=>{
  const baseline={smoothness:12,controlAlignment:13,impact:10,readability:8,characterIdentity:8,weightInertia:7,bossSignature:7,mobilePerformance:9,regressionSafety:5};
  const candidate={...baseline,impact:14,weightInertia:8};
  const pass=evo.evaluateMotionExperiment({baselineMetrics:baseline,candidateMetrics:candidate,conditions:{sameDevice:true,sameScene:true,sameActor:true,sameInput:true,sameFrameLimit:true}});
  assert.equal(pass.pass,true);
  assert.ok(pass.delta>=3);
  const fail=evo.evaluateMotionExperiment({baselineMetrics:baseline,candidateMetrics:candidate,conditions:{sameDevice:false,sameScene:true,sameActor:true,sameInput:true,sameFrameLimit:true}});
  assert.equal(fail.pass,false);
});

test('control/readability/performance regression blocks promotion',()=>{
  const baseline={smoothness:12,controlAlignment:13,impact:10,readability:8,characterIdentity:8,weightInertia:7,bossSignature:7,mobilePerformance:9,regressionSafety:5};
  const candidate={...baseline,impact:15,readability:7};
  const out=evo.evaluateMotionExperiment({baselineMetrics:baseline,candidateMetrics:candidate,conditions:{sameDevice:true,sameScene:true,sameActor:true,sameInput:true,sameFrameLimit:true}});
  assert.equal(out.pass,false);
  assert.ok(out.blockers.includes('READABILITY_REGRESSION'));
});

test('one game can never become company standard',()=>{
  const metrics={smoothness:12,controlAlignment:13,impact:10,readability:8,characterIdentity:8,weightInertia:7,bossSignature:7,mobilePerformance:9,regressionSafety:5};
  const better={...metrics,impact:14,weightInertia:8};
  const record=evo.gameVerificationRecord({gameId:'P0001',genre:'survival',deviceClass:'LOW',experiment:{baselineMetrics:metrics,candidateMetrics:better,conditions:{sameDevice:true,sameScene:true,sameActor:true,sameInput:true,sameFrameLimit:true}}});
  const result=evo.evaluateCompanyPromotion([record]);
  assert.equal(result.eligible,false);
  assert.equal(result.selfPromote,false);
});

test('3 heterogeneous verified games only reach multi-game verified and still require JAY',()=>{
  const base={smoothness:12,controlAlignment:13,impact:10,readability:8,characterIdentity:8,weightInertia:7,bossSignature:7,mobilePerformance:9,regressionSafety:5};
  const better={...base,impact:14,weightInertia:8};
  const rows=[['P0001','survival','LOW'],['P0003','defense','MID'],['P0006','rpg','HIGH']].map(([gameId,genre,deviceClass])=>evo.gameVerificationRecord({gameId,genre,deviceClass,experiment:{baselineMetrics:base,candidateMetrics:better,conditions:{sameDevice:true,sameScene:true,sameActor:true,sameInput:true,sameFrameLimit:true}}}));
  const result=evo.evaluateCompanyPromotion(rows);
  assert.equal(result.eligible,true);
  assert.equal(result.state,'MULTI_GAME_VERIFIED');
  assert.equal(result.jayDecisionRequiredForCompanyStandard,true);
  assert.equal(result.selfPromote,false);
});

test('LOW device preserves core motion but cuts decoration',()=>{
  const low=evo.deviceAdaptiveProfile({attackStrike:1.2,afterimageIntensity:1,secondaryMotion:1},'LOW');
  assert.equal(low.attackStrike,1.2);
  assert.ok(low.afterimageIntensity<1);
  assert.ok(low.secondaryMotion<1);
});

test('motion anomaly detector catches teleport-like visual deltas',()=>{
  const anomalies=evo.detectMotionAnomalies([{x:0,y:0,rotation:0,scaleX:1,scaleY:1},{x:400,y:0,rotation:0,scaleX:1,scaleY:1}]);
  assert.ok(anomalies.some(x=>x.type==='TELEPORT_LIKE_DELTA'));
});
