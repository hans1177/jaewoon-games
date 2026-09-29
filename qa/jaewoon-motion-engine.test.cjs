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
