import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const homepage=fs.readFileSync('assets/homepage-enhancements.js','utf8');
const worker=fs.readFileSync('_worker.js','utf8');
const touch=fs.readFileSync('web-games/_shared/touch-controls.js','utf8');

test('homepage launches games by tap or click without keyboard launch wiring',()=>{
  assert.match(homepage,/data\.touchLaunch='true'/);
  assert.match(homepage,/window\.location\.href=target/);
  assert.doesNotMatch(homepage,/addEventListener\('keydown'/);
  assert.doesNotMatch(homepage,/tabindex="0"/);
});

test('all Web HTML routes receive universal touch controls',()=>{
  assert.match(worker,/url\.pathname\.startsWith\('\/web-games\/'\)/);
  assert.match(worker,/\/web-games\/_shared\/touch-controls\.js/);
  assert.match(worker,/injectUniversalTouchControls/);
});

test('universal touch controls expose joystick and actions while respecting native sticks',()=>{
  assert.match(touch,/#joy/);
  assert.match(touch,/#joystick/);
  assert.match(touch,/hasNativeTouchStick/);
  assert.match(touch,/jaewoon:joystick/);
  assert.match(touch,/jg-action-a/);
  assert.match(touch,/jg-action-b/);
  assert.match(touch,/pointerdown/);
  assert.match(touch,/pointermove/);
});
