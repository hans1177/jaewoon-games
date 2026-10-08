// 파일명: qa/jaewoon-motion-engine.test.cjs
// 역할: 공통 렌더 모션의 시간·접촉·게임 상태 분리를 검증한다.
const test = require('node:test');
const assert = require('node:assert/strict');
const { JaewoonMotionRig, JaewoonCameraMotion } = require('../assets/jaewoon-motion-engine.js');

test('base pose converges without mutating external state', () => {
  const gameplay = { x: 100, y: 40 };
  const rig = new JaewoonMotionRig({ x: 0, y: 0 });
  rig.setBasePose(gameplay);
  for (let i = 0; i < 120; i++) rig.update(1 / 60);
  const pose = rig.sample();
  assert.ok(Math.abs(pose.x - 100) < 0.1);
  assert.ok(Math.abs(pose.y - 40) < 0.1);
  assert.deepEqual(gameplay, { x: 100, y: 40 });
});

test('attack and hit add visual motion then recover', () => {
  const rig = new JaewoonMotionRig({ x: 10, y: 10 });
  rig.setBasePose({ x: 10, y: 10 }, { snap: true });
  rig.triggerAttack({ strength: 1 });
  rig.update(0.1);
  const active = rig.sample();
  assert.notEqual(active.x, 10);
  for (let i = 0; i < 60; i++) rig.update(1 / 60);
  const recovered = rig.sample();
  assert.ok(Math.abs(recovered.x - 10) < 0.2);
});

test('reduced motion lowers procedural amplitude', () => {
  const full = new JaewoonMotionRig({ x: 0, y: 0 });
  const reduced = new JaewoonMotionRig({ x: 0, y: 0, reducedMotion: true });
  full.setMotionState({ moving: true, speed: 220 });
  reduced.setMotionState({ moving: true, speed: 220 });
  full.update(0.07);
  reduced.update(0.07);
  assert.ok(Math.abs(reduced.sample().y) < Math.abs(full.sample().y));
});

test('camera impulse returns toward zero', () => {
  const camera = new JaewoonCameraMotion();
  camera.impulse({ x: 120, y: -60, rotation: 1 });
  const first = camera.update(1 / 60);
  assert.ok(Math.abs(first.x) > 0);
  let last = first;
  for (let i = 0; i < 180; i++) last = camera.update(1 / 60);
  assert.ok(Math.abs(last.x) < 0.05);
  assert.ok(Math.abs(last.y) < 0.05);
});


test('contact hit-stop pauses presentation action without changing the base gameplay pose', () => {
  const gameplay = { x: 20, y: 30 };
  const rig = new JaewoonMotionRig({ x: 20, y: 30 });
  rig.setBasePose(gameplay, { snap: true });
  rig.triggerAttack({ strength: 1.4, duration: 0.4, weightClass: 'HEAVY', contactAt: 0.58 });
  rig.update(0.1);
  const before = rig.attack.time;
  rig.triggerContact({ strength: 1.5, hitStopMs: 70 });
  rig.update(1 / 60);
  assert.equal(rig.attack.time, before);
  assert.equal(rig.sample().hitStopActive, true);
  assert.ok(rig.sample().contactPulse > 0);
  assert.deepEqual(gameplay, { x: 20, y: 30 });
});

test('motion LOD removes expensive afterimages while keeping critical state sampling', () => {
  const rig = new JaewoonMotionRig({ x: 0, y: 0 });
  rig.setMotionState({ moving: true, speed: 220, turn: 0.5 });
  rig.setLod({ tier: 'FAR' });
  for (let i = 0; i < 8; i++) rig.update(1 / 60);
  const sample = rig.sample();
  assert.equal(sample.lodTier, 'FAR');
  assert.ok(sample.locomotionBlend > 0);
  assert.deepEqual(rig.afterimages(), []);
});

test('directional hit reaction keeps body-region presentation data local to the rig', () => {
  const rig = new JaewoonMotionRig({ x: 0, y: 0 });
  rig.triggerHit({ direction: 1, strength: 1.5, bodyRegion: 'HEAD' });
  rig.update(1 / 60);
  const sample = rig.sample();
  assert.equal(sample.hitBodyRegion, 'HEAD');
  assert.notEqual(sample.rotation, 0);
});


test('hit-stop expiry consumes only its remaining duration across frame partitions',()=>{
  const whole=new JaewoonMotionRig(),split=new JaewoonMotionRig();
  for(const rig of [whole,split]){rig.triggerAttack({duration:.4});rig.triggerContact({hitStopMs:35});}
  whole.update(.08);for(let i=0;i<8;i++)split.update(.01);
  assert.ok(Math.abs(whole.attack.time-split.attack.time)<1e-9);
  assert.ok(Math.abs(whole.time-split.time)<1e-9);
  assert.ok(whole.time>0);
});

test('afterimage lifetime is elapsed-time based and dormant frames cannot grow history',()=>{
  const rig=new JaewoonMotionRig({afterimageSamples:500,afterimageDuration:.05});
  rig.update(.01);rig.update(.01);const before=rig.history.length;
  rig.update(0);rig.update(NaN);assert.equal(rig.history.length,before);
  assert.equal(rig.maxHistory,64);
  rig.update(.06);assert.equal(rig.afterimages().length,0);
  rig.setLod({tier:'OFFSCREEN'});rig.update(.01);assert.equal(rig.history.length,0);
  assert.ok(Number.isFinite(rig.sample().x));
});

test('late-session speed changes keep adjacent rendered poses continuous', () => {
  const rig = new JaewoonMotionRig();
  rig.setMotionState({ moving: true, speed: 220 });
  for (let i = 0; i < 6000; i++) rig.update(.1);
  const before = rig.sample();
  rig.setMotionState({ moving: true, speed: 221 });
  const after = rig.update(1 / 600);
  assert.ok(Math.abs(after.y - before.y) < .2, `walking pose jumped ${after.y - before.y}`);
  assert.ok(Math.abs(after.rotation - before.rotation) < .003);
});

test('walking remains close across mobile and high refresh frame rates', () => {
  const poses = [30, 60, 120].map(hz => {
    const rig = new JaewoonMotionRig();
    rig.setMotionState({ moving: true, speed: 220 });
    for (let i = 0; i < hz * 3; i++) rig.update(1 / hz);
    return rig.sample();
  });
  for (const pose of poses.slice(1)) {
    assert.ok(Math.abs(pose.y - poses[0].y) < .02);
    assert.ok(Math.abs(pose.rotation - poses[0].rotation) < .0003);
  }
});

test('early contact markers reach the strike pose continuously', () => {
  for (const contactAt of [.2, .25, .3, .52, .82]) {
    const rig = new JaewoonMotionRig({ x: 20 });
    rig.triggerAttack({ duration: 1, contactAt });
    let remaining = contactAt - .00001;
    while (remaining > 0) {
      const delta = Math.min(.05, remaining);
      rig.update(delta);
      remaining -= delta;
    }
    const before = rig.sample();
    const at = rig.update(.00001);
    const after = rig.update(.00001);
    assert.ok(Math.abs(at.x - 36) < 1e-6, `contact ${contactAt}: ${at.x}`);
    assert.ok(Math.abs(before.x - at.x) < .001);
    assert.ok(Math.abs(after.x - at.x) < .001);
    assert.equal(rig.channels.x.value, 20);
  }
});

test('contact pause freezes walking while the rendered base follows gameplay', () => {
  const gameplay = { x: 0, y: 0 };
  const rig = new JaewoonMotionRig();
  rig.setMotionState({ moving: true, speed: 80 });
  for (let i = 0; i < 20; i++) rig.update(.05);
  rig.triggerContact({ hitStopMs: 100 });
  const before = rig.sample();
  gameplay.x = 40;
  rig.setBasePose(gameplay);
  rig.setMotionState({ moving: true, speed: 220 });
  const paused = rig.update(.02);
  assert.ok(paused.x > before.x);
  assert.equal(paused.y, before.y);
  assert.equal(paused.rotation, before.rotation);
  assert.deepEqual(gameplay, { x: 40, y: 0 });
});

// 메인: 물리/게임 스폰 좌표와 렌더 보간·잔상의 분리 회귀
test('teleport snap discards old-position afterimages and refreshes zero-delta render sample', () => {
  const gameplay = { x: 800, y: 340 };
  const rig = new JaewoonMotionRig({ x: 10, y: 15, afterimageDuration: .4 });
  for (let i = 0; i < 6; i++) rig.update(1 / 60);
  assert.ok(rig.afterimages().length > 0);
  rig.setBasePose(gameplay, { snap: true });
  assert.deepEqual(rig.afterimages(), []);
  assert.equal(rig.update(0).x, gameplay.x);
  assert.equal(rig.channels.y.value, gameplay.y);
  rig.update(1 / 60);
  rig.update(1 / 60);
  assert.ok(rig.afterimages().every(frame => frame.x === gameplay.x));
  assert.deepEqual(gameplay, { x: 800, y: 340 });
});

test('offscreen LOD immediately evicts historical render poses and regular movement still interpolates', () => {
  const rig = new JaewoonMotionRig();
  rig.setBasePose({ x: 40 });
  const frame = rig.update(1 / 60);
  assert.ok(frame.x > 0 && frame.x < 40);
  rig.update(1 / 60);
  assert.ok(rig.history.length > 0);
  rig.setLod({ tier: 'OFFSCREEN' });
  assert.deepEqual(rig.history, []);
  rig.setLod({ tier: 'NEAR' });
  assert.deepEqual(rig.afterimages(), []);
});
